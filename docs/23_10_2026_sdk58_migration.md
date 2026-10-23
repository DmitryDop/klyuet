# Миграция на Expo SDK 58 — отчёт

**Дата:** 23.10.2026. **Ветка:** `chore/expo-sdk-58` (от `main` = `eb8d74f`).
**Контекст:** карта и сохранение её положения при открытии экранов — критические требования; навигация без функциональных изменений.

## Процедура (официальная, expo.dev/changelog/sdk-58)

`npx expo install expo@^58.0.0 --fix` — выполнялась дважды: первый запуск упал на конфликте npm-peer, второй прошёл (см. ниже). Папки `ios`/`android` в проекте нет (CNG) — `pod-install` не требуется. Dev-builds не используются — пересборка не нужна (Expo Go).

## Обновлённые версии

Все совпадают с официальным манифестом SDK 58 (`node_modules/expo/bundledNativeModules.json`, проверено пофамильно через скрипт):

| Пакет | Было (SDK 57) | Стало (SDK 58) |
|---|---|---|
| expo | ~57.0.31 | ^58.0.0 (установлено 58.0.17) |
| expo-router | ~57.0.29 | ~58.0.25 |
| react | 19.2.3 | 19.3.0 |
| react-dom | 19.2.3 | 19.3.0 |
| react-native | 0.86.3 | **0.88.0** |
| react-native-maps | 1.27.2 | **1.29.11** (вернулась версия, на которой карта была приёмана) |
| react-native-reanimated | 4.5.1 | 4.7.1 |
| react-native-worklets | 0.10.1 | 0.13.0 |
| react-native-gesture-handler | ~2.32.0 | ~3.3.0 (major) |
| react-native-safe-area-context | ~5.7.0 | ~5.10.1 |
| react-native-screens | ~4.26.0 | ~4.30.0 |
| react-native-svg | 15.15.4 | 15.16.0 |
| @expo/ui, expo-blur/image/linking/… | 57.x | 58.x (по манифесту) |
| @react-native-community/datetimepicker | 9.1.0 | 9.2.1 |
| @types/react (dev) | ~19.2.2 | ~19.3.0 |
| eslint-config-expo (dev) | ~57.0.2 | ~58.0.4 |

Расхождение одно: `react-native-web ~0.21.0` при ожидаемых `~0.21.4` — внутри tilde-диапазона, web-вывод не используется.

## Изменённые файлы (код)

| Файл | Изменение |
|---|---|
| `src/app/report-form/[placeId].tsx` | **`beforeRemove` удалён в SDK 58** — гвард «Выйти без сохранения?» (reports.md §6) мигрирован на `usePreventRemove` по шаблону гейда: условие (`!loading && dirty`) — реактивный проп; повтор заблокированного перехода — `repeat()`; поведение идентично прежнему. `allowExitRef`-обход заменён: успешная публикация/сохранение и «Выйти» сначала делают форму чистой (`setBaseline({...form})` → dirty false), затем переход. `useNavigation`/`FormGuardEvent` больше не нужны (typed events) |
| `src/app/place-form.tsx` | ref: `useRef<ScrollView>` → `useRef<ScrollViewInstance>` (RN 0.88 Strict TypeScript API — ref-типы перечислены в breaking changes SDK 58) |
| `src/app/search.tsx` | ref: `useRef<TextInput>` → `useRef<TextInputInstance>` (там же) |
| `.npmrc` (новый) | `legacy-peer-deps=true` — обход известного бага npm с `peerOptional react-native-windows@"*"` у `@react-native-community/datetimepicker@9.2.1`: npm 11 пытается ставить windows-модуль (peer RN ^0.85) под macOS и падает на RN 0.88. Без этой строки `npm ci` повторит конфликт |
| `package.json`, `package-lock.json` | версии выше |

## Проверка необходимости `.npmrc` (эмпирически, 23.10; зависимости не менялись)

Тесты на изолированной копии проекта (package.json + package-lock.json, без node_modules):

- **без `.npmrc`**: `npm ci` — **падает** (нестрогий peer-режим npm 11 требует реакцию на peerOptional datetimepicker → «Missing @react-native/metro-config / metro-config / …» в цепочке валидации пиров); `npm install --dry-run` по существующему lock — проходит (lock уже зафиксирован в валидном виде, новый конфликт всплывает при полной пересборке дерева).
- **с `.npmrc`**: `npm ci` — проходит полностью.

Вывод: `.npmrc` **необходима** для надёжной воспроизводимой установки (свежий клон, CI, EAS) — оставляем. Альтернатива без этой строки: закрепление `react-native-windows` (не существует подходящего) или отказ от datetimepicker (не обсуждается —плагин нужен) — безопаснее оставить строку. Версии зависимостей `.npmrc` не меняет; на разрешения установленных пакетов влияет только тем, что не строгает опциональные пиры.

