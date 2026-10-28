import {
  checkPlanTiming,
  checkText,
  formatRupees,
  MAX_PLAN_CAPACITY,
  MIN_PLAN_CAPACITY,
  PLAN_PRICE_MAX_RUPEES,
  PLAN_PRICE_MIN_RUPEES,
  PLATFORM_FEE_BPS,
  splitSeat,
} from '@yuvomeet/shared';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { isPaid, useCaps, useCreatePlan, useUploadCover, useVenues, venueCover, type PlanAudience } from '../../../src/features/plans/api';
import { PlanCover } from '../../../src/features/plans/PlanCover';
import { atMinutes, dayLabel, isStartAllowed, MAX_DAYS_AHEAD, minutesLabel, todayKey } from '../../../src/features/plans/schedule';
import { pickedVenue } from '../../../src/features/plans/stores';
import { useActivityMeta } from '../../../src/features/plans/usePlanMeta';
import { useLookups } from '../../../src/features/profile/api';
import { isVerified, useMe } from '../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../src/lib/errors';
import { pickImage } from '../../../src/lib/media';
import { formatRange } from '../../../src/lib/format';
import {
  Badge,
  Button,
  Card,
  Chip,
  colors,
  DatePicker,
  EmptyState,
  Field,
  gutter,
  Header,
  Icon,
  Notice,
  Pressable,
  radii,
  RadioRow,
  RemoteImage,
  Screen,
  SectionHeader,
  space,
  Stepper,
  StepProgress,
  Text,
  TimePicker,
  Toggle,
  type IconName,
} from '../../../src/ui';

const DURATIONS = [60, 90, 120, 180] as const;

