# Тёмная тема — реализация (docs, 25.10.2026)

Задача: ТЗ dark-theme (вставка в этом чате). Фундамент токенов/сверок —
`docs/2026-10-25-kds-variables-audit.md` + таблица
`bag/25_10_2026_kds-variables-conflicts.html`.

## 1. Как реализована темизация

- **Токены**: `src/constants/theme.ts` — `Colors = { light, dark }`, одинаковые
  ключи (27 ролей), значения Dark = режим Dark коллекции «Klyot · Color»
  (K-DS), сняты экспортом и сверно разрешены из живого файла. Light не менялся.
  Добавлены 4 роли-зеркала (clipping, tabBarSurface, buttonSurface, buttonPressed).
- **Стор**: `src/data/theme-store.ts` — паттерн map-settings-store
  (globalThis-синглтон + useSyncExternalStore): `useTheme()` (палитра),
  `useThemeMode()` ('light'|'dark'), `setThemeMode()` (мгновенно + сохранение
  AsyncStorage `klyuet.theme`), `loadThemeMode()` (восстановление на старте).
  Дефолт — Light; системной темы нет (§3 ТЗ).
- **Хуки вместо Context**: компоненты сами подписаны на стор — переключение
  мгновенно во всём приложении, нав-тема expo-router и Status Bar пересобираются
  в `_layout.tsx` на смене режима.
- **Pattern правки (39 файлов)**: `const palette = useTheme();`
  `Colors.light.X → palette.X`; стили с цветами → фабрика
  `makeStyles(palette: Palette)`. Значения Light = Dark-ключи 1:1, дифф механический.

## 2. Изменённые файлы

- **Фикс по следам переноса (Дмитрий 25.10, «исчезли page dot» на K 157:8531
  «Залив у сосен»):** `src/components/report/report-content.tsx` — точка
  пагинации фото потеряла состав при разнесении цветов/геометрии по фабрикам:
  в JSX остался только `styles.dot` (цвет), а геометрия 8×8 осталась в
  неиспользованном `staticStyles.dot` → точки нулевого размера, невидимы.
  Восстановлена композиция `[staticStyles.dot, styles.dot, styles.dotActive]`;
  проверено скриншотом (2 точки: активная accent, неактивная bg-secondary —
  K 158:8644). Аналогичные потери по всем компонентам просканированы — их нет.

- фундамент: `src/constants/theme.ts`, `src/data/theme-store.ts` (новый),
  `src/app/_layout.tsx` (нав-тема + StatusBar expo-status-bar по теме)
- компоненты: tab-bar, button, button-icon, ui/{toggle, avatar, spinner,
  skeleton, sheet-modal, modal-card, empty, toast}, form/{chip, form-input,
  form-select, form-field, photo-add, select-sheet}, journal/card,
  place/{report-item, info-row}, report/{report-content, author-sheet},
  map/{add-place-sheet, claster-point, settings-sheet, map-controls,
  location-pulse, location-dot, place-header}
- экраны: `(tabs)/{map, journal, profile}`, `place/[id]`, `search`, `place-form`,
  `report-form/[placeId]`, `report/[id]`, `place-reports/[id]`,
  `author-reports/[id]`, `filter`
- профиль: тумблер «Тёмная тема» подключён к теме (value = mode, onChange =
  setThemeMode), локальный useState удалён.

Подскролл форм над клавиатурой не тронут (заморожено). Тени не тронуты (§6).

## 3. Проверено в симуляторе (iPhone 18 Pro, Expo Go, dev)

- Dark: карта (кластеры/пин/геоточка/кнопки/легенда/таб-бар/статус-бар),
  журнал (чипы/карточки), профиль (карточки, toggle On с Dark-knob #263F34,
  аватар Dark: circle forest/060-круг, иконка stone/170), карточка места
  (блоки, кнопки «Добавить отчёт»/«Маршрут»), поиск (поле/блюр/клавиатура).
- Скриншоты: `/tmp/klyuet-avatar/dark_*.png`, `d3.png` (карта).
- Light после отката: `light_final_profile.png`.
- Переключение тапом, сохранение после перезапуска, анимация — **не проверено
  автоматом** (CLI тап недоступен; тап-приёмка за Дмитрием). Код тумблера
  сохранение делает (`setThemeMode` → AsyncStorage) и `_layout` восстанавливает.

