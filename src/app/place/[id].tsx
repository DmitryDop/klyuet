import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

import ButtonIcon from '@/components/button-icon';
import { CURRENT_USER_ID, demoPlaceRepo, subscribeDataVersion, getDataVersion } from '@/data/repo';
import { toggleFavorite, removeFromFavorites, removeFavorite, restoreFavorite, useFavorites, useIsFavorite } from '@/data/favorites-store';
import { requestAddPlaceStart } from '@/data/add-request-store';
import type { Place, Report } from '@/data/types';
import { PlaceHeader, DIMMING_BACKDROP } from '@/components/map/place-header';
import InfoRow from '@/components/place/info-row';
import ReportItem from '@/components/place/report-item';
import Button from '@/components/button';
import SheetModal from '@/components/ui/sheet-modal';
import PhotoViewer from '@/components/ui/photo-viewer';
import { photoSource } from '@/logic/photos';
import ModalCard from '@/components/ui/modal-card';
import { showToast } from '@/components/ui/toast';
import { UI_ICONS } from '@/components/ui-icons';
import { setBottomReserve, clearBottomReserve } from '@/data/bottom-reserve-store';
import type { Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
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

/* Род названия места — по конечной букве (соглашение Дмитрия 24.10:
   «Затока» → «удалена»): а/я → ж. р., о/е → ср. р., иначе м. р. */
function endingsByGender(name: string) {
  const last = name.trim().slice(-1).toLowerCase();
  if (last === 'а' || last === 'я') return 'удалена';
  if (last === 'о' || last === 'е') return 'удалено';
  return 'удалён';
}

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = makeStyles(palette);
  const [place, setPlace] = useState<Place | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sheetUp, setSheetUp] = useState(false);
  /* действия места: шторка (K 436:12522) + удаление (ТЗ _x/22.md §9) */
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteErrorModal, setDeleteErrorModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /* избранное (ТЗ _x/30.md §2): единый стор; кнопка видна только у ЧУЖИХ
     мест (Дмитрий 25.10 — свои не добавляются в избранное) */
  const isFavorite = useIsFavorite(id);
  /* порядок избранного — для позиции «Вернуть» (FIX-07 §3) */
  const favoritesOrder = useFavorites();
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
     «Свежие отчеты» (reports.md §2: текущие списки обновлять при возврате);
     FIX-07: и по версии данных — восстановление отчёта тостом «Вернуть»
     доезжает на открытую карточку */
  const dataVersion = useSyncExternalStore(subscribeDataVersion, getDataVersion, getDataVersion);
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
      /* deps с dataVersion намеренно: перечитывание по версии данных (FIX-07) */
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, dataVersion]),
  );

  /* FIX-07: тост на 8 px над нижней панелью карточки (hook — до ранних
     возвратов; панель фиксированной высоты) */
  useEffect(() => {
    setBottomReserve('place-panel', 16 + 48 + 8 + insets.bottom);
    return () => clearBottomReserve('place-panel');
  }, [insets.bottom]);

  if (!loaded || !place) {
    return <View style={[styles.container, styles.stub]} />;
  }

  /* Правило Дмитрия: действия места (more → «Изменить»/«Удалить») → только
     у СВОИХ мест и только пока в них нет отчётов (появился любой отчёт —
     more нет). Кнопки поиска в карточке нет (убрана навсегда, макет 24.10). */
  const canEdit = place.ownerId === CURRENT_USER_ID && reports.length === 0;
  const subtitle =
    place.placeType === 'wild' ? 'Дикое место · Бесплатно' : 'Платное место';

  /* избранное (ТЗ §2; решение Дмитрия 26.10 — тосты возвращены, FIX-07):
      тап закладки — тост над нижними кнопками карточки;
      добавление — «Место добавлено в избранное» без действия;
      удаление — «Место удалено из избранного» + «Вернуть» (позиция строка
      сохраняется — restoreFavorite(index)); повторный тап — новый тост
      вытесняет предыдущий (FIX-07 §5) */
  const togglePlaceFavorite = () => {
    const before = favoritesOrder.indexOf(place.id);
    if (before >= 0) {
      removeFavorite(place.id);
      showToast('Место удалено из избранного', {
        label: 'Вернуть',
        onPress: () => restoreFavorite(place.id, before),
      });
    } else {
      toggleFavorite(place.id);
      showToast('Место добавлено в избранное');
    }
  };

  /* удаление (ТЗ _x/22.md §9): подтверждение уже принято; запрет при отчётах
      проверяет репо ('forbidden'); ошибка — остаёмся в карточке; успех —
      тост только после подтверждённого удаления, возврат на карту (камера
      сохраняется — карточка камеру не трогает), маркер исчезнет при
      перечитании списка картой */
  const confirmDelete = () => {
    if (deleting) return; /* блокировка повторного нажатия (ТЗ §9) */
    setDeleting(true);
    setDeleteModal(false);
    demoPlaceRepo
      .deletePlace(id, CURRENT_USER_ID)
      .then((res) => {
        if (res !== 'forbidden' && res != null) {
          /* место удалено — не оставить его в избранном (ТЗ §5) */
          removeFromFavorites(id);
          /* FIX-07 §2: тост с Undo — возврат на прежнюю позицию списка;
             карта перечитает список по версии данных (restore из тоста) */
          showToast('Место удалено', {
            label: 'Вернуть',
            onPress: () => {
              void demoPlaceRepo.restorePlace(res.snapshot, res.orderIndex).catch(() => {
                /* FIX-07 §6: ошибка восстановления — тост с повтором
                   (решение Дмитрия 25.10; снимок сохранён в замыкании) */
                showToast('Не удалось восстановить', {
                  label: 'Повторить',
                  onPress: () => {
                    void demoPlaceRepo.restorePlace(res.snapshot, res.orderIndex);
                  },
                });
              });
            },
          });
          router.back();
        } else {
          setDeleteErrorModal(true);
        }
      })
      .catch(() => setDeleteErrorModal(true))
      .finally(() => setDeleting(false));
  };

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
                      mode="secondary" appearance="outline"
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
            <ButtonIcon
              icon="chevronLeft"
              onPress={router.back}
              accessibilityLabel="Назад"
            />
          </View>
          {/* правый угол: только у СВОИХ мест без отчётов — more (меню действий:
              «Изменить»/«Удалить» в шторке, K 436:12518/12519; правило
              Дмитрия 22.10-23.10: пока нет отчётов). Кнопки поиска в карточке
              нет (убрана навсегда, макет 24.10). */}
          {canEdit && (
            <View style={[styles.headerButtonWrap, { top: insets.top + 8, right: 16 }]}>
              <ButtonIcon
                icon="more"
                accessibilityLabel="Действия по месту"
                onPress={() => setActionsOpen(true)}
              />
            </View>
          )}
          {/* правый угол у ЧУЖИХ мест: bookmark 44×44 (K 499:11119) —
              outline, залитый = в избранном (K 490:17054); у СВОИХ мест
              кнопки нет (кнопка избранного не предусмотрена, решение
              Дмитрия 25.10 — more остаётся как выше) */}
          {place.ownerId !== CURRENT_USER_ID && (
            <View style={[styles.headerButtonWrap, { top: insets.top + 8, right: 16 }]}>
              <ButtonIcon
                icon={isFavorite ? 'bookmarkFilled' : 'bookmark'}
                accessibilityLabel={isFavorite ? 'Убрать из избранного' : 'В избранное'}
                onPress={togglePlaceFavorite}
              />
            </View>
          )}
        </Animated.View>
      )}

      {/* тулбар: непрозрачен до самого верха (статус-зона тоже bg-primary).
          K 329:3598 (Скролл-02): обе кнопки остаются — внутри тулбара,
          Button-Icon Shadows=No, y = панель +8 (инстансы 312:3300) */}
      {sheetUp && (
        <View style={[styles.toolbar, { height: insets.top + 60 }]}>
          <View style={[styles.toolbarButton, { top: insets.top + 8, left: 16 }]}>
            <ButtonIcon
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
          {/* правая кнопка тулбара: more у СВОИХ мест без отчётов — меню
              действий (та же шторка, что из шапки); поиск убран из карточки
              навсегда (макет K обновлён Дмитрием 24.10) */}
          {canEdit && (
            <View style={[styles.toolbarButton, { top: insets.top + 8, right: 16 }]}>
              <ButtonIcon
                icon="more"
                type="toolbar"
                accessibilityLabel="Действия по месту"
                onPress={() => setActionsOpen(true)}
              />
            </View>
          )}
          {/* правая кнопка тулбара у ЧУЖИХ мест: bookmark доступен и после
              скролла (решение Дмитрия 25.10 — макет тулбара не задан) */}
          {place.ownerId !== CURRENT_USER_ID && (
            <View style={[styles.toolbarButton, { top: insets.top + 8, right: 16 }]}>
              <ButtonIcon
                icon={isFavorite ? 'bookmarkFilled' : 'bookmark'}
                type="toolbar"
                accessibilityLabel={isFavorite ? 'Убрать из избранного' : 'В избранное'}
                onPress={togglePlaceFavorite}
              />
            </View>
          )}
        </View>
      )}

      {/* шторка действий места (K 436:12522 = K-DS Sheet 246:4605: граббер +
          Slot 2Cell, без тулбара): «Изменить» → сценарий редактирования
          (та же точка, что карандаш); «Удалить» → подтверждение. Закрытие —
          тап вне/свайп/системная «назад» (SheetModal). */}
      {canEdit && (
        <PlaceActionsSheet
          visible={actionsOpen}
          onClose={() => setActionsOpen(false)}
          onEdit={() => {
            /* RN-Modal поверх RN-Modal при одновременном переходе не
               поднимается (репро 13:12: модалка не выезжает и висит
               прозрачным блокиратором) — закрыть шторку и на 320 мс позже
               (exit 250 мс + запас) выполнить действие */
            setActionsOpen(false);
            setTimeout(() => {
              requestAddPlaceStart(place);
              router.navigate('/(tabs)/map');
            }, 320);
          }}
          onDelete={() => {
            /* блокировка на время операции (ТЗ §9); переход Шторка → модалка
               — с паузой 320 мс (репро одновременного перехода 13:12) */
            if (deleting) return;
            setActionsOpen(false);
            setTimeout(() => setDeleteModal(true), 320);
          }}
        />
      )}

      {/* подтверждение удаления (решение Дмитрия 24.10): «Удалить» /
          «Оставить»; первая — Outline, вторая Primary (K-DS ModalCard) */}
      <ModalCard
        visible={deleteModal}
        icon="delete" /* корзина (K 460:5224, мастер K-DS 490:1000) */
        title="Удалить место?"
        body={`«${place.name}» будет ${endingsByGender(place.name)} без возможности восстановления.`}
        actions={[
          { label: 'Оставить', onPress: () => setDeleteModal(false) },
          { label: 'Удалить', mode: 'primary', appearance: 'negative', onPress: confirmDelete },
        ]}
        onClose={() => setDeleteModal(false)}
      />

      {/* ошибка удаления (прецедент формы места): остаёмся в карточке,
          повторить можно без потери места */}
      <ModalCard
        visible={deleteErrorModal}
        icon="warn"
        title="Не удалось удалить место"
        body="Попробуйте ещё раз."
        actions={[
          { label: 'Готово', onPress: () => setDeleteErrorModal(false) },
          { label: 'Повторить', onPress: confirmDelete },
        ]}
        onClose={() => setDeleteErrorModal(false)}
      />

      {/* Bottom Action (K 135:6279): панель прилипает к низу, bg bg-primary;
          «Добавить отчёт» → форма отчёта с привязкой placeId (reports.md §2) */}
      <View style={[styles.panel, { paddingBottom: 8 + insets.bottom }]}>
        <Button
          label="Добавить отчёт"
          mode="secondary" appearance="outline"
          flex
          onPress={() => router.push(`/report-form/${id}`)}
        />
        <Button label="Маршрут" mode="primary" appearance="accent" flex />
      </View>
    </View>
  );
}

