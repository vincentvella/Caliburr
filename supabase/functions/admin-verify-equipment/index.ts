import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-content, authorization',
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

  const { equipmentId, equipmentType, action } = (await req.json()) as {
    equipmentId: string;
    equipmentType: 'grinder' | 'machine';
    action: 'verify' | 'unverify';
  };

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const table = equipmentType === 'grinder' ? 'grinders' : 'brew_machines';
  const verificationsTable = equipmentType === 'grinder' ? 'grinder_verifications' : 'machine_verifications';
  const fkColumn = equipmentType === 'grinder' ? 'grinder_id' : 'brew_machine_id';

  if (action === 'verify') {
    const { error } = await adminClient
      .from(table)
      .update({ verified: true })
      .eq('id', equipmentId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    // Un-verify: flip flag and clear all verifications so the 5-vote count resets
    const [updateRes, deleteRes] = await Promise.all([
      adminClient.from(table).update({ verified: false }).eq('id', equipmentId),
      adminClient.from(verificationsTable).delete().eq(fkColumn, equipmentId),
    ]);

    if (updateRes.error || deleteRes.error) {
      return new Response(JSON.stringify({ error: 'Failed to un-verify equipment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
