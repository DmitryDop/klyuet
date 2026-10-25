import { useSyncExternalStore } from 'react';

/**
 * Резерв нижнего блока для позиционирования тоста (FIX-07 §2/§5, позиция
 * «на 8 px выше TabBar или нижнего блока действий»; зависимость FIX-05
 * реализована минимально, Дмитрий 25.10).
 *
 * Регистраторы — TabBar (вкладки) и нижние панели push-экранов
 * («Добавить отчёт»/«Перейти в место»). Каждый регистрирует свою полную
 * высоту (включая safe-зону) под уникальным ключом; тост берёт МАКСИМУМ —
 * панель всегда выше таб-бара, а таб-бар всегда актуален, пока смонтирован.
 * Актуальное значение — верхний блок верхнего экрана стека: панели
 * смонтированы только пока их экран в стеке, TabBar живёт под ними.
 */

const globalRef = globalThis as {
  __klyuetBottomReserve?: Map<string, number>;
  __klyuetBottomReserveRev?: number;
  __klyuetBottomReserveListeners?: Set<() => void>;
};

const entries: Map<string, number> = (globalRef.__klyuetBottomReserve ??= new Map());
const listeners: Set<() => void> = (globalRef.__klyuetBottomReserveListeners ??= new Set());

function notify(): void {
  /* ревизия живёт ТОЛЬКО на globalThis: модуль дублируется в lazy-бандлах —
     локальная let в копии модуля расходится и getSnapshot чужой копии
     возвращал старое значение (дефект 26.10: резерв ставился, тост не видел) */
  globalRef.__klyuetBottomReserveRev = (globalRef.__klyuetBottomReserveRev ?? 0) + 1;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): number {
  /* из globalRef, не из копии модуля (см. notify) */
  return globalRef.__klyuetBottomReserveRev ?? 0;
}

function getReserve(): number {
  let max = 0;
  for (const h of entries.values()) {
    if (h > max) max = h;
  }
  return max;
}

/** Зарегистрировать высоту нижнего блока (полная, с safe-зоной). */
export function setBottomReserve(key: string, height: number): void {
  const prev = entries.get(key);
  if (prev === height) return;
  entries.set(key, height);
  notify();
}

/** Снять регистрацию (unmount панели/таб-бара). */
export function clearBottomReserve(key: string): void {
  if (!entries.has(key)) return;
  entries.delete(key);
  notify();
}

/** Резерв нижнего блока, px от низа экрана (0 — нет блока). */
export function useBottomReserve(): number {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getReserve();
}