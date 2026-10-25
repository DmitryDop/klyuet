import { useEffect, useState } from 'react';
import {
  BackHandler,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';

import { photoSource } from '@/logic/photos';

/**
 * Полноэкранный просмотр фото — нативный инструмент из системных блоков
 * (сторонние лайтбоксы — запрещены ограничением задачи):
 * чёрный Modal (системный fade) + горизонтальный ScrollView с
 * pagingEnabled (перелистывание нативное); каждая страница — свой
 * зум-ScrollView (native UIScrollView, pinch до 4×, centerContent iOS).
 * Закрытие: тап по фото (Pressable), Android back. Лишних оверлеев,
 * точек и эффектов нет; механика экранов не меняется.
 * Фон #000000 — вне токенов K-DS (роли нет; системный вьювер Photos
 * де-факто чёрный) — помечено для K-DS на уточнение.
 * Android: зум ScrollView не поддерживается (iOS-first приёмка).
 */
export default function PhotoViewer({
  visible,
  photos,
  initialIndex = 0,
  onClose,
}: {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const [pageW, setPageW] = useState(screenW);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (photos.length === 0) return null;

  const onLayout = (e: LayoutChangeEvent) => setPageW(e.nativeEvent.layout.width);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root} onLayout={onLayout}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: Math.max(0, initialIndex) * pageW, y: 0 }}>
          {photos.map((ph, j) => (
            <View key={`${ph}-${j}`} style={[styles.page, { width: pageW }]}>
              <ScrollView
                style={styles.zoom}
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}>
                <Pressable onPress={onClose}>
                  <Image
                    source={photoSource(ph)}
                    style={{ width: pageW, height: pageW / (2 / 3) }}
                    resizeMode="contain"
                  />
                </Pressable>
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000' /* вне токенов K-DS; см. док-комментарий */,
  },
  page: {
    flex: 1,
  },
  zoom: {
    flex: 1,
  },
});