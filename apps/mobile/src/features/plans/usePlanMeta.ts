import { useMemo } from 'react';
import type { IconName } from '../../ui';
import { useLookups } from '../profile/api';

/** Activity label and icon from the lookups table (cached offline). */
export function useActivityMeta() {
  const { data } = useLookups();
  return useMemo(() => {
    const map = new Map((data?.activities ?? []).map((a) => [a.slug, a]));
    return (slug: string | null | undefined): { label: string; icon: IconName } => {
      const hit = slug ? map.get(slug) : undefined;
      return { label: hit?.label ?? 'Meetup', icon: (hit?.icon as IconName | undefined) ?? 'groups' };
    };
  }, [data]);
}

export function spotsLeft(plan: { capacity: number | null; approved_count: number | null }) {
  return Math.max(0, (plan.capacity ?? 0) - (plan.approved_count ?? 0));
}