## 4. Технические проверки

- `npx tsc --noEmit` — 0; `npx eslint src` — 0; `git diff --check` — 0.
- `grep Colors.light` в коде — 0 (только исторические комментарии).

## 5. Расхождения и ограничения

Итоговые решения Дмитрия 25.10 (четыре пункта, исполнены):

1. **INFO_GRAY → textSecondary** (place/report-item.tsx): локальный `#808080`
   заменён на --color-text-secondary (свет/dark stone/060). Новых токенов нет.
2. **DIMMING_BACKDROP `#181d1c`** (place-header.tsx) — оставлен как есть
   (подложка снимка, K 330:5076).
3. **DateTimePicker `themeVariant={themeMode}`** (report-form/[placeId].tsx) —
   системный барабан следует теме.
4. **Apple Maps работает в штатном тёмном режиме**: в react-native-maps
   1.29.11 `userInterfaceStyle` на Apple провайдере = `overrideUserInterfaceStyle`
   (AIRMap.mm:537) — MapKit рисует собственную тёмную подложку. Подключено как
   `userInterfaceStyle={themeMode}` в map.tsx и place-header.tsx; проверено
   скриншотом в симе (тёмная карта, все оверлеи читаемы:
   `/tmp/klyuet-avatar/darkmap_1.png`). Палитру карты не изобретали —
   используется штатный рендер MapKit; механика карты не менялась.

Оставшиеся системные особенности (не задачи):
- Клавиатура — системная, собственной темы нет.
- Блюр-стёкла (таб-бар, легенда, поиск) — tint переключается по теме.
- Тени — вне задачи (§6), Light-значения сохранены.

## 6. Не выполнено (специально)

- commit/push — только по отдельной команде.

## 7. Дополнение (Дмитрий 25.10): реальные фото + нативный просмотр

- **Фикс «бледных селектов» (Дмитрий 25.10, места/отчёты):**
  `src/components/form/form-select.tsx` — при переносе состояния Disabled
  агент убрал условие: `staticStyles.inactive` (opacity 0.4) применялся
  ВСЕГДА — текст значения и иконка были бледно-серые на всех полях Select
  (form-select используется в place-form и report-form).
  Восстановлено `disabled && staticStyles.inactive`; проверено скриншотом
  `/report-form` (значения и иконки — text-primary, по K 160:8719 и
  K-DS Select 553:74: заполнено = text&icon/primary). Сканер аналогичных
  безусловных opacity-состояний по всем компонентам — других нет
  (button/button-icon — под условием `inactive`/`disabled`).

- `src/logic/photos.ts`: маркеры '1'/'2'/'3' → `assets/demo/1.png/2.png/3.png`
  (реальные снимки Дмитрия; **файлы можно заменять** — после релоада Metro
  новые кадры в приложении); '346' — остался как «добавленное фото» сценария
  отчёта.
- Фикстуры: `demo-reports.ts` — «Залив у сосен» ['1','2'],
  `demo-report-5` ['3']; `demo-places.ts` — фото-маркеты мест:
  exact-1 ['1','2'], exact-3 ['3','1','2'], exact-7 ['2','3'], approx-1 ['1','3']
  (неиспользуемый PHOTOS_COUNT убран).
- **PhotoViewer** (`src/components/ui/photo-viewer.tsx`, новый): полноэкранный
  Modal (системный fade), горизонтальный ScrollView pagingEnabled (нативный
  iOS-инструмент), каждый кадр — зум-ScrollView (native UIScrollView, pinch
  до 4×, centerContent). Закрытие: тап по фото, Android back. Без сторонних
  библиотек; лишних эффектов нет. Фон #000000 — вне токенов K-DS (роли нет,
  помечено для K-DS); Android зум ScrollView не поддерживается (iOS-first).
- Тап по фото: в отчёте (ReportContent) и в карточке места (PhotoStubRow —
  плитки стали Image 130×88 вместо «Демо-фото N» камерной заглушки);
  accessibilityLabel «Фото N из M».
- Тап-приёмка вьюера — за Дмитрием (CLI тап недоступен).