import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import MapView, { Circle, MapPressEvent, Marker } from 'react-native-maps';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReAnimated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import ButtonUi from '@/components/button-ui';
import ClasterPoint from '@/components/map/claster-point';
import LocationDot from '@/components/map/location-dot';
import MapControls from '@/components/map/map-controls';
import AddPlaceSheet, { Crosshair, AreaSight } from '@/components/map/add-place-sheet';
import { demoPlaceRepo } from '@/data/repo';
import { getAppliedMapFilter } from '@/data/filter-store';
import { clearPendingSearchTarget, getPendingSearchTarget } from '@/data/map-search-store';
import { consumeAddPlaceRequest } from '@/data/add-request-store';
import { FAKE_USER_LOCATION } from '@/data/user-location';
import {
  clearPlaceCreateDraft,
  ensurePlaceCreateDraft,
  getPlaceCreateDraft,
  setPlaceCreateDraft,
  usePlaceCreateActive,
  usePlaceCreateDraft,
} from '@/data/place-create-store';
import type { GeoPoint, Place, Report } from '@/data/types';
import { applyMapFilter, isFilterActive } from '@/logic/filter';
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
   не рисуется (спека §2). Тап по кнопке фильтра открывает экран /filter:
   применённые параметры (filter-store) фильтруют список ДО кластеризации
   (logic/filter.ts, задача _x/17.md); без фильтра — как раньше.
   Шаг 1 добавления места (задача _x/18.md, решение Дмитрия 22.10) — оверлей НА
   этой карте (K 383:7080/7114/7152), маршрут не создаётся: карта/тайлы/зум
   не пересоздаются, чужие метки скрыты, point = центр (AddPlaceSheet). */

