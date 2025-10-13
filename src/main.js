import {
    MOCK_DATA,
    BOOKING_PRIORITIES,
    BOOKING_TYPES,
    CALENDAR_EVENT_TYPES,
    TASK_TYPES,
    NOTIFICATION_CHANNELS,
    KANBAN_STATUS_META,
    ROLE_EMAIL_PRESETS,
    ROLES_CONFIG
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
import { renderDashboard } from './render/dashboard.js';
import { renderAnalyticsPage, renderSalesPipeline } from './render/charts.js';
import { renderClientPortalNav, updatePortalNavActive, renderClientPortalPage } from './render/portal.js';
import { startTimers } from './render/timers.js';
import { formatCurrency } from './render/utils.js';
import { showToast } from './ui/toast.js';
import { openModal, closeModal, openDocViewer, closeDocViewer } from './ui/modals.js';
import { getIcon } from './ui/icons.js';

document.addEventListener('DOMContentLoaded', () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => console.error('SW registration failed', err));
        }

        // --- DOM Elements ---
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const appContainer = document.getElementById('app-container');
        const desktopShell = document.getElementById('desktop-shell');
        const portalShell = document.getElementById('portal-shell');
        const mobileViewContainer = document.getElementById('mobile-view');
        const clientPortalSidebar = document.getElementById('client-portal-sidebar');
        const clientPortalNav = document.getElementById('client-portal-nav');
        const clientPortalContainer = document.getElementById('client-portal');
        const detailPanel = document.getElementById('detail-panel');
        const desktopPages = Array.from(document.querySelectorAll('#content-area > section.page'));
        const portalPages = Array.from(document.querySelectorAll('#client-portal > section.page'));
        const pageActionButton = document.getElementById('page-action-button');
        const roleSwitcher = document.getElementById('role-switcher');
        const loginRoleSelect = document.getElementById('login-role');
        const loginEmailInput = document.getElementById('email');
        const requestOtpBtn = document.getElementById('request-otp');

        const renderSidebar = () => {
            const roleConfig = ROLES_CONFIG[appState.currentRole];
            const navEl = document.getElementById('sidebar-nav');
            const profileEl = document.getElementById('sidebar-profile');

            if (roleSwitcher && roleConfig) {
                roleSwitcher.value = appState.currentRole;
            }

            if (!roleConfig || roleConfig.layout !== 'desktop') {
                navEl.innerHTML = '';
                profileEl.innerHTML = '';
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
                    <button class="ml-auto p-2 text-gray-500 hover:text-black" title="Сменить пользователя">
                        ${getIcon('logOut', 'w-5 h-5')}
                    </button>
                </div>
            `;
            updateActiveLink();
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
        
        const bindCalendarControls = () => {
            if (calendarControlsBound) return;

            const prevBtn = document.getElementById('calendar-prev');
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    const delta = appState.filters.calendar.view === 'two-week' ? -14 : -7;
                    shiftCalendarStart(delta);
                });
            }

            const nextBtn = document.getElementById('calendar-next');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    const delta = appState.filters.calendar.view === 'two-week' ? 14 : 7;
                    shiftCalendarStart(delta);
                });
            }

            const todayBtn = document.getElementById('calendar-today');
            if (todayBtn) {
                todayBtn.addEventListener('click', () => {
                    appState.calendarStart = getStartOfWeek();
                    renderCalendar();
                });
            }

            const viewSelect = document.getElementById('calendar-view-select');
            if (viewSelect) {
                viewSelect.addEventListener('change', (event) => {
                    appState.filters.calendar.view = event.target.value;
                    renderCalendar();
                });
            }

            const typeSelect = document.getElementById('calendar-type-filter');
            if (typeSelect) {
                typeSelect.addEventListener('change', (event) => {
                    appState.filters.calendar.type = event.target.value;
                    renderCalendar();
                });
            }

            const classFilter = document.getElementById('fleet-calendar-class-filter');
            if (classFilter) classFilter.addEventListener('change', () => renderCalendar());

            const statusFilter = document.getElementById('fleet-calendar-status-filter');
            if (statusFilter) statusFilter.addEventListener('change', () => renderCalendar());

            const filterToggle = document.getElementById('fleet-calendar-filter-toggle');
            const filterDropdown = document.getElementById('fleet-calendar-filter-dropdown');
            if (filterToggle && filterDropdown) {
                filterToggle.addEventListener('click', () => filterDropdown.classList.toggle('hidden'));
            }

            const clearFiltersBtn = document.getElementById('fleet-calendar-clear-filters');
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', () => {
                    if (classFilter) classFilter.value = '';
                    if (statusFilter) statusFilter.value = '';
                    renderCalendar();
                });
            }

            const maintenanceBtn = document.getElementById('calendar-create-maintenance');
            if (maintenanceBtn) maintenanceBtn.addEventListener('click', openMaintenanceModal);

            const grid = document.getElementById('calendar-grid');
            if (grid && !grid.dataset.bound) {
                grid.addEventListener('click', (event) => {
                    const target = event.target.closest('.calendar-event');
                    if (!target) return;
                    const bookingId = target.dataset.bookingId;
                    if (bookingId) {
                        window.location.hash = buildHash(appState.currentRole, 'bookings', bookingId);
                        return;
                    }
                    const calendarEventId = target.dataset.calendarEventId;
                    if (calendarEventId) {
                        openCalendarEvent(calendarEventId);
                    }
                });
                grid.dataset.bound = 'true';
            }

            calendarControlsBound = true;
        };

        const renderDetailPanel = (type, id) => {
            const panel = detailPanel;
            let content = '';

            if (type === 'bookings') {
                const booking = MOCK_DATA.bookings.find(b => b.id == id);
                if (!booking) return;
                const client = MOCK_DATA.clients.find(c => c.name === booking.clientName) || {};
                const dueAmount = (booking.totalAmount || 0) - (booking.paidAmount || 0);

                const driverOptions = MOCK_DATA.drivers.map(d => 
                    `<option value="${d.id}" ${booking.driverId === d.id ? 'selected' : ''}>${d.name}</option>`
                ).join('');
                
                content = `
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Заказ #${booking.id}</h2>
                        <button id="close-panel-btn" class="p-2 text-gray-500 hover:text-black">${getIcon('x')}</button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 space-y-6">
                         <div>
                            <h3 class="font-semibold mb-2">Детали бронирования</h3>
                            <div class="space-y-3 text-sm">
                               <p><strong>Авто:</strong> ${booking.carName}</p>
                               <p><strong>Даты:</strong> ${booking.startDate} - ${booking.endDate}</p>
                               <div>
                                 <label class="block font-medium text-gray-700">Водитель</label>
                                 <select class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
                                    <option value="">Не назначен</option>
                                    ${driverOptions}
                                 </select>
                               </div>
                            </div>
                         </div>
                         <div>
                            <h3 class="font-semibold mb-2">Финансы</h3>
                            <div class="text-sm space-y-2">
                                <p class="flex justify-between"><span>Сумма:</span> <strong>$${booking.totalAmount}</strong></p>
                                <p class="flex justify-between"><span>Оплачено:</span> <span class="text-green-600">$${booking.paidAmount}</span></p>
                                <p class="flex justify-between border-t pt-2 mt-2"><span>Осталось:</span> <strong class="text-red-600">$${dueAmount}</strong></p>
                            </div>
                         </div>
                         <div class="geist-card p-4">
                            <h4 class="font-medium mb-2 text-sm">Сгенерировать ссылку на оплату</h4>
                            <div class="space-y-3">
                                <input type="number" value="${dueAmount}" placeholder="Сумма" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md stripe-amount-input">
                                <select class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md stripe-reason-select">
                                    <option>Доплата по аренде</option>
                                    <option>Продление</option>
                                    <option>Дополнительные мили</option>
                                </select>
                                <button type="button" class="w-full geist-button geist-button-secondary text-sm generate-stripe-link" data-booking-id="${booking.id}">Создать Stripe ссылку</button>
                                <div id="stripe-link-result" class="hidden space-y-2">
                                    <div class="flex items-center justify-between bg-gray-100 rounded-md px-3 py-2 gap-3">
                                        <a id="stripe-link-anchor" href="#" target="_blank" rel="noopener" class="text-blue-600 hover:underline break-all flex-1">—</a>
                                        <button type="button" class="copy-stripe-link p-2 text-gray-500 hover:text-black rounded-md" title="Скопировать ссылку">${getIcon('copy', 'w-4 h-4')}</button>
                                    </div>
                                    <p id="stripe-copy-feedback" class="text-xs text-green-600 hidden">Ссылка скопирована</p>
                                </div>
                            </div>
                         </div>
                         <div>
                            <h3 class="font-semibold mb-2">История</h3>
                            <ul class="space-y-2 text-sm text-gray-600">
                            ${(booking.history || []).map(h => `<li class="flex items-start"><span class="text-gray-400 mr-2 mt-1">${getIcon('check','w-4 h-4')}</span><div><p>${h.event}</p><p class="text-xs text-gray-400">${h.ts}</p></div></li>`).join('')}
                            </ul>
                         </div>
                    </div>`;
            } else if (type === 'fleet-table') {
                 const car = MOCK_DATA.cars.find(c => c.id == id);
                 if (!car) return;
                 content = `
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-xl font-semibold">${car.name}</h2>
                        <button id="close-panel-btn" class="p-2 text-gray-500 hover:text-black">${getIcon('x')}</button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 space-y-6">
                        <img src="${car.imageUrl.replace('100/60', '400/240')}" class="w-full rounded-lg object-cover">
                        <div>
                            <h3 class="font-semibold mb-2">Документы</h3>
                            <div class="text-sm space-y-2">
                                <p><strong>Страховка до:</strong> ${car.insuranceExpiry}</p>
                                <p><strong>Mulkiya до:</strong> ${car.mulkiyaExpiry}</p>
                            </div>
                            <div class="grid grid-cols-2 gap-2 mt-2">
                                ${car.documents.map(doc => `<img src="${doc}" class="rounded-md cursor-pointer doc-image">`).join('')}
                            </div>
                        </div>
                        <div>
                            <h3 class="font-semibold mb-2">История инспекций</h3>
                            <ul class="space-y-3 text-sm">
                            ${car.inspections.map(insp => `
                                <li class="p-3 bg-gray-50 rounded-md">
                                    <p class="font-medium">${insp.date} - ${insp.driver}</p>
                                    <div class="flex space-x-2 mt-2">
                                        ${insp.photos.map(p => `<img src="${p}" class="w-16 h-12 object-cover rounded cursor-pointer doc-image">`).join('')}
                                    </div>
                                </li>
                            `).join('') || '<p class="text-xs text-gray-500">Нет инспекций.</p>'}
                            </ul>
                        </div>
                    </div>`;
            } else if (type === 'clients-table') {
                 const client = MOCK_DATA.clients.find(c => c.id == id);
                 if (!client) return;
                 const clientHistory = MOCK_DATA.bookings.filter(b => b.clientName === client.name);
                 content = `
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-xl font-semibold">${client.name}</h2>
                        <button id="close-panel-btn" class="p-2 text-gray-500 hover:text-black">${getIcon('x')}</button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <h3 class="font-semibold mb-2">Контактная информация</h3>
                            <div class="space-y-2 text-sm">
                                <p><strong>Телефон:</strong> ${client.phone}</p>
                                <p><strong>Email:</strong> ${client.email}</p>
                                <p><strong>Статус:</strong> ${client.status}</p>
                                <p><strong>Задолженность:</strong> $${client.outstanding}</p>
                                <p><strong>Общий оборот:</strong> $${client.turnover.toLocaleString()}</p>
                            </div>
                        </div>
                        <div>
                            <h3 class="font-semibold mb-2">История заказов</h3>
                            <ul class="space-y-3 text-sm">
                                ${clientHistory.map(b => `
                                    <li class="p-3 bg-gray-50 rounded-md">
                                        <p class="font-medium">${b.carName}</p>
                                        <p class="text-xs text-gray-500">${b.startDate} to ${b.endDate}</p>
                                    </li>
                                `).join('') || '<p class="text-xs text-gray-500">Нет истории заказов.</p>'}
                            </ul>
                        </div>
                    </div>`;
            }

            panel.innerHTML = content;
            panel.classList.remove('translate-x-full');
            document.getElementById('panel-overlay').classList.remove('hidden');
            document.getElementById('close-panel-btn').addEventListener('click', closePanel);
        };
        
        const closePanel = () => {
            detailPanel.classList.add('translate-x-full');
            document.getElementById('panel-overlay').classList.add('hidden');
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
                    <img src="${car.imageUrl}" alt="${car.name}" class="w-14 h-10 object-cover rounded-md">
                    <div>
                        <p class="font-semibold text-sm text-gray-900">${car.name}</p>
                        <p class="text-xs text-gray-500">${car.plate} · ${car.color} · ${car.year}</p>
                        <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${badgeClass}">${car.status}</span>
                    </div>
                </div>
            `;
        };

        const renderVehicleDocuments = (car) => {
            if (!car.documents || !car.documents.length) {
                return '<span class="text-xs text-gray-400">Документы не загружены</span>';
            }
            const statusClasses = {
                active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                'needs-review': 'bg-amber-50 text-amber-700 border border-amber-100',
                warning: 'bg-amber-50 text-amber-700 border border-amber-100',
                expired: 'bg-rose-50 text-rose-700 border border-rose-100'
            };
            return car.documents.map(doc => {
                const cls = statusClasses[doc.status] || 'bg-gray-100 text-gray-600 border border-gray-200';
                const expiry = doc.expiry ? `до ${doc.expiry}` : 'без срока';
                const attrs = doc.url ? `data-doc-url="${doc.url}"` : '';
                return `<button type="button" class="doc-badge inline-flex items-center px-2 py-1 mr-2 mb-2 text-xs font-medium rounded-md ${cls}" ${attrs}>${doc.name} · ${expiry}</button>`;
            }).join('');
        };

        const renderVehicleService = (car) => {
            const service = car.serviceStatus || {};
            const healthPercent = Math.round((service.health || 0) * 100);
            const healthClass = healthPercent >= 80 ? 'bg-emerald-500' : healthPercent >= 60 ? 'bg-amber-500' : 'bg-rose-500';
            return `
                <div class="space-y-2">
                    <div class="flex items-center justify-between text-sm text-gray-900">
                        <span>${service.label || '—'}</span>
                        ${service.nextService ? `<span class="text-xs text-gray-500">Следующее: ${service.nextService}</span>` : ''}
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full ${healthClass}" style="width: ${healthPercent}%"></div>
                    </div>
                    <p class="text-xs text-gray-500">Техническая готовность ${healthPercent}%</p>
                </div>
            `;
        };

        const renderVehicleReminders = (car) => {
            const reminders = car.reminders || [];
            if (!reminders.length) {
                return '<span class="text-xs text-gray-400">Напоминаний нет</span>';
            }
            const nextReminder = reminders[0];
            const tone = nextReminder.status === 'critical'
                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                : nextReminder.status === 'warning'
                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                : 'bg-slate-50 text-slate-700 border border-slate-100';
            const label = nextReminder.dueDate ? `до ${nextReminder.dueDate}` : 'без даты';
            return `
                <div class="space-y-1">
                    <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${tone}">Следующее: ${label}</span>
                    <p class="text-xs text-gray-500">Активных напоминаний: ${reminders.length}</p>
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
                    <p class="text-xs text-gray-500">${client.email} · ${client.phone}</p>
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
                        <span>Задолженность</span>
                        <span class="${outstandingClass}">${formatCurrency(client.outstanding)}</span>
                    </div>
                    <p class="text-xs text-gray-500">Сегмент: ${client.segment || '—'}</p>
                </div>
            `;
        };

        const renderClientDocuments = (client) => {
            if (!client.documents || !client.documents.length) {
                return '<span class="text-xs text-gray-400">Документы не загружены</span>';
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

        const renderClientCommunications = (client) => {
            const channels = client.preferences?.notifications?.join(', ') || '—';
            const pending = client.notifications?.filter(n => n.status !== 'delivered').length || 0;
            return `
                <div class="space-y-1 text-xs text-gray-500">
                    <p>Каналы: <span class="font-medium text-gray-900">${channels}</span></p>
                    <p>Уведомления: ${pending ? `<span class=\"text-amber-600\">${pending} ждут отправки</span>` : 'все доставлены'}</p>
                </div>
            `;
        };

        const renderTableView = (dataType) => {
            const tableTitleEl = document.getElementById('table-title');
            const tableHeadEl = document.getElementById('table-head');
            const tableBodyEl = document.getElementById('table-body');
            let columns = [];
            let rows = [];

            if (dataType === 'fleet-table') {
                tableTitleEl.textContent = 'Автопарк';
                rows = MOCK_DATA.cars;
                columns = [
                    { label: 'Автомобиль', render: renderVehicleCell },
                    { label: 'Документы', render: renderVehicleDocuments },
                    { label: 'Обслуживание', render: renderVehicleService },
                    { label: 'Напоминания', render: renderVehicleReminders }
                ];
            } else if (dataType === 'clients-table') {
                tableTitleEl.textContent = 'Клиенты';
                rows = MOCK_DATA.clients;
                columns = [
                    { label: 'Клиент', render: renderClientInfo },
                    { label: 'Финансы', render: renderClientFinance },
                    { label: 'Документы', render: renderClientDocuments },
                    { label: 'Коммуникация', render: renderClientCommunications }
                ];
            } else {
                return;
            }

            tableHeadEl.innerHTML = `${columns.map(col => `<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">${col.label}</th>`).join('')}<th class="px-6 py-3"></th>`;

            tableBodyEl.innerHTML = rows.map(row => `
                <tr class="hover:bg-gray-50">
                    ${columns.map(col => `<td class="px-6 py-4 align-top text-sm text-gray-700">${col.render(row)}</td>`).join('')}
                    <td class="px-6 py-4 text-right text-sm font-medium">
                        <a href="${buildHash(appState.currentRole, dataType, row.id)}" class="text-indigo-600 hover:text-indigo-900">Подробнее</a>
                    </td>
                </tr>
            `).join('');

            tableBodyEl.querySelectorAll('.doc-badge[data-doc-url]').forEach(button => {
                button.addEventListener('click', () => {
                    const url = button.dataset.docUrl;
                    if (url) openDocViewer(url);
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
                trackingBtn.textContent = tracking.enabled ? 'Отключить GPS' : 'Включить GPS';
            }
            if (!coordsEl || !updatedEl) return;
            if (tracking.enabled && tracking.coordinates) {
                const { lat, lng } = tracking.coordinates;
                coordsEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                updatedEl.textContent = tracking.lastUpdated ? new Date(tracking.lastUpdated).toLocaleTimeString('ru-RU') : '—';
            } else {
                coordsEl.textContent = 'GPS выключен';
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
                        showToast('GPS трекинг отключен', 'info');
                    } else {
                        startDriverTracking();
                        showToast('GPS трекинг активен', 'success');
                    }
                });
            }

            driverControlsBound = true;
        };

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

            const bannerEl = document.getElementById('driver-status-banner');
            if (bannerEl) {
                const statusBadge = driver ? `<span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${driver.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : driver.status === 'On Task' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}">${driver.status}</span>` : '';
                const offlineNotice = appState.offline.enabled
                    ? '<div class="p-3 bg-amber-100 border-l-4 border-amber-500 text-xs text-amber-700 rounded-md">Офлайн режим активен. Данные будут синхронизированы после подключения.</div>'
                    : '';
                bannerEl.innerHTML = `
                    <div class="text-xs text-gray-600 space-y-2">
                        <div class="flex items-center justify-between">
                            <span>Текущий водитель</span>
                            ${statusBadge}
                        </div>
                        ${driver ? `<p>${driver.name} · ${driver.phone}</p>` : '<p>Водитель не выбран</p>'}
                    </div>
                    ${offlineNotice}
                `;
            }

            const toggleBtn = document.getElementById('driver-toggle-offline');
            if (toggleBtn && !toggleBtn.dataset.bound) {
                toggleBtn.addEventListener('click', () => {
                    appState.offline.enabled = !appState.offline.enabled;
                    if (appState.offline.enabled) {
                        showToast('Включен офлайн-режим. Данные сохраняются локально.', 'info');
                    } else {
                        appState.offline.lastSync = new Date().toISOString();
                        syncOfflineQueue();
                        showToast('Онлайн-режим. Синхронизация выполнена.', 'success');
                    }
                    renderDriverTasks();
                });
                toggleBtn.dataset.bound = 'true';
            }
            if (toggleBtn) {
                toggleBtn.textContent = appState.offline.enabled ? 'Вернуться в онлайн-режим' : 'Переключить офлайн-режим';
            }

            listEl.innerHTML = tasks.map(task => {
                const labels = {
                    preparation: 'Подготовить авто',
                    delivery: 'Доставка клиенту',
                    settlement: 'Возврат авто'
                };
                const label = labels[task.status] || 'Задача';
                const targetTime = new Date(`${task.startDate}T${task.startTime}:00`).getTime();
                const timerHtml = `<div class="card-timer text-xs text-amber-600 flex items-center mt-2" data-target-time="${targetTime}"></div>`;
                const route = task.pickupLocation ? `<p class="text-xs text-gray-500 mt-1">${task.pickupLocation}${task.dropoffLocation ? ' → ' + task.dropoffLocation : ''}</p>` : '';
                return `
                <div class="geist-card p-4 cursor-pointer" data-task-id="${task.id}">
                    <div class="flex justify-between items-start">
                        <div>
                             <p class="font-semibold text-sm text-gray-900">${label}</p>
                             <p class="text-xs text-gray-500">${task.carName}</p>
                             <p class="text-xs text-gray-500">Клиент: ${task.clientName}</p>
                             ${route}
                        </div>
                        <div class="text-right text-xs text-gray-500">
                             <p>${task.startDate}</p>
                             <p class="text-lg font-bold text-gray-900">${task.startTime}</p>
                        </div>
                    </div>
                    ${timerHtml}
                </div>
            `}).join('') || '<p class="text-center text-gray-500 mt-8">Нет задач на сегодня</p>';
            startTimers();
            updateDriverLocationCard();
        };
        
        const renderDriverTaskDetail = (taskId) => {
            const task = MOCK_DATA.bookings.find(b => b.id == taskId);
            if(!task) return;
            
            const client = MOCK_DATA.clients.find(c => c.name === task.clientName) || {};
            const contentEl = document.getElementById('driver-task-detail-content');
            const dueAmount = (task.totalAmount || 0) - (task.paidAmount || 0);
            const taskLabels = {
                preparation: 'Подготовка автомобиля',
                delivery: 'Доставка клиенту',
                settlement: 'Возврат автомобиля'
            };
            const taskTitle = taskLabels[task.status] || 'Задача водителя';
            const connectionBadge = appState.offline.enabled
                ? '<span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-100">Офлайн</span>'
                : '<span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">Онлайн</span>';

            contentEl.innerHTML = `
                <h2 class="text-2xl font-bold">${taskTitle}: ${task.carName}</h2>
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-semibold text-gray-500">Клиент</h3>
                            <p class="text-sm text-gray-700 mt-1">${client.name || '—'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            ${connectionBadge}
                            ${client.phone ? `<a href="tel:${client.phone}" class="p-3 bg-gray-100 rounded-full">${getIcon('phone')}</a>` : ''}
                        </div>
                    </div>
                    <div class="geist-card p-4">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Маршрут и навигация</h3>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.dropoffLocation || 'Dubai Marina')}" target="_blank" class="geist-button geist-button-secondary text-xs flex items-center gap-2">
                                ${getIcon('navigation', 'w-4 h-4')}Навигатор
                            </a>
                        </div>
                        <p class="text-xs text-gray-500 mt-3">${task.pickupLocation || 'SkyLuxse HQ'} → ${task.dropoffLocation || 'Адрес клиента'}</p>
                    </div>
                    <div class="geist-card p-4 space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Показания и состояние</h3>
                            <span class="text-xs text-gray-400">Заполняется перед сдачей</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Пробег (км)</label>
                                <input type="number" id="driver-odometer" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Например, 25450">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Уровень топлива</label>
                                <select id="driver-fuel" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Выберите</option>
                                    <option value="full">Полный</option>
                                    <option value="3/4">3/4</option>
                                    <option value="1/2">1/2</option>
                                    <option value="1/4">1/4</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Полученные наличные (AED)</label>
                                <input type="number" id="driver-cash" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="0">
                            </div>
                        </div>
                    </div>
                    <div class="geist-card p-4">
                        <h3 class="font-semibold text-sm text-gray-700">Документы клиента</h3>
                        <div class="flex flex-wrap gap-2 mt-3 text-sm">
                           ${(client.documents && client.documents.length) ? client.documents.map(doc => `<a href="#" class="px-3 py-1 rounded-md bg-slate-100 text-slate-700 client-doc-link" data-url="${doc.url}">${doc.name}</a>`).join('') : '<span class="text-xs text-gray-400">Документы не прикреплены</span>'}
                        </div>
                    </div>
                    <div class="geist-card p-4 space-y-3 text-sm">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Дополнительные услуги</h3>
                            <span class="text-xs text-gray-400">Выберите оказанные услуги</span>
                        </div>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="driver-service" data-code="detailing" data-amount="200">
                            Детейлинг перед выдачей (+200 AED)
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="driver-service" data-code="fuel" data-amount="150">
                            Дозаправка (+150 AED)
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="driver-service" data-code="toll" data-amount="50">
                            Оплата Salik / платных дорог (+50 AED)
                        </label>
                    </div>
                    <div class="geist-card p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Проверка штрафов</h3>
                            <button type="button" class="geist-button geist-button-secondary text-xs flex items-center gap-2 check-fines-btn" data-booking-id="${task.id}">
                                ${getIcon('search', 'w-4 h-4')}Проверить
                            </button>
                        </div>
                        <div id="fines-result" class="text-xs text-gray-500">Нет данных о штрафах.</div>
                    </div>
                    <div class="geist-card p-4">
                        <h4 class="font-medium mb-2 text-sm">Оплата</h4>
                        <div class="space-y-3">
                            <input type="number" id="payment-amount" value="${dueAmount}" placeholder="Сумма" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md">
                            <button id="generate-qr-btn" class="w-full geist-button geist-button-secondary text-sm">Сгенерировать QR-код для оплаты</button>
                            <div id="qrcode-container" class="flex justify-center p-4 bg-gray-50 rounded-md hidden"></div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <h3 class="font-semibold text-gray-500">Прикрепить фото</h3>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Фото договора</label>
                            <input type="file" accept="image/*" id="contract-photo" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md">
                            <div id="contract-preview" class="mt-2 hidden">
                                <img id="contract-img" class="max-w-full h-32 object-cover rounded-md">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Фото авто (до 4 шт.)</label>
                            <input type="file" accept="image/*" multiple id="car-photos" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md">
                            <div id="car-previews" class="grid grid-cols-2 gap-2 mt-2"></div>
                        </div>
                    </div>
                    <div>
                        <label class="flex items-center"><input id="doc-check" type="checkbox" class="h-4 w-4 rounded border-gray-300"> <span class="ml-2 text-sm text-gray-600">Документы проверены</span></label>
                    </div>
                    <button id="complete-task-btn" data-booking-id="${task.id}" disabled class="w-full geist-button geist-button-primary mt-4">Завершить задачу</button>
                </div>
            `;

            // Event listeners for photo attachments
            const contractInput = document.getElementById('contract-photo');
            const contractPreview = document.getElementById('contract-preview');
            const contractImg = document.getElementById('contract-img');

            if (contractInput) {
                contractInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            contractImg.src = e.target.result;
                            contractPreview.classList.remove('hidden');
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }

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
        };
        
        const renderCalendar = () => {
            const grid = document.getElementById('calendar-grid');
            if (!grid) return;

            bindCalendarControls();

            const classFilterValue = document.getElementById('fleet-calendar-class-filter')?.value || '';
            const statusFilterValue = document.getElementById('fleet-calendar-status-filter')?.value || '';
            const viewMode = appState.filters.calendar.view || 'week';
            const typeFilterValue = appState.filters.calendar.type || 'all';

            const daysCount = viewMode === 'two-week' ? 14 : 7;
            const startDate = new Date(appState.calendarStart + 'T00:00:00');
            const dates = Array.from({ length: daysCount }, (_, index) => new Date(startDate.getTime() + index * 86400000));
            const endDate = new Date(startDate.getTime() + (daysCount - 1) * 86400000);
            const firstColWidth = 220;
            const columnsStyle = `grid-template-columns: ${firstColWidth}px repeat(${daysCount}, minmax(140px, 1fr));`;
            const todayStr = new Date().toISOString().slice(0, 10);

            const viewSelect = document.getElementById('calendar-view-select');
            if (viewSelect) viewSelect.value = viewMode;
            const typeSelect = document.getElementById('calendar-type-filter');
            if (typeSelect) typeSelect.value = typeFilterValue;

            let cars = MOCK_DATA.cars.slice();
            if (classFilterValue) cars = cars.filter(car => car.class === classFilterValue);
            if (statusFilterValue) cars = cars.filter(car => car.status === statusFilterValue);

            const bookingEvents = MOCK_DATA.bookings.map(booking => ({
                id: `booking-${booking.id}`,
                calendarEventId: null,
                bookingId: booking.id,
                carId: booking.carId,
                type: 'rental',
                title: `#${booking.id} ${booking.clientName}`,
                start: `${booking.startDate}T${booking.startTime || '09:00'}`,
                end: `${booking.endDate}T${booking.endTime || '18:00'}`,
                priority: booking.priority || 'medium'
            }));

            const additionalEvents = MOCK_DATA.calendarEvents.map(event => ({
                id: event.id,
                calendarEventId: event.id,
                bookingId: null,
                carId: event.carId,
                type: event.type,
                title: event.title,
                start: event.start,
                end: event.end,
                priority: event.priority || 'low'
            }));

            const combinedEvents = [...bookingEvents, ...additionalEvents].filter(event => typeFilterValue === 'all' || event.type === typeFilterValue);

            const eventsByCar = combinedEvents.reduce((acc, event) => {
                acc[event.carId] = acc[event.carId] || [];
                acc[event.carId].push(event);
                return acc;
            }, {});

            Object.values(eventsByCar).forEach(list => list.sort((a, b) => new Date(a.start) - new Date(b.start)));

            const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
            const headerHtml = `
                <div class="grid bg-gray-50 border border-gray-200 rounded-md text-sm font-semibold text-gray-500" style="${columnsStyle}">
                    <div class="px-3 py-3 uppercase tracking-wide">Авто</div>
                    ${dates.map(date => {
                        const dateStr = date.toISOString().slice(0, 10);
                        const highlight = dateStr === todayStr ? 'bg-white text-indigo-600' : 'text-gray-900';
                        return `<div class="py-3 px-2 text-center border-l border-gray-200 ${highlight}">${dayNames[date.getDay()]}<span class=\"block text-xs text-gray-500 mt-1\">${date.getDate()}</span></div>`;
                    }).join('')}
                </div>
            `;

            const rowsHtml = cars.length === 0
                ? `<div class="p-6 text-sm text-gray-500 border border-t-0 border-gray-200 bg-white">Нет автомобилей, соответствующих выбранным фильтрам.</div>`
                : cars.map(car => {
                    const events = eventsByCar[car.id] || [];
                    const eventBlocks = events.map((event, index) => {
                        const start = new Date(event.start);
                        const end = new Date(event.end || event.start);
                        if (end < startDate || start > endDate) return '';
                        const clampedStart = start < startDate ? startDate : start;
                        const clampedEnd = end > endDate ? endDate : end;
                        const dayOffsetStart = Math.max(0, Math.floor((clampedStart - startDate) / 86400000));
                        const dayOffsetEnd = Math.max(dayOffsetStart, Math.floor((clampedEnd - startDate) / 86400000));
                        const widthPercent = ((dayOffsetEnd - dayOffsetStart + 1) / daysCount) * 100;
                        const leftPercent = (dayOffsetStart / daysCount) * 100;
                        const meta = CALENDAR_EVENT_TYPES[event.type] || { color: 'bg-gray-200 text-gray-700', border: 'border-gray-200', label: event.type };
                        const startTimeLabel = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                        const endTimeLabel = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                        return `
                            <div class="absolute calendar-event ${meta.color} border ${meta.border} text-xs font-medium px-2 py-1 rounded-md shadow-sm pointer-events-auto"
                                 data-booking-id="${event.bookingId || ''}"
                                 data-calendar-event-id="${event.calendarEventId || ''}"
                                 style="left: calc(${leftPercent}% + 4px); width: calc(${widthPercent}% - 8px); top: ${index * 26 + 6}px;">
                                <div class="flex justify-between items-center gap-2">
                                    <span class="truncate">${event.title}</span>
                                    <span class="text-[10px] opacity-80">${startTimeLabel}–${endTimeLabel}</span>
                                </div>
                            </div>
                        `;
                    }).join('');

                    const statusIndicator = car.status === 'In Rent'
                        ? 'bg-blue-500'
                        : car.status === 'Maintenance'
                        ? 'bg-yellow-500'
                        : 'bg-green-500';

                    const dateCells = dates.map(date => {
                        const dateStr = date.toISOString().slice(0, 10);
                        const highlight = dateStr === todayStr ? 'bg-indigo-50' : 'bg-gray-50';
                        return `<div class="h-20 border-l border-gray-100 ${highlight}"></div>`;
                    }).join('');

                    return `
                        <div class="grid border border-t-0 border-gray-200 bg-white relative" style="${columnsStyle}">
                            <div class="px-3 py-3 flex items-center gap-3 border-r border-gray-200">
                                <div class="relative">
                                    <img src="${car.imageUrl}" alt="${car.name}" class="w-10 h-6 object-cover rounded-md">
                                    <span class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${statusIndicator} border border-white"></span>
                                </div>
                                <div>
                                    <p class="font-semibold text-xs text-gray-900">${car.name}</p>
                                    <p class="text-xs text-gray-500">${car.plate}</p>
                                </div>
                            </div>
                            ${dateCells}
                            <div class="absolute inset-y-1" style="left:${firstColWidth}px; right:0;">
                                ${eventBlocks}
                            </div>
                        </div>
                    `;
                }).join('');

            grid.innerHTML = headerHtml + rowsHtml;

            const rangeLabel = document.getElementById('calendar-range-label');
            if (rangeLabel) {
                const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
                const startLabel = formatter.format(startDate);
                const endLabel = formatter.format(endDate);
                rangeLabel.textContent = `${startLabel} — ${endLabel} ${endDate.getFullYear()} г.`;
            }

            const legendDescriptions = {
                rental: 'Заказы клиентов',
                maintenance: 'Работы по обслуживанию',
                inspection: 'Инспекции и проверки',
                detailing: 'Детейлинг и подготовка'
            };
            const legendEl = document.getElementById('calendar-legend');
            if (legendEl) {
                legendEl.innerHTML = Object.entries(CALENDAR_EVENT_TYPES).map(([key, meta]) => {
                    const colorClass = meta.color.split(' ')[0];
                    return `
                        <div class="geist-card p-3 flex items-center gap-3">
                            <span class="w-3 h-3 rounded-full ${colorClass}"></span>
                            <div>
                                <p class="text-sm font-medium text-gray-900">${meta.label}</p>
                                <p class="text-xs text-gray-500">${legendDescriptions[key] || ''}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        const renderReports = () => {
            const topCarsEl = document.getElementById('top-cars-report');
            if(!topCarsEl) return;
            const revenueTotal = MOCK_DATA.analytics.revenueDaily.reduce((sum, item) => sum + item.revenue, 0);
            const expensesTotal = MOCK_DATA.analytics.revenueDaily.reduce((sum, item) => sum + item.expenses, 0);
            const periodLabel = document.getElementById('reports-period-label');
            if (periodLabel) periodLabel.textContent = 'Последние 7 дней';
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
                        <img src="${car.imageUrl}" class="w-12 h-8 object-cover rounded-md mx-4">
                        <span class="font-semibold">${car.name}</span>
                    </div>
                    <span class="font-bold text-lg">$${((5-index)*2500 + 1000).toLocaleString()}</span>
                </li>
            `).join('');
        }

        let notificationFiltersBound = false;
        const bindNotificationFilters = () => {
            if (notificationFiltersBound) return;
            const channelSelect = document.getElementById('notifications-filter-channel');
            const prioritySelect = document.getElementById('notifications-filter-priority');
            if (channelSelect) {
                channelSelect.addEventListener('change', (event) => {
                    appState.filters.notifications.channel = event.target.value;
                    renderNotificationCenter();
                });
            }
            if (prioritySelect) {
                prioritySelect.addEventListener('change', (event) => {
                    appState.filters.notifications.priority = event.target.value;
                    renderNotificationCenter();
                });
            }
            notificationFiltersBound = true;
        };

        const renderNotificationCenter = () => {
            const container = document.getElementById('notifications-center');
            if (!container) return;
            bindNotificationFilters();

            const channelSelect = document.getElementById('notifications-filter-channel');
            const prioritySelect = document.getElementById('notifications-filter-priority');
            if (channelSelect) channelSelect.value = appState.filters.notifications.channel;
            if (prioritySelect) prioritySelect.value = appState.filters.notifications.priority;

            const listEl = container.querySelector('#notifications-list');
            if (!listEl) return;

            const channelFilter = appState.filters.notifications.channel;
            const priorityFilter = appState.filters.notifications.priority;
            const filtered = MOCK_DATA.notifications.filter(notification => {
                if (channelFilter !== 'all' && notification.channel !== channelFilter) return false;
                if (priorityFilter !== 'all' && notification.priority !== priorityFilter) return false;
                return true;
            });

            const statusMeta = {
                scheduled: { label: 'Запланировано', class: 'text-amber-600' },
                pending: { label: 'Ожидает отправки', class: 'text-amber-600' },
                delivered: { label: 'Отправлено', class: 'text-emerald-600' }
            };

            listEl.innerHTML = filtered.length ? filtered.map(notification => {
                const channelMeta = NOTIFICATION_CHANNELS[notification.channel] || { label: notification.channel, badge: 'bg-gray-100 text-gray-600' };
                const priorityBadge = notification.priority === 'high'
                    ? 'bg-rose-100 text-rose-700'
                    : notification.priority === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600';
                const status = statusMeta[notification.status] || { label: notification.status, class: 'text-gray-500' };
                const createdAt = notification.createdAt ? new Date(notification.createdAt).toLocaleString('ru-RU') : '—';
                return `
                    <div class="geist-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-1 text-xs font-medium rounded-md ${channelMeta.badge}">${channelMeta.label}</span>
                                <span class="px-2 py-1 text-xs font-medium rounded-md ${priorityBadge}">${notification.priority.toUpperCase()}</span>
                            </div>
                            <p class="font-semibold text-sm text-gray-900">${notification.title}</p>
                            <p class="text-xs text-gray-500">${createdAt}</p>
                        </div>
                        <div class="flex items-center gap-3 sm:flex-col sm:items-end text-sm">
                            <span class="${status.class}">${status.label}</span>
                            ${notification.status !== 'delivered' ? `<button class="notification-mark-read text-xs geist-button geist-button-secondary" data-notification-id="${notification.id}">Отметить отправленным</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('') : '<div class="geist-card p-6 text-sm text-gray-500">Уведомления по выбранным фильтрам отсутствуют.</div>';
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
                        <p>Активных задач: <span class="font-medium text-gray-900">${filteredTasks.length}</span></p>
                        <p>Просрочки: <span class="font-medium ${overdue ? 'text-rose-600' : 'text-emerald-600'}">${overdue}</span></p>
                    </div>
                `;
            }

            const statuses = { todo: 'К выполнению', inprogress: 'В работе', done: 'Завершено' };
            board.innerHTML = Object.entries(statuses).map(([statusKey, statusValue]) => {
                const tasks = filteredTasks.filter(task => task.status === statusKey);
                return `
                    <div class="geist-card h-full flex flex-col">
                        <h3 class="p-4 font-semibold border-b text-gray-800">${statusValue}</h3>
                        <div class="flex-1 p-4 space-y-3">
                           ${tasks.map(task => {
                               const assignee = MOCK_DATA.drivers.find(d => d.id === task.assigneeId);
                               const typeMeta = TASK_TYPES[task.type] || { label: task.type, color: 'bg-gray-100 text-gray-600' };
                               const priorityBadge = task.priority ? `<span class=\"inline-flex items-center px-2 py-1 text-[10px] font-medium rounded-md ${task.priority === 'Высокий' ? 'bg-rose-50 text-rose-700 border border-rose-100' : task.priority === 'Средний' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}\">${task.priority}</span>` : '';
                               const deadlineTimestamp = task.deadline ? new Date(task.deadline.replace(' ', 'T')).getTime() : NaN;
                               const countdownBlock = (!Number.isNaN(deadlineTimestamp) && task.status !== 'done') ? `<div class=\"task-countdown text-xs text-amber-600 mt-2\" data-target-time=\"${deadlineTimestamp}\"></div>` : '';
                               const checklistTotal = task.checklist ? task.checklist.length : 0;
                               const checklistCompleted = task.checklist ? task.checklist.filter(item => item.completed).length : 0;
                               const slaBadge = task.sla ? `<span class=\"inline-flex items-center px-2 py-1 text-[10px] font-medium rounded-md bg-slate-100 text-slate-700\">SLA ${task.sla.timerMinutes} мин</span>` : '';
                               return `
                               <div class=\"p-3 bg-gray-50 rounded-md border border-transparent hover:border-gray-200 hover:bg-white transition cursor-pointer task-card\" data-task-id=\"${task.id}\">
                                  <div class=\"flex items-start justify-between\">
                                      <div>
                                          <div class=\"flex items-center gap-2\">
                                              <span class=\"inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${typeMeta.color}\">${typeMeta.label}</span>
                                              ${priorityBadge}
                                          </div>
                                          <p class=\"mt-2 font-semibold text-sm text-gray-900\">${task.title}</p>
                                          ${task.geo?.pickup ? `<p class=\"text-xs text-gray-500\">${task.geo.pickup}${task.geo.dropoff ? ' → ' + task.geo.dropoff : ''}</p>` : ''}
                                      </div>
                                      <div class=\"text-right text-xs text-gray-500 space-y-1\">
                                          <span>${task.deadline || '—'}</span>
                                          ${slaBadge}
                                      </div>
                                  </div>
                                  <div class=\"flex items-center justify-between text-xs text-gray-600 mt-2\">
                                      <span>${assignee ? assignee.name : 'Не назначен'}</span>
                                      <span>Чек-лист: ${checklistTotal ? `${checklistCompleted}/${checklistTotal}` : '—'}</span>
                                  </div>
                                  ${task.description ? `<p class=\"text-xs text-gray-500 mt-2 overflow-hidden text-ellipsis\">${task.description}</p>` : ''}
                                  ${countdownBlock}
                               </div>`
                           }).join('') || '<p class="text-xs text-gray-500">Нет задач</p>'}
                        </div>
                    </div>
                `;
            }).join('');

            startTimers();
        };

        const openTaskDetailModal = (taskId) => {
            const task = MOCK_DATA.tasks.find(t => t.id == taskId);
            if (!task) return;

            const assignee = MOCK_DATA.drivers.find(d => d.id === task.assigneeId);
            const booking = task.bookingId ? MOCK_DATA.bookings.find(b => b.id === task.bookingId) : null;
            const statusLabels = { todo: 'К выполнению', inprogress: 'В работе', done: 'Завершено' };
            const statusBadge = statusLabels[task.status] || task.status;
            const typeMeta = TASK_TYPES[task.type] || { label: task.type };
            const checklistHtml = task.checklist && task.checklist.length
                ? task.checklist.map(item => `
                    <label class="flex items-center gap-2 text-sm ${item.completed ? 'text-emerald-600' : 'text-gray-700'}">
                        <input type="checkbox" class="task-checklist-toggle" data-task-id="${task.id}" data-item-id="${item.id}" ${item.completed ? 'checked' : ''}>
                        <span>${item.label}${item.required ? ' <span class=\"text-rose-500\">*</span>' : ''}</span>
                    </label>
                `).join('')
                : '<p class="text-xs text-gray-500">Чек-лист не требуется</p>';

            const requiredInputs = task.requiredInputs && task.requiredInputs.length
                ? `<p class="text-xs text-gray-500">Обязательные данные: ${task.requiredInputs.map(input => `<span class=\"font-medium text-gray-900\">${input}</span>`).join(', ')}</p>`
                : '';

            const locationInfo = task.geo ? `<p class="text-xs text-gray-500">Маршрут: ${task.geo.pickup}${task.geo.dropoff ? ' → ' + task.geo.dropoff : ''}</p>` : '';
            const slaInfo = task.sla ? `<p class="text-xs text-gray-500">SLA: ${task.sla.timerMinutes} минут</p>` : '';

            openModal(`
                <div class="p-6 border-b flex justify-between items-center">
                    <div>
                        <p class="text-xs uppercase tracking-wide text-gray-500">${typeMeta.label}</p>
                        <h2 class="text-xl font-semibold mt-1">${task.title}</h2>
                    </div>
                    <button class="p-2 text-gray-500 hover:text-black close-modal-btn">&times;</button>
                </div>
                <div class="p-6 space-y-5 text-sm">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs uppercase tracking-wide text-gray-500">Ответственный</p>
                            <p class="font-medium mt-1">${assignee ? assignee.name : 'Не назначен'}</p>
                        </div>
                        <span class="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">${statusBadge}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
                        <div>
                            <p class="font-semibold text-gray-500">Дедлайн</p>
                            <p class="mt-1">${task.deadline || 'Не указан'}</p>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-500">Приоритет</p>
                            <p class="mt-1">${task.priority || '—'}</p>
                        </div>
                        ${task.sla ? `<div><p class="font-semibold text-gray-500">SLA</p><p class="mt-1">${task.sla.timerMinutes} минут</p></div>` : ''}
                        ${task.geo ? `<div><p class="font-semibold text-gray-500">Локация</p><p class="mt-1">${task.geo.pickup}${task.geo.dropoff ? ' → ' + task.geo.dropoff : ''}</p></div>` : ''}
                    </div>
                    ${task.description ? `<div>
                        <p class="font-semibold text-gray-500">Описание</p>
                        <p class="mt-1 text-gray-700 leading-relaxed">${task.description}</p>
                    </div>` : ''}
                    <div class="space-y-2">
                        <p class="font-semibold text-gray-500">Чек-лист</p>
                        <div class="space-y-2">
                            ${checklistHtml}
                        </div>
                        ${requiredInputs}
                    </div>
                    ${booking ? `<div class="border-t pt-4">
                        <p class="font-semibold text-gray-500 mb-2">Связанный заказ</p>
                        <div class="flex flex-col space-y-2">
                            <span><strong>#${booking.id}</strong> · ${booking.carName}</span>
                            <a class="text-blue-600 hover:underline text-sm" href="${buildHash(appState.currentRole, 'bookings', booking.id)}">Открыть детали бронирования</a>
                        </div>
                    </div>` : ''}
                </div>
                <div class="px-6 pb-6 flex justify-end">
                    <button id="task-complete-btn" class="geist-button geist-button-primary text-sm">Завершить задачу</button>
                </div>
            `);

            document.querySelectorAll('.task-checklist-toggle').forEach(input => {
                input.addEventListener('change', (event) => {
                    const itemId = event.target.dataset.itemId;
                    const item = task.checklist?.find(entry => entry.id === itemId);
                    if (item) {
                        item.completed = event.target.checked;
                        event.target.parentElement.classList.toggle('text-emerald-600', event.target.checked);
                        renderTasksPage();
                    }
                });
            });

            const completeBtn = document.getElementById('task-complete-btn');
            if (completeBtn) {
                completeBtn.addEventListener('click', () => {
                    const hasChecklist = Array.isArray(task.checklist) && task.checklist.length;
                    if (hasChecklist) {
                        const incompleteRequired = task.checklist.some(item => item.required && !item.completed);
                        if (incompleteRequired) {
                            showToast('Заполните обязательные пункты чек-листа перед завершением', 'error');
                            return;
                        }
                    }
                    task.status = 'done';
                    showToast('Задача отмечена как выполненная', 'success');
                    closeModal();
                    renderTasksPage();
                });
            }
        };

        // --- LAYOUT MANAGER ---
        const updateLayoutForRole = (role) => {
            const roleConfig = ROLES_CONFIG[role] || {};
            const layout = roleConfig.layout || 'desktop';
            const isDesktop = layout === 'desktop';
            const isMobile = layout === 'mobile';
            const isPortal = layout === 'portal';

            desktopShell.classList.toggle('hidden', !isDesktop);
            sidebar.classList.toggle('hidden', !isDesktop);
            mainContent.classList.toggle('hidden', !isDesktop);
            portalShell.classList.toggle('hidden', !isPortal);
            mobileViewContainer.classList.toggle('hidden', !isMobile);

            if (!isDesktop) {
                desktopPages.forEach(page => page.classList.add('hidden'));
            }
            if (!isPortal) {
                portalPages.forEach(page => page.classList.add('hidden'));
            }

            if (isPortal && clientPortalSidebar) {
                clientPortalSidebar.classList.toggle('hidden', window.innerWidth < 768);
            }

            if (!isDesktop) {
                closePanel();
            }
        };
        
        // --- HASH ROUTING ---
        const router = () => {
            if (appState.timerInterval) clearInterval(appState.timerInterval);
            const parsedHash = parseHash(window.location.hash);
            let { role, page, selector } = parsedHash;
            const roleConfig = ROLES_CONFIG[role];
            const layout = roleConfig?.layout || 'desktop';
            let normalizedSelector = selector;
            let needsUpdate = !parsedHash.isCanonical;

            if (layout === 'desktop' && roleConfig?.nav?.length) {
                const allowedPages = roleConfig.nav.map(item => item.id);
                if (!allowedPages.includes(page) && !page.endsWith('-table')) {
                    page = roleConfig.defaultPage;
                    normalizedSelector = HASH_DEFAULT_SELECTOR;
                    needsUpdate = true;
                }
            } else if (layout === 'portal' && roleConfig?.nav?.length) {
                const allowedPages = roleConfig.nav.map(item => item.id);
                if (!allowedPages.includes(page)) {
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

            closePanel(); // Close any open panels on navigation

            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

            if (layout === 'portal') {
                renderClientPortalNav();
            }

            let pageId = `page-${appState.currentPage}`;

            if (appState.currentPage.endsWith('-table')) {
                pageId = 'page-table-view';
                renderTableView(appState.currentPage);
                if (!isDefaultSelector(normalizedSelector)) {
                    renderDetailPanel(appState.currentPage, normalizedSelector);
                }
            } else if (!isDefaultSelector(normalizedSelector) && ['bookings', 'fleet-calendar', 'driver-task-detail'].includes(appState.currentPage)) {
                if (appState.currentPage === 'bookings') {
                    renderDetailPanel('bookings', normalizedSelector);
                } else if (appState.currentPage === 'fleet-calendar') {
                    // Calendar booking detail will be handled by click handler
                } else if (appState.currentPage === 'driver-task-detail') {
                    pageId = 'page-driver-task-detail';
                    renderDriverTaskDetail(normalizedSelector);
                }
            }

            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.remove('hidden');
            } else {
                // Fallback to default page for the role
                const defaultPage = roleConfig?.defaultPage || 'dashboard';
                const defaultPageEl = document.getElementById(`page-${defaultPage}`);
                if (defaultPageEl) {
                    defaultPageEl.classList.remove('hidden');
                    appState.currentPage = defaultPage;
                }
                // Update URL to correct hash
                const newHash = buildHash(appState.currentRole, appState.currentPage);
                if (window.location.hash !== newHash) {
                    window.location.hash = newHash;
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
                    pageActionButton.textContent = "Добавить задачу";
                    pageActionButton.classList.remove('hidden');
                } else if(appState.currentPage === 'fleet-table') {
                    pageActionButton.textContent = "Добавить авто";
                    pageActionButton.classList.remove('hidden');
                }
            }

            updateActiveLink();
            if (layout === 'portal') {
                updatePortalNavActive();
                renderClientPortalPage(appState.currentPage);
            }

            // Render content for specific pages
            if(appState.currentPage === 'bookings') renderKanbanBoard();
            if(appState.currentPage === 'dashboard') renderDashboard();
            if(appState.currentPage === 'analytics') renderAnalyticsPage();
            if(appState.currentPage === 'driver-tasks') renderDriverTasks();
            if(appState.currentPage === 'driver-tasks') startTimers();
            if(appState.currentPage === 'fleet-calendar') renderCalendar();
            if(appState.currentPage === 'reports') renderReports();
            if(appState.currentPage === 'tasks') renderTasksPage();
            if(appState.currentPage === 'notifications') renderNotificationCenter();
            if(appState.currentPage === 'sales-pipeline') renderSalesPipeline();
            if(appState.currentPage !== 'driver-tasks' && appState.driverContext?.tracking?.enabled) {
                stopDriverTracking();
            }
        };
        
        // --- MODAL HANDLING ---
        const genericModal = document.getElementById('generic-modal');
        const genericModalContent = document.getElementById('generic-modal-content');
        
        const openModal = (content) => {
            genericModalContent.innerHTML = content;
            genericModal.classList.replace('hidden', 'flex');
        }
        const closeModal = () => genericModal.classList.replace('flex', 'hidden');

        const docViewer = document.getElementById('doc-viewer-modal');
        const openDocViewer = (url) => {
            document.getElementById('doc-viewer-image').src = url;
            docViewer.classList.replace('hidden', 'flex');
        }
        const closeDocViewer = () => docViewer.classList.replace('flex', 'hidden');
        
        // --- EVENT LISTENERS ---
        if (loginRoleSelect) {
            loginRoleSelect.addEventListener('change', (e) => {
                const preset = ROLE_EMAIL_PRESETS[e.target.value];
                if (preset && loginEmailInput) {
                    loginEmailInput.value = preset;
                }
            });
        }

        if (requestOtpBtn) {
            requestOtpBtn.addEventListener('click', () => {
                requestOtpBtn.textContent = 'Скоро доступно';
                requestOtpBtn.disabled = true;
            });
        }

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
            const selectedRole = loginRoleSelect?.value || 'operations';
            appState.currentRole = selectedRole;
            const defaultPage = ROLES_CONFIG[selectedRole]?.defaultPage || 'dashboard';
            document.getElementById('page-login').classList.add('hidden');
            appContainer.classList.remove('hidden');
            window.location.hash = buildHash(selectedRole, defaultPage);
            initApp();
        });

        if (roleSwitcher) {
            roleSwitcher.addEventListener('change', (e) => {
                const newRole = e.target.value;
                const defaultPage = ROLES_CONFIG[newRole]?.defaultPage || 'dashboard';
                appState.currentRole = newRole;
                window.location.hash = buildHash(newRole, defaultPage);
                initApp();
            });
        }

        const portalRoleSwitchBtn = document.getElementById('portal-role-switch');
        if (portalRoleSwitchBtn) {
            portalRoleSwitchBtn.addEventListener('click', () => {
                appState.currentRole = 'operations';
                const defaultPage = ROLES_CONFIG.operations.defaultPage;
                window.location.hash = buildHash('operations', defaultPage);
                initApp();
            });
        }

        const portalSupportBtn = document.getElementById('portal-support');
        if (portalSupportBtn) {
            portalSupportBtn.addEventListener('click', () => {
                portalSupportBtn.textContent = 'support@skyluxse.ae';
                portalSupportBtn.classList.remove('geist-button-primary');
                portalSupportBtn.classList.add('geist-button-secondary');
            });
        }

        document.getElementById('sidebar-nav').addEventListener('click', (e) => {
            if(window.innerWidth < 768) sidebar.classList.add('-translate-x-full');
        });
        
        document.getElementById('burger-menu').addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
        
        document.getElementById('panel-overlay').addEventListener('click', closePanel);

        appContainer.addEventListener('click', e => {
            const link = e.target.closest('a');
            if(link && link.hash && link.hash.startsWith('#')) {
                  const { page, selector, canonical } = parseHash(link.hash);
                  if(!isDefaultSelector(selector) && (page.endsWith('-table') || page === 'bookings')) {
                      e.preventDefault();
                      renderDetailPanel(page, selector);
                      window.location.hash = canonical;
                      return;
                  }
            }

            const taskCard = e.target.closest('.task-card');
            if (taskCard) {
                openTaskDetailModal(taskCard.dataset.taskId);
                return;
            }

            const kanbanCard = e.target.closest('.kanban-card');
            if (kanbanCard) {
                e.preventDefault();
                const bookingId = kanbanCard.dataset.bookingId;
                window.location.hash = buildHash(appState.currentRole, 'bookings', bookingId);
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
                renderDetailPanel('bookings', bookingId);
                window.location.hash = buildHash(appState.currentRole, 'fleet-calendar', bookingId);
                return;
            }
            
            const docImage = e.target.closest('.doc-image');
            if(docImage) openDocViewer(docImage.src);

            const clientDocLink = e.target.closest('.client-doc-link');
            if(clientDocLink) {
                e.preventDefault();
                openDocViewer(clientDocLink.dataset.url);
            }
            
            // Handle new booking button
            if (e.target.closest('button') && e.target.closest('button').textContent.includes('Новый заказ')) {
                e.preventDefault();
                // This would open a modal to create a new booking
                openModal(`
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Новый заказ</h2>
                        <button class="p-2 text-gray-500 hover:text-black close-modal-btn">&times;</button>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Клиент</label>
                            <select class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
                                ${MOCK_DATA.clients.map(client => `<option>${client.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Автомобиль</label>
                            <select class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
                                ${MOCK_DATA.cars.filter(car => car.status === 'Available').map(car => `<option>${car.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Дата начала</label>
                                <input type="date" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Дата окончания</label>
                                <input type="date" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
                            </div>
                        </div>
                    </div>
                    <div class="p-6 border-t bg-gray-50 flex justify-end space-x-3">
                        <button class="geist-button geist-button-secondary close-modal-btn">Отмена</button>
                        <button class="geist-button geist-button-primary">Создать заказ</button>
                    </div>
                `);
            }

            const finesBtn = e.target.closest('.check-fines-btn');
            if (finesBtn) {
                const resultEl = detailPanel.querySelector('#fines-result');
                if (resultEl) {
                    const hasFine = Math.random() < 0.35;
                    if (hasFine) {
                        const fineAmount = Math.floor(Math.random() * 400) + 200;
                        resultEl.innerHTML = `<span class="text-rose-600 font-semibold">Найден штраф ${fineAmount} AED</span><br><span class="text-xs text-gray-500">Рекомендуется удержать сумму из депозита</span>`;
                    } else {
                        resultEl.innerHTML = '<span class="text-emerald-600 font-semibold">Штрафы не обнаружены</span>';
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
            if (e.target.id === 'generate-qr-btn') {
                const qrContainer = document.getElementById('qrcode-container');
                const amount = document.getElementById('payment-amount').value;
                qrContainer.innerHTML = '';
                new QRCode(qrContainer, `https://stripe.com/pay/mock_link_for_${amount}`);
                qrContainer.classList.remove('hidden');
            }
            if (e.target.id === 'complete-task-btn') {
                const bookingId = e.target.dataset.bookingId;
                const odometerValue = detailPanel.querySelector('#driver-odometer')?.value.trim();
                const fuelLevel = detailPanel.querySelector('#driver-fuel')?.value;
                if (!odometerValue || !fuelLevel) {
                    showToast('Заполните пробег и уровень топлива перед завершением', 'error');
                    return;
                }
                const cashValue = parseFloat(detailPanel.querySelector('#driver-cash')?.value || '0') || 0;
                const services = Array.from(detailPanel.querySelectorAll('.driver-service:checked')).map(input => ({
                    code: input.dataset.code,
                    amount: parseFloat(input.dataset.amount || '0') || 0
                }));
                const finesText = detailPanel.querySelector('#fines-result')?.textContent.trim();
                const payload = {
                    odometer: odometerValue,
                    fuelLevel,
                    cashValue,
                    services,
                    fines: finesText
                };

                if (appState.offline.enabled) {
                    enqueueOfflineAction({ type: 'driver-task-complete', bookingId, payload });
                    showToast('Данные сохранены офлайн', 'info');
                } else {
                    const booking = MOCK_DATA.bookings.find(b => b.id == bookingId);
                    if (booking) {
                        booking.status = 'settlement';
                        booking.mileage = odometerValue;
                        booking.fuelLevel = fuelLevel;
                        booking.cashCollected = cashValue;
                        booking.addonServices = services;
                        booking.history = booking.history || [];
                        booking.history.push({ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), event: 'Водитель завершил задачу, данные обновлены' });
                    }
                    const relatedTask = MOCK_DATA.tasks.find(t => String(t.bookingId) === String(bookingId));
                    if (relatedTask) {
                        relatedTask.status = 'done';
                        relatedTask.completedPayload = payload;
                    }
                    syncOfflineQueue();
                }

                closePanel();
                renderDriverTasks();
                renderTasksPage();
                showToast('Задача водителя завершена', 'success');
            }

            const markNotificationBtn = e.target.closest('.notification-mark-read');
            if (markNotificationBtn) {
                const notificationId = markNotificationBtn.dataset.notificationId;
                const notification = MOCK_DATA.notifications.find(note => note.id === notificationId);
                if (notification) {
                    notification.status = 'delivered';
                    showToast('Уведомление отмечено как доставленное', 'success');
                    renderNotificationCenter();
                }
            }
        });

        detailPanel.addEventListener('click', e => {
            const stripeBtn = e.target.closest('.generate-stripe-link');
            if (stripeBtn) {
                const amountInput = detailPanel.querySelector('.stripe-amount-input');
                const reasonSelect = detailPanel.querySelector('.stripe-reason-select');
                const amountValue = amountInput ? amountInput.value : '';
                const reasonValue = reasonSelect ? reasonSelect.value : '';
                const bookingId = stripeBtn.dataset.bookingId;
                const sanitizedAmount = amountValue ? amountValue.toString().replace(',', '.') : '0';
                const reasonSlug = reasonValue ? reasonValue.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-+|-+$/g, '') : 'payment';
                const linkToken = Math.random().toString(36).slice(2, 8);
                const stripeLink = `https://pay.stripe.com/mock/skyluxse-${bookingId}-${reasonSlug}-${linkToken}?amount=${encodeURIComponent(sanitizedAmount || '0')}`;

                const resultContainer = detailPanel.querySelector('#stripe-link-result');
                const anchor = detailPanel.querySelector('#stripe-link-anchor');
                const copyBtn = detailPanel.querySelector('.copy-stripe-link');
                const feedback = detailPanel.querySelector('#stripe-copy-feedback');

                if (anchor) {
                    anchor.href = stripeLink;
                    anchor.textContent = stripeLink;
                }
                if (copyBtn) {
                    copyBtn.dataset.link = stripeLink;
                }
                if (feedback) {
                    feedback.textContent = 'Ссылка скопирована';
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
                const feedback = detailPanel.querySelector('#stripe-copy-feedback');
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
                            .then(() => showFeedback('Ссылка скопирована'))
                            .catch(() => {
                                showFeedback('Не удалось скопировать автоматически', false);
                            });
                    } else {
                        showFeedback('Скопируйте ссылку вручную: ' + linkValue, false);
                    }
                }
            }
        });

        detailPanel.addEventListener('input', e => {
            if (['driver-odometer', 'driver-fuel'].includes(e.target.id)) {
                const docChecked = document.getElementById('doc-check')?.checked;
                const formValid = !!document.getElementById('driver-odometer')?.value && !!document.getElementById('driver-fuel')?.value;
                const completeBtn = document.getElementById('complete-task-btn');
                if (docChecked && completeBtn) {
                    completeBtn.disabled = !formValid;
                }
            }
        });

        pageActionButton.addEventListener('click', () => {
            if(appState.currentPage === 'tasks') {
                 openTaskCreationModal();
            }
            if (appState.currentPage === 'fleet-table') {
                 openModal(`
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Добавить автомобиль</h2>
                        <button class="p-2 text-gray-500 hover:text-black close-modal-btn">&times;</button>
                    </div>
                    <div class="p-6 space-y-4">
                        <input type="text" placeholder="Название" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
                        <input type="text" placeholder="Номер" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
                    </div>
                     <div class="p-6 border-t bg-gray-50 flex justify-end">
                        <button class="geist-button geist-button-primary">Сохранить</button>
                    </div>
                 `);
            }
        });
        
        genericModal.addEventListener('click', e => {
            if(e.target.classList.contains('close-modal-btn')) closeModal();
        });
        
        document.getElementById('close-doc-viewer').addEventListener('click', closeDocViewer);

        window.addEventListener('popstate', router);
        window.addEventListener('hashchange', router);

        // --- APP INITIALIZATION ---
        const initApp = () => {
            document.querySelector('#burger-menu').innerHTML = getIcon('menu');
            const backBtn = document.querySelector('.back-to-tasks');
            if (backBtn && !backBtn.innerHTML.includes('svg')) {
                 backBtn.insertAdjacentHTML('afterbegin', getIcon('chevronLeft'));
            }
            updateLayoutForRole(appState.currentRole);
            renderSidebar();

            // Handle initial URL - redirect root to default role/page
            if (window.location.hash === '' || window.location.hash === '#') {
                const defaultPage = ROLES_CONFIG[appState.currentRole]?.defaultPage || 'dashboard';
                const targetHash = buildHash(appState.currentRole, defaultPage);
                window.location.hash = targetHash;
            }
            router();
        };
        
    });
