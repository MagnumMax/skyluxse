import { appState } from '../state/appState.js';
import { MOCK_DATA, ROLES_CONFIG } from '../data/index.js';
import { getIcon } from '../ui/icons.js';
import { formatCurrency } from './utils.js';
import { buildHash } from '../state/navigation.js';

export const getPortalClient = () => {
    const desiredId = appState.clientContext?.activeClientId;
    const clients = MOCK_DATA.clients || [];
    if (!clients.length) return null;
    if (!desiredId) return clients[0];
    return clients.find(client => client.id === desiredId) || clients[0];
};

export const renderClientPortalNav = () => {
    const roleConfig = ROLES_CONFIG.client;
    const navEl = document.getElementById('client-portal-nav');
    if (!navEl || !roleConfig) return;

    navEl.innerHTML = roleConfig.nav.map(item => `
        <a href="${buildHash('client', item.id)}" class="portal-nav-link flex items-center justify-between px-4 py-2 text-sm" data-page="${item.id}">
            <span class="flex items-center gap-2">
                ${getIcon(item.icon, 'w-4 h-4 text-gray-400')}
                <span>${item.name}</span>
            </span>
            ${getIcon('chevronLeft', 'w-4 h-4 text-gray-300 transform rotate-180')}
        </a>
    `).join('');
};

export const updatePortalNavActive = () => {
    const navEl = document.getElementById('client-portal-nav');
    if (!navEl) return;
    navEl.querySelectorAll('.portal-nav-link').forEach(link => {
        link.classList.toggle('nav-link-active', link.dataset.page === appState.currentPage);
    });
};

