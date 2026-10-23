/**
 * Типографика — перенос Text Styles K-DS (файл AdQjv6kqqQG7IMjOAiW62k,
 * страница стилей; названия и значения сохранены как есть).
 *
 * Семейство — string variable «Font Family/Sans» = "Onest".
 *
 * Источники значений:
 * - fontSize/lineHeight/letterSpacing: описания стилей K-DS («Onest 16/22 · wght 450»);
 *   Label и Caption дополнительно подтверждены привязками узлов (design context 21.10.2026).
 * - fontWeight: числовой вес из описания стиля; в RN задаю числом —
 *   RN 0.86 применяет его к вариативному TTF (проверить на устройстве).
 *
 * НЕ перенесено (нет значений, параметры через MCP не читаются):
 * - Onest/Headline и Onest/Subheadline — описания стилей в K-DS пустые;
 *   значения будут внесены после уточнения Дмитрием.
 * - letterSpacing стилей кроме Label — в K-DS не задан переменной и MCP
 *   его не отдаёт; по умолчанию не проставляю (RN default 0).
 */

import type { TextStyle } from 'react-native';

/** string variable «Font Family/Sans» (K-DS, коллекция Typography) */
export const FONT_FAMILY = 'Onest' as const;

export type TextStyleToken = {
  fontSize: number;
  lineHeight: number;
  /** вес из K-DS; промежуточные значения (450/650) применяются вариативным TTF */
  fontWeight: number;
  letterSpacing?: number;
};

/**
 * Граница «токен → RN»: числовой вес K-DS конвертируется для TextStyle.
 * Приведение типа осознанное: RN 0.74+ применяет числовой вес к вариативному
 * шрифту на iOS (450/650 не входят в TS-перечисление '100'…'900') —
 * поведение проверить при приёмке на устройстве.
 */
export function rnTextStyle(token: TextStyleToken): TextStyle {
  return {
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    fontWeight: String(token.fontWeight) as TextStyle['fontWeight'],
    letterSpacing: token.letterSpacing,
  };
}

export const TEXT: Record<string, TextStyleToken> = {
  /** Onest/Display — 32/38 · 700 · заголовки */
  display: { fontSize: 32, lineHeight: 38, fontWeight: 700 },
  /** Onest/Title1 — 28/34 · 700 */
  title1: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
  /** Onest/Title2 — 24/30 · 650 (описание); привязка узла карточки 135:6243
      даёт Bold/700 — конфликт на уточнении, в коде пока 700 (по прецеденту
      Label: узел приоритетен, описание K-DS ждёт исправления) */
  title2: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  /** Onest/Title3 — 20/26 · 600 (вес подтверждён Дмитрием 21.10.2026; стиль в
      K-DS — «Bold», фактическая ось на макете отчёта — 600) */
  title3: { fontSize: 20, lineHeight: 26, fontWeight: 600 },
  /** Onest/Label — 14/18 · 500 · чипы/поля (восстановлено 22.10: 14/18
      остаётся чипам и полям; кнопкам — labelL) */
  label: { fontSize: 14, lineHeight: 18, fontWeight: 500 },
  /** Onest/Label L — 16/20 · 500 · основные кнопки (Дмитрий 22.10: стиль
      в K-DS давно; описание и значения стиля подтверждают 16/20/500) */
  labelL: { fontSize: 16, lineHeight: 20, fontWeight: 500 },
  /** Onest/Body L — 17/24 · 500 (описание); привязка узла таблицы 135:6246
      даёт Regular/400 — конфликт на уточнении, в коде пока 400 */
  bodyL: { fontSize: 17, lineHeight: 24, fontWeight: 400 },
  /** Onest/Body — 16/22 · 450 · контент */
  body: { fontSize: 16, lineHeight: 22, fontWeight: 450 },
  /** Onest/Body S — 14/20 · 450 · контент */
  bodyS: { fontSize: 14, lineHeight: 20, fontWeight: 450 },
  /** Onest/Caption — 12/16 · 500 · метаданные */
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  /** Onest/Headline — 16/20 · 600 · контент (описание добавлено Дмитрием 21.10.2026) */
  headline: { fontSize: 16, lineHeight: 20, fontWeight: 600 },
  /** Onest/Subheadline — 12/14 · 500 · контент (описание добавлено Дмитрием 21.10.2026) */
  subheadline: { fontSize: 12, lineHeight: 14, fontWeight: 500 },
};