import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown>;
}

function buildNotification(
  table: string,
  record: Record<string, unknown>,
): { title: string; body: string } | null {
  switch (table) {
    case 'reports':
      return {
        title: '🚩 New Report',
        body: `${capitalize(String(record.target_type ?? 'content'))} reported for ${record.reason ?? 'unknown reason'}`,
      };
    case 'grinder_edits':
      return {
        title: '✏️ Equipment Edit',
        body: 'A user proposed changes to a grinder',
      };
    case 'machine_edits':
      return {
        title: '✏️ Equipment Edit',
        body: 'A user proposed changes to a brew machine',
      };
    case 'support_requests':
      return {
        title: '💬 Support Request',
        body: String(record.message ?? '').slice(0, 100) || 'A user opened a support ticket',
      };
    case 'feature_requests':
      return {
        title: '💡 Feature Request',
        body: String(record.title ?? '').slice(0, 100) || 'A user submitted a feature request',
      };
    default:
      return null;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

Deno.serve(async (req) => {
  // Verify the request is a Supabase webhook
  const webhookSecret = Deno.env.get('SUPABASE_WEBHOOK_SECRET');
  if (webhookSecret) {
    const signature = req.headers.get('x-supabase-signature');
    if (signature !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  const payload = (await req.json()) as WebhookPayload;

  if (payload.type !== 'INSERT') {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  const notification = buildNotification(payload.table, payload.record);
  if (!notification) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  // Fetch all admin push tokens
  const { data: tokens, error } = await adminClient.from('admin_push_tokens').select('token');

  if (error || !tokens?.length) {
    return new Response(JSON.stringify({ ok: true, noTokens: true }), { status: 200 });
  }

  // Send via Expo Push API
  const messages = tokens.map(({ token }) => ({
    to: token,
    title: notification.title,
    body: notification.body,
    sound: 'default',
    data: { table: payload.table, id: payload.record.id },
  }));

  const expoRes = await fetch('https://exp.host/--/exponent-push-notification-service/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  const result = await expoRes.json();
  return new Response(JSON.stringify({ ok: true, result }), { status: 200 });
});
