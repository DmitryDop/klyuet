import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import ButtonUi from '@/components/button-ui';
import Button from '@/components/button';
import Chip from '@/components/form/chip';
import SheetModal from '@/components/ui/sheet-modal';
import { UI_ICONS } from '@/components/ui-icons';
import { Colors } from '@/constants/theme';
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
}: {
  title: string;
  items: SheetItem[];
  categories?: readonly string[];
  mode: 'multi' | 'single';
  initial: string[];
  onApply: (selected: string[]) => void;
  onClose: () => void;
  fullHeight?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<string[]>(initial);
  const [category, setCategory] = useState<string>(categories?.[0] ?? '');

  const visibleItems = useMemo(
    () =>
      category === '' || category === categories?.[0]
        ? items
        : items.filter((it) => it.category === category),
    [category, categories, items],
  );

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
        styles.content,
        /* content-режим: высота по наполнению (без flex-растяжения);
           список при переполнении капится maxHeight на самой шторке */
        !fullHeight && styles.contentWrap,
        { paddingBottom: 8 + insets.bottom },
      ]}>
      {/* тулбар после граббера SheetModal: ряд 44 + pb 8 (K-DS 224:987) */}
      <View style={styles.sheetToolbar}>
        <View style={styles.toolbarRow}>
          <ButtonUi icon="close" type="toolbar" onPress={onClose} accessibilityLabel="Закрыть" />
        </View>
        <View style={styles.sheetTitleWrap} pointerEvents="none">
          <View style={styles.sheetTitleBox}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
      </View>

      {/* контент: чипсы-фильтры + список (Slot 238:3947) */}
      {categories != null && categories.length > 0 && (
        <View style={styles.chipGroup}>
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
      <ScrollView
        style={[styles.list, !fullHeight && styles.listContent]}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}>
        {visibleItems.map((item) => {
          const checked = draft.includes(item.name);
          return (
            <Pressable
              key={item.name}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={item.name}
              onPress={() => toggle(item.name)}
              style={styles.cell}>
              {/* Cell (K-DS 268:980): ряд без вертикали, py 8 — на колонках */}
              <View style={styles.cellRow}>
                <View style={styles.cellTextWrap}>
                  <Text style={styles.cellText}>{item.name}</Text>
                </View>
                <View style={styles.cellRight}>
                  {/* Checkbox (268:901/1024, multi) / Radio (268:969/1034, single) */}
                  <View
                    style={[
                      styles.checkbox,
                      checked && styles.checkboxChecked,
                      mode === 'single' && styles.radio,
                    ]}>
                    {checked &&
                      (mode === 'single' ? (
                        /* точка 10×10 r8 (429:200/268:1034, bg #176b52) */
                        <View style={styles.radioDot} />
                      ) : (
                        <Svg width={18} height={18} viewBox="0 0 18 18">
                          <Path d={UI_ICONS.check.d} fill="#176b52" />
                        </Svg>
                      ))}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bottom Action (238:3948): Очистить + Применить — только multi
          (у снасти кнопок нет: тап закрывает, решение Дмитрия 22.10) */}
      <View style={[styles.actions, mode === 'single' && styles.actionsHidden]}>
        <Button
          label="Очистить"
          variant="outline"
          flex
          disabled={clearDisabled}
          onPress={() => commit([])}
        />
        <Button
          label="Применить"
          variant="primary"
          flex
          disabled={applyDisabled}
          /* выбор уже закоммичен тапами/Очистить — Применить закрывает */
          onPress={applyDisabled ? undefined : onClose}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sheetToolbar: {
    paddingHorizontal: 16,
    paddingBottom: 8, /* K-DS 224:987 (нижний py); верх — граббер SheetModal */
  },
  toolbarRow: {
    height: 44, /* ряд кнопок (button-ui 44) */
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
  sheetTitle: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
    textAlign: 'center',
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    flex: 1, /* Full Height: контент занимает шторку (K-DS 238:3945) */
  },
  contentWrap: {
    flex: 0, /* content-режим: высота по наполнению */
  },
  list: {
    flex: 1,
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
  cellText: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  cellRight: {
    padding: 8, /* x/Cell/Right: p 8 (268:1028) */
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4, /* radius/2xs (227:6513) */
    borderCurve: 'continuous',
    backgroundColor: Colors.light.cardSurface,
    borderWidth: 1,
    borderColor: Colors.light.borderControl,
  },
  checkboxChecked: {
    borderWidth: 2,
    borderColor: Colors.light.accent,
    /* 268:1024 */
  },
  radio: {
    /* Radio 268:969: круглый (radius/md = 16) */
    borderRadius: 16,
  },
  radioDot: {
    /* Radio checked (429:200/268:1034): точка 10×10, r8, bg #176b52 */
    width: 10,
    height: 10,
    borderRadius: 8,
    backgroundColor: '#176b52',
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