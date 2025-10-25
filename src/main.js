import {
  MOCK_DATA,
  TASK_TYPES,
  ROLE_EMAIL_PRESETS,
  ROLES_CONFIG
} from '/src/data/index.js';
import {
  appState,
  enqueueOfflineAction,
  syncOfflineQueue,
  getStartOfWeek
} from '/src/state/appState.js';
import {
  HASH_DEFAULT_SELECTOR,
  buildHash,
  parseHash,
  isDefaultSelector
} from '/src/state/navigation.js';
import { renderKanbanBoard } from '/src/render/kanban.js';
import { renderAnalyticsPage, renderSalesPipeline } from '/src/render/charts.js';
import { startTimers } from '/src/render/timers.js';
import { formatCurrency, formatDateLabel } from '/src/render/formatters.js';
import { renderFleetCalendar, initFleetCalendar } from '/src/render/fleetCalendar.js';
import { showToast } from '/src/ui/toast.js';
import { getIcon } from '/src/ui/icons.js';
import { createRouter } from '/src/router.js';

/**
 * Основная точка входа приложения SkyLuxse
 * Инициализирует все компоненты, обработчики событий и роутинг
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 SkyLuxse приложение загружается...');
  console.log('📍 Текущий URL:', window.location.href);
  console.log('🔍 Поиск service worker...');

  // Регистрация Service Worker для оффлайн поддержки
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('✅ Service Worker зарегистрирован'))
      .catch(err => console.error('❌ Ошибка регистрации SW:', err));
  } else {
    console.log('⚠️ Service Worker не поддерживается');
  }

  // --- DOM Elements ---
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  const appContainer = document.getElementById('app-container');
  const desktopShell = document.getElementById('desktop-shell');
  const mobileViewContainer = document.getElementById('mobile-view');
  const bookingDetailContent = document.getElementById('booking-detail-content');
  const taskDetailContent = document.getElementById('task-detail-content');
  const maintenanceCreateContent = document.getElementById('maintenance-create-content');
  const bookingCreateContent = document.getElementById('booking-create-content');
  const vehicleCreateContent = document.getElementById('vehicle-create-content');
  const documentViewerImage = document.getElementById('document-viewer-image');
  const driverTaskDetailContent = document.getElementById('driver-task-detail-content');
  const pageBackButtons = document.querySelectorAll('.page-back-button');
  const desktopPages = Array.from(document.querySelectorAll('#content-area > section.page'));
  const pageActionButton = document.getElementById('page-action-button');
  const salesOwnerFilterWrapper = document.getElementById('sales-owner-filter-wrapper');
  const salesOwnerFilter = document.getElementById('sales-owner-filter');
  const loginRoleSelect = document.getElementById('login-role');
  const loginEmailInput = document.getElementById('email');
  const requestOtpBtn = document.getElementById('request-otp');
  const otpContainer = document.getElementById('otp-container');
  const otpInput = document.getElementById('otp');
  const sidebarCollapseBtn = document.getElementById('sidebar-collapse');

  /**
   * @param {string} basePage 
   * @returns {string}
   */
  const getDetailPageId = (basePage) => {
    if (basePage === 'bookings') return 'booking-detail';
    if (basePage === 'fleet-table') return 'fleet-detail';
    if (basePage === 'clients-table') return 'client-detail';
    return basePage.replace('-table', '-detail');
  };

  pageBackButtons.forEach(button => {
    button.addEventListener('click', (/** @type {Event} */ event) => {
      event.preventDefault();
      const htmlButton = /** @type {HTMLElement} */ (button);
      const targetPage = htmlButton.dataset.backPage;
      if (targetPage) {
        window.location.hash = buildHash(appState.currentRole, targetPage);
      } else {
        window.history.back();
      }
    });
    
    // --- ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК РЕСУРСОВ ---
    window.addEventListener('error', (event) => {
      console.error('🚨 Глобальная ошибка:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    
      // Специальная обработка ошибок ресурсов
      if (event.filename && event.filename.includes('cdn')) {
        console.error('🌐 Ошибка загрузки внешнего ресурса:', event.filename);
      }
    });
    
    // Обработка ошибок промисов
    window.addEventListener('unhandledrejection', (event) => {
      console.error('💥 Необработанная ошибка промиса:', event.reason);
    });
    
    console.log('✅ Диагностические логи добавлены');
    
  });
  if (otpInput) {
    otpInput.setAttribute('disabled', 'disabled');
  }

  const getSalesOwnerOptions = () => (MOCK_DATA.salesPipeline?.owners || []);

  const refreshSalesOwnerFilter = () => {
    if (!salesOwnerFilter) return;
    const owners = getSalesOwnerOptions();
    const currentValue = appState.filters.sales?.owner || 'all';
    let ownerChanged = false;
    const optionsHtml = [
      '<option value="all">All managers</option>',
      owners.map(owner => `<option value="${owner.id}">${owner.name}</option>`).join('')
    ].join('');
    salesOwnerFilter.innerHTML = optionsHtml;
    if (currentValue !== 'all' && !owners.some(owner => owner.id === currentValue)) {
      appState.filters.sales.owner = 'all';
      ownerChanged = true;
    }
    const selectElement = /** @type {HTMLSelectElement} */ (salesOwnerFilter);
    selectElement.value = appState.filters.sales.owner || 'all';
    selectElement.dataset.bound = 'true';
    if (ownerChanged) {
      renderCurrentPageWithSalesFilter();
    }
  };

  /**
   * @param {string} role
   */
  const updateSalesOwnerFilterVisibility = (role) => {
    if (!salesOwnerFilterWrapper) return;
    if (role === 'sales') {
      refreshSalesOwnerFilter();
      salesOwnerFilterWrapper.classList.remove('hidden');
    } else {
      salesOwnerFilterWrapper.classList.add('hidden');
    }
  };

  if (salesOwnerFilter && !salesOwnerFilter.dataset.globalHandler) {
    salesOwnerFilter.addEventListener('change', (/** @type {Event} */ event) => {
      const target = /** @type {HTMLSelectElement} */ (event.target);
      appState.filters.sales.owner = target?.value || 'all';
      renderCurrentPageWithSalesFilter();
    });
    salesOwnerFilter.dataset.globalHandler = 'true';
  }

  const updateSidebarToggleState = () => {
    if (!sidebarCollapseBtn || !sidebar) return;
    const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
    sidebarCollapseBtn.innerHTML = isCollapsed
      ? getIcon('chevronRight', 'w-5 h-5')
      : getIcon('chevronLeft', 'w-5 h-5');
    sidebarCollapseBtn.setAttribute('aria-expanded', String(!isCollapsed));
    sidebarCollapseBtn.setAttribute('aria-label', isCollapsed ? 'Развернуть панель' : 'Свернуть панель');
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const toStatusKey = (value) => (value ?? '').toString().trim().toLowerCase();
  const toSlug = (value) => (value ?? '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const parseDateTimeLocal = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const timeValue = (timeStr || '00:00').trim();
    const normalized = `${dateStr}T${timeValue.length === 5 ? `${timeValue}:00` : timeValue}`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const rangesOverlap = (startA, endA, startB, endB) => {
    if (!startA || !endA || !startB || !endB) return false;
    return startA < endB && startB < endA;
  };

  const detectExtensionConflicts = (booking, start, end, options = {}) => {
    const messages = [];
    const addMessage = (text, type = 'error') => messages.push({ text, type });

    if (!start || !end) {
      return { messages, hasBlocking: false };
    }

    if (end <= start) {
      addMessage('End time must be later than start time', 'error');
    }

    const baseEnd = parseDateTimeLocal(booking.endDate, booking.endTime);
    if (baseEnd && start < baseEnd) {
      addMessage('Extension should begin after the current end time', 'error');
    }

    if (Array.isArray(booking.extensions)) {
      booking.extensions.forEach(ext => {
        if (!ext || toStatusKey(ext.status) === 'cancelled') return;
        const extStart = parseDateTimeLocal(ext.startDate || ext.period?.startDate, ext.startTime || ext.period?.startTime);
        const extEnd = parseDateTimeLocal(ext.endDate || ext.period?.endDate, ext.endTime || ext.period?.endTime);
        if (!extStart || !extEnd) return;
        if (options.skipExtensionId && options.skipExtensionId === ext.id) return;
        if (rangesOverlap(start, end, extStart, extEnd)) {
          addMessage(`Overlaps with extension ${ext.label || ext.id || ''}`, 'error');
        }
      });
    }

    const carId = booking.carId;
    if (carId) {
      MOCK_DATA.bookings.forEach(other => {
        if (!other || Number(other.carId) !== Number(carId)) return;
        if (String(other.id) === String(booking.id)) return;
        const otherStart = parseDateTimeLocal(other.startDate, other.startTime);
        const otherEnd = parseDateTimeLocal(other.endDate, other.endTime);
        if (rangesOverlap(start, end, otherStart, otherEnd)) {
          addMessage(`Vehicle already booked (${other.code || `#${other.id}`})`, 'error');
        }
        if (Array.isArray(other.extensions)) {
          other.extensions.forEach(ext => {
            if (!ext || toStatusKey(ext.status) === 'cancelled') return;
            const extStart = parseDateTimeLocal(ext.startDate || ext.period?.startDate, ext.startTime || ext.period?.startTime);
            const extEnd = parseDateTimeLocal(ext.endDate || ext.period?.endDate, ext.endTime || ext.period?.endTime);
            if (rangesOverlap(start, end, extStart, extEnd)) {
              addMessage(`Vehicle in use by extension ${ext.label || ext.id} for booking ${other.code || `#${other.id}`}`, 'error');
            }
          });
        }
      });

      (MOCK_DATA.calendarEvents || []).forEach(event => {
        if (!event || Number(event.carId) !== Number(carId)) return;
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        if (rangesOverlap(start, end, eventStart, eventEnd)) {
          addMessage(`Conflicts with ${event.type || 'calendar'} event "${event.title || event.id}"`, 'warning');
        }
      });
    }

    if (start < new Date()) {
      addMessage('Extension start is in the past', 'warning');
    }

    if ((booking.totalAmount || 0) > (booking.paidAmount || 0)) {
      addMessage('Base booking has outstanding balance', 'warning');
    }

    if (baseEnd && start && !options.maintenanceSlot) {
      const gapHours = (start.getTime() - baseEnd.getTime()) / 3600000;
      if (gapHours > 6) {
        addMessage('Gap before extension exceeds 6 hours — consider inserting a maintenance buffer', 'warning');
      }
    }

    return {
      messages,
      hasBlocking: messages.some(msg => msg.type === 'error')
    };
  };

  const collectExtensionPlannerValues = (planner) => {
    if (!planner) return null;
    const getField = (field) => {
      const input = planner.querySelector(`[data-extension-field="${field}"]`);
      if (!input) return '';
      if (input instanceof window.HTMLInputElement && input.type === 'checkbox') {
        return input.checked;
      }
      return input.value || '';
    };
    const baseAmount = Number.parseFloat(getField('baseAmount')) || 0;
    const addonsAmount = Number.parseFloat(getField('addonsAmount')) || 0;
    const feesAmount = Number.parseFloat(getField('feesAmount')) || 0;
    const discountsAmount = Number.parseFloat(getField('discountsAmount')) || 0;
    return {
      startDate: getField('startDate'),
      startTime: getField('startTime') || '00:00',
      endDate: getField('endDate'),
      endTime: getField('endTime') || '00:00',
      baseAmount,
      addonsAmount,
      feesAmount,
      discountsAmount,
      maintenanceSlot: Boolean(getField('maintenanceSlot')),
      notes: getField('notes')
    };
  };

  const updateExtensionPlannerView = (planner, booking) => {
    if (!planner || !booking) return null;
    const values = collectExtensionPlannerValues(planner);
    if (!values) return null;
    const start = parseDateTimeLocal(values.startDate, values.startTime);
    const end = parseDateTimeLocal(values.endDate, values.endTime);
    const totalRaw = values.baseAmount + values.addonsAmount + values.feesAmount - values.discountsAmount;
    const total = totalRaw > 0 ? totalRaw : 0;
    const totalEl = planner.querySelector('[data-role="extension-total"]');
    if (totalEl) totalEl.textContent = formatCurrency(total);
    const outstandingEl = planner.querySelector('[data-role="extension-outstanding"]');
    if (outstandingEl) outstandingEl.textContent = formatCurrency(total);
    const endPreview = planner.querySelector('[data-role="extension-end-preview"]');
    if (endPreview) {
      endPreview.textContent = end ? formatDateLabel(end) : '—';
    }
    const conflictEl = planner.querySelector('.extension-conflict-alert');
    const conflict = detectExtensionConflicts(booking, start, end, { maintenanceSlot: values.maintenanceSlot });
    if (conflictEl) {
      if (conflict.messages.length) {
        conflictEl.innerHTML = `<ul class="list-disc pl-4 space-y-1">${conflict.messages.map(item => `<li>${escapeHtml(item.text)}</li>`).join('')}</ul>`;
        conflictEl.classList.remove('hidden');
        conflictEl.classList.toggle('border-rose-200', conflict.hasBlocking);
        conflictEl.classList.toggle('bg-rose-50', conflict.hasBlocking);
        conflictEl.classList.toggle('text-rose-700', conflict.hasBlocking);
        conflictEl.classList.toggle('border-amber-200', !conflict.hasBlocking);
        conflictEl.classList.toggle('bg-amber-50', !conflict.hasBlocking);
        conflictEl.classList.toggle('text-amber-700', !conflict.hasBlocking);
      } else {
        conflictEl.classList.add('hidden');
        conflictEl.innerHTML = '';
      }
    }
    return { values, start, end, total, conflict };
  };

  const findBookingById = (id) => MOCK_DATA.bookings.find(booking => String(booking.id) === String(id));

  const getBookingIdFromElement = (element) => {
    const container = element?.closest('[data-booking-id]');
    if (container?.dataset.bookingId) {
      return container.dataset.bookingId;
    }
    const parsed = parseHash(window.location.hash);
    return parsed.selector && !isDefaultSelector(parsed.selector) ? parsed.selector : null;
  };

  const handlePlannerChange = (target) => {
    if (!target) return;
    const planner = target.closest('.extension-planner');
    if (!planner || planner.classList.contains('hidden')) return;
    const bookingId = planner.dataset.bookingId || getBookingIdFromElement(planner);
    const booking = bookingId ? findBookingById(bookingId) : null;
    if (booking) {
      updateExtensionPlannerView(planner, booking);
    }
  };

  const getNextTaskId = () => {
    const maxId = MOCK_DATA.tasks.reduce((max, task) => {
      const numericId = Number(task.id) || 0;
      return numericId > max ? numericId : max;
    }, 0);
    return maxId + 1;
  };

  const renderSidebar = () => {
    const roleConfig = ROLES_CONFIG[/** @type {keyof typeof ROLES_CONFIG} */ (appState.currentRole)];
    const navEl = document.getElementById('sidebar-nav');
    const profileEl = document.getElementById('sidebar-profile');

    if (!roleConfig || roleConfig.layout !== 'desktop') {
      if (navEl) navEl.innerHTML = '';
      if (profileEl) profileEl.innerHTML = '';
      updateSalesOwnerFilterVisibility(appState.currentRole);
      return;
    }
    
    if (!navEl || !profileEl) return;
            
    navEl.innerHTML = roleConfig.nav.map((/** @type {any} */ item) => `
                <a href="${buildHash(appState.currentRole, item.id)}" class="nav-link flex items-center gap-3 px-3 py-2 rounded-lg text-sm" data-page="${item.id}">
                    ${getIcon(item.icon, 'w-5 h-5')}
                    <span class="font-medium">${item.name}</span>
                </a>
            `).join('');

    const displayName = roleConfig.label || roleConfig.name;
    profileEl.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600 uppercase">
                        ${displayName.substring(0,1)}
                    </div>
                    <div>
                        <p class="font-semibold text-sm">${displayName}</p>
                        <p class="text-xs text-gray-500">${roleConfig.email}</p>
                    </div>
                    <button id="sidebar-logout" type="button" class="ml-auto p-2 text-gray-500 hover:text-black" title="Log out">
                        ${getIcon('logOut', 'w-5 h-5')}
                    </button>
                </div>
            `;
    const logoutBtn = profileEl.querySelector('#sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (appContainer) appContainer.classList.add('hidden');
        const loginPage = document.getElementById('page-login');
        if (loginPage) loginPage.classList.remove('hidden');
        window.location.hash = '';

        if (otpContainer) {
          otpContainer.classList.add('hidden');
        }

        if (otpInput) {
          const inputElement = /** @type {HTMLInputElement} */ (otpInput);
          inputElement.value = '';
          inputElement.setAttribute('disabled', 'disabled');
        }

        if (requestOtpBtn) {
          requestOtpBtn.textContent = 'Send code';
          requestOtpBtn.disabled = false;
        }

        window.location.href = '/';
      });
    }
    updateActiveLink();
    updateSidebarToggleState();
    updateSalesOwnerFilterVisibility(appState.currentRole);
  };

  const updateActiveLink = () => {
    const pageId = appState.currentPage.split('/')[0];
    document.querySelectorAll('#sidebar-nav a').forEach(a => {
      if (a.dataset.page === pageId) {
        a.classList.add('nav-link-active');
      } else {
        a.classList.remove('nav-link-active');
      }
    });
  };
  const renderVehicleCell = (car) => {
    const statusClasses = {
      Available: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      'In Rent': 'bg-blue-50 text-blue-700 border border-blue-100',
      Maintenance: 'bg-amber-50 text-amber-700 border border-amber-100'
    };
    const badgeClass = statusClasses[car.status] || 'bg-gray-100 text-gray-600 border border-gray-200';
    return `
                <div class="flex items-center gap-3">
                    <img src="${car.imagePath}" alt="${car.name}" class="w-14 h-10 object-cover rounded-md">
                    <div>
                        <p class="font-semibold text-sm text-gray-900">${car.name}</p>
                        <p class="text-xs text-gray-500">${car.plate} · ${car.color} · ${car.year}</p>
                        <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${badgeClass}">${car.status}</span>
                    </div>
                </div>
            `;
  };

  const renderClientInfo = (client) => {
    const statusClasses = {
      VIP: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
      Gold: 'bg-amber-50 text-amber-700 border border-amber-100',
      Silver: 'bg-gray-50 text-gray-600 border border-gray-200'
    };
    const badgeClass = statusClasses[client.status] || 'bg-gray-100 text-gray-600 border border-gray-200';
    return `
                <div class="space-y-1">
                    <p class="font-semibold text-sm text-gray-900">${client.name}</p>
                    <p class="text-xs text-gray-500">${client.phone || '—'}</p>
                    <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${badgeClass}">${client.status}</span>
                </div>
            `;
  };

  const renderClientFinance = (client) => {
    const outstandingClass = client.outstanding > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600';
    return `
                <div class="space-y-1 text-sm text-gray-600">
                    <div class="flex items-center justify-between">
                        <span>Lifetime Value</span>
                        <span class="font-medium text-gray-900">${formatCurrency(client.lifetimeValue || client.turnover)}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span>Outstanding</span>
                        <span class="${outstandingClass}">${formatCurrency(client.outstanding)}</span>
                    </div>
                </div>
            `;
  };

  const renderClientDocuments = (client) => {
    if (!client.documents || !client.documents.length) {
      return '<span class="text-xs text-gray-400">Documents not uploaded</span>';
    }
    const statusClasses = {
      verified: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      'needs-review': 'bg-amber-50 text-amber-700 border border-amber-100'
    };
    return client.documents.map(doc => {
      const cls = statusClasses[doc.status] || 'bg-gray-100 text-gray-600 border border-gray-200';
      const attrs = doc.url ? `data-doc-url="${doc.url}"` : '';
      return `<button type="button" class="doc-badge inline-flex items-center px-2 py-1 mr-2 mb-2 text-xs font-medium rounded-md ${cls}" ${attrs}>${doc.name}</button>`;
    }).join('');
  };

  const renderTableView = (dataType) => {
    const tableTitleEl = document.getElementById('table-title');
    const tableHeadEl = document.getElementById('table-head');
    const tableBodyEl = document.getElementById('table-body');
    const tableSearchWrapper = document.getElementById('table-search-wrapper');
    const tableSearchInput = document.getElementById('table-search');
    let columns = [];
    let rows = [];

    if (dataType === 'fleet-table') {
      tableTitleEl.textContent = 'Fleet';
      rows = MOCK_DATA.cars;
      columns = [
        { label: 'Vehicle', render: renderVehicleCell }
      ];
      if (tableSearchWrapper) tableSearchWrapper.classList.add('hidden');
    } else if (dataType === 'clients-table') {
      tableTitleEl.textContent = 'Clients';
      rows = MOCK_DATA.clients;
      if (appState.currentRole === 'sales') {
        const ownerFilter = appState.filters.sales?.owner || 'all';
        if (ownerFilter !== 'all') {
          const leadClientIds = (MOCK_DATA.salesPipeline?.leads || [])
            .filter(lead => lead.ownerId === ownerFilter)
            .map(lead => Number(lead.clientId));
          const bookingClientIds = (MOCK_DATA.bookings || [])
            .filter(booking => booking.ownerId === ownerFilter)
            .map(booking => Number(booking.clientId));
          const allowedClientIds = new Set([...leadClientIds, ...bookingClientIds].filter(Boolean));
          rows = rows.filter(client => allowedClientIds.has(Number(client.id)));
        }
      }
      const searchValue = appState.filters.clientsTable?.search?.toLowerCase().trim();
      if (searchValue) {
        rows = rows.filter((client) => {
          const haystack = [
            client.name,
            client.email,
            client.phone,
            client.company,
            client.segment
          ].filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(searchValue);
        });
      }
      columns = [
        { label: 'Client', render: renderClientInfo },
        { label: 'Finances', render: renderClientFinance },
        { label: 'Documents', render: renderClientDocuments }
      ];
      if (tableSearchWrapper) {
        tableSearchWrapper.classList.remove('hidden');
        if (tableSearchInput) {
          if (tableSearchInput.dataset.bound !== 'true') {
            let searchTimeout = null;
            tableSearchInput.addEventListener('input', (event) => {
              const value = event.target.value;
              clearTimeout(searchTimeout);
              searchTimeout = setTimeout(() => {
                appState.filters.clientsTable.search = value;
                renderTableView('clients-table');
              }, 150);
            });
            tableSearchInput.dataset.bound = 'true';
          }
          if (tableSearchInput.value !== appState.filters.clientsTable.search) {
            tableSearchInput.value = appState.filters.clientsTable.search || '';
          }
        }
      }
    } else {
      return;
    }

    tableHeadEl.innerHTML = `${columns.map(col => `<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">${col.label}</th>`).join('')}<th class="px-6 py-3"></th>`;

    const detailPage = dataType.endsWith('-table') ? getDetailPageId(dataType) : dataType;

    tableBodyEl.innerHTML = rows.map(row => `
                <tr class="hover:bg-gray-50">
                    ${columns.map(col => `<td class="px-6 py-4 align-top text-sm text-gray-700">${col.render(row)}</td>`).join('')}
                    <td class="px-6 py-4 text-right text-sm font-medium">
                        <a href="${buildHash(appState.currentRole, detailPage, row.id)}" class="text-indigo-600 hover:text-indigo-900">View details</a>
                    </td>
                </tr>
            `).join('');

    tableBodyEl.querySelectorAll('.doc-badge[data-doc-url]').forEach(button => {
      button.addEventListener('click', () => {
        const url = button.dataset.docUrl;
        if (url) openDocumentPage(url);
      });
    });
  };
        
  let taskFiltersBound = false;

  const bindTaskFilters = () => {
    if (taskFiltersBound) return;
    const statusSelect = document.getElementById('tasks-filter-status');
    const typeSelect = document.getElementById('tasks-filter-type');
    const assigneeSelect = document.getElementById('tasks-filter-assignee');
    const resetBtn = document.getElementById('tasks-clear-filters');

    if (assigneeSelect && !assigneeSelect.dataset.optionsReady) {
      const options = MOCK_DATA.drivers.map(driver => `<option value="${driver.id}">${driver.name}</option>`).join('');
      assigneeSelect.insertAdjacentHTML('beforeend', options);
      assigneeSelect.dataset.optionsReady = 'true';
    }

    if (statusSelect) statusSelect.addEventListener('change', e => { appState.filters.tasks.status = e.target.value; renderTasksPage(); });
    if (typeSelect) typeSelect.addEventListener('change', e => { appState.filters.tasks.type = e.target.value; renderTasksPage(); });
    if (assigneeSelect) assigneeSelect.addEventListener('change', e => { appState.filters.tasks.assignee = e.target.value; renderTasksPage(); });
    if (resetBtn) resetBtn.addEventListener('click', () => {
      appState.filters.tasks = { status: 'all', type: 'all', assignee: 'all' };
      if (statusSelect) statusSelect.value = 'all';
      if (typeSelect) typeSelect.value = 'all';
      if (assigneeSelect) assigneeSelect.value = 'all';
      renderTasksPage();
    });

    taskFiltersBound = true;
  };

  let driverControlsBound = false;

  const getActiveDriver = () => {
    const driverId = appState.driverContext.activeDriverId;
    return MOCK_DATA.drivers.find(driver => driver.id === driverId) || MOCK_DATA.drivers[0] || null;
  };

  const updateDriverLocationCard = () => {
    const coordsEl = document.getElementById('driver-current-coords');
    const updatedEl = document.getElementById('driver-location-updated');
    const trackingBtn = document.getElementById('driver-toggle-tracking');
    const { tracking } = appState.driverContext;
    if (trackingBtn) {
      trackingBtn.textContent = tracking.enabled ? 'Disable GPS' : 'Enable GPS';
    }
    if (!coordsEl || !updatedEl) return;
    if (tracking.enabled && tracking.coordinates) {
      const { lat, lng } = tracking.coordinates;
      coordsEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      updatedEl.textContent = tracking.lastUpdated ? new Date(tracking.lastUpdated).toLocaleTimeString('ru-RU') : '—';
    } else {
      coordsEl.textContent = 'GPS disabled';
      updatedEl.textContent = '—';
    }
  };

  const stopDriverTracking = () => {
    const { tracking } = appState.driverContext;
    if (tracking.intervalId) {
      clearInterval(tracking.intervalId);
      tracking.intervalId = null;
    }
    tracking.enabled = false;
    tracking.coordinates = null;
    tracking.lastUpdated = null;
    updateDriverLocationCard();
  };

  const startDriverTracking = () => {
    const driver = getActiveDriver();
    if (!driver) return;
    const { tracking } = appState.driverContext;
    if (tracking.intervalId) clearInterval(tracking.intervalId);
    tracking.enabled = true;

    const baseLat = driver.location?.lat || 25.2048;
    const baseLng = driver.location?.lng || 55.2708;

    const updateLocation = () => {
      const jitterLat = (Math.random() - 0.5) * 0.01;
      const jitterLng = (Math.random() - 0.5) * 0.01;
      tracking.coordinates = { lat: baseLat + jitterLat, lng: baseLng + jitterLng };
      tracking.lastUpdated = new Date().toISOString();
      updateDriverLocationCard();
    };

    updateLocation();
    tracking.intervalId = setInterval(updateLocation, 5000);
  };

  const bindDriverViewControls = () => {
    if (driverControlsBound) return;
    const selector = document.getElementById('driver-selector');
    const trackingBtn = document.getElementById('driver-toggle-tracking');
    if (selector) {
      selector.innerHTML = MOCK_DATA.drivers.map(driver => `<option value="${driver.id}">${driver.name}</option>`).join('');
      selector.value = String(appState.driverContext.activeDriverId || MOCK_DATA.drivers[0]?.id || '');
      selector.addEventListener('change', (event) => {
        const newId = parseInt(event.target.value, 10);
        if (!Number.isNaN(newId)) {
          appState.driverContext.activeDriverId = newId;
          if (appState.driverContext.tracking.enabled) {
            startDriverTracking();
          } else {
            updateDriverLocationCard();
          }
          renderDriverTasks();
        }
      });
    }

    if (trackingBtn) {
      trackingBtn.addEventListener('click', () => {
        if (appState.driverContext.tracking.enabled) {
          stopDriverTracking();
          showToast('GPS tracking disabled', 'info');
        } else {
          startDriverTracking();
          showToast('GPS tracking active', 'success');
        }
      });
    }

    driverControlsBound = true;
  };

  const DRIVER_TASK_TYPE_META = {
    delivery: {
      label: 'Deliver to client',
      tagLabel: 'Deliver',
      cardClass: 'driver-task-card-delivery',
      tagClass: 'driver-task-tag driver-task-tag-delivery'
    },
    settlement: {
      label: 'Vehicle return',
      tagLabel: 'Return',
      cardClass: 'driver-task-card-return',
      tagClass: 'driver-task-tag driver-task-tag-return'
    },
    preparation: {
      label: 'Prepare vehicle',
      tagLabel: 'Prep',
      cardClass: '',
      tagClass: 'driver-task-tag'
    },
    default: {
      label: 'Task',
      tagLabel: 'Task',
      cardClass: '',
      tagClass: 'driver-task-tag'
    }
  };

  const PARTIAL_PAYMENT_REASONS = [
    'Client promised transfer later',
    'Approved by operations manager',
    'Cash limit / no POS available',
    'Client paid via bank transfer',
    'Other'
  ];

  const renderDriverTasks = () => {
    const listEl = document.getElementById('driver-tasks-list');
    if (!listEl) return;

    bindDriverViewControls();

    const driver = getActiveDriver();
    if (!driver && MOCK_DATA.drivers.length) {
      appState.driverContext.activeDriverId = MOCK_DATA.drivers[0].id;
    }
    const driverId = appState.driverContext.activeDriverId;

    const tasks = MOCK_DATA.bookings.filter(b => b.driverId === driverId && ['delivery', 'preparation', 'settlement'].includes(b.status))
      .sort((a,b) => a.startTime.localeCompare(b.startTime));
    const carsById = new Map(MOCK_DATA.cars.map(car => [Number(car.id), car]));

    const bannerEl = document.getElementById('driver-status-banner');
    if (bannerEl) {
      const statusBadge = driver ? `<span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${driver.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : driver.status === 'On Task' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}">${driver.status}</span>` : '';
      const offlineNotice = appState.offline.enabled
        ? '<div class="p-3 bg-amber-100 border-l-4 border-amber-500 text-xs text-amber-700 rounded-md">Offline mode is active. Data will sync once reconnected.</div>'
        : '';
      bannerEl.innerHTML = `
                    <div class="text-xs text-gray-600 space-y-2">
                        <div class="flex items-center justify-between">
                            <span>Current driver</span>
                            ${statusBadge}
                        </div>
                        ${driver ? `<p>${driver.name} · ${driver.phone}</p>` : '<p>Driver not selected</p>'}
                    </div>
                    ${offlineNotice}
                `;
    }

    const toggleBtn = document.getElementById('driver-toggle-offline');
    if (toggleBtn && !toggleBtn.dataset.bound) {
      toggleBtn.addEventListener('click', () => {
        appState.offline.enabled = !appState.offline.enabled;
        if (appState.offline.enabled) {
          showToast('Offline mode enabled. Data is stored locally.', 'info');
        } else {
          appState.offline.lastSync = new Date().toISOString();
          syncOfflineQueue();
          showToast('Online mode. Sync completed.', 'success');
        }
        renderDriverTasks();
      });
      toggleBtn.dataset.bound = 'true';
    }
    if (toggleBtn) {
      toggleBtn.textContent = appState.offline.enabled ? 'Return to online mode' : 'Switch to offline mode';
    }

    listEl.innerHTML = tasks.map(task => {
      const typeMeta = DRIVER_TASK_TYPE_META[task.status] || DRIVER_TASK_TYPE_META.default;
      const cardClasses = ['geist-card', 'driver-task-card', typeMeta.cardClass, 'p-4', 'cursor-pointer']
        .filter(Boolean)
        .join(' ');
      const typeBadge = `<span class="${typeMeta.tagClass}">${typeMeta.tagLabel}</span>`;
      const targetTime = new Date(`${task.startDate}T${task.startTime}:00`).getTime();
      const timerHtml = `<div class="card-timer text-xs text-amber-600 flex items-center mt-2" data-target-time="${targetTime}"></div>`;
      const carData = carsById.get(Number(task.carId)) || MOCK_DATA.cars.find(car => car.name === task.carName);
      const carName = carData?.name || task.carName || '';
      const carInfoParts = [];
      if (carName) carInfoParts.push(carName);
      if (carData?.year) carInfoParts.push(String(carData.year));
      if (carData?.plate) carInfoParts.push(carData.plate);
      const carInfoText = carInfoParts.join(' · ') || carName;
      const clientInfo = task.clientName ? `<p class="text-xs text-gray-500">${task.clientName}</p>` : '';
      const locationLabel = (() => {
        if (task.status === 'delivery') return task.dropoffLocation || task.pickupLocation || '';
        if (task.status === 'settlement') return task.pickupLocation || task.dropoffLocation || '';
        return task.dropoffLocation || task.pickupLocation || '';
      })();
      const locationHtml = locationLabel ? `<p class="text-xs text-gray-500 mt-1">${locationLabel}</p>` : '';
      return `
                <div class="${cardClasses}" data-task-id="${task.id}">
                    <div class="flex justify-between items-start gap-3">
                        <div>
                             <div class="flex items-center gap-2 mb-1">
                                ${typeBadge}
                                <p class="font-semibold text-sm text-gray-900">${typeMeta.label}</p>
                             </div>
                             <p class="text-xs text-gray-500">${carInfoText}</p>
                             ${clientInfo}
                             ${locationHtml}
                        </div>
                        <div class="text-right text-xs text-gray-500">
                             <p>${task.startDate}</p>
                             <p class="text-lg font-bold text-gray-900">${task.startTime}</p>
                        </div>
                    </div>
                    ${timerHtml}
                </div>
            `;}).join('') || '<p class="text-center text-gray-500 mt-8">No tasks for today</p>';
    startTimers();
    updateDriverLocationCard();
  };
        
  const renderDriverTaskDetail = (taskId) => {
    const task = MOCK_DATA.bookings.find(b => b.id == taskId);
    const contentEl = driverTaskDetailContent;
    if(!task || !contentEl) return false;
            
    const client = MOCK_DATA.clients.find(c => c.name === task.clientName) || {};
    const typeMeta = DRIVER_TASK_TYPE_META[task.status] || DRIVER_TASK_TYPE_META.default;
    const typeBadge = `<span class="${typeMeta.tagClass}">${typeMeta.tagLabel}</span>`;
    const carData = MOCK_DATA.cars.find(car => Number(car.id) === Number(task.carId))
      || MOCK_DATA.cars.find(car => car.name === task.carName);
    const carDescriptorParts = [carData?.name || task.carName || null, carData?.year || null]
      .filter(Boolean);
    const carDescriptor = carDescriptorParts.join(' ');
    const vehicleInfo = carDescriptor
      ? `${carDescriptor}${carData?.plate ? `, ${carData.plate}` : ''}`
      : (carData?.plate || task.carName || 'Vehicle details');
    const clientPhone = client.phone || task.clientPhone || '';
    const clientDocumentsHtml = (client.documents && client.documents.length)
      ? client.documents.map(doc => `<a href="#" class="px-3 py-1 rounded-md bg-slate-100 text-slate-700 client-doc-link" data-url="${doc.url}">${doc.name}</a>`).join('')
      : '<span class="text-xs text-gray-400">No documents attached</span>';
    const routeLocation = task.dropoffLocation || task.pickupLocation || 'Location TBD';
    const totalAmount = task.totalAmount || 0;
    const paidAmount = task.paidAmount || 0;
    const outstandingAmount = Math.max(totalAmount - paidAmount, 0);
    const isVehicleReturnTask = task.status === 'settlement';
    const formatMileageValue = (value) => {
      if (value === null || value === undefined || value === '') return '—';
      const numericValue = Number(value);
      if (!Number.isNaN(numericValue)) {
        return `${numericValue.toLocaleString()} km`;
      }
      return `${value}`;
    };
    const deliveryReadingsInfo = isVehicleReturnTask ? `
                        <div class="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-gray-600">
                            <p class="font-semibold text-gray-700 mb-1">At delivery</p>
                            <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                                <span>Odometer: <span class="font-semibold text-gray-900">${formatMileageValue(task.pickupMileage)}</span></span>
                                <span>Fuel level: <span class="font-semibold text-gray-900">${task.pickupFuel || '—'}</span></span>
                            </div>
                        </div>` : '';
    const documentCheckHtml = !isVehicleReturnTask ? `
                        <label class="flex items-center"><input id="doc-check" type="checkbox" class="h-4 w-4 rounded border-gray-300"> <span class="ml-2 text-sm text-gray-600">Documents verified</span></label>` : '';

    contentEl.innerHTML = `
                <div class="space-y-2">
                    <div class="flex items-center gap-2">
                        ${typeBadge}
                        <h2 class="text-2xl font-bold">${typeMeta.label}</h2>
                    </div>
                    <p class="text-sm text-gray-500">${vehicleInfo}</p>
                </div>
                <div class="space-y-6">
                    <div class="geist-card p-4 space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-700">${client.name || '—'}</p>
                                ${clientPhone ? `<p class="text-xs text-gray-500 mt-1">${clientPhone}</p>` : ''}
                            </div>
                            ${clientPhone ? `<a href="tel:${clientPhone}" class="p-3 bg-gray-100 rounded-full">${getIcon('phone')}</a>` : ''}
                        </div>
                        <div>
                            <h4 class="font-semibold text-sm text-gray-700">Client documents</h4>
                            <div class="flex flex-wrap gap-2 mt-3 text-sm">
                                ${clientDocumentsHtml}
                            </div>
                        </div>
                        ${documentCheckHtml}
                    </div>
                    <div class="geist-card p-4">
                        <div class="flex items-center gap-3">
                            <p class="text-sm text-gray-700 flex-1">${routeLocation}</p>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.dropoffLocation || task.pickupLocation || 'Dubai Marina')}" target="_blank" class="p-3 rounded-xl bg-slate-100 text-slate-600">
                                ${getIcon('navigation', 'w-4 h-4')}
                            </a>
                        </div>
                    </div>
                    <div class="geist-card p-4 space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Readings and condition</h3>
                        </div>
                        ${deliveryReadingsInfo}
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Odometer (km)</label>
                                <input type="number" id="driver-odometer" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. 25450">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Fuel level</label>
                                <select id="driver-fuel" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Select</option>
                                    ${['8/8','7/8','6/8','5/8','4/8','3/8','2/8','1/8','0/8'].map(level => `<option value="${level}">${level}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div id="driver-payment-card" class="geist-card p-4 space-y-4" data-due-amount="${outstandingAmount}">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Payment collection</h3>
                            <div class="text-right text-xs text-gray-500">
                                <p>Outstanding</p>
                                <p class="text-sm font-semibold ${outstandingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}">${formatCurrency(outstandingAmount)}</p>
                            </div>
                        </div>
                        <p class="text-xs text-gray-500">Total ${formatCurrency(totalAmount)} · Paid ${formatCurrency(paidAmount)}</p>
                        ${outstandingAmount > 0 ? `
                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Collect now (AED)</label>
                                <input type="number" step="0.01" id="driver-collect-amount" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. ${outstandingAmount}">
                            </div>
                            <p class="text-sm text-gray-600">Remaining: <span id="driver-collect-remaining" class="font-semibold">${formatCurrency(outstandingAmount)}</span></p>
                            <div id="driver-collect-reason-wrap" class="space-y-1 hidden">
                                <label class="block text-xs font-medium text-gray-500">Reason for partial collection</label>
                                <select id="driver-collect-reason" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                    <option value="">Select reason</option>
                                    ${PARTIAL_PAYMENT_REASONS.map(reason => `<option value="${reason}">${reason}</option>`).join('')}
                                </select>
                            </div>
                        </div>` : `<p class="text-sm text-emerald-600">No outstanding balance for this booking</p>`}
                    </div>
                    ${task.status === 'settlement' ? `
                    <div class="geist-card p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Fine check</h3>
                            <button type="button" class="geist-button geist-button-secondary text-xs flex items-center gap-2 check-fines-btn" data-booking-id="${task.id}">
                                ${getIcon('search', 'w-4 h-4')}Check
                            </button>
                        </div>
                        <div id="fines-result" class="text-xs text-gray-500">No fine data.</div>
                    </div>` : ''}
                    <div class="space-y-4">
                        <h3 class="font-semibold text-gray-500">Attach photos</h3>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Vehicle photos (up to 4)</label>
                            <input type="file" accept="image/*" multiple id="car-photos" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md">
                            <div id="car-previews" class="grid grid-cols-2 gap-2 mt-2"></div>
                        </div>
                    </div>
                    <button id="complete-task-btn" data-booking-id="${task.id}" disabled class="w-full geist-button geist-button-primary mt-4">Complete task</button>
                </div>
            `;

    // Event listeners for photo attachments
    const carInput = document.getElementById('car-photos');
    const carPreviews = document.getElementById('car-previews');

    if (carInput) {
      carInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files).slice(0, 4); // Limit to 4
        carPreviews.innerHTML = '';
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'w-full h-32 object-cover rounded-md';
            const div = document.createElement('div');
            div.appendChild(img);
            carPreviews.appendChild(div);
          };
          reader.readAsDataURL(file);
        });
      });
    }

    const updateCompleteBtnState = () => {
      const odometerValue = document.getElementById('driver-odometer')?.value?.trim();
      const fuelValue = document.getElementById('driver-fuel')?.value;
      const docVerified = document.getElementById('doc-check')?.checked;
      const completeBtn = document.getElementById('complete-task-btn');
      if (completeBtn) {
        completeBtn.disabled = !(docVerified && odometerValue && fuelValue);
      }
    };

    document.getElementById('doc-check')?.addEventListener('change', updateCompleteBtnState);
    document.getElementById('driver-odometer')?.addEventListener('input', updateCompleteBtnState);
    document.getElementById('driver-fuel')?.addEventListener('change', updateCompleteBtnState);
    updateCompleteBtnState();

    const paymentCard = document.getElementById('driver-payment-card');
    const collectionInput = document.getElementById('driver-collect-amount');
    const remainingLabel = document.getElementById('driver-collect-remaining');
    const reasonWrap = document.getElementById('driver-collect-reason-wrap');
    const reasonSelect = document.getElementById('driver-collect-reason');
    if (paymentCard && collectionInput && remainingLabel) {
      const dueAmount = parseFloat(paymentCard.dataset.dueAmount || '0') || 0;
      const handleCollectionChange = () => {
        let value = parseFloat(collectionInput.value);
        if (Number.isNaN(value) || value < 0) value = 0;
        if (value > dueAmount) value = dueAmount;
        collectionInput.value = value ? value : '';
        const remaining = Math.max(dueAmount - value, 0);
        remainingLabel.textContent = formatCurrency(remaining);
        if (reasonWrap) {
          reasonWrap.classList.toggle('hidden', remaining === 0);
          if (remaining === 0 && reasonSelect) {
            reasonSelect.value = '';
          }
        }
      };
      collectionInput.addEventListener('input', handleCollectionChange);
      handleCollectionChange();
    }
    return true;
  };
        
  const renderCalendar = () => {
    renderFleetCalendar();
  };

  function renderCurrentPageWithSalesFilter() {
    if (appState.currentRole !== 'sales') return;
    switch (appState.currentPage) {
    case 'bookings':
      renderKanbanBoard();
      break;
    case 'fleet-calendar':
      renderCalendar();
      break;
    case 'clients-table':
      renderTableView('clients-table');
      break;
    case 'analytics':
      renderAnalyticsPage();
      renderSalesPipeline();
      break;
    case 'sales-pipeline':
      renderSalesPipeline();
      break;
    default:
      break;
    }
  }

  const renderReports = () => {
    const topCarsEl = document.getElementById('top-cars-report');
    if(!topCarsEl) return;
    const revenueTotal = MOCK_DATA.analytics.revenueDaily.reduce((sum, item) => sum + item.revenue, 0);
    const expensesTotal = MOCK_DATA.analytics.revenueDaily.reduce((sum, item) => sum + item.expenses, 0);
    const periodLabel = document.getElementById('reports-period-label');
    if (periodLabel) periodLabel.textContent = 'Last 7 days';
    const revenueEl = document.getElementById('reports-revenue');
    if (revenueEl) revenueEl.textContent = formatCurrency(revenueTotal);
    const expensesEl = document.getElementById('reports-expenses');
    if (expensesEl) expensesEl.textContent = formatCurrency(expensesTotal);
    const profitEl = document.getElementById('reports-profit');
    if (profitEl) profitEl.textContent = formatCurrency(revenueTotal - expensesTotal);

    topCarsEl.innerHTML = MOCK_DATA.cars.slice(0,5)
      .sort((a,b) => (b.mileage * 0.1) - (a.mileage * 0.1)) // mock revenue
      .map((car, index) => `
                <li class="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div class="flex items-center">
                        <span class="text-gray-500 font-bold w-6">${index + 1}.</span>
                        <img src="${car.imagePath}" class="w-12 h-8 object-cover rounded-md mx-4">
                        <span class="font-semibold">${car.name}</span>
                    </div>
                    <span class="font-bold text-lg">AED ${((5-index)*2500 + 1000).toLocaleString()}</span>
                </li>
            `).join('');
  };

  const PRIORITY_ICON_META = {
    high: { icon: 'priorityHigh', className: 'text-rose-500', label: 'High priority' },
    medium: { icon: 'priorityMedium', className: 'text-amber-500', label: 'Medium priority' },
    low: { icon: 'priorityLow', className: 'text-emerald-500', label: 'Low priority' }
  };

  const deadlineDateFormatter = new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const deadlineTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const DEADLINE_SOON_THRESHOLD_MS = 6 * 60 * 60 * 1000;

  const normalizePriorityValue = (priority) => {
    const value = (priority || '').toString().trim().toLowerCase();
    if (!value) return '';
    if (['high', 'высокий'].includes(value)) return 'high';
    if (['medium', 'средний'].includes(value)) return 'medium';
    if (['low', 'низкий'].includes(value)) return 'low';
    return '';
  };

  const getPriorityMeta = (priority) => {
    const normalized = normalizePriorityValue(priority);
    return normalized ? PRIORITY_ICON_META[normalized] : null;
  };

  const getPriorityIconHtml = (priority, size = 'w-4 h-4') => {
    const meta = getPriorityMeta(priority);
    if (!meta) return '';
    return `<span class="inline-flex items-center justify-center ${meta.className}" title="${meta.label}">${getIcon(meta.icon, size)}</span>`;
  };

  const getTaskLocationDetails = (task) => {
    if (!task?.geo) return null;
    const pickup = task.geo.pickup || '';
    const dropoff = task.geo.dropoff || '';
    if (!pickup && !dropoff) return null;

    if (task.type === 'delivery') {
      return { label: 'Destination', value: dropoff || pickup };
    }
    if (task.type === 'pickup') {
      return { label: 'Pickup location', value: pickup || dropoff };
    }
    if (task.type === 'maintenance') {
      return { label: 'Service location', value: dropoff || pickup };
    }

    const value = pickup && dropoff ? `${pickup} → ${dropoff}` : pickup || dropoff;
    return value ? { label: 'Location', value } : null;
  };

  const formatRequiredInputLabel = (key) => {
    return (key || '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, char => char.toUpperCase());
  };

  const normalizeRequiredInputConfig = (input) => {
    if (!input) return null;
    if (typeof input === 'string') {
      const key = input.trim();
      if (!key) return null;
      return {
        key,
        label: formatRequiredInputLabel(key),
        type: 'text',
        multiple: false,
        accept: ''
      };
    }
    const key = (input.key || '').trim();
    if (!key) return null;
    return {
      key,
      label: input.label || formatRequiredInputLabel(key),
      type: input.type || 'text',
      multiple: Boolean(input.multiple),
      accept: input.accept || ''
    };
  };

  const getTaskRequiredInputs = (task) => {
    if (!task) return [];
    const items = Array.isArray(task.requiredInputs) ? task.requiredInputs : [];
    return items.map(normalizeRequiredInputConfig).filter(Boolean);
  };

  const getTaskDeadlineMeta = (task) => {
    if (!task?.deadline) return null;
    const timestamp = new Date(task.deadline.replace(' ', 'T')).getTime();
    if (!Number.isFinite(timestamp)) return null;

    const dateLabel = deadlineDateFormatter.format(timestamp);
    const timeLabel = deadlineTimeFormatter.format(timestamp);
    const now = Date.now();
    const diff = timestamp - now;
    const state = task.status === 'done'
      ? 'completed'
      : diff < 0
        ? 'overdue'
        : diff <= DEADLINE_SOON_THRESHOLD_MS
          ? 'soon'
          : 'scheduled';

    const stateConfig = {
      overdue: {
        statusLabel: 'Overdue',
        icon: 'alertTriangle',
        iconClass: 'text-rose-500',
        dateClass: 'text-rose-600',
        pillClass: 'bg-rose-50 text-rose-700',
        showPill: true,
        showCountdown: false
      },
      soon: {
        statusLabel: 'Due soon',
        icon: 'clock',
        iconClass: 'text-amber-500',
        dateClass: 'text-amber-600',
        pillClass: 'bg-amber-50 text-amber-700',
        showPill: true,
        showCountdown: true
      },
      scheduled: {
        statusLabel: 'Scheduled',
        icon: 'clock',
        iconClass: 'text-gray-400',
        dateClass: 'text-gray-500',
        pillClass: 'bg-gray-100 text-gray-600',
        showPill: false,
        showCountdown: false
      },
      completed: {
        statusLabel: 'Completed',
        icon: 'check',
        iconClass: 'text-emerald-500',
        dateClass: 'text-emerald-600',
        pillClass: 'bg-emerald-50 text-emerald-700',
        showPill: false,
        showCountdown: false
      }
    }[state] || null;

    if (!stateConfig) return null;

    return {
      timestamp,
      dateLabel,
      timeLabel,
      icon: stateConfig.icon,
      iconClass: stateConfig.iconClass,
      dateClass: stateConfig.dateClass,
      statusLabel: stateConfig.statusLabel,
      pillClass: stateConfig.pillClass,
      showStatusPill: stateConfig.showPill,
      showCountdown: stateConfig.showCountdown && diff > 0
    };
  };

  const renderTasksPage = () => {
    const board = document.getElementById('tasks-board');
    if (!board) return;

    bindTaskFilters();

    const statusSelect = document.getElementById('tasks-filter-status');
    const typeSelect = document.getElementById('tasks-filter-type');
    const assigneeSelect = document.getElementById('tasks-filter-assignee');
    if (statusSelect) statusSelect.value = appState.filters.tasks.status;
    if (typeSelect) typeSelect.value = appState.filters.tasks.type;
    if (assigneeSelect) assigneeSelect.value = appState.filters.tasks.assignee;

    const filters = appState.filters.tasks;
    const filteredTasks = MOCK_DATA.tasks.filter(task => {
      if (filters.status !== 'all' && task.status !== filters.status) return false;
      if (filters.type !== 'all' && task.type !== filters.type) return false;
      if (filters.assignee !== 'all') {
        if (filters.assignee === 'unassigned' && task.assigneeId) return false;
        if (filters.assignee !== 'unassigned' && String(task.assigneeId || '') !== filters.assignee) return false;
      }
      return true;
    });

    const summaryEl = document.getElementById('tasks-sla-summary');
    if (summaryEl) {
      const now = Date.now();
      const pending = filteredTasks.filter(task => task.status !== 'done');
      const overdue = pending.filter(task => {
        if (!task.deadline) return false;
        const timestamp = new Date(task.deadline.replace(' ', 'T')).getTime();
        return timestamp < now;
      }).length;
      summaryEl.innerHTML = `
                    <div class="text-xs text-gray-500">
                        <p>Active tasks: <span class="font-medium text-gray-900">${filteredTasks.length}</span></p>
                        <p>Overdue: <span class="font-medium ${overdue ? 'text-rose-600' : 'text-emerald-600'}">${overdue}</span></p>
                    </div>
                `;
    }

    const statuses = { todo: 'To do', inprogress: 'In progress', done: 'Completed' };
    board.innerHTML = Object.entries(statuses).map(([statusKey, statusValue]) => {
      const tasks = filteredTasks.filter(task => task.status === statusKey);
      return `
                    <div class="geist-card h-full flex flex-col">
                        <h3 class="p-4 font-semibold border-b text-gray-800">${statusValue}</h3>
                        <div class="flex-1 p-4 space-y-3">
                           ${tasks.map(task => {
    const assignee = MOCK_DATA.drivers.find(d => d.id === task.assigneeId);
    const typeMeta = TASK_TYPES[task.type] || { label: task.type, color: 'bg-gray-100 text-gray-600' };
    const typeBadge = `<span class="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold shadow-sm ${typeMeta.color}">${typeMeta.label}</span>`;
    const locationDetails = getTaskLocationDetails(task);
    const deadlineMeta = getTaskDeadlineMeta(task);
    const deadlineSummary = deadlineMeta
      ? `<div class="flex items-center gap-1 ${deadlineMeta.dateClass}">
                                            ${getIcon(deadlineMeta.icon, 'w-3.5 h-3.5')}
                                            <span>${deadlineMeta.dateLabel} · ${deadlineMeta.timeLabel}</span>
                                      </div>`
      : '<span class="text-gray-400">—</span>';
    const countdownBlock = deadlineMeta?.showCountdown
      ? `<div class="task-countdown mt-2 text-[11px] font-medium text-right text-gray-500" data-target-time="${deadlineMeta.timestamp}"></div>`
      : '';
    return `
                               <div class="task-card group rounded-2xl border border-indigo-100/70 bg-white/80 p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg cursor-pointer" data-task-id="${task.id}">
                                  <div class="flex items-start gap-2">
                                      ${typeBadge}
                                  </div>
                                  <div class="mt-3 space-y-1">
                                      <p class="font-semibold text-sm text-gray-900 leading-snug">${task.title}</p>
                                      ${locationDetails ? `<p class="text-xs text-gray-500">${locationDetails.value}</p>` : ''}
                                  </div>
                                  <div class="mt-4 flex items-center justify-between text-[11px] text-gray-500">
                                      <span>${assignee ? assignee.name : 'Unassigned'}</span>
                                      ${deadlineSummary}
                                  </div>
                                  ${countdownBlock}
                               </div>`;
  }).join('') || '<p class="text-xs text-gray-500">No tasks</p>'}
                        </div>
                    </div>
                `;
    }).join('');

    startTimers();
  };

  const renderTaskDetailPage = (taskId) => {
    const task = MOCK_DATA.tasks.find(t => t.id == taskId);
    if (!task || !taskDetailContent) return false;

    const assignee = MOCK_DATA.drivers.find(d => d.id === task.assigneeId);
    const booking = task.bookingId ? MOCK_DATA.bookings.find(b => b.id === task.bookingId) : null;
    const statusLabels = { todo: 'To do', inprogress: 'In progress', done: 'Completed' };
    const statusBadge = statusLabels[task.status] || task.status;
    const typeMeta = TASK_TYPES[task.type] || { label: task.type };
    const priorityMeta = getPriorityMeta(task.priority);
    const priorityDisplay = priorityMeta
      ? `<span class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                        ${getPriorityIconHtml(task.priority, 'w-5 h-5')}
                        <span>${task.priority || priorityMeta.label}</span>
                   </span>`
      : (task.priority
        ? `<span class="text-sm font-medium text-gray-700">${task.priority}</span>`
        : '<span class="text-xs text-gray-500">—</span>');
    const locationDetails = getTaskLocationDetails(task);
    const deadlineMeta = getTaskDeadlineMeta(task);
    const formattedDeadline = deadlineMeta
      ? `${deadlineMeta.dateLabel} · ${deadlineMeta.timeLabel}`
      : (task.deadline || 'Not set');
    const deadlineStatusBadge = deadlineMeta?.showStatusPill
      ? `<span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${deadlineMeta.pillClass}">
                        ${getIcon(deadlineMeta.icon, 'w-3 h-3')}
                        <span>${deadlineMeta.statusLabel}</span>
                   </span>`
      : '';
    if (!task.requiredDataValues) task.requiredDataValues = {};
    const requiredInputConfigs = getTaskRequiredInputs(task);
    const requiredInputsBlock = requiredInputConfigs.length
      ? `<div>
                        <p class="font-semibold text-gray-500">Required data</p>
                        <div class="mt-3 space-y-3">
                            ${requiredInputConfigs.map(config => {
    const storedValue = task.requiredDataValues?.[config.key];
    if (config.type === 'file') {
      const storedFiles = Array.isArray(storedValue) ? storedValue : [];
      const acceptAttr = config.accept ? `accept="${config.accept}"` : '';
      const multipleAttr = config.multiple ? 'multiple' : '';
      const summaryText = storedFiles.length ? `Загружено: ${storedFiles.map(name => escapeHtml(name)).join(', ')}` : '';
      const summaryClass = storedFiles.length ? '' : 'hidden';
      return `<label class="block text-xs font-medium text-gray-600">
                                                <span>${escapeHtml(config.label)}</span>
                                                <input type="file"
                                                    class="task-required-input mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                                    data-task-id="${task.id}"
                                                    data-required-key="${config.key}"
                                                    data-input-type="${config.type}"
                                                    ${multipleAttr}
                                                    ${acceptAttr}>
                                                <p class="task-required-input-info ${summaryClass} mt-1 text-xs text-gray-400">${summaryText}</p>
                                            </label>`;
    }
    const inputTypeAttr = config.type === 'number' ? 'number' : 'text';
    const valueAttr = storedValue != null ? escapeHtml(storedValue) : '';
    return `<label class="block text-xs font-medium text-gray-600">
                                            <span>${escapeHtml(config.label)}</span>
                                            <input type="${inputTypeAttr}"
                                                class="task-required-input mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                                data-task-id="${task.id}"
                                                data-required-key="${config.key}"
                                                data-input-type="${config.type}"
                                                value="${valueAttr}">
                                        </label>`;
  }).join('')}
                        </div>
                    </div>`
      : '';

    taskDetailContent.innerHTML = `
                <div class="p-6 border-b flex justify-between items-center">
                    <div>
                        <p class="text-xs uppercase tracking-wide text-gray-500">${typeMeta.label}</p>
                        <h2 class="text-xl font-semibold mt-1">${task.title}</h2>
                    </div>
                </div>
                <div class="p-6 space-y-5 text-sm">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs uppercase tracking-wide text-gray-500">Owner</p>
                            <p class="font-medium mt-1">${assignee ? assignee.name : 'Unassigned'}</p>
                        </div>
                        <span class="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">${statusBadge}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
                        <div>
                            <p class="font-semibold text-gray-500">Deadline</p>
                            <div class="mt-1 space-y-1">
                                <p>${formattedDeadline}</p>
                                ${deadlineStatusBadge}
                            </div>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-500">Priority</p>
                            <div class="mt-1 flex items-center gap-2">${priorityDisplay}</div>
                        </div>
                        ${locationDetails ? `<div><p class="font-semibold text-gray-500">${locationDetails.label}</p><p class="mt-1 text-gray-700">${locationDetails.value}</p></div>` : ''}
                    </div>
                    ${requiredInputsBlock}
                    ${booking ? `<div class="border-t pt-4">
                        <p class="font-semibold text-gray-500 mb-2">Related booking</p>
                        <div class="flex flex-col space-y-2">
                            <span><strong>#${booking.id}</strong> · ${booking.carName}</span>
                            <a class="text-blue-600 hover:underline text-sm" href="${buildHash(appState.currentRole, 'booking-detail', booking.id)}">Open booking details</a>
                        </div>
                    </div>` : ''}
                </div>
                <div class="px-6 pb-6 flex justify-end">
                    <button id="task-complete-btn" class="geist-button geist-button-primary text-sm">Complete task</button>
                </div>
            `;

    const requiredInputMap = new Map(requiredInputConfigs.map(config => [config.key, config]));
    taskDetailContent.querySelectorAll('.task-required-input').forEach(input => {
      const key = input.dataset.requiredKey;
      const config = requiredInputMap.get(key) || {};
      const inputType = input.dataset.inputType || config.type || 'text';
      if (!task.requiredDataValues) task.requiredDataValues = {};
      const handler = (event) => {
        if (!task.requiredDataValues) task.requiredDataValues = {};
        if (inputType === 'file') {
          const files = Array.from(event.target.files || []);
          task.requiredDataValues[key] = files.map(file => file.name);
          const infoEl = event.target.closest('label')?.querySelector('.task-required-input-info');
          if (infoEl) {
            if (files.length) {
              infoEl.textContent = `Загружено: ${files.map(file => file.name).join(', ')}`;
              infoEl.classList.remove('hidden');
            } else {
              infoEl.textContent = '';
              infoEl.classList.add('hidden');
            }
          }
          if (files.length) {
            event.target.classList.remove('border-rose-400', 'ring-1', 'ring-rose-100', 'focus:ring-rose-200', 'focus:border-rose-400');
          }
        } else {
          const currentValue = event.target.value;
          task.requiredDataValues[key] = currentValue;
          if (currentValue.trim()) {
            event.target.classList.remove('border-rose-400', 'ring-1', 'ring-rose-100', 'focus:ring-rose-200', 'focus:border-rose-400');
          }
        }
      };
      input.addEventListener(inputType === 'file' ? 'change' : 'input', handler);
    });

    const completeBtn = taskDetailContent.querySelector('#task-complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        if (requiredInputConfigs.length) {
          if (!task.requiredDataValues) task.requiredDataValues = {};
          let hasMissing = false;
          requiredInputConfigs.forEach(config => {
            const storedValue = task.requiredDataValues[config.key];
            const isFilled = config.type === 'file'
              ? Array.isArray(storedValue) && storedValue.length > 0
              : (storedValue ?? '').toString().trim().length > 0;
            const inputEl = taskDetailContent.querySelector(`.task-required-input[data-required-key="${config.key}"]`);
            if (inputEl) {
              if (!isFilled) {
                inputEl.classList.add('border-rose-400', 'ring-1', 'ring-rose-100', 'focus:ring-rose-200', 'focus:border-rose-400');
              } else {
                inputEl.classList.remove('border-rose-400', 'ring-1', 'ring-rose-100', 'focus:ring-rose-200', 'focus:border-rose-400');
              }
              if (config.type === 'file') {
                const infoEl = inputEl.closest('label')?.querySelector('.task-required-input-info');
                if (infoEl && !isFilled) {
                  infoEl.classList.add('hidden');
                  infoEl.textContent = '';
                }
              }
            }
            if (!isFilled) {
              hasMissing = true;
            }
          });
          if (hasMissing) {
            showToast('Заполните обязательные поля перед завершением задачи', 'error');
            return;
          }
        }

        task.status = 'done';
        showToast('Task marked as completed', 'success');
        window.location.hash = buildHash(appState.currentRole, 'tasks');
        renderTasksPage();
      });
    }

    return true;
  };

  // --- LAYOUT MANAGER ---
  const updateLayoutForRole = (role) => {
    const roleConfig = ROLES_CONFIG[role] || {};
    const layout = roleConfig.layout || 'desktop';
    const isDesktop = layout === 'desktop';
    const isMobile = layout === 'mobile';

    desktopShell.classList.toggle('hidden', !isDesktop);
    sidebar.classList.toggle('hidden', !isDesktop);
    mainContent.classList.toggle('hidden', !isDesktop);
    mobileViewContainer.classList.toggle('hidden', !isMobile);

    if (!isDesktop) {
      desktopPages.forEach(page => page.classList.add('hidden'));
    }

    updateSalesOwnerFilterVisibility(role);
  };
        

  const renderMaintenanceForm = () => {
    if (!maintenanceCreateContent) return false;
    const defaultDate = appState.calendarStart || getStartOfWeek();
    const defaultStart = `${defaultDate}T09:00`;
    const defaultEnd = `${defaultDate}T18:00`;
    const maintenanceDefaults = appState.maintenanceContext || {};
    const selectedCarId = maintenanceDefaults?.defaultCarId ? Number(maintenanceDefaults.defaultCarId) : null;
    const defaultType = maintenanceDefaults?.defaultType || 'maintenance';
    const carOptions = MOCK_DATA.cars.map(car => {
      const isSelected = selectedCarId !== null && Number(car.id) === selectedCarId;
      return `<option value="${car.id}"${isSelected ? ' selected' : ''}>${car.name} · ${car.plate}</option>`;
    }).join('');

    maintenanceCreateContent.innerHTML = `
                <div class="p-6 border-b">
                    <h2 class="text-xl font-semibold">Schedule maintenance</h2>
                    <p class="text-sm text-gray-500 mt-1">Create a maintenance slot for a vehicle</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                        <select class="w-full px-3 py-2 border border-gray-300 rounded-md" id="maintenance-car">
                            ${carOptions}
                        </select>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Start</label>
                            <input type="datetime-local" id="maintenance-start" value="${defaultStart}" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">End</label>
                            <input type="datetime-local" id="maintenance-end" value="${defaultEnd}" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Work type</label>
                        <select id="maintenance-type" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="maintenance"${defaultType === 'maintenance' ? ' selected' : ''}>Scheduled maintenance</option>
                            <option value="inspection"${defaultType === 'inspection' ? ' selected' : ''}>Inspection</option>
                            <option value="detailing"${defaultType === 'detailing' ? ' selected' : ''}>Detailing</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                        <textarea id="maintenance-notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Add notes for mechanic or driver"></textarea>
                    </div>
                </div>
                <div class="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button type="button" id="maintenance-cancel-btn" class="geist-button geist-button-secondary">Cancel</button>
                    <button type="button" id="maintenance-save-btn" class="geist-button geist-button-primary">Save</button>
                </div>
            `;

    if (appState.maintenanceContext) {
      appState.maintenanceContext.defaultCarId = null;
      appState.maintenanceContext.defaultType = 'maintenance';
    }

    const saveBtn = maintenanceCreateContent.querySelector('#maintenance-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        showToast('Maintenance slot created (demo)', 'success');
        window.location.hash = buildHash(appState.currentRole, 'fleet-calendar');
      });
    }

    const cancelBtn = maintenanceCreateContent.querySelector('#maintenance-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        window.location.hash = buildHash(appState.currentRole, 'fleet-calendar');
      });
    }

    return true;
  };

  const renderBookingCreateForm = () => {
    if (!bookingCreateContent) return false;
    const templateBooking = MOCK_DATA.bookings.find(b => b.status === 'new') || MOCK_DATA.bookings[0];
    const parsedHash = parseHash(window.location.hash);
    const selectorFromHash = parsedHash.selector && parsedHash.selector !== HASH_DEFAULT_SELECTOR ? parsedHash.selector : null;
    const context = appState.bookingContext || {};
    const contextDraftId = context.mode === 'edit' ? context.draftBookingId : null;
    const draftId = contextDraftId ?? selectorFromHash;
    const normalizedDraftId = draftId != null && draftId !== '' ? String(draftId) : null;
    const editingBooking = normalizedDraftId
      ? MOCK_DATA.bookings.find(b => String(b.id) === normalizedDraftId)
      : null;
    const isEditMode = Boolean(editingBooking);
    const baseBooking = editingBooking || templateBooking;
    const baseClient = baseBooking
      ? MOCK_DATA.clients.find(client => Number(client.id) === Number(baseBooking.clientId))
      : null;
    const baseCar = baseBooking
      ? MOCK_DATA.cars.find(car => Number(car.id) === Number(baseBooking.carId))
      : null;
    const selectedClientId = baseClient ? Number(baseClient.id) : null;
    const selectedCarId = baseCar ? Number(baseCar.id) : null;
    const editingBookingIdValue = editingBooking ? String(editingBooking.id) : null;

    if (context.mode === 'edit' && !isEditMode) {
      context.mode = 'create';
      context.draftBookingId = null;
    }

    const clientOptions = MOCK_DATA.clients.map(client => `
                <option value="${client.id}" ${selectedClientId !== null && Number(client.id) === selectedClientId ? 'selected' : ''}>
                    ${client.name}
                </option>
            `).join('');
    const carOptions = MOCK_DATA.cars
      .filter(car => car.status === 'Available' || (selectedCarId !== null && Number(car.id) === selectedCarId))
      .map(car => `
                    <option value="${car.id}" ${selectedCarId !== null && Number(car.id) === selectedCarId ? 'selected' : ''}>
                        ${car.name}
                    </option>
                `).join('');
    const formTitle = isEditMode ? 'Edit booking' : 'New booking';
    const formSubtitle = isEditMode ? 'Update booking details' : 'Fill in booking details to add a new rental';
    const submitLabel = isEditMode ? 'Save changes' : 'Create booking';

    bookingCreateContent.innerHTML = `
                <div class="p-6 border-b">
                    <h2 class="text-xl font-semibold">${formTitle}</h2>
                    <p class="text-sm text-gray-500 mt-1">${formSubtitle}</p>
                </div>
                <form class="p-6 space-y-6" id="booking-create-form">
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Client</label>
                            <select class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="client">
                                <option value="">Select client</option>
                                ${clientOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Vehicle</label>
                            <select class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="vehicle">
                                <option value="">Select vehicle</option>
                                ${carOptions}
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-4 md:col-span-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Start date</label>
                                <input type="date" value="${baseBooking?.startDate || ''}" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="start">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">End date</label>
                                <input type="date" value="${baseBooking?.endDate || ''}" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="end">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 md:col-span-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Start time</label>
                                <input type="time" value="${baseBooking?.startTime || ''}" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="startTime">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">End time</label>
                                <input type="time" value="${baseBooking?.endTime || ''}" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="endTime">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 md:col-span-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Pickup location</label>
                                <input type="text" value="${baseBooking?.pickupLocation || ''}" placeholder="e.g. SkyLuxse HQ" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="pickup">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Drop-off location</label>
                                <input type="text" value="${baseBooking?.dropoffLocation || ''}" placeholder="e.g. Palm Jumeirah" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="dropoff">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Amount (AED)</label>
                            <input type="number" value="${baseBooking?.totalAmount || ''}" min="0" step="50" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="amount">
                        </div>
                    </div>
                </form>
                <div class="p-6 border-t bg-gray-50 flex justify-end space-x-3">
                    <button type="button" id="booking-create-cancel" class="geist-button geist-button-secondary">Cancel</button>
                    <button type="submit" form="booking-create-form" class="geist-button geist-button-primary">${submitLabel}</button>
                </div>
            `;

    const form = bookingCreateContent.querySelector('#booking-create-form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const message = isEditMode ? 'Booking updated (demo)' : 'Booking saved (demo)';
      showToast(message, 'success');
      if (appState.bookingContext) {
        appState.bookingContext.mode = 'create';
        appState.bookingContext.draftBookingId = null;
      }
      if (isEditMode && editingBookingIdValue) {
        window.location.hash = buildHash(appState.currentRole, 'booking-detail', editingBookingIdValue);
      } else {
        window.location.hash = buildHash(appState.currentRole, 'bookings');
      }
    });

    const cancelBtn = bookingCreateContent.querySelector('#booking-create-cancel');
    cancelBtn?.addEventListener('click', () => {
      if (appState.bookingContext) {
        appState.bookingContext.mode = 'create';
        appState.bookingContext.draftBookingId = null;
      }
      if (isEditMode && editingBookingIdValue) {
        window.location.hash = buildHash(appState.currentRole, 'booking-detail', editingBookingIdValue);
      } else {
        window.location.hash = buildHash(appState.currentRole, 'bookings');
      }
    });

    return true;
  };

  const renderVehicleCreateForm = () => {
    if (!vehicleCreateContent) return false;
    vehicleCreateContent.innerHTML = `
                <div class="p-6 border-b">
                    <h2 class="text-xl font-semibold">Add vehicle</h2>
                    <p class="text-sm text-gray-500 mt-1">Register a new car in the fleet</p>
                </div>
                <form class="p-6 space-y-4" id="vehicle-create-form">
                    <input type="text" placeholder="Name" class="w-full px-3 py-2 border border-gray-300 rounded-md" name="name" required>
                    <input type="text" placeholder="Plate number" class="w-full px-3 py-2 border border-gray-300 rounded-md" name="plate" required>
                    <input type="text" placeholder="Color" class="w-full px-3 py-2 border border-gray-300 rounded-md" name="color">
                </form>
                <div class="p-6 border-t bg-gray-50 flex justify-end space-x-3">
                    <button type="button" id="vehicle-create-cancel" class="geist-button geist-button-secondary">Cancel</button>
                    <button type="submit" form="vehicle-create-form" class="geist-button geist-button-primary">Save</button>
                </div>
            `;

    const form = vehicleCreateContent.querySelector('#vehicle-create-form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      showToast('Vehicle added (demo)', 'success');
      window.location.hash = buildHash(appState.currentRole, 'fleet-table');
    });

    vehicleCreateContent.querySelector('#vehicle-create-cancel')?.addEventListener('click', () => {
      window.location.hash = buildHash(appState.currentRole, 'fleet-table');
    });

    return true;
  };

  const renderDocumentViewer = (encodedSelector) => {
    if (!documentViewerImage) return false;
    if (!encodedSelector || encodedSelector === HASH_DEFAULT_SELECTOR) return false;
    try {
      const decoded = atob(decodeURIComponent(encodedSelector));
      documentViewerImage.src = decoded;
      documentViewerImage.alt = 'Document preview';
      return true;
    } catch {
      return false;
    }
  };

  const router = createRouter({
    renderTableView,
    renderTaskDetailPage,
    renderDriverTaskDetail,
    renderMaintenanceForm,
    renderBookingCreateForm,
    renderVehicleCreateForm,
    renderDocumentViewer,
    renderDriverTasks,
    renderReports,
    renderTasksPage,
    stopDriverTracking
  });

  initFleetCalendar(router);

  const openDocumentPage = (url) => {
    if (!url) return;
    try {
      const encoded = encodeURIComponent(btoa(url));
      window.location.hash = buildHash(appState.currentRole, 'document-viewer', encoded);
      router();
    } catch {
      showToast('Cannot open document', 'error');
    }
  };

  // --- EVENT LISTENERS ---
  console.log('🔗 Настройка обработчиков событий...');

  if (loginRoleSelect) {
    loginRoleSelect.addEventListener('change', (e) => {
      const preset = ROLE_EMAIL_PRESETS[e.target.value];
      if (preset && loginEmailInput && !appState.loginEmail) {
        loginEmailInput.value = preset;
        console.log('📧 Email предустановлен:', preset);
      }
    });
  }

  if (loginEmailInput) {
    loginEmailInput.addEventListener('input', (e) => {
      appState.loginEmail = e.target.value;
    });
    // Установить начальное значение из appState
    loginEmailInput.value = appState.loginEmail || 'ops@skyluxse.ae';
  }

  if (requestOtpBtn) {
    requestOtpBtn.addEventListener('click', () => {
      if (otpContainer) {
        otpContainer.classList.remove('hidden');
      }

      if (otpInput) {
        otpInput.removeAttribute('disabled');
        otpInput.value = '';
        otpInput.focus();
      }

      showToast('Demo code sent: 123456', 'info');
      requestOtpBtn.textContent = 'Code sent';
      requestOtpBtn.disabled = true;

      setTimeout(() => {
        requestOtpBtn.textContent = 'Send code again';
        requestOtpBtn.disabled = false;
      }, 15000);
    });
  }

  const handleImportLeads = () => {
    console.warn('Import leads action is not implemented in the demo build.');
    showToast('Import leads is not available in the demo version yet', 'info');
  };

  const openLeadCreationModal = () => {
    console.warn('Lead creation modal is not implemented in the demo build.');
    showToast('Lead creation is coming soon', 'info');
  };

  const importLeadsBtn = document.getElementById('import-leads-btn');
  if (importLeadsBtn) {
    importLeadsBtn.addEventListener('click', () => {
      handleImportLeads();
    });
  }

  const addLeadBtn = document.getElementById('add-lead-btn');
  if (addLeadBtn) {
    addLeadBtn.addEventListener('click', () => {
      openLeadCreationModal();
    });
  }

  document.getElementById('login-button').addEventListener('click', () => {
    console.log('🔐 Клик по кнопке Sign in обнаружен');

    // Проверка email
    const email = loginEmailInput?.value?.trim();
    if (!email) {
      showToast('Пожалуйста, введите email', 'error');
      return;
    }

    // Проверка OTP, если контейнер видим
    if (otpContainer && !otpContainer.classList.contains('hidden')) {
      const otp = otpInput?.value?.trim();
      if (!otp || otp !== '123456') {
        showToast('Неверный код OTP', 'error');
        return;
      }
    }

    const selectedRole = loginRoleSelect?.value || 'operations';
    console.log('👤 Выбранная роль:', selectedRole);

    const roleConfig = ROLES_CONFIG[selectedRole];
    console.log('⚙️ Конфигурация роли:', roleConfig);

    if (!roleConfig) {
      console.error('❌ Конфигурация роли не найдена для:', selectedRole);
      showToast('Ошибка конфигурации роли', 'error');
      return;
    }

    const defaultPage = roleConfig?.defaultPage || 'dashboard';
    console.log('📄 Страница по умолчанию:', defaultPage);

    appState.currentRole = selectedRole;
    appState.loginEmail = email;
    console.log('💾 Состояние приложения обновлено, текущая роль:', appState.currentRole);

    try {
      document.getElementById('page-login').classList.add('hidden');
      appContainer.classList.remove('hidden');
      console.log('✅ Элементы DOM обновлены');

      const targetHash = buildHash(selectedRole, defaultPage);
      console.log('🔗 Целевой хэш:', targetHash);

      window.location.hash = targetHash;
      console.log('✅ Хэш обновлен');

      initApp();
      console.log('🚀 initApp() вызвана');

    } catch (error) {
      console.error('❌ Ошибка при аутентификации:', error);
      showToast('Ошибка при входе в систему', 'error');
    }
  });
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
      }
    });
  }
        
  document.getElementById('burger-menu').addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
  });

  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('sidebar-collapsed');
      if (collapsed) {
        sidebar.classList.remove('-translate-x-full');
      }
      updateSidebarToggleState();
    });
    updateSidebarToggleState();
  }
        
  appContainer.addEventListener('click', e => {
    const link = e.target.closest('a');
    if(link && link.hash && link.hash.startsWith('#')) {
      const { page, selector } = parseHash(link.hash);
      if(!isDefaultSelector(selector) && (page.endsWith('-table') || page === 'bookings')) {
        e.preventDefault();
        const detailPage = getDetailPageId(page);
        window.location.hash = buildHash(appState.currentRole, detailPage, selector);
        router();
        return;
      }
    }

    const taskCard = e.target.closest('.task-card');
    if (taskCard) {
      e.preventDefault();
      window.location.hash = buildHash(appState.currentRole, 'task-detail', taskCard.dataset.taskId);
      router();
      return;
    }

    const kanbanCard = e.target.closest('.kanban-card');
    if (kanbanCard) {
      e.preventDefault();
      const bookingId = kanbanCard.dataset.bookingId;
      window.location.hash = buildHash(appState.currentRole, 'booking-detail', bookingId);
      router();
    }

    const driverTaskCard = e.target.closest('#driver-tasks-list .geist-card');
    if (driverTaskCard) {
      e.preventDefault();
      const taskId = driverTaskCard.dataset.taskId;
      window.location.hash = buildHash(appState.currentRole, 'driver-task-detail', taskId);
      router();
    }

    const backBtn = e.target.closest('.back-to-tasks');
    if (backBtn) {
      e.preventDefault();
      window.location.hash = buildHash(appState.currentRole, 'driver-tasks');
      router();
    }
            
    const calendarBooking = e.target.closest('.calendar-booking-clickable');
    if (calendarBooking && appState.currentPage === 'fleet-calendar') {
      const bookingId = calendarBooking.dataset.bookingId;
      e.preventDefault();
      window.location.hash = buildHash(appState.currentRole, 'booking-detail', bookingId);
      router();
      return;
    }
            
    const docImage = e.target.closest('.doc-image');
    if(docImage) {
      e.preventDefault();
      openDocumentPage(docImage.src);
      return;
    }

    const fleetQuickAction = e.target.closest('.fleet-quick-action');
    if (fleetQuickAction) {
      e.preventDefault();
      const action = fleetQuickAction.dataset.action;
      const carId = fleetQuickAction.dataset.carId;
      if (['maintenance', 'inspection', 'detailing'].includes(action)) {
        appState.maintenanceContext = appState.maintenanceContext || {};
        appState.maintenanceContext.defaultCarId = carId ? Number(carId) : null;
        appState.maintenanceContext.defaultType = action;
        window.location.hash = buildHash(appState.currentRole, 'maintenance-create');
        router();
        return;
      }
      if (action === 'fines') {
        const hasFine = Math.random() < 0.4;
        if (hasFine) {
          const fineAmount = Math.floor(Math.random() * 400) + 200;
          showToast(`Potential fines detected: AED ${fineAmount}`, 'error');
        } else {
          showToast('No fines found for this vehicle (demo)', 'success');
        }
        return;
      }
    }

    const historyFilterBtn = e.target.closest('.fleet-history-filter');
    if (historyFilterBtn) {
      e.preventDefault();
      const historySection = historyFilterBtn.closest('.fleet-history-section');
      if (!historySection) return;
      const selectedType = historyFilterBtn.dataset.type || 'all';
      const activeClasses = ['border-gray-900', 'bg-gray-900', 'text-white'];
      const inactiveClasses = ['border-gray-200', 'bg-white', 'text-gray-600'];
      historySection.querySelectorAll('.fleet-history-filter').forEach(btn => {
        const isActive = btn === historyFilterBtn;
        activeClasses.forEach(cls => btn.classList.toggle(cls, isActive));
        inactiveClasses.forEach(cls => btn.classList.toggle(cls, !isActive));
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      historySection.querySelectorAll('.fleet-history-entry').forEach(entry => {
        const entryType = entry.dataset.historyType || '';
        const shouldShow = selectedType === 'all' || entryType === selectedType;
        entry.classList.toggle('hidden', !shouldShow);
      });
      return;
    }

    const clientDocLink = e.target.closest('.client-doc-link');
    if(clientDocLink) {
      e.preventDefault();
      openDocumentPage(clientDocLink.dataset.url);
      return;
    }
            
    // Handle new booking button
    if (e.target.closest('button') && e.target.closest('button').textContent.includes('New booking')) {
      e.preventDefault();
      window.location.hash = buildHash(appState.currentRole, 'booking-create');
      router();
      return;
    }

    const finesBtn = e.target.closest('.check-fines-btn');
    if (finesBtn) {
      const resultEl = finesBtn.closest('.geist-card')?.querySelector('#fines-result') || document.getElementById('fines-result');
      if (resultEl) {
        const hasFine = Math.random() < 0.35;
        if (hasFine) {
          const fineAmount = Math.floor(Math.random() * 400) + 200;
          resultEl.innerHTML = `<span class="text-rose-600 font-semibold">Fine found ${fineAmount} AED</span><br><span class="text-xs text-gray-500">Recommended to withhold from deposit</span>`;
        } else {
          resultEl.innerHTML = '<span class="text-emerald-600 font-semibold">No fines found</span>';
        }
      }
    }

    // Event delegation for dynamically added elements inside panels/modals
    if (e.target.id === 'doc-check') {
      const formValid = !!document.getElementById('driver-odometer')?.value && !!document.getElementById('driver-fuel')?.value;
      document.getElementById('complete-task-btn').disabled = !e.target.checked || !formValid;
    }
    if (['driver-odometer', 'driver-fuel'].includes(e.target.id)) {
      const docChecked = document.getElementById('doc-check')?.checked;
      const formValid = !!document.getElementById('driver-odometer')?.value && !!document.getElementById('driver-fuel')?.value;
      if (docChecked) {
        const completeBtn = document.getElementById('complete-task-btn');
        if (completeBtn) completeBtn.disabled = !formValid;
      }
    }
    if (e.target.id === 'complete-task-btn') {
      const bookingId = e.target.dataset.bookingId;
      const odometerValue = driverTaskDetailContent?.querySelector('#driver-odometer')?.value.trim();
      const fuelLevel = driverTaskDetailContent?.querySelector('#driver-fuel')?.value;
      if (!odometerValue || !fuelLevel) {
        showToast('Fill in mileage and fuel level before completing', 'error');
        return;
      }
      const paymentCard = document.getElementById('driver-payment-card');
      const dueAmount = parseFloat(paymentCard?.dataset.dueAmount || '0') || 0;
      const collectedAmount = parseFloat(document.getElementById('driver-collect-amount')?.value || '0') || 0;
      const outstandingAfterCollect = Math.max(dueAmount - collectedAmount, 0);
      const collectionReason = document.getElementById('driver-collect-reason')?.value || '';
      if (dueAmount > 0 && outstandingAfterCollect > 0 && !collectionReason) {
        showToast('Select reason for not collecting the full amount', 'error');
        return;
      }
      const finesText = driverTaskDetailContent?.querySelector('#fines-result')?.textContent.trim();
      const payload = {
        odometer: odometerValue,
        fuelLevel,
        fines: finesText,
        collectedAmount,
        outstandingAfterCollect,
        collectionReason
      };

      if (appState.offline.enabled) {
        enqueueOfflineAction({ type: 'driver-task-complete', bookingId, payload });
        showToast('Data saved offline', 'info');
      } else {
        const booking = MOCK_DATA.bookings.find(b => b.id == bookingId);
        if (booking) {
          booking.status = 'settlement';
          booking.mileage = odometerValue;
          booking.fuelLevel = fuelLevel;
          if (collectedAmount > 0) {
            booking.paidAmount = Math.min((booking.paidAmount || 0) + collectedAmount, booking.totalAmount || ((booking.paidAmount || 0) + collectedAmount));
          }
          booking.outstandingDriverNote = outstandingAfterCollect > 0 ? collectionReason : '';
          booking.history = booking.history || [];
          const historyNoteParts = ['Driver completed task'];
          if (collectedAmount > 0) {
            historyNoteParts.push(`Collected ${formatCurrency(collectedAmount)}`);
          }
          if (outstandingAfterCollect > 0) {
            historyNoteParts.push(`Outstanding ${formatCurrency(outstandingAfterCollect)} (${collectionReason || 'reason n/a'})`);
          }
          booking.history.push({ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), event: historyNoteParts.join('. ') });
        }
        const relatedTask = MOCK_DATA.tasks.find(t => String(t.bookingId) === String(bookingId));
        if (relatedTask) {
          relatedTask.status = 'done';
          relatedTask.completedPayload = payload;
        }
        syncOfflineQueue();
      }

      window.location.hash = buildHash(appState.currentRole, 'driver-tasks');
      renderDriverTasks();
      renderTasksPage();
      showToast('Driver task completed', 'success');
    }
  });

  bookingDetailContent?.addEventListener('click', e => {
    const extendBtn = e.target.closest('.booking-extend-btn');
    if (extendBtn) {
      const bookingId = extendBtn.dataset.bookingId || getBookingIdFromElement(extendBtn);
      const planner = bookingDetailContent.querySelector('.extension-planner');
      const booking = bookingId ? findBookingById(bookingId) : null;
      if (!planner || !booking) {
        showToast('Extension planner is unavailable', 'error');
        return;
      }
      planner.classList.remove('hidden');
      updateExtensionPlannerView(planner, booking);
      planner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const cancelPlannerBtn = e.target.closest('.extension-planner-cancel');
    if (cancelPlannerBtn) {
      const planner = cancelPlannerBtn.closest('.extension-planner');
      if (planner) planner.classList.add('hidden');
      return;
    }

    const confirmExtensionBtn = e.target.closest('.extension-confirm-btn');
    if (confirmExtensionBtn) {
      const planner = confirmExtensionBtn.closest('.extension-planner');
      const bookingId = confirmExtensionBtn.dataset.bookingId || planner?.dataset.bookingId || getBookingIdFromElement(confirmExtensionBtn);
      const booking = bookingId ? findBookingById(bookingId) : null;
      if (!planner || !booking) {
        showToast('Cannot confirm extension right now', 'error');
        return;
      }
      const plannerState = updateExtensionPlannerView(planner, booking);
      if (!plannerState) {
        showToast('Fill in extension details first', 'error');
        return;
      }
      const { values, start, end, total, conflict } = plannerState;
      if (!values.startDate || !values.endDate) {
        showToast('Specify extension period', 'error');
        return;
      }
      if (!start || !end || end <= start) {
        showToast('Extension end must be later than start', 'error');
        return;
      }
      if (total <= 0) {
        showToast('Extension amount should be greater than zero', 'error');
        return;
      }
      if (conflict?.hasBlocking) {
        showToast('Resolve extension conflicts before confirming', 'error');
        return;
      }
      const extensionIndex = (Array.isArray(booking.extensions) ? booking.extensions.length : 0) + 1;
      const extensionId = `EXT-${booking.id}-${extensionIndex}`;
      const invoiceId = `INV-${booking.id}-EXT${extensionIndex}`;
      const nowIso = new Date().toISOString();
      const existingInvoices = Array.isArray(booking.invoices) ? booking.invoices : [];
      const currency = booking.billing?.currency || (existingInvoices.find(inv => inv.currency)?.currency) || 'AED';
      if (!Array.isArray(booking.extensions)) booking.extensions = [];
      if (!Array.isArray(booking.history)) booking.history = [];
      if (!Array.isArray(booking.timeline)) booking.timeline = [];
      booking.invoices = existingInvoices;
      const warningFlags = Array.from(new Set(
        (conflict?.messages || [])
          .filter(message => message.type === 'warning')
          .map(message => toSlug(message.text))
          .filter(Boolean)
      ));
      const newExtension = {
        id: extensionId,
        label: `Extension #${extensionIndex}`,
        startDate: values.startDate,
        startTime: values.startTime,
        endDate: values.endDate,
        endTime: values.endTime,
        status: 'confirmed',
        createdAt: nowIso,
        createdBy: 'operations',
        note: values.notes,
        pricing: {
          base: values.baseAmount,
          addons: values.addonsAmount,
          fees: values.feesAmount,
          discounts: values.discountsAmount,
          currency,
          total
        },
        payments: {
          paidAmount: 0,
          outstandingAmount: total,
          lastPaymentAt: null,
          depositAdjustment: 0
        },
        invoiceId,
        riskFlags: warningFlags,
        tasks: [],
        timeline: [
          { ts: nowIso, status: 'extension', note: 'Extension confirmed and invoice issued', actor: 'operations' }
        ],
        notifications: []
      };
      const taskId = getNextTaskId();
      const extensionTask = {
        id: taskId,
        title: `Prepare ${booking.carName} for extension`,
        type: 'delivery',
        category: 'logistics',
        assigneeId: booking.driverId || null,
        status: 'todo',
        deadline: `${values.startDate} ${values.startTime}`,
        bookingId: booking.id,
        priority: 'Medium',
        description: `Extension ${extensionId} for ${booking.clientName}`,
        checklist: [],
        requiredInputs: []
      };
      MOCK_DATA.tasks.push(extensionTask);
      newExtension.tasks.push({ id: taskId, title: extensionTask.title, status: extensionTask.status });
      booking.extensions.push(newExtension);
      booking.history.push({ ts: nowIso.slice(0, 16).replace('T', ' '), event: `Extension ${extensionId} confirmed (${values.startDate} → ${values.endDate})` });
      booking.timeline.push({ ts: nowIso, status: 'extension', note: `Extension ${extensionId} confirmed`, actor: 'operations' });
      booking.invoices.push({
        id: invoiceId,
        label: `Extension invoice · ${values.startDate} - ${values.endDate}`,
        amount: total,
        status: 'Pending',
        issuedDate: nowIso.slice(0, 10),
        dueDate: values.startDate,
        scope: 'extension',
        currency
      });
      if (!Array.isArray(MOCK_DATA.calendarEvents)) MOCK_DATA.calendarEvents = [];
      MOCK_DATA.calendarEvents.push({
        id: `CAL-${extensionId}`,
        carId: booking.carId,
        type: 'extension',
        title: `Extension ${booking.code || `#${booking.id}`}`,
        start: start.toISOString(),
        end: end.toISOString(),
        status: 'scheduled',
        priority: 'medium'
      });
      planner.classList.add('hidden');
      showToast('Extension confirmed', 'success');
      router();
      return;
    }

    const viewInvoiceBtn = e.target.closest('.extension-view-invoice');
    if (viewInvoiceBtn) {
      const invoiceId = viewInvoiceBtn.dataset.invoiceId;
      const bookingId = getBookingIdFromElement(viewInvoiceBtn);
      const booking = bookingId ? findBookingById(bookingId) : null;
      if (!booking) {
        showToast('Booking not found', 'error');
        return;
      }
      const invoice = (booking.invoices || []).find(item => item.id === invoiceId);
      if (invoice) {
        showToast(`${invoice.label}: ${invoice.status}`, 'info');
      } else {
        showToast('Invoice not found', 'error');
      }
      return;
    }

    const addendumBtn = e.target.closest('.extension-download-addendum');
    if (addendumBtn) {
      const docUrl = addendumBtn.dataset.docUrl;
      if (docUrl) {
        window.open(docUrl, '_blank');
        showToast('Opening addendum document', 'info');
      } else {
        showToast('Addendum draft is not uploaded yet', 'warning');
      }
      return;
    }

    const cancelExtensionBtn = e.target.closest('.extension-cancel-btn');
    if (cancelExtensionBtn) {
      const extensionId = cancelExtensionBtn.dataset.extensionId;
      const bookingId = getBookingIdFromElement(cancelExtensionBtn);
      const booking = bookingId ? findBookingById(bookingId) : null;
      if (!booking || !extensionId) {
        showToast('Extension not found', 'error');
        return;
      }
      const extension = (booking.extensions || []).find(ext => String(ext.id) === String(extensionId));
      if (!extension) {
        showToast('Extension not found', 'error');
        return;
      }
      if (toStatusKey(extension.status) === 'cancelled') {
        showToast('Extension already cancelled', 'info');
        return;
      }
      const nowIso = new Date().toISOString();
      extension.status = 'cancelled';
      extension.payments = extension.payments || {};
      extension.payments.outstandingAmount = 0;
      extension.payments.lastPaymentAt = extension.payments.lastPaymentAt || nowIso;
      extension.timeline = extension.timeline || [];
      extension.timeline.push({ ts: nowIso, status: 'cancelled', note: 'Extension cancelled via booking detail', actor: 'operations' });
      booking.history = booking.history || [];
      booking.history.push({ ts: nowIso.slice(0, 16).replace('T', ' '), event: `Extension ${extensionId} cancelled` });
      booking.timeline = booking.timeline || [];
      booking.timeline.push({ ts: nowIso, status: 'extension', note: `Extension ${extensionId} cancelled`, actor: 'operations' });
      const invoice = (booking.invoices || []).find(item => item.id === extension.invoiceId);
      if (invoice) {
        invoice.status = 'Cancelled';
      }
      showToast('Extension cancelled', 'info');
      router();
      return;
    }

    const editBtn = e.target.closest('.booking-edit-btn');
    if (editBtn) {
      const bookingId = editBtn.dataset.bookingId;
      if (bookingId) {
        appState.bookingContext = appState.bookingContext || {};
        appState.bookingContext.mode = 'edit';
        appState.bookingContext.draftBookingId = bookingId;
        window.location.hash = buildHash(appState.currentRole, 'booking-create', bookingId);
      } else {
        showToast('Не удалось открыть редактирование букинга', 'error');
      }
      return;
    }

    const stripeBtn = e.target.closest('.generate-stripe-link');
    if (stripeBtn) {
      const amountInput = bookingDetailContent.querySelector('.stripe-amount-input');
      const reasonSelect = bookingDetailContent.querySelector('.stripe-reason-select');
      const amountValue = amountInput ? amountInput.value : '';
      const reasonValue = reasonSelect ? reasonSelect.value : '';
      const bookingId = stripeBtn.dataset.bookingId;
      const sanitizedAmount = amountValue ? amountValue.toString().replace(',', '.') : '0';
      const reasonSlug = reasonValue ? reasonValue.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') : 'payment';
      const linkToken = Math.random().toString(36).slice(2, 8);
      const stripeLink = `https://pay.stripe.com/mock/skyluxse-${bookingId}-${reasonSlug}-${linkToken}?amount=${encodeURIComponent(sanitizedAmount || '0')}`;

      const resultContainer = bookingDetailContent.querySelector('#stripe-link-result');
      const anchor = bookingDetailContent.querySelector('#stripe-link-anchor');
      const copyBtn = bookingDetailContent.querySelector('.copy-stripe-link');
      const feedback = bookingDetailContent.querySelector('#stripe-copy-feedback');

      if (anchor) {
        anchor.href = stripeLink;
        anchor.textContent = stripeLink;
      }
      if (copyBtn) {
        copyBtn.dataset.link = stripeLink;
      }
      if (feedback) {
        feedback.textContent = 'Link copied';
        feedback.classList.add('hidden');
      }
      if (resultContainer) {
        resultContainer.classList.remove('hidden');
      }
      return;
    }

    const copyStripeBtn = e.target.closest('.copy-stripe-link');
    if (copyStripeBtn) {
      const linkValue = copyStripeBtn.dataset.link;
      const feedback = bookingDetailContent.querySelector('#stripe-copy-feedback');
      const showFeedback = (text, success = true) => {
        if (feedback) {
          feedback.textContent = text;
          feedback.classList.toggle('text-green-600', success);
          feedback.classList.toggle('text-red-600', !success);
          feedback.classList.remove('hidden');
        }
      };

      if (linkValue) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(linkValue)
            .then(() => showFeedback('Link copied'))
            .catch(() => {
              showFeedback('Could not copy automatically', false);
            });
        } else {
          showFeedback('Copy the link manually: ' + linkValue, false);
        }
      }
    }
  });

  const plannerEventHandler = (event) => handlePlannerChange(event.target);
  bookingDetailContent?.addEventListener('input', plannerEventHandler);
  bookingDetailContent?.addEventListener('change', plannerEventHandler);

  pageActionButton.addEventListener('click', () => {
    if(appState.currentPage === 'tasks') {
      showToast('Task creation flow is not available in this demo build', 'info');
    } else if (appState.currentPage === 'fleet-table') {
      window.location.hash = buildHash(appState.currentRole, 'vehicle-create');
      router();
    }
  });
        
  window.addEventListener('popstate', router);
  window.addEventListener('hashchange', router);

  // --- APP INITIALIZATION ---
  const initApp = () => {
    console.log('🔧 Инициализация приложения...');
    console.log('👤 Текущая роль пользователя:', appState.currentRole);
    console.log('🔗 Текущий хэш:', window.location.hash);

    try {
      const burgerMenu = document.querySelector('#burger-menu');
      if (burgerMenu) {
        burgerMenu.innerHTML = getIcon('menu');
        console.log('✅ Меню бургер инициализировано');
      }

      const backBtn = document.querySelector('.back-to-tasks');
      if (backBtn && !backBtn.innerHTML.includes('svg')) {
        backBtn.insertAdjacentHTML('afterbegin', getIcon('chevronLeft'));
        console.log('✅ Кнопка назад инициализирована');
      }

      console.log('🏗️ Обновление layout для роли:', appState.currentRole);
      updateLayoutForRole(appState.currentRole);
      console.log('✅ Layout обновлен');

      console.log('📱 Рендеринг sidebar...');
      renderSidebar();
      console.log('✅ Sidebar отрендерен');

      // Handle initial URL - redirect root to default role/page
      if (window.location.hash === '' || window.location.hash === '#') {
        const defaultPage = ROLES_CONFIG[appState.currentRole]?.defaultPage || 'dashboard';
        const targetHash = buildHash(appState.currentRole, defaultPage);
        console.log('🔀 Перенаправление на страницу по умолчанию:', defaultPage, 'хэш:', targetHash);
        window.location.hash = targetHash;
        return; // Выходим, чтобы роутер не запускался дважды
      }

      console.log('🧭 Запуск роутера...');
      router();
      console.log('✅ Роутер запущен');

    } catch (error) {
      console.error('❌ Ошибка при инициализации приложения:', error);
      console.error('❌ Stack trace:', error.stack);
    }
  };
        
});
