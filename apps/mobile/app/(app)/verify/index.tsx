import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useMe } from '../../../src/features/session/SessionProvider';
import { useStartVerification } from '../../../src/features/verification/api';
import { errorMessage } from '../../../src/lib/errors';
import { Button, Header, Notice, Screen, StatusHero } from '../../../src/ui';

const BLOCKED: Record<string, string> = {
  busy: 'Verification is busy right now. Try again in a few hours.',
  denied: 'Finish your profile and add an approved photo first.',
};

/** VR-1 to VR-3: ID (DigiLocker or Aadhaar offline eKYC) then a live selfie, run by HyperVerge. */
export default function Verify() {
  const me = useMe();
  const start = useStartVerification();
  const [error, setError] = useState<string | null>(null);

  if (me.verification_status !== 'unverified' && me.verification_status !== 'rejected' && me.verification_status !== 'pending') {
    return <Redirect href="/verify/result" />;
  }

  const run = () => {
    setError(null);
    start.mutate(undefined, {
      onSuccess: (res) => (BLOCKED[res.status] ? setError(BLOCKED[res.status]!) : router.replace('/verify/result')),
      onError: (e) => setError(errorMessage(e)),
    });
  };

  return (
    <Screen
      header={<Header title="Verify your age" subtitle="About a minute" />}
      footer={
        <>
          <Button label="Start verification" trailingIcon="arrow-forward" loading={start.isPending} onPress={run} />
          <Button label="Not now" variant="ghost" size="sm" onPress={() => router.back()} />
        </>
      }
    >
      <StatusHero
        icon="verified-user"
        badge="lock"
        eyebrow="18+ community"
        title="Verify once"
        body="Every member is a verified adult. You need this to join or host plans; browsing stays open."
        points={[
          { icon: 'badge', text: 'Confirm your age with DigiLocker or Aadhaar offline eKYC' },
          { icon: 'face', text: 'Take a quick live selfie matched to your profile photo' },
          { icon: 'lock-outline', text: 'We keep only your age band and the result, never your ID number or ID photo' },
        ]}
      />
      {me.verification_status === 'rejected' ? <Notice tone="warning" text="Your last attempt didn't pass. Use good light and remove anything covering your face." /> : null}
      {error ? <Notice tone="danger" text={error} /> : null}
    </Screen>
  );
}
