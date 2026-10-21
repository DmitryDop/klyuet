import type { GeoPoint } from '@/data/types';

/**
 * Географическая окружность → многоугольник из N вершин.
 * Приближённая локальная проекция (широта): с точностью, достаточной
 * для визуальных областей радиусом ~1,5 км.
 */

const EARTH_RADIUS_M = 6_371_008.8;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Метры → градусы широты/долготы на данной широте. */
function metersToDegrees(latitude: number, meters: number): { dLat: number; dLon: number } {
  const dLat = (meters / EARTH_RADIUS_M) * RAD;
  const dLon = dLat / Math.cos(latitude * DEG);
  return { dLat, dLon };
}

/** Вершины окружности радиуса radiusMeters с центром в center. */
export function circleToPolygon(center: GeoPoint, radiusMeters: number, segments = 64): GeoPoint[] {
  const { dLat, dLon } = metersToDegrees(center.latitude, radiusMeters);
  const points: GeoPoint[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    points.push({
      latitude: center.latitude + dLat * Math.sin(a),
      longitude: center.longitude + dLon * Math.cos(a),
    });
  }
  return points;
}