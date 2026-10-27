import { EMERGENCY_HELPLINE } from '@yuvomeet/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlan } from '../../../src/features/plans/api';
import { callEmergency, sendSosLocation, useTrustedContact } from '../../../src/features/safety/api';
import { errorMessage } from '../../../src/lib/errors';
import { Button, gutter, ListRow, Notice, SheetHeader, space } from '../../../src/ui';

/** SF-3, S-51: call 112, or send one GPS fix to the trusted contact via WhatsApp. */
export default function Sos() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const insets = useSafeAreaInsets();
  const plan = usePlan(planId).data;
  const contact = useTrustedContact().data;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      await sendSosLocation(
        {
          id: plan.id!,
          title: plan.title!,
          venueName: plan.venue_name!,
          venueAddress: plan.venue_address!,
          startsAt: plan.starts_at!,
          hostName: plan.host_first_name ?? 'Host',
          venueLat: plan.venue_lat!,
          venueLng: plan.venue_lng!,
        },
        contact ?? null,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.root, { paddingBottom: insets.bottom + space.lg }]}>
      <SheetHeader title="Get help now" subtitle="If you feel unsafe, leave and go somewhere busy first." />
      <Button label={`Call ${EMERGENCY_HELPLINE}`} icon="call" variant="sos" onPress={callEmergency} />
      <Button
        label={contact ? `Send my location to ${contact.name}` : 'Send my location on WhatsApp'}
        icon="share-location"
        variant="secondary"
        loading={busy}
        onPress={send}
      />
      {contact ? null : (
        <ListRow icon="contact-phone" title="Add a trusted contact" subtitle="So SOS goes straight to them" onPress={() => router.push('/safety/contact')} />
      )}
      {error ? <Notice tone="danger" text={error} /> : null}
      <Notice text="Your location goes from your phone to WhatsApp. Yuvomeet only records that SOS was pressed, so moderators can follow up." />
      {plan?.host_id ? (
        <Button
          label="Report someone at this plan"
          variant="ghost"
          size="sm"
          onPress={() => router.push({ pathname: '/report', params: { userId: plan.host_id!, planId, context: 'plan', name: plan.host_first_name ?? '' } })}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ root: { paddingHorizontal: gutter, gap: space.md } });
