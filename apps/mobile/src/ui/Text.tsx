import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, type ColorToken, type, type TypeVariant } from './theme';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
}

/** All copy goes through here: Inter, token colours, scales to 130% (accessibility NFR). */
export const Text = memo(function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.3}
      style={[type[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
});
