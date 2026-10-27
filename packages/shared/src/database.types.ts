/**
 * Generated & strict Supabase Database Types matching docs/data-model.md.
 * Notice: No `phone` column exists anywhere in `public` (Rule S-5).
 */

export type CityStatus = 'waitlist' | 'beta' | 'live';
export type ProfileStatus = 'onboarding' | 'active' | 'suspended' | 'banned' | 'deleted';
export type Gender = 'woman' | 'man' | 'other';
export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'manual_review'
  | 'verified'
  | 'rejected'
  | 'blocked_minor';
export type CheckType = 'id_age' | 'liveness_face' | 'gender';
export type Verdict = 'pass' | 'fail' | 'review' | 'minor';
export type MediaStatus = 'pending' | 'approved' | 'rejected';
export type PlanAudience = 'everyone' | 'women_only' | 'same_college';
export type PlanStatus = 'open' | 'full' | 'started' | 'completed' | 'cancelled';
export type MemberStatus =
  | 'requested'
  | 'approved'
  | 'declined'
  | 'withdrawn'
  | 'left'
  | 'removed'
  | 'expired'
  | 'attended'
  | 'no_show';
export type ConversationKind = 'plan' | 'pair';
export type ConversationStatus = 'open' | 'closed';
export type ContentStatus = 'visible' | 'held' | 'rejected';
export type ReportReasonType =
  | 'harassment'
  | 'sexual_content'
  | 'threat_or_violence'
  | 'fake_profile'
  | 'underage'
  | 'spam_or_scam'
  | 'no_show'
  | 'unsafe_at_plan'
  | 'other';
export type ReportSeverity = 'severe' | 'standard';
export type ReportStatus = 'open' | 'actioned' | 'dismissed';
export type QueueSubject =
  | 'photo'
  | 'text'
  | 'verification'
  | 'report'
  | 'rating_review'
  | 'venue'
  | 'appeal';
export type QueueStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated';
export type AppealSubject = 'verification' | 'suspension' | 'content' | 'ban';
export type AppealStatus = 'open' | 'upheld' | 'denied';
export type Entitlement = 'free' | 'plus' | 'premium';
export type ConsentPurpose =
  | 'location'
  | 'camera'
  | 'notifications'
  | 'community_rules'
  | 'terms_privacy';

export interface CityRow {
  id: string;
  name: string;
  slug: string;
  status: CityStatus;
  launch_date: string | null;
  timezone: string;
  center_lat: number;
  center_lng: number;
  created_at: string;
}

export interface CollegeRow {
  id: string;
  city_id: string;
  name: string;
  status: 'active' | 'hidden';
  created_at: string;
}

export interface ProfileRow {
  id: string;
  city_id: string | null;
  first_name: string;
  birth_year: number | null;
  declared_gender: Gender;
  verified_gender: Gender | null;
  bio: string | null;
  bio_status: ContentStatus;
  interests: string[];
  languages: string[];
  area_cell: string;
  area_name: string;
  college_id: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  status: ProfileStatus;
  status_reason: string | null;
  entitlement: Entitlement;
  locale: 'en' | 'hi';
  rules_accepted_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * S-18: Public profile view exposed to other users in the same city.
 * Never exposes birth_year, verified_gender details, area_cell, or phone.
 */
export interface PublicProfileView {
  id: string;
  city_id: string;
  first_name: string;
  age_band: '18–20' | '21–24' | '25–30' | '30+';
  is_verified: boolean;
  bio: string | null;
  interests: string[];
  languages: string[];
  area_name: string;
  college_name: string | null;
  approved_photos: string[];
  plans_attended: number;
  plans_hosted: number;
  show_up_rate: number | null; // Only populated when plans_attended + plans_no_show >= 3
}

export interface ProfilePhotoRow {
  id: string;
  user_id: string;
  path: string | null;
  quarantine_path: string;
  sha256: string;
  position: number;
  status: MediaStatus;
  created_at: string;
  updated_at: string;
}

export interface VenueRow {
  id: string;
  city_id: string;
  name: string;
  area_name: string;
  area_cell: string;
  lat: number;
  lng: number;
  address_line: string;
  hours: Record<string, { open: string; close: string }>;
  capacity: number;
  partner: boolean;
  late_events_allowed: boolean;
  status: 'draft' | 'approved' | 'archived';
  photo_url?: string;
  vibe_tag?: string;
  created_at: string;
}

export interface PlanRow {
  id: string;
  city_id: string;
  host_id: string;
  venue_id: string;
  title: string;
  description: string | null;
  activity: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  approved_count: number;
  audience: PlanAudience;
  college_id: string | null;
  price_paise: number | null;
  status: PlanStatus;
  late_cancel: boolean;
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Architecture §Feed: `feed_plans` view returning card fields + host + venue.
 */
export interface FeedPlanCard {
  id: string;
  city_id: string;
  host_id: string;
  host_first_name: string;
  host_avatar_url: string;
  host_verified: boolean;
  host_age_band: '18–20' | '21–24' | '25–30' | '30+';
  host_college: string | null;
  host_plans_hosted: number;
  host_late_cancels_30d: number;
  venue_id: string;
  venue_name: string;
  venue_area_name: string;
  venue_address: string;
  venue_partner: boolean;
  venue_lat: number;
  venue_lng: number;
  title: string;
  description: string | null;
  activity: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  approved_count: number;
  audience: PlanAudience;
  college_id: string | null;
  status: PlanStatus;
  cover_image_url: string;
  attendee_Initials: string[];
}

export interface PlanMemberRow {
  plan_id: string;
  user_id: string;
  status: MemberStatus;
  requested_at: string;
  decided_at: string | null;
  checked_in_at: string | null;
  note: string | null;
}

export interface ConversationRow {
  id: string;
  kind: ConversationKind;
  plan_id: string | null;
  status: ConversationStatus;
  opened_at: string;
  closes_at: string;
  hold_until: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  is_host?: boolean;
  body: string | null;
  image_path: string | null;
  image_status: MediaStatus | null;
  status: ContentStatus;
  flagged: boolean;
  created_at: string;
  pending_sync?: boolean;
}

export interface VerificationCheckRow {
  id: string;
  user_id: string;
  type: CheckType;
  verdict: Verdict;
  attempt: number;
  decided_at: string | null;
}

export interface AppealRow {
  id: string;
  user_id: string;
  subject: AppealSubject;
  subject_id: string;
  message: string;
  status: AppealStatus;
  response: string | null;
  due_at: string;
  created_at: string;
}

export interface ConsentRow {
  id: string;
  user_id: string;
  purpose: ConsentPurpose;
  granted: boolean;
  policy_version: string;
  created_at: string;
}
