import * as Sentry from '@sentry/react-native';
import {
  sanitizeAnalyticsPayload,
  scrubSentryEvent,
  type AnalyticsEventMap,
  type AnalyticsEventName,
} from '@yuvomeet/shared';
import PostHog from 'posthog-react-native';
import { env } from './env';

/**
 * S-9: crash reports and analytics carry the Supabase user id only. Sentry events pass the
 * shared scrubber; PostHog only receives allow-listed properties. No replay, no autocapture.
 */
export const posthog = env.posthogKey
  ? new PostHog(env.posthogKey, {
      host: env.posthogHost,
      captureAppLifecycleEvents: false,
      enableSessionReplay: false,
      personProfiles: 'identified_only',
      disabled: env.appEnv === 'development',
    })
  : null;

export function initTelemetry() {
  if (!env.sentryDsn) return;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.appEnv,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: env.appEnv === 'production' ? 0.2 : 1,
    beforeSend: (event) => scrubSentryEvent(event),
    beforeBreadcrumb: (crumb) => (crumb.category === 'console' || crumb.category === 'ui.input' ? null : crumb),
  });
}

let city = 'kota';

export function identify(userId: string | null, citySlug?: string) {
  if (citySlug) city = citySlug;
  Sentry.setUser(userId ? { id: userId } : null);
  if (!posthog) return;
  if (userId) posthog.identify(userId);
  else posthog.reset();
}

export function track<K extends AnalyticsEventName>(event: K, props: AnalyticsEventMap[K]) {
  posthog?.capture(event, sanitizeAnalyticsPayload(event, props, city));
}

export function reportError(error: unknown) {
  Sentry.captureException(error);
}

/** Performance budgets (architecture.md): feed first page, chat delivery, cold start. */
export function startSpan(name: 'feed_first_page' | 'chat_delivery') {
  const start = performance.now();
  return () => {
    Sentry.setMeasurement(name, performance.now() - start, 'millisecond');
  };
}

/** Sentry.wrap only when Sentry was initialised; otherwise it warns on every launch. */
export const wrapRoot: typeof Sentry.wrap = env.sentryDsn ? Sentry.wrap : (root) => root as never;
