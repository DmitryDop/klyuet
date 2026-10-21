import { demoPlaces } from './demo-places';
import type { Place } from './types';

/**
 * Слой доступа к данным мест (аудит §7): карта работает только с интерфейсом.
 * При подключении бэкенда подменяется реализацией — карта и кластеризация
 * не переписываются. Модель Place не содержит приватных координат.
 */
export interface PlaceRepo {
  getPlaces(): Promise<Place[]>;
}

/** Демо-реализация до появления бэкенда. */
export const demoPlaceRepo: PlaceRepo = {
  async getPlaces() {
    return demoPlaces;
  },
};