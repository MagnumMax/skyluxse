import { appState } from '../state/appState.js';
import {
  MOCK_DATA,
  BOOKING_PRIORITIES,
  BOOKING_TYPES,
  KANBAN_STATUS_META,
  KANBAN_STATUSES,
  getClientById,
  getCarById
} from '../data/index.js';
import { showToast } from '../ui/toast.js';
import { startTimers } from './timers.js';
import { getSalesRatingMeta } from './utils.js';

let kanbanFiltersBound = false;

const getBookingClientName = (booking) => {
  const client = getClientById(booking.clientId);
  return client?.name || booking.clientName || 'Client';
};

const getBookingCarName = (booking) => {
  const car = getCarById(booking.carId);
  return car?.name || booking.carName || 'Vehicle';
};

const bindKanbanFilters = () => {
  if (kanbanFiltersBound) return;
  const typeSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('kanban-filter-type'));
  const driverSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('kanban-filter-driver'));
  const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('kanban-search'));
  const resetBtn = document.getElementById('kanban-reset-filters');
  const createBtn = document.getElementById('kanban-create-booking');
  const filters = appState.filters.bookings;
  if (searchInput) {
    searchInput.value = filters.search || '';
  }

  if (driverSelect && !driverSelect.dataset.optionsReady) {
    const driverOptions = MOCK_DATA.drivers.map(driver => `<option value="${driver.id}">${driver.name}</option>`).join('');
    driverSelect.insertAdjacentHTML('beforeend', driverOptions);
    driverSelect.dataset.optionsReady = 'true';
  }
  if (typeSelect) {
    typeSelect.addEventListener('change', (event) => {
      const target = /** @type {HTMLSelectElement|null} */ (event.target);
      if (target) appState.filters.bookings.type = target.value;
      renderKanbanBoard();
    });
  }
  if (driverSelect) {
    driverSelect.addEventListener('change', (event) => {
      const target = /** @type {HTMLSelectElement|null} */ (event.target);
      if (target) appState.filters.bookings.driver = target.value;
      renderKanbanBoard();
    });
  }
  if (searchInput) {
    let searchTimeout = null;
    searchInput.addEventListener('input', (event) => {
      const target = /** @type {HTMLInputElement|null} */ (event.target);
      const value = target ? target.value.trim() : '';
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        appState.filters.bookings.search = value;
        renderKanbanBoard();
      }, 150);
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      appState.filters.bookings = { type: 'all', driver: 'all', search: '' };
      if (typeSelect) typeSelect.value = 'all';
      if (driverSelect) driverSelect.value = 'all';
      if (searchInput) searchInput.value = '';
      renderKanbanBoard();
    });
  }
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      showToast('Booking creation starts in Kommo. The feature is coming soon to SkyLuxse.', 'info');
    });
  }

  kanbanFiltersBound = true;
};

const applyKanbanAutomations = (booking, newStatus) => {
  if (newStatus === 'preparation' && !booking.driverId) {
    const availableDriver = MOCK_DATA.drivers.find(driver => driver.status === 'Available');
    if (availableDriver) {
      booking.driverId = availableDriver.id;
      availableDriver.status = 'On Task';
      booking.history = booking.history || [];
      booking.history.push({ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), event: `Driver ${availableDriver.name} assigned automatically` });
      showToast(`Driver ${availableDriver.name} assigned`, 'success');
    }
  }

  if (newStatus === 'delivery' && !booking.targetTime) {
    booking.targetTime = Date.now() + 2 * 60 * 60 * 1000;
    booking.history = booking.history || [];
    booking.history.push({ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), event: 'Delivery checkpoint set (+2 hours)' });
  }

  if (newStatus === 'settlement') {
    booking.targetTime = null;
    booking.history = booking.history || [];
    booking.history.push({ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), event: 'Booking moved to settlement' });
    showToast(`Booking #${booking.id} moved to settlement`, 'success');
  }
};

/**
 * @param {{ item: HTMLElement, from: HTMLElement, to: HTMLElement, oldIndex: number }} event
 */
const handleKanbanMove = (event) => {
  const bookingId = parseInt((event.item instanceof HTMLElement && event.item.dataset ? event.item.dataset.bookingId : '0'), 10);
  const booking = MOCK_DATA.bookings.find(b => b.id === bookingId);
  if (!booking) {
    renderKanbanBoard();
    return;
  }

  const originStatus = (event.from instanceof HTMLElement && event.from.dataset ? event.from.dataset.status : undefined);
  const targetStatus = (event.to instanceof HTMLElement && event.to.dataset ? event.to.dataset.status : undefined);

  if (!targetStatus || originStatus === targetStatus) {
    renderKanbanBoard();
    return;
  }

  const allowedTransitions = KANBAN_STATUS_META[originStatus]?.allowedTransitions || [];
  if (!allowedTransitions.includes(targetStatus)) {
    event.from.insertBefore(event.item, event.from.children[event.oldIndex]);
    showToast('Transition blocked by business rules', 'error');
    renderKanbanBoard();
    return;
  }

  booking.status = targetStatus;
  booking.history = booking.history || [];
  booking.history.push({
    ts: new Date().toISOString().slice(0, 16).replace('T', ' '),
    event: `Status changed to ${KANBAN_STATUS_META[targetStatus].label}`
  });

  applyKanbanAutomations(booking, targetStatus);
  renderKanbanBoard();
};

