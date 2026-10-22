import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollView as ScrollViewType,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  useLocalSearchParams,
  useRouter,
  useNavigation,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import ButtonUi from '@/components/button-ui';
import Button from '@/components/button';
import Chip from '@/components/form/chip';
import FormField from '@/components/form/form-field';
import FormInput from '@/components/form/form-input';
import FormSelect from '@/components/form/form-select';
import SelectSheet from '@/components/form/select-sheet';
import SheetModal from '@/components/ui/sheet-modal';
import ModalCard from '@/components/ui/modal-card';
import { showToast } from '@/components/ui/toast';
import { UI_ICONS } from '@/components/ui-icons';
import { SPECIES_CATALOG, TACKLE_CATALOG } from '@/data/catalog';
import { CURRENT_USER_ID, demoPlaceRepo } from '@/data/repo';
import type { CatchStatus, Place } from '@/data/types';
import { formatRuDate, isFutureDate, isoDate, isoDateShifted } from '@/logic/dates';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/* Форма отчёта — создание (K 206:9625 «Новый отчёт», 214:10364 «Без улова»,
   223:4451 «лоад», 224:5882 «Возврат по стрелке BACK», 231:9628 / 225:6113
   модалки ошибок) и редактирование (K 160:8719 «Редактирование отчета»,
   228:8682); превью фото — 206:9709. Тост — K 235:9776.
   Спека: docs/reports.md §4–§8.

   - место уже выбрано и не меняется: заголовок (Title3 20/26) + «Публикация
     в выбранной точке» (Caption); поля места в отчёт не копируются (§3);
   - «Как прошла рыбалка?» — обязательные чипы 44 flex со «*»; «Без улова»
     скрывает выбор рыбы и видов не публикует (§4.2);
   - дата рыбалки «*»: поле дд.мм.гггг (календарь), чипы 32 Сегодня/Вчера/
     Позавчера (222:4342); будущие даты запрещены (§4.3) — maximumDate;
     чипы синхронизируются: активен только совпавший (§4.4);
   - способ ловли (чипы, deselectable), снасть (шторка-список как «Вид рыбы»,
     без чипсов — Дмитрий 22.10), приманка, «Что происходило?», фото —
     необязательные; у приманки TextInput (K 206:9636);
   - фото: демо-снимок assets/demo/report-346.png («Добавить фото» — dashed,
     206:9639; удаление — circle-xmark #B84A42, 206:9709): реальный пикер
     фото — этап реального контента (ограничение — в отчёте реализации);
   - выход с несохранёнными изменениями — модалка «Выйти без сохранения?»
     (224:6017): «Остаться» / «Выйти», крестик = «Остаться»;
     текст по контексту (Дмитрий 22.10): новый — «Введённые данные будут
     потеряны.», правка — «Изменения в отчёте будут потеряны.»;
   - ошибки публикации/сохранения (225:6113, 228:8682): «Вернуться к отчету»
     (остаться в форме) + «Повторить»;
   - на время отправки: лоадер кнопки, повторный submit и выход заблокированы
     (§8), поля и шторки не открываются;
   - валидация (§3): статус и дата обязательны; при «С уловом» — минимум один
     вид; «Опубликовать» disabled до выполнения (прецедент K 91:5899). */

import { photoSource } from '@/logic/photos';

type FormState = {
  catchStatus: CatchStatus;
  species: string[];
  fishingDate: string;
  fishingMethod?: 'shore' | 'boat';
  tackle?: string;
  bait: string;
  comment: string;
  photos: string[];
};

const EMPTY_FORM: FormState = {
  catchStatus: 'with_catch',
  species: [],
  fishingDate: isoDate(),
  bait: '',
  comment: '',
  photos: [],
};

