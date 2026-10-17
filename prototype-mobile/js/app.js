/* Клюёт — интерактивный UX-прототип (этап 2).
   Роутер в виде стека экранов + живое состояние фильтров, мест и отчётов.
   Всё локальное: сервера нет; публикация никуда не отправляется. */

/* ---------- helpers ---------- */
const $ = (s, el) => (el || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ICON = {
  back: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.5 4l-6 6 6 6"/></svg>',
  chev: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#6f7680" stroke-width="2"><path d="M7.5 4l6 6-6 6"/></svg>',
  chevDown: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#6f7680" stroke-width="2"><path d="M4 7.5l6 6 6-6"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l10 10M15 5L5 15"/></svg>',
  search: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4.5 4.5"/></svg>',
  check: '<svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="#fff" stroke-width="2.4"><path d="M4 10.5l4 4 8-9"/></svg>',
  gear: '<svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h9M15 6h2M3 14h2M8 14h9"/><circle cx="12" cy="6" r="2"/><circle cx="6" cy="14" r="2"/></svg>',
  sliders: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h12M19 7h2M3 17h2M9 17h12"/><circle cx="17" cy="7" r="2.2"/><circle cx="7" cy="17" r="2.2"/></svg>',
  map: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  cam: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 012-2h2l1.5-2h7L17 5h2a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
  pencil: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M13.6 3.3a1.8 1.8 0 012.5 2.6L7.3 14.7 3.5 16l1.3-3.8z"/></svg>',
  geo: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  photoPh: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 012-2h2l1.5-2h7L17 5h2a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
};

/* состояние приложения */
const S = {
  chips: 'all',                          // all | wild | paid
  filters: EMPTY_FILTERS(),              // расширенный фильтр
  sheetFish: [],                         // рабочий набор в шите выбора рыбы
  fishSheetTarget: 'filter',             // filter | report | place
  fishSheetGroup: 'all',                 // группировка списка в шите
  sheetFishGroup: 'all',                 // группировка списка в шите
  draftPlace: null,                      // черновик нового места
  reportDraft: null,                     // черновик отчёта
  lastCreatedPlaceId: null,
  lastReportRef: null,                   // {placeId, reportId}
  newPlaceNote: '',                      // текст примечания на экране «Готово»
  jTab: 'places',                        // вкладка журнала: places | reports
};

let stack = [];                          // [{screen, params}]
let mainMap = null, cardMap = null, selMap = null, selCircle = null;
let mapMarkers = [];

/* ---------- утилиты даты и текста ---------- */
function dateStr(daysAgo) {
  if (daysAgo === 0) return 'Сегодня';
  if (daysAgo === 1) return 'Вчера';
  if (daysAgo >= 2 && daysAgo <= 4) return daysAgo + ' дня назад';
  if (daysAgo >= 5 && daysAgo <= 20) return daysAgo + ' дней назад';
  if (daysAgo % 10 === 1 && daysAgo % 100 !== 11) return daysAgo + ' день назад';
  if ([2, 3, 4].includes(daysAgo % 10) && (daysAgo % 100 < 10 || daysAgo % 100 >= 20)) return daysAgo + ' дня назад';
  return daysAgo + ' дней назад';
}
function dateLong(daysAgo) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function pluralVid(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'вид';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'вида';
  return 'видов';
}
function pluralZapis(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'запись';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'записи';
  return 'записей';
}
/* дата в списках: свежая — относительной, старше 20 дней — абсолютной (согласовано, 17.10) */
function rDateStr(daysAgo) { return daysAgo > 20 ? dateLong(daysAgo) : dateStr(daysAgo); }
/* базовая вкладка — по ней работает таб-бар и возвраты из внутренних экранов */
function baseTab() { return stack[0] && stack[0].screen === 'journal' ? 'journal' : 'map'; }
function placeMeta(p) {
  return (p.paid ? 'Платное место' : 'Дикое место · Бесплатно') + ' · ' +
    (p.approx ? 'Примерные координаты' : 'Точные координаты');
}
function reportSub(r) {
  return esc(r.tackle || '') + (r.tackle && r.lure ? ' · ' : '') +
    esc(r.lure || '') + (r.photos ? ' · ' + r.photos + ' фото' : '');
}
function fishShort(list) {
  if (!list || !list.length) return 'Любая';
  if (list.length <= 2) return list.join(', ');
  return list.slice(0, 2).join(', ') + ' и ещё ' + (list.length - 2);
}
function catchBadge(catch_) {
  return '<span class="badge">' + (catch_ ? 'с уловом' : 'без улова') + '</span>';
}
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- фильтрация ---------- */
function filtersActive() {
  const f = S.filters;
  return f.fish.length > 0 || f.fresh !== 'any' || f.result !== 'any' || f.method !== 'any';
}
function reportMatches(r) {
  const f = S.filters;
  const freshConf = FRESH_OPTIONS.find(o => o.value === f.fresh);
  if (f.fish.length && !r.fish.some(x => f.fish.includes(x))) return false;
  if (freshConf.days != null && r.daysAgo > freshConf.days) return false;
  if (f.result === 'catch' && !r.catch) return false;
  if (f.result === 'none' && r.catch) return false;
  if (f.method === 'shore' && r.method !== 'shore') return false;
  if (f.method === 'boat' && r.method !== 'boat') return false;
  return true;
}
function placePassesChips(p) {
  if (S.chips === 'wild') return !p.paid;
  if (S.chips === 'paid') return p.paid;
  return true;
}
function placeVisible(p) {
  if (!placePassesChips(p)) return false;
  if (!filtersActive()) return true;
  return p.reports.some(reportMatches);
}
function freshLabel(daysAgo) {
  if (daysAgo <= 3) return 'свежая';
  if (daysAgo <= 30) return 'недавняя';
  if (daysAgo <= 90) return 'устаревает';
  return 'старые данные';
}
/* ---------- маршрутизация ---------- */
function render() {
  document.querySelectorAll('.screen, .modal').forEach(el => el.classList.remove('active'));
  const top = stack[stack.length - 1];
  const fn = SCREENS[top.screen];
  fn(top.params);
  const el = $('#screen-' + top.screen);
  if (el) el.classList.add('active');
  // карты создавались в скрытом экране — после показа пересчитать размеры и подтянуть тайлы
  setTimeout(() => {
    try {
      if (mainMap) mainMap.invalidateSize();
      if (cardMap) cardMap.invalidateSize();
      if (selMap) selMap.invalidateSize();
    } catch (e) {}
  }, 80);
}
function navigate(screen, params) { stack.push({ screen, params }); render(); }
function back() { if (stack.length > 1) { stack.pop(); render(); if (stack[stack.length - 1].screen === 'map') invalidateMain(); } }
function reset(stackArr) { stack = stackArr; render(); }

/* ---------- фото ---------- */
function photoBox(photos, carouselId) {
  if (!photos) return '';
  const slides = Array.from({ length: photos }, (_, i) =>
    '<div class="ph">' + ICON.photoPh + '<span style="margin-left:8px">Демо-фото ' + (i + 1) + '</span></div>').join('');
  const dots = Array.from({ length: photos }, (_, i) => '<span' + (i === 0 ? ' class="on"' : '') + '></span>').join('');
  const dotsHtml = photos > 1 ? '<div class="dots">' + dots + '</div>' : '';
  if (carouselId) {
    return '<div class="carousel" id="' + carouselId + '"><div class="track">' + slides + '</div>' + dotsHtml + '</div>';
  }
  return '<div class="photos">' + slides.replace(/class="ph"/g, 'class="photo"') + '</div>';
}
function bindCarousel(root) {
  const car = root.querySelector('.carousel .track');
  if (!car) return;
  const dots = Array.from(car.parentElement.querySelectorAll('.dots span'));
  car.addEventListener('scroll', () => {
    const i = Math.round(car.scrollLeft / car.clientWidth);
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
  }, { passive: true });
}

/* =========================================================
   ЭКРАНЫ
   ========================================================= */
const SCREENS = {};

/* ---------- таб-бар (Figma V2): Карта / Журнал / Профиль ---------- */
const TAB_ICONS = {
  map: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"> <g id="map"> <path id="Vector" d="M25.2 4.9C25.2 4.41438 24.9506 3.96375 24.535 3.71C24.1194 3.45625 23.6075 3.43 23.1744 3.64875L18.0906 6.19062L10.2419 3.57C9.8875 3.45188 9.50687 3.47813 9.17437 3.64438L3.57437 6.44438C3.0975 6.685 2.8 7.17062 2.8 7.7V23.1C2.8 23.5856 3.04937 24.0362 3.465 24.29C3.88062 24.5437 4.3925 24.57 4.82562 24.3512L9.905 21.8094L17.7537 24.4256C18.1081 24.5437 18.4888 24.5175 18.8212 24.3512L24.4213 21.5512C24.8937 21.315 25.1956 20.8294 25.1956 20.3V4.9H25.2ZM11.2 19.2894V6.8425L16.8 8.71063V21.1575L11.2 19.2894Z" fill="#242424"/> </g> </svg>',
  journal: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"> <g id="book-open-lines-light-full 1"> <path id="Vector" d="M12.3638 6.78563L13.3 7.175V23.7431C11.1212 22.855 8.79375 22.4 6.44 22.4H4.9C4.515 22.4 4.2 22.085 4.2 21.7V6.3C4.2 5.915 4.515 5.6 4.9 5.6H6.44C8.47437 5.6 10.4869 6.0025 12.3638 6.78563ZM21.56 22.4C19.2062 22.4 16.8787 22.855 14.7 23.7431V7.175L15.6362 6.78563C17.5131 6.0025 19.5256 5.6 21.56 5.6H23.1C23.485 5.6 23.8 5.915 23.8 6.3V21.7C23.8 22.085 23.485 22.4 23.1 22.4H21.56ZM14 5.95L12.9019 5.49062C10.8544 4.6375 8.65812 4.2 6.44 4.2H4.9C3.74062 4.2 2.8 5.14062 2.8 6.3V21.7C2.8 22.8594 3.74062 23.8 4.9 23.8H6.44C8.65812 23.8 10.8544 24.2375 12.9019 25.0906L13.4619 25.3225C13.8075 25.4669 14.1925 25.4669 14.5381 25.3225L15.0981 25.0906C17.1456 24.2375 19.3419 23.8 21.56 23.8H23.1C24.2594 23.8 25.2 22.8594 25.2 21.7V6.3C25.2 5.14062 24.2594 4.2 23.1 4.2H21.56C19.3419 4.2 17.1456 4.6375 15.0981 5.49062L14 5.95ZM7 8.4C6.615 8.4 6.3 8.715 6.3 9.1C6.3 9.485 6.615 9.8 7 9.8H7.53375C8.4525 9.8 9.3625 10.0144 10.185 10.4256C10.5306 10.6006 10.9506 10.4563 11.1256 10.1106C11.3006 9.765 11.1562 9.345 10.8106 9.17C9.79125 8.6625 8.67125 8.39562 7.53375 8.39562L7 8.4ZM20.4662 8.4C19.3287 8.4 18.2044 8.66687 17.1894 9.17438C16.8437 9.34938 16.7038 9.76937 16.8744 10.115C17.045 10.4606 17.4694 10.6006 17.815 10.43C18.6375 10.0188 19.5475 9.80438 20.4662 9.80438H21C21.385 9.80438 21.7 9.48938 21.7 9.10438C21.7 8.71938 21.385 8.40438 21 8.40438H20.4662V8.4ZM7 12.6C6.615 12.6 6.3 12.915 6.3 13.3C6.3 13.685 6.615 14 7 14H7.53375C8.4525 14 9.3625 14.2144 10.185 14.6256C10.5306 14.8006 10.9506 14.6563 11.1256 14.3106C11.3006 13.965 11.1562 13.545 10.8106 13.37C9.79125 12.8625 8.67125 12.5956 7.53375 12.5956L7 12.6ZM20.4662 12.6C19.3287 12.6 18.2044 12.8669 17.1894 13.3744C16.8437 13.5494 16.7038 13.9694 16.8744 14.315C17.045 14.6606 17.4694 14.8006 17.815 14.63C18.6375 14.2188 19.5475 14.0044 20.4662 14.0044H21C21.385 14.0044 21.7 13.6894 21.7 13.3044C21.7 12.9194 21.385 12.6044 21 12.6044H20.4662V12.6ZM7 16.8C6.615 16.8 6.3 17.115 6.3 17.5C6.3 17.885 6.615 18.2 7 18.2H7.53375C8.4525 18.2 9.3625 18.4144 10.185 18.8256C10.5306 19.0006 10.9506 18.8563 11.1256 18.5106C11.3006 18.165 11.1562 17.745 10.8106 17.57C9.79125 17.0625 8.67125 16.7956 7.53375 16.7956L7 16.8ZM20.4662 16.8C19.3287 16.8 18.2044 17.0669 17.1894 17.5744C16.8437 17.7494 16.7038 18.1694 16.8744 18.515C17.045 18.8606 17.4694 19.0006 17.815 18.83C18.6375 18.4188 19.5475 18.2044 20.4662 18.2044H21C21.385 18.2044 21.7 17.8894 21.7 17.5044C21.7 17.1194 21.385 16.8044 21 16.8044H20.4662V16.8Z" fill="#242424"/> </g> </svg>',
  profile: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"> <g id="user-light-full 1"> <path id="Vector" d="M9.8 8.4C9.8 6.08125 11.6812 4.2 14 4.2C16.3187 4.2 18.2 6.08125 18.2 8.4C18.2 10.7187 16.3187 12.6 14 12.6C11.6812 12.6 9.8 10.7187 9.8 8.4ZM19.6 8.4C19.6 5.30687 17.0931 2.8 14 2.8C10.9069 2.8 8.4 5.30687 8.4 8.4C8.4 11.4931 10.9069 14 14 14C17.0931 14 19.6 11.4931 19.6 8.4ZM5.6 23.8C5.6 20.3219 8.42187 17.5 11.9 17.5H16.1C19.5781 17.5 22.4 20.3219 22.4 23.8V24.5C22.4 24.885 22.715 25.2 23.1 25.2C23.485 25.2 23.8 24.885 23.8 24.5V23.8C23.8 19.5475 20.3525 16.1 16.1 16.1H11.9C7.6475 16.1 4.2 19.5475 4.2 23.8V24.5C4.2 24.885 4.515 25.2 4.9 25.2C5.285 25.2 5.6 24.885 5.6 24.5V23.8Z" fill="#242424"/> </g> </svg>',
  layers: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3.5 13l8.5 4.7 8.5-4.7" opacity=".55"/><path d="M3.5 17.5l8.5 3.5 8.5-3.5" opacity=".3"/></svg>',
};
function tabBarHtml(active) {
  return `
    <div class="tabbar">
      <button class="tab-ic${active === 'map' ? ' on' : ''}" ${active !== 'map' ? 'onclick="switchTab(\'map\')" ' : ''}title="Карта">${TAB_ICONS.map}</button>
      <button class="tab-ic${active === 'journal' ? ' on' : ''}" ${active !== 'journal' ? 'onclick="switchTab(\'journal\')" ' : ''}title="Журнал">${TAB_ICONS.journal}</button>
      <button class="tab-ic" onclick="toast('Раздел «Профиль» не входит в сценарии прототипа')" title="Профиль">${TAB_ICONS.profile}</button>
    </div>`;
}
function switchTab(tab) {
  if (baseTab() === tab) return;
  reset([{ screen: tab, params: {} }]);
}

/* ---------- 01 · Карта ---------- */
SCREENS.map = function () {
  if (!$('#screen-map')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-map">
        <div class="mapwrap">
          <div id="mainmap"></div>
          <div class="map-ctrl map-chips">
            <button class="chip" data-chip="all" onclick="setChip('all')">Все места</button>
            <button class="chip" data-chip="wild" onclick="setChip('wild')">Дикие</button>
            <button class="chip" data-chip="paid" onclick="setChip('paid')">Платные</button>
            <button class="chip" id="btn-filter" onclick="openFilter()">${ICON.sliders}<span class="dot${filtersActive() ? ' show' : ''}" id="filter-indicator"></span></button>
          </div>
          <div class="map-ctrl map-side">
            <button class="mbtn" onclick="toast('Слои карты не входят в сценарии прототипа')" title="Слои карты">${TAB_ICONS.layers}</button>
            <div class="zoomcol">
              <button class="mbtn" onclick="zoomMain(1)" title="Ближе"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 4v12M4 10h12"/></svg></button>
              <button class="mbtn" onclick="zoomMain(-1)" title="Дальше"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10h12"/></svg></button>
            </div>
            <button class="mbtn" onclick="recenterMap()" title="Моё местоположение">${ICON.geo}</button>
          </div>
          <div class="map-ctrl map-legend">
            <div class="legend-row"><span class="lg">${legendDot()}</span>Точно</div>
            <div class="legend-row"><span class="lg">${legendArea()}</span>Примерно</div>
          </div>
          <div class="map-ctrl map-raise">
            <button class="rbtn" onclick="toast('Поиск не входит в сценарии прототипа')" title="Поиск">${ICON.search}</button>
            <button class="rbtn dark" onclick="openAddPlace()" title="Добавить место"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>
          </div>
        </div>
        ${tabBarHtml('map')}
      </section>`);
  }
  initMainMap();
  renderMarkers();
  syncChips();
};
function zoomMain(d) { if (mainMap) mainMap.setZoom(mainMap.getZoom() + d); }

function legendDot(px = 14) {
  const w = px, h = Math.round(px * 1.17);
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 12 14"><path d="M6 0a6 6 0 00-6 6c0 4.3 6 8 6 8s6-3.7 6-8a6 6 0 00-6-6z" fill="#14181c"/><circle cx="6" cy="6" r="2.2" fill="#fff"/></svg>';
}
function legendArea() {
  return '<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="rgba(20,24,28,.18)" stroke="#6f7680" stroke-dasharray="2.5 2.5"/></svg>';
}

function initMainMap() {
  if (mainMap) return;
  mainMap = L.map('mainmap', { zoomControl: false, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 18,
  }).addTo(mainMap);
  mainMap.setView(START_CENTER, START_ZOOM);
  renderMarkers();
}
function invalidateMain() { if (mainMap) setTimeout(() => mainMap.invalidateSize(), 30); }
function recenterMap() { if (mainMap) mainMap.setView(START_CENTER, START_ZOOM); }

function placeMarkerSvg() {
  return L.divIcon({
    className: '',
    html: legendDot(30),
    iconSize: [30, 35],
    iconAnchor: [15, 35],
  });
}
function renderMarkers() {
  if (!mainMap) return;
  mapMarkers.forEach(m => mainMap.removeLayer(m));
  mapMarkers = [];
  PLACES.forEach(p => {
    if (!placeVisible(p)) return;
    if (p.approx) {
      const c = L.circle([p.lat, p.lng], {
        radius: APPROX_RADIUS,
        color: '#6f7680', weight: 1.5, dashArray: '6 5',
        fillColor: '#9aa7b2', fillOpacity: 0.25,
      }).addTo(mainMap);
      c.on('click', () => openCard(p.id));
      c.bindTooltip(p.name, { direction: 'top' });
      mapMarkers.push(c);
    } else {
      const m = L.marker([p.lat, p.lng], { icon: placeMarkerSvg(), title: p.name }).addTo(mainMap);
      m.on('click', () => openCard(p.id));
      mapMarkers.push(m);
    }
  });
}
function syncChips() {
  document.querySelectorAll('.chip[data-chip]').forEach(el => el.classList.toggle('on', el.dataset.chip === S.chips));
  const ind = $('#filter-indicator');
  if (ind) ind.classList.toggle('show', filtersActive());
}
function setChip(v) { S.chips = v; syncChips(); renderMarkers(); }

/* ---------- Журнал (Figma V2, новый раздел) ----------
   Наполнение: места, созданные пользователем (флаг mine), и отчёты
   пользователя (автор «Вы» / id с префиксом «r-u-»). */
function myPlaces() { return PLACES.filter(p => p.mine); }
function myReports() {
  const out = [];
  PLACES.forEach(p => p.reports.forEach(r => {
    if (r.author === 'Вы' || r.id.startsWith('r-u-')) out.push({ p, r });
  }));
  // свежие сверху
  return out.sort((a, b) => a.r.daysAgo - b.r.daysAgo);
}
SCREENS.journal = function () {
  if (!$('#screen-journal')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-journal">
        <div class="content journal-body">
          <div class="h1">Журнал</div>
          <div class="j-tabs">
            <button class="j-tab" id="jt-places" onclick="setJournalTab('places')">Мои места</button>
            <button class="j-tab" id="jt-reports" onclick="setJournalTab('reports')">Мои отчеты</button>
          </div>
          <div id="journal-list"></div>
        </div>
        ${tabBarHtml('journal')}
      </section>`);
  }
  updateJournalTabs();
  renderJournalList();
};
function setJournalTab(t) { S.jTab = t; updateJournalTabs(); renderJournalList(); }
function updateJournalTabs() {
  const a = $('#jt-places'), b = $('#jt-reports');
  if (a) a.classList.toggle('on', S.jTab === 'places');
  if (b) b.classList.toggle('on', S.jTab === 'reports');
}
function renderJournalList() {
  const box = $('#journal-list');
  if (!box) return;
  if (S.jTab === 'places') {
    const list = myPlaces();
    box.innerHTML = list.length
      ? list.map(p => `
          <button class="j-card" onclick="openCard('${p.id}')">
            <div class="j-card-t">${esc(p.name)}</div>
            <div class="j-card-s">${esc(placeMeta(p))}</div>
          </button>`).join('')
      : `<div class="j-empty">
          <div class="j-empty-title">Добавленных мест нет</div>
          <button class="btn primary" onclick="journalAddPlace()">Добавить</button>
        </div>`;
  } else {
    const list = myReports();
    box.innerHTML = list.length
      ? list.map(({ p, r }) => `
          <button class="j-card" onclick="openReport('${p.id}','${r.id}')">
            <div class="report-top"><span class="j-card-t">${esc(p.name)}</span>${catchBadge(r.catch)}</div>
            ${r.fish.length ? '<div class="j-card-fish">' + esc(r.fish.join(' · ')) + '</div>' : ''}
            <div class="report-foot"><span class="j-card-sub">${reportSub(r)}</span><span class="j-card-date">${rDateStr(r.daysAgo)}</span></div>
          </button>`).join('')
      : `<div class="j-empty">
          <div class="j-empty-title">Отчетов пока нет</div>
        </div>`;
  }
}
/* «Добавить» в пустом журнале → карта в режиме добавления места (согласовано 17.10) */
function journalAddPlace() { reset([{ screen: 'map', params: {} }]); openAddPlace(); }

