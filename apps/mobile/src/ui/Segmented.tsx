import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, gutter, radii, space } from './theme';

export interface SegmentedItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedProps<T extends string> {
  items: readonly SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

function SegmentedInner<T extends string>({ items, value, onChange }: SegmentedProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.row}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active ? styles.active : null]}
          >
            <Text variant="smallStrong" color={active ? 'text' : 'textSubtle'}>
              {item.label}
            </Text>
            {item.count ? (
              <View style={styles.count}>
                <Text variant="caption">{item.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Pill tab strip (My Plans: Upcoming / Hosted / Pending / Past; Notifications filters). */
export const Segmented = memo(SegmentedInner) as typeof SegmentedInner;

const styles = StyleSheet.create({
  // A horizontal ScrollView in a flex column stretches to fill the height without this.
  strip: { flexGrow: 0, flexShrink: 0 },
  row: { paddingHorizontal: gutter, paddingVertical: space.xs, gap: space.sm, alignItems: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: { backgroundColor: colors.surface3, borderColor: colors.borderStrong },
  count: { paddingHorizontal: 7, borderRadius: radii.pill, backgroundColor: colors.surface4 },
});
