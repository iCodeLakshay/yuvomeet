import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMe } from '../../../src/features/session/SessionProvider';
import { useMyVerification } from '../../../src/features/verification/api';
import { qk, queryClient } from '../../../src/lib/query';
import { Button, Header, Screen, StatusHero, type StatusHeroProps } from '../../../src/ui';

const goHome = () => router.navigate('/');
const appeal = () => router.push({ pathname: '/appeal', params: { subject: 'verification' } });

/** VR-4, VR-6: outcome of the provider check, written only by kyc-webhook (S-38). */
export default function VerifyResult() {
  const me = useMe();
  const status = me.verification_status;
  const checks = useMyVerification();
  // The verdict lands via webhook; poll the profile while it is still pending.
  useQuery({
    queryKey: ['verify-poll'],
    enabled: status === 'pending',
    refetchInterval: 4_000,
    queryFn: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.me });
      return Date.now();
    },
  });
  const attempts = checks.data?.filter((c) => c.type === 'liveness_face').length ?? 0;

  let hero: StatusHeroProps;
  let actions: React.ReactNode;
  switch (status) {
    case 'verified':
      hero = { icon: 'verified-user', badge: 'check', badgeColor: 'success', eyebrow: 'Verified', title: "You're verified", body: 'You can now join and host plans. Your profile shows the verified badge.' };
      actions = <Button label="Find a plan" trailingIcon="arrow-forward" onPress={goHome} />;
      break;
    case 'pending':
      hero = { icon: 'hourglass-top', badge: 'schedule', eyebrow: 'Checking', title: 'Almost there', body: 'Your result usually arrives within a minute. You can keep browsing; we will notify you.' };
      actions = <Button label="Keep browsing" variant="secondary" onPress={goHome} />;
      break;
    case 'manual_review':
      hero = {
        icon: 'manage-search',
        badge: 'schedule',
        eyebrow: 'Manual review',
        title: 'A person is checking',
        body: 'Automated checks were not sure, so a moderator will decide within 24 hours. Nothing else is needed from you.',
      };
      actions = <Button label="Return Home" trailingIcon="arrow-forward" onPress={goHome} />;
      break;
    case 'blocked_minor':
      hero = {
        icon: 'shield',
        badge: 'lock',
        eyebrow: 'Eligibility notice',
        title: '18+ Only',
        body: 'Yuvomeet is exclusively for verified members 18 and older.',
        points: [
          { icon: 'badge', text: 'Government ID age check required' },
          { icon: 'support-agent', text: 'Support available if you think this is wrong' },
        ],
      };
      actions = (
        <>
          <Button label="Return Home" trailingIcon="arrow-forward" onPress={goHome} />
          <Button label="Ask for a review" variant="ghost" size="sm" onPress={appeal} />
        </>
      );
      break;
    default:
      hero = {
        icon: 'gpp-maybe',
        badge: 'close',
        badgeColor: 'danger',
        eyebrow: 'Not verified',
        title: "That didn't pass",
        body: 'Usually this is light, glare or a face covering. Try again, or ask a person to review it.',
        points: attempts ? [{ icon: 'replay', text: `${attempts} attempt${attempts > 1 ? 's' : ''} used` }] : undefined,
      };
      actions = (
        <>
          <Button label="Try again" icon="replay" onPress={() => router.replace('/verify')} />
          <Button label="Ask for a review" variant="ghost" size="sm" onPress={appeal} />
        </>
      );
  }

  return (
    <Screen header={<Header title="Age Eligibility & Safety" subtitle="Verification notice" leading="close" onLeading={goHome} />} footer={actions}>
      <StatusHero {...hero} />
    </Screen>
  );
}
