import { router, useLocalSearchParams } from 'expo-router';
import { memo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useDecideJoin, useJoinRequests, usePlan, useRoster } from '../../../../src/features/plans/api';
import { errorMessage } from '../../../../src/lib/errors';
import { formatAgo } from '../../../../src/lib/format';
import { Avatar, Badge, Button, Card, EmptyState, Header, ListRow, Screen, SectionHeader, space, Text } from '../../../../src/ui';

type Request = NonNullable<ReturnType<typeof useJoinRequests>['data']>[number];

const RequestCard = memo(function RequestCard({ request, planId }: { request: Request; planId: string }) {
  const decide = useDecideJoin(planId);
  const [choice, setChoice] = useState<boolean | null>(null);
  const run = (approve: boolean) => {
    setChoice(approve);
    decide.mutate({ userId: request.user_id!, approve }, { onError: (e) => Alert.alert('Could not update', errorMessage(e)) });
  };
  const showUp = request.show_up_rate == null ? 'New member' : `${request.show_up_rate}% show-up`;

  return (
    <Card>
      <ListRow
        leading={<Avatar path={request.photo_path} name={request.first_name} size={48} verified={Boolean(request.is_verified)} />}
        title={`${request.first_name ?? 'Member'}  ${request.age_band ?? ''}`}
        subtitle={`${showUp} · ${request.plans_attended ?? 0} plans attended`}
        onPress={() => router.push({ pathname: '/user/[id]', params: { id: request.user_id! } })}
      />
      <View style={styles.badges}>
        <Badge label={`Requested ${formatAgo(request.requested_at!).toLowerCase()}`} />
        {request.low_priority ? <Badge label="Recent no-shows" tone="warning" icon="info-outline" /> : null}
      </View>
      {request.note ? (
        <Text variant="body" color="textMuted">
          “{request.note}”
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label="Decline" variant="secondary" size="md" fill={false} style={styles.flex} loading={decide.isPending && choice === false} disabled={decide.isPending} onPress={() => run(false)} />
        <Button label="Approve" icon="check" size="md" fill={false} style={styles.flex} loading={decide.isPending && choice === true} disabled={decide.isPending} onPress={() => run(true)} />
      </View>
    </Card>
  );
});

/** Host review of join requests (PL-3) plus who is already going. */
export default function Requests() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id).data;
  const requests = useJoinRequests(id);
  const roster = useRoster(id);
  const waiting = (requests.data ?? []).filter((r) => r.status === 'requested');
  const left = Math.max(0, (plan?.capacity ?? 0) - (plan?.approved_count ?? 0));

  return (
    <Screen
      header={<Header title="Attendees" subtitle={plan?.title ?? undefined} />}
      onRefresh={() => void Promise.all([requests.refetch(), roster.refetch()])}
      refreshing={requests.isRefetching}
    >
      <SectionHeader title="Requests" icon="how-to-reg" meta={`${left} spots left`} />
      {waiting.length ? (
        <View style={styles.list}>
          {waiting.map((r) => (
            <RequestCard key={r.user_id} request={r} planId={id} />
          ))}
        </View>
      ) : (
        <EmptyState icon="inbox" title="No pending requests" body="New requests show up here and as a notification." />
      )}

      <SectionHeader title="Going" icon="group" meta={`${plan?.approved_count ?? 0}/${plan?.capacity ?? 0}`} />
      {(roster.data ?? []).map((m) => (
        <ListRow
          key={m.user_id}
          leading={<Avatar path={m.photo_path} name={m.first_name} size={40} verified={Boolean(m.is_verified)} />}
          title={m.first_name ?? 'Member'}
          subtitle={m.is_host ? 'Host' : m.checked_in ? 'Checked in' : 'Approved'}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: m.user_id! } })}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md, marginTop: space.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
