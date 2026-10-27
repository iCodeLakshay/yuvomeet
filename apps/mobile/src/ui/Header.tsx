import { router } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { gutter, space, touch } from './theme';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  /** 'back' (default), 'close', or none. */
  leading?: 'back' | 'close' | 'none';
  onLeading?: () => void;
  right?: ReactNode;
  /** Custom centre content (e.g. the logo) instead of title text. */
  center?: ReactNode;
  /** Large left-aligned title (tab screens) instead of a centred one. */
  large?: boolean;
}

export const Header = memo(function Header({ title, subtitle, leading = 'back', onLeading, right, center, large }: HeaderProps) {
  const goBack = onLeading ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  if (large) {
    return (
      <View style={styles.large}>
        <View style={styles.flex}>
          {subtitle ? <Text variant="label" color="textSubtle">{subtitle}</Text> : null}
          {title ? <Text variant="title1" accessibilityRole="header">{title}</Text> : null}
        </View>
        {right}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {leading !== 'none' ? (
          <IconButton
            icon={leading === 'close' ? 'close' : 'arrow-back'}
            label={leading === 'close' ? 'Close' : 'Go back'}
            onPress={goBack}
          />
        ) : null}
      </View>
      <View style={styles.center}>
        {center}
        {title ? (
          <Text variant="title3" align="center" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" color="textSubtle" align="center" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter, paddingVertical: space.sm, gap: space.sm },
  side: { minWidth: touch },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  large: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: gutter,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.sm,
  },
  flex: { flex: 1 },
});
