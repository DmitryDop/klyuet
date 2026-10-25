# K-DS — переменные (экспорт `_x/25_10_2026_K-DS_variables.json`) — фиксация значений и противоречия

## Задача

Зафиксировать значения переменных из экспорта переменных K-DS и найти
противоречия. Экспорт — снимок файла `AdQjv6kqqQG7IMjOAiW62k` (K-DS)
25.10.2026: коллекции «Primitives» (Default, 91), «Klyot · Color»
(Light/Dark, 49 × 2), «Typography» (Mode 1, единственная: Font Family/Sans = **Onest**).

Экспорт — новый артефакт: он ДАЁТ Dark-палитру (в K-DS она есть) и
описания переменных `$description`, в части которых стоят значения
с пометкой **«Задано Дмитрием»**. Этого MCP при чтении макетов не отдавал
(подтверждённая в памяти ограниченность get_variable_defs снимается).

## 1. Примитивы «Primitives» (Default)

### Dimensions

| Токен | Значение | Токен | Значение |
|---|---|---|---|
| spacing/none | 0 | radius/none | 0 |
| spacing/3xs | 2 | radius/3xs | 2 |
| spacing/2xs | 4 | radius/2xs | 4 |
| spacing/xs | 8 | radius/xs | 8 |
| spacing/sm | 12 | radius/sm | 12 |
| spacing/md | 16 | radius/md | 16 |
| spacing/lg | 20 | radius/lg | 24 |
| spacing/xl | 24 | radius/xl | 32 |
| spacing/2xl | 32 | radius/full | 9999 |
| spacing/3xl | 40 | | |
| spacing/4xl | 48 | | |
| spacing/5xl | 64 | | |

| size/4xs | 2 | stroke/05 | 0.5 |
|---|---|---|---|
| size/3xs | 4 | stroke/1 | 1 |
| size/2xs | 8 | stroke/2 | 2 |
| size/xs | 12 | stroke/3 | 3 |
| size/sm | 16 | stroke/4 | 4 |
| size/md | 24 | | |
| size/lg | 32 | | |
| size/xl | 40 | | |
| size/2xl | 44 | | |
| size/3xl | 48 | | |
| size/4xl | 56 | | |
| size/5xl | 64 | | |

`opacity/*`: 5…90 с шагом 10 (всё целое число, не px).

### Цвета-примитивы

| Токен | HEX | Токен | HEX | Токен | HEX |
|---|---|---|---|---|---|
| stone/000 | #FFFFFF | stone/060 | #AEB8B2 | river/000 | #DFEDF0 |
| stone/010 | #FAFAF6 | stone/070 | #838F87 | river/030 | #79AEBC |
| stone/020 | #F8F9F5 | stone/080 | #77837B | river/040 | #5793A2 |
| stone/030 | #F1F2ED | stone/100 | #59625E | river/070 | #376D7B |
| stone/040 | #E8ECE5 | stone/110 | #3D4D44 | river/080 | #2E5E6B |
| stone/050 | #CCD4CB | stone/120 | #29332F | river/110 | #21363C |
| stone/130 | #222C27 | stone/140 | #18201D | stone/160 | #181D1C |
| stone/170 | #101714 | | | | |

forest: forest/020 #D8E8DF, /030 #B8D3B9, /050 #62C397, /060 #43A77E,
/070 #35916B, /080 #176B52, /090 #125640, /100 #0D4735, /110 #263F34,
/140 #173D30.

amber: /010 #F4E3C5, /040 #E2A647, /050 #D18A24, /080 #82500D, /100 #3C301B.

red: /000 #F7E2DF, /010 #F18B83, /020 #DC6C64, /030 #B84A42, /040 #A83F37,
/050 #3D2523.

## 2. Семантика «Klyot · Color» — Light и Dark

Разрешённые значения (алиас в примитивы, если нет — литерал с альфой):

