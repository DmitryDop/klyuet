/**
 * Подпись даты рыбалки — подтверждённые форматы:
 * K (135:6276): «Вчера» для свежей, календарная дата «23.06.2026» — абсолютная
 * (дд.мм.гггг, ru). Промежуточные «N дней назад» в утверждённых макетах нет —
 * не используется. «Сегодня» — по прототипной логике dateStr (0 дней).
 * Дата рыбалки ≠ дата публикации: отображается только fishingDate
 * (reports.md §7); publishedAt — служебное поле, отдельно.
 */

const DAY_MS = 86_400_000;

export function fishingDateLabel(fishingDate: string, now: Date = new Date()): string {
  const d = new Date(`${fishingDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - d.getTime()) / DAY_MS);
  if (days <= 0) return 'Сегодня'; // будущие даты запрещены (reports.md §4)
  if (days === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}