'use server';

import { redirect } from 'next/navigation';
import { field, type ActionState } from '@/lib/action';
import { serverClient } from '@/lib/supabase';

/** Step 1 of admin sign-in: email + password (aal1). TOTP follows on /mfa (S-44). */
export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await serverClient();
  const { error } = await supabase.auth.signInWithPassword({ email: field(form, 'email'), password: String(form.get('password') ?? '') });
  if (error) return { error: 'Email or password is wrong.' };
  redirect('/mfa');
}

export async function signOut() {
  const supabase = await serverClient();
  await supabase.auth.signOut();
  redirect('/login');
}