/* ---------- 02 · Карточка места ---------- */
function openCard(placeId) { navigate('place', { placeId }); }
function openReport(placeId, reportId) { navigate('report', { placeId, reportId }); }

SCREENS.place = function (params) {
  const p = PLACES.find(x => x.id === params.placeId);
  if (!p) return;
  const meta = placeMeta(p);
  const fishTop = p.fish.slice(0, 3).join(', ');
  const fishMore = p.fish.length > 3 ? ' и ещё ' + (p.fish.length - 3) + ' ' + pluralVid(p.fish.length - 3) : '';
  const fishingLabel = p.fishing === 'boat' ? 'С лодки' : (p.fishing === 'shore' ? 'С берега' : 'С берега и с лодки');
  const preview = p.reports.slice().sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 2);

  if (!$('#screen-place')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-place">
        <div class="cardhero">
          <div id="cardmap"></div>
          <div class="card-hero-actions">
            <button class="cbtn" onclick="back()" title="Назад">${ICON.back}</button>
            <span id="place-hdr-right"></span>
          </div>
          <div class="card-pill" id="card-pill"></div>
        </div>
        <div class="content" id="place-content" style="padding-top:14px"></div>
      </section>`);
  }
  const previewHtml = !preview.length ? '' : preview.map(r => `
      <button class="report-item" onclick="openReport('${p.id}','${r.id}')">
        <div class="report-top"><span class="author">${rDateStr(r.daysAgo)} · ${esc(r.author)}</span>${catchBadge(r.catch)}</div>
        ${r.fish.length ? '<div class="report-fish">' + esc(r.fish.join(' · ')) + '</div>' : ''}
        <div class="report-foot"><span class="report-sub">${reportSub(r)}</span></div>
      </button>`).join('');
  // блок отчётов целиком скрыт, пока отчётов нет (макет 02-2; согласовано 17.10)
  const reportsBlock = !p.reports.length ? '' : `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:18px">
      <div class="section-label" style="margin:0">Свежие отчёты</div>
      <span style="font-size:12px;color:var(--text2)">${p.reports.length} ${pluralZapis(p.reports.length)}</span>
    </div>
    ${previewHtml}
    <button class="btn gray" style="margin-top:12px;width:100%" onclick="goReports()">Все отчёты</button>`;

  $('#place-content').innerHTML = `
    <div>
      <div class="h1">${esc(p.name)}</div>
      <div class="meta">${esc(meta)}</div>
    </div>
    ${fishMore
      ? `<button class="row-card link" onclick="openFishCard('${p.id}')">
          <span class="label">Какая рыба здесь ловилась</span>
          <span class="value"><span>${esc(fishTop + fishMore)}</span>${ICON.chev}</span>
        </button>`
      : `<div class="row-card">
          <span class="label">Какая рыба здесь ловилась</span>
          <span class="value"><span>${esc(fishTop || 'Не указана')}</span></span>
        </div>`}
    <div class="row-card">
      <span class="label">Доступ</span>
      <span class="value">${esc(p.access)}</span>
    </div>
    <div class="row-card">
      <span class="label">Рыбалка</span>
      <span class="value">${esc(fishingLabel)}</span>
    </div>
    ${p.comment ? '<div class="section-label">Комментарий</div><div class="ph-text">' + esc(p.comment) + '</div>' : ''}
    ${p.photos ? '<div class="section-label">Фото</div>' + photoBox(p.photos) : ''}
    ${reportsBlock}
    <div class="cardbtns">
      <button class="btn" id="route-btn" onclick="toast('Переход во внешний навигатор (демо)')">Маршрут</button>
      <button class="btn primary" onclick="openReportForm()">Добавить отчёт</button>
    </div>`;

  $('#card-pill').textContent = p.approx ? 'Примерное место' : 'Точная точка';
  $('#route-btn').textContent = p.approx ? 'Маршрут к области' : 'Маршрут';
  // карандаш — редактирование места доступно, пока у него нет отзывов; иначе статичная кнопка поиска
  $('#place-hdr-right').innerHTML = p.reports.length === 0
    ? `<button class="cbtn" onclick="editPlace('${p.id}')" title="Редактировать место">${ICON.pencil}</button>`
    : `<button class="cbtn" onclick="toast('Поиск не входит в сценарии прототипа')" title="Поиск">${ICON.search}</button>`;
  bindCarousel($('#place-content'));
  initCardMap(p);
};
function initCardMap(p) {
  if (cardMap) { cardMap.remove(); cardMap = null; }
  cardMap = L.map('cardmap', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, keyboard: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(cardMap);
  const z = p.approx ? 12 : 14;
  cardMap.setView([p.lat, p.lng], z);
  if (p.approx) {
    L.circle([p.lat, p.lng], {
      radius: APPROX_RADIUS, color: '#6f7680', weight: 1.5, dashArray: '6 5',
      fillColor: '#9aa7b2', fillOpacity: 0.3,
    }).addTo(cardMap);
  } else {
    L.marker([p.lat, p.lng], { icon: placeMarkerSvg() }).addTo(cardMap);
  }
  setTimeout(() => cardMap.invalidateSize(), 30);
}

/* ---------- шторка «Какая рыба здесь ловилась» ---------- */
function openFishCard(placeId) {
  const p = PLACES.find(x => x.id === placeId);
  if (!$('#overlay-fishcard')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="overlay-fishcard" class="sheet-overlay" onclick="if(event.target===this)closeFishCard()">
        <div class="sheet">
          <div class="sheet-head">
            <span class="h-sub">Какая рыба здесь ловилась</span>
            <button class="iconbtn" onclick="closeFishCard()">${ICON.close}</button>
          </div>
          <div id="fishcard-list"></div>
        </div>
      </div>`);
  }
  $('#fishcard-list').innerHTML = p.fish.length
    ? p.fish.map(f => `<div class="sheet-row">${esc(f)}</div>`).join('')
    : '<div class="empty" style="margin-top:4px">Рыба у этого места пока не указана</div>';
  $('#overlay-fishcard').classList.add('active');
}
function closeFishCard() { $('#overlay-fishcard').classList.remove('active'); }

