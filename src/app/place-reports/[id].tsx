import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ButtonIcon from '@/components/button-icon';
import Button from '@/components/button';
import ReportItem from '@/components/place/report-item';
import { SkeletonCards } from '@/components/ui/skeleton';
import { demoPlaceRepo, displayName } from '@/data/repo';
import type { Report } from '@/data/types';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/* «Отчеты места» (slice 4+) — K 139:6786, 140:7522:
   - тулбар: назад + «Отчеты» (Headline 16/20) + подзаголовок — название места
     (Subheadline 12/14 · 500, secondary); по правилам toolbar (docs/components-toolbar.md):
     заголовок всегда по центру, не двигается при кнопках;
   - список (px 16, отступ 4 после тулбара, gap 8, K 139:6995): карточки
     report-item variant="card" (K-DS 298:1116 в блоке #f8f9f5 p 16 r 16) —
     заголовок: виды рыбы / «Без улова», под ним ИМЯ АВТОРА; нижняя строка:
     снасть · приманка · N фото (#808080) + дата рыбалки справа;
   - сортировка по дате рыбалки по убыванию (reports.md §7);
   - тап по карточке → /report/[id] (reports.md §2);
   - Bottom Action: primary «Добавить отчет» (K 140:7505) → форма
     /report-form/[placeId]; прилипает к низу (pt 16 / px 16 / pb 8);
   - списки обновляются при возврате (reports.md §2: useFocusEffect). */

export default function PlaceReportsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [placeName, setPlaceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /* на фокус и при retry — повторная загрузка: списки актуальны при возврате
     из формы/деталей (reports.md §2) */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const [rs, place] = await Promise.all([
          demoPlaceRepo.getReports(id),
          demoPlaceRepo.getPlace(id),
        ]);
        if (!alive) return;
        setReports(rs);
        setPlaceName(place?.name ?? '');
        /* место отсутствует — ошибка с Повторить, не пустой список (§8) */
        setFailed(place == null);
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
      /* useFocusEffect перезапускается при изменении deps (рефетч после retry) */
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, attempt]),
  );

  const retry = () => {
    setFailed(false);
    setLoading(true);
    setAttempt((a) => a + 1);
  };

  /* skeleton до подтверждённого результата (§8) */
  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonCards count={3} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={[styles.container, styles.errorWrap]}>
        <Text style={styles.errorText}>
          Отчеты недоступны. Проверьте соединение и попробуйте ещё раз.
        </Text>
        <Button label="Повторить" mode="primary" appearance="accent" flex onPress={retry} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* тулбар: назад + «Отчеты» + подзаголовок-место (K 139:6934) */}
      <View style={[styles.toolbar, { height: insets.top + 60 }]}>
        <View style={[styles.toolbarButton, { top: insets.top + 8 }]}>
          <ButtonIcon
            icon="chevronLeft"
            type="toolbar"
            onPress={router.back}
            accessibilityLabel="Назад"
          />
        </View>
        <View style={[styles.toolbarTitleWrap, { top: insets.top + 8, bottom: 8 }]}>
          <View style={styles.toolbarTitleBox}>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              Отчеты
            </Text>
            <Text style={styles.toolbarSubtitle} numberOfLines={1}>
              {placeName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          /* K 139:6995 tube: gap 8 (spacing/xs) между карточками, x 16;
             до первой — 4 (108 − 104 тулбара), снизу — запас + safe area */
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 24 + insets.bottom,
          gap: 8,
        }}
        showsVerticalScrollIndicator={false}>
        {/* карточки со второй строкой — имя автора (K 139:6995) */}
        {reports.map((r) => (
          <ReportItem
            key={r.id}
            report={r}
            variant="card"
            secondaryText={displayName(r.authorId)}
            onPress={() => router.navigate(`/report/${r.id}`)}
          />
        ))}
      </ScrollView>

      {/* Bottom Action (K 140:7505): «Добавить отчет» → форма отчёта
          для этого места (reports.md §2) */}
      <View style={[styles.panel, { paddingBottom: 8 + insets.bottom }]}>
        <Button
          label="Добавить отчет"
          mode="primary" appearance="accent"
          flex
          onPress={() => router.push(`/report-form/${id}`)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  toolbar: {
    /* Toolbar - Top - iPhone (K 139:6934): px 16, кнопка top 8 + 44 + низ 8 */
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  toolbarButton: {
    /* top подставляется в JSX: insets.top + 8 */
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
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
  },
});