import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { normalisePhone, requestOtp } from '../../src/features/session/auth';
import { errorMessage } from '../../src/lib/errors';
import { Button, Field, Header, Notice, Screen, space, Text } from '../../src/ui';

/** ON-1: the number lives only in auth.users.phone (S-5) and is never shown to anyone. */
export default function PhoneEntry() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const e164 = normalisePhone(phone);
      await requestOtp(e164);
      router.push({ pathname: '/otp', params: { phone: e164 } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<Header />} footer={<Button label="Send code" trailingIcon="arrow-forward" onPress={submit} loading={busy} disabled={phone.replace(/\D/g, '').length < 10} />}>
      <View style={styles.body}>
        <Text variant="title1">Enter your mobile number</Text>
        <Text variant="body" color="textMuted">
          We'll text you a 6-digit code. Your number is only for signing in.
        </Text>
        <Field
          label="Mobile number (+91)"
          icon="smartphone"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^\d\s]/g, ''))}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={11}
          placeholder="98765 43210"
          error={error}
          autoFocus
        />
        <Notice text="Your number is never shown to other members or stored outside sign-in." icon="lock-outline" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { gap: space.lg, paddingTop: space.lg } });
