import type { Place } from './types';

/**
 * Demo fixtures для проверки карты и кластеризации на этапе реализации.
 *
 * География — Рыбинское водохранилище (район зат. Шекснинский, как на подложке
 * актуального макета K). Список искусственный: точки разбросаны так, чтобы на
 * дальнем зуме собирались кластеры всех трёх типов, на ближнем — разделялись.
 *
 * Только публичные координаты: скрытой исходной точки у приблизительных мест
 * нет даже в fixtures (см. types.ts).
 */
export const DEMO_CENTER = { latitude: 58.05, longitude: 38.35 };

const EXACT: [number, number][] = [
  [58.09, 38.28],
  [58.08, 38.29],
  [58.07, 38.3],
  [58.03, 38.33],
  [58.02, 38.34],
  [58.06, 38.42],
  [58.05, 38.49],
  [58.15, 38.31],
  [58.16, 38.32],
  [58.02, 38.52],
  [57.99, 38.3],
  [58.2, 38.44],
];

const APPROXIMATE: [number, number][] = [
  [58.08, 38.285],
  [58.03, 38.34],
  [58.05, 38.44],
  [58.14, 38.3],
  [58.09, 38.52],
  [58.11, 38.38],
];

export const demoPlaces: Place[] = [
  ...EXACT.map(([latitude, longitude], i) => ({
    id: `demo-exact-${i + 1}`,
    kind: 'exact' as const,
    coordinate: { latitude, longitude },
  })),
  ...APPROXIMATE.map(([latitude, longitude], i) => ({
    id: `demo-approx-${i + 1}`,
    kind: 'approximate' as const,
    /* радиус области одинаков у всех демо-мест: «порядка 1 км» (спека §3.1) */
    view: { coordinate: { latitude, longitude }, radiusMeters: 1000 },
  })),
];