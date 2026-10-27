import { checkPlanTiming, checkText, MAX_PLAN_CAPACITY, MIN_PLAN_CAPACITY } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useCaps, useCreatePlan, useVenues, venueCover, type PlanAudience } from '../../../src/features/plans/api';
import { PlanCover } from '../../../src/features/plans/PlanCover';
import { atMinutes, dayOptions, minutesLabel, timeOptions } from '../../../src/features/plans/schedule';
import { pickedVenue } from '../../../src/features/plans/stores';
import { useActivityMeta } from '../../../src/features/plans/usePlanMeta';
import { useLookups } from '../../../src/features/profile/api';
import { isVerified, useMe } from '../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../src/lib/errors';
import { formatRange } from '../../../src/lib/format';
import {
  Badge,
  Button,
  Card,
  Chip,
  colors,
  EmptyState,
  Field,
  gutter,
  Header,
  Icon,
  Notice,
  Pressable,
  radii,
  RadioRow,
  Screen,
  SectionHeader,
  space,
  Stepper,
  StepProgress,
  Text,
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

  const days = useMemo(() => dayOptions(), []);
  const [step, setStep] = useState<1 | 2>(1);
  const [activity, setActivity] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dayKey, setDayKey] = useState(days[0]!.key);
  const [start, setStart] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(120);
  const [open, setOpen] = useState<'date' | 'time' | null>(null);
  const [capacity, setCapacity] = useState(6);
  const [approval, setApproval] = useState(true);
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState<PlanAudience>('everyone');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => pickedVenue.set(null), []);
  const venue = venues.data?.find((v) => v.id === venueId);
  const times = useMemo(() => timeOptions(dayKey, Date.now(), venue?.late_events_allowed), [dayKey, venue?.late_events_allowed]);
  useEffect(() => {
    if (start != null && !times.includes(start)) setStart(null);
  }, [times, start]);

  if (!isVerified(me)) {
    return (
      <Screen header={<Header title="Create a Plan" leading="close" />}>
        <EmptyState icon="verified-user" title="Verify to host" body="Hosts are verified 18+ like everyone else. It takes about a minute." actionLabel="Verify now" onAction={() => router.replace('/verify')} />
      </Screen>
    );
  }

  const day = days.find((d) => d.key === dayKey)!;
  const startsAt = start != null ? atMinutes(dayKey, start) : null;
  const endsAt = startsAt ? new Date(startsAt.getTime() + duration * 60_000) : null;
  const outOfHosts = caps ? caps.hosts_used >= caps.hosts_limit : false;
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

  const publish = () => {
    const problem = description.trim() ? checkText(description, 'Description', 0, 500) : null;
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
      },
      {
        onSuccess: (id) => router.replace({ pathname: '/plan/[id]', params: { id } }),
        onError: (e) => setError(errorMessage(e)),
      },
    );
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
        <SectionHeader title="Preview" small />
        <Card style={styles.preview}>
          <PlanCover path={venue ? venueCover(venue) : null} icon={a.icon} style={styles.previewCover}>
            <Badge label={a.label} tone="glass" icon={a.icon} />
          </PlanCover>
          <Text variant="title3">{title.trim()}</Text>
          <Text variant="small" color="textMuted">
            {formatRange(startsAt!.toISOString(), endsAt!.toISOString())}
          </Text>
          <Text variant="small" color="textMuted">
            {venue!.name}, {venue!.area_name} · up to {capacity} people
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

        <SectionHeader title="Who can join" small />
        <View style={styles.list}>
          <RadioRow label="Everyone verified" icon="groups" selected={audience === 'everyone'} onPress={() => setAudience('everyone')} />
          {womanVerified ? (
            <RadioRow label="Women only (verified women)" icon="female" selected={audience === 'women_only'} onPress={() => setAudience('women_only')} />
          ) : null}
          {me.college_id ? (
            <RadioRow label="My college only" icon="school" selected={audience === 'same_college'} onPress={() => setAudience('same_college')} />
          ) : null}
        </View>
        {caps ? (
          <Notice
            tone={outOfHosts ? 'warning' : 'info'}
            icon="confirmation-number"
            text={outOfHosts ? `You've hosted ${caps.hosts_limit} plan this week. It resets Monday 00:00 IST.` : `Publishing uses your weekly host slot (${caps.hosts_limit - caps.hosts_used} left).`}
          />
        ) : null}
        {error ? <Notice tone="danger" text={error} /> : null}
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
      {open === 'date' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chipRow}>
          {days.map((d) => (
            <Chip key={d.key} label={`${d.label} · ${d.sub}`} selected={d.key === dayKey} onPress={() => setDayKey(d.key)} />
          ))}
        </ScrollView>
      ) : null}
      {open === 'time' ? (
        <View style={styles.list}>
          {times.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chipRow}>
              {times.map((m) => (
                <Chip key={m} label={minutesLabel(m)} selected={m === start} onPress={() => setStart(m)} />
              ))}
            </ScrollView>
          ) : (
            <Text variant="small" color="textSubtle">
              No start times left today. Pick another day.
            </Text>
          )}
          <View style={styles.chipWrap}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d / 60} hr${d > 60 ? 's' : ''}`} selected={duration === d} onPress={() => setDuration(d)} />
            ))}
          </View>
        </View>
      ) : null}

      <SectionHeader title="Public meeting point" small />
      <Field
        label="Approved venue"
        icon="location-on"
        value={venue ? `${venue.name}, ${venue.area_name}` : ''}
        placeholder="Choose a café or public spot"
        onPress={() => router.push('/plan/venue')}
        trailingIcon={venue ? 'verified' : 'chevron-right'}
      />
      <Notice text="Residential or private addresses are not allowed. Plans happen only at checked public venues." />

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
      {error ? <Notice tone="danger" text={error} /> : null}
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
  list: { gap: space.sm, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg },
  flex: { flex: 1, gap: 2 },
  preview: { marginTop: space.md },
  previewCover: { height: 140, borderRadius: radii.lg, padding: space.md },
});
