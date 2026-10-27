import { toE164India } from '@yuvomeet/shared';
import { AppError, toAppError } from '../../lib/errors';
import { callFunction } from '../../lib/functions';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/telemetry';

export function normalisePhone(input: string): string {
  const phone = toE164India(input);
  if (!phone) throw new AppError('Enter a valid 10-digit Indian mobile number.', 'BAD_PHONE');
  return phone;
}

/** ON-1: Supabase Auth generates the code; the send-sms hook delivers it through MSG91. */
export async function requestOtp(phone: string, resend = false) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    if (error.status === 429) throw new AppError('Too many codes requested. Wait a minute and try again.', 'RATE_LIMITED');
    if (/locked|wrong codes/i.test(error.message)) throw new AppError('Too many wrong codes. Try again in 30 minutes.', 'OTP_LOCKED');
    throw toAppError(error);
  }
  track('otp_requested', { resend });
}

/** Verifies through otp-verify so the 5-try / 30-minute lock applies (S-10). */
export async function verifyOtp(phone: string, token: string) {
  const res = await callFunction<{ session: { access_token: string; refresh_token: string }; new_user: boolean }>(
    'otp-verify',
    { phone, token },
    false,
  );
  const { error } = await supabase.auth.setSession(res.session);
  if (error) throw toAppError(error);
  track('otp_verified', { new_user: res.new_user });
}
