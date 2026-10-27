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
        <View style={[styles.check, { width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19 }]}>
          <Icon name="check" size={size * 0.24} color="bg" />
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
  check: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  stack: { flexDirection: 'row', alignItems: 'center' },
  bubble: {
    backgroundColor: colors.surface3,
    borderWidth: 2,
    borderColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
