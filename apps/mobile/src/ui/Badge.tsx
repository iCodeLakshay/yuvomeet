import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, radii, space, type ColorToken } from './theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'glass' | 'light';

const tones: Record<Tone, { bg: string; border: string; text: ColorToken }> = {
  neutral: { bg: colors.surface3, border: colors.border, text: 'textMuted' },
  success: { bg: colors.successBg, border: colors.successBorder, text: 'success' },
  warning: { bg: colors.warningBg, border: 'rgba(245, 158, 11, 0.35)', text: 'warning' },
  danger: { bg: colors.dangerBg, border: colors.danger, text: 'danger' },
  accent: { bg: colors.accentSoft, border: 'rgba(234, 179, 8, 0.4)', text: 'accent' },
  glass: { bg: colors.scrim, border: colors.borderStrong, text: 'primary' },
  light: { bg: colors.primary, border: colors.primary, text: 'onPrimary' },
};

export interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: IconName;
  dot?: boolean;
}

/** Status pill: "Confirmed", "Host Reviewing", "3 spots left", "Women only". */
export const Badge = memo(function Badge({ label, tone = 'neutral', icon, dot }: BadgeProps) {
  const t = tones[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg, borderColor: t.border }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: colors[t.text] }]} /> : null}
      {icon ? <Icon name={icon} size={16} color={t.text} /> : null}
      <Text variant="caption" color={t.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
