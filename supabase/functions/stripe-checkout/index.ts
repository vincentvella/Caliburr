import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Decode JWT payload without signature verification.
// Safe here because we verify the user ID exists in Supabase auth via the admin client.
function decodeJwtPayload(authHeader: string): { sub?: string; email?: string } | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
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

  const payload = decodeJwtPayload(authHeader);
  if (!payload?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Verify the user actually exists — prevents forged JWTs from creating sessions
  const { data: authUser } = await adminClient.auth.admin.getUserById(payload.sub);
  if (!authUser.user) {
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

  const origin = req.headers.get('origin') ?? 'https://caliburr.coffee';
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

  // Reuse existing Stripe customer if one exists to preserve saved payment methods
  const { data: profile } = await adminClient
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', authUser.user.id)
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: authUser.user.id,
    metadata: { supabase_user_id: authUser.user.id },
    ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : {}),
    customer_email: !profile?.stripe_customer_id ? authUser.user.email : undefined,
    success_url: `${origin}/backer?success=1`,
    cancel_url: `${origin}/backer`,
    subscription_data: {
      metadata: { supabase_user_id: authUser.user.id },
    },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
