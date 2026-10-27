import { useMutation, useQuery } from '@tanstack/react-query';
import { POLICY_VERSION } from '@yuvomeet/shared';
import { unwrap, unwrapMaybe } from '../../lib/errors';
import { uploadForModeration } from '../../lib/media';
import { qk, queryClient } from '../../lib/query';
import { supabase, type Enums } from '../../lib/supabase';
import { track } from '../../lib/telemetry';
import { useSession } from '../session/SessionProvider';

const refreshMe = () => queryClient.invalidateQueries({ queryKey: qk.me });

/** Lookups change rarely: cached for a day and persisted offline. */
export function useLookups() {
  return useQuery({
    queryKey: qk.lookups,
    staleTime: 24 * 3_600_000,
    queryFn: async () => {
      const [interests, activities, colleges] = await Promise.all([
        supabase.from('interests').select('slug, label, icon').order('sort'),
        supabase.from('activities').select('slug, label, icon').order('sort'),
        supabase.from('colleges').select('id, name, city_id').order('name'),
      ]);
      return { interests: unwrap(interests), activities: unwrap(activities), colleges: unwrap(colleges) };
    },
  });
}

export function useCities() {
  return useQuery({
    queryKey: qk.cities,
    staleTime: 3_600_000,
    queryFn: async () => unwrap(await supabase.from('cities').select('id, name, slug, status').order('status').order('name')),
  });
}

export async function selectCity(cityId: string): Promise<Enums<'city_status'>> {
  const status = unwrap(await supabase.rpc('select_city', { p_city_id: cityId }));
  track('city_selected', { city_status: status });
  await refreshMe();
  return status;
}

/** C-1, C-4: one append-only row per purpose; the latest row wins. */
export async function recordConsents(userId: string, choices: Partial<Record<Enums<'consent_purpose'>, boolean>>) {
  const rows = Object.entries(choices).map(([purpose, granted]) => ({
    user_id: userId,
    purpose: purpose as Enums<'consent_purpose'>,
    granted: Boolean(granted),
    policy_version: POLICY_VERSION,
  }));
  unwrap(await supabase.from('consents').insert(rows));
  await queryClient.invalidateQueries({ queryKey: qk.consents });
}

export function useConsents() {
  const { userId } = useSession();
  return useQuery({
    queryKey: qk.consents,
    enabled: Boolean(userId),
    queryFn: async () => {
      const rows = unwrap(
        await supabase.from('consents').select('purpose, granted, created_at').eq('user_id', userId!).order('created_at'),
      );
      const latest: Partial<Record<Enums<'consent_purpose'>, boolean>> = {};
      for (const row of rows) latest[row.purpose] = row.granted;
      return latest;
    },
  });
}

export interface ProfilePatch {
  firstName?: string;
  gender?: Enums<'gender'>;
  bio?: string;
  interests?: string[];
  languages?: string[];
  area?: { name: string; cell: string };
  collegeId?: string | null;
}

export function useSaveProfile() {
  return useMutation({
    mutationFn: async (patch: ProfilePatch) =>
      unwrap(
        await supabase.rpc('save_profile', {
          p_first_name: patch.firstName,
          p_declared_gender: patch.gender,
          p_bio: patch.bio,
          p_interests: patch.interests,
          p_languages: patch.languages,
          p_area_name: patch.area?.name,
          p_area_cell: patch.area?.cell,
          p_college_id: patch.collegeId ?? undefined,
          p_clear_college: patch.collegeId === null,
        }),
      ),
    onSuccess: refreshMe,
  });
}

export async function acceptRules() {
  unwrap(await supabase.rpc('accept_rules', { p_policy_version: POLICY_VERSION }));
}

/** ON-3: activates the profile once every requirement holds (checked server-side). */
export async function completeProfile(photoCount: number, interestCount: number) {
  const status = unwrap(await supabase.rpc('complete_profile'));
  if (status === 'active') track('profile_completed', { photo_count: photoCount, interest_count: interestCount });
  await refreshMe();
  return status;
}

export function useMyPhotos() {
  const { userId } = useSession();
  return useQuery({
    queryKey: qk.myPhotos,
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('profile_photos')
          .select('id, path, quarantine_path, position, status, reject_reason')
          .eq('user_id', userId!)
          .order('position'),
      ),
    // Moderation can leave a photo pending; poll while any is pending.
    refetchInterval: (query) => (query.state.data?.some((p) => p.status === 'pending') ? 4_000 : false),
  });
}

export function useAddPhoto() {
  return useMutation({
    mutationFn: ({ uri, position }: { uri: string; position: number }) => uploadForModeration(uri, { kind: 'profile', position }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.myPhotos }),
  });
}

export function useDeletePhoto() {
  return useMutation({
    mutationFn: async (photoId: string) => {
      const paths = unwrap(await supabase.rpc('delete_profile_photo', { p_photo_id: photoId })) ?? [];
      const media = paths.filter((p) => p.startsWith('profiles/'));
      if (media.length) await supabase.storage.from('media').remove(media);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.myPhotos }),
  });
}

/** S-18: other people only through public_profiles. Returns null when blocked or hidden. */
export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: qk.profile(userId),
    queryFn: async () => unwrapMaybe(await supabase.from('public_profiles').select('*').eq('id', userId).maybeSingle()),
  });
}
