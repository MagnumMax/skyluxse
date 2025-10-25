import { MOCK_DATA, CALENDAR_EVENT_TYPES, BOOKING_STATUS_PHASES, BOOKING_STATUS_STAGE_MAP, getClientById } from '/src/data/index.js';
import { appState } from '/src/state/appState.js';
import { buildHash } from '/src/state/navigation.js';
import { showToast } from '/src/ui/toast.js';
import { getIcon } from '/src/ui/icons.js';
import { formatCurrency } from '/src/render/utils.js';

const VIEW_CONFIG = {
  '3-day': { days: 3, step: 3 },
  week: { days: 7, step: 7 },
  'two-week': { days: 14, step: 14 },
  month: { days: 30, step: 30 },
  quarter: { days: 90, step: 30 }
};

const CAR_STATUS_META = {
  Available: { label: 'Свободен' },
  'In Rent': { label: 'В аренде' },
  Maintenance: { label: 'Сервис' }
};

const PRIORITY_META = {
  high: { label: 'Высокий приоритет', dot: 'bg-rose-500', ring: 'ring-2 ring-rose-200', badge: 'bg-rose-50 text-rose-600 border border-rose-200' },
  medium: { label: 'Средний приоритет', dot: 'bg-amber-400', ring: 'ring-1 ring-amber-200', badge: 'bg-amber-50 text-amber-600 border border-amber-200' },
  low: { label: 'Низкий приоритет', dot: 'bg-emerald-400', ring: 'ring-1 ring-emerald-200', badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200' }
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
});
const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long'
});
const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit'
});
const CAR_LOCATION_MAP = {
  1: 'SkyLuxse HQ',
  2: 'Dubai Marina Hub',
  3: 'SkyLuxse HQ',
  4: 'Service Center JLT',
  5: 'Palm Support Bay'
};

const OWNER_LOOKUP = (MOCK_DATA.salesPipeline?.owners || []).reduce((acc, owner) => {
  acc[owner.id] = owner.name;
  return acc;
}, {
  operations: 'Fleet Desk',
  unassigned: 'Unassigned'
});

const DEFAULT_LAYER_ORDER = ['rental', 'maintenance', 'repair'];

const collapsedGroupIds = new Set();

const getBookingLifecyclePhase = (status) => {
  if (!status) return 'reservation';
  return BOOKING_STATUS_STAGE_MAP[status] || 'reservation';
};

const getCarLocation = (car) => car.location || CAR_LOCATION_MAP[car.id] || 'SkyLuxse HQ';

