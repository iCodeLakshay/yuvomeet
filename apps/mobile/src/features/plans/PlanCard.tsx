import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatPlanTime } from '../../lib/format';
import { Avatar, AvatarStack, Badge, Button, colors, Icon, Pressable, radii, space, Text } from '../../ui';
import type { PlanCard as Plan } from './api';
import { PlanCover } from './PlanCover';
import { spotsLeft, useActivityMeta } from './usePlanMeta';

export interface PlanCardProps {
  plan: Plan;
  onOpen: (planId: string) => void;
  onJoin: (planId: string) => void;
  onHost: (hostId: string) => void;
}

function joinLabel(plan: Plan, left: number) {
  if (plan.my_status === 'approved' || plan.my_status === 'attended') return 'Joined';
  if (plan.my_status === 'requested') return 'Requested';
  return left === 0 ? 'Full' : 'Join';
}

/** Discover feed card (Stitch "Discover Home"). Memoised; callbacks take ids (list-performance). */
export const PlanCard = memo(function PlanCard({ plan, onOpen, onJoin, onHost }: PlanCardProps) {
  const activity = useActivityMeta()(plan.activity);
  const left = spotsLeft(plan);
  const label = joinLabel(plan, left);
  const actionable = label === 'Join';

  return (
    <Pressable
      onPress={() => onOpen(plan.id!)}
      pressScale={0.985}
      accessibilityLabel={`${plan.title}, ${plan.venue_name}, ${formatPlanTime(plan.starts_at!)}, ${left} spots left`}
      style={styles.card}
    >
      <PlanCover path={plan.cover_path} icon={activity.icon} style={styles.cover}>
        <View style={styles.topRow}>
          <Badge label={activity.label} tone="glass" />
          {plan.audience === 'women_only' ? <Badge label="Women only" tone="glass" icon="female" /> : null}
          {left > 0 && left <= 3 ? <Badge label="Filling fast" tone="glass" icon="local-fire-department" /> : null}
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.time}>
            <Icon name="schedule" size={16} color="primary" />
            <Text variant="smallStrong" color="primary">
              {formatPlanTime(plan.starts_at!)}
            </Text>
          </View>
          <Badge label={left > 0 ? `${left} spots left` : 'Full'} tone="glass" />
        </View>
      </PlanCover>

      <View style={styles.body}>
        <Text variant="title3" numberOfLines={2}>
          {plan.title}
        </Text>
        <View style={styles.venue}>
          <Icon name="location-on" size={16} color="textSubtle" />
          <Text variant="small" color="textMuted" numberOfLines={1} style={styles.flex}>
            {plan.venue_name}, {plan.venue_area_name}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => onHost(plan.host_id!)} accessibilityLabel={`Host ${plan.host_first_name}`} style={styles.host}>
          <Avatar path={plan.host_photo_path} name={plan.host_first_name} size={32} verified={Boolean(plan.host_verified)} />
          <Text variant="smallStrong">{plan.host_first_name}</Text>
          <Badge label="Host" />
        </Pressable>
        <View style={styles.actions}>
          <AvatarStack names={plan.member_names ?? []} total={plan.approved_count ?? 0} />
          <Button
            label={label}
            size="sm"
            fill={false}
            variant={actionable ? 'primary' : 'secondary'}
            disabled={label === 'Full'}
            onPress={actionable ? () => onJoin(plan.id!) : () => onOpen(plan.id!)}
            accessibilityLabel={`${label}: ${plan.title}`}
          />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.md,
  },
  cover: { height: 176, borderRadius: radii.lg, justifyContent: 'space-between', padding: space.md },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  body: { gap: space.xs, paddingHorizontal: space.xs },
  venue: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  flex: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.md,
    paddingHorizontal: space.xs,
  },
  host: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
