import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Button from '@/components/button';
import ButtonIcon from '@/components/button-icon';
import Chip from '@/components/form/chip';
import FormSelect from '@/components/form/form-select';
import SelectSheet from '@/components/form/select-sheet';
import { SPECIES_CATALOG } from '@/data/catalog';
import { getAppliedMapFilter, setAppliedMapFilter } from '@/data/filter-store';
import { DEFAULT_MAP_FILTER, RECENCY_OPTIONS, type MapFilter } from '@/logic/filter';
import type { Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Экран «Фильтр» карты — K 101:6980; шторка давности — K 407:10759.
 * Полный экран поверх карты (push, карта остаётся смонтированной —
 * сохранение центра/масштаба, map-place-flows-mvp.md §2).
 *
 * Черновая модель: изменения групп до «Показать» карту не трогают;
 * «Показать» коммитит черновик применённым и закрывает; «Сбросить» возвращает
 * черновик к умолчаниям (§5); крестик закрывает без применения.
 * Шторка рыбы — мульти, живое применение в черновик (K 91:6113; поиск —
 * отдельный макет Дмитрия, добавить потом); шторка давности — радио,
 * кнопок нет, выбор сразу (407:10759 — как «Снасть» reports_implementation).
 */

const PLACE_TYPE_OPTIONS: { value: MapFilter['placeType']; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'wild', label: 'Дикие' },
  { value: 'paid', label: 'Платные' },
];

const CATCH_OPTIONS: { value: MapFilter['catchStatus']; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'with_catch', label: 'С уловом' },
  { value: 'without_catch', label: 'Без улова' },
];

const METHOD_OPTIONS: { value: MapFilter['method']; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'shore', label: 'С берега' },
  { value: 'boat', label: 'С лодки' },
];

/* подпись поля «Давность отчетов» — то же значение, что выбрано в шторке */
function recencyLabel(value: MapFilter['recencyDays']): string {
  return RECENCY_OPTIONS.find((o) => o.value === value)?.label ?? 'Все';
}

/* шторка давности: выбор радио → значение группы; пустой выбор (повторный
   тап по выбранному) = «Все» */
const RECENCY_ITEMS = RECENCY_OPTIONS.map((o) => ({ name: o.label }));

function recencyValue(label: string): MapFilter['recencyDays'] {
  return RECENCY_OPTIONS.find((o) => o.label === label)?.value ?? 'all';
}

