/**
 * Pure business-logic tests for the mobile app. Run with Node's built-in runner (no RN runtime):
 *   pnpm --filter @yuvomeet/mobile test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PLAN_CUTOFF_LOCAL_HOUR, PLAN_MIN_LEAD_HOURS } from '@yuvomeet/shared';
import { bodyMentions, mentionQuery, splitMentions } from '../features/chat/mentions.ts';
import { dayLabel, isStartAllowed, minutesLabel, startProblem, suggestStart, todayKey } from '../features/plans/schedule.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// 2026-11-02 09:00 IST (03:30 UTC).
const NOW = Date.UTC(2026, 10, 2, 3, 30);
const today = todayKey(NOW);
const tomorrow = today + DAY;

describe('plan scheduling', () => {
  it('day keys are midnight IST', () => {
    assert.equal(today, Date.UTC(2026, 10, 1, 18, 30));
    assert.equal(dayLabel(today, NOW).label, 'Today');
    assert.equal(dayLabel(tomorrow, NOW).label, 'Tomorrow');
  });

  it('rejects starts before 6 AM', () => {
    assert.match(startProblem(tomorrow, 5 * 60 + 30, 60, NOW) ?? '', /6:00 AM/);
  });

  it('enforces the minimum lead time', () => {
    const tooSoon = 9 * 60 + 30; // 30 minutes from NOW
    assert.match(startProblem(today, tooSoon, 60, NOW) ?? '', new RegExp(`${PLAN_MIN_LEAD_HOURS} hours`));
    const later = 9 * 60 + PLAN_MIN_LEAD_HOURS * 60;
    assert.equal(startProblem(today, later, 60, NOW), null);
  });

  it('plans must end by the cutoff unless the venue allows late events', () => {
    const start = PLAN_CUTOFF_LOCAL_HOUR * 60 - 30;
    assert.ok(startProblem(tomorrow, start, 60, NOW, false));
    assert.equal(startProblem(tomorrow, start, 60, NOW, true), null);
  });

  it('suggests the first allowed half-hour slot, or null when the day is full', () => {
    const s = suggestStart(tomorrow, 60, NOW);
    assert.equal(s, 6 * 60);
    assert.ok(s !== null && isStartAllowed(tomorrow, s, 60, NOW));
    // Late in the evening there is no slot left today.
    const lateNow = today + 23 * HOUR;
    assert.equal(suggestStart(today, 60, lateNow), null);
  });

  it('formats minutes as 12-hour labels', () => {
    assert.equal(minutesLabel(0), '12:00 AM');
    assert.equal(minutesLabel(6 * 60 + 5), '6:05 AM');
    assert.equal(minutesLabel(12 * 60), '12:00 PM');
    assert.equal(minutesLabel(21 * 60 + 30), '9:30 PM');
  });
});

describe('chat mentions', () => {
  it('detects the @token being typed', () => {
    assert.equal(mentionQuery('hey @An'), 'An');
    assert.equal(mentionQuery('@'), '');
    assert.equal(mentionQuery('email me@x.com'), null);
    assert.equal(mentionQuery('hey @Ann done'), null);
  });

  it('matches whole names only', () => {
    assert.equal(bodyMentions('hi @Ann', 'Ann'), true);
    assert.equal(bodyMentions('hi @Anna', 'Ann'), false);
    assert.equal(bodyMentions('cost $5 @A.B', 'A.B'), true);
  });

  it('splits bodies into text and mention runs, preferring the longest name', () => {
    assert.deepEqual(splitMentions('hi @Anna and @Ann!', ['Ann', 'Anna']), [
      { text: 'hi ', mention: false },
      { text: '@Anna', mention: true },
      { text: ' and @Ann!', mention: false },
    ]);
    assert.deepEqual(splitMentions('plain', []), [{ text: 'plain', mention: false }]);
  });
});
