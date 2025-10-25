import { MOCK_DATA, getClientById } from '/src/data/index.js';
import { appState } from '/src/state/appState.js';
import { buildHash } from '/src/state/navigation.js';
import { formatCurrency, formatDateTime, formatRelativeTime, formatDateLabel } from '/src/render/formatters.js';
import { getIcon } from '/src/ui/icons.js';

const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const renderBookingDetail = (id) => {
  const booking = MOCK_DATA.bookings.find(b => b.id == id);
  if (!booking) return false;

  const client = getClientById(booking.clientId) || {};
  const dueAmount = (booking.totalAmount || 0) - (booking.paidAmount || 0);
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
  const canViewClientCard = appState.currentRole !== 'operations';
  const salesOwnerMap = Object.fromEntries((MOCK_DATA.salesPipeline?.owners || []).map(owner => [owner.id, owner.name]));
  const responsibleSalesPerson = booking.ownerId
    ? (salesOwnerMap[booking.ownerId] || booking.ownerId)
    : 'Unassigned';
  const clientDetailLink = clientId
    ? (canViewClientCard
      ? `<a href="${buildHash(appState.currentRole, 'client-detail', clientId)}" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">Open client card</a>`
      : '<span class="text-sm text-gray-400">Client card restricted</span>')
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
  const bookingIdRaw = String(booking.id ?? '');
  const bookingIdAttr = escapeHtml(bookingIdRaw);
  const bookingIdentifier = escapeHtml(booking.code || (bookingIdRaw ? `#${bookingIdRaw}` : 'Booking'));


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

  let paymentState = 'pending';
  let paymentCaption = dueAmount > 0 ? `Remaining ${formatCurrency(dueAmount)}` : 'All paid';
  if (dueAmount <= 0) {
    paymentState = 'done';
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

  const extensions = Array.isArray(booking.extensions) ? booking.extensions.slice() : [];

  const parseExtensionEdge = (extension, edge) => {
    if (!extension || typeof extension !== 'object') return null;
    const period = extension.period || {};
    if (typeof period[edge] === 'string') {
      const parsedPeriod = parseLooseDateTime(period[edge]);
      if (parsedPeriod) return parsedPeriod;
    }
    if (period[`${edge}Date`]) {
      const parsedPeriodDate = parseDateTime(period[`${edge}Date`], period[`${edge}Time`]);
      if (parsedPeriodDate) return parsedPeriodDate;
    }
    if (extension[`${edge}Date`]) {
      const parsedDate = parseDateTime(extension[`${edge}Date`], extension[`${edge}Time`]);
      if (parsedDate) return parsedDate;
    }
    if (typeof extension[edge] === 'string') {
      const parsedValue = parseLooseDateTime(extension[edge]);
      if (parsedValue) return parsedValue;
    }
    if (typeof extension[`${edge}At`] === 'string') {
      return parseLooseDateTime(extension[`${edge}At`]);
    }
    return null;
  };

  const sortedExtensions = extensions.slice().sort((a, b) => {
    const aStart = parseExtensionEdge(a, 'start');
    const bStart = parseExtensionEdge(b, 'start');
    if (!aStart && !bStart) return 0;
    if (!aStart) return 1;
    if (!bStart) return -1;
    return aStart.getTime() - bStart.getTime();
  });

  const extensionStatusMeta = {
    confirmed: { label: 'Confirmed', tone: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
    invoiced: { label: 'Invoiced', tone: 'border border-indigo-200 bg-indigo-50 text-indigo-700' },
    settlement: { label: 'Settlement', tone: 'border border-sky-200 bg-sky-50 text-sky-700' },
    draft: { label: 'Draft', tone: 'border border-slate-200 bg-slate-100 text-slate-700' },
    cancelled: { label: 'Cancelled', tone: 'border border-rose-200 bg-rose-50 text-rose-700' },
    pending: { label: 'Pending', tone: 'border border-amber-200 bg-amber-50 text-amber-700' },
    default: { label: 'Active', tone: 'border border-slate-200 bg-slate-100 text-slate-700' }
  };

  const getExtensionStatusMeta = (status) => extensionStatusMeta[normalizeStatus(status)] || extensionStatusMeta.default;

  const extensionStats = sortedExtensions.reduce((acc, extension) => {
    const statusKey = normalizeStatus(extension.status || 'draft');
    acc.statusCounts[statusKey] = (acc.statusCounts[statusKey] || 0) + 1;
    const totalAmount = Number(extension.pricing?.total ?? extension.pricing?.amount ?? 0) || 0;
    const paidAmount = Number(extension.payments?.paidAmount ?? 0) || 0;
    const outstandingRaw = extension.payments?.outstandingAmount;
    const outstandingAmount = Number.isFinite(Number(outstandingRaw))
      ? Number(outstandingRaw)
      : Math.max(totalAmount - paidAmount, 0);
    acc.totalAmount += totalAmount;
    acc.paidAmount += paidAmount;
    acc.outstandingAmount += outstandingAmount;
    const start = parseExtensionEdge(extension, 'start');
    const end = parseExtensionEdge(extension, 'end');
    if (start && (!acc.earliestStart || start < acc.earliestStart)) {
      acc.earliestStart = start;
    }
    if (end && (!acc.latestEnd || end > acc.latestEnd)) {
      acc.latestEnd = end;
    }
    if (end && statusKey !== 'cancelled' && (!acc.lastActiveEnd || end > acc.lastActiveEnd)) {
      acc.lastActiveEnd = end;
    }
    return acc;
  }, {
    totalAmount: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    statusCounts: {},
    earliestStart: null,
    latestEnd: null,
    lastActiveEnd: null
  });

  const activeExtension = sortedExtensions.find(extension => {
    const statusKey = normalizeStatus(extension.status);
    if (statusKey === 'cancelled') return false;
    const start = parseExtensionEdge(extension, 'start');
    const end = parseExtensionEdge(extension, 'end');
    if (!start || !end) return false;
    return now >= start && now <= end;
  }) || null;

  const upcomingExtension = sortedExtensions.find(extension => {
    const statusKey = normalizeStatus(extension.status);
    if (statusKey === 'cancelled') return false;
    const start = parseExtensionEdge(extension, 'start');
    if (!start) return false;
    return start > now;
  }) || null;

  const statusOrder = ['confirmed', 'invoiced', 'settlement', 'draft', 'cancelled'];
  const statusSummaryParts = statusOrder
    .filter(status => extensionStats.statusCounts[status])
    .map(status => {
      const meta = getExtensionStatusMeta(status);
      return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.tone}">${escapeHtml(meta.label)} · ${extensionStats.statusCounts[status]}</span>`;
    });
  const otherStatusParts = Object.keys(extensionStats.statusCounts)
    .filter(status => !statusOrder.includes(status))
    .map(status => {
      const meta = getExtensionStatusMeta(status);
      return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.tone}">${escapeHtml(meta.label)} · ${extensionStats.statusCounts[status]}</span>`;
    });
  const extensionStatusSummaryHtml = [...statusSummaryParts, ...otherStatusParts].join('') || '<span class="text-xs text-gray-400">No extensions yet</span>';

  const extensionTotalsHtml = sortedExtensions.length
    ? `
                            <div class="grid gap-3 text-sm text-gray-700 md:grid-cols-3">
                                <div>
                                    <p class="text-xs font-medium text-gray-500">Revenue</p>
                                    <p class="text-sm font-semibold text-gray-900">${formatCurrency(extensionStats.totalAmount)}</p>
                                </div>
                                <div>
                                    <p class="text-xs font-medium text-gray-500">Outstanding</p>
                                    <p class="text-sm font-semibold ${extensionStats.outstandingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}">${formatCurrency(extensionStats.outstandingAmount)}</p>
                                </div>
                                <div>
                                    <p class="text-xs font-medium text-gray-500">Paid</p>
                                    <p class="text-sm font-semibold text-gray-900">${formatCurrency(extensionStats.paidAmount)}</p>
                                </div>
                            </div>
                        `
    : '<p class="text-sm text-gray-500">No extension revenue yet.</p>';

  const activeBanner = activeExtension
    ? `
                            <div class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                ${getIcon('clock', 'w-4 h-4')}
                                <span>Active extension through ${escapeHtml(formatDateLabel(parseExtensionEdge(activeExtension, 'end') || returnDateTime || new Date()))}</span>
                            </div>
                        `
    : '';

  const upcomingBanner = !activeExtension && upcomingExtension
    ? `
                            <div class="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                                ${getIcon('calendar', 'w-4 h-4')}
                                <span>Next extension starts ${escapeHtml(formatDateLabel(parseExtensionEdge(upcomingExtension, 'start')))}</span>
                            </div>
                        `
    : '';

  const extensionSummaryHtml = sortedExtensions.length
    ? `
                        <div class="space-y-3">
                            ${extensionTotalsHtml}
                            <div class="flex flex-wrap gap-2">${extensionStatusSummaryHtml}</div>
                            ${activeBanner || upcomingBanner}
                            ${extensionStats.lastActiveEnd ? `<p class="text-xs text-gray-500">Coverage extended until ${escapeHtml(formatDateLabel(extensionStats.lastActiveEnd))}</p>` : ''}
                        </div>
                    `
    : `
                        <div class="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 px-3 py-3 text-sm text-indigo-700">
                            Extensions let you append extra rental days without touching the original invoice. Use the planner below to propose a new period.
                        </div>
                    `;

  const formatInputDate = (date) => {
    if (!date || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatInputTime = (date) => {
    if (!date || Number.isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const lastExtensionEnd = sortedExtensions.reduce((latest, extension) => {
    const end = parseExtensionEdge(extension, 'end');
    if (!end) return latest;
    if (!latest || end > latest) return end;
    return latest;
  }, returnDateTime);

  const defaultPlannerStart = lastExtensionEnd
    ? new Date(lastExtensionEnd.getTime())
    : (returnDateTime ? new Date(returnDateTime.getTime()) : new Date());
  if (defaultPlannerStart) {
    defaultPlannerStart.setSeconds(0, 0);
  }

  const defaultPlannerEnd = defaultPlannerStart
    ? new Date(defaultPlannerStart.getTime() + 48 * 3600000)
    : null;

  const plannerDefaults = {
    startDate: formatInputDate(defaultPlannerStart),
    startTime: formatInputTime(defaultPlannerStart) || '09:00',
    endDate: formatInputDate(defaultPlannerEnd),
    endTime: formatInputTime(defaultPlannerEnd) || '18:00'
  };

  const baseDurationMs = pickupDateTime && returnDateTime ? Math.max(returnDateTime.getTime() - pickupDateTime.getTime(), 0) : 0;
  const baseDurationDays = baseDurationMs ? Math.max(Math.ceil(baseDurationMs / 86400000), 1) : 1;
  const averageDailyRate = baseDurationDays ? (booking.billing?.base || booking.totalAmount || 0) / baseDurationDays : (booking.billing?.base || 0);
  const defaultBaseAmount = Math.round(averageDailyRate || booking.billing?.base || 0);
  const lastExtension = sortedExtensions.length ? sortedExtensions[sortedExtensions.length - 1] : null;
  const defaultAddonsAmount = Number(lastExtension?.pricing?.addons ?? booking.billing?.addons ?? 0) || 0;
  const defaultFeesAmount = Number(lastExtension?.pricing?.fees ?? 0) || 0;

  const plannerBaseAmount = Number.isFinite(Number(defaultBaseAmount)) ? Number(defaultBaseAmount) : 0;
  const plannerAddonsAmount = Number.isFinite(Number(defaultAddonsAmount)) ? Number(defaultAddonsAmount) : 0;
  const plannerFeesAmount = Number.isFinite(Number(defaultFeesAmount)) ? Number(defaultFeesAmount) : 0;
  const plannerTotalAmount = plannerBaseAmount + plannerAddonsAmount + plannerFeesAmount;

  const extensionPlannerHtml = `
                        <div class="extension-planner hidden rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4" data-booking-id="${bookingIdAttr}">
                            <div class="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h4 class="font-semibold text-indigo-800">New extension</h4>
                                    <p class="text-xs text-indigo-700">Current booking ends ${returnDateTime ? escapeHtml(formatDateLabel(returnDateTime)) : '—'}</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button type="button" class="geist-button geist-button-tertiary text-xs extension-planner-cancel">Close</button>
                                </div>
                            </div>
                            <div class="mt-4 grid gap-4 md:grid-cols-2">
                                <label class="space-y-1 text-xs font-medium text-gray-600">
                                    <span>Start date</span>
                                    <input type="date" class="extension-input w-full rounded-md border border-gray-300 px-3 py-2 text-sm" data-extension-field="startDate" value="${escapeHtml(plannerDefaults.startDate)}">
                                </label>
                                <label class="space-y-1 text-xs font-medium text-gray-600">
                                    <span>Start time</span>
                                    <input type="time" class="extension-input w-full rounded-md border border-gray-300 px-3 py-2 text-sm" data-extension-field="startTime" value="${escapeHtml(plannerDefaults.startTime)}">
                                </label>
                                <label class="space-y-1 text-xs font-medium text-gray-600">
                                    <span>End date</span>
                                    <input type="date" class="extension-input w-full rounded-md border border-gray-300 px-3 py-2 text-sm" data-extension-field="endDate" value="${escapeHtml(plannerDefaults.endDate)}">
                                </label>
                                <label class="space-y-1 text-xs font-medium text-gray-600">
                                    <span>End time</span>
                                    <input type="time" class="extension-input w-full rounded-md border border-gray-300 px-3 py-2 text-sm" data-extension-field="endTime" value="${escapeHtml(plannerDefaults.endTime)}">
                                </label>
                            </div>
                            <div class="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <label class="space-y-1 text-xs font-medium text-gray-600">
                                    <span>Base amount</span>
                                    <input type="number" min="0" step="1" class="extension-input w-full rounded-md border border-gray-300 px-3 py-2 text-sm" data-extension-field="baseAmount" value="${escapeHtml(String(plannerBaseAmount || ''))}">
                                </label>
                                <label class="space-y-1 text-xs font-medium text-gray-600">
                                    <span>Add-ons</span>
                                    <input type="number" min="0" step="1" class="extension-input w-full rounded-md border border-gray-300 px-3 py-2 text-sm" data-extension-field="addonsAmount" value="${escapeHtml(String(plannerAddonsAmount || ''))}">
                                </label>
                                <label class="space-y-1 text-xs font-medium text-gray-600">
                                    <span>Fees</span>
                                    <input type="number" min="0" step="1" class="extension-input w-full rounded-md border border-gray-300 px-3 py-2 text-sm" data-extension-field="feesAmount" value="${escapeHtml(String(plannerFeesAmount || ''))}">
                                </label>
                                <label class="space-y-1 text-xs font-medium text-gray-600">
                                    <span>Discounts</span>
                                    <input type="number" min="0" step="1" class="extension-input w-full rounded-md border border-gray-300 px-3 py-2 text-sm" data-extension-field="discountsAmount" value="0">
                                </label>
                            </div>
                            <div class="mt-3 rounded-lg border border-indigo-100 bg-white px-3 py-3 text-sm text-gray-700">
                                <div class="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <p class="text-xs font-medium text-gray-500">Total</p>
                                        <p class="text-sm font-semibold text-gray-900" data-role="extension-total">${formatCurrency(plannerTotalAmount)}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs font-medium text-gray-500">Outstanding</p>
                                        <p class="text-sm font-semibold text-amber-600" data-role="extension-outstanding">${formatCurrency(plannerTotalAmount)}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs font-medium text-gray-500">New end date</p>
                                        <p class="text-sm font-semibold text-gray-900" data-role="extension-end-preview">${plannerDefaults.endDate ? escapeHtml(`${plannerDefaults.endDate} ${plannerDefaults.endTime}`.trim()) : '—'}</p>
                                    </div>
                                </div>
                                <div class="mt-3 flex items-center gap-2 text-xs">
                                    <label class="inline-flex items-center gap-2 text-gray-600">
                                        <input type="checkbox" class="extension-input h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" data-extension-field="maintenanceSlot">
                                        <span>Insert maintenance buffer if gap detected</span>
                                    </label>
                                </div>
                            </div>
                            <div class="mt-4 space-y-3">
                                <label class="block text-xs font-medium text-gray-600">
                                    <span>Notes for team</span>
                                    <textarea class="extension-input mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows="2" data-extension-field="notes" placeholder="Reason, upsell context, deposit instructions"></textarea>
                                </label>
                                <div class="extension-conflict-alert hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700" data-role="conflict"></div>
                            </div>
                            <div class="mt-4 flex flex-wrap justify-between gap-3">
                                <p class="text-xs text-gray-500">Extension will create a separate invoice; base booking totals stay unchanged.</p>
                                <div class="flex flex-wrap gap-2">
                                    <button type="button" class="geist-button geist-button-secondary text-sm extension-planner-cancel">Cancel</button>
                                    <button type="button" class="geist-button geist-button-primary text-sm extension-confirm-btn" data-booking-id="${bookingIdAttr}">Confirm extension</button>
                                </div>
                            </div>
                        </div>
                    `;

  const extensionCardsHtml = sortedExtensions.map((extension, index) => {
    const statusMeta = getExtensionStatusMeta(extension.status);
    const start = parseExtensionEdge(extension, 'start');
    const end = parseExtensionEdge(extension, 'end');
    const periodLabel = start && end
      ? `${formatDateLabel(start)} → ${formatDateLabel(end)}`
      : (start ? `${formatDateLabel(start)} onwards` : 'Period not scheduled');
    const relativeStart = start ? formatRelativeTime(start) : '';
    const totalAmount = Number(extension.pricing?.total ?? extension.pricing?.amount ?? 0) || 0;
    const baseAmount = Number(extension.pricing?.base ?? 0) || 0;
    const addonsAmount = Number(extension.pricing?.addons ?? 0) || 0;
    const feesAmount = Number(extension.pricing?.fees ?? 0) || 0;
    const discountsAmount = Number(extension.pricing?.discounts ?? 0) || 0;
    const paidAmount = Number(extension.payments?.paidAmount ?? 0) || 0;
    const outstandingAmountRaw = extension.payments?.outstandingAmount;
    const outstandingAmount = Number.isFinite(Number(outstandingAmountRaw))
      ? Number(outstandingAmountRaw)
      : Math.max(totalAmount - paidAmount, 0);
    const depositAdjustment = Number(extension.payments?.depositAdjustment ?? extension.depositAdjustment ?? 0) || 0;
    const isActive = activeExtension && activeExtension.id === extension.id;
    const cardTone = isActive ? 'border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-white';
    const noteBlock = extension.note ? `<p class="mt-2 text-sm text-gray-600">${escapeHtml(extension.note)}</p>` : '';
    const tasks = Array.isArray(extension.tasks) ? extension.tasks : [];
    const tasksBlock = tasks.length
      ? `<p class="mt-3 text-xs text-gray-500">Ops tasks: ${tasks.map(task => `${escapeHtml(task.title)} (${escapeHtml(normalizeStatus(task.status || 'todo'))})`).join(', ')}</p>`
      : '';
    const riskFlags = Array.isArray(extension.riskFlags) ? extension.riskFlags : [];
    const riskBlock = riskFlags.length
      ? `<div class="mt-3 flex flex-wrap gap-2">${riskFlags.map(flag => `<span class="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">${escapeHtml(flag.replace(/[-_]/g, ' '))}</span>`).join('')}</div>`
      : '';
    const invoiceButton = extension.invoiceId
      ? `<button type="button" class="geist-button geist-button-secondary geist-button-compact text-xs extension-view-invoice" data-invoice-id="${escapeHtml(extension.invoiceId)}">${getIcon('fileText', 'w-3.5 h-3.5')}<span>View invoice</span></button>`
      : '';
    const addendumDoc = Array.isArray(booking.documents)
      ? booking.documents.find(doc => doc.type === 'extension-addendum')
      : null;
    const addendumLabel = addendumDoc && addendumDoc.status && ['signed', 'approved'].includes(normalizeStatus(addendumDoc.status))
      ? 'Download addendum'
      : 'Open addendum';
    const addendumButton = addendumDoc
      ? `<button type="button" class="geist-button geist-button-secondary geist-button-compact text-xs extension-download-addendum" data-extension-id="${escapeHtml(extension.id)}" data-doc-url="${escapeHtml(addendumDoc?.url || '')}" ${addendumDoc?.url ? '' : 'disabled'}>${getIcon('fileText', 'w-3.5 h-3.5')}<span>${escapeHtml(addendumLabel)}</span></button>`
      : '';
    const cancelButton = normalizeStatus(extension.status) !== 'cancelled'
      ? `<button type="button" class="geist-button geist-button-tertiary geist-button-compact text-xs extension-cancel-btn" data-extension-id="${escapeHtml(extension.id)}">${getIcon('x', 'w-3.5 h-3.5')}<span>Cancel extension</span></button>`
      : '';
    const outstandingTone = outstandingAmount > 0 ? 'text-amber-600' : 'text-emerald-600';
    return `
                                <div class="rounded-xl border ${cardTone} p-4 transition">
                                    <div class="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p class="text-sm font-semibold text-gray-900">${escapeHtml(extension.label || `Extension #${index + 1}`)}</p>
                                            <p class="text-xs text-gray-500">${escapeHtml(periodLabel)}${relativeStart ? ` · ${escapeHtml(relativeStart)}` : ''}</p>
                                        </div>
                                        <span class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.tone}">${escapeHtml(statusMeta.label)}</span>
                                    </div>
                                    <div class="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-3">
                                        <div>
                                            <p class="text-xs font-medium text-gray-500">Revenue</p>
                                            <p class="text-sm font-semibold text-gray-900">${formatCurrency(totalAmount)}</p>
                                            <p class="text-[12px] text-gray-500">Base ${formatCurrency(baseAmount)} · Add-ons ${formatCurrency(addonsAmount)}${feesAmount ? ` · Fees ${formatCurrency(feesAmount)}` : ''}${discountsAmount ? ` · Discounts -${formatCurrency(discountsAmount)}` : ''}</p>
                                        </div>
                                        <div>
                                            <p class="text-xs font-medium text-gray-500">Payments</p>
                                            <p class="text-sm font-semibold text-gray-900">Paid ${formatCurrency(paidAmount)}</p>
                                            <p class="text-[12px] ${outstandingTone}">Outstanding ${formatCurrency(outstandingAmount)}</p>
                                            ${depositAdjustment ? `<p class="text-[12px] text-indigo-600">Deposit adj. ${formatCurrency(depositAdjustment)}</p>` : ''}
                                        </div>
                                        <div>
                                            <p class="text-xs font-medium text-gray-500">Fleet</p>
                                            ${tasksBlock || '<p class="text-[12px] text-gray-400">No linked tasks</p>'}
                                            ${riskBlock}
                                        </div>
                                    </div>
                                    ${noteBlock}
                                    <div class="mt-4 flex flex-wrap gap-2">
                                        ${invoiceButton}
                                        ${addendumButton}
                                        ${cancelButton}
                                    </div>
                                </div>
                            `;
  }).join('');

  const extensionListHtml = extensionCardsHtml
    ? `<div class="space-y-3">${extensionCardsHtml}</div>`
    : `
                        <div class="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-500">
                            No extensions scheduled yet. Launch the planner to propose one for the client.
                        </div>
                    `;

  const extensionSectionHtml = `
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl">
                                        <div class="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 class="font-semibold text-gray-800">Extensions</h3>
                                                <p class="text-xs text-gray-500">Manage add-on rental periods without altering the base booking.</p>
                                            </div>
                                            <button type="button" class="geist-button geist-button-primary text-sm inline-flex items-center gap-2 booking-extend-btn" data-booking-id="${bookingIdAttr}">
                                                ${getIcon('calendar', 'w-4 h-4')}
                                                <span>Extend booking</span>
                                            </button>
                                        </div>
                                        <div class="mt-4 space-y-4">
                                            ${extensionSummaryHtml}
                                            ${extensionPlannerHtml}
                                            ${extensionListHtml}
                                        </div>
                                    </div>
                                `;

  const depositStatus = booking.deposit ? 'Not captured' : '—';
  const depositClass = normalizeStatus(depositStatus) === 'authorized' ? 'text-emerald-600' : 'text-gray-700';

  const paymentAlerts = ['<li class="text-xs text-emerald-600">No payment alerts</li>'];

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
    ensureHistoryEntry(`Deposit received ${formatCurrency(booking.deposit)}`, booking.startDate || '—');
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

  const content = `
                    <div class="p-6 border-b bg-slate-50/40" data-booking-id="${bookingIdAttr}">
                        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div class="space-y-3">
                                <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-md bg-white text-gray-700 border border-gray-200">Booking ${bookingIdentifier}</span>
                                </div>
                                <h2 class="text-2xl font-semibold text-gray-900">${escapeHtml(booking.carName)}</h2>
                                <p class="text-sm text-gray-500">${escapeHtml(client.name || booking.clientName)}</p>
                            </div>
                            <div class="space-y-3 text-right">
                                <div class="flex flex-wrap justify-end gap-2">
                                    <button type="button" class="geist-button geist-button-primary text-sm inline-flex items-center gap-2 booking-extend-btn" data-booking-id="${bookingIdAttr}">
                                        ${getIcon('calendar', 'w-4 h-4')}
                                        <span>Extend booking</span>
                                    </button>
                                    <button type="button" class="geist-button geist-button-secondary text-sm inline-flex items-center gap-2 booking-edit-btn" data-booking-id="${bookingIdAttr}">
                                        ${getIcon('edit', 'w-4 h-4')}
                                        <span>Редактировать букинг</span>
                                    </button>
                                </div>
                                <div>
                                    <p class="text-xs uppercase tracking-wide text-gray-500">Outstanding</p>
                                    <p class="text-2xl font-semibold ${dueAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}">${formatCurrency(dueAmount)}</p>
                                    <p class="text-xs text-gray-500">Paid ${formatCurrency(booking.paidAmount)}</p>
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
                                    ${extensionSectionHtml}
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
                                                    <p class="text-sm text-gray-900">${formatCurrency(client.lifetimeValue || client.turnover || 0)}</p>
                                                    <p class="text-xs text-gray-500">Outstanding: ${formatCurrency(client.outstanding || 0)}</p>
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
                                                    <p class="text-base font-semibold text-gray-900 mt-1">${formatCurrency(booking.paidAmount)}</p>
                                                </div>
                                                <div class="rounded-lg border border-gray-200 px-3 py-2">
                                                    <p class="text-xs uppercase tracking-wide text-gray-500">Outstanding</p>
                                                    <p class="text-base font-semibold ${dueAmount > 0 ? 'text-amber-600' : 'text-emerald-600'} mt-1">${formatCurrency(dueAmount)}</p>
                                                </div>
                                                <div class="rounded-lg border border-gray-200 px-3 py-2">
                                                    <p class="text-xs uppercase tracking-wide text-gray-500">Deposit</p>
                                                    <p class="text-base font-semibold text-gray-900 mt-1">${formatCurrency(booking.deposit)}</p>
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
                                                <h4 class="font-medium text-sm text-gray-700 mb-2">Generate payment link</h4>
                                                <div class="space-y-3">
                                                    <input type="number" value="${Math.max(dueAmount, 0)}" placeholder="Amount" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md stripe-amount-input">
                                                    <input type="text" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md stripe-reason-select" placeholder="Payment type">
                                                    <button type="button" class="w-full geist-button geist-button-secondary text-sm generate-stripe-link" data-booking-id="${booking.id}">Create payment</button>
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
                                        <h3 class="font-semibold text-gray-800 mb-3">History</h3>
                                        <ul class="space-y-3">
                                            ${bookingHistoryHtml}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;

  return content;
};
