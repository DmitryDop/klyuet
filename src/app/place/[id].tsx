import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import ButtonUi from '@/components/button-ui';
import { CURRENT_USER_ID, demoPlaceRepo } from '@/data/repo';
import { requestAddPlaceStart } from '@/data/add-request-store';
import type { Place, Report } from '@/data/types';
import { PlaceHeader, DIMMING_BACKDROP } from '@/components/map/place-header';
import InfoRow from '@/components/place/info-row';
import ReportItem from '@/components/place/report-item';
import Button from '@/components/button';
import { UI_ICONS } from '@/components/ui-icons';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/* Карточка места (slice 3; K 135:6230 + анимация 328:3096):
   - шапка-снимок фиксирована за контентом; лист едет поверх, перекрывая карту;
     bg #e8ece5 и верхние скругления 24 — у ЛИСТА (иначе прозрачный лист
     рисует заголовок поверх карты);
   - кнопки шапки поверх скролла отдельным слоем (box-none: жест на карте
     скроллит контент, тапы до кнопок доходят); при появлении тулбара
     кнопки шапки скрыты, назад работает из тулбара;
   - Bottom Action прилипает к низу экрана (решение Дмитрия).
   - Тап по отчёту → /report/[id] (slice 4); «Все отчеты (N)» → /place-reports/[id].

   Внутренние отступы по макету: «Фото» → картинки 8; «Комментарий» → текст 12. */

