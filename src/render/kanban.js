import { appState } from '../state/appState.js';
import {
    MOCK_DATA,
    BOOKING_PRIORITIES,
    BOOKING_TYPES,
    KANBAN_STATUS_META,
    KANBAN_STATUSES
} from '../data/index.js';
import { showToast } from '../ui/toast.js';
import { startTimers } from './timers.js';

let kanbanFiltersBound = false;

const bindKanbanFilters = () => {
    if (kanbanFiltersBound) return;
    const prioritySelect = document.getElementById('kanban-filter-priority');
    const typeSelect = document.getElementById('kanban-filter-type');
    const driverSelect = document.getElementById('kanban-filter-driver');
    const resetBtn = document.getElementById('kanban-reset-filters');
    const createBtn = document.getElementById('kanban-create-booking');

    if (driverSelect && !driverSelect.dataset.optionsReady) {
        const driverOptions = MOCK_DATA.drivers.map(driver => `<option value="${driver.id}">${driver.name}</option>`).join('');
        driverSelect.insertAdjacentHTML('beforeend', driverOptions);
        driverSelect.dataset.optionsReady = 'true';
    }


    if (prioritySelect) {
        prioritySelect.addEventListener('change', (event) => {
            appState.filters.bookings.priority = event.target.value;
            renderKanbanBoard();
        });
    }
    if (typeSelect) {
        typeSelect.addEventListener('change', (event) => {
            appState.filters.bookings.type = event.target.value;
            renderKanbanBoard();
        });
    }
    if (driverSelect) {
        driverSelect.addEventListener('change', (event) => {
            appState.filters.bookings.driver = event.target.value;
            renderKanbanBoard();
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            appState.filters.bookings = { priority: 'all', type: 'all', driver: 'all' };
            if (prioritySelect) prioritySelect.value = 'all';
            if (typeSelect) typeSelect.value = 'all';
            if (driverSelect) driverSelect.value = 'all';
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

const handleKanbanMove = (event) => {
    const bookingId = parseInt(event.item.dataset.bookingId, 10);
    const booking = MOCK_DATA.bookings.find(b => b.id === bookingId);
    if (!booking) {
        renderKanbanBoard();
        return;
    }

    const originStatus = event.from.dataset.status;
    const targetStatus = event.to.dataset.status;

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
    const prioritySelect = document.getElementById('kanban-filter-priority');
    const typeSelect = document.getElementById('kanban-filter-type');
    const driverSelect = document.getElementById('kanban-filter-driver');

    if (prioritySelect) prioritySelect.value = filters.priority;
    if (typeSelect) typeSelect.value = filters.type;
    if (driverSelect) driverSelect.value = filters.driver;

    const driverMap = new Map(MOCK_DATA.drivers.map(driver => [driver.id, driver]));

    const filteredBookings = MOCK_DATA.bookings.filter(booking => {
        if (filters.priority !== 'all' && booking.priority !== filters.priority) return false;
        if (filters.type !== 'all' && booking.type !== filters.type) return false;
        if (filters.driver !== 'all') {
            if (filters.driver === 'unassigned' && booking.driverId) return false;
            if (filters.driver !== 'unassigned' && String(booking.driverId || '') !== filters.driver) return false;
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
        <div class="flex-shrink-0 w-72 bg-gray-50 rounded-lg border border-gray-200 flex flex-col">
            <div class="p-4 border-b bg-white rounded-t-lg flex items-center justify-between">
                <h3 class="font-semibold text-sm">${meta.label}</h3>
                <span class="text-xs text-gray-400">${bookings.length}</span>
            </div>
            <div class="p-3 space-y-2 flex-1 overflow-y-auto kanban-column" data-status="${statusKey}">
                ${bookings
                    .map(booking => {
                        const priorityMeta = BOOKING_PRIORITIES[booking.priority] || { badge: 'bg-gray-100 text-gray-600', border: 'border-gray-200' };
                        const typeMeta = BOOKING_TYPES[booking.type];
                        const driver = booking.driverId ? driverMap.get(booking.driverId) : null;
                        const timerHtml = ['new', 'preparation', 'delivery'].includes(booking.status) && booking.targetTime
                            ? `<div class="card-timer text-xs text-red-600 flex items-center" data-target-time="${booking.targetTime}"></div>`
                            : '';
                        return `
                        <div class="geist-card p-4 space-y-3 cursor-pointer kanban-card border-l-4 ${priorityMeta.border}" data-booking-id="${booking.id}">
                            <div class="flex items-center justify-between">
                                <span class="px-2 py-1 rounded-full text-xs font-semibold ${priorityMeta.badge}">${priorityMeta.label || 'Priority'}</span>
                                <span class="text-xs text-gray-500">${typeMeta ? typeMeta.label : ''}</span>
                            </div>
                            <div>
                                <p class="font-semibold text-sm text-gray-900">${booking.carName}</p>
                                <p class="text-xs text-gray-500">${booking.clientName}</p>
                            </div>
                            <div class="flex items-center justify-between text-xs text-gray-500">
                                <span>${booking.startDate} → ${booking.endDate}</span>
                                <span>${driver ? driver.name.split(' ')[0] : 'No driver'}</span>
                            </div>
                            ${timerHtml}
                        </div>`;
                    }).join('') || '<div class="text-xs text-gray-400 text-center py-2">No bookings</div>'}
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
