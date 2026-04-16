import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { User, CreditCard, ArrowLeft, LogOut, Check, Zap, Building2, Sparkles, ExternalLink } from 'lucide-react';
import Logo from './Logo';

// ── Stripe Config ─────────────────────────────────────────────────────────────
const PRO_PAYMENT_LINK =
  import.meta.env.VITE_STRIPE_PRO_PAYMENT_LINK ||
  'https://buy.stripe.com/test_8x2dRa1rB7PX9Rl4dXbbG08';
const STUDIO_PAYMENT_LINK =
  import.meta.env.VITE_STRIPE_STUDIO_PAYMENT_LINK ||
  'https://buy.stripe.com/test_8x24gAgmv1rzbZtaClbbG09';

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
    paymentLink: PRO_PAYMENT_LINK,
  },
  studio: {
    label: 'Studio',
    aiLimit: 50,
    siteLimit: Infinity,
    price: '$29',
    period: '/month',
    color: 'violet',
    paymentLink: STUDIO_PAYMENT_LINK,
  },
} as const;

type PlanKey = keyof typeof PLANS;

// ── Usage bar ─────────────────────────────────────────────────────────────────
function UsageBar({ used, limit, label }: { used: number; limit: number | typeof Infinity; label: string }) {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const nearLimit = pct >= 80;
  const atLimit = pct >= 100;

  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {used} / {isUnlimited ? '∞' : limit} used
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        {isUnlimited ? (
          <div className="h-2 w-0 rounded-full" />
        ) : (
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-400' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {atLimit && !isUnlimited && (
        <p className="mt-2 text-xs text-red-600 font-medium">
          Limit reached — upgrade to continue.
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

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');
  const [user, setUser] = useState<any>(null);
  const [usage, setUsage] = useState<{ message_count: number; tier: string; site_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUser(user);
      const { data, error } = await supabase.rpc('get_usage');
      if (!error) setUsage(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Derive current plan key from Supabase tier string
  const tierRaw = (usage?.tier || 'free').toLowerCase();
  const currentPlan: PlanKey = tierRaw === 'studio' ? 'studio' : tierRaw === 'pro' ? 'pro' : 'free';
  const plan = PLANS[currentPlan];
  const planStyle = PLAN_STYLES[currentPlan];

  const messagesUsed = usage?.message_count ?? 0;
  const sitesUsed = usage?.site_count ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] font-sans">
      {/* Dot grid */}
      <div
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
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

        <div className="flex flex-col md:flex-row gap-8">
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
          <main className="flex-1">
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
              <div className="space-y-6">

                {/* Current plan status card */}
                <div className={`bg-white border-2 ${planStyle.ring} rounded-3xl p-6 shadow-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-gray-900">
                        Current Plan
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">Your active subscription and usage</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${planStyle.badge}`}>
                      {planStyle.icon}
                      {plan.label}
                    </span>
                  </div>

                  <div className="space-y-5 mt-6">
                    <UsageBar
                      label="AI Operations"
                      used={messagesUsed}
                      limit={plan.aiLimit}
                    />
                    <UsageBar
                      label="Active Sites"
                      used={sitesUsed}
                      limit={plan.siteLimit}
                    />
                  </div>

                  {currentPlan !== 'free' && (
                    <p className="mt-5 text-xs text-gray-400">
                      To manage or cancel your subscription, visit the{' '}
                      <a href="https://billing.stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
                        Stripe billing portal
                      </a>
                      .
                    </p>
                  )}
                </div>

                {/* Pricing cards — hide card for current plan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Pro */}
                  <PricingCard
                    planKey="pro"
                    isCurrent={currentPlan === 'pro'}
                    isDowngrade={currentPlan === 'studio'}
                  />
                  {/* Studio */}
                  <PricingCard
                    planKey="studio"
                    isCurrent={currentPlan === 'studio'}
                    isDowngrade={false}
                    highlighted
                  />
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
  planKey: 'pro' | 'studio';
  isCurrent: boolean;
  isDowngrade: boolean;
  highlighted?: boolean;
}

function PricingCard({ planKey, isCurrent, isDowngrade, highlighted = false }: PricingCardProps) {
  const plan = PLANS[planKey];
  const isStudio = planKey === 'studio';

  const features = isStudio
    ? [
        '50 AI operations / month',
        'Unlimited websites',
        'Remove BaseStack watermark',
        'Priority support',
        'Early access to new features',
      ]
    : [
        '20 AI operations / month',
        'Up to 5 websites',
        'Remove BaseStack watermark',
        'Email support',
      ];

  const gradientClass = isStudio
    ? 'from-violet-600 to-purple-700'
    : 'from-indigo-600 to-blue-700';

  const accentText = isStudio ? 'text-violet-600' : 'text-indigo-600';
  const accentBg = isStudio ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700';
  const ringClass = isStudio ? 'ring-2 ring-violet-400 ring-offset-2' : 'ring-2 ring-indigo-300 ring-offset-2';

  return (
    <div
      className={`relative bg-white rounded-3xl overflow-hidden border transition-shadow hover:shadow-lg ${
        highlighted ? 'border-violet-200' : 'border-gray-200'
      } ${isCurrent ? ringClass : ''}`}
    >
      {/* Top gradient bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradientClass}`} />

      {/* Recommended badge */}
      {isStudio && !isCurrent && (
        <div className="absolute top-5 right-5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute top-5 right-5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
            <Check className="w-3 h-3" />
            Active
          </span>
        </div>
      )}

      <div className="p-7">
        {/* Plan name & price */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            {isStudio ? (
              <Building2 className={`w-5 h-5 ${accentText}`} />
            ) : (
              <Zap className={`w-5 h-5 ${accentText}`} />
            )}
            <span className={`text-sm font-semibold ${accentText} uppercase tracking-wide`}>
              {plan.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900 tracking-tight">{plan.price}</span>
            <span className="text-gray-400 text-sm">{plan.period}</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {isStudio ? 'For power users and agencies' : 'For individuals & small projects'}
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
              <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${accentText}`} />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isCurrent ? (
          <button
            disabled
            className="w-full py-3 px-6 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            Current Plan
          </button>
        ) : isDowngrade ? (
          <button
            disabled
            className="w-full py-3 px-6 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
            title="Manage via your billing portal"
          >
            Downgrade via billing portal
          </button>
        ) : (
          <a
            href={'paymentLink' in plan ? plan.paymentLink : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-3 px-6 rounded-xl text-sm font-semibold text-white text-center flex items-center justify-center gap-2 transition-colors ${accentBg}`}
          >
            Upgrade to {plan.label}
            <ExternalLink className="w-3.5 h-3.5 opacity-75" />
          </a>
        )}

        <p className="text-center text-xs text-gray-400 mt-3">
          Secure checkout via Stripe · Cancel anytime
        </p>
      </div>
    </div>
  );
}
