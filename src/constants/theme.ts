import '@/global.css';

import { Platform } from 'react-native';

/**
 * Цветовые токены — перенесены из Variable bindings Figma (файл WIFYiVA2QFFcDn0YYA1CCq).
 * Светлые подтверждены через get_variable_defs 20.10.2026; все значения опак.
 * Тёмные — режим Dark коллекции «Klyot · Color» (K-DS): сняты экспортом
 * _x/25_10_2026_K-DS_variables.json и сверно разрешены из живого файла
 * (use_figma 25.10.2026, резолв цепочек алиасов; docs/2026-10-25-kds-variables-audit.md).
 * Выбор темы — «Профиль → Тёмная тема» (Toggle), хранится между запусками
 * (src/data/theme-store.ts); дефолт — Light.
 * Тени (Light/Dark) из задания исключены (ТЗ dark-theme §6) — не проектируются.
 */

export type Palette = { [K in keyof (typeof Colors)['light']]: string };

const light = {
  /** --color-text-primary */
  text: '#181d1c',
  /** --color-bg-primary */
  background: '#e8ece5',
  /** --color-overlay-point / --color-action-default — акцентный зелёный */
  accent: '#176b52',
  /** --color-selection-bg — активные табы и чипсы */
  selection: '#d8e8df',
  /** --color-overlay-point-on — иконка на зелёной кнопке */
  accentIcon: '#ffffff',
  /** --color-overlay-marker-halo — обводка/гало пина */
  markerHalo: '#fafaf6',
  /** --color-text-secondary — подписи полей/метаданные (привязка 135:6246) */
  textSecondary: '#59625e',
  /** --color-border-subtle — разделители списков (привязка 139:7139) */
  borderSubtle: '#ccd4cb',
  /**
   * Блоки карточки места в K привязаны к --color-surface-default = #f8f9f5
   * (снапшот 135:6245); в K-DS Button-Icon привязка того же токена — #ffffffe5.
   * Расхождение одного токена в двух файлах разрешено аудитом 25.10
   * (docs/2026-10-25-kds-variables-audit.md): кнопки поверх карты —
   * button_small/default = белый 90%.
   */
  cardSurface: '#f8f9f5',
  /** --color-border-control — границы outline-кнопок (привязка K-DS 461:810) */
  borderControl: '#838f87',
  /** --color-selection-text — текст активных чипов (привязка 224:6017, 22.10) */
  selectionText: '#125640',
  /** --color-action-pressed — граница выбранной карточки видимости
      (привязка K 402:6522, шаг 1 создания места, 22.10) */
  actionPressed: '#0d4735',
  /** --color-focus-ring — граница 2px focused-полей (привязка K-DS 165:32/209:131, 22.10) */
  focusRing: '#176b52',
  /**
   * Граббер шторок: привязка узла Grabber (K-DS 224:1033) в контексте Sheet
   * даёт --text&icon/primary_alpha_20 = #181d1c @ 20% — подтверждено Дмитрием 22.10.
   */
  grabber: 'rgba(24, 29, 28, 0.2)',
  /** --color-danger-text — обязательные поля «*» (K 206:9632, 22.10) */
  dangerText: '#a83f37',
  /** --color-danger-default / --danger/pressed — Button Appearance=Negative
   *  (K-DS 491:1022/491:1028, 24.10): норма #b84a42, пресс #3d2523 */
  dangerDefault: '#b84a42',
  dangerPressed: '#3d2523',
  /** --color-surface-raised — плашки поверх снимков (подтверждено K 135:6237) */
  surfaceRaised: '#ffffff',
  /**
   * Overlay шторок — подтверждённая переменная `bg/overlay` (K-DS,
   * привязка overlay 240:4406): #18201d @ 40%. Используется Sheet и Modal Card.
   */
  scrim: '#18201d66',
  /** --overlay/point_alpha_20 — полупрозрачная зелёная заливка
      приблизительных областей и кластеров (привязка K-DS 321:1835, 21.10.2026) */
  pointAlpha: '#176b5233',
  /** --color-overlay-catch — пульс геоточки (задача _x/25.md, K-DS
      main_location 532:2218; Light = amber.050, Dark = amber.040) */
  catch: '#d18a24',
  /** --toggle/surface_on — трек Toggle в On (K-DS 517:1143, 24.10.2026) */
  toggleSurfaceOn: '#35916b',
  /** --toggle/surface_off — трек Toggle в Off (K-DS 517:1143) */
  toggleSurfaceOff: '#b8d3b9',
  /** --toggle/knob — бегунок Toggle (K-DS 517:1143) */
  toggleKnob: '#ffffff',
  /** --border/clipping — обводка бейджа Button-Icon (Light stone/000) */
  clipping: '#ffffff',
  /** --tab_bar/default — поверхность таб-бара (stone/010 @ 90%) */
  tabBarSurface: 'rgba(250,250,246,0.90)',
  /** --button_small/default — кнопки-иконки поверх карты (белый 90%) */
  buttonSurface: 'rgba(255,255,255,0.90)',
  /** --button_small/pressed (белый 50%) */
  buttonPressed: 'rgba(255,255,255,0.50)',
} as const;

