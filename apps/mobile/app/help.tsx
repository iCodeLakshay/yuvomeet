/**
 * Route: `help`
 * Closes Privacy §4 & §8: Help, Community Rules, Safety Policy, and Grievance Officer contact.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Colors, Radii } from '../src/theme/tokens';

export default function HelpAndGrievanceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Help & Grievance Officer"
        subtitle="DPDP Act & IT Rules Compliance"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardTitle}>
            ⚖️ Grievance Officer (India · DPDP & IT Rules)
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardBody}>
            • Name: Grievance & Safety Officer, Yuvomeet Kota{'\n'}
            • Email: grievance@yuvomeet.app{'\n'}
            • Jurisdiction: Kota, Rajasthan, India (Data Residency: Mumbai `ap-south-1`){'\n'}
            • SLA: Severe safety reports reviewed within 12 hours; appeals answered within 48 hours.
          </Text>
        </View>

        <View style={styles.card}>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardTitle}>
            🛡️ 5 Core Safety Principles
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardBody}>
            1. Group first: No 1:1 contact until two people share a completed group plan.{'\n'}
            2. Public places only: Approved Kota venues, ending by 9:00 PM IST unless partner venue.{'\n'}
            3. Safety is free: SOS, Trusted Contact, Check-in, Block, and Report are never paywalled.{'\n'}
            4. 12-hour human review for severe reports.{'\n'}
            5. Say no quietly: Declined join requests never show a reason.
          </Text>
        </View>
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
  card: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  cardTitle: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardBody: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
