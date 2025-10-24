/**
 * @fileoverview Модуль для управления роутингом в SPA
 */

import { ROLES_CONFIG } from '/src/data/index.js';
import { appState } from '/src/state/appState.js';
import { buildHash, parseHash, isDefaultSelector, HASH_DEFAULT_SELECTOR } from '/src/state/navigation.js';
import { renderKanbanBoard } from '/src/render/kanban.js';
import { renderDashboard } from '/src/render/dashboard.js';
import { renderAnalyticsPage, renderSalesPipeline } from '/src/render/charts.js';
import { startTimers } from '/src/render/timers.js';
import { renderFleetCalendar } from '/src/render/fleetCalendar.js';
import { renderDetailPanel } from '/src/render/detailPanel.js';

const AUXILIARY_PAGES = [
  'booking-detail',
  'fleet-detail',
  'client-detail',
  'task-detail',
  'maintenance-create',
  'booking-create',
  'vehicle-create',
  'document-viewer'
];

/**
 * Возвращает идентификатор страницы деталей для базовой страницы.
 * @param {string} basePage
 * @returns {string}
 */
const getDetailPageId = (basePage) => {
  if (basePage === 'bookings') return 'booking-detail';
  if (basePage === 'fleet-table') return 'fleet-detail';
  if (basePage === 'clients-table') return 'client-detail';
  return basePage.replace('-table', '-detail');
};

/**
 * Создает функцию роутера с внедренными обработчиками рендеринга.
 * @param {Object} handlers
 * @param {(page: string) => void} handlers.renderTableView
 * @param {(selector: string) => boolean} handlers.renderTaskDetailPage
 * @param {(selector: string) => boolean} handlers.renderDriverTaskDetail
 * @param {() => void} handlers.renderMaintenanceForm
 * @param {() => void} handlers.renderBookingCreateForm
 * @param {() => void} handlers.renderVehicleCreateForm
 * @param {(selector: string) => boolean} handlers.renderDocumentViewer
 * @param {() => void} handlers.renderDriverTasks
 * @param {() => void} handlers.renderReports
 * @param {() => void} handlers.renderTasksPage
 * @param {() => void} handlers.stopDriverTracking
 * @returns {() => void}
 */
