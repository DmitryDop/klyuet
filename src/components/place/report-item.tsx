import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fishingDateLabel } from '@/logic/dates';
import { displayName } from '@/data/repo';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import type { Report } from '@/data/types';

/* Карточка отчёта — K-DS report-item (298:1116).
   - variant="inline" — в списке места (K 135:6275): прозрачный, px 16,
     разделители между карточками; вторая строка — имя автора; метод ловли
     в нижней строке.
   - variant="card" — отдельный блок #f8f9f5 p 16 radius 16 без разделителей
     (K 210:9933 «Отчеты рыбака», K 139:6786 «Отчеты места»); вторая строка —
     место или автор (secondaryText, по макетам: у рыбака — место, у места —
     автор); метод ловли в нижней строке не показывается (в макетах — только
     снасть·приманка·фото).
   Заголовок — виды рыбы («С уловом») или «Без улова», Onest/Headline 16/20;
   вторая строка — Onest/Body (450) 16/22; строка описания и дата — Onest/Caption
   12/16, цвет — локальное значение макета #808080 (не переменная K-DS, помечено).
   Дата — дата самой рыбалки (reports.md §7), свежая — относительной.
   Pressed-состояние макетами не передано — не выдумывается (правило проекта). */

const INFO_GRAY = '#808080'; /* локальное значение макета (не токен) */

export default function ReportItem({
  report,
  variant = 'inline',
  secondaryText,
  onPress,
  separator = true,
}: {
  report: Report;
  variant?: 'inline' | 'card';
  /** вторая строка card-варианта: место («Отчеты рыбака») или автор
      («Отчеты места», K 139:6995) */
  secondaryText?: string;
  onPress?: () => void;
  separator?: boolean;
}) {
  const title =
    report.catchStatus === 'with_catch' && report.fishSpeciesIds.length > 0
      ? report.fishSpeciesIds.join(', ')
      : 'Без улова';
  const infoParts = [
    variant === 'inline'
      ? report.fishingMethod === 'shore'
        ? 'С берега'
        : report.fishingMethod === 'boat'
          ? 'С лодки'
          : undefined
      : undefined,
    report.tackle,
    report.bait,
    report.photos.length > 0 ? `${report.photos.length} фото` : undefined,
  ].filter(Boolean);

  const item = (
    <View style={[styles.item, variant === 'card' && styles.card]}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.secondaryLine}>
          {variant === 'card' ? secondaryText : displayName(report.authorId)}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.infoText, styles.infoLeft]}>{infoParts.join(' · ')}</Text>
        <Text style={[styles.infoText, styles.infoDate]}>
          {fishingDateLabel(report.fishingDate)}
        </Text>
      </View>
    </View>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Отчёт: ${title}`}
          onPress={onPress}>
          {item}
        </Pressable>
      ) : (
        item
      )}
      {variant === 'inline' && separator && <View style={styles.separator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 16,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  card: {
    /* обёртка «Отчеты рыбака» (K 210:9937): блок #f8f9f5 p 16 radius 16 */
    backgroundColor: Colors.light.cardSurface,
    borderRadius: 16,
    padding: 16,
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
  secondaryLine: {
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