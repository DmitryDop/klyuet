import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Вид карты и открытие шторки «Настройки карты» (ТЗ _x/24.md).
 * Модульное хранилище — тот же уровень, что add-request-filter-stores
 * (globalThis-синглтон, Expo Go lazy-бандлы); вид карты переживает
 * перезапуск через AsyncStorage (ключ klyuet.map.kind, §5).
 */

export type MapViewKind = 'standard' | 'satellite' | 'hybrid';

/* Схема/Спутник/Гибрид → mapType react-native-maps (Apple Maps/MapKit):
   все три режима нативные, подмена не требуется (ТЗ _x/24.md §4). */

const STORAGE_KEY = 'klyuet.map.kind';

const KINDS: MapViewKind[] = ['standard', 'satellite', 'hybrid'];

const globalRef = globalThis as {
  __klyuetMapKind?: MapViewKind;
  __klyuetMapSettingsOpen?: boolean;
  __klyuetMapSettingsListeners?: Set<() => void>;
};

let kind: MapViewKind = (globalRef.__klyuetMapKind ??= 'standard');
let settingsOpen: boolean = (globalRef.__klyuetMapSettingsOpen ??= false);
const listeners: Set<() => void> = (globalRef.__klyuetMapSettingsListeners ??= new Set());

const notify = (): void => {
  listeners.forEach((l) => l());
};

function subscribeMapSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getMapKind(): MapViewKind {
  return kind;
}

/** Текущий вид карты (снапшот string; перезапись значения только set). */
export function useMapViewKind(): MapViewKind {
  return useSyncExternalStore(subscribeMapSettings, getMapKind, () => 'standard');
}

function getSettingsOpen(): boolean {
  return settingsOpen;
}

/** Открыта ли шторка настроек (карта монтирует шторку по этому снапшоту). */
export function useMapSettingsOpen(): boolean {
  return useSyncExternalStore(subscribeMapSettings, getSettingsOpen, () => false);
}

/** Выбрать вид карты: применяется мгновенно и сохраняется (§3, §5). */
export function setMapViewKind(next: MapViewKind): void {
  if (kind === next) {
    /* тот же вариант — без записи в хранилище */
    return;
  }
  kind = next;
  globalRef.__klyuetMapKind = next;
  notify();
  void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
}

/** Восстановить сохранённый вид после перезапуска (не подписано: mode
    применяется и до подписки — MapView читает при монтаже). */
export async function loadMapViewKind(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw != null && (KINDS as string[]).includes(raw)) {
      kind = raw as MapViewKind;
      globalRef.__klyuetMapKind = kind;
      notify();
    }
  } catch {
    /* хранилище недоступно — остаётся текущее значение */
  }
}

/** Открыть шторку (шестерёнка таббара; карта — под шторкой). */
export function requestOpenMapSettings(): void {
  settingsOpen = true;
  globalRef.__klyuetMapSettingsOpen = true;
  notify();
}

/** Закрыть шторку (выбор/✕/скрим/свайп — без изменения режима, §3). */
export function closeMapSettings(): void {
  settingsOpen = false;
  globalRef.__klyuetMapSettingsOpen = false;
  notify();
}