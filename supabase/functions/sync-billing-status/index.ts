import { corsHeaders } from '../_shared/cors.ts';
import { getUserSupabase, syncBillingRecordForUser } from '../_shared/stripe.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
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

    const record = await syncBillingRecordForUser(userData.user.id);

    return json({
      ok: true,
      subscription_status: record?.subscription_status ?? null,
      cancel_at_period_end: record?.cancel_at_period_end ?? false,
      current_period_end: record?.current_period_end ?? null,
      tier: record?.tier ?? 'free',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync billing status.';
    return json({ error: message }, 500);
  }
});
