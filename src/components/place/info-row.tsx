import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/* Строка таблицы карточки места — K-DS Table list (299:1145), как использован
   в K 135:6246–6248: подпись Onest/Label 14/18 цветом --color-text-secondary,
   значение Onest/Body L 17/24 цветом --color-text-primary, разделитель
   --color-border-subtle 1px (py 15). Chevron не рендерим — шторка рыбы отменена,
   строка не нажимается (решение Дмитрия). */

export default function InfoRow({
  label,
  value,
  separator = true,
}: {
  label: string;
  value: string;
  separator?: boolean;
}) {
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      </View>
      {separator && <View style={styles.separator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  texts: {
    flexGrow: 1,
    flexBasis: '0%',
    flexShrink: 1, /* контейнер не должен растягиваться длинным контентом */
    gap: 4,
  },
  label: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
  },
  value: {
    ...rnTextStyle(TEXT.bodyL),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.borderSubtle,
    /* разделитель внутри px-зоны: 16 от краёв инфо-блока (SpacingSeparator
       w-full у px-контейнера InfoRow, K 135:6246) */
    marginHorizontal: 16,
    marginVertical: 15,
  },
});