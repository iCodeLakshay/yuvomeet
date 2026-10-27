import { router } from 'expo-router';
import { useState } from 'react';
import { OnboardingShell } from '../../src/features/onboarding/OnboardingShell';
import { ConsentToggles, type ConsentChoices } from '../../src/features/profile/ConsentToggles';
import { recordConsents } from '../../src/features/profile/api';
import { useMe } from '../../src/features/session/SessionProvider';
import { errorMessage } from '../../src/lib/errors';
import { Notice } from '../../src/ui';

/** Privacy C-1: purpose-specific consent after OTP, nothing pre-ticked. */
export default function Consent() {
  const me = useMe();
  const [choices, setChoices] = useState<ConsentChoices>({ camera: false, location: false, notifications: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await recordConsents(me.id, { ...choices, terms_privacy: true });
      router.replace('/city');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      back={false}
      title="Your privacy, your choice"
      subtitle="Choose what Yuvomeet may use. You can change these any time in Settings."
      cta="Save and continue"
      onCta={save}
      busy={busy}
      footerNote={<Notice text="By continuing you accept the Terms and Privacy Policy." icon="policy" />}
    >
      <ConsentToggles value={choices} onChange={(key, v) => setChoices((c) => ({ ...c, [key]: v }))} />
      {error ? <Notice tone="danger" text={error} /> : null}
    </OnboardingShell>
  );
}

