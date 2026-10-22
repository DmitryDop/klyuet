import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Toast (K-DS 316:1799 в K 235:9776): плашка 54px, x 16, radius 12,
 * bg --color-action-default, текст Body 16/22 --color-action-on;
 * тень 0 4 16 #181D1C33.
 * Позиция — у НИЖНЕЙ границы с отступом 16 (Дмитрий 22.10, макет изменён).
 * Единый для приложения (reports.md §8): автоматически, ~3 секунды,
 * без кнопки и крестика; ошибки — модалкой, не тостом.
 * Один ToastHost монтируется в корне (src/app/_layout.tsx) поверх экранов.
 */

const HIDE_MS = 3000;

/** Сообщение от любого сценария отчётов: publish/edit. */
let notify: ((message: string | null) => void) | null = null;

export function showToast(message: string): void {
  notify?.(message);
}

function ToastHost() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    notify = (m) => {
      setMessage(m);
      if (m != null) {
        if (timer != null) clearTimeout(timer);
        timer = setTimeout(() => setMessage(null), HIDE_MS);
      }
    };
    return () => {
      notify = null;
      if (timer != null) clearTimeout(timer);
    };
  }, []);

  if (message == null) return null;
  return (
    /* низ: отступ 16 (в макете K 235:9776 изменён Дмитрием 22.10 —
       тост у нижней границы), safe-зона home-кнопки учтена */
    <View
      style={[styles.toast, { bottom: Math.max(16, insets.bottom) }]}
      pointerEvents="none"
      accessibilityLiveRegion="polite">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    /* Toast: x 16, h 54, px 16, radius 12 (#235:9871) */
    position: 'absolute',
    left: 16,
    right: 16,
    height: 54,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.accent,
    boxShadow: '0 4px 16px rgba(24, 29, 28, 0.2)',
  },
  text: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: Colors.light.accentIcon,
  },
});

export default ToastHost;