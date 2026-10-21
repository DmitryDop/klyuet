import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import ButtonUi from '@/components/button-ui';
import ClasterPoint from '@/components/map/claster-point';
import LocationDot from '@/components/map/location-dot';
import MapControls from '@/components/map/map-controls';
import { demoPlaceRepo } from '@/data/repo';
import type { Place } from '@/data/types';
import { PlaceClusterIndex } from '@/logic/clustering';
import { Colors } from '@/constants/theme';

/* Карта — главный экран (docs/map-place-flows-mvp.md §1).
   Движок react-native-maps, на iOS по умолчанию Apple Maps (MapKit) без API-ключа;
   Expo Go поддержан. Кнопки +/− по K 243:10201: пара по вертикальному центру
   области карты, справа 16, зазор 12; зум — через нативную камеру
   (getCamera → animateCamera). userInterfaceStyle="light" — светлая тема V1,
   в будущем переключается из «Профиль → Настройки → Оформление».
   Места — через PlaceClusterIndex (только PUBLIC-данные); приблизительные
   области — географические окружности радиуса 1500 м; пин скрытой точки
   не рисуется (спека §2). */

const DEMO_REGION = {
  latitude: 58.05,
  longitude: 38.35,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

/* Пунктир границ: [штрих, пробел] в points (утверждено Дмитрием 21.10.2026) */
const DASH_PATTERN = [5, 4];

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState(DEMO_REGION);
  const [places, setPlaces] = useState<Place[]>([]);
  const { width } = useWindowDimensions();

  useEffect(() => {
    demoPlaceRepo.getPlaces().then(setPlaces);
  }, []);

  const index = useMemo(() => new PlaceClusterIndex(places), [places]);

  /* пересчёт ONLY на смене региона/данных — не на каждом кадре камеры */
  const objects = useMemo(
    () => (places.length ? index.objectsForRegion(region, width) : []),
    [index, region, width, places.length],
  );

  /* один шаг кнопки = ±1 уровень зума нативной камеры */
  const zoom = (dir: 1 | -1) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map
      .getCamera()
      .then((cam) => {
        const next = { ...cam };
        if (typeof cam.zoom === 'number') {
          next.zoom = cam.zoom + dir;
        }
        if (typeof cam.altitude === 'number' && cam.altitude > 0) {
          next.altitude = dir > 0 ? cam.altitude / 2 : cam.altitude * 2;
        }
        map.animateCamera(next);
      })
      .catch(() => {
        /* нативная карта ещё недоступна — шаг пропускаем */
      });
  };

  /* тап по кластеру: приблизить до зума раскрытия (спека §1.1, без шторок) */
  const expand = (center: { latitude: number; longitude: number }, expansionZoom: number) => {
    const span = (360 / 2 ** expansionZoom) * (256 / width);
    mapRef.current?.animateToRegion(
      {
        ...center,
        latitudeDelta: span,
        longitudeDelta: span,
      },
      250,
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        userInterfaceStyle="light"
        initialRegion={region}
        onRegionChangeComplete={setRegion}>
        {objects.map((o) => {
          switch (o.type) {
            case 'cluster':
              return (
                <Marker
                  key={`cluster-${o.id}`}
                  coordinate={o.coordinate}
                  tracksViewChanges={false}
                  onPress={() => expand(o.coordinate, o.expansionZoom)}>
                  <ClasterPoint kind={o.kind} count={o.count} />
                </Marker>
              );
            case 'exactPlace':
              return (
                <Marker
                  key={o.place.id}
                  coordinate={o.place.coordinate}
                  tracksViewChanges={false}>
                  <LocationDot />
                </Marker>
              );
            case 'approxPlace':
              return (
                <Circle
                  key={o.place.id}
                  center={o.place.view.coordinate}
                  radius={o.place.view.radiusMeters}
                  fillColor={Colors.light.pointAlpha}
                  strokeColor={Colors.light.accent}
                  strokeWidth={0.5} /* dimensions/stroke/05 (K-DS approximate location) */
                  lineDashPattern={DASH_PATTERN}
                />
              );
          }
        })}
      </MapView>
      <MapControls />
      <View style={styles.controls}>
        <ButtonUi
          icon="plus"
          accessibilityLabel="Увеличить карту"
          onPress={() => zoom(1)}
        />
        <ButtonUi
          icon="minusLight"
          accessibilityLabel="Уменьшить карту"
          onPress={() => zoom(-1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    /* адаптивное позиционирование (K 243:10201): центр высоты области карты;
       размеры/цвета/тень — K-DS button-ui */
    top: 0,
    bottom: 0,
    right: 16,
    justifyContent: 'center',
    gap: 12,
  },
});