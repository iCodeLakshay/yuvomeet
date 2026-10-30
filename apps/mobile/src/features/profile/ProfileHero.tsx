import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Badge, colors, Icon, radii, space, Text, type ColorToken, type IconName } from '../../ui';
import { useLookups } from './api';

export interface ProfileSummary {
  first_name: string | null;
  /** Years, from the birth year the member gave at sign-up (replaced by the ID value once verified). */
  age: number | null;
  college_name: string | null;
  bio: string | null;
  is_verified: boolean | null;
  photo_paths: string[] | null;
  interests: string[] | null;
  plans_hosted: number | null;
  plans_attended: number | null;
  show_up_rate: number | null;
}

interface Stat {
  value: string;
  label: string;
  color?: ColorToken;
}

const StatBar = memo(function StatBar({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.stats}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.stat, i ? styles.statDivider : null]} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
          <Text variant="title3" color={s.color ?? 'text'}>
            {s.value}
          </Text>
          <Text variant="caption" color="textSubtle">
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
});

/**
 * Stitch "Public Member Profile" header: photo, name, age band and college, bio, stats and
 * interests. Shared by the member profile and the Account tab (S-18: only public fields).
 */
export const ProfileHero = memo(function ProfileHero({ profile, mine = [] }: { profile: ProfileSummary; mine?: readonly string[] }) {
  const lookups = useLookups();
  const interests = useMemo(() => {
    const map = new Map((lookups.data?.interests ?? []).map((i) => [i.slug, i]));
    return (profile.interests ?? []).map((slug) => ({ slug, label: map.get(slug)?.label ?? slug, icon: (map.get(slug)?.icon ?? 'star') as IconName }));
  }, [lookups.data, profile.interests]);
  const common = mine.length ? interests.filter((i) => mine.includes(i.slug)).length : 0;
  const showUp = profile.show_up_rate == null ? '—' : `${profile.show_up_rate}%`;

  return (
    <View style={styles.wrap}>
      <Avatar path={profile.photo_paths?.[0]} name={profile.first_name} size={120} verified={Boolean(profile.is_verified)} ring />
      <View style={styles.names}>
        <Text variant="title1" align="center">
          {profile.first_name}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {[profile.age ? `Age ${profile.age}` : null, profile.college_name].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {profile.bio ? (
        <Text variant="body" color="textMuted" align="center">
          {profile.bio}
        </Text>
      ) : null}
      <StatBar
        stats={[
          { value: String(profile.plans_hosted ?? 0), label: 'Meets hosted' },
          { value: String(profile.plans_attended ?? 0), label: 'Attended' },
          { value: showUp, label: 'Show-up', color: profile.show_up_rate != null && profile.show_up_rate >= 90 ? 'success' : 'text' },
        ]}
      />
      {interests.length ? (
        <View style={styles.interests}>
          <View style={styles.interestHead}>
            <Icon name="loyalty" size={28} color="brand" />
            <Text variant="bodyStrong" color="textMuted" style={styles.flex}>
              {mine.length ? 'Interests' : 'Your interests'}
            </Text>
            {common ? <Badge label={`${common} in common`} /> : null}
          </View>
          <View style={styles.chips}>
            {interests.map((i) => {
              const shared = mine.includes(i.slug);
              return (
                <View key={i.slug} style={[styles.chip, shared ? styles.chipShared : null]}>
                  <Icon name={i.icon} size={20} color={shared ? 'brand' : 'textMuted'} />
                  <Text variant="smallStrong" color={shared ? 'text' : 'textMuted'}>
                    {i.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.lg, paddingTop: space.lg },
  names: { gap: space.xs },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    paddingVertical: space.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  interests: { alignSelf: 'stretch', gap: space.md },
  interestHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipShared: { borderColor: 'rgba(234, 179, 8, 0.4)', backgroundColor: colors.accentSoft },
});
