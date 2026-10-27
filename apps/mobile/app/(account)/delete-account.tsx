import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDeleteAccount, useExportData } from '../../src/features/account/api';
import { errorMessage } from '../../src/lib/errors';
import { Button, Field, Header, Notice, Screen, StatusHero, space } from '../../src/ui';

const CONFIRM = 'DELETE';

/** ON-6: deletion takes effect at once; safety records are kept as the policy says. */
export default function DeleteAccount() {
  const remove = useDeleteAccount();
  const exportData = useExportData();
  const [typed, setTyped] = useState('');

  return (
    <Screen
      header={<Header title="Delete account" />}
      footer={
        <>
          <Button
            label="Delete my account"
            variant="danger"
            disabled={typed.trim().toUpperCase() !== CONFIRM}
            loading={remove.isPending}
            onPress={() => remove.mutate()}
          />
          <Button label="Keep my account" variant="ghost" size="sm" onPress={() => router.back()} />
        </>
      }
    >
      <StatusHero
        icon="delete-forever"
        badge="priority-high"
        badgeColor="danger"
        title="This can't be undone"
        points={[
          { icon: 'person-off', text: 'You are signed out and your profile is hidden right away' },
          { icon: 'event-busy', text: 'Plans you host are cancelled and members are told; pending joins are withdrawn' },
          { icon: 'auto-delete', text: 'Photos, messages and the rest of your data are purged within 30 days' },
          { icon: 'shield', text: 'Reports and safety decisions about the account are kept, as the privacy policy explains' },
        ]}
      />
      <View style={styles.gap}>
        <Button label="Download my data first" icon="download" variant="secondary" loading={exportData.isPending} onPress={() => exportData.mutate()} />
        <Field label={`Type ${CONFIRM} to confirm`} value={typed} onChangeText={setTyped} autoCapitalize="characters" />
        {remove.error ? <Notice tone="danger" text={errorMessage(remove.error)} /> : null}
        {exportData.error ? <Notice tone="danger" text={errorMessage(exportData.error)} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: space.md, marginTop: space.xl } });
