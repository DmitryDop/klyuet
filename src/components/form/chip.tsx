import { Pressable, StyleSheet, Text } from 'react-native';

import { type Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * x/Chip/Items (K-DS 315:9146/315:9149/224:4605):
 * label 14/18 500 по центру; выбор «обводкой и цветом»:
 * Selected — bg --color-selection-bg, граница --color-action-default,
 * текст --color-selection-text; Default — bg --color-surface-default,
 * граница --color-border-control, текст --color-text-primary.
 * size "lg" — 44, flex (статус, способ, фильтр шторки);
 * size "sm" — 32, отступ px 12 (sm), ширина по контенту (даты).
 */
export type ChipSize = 'lg' | 'sm';

export default function Chip({
  label,
  selected,
  size = 'lg',
  flex = false,
  disabled = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  size?: ChipSize;
  flex?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={disabled ? undefined : onPress}
      style={[
        size === 'lg' ? staticStyles.baseLg : staticStyles.baseSm,
        selected ? styles.selected : styles.default,
        flex && staticStyles.flexLg,
      ]}>
      <Text
        style={[
          staticStyles.label,
          { color: selected ? palette.selectionText : palette.text },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const staticStyles = StyleSheet.create({
  baseLg: {
    height: 44,
    paddingHorizontal: 16,
    alignItems: 'center', /* x/Chip/Items (K-DS 165:25): центр контента */
    justifyContent: 'center',
  },
  baseSm: {
    height: 32,
    paddingHorizontal: 12, /* spacing/sm (307:1316) */
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexLg: {
    flexGrow: 1, /* flex 1 0 0 в слоте */
    flexBasis: '0%',
  },
  label: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    textAlign: 'center',
  },
});

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    selected: {
      backgroundColor: palette.selection,
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: 9999,
    },
    default: {
      backgroundColor: palette.cardSurface,
      borderWidth: 1,
      borderColor: palette.borderControl,
      borderRadius: 9999,
    },
  });