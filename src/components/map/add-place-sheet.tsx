import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle as SvgCircle, Line, Path } from 'react-native-svg';

import Button from '@/components/button';
import Chip from '@/components/form/chip';
import ModalCard from '@/components/ui/modal-card';
import {
  clearPlaceCreateDraft,
  getPlaceCreateDraft,
  setPlaceCreateDraft,
  usePlaceCreateDraft,
} from '@/data/place-create-store';
import type { PlacePrivacy, PublicAccuracy } from '@/data/types';
import type { Palette } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import { useTheme } from '@/data/theme-store';

/**
 * Шторка шага 1 «Отметка места» (K 383:7080/7114/7152) — оверлей ПОВЕРХ карты
 * (решение Дмитрия 22.10–23.10: карта не пересоздаётся и не сжимается; под
 * свайпом остаётся та же карта, серой зоны нет). Шторка выезжает снизу и
 * уезжает при отмене (реанимация, Дмитрий 23.10).
 *
 * Точка = центр карты (координаты live от region); видимость (§5): «Только я»
 * по умолчанию; «Все» — точность «Примерно» (Circle радиуса 500 м — диаметр
 * ~1 км §6, отрисовка как у приблизительных мест карты) / «Точно» (прицел).
 * Переключения координаты и выбор не сбрасывают (§6), карту не двигают (§7):
 * центр карты при высотах шторки шага всегда в видимой области — прицел
 * стоит на нём, координаты от высоты не зависят.
 *
 * Свайп-вниз за граббер = отмена создания (Дмитрий 22.10: шторка — модалка):
 * механика и пороги SheetModal (Pan по полосе граббера, threshold ~100/700,
 * резинка). Точка решения одна со стрелкой назад (§3.3): изменения —
 * «Отменить создание места?», чистый шаг — уезд вниз и снятие оверлея.
 *
 * «Дальше» (координаты есть всегда, без валидации §3.2) → /place-form (шаг 2);
 * возврат со шага 2 (draft жив) — вкладка возвращает шторку без потери ввода.
 */

/* Прицел «Точно» (K-DS exact location 413:15601, крест 109×109, stroke 2):
   цвет — point_contrast (Дмитрий 25.10: в Dark белая обводка; Light
   #176b52 — как был акцент) */
export function Crosshair() {
  const palette = useTheme();
  return (
    <Svg width={109} height={109} viewBox="0 0 109 109">
      <Line x1={54.495} y1={0} x2={54.495} y2={109} stroke={palette.pointContrast} strokeWidth={2} />
      <Line x1={0} y1={54.495} x2={109} y2={54.495} stroke={palette.pointContrast} strokeWidth={2} />
    </Svg>
  );
}

/* Прицел «Примерно» (K-DS 447:640 sm_approximate location): круг d20 «Область
   координат» (заливка --color-overlay-point, пунктирная граница
   --color-action-default, stroke/05) + 4 тика по краям 49-бокса (зазор 2 до
   круга; stroke/05, тот же акцент). Тики всегда ВНЕ круга. */

/* Область «Примерно» шага 1 (вариант 2, Дмитрий 23.10): честный круг
   (диаметр из dp-проекции радиуса 500 м) + 4 тика СНАРУЖИ с зазором 2,
   прижатые к границе; тик 12 (параметры мастера K-DS 447:659). При зуме
   тики едут с границей круга и остаются вне его. */
export function AreaSight({ diameter }: { diameter: number }) {
  const palette = useTheme();
  const box = diameter + 28; /* 2 × (зазор 2 + тик 12) + 2 на stroke */
  const c = box / 2;
  const inner = diameter / 2 + 2;
  const outer = diameter / 2 + 14;
  const tick = { stroke: palette.pointContrast, strokeWidth: 0.5 }; /* stroke/05 */
  return (
    <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
      <SvgCircle
        cx={c}
        cy={c}
        r={diameter / 2}
        fill={palette.pointAlpha} /* --color-overlay-point */
        /* обводка: point_contrast (в Dark белая, Дмитрий 25.10) */
        stroke={palette.pointContrast}
        strokeWidth={0.5}
        strokeDasharray="5 4"
      />
      <Line x1={c} y1={c - inner} x2={c} y2={c - outer} {...tick} />
      <Line x1={c} y1={c + inner} x2={c} y2={c + outer} {...tick} />
      <Line x1={c - inner} y1={c} x2={c - outer} y2={c} {...tick} />
      <Line x1={c + inner} y1={c} x2={c + outer} y2={c} {...tick} />
    </Svg>
  );
}