export const createRouter = (handlers) => {
  const {
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
  } = handlers;

  return () => {
    console.log('🧭 Запуск роутера...');
    console.log('🔗 Текущий хэш:', window.location.hash);
    console.log('👤 Текущая роль в состоянии:', appState.currentRole);

    if (appState.timerInterval) {
      clearInterval(appState.timerInterval);
      console.log('🕐 Таймеры очищены');
    }

    const parsedHash = parseHash(window.location.hash);
    let { role, page, selector } = parsedHash;
    console.log('📋 Парсинг хэша:', { role, page, selector });
    console.log('🔍 Сравнение ролей - хэш:', role, 'состояние:', appState.currentRole);

    const roleConfig = ROLES_CONFIG[role];
    const layout = roleConfig?.layout || 'desktop';
    console.log('🏗️ Конфигурация роли:', { layout, roleConfig: !!roleConfig, defaultPage: roleConfig?.defaultPage });

    let normalizedSelector = selector;
    let needsUpdate = !parsedHash.isCanonical;

    if (!isDefaultSelector(normalizedSelector)) {
      if (page === 'bookings' || page.endsWith('-table')) {
        page = getDetailPageId(page);
        needsUpdate = true;
      }
    }

    if (layout === 'desktop' && roleConfig?.nav?.length) {
      const allowedPages = roleConfig.nav.map(item => item.id);
      if (!allowedPages.includes(page) && !page.endsWith('-table') && !AUXILIARY_PAGES.includes(page)) {
        page = roleConfig.defaultPage;
        normalizedSelector = HASH_DEFAULT_SELECTOR;
        needsUpdate = true;
      }
    } else if (layout === 'mobile') {
      const defaultPage = roleConfig?.defaultPage || 'driver-tasks';
      if (page !== defaultPage) {
        needsUpdate = true;
      }
      page = defaultPage;
    }

    if (page === 'driver-task-detail' && isDefaultSelector(normalizedSelector)) {
      page = roleConfig?.defaultPage || 'driver-tasks';
      normalizedSelector = HASH_DEFAULT_SELECTOR;
      needsUpdate = true;
    }

    if (needsUpdate) {
      const updatedHash = buildHash(role, page, normalizedSelector);
      if (window.location.hash !== updatedHash) {
        window.location.hash = updatedHash;
        return;
      }
    }

    appState.currentRole = role;
    appState.currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

    let pageId = `page-${appState.currentPage}`;

    if (appState.currentPage.endsWith('-table')) {
      pageId = 'page-table-view';
      if (typeof renderTableView === 'function') {
        renderTableView(appState.currentPage);
      } else {
        console.warn('⚠️ renderTableView handler не передан');
      }
    } else if (appState.currentPage === 'booking-detail') {
      if (isDefaultSelector(normalizedSelector) || !renderDetailPanel('bookings', normalizedSelector)) {
        page = 'bookings';
        normalizedSelector = HASH_DEFAULT_SELECTOR;
        needsUpdate = true;
      }
    } else if (appState.currentPage === 'fleet-detail') {
      if (isDefaultSelector(normalizedSelector) || !renderDetailPanel('fleet-table', normalizedSelector)) {
        page = 'fleet-table';
        normalizedSelector = HASH_DEFAULT_SELECTOR;
        needsUpdate = true;
      }
    } else if (appState.currentPage === 'client-detail') {
      if (isDefaultSelector(normalizedSelector) || !renderDetailPanel('clients-table', normalizedSelector)) {
        page = 'clients-table';
        normalizedSelector = HASH_DEFAULT_SELECTOR;
        needsUpdate = true;
      }
    } else if (appState.currentPage === 'task-detail') {
      const rendered = typeof renderTaskDetailPage === 'function' ? renderTaskDetailPage(normalizedSelector) : false;
      if (isDefaultSelector(normalizedSelector) || !rendered) {
        page = 'tasks';
        normalizedSelector = HASH_DEFAULT_SELECTOR;
        needsUpdate = true;
      }
    } else if (appState.currentPage === 'driver-task-detail') {
      pageId = 'page-driver-task-detail';
      const rendered = typeof renderDriverTaskDetail === 'function' ? renderDriverTaskDetail(normalizedSelector) : false;
      if (!rendered) {
        page = 'driver-tasks';
        normalizedSelector = HASH_DEFAULT_SELECTOR;
        needsUpdate = true;
      }
    } else if (appState.currentPage === 'maintenance-create') {
      pageId = 'page-maintenance-create';
      if (typeof renderMaintenanceForm === 'function') {
        renderMaintenanceForm();
      }
    } else if (appState.currentPage === 'booking-create') {
      pageId = 'page-booking-create';
      if (typeof renderBookingCreateForm === 'function') {
        renderBookingCreateForm();
      }
    } else if (appState.currentPage === 'vehicle-create') {
      pageId = 'page-vehicle-create';
      if (typeof renderVehicleCreateForm === 'function') {
        renderVehicleCreateForm();
      }
    } else if (appState.currentPage === 'document-viewer') {
      pageId = 'page-document-viewer';
      const rendered = typeof renderDocumentViewer === 'function' ? renderDocumentViewer(normalizedSelector) : false;
      if (!rendered) {
        page = roleConfig?.defaultPage || 'dashboard';
        normalizedSelector = HASH_DEFAULT_SELECTOR;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const updatedHash = buildHash(role, page, normalizedSelector);
      if (window.location.hash !== updatedHash) {
        window.location.hash = updatedHash;
        return;
      }
    }

    console.log('🎯 Целевая страница:', pageId);

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.remove('hidden');
      console.log('✅ Страница найдена и показана:', pageId);
    } else {
      console.log('❌ Страница не найдена:', pageId);
      const defaultPage = roleConfig?.defaultPage || 'dashboard';
      const defaultPageEl = document.getElementById(`page-${defaultPage}`);
      if (defaultPageEl) {
        defaultPageEl.classList.remove('hidden');
        appState.currentPage = defaultPage;
        console.log('🔄 Переход на страницу по умолчанию:', defaultPage);
      } else {
        console.error('❌ Страница по умолчанию не найдена:', defaultPage);
      }
      const newHash = buildHash(appState.currentRole, appState.currentPage);
      if (window.location.hash !== newHash) {
        window.location.hash = newHash;
        console.log('🔗 Хэш обновлен:', newHash);
      }
    }

    const pageTitleEl = document.getElementById('page-title');
    if (layout === 'desktop') {
      const navItem = roleConfig?.nav?.find(i => i.id === appState.currentPage);
      const pageTitle = navItem ? navItem.name : '';
      if (pageTitleEl) pageTitleEl.textContent = pageTitle;
    } else if (pageTitleEl) {
      pageTitleEl.textContent = '';
    }

    const pageActionButton = document.getElementById('page-action-button');
    if (pageActionButton) {
      pageActionButton.classList.add('hidden');
      if (layout === 'desktop') {
        if (appState.currentPage === 'tasks') {
          pageActionButton.textContent = 'Add task';
          pageActionButton.classList.remove('hidden');
        } else if (appState.currentPage === 'fleet-table') {
          pageActionButton.textContent = 'Add vehicle';
          pageActionButton.classList.remove('hidden');
        }
      }
    }

    console.log('🎨 Рендеринг контента для страницы:', appState.currentPage);
    console.log('🏗️ Layout для роли:', layout);

    try {
      if (appState.currentPage === 'bookings') {
        console.log('📋 Рендеринг Kanban доски...');
        renderKanbanBoard();
      }
      if (appState.currentPage === 'dashboard') {
        console.log('📊 Рендеринг dashboard...');
        renderDashboard();
      }
      if (appState.currentPage === 'analytics') {
        console.log('📈 Рендеринг analytics...');
        renderAnalyticsPage();
        renderSalesPipeline();
      }
      if (appState.currentPage === 'driver-tasks') {
        console.log('🚗 Рендеринг задач водителя...');
        if (typeof renderDriverTasks === 'function') {
          renderDriverTasks();
          startTimers();
        } else {
          console.warn('⚠️ renderDriverTasks handler не передан');
        }
      }
      if (appState.currentPage === 'fleet-calendar') {
        console.log('📅 Рендеринг календаря автопарка...');
        renderFleetCalendar();
      }
      if (appState.currentPage === 'reports') {
        console.log('📋 Рендеринг отчетов...');
        if (typeof renderReports === 'function') {
          renderReports();
        } else {
          console.warn('⚠️ renderReports handler не передан');
        }
      }
      if (appState.currentPage === 'tasks') {
        console.log('✅ Рендеринг задач...');
        if (typeof renderTasksPage === 'function') {
          renderTasksPage();
        } else {
          console.warn('⚠️ renderTasksPage handler не передан');
        }
      }
      if (appState.currentPage === 'sales-pipeline') {
        console.log('💼 Рендеринг sales pipeline...');
        renderSalesPipeline();
      }

      if (appState.currentPage !== 'driver-tasks' && typeof stopDriverTracking === 'function' && appState.driverContext?.tracking?.enabled) {
        console.log('🚫 Остановка трекинга водителя...');
        stopDriverTracking();
      }

      console.log('✅ Роутер завершен успешно для страницы:', appState.currentPage);
    } catch (error) {
      console.error('❌ Ошибка при рендеринге страницы:', appState.currentPage, error);
      if (error?.stack) {
        console.error('❌ Stack trace:', error.stack);
      }
    }
  };
};
