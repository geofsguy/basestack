import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { User, CreditCard, ArrowLeft, LogOut, Check, Zap, Building2, Sparkles, ExternalLink, Lock, AlertTriangle, PartyPopper, X, Globe2, Receipt, RefreshCcw, ShieldCheck, WalletCards, Box } from 'lucide-react';
import Logo from './Logo';
import { BillingFunctionError, BillingPlan, createBillingPortalSession, createCheckoutSession, syncBillingStatus } from '../services/billing';

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = {
  free: {
    label: 'Free',
    aiLimit: 3,
    siteLimit: 1,
    price: '$0',
    period: '',
    color: 'gray',
  },
  pro: {
    label: 'Pro',
    aiLimit: 20,
    siteLimit: 5,
    price: '$9',
    period: '/month',
    color: 'indigo',
  },
  studio: {
    label: 'Studio',
    aiLimit: 50,
    siteLimit: Infinity,
    price: '$29',
    period: '/month',
    color: 'violet',
  },
} as const;

type PlanKey = keyof typeof PLANS;

// ── Usage bar ─────────────────────────────────────────────────────────────────
function UsageBar({
  used,
  limit,
  label,
  icon,
}: {
  used: number;
  limit: number | typeof Infinity;
  label: string;
  icon: React.ReactNode;
}) {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 100 : Math.min((used / limit) * 100, 100);
  const nearLimit = pct >= 80;
  const atLimit = pct >= 100;
  const limitLabel = isUnlimited ? 'Unlimited' : `${limit}`;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            {icon}
          </div>
          <span className="truncate text-sm font-semibold text-gray-800">{label}</span>
        </div>
        <span className="flex-shrink-0 text-xs font-semibold text-gray-500">
          {used.toLocaleString()} / {limitLabel} used
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            atLimit && !isUnlimited ? 'bg-red-500' : nearLimit && !isUnlimited ? 'bg-amber-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atLimit && !isUnlimited && (
        <p className="mt-2 text-xs font-medium text-red-600">
          Limit reached. Upgrade to continue.
        </p>
      )}
    </div>
  );
}

