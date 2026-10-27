import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from '@yuvomeet/shared';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    // Console pages show member data; never record sessions.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend: (event) => scrubSentryEvent(event),
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
