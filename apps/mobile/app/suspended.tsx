import { router } from 'expo-router';
import { useMe, useSession } from '../src/features/session/SessionProvider';
import { Button, Header, Screen, StatusHero } from '../src/ui';

/** Restricted accounts (suspended or banned) land here; appeals and help stay reachable. */
export default function Suspended() {
  const me = useMe();
  const { signOut } = useSession();
  const banned = me.status === 'banned';

  return (
    <Screen
      header={<Header leading="none" title="Account status" />}
      footer={
        <>
          <Button label="Appeal this decision" icon="gavel" onPress={() => router.push({ pathname: '/appeal', params: { subject: banned ? 'ban' : 'suspension' } })} />
          <Button label="Help & safety" variant="secondary" onPress={() => router.push('/help')} />
          <Button label="Sign out" variant="ghost" size="sm" onPress={() => void signOut()} />
        </>
      }
    >
      <StatusHero
        icon="block"
        badge="lock"
        badgeColor="danger"
        eyebrow={banned ? 'Account removed' : 'Account paused'}
        title={banned ? 'Account banned' : 'Account suspended'}
        body={me.status_reason ?? 'A moderator restricted this account after a safety review.'}
        points={[
          { icon: 'event-busy', text: 'You cannot join, host or chat while this is in place' },
          { icon: 'support-agent', text: 'A person reviews every appeal within 48 hours' },
        ]}
      />
    </Screen>
  );
}
