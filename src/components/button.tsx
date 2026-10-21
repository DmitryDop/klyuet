import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/* Кнопка K-DS (мастер Button, высота 48, radius/sm 12): Label 14/18.
   Здесь используются варианты Outline и Primary (панель карточки K 135:6279).
   Pressed/Focus/Loading/Disabled из K-DS не переданы макетом этого экрана —
   не выдумываются; таповое поведение появится при подключении действий. */

export type ButtonVariant = 'primary' | 'outline';

export default function Button({
  label,
  variant,
  onPress,
  flex = false,
}: {
  label: string;
  variant: ButtonVariant;
  onPress?: () => void;
  /** flex:1 внутри панелей кнопок (панель карточки) */
  flex?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={variant === 'primary' ? [styles.base, styles.primary, flex && styles.flex] : [styles.base, styles.outline, flex && styles.flex]}>
      <Text
        style={[
          styles.label,
          { color: variant === 'primary' ? Colors.light.accentIcon : Colors.light.text },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: Colors.light.accent, /* --color-action-default */
  },
  outline: {
    /* блок карточки K: bg surface-default (#f8f9f5 в K) + border-control */
    backgroundColor: Colors.light.cardSurface,
    borderWidth: 1,
    borderColor: Colors.light.borderControl,
  },
  label: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    textAlign: 'center',
  },
  flex: {
    flexGrow: 1,
    flexBasis: '0%',
    flexShrink: 1,
  },
});