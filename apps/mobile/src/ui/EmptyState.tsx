import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, space } from './theme';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Ringed icon, title, line of copy, optional CTA (Stitch empty/system states). */
export const EmptyState = memo(function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.wrap}>
      <View style={styles.outer}>
        <View style={styles.inner}>
          <Icon name={icon} size={30} color="text" />
        </View>
      </View>
      <Text variant="title2" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="body" color="textMuted" align="center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} trailingIcon="arrow-forward" fill={false} size="md" style={styles.cta} />
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl, paddingHorizontal: space.lg },
  outer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  inner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: { marginTop: space.md },
});
