import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import ButtonIcon from '@/components/button-icon';
import Button from '@/components/button';
import Chip from '@/components/form/chip';
import SheetModal from '@/components/ui/sheet-modal';
import { UI_ICONS } from '@/components/ui-icons';
import { type Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Шторка выбора — K-DS Sheet (мастер 246:4642) через общий SheetModal
 * (overlay bg/overlay + граббер + свайп вниз + тап вне modal, крестик):
 * - тулбар: кнопка-X 44 справа (bg surface-default, без тени), заголовок
 *   Headline 16/20 всегда по центру (255) — центр по ряду кнопок;
 * - опциональная группа чипсов-фильтров 44 flex (315:9146; «Вид рыбы» —
 *   Все/Хищная/Мирная; у «Снасть» чипсов нет — решение Дмитрия 22.10.2026);
 * - строки Cell (227:6530): px 16, py 2, текст Body 16/22, Checkbox 24
 *   справа (p 8): unchecked — bg surface-default, 1px border-control, r4;
 *   checked — 2px action-default + check 18×18 (#176B52);
 * - Bottom Action (238:3948): pt 16 px 16 pb 8: «Очистить» (outline) +
 *   «Применить» (primary), gap 8.
 * Прецедент K 91:5899: без выбора «Применить» disabled; у необязательного
 * одиночного выбора (снасть) «Применить» активен всегда (пусто = очистить).
 *
 * searchable (K 434:4402/434:4904, Дмитрий 23.10 — поиск в шторке «Вид
 * рыбы»): строка K-DS Search 40px между чипсами и списком (Slot 238:3947:
 * Search row px16 py8, поле 40 — в фокусе 2px focus-ring, без фокуса 1px
 * border-control; внешней кнопки у поля в шторке нет). Фильтрация живая,
 * без debounce (локальный список); пусто → «Ничего не найдено»
 * (K 434:5131: px16 py16, Body S 14/20 · 450 secondary, по центру).
 */
export type SheetItem = { name: string; category?: string };

export default function SelectSheet({
  visible,
  title,
  items,
  categories,
  mode,
  initial,
  onApply,
  onClose,
  fullHeight = true,
  searchable = false,
}: {
  visible: boolean;
  title: string;
  items: SheetItem[];
  /** чипсы-фильтры: [все, ...]; передаются только у мульти-выбора видов */
  categories?: readonly string[];
  mode: 'multi' | 'single';
  initial: string[];
  onApply: (selected: string[]) => void;
  onClose: () => void;
  /** Full Height по умолчанию; false — шторка по наполнению (как «Снасть») */
  fullHeight?: boolean;
  /** строка поиска в шторке (K 434:4402/434:4904); включается у шторок видов */
  searchable?: boolean;
}) {
  return (
    <SheetModal visible={visible} onClose={onClose} fullHeight={fullHeight}>
      {/* SheetBody монтируется mount-циклом SheetModal: каждое открытие —
          с текущим значением поля. Выбор коммитится В ПОЛЕ сразу (решение
          Дмитрия 22.10: «Очистить» очищает поле мгновенно, крестик закрывает
          уже применённый выбор); «Применить» подтверждает и закрывает. */}
      <SheetBody
        title={title}
        items={items}
        categories={categories}
        mode={mode}
        initial={initial}
        onApply={onApply}
        onClose={onClose}
        fullHeight={fullHeight}
        searchable={searchable}
      />
    </SheetModal>
  );
}

function SheetBody({
  title,
  items,
  categories,
  mode,
  initial,
  onApply,
  onClose,
  fullHeight = true,
  searchable = false,
}: {
  title: string;
  items: SheetItem[];
  categories?: readonly string[];
  mode: 'multi' | 'single';
  initial: string[];
  onApply: (selected: string[]) => void;
  onClose: () => void;
  fullHeight?: boolean;
  searchable?: boolean;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<string[]>(initial);
  const [category, setCategory] = useState<string>(categories?.[0] ?? '');
  /* поиск (K 434:4402): ввод фильтрует список шторки; состояние на одном
     открытии — SheetBody пересоздаётся на каждое открытие шторки */
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  /* клавиатура (Дмитрий 23.10): по макетам K 434:4402 — при её подъёме
     кнопки «Очистить/Применить» сидят НАД ней, до низа списка доскроллить
     можно. keyboardDidShow — Android (willShow там не эмитится) */
  const [keyboardH, setKeyboardH] = useState(0);
  useEffect(() => {
    const showWill = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardH(e.endCoordinates.height);
    });
    const showDid = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardH((h) => h || e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardH(0);
    });
    return () => {
      showWill.remove();
      showDid.remove();
      hide.remove();
    };
  }, []);
  /* фильтрация по категории: чипс-лейбл → category (порядок categories:
     [Все, ...] — первый всегда «без фильтра»); пустой чипс = без фильтра.
     Поиск (K 434:4402): подстрока без учёта регистра и ё/е («ёрш» = «Ёрш») */
  const visibleItems = useMemo(() => {
    const byCategory = (() => {
      const categoryKey = categories?.indexOf(category) ?? -1;
      const categoryMap = ['predatory', 'peaceful']; /* Хищная, Мирная */
      if (categoryKey > 0) {
        return items.filter((it) => it.category === categoryMap[categoryKey - 1]);
      }
      return items;
    })();
    const q = query.trim().toLowerCase().replace(/ё/g, 'е');
    if (!q) {
      return byCategory;
    }
    return byCategory.filter((it) => it.name.toLowerCase().replace(/ё/g, 'е').includes(q));
  }, [items, category, categories, query]);

  /* выбор коммитится в поле сразу (Дмитрий 22.10):
     снасть (single) — тап выбирает и ЗАКРЫВАЕТ шторку, кнопок нет;
     виды (multi) — тап/«Очистить» применяют сразу, «Применить» закрывает */
  const commit = (next: string[], close = false) => {
    setDraft(next);
    onApply(next);
    if (close) onClose();
  };

  const toggle = (name: string) => {
    if (mode === 'single') {
      /* одиночный: повторный тап по выбранному снимает выбор (необязательное) */
      commit(draft[0] === name ? [] : [name], true);
    } else {
      commit(draft.includes(name) ? draft.filter((n) => n !== name) : [...draft, name]);
    }
  };

  /* пустой мульти-выбор блокирует Применить (K 91:5899) */
  const applyDisabled = mode === 'multi' ? draft.length === 0 : false;
  const clearDisabled = draft.length === 0;

  return (
    <View
      style={[
        staticStyles.content,
        /* content-режим: высота по наполнению (без flex-растяжения);
           список при переполнении капится maxHeight на самой шторке.
           Принцип панели отчёта (K 87:4145): при открытой клавиатуре
           safe-area-inset исключён — клавиатурай накрыта зона home-индикатора,
           нижний край = keyboardH + pb 8 кнопок */
        !fullHeight && staticStyles.contentWrap,
        { paddingBottom: keyboardH > 0 ? keyboardH : 8 + insets.bottom },
      ]}>
      {/* тулбар после граббера SheetModal: ряд 44 + pb 8 (K-DS 224:987) */}
      <View style={staticStyles.sheetToolbar}>
        <View style={staticStyles.toolbarRow}>
          <ButtonIcon icon="close" type="toolbar" onPress={onClose} accessibilityLabel="Закрыть" />
        </View>
        <View style={staticStyles.sheetTitleWrap} pointerEvents="none">
          <View style={staticStyles.sheetTitleBox}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
      </View>

      {/* контент: чипсы-фильтры + список (Slot 238:3947) */}
      {categories != null && categories.length > 0 && (
        <View style={staticStyles.chipGroup}>
          {categories.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={c === category}
              size="lg"
              flex
              onPress={() => setCategory(c)}
            />
          ))}
        </View>
      )}
      {/* поиск (K 434:4402): K-DS Search row — px16 py8, поле 40; внешней
          кнопки в шторке нет (макет); border 2 focus / 1 default (434:4931) */}
      {searchable && (
        <View style={staticStyles.searchRow}>
          <View
            style={[
              styles.searchField,
              searchFocused ? styles.searchFieldFocus : styles.searchFieldIdle,
            ]}>
            <View style={staticStyles.searchIconBox}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d={UI_ICONS.magnifyingGlass.d} fill={palette.text} />
              </Svg>
            </View>
            <TextInput
              style={[styles.searchInput, rnTextStyle(TEXT.body), { fontFamily: FONT_FAMILY }]}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel={`Поиск: ${title}`}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityLabel="Очистить поиск"
                onPress={() => setQuery('')}
                style={staticStyles.searchIconBox}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d={UI_ICONS.circleXmark.d} fill={palette.text} />
                </Svg>
              </Pressable>
            )}
          </View>
        </View>
      )}
      <ScrollView
        style={[staticStyles.list, !fullHeight && staticStyles.listContent]}
        /* без резерва снизу: высоту клавиатуры съедает paddingBottom
           контейнера шторки — список ужат над клавиатурой, белого
           хвоста после последнего пункта нет (Дмитрий 23.10) */
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled">
        {visibleItems.length === 0 && searchable ? (
          /* пустой поиск: K 434:5131 — px16 py16, Body S, по центру */
          <View style={staticStyles.emptyMessage}>
            <Text style={[styles.emptyText, rnTextStyle(TEXT.bodyS), { fontFamily: FONT_FAMILY }]}>
              Ничего не найдено
            </Text>
          </View>
        ) : (
          visibleItems.map((item) => {
            const checked = draft.includes(item.name);
            return (
              <Pressable
                key={item.name}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={item.name}
                onPress={() => toggle(item.name)}
                style={staticStyles.cell}>
                {/* Cell (K-DS 268:980): ряд без вертикали, py 8 — на колонках */}
                <View style={staticStyles.cellRow}>
                  <View style={staticStyles.cellTextWrap}>
                    <Text style={styles.cellText}>{item.name}</Text>
                  </View>
                  <View style={staticStyles.cellRight}>
                    {/* Checkbox (268:901/1024, multi) / Radio (268:969/1034, single) */}
                    <View
                      style={[
                        styles.checkbox,
                        checked && styles.checkboxChecked,
                        mode === 'single' && staticStyles.radio,
                      ]}>
                      {checked &&
                        (mode === 'single' ? (
                          /* точка 10×10 r8 (429:200/268:1034, bg #176b52) */
                          <View style={styles.radioDot} />
                        ) : (
                          <Svg width={18} height={18} viewBox="0 0 18 18">
                            <Path d={UI_ICONS.check.d} fill={palette.accent} />
                          </Svg>
                        ))}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Action (238:3948): Очистить + Применить — только multi
          (у снасти кнопок нет: тап закрывает, решение Дмитрия 22.10).
          Подъём над клавиатурой делает paddingBottom контейнера выше
          (keyboardH без inset — K 87:4145), уряд пб остаётся 8 */}
      <View style={[staticStyles.actions, mode === 'single' && staticStyles.actionsHidden]}>
        <Button
          label="Очистить"
          mode="secondary" appearance="outline"
          flex
          disabled={clearDisabled}
          onPress={() => commit([])}
        />
        <Button
          label="Применить"
          mode="primary" appearance="accent"
          flex
          disabled={applyDisabled}
          /* выбор уже закоммичен тапами/Очистить — Применить закрывает */
          onPress={applyDisabled ? undefined : onClose}
        />
      </View>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  content: {
    flex: 1, /* Full Height: контент занимает шторку (K-DS 238:3945) */
  },
  contentWrap: {
    flex: 0, /* content-режим: высота по наполнению */
  },
  sheetToolbar: {
    paddingHorizontal: 16,
    paddingBottom: 8, /* K-DS 224:987 (нижний py); верх — граббер SheetModal */
  },
  toolbarRow: {
    height: 44, /* ряд кнопок (Button-Icon 44) */
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  sheetTitleWrap: {
    /* Title (224:997) центр 255 — центр = центр РЯДА кнопок; граббер-зона
       уже выше в SheetModal, тулбар начинается с ряда */
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitleBox: {
    width: 255, /* зона тайтла 255 (224:997) */
    alignItems: 'center',
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchRow: {
    /* Search row (K 434:4931): px16 py8, без внешней кнопки; SheetModal
       уже отступает от тулбара — только py сверху/снизу */
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchIconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMessage: {
    /* message (K 434:5131): p (md, 16); Body S по центру */
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  list: {
    flex: 1, /* Full Height: контент занимает шторку (K-DS 238:3945) */
    paddingHorizontal: 16,
  },
  listContent: {
    /* content-режим: список сам по высоте контента */
    flex: 0,
  },
  cell: {
    /* Cell (K-DS 268:980): px 16 (на списке), py 2; вертикаль — на колонках */
    paddingVertical: 2,
  },
  cellRow: {
    /* ряд БЕЗ вертикали: py 8 принадлежит колонкам (268:1023/1028),
       иначе высота строки надбавляется дважды */
    flexDirection: 'row',
    alignItems: 'center',
  },
  cellTextWrap: {
    /* Layuot Txt (268:1023): py 8 на текстовой колонке */
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    paddingVertical: 8,
    alignItems: 'center',
  },
  cellRight: {
    padding: 8, /* x/Cell/Right: p 8 (268:1028) */
  },
  radio: {
    /* Radio 268:969: круглый (radius/md = 16) */
    borderRadius: 16,
  },
  actionsHidden: {
    /* single-режим: Bottom Action не рендерится (выбор тапом) */
    display: 'none',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    sheetTitle: {
      ...rnTextStyle(TEXT.headline),
      fontFamily: FONT_FAMILY,
      color: palette.text,
      textAlign: 'center',
    },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40, /* dimensions/size/xl — K-DS Search (мастер 429:10650) */
      borderRadius: 12,
      borderCurve: 'continuous',
      backgroundColor: palette.cardSurface,
    },
    searchFieldFocus: {
      /* State Focus: 2px --color-focus-ring (K 434:4931 → 223:941) */
      borderWidth: 2,
      borderColor: palette.focusRing,
    },
    searchFieldIdle: {
      /* без фокуса: 1px --color-border-control (K 432:11759, прецедент) */
      borderWidth: 1,
      borderColor: palette.borderControl,
    },
    searchInput: {
      flex: 1,
      color: palette.text,
      minHeight: 40,
      paddingVertical: 0,
    },
    emptyText: {
      color: palette.textSecondary,
      textAlign: 'center',
    },
    cellText: {
      ...rnTextStyle(TEXT.body),
      fontFamily: FONT_FAMILY,
      color: palette.text,
      alignSelf: 'stretch',
      textAlign: 'left',
    },
    checkbox: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 4, /* radius/2xs (227:6513) */
      borderCurve: 'continuous',
      backgroundColor: palette.cardSurface,
      borderWidth: 1,
      borderColor: palette.borderControl,
    },
    checkboxChecked: {
      borderWidth: 2,
      borderColor: palette.accent,
      /* 268:1024 */
    },
    radioDot: {
      /* Radio checked (429:200/268:1034): точка 10×10, r8, bg #176b52 */
      width: 10,
      height: 10,
      borderRadius: 8,
      backgroundColor: palette.accent,
    },
  });