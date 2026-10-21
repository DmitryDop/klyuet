import { useEffect } from 'react';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { Colors } from '@/constants/theme';

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
    <ThemeProvider value={LightNavTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}