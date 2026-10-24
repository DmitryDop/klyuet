import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ButtonIcon from '@/components/button-icon';
import ReportItem from '@/components/place/report-item';
import { SkeletonCards } from '@/components/ui/skeleton';
import { demoPlaceRepo, displayName } from '@/data/repo';
import type { Report } from '@/data/types';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/* «Отчеты рыбака» (slice 4) — K 210:9933.
   ВНИМАНИЕ (22.10.2026): docs/navigation.md заменяет этот обычный экран
   вложенным Sheet-сценарием в src/components/report/author-sheet.tsx (K
   366:4940/366:5145). В приложении маршрут /author-reports больше не вызывается
   из интерфейса; обычный экран остаётся для глубоких ссылок до решения
   Дмитрия о снятии маршрута (файлы не удаляются без разрешения).»
   - тулбар: назад + заголовок «Все отчеты рыбака» (Headline 16/20) +
     подзаголовок — имя автора (Subheadline 12/14 · 500, secondary);
   - список (px 16, отступ 4 после тулбара, gap 8, K 210:9936): карточки
     report-item variant="card" (K-DS 298:1116 в блоке #f8f9f5 p 16 r 16) —
     заголовок: виды рыбы / «Без улова», под ним название места по placeId;
     нижняя строка: снасть · приманка · N фото (#808080) + дата рыбалки
     справа (reports.md §7);
   - сортировка по дате рыбалки по убыванию — в макете порядок 04.10→06.10
     противоречит спеке, берётся сортировка спеки;
   - тап по карточке → /report/[id] (reports.md §2). */

export default function AuthorReportsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [placeNames, setPlaceNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  /* на фокус — повторная загрузка: список актуален при возврате (reports.md §2) */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const rs = await demoPlaceRepo.getReportsByAuthor(id);
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
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  /* skeleton до подтверждённого результата (§8) — заглушек не показываем */
  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonCards count={3} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* тулбар: назад + заголовок с подзаголовком-автором (K 210:9935) */}
      <View style={[styles.toolbar, { height: insets.top + 60 }]}>
        <View style={[styles.toolbarButton, { top: insets.top + 8 }]}>
          <ButtonIcon
            icon="chevronLeft"
            type="toolbar"
            onPress={router.back}
            accessibilityLabel="Назад"
          />
        </View>
        {/* заголовок + подзаголовок: центр панели всегда, не двигается
            при кнопках/без (K-DS example 409:465); зона 255 */}
        <View style={[styles.toolbarTitleWrap, { top: insets.top + 8, bottom: 8 }]}>
          <View style={styles.toolbarTitleBox}>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              Все отчеты рыбака
            </Text>
            <Text style={styles.toolbarSubtitle} numberOfLines={1}>
              {displayName(id)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          /* K 210:9936 tube: gap 8 (spacing/xs) между карточками, x 16 (x=16 у tube);
             до первой — 4 (108 − 104 тулбара), снизу — запас + safe area */
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 24 + insets.bottom,
          gap: 8,
        }}
        showsVerticalScrollIndicator={false}>
        {reports.map((r) => (
          <ReportItem
            key={r.id}
            report={r}
            variant="card"
            secondaryText={placeNames[r.placeId] ?? ''}
            onPress={() => router.navigate(`/report/${r.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  toolbar: {
    /* Toolbar - Top - iPhone (K 210:9935): py 8 px 16, кнопки 44; высота
       подставляется в JSX: insets.top + 60; контент списка от +4 (108 − 104) */
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  toolbarButton: {
    /* top подставляется в JSX: insets.top + 8 — без него RN центрирует
       absolute-кнопку по тулбару и она уезжает в статус-зону (см. report/[id]) */
    position: 'absolute',
    left: 16,
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
    /* зона 255 (K-DS 218:469): title 16/20 + subtitle 12/14, gap 2 */
    width: 255,
    gap: 2,
    alignItems: 'center',
  },
  toolbarTitle: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
    textAlign: 'center',
  },
  toolbarSubtitle: {
    ...rnTextStyle(TEXT.subheadline),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});