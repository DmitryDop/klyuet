import type { Place, Report } from '@/data/types';

/**
 * Выборка журнала (ТЗ _x/21.md §4–5, §8; journal.md §1): только активность
 * текущего пользователя. Модуль чистый: фильтрация + сортировка, без React.
 *
 * Разделы:
 * - «Мои места» — места ownerId = текущий (личные И общедоступные),
 *   по дате создания, новые выше (§8);
 * - «Мои отчёты» — отчёты authorId = текущий (включая чужие места),
 *   по дате рыбалки, новые выше; при равенстве — позже опубликованные
 *   (journal.md §4).
 */

export function myPlaces(places: Place[], ownerId: string): Place[] {
  return places
    .filter((p) => p.ownerId === ownerId)
    .sort((a, b) => {
      /* ISO YYYY-MM-DD сортируется лексикографически; отсутствие даты
         (места, созданные до добавления поля в живой демо-сессии) —
         считается старейшими; при равенстве — стабильный порядок */
      const ac = a.createdAt ?? '';
      const bc = b.createdAt ?? '';
      if (ac !== bc) {
        return ac < bc ? 1 : -1;
      }
      return 0;
    });
}

export function myReports(reports: Report[], authorId: string): Report[] {
  return reports
    .filter((r) => r.authorId === authorId)
    .sort((a, b) => {
      /* дата рыбалки по убыванию; при равенстве — по публикации (journal.md §4) */
      if (a.fishingDate !== b.fishingDate) {
        return a.fishingDate < b.fishingDate ? 1 : -1;
      }
      if (a.publishedAt !== b.publishedAt) {
        return a.publishedAt < b.publishedAt ? 1 : -1;
      }
      return 0;
    });
}

/* Инфолиня карточки «Моих мест» (макет K 209:9799; ДМИТРИЙ 23.10 про личные
   места: состав одинаковый, без пометы приватности): тип · стоимость ·
   точность; у платных сумма в модели отсутствует → «Платное место». */
export function placeInfoLine(place: Place): string {
  const type = place.placeType === 'wild' ? 'Дикое место · Бесплатно' : 'Платное место';
  const accuracy = place.kind === 'exact' ? 'Точное место' : 'Примерное место';
  return `${type} · ${accuracy}`;
}

/* Первая строка карточки отчёта: виды пойманной рыбы или «Без улова»
   (ТЗ §5); в порядке списка отчёта. */
export function reportCatchLabel(report: Report): string {
  return report.catchStatus === 'with_catch' && report.fishSpeciesIds.length > 0
    ? report.fishSpeciesIds.join(', ')
    : 'Без улова';
}

/* Инфолиня отчёта (макет K 209:9773: «Спиннинг · Живец · 1 фото»):
   только указанные части, разделитель « · »; количество фотографий —
   всегда N фото (по макету, без склонений). */
export function reportInfoLine(report: Report): string {
  const parts = [report.tackle, report.bait];
  if (report.photos.length > 0) {
    parts.push(`${report.photos.length} фото`);
  }
  return parts.filter((p): p is string => p != null && p !== '').join(' · ');
}