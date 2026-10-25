import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';

import type { Palette } from '@/constants/theme';
import { ADD_PLACE_ICON, SETTINGS_ICON, TAB_ICONS } from '@/components/tab-icons';
import { requestAddPlaceStart } from '@/data/add-request-store';
import { requestOpenMapSettings } from '@/data/map-settings-store';
import { useTheme, useThemeMode } from '@/data/theme-store';
import { setBottomReserve, clearBottomReserve } from '@/data/bottom-reserve-store';

/* Таб-бар по K-DS (компонент tab_bar 68:327, обновление 24.10 — ТЗ _x/23.md):
   стеклянная пилюля поверх контента, 5 элементов icon-only
   Карта · Журнал · [+] · Настройки · Профиль. Активный таб — плашка
   --color-selection-bg (#d8e8df), radius 12. Поверхность — tab_bar/default:
   rgba(250,250,246,0.90) + блюр (Figma radius 2 ≈ 1px CSS; точный радиус 1px
   expo-blur API не задаёт — интенсивность минимальная, при фоне 90% влияние
   блюра пренебрежимо). Тёмная тема: tab_bar/default Dark = rgba(34,44,39,.90),
   блюр tint 'dark' (палитра palette.tabBarSurface; K-DS Dark подтверждён 25.10).
   Центральный «+» (510:1120) — ДЕЙСТВИЕ, не вкладка: запускает существующий
   сценарий добавления места (запрос в add-request-store; шаг 1 открывает
   map.tsx, механика не меняется) и никогда не получает активную плашку.
   Шестерёнка (502:1093) — тоже не вкладка: открывает шторку «Настройки
   карты» (ТЗ _x/24.md), активной вкладкой не становится. */

const TABS = [
  { name: 'map', path: '/map', label: 'Карта' },
  { name: 'journal', path: '/journal', label: 'Журнал' },
  { name: 'profile', path: '/profile', label: 'Профиль' },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const themeMode = useThemeMode();
  const styles = makeStyles(palette);

  /* FIX-07 позиция тоста: нижний блок таб-экранов = пилюля 48 + отступ 4
     + home-зона; резерв включает safe-зону (тост — reserve + 8) */
  useEffect(() => {
    setBottomReserve('tab-bar', insets.bottom + 52);
    return () => clearBottomReserve('tab-bar');
  }, [insets.bottom]);

  const navTab = (tab: (typeof TABS)[number]) => {
    const active = pathname === tab.path;
    const icon = active ? TAB_ICONS[tab.name].solid : TAB_ICONS[tab.name].light;
    return (
      <Pressable
        key={tab.name}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={tab.label}
        onPress={() => router.navigate(tab.path)}
        style={[styles.tab, active && styles.tabActive]}>
        <Svg width={28} height={28} viewBox="0 0 28 28">
          <Path d={icon} fill={active ? palette.accent : palette.text} />
        </Svg>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + 4 }]}>
      <View style={styles.pill}>
        {/* слои стекла не перехватывают тапы */}
        <BlurView
          intensity={10}
          tint={themeMode === 'dark' ? 'dark' : 'light'}
          style={styles.layer}
          pointerEvents="none"
        />
        <View style={[styles.layer, styles.glass]} pointerEvents="none" />
        {navTab(TABS[0])}
        {navTab(TABS[1])}
        {/* центральный «+» — действие «Добавить место», не вкладка */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить место"
          onPress={() => {
            /* тот же вход, что «Добавить» в Журнале (ТЗ _x/21.md §6):
                карта перечитывает запрос и открывает шаг 1 */
            requestAddPlaceStart();
            router.navigate('/map');
          }}
          style={styles.tab}>
          <Svg width={44} height={44} viewBox="0 0 44 44">
            <Path d={ADD_PLACE_ICON} fill={palette.accent} />
          </Svg>
        </Pressable>
        {/* настройки карты (ТЗ _x/24.md): шторка поверх текущей вкладки;
            переход на карту, под шторкой будет карта. Не вкладка,
            активное состояние не получает (К-DS 502:1093) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Настройки карты"
          onPress={() => {
            requestOpenMapSettings();
            router.navigate('/map');
          }}
          style={styles.tab}>
          <Svg width={28} height={28} viewBox="0 0 28 28">
            <Path d={SETTINGS_ICON} fill={palette.text} />
          </Svg>
        </Pressable>
        {navTab(TABS[2])}
      </View>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'flex-end',
    },
    pill: {
      flexDirection: 'row',
      marginHorizontal: 16,
      height: 48,
      borderRadius: 12,
      overflow: 'hidden',
      padding: 2,
    },
    /* абстрактные слои стекла: блюр и tab_bar/default */
    layer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    glass: {
      backgroundColor: palette.tabBarSurface,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    /* активная вкладка — плашка --color-selection-bg */
    tabActive: {
      backgroundColor: palette.selection,
    },
  });