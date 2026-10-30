import { CUSTOM_AREA_CELL, KOTA_AREAS, MAX_INTERESTS } from '@yuvomeet/shared';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Field, SectionHeader, space, type IconName } from '../../ui';
import { useLookups } from './api';

/** Kota area chips, plus a free-text area when none of the chips fit. */
export const AreaPicker = memo(function AreaPicker({
  value,
  onChange,
  error,
}: {
  value: string | null;
  onChange: (name: string) => void;
  error?: string | null;
}) {
  const listed = KOTA_AREAS.some((a) => a.name === value);
  const [other, setOther] = useState(() => Boolean(value) && !listed);
  const showOther = other || (Boolean(value) && !listed);
  return (
    <View style={styles.stack}>
      <View style={styles.wrap}>
        {KOTA_AREAS.map((a) => (
          <Chip
            key={a.name}
            label={a.name}
            selected={!showOther && value === a.name}
            onPress={() => {
              setOther(false);
              onChange(a.name);
            }}
          />
        ))}
        <Chip
          label="Other"
          selected={showOther}
          onPress={() => {
            setOther(true);
            if (listed) onChange('');
          }}
        />
      </View>
      {showOther ? (
        <Field
          label="Your area"
          icon="location-on"
          value={listed ? '' : (value ?? '')}
          onChangeText={onChange}
          maxLength={40}
          autoCapitalize="words"
          placeholder="Indra Vihar"
          error={error}
        />
      ) : null}
    </View>
  );
});

export interface CollegePickerProps {
  cityId: string | null;
  value: string | null;
  /** Free-text college when it is not one of the chips. */
  custom: string;
  onChange: (id: string | null) => void;
  onCustom: (name: string) => void;
  error?: string | null;
}

/** Optional college / coaching chips, plus a field for a name that is not listed. */
export const CollegePicker = memo(function CollegePicker({ cityId, value, custom, onChange, onCustom, error }: CollegePickerProps) {
  const { data } = useLookups();
  const colleges = (data?.colleges ?? []).filter((c) => c.city_id === cityId);
  return (
    <View style={styles.stack}>
      <SectionHeader title="College or coaching (optional)" small />
      {colleges.length ? (
        <View style={styles.wrap}>
          {colleges.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={!custom.trim() && value === c.id}
              onPress={() => {
                onCustom('');
                onChange(value === c.id ? null : c.id);
              }}
            />
          ))}
        </View>
      ) : null}
      <Field
        label="Not listed"
        icon="school"
        value={custom}
        onChangeText={(name) => {
          onCustom(name);
          if (name.trim()) onChange(null);
        }}
        maxLength={80}
        autoCapitalize="words"
        placeholder="Your college or coaching"
        error={error}
      />
    </View>
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

export const areaCell = (name: string | null | undefined) => {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  return KOTA_AREAS.find((a) => a.name === trimmed)?.cell ?? CUSTOM_AREA_CELL;
};

const styles = StyleSheet.create({
  stack: { gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
