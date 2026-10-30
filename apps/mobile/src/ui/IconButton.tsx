import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { colors, touch, type ColorToken } from './theme';

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: 'surface' | 'glass' | 'plain' | 'primary';
  color?: ColorToken;
  badge?: boolean;
  size?: number;
}

/** 44 px circular icon button used in headers (back, close, filters, bell). */
export const IconButton = memo(function IconButton({
  icon,
  label,
  onPress,
  variant = 'surface',
  color,
  badge,
  size = touch,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      pressScale={0.92}
      style={[styles.base, { width: size, height: size, borderRadius: size / 2 }, styles[variant]]}
    >
      <Icon name={icon} size={Math.max(16, Math.round(size * 0.55) - 5)} color={color ?? (variant === 'primary' ? 'onPrimary' : 'text')} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  surface: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  glass: { backgroundColor: colors.scrim, borderWidth: 1, borderColor: colors.borderStrong },
  plain: { backgroundColor: 'transparent' },
  primary: { backgroundColor: colors.primary },
  badge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.surface2,
  },
});
