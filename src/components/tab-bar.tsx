import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';

import { Colors, TabBarSurface } from '@/constants/theme';
import { TAB_ICONS } from '@/components/tab-icons';

/* Таб-бар по K-DS (компонент tab_bar 68:327): стеклянная пилюля поверх контента,
   3 таба icon-only. Активный таб — плашка --color-selection-bg (#d8e8df), radius 12.
   Поверхность — tab_bar/default: rgba(250,250,246,0.90) + блюр (Figma radius 2 ≈ 1px CSS).
   Точный радиус 1px expo-blur API не задаёт — интенсивность минимальная,
   расхождение проверить визуально (при фоне 90% влияние блюра пренебрежимо). */

const TABS = [
  { name: 'map', path: '/map', label: 'Карта' },
  { name: 'journal', path: '/journal', label: 'Журнал' },
  { name: 'profile', path: '/profile', label: 'Профиль' },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + 4 }]}>
      <View style={styles.pill}>
        {/* слои стекла не перехватывают тапы */}
        <BlurView intensity={10} tint="light" style={styles.layer} pointerEvents="none" />
        <View style={[styles.layer, styles.glass]} pointerEvents="none" />
        {TABS.map((tab) => {
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
                <Path
                  d={icon}
                  fill={active ? Colors.light.accent : Colors.light.text}
                />
              </Svg>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: TabBarSurface,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  /* активная вкладка — плашка --color-selection-bg */
  tabActive: {
    backgroundColor: Colors.light.selection,
  },
});