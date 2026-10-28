import { formatRupees } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useEarnings, usePayoutAccount, useSavePayoutAccount } from '../../../src/features/premium/api';
import { errorMessage } from '../../../src/lib/errors';
import { formatDateLong } from '../../../src/lib/format';
import { Badge, Button, Card, colors, EmptyState, Field, Header, ListRow, Notice, radii, Screen, SectionHeader, space, Text } from '../../../src/ui';

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' }) {
  return (
    <View style={styles.stat}>
      <Text variant="label" color="textSubtle">
        {label}
      </Text>
      <Text variant="title2" color={tone === 'success' ? 'success' : 'text'}>
        {formatRupees(value)}
      </Text>
    </View>
  );
}

/** Host earnings from paid plans: what members paid minus the platform fee, and UPI payouts. */
export default function Earnings() {
  const earnings = useEarnings();
  const account = usePayoutAccount();
  const save = useSavePayoutAccount();
  const [editing, setEditing] = useState(false);
  const [upi, setUpi] = useState('');
  const [holder, setHolder] = useState('');
  const e = earnings.data;
  const balance = e ? Math.max(0, e.earned_paise - e.paid_out_paise) : 0;
  const showForm = editing || (account.isSuccess && !account.data);

  const startEdit = () => {
    setUpi(account.data?.upi_id ?? '');
    setHolder(account.data?.holder_name ?? '');
    setEditing(true);
  };

  return (
    <Screen header={<Header title="Earnings" />} onRefresh={() => void earnings.refetch()} refreshing={earnings.isRefetching}>
      <Card>
        <Text variant="label" color="textSubtle">
          Ready for payout
        </Text>
        <Text variant="display">{formatRupees(balance)}</Text>
        <View style={styles.stats}>
          <Stat label="Upcoming plans" value={e?.upcoming_paise ?? 0} />
          <Stat label="Paid out" value={e?.paid_out_paise ?? 0} tone="success" />
        </View>
        <Text variant="caption" color="textSubtle">
          You keep {100 - (e?.fee_bps ?? 1000) / 100}% of every paid seat. Money from a plan is ready once it ends, and we pay out to your UPI ID every Monday.
        </Text>
      </Card>

      <SectionHeader title="Payout account" small />
      {showForm ? (
        <View style={styles.form}>
          <Field label="UPI ID" icon="account-balance" placeholder="name@okaxis" value={upi} onChangeText={setUpi} autoCapitalize="none" autoCorrect={false} />
          <Field label="Name on the account" icon="person-outline" placeholder="As shown in your UPI app" value={holder} onChangeText={setHolder} />
          {save.error ? <Notice tone="danger" text={errorMessage(save.error)} /> : null}
          <Button
            label="Save payout account"
            size="md"
            loading={save.isPending}
            disabled={!upi.includes('@') || holder.trim().length < 2}
            onPress={() => save.mutate({ upiId: upi, holderName: holder }, { onSuccess: () => setEditing(false) })}
          />
        </View>
      ) : account.data ? (
        <Card>
          <ListRow icon="account-balance" title={account.data.upi_id} subtitle={account.data.holder_name} trailing={<Button label="Change" variant="ghost" size="sm" fill={false} onPress={startEdit} />} />
        </Card>
      ) : null}

      <SectionHeader title="Paid plans" small />
      {e && e.plans.length ? (
        <View style={styles.list}>
          {e.plans.map((p) => (
            <Card key={p.plan_id} onPress={() => router.push({ pathname: '/plan/[id]', params: { id: p.plan_id } })} accessibilityLabel={p.title}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text variant="caption" color="textSubtle">
                    {formatDateLong(p.starts_at)} · {p.seats} paid {p.seats === 1 ? 'seat' : 'seats'} · {formatRupees(p.gross_paise)} collected
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text variant="bodyStrong" color="success">
                    {formatRupees(p.payout_paise)}
                  </Text>
                  <Badge label={p.plan_status === 'completed' ? 'Ready' : 'Upcoming'} tone={p.plan_status === 'completed' ? 'success' : 'neutral'} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : earnings.isSuccess ? (
        <EmptyState icon="payments" title="No paid plans yet" body="Turn on “Paid plan” when you create a plan to charge a fixed amount per person." actionLabel="Create a plan" onAction={() => router.push('/plan/new')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space.md, marginVertical: space.md },
  stat: { flex: 1, gap: 2, padding: space.md, borderRadius: radii.lg, backgroundColor: colors.surface2 },
  form: { gap: space.md },
  list: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  right: { alignItems: 'flex-end', gap: space.xs },
  flex: { flex: 1, gap: 2 },
});