/* sm-вариант: тики + мини-круг d20 (отмеченное — done_ — без тиков) */
export function SightApprox() {
  const palette = useTheme();
  return (
    <Svg width={49} height={49} viewBox="0 0 49 49">
      <Path
        d="M24.5 36.5V49M24.5 0V12.5M12.5 24.5H0M49 24.5H36.5"
        stroke={palette.pointContrast}
        strokeWidth={0.5} /* dimensions/stroke/05 */
      />
      <SvgCircle
        cx={24.5}
        cy={24.5}
        r={10}
        fill={palette.pointAlpha} /* --color-overlay-point */
        /* обводка: point_contrast (в Dark белая, Дмитрий 25.10) */
        stroke={palette.pointContrast}
        strokeWidth={0.5}
        strokeDasharray="5 4"
      />
    </Svg>
  );
}

/* старт/финиш трансформации: гарантированно за нижним краем (высота шторки
   max ~500 с инсетами) */
const ENTER_FROM_Y = 600;
const EXIT_TO_Y = 600;

export default function AddPlaceSheet({
  latitude,
  longitude,
  onExit,
  registerExit,
  onHeightChange,
  sheetShift,
}: {
  /** точка выбора берётся из черновика (мир под прицелом); props — совместимость,
      используются только если черновик ещё не пересчитан */
  latitude: number;
  longitude: number;
  /** отмена создания: выход из процесса (карта снимает оверлей и возвращает метки) */
  onExit: () => void;
  /** стрелка назад карты вызывает ту же точку решения, что и свайп (§3.3) */
  registerExit?: (exit: () => void) => void;
  /** высота шторки — для позиции гео-кнопки (24 над шторкой, 383:7093) */
  onHeightChange?: (height: number) => void;
  /** экранный сдвиг шторки (выезд+драг) — общее со схемой контроллов карты */
  sheetShift: SharedValue<number>;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = makeStyles(palette);
  const [, setVersion] = useState(0);
  /* baseline на монтировании шторки: возврат со шага 2 не ремонтирует —
      dirty учитывает и ввод шага 2 (§3.3) */
  const [baseline] = useState(() => ({ ...getPlaceCreateDraft()! }));
  /* черновик реактивен (store-подписка): патчи перерисовывают */
  const draft = usePlaceCreateDraft()!;

  const [cancelModal, setCancelModal] = useState(false);

  const patch = (next: { privacy?: PlacePrivacy; accuracy?: PublicAccuracy }) => {
    const current = getPlaceCreateDraft();
    if (current == null) return;
    setPlaceCreateDraft({ ...current, ...next });
    setVersion((v) => v + 1);
  };

  /* dirty = отличие от черновика на момент входа (§3.3; включает шаг 2) */
  const changed =
    draft.privacy !== baseline.privacy ||
    draft.accuracy !== baseline.accuracy ||
    draft.name !== baseline.name ||
    draft.fishSpecies.length !== baseline.fishSpecies.length ||
    draft.description !== baseline.description ||
    draft.photos.length !== baseline.photos.length;

  /* Жест и анимации шторки (bag/modal.md §1–3; пороги утверждены Дмитрием 23.10):
     драг 1:1 из ЛЮБОЙ точки шторки после вертикального сдвига ≥10 dp (тапы
     элементам не мешает); закрытие — по расстоянию ≥ max(40% высоты, 120 dp)
     ИЛИ скорости ≥700 dp/s (порог SheetModal — единый на приложение); иначе —
     резинка. sheetShift (общий value с картой) подводит контролы/метки карты
     синхронно с шторкой без React state на кадрах (§4–6, §8). */
  const enterY = useSharedValue(ENTER_FROM_Y);
  const dragY = useSharedValue(0);
  const [exiting, setExiting] = useState(false);
  /* высота шторки (замер onLayout) — порог закрытия и отдача контроллам */
  const [sheetH, setSheetH] = useState(0);
  const CLOSE_RATIO = 0.4; /* утверждено Дмитрием 23.10: 40% высоты */

  const sheetLayout = (e: { nativeEvent: { layout: { height: number } } }) => {
    setSheetH(e.nativeEvent.layout.height);
    onHeightChange?.(e.nativeEvent.layout.height);
  };

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: enterY.value + dragY.value }],
  }));

  /* контролы карты (зум/гео/метки) следят за верхней границей шторки */
  useAnimatedReaction(
    () => enterY.value + dragY.value,
    (shift) => {
      // eslint-disable-next-line react-hooks/immutability
      sheetShift.value = shift;
    },
  );

  /* снятие оверлея: черновик очищен, карта возвращает метки (fade-in) */
  const finalizeExit = () => {
    clearPlaceCreateDraft();
    onExit();
  };

  /* доведение вниз с текущей позиции БЕЗ скачка: пара синхронных
     таймингов — сумма позиций линейно от текущего до полного уезда */
  const startClose = () => {
    if (exiting) return;
    setExiting(true);
    const d = dragY.value;
    enterY.value = withTiming(EXIT_TO_Y - d, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(finalizeExit)();
      }
    });
    dragY.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
  };

  /* выход из процесса: изменения есть — «Отменить создание места?» (резинка,
      данные не трогаем §7), нет — уезд вниз; точка решения едина с стрелкой */
  const requestExit = () => {
    if (exiting) return;
    if (changed) {
      dragY.value = withSpring(0, { damping: 100 });
      setCancelModal(true);
      return;
    }
    startClose();
  };

  const swipeCancel = Gesture.Pan()
    .activeOffsetY(10)
    .enabled(!exiting)
    .onUpdate((e) => {
      /* драг 1:1, шторка не опережает и не отстаёт; остановка пальца — стоп */
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      /* закрытие: скорость (флинг ≥700 dp/s при пути ≥20 dp) или расстояние
          (≥40% высоты, но не меньше 120 dp); иначе — резинка на место */
      const velocityFling = e.velocityY > 700 && e.translationY >= 20;
      const enough = e.translationY >= Math.max(CLOSE_RATIO * sheetH, 120);
      if (velocityFling || enough) {
        runOnJS(startClose)();
      } else {
        dragY.value = withSpring(0, { damping: 100 });
      }
    });

  /* появление: выезд снизу (Дмитрий 23.10) */
  useEffect(() => {
    enterY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [enterY]);

  /* координаты = ТОЧКА ВЫБОРА (мир под прицелом, draft.coordinate), не центр
      карты: прицел стоит выше центра карты на пол-высоты шторки; правится
      при замере шторки/движении карты (§5) */
  const coordText = `${draft.coordinate.latitude.toFixed(4)}, ${draft.coordinate.longitude.toFixed(4)}`;

  /* свежий requestExit всегда у стрелки карты (обновляется на каждом рендере) */
  registerExit?.(requestExit);

  return (
    /* драг работает ИЗ ЛЮБОЙ точки шторки (bag/modal.md §3; граббер —
        тот же жест, не отдельная зона); тапы элементам — без мешанины.
        ModalCard — вне detector: GestureDetector требует ровно одного ребёнка */
    <View>
      <GestureDetector gesture={swipeCancel}>
        <Animated.View onLayout={sheetLayout} style={[styles.sheetInner, dragStyle]}>
        {/* Sheet (402:6525 / 402:6662): surface-raised, r24 сверху, граббер */}
        <View style={styles.grabberZone}>
          <View style={styles.grabber} />
        </View>
        <View style={styles.content}>
          {/* Координаты и шаг (402:6517): Body S 14/20 secondary */}
          <View style={styles.coordRow}>
            <Text style={styles.coordText}>{coordText}</Text>
            <Text style={styles.coordStep}>1 из 2 шага</Text>
          </View>
          <Text style={styles.headline}>Кто увидит место</Text>
          <View style={styles.cardsRow}>
            <VisibilityCard
              title="Только я"
              desc={"Личное место.\nНет на общей карте."}
              selected={draft.privacy === 'private'}
              onPress={() => patch({ privacy: 'private' })}
            />
            <VisibilityCard
              title="Все"
              desc={"Публичное место.\nВидно всем рыбакам."}
              selected={draft.privacy === 'public'}
              onPress={() => patch({ privacy: 'public' })}
            />
          </View>
          {draft.privacy === 'public' ? (
            <View style={styles.accuracyBlock}>
              <Text style={styles.headline}>Координаты для всех</Text>
              {/* Вариант точности — Chip lg flex (402:6659/6660) */}
              <View style={styles.cardsRow}>
                <Chip label="Примерно" size="lg" flex selected={draft.accuracy === 'approximate'} onPress={() => patch({ accuracy: 'approximate' })} />
                <Chip label="Точно" size="lg" flex selected={draft.accuracy === 'exact'} onPress={() => patch({ accuracy: 'exact' })} />
              </View>
              <Text style={styles.hint}>
                {draft.accuracy === 'approximate'
                  ? 'Всем — область около 1 км.\nВам — точная точка.'
                  : 'Все увидят точную точку на карте.'}
              </Text>
            </View>
          ) : (
            <Text style={styles.hint}>
              Точную точку увидите только вы.
              {'\n'}Место сохранится в вашем журнале.
            </Text>
          )}
        </View>
        {/* Bottom Action (246:4609): pt 16 px 16 pb 8 + home-зона;
            кнопка в wrapper stretch БЕЗ flex — flex с basis 0% схлопывает
            высоту кнопки в потоке (баг, пойманный в форме отчёта) */}
        <View style={[styles.publishStretch, { paddingBottom: 8 + insets.bottom }]}>
          <Button
            label="Дальше"
            mode="primary" appearance="accent"
            onPress={() => router.push('/place-form')}
          />
        </View>
        </Animated.View>
      </GestureDetector>

      {/* отмена при изменениях (map-place-flows-mvp.md §3.3): механика общая,
          текст по режиму (ТЗ _x/22.md §6: «создание» в редактировании вводит
          в заблуждение): «Продолжить» — основная, «Выйти» — вторичная */}
      <ModalCard
        visible={cancelModal}
        icon="info"
        title={
          draft.editPlaceId != null
            ? 'Отменить редактирование места?'
            : 'Отменить создание места?'
        }
        body="Введённые данные будут потеряны."
        actions={[
          { label: 'Продолжить', onPress: () => setCancelModal(false) },
          {
            label: 'Выйти',
            onPress: () => {
              setCancelModal(false);
              clearPlaceCreateDraft();
              onExit();
            },
          },
        ]}
        onClose={() => setCancelModal(false)}
      />
    </View>
  );
}

