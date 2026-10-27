import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePlan, useRoster, useSubmitRating } from '../../../../src/features/plans/api';
import { useMe } from '../../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../../src/lib/errors';
import { Avatar, Button, Card, Chip, EmptyState, Header, Notice, Screen, space, Text } from '../../../../src/ui';

interface Answer {
  showed_up: boolean;
  felt_safe: boolean;
}

/** SF-4: private, per-member "showed up" and "felt safe". Unsafe answers go to moderators. */
export default function RateGroup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const plan = usePlan(id).data;
  const roster = useRoster(id);
  const submit = useSubmitRating(id);
  const people = useMemo(() => (roster.data ?? []).filter((m) => m.user_id !== me.id), [roster.data, me.id]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const get = (uid: string): Answer => answers[uid] ?? { showed_up: true, felt_safe: true };
  const set = (uid: string, patch: Partial<Answer>) => setAnswers((a) => ({ ...a, [uid]: { ...get(uid), ...patch } }));
  const unsafe = people.filter((p) => !get(p.user_id!).felt_safe);

  if (submit.isSuccess) {
    return (
      <Screen header={<Header leading="close" />}>
        <EmptyState
          icon="favorite-border"
          title="Thanks for rating"
          body="Ratings are private. They help keep no-shows and unsafe behaviour out of future plans."
          actionLabel="Done"
          onAction={() => router.back()}
        />
        {unsafe.length ? (
          <Button
            label={`Report ${unsafe[0]!.first_name}`}
            variant="danger"
            onPress={() => router.replace({ pathname: '/report', params: { userId: unsafe[0]!.user_id!, planId: id, context: 'plan', name: unsafe[0]!.first_name ?? '' } })}
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title="Rate the group" subtitle={plan?.title ?? undefined} leading="close" />}
      footer={
        <Button
          label="Submit ratings"
          loading={submit.isPending}
          disabled={!people.length}
          onPress={() => submit.mutate(people.map((p) => ({ ratee_id: p.user_id!, ...get(p.user_id!) })))}
        />
      }
    >
      <Text variant="body" color="textMuted" style={styles.intro}>
        Only moderators see these answers. Nobody is told how you rated them.
      </Text>
      {submit.error ? <Notice tone="danger" text={errorMessage(submit.error)} /> : null}
      <View style={styles.list}>
        {people.map((p) => {
          const a = get(p.user_id!);
          return (
            <Card key={p.user_id}>
              <View style={styles.person}>
                <Avatar path={p.photo_path} name={p.first_name} size={44} verified={Boolean(p.is_verified)} />
                <Text variant="bodyStrong" style={styles.flex}>
                  {p.first_name}
                  {p.is_host ? '  · Host' : ''}
                </Text>
              </View>
              <View style={styles.row}>
                <Chip kind="choice" grow label="Showed up" selected={a.showed_up} onPress={() => set(p.user_id!, { showed_up: !a.showed_up })} />
                <Chip kind="choice" grow label="Felt safe" selected={a.felt_safe} onPress={() => set(p.user_id!, { felt_safe: !a.felt_safe })} />
              </View>
            </Card>
          );
        })}
      </View>
      {unsafe.length ? (
        <Notice tone="warning" text="A moderator will look at this. You can also file a report after submitting." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: space.sm },
  list: { gap: space.md, marginTop: space.lg },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
