import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useLikeProfile,
  useProfileLike,
  useRespondFriendRequest,
  useSendFriendRequest,
  useUnlikeProfile,
  useFriendship,
} from '../../../src/features/friends/api';
import { ProfileHero } from '../../../src/features/profile/ProfileHero';
import { usePublicProfile } from '../../../src/features/profile/api';
import { useBlock } from '../../../src/features/safety/api';
import { useMe } from '../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../src/lib/errors';
import { Button, Card, confirm, EmptyState, Header, IconButton, ListRow, notify, Screen, Sheet, space } from '../../../src/ui';

/** Stitch "Public Member Profile" (S-18). Blocked or hidden members read as not found. */
export default function MemberProfile() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const profile = usePublicProfile(id);
  const friendship = useFriendship(id, me.id);
  const liked = useProfileLike(id, me.id);
  const request = useSendFriendRequest(id);
  const respond = useRespondFriendRequest(id);
  const like = useLikeProfile(id);
  const unlike = useUnlikeProfile(id);
  const block = useBlock();
  const [safety, setSafety] = useState(false);
  const p = profile.data;
  const row = friendship.data;
  const incoming = row?.status === 'pending' && row.addressee_id === me.id;
  const outgoing = row?.status === 'pending' && row.requester_id === me.id;
  const accepted = row?.status === 'accepted';
  const other = id !== me.id;

  const failed = (e: unknown) => notify('Could not update', errorMessage(e));
  const report = () => router.push({ pathname: '/report', params: { userId: id, context: 'profile', name: p?.first_name ?? '' } });
  const confirmBlock = async () => {
    const ok = await confirm({
      title: `Block ${p?.first_name ?? 'this member'}?`,
      message: "You won't see each other's plans, profiles or messages. They are not told.",
      confirmLabel: 'Block',
      icon: 'block',
      danger: true,
    });
    if (ok) block.mutate({ userId: id, context: 'profile' }, { onSuccess: () => router.back(), onError: (e) => notify('Could not block', errorMessage(e)) });
  };
  const openChat = () => {
    if (!row?.conversation_id) return;
    router.push({ pathname: '/chat/[id]', params: { id: row.conversation_id } });
  };
  const toggleLike = () => {
    const run = liked.data ? unlike : like;
    run.mutate(undefined, { onError: failed });
  };

  return (
    <>
      <Screen header={<Header right={p && other ? <IconButton icon="outlined-flag" label="Safety" onPress={() => setSafety(true)} /> : undefined} />}>
        {p ? (
          <>
            <ProfileHero profile={p} mine={me.interests} />
            {p.college_name ? (
              <Card style={styles.card}>
                <ListRow icon="school" title={p.college_name} subtitle={p.area_name ? `Lives around ${p.area_name}` : 'College on profile'} />
              </Card>
            ) : null}
            {other ? (
              <View style={styles.actions}>
                {incoming ? (
                  <View style={styles.row}>
                    <Button label="Accept" icon="how-to-reg" loading={respond.isPending} onPress={() => respond.mutate(true, { onError: failed })} style={styles.flex} />
                    <Button
                      label="Decline"
                      variant="secondary"
                      disabled={respond.isPending}
                      onPress={() => respond.mutate(false, { onError: failed })}
                      style={styles.flex}
                    />
                  </View>
                ) : accepted ? (
                  <Button label="Message" icon="chat" disabled={!row?.conversation_id} onPress={openChat} />
                ) : (
                  <Button
                    label={outgoing ? 'Requested' : 'Add friend'}
                    icon="person-add-alt"
                    disabled={outgoing}
                    loading={request.isPending}
                    onPress={() => request.mutate(undefined, { onError: failed })}
                  />
                )}
                <Button
                  label={liked.data ? 'Liked' : 'Like'}
                  icon="favorite-border"
                  variant="secondary"
                  loading={like.isPending || unlike.isPending}
                  onPress={toggleLike}
                />
              </View>
            ) : null}
          </>
        ) : profile.isLoading ? null : (
          <EmptyState icon="person-off" title="Profile not available" body="This member may have left, or you can't see each other." />
        )}
      </Screen>
      <Sheet visible={safety} onClose={() => setSafety(false)} title="Safety">
        <ListRow
          icon="outlined-flag"
          title="Report"
          subtitle="Tell us what happened"
          onPress={() => {
            setSafety(false);
            report();
          }}
        />
        <ListRow
          icon="block"
          destructive
          title="Block"
          subtitle="You won't see each other"
          onPress={() => {
            setSafety(false);
            void confirmBlock();
          }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.lg, paddingVertical: space.xs },
  actions: { gap: space.sm, marginTop: space.xl },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
