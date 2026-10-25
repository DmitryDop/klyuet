import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { ReactNode } from 'react';

import JournalCard from '@/components/journal/card';
import Chip from '@/components/form/chip';
import EmptyBlock from '@/components/ui/empty';
import { SkeletonCards } from '@/components/ui/skeleton';
import { demoPlaceRepo, CURRENT_USER_ID } from '@/data/repo';
import { removeFromFavorites, useFavorites } from '@/data/favorites-store';
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
 * Экран «Журнал» (ТЗ _x/21.md; docs/journal.md; ТЗ _x/30.md избранное).
 * Три вкладки чипсами (взаимоисключающие): «Мои места» (по умолчанию,
 * K 190:9115) / «Мои отчёты» (169:8945) / «Избранное» (K 490:16536);
 * пустые состояния (230:9225 / 229:8983; «Пока нет избранных мест» —
 * Empty без кнопки, решение Дмитрия 25.10 — отдельного макета нет) —
 * Empty-блок, у «Мест» кнопка «Добавить» → СУЩЕСТВУЮЩИЙ сценарий
 * добавления на карте (инстракт-стор, карта запускает шаг 1 на фокусе;
 * своего сценария нет). Только активность текущего пользователя
 * (logic/journal.ts): места — по дате создания, отчёты — по дате рыбалки
 * (новые выше, §8); избранное — в порядке добавления, новые выше.
 * Тапы ведут в существующие экраны /place/[id] и /report/[id]; вкладка
 * сохраняется при возврате (экран смонтирован, state живёт).
 * Данные перечитываются на фокусе (актуализация после создания/правок, §7).
 * В «Избранном» иконка в строке удаляет место из избранного с растворением
 * карточки (ТЗ _x/30.md §4: 180 мс fade+scale, 100–240 мс высота→0,
 * ease-in-out, удаление из списка после анимации; Reduce Motion — сразу).
 * Skeleton при первой загрузке (journal.md §6): демо-репо без сетевых
 * ошибок — состояние ошибки не строится.
 */

type Tab = 'places' | 'reports' | 'favorites';

/* Общая длительность анимации удаления карточки (ТЗ _x/30.md §4). */
const REMOVE_MS = 240;

/**
 * Обёртка удаления строки «Избранного» (ТЗ _x/30.md §4): анимируется ВСЁ
 * содержимое карточки целиком; height схлопывает измеренную высоту — соседние
 * строки едут вверх; onComplete срабатывает ПОСЛЕ завершения (240 мс).
 */
function RemovableCard({
  removing,
  onComplete,
  children,
}: {
  removing: boolean;
  onComplete: () => void;
  children: ReactNode;
}) {
  const measured = useRef<number | null>(null);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const height = useSharedValue(-1); /* −1 = высота не тронута (auto) */
  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    height: height.value < 0 ? undefined : height.value,
    /* при схлопывании контент не вылезает за уменьшающуюся высоту */
    overflow: 'hidden',
  }));

  useEffect(() => {
    if (!removing) return;
    const easing = Easing.inOut(Easing.ease);
    /* присвоение SharedValue в волклет-таймингах — не React state
        (прецедент place/[id].tsx, disable react-hooks/immutability) */
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = withTiming(0, { duration: 180, easing }); /* §4.3 */
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(0.97, { duration: 180, easing });
    const h = measured.current;
    if (h != null) {
      /* присвоение SharedValue — не React state (см. выше) */
      // eslint-disable-next-line react-hooks/immutability
      height.value = h;
      /* §4.4: 100–240 мс — высота до 0 (не React state, как выше) */
      height.value = withDelay(100, withTiming(0, { duration: 140, easing }));
    }
    const timer = setTimeout(onComplete, REMOVE_MS);
    return () => clearTimeout(timer);
  }, [removing, onComplete, opacity, scale, height]);

  return (
    <Animated.View
      style={removing ? anim : undefined}
      onLayout={(e) => {
        measured.current = e.nativeEvent.layout.height;
      }}>
      {children}
    </Animated.View>
  );
}

