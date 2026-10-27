import { CHECKIN_WINDOW_MIN } from '@yuvomeet/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLeavePlan, usePlan, useRoster, type PlanCard } from '../../../../src/features/plans/api';
import { PlanCover } from '../../../../src/features/plans/PlanCover';
import { spotsLeft, useActivityMeta } from '../../../../src/features/plans/usePlanMeta';
import { sharePlanWithContact, useTrustedContact } from '../../../../src/features/safety/api';
import { isVerified, useMe } from '../../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../../src/lib/errors';
import { formatDateLong, formatStartsIn, formatTime } from '../../../../src/lib/format';
import { openDirections } from '../../../../src/lib/links';
import { track } from '../../../../src/lib/telemetry';
import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Card,
  colors,
  EmptyState,
  gutter,
  Header,
  Icon,
  IconButton,
  InfoTile,
  Notice,
  Pressable,
  Screen,
  space,
  Text,
  type IconName,
} from '../../../../src/ui';

const RULES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'verified-user', title: 'Verified 18+ only:', body: 'Every member passed an age and selfie check.' },
  { icon: 'storefront', title: 'Approved public venue:', body: 'Plans happen only at checked, high-footfall spots.' },
  { icon: 'report-gmailerrorred', title: 'Zero tolerance:', body: 'No harassment. Keep contact details off until you have met.' },
];

const hours = (p: PlanCard) => Math.round(((Date.parse(p.ends_at!) - Date.parse(p.starts_at!)) / 3_600_000) * 10) / 10;

function inCheckInWindow(p: PlanCard) {
  return Math.abs(Date.now() - Date.parse(p.starts_at!)) <= CHECKIN_WINDOW_MIN * 60_000 && !p.my_checked_in_at;
}

