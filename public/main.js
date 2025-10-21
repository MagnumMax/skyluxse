// SkyLuxse ERP Application
// Production build - compiled JavaScript

// Import all dependencies and modules
import {
    MOCK_DATA,
    BOOKING_PRIORITIES,
    BOOKING_TYPES,
    CALENDAR_EVENT_TYPES,
    TASK_TYPES,
    KANBAN_STATUS_META,
    ROLE_EMAIL_PRESETS,
    ROLES_CONFIG
} from '../src/data/index.js';

import {
    appState,
    enqueueOfflineAction,
    syncOfflineQueue,
    getStartOfWeek
} from '../src/state/appState.js';

import {
    HASH_DEFAULT_SELECTOR,
    buildHash,
    parseHash,
    isDefaultSelector
} from '../src/state/navigation.js';

import { renderKanbanBoard } from '../src/render/kanban.js';
import { renderDashboard } from '../src/render/dashboard.js';
import { renderAnalyticsPage, renderSalesPipeline, renderClientCard } from '../src/render/charts.js';
import { startTimers } from '../src/render/timers.js';
import { formatCurrency } from '../src/render/utils.js';
import { renderFleetCalendar, initFleetCalendar } from '../src/render/fleetCalendar.js';
import { showToast } from '../src/ui/toast.js';
import { getIcon } from '../src/ui/icons.js';

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SkyLuxse приложение загружается...');
    console.log('📍 Текущий URL:', window.location.href);
    console.log('🔍 Поиск service worker...');

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('✅ Service Worker зарегистрирован'))
            .catch(err => console.error('❌ Ошибка регистрации SW:', err));
    } else {
        console.log('⚠️ Service Worker не поддерживается');
    }

    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const appContainer = document.getElementById('app-container');
    const desktopShell = document.getElementById('desktop-shell');
    const mobileViewContainer = document.getElementById('mobile-view');
    const bookingDetailContent = document.getElementById('booking-detail-content');
    const fleetDetailContent = document.getElementById('fleet-detail-content');
    const clientDetailContent = document.getElementById('client-detail-content');
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

    const getDetailPageId = (basePage) => {
        if (basePage === 'bookings') return 'booking-detail';
        if (basePage === 'fleet-table') return 'fleet-detail';
        if (basePage === 'clients-table') return 'client-detail';
        return basePage.replace('-table', '-detail');
    };

    pageBackButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const targetPage = button.dataset.backPage;
            if (targetPage) {
                window.location.hash = buildHash(appState.currentRole, targetPage);
            } else {
                window.history.back();
            }
        });
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
        salesOwnerFilter.value = appState.filters.sales.owner || 'all';
        salesOwnerFilter.dataset.bound = 'true';
        if (ownerChanged) {
            renderCurrentPageWithSalesFilter();
        }
    };

    const updateSalesOwnerFilterVisibility = (role) => {
        if (!salesOwnerFilterWrapper) return;
        if (role === 'sales') {
            refreshSalesOwnerFilter();
            salesOwnerFilterWrapper.classList.remove('hidden');
        } else {
            salesOwnerFilterWrapper.classList.add('hidden');
        }
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

    if (salesOwnerFilter && !salesOwnerFilter.dataset.globalHandler) {
        salesOwnerFilter.addEventListener('change', (event) => {
            appState.filters.sales.owner = event.target.value || 'all';
            renderCurrentPageWithSalesFilter();
        });
        salesOwnerFilter.dataset.globalHandler = 'true';
    }

    const updateSidebarToggleState = () => {
        if (!sidebarCollapseBtn) return;
        const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
        sidebarCollapseBtn.innerHTML = isCollapsed
            ? getIcon('chevronRight', 'w-5 h-5')
            : getIcon('chevronLeft', 'w-5 h-5');
        sidebarCollapseBtn.setAttribute('aria-expanded', String(!isCollapsed));
        sidebarCollapseBtn.setAttribute('aria-label', isCollapsed ? 'Развернуть панель' : 'Свернуть панель');
    };

    const renderSidebar = () => {
        const roleConfig = ROLES_CONFIG[appState.currentRole];
        const navEl = document.getElementById('sidebar-nav');
        const profileEl = document.getElementById('sidebar-profile');

        if (!roleConfig || roleConfig.layout !== 'desktop') {
            navEl.innerHTML = '';
            profileEl.innerHTML = '';
            updateSalesOwnerFilterVisibility(appState.currentRole);
            return;
        }

        navEl.innerHTML = roleConfig.nav.map(item => `
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
                appContainer.classList.add('hidden');
                document.getElementById('page-login').classList.remove('hidden');
                window.location.hash = '';

                if (otpContainer) {
                    otpContainer.classList.add('hidden');
                }

                if (otpInput) {
                    otpInput.value = '';
                    otpInput.setAttribute('disabled', 'disabled');
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

    // Application router and initialization
    const router = () => {
        console.log('🧭 Запуск роутера...');
        console.log('🔗 Текущий хэш:', window.location.hash);

        if (appState.timerInterval) {
            clearInterval(appState.timerInterval);
            console.log('🕐 Таймеры очищены');
        }

        const parsedHash = parseHash(window.location.hash);
        let { role, page, selector } = parsedHash;
        console.log('📋 Парсинг хэша:', { role, page, selector });

        const roleConfig = ROLES_CONFIG[role];
        const layout = roleConfig?.layout || 'desktop';
        console.log('🏗️ Конфигурация роли:', { layout, roleConfig: !!roleConfig });

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

        // Update current state
        appState.currentRole = role;
        appState.currentPage = page;

        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

        let pageId = `page-${appState.currentPage}`;

        if (appState.currentPage.endsWith('-table')) {
            pageId = 'page-table-view';
            renderTableView(appState.currentPage);
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
            if (isDefaultSelector(normalizedSelector) || !renderTaskDetailPage(normalizedSelector)) {
                page = 'tasks';
                normalizedSelector = HASH_DEFAULT_SELECTOR;
                needsUpdate = true;
            }
        } else if (appState.currentPage === 'driver-task-detail') {
            pageId = 'page-driver-task-detail';
            const rendered = renderDriverTaskDetail(normalizedSelector);
            if (!rendered) {
                page = 'driver-tasks';
                normalizedSelector = HASH_DEFAULT_SELECTOR;
                needsUpdate = true;
            }
        } else if (appState.currentPage === 'maintenance-create') {
            pageId = 'page-maintenance-create';
            renderMaintenanceForm();
        } else if (appState.currentPage === 'booking-create') {
            pageId = 'page-booking-create';
            renderBookingCreateForm();
        } else if (appState.currentPage === 'vehicle-create') {
            pageId = 'page-vehicle-create';
            renderVehicleCreateForm();
        } else if (appState.currentPage === 'document-viewer') {
            pageId = 'page-document-viewer';
            if (!renderDocumentViewer(normalizedSelector)) {
                page = roleConfig?.defaultPage || 'dashboard';
                normalizedSelector = HASH_DEFAULT_SELECTOR;
                needsUpdate = true;
            }
        }

        console.log('🎯 Целевая страница:', pageId);

        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            console.log('✅ Страница найдена и показана:', pageId);
        } else {
            console.log('❌ Страница не найдена:', pageId);
            // Fallback to default page for the role
            const defaultPage = roleConfig?.defaultPage || 'dashboard';
            const defaultPageEl = document.getElementById(`page-${defaultPage}`);
            if (defaultPageEl) {
                defaultPageEl.classList.remove('hidden');
                appState.currentPage = defaultPage;
                console.log('🔄 Переход на страницу по умолчанию:', defaultPage);
            } else {
                console.error('❌ Страница по умолчанию не найдена:', defaultPage);
            }
            // Update URL to correct hash
            const newHash = buildHash(appState.currentRole, appState.currentPage);
            if (window.location.hash !== newHash) {
                window.location.hash = newHash;
                console.log('🔗 Хэш обновлен:', newHash);
            }
        }

        if (layout === 'desktop') {
            const navItem = roleConfig?.nav?.find(i => i.id === appState.currentPage);
            const pageTitle = navItem ? navItem.name : '';
            document.getElementById('page-title').textContent = pageTitle;
        } else {
            document.getElementById('page-title').textContent = '';
        }

        pageActionButton.classList.add('hidden');
        if (layout === 'desktop') {
            if(appState.currentPage === 'tasks') {
                pageActionButton.textContent = "Add task";
                pageActionButton.classList.remove('hidden');
            } else if(appState.currentPage === 'fleet-table') {
                pageActionButton.textContent = "Add vehicle";
                pageActionButton.classList.remove('hidden');
            }
        }

        updateActiveLink();

        // Render content for specific pages
        console.log('🎨 Рендеринг контента для страницы:', appState.currentPage);

        try {
            if(appState.currentPage === 'bookings') {
                console.log('📋 Рендеринг Kanban доски...');
                renderKanbanBoard();
            }
            if(appState.currentPage === 'dashboard') {
                console.log('📊 Рендеринг dashboard...');
                renderDashboard();
            }
            if(appState.currentPage === 'analytics') {
                console.log('📈 Рендеринг analytics...');
                renderAnalyticsPage();
                renderSalesPipeline();
            }
            if(appState.currentPage === 'driver-tasks') {
                console.log('🚗 Рендеринг задач водителя...');
                renderDriverTasks();
                startTimers();
            }
            if(appState.currentPage === 'fleet-calendar') {
                console.log('📅 Рендеринг календаря автопарка...');
                renderFleetCalendar();
            }
            if(appState.currentPage === 'reports') {
                console.log('📋 Рендеринг отчетов...');
                renderReports();
            }
            if(appState.currentPage === 'tasks') {
                console.log('✅ Рендеринг задач...');
                renderTasksPage();
            }
            if(appState.currentPage === 'sales-pipeline') {
                console.log('💼 Рендеринг sales pipeline...');
                renderSalesPipeline();
            }

            if(appState.currentPage !== 'driver-tasks' && appState.driverContext?.tracking?.enabled) {
                console.log('🚫 Остановка трекинга водителя...');
                stopDriverTracking();
            }

            console.log('✅ Роутер завершен успешно');

        } catch (error) {
            console.error('❌ Ошибка при рендеринге страницы:', appState.currentPage, error);
        }
    };

    // Initialize application
    const initApp = () => {
        console.log('🔧 Инициализация приложения...');
        console.log('👤 Текущая роль пользователя:', appState.currentRole);

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

            updateLayoutForRole(appState.currentRole);
            console.log('✅ Layout обновлен для роли:', appState.currentRole);

            renderSidebar();
            console.log('✅ Sidebar отрендерен');

            // Handle initial URL - redirect root to default role/page
            if (window.location.hash === '' || window.location.hash === '#') {
                const defaultPage = ROLES_CONFIG[appState.currentRole]?.defaultPage || 'dashboard';
                const targetHash = buildHash(appState.currentRole, defaultPage);
                console.log('🔀 Перенаправление на страницу по умолчанию:', defaultPage);
                window.location.hash = targetHash;
            }

            router();
            console.log('✅ Роутер запущен');

        } catch (error) {
            console.error('❌ Ошибка при инициализации приложения:', error);
        }
    };

    // Event listeners
    console.log('🔗 Настройка обработчиков событий...');

    if (loginRoleSelect) {
        loginRoleSelect.addEventListener('change', (e) => {
            const preset = ROLE_EMAIL_PRESETS[e.target.value];
            if (preset && loginEmailInput) {
                loginEmailInput.value = preset;
                console.log('📧 Email предустановлен:', preset);
            }
        });
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

    document.getElementById('login-button').addEventListener('click', () => {
        const selectedRole = loginRoleSelect?.value || 'operations';
        appState.currentRole = selectedRole;
        const defaultPage = ROLES_CONFIG[selectedRole]?.defaultPage || 'dashboard';
        document.getElementById('page-login').classList.add('hidden');
        appContainer.classList.remove('hidden');
        window.location.hash = buildHash(selectedRole, defaultPage);
        initApp();
    });

    // Global error handling
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

    window.addEventListener('unhandledrejection', (event) => {
        console.error('💥 Необработанная ошибка промиса:', event.reason);
    });

    console.log('✅ Диагностические логи добавлены');

    // Initialize the application
    initApp();
});

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