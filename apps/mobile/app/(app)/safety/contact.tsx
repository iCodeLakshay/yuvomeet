import { toE164India } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { saveTrustedContact, useTrustedContact, type TrustedContact } from '../../../src/features/safety/api';
import { errorMessage } from '../../../src/lib/errors';
import { Button, colors, Field, Header, Notice, Screen, StatusHero, space } from '../../../src/ui';

/** SF-2, S-50: the trusted contact lives only in this phone's secure storage. */
export default function TrustedContactScreen() {
  const contact = useTrustedContact();
  if (contact.isPending) {
    return (
      <Screen header={<Header title="Trusted contact" />}>
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      </Screen>
    );
  }
  // Seed the form once from what is stored; no effect needed to copy query data into state.
  return <ContactForm initial={contact.data ?? null} />;
}

function ContactForm({ initial }: { initial: TrustedContact | null }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const persist = async (next: TrustedContact | null) => {
    if (busy) return;
    setBusy(true);
    try {
      await saveTrustedContact(next);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const e164 = toE164India(phone);
    if (!name.trim()) return setError('Add a name.');
    if (!e164) return setError('Enter a 10-digit Indian mobile number.');
    setError(null);
    void persist({ name: name.trim(), phone: e164 });
  };

  return (
    <Screen
      header={<Header title="Trusted contact" />}
      footer={
        <>
          <Button label="Save contact" loading={busy} onPress={save} />
          {initial ? <Button label="Remove contact" variant="ghost" size="sm" disabled={busy} onPress={() => void persist(null)} /> : null}
        </>
      }
    >
      <StatusHero
        icon="contact-phone"
        badge="lock"
        title="Someone who's got you"
        body="Share a plan's details with them in one tap, and SOS sends them your location over WhatsApp."
      />
      <View style={styles.form}>
        <Field label="Name" icon="person-outline" value={name} onChangeText={setName} maxLength={40} autoComplete="name" />
        <Field
          label="Mobile number"
          icon="phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={14}
          placeholder="98765 43210"
        />
        {error ? <Notice tone="danger" text={error} /> : null}
        <Notice text="Stored only on this phone. Yuvomeet never uploads it, and it is gone if you uninstall." icon="phonelink-lock" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.md, marginTop: space.xl },
  loading: { marginTop: space.xxxl },
});
