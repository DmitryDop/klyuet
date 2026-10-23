import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  /* RN 0.88 (Strict TypeScript API): ref — TextInputInstance (миграция SDK 58) */
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';

import {
  cameraRegion,
  distanceKm,
  formatDistanceKm,
  searchPlaces,
  type GeoSearchResult,
} from '@/logic/geosearch';
import { setPendingSearchTarget } from '@/data/map-search-store';
import { FAKE_USER_LOCATION } from '@/data/user-location';
import { UI_ICONS } from '@/components/ui-icons';
import { Colors } from '@/constants/theme';
import { FONT_FAMILY, rnTextStyle, TEXT } from '@/constants/typography';

/**
 * Экран географического поиска населённых пунктов (ТЗ _x/20.md).
 * Полноэкранный push с карты; карта под ним остаётся смонтированной,
 * состояние (центр/масштаб/фильтры) не трогается (§9).
 * Макеты K: 422:4057 «Placeholder» (пустое поле: граница 2px фокуса, крестик
 * скрыт), 426:9606 «Text filled» (поле + результаты), 432:11753 «Hide
 * Keyboard» (клавиатура скрыта: граница 1px --color-border-control, текст
 * и результаты сохранены; поле 40px — K-DS Search; иконка кнопки справа —
 * close 71:573, имя слоя layer-group в макете устарело, рендер — крестик).
 * Debounce 300 мс (§6); свежий ответ всегда выигрывает у устаревшего
 * (последовательность запросов + AbortController). Список не ограничен
 * видимой областью карты (§6); поиск по местам/отчётам не ведётся (§6).
 * Расстояния — от фейк-геопозиции (user-location.ts): разрешение на
 * геолокацию не запрашивается (§7).
 * «Ничего не найдено» (§4.4), ошибка сети и «Повторить» (§4.5) — макетов в K
 * нет, стилизация минимальная из токенов; на уточнении Дмитрия.
 */

type Status = 'idle' | 'loading' | 'ready' | 'error';

const DEBOUNCE_MS = 300;

/* Строка в списке: py 2 (3xs), внутренняя колонка px16 py8 — высота 60
   (K 426:9615/9617) */
const CELL_OUTER = 2;
const CELL_INNER = 8;

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [focused, setFocused] = useState(false);

  const inputRef = useRef<TextInputInstance>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      /* размонтирование: погасить отложенный ввод и активный запрос */
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  const runSearch = useCallback((q: string) => {
    const seq = ++seqRef.current;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    searchPlaces(q, { bias: FAKE_USER_LOCATION, signal: controller.signal })
      .then((found) => {
        /* свежий запрос выигрывает: seq — последнее запущенное выполнение */
        if (seq !== seqRef.current) {
          return;
        }
        setResults(found);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (seq !== seqRef.current || (e as Error).name === 'AbortError') {
          /* устаревший запрос или отмена новым вводом — молча (§6) */
          return;
        }
        setStatus('error'); /* сетевую ошибку не подменяем «не найдено» (§4.5) */
      });
  }, []);

  /* ввод: debounce 300 мс (§6); пустая строка — idle без запроса (§4.1) */
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!text.trim()) {
      seqRef.current++; /* ответ уже в пути — при возврате будет отброшен */
      abortRef.current?.abort();
      setResults([]);
      setStatus('idle');
      return;
    }
    timerRef.current = setTimeout(() => runSearch(text), DEBOUNCE_MS);
  };

  const handleClear = () => {
    handleQueryChange('');
    inputRef.current?.focus(); /* крестик очищает запрос, поиск не закрывает (§4.2) */
  };

  const handleRetry = useCallback(() => {
    const q = query.trim();
    if (!q) {
      return;
    }
    setStatus('loading');
    runSearch(q); /* повтор — без debounce, запрос уже отложен пользователем */
  }, [query, runSearch]);

  /* выбор результата: коммит цели → карта анимирует камеру на фокусе (§8) */
  const select = (result: GeoSearchResult) => {
    const region = cameraRegion(result);
    setPendingSearchTarget({
      coordinate: result.coordinate,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
      name: result.name,
    });
    Keyboard.dismiss();
    router.back();
  };

  /* расстояния — по прямой в километрах (§7); позиция — фейк-геопозиция.
     У первого результата пояснение «от вас» (§4.2) — задаёт ритм списка. */
  const distanceLabel = (result: GeoSearchResult, index: number): string => {
    const km = formatDistanceKm(distanceKm(FAKE_USER_LOCATION, result.coordinate));
    return index === 0 ? `от вас ${km}` : km;
  };

  const showList = status === 'ready' && results.length > 0;
  /* потолок списка: до края экрана; прокрутка работает только при
     ограниченной высоте FlatList (панель-wrap по контенту вокруг него) */
  const listMaxHeight = screenH - insets.top - 16 - 88 - 16 - 8 - 16;

  return (
    <View style={styles.container}>
      {/* Search_box (K 426:9610): панель Search_content — radius 24, py 16,
          зазор 16 сверху; safe area — прецедент тулбаров экранов (insets.top) */}
      <View style={[styles.box, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.fieldPanel, styles.surface]}>
          <View style={styles.searchRow}>
            {/* поле 40px: без фокуса при скрытой клавиатуре — 1px
                border-control (K 432:11759), в фокусе — 2px focus-ring */}
            <View
              style={[
                styles.field,
                focused ? styles.fieldFocus : styles.fieldIdle,
              ]}>
              <View style={styles.iconBox}>
                <PathIcon name="magnifyingGlass" size={20} fill={Colors.light.text} />
              </View>
              <TextInput
                ref={inputRef}
                style={[styles.input, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.body) }]}
                value={query}
                onChangeText={handleQueryChange}
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={() => Keyboard.dismiss()}
                accessibilityLabel="Поиск населённого пункта"
              />
              {/* крестик внутри поля: очистка без закрытия поиска (§4.2);
                  в пустом макете (K 422:4057) крестика нет */}
              {query.length > 0 && (
                <Pressable accessibilityLabel="Очистить поиск" onPress={handleClear}>
                  <View style={styles.iconBox}>
                    <PathIcon name="circleXmark" size={20} fill={Colors.light.text} />
                  </View>
                </Pressable>
              )}
            </View>
            {/* кнопка закрытия поиска (§4.1): крестик close 71:573 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть поиск"
              onPress={() => router.back()}
              style={styles.closeBtn}>
              <PathIcon name="close" size={24} fill={Colors.light.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* пустой поиск (§4.1) и загрузка (короткий debounce — без индикатора,
          список не моргает): пустое пространство */}
      {(status === 'idle' || status === 'loading') && <View style={styles.spacer} />}

      {/* готово, пусто — компактное текстовое состояние (§4.4) */}
      {status === 'ready' && results.length === 0 && (
        <View style={styles.statusTextWrap}>
          <Text style={[styles.statusText, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.bodyS) }]}>
            Ничего не найдено
          </Text>
        </View>
      )}

      {/* ошибка получения — не «не найдено» (§4.5), повтор без потери текста */}
      {status === 'error' && (
        <View style={styles.statusTextWrap}>
          <Text style={[styles.statusText, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.bodyS) }]}>
            Не удалось получить результаты
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Повторить" onPress={handleRetry}>
            <Text style={[styles.retry, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.labelL) }]}>
              Повторить
            </Text>
          </Pressable>
        </View>
      )}

      {/* результаты (K 426:9613/9614): панель surface radius 24, py 8,
          клетки px16, разделитель в отступе 16 */}
      {showList && (
        <View style={styles.listWrap}>
          <View style={[styles.listPanel, styles.surface]}>
            <FlatList
              style={{ maxHeight: listMaxHeight }}
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => select(item)}>
                  <View style={styles.cell}>
                    <View style={styles.cellText}>
                      <Text
                        style={[styles.cellName, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.body) }]}
                        numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.cellRegion, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.caption) }]}
                        numberOfLines={1}>
                        {item.region}
                      </Text>
                    </View>
                    <View style={styles.cellRight}>
                      <Text
                        style={[styles.cellDistance, { fontFamily: FONT_FAMILY, ...rnTextStyle(TEXT.bodyS) }]}
                        numberOfLines={1}>
                        {distanceLabel(item, index)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )}
              ItemSeparatorComponent={CellSeparator}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            />
          </View>
        </View>
      )}
    </View>
  );
}

