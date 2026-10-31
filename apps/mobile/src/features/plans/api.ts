import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { FEED_PAGE_SIZE } from '@yuvomeet/shared';
import * as Location from 'expo-location';
import { AppError, unwrap, unwrapMaybe } from '../../lib/errors';
import { PAYWALL_ENABLED } from '../../lib/flags';
import { callFunction } from '../../lib/functions';
import { uploadForModeration } from '../../lib/media';
import { qk, queryClient } from '../../lib/query';
import { supabase, type Enums, type Views } from '../../lib/supabase';
import { track } from '../../lib/telemetry';

export type PlanCard = Views<'plan_cards'>;
export type PlanAudience = Enums<'plan_audience'>;

export interface FeedFilters {
  activity: string | null;
  area: string | null;
  audience: PlanAudience | null;
  day: 'today' | 'tomorrow' | 'week' | null;
  search: string;
}

export const EMPTY_FILTERS: FeedFilters = { activity: null, area: null, audience: null, day: null, search: '' };

function dayWindow(day: FeedFilters['day']): [string, string] {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  const startOfToday = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 3_600_000;
  const day0 = day === 'tomorrow' ? startOfToday + 86_400_000 : startOfToday;
  const end = day === 'today' || day === 'tomorrow' ? day0 + 86_400_000 : startOfToday + 14 * 86_400_000;
  return [new Date(Math.max(day0, now.getTime() - 3_600_000)).toISOString(), new Date(end).toISOString()];
}

const istDay = (iso: string) => new Date(Date.parse(iso) + 5.5 * 3_600_000).toISOString().slice(0, 10);

/**
 * Architecture §Feed: within each day, Premium hosts' plans come first (boost) and hosts with
 * 2+ late cancels in 30 days sort after everyone else.
 */
function rankWithinDay(rows: PlanCard[]): PlanCard[] {
  const out: PlanCard[] = [];
  let day = '';
  let boosted: PlanCard[] = [];
  let normal: PlanCard[] = [];
  let demoted: PlanCard[] = [];
  const flush = () => {
    out.push(...boosted, ...normal, ...demoted);
    boosted = [];
    normal = [];
    demoted = [];
  };
  for (const row of rows) {
    const d = istDay(row.starts_at!);
    if (d !== day) {
      flush();
      day = d;
    }
    if ((row.host_late_cancels_30d ?? 0) >= 2) demoted.push(row);
    else if (row.host_boosted) boosted.push(row);
    else normal.push(row);
  }
  flush();
  return out;
}

/** PL-2: city-scoped by RLS; keyset pagination on (starts_at, id); late cancellers sort last. */
export function useFeed(filters: FeedFilters) {
  return useInfiniteQuery({
    queryKey: qk.feed(filters),
    initialPageParam: null as { startsAt: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      const [from, to] = dayWindow(filters.day ?? 'week');
      let q = supabase
        .from('plan_cards')
        .select('*')
        .in('status', ['open', 'full'])
        .gte('starts_at', from)
        .lt('starts_at', to)
        .order('starts_at')
        .order('id')
        .limit(FEED_PAGE_SIZE);
      if (filters.activity) q = q.eq('activity', filters.activity);
      if (filters.area) q = q.eq('venue_area_name', filters.area);
      if (filters.audience) q = q.eq('audience', filters.audience);
      if (filters.search.trim()) {
        const term = filters.search.trim().replace(/[%,()]/g, ' ');
        q = q.or(`title.ilike.%${term}%,venue_name.ilike.%${term}%,venue_area_name.ilike.%${term}%`);
      }
      if (pageParam) q = q.or(`starts_at.gt.${pageParam.startsAt},and(starts_at.eq.${pageParam.startsAt},id.gt.${pageParam.id})`);
      return rankWithinDay(unwrap(await q));
    },
    getNextPageParam: (last) => {
      if (last.length < FEED_PAGE_SIZE) return undefined;
      // Cursor is the page maximum by (starts_at, id); demotion may have moved it.
      const tail = last.reduce((max, p) =>
        p.starts_at! > max.starts_at! || (p.starts_at === max.starts_at && p.id! > max.id!) ? p : max,
      );
      return { startsAt: tail.starts_at!, id: tail.id! };
    },
  });
}

