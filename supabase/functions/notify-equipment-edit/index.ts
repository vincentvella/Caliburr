import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { escapeHtml } from './html.ts';

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

  // This function is invoked from the app, not by a database webhook, so the
  // caller's JWT is the right credential — a shared webhook secret would have to
  // ship inside the bundle. Previously there was no check at all: anyone with
  // the URL could send Resend email on demand and inject HTML into the admin
  // inbox.
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

  if (userError || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { editId, editType } = (await req.json()) as {
    editId: string;
    editType: 'grinder' | 'machine';
  };

  if (!editId || (editType !== 'grinder' && editType !== 'machine')) {
    return json({ error: 'editId and a valid editType are required' }, 400);
  }

  // Everything rendered below is read from the database rather than taken from
  // the request body, so a caller can't forge the equipment name or the field
  // list, and can't reference an edit that isn't theirs.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const isGrinder = editType === 'grinder';
  const { data: edit, error: editError } = await adminClient
    .from(isGrinder ? 'grinder_edits' : 'machine_edits')
    .select(
      isGrinder
        ? 'id, payload, proposed_by, equipment:grinders(brand, model)'
        : 'id, payload, proposed_by, equipment:brew_machines(brand, model)',
    )
    .eq('id', editId)
    .single();

  if (editError || !edit) {
    return json({ error: 'Edit not found' }, 404);
  }

  if (edit.proposed_by !== user.id) {
    return json({ error: 'Forbidden' }, 403);
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const adminEmail = Deno.env.get('ADMIN_EMAIL');

  if (!resendKey || !adminEmail) {
    // Silently succeed if email isn't configured yet — don't block the user flow
    return json({ ok: true, skipped: 'email-not-configured' });
  }

  // PostgREST types an embedded relation as an array even when the FK makes it
  // to-one, and returns a bare object at runtime. Accept either shape.
  const raw = edit.equipment as unknown;
  const equipment = (Array.isArray(raw) ? raw[0] : raw) as
    | { brand: string; model: string }
    | null
    | undefined;
  const equipmentName = equipment ? `${equipment.brand} ${equipment.model}` : '(unknown)';

  const fields = Object.entries((edit.payload ?? {}) as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 8px;color:#6e5a47">${escapeHtml(k)}</td><td style="padding:4px 8px">${escapeHtml(v)}</td></tr>`,
    )
    .join('');

  const html = `
    <p>A user proposed an edit to a <strong>${escapeHtml(editType)}</strong>.</p>
    <p><strong>${escapeHtml(equipmentName)}</strong> — edit ID: <code>${escapeHtml(edit.id)}</code></p>
    <table style="border-collapse:collapse;font-family:monospace;font-size:13px">
      ${fields}
    </table>
    <p><a href="https://caliburr.coffee/admin">Review in admin panel →</a></p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Caliburr <noreply@caliburr.coffee>',
      to: adminEmail,
      subject: `Equipment edit pending: ${equipmentName}`,
      html,
    }),
  });

  if (!res.ok) {
    // The edit is already queued; the notification is best-effort. Report it
    // rather than silently dropping it, but don't fail the caller's flow.
    console.error('resend failed', { editId, status: res.status, body: await res.text() });
    return json({ ok: true, emailed: false }, 200);
  }

  return json({ ok: true, emailed: true });
});
