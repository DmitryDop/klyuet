import { useSyncExternalStore } from 'react';
import type { GeoPoint, PlacePrivacy, PublicAccuracy } from '@/data/types';

/**
 * Черновик добавления места (задача _x/18.md): два шага делят одно состояние.
 *
 * Шаг 1 (/add-place) записывает координаты, приватность и точность; шаг 2
 * (/place-form) — сведения о месте. Возврат между шагами не стирает ввод
 * (map-place-flows-mvp.md §3.3): форма живёт здесь до публикации или отмены.
 *
 * Публикация коммитит черновик в репозиторий (createPlace), отмена/успех —
 * clear(). reset вызывается картой при тапе «+» (новый процесс создания).
 *
 * Модульное хранилище, не persist — тот же уровень живучести, что и у отчётов.
 */

export type PlaceCreateDraft = {
  /**
   * Редактирование (сценарий карандаша, Дмитрий 23.10): id редактируемого
   * места. Шаги 1/2 работают с черновиком как при создании; применение —
   * ЕДИНОЕ на финальном сохранении (updatePlace); отмена/закрытие не
   * трогают исходное место. Отсутствует — обычное создание.
   */
  editPlaceId?: string;
  coordinate: GeoPoint;
  privacy: PlacePrivacy;
  accuracy: PublicAccuracy;
  /** шаг 2: сведения о месте */
  name: string;
  placeType: 'wild' | 'paid';
  fishSpecies: string[];
  access?: string;
  description: string;
  photos: string[];
};

/* Состояние — на globalThis (синглтон, как repo.ts): lazy-бандлы Expo Go
   в dev содержат копии модулей; globalThis инвариантен к дублям. */
const globalRef = globalThis as {
  __klyuetPlaceCreateDraft?: PlaceCreateDraft | null;
  __klyuetPlaceCreateListeners?: Set<() => void>;
};

let draft: PlaceCreateDraft | null = (globalRef.__klyuetPlaceCreateDraft ??= null);
const listeners: Set<() => void> = (globalRef.__klyuetPlaceCreateListeners ??= new Set());

/**
 * put: каждая запись перерисовывает подписчиков usePlaceCreateDraft (смена
 * identity объекта); подписчики с другим snapshot'ом (usePlaceCreateActive —
 * только переход null↔non-null) React не перерисует — snapshot не изменился.
 *
 * Нотификация — через microtask: put вызывается в render-фазе (ensure из
 * useMemo place-form) и, при синхронном emit, дёргает setState чужих
 * компонентов прямо в рендере («Cannot update a component (MapScreen…)»).
 * Microtask уводит нотификацию после фазы рендера.
 */
let notifyQueued = false;
const scheduleNotify = (): void => {
  if (notifyQueued) return;
  notifyQueued = true;
  void Promise.resolve().then(() => {
    notifyQueued = false;
    listeners.forEach((l) => l());
  });
};

const put = (next: PlaceCreateDraft | null): void => {
  draft = next;
  globalRef.__klyuetPlaceCreateDraft = next;
  scheduleNotify();
};

export function getPlaceCreateDraft(): PlaceCreateDraft | null {
  return globalRef.__klyuetPlaceCreateDraft ?? null;
}

/** Реактивный черновик (identity перерисовывает на любой patch — шаг 1). */
export function subscribePlaceCreateDraft(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function usePlaceCreateDraft(): PlaceCreateDraft | null {
  return useSyncExternalStore(subscribePlaceCreateDraft, getPlaceCreateDraft, () => null);
}

/** Активен ли процесс создания (snapshot boolean — патчи не перерисовывают). */
export function usePlaceCreateActive(): boolean {
  return useSyncExternalStore(subscribePlaceCreateDraft, () => getPlaceCreateDraft() != null, () => false);
}

/* Первый вызов создаёт черновик с точкой; последующие — дополняют (шаги,
   возвраты), координаты не перезаписываются молча: точка меняется только
   движением карты на шаге 1 (patch). */
export function ensurePlaceCreateDraft(initial: {
  coordinate: GeoPoint;
  privacy?: PlacePrivacy;
  accuracy?: PublicAccuracy;
}): PlaceCreateDraft {
  if (draft == null) {
    draft = {
      coordinate: initial.coordinate,
      privacy: initial.privacy ?? 'private',
      accuracy: initial.accuracy ?? 'approximate',
      name: '',
      placeType: 'wild',
      fishSpecies: [],
      description: '',
      photos: [],
    };
  }
  put(draft);
  return draft;
}

export function setPlaceCreateDraft(next: PlaceCreateDraft): void {
  put(next);
}

export function clearPlaceCreateDraft(): void {
  put(null);
}