/* Шторка действий места (K 436:12522; модал K-DS Sheet 246:4605): граббер —
   SheetModal; Slot pb 16; Cell: px 16, py 2, Left p 8 (иконка 24), текст
   py 8, Body 16/22. Тексты — «Изменить»/«Удалить» (макет 24.10). */
function PlaceActionsSheet({
  visible,
  onClose,
  onEdit,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  /* шторка без нижних кнопок: отступ от домашней полосы (решение Дмитрия 24.10) */
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = makeStyles(palette);
  return (
    <SheetModal visible={visible} onClose={onClose} fullHeight={false}>
      {/* Slot pb 16 + safe bottom (решение Дмитрия 24.10, обновление
          макета 484:16223 Bottom Action 27) */}
      <View style={[styles.actionsSlot, { paddingBottom: 16 + insets.bottom }]}>
        <PressableCell
          icon="pen"
          label="Изменить"
          onPress={onEdit}
          accessibilityLabel="Изменить место"
        />
        <PressableCell
          icon="delete"
          label="Удалить"
          onPress={onDelete}
          accessibilityLabel="Удалить место"
        />
      </View>
    </SheetModal>
  );
}

function PressableCell({
  icon,
  label,
  onPress,
  accessibilityLabel,
}: {
  icon: 'pen' | 'delete';
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.actionCell}>
      <View style={styles.actionCellLeft}>
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path d={UI_ICONS[icon].d} fill={palette.text} />
        </Svg>
      </View>
      <View style={styles.actionCellTextWrap}>
        <Text style={styles.actionCellText}>{label}</Text>
      </View>
    </Pressable>
  );
}