/* ---------- 03 · Отчёты ---------- */
SCREENS.reports = function (params) {
  const p = PLACES.find(x => x.id === params.placeId);
  if (!$('#screen-reports')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-reports">
        <div class="appheader">
          <button class="cbtn" onclick="back()">${ICON.back}</button>
          <span class="h-sub" id="reports-title"></span>
          <span style="flex:1"></span>
        </div>
        <div class="content" id="reports-list"></div>
        <div class="barbtns"><button class="btn primary" onclick="openReportForm()">Добавить свой отчёт</button></div>
      </section>`);
  }
  $('#reports-title').textContent = 'Отчёты · ' + p.name;
  const sorted = p.reports.slice().sort((a, b) => a.daysAgo - b.daysAgo);
  $('#reports-list').innerHTML = sorted.length ? sorted.map(r => `
    <button class="report-item" onclick="openReport('${p.id}','${r.id}')">
      <div class="report-top"><span class="author">${esc(r.author)}</span>${catchBadge(r.catch)}</div>
      ${r.fish.length ? '<div class="report-fish">' + esc(r.fish.join(' · ')) + '</div>' : ''}
      <div class="report-foot"><span class="report-sub">${reportSub(r)}</span><span class="report-date">${rDateStr(r.daysAgo)}</span></div>
    </button>`).join('')
    : '<div class="empty" style="margin-top:8px">Отчётов пока нет</div>';
};
function goReports() { navigate('reports', { placeId: stack[stack.length - 1].params.placeId }); }

/* ---------- 04 · Отчёт рыбака ---------- */
SCREENS.report = function (params) {
  const { placeId, reportId } = params;
  const p = PLACES.find(x => x.id === placeId);
  const r = p && p.reports.find(x => x.id === reportId);
  if (!r) return;
  if (!$('#screen-report')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-report">
        <div class="appheader">
          <button class="cbtn" onclick="back()">${ICON.back}</button>
          <span class="h-sub">Отчёт о рыбалке</span>
          <span style="flex:1"></span>
          <span id="report-hdr-right"></span>
        </div>
        <div class="content" id="report-body"></div>
        <div class="barbtns">
          <button class="btn" onclick="backToCard('${placeId}')">Перейти в место</button>
        </div>
      </section>`);
  }
  $('#report-body').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
      <div>
        <div style="font-size:18px;font-weight:700">${esc(r.author)}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">${rDateStr(r.daysAgo)}</div>
      </div>
      ${catchBadge(r.catch)}
    </div>
    ${r.photos ? photoBox(r.photos, 'carousel-report') : ''}
    <div class="kv-row">
      <div class="kv"><div class="label">Вид рыбы</div><div class="value">${esc(r.fish.length ? r.fish.join(', ') : 'Не указана')}</div></div>
      <div class="kv"><div class="label">Откуда ловил</div><div class="value">${r.method === 'shore' ? 'С берега' : 'С лодки'}</div></div>
    </div>
    <div class="kv-row">
      <div class="kv"><div class="label">Снасть</div><div class="value">${esc(r.tackle || 'Не указана')}</div></div>
      <div class="kv"><div class="label">Приманка</div><div class="value">${esc(r.lure || 'Не указана')}</div></div>
    </div>
    ${r.comment ? '<div class="section-label" style="margin-top:20px">Комментарий</div><div class="ph-text">' + esc(r.comment) + '</div>' : ''}`;
  $('#report-hdr-right').innerHTML = r.author === 'Вы'
    ? `<button class="iconbtn" onclick="openReportEdit('${placeId}','${r.id}')" title="Редактировать отчёт">${ICON.pencil}</button>`
    : '';
  bindCarousel($('#report-body'));
};
/* ---------- редактирование своего отчёта ---------- */
function openReportEdit(placeId, reportId) {
  const p = PLACES.find(x => x.id === placeId);
  const r = p.reports.find(x => x.id === reportId);
  S.reportDraft = {
    catch: r.catch, fish: r.fish.slice(), method: r.method,
    tackle: r.tackle || '', lure: r.lure || '', comment: r.comment || '',
    photos: r.photos || 0, editedReportId: r.id,
  };
  navigate('reportform', { placeId });
}
function backToCard(placeId) { reset([{ screen: baseTab(), params: {} }]); openCard(placeId); }

/* ---------- 05 · Новый отчёт ---------- */
function openReportForm() {
  const place = PLACES.find(x => x.id === stack[stack.length - 1].params.placeId);
  S.reportDraft = { catch: null, fish: [], method: 'boat', tackle: '', lure: '', comment: '', photos: 0 };
  navigate('reportform', { placeId: place.id });
}
SCREENS.reportform = function (params) {
  const p = PLACES.find(x => x.id === params.placeId);
  if (!$('#screen-reportform')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-reportform">
        <div class="appheader">
          <button class="cbtn" onclick="back()">${ICON.back}</button>
          <span class="h-sub">Новый отчёт</span>
          <span style="flex:1"></span>
        </div>
        <div class="content" id="reportform-body"></div>
        <div class="barbtns"><button class="btn primary" id="publish-report" onclick="publishReport()">Опубликовать отчёт</button></div>
      </section>`);
  }
  renderReportForm(p);
};
function renderReportForm(p) {
  const d = S.reportDraft;
  $('#reportform-body').innerHTML = `
    <div class="banner">Место: ${esc(p.name)} · публикация в выбранной точке</div>
    <div class="form-label">Как прошла рыбалка? <span class="req">*</span></div>
    <div class="segmented">
      <button class="seg ${d.catch === true ? 'on' : ''}" onclick="setDraft('catch', true)">С уловом</button>
      <button class="seg ${d.catch === false ? 'on' : ''}" onclick="setDraft('catch', false)">Без улова</button>
    </div>
    ${d.catch === false ? '' : `
    <div class="form-label">Какую рыбу ловил?</div>
    <button class="selectbtn" onclick="openFishSheet('report')">
      <span class="${d.fish.length ? '' : 'ph'}">${esc(d.fish.length ? fishShort(d.fish) : 'Выбрать')}</span><span class="chev">${ICON.chevDown}</span>
    </button>`}
    <div class="form-label">Способ ловли</div>
    <div class="segmented">
      <button class="seg ${d.method === 'boat' ? 'on' : ''}" onclick="setDraft('method', 'boat')">С лодки</button>
      <button class="seg ${d.method === 'shore' ? 'on' : ''}" onclick="setDraft('method', 'shore')">С берега</button>
    </div>
    <div class="form-label">Снасть (необязательно)</div>
    <button class="selectbtn" onclick="openTackleSheet()">
      <span class="${d.tackle ? '' : 'ph'}">${esc(d.tackle || 'Не указывать')}</span><span class="chev">${ICON.chevDown}</span>
    </button>
    <div class="form-label">Приманка (необязательно)</div>
    <input class="field" id="lure-input" placeholder="Воблер, блесна, опарыш…" value="${esc(d.lure)}" oninput="S.reportDraft.lure=this.value" />
    <div class="form-label">Что происходило?</div>
    <textarea class="field" placeholder="Пара предложений о рыбалке…" oninput="S.reportDraft.comment=this.value">${esc(d.comment)}</textarea>
    <div style="height:14px"></div>
    <button class="btn" onclick="addDraftPhoto()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px">
      ${ICON.cam} ${d.photos ? 'Фото: ' + d.photos + ' (демо)' : 'Фото'}
    </button>`;
  syncPublishBtn();
}
function syncPublishBtn() {
  const el = $('#publish-report');
  if (el) el.disabled = S.reportDraft.catch == null;
}
function setDraft(key, val) {
  S.reportDraft[key] = val;
  // «Без улова» — поле выбора рыбы скрывается и выбранное сбрасывается
  if (key === 'catch' && val === false) S.reportDraft.fish = [];
  renderReportForm(currentPlace());
}
function addDraftPhoto() {
  S.reportDraft.photos = S.reportDraft.photos ? 0 : 2; // повторное нажатие снимет демо-фото
  renderReportForm(currentPlace());
  if (S.reportDraft.photos) toast('Добавлено 2 демо-фото (не реальные)');
}
function currentPlace() { return PLACES.find(x => x.id === stack[stack.length - 1].params.placeId); }
let placeContext = null;

