import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsOnline } from '../../lib/network';
import { colors, Icon, radii, space, Text } from '../../ui';

/**
 * App-wide connection notice. Loaded data stays visible (the cache persists offline); this
 * only tells the person why nothing new arrives and that it resumes on its own.
 */
export function OfflineBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + space.sm }]}>
      <Animated.View
        entering={FadeInUp.duration(200)}
        exiting={FadeOutUp.duration(200)}
        style={styles.pill}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Icon name="wifi-off" size={16} color="warning" />
        <Text variant="smallStrong" color="warning">
          You&apos;re offline. Showing saved data.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
});
