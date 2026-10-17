/* Демо-данные прототипа. Все места, отчёты и авторы — тестовые, не реальные. */
/* Координаты — реалистичные точки в нижегородской части Волги и вокруг. */

// Справочник видов рыбы (список из макета «Вид рыбы», опечатка «Головаль» исправлена)
const FISH = [
  { name: 'Щука',        group: 'pred'  },
  { name: 'Окунь',       group: 'pred'  },
  { name: 'Голавль',     group: 'peace' },
  { name: 'Судак',       group: 'pred'  },
  { name: 'Лещ',         group: 'peace' },
  { name: 'Жерех',       group: 'pred'  },
  { name: 'Берш',        group: 'pred'  },
  { name: 'Линь',        group: 'peace' },
  { name: 'Язь',         group: 'peace' },
  { name: 'Карась',      group: 'peace' },
  { name: 'Краснопёрка', group: 'peace' },
  { name: 'Густера',     group: 'peace' },
  { name: 'Ёрш',         group: 'pred'  },
];

const FRESH_OPTIONS = [
  { value: 'any', label: 'Любое время', days: null },
  { value: '7',   label: 'За 7 дней',   days: 7   },
  { value: '30',  label: 'За 30 дней',  days: 30  },
  { value: '90',  label: 'За 90 дней',  days: 90  },
];

const ACCESS_OPTIONS = ['Подъезд к воде', 'Часть пути пешком', 'Не знаю'];

const TACKLE_OPTIONS = ['Спиннинг', 'Поплавочная снасть', 'Фидер', 'Донка', 'Живцовая снасть'];

// Пресеты фильтров по умолчанию (значения «не выбрано»)
const EMPTY_FILTERS = () => ({
  fish: [],      // [] = Любая
  fresh: 'any',  // value из FRESH_OPTIONS
  result: 'any', // any | catch | none
  method: 'any', // any | shore | boat
});