function publishReport() {
  placeContext = currentPlace();
  finishPublishReport();
}
function finishPublishReport() {
  const p = placeContext;
  placeContext = null;
  const d = S.reportDraft;
  const base = { catch: !!d.catch, fish: d.fish.slice(), method: d.method,
                 tackle: d.tackle, lure: d.lure, comment: d.comment, photos: d.photos };
  let r;
  if (d.editedReportId) {
    r = p.reports.find(x => x.id === d.editedReportId);
    Object.assign(r, base); // автор и дата отчёта сохраняются
  } else {
    r = Object.assign({ id: 'r-u-' + Date.now(), author: 'Вы', daysAgo: 0 }, base);
    p.reports.unshift(r);
  }
  S.reportDraft = null;
  S.lastReportRef = { placeId: p.id, reportId: r.id };
  reset([{ screen: baseTab(), params: {} }, { screen: 'place', params: { placeId: p.id } },
         { screen: 'reports', params: { placeId: p.id } },
         { screen: 'report', params: { placeId: p.id, reportId: r.id } }]);
  toast(d.editedReportId ? 'Изменения отчёта сохранены (демо)' : 'Отчёт опубликован (демо, запись не отправлялась)');
}

/* ---------- 07 · Координаты точки ---------- */
function openAddPlace() {
  S.draftPlace = {
    lat: START_CENTER[0] + (Math.random() - 0.5) * 0.02,
    lng: START_CENTER[1] + (Math.random() - 0.5) * 0.02,
    accuracy: 'approx',
    name: '', paid: false, fish: [], access: '', desc: '', photos: 0,
  };
  navigate('coords', {});
}
SCREENS.coords = function () {
  if (!$('#screen-coords')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-coords">
        <div class="appheader no-line">
          <button class="cbtn" onclick="back()">${ICON.back}</button>
          <div class="progress-inline"><div class="on"></div><div></div></div>
          <button class="cbtn" onclick="toast('Поиск не входит в сценарии прототипа')" title="Поиск">${ICON.search}</button>
        </div>
        <div class="mapwrap">
          <div id="selmap"></div>
          <div class="sel-cross" id="sel-cross"></div>
        </div>
        <div class="coords-bottom" style="padding:0 16px 2px">
          <div class="coords-strip" id="coords-strip">Координаты:</div>
          <div class="accuracy-grid">
            <button class="acc-card" id="acc-approx" onclick="setAccuracy('approx')">
              <span class="t">◈ Примерно</span>
              <span class="d">Область ~1 км, не раскрывать точку</span>
            </button>
            <button class="acc-card" id="acc-exact" onclick="setAccuracy('exact')">
              <span class="t">● Точно</span>
              <span class="d">Другим видна выбранная точка</span>
            </button>
          </div>
        </div>
        <div class="barbtns coords-barbtns"><button class="btn primary" onclick="coordsNext()">Дальше</button></div>
      </section>`);
  }
  initSelMap();
  setAccuracyUI();
  updateCoordsStrip();
};
function updateCoordsStrip() {
  const el = $('#coords-strip');
  if (el && S.draftPlace) el.textContent = 'Координаты: ' + S.draftPlace.lat.toFixed(3) + ', ' + S.draftPlace.lng.toFixed(3);
}
function initSelMap() {
  if (selMap) { selMap.remove(); selMap = null; }
  selMap = L.map('selmap', { zoomControl: false, attributionControl: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(selMap);
  selMap.setView([S.draftPlace.lat, S.draftPlace.lng], 13);
  selMap.on('moveend', () => {
    const c = selMap.getCenter();
    S.draftPlace.lat = +c.lat.toFixed(5);
    S.draftPlace.lng = +c.lng.toFixed(5);
    updateCoordsStrip();
    if (S.draftPlace.accuracy === 'approx') drawSelCircle();
  });
  drawSelCircle();
  setTimeout(() => selMap.invalidateSize(), 30);
}
function drawSelCircle() {
  const p = S.draftPlace;
  if (selCircle) { selMap.removeLayer(selCircle); selCircle = null; }
  if (p.accuracy !== 'approx') return;
  selCircle = L.circle([p.lat, p.lng], {
    radius: APPROX_RADIUS, color: '#6f7680', weight: 1.5, dashArray: '6 5',
    fillColor: '#9aa7b2', fillOpacity: 0.3,
  }).addTo(selMap);
}
function setAccuracy(v) { S.draftPlace.accuracy = v; setAccuracyUI(); }
function setAccuracyUI() {
  const on = S.draftPlace && S.draftPlace.accuracy;
  const a = $('#acc-approx'), b = $('#acc-exact');
  if (!a) return;
  a.classList.toggle('on', on === 'approx');
  b.classList.toggle('on', on === 'exact');
  // крест-прицел — только у варианта «Точно»; «Примерно» показывает круг области
  const cr = $('#sel-cross');
  if (cr) cr.classList.toggle('show', on === 'exact');
  drawSelCircle();
}
function coordsNext() { navigate('placedesc', {}); }

/* ---------- редактирование места (пока нет отзывов) ---------- */
function editPlace(placeId) {
  const p = PLACES.find(x => x.id === placeId);
  S.draftPlace = {
    existingId: p.id,
    lat: p.lat, lng: p.lng,
    accuracy: p.approx ? 'approx' : 'exact',
    name: p.name, paid: !!p.paid,
    fish: p.fish.slice(),
    access: p.access,
    desc: p.comment || '',
    photos: p.photos || 0,
    editing: true,
  };
  navigate('placedesc', {});
}

/* ---------- 07-2 · Подробнее о новом месте ---------- */
SCREENS.placedesc = function () {
  if (!$('#screen-placedesc')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-placedesc">
        <div class="appheader">
          <button class="cbtn" onclick="back()">${ICON.back}</button>
          <div class="progress-inline"><div class="on"></div><div class="on"></div></div>
        </div>
        <div class="content" id="pd-body"></div>
        <div class="barbtns"><button class="btn primary" onclick="publishPlace()">Опубликовать место</button></div>
      </section>`);
  }
  renderPlaceDesc();
};
function renderPlaceDesc() {
  const d = S.draftPlace;
  $('#pd-body').innerHTML = `
    <div class="banner-acq">
      <span class="coords">Координаты: ${d.accuracy === 'exact' ? '● Точно' : '◈ Примерно'}</span>
      <button class="changebtn" onclick="back()">Изменить</button>
    </div>
    <div class="h1" style="margin-top:14px">Подробнее о новом месте</div>
    <div class="form-label">Название места <span class="req">*</span></div>
    <input class="field" id="place-name" placeholder="Например: Залив у сосен" value="${esc(d.name)}" oninput="S.draftPlace.name=this.value; this.classList.remove('invalid')" />
    <div class="form-label">Тип места</div>
    <div class="segmented">
      <button class="seg ${!d.paid ? 'on' : ''}" onclick="S.draftPlace.paid=false; renderPlaceDesc()">Дикое / бесплатное</button>
      <button class="seg ${d.paid ? 'on' : ''}" onclick="S.draftPlace.paid=true; renderPlaceDesc()">Платное</button>
    </div>
    <div class="form-label">Какая рыба водится?</div>
    <button class="selectbtn" onclick="openFishSheet('place')">
      <span class="${d.fish.length ? '' : 'ph'}">${esc(d.fish.length ? fishShort(d.fish) : 'Выбрать')}</span><span class="chev">${ICON.chevDown}</span>
    </button>
    <div class="form-label">Как добраться?</div>
    <button class="selectbtn" onclick="navigate('access', {})">
      <span class="${d.access ? '' : 'ph'}">${esc(d.access || 'Выбрать')}</span><span class="chev">${ICON.chevDown}</span>
    </button>
    <div class="form-label">Краткое описание (необязательно)</div>
    <textarea class="field" placeholder="Берег, лодка, что стоит учитывать…" oninput="S.draftPlace.desc=this.value">${esc(d.desc)}</textarea>
    <div style="height:14px"></div>
    <button class="btn" onclick="addPlacePhoto()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px">
      ${ICON.cam} ${d.photos ? 'Фото: ' + d.photos + ' (демо)' : 'Фото'}
    </button>`;
}
function addPlacePhoto() {
  S.draftPlace.photos = S.draftPlace.photos ? 0 : 2;
  renderPlaceDesc();
  if (S.draftPlace.photos) toast('Добавлено 2 демо-фото (не реальные)');
}
function publishPlace() {
  const input = $('#place-name');
  if (!S.draftPlace.name.trim()) { input.classList.add('invalid'); input.focus(); return; }
  createPlaceFinal();
}
function createPlaceFinal() {
  const d = S.draftPlace;
  let p;
  if (d.existingId) {
    p = PLACES.find(x => x.id === d.existingId);
    p.name = d.name.trim();
    p.paid = !!d.paid;
    p.approx = d.accuracy === 'approx';
    p.lat = d.lat; p.lng = d.lng;
    p.fish = d.fish.slice();
    p.access = d.access || 'Не знаю';
    p.comment = d.desc;
    p.photos = d.photos;
    S.lastAction = 'edit';
  } else {
    p = {
      id: 'u-' + Date.now(),
      name: d.name.trim(),
      paid: !!d.paid,
      approx: d.accuracy === 'approx',
      lat: d.lat, lng: d.lng,
      fish: d.fish.slice(),
      access: d.access || 'Не знаю',
      fishing: 'shore',
      comment: d.desc,
      photos: d.photos,
      reports: [],
      mine: true, // место, созданное пользователем — попадает в Журнал
    };
    PLACES.push(p);
    S.lastAction = 'create';
  }
  placeContext = p;
  S.lastCreatedPlaceId = p.id;
  S.lastCreatedAccuracy = d.accuracy;
  S.draftPlace = null;
  reset([{ screen: 'map', params: {} }, { screen: 'done', params: {} }]);
}

