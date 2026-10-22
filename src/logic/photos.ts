/**
 * Фотографии отчёта: маркер '346' — единственная демо-сцена
 * assets/demo/report-346.png (снимок Дмитрия 21.10.2026, fixtures);
 * реальный URI — из системного пикера (expo-image-picker/document-picker).
 */
const DEMO_PHOTO = require('../../assets/demo/report-346.png');

/** Иконка источника фото для Image: демо-маркер или реальный URI. */
export function photoSource(ph: string) {
  return ph === '346' ? DEMO_PHOTO : { uri: ph };
}