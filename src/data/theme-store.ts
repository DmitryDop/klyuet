import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, type Palette } from '@/constants/theme';

/**
 * Тема оформления: Light/Dark (ТЗ dark-theme). Хранилище — тот же уровень
 * и паттерн, что map-settings-store (globalThis-синглтон +
 * useSyncExternalStore); выбор переживает перезапуск через AsyncStorage
 * (ключ klyuet.theme). Дефолт — Light (§3 ТЗ); системная тема не
 * предусматривается. Переключение мгновенное: подписчики (экраны,
 * компоненты) перерисовываются без перезагрузки.
 */

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'klyuet.theme';

const MODES: ThemeMode[] = ['light', 'dark'];

const globalRef = globalThis as { __klyuetThemeMode?: ThemeMode; __klyuetThemeListeners?: Set<() => void> };

type Mode = ThemeMode;
let mode: Mode = (globalRef.__klyuetThemeMode ??= 'light');
const listeners: Set<() => void> = (globalRef.__klyuetThemeListeners ??= new Set());

const notify = (): void => {
  listeners.forEach((l) => l());
};

function subscribeTheme(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getMode(): ThemeMode {
  return mode;
}

const getServerSnapshot = (): ThemeMode => 'light';

/** Текущая тема ('light' | 'dark'). */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribeTheme, getMode, getServerSnapshot);
}

/** Палитра активной темы (те же ключи, что Colors.light). */
export function useTheme(): Palette {
  return Colors[useThemeMode()];
}

/** Переключить и сохранить тему (мгновенно, §3 ТЗ). */
export function setThemeMode(next: ThemeMode): void {
  if (mode === next) return;
  mode = next;
  globalRef.__klyuetThemeMode = next;
  notify();
  void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
}

/** Восстановить сохранённую тему после перезапуска (§3). */
export async function loadThemeMode(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw !== null && (MODES as string[]).includes(raw)) {
      mode = raw as ThemeMode;
      globalRef.__klyuetThemeMode = mode;
      notify();
    }
  } catch {
    /* хранилище недоступно — остаётся Light */
  }
}