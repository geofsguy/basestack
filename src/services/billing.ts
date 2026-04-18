import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase as supabaseClient } from '../supabaseClient';

export type BillingPlan = 'pro' | 'studio';

export class BillingFunctionError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'BillingFunctionError';
    this.status = status;
  }
}

async function normalizeBillingError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    const status = response?.status;
    let message = `Billing request failed${status ? ` (${status})` : ''}.`;

    if (response) {
      try {
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          const payload = await response.clone().json();
          if (typeof payload?.error === 'string' && payload.error.trim()) {
            message = payload.error;
          }
        } else {
          const text = await response.clone().text();
          if (text.trim()) {
            message = text.trim();
          }
        }
      } catch {
        // Fall back to the generic message above if the response body is unreadable.
      }
    }

    return new BillingFunctionError(message, status);
  }

  if (error instanceof Error) {
    return new BillingFunctionError(error.message);
  }

  return new BillingFunctionError('Billing request failed.');
}

async function invokeBillingFunction<T>(name: string, body: Record<string, unknown> = {}) {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to manage billing.');
  }

  const { data, error } = await supabaseClient.functions.invoke(name, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw await normalizeBillingError(error);
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
