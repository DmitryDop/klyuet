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