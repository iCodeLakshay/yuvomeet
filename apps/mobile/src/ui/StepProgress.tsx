import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, space } from './theme';

function Segment({ active }: { active: boolean }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, { duration: 260 }));
  }, [active, progress]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

/** Onboarding dashes (Stitch): amber up to the current step. */
export const StepProgress = memo(function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Segment key={i} active={i < step} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  track: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.surface3, overflow: 'hidden' },
  fill: { flex: 1, backgroundColor: colors.accent, transformOrigin: 'left' },
});
