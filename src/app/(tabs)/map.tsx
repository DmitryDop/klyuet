import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';

import ButtonUi from '@/components/button-ui';

/* Карта — главный экран (docs/map-place-flows-mvp.md §1).
   Движок react-native-maps, на iOS по умолчанию Apple Maps (MapKit) без API-ключа;
   Expo Go поддержан. Кнопки +/− по K 1:688: колонка справа, gap 8,
   отступ справа 16; пара кнопок — по вертикальному центру области карты (K 243:10201).
   Зум — через нативную камеру (getCamera → animateCamera): MapKit масштабируется
   по altitude (метры), Google — по целочисленному zoom; center/pitch/heading
   сохраняются, лимиты MapKit совпадают с жестами. Тёмная тема V1 не используется —
   userInterfaceStyle="light" (светлая тема единственная в V1; будущее
   переключение — Профиль → Настройки → Оформление). */

const DEMO_REGION = {
  latitude: 55.75,
  longitude: 37.62,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

/* Один шаг кнопки = ±1 уровень зума MapKit (altitude ÷ / × 2) или ±1 zoom Google */
type ZoomDir = 1 | -1;

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);

  const zoom = (dir: ZoomDir) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map
      .getCamera()
      .then((cam) => {
        const next = { ...cam };
        /* zoom знает только Google; у Apple Maps уровень задаётся altitude */
        if (typeof cam.zoom === 'number') {
          next.zoom = cam.zoom + dir;
        }
        if (typeof cam.altitude === 'number' && cam.altitude > 0) {
          next.altitude = dir > 0 ? cam.altitude / 2 : cam.altitude * 2;
        }
        map.animateCamera(next);
      })
      .catch(() => {
        /* карта ещё не смонтирована нативно — шаг пропускаем */
      });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        userInterfaceStyle="light"
        initialRegion={DEMO_REGION}
      />
      <View
        pointerEvents="box-none"
        style={styles.controls}>
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
    /* адаптивное позиционирование (K 243:10201): пара по вертикальному центру
       видимой области карты — в макете центр пары y≈426 при высоте 852.
       Размеры/цвета/тень — K-DS button-ui: 40×40, radius 12, зазор 12 */
    top: 0,
    bottom: 0,
    right: 16,
    justifyContent: 'center',
    gap: 12,
  },
});