/**
 * Справочники отчётов MVP (финализация 22.10.2026, задача _x/16.md).
 *
 * Локальные, без API/БД: при подключении бэкенда источник данных
 * подменяется здесь же (та же структура записей), UI формы не переписывается.
 *
 * Общая структура записей — {id, name[, category]}:
 * - id — стабильный идентификатор (slug) для будущего API;
 * - name — русское название; В ОТЧЁТАХ (Report.fishSpeciesIds / tackle)
 *   хранится name — как в fixtures и demo-данных; переход на id — решение
 *   схемы данных при появлении бэкенда, UI это не касается.
 *
 * Рыбы (задача §1): пресноводные рыбы РФ, без морских (Дмитрий 22.10).
 * Категории: predatory — хищные; peaceful — мирные и условно мирные
 * (всеядные — по общепринятой рыболовной классификации, третьей категории
 * в MVP нет). Первые 13 позиций — приоритет и порядок K 91:6113.
 *
 * Снасти (задача §2): утверждённый перечень из 8 позиций; шторка снасти —
 * radio-выбор, live-применение, без кнопок/чипсов (Дмитрий 22.10).
 */
export type SpeciesCategory = 'predatory' | 'peaceful';

export type SpeciesEntry = { id: string; name: string; category: SpeciesCategory };
export type TackleEntry = { id: string; name: string };

/** 13 позиций K 91:6113 — порядок и приоритет по макету */
export const SPECIES_CATALOG: SpeciesEntry[] = [
  { id: 'pike', name: 'Щука', category: 'predatory' },
  { id: 'perch', name: 'Окунь', category: 'predatory' },
  { id: 'chub', name: 'Голавль', category: 'peaceful' },
  { id: 'zander', name: 'Судак', category: 'predatory' },
  { id: 'bream', name: 'Лещ', category: 'peaceful' },
  { id: 'asp', name: 'Жерех', category: 'predatory' },
  { id: 'volga-zander', name: 'Берш', category: 'predatory' },
  { id: 'tench', name: 'Линь', category: 'peaceful' },
  { id: 'ide', name: 'Язь', category: 'peaceful' },
  { id: 'crucian', name: 'Карась', category: 'peaceful' },
  { id: 'rudd', name: 'Краснопёрка', category: 'peaceful' },
  { id: 'white-bream', name: 'Густера', category: 'peaceful' },
  { id: 'ruffe', name: 'Ёрш', category: 'predatory' },
  /* пополнение (пресноводные РФ; категории — рыболовная классификация,
     подтверждены Дмитрием 22.10) */
  { id: 'roach', name: 'Плотва', category: 'peaceful' },
  { id: 'podust', name: 'Подуст', category: 'peaceful' },
  { id: 'catfish', name: 'Сом', category: 'predatory' },
  { id: 'burbot', name: 'Налим', category: 'predatory' },
  { id: 'sturgeon', name: 'Стерлядь', category: 'predatory' },
  { id: 'osetr', name: 'Осётр', category: 'predatory' },
  { id: 'carp', name: 'Карп', category: 'peaceful' },
  { id: 'wild-carp', name: 'Сазан', category: 'peaceful' },
  { id: 'silver-carp', name: 'Толстолобик', category: 'peaceful' },
  { id: 'grass-carp', name: 'Белый амур', category: 'peaceful' },
  { id: 'trout', name: 'Форель', category: 'predatory' },
  { id: 'char', name: 'Голец', category: 'predatory' },
  { id: 'taimen', name: 'Таймень', category: 'predatory' },
  { id: 'lenok', name: 'Ленок', category: 'predatory' },
  { id: 'grayling', name: 'Хариус', category: 'predatory' },
  { id: 'whitefish', name: 'Сиг', category: 'peaceful' },
  { id: 'vendace', name: 'Ряпушка', category: 'peaceful' },
  { id: 'syrt', name: 'Чехонь', category: 'peaceful' },
  { id: 'bleak', name: 'Уклейка', category: 'peaceful' },
  { id: 'dace', name: 'Елец', category: 'peaceful' },
  { id: 'gudgeon', name: 'Пескарь', category: 'peaceful' },
  { id: 'loach', name: 'Вьюн', category: 'peaceful' },
  { id: 'barbel', name: 'Усач', category: 'peaceful' },
  { id: 'blue-bream', name: 'Синец', category: 'peaceful' },
  { id: 'amur-sleeper', name: 'Ротан', category: 'predatory' },
  { id: 'vimba', name: 'Рыбец', category: 'peaceful' },
];

export const SPECIES_CATEGORIES = ['Все', 'Хищная', 'Мирная'] as const;
export type SpeciesCategoryLabel = (typeof SPECIES_CATEGORIES)[number];

/** Утверждённый перечень снастей (задача _x/16.md §2, Дмитрий 22.10). */
export const TACKLE_CATALOG: TackleEntry[] = [
  { id: 'spinning', name: 'Спиннинг' },
  { id: 'float', name: 'Поплавочная снасть' },
  { id: 'feeder', name: 'Фидер' },
  { id: 'bottom', name: 'Донная снасть' },
  { id: 'fly', name: 'Нахлыст' },
  { id: 'jigging', name: 'Мормышка' },
  { id: 'tip-up', name: 'Жерлица' },
  { id: 'trolling', name: 'Троллинг' },
];