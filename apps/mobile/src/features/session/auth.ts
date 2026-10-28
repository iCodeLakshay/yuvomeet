import { toE164India } from '@yuvomeet/shared';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
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

/** Google through Supabase OAuth in the system browser; the code comes back to yuvomeet://auth/callback. */
export async function signInWithGoogle(): Promise<boolean> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) throw toAppError(error ?? new Error('Google sign-in is not available.'));
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  const { queryParams } = Linking.parse(result.url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (!code) {
    const reason = typeof queryParams?.error_description === 'string' ? queryParams.error_description : 'Google sign-in was cancelled.';
    throw new AppError(reason, 'OAUTH');
  }
  const { error: exchange } = await supabase.auth.exchangeCodeForSession(code);
  // The deep link can reach app/auth/callback first and use the code; a session means it worked.
  if (exchange && !(await supabase.auth.getSession()).data.session) throw toAppError(exchange);
  track('otp_verified', { new_user: false });
  return true;
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    if (/invalid login/i.test(error.message)) throw new AppError('Wrong email or password.', 'BAD_LOGIN');
    if (/not confirmed/i.test(error.message)) throw new AppError('Confirm your email first. Check your inbox for the link.', 'UNCONFIRMED');
    throw toAppError(error);
  }
}

/** Returns true when the account is ready, false when Supabase sent a confirmation email first. */
export async function signUpWithEmail(email: string, password: string): Promise<boolean> {
  if (password.length < 8) throw new AppError('Use at least 8 characters for your password.', 'WEAK_PASSWORD');
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { emailRedirectTo: Linking.createURL('auth/callback') },
  });
  if (error) {
    if (/already registered/i.test(error.message)) throw new AppError('That email already has an account. Log in instead.', 'EXISTS');
    throw toAppError(error);
  }
  return Boolean(data.session);
}
