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
 * Stitch "Let's get to know you". Full name is reduced to first name, and the date of birth to an
 * age in years. The age is self-declared here; the ID check (S-39) replaces it with the verified value.
 */
export default function ProfileBasics() {
  const me = useMe();
  const save = useSaveProfile();
  const [firstName, setFirstName] = useState<string>();
  const [ageText, setAgeText] = useState<string>();
  const [gender, setGender] = useState<Enums<'gender'> | null>();
  const [area, setArea] = useState<string>();
  const [collegeId, setCollegeId] = useState<string | null>();
  const [collegeName, setCollegeName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const name = firstName ?? me.first_name;
  const chosenGender = gender ?? me.declared_gender;
  const chosenArea = area ?? me.area_name;
  const college = collegeId === undefined ? me.college_id : collegeId;
  const nameError = name ? checkText(name, 'First name', 2, 30) : null;
  // Pre-filled when they come back to this step; the ID check replaces it with the verified value later.
  const age = Number(ageText ?? (me.birth_year ? new Date().getFullYear() - me.birth_year : ''));
  const ageValid = Number.isInteger(age) && age >= 18 && age <= 99;
  const ageShown = ageText ?? (me.birth_year ? String(new Date().getFullYear() - me.birth_year) : '');
  const ageError = ageShown && !ageValid ? (age < 18 ? 'Yuvomeet is for members 18 and older.' : 'Enter your age in years.') : null;

  const typedCollege = collegeName.trim();
  const areaError = chosenArea ? checkText(chosenArea, 'Area', 2, 40) : null;
  const collegeError = typedCollege ? checkText(typedCollege, 'College', 2, 80) : null;

  const submit = async () => {
    const cell = areaCell(chosenArea);
    if (!cell || !chosenGender || !ageValid || areaError || collegeError) return;
    try {
      await save.mutateAsync({
        firstName: name.trim(),
        age,
        gender: chosenGender,
        area: { name: chosenArea.trim(), cell },
        collegeId: typedCollege ? null : college,
        collegeName: typedCollege,
      });
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
      ctaDisabled={!name || Boolean(nameError) || !ageValid || !chosenGender || !chosenArea || Boolean(areaError) || Boolean(collegeError)}
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

      <Field
        label="Age"
        icon="calendar-today"
        value={ageShown}
        onChangeText={(t) => setAgeText(t.replace(/\D/g, '').slice(0, 2))}
        keyboardType="number-pad"
        maxLength={2}
        placeholder="21"
        error={ageError}
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
      <AreaPicker value={chosenArea} onChange={setArea} error={chosenArea ? areaError : null} />

      <CollegePicker
        cityId={me.city_id}
        value={college}
        custom={collegeName}
        onChange={setCollegeId}
        onCustom={setCollegeName}
        error={collegeError}
      />
      {error ? <Notice tone="danger" text={error} /> : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center', paddingBottom: space.xs },
});
