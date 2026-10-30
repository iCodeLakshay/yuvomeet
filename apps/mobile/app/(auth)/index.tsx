import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { HeroShell } from '../../src/features/auth/HeroShell';
import { signInWithGoogle } from '../../src/features/session/auth';
import { errorMessage } from '../../src/lib/errors';
import { Button, colors, GoogleLogo, gutter, notify, Pressable, space, Text } from '../../src/ui';

const SLIDES = [
  { title: 'Real people.\nReal plans.', body: 'Skip the swiping. Join small group plans at public cafés and spots around Kota.' },
  { title: 'Verified\n18+ only.', body: 'Every member passes an ID and selfie check. Phone numbers are never shared.' },
  { title: 'Small groups.\nGood times.', body: 'Board games, chai, cricket screenings and more. Pick a plan or host your own.' },
] as const;

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 26 : 7, { duration: 220 }),
    opacity: withTiming(active ? 1 : 0.4, { duration: 220 }),
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Stitch "Minimal Landing (Liquid Glass)". Google, phone OTP (ON-1) or email + password. */
export default function Welcome() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [google, setGoogle] = useState(false);
  const onGoogle = async () => {
    setGoogle(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      notify("Couldn't sign in with Google", errorMessage(e));
    } finally {
      setGoogle(false);
    }
  };
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  }).current;
  const renderSlide = useCallback(
    ({ item }: { item: (typeof SLIDES)[number] }) => (
      <View style={{ width: width - gutter * 2, gap: space.md }}>
        <Text variant="display">{item.title}</Text>
        <Text variant="body" color="textMuted">
          {item.body}
        </Text>
      </View>
    ),
    [width],
  );

  return (
    <HeroShell>
      <FlatList
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.title}
        renderItem={renderSlide}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
      />
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <Dot key={s.title} active={i === index} />
        ))}
      </View>
      <Button label="Continue with Google" leading={<GoogleLogo size={20} />} loading={google} onPress={onGoogle} />
      <View style={styles.alt}>
        <Button label="Phone" icon="smartphone" variant="secondary" style={styles.flex} onPress={() => router.push('/age')} />
        <Button label="Email" icon="mail-outline" variant="secondary" style={styles.flex} onPress={() => router.push({ pathname: '/email', params: { mode: 'signup' } })} />
      </View>
      <Pressable onPress={() => router.push('/email')} accessibilityLabel="Already a member? Log in" style={styles.login}>
        <Text variant="small" color="textMuted" align="center">
          Already a member? <Text variant="smallStrong" style={styles.underline}>Log in</Text>
        </Text>
      </Pressable>
    </HeroShell>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { height: 7, borderRadius: 4, backgroundColor: colors.primary },
  login: { minHeight: 44, justifyContent: 'center' },
  alt: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  underline: { textDecorationLine: 'underline' },
});
