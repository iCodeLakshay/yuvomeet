import { toE164India } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { saveTrustedContact, useTrustedContact, type TrustedContact as Contact } from '../../../src/features/safety/api';
import { errorMessage } from '../../../src/lib/errors';
import { Button, Field, Header, Notice, Screen, StatusHero, space } from '../../../src/ui';

/** SF-2, S-50: the trusted contact lives only in this phone's secure storage. */
export default function TrustedContact() {
  const contact = useTrustedContact();
  // Edits override the stored contact; untouched fields show what is saved.
  const [draftName, setName] = useState<string>();
  const [draftPhone, setPhone] = useState<string>();
  const name = draftName ?? contact.data?.name ?? '';
  const phone = draftPhone ?? contact.data?.phone ?? '';
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const persist = async (next: Contact | null) => {
    setError(null);
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
    void persist({ name: name.trim(), phone: e164 });
  };

  return (
    <Screen
      header={<Header title="Trusted contact" />}
      footer={
        <>
          <Button label="Save contact" loading={busy} onPress={save} />
          {contact.data ? <Button label="Remove contact" variant="ghost" size="sm" disabled={busy} onPress={() => void persist(null)} /> : null}
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
        <Field label="Mobile number" icon="phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={14} placeholder="98765 43210" />
        {error ? <Notice tone="danger" text={error} /> : null}
        <Notice text="Stored only on this phone. Yuvomeet never uploads it, and it is gone if you uninstall." icon="phonelink-lock" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: space.md, marginTop: space.xl } });
