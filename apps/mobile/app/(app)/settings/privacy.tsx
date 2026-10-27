import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useExportData } from '../../../src/features/account/api';
import { ConsentToggles, type ConsentChoices } from '../../../src/features/profile/ConsentToggles';
import { recordConsents, useConsents } from '../../../src/features/profile/api';
import { useMe } from '../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../src/lib/errors';
import { Button, Header, ListRow, Notice, Screen, SectionHeader, space, Text } from '../../../src/ui';

/** C-4: change any consent at any time (append-only rows); ON-6: export and delete. */
export default function Privacy() {
  const me = useMe();
  const consents = useConsents();
  const exportData = useExportData();
  const value: ConsentChoices = {
    camera: Boolean(consents.data?.camera),
    location: Boolean(consents.data?.location),
    notifications: Boolean(consents.data?.notifications),
  };

  return (
    <Screen header={<Header title="Privacy and data" />}>
      <Text variant="body" color="textMuted" style={styles.intro}>
        Turning a purpose off stops Yuvomeet from asking for it. Android permissions can also be revoked in system settings.
      </Text>
      <View style={styles.list}>
        <ConsentToggles value={value} onChange={(key, granted) => void recordConsents(me.id, { [key]: granted })} />
      </View>

      <SectionHeader title="Your data" small />
      <Button label="Download my data" icon="download" variant="secondary" loading={exportData.isPending} onPress={() => exportData.mutate()} />
      {exportData.error ? <Notice tone="danger" text={errorMessage(exportData.error)} /> : null}
      <Notice text="You get a JSON file with your profile, plans, messages and consents. The download link works for 24 hours." />
      <ListRow icon="delete-forever" title="Delete account" destructive onPress={() => router.push('/delete-account')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: space.md },
  list: { gap: space.md, marginTop: space.lg },
});
