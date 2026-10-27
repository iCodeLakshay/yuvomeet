import { router } from 'expo-router';
import { HeroShell } from '../../src/features/auth/HeroShell';
import { Button, Text } from '../../src/ui';

/** Stitch "Onboarding: Age Verification". The real check is ID-based later (VR-1). */
export default function AgeNotice() {
  return (
    <HeroShell>
      <Text variant="display">You must be{'\n'}18 or older</Text>
      <Text variant="body" color="textMuted">
        Yuvomeet is for verified adults only. We confirm your age with DigiLocker before your first plan.
      </Text>
      <Button label="I'm 18 or older" onPress={() => router.push('/phone')} />
    </HeroShell>
  );
}
