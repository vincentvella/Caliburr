const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { editType, equipmentName, payload, editId } = await req.json();

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const adminEmail = Deno.env.get('ADMIN_EMAIL');

  if (!resendKey || !adminEmail) {
    // Silently succeed if email isn't configured yet — don't block the user flow
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const fields = Object.entries(payload as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 8px;color:#6e5a47">${k}</td><td style="padding:4px 8px">${v}</td></tr>`,
    )
    .join('');

  const html = `
    <p>A user proposed an edit to a <strong>${editType}</strong>.</p>
    <p><strong>${equipmentName}</strong> — edit ID: <code>${editId}</code></p>
    <table style="border-collapse:collapse;font-family:monospace;font-size:13px">
      ${fields}
    </table>
    <p><a href="https://caliburr.coffee/admin">Review in admin panel →</a></p>
  `;

  await fetch('https://api.resend.com/emails', {
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

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
