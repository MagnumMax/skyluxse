import { MOCK_DATA, getClientById, ROLES_CONFIG } from '../data/index.js';
import { appState } from '../state/appState.js';
import { buildHash } from '../state/navigation.js';
import { formatCurrency, formatDateTime, formatRelativeTime, formatDateLabel } from './formatters.js';
import { getIcon } from '../ui/icons.js';
import { getSalesRatingMeta } from './utils.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Рендерит карточку деталей букинга
 * @param {string|number} id
 * @returns {string|false}
 */
export const renderBookingDetail = (id) => {
  /** @type {any|null} */
  const booking = (MOCK_DATA.bookings || []).find(b => b.id == id) || null;
  if (!booking) return false;

  /** @type {any} */
  const client = getClientById(booking.clientId) || {};
  const dueAmount = (booking.totalAmount || 0) - (booking.paidAmount || 0);
  /**
   * @param {string|undefined|null} label
   * @returns {string}
   */
  const formatLocationLink = (label) => {
    if (!label) {
      return '<span class="text-gray-400">—</span>';
    }
    const encoded = encodeURIComponent(label);
    return `<span class="min-w-0 max-w-full"><a href="https://www.google.com/maps/search/?api=1&query=${encoded}" target="_blank" rel="noopener" class="inline-block max-w-full break-words text-blue-600 hover:underline">${label}</a></span>`;
  };
  /** @type {any|null} */
  const assignedDriver = booking.driverId
    ? MOCK_DATA.drivers.find(d => Number(d.id) === Number(booking.driverId))
    : null;

  const clientId = client.id || booking.clientId;
  const canViewClientCard = appState.currentRole !== 'operations';
  /** @type {Record<string,string>} */
  const salesOwnerMap = Object.fromEntries((MOCK_DATA.salesPipeline?.owners || []).map(owner => [owner.id, owner.name]));
  const responsibleSalesPerson = booking.ownerId
    ? (salesOwnerMap[booking.ownerId] || booking.ownerId)
    : 'Unassigned';
  const clientDetailLink = clientId
    ? (canViewClientCard
      ? `<a href="${buildHash(appState.currentRole, 'client-detail', clientId)}" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">Open client card</a>`
      : '<span class="text-sm text-gray-400">Client card restricted</span>')
    : '';

  /**
   * @param {unknown} value
   * @returns {string}
   */
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

  /**
   * @param {unknown} value
   * @returns {string}
   */
  const formatFuelValue = (value) => {
    if (value === 0) return '0';
    if (value == null) return '—';
    const str = String(value).trim();
    return str.length ? str : '—';
  };

  /**
   * @param {string|undefined|null} dateStr
   * @param {string|undefined|null} timeStr
   * @returns {Date|null}
   */
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

  /**
   * @param {string|undefined|null} value
   * @returns {Date|null}
   */
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

  const salesService = booking.salesService || {};
  const ratingMeta = getSalesRatingMeta(salesService.rating);
  const ratingCommentRaw = (salesService.feedback || '').trim();
  const ratingComment = ratingCommentRaw || 'No comment shared yet.';
  const ratingUpdatedDate = salesService.ratedAt ? parseLooseDateTime(salesService.ratedAt) : null;
  const ratingUpdatedLabel = ratingUpdatedDate ? formatDateLabel(ratingUpdatedDate) : '—';
  const ratedByRoleId = salesService.ratedBy || '';
  const ratedByLabel = ratedByRoleId
    ? (ROLES_CONFIG[ratedByRoleId]?.label || ratedByRoleId)
    : 'CEO';
  const isCeo = appState.currentRole === 'ceo';
  const ratingInputDefault = Math.min(10, Math.max(1, ratingMeta.value || 8));
  const ratingLiveLabel = ratingMeta.value ? `${ratingMeta.value}/10` : `${ratingInputDefault}/10`;
  const ratingUpdatedCopy = ratingUpdatedLabel !== '—'
    ? `Updated ${ratingUpdatedLabel}`
    : 'Awaiting first score';
  const ratingOwnerCopy = ratingUpdatedLabel !== '—' && ratedByLabel
    ? `by ${ratedByLabel}`
    : '';
  const salesRatingControls = isCeo
    ? `
            <div class="mt-4 space-y-3" data-booking-id="${bookingIdAttr}">
                <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Adjust score</label>
                <input type="range" min="1" max="10" value="${ratingInputDefault}" class="sales-rating-input w-full accent-indigo-600" aria-label="Sales service rating">
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>Selected score</span>
                    <span class="text-sm font-semibold text-gray-900" data-role="sales-rating-value">${ratingLiveLabel}</span>
                </div>
                <textarea class="sales-rating-comment w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200" rows="3" placeholder="Short note for sales">${escapeHtml(ratingCommentRaw)}</textarea>
                <button type="button" class="geist-button geist-button-primary text-sm sales-rating-submit" data-booking-id="${bookingIdAttr}">Share with sales</button>
            </div>
        `
    : '';

  const now = new Date();
  const pickupDateTime = parseDateTime(booking.startDate, booking.startTime);
  const returnDateTime = parseDateTime(booking.endDate, booking.endTime);
  /**
   * @param {string|undefined|null} status
   * @returns {string}
   */
  const normalizeStatus = (status) => (status || '').toLowerCase();
  const bookingIdRaw = String(booking.id ?? '');
  const bookingIdAttr = escapeHtml(bookingIdRaw);
  const bookingIdentifier = escapeHtml(booking.code || (bookingIdRaw ? `#${bookingIdRaw}` : 'Booking'));


  // Removed unused variables to satisfy linting rules

  const bookingStatus = normalizeStatus(booking.status);
  /** @type {Array<any>} */
  const timelineItems = Array.isArray(booking.timeline) ? booking.timeline : [];
  /**
   * @param {string} status
   * @returns {any|null}
   */
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

  // Removed unused closure state/caption variables (computed but not used)

  const pickupMeta = (() => {
    if (!pickupDateTime) return null;
    const diffMs = pickupDateTime.getTime() - now.getTime();
    let toneClass = 'sl-pill sl-pill-compact sl-pill-neutral';
    if (diffMs < 0) {
      toneClass = 'sl-pill sl-pill-compact sl-pill-danger';
    } else if (diffMs <= 2 * 3600000) {
      toneClass = 'sl-pill sl-pill-compact sl-pill-warning';
    } else if (diffMs <= 12 * 3600000) {
      toneClass = 'sl-pill sl-pill-compact sl-pill-info';
    }
    return {
      toneClass,
      relative: formatRelativeTime(pickupDateTime),
      absolute: formatDateLabel(pickupDateTime)
    };
  })();

  const returnMeta = (() => {
    if (!returnDateTime) return null;
    const diffMs = returnDateTime.getTime() - now.getTime();
    let textClass = 'text-muted-foreground';
    let chipClass = 'sl-pill sl-pill-compact sl-pill-neutral';
    if (diffMs < 0) {
      textClass = 'text-destructive';
      chipClass = 'sl-pill sl-pill-compact sl-pill-danger';
    } else if (diffMs <= 6 * 3600000) {
      textClass = 'text-amber-600';
      chipClass = 'sl-pill sl-pill-compact sl-pill-warning';
    }
    return {
      toneClass: chipClass,
      textClass,
      relative: formatRelativeTime(returnDateTime),
      absolute: formatDateLabel(returnDateTime)
    };
  })();

  /** @type {Array<any>} */
  const extensions = Array.isArray(booking.extensions) ? booking.extensions.slice() : [];

  /**
   * @param {any} extension
   * @param {string} edge
   * @returns {Date|null}
   */
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

  /** @type {Record<string, {label:string, tone:string}>} */
  const extensionStatusMeta = {
    confirmed: { label: 'Confirmed', tone: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
    invoiced: { label: 'Invoiced', tone: 'border border-indigo-200 bg-indigo-50 text-indigo-700' },
    settlement: { label: 'Settlement', tone: 'border border-sky-200 bg-sky-50 text-sky-700' },
    draft: { label: 'Draft', tone: 'border border-slate-200 bg-slate-100 text-slate-700' },
    cancelled: { label: 'Cancelled', tone: 'border border-rose-200 bg-rose-50 text-rose-700' },
    pending: { label: 'Pending', tone: 'border border-amber-200 bg-amber-50 text-amber-700' },
    default: { label: 'Active', tone: 'border border-slate-200 bg-slate-100 text-slate-700' }
  };

  /**
   * @param {string|undefined|null} status
   * @returns {{label:string, tone:string}}
   */
  const getExtensionStatusMeta = (status) => extensionStatusMeta[normalizeStatus(status)] || extensionStatusMeta.default;

  /** @type {{
   * totalAmount:number,
   * paidAmount:number,
   * outstandingAmount:number,
   * statusCounts: Record<string, number>,
   * earliestStart: Date|null,
   * latestEnd: Date|null,
   * lastActiveEnd: Date|null
   * }} */
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

  // Ensure we don't pass null into formatDateLabel for upcoming extension start
  /** @type {Date|null} */
  const upcomingStart = upcomingExtension ? parseExtensionEdge(upcomingExtension, 'start') : null;

  const upcomingBanner = !activeExtension && upcomingExtension
    ? `
                            <div class="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                                ${getIcon('calendar', 'w-4 h-4')}
                                <span>Next extension starts ${escapeHtml(upcomingStart ? formatDateLabel(upcomingStart) : '—')}</span>
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
    : '';

  /**
   * @param {Date|null} date
   * @returns {string}
   */
  const formatInputDate = (date) => {
    if (!date || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * @param {Date|null} date
   * @returns {string}
   */
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
  const plannerDefaultAmount = Number.isFinite(Number(defaultBaseAmount)) ? Number(defaultBaseAmount) : 0;
  const lastExtension = sortedExtensions.length ? sortedExtensions[sortedExtensions.length - 1] : null;
  const lastExtensionTotal = Number(lastExtension?.pricing?.total ?? lastExtension?.pricing?.amount ?? 0) || 0;
  const plannerRentalAmount = lastExtensionTotal > 0 ? Math.round(lastExtensionTotal) : plannerDefaultAmount;

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
                            <div class="mt-4">
                                <label class="space-y-1 text-xs font-medium text-gray-600">
                                    <span>Rental amount</span>
                                    <input type="number" min="0" step="1" class="extension-input w-full rounded-md border border-gray-300 px-3 py-2 text-sm" data-extension-field="rentalAmount" value="${escapeHtml(String(plannerRentalAmount || ''))}">
                                </label>
                            </div>
                            <div class="mt-3 rounded-lg border border-indigo-100 bg-white px-3 py-3 text-sm text-gray-700">
                                <div class="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <p class="text-xs font-medium text-gray-500">Total</p>
                                        <p class="text-sm font-semibold text-gray-900" data-role="extension-total">${formatCurrency(plannerRentalAmount)}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs font-medium text-gray-500">Outstanding</p>
                                        <p class="text-sm font-semibold text-amber-600" data-role="extension-outstanding">${formatCurrency(plannerRentalAmount)}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs font-medium text-gray-500">New end date</p>
                                        <p class="text-sm font-semibold text-gray-900" data-role="extension-end-preview">${plannerDefaults.endDate ? escapeHtml(`${plannerDefaults.endDate} ${plannerDefaults.endTime}`.trim()) : '—'}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-4 space-y-3">
                                <label class="block text-xs font-medium text-gray-600">
                                    <span>Notes for team</span>
                                    <textarea class="extension-input mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows="2" data-extension-field="notes" placeholder="Reason, upsell context, deposit instructions"></textarea>
                                </label>
                                <div class="extension-conflict-alert hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700" data-role="conflict"></div>
                            </div>
                            <div class="mt-4 flex flex-wrap justify-end gap-3">
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
                                        <div class="mt-6 border-t border-gray-100 pt-5 space-y-4">
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
                                            <div class="space-y-4">
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
  /**
   * @param {string} event
   * @param {string|undefined} tsFallback
   * @returns {void}
   */
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

  /**
   * @param {{event:string, ts:string|undefined}} entry
   * @returns {{event:string, absolute:string, relative:string, tone:string}}
   */
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


  /** @type {Record<string,string>} */
  const timelineStatusLabels = {
    preparation: 'Preparation',
    delivery: 'Delivery',
    inspection: 'Inspection',
    default: 'Update'
  };

  /** @type {Record<string,string>} */
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


  const content = `
                    <div class="p-6 border-b border-border bg-card/60" data-booking-id="${bookingIdAttr}">
                        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div class="space-y-3">
                                <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                                    <span class="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 text-muted-foreground">Booking ${bookingIdentifier}</span>
                                </div>
                                <h2 class="text-2xl font-semibold text-foreground">${escapeHtml(booking.carName)}</h2>
                                <p class="text-sm text-muted-foreground">${escapeHtml(client.name || booking.clientName)}</p>
                            </div>
                            <div class="space-y-3 text-right">
                                <div class="flex flex-wrap justify-end gap-2">
                                    <button type="button" class="geist-button geist-button-secondary text-sm inline-flex items-center gap-2 booking-edit-btn" data-booking-id="${bookingIdAttr}">
                                        ${getIcon('edit', 'w-4 h-4')}
                                        <span>Редактировать букинг</span>
                                    </button>
                                </div>
                                <div>
                                    <p class="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</p>
                                    <p class="text-2xl font-semibold ${dueAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}">${formatCurrency(dueAmount)}</p>
                                    <p class="text-xs text-muted-foreground">Paid ${formatCurrency(booking.paidAmount)}</p>
                                </div>
                                ${pickupMeta ? `<div class="inline-flex max-w-xs flex-wrap items-center justify-end gap-2 ${pickupMeta.toneClass}"><span>Pickup ${escapeHtml(pickupMeta.relative || '')}</span><span class="text-[11px] opacity-70">${escapeHtml(pickupMeta.absolute)}</span></div>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="max-w-6xl mx-auto">
                            <div class="grid gap-6 xl:grid-cols-12">
                                <div class="xl:col-span-7">
                                    <div class="sl-card p-4 border border-border rounded-xl h-full">
                                        <h3 class="mb-4 text-lg font-semibold text-foreground">Timeline & logistics</h3>
                                        <div class="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
                                            <div>
                                                <p class="font-semibold text-muted-foreground">Pickup</p>
                                                <p class="mt-1 text-foreground">${formatDateTime(booking.startDate, booking.startTime)}</p>
                                                ${pickupMeta ? `<p class="text-xs text-muted-foreground">${escapeHtml(pickupMeta.relative || '')}</p>` : ''}
                                                <p class="mt-2 flex items-center gap-2">${getIcon('mapPin', 'w-4 h-4 text-muted-foreground')}${formatLocationLink(booking.pickupLocation)}</p>
                                                <div class="mt-3 space-y-1 text-xs text-muted-foreground">
                                                    <div class="flex items-center justify-between">
                                                        <span>Mileage</span>
                                                        <span class="text-foreground">${pickupMileageValue}</span>
                                                    </div>
                                                    <div class="flex items-center justify-between">
                                                        <span>Fuel</span>
                                                        <span class="text-foreground">${pickupFuelValue}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p class="font-semibold text-muted-foreground">Return</p>
                                                <p class="mt-1 text-foreground">${formatDateTime(booking.endDate, booking.endTime)}</p>
                                                ${returnMeta ? `<div class="${returnMeta.toneClass} text-xs">${escapeHtml(returnMeta.relative || '')}</div>` : ''}
                                                <p class="mt-2 flex items-center gap-2">${getIcon('mapPin', 'w-4 h-4 text-muted-foreground')}${formatLocationLink(booking.dropoffLocation)}</p>
                                                <div class="mt-3 space-y-1 text-xs text-muted-foreground">
                                                    <div class="flex items-center justify-between">
                                                        <span>Mileage</span>
                                                        <span class="text-foreground">${returnMileageValue}</span>
                                                    </div>
                                                    <div class="flex items-center justify-between">
                                                        <span>Fuel</span>
                                                        <span class="text-foreground">${returnFuelValue}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="mt-5 space-y-3">
                                            ${operationalTimeline}
                                        </div>
                                        ${extensionSectionHtml}
                                    </div>
                                </div>
                                <div class="xl:col-span-5">
                                    <div class="sl-card p-4 border border-border rounded-xl h-full">
                                        <div class="mb-3 flex items-center justify-between gap-3">
                                            <h3 class="text-lg font-semibold text-foreground">Client</h3>
                                            ${clientDetailLink}
                                        </div>
                                        <div class="space-y-4 text-sm text-muted-foreground">
                                            <div class="flex flex-wrap items-start gap-3">
                                                <div>
                                                    <p class="text-base font-semibold text-foreground">${escapeHtml(client.name || booking.clientName)}</p>
                                                    <p class="text-sm text-muted-foreground">${escapeHtml(client.email || booking.clientEmail || '—')} · ${escapeHtml(client.phone || booking.clientPhone || '—')}</p>
                                                    <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                                                        <span class="sl-pill sl-pill-compact sl-pill-neutral">Segment: ${escapeHtml(client.segment || booking.segment || '—')}</span>
                                                        <span class="sl-pill sl-pill-compact sl-pill-neutral">Channel: ${escapeHtml(booking.channel || '—')}</span>
                                                        <span class="sl-pill sl-pill-compact sl-pill-info">Status: ${escapeHtml(client.status || '—')}</span>
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
                                                    <p class="font-medium text-muted-foreground">Lifetime value</p>
                                                    <p class="text-sm text-foreground">${formatCurrency(client.lifetimeValue || 0)}</p>
                                                    <p class="text-xs text-muted-foreground">Outstanding: ${formatCurrency(client.outstanding || 0)}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p class="text-xs font-medium text-muted-foreground">Responsible manager</p>
                                                <p class="text-sm text-foreground">${escapeHtml(responsibleSalesPerson)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="xl:col-span-12">
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl">
                                        <h3 class="font-semibold text-gray-800 mb-3">Payments</h3>
                                        <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
                                            <div class="flex-1 space-y-4 text-sm text-gray-600">
                                                <div class="grid gap-3 md:grid-cols-3">
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
                                            </div>
                                            <div class="lg:w-80">
                                                <div class="h-full rounded-lg border border-gray-200 bg-white p-4">
                                                    <h4 class="font-medium text-sm text-gray-700 mb-3">Generate payment link</h4>
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
                                    </div>
                                </div>
                                <div class="xl:col-span-12">
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl">
                                        <h3 class="font-semibold text-gray-800 mb-3">History</h3>
                                        <ul class="space-y-3">
                                            ${bookingHistoryHtml}
                                        </ul>
                                    </div>
                                </div>
                                <div class="xl:col-span-12">
                                    <div class="geist-card p-4 border border-gray-200 rounded-xl" data-booking-id="${bookingIdAttr}">
                                        <div class="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 class="font-semibold text-gray-800">Sales service</h3>
                                                <p class="text-sm ${ratingMeta.toneClass}">${escapeHtml(ratingMeta.helper)}</p>
                                            </div>
                                            <span class="${ratingMeta.chipClass}">${ratingMeta.label}</span>
                                        </div>
                                        <div class="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/70 p-3">
                                            <p class="text-sm text-gray-700">${escapeHtml(ratingComment)}</p>
                                        </div>
                                        <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                            <span>${escapeHtml(ratingUpdatedCopy)}</span>
                                            ${ratingOwnerCopy ? `<span>${escapeHtml(ratingOwnerCopy)}</span>` : ''}
                                        </div>
                                        ${salesRatingControls}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;

  return content;
};
