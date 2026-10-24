import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import ButtonIcon from '@/components/button-icon';
import Button from '@/components/button';
import Chip from '@/components/form/chip';
import FormField from '@/components/form/form-field';
import FormInput from '@/components/form/form-input';
import FormSelect from '@/components/form/form-select';
import PhotoAdd from '@/components/form/photo-add';
import SelectSheet from '@/components/form/select-sheet';
import ModalCard from '@/components/ui/modal-card';
import { showToast } from '@/components/ui/toast';
import { UI_ICONS } from '@/components/ui-icons';
import { SPECIES_CATALOG } from '@/data/catalog';
import { CURRENT_USER_ID, demoPlaceRepo, type PlaceDraft } from '@/data/repo';
import {
  clearPlaceCreateDraft,
  ensurePlaceCreateDraft,
  getPlaceCreateDraft,
  setPlaceCreateDraft,
} from '@/data/place-create-store';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Шаг 2 создания места — «Подробнее о месте»
 * (K 68:1991 пусто, 79:3699 заполнено, 87:4065 ошибка обязательного названия,
 * 243:10272 «Назад»). Спека: map-place-flows-mvp.md §3.2–§3.4.
 *
 * - шапка Coordinate (76:3687): pen 20 → шаг 1 (возврат без потери формы,
 *   §3.2); «Координаты: Точно» и при «Только я» (решение Дмитрия 22.10);
 *   «2 из 2 шага» справа;
 * - название* — единственное обязательное; валидация по нажатию «Опубликовать»
 *   (error 2px danger + «Это поле нужно заполнить», K 87:4065; скролл к полю);
 * - CTA «Опубликовать» во всех состояниях (спека §3.2, правка финальной
 *   сверки — «Дальше» пустой формы в макете устарело);
 * - «Какая рыба водится?» — шторка K 91:5899 (мульти, live-применение);
 *   «Как добраться?» — шторка K 91:6333 (радио: Подъезд к воде / Часть пути
 *   пешком / Не знаю — опечатка макета «Не знаню» исправлена Дмитрием 22.10);
 *   live-применение как снасть отчёта;
 * - фото — общий блок photo-add (206:9639/9709); тип места — чипы;
 * - выход (§3.3): назад между шагами без подтверждения; отмена — только
 *   с шага 1; публикация: loading, ошибка — модалка с повтором без потери
 *   формы, успех — replace в карточку места + тост «Место добавлено».
 */

/* «Как добраться» (K 91:6350): три утверждённых варианта */
const ACCESS_OPTIONS: { name: string }[] = [
  { name: 'Подъезд к воде' },
  { name: 'Часть пути пешком' },
  { name: 'Не знаю' },
];

