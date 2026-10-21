import { demoPlaces } from './demo-places';
import { demoReports } from './demo-reports';
import type { Place, Report } from './types';

/**
 * Слой доступа к данным (аудит §7): карта и карточка работают только
 * с интерфейсом; при подключении бэкенда реализация подменяется без
 * переписывания UI. Модель Place не содержит приватных координат.
 */
export interface PlaceRepo {
  getPlaces(): Promise<Place[]>;
  getPlace(id: string): Promise<Place | null>;
  /** Отчёты места, отсортированные по дате рыбалки по убыванию (reports.md §7) */
  getReports(placeId: string): Promise<Report[]>;
}

/** Демо-авторизация: текущий пользователь демо-сессии (до появления бэкенда). */
export const CURRENT_USER_ID = 'me';

/** Имена авторов демо-сессии (источник — fixtures; по authorId, reports.md §3). */
const AUTHOR_NAMES: Record<string, string> = {
  me: 'Вы',
  'other-1': 'Алексей',
  'other-2': 'Рыбак 42',
};

export function displayName(authorId: string): string {
  return AUTHOR_NAMES[authorId] ?? authorId;
}

/** Демо-реализация до появления бэкенда. */
export const demoPlaceRepo: PlaceRepo = {
  async getPlaces() {
    return demoPlaces;
  },

  async getPlace(id) {
    return demoPlaces.find((p) => p.id === id) ?? null;
  },

  async getReports(placeId) {
    return demoReports
      .filter((r) => r.placeId === placeId)
      .sort((a, b) => {
        const byFishing = b.fishingDate.localeCompare(a.fishingDate);
        return byFishing !== 0 ? byFishing : b.publishedAt.localeCompare(a.publishedAt);
      });
  },
};