const parseDateTimeLoose = (value) => {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getOwnerName = (ownerId) => OWNER_LOOKUP[ownerId] || ownerId || 'Unassigned';

const TASK_PRIORITY_META = {
  high: 'bg-rose-50 text-rose-700 border border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
};

const extractBgClass = (colorString = '') => {
  const token = colorString.split(' ').find((item) => item.startsWith('bg-'));
  return token || 'bg-gray-200';
};

let calendarControlsBound = false;
let routerHandler = null;
let currentEventsSnapshot = [];
let selectedEventId = null;
let selectedEventData = null;
let activeEventElement = null;
let drawerElements = null;
let drawerEscBound = false;

const escapeAttr = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const triggerRouter = () => {
  if (typeof routerHandler === 'function') {
    routerHandler();
  }
};

const getViewConfig = (mode) => VIEW_CONFIG[mode] || VIEW_CONFIG.week;

const DAY_IN_MS = 86400000;
const MONTH_LABELS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const formatDateKey = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (key) => {
  if (!key) return new Date();
  const [year, month, day] = key.split('-').map(Number);
  return new Date(
    Number.isFinite(year) ? year : 1970,
    Number.isFinite(month) ? month - 1 : 0,
    Number.isFinite(day) ? day : 1
  );
};

const getCalendarTodayKey = () => appState.calendarTodayOverride || formatDateKey(new Date());
const getCalendarTodayDate = () => parseDateKey(getCalendarTodayKey());

const buildMonthSegments = (dates) => {
  if (!Array.isArray(dates) || !dates.length) return [];
  return dates.reduce((segments, date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (segments.length && segments[segments.length - 1].key === key) {
      segments[segments.length - 1].length += 1;
      return segments;
    }
    segments.push({
      key,
      length: 1,
      label: `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`
    });
    return segments;
  }, []);
};

const formatPercent = (value) => (Number.isFinite(value) ? value.toFixed(4) : '0');

const getEventOverlapMs = (event, rangeStart, rangeEndExclusive) => {
  const start = new Date(event.start);
  const end = new Date(event.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const effectiveStart = start < rangeStart ? rangeStart : start;
  const effectiveEnd = end > rangeEndExclusive ? rangeEndExclusive : end;
  const overlap = effectiveEnd.getTime() - effectiveStart.getTime();
  return overlap > 0 ? overlap : 0;
};

const calculatePeriodUtilization = ({ events, carCount, rangeStart, rangeEndExclusive, types = ['rental'] }) => {
  if (!carCount) return 0;
  const totalCapacity = carCount * (rangeEndExclusive.getTime() - rangeStart.getTime());
  if (totalCapacity <= 0) return 0;
  const typeSet = new Set(types);
  const busyMs = events
    .filter(event => typeSet.has(event.type))
    .reduce((acc, event) => acc + getEventOverlapMs(event, rangeStart, rangeEndExclusive), 0);
  return Math.min(1, busyMs / totalCapacity);
};

const updateRangeSwitcherState = (activeView) => {
  const buttons = document.querySelectorAll('.calendar-range-btn');
  buttons.forEach((button) => {
    const isActive = button.dataset.calendarRange === activeView;
    button.classList.toggle('bg-indigo-600', isActive);
    button.classList.toggle('text-white', isActive);
    button.classList.toggle('shadow-sm', isActive);
    button.classList.toggle('text-gray-600', !isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
};

const updateModeToggleState = (activeMode) => {
  const buttons = document.querySelectorAll('.calendar-mode-btn');
  buttons.forEach((button) => {
    const isActive = button.dataset.calendarMode === activeMode;
    button.classList.toggle('bg-indigo-600', isActive);
    button.classList.toggle('text-white', isActive);
    button.classList.toggle('shadow-sm', isActive);
    button.classList.toggle('text-gray-600', !isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
};

const renderMiniMap = ({ cars, events, rangeStart, rangeEndExclusive }) => {
  const container = document.getElementById('calendar-minimap');
  if (!container) return;
  const utilization = calculatePeriodUtilization({
    events,
    carCount: cars.length,
    rangeStart,
    rangeEndExclusive,
    types: ['rental']
  });
  const utilizationPercent = Math.round(utilization * 100);
  const utilizationLabel = document.getElementById('calendar-minimap-utilization');
  if (utilizationLabel) {
    utilizationLabel.textContent = `${utilizationPercent}% загружено`;
  }
  const progressEl = document.getElementById('calendar-minimap-progress');
  if (progressEl) {
    const tone = utilization >= 0.85
      ? 'bg-rose-400/80'
      : utilization >= 0.7
        ? 'bg-amber-400/80'
        : 'bg-indigo-500/80';
    progressEl.className = `h-full rounded-full transition-all duration-300 ${tone}`;
    progressEl.style.width = `${utilizationPercent}%`;
  }

  // keep original caption intact; no additional summary required
};


const renderFleetLoadMatrix = ({ groups, events, rangeStart, rangeEndExclusive }) => {
  const container = document.getElementById('fleet-load-view');
  if (!container) return;
  const rentalEvents = events.filter((event) => event.type === 'rental');
  const maintenanceEvents = events.filter((event) => event.type === 'maintenance');
  const rows = groups.map((group) => {
    const carIds = new Set(group.cars.map((car) => car.id));
    const groupRentals = rentalEvents.filter((event) => carIds.has(event.carId));
    const groupMaintenance = maintenanceEvents.filter((event) => carIds.has(event.carId));
    const carCount = group.cars.length || 1;
    const utilization = calculatePeriodUtilization({
      events: groupRentals,
      carCount,
      rangeStart,
      rangeEndExclusive,
      types: ['rental']
    });
    return {
      id: group.id,
      label: group.label,
      vehicles: group.cars.length,
      utilization,
      rentals: groupRentals.length,
      maintenance: groupMaintenance.length
    };
  }).sort((a, b) => b.utilization - a.utilization);

  const rowsHtml = rows.map((row) => {
    const percent = Math.round(row.utilization * 100);
    const tone = percent >= 85 ? 'bg-rose-400' : percent >= 70 ? 'bg-amber-400' : 'bg-indigo-500';
    return `
            <div class="space-y-3 rounded-lg border border-gray-200 bg-white/70 p-4">
                <div class="flex items-center justify-between text-sm font-semibold text-gray-900">
                    <span>${escapeAttr(row.label)}</span>
                    <span>${percent}%</span>
                </div>
                <div class="h-2 w-full rounded-full bg-indigo-100 overflow-hidden">
                    <div class="h-full ${tone}" style="width: ${percent}%"></div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-[11px] text-gray-500">
                    <span class="inline-flex items-center gap-1">${getIcon('car', 'w-3.5 h-3.5')} ${row.vehicles}</span>
                    <span class="inline-flex items-center gap-1">${getIcon('clipboardCheck', 'w-3.5 h-3.5')} ${row.rentals}</span>
                    <span class="inline-flex items-center gap-1">${getIcon('wrench', 'w-3.5 h-3.5')} ${row.maintenance}</span>
                </div>
            </div>
        `;
  }).join('');

  container.innerHTML = rowsHtml
    ? `<div class="space-y-3 p-5">
                <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-gray-900">Fleet load overview</p>
                    <button id="fleet-load-export" class="text-xs font-medium text-indigo-600 hover:text-indigo-800">Export CSV</button>
                </div>
                <div class="space-y-3">${rowsHtml}</div>
            </div>`
    : '<div class="p-5 text-xs text-gray-500">Нет данных для отображения.</div>';

  const exportButton = container.querySelector('#fleet-load-export');
  if (exportButton) {
    exportButton.addEventListener('click', () => showToast('Экспорт доступен в полной версии.', 'info'));
  }
};

const eventOverlapsRange = (event, rangeStart, rangeEndExclusive) => {
  const start = new Date(event.start);
  const end = new Date(event.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  return start < rangeEndExclusive && end > rangeStart;
};

const formatDateTime = (value) => DATE_TIME_FORMATTER.format(new Date(value));
const formatDateOnly = (value) => DATE_FORMATTER.format(new Date(value));
const formatDateTimeShort = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const handleDrawerEscape = (event) => {
  if (event.key === 'Escape') closeCalendarDrawer();
};

const ensureDrawerElements = () => {
  if (drawerElements) return drawerElements;
  const container = document.getElementById('calendar-event-drawer');
  if (!container) return null;
  drawerElements = {
    container,
    title: container.querySelector('#calendar-drawer-title'),
    subtitle: container.querySelector('#calendar-drawer-subtitle'),
    content: container.querySelector('#calendar-event-drawer-content'),
    closeBtn: container.querySelector('#calendar-drawer-close'),
    dismissArea: container.querySelector('[data-calendar-drawer-dismiss]')
  };

  if (!container.dataset.bound) {
    if (drawerElements.closeBtn) {
      drawerElements.closeBtn.addEventListener('click', closeCalendarDrawer);
    }
    if (drawerElements.dismissArea) {
      drawerElements.dismissArea.addEventListener('click', closeCalendarDrawer);
    }
    container.addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-calendar-action]');
      if (actionButton) {
        event.preventDefault();
        handleDrawerAction(actionButton.dataset.calendarAction || '');
      }
    });
    container.dataset.bound = 'true';
  }

  if (!drawerEscBound) {
    document.addEventListener('keydown', handleDrawerEscape);
    drawerEscBound = true;
  }

  return drawerElements;
};

const clearEventHighlight = () => {
  if (activeEventElement) {
    activeEventElement.classList.remove('ring-2', 'ring-indigo-300', 'shadow-lg');
    activeEventElement = null;
  }
};

const highlightEventElement = (eventId) => {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  const node = grid.querySelector(`.calendar-event[data-event-id="${eventId}"]`);
  clearEventHighlight();
  if (node) {
    node.classList.add('ring-2', 'ring-indigo-300', 'shadow-lg');
    activeEventElement = node;
  }
};

const closeCalendarDrawer = () => {
  const drawer = ensureDrawerElements();
  if (!drawer) return;
  drawer.container.classList.add('hidden');
  drawer.content.innerHTML = '';
  drawer.title.textContent = '';
  drawer.subtitle.textContent = '';
  selectedEventId = null;
  selectedEventData = null;
  clearEventHighlight();
};

const buildGenericEventContent = (eventData) => {
  const car = MOCK_DATA.cars.find(item => item.id === eventData.carId);
  return `
        <div class="space-y-4">
            <div class="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-2">
                <p class="text-xs uppercase tracking-wide text-gray-500">Интервал</p>
                <p class="text-sm font-semibold text-gray-900">${formatDateTime(eventData.start)} — ${formatDateTime(eventData.end)}</p>
                <p class="text-xs text-gray-500">${car ? `Авто: ${car.name}, ${car.plate}` : 'Без привязки к авто'}</p>
            </div>
            <div class="rounded-lg border border-gray-200 bg-white p-4 space-y-3 text-sm text-gray-600">
                <p>Тип события: <span class="font-medium text-gray-900">${CALENDAR_EVENT_TYPES[eventData.type]?.label || eventData.type}</span></p>
                ${eventData.title ? `<p>Описание: <span class="font-medium text-gray-900">${eventData.title}</span></p>` : ''}
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
                <button data-calendar-action="complete-event" class="geist-button geist-button-primary text-sm w-full">Закрыть событие</button>
                <button data-calendar-action="view-car" class="geist-button geist-button-secondary text-sm w-full">Карточка авто</button>
            </div>
        </div>
    `;
};

const openCalendarDrawer = (eventData, { preserveHighlight = false } = {}) => {
  if (eventData.bookingId) {
    closeCalendarDrawer();
    window.location.hash = buildHash(appState.currentRole, 'booking-detail', eventData.bookingId);
    triggerRouter();
    return;
  }

  const drawer = ensureDrawerElements();
  if (!drawer) return;
  selectedEventId = eventData.id;
  selectedEventData = eventData;

  const typeMeta = CALENDAR_EVENT_TYPES[eventData.type] || { label: 'Событие' };
  drawer.subtitle.textContent = typeMeta.label || 'Событие';
  drawer.title.textContent = eventData.title || typeMeta.label || 'Событие';
  drawer.content.innerHTML = buildGenericEventContent(eventData);

  drawer.container.classList.remove('hidden');
  if (!preserveHighlight) {
    highlightEventElement(eventData.id);
  } else {
    highlightEventElement(eventData.id);
  }
};

const calculateStartForToday = () => getCalendarTodayKey();

const shiftFleetCalendarStart = (direction) => {
  const viewCfg = getViewConfig(appState.filters.calendar.view);
  const step = viewCfg.step || 7;
  const base = appState.calendarStart
    ? parseDateKey(appState.calendarStart)
    : getCalendarTodayDate();
  base.setDate(base.getDate() + direction * step);
  appState.calendarStart = formatDateKey(base);
  renderFleetCalendar();
};

const isAttentionCar = (car) => {
  if (!car) return false;
  const lowHealth = typeof car.serviceStatus?.health === 'number' && car.serviceStatus.health < 0.85;
  const maintenanceStatus = car.status === 'Maintenance';
  const needsInspection = (car.serviceStatus?.label || '').toLowerCase().includes('need');
  const criticalReminder = (car.reminders || []).some(reminder => reminder.status === 'critical' || reminder.status === 'warning');
  return lowHealth || maintenanceStatus || needsInspection || criticalReminder;
};

const renderCalendarSummary = ({
  allCars,
  visibleCars,
  rangeEvents,
  rangeStart,
  rangeEndExclusive,
  attentionCarIds,
  tasksByCar,
  bookingMap
}) => {
  const summaryEl = document.getElementById('calendar-summary');
  if (!summaryEl) return;

  const scopeCars = (visibleCars && visibleCars.length) ? visibleCars : allCars;
  const scopeCarIds = new Set(scopeCars.map((car) => car.id));

  const rentalEvents = rangeEvents.filter((event) => event.type === 'rental' && scopeCarIds.has(event.carId));
  const occupiedCars = new Set(rentalEvents.map((event) => event.carId));

  const maintenanceEvents = rangeEvents.filter((event) => event.type === 'maintenance' && scopeCarIds.has(event.carId));
  const maintenanceCars = new Set([
    ...scopeCars.filter((car) => car.status === 'Maintenance').map((car) => car.id),
    ...maintenanceEvents.map((event) => event.carId)
  ]);

  const conflictsByCar = rangeEvents.reduce((acc, event) => {
    if (!scopeCarIds.has(event.carId)) return acc;
    if (!acc[event.carId]) acc[event.carId] = [];
    acc[event.carId].push(event);
    return acc;
  }, {});

  const conflictCars = Object.values(conflictsByCar).reduce((count, list) => {
    if (list.length < 2) return count;
    const sorted = [...list].sort((a, b) => new Date(a.start) - new Date(b.start));
    for (let i = 1; i < sorted.length; i += 1) {
      const prevEnd = new Date(sorted[i - 1].end);
      const currentStart = new Date(sorted[i].start);
      if (currentStart < prevEnd) {
        return count + 1;
      }
    }
    return count;
  }, 0);

  const horizon = new Date(rangeStart);
  horizon.setDate(horizon.getDate() + 3);
  const upcomingDeliveries = rentalEvents.filter((event) => {
    const start = new Date(event.start);
    return start >= rangeStart && start < horizon;
  });

  const tasksMap = tasksByCar instanceof Map ? tasksByCar : new Map();
  const tasksDue = Array.from(tasksMap.values()).reduce((acc, list) => acc + list.length, 0);
  const attentionSet = attentionCarIds instanceof Set ? attentionCarIds : new Set(attentionCarIds || []);
  const attentionCars = scopeCars.filter((car) => attentionSet.has(car.id)).length;
  const occupancyRate = scopeCars.length
    ? Math.round((occupiedCars.size / scopeCars.length) * 100)
    : 0;

  const bookingRef = bookingMap instanceof Map ? bookingMap : new Map();
  const bookingRevenue = rentalEvents.reduce((sum, event) => {
    if (!event.bookingId) return sum;
    const booking = bookingRef.get(event.bookingId);
    if (!booking || typeof booking.totalAmount !== 'number') return sum;
    return sum + booking.totalAmount;
  }, 0);

  const windowEnd = new Date(rangeEndExclusive.getTime() - DAY_IN_MS);

  summaryEl.innerHTML = `
        <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
            <p class="text-xs uppercase tracking-wide text-gray-500">Scope utilization</p>
            <div class="flex items-baseline gap-2">
                <span class="text-2xl font-semibold text-gray-900">${occupancyRate}%</span>
                <span class="text-xs text-gray-500">${occupiedCars.size}/${scopeCars.length} vehicles busy</span>
            </div>
            <p class="text-xs text-emerald-600">Target ≥ 90%</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
            <p class="text-xs uppercase tracking-wide text-gray-500">Revenue pipeline</p>
            <div class="flex items-baseline gap-2">
                <span class="text-2xl font-semibold text-gray-900">${formatCurrency(bookingRevenue)}</span>
            </div>
            <p class="text-xs text-gray-500">Across visible bookings</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
            <p class="text-xs uppercase tracking-wide text-gray-500">Risks & conflicts</p>
            <div class="flex items-baseline gap-2">
                <span class="text-2xl font-semibold text-gray-900">${conflictCars}</span>
                <span class="text-xs text-gray-500">conflicts • ${attentionCars} attention cars</span>
            </div>
            <p class="text-xs text-gray-500">${maintenanceCars.size} vehicles in maintenance flow</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
            <p class="text-xs uppercase tracking-wide text-gray-500">Upcoming handoffs</p>
            <div class="flex items-baseline gap-2">
                <span class="text-2xl font-semibold text-gray-900">${upcomingDeliveries.length}</span>
                <span class="text-xs text-gray-500">deliveries • ${tasksDue} driver tasks</span>
            </div>
            <p class="text-xs text-gray-500">${DATE_FORMATTER.format(rangeStart)} – ${DATE_FORMATTER.format(windowEnd)}</p>
        </div>
    `;
};

const renderCalendarAlerts = (bookingEvents, cars, rangeStart, tasksByCar) => {
  const alertsEl = document.getElementById('calendar-alerts');
  if (!alertsEl) return;

  const horizon = new Date(rangeStart);
  horizon.setDate(horizon.getDate() + 5);

  const upcomingReturns = bookingEvents
    .map((event) => ({ ...event, endDateObj: new Date(event.end) }))
    .filter((event) => event.endDateObj >= rangeStart && event.endDateObj <= horizon)
    .sort((a, b) => a.endDateObj - b.endDateObj);

  const attentionCars = cars.filter(isAttentionCar).slice(0, 5);

  const tasksMap = tasksByCar instanceof Map ? tasksByCar : new Map();
  const driverTasks = Array.from(tasksMap.entries())
    .flatMap(([carId, list]) => list.map((task) => ({ carId, task })))
    .sort((a, b) => a.task.deadline - b.task.deadline)
    .slice(0, 3);

  const items = [];

  upcomingReturns.slice(0, 3).forEach((event) => {
    const car = cars.find((item) => item.id === event.carId);
    items.push(`
            <div class="flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                <div>
                    <p class="text-sm font-semibold text-gray-900">${event.bookingCode || 'Бронь'} • возврат ${formatDateTime(event.end)}</p>
                    <p class="text-xs text-gray-500">${event.title || ''}${car ? ` • ${car.name}` : ''}</p>
                </div>
            </div>
        `);
  });

  driverTasks.forEach(({ carId, task }) => {
    const car = cars.find((item) => item.id === carId);
    items.push(`
            <div class="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                <div>
                    <p class="text-sm font-semibold text-gray-900">${task.title}</p>
                    <p class="text-xs text-gray-500">${car ? car.name : 'Car TBD'} • до ${formatDateTime(task.deadline)}</p>
                </div>
            </div>
        `);
  });

  attentionCars.slice(0, Math.max(0, 4 - items.length)).forEach((car) => {
    items.push(`
            <div class="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2">
                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                <div>
                    <p class="text-sm font-semibold text-gray-900">${car.name} • ${car.plate}</p>
                    <p class="text-xs text-gray-500">${car.serviceStatus?.label || 'Нужна проверка'}${car.serviceStatus?.nextService ? ` • сервис до ${formatDateOnly(car.serviceStatus.nextService)}` : ''}</p>
                </div>
            </div>
        `);
  });

  alertsEl.innerHTML = items.length
    ? items.join('')
    : '<p class="text-sm text-gray-400">Нет срочных задач в горизонте пяти дней.</p>';
};

const handleDrawerAction = (action) => {
  if (!selectedEventData) return;
  const car = MOCK_DATA.cars.find(item => item.id === selectedEventData.carId);
  switch (action) {
  case 'view-booking':
    if (selectedEventData.bookingId) {
      window.location.hash = buildHash(appState.currentRole, 'booking-detail', selectedEventData.bookingId);
      triggerRouter();
      closeCalendarDrawer();
    }
    break;
  case 'extend-booking':
    showToast('Продление брони доступно после подтверждения клиента (демо).', 'info');
    break;
  case 'mark-returned':
    showToast('Отметка возврата сохранится в полной версии платформы.', 'success');
    break;
  case 'schedule-maintenance':
    window.location.hash = buildHash(appState.currentRole, 'maintenance-create');
    triggerRouter();
    closeCalendarDrawer();
    break;
  case 'view-car':
    if (car) {
      window.location.hash = buildHash(appState.currentRole, 'fleet-detail', car.id);
      triggerRouter();
      closeCalendarDrawer();
    }
    break;
  case 'complete-event':
    showToast('Событие отмечено как завершенное (демо).', 'success');
    closeCalendarDrawer();
    break;
  default:
    showToast('Действие появится в полной версии.', 'info');
  }
};

const handleVehicleAction = (button) => {
  const action = button.dataset.vehicleAction;
  const carId = Number(button.dataset.carId);
  const car = MOCK_DATA.cars.find(item => item.id === carId);
  if (!car) return;

  switch (action) {
  case 'create-booking':
    window.location.hash = buildHash(appState.currentRole, 'booking-create');
    triggerRouter();
    break;
  case 'extend-active': {
    const activeBooking = currentEventsSnapshot.find(event => event.carId === carId && event.type === 'rental');
    if (activeBooking) {
      openCalendarDrawer(activeBooking);
    } else {
      showToast('Нет активных бронирований для продления.', 'info');
    }
    break;
  }
  case 'schedule-maintenance':
    window.location.hash = buildHash(appState.currentRole, 'maintenance-create');
    triggerRouter();
    break;
  case 'view-car':
    window.location.hash = buildHash(appState.currentRole, 'fleet-detail', car.id);
    triggerRouter();
    break;
  default:
    showToast('Функция появится в будущих версиях.', 'info');
  }
};

const buildOwnerIndex = (bookings) => {
  const ownerByCar = new Map();
  bookings.forEach((booking) => {
    if (!booking.carId) return;
    ownerByCar.set(booking.carId, booking.ownerId || 'unassigned');
  });
  return ownerByCar;
};

const buildGrouping = (cars, mode, ownerByCar) => {
  const compareCars = (a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB, 'ru', { sensitivity: 'base' });
  };
  const sortedCars = cars.slice().sort(compareCars);

  if (mode === 'vehicle') {
    return sortedCars.map((car) => ({
      id: `vehicle-${car.id}`,
      label: car.name,
      value: String(car.id),
      cars: [car],
      collapsible: false
    }));
  }

  const groupsMap = new Map();
  sortedCars.forEach((car) => {
    let key = String(car.id);
    let label = car.name;

    if (mode === 'class') {
      key = car.class || 'Other';
      label = key;
    } else if (mode === 'location') {
      key = getCarLocation(car);
      label = key;
    } else if (mode === 'owner') {
      const ownerKey = ownerByCar.get(car.id) || 'unassigned';
      key = ownerKey;
      label = getOwnerName(ownerKey);
    }

    const groupId = `${mode}-${String(key).toLowerCase().replace(/[^a-z0-9-]+/gi, '-')}`;
    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, {
        id: groupId,
        key,
        label,
        cars: [],
        collapsible: true
      });
    }
    groupsMap.get(groupId).cars.push(car);
  });

  return Array.from(groupsMap.values())
    .map(group => ({
      ...group,
      cars: group.cars.slice().sort(compareCars)
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru', { sensitivity: 'base' }));
};

const collectTasksByCar = (rangeStart, rangeEndExclusive, bookingMap) => {
  const tasksMap = new Map();
  MOCK_DATA.tasks.forEach((task) => {
    if (!task.bookingId) return;
    const booking = bookingMap.get(task.bookingId) || MOCK_DATA.bookings.find((item) => String(item.id) === String(task.bookingId));
    if (!booking || !booking.carId) return;
    const deadline = parseDateTimeLoose(task.deadline);
    if (!deadline) return;
    if (deadline < rangeStart || deadline > rangeEndExclusive) return;
    const normalizedPriority = String(task.priority || '').toLowerCase();
    const entry = {
      id: task.id,
      title: task.title,
      priority: ['high', 'medium', 'low'].includes(normalizedPriority) ? normalizedPriority : 'medium',
      deadline
    };
    if (!tasksMap.has(booking.carId)) tasksMap.set(booking.carId, []);
    tasksMap.get(booking.carId).push(entry);
  });
  tasksMap.forEach((list) => list.sort((a, b) => a.deadline - b.deadline));
  return tasksMap;
};

const renderCalendarLegend = (activeLayers) => {
  const container = document.getElementById('calendar-legend-items');
  if (!container) return;
  const showAllInactive = Array.isArray(activeLayers) && activeLayers.length === 0;
  const activeSet = new Set(
    showAllInactive
      ? []
      : Array.isArray(activeLayers) && activeLayers.length
        ? activeLayers
        : DEFAULT_LAYER_ORDER
  );
  const items = DEFAULT_LAYER_ORDER
    .filter((type) => CALENDAR_EVENT_TYPES[type])
    .map((type) => {
      const meta = CALENDAR_EVENT_TYPES[type];
      const bgClass = extractBgClass(meta.color);
      const borderClass = meta.border || 'border-gray-200';
      const isActive = showAllInactive ? false : activeSet.has(type);
      return `
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                        <span class="h-3 w-3 rounded-full border ${borderClass} ${bgClass}"></span>
                        <span class="font-medium text-gray-700">${meta.label || type}</span>
                    </div>
                    <span class="text-[11px] uppercase tracking-wide ${isActive ? 'text-emerald-600' : 'text-gray-400'}">${isActive ? 'ON' : 'OFF'}</span>
                </div>
            `;
    });
  container.innerHTML = items.length
    ? items.join('')
    : '<p class="text-xs text-gray-400">No layers selected.</p>';
};

const updateBulkPanel = (groupMode, visibleCarsCount, events) => {
  const countEl = document.getElementById('calendar-bulk-count');
  const descriptionEl = document.getElementById('calendar-bulk-description');
  if (!countEl || !descriptionEl) return;
  const highPriorityCount = events.filter((event) => event.priority === 'high').length;
  const scopeLabel = groupMode === 'vehicle' ? 'vehicles' : 'groups';
  countEl.textContent = `${visibleCarsCount} ${scopeLabel}`;
  if (events.length) {
    descriptionEl.textContent = `${events.length} events in view • ${highPriorityCount} high priority`;
  } else {
    descriptionEl.textContent = 'Нет событий в выбранном срезе.';
  }
};

const bindFleetCalendarControls = () => {
  if (calendarControlsBound) return;

  const prevBtn = document.getElementById('calendar-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => shiftFleetCalendarStart(-1));
  }

  const nextBtn = document.getElementById('calendar-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => shiftFleetCalendarStart(1));
  }

  const todayBtn = document.getElementById('calendar-today');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      appState.calendarStart = calculateStartForToday();
      renderFleetCalendar();
    });
  }

  const viewSelect = document.getElementById('calendar-view-select');
  if (viewSelect) {
    viewSelect.addEventListener('change', (event) => {
      appState.filters.calendar.view = event.target.value;
      appState.calendarStart = calculateStartForToday();
      renderFleetCalendar();
    });
  }

  const rangeButtons = Array.from(document.querySelectorAll('.calendar-range-btn'));
  rangeButtons.forEach((button) => {
    if (button.dataset.bound) return;
    button.addEventListener('click', () => {
      const range = button.dataset.calendarRange || 'week';
      appState.filters.calendar.view = range;
      appState.calendarStart = calculateStartForToday();
      renderFleetCalendar();
    });
    button.dataset.bound = 'true';
  });

  const modeButtons = Array.from(document.querySelectorAll('.calendar-mode-btn'));
  modeButtons.forEach((button) => {
    if (button.dataset.bound) return;
    button.addEventListener('click', () => {
      const mode = button.dataset.calendarMode || 'timeline';
      appState.filters.calendar.mode = mode;
      renderFleetCalendar();
    });
    button.dataset.bound = 'true';
  });

  const typeSelect = document.getElementById('calendar-type-filter');
  if (typeSelect) {
    typeSelect.addEventListener('change', (event) => {
      appState.filters.calendar.type = event.target.value;
      renderFleetCalendar();
    });
  }

  const bookingStatusSelect = document.getElementById('calendar-booking-status-filter');
  if (bookingStatusSelect) {
    bookingStatusSelect.addEventListener('change', (event) => {
      appState.filters.calendar.bookingStatus = event.target.value;
      renderFleetCalendar();
    });
  }

  const groupSelect = document.getElementById('calendar-group-select');
  if (groupSelect) {
    groupSelect.addEventListener('change', (event) => {
      appState.filters.calendar.group = event.target.value;
      renderFleetCalendar();
    });
  }

  const layerInputs = Array.from(document.querySelectorAll('input[data-calendar-layer]'));
  if (layerInputs.length) {
    layerInputs.forEach((input) => {
      if (input.dataset.bound) return;
      input.addEventListener('change', () => {
        const activeLayers = layerInputs
          .filter(field => field.checked)
          .map(field => field.dataset.calendarLayer)
          .filter(Boolean);
        appState.filters.calendar.layers = activeLayers.length ? activeLayers : [];
        renderFleetCalendar();
      });
      input.dataset.bound = 'true';
    });
  }

  const classFilter = document.getElementById('fleet-calendar-class-filter');
  if (classFilter) {
    classFilter.addEventListener('change', () => renderFleetCalendar());
  }

  const statusFilter = document.getElementById('fleet-calendar-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => renderFleetCalendar());
  }

  const filterToggle = document.getElementById('fleet-calendar-filter-toggle');
  const filterPanel = document.getElementById('fleet-calendar-filter-panel');
  if (filterToggle && filterPanel) {
    filterToggle.addEventListener('click', () => {
      filterPanel.classList.toggle('hidden');
    });
  }

  const applyFiltersBtn = document.getElementById('fleet-calendar-apply-filters');
  if (applyFiltersBtn && filterPanel) {
    applyFiltersBtn.addEventListener('click', () => {
      filterPanel.classList.add('hidden');
      renderFleetCalendar();
    });
  }

  const clearFiltersBtn = document.getElementById('fleet-calendar-clear-filters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      const typeSelectEl = document.getElementById('calendar-type-filter');
      if (typeSelectEl) typeSelectEl.value = 'all';
      appState.filters.calendar.type = 'all';
      const bookingStatusFilterEl = document.getElementById('calendar-booking-status-filter');
      if (bookingStatusFilterEl) bookingStatusFilterEl.value = 'all';
      appState.filters.calendar.bookingStatus = 'all';
      if (classFilter) classFilter.value = '';
      if (statusFilter) statusFilter.value = '';
      appState.filters.calendar.availableOnly = false;
      appState.filters.calendar.attentionOnly = false;
      filterPanel?.classList.add('hidden');
      renderFleetCalendar();
    });
  }

  const alertsRefreshBtn = document.getElementById('calendar-alerts-refresh');
  if (alertsRefreshBtn) {
    alertsRefreshBtn.addEventListener('click', () => renderFleetCalendar());
  }

  const searchInput = document.getElementById('calendar-search');
  if (searchInput) {
    let searchTimeout = null;
    searchInput.addEventListener('input', (event) => {
      const value = event.target.value.trim();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        appState.filters.calendar.search = value;
        renderFleetCalendar();
      }, 150);
    });
  }

  [
    { id: 'calendar-bulk-block', message: 'Будет заблокирован выбранный срез (демо).' },
    { id: 'calendar-bulk-redistribute', message: 'Автораспределение будет доступно в проде.' },
    { id: 'calendar-bulk-maintenance', message: 'План ТО создастся автоматически в полной версии.' }
  ].forEach(({ id, message }) => {
    const button = document.getElementById(id);
    if (button && !button.dataset.bound) {
      button.addEventListener('click', () => showToast(message, 'info'));
      button.dataset.bound = 'true';
    }
  });

  const grid = document.getElementById('calendar-grid');
  if (grid && !grid.dataset.bound) {
    grid.addEventListener('click', (event) => {
      const groupToggle = event.target.closest('[data-calendar-group-toggle]');
      if (groupToggle) {
        const groupId = groupToggle.dataset.calendarGroupToggle;
        if (collapsedGroupIds.has(groupId)) {
          collapsedGroupIds.delete(groupId);
        } else {
          collapsedGroupIds.add(groupId);
        }
        renderFleetCalendar();
        return;
      }
      const vehicleAction = event.target.closest('.calendar-vehicle-action');
      if (vehicleAction) {
        handleVehicleAction(vehicleAction);
        return;
      }
      const target = event.target.closest('.calendar-event');
      if (!target) return;
      const eventId = target.dataset.eventId;
      const bookingEvent = currentEventsSnapshot.find(item => item.id === eventId);
      if (!bookingEvent) return;
      if (appState.currentRole === 'operations' && bookingEvent.type === 'rental') {
        return;
      }
      if (bookingEvent.bookingId) {
        closeCalendarDrawer();
        window.location.hash = buildHash(appState.currentRole, 'booking-detail', bookingEvent.bookingId);
        triggerRouter();
        return;
      }
      openCalendarDrawer(bookingEvent);
    });
    grid.dataset.bound = 'true';
  }

  calendarControlsBound = true;
};

