import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, gutter, Notice, SheetHeader, space, Text } from '../../src/ui';

/** ON-5: browsing is open; joining, hosting and chat need the one-time 18+ check. */
export default function VerifyGate() {
  return (
    <View style={styles.body}>
      <SheetHeader title="Verify to join plans" />
      <Text variant="body" color="textMuted">
        You can browse freely. Joining a plan, hosting or chatting needs a one-time 18+ check with DigiLocker and a quick selfie.
      </Text>
      <Notice text="We keep only your 18+ status, birth year and gender result. Never your Aadhaar number or ID photo." icon="lock-outline" />
      <Button label="Verify in about a minute" trailingIcon="arrow-forward" onPress={() => router.replace('/verify')} />
      <Button label="Keep browsing" variant="ghost" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({ body: { paddingHorizontal: gutter, gap: space.lg, paddingBottom: space.xxl } });
