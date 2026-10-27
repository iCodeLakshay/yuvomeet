import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { OnboardingShell } from '../../src/features/onboarding/OnboardingShell';
import { acceptRules, completeProfile, useMyPhotos } from '../../src/features/profile/api';
import { useMe } from '../../src/features/session/SessionProvider';
import { errorMessage } from '../../src/lib/errors';
import { Card, colors, Icon, Notice, Pressable, radii, space, Text, type IconName } from '../../src/ui';

const RULES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'verified-user', title: '18+ verified adults only', body: 'Everyone passes an ID and selfie check. Under-18 accounts are blocked permanently.' },
  { icon: 'storefront', title: 'Approved public venues only', body: 'Plans happen at listed cafés and public spots, never homes or private rooms, and end by 9 PM.' },
  { icon: 'shield', title: 'Group first, zero creep', body: 'No harassment, no pressure. Phone numbers and social handles are blocked in chat.' },
  { icon: 'flag', title: 'Report anything off', body: 'Report or block from any profile, plan or message. Safety tools are always free.' },
];

/** ON-4: one-screen summary and tick box, recorded with the policy version (C-3). */
export default function Rules() {
  const me = useMe();
  const photos = useMyPhotos();
  const [agreed, setAgreed] = useState(Boolean(me.rules_accepted_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!me.rules_accepted_at) await acceptRules();
      const approved = (photos.data ?? []).filter((p) => p.status === 'approved').length;
      await completeProfile(approved, me.interests.length);
      // SessionProvider moves the user into the app once the profile is active.
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={4}
      title="Community rules"
      subtitle="Yuvomeet is for friendly group plans in public places."
      cta="Finish and explore Kota"
      onCta={finish}
      busy={busy}
      ctaDisabled={!agreed}
    >
      {RULES.map((r) => (
        <Card key={r.title}>
          <View style={styles.rule}>
            <Icon name={r.icon} size={24} color="accent" />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{r.title}</Text>
              <Text variant="small" color="textMuted">
                {r.body}
              </Text>
            </View>
          </View>
        </Card>
      ))}
      <Pressable
        onPress={() => setAgreed((a) => !a)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel="I agree to the community rules and safety policy"
        style={styles.check}
      >
        <View style={[styles.box, agreed ? styles.boxOn : null]}>{agreed ? <Icon name="check" size={18} color="onPrimary" /> : null}</View>
        <Text variant="bodyStrong" style={styles.flex}>
          I agree to the community rules and safety policy
        </Text>
      </Pressable>
      {error ? <Notice tone="danger" text={error} /> : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  rule: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1, gap: 2 },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 },
  box: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.textSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
