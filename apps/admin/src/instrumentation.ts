import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from '@yuvomeet/shared';

/** Server-side Sentry with the shared PII scrubber (S-9). */
export function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend: (event) => scrubSentryEvent(event),
  });
}

export const onRequestError = Sentry.captureRequestError;
