import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { type Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { UI_ICONS } from '@/components/ui-icons';

/* Кнопка поверх карты по K-DS Button-Icon: md 44×44 (dimensions/size/2xl),
   sm 40×40 (size/xl — кнопки при полях поиска; Дмитрий 23.10: ширина 44 в
   K-макете поиска — его баг, верен sm), radius/sm = 12 (кривая continuous).
   Вариантные фоны — переменные коллекции «button_small» (K-DS, привязки
   мастеров 71:564/461:810/…, демо-фреймы 463:318/463:328, значения сняты
   get_variable_defs 23.10):
   - Light:  default #ffffffe5 (белый 90%), pressed #ffffff80 (белый 50%),
     иконка --color-text-primary #181d1c;
   - Dark: button_small/default = stone/130 90% (rgba(34,44,39,.90)),
     pressed Dark 30% (rgba(34,44,39,.30)), иконка #f8f9f5.
   variant="action" — зелёный (Inverce): bg --color-action-default #176b52,
   иконка белая --color-overlay-point-on; мастер 232:3632/3633; Pressed —
   --color-action-pressed #0d4735 (K-DS 461:880/883/892/895).
   Тень button_map: 0 2 4 0 rgba(0,0,0,0.16) (Shadows=Yes 232:3630);
   type="toolbar" — Shadows=No (312:3300/71:598) — тулбарные кнопки.
   Disabled: opacity 40% (K-DS 461:810/813/816/819 — «Disabled»; тот же
   приём, что FormInput 201:515). */

export type IconButtonName = keyof typeof UI_ICONS;
export type IconButtonVariant = 'default' | 'action';
export type IconButtonType = 'map' | 'toolbar';
export type IconButtonSize = 'md' | 'sm';

export default function ButtonIcon({
  icon,
  variant = 'default',
  type = 'map',
  size = 'md',
  badge = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: {
  icon: IconButtonName;
  variant?: IconButtonVariant;
  type?: IconButtonType;
  size?: IconButtonSize;
  /** Бейдж активности: оранжевая точка в правом верхнем углу (K-DS bage 438:588,
      пример на кнопке 438:733–736). Ставится на 44×44, позиция top/right −4. */
  badge?: boolean;
  /** State=Disabled: opacity 40%, нажатие не проходит (K-DS 201:515-прецедент) */
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  const iconEntry = UI_ICONS[icon];
  const fill = variant === 'action' ? palette.accentIcon : palette.text;
  const iconSize = 24;

  const glyph = (
    <Svg
      width={iconSize}
      height={iconSize}
      viewBox={iconEntry.viewBox !== undefined ? `0 0 ${iconEntry.viewBox} ${iconEntry.viewBox}` : '0 0 24 24'}>
      <Path d={iconEntry.d} fill={fill} />
    </Svg>
  );

  const boxStyle = (pressed: boolean) => [
    staticStyles.button,
    size === 'sm' && staticStyles.buttonSm,
    type === 'toolbar' && staticStyles.buttonToolbar,
    variant === 'action' ? styles.buttonAction : styles.buttonBg,
    pressed && (variant === 'action' ? styles.buttonActionPressed : styles.buttonPressed),
    disabled && staticStyles.buttonDisabled,
  ];

  if (!onPress) {
    /* без onPress — неинтерактивная (иконка/заглушка); состояние Pressed не возникает */
    return (
      <View style={boxStyle(false)} accessibilityLabel={accessibilityLabel}>
        {glyph}
        {badge && <Bage />}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => boxStyle(pressed)}>
      {glyph}
      {badge && <Bage />}
    </Pressable>
  );
}

/* Бейдж активности (K-DS bage 438:588): круг 14×14 — заливка r6
   --color-overlay-catch (bite/default = overlay/catch: Light #d18a24,
   Dark #e2a647), обводка 2 --border/clipping (Light stone/000, Dark
   stone/170); тень 0,3,4 rgba(0,0,0,0.24) — feFlood-фильтр SVG мастера,
   RN-тень того же вида. */
function Bage() {
  const palette = useTheme();
  return (
    <View style={staticStyles.bage}>
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <Circle cx={7} cy={7} r={6} fill={palette.catch} stroke={palette.clipping} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  button: {
    /* md: dimensions/size/2xl; размеры/тень — геометрия (Shadows вне темы) */
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSm: {
    /* sm: dimensions/size/xl = 40 (K-DS 443:481…, кнопки при полях поиска) */
    width: 40,
    height: 40,
  },
  buttonToolbar: {
    /* тулбар-вариант Shadows=No (K-DS 312:3300): без тени, остальное то же */
    boxShadow: '0 0 0 rgba(0,0,0,0)',
  },
  buttonDisabled: {
    /* State=Disabled: opacity 40% (K-DS 461:810 и др.) */
    opacity: 0.4,
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

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    /* default: button_small/default (Light белый 90% / Dark stone/130 90%) */
    buttonBg: {
      backgroundColor: palette.buttonSurface,
    },
    buttonPressed: {
      /* Pressed/Hover белой: button_small/pressed (Light белый 50% / Dark stone/130 30%) */
      backgroundColor: palette.buttonPressed,
    },
    buttonAction: {
      backgroundColor: palette.accent,
    },
    buttonActionPressed: {
      /* Pressed/Hover зелёной: --color-action-pressed (K-DS 461:880 и др.) */
      backgroundColor: palette.actionPressed,
    },
  });