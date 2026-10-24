import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { Colors } from '@/constants/theme';
import ToastHost from '@/components/ui/toast';
import { loadMapViewKind } from '@/data/map-settings-store';

/* GestureHandlerRootView — свайп-закрытие шторок (граббер SheetModal;
   детектор жестов работает только внутри root view gesture-handler). */

/* Шрифты загрузятся до первого рендера, сплеш-скрин виден, пока готовы не все
   ресурсы — без мигания системного шрифта (подключение Onest, 21.10.2026) */
void SplashScreen.preventAutoHideAsync().catch(() => {
  /* hide уже выполнен — ничего не делаем */
});

/* Светлая тема — единственная подтверждённая в V1.
   Токены в src/constants/theme.ts; будущее переключение Системная/Светлая/Тёмная
   (Профиль → Настройки) заменит эту фиксированную тему на провайдер выбора. */
const LightNavTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.accent,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.markerHalo,
    notification: Colors.light.accent,
  },
};

export default function RootLayout() {
  /* вариативный TTF: вес задается fontWeight (RN 0.86), один файл на все начертания */
  const [fontsLoaded] = useFonts({
    Onest: require('../../assets/fonts/Onest-Variable.ttf'),
  });

  useEffect(() => {
    /* вид карты из прошлого запуска (ТЗ _x/24.md §5) */
    void loadMapViewKind();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => {
        /* уже скрыт — ничего не делаем */
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; /* сплеш-скрин остаётся на экране */
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider value={LightNavTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        {/* единый тост поверх всех экранов (reports.md §8) */}
        <ToastHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});