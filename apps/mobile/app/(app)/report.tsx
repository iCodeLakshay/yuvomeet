import { EMERGENCY_HELPLINE, MAX_REPORT_DETAILS_CHARS, REPORT_REASONS, getReportSeverity, type ReportReason } from '@yuvomeet/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePublicProfile } from '../../src/features/profile/api';
import { callEmergency, useReport } from '../../src/features/safety/api';
import { errorMessage } from '../../src/lib/errors';
import { Avatar, Badge, Button, Card, colors, EmptyState, Field, gutter, Notice, radii, RadioRow, SectionHeader, SheetHeader, space, Text, Toggle, type IconName } from '../../src/ui';

type Params = { userId: string; planId?: string; messageId?: string; context?: 'profile' | 'plan' | 'message'; name?: string };

/** Stitch "Report & Block" drawer (CH-4, VR-5). Never limited by plan or entitlement (S-30). */
export default function ReportSheet() {
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const profile = usePublicProfile(params.userId).data;
  const report = useReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const name = profile?.first_name ?? params.name ?? 'this member';

  if (report.isSuccess) {
    return (
      <View style={[styles.root, { paddingBottom: insets.bottom + space.lg }]}>
        <EmptyState
          icon="verified-user"
          title="Report received"
          body={`A moderator reviews ${reason && getReportSeverity(reason) === 'severe' ? 'severe reports within 1 hour' : 'reports within 24 hours'}. ${alsoBlock ? `${name} can no longer see you.` : ''}`}
        />
        <Button label="Done" onPress={() => router.back()} />
      </View>
    );
  }

  const submit = () => {
    if (!reason) return setError('Pick a reason.');
    if (reason === 'other' && details.trim().length < 5) return setError('Tell us a little about what happened.');
    setError(null);
    report.mutate(
      {
        targetUserId: params.userId,
        reason,
        details: details.trim(),
        planId: params.planId || undefined,
        messageId: params.messageId || undefined,
        context: params.context ?? 'profile',
        alsoBlock,
      },
      { onError: (e) => setError(errorMessage(e)) },
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.root, { paddingBottom: insets.bottom + space.lg }]} keyboardShouldPersistTaps="handled">
      <SheetHeader title={alsoBlock ? 'Report & Block' : 'Report'} subtitle="Select an issue to help keep the community safe" />
      <Card style={styles.person}>
        <Avatar path={profile?.photo_paths?.[0]} name={name} size={48} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">
            {name}
            {profile?.age_band ? <Text variant="body" color="textSubtle">{`  · ${profile.age_band}`}</Text> : null}
          </Text>
          {profile?.college_name ? (
            <Text variant="caption" color="textSubtle">
              {profile.college_name}
            </Text>
          ) : null}
        </View>
        <Badge label={params.context === 'message' ? 'Message' : 'Selected'} />
      </Card>

      <SectionHeader title="Reason for report" small meta="Required" />
      <View style={styles.list}>
        {REPORT_REASONS.map((r) => (
          <RadioRow key={r.value} label={r.label} icon={r.icon as IconName} selected={reason === r.value} onPress={() => setReason(r.value)} />
        ))}
      </View>
      {reason && getReportSeverity(reason) === 'severe' ? (
        <View style={styles.emergency}>
          <Notice tone="danger" text={`If you are in danger right now, call ${EMERGENCY_HELPLINE}.`} />
          <Button label={`Call ${EMERGENCY_HELPLINE}`} icon="call" variant="sos" size="md" onPress={callEmergency} />
        </View>
      ) : null}
      <Field
        label="What happened? (optional)"
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={MAX_REPORT_DETAILS_CHARS}
        counter
      />

      <SectionHeader title="Enforcement" small />
      <Card style={styles.toggles}>
        <Toggle label={`Block ${name}`} description="They won't see your plans, profile or messages, and you won't see theirs." value={alsoBlock} onChange={setAlsoBlock} />
      </Card>
      {error ? <Notice tone="danger" text={error} /> : null}
      <Button label={alsoBlock ? 'Submit Report & Block' : 'Submit Report'} trailingIcon="arrow-forward" loading={report.isPending} onPress={submit} />
      <Button label="Cancel" variant="ghost" size="sm" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: gutter, gap: space.md },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radii.lg },
  flex: { flex: 1 },
  list: { gap: space.sm },
  emergency: { gap: space.sm },
  toggles: { backgroundColor: colors.surface2 },
});
