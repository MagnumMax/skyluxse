import { MOCK_DATA, getClientById } from '/src/data/index.js';
import { appState } from '/src/state/appState.js';
import { buildHash } from '/src/state/navigation.js';
import { formatCurrency } from '/src/render/formatters.js';

const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const renderFleetDetail = (id) => {
  const car = MOCK_DATA.cars.find(c => c.id == id);
  if (!car) return false;

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
  if (typeof car.imagePath === 'string') {
    heroImage = car.imagePath;
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
    const client = getClientById(booking.clientId);
    const clientLabel = client?.name || booking.clientName || 'Client';
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
                                  <p class="font-medium text-gray-900">${escapeHtml(clientLabel)}</p>
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

  if (appState.currentRole === 'operations') {
    const parseHistoryDate = (value) => {
      if (!value) {
        return { ts: 0, label: '—' };
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return { ts: 0, label: value };
      }
      const formatted = parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      return { ts: parsed.getTime(), label: formatted };
    };

    const historyEntries = [];
    maintenanceHistory.forEach(item => {
      const { ts, label } = parseHistoryDate(item.date);
      historyEntries.push({
        type: 'maintenance',
        timestamp: ts,
        dateLabel: label,
        title: item.type || 'Maintenance',
        odometer: item.odometer,
        notes: item.notes || ''
      });
    });
    inspections.forEach(insp => {
      const { ts, label } = parseHistoryDate(insp.date);
      historyEntries.push({
        type: 'inspection',
        timestamp: ts,
        dateLabel: label,
        title: insp.driver ? `Inspection (${insp.driver})` : 'Inspection',
        driver: insp.driver || '',
        notes: insp.notes || '',
        photos: Array.isArray(insp.photos) ? insp.photos : []
      });
    });
    historyEntries.sort((a, b) => b.timestamp - a.timestamp);

    const historyEntriesHtml = historyEntries.length
      ? historyEntries.map(entry => {
        const tone = entry.type === 'maintenance'
          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
          : 'bg-amber-50 text-amber-700 border border-amber-100';
        const typeLabel = entry.type === 'maintenance' ? 'Maintenance' : 'Inspection';
        const odometerHtml = entry.type === 'maintenance'
          ? `<div class="flex items-center justify-between text-xs text-gray-500">
                                      <span>Odometer</span>
                                      <span>${entry.odometer != null ? escapeHtml(`${Number(entry.odometer).toLocaleString('en-US')} km`) : '—'}</span>
                                  </div>`
          : '';
        const driverHtml = entry.type === 'inspection' && entry.driver
          ? `<div class="text-xs text-gray-500">Driver: ${escapeHtml(entry.driver)}</div>`
          : '';
        const notesHtml = entry.notes
          ? `<p class="text-xs text-gray-500">${escapeHtml(entry.notes)}</p>`
          : '';
        const photosHtml = entry.type === 'inspection' && Array.isArray(entry.photos) && entry.photos.length
          ? `<div class="mt-3 grid grid-cols-3 gap-2">
                                      ${entry.photos.map(photo => `<img src="${escapeHtml(photo)}" class="h-16 w-full rounded object-cover doc-image" alt="Inspection photo">`).join('')}
                                  </div>`
          : '';
        const detailsHtml = [odometerHtml, driverHtml, notesHtml].filter(Boolean).join('\n                                  ');
        return `
                          <li class="fleet-history-entry rounded-md border border-gray-200 p-3 text-sm" data-history-type="${entry.type}">
                              <div class="flex items-center justify-between gap-3 text-gray-700">
                                  <div class="flex items-center gap-2">
                                      <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${tone}">${typeLabel}</span>
                                      <span class="font-medium text-gray-900">${escapeHtml(entry.title)}</span>
                                  </div>
                                  <span class="text-xs text-gray-500">${escapeHtml(entry.dateLabel)}</span>
                              </div>
                              ${detailsHtml ? `<div class="mt-3 space-y-2">${detailsHtml}</div>` : ''}
                              ${photosHtml}
                          </li>
                      `;
      }).join('')
      : '<p class="text-sm text-gray-500">No history records yet</p>';

    const operationsContent = `
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
                            </div>
                        </div>
                        <div class="grid gap-6 lg:grid-cols-2">
                            <div class="geist-card p-5 space-y-4 fleet-history-section">
                                <div class="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 class="font-semibold text-gray-900">History</h3>
                                        <p class="text-sm text-gray-500">Maintenance, inspections and recent actions</p>
                                    </div>
                                    <div class="flex flex-wrap gap-2">
                                        <button type="button" class="fleet-history-filter inline-flex items-center rounded-full border border-gray-900 bg-gray-900 px-3 py-1 text-xs font-medium text-white transition" data-type="all">All</button>
                                        <button type="button" class="fleet-history-filter inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 transition" data-type="maintenance">Maintenance</button>
                                        <button type="button" class="fleet-history-filter inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 transition" data-type="inspection">Inspections</button>
                                    </div>
                                </div>
                                <ul class="space-y-3">
                                    ${historyEntriesHtml}
                                </ul>
                            </div>
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
                        </div>
                    </div>`;

    return operationsContent;
  }

  const content = `
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

  return content;
};
