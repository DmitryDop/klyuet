import type { GeoPoint } from '@/data/types';

/**
 * Географический поиск населённых пунктов по России (ТЗ _x/20.md §5–8).
 *
 * Источник — Photon (OpenStreetMap), публичный сервер photon.komoot.io:
 * без ключей и без оплаты (Дмитрий 23.10, план задачи 20). Параметр lang
 * не задаётся: сервер язык 'ru' не поддерживает, названия возвращаются
 * основными — для объектов РФ это русские названия. osm_tag=place отбирает
 * только геообъекты OSM; поиск по внутренней базе мест и отчётов
 * исключён (§6).
 *
 * Модуль чистый: запросы и преобразование ответа, без React-состояния.
 * Debounce, отмена устаревших запросов и их гарантия «свежий ответ выигрывает»
 * — на экране /search (порядок ТЗ §13: минимальное решение).
 */

const ENDPOINT = 'https://photon.komoot.io/api/';
const TIMEOUT_MS = 10_000;

/**
 * Типы OSM place=*, являющиеся населёнными пунктами: city/town/village/hamlet,
 * обособленные постройки (isolated_dwelling/farm). Москва и СПб приходят из OSM
 * как place=state — принимаем. Не включены: allotments (дачные массивы), suburb,
 * quarter, neighbourhood (части городов, не населённые пункты).
 */
const SETTLEMENT_TYPES = new Set([
  'city',
  'town',
  'village',
  'hamlet',
  'isolated_dwelling',
  'isolated_farm',
  'state',
]);

/** Результатов в интерфейсе: разумный лимит (ТЗ §6) — первая страница Photon. */
export const GEO_RESULT_LIMIT = 10;

/** Отказ запроса (сеть/сервер). HTTP-статус Photon не различаем — для UI одна ошибка. */
export class GeoSearchError extends Error {}

export type GeoSearchResult = {
  /** уникальный id: osmType:osmId — различает одноимённые пункты (ТЗ §4.2) */
  id: string;
  name: string;
  /** субъект РФ (Photon state); при отсутствии — county, затем country */
  region: string;
  coordinate: GeoPoint;
  /**
   * Границы пункта [minLon, maxLat, maxLon, minLat] из OSM — для масштаба
   * камеры (§8). Есть не у всех пунктов.
   */
  extent: [number, number, number, number] | null;
  kind: string;
};

export type GeoSearchOptions = {
  /** координаты для bias близости (релевантность важнее расстояния, ТЗ §6) */
  bias?: GeoPoint | null;
  signal?: AbortSignal;
};

/** Запрос — по мере ввода с отсечкой на сервере; ошибки — throw GeoSearchError. */
export async function searchPlaces(
  query: string,
  opts: GeoSearchOptions = {},
): Promise<GeoSearchResult[]> {
  const q = query.trim();
  if (!q) {
    return [];
  }

  /* Photon не поддерживает длинные бесконечные запросы — ограничение на длину
     не требуется, но пустые и сверхдлинные строки пропускаем как есть. */
  const url = new URL(ENDPOINT);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(GEO_RESULT_LIMIT));
  url.searchParams.set('osm_tag', 'place');
  if (opts.bias) {
    url.searchParams.set('lat', String(opts.bias.latitude));
    url.searchParams.set('lon', String(opts.bias.longitude));
  }

  /* таймаут и внешняя отмена совмещаются через один сигнал: отмена
     пользователем отличается от таймаута флагом (AbortSignal.any в Hermes
     недоступен), таймаут остаётся ошибкой, отмена — наружу без обёртки */
  const timeout = new AbortController();
  let cancelledByUser = false;
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  const onOuterAbort = () => {
    cancelledByUser = true;
    timeout.abort();
  };
  opts.signal?.addEventListener('abort', onOuterAbort, { once: true });

  try {
    const res = await fetch(url, { signal: timeout.signal });
    if (!res.ok) {
      throw new GeoSearchError(`Геопоиск: HTTP ${res.status}`);
    }
    const data = (await res.json()) as PhotonResponse;
    return parsePhotonResponse(data);
  } catch (e) {
    if (e instanceof GeoSearchError) {
      throw e;
    }
    if (cancelledByUser) {
      throw e; /* отмена запроса — наружу как AbortError */
    }
    throw new GeoSearchError(e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onOuterAbort);
  }
}

