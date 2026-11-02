import { toAppError } from '../../lib/errors';
import { queryClient } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { endSession } from './endSession';

let wired = false;
let refreshing: Promise<void> | null = null;

/**
 * One place that reacts to an expired session from any query or mutation: refresh the token
 * once (concurrent failures share the attempt), and if the refresh token is no longer valid,
 * end the session so the app returns to sign-in instead of showing errors on every screen.
 */
async function recover() {
  refreshing ??= (async () => {
    const { error } = await supabase.auth.refreshSession();
    if (error) await endSession();
    else await queryClient.invalidateQueries();
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

const isExpired = (error: unknown) => error != null && toAppError(error).code === 'SESSION_EXPIRED';

export function wireSessionExpiry() {
  if (wired) return;
  wired = true;
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error' && isExpired(event.action.error)) void recover();
  });
  queryClient.getMutationCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error' && isExpired(event.action.error)) void recover();
  });
}
