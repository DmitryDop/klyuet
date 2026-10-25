import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';

/**
 * Sheet — единый компонент K-DS (мастер 246:4642 «modal»): фон (overlay) +
 * сама шторка. Поведение по общему мобильному паттерну:
 * - открытие: modal выезжает снизу, под ним плавно появляется overlay
 *   (токен bg/overlay = #18201d66, подтверждён привязкой 240:4406 в K-DS);
 * - закрытие: тап по overlay вне modal, крестик (в контенте), системная
 *   «назад», свайп вниз за граббер (Pan-жест на верхней полосе 16px);
 * - граббер рендерится здесь (K-DS 224:1033, 24×4, pb 4, bg #181d1c@20%) —
 *   тулбары контента граббер не дублируют.
 *
 * Настройки (props):
 * - `overlay` (по умолчанию true) — bg/overlay; false — шторка без затемнения;
 * - `fullHeight` (по умолчанию true) — Full Height (top 44, K-DS 238:3945);
 *   false — шторка по контенту (для будущих сценариев; сейчас все full);
 * - `onClose` — единая точка закрытия (скрим/крестик/свайп/Android back);
 * - `children` — тулбар (Title_container/кнопки) и контент Sheet.
 * Транзиции: enter modal 300ms ease-out + overlay fade 200ms; выход —
 * обратный (modal успевает проехать вниз, дети остаются смонтированы
 * до конца анимации — RN Modal isRendered-lifecycle).
 */
export default function SheetModal({
  visible,
  onClose,
  overlay = true,
  fullHeight = true,
  children,
}: {
  visible: boolean;
  /** единая точка закрытия: скрим тап / крестик контента / свайп-граббер / back */
  onClose: () => void;
  /** bg/overlay токен: скрим под шторкой; false — без затемнения */
  overlay?: boolean;
  /** Full Height (top 44; K-DS 238:3945) — сейчас единственный режим; false — по контенту */
  fullHeight?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = makeStyles(palette);
  const { height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  /* 0 — скрыта, 1 — открыта (translateY screenH → 0, скрим от 0) */
  const open = useSharedValue(0);
  const dragY = useSharedValue(0);

  const finish = () => {
    'worklet';
    runOnJS(setMounted)(false);
  };

  useEffect(() => {
    if (visible) {
      /* mount-latch: Modal остаётся смонтирован, пока идёт exit-анимации
         (RN Modal latches isRendered; set-state — допустимый gate) */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      dragY.value = 0;
      /* ease-out без overshoot: пружина (withSpring) давала «подскок»
         шторки за ось — плавное появление без отскока */
      open.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      open.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) finish();
      });
    }
  }, [visible, open, dragY, mounted]);

  /* свайп-закрытие 1:1: detector на ВСЕЙ шторке (Дмитрий 23.10: «пальцем
     не сразу попадаешь» в полосу 16 граббера; прецедент шага 1). Скролл
     защищён сам: нативный ScrollView-лист перехватывает тач в своей зоне
     (пан активируется только вне списка — тулбар/граббер/пустоты);
     чекбоксы/радио — тапы: пан требует 8 px сдвига */
  const swipeClose = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      /* ворклет-запись SharedValue — Reanimated (прецедент place/[id].tsx) */
      // eslint-disable-next-line react-hooks/immutability
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 700) {
        /* близка: dragY не откатываем — exit-анимация доводит шторку вниз,
           следующее открытие сбрасывает dragY */
        runOnJS(onClose)();
      } else {
        /* резинка на место (ворклет-запись SharedValue, прецедент place/[id]) */
        // eslint-disable-next-line react-hooks/immutability
        dragY.value = withSpring(0, { damping: 100 });
      }
    });

  const scrimStyle = useAnimatedStyle(() => ({ opacity: open.value }));
  const modalStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - open.value) * screenH + dragY.value,
      },
    ],
  }));

  return (
    <Modal
      visible={mounted}
      transparent
      /* нативной анимации нет — транзиции на Reanimated (см. комментарии) */
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.flex}>
        {overlay && (
          <Animated.View
            style={[styles.overlayFill, styles.scrim, scrimStyle]}
          />
        )}
        {/* тап вне modal — закрытие (поверх скрима, под шторкой) */}
        <Pressable
          accessibilityLabel="Закрыть шторку"
          onPress={onClose}
          style={styles.overlayFill}
        />
        {/* detector на всей шторке (один ребёнок — требование RNGH): драг
            отовсюду; скролл-лист перехватывает тач нативно (пан не мешает
            скроллу), кнопки/чекбоксы — тапы (пан требует 8 px сдвига) */}
        <GestureDetector gesture={swipeClose}>
        <Animated.View
          style={[
            styles.sheet,
            modalStyle,
            fullHeight
              ? { top: Math.max(44, insets.top) }
              : /* по контенту: прибита к низу, но не выше линии 44 */
                { maxHeight: screenH - Math.max(44, insets.top) },
          ]}>
          <View style={styles.grabberZone}>
            <View style={styles.grabber} />
          </View>
          {children}
        </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlayFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrim: {
    /* bg/overlay — токен K-DS (light = #18201d66, dark = #10171466) */
    backgroundColor: palette.scrim,
  },
  sheet: {
    /* modal (246:4642): bg surface-raised, top radius 24; спейсинг — контент
       (gap тулбар→Slot задают сами Sheets, как в K-DS) */
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  grabberZone: {
    /* зона свайпа/граббера: py 8 сверху, pb 4 ниже граббера (K-DS 224:1026) */
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  grabber: {
    /* _Grabber (K-DS 224:1033): 24×4, radius/full; в Sheet — 20% альфа */
    width: 24,
    height: 4,
    borderRadius: 9999,
    backgroundColor: palette.grabber,
  },
});