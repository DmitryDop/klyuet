import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/data/theme-store';

/* Toggle K-DS 517:1143 (геометрия ОБНОВЛЕНА 25.10.2026 — актуализировано по
   get_design_context мастеров 517:1148/1150, 517:1144/1145, 518:1186/1187):
   - трек 44×22 (dimensions/size/2xl), radius full, py 2;
   - Off: bg --toggle/surface_off (#b8d3b9), бегунок отступ 2 слева (pl 2/pr 16);
   - On: bg --toggle/surface_on (#35916b), бегунок отступ 2 справа (pl 16/pr 2);
   - бегунок 24×18 (радиус sm=12 клампит к 9), ход 18−2=16 (было 40×20/24×16, ход 12);
   disabled-варианты 518:1186/1188 (opacity 40%) в задаче не востребованы — не строю.
   Использован на профиле K 500:11242 в переключателе «Тёмная тема».
   Цвета — переменные: --toggle/surface_off #b8d3b9, --toggle/surface_on
   #35916b, --toggle/knob (Light = stone/000 белый; Dark = forest/110
   #263f34) — токены Colors.light / Colors.dark через palette (25.10).
   Анимация — Reanimated withTiming 200ms (задача: 180–220): ход бегунка
   и цвет трека на UI-треде; при быстрых повторных нажатиях value
   ретаргетится с текущего положения, без скачков. Дополнительных
   эффектов (масштаб/подпрыгивание) по требованию задачи нет. */
export default function Toggle({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: boolean;
  onChange?: (next: boolean) => void;
  accessibilityLabel?: string;
}) {
  const palette = useTheme();
  const duration = 200;
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration });
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [palette.toggleSurfaceOff, palette.toggleSurfaceOn],
    ),
  }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 16 /* ход 44−24−2·2 */ }],
  }));

  return (
    <Pressable
      /* зона нажатия: 44×22 + hitSlop 11 → 66×44 (минимум 44dp) */
      hitSlop={11}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onChange?.(!value)}>
      <Animated.View style={[staticStyles.track, trackStyle]}>
        <Animated.View style={[knob(palette.toggleKnob), knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const staticStyles = StyleSheet.create({
  track: {
    width: 44, /* dimensions/size/2xl (517:1143) */
    height: 22,
    borderRadius: 11,
  },
});

const knob = (surface: string) => ({
  position: 'absolute' as const,
  left: 2, /* Off: pl 2 (517:1148) */
  top: 2, /* py 2 (трек 22 − бегунок 18) */
  width: 24, /* (517:1150) */
  height: 18,
  borderRadius: 9, /* radius/sm кламп к высоте */
  backgroundColor: surface,
});