import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, space } from './theme';

export interface InfoTileProps {
  icon: IconName;
  label: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}

/** Bento tile from Stitch "Plan Details": icon circle, uppercase label, value, detail line. */
export const InfoTile = memo(function InfoTile({ icon, label, title, subtitle, right, children }: InfoTileProps) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.circle}>
          <Icon name={icon} size={22} />
        </View>
        <View style={styles.flex}>
          <Text variant="label" color="textSubtle">
            {label}
          </Text>
          <Text variant="title3" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textMuted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </Card>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
});
