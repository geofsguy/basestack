import { corsHeaders } from '../_shared/cors.ts';
import {
  getBillingRowByUserId,
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

function getReturnUrl(req: Request) {
  const configuredUrl = Deno.env.get('APP_URL')?.trim();
  if (configuredUrl) {
    return `${configuredUrl.replace(/\/$/, '')}/settings?portal=returned`;
  }

  const origin = req.headers.get('origin');
  if (origin) {
    return `${origin.replace(/\/$/, '')}/settings?portal=returned`;
  }

  return 'http://localhost:3000/settings?portal=returned';
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

    const existing = await getBillingRowByUserId(userData.user.id);
    if (!existing?.stripe_customer_id) {
      return json({ error: 'No Stripe customer record exists for this account yet.' }, 400);
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: existing.stripe_customer_id,
      return_url: getReturnUrl(req),
    });

    return json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create billing portal session.';
    return json({ error: message }, 500);
  }
});
