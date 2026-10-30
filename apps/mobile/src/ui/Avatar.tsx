import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { initials } from '../lib/format';
import { Icon } from './Icon';
import { RemoteImage } from './RemoteImage';
import { Text } from './Text';
import { colors } from './theme';

export interface AvatarProps {
  path?: string | null;
  name?: string | null;
  size?: number;
  verified?: boolean;
  ring?: boolean;
}

export const Avatar = memo(function Avatar({ path, name, size = 40, verified, ring }: AvatarProps) {
  const radius = size / 2;
  // Large enough to read on a 32 px avatar, proportionate on the 120 px profile photo.
  const badge = Math.max(16, Math.round(size * 0.34));
  return (
    <View style={{ width: size, height: size }}>
      <RemoteImage
        path={path}
        accessibilityLabel={name ? `${name}'s photo` : undefined}
        style={[{ width: size, height: size, borderRadius: radius }, ring ? styles.ring : null]}
        fallback={
          <View style={styles.center}>
            <Text variant={size > 56 ? 'title2' : 'caption'} color="textMuted">
              {initials(name)}
            </Text>
          </View>
        }
      />
      {verified ? (
        <View style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2 }]}>
          <Icon name="verified-badge" size={badge} color="brand" />
        </View>
      ) : null}
    </View>
  );
});

export interface AvatarStackProps {
  names: readonly string[];
  total: number;
  size?: number;
}

/** Overlapping initials (AK, PS, +2) used on plan cards. */
export const AvatarStack = memo(function AvatarStack({ names, total, size = 28 }: AvatarStackProps) {
  const shown = names.slice(0, 3);
  const more = total - shown.length;
  return (
    <View style={styles.stack} accessibilityLabel={`${total} going`}>
      {shown.map((n, i) => (
        <View key={`${n}-${i}`} style={[styles.bubble, { width: size, height: size, borderRadius: size / 2, marginLeft: i ? -8 : 0 }]}>
          <Text variant="caption" color="text">{initials(n)}</Text>
        </View>
      ))}
      {more > 0 ? (
        <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2, marginLeft: -8 }]}>
          <Text variant="caption" color="textMuted">+{more}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 2, borderColor: colors.borderStrong },
  badge: { position: 'absolute', right: -2, bottom: -2, alignItems: 'center', justifyContent: 'center' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  bubble: {
    backgroundColor: colors.surface3,
    borderWidth: 2,
    borderColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
