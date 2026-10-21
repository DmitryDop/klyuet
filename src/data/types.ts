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

/**
 * Общие поля места: карточка и журнал (journal.md §3, карточка K).
 * Виды рыбы — строки-названия до появления справочника; способ ловля —
 * характеристика места (карточка K показывает её в блоке места).
 */
export type PlaceType = 'wild' | 'paid';

export type PlaceBase = {
  id: string;
  kind: 'exact' | 'approximate';
  /** автор места (журнал «Мои места», действия владельца) */
  ownerId: string;
  name: string;
  placeType: PlaceType;
  fishSpecies: string[];
  /** доступ: подъезд / дальнейший проход — строка карточки */
  access?: string;
  fishing?: 'shore' | 'boat';
  /** необязательное краткое описание */
  description?: string;
  photos: string[];
};

/** Точное место: публичные координаты. */
export type ExactPlace = PlaceBase & {
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
export type ApproximatePlace = PlaceBase & {
  kind: 'approximate';
  view: ApproximatePlaceView;
};

export type Place = ExactPlace | ApproximatePlace;

/** Тип кластера из утверждённого набора (спека §1.1). */
export type ClusterKind = 'exact' | 'approximate' | 'mixed';

/**
 * Отчёт о рыбалке (reports.md §3) — отдельная сущность: только данные
 * конкретной рыбалки и placeId. Характеристики места (координаты, тип,
 * платность, точность) в отчёте отсутствуют по построению.
 */
export type CatchStatus = 'with_catch' | 'without_catch';

export type FishingMethod = 'shore' | 'boat';

export type Report = {
  id: string;
  /** только ссылка на существующее место */
  placeId: string;
  authorId: string;
  /** дата самой рыбалки, ISO YYYY-MM-DD; не дата публикации */
  fishingDate: string;
  /** служебные: время публикации / последнего изменения */
  publishedAt: string;
  updatedAt: string;
  catchStatus: CatchStatus;
  /** при without_catch — пусто и не публикуется */
  fishSpeciesIds: string[];
  fishingMethod?: FishingMethod;
  tackle?: string;
  bait?: string;
  comment?: string;
  photos: string[];
};