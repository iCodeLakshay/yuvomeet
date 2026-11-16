/**
 * Content-Security-Policy for the admin console. Next injects small inline scripts and styles, so
 * script-src and style-src keep 'unsafe-inline'; the rest is the part that matters: no framing, no
 * plugins, forms post only to this site, and pages talk only to this site, Supabase (signed photo
 * URLs) and Sentry. A nonce-based script-src is the next step (docs/security.md).
 */
export function buildCsp(supabaseUrl: string | undefined, dev = false): string {
  let supabase = '';
  try {
    supabase = new URL(supabaseUrl ?? '').origin;
  } catch {
    supabase = '';
  }
  const sentry = ['https://*.ingest.sentry.io', 'https://*.ingest.de.sentry.io', 'https://*.ingest.us.sentry.io'];
  const list = (...parts: (string | false)[]) => parts.filter(Boolean).join(' ');
  return [
    "default-src 'self'",
    // React's dev build uses eval() to rebuild call stacks; production never does.
    dev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    list("img-src 'self' data: blob:", supabase),
    "font-src 'self' data:",
    list("connect-src 'self'", supabase, ...sentry),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}
