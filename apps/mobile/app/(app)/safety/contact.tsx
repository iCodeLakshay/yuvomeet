import { toE164India } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { saveTrustedContact, useTrustedContact } from '../../../src/features/safety/api';
import { Button, Field, Header, Notice, Screen, StatusHero, space } from '../../../src/ui';

/** SF-2, S-50: the trusted contact lives only in this phone's secure storage. */
export default function TrustedContact() {
  const contact = useTrustedContact();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (contact.data) {
      setName(contact.data.name);
      setPhone(contact.data.phone);
    }
  }, [contact.data]);

  const save = async () => {
    const e164 = toE164India(phone);
    if (!name.trim()) return setError('Add a name.');
    if (!e164) return setError('Enter a 10-digit Indian mobile number.');
    setError(null);
    setBusy(true);
    await saveTrustedContact({ name: name.trim(), phone: e164 });
    setBusy(false);
    router.back();
  };

  return (
    <Screen
      header={<Header title="Trusted contact" />}
      footer={
        <>
          <Button label="Save contact" loading={busy} onPress={save} />
          {contact.data ? <Button label="Remove contact" variant="ghost" size="sm" onPress={() => void saveTrustedContact(null).then(() => router.back())} /> : null}
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
