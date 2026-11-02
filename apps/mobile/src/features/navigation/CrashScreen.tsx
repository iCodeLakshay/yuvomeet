import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { reportError } from '../../lib/telemetry';
import { Button, colors, gutter, Icon, space, Text } from '../../ui';

/**
 * Last-resort screen when a render throws. Exported as a route ErrorBoundary, so it renders
 * outside the layout's providers: only context-free UI here (no safe-area hooks, no queries).
 */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <View style={styles.root} accessibilityRole="alert">
      <Icon name="error-outline" size={48} color="textSubtle" />
      <Text variant="title2" align="center">
        Something broke on this screen
      </Text>
      <Text variant="body" color="textMuted" align="center">
        We have been told about it. Try again, and if it keeps happening, restart the app.
      </Text>
      <Button label="Try again" onPress={() => void retry()} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
  },
  button: { alignSelf: 'stretch', marginTop: space.lg },
});
