import { supabase } from '../supabaseClient';
import { DEFAULT_AUTO_MAINTAIN_TRIGGER_RULES } from '../lib/autoMaintain';
import { AutoMaintainScope, SiteAutoMaintainSettings } from '../types';

type SiteAutoMaintainRow = {
  page_id: string;
  user_id: string;
  enabled: boolean;
  allowed_scopes: string[] | null;
  maintenance_mode: string;
  trigger_rules: Record<string, boolean> | null;
  last_evaluated_at: string | null;
  last_applied_at: string | null;
  created_at: string;
  updated_at: string;
};

function isAutoMaintainScope(value: string): value is AutoMaintainScope {
  return [
    'bio_intro',
    'featured_projects',
    'portfolio_updates',
    'testimonials',
    'blog_news',
    'seo_metadata',
    'design_refresh',
    'call_to_action',
  ].includes(value);
}

function isMissingTableError(error: { message?: string; details?: string; code?: string } | null | undefined) {
  const combined = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return error?.code === '42P01' || combined.includes('relation') && combined.includes('does not exist');
}

function mapSiteAutoMaintainRow(row: SiteAutoMaintainRow): SiteAutoMaintainSettings {
  return {
    page_id: row.page_id,
    user_id: row.user_id,
    enabled: Boolean(row.enabled),
    allowed_scopes: Array.isArray(row.allowed_scopes) ? row.allowed_scopes.filter(isAutoMaintainScope) : [],
    maintenance_mode: row.maintenance_mode === 'fully_automatic'
      ? 'fully_automatic'
      : row.maintenance_mode === 'smart_approve'
      ? 'smart_approve'
      : 'suggest_only',
    trigger_rules: {
      ...DEFAULT_AUTO_MAINTAIN_TRIGGER_RULES,
      ...(row.trigger_rules || {}),
    },
    last_evaluated_at: row.last_evaluated_at,
    last_applied_at: row.last_applied_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchAutoMaintainSettings(pageIds: string[]) {
  if (pageIds.length === 0) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to manage Auto-Maintain.');
  }

  const { data, error } = await supabase
    .from('site_auto_maintain_settings')
    .select('page_id, user_id, enabled, allowed_scopes, maintenance_mode, trigger_rules, last_evaluated_at, last_applied_at, created_at, updated_at')
    .eq('user_id', user.id)
    .in('page_id', pageIds);

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }

  return ((data as SiteAutoMaintainRow[] | null) || []).map(mapSiteAutoMaintainRow);
}

export async function saveAutoMaintainSettings(
  payload: Pick<SiteAutoMaintainSettings, 'page_id' | 'enabled' | 'allowed_scopes' | 'maintenance_mode' | 'trigger_rules'>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to manage Auto-Maintain.');
  }

  const { data, error } = await supabase
    .from('site_auto_maintain_settings')
    .upsert(
      {
        page_id: payload.page_id,
        user_id: user.id,
        enabled: payload.enabled,
        allowed_scopes: payload.allowed_scopes,
        maintenance_mode: payload.maintenance_mode,
        trigger_rules: payload.trigger_rules,
      },
      { onConflict: 'page_id' },
    )
    .select('page_id, user_id, enabled, allowed_scopes, maintenance_mode, trigger_rules, last_evaluated_at, last_applied_at, created_at, updated_at')
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error('Auto-Maintain is not available yet because the latest Supabase migration has not been applied.');
    }
    throw error;
  }

  return mapSiteAutoMaintainRow(data as SiteAutoMaintainRow);
}
