import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import JournalCard from '@/components/journal/card';
import Chip from '@/components/form/chip';
import EmptyBlock from '@/components/ui/empty';
import { SkeletonCards } from '@/components/ui/skeleton';
import { demoPlaceRepo, CURRENT_USER_ID } from '@/data/repo';
import { requestAddPlaceStart } from '@/data/add-request-store';
import {
  myPlaces,
  myReports,
  placeInfoLine,
  reportCatchLabel,
  reportInfoLine,
} from '@/logic/journal';
import { formatRuDate } from '@/logic/dates';
import type { Place, Report } from '@/data/types';
import type { Palette } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import { useTheme } from '@/data/theme-store';

/**
 * Экран «Журнал» (ТЗ _x/21.md; docs/journal.md). Две вкладки чипсами:
 * «Мои места» (по умолчанию) / «Мои отчёты» (K 190:9115 / 169:8945);
 * пустые состояния (230:9225 / 229:8983) — Empty-блок, у «Мест» кнопка
 * «Добавить» → СУЩЕСТВУЮЩИЙ сценарий добавления на карте (инстракт-стор,
 * карта запускает шаг 1 на фокусе; своего сценария нет).
 * Только активность текущего пользователя (logic/journal.ts): места —
 * по дате создания, отчёты — по дате рыбалки (новые выше, §8).
 * Тапы ведут в существующие экраны /place/[id] и /report/[id]; вкладка
 * сохраняется при возврате (экран смонтирован, state живёт).
 * Данные перечитываются на фокусе (актуализация после создания/правок, §7).
 * Skeleton при первой загрузке (journal.md §6): демо-репо без сетевых
 * ошибок — состояние ошибки не строится.
 */

type Tab = 'places' | 'reports';

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = makeStyles(palette);

  const [tab, setTab] = useState<Tab>('places');
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  /* перечитать на входе и на возврате из карточек (§7; navigation.md) */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      void (async () => {
        const [p, r] = await Promise.all([demoPlaceRepo.getPlaces(), demoPlaceRepo.getAllReports()]);
        if (!alive) return;
        setPlaces(p);
        setReports(r);
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const myPlacesList = useMemo(() => myPlaces(places, CURRENT_USER_ID), [places]);
  const myReportsList = useMemo(() => myReports(reports, CURRENT_USER_ID), [reports]);
  /* место привязывается к отчёту по placeId (§7): подпись карточки отчёта */
  const placeName = useMemo(
    () => new Map(places.map((p) => [p.id, p.name])),
    [places],
  );

  /* «Добавить»: существующий сценарий добавления места на карте (§6) */
  const startAddPlace = () => {
    requestAddPlaceStart();
    router.push('/(tabs)/map');
  };

  return (
    <View style={styles.container}>
      {/* Toolbar - Top - iPhone, Type=Page Title (K-DS 465:543; K 190:9115):
          px16, py8; safe-зона сверху, заголовок Title1 28/34 · 700 СЛЕВА в
          нижней 44-зоне (не центрируется по всей высоте — не улетает в часы) */}
      <View style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.title1) }]}>
          Журнал
        </Text>
      </View>

      {/* Chip Group (190:9123): px16 py8, чипы 44 flex, gap 8 */}
      <View style={[styles.chipGroup]}>
        <Chip
          label="Мои места"
          selected={tab === 'places'}
          size="lg"
          flex
          onPress={() => setTab('places')}
        />
        <Chip
          label="Мои отчеты"
          selected={tab === 'reports'}
          size="lg"
          flex
          onPress={() => setTab('reports')}
        />
      </View>

      {/* контент вкладки: карточки InfoRow (px16, gap 8) или Empty */}
      <ScrollView
        style={styles.list}
        /* низ: верхняя кромка таб-бара (insets.bottom + 4 + 48) + 16 —
           последняя карточка не перекрывается (K 455:5106, Дмитрий 23.10) */
        contentContainerStyle={{ paddingBottom: insets.bottom + 68 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator>
        {loading ? (
          /* skeleton при первоначальной загрузке (journal.md §6): форма карточек */
          <SkeletonCards count={2} />
        ) : tab === 'places' ? (
          myPlacesList.length > 0 ? (
            <View style={styles.cards}>
              {myPlacesList.map((p) => (
                <JournalCard
                  key={p.id}
                  title={p.name}
                  subtitle={p.fishSpecies.join(', ') || '—'}
                  info={placeInfoLine(p)}
                  date={p.createdAt ? formatRuDate(p.createdAt) : '—'}
                  onPress={() => router.push(`/place/${p.id}`)}
                  accessibilityLabel={`Моё место: ${p.name}`}
                />
              ))}
            </View>
          ) : (
            <EmptyBlock
              title="Добавленных мест нет"
              actionLabel="Добавить"
              onAction={startAddPlace}
            />
          )
        ) : myReportsList.length > 0 ? (
          <View style={styles.cards}>
            {myReportsList.map((r) => (
              <JournalCard
                key={r.id}
                title={reportCatchLabel(r)}
                subtitle={placeName.get(r.placeId) ?? '—'}
                info={reportInfoLine(r)}
                date={formatRuDate(r.fishingDate)}
                onPress={() => router.push(`/report/${r.id}`)}
                accessibilityLabel={`Мой отчёт: ${reportCatchLabel(r)}`}
              />
            ))}
          </View>
        ) : (
          <EmptyBlock title="Отчетов пока нет" />
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (palette: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  toolbar: {
    /* Toolbar - Top - iPhone, Page Title (K 455:5111/465:543): после
       статус-бара py 8; Title-бокс высотой 40 (465:553), текст по центру
       бокса, СЛЕВА; без нижних скруглений (исправление K-DS 23.10) */
    paddingHorizontal: 16,
  },
  title: {
    /* 465:553: Title-бокс h40, содержимое по центру бокса; текст слева */
    height: 40,
    justifyContent: 'center',
    ...rnTextStyle(TEXT.title1),
    fontFamily: FONT_FAMILY,
    color: palette.text,
    textAlignVertical: 'top',
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  list: {
    flex: 1,
  },
  cards: {
    gap: 8, /* content_report (209:9798): gap 8 + py 8 */
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});