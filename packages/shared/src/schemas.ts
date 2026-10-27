/**
 * Shared Validation Schemas used by mobile app forms and Deno Edge Functions.
 * Enforces PRD and security.md rules with a zero-dependency `.safeParse` / `.parse` interface
 * compatible with Zod consumers and offline Node 22 native TypeScript test runners.
 */

import {
  MAX_APPEAL_CHARS,
  MAX_BIO_CHARS,
  MAX_JOIN_NOTE_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_PLAN_CAPACITY,
  MAX_PLAN_DURATION_HOURS,
  MAX_PROFILE_PHOTOS,
  MAX_REPORT_DETAILS_CHARS,
  MIN_PLAN_CAPACITY,
  MIN_PROFILE_PHOTOS,
  PLAN_CUTOFF_LOCAL_HOUR,
  PLAN_MIN_LEAD_HOURS,
  REPORT_REASONS,
  type ReportReason,
} from './constants.ts';
import { screenTextContent } from './screening.ts';

export interface ValidationIssue {
  path: string[];
  message: string;
}

export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: ValidationIssue[] } };

export interface SchemaValidator<T> {
  safeParse(input: unknown): SafeParseResult<T>;
  parse(input: unknown): T;
}

function createValidator<T>(
  validateFn: (input: any) => ValidationIssue[] | { data: T },
): SchemaValidator<T> {
  return {
    safeParse(input: unknown): SafeParseResult<T> {
      const result = validateFn(input);
      if (Array.isArray(result)) {
        return { success: false, error: { issues: result } };
      }
      return { success: true, data: result.data };
    },
    parse(input: unknown): T {
      const res = this.safeParse(input);
      if (!res.success) {
        throw new Error(res.error.issues.map((i) => i.message).join('; '));
      }
      return res.data;
    },
  };
}

function checkScreenedText(
  value: unknown,
  minLen: number,
  maxLen: number,
  fieldLabel: string,
  pathKey: string,
): ValidationIssue[] {
  if (typeof value !== 'string') {
    return [{ path: [pathKey], message: `${fieldLabel} is required` }];
  }
  const trimmed = value.trim();
  if (trimmed.length < minLen) {
    return [{ path: [pathKey], message: `${fieldLabel} must be at least ${minLen} characters` }];
  }
  if (trimmed.length > maxLen) {
    return [{ path: [pathKey], message: `${fieldLabel} must be at most ${maxLen} characters` }];
  }
  const screen = screenTextContent(trimmed);
  if (screen.action === 'reject') {
    return [
      {
        path: [pathKey],
        message:
          screen.reason === 'phone_number'
            ? 'Phone numbers cannot be shared here'
            : 'External links and social handles cannot be shared here',
      },
    ];
  }
  return [];
}

export const PhoneSignInSchema = createValidator<{ phone: string }>((input) => {
  const phone = typeof input?.phone === 'string' ? input.phone.trim() : '';
  if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone)) {
    return [{ path: ['phone'], message: 'Enter a valid 10-digit Indian mobile number' }];
  }
  return { data: { phone } };
});

export const OtpVerifySchema = createValidator<{ phone: string; token: string }>((input) => {
  const phone = typeof input?.phone === 'string' ? input.phone.trim() : '';
  const token = typeof input?.token === 'string' ? input.token.trim() : '';
  const issues: ValidationIssue[] = [];
  if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone)) {
    issues.push({ path: ['phone'], message: 'Invalid phone number' });
  }
  if (!/^\d{6}$/.test(token)) {
    issues.push({ path: ['token'], message: 'Enter the 6-digit verification code' });
  }
  return issues.length > 0 ? issues : { data: { phone, token } };
});

export interface ProfileCreateInput {
  firstName: string;
  declaredGender: 'woman' | 'man' | 'other';
  bio?: string;
  interests: string[];
  languages: ('en' | 'hi')[];
  areaSlug: string;
  collegeId?: string | null;
  approvedPhotoCount: number;
}