const SHEET_TOP = 280; /* лист стартует на y=280: перекрытие шапки на 40 */

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState<Place | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sheetUp, setSheetUp] = useState(false);
  /* скролл-анимация K 328:3096 (Дмитрий 22.10, механика макета): подложка
     шапки «ovelay map» — сплошной #181D1C; на блоке шапки (dimming block:
     карта+маркер+плашка+кнопки) альфа-канал по кадрам 05/04/03 — перекрытие
     72/96/136 → RN y 32/56/96 (перекрытие = 40 + scrollY): 1 → 0.7 → 0.4, clamp.
     Reanimated ворклеты — нативный драйвер, без ре-рендеров
     (Animated.event в RN 0.86 — crash «Object is not a function»). */
  const scrollY = useSharedValue(0);
  const toolbarThreshold = SHEET_TOP - insets.top - 56; /* порог тулбара */
  const headerAnim = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [32, 56, 96], [1, 0.7, 0.4], 'clamp'),
  }));
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      /* SharedValue присваивается в ворклете — это не React state (реанимация) */
      // eslint-disable-next-line react-hooks/immutability
      scrollY.value = e.contentOffset.y;
      runOnJS(setSheetUp)(e.contentOffset.y >= toolbarThreshold);
    },
  });

  useEffect(() => {
    void (async () => {
      const p = await demoPlaceRepo.getPlace(id);
      if (p) setPlace(p);
      setLoaded(true);
    })();
  }, [id]);

  /* отчёты обновляются при возврате: публикация из формы меняет список
     «Свежие отчеты» (reports.md §2: текущие списки обновлять при возврате) */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const rs = await demoPlaceRepo.getReports(id);
        if (alive) setReports(rs);
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  if (!loaded || !place) {
    return <View style={[styles.container, styles.stub]} />;
  }

  /* Правило Дмитрия: pencil → только у СВОИХ мест и только пока в них нет
     отчётов (появился любой отчёт — карандаша нет). Кнопки поиска в
     карточке нет (убрана Дмитрием 23.10). Касается всех мест. */
  const canEdit = place.ownerId === CURRENT_USER_ID && reports.length === 0;
  const subtitle =
    place.placeType === 'wild' ? 'Дикое место · Бесплатно' : 'Платное место';

  const rows: [string, string][] = [
    ['Какая рыба здесь ловилась', place.fishSpecies.join(', ') || '—'],
    ...(place.access != null ? [['Доступ', place.access] as [string, string]] : []),
    ...(place.fishing != null
      ? ([['Рыбалка', place.fishing === 'shore' ? 'С берега' : 'С лодки']] as [string, string][])
      : []),
  ];
  const panelReserve = 16 + 48 + 8 + insets.bottom;

  return (
    <View style={styles.container}>
      {/* dimming по макету: подложка «ovelay map» (#181D1C) — отдельным слоем,
          НЕ анимируется; альфика получает только content-блок над ней
          (карта+маркер+плашка) — иначе подложка светлеет вместе с картой */}
      <View style={[StyleSheet.absoluteFill, styles.dimmingBackdrop]} />
      <Animated.View style={[StyleSheet.absoluteFill, headerAnim]}>
        <PlaceHeader place={place} scrollY={scrollY} />
      </Animated.View>

      {/* лист-скролл — Reanimated ScrollView: только он принимает
          useAnimatedScrollHandler (ворклет, нативный драйвер).
          Системный индикатор включён (Дмитрий 23.10) */}
      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: SHEET_TOP, paddingBottom: panelReserve + 16 }}
        showsVerticalScrollIndicator
        onScroll={scrollHandler}
        scrollEventThrottle={16}>
        {/* лист: bg #e8ece5 и верхние скругления 24; стартует на y=280
            (paddingTop контейнера) — перекрытие нижних 40px шапки получается
            позиционированием, без отрицательных отступов */}
        <View style={[styles.sheet, { flexGrow: 1 }]}>
          <View style={styles.sheetPadding}>
          {/* Title (K 333:5721): заголовок + подзаголовок; отступ вниз 8 — pb узла Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{place.name}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

            {/* параметры места (K 135:6245): блок #f8f9f5, py 16, radius 16 */}
            <View style={[styles.block, styles.blockFirst, styles.blockPadY]}>
              {rows.map(([label, value], i) => (
                <InfoRow key={label} label={label} value={value} separator={i < rows.length - 1} />
              ))}
            </View>

            {/* комментарий: пустая секция скрыта; label→текст 12 */}
            {place.description != null && place.description !== '' && (
              <View style={[styles.block, styles.blockPad]}>
                <Text style={styles.blockLabel12}>Комментарий</Text>
                <Text style={styles.blockText}>{place.description}</Text>
              </View>
            )}

            {/* фото: горизонтальный свайп демо-заглушек (третья плитка
                частично уходит за правый край, как в макете);
                label→картинки 8 (макет: 26 − 18) */}
            {place.photos.length > 0 && (
              <View style={[styles.block, styles.blockPad]}>
                <Text style={styles.blockLabel8}>Фото</Text>
                <PhotoStubRow photos={place.photos} />
              </View>
            )}

            {/* отчёты: при ≤3 — весь список без кнопки; с 4-го — три свежих
                + «Все отчеты (N)», остальные по тапу (Дмитрий 22.10) */}
            {reports.length > 0 && (
              <View
                style={[
                  styles.block,
                  styles.reportBlock,
                  reports.length < 4 && styles.reportBlockNoButton,
                ]}>
                <Text style={[styles.blockLabel12, styles.reportTitle]}>Свежие отчеты</Text>
                {reports
                  .slice(0, reports.length >= 4 ? 3 : reports.length)
                  .map((r, i) => (
                    <ReportItem
                      key={r.id}
                      report={r}
                      separator={
                        i <
                        Math.min(reports.length, reports.length >= 4 ? 3 : reports.length) - 1
                      }
                      onPress={() => router.navigate(`/report/${r.id}`)}
                    />
                  ))}
                {reports.length >= 4 && (
                  <View style={styles.ctaWrap}>
                    <Button
                      label={`Все отчеты (${reports.length})`}
                      variant="outline"
                      onPress={() => router.navigate(`/place-reports/${id}`)}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* кнопки шапки поверх скролла; при тулбаре — скрыты (назад в тулбаре);
          приглушаются dimming'ом по скроллу, как шапка (K 328:3096, кнопки
          входят в dimming block кадра 03) */}
      {!sheetUp && (
        <Animated.View style={[StyleSheet.absoluteFill, headerAnim]} pointerEvents="box-none">
          <View style={[styles.headerButtonWrap, { top: insets.top + 8, left: 16 }]}>
            <ButtonUi
              icon="chevronLeft"
              onPress={router.back}
              accessibilityLabel="Назад"
            />
          </View>
          {/* правый угол: только у СВОИХ мест без отчётов — карандаш
              (правило Дмитрия 22.10: pencil → только пока нет отчётов).
              Сценарий редактирования (Дмитрий 23.10): шаг 1 на карте с
              точкой места → шаг 2 — «Сохранить изменения»; изменения
              применяются только в конце. Кнопки поиска в карточке нет. */}
          {canEdit && (
            <View style={[styles.headerButtonWrap, { top: insets.top + 8, right: 16 }]}>
              <ButtonUi
                icon="pen"
                accessibilityLabel="Редактировать место"
                onPress={() => {
                  requestAddPlaceStart(place);
                  /* переход на карту: шаг 1 откроется поверх (интент-стор) */
                  router.navigate('/(tabs)/map');
                }}
              />
            </View>
          )}
        </Animated.View>
      )}

      {/* тулбар: непрозрачен до самого верха (статус-зона тоже bg-primary).
          K 329:3598 (Скролл-02): обе кнопки остаются — внутри тулбара,
          button-ui Shadows=No, y = панель +8 (инстансы 312:3300) */}
      {sheetUp && (
        <View style={[styles.toolbar, { height: insets.top + 60 }]}>
          <View style={[styles.toolbarButton, { top: insets.top + 8, left: 16 }]}>
            <ButtonUi
              icon="chevronLeft"
              type="toolbar"
              onPress={router.back}
              accessibilityLabel="Назад"
            />
          </View>
          {/* заголовок: always центр панели (docs/components-toolbar.md),
              не в потоке — раньше «упал» вниз при justifyContent flex-end */}
          <View
            style={[styles.toolbarTitleWrap, { top: insets.top + 8, bottom: 8 }]}
            pointerEvents="none">
            <View style={styles.toolbarTitleBox}>
              <Text style={styles.toolbarTitle} numberOfLines={1}>
                {place.name}
              </Text>
            </View>
          </View>
          <View style={[styles.toolbarButton, { top: insets.top + 8, right: 16 }]}>
            <ButtonUi
              icon={canEdit ? 'pen' : 'magnifyingGlass'}
              type="toolbar"
              accessibilityLabel={
                canEdit ? 'Редактировать место (не подключено)' : 'Поиск (не подключено)'
              }
            />
          </View>
        </View>
      )}

      {/* Bottom Action (K 135:6279): панель прилипает к низу, bg bg-primary;
          «Добавить отчёт» → форма отчёта с привязкой placeId (reports.md §2) */}
      <View style={[styles.panel, { paddingBottom: 8 + insets.bottom }]}>
        <Button
          label="Добавить отчёт"
          variant="outline"
          flex
          onPress={() => router.push(`/report-form/${id}`)}
        />
        <Button label="Маршрут" variant="primary" flex />
      </View>
    </View>
  );
}

