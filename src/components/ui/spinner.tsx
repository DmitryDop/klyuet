import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

/**
 * Spinner (K-DS 309:1416 «Spinner», мастера 309:1417…309:1531): кольцо
 * с коническим градиентом (хвост затухает) — вращается по кругу.
 * Реализация: SVG-кольцо со stroke-width 2 и дугой ~72% окружности
 * (хвост по-простому: прерывистая дуга), непрерывное вращение.
 * Размеры: Small 16 / Medium 20 / Large 24 / XLarge 40 (309:1417, 1441,
 * 1477, 1483). Появления: Brand #176b52, White #fff, Black — text-primary.
 * В кнопке (165:22 loading): Medium 20, White на primary; Brand на outline.
 */
export type SpinnerSize = 'small' | 'medium' | 'large' | 'xlarge';
export type SpinnerAppearance = 'brand' | 'white' | 'black';

const SIZES: Record<SpinnerSize, number> = {
  small: 16,
  medium: 20,
  large: 24,
  xlarge: 40,
};

export default function Spinner({
  size = 'medium',
  appearance = 'brand',
}: {
  size?: SpinnerSize;
  appearance?: SpinnerAppearance;
}) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const px = SIZES[size];
  const color =
    appearance === 'white'
      ? Colors.light.accentIcon
      : appearance === 'black'
        ? Colors.light.text
        : Colors.light.accent;
  /* половина stroke=2 → средний радиус кольца */
  const r = px / 2 - 1;
  const c = 2 * Math.PI * r;

  return (
    <Reanimated.View style={[styles.box, { width: px, height: px }, spinStyle]}>
      <Svg width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
        <Circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          strokeWidth={2}
          stroke={color}
          strokeDasharray={`${c * 0.72} ${c * 0.28}`}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  box: {},
});