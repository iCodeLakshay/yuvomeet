'use server';

import { redirect } from 'next/navigation';
import { field, type ActionState } from '@/lib/action';
import { serverClient } from '@/lib/supabase';

export interface EnrollState extends ActionState {
  factorId?: string;
  qr?: string;
  secret?: string;
}

/** First sign-in: enrol a TOTP factor. Stale unverified factors are removed first. */
export async function enrollTotp(): Promise<EnrollState> {
  const supabase = await serverClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === 'totp' && f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Yuvomeet admin' });
  if (error || !data) return { error: error?.message ?? 'Could not start enrolment.' };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Challenge + verify upgrades the session to aal2, which admin RLS requires (S-44). */
export async function verifyTotp(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await serverClient();
  const code = field(form, 'code').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return { error: 'Enter the 6-digit code.' };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: field(form, 'factorId'), code });
  if (error) return { error: 'That code did not match. Check the time on your phone and try again.' };
  redirect('/queue');
}
