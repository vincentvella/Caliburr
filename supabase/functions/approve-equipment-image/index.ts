import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import sharp from 'npm:sharp';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const BUCKET = 'equipment-images';

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

  // Approve: fetch, resize, upload, swap URL
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

  // Fetch the original image
  let imageResponse: Response;
  try {
    imageResponse = await fetch(equipment.image_url);
    if (!imageResponse.ok) throw new Error(`HTTP ${imageResponse.status}`);
    const contentType = imageResponse.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`Not an image: ${contentType}`);
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch image: ${(e as Error).message}` }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Resize + convert to WebP
  const inputBuffer = await imageResponse.arrayBuffer();
  const outputBuffer = await sharp(Buffer.from(inputBuffer))
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  // Upload to Storage
  const storagePath = `${equipmentType}/${equipmentId}.webp`;
  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, outputBuffer, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (uploadError) {
    return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get public URL
  const { data: urlData } = adminClient.storage.from(BUCKET).getPublicUrl(storagePath);

  // Swap image_url to the Storage URL and mark approved
  await adminClient
    .from(table)
    .update({ image_url: urlData.publicUrl, image_status: 'approved' })
    .eq('id', equipmentId);

  return new Response(JSON.stringify({ ok: true, url: urlData.publicUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
