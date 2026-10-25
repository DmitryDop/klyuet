import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ButtonIcon from '@/components/button-icon';
import Button from '@/components/button';
import AuthorReportsSheet from '@/components/report/author-sheet';
import ReportContent from '@/components/report/report-content';
import SheetModal from '@/components/ui/sheet-modal';
import ModalCard from '@/components/ui/modal-card';
import { showToast } from '@/components/ui/toast';
import { SkeletonReportDetails } from '@/components/ui/skeleton';
import { UI_ICONS } from '@/components/ui-icons';
import { CURRENT_USER_ID, demoPlaceRepo } from '@/data/repo';
import { setBottomReserve, clearBottomReserve } from '@/data/bottom-reserve-store';
import type { Place, Report } from '@/data/types';
import type { Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/* Детали отчёта (slice 4 + шторка отчётов рыбака, navigation.md 22.10) —
   K 156:8408 / 157:8531 / 199:9347 / 199:9262 / 199:9421:
   - тулбар статичный: назад + «Отчёт о рыбалке» (Headline 16/20); «⋯» справа
     только у СВОЕГО отчёта (§5; макет обновлён Дмитрием 25.10 — был pen)
     → шторка действий «Изменить»/«Удалить» по паттерну карточки места
     (K 436:12522, саммари QA-08/B); «Изменить» → /report-form;
     «Удалить» → подтверждение ModalCard;
   - контент — общий ReportContent (галерея/place/about/комментарий);
   - чужой отчёт: Outline «Все отчеты рыбака (N)» (K 201:9550) → ШТОРКА
     (navigation.md): список отчётов автора и полный отчёт — вложенный
     сценарий внутри одной Sheet-модалки; крестик закрывает всю Sheet,
     «Перейти в место» из модального отчёта завершает ветку (Карта → место);
   - у своего отчёта кнопки «Все отчеты рыбака» нет (§2);
   - Bottom Action: primary «Перейти в место» → /place/[placeId];
   - state: skeleton/ошибки загрузки — этап общих состояний. */

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation<{ getState(): { routes: { name: string; params?: Record<string, unknown> }[] } | undefined }>();
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = makeStyles(palette);
  const [report, setReport] = useState<Report | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [authorCount, setAuthorCount] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteErrorModal, setDeleteErrorModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await demoPlaceRepo.getReport(id);
      if (!alive) return;
      if (r == null) {
        /* отчёт не найден — состояние ошибки с Повторить (§8) */
        setFailed(true);
        return;
      }
      const [p, authorReports] = await Promise.all([
        demoPlaceRepo.getPlace(r.placeId),
        demoPlaceRepo.getReportsByAuthor(r.authorId),
      ]);
      if (!alive) return;
      setReport(r);
      setPlace(p);
      setAuthorCount(authorReports.length);
      setFailed(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const retry = () => {
    setFailed(false);
    setAttempt((a) => a + 1);
  };

  /* FIX-07: тост на 8 px над нижней панелью отчёта (или над home-зоной).
     Hook — до ранних возвратов skeleton/error; панель появляется только
     когда кнопка есть (enteredFromSamePlace считает до данных). */
  useEffect(() => {
    setBottomReserve('report-panel', 16 + 48 + 8 + insets.bottom);
    return () => clearBottomReserve('report-panel');
  }, [insets.bottom]);

  /* детали без данных: skeleton (§8), при провале — ошибка с Повторить */

  if (report == null && !failed) {
    return (
      <View style={styles.container}>
        <SkeletonReportDetails />
      </View>
    );
  }

  if (failed || report == null) {
    return (
      <View style={[styles.container, styles.errorWrap]}>
        <Text style={styles.errorText}>
          Отчёт недоступен. Проверьте соединение и попробуйте ещё раз.
        </Text>
        <Button label="Повторить" mode="primary" appearance="accent" flex onPress={retry} />
      </View>
    );
  }

  const isMine = report.authorId === CURRENT_USER_ID;

  /* удаление отчёта (саммари QA-08/B): подтверждение ModalCard; успех —
      тост (прецедент удаления места) и возврат к источнику (карточка отчёта
      больше не существует); связанные списки обновятся при возврате
      (спека reports.md §2: текущие списки обновлять при возврате).
      «Изменить» — прежняя точка карандаша: форма с ?report=ID. */
  const confirmDeleteReport = () => {
    if (deleting) return; /* блокировка повторного нажатия */
    setDeleting(true);
    setDeleteModal(false);
    demoPlaceRepo
      .deleteReport(report.id, CURRENT_USER_ID)
      .then((res) => {
        if (res !== 'forbidden' && res != null) {
          /* FIX-07 §2: тост с Undo; журнал/карточка места обновятся при
             возврате и по версии данных (restore из тоста) */
          showToast('Отчёт удалён', {
            label: 'Вернуть',
            onPress: () => {
              void demoPlaceRepo.restoreReport(res.snapshot, res.orderIndex).catch(() => {
                showToast('Не удалось восстановить', {
                  label: 'Повторить',
                  onPress: () => {
                    void demoPlaceRepo.restoreReport(res.snapshot, res.orderIndex);
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

  /* Вход из карточки этого же места (решение Дмитрия 22.10): отчёт открыт
     напрямую из карточки или из её «Отчеты места» → кнопки «Перейти в место»
     нет — место уже текущее. Проверка истории стека: place/[id] или
     place-reports/[id] ЭТОГО ЖЕ места в двух позициях перед отчётом.
     Других источников (журнал, шторка — она модальная) пока нет. */
  const routes = navigation.getState()?.routes ?? [];
  const prevRoutes = routes.slice(Math.max(0, routes.length - 3), -1);
  const enteredFromSamePlace = prevRoutes.some(
    (r) =>
      (r.name === 'place/[id]' || r.name === 'place-reports/[id]') &&
      (r.params as { id?: string } | undefined)?.id === report.placeId,
  );

  /* bottom-action-резерв нужен только при кнопке */
  const panelReserve = enteredFromSamePlace
    ? 16 /* нижний отступ контента без панели */
    : 16 + 48 + 8 + insets.bottom;

  /* «Перейти в место» из МОДАЛЬНОГО отчёта (navigation.md §3): завершает всю
     ветку: Карта → место; Назад — на карту. popToTop + push — без сохранения
     прежних мест/отчётов в истории; дубли карты/карточки не создаются. */
  const goToPlaceFromSheet = (placeId: string) => {
    setSheetOpen(false);
    /* dismissAll: стек чистится до корня (карта); «Назад» из нового места —
       на карту (navigation.md §3), прежние места/отчёты в истории не остаются */
    router.dismissAll();
    router.push(`/place/${placeId}`);
  };

  /* обычный «Перейти в место» — прежнее поведение (возврат на карту сохранён) */
  return (
    <View style={styles.container}>
      {/* тулбар: назад + заголовок; pen — только у своего отчёта.
          Toolbar - Top - iPhone (K 156:8410): py 8 px 16, кнопки 44 */}
      <View style={[styles.toolbar, { height: insets.top + 60 }]}>
        <View style={[styles.toolbarButton, { top: insets.top + 8 }]}>
          <ButtonIcon
            icon="chevronLeft"
            type="toolbar"
            onPress={router.back}
            accessibilityLabel="Назад"
          />
        </View>
        {/* заголовок: absolute во всю ширину, центр ВСЕГДА по центру панели
            (K-DS example 409:465); зона 255 с ellipsis (K-DS 218:405) */}
        <View
          style={[styles.toolbarTitleWrap, { top: insets.top + 8, bottom: 8 }]}
          pointerEvents="none">
          <View style={styles.toolbarTitleBox}>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              Отчёт о рыбалке
            </Text>
          </View>
        </View>
        {/* «⋯» — только у своего отчёта (макет 156:8408 обновлён 25.10:
            был pen); меню действий — шторка «Изменить»/«Удалить» */}
        {isMine && (
          <View style={[styles.toolbarButtonRight, { top: insets.top + 8 }]}>
            <ButtonIcon
              icon="more"
              type="toolbar"
              accessibilityLabel="Действия по отчёту"
              onPress={() => setActionsOpen(true)}
            />
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          /* контент px 16 (K 157:8536); до первой карточки — 12 после тулбара */
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: panelReserve + 16,
        }}
        showsVerticalScrollIndicator={false}>
        <ReportContent report={report} place={place} />

        {/* чужой отчёт: все отчеты рыбака (docs/navigation.md — Sheet) */}
        {!isMine && (
          <View style={styles.ctaWrap}>
            <Button
              label={`Все отчеты рыбака (${authorCount})`}
              mode="secondary" appearance="outline"
              onPress={() => setSheetOpen(true)}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Action (K 156:8417): primary «Перейти в место» → /place/[placeId].
          Решение Дмитрия 22.10: если отчёт открыт из карточки ЭТОГО ЖЕ места
          (напрямую или через «Отчеты места») — кнопки НЕТ: место уже текущее.
          Иных источников (журнал и др.) пока нет — кнопка скрыта. */}
      {!enteredFromSamePlace && (
        <View style={[styles.panel, { paddingBottom: 8 + insets.bottom }]}>
          <Button
            label="Перейти в место"
            mode="primary" appearance="accent"
            flex
            onPress={() => router.navigate(`/place/${report.placeId}`)}
          />
        </View>
      )}

      {/* вложенный модальный сценарий отчётов рыбака (docs/navigation.md):
          Sheet со списком отчётов автора; полный отчёт переключается внутри
          той же модалки; крестик закрывает всю Sheet с исходным отчётом A */}
      <AuthorReportsSheet
        visible={sheetOpen}
        authorId={report.authorId}
        onClose={() => setSheetOpen(false)}
        onGoToPlace={goToPlaceFromSheet}
      />

      {/* шторка действий отчёта (паттерн K 436:12522, саммари QA-08/B):
          «Изменить» → форма правки; «Удалить» → подтверждение.
          Закрытие — тап вне/свайп/системная «назад» (SheetModal). */}
      <ReportActionsSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onEdit={() => {
          /* RN-Modal поверх RN-Modal не поднимается при одновременном
             переходе (репро 13:12) — закрыть шторку, действие позже */
          setActionsOpen(false);
          setTimeout(() => {
            router.push(`/report-form/${report.placeId}?report=${report.id}`);
          }, 320);
        }}
        onDelete={() => {
          if (deleting) return;
          setActionsOpen(false);
          /* пауза 320 мс: та же репро-модалка одновременного перехода */
          setTimeout(() => setDeleteModal(true), 320);
        }}
      />

      {/* подтверждение удаления отчёта (паттерн ModalCard удаления места,
          решение Дмитрия 24.10): «Оставить» Outline / «Удалить» Negative */}
      <ModalCard
        visible={deleteModal}
        icon="delete"
        title="Удалить отчёт?"
        body="Отчёт будет удалён без возможности восстановления."
        actions={[
          { label: 'Оставить', onPress: () => setDeleteModal(false) },
          { label: 'Удалить', mode: 'primary', appearance: 'negative', onPress: confirmDeleteReport },
        ]}
        onClose={() => setDeleteModal(false)}
      />

      {/* ошибка удаления (прецедент места): остаёмся в отчёте, «Повторить» */}
      <ModalCard
        visible={deleteErrorModal}
        icon="warn"
        title="Не удалось удалить отчёт"
        body="Попробуйте ещё раз."
        actions={[
          { label: 'Готово', onPress: () => setDeleteErrorModal(false) },
          { label: 'Повторить', onPress: confirmDeleteReport },
        ]}
        onClose={() => setDeleteErrorModal(false)}
      />
    </View>
  );
}

/* Шторка действий отчёта (паттерн K 436:12522 карточки места, саммари
   QA-08/B; модал K-DS Sheet 246:4605): граббер — SheetModal; Slot pb 16;
   Cell: px 16, py 2, Left p 8 (иконка 24), текст py 8, Body 16/22.
   Тексты — «Изменить»/«Удалить» (как в шторке места). */
function ReportActionsSheet({
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
      <View style={[styles.actionsSlot, { paddingBottom: 16 + insets.bottom }]}>
        <PressableCell
          icon="pen"
          label="Изменить"
          onPress={onEdit}
          accessibilityLabel="Изменить отчёт"
        />
        <PressableCell
          icon="delete"
          label="Удалить"
          onPress={onDelete}
          accessibilityLabel="Удалить отчёт"
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

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  errorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  errorText: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  toolbar: {
    /* Toolbar - Top - iPhone (токены py 8 px 16); height insets.top + 60 в JSX */
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButton: {
    /* top в JSX: insets.top + 8 */
    position: 'absolute',
    left: 16,
    overflow: 'hidden',
  },
  toolbarButtonRight: {
    position: 'absolute',
    right: 16,
    overflow: 'hidden',
  },
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
    /* Layout Txt (268:1023): py 8 у текстовой колонки */
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
  toolbarTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarTitleBox: {
    /* зона 255 (K-DS 218:405): обрезка длинных названий ellipsis */
    width: 255,
    alignItems: 'center',
  },
  toolbarTitle: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: palette.text,
    textAlign: 'center',
  },
  ctaWrap: {
    marginTop: 8,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: palette.background,
  },
});