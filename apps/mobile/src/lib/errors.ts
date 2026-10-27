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

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const e = error as { message?: string; hint?: string; code?: string; name?: string };
  if (e?.code === 'P0001' && e.message) return new AppError(e.message, e.hint ?? 'INVALID');
  if (e?.code === '42501') return new AppError("You can't do that.", 'FORBIDDEN');
  if (e?.name === 'TypeError' || /network|fetch/i.test(e?.message ?? '')) return new AppError(NETWORK, 'NETWORK');
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
