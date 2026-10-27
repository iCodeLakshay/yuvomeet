import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Header, Screen, space, StepProgress, Text } from '../../ui';

export interface OnboardingShellProps {
  step?: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  cta: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  busy?: boolean;
  footerNote?: ReactNode;
  back?: boolean;
}

export const ONBOARDING_STEPS = 4;

/** Stitch onboarding frame: back arrow, amber step dashes, large title, sticky Continue. */
export const OnboardingShell = memo(function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  cta,
  onCta,
  ctaDisabled,
  busy,
  footerNote,
  back = true,
}: OnboardingShellProps) {
  return (
    <Screen
      header={
        <Header
          leading={back ? 'back' : 'none'}
          center={step ? <StepProgress step={step} total={ONBOARDING_STEPS} /> : undefined}
        />
      }
      footer={
        <>
          {footerNote}
          <Button label={cta} onPress={onCta} disabled={ctaDisabled} loading={busy} />
        </>
      }
    >
      <View style={styles.head}>
        <Text variant="title1">{title}</Text>
        {subtitle ? (
          <Text variant="body" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </Screen>
  );
});

const styles = StyleSheet.create({
  head: { gap: space.sm, paddingTop: space.md, paddingBottom: space.xxl },
  body: { gap: space.md },
});
