/**
 * Фотографии: демо-маркеры → локальные файлы; реальный URI — из системного
 * пикера (expo-image-picker/document-picker).
 * - '346' — демо-сцена assets/demo/report-346.png (снимок Дмитрия 21.10.2026,
 *   fixtures; остаётся как «новое фото» сценария добавления);
 * - '1'/'2'/'3' — реальные снимки Дмитрия assets/demo/1.png|2.png|3.png:
 *   содержимое файлов можно заменять (тот же путь) — после релоада Metro
 *   новые кадры попадают в демо-отчёты и карточки мест (фаза тестирования).
 */
const DEMO_PHOTO = require('../../assets/demo/report-346.png');
const PHOTO_1 = require('../../assets/demo/1.png');
const PHOTO_2 = require('../../assets/demo/2.png');
const PHOTO_3 = require('../../assets/demo/3.png');

const DEMO_MAP: Record<string, ImageSource> = {
  '346': DEMO_PHOTO,
  '1': PHOTO_1,
  '2': PHOTO_2,
  '3': PHOTO_3,
};

type ImageSource = ReturnType<typeof require>;

/** Иконка источника фото для Image: демо-маркер или реальный URI. */
export function photoSource(ph: string) {
  return DEMO_MAP[ph] ?? { uri: ph };
}