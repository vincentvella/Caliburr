import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

type BackerTier = 'monthly' | 'annual';

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

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data: { user }, error: userError } = await anonClient.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );

  if (userError || !user || user.user_metadata?.is_admin !== true) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const body = await req.json() as
    | { action: 'list' }
    | { action: 'grant'; email: string; tier: BackerTier }
    | { action: 'revoke'; userId: string };

  if (body.action === 'list') {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('user_id, backer_tier, backer_since')
      .not('backer_tier', 'is', null)
      .order('backer_since', { ascending: false });

    if (!profiles?.length) {
      return new Response(JSON.stringify({ backers: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch emails from auth.users for each backer
    const userIds = profiles.map((p) => p.user_id);
    const emailMap: Record<string, string> = {};
    await Promise.all(
      userIds.map(async (id) => {
        const { data } = await adminClient.auth.admin.getUserById(id);
        if (data.user?.email) emailMap[id] = data.user.email;
      }),
    );

    const backers = profiles.map((p) => ({
      userId: p.user_id,
      email: emailMap[p.user_id] ?? '—',
      tier: p.backer_tier,
      backerSince: p.backer_since,
    }));

    return new Response(JSON.stringify({ backers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'grant') {
    // Look up user by email
    const { data: { users }, error } = await adminClient.auth.admin.listUsers();
    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to list users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const target = users.find((u) => u.email?.toLowerCase() === body.email.toLowerCase());
    if (!target) {
      return new Response(JSON.stringify({ error: 'No user found with that email' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await adminClient.from('profiles').upsert(
      {
        user_id: target.id,
        backer_tier: body.tier,
        backer_since: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    return new Response(JSON.stringify({ ok: true, userId: target.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'revoke') {
    await adminClient
      .from('profiles')
      .update({ backer_tier: null, backer_since: null, updated_at: new Date().toISOString() })
      .eq('user_id', body.userId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