const DEMO_REGION = {
  latitude: 57.9578,
  longitude: 38.3749,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

/* Фейковая геопозиция пользователя — общая константа (user-location.ts,
   Дмитрий 23.10): посёлок Восход; та же точка — точка отсчёта расстояний
   геопоиска (ТЗ _x/20.md §7). Реальная геолокация подключится позже. */

/* Пунктир границ: [штрих, пробел] в points (утверждено Дмитрием 21.10.2026) */
const DASH_PATTERN = [5, 4];

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState(DEMO_REGION);
  /* зеркало региона для useFocusEffect (регион в deps не вносится —
     перезапуск эффекта на каждую камеру недопустим) */
  const regionRef = useRef(region);
  /* редактирование: точка места для прицеливания камеры при первом замере
     шторки (сценарий карандаша, Дмитрий 23.10); null — не редактирование */
  const editAimRef = useRef<GeoPoint | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [appliedFilter, setAppliedFilter] = useState(getAppliedMapFilter());
  const { width, height: screenH } = useWindowDimensions();

  /* процесс добавления места: РЕАКТИВНО из store (defect 23.10: при успехе
      публикации put(null) рендерил шторку с null-черновиком раньше снятия —
      «Cannot read property 'privacy' of null»; подписка делает снятие
      атомарным с clearPlaceCreateDraft) */
  const adding = usePlaceCreateActive();
  const createExitRef = useRef<(() => void) | null>(null);
  /* высота шторки шага 1 (замер) и её экранный сдвиг (общее value со шторкой):
      зум-пара/гео/прицел/следят за верхней границей шторкой синхронно
      (bag/modal.md §4–5, ворклеты — без React state на кадрах, §8) */
  const [sheetH, setSheetH] = useState(0);
  const sheetShift: SharedValue<number> = useSharedValue(0);

  /* метки гаснут/возвращаются плавно (Дмитрий 23.10): fade 300 мс; управление —
      в обработчиках событий (не в эффектах): «+» — fade-out, снятие шторки
      (отмена/успех/возврат) — fade-in. Animated value — useMemo (не ref) */
  const [markersState, setMarkersState] = useState<'shown' | 'fading-out' | 'hidden' | 'fading-in'>('shown');
  const markerOpacity = useMemo(() => new Animated.Value(1), []);

  const startFadeOut = useCallback(() => {
    markerOpacity.setValue(1);
    setMarkersState('fading-out');
    Animated.timing(markerOpacity, { toValue: 0, duration: 300, useNativeDriver: false }).start(
      ({ finished }) => {
        if (finished) {
          setMarkersState('hidden');
        }
      },
    );
  }, [markerOpacity]);

  const startFadeIn = useCallback(() => {
    markerOpacity.setValue(0);
    setMarkersState('fading-in');
    Animated.timing(markerOpacity, { toValue: 1, duration: 300, useNativeDriver: false }).start(
      ({ finished }) => {
        if (finished) {
          setMarkersState('shown');
        }
      },
    );
  }, [markerOpacity]);
  /* загрузка и актуализация на возврате (createPlace добавил место,
      фильтр коммитится до back; возврат/успех шага 2) — перечитать и
      шторку шага 1: draft жив → шторка открыта, null → снята */
  useFocusEffect(
    useCallback(() => {
      setAppliedFilter(getAppliedMapFilter());
      demoPlaceRepo.getPlaces().then(setPlaces);
      demoPlaceRepo.getAllReports().then(setReports);
      /* снятие шторки управляется стором (adding = draft != null); здесь —
          только данные и возврат меток после отмены/успеха */
      if (getPlaceCreateDraft() == null && markersState === 'hidden') {
        startFadeIn();
      }
      /* геопоиск (ТЗ _x/20.md §8): выбор результата закоммитил цель;
          камера плавно уезжает на границы пункта, метки/кластеры
          пересчитываются по новому региону сами. Один раз, цель очищается. */
      const target = getPendingSearchTarget();
      if (target) {
        clearPendingSearchTarget();
        mapRef.current?.animateToRegion(
          {
            latitude: target.coordinate.latitude,
            longitude: target.coordinate.longitude,
            latitudeDelta: target.latitudeDelta,
            longitudeDelta: target.longitudeDelta,
          },
          500,
        );
      }
      /* «Добавить» из Журнала (ТЗ _x/21.md §6) и карандаш карточки (сценарий
          Дмитрия 23.10): СУЩЕСТВУЮЩИЙ двухшаговый сценарий; place из запроса
          — редактирование: префилл черновика, применение только при
          финальном сохранении. Координата: новое место — центр карты,
          редактирование — точка места. */
      const request = consumeAddPlaceRequest();
      if (request) {
        const requested = request.place;
        const editCoordinate =
          requested == null
            ? { latitude: regionRef.current?.latitude ?? DEMO_REGION.latitude, longitude: regionRef.current?.longitude ?? DEMO_REGION.longitude }
            : requested.kind === 'exact'
              ? requested.coordinate
              : requested.view.coordinate;
        clearPlaceCreateDraft();
        const fresh = ensurePlaceCreateDraft({
          coordinate: editCoordinate,
          privacy: requested?.privacy,
          accuracy: requested?.kind === 'exact' ? 'exact' : requested == null ? undefined : 'approximate',
        });
        if (requested != null) {
          /* префилл шага 2 + маркер редактирования: форма коммитит
              updatePlace ЕДИНСТВЕННО на финальном сохранении */
          setPlaceCreateDraft({
            ...fresh,
            editPlaceId: requested.id,
            name: requested.name,
            placeType: requested.placeType,
            fishSpecies: [...requested.fishSpecies],
            access: requested.access,
            description: requested.description ?? '',
            photos: [...requested.photos],
          });
        }
        setSheetH(0);
        if (requested != null) {
          /* камера к точке места после первого замера шторки: прицел =
             точка места (та же арифметика §8 противо-сдвига) */
          editAimRef.current = requested.kind === 'exact' ? requested.coordinate : requested.view.coordinate;
        }
        if (markersState !== 'hidden' && markersState !== 'fading-out') {
          startFadeOut();
        }
      }
    }, [markersState, startFadeIn, startFadeOut]),
  );

  /* точка = центр карты: live в шторку и в черновик. onRegionChangeComplete,
     а не onRegionChange: при инициализации MapKit эмитирует промежуточные
     регионы — точку молча менять нельзя (§7, дефект из старой реализации).
     Координата черновика = мир ПОД ПРИЦЕЛОМ (центр области над шторкой):
     карта центр + пол-высоты шторки по широте; камера при этом НЕ ДВИГАЕТСЯ
     (компенсацию камеры снял Дмитрий 23.10: бестолкова, вместо неё — зум) */
  const handleRegionChange = (next: typeof region) => {
    setRegion((prev) => ({ ...prev, ...next }));
    regionRef.current = { ...regionRef.current, ...next };
    const current = getPlaceCreateDraft();
    if (current != null && sheetH > 0) {
      /* lift — метры → градусы широты: /111_320 (метров в градусе) */
      const mpp = (next.latitudeDelta * 111_320) / screenH;
      const liftLat = ((sheetH / 2) * mpp) / 111_320;
      setPlaceCreateDraft({
        ...current,
        coordinate: { latitude: next.latitude + liftLat, longitude: next.longitude },
      });
    }
  };

  /* зум-подтяжка снята (Дмитрий 23.10: «жестко» — пусть пользователь сам
      зумит); гео-кнопка шага — временный reset: вернуть карту в дефолт */

  /* фильтрация по чистой функции: кластеризация и тапы по областям работают
      ТОЛЬКО с прошедшим фильтр списком */
  const filteredPlaces = useMemo(
    () => applyMapFilter(places, reports, appliedFilter),
    [places, reports, appliedFilter],
  );

  const index = useMemo(() => new PlaceClusterIndex(filteredPlaces), [filteredPlaces]);


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

  /* спека §2: тап по пину или свободной части области → сразу карточка места */
  const openPlace = (placeId: string) => router.push(`/place/${placeId}`);

  /**
   * Тап по области приблизительного места — геометрически, без overlay-слоёв:
   * у Circle пресс-события нет, а Polygon под Fabric на iOS ненадёжен
   * (rnmaps #5928/#5457 — области пропадают). Координата тапа проверяется
   * расстоянием до центров областей; точные пины и кластеры перехватывают
   * свои тапы раньше (stopPropagation у marker'ов).
   */
  const handleMapPress = (e: MapPressEvent) => {
    if (adding) {
      return; /* шаг 1: тапы по карте выбор точки не открывают */
    }
    const c = e.nativeEvent.coordinate;
    const hit = filteredPlaces
      .filter((p): p is Extract<Place, { kind: 'approximate' }> => p.kind === 'approximate')
      .find((p) => {
        const dLat = (c.latitude - p.view.coordinate.latitude) * 111_320;
        const dLon = (c.longitude - p.view.coordinate.longitude) * 111_320;
        return Math.sqrt(dLat * dLat + dLon * dLon) <= p.view.radiusMeters;
      });
    if (hit) {
      openPlace(hit.id);
    }
  };

  /* Шаг 1 — оверлей на этой карте: прицел по точности (К 383:7080/7114/7152):
      «Точно»/«Только я» — крест (акцент), «Примерно» — честная область
      (диаметр 1 км, dp-проекция зума) + тики прицела поверх, всегда (Вариант 2,
      Дмитрий 23.10). Круг масштабируется зумом — сразу видно, какая область */
  const draft = usePlaceCreateDraft();
  const areaApproximate = draft?.privacy === 'public' && draft?.accuracy === 'approximate';
  /* диаметр области 1 км = dp-проекция радиуса 500 м по текущему зуму */
  const areaRadiusPx = areaApproximate
    ? 500 / ((region.latitudeDelta * 111_320) / screenH)
    : 0;
  const areaDiameter = areaRadiusPx * 2 + 1; /* +1 — обводка 0.5 не срезается */

  /* контролы и метки следят за верхней границей шторки синхронно (ворклеты) */
  const areaFollowShift = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, sheetH - sheetShift.value),
  }));
  const geoFollowShift = useAnimatedStyle(() => ({
    bottom: Math.max(24, sheetH + 24 - sheetShift.value),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
      <MapView
        ref={mapRef}
        style={styles.map}
        userInterfaceStyle="light"
        initialRegion={region}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChange}>
        {/* метки гаснут/возвращаются плавно (fading-out → hidden → fading-in);
            области Circle (приблизительных мест) снимаются сразу — у Circle
            нет children для fade */}
        {markersState !== 'hidden' &&
          objects.map((o) => {
          switch (o.type) {
            case 'cluster':
              return (
                <Marker
                  key={`cluster-${o.id}`}
                  coordinate={o.coordinate}
                  tracksViewChanges={markersState !== 'shown'}
                  stopPropagation
                  onPress={() => expand(o.coordinate, o.expansionZoom)}>
                  <Animated.View style={{ opacity: markerOpacity }}>
                    <ClasterPoint kind={o.kind} count={o.count} />
                  </Animated.View>
                </Marker>
              );
            case 'exactPlace':
              return (
                <Marker
                  key={o.place.id}
                  coordinate={o.place.coordinate}
                  tracksViewChanges={markersState !== 'shown'}
                  stopPropagation
                  onPress={() => openPlace(o.place.id)}>
                  <Animated.View style={{ opacity: markerOpacity }}>
                    <LocationDot />
                  </Animated.View>
                </Marker>
              );
            case 'approxPlace':
              /* Circle: провереннаяslice-1 отрисовка областей (Polygon под
                 Fabric на iOS ненадёжен — rnmaps #5928/#5457); тап — через
                 геометрическую проверку в handleMapPress */
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
        {/* прицел шага 1 (K 383:7080/7114/7152): центр области карты над
            шторкой, следит за ней; камера не трогается (§5/§6) */}
        {adding && (
          <ReAnimated.View pointerEvents="none" style={[styles.crosshairWrap, areaFollowShift]}>
            {/* «Примерно» (вариант 2, Дмитрий 23.10): честная область —
                dp-проекция радиуса 500 м (диаметр 1 км, масштаб с зумом),
                тики СНАРУЖИ у границы, едут с ней */}
            {areaApproximate ? <AreaSight diameter={areaDiameter} /> : <Crosshair />}
          </ReAnimated.View>
        )}
        {adding ? (
          <>
            {/* назад (383:7087): отмена процесса — та же точка, что свайп граббера */}
            <View style={[styles.back, { top: insets.top + 8 }]}>
              <ButtonUi
                icon="chevronLeft"
                accessibilityLabel="Отменить создание места"
                onPress={() => createExitRef.current?.()}
              />
            </View>
            {/* поиск (383:7090); слои убраны (Дмитрий 23.10) — заглушка */}
            <View style={[styles.topCol, { top: insets.top + 8 }]}>
              <ButtonUi icon="magnifyingGlass" accessibilityLabel="Поиск (не подключено)" />
            </View>
            {/* геолокация (383:7093): следует за шторкой; фейк-гео: возврат
                в посёлок Восход (Дмитрий 23.10) */}
            <ReAnimated.View style={[styles.geo, geoFollowShift]}>
              <ButtonUi
                icon="locationCrosshairs"
                accessibilityLabel="Вернуться в моё местоположение — посёлок Восход"
                onPress={() => mapRef.current?.animateToRegion({ ...FAKE_USER_LOCATION, latitudeDelta: DEMO_REGION.latitudeDelta, longitudeDelta: DEMO_REGION.longitudeDelta }, 250)}
              />
            </ReAnimated.View>
          </>
        ) : (
          <MapControls
            onFilterPress={() => router.push('/filter')}
            filterBadge={isFilterActive(appliedFilter)}
            /* геопоиск: полноэкранный /search (ТЗ _x/20.md) — карта остаётся
                смонтированной, состояние переживает закрытие (§9) */
            onSearchPress={() => router.push('/search')}
            onGeoPress={() =>
              /* фейк-гео (Дмитрий 23.10): возврат в посёлок Восход */
              mapRef.current?.animateToRegion(
                { ...FAKE_USER_LOCATION, latitudeDelta: DEMO_REGION.latitudeDelta, longitudeDelta: DEMO_REGION.longitudeDelta },
                250,
              )
            }
            onAddPress={() => {
              /* новый процесс создания: черновик сбрасывается и заново ensured —
                  переход хранит adding (store, реактивно); карту не двигаем */
              clearPlaceCreateDraft();
              ensurePlaceCreateDraft({
                coordinate: { latitude: region.latitude, longitude: region.longitude },
              });
              setSheetH(0);
              if (markersState !== 'hidden' && markersState !== 'fading-out') {
                startFadeOut();
              }
            }}
          />
        )}
        {/* зум (383:7084): пара по центру области карты — следует за шторкой;
            box-none: пустые зоны колонки не перехватывают тапы (правый борт) */}
        <ReAnimated.View pointerEvents="box-none" style={[styles.controls, areaFollowShift]}>
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
        </ReAnimated.View>
      </View>

      {/* шторка шага 1 — оверлей поверх полной карты (под свайпом — карта) */}
      {adding && (
        <AddPlaceSheet
          latitude={region.latitude}
          longitude={region.longitude}
          registerExit={(exit) => {
            createExitRef.current = exit;
          }}
          onHeightChange={(h) => {
            setSheetH(h);
            /* редактирование: первая измеренная высота шторки — анимируем
                камеру так, чтобы прицел совпал с точкой места: прецедент
                арифметики §8, координата = точка − половина шторки */
            const aim = editAimRef.current;
            if (aim && h > 0) {
              const r = regionRef.current ?? { latitudeDelta: DEMO_REGION.latitudeDelta };
              const mpp = (r.latitudeDelta * 111_320) / screenH;
              const liftLat = ((h / 2) * mpp) / 111_320;
              mapRef.current?.animateToRegion(
                {
                  latitude: aim.latitude - liftLat,
                  longitude: aim.longitude,
                  latitudeDelta: r.latitudeDelta,
                  longitudeDelta: r.longitudeDelta,
                },
                250,
              );
              editAimRef.current = null;
            }
          }}
          sheetShift={sheetShift}
          /* снятие шторки — событие: adding снимет store (через clear),
              здесь только метки fade-in */
          onExit={() => {
            startFadeIn();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  /* область карты: при шаге 1 шторка в колонке ниже — прицел/зум занимают
     её высоту (§7); на обычном экране — весь вклад-экран (таб-бар скрыт
     в (tabs)/_layout только на шаге 1) */
  mapArea: {
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
  back: {
    /* назад (383:7087): как у прежней реализации шага 1 */
    position: 'absolute',
    left: 16,
  },
  topCol: {
    /* поиск/слои (383:7090), зазор 16 */
    position: 'absolute',
    right: 16,
    gap: 16,
  },
  geo: {
    /* геолокация (383:7093): 24 над шторкой */
    position: 'absolute',
    right: 16,
  },
  crosshairWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});