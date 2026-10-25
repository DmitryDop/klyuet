import { StyleSheet, Text, View } from 'react-native';

import { type Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Form Field (K-DS 255:556/211:590): px 16, py 8, gap 8 «метка → контрол».
 * Метка Label 14/18 500; `required` — звёздочка --color-danger-text (сдвиг 4).
 * Контрол передаётся children (Select/Input/Textarea — K-DS описание
 * компонентов: поле 48px всегда дополняется внешней видимой меткой).
 */
export default function FormField({
  label,
  required = false,
  errorText,
  children,
}: {
  label: string;
  /** звёздочка «*» справа от метки (--color-danger-text, K 206:9632) */
  required?: boolean;
  /** Caption 12/16 danger под полем (K 87:4154/199:363:
      «Error сопровождается текстовой причиной и способом исправления») */
  errorText?: string;
  children: React.ReactNode;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  return (
    <View style={staticStyles.field}>
      <View style={staticStyles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      {children}
      {errorText != null && <Text style={styles.errorText}>{errorText}</Text>}
    </View>
  );
}

const staticStyles = StyleSheet.create({
  field: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 4, /* 2xs: метка → «*» (206:9632) */
  },
});

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    label: {
      ...rnTextStyle(TEXT.label),
      fontFamily: FONT_FAMILY,
      /* лейблы полей (Input/Select/Textarea): --color-text-secondary
         (решение Дмитрия 22.10) */
      color: palette.textSecondary,
    },
    required: {
      ...rnTextStyle(TEXT.label),
      fontFamily: FONT_FAMILY,
      color: palette.dangerText,
    },
    errorText: {
      /* Caption (K 87:4154/199:363): 12/16 · 500, --color-danger-text */
      ...rnTextStyle(TEXT.caption),
      fontFamily: FONT_FAMILY,
      color: palette.dangerText,
    },
  });