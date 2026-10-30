import { router } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatAgo, formatPlanTime } from '../../lib/format';
import { openDirections } from '../../lib/links';
import { Avatar, Badge, Button, Card, colors, Icon, Pressable, radii, space, Text } from '../../ui';
import { useJoinRequests, useLeavePlan, type PlanCard } from './api';
import { spotsLeft } from './usePlanMeta';

const openPlan = (id: string) => router.push({ pathname: '/plan/[id]', params: { id, source: 'my_plans' } });
const openChat = (id: string) => router.push({ pathname: '/chat/[id]', params: { id } });

function Shell({ plan, badge, side, children }: { plan: PlanCard; badge?: ReactNode; side?: ReactNode; children?: ReactNode }) {
  return (
    <Card onPress={() => openPlan(plan.id!)} accessibilityLabel={`${plan.title}, ${formatPlanTime(plan.starts_at!)}`}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <View style={styles.meta}>
            <Text variant="smallStrong" color="textMuted">
              {formatPlanTime(plan.starts_at!)}
            </Text>
            {badge}
          </View>
          <Text variant="title3" numberOfLines={2}>
            {plan.title}
          </Text>
          <View style={styles.venue}>
            <Icon name="location-on" size={20} color="textSubtle" />
            <Text variant="body" color="textMuted" numberOfLines={1} style={styles.flex}>
              {plan.venue_name}, {plan.venue_area_name}
            </Text>
          </View>
        </View>
        {side}
      </View>
      {children}
    </Card>
  );
}

function HostSide({ plan }: { plan: PlanCard }) {
  return (
    <View style={styles.hostSide}>
      <Avatar path={plan.host_photo_path} name={plan.host_first_name} size={44} verified={Boolean(plan.host_verified)} />
      <Text variant="caption" color="textSubtle" numberOfLines={1}>
        {plan.host_first_name}
      </Text>
    </View>
  );
}

/** Stitch "My Plans" > Hosted by You: spots, pending requests, attendees and chat. */
export const HostedPlanCard = memo(function HostedPlanCard({ plan }: { plan: PlanCard }) {
  const requests = useJoinRequests(plan.id!);
  const waiting = (requests.data ?? []).filter((r) => r.status === 'requested');
  return (
    <Shell
      plan={plan}
      side={
        <View style={styles.spots}>
          <Text variant="smallStrong">
            {plan.approved_count ?? 0} / {plan.capacity}
          </Text>
          <Text variant="caption" color="textSubtle">
            spots
          </Text>
        </View>
      }
    >
      {waiting.length ? (
        <Pressable
          onPress={() => router.push({ pathname: '/plan/[id]/requests', params: { id: plan.id! } })}
          accessibilityLabel={`${waiting.length} requests pending. Review`}
          style={styles.requests}
        >
          <View style={styles.faces}>
            {waiting.slice(0, 2).map((r, i) => (
              <View key={r.user_id} style={i ? styles.overlap : null}>
                <Avatar path={r.photo_path} name={r.first_name} size={28} />
              </View>
            ))}
          </View>
          <Text variant="small" color="textMuted" style={styles.flex}>
            {waiting.length} {waiting.length === 1 ? 'request' : 'requests'} pending
          </Text>
          <Badge label="Review" tone="light" />
        </Pressable>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="Attendees"
          labelVariant="buttonCompact"
          icon="group"
          variant="secondary"
          size="md"
          fill={false}
          style={styles.flex}
          onPress={() => router.push({ pathname: '/plan/[id]/requests', params: { id: plan.id! } })}
        />
        <Button
          label="Group Chat"
          labelVariant="buttonCompact"
          icon="forum"
          size="md"
          fill={false}
          style={styles.flex}
          disabled={!plan.conversation_id}
          onPress={() => openChat(plan.conversation_id!)}
        />
      </View>
    </Shell>
  );
});

/** Confirmed joined plan: chat and directions. */
export const JoinedPlanCard = memo(function JoinedPlanCard({ plan }: { plan: PlanCard }) {
  return (
    <Shell plan={plan} badge={<Badge label="Confirmed" tone="success" dot />} side={<HostSide plan={plan} />}>
      <View style={[styles.actions, styles.divider]}>
        <Button
          label="Open Chat"
          labelVariant="buttonCompact"
          icon="chat-bubble-outline"
          variant="secondary"
          size="md"
          fill={false}
          style={styles.flex}
          disabled={!plan.conversation_id}
          onPress={() => openChat(plan.conversation_id!)}
        />
        <Button
          label="Directions"
          labelVariant="buttonCompact"
          icon="directions"
          variant="secondary"
          size="md"
          fill={false}
          style={styles.flex}
          onPress={() => openDirections(plan.venue_lat!, plan.venue_lng!, plan.venue_name!)}
        />
      </View>
    </Shell>
  );
});

/** Request waiting on the host (PL-3); withdrawing returns the weekly join slot. */
export const PendingPlanCard = memo(function PendingPlanCard({ plan, requestedAt }: { plan: PlanCard; requestedAt?: string }) {
  const leave = useLeavePlan(plan.id!);
  return (
    <Shell plan={plan} badge={<Badge label="Host reviewing" tone="warning" dot />} side={<HostSide plan={plan} />}>
      <View style={[styles.pendingRow, styles.divider]}>
        <Text variant="caption" color="textSubtle" style={styles.flex}>
          {requestedAt ? `Requested ${formatAgo(requestedAt).toLowerCase()}` : `${spotsLeft(plan)} spots left`}
        </Text>
        <Button label="Withdraw request" variant="ghost" size="sm" fill={false} loading={leave.isPending} onPress={() => leave.mutate()} />
      </View>
    </Shell>
  );
});

/** Recent history row with the post-plan rating prompt (SF-4). */
export const PastPlanRow = memo(function PastPlanRow({ plan, canRate }: { plan: PlanCard; canRate: boolean }) {
  const cancelled = plan.status === 'cancelled';
  return (
    <Card onPress={() => openPlan(plan.id!)} accessibilityLabel={plan.title ?? 'Past plan'} style={styles.past}>
      <View style={styles.pastRow}>
        <View style={styles.pastIcon}>
          <Icon name={cancelled ? 'event-busy' : 'event-available'} size={26} color="textMuted" />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {plan.title}
          </Text>
          <Text variant="caption" color="textSubtle">
            {cancelled ? 'Cancelled' : 'Completed'} • {formatPlanTime(plan.starts_at!)} • {plan.approved_count ?? 0} went
          </Text>
        </View>
        {canRate && !cancelled ? (
          <Button
            label="Rate"
            icon="rate-review"
            variant="secondary"
            size="sm"
            fill={false}
            onPress={() => router.push({ pathname: '/plan/[id]/rate', params: { id: plan.id! } })}
          />
        ) : null}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs, flexWrap: 'wrap' },
  venue: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: space.xs },
  hostSide: { alignItems: 'center', gap: space.xs, maxWidth: 64 },
  spots: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface3,
  },
  requests: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faces: { flexDirection: 'row' },
  overlap: { marginLeft: -10 },
  actions: { flexDirection: 'row', gap: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  past: { padding: space.md },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pastIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
