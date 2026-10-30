import { checkText, MAX_JOIN_NOTE_CHARS, formatRupees } from '@yuvomeet/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isPaid, useCaps, usePlan, useRequestJoin } from '../../../../src/features/plans/api';
import { spotsLeft, useActivityMeta } from '../../../../src/features/plans/usePlanMeta';
import { errorMessage } from '../../../../src/lib/errors';
import { PAYWALL_ENABLED } from '../../../../src/lib/flags';
import { formatPlanTime } from '../../../../src/lib/format';
import { Avatar, Button, colors, EmptyState, Field, gutter, Icon, Notice, radii, SheetHeader, space, Text } from '../../../../src/ui';

/** Stitch "Join Plan States" sheet (PL-3): optional note, instant join or host approval. */
export default function JoinSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const plan = usePlan(id).data;
  const caps = useCaps().data;
  const join = useRequestJoin(id);
  const activity = useActivityMeta()(plan?.activity);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (join.data) {
    const approved = join.data === 'approved';
    return (
      <View style={[styles.root, { paddingBottom: insets.bottom + space.lg }]}>
        <EmptyState
          icon={approved ? 'celebration' : 'hourglass-top'}
          title={approved ? "You're in!" : 'Request sent'}
          body={
            approved
              ? 'The group chat is open. Say hi, and share the plan with a trusted contact.'
              : `${plan?.host_first_name ?? 'The host'} will review it. We'll notify you either way.`
          }
        />
        <Button label={approved ? 'View plan' : 'Done'} onPress={() => router.back()} />
      </View>
    );
  }

  if (!plan) return null;
  const left = spotsLeft(plan);
  const paid = isPaid(caps);
  const outOfJoins = caps ? !paid && caps.joins_used >= caps.joins_limit : false;
  const upgrade = () => router.push({ pathname: '/premium', params: { source: 'join_cap' } });

  const submit = () => {
    const noteError = note.trim() ? checkText(note, 'Note', 0, MAX_JOIN_NOTE_CHARS) : null;
    setError(noteError);
    if (noteError) return;
    join.mutate(note.trim(), {
      onError: (e) => {
        setError(errorMessage(e));
        if (PAYWALL_ENABLED && (e as { code?: string }).code === 'CAP_REACHED') upgrade();
      },
    });
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.root, { paddingBottom: insets.bottom + space.lg }]} keyboardShouldPersistTaps="handled">
      <SheetHeader title={plan.requires_approval ? 'Join Meetup' : 'Join instantly'} />
      <View style={styles.planRow}>
        <View style={styles.flex}>
          <View style={styles.meta}>
            <View style={styles.dot} />
            <Text variant="caption" color="textMuted">
              {activity.label} · {plan.venue_name}
            </Text>
          </View>
          <Text variant="title3">{plan.title}</Text>
          <Text variant="caption" color="textMuted">
            {formatPlanTime(plan.starts_at!)} · Hosted by <Text variant="caption">{plan.host_first_name}</Text>
          </Text>
        </View>
        <Avatar path={plan.host_photo_path} name={plan.host_first_name} size={48} verified={Boolean(plan.host_verified)} />
      </View>

      <View style={styles.strip}>
        <Icon name="group" size={20} color="textMuted" />
        <Text variant="body" color="textMuted" style={styles.flex}>
          {left} {left === 1 ? 'spot' : 'spots'} remaining
        </Text>
        <Text variant="bodyStrong">{plan.price_paise ? `${formatRupees(plan.price_paise)} / person` : 'Free entry'}</Text>
        <Text variant="caption" color="textSubtle">
          {plan.price_paise ? '(pay after approval)' : '(pay for your own order)'}
        </Text>
      </View>

      <Field
        label="Note to host (optional)"
        placeholder="Share a quick intro or questions..."
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={MAX_JOIN_NOTE_CHARS}
        counter
        error={error}
      />

      {caps && !paid ? (
        <Notice
          tone={outOfJoins ? 'warning' : 'info'}
          icon="confirmation-number"
          text={
            outOfJoins
              ? `You've used your ${caps.joins_limit} joins this week. They reset Monday 00:00 IST.`
              : `This uses 1 of your ${caps.joins_limit} weekly joins (${caps.joins_limit - caps.joins_used} left). Withdrawing a pending request gives it back.`
          }
        />
      ) : null}
      {outOfJoins ? (
        <Button label="Get unlimited joins" icon="workspace-premium" onPress={upgrade} />
      ) : (
        <Button
          label={plan.requires_approval ? 'Request to Join' : 'Join now'}
          trailingIcon="arrow-forward"
          loading={join.isPending}
          disabled={left === 0}
          onPress={submit}
        />
      )}
      {PAYWALL_ENABLED && caps && caps.entitlement !== 'premium' && plan.requires_approval && !outOfJoins ? (
        <Button label="Get picked first with Premium" icon="bolt" variant="ghost" size="sm" onPress={() => router.push({ pathname: '/premium', params: { source: 'priority' } })} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { paddingHorizontal: gutter, gap: space.lg },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
