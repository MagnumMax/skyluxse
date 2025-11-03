import { renderBookingDetail } from './renderBookingDetail.js';
import { renderFleetDetail } from './renderFleetDetail.js';
import { renderClientDetail } from './renderClientDetail.js';

/**
 * Рендерит панель деталей для указанного типа сущности.
 * @param {('bookings'|'fleet-table'|'clients-table')} type
 * @param {string|number} id
 * @returns {boolean}
 */
export const renderDetailPanel = (type, id) => {
  /** @type {string} */
  let contentStr = '';
  /** @type {HTMLElement|null} */
  let targetContainer = null;

  if (type === 'bookings') {
    const rendered = renderBookingDetail(id);
    if (!rendered) return false;
    contentStr = rendered;
    targetContainer = document.getElementById('booking-detail-content');
  } else if (type === 'fleet-table') {
    const rendered = renderFleetDetail(id);
    if (!rendered) return false;
    contentStr = rendered;
    targetContainer = document.getElementById('fleet-detail-content');
  } else if (type === 'clients-table') {
    const rendered = renderClientDetail(id);
    if (!rendered) return false;
    contentStr = rendered;
    targetContainer = document.getElementById('client-detail-content');
  }

  if (!contentStr || !targetContainer) return false;

  targetContainer.innerHTML = contentStr;
  return true;
};