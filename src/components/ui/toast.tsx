import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Palette } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import { useTheme } from '@/data/theme-store';
import { useBottomReserve } from '@/data/bottom-reserve-store';

/**
 * Toast (K-DS 316:1799 в K 235:9776): плашка 54px, x 16, radius 12,
 * bg --color-action-default, текст Body 16/22 --color-action-on;
 * тень 0 4 16 #181D1C33.
 * Кнопка-действие справа (K-DS 316:1799, FIX-07): текст «Вернуть»
 * --action/thint (ключ палитры `actionHint`), Body 16/22; необязательное —
 * без действия тост прежний (публикация отчёта и пр. не менялись).
 * Позиция (FIX-07, решение Дмитрия 25.10): 8 px над нижним блоком
 * (резерв — bottom-reserve-store: TabBar/панели), минимум 16 от края.
 * Единый для приложения (reports.md §8): автоматически, ~3 секунды.
 * Ошибки — модалкой, не тостом; исключение — ошибка восстановления
 * (FIX-07 §6, решение Дмитрия 25.10: тост с «Повторить»).
 * Один ToastHost монтируется в корне (src/app/_layout.tsx) поверх экранов.
 * Один активный Undo (FIX-07 §5): новый тост вытесняет предыдущий —
 * прежнее удаление становится окончательным.
 */

const HIDE_MS = 3000;

/** Действие тоста (FIX-07): «Вернуть» / «Повторить». */
export type ToastAction = { label: string; onPress: () => void };

/** Сообщение от любого сценария: удаление места/отчёта/избранного, публикация. */
let notify: ((message: string | null, action?: ToastAction) => void) | null = null;

export function showToast(message: string, action?: ToastAction): void {
  notify?.(message, action);
}

function ToastHost() {
  const palette = useTheme();
  const styles = makeStyles(palette);
  const [toast, setToast] = useState<{ message: string; action?: ToastAction } | null>(null);
  const reserve = useBottomReserve();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    notify = (message, action) => {
      if (message != null) {
        /* новый тост вытесняет активный: действие предыдущего
           больше недоступно — удаление окончательно (FIX-07 §5) */
        setToast({ message, action });
        if (timer != null) clearTimeout(timer);
        timer = setTimeout(() => setToast(null), HIDE_MS);
      } else {
        if (timer != null) clearTimeout(timer);
        setToast(null);
      }
    };
    return () => {
      notify = null;
      if (timer != null) clearTimeout(timer);
    };
  }, []);

  /* FIX-07 §3 (Дмитрий 26.10): тап «Вернуть» — тост скрывается немедленно,
     восстановление выполняется сразу после скрытия */
  const hideImmediately = () => {
    notify?.(null);
    toast?.action?.onPress();
  };

  if (toast == null) return null;
  return (
    /* FIX-07: 8 px над нижним блоком (резерв включает safe-зону); минимум 16 */
    <View
      style={[styles.toast, { bottom: Math.max(16, reserve + 8) }]}
      pointerEvents="box-none"
      accessibilityLiveRegion="polite">
      <Text style={styles.text}>{toast.message}</Text>
      {toast.action != null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
          onPress={hideImmediately}
          hitSlop={8}>
          <Text style={styles.actionText}>{toast.action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  toast: {
    /* Toast: x 16, h 54, px 16, radius 12 (#235:9871); действие справа
        (K-DS 316:1799): текст слева flex, кнопка справа */
    position: 'absolute',
    left: 16,
    right: 16,
    height: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    /* FIX-07 приёмка Дмитрия 26.10: «Вернуть» прибита к правой стороне
        тоста (K-DS 565:734), не прилипает к тексту сообщения */
    justifyContent: 'space-between',
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: palette.accent,
    boxShadow: '0 4px 16px rgba(24, 29, 28, 0.2)',
  },
  text: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: palette.accentIcon,
    flexShrink: 1,
  },
  actionText: {
    /* K-DS 316:1799: «Вернуть» — Body 16/22, --action/thint, справа */
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: palette.actionHint,
    textAlign: 'right',
  },
});

export default ToastHost;