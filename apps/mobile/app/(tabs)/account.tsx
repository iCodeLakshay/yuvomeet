/**
 * Route: `(tabs)/account`
 * Closes Account Home: Profile summary, Verified Badge, Safety Hub, KYC simulator switch, and Settings links.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { computeAgeBand } from '@yuvomeet/shared';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function AccountHomeScreen() {
  const router = useRouter();
  const { profile, photos, trustedContact, runKycSimulation } = useYuvomeet();

  const ageBand = computeAgeBand(profile.birth_year);
  const avatarUri =
    photos[0]?.path ??
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header Plate */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Image
              source={{ uri: avatarUri }}
              cachePolicy="memory-disk"
              style={styles.avatar}
            />
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text maxFontSizeMultiplier={1.3} style={styles.name}>
                  {profile.first_name} · {ageBand}
                </Text>
                {profile.verification_status === 'verified' ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓ 18+ Verified</Text>
                  </View>
                ) : null}
              </View>
              <Text maxFontSizeMultiplier={1.3} style={styles.areaText}>
                📍 {profile.area_name}, Kota • {profile.entitlement.toUpperCase()} Tier
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.genderMeta}>
                Verified Gender: {profile.verified_gender ?? 'Unverified'}
              </Text>
            </View>
          </View>

          <View style={styles.heroBtnsRow}>
            <Pressable
              onPress={() => router.push('/(profile)/edit')}
              style={styles.editBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.editBtnText}>
                ✎ Edit Profile
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/user/${profile.id}`)}
              style={styles.previewBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.previewBtnText}>
                👁 Public View (S-18)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Persona / Role Switcher to test Women-Only RLS & Verification */}
        <View style={styles.sectionCard}>
          <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
            PERSONA & VERIFICATION SIMULATOR (TEST S-15 WOMEN-ONLY RLS)
          </Text>
          <View style={styles.simRow}>
            <Pressable
              onPress={() => runKycSimulation('verified_woman')}
              style={[
                styles.simChip,
                profile.verified_gender === 'woman' &&
                profile.verification_status === 'verified'
                  ? styles.simChipActive
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.simChipText,
                  profile.verified_gender === 'woman' &&
                  profile.verification_status === 'verified'
                    ? styles.simChipTextActive
                    : null,
                ]}
              >
                ♀ Verified Woman (Riya)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => runKycSimulation('verified_man')}
              style={[
                styles.simChip,
                profile.verified_gender === 'man' &&
                profile.verification_status === 'verified'
                  ? styles.simChipActive
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.simChipText,
                  profile.verified_gender === 'man' &&
                  profile.verification_status === 'verified'
                    ? styles.simChipTextActive
                    : null,
                ]}
              >
                ♂ Verified Man (Aman)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Safety Hub (Never Paywalled · SB-5) */}
        <View style={styles.sectionCard}>
          <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
            SAFETY CENTER (FREE FOR EVERYONE · SB-5)
          </Text>

          <Pressable
            onPress={() => router.push('/safety/trusted-contact')}
            style={styles.menuRow}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.menuRowTitle}>
              📲 Trusted Contact ({trustedContact ? trustedContact.name : 'Not Set'})
            </Text>
            <Text style={styles.chevron}>→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/safety/sos')}
            style={styles.menuRow}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.menuRowTitle}>
              🚨 SOS & 112 Emergency Sheet
            </Text>
            <Text style={styles.chevron}>→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(verify)/intro')}
            style={styles.menuRow}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.menuRowTitle}>
              🪪 18+ & Selfie Verification ({profile.verification_status})
            </Text>
            <Text style={styles.chevron}>→</Text>
          </Pressable>
        </View>

        {/* Account & Compliance Navigation */}
        <View style={styles.sectionCard}>
          <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
            ACCOUNT, PRIVACY & COMPLIANCE
          </Text>

          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.menuRow}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.menuRowTitle}>
              ⚙️ Settings & Language (Hindi / English)
            </Text>
            <Text style={styles.chevron}>→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings/privacy')}
            style={styles.menuRow}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.menuRowTitle}>
              🔒 Privacy, Consents & Data Export (ON-6)
            </Text>
            <Text style={styles.chevron}>→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings/blocked')}
            style={styles.menuRow}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.menuRowTitle}>
              🚫 Blocked Members (CH-4)
            </Text>
            <Text style={styles.chevron}>→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings/appeals')}
            style={styles.menuRow}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.menuRowTitle}>
              ⚖️ My Appeals (VR-6 · 48h SLA)
            </Text>
            <Text style={styles.chevron}>→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/help')}
            style={styles.menuRow}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.menuRowTitle}>
              📜 Help, Community Rules & Grievance Officer
            </Text>
            <Text style={styles.chevron}>→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(entry)/splash')}
            style={styles.menuRow}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.menuRowTitle}>
              🔄 Preview Full Onboarding Flow (`(entry)/splash`)
            </Text>
            <Text style={styles.chevron}>→</Text>
          </Pressable>
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
    padding: 16,
    paddingBottom: 115,
  },
  heroCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: Colors.electricLime,
  },
  heroInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    color: Colors.primaryWhite,
    fontSize: 20,
    fontWeight: '800',
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    backgroundColor: Colors.trustEmeraldBg,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
  },
  verifiedBadgeText: {
    color: Colors.trustEmerald,
    fontSize: 10,
    fontWeight: '800',
  },
  areaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  genderMeta: {
    color: Colors.electricLime,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  heroBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    color: Colors.onPrimaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  previewBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 14,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  simRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  simChipActive: {
    backgroundColor: Colors.electricLime,
    borderColor: Colors.electricLime,
  },
  simChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  simChipTextActive: {
    color: Colors.onElectricLime,
    fontWeight: '800',
  },
  menuRow: {
    minHeight: Spacing.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  menuRowTitle: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
});
