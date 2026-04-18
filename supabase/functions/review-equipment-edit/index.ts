import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify caller is admin
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

  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));

  if (userError || !user || user.user_metadata?.is_admin !== true) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { editId, editType, action } = (await req.json()) as {
    editId: string;
    editType: 'grinder' | 'machine';
    action: 'approve' | 'reject';
  };

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const table = editType === 'grinder' ? 'grinder_edits' : 'machine_edits';

  if (action === 'reject') {
    await adminClient
      .from(table)
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', editId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Approve: apply the payload, count verification, mark approved
  const { data: edit, error: editError } = await adminClient
    .from(table)
    .select('*')
    .eq('id', editId)
    .single();

  if (editError || !edit) {
    return new Response(JSON.stringify({ error: 'Edit not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (editType === 'grinder') {
    const payload = { ...edit.payload };
    // If the edit changes image_url, queue it for image approval
    if ('image_url' in payload) {
      (payload as Record<string, unknown>).image_status = payload.image_url ? 'pending' : null;
    }
    await adminClient.from('grinders').update(payload).eq('id', edit.grinder_id);

    if (edit.proposed_by) {
      await adminClient
        .from('grinder_verifications')
        .upsert(
          { grinder_id: edit.grinder_id, user_id: edit.proposed_by },
          { onConflict: 'grinder_id,user_id', ignoreDuplicates: true },
        );
    }
  } else {
    const payload = { ...edit.payload };
    // If the edit changes image_url, queue it for image approval
    if ('image_url' in payload) {
      (payload as Record<string, unknown>).image_status = payload.image_url ? 'pending' : null;
    }
    await adminClient.from('brew_machines').update(payload).eq('id', edit.machine_id);

    if (edit.proposed_by) {
      await adminClient
        .from('machine_verifications')
        .upsert(
          { brew_machine_id: edit.machine_id, user_id: edit.proposed_by },
          { onConflict: 'brew_machine_id,user_id', ignoreDuplicates: true },
        );
    }
  }

  await adminClient
    .from(table)
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', editId);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
