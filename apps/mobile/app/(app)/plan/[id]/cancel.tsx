import { checkText } from '@yuvomeet/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCancelPlan, usePlan } from '../../../../src/features/plans/api';
import { errorMessage } from '../../../../src/lib/errors';
import { Button, confirm, Field, gutter, Notice, RadioRow, SheetHeader, space } from '../../../../src/ui';

const REASONS = ['Something came up', 'Not enough people', 'Venue issue', 'Feeling unwell'] as const;
const LATE_HOURS = 3;

/** Host cancellation (PL-4). Members are notified; cancelling late counts against the host. */
export default function CancelSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const plan = usePlan(id).data;
  const cancel = useCancelPlan(id);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [other, setOther] = useState('');
  const [error, setError] = useState<string | null>(null);
  const late = plan ? Date.parse(plan.starts_at!) - Date.now() < LATE_HOURS * 3_600_000 : false;

  const submit = async () => {
    const text = reason === 'Other' ? other.trim() : reason;
    const problem = checkText(text, 'Reason', 3, 200);
    setError(problem);
    if (problem) return;
    const ok = await confirm({
      title: 'Cancel this plan?',
      message: 'Everyone who joined is told right away. This cannot be undone.',
      confirmLabel: 'Cancel plan',
      cancelLabel: 'Keep it',
      icon: 'event-busy',
      danger: true,
    });
    if (!ok) return;
    cancel.mutate(text, { onSuccess: () => router.dismissTo({ pathname: '/plan/[id]', params: { id } }), onError: (e) => setError(errorMessage(e)) });
  };

  return (
    <ScrollView contentContainerStyle={[styles.root, { paddingBottom: insets.bottom + space.lg }]} keyboardShouldPersistTaps="handled">
      <SheetHeader title="Cancel plan" subtitle="Everyone going gets notified right away." />
      {[...REASONS, 'Other'].map((r) => (
        <RadioRow key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
      ))}
      {reason === 'Other' ? <Field label="Tell the group why" value={other} onChangeText={setOther} maxLength={200} counter /> : null}
      {late ? (
        <Notice tone="warning" text={`It's less than ${LATE_HOURS} hours to the start. Late cancellations lower your plans in the feed for 30 days.`} />
      ) : null}
      {error ? <Notice tone="danger" text={error} /> : null}
      <Button label="Cancel this plan" variant="danger" loading={cancel.isPending} onPress={submit} />
      <Button label="Keep the plan" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ root: { paddingHorizontal: gutter, gap: space.md } });
