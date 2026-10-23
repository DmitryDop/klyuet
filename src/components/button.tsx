import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import Spinner from '@/components/ui/spinner';

/* Кнопка K-DS (мастер Button, высота 48, radius/sm 12). Лейбл — глобальный
   токен TEXT.label (Onest/Label 16/20 · 500 — глобально, Дмитрий 22.10),
   локальных переопределений не делаем.
   Здесь используются варианты Outline и Primary (панель карточки K 135:6279).
   Пресс/ховер не выдумывается (правило проекта, нет в этом макете).
   Disabled (K-DS 248:4949): вся кнопка opacity 0.4, не реагирует.
   Loading (K-DS 165:22 / 194:147): лоадер Spinner (Medium 20) по центру,
   White на primary / Brand на outline; лейбл скрыт; повторная отправка
   заблокирована (спека reports.md §8). */
export type ButtonVariant = 'primary' | 'outline';

export default function Button({
  label,
  variant,
  onPress,
  flex = false,
  disabled = false,
  loading = false,
}: {
  label: string;
  variant: ButtonVariant;
  onPress?: () => void;
  /** flex:1 внутри панелей кнопок (панель карточки) */
  flex?: boolean;
  /** K-DS State=Disabled: opacity 0.4, пресс-реакции нет */
  disabled?: boolean;
  /** K-DS State=Loading: спиннер, лейбл скрыт, повторный тап заблокирован */
  loading?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={inactive ? undefined : onPress}
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.outline,
        flex && styles.flex,
        inactive && styles.inactive,
      ]}>
      {loading ? (
        /* K-DS State=Loading: свой Spinner Medium 20, лейбл скрыт */
        <Spinner size="medium" appearance={variant === 'primary' ? 'white' : 'brand'} />
      ) : (
        <Text
          style={[
            styles.label,
            { color: variant === 'primary' ? Colors.light.accentIcon : Colors.light.text },
          ]}>
          {label}
        </Text>
      )}
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
    /* Onest/Label L 16/20 · 500 — добавлено Дмитрием 22.10 (токен labelL) */
    ...rnTextStyle(TEXT.labelL),
    fontFamily: FONT_FAMILY,
    textAlign: 'center',
  },
  flex: {
    flexGrow: 1,
    flexBasis: '0%',
    flexShrink: 1,
  },
  inactive: {
    /* K-DS 248:4949 (Disabled): opacity 0.4 на кнопке целиком */
    opacity: 0.4,
  },
});