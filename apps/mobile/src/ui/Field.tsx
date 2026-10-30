import { forwardRef, memo } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, fonts, radii, space, type ColorToken } from './theme';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: IconName;
  error?: string | null;
  /** Show a character counter against maxLength. */
  counter?: boolean;
  onClear?: () => void;
  /** Renders as a tappable row (pickers) instead of a text input. */
  onPress?: () => void;
  trailingIcon?: IconName;
  trailingColor?: ColorToken;
}

/** Stitch onboarding field: icon, small label above the value, rounded surface card. */
export const Field = memo(
  forwardRef<TextInput, FieldProps>(function Field(
    { label, icon, error, counter, onClear, onPress, trailingIcon, trailingColor = 'textMuted', value, maxLength, multiline, ...rest },
    ref,
  ) {
    const body = (
      <View style={[styles.box, multiline ? styles.multi : null, error ? styles.errorBox : null]}>
        {icon ? <Icon name={icon} size={19} color="textMuted" /> : null}
        <View style={styles.flex}>
          <Text variant="caption" color="textSubtle">
            {label}
          </Text>
          {onPress ? (
            <Text variant="bodyStrong" color={value ? 'text' : 'textSubtle'} numberOfLines={1}>
              {value || rest.placeholder}
            </Text>
          ) : (
            <TextInput
              ref={ref}
              value={value}
              maxLength={maxLength}
              multiline={multiline}
              placeholderTextColor={colors.textSubtle}
              selectionColor={colors.accent}
              cursorColor={colors.accent}
              accessibilityLabel={label}
              style={[styles.input, multiline ? styles.inputMulti : null]}
              {...rest}
            />
          )}
        </View>
        {onClear && value ? (
          <Pressable onPress={onClear} accessibilityLabel={`Clear ${label}`} hitSlop={10}>
            <Icon name="close" size={15} color="textMuted" />
          </Pressable>
        ) : null}
        {trailingIcon ? <Icon name={trailingIcon} size={19} color={trailingColor} /> : null}
      </View>
    );

    return (
      <View style={styles.wrap}>
        {onPress ? (
          <Pressable onPress={onPress} accessibilityLabel={`${label}: ${value || 'not set'}`} pressScale={0.99}>
            {body}
          </Pressable>
        ) : (
          body
        )}
        {error || (counter && maxLength) ? (
          <View style={styles.meta}>
            <Text variant="caption" color="danger" style={styles.flex}>
              {error ?? ''}
            </Text>
            {counter && maxLength ? (
              <Text variant="caption" color="textSubtle">
                {(value ?? '').length}/{maxLength}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multi: { alignItems: 'flex-start', paddingVertical: space.md },
  errorBox: { borderColor: colors.danger },
  flex: { flex: 1 },
  input: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, padding: 0, minHeight: 24 },
  inputMulti: { minHeight: 88, textAlignVertical: 'top', fontFamily: fonts.regular },
  meta: { flexDirection: 'row', paddingHorizontal: space.xs },
});
