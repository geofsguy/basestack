import Stripe from 'npm:stripe@22.0.2';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripeApiVersion = '2026-03-25.dahlia';

export type PaidPlanKey = 'pro' | 'studio';
export type SubscriptionTier = 'free' | PaidPlanKey;

type BillingRow = {
  user_id: string;
  tier: SubscriptionTier;
  message_count?: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
};

export function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function getSupabaseUrl() {
  return getRequiredEnv('SUPABASE_URL');
}

export function getSupabaseAnonKey() {
  return getRequiredEnv('SUPABASE_ANON_KEY');
}

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
      apiVersion: stripeApiVersion,
    });
  }
  return stripeClient;
}

export function getAdminSupabase() {
  return createClient(getSupabaseUrl(), getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getUserSupabase(authHeader: string) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getPlanPriceId(plan: PaidPlanKey) {
  return getRequiredEnv(plan === 'pro' ? 'STRIPE_PRO_PRICE_ID' : 'STRIPE_STUDIO_PRICE_ID');
}

export function getTierForPriceId(priceId: string | null): SubscriptionTier {
  if (!priceId) return 'free';
  if (priceId === Deno.env.get('STRIPE_PRO_PRICE_ID')) return 'pro';
  if (priceId === Deno.env.get('STRIPE_STUDIO_PRICE_ID')) return 'studio';
  return 'free';
}

export function getGrantedTier(status: string, priceId: string | null): SubscriptionTier {
  const paidTier = getTierForPriceId(priceId);
  if (paidTier === 'free') return 'free';
  return ['active', 'trialing', 'past_due'].includes(status) ? paidTier : 'free';
}

function getPrimaryPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null;
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return (subscription as Stripe.Subscription & { current_period_end?: number | null }).current_period_end ?? null;
}

function unixToIso(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export async function getBillingRowByUserId(userId: string) {
  const { data, error } = await getAdminSupabase()
    .from('user_subscriptions')
    .select('user_id, tier, message_count, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as BillingRow | null;
}

async function getBillingRowByCustomerId(customerId: string) {
  const { data, error } = await getAdminSupabase()
    .from('user_subscriptions')
    .select('user_id, tier, message_count, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, current_period_end, cancel_at_period_end')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (error) throw error;
  return data as BillingRow | null;
}

async function upsertBillingRow(userId: string, patch: Partial<BillingRow>) {
  const { error } = await getAdminSupabase()
    .from('user_subscriptions')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });

  if (error) throw error;
}

export async function ensureStripeCustomer(user: { id: string; email?: string | null }) {
  const existing = await getBillingRowByUserId(user.id);
  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const customer = await getStripe().customers.create({
    email: user.email || undefined,
    metadata: {
      supabase_user_id: user.id,
    },
  });

  await upsertBillingRow(user.id, {
    stripe_customer_id: customer.id,
    tier: existing?.tier || 'free',
    subscription_status: existing?.subscription_status || 'inactive',
  });

  return customer.id;
}

async function resolveUserIdForCustomer(customerId: string) {
  const existing = await getBillingRowByCustomerId(customerId);
  if (existing?.user_id) {
    return existing.user_id;
  }

  const customer = await getStripe().customers.retrieve(customerId);
  const fullCustomer = customer as Stripe.Customer | Stripe.DeletedCustomer;
  if (!('deleted' in fullCustomer && fullCustomer.deleted)) {
    return (fullCustomer as Stripe.Customer).metadata.supabase_user_id || null;
  }

  return null;
}

export async function syncSubscriptionRecord(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const userId = await resolveUserIdForCustomer(customerId);

  if (!userId) {
    console.warn(`Skipping Stripe sync for customer ${customerId}: no mapped Supabase user.`);
    return;
  }

  const priceId = getPrimaryPriceId(subscription);
  const grantedTier = getGrantedTier(subscription.status, priceId);
  const existing = await getBillingRowByUserId(userId);
  const shouldResetUsage = grantedTier !== 'free' && existing?.tier !== grantedTier;

  await upsertBillingRow(userId, {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    subscription_status: subscription.status,
    current_period_end: unixToIso(getCurrentPeriodEnd(subscription)),
    cancel_at_period_end: subscription.cancel_at_period_end,
    tier: grantedTier,
    ...(shouldResetUsage ? { message_count: 0 } : {}),
  });
}

export async function clearSubscriptionRecord(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const userId = await resolveUserIdForCustomer(customerId);

  if (!userId) {
    console.warn(`Skipping Stripe cancellation sync for customer ${customerId}: no mapped Supabase user.`);
    return;
  }

  await upsertBillingRow(userId, {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: getPrimaryPriceId(subscription),
    subscription_status: subscription.status,
    current_period_end: unixToIso(getCurrentPeriodEnd(subscription)),
    cancel_at_period_end: false,
    tier: 'free',
  });
}