/** Single plan; returns null for "plan not found" (also what women-only plans look like to others, S-15). */
export function usePlan(planId: string) {
  return useQuery({
    queryKey: qk.plan(planId),
    queryFn: async () => unwrapMaybe(await supabase.from('plan_cards').select('*').eq('id', planId).maybeSingle()),
    initialData: () => findCachedPlan(planId),
    initialDataUpdatedAt: 0,
  });
}

function findCachedPlan(planId: string): PlanCard | undefined {
  for (const [, data] of queryClient.getQueriesData<{ pages: PlanCard[][] }>({ queryKey: ['feed'] })) {
    const hit = data?.pages.flat().find((p) => p.id === planId);
    if (hit) return hit;
  }
  return undefined;
}

/** PL-5: hosting, joined, requested and past plans of the current user. */
export function useMyPlans(userId: string) {
  return useQuery({
    queryKey: qk.myPlans,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('plan_cards')
          .select('*')
          .or(`host_id.eq.${userId},my_status.not.is.null`)
          .gte('starts_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
          .order('starts_at'),
      );
      const upcoming = (p: PlanCard) => p.status === 'open' || p.status === 'full' || p.status === 'started';
      return {
        hosted: rows.filter((p) => p.host_id === userId && upcoming(p)),
        joined: rows.filter((p) => p.host_id !== userId && upcoming(p) && p.my_status === 'approved'),
        pending: rows.filter((p) => upcoming(p) && p.my_status === 'requested'),
        past: rows
          .filter((p) => p.status === 'completed' || (p.status === 'cancelled' && p.my_status !== 'withdrawn'))
          .reverse(),
      };
    },
  });
}

export function useRoster(planId: string) {
  return useQuery({
    queryKey: qk.roster(planId),
    enabled: planId.length > 0,
    queryFn: async () => unwrap(await supabase.from('plan_roster').select('*').eq('plan_id', planId).order('is_host', { ascending: false })),
  });
}

export function useJoinRequests(planId: string) {
  return useQuery({
    queryKey: qk.requests(planId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('join_requests')
          .select('*')
          .eq('plan_id', planId)
          .order('low_priority')
          .order('is_priority', { ascending: false })
          .order('requested_at'),
      ),
  });
}

export interface Caps {
  joins_used: number;
  joins_limit: number;
  hosts_used: number;
  hosts_limit: number;
  entitlement: 'free' | 'plus' | 'premium';
  entitlement_until: string | null;
}

export function useCaps() {
  return useQuery({
    queryKey: qk.caps,
    queryFn: async () => unwrap(await supabase.rpc('my_caps')) as unknown as Caps,
  });
}

/**
 * True when the free-tier weekly join and host caps do not apply: a paid pass lifts them
 * (enforced in request_join / create_plan), and so does the paywall being switched off.
 */
export const isPaid = (caps: Pick<Caps, 'entitlement'> | undefined) =>
  !PAYWALL_ENABLED || Boolean(caps && caps.entitlement !== 'free');

/** PL-1: 1:1 plan banner, moderated before others can see it. */
export function useUploadCover() {
  return useMutation({ mutationFn: (uri: string) => uploadForModeration(uri, { kind: 'plan' }) });
}

const refreshPlans = (planId?: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['feed'] }),
    queryClient.invalidateQueries({ queryKey: qk.myPlans }),
    queryClient.invalidateQueries({ queryKey: qk.caps }),
    planId ? queryClient.invalidateQueries({ queryKey: ['plan', planId] }) : null,
  ]);

export interface NewPlan {
  venueId: string;
  title: string;
  description: string;
  activity: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  audience: PlanAudience;
  requiresApproval: boolean;
  /** Uploaded banner (plan_covers id), attached after the plan is created. */
  coverId?: string | null;
  /** Price per person in paise; null for a free plan. */
  pricePaise?: number | null;
}

