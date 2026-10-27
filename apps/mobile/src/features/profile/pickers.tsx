import { KOTA_AREAS, MAX_INTERESTS } from '@yuvomeet/shared';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, SectionHeader, space, type IconName } from '../../ui';
import { useLookups } from './api';

/** Kota area chips (coarse area only, never an address). Shared by onboarding and edit profile. */
export const AreaPicker = memo(function AreaPicker({ value, onChange }: { value: string | null; onChange: (name: string) => void }) {
  return (
    <View style={styles.wrap}>
      {KOTA_AREAS.map((a) => (
        <Chip key={a.name} label={a.name} selected={value === a.name} onPress={() => onChange(a.name)} />
      ))}
    </View>
  );
});

export interface CollegePickerProps {
  cityId: string | null;
  value: string | null;
  onChange: (id: string | null) => void;
}

/** Optional college / coaching chips (with heading) for the member's city; tap again to clear. */
export const CollegePicker = memo(function CollegePicker({ cityId, value, onChange }: CollegePickerProps) {
  const { data } = useLookups();
  const colleges = (data?.colleges ?? []).filter((c) => c.city_id === cityId);
  if (!colleges.length) return null;
  return (
    <>
      <SectionHeader title="College or coaching (optional)" small />
      <View style={styles.wrap}>
        {colleges.map((c) => (
          <Chip key={c.id} label={c.name} selected={value === c.id} onPress={() => onChange(value === c.id ? null : c.id)} />
        ))}
      </View>
    </>
  );
});

/** Stitch "Onboarding: Interests" two-column choice chips, capped at MAX_INTERESTS. */
export const InterestPicker = memo(function InterestPicker({ value, onChange }: { value: readonly string[]; onChange: (next: string[]) => void }) {
  const { data } = useLookups();
  const toggle = (slug: string) =>
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : value.length < MAX_INTERESTS ? [...value, slug] : [...value]);
  return (
    <View style={styles.grid}>
      {(data?.interests ?? []).map((i) => (
        <Chip key={i.slug} kind="choice" grow label={i.label} icon={i.icon as IconName} selected={value.includes(i.slug)} onPress={() => toggle(i.slug)} />
      ))}
    </View>
  );
});

export const areaCell = (name: string | null | undefined) => KOTA_AREAS.find((a) => a.name === name)?.cell;

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
