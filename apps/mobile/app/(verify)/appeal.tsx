/**
 * Route: `(verify)/appeal`
 * Closes VR-6: In-app appeal for verification rejection or account suspension; human reply within 48 hours.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MAX_APPEAL_CHARS } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function VerifyAppealScreen() {
  const router = useRouter();
  const { submitUserAppeal } = useYuvomeet();
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = () => {
    const res = submitUserAppeal('verification', message);
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Please enter your appeal details.');
      return;
    }
    setErrorMsg(null);
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Submit an Appeal" subtitle="VR-6 · 48-Hour Human Review SLA" />

      <ScrollView contentContainerStyle={styles.content}>
        {submitted ? (
          <View style={styles.confirmCard}>
            <Text maxFontSizeMultiplier={1.3} style={styles.confirmTitle}>
              ✓ Appeal Received (48h SLA)
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.confirmBody}>
              A human reviewer on our safety team will review your appeal within 48 hours and notify you in-app under Settings → My Appeals.
            </Text>
            <Pressable
              onPress={() => router.replace('/settings/appeals')}
              style={styles.ctaButton}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.ctaText}>
                View My Appeals →
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
              Tell us what went wrong
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
              Every appeal is read by a human reviewer (never automated) within 48 hours (Rule VR-6).
            </Text>

            <TextInput
              value={message}
              onChangeText={setMessage}
              maxLength={MAX_APPEAL_CHARS}
              multiline
              placeholder="Explain why the verification or moderation decision was inaccurate (e.g., lighting issue during selfie or DigiLocker OCR misread)..."
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />

            {errorMsg ? (
              <Text maxFontSizeMultiplier={1.3} style={styles.errorText}>
                ⚠️ {errorMsg}
              </Text>
            ) : null}

            <Pressable onPress={handleSubmit} style={styles.ctaButton}>
              <Text maxFontSizeMultiplier={1.3} style={styles.ctaText}>
                Submit Appeal for Human Review →
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  headline: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  input: {
    minHeight: 130,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    padding: 14,
    color: Colors.primaryWhite,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  errorText: {
    color: Colors.errorCoral,
    fontSize: 13,
    marginBottom: 12,
  },
  ctaButton: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
  confirmCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
  },
  confirmTitle: {
    color: Colors.trustEmerald,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  confirmBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
});
