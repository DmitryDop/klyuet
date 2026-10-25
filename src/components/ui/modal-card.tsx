import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import Button, { type ButtonAppearance, type ButtonMode } from '@/components/button';
import { UI_ICONS } from '@/components/ui-icons';
import type { Palette } from '@/constants/theme';
import { useTheme } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Modal Card (K-DS мастер 308:1355; K 224:6017 «Выйти без сохранения?»,
 * 225:6130 «Не удалось опубликовать отчет») — принцип как у SheetModal:
 * - карточка выезжает снизу (ease-out ~260ms), overlay (bg/overlay
 *   #18201d66) одновременно плавно затемняет экран;
 * - закрытие (карточка уезжает вниз): тап вне карточки, крестик,
 *   системная «назад»; действие правой кнопки выполняет родительскую
 *   логику сразу (навигация) — поведение кнопок не меняется;
 * - карточка: surface-raised, radius 24, px 16, pt 24, pb 16, от края 16/б16;
 *   иконка 56 (circle-info #376D7B / attention #D18A24), Title2 24/30
 *   (обновление K-DS 23.10, Дмитрий: title модалок = Title2),
 *   текст Body 16/22 secondary (pt 12), кнопки pt 24 (Outline + Primary).
 */
export type ModalCardIcon = 'info' | 'warn' | 'delete';

/** Кнопки: левая/правая канонично Outline/Accent; вариант переопределяется
 *  mode/appearance (K-DS пропсы, 24.10) — например Negative для «Удалить». */
export type ModalCardAction = {
  label: string;
  onPress: () => void;
  mode?: ButtonMode;
  appearance?: ButtonAppearance;
};

export default function ModalCard({
  visible,
  icon,
  title,
  body,
  actions,
  onClose,
}: {
  visible: boolean;
  icon: ModalCardIcon;
  title: string;
  body: string;
  /** первая — Outline, вторая Primary (макет: «Остаться» + «Выйти») */
  actions: [ModalCardAction, ModalCardAction];
  onClose: () => void;
}) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  const { height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const open = useSharedValue(0);
  /* сейвзона под карточкой: home-зона устройства */
  const insetsBottom = useSafeAreaInsets().bottom;

  useEffect(() => {
    if (visible) {
      /* mount-latch: карточка смонтирована до конца exit-анимации */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      open.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      open.value = withTiming(0, { duration: 220 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, open, mounted]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: open.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - open.value) * screenH }],
  }));

  const [left, right] = actions;
  return (
    <Modal
      visible={mounted}
      transparent
      /* анимации полностью здесь: карточка едет, overlay проявляется */
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.flex}>
        {/* overlay: тап вне карточки = закрыть */}
        <Pressable accessibilityLabel="Закрыть" onPress={onClose} style={styles.flex}>
          <Animated.View style={[styles.scrim, scrimStyle]} pointerEvents="none" />
        </Pressable>
        {/* сейвзона под карточкой (home-зона); внутренности карточки —
            сгенерированы ранее, не менять */}
        <Animated.View
          style={[styles.card, cardStyle, { marginBottom: insetsBottom }]}>
          <IconGlyph icon={icon} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <Button
              label={left.label}
              mode={left.mode ?? 'secondary'}
              appearance={left.appearance ?? 'outline'}
              flex
              onPress={left.onPress}
            />
            <Button
              label={right.label}
              mode={right.mode ?? 'primary'}
              appearance={right.appearance ?? 'accent'}
              flex
              onPress={right.onPress}
            />
          </View>
          <ModalCardClose onClose={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

/* крестик Button-Icon 44×44 (308:1379): absolute right/top 0 угла карточки */
function ModalCardClose({ onClose }: { onClose: () => void }) {
  const palette = useTheme();
  const styles = makeStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Закрыть"
      onPress={onClose}
      style={styles.close}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d={UI_ICONS.close.d} fill={palette.text} />
      </Svg>
    </Pressable>
  );
}

function IconGlyph({ icon }: { icon: ModalCardIcon }) {
  const palette = useTheme();
  return (
    <Svg
      width={56}
      height={56}
      viewBox="0 0 56 56"
      style={staticStyles.icon}>
      {/* circle-info #376D7B / attention #D18A24 (svg K 224:6017, 225:6130);
          delete — корзина мастера K-DS 490:1000, заливка
          --color-danger-default (свет #b84a42 / dark #dc6c64, K 460:5224) */}
      <Path
        d={
          icon === 'info'
            ? UI_ICONS.circleInfo.d
            : icon === 'delete'
              ? UI_ICONS.deleteModal.d
              : UI_ICONS.attention.d
        }
        fill={
          icon === 'info'
            ? '#376d7b'
            : icon === 'delete'
              ? palette.dangerDefault
              : '#d18a24'
        }
      />
    </Svg>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: palette.scrim,
  },
  card: {
    /* Card (308:1355 / K 224:6017): от края 16, под кнопками — ровно 16
       (макет: bottom-[16px] от экрáнa, без safe-зоны — решение Дмитрия
       22.10); pt 24 px 16 */
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: palette.surfaceRaised,
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    /* Title: иконка 56 → заголовок, gap 8 (308:1384) */
  },
  title: {
    /* Title2 24/30 · 700 (K-DS 308:1358, обновление 23.10 — было Title1 28/34) */
    ...rnTextStyle(TEXT.title2),
    fontFamily: FONT_FAMILY,
    color: palette.text,
    textAlign: 'center',
    marginTop: 8,
    alignSelf: 'center',
    maxWidth: 300,
  },
  body: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
    textAlign: 'center',
    marginTop: 12, /* Body pt 12 (308:1359) */
    alignSelf: 'stretch',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24, /* BtnGr pt 24 (308:1360) */
  },
  close: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const staticStyles = StyleSheet.create({
  icon: {
    alignSelf: 'center',
  },
});