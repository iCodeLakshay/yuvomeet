import { MAX_APPEAL_CHARS, MIN_APPEAL_CHARS } from '@yuvomeet/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSubmitAppeal } from '../../src/features/account/api';
import { useMe } from '../../src/features/session/SessionProvider';
import { errorMessage } from '../../src/lib/errors';
import type { Enums } from '../../src/lib/supabase';
import { Button, EmptyState, Field, Header, Notice, Screen, space, Text } from '../../src/ui';

const COPY: Record<Enums<'appeal_subject'>, string> = {
  verification: 'Tell us why you think the verification result is wrong.',
  suspension: 'Tell us what happened. A person reviews every appeal.',
  ban: 'Tell us what happened. A person reviews every appeal.',
  content: 'Tell us why this content should be restored.',
};

/** VR-6: one open appeal per decision; a person answers within 48 hours. */
export default function Appeal() {
  const me = useMe();
  const params = useLocalSearchParams<{ subject?: Enums<'appeal_subject'>; subjectId?: string }>();
  const subject = params.subject ?? (me.status === 'banned' ? 'ban' : me.status === 'suspended' ? 'suspension' : 'verification');
  const submit = useSubmitAppeal();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (submit.isSuccess) {
    return (
      <Screen header={<Header leading="close" />}>
        <EmptyState icon="gavel" title="Appeal sent" body="A person will review it within 48 hours. You'll get a notification with the decision." actionLabel="Done" onAction={() => router.back()} />
      </Screen>
    );
  }

  const send = () => {
    if (message.trim().length < MIN_APPEAL_CHARS) return setError(`Write at least ${MIN_APPEAL_CHARS} characters.`);
    setError(null);
    submit.mutate({ subject, subjectId: params.subjectId ?? me.id, message: message.trim() }, { onError: (e) => setError(errorMessage(e)) });
  };

  return (
    <Screen header={<Header title="Appeal a decision" />} footer={<Button label="Send appeal" loading={submit.isPending} onPress={send} />}>
      <Text variant="body" color="textMuted" style={{ marginVertical: space.lg }}>
        {COPY[subject]}
      </Text>
      <Field label="Your appeal" value={message} onChangeText={setMessage} multiline maxLength={MAX_APPEAL_CHARS} counter error={error} />
      <Notice text="Don't include ID numbers or photos of documents. If we need more, a moderator will ask." />
    </Screen>
  );
}
