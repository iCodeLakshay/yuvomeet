import { Redirect } from 'expo-router';
import { useOnboardingStep } from '../../src/features/onboarding/useOnboardingStep';

export default function OnboardingEntry() {
  const step = useOnboardingStep();
  return step ? <Redirect href={step} /> : null;
}
