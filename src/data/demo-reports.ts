import type { Report } from './types';

/**
 * Demo fixtures отчётов (linked к demoPlaces по placeId; reports.md §3).
 * authorId — ключ из AUTHOR_NAMES (repo.ts). Фото в демо — счётчик-заглушки
 * (как в прототипе): в массиве лежат маркеры-строки, содержимого нет.
 * Даты рыбалки: разрывы — для проверки форматов (Сегодня/Вчера/N дней/дд.мм.гггг).
 */
export const demoReports: Report[] = [
  {
    id: 'demo-report-1',
    placeId: 'demo-exact-1',
    authorId: 'other-1',
    fishingDate: '2026-10-20',
    publishedAt: '2026-10-20T18:40:00Z',
    updatedAt: '2026-10-20T18:40:00Z',
    catchStatus: 'with_catch',
    fishSpeciesIds: ['Щука', 'Окунь'],
    fishingMethod: 'shore',
    tackle: 'Спиннинг',
    bait: 'Воблер',
    photos: ['demo-ph-1', 'demo-ph-2'],
  },
  {
    id: 'demo-report-2',
    placeId: 'demo-exact-1',
    authorId: 'other-2',
    fishingDate: '2026-06-23',
    publishedAt: '2026-06-23T20:12:00Z',
    updatedAt: '2026-06-23T20:12:00Z',
    catchStatus: 'without_catch',
    fishSpeciesIds: [],
    fishingMethod: 'shore',
    tackle: 'Спиннинг',
    bait: 'Воблер',
    photos: [],
  },
  {
    id: 'demo-report-3',
    placeId: 'demo-exact-2',
    authorId: 'me',
    fishingDate: '2026-10-19',
    publishedAt: '2026-10-19T09:05:00Z',
    updatedAt: '2026-10-19T09:05:00Z',
    catchStatus: 'with_catch',
    fishSpeciesIds: ['Лещ'],
    fishingMethod: 'boat',
    photos: [],
  },
  {
    id: 'demo-report-5',
    placeId: 'demo-exact-7',
    authorId: 'other-2',
    fishingDate: '2026-10-08',
    publishedAt: '2026-10-08T21:30:00Z',
    updatedAt: '2026-10-08T21:30:00Z',
    catchStatus: 'with_catch',
    fishSpeciesIds: ['Плотва', 'Подуст'],
    fishingMethod: 'shore',
    tackle: 'Поплавочная снасть',
    bait: 'Опарыш',
    photos: ['demo-ph-3'],
  },
  {
    id: 'demo-report-4',
    placeId: 'demo-approx-1',
    authorId: 'other-1',
    fishingDate: '2026-06-12',
    publishedAt: '2026-06-12T21:30:00Z',
    updatedAt: '2026-06-12T21:30:00Z',
    catchStatus: 'with_catch',
    fishSpeciesIds: ['Щука'],
    photos: [],
  },
  {
    /* третий отчёт «Залива у сосен» — проверка счётчика «Все отчеты (3)»
       (карточке показаны 2 свежих, остальные по тапу на кнопку) */
    id: 'demo-report-6',
    placeId: 'demo-exact-1',
    authorId: 'other-2',
    fishingDate: '2026-05-30',
    publishedAt: '2026-05-30T14:00:00Z',
    updatedAt: '2026-05-30T14:00:00Z',
    catchStatus: 'with_catch',
    fishSpeciesIds: ['Лещ', 'Плотва'],
    fishingMethod: 'boat',
    tackle: 'Донка',
    photos: [],
  },
  {
    /* второй отчёт «Обрыва у Галича» — проверка блока без кнопки
       (два отчёта, нижний отступ 16 после последнего) */
    id: 'demo-report-7',
    placeId: 'demo-approx-1',
    authorId: 'other-2',
    fishingDate: '2026-07-04',
    publishedAt: '2026-07-04T19:10:00Z',
    updatedAt: '2026-07-04T19:10:00Z',
    catchStatus: 'without_catch',
    fishSpeciesIds: [],
    fishingMethod: 'shore',
    photos: [],
  },
];