/** Stitch "Plan Details" (PL-2 to PL-6, SF-2, SF-3). The footer CTA follows the member state. */
export default function PlanDetails() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: 'feed' | 'my_plans' }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const query = usePlan(id);
  const plan = query.data;
  const viewed = Boolean(plan);
  useEffect(() => {
    if (viewed && plan) track('plan_viewed', { plan_id: id, audience: plan.audience!, activity: plan.activity!, source: source ?? 'link' });
  }, [viewed, id]); // eslint-disable-line react-hooks/exhaustive-deps
  const isHost = plan?.host_id === me.id;
  const member = isHost || plan?.my_status === 'approved' || plan?.my_status === 'attended';
  const roster = useRoster(id);
  const contact = useTrustedContact();
  const leave = useLeavePlan(id);
  const activity = useActivityMeta()(plan?.activity);

  if (!plan) {
    return (
      <Screen header={<Header title="Plan" />}>
        {query.isLoading ? null : (
          <EmptyState icon="event-busy" title="Plan not found" body="It may have been cancelled, or it isn't open to you." actionLabel="Back to Discover" onAction={() => router.navigate('/')} />
        )}
      </Screen>
    );
  }

  const left = spotsLeft(plan);
  const upcoming = plan.status === 'open' || plan.status === 'full' || plan.status === 'started';
  const share = () =>
    sharePlanWithContact(
      {
        title: plan.title!,
        venueName: plan.venue_name!,
        venueAddress: plan.venue_address!,
        startsAt: plan.starts_at!,
        hostName: plan.host_first_name ?? 'Host',
        venueLat: plan.venue_lat!,
        venueLng: plan.venue_lng!,
      },
      contact.data ?? null,
    );
  const confirmLeave = () =>
    Alert.alert('Leave this plan?', 'Your spot opens up for someone else. The weekly join you used is not returned.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leave.mutate(undefined, { onError: (e) => Alert.alert('Could not leave', errorMessage(e)) }) },
    ]);

  return (
    <Screen fullBleed padded={false} footer={upcoming ? <Footer plan={plan} isHost={isHost} verified={isVerified(me)} left={left} /> : undefined}>
      <PlanCover path={plan.cover_path} icon={activity.icon} style={[styles.hero, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.heroTop}>
          <IconButton icon="arrow-back" label="Go back" variant="glass" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <View style={styles.heroActions}>
            {member ? <IconButton icon="ios-share" label="Share with trusted contact" variant="glass" onPress={share} /> : null}
            {!isHost && plan.host_id ? (
              <IconButton
                icon="outlined-flag"
                label="Report host"
                variant="glass"
                onPress={() => router.push({ pathname: '/report', params: { userId: plan.host_id!, planId: plan.id!, context: 'plan', name: plan.host_first_name ?? '' } })}
              />
            ) : null}
          </View>
        </View>
        <Badge label={left > 0 ? `${left} spots open` : 'Full'} tone="glass" dot />
      </PlanCover>

      <View style={styles.body}>
        <View style={styles.tags}>
          <Badge label={activity.label} icon={activity.icon} />
          {plan.audience === 'women_only' ? <Badge label="Women only" icon="female" /> : null}
          {plan.audience === 'same_college' ? <Badge label={plan.host_college ?? 'Same college'} icon="school" /> : null}
          {plan.requires_approval ? <Badge label="Host approves" icon="how-to-reg" /> : <Badge label="Instant join" icon="bolt" />}
        </View>
        <Text variant="title1">{plan.title}</Text>

        {plan.status === 'cancelled' ? (
          <Notice tone="danger" title="This plan was cancelled" text={plan.cancel_reason ?? 'The host cancelled this plan.'} />
        ) : null}
        {plan.status === 'completed' ? <Notice tone="success" text="This plan has ended. Thanks for meeting safely." /> : null}

        <InfoTile
          icon="calendar-today"
          label="When"
          title={`${formatDateLong(plan.starts_at!)}, ${formatTime(plan.starts_at!)} – ${formatTime(plan.ends_at!)}`}
          subtitle={`${formatStartsIn(plan.starts_at!)} • ${hours(plan)} hrs`}
        />
        <InfoTile
          icon="storefront"
          label="Location"
          title={plan.venue_name!}
          subtitle={`${plan.venue_area_name}, Kota`}
          right={<Button label="Maps" trailingIcon="open-in-new" variant="secondary" size="sm" fill={false} onPress={() => openDirections(plan.venue_lat!, plan.venue_lng!, plan.venue_name!)} />}
        >
          <Pressable onPress={() => router.push({ pathname: '/venues/[id]', params: { id: plan.venue_id! } })} accessibilityLabel="About this venue" style={styles.safeZone}>
            <Icon name="verified" size={16} color="success" />
            <Text variant="caption" color="success">
              {plan.venue_partner ? 'Partner venue · verified safe zone' : 'Public venue verified & safe zone'}
            </Text>
          </Pressable>
        </InfoTile>

        <Card onPress={() => router.push({ pathname: '/user/[id]', params: { id: plan.host_id! } })} accessibilityLabel={`Host ${plan.host_first_name}`}>
          <View style={styles.hostHead}>
            <Text variant="label" color="textSubtle" style={styles.flex}>
              Hosted by
            </Text>
            <Badge label={`${plan.host_plans_hosted ?? 0} plans hosted`} icon="star" tone="accent" />
          </View>
          <View style={styles.hostRow}>
            <Avatar path={plan.host_photo_path} name={plan.host_first_name} size={64} verified={Boolean(plan.host_verified)} />
            <View style={styles.flex}>
              <Text variant="title3">
                {plan.host_first_name}{' '}
                <Text variant="body" color="textSubtle">
                  {plan.host_age_band}
                </Text>
              </Text>
              {plan.host_college ? (
                <Text variant="small" color="textMuted">
                  {plan.host_college}
                </Text>
              ) : null}
            </View>
          </View>
          {plan.description ? (
            <Text variant="body" color="textMuted">
              “{plan.description}”
            </Text>
          ) : null}
        </Card>

        <Card>
          <View style={styles.hostHead}>
            <Text variant="title3" style={styles.flex}>
              Attendees ({plan.approved_count ?? 0}/{plan.capacity})
            </Text>
            {left > 0 ? <Badge label={`${left} spots remaining`} tone="success" /> : <Badge label="Full" />}
          </View>
          {member && roster.data?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roster}>
              {roster.data.map((m) => (
                <Pressable
                  key={m.user_id}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: m.user_id! } })}
                  accessibilityLabel={`${m.first_name}${m.is_host ? ', host' : ''}`}
                  style={styles.person}
                >
                  <Avatar path={m.photo_path} name={m.first_name} size={52} ring={Boolean(m.is_host)} verified={Boolean(m.checked_in)} />
                  {m.is_host ? (
                    <View style={styles.hostTag}>
                      <Text variant="label" color="onPrimary">
                        Host
                      </Text>
                    </View>
                  ) : null}
                  <Text variant="caption" numberOfLines={1}>
                    {m.first_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.stackRow}>
              <AvatarStack names={plan.member_names ?? []} total={plan.approved_count ?? 0} size={36} />
              <Text variant="small" color="textSubtle" style={styles.flex}>
                Names and photos show once you're in the plan.
              </Text>
            </View>
          )}
        </Card>

        <Card>
          <View style={styles.hostRow}>
            <Icon name="shield" size={22} color="textMuted" />
            <Text variant="title3">Meetup Rules & Safety</Text>
          </View>
          {RULES.map((r) => (
            <View key={r.title} style={styles.rule}>
              <Icon name={r.icon} size={20} color="success" />
              <Text variant="body" color="textMuted" style={styles.flex}>
                <Text variant="bodyStrong">{r.title}</Text> {r.body}
              </Text>
            </View>
          ))}
        </Card>

        {member && upcoming ? (
          <Button
            label="SOS · Get help now"
            icon="sos"
            variant="sos"
            onPress={() => router.push({ pathname: '/safety/sos', params: { planId: plan.id! } })}
          />
        ) : null}
        {plan.my_status === 'approved' && upcoming ? <Button label="Leave plan" variant="ghost" size="md" onPress={confirmLeave} /> : null}
      </View>
    </Screen>
  );
}

