import { useBlocks, useUnblock } from '../../../src/features/safety/api';
import { formatAgo } from '../../../src/lib/format';
import { Avatar, Button, EmptyState, Header, ListRow, Screen } from '../../../src/ui';

/** S-17: people you blocked. Unblocking does not tell them anything. */
export default function Blocked() {
  const blocks = useBlocks();
  const unblock = useUnblock();

  return (
    <Screen header={<Header title="Blocked members" />} onRefresh={blocks.refetch} refreshing={blocks.isRefetching}>
      {(blocks.data ?? []).map((b) => (
        <ListRow
          key={b.blocked_id}
          leading={<Avatar name={b.first_name} size={40} />}
          title={b.first_name ?? 'Former member'}
          subtitle={`Blocked ${formatAgo(b.created_at!).toLowerCase()}`}
          trailing={
            <Button
              label="Unblock"
              variant="secondary"
              size="sm"
              fill={false}
              loading={unblock.isPending && unblock.variables === b.blocked_id}
              onPress={() => unblock.mutate(b.blocked_id!)}
            />
          }
        />
      ))}
      {blocks.data && !blocks.data.length ? (
        <EmptyState icon="block" title="No one blocked" body="Block someone from their profile, a plan or a chat message. They won't be told." />
      ) : null}
    </Screen>
  );
}