export default function ReportFormScreen() {
  const { placeId, report: reportId } = useLocalSearchParams<{
    placeId: string;
    report?: string;
  }>();
  const isEdit = reportId != null;
  const router = useRouter();
  const navigation = useNavigation<{
    addListener: (event: string, cb: (e: FormGuardEvent) => void) => () => void;
  }>();
  const insets = useSafeAreaInsets();

  const [place, setPlace] = useState<Place | null>(null);
  const [failedToLoad, setFailedToLoad] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<FormState | null>(null);

  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [tackleOpen, setTackleOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarValue, setCalendarValue] = useState(() => new Date());
  const [exitModal, setExitModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /* скролл к полю с ошибкой (K 87:4145: поле с ошибкой должно быть видно) */
  const scrollViewRef = useRef<ScrollViewType | null>(null);
  const speciesFieldY = useRef(0);

  /* высота клавиатуры (K 87:4145: поле при фокусе всегда видно).
     Панель поднимается ТОЛЬКО при фокусе поля ввода (гонка «фокус→ref»
     при первом тапе исключена: высота клавиатуры записывается при любых
     событиях, решение о подъёме принимает фокус); пикер фото не спрятает
     кнопку: без фокуса панель всегда внизу, застрявшая высота не двигает. */
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputFocus, setInputFocus] = useState<'bait' | 'comment' | null>(null);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const didHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      didHide.remove();
    };
  }, []);

  const allowExitRef = useRef(false);

  /* Загрузка: место обязательно; для правки — значения отчёта (§8: не
     показывать недостоверную пустую форму) */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const p = await demoPlaceRepo.getPlace(placeId);
      const r = reportId != null ? await demoPlaceRepo.getReport(reportId) : null;
      if (!alive) return;
      if (p == null || (reportId != null && (r == null || r.placeId !== placeId))) {
        setFailedToLoad(true);
        setLoading(false);
        return;
      }
      const initial: FormState = {
        catchStatus: r?.catchStatus ?? 'with_catch',
        species: r?.fishSpeciesIds ?? [],
        fishingDate: r?.fishingDate ?? isoDate(),
        fishingMethod: r?.fishingMethod,
        tackle: r?.tackle,
        bait: r?.bait ?? '',
        comment: r?.comment ?? '',
        photos: r?.photos ?? [],
      };
      setFailedToLoad(false);
      setPlace(p);
      setBaseline(initial);
      setForm(initial);
      setCalendarValue(new Date(`${initial.fishingDate}T00:00:00`));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [placeId, reportId, loadAttempt]);

  const retryLoad = () => {
    setLoading(true);
    setLoadAttempt((a) => a + 1);
  };

  /* Сравнение с сохранёнными значениями: dirty = были реальные изменения;
     предустановленная дата сама по себе форму не изменяет (§6) */
  const dirty = useMemo(
    () => baseline != null && JSON.stringify(form) !== JSON.stringify(baseline),
    [baseline, form],
  );

  /* Выход (reports.md §6): «Назад» при несохранённых изменениях → модалка.
     Без изменений и служебные переходы (replace после отправки) проходят
     сразу. */
  useEffect(() => {
    if (loading) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowExitRef.current || !dirty) return;
      e.preventDefault();
      setExitModal(true);
    });
    return unsubscribe;
  }, [navigation, loading, dirty]);

  /* ошибки полей: валидация по нажатию (§4.6), подсветка по K-DS Error
     (K 87:4145): граница 2px danger + подпись причины; снимается исправлением
     (флаг «нажимали» + текущая валидность поля) */
  const [speciesSubmitted, setSpeciesSubmitted] = useState(false);
  const speciesError =
    speciesSubmitted &&
    form.catchStatus === 'with_catch' &&
    form.species.length === 0;

  const submit = async () => {
    /* валидация по нажатию (§4.6): ошибки полей подсвечиваются по K-DS
       Error (K 87:4145), кнопка активна всегда (решение Дмитрия 22.10);
       повторная отправка заблокирована на время запроса (§8) */
    if (submitting) return;
    /* «Это поле нужно заполнить» — канонический текст причины (K 87:4145) */
    setSpeciesSubmitted(true);
    if (form.catchStatus === 'with_catch' && form.species.length === 0) {
      /* доскип до поля с ошибкой: над ним запас видимости */
      scrollViewRef.current?.scrollTo({ y: Math.max(0, speciesFieldY.current - 120), animated: true });
      return;
    }
    setSubmitting(true);
    const patch = {
      catchStatus: form.catchStatus,
      fishSpeciesIds: form.catchStatus === 'with_catch' ? form.species : [],
      fishingDate: form.fishingDate,
      fishingMethod: form.fishingMethod,
      tackle: form.tackle,
      bait: form.bait !== '' ? form.bait : undefined,
      comment: form.comment !== '' ? form.comment : undefined,
      photos: form.photos,
    };
    const created = isEdit
      ? await demoPlaceRepo.updateReport(reportId as string, patch)
      : await demoPlaceRepo.createReport({
          placeId,
          authorId: CURRENT_USER_ID,
          ...patch,
        });
    setSubmitting(false);
    if (created == null) {
      /* поля формы сохранены — модалка с Повторить (§8) */
      setErrorModal(true);
      return;
    }
    /* успех: открыть созданный/обновлённый отчёт, тост на цели (§4.7, §6);
       replace — форма не должна остаться в истории */
    allowExitRef.current = true;
    router.replace(`/report/${created.id}`);
    showToast(isEdit ? 'Изменения сохранены' : 'Отчёт опубликован');
  };

  const submitLabel = isEdit ? 'Сохранить отчёт' : 'Опубликовать отчёт';
  /* единый экземпляр кнопки: в потоке формы, при клавиатуре — над ней */
  const publishButton = (
    /* БЕЗ flex: в потоке высота по контенту (48) — flex с basis 0%
       схлопывал кнопку в 0 при рендере с фото (диагностика h=58) */
    <Button
      label={submitLabel}
      variant="primary"
      loading={submitting}
      onPress={submit}
    />
  );

  const patchForm = (next: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...next }));

  const toggleSpeciesChip = (label: 'with_catch' | 'without_catch') => {
    patchForm({
      catchStatus: label,
      /* переключение туда-обратно возвращает прежний выбор без утечки
         скрытых видов в публикацию (§4.2) */
    });
  };

  /* дата вне набора — активных чипсов нет (§4.4) */
  const activeChip = useMemo(() => {
    for (let d = 0; d <= 2; d++) if (isoDateShifted(d) === form.fishingDate) return d;
    return -1;
  }, [form.fishingDate]);

  /* «Добавить фото» (206:9639): системный ActionSheet (iOS) — камера /
     медиатека / документы; выбранный снимок — реальный URI в photos.
     Демо-маркер '346' остаётся только в fixtures. */
  const addPhotoSource = (uri: string) => {
    patchForm({ photos: [...form.photos, uri] });
    /* превью над кнопкой раздвигает контент: доскрол сохраняет CTA
       в границах экрана (Дмитрий 22.10: кнопка не должна пропадать) */
    setTimeout(() => {
       
      console.log('[diag] scrollToEnd fired, ref:', scrollViewRef.current != null);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 60);
  };

  const openPhotoActions = () => {
    if (submitting) return;
    /* iOS — системный ActionSheet; без iOS — сразу медиатека */
    if (Platform.OS !== 'ios') {
      void ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }).then(
        (r) => {
          if (!r.canceled && r.assets[0] != null) addPhotoSource(r.assets[0].uri);
        },
      );
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Сделать фото', 'Выбрать из медиатеки', 'Выбрать из документов', 'Отмена'],
        cancelButtonIndex: 3,
        userInterfaceStyle: 'light', /* V1 — светлая тема */
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
                addPhotoSource(result.assets[0].uri);
              }
            } else if (buttonIndex === 1) {
              const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!media.granted) return;
              const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, selectionLimit: 1 });
              if (!result.canceled && result.assets[0] != null) {
                addPhotoSource(result.assets[0].uri);
              }
            } else if (buttonIndex === 2) {
              const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: false, copyToCacheDirectory: true });
              if (result.canceled === false && result.assets?.[0]?.uri != null) {
                addPhotoSource(result.assets[0].uri);
              }
            }
          } catch {
            /* системный пикер недоступен — форма без фото остаётся рабочей */
          }
        })();
      },
    );
  };

  const removePhoto = (index: number) => {
    patchForm({ photos: form.photos.filter((_, i) => i !== index) });
  };

  const speciesValue =
    form.catchStatus === 'with_catch' ? (form.species.length > 0 ? form.species.join(', ') : null) : null;

  /* загрузка контекста — не показывать форму раньше данных (reports.md §8) */
  if (loading) {
    return <View style={styles.container} />;
  }

  /* срыв загрузки: понятное состояние ошибки и «Повторить» (reports.md §8),
     без бесконечного скелетона */
  if (failedToLoad || place == null) {
    return (
      <View style={[styles.container, styles.errorWrap]}>
        <Text style={styles.errorText}>Не удалось загрузить место. Проверьте соединение и попробуйте ещё раз.</Text>
        <Button label="Повторить" variant="primary" flex onPress={() => retryLoad()} />
      </View>
    );
  }

  /* [diag] состояние панели (снять после разбора бага CTA, 22.10) */
   
  console.log('[diag] form kb:', keyboardHeight, 'focus:', inputFocus, 'photos:', form.photos.length);

  return (
    <View style={styles.container}>
      {/* тулбар: назад + (создание/редактирование). Toolbar - Top - iPhone:
          py 8 px 16; заголовок — всегда центр панели; высота insets.top+60,
          кнопки absolute на top insets.top+8 (правило slice 4) */}
      <View style={[styles.toolbar, { height: insets.top + 60 }]}>
        <View style={[styles.toolbarButtonLeft, { top: insets.top + 8 }]}>
          <ButtonUi
            icon="chevronLeft"
            type="toolbar"
            onPress={router.back}
            accessibilityLabel="Назад"
          />
        </View>
        <View
          style={[styles.toolbarTitleWrap, { top: insets.top + 8, bottom: 8 }]}>
          <View style={styles.toolbarTitleBox}>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              {isEdit ? 'Редактирование отчета' : 'Новый отчёт'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        /* контент доскипится до активного поля над клавиатурой: запас
           по высоте клавиатуры динамический */
        contentContainerStyle={{
          /* при фокусе поля панель висит над клавиатурой — резерв
             контента: клавиатура + панель; в покое кнопка в потоке */
          paddingBottom:
            inputFocus != null && keyboardHeight > 0 ? keyboardHeight + 72 : 16,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Title (206:9629): pt 16 pb 8 px 16; место привязано к placeId */}
        <View style={styles.titleBlock}>
          <Text style={styles.placeTitle} numberOfLines={2}>
            {place?.name ?? ''}
          </Text>
          <Text style={styles.placeSubtitle}>Публикация в выбранной точке</Text>
        </View>

        {/* «Как прошла рыбалка?» * (206:9632): чипы 44 flex, gap 8 */}
        <FormField label="Как прошла рыбалка?" required>
          <View style={styles.chipRow}>
            <Chip
              label="С уловом"
              selected={form.catchStatus === 'with_catch'}
              flex
              disabled={submitting}
              onPress={() => toggleSpeciesChip('with_catch')}
            />
            <Chip
              label="Без улова"
              selected={form.catchStatus === 'without_catch'}
              flex
              disabled={submitting}
              onPress={() => toggleSpeciesChip('without_catch')}
            />
          </View>
        </FormField>

        {/* «Какую рыбу ловил?» — скрыт при «Без улова» (214:10364, §4.2);
            валидируется по нажатию (§4.6), скролл к ошибке */}
        {form.catchStatus === 'with_catch' && (
          <View onLayout={(e) => (speciesFieldY.current = e.nativeEvent.layout.y)}>
          <FormField
            label="Какую рыбу ловил?"
            errorText={speciesError ? 'Это поле нужно заполнить' : undefined}>
            <FormSelect
              value={speciesValue}
              placeholder=""
              icon="chevronDown"
              disabled={submitting}
              error={speciesError}
              focused={speciesOpen}
              onPress={() => setSpeciesOpen(true)}
            />
          </FormField>
          </View>
        )}

        {/* Дата рыбалки * (215:10598): select с calendar + чипы (222:4342),
            у чип-группы дат нет label и верхнего паддинга */}
        {/* дата обязательна по спеке (§4.3), но звёздочку обязательности
            Дмитрий просил убрать 22.10 */}
        <FormField label="Дата рыбалки">
          <FormSelect
            value={formatRuDate(form.fishingDate)}
            placeholder=""
            icon="calendar"
            disabled={submitting}
            focused={calendarOpen}
            onPress={() => setCalendarOpen(true)}
          />
        </FormField>
        <View style={styles.dateChipGroup}>
          {['Сегодня', 'Вчера', 'Позавчера'].map((label, d) => (
            <Chip
              key={label}
              label={label}
              size="sm"
              selected={activeChip === d}
              disabled={submitting}
              onPress={() => patchForm({ fishingDate: isoDateShifted(d) })}
            />
          ))}
        </View>

        {/* Способ ловли (206:9634) */}
        <FormField label="Способ ловли">
          <View style={styles.chipRow}>
            <Chip
              label="С лодки"
              selected={form.fishingMethod === 'boat'}
              flex
              disabled={submitting}
              onPress={() =>
                patchForm({ fishingMethod: form.fishingMethod === 'boat' ? undefined : 'boat' })
              }
            />
            <Chip
              label="С берега"
              selected={form.fishingMethod === 'shore'}
              flex
              disabled={submitting}
              onPress={() =>
                patchForm({ fishingMethod: form.fishingMethod === 'shore' ? undefined : 'shore' })
              }
            />
          </View>
        </FormField>

        {/* Снасть (206:9635) — шторка-список, без чипсов (Дмитрий 22.10) */}
        <FormField label="Снасть (необязательно)">
          <FormSelect
            value={form.tackle ?? null}
            placeholder=""
            icon="chevronDown"
            disabled={submitting}
            focused={tackleOpen}
            onPress={() => setTackleOpen(true)}
          />
        </FormField>

        {/* Приманка (206:9636) — Input 48 (K-DS 353:9851) */}
        <FormField label="Приманка (необязательно)">
          <FormInput
            value={form.bait}
            onChangeText={(t) => patchForm({ bait: t })}
            placeholder="" /* макет: пустое поле (placeholder=Off) */
            editable={!submitting}
            onFocus={() => setInputFocus('bait')}
            onBlur={() => setInputFocus(null)}
          />
        </FormField>

        {/* Что происходило? (206:9637) — Textarea 120 (K-DS 227:6352) */}
        <FormField label="Что происходило?">
          <FormInput
            value={form.comment}
            onChangeText={(t) => patchForm({ comment: t })}
            placeholder=""
            multiline
            editable={!submitting}
            onFocus={() => setInputFocus('comment')}
            onBlur={() => setInputFocus(null)}
          />
        </FormField>

        {/* фото-превью (206:9709): только при наличии; px 16, py 8 */}
        {form.photos.length > 0 && (
          <View style={styles.photoRowWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {form.photos.map((ph, i) => (
                <View key={`${ph}-${i}`} style={styles.photoWrap}>
                  <Image source={photoSource(ph)} style={styles.photo} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Удалить фото"
                    disabled={submitting}
                    onPress={() => removePhoto(i)}
                    style={styles.photoDelete}>
                    <Svg width={24} height={24} viewBox="0 0 24 24">
                      <Path
                        d={UI_ICONS.circleXmark.d}
                        fill="#b84a42" /* литерал макета (не токен), 206:9711 */
                      />
                    </Svg>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Добавить фото (206:9639): dashed, dash 8 / gap 4 (Дмитрий 22.10) —
            RN borderStyle dashed не параметризуется, рамка через SVG;
            тап — системный ActionSheet и pickers (реальные URI) */}
        <View style={styles.uploadWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Добавить фото"
            disabled={submitting}
            onPress={openPhotoActions}
            style={styles.upload}>
            <UploadDash />
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path d={UI_ICONS.camera.d} fill={Colors.light.text} />
            </Svg>
            {/* иконка → подпись: gap 4 (258:684) */}
            <Text style={styles.uploadLabel}>Добавить фото</Text>
          </Pressable>
        </View>

        {/* кнопка в потоке формы (не плавает, не перекрывает контент —
            решение Дмитрия 22.10) — НЕ выгружается из дерева: при фокусе поля
            только скрывается (панель над клавиатурой её заменяет); после
            пикера фото кнопка возвращается с тем же экземпляром */}
        <View
          style={[
            styles.panelFlow,
            { paddingBottom: 8 + insets.bottom },
            inputFocus != null && keyboardHeight > 0 && styles.hidden,
          ]}>
          <View style={styles.publishStretch}>{publishButton}</View>
        </View>
      </ScrollView>

      {/* панель при фокусе поля ввода: над клавиатурой (K 87:4145).
          Привязка к inputFocus, не к клавиатурным событиям: пикер фото
          не может спрятать кнопку (байпас бага) */}
      {inputFocus != null && keyboardHeight > 0 && (
        <View style={[styles.panel, { paddingBottom: 8, bottom: keyboardHeight }]}>
          {publishButton}
        </View>
      )}

      {/* шторка видов (K 91:6113): мульти, с чипсами-фильтрами и поиском
          (K-DS Search 218:562; задача _x: обеспечить поиск по справочнику) */}
      <SelectSheet
        visible={speciesOpen}
        title="Вид рыбы"
        items={SPECIES_CATALOG}
        categories={['Все', 'Хищная', 'Мирная']}
        mode="multi"
        initial={form.species}
        onApply={(sel) => patchForm({ species: sel })}
        onClose={() => setSpeciesOpen(false)}
      />

      {/* шторка снасти: как «Вид рыбы», но без чипсов-фильтров; одиночный;
          открывается по наполнению (fullHeight=false — решение Дмитрия 22.10) */}
      <SelectSheet
        visible={tackleOpen}
        title="Снасть"
        items={TACKLE_CATALOG}
        mode="single"
        initial={form.tackle != null ? [form.tackle] : []}
        fullHeight={false}
        onApply={(sel) => patchForm({ tackle: sel[0] })}
        onClose={() => setTackleOpen(false)}
      />

      {/* системный барабан дат (будущие даты запрещены maximumDate, §4.3)
          в SheetModal по контенту: overlay + граббер + свайп + тап вне modal */}
      <SheetModal
        visible={calendarOpen}
        fullHeight={false}
        onClose={() => setCalendarOpen(false)}>
        <View style={[styles.flex, { paddingBottom: 8 + insets.bottom }]}>
          <View style={styles.dateSheetToolbar}>
            <View style={styles.toolbarRow}>
              <ButtonUi
                icon="close"
                type="toolbar"
                onPress={() => setCalendarOpen(false)}
                accessibilityLabel="Закрыть"
              />
            </View>
            <View style={styles.dateTitleWrap} pointerEvents="none">
              <View style={styles.sheetTitleBox}>
                <Text style={styles.sheetTitle}>Дата рыбалки</Text>
              </View>
            </View>
          </View>
          <DateTimePicker
            value={calendarValue}
            mode="date"
            locale="ru_RU"
            /* системный барабан дат (iOS spinner) в шторке по контенту;
               будущие даты запрещены maximumDate (reports.md §4.3);
               дата подставляется по «Применить» */
            minimumDate={new Date(1900, 0, 1)}
            maximumDate={new Date()}
            display="spinner"
            /* V1 — только светлая тема: нативный пикер наследует appearance
               ОС; фиксируем светлый вариант виджета */
            themeVariant="light"
            style={styles.picker}
            onChange={(_, date) => {
              if (date != null && !isFutureDate(isoDate(date))) {
                setCalendarValue(date);
              }
            }}
          />
          {/* Bottom Action (K-DS 238:3948): Применить — подставляет дату
              в поле и закрывает шторку (чипсы синхронизируются) */}
          <View style={styles.dateApplyWrap}>
            <Button
              label="Применить"
              variant="primary"
              flex
              onPress={() => {
                patchForm({ fishingDate: isoDate(calendarValue) });
                setCalendarOpen(false);
              }}
            />
          </View>
        </View>
      </SheetModal>

      {/* выход с несохранёнными изменениями (reports.md §6, 224:6017) */}
      <ModalCard
        visible={exitModal}
        icon="info"
        title="Выйти без сохранения?"
        body={isEdit ? 'Изменения в отчёте будут потеряны.' : 'Введённые данные будут потеряны.'}
        actions={[
          { label: 'Остаться', onPress: () => setExitModal(false) },
          {
            label: 'Выйти',
            onPress: () => {
              setExitModal(false);
              allowExitRef.current = true;
              router.back();
            },
          },
        ]}
        onClose={() => setExitModal(false)}
      />

      {/* ошибка публикации/сохранения (reports.md §8, 225:6130) */}
      <ModalCard
        visible={errorModal}
        icon="warn"
        title={isEdit ? 'Не удалось сохранить изменения' : 'Не удалось опубликовать отчет'}
        body={'Ваши данные сохранены в форме.\nПопробуйте ещё раз.'}
        actions={[
          { label: 'Вернуться к отчету', onPress: () => setErrorModal(false) },
          {
            label: 'Повторить',
            onPress: () => {
              setErrorModal(false);
              void submit();
            },
          },
        ]}
        onClose={() => setErrorModal(false)}
      />
    </View>
  );
}

/* beforeRemove: preventDefault + возобновление через модалку */
type FormGuardEvent = {
  preventDefault: () => void;
  data: { action: unknown };
};

/* dashed-рамка кнопки «Добавить фото»: dash 8 / gap 4, stroke
   --color-border-control, radius 12 (решение Дмитрия 22.10) */
function UploadDash() {
  const [size, setSize] = useState({ w: 0, h: 48 });
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.uploadDashWrap]}
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
          stroke={Colors.light.borderControl}
          strokeWidth={1}
          strokeDasharray="8 4"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    /* фон экрана формы: --color-surface-default (K 206:9625 root bg) */
    backgroundColor: Colors.light.cardSurface,
  },
  errorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  errorText: {
    ...rnTextStyle(TEXT.body),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  toolbar: {
    /* Toolbar - Top - iPhone: px 16, кнопки/тайтл на top insets.top+8
       (высота insets.top + 60 подставляется в JSX) */
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  toolbarButtonLeft: {
    position: 'absolute',
    left: 16,
    /* top подставляется в JSX: insets.top + 8 */
    overflow: 'hidden',
  },
  toolbarTitleWrap: {
    /* full-width обёртка: центр = центр панели; top/bottom в JSX (top = insets.top + 8) */
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarTitleBox: {
    width: 255, /* зона тайтла 255 (K-DS 218:405) */
    alignItems: 'center',
  },
  toolbarTitle: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
    textAlign: 'center',
  },
  titleBlock: {
    paddingTop: 16,
    paddingBottom: 8, /* Title (206:9629): pb 8 */
    paddingHorizontal: 16,
  },
  placeTitle: {
    ...rnTextStyle(TEXT.title3),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
  placeSubtitle: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    marginTop: 4, /* заголовок → подзаголовок gap 4 (206:9629) */
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChipGroup: {
    /* Chip Group дат (222:4342): px 16, pb 8 — лейбл скрыт, верхнего нет */
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
  },
  photoRowWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8, /* preview photo (206:9709) */
  },
  photoRow: {
    gap: 8, /* между фото 8 (206:9710) */
  },
  photoWrap: {
    width: 146,
    height: 111,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.cardSurface,
  },
  photo: {
    width: 146,
    height: 111,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  photoDelete: {
    position: 'absolute',
    top: 0,
    right: 0, /* badge в правом верхнем углу (206:9711: left 122 = right 0) */
    width: 24,
    height: 24,
    borderRadius: 24,
    backgroundColor: Colors.light.background, /* подложка badge (#e8ece5, 84:3894) */
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: Colors.light.cardSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadLabel: {
    ...rnTextStyle(TEXT.label),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
  },
  uploadDashWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  panel: {
    /* absolute-режим — только над клавиатурой (bottom в JSX);
       панель в тон экрана: --color-surface-default */
    position: 'absolute',
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.cardSurface,
  },
  hidden: {
    /* скрытие без выгрузки из дерева: кнопка возвращается мгновенно */
    display: 'none',
  },
  publishStretch: {
    /* кнопка по всей ширине панели (x/BtnGr), высота по контенту —
       flex из Button убран (схлопывался при рендере с фото) */
    alignSelf: 'stretch',
  },
  panelFlow: {
    /* панель в потоке формы (не прилипает): pt 16 px 16 (x/BtnGr 226:1190);
       нижний запас даёт контент */
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  flex: {
    flex: 1,
  },
  dateSheetToolbar: {
    /* тулбар шторки после граббера SheetModal: ряд 44 + pb 8 (K-DS 224:987) */
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  dateTitleWrap: {
    /* Title (K-DS 224:997) центр ряда кнопок; граббер-зона уже в SheetModal */
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitleBox: {
    width: 255,
    alignItems: 'center',
  },
  sheetTitle: {
    ...rnTextStyle(TEXT.headline),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
    textAlign: 'center',
  },
  toolbarRow: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  picker: {
    /* системный барабан: центр модалки, системная высота виджета 216
       (колёсный UIDatePicker, нативная геометрия iOS); дизайн календаря
       в K не задан */
    alignSelf: 'center',
    height: 216,
  },
  dateApplyWrap: {
    /* x/BtnGr (K-DS 238:3948): pt 16 px 16; pb 8 — у обёртки шторки */
    paddingTop: 16,
    paddingHorizontal: 16,
  },
});