import { supabase } from '../supabaseClient';

export type BillingPlan = 'pro' | 'studio';

async function invokeBillingFunction<T>(name: string, body: Record<string, unknown> = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to manage billing.');
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Billing request failed.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export async function createCheckoutSession(plan: BillingPlan) {
  const data = await invokeBillingFunction<{ url?: string }>('create-checkout-session', { plan });
  if (!data?.url) {
    throw new Error('Billing request failed.');
  }
  return { url: data.url };
}

export async function createBillingPortalSession() {
  const data = await invokeBillingFunction<{ url?: string }>('create-billing-portal-session');
  if (!data?.url) {
    throw new Error('Billing request failed.');
  }
  return { url: data.url };
}

export async function syncBillingStatus() {
  return invokeBillingFunction<{
    ok: boolean;
    subscription_status: string | null;
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    tier: string;
  }>('sync-billing-status');
}
