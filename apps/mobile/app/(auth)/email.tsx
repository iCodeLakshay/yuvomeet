import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { signInWithEmail, signUpWithEmail } from '../../src/features/session/auth';
import { errorMessage } from '../../src/lib/errors';
import { Button, Field, Header, Notice, Screen, Segmented, space, Text } from '../../src/ui';

type Mode = 'login' | 'signup';

/** Email + password sign-in and sign-up. Phone and Google are the other routes in. */
export default function EmailAuth() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await signInWithEmail(email, password);
      else if (!(await signUpWithEmail(email, password))) setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen header={<Header />} footer={<Button label="Back to log in" variant="secondary" onPress={() => { setSent(false); setMode('login'); }} />}>
        <View style={styles.body}>
          <Text variant="title1">Check your inbox</Text>
          <Text variant="body" color="textMuted">
            We sent a confirmation link to {email.trim()}. Open it on this phone to finish creating your account.
          </Text>
        </View>
      </Screen>
    );
  }

  const valid = email.includes('@') && password.length >= (mode === 'signup' ? 8 : 1);
  return (
    <Screen
      header={<Header />}
      footer={
        <>
          <Button label={mode === 'login' ? 'Log in' : 'Create account'} trailingIcon="arrow-forward" onPress={submit} loading={busy} disabled={!valid} />
          <Button label="Use my phone number instead" variant="ghost" size="sm" onPress={() => router.replace('/phone')} />
        </>
      }
    >
      <View style={styles.body}>
        <Text variant="title1">{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          items={[
            { value: 'login', label: 'Log in' },
            { value: 'signup', label: 'Sign up' },
          ]}
        />
        <Field
          label="Email"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus
        />
        <Field
          label={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
          icon="lock-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          error={error}
          onSubmitEditing={valid ? submit : undefined}
        />
        {mode === 'signup' ? <Notice icon="lock-outline" text="Your email is only for signing in. Other members never see it." /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { gap: space.lg, paddingTop: space.lg } });
