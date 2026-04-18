import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import FormFlow from './components/FormFlow';
import GeneratedSite from './components/GeneratedSite';
import LoadingScreen from './components/LoadingScreen';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ViewSite from './components/ViewSite';
import ViewBySlug from './components/ViewBySlug';
import DataTreePage from './components/DataTreePage';
import Settings from './components/Settings';
import GenerationModePicker from './components/GenerationModePicker';
import { generateWebsiteContent, refineWebsiteContent } from './services/gemini';
import { UserData, SiteContent, SiteGenerationMode, SiteProjectFile, defaultProfileTree } from './types';
import { supabase } from './supabaseClient';
import { loadProfileTree } from './services/profileTreeStore';
import { normalizeTier, SubscriptionTier } from './lib/plan';
import { useParams } from 'react-router-dom';

type StoredSiteContent = SiteContent & {
  id?: string;
  slug?: string | null;
  published_at?: string | null;
};

type SiteRow = {
  id: string;
  html: string;
  slug: string | null;
  published_at: string | null;
  generation_mode?: SiteGenerationMode | null;
  framework?: string | null;
  project_files?: SiteProjectFile[] | null;
};

function mapSiteRow(row: SiteRow): StoredSiteContent {
  return {
    id: row.id,
    html: row.html,
    slug: row.slug,
    published_at: row.published_at,
    generationMode: row.generation_mode === 'nextjs' ? 'nextjs' : 'html',
    framework: row.framework || null,
    projectFiles: row.project_files || null,
  };
}