/**
 * Dark-режим той же коллекции «Klyot · Color»: значения — резолв алиасов
 * Dark в примитивы K-DS (stone/forest/amber/red), имена ключей — зеркала
 * светлых. Ключевые отличия, зафиксированные аудитом: toggleKnob —
 * forest/110 (не белый); danger/pressed Dark = red/030 (#b84a42).
 */
const dark = {
  /** (stone/020) */
  text: '#f8f9f5',
  /** (stone/170) */
  background: '#101714',
  /** (forest/060) — светлее, чтобы держать контраст на тёмном фоне */
  accent: '#43a77e',
  /** (forest/140) */
  selection: '#173d30',
  /** (stone/170) */
  accentIcon: '#101714',
  /** (stone/170) */
  markerHalo: '#101714',
  /** (stone/060) */
  textSecondary: '#aeb8b2',
  /** (stone/110) */
  borderSubtle: '#3d4d44',
  /** (stone/130) */
  cardSurface: '#222c27',
  /** (stone/080) */
  borderControl: '#77837b',
  /** (forest/050) */
  selectionText: '#62c397',
  /** (forest/070) */
  actionPressed: '#35916b',
  /** (forest/050) */
  focusRing: '#62c397',
  /** (stone/020 @ 20%) */
  grabber: '#f8f9f533',
  /** (red/010) */
  dangerText: '#f18b83',
  /** (red/020) */
  dangerDefault: '#dc6c64',
  /** (red/030) */
  dangerPressed: '#b84a42',
  /** (stone/120) */
  surfaceRaised: '#29332f',
  /** (stone/170 @ 40%) */
  scrim: '#10171466',
  /** (forest/050 @ 20%) */
  pointAlpha: '#62c39733',
  /** (amber/040) */
  catch: '#e2a647',
  /** (forest/050) */
  toggleSurfaceOn: '#62c397',
  /** (forest/030 — в Dark не затемнён) */
  toggleSurfaceOff: '#b8d3b9',
  /** (forest/110 — тёмно-зелёный, НЕ белый) */
  toggleKnob: '#263f34',
  /** (stone/170) */
  clipping: '#101714',
  /** (stone/130 @ 90%) */
  tabBarSurface: 'rgba(34,44,39,0.90)',
  /** button_small/default (stone/130 @ 90%) — кнопки-иконки поверх карты */
  buttonSurface: 'rgba(34,44,39,0.90)',
  /** button_small/pressed (stone/130 @ 30%) */
  buttonPressed: 'rgba(34,44,39,0.30)',
} as const;

export const Colors = { light, dark } as const;

export type Theme = typeof Colors;

/**
 * Поверхность таб-бара — подтверждённая переменная `tab_bar/default` (коллекция «Klyot · Color»
 * в K-DS, режимы Light/Dark). Light: примитив color/stone/010 (#FAFAF6) + opacity/90 (90%).
 * Dark: примитив color/stone/130 (#222C27) + 90% (значение подтверждено аудитом 25.10).
 */
export const TabBarSurface = 'rgba(250,250,246,0.90)';
export const TabBarSurfaceDark = 'rgba(34,44,39,0.90)';

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
  },
  default: {
    sans: 'sans-serif',
  },
  web: {
    sans: 'var(--font-display)',
  },
});