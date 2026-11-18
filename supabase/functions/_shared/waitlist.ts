// Pure helpers for the public join-waitlist function (apps/landing). Kept here so `deno test _shared/`
// covers them in CI.

/** The consent line the landing form shows next to its tick box (apps/landing/src/components/WaitlistForm.tsx). */
export const WAITLIST_CONSENT_TEXT = 'Email me once when Hengout opens in my city. My email is used for nothing else.';

/** Largest body the function reads; a real submission is under 300 bytes. */
export const MAX_BODY_BYTES = 2048;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Letters (any script), spaces, dots, apostrophes and hyphens: "Kota", "Navi Mumbai", "Thiruvananthapuram".
const CITY = /^[\p{L}][\p{L}\p{M} .'-]{1,59}$/u;

export interface WaitlistInput {
  email: string;
  city: string;
  consent: true;
  /** Honeypot: filled only by bots. */
  bot: boolean;
}

export type Parsed = { ok: true; value: WaitlistInput } | { ok: false; field: 'body' | 'email' | 'city' | 'consent' };

/** Validates the JSON body. Only the four known fields are read; anything else is ignored (no mass assignment). */
export function parseWaitlist(body: unknown): Parsed {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, field: 'body' };
  const b = body as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const city = typeof b.city === 'string' ? b.city.trim().replace(/\s+/g, ' ') : '';
  if (email.length < 6 || email.length > 254 || !EMAIL.test(email)) return { ok: false, field: 'email' };
  if (!CITY.test(city)) return { ok: false, field: 'city' };
  if (b.consent !== true) return { ok: false, field: 'consent' };
  const bot = typeof b.website === 'string' && b.website.length > 0;
  return { ok: true, value: { email, city, consent: true, bot } };
}

/** Parses WAITLIST_ALLOWED_ORIGINS ("https://a.example, https://b.example") into exact origins. */
export function allowedOrigins(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter((o) => /^https?:\/\/[^/\s]+$/.test(o)),
  );
}

/** CORS headers for an allowed origin; null when the origin is not on the list (no wildcard, ever). */
export function corsHeaders(origin: string | null, allowed: Set<string>): Record<string, string> | null {
  if (!origin || !allowed.has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** The client address as Supabase's edge forwards it (first hop of x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || headers.get('x-real-ip') || 'unknown';
}
