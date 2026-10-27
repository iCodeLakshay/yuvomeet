/**
 * Route: `(entry)/otp` + `(entry)/otp-locked` state
 * Replicates Stitch "Yuvomeet - OTP Verification" (`d5fa019bce444ad3b4e17fb44adce3e1`).
 * Enforces ON-1 & S-10: 5 wrong tries locks the number for 30 minutes.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;

export default function OtpScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ phone?: string }>();
  const maskedPhone = params.phone ?? '+91 98******10';
  const { verifyOtpCode, requestOtp, otpLockedUntil } = useYuvomeet();

  const [digits, setDigits] = useState('482910');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isLocked = Boolean(
    otpLockedUntil && new Date(otpLockedUntil).getTime() > Date.now(),
  );

  const handleKeyPress = (key: string) => {
    if (isLocked || !key) return;
    if (key === '⌫') {
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    if (digits.length < 6) {
      setDigits((prev) => prev + key);
    }
  };

  const handleVerify = () => {
    const res = verifyOtpCode(maskedPhone, digits);
    if (res.ok) {
      setStatusMessage(null);
      router.push('/(entry)/consent');
    } else if (res.locked) {
      setStatusMessage(t('onboarding.otpLockedSub'));
    } else {
      setStatusMessage(
        `Invalid OTP. ${res.remainingAttempts} attempt(s) left before 30-minute lock (Rule ON-1).`,
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="yuvomeet" subtitle="ON-1 · OTP Verification" />

      <View style={styles.mainContent}>
        <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
          {isLocked ? t('onboarding.otpLockedTitle') : t('onboarding.otpTitle')}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          {isLocked
            ? t('onboarding.otpLockedSub')
            : `${t('onboarding.otpSub')} (${maskedPhone})`}
        </Text>

        {/* 6-Digit Cells matching Stitch OTP frame */}
        <View style={styles.cellsRow}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const char = digits[index] ?? '';
            const isFocused = digits.length === index && !isLocked;
            return (
              <View
                key={index}
                style={[
                  styles.cell,
                  isFocused ? styles.cellFocused : null,
                  isLocked ? styles.cellLocked : null,
                ]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.cellDigit}>
                  {char}
                </Text>
              </View>
            );
          })}
        </View>

        {statusMessage ? (
          <View style={styles.alertBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.alertText}>
              {statusMessage}
            </Text>
          </View>
        ) : null}

        <View style={styles.resendRow}>
          <Pressable
            onPress={() => setDigits('000000')}
            accessibilityRole="button"
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.testLockLink}>
              Test wrong code (000000)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => requestOtp(maskedPhone, true)}
            disabled={isLocked}
            accessibilityRole="button"
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.resendText}>
              Resend in 38s
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleVerify}
          disabled={isLocked || digits.length !== 6}
          accessibilityRole="button"
          style={[
            styles.verifyButton,
            isLocked || digits.length !== 6 ? styles.verifyButtonDisabled : null,
          ]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.verifyButtonText}>
            {t('onboarding.verifyContinue')} →
          </Text>
        </Pressable>
      </View>

      {/* Integrated Frosted Numeric Keypad from Stitch */}
      <View style={styles.keypadWrap}>
        <View style={styles.keypadGrid}>
          {KEYPAD_KEYS.map((key, idx) => (
            <Pressable
              key={`key-${idx}`}
              onPress={() => handleKeyPress(key)}
              disabled={!key || isLocked}
              accessibilityRole="button"
              accessibilityLabel={key || 'blank'}
              style={[styles.keyBtn, !key ? styles.keyBtnEmpty : null]}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headline: {
    color: Colors.primaryWhite,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  cellsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  cell: {
    flex: 1,
    height: 56,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFocused: {
    borderColor: Colors.electricLime,
    borderWidth: 2,
  },
  cellLocked: {
    borderColor: Colors.errorCoral,
    opacity: 0.5,
  },
  cellDigit: {
    color: Colors.primaryWhite,
    fontSize: 22,
    fontWeight: '700',
  },
  alertBox: {
    backgroundColor: 'rgba(147, 0, 10, 0.35)',
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.errorCoral,
  },
  alertText: {
    color: Colors.errorCoral,
    fontSize: 12,
    fontWeight: '600',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  testLockLink: {
    color: Colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  resendText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '600',
  },
  verifyButton: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  verifyButtonDisabled: {
    opacity: 0.45,
  },
  verifyButtonText: {
    color: Colors.onPrimaryDark,
    fontSize: 16,
    fontWeight: '800',
  },
  keypadWrap: {
    backgroundColor: Colors.canvasLowest,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  keyBtn: {
    width: '31%',
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBtnEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyText: {
    color: Colors.primaryWhite,
    fontSize: 20,
    fontWeight: '600',
  },
});
