import { MOCK_DATA } from '/src/data/index.js';

export const OFFLINE_STORAGE_KEY = 'skyluxse-offline-queue';

export function loadOfflineQueue() {
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    appState.offline.queuedActions = stored ? JSON.parse(stored) : [];
  } catch {
    appState.offline.queuedActions = [];
  }
}

export function persistOfflineQueue() {
  try {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(appState.offline.queuedActions));
  } catch {
    // ignore storage errors
  }
}

export function enqueueOfflineAction(action) {
  appState.offline.queuedActions.push({ ...action, ts: new Date().toISOString() });
  persistOfflineQueue();
}

export function processOfflineAction(action) {
  if (action.type === 'driver-task-complete') {
    const booking = MOCK_DATA.bookings.find(b => String(b.id) === String(action.bookingId));
    if (booking) {
      booking.status = 'settlement';
      booking.mileage = action.payload.odometer;
      booking.fuelLevel = action.payload.fuelLevel;
      booking.cashCollected = action.payload.cashValue;
      booking.addonServices = action.payload.services;
      booking.history = booking.history || [];
      booking.history.push({ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), event: 'Driver data synchronized' });
    }
    const relatedTask = MOCK_DATA.tasks.find(t => String(t.bookingId) === String(action.bookingId));
    if (relatedTask) {
      relatedTask.status = 'done';
      relatedTask.completedPayload = action.payload;
    }
  }
}

export function syncOfflineQueue() {
  if (!appState.offline.queuedActions.length) return;
  const queueCopy = [...appState.offline.queuedActions];
  queueCopy.forEach(processOfflineAction);
  appState.offline.queuedActions = [];
  persistOfflineQueue();
}

export const getStartOfWeek = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start of week
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
};

export const appState = {
  currentRole: 'operations',
  currentPage: '',
  timerInterval: null,
  loginEmail: '',
  filters: {
    bookings: { type: 'all', driver: 'all', search: '' },
    analytics: { range: '7d', segment: 'all', vehicleClass: 'all', dateFrom: '', dateTo: '' },
    calendar: {
      view: 'week',
      type: 'all',
      bookingStatus: 'all',
      search: '',
      availableOnly: false,
      attentionOnly: false,
      group: 'class',
      layers: ['rental', 'maintenance', 'repair'],
      mode: 'timeline'
    },
    tasks: { status: 'all', type: 'all', assignee: 'all' },
    clientsTable: { invoice: '', name: '', email: '', phone: '', search: '' },
    sales: { owner: 'all', source: 'all' }
  },
  offline: {
    queuedActions: [],
    lastSync: null,
    enabled: false
  },
  salesContext: {
    activeLeadId: null
  },
  clientContext: {
    activeClientId: 1
  },
  driverContext: {
    activeDriverId: 1,
    tracking: {
      enabled: false,
      intervalId: null,
      coordinates: null,
      lastUpdated: null
    }
  },
  maintenanceContext: {
    defaultCarId: null,
    defaultType: 'maintenance'
  },
  bookingContext: {
    mode: 'create',
    draftBookingId: null
  },
  calendarStart: null, // will be initialized below
  calendarTodayOverride: '2025-10-25'
};

appState.calendarStart = appState.calendarTodayOverride;

const salesPipeline = MOCK_DATA.salesPipeline;
if (
  salesPipeline &&
    Array.isArray(salesPipeline.leads) &&
    salesPipeline.leads.length > 0
) {
  appState.salesContext.activeLeadId = salesPipeline.leads[0].id;
}

loadOfflineQueue();
if (!appState.offline.enabled) syncOfflineQueue();
