import { StyleSheet, Text, View } from 'react-native';

import { fishingDateLabel } from '@/logic/dates';
import { displayName } from '@/data/repo';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import type { Report } from '@/data/types';

/* Карточка отчёта в списке места — K-DS report-item (298:1116) как в K 135:6275:
   заголовок — виды рыбы («С уловом») или «Без улова», Onest/Headline 16/20;
   автор — Onest/Body (450) 16/22; строка описания и дата — Onest/Caption 12/16,
   цвет — локальное значение макета #808080 (не переменная K-DS, помечено).
   Дата — дата самой рыбалки (reports.md §7), свежая — относительной. */

const INFO_GRAY = '#808080'; /* локальное значение макета (не токен) */

export default function ReportItem({
  report,
  separator = true,
}: {
  report: Report;
  separator?: boolean;
}) {
  const title =
    report.catchStatus === 'with_catch' && report.fishSpeciesIds.length > 0
      ? report.fishSpeciesIds.join(', ')
      : 'Без улова';
  const infoParts = [
    report.fishingMethod === 'shore' ? 'С берега' : report.fishingMethod === 'boat' ? 'С лодки' : undefined,
    report.tackle,
    report.bait,
    report.photos.length > 0 ? `${report.photos.length} фото` : undefined,
  ].filter(Boolean);

  return (
    <View>
      <View style={styles.item}>
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.author}>{displayName(report.authorId)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.infoText, styles.infoLeft]}>{infoParts.join(' · ')}</Text>
          <Text style={[styles.infoText, styles.infoDate]}>
            {fishingDateLabel(report.fishingDate)}
          </Text>
        </View>
      </View>
      {separator && <View style={styles.separator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 16,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  body: {
    gap: 2,
    alignItems: 'flex-start',
  },
  title: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
  author: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
  info: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  infoText: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
  },
  infoLeft: {
    flexGrow: 1,
    flexBasis: '0%',
    flexShrink: 1,
    color: INFO_GRAY,
  },
  infoDate: {
    color: INFO_GRAY,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.borderSubtle,
    /* разделитель внутри px-зоны: 16 от краёв report-блока (SpacingSeparator
       w-full у px-контейнера report-item, K 135:6275) */
    marginHorizontal: 16,
    marginVertical: 15,
  },
});