export const renderKanbanBoard = () => {
  const board = document.getElementById('kanban-board');
  if (!board) return;

  bindKanbanFilters();

  const filters = appState.filters.bookings;
  const ownerFilter = appState.currentRole === 'sales'
    ? (appState.filters.sales?.owner || 'all')
    : 'all';
  const typeSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('kanban-filter-type'));
  const driverSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('kanban-filter-driver'));
  const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('kanban-search'));

  if (typeSelect) typeSelect.value = filters.type;
  if (driverSelect) driverSelect.value = filters.driver;
  if (searchInput && searchInput.value !== filters.search) {
    searchInput.value = filters.search || '';
  }

  const driverMap = new Map(MOCK_DATA.drivers.map(driver => [driver.id, driver]));
  const searchTerm = (filters.search || '').trim().toLowerCase();

  const filteredBookings = MOCK_DATA.bookings.filter(booking => {
    if (filters.type !== 'all' && booking.type !== filters.type) return false;
    if (filters.driver !== 'all') {
      if (filters.driver === 'unassigned' && booking.driverId) return false;
      if (filters.driver !== 'unassigned' && String(booking.driverId || '') !== filters.driver) return false;
    }
    if (ownerFilter !== 'all') {
      const bookingOwner = booking.ownerId || 'unassigned';
      if (bookingOwner !== ownerFilter) return false;
    }
    const clientName = getBookingClientName(booking);
    const carName = getBookingCarName(booking);
    if (searchTerm) {
      const haystack = [
        booking.code,
        clientName,
        carName,
        booking.pickupLocation,
        booking.dropoffLocation
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(searchTerm)) return false;
    }
    return true;
  });

  const groupedBookings = Object.keys(KANBAN_STATUSES).reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});

  filteredBookings.forEach(booking => {
    const statusKey = booking.status;
    if (!groupedBookings[statusKey]) groupedBookings[statusKey] = [];
    groupedBookings[statusKey].push(booking);
  });

  board.innerHTML = Object.entries(KANBAN_STATUS_META).map(([statusKey, meta]) => {
    const bookings = groupedBookings[statusKey] || [];
    return `
        <div class="flex-shrink-0 w-72 rounded-2xl border border-border bg-card shadow-card flex flex-col">
            <div class="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 class="text-sm font-semibold text-foreground">${meta.label}</h3>
                <span class="text-xs text-muted-foreground">${bookings.length}</span>
            </div>
            <div class="p-3 space-y-3 flex-1 overflow-y-auto kanban-column" data-status="${statusKey}">
                ${bookings
    .map(booking => {
      const priorityMeta = BOOKING_PRIORITIES[booking.priority] || { badge: 'sl-badge sl-badge-neutral', cardAccent: 'border-l-4 border-border' };
      const typeMeta = BOOKING_TYPES[booking.type];
      const driver = booking.driverId ? driverMap.get(booking.driverId) : null;
      const timerHtml = ['new', 'preparation', 'delivery'].includes(booking.status) && booking.targetTime
        ? `<div class="card-timer text-xs text-destructive flex items-center" data-target-time="${booking.targetTime}"></div>`
        : '';
      const ratingMeta = getSalesRatingMeta(booking.salesService?.rating);
      const carName = getBookingCarName(booking);
      const clientName = getBookingClientName(booking);
      return `
                        <div class="sl-card p-4 space-y-3 cursor-pointer kanban-card ${priorityMeta.cardAccent}" data-booking-id="${booking.id}">
                            <div class="flex items-center justify-between">
                                <span class="${priorityMeta.badge}">${priorityMeta.label || 'Priority'}</span>
                                <span class="text-xs text-muted-foreground">${typeMeta ? typeMeta.label : ''}</span>
                            </div>
                            <div>
                                <p class="font-semibold text-sm text-foreground">${carName}</p>
                                <p class="text-xs text-muted-foreground">${clientName}</p>
                            </div>
                            <div class="flex items-center justify-between text-xs text-muted-foreground">
                                <span>${booking.startDate} → ${booking.endDate}</span>
                                <span>${driver ? driver.name.split(' ')[0] : 'No driver'}</span>
                            </div>
                            <div class="flex items-center justify-between text-[11px]">
                                <span class="text-muted-foreground font-medium">Service score</span>
                                <span class="${ratingMeta.chipClass}">${ratingMeta.label}</span>
                            </div>
                            ${timerHtml}
                        </div>`;
    }).join('') || '<div class="text-xs text-muted-foreground text-center py-2">No bookings</div>'}
            </div>
        </div>
    `;
  }).join('');

  document.querySelectorAll('.kanban-column').forEach(col => {
    new Sortable(col, { group: 'kanban', animation: 150, ghostClass: 'sortable-ghost', onEnd: handleKanbanMove });
  });

  startTimers();
};

export const resetKanbanFilters = () => {
  kanbanFiltersBound = false;
};
