import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';

import { Colors } from '@/constants/theme';

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
  return (
    <ThemeProvider value={LightNavTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}