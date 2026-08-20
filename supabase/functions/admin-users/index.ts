import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  banned_until: string | null;
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
    // Substring search in SQL rather than fetching users and filtering locally.
    //
    // The previous version pulled perPage: 1000 and filtered client-side, so
    // search silently stopped finding anyone past the thousandth account. The
    // RPC matches with ILIKE against the indexed email column and returns at
    // most 20 rows, so the cost no longer grows with the user base. See VEL-69.
    // The edge-function client is untyped, so name the RPC's shape here.
    const { data, error } = await adminClient.rpc('admin_search_users', {
      p_query: body.email.trim(),
    });
    const users = data as AdminUserRow[] | null;
    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to search users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const matches = (users ?? []).map((u) => ({
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
