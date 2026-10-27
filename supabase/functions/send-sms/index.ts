// Edge Function: send-sms (Supabase Auth Send SMS Hook -> MSG91 DLT in India, S-7, S-10, S-11)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function hmacPhone(phone: string, pepper: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(phone.trim()));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const body = await req.json();
  const phone = body?.user?.phone;
  const otp = body?.sms?.otp;

  if (!phone || !otp) {
    return new Response(JSON.stringify({ error: 'Missing phone or otp' }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const pepper = Deno.env.get('OTP_PEPPER') ?? 'dev-pepper';

  const admin = createClient(supabaseUrl, serviceKey);
  const identifierHmac = await hmacPhone(String(phone), pepper);

  // S-10: Refuse to send SMS while number is locked
  const { data: attempt } = await admin
    .schema('private')
    .from('otp_attempts')
    .select('locked_until')
    .eq('identifier_hmac', identifierHmac)
    .maybeSingle();

  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
    return new Response(
      JSON.stringify({ error: 'OTP_LOCKED', lockedUntil: attempt.locked_until }),
      { status: 429 },
    );
  }

  // Record cost-guard unit in private.vendor_usage
  const today = new Date().toISOString().slice(0, 10);
  await admin.schema('private').from('vendor_usage').upsert(
    { vendor: 'msg91', day: today, units: 1 },
    { onConflict: 'vendor,day' },
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
