/**
 * Route: `(entry)/phone`
 * Closes ON-1 & S-5/S-6: Phone number entry. Never stored in `public.profiles` — lives only in `auth.users.phone`.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PhoneSignInSchema } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function PhoneEntryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { requestOtp } = useYuvomeet();
  const [phone, setPhone] = useState('9876543210');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendOtp = () => {
    const parsed = PhoneSignInSchema.safeParse({ phone });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? 'Enter a valid 10-digit Indian mobile number');
      return;
    }

    const res = requestOtp(`+91${phone.replace(/^\+91/, '')}`, false);
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Unable to send OTP');
      return;
    }

    setErrorMsg(null);
    router.push({
      pathname: '/(entry)/otp',
      params: { phone: `+91 ${phone.slice(0, 2)}******${phone.slice(-2)}` },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Sign In · Kota" subtitle="ON-1 · MSG91 DLT OTP" />

      <View style={styles.body}>
        <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
          {t('onboarding.phoneTitle')}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          {t('onboarding.phoneSub')}
        </Text>

        <View style={styles.inputRow}>
          <View style={styles.prefixBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.prefixText}>
              🇮🇳 +91
            </Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="9876543210"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
        </View>

        {errorMsg ? (
          <Text maxFontSizeMultiplier={1.3} style={styles.errorText}>
            {errorMsg}
          </Text>
        ) : null}

        <View style={styles.privacyNotice}>
          <Text maxFontSizeMultiplier={1.3} style={styles.privacyText}>
            🔒 Rule S-5 & S-6: Your phone number stays encrypted in Auth and is never exposed in any public table or API.
          </Text>
        </View>

        <Pressable
          onPress={handleSendOtp}
          accessibilityRole="button"
          style={styles.ctaButton}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.ctaText}>
            {t('onboarding.sendOtp')} →
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  headline: {
    color: Colors.primaryWhite,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  prefixBox: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: {
    color: Colors.primaryWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    height: 54,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    paddingHorizontal: 16,
    color: Colors.primaryWhite,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  errorText: {
    color: Colors.errorCoral,
    fontSize: 13,
    marginBottom: 12,
  },
  privacyNotice: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 24,
  },
  privacyText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  ctaButton: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  ctaText: {
    color: Colors.onPrimaryDark,
    fontSize: 16,
    fontWeight: '800',
  },
});
