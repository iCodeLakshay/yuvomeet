// HTTP helpers shared by every Edge Function. Errors return { error: { code, message } }
// where message is safe to show in the app. Request bodies are never logged (S-9).
import * as Sentry from 'npm:@sentry/deno@9.15.0';
import { scrubSentryEvent } from '../../../packages/shared/src/analytics.ts';

const dsn = Deno.env.get('SENTRY_DSN');
if (dsn) {
  Sentry.init({
    dsn,
    environment: Deno.env.get('APP_ENV') ?? 'local',
    sendDefaultPii: false,
    beforeSend: (event) => scrubSentryEvent(event),
  });
}

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Invalid request.');
  }
}

/** Wraps a handler: method check, HttpError mapping, Sentry capture for the rest. */
export function serve(handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => {
    if (req.method !== 'POST') return json({ error: { code: 'METHOD', message: 'Method not allowed.' } }, 405);
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: { code: err.code, message: err.message } }, err.status);
      // Postgres errors raised by private.fail carry a user-facing message and a hint code.
      const pg = err as { message?: string; hint?: string; code?: string };
      if (pg?.code === 'P0001' && pg.message) {
        return json({ error: { code: pg.hint ?? 'INVALID', message: pg.message } }, 400);
      }
      if (dsn) Sentry.captureException(err);
      console.error(new URL(req.url).pathname, pg?.code ?? 'error');
      return json({ error: { code: 'INTERNAL', message: 'Something went wrong. Try again.' } }, 500);
    }
  });
}

export const isLocal = () => (Deno.env.get('APP_ENV') ?? 'local') === 'local';
