import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import LocationDot from '@/components/map/location-dot';
import type { Palette } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import { useTheme, useThemeMode } from '@/data/theme-store';
import type { Place } from '@/data/types';

/* Шапка карточки места (K 135:6230 / 125:5893; анимация 328:3096): подложка
   «ovelay map» — сплошной #181D1C (fill 330:5076 — тёмная подложка под картой,
   проявляется через альфу dimming block'а); поверх — снимок-карта 320
   (неинтерактивный MapView), маркер по центру, плашка-подпись снизу
   (surface-raised, px 8/py 4, radius 8, Onest/Caption).
   Кнопки назад/действие НЕ в этом слое: рендерятся экраном поверх скролла
   (иначе ScrollView наезжает сверху и глушит тапы).
   Анимация (Дмитрий 22.10): плашка едет вместе с листом (translateY
   = −scrollY: в кадрах подпись = верх листа − 32); альфа блока ведёт экран
   (place/[id].tsx). */

const HEADER_HEIGHT = 320;
/* dimming-подложка «ovelay map» — сплошной #181D1C (K 330:5076; значение
   совпадает с --color-text-primary: семантика подоложки — на уточнении токена) */
export const DIMMING_BACKDROP = '#181d1c';

/* Зум мини-карты — как в прототипе (app.js initCardMap): Leaflet-уровень
   14 точное / 12 приблизительное → долготный span = 360/2^z * (393/256).
   Экспорт: тот же канон зумит прицел редактирования (Дмитрий 24.10:
   «карта пусть меняет зум — меньше движений»; max с текущим зумом). */
export const SPAN_EXACT = (360 / 2 ** 14) * (393 / 256);
export const SPAN_APPROX = (360 / 2 ** 12) * (393 / 256);

export function PlaceHeader({ place, scrollY }: { place: Place; scrollY?: SharedValue<number> }) {
  /* плашка едет вместе с листом (translateY = −scrollY, K 328:3096);
     без scrollY — статичная шапка */
  const palette = useTheme();
  const themeMode = useThemeMode();
  const styles = makeStyles(palette);
  const badgeAnim = useAnimatedStyle(() => {
    if (scrollY == null) return {};
    return { transform: [{ translateY: -scrollY.value }] };
  });
  const center =
    place.kind === 'exact' ? place.coordinate : place.view.coordinate;
  const isExact = place.kind === 'exact';

  return (
    <View style={styles.header}>
      <MapView
        pointerEvents="none"
        userInterfaceStyle={themeMode}
        style={styles.map}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: isExact ? SPAN_EXACT : SPAN_APPROX,
          longitudeDelta: isExact ? SPAN_EXACT : SPAN_APPROX,
        }}
      />
      {/* маркер: кончик пина — центр снимка, куда MapView проецирует
          координату (макет 135:330:5034: instance y=104, tip=160=центр 320);
          x — по ширине экрана, не константа 393 (дефект 24.10 на 430 dp) */}
      <View style={isExact ? styles.markerExact : styles.markerApprox} pointerEvents="none">
        {isExact ? <LocationDot /> : <ApproximateMarker />}
      </View>
      {/* плашка-подпись: едет вместе с листом (translateY = −scrollY,
          K 328:3096); при глубоком скролле уходит под тулбар/лист */}
      <Animated.View style={[styles.badge, badgeAnim]}>
        <Text style={styles.badgeText}>
          {place.kind === 'exact' ? 'Точное место' : 'Примерное место'}
        </Text>
      </Animated.View>
    </View>
  );
}

/* Приблизительная область в шапке (K 310:3261): 105×105, заливка
   overlay-point (alpha), пунктирная граница 0.5 (stroke/05) */
function ApproximateMarker() {
  const palette = useTheme();
  const styles = makeStyles(palette);
  return <View style={styles.approxMarker} />;
}

const makeStyles = (palette: Palette) => StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: DIMMING_BACKDROP, /* «ovelay map» fill (K 330:5076) */
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  markerExact: {
    position: 'absolute',
    /* y=104 макета 135:330:5034 (от края шапки, включая строку состояния);
       tip пина = 160 = центр снимка */
    top: 104,
    left: '50%',
    marginLeft: -28, /* 56/2 */
  },
  markerApprox: {
    position: 'absolute',
    /* центр области = координата, проецируется в центр снимка: top = 160 − 52,5.
       В макете 125:520:320:11299 y=80 (центр 132,5) — ручное размещение;
       центрирование принято Дмитрием 24.10 (как у пина точного места) */
    top: 107.5,
    left: '50%',
    marginLeft: -52.5, /* 105/2 */
  },
  approxMarker: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    borderCurve: 'continuous',
    backgroundColor: palette.pointAlpha,
    /* пунктир области: point_contrast (в Dark белый, K-DS 25.10) */
    borderColor: palette.pointContrast,
    borderWidth: 0.5,
    borderStyle: 'dashed',
  },
  badge: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: palette.surfaceRaised, /* --color-surface-raised */
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: palette.text,
  },
});