import { router, useLocalSearchParams } from 'expo-router';
import { useSession } from '../../src/features/session/SessionProvider';
import { Button, EmptyState, Header, Screen } from '../../src/ui';

/** ON-2: non-live city saved to the waitlist. */
export default function Waitlist() {
  const { city } = useLocalSearchParams<{ city: string }>();
  const { signOut } = useSession();
  return (
    <Screen
      header={<Header />}
      footer={
        <>
          <Button label="Pick another city" variant="secondary" onPress={() => router.back()} />
          <Button label="Sign out" variant="ghost" onPress={signOut} />
        </>
      }
    >
      <EmptyState
        icon="how-to-reg"
        title={`You're on the ${city} waitlist`}
        body={`Kota is our first live city. We'll notify you the day ${city} opens.`}
      />
    </Screen>
  );
}