/* ---------- 09 · Готово ---------- */
SCREENS.done = function () {
  if (!$('#screen-done')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-done">
        <div class="appheader">
          <button class="cbtn ic-back" onclick="goMap()">${ICON.back}</button>
          <span class="h-sub">Готово</span>
          <span style="flex:1"></span>
        </div>
        <div class="center-screen">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#14181c" stroke-width="1.6"><path d="M4 12.5l5 5L20 7"/></svg>
          <div class="big" id="done-title">Место добавлено!</div>
          <div class="desc">Это демонстрация успешного сценария. Записи на сервер не отправлялись.</div>
          <div class="barbtns">
            <button class="btn primary" onclick="openLastPlace()">Открыть место</button>
            <button class="btn" onclick="goMap()">Вернуться на карту</button>
          </div>
        </div>
      </section>`);
  }
  $('#done-title').textContent = S.lastAction === 'edit' ? 'Место обновлено!' : 'Место добавлено!';
};
function goMap() { reset([{ screen: 'map', params: {} }]); }
function openLastPlace() { reset([{ screen: 'map', params: {} }]); openCard(S.lastCreatedPlaceId); }

/* ---------- Как добраться? ---------- */
SCREENS.access = function () {
  if (!$('#screen-access')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-access">
        <div class="appheader">
          <button class="iconbtn" onclick="back()">${ICON.back}</button>
          <span class="h-sub">Как добраться?</span>
        </div>
        <div class="content" id="access-list"></div>
      </section>`);
  }
  renderAccess();
};
function renderAccess() {
  const cur = S.draftPlace ? S.draftPlace.access : '';
  $('#access-list').innerHTML = ACCESS_OPTIONS.map(o => `
    <button class="fish-item" onclick="pickAccess('${o.replace(/'/g, "\\'")}')">
      <span>${esc(o)}</span>
      <span class="radio ${cur === o ? 'on' : ''}"></span>
    </button>`).join('');
}
function pickAccess(v) { S.draftPlace.access = v; back(); renderPlaceDesc(); }

