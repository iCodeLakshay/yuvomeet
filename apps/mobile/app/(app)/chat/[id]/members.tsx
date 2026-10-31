import { router, useLocalSearchParams } from 'expo-router';
import { useConversation, usePairMembers } from '../../../../src/features/chat/api';
import { useLeavePlan, useRoster } from '../../../../src/features/plans/api';
import { useMe } from '../../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../../src/lib/errors';
import { formatPlanTime } from '../../../../src/lib/format';
import { queryClient } from '../../../../src/lib/query';
import { Avatar, Badge, confirm, Header, ListRow, notify, Screen, SectionHeader } from '../../../../src/ui';

/** Group info (chat header "i"): the plan, who is in the group, and a way to get help. */
export default function ChatMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const convo = useConversation(id).data;
  const isPair = convo?.kind === 'pair';
  const planId = isPair ? '' : (convo?.plan_id ?? '');
  const roster = useRoster(planId);
  const pair = usePairMembers(id, Boolean(isPair));
  const members = isPair
    ? (pair.data ?? []).map((m) => ({
        user_id: m.user_id,
        first_name: m.first_name,
        photo_path: m.photo_path,
        is_host: m.is_host,
        is_verified: m.is_verified,
      }))
    : (roster.data ?? []).map((m) => ({
        user_id: m.user_id,
        first_name: m.first_name,
        photo_path: m.photo_path,
        is_host: m.is_host,
        is_verified: m.is_verified,
      }));
  const leave = useLeavePlan(planId);
  const iAmHost = members.some((m) => m.user_id === me.id && m.is_host);
  const showLeave = Boolean(convo?.plan_id) && !isPair && !iAmHost;

  const onLeave = async () => {
    if (!convo?.plan_id || leave.isPending) return;
    const ok = await confirm({
      title: 'Leave this group?',
      message: "You'll leave the plan and this chat.",
      confirmLabel: 'Leave group',
      icon: 'logout',
      danger: true,
    });
    if (!ok) return;
    leave.mutate(undefined, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['chats'] });
        router.replace('/');
      },
      onError: (e) => notify('Could not leave', errorMessage(e)),
    });
  };

  return (
    <Screen header={<Header title={isPair ? 'Chat info' : 'Group info'} />}>
      {convo?.plan_id && !isPair ? (
        <ListRow
          icon="event"
          title={convo.title ?? 'Plan'}
          subtitle={convo.starts_at ? `${formatPlanTime(convo.starts_at)} · ${convo.venue_name ?? ''}` : (convo.venue_name ?? undefined)}
          onPress={() => router.push({ pathname: '/plan/[id]', params: { id: convo.plan_id! } })}
        />
      ) : null}
      <SectionHeader title={`Members (${members.length})`} small />
      {members.map((m) => (
        <ListRow
          key={m.user_id ?? m.first_name ?? 'member'}
          leading={<Avatar path={m.photo_path} name={m.first_name} size={40} verified={Boolean(m.is_verified)} />}
          title={m.user_id === me.id ? `${m.first_name ?? 'Member'} (you)` : (m.first_name ?? 'Member')}
          trailing={m.is_host ? <Badge label="Host" tone="light" /> : undefined}
          onPress={m.user_id && m.user_id !== me.id ? () => router.push({ pathname: '/user/[id]', params: { id: m.user_id! } }) : undefined}
        />
      ))}
      {convo?.plan_id && !isPair ? (
        <>
          <SectionHeader title="Help" small />
          <ListRow icon="sos" iconColor="danger" title="Get help" onPress={() => router.push({ pathname: '/safety/sos', params: { planId: convo.plan_id! } })} />
        </>
      ) : null}
      {showLeave ? <ListRow icon="logout" destructive title="Leave group" subtitle="You leave the plan and this chat." onPress={() => void onLeave()} /> : null}
    </Screen>
  );
}
