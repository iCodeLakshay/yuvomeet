import { MIN_INTERESTS } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { OnboardingShell } from '../../src/features/onboarding/OnboardingShell';
import { useSaveProfile } from '../../src/features/profile/api';
import { InterestPicker } from '../../src/features/profile/pickers';
import { useMe } from '../../src/features/session/SessionProvider';
import { errorMessage } from '../../src/lib/errors';
import { Notice } from '../../src/ui';

/** Stitch "Onboarding: Interests": two-column choice chips with amber check. */
export default function Interests() {
  const me = useMe();
  const save = useSaveProfile();
  const [picked, setPicked] = useState<string[]>();
  const [error, setError] = useState<string | null>(null);
  const selected = picked ?? me.interests;

  const submit = async () => {
    try {
      await save.mutateAsync({ interests: selected });
      router.push('/rules');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <OnboardingShell
      step={3}
      title="What are you interested in?"
      subtitle="Choose a few interests to get better plan suggestions."
      cta="Continue"
      onCta={submit}
      busy={save.isPending}
      ctaDisabled={selected.length < MIN_INTERESTS}
    >
      <InterestPicker value={selected} onChange={setPicked} />
      {error ? <Notice tone="danger" text={error} /> : null}
    </OnboardingShell>
  );
}

