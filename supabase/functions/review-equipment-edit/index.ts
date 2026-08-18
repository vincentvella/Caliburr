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

  const isGrinder = editType === 'grinder';
  const table = isGrinder ? 'grinder_edits' : 'machine_edits';
  const equipmentTable = isGrinder ? 'grinders' : 'brew_machines';
  const verificationTable = isGrinder ? 'grinder_verifications' : 'machine_verifications';
  const verificationKey = isGrinder ? 'grinder_id' : 'brew_machine_id';

  if (action === 'reject') {
    // `.select()` so a zero-row result is distinguishable from success: an update
    // that matches nothing returns no error, and reporting ok would make the
    // admin UI drop the card while the edit is still pending. Constraining to
    // `pending` also stops a stale queue from re-reviewing a finished edit.
    const { data: rejected, error: rejectError } = await adminClient
      .from(table)
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', editId)
      .eq('status', 'pending')
      .select('id');

    if (rejectError) {
      console.error('reject failed', { editId, editType, error: rejectError.message });
      return json({ error: 'Could not reject edit', detail: rejectError.message }, 500);
    }

    if (!rejected || rejected.length === 0) {
      return json({ error: 'Edit not found, or already reviewed' }, 404);
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

  if (edit.status !== 'pending') {
    // Two admins working the same queue — fail before re-applying stale values
    // over whatever the later edit already wrote.
    return json({ error: 'Edit already reviewed', status: edit.status }, 409);
  }

  const equipmentId = isGrinder ? edit.grinder_id : edit.machine_id;

  // Needed to tell a real image change from the unchanged image_url the modal
  // resubmits on every edit — see pickAllowed.
  const { data: current, error: currentError } = await adminClient
    .from(equipmentTable)
    .select('image_url')
    .eq('id', equipmentId)
    .single();

  if (currentError || !current) {
    return json({ error: 'Equipment not found', detail: currentError?.message }, 404);
  }

  const { payload, dropped } = pickAllowed(
    edit.payload,
    isGrinder ? GRINDER_EDIT_FIELDS : MACHINE_EDIT_FIELDS,
    current.image_url,
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
  const { error: updateError } = await adminClient
    .from(equipmentTable)
    .update(payload)
    .eq('id', equipmentId);

  if (updateError) {
    console.error('equipment update failed', { editId, editType, error: updateError.message });
    return json({ error: 'Could not apply edit', detail: updateError.message }, 500);
  }

  if (edit.proposed_by) {
    const { error: verifyError } = await adminClient
      .from(verificationTable)
      .upsert(
        { [verificationKey]: equipmentId, user_id: edit.proposed_by },
        { onConflict: `${verificationKey},user_id`, ignoreDuplicates: true },
      );

    if (verifyError) {
      console.error('verification upsert failed', { editId, editType, error: verifyError.message });
      return json({ error: 'Could not record verification', detail: verifyError.message }, 500);
    }
  }

  const { data: approved, error: approveError } = await adminClient
    .from(table)
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', editId)
    .eq('status', 'pending')
    .select('id');

  if (approveError || !approved || approved.length === 0) {
    // The equipment row is already updated. Leaving the edit pending is the safe
    // failure: a retry re-applies the same values idempotently.
    const detail = approveError?.message ?? 'no rows matched';
    console.error('marking edit approved failed', { editId, error: detail });
    return json({ error: 'Edit applied but not marked approved', detail }, 500);
  }

  return json({ ok: true, dropped });
});
