import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Palette } from '@/constants/theme';
import { UI_ICONS } from '../ui-icons';
import { useTheme } from '@/data/theme-store';

/* Аватарка K-DS 521:1306. Профиль использует вариант 80/Icon с ring и без
   Badge (инстанс K 500:11242 → 490:16890), фото и инициалы в продукте не
   используются. Размер строго 80.
   Геометрия, снятая по рендеру мастера 80/Icon 521:1321 (png, 24.10.2026):
   зелёный круг Ø80 (--color-action-default), кольцо — обводка
   --color-border-subtle (#ccd4cb) толщиной 4 СНАРУЖИ круга, общий
   габарит 88×88; белая подложка кольца (--color-surface-raised) полностью
   перекрыта зелённым и на рендер не влияет. В RN border внутри контейнера,
   поэтому граница 88×88 c border 4 — внутри остаётся ровно Ø80.
   Иконка user 56×56 (dimensions/size/4xl, мастер 523:1735), заливка
   --color-action-on — акцентный из палитры (тёмная тема — Dark K-DS).
   Загрузка фото и редактирование аватарки — осознанно не реализованы. */
export default function Avatar() {
  const palette = useTheme();
  return (
    <View
      style={makeStyles(palette).avatar}
      accessibilityRole="image"
      accessibilityLabel="Аватарка пользователя">
      <Svg width={56} height={56} viewBox="0 0 56 56">
        <Path d={UI_ICONS.user.d} fill={palette.accentIcon} />
      </Svg>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    avatar: {
      width: 88,
      height: 88,
      borderWidth: 4,
      borderRadius: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.accent,
      borderColor: palette.borderSubtle,
    },
  });