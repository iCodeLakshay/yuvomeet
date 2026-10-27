import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HostedPlanCard, JoinedPlanCard, PastPlanRow, PendingPlanCard } from '../../../src/features/plans/MyPlanCard';
import { useMyPlans, type PlanCard } from '../../../src/features/plans/api';
import { useSession } from '../../../src/features/session/SessionProvider';
import { Button, colors, EmptyState, Header, Screen, SectionHeader, Segmented, space, type IconName } from '../../../src/ui';

type Tab = 'upcoming' | 'hosted' | 'pending' | 'past';

const RATING_DAYS = 7;
const canRate = (p: PlanCard) =>
  p.status === 'completed' && p.my_status === 'attended' && Date.parse(p.ends_at!) > Date.now() - RATING_DAYS * 86_400_000;

function Section({ title, icon, meta, children }: { title: string; icon: IconName; meta?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} icon={icon} meta={meta} />
      {children}
    </View>
  );
}

/** Stitch "My Plans" (PL-5): hosting, joined, requested and recent plans. */
export default function MyPlans() {
  const { userId } = useSession();
  const query = useMyPlans(userId!);
  const [tab, setTab] = useState<Tab>('upcoming');
  const { hosted = [], joined = [], pending = [], past = [] } = query.data ?? {};

  const show = (t: Tab) => tab === 'upcoming' || tab === t;
  const nothing =
    !query.isLoading &&
    (tab === 'upcoming' ? !hosted.length && !joined.length && !pending.length : !{ hosted, pending, past, upcoming: [] }[tab].length);

  return (
    <Screen
      dockInset
      onRefresh={query.refetch}
      refreshing={query.isRefetching}
      header={
        <>
          <Header
            large
            title="My Plans"
            right={
              <Button label="Host" icon="add" size="md" fill={false} onPress={() => router.push('/plan/new')} />
            }
          />
          <View style={styles.tabs}>
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              items={[
                { value: 'upcoming', label: 'Upcoming', count: hosted.length + joined.length },
                { value: 'hosted', label: 'Hosted', count: hosted.length },
                { value: 'pending', label: 'Pending', count: pending.length },
                { value: 'past', label: 'Past' },
              ]}
            />
          </View>
        </>
      }
    >
      {nothing ? (
        <EmptyState
          icon="event-note"
          title={tab === 'past' ? 'No past plans yet' : 'Nothing planned'}
          body="Find a group plan at an approved café, or host your own in under a minute."
          actionLabel="Discover plans"
          onAction={() => router.navigate('/')}
        />
      ) : null}

      {show('hosted') && hosted.length ? (
        <Section title="Hosted by You" icon="stars" meta={`${hosted.length} active`}>
          {hosted.map((p) => (
            <HostedPlanCard key={p.id} plan={p} />
          ))}
        </Section>
      ) : null}

      {tab === 'upcoming' && joined.length ? (
        <Section title="Upcoming Joined Plans" icon="event-available" meta={`${joined.length} plans`}>
          {joined.map((p) => (
            <JoinedPlanCard key={p.id} plan={p} />
          ))}
        </Section>
      ) : null}

      {show('pending') && pending.length ? (
        <Section title="Pending Requests" icon="hourglass-top" meta={`${pending.length} awaiting`}>
          {pending.map((p) => (
            <PendingPlanCard key={p.id} plan={p} />
          ))}
        </Section>
      ) : null}

      {(tab === 'upcoming' || tab === 'past') && past.length ? (
        <Section title="Recent History" icon="history">
          {(tab === 'past' ? past : past.slice(0, 3)).map((p) => (
            <PastPlanRow key={p.id} plan={p} canRate={canRate(p)} />
          ))}
          {tab === 'upcoming' && past.length > 3 ? (
            <Button label="View all" variant="ghost" size="sm" onPress={() => setTab('past')} />
          ) : null}
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  section: { gap: space.md, marginTop: space.sm },
});
