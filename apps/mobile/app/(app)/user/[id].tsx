import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { ProfileHero } from '../../../src/features/profile/ProfileHero';
import { usePublicProfile } from '../../../src/features/profile/api';
import { useBlock } from '../../../src/features/safety/api';
import { useMe } from '../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../src/lib/errors';
import { Button, Card, EmptyState, Header, IconButton, ListRow, Screen, space } from '../../../src/ui';

/** Stitch "Public Member Profile" (S-18). Blocked or hidden members read as not found. */
export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const profile = usePublicProfile(id);
  const block = useBlock();
  const p = profile.data;
  const report = () => router.push({ pathname: '/report', params: { userId: id, context: 'profile', name: p?.first_name ?? '' } });
  const confirmBlock = () =>
    Alert.alert(`Block ${p?.first_name ?? 'this member'}?`, "You won't see each other's plans, profiles or messages. They are not told.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          block.mutate({ userId: id, context: 'profile' }, { onSuccess: () => router.back(), onError: (e) => Alert.alert('Could not block', errorMessage(e)) }),
      },
    ]);

  return (
    <Screen header={<Header right={p && id !== me.id ? <IconButton icon="outlined-flag" label="Report" onPress={report} /> : undefined} />}>
      {p ? (
        <>
          <ProfileHero profile={p} mine={me.interests} />
          {p.college_name ? (
            <Card style={styles.card}>
              <ListRow icon="school" title={p.college_name} subtitle={p.area_name ? `Lives around ${p.area_name}` : 'College on profile'} />
            </Card>
          ) : null}
          {id !== me.id ? (
            <View style={styles.actions}>
              <Button label="Report" icon="outlined-flag" variant="secondary" onPress={report} />
              <Button label="Block" icon="block" variant="ghost" loading={block.isPending} onPress={confirmBlock} />
              <Button label="Safety & trust info" icon="shield" variant="ghost" size="sm" onPress={() => router.push('/help')} />
            </View>
          ) : null}
        </>
      ) : profile.isLoading ? null : (
        <EmptyState icon="person-off" title="Profile not available" body="This member may have left, or you can't see each other." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.lg, paddingVertical: space.xs },
  actions: { gap: space.sm, marginTop: space.xl },
});
