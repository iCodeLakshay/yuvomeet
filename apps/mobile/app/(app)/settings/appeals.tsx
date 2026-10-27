import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useAppeals } from '../../../src/features/account/api';
import { formatAgo } from '../../../src/lib/format';
import { Badge, Button, Card, EmptyState, Header, Screen, space, Text } from '../../../src/ui';

const STATUS = {
  open: { label: 'In review', tone: 'warning' },
  upheld: { label: 'Decision changed', tone: 'success' },
  denied: { label: 'Decision kept', tone: 'neutral' },
} as const;

const SUBJECT = { verification: 'Verification', suspension: 'Suspension', ban: 'Ban', content: 'Removed content' } as const;

/** VR-6: appeal history with the moderator's response. */
export default function Appeals() {
  const appeals = useAppeals();
  return (
    <Screen
      header={<Header title="Appeals" />}
      footer={<Button label="New appeal" icon="gavel" variant="secondary" onPress={() => router.push('/appeal')} />}
      onRefresh={appeals.refetch}
      refreshing={appeals.isRefetching}
    >
      <View style={styles.list}>
        {(appeals.data ?? []).map((a) => (
          <Card key={a.id}>
            <View style={styles.head}>
              <Text variant="bodyStrong" style={styles.flex}>
                {SUBJECT[a.subject]}
              </Text>
              <Badge label={STATUS[a.status].label} tone={STATUS[a.status].tone} />
            </View>
            <Text variant="small" color="textMuted" numberOfLines={3}>
              {a.message}
            </Text>
            {a.response ? (
              <Text variant="small">
                <Text variant="smallStrong">Moderator: </Text>
                {a.response}
              </Text>
            ) : null}
            <Text variant="caption" color="textSubtle">
              Sent {formatAgo(a.created_at).toLowerCase()}
              {a.status === 'open' ? ' · a person answers within 48 hours' : ''}
            </Text>
          </Card>
        ))}
      </View>
      {appeals.data && !appeals.data.length ? (
        <EmptyState icon="gavel" title="No appeals" body="If a moderator or automated check got something wrong, ask a person to review it." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md, marginTop: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
});
