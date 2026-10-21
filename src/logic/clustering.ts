import Supercluster, { type ClusterProperties } from 'supercluster';
import type { ClusterKind, Place } from '@/data/types';

/**
 * Кластеризация точных и приблизительных мест (спека §1.1) поверх supercluster.
 *
 * Приватность: кластеризация выполняется ТОЛЬКО над публичными данными
 * (точные координаты + публичные представления приблизительных мест),
 * поэтому смешанный кластер не может восстановить скрытую точку.
 */

export type RenderableObject =
  /** Кластер 48×48 одного из утверждённых видов */
  | { type: 'cluster'; id: string; kind: ClusterKind; count: number; coordinate: { latitude: number; longitude: number }; expansionZoom: number }
  /** Одиночное точное место: пин location-dot */
  | { type: 'exactPlace'; place: Extract<Place, { kind: 'exact' }> }
  /** Одиночное приблизительное место: географическая область (полигон/окружность) */
  | { type: 'approxPlace'; place: Extract<Place, { kind: 'approximate' }> };

export type RegionLike = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/** Зум по долготному span при ширине вьюпорта в пикселях (тайл 256). */
export function regionToZoom(region: RegionLike, viewportWidthPx: number): number {
  return Math.log2((360 / region.longitudeDelta) * (viewportWidthPx / 256));
}

/**
 * Расчёт отображаемых объектов для текущего вида карты.
 * Все точки передаём в supercluster один раз; на каждый кадр камеры — только
 * getClusters по видимой области (дешёвая операция на MVP-объёмах).
 */
export class PlaceClusterIndex {
  private index: Supercluster<{ placeId: string; kind: 'exact' | 'approximate' }>;

  constructor(places: Place[]) {
    this.index = new Supercluster({
      radius: 64,
      maxZoom: 18,
      minPoints: 2, // меньше — это одиночество, а не кластер
    });
    this.index.load(
      places.map((p) => {
        const c = p.kind === 'exact' ? p.coordinate : p.view.coordinate;
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [c.longitude, c.latitude] },
          properties: { placeId: p.id, kind: p.kind },
        };
      }),
    );
    this.withPlaces(places);
  }

  objectsForRegion(region: RegionLike, viewportWidthPx: number): RenderableObject[] {
    const zoom = regionToZoom(region, viewportWidthPx);
    const bbox: [number, number, number, number] = [
      region.longitude - region.longitudeDelta / 2,
      Math.max(-90, region.latitude - region.latitudeDelta / 2),
      region.longitude + region.longitudeDelta / 2,
      Math.min(90, region.latitude + region.latitudeDelta / 2),
    ];
    const raw = this.index.getClusters(bbox, Math.floor(zoom));
    const isCluster = (p: unknown): p is ClusterProperties =>
      typeof p === 'object' && p !== null && (p as { cluster?: unknown }).cluster === true;
    return raw.map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const props: unknown = f.properties;
      if (isCluster(props)) {
        const clusterId = props.cluster_id;
        /* обязательно полный набор листьев: getLeaves(clusterId) без лимита —
           иначе смешанный кластер классифицируется по первым N точкам */
        const leaves = this.index.getLeaves(clusterId, Infinity);
        const kinds = new Set(leaves.map((l) => l.properties?.kind));
        const kind: ClusterKind = kinds.size === 1 ? (kinds.values().next().value as ClusterKind) : 'mixed';
        const count = props.point_count ?? leaves.length;
        return {
          type: 'cluster' as const,
          id: String(clusterId),
          kind,
          count,
          coordinate: { latitude: lat, longitude: lon },
          /* по спеке §1.1 тап увеличивает масштаб на уровень; если кластер
             ещё не раскрылся — повторный тап продолжает увеличение */
          expansionZoom: Math.min(
            Math.floor(zoom) + 1,
            this.index.getClusterExpansionZoom(clusterId),
          ),
        };
      }
      const place = this.byId.get(f.properties!.placeId)!;
      return place.kind === 'exact'
        ? { type: 'exactPlace' as const, place }
        : { type: 'approxPlace' as const, place };
    });
  }

  private byId = new Map<string, Place>();

  /** Обновляет связку id→Place (нужна для восстановления объектов из кластеров). */
  withPlaces(places: Place[]): this {
    this.byId = new Map(places.map((p) => [p.id, p]));
    return this;
  }
}