type PhotonResponse = {
  features?: PhotonFeature[];
};

type PhotonFeature = {
  geometry?: { coordinates?: number[] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    state?: string;
    county?: string;
    country?: string;
    extent?: number[];
  };
};

export function parsePhotonResponse(data: PhotonResponse): GeoSearchResult[] {
  const out: GeoSearchResult[] = [];
  for (const f of data.features ?? []) {
    const props = f.properties;
    const coords = f.geometry?.coordinates;
    if (!props || !coords || coords.length < 2) {
      continue;
    }
    /* только геообъекты place и только населённые пункты */
    if (props.osm_key !== 'place' || !props.osm_value || !SETTLEMENT_TYPES.has(props.osm_value)) {
      continue;
    }
    if (!props.name) {
      continue;
    }
    /* osm_type/osm_id всегда у объектов OSM; без них результат не различить */
    if (!props.osm_type || !props.osm_id) {
      continue;
    }
    out.push({
      id: `${props.osm_type}${props.osm_id}`,
      name: props.name,
      region: props.state ?? props.county ?? props.country ?? '',
      coordinate: { latitude: coords[1], longitude: coords[0] },
      extent: toExtent(props.extent),
      kind: props.osm_value,
    });
  }
  return out;
}

/** extent Photon: [minLon, maxLat, maxLon, minLat]; на выходе валидный кортеж или null. */
function toExtent(raw: number[] | undefined): [number, number, number, number] | null {
  if (
    !raw ||
    raw.length !== 4 ||
    raw.some((v) => typeof v !== 'number' || !Number.isFinite(v))
  ) {
    return null;
  }
  return [raw[0], raw[1], raw[2], raw[3]];
}

/** Расстояние по прямой (haversine), километры — ТЗ §7 (не автопроезд). */
export function distanceKm(from: GeoPoint, to: GeoPoint): number {
  const R = 6371;
  const radLat1 = (from.latitude * Math.PI) / 180;
  const radLat2 = (to.latitude * Math.PI) / 180;
  const dLat = (to.latitude - from.latitude) * (Math.PI / 180);
  const dLon = (to.longitude - from.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Формат макета K 426:9606 — целые километры: «551 км», «3008 км». */
export function formatDistanceKm(km: number): string {
  return `${Math.round(km)} км`;
}

/**
 * Регион камеры (§8): границы пункта, если есть; иначе разумный масштаб по
 * типу пункта (ТЗ делегирует значение реализации). Границы не сжимаем
 * меньше 0.02° — чтобы не «залипать» в точку у деревень без контура.
 */
export function cameraRegion(result: GeoSearchResult): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  const MIN_DELTA = 0.02;
  let latDelta = MIN_DELTA;
  let lonDelta = MIN_DELTA;
  if (result.extent) {
    const [minLon, maxLat, maxLon, minLat] = result.extent;
    latDelta = Math.max(maxLat - minLat, MIN_DELTA);
    lonDelta = Math.max(maxLon - minLon, MIN_DELTA);
  } else {
    const byKind: Record<string, number> = {
      state: 0.25,
      city: 0.2,
      town: 0.08,
    }; /* остальное (village/hamlet/…) — 0.03 */
    const d = byKind[result.kind] ?? 0.03;
    latDelta = d;
    lonDelta = d;
  }
  return {
    latitude: result.coordinate.latitude,
    longitude: result.coordinate.longitude,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
}