/* Разделитель списка (K 426:9595): линия 1px в отступе 16, px16, rhythm 2/1 */
function CellSeparator() {
  return <View style={styles.separator} />;
}

/* Иконки поля: fill — токены, не хардкод; мастер K-DS magnifying-glass 73:648 */
function PathIcon({ name, size, fill }: { name: string; size: number; fill: string }) {
  const entry = UI_ICONS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={entry.d} fill={fill} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  box: {
    paddingHorizontal: 16,
  },
  /* Search_content (K 426:9611): radius 24, py 16, поверхность #f8f9f5 */
  fieldPanel: {
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingVertical: 16,
  },
  searchRow: {
    /* Search (426:9612): px16 py8, gap 8 (spacing/xs) */
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  field: {
    /* поле 40px (dimensions/size/xl, K-DS Search 429:10650) */
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.cardSurface,
  },
  fieldFocus: {
    /* State Focus: dimensions/stroke/2, --color-focus-ring (K 426:9612) */
    borderWidth: 2,
    borderColor: Colors.light.focusRing,
  },
  fieldIdle: {
    /* без фокуса (K 432:11759): dimensions/stroke/1, --color-border-control */
    borderWidth: 1,
    borderColor: Colors.light.borderControl,
  },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: Colors.light.text,
    minHeight: 40,
    paddingVertical: 0,
  },
  closeBtn: {
    /* button-ui слота Search: 44×40, белый, radius 12 (K 426:9612; 223:918) */
    width: 44,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    backgroundColor: Colors.light.cardSurface, /* --color-surface-default #f8f9f5 */
  },
  spacer: {
    flex: 1,
  },
  /* rezultat (K 426:9613): px16 снаружи; панель list 9614: py 8;
     высота панели — по контенту FlatList, потолок — экран */
  listWrap: {
    paddingHorizontal: 16,
  },
  listPanel: {
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingVertical: 8,
    overflow: 'hidden',
  },
  cell: {
    /* Cell (426:9615): px16, py 2 (spacing/3xs) */
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: CELL_OUTER,
  },
  cellText: {
    /* Layout Txt (9615→447:672): py 8, gap 2 */
    flex: 1,
    gap: 2,
    paddingVertical: CELL_INNER,
  },
  cellName: {
    color: Colors.light.text, /* Body 16/22 · 450 */
  },
  cellRegion: {
    color: Colors.light.textSecondary, /* Caption 12/16 · 500 */
  },
  cellRight: {
    /* Right (447:674): px 8, py 12; расстояние — Body S 14/20 */
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDistance: {
    color: Colors.light.textSecondary,
  },
  separator: {
    /* Spacing & Separator (426:9595): pt 2 / pb 1, линия во всю ширину минус 32 */
    marginTop: CELL_OUTER,
    marginBottom: 1,
    height: 1,
    backgroundColor: Colors.light.borderSubtle,
    marginHorizontal: 16,
  },
  statusTextWrap: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  statusText: {
    color: Colors.light.textSecondary,
  },
  retry: {
    color: Colors.light.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});