import { field } from './form.ts';

/**
 * Server-side input checks for every console action. The database re-checks everything; these turn
 * malformed input into a clear message instead of a Postgres error, and keep junk out of the audit log.
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MAX_REASON = 500;

export interface Invalid {
  error: string;
}

const NOT_VALID = 'That request was not valid. Reload the page and try again.';

export function uuid(form: FormData, key: string): string | Invalid {
  const v = field(form, key);
  return UUID.test(v) ? v : { error: NOT_VALID };
}

export function oneOf<T extends string>(form: FormData, key: string, allowed: readonly T[]): T | Invalid {
  const v = field(form, key);
  return (allowed as readonly string[]).includes(v) ? (v as T) : { error: NOT_VALID };
}

/** A required free-text reason, bounded so one request cannot store a novel in the audit log. */
export function reason(form: FormData, key = 'reason'): string | Invalid {
  const v = field(form, key);
  if (!v) return { error: 'Write a reason. It is saved in the audit log.' };
  if (v.length > MAX_REASON) return { error: `Keep the reason under ${MAX_REASON} characters.` };
  return v;
}

/** A required text field with a length window; `optional` turns an empty value into null. */
export function text(form: FormData, key: string, label: string, min: number, max: number): string | Invalid;
export function text(form: FormData, key: string, label: string, min: number, max: number, optional: true): string | null | Invalid;
export function text(form: FormData, key: string, label: string, min: number, max: number, optional = false): string | null | Invalid {
  const v = field(form, key);
  if (!v && optional) return null;
  if (v.length < min) return { error: min <= 1 ? `${label} is required.` : `${label} needs at least ${min} characters.` };
  if (v.length > max) return { error: `${label} must be ${max} characters or fewer.` };
  return v;
}

/** A whole number within bounds. */
export function int(form: FormData, key: string, label: string, min: number, max: number): number | Invalid {
  const raw = field(form, key);
  const v = Number(raw);
  if (!raw || !Number.isInteger(v)) return { error: `${label} must be a whole number.` };
  if (v < min || v > max) return { error: `${label} must be between ${min} and ${max}.` };
  return v;
}

/** A decimal number within bounds. */
export function num(form: FormData, key: string, label: string, min: number, max: number): number | Invalid {
  const raw = field(form, key);
  const v = Number(raw);
  if (!raw || !Number.isFinite(v)) return { error: `${label} must be a number.` };
  if (v < min || v > max) return { error: `${label} must be between ${min} and ${max}.` };
  return v;
}

/** An optional uuid: empty means null. */
export function optionalUuid(form: FormData, key: string): string | null | Invalid {
  return field(form, key) ? uuid(form, key) : null;
}

export const bad =(v: unknown): v is Invalid => typeof v === 'object' && v !== null && 'error' in v;

/** Returns the first Invalid among the values, or null when all are fine. */
export function firstInvalid(...values: unknown[]): Invalid | null {
  for (const v of values) if (bad(v)) return v;
  return null;
}
