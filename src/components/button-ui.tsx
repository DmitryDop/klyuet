import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { UI_ICONS } from '@/components/ui-icons';

/* Кнопка поверх карты по K-DS button-ui: 44×44 (dimensions/size/2xl = 44,
   привязка вариантов 71:564/232:3630/71:598/232:3632), radius/sm = 12 (кривая
   continuous), фон --color-surface-default (#ffffffe5 — привязка K-DS 71:564),
   иконка 24×24 icon/light. Тень button_map: 0 2 4 0 rgba(0,0,0,0.16)
   (вариант Shadows=Yes 232:3630).
   variant="action" — зелёный вариант (bg --color-action-default #176b52,
   иконка белая --color-overlay-point-on; мастер 232:3632/3633, Inverse).
   type="toolbar" — вариант Shadows=No (мастер 312:3300/71:598): кнопки
   верхнего тулбара карточки при прокрутке (K 329:3598, слоты Left/Right
   Toolbar - Top - iPhone 330:3833) — тот же компонент, без тени.
   Варианта Pressed в K-DS у button-ui нет — pressed-состояние не выдумываем
   (правило проекта). Без onPress действие рендерится как не подключённое. */

export type IconButtonName = keyof typeof UI_ICONS;
export type IconButtonVariant = 'default' | 'action';
export type IconButtonType = 'map' | 'toolbar';

export default function ButtonUi({
  icon,
  variant = 'default',
  type = 'map',
  badge = false,
  onPress,
  accessibilityLabel,
}: {
  icon: IconButtonName;
  variant?: IconButtonVariant;
  type?: IconButtonType;
  /** Бейдж активности: оранжевая точка в правом верхнем углу (K-DS bage 438:588,
      пример на кнопке 438:733–736). Ставится на 44×44, позиция top/right −4. */
  badge?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  const iconEntry = UI_ICONS[icon];
  const fill = variant === 'action' ? Colors.light.accentIcon : Colors.light.text;

  const glyph = (
    <Svg
      width={24}
      height={24}
      viewBox={iconEntry.viewBox !== undefined ? `0 0 ${iconEntry.viewBox} ${iconEntry.viewBox}` : '0 0 24 24'}>
      <Path d={iconEntry.d} fill={fill} />
    </Svg>
  );

  const style = [styles.button, type === 'toolbar' && styles.buttonToolbar, variant === 'action' && styles.buttonAction];

  if (!onPress) {
    /* действие не подключено: без нажатий, но доступно для скринридеров */
    return (
      <View style={style} accessibilityLabel={accessibilityLabel}>
        {glyph}
        {badge && <Bage />}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={style}>
      {glyph}
      {badge && <Bage />}
    </Pressable>
  );
}

/* Бейдж активности (K-DS bage 438:588): круг 14×14 — заливка r6 #D18A24
   (литерал SVG мастера), обводка 2 white; тень 0,3,4 rgba(0,0,0,0.24) —
   feFlood-фильтр SVG мастера, RN-тень того же вида. */
function Bage() {
  return (
    <View style={styles.bage}>
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <Circle cx={7} cy={7} r={6} fill="#d18a24" stroke="#ffffff" strokeWidth={2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44, /* dimensions/size/2xl (K-DS 399:371) */
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.90)',
    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonToolbar: {
    /* тулбар-вариант Shadows=No (K-DS 312:3300): без тени, остальное то же */
    boxShadow: '0 0 0 rgba(0,0,0,0)',
  },
  buttonAction: {
    backgroundColor: Colors.light.accent,
  },
  bage: {
    position: 'absolute',
    top: -4, /* пример на кнопке (438:733): badge 14×14, top/right −4 */
    right: -4,
    width: 14,
    height: 14,
    shadowOffset: { width: 0, height: 3 }, /* фильтр мастера: dy 3 */
    shadowRadius: 8, /* feGaussianBlur stdDeviation 4 ≈ blur-radius 8 */
    shadowColor: '#0000003d', /* 24% чёрного */
    shadowOpacity: 1,
  },
});