/** Появление пустого состояния «Избранного» после растворения последней карточки. */
function FadeMount({ children }: { children: ReactNode }) {
  const opacity = useSharedValue(0);
  /* flex 1 — иначе EmptyBlock (wrap flex:1) не растягивается на высоту
      контента ScrollView и центрируется не по экрану (выравнивание 25.10) */
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, flex: 1 }));
  useEffect(() => {
    /* присвоение SharedValue — не React state (см. RemovableCard) */
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = withTiming(1, { duration: 180, easing: Easing.inOut(Easing.ease) });
  }, [opacity]);
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = makeStyles(palette);

  const [tab, setTab] = useState<Tab>('places');
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  /* удаление из «Избранного» (ТЗ §4): id строки, анимация которой идёт;
      повторные нажатия иконок блокируются до завершения анимации */
  const [removingId, setRemovingId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const favoriteIds = useFavorites();

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
  /* избранное (ТЗ §5): только id в сторе, данные — из репо; недоступное
      место не показывается (§5, строка не рендерится) */
  const favoritePlaces = useMemo(() => {
    const byId = new Map(places.map((p) => [p.id, p]));
    return favoriteIds
      .map((fid) => byId.get(fid))
      .filter((p): p is Place => p != null);
  }, [favoriteIds, places]);

  /* «Добавить»: существующий сценарий добавления места на карте (§6) */
  const startAddPlace = () => {
    requestAddPlaceStart();
    router.push('/(tabs)/map');
  };

  /* удаление из «Избранного» (ТЗ §4): повторное нажатие во время анимации
      заблокировано; Reduce Motion — без анимации */
  const removeFavorite = useCallback((id: string) => {
    if (removingId != null) return;
    if (reduceMotion) {
      removeFromFavorites(id);
      return;
    }
    setRemovingId(id);
  }, [removingId, reduceMotion]);

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

      {/* Chip Group (190:9123): px16 py8, чипы 44 flex, gap 8; третий —
          «Избранное» (K 490:16536, ТЗ _x/30.md §3) */}
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
        <Chip
          label="Избранное"
          selected={tab === 'favorites'}
          size="lg"
          flex
          onPress={() => setTab('favorites')}
        />
      </View>

      {/* контент вкладки: карточки InfoRow (px16, gap 8) или Empty */}
      <ScrollView
        style={styles.list}
        /* низ: верхняя кромка таб-бара (insets.bottom + 4 + 48) + 16 —
           последняя карточка не перекрывается (K 455:5106, Дмитрий 23.10) */
        /* flexGrow 1: контейнер растягивается на высоту ScrollView —
            flex:1-обёртки Empty (в т. ч. FadeMount) центрируются по экрану;
            на карточных вкладках контент выше — не влияет */
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 68 }}
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
        ) : tab === 'favorites' ? (
          favoritePlaces.length > 0 ? (
            /* строки «Избранного» (K 490:16523): как строки «Моих мест» +
                bookmark справа (удаление из избранного, ТЗ _x/30.md §4) */
            <View style={styles.cards}>
              {favoritePlaces.map((p) => (
                <RemovableCard
                  key={p.id}
                  removing={removingId === p.id}
                  onComplete={() => {
                    removeFromFavorites(p.id);
                    setRemovingId(null);
                  }}>
                  <JournalCard
                    title={p.name}
                    subtitle={p.fishSpecies.join(', ') || '—'}
                    info={placeInfoLine(p)}
                    date={p.createdAt ? formatRuDate(p.createdAt) : '—'}
                    onPress={() => router.push(`/place/${p.id}`)}
                    accessibilityLabel={`Избранное место: ${p.name}`}
                    onBookmarkPress={() => removeFavorite(p.id)}
                  />
                </RemovableCard>
              ))}
            </View>
          ) : (
            /* пустое состояние (ТЗ §3): после растворения последней карточки
                — плавное появление (ТЗ §4) */
            <FadeMount>
              <EmptyBlock title="Пока нет избранных мест" />
            </FadeMount>
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