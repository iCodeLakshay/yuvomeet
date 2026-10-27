// Internal: drains private.analytics_outbox to PostHog's batch API (implementation-plan
// §Analytics). Called by pg_cron through pg_net. Props are re-checked against the shared
// allow-list, so a bad trigger can never leak a field (S-9).
import {
  sanitizeAnalyticsPayload,
  type AnalyticsEventMap,
  type AnalyticsEventName,
} from '../../../packages/shared/src/analytics.ts';
import { requireSecret, safeEqual } from '../_shared/crypto.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import { admin, unwrap } from '../_shared/supabase.ts';

interface Row {
  id: number;
  event: string;
  distinct_id: string;
  city_slug: string;
  props: Record<string, unknown>;
  created_at: string;
}

const SERVER_EVENTS = new Set<AnalyticsEventName>(['verification_passed', 'verification_failed', 'join_approved', 'plan_completed']);

serve(async (req) => {
  if (!safeEqual(req.headers.get('x-internal-secret') ?? '', requireSecret('INTERNAL_SECRET'))) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');
  }
  const rows = unwrap(await admin.rpc('svc_analytics_pending', { p_limit: 500 })) as Row[];
  if (rows.length === 0) return json({ sent: 0 });

  const key = Deno.env.get('POSTHOG_KEY');
  const batch = rows
    .filter((r) => SERVER_EVENTS.has(r.event as AnalyticsEventName))
    .map((r) => {
      const event = r.event as AnalyticsEventName;
      return {
        event,
        distinct_id: r.distinct_id,
        timestamp: r.created_at,
        properties: sanitizeAnalyticsPayload(event, r.props as unknown as AnalyticsEventMap[typeof event], r.city_slug),
      };
    });

  // No key (local or analytics disabled): drop rather than let the outbox grow.
  if (key && batch.length) {
    const host = Deno.env.get('POSTHOG_HOST') ?? 'https://eu.i.posthog.com';
    const res = await fetch(`${host}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, batch }),
    });
    if (!res.ok) throw new HttpError(502, 'POSTHOG_UNAVAILABLE', `PostHog returned ${res.status}`);
  }
  await admin.rpc('svc_analytics_ack', { p_ids: rows.map((r) => r.id) });
  return json({ sent: key ? batch.length : 0, dropped: key ? rows.length - batch.length : rows.length });
});
