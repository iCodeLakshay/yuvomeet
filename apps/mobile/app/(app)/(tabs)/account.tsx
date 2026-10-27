import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ProfileHero } from '../../../src/features/profile/ProfileHero';
import { usePublicProfile } from '../../../src/features/profile/api';
import { useCaps } from '../../../src/features/plans/api';
import { isVerified, useMe, useSession } from '../../../src/features/session/SessionProvider';
import { Badge, Card, colors, Header, IconButton, ListRow, Notice, Screen, SectionHeader, space, Text } from '../../../src/ui';

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
      {profile.data ? <ProfileHero profile={profile.data} /> : null}
      {me.bio_status === 'held' ? <Notice tone="warning" text="Your new bio is waiting for a quick review before others can see it." /> : null}

      <Card onPress={() => router.push(isVerified(me) ? '/verify/result' : '/verify')} accessibilityLabel={v.title} style={styles.verify}>
        <ListRow
          icon={isVerified(me) ? 'verified-user' : 'shield'}
          iconColor={isVerified(me) ? 'success' : 'text'}
          title={v.title}
          subtitle={v.subtitle}
          trailing={<Badge label={isVerified(me) ? 'Done' : 'Open'} tone={v.tone} />}
          chevron
        />
      </Card>

      {caps.data ? (
        <Card style={styles.caps}>
          <Text variant="label" color="textSubtle">
            This week
          </Text>
          <View style={styles.capRow}>
            <Text variant="body" style={styles.flex}>
              Plans joined
            </Text>
            <Text variant="bodyStrong">
              {caps.data.joins_used} / {caps.data.joins_limit}
            </Text>
          </View>
          <View style={styles.capRow}>
            <Text variant="body" style={styles.flex}>
              Plans hosted
            </Text>
            <Text variant="bodyStrong">
              {caps.data.hosts_used} / {caps.data.hosts_limit}
            </Text>
          </View>
          <Text variant="caption" color="textSubtle">
            Resets Monday 00:00 IST. Reports, blocking and SOS are never limited.
          </Text>
        </Card>
      ) : null}

      <SectionHeader title="Safety" small />
      <ListRow icon="contact-phone" title="Trusted contact" subtitle="Share plans and SOS over WhatsApp" onPress={() => router.push('/safety/contact')} />
      <ListRow icon="block" title="Blocked members" onPress={() => router.push('/settings/blocked')} />
      <ListRow icon="gavel" title="Appeals" subtitle="Ask a person to review a decision" onPress={() => router.push('/settings/appeals')} />

      <SectionHeader title="Settings" small />
      <ListRow icon="person-outline" title="Edit profile" onPress={() => router.push('/settings/profile')} />
      <ListRow icon="lock-outline" title="Privacy and data" subtitle="Permissions, export your data" onPress={() => router.push('/settings/privacy')} />
      <ListRow icon="help-outline" title="Help and community rules" onPress={() => router.push('/help')} />
      <ListRow icon="logout" title="Sign out" chevron={false} onPress={() => void signOut()} />
      <ListRow icon="delete-forever" title="Delete account" destructive onPress={() => router.push('/delete-account')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  verify: { paddingVertical: space.xs, marginTop: space.xl, borderColor: colors.borderStrong },
  caps: { marginTop: space.md, gap: space.sm },
  capRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
