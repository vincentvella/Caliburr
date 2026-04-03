import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jwt = authHeader.replace('Bearer ', '');

  // Verify the JWT server-side — user_id is derived from the token,
  // so a caller cannot target a different user's account.
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser(jwt);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = user.id;

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Run all pre-deletion cleanup in parallel.
  const [upvoteRes, grindersRes, machinesRes] = await Promise.all([
    // Decrement denormalized upvote counters before the recipe_upvotes rows cascade.
    adminClient.rpc('decrement_upvotes_for_user', { p_user_id: userId }),
    // Nullify created_by on community equipment (no ON DELETE action on these columns).
    adminClient.from('grinders').update({ created_by: null }).eq('created_by', userId),
    adminClient.from('brew_machines').update({ created_by: null }).eq('created_by', userId),
  ]);

  const cleanupError = upvoteRes.error ?? grindersRes.error ?? machinesRes.error;
  if (cleanupError) {
    return new Response(JSON.stringify({ error: 'Failed to clean up user data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Delete the auth user. FK behaviour handles the rest:
  //   recipes.user_id               → SET NULL  (recipes stay, anonymised)
  //   user_grinders.user_id         → CASCADE   (personal gear removed)
  //   user_brew_machines            → CASCADE
  //   recipe_upvotes                → CASCADE   (counters already decremented above)
  //   recipe_history.edited_by      → CASCADE
  //   grinder_verifications.user_id → SET NULL  (rows preserved, user anonymised)
  //   machine_verifications.user_id → SET NULL
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
