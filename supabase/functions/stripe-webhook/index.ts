import Stripe from 'npm:stripe';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function tierFromPriceId(priceId: string): 'monthly' | 'annual' | null {
  if (priceId === Deno.env.get('STRIPE_MONTHLY_PRICE_ID')) return 'monthly';
  if (priceId === Deno.env.get('STRIPE_ANNUAL_PRICE_ID')) return 'annual';
  return null;
}

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession;
      const userId = session.client_reference_id;
      const customerId = session.customer as string;
      if (!userId || !session.subscription) break;

      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items.data[0]?.price.id;
      const tier = priceId ? tierFromPriceId(priceId) : null;
      if (!tier) break;

      await adminClient.from('profiles').upsert(
        {
          user_id: userId,
          backer_tier: tier,
          backer_since: new Date().toISOString(),
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      if (sub.status !== 'active') break;

      const priceId = sub.items.data[0]?.price.id;
      const tier = priceId ? tierFromPriceId(priceId) : null;
      if (!tier) break;

      await adminClient
        .from('profiles')
        .update({ backer_tier: tier, updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      await adminClient
        .from('profiles')
        .update({ backer_tier: null, backer_since: null, updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', customerId);
      break;
    }

    default:
      break;
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
