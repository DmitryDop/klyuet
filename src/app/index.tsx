
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Клюёт!</Text>
      <Text style={styles.subtitle}>Твоя рыбалка начинается здесь</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7F4',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#172B20',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
    color: '#526459',
  },
});
  