import { supabase } from '../supabaseClient';
import { SiteAnalytics, SiteAnalyticsOverviewItem } from '../types';

const VISITOR_TOKEN_STORAGE_KEY = 'basestack.analytics.visitor-token';
const SEARCH_HOSTS = ['google.', 'bing.', 'duckduckgo.', 'yahoo.', 'baidu.', 'yandex.', 'ecosia.'];
const SOCIAL_HOSTS = ['linkedin.', 'twitter.', 'x.com', 'facebook.', 'instagram.', 'threads.', 't.co', 'reddit.', 'bsky.'];

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

function getReferrerUrl() {
  if (!document.referrer) return null;

  try {
    const referrerUrl = new URL(document.referrer);
    if (referrerUrl.host === window.location.host) {
      return null;
    }
    return referrerUrl.toString().slice(0, 500);
  } catch {
    return null;
  }
}

function getReferrerHost(referrerUrl: string | null) {
  if (!referrerUrl) return null;

  try {
    return new URL(referrerUrl).host.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function getSearchParam(name: string) {
  try {
    return new URLSearchParams(window.location.search).get(name)?.trim() || null;
  } catch {
    return null;
  }
}

function detectDeviceType(userAgent: string) {
  const agent = userAgent.toLowerCase();
  if (/(ipad|tablet|playbook|silk)|(android(?!.*mobi))/i.test(agent)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(agent)) return 'mobile';
  if (/bot|crawler|spider|crawling|headless/i.test(agent)) return 'bot';
  return 'desktop';
}

function detectBrowser(userAgent: string) {
  const browserPatterns: Array<[string, RegExp]> = [
    ['Edge', /(?:edg|edge)\/([\d.]+)/i],
    ['Samsung Internet', /samsungbrowser\/([\d.]+)/i],
    ['Opera', /(?:opr|opera)\/([\d.]+)/i],
    ['Chrome', /(?:chrome|crios)\/([\d.]+)/i],
    ['Firefox', /(?:firefox|fxios)\/([\d.]+)/i],
    ['Safari', /version\/([\d.]+).*safari/i],
  ];

  for (const [name, pattern] of browserPatterns) {
    const match = userAgent.match(pattern);
    if (match) {
      return { browser: name, browser_version: match[1]?.split('.').slice(0, 2).join('.') || null };
    }
  }

  return { browser: 'Unknown', browser_version: null };
}

function detectOs(userAgent: string) {
  if (/windows nt/i.test(userAgent)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  if (/mac os x/i.test(userAgent)) return 'macOS';
  if (/android/i.test(userAgent)) return 'Android';
  if (/linux/i.test(userAgent)) return 'Linux';
  return 'Unknown';
}

function inferSource(referrerHost: string | null, utmSource: string | null, utmMedium: string | null) {
  if (utmSource) return utmSource.toLowerCase();
  if (utmMedium?.toLowerCase() === 'email') return 'email';
  if (!referrerHost) return 'Direct';
  if (SEARCH_HOSTS.some((host) => referrerHost.includes(host))) return 'Organic Search';
  if (SOCIAL_HOSTS.some((host) => referrerHost.includes(host))) return 'Social';
  return referrerHost;
}

function buildAnalyticsContext(referrerUrl: string | null, referrerHost: string | null) {
  const userAgent = navigator.userAgent || '';
  const browser = detectBrowser(userAgent);
  const utmSource = getSearchParam('utm_source');
  const utmMedium = getSearchParam('utm_medium');

  return {
    referrer_url: referrerUrl,
    source: inferSource(referrerHost, utmSource, utmMedium),
    medium: utmMedium,
    campaign: getSearchParam('utm_campaign'),
    term: getSearchParam('utm_term'),
    content: getSearchParam('utm_content'),
    browser: browser.browser,
    browser_version: browser.browser_version,
    os: detectOs(userAgent),
    device_type: detectDeviceType(userAgent),
    viewport_width: window.innerWidth || null,
    viewport_height: window.innerHeight || null,
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  };
}

function isMissingRpcError(error: { message?: string; details?: string; code?: string } | null | undefined) {
  const combined = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return error?.code === 'PGRST202' || combined.includes('could not find the function') || combined.includes('404');
}

export async function trackPublishedPageView(pageSlug: string) {
  const trimmedSlug = pageSlug.trim();
  if (!trimmedSlug) return false;

  const referrerUrl = getReferrerUrl();
  const referrerHost = getReferrerHost(referrerUrl);
  const basePayload = {
    input_page_slug: trimmedSlug,
    input_visitor_token: getVisitorToken(),
    input_referrer_host: referrerHost,
  };

  let { data, error } = await supabase.rpc('record_page_view', {
    ...basePayload,
    input_context: buildAnalyticsContext(referrerUrl, referrerHost),
  });

  if (error && isMissingRpcError(error)) {
    const fallback = await supabase.rpc('record_page_view', basePayload);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (isMissingRpcError(error)) {
      return false;
    }
    throw error;
  }

  return Boolean(data);
}

export async function fetchSiteAnalyticsOverview() {
  const { data, error } = await supabase.rpc('get_site_analytics_overview');
  if (error) {
    if (isMissingRpcError(error)) {
      return [];
    }
    throw error;
  }

  return ((data as SiteAnalyticsOverviewItem[] | null) || []).map((item) => ({
    ...item,
    total_views: Number(item.total_views || 0),
    unique_visitors: Number(item.unique_visitors || 0),
    views_last_7_days: Number(item.views_last_7_days || 0),
    views_last_30_days: Number(item.views_last_30_days || 0),
  }));
}

export async function fetchSiteAnalytics(pageId: string) {
  const { data, error } = await supabase.rpc('get_site_analytics', {
    input_page_id: pageId,
  });

  if (error) {
    if (isMissingRpcError(error)) {
      throw new Error('Analytics is not available yet because the latest Supabase migration has not been applied.');
    }
    throw error;
  }

  const analytics = (data || {}) as SiteAnalytics;
  return {
    ...analytics,
    total_views: Number(analytics.total_views || 0),
    unique_visitors: Number(analytics.unique_visitors || 0),
    views_last_7_days: Number(analytics.views_last_7_days || 0),
    views_last_30_days: Number(analytics.views_last_30_days || 0),
    returning_visitors: Number(analytics.returning_visitors || 0),
    direct_views: Number(analytics.direct_views || 0),
    referral_views: Number(analytics.referral_views || 0),
    social_views: Number(analytics.social_views || 0),
    search_views: Number(analytics.search_views || 0),
    average_daily_views: Number(analytics.average_daily_views || 0),
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
    top_sources: Array.isArray(analytics.top_sources)
      ? analytics.top_sources.map((item) => ({
          source: String(item.source || 'Direct'),
          views: Number(item.views || 0),
        }))
      : [],
    devices: Array.isArray(analytics.devices)
      ? analytics.devices.map((item) => ({
          name: String(item.name || 'Unknown'),
          views: Number(item.views || 0),
        }))
      : [],
    browsers: Array.isArray(analytics.browsers)
      ? analytics.browsers.map((item) => ({
          name: String(item.name || 'Unknown'),
          views: Number(item.views || 0),
        }))
      : [],
    operating_systems: Array.isArray(analytics.operating_systems)
      ? analytics.operating_systems.map((item) => ({
          name: String(item.name || 'Unknown'),
          views: Number(item.views || 0),
        }))
      : [],
    campaigns: Array.isArray(analytics.campaigns)
      ? analytics.campaigns.map((item) => ({
          name: String(item.name || 'Unattributed'),
          views: Number(item.views || 0),
        }))
      : [],
    recent_views: Array.isArray(analytics.recent_views)
      ? analytics.recent_views.map((item) => ({
          viewed_at: String(item.viewed_at || ''),
          source: String(item.source || 'Direct'),
          device_type: String(item.device_type || 'Unknown'),
          browser: String(item.browser || 'Unknown'),
          os: String(item.os || 'Unknown'),
        }))
      : [],
  };
}
