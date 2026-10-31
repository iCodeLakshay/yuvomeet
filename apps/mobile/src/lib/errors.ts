/**
 * User-facing error text. Database functions raise messages written for users with a hint
 * code (private.fail); Edge Functions return { error: { code, message } }.
 */
export class AppError extends Error {
  constructor(message: string, readonly code = 'INVALID', readonly details?: Record<string, unknown>) {
    super(message);
  }
}

const NETWORK = "You're offline. Check your connection and try again.";

const STALE_RPC = 'Profile save is out of date. Try again in a moment.';

function isMissingRpc(code: string | undefined, message: string): boolean {
  if (code === 'PGRST202' || code === '42883') return true;
  return /could not find the function/i.test(message) || /schema cache/i.test(message);
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const e = error as { message?: string; hint?: string; code?: string; name?: string };
  const message = e?.message ?? '';
  if (e?.code === 'P0001' && message) return new AppError(message, e.hint ?? 'INVALID');
  if (e?.code === '42501') return new AppError("You can't do that.", 'FORBIDDEN');
  if (isMissingRpc(e?.code, message)) return new AppError(STALE_RPC, 'STALE_RPC');
  if (e?.name === 'TypeError' || /network|fetch/i.test(message)) return new AppError(NETWORK, 'NETWORK');
  return new AppError('Something went wrong. Try again.', 'UNKNOWN');
}

export const errorMessage = (error: unknown) => toAppError(error).message;

/** Throws Supabase errors as AppError; returns data otherwise (non-null on success). */
export function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw toAppError(error);
  return data as T;
}

/**
 * For maybeSingle() reads where "no row" is a valid answer. Typed from the whole response so
 * the success branch wins inference (a plain `T | null` parameter infers T = null).
 */
export function unwrapMaybe<R extends { data: unknown; error: unknown }>(res: R): R['data'] {
  if (res.error) throw toAppError(res.error);
  return res.data;
}
