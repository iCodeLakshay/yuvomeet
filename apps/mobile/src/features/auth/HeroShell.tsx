import { Image } from 'expo-image';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gutter, Logo, space } from '../../ui';

const hero = require('../../../assets/hero.jpg');

/** Full-bleed hero layout shared by Welcome and the 18+ notice (Stitch landing frames). */
export const HeroShell = memo(function HeroShell({ topRight, children }: { topRight?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Image source={hero} style={styles.hero} contentFit="cover" />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <Logo />
        {topRight}
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.xxl }]}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between' },
  hero: { ...StyleSheet.absoluteFill, height: '70%' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter },
  bottom: { paddingHorizontal: gutter, gap: space.lg },
});
