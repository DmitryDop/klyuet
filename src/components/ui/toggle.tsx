import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/data/theme-store';

/* Toggle K-DS 517:1143 (регулярные Default/Disabled снимок от 24.10.2026).
   Использован на профиле K 500:11242 в переключателе «Тёмная тема» (Off).
   Геометрия, снятая по рендерам мастеров Off 517:1148 / On 517:1144 (png):
   трек 40×20 (dimensions/size/xl), radius full; бегунок 24×16, радиус —
   кламп full к половине высоты; в Off бегунок с отступом 2 слева, в On —
   с отступом 2 справа, ход 12 (в K-DS авто-лейаут pl/pr MCP не разрешает
   в размер трека 40 однозначно — измерено по растру). Цвета — переменные:
   --toggle/surface_off #b8d3b9, --toggle/surface_on #35916b,
   --toggle/knob (Light = stone/000 белый; Dark = forest/110 #263f34) —
   токены Colors.light / Colors.dark через palette (25.10).
   Анимация — Reanimated withTiming 200ms (задача: 180–220): ход бегунка
   и цвет трека на UI-треде; при быстрых повторных нажатиях value
   ретаргетится с текущего положения, без скачков. Дополнительных
   эффектов (масштаб/подпрыгивание) по требованию задачи нет.
   Disabled-вариант K-DS (opacity 40%) в задаче не востребован — не строю. */
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
    transform: [{ translateX: progress.value * 12 }],
  }));

  return (
    <Pressable
      /* зона нажатия: 40×20 + hitSlop 12 → 64×44 (минимум 44dp) */
      hitSlop={12}
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
    width: 40,
    height: 20,
    borderRadius: 10,
  },
});

const knob = (surface: string) => ({
  position: 'absolute' as const,
  left: 2,
  top: 2,
  width: 24,
  height: 16,
  borderRadius: 8,
  backgroundColor: surface,
});