export const ProfileCreateSchema = createValidator<ProfileCreateInput>((input) => {
  const issues: ValidationIssue[] = [];
  issues.push(...checkScreenedText(input?.firstName, 2, 30, 'First name', 'firstName'));

  if (!['woman', 'man', 'other'].includes(input?.declaredGender)) {
    issues.push({ path: ['declaredGender'], message: 'Select a valid gender' });
  }

  if (input?.bio) {
    issues.push(...checkScreenedText(input.bio, 0, MAX_BIO_CHARS, 'Bio', 'bio'));
  }

  if (!Array.isArray(input?.interests) || input.interests.length < 2 || input.interests.length > 8) {
    issues.push({ path: ['interests'], message: 'Pick between 2 and 8 interests' });
  }

  if (!Array.isArray(input?.languages) || input.languages.length < 1) {
    issues.push({ path: ['languages'], message: 'Select at least 1 language' });
  }

  if (typeof input?.areaSlug !== 'string' || !input.areaSlug.trim()) {
    issues.push({ path: ['areaSlug'], message: 'Select your area in Kota' });
  }

  const photoCount = Number(input?.approvedPhotoCount ?? 0);
  if (photoCount < MIN_PROFILE_PHOTOS || photoCount > MAX_PROFILE_PHOTOS) {
    issues.push({
      path: ['approvedPhotoCount'],
      message: `Upload between ${MIN_PROFILE_PHOTOS} and ${MAX_PROFILE_PHOTOS} approved photos (Rule ON-3)`,
    });
  }

  return issues.length > 0 ? issues : { data: input as ProfileCreateInput };
});

export interface CreatePlanInput {
  title: string;
  description?: string | null;
  activity: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  audience: 'everyone' | 'women_only' | 'same_college';
  collegeId?: string | null;
  venueLateEventsAllowed?: boolean;
}

export const CreatePlanSchema = createValidator<CreatePlanInput>((input) => {
  const issues: ValidationIssue[] = [];
  issues.push(...checkScreenedText(input?.title, 3, 60, 'Plan title', 'title'));

  if (input?.description) {
    issues.push(...checkScreenedText(input.description, 0, 500, 'Description', 'description'));
  }

  if (typeof input?.activity !== 'string' || !input.activity.trim()) {
    issues.push({ path: ['activity'], message: 'Select an activity' });
  }

  if (typeof input?.venueId !== 'string' || !input.venueId.trim()) {
    issues.push({ path: ['venueId'], message: 'Select an approved public venue' });
  }

  const capacity = Number(input?.capacity);
  if (!Number.isInteger(capacity) || capacity < MIN_PLAN_CAPACITY || capacity > MAX_PLAN_CAPACITY) {
    issues.push({
      path: ['capacity'],
      message: `Group size must be between ${MIN_PLAN_CAPACITY} and ${MAX_PLAN_CAPACITY}`,
    });
  }

  const startMs = Date.parse(String(input?.startsAt ?? ''));
  const endMs = Date.parse(String(input?.endsAt ?? ''));
  const now = Date.now();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    issues.push({ path: ['startsAt'], message: 'Invalid start or end time' });
  } else {
    // S-31: starts_at >= now + 3 hours
    const minStartMs = now + PLAN_MIN_LEAD_HOURS * 3600 * 1000 - 60 * 1000;
    if (startMs < minStartMs) {
      issues.push({
        path: ['startsAt'],
        message: `Plans must start at least ${PLAN_MIN_LEAD_HOURS} hours from now (Rule S-31)`,
      });
    }

    if (endMs <= startMs) {
      issues.push({ path: ['endsAt'], message: 'End time must be after start time' });
    }

    const durationHours = (endMs - startMs) / (3600 * 1000);
    if (durationHours > MAX_PLAN_DURATION_HOURS) {
      issues.push({
        path: ['endsAt'],
        message: `Plans can last at most ${MAX_PLAN_DURATION_HOURS} hours (Rule S-32)`,
      });
    }

    // S-32: ends_at <= 21:00 Asia/Kolkata on start date unless partner venue override
    if (!input?.venueLateEventsAllowed) {
      const istFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const startParts = Object.fromEntries(
        istFormatter.formatToParts(new Date(startMs)).map((p) => [p.type, p.value]),
      );
      const endParts = Object.fromEntries(
        istFormatter.formatToParts(new Date(endMs)).map((p) => [p.type, p.value]),
      );
      const sameDay =
        startParts.year === endParts.year &&
        startParts.month === endParts.month &&
        startParts.day === endParts.day;
      const endHour = Number(endParts.hour ?? 0);
      const endMinute = Number(endParts.minute ?? 0);
      const afterNinePm =
        !sameDay ||
        endHour > PLAN_CUTOFF_LOCAL_HOUR ||
        (endHour === PLAN_CUTOFF_LOCAL_HOUR && endMinute > 0);

      if (afterNinePm) {
        issues.push({
          path: ['endsAt'],
          message:
            'Plans must end by 9:00 PM IST unless hosted at an approved late-evening partner venue (Rule S-32)',
        });
      }
    }
  }

  if (input?.audience === 'same_college' && !input?.collegeId) {
    issues.push({
      path: ['collegeId'],
      message: 'Select your college/institute for a same-college plan',
    });
  }

  return issues.length > 0 ? issues : { data: input as CreatePlanInput };
});

