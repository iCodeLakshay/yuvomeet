// PL-6, S-36, S-37: one GPS fix, evaluated in memory against the venue pin. The coordinate
// is never written to a table or a log; only checked_in_at is stored.
import { evaluateCheckIn } from '../../../packages/shared/src/geo.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { admin, rateLimit, requireUser, unwrap } from '../_shared/supabase.ts';

interface Context {
  starts_at: string;
  venue_lat: number;
  venue_lng: number;
  member_status: string | null;
  checked_in_at: string | null;
  radius_m: number;
  window_min: number;
  max_accuracy_m: number;
}

const MESSAGES = {
  MOCK_LOCATION: 'Turn off mock location to check in.',
  LOW_ACCURACY: 'Your GPS signal is weak. Step outside or near the entrance and try again.',
  OUTSIDE_WINDOW: 'Check-in opens 30 minutes before the start and closes 30 minutes after.',
  TOO_FAR: 'You need to be within 150 m of the venue to check in.',
} as const;

serve(async (req) => {
  const userId = await requireUser(req);
  await rateLimit(userId, 'check-in', 3_600, 10);
  const { planId, lat, lng, accuracy, mocked } = await readJson<{
    planId?: string; lat?: number; lng?: number; accuracy?: number; mocked?: boolean;
  }>(req);
  if (typeof planId !== 'string' || ![lat, lng, accuracy].every((v) => typeof v === 'number' && Number.isFinite(v))) {
    throw new HttpError(400, 'BAD_REQUEST', 'Location unavailable. Try again.');
  }

  const ctx = unwrap(await admin.rpc('svc_check_in_context', { p_user: userId, p_plan_id: planId })) as unknown as Context | null;
  if (!ctx || !['approved', 'attended'].includes(ctx.member_status ?? '')) {
    throw new HttpError(403, 'NOT_MEMBER', 'Only approved members can check in.');
  }
  if (ctx.checked_in_at) return json({ checked_in_at: ctx.checked_in_at });

  const result = evaluateCheckIn(
    { userLat: lat!, userLng: lng!, accuracyMeters: accuracy!, mocked, venueLat: ctx.venue_lat, venueLng: ctx.venue_lng, planStartsAtIso: ctx.starts_at },
    { radiusM: ctx.radius_m, windowMin: ctx.window_min, maxAccuracyM: ctx.max_accuracy_m },
  );
  if (!result.allowed) {
    throw new HttpError(400, result.code, MESSAGES[result.code]);
  }

  const checkedInAt = unwrap(await admin.rpc('svc_mark_checked_in', { p_user: userId, p_plan_id: planId }));
  return json({ checked_in_at: checkedInAt, minutes_from_start: result.minutesFromStart });
});