export const renderFleetCalendar = () => {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  bindFleetCalendarControls();

  const classFilterValue = document.getElementById('fleet-calendar-class-filter')?.value || '';
  const statusFilterValue = document.getElementById('fleet-calendar-status-filter')?.value || '';
  const viewMode = appState.filters.calendar.view || 'week';
  const calendarMode = appState.filters.calendar.mode || 'timeline';
  const typeFilterValue = appState.filters.calendar.type || 'all';
  const bookingStatusFilterValue = appState.filters.calendar.bookingStatus || 'all';
  const searchValue = appState.filters.calendar.search?.toLowerCase() || '';
  const groupMode = appState.filters.calendar.group || 'vehicle';
  const storedLayers = appState.filters.calendar.layers;
  const hasExplicitLayers = Array.isArray(storedLayers);
  const activeLayers = hasExplicitLayers ? storedLayers.slice() : DEFAULT_LAYER_ORDER.slice();
  const layersDisabled = hasExplicitLayers && activeLayers.length === 0;
  const activeLayerSet = new Set(activeLayers);

  const viewCfg = getViewConfig(viewMode);

  if (!appState.calendarStart) {
    appState.calendarStart = calculateStartForToday();
  }

  const startDate = parseDateKey(appState.calendarStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + viewCfg.days - 1);
  const rangeEndExclusive = new Date(endDate);
  rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

  const dates = Array.from({ length: viewCfg.days }, (_, index) => new Date(startDate.getTime() + index * DAY_IN_MS));
  const totalRangeMs = viewCfg.days * DAY_IN_MS;
  const firstColWidth = 260;
  const columnsStyle = `grid-template-columns: ${firstColWidth}px repeat(${viewCfg.days}, minmax(110px, 1fr));`;
  const todayKey = getCalendarTodayKey();
  const todayIndex = dates.findIndex(date => formatDateKey(date) === todayKey);
  const dayWidthPercent = (DAY_IN_MS / totalRangeMs) * 100;
  const todayLeftPercent = todayIndex >= 0
    ? ((dates[todayIndex] - startDate) / totalRangeMs) * 100
    : null;
  const monthSegments = buildMonthSegments(dates);

  const viewSelect = document.getElementById('calendar-view-select');
  if (viewSelect) viewSelect.value = viewMode;
  const typeSelect = document.getElementById('calendar-type-filter');
  if (typeSelect) typeSelect.value = typeFilterValue;
  const bookingStatusSelect = document.getElementById('calendar-booking-status-filter');
  if (bookingStatusSelect) bookingStatusSelect.value = bookingStatusFilterValue;
  updateRangeSwitcherState(viewMode);
  updateModeToggleState(calendarMode);
  const searchInput = document.getElementById('calendar-search');
  if (searchInput && searchInput.value !== appState.filters.calendar.search) {
    searchInput.value = appState.filters.calendar.search || '';
  }
  const groupSelect = document.getElementById('calendar-group-select');
  if (groupSelect) groupSelect.value = groupMode;
  const layerInputs = Array.from(document.querySelectorAll('input[data-calendar-layer]'));
  layerInputs.forEach((input) => {
    const layer = input.dataset.calendarLayer;
    if (!layer) return;
    input.checked = layersDisabled ? false : activeLayerSet.has(layer);
  });

  let cars = MOCK_DATA.cars.slice();
  if (classFilterValue) cars = cars.filter(car => car.class === classFilterValue);
  if (statusFilterValue) cars = cars.filter(car => car.status === statusFilterValue);

  const attentionCarIds = new Set(MOCK_DATA.cars.filter(isAttentionCar).map(car => car.id));

  const ownerFilter = appState.currentRole === 'sales'
    ? (appState.filters.sales?.owner || 'all')
    : 'all';
  const filteredBookings = ownerFilter === 'all'
    ? MOCK_DATA.bookings
    : MOCK_DATA.bookings.filter(booking => (booking.ownerId || 'unassigned') === ownerFilter);
  const bookingMap = new Map(filteredBookings.map(booking => [booking.id, booking]));

  const bookingEvents = filteredBookings.map(booking => {
    const client = getClientById(booking.clientId);
    const title = client?.name || booking.clientName || `Booking #${booking.id}`;
    return {
      id: `booking-${booking.id}`,
      calendarEventId: null,
      bookingId: booking.id,
      carId: booking.carId,
      type: 'rental',
      title,
      bookingCode: booking.code,
      start: `${booking.startDate}T${booking.startTime || '09:00'}`,
      end: `${booking.endDate}T${booking.endTime || '18:00'}`,
      priority: booking.priority || 'medium',
      lifecycleStatus: getBookingLifecyclePhase(booking.status)
    };
  });

  const additionalEvents = MOCK_DATA.calendarEvents.map(event => ({
    id: event.id,
    calendarEventId: event.id,
    bookingId: null,
    carId: event.carId,
    type: event.type,
    title: event.title,
    start: event.start,
    end: event.end,
    priority: event.priority || 'low',
    lifecycleStatus: null
  }));

  const baseEvents = [...bookingEvents, ...additionalEvents];
  const rangeEvents = baseEvents.filter(event => eventOverlapsRange(event, startDate, rangeEndExclusive));

  if (searchValue) {
    const matchingCarIds = new Set(
      baseEvents
        .filter(event => `${event.title || ''} ${event.bookingCode || ''}`.toLowerCase().includes(searchValue))
        .map(event => event.carId)
    );
    cars = cars.filter(car => {
      const haystack = `${car.name} ${car.plate}`.toLowerCase();
      return haystack.includes(searchValue) || matchingCarIds.has(car.id);
    });
  }

  const displayCarIds = new Set(cars.map(car => car.id));
  let combinedEvents = rangeEvents.filter(event => displayCarIds.has(event.carId));
  if (typeFilterValue !== 'all') {
    combinedEvents = combinedEvents.filter(event => event.type === typeFilterValue);
  }
  if (bookingStatusFilterValue !== 'all') {
    combinedEvents = combinedEvents.filter(event => event.bookingId && event.lifecycleStatus === bookingStatusFilterValue);
  }
  if (layersDisabled) {
    combinedEvents = [];
  } else if (hasExplicitLayers && activeLayerSet.size) {
    combinedEvents = combinedEvents.filter(event => activeLayerSet.has(event.type));
  }

  const eventsByCar = combinedEvents.reduce((acc, event) => {
    acc[event.carId] = acc[event.carId] || [];
    acc[event.carId].push(event);
    return acc;
  }, {});

  Object.values(eventsByCar).forEach(list => list.sort((a, b) => new Date(a.start) - new Date(b.start)));

  const tasksByCar = collectTasksByCar(startDate, rangeEndExclusive, bookingMap);
  const ownerByCar = buildOwnerIndex(filteredBookings);
  const groups = buildGrouping(cars, groupMode, ownerByCar);
  Array.from(collapsedGroupIds).forEach((groupId) => {
    if (!groups.some(group => group.id === groupId)) {
      collapsedGroupIds.delete(groupId);
    }
  });

  const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

  const monthHeaderCells = monthSegments.length
    ? monthSegments.map(segment => `
                <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-l border-gray-200 bg-gray-50/60"
                     style="grid-column: span ${segment.length} / span ${segment.length};">
                    ${segment.label}
                </div>
            `).join('')
    : dates.map(() => '<div class="px-3 py-1 text-[11px] text-gray-400 border-l border-gray-100 bg-gray-50/60">—</div>').join('');

  const headerCells = dates.map(date => {
    const label = `${dayNames[date.getDay()]} ${date.getDate()}`;
    const dateStr = formatDateKey(date);
    const isToday = dateStr === todayKey;
    const highlightClass = isToday ? 'calendar-day-header-today text-indigo-700' : 'text-gray-500';
    return `<div class="calendar-day-header px-3 py-2 text-xs font-semibold uppercase tracking-wide ${highlightClass}" data-date="${dateStr}">
                ${label}
            </div>`;
  }).join('');

  const monthHeaderHtml = `
        <div class="grid border border-b-0 border-gray-200 bg-white" style="${columnsStyle}">
            <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-r border-gray-200 bg-white">
                Период
            </div>
            ${monthHeaderCells}
        </div>
    `;

  const dayHeaderHtml = `
        <div class="grid border border-gray-200 border-t-0 bg-white" style="${columnsStyle}">
            <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 border-r border-gray-200 flex items-center gap-2 bg-white">
                ${getIcon('car', 'w-4 h-4')}
                Vehicle
            </div>
            ${headerCells}
        </div>
    `;

  const headerHtml = `
        <div class="sticky top-0 z-10 space-y-[1px] bg-white">
            ${monthHeaderHtml}
            ${dayHeaderHtml}
        </div>
    `;

  const rowsHtml = groups.map(group => {
    const collapsed = group.collapsible && collapsedGroupIds.has(group.id);
    const chevron = getIcon('chevronRight', 'w-4 h-4');
    const groupHeader = group.collapsible
      ? `
                <div class="grid border border-t-0 border-gray-200 bg-slate-50" style="${columnsStyle}">
                    <div class="px-3 py-2 flex items-center border-r border-gray-200">
                        <button type="button" class="calendar-group-toggle inline-flex items-center gap-2 text-sm font-semibold text-gray-700" data-calendar-group-toggle="${group.id}">
                            <span class="inline-block transition-transform duration-150" style="transform: rotate(${collapsed ? 0 : 90}deg);">${chevron}</span>
                            ${group.label}
                        </button>
                    </div>
                    ${dates.map(() => '<div class="h-10 border-l border-gray-100 bg-slate-50"></div>').join('')}
                </div>
            `
      : '';

    if (group.collapsible && collapsed) {
      return groupHeader;
    }

    const carRows = group.cars.map(car => {
      const events = eventsByCar[car.id] || [];
      const eventBlocks = events.map((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) return '';

        const visibleStart = eventStart < startDate ? startDate : eventStart;
        const visibleEnd = eventEnd > rangeEndExclusive ? rangeEndExclusive : eventEnd;
        const durationMs = Math.max(visibleEnd - visibleStart, DAY_IN_MS);
        const leftPercent = Math.max(0, Math.min(100, ((visibleStart - startDate) / totalRangeMs) * 100));
        const widthPercent = Math.max(2, Math.min(100 - leftPercent, (durationMs / totalRangeMs) * 100));

        const meta = CALENDAR_EVENT_TYPES[event.type] || { color: 'bg-gray-100 text-gray-700', border: 'border-gray-200', label: event.type };
        const priorityMeta = PRIORITY_META[event.priority] || PRIORITY_META.medium;
        const startLabel = event.start ? formatDateTimeShort(eventStart) : '';
        const endLabel = event.end ? formatDateTimeShort(eventEnd) : '';
        const primaryLabel = escapeAttr(event.bookingCode || event.title || meta.label || 'Событие');
        const secondaryLabel = event.bookingCode ? escapeAttr(event.title || '') : '';
        const lifecycleStatus = event.lifecycleStatus;
        const lifecycleMeta = lifecycleStatus ? BOOKING_STATUS_PHASES[lifecycleStatus] : null;
        const lifecycleBadge = lifecycleMeta
          ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${lifecycleMeta.badge}">${lifecycleMeta.label}</span>`
          : '';
        const disableRentalInteraction = appState.currentRole === 'operations' && event.type === 'rental';
        const pointerClass = disableRentalInteraction ? 'pointer-events-none' : 'pointer-events-auto';
        const ariaDisabledAttr = disableRentalInteraction ? ' aria-disabled="true"' : '';

        return `
                    <div class="absolute calendar-event ${meta.color} border ${meta.border} ${priorityMeta.ring} text-xs font-medium px-2 py-1 rounded-md ${pointerClass}"${ariaDisabledAttr}
                         data-event-id="${event.id}"
                         data-booking-id="${event.bookingId || ''}"
                         data-calendar-event-id="${event.calendarEventId || ''}"
                         style="left: calc(${leftPercent}% + 4px); width: calc(${widthPercent}% - 8px); top: 6px; height: calc(100% - 12px);">
                        <div class="flex justify-between items-center gap-2 text-[10px] text-gray-600 mb-1">
                            <span>${startLabel}</span>
                            <span>${endLabel}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            ${lifecycleBadge}
                            <span class="inline-flex items-center gap-1 truncate">
                                <span class="w-2 h-2 rounded-full ${priorityMeta.dot}"></span>
                                <span class="truncate">${primaryLabel}</span>
                            </span>
                        </div>
                        ${secondaryLabel ? `<p class="text-[10px] text-gray-600 truncate">${secondaryLabel}</p>` : ''}
                    </div>
                `;
      }).join('');

      const statusDot = car.status === 'In Rent'
        ? 'bg-sky-500'
        : car.status === 'Maintenance'
          ? 'bg-amber-500'
          : 'bg-emerald-500';

      const statusLabel = CAR_STATUS_META[car.status]?.label || car.status || 'Неизвестно';
      const tooltipParts = [
        `Статус: ${statusLabel}`,
        car.serviceStatus?.label ? `Техсостояние: ${car.serviceStatus.label}` : null,
        car.serviceStatus?.nextService ? `След. сервис: ${formatDateOnly(car.serviceStatus.nextService)}` : null
      ].filter(Boolean);
      const tooltipText = tooltipParts.join(' • ');
      const carTasks = tasksByCar.get(car.id) || [];
      const taskBadges = carTasks.length
        ? `<div class="flex flex-wrap gap-1 mt-2">${carTasks.slice(0, 3).map((task) => {
          const priorityMeta = TASK_PRIORITY_META[task.priority] || TASK_PRIORITY_META.medium;
          return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] ${priorityMeta}">${DATE_LABEL_FORMATTER.format(task.deadline)} • ${task.title}</span>`;
        }).join('')}</div>`
        : '';

      const dateCells = dates.map(date => {
        const dateStr = formatDateKey(date);
        const isToday = dateStr === todayKey;
        const highlight = isToday ? 'calendar-day-cell-today' : '';
        return `<div class="calendar-day-cell ${highlight}" data-date="${dateStr}"></div>`;
      }).join('');

      const rowStyle = `${columnsStyle}${attentionCarIds.has(car.id) ? ' box-shadow: inset 4px 0 0 rgba(244, 114, 182, 0.25);' : ''}`;

      return `
                <div class="grid border border-t-0 border-gray-200 bg-white relative" style="${rowStyle}">
                    <div class="px-3 py-3 flex flex-col gap-2 border-r border-gray-200" title="${escapeAttr(tooltipText)}">
                        <div class="flex items-center gap-3">
                            <div class="relative">
                                <img src="${car.imagePath}" alt="${car.name}" class="w-12 h-8 object-cover rounded-md">
                                <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusDot} border border-white"></span>
                            </div>
                            <div class="min-w-0">
                                <button type="button" class="calendar-vehicle-action text-sm font-semibold text-indigo-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 truncate" data-car-id="${car.id}" data-vehicle-action="view-car">
                                    ${escapeAttr(car.name)}
                                </button>
                                <p class="text-xs text-gray-500">${escapeAttr(car.plate)}</p>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-1">
                            ${appState.currentRole === 'operations' ? '' : `<button class="calendar-vehicle-action inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:border-indigo-200 hover:text-indigo-600 transition" data-car-id="${car.id}" data-vehicle-action="create-booking">+ Бронь</button>`}
                            ${appState.currentRole === 'sales' ? '' : `<button class="calendar-vehicle-action inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:border-indigo-200 hover:text-indigo-600 transition" data-car-id="${car.id}" data-vehicle-action="schedule-maintenance">Сервис</button>`}
                        </div>
                        ${taskBadges}
                    </div>
                    ${dateCells}
                    <div class="absolute inset-y-2" style="left:${firstColWidth}px; right:0;">
                        ${eventBlocks}
                    </div>
                </div>
            `;
    }).join('');

    return groupHeader + carRows;
  }).join('');

  grid.innerHTML = headerHtml + rowsHtml;
  const fleetLoadContainer = document.getElementById('fleet-load-view');
  if (calendarMode === 'fleet') {
    grid.classList.add('hidden');
    if (fleetLoadContainer) {
      fleetLoadContainer.classList.remove('hidden');
      renderFleetLoadMatrix({
        groups,
        events: combinedEvents,
        rangeStart: startDate,
        rangeEndExclusive
      });
    }
    if (selectedEventId) {
      closeCalendarDrawer();
    }
  } else {
    grid.classList.remove('hidden');
    if (fleetLoadContainer) {
      fleetLoadContainer.classList.add('hidden');
      fleetLoadContainer.innerHTML = '';
    }
  }
  currentEventsSnapshot = combinedEvents;

  renderMiniMap({ cars, events: combinedEvents, rangeStart: startDate, rangeEndExclusive });

  const rangeLabel = document.getElementById('calendar-range-label');
  if (rangeLabel) {
    const startLabel = formatDateOnly(startDate);
    const endLabel = formatDateOnly(endDate);
    const label = startDate.getFullYear() === endDate.getFullYear()
      ? `${startLabel} — ${endLabel} ${endDate.getFullYear()}`
      : `${startLabel} ${startDate.getFullYear()} — ${endLabel} ${endDate.getFullYear()}`;
    rangeLabel.textContent = label;
  }

  renderCalendarSummary({
    allCars: MOCK_DATA.cars,
    visibleCars: cars,
    rangeEvents: combinedEvents,
    rangeStart: startDate,
    rangeEndExclusive,
    attentionCarIds,
    tasksByCar,
    bookingMap
  });
  renderCalendarAlerts(bookingEvents, MOCK_DATA.cars, startDate, tasksByCar);
  renderCalendarLegend(layersDisabled ? [] : activeLayers);
  updateBulkPanel(groupMode, groupMode === 'vehicle' ? cars.length : groups.length, combinedEvents);

  if (selectedEventId) {
    const activeEvent = currentEventsSnapshot.find(event => event.id === selectedEventId);
    if (activeEvent) {
      openCalendarDrawer(activeEvent, { preserveHighlight: true });
    } else {
      closeCalendarDrawer();
    }
  }
};

export const initFleetCalendar = (routerFn) => {
  routerHandler = routerFn;
};
