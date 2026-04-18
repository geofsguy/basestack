import { supabase } from '../supabaseClient';

export type BillingPlan = 'pro' | 'studio';

async function invokeBillingFunction(name: string, body: Record<string, unknown> = {}) {
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

  if (!data?.url) {
    throw new Error(data?.error || 'Billing request failed.');
  }

  return data as { url: string };
}

export async function createCheckoutSession(plan: BillingPlan) {
  return invokeBillingFunction('create-checkout-session', { plan });
}

export async function createBillingPortalSession() {
  return invokeBillingFunction('create-billing-portal-session');
}
