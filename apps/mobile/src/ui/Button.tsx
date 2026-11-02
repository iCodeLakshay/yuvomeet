import { memo, useRef, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, radii, space, type ColorToken, type TypeVariant } from './theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'sos';
type Size = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  label: string;
  /** May return a promise; the button ignores further presses until it settles. */
  onPress?: () => void | Promise<unknown>;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Custom leading glyph (brand marks such as the Google "G"); replaces `icon`. */
  leading?: ReactNode;
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fill?: boolean;
  /** Label style override; cards use 'buttonCompact' so actions stay below titles and details. */
  labelVariant?: TypeVariant;
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
  leading,
  trailingIcon,
  loading,
  disabled,
  fill = true,
  labelVariant,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const t = tone[variant];
  const glyph = size === 'sm' ? 15 : 17;
  // `loading` only disables the button after a re-render, so a fast double tap can land twice.
  // Lock synchronously; when onPress returns a promise, stay locked until it settles.
  const pending = useRef(false);
  const handlePress = () => {
    if (pending.current || !onPress) return;
    const result = onPress();
    if (result && typeof (result as Promise<unknown>).finally === 'function') {
      pending.current = true;
      void (result as Promise<unknown>).catch(() => undefined).finally(() => {
        pending.current = false;
      });
    } else {
      // Synchronous handlers that kick off a mutation: ignore repeats within the same tap burst.
      pending.current = true;
      setTimeout(() => {
        pending.current = false;
      }, 400);
    }
  };
  return (
    <Pressable
      onPress={handlePress}
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
          {leading ?? (icon ? <Icon name={icon} size={glyph} color={t.text} /> : null)}
          <Text variant={labelVariant ?? (size === 'sm' ? 'smallStrong' : 'button')} color={t.text} numberOfLines={1}>
            {label}
          </Text>
          {trailingIcon ? <Icon name={trailingIcon} size={glyph} color={t.text} /> : null}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
});
