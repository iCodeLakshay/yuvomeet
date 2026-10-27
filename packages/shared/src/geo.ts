/**
 * S-36, PL-6: Haversine distance & check-in verification rules.
 * Coordinates are verified in memory and NEVER persisted.
 */

import {
  CHECKIN_MAX_ACCURACY_M,
  CHECKIN_RADIUS_M,
  CHECKIN_WINDOW_MIN,
} from './constants.ts';

const EARTH_RADIUS_M = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_M * c);
}

export interface CheckInEvaluationInput {
  userLat: number;
  userLng: number;
  accuracyMeters: number;
  mocked?: boolean;
  venueLat: number;
  venueLng: number;
  planStartsAtIso: string;
  nowIso?: string;
}

export type CheckInEvaluationResult =
  | {
      allowed: true;
      distanceMeters: number;
      minutesFromStart: number;
    }
  | {
      allowed: false;
      code:
        | 'MOCK_LOCATION_DETECTED'
        | 'LOW_GPS_ACCURACY'
        | 'OUTSIDE_TIME_WINDOW'
        | 'TOO_FAR_FROM_VENUE';
      distanceMeters: number;
      minutesFromStart: number;
    };

export function evaluateCheckIn(input: CheckInEvaluationInput): CheckInEvaluationResult {
  const nowMs = input.nowIso ? new Date(input.nowIso).getTime() : Date.now();
  const startMs = new Date(input.planStartsAtIso).getTime();
  const minutesFromStart = Math.round((nowMs - startMs) / 60000);
  const distanceMeters = haversineDistanceMeters(
    input.userLat,
    input.userLng,
    input.venueLat,
    input.venueLng,
  );

  // S-37: Reject Android mock location
  if (input.mocked) {
    return {
      allowed: false,
      code: 'MOCK_LOCATION_DETECTED',
      distanceMeters,
      minutesFromStart,
    };
  }

  // S-36: Accuracy must be <= 100 m
  if (input.accuracyMeters > CHECKIN_MAX_ACCURACY_M) {
    return {
      allowed: false,
      code: 'LOW_GPS_ACCURACY',
      distanceMeters,
      minutesFromStart,
    };
  }

  // S-36: Within 30 minutes either side of starts_at
  if (Math.abs(minutesFromStart) > CHECKIN_WINDOW_MIN) {
    return {
      allowed: false,
      code: 'OUTSIDE_TIME_WINDOW',
      distanceMeters,
      minutesFromStart,
    };
  }

  // S-36: Distance to venue pin <= 150 m
  if (distanceMeters > CHECKIN_RADIUS_M) {
    return {
      allowed: false,
      code: 'TOO_FAR_FROM_VENUE',
      distanceMeters,
      minutesFromStart,
    };
  }

  return {
    allowed: true,
    distanceMeters,
    minutesFromStart,
  };
}
