import { checkText, MAX_BIO_CHARS, MIN_INTERESTS } from '@yuvomeet/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSaveProfile } from '../../../src/features/profile/api';
import { PhotoManager } from '../../../src/features/profile/PhotoManager';
import { areaCell, AreaPicker, CollegePicker, InterestPicker } from '../../../src/features/profile/pickers';
import { useMe } from '../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../src/lib/errors';
import { Button, Field, Header, Notice, Screen, SectionHeader, space } from '../../../src/ui';

/** Edit profile: same pickers as onboarding; text is screened server-side before others see it. */
export default function EditProfile() {
  const me = useMe();
  const save = useSaveProfile();
  const [firstName, setFirstName] = useState(me.first_name);
  const [bio, setBio] = useState(me.bio ?? '');
  const [area, setArea] = useState(me.area_name);
  const [collegeId, setCollegeId] = useState<string | null>(me.college_id);
  const [interests, setInterests] = useState<string[]>(me.interests);
  const [error, setError] = useState<string | null>(null);
  const nameError = checkText(firstName, 'First name', 2, 30);

  const submit = () => {
    const problem = nameError || (bio.trim() ? checkText(bio, 'Bio', 0, MAX_BIO_CHARS) : null) || (interests.length < MIN_INTERESTS ? `Pick at least ${MIN_INTERESTS} interests.` : null);
    setError(problem);
    if (problem) return;
    save.mutate(
      { firstName: firstName.trim(), bio: bio.trim(), area: { name: area, cell: areaCell(area)! }, collegeId, interests },
      { onSuccess: () => router.back(), onError: (e) => setError(errorMessage(e)) },
    );
  };

  return (
    <Screen header={<Header title="Edit profile" />} footer={<Button label="Save changes" loading={save.isPending} onPress={submit} />}>
      <PhotoManager />
      <View style={styles.fields}>
        <Field label="First name" icon="person-outline" value={firstName} onChangeText={setFirstName} maxLength={30} autoCapitalize="words" error={firstName ? nameError : null} />
        <Field label="Bio" value={bio} onChangeText={setBio} multiline maxLength={MAX_BIO_CHARS} counter placeholder="Tech & chai lover. Weekend board games." />
      </View>
      <SectionHeader title="Your area in Kota" small />
      <AreaPicker value={area} onChange={setArea} />
      <CollegePicker cityId={me.city_id} value={collegeId} onChange={setCollegeId} />
      <SectionHeader title="Interests" small />
      <InterestPicker value={interests} onChange={setInterests} />
      {error ? <Notice tone="danger" text={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ fields: { gap: space.md, marginTop: space.xl } });
