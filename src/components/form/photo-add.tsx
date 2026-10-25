import { useState } from 'react';
import { ActionSheetIOS, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect } from 'react-native-svg';

import { UI_ICONS } from '@/components/ui-icons';
import { photoSource } from '@/logic/photos';
import { type Palette } from '@/constants/theme';
import { useTheme, useThemeMode } from '@/data/theme-store';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Блок фото формы (K 206:9709–206:9639): превью-ряд 146×111 r12 с удалением
 * (circle-xmark #B84A42 на подложке bg-primary) + кнопка «Добавить фото»
 * (dashed 8/4, stroke --color-border-control, r12). Реальный пикер
 * (камера/медиатека/документы) — общий для формы отчёта и формы места:
 * ActionSheet на iOS, медиатека на остальных платформах.
 * Вынесен из report-form при задаче _x/18.md (переиспользование, Дмитрий 22.10).
 */
export default function PhotoAdd({
  photos,
  onChange,
  disabled = false,
  onAfterAdd,
}: {
  /** текущий список (URI либо демо-маркер для photoSource) */
  photos: string[];
  onChange: (next: string[]) => void;
  /** блокируется на время отправки (reports.md §8) */
  disabled?: boolean;
  /** например доскролл формы, чтобы CTA не уехала за край */
  onAfterAdd?: () => void;
}) {
  const palette = useTheme();
  const themeMode = useThemeMode();
  const styles = makeStyles(palette);

  const addUri = (uri: string) => {
    onChange([...photos, uri]);
    onAfterAdd?.();
  };

  const openPicker = () => {
    if (disabled) return;
    if (Platform.OS !== 'ios') {
      void ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }).then(
        (r) => {
          if (!r.canceled && r.assets[0] != null) addUri(r.assets[0].uri);
        },
      );
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Сделать фото', 'Выбрать из медиатеки', 'Выбрать из документов', 'Отмена'],
        cancelButtonIndex: 3,
        userInterfaceStyle: themeMode, /* системная шторка по теме (тёмная тема) */
      },
      (buttonIndex) => {
        void (async () => {
          try {
            if (buttonIndex === 0) {
              /* камера: право запрашивается перед запуском (Expo Go);
                 отказ/сбой — тихий выход, форма не искажается */
              const cam = await ImagePicker.requestCameraPermissionsAsync();
              if (!cam.granted) return;
              const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
              if (!result.canceled && result.assets[0] != null) {
                addUri(result.assets[0].uri);
              }
            } else if (buttonIndex === 1) {
              const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!media.granted) return;
              const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, selectionLimit: 1 });
              if (!result.canceled && result.assets?.[0]?.uri != null) {
                addUri(result.assets[0].uri);
              }
            } else if (buttonIndex === 2) {
              const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: false, copyToCacheDirectory: true });
              if (result.canceled === false && result.assets?.[0]?.uri != null) {
                addUri(result.assets[0].uri);
              }
            }
          } catch {
            /* системный пикер недоступен — форма без фото остаётся рабочей */
          }
        })();
      },
    );
  };

  return (
    <>
      {/* фото-превью (206:9709): только при наличии; px 16, py 8 */}
      {photos.length > 0 && (
        <View style={staticStyles.photoRowWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={staticStyles.photoRow}>
            {photos.map((ph, i) => (
              <View key={`${ph}-${i}`} style={styles.photoWrap}>
                <Image source={photoSource(ph)} style={staticStyles.photo} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Удалить фото"
                  disabled={disabled}
                  onPress={() => onChange(photos.filter((_, j) => j !== i))}
                  style={styles.photoDelete}>
                  <Svg width={24} height={24} viewBox="0 0 24 24">
                    <Path
                  d={UI_ICONS.circleXmark.d}
                  fill={palette.dangerDefault} /* = --color-danger-default (206:9711) */
                />
                  </Svg>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Добавить фото (206:9639): dashed, dash 8 / gap 4 (Дмитрий 22.10) —
          RN borderStyle dashed не параметризуется, рамка через SVG */}
      <View style={staticStyles.uploadWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить фото"
          disabled={disabled}
          onPress={openPicker}
          style={staticStyles.upload}>
          <UploadDash />
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d={UI_ICONS.camera.d} fill={palette.text} />
          </Svg>
          {/* иконка → подпись: gap 4 (258:684) */}
          <Text style={styles.uploadLabel}>Добавить фото</Text>
        </Pressable>
      </View>
    </>
  );
}

/* dashed-рамка кнопки «Добавить фото»: dash 8 / gap 4, stroke
   --color-border-control, radius 12 (решение Дмитрия 22.10) */
function UploadDash() {
  const palette = useTheme();
  const [size, setSize] = useState({ w: 0, h: 48 });
  return (
    <View
      style={[StyleSheet.absoluteFill, staticStyles.uploadDashWrap]}
      pointerEvents="none"
      onLayout={(e) =>
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
      }>
      <Svg width={size.w} height={size.h}>
        <Rect
          x={0.5}
          y={0.5}
          width={Math.max(0, size.w - 1)}
          height={Math.max(0, size.h - 1)}
          rx={11.5}
          ry={11.5}
          stroke={palette.borderControl}
          strokeWidth={1}
          strokeDasharray="8 4"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  photoRowWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8, /* preview photo (206:9709) */
  },
  photoRow: {
    gap: 8, /* между фото 8 (206:9710) */
  },
  photo: {
    width: 146,
    height: 111,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  uploadWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8, /* Upload (206:9638) */
  },
  upload: {
    /* границу рисует UploadDash (dash 8 / gap 4) — стилей border нет */
    height: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadDashWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    photoWrap: {
      width: 146,
      height: 111,
      borderRadius: 12,
      borderCurve: 'continuous',
      backgroundColor: palette.cardSurface,
    },
    photoDelete: {
      position: 'absolute',
      top: 0,
      right: 0, /* badge в правом верхнем углу (206:9711: left 122 = right 0) */
      width: 24,
      height: 24,
      borderRadius: 24,
      backgroundColor: palette.background, /* подложка badge (bg-primary) */
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadLabel: {
      /* кнопка — Label L 16/20 · 500 (Дмитрий 22.10, как основные кнопки) */
      ...rnTextStyle(TEXT.labelL),
      fontFamily: FONT_FAMILY,
      color: palette.text,
    },
  });