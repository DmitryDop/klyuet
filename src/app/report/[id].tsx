import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { SkeletonReportDetails } from '@/components/ui/skeleton';
import { CURRENT_USER_ID, demoPlaceRepo } from '@/data/repo';
import type { Place, Report } from '@/data/types';
import type { Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/* Детали отчёта (slice 4 + шторка отчётов рыбака, navigation.md 22.10) —
   K 156:8408 / 157:8531 / 199:9347 / 199:9262 / 199:9421:
   - тулбар статичный: назад + «Отчёт о рыбалке» (Headline 16/20); pen справа
     только у СВОЕГО отчёта (§5) → форма правки /report-form;
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
        {isMine && (
          <View style={[styles.toolbarButtonRight, { top: insets.top + 8 }]}>
            <ButtonIcon
              icon="pen"
              type="toolbar"
              accessibilityLabel="Редактировать отчёт"
              onPress={() => router.push(`/report-form/${report.placeId}?report=${report.id}`)}
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
    </View>
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