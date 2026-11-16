// Public waitlist for the landing page (apps/landing). No account and no JWT (config.toml
// verify_jwt = false): the browser posts { email, city, consent, website } from an allowed origin.
//
// - CORS: exact origins from WAITLIST_ALLOWED_ORIGINS; anything else gets 403 and no CORS headers.
// - Size: bodies over 2 KB are refused before parsing.
// - Abuse: 5 tries per 10 minutes per connection, keyed by an HMAC of the IP (the IP is not stored);
//   a filled honeypot gets the normal answer and is not written.
// - Privacy: the same 200 for a new and an existing address, so the form cannot tell anyone whether
//   an email is already on the list; the email is never logged.
import * as Sentry from 'npm:@sentry/deno@9.15.0';
import { hmacSha256Hex, requireSecret } from '../_shared/crypto.ts';
import '../_shared/http.ts'; // initialises Sentry (scrubbed, no PII) when SENTRY_DSN is set
import { admin } from '../_shared/supabase.ts';
import { allowedOrigins, clientIp, corsHeaders, MAX_BODY_BYTES, parseWaitlist, WAITLIST_CONSENT_TEXT } from '../_shared/waitlist.ts';

const ALLOWED = allowedOrigins(Deno.env.get('WAITLIST_ALLOWED_ORIGINS'));

const MESSAGES = {
  body: 'Send the form again.',
  email: 'Write an email address we can reach you on.',
  city: 'Write the city you live in.',
  consent: 'Tick the box so we may email you about the launch.',
} as const;

function reply(status: number, body: unknown, cors: Record<string, string> | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(cors ?? {}) },
  });
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'), ALLOWED);

  if (req.method === 'OPTIONS') {
    return cors ? new Response(null, { status: 204, headers: cors }) : new Response(null, { status: 403 });
  }
  if (req.method !== 'POST') return reply(405, { error: { code: 'METHOD', message: 'Method not allowed.' } }, cors);
  if (!cors) return reply(403, { error: { code: 'ORIGIN', message: 'Not allowed.' } }, null);

  const declared = Number(req.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BODY_BYTES) return reply(413, { error: { code: 'TOO_LARGE', message: MESSAGES.body } }, cors);

  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return reply(413, { error: { code: 'TOO_LARGE', message: MESSAGES.body } }, cors);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return reply(400, { error: { code: 'BAD_REQUEST', field: 'body', message: MESSAGES.body } }, cors);
    }

    const parsed = parseWaitlist(body);
    if (!parsed.ok) {
      return reply(400, { error: { code: 'INVALID', field: parsed.field, message: MESSAGES[parsed.field] } }, cors);
    }
    if (parsed.value.bot) return reply(200, { ok: true }, cors);

    const rateKey = await hmacSha256Hex(requireSecret('WAITLIST_PEPPER'), clientIp(req.headers));
    const { data, error } = await admin.rpc('svc_web_waitlist_join', {
      p_rate_key: rateKey,
      p_email: parsed.value.email,
      p_city: parsed.value.city,
      p_consent_text: WAITLIST_CONSENT_TEXT,
    });
    if (error) throw error;
    if (data === false) return reply(429, { error: { code: 'RATE_LIMITED', message: 'Too many tries. Wait a few minutes.' } }, cors);
    return reply(200, { ok: true }, cors);
  } catch (err) {
    if (Deno.env.get('SENTRY_DSN')) Sentry.captureException(err);
    console.error('join-waitlist', (err as { code?: string })?.code ?? 'error');
    return reply(500, { error: { code: 'INTERNAL', message: 'Something went wrong. Try again.' } }, cors);
  }
});
