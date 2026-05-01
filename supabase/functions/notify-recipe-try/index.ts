// Webhook handler: notify a recipe author when someone logs a try.
//
// Wire this up via Supabase Dashboard → Database → Webhooks:
//   - Event: INSERT on `recipe_tries`
//   - Method: POST
//   - URL: <project>/functions/v1/notify-recipe-try
//   - HTTP Header: x-supabase-signature = SUPABASE_WEBHOOK_SECRET
//
// Behaviour:
//   - Skip self-tries (author trying their own recipe).
//   - 30-min cooldown per recipe via recipes.last_try_notification_at — only
//     the first try in each window fires a push.
//   - Uses APNs/FCM `collapse_id` so when multiple notifications do land,
//     the OS replaces the prior banner instead of stacking.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const COOLDOWN_MS = 30 * 60 * 1000;

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    recipe_id: string;
    user_id: string;
    worked: boolean;
    created_at: string;
  };
}

const BREW_METHOD_LABELS: Record<string, string> = {
  espresso: 'espresso',
  pour_over: 'pour over',
  aeropress: 'AeroPress',
  french_press: 'French press',
  chemex: 'Chemex',
  moka_pot: 'Moka pot',
  cold_brew: 'cold brew',
  drip: 'drip',
  siphon: 'siphon',
  turkish: 'Turkish',
  v60: 'V60',
  kalita_wave: 'Kalita Wave',
  clever_dripper: 'Clever Dripper',
  ristretto: 'ristretto',
  vietnamese_phin: 'Vietnamese phin',
};

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('SUPABASE_WEBHOOK_SECRET');
  if (webhookSecret) {
    const signature = req.headers.get('x-supabase-signature');
    if (signature !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  const payload = (await req.json()) as WebhookPayload;
  if (payload.type !== 'INSERT' || payload.table !== 'recipe_tries') {
    return new Response(JSON.stringify({ ok: true, skipped: 'wrong-event' }), { status: 200 });
  }

  const tryRow = payload.record;

  // Look up recipe + author + cooldown state in one row.
  const { data: recipe, error: recipeErr } = await adminClient
    .from('recipes')
    .select('id, user_id, brew_method, last_try_notification_at, bean:beans(name)')
    .eq('id', tryRow.recipe_id)
    .maybeSingle();

  if (recipeErr || !recipe) {
    return new Response(JSON.stringify({ ok: false, error: 'recipe-not-found' }), { status: 200 });
  }

  // Don't notify yourself about your own try.
  if (recipe.user_id === tryRow.user_id) {
    return new Response(JSON.stringify({ ok: true, skipped: 'self-try' }), { status: 200 });
  }

  // Cooldown check: skip if within window.
  if (recipe.last_try_notification_at) {
    const last = new Date(recipe.last_try_notification_at as string).getTime();
    if (Date.now() - last < COOLDOWN_MS) {
      return new Response(JSON.stringify({ ok: true, skipped: 'cooldown' }), { status: 200 });
    }
  }

  // Look up the trying user's display name and the recipe author's tokens.
  const [{ data: tryProfile }, { data: tokens }] = await Promise.all([
    adminClient
      .from('profiles')
      .select('display_name')
      .eq('user_id', tryRow.user_id)
      .maybeSingle(),
    adminClient
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', recipe.user_id),
  ]);

  // Always advance the cooldown — even with zero tokens, we don't want the
  // *next* try (potentially 5 minutes later) to fire one. Authors who add
  // a device later will start receiving as expected.
  await adminClient
    .from('recipes')
    .update({ last_try_notification_at: new Date().toISOString() })
    .eq('id', recipe.id);

  if (!tokens?.length) {
    return new Response(JSON.stringify({ ok: true, noTokens: true }), { status: 200 });
  }

  const tryAuthorName = tryProfile?.display_name ?? 'Someone';
  const beanName = ((recipe.bean as unknown) as { name?: string } | null)?.name;
  const methodLabel =
    BREW_METHOD_LABELS[recipe.brew_method as string] ?? (recipe.brew_method as string);
  const recipeLabel = beanName ? `${beanName} ${methodLabel}` : `${methodLabel} recipe`;

  const collapseId = `recipe-tried-${recipe.id}`;
  const messages = tokens.map(({ token }) => ({
    to: token,
    title: '☕ Someone tried your recipe',
    body: `${tryAuthorName} tried your ${recipeLabel}.`,
    sound: 'default',
    data: { kind: 'recipe-tried', recipe_id: recipe.id },
    // Apple/FCM "collapse" — newer push with same id replaces the prior banner.
    collapseId,
    collapse_key: collapseId,
  }));

  const expoRes = await fetch('https://exp.host/--/exponent-push-notification-service/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  const result = await expoRes.json();
  return new Response(JSON.stringify({ ok: true, result }), { status: 200 });
});
