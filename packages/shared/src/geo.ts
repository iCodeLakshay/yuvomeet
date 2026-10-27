/**
 * PL-6, S-36, S-37: check-in rules. Used by the check-in Edge Function; the
 * coordinate is evaluated in memory and never stored or logged.
 */

import { CHECKIN_MAX_ACCURACY_M, CHECKIN_RADIUS_M, CHECKIN_WINDOW_MIN } from './constants.ts';

const EARTH_RADIUS_M = 6371000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export interface CheckInRules {
  radiusM: number;
  windowMin: number;
  maxAccuracyM: number;
}

export const DEFAULT_CHECKIN_RULES: CheckInRules = {
  radiusM: CHECKIN_RADIUS_M,
  windowMin: CHECKIN_WINDOW_MIN,
  maxAccuracyM: CHECKIN_MAX_ACCURACY_M,
};

export interface CheckInInput {
  userLat: number;
  userLng: number;
  accuracyMeters: number;
  mocked?: boolean;
  venueLat: number;
  venueLng: number;
  planStartsAtIso: string;
  nowMs?: number;
}

export type CheckInCode = 'MOCK_LOCATION' | 'LOW_ACCURACY' | 'OUTSIDE_WINDOW' | 'TOO_FAR';

export type CheckInResult =
  | { allowed: true; distanceMeters: number; minutesFromStart: number }
  | { allowed: false; code: CheckInCode; distanceMeters: number; minutesFromStart: number };

export function evaluateCheckIn(input: CheckInInput, rules: CheckInRules = DEFAULT_CHECKIN_RULES): CheckInResult {
  const minutesFromStart = Math.round(((input.nowMs ?? Date.now()) - Date.parse(input.planStartsAtIso)) / 60000);
  const distanceMeters = haversineDistanceMeters(input.userLat, input.userLng, input.venueLat, input.venueLng);
  const base = { distanceMeters, minutesFromStart };

  if (input.mocked) return { allowed: false, code: 'MOCK_LOCATION', ...base };
  if (!(input.accuracyMeters <= rules.maxAccuracyM)) return { allowed: false, code: 'LOW_ACCURACY', ...base };
  if (Math.abs(minutesFromStart) > rules.windowMin) return { allowed: false, code: 'OUTSIDE_WINDOW', ...base };
  if (distanceMeters > rules.radiusM) return { allowed: false, code: 'TOO_FAR', ...base };
  return { allowed: true, ...base };
}