| Переменная | Light | Dark |
|---|---|---|
| bg/primary | #E8ECE5 | #101714 |
| bg/secondary | #CCD4CB | #18201D |
| bg/overlay | #18201D @40% | #101714 @40% |
| surface/default | #F8F9F5 | #222C27 |
| surface/raised | #FFFFFF | #29332F |
| text&icon/primary | #181D1C | #F8F9F5 |
| text&icon/primary_alpha_20 | #181D1C @20% | #F8F9F5 @20% |
| text&icon/secondary | #59625E | #AEB8B2 |
| text&icon/tertiary | #838F87 | #59625E |
| text&icon/on | #FFFFFF | #101714 |
| border/subtle | #CCD4CB | #3D4D44 |
| border/control | #838F87 | #77837B |
| border/clipping | #FFFFFF | #101714 |
| action/default | #176B52 | #43A77E |
| action/hover | #125640 | #62C397 |
| action/pressed | #0D4735 | #35916B |
| selection/bg | #D8E8DF | #173D30 |
| selection/text | #125640 | #62C397 |
| info/default | #376D7B | #5793A2 |
| info/text | #2E5E6B | #79AEBC |
| info/bg | #DFEDF0 | #21363C |
| bite/default | #D18A24 | #E2A647 |
| bite/text | #82500D | #E2A647 |
| bite/bg | #F4E3C5 | #3C301B |
| danger/default | #B84A42 | #DC6C64 |
| danger/hover | #A83F37 | #F18B83 |
| danger/pressed | #3D2523 | #B84A42 |
| danger/text | #A83F37 | #F18B83 |
| danger/bg | #F7E2DF | #3D2523 |
| focus/ring | #176B52 | #62C397 |
| disabled/bg | #E8ECE5 | #29332F |
| disabled/text | #59625E | #AEB8B2 |
| overlay/point | #176B52 | #62C397 |
| overlay/point_alpha_10 | #176B52 @20% | #62C397 @20% |
| overlay/point-on | #FFFFFF | #101714 |
| overlay/point-selected | #125640 | #E2A647 |
| overlay/cluster | #263F34 | #B8D3B9 |
| overlay/cluster-on | #FFFFFF | #101714 |
| overlay/marker-halo | #FAFAF6 | #101714 |
| overlay/catch | #D18A24 | #E2A647 |
| overlay/catch-on | #181D1C | #101714 |
| button_small/default | #FFFFFF @90% | #222C27 @90% |
| button_small/pressed | #FFFFFF @50% | #222C27 @30% |
| button_small/raised | #FFFFFF | #29332F |
| toggle/surface_off | #B8D3B9 | #B8D3B9 |
| toggle/surface_on | #35916B | #62C397 |
| toggle/knob | #FFFFFF | #263F34 |
| tab_bar/default | #FAFAF6 @90% | #222C27 @90% |
| tab_bar/raised | #FFFFFF | #29332F |

## 3. Противоречия

### 3.1. $description «Задано Дмитрием» vs фактическое $value — главный конфликт

В `$description` половины семантических переменных записаны значения
с пометкой «Задано Дмитрием», которые **не совпадают** с разрешённым
`$value` (алиасом в примитив). Описания — рукописные данные Дмитрия,
алиасы — фактические привязки; файл противоречит сам себе, и решать,
какая сторона истина, только Дмитрию.

| Переменная | $description (Дмитрий) | $value | Расхождение примитивов |
|---|---|---|---|
| **bg/primary L** | #F1F2ED (это stone/030) | #E8ECE5 (stone/040) | сдвиг шкалы на одну клетку |
| **bg/secondary L** | #E7EAE3 | #CCD4CB (stone/050) | #E7EAE3 среди примитивов отсутствует |
| **surface/default L** | #FAFAF6 (stone/010) | #F8F9F5 (stone/020) | сдвиг шкалы |
| **border/subtle L** | #CDD2CB | #CCD4CB (stone/050) | почти то же, но другой HEX |
| **border/control L** | #748078 | #838F87 (stone/070) | другой тон серого |
| disabled/bg L | #E7EAE3 | #E8ECE5 (stone/040) | отсутствует в примитивах |
| **button_small/default L** | #FAFAF6 | #FFFFFF @90% | белая полупрозрачная vs непрозрачный #FAFAF6 |
| button_small/pressed L | #FFFFFF (без альфы) | #FFFFFF @50% | альфа потерялась в описании |
| **bg/primary D** | #111715 | #101714 (stone/170) | близко, другой HEX |
| **surface/default D** | #202925 | #222C27 (stone/130) | другой HEX |
| **text&icon/primary D** | #F2F4EF | #F8F9F5 (stone/020) | другой HEX |
| **text&icon/primary_alpha_20 D** | #F2F4EF | #F8F9F5 (stone/020) @20% | другой HEX + без альфы в описании |
| **text&icon/on D** | #111715 | #101714 (stone/170) | другой HEX |
| **border/subtle D** | #36423D | #3D4D44 (stone/110) | другой HEX |
| **border/control D** | #72847A | #77837B (stone/080) | другой HEX |
| **tab_bar/default D** | #202925 | #222C27 @90% | другой HEX |

