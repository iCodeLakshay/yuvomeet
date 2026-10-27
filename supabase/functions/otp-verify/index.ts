// Edge Function: otp-verify (Enforces ON-1 & S-8, S-10: 5 failed tries locks for 30 min, keyed by HMAC-SHA256)
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

  const { phone, token } = await req.json();
  if (!phone || !token || !/^\d{6}$/.test(String(token))) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const pepper = Deno.env.get('OTP_PEPPER') ?? 'dev-pepper';

  const admin = createClient(supabaseUrl, serviceKey);
  const identifierHmac = await hmacPhone(String(phone), pepper);

  const { data: attempt } = await admin
    .schema('private')
    .from('otp_attempts')
    .select('*')
    .eq('identifier_hmac', identifierHmac)
    .maybeSingle();

  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
    return new Response(
      JSON.stringify({
        error: 'OTP_LOCKED',
        lockedUntil: attempt.locked_until,
        message: 'Too many incorrect attempts. Locked for 30 minutes.',
      }),
      { status: 429 },
    );
  }

  const { data, error } = await admin.auth.verifyOtp({
    phone: String(phone),
    token: String(token),
    type: 'sms',
  });

  if (error || !data.session) {
    const nextFailed = (attempt?.failed_count ?? 0) + 1;
    const lockedUntil =
      nextFailed >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;

    await admin
      .schema('private')
      .from('otp_attempts')
      .upsert({
        identifier_hmac: identifierHmac,
        failed_count: nextFailed,
        locked_until: lockedUntil,
        updated_at: new Date().toISOString(),
      });

    return new Response(
      JSON.stringify({
        error: nextFailed >= 5 ? 'OTP_LOCKED' : 'INVALID_OTP',
        remainingAttempts: Math.max(0, 5 - nextFailed),
        lockedUntil,
      }),
      { status: nextFailed >= 5 ? 429 : 401 },
    );
  }

  await admin
    .schema('private')
    .from('otp_attempts')
    .upsert({
      identifier_hmac: identifierHmac,
      failed_count: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    });

  return new Response(
    JSON.stringify({
      session: data.session,
      user: { id: data.user?.id },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