// ── Plan badge chip ───────────────────────────────────────────────────────────
const PLAN_STYLES: Record<PlanKey, { badge: string; ring: string; icon: React.ReactNode }> = {
  free: {
    badge: 'bg-gray-100 text-gray-600',
    ring: 'border-gray-200',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  pro: {
    badge: 'bg-indigo-100 text-indigo-700',
    ring: 'border-indigo-300',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  studio: {
    badge: 'bg-violet-100 text-violet-700',
    ring: 'border-violet-300',
    icon: <Building2 className="w-3.5 h-3.5" />,
  },
};

const PLAN_DESCRIPTIONS: Record<PlanKey, string> = {
  free: 'For trying BaseStack and getting started',
  pro: 'For individuals and small projects',
  studio: 'For power users and agencies',
};

const formatBillingDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');
  const [user, setUser] = useState<any>(null);
  const [usage, setUsage] = useState<{
    message_count: number;
    tier: string;
    site_count: number;
    subscription_status?: string;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingAction, setBillingAction] = useState<'portal' | BillingPlan | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [welcomePlan, setWelcomePlan] = useState<'pro' | 'studio' | null>(null);
  const [isRefreshingBilling, setIsRefreshingBilling] = useState(false);
  const [billingSyncUnavailable, setBillingSyncUnavailable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('checkout');
    const joinedPlan = params.get('plan');
    const portalState = params.get('portal');
    if (!checkoutState && !portalState) return;

    if (checkoutState === 'success') {
      setActiveTab('billing');
      const normalizedPlan = joinedPlan === 'studio' ? 'Studio' : joinedPlan === 'pro' ? 'Pro' : 'new';
      setBillingMessage(
        normalizedPlan === 'new'
          ? 'Welcome aboard. Your new plan is being activated now.'
          : `Welcome to ${normalizedPlan}. Your plan is being activated now.`
      );
      setWelcomePlan(joinedPlan === 'studio' ? 'studio' : joinedPlan === 'pro' ? 'pro' : null);
    } else if (checkoutState === 'canceled') {
      setActiveTab('billing');
      setBillingMessage('Checkout was canceled. Your current plan has not changed.');
    }

    if (portalState === 'returned') {
      setActiveTab('billing');
      setBillingMessage('Refreshing your subscription details...');
      void fetchData(true, true);
    }

    params.delete('checkout');
    params.delete('plan');
    params.delete('portal');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  const fetchData = async (silent = false, syncBilling = false) => {
    if (silent) {
      setIsRefreshingBilling(true);
    } else {
      setLoading(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUser(user);
      if (syncBilling && !billingSyncUnavailable) {
        try {
          await syncBillingStatus();
          setBillingSyncUnavailable(false);
        } catch (syncError) {
          if (syncError instanceof BillingFunctionError && (syncError.status === 401 || syncError.status === 404)) {
            setBillingSyncUnavailable(true);
            setBillingMessage((currentMessage) =>
              currentMessage?.includes('Refreshing your subscription details')
                ? 'Your billing changes are still syncing. If you just canceled in Stripe, your subscription end date will appear as soon as Stripe finishes updating your account.'
                : currentMessage
            );
          } else {
            console.warn('Unable to sync billing status from Stripe.', syncError);
          }
        }
      }
      const { data, error } = await supabase.rpc('get_usage');
      if (!error) setUsage(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      if (silent) {
        setIsRefreshingBilling(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab !== 'billing') return;

    const refreshBilling = () => {
      void fetchData(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshBilling();
      }
    };

    window.addEventListener('focus', refreshBilling);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshBilling);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'billing') return;
    if (!billingMessage?.includes('Refreshing your subscription details')) return;

    let attempts = 0;
    const intervalId = window.setInterval(async () => {
      attempts += 1;
      await fetchData(true, true);

      if (attempts >= 8) {
        setBillingMessage(null);
        window.clearInterval(intervalId);
      }
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [activeTab, billingMessage]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleUpgrade = async (planKey: BillingPlan) => {
    setBillingAction(planKey);
    setBillingError(null);
    setBillingMessage('Creating secure checkout session...');

    try {
      const { url } = await createCheckoutSession(planKey);
      window.location.assign(url);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Unable to start checkout right now.');
      setBillingAction(null);
    }
  };

  const handleManageBilling = async () => {
    setBillingAction('portal');
    setBillingError(null);
    setBillingMessage('Opening secure billing portal...');

    try {
      const { url } = await createBillingPortalSession();
      window.location.assign(url);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Unable to open the billing portal right now.');
      setBillingAction(null);
    }
  };

  // Derive current plan key from Supabase tier string
  const tierRaw = (usage?.tier || 'free').toLowerCase();
  const currentPlan: PlanKey = tierRaw === 'studio' ? 'studio' : tierRaw === 'pro' ? 'pro' : 'free';
  const plan = PLANS[currentPlan];
  const planStyle = PLAN_STYLES[currentPlan];

  const messagesUsed = usage?.message_count ?? 0;
  const sitesUsed = usage?.site_count ?? 0;
  const subscriptionEndsAt = usage?.current_period_end ? new Date(usage.current_period_end) : null;
  const isCancellationScheduled = !!usage?.cancel_at_period_end && currentPlan !== 'free' && !!subscriptionEndsAt;
  const renewalCopy = subscriptionEndsAt
    ? `${isCancellationScheduled ? 'Access ends' : 'Renews'} on ${formatBillingDate(subscriptionEndsAt)}`
    : 'Usage refreshes monthly';
  const subscriptionStatus = usage?.subscription_status
    ? usage.subscription_status.replace(/_/g, ' ')
    : currentPlan === 'free'
    ? 'free plan'
    : 'active';
  const isCreatingCheckout = billingAction === 'pro' || billingAction === 'studio';
  const isOpeningPortal = billingAction === 'portal';
  const isBusyWithStripe = isCreatingCheckout || isOpeningPortal;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] font-sans">
      {welcomePlan && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/25 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_30px_120px_rgba(0,0,0,0.18)]">
            <div className="absolute inset-0 opacity-90" style={{ background: welcomePlan === 'studio' ? 'radial-gradient(circle at top, rgba(168,85,247,0.16), transparent 45%), linear-gradient(180deg, #faf5ff 0%, #ffffff 45%)' : 'radial-gradient(circle at top, rgba(79,70,229,0.16), transparent 45%), linear-gradient(180deg, #eef2ff 0%, #ffffff 45%)' }} />
            <div className="absolute -left-6 top-8 h-20 w-20 animate-pulse rounded-full bg-white/70 blur-xl" />
            <div className="absolute -right-6 top-16 h-24 w-24 animate-pulse rounded-full bg-white/80 blur-xl" />
            <div className="absolute left-10 top-16 animate-bounce text-amber-400" style={{ animationDuration: '1.8s' }}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="absolute right-12 top-24 animate-bounce text-pink-400" style={{ animationDuration: '2.1s' }}>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="absolute left-16 top-28 animate-bounce text-indigo-400" style={{ animationDuration: '2.4s' }}>
              <Sparkles className="h-3.5 w-3.5" />
            </div>

            <div className="relative p-8 sm:p-10">
              <button
                onClick={() => setWelcomePlan(null)}
                className="absolute right-5 top-5 rounded-full bg-white/80 p-2 text-gray-400 transition-colors hover:text-gray-700"
                aria-label="Close welcome message"
              >
                <X className="h-4 w-4" />
              </button>

              <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg ${welcomePlan === 'studio' ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600' : 'bg-gradient-to-br from-indigo-500 to-blue-600'}`}>
                <PartyPopper className="h-9 w-9" />
              </div>

              <div className="text-center">
                <p className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${welcomePlan === 'studio' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade Complete
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Welcome to {welcomePlan === 'studio' ? 'Studio' : 'Pro'}
                </h2>
                <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-600 sm:text-base">
                  Your upgrade is complete and your new plan perks are on the way. You now have access to everything included with the {welcomePlan === 'studio' ? 'Studio' : 'Pro'} plan.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(welcomePlan === 'studio'
                  ? ['50 AI operations each month', 'Unlimited websites', 'Advanced site analytics', 'Next.js project export']
                  : ['20 AI operations each month', 'Up to 5 websites', 'Portfolio site analytics', 'Next.js project export']
                ).map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-sm text-gray-700 shadow-sm">
                    <Check className={`h-4 w-4 flex-shrink-0 ${welcomePlan === 'studio' ? 'text-violet-600' : 'text-indigo-600'}`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setWelcomePlan(null)}
                  className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] ${welcomePlan === 'studio' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  Explore Your Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBusyWithStripe && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50/60 backdrop-blur-md transition-all duration-500">
          <div className="bg-white border border-gray-100 shadow-[0_12px_40px_rgb(0,0,0,0.06)] rounded-[24px] p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center transform transition-all animate-in fade-in zoom-in-95 duration-400">
            
            <div className="relative flex items-center justify-center h-16 w-16 mb-6">
              <svg className="absolute inset-0 w-full h-full text-gray-100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="6" />
              </svg>
              <svg className="absolute inset-0 w-full h-full text-gray-900 animate-spin" style={{ animationDuration: '1.2s' }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="100" strokeDashoffset="0" />
              </svg>
              <Lock className="w-5 h-5 text-gray-800" />
            </div>

            <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">
              {isOpeningPortal ? 'Opening Billing Portal' : 'Preparing Checkout'}
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              {isOpeningPortal 
                ? 'Connecting to your secure Stripe billing portal...' 
                : 'Connecting to your secure Stripe session...'}
            </p>
            
            <div className="flex items-center justify-center gap-1.5 opacity-50">
              <Lock className="w-3 h-3 text-gray-800" />
              <span className="text-[10px] font-semibold text-gray-800 tracking-widest uppercase">Secured via Stripe</span>
            </div>
          </div>
        </div>
      )}

      {/* Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-12 xl:max-w-[1360px] 2xl:max-w-[1580px] 2xl:px-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center space-x-3">
            <Logo className="w-8 h-8 text-black" />
            <span className="font-bold text-xl tracking-tight">BaseStack</span>
          </div>
          <Link to="/dashboard" className="flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Dashboard
          </Link>
        </header>

        <div className="flex flex-col gap-8 md:flex-row xl:gap-10">
          {/* Sidebar */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">Settings</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  activeTab === 'profile' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }`}
              >
                <User className="w-4 h-4 mr-3" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  activeTab === 'billing' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }`}
              >
                <CreditCard className="w-4 h-4 mr-3" />
                Usage &amp; Billing
              </button>
            </nav>
            <div className="mt-8 px-3 border-t border-gray-100 pt-8">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0 flex-1">
            {/* ── Profile Tab ────────────────────────────────────────────── */}
            {activeTab === 'profile' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Profile Settings</h2>
                <div className="space-y-6 max-w-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email" disabled value={user?.email || ''}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-400">Managed by your authentication provider.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <input
                      type="text" disabled value={user?.id || ''}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm font-mono cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                    <input
                      type="text" disabled
                      value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Billing Tab ─────────────────────────────────────────────── */}
            {activeTab === 'billing' && (
              <div className="space-y-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-950">Usage &amp; billing</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage your subscription, usage, and billing preferences.</p>
                  </div>
                  <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${planStyle.badge}`}>
                    {planStyle.icon}
                    {plan.label} plan
                  </span>
                </div>

                {(billingMessage || billingError) && (
                  <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${billingError ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                    {billingError || billingMessage}
                  </div>
                )}

                {isRefreshingBilling && !billingError && (
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                    <RefreshCcw className="h-4 w-4 animate-spin text-indigo-500" />
                    Refreshing your latest billing details...
                  </div>
                )}

                {isCancellationScheduled && subscriptionEndsAt && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                      <div>
                        <p className="font-semibold">Your subscription is scheduled to end.</p>
                        <p className="mt-1 leading-relaxed text-amber-800">
                          You&apos;ll keep your {plan.label} access until {formatBillingDate(subscriptionEndsAt)}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.95fr]">
                  <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <h2 className="text-lg font-bold text-gray-950">Current Plan</h2>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${planStyle.badge}`}>
                            {planStyle.icon}
                            {plan.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">You&apos;re on the {plan.label} plan. Keep building beautiful sites.</p>
                      </div>
                      <div className="hidden rounded-2xl bg-indigo-50 p-3 text-indigo-600 sm:block">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <UsageBar
                        label="AI Operations"
                        used={messagesUsed}
                        limit={plan.aiLimit}
                        icon={<Sparkles className="h-4 w-4" />}
                      />
                      <UsageBar
                        label="Active Sites"
                        used={sitesUsed}
                        limit={plan.siteLimit}
                        icon={<Globe2 className="h-4 w-4" />}
                      />
                    </div>

                    <p className="mt-5 text-xs font-medium text-gray-400">{renewalCopy}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
                      <div className="absolute right-5 top-5 h-20 w-28 rotate-[-3deg] rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50 shadow-xl">
                        <div className="h-6 rounded-t-2xl bg-gradient-to-r from-indigo-400 to-violet-600" />
                        <div className="mt-5 flex items-center justify-between px-3">
                          <div className="h-4 w-4 rounded bg-indigo-200" />
                          <div className="h-1.5 w-8 rounded-full bg-indigo-100" />
                        </div>
                      </div>

                      <div className="relative max-w-[72%]">
                        <h2 className="text-lg font-bold text-gray-950">Billing Overview</h2>
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center gap-3 text-sm">
                            <WalletCards className="h-4 w-4 text-indigo-600" />
                            <span className="font-semibold text-gray-900">Stripe billing</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            <span className="capitalize text-gray-600">{subscriptionStatus}</span>
                          </div>
                          <p className="text-sm text-gray-500">{renewalCopy}</p>
                        </div>
                      </div>

                      <button
                        onClick={handleManageBilling}
                        disabled={currentPlan === 'free' || billingAction !== null}
                        className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {currentPlan === 'free'
                          ? 'Upgrade to manage subscription'
                          : billingAction === 'portal'
                          ? 'Opening secure billing portal...'
                          : 'Manage Subscription'}
                        <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                      </button>
                    </div>

                    <div className="rounded-[22px] border border-gray-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-950">Invoices</h3>
                            <p className="text-xs text-gray-500">Receipts and payment history live in Stripe.</p>
                          </div>
                        </div>
                        <button
                          onClick={handleManageBilling}
                          disabled={currentPlan === 'free' || billingAction !== null}
                          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-300"
                          aria-label="Open Stripe invoices"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <PricingCard
                    planKey="free"
                    isCurrent={currentPlan === 'free'}
                    isDowngrade={false}
                    billingAction={billingAction}
                    onUpgrade={handleUpgrade}
                    onManageBilling={handleManageBilling}
                  />
                  {/* Pro */}
                  <PricingCard
                    planKey="pro"
                    isCurrent={currentPlan === 'pro'}
                    isDowngrade={currentPlan === 'studio'}
                    billingAction={billingAction}
                    onUpgrade={handleUpgrade}
                    onManageBilling={handleManageBilling}
                  />
                  {/* Studio */}
                  <PricingCard
                    planKey="studio"
                    isCurrent={currentPlan === 'studio'}
                    isDowngrade={false}
                    highlighted
                    billingAction={billingAction}
                    onUpgrade={handleUpgrade}
                    onManageBilling={handleManageBilling}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm sm:grid-cols-3">
                  <div className="flex items-center gap-3 px-2 py-1">
                    <Lock className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Secure checkout</p>
                      <p className="text-xs text-gray-500">Payments powered by Stripe.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-2 py-1">
                    <RefreshCcw className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Cancel anytime</p>
                      <p className="text-xs text-gray-500">No contracts or lock-ins.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-2 py-1">
                    <User className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Trusted by creators</p>
                      <p className="text-xs text-gray-500">Built for fast portfolio launches.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ── Pricing Card ──────────────────────────────────────────────────────────────
interface PricingCardProps {
  planKey: 'free' | 'pro' | 'studio';
  isCurrent: boolean;
  isDowngrade: boolean;
  highlighted?: boolean;
  billingAction: 'portal' | BillingPlan | null;
  onUpgrade: (planKey: BillingPlan) => void;
  onManageBilling: () => void;
}

function PricingCard({
  planKey,
  isCurrent,
  isDowngrade,
  highlighted = false,
  billingAction,
  onUpgrade,
  onManageBilling,
}: PricingCardProps) {
  const plan = PLANS[planKey];
  const isFree = planKey === 'free';
  const isStudio = planKey === 'studio';

  const features = isFree
    ? [
        '3 AI operations / month',
        '1 website',
        'HTML + Tailwind site generation',
        'Basic publishing controls',
        'BaseStack watermark included',
        'Community-tier access',
      ]
    : isStudio
    ? [
        '50 AI operations / month',
        'Unlimited websites',
        'Advanced portfolio analytics',
        'Advanced publishing controls',
        'Next.js, React, and Tailwind project export',
        'Remove BaseStack watermark',
        'Access to our fastest hosting servers',
        'Priority support',
        'Early access to new features',
      ]
    : [
        '20 AI operations / month',
        'Up to 5 websites',
        'Portfolio analytics dashboard',
        'Premium publishing controls',
        'Next.js, React, and Tailwind project export',
        'Remove BaseStack watermark',
        'Access to our fastest hosting servers',
        'Email support',
      ];

  const icon = isStudio ? (
    <Building2 className="h-5 w-5" />
  ) : isFree ? (
    <Box className="h-5 w-5" />
  ) : (
    <Zap className="h-5 w-5" />
  );
  const accentText = isStudio ? 'text-violet-600' : isFree ? 'text-gray-800' : 'text-indigo-600';
  const iconTile = isStudio ? 'bg-violet-50 text-violet-600' : isFree ? 'bg-gray-100 text-gray-800' : 'bg-indigo-50 text-indigo-600';
  const accentBg = isStudio ? 'bg-violet-600 hover:bg-violet-700' : isFree ? 'bg-gray-900 hover:bg-black' : 'bg-indigo-600 hover:bg-indigo-700';
  const cardTone = isCurrent
    ? isStudio
      ? 'border-violet-300 ring-1 ring-violet-300'
      : isFree
      ? 'border-gray-300 ring-1 ring-gray-300'
      : 'border-indigo-300 ring-1 ring-indigo-300'
    : highlighted
    ? 'border-violet-200'
    : 'border-gray-200';

  return (
    <div
      className={`relative flex min-h-[440px] flex-col rounded-[24px] border bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,0.055)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(15,23,42,0.09)] ${cardTone}`}
    >
      {isStudio && !isCurrent && (
        <div className="absolute right-5 top-5">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            <Sparkles className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute right-5 top-5">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Check className="h-3 w-3" />
            Current Plan
          </span>
        </div>
      )}

      <div className="mb-6">
        <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${iconTile}`}>
          {icon}
        </div>
        <h3 className="text-sm font-bold uppercase text-gray-900">{plan.label}</h3>
        <div className="mt-4 flex items-end gap-1">
          <span className="text-4xl font-bold leading-none text-gray-950">{plan.price}</span>
          <span className="pb-1 text-sm font-medium text-gray-500">{plan.period || '/ forever'}</span>
        </div>
        <p className="mt-2 min-h-[40px] text-sm leading-5 text-gray-500">
          {PLAN_DESCRIPTIONS[planKey]}
        </p>
      </div>

      <ul className="mb-7 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm leading-5 text-gray-700">
            <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${accentText}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {isCurrent ? (
          <button
            disabled
            className="w-full rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-400"
          >
            Current Plan
          </button>
        ) : isFree ? (
          <button
            disabled
            className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-500"
          >
            Included by default
          </button>
        ) : isDowngrade ? (
          <button
            onClick={onManageBilling}
            disabled={billingAction !== null}
            className="w-full rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            {billingAction === 'portal' ? 'Opening secure billing portal...' : 'Manage in billing portal'}
          </button>
        ) : (
          <button
            onClick={() => onUpgrade(planKey)}
            disabled={billingAction !== null}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-center text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${accentBg}`}
          >
            {billingAction === planKey ? 'Creating secure checkout session...' : `Upgrade to ${plan.label}`}
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </button>
        )}

        <p className="mt-3 text-center text-xs text-gray-400">
          Secure checkout via Stripe · Cancel anytime
        </p>
      </div>
    </div>
  );
}
