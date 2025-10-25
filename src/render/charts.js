import { MOCK_DATA } from '/src/data/index.js';
import { appState } from '/src/state/appState.js';
import { buildHash } from '/src/state/navigation.js';
import { formatCurrency } from '/src/render/utils.js';
import { getIcon } from '/src/ui/icons.js';

let analyticsManagerChart;
let analyticsSourcesChart;
let salesStageChart;

let analyticsFiltersBound = false;
let salesFiltersBound = false;

const parseDateInput = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const getBookingDate = (booking) => {
  if (!booking) return null;
  if (booking.startDate) {
    const composed = `${booking.startDate}${booking.startTime ? `T${booking.startTime}` : 'T00:00'}`;
    const parsed = new Date(composed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const resolveAnalyticsRange = (range, dateFrom, dateTo) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const bookingTimestamps = (MOCK_DATA.bookings || [])
    .map(getBookingDate)
    .filter(Boolean)
    .map(date => date.getTime());
  const maxBookingTs = bookingTimestamps.length ? Math.max(...bookingTimestamps) : null;

  let end = parseDateInput(dateTo, true);
  if (!end) {
    const targetTs = maxBookingTs && maxBookingTs > today.getTime() ? maxBookingTs : today.getTime();
    end = new Date(targetTs);
    end.setHours(23, 59, 59, 999);
  }

  let start = parseDateInput(dateFrom);
  if (!start) {
    const clone = new Date(end);
    const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
    clone.setDate(clone.getDate() - (days - 1));
    clone.setHours(0, 0, 0, 0);
    start = clone;
  }

  if (start > end) {
    return { start: end, end };
  }
  return { start, end };
};

const isDateWithinRange = (date, start, end) => {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const getFilteredBookings = (rangeBounds, segment, vehicleClass) => {
  const bookings = MOCK_DATA.bookings || [];
  const carsById = new Map((MOCK_DATA.cars || []).map(car => [car.id, car]));
  const normalizedSegment = segment?.toLowerCase();
  const pipeline = MOCK_DATA.salesPipeline || {};
  const leads = pipeline.leads || [];
  const ownerFilter = appState.currentRole === 'sales'
    ? (appState.filters.sales?.owner || 'all')
    : 'all';
  return bookings.filter(booking => {
    const startDate = getBookingDate(booking);
    if (!isDateWithinRange(startDate, rangeBounds.start, rangeBounds.end)) return false;

    if (normalizedSegment && normalizedSegment !== 'all') {
      const bookingSegment = (booking.segment || '').toLowerCase();
      if (bookingSegment !== normalizedSegment) return false;
    }

    if (vehicleClass && vehicleClass !== 'all') {
      const car = carsById.get(booking.carId);
      if (!car || car.class !== vehicleClass) return false;
    }

    if (ownerFilter !== 'all') {
      const bookingOwner = resolveBookingOwnerId(booking, leads) || 'unassigned';
      if (bookingOwner !== ownerFilter) return false;
    }

    return true;
  });
};

const resolveBookingOwnerId = (booking, leads) => {
  if (!booking) return null;
  if (booking.ownerId) return booking.ownerId;
  if (!Array.isArray(leads) || !leads.length) return null;
  const clientLeads = leads.filter(lead => Number(lead.clientId) === Number(booking.clientId));
  if (!clientLeads.length) return null;
  clientLeads.sort((a, b) => {
    const first = new Date(a.closedAt || a.expectedCloseDate || a.createdAt || 0).getTime();
    const second = new Date(b.closedAt || b.expectedCloseDate || b.createdAt || 0).getTime();
    return second - first;
  });
  return clientLeads[0].ownerId || null;
};

const getManagerRevenueBreakdown = (bookings) => {
  const pipeline = MOCK_DATA.salesPipeline || {};
  const owners = pipeline.owners || [];
  const leads = pipeline.leads || [];
  const ownerNameById = new Map(owners.map(owner => [owner.id, owner.name]));
  const totals = new Map();

  bookings.forEach(booking => {
    const ownerId = resolveBookingOwnerId(booking, leads) || 'unassigned';
    const current = totals.get(ownerId) || 0;
    totals.set(ownerId, current + (Number(booking.totalAmount) || 0));
  });

  return Array.from(totals.entries())
    .filter(([, value]) => value > 0)
    .map(([ownerId, value]) => ({
      ownerId,
      ownerName: ownerNameById.get(ownerId) || 'Unassigned',
      revenue: Math.round(value)
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

const getBookingSourcesBreakdown = (bookings) => {
  if (!bookings.length) return [];
  const counts = new Map();
  bookings.forEach(booking => {
    const rawSource = (booking.channel || 'Other').trim();
    const key = rawSource ? rawSource : 'Other';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
  if (!total) return [];
  return Array.from(counts.entries())
    .map(([source, count]) => ({
      source,
      share: count / total
    }))
    .sort((a, b) => b.share - a.share);
};

const getSalesRatingStats = (bookings) => {
  if (!bookings.length) {
    return { average: null, count: 0, coverage: 0, lastUpdated: null };
  }
  const ratedEntries = bookings
    .map(booking => {
      const rating = Number(booking.salesService?.rating);
      const ratedAt = booking.salesService?.ratedAt ? new Date(booking.salesService.ratedAt) : null;
      return { rating, ratedAt };
    })
    .filter(entry => Number.isFinite(entry.rating) && entry.rating > 0);
  if (!ratedEntries.length) {
    return { average: null, count: 0, coverage: 0, lastUpdated: null };
  }
  const summed = ratedEntries.reduce((sum, entry) => sum + entry.rating, 0);
  const lastUpdated = ratedEntries
    .map(entry => entry.ratedAt)
    .filter(date => date instanceof Date && !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
  return {
    average: summed / ratedEntries.length,
    count: ratedEntries.length,
    coverage: ratedEntries.length / bookings.length,
    lastUpdated
  };
};

const bindAnalyticsFilters = () => {
  if (analyticsFiltersBound) return;
  const rangeSelect = document.getElementById('analytics-range');
  const segmentSelect = document.getElementById('analytics-segment');
  const classSelect = document.getElementById('analytics-class');
  const dateFromInput = document.getElementById('analytics-date-from');
  const dateToInput = document.getElementById('analytics-date-to');

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
  if (dateFromInput) {
    dateFromInput.addEventListener('change', (event) => {
      appState.filters.analytics.dateFrom = event.target.value;
      renderAnalyticsPage();
    });
  }
  if (dateToInput) {
    dateToInput.addEventListener('change', (event) => {
      appState.filters.analytics.dateTo = event.target.value;
      renderAnalyticsPage();
    });
  }
  analyticsFiltersBound = true;
};

export const renderAnalyticsPage = () => {
  const managerCtx = document.getElementById('analytics-manager-chart')?.getContext('2d');
  if (!managerCtx) return;

  bindAnalyticsFilters();

  const { range, segment, vehicleClass, dateFrom, dateTo } = appState.filters.analytics;
  const rangeSelect = document.getElementById('analytics-range');
  const segmentSelect = document.getElementById('analytics-segment');
  const classSelect = document.getElementById('analytics-class');
  const dateFromInput = document.getElementById('analytics-date-from');
  const dateToInput = document.getElementById('analytics-date-to');

  if (rangeSelect) rangeSelect.value = range;
  if (segmentSelect) segmentSelect.value = segment;
  if (classSelect) classSelect.value = vehicleClass;
  if (dateFromInput) dateFromInput.value = dateFrom;
  if (dateToInput) dateToInput.value = dateTo;

  const rangeBounds = resolveAnalyticsRange(range, dateFrom, dateTo);
  const bookings = getFilteredBookings(rangeBounds, segment, vehicleClass);
  const ratingStats = getSalesRatingStats(bookings);
  const ratingValueEl = document.getElementById('analytics-average-rating');
  if (ratingValueEl) {
    ratingValueEl.textContent = ratingStats.count
      ? `${ratingStats.average.toFixed(1)}/10`
      : '—';
  }
  const ratingCaptionEl = document.getElementById('analytics-rating-caption');
  if (ratingCaptionEl) {
    ratingCaptionEl.textContent = ratingStats.count
      ? `${ratingStats.count} rated bookings (${Math.round(ratingStats.coverage * 100)}% coverage)`
      : 'No ratings in the selected range yet';
  }
  const ratingUpdatedEl = document.getElementById('analytics-rating-updated');
  if (ratingUpdatedEl) {
    ratingUpdatedEl.textContent = ratingStats.lastUpdated
      ? `Last update ${dateTimeFormatter.format(ratingStats.lastUpdated)}`
      : 'Waiting for first score';
  }
  const managerData = getManagerRevenueBreakdown(bookings);
  const managerLabels = managerData.map(item => item.ownerName);
  const managerValues = managerData.map(item => item.revenue);

  const resolvedLabels = managerLabels.length ? managerLabels : ['No data'];
  const resolvedValues = managerLabels.length ? managerValues : [0];

  if (analyticsManagerChart) analyticsManagerChart.destroy();
  analyticsManagerChart = new Chart(managerCtx, {
    type: 'bar',
    data: {
      labels: resolvedLabels,
      datasets: [
        {
          label: 'Expected revenue',
          data: resolvedValues,
          backgroundColor: '#111827',
          borderRadius: 6,
          maxBarThickness: 48
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatCurrency(context.parsed.y || 0)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => formatCurrency(value)
          }
        },
        x: { grid: { display: false } }
      }
    }
  });

  const sourcesCtx = document.getElementById('analytics-sources-chart')?.getContext('2d');
  if (sourcesCtx) {
    const sourcesData = getBookingSourcesBreakdown(bookings);
    const sourceLabels = sourcesData.length ? sourcesData.map(item => item.source) : ['No data'];
    const sourceValues = sourcesData.length ? sourcesData.map(item => +(item.share * 100).toFixed(1)) : [100];
    if (analyticsSourcesChart) analyticsSourcesChart.destroy();
    analyticsSourcesChart = new Chart(sourcesCtx, {
      type: 'doughnut',
      data: {
        labels: sourceLabels,
        datasets: [{
          data: sourceValues,
          backgroundColor: ['#111827', '#6366f1', '#0ea5e9', '#10b981', '#14b8a6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed}%`
            }
          }
        }
      }
    });
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

const calculateAge = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
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
  const statusLabel = client.status || '—';
  const companyLabel = client.company || lead?.company || '—';
  const rentalsAll = client.rentals || [];
  const rentals = rentalsAll.slice(0, 2);
  const rentalCount = rentalsAll.length;
  const documents = (detail && detail.documents && detail.documents.length)
    ? detail.documents
    : (client.documents || []);
  const financials = detail?.financials || client.financials;
  const payments = (client.payments || []).slice(0, 2);
  const ltvValue = formatCurrency(client.lifetimeValue || 0);
  const residency = detail?.profile?.residencyCountry || client.residencyCountry || '—';
  const birthDate = detail?.profile?.birthDate || client.birthDate || null;
  const birthDateLabel = birthDate ? formatDateShort(birthDate) : '—';
  const ageValue = birthDate ? calculateAge(birthDate) : null;
  const identitySummary = [
    `Residency country: ${residency}`,
    `Birth date: ${birthDateLabel}`,
    `Age: ${ageValue !== null ? `${ageValue} y.o.` : '—'}`
  ].join(' · ');

  const documentsHtml = documents.length
    ? documents.map(doc => {
      const documentNumber = doc.number || doc.id || '—';
      const expiryLabel = doc.expiry ? formatDateShort(doc.expiry) : '—';
      return `
                <li class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-sm font-semibold text-gray-900">${doc.name}</p>
                    <div class="mt-2 grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
                        <span>Document No.: ${documentNumber}</span>
                        <span>Expiry date: ${expiryLabel}</span>
                    </div>
                </li>
            `;
    }).join('')
    : '<li class="text-sm text-gray-500">No documents</li>';

  const rentalsHtml = rentals.length
    ? rentals.map(rental => {
      const bookingHash = buildHash(appState.currentRole, 'booking-detail', rental.bookingId);
      return `
                <li>
                    <a href="${bookingHash}" class="flex items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50">
                        <div>
                            <p class="text-sm font-medium text-gray-900">${rental.carName}</p>
                            <p class="text-xs text-gray-500">${formatDateShort(rental.startDate)} — ${formatDateShort(rental.endDate)} · ${rental.status}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-medium text-gray-600">${formatCurrency(rental.totalAmount || 0)}</span>
                            ${getIcon('chevronRight', 'w-4 h-4 text-gray-400')}
                        </div>
                    </a>
                </li>
            `;
    }).join('')
    : '<li class="text-sm text-gray-500">Rental history unavailable</li>';

  const paymentsHtml = payments.length
    ? payments.map(payment => `
            <li class="flex flex-col gap-0.5">
                <div class="flex items-center justify-between text-sm text-gray-700">
                    <span class="font-medium text-gray-800">${payment.type}</span>
                    <span>${formatCurrency(payment.amount || 0)}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>${payment.status || '—'}</span>
                    <span>${payment.date ? formatDateShort(payment.date) : ''}</span>
                </div>
            </li>
        `).join('')
    : '<li class="text-xs text-gray-500">No transactions</li>';

  const outstandingValue = formatCurrency((financials && financials.outstanding) ?? client.outstanding ?? 0);
  const lastSync = financials?.lastSync ? formatDateTimeValue(financials.lastSync) : '—';

  return `
        <div class="space-y-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="space-y-2">
                    ${companyLabel && companyLabel !== '—'
    ? `<p class="text-sm text-gray-500">${companyLabel}</p>`
    : ''}
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                            ${statusLabel}
                        </span>
                        <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            LTV ${ltvValue}
                        </span>
                    </div>
                </div>
                <button type="button" class="geist-button geist-button-secondary inline-flex items-center gap-2 text-sm shadow-sm hover:shadow-md transition">
                    ${getIcon('edit', 'w-4 h-4')}
                    <span>Редактировать</span>
                </button>
            </div>
            <div class="grid gap-4 lg:grid-cols-[1.1fr,1fr]">
                <div class="space-y-4">
                    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-gray-500">Contact</p>
                        <div class="mt-4 space-y-3 text-sm text-gray-700">
                            <p class="flex items-center gap-2">${getIcon('phone', 'w-4 h-4 text-gray-400')}<span>${client.phone || '—'}</span></p>
                            <p class="flex items-center gap-2">${getIcon('mail', 'w-4 h-4 text-gray-400')}<span>${client.email || '—'}</span></p>
                        </div>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="flex items-center justify-between">
                            <h5 class="text-xs uppercase text-gray-500 tracking-wide">Rental history</h5>
                            <span class="text-xs text-gray-400">${rentalCount} records</span>
                        </div>
                        <ul class="mt-3 space-y-2">${rentalsHtml}</ul>
                    </div>
                </div>
                <div class="space-y-4">
                    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="flex items-center justify-between">
                            <h5 class="text-xs uppercase text-gray-500 tracking-wide">Documents and validation</h5>
                        </div>
                        <p class="mt-2 text-xs text-gray-500">${identitySummary}</p>
                        <ul class="mt-3 space-y-3">${documentsHtml}</ul>
                    </div>
                    <div class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p class="text-xs uppercase text-gray-500 tracking-wide">Finances (Zoho)</p>
                                <p class="mt-2 text-sm text-gray-700">Outstanding balance: <span class="font-semibold text-gray-900">${outstandingValue}</span></p>
                                <p class="text-xs text-gray-400 mt-1">Synced: ${lastSync}</p>
                            </div>
                            <button type="button" class="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-slate-50">
                                ${getIcon('fileText', 'w-4 h-4 text-gray-500')}
                                <span>Скачать SOA</span>
                            </button>
                        </div>
                        <div>
                            <p class="text-xs uppercase text-gray-500 tracking-wide mb-2">Recent payments</p>
                            <ul class="space-y-2 text-xs text-gray-600">${paymentsHtml}</ul>
                        </div>
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

  if (ownerSelect && ownerSelect.dataset.globalHandler !== 'true') {
    ownerSelect.addEventListener('change', (event) => {
      appState.filters.sales.owner = event.target.value;
      renderSalesPipeline();
    });
  }

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

  const clientsById = new Map((MOCK_DATA.clients || []).map(client => [client.id, client]));
  const uniqueClientIds = Array.from(new Set(leads.map(lead => lead.clientId).filter(Boolean)));
  const outstandingTotal = uniqueClientIds.reduce((sum, clientId) => {
    const client = clientsById.get(clientId);
    return sum + (client?.outstanding || 0);
  }, 0);

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
      label: 'Outstanding',
      value: formatCurrency(outstandingTotal),
      helper: 'Client debt for selected portfolio',
      icon: 'creditCard'
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
