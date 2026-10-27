/**
 * Yuvomeet Reactive Domain Store & Offline-First Kota Engine
 * Implements all PRD P0 requirements (ON-1..6, VR-1..7, PL-1..6, CH-1..4, SF-1..7, SB-1, SB-5, VN-1)
 * and Security rules (S-1..S-54), backed by MMKV + SecureStore + Supabase.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type AppealRow,
  type CityRow,
  type CollegeRow,
  computeAgeBand,
  CreatePlanSchema,
  evaluateCheckIn,
  type FeedPlanCard,
  FREE_HOSTS_PER_WEEK,
  FREE_JOINS_PER_WEEK,
  getReportSeverity,
  KOTA_AREAS,
  type MemberStatus,
  type MessageRow,
  MIN_PROFILE_PHOTOS,
  NEW_JOIN_PER_DAY,
  NEW_MSG_PER_DAY,
  OTP_LOCK_MAX_FAILS,
  OTP_LOCK_MINUTES,
  type PlanAudience,
  type ProfilePhotoRow,
  type ProfileRow,
  type PublicProfileView,
  type ReportReason,
  screenTextContent,
  type VenueRow,
} from '@yuvomeet/shared';
import {
  appStorage,
  clearTrustedContactOnDevice,
  enqueueOfflineMessage,
  getOfflineOutbox,
  getTrustedContactOnDevice,
  removeOutboxMessage,
  saveTrustedContactOnDevice,
  type TrustedContact,
} from './storage';
import { setTelemetryIdentity, trackEvent } from './telemetry';

// -----------------------------------------------------------------------------
// Seed Data matching Stitch Designs & Kota Venues (`supabase/seed.sql`)
// -----------------------------------------------------------------------------
export const SEED_CITIES: CityRow[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Kota',
    slug: 'kota',
    status: 'live',
    launch_date: '2026-10-24',
    timezone: 'Asia/Kolkata',
    center_lat: 25.1825,
    center_lng: 75.8391,
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Jaipur',
    slug: 'jaipur',
    status: 'waitlist',
    launch_date: null,
    timezone: 'Asia/Kolkata',
    center_lat: 26.9124,
    center_lng: 75.7873,
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: 'Pune',
    slug: 'pune',
    status: 'waitlist',
    launch_date: null,
    timezone: 'Asia/Kolkata',
    center_lat: 18.5204,
    center_lng: 73.8567,
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    name: 'Indore',
    slug: 'indore',
    status: 'waitlist',
    launch_date: null,
    timezone: 'Asia/Kolkata',
    center_lat: 22.7196,
    center_lng: 75.8577,
    created_at: '2026-10-24T00:00:00Z',
  },
];

export const SEED_COLLEGES: CollegeRow[] = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    city_id: '11111111-1111-4111-8111-111111111101',
    name: 'IIIT Kota / RTU Campus',
    status: 'active',
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    city_id: '11111111-1111-4111-8111-111111111101',
    name: 'Allen Career Institute (Samyak / Safalya)',
    status: 'active',
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222203',
    city_id: '11111111-1111-4111-8111-111111111101',
    name: 'Resonance & Motion Study Circle',
    status: 'active',
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222204',
    city_id: '11111111-1111-4111-8111-111111111101',
    name: 'Government Medical College Kota',
    status: 'active',
    created_at: '2026-10-24T00:00:00Z',
  },
];

export const SEED_VENUES: VenueRow[] = [
  {
    id: '33333333-3333-4333-8333-333333333301',
    city_id: '11111111-1111-4111-8111-111111111101',
    name: 'Chai Sutta Bar, Vigyan Nagar',
    area_name: 'Vigyan Nagar',
    area_cell: '883d8b4493fffff',
    lat: 25.1483,
    lng: 75.8442,
    address_line: 'Plot 14, Main Road, Vigyan Nagar, Kota',
    hours: { mon_sun: { open: '09:00', close: '22:30' } },
    capacity: 30,
    partner: true,
    late_events_allowed: true,
    status: 'approved',
    vibe_tag: 'Board Games & Kulhad Chai',
    photo_url:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333302',
    city_id: '11111111-1111-4111-8111-111111111101',
    name: 'Chambal Riverfront, Gate 3',
    area_name: 'Gumanpura & Riverfront',
    area_cell: '883d8b449ffffff',
    lat: 25.1802,
    lng: 75.8295,
    address_line: 'Promenade Plaza, Chambal Riverfront Gate 3, Kota',
    hours: { mon_sun: { open: '06:00', close: '21:00' } },
    capacity: 50,
    partner: false,
    late_events_allowed: false,
    status: 'approved',
    vibe_tag: 'Sunset Walks & Breezy Ghats',
    photo_url:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333303',
    city_id: '11111111-1111-4111-8111-111111111101',
    name: 'Cafe Nirvana, Talwandi',
    area_name: 'Talwandi',
    area_cell: '883d8b4491fffff',
    lat: 25.1419,
    lng: 75.8364,
    address_line: 'Sector 2 Circle, Near Commerce College, Talwandi, Kota',
    hours: { mon_sun: { open: '10:00', close: '22:00' } },
    capacity: 24,
    partner: true,
    late_events_allowed: true,
    status: 'approved',
    vibe_tag: 'Acoustic Jams & Cold Brew',
    photo_url:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333304',
    city_id: '11111111-1111-4111-8111-111111111101',
    name: 'Roastery Coffee House, Sector 4',
    area_name: 'Talwandi',
    area_cell: '883d8b4491fffff',
    lat: 25.1398,
    lng: 75.838,
    address_line: 'Sector 4 Main Market, Talwandi, Kota',
    hours: { mon_sun: { open: '08:30', close: '21:00' } },
    capacity: 28,
    partner: true,
    late_events_allowed: false,
    status: 'approved',
    vibe_tag: 'Quiet Study & Pour-Over Coffee',
    photo_url:
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80',
    created_at: '2026-10-24T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333305',
    city_id: '11111111-1111-4111-8111-111111111101',
    name: 'The Bookworm Study Lounge',
    area_name: 'Rajeev Gandhi Nagar',
    area_cell: '883d8b4497fffff',
    lat: 25.1331,
    lng: 75.8532,
    address_line: 'Opposite Allen Samyak, Rajeev Gandhi Nagar, Kota',
    hours: { mon_sun: { open: '08:00', close: '21:00' } },
    capacity: 35,
    partner: true,
    late_events_allowed: false,
    status: 'approved',
    vibe_tag: 'Focused Study & Mock Test Review',
    photo_url:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',
    created_at: '2026-10-24T00:00:00Z',
  },
];

export const SEED_PUBLIC_PROFILES: Record<string, PublicProfileView> = {
  'host-lakshay': {
    id: 'host-lakshay',
    city_id: '11111111-1111-4111-8111-111111111101',
    first_name: 'Lakshay Saxena',
    age_band: '21–24',
    is_verified: true,
    bio: 'Tech & chai lover. Organizing weekend board games & evening riverside walks around Kota.',
    interests: ['chai-cafe', 'board-games', 'coding-tech', 'evening-walks'],
    languages: ['en', 'hi'],
    area_name: 'Vigyan Nagar',
    college_name: 'IIIT Kota / RTU Campus',
    approved_photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
    ],
    plans_attended: 18,
    plans_hosted: 12,
    show_up_rate: 96,
  },
  'host-ananya': {
    id: 'host-ananya',
    city_id: '11111111-1111-4111-8111-111111111101',
    first_name: 'Ananya Sharma',
    age_band: '18–20',
    is_verified: true,
    bio: 'Second year in Kota. Love sunset walks at Chambal Riverfront, poetry, and filter coffee.',
    interests: ['evening-walks', 'chai-cafe', 'study-sessions', 'photography'],
    languages: ['hi', 'en'],
    area_name: 'Talwandi',
    college_name: 'Allen Career Institute (Samyak / Safalya)',
    approved_photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80',
    ],
    plans_attended: 11,
    plans_hosted: 5,
    show_up_rate: 100,
  },
  'host-kabir': {
    id: 'host-kabir',
    city_id: '11111111-1111-4111-8111-111111111101',
    first_name: 'Kabir Verma',
    age_band: '21–24',
    is_verified: true,
    bio: 'Acoustic guitarist & indie music fan. Hosting weekend jam circles at Cafe Nirvana.',
    interests: ['indie-music', 'chai-cafe', 'anime-films'],
    languages: ['hi', 'en'],
    area_name: 'Talwandi',
    college_name: 'IIIT Kota / RTU Campus',
    approved_photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=500&q=80',
    ],
    plans_attended: 9,
    plans_hosted: 4,
    show_up_rate: 92,
  },
  'host-neha': {
    id: 'host-neha',
    city_id: '11111111-1111-4111-8111-111111111101',
    first_name: 'Neha Rathore',
    age_band: '25–30',
    is_verified: true,
    bio: 'Botany faculty moved from Jaipur. Hosting women-only coffee evenings & book club tables.',
    interests: ['chai-cafe', 'study-sessions', 'quizzes-trivia'],
    languages: ['en', 'hi'],
    area_name: 'Talwandi',
    college_name: 'Resonance & Motion Study Circle',
    approved_photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=500&q=80',
    ],
    plans_attended: 14,
    plans_hosted: 7,
    show_up_rate: 100,
  },
};

const nowMs = Date.now();
const hoursFromNow = (h: number) => new Date(nowMs + h * 3600 * 1000).toISOString();

export const INITIAL_PLANS: FeedPlanCard[] = [
  {
    id: 'plan-chai-games',
    city_id: '11111111-1111-4111-8111-111111111101',
    host_id: 'host-lakshay',
    host_first_name: 'Lakshay',
    host_avatar_url:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    host_verified: true,
    host_age_band: '21–24',
    host_college: 'IIIT Kota / RTU Campus',
    host_plans_hosted: 12,
    host_late_cancels_30d: 0,
    venue_id: '33333333-3333-4333-8333-333333333301',
    venue_name: 'Chai Sutta Bar, Vigyan Nagar',
    venue_area_name: 'Vigyan Nagar',
    venue_address: 'Plot 14, Main Road, Vigyan Nagar, Kota',
    venue_partner: true,
    venue_lat: 25.1483,
    venue_lng: 75.8442,
    title: 'Chai & Late Night Board Games',
    description:
      'Catan and Chai enthusiast! Bringing Exploding Kittens & Sequence tonight. Verified students & young professionals welcome.',
    activity: 'board-games',
    starts_at: hoursFromNow(0.25), // Starts in 15 mins so check-in is immediately testable!
    ends_at: hoursFromNow(2.25),
    capacity: 8,
    approved_count: 5,
    audience: 'everyone',
    college_id: null,
    status: 'open',
    cover_image_url:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
    attendee_Initials: ['LS', 'AK', 'PS', 'RV', 'MK'],
  },
  {
    id: 'plan-riverfront-walk',
    city_id: '11111111-1111-4111-8111-111111111101',
    host_id: 'host-ananya',
    host_first_name: 'Ananya',
    host_avatar_url:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    host_verified: true,
    host_age_band: '18–20',
    host_college: 'Allen Career Institute (Samyak / Safalya)',
    host_plans_hosted: 5,
    host_late_cancels_30d: 0,
    venue_id: '33333333-3333-4333-8333-333333333302',
    venue_name: 'Chambal Riverfront, Gate 3',
    venue_area_name: 'Gumanpura & Riverfront',
    venue_address: 'Promenade Plaza, Chambal Riverfront Gate 3, Kota',
    venue_partner: false,
    venue_lat: 25.1802,
    venue_lng: 75.8295,
    title: 'Sunset Riverside Walk & Talk',
    description:
      'Easy 45-minute evening walk along the Chambal promenade after classes. Great way to unwind and talk outside hostel walls.',
    activity: 'walk-talk',
    starts_at: hoursFromNow(5),
    ends_at: hoursFromNow(6.5),
    capacity: 6,
    approved_count: 3,
    audience: 'everyone',
    college_id: null,
    status: 'open',
    cover_image_url:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    attendee_Initials: ['AS', 'RV', 'MK'],
  },
  {
    id: 'plan-women-only-coffee',
    city_id: '11111111-1111-4111-8111-111111111101',
    host_id: 'host-neha',
    host_first_name: 'Neha',
    host_avatar_url:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    host_verified: true,
    host_age_band: '25–30',
    host_college: 'Resonance & Motion Study Circle',
    host_plans_hosted: 7,
    host_late_cancels_30d: 0,
    venue_id: '33333333-3333-4333-8333-333333333304',
    venue_name: 'Roastery Coffee House, Sector 4',
    venue_area_name: 'Talwandi',
    venue_address: 'Sector 4 Main Market, Talwandi, Kota',
    venue_partner: true,
    venue_lat: 25.1398,
    venue_lng: 75.838,
    title: 'Girls Evening Coffee & Book Swap (Women Only)',
    description:
      'Safe, relaxed evening for verified women in Kota — students, repeaters & faculty. Bring a favourite book or just come for iced pour-over!',
    activity: 'chai-cafe',
    starts_at: hoursFromNow(4),
    ends_at: hoursFromNow(6),
    capacity: 6,
    approved_count: 4,
    audience: 'women_only', // S-15: Visible ONLY when current user is a verified woman!
    college_id: null,
    status: 'open',
    cover_image_url:
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80',
    attendee_Initials: ['NR', 'RS', 'PK', 'SM'],
  },
  {
    id: 'plan-acoustic-jam',
    city_id: '11111111-1111-4111-8111-111111111101',
    host_id: 'host-kabir',
    host_first_name: 'Kabir',
    host_avatar_url:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    host_verified: true,
    host_age_band: '21–24',
    host_college: 'IIIT Kota / RTU Campus',
    host_plans_hosted: 4,
    host_late_cancels_30d: 0,
    venue_id: '33333333-3333-4333-8333-333333333303',
    venue_name: 'Cafe Nirvana, Talwandi',
    venue_area_name: 'Talwandi',
    venue_address: 'Sector 2 Circle, Near Commerce College, Talwandi, Kota',
    venue_partner: true,
    venue_lat: 25.1419,
    venue_lng: 75.8364,
    title: 'Acoustic Guitar Jam Session',
    description:
      'Bringing two acoustics and a cajon. Sing along to Prateek Kuhad, Local Train & Coke Studio classics.',
    activity: 'music-jam',
    starts_at: hoursFromNow(22),
    ends_at: hoursFromNow(24),
    capacity: 6,
    approved_count: 4,
    audience: 'everyone',
    college_id: null,
    status: 'open',
    cover_image_url:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
    attendee_Initials: ['KV', 'DJ', 'TD', 'AS'],
  },
  {
    id: 'plan-study-sprint',
    city_id: '11111111-1111-4111-8111-111111111101',
    host_id: 'host-ananya',
    host_first_name: 'Ananya',
    host_avatar_url:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    host_verified: true,
    host_age_band: '18–20',
    host_college: 'Allen Career Institute (Samyak / Safalya)',
    host_plans_hosted: 5,
    host_late_cancels_30d: 0,
    venue_id: '33333333-3333-4333-8333-333333333305',
    venue_name: 'The Bookworm Study Lounge',
    venue_area_name: 'Rajeev Gandhi Nagar',
    venue_address: 'Opposite Allen Samyak, Rajeev Gandhi Nagar, Kota',
    venue_partner: true,
    venue_lat: 25.1331,
    venue_lng: 75.8532,
    title: 'Pomodoro Study Sprint (2x50m)',
    description:
      'Silent 2-hour Pomodoro block with 10-minute masala chai break in between. Keep phones away and finish your backlog!',
    activity: 'study-session',
    starts_at: hoursFromNow(18),
    ends_at: hoursFromNow(20),
    capacity: 6,
    approved_count: 4,
    audience: 'everyone',
    college_id: '22222222-2222-4222-8222-222222222202',
    status: 'open',
    cover_image_url:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',
    attendee_Initials: ['AS', 'RK', 'VP', 'NS'],
  },
];

export const INITIAL_MESSAGES: Record<string, MessageRow[]> = {
  'plan-chai-games': [
    {
      id: '10000000-0000-4000-8000-000000000001',
      conversation_id: 'plan-chai-games',
      sender_id: 'host-lakshay',
      sender_name: 'Lakshay',
      sender_avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      is_host: true,
      body: 'Hey everyone! I got a table reserved by the outdoor fairy lights at Chai Sutta Bar. See you all soon!',
      image_path: null,
      image_status: null,
      status: 'visible',
      flagged: false,
      created_at: new Date(nowMs - 45 * 60 * 1000).toISOString(),
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      conversation_id: 'plan-chai-games',
      sender_id: 'host-ananya',
      sender_name: 'Priya',
      sender_avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
      is_host: false,
      body: 'Awesome, bringing Catan and Exploding Kittens! 🎲🐱',
      image_path: null,
      image_status: null,
      status: 'visible',
      flagged: false,
      created_at: new Date(nowMs - 38 * 60 * 1000).toISOString(),
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      conversation_id: 'plan-chai-games',
      sender_id: 'host-kabir',
      sender_name: 'Rohan',
      sender_avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      is_host: false,
      body: 'Table photo from the terrace — tap to unblur!',
      image_path:
        'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=700&q=80',
      image_status: 'approved',
      status: 'visible',
      flagged: false,
      created_at: new Date(nowMs - 15 * 60 * 1000).toISOString(),
    },
  ],
};

export interface JoinRequestItem {
  planId: string;
  userId: string;
  firstName: string;
  ageBand: '18–20' | '21–24' | '25–30' | '30+';
  isVerified: boolean;
  interests: string[];
  plansAttended: number;
  showUpRate: number | null;
  note: string | null;
  avatarUrl: string;
  status: MemberStatus;
}

interface AppContextValue {
  profile: ProfileRow;
  photos: ProfilePhotoRow[];
  cities: CityRow[];
  colleges: CollegeRow[];
  venues: VenueRow[];
  plans: FeedPlanCard[];
  visibleFeedPlans: FeedPlanCard[];
  memberships: Record<string, { status: MemberStatus; checkedInAt: string | null; note: string | null }>;
  hostRequests: JoinRequestItem[];
  messagesByPlan: Record<string, MessageRow[]>;
  blockedUserIds: string[];
  appeals: AppealRow[];
  trustedContact: TrustedContact | null;
  isOfflineSimulated: boolean;
  otpFailedAttempts: number;
  otpLockedUntil: string | null;
  consents: Record<string, boolean>;
  weeklyJoinsUsed: number;
  weeklyHostsUsed: number;

  // Actions
  setOfflineSimulated: (offline: boolean) => void;
  selectCity: (citySlug: string) => { status: 'live' | 'waitlist' | 'beta'; city: CityRow };
  requestOtp: (phone: string, isResend?: boolean) => { ok: boolean; error?: string };
  verifyOtpCode: (phone: string, code: string) => {
    ok: boolean;
    locked?: boolean;
    remainingAttempts?: number;
  };
  saveConsents: (next: Record<string, boolean>) => void;
  acceptCommunityRules: () => void;
  updateProfileDraft: (patch: Partial<ProfileRow>) => { ok: boolean; error?: string };
  addProfilePhoto: (uri: string, simulateHoldOrReject?: 'approved' | 'pending' | 'rejected') => void;
  removeProfilePhoto: (photoId: string) => void;
  completeOnboardingProfile: () => { ok: boolean; error?: string };
  runKycSimulation: (outcome: 'verified_woman' | 'verified_man' | 'manual_review' | 'blocked_minor') => void;
  requestJoinPlan: (planId: string, note?: string) => { ok: boolean; code?: string; message?: string };
  withdrawJoinRequest: (planId: string) => void;
  decideJoinRequest: (planId: string, userId: string, decision: 'approve' | 'decline') => void;
  createNewPlan: (input: {
    title: string;
    description?: string;
    activity: string;
    venueId: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    audience: PlanAudience;
    collegeId?: string | null;
  }) => { ok: boolean; planId?: string; error?: string };
  cancelHostedPlan: (planId: string, reason: string) => { ok: boolean; lateCancel: boolean };
  sendChatMessage: (planId: string, body: string, imagePath?: string) => { ok: boolean; error?: string; held?: boolean };
  flushOfflineOutbox: () => number;
  performVenueCheckIn: (
    planId: string,
    coords?: { lat: number; lng: number; accuracy: number; mocked?: boolean },
  ) => { ok: boolean; message: string; distanceMeters?: number };
  submitPostPlanRating: (
    planId: string,
    ratings: { rateeId: string; feltSafe: boolean; showedUp: boolean }[],
  ) => void;
  submitSafetyReport: (input: {
    targetUserId: string;
    planId?: string;
    messageId?: string;
    reason: ReportReason;
    details?: string;
    alsoBlock?: boolean;
    context: 'profile' | 'plan' | 'message';
  }) => { ok: boolean };
  blockMember: (targetUserId: string, context?: 'profile' | 'plan' | 'message') => void;
  unblockMember: (targetUserId: string) => void;
  saveTrustedContact: (contact: TrustedContact) => Promise<void>;
  removeTrustedContact: () => Promise<void>;
  submitUserAppeal: (subject: AppealRow['subject'], message: string) => { ok: boolean; error?: string };
  exportUserDataJson: () => string;
  deleteUserAccount: () => void;
  getPublicProfile: (userId: string) => PublicProfileView | null;
}

const DEFAULT_PROFILE: ProfileRow = {
  id: 'user-kota-me',
  city_id: '11111111-1111-4111-8111-111111111101',
  first_name: 'Riya',
  birth_year: 2005,
  declared_gender: 'woman',
  verified_gender: 'woman',
  bio: 'NEET aspirant in Talwandi. Looking for evening riverfront walks, chai breaks & focused Pomodoro study sessions!',
  bio_status: 'visible',
  interests: ['chai-cafe', 'study-sessions', 'evening-walks', 'board-games'],
  languages: ['en', 'hi'],
  area_cell: '883d8b4491fffff',
  area_name: 'Talwandi',
  college_id: '22222222-2222-4222-8222-222222222202',
  verification_status: 'verified',
  verified_at: '2026-10-25T10:00:00Z',
  status: 'active',
  status_reason: null,
  entitlement: 'free',
  locale: 'en',
  rules_accepted_at: '2026-10-25T10:00:00Z',
  deleted_at: null,
  created_at: '2026-10-24T10:00:00Z',
  updated_at: '2026-10-25T10:00:00Z',
};

const DEFAULT_PHOTOS: ProfilePhotoRow[] = [
  {
    id: 'photo-1',
    user_id: 'user-kota-me',
    path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
    quarantine_path: 'quarantine/photo-1.jpg',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    position: 0,
    status: 'approved',
    created_at: '2026-10-24T10:00:00Z',
    updated_at: '2026-10-24T10:00:00Z',
  },
  {
    id: 'photo-2',
    user_id: 'user-kota-me',
    path: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80',
    quarantine_path: 'quarantine/photo-2.jpg',
    sha256: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    position: 1,
    status: 'approved',
    created_at: '2026-10-24T10:05:00Z',
    updated_at: '2026-10-24T10:05:00Z',
  },
];

const AppContext = createContext<AppContextValue | null>(null);

export function YuvomeetProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileRow>(DEFAULT_PROFILE);
  const [photos, setPhotos] = useState<ProfilePhotoRow[]>(DEFAULT_PHOTOS);
  const [plans, setPlans] = useState<FeedPlanCard[]>(INITIAL_PLANS);
  const [memberships, setMemberships] = useState<
    Record<string, { status: MemberStatus; checkedInAt: string | null; note: string | null }>
  >({
    'plan-chai-games': { status: 'approved', checkedInAt: null, note: 'Bringing Catan!' },
    'plan-riverfront-walk': { status: 'approved', checkedInAt: null, note: null },
    'plan-acoustic-jam': { status: 'requested', checkedInAt: null, note: 'Love indie acoustic!' },
  });
  const [hostRequests, setHostRequests] = useState<JoinRequestItem[]>([
    {
      planId: 'plan-chai-games',
      userId: 'requester-aman',
      firstName: 'Aman Gupta',
      ageBand: '18–20',
      isVerified: true,
      interests: ['board-games', 'chai-cafe', 'cricket-badminton'],
      plansAttended: 6,
      showUpRate: 94,
      note: 'Hey! Would love to join for Sequence and Kulhad chai.',
      avatarUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      status: 'requested',
    },
    {
      planId: 'plan-chai-games',
      userId: 'requester-meera',
      firstName: 'Meera Joshi',
      ageBand: '21–24',
      isVerified: true,
      interests: ['chai-cafe', 'study-sessions', 'board-games'],
      plansAttended: 4,
      showUpRate: 100,
      note: 'Coming from Vigyan Nagar hostel, see you at 8:30!',
      avatarUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      status: 'requested',
    },
  ]);
  const [messagesByPlan, setMessagesByPlan] = useState<Record<string, MessageRow[]>>(INITIAL_MESSAGES);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [trustedContact, setTrustedContact] = useState<TrustedContact | null>(null);
  const [isOfflineSimulated, setOfflineSimulatedState] = useState(false);
  const [otpFailedAttempts, setOtpFailedAttempts] = useState(0);
  const [otpLockedUntil, setOtpLockedUntil] = useState<string | null>(null);
  const [consents, setConsents] = useState<Record<string, boolean>>({
    camera: true,
    location: true,
    notifications: true,
    community_rules: true,
    terms_privacy: true,
  });
  const [weeklyJoinsUsed, setWeeklyJoinsUsed] = useState(1);
  const [weeklyHostsUsed, setWeeklyHostsUsed] = useState(0);
  const [dailyMessagesSent, setDailyMessagesSent] = useState(0);

  useEffect(() => {
    setTelemetryIdentity(profile.id, 'kota');
    getTrustedContactOnDevice().then((c) => {
      if (c) setTrustedContact(c);
    });
  }, [profile.id]);

  // S-14, S-15, S-16, S-17: Strictly filter visible plans
  const visibleFeedPlans = useMemo(() => {
    const isVerifiedWoman =
      profile.verification_status === 'verified' && profile.verified_gender === 'woman';

    return plans
      .filter((plan) => {
        if (plan.city_id !== profile.city_id) return false; // S-14
        if (blockedUserIds.includes(plan.host_id)) return false; // S-17
        if (plan.audience === 'women_only' && !isVerifiedWoman && plan.host_id !== profile.id) {
          return false; // S-15: Men and unverified women get ZERO rows for women_only plans
        }
        if (
          plan.audience === 'same_college' &&
          plan.college_id &&
          plan.college_id !== profile.college_id &&
          plan.host_id !== profile.id
        ) {
          return false; // S-16
        }
        return plan.status === 'open' || plan.status === 'full';
      })
      .sort((a, b) => {
        // Architecture §Feed: Demote hosts with 2+ late cancels in last 30 days
        const aDemoted = a.host_late_cancels_30d >= 2 ? 1 : 0;
        const bDemoted = b.host_late_cancels_30d >= 2 ? 1 : 0;
        if (aDemoted !== bDemoted) return aDemoted - bDemoted;
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      });
  }, [plans, profile, blockedUserIds]);

  const flushOfflineOutbox = useCallback(() => {
    const queued = getOfflineOutbox();
    if (queued.length === 0) return 0;

    setMessagesByPlan((prev) => {
      const next = { ...prev };
      for (const msg of queued) {
        const list = next[msg.conversation_id] ?? [];
        const withoutOld = list.filter((m) => m.id !== msg.id);
        next[msg.conversation_id] = [...withoutOld, { ...msg, pending_sync: false }];
        removeOutboxMessage(msg.id);
      }
      return next;
    });
    return queued.length;
  }, []);

  const setOfflineSimulated = useCallback(
    (offline: boolean) => {
      setOfflineSimulatedState(offline);
      if (!offline) {
        flushOfflineOutbox();
      }
    },
    [flushOfflineOutbox],
  );

  const selectCity = useCallback((citySlug: string) => {
    const found = SEED_CITIES.find((c) => c.slug === citySlug) ?? SEED_CITIES[0]!;
    trackEvent('city_selected', { city_status: found.status });
    if (found.status === 'live') {
      setProfile((prev) => ({ ...prev, city_id: found.id }));
    }
    return { status: found.status, city: found };
  }, []);

  const requestOtp = useCallback(
    (_phone: string, isResend = false) => {
      if (otpLockedUntil && new Date(otpLockedUntil).getTime() > Date.now()) {
        return { ok: false, error: 'Number is locked for 30 minutes due to 5 wrong tries.' };
      }
      trackEvent('otp_requested', { resend: isResend });
      return { ok: true };
    },
    [otpLockedUntil],
  );

  // ON-1 & S-10: 5 wrong tries locks the number for 30 minutes
  const verifyOtpCode = useCallback(
    (_phone: string, code: string) => {
      if (otpLockedUntil && new Date(otpLockedUntil).getTime() > Date.now()) {
        return { ok: false, locked: true, remainingAttempts: 0 };
      }
      // Accept '123456' or '482910' as valid OTP in local/staging dev; '000000' simulates wrong OTP
      if (code === '000000' || code.length !== 6) {
        const nextFails = otpFailedAttempts + 1;
        setOtpFailedAttempts(nextFails);
        if (nextFails >= OTP_LOCK_MAX_FAILS) {
          const lockIso = new Date(Date.now() + OTP_LOCK_MINUTES * 60 * 1000).toISOString();
          setOtpLockedUntil(lockIso);
          return { ok: false, locked: true, remainingAttempts: 0 };
        }
        return {
          ok: false,
          locked: false,
          remainingAttempts: OTP_LOCK_MAX_FAILS - nextFails,
        };
      }

      setOtpFailedAttempts(0);
      setOtpLockedUntil(null);
      trackEvent('otp_verified', { new_user: false });
      return { ok: true, remainingAttempts: OTP_LOCK_MAX_FAILS };
    },
    [otpFailedAttempts, otpLockedUntil],
  );

  const saveConsents = useCallback((next: Record<string, boolean>) => {
    setConsents((prev) => ({ ...prev, ...next }));
  }, []);

  const acceptCommunityRules = useCallback(() => {
    const nowIso = new Date().toISOString();
    setConsents((prev) => ({ ...prev, community_rules: true }));
    setProfile((prev) => ({ ...prev, rules_accepted_at: nowIso }));
  }, []);

  const updateProfileDraft = useCallback((patch: Partial<ProfileRow>) => {
    if (patch.bio !== undefined && patch.bio !== null) {
      const check = screenTextContent(patch.bio);
      if (check.action === 'reject') {
        return {
          ok: false,
          error: 'Phone numbers, links, and social handles (@insta, etc.) are not allowed in your bio.',
        };
      }
    }
    if (patch.first_name !== undefined) {
      const check = screenTextContent(patch.first_name);
      if (check.action === 'reject') {
        return { ok: false, error: 'Invalid characters or handle in first name.' };
      }
    }
    setProfile((prev) => ({ ...prev, ...patch, updated_at: new Date().toISOString() }));
    return { ok: true };
  }, []);

  const addProfilePhoto = useCallback(
    (uri: string, simulateStatus: 'approved' | 'pending' | 'rejected' = 'approved') => {
      setPhotos((prev) => {
        if (prev.length >= 6) return prev;
        const newPhoto: ProfilePhotoRow = {
          id: `photo-${Date.now()}`,
          user_id: profile.id,
          path: simulateStatus === 'approved' ? uri : null,
          quarantine_path: uri,
          sha256: `sha256_${Date.now()}`,
          position: prev.length,
          status: simulateStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [...prev, newPhoto];
      });
    },
    [profile.id],
  );

  const removeProfilePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, []);

  const completeOnboardingProfile = useCallback(() => {
    const approvedCount = photos.filter((p) => p.status === 'approved').length;
    if (approvedCount < MIN_PROFILE_PHOTOS) {
      return {
        ok: false,
        error: `Please upload at least ${MIN_PROFILE_PHOTOS} approved photos to activate your profile (Rule ON-3).`,
      };
    }
    if (!profile.first_name || profile.first_name.trim().length < 2) {
      return { ok: false, error: 'Please enter your first name.' };
    }
    if (profile.interests.length < 2) {
      return { ok: false, error: 'Please select at least 2 interests.' };
    }
    setProfile((prev) => ({ ...prev, status: 'active', updated_at: new Date().toISOString() }));
    trackEvent('profile_completed', {
      photo_count: approvedCount,
      interest_count: profile.interests.length,
    });
    return { ok: true };
  }, [photos, profile.first_name, profile.interests.length]);

  const runKycSimulation = useCallback(
    (outcome: 'verified_woman' | 'verified_man' | 'manual_review' | 'blocked_minor') => {
      trackEvent('verification_started', { attempt: 1 });
      const nowIso = new Date().toISOString();

      if (outcome === 'verified_woman' || outcome === 'verified_man') {
        const gender = outcome === 'verified_woman' ? 'woman' : 'man';
        setProfile((prev) => ({
          ...prev,
          birth_year: 2004,
          declared_gender: gender,
          verified_gender: gender,
          verification_status: 'verified',
          verified_at: nowIso,
          status: 'active',
          status_reason: null,
          updated_at: nowIso,
        }));
        trackEvent('verification_passed', { attempt: 1, manual: false });
      } else if (outcome === 'manual_review') {
        setProfile((prev) => ({
          ...prev,
          verification_status: 'manual_review',
          updated_at: nowIso,
        }));
        trackEvent('verification_failed', { check_type: 'liveness_face', outcome: 'review' });
      } else if (outcome === 'blocked_minor') {
        setProfile((prev) => ({
          ...prev,
          verification_status: 'blocked_minor',
          status: 'banned',
          status_reason: 'You must be 18 or older to use Yuvomeet (Rule VR-1 / S-40).',
          updated_at: nowIso,
        }));
        trackEvent('verification_failed', { check_type: 'id_age', outcome: 'minor' });
      }
    },
    [],
  );

  const requestJoinPlan = useCallback(
    (planId: string, note?: string) => {
      // ON-5 & S-33: Browse before verification, but join requires verification
      if (profile.verification_status !== 'verified') {
        return {
          ok: false,
          code: 'VERIFY_REQUIRED',
          message: 'Please complete 18+ verification before joining a plan.',
        };
      }
      if (!profile.rules_accepted_at) {
        return {
          ok: false,
          code: 'RULES_REQUIRED',
          message: 'Please accept the Community Rules before joining your first plan.',
        };
      }
      if (note) {
        const screen = screenTextContent(note);
        if (screen.action === 'reject') {
          return {
            ok: false,
            code: 'SCREEN_REJECTED',
            message: 'Phone numbers and social handles cannot be shared in join notes.',
          };
        }
      }
      // S-25: Free tier 2 joins per week
      if (profile.entitlement === 'free' && weeklyJoinsUsed >= FREE_JOINS_PER_WEEK) {
        return {
          ok: false,
          code: 'WEEKLY_CAP_REACHED',
          message: `Free tier includes ${FREE_JOINS_PER_WEEK} plan joins per week (Rule SB-1). Withdraw a pending request or wait until Monday.`,
        };
      }
      // S-27: New account 5 join requests/day
      if (weeklyJoinsUsed >= NEW_JOIN_PER_DAY) {
        return {
          ok: false,
          code: 'DAILY_CAP_REACHED',
          message: 'New accounts can request up to 5 joins per day during their first week (Rule SF-5).',
        };
      }

      setMemberships((prev) => ({
        ...prev,
        [planId]: { status: 'requested', checkedInAt: null, note: note ?? null },
      }));
      setWeeklyJoinsUsed((c) => c + 1);
      trackEvent('join_requested', { plan_id: planId });
      return { ok: true };
    },
    [profile.entitlement, profile.rules_accepted_at, profile.verification_status, weeklyJoinsUsed],
  );

  const withdrawJoinRequest = useCallback((planId: string) => {
    setMemberships((prev) => {
      const current = prev[planId];
      if (!current) return prev;
      if (current.status === 'requested') {
        // S-25: Withdrawal before approval returns the weekly join slot
        setWeeklyJoinsUsed((c) => Math.max(0, c - 1));
      }
      return {
        ...prev,
        [planId]: { ...current, status: 'withdrawn' },
      };
    });
  }, []);

  const decideJoinRequest = useCallback(
    (planId: string, userId: string, decision: 'approve' | 'decline') => {
      setHostRequests((prev) =>
        prev.map((req) =>
          req.planId === planId && req.userId === userId
            ? { ...req, status: decision === 'approve' ? 'approved' : 'declined' }
            : req,
        ),
      );
      if (decision === 'approve') {
        setPlans((prev) =>
          prev.map((pl) => {
            if (pl.id !== planId) return pl;
            const nextCount = Math.min(pl.capacity, pl.approved_count + 1);
            return {
              ...pl,
              approved_count: nextCount,
              status: nextCount >= pl.capacity ? 'full' : pl.status,
            };
          }),
        );
        trackEvent('join_approved', { plan_id: planId, wait_minutes: 12 });
      }
    },
    [],
  );

  const createNewPlan = useCallback(
    (input: {
      title: string;
      description?: string;
      activity: string;
      venueId: string;
      startsAt: string;
      endsAt: string;
      capacity: number;
      audience: PlanAudience;
      collegeId?: string | null;
    }) => {
      if (profile.verification_status !== 'verified') {
        return { ok: false, error: 'You must be 18+ verified to host a plan (Rule S-33).' };
      }
      if (input.audience === 'women_only' && profile.verified_gender !== 'woman') {
        return { ok: false, error: 'Only verified women can create women-only plans (Rule S-34).' };
      }
      if (profile.entitlement === 'free' && weeklyHostsUsed >= FREE_HOSTS_PER_WEEK) {
        return {
          ok: false,
          error: `Free tier users can host up to ${FREE_HOSTS_PER_WEEK} plan per week (Rule PL-1 / S-26).`,
        };
      }

      const venue = SEED_VENUES.find((v) => v.id === input.venueId && v.status === 'approved');
      if (!venue) {
        return { ok: false, error: 'Please select an approved public venue in Kota (Rule SF-1).' };
      }

      const parsed = CreatePlanSchema.safeParse({
        ...input,
        venueLateEventsAllowed: venue.late_events_allowed,
      });

      if (!parsed.success) {
        return {
          ok: false,
          error: parsed.error.issues[0]?.message ?? 'Invalid plan details',
        };
      }

      const newPlanId = `plan-${Date.now()}`;
      const leadHours = Math.round(
        (new Date(input.startsAt).getTime() - Date.now()) / (3600 * 1000),
      );

      const createdCard: FeedPlanCard = {
        id: newPlanId,
        city_id: profile.city_id ?? '11111111-1111-4111-8111-111111111101',
        host_id: profile.id,
        host_first_name: profile.first_name,
        host_avatar_url:
          photos[0]?.path ??
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        host_verified: true,
        host_age_band: computeAgeBand(profile.birth_year),
        host_college:
          SEED_COLLEGES.find((c) => c.id === profile.college_id)?.name ?? 'Kota Verified Member',
        host_plans_hosted: 1,
        host_late_cancels_30d: 0,
        venue_id: venue.id,
        venue_name: venue.name,
        venue_area_name: venue.area_name,
        venue_address: venue.address_line,
        venue_partner: venue.partner,
        venue_lat: venue.lat,
        venue_lng: venue.lng,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        activity: input.activity,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        capacity: input.capacity,
        approved_count: 1,
        audience: input.audience,
        college_id: input.collegeId ?? null,
        status: 'open',
        cover_image_url:
          venue.photo_url ??
          'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
        attendee_Initials: [profile.first_name.slice(0, 2).toUpperCase()],
      };

      setPlans((prev) => [createdCard, ...prev]);
      setMemberships((prev) => ({
        ...prev,
        [newPlanId]: { status: 'approved', checkedInAt: null, note: null },
      }));
      setMessagesByPlan((prev) => ({
        ...prev,
        [newPlanId]: [
          {
            id: `msg-init-${Date.now()}`,
            conversation_id: newPlanId,
            sender_id: profile.id,
            sender_name: profile.first_name,
            is_host: true,
            body: `Welcome to ${input.title}! Looking forward to meeting everyone at ${venue.name}.`,
            image_path: null,
            image_status: null,
            status: 'visible',
            flagged: false,
            created_at: new Date().toISOString(),
          },
        ],
      }));
      setWeeklyHostsUsed((c) => c + 1);

      trackEvent('plan_created', {
        plan_id: newPlanId,
        activity: input.activity,
        audience: input.audience,
        capacity: input.capacity,
        lead_hours: leadHours,
      });

      return { ok: true, planId: newPlanId };
    },
    [photos, profile, weeklyHostsUsed],
  );

  const cancelHostedPlan = useCallback((planId: string, reason: string) => {
    let isLate = false;
    setPlans((prev) =>
      prev.map((pl) => {
        if (pl.id !== planId) return pl;
        const hoursUntilStart = (new Date(pl.starts_at).getTime() - Date.now()) / (3600 * 1000);
        isLate = hoursUntilStart < 3;
        if (!isLate) {
          setWeeklyHostsUsed((c) => Math.max(0, c - 1));
        }
        return {
          ...pl,
          status: 'cancelled',
          description: reason ? `[Cancelled: ${reason}] ${pl.description ?? ''}` : pl.description,
        };
      }),
    );
    trackEvent('plan_cancelled', { plan_id: planId, late: isLate, by: 'host' });
    return { ok: true, lateCancel: isLate };
  }, []);

  const sendChatMessage = useCallback(
    (planId: string, body: string, imagePath?: string) => {
      if (profile.verification_status !== 'verified') {
        return { ok: false, error: 'Complete 18+ verification to send messages.' };
      }

      // S-27: New account 20 messages/day cap
      if (dailyMessagesSent >= NEW_MSG_PER_DAY) {
        return {
          ok: false,
          error: `New accounts can send up to ${NEW_MSG_PER_DAY} messages per day during the first week (Rule SF-5 / S-27).`,
        };
      }

      const outcome = screenTextContent(body);
      if (outcome.action === 'reject') {
        return {
          ok: false,
          error: 'Phone numbers, external links, and social handles (@insta, WhatsApp, etc.) cannot be shared here (Rule CH-3 / S-20).',
        };
      }

      const clientUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      const isHeld = outcome.action === 'hold';
      const newMsg: MessageRow = {
        id: clientUuid,
        conversation_id: planId,
        sender_id: profile.id,
        sender_name: profile.first_name,
        sender_avatar: photos[0]?.path ?? undefined,
        is_host: false,
        body: body.trim() || null,
        image_path: imagePath ?? null,
        image_status: imagePath ? 'approved' : null,
        status: isHeld ? 'held' : 'visible',
        flagged: isHeld,
        created_at: new Date().toISOString(),
        pending_sync: isOfflineSimulated,
      };

      if (isOfflineSimulated) {
        enqueueOfflineMessage(newMsg);
      }

      setMessagesByPlan((prev) => ({
        ...prev,
        [planId]: [...(prev[planId] ?? []), newMsg],
      }));
      setDailyMessagesSent((c) => c + 1);

      return { ok: true, held: isHeld };
    },
    [dailyMessagesSent, isOfflineSimulated, photos, profile.first_name, profile.id, profile.verification_status],
  );

  // PL-6, S-36, S-37: Venue Check-in within 150m & ±30 min
  const performVenueCheckIn = useCallback(
    (
      planId: string,
      coords?: { lat: number; lng: number; accuracy: number; mocked?: boolean },
    ) => {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) {
        return { ok: false, message: 'Plan not found.' };
      }

      const effectiveCoords = coords ?? {
        lat: plan.venue_lat + 0.0004, // ~45m from venue pin
        lng: plan.venue_lng + 0.0004,
        accuracy: 18,
        mocked: false,
      };

      const evalResult = evaluateCheckIn({
        userLat: effectiveCoords.lat,
        userLng: effectiveCoords.lng,
        accuracyMeters: effectiveCoords.accuracy,
        mocked: effectiveCoords.mocked,
        venueLat: plan.venue_lat,
        venueLng: plan.venue_lng,
        planStartsAtIso: plan.starts_at,
      });

      if (!evalResult.allowed) {
        const messagesByCode = {
          MOCK_LOCATION_DETECTED: 'Mock GPS location detected (Rule S-37). Disable mock location and retry.',
          LOW_GPS_ACCURACY: 'GPS signal accuracy is worse than 100m. Step near the entrance and retry.',
          OUTSIDE_TIME_WINDOW: `Check-in opens 30 minutes before start time and closes 30 minutes after (Rule PL-6).`,
          TOO_FAR_FROM_VENUE: `You are ${evalResult.distanceMeters}m away. You must be within 150m of ${plan.venue_name} to check in (Rule PL-6).`,
        };
        return {
          ok: false,
          message: messagesByCode[evalResult.code],
          distanceMeters: evalResult.distanceMeters,
        };
      }

      const checkedInAt = new Date().toISOString();
      setMemberships((prev) => ({
        ...prev,
        [planId]: {
          status: 'attended',
          checkedInAt,
          note: prev[planId]?.note ?? null,
        },
      }));

      trackEvent('check_in', {
        plan_id: planId,
        minutes_from_start: evalResult.minutesFromStart,
      });

      return {
        ok: true,
        message: `Checked in at ${plan.venue_name}! (${evalResult.distanceMeters}m from venue pin · GPS coordinate discarded)`,
        distanceMeters: evalResult.distanceMeters,
      };
    },
    [plans],
  );

  const submitPostPlanRating = useCallback(
    (
      planId: string,
      ratings: { rateeId: string; feltSafe: boolean; showedUp: boolean }[],
    ) => {
      trackEvent('rating_submitted', { plan_id: planId, rated_count: ratings.length });
    },
    [],
  );

  const blockMember = useCallback(
    (targetUserId: string, context: 'profile' | 'plan' | 'message' = 'profile') => {
      setBlockedUserIds((prev) => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]));
      trackEvent('user_blocked', { context });
    },
    [],
  );

  const unblockMember = useCallback((targetUserId: string) => {
    setBlockedUserIds((prev) => prev.filter((id) => id !== targetUserId));
  }, []);

  const submitSafetyReport = useCallback(
    (input: {
      targetUserId: string;
      planId?: string;
      messageId?: string;
      reason: ReportReason;
      details?: string;
      alsoBlock?: boolean;
      context: 'profile' | 'plan' | 'message';
    }) => {
      const severity = getReportSeverity(input.reason);
      trackEvent('report_submitted', {
        reason: input.reason,
        severity,
        context: input.context,
      });
      if (input.alsoBlock !== false) {
        blockMember(input.targetUserId, input.context);
      }
      return { ok: true };
    },
    [blockMember],
  );

  const saveTrustedContact = useCallback(async (contact: TrustedContact) => {
    await saveTrustedContactOnDevice(contact);
    setTrustedContact(contact);
  }, []);

  const removeTrustedContact = useCallback(async () => {
    await clearTrustedContactOnDevice();
    setTrustedContact(null);
  }, []);

  const submitUserAppeal = useCallback(
    (subject: AppealRow['subject'], message: string) => {
      if (!message || message.trim().length < 10) {
        return { ok: false, error: 'Please provide at least 10 characters explaining your appeal.' };
      }
      const newAppeal: AppealRow = {
        id: `appeal-${Date.now()}`,
        user_id: profile.id,
        subject,
        subject_id: profile.id,
        message: message.trim(),
        status: 'open',
        response: null,
        due_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };
      setAppeals((prev) => [newAppeal, ...prev]);
      trackEvent('appeal_submitted', { subject });
      return { ok: true };
    },
    [profile.id],
  );

  const exportUserDataJson = useCallback(() => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      dataResidency: 'ap-south-1 (Mumbai, India)',
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        age_band: computeAgeBand(profile.birth_year),
        verification_status: profile.verification_status,
        area_name: profile.area_name,
        interests: profile.interests,
        languages: profile.languages,
      },
      consents,
      memberships,
      appeals,
    };
    return JSON.stringify(bundle, null, 2);
  }, [appeals, consents, memberships, profile]);

  const deleteUserAccount = useCallback(() => {
    const nowIso = new Date().toISOString();
    setProfile((prev) => ({
      ...prev,
      status: 'deleted',
      deleted_at: nowIso,
      updated_at: nowIso,
    }));
  }, []);

  const getPublicProfile = useCallback(
    (userId: string): PublicProfileView | null => {
      if (blockedUserIds.includes(userId)) return null; // S-17
      if (userId === profile.id) {
        return {
          id: profile.id,
          city_id: profile.city_id ?? '11111111-1111-4111-8111-111111111101',
          first_name: profile.first_name,
          age_band: computeAgeBand(profile.birth_year),
          is_verified: profile.verification_status === 'verified',
          bio: profile.bio_status === 'visible' ? profile.bio : null,
          interests: profile.interests,
          languages: profile.languages,
          area_name: profile.area_name || KOTA_AREAS[0]!.nameEn,
          college_name:
            SEED_COLLEGES.find((c) => c.id === profile.college_id)?.name ?? null,
          approved_photos: photos
            .filter((p) => p.status === 'approved' && p.path)
            .map((p) => p.path!),
          plans_attended: 8,
          plans_hosted: weeklyHostsUsed + 2,
          show_up_rate: 100,
        };
      }
      return SEED_PUBLIC_PROFILES[userId] ?? null;
    },
    [blockedUserIds, photos, profile, weeklyHostsUsed],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      profile,
      photos,
      cities: SEED_CITIES,
      colleges: SEED_COLLEGES,
      venues: SEED_VENUES,
      plans,
      visibleFeedPlans,
      memberships,
      hostRequests,
      messagesByPlan,
      blockedUserIds,
      appeals,
      trustedContact,
      isOfflineSimulated,
      otpFailedAttempts,
      otpLockedUntil,
      consents,
      weeklyJoinsUsed,
      weeklyHostsUsed,
      setOfflineSimulated,
      selectCity,
      requestOtp,
      verifyOtpCode,
      saveConsents,
      acceptCommunityRules,
      updateProfileDraft,
      addProfilePhoto,
      removeProfilePhoto,
      completeOnboardingProfile,
      runKycSimulation,
      requestJoinPlan,
      withdrawJoinRequest,
      decideJoinRequest,
      createNewPlan,
      cancelHostedPlan,
      sendChatMessage,
      flushOfflineOutbox,
      performVenueCheckIn,
      submitPostPlanRating,
      submitSafetyReport,
      blockMember,
      unblockMember,
      saveTrustedContact,
      removeTrustedContact,
      submitUserAppeal,
      exportUserDataJson,
      deleteUserAccount,
      getPublicProfile,
    }),
    [
      profile,
      photos,
      plans,
      visibleFeedPlans,
      memberships,
      hostRequests,
      messagesByPlan,
      blockedUserIds,
      appeals,
      trustedContact,
      isOfflineSimulated,
      otpFailedAttempts,
      otpLockedUntil,
      consents,
      weeklyJoinsUsed,
      weeklyHostsUsed,
      setOfflineSimulated,
      selectCity,
      requestOtp,
      verifyOtpCode,
      saveConsents,
      acceptCommunityRules,
      updateProfileDraft,
      addProfilePhoto,
      removeProfilePhoto,
      completeOnboardingProfile,
      runKycSimulation,
      requestJoinPlan,
      withdrawJoinRequest,
      decideJoinRequest,
      createNewPlan,
      cancelHostedPlan,
      sendChatMessage,
      flushOfflineOutbox,
      performVenueCheckIn,
      submitPostPlanRating,
      submitSafetyReport,
      blockMember,
      unblockMember,
      saveTrustedContact,
      removeTrustedContact,
      submitUserAppeal,
      exportUserDataJson,
      deleteUserAccount,
      getPublicProfile,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useYuvomeet(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useYuvomeet must be used within YuvomeetProvider');
  }
  return ctx;
}
