import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAccountEmail, useDeleteAccount, useExportData, useSendDeletionCode } from '../../src/features/account/api';
import { errorMessage } from '../../src/lib/errors';
import { Button, confirm, Field, Header, Notice, Screen, StatusHero, space } from '../../src/ui';

/** ON-6: deletion takes effect at once, after a code sent to the user's email confirms it's them. */
export default function DeleteAccount() {
  const accountEmail = useAccountEmail().data;
  const send = useSendDeletionCode();
  const remove = useDeleteAccount();
  const exportData = useExportData();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const sentTo = send.data?.sent_to;

  const sendCode = async () => {
    const ok = await confirm({
      title: 'Delete your account?',
      message: "We'll email you a 6-digit code to confirm it's you. Nothing is deleted until you enter it.",
      confirmLabel: 'Send code',
      icon: 'mark-email-read',
      danger: true,
    });
    if (ok) send.mutate(accountEmail ? undefined : email.trim());
  };

  const deleteNow = async () => {
    const ok = await confirm({
      title: 'Delete for good?',
      message: 'Your profile disappears right away and the rest of your data is purged within 30 days.',
      confirmLabel: 'Delete my account',
      icon: 'delete-forever',
      danger: true,
    });
    if (ok) remove.mutate(code);
  };

  const footer = sentTo ? (
    <>
      <Button label="Delete my account" variant="danger" disabled={code.length !== 6} loading={remove.isPending} onPress={deleteNow} />
      <Button label="Send a new code" variant="ghost" size="sm" loading={send.isPending} onPress={sendCode} />
    </>
  ) : (
    <>
      <Button
        label="Email me a code"
        icon="mail-outline"
        variant="danger"
        disabled={!accountEmail && !email.includes('@')}
        loading={send.isPending}
        onPress={sendCode}
      />
      <Button label="Keep my account" variant="ghost" size="sm" onPress={() => router.back()} />
    </>
  );

  return (
    <Screen header={<Header title="Delete account" />} footer={footer}>
      <StatusHero
        icon="delete-forever"
        badge="priority-high"
        badgeColor="danger"
        title="This can't be undone"
        points={[
          { icon: 'person-off', text: 'You are signed out and your profile is hidden right away' },
          { icon: 'event-busy', text: 'Plans you host are cancelled; pending joins are withdrawn' },
          { icon: 'auto-delete', text: 'Photos, messages and the rest of your data are purged within 30 days' },
        ]}
      />
      <View style={styles.gap}>
        {sentTo ? (
          <>
            <Notice tone="info" icon="mark-email-read" text={`We sent a 6-digit code to ${sentTo}. It expires in 10 minutes.`} />
            {send.data?.dev_code ? <Notice tone="warning" text={`Local dev code: ${send.data.dev_code}`} /> : null}
            <Field
              label="Code from your email"
              icon="pin"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              autoFocus
            />
          </>
        ) : (
          <>
            <Button label="Download my data first" icon="download" variant="secondary" loading={exportData.isPending} onPress={() => exportData.mutate()} />
            {accountEmail ? (
              <Notice icon="mail-outline" text={`To confirm, we'll send a code to ${accountEmail}.`} />
            ) : (
              <Field
                label="Your email (for the confirmation code)"
                icon="mail-outline"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            )}
          </>
        )}
        {send.error ? <Notice tone="danger" text={errorMessage(send.error)} /> : null}
        {remove.error ? <Notice tone="danger" text={errorMessage(remove.error)} /> : null}
        {exportData.error ? <Notice tone="danger" text={errorMessage(exportData.error)} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: space.md, marginTop: space.xl } });
