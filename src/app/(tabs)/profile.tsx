import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

/* Заглушка этапа 02. Настройки (включая Оформление: Системная/Светлая/Тёмная) — не в этапе 02. */
export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.note}>Профиль заглушка</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  note: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
});