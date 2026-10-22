
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { UI_ICONS } from '@/components/ui-icons';
import { Colors } from '@/constants/theme';
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
  const entry = UI_ICONS[icon];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ?? placeholder}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.control,
        disabled && styles.inactive,
        !error && focused && styles.focus,
        error && styles.error,
      ]}>
      <Text
        style={[
          styles.text,
          { color: value != null && value !== '' ? Colors.light.text : Colors.light.textSecondary },
        ]}
        numberOfLines={1}>
        {value != null && value !== '' ? value : placeholder}
      </Text>
      <View style={styles.detail}>
        <Svg
          width={20}
          height={20}
          viewBox={`0 0 ${entry.viewBox ?? 20} ${entry.viewBox ?? 20}`}>
          <Path d={entry.d} fill={Colors.light.text} />
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    height: 48,
    backgroundColor: Colors.light.cardSurface,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.light.borderControl,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inactive: {
    opacity: 0.4, /* на время отправки — единое блокирующее состояние */
  },
  focus: {
    /* K-DS Select State=Focus (209:131): 2px --color-focus-ring */
    borderWidth: 2,
    borderColor: Colors.light.focusRing,
  },
  error: {
    /* K-DS Select State=Error (209:134): --color-danger-text */
    borderWidth: 2,
    borderColor: Colors.light.dangerText,
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