import type { GeoPoint } from '@/data/types';

/**
 * Выбранный результат геопоиска до перемещения карты (ТЗ _x/20.md §8).
 * Архитектура та же, что у filter-store: экран поиска коммитит цель и
 * закрывается; карта перечитывает её на useFocusEffect, анимирует камеру
 * и очищает цель. Без persist — сессия демо.
 */

export type MapSearchTarget = {
  coordinate: GeoPoint;
  latitudeDelta: number;
  longitudeDelta: number;
  name: string;
};

/* Состояние — на globalThis (синглтон): Expo Go в dev отдаёт lazy-бандлы
   экранов с копиями модулей; globalThis инвариантен к дублям. */
const globalRef = globalThis as { __klyuetMapSearchTarget?: MapSearchTarget | null };
let pending: MapSearchTarget | null = (globalRef.__klyuetMapSearchTarget ?? null);

export function getPendingSearchTarget(): MapSearchTarget | null {
  return pending;
}

export function setPendingSearchTarget(target: MapSearchTarget): void {
  pending = target;
  globalRef.__klyuetMapSearchTarget = pending;
}

export function clearPendingSearchTarget(): void {
  pending = null;
  globalRef.__klyuetMapSearchTarget = null;
}