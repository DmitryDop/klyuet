import { Tabs } from 'expo-router';

import TabBar from '@/components/tab-bar';
import { usePlaceCreateActive } from '@/data/place-create-store';

export default function TabsLayout() {
  /* Шаг 1 создания места — оверлей на карте (решение Дмитрия 22.10, маршрут
     /add-place снят): шторка в макете K 383:7080 идёт до низа, таб-бара на
     шаге нет — бар скрыт, пока жив черновик (возврат со шага 2 или отмена
     возвращают бар). */
  const creating = usePlaceCreateActive();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={creating ? () => null : () => <TabBar />}>
      <Tabs.Screen name="map" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}