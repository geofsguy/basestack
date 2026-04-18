import { corsHeaders } from '../_shared/cors.ts';
import { clearSubscriptionRecord, getRequiredEnv, getStripe, syncSubscriptionRecord } from '../_shared/stripe.ts';
import Stripe from 'npm:stripe@22.0.2';

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: corsHeaders,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return text('Method not allowed.', 405);
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return text('Missing Stripe signature.', 400);
    }

    const body = await req.text();
    const event = await getStripe().webhooks.constructEventAsync(
      body,
      signature,
      getRequiredEnv('STRIPE_WEBHOOK_SECRET'),
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await syncSubscriptionRecord(subscription);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscriptionRecord(event.data.object as Stripe.Subscription);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await syncSubscriptionRecord(subscription);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        await clearSubscriptionRecord(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handling failed.';
    return text(`Webhook Error: ${message}`, 400);
  }
});
