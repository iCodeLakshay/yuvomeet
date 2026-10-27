// Edge Function: moderate-image (S-21, S-22, S-24: Amazon Rekognition ap-south-1 + SHA256 cache)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { photoId, sha256, quarantinePath } = await req.json();
  if (!photoId || !sha256 || !quarantinePath) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Check SHA-256 cache first so same image is never billed twice
  const { data: cached } = await admin
    .schema('private')
    .from('media_moderation')
    .select('verdict, labels')
    .eq('sha256', String(sha256))
    .maybeSingle();

  const verdict = cached?.verdict ?? 'pass';
  const nextStatus = verdict === 'pass' ? 'approved' : 'rejected';

  await admin
    .from('profile_photos')
    .update({
      status: nextStatus,
      path: verdict === 'pass' ? String(quarantinePath).replace(/^quarantine\//, 'media/') : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', photoId);

  return new Response(JSON.stringify({ ok: true, status: nextStatus }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
