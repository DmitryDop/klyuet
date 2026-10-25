import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { ReactNode } from 'react';

import JournalCard from '@/components/journal/card';
import Chip from '@/components/form/chip';
import EmptyBlock from '@/components/ui/empty';
import { SkeletonCards } from '@/components/ui/skeleton';
import { demoPlaceRepo, CURRENT_USER_ID, subscribeDataVersion, getDataVersion } from '@/data/repo';
import { removeFromFavorites, useFavorites, restoreFavorite } from '@/data/favorites-store';
import { showToast } from '@/components/ui/toast';
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

/* FIX-07 §3 (решение Дмитрия 25.10): удаление — Opacity/Scale 1→0/0.96
   240 мс, свёртывание высоты 200 мс (параллельно); восстановление — раскрытие
   высоты 200 мс + Opacity/Scale 0.96→1 240 мс. REMOVE_MS — конец анимации. */
const REMOVE_MS = 240;

/**
 * Обёртка исчезновения/возврата строки «Избранного» (ТЗ _x/30.md §4 +
 * FIX-07): анимируется ВСЁ содержимое карточки целиком; высота схлопывается/
 * раскрывается, соседние строки едут вверх/вниз; замер — по ребёнку (высота
 * обёртки во время анимации уже не достоверна). onComplete — после анимации.
 */
function RemovableCard({
  removing,
  restoring,
  onComplete,
  children,
}: {
  removing: boolean;
  restoring: boolean;
  onComplete: () => void;
  children: ReactNode;
}) {
  const measured = useRef<number | null>(null);
  /* FIX-07 §6: Reduce Motion — без анимаций, мгновенный итог */
  const reduceMotion = useReducedMotion();
  /* обратная анимация — одноразовый запуск из первого замера ребёнка:
     строка восстанавливается на mount — замера в effect ещё нет */
  const restoreStartedRef = useRef(false);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const height = useSharedValue(-1); /* −1 = высота не тронута (auto) */
  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    height: height.value < 0 ? undefined : height.value,
    /* при схлопывании/раскрытии контент не вылезает за анимируемую высоту */
    overflow: 'hidden',
  }));

  useEffect(() => {
    if (!removing) return;
    if (reduceMotion) {
      onComplete();
      return;
    }
    const easing = Easing.inOut(Easing.ease);
    /* присвоение SharedValue в ворклет-таймингах — не React state
        (прецедент place/[id].tsx, disable react-hooks/immutability) */
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = withTiming(0, { duration: 240, easing }); /* FIX-07 §3 */
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(0.96, { duration: 240, easing });
    const h = measured.current;
    if (h != null && h > 0) {
      /* FIX-07 §3: свёртывание высоты 200 мс, параллельно растворению */
      // eslint-disable-next-line react-hooks/immutability
      height.value = h;
       
      height.value = withTiming(0, { duration: 200, easing });
    }
    const timer = setTimeout(onComplete, REMOVE_MS);
    return () => clearTimeout(timer);
  }, [removing, reduceMotion, onComplete, opacity, scale, height]);

  /* FIX-07 §3: обратный возврат: начальный кадр — высота 0, scale 0.96;
     сама анимация стартует одноразово из первого замера ребёнка (startRestore) */
  useEffect(() => {
    if (!restoring || reduceMotion) return;
    restoreStartedRef.current = false;
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = 0;
    // eslint-disable-next-line react-hooks/immutability
    scale.value = 0.96;
    // eslint-disable-next-line react-hooks/immutability
    height.value = 0;
  }, [restoring, reduceMotion, opacity, scale, height]);

  const startRestore = (h: number) => {
    if (restoreStartedRef.current) return;
    restoreStartedRef.current = true;
    const easing = Easing.inOut(Easing.ease);
    // eslint-disable-next-line react-hooks/immutability
    height.value = withTiming(h, { duration: 200, easing }); /* FIX-07 §3 */
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = withTiming(1, { duration: 240, easing });
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(1, { duration: 240, easing });
    setTimeout(() => {
      /* после возврата высота снова auto (measured актуально по onLayout) */
      height.value = -1;
      onComplete();
    }, REMOVE_MS);
  };

  return (
    <Animated.View style={removing || restoring ? anim : undefined}>
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          measured.current = h;
          if (restoring && h > 0) {
            startRestore(h);
          }
        }}>
        {children}
      </View>
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
      повторные нажатия иконок блокируются до завершения анимации.
      restoringId (FIX-07 §3): строка, возврат которой анимируется */
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const favoriteIds = useFavorites();

  /* FIX-07: восстановление из тоста доехало в журнал, пока он в фокусе */
  const dataVersion = useSyncExternalStore(subscribeDataVersion, getDataVersion, getDataVersion);

  /* перечитать на входе и на возврате из карточек (§7; navigation.md),
      на смене данных репо (FIX-07: Undo из тоста в этом же экране) */
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
      /* deps с dataVersion намеренно: перечитывание по версии данных (FIX-07) */
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataVersion]),
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

  /* удаление из «Избранного» (ТЗ §4): анимация растворения; по завершении —
      данные убраны и показан тост с Undo (FIX-07 §2–3). Повторные нажатия
      иконок блокируются до завершения анимации. */
  const removeFavoriteRow = useCallback((id: string) => {
    if (removingId != null || restoringId != null) return;
    setRemovingId(id);
  }, [removingId, restoringId]);

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
                  restoring={restoringId === p.id}
                  onComplete={() => {
                    if (removingId === p.id) {
                      /* FIX-07 §2: данные после анимации + тост с Undo */
                      removeFromFavorites(p.id);
                      const idx = favoriteIds.indexOf(p.id);
                      setRemovingId(null);
                      showToast('Место удалено из избранного', {
                        label: 'Вернуть',
                        onPress: () => {
                          restoreFavorite(p.id, idx);
                          if (!reduceMotion) setRestoringId(p.id);
                        },
                      });
                    } else if (restoringId === p.id) {
                      /* FIX-07 §3: обратная анимация завершена */
                      setRestoringId(null);
                    }
                  }}>
                  <JournalCard
                    title={p.name}
                    subtitle={p.fishSpecies.join(', ') || '—'}
                    info={placeInfoLine(p)}
                    date={p.createdAt ? formatRuDate(p.createdAt) : '—'}
                    onPress={() => router.push(`/place/${p.id}`)}
                    accessibilityLabel={`Избранное место: ${p.name}`}
                    onBookmarkPress={() => removeFavoriteRow(p.id)}
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