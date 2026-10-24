import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Пульсирующая геоточка пользователя (ТЗ _x/25.md; K-DS main_location
 * 532:2218 — символ статичен, тайминг по ТЗ):
 * - точка 14×14 `--color-overlay-catch` (#d18a24 = Colors.light.catch,
 *   Дмитрий 24.10 расширил с 12 по ТЗ) с белой обводкой 2 (по ТЗ;
 *   в экспорте K-DS — stroke 2 в 16-гриде) — статична, поверх кругов
 *   (z: баг K-DS «точка под фоном» исправлен Дмитрием 24.10);
 * - два экспанс-круга (K-DS Ellipse 2: fill #d18a24, opacity 0.2):
 *   диаметр 12→64, opacity 0.2→0, цикл 2000 мс, второй со сдвигом 1000 мс.
 *
 * ВАЖНО (дефект 24.10): Reanimated в children Marker рушит Expo Go
 * (Home-вылет, 2 повторных воспроизведения) — нативный снапшот
 * MKAnnotationView не совместим с Reanimated worklets (RN 0.88/Fabric).
 * Поэтому здесь RN Animated (прецедент проекта: fade-метки в тех же
 * маркерах): JS-анимация обновляет нативные вью без React-перерисовок,
 * снапшот обновляет MapKit сам при tracksViewChanges (default true).
 */

const START = 12;
const END = 64;
const DOT = 14; /* точка 14 — Дмитрий 24.10 (ТЗ задавало 12) */
const CYCLE = 2000;
const OFFSET = 1000;
const BASE_OPACITY = 0.2;

function PulseRing({ delay }: { delay: number }) {
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    /* сдвиг старта второго круга — через таймер: Animated.loop включает
       свой повтор без дополнительных пауз (delay внутри sequence повторялся
       бы каждый цикл и растягивал период) */
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: CYCLE,
        easing: Easing.linear,
        useNativeDriver: false, /* diameter/height — layout-проп */
      }),
    );
    let startId: ReturnType<typeof setTimeout> | undefined;
    if (delay > 0) {
      startId = setTimeout(() => anim.start(), delay);
    } else {
      anim.start();
    }
    return () => {
      anim.stop();
      if (startId != null) clearTimeout(startId);
    };
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: progress.interpolate({ inputRange: [0, 1], outputRange: [START, END] }),
          height: progress.interpolate({ inputRange: [0, 1], outputRange: [START, END] }),
          borderRadius: progress.interpolate({ inputRange: [0, 1], outputRange: [START / 2, END / 2] }),
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [BASE_OPACITY, 0] }),
        },
      ]}
    />
  );
}

export default function LocationPulse() {
  return (
    <View style={styles.root}>
      <PulseRing delay={0} />
      <PulseRing delay={OFFSET} />
      {/* точка: статична (не анимируется), поверх кругов — последний child */}
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: END,
    height: END,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    backgroundColor: Colors.light.catch,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Colors.light.catch,
    borderColor: Colors.light.accentIcon /* белая обводка 2 (ТЗ §1) */,
    borderWidth: 2,
  },
});