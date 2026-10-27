import { CHECKIN_RADIUS_M } from '@yuvomeet/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useCheckIn, usePlan } from '../../../../src/features/plans/api';
import { errorMessage } from '../../../../src/lib/errors';
import { formatTime } from '../../../../src/lib/format';
import { Button, colors, Header, Icon, Notice, Screen, space, Text } from '../../../../src/ui';

/** Gentle pulse behind the pin (transform + opacity only). */
function Pulse({ done }: { done: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 1600 }), -1, false));
  }, [t]);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - t.get(), transform: [{ scale: 0.6 + t.get() * 0.6 }] }));
  return (
    <View style={styles.pin}>
      {done ? null : <Animated.View style={[styles.ring, ring]} />}
      <View style={[styles.core, done ? styles.coreDone : null]}>
        <Icon name={done ? 'check' : 'where-to-vote'} size={44} color={done ? 'bg' : 'onPrimary'} />
      </View>
    </View>
  );
}

/** PL-6: one foreground GPS fix within 150 m and ±30 min of the start. Never stored (S-36). */
export default function CheckIn() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id).data;
  const checkIn = useCheckIn(id);
  const done = Boolean(checkIn.data || plan?.my_checked_in_at);

  return (
    <Screen
      header={<Header title="Check in" leading="close" />}
      footer={
        done ? (
          <Button label="Back to plan" onPress={() => router.back()} />
        ) : (
          <Button label="Check in now" icon="my-location" loading={checkIn.isPending} onPress={() => checkIn.mutate()} />
        )
      }
      contentStyle={styles.content}
    >
      <Pulse done={done} />
      <Text variant="title1" align="center">
        {done ? "You're checked in" : `At ${plan?.venue_name ?? 'the venue'}?`}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {done
          ? 'Have a good time. SOS stays one tap away on the plan page.'
          : `Check in when you arrive. You need to be within ${CHECKIN_RADIUS_M} m of the venue, from 30 minutes before ${plan ? formatTime(plan.starts_at!) : 'the start'}.`}
      </Text>
      {checkIn.error ? <Notice tone="danger" text={errorMessage(checkIn.error)} /> : null}
      <Notice text="Your location is used once for this check and then discarded. It is never saved or shared." icon="location-off" />
    </Screen>
  );
}

const SIZE = 168;

const styles = StyleSheet.create({
  content: { alignItems: 'stretch', gap: space.lg, paddingTop: space.xxxl },
  pin: { width: SIZE, height: SIZE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  core: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  coreDone: { backgroundColor: colors.success },
});