export function useCreatePlan() {
  return useMutation({
    mutationFn: async (p: NewPlan) => {
      const id = unwrap(
        await supabase.rpc('create_plan', {
          p_venue_id: p.venueId,
          p_title: p.title,
          p_description: p.description,
          p_activity: p.activity,
          p_starts_at: p.startsAt.toISOString(),
          p_ends_at: p.endsAt.toISOString(),
          p_capacity: p.capacity,
          p_audience: p.audience,
          p_requires_approval: p.requiresApproval,
        }),
      );
      if (p.pricePaise) {
        const { error } = await supabase.rpc('set_plan_price', { p_plan_id: id, p_price_paise: p.pricePaise });
        // A paid plan must never go out free: withdraw it and surface the reason.
        if (error) {
          await supabase.rpc('cancel_plan', { p_plan_id: id, p_reason: 'Price could not be set' });
          unwrap({ data: null, error });
        }
      }
      // The plan exists even if attaching the banner fails; the venue photo is the fallback.
      if (p.coverId) await supabase.rpc('set_plan_cover', { p_plan_id: id, p_cover_id: p.coverId });
      track('plan_created', {
        plan_id: id,
        activity: p.activity,
        audience: p.audience,
        capacity: p.capacity,
        lead_hours: Math.round((p.startsAt.getTime() - Date.now()) / 3_600_000),
      });
      return id;
    },
    onSuccess: () => refreshPlans(),
  });
}

export function useRequestJoin(planId: string) {
  return useMutation({
    mutationFn: async (note: string) => {
      const status = unwrap(await supabase.rpc('request_join', { p_plan_id: planId, p_note: note || undefined }));
      track('join_requested', { plan_id: planId });
      return status;
    },
    onSettled: () => refreshPlans(planId),
  });
}

export function useLeavePlan(planId: string) {
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('leave_plan', { p_plan_id: planId })),
    onSettled: () => refreshPlans(planId),
  });
}

export function useDecideJoin(planId: string) {
  return useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) =>
      unwrap(await supabase.rpc('decide_join', { p_plan_id: planId, p_user_id: userId, p_approve: approve })),
    onSettled: () => Promise.all([refreshPlans(planId), queryClient.invalidateQueries({ queryKey: qk.requests(planId) })]),
  });
}

export function useCancelPlan(planId: string) {
  return useMutation({
    mutationFn: async (reason: string) => {
      const late = unwrap(await supabase.rpc('cancel_plan', { p_plan_id: planId, p_reason: reason }));
      track('plan_cancelled', { plan_id: planId, late, by: 'host' });
      return late;
    },
    onSettled: () => refreshPlans(planId),
  });
}

/** PL-6: one foreground GPS fix, sent once and discarded server-side (S-36, S-37). */
export function useCheckIn(planId: string) {
  return useMutation({
    mutationFn: async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new AppError('Allow location access to check in. It is used once and never stored.', 'PERMISSION');
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const res = await callFunction<{ checked_in_at: string; minutes_from_start?: number }>('check-in', {
        planId,
        lat: fix.coords.latitude,
        lng: fix.coords.longitude,
        accuracy: fix.coords.accuracy ?? 999,
        mocked: fix.mocked ?? false,
      });
      track('check_in', { plan_id: planId, minutes_from_start: res.minutes_from_start ?? 0 });
      return res;
    },
    onSettled: () => refreshPlans(planId),
  });
}

export function useSubmitRating(planId: string) {
  return useMutation({
    mutationFn: async (ratings: { ratee_id: string; felt_safe: boolean; showed_up: boolean }[]) => {
      const count = unwrap(await supabase.rpc('submit_rating', { p_plan_id: planId, p_ratings: ratings }));
      track('rating_submitted', { plan_id: planId, rated_count: count });
      return count;
    },
  });
}

export function useVenues() {
  return useQuery({
    queryKey: qk.venues,
    staleTime: 3_600_000,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('venues')
          .select('id, name, area_name, address_line, lat, lng, capacity, partner, late_events_allowed, hours, venue_photos(path, position)')
          .eq('status', 'approved')
          .order('name'),
      ),
  });
}

export type Venue = NonNullable<ReturnType<typeof useVenues>['data']>[number];

export const venueCover = (v: Pick<Venue, 'venue_photos'>) =>
  [...(v.venue_photos ?? [])].sort((a, b) => a.position - b.position)[0]?.path ?? null;
