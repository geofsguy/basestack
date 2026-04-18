import { corsHeaders } from '../_shared/cors.ts';
import {
  PaidPlanKey,
  ensureStripeCustomer,
  getBillingRowByUserId,
  getPlanPriceId,
  getStripe,
  getUserSupabase,
} from '../_shared/stripe.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getBaseUrl(req: Request) {
  const configuredUrl = Deno.env.get('APP_URL')?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  const origin = req.headers.get('origin');
  if (origin) {
    return origin.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Authentication is required.' }, 401);
    }

    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!accessToken) {
      return json({ error: 'Authentication token is missing or malformed.' }, 401);
    }

    const supabase = getUserSupabase(authHeader);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return json({ error: 'Your session is invalid or expired.' }, 401);
    }

    const { plan } = await req.json() as { plan?: PaidPlanKey };
    if (plan !== 'pro' && plan !== 'studio') {
      return json({ error: 'Please choose a valid plan.' }, 400);
    }

    const existing = await getBillingRowByUserId(userData.user.id);
    if (existing?.stripe_subscription_id && existing.subscription_status && !['canceled', 'incomplete_expired'].includes(existing.subscription_status)) {
      return json({ error: 'You already have a subscription. Use the billing portal to change or cancel it.' }, 409);
    }

    const customerId = await ensureStripeCustomer({
      id: userData.user.id,
      email: userData.user.email,
    });

    const baseUrl = getBaseUrl(req);
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      allow_promotion_codes: true,
      client_reference_id: userData.user.id,
      line_items: [
        {
          price: getPlanPriceId(plan),
          quantity: 1,
        },
      ],
      metadata: {
        supabase_user_id: userData.user.id,
        requested_plan: plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userData.user.id,
          requested_plan: plan,
        },
      },
      success_url: `${baseUrl}/settings?checkout=success&plan=${plan}`,
      cancel_url: `${baseUrl}/settings?checkout=canceled`,
    });

    if (!session.url) {
      throw new Error('Stripe Checkout did not return a redirect URL.');
    }

    return json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create checkout session.';
    return json({ error: message }, 500);
  }
});
