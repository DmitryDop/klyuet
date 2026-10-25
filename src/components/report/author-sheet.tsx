import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ButtonIcon from '@/components/button-icon';
import Button from '@/components/button';
import ReportItem from '@/components/place/report-item';
import ReportContent from '@/components/report/report-content';
import SheetModal from '@/components/ui/sheet-modal';
import { demoPlaceRepo, displayName } from '@/data/repo';
import type { Place, Report } from '@/data/types';
import { type Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * «Все отчеты рыбака» — вложенный модальный сценарий (docs/navigation.md).
 * K 366:4940 (список: Slot pt 8, tube gap 8, report-item card) и
 * 366:5145 (полный отчёт, «Перейти в место») — через общий SheetModal
 * (K-DS Sheet 246:4642: overlay bg/overlay, граббер, свайп, тап вне modal).
 * - тулбар листа: X справа; центр — «Отчеты рыбака» + автор
 *   Subheadline 12/14 (224:1013); центр по ряду кнопок;
 * - тулбар полного отчёта: назад слева + X справа + «Отчёт о рыбалке»;
 *   назад — возврат к списку внутри той же Sheet (навигация §3–4), крестик и
 *   свайп/тап вне — закрытие всей Sheet (§5) из любого состояния;
 * - список НЕ размонтируется при открытии отчёта: прокрутка и состояние
 *   сохраняются (навигация §4: без накопления дублей); закрытие Sheet
 *   сбрасывает вложенный сценарий (объект пересоздаётся mount-циклом
 *   SheetModal);
 * - «Перейти в место» (только в полном отчёте): закрывает всю Sheet
 *   и завершает ветку — Карта → карточка места (navigation.md §3).
 */
export default function AuthorReportsSheet({
  visible,
  authorId,
  onClose,
  onGoToPlace,
}: {
  visible: boolean;
  authorId: string;
  onClose: () => void;
  onGoToPlace: (placeId: string) => void;
}) {
  return (
    <SheetModal visible={visible} onClose={onClose}>
      <SheetBody authorId={authorId} onClose={onClose} onGoToPlace={onGoToPlace} />
    </SheetModal>
  );
}

function SheetBody({
  authorId,
  onClose,
  onGoToPlace,
}: {
  authorId: string;
  onClose: () => void;
  onGoToPlace: (placeId: string) => void;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [placeNames, setPlaceNames] = useState<Record<string, string>>({});
  const [openReport, setOpenReport] = useState<Report | null>(null);
  const [openPlace, setOpenPlace] = useState<Place | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const rs = await demoPlaceRepo.getReportsByAuthor(authorId);
      const names: Record<string, string> = {};
      await Promise.all(
        [...new Set(rs.map((r) => r.placeId))].map(async (placeId) => {
          const p = await demoPlaceRepo.getPlace(placeId);
          if (p) names[placeId] = p.name;
        }),
      );
      if (!alive) return;
      setReports(rs);
      setPlaceNames(names);
    })();
    return () => {
      alive = false;
    };
  }, [authorId]);

  /* выбранный отчёт листа: place — по его placeId (навигация: связь по placeId) */
  useEffect(() => {
    if (openReport == null) return;
    let alive = true;
    void (async () => {
      const p = await demoPlaceRepo.getPlace(openReport.placeId);
      if (alive) setOpenPlace(p);
    })();
    return () => {
      alive = false;
    };
  }, [openReport]);

  const title = openReport != null ? 'Отчёт о рыбалке' : 'Отчеты рыбака';

  return (
    <View style={[staticStyles.flex, { paddingBottom: 8 + insets.bottom }]}>
      {/* тулбар после граббера SheetModal: ряд 44 + pb 8 (K-DS 224:987) */}
      <View style={staticStyles.sheetToolbar}>
        <View style={staticStyles.toolbarRow}>
          {/* назад — только в полном отчёте; X всегда справа.
              У листа Left-слот пуст (224:1005) */}
          {openReport != null ? (
            <ButtonIcon
              icon="chevronLeft"
              type="toolbar"
              onPress={() => setOpenReport(null)}
              accessibilityLabel="Назад к списку"
            />
          ) : (
            <View style={staticStyles.leftSpacer} />
          )}
          <View style={staticStyles.flex} />
          <ButtonIcon icon="close" type="toolbar" onPress={onClose} accessibilityLabel="Закрыть" />
        </View>
        <View style={staticStyles.titleWrap} pointerEvents="none">
          <View style={staticStyles.titleBox}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {openReport == null && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {displayName(authorId)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* тело тулбар + body (список под полным отчётом): слой отчёта не
          должен перекрывать тулбар */}
      <View style={staticStyles.body}>
        {/* список отчётов автора — остаётся смонтированным под полным
            отчётом: возврат сохраняет прокрутку (навигация §4) */}
        <ScrollView
          style={staticStyles.flex}
          contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}>
          <View style={staticStyles.tube}>
            {reports.map((r) => (
              <ReportItem
                key={r.id}
                report={r}
                variant="card"
                secondaryText={placeNames[r.placeId] ?? ''}
                onPress={() => setOpenReport(r)}
              />
            ))}
          </View>
        </ScrollView>

        {/* полный отчёт в Sheet — непрозрачный слой поверх списка
            (прокрутка списка сохраняется); Bottom Action «Перейти в место» */}
        {openReport != null && (
          <View style={styles.reportLayer}>
            <ScrollView
              style={staticStyles.flex}
              contentContainerStyle={{
                paddingBottom: 16 + 48 + 16 + insets.bottom,
                paddingHorizontal: 16,
              }}>
              <ReportContent report={openReport} place={openPlace} />
            </ScrollView>
            <View style={styles.panel}>
              <Button
                label="Перейти в место"
                mode="primary" appearance="accent"
                flex
                onPress={() => onGoToPlace(openReport.placeId)}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sheetToolbar: {
    paddingHorizontal: 16,
    paddingBottom: 8, /* K-DS 224:987 (нижний py); верх — граббер SheetModal */
  },
  toolbarRow: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  leftSpacer: {
    /* Left-слот листа: пустая зона кнопки (224:1005) */
    width: 44,
    height: 44,
  },
  titleWrap: {
    /* Title (224:997) центр 255 — центр = центр РЯДА кнопок; граббер-зона
       уже выше в SheetModal, тулбар начинается с ряда */
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBox: {
    width: 255, /* зона тайтла 255 (224:1010) */
    gap: 2,
    alignItems: 'center',
  },
  body: {
    flex: 1, /* body тулбар → список/отчёт (246:4642) */
  },
  tube: {
    gap: 8, /* tube gap 8 (366:5051) */
  },
});

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    title: {
      ...rnTextStyle(TEXT.headline),
      fontFamily: FONT_FAMILY,
      color: palette.text,
      textAlign: 'center',
    },
    subtitle: {
      ...rnTextStyle(TEXT.subheadline),
      fontFamily: FONT_FAMILY,
      color: palette.textSecondary,
      textAlign: 'center',
    },
    reportLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: palette.surfaceRaised, /* непрозрачный слой */
    },
    panel: {
      /* Bottom Action x/BtnGr: pt 16 px 16, pb 8 отдает insets зоны Sheet */
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 16,
      paddingHorizontal: 16,
      backgroundColor: palette.surfaceRaised,
    },
  });