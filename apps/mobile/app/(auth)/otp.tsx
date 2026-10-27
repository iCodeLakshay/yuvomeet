import { OTP_LENGTH, OTP_RESEND_COOLDOWN_SEC } from '@yuvomeet/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Keypad } from '../../src/features/auth/Keypad';
import { OtpCells } from '../../src/features/auth/OtpCells';
import { requestOtp, verifyOtp } from '../../src/features/session/auth';
import { AppError, toAppError } from '../../src/lib/errors';
import { formatTime } from '../../src/lib/format';
import { Button, colors, gutter, Header, Logo, Notice, Pressable, space, Text } from '../../src/ui';

const mask = (phone: string) => `+91 ${phone.slice(3, 5)}•••••${phone.slice(-2)}`;

/** Stitch "OTP Verification". ON-1: 5 wrong codes lock the number for 30 minutes (S-10). */
export default function Otp() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(OTP_RESEND_COOLDOWN_SEC);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const locked = Boolean(lockedUntil && Date.parse(lockedUntil) > Date.now());

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(phone, value);
    } catch (e) {
      const err = toAppError(e);
      setCode('');
      setErrorKey((k) => k + 1);
      if (err instanceof AppError && err.code === 'OTP_LOCKED') {
        setLockedUntil(String(err.details?.locked_until ?? new Date(Date.now() + 30 * 60_000).toISOString()));
      } else {
        const remaining = err.details?.remaining;
        setError(typeof remaining === 'number' ? `That code is not right. ${remaining} tries left.` : err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onKey = (key: string) => {
    if (key === 'del') return setCode((c) => c.slice(0, -1));
    if (code.length >= OTP_LENGTH) return;
    const next = code + key;
    setCode(next);
    if (next.length === OTP_LENGTH) void verify(next);
  };

  const resend = async () => {
    try {
      await requestOtp(phone, true);
      setCooldown(OTP_RESEND_COOLDOWN_SEC);
      setError(null);
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Header center={<Logo size={18} />} />
      <View style={styles.body}>
        <Text variant="title1">{locked ? 'Number locked' : 'Verify code'}</Text>
        <Text variant="body" color="textMuted">
          {locked
            ? `Too many wrong codes. Try again after ${formatTime(lockedUntil!)}.`
            : `Enter the 6-digit code sent to ${mask(phone)}`}
        </Text>
        <OtpCells code={code} length={OTP_LENGTH} errorKey={errorKey} locked={locked} />
        {error ? <Notice tone="danger" text={error} /> : null}
        <View style={styles.resend}>
          <Text variant="small" color="textSubtle">
            Didn't receive code?
          </Text>
          <Pressable onPress={resend} disabled={cooldown > 0 || locked} accessibilityLabel="Resend code">
            <Text variant="smallStrong">{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</Text>
          </Pressable>
        </View>
        <Button
          label="Verify & Continue"
          trailingIcon="arrow-forward"
          loading={busy}
          disabled={locked || code.length !== OTP_LENGTH}
          onPress={() => void verify(code)}
        />
      </View>
      <View style={[styles.keypad, { paddingBottom: insets.bottom + space.md }]}>
        <Keypad onKey={onKey} disabled={busy || locked} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: gutter, gap: space.lg, paddingTop: space.md },
  resend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  keypad: {
    paddingHorizontal: gutter,
    paddingTop: space.lg,
    backgroundColor: colors.bgDeep,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
