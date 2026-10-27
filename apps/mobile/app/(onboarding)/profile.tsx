import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { OnboardingShell } from '../../src/features/onboarding/OnboardingShell';
import { useSaveProfile } from '../../src/features/profile/api';
import { areaCell, AreaPicker, CollegePicker } from '../../src/features/profile/pickers';
import { useMe } from '../../src/features/session/SessionProvider';
import { errorMessage } from '../../src/lib/errors';
import type { Enums } from '../../src/lib/supabase';
import { checkText } from '@yuvomeet/shared';
import { Chip, Field, Icon, Notice, SectionHeader, space, Text } from '../../src/ui';

const GENDERS: { value: Enums<'gender'>; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'other', label: 'Non-binary' },
];

/**
 * Stitch "Let's get to know you". Full name and date of birth from the frame are reduced to
 * first name and nothing: birth year comes only from the ID check (S-39).
 */
export default function ProfileBasics() {
  const me = useMe();
  const save = useSaveProfile();
  const [firstName, setFirstName] = useState<string>();
  const [gender, setGender] = useState<Enums<'gender'> | null>();
  const [area, setArea] = useState<string>();
  const [collegeId, setCollegeId] = useState<string | null>();
  const [error, setError] = useState<string | null>(null);

  const name = firstName ?? me.first_name;
  const chosenGender = gender ?? me.declared_gender;
  const chosenArea = area ?? me.area_name;
  const college = collegeId === undefined ? me.college_id : collegeId;
  const nameError = name ? checkText(name, 'First name', 2, 30) : null;

  const submit = async () => {
    const cell = areaCell(chosenArea);
    if (!cell || !chosenGender) return;
    try {
      await save.mutateAsync({ firstName: name.trim(), gender: chosenGender, area: { name: chosenArea, cell }, collegeId: college });
      router.push('/photos');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <OnboardingShell
      step={1}
      title="Let's get to know you"
      subtitle="This helps people find the right plans and connect with you."
      cta="Continue"
      onCta={submit}
      busy={save.isPending}
      ctaDisabled={!name || Boolean(nameError) || !chosenGender || !chosenArea}
      footerNote={
        <View style={styles.note}>
          <Icon name="lock-outline" size={16} color="textSubtle" />
          <Text variant="caption" color="textSubtle">
            Your age is verified with your ID before your first plan.
          </Text>
        </View>
      }
    >
      <Field
        label="First name"
        icon="person-outline"
        value={name}
        onChangeText={setFirstName}
        onClear={() => setFirstName('')}
        maxLength={30}
        autoCapitalize="words"
        autoComplete="given-name"
        placeholder="Riya"
        error={nameError}
      />

      <SectionHeader title="Gender" small />
      <Text variant="caption" color="textSubtle">
        Confirmed by your ID and selfie. Changes go through support.
      </Text>
      <View style={styles.wrap}>
        {GENDERS.map((g) => (
          <Chip
            key={g.value}
            label={g.label}
            kind="choice"
            selected={chosenGender === g.value}
            onPress={me.declared_gender ? undefined : () => setGender(g.value)}
          />
        ))}
      </View>

      <SectionHeader title="Your area in Kota" small />
      <AreaPicker value={chosenArea} onChange={setArea} />

      <CollegePicker cityId={me.city_id} value={college} onChange={setCollegeId} />
      {error ? <Notice tone="danger" text={error} /> : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center', paddingBottom: space.xs },
});
