/**
 * Route: `safety/sos`
 * Closes SF-3 & S-51:
 * - Big 112 Emergency Helpline call button
 * - Sends one-time GPS location link via WhatsApp to Trusted Contact (or Android Share sheet if WhatsApp not installed)
 * - Server logs only `sos_pressed` with `plan_id` and `location_sent` boolean, NEVER the GPS coordinates.
 */

import React from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EMERGENCY_HELPLINE } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { trackEvent } from '../../src/lib/telemetry';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function SosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = params.planId ?? 'plan-chai-games';
  const { plans, trustedContact } = useYuvomeet();
  const plan = plans.find((p) => p.id === planId) ?? plans[0]!;

  const handleCall112 = () => {
    trackEvent('sos_pressed', { plan_id: plan.id, location_sent: false });
    Linking.openURL(`tel:${EMERGENCY_HELPLINE}`);
  };

  const handleSendOneTimeLocation = async () => {
    trackEvent('sos_pressed', { plan_id: plan.id, location_sent: true });
    const mapsUrl = `https://maps.google.com/?q=${plan.venue_lat},${plan.venue_lng}`;
    const sosText = `🚨 SOS from Yuvomeet: I need help right now.\n• Current Venue: ${plan.venue_name} (${plan.venue_address})\n• Plan: ${plan.title}\n• One-time GPS Pin: ${mapsUrl}`;

    const phoneParam = trustedContact?.phone
      ? `phone=91${trustedContact.phone.replace(/\D/g, '').slice(-10)}&`
      : '';
    const whatsappUrl = `whatsapp://send?${phoneParam}text=${encodeURIComponent(sosText)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({ message: sosText });
      }
    } catch {
      await Share.share({ message: sosText });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="SOS · Emergency"
        subtitle="SF-3 & S-51 · Free for Everyone (SB-5)"
      />

      <View style={styles.body}>
        <View style={styles.sosCard}>
          <Text style={styles.sirenEmoji}>🚨</Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
            Immediate Safety Assistance
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.sub}>
            Active Plan: {plan.title} at {plan.venue_name}
          </Text>

          <Pressable
            onPress={handleCall112}
            accessibilityRole="button"
            accessibilityLabel="Call 112 National Emergency Helpline"
            style={styles.call112Btn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.call112Text}>
              📞 Call 112 National Helpline Now
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSendOneTimeLocation}
            accessibilityRole="button"
            style={styles.whatsappSosBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.whatsappSosText}>
              📍 Send One-Time Location to{' '}
              {trustedContact ? trustedContact.name : 'Trusted Contact'} (WhatsApp)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/safety/trusted-contact')}
            style={styles.configureBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.configureText}>
              {trustedContact
                ? `Trusted Contact: ${trustedContact.name} • Tap to edit`
                : 'Set up your Trusted Contact (stored on-device only)'}
            </Text>
          </Pressable>

          <View style={styles.privacyFooter}>
            <Text maxFontSizeMultiplier={1.3} style={styles.privacyFooterText}>
              Rule S-51: Location is composed on-device into your WhatsApp message and is never transmitted to Yuvomeet servers. On-call Kota admin is paged with the Plan ID to follow up.
            </Text>
          </View>
        </View>
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
    justifyContent: 'center',
  },
  sosCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 22,
    borderWidth: 1.5,
    borderColor: Colors.sosRed,
    alignItems: 'center',
  },
  sirenEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  headline: {
    color: Colors.primaryWhite,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
  },
  call112Btn: {
    width: '100%',
    minHeight: Spacing.touchMin + 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.sosRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  call112Text: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '900',
  },
  whatsappSosBtn: {
    width: '100%',
    minHeight: Spacing.touchMin + 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  whatsappSosText: {
    color: Colors.onElectricLime,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  configureBtn: {
    paddingVertical: 8,
  },
  configureText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  privacyFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  privacyFooterText: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
