import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { selectCity, useCities } from '../../src/features/profile/api';
import { errorMessage } from '../../src/lib/errors';
import { Badge, Button, colors, Header, Icon, Notice, Screen, SectionHeader, space, Text } from '../../src/ui';

/**
 * Stitch "Location & City Waitlist". City is picked by hand: location is only ever used for
 * check-in and SOS (privacy §1), so the "Allow location" block becomes a plain heading.
 */
export default function CityPicker() {
  const cities = useCities();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (id: string, name: string) => {
    setBusyId(id);
    setError(null);
    try {
      const status = await selectCity(id);
      if (status === 'waitlist') router.push({ pathname: '/waitlist', params: { city: name } });
      else router.replace('/profile');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen header={<Header leading="none" center={<Text variant="title3">Yuvomeet</Text>} />}>
      <View style={styles.hero}>
        <View style={styles.pin}>
          <Icon name="location-on" size={26} />
        </View>
        <Text variant="title1" align="center">
          Choose your city
        </Text>
        <Text variant="body" color="textMuted" align="center">
          Plans are local. Kota is live; other cities open from the waitlist.
        </Text>
      </View>

      <SectionHeader title="Campus cities" meta="Live & upcoming" small />
      {cities.isLoading ? <ActivityIndicator color={colors.text} style={styles.loading} /> : null}
      {error ? <Notice tone="danger" text={error} /> : null}
      <View style={styles.list}>
        {(cities.data ?? []).map((city) => {
          const live = city.status !== 'waitlist';
          return (
            <View key={city.id} style={styles.row}>
              <View style={styles.name}>
                <Text variant="title3">{city.name}</Text>
                <Badge label={live ? 'Active' : 'Soon'} tone={live ? 'success' : 'neutral'} />
              </View>
              <Button
                label={live ? 'Join' : 'Join waitlist'}
                size="sm"
                fill={false}
                variant={live ? 'primary' : 'secondary'}
                loading={busyId === city.id}
                onPress={() => choose(city.id, city.name)}
                accessibilityLabel={`${live ? 'Join' : 'Join waitlist for'} ${city.name}`}
              />
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  pin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loading: { marginTop: space.xl },
  list: { gap: space.xs, marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  name: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
