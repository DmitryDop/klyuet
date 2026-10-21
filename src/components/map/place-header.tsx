import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LocationDot from '@/components/map/location-dot';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import type { Place } from '@/data/types';

/* Шапка карточки места (K 135:6230 / 125:5893): фиксированная подложка-снимок
   высотой 320 (неинтерактивный MapView), маркер по центру, плашка-подпись
   снизу (surface-raised, px 8/py 4, radius 8, Onest/Caption).
   Кнопки назад/действие НЕ в этом слое: рендерятся экраном поверх скролла
   (иначе ScrollView наезжает сверху и глушит тапы). */

const HEADER_HEIGHT = 320;

/* Зум мини-карты — как в прототипе (app.js initCardMap): Leaflet-уровень
   14 точное / 12 приблизительное → долготный span = 360/2^z * (393/256) */
const SPAN_EXACT = (360 / 2 ** 14) * (393 / 256);
const SPAN_APPROX = (360 / 2 ** 12) * (393 / 256);

export function PlaceHeader({ place }: { place: Place }) {
  const insets = useSafeAreaInsets();
  const center =
    place.kind === 'exact' ? place.coordinate : place.view.coordinate;
  const isExact = place.kind === 'exact';

  return (
    <View style={styles.header}>
      <MapView
        pointerEvents="none"
        userInterfaceStyle="light"
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
      {/* маркер: по центру; в макете y=53 (точный) / 80 (область) от шапки,
          статус-бар 44 → insets.top + 9 / + 36 */}
      <View
        style={
          isExact
            ? [styles.markerExact, { top: insets.top + 9 }]
            : [styles.markerApprox, { top: insets.top + 36 }]
        }
        pointerEvents="none">
        {isExact ? <LocationDot /> : <ApproximateMarker />}
      </View>
      {/* плашка-подпись: 48 от низа шапки */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {place.kind === 'exact' ? 'Точное место' : 'Примерное место'}
        </Text>
      </View>
    </View>
  );
}

/* Приблизительная область в шапке (K 310:3261): 105×105, заливка
   overlay-point (alpha), пунктирная граница 0.5 (stroke/05) */
function ApproximateMarker() {
  return <View style={styles.approxMarker} />;
}

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: Colors.light.background,
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
    left: (393 - 56) / 2,
  },
  markerApprox: {
    position: 'absolute',
    left: (393 - 105) / 2,
  },
  approxMarker: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.pointAlpha,
    borderColor: Colors.light.accent,
    borderWidth: 0.5,
    borderStyle: 'dashed',
  },
  badge: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: Colors.light.surfaceRaised, /* --color-surface-raised */
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
});