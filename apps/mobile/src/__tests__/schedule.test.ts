import { PLAN_CUTOFF_LOCAL_HOUR, PLAN_MIN_LEAD_HOURS } from '@yuvomeet/shared';
import { atMinutes, dayLabel, isStartAllowed, minutesLabel, startProblem, suggestStart, todayKey } from '../features/plans/schedule';

// 2026-11-02 09:00 IST (03:30 UTC).
const NOW = Date.UTC(2026, 10, 2, 3, 30);
const today = todayKey(NOW);
const tomorrow = today + 86_400_000;

describe('plan scheduling rules (S-31, S-32)', () => {
  it('day keys are midnight IST', () => {
    expect(new Date(today).toISOString()).toBe('2026-11-01T18:30:00.000Z');
    expect(dayLabel(today, NOW).label).toBe('Today');
    expect(dayLabel(tomorrow, NOW).label).toBe('Tomorrow');
  });

  it('rejects starts before 6 AM', () => {
    expect(startProblem(tomorrow, 5 * 60 + 30, 60, NOW)).toMatch(/6:00 AM/);
  });

  it(`requires ${PLAN_MIN_LEAD_HOURS} hours of lead time`, () => {
    // 10:00 today is one hour away.
    expect(startProblem(today, 10 * 60, 60, NOW)).toMatch(/hours from now/);
    expect(isStartAllowed(today, 13 * 60, 60, NOW)).toBe(true);
  });

  it(`must end by ${PLAN_CUTOFF_LOCAL_HOUR}:00 unless the venue allows late events`, () => {
    const lateStart = (PLAN_CUTOFF_LOCAL_HOUR - 1) * 60;
    expect(isStartAllowed(tomorrow, lateStart, 120, NOW, false)).toBe(false);
    expect(isStartAllowed(tomorrow, lateStart, 120, NOW, true)).toBe(true);
    expect(isStartAllowed(tomorrow, lateStart, 60, NOW, false)).toBe(true);
  });

  it('suggests the first allowed half hour, or null when the day is over', () => {
    expect(suggestStart(today, 60, NOW)).toBe(12 * 60);
    expect(suggestStart(today, 60, today + 23 * 3_600_000)).toBeNull();
  });

  it('formats clock labels and builds dates in IST', () => {
    expect(minutesLabel(0)).toBe('12:00 AM');
    expect(minutesLabel(12 * 60 + 30)).toBe('12:30 PM');
    expect(minutesLabel(19 * 60 + 5)).toBe('7:05 PM');
    expect(atMinutes(tomorrow, 19 * 60).toISOString()).toBe('2026-11-03T13:30:00.000Z');
  });
});
