import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, space } from './theme';

/** Brand mark (three overlapping amber circles, matching the app icon) plus wordmark. */
export const Logo = memo(function Logo({ size = 22, wordmark = true }: { size?: number; wordmark?: boolean }) {
  const d = size * 0.58;
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="Yuvomeet">
      <View style={{ width: size, height: size }}>
        <View style={[styles.dot, { width: d, height: d, borderRadius: d / 2, left: (size - d) / 2, top: 0 }]} />
        <View style={[styles.dot, { width: d, height: d, borderRadius: d / 2, left: 0, bottom: 0 }]} />
        <View style={[styles.dot, { width: d, height: d, borderRadius: d / 2, right: 0, bottom: 0 }]} />
      </View>
      {wordmark ? (
        <Text variant="title2" style={{ fontSize: size, lineHeight: size * 1.25 }}>
          yuvomeet
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { position: 'absolute', backgroundColor: colors.accent, opacity: 0.9 },
});
