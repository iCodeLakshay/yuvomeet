import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { reportError } from '../../lib/telemetry';
import { Button, colors, gutter, space, StatusHero } from '../../ui';

/**
 * Crash recovery for expo-router's ErrorBoundary export. Renders without providers (the root
 * boundary sits outside them), reports the error to Sentry once, and lets the person retry.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <View style={styles.root}>
      <StatusHero
        icon="error-outline"
        title="Something went wrong"
        body="This screen hit an unexpected problem. We have been notified. Try again, and if it keeps happening, restart the app."
      />
      <Button label="Try again" icon="replay" onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: gutter, paddingVertical: space.xxxl, gap: space.xl, justifyContent: 'center' },
});
