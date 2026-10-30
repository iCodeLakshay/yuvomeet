import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, radii, space } from './theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** 'filter': white when selected (Discover). 'choice': amber outline + check (onboarding). */
  kind?: 'filter' | 'choice';
  grow?: boolean;
}

export const Chip = memo(function Chip({ label, selected, onPress, icon, kind = 'filter', grow }: ChipProps) {
  const choice = kind === 'choice';
  return (
    <Pressable
      onPress={onPress}
      haptic
      pressScale={0.95}
      accessibilityRole={choice ? 'checkbox' : 'button'}
      accessibilityState={{ checked: choice ? Boolean(selected) : undefined, selected: Boolean(selected) }}
      accessibilityLabel={label}
      style={[
        styles.base,
        choice ? styles.choice : null,
        selected ? (choice ? styles.choiceOn : styles.filterOn) : null,
        grow ? styles.grow : null,
      ]}
    >
      {icon ? <Icon name={icon} size={17} color={selected && !choice ? 'onPrimary' : 'textMuted'} /> : null}
      <Text
        variant="smallStrong"
        color={selected ? (choice ? 'text' : 'onPrimary') : 'textMuted'}
        numberOfLines={1}
        style={grow ? styles.growText : null}
      >
        {label}
      </Text>
      {choice && selected ? <Icon name="check-circle" size={17} color="brand" /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  choice: { minHeight: 52, borderRadius: radii.lg, backgroundColor: colors.surface1 },
  choiceOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  grow: { flexBasis: '47%', flexGrow: 1 },
  growText: { flex: 1 },
});
