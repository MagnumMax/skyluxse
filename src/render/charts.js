import { MOCK_DATA } from '../data/index.js';
import { appState } from '../state/appState.js';
import { formatCurrency, formatPercent } from './utils.js';
import { getIcon } from '../ui/icons.js';

let analyticsRevenueChart;
let analyticsSegmentChart;
let analyticsForecastChart;
let salesStageChart;
let salesVelocityChart;

let analyticsFiltersBound = false;
let salesFiltersBound = false;

const getRevenueSeries = (range) => {
            const base = MOCK_DATA.analytics.revenueDaily;
            if (range === '7d') return base;
            const factor = range === '30d' ? 4 : 12;
            return base.map((item, index) => ({
                date: item.date,
                revenue: Math.round(item.revenue * factor / base.length * (1 + index * 0.03)),
                expenses: Math.round(item.expenses * factor / base.length * (1 + index * 0.025)),
                bookings: Math.max(1, Math.round(item.bookings * factor / base.length)),
                cancellations: item.cancellations
            }));
        }

const getSegmentMix = (segment) => {
            const mix = MOCK_DATA.analytics.segmentMix;
            if (!segment || segment === 'all') {
                return mix;
            }
            const selected = mix.find(item => item.segment.toLowerCase() === segment);
            if (!selected) return mix;
            return [
                selected,
                { segment: 'Другие', share: Math.max(0, 1 - selected.share) }
            ];
        }

const buildAnalyticsInsights = (segment, vehicleClass) => {
            const insights = [];
            const kpis = MOCK_DATA.analytics.kpis;
            insights.push(`Средний доход на авто держится на уровне ${formatCurrency(kpis.avgRevenuePerCar)} в день.`);
            const leadingSegment = MOCK_DATA.analytics.segmentMix.reduce((acc, cur) => cur.share > acc.share ? cur : acc);
            if (segment !== 'all') {
                const selected = MOCK_DATA.analytics.segmentMix.find(item => item.segment.toLowerCase() === segment);
                if (selected) {
                    insights.push(`Сегмент ${selected.segment} генерирует ${formatPercent(selected.share, 0)} текущей выручки.`);
                }
            } else {
                insights.push(`Лидирует сегмент ${leadingSegment.segment} (${formatPercent(leadingSegment.share, 0)}).`);
            }
            const forecast = MOCK_DATA.analytics.forecast[0];
            insights.push(`Прогноз на ${forecast.week}: ${formatCurrency(forecast.expectedRevenue)} и ${forecast.expectedBookings} бронирований.`);
            if (vehicleClass !== 'all') {
                const carClassMap = new Map(MOCK_DATA.cars.map(car => [car.id, car.class]));
                const classBookings = MOCK_DATA.bookings.filter(booking => carClassMap.get(booking.carId) === vehicleClass);
                if (classBookings.length) {
                    const classRevenue = classBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
                    insights.push(`${vehicleClass} класс: ${classBookings.length} активных заказов, выручка ${formatCurrency(classRevenue)}.`);
                }
            }
            return insights;
        }

const bindAnalyticsFilters = () => {
            if (analyticsFiltersBound) return;
            const rangeSelect = document.getElementById('analytics-range');
            const segmentSelect = document.getElementById('analytics-segment');
            const classSelect = document.getElementById('analytics-class');

            if (rangeSelect) {
                rangeSelect.addEventListener('change', (e) => {
                    appState.filters.analytics.range = e.target.value;
                    renderAnalyticsPage();
                });
            }
            if (segmentSelect) {
                segmentSelect.addEventListener('change', (e) => {
                    appState.filters.analytics.segment = e.target.value;
                    renderAnalyticsPage();
                });
            }
            if (classSelect) {
                classSelect.addEventListener('change', (e) => {
                    appState.filters.analytics.vehicleClass = e.target.value;
                    renderAnalyticsPage();
                });
            }
            analyticsFiltersBound = true;
        }

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

            const series = getRevenueSeries(range);
            const labels = series.map(item => item.date.slice(-5));
            const revenueValues = series.map(item => item.revenue);
            const expenseValues = series.map(item => item.expenses);

            if (analyticsRevenueChart) analyticsRevenueChart.destroy();
            analyticsRevenueChart = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Выручка',
                            data: revenueValues,
                            borderColor: '#111827',
                            backgroundColor: 'rgba(17,24,39,0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Расходы',
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
                            ticks: { callback: value => `$${Math.round(value / 1000)}k` }
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
                                label: 'Выручка',
                                data: forecastData.map(item => item.expectedRevenue),
                                backgroundColor: '#1f2937',
                                yAxisID: 'y'
                            },
                            {
                                type: 'line',
                                label: 'Бронирования',
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
                                ticks: { callback: value => `$${Math.round(value / 1000)}k` }
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
        }

