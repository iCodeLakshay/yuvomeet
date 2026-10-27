import { MIN_PROFILE_PHOTOS } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { OnboardingShell } from '../../src/features/onboarding/OnboardingShell';
import { useMyPhotos } from '../../src/features/profile/api';
import { PhotoManager } from '../../src/features/profile/PhotoManager';
import { Notice } from '../../src/ui';

/** ON-3: at least 2 approved photos before the profile can be completed. */
export default function Photos() {
  const photos = useMyPhotos();
  const usable = (photos.data ?? []).filter((p) => p.status !== 'rejected').length;
  return (
    <OnboardingShell
      step={2}
      title="Add your photos"
      subtitle="Add 2 to 6 clear photos. A real face helps others recognise you and builds trust."
      cta="Continue"
      onCta={() => router.push('/interests')}
      ctaDisabled={usable < MIN_PROFILE_PHOTOS}
    >
      <PhotoManager />
      <Notice text="Photos are checked automatically before anyone sees them. No nudity, no group shots as your first photo." />
    </OnboardingShell>
  );
}
