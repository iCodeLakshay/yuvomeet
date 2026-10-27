import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkPlanTiming,
  checkText,
  evaluateCheckIn,
  getReportSeverity,
  isOtpCode,
  sanitizeAnalyticsPayload,
  screenText,
  scrubSentryEvent,
  toE164India,
} from '../index.ts';

describe('S-20 / CH-3 screening', () => {
  it('allows ordinary plan text', () => {
    assert.equal(screenText('Bringing Catan & Sequence to Chai Sutta Bar at 6 PM!'), null);
    assert.equal(screenText('installing the new board game'), null);
  });

  it('rejects phone numbers in spaced, Devanagari and word forms', () => {
    assert.equal(screenText('Call me on 98 765 43210'), 'phone_number');
    assert.equal(screenText('My number is ९८७६५४३२१०'), 'phone_number');
    assert.equal(screenText('nine eight seven six five four three two one zero'), 'phone_number');
  });

  it('rejects links and handles', () => {
    assert.equal(screenText('Join https://wa.me/919876543210'), 'phone_number');
    assert.equal(screenText('see www.example.com'), 'external_link');
    assert.equal(screenText('add me on insta @lakshay_kota'), 'social_handle');
  });

  it('checkText reports length and screening errors', () => {
    assert.equal(checkText('Hi', 'Plan title', 3, 60), 'Plan title needs at least 3 characters.');
    assert.equal(checkText('Evening chai', 'Plan title', 3, 60), null);
    assert.equal(checkText('dm me 9876543210', 'Bio', 0, 300), "Phone numbers can't be shared here.");
  });
});

describe('phone and OTP input', () => {
  it('normalises Indian mobiles to E.164', () => {
    assert.equal(toE164India('98765 43210'), '+919876543210');
    assert.equal(toE164India('+91 98765-43210'), '+919876543210');
    assert.equal(toE164India('12345'), null);
    assert.equal(toE164India('5876543210'), null);
  });

  it('accepts only 6-digit codes', () => {
    assert.ok(isOtpCode('482910'));
    assert.ok(!isOtpCode('48291'));
  });
});

describe('S-36 / S-37 check-in', () => {
  const venue = { venueLat: 25.1483, venueLng: 75.8442, planStartsAtIso: '2026-10-26T14:00:00.000Z' };

  it('allows a close, accurate fix within the window', () => {
    const res = evaluateCheckIn({ ...venue, userLat: 25.1486, userLng: 75.8445, accuracyMeters: 25,
      nowMs: Date.parse('2026-10-26T13:50:00.000Z') });
    assert.equal(res.allowed, true);
  });

  it('rejects far, early, inaccurate and mocked fixes', () => {
    const at = Date.parse('2026-10-26T14:00:00.000Z');
    const far = evaluateCheckIn({ ...venue, userLat: 25.151, userLng: 75.848, accuracyMeters: 20, nowMs: at });
    assert.deepEqual([far.allowed, !far.allowed && far.code], [false, 'TOO_FAR']);
    const early = evaluateCheckIn({ ...venue, userLat: 25.1483, userLng: 75.8442, accuracyMeters: 15,
      nowMs: Date.parse('2026-10-26T13:25:00.000Z') });
    assert.equal(!early.allowed && early.code, 'OUTSIDE_WINDOW');
    const blurry = evaluateCheckIn({ ...venue, userLat: 25.1483, userLng: 75.8442, accuracyMeters: 140, nowMs: at });
    assert.equal(!blurry.allowed && blurry.code, 'LOW_ACCURACY');
    const mocked = evaluateCheckIn({ ...venue, userLat: 25.1483, userLng: 75.8442, accuracyMeters: 5, mocked: true, nowMs: at });
    assert.equal(!mocked.allowed && mocked.code, 'MOCK_LOCATION');
  });
});

describe('S-31 / S-32 plan timing', () => {
  // 2026-10-26 10:00 IST
  const now = Date.parse('2026-10-26T04:30:00.000Z');
  const ist = (h: number, m = 0) => new Date(Date.parse('2026-10-26T00:00:00+05:30') + (h * 60 + m) * 60_000);

  it('rejects plans starting in under 3 hours', () => {
    assert.match(checkPlanTiming({ startsAt: ist(12, 59), endsAt: ist(14), capacity: 6, lateEventsAllowed: false, nowMs: now }) ?? '', /3 hours/);
  });

  it('applies the 21:00 cut-off unless the venue allows late events', () => {
    assert.match(checkPlanTiming({ startsAt: ist(19), endsAt: ist(21, 1), capacity: 6, lateEventsAllowed: false, nowMs: now }) ?? '', /9:00 PM/);
    assert.equal(checkPlanTiming({ startsAt: ist(19), endsAt: ist(21), capacity: 6, lateEventsAllowed: false, nowMs: now }), null);
    assert.equal(checkPlanTiming({ startsAt: ist(19), endsAt: ist(22, 30), capacity: 6, lateEventsAllowed: true, nowMs: now }), null);
  });

  it('checks group size', () => {
    assert.match(checkPlanTiming({ startsAt: ist(15), endsAt: ist(16), capacity: 11, lateEventsAllowed: false, nowMs: now }) ?? '', /Group size/);
  });
});

describe('S-9 privacy helpers', () => {
  it('drops non-allow-listed analytics properties', () => {
    const payload = sanitizeAnalyticsPayload(
      'plan_viewed',
      // @ts-expect-error runtime stripping of injected PII
      { plan_id: 'p1', audience: 'women_only', activity: 'chai-cafe', source: 'feed', phone: '+919876543210' },
      'kota',
    );
    assert.deepEqual(payload, { city: 'kota', plan_id: 'p1', audience: 'women_only', activity: 'chai-cafe', source: 'feed' });
  });

  it('reduces Sentry events to a user id and scrubs PII keys', () => {
    const scrubbed = scrubSentryEvent({
      user: { id: 'user-1', email: 'a@b.c', username: 'Riya' },
      request: { url: 'https://x.supabase.co/rest/v1/plans?select=*', data: { phone: '9876543210' } },
      extra: { phone: '9876543210', planId: 'p1', nested: { first_name: 'Riya', count: 2 } },
    });
    assert.deepEqual(scrubbed.user, { id: 'user-1' });
    assert.deepEqual(scrubbed.request, { url: 'https://x.supabase.co/rest/v1/plans' });
    assert.deepEqual(scrubbed.extra, { planId: 'p1', nested: { count: 2 } });
  });

  it('classifies severe report reasons', () => {
    assert.equal(getReportSeverity('unsafe_at_plan'), 'severe');
    assert.equal(getReportSeverity('no_show'), 'standard');
  });
});
