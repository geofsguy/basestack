import { AutoMaintainMode, AutoMaintainScope, AutoMaintainTriggerRules } from '../types';

export const AUTO_MAINTAIN_SCOPE_OPTIONS: {
  value: AutoMaintainScope;
  label: string;
  description: string;
}[] = [
  {
    value: 'bio_intro',
    label: 'Bio and intro text',
    description: 'Refresh hero copy when your profile, role, or availability changes.',
  },
  {
    value: 'featured_projects',
    label: 'Featured projects',
    description: 'Swap in stronger featured work as your best projects evolve.',
  },
  {
    value: 'portfolio_updates',
    label: 'Portfolio updates',
    description: 'Keep project cards, statuses, and highlights aligned with your latest work.',
  },
  {
    value: 'testimonials',
    label: 'Testimonial sections',
    description: 'Add or refine social proof when new quotes become available.',
  },
  {
    value: 'blog_news',
    label: 'Blog/news updates',
    description: 'Surface fresh articles, announcements, and recent milestones.',
  },
  {
    value: 'seo_metadata',
    label: 'SEO metadata',
    description: 'Tune titles, descriptions, and structured content when search intent shifts.',
  },
  {
    value: 'design_refresh',
    label: 'Design refresh suggestions',
    description: 'Propose tasteful visual improvements when the site starts to feel stale.',
  },
  {
    value: 'call_to_action',
    label: 'Call-to-action copy',
    description: 'Improve conversion copy when your goals or offers change.',
  },
];

export const AUTO_MAINTAIN_MODE_OPTIONS: {
  value: AutoMaintainMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'suggest_only',
    label: 'Suggest only',
    description: 'AI drafts changes for review and nothing goes live until you approve it.',
  },
  {
    value: 'smart_approve',
    label: 'Smart approve',
    description: 'Low-risk updates can publish automatically while bigger edits wait for approval.',
  },
  {
    value: 'fully_automatic',
    label: 'Fully automatic',
    description: 'AI updates the site on its own as long as the changes stay inside your boundaries.',
  },
];

export const DEFAULT_AUTO_MAINTAIN_TRIGGER_RULES: AutoMaintainTriggerRules = {
  profile_updates: true,
  project_changes: true,
  testimonial_changes: true,
  blog_news_changes: true,
  seo_drift: true,
  design_review_window: true,
};

export const AUTO_MAINTAIN_TRIGGER_ITEMS: {
  key: keyof AutoMaintainTriggerRules;
  label: string;
  description: string;
}[] = [
  {
    key: 'profile_updates',
    label: 'Profile and bio changes',
    description: 'Runs when your Data Tree identity, bio, or availability fields change.',
  },
  {
    key: 'project_changes',
    label: 'Project and portfolio changes',
    description: 'Runs when project entries are added, updated, archived, or promoted.',
  },
  {
    key: 'testimonial_changes',
    label: 'New proof and testimonials',
    description: 'Runs when new social proof appears in the sections you allow.',
  },
  {
    key: 'blog_news_changes',
    label: 'News and content freshness',
    description: 'Runs when blog or update sections have fresh content to incorporate.',
  },
  {
    key: 'seo_drift',
    label: 'SEO drift detection',
    description: 'Runs when metadata looks stale relative to the current page content.',
  },
  {
    key: 'design_review_window',
    label: 'Scheduled design review',
    description: 'Runs a periodic design-health pass for suggestions instead of random edits.',
  },
];

export function getAutoMaintainModeLabel(mode: AutoMaintainMode) {
  return AUTO_MAINTAIN_MODE_OPTIONS.find((option) => option.value === mode)?.label || 'Suggest only';
}

export function getAutoMaintainScopeLabel(scope: AutoMaintainScope) {
  return AUTO_MAINTAIN_SCOPE_OPTIONS.find((option) => option.value === scope)?.label || scope;
}

export function summarizeAutoMaintainScopes(scopes: AutoMaintainScope[]) {
  if (scopes.length === 0) return 'No sections selected';
  if (scopes.length === 1) return getAutoMaintainScopeLabel(scopes[0]);
  if (scopes.length === AUTO_MAINTAIN_SCOPE_OPTIONS.length) return 'All approved sections';
  return `${scopes.length} approved sections`;
}