/* =========================================================
   МОДАЛЫ ФИЛЬТРА И ПИКЕРЫ
   ========================================================= */
SCREENS.filter = function () {
  if (!$('#screen-filter')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-filter">
        <div class="appheader">
          <span class="h-sub" style="margin-left:8px">Фильтр</span>
          <span style="flex:1"></span>
          <button class="iconbtn" onclick="closeFilter()">${ICON.close}</button>
        </div>
        <div class="content" id="filter-body"></div>
        <div class="barbtns">
          <button class="btn" onclick="resetFilter()">Сбросить</button>
          <button class="btn primary" onclick="closeFilter()">Показать</button>
        </div>
      </section>`);
  }
  renderFilterBody();
};
function renderFilterBody() {
  const f = S.filters;
  const fresh = FRESH_OPTIONS.find(o => o.value === f.fresh);
  $('#filter-body').innerHTML = `
    <div class="form-label" style="margin-top:4px">Вид рыбы</div>
    <button class="selectbtn" onclick="openFishSheet('filter')">
      <span class="${f.fish.length ? '' : 'ph'}">${esc(fishShort(f.fish) === 'Любая' ? 'Любая' : fishShort(f.fish))}</span><span class="chev">${ICON.chevDown}</span>
    </button>
    <div class="form-label">Давность отчетов</div>
    <button class="selectbtn" onclick="navigate('fresh', {})">
      <span>${esc(fresh.label)}</span><span class="chev">${ICON.chevDown}</span>
    </button>
    <div class="form-label">Результат рыбалки</div>
    <div class="segmented">
      <button class="seg ${f.result === 'any' ? 'on' : ''}" onclick="setF('result','any')">Все</button>
      <button class="seg ${f.result === 'catch' ? 'on' : ''}" onclick="setF('result','catch')">С уловом</button>
      <button class="seg ${f.result === 'none' ? 'on' : ''}" onclick="setF('result','none')">Без улова</button>
    </div>
    <div class="form-label">Способ ловли</div>
    <div class="segmented">
      <button class="seg ${f.method === 'any' ? 'on' : ''}" onclick="setF('method','any')">Все</button>
      <button class="seg ${f.method === 'shore' ? 'on' : ''}" onclick="setF('method','shore')">С берега</button>
      <button class="seg ${f.method === 'boat' ? 'on' : ''}" onclick="setF('method','boat')">С лодки</button>
    </div>`;
}
function setF(key, val) { S.filters[key] = val; renderFilterBody(); syncFilterFromOutside(); }
function syncFilterFromOutside() {
  const ind = $('#filter-indicator');
  if (ind) ind.classList.toggle('show', filtersActive());
  if (mainMap) renderMarkers();
}
function openFilter() { navigate('filter', {}); }
function closeFilter() { back(); syncFilterFromOutside(); }
function resetFilter() { S.filters = EMPTY_FILTERS(); renderFilterBody(); }

SCREENS.fresh = function () {
  if (!$('#screen-fresh')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-fresh">
        <div class="appheader">
          <button class="iconbtn" onclick="back()">${ICON.back}</button>
          <span class="h-sub">Давность отчетов</span>
          <span style="flex:1"></span>
          <button class="iconbtn" onclick="back()">${ICON.close}</button>
        </div>
        <div class="content" id="fresh-list"></div>
      </section>`);
  }
  renderFresh();
};
function renderFresh() {
  $('#fresh-list').innerHTML = FRESH_OPTIONS.map(o => `
    <button class="fish-item" onclick="pickFresh('${o.value}')">
      <span>${esc(o.label)}</span>
      <span class="radio ${S.filters.fresh === o.value ? 'on' : ''}"></span>
    </button>`).join('');
}
function pickFresh(v) { S.filters.fresh = v; back(); }

