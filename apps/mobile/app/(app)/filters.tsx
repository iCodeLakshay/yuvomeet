import { KOTA_AREAS } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { EMPTY_FILTERS, type FeedFilters } from '../../src/features/plans/api';
import { feedFilters } from '../../src/features/plans/stores';
import { isVerified, useMe } from '../../src/features/session/SessionProvider';
import { Button, Chip, gutter, SectionHeader, SheetHeader, space } from '../../src/ui';

const DAYS: { value: FeedFilters['day']; label: string }[] = [
  { value: null, label: 'Next 2 weeks' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
];

/** PL-2 filters sheet: day, area, audience. Activity lives in the feed chips. */
export default function Filters() {
  const me = useMe();
  const f = feedFilters.use();
  const set = (patch: Partial<FeedFilters>) => feedFilters.set((prev) => ({ ...prev, ...patch }));
  const audiences: { value: FeedFilters['audience']; label: string }[] = [
    { value: null, label: 'Everyone' },
    ...(isVerified(me) && me.verified_gender === 'woman' ? [{ value: 'women_only' as const, label: 'Women only' }] : []),
    ...(me.college_id ? [{ value: 'same_college' as const, label: 'My college' }] : []),
  ];

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <SheetHeader title="Filter plans" subtitle="Kota" />
      <SectionHeader title="Day" small />
      <View style={styles.wrap}>
        {DAYS.map((d) => (
          <Chip key={d.label} label={d.label} selected={f.day === d.value} onPress={() => set({ day: d.value })} />
        ))}
      </View>
      <SectionHeader title="Area" small />
      <View style={styles.wrap}>
        <Chip label="All areas" selected={!f.area} onPress={() => set({ area: null })} />
        {KOTA_AREAS.map((a) => (
          <Chip key={a.name} label={a.name} selected={f.area === a.name} onPress={() => set({ area: a.name })} />
        ))}
      </View>
      <SectionHeader title="Who it's for" small />
      <View style={styles.wrap}>
        {audiences.map((a) => (
          <Chip key={a.label} label={a.label} selected={f.audience === a.value} onPress={() => set({ audience: a.value })} />
        ))}
      </View>
      <View style={styles.actions}>
        <Button label="Show plans" onPress={() => router.back()} />
        <Button label="Reset filters" variant="ghost" onPress={() => feedFilters.set({ ...EMPTY_FILTERS, search: f.search })} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: gutter, paddingBottom: space.xxxl, gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { marginTop: space.lg, gap: space.sm },
});
