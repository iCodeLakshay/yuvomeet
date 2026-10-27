import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, Icon, RemoteImage, type IconName } from '../../ui';

export interface PlanCoverProps {
  path: string | null | undefined;
  icon: IconName;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** Venue photo with a scrim for overlaid badges; activity glyph when the venue has no photo. */
export const PlanCover = memo(function PlanCover({ path, icon, style, children }: PlanCoverProps) {
  return (
    <View style={[styles.wrap, style]}>
      <RemoteImage
        path={path}
        style={StyleSheet.absoluteFill}
        fallback={
          <View style={styles.fallback}>
            <Icon name={icon} size={44} color="textSubtle" />
          </View>
        }
      />
      <View style={styles.scrim} />
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.surface3 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(7, 8, 12, 0.32)' },
});
