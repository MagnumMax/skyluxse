import { MOCK_DATA } from '../data/index.js';
import { appState } from '../state/appState.js';
import { formatCurrency, formatPercent } from './utils.js';
import { getIcon } from '../ui/icons.js';

let analyticsRevenueChart;
let analyticsSegmentChart;
let analyticsForecastChart;
let salesStageChart;

let analyticsFiltersBound = false;
let salesFiltersBound = false;

const getRevenueSeries = (range) => {
    const base = MOCK_DATA.analytics.revenueDaily;
    if (range === '7d') return base;
    const factor = range === '30d' ? 4 : 12;
    return base.map((item, index) => ({
        date: item.date,
        revenue: Math.round((item.revenue * factor / base.length) * (1 + index * 0.03)),
        expenses: Math.round((item.expenses * factor / base.length) * (1 + index * 0.025)),
        bookings: Math.max(1, Math.round(item.bookings * factor / base.length)),
        cancellations: item.cancellations
    }));
};

const getSegmentMix = (segment) => {
    const mix = MOCK_DATA.analytics.segmentMix;
    if (!segment || segment === 'all') {
        return mix;
    }
    const selected = mix.find(item => item.segment.toLowerCase() === segment);
    if (!selected) return mix;
    return [
        selected,
        { segment: 'Other', share: Math.max(0, 1 - selected.share) }
    ];
};

const buildAnalyticsInsights = (segment, vehicleClass) => {
    const insights = [];
    const kpis = MOCK_DATA.analytics.kpis;
    insights.push(`Average revenue per car remains at ${formatCurrency(kpis.avgRevenuePerCar)} per day.`);
    const leadingSegment = MOCK_DATA.analytics.segmentMix.reduce((acc, cur) => (cur.share > acc.share ? cur : acc));
    if (segment !== 'all') {
        const selected = MOCK_DATA.analytics.segmentMix.find(item => item.segment.toLowerCase() === segment);
        if (selected) {
            insights.push(`The ${selected.segment} segment generates ${formatPercent(selected.share, 0)} of current revenue.`);
        }
    } else {
        insights.push(`The leading segment is ${leadingSegment.segment} (${formatPercent(leadingSegment.share, 0)}).`);
    }
    const forecast = MOCK_DATA.analytics.forecast[0];
    insights.push(`Forecast for ${forecast.week}: ${formatCurrency(forecast.expectedRevenue)} and ${forecast.expectedBookings} bookings.`);
    if (vehicleClass !== 'all') {
        const carClassMap = new Map(MOCK_DATA.cars.map(car => [car.id, car.class]));
        const classBookings = MOCK_DATA.bookings.filter(booking => carClassMap.get(booking.carId) === vehicleClass);
        if (classBookings.length) {
            const classRevenue = classBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
            insights.push(`${vehicleClass} class: ${classBookings.length} active bookings, revenue ${formatCurrency(classRevenue)}.`);
        }
    }
    return insights;
};

const bindAnalyticsFilters = () => {
    if (analyticsFiltersBound) return;
    const rangeSelect = document.getElementById('analytics-range');
    const segmentSelect = document.getElementById('analytics-segment');
    const classSelect = document.getElementById('analytics-class');

    if (rangeSelect) {
        rangeSelect.addEventListener('change', (event) => {
            appState.filters.analytics.range = event.target.value;
            renderAnalyticsPage();
        });
    }
    if (segmentSelect) {
        segmentSelect.addEventListener('change', (event) => {
            appState.filters.analytics.segment = event.target.value;
            renderAnalyticsPage();
        });
    }
    if (classSelect) {
        classSelect.addEventListener('change', (event) => {
            appState.filters.analytics.vehicleClass = event.target.value;
            renderAnalyticsPage();
        });
    }
    analyticsFiltersBound = true;
};

