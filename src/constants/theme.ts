import '@/global.css';

import { Platform } from 'react-native';

/**
 * Цветовые токены — перенесены из Variable bindings Figma (файл WIFYiVA2QFFcDn0YYA1CCq).
 * Подтверждены через get_variable_defs 20.10.2026; все значения опак.
 * Тёмная палитра в дизайн-системе пока не подтверждена — только светлая (требование этапа 02).
 * В будущем темы переключаются глобально из «Профиль → Настройки → Оформление»
 * (Системная / Светлая / Тёмная, с сохранением выбора) — архитектура этому не препятствует.
 */
export const Colors = {
  light: {
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
     * (снапшот 135:6245); в K-DS button-ui привязка того же токена — #ffffffe5.
     * Расхождение одного токена в двух файлах — на решении Дмитрия; пока
     * в коде два значения с разными именами.
     */
    cardSurface: '#f8f9f5',
    /** --color-border-control — границы outline-кнопок (привязка 135:6279) */
    borderControl: '#748078',
    /** --color-selection-text — текст активных чипов (привязка 224:6017, 22.10) */
    selectionText: '#125640',
    /** --color-action-pressed — граница выбранной карточки видимости
        (привязка K 402:6522, шаг 1 создания места, 22.10) */
    actionPressed: '#0d4735',
    /** --color-focus-ring — граница 2px focused-полей (привязка K-DS 165:32/209:131, 22.10) */
    focusRing: '#176b52',
    /**
     * Граббер шторок: привязка узла Grabber (K-DS 224:1033) в контексте Sheet
     * даёт --color-text-primary = #181d1c33 (20% альфа) — светло-серый,
     * подтверждено Дмитрием 22.10.
     */
    grabber: 'rgba(24, 29, 28, 0.2)',
    /** --color-danger-text — обязательные поля «*» (K 206:9632, 22.10) */
    dangerText: '#a83f37',
    /** --color-surface-raised — плашки поверх снимков (подтверждено K 135:6237) */
    surfaceRaised: '#ffffff',
    /**
     * Overlay шторок — подтверждённая переменная `bg/overlay` (K-DS,
     * привязка overlay 240:4406): #18201d @ 40%. Используется Sheet и Modal Card.
     */
    scrim: '#18201d66',
    /** --color-overlay-point с альфой — полупрозрачная зелёная заливка
        приблизительных областей и кластеров (привязка K-DS 321:1835, 21.10.2026) */
    pointAlpha: '#176b5233',
  },
} as const;

export type Theme = { light: (typeof Colors)['light'] };

/**
 * Поверхность таб-бара — подтверждённая переменная `tab_bar/default` (коллекция «Klyot · Color»
 * в K-DS, режимы Light/Dark). Light: примитив color/stone/010 (#FAFAF6) + opacity/90 (90%).
 * Dark: примитив color/stone/130 (#222C27) + 90% — сохранено для будущего режима.
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