/**
 * Минимальная модель «Место» для карты (docs/map-place-flows-mvp.md §1–2).
 *
 * Приватности координат подчиняется модель на уровне типов: у приблизительного
 * места клиентские данные содержат ТОЛЬКО публичное представление области.
 * Исходная скрытая точка не хранится и не передаётся, в том числе в demo fixtures
 * (спека §1.1, критерий приёмки 6).
 *
 * Сущность «Отчёт» — отдельно (docs/journal.md, docs/reports.md); не вводится здесь.
 */

/** Географические координаты в градусах. */
export type GeoPoint = {
  latitude: number;
  longitude: number;
};

/** Точное место: публичные координаты. */
export type ExactPlace = {
  id: string;
  kind: 'exact';
  coordinate: GeoPoint;
};

/**
 * Публичное представление приблизительного места.
 * coordinate — центр области, округлённый на сервере до уровня «область ~радиуса»;
 * клиент по нему не может восстановить исходную точку точнее радиуса.
 */
export type ApproximatePlaceView = {
  coordinate: GeoPoint;
  /** Радиус публичной области в метрах. Спека §3.1: «порядка 1 км» — 1 000 м. */
  radiusMeters: number;
};

/** Приблизительное место: только безопасное представление. */
export type ApproximatePlace = {
  id: string;
  kind: 'approximate';
  view: ApproximatePlaceView;
};

export type Place = ExactPlace | ApproximatePlace;

/** Тип кластера из утверждённого набора (спека §1.1). */
export type ClusterKind = 'exact' | 'approximate' | 'mixed';