Не менялись: навигационные экраны/анимации, карта, кластеризация, фильтры, дизайн, К-документы, `_x/`, `bag/`.

## Проверенные breaking changes SDK 58 — не задевают проект

- Удаления RN API (`InteractionManager`, root-`Touchable`, Modal `animated`, deprecated StatusBar-пропы, ImageBackground): проект не использует (проверено grep).
- Глубокие импорты `react-native/Libraries/*`: отсутствуют — Strict TypeScript API по умолчанию компилируется.
- expo-router 57→58 (гайд docs.expo.dev/router/migrate/sdk-57-to-58): проект использует только `useRouter` (`push`/`replace`/`back`), `<Stack>` с `headerShown: false`, `<Tabs>` с объявленными экранами и кастомным `tabBar`, `useLocalSearchParams` — все паттерны сохранены; `initialParams`/`redirect`/`Screen options.screen`/`freezeOnBlur` не использовались.
- gesture-handler 3.x: `Gesture.Pan()`/`GestureDetector`/`GestureHandlerRootView` (граббер шторок, прицел шага 1) — deprecated, но доступны; таскание миграции на hook-API не требует SDK.
- `beforeRemove`/`usePreventRemove` — мигрировано (см. выше).
- Модалки: RN `Modal` (modal-card, sheet-modal) — API не изменялся; expo-router-модальные презентации не используются.
- `@expo/ui`/`expo-symbols`/`expo-glass-effect` в коде не импортируются (зависимости остались по манифесту).

## Результаты проверок

- `npx expo-doctor@latest` — **20/20 checks passed**.
- `npx tsc --noEmit` — **0 ошибок** (после правок рефов и гварда).
- `npm run lint` — **exit 0**.

## Приёмка на устройстве — пройдена

Дмитрий провёл приёмку на физическом iPhone (Expo Go, SDK 58) — **8/8 PASS**. Главный итог миграции: проект запускается в текущем Expo Go, прежняя блокировка версий устранена. Перечень этих 8 проверок фиксируется Дмитрием; критические требования (работа карты, сохранение её положения при открытии экранов и модалок, навигация без изменений) — подтверждены приёмкой. Формальный чек-лист §11 геопоиска ТЗ остаётся в перечне проверок `docs/23_10_2026_geosearch_implementation.md`.

## Не проверено (только статика — Metro/симулятор/устройство не запускались)

1. **Карта (критично):** пины/кластеры/Circle, зум-пара `getCamera`/`animateCamera`, сохранение центра/масштаба/фильтров при открытии карточки/поиска/фильтра, геопоиск §11 — всё на устройстве/симе с Expo Go SDK 58.
2. **Навигация по `navigation.md`:** гвард «Выйти без сохранения?» на устройстве: «Назад» из формы с изменениями → модалка; «Выйти» уходит по repeat(); «Остаться» остаётся; после публикации replace не спрашивает.
3. gesture-handler 3.3 в рантайме: свайп-грабберы шторок (SheetModal, шаг 1).

## Запуск на физическом iPhone

1. Установить/обновить **Expo Go** из App Store (SDK 58 — текущая версия магазина; теперь совпадает с проектом — старая причина несброса устранена).
2. Телефон и Mac — в одной сети.
3. Запуск: `npm start` в папке проекта → терминал покажет QR (дев-сервер Metro).
4. Открыть Expo Go → «Scan QR code» (или по push-ссылке через `xcrun simctl` — на iPhone через камеру).
5. При смене сети/порта: `npm start -- --clear` (сброс Metro); подключение по LAN видно в Expo CLI (или `s` для выборки режимов exp://).
6. Если проект открыт с «Could not connect»: проверить IP (`ifconfig`) и совпадение сети (Wi-Fi, не точки доступа).

## Оставшиеся риски

- **`usePreventRemove` — новый контракт для гварда §6:** `repeat()` + `setBaseline` протестированы только статически; поведенческая приёмка обязательна (п.2 выше). До приёмки — риск: если `repeat()` выполняется до подтверждённого освобождения блокировки (гонка рендера), повторный back может снова открыть модалку — поведением гайда покрывается, но проверить.
- gesture-handler 2→3 (major): API совместимы, но это major-версия — свайпы приёмить на устройстве.
- `.npmrc` — постоянная настройка проекта: без неё npm-установки падают; если Дмитрий решит иначе — можно удалить и ставить разово с `--legacy-peer-deps`.
- «Остаться» в модалке выхода не сбрасывает подтверждение — пользователь может вернуться к правкам; повторный back снова спросит (корректно по §6).

Состояние: `main` не тронута (синхронна с origin, последний SHA `eb8d74f`); commit/push ветки не выполнялись.