import { useSyncExternalStore } from 'react';
import type { Place } from '@/data/types';

/**
 * Запрос запуска сценария добавления/редактирования места на карте извне
 * (ТЗ _x/21.md §6: «Добавить» в журнале; карандаш карточки — сценарий
 * Дмитрия 23.10; центральный «+» таббара — ТЗ _x/23.md). Карта перечитывает
 * запрос по подписке: navigate на текущий маршрут /map фокус-эффект не
 * перезапускает, поэтому consume по useFocusEffect не срабатывал бы для «+»
 * с открытой карты. globalThis-синглтон (Expo Go lazy-бандлы).
 */

const globalRef = globalThis as {
  __klyuetAddPlaceRequest?: { place: Place | null } | null;
  __klyuetAddPlaceListeners?: Set<() => void>;
};
let pending: { place: Place | null } | null = (globalRef.__klyuetAddPlaceRequest ?? null);
const listeners: Set<() => void> = (globalRef.__klyuetAddPlaceListeners ??= new Set());

/** place есть — редактирование существующего; place нет — новое место. */
export function requestAddPlaceStart(place?: Place): void {
  pending = { place: place ?? null };
  globalRef.__klyuetAddPlaceRequest = pending;
  listeners.forEach((l) => l());
}

export type AddPlaceRequest = { place: Place | null };

/** null — запроса нет; { place: null } — новое место; place — редактирование. */
export function consumeAddPlaceRequest(): AddPlaceRequest | null {
  const value = pending;
  if (pending) {
    pending = null;
    globalRef.__klyuetAddPlaceRequest = null;
    listeners.forEach((l) => l());
  }
  return value;
}

function subscribeAddPlaceRequest(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getAddPlaceRequest(): { place: Place | null } | null {
  return pending;
}

/** Реактивный ожидающий запрос: карта обрабатывает его в эффекте и consume. */
export function useAddPlaceRequest(): AddPlaceRequest | null {
  return useSyncExternalStore(subscribeAddPlaceRequest, getAddPlaceRequest, () => null);
}