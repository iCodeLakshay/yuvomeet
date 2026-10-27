import { AppError } from './errors';
import { env } from './env';
import { supabase } from './supabase';

/** Calls an Edge Function with the user's JWT and maps { error } bodies to AppError. */
export async function callFunction<T>(name: string, body: unknown, authenticated = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: env.supabaseAnonKey };
  if (authenticated) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new AppError('Sign in again.', 'UNAUTHORIZED');
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${env.supabaseUrl}/functions/v1/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    throw new AppError("You're offline. Check your connection and try again.", 'NETWORK');
  }
  const json = (await res.json().catch(() => ({}))) as { error?: { code: string; message: string } & Record<string, unknown> };
  if (!res.ok || json.error) {
    throw new AppError(json.error?.message ?? 'Something went wrong. Try again.', json.error?.code ?? 'UNKNOWN', json.error);
  }
  return json as T;
}
