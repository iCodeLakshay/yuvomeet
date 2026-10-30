import { formatRupees, PREMIUM_PRODUCTS, TIER_PERKS, type PaidTier } from '@yuvomeet/shared';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCaps } from '../../src/features/plans/api';
import { useCheckout } from '../../src/features/premium/api';
import { errorMessage } from '../../src/lib/errors';
import { PAYWALL_ENABLED } from '../../src/lib/flags';
import { formatDateLong } from '../../src/lib/format';
import { track } from '../../src/lib/telemetry';
import { Badge, Button, colors, EmptyState, Header, Icon, Notice, Pressable, radii, Screen, space, Text } from '../../src/ui';

const TIERS: { tier: PaidTier; name: string; tagline: string }[] = [
  { tier: 'plus', name: 'Plus', tagline: 'Join and host without weekly limits' },
  { tier: 'premium', name: 'Premium', tagline: 'Get picked first and get seen first' },
];

/** Paywall is switched off (src/lib/flags.ts): anyone who lands here, e.g. from an old notification, goes home. */
export default function PremiumRoute() {
  return PAYWALL_ENABLED ? <Premium /> : <Redirect href="/" />;
}

/** Paywall: Plus / Premium passes paid through Razorpay. Perks are enforced server-side. */
function Premium() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const caps = useCaps().data;
  const checkout = useCheckout();
  const [tier, setTier] = useState<PaidTier>('premium');
  const products = PREMIUM_PRODUCTS.filter((p) => p.tier === tier);
  const [productId, setProductId] = useState(products[0]!.id);
  const product = PREMIUM_PRODUCTS.find((p) => p.id === productId && p.tier === tier) ?? products[0]!;

  useEffect(() => {
    track('paywall_viewed', { source: source ?? 'account' });
  }, [source]);

  if (checkout.data === 'paid') {
    return (
      <Screen header={<Header leading="close" />} footer={<Button label="Start exploring" onPress={() => router.back()} />}>
        <EmptyState
          icon="workspace-premium"
          title={`You're on ${tier === 'premium' ? 'Premium' : 'Plus'}`}
          body="Your pass is active right now. Unlimited joins and hosting are on."
        />
      </Screen>
    );
  }

  const active = caps && caps.entitlement !== 'free';
  const until = caps?.entitlement_until ? formatDateLong(caps.entitlement_until) : null;

  return (
    <Screen
      header={<Header title="Yuvomeet Premium" leading="close" />}
      footer={
        <>
          <Button
            label={`Pay ${formatRupees(product.amountPaise)}`}
            icon="lock"
            loading={checkout.isPending}
            onPress={() => checkout.mutate(product.id)}
          />
          <Text variant="caption" color="textSubtle" align="center">
            Secure checkout by Razorpay · UPI, cards, netbanking · One-time pass, no auto-renewal
          </Text>
        </>
      }
    >
      <View style={styles.hero}>
        <View style={styles.crown}>
          <Icon name="workspace-premium" size={34} color="brand" />
        </View>
        <Text variant="title1" align="center">
          Make every plan count
        </Text>
        <Text variant="body" color="textMuted" align="center">
          More plans, more tables, and hosts see you first.
        </Text>
      </View>

      {active ? (
        <Notice
          tone="success"
          icon="workspace-premium"
          text={`${caps.entitlement === 'premium' ? 'Premium' : 'Plus'} is active${until ? ` until ${until}` : ''}. Buying again adds days to your pass.`}
        />
      ) : null}

      <View style={styles.tiers}>
        {TIERS.map((t) => {
          const on = t.tier === tier;
          return (
            <Pressable
              key={t.tier}
              onPress={() => {
                setTier(t.tier);
                setProductId(PREMIUM_PRODUCTS.find((p) => p.tier === t.tier)!.id);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${t.name}. ${t.tagline}`}
              pressScale={0.98}
              style={[styles.tier, on ? styles.tierOn : null]}
            >
              <View style={styles.tierHead}>
                <Text variant="title3" style={styles.flex}>
                  {t.name}
                </Text>
                {t.tier === 'premium' ? <Badge label="Most picked" tone="accent" /> : null}
                <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={on ? 'brand' : 'textSubtle'} />
              </View>
              <Text variant="small" color="textMuted">
                {t.tagline}
              </Text>
              {on
                ? TIER_PERKS[t.tier].map((perk) => (
                    <View key={perk} style={styles.perk}>
                      <Icon name="check-circle" size={18} color="success" />
                      <Text variant="small" style={styles.flex}>
                        {perk}
                      </Text>
                    </View>
                  ))
                : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.options}>
        {products.map((p) => {
          const on = p.id === product.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setProductId(p.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.label}, ${formatRupees(p.amountPaise)}`}
              pressScale={0.97}
              style={[styles.option, on ? styles.optionOn : null]}
            >
              <Text variant="smallStrong" color="textMuted">
                {p.label}
              </Text>
              <Text variant="title2">{formatRupees(p.amountPaise)}</Text>
              <Text variant="caption" color={p.note ? 'accent' : 'textSubtle'}>
                {p.note ?? `${formatRupees(Math.round(p.amountPaise / (p.days / 30)))}/month`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {checkout.data === 'created' ? <Notice tone="warning" text="Payment not confirmed yet. If money left your account, your pass turns on within a few minutes." /> : null}
      {checkout.data === 'expired' ? <Notice tone="warning" text="That checkout expired. Try again." /> : null}
      {checkout.error ? <Notice tone="danger" text={errorMessage(checkout.error)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  crown: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft, marginBottom: space.sm },
  tiers: { gap: space.md, marginTop: space.lg },
  tier: { gap: space.sm, padding: space.lg, borderRadius: radii.xl, backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.border },
  tierOn: { borderColor: colors.accent, backgroundColor: colors.surface2 },
  tierHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  options: { flexDirection: 'row', gap: space.md, marginTop: space.lg, marginBottom: space.md },
  option: { flex: 1, gap: 2, padding: space.lg, borderRadius: radii.xl, backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.border },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.surface2 },
});
