export type SubscriptionTier = 'free' | 'pro' | 'studio';

export function normalizeTier(value: string | null | undefined): SubscriptionTier {
  const normalized = String(value || 'free').toLowerCase();
  if (normalized === 'studio') return 'studio';
  if (normalized === 'pro') return 'pro';
  return 'free';
}

export function isPremiumTier(value: string | null | undefined): boolean {
  const tier = normalizeTier(value);
  return tier === 'pro' || tier === 'studio';
}
