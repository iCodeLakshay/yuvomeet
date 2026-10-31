import { KOTA_AREAS } from '@yuvomeet/shared';
import { memo, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Field, Sheet, space } from '../../ui';
import { setPlaceOverride, useAskLocation } from './api';

export interface PlacePickerProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet that lets the user pick a Kota area or revert to GPS.
 * Mirrors the AreaPicker pattern used on Edit Profile:
 *   – named Kota area chips
 *   – "Other" chip that reveals a free-text field
 *   – "Use current location" reverts to GPS and re-requests permission if needed
 *
 * The choice is persisted to MMKV via setPlaceOverride and reflected on
 * the Discover header immediately. No coordinates are stored or sent to the server.
 */
export const PlacePicker = memo(function PlacePicker({ visible, onClose }: PlacePickerProps) {
  const askLocation = useAskLocation();
  const [customText, setCustomText] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Reset transient UI state when the sheet is dismissed.
  useEffect(() => {
    if (!visible) {
      setCustomText('');
      setShowCustom(false);
    }
  }, [visible]);

  function handleGps() {
    setPlaceOverride(null);
    // Re-request permission if not yet granted, then refresh the query.
    askLocation.mutate();
    onClose();
  }

  function handleArea(name: string) {
    setPlaceOverride({ label: name, city: 'Kota' });
    onClose();
  }

  function handleCustom() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    setPlaceOverride({ label: trimmed, city: 'Kota' });
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Browse by area"
      subtitle="Pick an area in Kota or use your GPS location"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Button
          label="Use current location"
          icon="near-me"
          variant="secondary"
          onPress={handleGps}
          loading={askLocation.isPending}
        />

        <View style={styles.chips}>
          {KOTA_AREAS.map((a) => (
            <Chip key={a.name} label={a.name} onPress={() => handleArea(a.name)} />
          ))}
          <Chip
            label="Other"
            selected={showCustom}
            onPress={() => setShowCustom((prev) => !prev)}
          />
        </View>

        {showCustom ? (
          <View style={styles.customArea}>
            <Field
              label="Your area"
              icon="location-on"
              value={customText}
              onChangeText={setCustomText}
              maxLength={40}
              autoCapitalize="words"
              placeholder="Indra Vihar"
            />
            <Button
              label="Use this area"
              onPress={handleCustom}
              disabled={!customText.trim()}
            />
          </View>
        ) : null}
      </ScrollView>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  content: { gap: space.lg, paddingBottom: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  customArea: { gap: space.md },
});
