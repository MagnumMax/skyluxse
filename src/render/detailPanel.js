import { renderBookingDetail } from '/src/render/renderBookingDetail.js';
import { renderFleetDetail } from '/src/render/renderFleetDetail.js';
import { renderClientDetail } from '/src/render/renderClientDetail.js';

export const renderDetailPanel = (type, id) => {
  let content = '';
  let targetContainer = null;

  if (type === 'bookings') {
    content = renderBookingDetail(id);
    if (!content) return false;
    targetContainer = document.getElementById('booking-detail-content');
  } else if (type === 'fleet-table') {
    content = renderFleetDetail(id);
    if (!content) return false;
    targetContainer = document.getElementById('fleet-detail-content');
  } else if (type === 'clients-table') {
    content = renderClientDetail(id);
    if (!content) return false;
    targetContainer = document.getElementById('client-detail-content');
  }

  if (!content || !targetContainer) return false;

  targetContainer.innerHTML = content;
  return true;
};