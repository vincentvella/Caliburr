import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET = 'equipment-images';

// Best-effort detection of the actual content type so the canonical filename
// gets a sensible extension. The client uploads JPEGs, but admins can also
// approve URLs supplied by other paths.
function extensionFor(contentType: string): string {
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('heic') || contentType.includes('heif')) return 'heic';
  return 'jpg';
}

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

  const { equipmentId, equipmentType, action } = (await req.json()) as {
    equipmentId: string;
    equipmentType: 'grinder' | 'machine';
    action: 'approve' | 'reject';
  };

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const table = equipmentType === 'grinder' ? 'grinders' : 'brew_machines';

  if (action === 'reject') {
    await adminClient
      .from(table)
      .update({ image_url: null, image_status: null })
      .eq('id', equipmentId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Approve: fetch the image bytes and copy to a canonical path so the
  // image_url is stable. The client already produces a 1200×900 JPEG at
  // quality 80 (~150–400KB) so further server-side resize is unnecessary —
  // and `sharp` can't run in Supabase Edge Runtime (no native libvips).
  const { data: equipment, error: equipmentError } = await adminClient
    .from(table)
    .select('image_url')
    .eq('id', equipmentId)
    .single();

  if (equipmentError || !equipment?.image_url) {
    return new Response(JSON.stringify({ error: 'Equipment or image URL not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let imageResponse: Response;
  let contentType: string;
  try {
    imageResponse = await fetch(equipment.image_url);
    if (!imageResponse.ok) throw new Error(`HTTP ${imageResponse.status}`);
    contentType = imageResponse.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`Not an image: ${contentType}`);
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch image: ${(e as Error).message}` }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const inputBuffer = await imageResponse.arrayBuffer();
  const ext = extensionFor(contentType);
  const storagePath = `${equipmentType}/${equipmentId}.${ext}`;

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, inputBuffer, { contentType, upsert: true });

  if (uploadError) {
    return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: urlData } = adminClient.storage.from(BUCKET).getPublicUrl(storagePath);

  await adminClient
    .from(table)
    .update({ image_url: urlData.publicUrl, image_status: 'approved' })
    .eq('id', equipmentId);

  return new Response(JSON.stringify({ ok: true, url: urlData.publicUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
