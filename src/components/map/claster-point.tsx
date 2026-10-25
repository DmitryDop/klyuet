import { StyleSheet, Text, View } from 'react-native';

import type { Palette } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import { useTheme } from '@/data/theme-store';
import type { ClusterKind } from '@/data/types';

/**
 * Кластер мест на карте — K-DS Claster_Point (мастер 165:43):
 * 48×48 (dimensions/size/2xl), круг (radius/full), граница 3.
 * Шрифт цифры — Onest/Label 14/18 (подключён вариативным TTF в _layout.tsx).
 *
 * Три утверждённых вида (спека §1.1 ↔ K-DS):
 * exact        — Default: сплошная зелёная заливка, белая цифра, светлое гало;
 * approximate  — Dashed: полупрозрачная зелёная заливка (#176b5233),
 *                зелёный пунктир, тёмная цифра;
 * mixed        — Dashed_Extra: зелёная заливка, белый пунктир, белая цифра.
 * Число внутри = количество мест (не отчётов).
 */

const CLUSTER_SIZE = 48;

const clusterViews = (palette: Palette): Record<ClusterKind, { bg: string; digit: string; border: string; dashed: boolean }> => ({
  exact: {
    bg: palette.accent,
    digit: palette.accentIcon,
    border: palette.markerHalo,
    dashed: false,
  },
  approximate: {
    bg: palette.pointAlpha, // --color-overlay-point #176b5233 (привязка K-DS 321:1835)
    digit: palette.text,
    border: palette.accent,
    dashed: true,
  },
  mixed: {
    bg: palette.accent,
    digit: palette.accentIcon,
    border: palette.accentIcon,
    dashed: true,
  },
});

export default function ClasterPoint({
  kind,
  count,
}: {
  kind: ClusterKind;
  count: number;
}) {
  const palette = useTheme();
  const view = clusterViews(palette)[kind];
  return (
    <View
      style={[
        styles.point,
        {
          backgroundColor: view.bg,
          borderColor: view.border,
          borderStyle: view.dashed ? 'dashed' : 'solid',
        },
      ]}>
      <Text style={[styles.digit, { color: view.digit }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  point: {
    width: CLUSTER_SIZE,
    height: CLUSTER_SIZE,
    borderRadius: CLUSTER_SIZE / 2,
    borderWidth: 3,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    textAlign: 'center',
  },
});