// Supabase Auth "Send SMS" hook -> MSG91 (S-7, S-10, S-11). The phone number is used only to
// deliver the code and to derive the HMAC lock key; it is never stored or logged.
import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { hmacSha256Hex, requireSecret } from '../_shared/crypto.ts';
import { isLocal, json, serve } from '../_shared/http.ts';
import * as msg91 from '../_shared/msg91.ts';
import { admin } from '../_shared/supabase.ts';

interface HookPayload {
  user: { phone?: string };
  sms: { otp?: string };
}

const hookError = (status: number, message: string) => json({ error: { http_code: status, message } }, status);

serve(async (req) => {
  const raw = await req.text();
  let payload: HookPayload;
  try {
    const secret = requireSecret('SEND_SMS_HOOK_SECRET').replace(/^v1,whsec_/, '');
    payload = new Webhook(secret).verify(raw, Object.fromEntries(req.headers)) as HookPayload;
  } catch {
    return hookError(401, 'Invalid hook signature');
  }

  const phone = payload.user?.phone ? `+${payload.user.phone.replace(/^\+/, '')}` : null;
  const otp = payload.sms?.otp;
  if (!phone || !otp) return hookError(400, 'Missing phone or code');

  const phoneHmac = await hmacSha256Hex(requireSecret('OTP_PEPPER'), phone);
  const { data: lockedUntil } = await admin.rpc('svc_otp_locked_until', { p_phone_hmac: phoneHmac });
  if (lockedUntil) return hookError(429, 'Too many wrong codes. Try again in 30 minutes.');

  if (msg91.isConfigured()) {
    try {
      await msg91.sendOtp(phone, otp);
    } catch {
      return hookError(502, "Couldn't send code, try again");
    }
    await admin.rpc('svc_vendor_usage', { p_vendor: 'msg91', p_units: 1 });
  } else if (!isLocal()) {
    return hookError(500, 'SMS is not configured');
  }
  return json({});
});
