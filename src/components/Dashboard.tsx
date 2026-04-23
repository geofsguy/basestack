import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Circle,
  Database,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Logo from './Logo';
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

function formatCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function getInitials(nameOrEmail: string): string {
  const value = nameOrEmail.trim();
  if (!value) return 'BS';
  const name = value.includes('@') ? value.split('@')[0].replace(/[._-]+/g, ' ') : value;
  const parts = name.split(' ').filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'BS';
}

function getGenerationLabel(page: Page): string {
  if (page.generation_mode === 'nextjs') return 'Next.js';
  if (page.framework) return page.framework;
  return 'HTML';
}

function getPageSummary(page: Page): string {
  return page.vibe?.trim() || 'AI-generated site';
}

function Sparkline({ value, muted = false }: { value: number; muted?: boolean }) {
  const seed = Math.max(value, 1);
  const points = Array.from({ length: 10 }, (_, index) => {
    const x = index * 12;
    const wave = Math.sin((index + seed) * 1.35) * 9;
    const trend = index * 1.2;
    const y = 34 - wave - trend;
    return `${x},${Math.max(8, Math.min(42, y))}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 108 48" className="h-10 w-28" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={muted ? '#cbd5e1' : '#4f46e5'}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TIPS: { text: React.ReactNode }[] = [
  {
    text: (
      <>
        A richer{' '}
        <Link to="/data-tree" className="font-semibold text-indigo-700 hover:text-indigo-900">
          Data Tree
        </Link>{' '}
        gives the generator better material for sharper sites.
      </>
    ),
  },
  {
    text: 'After publishing, share your live link anywhere you want people to see your work.',
  },
  {
    text: 'Use Edit with AI when a site is close, but needs a clearer layout, tone, or section.',
  },
  {
    text: 'Keep your projects and experience current so future generations feel specific and useful.',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [userDisplayName, setUserDisplayName] = useState('Account');
  const [userEmail, setUserEmail] = useState('');
  const tipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPages();
    checkDataTree();
    fetchPlanData();
    fetchAccount();
  }, []);

  useEffect(() => {
    tipTimerRef.current = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex((i) => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 350);
    }, 5000);
    return () => {
      if (tipTimerRef.current) clearInterval(tipTimerRef.current);
    };
  }, []);

  const fetchAccount = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
      setUserDisplayName(metadataName || user.email || 'Account');
      setUserEmail(user.email || '');
    } catch (err) {
      console.error('Error fetching account:', err);
    }
  };

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
      // Best effort only.
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
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, slug, published_at: publishedAt } : p)),
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

  const liveSites = pages.filter((p) => p.published_at).length;
  const draftSites = pages.length - liveSites;
  const hasPremiumAnalytics = isPremiumTier(currentTier);
  const analyticsOverviewItems = Object.values(analyticsOverview) as SiteAnalyticsOverviewItem[];
  const totalTrackedViews = analyticsOverviewItems.reduce((sum, item) => sum + item.total_views, 0);
  const totalUniqueVisitors = analyticsOverviewItems.reduce((sum, item) => sum + item.unique_visitors, 0);
  const viewsLastSevenDays = analyticsOverviewItems.reduce((sum, item) => sum + item.views_last_7_days, 0);
  const deleteTargetName = deleteTarget ? getPageDisplayName(deleteTarget) : '';
  const deleteMatches = deleteConfirmation.trim() === deleteTargetName;
  const publishedPages = pages.filter((page) => page.published_at);
  const latestPublishedPage = publishedPages[0];
  const filteredPages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pages;
    return pages.filter((page) => {
      const haystack = [
        getPageDisplayName(page),
        getPageSummary(page),
        page.slug || '',
        getGenerationLabel(page),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [pages, searchQuery]);

  const steps = [
    {
      label: 'Fill in your Data Tree',
      done: hasDataTree,
      href: '/data-tree',
      desc: 'Add the details AI uses to generate richer sites',
    },
    {
      label: 'Create your first site',
      done: pages.length > 0,
      href: '/create',
      desc: 'Start from a guided profile flow',
    },
    {
      label: 'Publish a site live',
      done: liveSites > 0,
      href: pages.length > 0 ? undefined : '/create',
      desc: 'Turn a draft into a shareable public link',
    },
  ];
  const allDone = steps.every((s) => s.done);
  const deploymentStatus = liveSites > 0 ? 'Sites live and shareable' : 'No published sites yet';
  const successRate = pages.length > 0 ? Math.round((liveSites / pages.length) * 100) : 0;
  const accountLabel = userEmail || userDisplayName;

  const dashboardStats = [
    {
      label: 'Total Sites',
      value: pages.length,
      delta: pages.length > 0 ? `${pages.length} project${pages.length === 1 ? '' : 's'}` : 'Ready to create',
      icon: LayoutTemplate,
      shell: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Live Sites',
      value: liveSites,
      delta: liveSites > 0 ? 'Published now' : 'Publish a draft',
      icon: Globe,
      shell: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Drafts',
      value: draftSites,
      delta: draftSites > 0 ? 'Work in progress' : 'All caught up',
      icon: FileText,
      shell: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Views',
      value: hasPremiumAnalytics ? formatCompactNumber(totalTrackedViews) : '-',
      delta: hasPremiumAnalytics ? `${formatCompactNumber(viewsLastSevenDays)} this week` : 'Premium analytics',
      icon: Eye,
      shell: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-[244px] shrink-0 border-r border-slate-200/80 bg-white xl:flex xl:flex-col">
          <div className="flex h-[72px] items-center gap-3 border-b border-slate-200/80 px-7">
            <Logo className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-semibold tracking-tight">BaseStack</span>
          </div>

          <nav className="flex-1 px-4 py-5">
            <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Main</p>
            <div className="mt-3 space-y-1">
              <Link
                to="/dashboard"
                className="flex h-10 items-center gap-3 rounded-lg bg-indigo-50 px-4 text-sm font-semibold text-indigo-600"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                to="/data-tree"
                className="flex h-10 items-center gap-3 rounded-lg px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
              >
                <Database className="h-4 w-4" />
                Data Tree
              </Link>
              <button
                onClick={() => document.getElementById('site-performance')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex h-10 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </button>
            </div>

            <p className="mt-8 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Account</p>
            <div className="mt-3 space-y-1">
              <Link
                to="/settings"
                className="flex h-10 items-center gap-3 rounded-lg px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="flex h-10 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </nav>

          <div className="m-4 rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{currentTier === 'free' ? 'Free Plan' : `${currentTier[0].toUpperCase()}${currentTier.slice(1)} Plan`}</p>
                <p className="text-xs text-slate-500">{hasPremiumAnalytics ? 'Analytics enabled' : 'Basic workspace'}</p>
              </div>
            </div>
            {!hasPremiumAnalytics && (
              <button
                onClick={() => navigate('/settings')}
                className="mt-4 h-9 w-full rounded-md border border-indigo-100 bg-white text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                View Plans
              </button>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:px-6 xl:px-10">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex items-center gap-3 xl:hidden">
                <Logo className="h-8 w-8 text-indigo-600" />
                <span className="hidden text-lg font-semibold tracking-tight sm:inline">BaseStack</span>
              </div>
              <div className="relative hidden w-full max-w-[460px] md:block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search sites, pages, analytics..."
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-11 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-200 focus:ring-4 focus:ring-indigo-100/70"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/settings')}
                className="hidden h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:flex"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {getInitials(accountLabel)}
                </div>
                <div className="hidden min-w-0 text-left lg:block">
                  <p className="truncate text-sm font-semibold text-slate-900">{userDisplayName}</p>
                  <p className="truncate text-xs text-slate-500">{userEmail || 'Manage account'}</p>
                </div>
                <ChevronRight className="hidden h-4 w-4 rotate-90 text-slate-400 lg:block" />
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 xl:px-10">
            <div className="mx-auto max-w-[1540px]">
              <section className="relative overflow-hidden rounded-lg border border-indigo-100 bg-white px-5 py-7 shadow-sm md:px-8">
                <div className="pointer-events-none absolute right-12 top-1/2 hidden h-36 w-[360px] -translate-y-1/2 lg:block">
                  <div className="absolute right-0 top-0 h-28 w-44 rotate-3 rounded-lg border border-indigo-100 bg-slate-50 shadow-sm" />
                  <div className="absolute right-24 top-7 h-24 w-44 -rotate-3 rounded-lg border border-indigo-100 bg-white shadow-sm" />
                  <div className="absolute right-44 top-12 h-20 w-36 rounded-lg bg-indigo-500/90 shadow-lg shadow-indigo-200" />
                  <div className="absolute right-52 top-20 h-2 w-20 rounded bg-white/70" />
                  <div className="absolute right-52 top-28 h-2 w-12 rounded bg-white/50" />
                  <div className="absolute right-8 top-20 h-3 w-3 rounded-full bg-teal-300" />
                </div>

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                      Welcome back, {userDisplayName === 'Account' ? 'there' : userDisplayName.split(' ')[0]}.
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
                      Here is what is happening with your generated sites today.
                    </p>
                  </div>
                  <Link
                    to="/create"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Site
                  </Link>
                </div>
              </section>

              {!loading && (
                <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {dashboardStats.map(({ label, value, delta, icon: Icon, shell }) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${shell}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">{label}</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <p className="text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
                            <p className="text-xs font-semibold text-emerald-600">{delta}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-5">
                  <section>
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight text-slate-950">Your Sites</h2>
                        <p className="text-sm text-slate-500">
                          Manage real sites in your workspace: preview, publish, update, analyze, edit, or delete.
                        </p>
                      </div>
                      {pages.length > 0 && (
                        <Link
                          to="/create"
                          className="hidden text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800 sm:inline-flex"
                        >
                          New site
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      )}
                    </div>

                    {loading ? (
                      <div className="flex h-80 items-center justify-center rounded-lg border border-slate-200 bg-white">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                      </div>
                    ) : pages.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <LayoutTemplate className="h-6 w-6" />
                        </div>
                        <h3 className="mt-5 text-lg font-semibold text-slate-950">No sites yet</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                          Create your first generated site, then publish it here when it is ready to share.
                        </p>
                        <Link
                          to="/create"
                          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                        >
                          <Plus className="h-4 w-4" />
                          Create your first site
                        </Link>
                      </div>
                    ) : filteredPages.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                        <Search className="mx-auto h-6 w-6 text-slate-400" />
                        <h3 className="mt-4 text-base font-semibold text-slate-950">No matching sites</h3>
                        <p className="mt-2 text-sm text-slate-500">Try another search term.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="divide-y divide-slate-200">
                          {filteredPages.map((page) => {
                            const name = getPageDisplayName(page);
                            const views = analyticsOverview[page.id]?.total_views ?? 0;
                            const isLive = !!page.published_at;

                            return (
                              <article key={page.id} className="grid gap-4 p-4 transition-colors hover:bg-slate-50/70 lg:grid-cols-[220px_minmax(0,1fr)_140px_128px_420px] lg:items-center">
                                <div className="h-28 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                                  <iframe
                                    title={`${name} preview`}
                                    srcDoc={page.html}
                                    sandbox=""
                                    scrolling="no"
                                    className="pointer-events-none h-[280px] w-[550px] origin-top-left scale-[0.4] border-0 bg-white"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <h3 className="truncate text-sm font-semibold text-slate-950">{name}</h3>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                      {isLive ? 'Live' : 'Draft'}
                                    </span>
                                  </div>
                                  <p className="mt-2 truncate text-sm text-slate-500">{getPageSummary(page)}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {page.slug && (
                                      <a
                                        href={`/s/${page.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                      >
                                        /s/{page.slug}
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                                      {getGenerationLabel(page)}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-slate-400">Views</p>
                                  <p className="mt-1 text-lg font-semibold text-slate-950">
                                    {hasPremiumAnalytics && isLive ? formatCompactNumber(views) : '-'}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-slate-400">Updated</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-600">{formatRelativeTime(page.created_at)}</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                  {isLive && (
                                    <Sparkline value={views} muted={!hasPremiumAnalytics} />
                                  )}
                                  <a
                                    href={isLive && page.slug ? `/s/${page.slug}` : `/view/${page.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
                                  >
                                    {isLive ? 'View' : 'Preview'}
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                  {isLive && (
                                    <button
                                      onClick={() => openAnalytics(page)}
                                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
                                    >
                                      <BarChart3 className="h-3.5 w-3.5" />
                                      Analytics
                                    </button>
                                  )}
                                  <Link
                                    to={`/edit/${page.id}`}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-indigo-100 bg-white px-3 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Edit with AI
                                  </Link>
                                  <button
                                    onClick={() => setPublishTarget(page)}
                                    className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                                  >
                                    {isLive ? 'Update' : 'Publish'}
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(page)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                    aria-label={`Delete ${name}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </section>

                  <section id="site-performance" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-slate-950">Site Performance Overview</h2>
                        <p className="text-sm text-slate-500">
                          {hasPremiumAnalytics ? 'Aggregate analytics from your live sites.' : 'Upgrade to unlock real traffic reporting.'}
                        </p>
                      </div>
                      <button
                        onClick={() => hasPremiumAnalytics ? undefined : navigate('/settings')}
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
                      >
                        {hasPremiumAnalytics ? 'Last 30 days' : 'View plans'}
                      </button>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-4">
                      {[
                        ['Views', hasPremiumAnalytics ? formatCompactNumber(totalTrackedViews) : '-'],
                        ['Visitors', hasPremiumAnalytics ? formatCompactNumber(totalUniqueVisitors) : '-'],
                        ['7 day views', hasPremiumAnalytics ? formatCompactNumber(viewsLastSevenDays) : '-'],
                        ['Live ratio', pages.length > 0 ? `${successRate}%` : '-'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md bg-slate-50 px-3 py-3">
                          <p className="text-xs font-semibold text-slate-500">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 h-40 overflow-hidden rounded-md bg-gradient-to-b from-white to-indigo-50/50">
                      <svg viewBox="0 0 720 160" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                        {[30, 60, 90, 120].map((y) => (
                          <line key={y} x1="0" x2="720" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="6 6" />
                        ))}
                        <path
                          d="M0 114 C 56 100, 78 68, 132 76 S 210 56, 260 72 S 322 122, 380 104 S 442 82, 492 100 S 568 122, 620 92 S 680 108, 720 88"
                          fill="none"
                          stroke={hasPremiumAnalytics ? '#4f46e5' : '#cbd5e1'}
                          strokeWidth="3"
                        />
                        <path
                          d="M0 114 C 56 100, 78 68, 132 76 S 210 56, 260 72 S 322 122, 380 104 S 442 82, 492 100 S 568 122, 620 92 S 680 108, 720 88 L720 160 L0 160 Z"
                          fill={hasPremiumAnalytics ? '#6366f1' : '#94a3b8'}
                          opacity="0.12"
                        />
                      </svg>
                    </div>
                  </section>
                </div>

                {!loading && (
                  <aside className="space-y-5">
                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-sm font-semibold text-slate-950">Deployment Status</h2>
                          <p className="mt-1 text-xs font-semibold text-emerald-600">{deploymentStatus}</p>
                        </div>
                      </div>
                      <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Last deployment</span>
                          <span className="font-semibold text-slate-700">
                            {latestPublishedPage?.published_at ? formatRelativeTime(latestPublishedPage.published_at) : 'None'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Live rate</span>
                          <span className="font-semibold text-slate-700">{pages.length > 0 ? `${successRate}%` : '-'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => latestPublishedPage && setPublishTarget(latestPublishedPage)}
                        disabled={!latestPublishedPage}
                        className="mt-5 h-10 w-full rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {latestPublishedPage ? 'Update Latest Site' : 'No Deployments'}
                      </button>
                    </section>

                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-950">Recent Activity</h2>
                        <span className="text-xs font-semibold text-indigo-600">{pages.length} total</span>
                      </div>
                      {pages.length > 0 ? (
                        <ol className="space-y-4">
                          {pages.slice(0, 4).map((page) => (
                            <li key={page.id} className="flex items-start gap-3">
                              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${page.published_at ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {page.published_at ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-700">{getPageDisplayName(page)}</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {page.published_at ? 'Published changes' : 'Draft created'}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-slate-400">{formatRelativeTime(page.created_at)}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm leading-6 text-slate-500">No activity yet. Your first created site will appear here.</p>
                      )}
                    </section>

                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-semibold text-slate-950">Next Steps</h2>
                          <p className="text-xs text-slate-500">{allDone ? 'Everything essential is set up.' : 'Finish the essentials.'}</p>
                        </div>
                        {allDone && <TrendingUp className="h-5 w-5 text-emerald-500" />}
                      </div>
                      <ol className="space-y-4">
                        {steps.map((step) => {
                          const content = (
                            <>
                              {step.done ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-semibold ${step.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                  {step.label}
                                </p>
                                {!step.done && <p className="mt-0.5 text-xs text-slate-500">{step.desc}</p>}
                              </div>
                              {!step.done && step.href && <ChevronRight className="mt-1 h-4 w-4 text-slate-300" />}
                            </>
                          );

                          return (
                            <li key={step.label}>
                              {step.href && !step.done ? (
                                <Link to={step.href} className="flex items-start gap-3 rounded-md transition-colors hover:bg-slate-50">
                                  {content}
                                </Link>
                              ) : (
                                <div className="flex items-start gap-3">{content}</div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </section>

                    <section className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-600" />
                          <h2 className="text-sm font-semibold text-indigo-900">AI Tip</h2>
                        </div>
                        <div className="flex items-center gap-1">
                          {TIPS.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                if (tipTimerRef.current) clearInterval(tipTimerRef.current);
                                setTipVisible(false);
                                setTimeout(() => {
                                  setTipIndex(index);
                                  setTipVisible(true);
                                }, 350);
                              }}
                              className={`h-1.5 w-1.5 rounded-full transition-colors ${index === tipIndex ? 'bg-indigo-600' : 'bg-indigo-200 hover:bg-indigo-300'}`}
                              aria-label={`Tip ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p
                        className="mt-3 min-h-[44px] text-sm leading-6 text-indigo-700 transition-opacity duration-300"
                        style={{ opacity: tipVisible ? 1 : 0 }}
                      >
                        {TIPS[tipIndex].text}
                      </p>
                    </section>

                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="text-sm font-semibold text-slate-950">Quick Actions</h2>
                      <div className="mt-4 grid grid-cols-4 gap-3">
                        {[
                          { label: 'New Site', icon: LayoutTemplate, href: '/create' },
                          { label: 'Generate', icon: Wand2, href: '/generate' },
                          { label: 'Data Tree', icon: Database, href: '/data-tree' },
                          { label: 'Settings', icon: Settings, href: '/settings' },
                        ].map(({ label, icon: Icon, href }) => (
                          <Link key={label} to={href} className="group min-w-0 text-center">
                            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="mt-2 block truncate text-[11px] font-semibold text-slate-600">{label}</span>
                          </Link>
                        ))}
                      </div>
                    </section>
                  </aside>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

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
            className="w-full max-w-md rounded-lg border border-red-100 bg-white p-8 shadow-2xl shadow-black/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Delete site</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
              This permanently deletes <span className="font-semibold text-slate-950">{deleteTargetName}</span>.
              Type the site name exactly to confirm.
            </p>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Type this name</p>
              <p className="mt-1 text-sm font-medium text-slate-950">{deleteTargetName}</p>
            </div>

            <div className="mt-5">
              <label htmlFor="delete-site-confirmation" className="mb-2 block text-sm font-medium text-slate-700">
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
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[15px] font-medium text-slate-950 outline-none transition-all focus:border-red-300 focus:ring-4 focus:ring-red-100"
                placeholder={deleteTargetName}
              />
            </div>

            {deleteError && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="rounded-md border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSite}
                disabled={!deleteMatches || isDeleting}
                className="inline-flex items-center rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
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
