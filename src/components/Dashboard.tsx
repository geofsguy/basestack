import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import Logo from './Logo';
import {
  Plus,
  LayoutTemplate,
  Link as LinkIcon,
  LogOut,
  Globe,
  Database,
  Settings,
  Sparkles,
  Clock,
  ChevronRight,
  Zap,
  FileText,
  CheckCircle2,
  Circle,
  TrendingUp,
  BarChart3,
  Eye,
  Lock,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PublishModal from './PublishModal';
import SiteAnalyticsModal from './SiteAnalyticsModal';
import { fetchSiteAnalytics, fetchSiteAnalyticsOverview } from '../services/analytics';
import { SubscriptionTier, normalizeTier, isPremiumTier } from '../lib/plan';
import { SiteAnalytics, SiteAnalyticsOverviewItem } from '../types';

interface Page {
  id: string;
  created_at: string;
  title: string | null;
  vibe: string | null;
  html: string;
  slug: string | null;
  published_at: string | null;
  generation_mode?: 'html' | 'nextjs' | null;
  framework?: string | null;
}

function getPageDisplayName(page: Page): string {
  return page.title?.trim() || 'Untitled Site';
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TIPS: { text: React.ReactNode }[] = [
  {
    text: (
      <>
        The richer your{' '}
        <Link to="/data-tree" className="underline underline-offset-2 font-medium hover:text-indigo-800">
          Data Tree
        </Link>
        , the more personalised and impressive your AI-generated sites will be.
      </>
    ),
  },
  {
    text: 'After publishing, share your live link on LinkedIn or Twitter — a polished personal site makes a strong first impression.',
  },
  {
    text: (
      <>
        Use the{' '}
        <Link to="/data-tree" className="underline underline-offset-2 font-medium hover:text-indigo-800">
          Goals section
        </Link>{' '}
        in your Data Tree to let the AI know what opportunities you\'re open to.
      </>
    ),
  },
  {
    text: 'Try different vibes when creating a site — the same info can become a minimal portfolio, a bold landing page, or a creative showcase.',
  },
  {
    text: (
      <>
        After generating, click{' '}
        <span className="font-medium text-indigo-700">Edit with AI</span>{' '}
        on any site card to refine the design or content with a quick chat.
      </>
    ),
  },
  {
    text: 'Keep your experience and projects up to date — new entries unlock richer, more accurate AI generations every time.',
  },
];

export default function Dashboard() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishTarget, setPublishTarget] = useState<Page | null>(null);
  const [hasDataTree, setHasDataTree] = useState(false);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [analyticsOverview, setAnalyticsOverview] = useState<Record<string, SiteAnalyticsOverviewItem>>({});
  const [analyticsCache, setAnalyticsCache] = useState<Record<string, SiteAnalytics>>({});
  const [analyticsTarget, setAnalyticsTarget] = useState<Page | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const tipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPages();
    checkDataTree();
    fetchPlanData();
  }, []);

  // Rotate tips every 5 s with a fade-out / fade-in
  useEffect(() => {
    tipTimerRef.current = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex(i => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 350); // half of the CSS transition duration
    }, 5000);
    return () => {
      if (tipTimerRef.current) clearInterval(tipTimerRef.current);
    };
  }, []);

  const fetchPages = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('pages')
        .select('id, created_at, title, vibe, html, slug, published_at, generation_mode, framework')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (err) {
      console.error('Error fetching pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDataTree = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();
      setHasDataTree(!!data);
    } catch {
      // silently ignore
    }
  };

  const fetchPlanData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_usage');
      if (error) throw error;

      const tier = normalizeTier(data?.tier);
      setCurrentTier(tier);

      if (isPremiumTier(tier)) {
        const overview = await fetchSiteAnalyticsOverview();
        setAnalyticsOverview(
          overview.reduce<Record<string, SiteAnalyticsOverviewItem>>((accumulator, item) => {
            accumulator[item.page_id] = item;
            return accumulator;
          }, {}),
        );
      } else {
        setAnalyticsOverview({});
      }
    } catch (err) {
      console.error('Error fetching analytics plan data:', err);
      setCurrentTier('free');
      setAnalyticsOverview({});
    }
  };

  const handlePublished = (pageId: string, slug: string, publishedAt: string) => {
    setPages(prev =>
      prev.map(p =>
        p.id === pageId ? { ...p, slug, published_at: publishedAt } : p
      )
    );
    void fetchPlanData();
    setPublishTarget(null);
  };

  const openAnalytics = async (page: Page) => {
    setAnalyticsTarget(page);
    setAnalyticsError(null);

    if (!isPremiumTier(currentTier)) {
      setAnalyticsLoading(false);
      return;
    }

    const cached = analyticsCache[page.id];
    if (cached) {
      setAnalyticsLoading(false);
      return;
    }

    setAnalyticsLoading(true);
    try {
      const analytics = await fetchSiteAnalytics(page.id);
      setAnalyticsCache((prev) => ({ ...prev, [page.id]: analytics }));
    } catch (err: any) {
      console.error('Error fetching site analytics:', err);
      setAnalyticsError(err.message || 'Unable to load site analytics right now.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const openDeleteModal = (page: Page) => {
    setDeleteTarget(page);
    setDeleteConfirmation('');
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteConfirmation('');
    setDeleteError(null);
  };

  const handleDeleteSite = async () => {
    if (!deleteTarget || isDeleting) return;

    const expectedName = getPageDisplayName(deleteTarget);
    if (deleteConfirmation.trim() !== expectedName) {
      setDeleteError('Type the site name exactly to confirm deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('You need to be signed in to delete a site.');
      }

      const { data, error } = await supabase
        .from('pages')
        .delete()
        .eq('id', deleteTarget.id)
        .eq('user_id', userData.user.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Delete was blocked before the site could be removed. Please check your Supabase delete policy for the signed-in user.');
      }

      setPages((prev) => prev.filter((page) => page.id !== deleteTarget.id));
      setPublishTarget((prev) => (prev?.id === deleteTarget.id ? null : prev));
      setAnalyticsTarget((prev) => (prev?.id === deleteTarget.id ? null : prev));
      setAnalyticsOverview((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      setAnalyticsCache((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      setDeleteTarget(null);
      setDeleteConfirmation('');
      setDeleteError(null);
      void fetchPlanData();
    } catch (err: any) {
      console.error('Error deleting page:', err);
      setDeleteError(err.message || 'Unable to delete this site right now.');
    } finally {
      setIsDeleting(false);
    }
  };

  const liveSites = pages.filter(p => p.published_at).length;
  const draftSites = pages.length - liveSites;
  const hasPremiumAnalytics = isPremiumTier(currentTier);
  const analyticsOverviewItems = Object.values(analyticsOverview) as SiteAnalyticsOverviewItem[];
  const totalTrackedViews = analyticsOverviewItems.reduce((sum, item) => sum + item.total_views, 0);
  const deleteTargetName = deleteTarget ? getPageDisplayName(deleteTarget) : '';
  const deleteMatches = deleteConfirmation.trim() === deleteTargetName;
  const dashboardStats = [
    { label: 'Total Sites', value: pages.length, icon: LayoutTemplate, color: 'text-gray-900' },
    { label: 'Live', value: liveSites, icon: Globe, color: 'text-emerald-600' },
    { label: 'Drafts', value: draftSites, icon: FileText, color: 'text-amber-500' },
    ...(hasPremiumAnalytics
      ? [{ label: 'Views', value: totalTrackedViews, icon: Eye, color: 'text-indigo-600' }]
      : []),
  ];

  // Checklist steps
  const steps = [
    {
      label: 'Fill in your Data Tree',
      done: hasDataTree,
      href: '/data-tree',
      desc: 'Add your info so AI can generate richer sites',
    },
    {
      label: 'Create your first site',
      done: pages.length > 0,
      href: '/create',
      desc: 'Generate a personal site with AI in seconds',
    },
    {
      label: 'Publish a site live',
      done: liveSites > 0,
      href: pages.length > 0 ? undefined : '/create',
      desc: 'Share your site with the world via a public link',
    },
  ];
  const allDone = steps.every(s => s.done);

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-6 lg:p-12 relative overflow-hidden font-sans">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* ── Header ── */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center space-x-3">
            <Logo className="w-8 h-8 text-black" />
            <span className="font-bold text-xl tracking-tight">BaseStack</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/data-tree"
              className="flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              <Database className="w-4 h-4 mr-1.5" />
              Data Tree
            </Link>
            <Link
              to="/settings"
              className="flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              <Settings className="w-4 h-4 mr-1.5" />
              Settings
            </Link>
            <span className="text-gray-200">|</span>
            <button
              onClick={handleSignOut}
              className="flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* ── Stats Bar ── */}
        {!loading && (
          <div className={`grid gap-4 mb-8 ${hasPremiumAnalytics ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
            {dashboardStats.map(({ label, value, icon: Icon, color }, i) => (
              <div
                key={label}
                className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl px-6 py-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
                style={{ animationDelay: `${i * 100}ms`, animationDuration: '600ms' }}
              >
                <div className="w-10 h-10 bg-gray-50/80 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Page Title + CTA ── */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-gray-900 mb-2">Your Sites</h1>
            <p className="text-gray-400 text-[15px]">
              Manage your sites.{' '}
              <Link
                to="/data-tree"
                className="text-gray-700 underline underline-offset-2 hover:text-black"
              >
                Edit your Data Tree
              </Link>{' '}
              to enrich future generations.
            </p>
          </div>
          <Link
            to="/create"
            className="flex items-center px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 hover:scale-105 hover:shadow-lg transition-all group"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Create New Site
          </Link>
        </div>

        {/* ── Main content area ── */}
        <div className={`flex gap-8 ${pages.length > 0 || loading ? 'items-start' : ''}`}>
          {/* ── Site grid / empty state ── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
              </div>
            ) : pages.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-12 text-center shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="relative w-20 h-20 mx-auto mb-6 group cursor-default">
                  <div className="absolute inset-0 bg-indigo-100 rounded-2xl rotate-6 animate-pulse" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-md transform -rotate-3 transition-transform group-hover:rotate-0">
                    <LayoutTemplate className="w-8 h-8 text-indigo-500" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No sites yet</h3>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                  You haven't generated any sites yet. Click the button below to create your first personal website.
                </p>
                <Link
                  to="/create"
                  className="inline-flex items-center px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 hover:scale-105 transition-all shadow-md group"
                >
                  <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Create your first site
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {pages.map((page, i) => (
                  <div
                    key={page.id}
                    className="relative bg-white/70 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] hover:border-gray-200/60 hover:-translate-y-1.5 transition-all duration-500 group flex flex-col h-full animate-in fade-in zoom-in-95 fill-mode-both"
                    style={{ animationDelay: `${i * 100 + 100}ms`, animationDuration: '500ms' }}
                  >
                    {/* Subtle internal gradient effect for a slightly more premium feel */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                    <div className="p-8 flex-1 relative z-10">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl flex items-center justify-center shadow-sm border border-white/60">
                          <LayoutTemplate className="w-5 h-5 text-gray-600" />
                        </div>
                        {page.published_at ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-black text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse opacity-80" />
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-400 border border-gray-100">
                            Draft
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">
                        {getPageDisplayName(page)}
                      </h3>
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-medium text-gray-500">{page.vibe || 'Random Vibe'}</p>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          page.generation_mode === 'nextjs'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50'
                            : 'bg-gray-50 text-gray-500 border border-gray-200/50'
                        }`}>
                          {page.generation_mode === 'nextjs' ? 'Next.js' : 'HTML'}
                        </span>
                      </div>
                      {page.published_at && page.slug && (
                        <p className="text-[13px] font-mono text-gray-400 truncate mb-1.5 bg-gray-50/50 rounded-lg px-2.5 py-1.5 w-fit border border-gray-100/50">
                          /s/{page.slug}
                        </p>
                      )}
                      <p className="text-[13px] text-gray-400 font-medium mt-1">
                        Created {new Date(page.created_at).toLocaleDateString()}
                      </p>
                      {page.published_at && (
                        <div className={`mt-6 rounded-2xl border px-5 py-4 transition-all duration-300 ${
                          hasPremiumAnalytics
                            ? 'border-indigo-100/60 bg-gradient-to-br from-indigo-50/80 to-white/50 backdrop-blur-sm shadow-sm'
                            : 'border-gray-100/80 bg-gray-50/50'
                        }`}>
                          {hasPremiumAnalytics ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-400/80">
                                  Views
                                </p>
                                <p className="mt-1.5 text-2xl font-bold tracking-tight text-indigo-950">
                                  {analyticsOverview[page.id]?.total_views ?? 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-400/80">
                                  Visitors
                                </p>
                                <p className="mt-1.5 text-2xl font-bold tracking-tight text-indigo-950">
                                  {analyticsOverview[page.id]?.unique_visitors ?? 0}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-gray-100/80 text-gray-400 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                                <Lock className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-gray-700">Premium analytics</p>
                                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                  Upgrade to Pro or Studio to see traffic, visitors, and referrers.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="px-8 py-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-y-4 gap-x-2 relative z-10 bg-white/30 backdrop-blur-sm">
                      <div className="flex items-center gap-4 flex-wrap flex-1">
                        {page.published_at && page.slug ? (
                          <a
                            href={`/s/${page.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
                          >
                            <Globe className="w-4 h-4 mr-1.5 opacity-70" />
                            View
                          </a>
                        ) : (
                          <a
                            href={`/view/${page.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
                          >
                            Preview
                            <LinkIcon className="w-3.5 h-3.5 ml-1.5 opacity-70" />
                          </a>
                        )}
                        {page.published_at && (
                          <button
                            onClick={() => openAnalytics(page)}
                            className={`flex items-center text-[13px] font-medium transition-colors ${
                              hasPremiumAnalytics
                                ? 'text-indigo-600 hover:text-indigo-700'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <BarChart3 className="w-4 h-4 mr-1.5 opacity-70" />
                            Analytics
                          </button>
                        )}
                        <Link
                          to={`/edit/${page.id}`}
                          className="flex items-center text-[13px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 mr-1.5 opacity-70" />
                          Edit with AI
                        </Link>
                        <button
                          onClick={() => openDeleteModal(page)}
                          className="flex items-center text-[13px] font-medium text-red-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5 opacity-70" />
                          Delete
                        </button>
                      </div>
                      <button
                        onClick={() => setPublishTarget(page)}
                        className="flex items-center text-[13px] font-semibold px-4 py-2 rounded-full transition-all bg-black text-white hover:bg-gray-800 shadow-md shadow-black/5 hover:shadow-black/10 hover:-translate-y-0.5"
                      >
                        {page.published_at ? 'Update' : 'Publish'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          {!loading && (
            <div className="w-72 flex-shrink-0 space-y-5 animate-in fade-in slide-in-from-right-8 duration-700 fill-mode-both" style={{ animationDelay: '300ms' }}>

              {/* Getting Started checklist */}
              {!allDone && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Getting Started</h3>
                  </div>
                  <ol className="space-y-3">
                    {steps.map((step, i) => (
                      <li key={i}>
                        {step.href ? (
                          <Link to={step.href} className="flex items-start gap-3 group">
                            {step.done ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-medium leading-tight ${
                                  step.done
                                    ? 'text-gray-300 line-through'
                                    : 'text-gray-700 group-hover:text-black'
                                }`}
                              >
                                {step.label}
                              </p>
                              {!step.done && (
                                <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                                  {step.desc}
                                </p>
                              )}
                            </div>
                            {!step.done && (
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 mt-0.5 flex-shrink-0 ml-auto" />
                            )}
                          </Link>
                        ) : (
                          <div className="flex items-start gap-3">
                            {step.done ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-medium leading-tight ${
                                  step.done ? 'text-gray-300 line-through' : 'text-gray-700'
                                }`}
                              >
                                {step.label}
                              </p>
                              {!step.done && (
                                <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                                  {step.desc}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* All done congratulations card */}
              {allDone && (
                <div className="bg-black rounded-2xl p-5 text-white overflow-hidden relative">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)',
                    }}
                  />
                  <TrendingUp className="w-5 h-5 mb-3 opacity-80" />
                  <h3 className="text-sm font-bold mb-1">You're all set! 🎉</h3>
                  <p className="text-xs opacity-60 leading-relaxed">
                    Your site is live. Keep your Data Tree updated to generate even better sites.
                  </p>
                </div>
              )}

              {/* Recent activity */}
              {pages.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                  </div>
                  <ol className="space-y-4">
                    {pages.slice(0, 5).map((page) => (
                      <li key={page.id} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {getPageDisplayName(page)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[10px] font-medium ${
                                page.published_at ? 'text-emerald-500' : 'text-amber-500'
                              }`}
                            >
                              {page.published_at ? 'Live' : 'Draft'}
                            </span>
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">
                              {formatRelativeTime(page.created_at)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Rotating tip card */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 min-h-[96px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-xs font-semibold text-indigo-700">Pro tip</h3>
                  </div>
                  {/* dot indicators */}
                  <div className="flex items-center gap-1">
                    {TIPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (tipTimerRef.current) clearInterval(tipTimerRef.current);
                          setTipVisible(false);
                          setTimeout(() => { setTipIndex(i); setTipVisible(true); }, 350);
                          tipTimerRef.current = setInterval(() => {
                            setTipVisible(false);
                            setTimeout(() => {
                              setTipIndex(idx => (idx + 1) % TIPS.length);
                              setTipVisible(true);
                            }, 350);
                          }, 5000);
                        }}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          i === tipIndex ? 'bg-indigo-500' : 'bg-indigo-200 hover:bg-indigo-300'
                        }`}
                        aria-label={`Tip ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <p
                  className="text-xs text-indigo-600 leading-relaxed transition-opacity duration-700"
                  style={{ opacity: tipVisible ? 1 : 0 }}
                >
                  {TIPS[tipIndex].text}
                </p>
              </div>

              <div className={`rounded-2xl border p-5 shadow-sm ${
                hasPremiumAnalytics ? 'border-indigo-100 bg-indigo-50/70' : 'border-gray-100 bg-white'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className={`w-4 h-4 ${hasPremiumAnalytics ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <h3 className="text-sm font-semibold text-gray-900">Analytics</h3>
                </div>
                {hasPremiumAnalytics ? (
                  <>
                    <p className="text-2xl font-bold tracking-tight text-indigo-900">{totalTrackedViews}</p>
                    <p className="mt-1 text-xs leading-relaxed text-indigo-700">
                      Total recorded views across your live portfolio sites.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Upgrade for traffic insights</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      Premium members can see views, visitors, and referral sources for every published site.
                    </p>
                    <button
                      onClick={() => navigate('/settings')}
                      className="mt-4 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
                    >
                      View plans
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      {publishTarget && (
        <PublishModal
          pageId={publishTarget.id}
          existingSlug={publishTarget.slug}
          existingPublishedAt={publishTarget.published_at}
          onClose={() => setPublishTarget(null)}
          onPublished={({ slug, publishedAt }) => handlePublished(publishTarget.id, slug, publishedAt)}
        />
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-8 shadow-2xl shadow-black/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <h2 className="text-2xl font-medium tracking-tight text-gray-900">Delete site</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-500">
              This permanently deletes <span className="font-semibold text-gray-900">{deleteTargetName}</span>.
              Type the site name exactly to confirm.
            </p>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Type this name</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{deleteTargetName}</p>
            </div>

            <div className="mt-5">
              <label htmlFor="delete-site-confirmation" className="mb-2 block text-sm font-medium text-gray-700">
                Confirm site name
              </label>
              <input
                id="delete-site-confirmation"
                type="text"
                value={deleteConfirmation}
                onChange={(event) => {
                  setDeleteConfirmation(event.target.value);
                  if (deleteError) setDeleteError(null);
                }}
                autoFocus
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[15px] font-medium text-gray-900 outline-none transition-all focus:border-red-300 focus:ring-1 focus:ring-red-500/20"
                placeholder={deleteTargetName}
              />
            </div>

            {deleteError && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSite}
                disabled={!deleteMatches || isDeleting}
                className="inline-flex items-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete site'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <SiteAnalyticsModal
        open={!!analyticsTarget}
        page={analyticsTarget ? { title: analyticsTarget.title, slug: analyticsTarget.slug } : null}
        hasPremiumAccess={hasPremiumAnalytics}
        analytics={analyticsTarget ? analyticsCache[analyticsTarget.id] || null : null}
        loading={analyticsLoading}
        error={analyticsError}
        onClose={() => {
          setAnalyticsTarget(null);
          setAnalyticsError(null);
          setAnalyticsLoading(false);
        }}
        onUpgrade={() => navigate('/settings')}
      />
    </div>
  );
}
