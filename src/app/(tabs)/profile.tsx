import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Palette } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';
import { setThemeMode, useTheme, useThemeMode } from '@/data/theme-store';
import Avatar from '@/components/ui/avatar';
import Toggle from '@/components/ui/toggle';

/* Экран «Профиль» (K 500:11242; ТЗ _x/27.md — Avatar, _x/28.md — экран+Toggle).
   Toolbar Page Title (K 465:543): px16, py8, Title-бокс h40, Title1
   28/34 · 700 слева (прецедент журнала). Контент-колонка: top 112 макета
   (после тулбара 100 отступ 12), px16, gap 8, 361 на макете 393.
   Карточка пользователя (500:11247): bg --color-surface-default #f8f9f5,
   radius/lg 24, px16, py24, gap 16, по центру: Avatar (вариант 80/Icon,
   ring, без Badge) в 80×80-обёртке — кольцо Avatar обводкой 4px снаружи
   и в K выходит за 80-бокс, обёртка сохраняет узловые отступы K;
   username — Title3 20/26, заглушка «%username%» (литерал K, не
   редактируется). Карточка настроек (500:11250): та же поверхность,
   py16; Cell (500:11251): px16, py2, текст «Тёмная тема» Body 16/22 —
   Right: p8 и Toggle.
   Toggle подключён к теме: useThemeMode/setThemeMode (theme-store) —
   переключает тему приложения и сохраняет выбор между запусками.
   Фото/инициалы/авторизация — вне задачи. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const themeMode = useThemeMode();
  const palette = useTheme();
  const styles = makeStyles(palette);

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.title1) }]}>
          Профиль
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.userCard}>
          <View style={styles.avatarBox}>
            <Avatar />
          </View>
          <Text
            style={[
              styles.username,
              { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.title3) },
            ]}
            numberOfLines={1}>
            %username%
          </Text>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.cell}>
            <View style={styles.cellTextWrap}>
              <Text
                style={[
                  styles.cellText,
                  { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.body) },
                ]}>
                Тёмная тема
              </Text>
            </View>
            <View style={styles.cellRight}>
              <Toggle
                value={themeMode === 'dark'}
                onChange={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                accessibilityLabel="Тёмная тема"
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    toolbar: {
      /* Toolbar - Top - iPhone, Page Title (K 465:543): после статус-бара
       py 8; Title-бокс h40 (465:553), текст по центру бокса, слева */
      paddingHorizontal: 16,
    },
    title: {
      height: 40,
      justifyContent: 'center',
      ...rnTextStyle(TEXT.title1),
      fontFamily: FONT_FAMILY,
      color: palette.text,
    },
    content: {
      /* 500:11246: px16, top 112 (отступ 12 после тулбара), gap 8 */
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 8,
    },
    userCard: {
      /* 500:11247: bg surface-default, radius/lg 24, px16 py24, gap 16 */
      backgroundColor: palette.cardSurface,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 24,
      gap: 16,
      alignItems: 'center',
    },
    avatarBox: {
      /* Avatar 80 (500:11248): 80×80 — кольцо (обводка 4px снаружи) выходит
       за бокс, как в K; RN не клипает по умолчанию (iOS) */
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    username: {
      color: palette.text,
      textAlign: 'center',
    },
    settingsCard: {
      /* 500:11250: та же поверхность, py16 */
      backgroundColor: palette.cardSurface,
      borderRadius: 24,
      paddingVertical: 16,
    },
    cell: {
      /* 500:11251 Cell: px16, py2; текст слева (Layuot Txt py8), Right p8 */
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 2,
    },
    cellTextWrap: {
      flex: 1,
      paddingVertical: 8,
    },
    cellText: {
      color: palette.text,
    },
    cellRight: {
      padding: 8,
    },
  });