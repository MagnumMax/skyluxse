import { MOCK_DATA } from '/src/data/index.js';
import { renderClientCard } from '/src/render/charts.js';

export const renderClientDetail = (id) => {
  const client = MOCK_DATA.clients.find(c => c.id == id);
  if (!client) return false;

  const pipeline = MOCK_DATA.salesPipeline || {};
  const leads = Array.isArray(pipeline.leads) ? pipeline.leads : [];
  const lead = leads.find(item => Number(item.clientId) === Number(client.id)) || null;
  const workspaceDetails = MOCK_DATA.salesWorkspace?.leadDetails || {};
  const detail = lead ? workspaceDetails[lead.id] || null : null;

  const clientCardHtml = renderClientCard(lead, client, detail);
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
