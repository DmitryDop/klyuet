import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import ButtonUi from '@/components/button-ui';
import { CURRENT_USER_ID, demoPlaceRepo } from '@/data/repo';
import type { Place, Report } from '@/data/types';
import { PlaceHeader } from '@/components/map/place-header';
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

  useEffect(() => {
    Promise.all([demoPlaceRepo.getPlace(id), demoPlaceRepo.getReports(id)]).then(
      ([p, rs]) => {
        setPlace(p);
        setReports(rs);
        setLoaded(true);
      },
    );
  }, [id]);

  if (!loaded || !place) {
    return <View style={[styles.container, styles.stub]} />;
  }

  const isOwner = place.ownerId === CURRENT_USER_ID;
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
      {/* фиксированная шапка (карта + маркер + плашка), без кнопок */}
      <View style={StyleSheet.absoluteFill}>
        <PlaceHeader place={place} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: SHEET_TOP, paddingBottom: panelReserve + 16 }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setSheetUp(y >= SHEET_TOP - insets.top - 56);
        }}
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

            {/* отчёты, счётчик по решению Дмитрия: при 1–2 отчётах весь список
                без кнопки (нижний отступ после последнего — 16, K 333:5762);
                с 3-го — две свежих + «Все отчеты (N)», остальные по тапу */}
            {reports.length > 0 && (
              <View
                style={[
                  styles.block,
                  styles.reportBlock,
                  reports.length < 3 && styles.reportBlockNoButton,
                ]}>
                <Text style={[styles.blockLabel12, styles.reportTitle]}>Свежие отчеты</Text>
                {reports
                  .slice(0, reports.length >= 3 ? 2 : reports.length)
                  .map((r, i) => (
                    <ReportItem
                      key={r.id}
                      report={r}
                      separator={
                        i <
                        Math.min(reports.length, reports.length >= 3 ? 2 : reports.length) - 1
                      }
                    />
                  ))}
                {reports.length >= 3 && (
                  <View style={styles.ctaWrap}>
                    <Button label={`Все отчеты (${reports.length})`} variant="outline" />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* кнопки шапки поверх скролла; при тулбаре — скрыты (назад в тулбаре).
          K 135:6230 button_overlay_map: top 52 при статус-полосе 44 → 8 от safe area */}
      {!sheetUp && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={[styles.headerButtonWrap, { top: insets.top + 8, left: 16 }]}>
            <ButtonUi
              icon="chevronLeft"
              onPress={router.back}
              accessibilityLabel="Назад"
            />
          </View>
          <View style={[styles.headerButtonWrap, { top: insets.top + 8, right: 16 }]}>
            <ButtonUi
              icon={isOwner ? 'pen' : 'magnifyingGlass'}
              accessibilityLabel={
                isOwner ? 'Редактировать место (не подключено)' : 'Поиск (не подключено)'
              }
            />
          </View>
        </View>
      )}

      {/* тулбар: непрозрачен до самого верха (статус-зона тоже bg-primary).
          K 329:3598 (Скролл-02): обе кнопки остаются — внутри тулбара,
          button-ui Shadows=No, y = панель +8 (инстансы 312:3300) */}
      {sheetUp && (
        <View style={[styles.toolbar, { height: insets.top + 56 }]}>
          <View style={[styles.toolbarButton, { top: insets.top + 8, left: 16 }]}>
            <ButtonUi
              icon="chevronLeft"
              type="toolbar"
              onPress={router.back}
              accessibilityLabel="Назад"
            />
          </View>
          <Text style={styles.toolbarTitle} numberOfLines={1}>
            {place.name}
          </Text>
          <View style={[styles.toolbarButton, { top: insets.top + 8, right: 16 }]}>
            <ButtonUi
              icon={isOwner ? 'pen' : 'magnifyingGlass'}
              type="toolbar"
              accessibilityLabel={
                isOwner ? 'Редактировать место (не подключено)' : 'Поиск (не подключено)'
              }
            />
          </View>
        </View>
      )}

      {/* Bottom Action (K 135:6279): панель прилипает к низу, bg bg-primary */}
      <View style={[styles.panel, { paddingBottom: 8 + insets.bottom }]}>
        <Button label="Добавить отчёт" variant="outline" flex />
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
    paddingHorizontal: 8,
    /* в K перед кнопкой comments-content имеет pb-[24px] — «кнопка прилипла
       к тексту» исправлено отступом 24 */
    marginTop: 24,
  },
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toolbarButton: {
    position: 'absolute',
    overflow: 'hidden',
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