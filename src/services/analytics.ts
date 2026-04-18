import { supabase } from '../supabaseClient';
import { SiteAnalytics, SiteAnalyticsOverviewItem } from '../types';

const VISITOR_TOKEN_STORAGE_KEY = 'basestack.analytics.visitor-token';

function generateVisitorToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `visitor-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function getVisitorToken() {
  try {
    const existing = window.localStorage.getItem(VISITOR_TOKEN_STORAGE_KEY);
    if (existing) return existing;

    const created = generateVisitorToken();
    window.localStorage.setItem(VISITOR_TOKEN_STORAGE_KEY, created);
    return created;
  } catch {
    return generateVisitorToken();
  }
}

function getReferrerHost() {
  if (!document.referrer) return null;

  try {
    const referrerUrl = new URL(document.referrer);
    if (referrerUrl.host === window.location.host) {
      return null;
    }
    return referrerUrl.host.toLowerCase();
  } catch {
    return null;
  }
}

export async function trackPublishedPageView(pageSlug: string) {
  const trimmedSlug = pageSlug.trim();
  if (!trimmedSlug) return false;

  const { data, error } = await supabase.rpc('record_page_view', {
    input_page_slug: trimmedSlug,
    input_visitor_token: getVisitorToken(),
    input_referrer_host: getReferrerHost(),
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function fetchSiteAnalyticsOverview() {
  const { data, error } = await supabase.rpc('get_site_analytics_overview');
  if (error) {
    throw error;
  }

  return ((data as SiteAnalyticsOverviewItem[] | null) || []).map((item) => ({
    ...item,
    total_views: Number(item.total_views || 0),
    unique_visitors: Number(item.unique_visitors || 0),
    views_last_7_days: Number(item.views_last_7_days || 0),
  }));
}

export async function fetchSiteAnalytics(pageId: string) {
  const { data, error } = await supabase.rpc('get_site_analytics', {
    input_page_id: pageId,
  });

  if (error) {
    throw error;
  }

  const analytics = (data || {}) as SiteAnalytics;
  return {
    ...analytics,
    total_views: Number(analytics.total_views || 0),
    unique_visitors: Number(analytics.unique_visitors || 0),
    views_last_7_days: Number(analytics.views_last_7_days || 0),
    trend: Array.isArray(analytics.trend)
      ? analytics.trend.map((point) => ({
          date: String(point.date),
          views: Number(point.views || 0),
        }))
      : [],
    top_referrers: Array.isArray(analytics.top_referrers)
      ? analytics.top_referrers.map((item) => ({
          source: String(item.source || 'Direct'),
          views: Number(item.views || 0),
        }))
      : [],
  };
}
