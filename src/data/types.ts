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

/**
 * Приватность места (задача _x/18.md §5):
 * - private — личное: точные координаты видит только владелец, публичного
 *   представления места нет;
 * - public — общедоступно; вид для других задаёт kind
 *   ('exact' | 'approximate'), точность не смешивается с приватностью.
 */
export type PlacePrivacy = 'private' | 'public';

/** Точность публичного представления (шаг 1 создания, задача _x/18.md §6). */
export type PublicAccuracy = 'approximate' | 'exact';

export type PlaceBase = {
  id: string;
  kind: 'exact' | 'approximate';
  /** автор места (журнал «Мои места», действия владельца) */
  ownerId: string;
  name: string;
  placeType: PlaceType;
  /** private — личное место, публичного представления нет (задача _x/18.md §5) */
  privacy: PlacePrivacy;
  fishSpecies: string[];
  /** доступ: подъезд / дальнейший проход — строка карточки */
  access?: string;
  fishing?: 'shore' | 'boat';
  /** необязательное краткое описание */
  description?: string;
  photos: string[];
  /**
   * Дата создания места, ISO YYYY-MM-DD (ТЗ _x/21.md §4/§8: дата карточки
   * журнала и сортировка «Моих мест»; card createdAt не меняется при правках).
   * Техническое поле — journal.md разрешает хранение; пользовательская
   * история правок — бэклог.
   */
  createdAt: string;
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
  /** Радиус публичной области в метрах: 500 (диаметр 1 км, канон Дмитрия
   *  23.10; решение 25.10 — спекa §3.1 «порядка 1 км» = диаметр). */
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