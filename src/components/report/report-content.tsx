import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import InfoRow from '@/components/place/info-row';
import { displayName } from '@/data/repo';
import { photoSource } from '@/logic/photos';
import type { Place, Report } from '@/data/types';
import { fishingDateLabel } from '@/logic/dates';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Контент деталей отчёта, общий для обычного экрана (K 157:8531) и полного
 * отчёта в Sheet (K 366:5110): галерея → place → about → комментарий.
 * Внутри:
 * - галерея (только при фото): ширина контента, пропорция 361:220, гэп 8,
 *   точки 8px: активная accent, неактивные #ccd4cb (bindings 158:8644);
 *   одна страница — точки скрыты (K 199:9273);
 * - place-блок (K 206:9617): место по placeId (в отчёт не копируется, §3),
 *   автор по authorId + дата рыбалки (не публикации, §7);
 * - about: InfoRow «Вид рыбы» / «Откуда ловил» / «Снасть» / «Приманка»;
 *   пустые секции скрыты (§5); все виды полностью (Дмитрий, 21.10);
 * - комментарий: пустая секция скрыта.
 */
const PHOTO_HEIGHT_BASE = 220;

export default function ReportContent({
  report,
  place,
}: {
  report: Report;
  place: Place | null;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [galleryWidth, setGalleryWidth] = useState(0);

  const speciesValue =
    report.catchStatus === 'with_catch' && report.fishSpeciesIds.length > 0
      ? report.fishSpeciesIds.join(', ')
      : 'Без улова';

  const rows: [string, string][] = [
    ['Вид рыбы', speciesValue],
    ...(report.fishingMethod != null
      ? ([['Откуда ловил', report.fishingMethod === 'shore' ? 'С берега' : 'С лодки']] as [string, string][])
      : []),
    ...(report.tackle != null ? ([['Снасть', report.tackle]] as [string, string][]) : []),
    ...(report.bait != null ? ([['Приманка', report.bait]] as [string, string][]) : []),
  ];

  const onPhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (galleryWidth === 0) return;
    setPhotoIndex(
      Math.max(0, Math.min(report.photos.length - 1, Math.round(x / (galleryWidth + 8)))),
    );
  };

  return (
    <>
      {/* галерея — первый блок (K 157:8536) */}
      {report.photos.length > 0 && (
        <View
          style={styles.gallery}
          onLayout={(e) => setGalleryWidth(e.nativeEvent.layout.width)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={galleryWidth > 0 ? galleryWidth + 8 : undefined}
            decelerationRate="fast"
            onScroll={onPhotoScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ gap: 8 }}>
            {report.photos.map((ph, i) => (
              <Image
                key={`${ph}-${i}`}
                source={photoSource(ph)}
                style={[styles.pagePhoto, galleryWidth > 0 && { width: galleryWidth }]}
              />
            ))}
          </ScrollView>
          {report.photos.length > 1 && (
            <View style={styles.dots}>
              {report.photos.map((ph, i) => (
                <View key={`${ph}-${i}`} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* блок place (K 206:9617); после галереи — 8 (K 157:8536) */}
      <View style={[styles.placeBlock, report.photos.length > 0 && styles.placeBlockGap]}>
        <Text style={styles.placeName}>{place?.name ?? ''}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaAuthor} numberOfLines={1}>
            {displayName(report.authorId)}
          </Text>
          <Text style={styles.metaDate}>{fishingDateLabel(report.fishingDate)}</Text>
        </View>
      </View>

      {/* блок about */}
      <View style={[styles.block, styles.blockPadY]}>
        {rows.map(([label, value], i) => (
          <InfoRow key={label} label={label} value={value} separator={i < rows.length - 1} />
        ))}
      </View>

      {/* комментарий: пустая секция скрыта (§5) */}
      {report.comment != null && report.comment !== '' && (
        <View style={[styles.block, styles.blockPad]}>
          <Text style={styles.blockLabel}>Комментарий</Text>
          <Text style={styles.blockText}>{report.comment}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  gallery: {
    alignSelf: 'stretch',
    gap: 8, /* фотография → точки (K 158:8650) */
    alignItems: 'center',
  },
  placeBlockGap: {
    marginTop: 8, /* галерея → place (K 157:8536) */
  },
  pagePhoto: {
    width: 361, /* до замера onLayout; см. решение по ширине галереи 21.10 */
    aspectRatio: 361 / PHOTO_HEIGHT_BASE,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.cardSurface,
    resizeMode: 'cover',
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    height: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.borderSubtle /* --color-bg-secondary (158:8644) */,
  },
  dotActive: {
    backgroundColor: Colors.light.accent /* --color-action-default (158:8644) */,
  },
  placeBlock: {
    backgroundColor: Colors.light.cardSurface,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  placeName: {
    ...rnTextStyle(TEXT.title3),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12, /* sm (K 206:9621) */
    marginTop: 2, /* название → автор/дата (K 206:9619) */
  },
  metaAuthor: {
    ...rnTextStyle(TEXT.bodyS),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    flexGrow: 1,
    flexShrink: 1,
  },
  metaDate: {
    ...rnTextStyle(TEXT.bodyS),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    textAlign: 'right',
  },
  block: {
    backgroundColor: Colors.light.cardSurface,
    borderRadius: 16,
    borderCurve: 'continuous',
    marginTop: 8, /* gap-8px между блоками */
  },
  blockPad: {
    padding: 16,
  },
  blockPadY: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  blockLabel: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    marginBottom: 12, /* название → текст (pb-12, K 157:8526) */
  },
  blockText: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
});