export default function FilterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = makeStyles(palette);
  /* черновик: снимок применённых значений на момент открытия (§5) */
  const [draft, setDraft] = useState<MapFilter>(() => getAppliedMapFilter());
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [recencyOpen, setRecencyOpen] = useState(false);

  const patch = useCallback(
    (next: Partial<MapFilter>) => setDraft((prev) => ({ ...prev, ...next })),
    [],
  );

  /* Крестик и «Показать» — единственные выходы; крестик не применяет */
  const close = () => router.back();
  const apply = () => {
    setAppliedMapFilter(draft);
    router.back();
  };

  const speciesValue = draft.species.length > 0 ? draft.species.join(', ') : 'Все';

  return (
    <View style={styles.container}>
      {/* тулбар: крестик справа, заголовок по центру ряда (K 101:6981) */}
      <View style={[styles.toolbar, { height: insets.top + 60 }]}>
        <View style={[styles.toolbarButtonRight, { top: insets.top + 8 }]}>
          <ButtonIcon
            icon="close"
            type="toolbar"
            onPress={close}
            accessibilityLabel="Закрыть без применения"
          />
        </View>
        <View style={[styles.toolbarTitleWrap, { top: insets.top + 8, bottom: 8 }]}>
          <View style={styles.toolbarTitleBox}>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              Фильтр
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 128 + insets.bottom }}
        showsVerticalScrollIndicator={false}>
        {/* Тип места (101:6990) — по данным места, независимо от отчётов */}
        <ChipGroup
          label="Тип места"
          options={PLACE_TYPE_OPTIONS}
          value={draft.placeType}
          onChange={(v) => patch({ placeType: v })}
        />

        {/* Вид рыбы (101:6991) — мульти, шторка K 91:6113; ИЛИ внутри выбора */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Вид рыбы</Text>
          <FormSelect
            value={speciesValue}
            placeholder="Все"
            icon="chevronDown"
            focused={speciesOpen}
            onPress={() => setSpeciesOpen(true)}
          />
        </View>

        {/* Давность отчетов (101:6992) — радио-шторка 407:10759; по publishedAt */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Давность отчетов</Text>
          <FormSelect
            value={recencyLabel(draft.recencyDays)}
            placeholder="Все"
            icon="chevronDown"
            focused={recencyOpen}
            onPress={() => setRecencyOpen(true)}
          />
        </View>

        {/* Результат рыбалки (106:1311) — по данным отчёта */}
        <ChipGroup
          label="Результат рыбалки"
          options={CATCH_OPTIONS}
          value={draft.catchStatus}
          onChange={(v) => patch({ catchStatus: v })}
        />

        {/* Способ ловли (106:1325) — по данным отчёта (не по Place.fishing) */}
        <ChipGroup
          label="Способ ловли"
          options={METHOD_OPTIONS}
          value={draft.method}
          onChange={(v) => patch({ method: v })}
        />
      </ScrollView>

      {/* Bottom Action (101:6996): pt 16 px 16 pb 8, кнопки 48 flex, gap 8 */}
      <View style={[styles.actions, { paddingBottom: 8 + insets.bottom }]}>
        <Button
          label="Сбросить"
          mode="secondary" appearance="outline"
          flex
          onPress={() => setDraft(DEFAULT_MAP_FILTER)}
        />
        <Button label="Показать" mode="primary" appearance="accent" flex onPress={apply} />
      </View>

      {/* шторка вида рыбы: мульти, чипсы-категории, поиск (K 434:4402),
          живое применение в черновик (K 91:6113) */}
      <SelectSheet
        visible={speciesOpen}
        title="Вид рыбы"
        items={SPECIES_CATALOG}
        categories={['Все', 'Хищная', 'Мирная']}
        mode="multi"
        searchable
        initial={draft.species}
        onApply={(sel) => patch({ species: sel })}
        onClose={() => setSpeciesOpen(false)}
      />

      {/* шторка давности (407:10759): радио, кнопок нет, тап = выбор и закрытие */}
      <SelectSheet
        visible={recencyOpen}
        title="Давность отчетов"
        items={RECENCY_ITEMS}
        mode="single"
        initial={[recencyLabel(draft.recencyDays)]}
        fullHeight={false}
        onApply={(sel) => patch({ recencyDays: recencyValue(sel[0] ?? 'Все') })}
        onClose={() => setRecencyOpen(false)}
      />
    </View>
  );
}

/* Chip Group (101:6990): label 14/18 secondary, slot 8, чипы 44 flex */
function ChipGroup<Value extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: Value; label: string }[];
  value: Value;
  onChange: (v: Value) => void;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={value === o.value}
            flex
            onPress={() => onChange(o.value)}
          />
        ))}
      </View>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.cardSurface, /* surface-default (101:6980) */
  },
  toolbar: {
    /* Toolbar - Top - iPhone: как форма отчёта, кнопки top insets+8 */
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  toolbarButtonRight: {
    position: 'absolute',
    right: 16,
    overflow: 'hidden',
  },
  toolbarTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarTitleBox: {
    width: 255, /* зона тайтла 255 (K-DS 218:405) */
    alignItems: 'center',
  },
  toolbarTitle: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: palette.text,
    textAlign: 'center',
  },
  group: {
    /* Chip Group / Form Field (101:6990–101:6992): px 16 py 8, label → контрол gap 8 */
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'flex-start',
  },
  groupLabel: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16, /* x/BtnGr (101:6996; 226:1190) */
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: palette.cardSurface,
    flexDirection: 'row',
  },
});