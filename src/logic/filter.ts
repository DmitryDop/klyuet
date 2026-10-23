import type { CatchStatus, FishingMethod, Place, PlaceType, Report } from '@/data/types';

/**
 * Фильтр карты (задача _x/17.md; макет K 101:6980, шторка давности 407:10759).
 *
 * Разделение сущностей: тип места проверяется по Place.placeType; вид рыбы,
 * давность, результат и способ — по данным Отчёта (reports.md §3).
 *
 * Главное правило: все ОДНОВРЕМЕННО активные условия по отчётам должны
 * выполняться в пределах ОДНОГО отчёта места (не объединяются совпадения
 * разных отчётов). Внутри группы рыб — ИЛИ (хотя бы один выбранный вид),
 * между группами — И. «Все» = отсутствие ограничения.
 *
 * Давность — по publishedAt (дата публикации, не fishingDate — служебное
 * поле, §3 reports.md). Граница: отчёт в пределах N суток назад проходит,
 * на границе — тоже (>= cutoff).
 *
 * Места без отчётов: видимы, пока не активен ни один отчётный фильтр;
 * при любом активном отчётном фильтре — скрыты (у них нет ни одного
 * подходящего отчёта). Тип места действует независимо.
 */

/** Значения групп; `all` = «Все» (ограничения нет). */
export type MapFilter = {
  placeType: PlaceType | 'all';
  /** имена из SPECIES_CATALOG (в Report.fishSpeciesIds хранятся имена); пусто = Все */
  species: string[];
  recencyDays: 'all' | 7 | 30 | 90;
  catchStatus: 'all' | CatchStatus;
  method: 'all' | FishingMethod;
};

/** Все группы «Все» — состояние по умолчанию (§5). */
export const DEFAULT_MAP_FILTER: MapFilter = {
  placeType: 'all',
  species: [],
  recencyDays: 'all',
  catchStatus: 'all',
  method: 'all',
};

/** Как минимум одна группа ограничивает выбор (бейдж кнопки фильтра). */
export function isFilterActive(f: MapFilter): boolean {
  return (
    f.placeType !== 'all' ||
    f.species.length > 0 ||
    f.recencyDays !== 'all' ||
    f.catchStatus !== 'all' ||
    f.method !== 'all'
  );
}

const DAY_MS = 86_400_000;

/** Отчётный фильтр активен хотя бы в одной группе — иначе места без отчётов видимы. */
function hasReportConditions(f: MapFilter): boolean {
  return f.species.length > 0 || f.recencyDays !== 'all' || f.catchStatus !== 'all' || f.method !== 'all';
}

/** Все активные условия выполняются на одном конкретном отчёте. */
function reportMatches(r: Report, f: MapFilter, now: Date): boolean {
  /* ИЛИ внутри группы рыб: отчёт содержит хотя бы один выбранный вид */
  if (f.species.length > 0 && !r.fishSpeciesIds.some((n) => f.species.includes(n))) {
    return false;
  }
  if (f.recencyDays !== 'all') {
    const cutoff = now.getTime() - f.recencyDays * DAY_MS;
    const publishedAt = new Date(r.publishedAt).getTime();
    if (!Number.isFinite(publishedAt) || publishedAt < cutoff) {
      return false;
    }
  }
  if (f.catchStatus !== 'all' && r.catchStatus !== f.catchStatus) {
    return false;
  }
  /* у отчёта способ может быть не указан (поле опционально) — тогда он
     не проходит ни «С берега», ни «С лодки» */
  if (f.method !== 'all' && r.fishingMethod !== f.method) {
    return false;
  }
  return true;
}

/** Доступные значения давности; отображение поля — по шторке 407:10759. */
export type RecencyOption = { value: MapFilter['recencyDays']; label: string };

export const RECENCY_OPTIONS: RecencyOption[] = [
  { value: 'all', label: 'Все' },
  { value: 7, label: 'За 7 дней' },
  { value: 30, label: 'За 30 дней' },
  { value: 90, label: 'За 90 дней' },
];

/**
 * Чистая фильтрация мест: индекс кластеров получает только прошедший
 * фильтр список. Порядок входного списка сохраняется.
 */
export function applyMapFilter(
  places: Place[],
  reports: Report[],
  filter: MapFilter,
  now: Date = new Date(),
): Place[] {
  if (!isFilterActive(filter)) {
    return places;
  }
  const placeType = filter.placeType;
  const reportNeeded = hasReportConditions(filter);
  const reportsByPlace = new Map<string, Report[]>();
  for (const r of reports) {
    const list = reportsByPlace.get(r.placeId);
    if (list) {
      list.push(r);
    } else {
      reportsByPlace.set(r.placeId, [r]);
    }
  }
  return places.filter((p) => {
    if (placeType !== 'all' && p.placeType !== placeType) {
      return false;
    }
    if (!reportNeeded) {
      return true;
    }
    const list = reportsByPlace.get(p.id);
    return list != null && list.some((r) => reportMatches(r, filter, now));
  });
}