function PhotoStubRow({ photos }: { photos: string[] }) {
  /* горизонтальный свайп: плитки 130×88 фиксированной ширины, третья частично
     за правым краем блока (как в макете K 135:6258) */
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photoRow}
      pagingEnabled={false}>
      {photos.map((ph, i) => (
        <View key={ph} style={styles.photoStub}>
          {/* демо-заглушка как в прототипе: камера + «Демо-фото N»
              (K-DS camera 258:727; реальные снимки — этап отчётов) */}
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d={UI_ICONS.camera.d} fill={Colors.light.textSecondary} />
          </Svg>
          <Text style={styles.photoText}>Демо-фото {i + 1}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  stub: {},
  sheet: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24, /* скругления 24 слева/справа (Дмитрий) */
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
  },
  sheetPadding: {
    padding: 16,
  },
  headerButtonWrap: {
    position: 'absolute',
  },
  titleBlock: {
    paddingBottom: 16, /* под подзаголовком ДОБАВЛЕНО 8px: было pb 8 → 16 (Дмитрий, 21.10) */
  },
  title: {
    ...rnTextStyle(TEXT.title2),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
  subtitle: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    marginTop: 4, /* название → подзаголовок: 4 (08.md §4) */
  },
  block: {
    backgroundColor: Colors.light.cardSurface,
    borderRadius: 16,
    borderCurve: 'continuous',
    marginTop: 8, /* gap-8px между блоками макета */
  },
  blockFirst: {
    marginTop: 0, /* после Title гэп уже в paddingBottom 8 — без дубля */
  },
  blockPad: {
    padding: 16,
  },
  blockPadY: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  reportBlock: {
    paddingTop: 16,
    paddingBottom: 8, /* после кнопки 8 (K block pb-8) */
  },
  reportBlockNoButton: {
    paddingBottom: 16, /* 8 блока + 8 содержимого = 16 после последнего item */
  },
  reportTitle: {
    paddingHorizontal: 16,
    /* перекрывает marginBottom blockLabel12: по K один отступ pb 12
       после заголовка (было 12+12 — «огромный отступ») */
    marginBottom: 0,
    paddingBottom: 12,
  },
  blockLabel12: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    marginBottom: 12, /* «Комментарий» → текст: 12 (mock: 30 − 18) */
  },
  blockLabel8: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    marginBottom: 8, /* «Фото» → картинки: 8 (mock: 26 − 18) */
  },
  blockText: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoStub: {
    width: 130,
    height: 88,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoText: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
  },
  ctaWrap: {
    /* контейнер кнопки «Все отчеты (N)»: слева/справа/снизу по 16
       (Дмитрий, 22.10) */
    paddingHorizontal: 16,
    paddingBottom: 16,
    /* в K перед кнопкой comments-content имеет pb-[24px] — «кнопка прилипла
       к тексту» исправлено отступом 24 */
    marginTop: 24,
  },
  dimmingBackdrop: {
    /* подложка «ovelay map» — сплошной #181D1C, высота зоны шапки 320
       (frame 330:5076 height=320; fill 330:5076, Дмитрий 22.10) */
    backgroundColor: DIMMING_BACKDROP,
    height: 320,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingBottom: 8, /* кнопка 44 + top 8 + низ 8 = 60 (отступ симметричный, Дмитрий 21.10) */
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toolbarButton: {
    position: 'absolute',
    overflow: 'hidden',
  },
  toolbarTitleWrap: {
    /* full-width обёртка: центр = центр панели, не зависит от кнопок */
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarTitleBox: {
    /* зона 255 (K-DS 218:405): ellipsis длинного названия */
    width: 255,
    alignItems: 'center',
  },
  toolbarTitle: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
    textAlign: 'center',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    flexDirection: 'row',
    gap: 8,
  },
});