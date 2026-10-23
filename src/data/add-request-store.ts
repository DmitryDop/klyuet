import type { Place } from '@/data/types';

/**
 * Запрос запуска сценария добавления/редактирования места на карте извне
 * (ТЗ _x/21.md §6: «Добавить» в журнале; карандаш карточки — сценарий
 * Дмитрия 23.10). Архитектура map-search-store: инициатор коммитит запрос,
 * карта перечитывает его на useFocusEffect и открывает шаг 1 поверх карты
 * (ensurePlaceCreateDraft). globalThis-синглтон (Expo Go lazy-бандлы).
 */

const globalRef = globalThis as { __klyuetAddPlaceRequest?: { place: Place | null } | null };
let pending: { place: Place | null } | null = (globalRef.__klyuetAddPlaceRequest ?? null);

/** place есть — редактирование существующего; place нет — новое место. */
export function requestAddPlaceStart(place?: Place): void {
  pending = { place: place ?? null };
  globalRef.__klyuetAddPlaceRequest = pending;
}

export type AddPlaceRequest = { place: Place | null };

/** null — запроса нет; { place: null } — новое место; place — редактирование. */
export function consumeAddPlaceRequest(): AddPlaceRequest | null {
  const value = pending;
  if (pending) {
    pending = null;
    globalRef.__klyuetAddPlaceRequest = null;
  }
  return value;
}