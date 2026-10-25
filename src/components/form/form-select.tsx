import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { UI_ICONS } from '@/components/ui-icons';
import { type Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Select (K-DS 353:9944): 48px, radius 12, pl 16, bg --color-surface-default,
 * граница --color-border-control; x/Detail 48 — иконка 20 (chevron-down
 * d73fb / calendar 8aa1d); текст Body 16/22: placeholder
 * --color-text-secondary, заполнено --color-text-primary.
 * Состояния по K-DS (мастера Select 199:415/209:116…209:146):
 * - Focus = граница 2px --color-focus-ring (209:131);
 * - Error = --color-danger-text (209:134);
 * - Error+Focus = danger сохраняется при фокусе;
 * - Disabled — opacity 0.4 (209:122/209:125).
 * `focused` управляется снаружи (шторка открыта = поле в фокусе).
 */
export default function FormSelect({
  value,
  placeholder,
  icon,
  onPress,
  disabled = false,
  error = false,
  focused = false,
}: {
  /** заполненное значение; пусто → placeholder-цвет */
  value: string | null;
  placeholder: string;
  /** иконка справа: chevronDown (выбор) или calendar (дата) */
  icon: 'chevronDown' | 'calendar';
  onPress: () => void;
  /** на время отправки поля не открываются (reports.md §8) */
  disabled?: boolean;
  /** K-DS State=Error: граница danger */
  error?: boolean;
  /** K-DS State=Focus: граница 2px focus-ring */
  focused?: boolean;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  const entry = UI_ICONS[icon];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ?? placeholder}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.control,
        disabled && staticStyles.inactive,
        !error && focused && styles.focus,
        error && styles.error,
      ]}>
      <Text
        style={[
          staticStyles.text,
          { color: value != null && value !== '' ? palette.text : palette.textSecondary },
        ]}
        numberOfLines={1}>
        {value != null && value !== '' ? value : placeholder}
      </Text>
      <View style={staticStyles.detail}>
        <Svg
          width={20}
          height={20}
          viewBox={`0 0 ${entry.viewBox ?? 20} ${entry.viewBox ?? 20}`}>
          <Path d={entry.d} fill={palette.text} />
        </Svg>
      </View>
    </Pressable>
  );
}

const staticStyles = StyleSheet.create({
  inactive: {
    opacity: 0.4, /* на время отправки — единое блокирующее состояние */
  },
  text: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    flex: 1,
  },
  detail: {
    /* x/Detail 48×48, иконка 20 (353:9964) */
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    control: {
      height: 48,
      backgroundColor: palette.cardSurface,
      borderRadius: 12,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: palette.borderControl,
      paddingLeft: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    focus: {
      /* K-DS Select State=Focus (209:131): 2px --color-focus-ring */
      borderWidth: 2,
      borderColor: palette.focusRing,
    },
    error: {
      /* K-DS Select State=Error (209:134): --color-danger-text */
      borderWidth: 2,
      borderColor: palette.dangerText,
    },
  });