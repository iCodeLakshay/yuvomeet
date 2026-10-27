import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, radii, space, type ColorToken } from './theme';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, { icon: IconName; color: ColorToken; bg: string; border: string }> = {
  info: { icon: 'shield', color: 'textMuted', bg: colors.surface1, border: colors.border },
  success: { icon: 'verified-user', color: 'success', bg: colors.successBg, border: colors.successBorder },
  warning: { icon: 'info-outline', color: 'warning', bg: colors.warningBg, border: 'rgba(245, 158, 11, 0.35)' },
  danger: { icon: 'error-outline', color: 'danger', bg: colors.dangerBg, border: colors.danger },
};

export interface NoticeProps {
  text: string;
  title?: string;
  tone?: Tone;
  icon?: IconName;
}

/** Inline banner: safety notices, errors, confirmations. */
export const Notice = memo(function Notice({ text, title, tone = 'info', icon }: NoticeProps) {
  const t = tones[tone];
  return (
    <View
      style={[styles.box, { backgroundColor: t.bg, borderColor: t.border }]}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'danger' ? 'polite' : 'none'}
    >
      <Icon name={icon ?? t.icon} size={18} color={t.color} />
      <View style={styles.flex}>
        {title ? <Text variant="smallStrong">{title}</Text> : null}
        <Text variant="small" color={tone === 'info' ? 'textMuted' : t.color}>
          {text}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radii.lg, borderWidth: 1 },
  flex: { flex: 1, gap: 2 },
});
