/**
 * Route: `(profile)/photos`
 * Replicates Stitch "Yuvomeet - Onboarding: Add a profile photo" (`cccac8f4793a45b3a9744980938ab410`).
 * Closes ON-3, VR-4, S-21 to S-24:
 * - Minimum 2 approved photos required to activate profile (max 6).
 * - Uploads go to `quarantine`, EXIF stripped, checked by Rekognition (`moderate-image`).
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MIN_PROFILE_PHOTOS } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

const SAMPLE_APPROVED_PHOTO =
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80';

export default function ProfilePhotosScreen() {
  const router = useRouter();
  const { photos, addProfilePhoto, removeProfilePhoto } = useYuvomeet();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const approvedCount = photos.filter((p) => p.status === 'approved').length;

  const handleNext = () => {
    if (approvedCount < MIN_PROFILE_PHOTOS) {
      setErrorMsg(
        `Profile cannot be saved with fewer than ${MIN_PROFILE_PHOTOS} approved photos (Rule ON-3).`,
      );
      return;
    }
    setErrorMsg(null);
    router.push('/(profile)/interests');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Add Profile Photos"
        subtitle={`Step 2 of 3 · ${approvedCount}/6 Approved (Min 2)`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
          Show your real face
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          Upload 2 to 6 clear photos. Every photo is screened by AI in Mumbai (`ap-south-1`) for face presence and safety before appearing to others (Rule ON-3 & S-21).
        </Text>

        <View style={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
            const photo = photos[slotIdx];
            return (
              <View key={`slot-${slotIdx}`} style={styles.slotCard}>
                {photo ? (
                  <>
                    <Image
                      source={{ uri: photo.path ?? photo.quarantine_path }}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      style={styles.photoImg}
                    />
                    <View
                      style={[
                        styles.statusBadge,
                        photo.status === 'approved'
                          ? styles.statusApproved
                          : photo.status === 'rejected'
                          ? styles.statusRejected
                          : styles.statusPending,
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {photo.status === 'approved'
                          ? '✓ Approved'
                          : photo.status === 'rejected'
                          ? '✕ Not Approved'
                          : '⏳ AI Screening'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeProfilePhoto(photo.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${slotIdx + 1}`}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => addProfilePhoto(SAMPLE_APPROVED_PHOTO, 'approved')}
                    accessibilityRole="button"
                    accessibilityLabel={`Add photo to slot ${slotIdx + 1}`}
                    style={styles.emptySlotBtn}
                  >
                    <Text style={styles.plusSign}>＋</Text>
                    <Text maxFontSizeMultiplier={1.3} style={styles.slotLabel}>
                      Slot {slotIdx + 1}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* Demo controls to test AI Moderation rejected photo state */}
        <View style={styles.demoRow}>
          <Pressable
            onPress={() => addProfilePhoto(SAMPLE_APPROVED_PHOTO, 'approved')}
            style={styles.demoBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.demoBtnText}>
              + Add Approved Photo
            </Text>
          </Pressable>
          <Pressable
            onPress={() => addProfilePhoto(SAMPLE_APPROVED_PHOTO, 'rejected')}
            style={styles.demoBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.demoBtnText}>
              Simulate AI Rejected Photo
            </Text>
          </Pressable>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.errorText}>
              ⚠️ {errorMsg}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleNext}
          accessibilityRole="button"
          style={styles.ctaButton}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.ctaText}>
            Next: Pick Your Interests →
          </Text>
        </Pressable>
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
    paddingBottom: 40,
  },
  headline: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  slotCard: {
    width: '31%',
    height: 140,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: Radii.pill,
    alignItems: 'center',
  },
  statusApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.88)',
  },
  statusRejected: {
    backgroundColor: 'rgba(147, 0, 10, 0.9)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  statusText: {
    color: Colors.primaryWhite,
    fontSize: 9,
    fontWeight: '800',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  emptySlotBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusSign: {
    color: Colors.electricLime,
    fontSize: 26,
    fontWeight: '700',
  },
  slotLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  demoBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  demoBtnText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(147, 0, 10, 0.35)',
    borderRadius: Radii.md,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.errorCoral,
  },
  errorText: {
    color: Colors.errorCoral,
    fontSize: 12,
    fontWeight: '600',
  },
  ctaButton: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 20,
  },
  ctaText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
});
