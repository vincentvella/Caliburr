import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

type BackerTier = 'monthly' | 'annual';

function tierFromProductId(productId: string): BackerTier | null {
  const annualIds = [
    Deno.env.get('STRIPE_ANNUAL_PRICE_ID'),
    Deno.env.get('STRIPE_ANNUAL_PRICE_ID_TEST'),
  ];
  const monthlyIds = [
    Deno.env.get('STRIPE_MONTHLY_PRICE_ID'),
    Deno.env.get('STRIPE_MONTHLY_PRICE_ID_TEST'),
  ];
  if (annualIds.includes(productId)) return 'annual';
  if (monthlyIds.includes(productId)) return 'monthly';
  // Fallback: infer from product identifier naming convention
  const id = productId.toLowerCase();
  if (id.includes('annual') || id.includes('yearly')) return 'annual';
  if (id.includes('monthly')) return 'monthly';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify the request is genuinely from RevenueCat
  const authHeader = req.headers.get('Authorization');
  const expectedSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!authHeader || authHeader !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const event = body.event as {
    type: string;
    app_user_id: string;
    product_id: string;
    transferred_to?: string[];
  };

  console.log(`RC webhook: type=${event.type} product_id=${event.product_id} user=${event.app_user_id}`);

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const userId = event.app_user_id;

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION': {
      const tier = tierFromProductId(event.product_id);
      if (!tier) break;
      await adminClient.from('profiles').upsert(
        {
          user_id: userId,
          backer_tier: tier,
          backer_since: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      break;
    }

    case 'EXPIRATION': {
      await adminClient
        .from('profiles')
        .update({ backer_tier: null, backer_since: null, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      break;
    }

    case 'TRANSFER': {
      // Move the profile to the new user ID
      const newUserId = event.transferred_to?.[0];
      if (!newUserId) break;
      const { data: existing } = await adminClient
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (existing) {
        await adminClient
          .from('profiles')
          .upsert(
            { ...existing, user_id: newUserId, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
          );
        await adminClient.from('profiles').delete().eq('user_id', userId);
      }
      break;
    }

    // CANCELLATION: subscription still active until EXPIRATION — do nothing
    // BILLING_ISSUE: no action needed, RevenueCat will retry
    default:
      break;
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
