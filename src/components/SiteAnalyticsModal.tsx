import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight,
  BarChart3,
  Clock3,
  Compass,
  Eye,
  Globe,
  Laptop,
  Lock,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { SiteAnalytics, SiteAnalyticsBreakdownItem, SiteAnalyticsReferrer } from '../types';

interface SiteAnalyticsModalProps {
  open: boolean;
  page: {
    title: string | null;
    slug: string | null;
  } | null;
  hasPremiumAccess: boolean;
  analytics: SiteAnalytics | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onUpgrade: () => void;
}

function formatShortDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatLastSeen(dateValue: string | null) {
  if (!dateValue) return 'No traffic yet';
  return new Date(dateValue).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRecentVisit(dateValue: string) {
  if (!dateValue) return 'Unknown time';
  return new Date(dateValue).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function BreakdownList({
  title,
  subtitle,
  items,
  empty,
  kind = 'name',
}: {
  title: string;
  subtitle: string;
  items: Array<SiteAnalyticsBreakdownItem | SiteAnalyticsReferrer>;
  empty: string;
  kind?: 'name' | 'source';
}) {
  const total = items.reduce((sum, item) => sum + item.views, 0) || 1;

  return (
    <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-950">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 font-medium">{subtitle}</p>
      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-sm font-medium text-gray-400">
            {empty}
          </div>
        ) : (
          items.slice(0, 6).map((item) => {
            const label = kind === 'source' ? (item as SiteAnalyticsReferrer).source : (item as SiteAnalyticsBreakdownItem).name;
            const pct = Math.max((item.views / total) * 100, item.views > 0 ? 3 : 0);

            return (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-gray-800">{titleCase(label)}</span>
                  <span className="font-bold text-indigo-600">{item.views}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function SiteAnalyticsModal({
  open,
  page,
  hasPremiumAccess,
  analytics,
  loading,
  error,
  onClose,
  onUpgrade,
}: SiteAnalyticsModalProps) {
  const trend = analytics?.trend || [];
  const maxViews = Math.max(...trend.map((point) => point.views), 1);
  const referrers = analytics?.top_referrers || [];
  const sources = analytics?.top_sources?.length ? analytics.top_sources : referrers;
  const devices = analytics?.devices || [];
  const browsers = analytics?.browsers || [];
  const campaigns = analytics?.campaigns || [];
  const recentViews = analytics?.recent_views || [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-2 backdrop-blur-md sm:p-4 lg:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/95 shadow-[0_40px_120px_-24px_rgba(0,0,0,0.35)] ring-1 ring-black/5 backdrop-blur-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-[2.25rem]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Subtle background noise/grid */}
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-all hover:scale-110 hover:border-gray-300 hover:text-gray-900 sm:right-6 sm:top-6"
              aria-label="Close analytics"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-5 py-6 [scrollbar-gutter:stable] sm:p-8 lg:p-12">
              <div className="mb-8 max-w-3xl pr-12 sm:mb-10">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-inset ring-gray-200/80 px-3 py-1.5 shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                    <BarChart3 className="h-3 w-3 text-indigo-600" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-700">
                    Site Intelligence
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-950 mb-3">
                  {page?.title || 'Untitled Site'}
                </h2>
                <p className="text-base text-gray-500 font-medium">
                  {page?.slug ? `Analyzing traffic for /s/${page.slug}` : 'Performance overview for this published site'}
                </p>
              </div>

              {!hasPremiumAccess ? (
                <div className="relative overflow-hidden rounded-[2rem] bg-gray-950 p-8 sm:p-12 text-center text-white shadow-2xl">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/30 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-xl">
                      <Lock className="h-6 w-6 text-indigo-300" />
                    </div>
                    <h3 className="mb-4 text-3xl font-semibold tracking-tight text-white">
                      Unlock Deep Insights
                    </h3>
                    <p className="mb-8 text-base leading-relaxed text-gray-400">
                      Upgrade to Studio or Pro to see exactly who's visiting your site, where they're coming from, and how your traffic trends over time. 
                    </p>
                    
                    <div className="mb-10 grid w-full gap-3 sm:grid-cols-3">
                      {[
                        { label: 'Real-time Views', icon: Eye },
                        { label: 'Unique Visitors', icon: Users },
                        { label: 'Traffic Sources', icon: ArrowUpRight },
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 rounded-2xl bg-white/5 border border-white/10 p-4 transition-colors hover:bg-white/10">
                          <item.icon className="w-5 h-5 text-indigo-400" />
                          <span className="text-xs font-medium text-gray-300">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={onUpgrade}
                      className="group relative flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-gray-950 transition-all hover:scale-105 hover:bg-gray-100 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Upgrade to Premium
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex h-80 items-center justify-center rounded-[2rem] border border-gray-100 bg-gray-50/50">
                  <div className="text-center flex flex-col items-center gap-4">
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
                      <div className="absolute inset-0 rounded-full border-t-2 border-indigo-600 animate-spin" />
                    </div>
                    <p className="text-sm font-medium tracking-wide text-gray-500 uppercase">Analyzing traffic...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-80 rounded-[2rem] border border-red-100 bg-red-50/50 px-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                    <X className="w-6 h-6" />
                  </div>
                  <p className="text-base font-medium text-red-900 mb-2">Failed to load analytics</p>
                  <p className="text-sm text-red-600 max-w-sm">{error}</p>
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  {/* Stats Row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
                    {[
                      { label: 'Total Views', value: analytics?.total_views ?? 0, icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' },
                      { label: 'Unique Visitors', value: analytics?.unique_visitors ?? 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' },
                      { label: 'Last 7 Days', value: analytics?.views_last_7_days ?? 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
                      { label: 'Latest Visit', value: formatLastSeen(analytics?.last_viewed_at ?? null), icon: Globe, color: 'text-sky-600', bg: 'bg-sky-50', ring: 'ring-sky-100', isDate: true },
                    ].map((stat, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={stat.label} 
                        className="group relative overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                      >
                        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} ${stat.color} ring-1 ring-inset ${stat.ring}`}>
                          <stat.icon className="h-5 w-5" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 mb-1">
                          {stat.isDate ? <span className="text-[13px] font-semibold tracking-normal leading-tight block h-8 flex items-center">{stat.value}</span> : stat.value}
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
                          {stat.label}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                    {[
                      { label: '30d Views', value: analytics?.views_last_30_days ?? 0, icon: Clock3 },
                      { label: 'Daily Avg', value: analytics?.average_daily_views ?? 0, icon: BarChart3 },
                      { label: 'Returning', value: analytics?.returning_visitors ?? 0, icon: Users },
                      { label: 'Direct', value: analytics?.direct_views ?? 0, icon: Compass },
                      { label: 'Social', value: analytics?.social_views ?? 0, icon: Share2 },
                      { label: 'Search', value: analytics?.search_views ?? 0, icon: Search },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-400">
                          <stat.icon className="h-4 w-4" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{stat.label}</span>
                        </div>
                        <p className="text-xl font-bold tracking-tight text-gray-950">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
                    {/* Chart Area */}
                    <div className="rounded-[2rem] border border-gray-100 bg-white p-6 sm:p-8 shadow-sm relative group overflow-hidden">
                      <div className="mb-8 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-950">Traffic Trend</h3>
                          <p className="text-sm text-gray-500 font-medium">Daily views over the last 30 days</p>
                        </div>
                      </div>

                      {trend.length === 0 || trend.every((point) => point.views === 0) ? (
                        <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                          <p className="text-sm text-gray-400 font-medium tracking-wide">No visits recorded yet</p>
                        </div>
                      ) : (
                        <div className="flex h-[200px] items-end gap-1.5 sm:gap-2.5">
                          {trend.map((point, index) => (
                            <div key={point.date} className="group/bar relative flex flex-1 flex-col items-center justify-end h-full">
                              <div className="absolute -top-10 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-xl pointer-events-none">
                                {point.views} views
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                              <div
                                className="w-full rounded-t-[4px] bg-indigo-500/20 group-hover/bar:bg-indigo-500 transition-all duration-300 relative overflow-hidden"
                                style={{
                                  height: `${Math.max((point.views / maxViews) * 100, point.views > 0 ? 4 : 0)}%`,
                                  minHeight: point.views > 0 ? '8px' : '0px',
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-indigo-400/50" />
                              </div>
                              <div className="mt-3 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap opacity-50 group-hover/bar:opacity-100 transition-opacity">
                                {formatShortDate(point.date).split(' ')[1]}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Referrers */}
                    <div className="rounded-[2rem] border border-gray-100 bg-white p-6 sm:p-8 shadow-sm flex flex-col">
                      <h3 className="text-lg font-bold text-gray-950">Top Sources</h3>
                      <p className="mt-1 text-sm text-gray-500 font-medium">UTM, social, search, and referral origin</p>

                      <div className="mt-6 flex-1 flex flex-col gap-3">
                        {sources.length === 0 ? (
                          <div className="flex-1 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center p-6 text-center">
                            <ArrowUpRight className="w-6 h-6 text-gray-300 mb-2" />
                            <p className="text-sm font-medium text-gray-400">Traffic will appear here soon.</p>
                          </div>
                        ) : (
                          sources.map((item, idx) => (
                            <div key={item.source} className="group flex items-center justify-between gap-4 rounded-2xl bg-gray-50 hover:bg-indigo-50/50 p-4 transition-colors border border-transparent hover:border-indigo-100">
                              <div className="min-w-0 flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:text-indigo-600">
                                  {idx + 1}
                                </div>
                                <div>
                                  <div className="truncate text-sm font-bold text-gray-900">{item.source}</div>
                                  <div className="text-[10px] uppercase tracking-[0.1em] text-gray-400 font-semibold mt-0.5">
                                    Source
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm font-bold text-indigo-600 bg-white shadow-sm border border-indigo-100 px-3 py-1 rounded-full">
                                {item.views}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-3">
                    <BreakdownList
                      title="Devices"
                      subtitle="Desktop, mobile, tablet, and bot split"
                      items={devices}
                      empty="Device data will appear after new visits."
                    />
                    <BreakdownList
                      title="Browsers"
                      subtitle="Browser family detected from visitors"
                      items={browsers}
                      empty="Browser data will appear after new visits."
                    />
                    <BreakdownList
                      title="Campaigns"
                      subtitle="UTM campaign performance"
                      items={campaigns}
                      empty="No campaign-tagged visits yet."
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <BreakdownList
                      title="Referrers"
                      subtitle="Exact referring domains"
                      items={referrers}
                      empty="Referring domains will appear here soon."
                      kind="source"
                    />
                    <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-950">Recent Visits</h3>
                      <p className="mt-1 text-sm text-gray-500 font-medium">Latest recorded sessions with detected context</p>
                      <div className="mt-6 space-y-3">
                        {recentViews.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-sm font-medium text-gray-400">
                            Recent visits will appear after traffic is recorded.
                          </div>
                        ) : (
                          recentViews.map((visit, index) => (
                            <div key={`${visit.viewed_at}-${index}`} className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 p-4">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-gray-900">{titleCase(visit.source)}</p>
                                <p className="mt-1 text-xs font-medium text-gray-500">
                                  {titleCase(visit.device_type)} · {visit.browser} · {visit.os}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-gray-400">
                                {visit.device_type === 'mobile' ? <Globe className="h-3.5 w-3.5" /> : <Laptop className="h-3.5 w-3.5" />}
                                {formatRecentVisit(visit.viewed_at)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
