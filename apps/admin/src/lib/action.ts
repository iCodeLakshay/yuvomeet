import { revalidatePath } from 'next/cache';
import { requireAdmin } from './auth';
import type { Db } from './supabase';

export interface ActionState {
  error?: string;
  ok?: string;
}

export const field = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/**
 * Runs one admin RPC. The database checks the role and writes audit_log in the same
 * transaction (S-45), so server actions never need the service role key.
 */
export async function runAdmin(
  fn: (db: Db) => PromiseLike<{ error: { message: string } | null }>,
  revalidate: string[],
  ok = 'Saved',
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { error } = await fn(supabase);
  if (error) return { error: error.message };
  for (const path of revalidate) revalidatePath(path);
  return { ok };
}
