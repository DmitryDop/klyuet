import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Input (K-DS 353:9851/199:301): 48px, radius 12 (--color-border-control),
 * px 16, текст Body 16/22; placeholder «Офф» не отрисован в этом сценарии.
 * Состояния по K-DS (мастера 165:30…331:1971):
 * - Focus = граница 2px --color-focus-ring (165:32);
 * - Error = --color-danger-text (165:34; пример K 87:4154 — 2px);
 * - Error+Focus = danger при фокусе сохраняется;
 * - Disabled — opacity 0.4 (201:515).
 */
export default function FormInput({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  height,
  editable = true,
  error = false,
  onFocus,
  onBlur,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Textarea (227:6353 в K 206:9637): высота 120, py 12 */
  multiline?: boolean;
  /** по умолчанию: Input 48; multiline — Textarea 120 (K-DS) */
  height?: number;
  editable?: boolean;
  /** K-DS State=Error: граница danger */
  error?: boolean;
  /** пробрасывается из формы (панель поверх клавиатуры) */
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const resolvedHeight = height ?? (multiline ? 120 : 48);
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.control,
        { height: resolvedHeight },
        multiline && styles.textarea,
        !error && focused && styles.focus,
        error && styles.error,
      ]}>
      <TextInput
        style={[styles.text, editable ? styles.textPrimary : styles.textSecondary]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.textSecondary}
        editable={editable}
        multiline={multiline}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    backgroundColor: Colors.light.cardSurface, /* --color-surface-default */
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.light.borderControl,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  textarea: {
    paddingTop: 12, /* Textarea 227:6353: py 12 */
    paddingBottom: 12,
    justifyContent: 'flex-start',
  },
  focus: {
    /* K-DS State=Focus (165:32): 2px --color-focus-ring */
    borderWidth: 2,
    borderColor: Colors.light.focusRing,
  },
  error: {
    /* State=Error (165:34; пример K 87:4152 — 2px): --color-danger-text */
    borderWidth: 2,
    borderColor: Colors.light.dangerText,
  },
  text: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    flex: 1,
  },
  textPrimary: {
    color: Colors.light.text,
  },
  textSecondary: {
    color: Colors.light.textSecondary,
  },
});