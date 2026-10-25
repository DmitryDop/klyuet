import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type KeyboardEvent,
  type ViewInstance,
  /* RN 0.88 (Strict TypeScript API): ref — ScrollViewInstance (миграция SDK 58) */
  type ScrollViewInstance,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useLocalSearchParams,
  useRouter,
  usePreventRemove /* SDK 58: beforeRemove удалён — блокировка через usePreventRemove (reports.md §6) */,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ButtonIcon from '@/components/button-icon';
import Button from '@/components/button';
import Chip from '@/components/form/chip';
import FormField from '@/components/form/form-field';
import FormInput from '@/components/form/form-input';
import FormSelect from '@/components/form/form-select';
import PhotoAdd from '@/components/form/photo-add';
import SelectSheet from '@/components/form/select-sheet';
import SheetModal from '@/components/ui/sheet-modal';
import ModalCard from '@/components/ui/modal-card';
import { showToast } from '@/components/ui/toast';
import { SPECIES_CATALOG, TACKLE_CATALOG } from '@/data/catalog';
import { CURRENT_USER_ID, demoPlaceRepo } from '@/data/repo';
import type { CatchStatus, Place } from '@/data/types';
import { formatRuDate, isFutureDate, isoDate, isoDateShifted } from '@/logic/dates';
import type { Palette } from '@/constants/theme';
import { useTheme, useThemeMode } from '@/data/theme-store';
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
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const themeMode = useThemeMode();
  const styles = makeStyles(palette);

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
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);
  const speciesFieldY = useRef(0);
  const baitFieldRef = useRef<ViewInstance>(null);
  const commentFieldRef = useRef<ViewInstance>(null);

  /* Все измерения — в координатах окна, включая keyboard.screenY.
     Команда отправляется только при готовых панели и диапазоне контента. */
  type InputField = 'bait' | 'comment';
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputFocus, setInputFocus] = useState<InputField | null>(null);
  const formRef = useRef<ViewInstance>(null);
  const keyboardPanelRef = useRef<ViewInstance>(null);
  const focusedFieldRef = useRef<{ id: InputField; view: ViewInstance } | null>(null);
  const keyboardFrameRef = useRef<KeyboardEvent['endCoordinates'] | null>(null);
  const scrollRequestRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const blurFrameRef = useRef<number | null>(null);
  const lastScrollTargetRef = useRef<number | null>(null);
  const fieldScrollPausedRef = useRef(false);

  const cancelFieldScroll = useCallback(() => {
    scrollRequestRef.current += 1;
    if (scrollFrameRef.current != null) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = null;
  }, []);

  const queueFieldScroll = useCallback(() => {
    cancelFieldScroll();
    const request = scrollRequestRef.current;
    if (fieldScrollPausedRef.current || focusedFieldRef.current == null || keyboardFrameRef.current == null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const focused = focusedFieldRef.current;
      const keyboard = keyboardFrameRef.current;
      const scroll = scrollViewRef.current;
      const content = scroll?.getInnerViewRef();
      const panel = keyboardPanelRef.current;
      if (focused == null || keyboard == null || scroll == null || content == null || panel == null) return;

      void Promise.all([scroll, focused.view, content, panel].map((view) =>
        new Promise<{ y: number; height: number }>((resolve) => {
          view.measureInWindow((_x, y, _width, height) => resolve({ y, height }));
        }),
      )).then(([viewport, field, body, actionPanel]) => {
        /* Фокус, frame клавиатуры или layout могли измениться за время
           асинхронных измерений. Старый запрос больше не имеет права скроллить. */
        if (request !== scrollRequestRef.current || focused !== focusedFieldRef.current || keyboard !== keyboardFrameRef.current) return;
        if ([viewport, field, body, actionPanel].some((frame) => frame.height <= 0)) return;
        /* Не используем старую позицию панели до применения нового bottom. */
        if (Math.abs(actionPanel.y + actionPanel.height - keyboard.screenY) > 1) return;

        const top = viewport.y;
        const bottom = Math.min(viewport.y + viewport.height, keyboard.screenY, actionPanel.y) - 8;
        if (bottom <= top) return;
        const offset = viewport.y - body.y;
        const fieldY = field.y - body.y;
        let target = offset;
        if (field.height > bottom - top) {
          /* На компактном экране целая обёртка может не поместиться:
             показываем её начало; TextInput сохраняет внутренний скролл. */
          target = fieldY;
        } else if (field.y + field.height > bottom) {
          target = fieldY + field.height - (bottom - top);
        } else if (field.y < top) {
          target = fieldY;
        }
        target = Math.max(0, Math.ceil(target));
        const maxOffset = Math.max(0, body.height - viewport.height);
        /* Нативный contentSize ещё может быть прежним. Следующие
           onContentSizeChange/onLayout повторят измерение без таймера. */
        if (target > maxOffset + 1) return;
        target = Math.min(target, maxOffset);
        if (Math.abs(target - offset) <= 1 || (lastScrollTargetRef.current != null && Math.abs(target - lastScrollTargetRef.current) <= 1)) return;
        lastScrollTargetRef.current = target;
        scroll.scrollTo({ y: target, animated: true });
      });
    });
  }, [cancelFieldScroll]);

  const focusField = (id: InputField, view: ViewInstance | null) => {
    if (blurFrameRef.current != null) cancelAnimationFrame(blurFrameRef.current);
    blurFrameRef.current = null;
    focusedFieldRef.current = view == null ? null : { id, view };
    setInputFocus(id);
    fieldScrollPausedRef.current = false;
    queueFieldScroll();
  };
  const blurField = (id: InputField) => {
    if (focusedFieldRef.current?.id !== id) return;
    focusedFieldRef.current = null;
    cancelFieldScroll();
    /* При переходе между полями не убираем резерв на промежуточном blur. */
    blurFrameRef.current = requestAnimationFrame(() => {
      blurFrameRef.current = null;
      if (focusedFieldRef.current == null) {
        setInputFocus(null);
        lastScrollTargetRef.current = null;
      }
    });
  };
  const updateKeyboardFrame = useCallback((frame: KeyboardEvent['endCoordinates']) => {
    if (keyboardFrameRef.current == null) fieldScrollPausedRef.current = false;
    keyboardFrameRef.current = frame;
    cancelFieldScroll();
    formRef.current?.measureInWindow((_x, y, _width, height) => {
      if (keyboardFrameRef.current !== frame) return;
      const overlap = Math.max(0, Math.min(height, y + height - frame.screenY));
      if (overlap === 0 || frame.height === 0) {
        keyboardFrameRef.current = null;
        return; /* закрытие завершит keyboardDidHide */
      }
      setKeyboardHeight(overlap);
      queueFieldScroll();
    });
  }, [cancelFieldScroll, queueFieldScroll]);

  useEffect(() => {
    const change = (event: KeyboardEvent) => updateKeyboardFrame(event.endCoordinates);
    const hide = () => {
      keyboardFrameRef.current = null;
      lastScrollTargetRef.current = null;
      cancelFieldScroll();
    };
    const subscriptions = [
      Keyboard.addListener('keyboardWillShow', change),
      Keyboard.addListener('keyboardWillChangeFrame', change),
      Keyboard.addListener('keyboardDidShow', change),
      Keyboard.addListener('keyboardWillHide', hide),
      Keyboard.addListener('keyboardDidHide', () => {
        hide();
        setKeyboardHeight(0);
      }),
    ];
    const current = Keyboard.metrics();
    if (current != null) updateKeyboardFrame(current);
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      keyboardFrameRef.current = null;
      cancelFieldScroll();
      if (blurFrameRef.current != null) cancelAnimationFrame(blurFrameRef.current);
    };
  }, [cancelFieldScroll, updateKeyboardFrame]);

  useLayoutEffect(() => {
    queueFieldScroll();
  }, [keyboardHeight, inputFocus, queueFieldScroll]);

  const pauseFieldScroll = () => {
    /* Явный скролл валидации/фото и жест пользователя имеют приоритет. */
    fieldScrollPausedRef.current = true;
    cancelFieldScroll();
    lastScrollTargetRef.current = null;
  };

  const onFormLayout = () => {
    const frame = keyboardFrameRef.current;
    if (frame != null) updateKeyboardFrame(frame);
    queueFieldScroll();
  };

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
     сразу.
     SDK 58 (expo-router, гайд миграции 57→58): событие beforeRemove
     удалено — блокировка через usePreventRemove: условие отрисовано как
     проп (ref не реагирует), повтор блокированного перехода — repeat().
     Успешная публикация/сохранение и «Выйти» сначала делают форму чистой
     (baseline = form → dirty false), затем повторяют переход. */
  const repeatExitRef = useRef<(() => void) | null>(null);
  usePreventRemove(!loading && dirty, ({ repeat }) => {
    setExitModal(true);
    repeatExitRef.current = repeat;
  });

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
      pauseFieldScroll();
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
       replace — форма не должна остаться в истории. Служебный переход не
       должен спрашивать подтверждение (§6): форма становится чистой
       (baseline = submitted) ДО replace — usePreventRemove отпускает. */
    setBaseline({ ...form });
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
      mode="primary" appearance="accent"
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
        <Button label="Повторить" mode="primary" appearance="accent" flex onPress={() => retryLoad()} />
      </View>
    );
  }

  /* состояние панели уже принято (панель над клавиатурой, 87:4145) */

  return (
    <View ref={formRef} onLayout={onFormLayout} style={styles.container}>
      {/* тулбар: назад + (создание/редактирование). Toolbar - Top - iPhone:
          py 8 px 16; заголовок — всегда центр панели; высота insets.top+60,
          кнопки absolute на top insets.top+8 (правило slice 4) */}
      <View style={[styles.toolbar, { height: insets.top + 60 }]}>
        <View style={[styles.toolbarButtonLeft, { top: insets.top + 8 }]}>
          <ButtonIcon
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
        scrollEventThrottle={16}
        onLayout={queueFieldScroll}
        onContentSizeChange={queueFieldScroll}
        onScrollBeginDrag={pauseFieldScroll}
        onMomentumScrollEnd={() => { lastScrollTargetRef.current = null; }}
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
        <View ref={baitFieldRef} collapsable={false} onLayout={queueFieldScroll}>
          <FormField label="Приманка (необязательно)">
            <FormInput
              value={form.bait}
              onChangeText={(t) => patchForm({ bait: t })}
              placeholder="" /* макет: пустое поле (placeholder=Off) */
              editable={!submitting}
              onFocus={() => focusField('bait', baitFieldRef.current)}
              onBlur={() => blurField('bait')}
            />
          </FormField>
        </View>

        {/* Что происходило? (206:9637) — Textarea 120 (K-DS 227:6352) */}
        <View ref={commentFieldRef} collapsable={false} onLayout={queueFieldScroll}>
          <FormField label="Что происходило?">
            <FormInput
              value={form.comment}
              onChangeText={(t) => patchForm({ comment: t })}
              placeholder=""
              multiline
              editable={!submitting}
              onFocus={() => focusField('comment', commentFieldRef.current)}
              onBlur={() => blurField('comment')}
            />
          </FormField>
        </View>

        {/* фото-превью (206:9709): только при наличии; px 16, py 8 */}
        {/* фото: общий блок (photo-add.tsx, задача _x/18.md) — пикер,
            превью с удалением и dashed-кнопка; доскрол CTA после добавления */}
        <PhotoAdd
          photos={form.photos}
          onChange={(next) => patchForm({ photos: next })}
          disabled={submitting}
          onAfterAdd={() => {
            pauseFieldScroll();
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 60);
          }}
        />

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
        <View ref={keyboardPanelRef} onLayout={queueFieldScroll} style={[styles.panel, { paddingBottom: 8, bottom: keyboardHeight }]}>
          {publishButton}
        </View>
      )}

      {/* шторка видов (K 91:6113 + поиск K 434:4402): мульти, с чипсами */}
      <SelectSheet
        visible={speciesOpen}
        title="Вид рыбы"
        items={SPECIES_CATALOG}
        categories={['Все', 'Хищная', 'Мирная']}
        mode="multi"
        searchable
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
              <ButtonIcon
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
            /* системный пикер по теме (согласование Дмитрия 25.10) */
            themeVariant={themeMode}
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
              mode="primary" appearance="accent"
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
              /* discarding: форма больше не содержит несохранённых данных
                 (reports.md §6) → usePreventRemove отпускает, repeat() —
                 повтор заблокированного перехода (гайд SDK 58) */
              setBaseline({ ...form });
              repeatExitRef.current?.();
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

/* (SDK 58: beforeRemove-гвард заменён usePreventRemove — тип события больше не нужен) */

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    /* фон экрана формы: --color-surface-default (K 206:9625 root bg) */
    backgroundColor: palette.cardSurface,
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
    color: palette.textSecondary,
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
    color: palette.text,
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
    color: palette.text,
  },
  placeSubtitle: {
    ...rnTextStyle(TEXT.caption),
    fontFamily: FONT_FAMILY,
    color: palette.textSecondary,
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
  panel: {
    /* absolute-режим — только над клавиатурой (bottom в JSX);
       панель в тон экрана: --color-surface-default */
    position: 'absolute',
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: palette.cardSurface,
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
    color: palette.text,
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