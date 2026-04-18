import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, Eye, Globe, Lock, TrendingUp, Users, X } from 'lucide-react';
import { SiteAnalytics } from '../types';

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-[0_30px_120px_rgba(0,0,0,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />

            <div className="relative z-10 p-8">
              <button
                onClick={onClose}
                className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close analytics"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Site Analytics
                </div>
                <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-gray-900">
                  {page?.title || 'Untitled Site'}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {page?.slug ? `Performance for /s/${page.slug}` : 'Performance for this published site'}
                </p>
              </div>

              {!hasPremiumAccess ? (
                <div className="rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-8">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
                    Analytics is a Premium feature
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-600">
                    Upgrade to Pro or Studio to see visits, unique visitors, traffic trends, and referral sources for your live portfolio site.
                  </p>
                  <div className="mt-6 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
                    {['Track total views', 'See unique visitors', 'Understand traffic sources'].map((item) => (
                      <div key={item} className="rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-7">
                    <button
                      onClick={onUpgrade}
                      className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                    >
                      Upgrade to unlock analytics
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex h-72 items-center justify-center rounded-[1.75rem] border border-gray-100 bg-gray-50">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-black" />
                    <p className="text-sm font-medium text-gray-600">Loading site analytics...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-[1.75rem] border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-700">
                  {error}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    {[
                      {
                        label: 'Total Views',
                        value: analytics?.total_views ?? 0,
                        icon: Eye,
                        color: 'text-gray-900',
                      },
                      {
                        label: 'Unique Visitors',
                        value: analytics?.unique_visitors ?? 0,
                        icon: Users,
                        color: 'text-indigo-700',
                      },
                      {
                        label: 'Last 7 Days',
                        value: analytics?.views_last_7_days ?? 0,
                        icon: TrendingUp,
                        color: 'text-emerald-600',
                      },
                      {
                        label: 'Latest Visit',
                        value: formatLastSeen(analytics?.last_viewed_at ?? null),
                        icon: Globe,
                        color: 'text-sky-700',
                      },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="rounded-[1.5rem] border border-gray-100 bg-white px-5 py-4 shadow-sm">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <div className={`text-2xl font-semibold tracking-tight ${color}`}>
                          {typeof value === 'number' ? value : <span className="text-base leading-tight">{value}</span>}
                        </div>
                        <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
                    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6 shadow-sm">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Traffic Trend</h3>
                          <p className="text-sm text-gray-500">Daily views over the last 14 days</p>
                        </div>
                        <div className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500">
                          14-day view
                        </div>
                      </div>

                      {trend.length === 0 || trend.every((point) => point.views === 0) ? (
                        <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
                          No visits have been recorded yet.
                        </div>
                      ) : (
                        <div className="flex h-48 items-end gap-2">
                          {trend.map((point) => (
                            <div key={point.date} className="flex flex-1 flex-col items-center justify-end gap-2">
                              <div className="text-[10px] font-medium text-gray-300">{point.views}</div>
                              <div
                                className="w-full rounded-t-full bg-gradient-to-t from-indigo-600 to-sky-400"
                                style={{
                                  height: `${Math.max((point.views / maxViews) * 100, point.views > 0 ? 8 : 0)}%`,
                                  minHeight: point.views > 0 ? '8px' : '0px',
                                }}
                              />
                              <div className="text-[10px] text-gray-400">
                                {formatShortDate(point.date)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900">Top Referrers</h3>
                      <p className="mt-1 text-sm text-gray-500">Where visitors are arriving from</p>

                      <div className="mt-5 space-y-3">
                        {referrers.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                            Traffic will appear here once people start visiting your site.
                          </div>
                        ) : (
                          referrers.map((item) => (
                            <div key={item.source} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-gray-800">{item.source}</div>
                                  <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gray-400">
                                    Referral source
                                  </div>
                                </div>
                                <div className="text-sm font-semibold text-gray-900">{item.views}</div>
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
