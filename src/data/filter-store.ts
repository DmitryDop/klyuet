import { DEFAULT_MAP_FILTER, type MapFilter } from '@/logic/filter';

/**
 * Применённые параметры фильтра карты (архитектура: черновик — на экране
 * фильтра, применённые — здесь; данные не смешиваются с местом/отчётом).
 *
 * Карта сохраняет состояние при открытии шторки/экрана фильтра (push,
 * navigation.md): применённые значения переживают возвраты, «Показать»
 * коммитит черновик, крестик закрывает без изменений.
 *
 * Модульное хранилище, не persist: сессия демо, до появления бэкенда —
 * тот же уровень живучести, что у отчётов repo.ts.
 */

/* Состояние — на globalThis (синглтон): Expo Go в dev отдаёт lazy-бандлы
   экранов с копиями модулей — модульная переменная расходится между
   экранами. globalThis инвариантен к дублям. */
const globalRef = globalThis as { __klyuetMapFilter?: MapFilter };
let applied: MapFilter = (globalRef.__klyuetMapFilter ??= DEFAULT_MAP_FILTER);

export function getAppliedMapFilter(): MapFilter {
  return applied;
}

export function setAppliedMapFilter(next: MapFilter): void {
  applied = next;
  globalRef.__klyuetMapFilter = applied;
}