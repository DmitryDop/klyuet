import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ButtonIcon from '@/components/button-icon';
import SheetModal from '@/components/ui/sheet-modal';
import {
  closeMapSettings,
  setMapViewKind,
  useMapViewKind,
  type MapViewKind,
} from '@/data/map-settings-store';
import type { Palette } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import { useTheme } from '@/data/theme-store';

/**
 * Шторка «Настройки карты» (ТЗ _x/24.md; K 484:16154 → Sheet 484:16223):
 * модал K-DS Sheet 246:4605 — граббер, тулбар (✕ справа, заголовок по
 * центру зоны 255 — как в author-sheet), Slot pb 16 без Bottom Action
 * (hidden в макете) — подтверждение не нужно (§3).
 * Ячейка Cell 44 (px 16, py 2): текст Body 16/22 слева; radio 24×24 справа
 * (p 8) — выбранная: border 2 --color-action-default #176b52, точка 10×10
 * radius/xs; невыбранная: border 1 --color-border-control #838f87,
 * фон --color-surface-default #f8f9f5.
 * Механика: тап по варианту → setMapViewKind (мгновенно) + закрытие.
 * «Настройки карты» — заголовок по решению Дмитрия 24.10 (в макете
 * «Настройка карты», в ТЗ /_x/24.md §2 — «Настройки карты»).
 */

const VARIANTS: { kind: MapViewKind; label: string }[] = [
  { kind: 'standard', label: 'Схема' },
  { kind: 'satellite', label: 'Спутник' },
  { kind: 'hybrid', label: 'Гибрид' },
];

export default function MapSettingsSheet({ visible }: { visible: boolean }) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  const kind = useMapViewKind();
  /* нижняя безопасная зона (обновление макета 24.10: Bottom Action 393×27
      пустой — шторки без нижних кнопок отступают от домашней полосы) */
  const insets = useSafeAreaInsets();
  return (
    <SheetModal visible={visible} onClose={closeMapSettings} fullHeight={false}>
      {/* тулбар после граббера SheetModal: ряд 44 + pb 8 (K-DS 224:987) */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarRow} pointerEvents="box-none">
          {/* Left-слот пуст: только ✕ и заголовок */}
          <View style={styles.leftSpacer} />
          <View style={styles.flex} />
          <ButtonIcon icon="close" type="toolbar" onPress={closeMapSettings} accessibilityLabel="Закрыть" />
        </View>
        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1}>
            Настройки карты
          </Text>
        </View>
      </View>
      {/* Slot: 3 ячейки-варианта, pb 16 + safe bottom (решение Дмитрия 24.10) */}
      <View style={[styles.slot, { paddingBottom: 16 + insets.bottom }]}>
        {VARIANTS.map((variant) => (
          <Pressable
            key={variant.kind}
            accessibilityRole="radio"
            accessibilityState={{ selected: kind === variant.kind }}
            onPress={() => {
              setMapViewKind(variant.kind);
              closeMapSettings();
            }}
            style={styles.cell}>
            <View style={styles.cellTextWrap}>
              <Text style={styles.cellText}>{variant.label}</Text>
            </View>
            <View style={styles.radioWrap}>
              <Radio selected={kind === variant.kind} />
            </View>
          </Pressable>
        ))}
      </View>
    </SheetModal>
  );
}

function Radio({ selected }: { selected: boolean }) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  return (
    <View
      style={[
        styles.radio,
        selected ? styles.radioSelected : styles.radioUnselected,
      ]}>
      {selected && <View style={styles.radioDot} />}
    </View>
  );
}

/* Цвета — палитра активной темы (тёмный режим K-DS, аудит 25.10) */
const makeStyles = (palette: Palette) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingBottom: 8, /* K-DS 224:987; верх — граббер-зона SheetModal */
  },
  /* центр заголовка — по ряду кнопок, слой поверх (author-sheet) */
  toolbarRow: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  leftSpacer: {
    width: 44,
    height: 44,
  },
  titleWrap: {
    /* Title (224:997): центр по ряду, w 255 */
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    width: 255,
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: palette.text,
    textAlign: 'center',
  },
  slot: {
    paddingBottom: 16, /* переопределяется insets.bottom (safe zone) */
  },
  cell: {
    /* Cell 484:16219: px 16, py 3xs 2, высота 44 */
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  cellTextWrap: {
    flex: 1,
    /* Layuot Txt: py 8 */
    paddingVertical: 8,
  },
  cellText: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: palette.text,
  },
  radioWrap: {
    /* x/Right: p 8 */
    padding: 8,
  },
  radio: {
    /* Radio 268:1034: 24×24, radius/md */
    width: 24,
    height: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    /* border 2 --color-action-default */
    borderWidth: 2,
    borderColor: palette.accent,
    /* content box 20: точка 10×10 на left/top 5 */
  },
  radioUnselected: {
    /* border 1 --color-border-control, фон --color-surface-default */
    borderWidth: 1,
    borderColor: palette.borderControl,
    backgroundColor: palette.cardSurface,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 8,
    /* --color-action-on */
    backgroundColor: palette.accent,
  },
});