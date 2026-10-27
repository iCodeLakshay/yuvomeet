/**
 * Shared Top Navigation Bar + Offline Cache Banner
 */

import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useYuvomeet } from '../lib/store';
import { Colors, Radii } from '../theme/tokens';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightActionLabel?: string;
  onRightAction?: () => void;
  showSosButton?: boolean;
  planIdForSos?: string;
}

function ScreenHeaderComponent({
  title,
  subtitle,
  showBack = true,
  rightActionLabel,
  onRightAction,
  showSosButton = false,
  planIdForSos,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { isOfflineSimulated } = useYuvomeet();

  return (
    <View style={styles.wrapper}>
      {isOfflineSimulated ? (
        <View style={styles.offlineBanner}>
          <Text maxFontSizeMultiplier={1.3} style={styles.offlineText}>
            ⚡ {t('offlineBanner')}
          </Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        {showBack ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed'))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.circleBtn}
          >
            <Text style={styles.circleBtnText}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}

        <View style={styles.titleCenter}>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightWrap}>
          {showSosButton ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/safety/sos',
                  params: planIdForSos ? { planId: planIdForSos } : {},
                })
              }
              accessibilityRole="button"
              accessibilityLabel="SOS Emergency Assistance"
              style={styles.sosPill}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.sosText}>
                SOS
              </Text>
            </Pressable>
          ) : rightActionLabel && onRightAction ? (
            <Pressable
              onPress={onRightAction}
              accessibilityRole="button"
              accessibilityLabel={rightActionLabel}
              style={styles.actionPill}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.actionText}>
                {rightActionLabel}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
      </View>
    </View>
  );
}

export const ScreenHeader = memo(ScreenHeaderComponent);

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  offlineBanner: {
    backgroundColor: Colors.warningAmberBg,
    borderRadius: Radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  offlineText: {
    color: Colors.warningAmber,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnText: {
    color: Colors.primaryWhite,
    fontSize: 18,
    fontWeight: '700',
  },
  spacer: {
    width: 44,
    height: 44,
  },
  titleCenter: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  title: {
    color: Colors.primaryWhite,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  rightWrap: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  sosPill: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.sosRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionPill: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '600',
  },
});