export const renderAnalyticsPage = () => {
    const revenueCtx = document.getElementById('analytics-revenue-chart')?.getContext('2d');
    if (!revenueCtx) return;

    bindAnalyticsFilters();

    const { range, segment, vehicleClass } = appState.filters.analytics;
    const rangeSelect = document.getElementById('analytics-range');
    const segmentSelect = document.getElementById('analytics-segment');
    const classSelect = document.getElementById('analytics-class');

    if (rangeSelect) rangeSelect.value = range;
    if (segmentSelect) segmentSelect.value = segment;
    if (classSelect) classSelect.value = vehicleClass;

    const revenueSeries = getRevenueSeries(range);
    const revenueValues = revenueSeries.map(item => item.revenue);
    const expenseValues = revenueSeries.map(item => item.expenses);

    if (analyticsRevenueChart) analyticsRevenueChart.destroy();
    analyticsRevenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: revenueSeries.map(item => item.date),
            datasets: [
                {
                    label: 'Revenue',
                    data: revenueValues,
                    borderColor: '#111827',
                    backgroundColor: 'rgba(17,24,39,0.12)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Expenses',
                    data: expenseValues,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249,115,22,0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: {
                    ticks: { callback: value => `AED ${Math.round(value / 1000)}k` }
                },
                x: { grid: { display: false } }
            }
        }
    });

    const segmentCtx = document.getElementById('analytics-segment-chart')?.getContext('2d');
    if (segmentCtx) {
        const segmentData = getSegmentMix(segment);
        if (analyticsSegmentChart) analyticsSegmentChart.destroy();
        analyticsSegmentChart = new Chart(segmentCtx, {
            type: 'doughnut',
            data: {
                labels: segmentData.map(item => item.segment),
                datasets: [{
                    data: segmentData.map(item => +(item.share * 100).toFixed(1)),
                    backgroundColor: ['#111827', '#6366f1', '#0ea5e9', '#10b981']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    const forecastCtx = document.getElementById('analytics-forecast-chart')?.getContext('2d');
    if (forecastCtx) {
        const forecastData = MOCK_DATA.analytics.forecast;
        if (analyticsForecastChart) analyticsForecastChart.destroy();
        analyticsForecastChart = new Chart(forecastCtx, {
            type: 'bar',
            data: {
                labels: forecastData.map(item => item.week),
                datasets: [
                    {
                        type: 'bar',
                        label: 'Revenue',
                        data: forecastData.map(item => item.expectedRevenue),
                        backgroundColor: '#1f2937',
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: 'Bookings',
                        data: forecastData.map(item => item.expectedBookings),
                        borderColor: '#6366f1',
                        tension: 0.3,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    y: {
                        position: 'left',
                        ticks: { callback: value => `AED ${Math.round(value / 1000)}k` }
                    },
                    y1: {
                        position: 'right',
                        grid: { drawOnChartArea: false }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    const insightsEl = document.getElementById('analytics-insights');
    if (insightsEl) {
        const insights = buildAnalyticsInsights(segment, vehicleClass);
        insightsEl.innerHTML = insights.map(item => `
            <li class="flex items-start gap-2">
                <span class="mt-1.5 w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"></span>
                <span>${item}</span>
            </li>
        `).join('');
    }
};

const computeLeadOwner = (lead) => {
    const pipeline = MOCK_DATA.salesPipeline || {};
    const owners = pipeline.owners || [];
    const owner = owners.find(o => o.id === lead.ownerId);
    return owner ? owner.name : 'Unknown';
};

const getFilteredLeads = () => {
    const pipeline = MOCK_DATA.salesPipeline || {};
    const leads = pipeline.leads || [];
    const { owner, source } = appState.filters.sales;
    return leads.filter(lead => {
        if (owner !== 'all' && lead.ownerId !== owner) return false;
        if (source !== 'all' && lead.source !== source) return false;
        return true;
    });
};

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const DOCUMENT_STATUS_CLASS = {
    verified: 'bg-emerald-100 text-emerald-700',
    signed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    'pending-review': 'bg-amber-100 text-amber-700',
    missing: 'bg-rose-100 text-rose-700'
};

const DOCUMENT_STATUS_LABEL = {
    verified: 'Verified',
    signed: 'Signed',
    pending: 'Pending',
    'pending-review': 'Under review',
    missing: 'Missing'
};

const TASK_STATUS_CLASS = {
    done: 'bg-emerald-100 text-emerald-700',
    'in-progress': 'bg-indigo-100 text-indigo-700',
    pending: 'bg-amber-100 text-amber-700',
    upcoming: 'bg-slate-100 text-slate-600'
};

const TIMELINE_META = {
    system: { icon: 'activity', class: 'bg-slate-100 text-slate-600', label: 'System' },
    call: { icon: 'phone', class: 'bg-indigo-100 text-indigo-700', label: 'Call' },
    meeting: { icon: 'users', class: 'bg-blue-100 text-blue-700', label: 'Meeting' },
    document: { icon: 'fileText', class: 'bg-amber-100 text-amber-700', label: 'Document' },
    proposal: { icon: 'fileText', class: 'bg-purple-100 text-purple-700', label: 'Proposal' },
    task: { icon: 'check', class: 'bg-slate-100 text-slate-600', label: 'Task' },
    email: { icon: 'mail', class: 'bg-slate-100 text-slate-600', label: 'Email' },
    success: { icon: 'check', class: 'bg-emerald-100 text-emerald-700', label: 'Success' },
    preparation: { icon: 'wrench', class: 'bg-blue-100 text-blue-700', label: 'Preparation' },
    delivery: { icon: 'truck', class: 'bg-emerald-100 text-emerald-700', label: 'Delivery' },
    pickup: { icon: 'truck', class: 'bg-amber-100 text-amber-700', label: 'Pickup' },
    settlement: { icon: 'creditCard', class: 'bg-indigo-100 text-indigo-700', label: 'Settlement' }
};

const formatRequestCount = (count) => {
    if (!count) return 'No active requests';
    const noun = count === 1 ? 'request' : 'requests';
    return `${count} ${noun}`;
};

const formatDateShort = (value) => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return dateFormatter.format(date);
};

const formatDateTimeValue = (value) => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return dateTimeFormatter.format(date);
};

const formatPercentValue = (value) => {
    if (typeof value !== 'number') return value || '—';
    if (value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
};

const getLeadDetail = (leadId) => {
    if (!leadId) return null;
    const workspace = MOCK_DATA.salesWorkspace || {};
    const details = workspace.leadDetails || {};
    return details[leadId] || null;
};

const getClientForLead = (lead, detail) => {
    const clientId = (lead && lead.clientId) || (detail && detail.clientId);
    if (!clientId) return null;
    return (MOCK_DATA.clients || []).find(client => Number(client.id) === Number(clientId)) || null;
};

export const renderClientCard = (lead, client, detail) => {
    if (!client) {
        return '<p class="text-sm text-gray-500">No client data available.</p>';
    }
    const loyaltyClassMap = {
        VIP: 'bg-purple-100 text-purple-700',
        Gold: 'bg-amber-100 text-amber-700',
        Silver: 'bg-slate-100 text-slate-600'
    };
    const statusLabel = client.status || '—';
    const loyaltyClass = loyaltyClassMap[statusLabel] || 'bg-gray-100 text-gray-600';
    const segmentLabel = client.segment || '—';
    const companyLabel = client.company || lead?.company || '—';
    const rentals = (client.rentals || []).slice(0, 2);
    const documents = (detail && detail.documents && detail.documents.length)
        ? detail.documents
        : (client.documents || []);
    const financials = detail?.financials || client.financials;
    const payments = (client.payments || []).slice(0, 2);
    const notifications = (client.preferences?.notifications || []).join(', ') || '—';
    const language = client.preferences?.language || '—';

    const documentsHtml = documents.length
        ? documents.map(doc => {
            const statusKey = (doc.status || '').toLowerCase();
            const badgeClass = DOCUMENT_STATUS_CLASS[statusKey] || 'bg-gray-100 text-gray-600';
            const statusLabel = DOCUMENT_STATUS_LABEL[statusKey] || doc.status || '—';
            const metaParts = [
                doc.source ? `Source: ${doc.source}` : '',
                doc.expiry ? `Valid until ${formatDateShort(doc.expiry)}` : '',
                doc.updatedAt ? `Updated ${formatDateTimeValue(doc.updatedAt)}` : ''
            ].filter(Boolean).join(' · ');
            return `
                <li class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-sm font-medium text-gray-800">${doc.name}</p>
                        <p class="text-xs text-gray-500">${metaParts || 'No metadata'}</p>
                    </div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}">${statusLabel}</span>
                </li>
            `;
        }).join('')
        : '<li class="text-sm text-gray-500">No documents</li>';

    const rentalsHtml = rentals.length
        ? rentals.map(rental => `
            <li class="flex items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-medium text-gray-900">${rental.carName}</p>
                    <p class="text-xs text-gray-500">${formatDateShort(rental.startDate)} — ${formatDateShort(rental.endDate)} · ${rental.status}</p>
                </div>
                <span class="text-xs text-gray-500">${formatCurrency(rental.totalAmount || 0)}</span>
            </li>
        `).join('')
        : '<li class="text-sm text-gray-500">Rental history unavailable</li>';

    const upcomingHtml = (financials?.upcoming || []).length
        ? financials.upcoming.map(item => `
            <li class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span>${item.label}</span>
                <span class="font-medium text-gray-900">${formatCurrency(item.amount || 0)}</span>
                <span class="text-xs text-gray-400">due ${formatDateShort(item.dueDate)}</span>
            </li>
        `).join('')
        : '<li class="text-xs text-gray-500">No expected payments</li>';

    const paymentsHtml = payments.length
        ? payments.map(payment => `
            <li class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span>${payment.type}</span>
                <span>${formatCurrency(payment.amount || 0)}</span>
                <span class="text-xs text-gray-400">${payment.status || ''}</span>
            </li>
        `).join('')
        : '<li class="text-xs text-gray-500">No transactions</li>';

    const outstandingValue = formatCurrency((financials && financials.outstanding) ?? client.outstanding ?? 0);
    const lastSync = financials?.lastSync ? formatDateTimeValue(financials.lastSync) : '—';

    return `
        <div class="space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <p class="text-xs uppercase text-gray-500">Client</p>
                    <h4 class="text-lg font-semibold text-gray-900">${client.name}</h4>
                    <p class="text-sm text-gray-500">${segmentLabel} · ${companyLabel}</p>
                </div>
                <div class="flex flex-col items-start sm:items-end gap-2">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${loyaltyClass}">${statusLabel}</span>
                    <p class="text-xs text-gray-400">LTV ${formatCurrency(client.lifetimeValue || 0)}</p>
                </div>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-3">
                    <div class="text-sm text-gray-700 space-y-1">
                        <p class="flex items-center gap-2">${getIcon('phone', 'w-4 h-4')}<span>${client.phone || '—'}</span></p>
                        <p class="flex items-center gap-2">${getIcon('mail', 'w-4 h-4')}<span>${client.email || '—'}</span></p>
                        <p class="text-xs text-gray-500">Notifications: ${notifications} · Language: ${language}</p>
                    </div>
                    <div>
                        <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Rental history</h5>
                        <ul class="space-y-2">${rentalsHtml}</ul>
                    </div>
                </div>
                <div class="space-y-3">
                    <div>
                        <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Documents and validation</h5>
                        <ul class="space-y-2">${documentsHtml}</ul>
                    </div>
                    <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <p class="text-xs uppercase text-gray-500 tracking-wide">Finances (Zoho)</p>
                        <p class="text-sm text-gray-700 mt-1">Outstanding balance: <span class="font-semibold text-gray-900">${outstandingValue}</span></p>
                        <ul class="mt-2 space-y-1 text-xs text-gray-600">${upcomingHtml}</ul>
                        <p class="text-xs text-gray-400 mt-2">Synced: ${lastSync}</p>
                    </div>
                    <div>
                        <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Recent payments</h5>
                        <ul class="space-y-1 text-xs text-gray-600">${paymentsHtml}</ul>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const renderTimelineCard = (lead, detail) => {
    const timeline = (detail?.timeline || []).slice().sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const documents = detail?.documents || [];
    const tasks = detail?.tasks || [];
    const financials = detail?.financials;
    const upcoming = financials?.upcoming || [];
    const nextAction = lead?.nextAction || detail?.nextAction || '—';
    const expectedClose = lead?.expectedCloseDate
        ? formatDateShort(lead.expectedCloseDate)
        : (detail?.expectedCloseDate ? formatDateShort(detail.expectedCloseDate) : '—');

    const timelineHtml = timeline.length
        ? timeline.map(event => {
            const typeMeta = TIMELINE_META[event.type] || TIMELINE_META.system;
            const owner = event.owner ? `<span class="text-xs text-gray-500">Owner: ${event.owner}</span>` : '';
            return `
                <li class="relative pl-6">
                    <span class="absolute left-0 top-2 w-3 h-3 rounded-full border border-white ${typeMeta.class}"></span>
                    <div class="flex items-center gap-2 text-xs text-gray-500">
                        ${getIcon(typeMeta.icon, 'w-3.5 h-3.5')}
                        <span>${formatDateTimeValue(event.ts)}</span>
                        <span class="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] uppercase tracking-wide">${typeMeta.label}</span>
                    </div>
                    <p class="text-sm text-gray-800 font-medium mt-1">${event.label}</p>
                    ${owner}
                </li>
            `;
        }).join('')
        : '<li class="text-sm text-gray-500">No activity for this deal</li>';

    const documentStatesHtml = documents.length
        ? documents.map(doc => {
            const statusKey = (doc.status || '').toLowerCase();
            const badgeClass = DOCUMENT_STATUS_CLASS[statusKey] || 'bg-gray-100 text-gray-600';
            const statusLabel = DOCUMENT_STATUS_LABEL[statusKey] || doc.status || '—';
            const metaParts = [
                doc.source ? `Source: ${doc.source}` : '',
                doc.expiry ? `Valid until ${formatDateShort(doc.expiry)}` : '',
                doc.updatedAt ? `Updated ${formatDateTimeValue(doc.updatedAt)}` : ''
            ].filter(Boolean).join(' · ');
            return `
                <li class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-sm font-medium text-gray-800">${doc.name}</p>
                        <p class="text-xs text-gray-500">${metaParts || 'No metadata'}</p>
                    </div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}">${statusLabel}</span>
                </li>
            `;
        }).join('')
        : '<li class="text-sm text-gray-500">Documents not uploaded</li>';

    const upcomingPaymentsHtml = upcoming.length
        ? upcoming.map(item => `
            <li class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-gray-600">
                <span>${item.label}</span>
                <span class="font-medium text-gray-900">${formatCurrency(item.amount || 0)}</span>
                <span>due ${formatDateShort(item.dueDate)}</span>
                <span class="text-[10px] uppercase tracking-wide text-gray-400">${item.status || ''}</span>
            </li>
        `).join('')
        : '<li class="text-xs text-gray-500">No expected payments</li>';

    const tasksHtml = tasks.length
        ? tasks.map(task => {
            const statusKey = (task.status || '').toLowerCase();
            const badgeClass = TASK_STATUS_CLASS[statusKey] || 'bg-slate-100 text-slate-600';
            return `
                <li class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-gray-600">
                    <span>${task.label}</span>
                    <span class="text-gray-400">${task.dueDate ? formatDateShort(task.dueDate) : '—'}</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full ${badgeClass}">${task.status || '—'}</span>
                </li>
            `;
        }).join('')
        : '<li class="text-xs text-gray-500">No operational tasks</li>';

    return `
        <div class="space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h4 class="text-lg font-semibold text-gray-900">Deal timeline</h4>
                    <p class="text-xs text-gray-500">Next action: ${nextAction}</p>
                </div>
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                    ${getIcon('clock', 'w-4 h-4')}Close by ${expectedClose}
                </div>
            </div>
            <ol class="relative border-l border-slate-200 pl-4 space-y-4">
                ${timelineHtml}
            </ol>
            <div class="grid gap-4 md:grid-cols-2">
                <div>
                    <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Documents and validation</h5>
                    <ul class="space-y-2">${documentStatesHtml}</ul>
                </div>
                <div class="space-y-4">
                    <div>
                        <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Payments and deposits</h5>
                        <ul class="space-y-1">${upcomingPaymentsHtml}</ul>
                    </div>
                    <div>
                        <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Manager tasks</h5>
                        <ul class="space-y-1">${tasksHtml}</ul>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderOfferLibraryCard = (detail) => {
    const offers = detail?.offers || [];
    if (!offers.length) {
        return '<p class="text-sm text-gray-500">Add packages or select a lead to see recommendations.</p>';
    }

    const cards = offers.map(offer => `
        <div class="border border-slate-200 rounded-lg p-4 bg-white/80">
            <div class="flex items-center justify-between gap-3">
                <h5 class="text-sm font-semibold text-gray-900">${offer.name}</h5>
                ${offer.margin ? `<span class="text-xs font-medium text-emerald-600">${offer.margin}</span>` : ''}
            </div>
            <p class="text-sm text-gray-600 mt-2">${offer.description || ''}</p>
            <div class="flex items-center justify-between mt-3 text-sm text-gray-700">
                <span class="font-semibold text-gray-900">${formatCurrency(offer.price || 0)}</span>
                <button type="button" class="geist-button geist-button-secondary text-xs">Send to client</button>
            </div>
        </div>
    `).join('');

    return `
        <div class="space-y-4">
            <div>
                <h4 class="text-lg font-semibold text-gray-900">Offer library</h4>
                <p class="text-sm text-gray-500">Ready-made bundles for upsell and cross-sell.</p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
                ${cards}
            </div>
        </div>
    `;
};

const renderPlaybooksCard = (detail) => {
    const playbook = detail?.playbook;
    if (!playbook) {
        return '<p class="text-sm text-gray-500">Select a lead to access checklists and tips.</p>';
    }

    const checklist = (playbook.checklist || []).map(item => {
        const done = !!item.done;
        const badgeClass = done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500';
        const icon = done ? 'check' : 'clock';
        return `
            <li class="flex items-center gap-2 text-sm text-gray-700">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full ${badgeClass}">${getIcon(icon, 'w-3.5 h-3.5')}</span>
                <span>${item.label}</span>
            </li>
        `;
    }).join('') || '<li class="text-sm text-gray-500">Checklist is empty</li>';

    const quickActions = (playbook.quickActions || []).map(action => `
        <span class="inline-flex items-center px-3 py-1 rounded-full border border-slate-200 text-xs text-gray-600">${action.label}</span>
    `).join('') || '<span class="text-xs text-gray-500">No quick actions</span>';

    const templates = (playbook.templates || []).map(template => `
        <li class="flex items-center justify-between text-sm text-gray-700">
            <span>${template.label}</span>
            <span class="text-xs text-gray-400 uppercase">${template.channel}</span>
        </li>
    `).join('') || '<li class="text-sm text-gray-500">No templates added</li>';

    return `
        <div class="space-y-4">
            <div>
                <h4 class="text-lg font-semibold text-gray-900">Playbook · ${playbook.scenario || '—'}</h4>
                <p class="text-sm text-gray-500">Standardize communication and accelerate closing.</p>
            </div>
            <div class="grid gap-4 md:grid-cols-3">
                <div>
                    <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Checklist</h5>
                    <ul class="space-y-2">${checklist}</ul>
                </div>
                <div>
                    <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Quick actions</h5>
                    <div class="flex flex-wrap gap-2">${quickActions}</div>
                </div>
                <div>
                    <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Templates</h5>
                    <ul class="space-y-2">${templates}</ul>
                </div>
            </div>
        </div>
    `;
};

const renderAnalyticsCard = (detail, aggregated) => {
    const aggLoss = aggregated?.lossReasons || [];
    const aggVehicle = aggregated?.vehiclePopularity || [];
    const aggCampaign = aggregated?.campaignEfficiency || [];

    const aggregatedBlock = `
        <div class="grid gap-4 md:grid-cols-3">
            <div>
                <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Loss reasons</h5>
                <ul class="space-y-1 text-sm text-gray-700">
                    ${aggLoss.length ? aggLoss.map(item => `<li class="flex items-center justify-between"><span>${item.reason}</span><span class="text-xs text-gray-400">${formatPercentValue(item.percent)}</span></li>`).join('') : '<li class="text-sm text-gray-500">Not enough data</li>'}
                </ul>
            </div>
            <div>
                <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Vehicle popularity</h5>
                <ul class="space-y-1 text-sm text-gray-700">
                    ${aggVehicle.length ? aggVehicle.map(item => `<li class="flex items-center justify-between"><span>${item.carName}</span><span class="text-xs text-gray-400">${formatPercentValue(item.winShare)} · ${formatCurrency(item.avgDeal || 0)}</span></li>`).join('') : '<li class="text-sm text-gray-500">Not enough data</li>'}
                </ul>
            </div>
            <div>
                <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Campaigns</h5>
                <ul class="space-y-1 text-sm text-gray-700">
                    ${aggCampaign.length ? aggCampaign.map(item => `<li class="flex items-center justify-between"><span>${item.name}</span><span class="text-xs text-gray-400">${formatPercentValue(item.winRate)} · ${formatCurrency(item.revenue || 0)}</span></li>`).join('') : '<li class="text-sm text-gray-500">Not enough data</li>'}
                </ul>
            </div>
        </div>
    `;

    if (!detail || !detail.analytics) {
        return `
            <div class="space-y-4">
                <div>
                    <h4 class="text-lg font-semibold text-gray-900">Analytics snapshots</h4>
                    <p class="text-sm text-gray-500">Aggregated loss reasons, vehicle popularity, and campaign performance.</p>
                </div>
                ${aggregatedBlock}
                <p class="text-sm text-gray-500 border-t pt-4">Select a lead to view deal-specific insights.</p>
            </div>
        `;
    }

    const detailAnalytics = detail.analytics;
    const detailLoss = detailAnalytics.lossReasons || [];
    const detailVehicle = detailAnalytics.vehiclePopularity || [];
    const detailCampaign = detailAnalytics.campaignPerformance || [];

    const leadBlock = `
        <div class="grid gap-4 md:grid-cols-3">
            <div>
                <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Deal risks</h5>
                <ul class="space-y-1 text-sm text-gray-700">
                    ${detailLoss.length ? detailLoss.map(item => `<li>${item.reason} · <span class="text-xs text-gray-400">${item.impact || ''}</span></li>`).join('') : '<li class="text-sm text-gray-500">No risks identified</li>'}
                </ul>
            </div>
            <div>
                <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Preferred vehicles</h5>
                <ul class="space-y-1 text-sm text-gray-700">
                    ${detailVehicle.length ? detailVehicle.map(item => `<li class="flex items-center justify-between"><span>${item.carName}</span><span class="text-xs text-gray-400">${item.share || ''}</span></li>`).join('') : '<li class="text-sm text-gray-500">No data</li>'}
                </ul>
            </div>
            <div>
                <h5 class="text-xs uppercase text-gray-500 tracking-wide mb-2">Campaigns</h5>
                <ul class="space-y-1 text-sm text-gray-700">
                    ${detailCampaign.length ? detailCampaign.map(item => `<li class="flex items-center justify-between"><span>${item.name}</span><span class="text-xs text-gray-400">${item.winRate || ''} · ${formatCurrency(item.revenue || 0)}</span></li>`).join('') : '<li class="text-sm text-gray-500">No data</li>'}
                </ul>
            </div>
        </div>
    `;

    return `
        <div class="space-y-4">
            <div>
                <h4 class="text-lg font-semibold text-gray-900">Analytics snapshots</h4>
                <p class="text-sm text-gray-500">Compare aggregate trends with the selected deal.</p>
            </div>
            ${aggregatedBlock}
            <div class="border-t pt-4 space-y-3">
                <h5 class="text-xs uppercase text-gray-500 tracking-wide">For active deal</h5>
                ${leadBlock}
            </div>
        </div>
    `;
};

const selectLead = (leadId) => {
    if (!leadId || appState.salesContext.activeLeadId === leadId) return;
    appState.salesContext.activeLeadId = leadId;
    renderSalesPipeline();
};

const attachLeadSelectionHandlers = () => {
    document.querySelectorAll('[data-select-lead]').forEach(element => {
        element.addEventListener('click', () => selectLead(element.dataset.selectLead));
    });
};

const bindSalesPipelineFilters = () => {
    if (salesFiltersBound) return;
    const ownerSelect = document.getElementById('sales-owner-filter');
    const sourceSelect = document.getElementById('sales-source-filter');
    const pipeline = MOCK_DATA.salesPipeline || {};
    const owners = pipeline.owners || [];

    if (ownerSelect && !ownerSelect.dataset.bound) {
        ownerSelect.insertAdjacentHTML(
            'beforeend',
            owners.map(owner => `<option value="${owner.id}">${owner.name}</option>`).join('')
        );
        ownerSelect.dataset.bound = 'true';
    }

    if (sourceSelect && !sourceSelect.dataset.bound) {
        const sources = Array.from(new Set((pipeline.leads || []).map(lead => lead.source))).sort();
        sourceSelect.insertAdjacentHTML(
            'beforeend',
            sources.map(source => `<option value="${source}">${source}</option>`).join('')
        );
        sourceSelect.dataset.bound = 'true';
    }

    ownerSelect?.addEventListener('change', (event) => {
        appState.filters.sales.owner = event.target.value;
        renderSalesPipeline();
    });

    sourceSelect?.addEventListener('change', (event) => {
        appState.filters.sales.source = event.target.value;
        renderSalesPipeline();
    });

    salesFiltersBound = true;
};

export const renderSalesPipeline = () => {
    const summaryEl = document.getElementById('sales-pipeline-summary');
    if (!summaryEl) return;

    bindSalesPipelineFilters();

    const pipeline = MOCK_DATA.salesPipeline || { stages: [], leads: [] };
    const stages = pipeline.stages || [];
    const stageMap = new Map(stages.map(stage => [stage.id, stage]));
    const leads = getFilteredLeads();

    const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    const weightedValue = leads.reduce((sum, lead) => sum + (lead.value || 0) * (lead.probability || 0), 0);
    const wonLeads = leads.filter(lead => lead.stage === 'won');
    const avgVelocity = leads.length ? Math.round(leads.reduce((sum, lead) => sum + (lead.velocityDays || 0), 0) / leads.length) : 0;
    const overallWinRate = (pipeline.leads || []).length
        ? Math.round(((pipeline.leads || []).filter(lead => lead.stage === 'won').length / (pipeline.leads || []).length) * 100)
        : 0;
    const winRate = leads.length ? Math.round((wonLeads.length / leads.length) * 100) : overallWinRate;
    const totalLeads = leads.length;

    const summaryCards = [
        {
            label: 'Pipeline total',
            value: formatCurrency(totalValue),
            helper: 'All active opportunities',
            icon: 'briefcase'
        },
        {
            label: 'Weighted forecast',
            value: formatCurrency(weightedValue),
            helper: 'Based on close probability',
            icon: 'target'
        },
        {
            label: 'Win rate',
            value: `${winRate || 0}%`,
            helper: `${avgVelocity || 0} days average velocity`,
            icon: 'trendingUp'
        },
        {
            label: 'Active opportunities',
            value: totalLeads.toString(),
            helper: 'Filtered by owner and source',
            icon: 'users'
        }
    ];

    summaryEl.innerHTML = summaryCards.map(card => `
        <div class="geist-card p-5 flex flex-col justify-between">
            <div class="flex items-center justify-between">
                <span class="text-xs uppercase text-gray-500">${card.label}</span>
                <span class="text-gray-400">${getIcon(card.icon, 'w-5 h-5')}</span>
            </div>
            <p class="text-2xl font-semibold text-gray-900 mt-3">${card.value}</p>
            <p class="text-xs text-gray-500 mt-2">${card.helper}</p>
        </div>
    `).join('');

    const ownerSelect = document.getElementById('sales-owner-filter');
    if (ownerSelect) {
        ownerSelect.value = ownerSelect.querySelector(`option[value="${appState.filters.sales.owner}"]`)
            ? appState.filters.sales.owner
            : 'all';
    }
    const sourceSelect = document.getElementById('sales-source-filter');
    if (sourceSelect) {
        sourceSelect.value = sourceSelect.querySelector(`option[value="${appState.filters.sales.source}"]`)
            ? appState.filters.sales.source
            : 'all';
    }

    const stageTableBody = document.querySelector('#sales-stage-table tbody');
    if (stageTableBody) {
        const rows = stages.map(stage => {
            const stageLeads = leads.filter(lead => lead.stage === stage.id);
            const stageValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
            const averageProbability = stageLeads.length
                ? Math.round(stageLeads.reduce((sum, lead) => sum + (lead.probability || stage.probability || 0), 0) / stageLeads.length * 100)
                : Math.round((stage.probability || 0) * 100);
            return `
                <tr>
                    <td class="py-2 pr-4">
                        <div class="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium ${stage.color}">${stage.name}</div>
                    </td>
                    <td class="py-2 text-right">${stageLeads.length}</td>
                    <td class="py-2 text-right">${formatCurrency(stageValue)}</td>
                    <td class="py-2 text-right">${averageProbability}%</td>
                </tr>
            `;
        }).join('');
        stageTableBody.innerHTML = rows;
        const conversionLabel = document.getElementById('sales-pipeline-conversion');
        if (conversionLabel) conversionLabel.textContent = `Win rate ${(winRate || 0)}%`;
    }

    const stageChartCtx = document.getElementById('sales-stage-chart')?.getContext('2d');
    if (stageChartCtx) {
        const values = stages.map(stage => leads
            .filter(lead => lead.stage === stage.id)
            .reduce((sum, lead) => sum + (lead.value || 0), 0)
        );
        if (salesStageChart) salesStageChart.destroy();
        salesStageChart = new Chart(stageChartCtx, {
            type: 'bar',
            data: {
                labels: stages.map(stage => stage.name),
                datasets: [{
                    label: 'Deal value',
                    data: values,
                    backgroundColor: '#4c6ef5',
                    borderRadius: 6,
                    maxBarThickness: 36
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => `AED ${Math.round(value / 1000)}k`
                        }
                    }
                }
            }
        });
    }

    const leadCountEl = document.getElementById('sales-lead-count');
    if (leadCountEl) leadCountEl.textContent = formatRequestCount(leads.length);

    let activeLead = leads.find(lead => lead.id === appState.salesContext.activeLeadId) || null;
    if (!activeLead && leads.length) {
        activeLead = leads[0];
        appState.salesContext.activeLeadId = activeLead.id;
    }
    if (!leads.length) {
        activeLead = null;
        appState.salesContext.activeLeadId = null;
    }

    const detail = getLeadDetail(activeLead?.id);
    const client = getClientForLead(activeLead, detail);

    const leadListEl = document.getElementById('sales-lead-list');
    if (leadListEl) {
        if (leads.length) {
            leadListEl.innerHTML = leads.map(lead => {
                const isActive = activeLead && activeLead.id === lead.id;
                const stageMeta = stageMap.get(lead.stage) || {};
                const probability = Math.round((lead.probability || stageMeta.probability || 0) * 100);
                const ownerName = computeLeadOwner(lead);
                const closeDate = lead.expectedCloseDate ? formatDateShort(lead.expectedCloseDate) : '—';
                const velocity = lead.velocityDays ? `${lead.velocityDays} days` : '—';
                return `
                    <button type="button" class="w-full text-left border rounded-xl px-4 py-3 transition ${isActive ? 'border-indigo-300 bg-white shadow-md' : 'border-slate-200 bg-white/70 hover:border-indigo-200'}" data-select-lead="${lead.id}">
                        <div class="flex items-center justify-between gap-2">
                            <div>
                                <p class="text-sm font-semibold text-gray-900">${lead.title}</p>
                                <p class="text-xs text-gray-500">${lead.company}</p>
                            </div>
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stageMeta.color || 'bg-gray-100 text-gray-600'}">${stageMeta.name || lead.stage}</span>
                        </div>
                        <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">${getIcon('user', 'w-3 h-3')}<span>${ownerName}</span></span>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">${probability}%</span>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">${velocity}</span>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">due ${closeDate}</span>
                        </div>
                    </button>
                `;
            }).join('');
        } else {
        leadListEl.innerHTML = '<p class="text-sm text-gray-500">No leads match the current filters.</p>';
        }
    }

    const leadsTableBody = document.querySelector('#sales-leads-table tbody');
    if (leadsTableBody) {
        const sortedLeads = [...leads].sort((a, b) => (b.probability || 0) - (a.probability || 0));
        leadsTableBody.innerHTML = sortedLeads.length
            ? sortedLeads.map(lead => {
                const ownerName = computeLeadOwner(lead);
                const stageMeta = stageMap.get(lead.stage) || {};
                const probability = Math.round((lead.probability || stageMeta.probability || 0) * 100);
                const closeDate = lead.expectedCloseDate ? formatDateShort(lead.expectedCloseDate) : '—';
                const isActive = activeLead && activeLead.id === lead.id;
                return `
                    <tr class="cursor-pointer ${isActive ? 'bg-indigo-50/40' : 'hover:bg-gray-50'}" data-select-lead="${lead.id}">
                        <td class="px-4 py-3 text-gray-900 font-medium">${lead.title}</td>
                        <td class="px-4 py-3 text-gray-700">${lead.company}</td>
                        <td class="px-4 py-3 text-sm">
                            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${stageMeta.color || 'bg-gray-100 text-gray-600'}">${stageMeta.name || lead.stage}</span>
                        </td>
                        <td class="px-4 py-3 text-right font-medium text-gray-900">${formatCurrency(lead.value)}</td>
                        <td class="px-4 py-3 text-gray-700">${ownerName}</td>
                        <td class="px-4 py-3 text-gray-500">${lead.source}</td>
                        <td class="px-4 py-3 text-gray-500">${lead.nextAction || '—'}<div class="text-xs text-gray-400">${probability}% · ${closeDate}</div></td>
                    </tr>
                `;
            }).join('')
            : '<tr><td colspan="7" class="px-4 py-6 text-center text-gray-500">No leads</td></tr>';
    }

    const clientCardEl = document.getElementById('sales-client-card');
    if (clientCardEl) {
        if (activeLead && client) {
            clientCardEl.innerHTML = renderClientCard(activeLead, client, detail);
        } else if (leads.length) {
            clientCardEl.innerHTML = '<p class="text-sm text-gray-500">Select a lead to view the 360° client card.</p>';
        } else {
            clientCardEl.innerHTML = '<p class="text-sm text-gray-500">Adjust filters to view the deal workspace.</p>';
        }
    }

    const timelineEl = document.getElementById('sales-deal-timeline');
    if (timelineEl) {
        timelineEl.innerHTML = (activeLead && detail)
            ? renderTimelineCard(activeLead, detail)
            : (leads.length
            ? '<p class="text-sm text-gray-500">Deal timeline and document statuses will appear after you select a lead.</p>'
                : '<p class="text-sm text-gray-500">No data. Reset filters to continue.</p>');
    }

    const offerLibraryEl = document.getElementById('sales-offer-library');
    if (offerLibraryEl) {
        offerLibraryEl.innerHTML = (activeLead && detail)
            ? renderOfferLibraryCard(detail)
            : (leads.length
                ? '<p class="text-sm text-gray-500">Recommended packages and add-ons show once a deal is active.</p>'
                : '<p class="text-sm text-gray-500">No leads available to display offers.</p>');
    }

    const playbooksEl = document.getElementById('sales-playbooks');
    if (playbooksEl) {
        playbooksEl.innerHTML = (activeLead && detail)
            ? renderPlaybooksCard(detail)
            : (leads.length
            ? '<p class="text-sm text-gray-500">Contextual tips and playbooks become available after selecting a lead.</p>'
            : '<p class="text-sm text-gray-500">Reset filters to view the playbook.</p>');
    }

    const analyticsEl = document.getElementById('sales-analytics');
    if (analyticsEl) {
        const aggregated = MOCK_DATA.salesWorkspace?.aggregated || {};
        analyticsEl.innerHTML = renderAnalyticsCard(detail, aggregated);
    }

    attachLeadSelectionHandlers();
};
