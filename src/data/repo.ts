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
  /** Детали отчёта (reports.md §5) */
  getReport(id: string): Promise<Report | null>;
  /** Все отчёты рыбака-автора — экран «Отчеты рыбака», та же сортировка (reports.md §7) */
  getReportsByAuthor(authorId: string): Promise<Report[]>;
  /** Создание отчёта (reports.md §4); место — по placeId, поля места не копируются */
  createReport(draft: Omit<Report, 'id' | 'publishedAt' | 'updatedAt'>): Promise<Report>;
  /** Редактирование: обновляет ту же сущность, не создаёт новую (reports.md §6) */
  updateReport(id: string, patch: Omit<Report, 'id' | 'placeId' | 'authorId' | 'publishedAt' | 'updatedAt'>): Promise<Report | null>;
}

/**
 * Демо-хранилище — рабочая копия fixtures: публикации и правки живут до
 * перезапуска приложения (MVP, бэкенд не подключён; отчёт реализации §6).
 */
const workingReports: Report[] = [...demoReports];
let seq = 0;

/** Данные появляются не мгновенно — имитация сети для loading-состояний спеки §8. */
const NET_MS = 400;

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

/** Сортировка списка (reports.md §7): fishingDate ↓, при равенстве — publishedAt ↓. */
function byFishingDateDesc(a: Report, b: Report): number {
  const byFishing = b.fishingDate.localeCompare(a.fishingDate);
  return byFishing !== 0 ? byFishing : b.publishedAt.localeCompare(a.publishedAt);
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
    return workingReports
      .filter((r) => r.placeId === placeId)
      .sort(byFishingDateDesc);
  },

  async getReport(id) {
    return workingReports.find((r) => r.id === id) ?? null;
  },

  async getReportsByAuthor(authorId) {
    return workingReports
      .filter((r) => r.authorId === authorId)
      .sort(byFishingDateDesc);
  },

  async createReport(draft) {
    await new Promise((r) => setTimeout(r, NET_MS));
    const now = new Date().toISOString();
    const created: Report = {
      ...draft,
      id: `new-report-${++seq}`,
      publishedAt: now,
      updatedAt: now,
    };
    workingReports.unshift(created);
    return created;
  },

  async updateReport(id, patch) {
    await new Promise((r) => setTimeout(r, NET_MS));
    const i = workingReports.findIndex((r) => r.id === id);
    if (i < 0) return null;
    workingReports[i] = { ...workingReports[i], ...patch, updatedAt: new Date().toISOString() };
    return workingReports[i];
  },
};