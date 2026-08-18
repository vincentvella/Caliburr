import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GRINDER_EDIT_FIELDS, MACHINE_EDIT_FIELDS, pickAllowed } from './payload.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify caller is admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401);
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
    return json({ error: 'Forbidden' }, 403);
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
    const { error: rejectError } = await adminClient
      .from(table)
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', editId);

    if (rejectError) {
      console.error('reject failed', { editId, editType, error: rejectError.message });
      return json({ error: 'Could not reject edit', detail: rejectError.message }, 500);
    }

    return json({ ok: true });
  }

  // Approve: apply the payload, count verification, mark approved
  const { data: edit, error: editError } = await adminClient
    .from(table)
    .select('*')
    .eq('id', editId)
    .single();

  if (editError || !edit) {
    return json({ error: 'Edit not found' }, 404);
  }

  const { payload, dropped } = pickAllowed(
    edit.payload,
    editType === 'grinder' ? GRINDER_EDIT_FIELDS : MACHINE_EDIT_FIELDS,
  );

  if (dropped.length > 0) {
    console.warn('dropped non-allowlisted edit fields', { editId, editType, dropped });
  }

  if (Object.keys(payload).length === 0) {
    return json({ error: 'Edit contains no applicable fields', dropped }, 400);
  }

  // Every write below is checked: the edit must only be marked approved once the
  // equipment row actually changed, otherwise a failed update would silently
  // vanish from the moderation queue with nothing applied.
  if (editType === 'grinder') {
    const { error: updateError } = await adminClient
      .from('grinders')
      .update(payload)
      .eq('id', edit.grinder_id);

    if (updateError) {
      console.error('grinder update failed', { editId, error: updateError.message });
      return json({ error: 'Could not apply edit', detail: updateError.message }, 500);
    }

    if (edit.proposed_by) {
      const { error: verifyError } = await adminClient
        .from('grinder_verifications')
        .upsert(
          { grinder_id: edit.grinder_id, user_id: edit.proposed_by },
          { onConflict: 'grinder_id,user_id', ignoreDuplicates: true },
        );

      if (verifyError) {
        console.error('grinder verification upsert failed', {
          editId,
          error: verifyError.message,
        });
        return json({ error: 'Could not record verification', detail: verifyError.message }, 500);
      }
    }
  } else {
    const { error: updateError } = await adminClient
      .from('brew_machines')
      .update(payload)
      .eq('id', edit.machine_id);

    if (updateError) {
      console.error('machine update failed', { editId, error: updateError.message });
      return json({ error: 'Could not apply edit', detail: updateError.message }, 500);
    }

    if (edit.proposed_by) {
      const { error: verifyError } = await adminClient
        .from('machine_verifications')
        .upsert(
          { brew_machine_id: edit.machine_id, user_id: edit.proposed_by },
          { onConflict: 'brew_machine_id,user_id', ignoreDuplicates: true },
        );

      if (verifyError) {
        console.error('machine verification upsert failed', {
          editId,
          error: verifyError.message,
        });
        return json({ error: 'Could not record verification', detail: verifyError.message }, 500);
      }
    }
  }

  const { error: approveError } = await adminClient
    .from(table)
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', editId);

  if (approveError) {
    // The equipment row is already updated. Leaving the edit pending is the safe
    // failure: a retry re-applies the same values idempotently.
    console.error('marking edit approved failed', { editId, error: approveError.message });
    return json(
      { error: 'Edit applied but not marked approved', detail: approveError.message },
      500,
    );
  }

  return json({ ok: true, dropped });
});
