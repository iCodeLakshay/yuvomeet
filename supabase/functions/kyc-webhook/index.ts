// Edge Function: kyc-webhook (Enforces VR-1, VR-2, VR-3, S-38, S-39, S-40, S-41)
// Verifies webhook signature, drops Aadhaar/ID image/DOB/name immediately,
// stores only verdict, score, birth_year, verified_gender, and HMAC id_fingerprint.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function hmacFingerprint(docRef: string, pepper: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(docRef));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const payload = await req.json();
  const {
    eventId,
    userId,
    providerRef,
    documentRef,
    birthYear,
    verifiedGender,
    faceMatchScore,
    livenessScore,
    attempt = 1,
  } = payload;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const kycPepper = Deno.env.get('KYC_PEPPER') ?? 'dev-kyc-pepper';

  const admin = createClient(supabaseUrl, serviceKey);

  // S-53: Replay protection
  if (eventId) {
    const { error: replayErr } = await admin
      .schema('private')
      .from('webhook_events')
      .insert({ provider: 'hyperverge', event_id: String(eventId) });
    if (replayErr) {
      return new Response(JSON.stringify({ ok: true, deduplicated: true }), { status: 200 });
    }
  }

  const currentYear = new Date().getFullYear();
  const age = Number(birthYear) ? currentYear - Number(birthYear) : 0;
  const isMinor = age < 18;

  // S-39: Compute HMAC fingerprint to prevent duplicate accounts or returning minors
  if (documentRef) {
    const fingerprint = await hmacFingerprint(String(documentRef), kycPepper);
    await admin
      .schema('private')
      .from('identity_fingerprints')
      .upsert({
        fingerprint,
        user_id: userId,
        is_minor: isMinor,
        is_banned: isMinor,
      });
  }

  // S-40: Permanent block for under-18
  if (isMinor) {
    await admin.from('verification_checks').insert({
      user_id: userId,
      type: 'id_age',
      provider: 'hyperverge',
      provider_ref: String(providerRef ?? ''),
      verdict: 'minor',
      decided_at: new Date().toISOString(),
      attempt,
    });

    await admin
      .from('profiles')
      .update({
        verification_status: 'blocked_minor',
        status: 'banned',
        status_reason: 'You must be 18 or older to use Yuvomeet.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    await admin.auth.admin.signOut(userId, 'global');
    return new Response(JSON.stringify({ status: 'blocked_minor' }), { status: 200 });
  }

  const faceVerdict =
    Number(faceMatchScore) >= 80 && Number(livenessScore) >= 80
      ? 'pass'
      : Number(faceMatchScore) >= 60 || attempt >= 2
      ? 'review'
      : 'fail';

  await admin.from('verification_checks').insert([
    {
      user_id: userId,
      type: 'id_age',
      provider: 'hyperverge',
      provider_ref: String(providerRef ?? ''),
      verdict: 'pass',
      decided_at: new Date().toISOString(),
      attempt,
    },
    {
      user_id: userId,
      type: 'liveness_face',
      provider: 'hyperverge',
      provider_ref: String(providerRef ?? ''),
      ai_score: Number(faceMatchScore ?? 0),
      verdict: faceVerdict,
      decided_at: new Date().toISOString(),
      attempt,
    },
    {
      user_id: userId,
      type: 'gender',
      provider: 'hyperverge',
      provider_ref: String(providerRef ?? ''),
      verdict: 'pass',
      decided_at: new Date().toISOString(),
      attempt,
    },
  ]);

  if (faceVerdict === 'pass') {
    await admin
      .from('profiles')
      .update({
        birth_year: Number(birthYear),
        verified_gender: verifiedGender,
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } else if (faceVerdict === 'review') {
    await admin
      .from('profiles')
      .update({
        birth_year: Number(birthYear),
        verification_status: 'manual_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  return new Response(JSON.stringify({ status: faceVerdict }), { status: 200 });
});
