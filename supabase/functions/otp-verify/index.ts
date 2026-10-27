// ON-1, S-8, S-10: five wrong codes lock the number for 30 minutes, keyed by HMAC(phone).
// The number arrives from the app transiently and is never logged or stored.
import { isOtpCode, toE164India } from '../../../packages/shared/src/validation.ts';
import { hmacSha256Hex, requireSecret } from '../_shared/crypto.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { admin, anon } from '../_shared/supabase.ts';

serve(async (req) => {
  const body = await readJson<{ phone?: string; token?: string }>(req);
  const phone = toE164India(body.phone ?? '');
  const token = body.token ?? '';
  if (!phone || !isOtpCode(token)) throw new HttpError(400, 'BAD_REQUEST', 'Enter the 6-digit code.');

  const phoneHmac = await hmacSha256Hex(requireSecret('OTP_PEPPER'), phone);
  const { data: lockedUntil } = await admin.rpc('svc_otp_locked_until', { p_phone_hmac: phoneHmac });
  if (lockedUntil) {
    return json({ error: { code: 'OTP_LOCKED', message: 'Too many wrong codes.', locked_until: lockedUntil } }, 429);
  }

  const { data, error } = await anon.auth.verifyOtp({ phone, token, type: 'sms' });
  const { data: state, error: recordError } = await admin.rpc('svc_otp_record', {
    p_phone_hmac: phoneHmac,
    p_success: !error && Boolean(data.session),
  });
  if (recordError) throw recordError;

  if (error || !data.session) {
    const { remaining, locked_until } = state as { remaining: number; locked_until: string | null };
    return locked_until
      ? json({ error: { code: 'OTP_LOCKED', message: 'Too many wrong codes.', locked_until } }, 429)
      : json({ error: { code: 'INVALID_OTP', message: 'That code is not right.', remaining } }, 401);
  }

  const createdAt = Date.parse(data.user?.created_at ?? '');
  return json({
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    new_user: Number.isFinite(createdAt) && Date.now() - createdAt < 5 * 60_000,
  });
});
