import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, radii, space, type ColorToken } from './theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'sos';
type Size = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const tone: Record<Variant, { bg: string; border?: string; text: ColorToken }> = {
  primary: { bg: colors.primary, text: 'onPrimary' },
  secondary: { bg: colors.surface2, border: colors.borderStrong, text: 'text' },
  ghost: { bg: 'transparent', text: 'textMuted' },
  danger: { bg: colors.dangerBg, border: colors.danger, text: 'danger' },
  sos: { bg: colors.sos, text: 'primary' },
};

/** Pill button from Stitch: white primary, surface secondary, text-only ghost. */
export const Button = memo(function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  trailingIcon,
  loading,
  disabled,
  fill = true,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const t = tone[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      haptic={variant === 'primary' || variant === 'sos'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy: Boolean(loading), disabled: Boolean(disabled || loading) }}
      style={[
        styles.base,
        styles[size],
        { backgroundColor: t.bg, borderColor: t.border ?? 'transparent' },
        fill ? styles.fill : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[t.text]} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 20} color={t.text} /> : null}
          <Text variant={size === 'sm' ? 'smallStrong' : 'button'} color={t.text} numberOfLines={1}>
            {label}
          </Text>
          {trailingIcon ? <Icon name={trailingIcon} size={size === 'sm' ? 16 : 20} color={t.text} /> : null}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  fill: { alignSelf: 'stretch' },
  lg: { minHeight: 56 },
  md: { minHeight: 48 },
  sm: { minHeight: 36, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
