import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user || user.app_metadata?.is_admin !== true) {
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

  const body = (await req.json()) as
    | { action: 'search'; email: string }
    | { action: 'ban'; userId: string }
    | { action: 'unban'; userId: string };

  if (body.action === 'search') {
    const {
      data: { users },
      error,
    } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to list users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const query = body.email.toLowerCase().trim();
    const matches = users
      .filter((u) => u.email?.toLowerCase().includes(query))
      .slice(0, 20)
      .map((u) => ({
        id: u.id,
        email: u.email ?? '—',
        createdAt: u.created_at,
        bannedUntil: u.banned_until ?? null,
      }));

    return new Response(JSON.stringify({ users: matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'ban') {
    const { error } = await adminClient.auth.admin.updateUserById(body.userId, {
      ban_duration: '876600h', // ~100 years
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'unban') {
    const { error } = await adminClient.auth.admin.updateUserById(body.userId, {
      ban_duration: 'none',
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
