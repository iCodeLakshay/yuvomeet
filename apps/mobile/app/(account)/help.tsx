import { EMERGENCY_HELPLINE } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { callEmergency } from '../../src/features/safety/api';
import { env } from '../../src/lib/env';
import { Card, Header, Icon, ListRow, Screen, SectionHeader, space, Text, type IconName } from '../../src/ui';

const RULES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'verified-user', title: 'Verified adults only', body: 'Everyone passes an 18+ ID and selfie check before joining or hosting.' },
  { icon: 'storefront', title: 'Public venues only', body: 'Plans happen at approved cafés and public spots, never homes or private places.' },
  { icon: 'groups', title: 'Groups, not dates', body: 'Plans are for 3 to 10 people. No one-on-one meetups through Yuvomeet.' },
  { icon: 'do-not-disturb-on', title: 'Respect, always', body: 'No harassment, pressure or unwanted contact. One severe report is enough for us to act.' },
  { icon: 'phonelink-lock', title: 'Keep details private', body: "Don't share phone numbers, socials or payment details before you've met." },
  { icon: 'schedule', title: 'Daylight by default', body: 'Plans end by 9 PM unless the venue is a checked late-evening partner.' },
];

/** Community rules (ON-4), safety help and support contact. */
export default function Help() {
  return (
    <Screen header={<Header title="Help & safety" />}>
      <Card style={styles.sos}>
        <ListRow icon="call" iconColor="danger" title={`Emergency: call ${EMERGENCY_HELPLINE}`} subtitle="Police, ambulance and women's helpline" onPress={callEmergency} />
      </Card>
      <SectionHeader title="Community rules" small />
      <View style={styles.rules}>
        {RULES.map((r) => (
          <View key={r.title} style={styles.rule}>
            <Icon name={r.icon} size={22} color="accent" />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{r.title}</Text>
              <Text variant="small" color="textMuted">
                {r.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <SectionHeader title="Support" small />
      <ListRow icon="mail-outline" title="Email support" subtitle={`${env.supportEmail} · replies within 24 hours`} onPress={() => Linking.openURL(`mailto:${env.supportEmail}`)} />
      <ListRow icon="gavel" title="Appeal a decision" onPress={() => router.push('/appeal')} />
      <ListRow icon="policy" title="Privacy policy" onPress={() => Linking.openURL(`${env.siteUrl}/privacy`)} />
      <ListRow icon="description" title="Terms of use" onPress={() => Linking.openURL(`${env.siteUrl}/terms`)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sos: { marginTop: space.md, paddingVertical: space.xs },
  rules: { gap: space.lg, marginTop: space.md },
  rule: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1, gap: 2 },
});
