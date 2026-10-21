import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { UI_ICONS } from '@/components/ui-icons';

/* Кнопка поверх карты по K-DS button-ui (71:564):
   40×40, radius/sm = 12, фон --color-surface-default (#ffffffe5 = белое 90%,
   подтверждено get_variable_defs 21.10.2026), иконка 24×24 icon/light
   (plus 71:585 / minus-light 71:597). Тень — вариант Shadows=Yes (232:3630),
   эффект button_map: 0 2 4 0 rgba(0,0,0,0.16) — подтверждена Дмитрием 21.10.2026.
   Варианта Pressed в K-DS у button-ui нет — pressed-состояние не выдумываем
   (обязательное правило проекта). */

export type IconButtonName = keyof typeof UI_ICONS;

export default function ButtonUi({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: IconButtonName;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.button}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d={UI_ICONS[icon].d} fill={Colors.light.text} />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    /* Кривая скругления Figma (corner smoothing 60%) = непрерывные углы iOS.
       В RN процент не задаётся — нативное приближение: borderCurve continuous
       (только iOS, на Android игнорируется). */
    borderCurve: 'continuous',
    /* --color-surface-default: #ffffffe5 — прямая привязка K-DS 71:564 */
    backgroundColor: 'rgba(255,255,255,0.90)',
    /* button_map (K-DS 232:3630): DROP_SHADOW #00000029, offset (0,2), radius 4 */
    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});