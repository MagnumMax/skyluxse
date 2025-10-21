import {
    MOCK_DATA,
    BOOKING_PRIORITIES,
    BOOKING_TYPES,
    CALENDAR_EVENT_TYPES,
    TASK_TYPES,
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
import { renderAnalyticsPage, renderSalesPipeline, renderClientCard } from './render/charts.js';
import { startTimers } from './render/timers.js';
import { formatCurrency } from './render/utils.js';
import { renderFleetCalendar, initFleetCalendar } from './render/fleetCalendar.js';
import { showToast } from './ui/toast.js';
import { getIcon } from './ui/icons.js';

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

        // --- DOM Elements ---
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
        
        const renderDetailPanel = (type, id) => {
            let content = '';
            let targetContainer = null;

            if (type === 'bookings') {
                const booking = MOCK_DATA.bookings.find(b => b.id == id);
                if (!booking || !bookingDetailContent) return false;
                targetContainer = bookingDetailContent;
                const client = MOCK_DATA.clients.find(c => c.name === booking.clientName) || {};
                const dueAmount = (booking.totalAmount || 0) - (booking.paidAmount || 0);
                const formatAed = (value) => {
                    const numeric = Number(value) || 0;
                    return `AED ${Math.round(numeric).toLocaleString('en-US')}`;
                };
                const formatDateTime = (date, time) => {
                    if (!date && !time) return '—';
                    if (!date) return time || '—';
                    return time ? `${date} ${time}` : date;
                };
                const formatLocationLink = (label) => {
                    if (!label) {
                        return '<span class="text-gray-400">—</span>';
                    }
                    const encoded = encodeURIComponent(label);
                    return `<span class="min-w-0 max-w-full"><a href="https://www.google.com/maps/search/?api=1&query=${encoded}" target="_blank" rel="noopener" class="inline-block max-w-full break-words text-blue-600 hover:underline">${label}</a></span>`;
                };
                const assignedDriver = booking.driverId
                    ? MOCK_DATA.drivers.find(d => Number(d.id) === Number(booking.driverId))
                    : null;

                const clientId = client.id || booking.clientId;
                const salesOwnerMap = Object.fromEntries((MOCK_DATA.salesPipeline?.owners || []).map(owner => [owner.id, owner.name]));
                const responsibleSalesPerson = booking.ownerId
                    ? (salesOwnerMap[booking.ownerId] || booking.ownerId)
                    : 'Unassigned';
                const clientDetailLink = clientId
                    ? `<a href="${buildHash(appState.currentRole, 'client-detail', clientId)}" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">Open client card</a>`
                    : '';

                const formatMileageValue = (value) => {
                    if (value === 0) return '0 km';
                    const numeric = Number(value);
                    if (Number.isFinite(numeric)) {
                        return `${numeric.toLocaleString('en-US')} km`;
                    }
                    if (typeof value === 'string' && value.trim()) {
                        return value;
                    }
                    return '—';
                };

                const formatFuelValue = (value) => {
                    if (value === 0) return '0';
                    if (value == null) return '—';
                    const str = String(value).trim();
                    return str.length ? str : '—';
                };

                const parseDateOnly = (value) => {
                    if (!value || typeof value !== 'string') return null;
                    const [year, month, day] = value.split('-').map(Number);
                    if (!year || !month || !day) return null;
                    return new Date(year, month - 1, day, 12, 0, 0);
                };

                const parseDateTime = (dateStr, timeStr) => {
                    if (!dateStr) return null;
                    const timeValue = timeStr || '00:00';
                    const normalized = `${dateStr}T${timeValue.length === 5 ? `${timeValue}:00` : timeValue}`;
                    const parsed = new Date(normalized);
                    if (Number.isNaN(parsed.getTime())) {
                        return null;
                    }
                    return parsed;
                };

                const parseLooseDateTime = (value) => {
                    if (!value || typeof value !== 'string') return null;
                    if (value.includes('T')) {
                        const parsed = new Date(value);
                        return Number.isNaN(parsed.getTime()) ? null : parsed;
                    }
                    const normalized = value.replace(' ', 'T');
                    const parsed = new Date(`${normalized.length === 16 ? `${normalized}:00` : normalized}`);
                    return Number.isNaN(parsed.getTime()) ? null : parsed;
                };

                const now = new Date();
                const pickupDateTime = parseDateTime(booking.startDate, booking.startTime);
                const returnDateTime = parseDateTime(booking.endDate, booking.endTime);
                const normalizeStatus = (status) => (status || '').toLowerCase();

                const formatRelativeTime = (targetDate) => {
                    if (!targetDate || Number.isNaN(targetDate.getTime())) return '';
                    const diffMs = targetDate.getTime() - now.getTime();
                    const absMs = Math.abs(diffMs);
                    const minutes = Math.round(absMs / 60000);
                    const hours = Math.round(absMs / 3600000);
                    const days = Math.round(absMs / 86400000);
                    const suffix = diffMs < 0 ? ' ago' : '';
                    const prefix = diffMs >= 0 ? 'in ' : '';
                    if (minutes < 60) {
                        const value = Math.max(minutes, 1);
                        return `${prefix}${value} min${value === 1 ? '' : 's'}${suffix}`.trim();
                    }
                    if (hours < 48) {
                        return `${prefix}${hours} h${hours === 1 ? '' : 's'}${suffix}`.trim();
                    }
                    return `${prefix}${days} day${days === 1 ? '' : 's'}${suffix}`.trim();
                };

                const formatDateLabel = (targetDate) => {
                    if (!targetDate || Number.isNaN(targetDate.getTime())) return '—';
                    return targetDate.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                };

                const contractDoc = (booking.documents || []).find(doc => doc.type === 'contract');
                const contractStatus = normalizeStatus(contractDoc?.status);
                let documentsState = 'pending';
                let documentsCaption = 'Not uploaded';
                if (!contractDoc) {
                    documentsState = 'attention';
                    documentsCaption = 'Contract missing';
                } else if (['signed', 'approved', 'verified'].includes(contractStatus)) {
                    documentsState = 'done';
                    documentsCaption = 'Signed';
                } else if (['pending-signature', 'in-review', 'pending'].includes(contractStatus)) {
                    documentsState = 'in-progress';
                    documentsCaption = 'Awaiting signature';
                } else {
                    documentsState = 'attention';
                    documentsCaption = contractDoc.status ? contractDoc.status : 'Check status';
                }

                const invoices = Array.isArray(booking.invoices) ? booking.invoices : [];
                const isInvoiceOverdue = (invoice) => {
                    if (!invoice) return false;
                    const status = normalizeStatus(invoice.status);
                    if (['paid', 'settled', 'authorized'].includes(status)) return false;
                    const dueDate = parseDateOnly(invoice.dueDate);
                    return !!dueDate && dueDate.getTime() < now.setHours(0, 0, 0, 0);
                };
                const isInvoiceDueSoon = (invoice) => {
                    if (!invoice) return false;
                    const status = normalizeStatus(invoice.status);
                    if (['paid', 'settled', 'authorized'].includes(status)) return false;
                    const dueDate = parseDateOnly(invoice.dueDate);
                    if (!dueDate) return false;
                    const diffDays = Math.round((dueDate.getTime() - now.getTime()) / 86400000);
                    return diffDays >= 0 && diffDays <= 3;
                };
                const overdueInvoices = invoices.filter(isInvoiceOverdue);
                const dueSoonInvoices = invoices.filter(isInvoiceDueSoon);

                let paymentState = 'pending';
                let paymentCaption = dueAmount > 0 ? `Remaining ${formatAed(dueAmount)}` : 'All paid';
                if (dueAmount <= 0) {
                    paymentState = 'done';
                } else if (overdueInvoices.length) {
                    paymentState = 'attention';
                    paymentCaption = `Overdue ${formatAed(dueAmount)}`;
                } else if ((booking.paidAmount || 0) > 0) {
                    paymentState = 'in-progress';
                }

                const bookingStatus = normalizeStatus(booking.status);
                const timelineItems = Array.isArray(booking.timeline) ? booking.timeline : [];
                const getLatestTimelineEntry = (status) => {
                    const entries = timelineItems.filter(item => normalizeStatus(item.status) === status);
                    if (!entries.length) return null;
                    return entries.slice().sort((a, b) => {
                        const aDate = parseLooseDateTime(a.ts) || new Date(0);
                        const bDate = parseLooseDateTime(b.ts) || new Date(0);
                        return bDate - aDate;
                    })[0];
                };
                const latestPrep = getLatestTimelineEntry('preparation');
                const latestDelivery = getLatestTimelineEntry('delivery');

                let preparationState = 'pending';
                let preparationCaption = latestPrep?.note || '';
                if (bookingStatus === 'preparation') {
                    preparationState = 'in-progress';
                } else if (['delivery', 'in-rent', 'settlement', 'completed'].includes(bookingStatus)) {
                    preparationState = 'done';
                }
                if (!preparationCaption && preparationState === 'done') {
                    preparationCaption = 'Vehicle ready';
                }

                let handoverState = 'pending';
                let handoverCaption = latestDelivery?.note || '';
                if (bookingStatus === 'delivery') {
                    handoverState = 'in-progress';
                } else if (['in-rent', 'settlement', 'completed'].includes(bookingStatus)) {
                    handoverState = 'done';
                }
                if (!handoverCaption && handoverState === 'done') {
                    handoverCaption = 'Handed over to client';
                }

                let closureState = 'pending';
                let closureCaption = '';
                if (bookingStatus === 'in-rent') {
                    closureState = 'in-progress';
                    closureCaption = 'Rental in progress';
                } else if (['settlement', 'completed'].includes(bookingStatus)) {
                    closureState = bookingStatus === 'completed' ? 'done' : 'in-progress';
                    closureCaption = bookingStatus === 'completed' ? 'Closed' : 'Awaiting return checks';
                }

                const stageProgress = [
                    { id: 'documents', label: 'Documents', state: documentsState, caption: documentsCaption },
                    { id: 'payment', label: 'Payment', state: paymentState, caption: paymentCaption },
                    { id: 'preparation', label: 'Preparation', state: preparationState, caption: preparationCaption },
                    { id: 'handover', label: 'Handover', state: handoverState, caption: handoverCaption },
                    { id: 'closure', label: 'Closure', state: closureState, caption: closureCaption }
                ];

                const currentStage = stageProgress.find(stage => stage.state !== 'done') || stageProgress[stageProgress.length - 1];

                const stageProgressHtml = currentStage
                    ? `
                        <div class="inline-flex flex-col md:flex-row md:items-center gap-1 md:gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                            <span class="font-semibold text-slate-700 uppercase tracking-wide">Current stage:</span>
                            <span class="font-medium text-slate-900">${escapeHtml(currentStage.label)}</span>
                            ${currentStage.caption ? `<span class="text-slate-500">· ${escapeHtml(currentStage.caption)}</span>` : ''}
                        </div>
                    `
                    : '';

                const pickupMeta = (() => {
                    if (!pickupDateTime) return null;
                    const diffMs = pickupDateTime.getTime() - now.getTime();
                    let tone = 'bg-slate-100 text-slate-700 border border-slate-200';
                    if (diffMs < 0) {
                        tone = 'bg-rose-50 text-rose-700 border border-rose-100';
                    } else if (diffMs <= 2 * 3600000) {
                        tone = 'bg-amber-50 text-amber-700 border border-amber-100';
                    } else if (diffMs <= 12 * 3600000) {
                        tone = 'bg-sky-50 text-sky-700 border border-sky-100';
                    }
                    return {
                        tone,
                        relative: formatRelativeTime(pickupDateTime),
                        absolute: formatDateLabel(pickupDateTime)
                    };
                })();

                const returnMeta = (() => {
                    if (!returnDateTime) return null;
                    const diffMs = returnDateTime.getTime() - now.getTime();
                    let tone = 'text-gray-500';
                    if (diffMs < 0) {
                        tone = 'text-rose-600';
                    } else if (diffMs <= 6 * 3600000) {
                        tone = 'text-amber-600';
                    }
                    return {
                        tone,
                        relative: formatRelativeTime(returnDateTime),
                        absolute: formatDateLabel(returnDateTime)
                    };
                })();

                const depositInvoice = invoices.find(inv => normalizeStatus(inv.label || '').includes('deposit'))
                    || invoices.find(inv => normalizeStatus(inv.description || '').includes('deposit'));
                const depositStatus = depositInvoice?.status || (booking.deposit ? 'Not captured' : '—');
                const depositClass = normalizeStatus(depositStatus) === 'authorized'
                    ? 'text-emerald-600'
                    : overdueInvoices.includes(depositInvoice) ? 'text-rose-600' : 'text-gray-700';

                const paymentAlerts = [];
                if (overdueInvoices.length) {
                    paymentAlerts.push(`<li class="flex items-start gap-2"><span class="mt-1 h-2 w-2 rounded-full bg-rose-500"></span><span class="text-xs text-rose-600">${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? '' : 's'} overdue</span></li>`);
                }
                if (dueSoonInvoices.length) {
                    paymentAlerts.push(`<li class="flex items-start gap-2"><span class="mt-1 h-2 w-2 rounded-full bg-amber-500"></span><span class="text-xs text-amber-600">${dueSoonInvoices.length} invoice${dueSoonInvoices.length === 1 ? '' : 's'} due within 3 days</span></li>`);
                }
                if (!paymentAlerts.length) {
                    paymentAlerts.push('<li class="text-xs text-emerald-600">No payment alerts</li>');
                }

                const historyEntries = Array.isArray(booking.history) ? [...booking.history] : [];
                const historyEvents = new Set(historyEntries.map(entry => entry.event));
                const ensureHistoryEntry = (event, tsFallback) => {
                    if (!event || historyEvents.has(event)) return;
                    historyEntries.push({
                        event,
                        ts: tsFallback || '—'
                    });
                    historyEvents.add(event);
                };

                if (booking.documents && booking.documents.length) {
                    ensureHistoryEntry('Documents received', booking.history?.[0]?.ts || booking.startDate || '—');
                }

                if (booking.deposit) {
                    ensureHistoryEntry(`Deposit received ${formatAed(booking.deposit)}`, booking.startDate || '—');
                }

                if (assignedDriver) {
                    const existingDriverEntry = historyEntries.find(item => typeof item.event === 'string' && item.event.toLowerCase().includes('driver'));
                    const existingDriverTs = existingDriverEntry?.ts;
                    ensureHistoryEntry(`Driver ${assignedDriver.name} assigned`, existingDriverTs || booking.startDate || '—');
                }

                const enrichHistoryEntry = (entry) => {
                    const ts = parseLooseDateTime(entry.ts);
                    const relative = formatRelativeTime(ts);
                    const absolute = entry.ts && entry.ts !== '—' ? entry.ts : (ts ? formatDateLabel(ts) : '—');
                    const tone = ts && ts.getTime() > now.getTime() ? 'text-sky-600' : 'text-gray-500';
                    return {
                        event: entry.event,
                        absolute,
                        relative,
                        tone
                    };
                };

                const sortedHistoryEntries = historyEntries.slice().sort((a, b) => {
                    const aDate = parseLooseDateTime(a.ts) || new Date(0);
                    const bDate = parseLooseDateTime(b.ts) || new Date(0);
                    return bDate - aDate;
                });

                const bookingHistoryHtml = sortedHistoryEntries.length
                    ? sortedHistoryEntries.map(entry => {
                        const enriched = enrichHistoryEntry(entry);
                        const relativePart = enriched.relative ? `<span class="ml-1 text-[11px] text-gray-400">(${escapeHtml(enriched.relative)})</span>` : '';
                        return `
                            <li class="flex items-start gap-2 rounded-lg border border-gray-200/60 px-3 py-2">
                                <span class="mt-1 text-emerald-500">${getIcon('check', 'w-4 h-4')}</span>
                                <div>
                                    <p class="text-sm font-medium text-gray-800">${escapeHtml(enriched.event)}</p>
                                    <p class="text-xs ${enriched.tone}">${escapeHtml(enriched.absolute)}${relativePart}</p>
                                </div>
                            </li>
                        `;
                    }).join('')
                    : '<li class="text-sm text-gray-500">No history records</li>';

                const relatedTasks = (MOCK_DATA.tasks || []).filter(task => Number(task.bookingId) === Number(booking.id));
                const taskStatusMeta = {
                    todo: { label: 'To do', badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200' },
                    inprogress: { label: 'In progress', badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200' },
                    done: { label: 'Completed', badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200' }
                };

                const getTaskDeadlineMeta = (deadlineValue) => {
                    const deadlineDate = parseLooseDateTime(deadlineValue);
                    if (!deadlineDate) {
                        return { label: 'Deadline not set', tone: 'text-gray-500' };
                    }
                    const relative = formatRelativeTime(deadlineDate);
                    let tone = 'text-gray-600';
                    if (deadlineDate.getTime() < now.getTime()) {
                        tone = 'text-rose-600';
                    } else if (deadlineDate.getTime() - now.getTime() <= 6 * 3600000) {
                        tone = 'text-amber-600';
                    }
                    return { label: `${formatDateLabel(deadlineDate)} (${relative || 'upcoming'})`, tone };
                };

                const bookingTasksContent = relatedTasks.length
                    ? `<div class="grid gap-3">
                            ${relatedTasks.map(task => {
                                const assignee = task.assigneeId
                                    ? MOCK_DATA.drivers.find(d => Number(d.id) === Number(task.assigneeId))
                                    : null;
                                const statusMeta = taskStatusMeta[task.status] || {
                                    label: task.status ? `${task.status.charAt(0).toUpperCase()}${task.status.slice(1)}` : 'Unknown',
                                    badgeClass: 'bg-gray-100 text-gray-600 border border-gray-200'
                                };
                                const deadlineMeta = getTaskDeadlineMeta(task.deadline);
                                const initials = assignee ? assignee.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() : '';
                                const assigneeBlock = assignee ? `<div class="flex items-center justify-between gap-2 text-xs text-gray-600"><span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-gray-700">${escapeHtml(initials)}</span><span class="font-medium">${escapeHtml(assignee.name)}</span></div>` : '';
                                return `
                                    <article class="space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                                        <div class="flex items-start justify-between gap-3">
                                            <p class="text-sm font-semibold text-gray-900 leading-snug">${escapeHtml(task.title || 'Task')}</p>
                                            <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${statusMeta.badgeClass}">${escapeHtml(statusMeta.label)}</span>
                                        </div>
                                        <dl class="space-y-2 text-xs text-gray-500">
                                            <div class="flex items-start justify-between gap-2">
                                                <dt class="font-medium text-gray-600">Deadline</dt>
                                                <dd class="text-right ${deadlineMeta.tone}">${escapeHtml(deadlineMeta.label)}</dd>
                                            </div>
                                            ${assigneeBlock}
                                        </dl>
                                    </article>
                                `;
                            }).join('')}
                       </div>`
                    : '<p class="text-sm text-gray-500">No tasks linked to this booking</p>';

                const timelineStatusLabels = {
                    preparation: 'Preparation',
                    delivery: 'Delivery',
                    inspection: 'Inspection',
                    default: 'Update'
                };

                const timelineStatusClasses = {
                    preparation: 'border-amber-200 bg-amber-50 text-amber-700',
                    delivery: 'border-sky-200 bg-sky-50 text-sky-700',
                    inspection: 'border-indigo-200 bg-indigo-50 text-indigo-700',
                    default: 'border-gray-200 bg-gray-50 text-gray-600'
                };

                const operationalTimeline = timelineItems.length
                    ? `<ul class="space-y-2">
                            ${timelineItems.map(item => {
                                const entryTs = parseLooseDateTime(item.ts);
                                const labelKey = normalizeStatus(item.status);
                                const badgeClass = timelineStatusClasses[labelKey] || timelineStatusClasses.default;
                                const label = timelineStatusLabels[labelKey] || timelineStatusLabels.default;
                                const relative = formatRelativeTime(entryTs);
                                return `
                                    <li class="flex items-start justify-between gap-3 rounded-lg border border-dashed px-3 py-2">
                                        <div>
                                            <span class="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${badgeClass}">${escapeHtml(label)}</span>
                                            ${item.note ? `<p class="mt-1 text-sm text-gray-700">${escapeHtml(item.note)}</p>` : ''}
                                        </div>
                                        <div class="text-right text-xs text-gray-500">
                                            ${relative ? `<p>${escapeHtml(relative)}</p>` : ''}
                                            ${entryTs ? `<p class="opacity-80">${escapeHtml(formatDateLabel(entryTs))}</p>` : ''}
                                            ${item.actor ? `<p class="mt-1 font-medium text-gray-600">${escapeHtml(item.actor)}</p>` : ''}
                                        </div>
                                    </li>
                                `;
                            }).join('')}
                        </ul>`
                    : '';

                const pickupMileageValue = formatMileageValue(booking.pickupMileage ?? booking.mileageAtPickup);
                const pickupFuelValue = formatFuelValue(booking.pickupFuel ?? booking.fuelLevelAtPickup);
                const returnMileageValue = formatMileageValue(booking.returnMileage ?? booking.mileage ?? booking.mileageAtReturn);
                const returnFuelValue = formatFuelValue(booking.returnFuel ?? booking.fuelLevel ?? booking.fuelLevelAtReturn);

                const bookingInvoices = Array.isArray(booking.invoices) ? booking.invoices : [];
                const invoicesTable = bookingInvoices.length
                    ? `
                        <div class="overflow-x-auto">
                            <table class="min-w-full text-sm text-gray-600 border border-gray-200 rounded-lg overflow-hidden">
                                <thead class="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                                    <tr>
                                        <th class="px-3 py-2 text-left">Invoice</th>
                                        <th class="px-3 py-2 text-left">Description</th>
                                        <th class="px-3 py-2 text-right">Amount</th>
                                        <th class="px-3 py-2 text-left">Status</th>
                                        <th class="px-3 py-2 text-left">Issued</th>
                                        <th class="px-3 py-2 text-left">Due</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${bookingInvoices.map(invoice => `
                                        <tr>
                                            <td class="px-3 py-2 font-medium text-gray-900">${escapeHtml(invoice.id || '—')}</td>
                                            <td class="px-3 py-2">${escapeHtml(invoice.label || '—')}</td>
                                            <td class="px-3 py-2 text-right">${formatAed(invoice.amount)}</td>
                                            <td class="px-3 py-2">
                                                <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700">
                                                    ${escapeHtml(invoice.status || '—')}
                                                </span>
                                            </td>
                                            <td class="px-3 py-2">${escapeHtml(invoice.issuedDate || '—')}</td>
                                            <td class="px-3 py-2">${escapeHtml(invoice.dueDate || '—')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `
                    : '<p class="text-sm text-gray-500">Инвойсы отсутствуют</p>';

                const bookingIdentifier = escapeHtml(booking.code || `#${booking.id || ''}`);

                const documentButtons = Array.isArray(booking.documents) && booking.documents.length
                    ? booking.documents.map(doc => {
                        const thumb = typeof doc === 'string' ? doc : doc.url;
                        const label = typeof doc === 'string' ? 'Document' : (doc.name || doc.type || 'Document');
                        if (!thumb) {
                            return `<span class="inline-flex items-center px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-600 border border-gray-200">${escapeHtml(label)}</span>`;
                        }
                        return `
                            <button class="doc-image relative group">
                                <img src="${thumb}" alt="Document preview" class="w-28 h-20 object-cover rounded-md border border-gray-200">
                                <span class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">${escapeHtml(label)}</span>
                            </button>
                        `;
                    }).join('')
                    : '<p class="text-xs text-gray-500">No documents uploaded</p>';

                content = `
                    <div class="p-6 border-b bg-slate-50/40">
                        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div class="space-y-3">
                                <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-md bg-white text-gray-700 border border-gray-200">Booking ${bookingIdentifier}</span>
                                </div>
                                <h2 class="text-2xl font-semibold text-gray-900">${escapeHtml(booking.carName)}</h2>
                                <p class="text-sm text-gray-500">${escapeHtml(client.name || booking.clientName)}</p>
                            </div>
                            <div class="space-y-3 text-right">
                                <div>
                                    <p class="text-xs uppercase tracking-wide text-gray-500">Outstanding</p>
                                    <p class="text-2xl font-semibold ${dueAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}">${formatAed(dueAmount)}</p>
                                    <p class="text-xs text-gray-500">Paid ${formatAed(booking.paidAmount)}</p>
                                </div>
                                ${pickupMeta ? `<div class="inline-flex max-w-xs flex-wrap items-center justify-end gap-2 rounded-lg px-3 py-2 text-xs font-medium ${pickupMeta.tone}"><span>Pickup ${escapeHtml(pickupMeta.relative || '')}</span><span class="text-[11px] opacity-70">${escapeHtml(pickupMeta.absolute)}</span></div>` : ''}
                            </div>
                        </div>
                        <div class="mt-5 border-t border-slate-200 pt-4 overflow-x-auto">${stageProgressHtml}</div>
                    </div>
                    <div class="p-6 space-y-6">
                        <div class="space-y-6 max-w-5xl mx-auto">
                            <div class="grid gap-6 lg:grid-cols-3">
                                <div class="lg:col-span-2 space-y-6">
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl">
                                        <h3 class="font-semibold text-gray-800 mb-4">Timeline & logistics</h3>
                                        <div class="grid gap-4 md:grid-cols-2 text-sm text-gray-600">
                                            <div>
                                                <p class="font-semibold text-gray-500">Pickup</p>
                                                <p class="mt-1 text-gray-900">${formatDateTime(booking.startDate, booking.startTime)}</p>
                                                ${pickupMeta ? `<p class="text-xs text-gray-500">${escapeHtml(pickupMeta.relative || '')}</p>` : ''}
                                                <p class="mt-2 flex items-center gap-2">${getIcon('mapPin', 'w-4 h-4 text-gray-400')}${formatLocationLink(booking.pickupLocation)}</p>
                                                <div class="mt-3 space-y-1 text-xs text-gray-500">
                                                    <div class="flex items-center justify-between">
                                                        <span>Mileage</span>
                                                        <span class="text-gray-900">${pickupMileageValue}</span>
                                                    </div>
                                                    <div class="flex items-center justify-between">
                                                        <span>Fuel</span>
                                                        <span class="text-gray-900">${pickupFuelValue}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p class="font-semibold text-gray-500">Return</p>
                                                <p class="mt-1 text-gray-900">${formatDateTime(booking.endDate, booking.endTime)}</p>
                                                ${returnMeta ? `<p class="text-xs ${returnMeta.tone}">${escapeHtml(returnMeta.relative || '')}</p>` : ''}
                                                <p class="mt-2 flex items-center gap-2">${getIcon('mapPin', 'w-4 h-4 text-gray-400')}${formatLocationLink(booking.dropoffLocation)}</p>
                                                <div class="mt-3 space-y-1 text-xs text-gray-500">
                                                    <div class="flex items-center justify-between">
                                                        <span>Mileage</span>
                                                        <span class="text-gray-900">${returnMileageValue}</span>
                                                    </div>
                                                    <div class="flex items-center justify-between">
                                                        <span>Fuel</span>
                                                        <span class="text-gray-900">${returnFuelValue}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="mt-5 space-y-3">
                                            ${operationalTimeline}
                                        </div>
                                    </div>
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl">
                                        <h3 class="font-semibold text-gray-800 mb-4">Documents</h3>
                                        <div class="flex flex-wrap gap-3">${documentButtons}</div>
                                    </div>
                                </div>
                                <div class="space-y-6">
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl">
                                        <div class="flex items-center justify-between mb-3 gap-3">
                                            <h3 class="font-semibold text-gray-800">Client</h3>
                                            ${clientDetailLink}
                                        </div>
                                        <div class="space-y-4 text-sm text-gray-600">
                                            <div class="flex flex-wrap items-start gap-3">
                                                <div>
                                                    <p class="text-base font-semibold text-gray-900">${escapeHtml(client.name || booking.clientName)}</p>
                                                    <p class="text-sm text-gray-500">${escapeHtml(client.email || booking.clientEmail || '—')} · ${escapeHtml(client.phone || booking.clientPhone || '—')}</p>
                                                    <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                                                        <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-slate-600 border border-slate-200">Segment: ${escapeHtml(client.segment || booking.segment || '—')}</span>
                                                        <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-slate-600 border border-slate-200">Channel: ${escapeHtml(booking.channel || '—')}</span>
                                                        <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-slate-600 border border-slate-200">Status: ${escapeHtml(client.status || '—')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="flex flex-wrap gap-2 text-xs">
                                                <a class="geist-button geist-button-secondary text-xs" href="tel:${client.phone || booking.clientPhone || ''}">Call</a>
                                                <a class="geist-button geist-button-secondary text-xs" href="mailto:${client.email || booking.clientEmail || ''}">Email</a>
                                                ${client.preferences?.notifications?.includes('whatsapp') ? `<a class="geist-button geist-button-secondary text-xs" href="https://wa.me/${(client.phone || '').replace(/[^0-9]/g, '')}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                                            </div>
                                            <div class="grid gap-2 text-xs">
                                                <div class="space-y-1">
                                                    <p class="font-medium text-gray-600">Lifetime value</p>
                                                    <p class="text-sm text-gray-900">${formatAed(client.lifetimeValue || client.turnover || 0)}</p>
                                                    <p class="text-xs text-gray-500">Outstanding: ${formatAed(client.outstanding || 0)}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p class="text-xs font-medium text-gray-500">Responsible manager</p>
                                                <p class="text-sm text-gray-900">${escapeHtml(responsibleSalesPerson)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl">
                                        <h3 class="font-semibold text-gray-800 mb-3">Payments</h3>
                                        <div class="space-y-4 text-sm text-gray-600">
                                            <div class="grid gap-2 sm:grid-cols-3">
                                                <div class="rounded-lg border border-gray-200 px-3 py-2">
                                                    <p class="text-xs uppercase tracking-wide text-gray-500">Paid</p>
                                                    <p class="text-base font-semibold text-gray-900 mt-1">${formatAed(booking.paidAmount)}</p>
                                                </div>
                                                <div class="rounded-lg border border-gray-200 px-3 py-2">
                                                    <p class="text-xs uppercase tracking-wide text-gray-500">Outstanding</p>
                                                    <p class="text-base font-semibold ${dueAmount > 0 ? 'text-amber-600' : 'text-emerald-600'} mt-1">${formatAed(dueAmount)}</p>
                                                </div>
                                                <div class="rounded-lg border border-gray-200 px-3 py-2">
                                                    <p class="text-xs uppercase tracking-wide text-gray-500">Deposit</p>
                                                    <p class="text-base font-semibold text-gray-900 mt-1">${formatAed(booking.deposit)}</p>
                                                    <p class="text-[11px] ${depositClass}">${escapeHtml(depositStatus)}</p>
                                                </div>
                                            </div>
                                            <div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2">
                                                <p class="text-xs font-medium text-gray-600">Alerts</p>
                                                <ul class="mt-2 space-y-1">
                                                    ${paymentAlerts.join('')}
                                                </ul>
                                            </div>
                                            <div class="pt-3 border-t">
                                                <h4 class="font-medium text-sm text-gray-700 mb-2">Invoices</h4>
                                                ${invoicesTable}
                                            </div>
                                            <div class="pt-3 border-t">
                                                <h4 class="font-medium text-sm text-gray-700 mb-2">Generate payment link</h4>
                                                <div class="space-y-3">
                                                    <input type="number" value="${Math.max(dueAmount, 0)}" placeholder="Amount" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md stripe-amount-input">
                                                    <select class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md stripe-reason-select">
                                                        <option>Rental top-up</option>
                                                        <option>Extension</option>
                                                        <option>Additional mileage</option>
                                                    </select>
                                                    <button type="button" class="w-full geist-button geist-button-secondary text-sm generate-stripe-link" data-booking-id="${booking.id}">Create Stripe link</button>
                                                    <div id="stripe-link-result" class="hidden space-y-2">
                                                        <div class="flex items-center justify-between bg-gray-100 rounded-md px-3 py-2 gap-3">
                                                            <a id="stripe-link-anchor" href="#" target="_blank" rel="noopener" class="text-blue-600 hover:underline break-all flex-1">—</a>
                                                            <button type="button" class="copy-stripe-link p-2 text-gray-500 hover:text-black rounded-md" title="Copy link">${getIcon('copy', 'w-4 h-4')}</button>
                                                        </div>
                                                        <p id="stripe-copy-feedback" class="text-xs text-emerald-600 hidden">Link copied</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl">
                                        <h3 class="font-semibold text-gray-800 mb-4">Tasks</h3>
                                        ${bookingTasksContent}
                                    </div>
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl">
                                        <h3 class="font-semibold text-gray-800 mb-3">History</h3>
                                        <ul class="space-y-3">
                                            ${bookingHistoryHtml}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;

            } else if (type === 'fleet-table') {
                 const car = MOCK_DATA.cars.find(c => c.id == id);
                 if (!car || !fleetDetailContent) return false;
                 targetContainer = fleetDetailContent;

                 const statusTone = {
                     Available: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                     'In Rent': 'bg-blue-50 text-blue-700 border border-blue-100',
                     Maintenance: 'bg-amber-50 text-amber-700 border border-amber-100'
                 };
                 const badgeClass = statusTone[car.status] || 'bg-gray-100 text-gray-600 border border-gray-200';
                 const service = car.serviceStatus || {};
                 const rawHealth = Math.round((service.health ?? 0) * 100);
                 const healthPercent = Number.isFinite(rawHealth) ? Math.min(Math.max(rawHealth, 0), 100) : 0;
                 const healthClass = healthPercent >= 80 ? 'bg-emerald-500' : healthPercent >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                 const mileageToService = service.mileageToService != null
                     ? `${Number(service.mileageToService).toLocaleString('en-US')} km`
                     : '—';
                 const utilizationPercent = Math.round((car.utilization ?? 0) * 100);
                 const mileageLabel = car.mileage != null
                     ? `${Number(car.mileage).toLocaleString('en-US')} km`
                     : '—';
                 let heroImage = '';
                 if (typeof car.imageUrl === 'string') {
                     if (car.imageUrl.includes('100/60')) {
                         heroImage = car.imageUrl.replace('100/60', '400/240');
                     } else if (car.imageUrl.includes('100x60')) {
                         heroImage = car.imageUrl.replace('100x60', '400x240');
                     } else {
                         heroImage = car.imageUrl;
                     }
                 }
                 const reminders = Array.isArray(car.reminders) ? car.reminders : [];
                 const reminderTone = {
                     critical: 'bg-rose-50 text-rose-700 border border-rose-100',
                     warning: 'bg-amber-50 text-amber-700 border border-amber-100',
                     scheduled: 'bg-slate-50 text-slate-700 border border-slate-100'
                 };
                 const remindersHtml = reminders.length
                     ? reminders.map(reminder => {
                         const tone = reminderTone[reminder.status] || 'bg-gray-100 text-gray-600 border border-gray-200';
                         const label = reminder.type ? reminder.type.replace(/-/g, ' ') : 'Reminder';
                         return `
                             <li class="flex items-center justify-between gap-3 text-sm">
                                 <div>
                                     <p class="font-medium text-gray-900">${escapeHtml(label)}</p>
                                     <p class="text-xs text-gray-500">Due ${escapeHtml(reminder.dueDate || '—')}</p>
                                 </div>
                                 <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${tone}">${escapeHtml(reminder.status || 'scheduled')}</span>
                             </li>
                         `;
                     }).join('')
                     : '<p class="text-sm text-gray-500">No active reminders</p>';

                 const maintenanceHistory = Array.isArray(car.maintenanceHistory) ? [...car.maintenanceHistory] : [];
                 maintenanceHistory.sort((a, b) => {
                     const dateA = new Date(a.date || 0).getTime();
                     const dateB = new Date(b.date || 0).getTime();
                     return dateB - dateA;
                 });
                 const maintenanceHistoryHtml = maintenanceHistory.length
                     ? maintenanceHistory.map(item => `
                         <li class="flex flex-col gap-1 rounded-md border border-gray-200 px-3 py-2 text-sm">
                             <div class="flex items-center justify-between text-gray-700">
                                 <span class="font-medium">${escapeHtml(item.type || 'Maintenance')}</span>
                                 <span class="text-xs text-gray-500">${escapeHtml(item.date || '—')}</span>
                             </div>
                             <div class="flex items-center justify-between text-xs text-gray-500">
                                 <span>Odometer</span>
                                 <span>${item.odometer != null ? `${Number(item.odometer).toLocaleString('en-US')} km` : '—'}</span>
                             </div>
                             ${item.notes ? `<p class="text-xs text-gray-500">${escapeHtml(item.notes)}</p>` : ''}
                         </li>
                     `).join('')
                     : '<p class="text-sm text-gray-500">No maintenance history</p>';

                 const documents = Array.isArray(car.documents) ? car.documents : [];
                 const documentStatusTone = {
                     active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                     warning: 'bg-amber-50 text-amber-700 border border-amber-100',
                     expired: 'bg-rose-50 text-rose-700 border border-rose-100',
                     'needs-review': 'bg-amber-50 text-amber-700 border border-amber-100'
                 };
                 const documentStatusLabel = {
                     active: 'Active',
                     warning: 'Warning',
                     expired: 'Expired',
                     'needs-review': 'Needs review'
                 };
                 const documentStatusHtml = documents.length
                     ? documents.map(doc => {
                         const tone = documentStatusTone[doc.status] || 'bg-gray-100 text-gray-600 border border-gray-200';
                         const statusLabel = documentStatusLabel[doc.status] || (doc.status ? doc.status : 'Status');
                         return `
                             <li class="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm">
                                 <div>
                                     <p class="font-medium text-gray-900">${escapeHtml(doc.name || doc.type || 'Document')}</p>
                                     <p class="text-xs text-gray-500">${doc.expiry ? `Expires ${escapeHtml(doc.expiry)}` : 'No expiry date'}</p>
                                 </div>
                                 <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${tone}">${escapeHtml(statusLabel)}</span>
                             </li>
                         `;
                     }).join('')
                     : '<p class="text-sm text-gray-500">No documents uploaded</p>';

                 const documentGallery = Array.isArray(car.documentGallery) ? car.documentGallery : [];
                 const documentGalleryHtml = documentGallery.length
                     ? documentGallery.map(url => `
                         <img src="${escapeHtml(url)}" class="rounded-md cursor-pointer doc-image w-full h-36 object-cover" alt="Vehicle document">
                     `).join('')
                     : '';

                 const inspections = Array.isArray(car.inspections) ? car.inspections : [];
                 const inspectionsHtml = inspections.length
                     ? inspections.map(insp => `
                         <li class="rounded-md border border-gray-200 p-3 text-sm">
                             <div class="flex items-center justify-between text-gray-700">
                                 <span class="font-medium">${escapeHtml(insp.date || '—')}</span>
                                 <span class="text-xs text-gray-500">${escapeHtml(insp.driver || '—')}</span>
                             </div>
                             ${insp.notes ? `<p class="mt-2 text-xs text-gray-500">${escapeHtml(insp.notes)}</p>` : ''}
                             ${Array.isArray(insp.photos) && insp.photos.length ? `
                                 <div class="mt-3 grid grid-cols-3 gap-2">
                                     ${insp.photos.map(photo => `<img src="${escapeHtml(photo)}" class="h-16 w-full rounded object-cover doc-image" alt="Inspection photo">`).join('')}
                                 </div>
                             ` : ''}
                         </li>
                     `).join('')
                     : '<p class="text-sm text-gray-500">No inspections recorded</p>';

                 const relevantBookings = (MOCK_DATA.bookings || []).filter(booking => Number(booking.carId) === Number(car.id));
                 const parseBookingDate = (date, time) => {
                     if (!date) return null;
                     const safeTime = time && time.length === 5 ? `${time}:00` : (time || '00:00:00');
                     const parsed = new Date(`${date}T${safeTime}`);
                     return Number.isNaN(parsed.getTime()) ? null : parsed;
                 };
                 const formatBookingDate = (dateObj) => {
                     if (!dateObj) return '—';
                     return dateObj.toLocaleString('en-GB', {
                         day: '2-digit',
                         month: 'short',
                         hour: '2-digit',
                         minute: '2-digit'
                     });
                 };
                 const now = new Date();
                 const upcomingBookings = relevantBookings
                     .map(booking => ({ booking, start: parseBookingDate(booking.startDate, booking.startTime) }))
                     .filter(item => item.start && item.start >= now)
                     .sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));
                 const nextBooking = upcomingBookings.length ? upcomingBookings[0].booking : null;
                 const activeStatuses = ['delivery', 'in-rent', 'settlement', 'return'];
                 const activeBooking = relevantBookings.find(booking => activeStatuses.includes(String(booking.status || '').toLowerCase()));
                 const pastBookings = relevantBookings
                     .map(booking => ({ booking, end: parseBookingDate(booking.endDate, booking.endTime) }))
                     .filter(item => item.end && item.end < now)
                     .sort((a, b) => (b.end?.getTime() || 0) - (a.end?.getTime() || 0));
                 const lastBooking = pastBookings.length ? pastBookings[0].booking : null;

                 const buildBookingCard = (label, booking) => {
                     if (!booking) return '';
                     const start = parseBookingDate(booking.startDate, booking.startTime);
                     const end = parseBookingDate(booking.endDate, booking.endTime);
                     const driver = booking.driverId
                         ? MOCK_DATA.drivers.find(d => Number(d.id) === Number(booking.driverId))
                         : null;
                     const driverLabel = driver ? driver.name : 'Unassigned';
                     const statusLabel = (booking.status || '').replace(/-/g, ' ') || '—';
                     return `
                         <li class="rounded-lg border border-gray-200 p-3">
                             <div class="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                                 <span>${escapeHtml(label)}</span>
                                 <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700">${escapeHtml(statusLabel)}</span>
                             </div>
                             <div class="mt-2 space-y-1 text-sm text-gray-700">
                                 <p class="font-medium text-gray-900">${escapeHtml(booking.clientName || 'Client')}</p>
                                 <p>${formatBookingDate(start)} → ${formatBookingDate(end)}</p>
                                 <p class="text-xs text-gray-500">Driver: ${escapeHtml(driverLabel || 'Unassigned')}</p>
                             </div>
                             <div class="mt-3 flex items-center justify-between text-xs text-blue-600">
                                 <a class="hover:underline" href="${buildHash(appState.currentRole, 'booking-detail', booking.id)}">Open booking</a>
                                 <span>#${escapeHtml(String(booking.code || booking.id || ''))}</span>
                             </div>
                         </li>
                     `;
                 };

                 const bookingCards = [
                     activeBooking ? buildBookingCard('In progress', activeBooking) : '',
                     nextBooking && (!activeBooking || nextBooking.id !== activeBooking.id) ? buildBookingCard('Next booking', nextBooking) : '',
                     lastBooking ? buildBookingCard('Last booking', lastBooking) : ''
                 ].filter(Boolean).join('');

                 const bookingsHtml = bookingCards || '<p class="text-sm text-gray-500">No related bookings yet</p>';
                 const gallerySection = documentGalleryHtml
                     ? `<div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">${documentGalleryHtml}</div>`
                     : '';

                 content = `
                    <div class="p-6 border-b bg-white">
                        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 class="text-2xl font-semibold text-gray-900">${escapeHtml(car.name)}</h2>
                                <div class="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                    <span>${escapeHtml(car.plate || '—')}</span>
                                    <span>·</span>
                                    <span>${escapeHtml(String(car.year || '—'))}</span>
                                    <span>·</span>
                                    <span>${escapeHtml(car.color || '—')}</span>
                                </div>
                            </div>
                            <div class="flex flex-wrap items-center gap-3">
                                <span class="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md ${badgeClass}">${escapeHtml(car.status || '—')}</span>
                                <div class="text-xs text-gray-500">
                                    <p>Class: ${escapeHtml(car.class || '—')}</p>
                                    <p>Segment: ${escapeHtml(car.segment || '—')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 space-y-6 bg-white">
                        <div class="grid gap-6 lg:grid-cols-3">
                            <div class="geist-card overflow-hidden lg:col-span-2">
                                <img src="${escapeHtml(heroImage)}" class="h-56 w-full object-cover" alt="${escapeHtml(car.name)}">
                                <div class="p-5 space-y-5">
                                    <div class="grid gap-4 sm:grid-cols-2">
                                        <div class="space-y-3">
                                            <h3 class="font-semibold text-gray-900">Readiness</h3>
                                            <div class="flex items-center justify-between text-sm text-gray-700">
                                                <span>${escapeHtml(service.label || '—')}</span>
                                                ${service.nextService ? `<span class="text-xs text-gray-500">Next service ${escapeHtml(service.nextService)}</span>` : ''}
                                            </div>
                                            <div class="w-full rounded-full bg-gray-200 h-2">
                                                <div class="h-2 rounded-full ${healthClass}" style="width: ${healthPercent}%"></div>
                                            </div>
                                            <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span>Technical readiness ${healthPercent}%</span>
                                                <span>·</span>
                                                <span>Mileage to service ${escapeHtml(mileageToService)}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 class="font-semibold text-gray-900">Reminders</h3>
                                            <ul class="mt-3 space-y-2">
                                                ${remindersHtml}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="geist-card p-5 space-y-4">
                                <div>
                                    <h3 class="font-semibold text-gray-900">Quick actions</h3>
                                    <div class="mt-3 flex flex-wrap gap-2">
                                        <button class="geist-button geist-button-secondary text-xs fleet-quick-action" data-action="maintenance" data-car-id="${car.id}">Schedule maintenance</button>
                                        <button class="geist-button geist-button-secondary text-xs fleet-quick-action" data-action="inspection" data-car-id="${car.id}">Log inspection</button>
                                        <button class="geist-button geist-button-secondary text-xs fleet-quick-action" data-action="detailing" data-car-id="${car.id}">Plan detailing</button>
                                        <button class="geist-button geist-button-secondary text-xs fleet-quick-action" data-action="fines" data-car-id="${car.id}">Check fines</button>
                                    </div>
                                </div>
                                <div>
                                    <h3 class="font-semibold text-gray-900">Vehicle KPIs</h3>
                                    <dl class="mt-3 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <dt class="text-xs uppercase tracking-wide text-gray-500">Utilization</dt>
                                            <dd class="font-semibold text-gray-900">${utilizationPercent}%</dd>
                                        </div>
                                        <div>
                                            <dt class="text-xs uppercase tracking-wide text-gray-500">Mileage</dt>
                                            <dd class="font-semibold text-gray-900">${escapeHtml(mileageLabel)}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-xs uppercase tracking-wide text-gray-500">Revenue YTD</dt>
                                            <dd class="font-semibold text-gray-900">${formatCurrency(car.revenueYTD || 0)}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-xs uppercase tracking-wide text-gray-500">Insurance</dt>
                                            <dd class="font-semibold text-gray-900">${escapeHtml(car.insuranceExpiry || '—')}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div class="grid gap-6 lg:grid-cols-2">
                            <div class="geist-card p-5 space-y-4">
                                <div>
                                    <h3 class="font-semibold text-gray-900">Bookings</h3>
                                    <p class="text-sm text-gray-500">Upcoming and recent activity for this vehicle</p>
                                </div>
                                <ul class="space-y-3">
                                    ${bookingsHtml}
                                </ul>
                            </div>
                            <div class="geist-card p-5 space-y-4">
                                <div>
                                    <h3 class="font-semibold text-gray-900">Maintenance & reminders</h3>
                                    <p class="text-sm text-gray-500">Service log with odometer readings</p>
                                </div>
                                <ul class="space-y-3">
                                    ${maintenanceHistoryHtml}
                                </ul>
                            </div>
                        </div>
                        <div class="grid gap-6 lg:grid-cols-2">
                            <div class="geist-card p-5 space-y-4">
                                <div>
                                    <h3 class="font-semibold text-gray-900">Documents</h3>
                                    <p class="text-sm text-gray-500">Expiry control and quick access</p>
                                </div>
                                <ul class="space-y-2">
                                    ${documentStatusHtml}
                                </ul>
                                ${gallerySection}
                            </div>
                            <div class="geist-card p-5 space-y-4">
                                <div>
                                    <h3 class="font-semibold text-gray-900">Inspection history</h3>
                                    <p class="text-sm text-gray-500">Highlights from recent checks</p>
                                </div>
                                <ul class="space-y-3">
                                    ${inspectionsHtml}
                                </ul>
                            </div>
                        </div>
                    </div>`;
            } else if (type === 'clients-table') {
                const client = MOCK_DATA.clients.find(c => c.id == id);
                if (!client || !clientDetailContent) return false;
                targetContainer = clientDetailContent;

                const pipeline = MOCK_DATA.salesPipeline || {};
                const leads = Array.isArray(pipeline.leads) ? pipeline.leads : [];
                const lead = leads.find(item => Number(item.clientId) === Number(client.id)) || null;
                const workspaceDetails = MOCK_DATA.salesWorkspace?.leadDetails || {};
                const detail = lead ? workspaceDetails[lead.id] || null : null;

                const clientCardHtml = renderClientCard(lead, client, detail);
                const leadContext = lead
                    ? `<p class="text-xs text-gray-500 mt-1">Active deal: ${lead.id} · ${lead.title}</p>`
                    : '';

                content = `
                    <div class="p-6 border-b">
                        <h2 class="text-xl font-semibold">${client.name}</h2>
                        ${leadContext}
                    </div>
                    <div class="p-6 space-y-6">
                        ${clientCardHtml}
                    </div>`;
            }

            if (!content || !targetContainer) return false;

            targetContainer.innerHTML = content;
            return true;
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
                return '<span class="text-xs text-gray-400">Documents not uploaded</span>';
            }
            const statusClasses = {
                active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                'needs-review': 'bg-amber-50 text-amber-700 border border-amber-100',
                warning: 'bg-amber-50 text-amber-700 border border-amber-100',
                expired: 'bg-rose-50 text-rose-700 border border-rose-100'
            };
            return car.documents.map(doc => {
                const cls = statusClasses[doc.status] || 'bg-gray-100 text-gray-600 border border-gray-200';
                const expiry = doc.expiry ? `until ${doc.expiry}` : 'no expiry';
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
                        ${service.nextService ? `<span class="text-xs text-gray-500">Next: ${service.nextService}</span>` : ''}
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full ${healthClass}" style="width: ${healthPercent}%"></div>
                    </div>
                    <p class="text-xs text-gray-500">Technical readiness ${healthPercent}%</p>
                </div>
            `;
        };

        const renderVehicleReminders = (car) => {
            const reminders = car.reminders || [];
            if (!reminders.length) {
                return '<span class="text-xs text-gray-400">No reminders</span>';
            }
            const nextReminder = reminders[0];
            const tone = nextReminder.status === 'critical'
                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                : nextReminder.status === 'warning'
                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                : 'bg-slate-50 text-slate-700 border border-slate-100';
            const label = nextReminder.dueDate ? `due ${nextReminder.dueDate}` : 'no date';
            return `
                <div class="space-y-1">
                    <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${tone}">Next: ${label}</span>
                    <p class="text-xs text-gray-500">Active reminders: ${reminders.length}</p>
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
                const labels = {
                    preparation: 'Prepare vehicle',
                    delivery: 'Deliver to client',
                    settlement: 'Vehicle return'
                };
                const label = labels[task.status] || 'Task';
                const targetTime = new Date(`${task.startDate}T${task.startTime}:00`).getTime();
                const timerHtml = `<div class="card-timer text-xs text-amber-600 flex items-center mt-2" data-target-time="${targetTime}"></div>`;
                const route = task.pickupLocation ? `<p class="text-xs text-gray-500 mt-1">${task.pickupLocation}${task.dropoffLocation ? ' → ' + task.dropoffLocation : ''}</p>` : '';
                return `
                <div class="geist-card p-4 cursor-pointer" data-task-id="${task.id}">
                    <div class="flex justify-between items-start">
                        <div>
                             <p class="font-semibold text-sm text-gray-900">${label}</p>
                             <p class="text-xs text-gray-500">${task.carName}</p>
                            <p class="text-xs text-gray-500">Client: ${task.clientName}</p>
                             ${route}
                        </div>
                        <div class="text-right text-xs text-gray-500">
                             <p>${task.startDate}</p>
                             <p class="text-lg font-bold text-gray-900">${task.startTime}</p>
                        </div>
                    </div>
                    ${timerHtml}
                </div>
            `}).join('') || '<p class="text-center text-gray-500 mt-8">No tasks for today</p>';
            startTimers();
            updateDriverLocationCard();
        };
        
        const renderDriverTaskDetail = (taskId) => {
            const task = MOCK_DATA.bookings.find(b => b.id == taskId);
            const contentEl = driverTaskDetailContent;
            if(!task || !contentEl) return false;
            
            const client = MOCK_DATA.clients.find(c => c.name === task.clientName) || {};
            const dueAmount = (task.totalAmount || 0) - (task.paidAmount || 0);
            const taskLabels = {
                preparation: 'Vehicle preparation',
                delivery: 'Client delivery',
                settlement: 'Vehicle return'
            };
            const taskTitle = taskLabels[task.status] || 'Driver task';
            const connectionBadge = appState.offline.enabled
                ? '<span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-100">Offline</span>'
                : '<span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">Online</span>';

            contentEl.innerHTML = `
                <h2 class="text-2xl font-bold">${taskTitle}: ${task.carName}</h2>
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-semibold text-gray-500">Client</h3>
                            <p class="text-sm text-gray-700 mt-1">${client.name || '—'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            ${connectionBadge}
                            ${client.phone ? `<a href="tel:${client.phone}" class="p-3 bg-gray-100 rounded-full">${getIcon('phone')}</a>` : ''}
                        </div>
                    </div>
                    <div class="geist-card p-4">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Route and navigation</h3>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.dropoffLocation || 'Dubai Marina')}" target="_blank" class="geist-button geist-button-secondary text-xs flex items-center gap-2">
                                ${getIcon('navigation', 'w-4 h-4')}Navigator
                            </a>
                        </div>
                        <p class="text-xs text-gray-500 mt-3">${task.pickupLocation || 'SkyLuxse HQ'} → ${task.dropoffLocation || 'Client address'}</p>
                    </div>
                    <div class="geist-card p-4 space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Readings and condition</h3>
                            <span class="text-xs text-gray-400">Complete before return</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Odometer (km)</label>
                                <input type="number" id="driver-odometer" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. 25450">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Fuel level</label>
                                <select id="driver-fuel" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Select</option>
                                    <option value="full">Full</option>
                                    <option value="3/4">3/4</option>
                                    <option value="1/2">1/2</option>
                                    <option value="1/4">1/4</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Cash collected (AED)</label>
                                <input type="number" id="driver-cash" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="0">
                            </div>
                        </div>
                    </div>
                    <div class="geist-card p-4">
                        <h3 class="font-semibold text-sm text-gray-700">Client documents</h3>
                        <div class="flex flex-wrap gap-2 mt-3 text-sm">
                           ${(client.documents && client.documents.length) ? client.documents.map(doc => `<a href="#" class="px-3 py-1 rounded-md bg-slate-100 text-slate-700 client-doc-link" data-url="${doc.url}">${doc.name}</a>`).join('') : '<span class="text-xs text-gray-400">No documents attached</span>'}
                        </div>
                    </div>
                    <div class="geist-card p-4 space-y-3 text-sm">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Additional services</h3>
                            <span class="text-xs text-gray-400">Select delivered services</span>
                        </div>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="driver-service" data-code="detailing" data-amount="200">
                            Detailing before delivery (+200 AED)
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="driver-service" data-code="fuel" data-amount="150">
                            Refueling (+150 AED)
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" class="driver-service" data-code="toll" data-amount="50">
                            Salik / toll payment (+50 AED)
                        </label>
                    </div>
                    <div class="geist-card p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold text-sm text-gray-700">Fine check</h3>
                            <button type="button" class="geist-button geist-button-secondary text-xs flex items-center gap-2 check-fines-btn" data-booking-id="${task.id}">
                                ${getIcon('search', 'w-4 h-4')}Check
                            </button>
                        </div>
                        <div id="fines-result" class="text-xs text-gray-500">No fine data.</div>
                    </div>
                    <div class="geist-card p-4">
                        <h4 class="font-medium mb-2 text-sm">Payment</h4>
                        <div class="space-y-3">
                            <input type="number" id="payment-amount" value="${dueAmount}" placeholder="Amount" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md">
                            <button id="generate-qr-btn" class="w-full geist-button geist-button-secondary text-sm">Generate payment QR code</button>
                            <div id="qrcode-container" class="flex justify-center p-4 bg-gray-50 rounded-md hidden"></div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <h3 class="font-semibold text-gray-500">Attach photos</h3>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Contract photo</label>
                            <input type="file" accept="image/*" id="contract-photo" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md">
                            <div id="contract-preview" class="mt-2 hidden">
                                <img id="contract-img" class="max-w-full h-32 object-cover rounded-md">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Vehicle photos (up to 4)</label>
                            <input type="file" accept="image/*" multiple id="car-photos" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md">
                            <div id="car-previews" class="grid grid-cols-2 gap-2 mt-2"></div>
                        </div>
                    </div>
                    <div>
                        <label class="flex items-center"><input id="doc-check" type="checkbox" class="h-4 w-4 rounded border-gray-300"> <span class="ml-2 text-sm text-gray-600">Documents verified</span></label>
                    </div>
                    <button id="complete-task-btn" data-booking-id="${task.id}" disabled class="w-full geist-button geist-button-primary mt-4">Complete task</button>
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
                        <img src="${car.imageUrl}" class="w-12 h-8 object-cover rounded-md mx-4">
                        <span class="font-semibold">${car.name}</span>
                    </div>
                    <span class="font-bold text-lg">AED ${((5-index)*2500 + 1000).toLocaleString()}</span>
                </li>
            `).join('');
        }

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

        const escapeHtml = (value) => {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
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
                               </div>`
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
        
        // --- HASH ROUTING ---
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
                    renderCalendar();
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

        initFleetCalendar(router);

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
            const templateClient = templateBooking ? MOCK_DATA.clients.find(client => Number(client.id) === Number(templateBooking.clientId)) : null;
            const templateCar = templateBooking ? MOCK_DATA.cars.find(car => Number(car.id) === Number(templateBooking.carId)) : null;
            const clientOptions = MOCK_DATA.clients.map(client => `
                <option value="${client.id}" ${templateClient && Number(templateClient.id) === Number(client.id) ? 'selected' : ''}>
                    ${client.name}
                </option>
            `).join('');
            const carOptions = MOCK_DATA.cars
                .filter(car => car.status === 'Available' || (templateCar && Number(templateCar.id) === Number(car.id)))
                .map(car => `
                    <option value="${car.id}" ${templateCar && Number(templateCar.id) === Number(car.id) ? 'selected' : ''}>
                        ${car.name}
                    </option>
                `).join('');

            bookingCreateContent.innerHTML = `
                <div class="p-6 border-b">
                    <h2 class="text-xl font-semibold">New booking</h2>
                    <p class="text-sm text-gray-500 mt-1">Fill in booking details to add a new rental</p>
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
                                <input type="date" value="${templateBooking?.startDate || ''}" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="start">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">End date</label>
                                <input type="date" value="${templateBooking?.endDate || ''}" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="end">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 md:col-span-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Start time</label>
                                <input type="time" value="${templateBooking?.startTime || ''}" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="startTime">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">End time</label>
                                <input type="time" value="${templateBooking?.endTime || ''}" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="endTime">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 md:col-span-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Pickup location</label>
                                <input type="text" value="${templateBooking?.pickupLocation || ''}" placeholder="e.g. SkyLuxse HQ" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="pickup">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Drop-off location</label>
                                <input type="text" value="${templateBooking?.dropoffLocation || ''}" placeholder="e.g. Palm Jumeirah" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="dropoff">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Amount (AED)</label>
                            <input type="number" value="${templateBooking?.totalAmount || ''}" min="0" step="50" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" name="amount">
                        </div>
                    </div>
                </form>
                <div class="p-6 border-t bg-gray-50 flex justify-end space-x-3">
                    <button type="button" id="booking-create-cancel" class="geist-button geist-button-secondary">Cancel</button>
                    <button type="submit" form="booking-create-form" class="geist-button geist-button-primary">Create booking</button>
                </div>
            `;

            const form = bookingCreateContent.querySelector('#booking-create-form');
            form?.addEventListener('submit', (event) => {
                event.preventDefault();
                showToast('Booking saved (demo)', 'success');
                window.location.hash = buildHash(appState.currentRole, 'bookings');
            });

            const cancelBtn = bookingCreateContent.querySelector('#booking-create-cancel');
            cancelBtn?.addEventListener('click', () => {
                window.location.hash = buildHash(appState.currentRole, 'bookings');
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
        document.getElementById('sidebar-nav').addEventListener('click', (e) => {
            if(window.innerWidth < 768) sidebar.classList.add('-translate-x-full');
        });
        
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
            if (e.target.id === 'generate-qr-btn') {
                const qrContainer = document.getElementById('qrcode-container');
                const amount = document.getElementById('payment-amount').value;
                qrContainer.innerHTML = '';
                new QRCode(qrContainer, `https://stripe.com/pay/mock_link_for_${amount}`);
                qrContainer.classList.remove('hidden');
            }
            if (e.target.id === 'complete-task-btn') {
                const bookingId = e.target.dataset.bookingId;
                const odometerValue = driverTaskDetailContent?.querySelector('#driver-odometer')?.value.trim();
                const fuelLevel = driverTaskDetailContent?.querySelector('#driver-fuel')?.value;
                if (!odometerValue || !fuelLevel) {
                    showToast('Fill in mileage and fuel level before completing', 'error');
                    return;
                }
                const cashValue = parseFloat(driverTaskDetailContent?.querySelector('#driver-cash')?.value || '0') || 0;
                const services = Array.from(driverTaskDetailContent?.querySelectorAll('.driver-service:checked') || []).map(input => ({
                    code: input.dataset.code,
                    amount: parseFloat(input.dataset.amount || '0') || 0
                }));
                const finesText = driverTaskDetailContent?.querySelector('#fines-result')?.textContent.trim();
                const payload = {
                    odometer: odometerValue,
                    fuelLevel,
                    cashValue,
                    services,
                    fines: finesText
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
                        booking.cashCollected = cashValue;
                        booking.addonServices = services;
                        booking.history = booking.history || [];
                        booking.history.push({ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), event: 'Driver completed task, data updated' });
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
        
    });
