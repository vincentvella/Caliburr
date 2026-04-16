import Stripe from 'npm:stripe';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function tierFromPriceId(priceId: string): 'monthly' | 'annual' | null {
  if (priceId === Deno.env.get('STRIPE_MONTHLY_PRICE_ID')) return 'monthly';
  if (priceId === Deno.env.get('STRIPE_ANNUAL_PRICE_ID')) return 'annual';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { tier } = (await req.json()) as { tier: 'monthly' | 'annual' };
  const priceId =
    tier === 'annual'
      ? Deno.env.get('STRIPE_ANNUAL_PRICE_ID')!
      : Deno.env.get('STRIPE_MONTHLY_PRICE_ID')!;

  // Use the request origin for redirect URLs so it works across all deployments
  const origin = req.headers.get('origin') ?? 'https://caliburr.coffee';

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

  // Check if user already has a Stripe customer — reuse it to keep payment methods
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: profile } = await adminClient
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id },
    ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : {}),
    customer_email: !profile?.stripe_customer_id ? user.email : undefined,
    success_url: `${origin}/backer?success=1`,
    cancel_url: `${origin}/backer`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
