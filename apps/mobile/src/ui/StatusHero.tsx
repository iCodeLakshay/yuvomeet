import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, radii, space, type ColorToken } from './theme';

export interface StatusHeroProps {
  icon: IconName;
  /** Small corner glyph on the ring (lock, check, clock). */
  badge?: IconName;
  badgeColor?: ColorToken;
  eyebrow?: string;
  title: string;
  body?: string;
  points?: { icon: IconName; text: string }[];
}

/** Stitch "Under-18 Restriction" layout, reused for every verification and account state. */
export const StatusHero = memo(function StatusHero({ icon, badge, badgeColor = 'accent', eyebrow, title, body, points }: StatusHeroProps) {
  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.wrap}>
      <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.ring}>
        <Icon name={icon} size={44} />
        {badge ? (
          <View style={[styles.badge, { backgroundColor: colors[badgeColor] }]}>
            <Icon name={badge} size={14} color="bg" />
          </View>
        ) : null}
      </Animated.View>
      {eyebrow ? (
        <View style={styles.eyebrow}>
          <Text variant="label" color="textMuted">
            {eyebrow}
          </Text>
        </View>
      ) : null}
      <Text variant="display" align="center" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="body" color="textMuted" align="center">
          {body}
        </Text>
      ) : null}
      {points?.length ? (
        <View style={styles.points}>
          {points.map((p) => (
            <View key={p.text} style={styles.point}>
              <Icon name={p.icon} size={20} color="textMuted" />
              <Text variant="small" color="textMuted" style={styles.flex}>
                {p.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.lg, paddingTop: space.xxxl * 1.5 },
  ring: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  eyebrow: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.pill, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  points: { alignSelf: 'stretch', gap: space.md, padding: space.lg, borderRadius: radii.xl, backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.border, marginTop: space.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
});
