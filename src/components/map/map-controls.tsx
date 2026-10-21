import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';

import ButtonUi from '@/components/button-ui';
import { UI_ICONS } from '@/components/ui-icons';
import { Colors, TabBarSurface } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/* Управления главной карты — компоновка с актуального макета K (49:820/243:10201).
   Все кнопки — button-ui 44×44 (K-DS dimensions/size/2xl, коммит 31da2cd); «+» — variant action.
   Поиск/фильтр/слои/гео/«+» пока НЕ ПОДКЛЮЧЕНЫ — рендер без нажатий
   (задание slice 2: без ложного впечатления работоспособности).
   Легенда точности: панель tab_bar/default + блюр, padding 8, radius 12;
   «Точно» — location-pin 16×16 акцентом, «Примерно» — круг 12×12
   (заливка и пунктирная граница #176b52). Текст — Onest/Caption 12/16. */

export default function MapControls() {
  const insets = useSafeAreaInsets();
  const pin = UI_ICONS.locationPin;

  return (
    <>
      {/* поиск / фильтр / слои — верхняя колонка справа (K 243:10201: top 52
          при статус-полосе 44 → 8 от safe area) */}
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <ButtonUi icon="magnifyingGlass" accessibilityLabel="Поиск (не подключено)" />
        <ButtonUi icon="sliders" accessibilityLabel="Фильтр (не подключено)" />
        <ButtonUi icon="layerGroup" accessibilityLabel="Слои (не подключено)" />
      </View>

      {/* геолокация / добавление места — нижняя группа (K 243:10201: top 642,
          gap 24, низ группы 746 — тот же край, что у легенды; зазор к таб-бару 24:
          в коде пилюля выше на 4 (paddingBottom insets+4) → 4+48+24 от низа) */}
      <View pointerEvents="box-none" style={[styles.bottom, { bottom: insets.bottom + 76 }]}>
        <ButtonUi
          icon="locationCrosshairs"
          accessibilityLabel="Моё местоположение (не подключено)"
        />
        <ButtonUi
          icon="plus"
          variant="action"
          accessibilityLabel="Добавить место (не подключено)"
        />
      </View>

      {/* легенда точности (K 243:10201: top 714, высота 32, зазор к таб-бару 24;
          пилюля в коде выше на 4 → зазор 24 = insets.bottom + 4 + 48 + 24) */}
      <View pointerEvents="none" style={[styles.legend, { bottom: insets.bottom + 76 }]}>
        <BlurView intensity={10} tint="light" style={styles.legendLayer} />
        <View style={[styles.legendLayer, styles.legendGlass]} />
        <View style={styles.legendPair}>
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Path d={pin.d} fill={Colors.light.accent} />
          </Svg>
          <Text style={styles.legendText}>Точно</Text>
        </View>
        <View style={styles.legendPair}>
          {/* круг «Примерно»: заливка + пунктирная граница акцентом */}
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Примерно</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    right: 16,
    gap: 16,
    alignItems: 'center',
  },
  bottom: {
    position: 'absolute',
    right: 16,
    gap: 24,
    alignItems: 'center',
  },
  legend: {
    position: 'absolute',
    left: 16,
    height: 32,
    borderRadius: 12,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  legendLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  legendGlass: {
    backgroundColor: TabBarSurface,
  },
  legendPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderCurve: 'continuous',
    /* заливка и пунктир круга «Примерно» — привязки инстанса легенды 49:842:
       заливка #176b5233, граница #176b52; толщина 0.5 (утверждение Дмитрия) */
    backgroundColor: Colors.light.pointAlpha,
    borderColor: Colors.light.accent,
    borderWidth: 0.5,
    borderStyle: 'dashed',
  },
  legendText: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
});