Обновление 25.10 после программного прохода + чтения живых описаний
K-DS (use_figma, 25.10.2026). Экспорт-снимок оказался старее правок в
файле: по bg/primary, bg/secondary, surface/default, border/control
описания в K-DS уже совпадают с `$value`. Текущих несовпадений
описания с `$value` — **7** (border/subtle L #CDD2CB vs #CCD4CB;
text&icon/primary D, text&icon/primary_alpha_20 D — #F2F4EF vs #F8F9F5;
text&icon/on D #111715 vs #101714; disabled/bg L #E7EAE3 vs #E8ECE5;
button_small/default L #FAFAF6 vs #FFFFFF@90%; tab_bar/default D
#202925 vs #222C27@90%). Альфа в описании не нормируется — снимается
как категория. Итоговая верификация 25.10: полная цепочка алиасов всех
49 семантических переменных разрешена напрямую в живом K-DS
(use_figma) — свет/тёмная совпали со снапшотом и `theme.ts` целиком;
5 альфа-литеральных значений (bg/overlay, primary_alpha_20,
button_small/default, button_small/pressed, tab_bar/default)
подтверждены узловыми привязками (#18201d66, #181d1c33, #ffffffe5,
#ffffff70.../ K #fafaf6e5). Сводная таблица реестра (Light/Dark +
сверка с theme.ts):
`bag/25_10_2026_kds-variables-conflicts.html`.

Остальные описания совпадают с `$value` (bg/secondary D, surface/raised,
text&icon/secondary, action, selection, info, bite, danger, focus,
disabled/text, overlay, tab_bar/default L, button_small D).

**Влияние на код.** `theme.ts` и подтверждённые через get_variable_defs
привязки узлов соответствуют именно **$value**: background #e8ece5,
cardSurface #f8f9f5, borderSubtle #ccd4cb, borderControl #838f87, тень
поверх кнопок — #ffffff @90%. Если истина — «Задано Дмитрием», под
разрыв попадают: фон всего приложения (bg/primary), все карточки
(surface/default), границы списков (border/subtle), границы outline-кнопок
(border/control), фон поверх карты кнопок (button_small/default). Это уже
не «одна клетка шкалы», а разные поверхности — поэтому до решения не
менять ни файл переменных K-DS, ни `theme.ts`.

**Арбитраж 25.10 (Дмитрий):** по **bg/primary** истина — `$value`
(Light #E8ECE5 · Dark #101714); описание «#F1F2ED» устарело.
Проверка по узлам (render-истина Figma): три чтения get_variable_defs
25.10 — K 500:11242 (bg/primary #e8ece5, surface/default #f8f9f5,
toggle/knob #ffffff, tab_bar #fafaf6e5), K-DS 517:1143 (toggle) и
K-DS 461:810 (button_small/default **#ffffffe5** = белый @90%, а не
описание #FAFAF6) — все сходятся с `$value`. Решение распространено на
все конфликтные переменные: **истина — $value**; `theme.ts` не требует
правки.

**Финал 25.10 (поздняя правка Дмитрия в K-DS):** все оставшиеся описания
исправлены — `border/subtle L`, `text&icon/primary D`, `primary_alpha_20 D`,
`text&icon/on D`, `disabled/bg L`, `button_small/default L`,
`tab_bar/default D` — теперь HEX в описаниях = `$value`; противоречий 0.
Имя `overlay/point_alpha_10` переименовано в **`overlay/point_alpha_20`**
(значение 20% теперь соответствует имени; привязки целы — Figma хранит
по id). Альфа в описаниях не нормируется — не считается расхождением.
Таблица `bag/25_10_2026_kds-variables-conflicts.html` приведена к этому
состоянию (реестр по значениям остаётся сводно-справочным). Описания на
работу над тёмной темой не влияют: реализация опирается на значения и
привязки (valuesByMode), сверенные с `theme.ts`.

### 3.2. Имя vs значение

- **overlay/point_alpha_10** — в имени 10%, в значении альфа **0.2 (20%)**.
  В `theme.ts` `pointAlpha` = #176B5233 соответствует значению (20%),
  не имени. При переименовании не потерять смысл (либо имя «10» верно и
  значение поменяют — тогда в коде надо править).

Альфа в `$description` не нормируется (решение Дмитрия 25.10): отсутствие
процентов в описании — не противоречие, значение несёт альфа самого
`$value` (bg/overlay 40%, button_small 90/50/30%, tab_bar 90%).

### 3.3. Неожиданности Dark (не противоречия, а контраст с Light)

- **toggle/knob D = forest/110 #263F34** — бегунок тумблера в тёмной теме
  тёмно-зелёный, НЕ белый (в задаче `_x/28.md` в Light — белый).
- **overlay/point-selected D = amber/040 #E2A647** — выбранный пин на карте
  станет янтарным. Поведение выбранной точки в Dark радикально другое.
- **danger/pressed D = red/030 #B84A42** (это danger/default L), а
  danger/default D краснее (red/020) — «пресс» в Dark менее глубокий.
- **bite/text D = bite/default D = amber/040** — текст «клёва» и точка в
  Dark одного цвета; текст теряет выделение.
- toggle/surface_off в Dark — тот же forest/030 (не затемнён).

### 3.4. Семантический дубль-рис

- bg/secondary и border/subtle в Light — один и тот же примитив stone/050;
  в Dark они расходятся (stone/140 vs stone/110). Считать разные имена
  разными токенами (прецедент surface-default), не схлопывать.
- В описаниях surface/raised / button_small/raised / tab_bar/raised —
  примечание «Light = surface-strong»: в Dark все три уводят в stone/120.

## 4. Прежние гипотезы из памяти — что теперь подтверждено

| Было (не доказано MCP-чтением) | Экспорт |
|---|---|
| TabBarSurface rgba(250,250,246,0.90) | ✓ tab_bar/default #FAFAF6 @90% |
| TabBarSurfaceDark rgba(34,44,39,0.90) | ✓ Dark #222C27 @90% |
| Button-Icon default #FFFFFFE5 = «происхождение альфы не доказано» | ✓ button_small/default 90% (light) |
| Button-Icon Dark pressed #222C274D | ✓ Dark_pressed @30% |
| scrim / bg/overlay #18201D66 | ✓ bg/overlay @40% |
| grabber rgba(24,29,28,0.2) | ✓ primary_alpha_20 @20% |
| pointAlpha #176B5233 (20%) | ✓ (но см. имя `_10`, п. 3.2) |
| catch #D18A24 (Light) /Dark amber.040 | ✓ |
| Тёмная палитра «не подтверждена» | **подтверждена, присутствует (49)** |

## 5. Не перенесено в `theme.ts` (значения теперь известны)

info/default /text /bg, bite/bg /text, disabled/bg /text, bg/secondary,
border/clipping, action/hover, danger/hover /bg, overlay/cluster
/cluster-on /point-selected, tab_bar/raised, button_small/raised,
toggle-тёмные значения. Все — в таблице §2, Dark-значения фиксируются, но
в код не вносятся (тёмная тема — отдельная задача и по ней есть команда
«остановиться»).

## Вывод

1. Главный блокер — конфликт «Задано Дмитрием» vs `$value`/алиасы §3.1
   (bg/primary, surface/default, border/subtle, border/control,
   button_small/default + Dark-пары). Нужен арбитраж Дмитрия: истина в
   описаниях или в привязках к примитивам; до решения код не менять.
2. Прежние альфа-сомнения (таб-бар, Button-Icon, scrim, граббер, пульс-точка)
   снялись полностью — совпадение с `theme.ts`.
3. Dark-палитра в K-DS есть в полном объёме (это снимает ограничение
   из `_x/27.md` и memory тем) — реализация Dark по-прежнему ждёт команды.
4. Имя `_alpha_10` при 20% — исправить в K-DS или менять значение; иначе
   имя продолжит жить своей жизнью в документах и коде.