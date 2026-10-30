import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, radii, space } from './theme';
import { toast } from './Toast';

type Tone = 'info' | 'success' | 'warning' | 'danger';

export interface NoticeProps {
  text: string;
  title?: string;
  tone?: Tone;
  icon?: IconName;
}

const send = { success: toast.success, warning: toast.warning, danger: toast.error } as const;

/**
 * Messages about what just happened or what is wrong (errors, warnings, confirmations) are shown
 * as a toast at the top of the screen, never inline. The component stays so screens keep their
 * conditions; it renders nothing and raises the toast when its text appears or changes.
 *
 * Only the `info` tone stays on the page: static explanations such as privacy and policy copy
 * that people need to be able to reread.
 */
export const Notice = memo(function Notice({ text, title, tone = 'info', icon }: NoticeProps) {
  useEffect(() => {
    if (tone !== 'info') send[tone](text, title);
  }, [tone, text, title]);

  if (tone !== 'info') return null;
  return (
    <View style={styles.box}>
      <Icon name={icon ?? 'shield'} size={20} color="textMuted" />
      <View style={styles.flex}>
        {title ? <Text variant="smallStrong">{title}</Text> : null}
        <Text variant="small" color="textMuted">
          {text}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface1,
    borderColor: colors.border,
  },
  flex: { flex: 1, gap: 2 },
});
