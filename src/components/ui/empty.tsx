import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import Button from '@/components/button';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import { UI_ICONS } from '@/components/ui-icons';

/**
 * Empty (K-DS 313:1710, инстанс K 230:9271 «Добавленных мест нет»;
 * 229:8983 «Отчетов пока нет»): центр-блок 329 — иконка file 56×56
 * (мастер 313:1713, заливка #376D7B литералом инстанса), титул Title2
 * 24/30 · 700 по центру (обновление K-DS 23.10, было Title1 28/34);
 * опциональная кнопка «Добавить» (BtnGr: pt 24, кнопка primary во всю
 * ширину блока 329 — только у «Моих мест»).
 */
export default function EmptyBlock({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.block}>
        <View style={styles.titleGroup}>
          <Svg width={56} height={56} viewBox="0 0 56 56">
            <Path d={UI_ICONS.file.d} fill="#376d7b" />
          </Svg>
          <Text style={[styles.title, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.title2) }]}>
            {title}
          </Text>
        </View>
        {actionLabel != null && (
          <View style={styles.actionGroup}>
            {/* кнопка primary 48 во всю ширину блока 329 (K 313:1698/240:4483) */}
            <Button label={actionLabel} variant="primary" onPress={onAction} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
  },
  block: {
    alignSelf: 'center',
    width: 329, /* центр-блок (313:1710): w 329 */
    gap: 8,
  },
  titleGroup: {
    alignItems: 'center', /* Title (313:1691): column, gap 8, иконка + титул */
    gap: 8,
  },
  title: {
    color: Colors.light.text,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  actionGroup: {
    alignSelf: 'stretch', /* BtnGr 313:1698: pt 24 — кнопка по ширине блока */
    paddingTop: 24,
  },
});