function EditSiteFlow() {
  const { id } = useParams<{ id: string }>();
  const [siteContent, setSiteContent] = useState<StoredSiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPage = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('id, html, slug, published_at, generation_mode, framework, project_files')
          .eq('id', id)
          .single();

        if (error) throw error;
        setSiteContent(mapSiteRow(data as SiteRow));
      } catch (err: any) {
        console.error("Failed to fetch site for editing:", err);
        setError("Could not load the site for editing.");
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [id]);

  const handleRefine = async (prompt: string) => {
    if (!siteContent || !siteContent.id) return;
    setIsRefining(true);
    setError(null);
    try {
      // Check and increment usage limits securely
      const { data: canGenerate, error: rpcError } = await supabase.rpc('increment_usage');
      if (rpcError) {
        throw new Error("Failed to verify AI usage limits.");
      }
      if (!canGenerate) {
        throw new Error("You have reached your AI operation limit for this plan. Go to Settings → Billing to upgrade.");
      }

      const updatedContent = await refineWebsiteContent(siteContent, prompt);
      
      // Update in DB
      await supabase
        .from('pages')
        .update({
          html: updatedContent.html,
          generation_mode: updatedContent.generationMode,
          framework: updatedContent.framework,
          project_files: updatedContent.projectFiles ?? null,
        })
        .eq('id', siteContent.id);

      setSiteContent(prev => prev ? { ...prev, ...updatedContent } : null);
    } catch (err: any) {
      console.error("Failed to refine site:", err);
      setError(err.message || "Failed to refine your website. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleReset = () => {
    navigate('/dashboard');
  };

  if (loading) return <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">Loading editor...</div>;

  if (error && !siteContent) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (siteContent) {
    return (
      <GeneratedSite 
        content={siteContent} 
        onReset={handleReset} 
        onRefine={handleRefine}
        isRefining={isRefining}
        error={error}
      />
    );
  }

  return null;
}

function GenerateDirectlyFlow() {
  const [siteContent, setSiteContent] = useState<StoredSiteContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<SiteGenerationMode>('html');
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);
  const [hasConfirmedMode, setHasConfirmedMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTier = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        const tier = normalizeTier(data?.tier);
        setCurrentTier(tier);
        setSelectedMode('html');
      } catch (err) {
        console.error("Failed to load plan details:", err);
        setCurrentTier('free');
        setSelectedMode('html');
      } finally {
        setIsCheckingPlan(false);
        setIsGenerating(false);
      }
    };

    fetchTier();
  }, []);

  useEffect(() => {
    if (!hasConfirmedMode) return;

    const generate = async () => {
      setIsGenerating(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        // 1. Check site limits securely
        const { data: canCreateSite, error: siteLimitError } = await supabase.rpc('can_create_site');
        if (siteLimitError) {
          console.error("RPC Error:", siteLimitError);
          throw new Error("Failed to verify site limits. Please try again later.");
        }
        
        if (!canCreateSite) {
          const limitTxt = currentTier === 'free' ? '1 site at a time' : currentTier === 'pro' ? '5 sites at a time' : 'site limit';
          const planName = currentTier === 'free' ? 'Free' : currentTier === 'pro' ? 'Pro' : 'Studio';
          const upgradeTxt = currentTier === 'free' ? 'upgrade to Pro' : currentTier === 'pro' ? 'upgrade to Studio' : 'upgrade';
          const actionTxt = currentTier === 'studio' ? 'delete an existing site' : `delete an existing site or ${upgradeTxt}`;
          throw new Error(`You have reached your ${planName} plan's capacity (${limitTxt}). Please ${actionTxt} to continue.`);
        }

        // 2. Check and increment AI usage limits securely
        const { data: canGenerate, error: rpcError } = await supabase.rpc('increment_usage');
        if (rpcError) {
          console.error("RPC Error:", rpcError);
          throw new Error("Failed to verify AI usage limits. Please try again later.");
        }
        
        if (!canGenerate) {
          throw new Error("You have reached your AI operation limit for this plan. Go to Settings → Billing to upgrade.");
        }

        const profileTree = await loadProfileTree(user.id);
        if (!profileTree) throw new Error("No data tree found to generate from.");

        const basicData: UserData = {
          name: profileTree.identity?.name || "User",
          role: profileTree.identity?.role || "Professional",
          location: profileTree.identity?.location || "",
          bio: profileTree.identity?.bio || "",
          hobbies: profileTree.personal?.interests || "",
          experience: "",
          projects: "",
          skills: "",
          goals: "",
          socials: "",
          vibe: "editorial, modern, and premium",
          availability: profileTree.identity?.availability || "",
          // Pass through any photos saved in the profile tree
          photos: profileTree.photos && profileTree.photos.length > 0 ? profileTree.photos : undefined,
        };

        const content = await generateWebsiteContent(
          basicData,
          profileTree,
          currentTier === 'free' ? 'html' : selectedMode,
        );

        // Save to database
        const { data: savedPage, error: dbError } = await supabase
          .from('pages')
          .insert({
            user_id: user.id,
            html: content.html,
            generation_mode: content.generationMode,
            framework: content.framework,
            project_files: content.projectFiles ?? null,
            title: `${basicData.name}'s Site`,
            vibe: basicData.vibe
          })
          .select()
          .single();
          
        if (dbError) throw dbError;

        setSiteContent(mapSiteRow(savedPage as SiteRow));
      } catch (err: any) {
        console.error("Failed to generate site directly:", err);
        setError(err.message || "Failed to generate your website. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    };
    
    generate();
  }, [currentTier, hasConfirmedMode, selectedMode]);

  const handleReset = () => {
    navigate('/dashboard');
  };

  const handleRefine = async (prompt: string) => {
    if (!siteContent || !siteContent.id) return;
    setIsRefining(true);
    setError(null);
    try {
      // Check and increment usage limits securely
      const { data: canGenerate, error: rpcError } = await supabase.rpc('increment_usage');
      if (rpcError) {
        throw new Error("Failed to verify AI usage limits.");
      }
      if (!canGenerate) {
        throw new Error("You have reached your AI operation limit for this plan. Go to Settings → Billing to upgrade.");
      }
      const updatedContent = await refineWebsiteContent(siteContent, prompt);
      
      // Update in DB
      await supabase.from('pages').update({
        html: updatedContent.html,
        generation_mode: updatedContent.generationMode,
        framework: updatedContent.framework,
        project_files: updatedContent.projectFiles ?? null,
      }).eq('id', siteContent.id);
      setSiteContent(prev => prev ? { ...prev, ...updatedContent } : null);
    } catch (err: any) {
      setError(err.message || "Failed to refine.");
    } finally {
      setIsRefining(false);
    }
  };

  if (isCheckingPlan || isGenerating) return <LoadingScreen />;

  if (!hasConfirmedMode) {
    return (
      <GenerationModePicker
        currentTier={currentTier}
        selectedMode={currentTier === 'free' ? 'html' : selectedMode}
        onSelect={setSelectedMode}
        onContinue={() => {
          setError(null);
          setHasConfirmedMode(true);
        }}
      />
    );
  }
  
  if (siteContent) {
    return (
      <GeneratedSite 
        content={siteContent} 
        onReset={handleReset} 
        onRefine={handleRefine}
        isRefining={isRefining}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6">
      <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl shadow-lg border border-red-100 font-medium text-center">
        <p className="mb-4">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-50 border border-gray-200">Return to Dashboard</button>
      </div>
    </div>
  );
}

function CreateSiteFlow() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGenerate = async (data: UserData) => {
    setIsGenerating(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Load existing tree or start fresh
      let profileTree = await loadProfileTree(user.id);
      if (!profileTree) {
        profileTree = { ...defaultProfileTree };
      }

      // Update tree with onboarding data
      profileTree.identity.name = data.name || profileTree.identity.name;
      profileTree.identity.role = data.role || profileTree.identity.role;
      profileTree.identity.location = data.location || profileTree.identity.location;
      profileTree.identity.bio = data.bio || profileTree.identity.bio;
      profileTree.identity.availability = data.availability || profileTree.identity.availability;
      
      if (data.hobbies && !profileTree.personal.interests) {
        profileTree.personal.interests = data.hobbies;
      }
      
      // Basic string parsing for simple onboarding text fields
      if (data.skills && profileTree.skills.length === 0) {
        const skillList = data.skills.split(',').map(s => s.trim()).filter(Boolean);
        profileTree.skills = skillList.map(s => ({
          id: Math.random().toString(36).slice(2, 10),
          name: s,
          level: 'Intermediate',
          category: 'Other'
        }));
      }

      // Save photos from onboarding into the profile tree
      if (data.photos && data.photos.length > 0) {
        profileTree.photos = data.photos;
      }

      // Save the updated tree
      const { error: saveError } = await supabase
        .from('user_profiles')
        .upsert(
          { user_id: user.id, tree: profileTree, updated_at: new Date().toISOString() }, 
          { onConflict: 'user_id' }
        );
        
      if (saveError) throw saveError;

      // Navigate to the Data Tree page instead of immediately generating
      navigate('/data-tree');
    } catch (err: any) {
      console.error("Failed to save onboarding data:", err);
      setError(err.message || "Failed to save your details. Please try again.");
      setIsGenerating(false);
    }
  };

  return (
    <>
      <FormFlow onSubmit={handleGenerate} isGenerating={isGenerating} />
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 text-red-600 px-6 py-3 rounded-xl shadow-lg border border-red-100 font-medium text-sm z-50">
          {error}
        </div>
      )}
    </>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/dashboard" /> : <LandingPage onStart={() => navigate('/auth')} />} />
      <Route path="/auth" element={session ? <Navigate to="/dashboard" /> : <Auth onAuthSuccess={() => {}} />} />
      <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/auth" />} />
      <Route path="/create" element={session ? <CreateSiteFlow /> : <Navigate to="/auth" />} />
      <Route path="/generate" element={session ? <GenerateDirectlyFlow /> : <Navigate to="/auth" />} />
      <Route path="/data-tree" element={session ? <DataTreePage /> : <Navigate to="/auth" />} />
      <Route path="/edit/:id" element={session ? <EditSiteFlow /> : <Navigate to="/auth" />} />
      <Route path="/settings" element={session ? <Settings /> : <Navigate to="/auth" />} />
      <Route path="/view/:id" element={session ? <ViewSite /> : <Navigate to="/auth" />} />
      <Route path="/s/:slug" element={<ViewBySlug />} />
    </Routes>
  );
}
