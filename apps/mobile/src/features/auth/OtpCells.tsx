import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { colors, radii, space, Text } from '../../ui';

/** Six code cells; the next empty cell is highlighted. Shakes when `errorKey` changes. */
export const OtpCells = memo(function OtpCells({ code, length, errorKey, locked }: { code: string; length: number; errorKey: number; locked: boolean }) {
  const shake = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: errorKey
          ? withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-5, { duration: 50 }), withTiming(0, { duration: 50 }))
          : 0,
      },
    ],
  }), [errorKey]);
  return (
    <Animated.View style={[styles.row, shake]} accessibilityLabel={`${code.length} of ${length} digits entered`}>
      {Array.from({ length }, (_, i) => {
        const focused = !locked && i === code.length;
        return (
          <View key={i} style={[styles.cell, focused ? styles.focused : null, locked ? styles.locked : null]}>
            <Text variant="title2">{code[i] ?? (focused ? '|' : '')}</Text>
          </View>
        );
      })}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  cell: {
    flex: 1,
    height: 60,
    borderRadius: radii.md,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focused: { borderColor: colors.textMuted, backgroundColor: colors.surface3 },
  locked: { opacity: 0.5, borderColor: colors.danger },
});