function PhotoStubRow({ photos }: { photos: string[] }) {
  /* горизонтальный свайп: плитки 130×88 фиксированной ширины, третья частично
     за правым краем блока (как в макете K 135:6258); реальные снимки
     (маркеры '1'/'2'/'3', photos.ts) вместо заглушек; тап — PhotoViewer */
  const palette = useTheme();
  const styles = makeStyles(palette);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoRow}
        pagingEnabled={false}>
        {photos.map((ph, i) => (
          <Pressable
            key={ph}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Фото ${i + 1} из ${photos.length}`}
            onPress={() => setViewerIndex(i)}>
            <View style={styles.photoStub}>
              <Image source={photoSource(ph)} style={styles.photoReal} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {viewerIndex != null && (
        <PhotoViewer
          visible
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  stub: {},
  sheet: {
    backgroundColor: palette.background,
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
    color: palette.text,
  },
  subtitle: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
    marginTop: 4, /* название → подзаголовок: 4 (08.md §4) */
  },
  block: {
    backgroundColor: palette.cardSurface,
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
    color: palette.textSecondary,
    marginBottom: 12, /* «Комментарий» → текст: 12 (mock: 30 − 18) */
  },
  blockLabel8: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
    marginBottom: 8, /* «Фото» → картинки: 8 (mock: 26 − 18) */
  },
  blockText: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: palette.text,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoReal: {
    width: 130,
    height: 88,
    borderRadius: 12, /* плитка фото — как photoStub (K 135:6258) */
    borderCurve: 'continuous',
  },
  photoStub: {
    width: 130,
    height: 88,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoText: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
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
    backgroundColor: palette.background,
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
    color: palette.text,
    textAlign: 'center',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: palette.background,
    flexDirection: 'row',
    gap: 8,
  },
  /* шторка действий (K 436:12522;237:3907): Slot pb md 16 */
  actionsSlot: {
    paddingBottom: 16,
  },
  actionCell: {
    /* Cell (436:12518): ряд (иконка слева, текст справа), px 16, py 3xs 2 */
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  actionCellLeft: {
    /* Left (459:736): p xs 8, иконка 24 */
    padding: 8,
  },
  actionCellTextWrap: {
    /* Layuot Txt (268:1023): py 8 у текстовой колонки */
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  actionCellText: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: palette.text,
  },
});