function Tile({ icon, label, value, sub, active, onPress }: { icon: IconName; label: string; value: string; sub: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${label}: ${value}`} pressScale={0.98} style={[styles.tile, active ? styles.tileOn : null]}>
      <View style={styles.tileHead}>
        <Text variant="label" color="textSubtle">
          {label}
        </Text>
        <Icon name={icon} size={20} color="textMuted" />
      </View>
      <Text variant="title3">{value}</Text>
      <Text variant="caption" color="textSubtle">
        {sub}
      </Text>
    </Pressable>
  );
}

/** Stitch "Create a Plan" (PL-1): two steps, approved venues only, server re-checks every rule. */
export default function CreatePlan() {
  const me = useMe();
  const lookups = useLookups();
  const venues = useVenues();
  const caps = useCaps().data;
  const create = useCreatePlan();
  const venueId = pickedVenue.use();
  const meta = useActivityMeta();

  const minDay = useMemo(() => todayKey(), []);
  const maxDay = minDay + MAX_DAYS_AHEAD * 86_400_000;
  const uploadCover = useUploadCover();
  const [step, setStep] = useState<1 | 2>(1);
  const [activity, setActivity] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dayKey, setDayKey] = useState(minDay);
  const [pickedStart, setStart] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(120);
  const [open, setOpen] = useState<'date' | 'time' | null>(null);
  const [capacity, setCapacity] = useState(6);
  const [approval, setApproval] = useState(true);
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState<PlanAudience>('everyone');
  const [cover, setCover] = useState<{ id: string; path: string; status: string } | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [rupees, setRupees] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => pickedVenue.set(null), []);
  const venue = venues.data?.find((v) => v.id === venueId);
  const late = Boolean(venue?.late_events_allowed);
  const allowed = (m: number) => isStartAllowed(dayKey, m, duration, Date.now(), late);
  // A start that no longer fits (other day, longer duration, different venue) reads as unset.
  const start = pickedStart != null && allowed(pickedStart) ? pickedStart : null;

  if (!isVerified(me)) {
    return (
      <Screen header={<Header title="Create a Plan" leading="close" />}>
        <EmptyState icon="verified-user" title="Verify to host" body="Hosts are verified 18+ like everyone else. It takes about a minute." actionLabel="Verify now" onAction={() => router.replace('/verify')} />
      </Screen>
    );
  }

  const day = dayLabel(dayKey);
  const startsAt = start != null ? atMinutes(dayKey, start) : null;
  const endsAt = startsAt ? new Date(startsAt.getTime() + duration * 60_000) : null;
  const outOfHosts = caps ? !isPaid(caps) && caps.hosts_used >= caps.hosts_limit : false;
  const womanVerified = me.verified_gender === 'woman';

  const next = () => {
    const problem =
      (!activity && 'Pick a category.') ||
      checkText(title, 'Title', 4, 80) ||
      (!startsAt && 'Pick a start time.') ||
      (!venue && 'Pick a public meeting point.') ||
      checkPlanTiming({ startsAt: startsAt!, endsAt: endsAt!, capacity, lateEventsAllowed: venue!.late_events_allowed });
    setError(problem || null);
    if (!problem) setStep(2);
  };

  const price = paid ? Number(rupees) : 0;
  const pricePaise = paid && Number.isInteger(price) ? price * 100 : null;
  const split = pricePaise ? splitSeat(pricePaise) : null;

  const publish = () => {
    const problem =
      (description.trim() ? checkText(description, 'Description', 0, 500) : null) ||
      (paid && (!Number.isInteger(price) || price < PLAN_PRICE_MIN_RUPEES || price > PLAN_PRICE_MAX_RUPEES)
        ? `Set a price between ₹${PLAN_PRICE_MIN_RUPEES} and ₹${PLAN_PRICE_MAX_RUPEES.toLocaleString('en-IN')}.`
        : null);
    setError(problem);
    if (problem) return;
    create.mutate(
      {
        venueId: venue!.id,
        title: title.trim(),
        description: description.trim(),
        activity: activity!,
        startsAt: startsAt!,
        endsAt: endsAt!,
        capacity,
        audience,
        requiresApproval: approval,
        coverId: cover?.id ?? null,
        pricePaise,
      },
      {
        onSuccess: (id) => router.replace({ pathname: '/plan/[id]', params: { id } }),
        onError: (e) => {
          setError(errorMessage(e));
          if ((e as { code?: string }).code === 'CAP_REACHED') router.push({ pathname: '/premium', params: { source: 'host_cap' } });
        },
      },
    );
  };

  const chooseCover = async () => {
    setCoverError(null);
    try {
      const uri = await pickImage('library', true);
      if (!uri) return;
      const res = await uploadCover.mutateAsync(uri);
      if (res.status === 'rejected') {
        setCover(null);
        setCoverError("That photo wasn't approved. Try another one.");
      } else {
        setCover(res);
      }
    } catch (e) {
      setCoverError(errorMessage(e));
    }
  };

  const header = (
    <View>
      <Header
        title="Create a Plan"
        subtitle={`Step ${step} of 2`}
        leading={step === 2 ? 'back' : 'close'}
        onLeading={step === 2 ? () => setStep(1) : undefined}
      />
      <View style={styles.progress}>
        <StepProgress step={step} total={2} />
      </View>
    </View>
  );

  if (step === 2) {
    const a = meta(activity);
    return (
      <Screen header={header} footer={<Button label="Publish Plan" trailingIcon="arrow-forward" loading={create.isPending} onPress={publish} />}>
        <SectionHeader title="Plan banner" small meta="1:1 · optional" />
        <View style={styles.bannerRow}>
          <Pressable onPress={chooseCover} disabled={uploadCover.isPending} accessibilityLabel={cover ? 'Change banner' : 'Upload banner'} pressScale={0.97} style={styles.banner}>
            {cover ? (
              <RemoteImage path={cover.path} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={styles.bannerEmpty}>
                <Icon name="add-photo-alternate" size={30} color="textMuted" />
              </View>
            )}
            {uploadCover.isPending ? (
              <View style={styles.bannerBusy}>
                <ActivityIndicator color={colors.text} />
              </View>
            ) : null}
          </Pressable>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{cover ? 'Banner added' : 'Add a square banner'}</Text>
            <Text variant="caption" color="textSubtle">
              {cover?.status === 'pending'
                ? 'Shows to others once our quick check passes.'
                : cover
                  ? 'Tap the image to change it.'
                  : 'Plans with a photo get more requests. The venue photo is used otherwise.'}
            </Text>
            {cover ? <Button label="Remove" variant="ghost" size="sm" fill={false} style={styles.remove} onPress={() => setCover(null)} /> : null}
          </View>
        </View>
        {coverError ? (
          <View style={styles.notes}>
            <Notice tone="danger" text={coverError} />
          </View>
        ) : null}

        <SectionHeader title="Preview" small />
        <Card>
          <PlanCover path={cover?.path ?? (venue ? venueCover(venue) : null)} icon={a.icon} style={styles.previewCover}>
            <Badge label={a.label} tone="glass" icon={a.icon} />
          </PlanCover>
          <Text variant="title3">{title.trim()}</Text>
          <Text variant="small" color="textMuted">
            {formatRange(startsAt!.toISOString(), endsAt!.toISOString())}
          </Text>
          <Text variant="small" color="textMuted">
            {venue!.name}, {venue!.area_name} · up to {capacity} people
          </Text>
          <Text variant="smallStrong" color={pricePaise ? 'accent' : 'success'}>
            {pricePaise ? `${formatRupees(pricePaise)} per person` : 'Free'}
          </Text>
        </Card>

        <SectionHeader title="About this plan" small />
        <Field
          label="What should people expect? (optional)"
          placeholder="Bringing Catan and chai. Everyone is welcome."
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
          counter
        />

        <SectionHeader title="Entry" small />
        <Card>
          <Toggle
            label="Paid plan"
            description="Charge each member a fixed amount, for a turf, tickets or food included."
            value={paid}
            onChange={setPaid}
          />
          {paid ? (
            <View style={styles.price}>
              <Field
                label="Price per person (₹)"
                icon="currency-rupee"
                placeholder="149"
                value={rupees}
                onChangeText={(t) => setRupees(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
              {split ? (
                <View style={styles.split}>
                  <View style={styles.splitRow}>
                    <Text variant="small" color="textMuted">
                      Member pays
                    </Text>
                    <Text variant="smallStrong">{formatRupees(pricePaise!)}</Text>
                  </View>
                  <View style={styles.splitRow}>
                    <Text variant="small" color="textMuted">
                      Platform fee ({PLATFORM_FEE_BPS / 100}%)
                    </Text>
                    <Text variant="small" color="textMuted">
                      − {formatRupees(split.fee)}
                    </Text>
                  </View>
                  <View style={styles.splitRow}>
                    <Text variant="smallStrong">You receive</Text>
                    <Text variant="smallStrong" color="success">
                      {formatRupees(split.host)} per person
                    </Text>
                  </View>
                </View>
              ) : null}
              <Text variant="caption" color="textSubtle">
                Members pay through Razorpay after you approve them. Payouts go to your UPI ID after the plan; add it under Account → Earnings.
              </Text>
            </View>
          ) : null}
        </Card>

        <SectionHeader title="Who can join" small />
        <View style={styles.stack}>
          <RadioRow label="Everyone verified" icon="groups" selected={audience === 'everyone'} onPress={() => setAudience('everyone')} />
          {womanVerified ? (
            <RadioRow label="Women only (verified women)" icon="female" selected={audience === 'women_only'} onPress={() => setAudience('women_only')} />
          ) : null}
          {me.college_id ? (
            <RadioRow label="My college only" icon="school" selected={audience === 'same_college'} onPress={() => setAudience('same_college')} />
          ) : null}
        </View>
        <View style={styles.notes}>
          {caps && !isPaid(caps) ? (
            <Notice
              tone={outOfHosts ? 'warning' : 'info'}
              icon="confirmation-number"
              text={outOfHosts ? `You've hosted ${caps.hosts_limit} plan this week. It resets Monday 00:00 IST.` : `Publishing uses your weekly host slot (${caps.hosts_limit - caps.hosts_used} left).`}
            />
          ) : null}
          {outOfHosts ? (
            <Button label="Host unlimited with Plus" icon="workspace-premium" variant="secondary" size="md" onPress={() => router.push({ pathname: '/premium', params: { source: 'host_cap' } })} />
          ) : null}
          {error ? <Notice tone="danger" text={error} /> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen header={header} footer={<Button label="Preview & Publish Plan" trailingIcon="arrow-forward" onPress={next} />}>
      <SectionHeader title="Select category" small meta="Tap to choose" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chipRow}>
        {(lookups.data?.activities ?? []).map((a) => (
          <Chip key={a.slug} label={a.label} icon={a.icon as IconName} selected={activity === a.slug} onPress={() => setActivity(a.slug)} />
        ))}
      </ScrollView>

      <SectionHeader title="Plan title" small />
      <Field label="Title" placeholder="Evening chai & casual discussion" value={title} onChangeText={setTitle} maxLength={80} icon="edit-note" />

      <View style={styles.tiles}>
        <Tile icon="calendar-today" label="Date" value={day.label} sub={day.sub} active={open === 'date'} onPress={() => setOpen(open === 'date' ? null : 'date')} />
        <Tile
          icon="schedule"
          label="Time"
          value={start != null ? minutesLabel(start) : 'Pick'}
          sub={`${duration / 60} hr${duration > 60 ? 's' : ''}`}
          active={open === 'time'}
          onPress={() => setOpen(open === 'time' ? null : 'time')}
        />
      </View>
      <DatePicker visible={open === 'date'} onClose={() => setOpen(null)} value={dayKey} onChange={setDayKey} minDay={minDay} maxDay={maxDay} title="Plan date" />
      <TimePicker
        visible={open === 'time'}
        onClose={() => setOpen(null)}
        value={start}
        onChange={setStart}
        isAllowed={allowed}
        title={`Start time · ${day.label}, ${day.sub}`}
        emptyText="No start times left on this day. Pick another date."
      >
        <View style={styles.group}>
          <Text variant="label" color="textSubtle">
            Duration
          </Text>
          <View style={styles.chipWrap}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d / 60} hr${d > 60 ? 's' : ''}`} selected={duration === d} onPress={() => setDuration(d)} />
            ))}
          </View>
        </View>
      </TimePicker>

      <SectionHeader title="Public meeting point" small />
      <Field
        label="Approved venue"
        icon="location-on"
        value={venue ? `${venue.name}, ${venue.area_name}` : ''}
        placeholder="Choose a café or public spot"
        onPress={() => router.push('/plan/venue')}
        trailingIcon={venue ? 'verified' : 'chevron-right'}
      />
      <Card style={styles.row}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">Group capacity</Text>
          <Text variant="caption" color="textSubtle">
            {MIN_PLAN_CAPACITY} to {MAX_PLAN_CAPACITY} people, including you
          </Text>
        </View>
        <Stepper label="Group capacity" value={capacity} min={MIN_PLAN_CAPACITY} max={Math.min(MAX_PLAN_CAPACITY, venue?.capacity ?? MAX_PLAN_CAPACITY)} onChange={setCapacity} />
      </Card>
      <Card>
        <Toggle
          label="Require host approval to join"
          description="Review each request before accepting. Keeps the table comfortable."
          value={approval}
          onChange={setApproval}
        />
      </Card>
      {error ? (
        <View style={styles.notes}>
          <Notice tone="danger" text={error} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { paddingHorizontal: gutter, paddingBottom: space.sm },
  bleed: { marginHorizontal: -gutter, marginTop: space.md },
  chipRow: { paddingHorizontal: gutter, gap: space.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tiles: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  tile: {
    flex: 1,
    gap: 2,
    padding: space.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileOn: { borderColor: colors.borderStrong, backgroundColor: colors.surface2 },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm },
  stack: { gap: space.sm },
  group: { gap: space.sm },
  notes: { gap: space.md, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, marginBottom: space.md },
  flex: { flex: 1, gap: 2 },
  previewCover: { height: 140, borderRadius: radii.lg, padding: space.md },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  banner: {
    width: 112,
    height: 112,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
  },
  bannerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bannerBusy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay },
  remove: { alignSelf: 'flex-start', paddingHorizontal: 0, marginTop: space.xs },
  price: { gap: space.md, marginTop: space.lg },
  split: { gap: space.sm, padding: space.md, borderRadius: radii.lg, backgroundColor: colors.surface2 },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
