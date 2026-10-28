import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/ui';

/** Landing for yuvomeet://auth/callback (Google sign-in, email confirmation links). */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session && code) await supabase.auth.exchangeCodeForSession(code);
      router.replace('/');
    })();
  }, [code]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg } });
