import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Карточка журнала (K-DS InfoRow 298:1117, инстансы K 209:9799/209:9773):
 * - body: заголовок Headline 16/20 · 600 + вторая строка Body 16/22, gap 2;
 * - info (низ): pt 4, Caption 12/16 · 500 secondary — состав слева, дата справа;
 * - контейнер: surface #f8f9f5, radius 16 (radius/md), p 16; tap → карточка.
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
}: {
  title: string;
  subtitle: string;
  info: string;
  /** дата карточки: создания места / рыбалки (ТЗ _x/21.md §4/§5) */
  date: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}>
      {/* pressed-визуал не задан в K-DS (InfoRow 298:1117 вариантов нет) — не
          выдумываем; тап-обёртка как у report-item */}
      <View style={styles.card}>
        <Text style={[styles.title, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.headline) }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.body) }]}>
          {subtitle}
        </Text>
        <View style={styles.infoRow}>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.cardSurface, /* --color-surface-default */
    borderRadius: 16, /* dimensions/radius/md (209:9799) */
    borderCurve: 'continuous',
    padding: 16,
  },
  title: {
    color: Colors.light.text,
  },
  subtitle: {
    color: Colors.light.text,
    marginTop: 2, /* gap 3xs (298:1117) */
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4, /* spacing/2xs (298:1120) */
    paddingTop: 4,
  },
  info: {
    flex: 1,
    color: Colors.light.textSecondary,
  },
  date: {
    color: Colors.light.textSecondary,
    flexShrink: 0,
  },
});