export default function PlaceFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const nameFieldY = useRef(0);
  /* высоты текстовых полей: низ поля над клавиатурой + панель кнопки
     (ТЗ _x/26, задача 24.10); измеряются onLayout обёрток полей */
  const nameFieldH = useRef(0);
  const descriptionFieldY = useRef(0);
  const descriptionFieldH = useRef(0);

  /* прямой вход (deep link) без шага 1 — черновик создаётся с дефолтой
     точкой Демо-центра ДО чтения (дефект 24.10: getPlaceCreateDraft()
     давал null — «editPlaceId of null», LogBox); рабочий сценарий всегда
     начинается с шага 1: черновик уже есть, ensure не переизлучает */
  const [, setVersion] = useState(0);
  useMemo(() => {
    ensurePlaceCreateDraft({ coordinate: { latitude: 58.05, longitude: 38.35 } });
    return null;
  }, []);
  /* порядок: режим определяется ДО эффектов — черновик (карта префиллит
     его до перехода) доступен на первом рендере */
  const draft = getPlaceCreateDraft()!;
  const isEdit = draft.editPlaceId != null;
  const publishLabel = isEdit ? 'Сохранить изменения' : 'Опубликовать';
  /* назад из шага 2 возвращает шторку шага 1 и в режиме редактирования
     (баг Дмитрия 24.10: «нажал назад — шторка пропала»; ранее cleanup гасил
     edit-черновик при любом снятии формы — сценарий Дмитрия 23.10).
     Отмена редактирования — только с шага 1: стрелка/свайп шторки ведёт в
     точку решения с clearPlaceCreateDraft; публикация очищает до replace. */

  const [name, setName] = useState(draft.name);
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  /* клавиатура: кнопка висит НАД клавиатурой при фокусе поля ввода
     (прецедент отчёта, K 87:4145: поле при фокусе всегда видно) */
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputFocus, setInputFocus] = useState<'name' | 'description' | null>(null);
  /* отражение keyboardHeight для синхронного доступа из onFocus (state
     обновляется асинхронно после события) */
  const keyboardHeightRef = useRef(0);
  /* поле, тапом вызванное открытие клавиатуры: при keyboardWillShow
     скроллится сразу с высотой события (onFocus приходит раньше) */
  const pendingFieldRef = useRef<{ y: number; h: number } | null>(null);
  /* текущий offset скролла (onScroll, ref — без перерисовок): скролл к полю
     только если его низ перекрыт видимой областью */
  const scrollOffsetRef = useRef(0);
  const { height: screenH } = useWindowDimensions();
  /* подскролл текстового поля над клавиатурой + панель кнопки (72 = pt 16 +
     кнопка 48 + pb 8 — текущая панельная константа резерва); y/h —
     координаты поля в контенте (onLayout)
  */
  const scrollFieldAboveKeyboard = useCallback((y: number, h: number, kb: number) => {
    /* scrollTo — АБСОЛЮТНЫЙ offset (дефект 24.10: передавал добавку при
       открытом клавиатурном подскролле — «показал верхушку»); target =
       низ поля − дно видимой зоны (screenH − kb − 80: панель 72 + зазор 8);
       скролл только когда низ поля прикрыт (учитывая текущий offset) */
    const target = y + h - (screenH - kb - 80);
    if (y + h - scrollOffsetRef.current - (screenH - kb - 80) > 0) {
      scrollViewRef.current?.scrollTo({ y: Math.round(target), animated: true });
    }
  }, [screenH]);
  const focusField = (y: number, h: number) => {
    pendingFieldRef.current = { y, h };
    if (keyboardHeightRef.current > 0) {
      /* клавиатура уже открыта (переключение поля к полю): сразу */
      scrollFieldAboveKeyboard(y, h, keyboardHeightRef.current);
    }
  };
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      keyboardHeightRef.current = e.endCoordinates.height;
    });
    const didHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      keyboardHeightRef.current = 0;
      pendingFieldRef.current = null;
    });
    return () => {
      show.remove();
      didHide.remove();
    };
  }, []);

  /* подскролл ПОСЛЕ commit'а reserve-контента (deps: состояние клавиатуры/
     фокуса): scrollTo внутри 60-мс таймера гонялся с рендером reserve —
     contentSize менялся после скролла и offset сжимался (воспроизведено
     24.10). Эффект выполняется после apply paddingBottom — maxOffset верен. */
  useEffect(() => {
    const field = pendingFieldRef.current;
    if (field != null && inputFocus != null && keyboardHeight > 0) {
      pendingFieldRef.current = null;
      scrollFieldAboveKeyboard(field.y, field.h, keyboardHeight);
    }
  }, [keyboardHeight, inputFocus, scrollFieldAboveKeyboard]);

  const patch = (next: Partial<PlaceCreatePatch>) => {
    const current = getPlaceCreateDraft();
    if (current == null) return;
    setPlaceCreateDraft({ ...current, ...next });
    setVersion((v) => v + 1);
  };
  /* имя поля держится локально (валидация/скролл; черновик синхронен) */
  const patchName = (t: string) => {
    setName(t);
    patch({ name: t });
    if (nameError && t.trim() !== '') setNameSubmitted(false);
  };
  const nameError = nameSubmitted && name.trim() === '';

  const accessValue = draft.access ?? null;
  const publish = () => {
    if (submitting) return;
    /* валидация обязательного названия по нажатию (87:4065) */
    if (name.trim() === '') {
      setNameSubmitted(true);
      scrollViewRef.current?.scrollTo({ y: Math.max(0, nameFieldY.current - 120), animated: true });
      return;
    }
    setSubmitting(true);
    const current = getPlaceCreateDraft();
    if (current == null) {
      setSubmitting(false);
      return;
    }
    const placeDraft: PlaceDraft = {
      coordinate: current.coordinate,
      privacy: current.privacy,
      accuracy: current.accuracy,
      name: name.trim(),
      placeType: current.placeType,
      fishSpecies: [...current.fishSpecies],
      access: current.access,
      description: current.description || undefined,
      photos: [...current.photos],
    };
    void (isEdit
      ? demoPlaceRepo.updatePlace(draft.editPlaceId as string, placeDraft, CURRENT_USER_ID)
      : demoPlaceRepo.createPlace(placeDraft)
    )
      .then((place) => {
        if (place == null || place === 'forbidden') {
          setErrorModal(true);
          return;
        }
        clearPlaceCreateDraft();
        /* успех (§3.4): карточка места + тост — replace: «Назад» — на карту;
           тост редактирования — «Изменения сохранены» (journal.md §6) */
        router.replace(`/place/${place.id}`);
        showToast(isEdit ? 'Изменения сохранены' : 'Место добавлено');
      })
      .catch(() => {
        setErrorModal(true);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <View style={styles.container}>
      {/* тулбар (69:2076): назад слева → шаг 1 (без подтверждения, §3.3),
          заголовок по центру */}
      <View style={[styles.toolbar, { height: insets.top + 60 }]}>
        <View style={[styles.toolbarButtonLeft, { top: insets.top + 8 }]}>
          <ButtonIcon icon="chevronLeft" type="toolbar" onPress={() => router.back()} accessibilityLabel="К шагу 1" />
        </View>
        <View style={[styles.toolbarTitleWrap, { top: insets.top + 8, bottom: 8 }]}>
          <View style={styles.toolbarTitleBox}>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              {isEdit ? 'Редактирование места' : 'Подробнее о месте'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(e) => (scrollOffsetRef.current = e.nativeEvent.contentOffset.y)}
        /* форма короткая — кнопка прижата к нижнему краю (space-between,
           Дмитрий 22.10); контент длинный — кнопка в потоке после контента;
           при фокусе поля — резерв контента = клавиатура + панель (прецедент
           отчёта: кнопка скрывается, панель над клавиатурой её заменяет) */
        contentContainerStyle={[
          { flexGrow: 1, justifyContent: 'space-between' },
          inputFocus != null && keyboardHeight > 0
            ? { paddingBottom: keyboardHeight + 72 }
            : { paddingBottom: 16 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* поля формы — один ребёнок flex-контейнера */}
        <View>
        {/* шапка Coordinate (76:3687): pen → шаг 1; border-subtle, h 32 */}
        <View style={styles.coordRowWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Изменить координаты — шаг 1"
            onPress={() => router.back()}
            style={styles.coordHeader}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d={UI_ICONS.pen.d} fill={Colors.light.text} />
            </Svg>
            <Text style={styles.coordText} numberOfLines={1}>
              {/* при «Только я» те же точные координаты (решение Дмитрия 22.10) */}
              Координаты: {draft.privacy === 'public' ? (draft.accuracy === 'approximate' ? 'Примерно' : 'Точно') : 'Точно'}
            </Text>
            <Text style={styles.coordStep}>2 из 2 шага</Text>
          </Pressable>
        </View>

        {/* Название * (69:2264) — единственное обязательное */}
        <View onLayout={(e) => (nameFieldY.current = e.nativeEvent.layout.y, nameFieldH.current = e.nativeEvent.layout.height)}>
          <FormField label="Название" required errorText={nameError ? 'Это поле нужно заполнить' : undefined}>
            <FormInput
              value={name}
              onChangeText={patchName}
              placeholder=" "
              editable={!submitting}
              error={nameError}
              onFocus={() => {
                setInputFocus('name');
                focusField(nameFieldY.current, nameFieldH.current);
              }}
              onBlur={() => setInputFocus(null)}
            />
          </FormField>
        </View>

        {/* Тип места (71:3075): «Дикое / бесплатное» по умолчанию (68:1991) */}
        <FormField label="Тип места">
          <View style={styles.chipRow}>
            <Chip
              label="Дикое / бесплатное"
              selected={draft.placeType === 'wild'}
              flex
              onPress={() => patch({ placeType: 'wild' })}
            />
            <Chip label="Платное" selected={draft.placeType === 'paid'} flex onPress={() => patch({ placeType: 'paid' })} />
          </View>
        </FormField>

        {/* Какая рыба водится? (71:3114) — шторка K 91:5899 */}
        <FormField label="Какая рыба водится?">
          <FormSelect
            value={draft.fishSpecies.length > 0 ? draft.fishSpecies.join(', ') : null}
            placeholder=" "
            icon="chevronDown"
            disabled={submitting}
            focused={speciesOpen}
            onPress={() => setSpeciesOpen(true)}
          />
        </FormField>

        {/* Как добраться? (71:3120) — радио-шторка K 91:6350 */}
        <FormField label="Как добраться?">
          <FormSelect
            value={accessValue}
            placeholder=" "
            icon="chevronDown"
            disabled={submitting}
            focused={accessOpen}
            onPress={() => setAccessOpen(true)}
          />
        </FormField>

        {/* Краткое описание (71:3145) — Textarea 120 */}
        <View onLayout={(e) => (descriptionFieldY.current = e.nativeEvent.layout.y, descriptionFieldH.current = e.nativeEvent.layout.height)}>
          <FormField label="Краткое описание (необязательно)">
            <FormInput
              value={draft.description}
              onChangeText={(t) => patch({ description: t })}
              placeholder=" "
              multiline
              editable={!submitting}
              onFocus={() => {
                setInputFocus('description');
                focusField(descriptionFieldY.current, descriptionFieldH.current);
              }}
              onBlur={() => setInputFocus(null)}
            />
          </FormField>
        </View>

        {/* фото — общий блок (73:3170); реальные URI → createPlace */}
        <PhotoAdd
          photos={draft.photos}
          onChange={(next) => patch({ photos: next })}
          disabled={submitting}
          onAfterAdd={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 60)}
        />

        </View>

        {/* кнопка (Дмитрий 22.10): короткая форма → у нижнего края
            (space-between контейнера), длинная — в потоке; home-зона.
            НЕ выгружается: при фокусе поля только скрывается (панель над
            клавиатурой её заменяет — прецедент отчёта) */}
        <View
          style={[
            styles.publishStretch,
            { paddingBottom: 8 + insets.bottom },
            inputFocus != null && keyboardHeight > 0 && styles.hiddenKb,
          ]}>
          <Button label={publishLabel} mode="primary" appearance="accent" loading={submitting} onPress={submitting ? undefined : publish} />
        </View>
      </ScrollView>

      {/* панель при фокусе поля ввода: над клавиатурой (K 87:4145), 1:1
          прецедент отчёта: кнопка в контейнере с фоном, нижний запас 8;
          привязка к inputFocus: пикер фото её не прячет */}
      {inputFocus != null && keyboardHeight > 0 && (
        <View style={[styles.panelKeyboard, { paddingBottom: 8, bottom: keyboardHeight }]}>
          <Button label={publishLabel} mode="primary" appearance="accent" loading={submitting} onPress={submitting ? undefined : publish} />
        </View>
      )}

      {/* шторка видов (K 91:6113 + поиск K 434:4402): мульти, live-применение */}
      <SelectSheet
        visible={speciesOpen}
        title="Какая рыба водится?"
        items={SPECIES_CATALOG}
        categories={['Все', 'Хищная', 'Мирная']}
        mode="multi"
        searchable
        initial={draft.fishSpecies}
        onApply={(sel) => patch({ fishSpecies: sel })}
        onClose={() => setSpeciesOpen(false)}
      />

      {/* шторка доступа (K 91:6350): радио, кнопок нет, тап = выбор */}
      <SelectSheet
        visible={accessOpen}
        title="Как добраться"
        items={ACCESS_OPTIONS}
        mode="single"
        initial={draft.access != null ? [draft.access] : []}
        fullHeight={false}
        onApply={(sel) => patch({ access: sel[0] })}
        onClose={() => setAccessOpen(false)}
      />

      {/* ошибка публикации (прецедент отчёта 225:6113): форма не теряется */}
      <ModalCard
        visible={errorModal}
        icon="warn"
        title={isEdit ? 'Не удалось сохранить изменения' : 'Не удалось опубликовать место'}
        body={'Ваши данные сохранены в форме.\nПопробуйте ещё раз.'}
        actions={[
          { label: 'Вернуться к форме', onPress: () => setErrorModal(false) },
          {
            label: 'Повторить',
            onPress: () => {
              setErrorModal(false);
              publish();
            },
          },
        ]}
        onClose={() => setErrorModal(false)}
      />
    </View>
  );
}

/** поля шага 2 (черновик места); пишутся в чёрновик сразу */
type PlaceCreatePatch = {
  name?: string;
  placeType?: 'wild' | 'paid';
  fishSpecies?: string[];
  access?: string;
  description?: string;
  photos?: string[];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    /* фон формы: --color-surface-default (K 68:1991 root bg) */
    backgroundColor: Colors.light.cardSurface,
  },
  toolbar: {
    /* Toolbar - Top - iPhone: кнопки top insets+8 (правило slice 4) */
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  toolbarButtonLeft: {
    position: 'absolute',
    left: 16,
    overflow: 'hidden',
  },
  toolbarTitleWrap: {
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
  coordRowWrap: {
    paddingVertical: 8, /* Coordinate (70:3073): py 8 */
    paddingHorizontal: 16,
  },
  coordHeader: {
    /* header (76:3687): h 32, border-subtle, r12, gap 4 */
    height: 32,
    borderWidth: 1,
    borderColor: Colors.light.borderSubtle,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coordText: {
    ...rnTextStyle(TEXT.bodyS),
    fontFamily: FONT_FAMILY,
    color: Colors.light.text,
    flex: 1,
  },
  coordStep: {
    ...rnTextStyle(TEXT.bodyS),
    fontFamily: FONT_FAMILY,
    color: Colors.light.textSecondary,
    marginLeft: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },
  publishStretch: {
    /* кнопка по всей ширине (x/BtnGr 73:3511); высота по контенту —
       flex из Button убран (схлопывался при рендере с фото, отчёт реализации) */
    alignSelf: 'stretch',
    paddingTop: 16, /* x/BtnGr: pt 16 */
    paddingHorizontal: 16,
  },
  hiddenKb: {
    /* скрытие без выгрузки из дерева (прецедент отчёта) */
    display: 'none',
  },
  panelKeyboard: {
    /* absolute — только над клавиатурой (bottom + pb 8 в JSX); панель в тон
       экрана: --color-surface-default (контейнер с фоном, прецедент отчёта) */
    position: 'absolute',
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.cardSurface,
  },
});