// Демо-места. days_ago — давность отчёта в днях (относительная, чтобы сценарии работали всегда)
const PLACES = [
  {
    id: 'zaliv-sosen',
    name: 'Залив у сосен',
    paid: false,
    approx: true, // публикациа в выбранной области
    lat: 56.2512, lng: 43.8620,
    fish: ['Щука', 'Окунь', 'Судак', 'Лещ', 'Плотва', 'Карась', 'Густера'],
    access: 'Подъезд / Дальше пешком',
    fishing: 'boat', // ловля: с лодки (в карточке)
    fishingBoth: false,
    comment: 'Спокойный залив, берег местами заросший. Участок условный, точные координаты автора не раскрывает.',
    photos: 2,
    reports: [
      { id: 'r-al-1', author: 'Алексей',   daysAgo: 0,   catch: true,  fish: ['Щука', 'Окунь'],              method: 'shore', tackle: 'Спиннинг', lure: 'Воблер, силикон', photos: 2,
        comment: 'Вышел ближе к устью. Вдоль камышей были две поклёвки, одну удалось реализовать. У берега мокро, лучше в сапогах.' },
      { id: 'r-42-2', author: 'Рыбак 42',  daysAgo: 3,   catch: false, fish: [],                             method: 'boat',  tackle: 'Спиннинг', lure: 'Воблер', photos: 2,
        comment: 'Прошёл три точки у коряжника. Одна схода на выходе, за три часа больше ничего.' },
      { id: 'r-va-3', author: 'Валера',    daysAgo: 144, catch: true,  fish: ['Окунь', 'Ёрш'],               method: 'boat',  tackle: 'Спиннинг', lure: 'Силикон, тюлька', photos: 0,
        comment: 'Окунь брался у бугров стабильно. С вечера добавился хороший ёрш.' },
      { id: 'r-s52-4', author: 'Сергей 52', daysAgo: 533, catch: true,  fish: ['Лещ'],                        method: 'shore', tackle: 'Донка', lure: 'Опарыш', photos: 2,
        comment: 'Закормил две точки, с рассвета три поклёвки. Подлещик средней руки.' },
      { id: 'r-id-5', author: 'Игнат',     daysAgo: 41,  catch: false, fish: ['Судак'],                      method: 'boat',  tackle: 'Спиннинг', lure: 'Поролонка', photos: 0,
        comment: 'Свалку обследовали, одна задева и всё. Ветер, комфорт ниже среднего.' },
      { id: 'r-kr-6', author: 'Крот',      daysAgo: 12,  catch: true,  fish: ['Судак', 'Берш'],              method: 'boat',  tackle: 'Спиннинг', lure: 'Силикон', photos: 0,
        comment: 'Держался у бровки русла. Берш мелковат, вернул.' },
      { id: 'r-la-7', author: 'Лавр',      daysAgo: 95,  catch: true,  fish: ['Краснопёрка', 'Плотва'],      method: 'shore', tackle: 'Поплавочная снасть', lure: 'Опарыш', photos: 0,
        comment: 'Берег в камышах, подход чисто в одном месте.' },
    ],
  },
  {
    id: 'volzh-kosa',
    name: 'Волжская коса',
    paid: false,
    approx: false,
    lat: 56.3214, lng: 43.9085,
    fish: ['Лещ', 'Плотва', 'Судак'],
    access: 'Подъезд / Дальше пешком',
    fishing: 'shore',
    comment: 'Точка без свежих отчётов. Данные, известные по этому месту, могли устареть.',
    photos: 0,
    reports: [],
  },
  {
    id: 'prud-st-ges',
    name: 'Платный пруд у старого ГЭС',
    paid: true,
    approx: false,
    lat: 56.2835, lng: 43.9580,
    fish: ['Карась', 'Лещ', 'Карп'],
    access: 'Подъезд к воде',
    fishing: 'shore',
    comment: 'Платный пруд с причалом. Норма вылова и правила — по согласованию с владельцем.',
    photos: 1,
    reports: [
      { id: 'r-dn-8',  author: 'Дима Н.',  daysAgo: 6,  catch: true,  fish: ['Карась'],   method: 'shore', tackle: 'Фидер', lure: 'Червь, мотыль', photos: 1,
        comment: 'Клёв умеренный, подлещик и карась. За день шесть выходов.' },
      { id: 'r-pv-9',  author: 'Пётр В.',  daysAgo: 25, catch: true,  fish: ['Лещ'],      method: 'shore', tackle: 'Фидер', lure: 'Опарыш', photos: 0,
        comment: 'С утра поклёвки активны, к обеду стихло.' },
      { id: 'r-gl-10', author: 'Гость',    daysAgo: 60, catch: false, fish: ['Карп'],     method: 'shore', tackle: 'Живцовая снасть', lure: '', photos: 0,
        comment: 'Карп держится глубоко, до берега не выходил.' },
    ],
  },
  {
    id: 'degt-omut',
    name: 'Дегтярный омут',
    paid: false,
    approx: false,
    lat: 56.2020, lng: 43.7710,
    fish: ['Щука', 'Окунь'],
    access: 'Часть пути пешком',
    fishing: 'both',
    comment: 'Омут в стороне от дороги. Прямых данных о свежем клёве нет, последний известный улов давно.',
    photos: 0,
    reports: [
      { id: 'r-ts-11', author: 'Тарас',  daysAgo: 120, catch: true,  fish: ['Щука'],  method: 'boat',  tackle: 'Спиннинг', lure: 'Колебалка', photos: 0,
        comment: 'Щука брала у границы травы.' },
      { id: 'r-vs-12', author: 'Виктор', daysAgo: 260, catch: false, fish: ['Окунь'], method: 'shore', tackle: 'Спиннинг', lure: '', photos: 0,
        comment: 'Берега сильно заросли, подходы плохие.' },
    ],
  },
  {
    id: 'zaton-cherny',
    name: 'Затон у Черного',
    paid: false,
    approx: true,
    lat: 56.1390, lng: 44.0210,
    fish: ['Окунь', 'Щука', 'Густера'],
    access: 'Не знаю',
    fishing: 'shore',
    comment: 'Малое место у берега, точка публикуется как примерная область.',
    photos: 1,
    reports: [
      { id: 'r-mn-13', author: 'Мороз',  daysAgo: 9,  catch: true,  fish: ['Окунь'],       method: 'shore', tackle: 'Спиннинг', lure: 'Мелкий воблер', photos: 0,
        comment: 'У завалов в дереве окунь брал стабильно.' },
      { id: 'r-eg-14', author: 'Егор',   daysAgo: 88, catch: false, fish: ['Щука'],        method: 'shore', tackle: 'Живцовая снасть', lure: '', photos: 0,
        comment: 'Живец без поклёвки, вода зацвела.' },
    ],
  },
  {
    id: 'baza-volga',
    name: 'База «Волга-Спорт»',
    paid: true,
    approx: false,
    lat: 56.2350, lng: 44.0640,
    fish: ['Судак', 'Жерех', 'Лещ'],
    access: 'Подъезд к воде',
    fishing: 'boat',
    comment: 'Платная лодочная база с выходом на русло.',
    photos: 0,
    reports: [
      { id: 'r-zv-15', author: 'Захар',  daysAgo: 1,  catch: true,  fish: ['Судак', 'Жерех'], method: 'boat',  tackle: 'Спиннинг', lure: 'Силикон, кастмастер', photos: 1,
        comment: 'Выход судака на русловой бровке, с утра брал жерех.' },
      { id: 'r-oy-16', author: 'Олег',   daysAgo: 21, catch: false, fish: ['Лещ'],            method: 'boat',  tackle: 'Фидер', lure: '', photos: 0,
        comment: 'Час простоя без поклёвок, перешёл на другую точку.' },
    ],
  },
  {
    id: 'u-koryazhka',
    name: 'Коряжник у протоки',
    paid: false,
    approx: false,
    lat: 56.1740, lng: 43.8210,
    fish: ['Щука', 'Окунь', 'Язь'],
    access: 'Часть пути пешком',
    fishing: 'shore',
    comment: 'Коряжник в стороне от дороги. Прямых данных о свежем клёве мало.',
    photos: 0,
    reports: [
      { id: 'r-st-17', author: 'Стас',   daysAgo: 17, catch: true,  fish: ['Язь'],   method: 'shore', tackle: 'Спиннинг', lure: 'Вращалка', photos: 0,
        comment: 'Язь брал на границе струи.' },
      { id: 'r-ar-18', author: 'Артём',  daysAgo: 70, catch: false, fish: ['Щука'],  method: 'shore', tackle: 'Спиннинг', lure: '', photos: 0,
        comment: 'Условия менялись, поклёвок не было.' },
    ],
  },
];

// Точка старта карты — район демо-мест
const START_CENTER = [56.2240, 43.8960];
const START_ZOOM = 12;
const APPROX_RADIUS = 1000; // ~1 км