const getFilteredLeads = () => {
            const pipeline = MOCK_DATA.salesPipeline || {};
            const leads = pipeline.leads || [];
            const { owner, source } = appState.filters.sales;
            return leads.filter(lead => {
                if (owner !== 'all' && lead.ownerId !== owner) return false;
                if (source !== 'all' && lead.source !== source) return false;
                return true;
            });
        }

const bindSalesPipelineFilters = () => {
            if (salesFiltersBound) return;
            const ownerSelect = document.getElementById('sales-owner-filter');
            const sourceSelect = document.getElementById('sales-source-filter');
            const pipeline = MOCK_DATA.salesPipeline || {};
            const owners = pipeline.owners || [];

            if (ownerSelect && !ownerSelect.dataset.bound) {
                ownerSelect.insertAdjacentHTML('beforeend', owners.map(owner => `<option value="${owner.id}">${owner.name}</option>`).join(''));
                ownerSelect.dataset.bound = 'true';
            }

            if (sourceSelect && !sourceSelect.dataset.bound) {
                const sources = Array.from(new Set((pipeline.leads || []).map(lead => lead.source))).sort();
                sourceSelect.insertAdjacentHTML('beforeend', sources.map(source => `<option value="${source}">${source}</option>`).join(''));
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
        }

export const renderSalesPipeline = () => {
            const summaryEl = document.getElementById('sales-pipeline-summary');
            if (!summaryEl) return;

            const pipeline = MOCK_DATA.salesPipeline || { stages: [], leads: [] };
            const stages = pipeline.stages || [];
            const leads = getFilteredLeads();

            bindSalesPipelineFilters();

            const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
            const weightedValue = leads.reduce((sum, lead) => sum + (lead.value || 0) * (lead.probability || 0), 0);
            const wonLeads = leads.filter(lead => lead.stage === 'won');
            const avgVelocity = leads.length ? Math.round(leads.reduce((sum, lead) => sum + (lead.velocityDays || 0), 0) / leads.length) : 0;
            const winRate = leads.length ? Math.round((wonLeads.length / leads.length) * 100) : Math.round(((pipeline.leads || []).filter(lead => lead.stage === 'won').length / (pipeline.leads || []).length) * 100);
            const totalLeads = leads.length;

            const summaryCards = [
                {
                    label: 'Сумма Pipeline',
                    value: formatCurrency(totalValue),
                    helper: 'Все активные лиды',
                    icon: 'briefcase'
                },
                {
                    label: 'Взвешенный прогноз',
                    value: formatCurrency(weightedValue),
                    helper: 'Учитывая вероятность закрытия',
                    icon: 'target'
                },
                {
                    label: 'Win rate',
                    value: `${winRate || 0}%`,
                    helper: `${avgVelocity || 0} дн. средняя скорость`,
                    icon: 'trendingUp'
                },
                {
                    label: 'Активные лиды',
                    value: totalLeads.toString(),
                    helper: 'Фильтрация по менеджеру и источнику',
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

            const totalValueEl = document.getElementById('sales-kanban-total-value');
            if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);

            const boardEl = document.getElementById('sales-kanban-board');
            if (boardEl) {
                boardEl.innerHTML = stages.map(stage => {
                    const stageLeads = leads.filter(lead => lead.stage === stage.id);
                    const stageValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
                    return `
                        <div class="bg-gray-50 rounded-xl border border-gray-200 flex flex-col min-w-[220px]">
                            <div class="px-4 py-3 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-semibold text-gray-800">${stage.name}</span>
                                    <span class="text-xs text-gray-500">${stageLeads.length}</span>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">${formatCurrency(stageValue)}</p>
                            </div>
                            <div class="flex-1 px-3 py-3 space-y-3">
                                ${stageLeads.length ? stageLeads.map(lead => {
                                    const ownerName = computeLeadOwner(lead);
                                    const probability = Math.round((lead.probability || stage.probability || 0) * 100);
                                    return `
                                        <div class="geist-card border border-transparent hover:border-gray-200 transition p-3 text-sm text-gray-700 space-y-2">
                                            <div class="flex items-center justify-between">
                                                <p class="font-semibold text-gray-900">${lead.title}</p>
                                                <span class="text-xs px-2 py-1 rounded-md bg-white border border-gray-200">${probability}%</span>
                                            </div>
                                            <p class="text-xs text-gray-500">${lead.company}</p>
                                            <div class="flex items-center justify-between text-xs text-gray-500">
                                                <span>${ownerName}</span>
                                                <span>${formatCurrency(lead.value)}</span>
                                            </div>
                                            ${lead.nextAction ? `<p class="text-xs text-gray-500 border-t border-gray-100 pt-2">${lead.nextAction}</p>` : ''}
                                        </div>
                                    `;
                                }).join('') : '<p class="text-xs text-gray-400">Лидов нет</p>'}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            const stageTableBody = document.querySelector('#sales-stage-table tbody');
            if (stageTableBody) {
                const rows = stages.map(stage => {
                    const stageLeads = leads.filter(lead => lead.stage === stage.id);
                    const stageValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
                    const averageProbability = stageLeads.length ? Math.round(stageLeads.reduce((sum, lead) => sum + (lead.probability || stage.probability || 0), 0) / stageLeads.length * 100) : Math.round((stage.probability || 0) * 100);
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
                const values = stages.map(stage => leads.filter(lead => lead.stage === stage.id).reduce((sum, lead) => sum + (lead.value || 0), 0));
                if (salesStageChart) salesStageChart.destroy();
                salesStageChart = new Chart(stageChartCtx, {
                    type: 'bar',
                    data: {
                        labels: stages.map(stage => stage.name),
                        datasets: [{
                            label: 'Сумма сделок',
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
                                    callback: (value) => `$${Math.round(value / 1000)}k`
                                }
                            }
                        }
                    }
                });
            }

            const velocityCtx = document.getElementById('sales-velocity-chart')?.getContext('2d');
            if (velocityCtx) {
                const velocityData = stages.map(stage => {
                    const stageLeads = leads.filter(lead => lead.stage === stage.id);
                    if (!stageLeads.length) return 0;
                    return Math.round(stageLeads.reduce((sum, lead) => sum + (lead.velocityDays || 0), 0) / stageLeads.length);
                });
                if (salesVelocityChart) salesVelocityChart.destroy();
                salesVelocityChart = new Chart(velocityCtx, {
                    type: 'line',
                    data: {
                        labels: stages.map(stage => stage.name),
                        datasets: [{
                            label: 'Среднее время до закрытия (дни)',
                            data: velocityData,
                            borderColor: '#0ea5e9',
                            backgroundColor: 'rgba(14,165,233,0.16)',
                            tension: 0.3,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                ticks: {
                                    stepSize: 5
                                }
                            },
                            x: { grid: { display: false } }
                        }
                    }
                });
            }

            const leadsTableBody = document.querySelector('#sales-leads-table tbody');
            if (leadsTableBody) {
                const sortedLeads = [...leads].sort((a, b) => (b.probability || 0) - (a.probability || 0));
                leadsTableBody.innerHTML = sortedLeads.map(lead => {
                    const ownerName = computeLeadOwner(lead);
                    const stageMeta = stages.find(stage => stage.id === lead.stage) || {};
                    const probability = Math.round((lead.probability || stageMeta.probability || 0) * 100);
                    return `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 text-gray-900 font-medium">${lead.title}</td>
                            <td class="px-4 py-3 text-gray-700">${lead.company}</td>
                            <td class="px-4 py-3 text-sm">
                                <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${stageMeta.color || 'bg-gray-100 text-gray-600'}">${stageMeta.name || lead.stage}</span>
                            </td>
                            <td class="px-4 py-3 text-right font-medium text-gray-900">${formatCurrency(lead.value)}</td>
                            <td class="px-4 py-3 text-gray-700">${ownerName}</td>
                            <td class="px-4 py-3 text-gray-500">${lead.source}</td>
                            <td class="px-4 py-3 text-gray-500">${lead.nextAction || '—'}<div class="text-xs text-gray-400">${probability}% · ${lead.expectedCloseDate || ''}</div></td>
                        </tr>
                    `;
                }).join('') || '<tr><td colspan="7" class="px-4 py-6 text-center text-gray-500">Лидов нет</td></tr>';
            }
        }