export const renderClientPortalPage = (pageId) => {
    const portalContainer = document.getElementById('client-portal');
    if (!portalContainer) return;

    const portalPages = Array.from(document.querySelectorAll('#client-portal > section.page'));
    portalPages.forEach(page => page.classList.add('hidden'));

    const section = document.getElementById(`page-${pageId}`);
    if (!section) return;
    section.classList.remove('hidden');

    const client = getPortalClient();
    if (!client) return;

    const bookings = (MOCK_DATA.bookings || []).filter(booking => booking.clientId === client.id);
    const payments = client.payments || [];
    const documents = client.documents || [];
    const now = new Date();

    if (pageId === 'client-dashboard') {
        const activeBookings = bookings.filter(booking => ['delivery', 'in-rent', 'preparation'].includes(booking.status));
        const upcomingBooking = [...bookings]
            .filter(booking => new Date(`${booking.startDate}T00:00:00`) >= now)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
        const pendingNotifications = (client.notifications || []).slice(0, 3);
        section.innerHTML = `
            <div class="grid gap-4 md:grid-cols-3">
                <div class="geist-card p-4">
                    <p class="text-xs uppercase text-gray-500">Задолженность</p>
                    <p class="text-2xl font-semibold mt-2 ${client.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}">${formatCurrency(client.outstanding)}</p>
                    <p class="text-xs text-gray-400 mt-2">${client.outstanding > 0 ? 'Требует оплаты' : 'Долгов нет'}</p>
                </div>
                <div class="geist-card p-4">
                    <p class="text-xs uppercase text-gray-500">Активные аренды</p>
                    <p class="text-2xl font-semibold mt-2">${activeBookings.length}</p>
                    <p class="text-xs text-gray-400 mt-2">Следите за предстоящими бронированиями.</p>
                </div>
                <div class="geist-card p-4">
                    <p class="text-xs uppercase text-gray-500">Lifetime Value</p>
                    <p class="text-2xl font-semibold mt-2">${formatCurrency(client.lifetimeValue || client.turnover)}</p>
                    <p class="text-xs text-gray-400 mt-2">Лояльность: ${client.status}</p>
                </div>
            </div>
            <div class="geist-card p-6">
                <h4 class="text-sm font-semibold text-gray-700">Ближайшая аренда</h4>
                ${upcomingBooking ? `
                    <div class="mt-3 text-sm text-gray-600">
                        <p class="font-semibold text-gray-900">${upcomingBooking.carName}</p>
                        <p>${upcomingBooking.startDate} → ${upcomingBooking.endDate}</p>
                    </div>
                ` : '<p class="mt-3 text-sm text-gray-500">Запланированных арен нет.</p>'}
            </div>
            <div class="geist-card p-6">
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Последние уведомления</h4>
                <div class="space-y-3">
                    ${(pendingNotifications || []).length ? pendingNotifications.map(note => `
                        <div class="flex items-center justify-between text-sm text-gray-600">
                            <div>
                                <p class="font-medium text-gray-900">${note.title}</p>
                                <p class="text-xs text-gray-400">${note.createdAt || ''}</p>
                            </div>
                            <span class="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">${note.status || 'pending'}</span>
                        </div>
                    `).join('') : '<p class="text-sm text-gray-500">Новых уведомлений нет.</p>'}
                </div>
            </div>
        `;
    } else if (pageId === 'client-rentals') {
        section.innerHTML = `
            <div class="space-y-3">
                ${bookings.length ? bookings.map(booking => `
                    <div class="geist-card p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="font-semibold text-sm text-gray-900">${booking.carName}</p>
                                <p class="text-xs text-gray-500">${booking.startDate} → ${booking.endDate}</p>
                            </div>
                            <span class="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">${booking.status}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-2">${booking.type || ''}</p>
                    </div>
                `).join('') : '<div class="geist-card p-4 text-sm text-gray-500">Аренды не найдены.</div>'}
            </div>
        `;
    } else if (pageId === 'client-payments') {
        section.innerHTML = `
            <div class="geist-card p-6 overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs uppercase text-gray-500 border-b">
                        <tr>
                            <th class="px-4 py-3">#</th>
                            <th class="px-4 py-3">Описание</th>
                            <th class="px-4 py-3">Сумма</th>
                            <th class="px-4 py-3">Статус</th>
                            <th class="px-4 py-3">Канал</th>
                            <th class="px-4 py-3">Дата</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.length ? payments.map(payment => `
                            <tr class="border-b last:border-b-0">
                                <td class="px-4 py-3 text-gray-500">${payment.id}</td>
                                <td class="px-4 py-3 text-gray-900 font-medium">${payment.description || '—'}</td>
                                <td class="px-4 py-3 text-gray-900 font-medium">${formatCurrency(payment.amount)}</td>
                                <td class="px-4 py-3">
                                    <span class="px-2 py-1 text-xs rounded-full ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                                        ${payment.status}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-gray-700">${payment.channel}</td>
                                <td class="px-4 py-3 text-gray-500 text-xs">${payment.date}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="6" class="px-4 py-6 text-center text-gray-500">История платежей пуста.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    } else if (pageId === 'client-documents') {
        const docHtml = documents.length ? documents.map(doc => {
            const statusBadge = doc.status === 'verified'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : doc.status === 'needs-review'
                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                : 'bg-gray-100 text-gray-600 border border-gray-200';
            return `
                <div class="geist-card p-4 flex items-center justify-between">
                    <div>
                        <p class="font-semibold text-sm text-gray-900">${doc.name}</p>
                        <p class="text-xs text-gray-500">${doc.expiry ? `Действует до ${doc.expiry}` : 'Срок не указан'}</p>
                    </div>
                    <span class="px-2 py-1 text-xs font-medium rounded-md ${statusBadge}">${doc.status || '—'}</span>
                </div>
            `;
        }).join('') : '<div class="geist-card p-4 text-sm text-gray-500">Документы не найдены.</div>';
        section.innerHTML = `<div class="space-y-3">${docHtml}</div>`;
    } else if (pageId === 'client-faq') {
        section.innerHTML = `
            <div class="space-y-3">
                ${(MOCK_DATA.knowledgeBase || []).map(entry => `
                    <div class="geist-card p-4">
                        <p class="text-xs uppercase text-gray-400">${entry.category}</p>
                        <h4 class="font-semibold text-sm text-gray-900 mt-1">${entry.title}</h4>
                        <p class="text-xs text-gray-400 mt-2">Обновлено: ${entry.updatedAt}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }
};
