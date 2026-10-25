import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { type Palette } from '@/constants/theme';
import { UI_ICONS } from '@/components/ui-icons';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Карточка журнала (K-DS InfoRow 298:1117, инстансы K 209:9799/209:9773;
 * вариант «Избранное» K 490:16523 — Right с bookmark 24×24, p 8):
 * - body: заголовок Headline 16/20 · 600 + вторая строка Body 16/22, gap 2;
 * - info (низ): pt 4, Caption 12/16 · 500 secondary — состав слева, дата справа;
 * - контейнер: surface #f8f9f5, radius 16 (radius/md), p 16; tap → карточка;
 * - опциональная иконка избранного справа (залитый bookmark,
 *   заливка --color-action-default; тап — удаление из избранного):
 *   только во вкладке «Избранное» (ТЗ _x/30.md §4).
 * Один компонент на обе вкладки: «Моё место» (title=название,
 * subtitle=виды) и «Мой отчёт» (title=улов, subtitle=место).
 */
export default function JournalCard({
  title,
  subtitle,
  info,
  date,
  onPress,
  accessibilityLabel,
  onBookmarkPress,
}: {
  title: string;
  subtitle: string;
  info: string;
  /** дата карточки: создания места / рыбалки (ТЗ _x/21.md §4/§5) */
  date: string;
  onPress: () => void;
  accessibilityLabel: string;
  /** иконка избранного справа: подпись по состоянию; показывается,
      когда передан обработчик (удаление из избранного, ТЗ §4) */
  onBookmarkPress?: () => void;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}>
      {/* pressed-визуал не задан в K-DS (InfoRow 298:1117 вариантов нет) — не
          выдумываем; тап-обёртка как у report-item */}
      <View style={styles.card}>
        <View style={staticStyles.topRow}>
          <View style={staticStyles.textCol}>
            <Text style={[styles.title, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.headline) }]}>
              {title}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.body) }]}>
              {subtitle}
            </Text>
          </View>
          {onBookmarkPress && (
            /* Right (K 490:16523;529:2128): p 8, иконка 24 — зона тапа 40;
                вложенный Pressable: тап по иконке не открывает карточку */
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Убрать из избранного"
              onPress={onBookmarkPress}>
              <View style={staticStyles.bookmark}>
                <Svg width={24} height={24} viewBox="0 0 24 24">
                  <Path d={UI_ICONS.bookmarkFilled.d} fill={palette.accent} />
                </Svg>
              </View>
            </Pressable>
          )}
        </View>
        <View style={staticStyles.infoRow}>
          <Text style={[styles.info, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.caption) }]} numberOfLines={1}>
            {info}
          </Text>
          <Text style={[styles.date, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.caption) }]}>
            {date}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const staticStyles = StyleSheet.create({
  /* Report_content (529:2122): ряд body flex + Right, gap 4 (2xs) */
  topRow: {
    flexDirection: 'row',
    gap: 4,
  },
  /* body (298:1117): flex 1 0 0, gap 2 (3xs) между строками */
  textCol: {
    flex: 1,
    flexBasis: '0%',
  },
  /* Right (529:2128): p 8, иконка 24 */
  bookmark: {
    padding: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4, /* spacing/2xs (298:1120) */
    paddingTop: 4,
  },
});

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.cardSurface, /* --color-surface-default */
      borderRadius: 16, /* dimensions/radius/md (209:9799) */
      borderCurve: 'continuous',
      padding: 16,
    },
    title: {
      color: palette.text,
    },
    subtitle: {
      color: palette.text,
      marginTop: 2, /* gap 3xs (298:1117) */
    },
    info: {
      flex: 1,
      color: palette.textSecondary,
    },
    date: {
      color: palette.textSecondary,
      flexShrink: 0,
    },
  });