export const RequestJoinSchema = createValidator<{ planId: string; note?: string | null }>((input) => {
  const issues: ValidationIssue[] = [];
  if (typeof input?.planId !== 'string' || !input.planId.trim()) {
    issues.push({ path: ['planId'], message: 'Plan ID is required' });
  }
  if (input?.note) {
    issues.push(...checkScreenedText(input.note, 0, MAX_JOIN_NOTE_CHARS, 'Note', 'note'));
  }
  return issues.length > 0 ? issues : { data: input };
});

export const SendMessageSchema = createValidator<{
  id: string;
  conversationId: string;
  body?: string | null;
  imagePath?: string | null;
}>((input) => {
  const issues: ValidationIssue[] = [];
  if (typeof input?.id !== 'string' || !input.id.trim()) {
    issues.push({ path: ['id'], message: 'Client UUID is required' });
  }
  if (typeof input?.conversationId !== 'string' || !input.conversationId.trim()) {
    issues.push({ path: ['conversationId'], message: 'Conversation ID is required' });
  }
  if (input?.body) {
    issues.push(...checkScreenedText(input.body, 1, MAX_MESSAGE_CHARS, 'Message', 'body'));
  }
  return issues.length > 0 ? issues : { data: input };
});

export const SubmitReportSchema = createValidator<{
  targetUserId: string;
  reason: ReportReason;
  details?: string;
}>((input) => {
  const issues: ValidationIssue[] = [];
  if (typeof input?.targetUserId !== 'string' || !input.targetUserId.trim()) {
    issues.push({ path: ['targetUserId'], message: 'Target user ID is required' });
  }
  if (!(REPORT_REASONS as readonly string[]).includes(input?.reason)) {
    issues.push({ path: ['reason'], message: 'Select a valid report reason' });
  }
  if (typeof input?.details === 'string' && input.details.length > MAX_REPORT_DETAILS_CHARS) {
    issues.push({ path: ['details'], message: 'Report details too long' });
  }
  return issues.length > 0 ? issues : { data: input };
});

export const SubmitAppealSchema = createValidator<{
  subject: 'verification' | 'suspension' | 'content' | 'ban';
  subjectId: string;
  message: string;
}>((input) => {
  const issues: ValidationIssue[] = [];
  if (
    typeof input?.message !== 'string' ||
    input.message.trim().length < 10 ||
    input.message.trim().length > MAX_APPEAL_CHARS
  ) {
    issues.push({ path: ['message'], message: 'Please explain why you are appealing (10–1000 chars)' });
  }
  return issues.length > 0 ? issues : { data: input };
});
