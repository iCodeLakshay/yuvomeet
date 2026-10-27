import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeAgeBand,
  CreatePlanSchema,
  evaluateCheckIn,
  getReportSeverity,
  ProfileCreateSchema,
  sanitizeAnalyticsPayload,
  screenTextContent,
  scrubSentryEvent,
} from '../index.ts';

describe('S-20 / VR-4 / CH-3: Text Screening', () => {
  it('allows clean Hindi and English campus meetup text', () => {
    assert.deepEqual(
      screenTextContent('Bringing Catan & Sequence to Chai Sutta Bar at 6 PM!'),
      { action: 'allow' },
    );
  });

  it('rejects spaced, dotted, and Devanagari Indian phone numbers', () => {
    assert.equal(screenTextContent('Call me on 98 765 43210').action, 'reject');
    assert.equal(screenTextContent('My number is ९८७६५४३२१०').action, 'reject');
    assert.equal(screenTextContent('nine eight seven six five four three two one zero').action, 'reject');
  });

  it('rejects social handles and external links', () => {
    assert.equal(screenTextContent('Add me on insta @lakshay_kota').action, 'reject');
    assert.equal(screenTextContent('Join https://wa.me/919876543210').action, 'reject');
  });

  it('holds abusive or explicit words for moderation review', () => {
    const res = screenTextContent('Looking for hookup tonight');
    assert.equal(res.action, 'hold');
  });
});

describe('S-36 & S-37: Venue Check-in Validation', () => {
  const venueLat = 25.1483;
  const venueLng = 75.8442;
  const startsAt = '2026-10-26T14:00:00.000Z';

  it('allows check-in within 150m and ±30m of start time with good accuracy', () => {
    const res = evaluateCheckIn({
      userLat: 25.1486,
      userLng: 75.8445,
      accuracyMeters: 25,
      mocked: false,
      venueLat,
      venueLng,
      planStartsAtIso: startsAt,
      nowIso: '2026-10-26T13:50:00.000Z', // -10 min
    });
    assert.equal(res.allowed, true);
    assert.ok(res.distanceMeters <= 150);
  });

  it('rejects check-in at > 150m or > 30m before start or mocked GPS', () => {
    const farRes = evaluateCheckIn({
      userLat: 25.151,
      userLng: 75.848,
      accuracyMeters: 20,
      venueLat,
      venueLng,
      planStartsAtIso: startsAt,
      nowIso: '2026-10-26T14:00:00.000Z',
    });
    assert.equal(farRes.allowed, false);
    if (!farRes.allowed) assert.equal(farRes.code, 'TOO_FAR_FROM_VENUE');

    const earlyRes = evaluateCheckIn({
      userLat: venueLat,
      userLng: venueLng,
      accuracyMeters: 15,
      venueLat,
      venueLng,
      planStartsAtIso: startsAt,
      nowIso: '2026-10-26T13:25:00.000Z', // 35m before
    });
    assert.equal(earlyRes.allowed, false);
    if (!earlyRes.allowed) assert.equal(earlyRes.code, 'OUTSIDE_TIME_WINDOW');

    const mockedRes = evaluateCheckIn({
      userLat: venueLat,
      userLng: venueLng,
      accuracyMeters: 10,
      mocked: true,
      venueLat,
      venueLng,
      planStartsAtIso: startsAt,
      nowIso: '2026-10-26T14:00:00.000Z',
    });
    assert.equal(mockedRes.allowed, false);
    if (!mockedRes.allowed) assert.equal(mockedRes.code, 'MOCK_LOCATION_DETECTED');
  });
});

describe('S-31 & S-32: Plan Creation Schema', () => {
  it('rejects plans starting in less than 3 hours or ending after 21:00 IST without partner override', () => {
    const now = new Date();
    const twoHoursAhead = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
    const threeHoursAhead = new Date(now.getTime() + 3.5 * 3600 * 1000).toISOString();

    const tooSoon = CreatePlanSchema.safeParse({
      title: 'Evening Chai Meetup',
      description: 'Casual board games and chai',
      activity: 'chai-cafe',
      venueId: 'venue-1',
      startsAt: twoHoursAhead,
      endsAt: threeHoursAhead,
      capacity: 6,
      audience: 'everyone',
      venueLateEventsAllowed: true,
    });
    assert.equal(tooSoon.success, false);
  });

  it('requires at least 2 approved photos to complete profile (ON-3)', () => {
    const onePhoto = ProfileCreateSchema.safeParse({
      firstName: 'Riya',
      declaredGender: 'woman',
      bio: 'NEET aspirant in Talwandi',
      interests: ['chai-cafe', 'study-sessions'],
      languages: ['hi', 'en'],
      areaSlug: 'talwandi',
      approvedPhotoCount: 1,
    });
    assert.equal(onePhoto.success, false);
  });
});

describe('S-9 & S-18: Privacy Helpers (Age Band, Analytics Allowlist, Sentry Scrubber)', () => {
  it('computes age bands without exposing birth year', () => {
    assert.equal(computeAgeBand(2007, 2026), '18–20');
    assert.equal(computeAgeBand(2004, 2026), '21–24');
    assert.equal(computeAgeBand(1999, 2026), '25–30');
    assert.equal(computeAgeBand(1992, 2026), '30+');
  });

  it('strips non-allowlisted PII from analytics payloads and Sentry events', () => {
    const payload = sanitizeAnalyticsPayload(
      'plan_viewed',
      {
        plan_id: 'plan-123',
        audience: 'women_only',
        activity: 'chai-cafe',
        source: 'feed',
        // @ts-expect-error testing runtime stripping of injected PII
        phone: '+919876543210',
        first_name: 'Riya',
      },
      'kota',
    );
    assert.equal(payload.phone, undefined);
    assert.equal(payload.first_name, undefined);
    assert.equal(payload.plan_id, 'plan-123');
    assert.equal(payload.city, 'kota');

    const scrubbed = scrubSentryEvent({
      user: { id: 'user-1', email: 'test@example.com', username: 'Riya' },
      request: { data: { phone: '9876543210' }, headers: { Authorization: 'Bearer secret' } },
      extra: { phone: '9876543210', safeMetric: 42 },
    });
    assert.deepEqual(scrubbed.user, { id: 'user-1' });
    assert.equal(scrubbed.request.data, undefined);
    assert.equal(scrubbed.extra.phone, undefined);
    assert.equal(scrubbed.extra.safeMetric, 42);
  });

  it('classifies report severity accurately', () => {
    assert.equal(getReportSeverity('unsafe_at_plan'), 'severe');
    assert.equal(getReportSeverity('underage'), 'severe');
    assert.equal(getReportSeverity('no_show'), 'standard');
  });
});
