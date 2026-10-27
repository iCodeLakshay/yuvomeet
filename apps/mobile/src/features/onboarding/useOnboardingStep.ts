import type { Href } from 'expo-router';
import { useConsents, useMyPhotos } from '../profile/api';
import { useMe } from '../session/SessionProvider';

/** Where an onboarding user should resume after a restart. */
export function useOnboardingStep(): Href | null {
  const me = useMe();
  const consents = useConsents();
  const photos = useMyPhotos();
  if (consents.isLoading || photos.isLoading) return null;
  if (consents.data?.camera === undefined) return '/consent';
  if (!me.city_id) return '/city';
  if (!me.first_name || !me.declared_gender || !me.area_name) return '/profile';
  if ((photos.data ?? []).filter((p) => p.status !== 'rejected').length < 2) return '/photos';
  if (me.interests.length < 2) return '/interests';
  return '/rules';
}
