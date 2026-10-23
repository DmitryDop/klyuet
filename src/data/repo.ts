import { demoPlaces } from './demo-places';
import { demoReports } from './demo-reports';
import type { GeoPoint, Place, PlacePrivacy, PlaceType, PublicAccuracy, Report } from './types';

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
  /** Все отчёты — для фильтрации мест на карте (фильтр по данным отчётов) */
  getAllReports(): Promise<Report[]>;
  /** Детали отчёта (reports.md §5) */
  getReport(id: string): Promise<Report | null>;
  /** Все отчёты рыбака-автора — экран «Отчеты рыбака», та же сортировка (reports.md §7) */
  getReportsByAuthor(authorId: string): Promise<Report[]>;
  /** Создание отчёта (reports.md §4); место — по placeId, поля места не копируются */
  createReport(draft: Omit<Report, 'id' | 'publishedAt' | 'updatedAt'>): Promise<Report>;
  /** Редактирование: обновляет ту же сущность, не создаёт новую (reports.md §6) */
  updateReport(id: string, patch: Omit<Report, 'id' | 'placeId' | 'authorId' | 'publishedAt' | 'updatedAt'>): Promise<Report | null>;
  /** Создание места (задача _x/18.md §3–§5, map-place-flows-mvp.md §3) */
  createPlace(draft: PlaceDraft): Promise<Place>;
}

/** Черновик создания места: шаги 1–2 в двух сториях (task _x/18.md). */
export type PlaceDraft = {
  /** исходные координаты выбранной точки (до публичного преобразования) */
  coordinate: GeoPoint;
  privacy: PlacePrivacy;
  /** точность публичного представления; при private роль не играет */
  accuracy: PublicAccuracy;
  name: string;
  placeType: PlaceType;
  /** виды рыбы — имена из SPECIES_CATALOG */
  fishSpecies: string[];
  /** «Как добраться» — утверждённые варианты (K 91:6333) */
  access?: string;
  description?: string;
  photos: string[];
};

/**
 * Демо-хранилище — рабочая копия fixtures: публикации и правки живут до
 * перезапуска приложения (MVP, бэкенд не подключён; отчёт реализации §6).
 *
 * состояние — на globalThis (синглтон): Expo Go в dev отдаёт lazy-бандлы
 * экранов с собственными копиями модулей — модульное состояние расходится
 * между экранами (созданное место «терялось» для карточки). globalThis
 * инвариантен к дублям модулей; при бэкенде состояние не нужно вовсе.
 */
type RepoState = {
  reports: Report[];
  places: Place[];
  seq: number;
};

const globalRef = globalThis as { __klyuetRepoState?: RepoState };
const state: RepoState = (globalRef.__klyuetRepoState ??= {
  reports: [...demoReports],
  places: [...demoPlaces],
  seq: 0,
});

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
    return state.places;
  },

  async getPlace(id) {
    /* рабочее хранилище (включая созданные createPlace): карточка нового
       места читается сразу после router.replace (задача _x/18.md §9) */
    return state.places.find((p) => p.id === id) ?? null;
  },

  async getReports(placeId) {
    return state.reports
      .filter((r) => r.placeId === placeId)
      .sort(byFishingDateDesc);
  },

  async getAllReports() {
    return state.reports;
  },

  async getReport(id) {
    return state.reports.find((r) => r.id === id) ?? null;
  },

  async getReportsByAuthor(authorId) {
    return state.reports
      .filter((r) => r.authorId === authorId)
      .sort(byFishingDateDesc);
  },

  async createReport(draft) {
    await new Promise((r) => setTimeout(r, NET_MS));
    const now = new Date().toISOString();
    const created: Report = {
      ...draft,
      id: `new-report-${++state.seq}`,
      publishedAt: now,
      updatedAt: now,
    };
    state.reports.unshift(created);
    return created;
  },

  async updateReport(id, patch) {
    await new Promise((r) => setTimeout(r, NET_MS));
    const i = state.reports.findIndex((r) => r.id === id);
    if (i < 0) return null;
    state.reports[i] = { ...state.reports[i], ...patch, updatedAt: new Date().toISOString() };
    return state.reports[i];
  },

  async createPlace(draft) {
    await new Promise((r) => setTimeout(r, NET_MS));
    const base = {
      id: `new-place-${++state.seq}`,
      ownerId: CURRENT_USER_ID,
      name: draft.name,
      placeType: draft.placeType,
      privacy: draft.privacy,
      fishSpecies: [...draft.fishSpecies],
      access: draft.access,
      description: draft.description,
      photos: [...draft.photos],
    };
    /* преобразование точки в публичное представление — «серверная» сторона:
       при «Все · Примерно» исходная точка сохраняется только как центр
       области (округление — имитация спеки types.ts), саму точную
       координату публичная сущность не содержит */
    const round1e4 = (v: number) => Math.round(v * 10_000) / 10_000;
    const place: Place =
      draft.privacy === 'public' && draft.accuracy === 'approximate'
        ? {
            ...base,
            kind: 'approximate',
            view: {
              coordinate: { latitude: round1e4(draft.coordinate.latitude), longitude: round1e4(draft.coordinate.longitude) },
              /* радиус 500 м (диаметр 1 км) — канон Дмитрия 23.10; на экране
                 выглядело как надо, ничего не менять */
              radiusMeters: 500,
            },
          }
        : { ...base, kind: 'exact', coordinate: draft.coordinate };
    state.places.unshift(place);
    return place;
  },
};