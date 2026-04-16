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
import { generateWebsiteContent, refineWebsiteContent } from './services/gemini';
import { UserData, SiteContent, ProfileTree } from './types';
import { supabase } from './supabaseClient';
import { loadProfileTree } from './services/profileTreeStore';
import { useParams } from 'react-router-dom';

function EditSiteFlow() {
  const { id } = useParams<{ id: string }>();
  const [siteContent, setSiteContent] = useState<SiteContent & { id?: string; slug?: string | null; published_at?: string | null } | null>(null);
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
          .select('id, html, slug, published_at')
          .eq('id', id)
          .single();

        if (error) throw error;
        setSiteContent(data);
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

      const updatedContent = await refineWebsiteContent(siteContent.html, prompt);
      
      // Update in DB
      await supabase
        .from('pages')
        .update({ html: updatedContent.html })
        .eq('id', siteContent.id);

      setSiteContent(prev => prev ? { ...prev, html: updatedContent.html } : null);
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
  const [siteContent, setSiteContent] = useState<SiteContent & { id?: string; slug?: string | null; published_at?: string | null } | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const generate = async () => {
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
          throw new Error("You have reached your free site limit (1 site at a time). Please delete an existing site or upgrade to Pro to continue.");
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

        const content = await generateWebsiteContent(basicData, profileTree);

        // Save to database
        const { data: savedPage, error: dbError } = await supabase
          .from('pages')
          .insert({
            user_id: user.id,
            html: content.html,
            title: `${basicData.name}'s Site`,
            vibe: basicData.vibe
          })
          .select()
          .single();
          
        if (dbError) throw dbError;

        setSiteContent({ html: content.html, id: savedPage.id, slug: savedPage.slug, published_at: savedPage.published_at });
      } catch (err: any) {
        console.error("Failed to generate site directly:", err);
        setError(err.message || "Failed to generate your website. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    };
    
    generate();
  }, []);

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
      const updatedContent = await refineWebsiteContent(siteContent.html, prompt);
      
      // Update in DB
      await supabase.from('pages').update({ html: updatedContent.html }).eq('id', siteContent.id);
      setSiteContent(prev => prev ? { ...prev, html: updatedContent.html } : null);
    } catch (err: any) {
      setError(err.message || "Failed to refine.");
    } finally {
      setIsRefining(false);
    }
  };

  if (isGenerating) return <LoadingScreen />;
  
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
        profileTree = {
          identity: { name: '', role: '', location: '', bio: '', tagline: '', availability: '', email: '' },
          experience: [], education: [], skills: [], projects: [], achievements: [],
          social: { github: '', linkedin: '', twitter: '', portfolio: '', youtube: '', instagram: '', other: '' },
          personal: { interests: '', languages: '', values: '', funFacts: '', personalityType: '' },
          goals: { shortTerm: '', longTerm: '', currentlyLearning: '', openTo: '' },
          custom: [],
        };
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
