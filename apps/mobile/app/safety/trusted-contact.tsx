/**
 * Route: `safety/trusted-contact`
 * Closes SF-2 & S-50:
 * - Trusted contact name & phone number are stored ONLY on-device in `expo-secure-store`.
 * - The server NEVER receives this contact's name or number.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function TrustedContactScreen() {
  const { trustedContact, saveTrustedContact, removeTrustedContact } = useYuvomeet();
  const [name, setName] = useState(trustedContact?.name ?? 'Didi / Mom');
  const [phone, setPhone] = useState(trustedContact?.phone ?? '9876500001');
  const [relationship, setRelationship] = useState(trustedContact?.relationship ?? 'Sister');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = async () => {
    await saveTrustedContact({
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim(),
      updatedAt: new Date().toISOString(),
    });
    setSavedNotice(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Trusted Contact"
        subtitle="SF-2 & S-50 · On-Device Encrypted Only"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.privacyBanner}>
          <Text maxFontSizeMultiplier={1.3} style={styles.privacyBannerText}>
            🔒 Rule S-50: Your trusted contact is saved strictly inside `expo-secure-store` on your Android phone. Yuvomeet servers never receive their name or phone number.
          </Text>
        </View>

        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          CONTACT NAME
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="e.g., Mom, Sister, Hostel Warden"
          placeholderTextColor={Colors.textMuted}
        />

        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          WHATSAPP / MOBILE NUMBER (+91)
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={10}
          style={styles.input}
          placeholder="10-digit mobile number"
          placeholderTextColor={Colors.textMuted}
        />

        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          RELATIONSHIP
        </Text>
        <TextInput
          value={relationship}
          onChangeText={setRelationship}
          style={styles.input}
          placeholder="e.g., Sister, Roommate, Parent"
          placeholderTextColor={Colors.textMuted}
        />

        {savedNotice ? (
          <View style={styles.savedBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.savedText}>
              ✓ Saved to on-device SecureStore! One-tap WhatsApp Plan Share & SOS will use this contact.
            </Text>
          </View>
        ) : null}

        <Pressable onPress={handleSave} style={styles.saveBtn}>
          <Text maxFontSizeMultiplier={1.3} style={styles.saveBtnText}>
            Save Trusted Contact on Device
          </Text>
        </Pressable>

        {trustedContact ? (
          <Pressable
            onPress={() => {
              removeTrustedContact();
              setSavedNotice(false);
            }}
            style={styles.clearBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.clearBtnText}>
              Remove Trusted Contact from Device
            </Text>
          </Pressable>
        ) : null}
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
  privacyBanner: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
    marginBottom: 16,
  },
  privacyBannerText: {
    color: Colors.trustEmerald,
    fontSize: 12,
    lineHeight: 18,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.primaryWhite,
    fontSize: 15,
  },
  savedBox: {
    backgroundColor: Colors.trustEmeraldBg,
    borderRadius: Radii.md,
    padding: 12,
    marginTop: 16,
  },
  savedText: {
    color: Colors.trustEmerald,
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  saveBtnText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
  clearBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  clearBtnText: {
    color: Colors.errorCoral,
    fontSize: 13,
    fontWeight: '600',
  },
});
