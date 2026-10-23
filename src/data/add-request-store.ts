/**
 * Запрос запуска сущес. сценари на карте извне (ТЗ _x/21.md §6: «Добавить»
 * в журнале запускает СУЩЕСТВУЮЩИЙ сценарий добавления места на карте).
 * Архитектура map-search-store: журнал коммитит интент, карта перечитывает
 * его на useFocusEffect и запускает шаг 1 (ensurePlaceCreateDraft).
 * globalThis-синглтон (прецедент Expo Go lazy-бандлов).
 */

const globalRef = globalThis as { __klyuetAddPlaceRequest?: boolean };
let pending = (globalRef.__klyuetAddPlaceRequest ?? false);

export function requestAddPlaceStart(): void {
  pending = true;
  globalRef.__klyuetAddPlaceRequest = true;
}

export function consumeAddPlaceRequest(): boolean {
  if (!pending) {
    return false;
  }
  pending = false;
  globalRef.__klyuetAddPlaceRequest = false;
  return true;
}