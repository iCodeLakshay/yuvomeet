import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { HeroShell } from '../../src/features/auth/HeroShell';
import { Button, colors, gutter, Pressable, space, Text } from '../../src/ui';

const SLIDES = [
  { title: 'Real people.\nReal plans.', body: 'Skip the swiping. Join small group plans at public cafés and spots around Kota.' },
  { title: 'Verified\n18+ only.', body: 'Every member passes an ID and selfie check. Phone numbers are never shared.' },
  { title: 'Safety\nbuilt in.', body: 'Approved venues, a 9 PM cut-off, SOS and a trusted contact, free for everyone.' },
] as const;

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 26 : 7, { duration: 220 }),
    opacity: withTiming(active ? 1 : 0.4, { duration: 220 }),
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Stitch "Minimal Landing (Liquid Glass)". Google sign-in is replaced by phone OTP (ON-1). */
export default function Welcome() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
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
    <HeroShell
      topRight={
        <Pressable onPress={() => router.push('/age')} accessibilityLabel="Skip" style={styles.skip}>
          <Text variant="smallStrong">Skip</Text>
        </Pressable>
      }
    >
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
      <Button label="Continue with phone" icon="smartphone" onPress={() => router.push('/age')} />
      <Pressable onPress={() => router.push('/phone')} accessibilityLabel="Already a member? Log in" style={styles.login}>
        <Text variant="small" color="textMuted" align="center">
          Already a member? <Text variant="smallStrong" style={styles.underline}>Log in</Text>
        </Text>
      </Pressable>
    </HeroShell>
  );
}

const styles = StyleSheet.create({
  skip: {
    paddingHorizontal: space.lg,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.scrim,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { height: 7, borderRadius: 4, backgroundColor: colors.primary },
  login: { minHeight: 44, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
