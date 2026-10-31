import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ProfileHero } from '../../../src/features/profile/ProfileHero';
import { usePublicProfile } from '../../../src/features/profile/api';
import { useCaps } from '../../../src/features/plans/api';
import { isVerified, useMe, useSession } from '../../../src/features/session/SessionProvider';
import { PAYWALL_ENABLED } from '../../../src/lib/flags';
import { formatDateLong } from '../../../src/lib/format';
import { Badge, Card, colors, confirm, Header, IconButton, ListRow, Notice, Screen, SectionHeader, space } from '../../../src/ui';

const VERIFICATION: Record<string, { title: string; subtitle: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  verified: { title: 'Verified 18+', subtitle: 'Age and selfie checked', tone: 'success' },
  pending: { title: 'Verification in progress', subtitle: 'Usually under a minute', tone: 'warning' },
  manual_review: { title: 'Under manual review', subtitle: 'A person checks this within 24 hours', tone: 'warning' },
  rejected: { title: 'Verification not passed', subtitle: 'Try again or appeal', tone: 'danger' },
  unverified: { title: 'Not verified yet', subtitle: 'Verify to join and host plans', tone: 'neutral' },
};

/** Own profile and settings hub. No Stitch frame: uses the member-profile header and list rows. */
export default function Account() {
  const me = useMe();
  const { signOut } = useSession();
  const profile = usePublicProfile(me.id);
  const caps = useCaps();
  const v = VERIFICATION[me.verification_status] ?? VERIFICATION.unverified!;
  const tier = caps.data?.entitlement ?? 'free';
  const until = caps.data?.entitlement_until ? formatDateLong(caps.data.entitlement_until) : null;

  const confirmSignOut = async () => {
    const ok = await confirm({
      title: 'Leaving already?',
      message: "You'll miss updates from your plans and chats until you're back. Everything stays safe here, and your people will be glad to see you again.",
      confirmLabel: 'Sign out',
      icon: 'logout',
      emphasizeCancel: true,
    });
    if (ok) void signOut();
  };

  return (
    <Screen
      dockInset
      onRefresh={profile.refetch}
      refreshing={profile.isRefetching}
      header={
        <Header
          large
          title="Account"
          right={<IconButton icon="edit" label="Edit profile" onPress={() => router.push('/settings/profile')} />}
        />
      }
    >
      {profile.data ? <ProfileHero profile={profile.data} own /> : null}
      {me.bio_status === 'held' ? <Notice tone="warning" text="Your new bio is waiting for a quick review before others can see it." /> : null}

      <Card onPress={() => router.push(isVerified(me) ? '/verify/result' : '/verify')} accessibilityLabel={v.title} style={styles.verify}>
        <ListRow
          icon={isVerified(me) ? 'verified-badge' : 'shield'}
          iconColor={isVerified(me) ? 'brand' : 'text'}
          title={v.title}
          subtitle={v.subtitle}
          trailing={isVerified(me) ? undefined : <Badge label="Open" tone={v.tone} />}
          chevron
        />
      </Card>

      {PAYWALL_ENABLED ? (
        <>
          <Card onPress={() => router.push({ pathname: '/premium', params: { source: 'account' } })} accessibilityLabel="Yuvomeet Premium" style={styles.premium}>
            <ListRow
              icon="workspace-premium"
              iconColor="accent"
              title={tier === 'free' ? 'Get Yuvomeet Premium' : tier === 'premium' ? 'Premium is active' : 'Plus is active'}
              subtitle={tier === 'free' ? 'Unlimited joins, priority requests' : until ? `Until ${until}` : 'Thanks for supporting Yuvomeet'}
              trailing={tier === 'free' ? <Badge label="Upgrade" tone="accent" /> : undefined}
              chevron
            />
          </Card>

          <SectionHeader title="Hosting" small />
          <ListRow icon="account-balance-wallet" title="Earnings" subtitle="Paid plans, payouts and UPI" onPress={() => router.push('/settings/earnings')} />
        </>
      ) : null}

      <SectionHeader title="Safety" small />
      <ListRow emphasis icon="contact-phone" title="Trusted contact" onPress={() => router.push('/safety/contact')} />
      <ListRow emphasis icon="block" title="Blocked members" onPress={() => router.push('/settings/blocked')} />
      <ListRow icon="gavel" title="Appeals" subtitle="Ask a person to review a decision" onPress={() => router.push('/settings/appeals')} />

      <SectionHeader title="Settings" small />
      <ListRow icon="lock-outline" title="Privacy and data" subtitle="Permissions, export your data" onPress={() => router.push('/settings/privacy')} />
      <ListRow icon="help-outline" title="Help" onPress={() => router.push('/help')} />
      <ListRow icon="logout" title="Sign out" chevron={false} onPress={confirmSignOut} />
      <ListRow icon="delete-forever" title="Delete account" destructive onPress={() => router.push('/delete-account')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  verify: { paddingVertical: space.xs, marginTop: space.xl, borderColor: colors.borderStrong },
  premium: { paddingVertical: space.xs, marginTop: space.md, borderColor: colors.accentSoft },
});
