import { MOCK_DATA } from '../data/index.js';
import { renderClientCard } from './charts.js';

/**
 * Рендерит детали клиента и активной сделки.
 * @param {string|number} id
 * @returns {string|false}
 */
export const renderClientDetail = (id) => {
  /** @type {any|null} */
  const client = (MOCK_DATA.clients || []).find(c => c.id == id) || null;
  if (!client) return false;

  /** @type {any} */
  const pipeline = MOCK_DATA.salesPipeline || {};
  /** @type {Array<any>} */
  const leads = Array.isArray(pipeline.leads) ? pipeline.leads : [];
  /** @type {any|null} */
  const lead = leads.find(item => Number(item.clientId) === Number(client.id)) || null;
  /** @type {Record<string, any>} */
  const workspaceDetails = (MOCK_DATA.salesWorkspace && MOCK_DATA.salesWorkspace.leadDetails) || {};
  /** @type {any|null} */
  const detail = lead ? workspaceDetails[String(lead.id)] || null : null;

  /** @type {string} */
  const clientCardHtml = renderClientCard(lead, client, detail);
  /** @type {string} */
  const leadContext = lead
    ? `<p class="text-xs text-gray-500 mt-1">Active deal: ${lead.id} · ${lead.title}</p>`
    : '';

  const content = `
                    <div class="p-6 border-b">
                        <h2 class="text-xl font-semibold">${client.name}</h2>
                        ${leadContext}
                    </div>
                    <div class="p-6 space-y-6">
                        ${clientCardHtml}
                    </div>`;

  return content;
};
