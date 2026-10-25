import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Избранные места (ТЗ _x/30.md §5): набор id мест — данные места не
 * дублируются, их берёт репо. Паттерн theme-store/map-settings-store:
 * globalThis-синглтон + useSyncExternalStore + AsyncStorage
 * (ключ klyuet.favorites) — карточка места и журнал читают ЕДИНОЕ
 * состояние, изменение в одном экране мгновенно видно в другом;
 * состояние переживает перезапуск и смену темы.
 * Порядок хранения — добавление, новые выше (unshift; список журнала).
 * Массив при изменении ПОДМЕНЯЕТСЯ новым (не мутируется), иначе snapshot
 * остаётся тем же ref и подписчики не перерисовываются (баг 25.10:
 * иконка карточки не переключалась).
 */

const STORAGE_KEY = 'klyuet.favorites';

const globalRef = globalThis as {
  __klyuetFavorites?: string[];
  __klyuetFavoritesListeners?: Set<() => void>;
};

const listeners: Set<() => void> = (globalRef.__klyuetFavoritesListeners ??= new Set());

const notify = (): void => {
  listeners.forEach((l) => l());
};

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getFavorites(): string[] {
  return (globalRef.__klyuetFavorites ??= []);
}

const getServerSnapshot = getFavorites;

/** Заменить список целиком (новый ref — snapshot меняется) и сохранить. */
function update(next: string[]): void {
  globalRef.__klyuetFavorites = next;
  notify();
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
}

/** Добавить/убрать место; добавление — в начало списка (новые выше). */
export function toggleFavorite(placeId: string): 'added' | 'removed' {
  const favorites = getFavorites();
  if (favorites.includes(placeId)) {
    update(favorites.filter((id) => id !== placeId));
    return 'removed';
  }
  update([placeId, ...favorites]);
  return 'added';
}

/** Исключить место из избранного (в т. ч. после удаления самого места). */
export function removeFromFavorites(placeId: string): void {
  const favorites = getFavorites();
  if (!favorites.includes(placeId)) return;
  update(favorites.filter((id) => id !== placeId));
}

/** Идентификаторы избранного в порядке добавления (новые выше). */
export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, getFavorites, getServerSnapshot);
}

/** Признак «место в избранном» для одного места (кнопка карточки). */
export function useIsFavorite(placeId: string): boolean {
  return useFavorites().includes(placeId);
}

/** Восстановить избранное после перезапуска (§5). */
export async function loadFavorites(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
      update(parsed);
    }
  } catch {
    /* хранилище недоступно — остаётся пустое избранное */
  }
}