/* ---------- шит выбора рыбы (общий) ---------- */
function openFishSheet(target) {
  S.fishSheetTarget = target;
  S.sheetFish = target === 'filter' ? S.filters.fish.slice()
    : target === 'report' ? S.reportDraft.fish.slice()
    : S.draftPlace.fish.slice();
  navigate('fishsheet', {});
}
SCREENS.fishsheet = function () {
  if (!$('#screen-fishsheet')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-fishsheet">
        <div class="appheader">
          <button class="iconbtn" onclick="back()">${ICON.back}</button>
          <span class="h-sub" style="margin-left:8px">Вид рыбы</span>
          <span style="flex:1"></span>
          <button class="iconbtn" onclick="closeFishSheetX()">${ICON.close}</button>
        </div>
        <div class="content" id="fishsheet-body"></div>
        <div class="barbtns">
          <button class="btn" onclick="resetFishSheet()">Сбросить</button>
          <button class="btn primary" id="fish-apply" onclick="applyFishSheet()">Применить</button>
        </div>
      </section>`);
  }
  renderFishSheet();
};
function renderFishSheet() {
  const g = S.fishSheetGroup;
  $('#fishsheet-body').innerHTML = `
    <div class="form-label" style="margin-top:4px">Тип</div>
    <div class="segmented group-chips">
      <button class="seg ${g === 'all' ? 'on' : ''}" onclick="S.fishSheetGroup='all'; renderFishSheet()">Все</button>
      <button class="seg ${g === 'pred' ? 'on' : ''}" onclick="S.fishSheetGroup='pred'; renderFishSheet()">Хищная</button>
      <button class="seg ${g === 'peace' ? 'on' : ''}" onclick="S.fishSheetGroup='peace'; renderFishSheet()">Мирная</button>
    </div>
    <div class="fish-list">
      ${FISH.filter(f => g === 'all' || f.group === g).map(f => `
        <button class="fish-item" onclick="toggleSheetFish('${f.name.replace(/'/g, "\\'")}')">
          <span>${esc(f.name)}</span>
          <span class="checkbox ${S.sheetFish.includes(f.name) ? 'on' : ''}">${S.sheetFish.includes(f.name) ? ICON.check : ''}</span>
        </button>`).join('')}
    </div>`;
  const a = $('#fish-apply');
  a.disabled = S.sheetFish.length === 0;
}
function toggleSheetFish(name) {
  const i = S.sheetFish.indexOf(name);
  if (i >= 0) S.sheetFish.splice(i, 1); else S.sheetFish.push(name);
  renderFishSheet();
}
function resetFishSheet() {
  S.sheetFish = [];
  const t = S.fishSheetTarget;
  if (t === 'filter') { S.filters.fish = []; renderFilterBody(); }
  if (t === 'report') { S.reportDraft.fish = []; }
  if (t === 'place') { S.draftPlace.fish = []; }
  renderFishSheet();
}
function applyFishSheet() {
  const t = S.fishSheetTarget;
  if (t === 'filter') S.filters.fish = S.sheetFish.slice();
  if (t === 'report') S.reportDraft.fish = S.sheetFish.slice();
  if (t === 'place') { S.draftPlace.fish = S.sheetFish.slice(); renderPlaceDesc(); }
  back();
  if (t === 'report') renderReportForm(currentPlace());
}
function closeFishSheetX() {
  // «×» — просто закрыть без применения (как в макете фильтра: × = закрыть)
  S.sheetFish = [];
  back();
  renderFishSheet();
}

/* ---------- шит снасти ---------- */
SCREENS.tackle = function () {
  if (!$('#screen-tackle')) {
    $('#screens').insertAdjacentHTML('beforeend', `
      <section class="screen" id="screen-tackle">
        <div class="appheader">
          <button class="iconbtn" onclick="back()">${ICON.back}</button>
          <span class="h-sub">Снасть</span>
        </div>
        <div class="content" id="tackle-list"></div>
      </section>`);
  }
  renderTackle();
};
function renderTackle() {
  const cur = S.reportDraft.tackle || '';
  $('#tackle-list').innerHTML = TACKLE_OPTIONS.map(o => `
    <button class="fish-item" onclick="pickTackle('${o.replace(/'/g, "\\'")}')">
      <span>${esc(o)}</span>
      <span class="radio ${cur === o ? 'on' : ''}"></span>
    </button>`).join('');
}
function pickTackle(v) { S.reportDraft.tackle = v; back(); renderReportForm(currentPlace()); }
function openTackleSheet() { navigate('tackle', {}); }

/* ---------- старт ---------- */
reset([{ screen: 'map', params: {} }]);