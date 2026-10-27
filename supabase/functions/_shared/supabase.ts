// Supabase clients for Edge Functions. The service role key never leaves the server (S-2).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import type { Database } from '../../../packages/shared/src/database.types.ts';
import { HttpError } from './http.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export type Admin = SupabaseClient<Database>;

export const admin: Admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const anon = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Verifies the caller's JWT and returns their user id (every user-facing function, architecture.md). */
export async function requireUser(req: Request): Promise<string> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'UNAUTHORIZED', 'Sign in again.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'UNAUTHORIZED', 'Sign in again.');
  return data.user.id;
}

/** Per-user sliding-window limit stored in private.edge_rate (security.md §6). */
export async function rateLimit(userId: string, endpoint: string, windowSeconds: number, limit: number) {
  const { data, error } = await admin.rpc('svc_rate_hit', {
    p_user: userId,
    p_endpoint: endpoint,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) throw error;
  if (!data) throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Try again later.');
}

/** Throws the Postgres error so serve() can map private.fail messages. */
export function unwrap<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
