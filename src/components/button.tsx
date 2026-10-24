import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import Spinner from '@/components/ui/spinner';

/* Кнопка K-DS (мастер 165:24 «Button», высота 48, radius/sm 12; пропсы
   обновлены K-DS 24.10: Mode × Apperance вместо variant'а, Negative добавлен).
   - mode: Primary (accent/negative) | Secondary (outline/dashed);
   - appearance: 'accent' | 'negative' | 'outline' | 'dashed' (K-DS Apperance);
   - текст: Label L 16/20 · 500; Primary — --color-action-on (white),
     Secondary — text-primary;
   - Touch-состояния: Normal (токены варианта), Pressed (правая колонка
     матрицы 165:24: accent #0d4735, negative #3d2523, outline/dashed
     #d8e8df поверх границы), Disabled (bg Normal + opacity 0.4),
     Loader (спиннер: бел. на Primary, Brand на Secondary; bg — Normal
     у Primary, selection у Secondary; лейбл скрыт; повторы заблокированы).
   - Hover — только для указателя, в touch не применяется (описание
     компонента K-DS).
   Лейбл — глобальный токен TEXT.labelL; локальных переопределений нет. */
export type ButtonMode = 'primary' | 'secondary';
export type ButtonAppearance = 'accent' | 'negative' | 'outline' | 'dashed';

export default function Button({
  label,
  mode,
  appearance = 'accent',
  onPress,
  flex = false,
  disabled = false,
  loading = false,
}: {
  label: string;
  /** K-DS Mode: Primary (accent/negative) | Secondary (outline/dashed) */
  mode: ButtonMode;
  /** K-DS Apperance: у Primary — accent/negative, у Secondary — outline/dashed */
  appearance?: ButtonAppearance;
  onPress?: () => void;
  /** flex:1 внутри панелей кнопок (панель карточки) */
  flex?: boolean;
  /** K-DS State=Disabled: opacity 0.4, пресс-реакции нет */
  disabled?: boolean;
  /** K-DS State=Loader: спиннер, лейбл скрыт, повторный тап заблокирован */
  loading?: boolean;
}) {
  const secondary = mode === 'secondary';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        appearance === 'accent' && styles.accent,
        appearance === 'negative' && styles.negative,
        (appearance === 'outline' || appearance === 'dashed') && styles.outline,
        appearance === 'dashed' && styles.dashed,
        /* пресс-токены K-DS (491:1028/165:16/258:691/258:694); у secondary
           граница остаётся с прежним цветом */
        pressed &&
          !inactive &&
          (secondary
            ? styles.selectionPressed
            : appearance === 'negative'
              ? styles.dangerPressed
              : styles.actionPressed),
        loading && secondary && styles.selectionPressed,
        flex && styles.flex,
        inactive && styles.inactive,
      ]}>
      {loading ? (
        <Spinner size="medium" appearance={secondary ? 'brand' : 'white'} />
      ) : (
        <Text
          style={[
            styles.label,
            { color: secondary ? Colors.light.text : Colors.light.accentIcon },
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
  /* Primary (165:12): --color-action-default */
  accent: {
    backgroundColor: Colors.light.accent,
  },
  /* Primary (491:1022): --color-danger-default */
  negative: {
    backgroundColor: Colors.light.dangerDefault,
  },
  /* Secondary (194:136): bg surface-default + border-control */
  outline: {
    backgroundColor: Colors.light.cardSurface,
    borderWidth: 1,
    borderColor: Colors.light.borderControl,
  },
  /* Secondary (258:682): та же граница, dashed */
  dashed: {
    borderStyle: 'dashed',
  },
  /* Pressed Primary Accent (165:16): --color-action-pressed */
  actionPressed: {
    backgroundColor: Colors.light.actionPressed,
  },
  /* Pressed Primary Negative (491:1028): --danger/pressed */
  dangerPressed: {
    backgroundColor: Colors.light.dangerPressed,
  },
  /* Pressed/Loader Secondary (194:140/194:147): --color-selection-bg */
  selectionPressed: {
    backgroundColor: Colors.light.selection,
  },
  label: {
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
    /* Disabled (248:4949/491:1031): opacity 0.4 на кнопке целиком */
    opacity: 0.4,
  },
});