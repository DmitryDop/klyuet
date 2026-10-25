import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/data/theme-store';

/**
 * Skeleton (reports.md §8 / journal.md §6): геометрия повторяет реальный
 * контент (height/borderRadius — через style), цвет — cardSurface текущей
 * темы, мягкая пульсация opacity 0.5 → 1 через Reanimated (нативный драйвер,
 * без shimmer и без искусственных задержек). Тёмная тема — cardSurface Dark.
 */
export default function SkeletonBox({ style }: { style?: StyleProp<ViewStyle> }) {
  const palette = useTheme();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[box(palette.cardSurface), style, pulseStyle]}
      accessibilityLabel="Загрузка"
      accessible />
  );
}

/** Каркас списка карточек отчётов: N блоков card (gap 8, px 16). */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.cards}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBox key={i} style={styles.card} />
      ))}
    </View>
  );
}

/**
 * Каркас деталей отчёта (геометрия K 157:8536): галерея → place → about,
 * px 16; используется до подтверждённого результата.
 */
export function SkeletonReportDetails() {
  return (
    <View style={styles.details}>
      <SkeletonBox style={styles.gallery} />
      <SkeletonBox style={styles.place} />
      <SkeletonBox style={styles.about} />
    </View>
  );
}

const box = (surface: string) => ({
  backgroundColor: surface,
  borderRadius: 12,
  borderCurve: 'continuous' as const,
});

const styles = StyleSheet.create({
  cards: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  card: {
    height: 112, /* геометрия report-item card: p 16 + 2 строки + info */
    borderRadius: 16,
  },
  details: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  gallery: {
    height: 220,
    borderRadius: 12,
  },
  place: {
    height: 80,
    borderRadius: 16,
  },
  about: {
    height: 328,
    borderRadius: 16,
  },
});