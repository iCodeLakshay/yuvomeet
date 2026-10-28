import { router, useLocalSearchParams } from 'expo-router';
import { useConversation } from '../../../../src/features/chat/api';
import { useRoster } from '../../../../src/features/plans/api';
import { useMe } from '../../../../src/features/session/SessionProvider';
import { formatPlanTime } from '../../../../src/lib/format';
import { Avatar, Badge, Header, ListRow, Screen, SectionHeader } from '../../../../src/ui';

/** Group info (chat header "i"): the plan, who is in the group, and a way to get help. */
export default function ChatMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const convo = useConversation(id).data;
  const roster = useRoster(convo?.plan_id ?? '');

  return (
    <Screen header={<Header title="Group info" />}>
      {convo ? (
        <ListRow
          icon="event"
          title={convo.title ?? 'Plan'}
          subtitle={`${formatPlanTime(convo.starts_at!)} · ${convo.venue_name}`}
          onPress={() => router.push({ pathname: '/plan/[id]', params: { id: convo.plan_id! } })}
        />
      ) : null}
      <SectionHeader title={`Members (${roster.data?.length ?? 0})`} small />
      {(roster.data ?? []).map((m) => (
        <ListRow
          key={m.user_id}
          leading={<Avatar path={m.photo_path} name={m.first_name} size={40} verified={Boolean(m.is_verified)} />}
          title={m.user_id === me.id ? `${m.first_name} (you)` : (m.first_name ?? 'Member')}
          trailing={m.is_host ? <Badge label="Host" tone="light" /> : undefined}
          onPress={m.user_id === me.id ? undefined : () => router.push({ pathname: '/user/[id]', params: { id: m.user_id! } })}
        />
      ))}
      <SectionHeader title="Help" small />
      <ListRow
        icon="sos"
        iconColor="danger"
        title="Get help"
        onPress={() => convo?.plan_id && router.push({ pathname: '/safety/sos', params: { planId: convo.plan_id } })}
      />
    </Screen>
  );
}