interface FooterProps {
  plan: PlanCard;
  isHost: boolean;
  verified: boolean;
  left: number;
}

function Footer({ plan, isHost, verified, left }: FooterProps) {
  const id = plan.id!;
  const chat = () => router.push({ pathname: '/chat/[id]', params: { id: plan.conversation_id! } });
  const checkIn = inCheckInWindow(plan) && (isHost || plan.my_status === 'approved');

  let cta: React.ReactNode;
  if (isHost) {
    cta = (
      <View style={styles.footerRow}>
        <Button label="Cancel" variant="secondary" fill={false} onPress={() => router.push({ pathname: '/plan/[id]/cancel', params: { id } })} />
        <Button label="Requests" icon="how-to-reg" fill={false} style={styles.flex} onPress={() => router.push({ pathname: '/plan/[id]/requests', params: { id } })} />
      </View>
    );
  } else if (plan.my_status === 'approved') {
    cta = (
      <View style={styles.footerRow}>
        <Button label="Group chat" icon="forum" variant="secondary" fill={false} style={styles.flex} disabled={!plan.conversation_id} onPress={chat} />
        {checkIn ? <Button label="Check in" icon="where-to-vote" fill={false} style={styles.flex} onPress={() => router.push({ pathname: '/plan/[id]/check-in', params: { id } })} /> : null}
      </View>
    );
  } else if (plan.my_status === 'requested') {
    cta = <Button label="Request sent · host reviewing" icon="hourglass-top" variant="secondary" disabled />;
  } else if (left === 0 || plan.status !== 'open') {
    cta = <Button label={plan.status === 'started' ? 'Plan has started' : 'Plan is full'} variant="secondary" disabled />;
  } else {
    cta = (
      <View style={styles.footerRow}>
        <View style={styles.flex}>
          <Text variant="label" color="textSubtle">
            Admission
          </Text>
          <Text variant="title3">Free to join</Text>
        </View>
        <Button
          label={verified ? 'Join Plan' : 'Verify to join'}
          trailingIcon="arrow-forward"
          fill={false}
          style={styles.flex}
          onPress={() => router.push(verified ? { pathname: '/plan/[id]/join', params: { id } } : { pathname: '/verify-gate', params: { planId: id } })}
        />
      </View>
    );
  }

  return (
    <>
      {cta}
      {isHost && checkIn ? <Button label="Check in" icon="where-to-vote" variant="secondary" size="md" onPress={() => router.push({ pathname: '/plan/[id]/check-in', params: { id } })} /> : null}
      <View style={styles.footNote}>
        <Icon name="receipt-long" size={14} color="textSubtle" />
        <Text variant="caption" color="textSubtle">
          Everyone pays for their own order at the venue
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { height: 300, justifyContent: 'space-between', paddingHorizontal: gutter, paddingBottom: space.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  heroActions: { flexDirection: 'row', gap: space.sm },
  body: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  safeZone: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 32 },
  hostHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  roster: { gap: space.lg, paddingVertical: space.xs },
  person: { alignItems: 'center', gap: space.xs, width: 60 },
  hostTag: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rule: { flexDirection: 'row', gap: space.md },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
});
