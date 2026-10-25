import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DefaultTheme, DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import ToastHost from '@/components/ui/toast';
import { Colors } from '@/constants/theme';
import { loadMapViewKind } from '@/data/map-settings-store';
import { loadThemeMode, useThemeMode } from '@/data/theme-store';

/* GestureHandlerRootView — свайп-закрытие шторок (граббер SheetModal;
   детектор жестов работает только внутри root view gesture-handler). */

/* Шрифты загрузятся до первого рендера, сплеш-скрин виден, пока готовы не все
   ресурсы — без мигания системного шрифта (подключение Onest, 21.10.2026) */
void SplashScreen.preventAutoHideAsync().catch(() => {
  /* hide уже выполнен — ничего не делаем */
});

/* Тема Light/Dark — палитра Colors (theme.ts), переключение «Профиль →
   Тёмная тема» (theme-store, сохраняется между запусками). Нав-тема
   expo-router обновляется на смену палитры без перезагрузки. */

export default function RootLayout() {
  /* вариативный TTF: вес задается fontWeight (RN 0.86), один файл на все начертания */
  const [fontsLoaded] = useFonts({
    Onest: require('../../assets/fonts/Onest-Variable.ttf'),
  });
  const themeMode = useThemeMode();
  const theme = themeMode === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[themeMode];

  const navTheme = {
    ...theme,
    dark: themeMode === 'dark',
    colors: {
      ...theme.colors,
      primary: palette.accent,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      border: palette.markerHalo,
      notification: palette.accent,
    },
  };

  useEffect(() => {
    /* вид карты из прошлого запуска (ТЗ _x/24.md §5) и тема (ТЗ dark-theme) */
    void loadMapViewKind();
    void loadThemeMode();
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
      <ThemeProvider value={navTheme}>
        {/* Status Bar по теме: тёмная тема — светлые системные символы */}
        <StatusBar
          style={themeMode === 'dark' ? 'light' : 'dark'}
          animated
        />
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