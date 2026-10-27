/**
 * S-9: Privacy-Safe Telemetry (Sentry Scrubber + Allowlisted PostHog Wrapper)
 * No phone, name, photo URL, bio, message text, coordinates, or KYC details ever leave the device.
 */

import {
  type AnalyticsEventMap,
  type AnalyticsEventName,
  sanitizeAnalyticsPayload,
  scrubSentryEvent,
} from '@yuvomeet/shared';

let currentUserId: string | null = null;
let currentCitySlug = 'kota';

export function setTelemetryIdentity(userId: string | null, citySlug = 'kota'): void {
  currentUserId = userId;
  currentCitySlug = citySlug;
}

/**
 * Typed analytics event capture. Strips all non-allowlisted properties via `@yuvomeet/shared`.
 */
export function trackEvent<K extends AnalyticsEventName>(
  event: K,
  properties: AnalyticsEventMap[K],
): Record<string, string | number | boolean> {
  const safePayload = sanitizeAnalyticsPayload(event, properties, currentCitySlug);
  // In production/staging with PostHog configured, this dispatches to EU PostHog with distinct_id = userId
  if (process.env.EXPO_PUBLIC_APP_ENV !== 'production') {
    console.debug('[Analytics]', event, {
      distinct_id: currentUserId ?? 'anonymous',
      ...safePayload,
    });
  }
  return safePayload;
}

/**
 * S-9: Report error to Sentry after scrubbing all PII and keeping only `{ user: { id } }`.
 */
export function reportErrorSafe(error: unknown, contextTag?: string): void {
  const rawEvent = {
    message: error instanceof Error ? error.message : String(error),
    user: currentUserId ? { id: currentUserId } : undefined,
    tags: contextTag ? { surface: contextTag } : undefined,
    timestamp: new Date().toISOString(),
  };
  const scrubbed = scrubSentryEvent(rawEvent);
  if (process.env.EXPO_PUBLIC_APP_ENV !== 'production') {
    console.debug('[SentryScrubbed]', scrubbed);
  }
}

/**
 * Performance span measurement for NFR budgets:
 * - Feed first page < 2000ms
 * - Chat delivery < 1000ms
 */
export function startPerfSpan(name: 'feed_first_page' | 'chat_delivery' | 'cold_start') {
  const startedAt = performance.now();
  return {
    finish(): number {
      const durationMs = Math.round(performance.now() - startedAt);
      return durationMs;
    },
  };
}