/* Карточка видимости (K 402:6522 «Выбор видимости»): h 80, p 12, gap 4;
   title Headline 16/20, desc Caption 12/16 secondary, по центру.
   Selected: bg selection, граница --color-action-pressed (402:6522);
   default: bg cardSurface, граница border-control (402:6523). */
function VisibilityCard({
  title,
  desc,
  selected,
  onPress,
}: {
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.card, selected ? styles.cardSelected : styles.cardDefault]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </Pressable>
  );
}

/* Цвета — палитра активной темы (ТЗ dark-theme; ключи зеркалят светлые токены) */
const makeStyles = (palette: Palette) => StyleSheet.create({
  sheetInner: {
    /* Sheet (402:6525): оверлей низа карты (карта целиком под ним — свайп
        обнажает карту, серой зоны нет); r24 сверху */
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
  },
  grabberZone: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  grabber: {
    /* _Grabber (K-DS 224:1033): 24×4 */
    width: 24,
    height: 4,
    borderRadius: 9999,
    backgroundColor: palette.grabber,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 8, /* Slot pb xs / Настройки шаг (402:6516) */
    gap: 12, /* gap sm (402:6516) */
  },
  coordRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coordText: {
    ...rnTextStyle(TEXT.bodyS),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
    flex: 1,
  },
  coordStep: {
    ...rnTextStyle(TEXT.bodyS),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
    flexShrink: 0,
    textAlign: 'right',
  },
  headline: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: palette.text,
  },
  hint: {
    ...rnTextStyle(TEXT.bodyS),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },
  accuracyBlock: {
    gap: 12,
    paddingTop: 8, /* «Координаты для всех» (402:7542): pt xs */
    alignSelf: 'stretch',
  },
  card: {
    flexGrow: 1,
    flexBasis: '0%',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4, /* title → desc (402:6522) */
    padding: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  cardSelected: {
    backgroundColor: palette.selection,
    borderWidth: 1,
    borderColor: palette.actionPressed,
  },
  cardDefault: {
    backgroundColor: palette.cardSurface,
    borderWidth: 1,
    borderColor: palette.borderControl,
  },
  cardTitle: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: palette.text,
    textAlign: 'center',
  },
  cardDesc: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  publishStretch: {
    /* кнопка по всей ширине (x/BtnGr 246:4609); высота по контенту —
       flex из Button убран (схлопывание при рендере, прецедент отчёта) */
    alignSelf: 'stretch',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
});