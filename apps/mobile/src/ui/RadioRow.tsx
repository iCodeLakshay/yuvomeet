import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, radii, space } from './theme';

export interface RadioRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}

export const RadioRow = memo(function RadioRow({ label, selected, onPress, icon }: RadioRowProps) {
  return (
    <Pressable
      onPress={onPress}
      haptic
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      pressScale={0.99}
      style={[styles.row, selected ? styles.selected : null]}
    >
      {icon ? <Icon name={icon} size={15} color="textMuted" /> : null}
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      <View style={[styles.outer, selected ? styles.outerOn : null]}>{selected ? <View style={styles.inner} /> : null}</View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { borderColor: colors.borderStrong, backgroundColor: colors.surface2 },
  flex: { flex: 1 },
  outer: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.textSubtle, alignItems: 'center', justifyContent: 'center' },
  outerOn: { borderColor: colors.primary },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
