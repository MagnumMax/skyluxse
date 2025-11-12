import {
  MOCK_DATA,
  TASK_TYPES,
  ROLE_EMAIL_PRESETS,
  ROLES_CONFIG,
  getClientById,
  getCarById,
  registerDocument,
  getDocumentUrl
} from './data/index.js';
import {
  appState,
  enqueueOfflineAction,
  syncOfflineQueue,
  getStartOfWeek
} from './state/appState.js';
import {
  HASH_DEFAULT_SELECTOR,
  buildHash,
  parseHash,
  isDefaultSelector
} from './state/navigation.js';
import { renderKanbanBoard } from './render/kanban.js';
import { renderAnalyticsPage, renderSalesPipeline } from './render/charts.js';
import { startTimers } from './render/timers.js';
import { formatCurrency, formatDateLabel } from './render/formatters.js';
import { renderFleetCalendar, initFleetCalendar } from './render/fleetCalendar.js';
import { showToast } from './ui/toast.js';
import { getIcon } from './ui/icons.js';
// Global declarations for browser APIs
/* global confirm */

import { createRouter } from './router.js';

/**
 * Основная точка входа приложения SkyLuxse
 * Инициализирует все компоненты, обработчики событий и роутинг
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 SkyLuxse приложение загружается...');
  console.log('📍 Текущий URL:', window.location.href);
  console.log('ℹ️ Оффлайн режим отключен, работа только через сеть.');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        if (!registrations.length) {
          console.log('🧹 Активных service worker не найдено');
          return;
        }
        console.log(`🧹 Удаляем ${registrations.length} service worker(ов)...`);
        return Promise.all(registrations.map((registration) => registration.unregister()))
          .then(() => console.log('✅ Service worker удалены'));
      })
      .catch((error) => console.error('❌ Не удалось удалить service worker:', error));
  }

  if ('caches' in window) {
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
      .then(() => console.log('🧹 Оффлайн кэши очищены'))
      .catch((error) => console.error('❌ Ошибка очистки кэшей:', error));
  }

  // --- DOM Elements ---
  const sidebar = document.getElementById('sidebar');
  const appContainer = document.getElementById('app-container');
  const bookingDetailContent = document.getElementById('booking-detail-content');
  const taskDetailContent = document.getElementById('task-detail-content');
  const maintenanceCreateContent = document.getElementById('maintenance-create-content');
  const bookingCreateContent = document.getElementById('booking-create-content');
  const vehicleCreateContent = document.getElementById('vehicle-create-content');
  const documentViewerImage = document.getElementById('document-viewer-image');
  const driverTaskDetailContent = document.getElementById('driver-task-detail-content');
  const pageBackButtons = document.querySelectorAll('.page-back-button');
  const pageActionButton = document.getElementById('page-action-button');
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
  
  if (otpInput) {
    otpInput.setAttribute('disabled', 'disabled');
  }


  // Removed unused updateSalesOwnerFilterVisibility function

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
      // For inputs/selects/textareas, read their value safely under TS checkJs
      return ('value' in input) ? /** @type {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} */(input).value || '' : '';
    };
    const rentalAmount = Number.parseFloat(getField('rentalAmount')) || 0;
    return {
      startDate: getField('startDate'),
      startTime: getField('startTime') || '00:00',
      endDate: getField('endDate'),
      endTime: getField('endTime') || '00:00',
      rentalAmount,
      notes: getField('notes')
    };
  };

  const updateExtensionPlannerView = (planner, booking) => {
    if (!planner || !booking) return null;
    const values = collectExtensionPlannerValues(planner);
    if (!values) return null;
    const start = parseDateTimeLocal(values.startDate, values.startTime);
    const end = parseDateTimeLocal(values.endDate, values.endTime);
    const totalRaw = values.rentalAmount;
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
    const conflict = detectExtensionConflicts(booking, start, end);
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

  const renderSidebarNavigation = () => {
    console.log('🔍 [DEBUG] renderSidebarNavigation called, currentRole:', appState.currentRole);
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav) {
      console.error('❌ [DEBUG] sidebar-nav element not found');
      return;
    }

    const roleConfig = ROLES_CONFIG[appState.currentRole];
    if (!roleConfig) {
      console.error('❌ [DEBUG] Role config not found for:', appState.currentRole);
      return;
    }

    console.log('🔍 [DEBUG] Full role config:', JSON.stringify(roleConfig, null, 2));
    console.log('🔍 [DEBUG] Checking for pages property:', roleConfig.pages);
    console.log('🔍 [DEBUG] Checking for nav property:', roleConfig.nav);
    
    // ВНИМАНИЕ: Используем nav вместо pages
    const navPages = roleConfig.nav || roleConfig.pages || [];
    console.log('🔍 [DEBUG] Navigation pages to render:', navPages);
    
    if (!navPages || !Array.isArray(navPages)) {
      console.error('❌ [DEBUG] Navigation pages is not an array:', navPages);
      sidebarNav.innerHTML = '<div class="p-4 text-red-600">Navigation configuration error</div>';
      return;
    }
    
    const navHtml = navPages.map(page => {
      // Обрабатываем как объект с id, name, icon
      if (typeof page === 'object' && page.id) {
        const pageId = page.id;
        const label = page.name || pageId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const icon = page.icon || 'circle';
        return `<a href="${buildHash(appState.currentRole, pageId)}" class="nav-link flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors" data-page="${pageId}">
          ${getIcon(icon, 'w-5 h-5')}
          <span>${label}</span>
        </a>`;
      } 
      // Обрабатываем как строку (старый формат)
      else {
        const pageId = page;
        const pageConfig = roleConfig.pageConfigs?.[pageId] || {};
        const label = pageConfig.label || pageId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const icon = pageConfig.icon || 'circle';
        return `<a href="${buildHash(appState.currentRole, pageId)}" class="nav-link flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors" data-page="${pageId}">
          ${getIcon(icon, 'w-5 h-5')}
          <span>${label}</span>
        </a>`;
      }
    }).join('');

    sidebarNav.innerHTML = navHtml;
    console.log('✅ [DEBUG] Sidebar navigation rendered successfully');
  };

  const renderSidebarProfile = () => {
    console.log('🔍 [DEBUG] renderSidebarProfile called, currentRole:', appState.currentRole);
    const sidebarProfile = document.getElementById('sidebar-profile');
    if (!sidebarProfile) {
      console.error('❌ [DEBUG] sidebar-profile element not found');
      return;
    }

    const roleConfig = ROLES_CONFIG[appState.currentRole];
    if (!roleConfig) {
      console.error('❌ [DEBUG] Role config not found for:', appState.currentRole);
      return;
    }

    const roleLabel = roleConfig.label || appState.currentRole.replace(/\b\w/g, l => l.toUpperCase());
    const userName = appState.loginEmail || 'Пользователь';
    const userRole = roleLabel;
    
    const profileHtml = `
      <div id="profile-menu" class="relative">
        <button id="profile-trigger" class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
          <div id="profile-avatar" class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <div class="flex-1 text-left min-w-0">
            <div id="profile-name" class="text-sm font-medium text-gray-900 truncate">
              ${userName}
            </div>
            <div id="profile-role" class="text-xs text-gray-500 truncate">
              ${userRole}
            </div>
          </div>
          <svg id="profile-chevron" class="w-4 h-4 text-gray-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        <!-- Dropdown Menu -->
        <div id="profile-dropdown" class="hidden absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg border border-gray-200 shadow-lg py-2 z-50">
          <div class="px-4 py-2 border-b border-gray-100">
            <div class="text-sm font-medium text-gray-900" id="dropdown-profile-name">${userName}</div>
            <div class="text-xs text-gray-500" id="dropdown-profile-email">${appState.loginEmail || 'user@skyluxse.ae'}</div>
          </div>
          
          <button id="profile-settings" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            Настройки профиля
          </button>
          
          <button id="logout-button" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Выйти из системы
          </button>
        </div>
      </div>
    `;

    sidebarProfile.innerHTML = profileHtml;
    console.log('✅ [DEBUG] Sidebar profile rendered successfully');
    
    // Initialize profile menu handlers
    initProfileMenu();
  };

  // Removed unused renderSidebar function

  const updateActiveLink = () => {
    console.log('🔍 [DEBUG] updateActiveLink called, currentPage:', appState.currentPage);
    const pageId = appState.currentPage.split('/')[0];
    const navLinks = document.querySelectorAll('#sidebar-nav a');
    console.log('🔍 [DEBUG] Found nav links:', navLinks.length);
    navLinks.forEach(a => {
      if (a.dataset.page === pageId) {
        a.classList.add('nav-link-active');
        console.log('🔍 [DEBUG] Added active class to:', a.dataset.page);
      } else {
        a.classList.remove('nav-link-active');
      }
    });
  };
  const defaultFleetImage = '/images/mercedes-g-class.jpg';

  const getCarImageSrc = (car) => car?.imagePath || car?.imageUrl || defaultFleetImage;

  const formatShortDate = (value, withYear = false) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {})
    });
  };

  const EXPIRY_BADGES = {
    neutral: 'sl-pill sl-pill-compact sl-pill-neutral',
    warning: 'sl-pill sl-pill-compact sl-pill-warning',
    danger: 'sl-pill sl-pill-compact sl-pill-danger',
    success: 'sl-pill sl-pill-compact sl-pill-success'
  };

  const getExpiryMeta = (dateStr) => {
    if (!dateStr) {
      return {
        label: 'No data',
        badgeClass: EXPIRY_BADGES.neutral,
        daysText: '—',
        displayDate: '—',
        accent: 'text-gray-400'
      };
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return {
        label: 'No data',
        badgeClass: EXPIRY_BADGES.neutral,
        daysText: '—',
        displayDate: escapeHtml(dateStr),
        accent: 'text-gray-400'
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) {
      return {
        label: 'Expired',
        badgeClass: EXPIRY_BADGES.danger,
        daysText: `${Math.abs(diffDays)}d overdue`,
        displayDate: formatShortDate(dateStr, true),
        accent: 'text-rose-600'
      };
    }
    if (diffDays <= 30) {
      return {
        label: 'Expiring soon',
        badgeClass: EXPIRY_BADGES.warning,
        daysText: `${diffDays}d left`,
        displayDate: formatShortDate(dateStr, true),
        accent: 'text-amber-600'
      };
    }
    return {
      label: 'Valid',
      badgeClass: EXPIRY_BADGES.success,
      daysText: `${diffDays}d left`,
      displayDate: formatShortDate(dateStr, true),
      accent: 'text-emerald-600'
    };
  };

  const renderExpiryRow = (label, dateStr) => {
    const meta = getExpiryMeta(dateStr);
    return `
      <div class="flex items-center justify-between gap-3 text-xs">
        <div>
          <p class="text-[0.65rem] uppercase tracking-wide text-gray-500">${label}</p>
          <p class="font-semibold text-gray-900">${meta.displayDate || '—'}</p>
        </div>
        <div class="text-right">
          <span class="${meta.badgeClass}">${meta.label}</span>
          <p class="text-[0.65rem] ${meta.accent || 'text-gray-400'}">${meta.daysText}</p>
        </div>
      </div>
    `;
  };

  const renderVehicleCell = (car) => {
    const statusClasses = {
      Available: 'sl-pill sl-pill-compact sl-pill-success',
      'In Rent': 'sl-pill sl-pill-compact sl-pill-brand',
      Maintenance: 'sl-pill sl-pill-compact sl-pill-warning'
    };
    const badgeClass = statusClasses[car.status] || 'sl-pill sl-pill-compact sl-pill-neutral';
    const tags = [car.class, car.segment, car.color]
      .filter(Boolean)
      .map((tag) => `<span class="sl-tag sl-tag-neutral">${escapeHtml(tag)}</span>`)
      .join('');
    const imageSrc = escapeHtml(getCarImageSrc(car));
    return `
      <div class="flex items-start gap-4">
        <div class="relative w-20 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
          <img src="${imageSrc}" alt="${escapeHtml(car.name)}" class="w-full h-full object-cover">
          <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[0.65rem] font-semibold bg-white px-2 py-0.5 rounded-full shadow border border-gray-100">${escapeHtml(car.plate || '—')}</span>
        </div>
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <a href="${buildHash(appState.currentRole, getDetailPageId('fleet-table'), car.id)}" class="font-semibold text-sm text-indigo-600 hover:text-indigo-800">${escapeHtml(car.name)}</a>
            <span class="${badgeClass}">${escapeHtml(car.status || '—')}</span>
          </div>
          <div class="flex flex-wrap gap-1 text-xs text-gray-500">${tags || '<span class="text-gray-400">No tags</span>'}</div>
        </div>
      </div>
    `;
  };

  const renderVehicleYearCell = (car) => `
      <div class="text-sm font-semibold text-gray-900">${car.year || '—'}</div>
    `;

  const renderFleetComplianceCell = (car) => {
    const insuranceDoc = Array.isArray(car.documents) ? car.documents.find((doc) => doc.type === 'insurance') : null;
    const mulkiyaDoc = Array.isArray(car.documents) ? car.documents.find((doc) => doc.type === 'mulkiya') : null;
    const insuranceExpiry = insuranceDoc?.expiry || car.insuranceExpiry;
    const mulkiyaExpiry = mulkiyaDoc?.expiry || car.mulkiyaExpiry;
    return `
      <div class="space-y-3">
        ${renderExpiryRow('Insurance', insuranceExpiry)}
        ${renderExpiryRow('Mulkiya', mulkiyaExpiry)}
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
                        <span class="font-medium text-gray-900">${formatCurrency(client.lifetimeValue || 0)}</span>
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
      const attrs = doc.id ? `data-doc-id="${doc.id}"` : '';
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
      tableTitleEl.textContent = 'Fleet directory';
      const statusPriority = { 'In Rent': 0, Maintenance: 1, Available: 2 };
      rows = [...(MOCK_DATA.cars || [])].sort((a, b) => {
        const priorityDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
        if (priorityDiff !== 0) return priorityDiff;
        return String(a.name || '').localeCompare(b.name || '');
      });
      columns = [
        { label: 'Vehicle', render: renderVehicleCell },
        { label: 'Year', render: renderVehicleYearCell },
        { label: 'Compliance', render: renderFleetComplianceCell }
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
              /** @type {HTMLInputElement|null} */
              const target = /** @type {HTMLInputElement|null} */ (event.target);
              const value = target ? target.value : '';
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

    const includeActionColumn = dataType !== 'fleet-table';
    tableHeadEl.innerHTML = `${columns.map(col => `<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">${col.label}</th>`).join('')}${includeActionColumn ? '<th class="px-6 py-3"></th>' : ''}`;

    const detailPage = dataType.endsWith('-table') ? getDetailPageId(dataType) : dataType;

    tableBodyEl.innerHTML = rows.map(row => `
                <tr class="hover:bg-gray-50">
                    ${columns.map(col => `<td class="px-6 py-4 align-top text-sm text-gray-700">${col.render(row)}</td>`).join('')}
                    ${includeActionColumn ? `<td class="px-6 py-4 text-right text-sm font-medium">
                        <a href="${buildHash(appState.currentRole, detailPage, row.id)}" class="text-indigo-600 hover:text-indigo-900">View details</a>
                    </td>` : ''}
                </tr>
            `).join('');

    tableBodyEl.querySelectorAll('.doc-badge[data-doc-id]').forEach(button => {
      button.addEventListener('click', () => {
        const docId = button.dataset.docId;
        if (docId) {
          window.location.hash = buildHash(appState.currentRole, 'document-viewer', docId);
          router();
        }
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

    if (statusSelect) statusSelect.addEventListener('change', e => { const t = /** @type {HTMLSelectElement|null} */(e.target); appState.filters.tasks.status = t ? t.value : 'all'; renderTasksPage(); });
    if (typeSelect) typeSelect.addEventListener('change', e => { const t = /** @type {HTMLSelectElement|null} */(e.target); appState.filters.tasks.type = t ? t.value : 'all'; renderTasksPage(); });
    if (assigneeSelect) assigneeSelect.addEventListener('change', e => { const t = /** @type {HTMLSelectElement|null} */(e.target); appState.filters.tasks.assignee = t ? t.value : 'all'; renderTasksPage(); });
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
        const t = /** @type {HTMLSelectElement|null} */(event.target);
        const newId = parseInt(t ? t.value : '', 10);
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
    'Approved by fleet manager',
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
      const clientEntity = getClientById(task.clientId);
      const clientName = clientEntity?.name || task.clientName || '';
      const clientInfo = clientName ? `<p class="text-xs text-gray-500">${clientName}</p>` : '';
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
            
    const client = getClientById(task.clientId) || {};
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
      ? client.documents.map(doc => `<a href="#" class="px-3 py-1 rounded-md bg-slate-100 text-slate-700 client-doc-link" data-doc-id="${doc.id}">${doc.name}</a>`).join('')
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
                        </div>` : '<p class="text-sm text-emerald-600">No outstanding balance for this booking</p>'}
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
    const carPreviews = /** @type {HTMLElement|null} */ (document.getElementById('car-previews'));

    if (carInput) {
      carInput.addEventListener('change', function(e) {
        const inputEl = /** @type {HTMLInputElement|null} */ (e.target);
        const fileList = inputEl?.files ? Array.from(inputEl.files) : [];
        const files = fileList.slice(0, 4); // Limit to 4
        if (!carPreviews) return;
        carPreviews.innerHTML = '';
        files.forEach((file) => {
          const reader = new FileReader();
          reader.onload = function(ev) {
            const fr = /** @type {FileReader|null} */ (ev.target);
            const result = fr && typeof fr.result === 'string' ? fr.result : '';
            if (!result) return;
            const img = document.createElement('img');
            img.src = result;
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
      /** @type {HTMLInputElement|null} */
      const odometerInput = /** @type {HTMLInputElement|null} */ (document.getElementById('driver-odometer'));
      /** @type {HTMLSelectElement|null} */
      const fuelSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('driver-fuel'));
      /** @type {HTMLInputElement|null} */
      const docCheck = /** @type {HTMLInputElement|null} */ (document.getElementById('doc-check'));
      const odometerValue = odometerInput?.value?.trim();
      const fuelValue = fuelSelect?.value;
      const docVerified = !!docCheck?.checked;
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
    /** @type {HTMLInputElement|null} */
    const collectionInput = /** @type {HTMLInputElement|null} */ (document.getElementById('driver-collect-amount'));
    const remainingLabel = document.getElementById('driver-collect-remaining');
    const reasonWrap = document.getElementById('driver-collect-reason-wrap');
    /** @type {HTMLSelectElement|null} */
    const reasonSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('driver-collect-reason'));
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

  // --- TASK CREATION MODAL HELPERS ---
  const TASK_CATEGORY_BY_TYPE = {
    delivery: 'logistics',
    pickup: 'logistics',
    maintenance: 'maintenance',
    documents: 'operations'
  };

  const formatTaskTypeLabel = (type) => {
    if (!type) return 'Task';
    const metaLabel = TASK_TYPES[type]?.label;
    if (metaLabel) return metaLabel;
    return type
      .toString()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const collectTaskTypeOptions = () => {
    const typeSet = new Set(Object.keys(TASK_TYPES));
    MOCK_DATA.tasks.forEach(task => {
      if (task?.type) {
        typeSet.add(task.type);
      }
    });
    return Array.from(typeSet).sort((a, b) => formatTaskTypeLabel(a).localeCompare(formatTaskTypeLabel(b)));
  };

  const formatDatetimeLocalValue = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const toDeadlineString = (inputValue) => {
    if (!inputValue) return '';
    const [datePart, timePart] = inputValue.split('T');
    if (!datePart || !timePart) return '';
    return `${datePart} ${timePart.slice(0, 5)}`;
  };

  const cloneChecklistForType = (type) => {
    const meta = TASK_TYPES[type];
    if (!meta?.checklist?.length) return [];
    const stamp = Date.now().toString(36);
    return meta.checklist.map((item, index) => ({
      id: `chk-${stamp}-${index}`,
      label: item.label,
      required: Boolean(item.required),
      completed: false
    }));
  };

  const cloneRequiredInputsForType = (type) => {
    const meta = TASK_TYPES[type];
    if (!meta?.required?.length) return [];
    return meta.required.map(config => ({ ...config }));
  };

  const getBookingDisplayMeta = (booking) => {
    if (!booking) {
      return {
        code: '',
        carLabel: '',
        clientLabel: '',
        fallbackCarLabel: '',
        fallbackClientLabel: ''
      };
    }
    const code = booking.code || `#${booking.id}`;
    const fallbackCarLabel = booking.carName || booking.vehicleName || booking.carModel || 'Vehicle';
    const car = getCarById(booking.carId);
    const carLabel = car?.name || fallbackCarLabel;
    const fallbackClientLabel = booking.clientName || booking.client?.name || 'Client';
    const client = getClientById(booking.clientId);
    const clientLabel = client?.name || fallbackClientLabel;
    return { code, carLabel, clientLabel, fallbackCarLabel, fallbackClientLabel };
  };

  const getBookingOptionSource = () => {
    if (!Array.isArray(MOCK_DATA.bookings)) return [];
    return MOCK_DATA.bookings.map(booking => {
      const meta = getBookingDisplayMeta(booking);
      const label = meta.code ? `${meta.code} · ${meta.carLabel} · ${meta.clientLabel}` : '';
      const searchable = [
        booking.id,
        booking.code,
        meta.clientLabel,
        meta.fallbackClientLabel,
        meta.carLabel,
        meta.fallbackCarLabel
      ]
        .filter(Boolean)
        .map(value => value.toString().toLowerCase())
        .join(' ');
      return { id: booking.id, label, searchable };
    });
  };


  let taskCreateModal = null;
  let taskCreateModalCard = null;
  let taskModalKeydownBound = false;

  const ensureTaskCreateModal = () => {
    if (!taskCreateModal) {
      taskCreateModal = document.createElement('div');
      taskCreateModal.id = 'task-create-modal';
      taskCreateModal.className = 'fixed inset-0 z-50 hidden';
      taskCreateModal.setAttribute('role', 'dialog');
      taskCreateModal.setAttribute('aria-modal', 'true');
      taskCreateModal.innerHTML = `
                <div class="modal-overlay absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-0" data-task-modal-dismiss></div>
                <div class="modal-content relative z-10 flex min-h-full items-start justify-center p-4">
                    <div class="pointer-events-auto relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl" id="task-create-modal-card"></div>
                </div>
            `;
      document.body.appendChild(taskCreateModal);
      taskCreateModalCard = taskCreateModal.querySelector('#task-create-modal-card');
      const overlay = taskCreateModal.querySelector('[data-task-modal-dismiss]');
      overlay?.addEventListener('click', () => {
        closeTaskCreateModal();
      });
    }

    if (!taskModalKeydownBound) {
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && taskCreateModal && !taskCreateModal.classList.contains('hidden')) {
          closeTaskCreateModal();
        }
      });
      taskModalKeydownBound = true;
    }

    return taskCreateModal;
  };

  const closeTaskCreateModal = () => {
    if (!taskCreateModal) return;
    taskCreateModal.classList.add('hidden');
    taskCreateModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
  };

  const handleTaskCreateSubmit = (formEl) => {
    const formData = new window.FormData(formEl);
    const title = (formData.get('title') || '').toString().trim();
    if (!title) {
      showToast('Add task title', 'error');
      formEl.querySelector('[name="title"]')?.focus();
      return;
    }

    const typeValue = (formData.get('type') || '').toString().trim() || 'delivery';
    const status = 'todo';

    const priorityValue = (formData.get('priority') || 'Medium').toString();
    const normalizedPriorityKey = normalizePriorityValue(priorityValue) || 'medium';
    const priority = normalizedPriorityKey.charAt(0).toUpperCase() + normalizedPriorityKey.slice(1);

    const deadlineInputValue = (formData.get('deadline') || '').toString();
    const deadline = toDeadlineString(deadlineInputValue);
    if (!deadline) {
      showToast('Set a deadline date and time', 'error');
      formEl.querySelector('[name="deadline"]')?.focus();
      return;
    }

    const assigneeRaw = (formData.get('assignee') || '').toString().trim();
    const assigneeId = assigneeRaw ? Number(assigneeRaw) : null;
    if (assigneeRaw && Number.isNaN(assigneeId)) {
      showToast('Select a valid assignee', 'error');
      return;
    }

    const bookingRaw = (formData.get('booking') || '').toString().trim();
    const bookingId = bookingRaw ? Number(bookingRaw) : null;
    if (bookingRaw && Number.isNaN(bookingId)) {
      showToast('Booking ID must be a number', 'error');
      formEl.querySelector('[name="booking"]')?.focus();
      return;
    }

    const pickup = (formData.get('pickup') || '').toString().trim();
    const dropoff = (formData.get('dropoff') || '').toString().trim();
    const description = (formData.get('description') || '').toString().trim();

    const typeMeta = TASK_TYPES[typeValue] || {};
    const slaMinutes = typeMeta.slaMinutes || null;
    const sla = slaMinutes
      ? { timerMinutes: slaMinutes, startedAt: status === 'inprogress' ? new Date().toISOString() : null }
      : null;

    const newTask = {
      id: getNextTaskId(),
      title,
      type: typeValue,
      category: TASK_CATEGORY_BY_TYPE[typeValue] || 'operations',
      assigneeId,
      status,
      deadline,
      bookingId,
      priority,
      description: description || `${formatTaskTypeLabel(typeValue)} task created from fleet board`,
      checklist: cloneChecklistForType(typeValue),
      requiredInputs: cloneRequiredInputsForType(typeValue),
      geo: pickup || dropoff ? { pickup, dropoff } : null,
      sla
    };

    MOCK_DATA.tasks.unshift(newTask);
    closeTaskCreateModal();
    renderTasksPage();
    showToast('Task created', 'success');
  };

  const bindTaskCreateModalEvents = () => {
    if (!taskCreateModal) return;
    const form = taskCreateModal.querySelector('#task-create-form');
    const closeBtn = taskCreateModal.querySelector('#task-create-close');
    const cancelBtn = taskCreateModal.querySelector('#task-create-cancel');
    closeBtn?.addEventListener('click', () => closeTaskCreateModal());
    cancelBtn?.addEventListener('click', () => closeTaskCreateModal());

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      handleTaskCreateSubmit(form);
    });

    form?.querySelector('[name="title"]')?.focus();
  };

  const openTaskCreateModal = () => {
    const modal = ensureTaskCreateModal();
    if (!modal || !taskCreateModalCard) return;
    const typeOptions = collectTaskTypeOptions();
    const defaultDeadline = formatDatetimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000));
    const priorities = ['High', 'Medium', 'Low'];
    const driversOptions = MOCK_DATA.drivers.map(driver => `<option value="${driver.id}">${driver.name}</option>`).join('');
    const typeOptionsHtml = (typeOptions.length ? typeOptions : ['delivery'])
      .map(type => `<option value="${type}">${formatTaskTypeLabel(type)}</option>`)
      .join('');

    taskCreateModalCard.innerHTML = `
                <div class="border-b border-border p-6">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <h2 class="text-xl font-semibold text-foreground">New task</h2>
                            <p class="mt-1 text-sm text-muted-foreground">Create and assign a new operational task</p>
                        </div>
                        <button type="button" class="text-muted-foreground hover:text-foreground" id="task-create-close" aria-label="Close">
                            ${getIcon('x', 'w-5 h-5')}
                        </button>
                    </div>
                </div>
                <form class="p-6 space-y-5" id="task-create-form">
                    <div>
                        <label class="mb-1 block text-sm font-medium text-foreground">Title</label>
                        <input type="text" name="title" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Deliver G-Wagen #1052" required>
                    </div>
                    <div>
                        <label class="mb-1 block text-sm font-medium text-foreground">Task type</label>
                        <select name="type" id="task-create-type" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            ${typeOptionsHtml}
                        </select>
                    </div>
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-foreground">Priority</label>
                            <select name="priority" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                ${priorities.map(priority => `<option value="${priority}">${priority}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-foreground">Assignee</label>
                            <select name="assignee" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <option value="">Unassigned</option>
                                ${driversOptions}
                            </select>
                        </div>
                    </div>
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-foreground">Deadline</label>
                            <input type="datetime-local" name="deadline" value="${defaultDeadline}" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" required>
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-foreground">Related booking (optional)</label>
                            <div class="space-y-2">
                                <input type="search" id="task-booking-search" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Search by booking, client or vehicle">
                                <select name="booking" id="task-booking-select" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <option value="">Not linked</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-foreground">Pickup / origin</label>
                            <input type="text" name="pickup" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="SkyLuxse HQ">
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-foreground">Drop-off / destination</label>
                            <input type="text" name="dropoff" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Atlantis The Palm">
                        </div>
                    </div>
                    <div>
                        <label class="mb-1 block text-sm font-medium text-foreground">Description</label>
                        <textarea name="description" rows="3" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Add special instructions or context"></textarea>
                    </div>
                </form>
                <div class="flex justify-end gap-3 border-t border-border bg-muted/40 p-6">
                    <button type="button" class="geist-button geist-button-secondary" id="task-create-cancel">Cancel</button>
                    <button type="submit" form="task-create-form" class="geist-button geist-button-primary">Save task</button>
                </div>
            `;

    const bookingOptionsSource = getBookingOptionSource();
    const bookingSearchInput = taskCreateModalCard.querySelector('#task-booking-search');
    const bookingSelect = taskCreateModalCard.querySelector('#task-booking-select');
    const renderBookingOptions = (query = '') => {
      if (!bookingSelect) return;
      const normalized = query.trim().toLowerCase();
      const filtered = normalized
        ? bookingOptionsSource.filter(option => option.searchable.includes(normalized))
        : bookingOptionsSource;
      if (!filtered.length) {
        bookingSelect.innerHTML = '<option value="">No matches</option>';
        bookingSelect.disabled = true;
        return;
      }
      bookingSelect.disabled = false;
      const optionsHtml = filtered
        .slice(0, 50)
        .map(option => `<option value="${option.id}">${escapeHtml(option.label)}</option>`)
        .join('');
      bookingSelect.innerHTML = `<option value="">Not linked</option>${optionsHtml}`;
    };
    renderBookingOptions();
    bookingSearchInput?.addEventListener('input', (event) => {
      /** @type {HTMLInputElement|null} */
      const target = /** @type {HTMLInputElement|null} */ (event.target);
      renderBookingOptions(target ? target.value : '');
    });

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
    bindTaskCreateModalEvents();
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
    const relatedBookingCarLabel = booking
      ? (getCarById(booking.carId)?.name || booking.carName || 'Vehicle')
      : '';
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
    /**
     * @typedef {Object} TaskRequiredInputConfig
     * @property {string} key
     * @property {string} label
     * @property {'text'|'number'|'file'} type
     * @property {string=} accept
     * @property {boolean=} multiple
     */
    /** @type {TaskRequiredInputConfig[]} */
    const requiredInputConfigs = getTaskRequiredInputs(task) || [];
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
                            <span><strong>#${booking.id}</strong> · ${relatedBookingCarLabel}</span>
                            <a class="text-blue-600 hover:underline text-sm" href="${buildHash(appState.currentRole, 'booking-detail', booking.id)}">Open booking details</a>
                        </div>
                    </div>` : ''}
                </div>
                <div class="px-6 pb-6 flex justify-end">
                    <button id="task-complete-btn" class="geist-button geist-button-primary text-sm">Complete task</button>
                </div>
            `;

    /** @type {Map<string, TaskRequiredInputConfig>} */
    const requiredInputMap = new Map(requiredInputConfigs.map(config => [config.key, config]));
    taskDetailContent.querySelectorAll('.task-required-input').forEach((el) => {
      if (!(el instanceof HTMLInputElement)) return;
      const input = el;
      const key = input.dataset.requiredKey || '';
      /** @type {TaskRequiredInputConfig|undefined} */
      const cfg = requiredInputMap.get(key);
      const inputType = input.dataset.inputType || (cfg && cfg.type) || 'text';
      if (!task.requiredDataValues) { /** @type {Record<string, string|string[]>} */ (task.requiredDataValues = {}); }
      /** @param {Event} event */
      const handler = (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (!task.requiredDataValues) { /** @type {Record<string, string|string[]>} */ (task.requiredDataValues = {}); }
        if (inputType === 'file') {
          const files = Array.from(target.files || []);
          task.requiredDataValues[key] = files.map(file => file.name);
          const infoEl = target.closest('label')?.querySelector('.task-required-input-info');
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
            target.classList.remove('border-rose-400', 'ring-1', 'ring-rose-100', 'focus:ring-rose-200', 'focus:border-rose-400');
          }
        } else {
          const currentValue = target.value || '';
          task.requiredDataValues[key] = currentValue;
          if (currentValue.trim()) {
            target.classList.remove('border-rose-400', 'ring-1', 'ring-rose-100', 'focus:ring-rose-200', 'focus:border-rose-400');
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
          requiredInputConfigs.forEach(/** @param {TaskRequiredInputConfig} config */ (config) => {
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
  // Removed unused updateLayoutForRole function
        

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
                <div class="border-b border-border p-6">
                    <h2 class="text-xl font-semibold text-foreground">Schedule maintenance</h2>
                    <p class="mt-1 text-sm text-muted-foreground">Create a maintenance slot for a vehicle</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="mb-1 block text-sm font-medium text-foreground">Vehicle</label>
                        <select class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" id="maintenance-car">
                            ${carOptions}
                        </select>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-foreground">Start</label>
                            <input type="datetime-local" id="maintenance-start" value="${defaultStart}" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-foreground">End</label>
                            <input type="datetime-local" id="maintenance-end" value="${defaultEnd}" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        </div>
                    </div>
                    <div>
                        <label class="mb-1 block text-sm font-medium text-foreground">Work type</label>
                        <select id="maintenance-type" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <option value="maintenance"${defaultType === 'maintenance' ? ' selected' : ''}>Scheduled maintenance</option>
                            <option value="inspection"${defaultType === 'inspection' ? ' selected' : ''}>Inspection</option>
                            <option value="detailing"${defaultType === 'detailing' ? ' selected' : ''}>Detailing</option>
                        </select>
                    </div>
                    <div>
                        <label class="mb-1 block text-sm font-medium text-foreground">Comment</label>
                        <textarea id="maintenance-notes" rows="3" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Add notes for mechanic or driver"></textarea>
                    </div>
                </div>
                <div class="flex justify-end gap-2 border-t border-border bg-muted/40 p-4">
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
                <div class="border-b border-border p-6">
                    <h2 class="text-xl font-semibold text-foreground">${formTitle}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">${formSubtitle}</p>
                </div>
                <form class="p-6 space-y-6" id="booking-create-form">
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="block text-sm font-medium text-foreground">Client</label>
                            <select class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="client">
                                <option value="">Select client</option>
                                ${clientOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-foreground">Vehicle</label>
                            <select class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="vehicle">
                                <option value="">Select vehicle</option>
                                ${carOptions}
                            </select>
                        </div>
                        <div class="grid gap-4 md:col-span-2 md:grid-cols-2">
                            <div>
                                <label class="block text-sm font-medium text-foreground">Start date</label>
                                <input type="date" value="${baseBooking?.startDate || ''}" class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="start">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-foreground">End date</label>
                                <input type="date" value="${baseBooking?.endDate || ''}" class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="end">
                            </div>
                        </div>
                        <div class="grid gap-4 md:col-span-2 md:grid-cols-2">
                            <div>
                                <label class="block text-sm font-medium text-foreground">Start time</label>
                                <input type="time" value="${baseBooking?.startTime || ''}" class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="startTime">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-foreground">End time</label>
                                <input type="time" value="${baseBooking?.endTime || ''}" class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="endTime">
                            </div>
                        </div>
                        <div class="grid gap-4 md:col-span-2 md:grid-cols-2">
                            <div>
                                <label class="block text-sm font-medium text-foreground">Pickup location</label>
                                <input type="text" value="${baseBooking?.pickupLocation || ''}" placeholder="e.g. SkyLuxse HQ" class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="pickup">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-foreground">Drop-off location</label>
                                <input type="text" value="${baseBooking?.dropoffLocation || ''}" placeholder="e.g. Palm Jumeirah" class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="dropoff">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-foreground">Amount (AED)</label>
                            <input type="number" value="${baseBooking?.totalAmount || ''}" min="0" step="50" class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="amount">
                        </div>
                    </div>
                </form>
                <div class="flex justify-end space-x-3 border-t border-border bg-muted/40 p-6">
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
                <div class="border-b border-border p-6">
                    <h2 class="text-xl font-semibold text-foreground">Add vehicle</h2>
                    <p class="mt-1 text-sm text-muted-foreground">Register a new car in the fleet</p>
                </div>
                <form class="p-6 space-y-4" id="vehicle-create-form">
                    <input type="text" placeholder="Name" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="name" required>
                    <input type="text" placeholder="Plate number" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="plate" required>
                    <input type="text" placeholder="Color" class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="color">
                </form>
                <div class="flex justify-end space-x-3 border-t border-border bg-muted/40 p-6">
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

  const renderDocumentViewer = (documentId) => {
    if (!documentViewerImage) return false;
    if (!documentId || documentId === HASH_DEFAULT_SELECTOR) return false;
    try {
      const url = getDocumentUrl(documentId);
      if (!url) return false;
      documentViewerImage.src = url;
      documentViewerImage.alt = 'Document preview';
      return true;
    } catch {
      return false;
    }
  };

  const baseRouter = createRouter({
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

  const router = () => {
    console.log('🔍 [DEBUG] Router called, currentPage:', appState.currentPage);
    baseRouter();
    updateActiveLink();
  };

  initFleetCalendar(router);

  const openDocumentPage = (url) => {
    if (!url) return;
    try {
      const documentId = registerDocument(url);
      if (!documentId) {
        showToast('Cannot register document', 'error');
        return;
      }
      window.location.hash = buildHash(appState.currentRole, 'document-viewer', documentId);
      router();
    } catch {
      showToast('Cannot open document', 'error');
    }
  };

  // --- EVENT LISTENERS ---
  console.log('🔗 Настройка обработчиков событий...');

  if (loginRoleSelect) {
    loginRoleSelect.addEventListener('change', (e) => {
      const t = /** @type {HTMLSelectElement|null} */(e.target);
      const preset = ROLE_EMAIL_PRESETS[t ? t.value : 'operations'];
      if (preset && loginEmailInput && !appState.loginEmail) {
        loginEmailInput.value = preset;
        console.log('📧 Email предустановлен:', preset);
      }
    });
  }

  if (loginEmailInput) {
    loginEmailInput.addEventListener('input', (e) => {
      const t = /** @type {HTMLInputElement|null} */(e.target);
      appState.loginEmail = t ? t.value : '';
    });
    // Установить начальное значение из appState
    loginEmailInput.value = appState.loginEmail || 'fleet@skyluxse.ae';
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

    // Проверим наличие навигации в конфигурации роли
    console.log('🔍 [DEBUG] Checking role navigation config:', {
      nav: roleConfig.nav,
      pages: roleConfig.pages,
      pageConfigs: roleConfig.pageConfigs
    });

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

      // initApp() removed as unused

      // Render sidebar navigation after login
      console.log('🔍 [DEBUG] Rendering sidebar navigation after login');
      renderSidebarNavigation();
      renderSidebarProfile();
      initMobileMenuButton();

    } catch (error) {
      console.error('❌ Ошибка при аутентификации:', error);
      console.error('❌ Stack trace:', error.stack);
      showToast('Ошибка при входе в систему', 'error');
    }
  });

  const initMobileMenuButton = () => {
    const burgerMenuBtn = document.getElementById('burger-menu');
    if (burgerMenuBtn && !burgerMenuBtn.dataset.initialized) {
      burgerMenuBtn.innerHTML = getIcon('menu', 'w-6 h-6');
      burgerMenuBtn.dataset.initialized = 'true';
      console.log('✅ [DEBUG] Burger menu button initialized');
    }
  };

  // Handle profile menu interactions
  const initProfileMenu = () => {
    console.log('🔍 [DEBUG] Initializing profile menu handlers...');
    
    const profileTrigger = document.getElementById('profile-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutButton = document.getElementById('logout-button');
    const profileSettings = document.getElementById('profile-settings');

    if (profileTrigger) {
      profileTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfileMenu();
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
      });
    }

    if (profileSettings) {
      profileSettings.addEventListener('click', (e) => {
        e.preventDefault();
        closeProfileMenu();
        console.log('Profile settings clicked');
        // In a real app, this would open settings modal
      });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (profileDropdown && !profileDropdown.classList.contains('hidden') &&
          !profileDropdown.contains(e.target) && !profileTrigger?.contains(e.target)) {
        closeProfileMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && profileDropdown && !profileDropdown.classList.contains('hidden')) {
        closeProfileMenu();
        profileTrigger?.focus();
      }
    });

    console.log('✅ [DEBUG] Profile menu handlers initialized');
  };

  let profileMenuOpen = false;

  const toggleProfileMenu = () => {
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileTrigger = document.getElementById('profile-trigger');
    
    if (!profileDropdown || !profileTrigger) return;

    if (profileMenuOpen) {
      closeProfileMenu();
    } else {
      openProfileMenu();
    }
  };

  const openProfileMenu = () => {
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileTrigger = document.getElementById('profile-trigger');
    
    if (!profileDropdown || !profileTrigger) return;

    profileDropdown.classList.remove('hidden');
    profileTrigger.setAttribute('aria-expanded', 'true');
    profileMenuOpen = true;

    // Focus first menu item for accessibility
    const firstMenuItem = profileDropdown.querySelector('button');
    if (firstMenuItem) {
      setTimeout(() => firstMenuItem.focus(), 100);
    }
  };

  const closeProfileMenu = () => {
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileTrigger = document.getElementById('profile-trigger');
    const profileChevron = document.getElementById('profile-chevron');
    
    if (!profileDropdown || !profileTrigger) return;

    profileDropdown.classList.add('hidden');
    profileTrigger.setAttribute('aria-expanded', 'false');
    if (profileChevron) {
      profileChevron.style.transform = 'rotate(0deg)';
    }
    profileMenuOpen = false;
  };

  const handleLogout = () => {
    // Show confirmation dialog
    const confirmed = confirm('Вы уверены, что хотите выйти из системы?');
    
    if (confirmed) {
      performLogout();
    }
  };

  const performLogout = async () => {
    try {
      // Show loading state
      showLogoutLoading();

      // Clear user data from localStorage
      localStorage.removeItem('skyluxse_user');
      localStorage.removeItem('skyluxse_session');
      localStorage.removeItem('skyluxse_auth_token');

      // Clear any other application-specific data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('skyluxse_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Show success message
      showLogoutSuccess();

      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error during logout:', error);
      showLogoutError();
    }
  };

  const showLogoutLoading = () => {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.innerHTML = `
        <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Выход...
      `;
      logoutButton.disabled = true;
    }
  };

  const showLogoutSuccess = () => {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Выполнено
      `;
      logoutButton.classList.add('text-green-600');
    }
  };

  const showLogoutError = () => {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Ошибка
      `;
      logoutButton.disabled = false;
      
      // Reset after delay
      setTimeout(() => {
        resetLogoutButton();
      }, 2000);
    }
  };

  const resetLogoutButton = () => {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
        Выйти из системы
      `;
      logoutButton.disabled = false;
      logoutButton.classList.remove('text-green-600');
    }
  };

  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        // Скрыть overlay при клике на навигацию
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) {
          overlay.classList.add('hidden');
        }
      }
    });
  }

  // Универсальная функция для закрытия мобильного сайдбара
  const closeMobileSidebar = () => {
    sidebar.classList.add('-translate-x-full');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    // Убираем класс для предотвращения скролла
    document.body.classList.remove('sidebar-open');
  };

  // Обработчики событий для мобильного сайдбара
  const burgerMenuBtn = document.getElementById('burger-menu');
  if (burgerMenuBtn) {
    burgerMenuBtn.addEventListener('click', () => {
      const overlay = document.getElementById('sidebar-overlay');
      const isVisible = !sidebar.classList.contains('-translate-x-full');
      
      if (isVisible) {
        // Сайдбар открыт - закрываем
        closeMobileSidebar();
      } else {
        // Сайдбар закрыт - открываем
        sidebar.classList.remove('-translate-x-full');
        if (overlay) {
          overlay.classList.remove('hidden');
        }
        // Добавляем класс для предотвращения скролла body
        document.body.classList.add('sidebar-open');
      }
    });
  }

  // Закрытие сайдбара при клике на overlay
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeMobileSidebar);
  }

  // Обработчик кнопки закрытия в сайдбаре
  const sidebarCloseBtn = document.getElementById('sidebar-close');
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
  }

  // Закрытие сайдбара при изменении размера окна (переход на десктоп)
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      const overlay = document.getElementById('sidebar-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
      }
    }
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
      const docId = clientDocLink.dataset.docId;
      if (docId) {
        window.location.hash = buildHash(appState.currentRole, 'document-viewer', docId);
        router();
      }
      return;
    }
            
    // Handle new booking button
    if (e.target.closest('button') && e.target.closest('button').textContent.includes('New booking')) {
      e.preventDefault();
      window.location.hash = buildHash(appState.currentRole, 'booking-create');
      router();
      return;
    }

    const targetEl = /** @type {HTMLElement|null} */ (e.target instanceof HTMLElement ? e.target : null);
    const finesBtn = targetEl?.closest('.check-fines-btn');
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
    if (targetEl && targetEl.id === 'doc-check') {
      const formValid = !!document.getElementById('driver-odometer')?.value && !!document.getElementById('driver-fuel')?.value;
      const completeBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('complete-task-btn'));
      const docInput = /** @type {HTMLInputElement} */ (targetEl);
      if (completeBtn) completeBtn.disabled = !docInput.checked || !formValid;
    }
    if (targetEl && ['driver-odometer', 'driver-fuel'].includes(targetEl.id)) {
      const docChecked = document.getElementById('doc-check')?.checked;
      const formValid = !!document.getElementById('driver-odometer')?.value && !!document.getElementById('driver-fuel')?.value;
      if (docChecked) {
        const completeBtn = document.getElementById('complete-task-btn');
        if (completeBtn) completeBtn.disabled = !formValid;
      }
    }
    if (targetEl && targetEl.id === 'complete-task-btn') {
      const btn = /** @type {HTMLButtonElement} */ (targetEl);
      const bookingId = btn.dataset.bookingId;
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

    const ratingSubmitBtn = e.target.closest('.sales-rating-submit');
    if (ratingSubmitBtn) {
      if (appState.currentRole !== 'ceo') {
        showToast('Only CEO can share this rating', 'error');
        return;
      }
      const bookingId = ratingSubmitBtn.dataset.bookingId || getBookingIdFromElement(ratingSubmitBtn);
      const booking = bookingId ? findBookingById(bookingId) : null;
      if (!booking) {
        showToast('Booking not found', 'error');
        return;
      }
      const controlsContainer = ratingSubmitBtn.closest('[data-booking-id]');
      const ratingInput = controlsContainer?.querySelector('.sales-rating-input');
      const commentInput = controlsContainer?.querySelector('.sales-rating-comment');
      const rawValue = Number(ratingInput?.value);
      if (!Number.isFinite(rawValue)) {
        showToast('Select score between 1 and 10', 'error');
        return;
      }
      const normalizedRating = Math.min(10, Math.max(1, Math.round(rawValue)));
      const feedback = (commentInput?.value || '').trim();
      booking.salesService = booking.salesService || {};
      booking.salesService.rating = normalizedRating;
      booking.salesService.feedback = feedback;
      booking.salesService.ratedBy = appState.currentRole;
      booking.salesService.ratedAt = new Date().toISOString();
      booking.history = booking.history || [];
      booking.history.push({
        ts: new Date().toISOString().slice(0, 16).replace('T', ' '),
        event: `Sales service rated ${normalizedRating}/10 by CEO`
      });
      showToast('Sales team notified about the rating', 'success');
      router();
      renderKanbanBoard();
      renderAnalyticsPage();
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
          base: values.rentalAmount,
          addons: 0,
          fees: 0,
          discounts: 0,
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
      const carLabel = getCarById(booking.carId)?.name || booking.carName || 'Vehicle';
      const clientLabel = getClientById(booking.clientId)?.name || booking.clientName || 'Client';
      const extensionTask = {
        id: taskId,
        title: `Prepare ${carLabel} for extension`,
        type: 'delivery',
        category: 'logistics',
        assigneeId: booking.driverId || null,
        status: 'todo',
        deadline: `${values.startDate} ${values.startTime}`,
        bookingId: booking.id,
        priority: 'Medium',
        description: `Extension ${extensionId} for ${clientLabel}`,
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
  const bookingDetailInputHandler = (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') {
      return;
    }
    handlePlannerChange(target);
    if (target.classList?.contains('sales-rating-input')) {
      const wrapper = target.closest('[data-booking-id]');
      const preview = wrapper?.querySelector('[data-role="sales-rating-value"]');
      if (preview) {
        const numericValue = Math.min(10, Math.max(1, Math.round(Number(target.value) || 0)));
        preview.textContent = `${numericValue}/10`;
      }
    }
  };
  bookingDetailContent?.addEventListener('input', bookingDetailInputHandler);
  bookingDetailContent?.addEventListener('change', plannerEventHandler);

  if (pageActionButton) {
    pageActionButton.addEventListener('click', () => {
      if (appState.currentPage === 'tasks') {
        openTaskCreateModal();
      } else if (appState.currentPage === 'fleet-table') {
        window.location.hash = buildHash(appState.currentRole, 'vehicle-create');
        router();
      }
    });
  }
        
  window.addEventListener('popstate', router);
  window.addEventListener('hashchange', router);

        
});
