import { Redirect } from 'expo-router';

/* Стартовый маршрут: «/» ведёт на вкладку Карту — экран первый по макету V2. */
export default function Index() {
  return <Redirect href="/map" />;
}