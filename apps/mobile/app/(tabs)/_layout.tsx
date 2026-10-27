import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Slot } from 'expo-router';
import { LiquidGlassDock } from '../../src/components/LiquidGlassDock';
import { Colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Slot />
      <LiquidGlassDock />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
