import { revalidatePath } from 'next/cache';
import { requireAdmin } from './auth';
import type { Db } from './supabase';

/**
 * Messages the console may show. The database raises these itself (P0001 business rules, 42501 refusals)
 * in plain words; anything else (a PostgREST or Postgres internal error) becomes a generic line, so
 * table names, constraint names and row contents never reach the browser.
 */
export function safeMessage(error: { message: string; code?: string }): string {
  if (error.code === 'P0001' || error.code === '42501') return error.message;
  console.error('admin action failed', error.code ?? 'unknown');
  return 'That did not work. Try again, and tell an admin if it keeps failing.';
}

export interface ActionState {
  error?: string;
  ok?: string;
}

export { field } from './form';

/**
 * Runs one admin RPC. The database checks the role and writes audit_log in the same
 * transaction (S-45), so server actions never need the service role key.
 */
export async function runAdmin<T = unknown>(
  fn: (db: Db) => PromiseLike<{ data?: T; error: { message: string; code?: string } | null }>,
  revalidate: string[],
  ok: string | ((data: T) => string) = 'Saved',
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { data, error } = await fn(supabase);
  if (error) return { error: safeMessage(error) };
  for (const path of revalidate) revalidatePath(path);
  return { ok: typeof ok === 'function' ? ok(data as T) : ok };
}
