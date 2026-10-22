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

/** Локальная календарная дата в формате ISO YYYY-MM-DD (reports.md §3). */
export function isoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Дата со сдвигом на N дней от сегодня — быстрые чипсы (reports.md §4.4). */
export function isoDateShifted(daysBack: number, now: Date = new Date()): string {
  return isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack));
}

/** Календарное «дд.мм.гггг» — поле «Дата рыбалки» (K 206:9633). */
export function formatRuDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Будущая дата запрещена (reports.md §4.3). */
export function isFutureDate(iso: string, now: Date = new Date()): boolean {
  const value = new Date(`${iso}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return value.getTime() > today.getTime();
}