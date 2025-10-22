import { MOCK_DATA } from '../data/index.js';
import { appState } from '../state/appState.js';
import { getIcon } from '../ui/icons.js';
import { formatPercent } from './utils.js';
import { buildHash } from '../state/navigation.js';

let dashboardRevenueChart;
let dashboardDriverChart;

export const renderDashboard = () => {
  const kpiGrid = document.getElementById('dashboard-kpi-grid');
  if (!kpiGrid) return;

  const kpis = MOCK_DATA.analytics.kpis;
  const cards = [
    { icon: 'layoutDashboard', label: 'Fleet Utilization', value: formatPercent(kpis.fleetUtilization, 0), helper: 'Target ≥ 90%', trend: '+4% WoW' },
    { icon: 'clipboardCheck', label: 'SLA Met', value: formatPercent(kpis.slaCompliance, 0), helper: 'Threshold ≥ 85%', trend: '+2% WoW' },
    { icon: 'users', label: 'Active Bookings', value: kpis.activeBookings.toString(), helper: 'Monitored by operations', trend: '+3 per day' },
    { icon: 'activity', label: 'Client NPS', value: `${kpis.clientNps}`, helper: 'Target ≥ 70', trend: '+1 pt' }
  ];

  kpiGrid.innerHTML = cards.map(card => `
                <div class="geist-card p-5 flex flex-col justify-between h-full">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-500">${card.label}</span>
                        <span class="text-gray-400">${getIcon(card.icon, 'w-5 h-5')}</span>
                    </div>
                    <div class="mt-4">
                        <p class="text-3xl font-semibold">${card.value}</p>
                        ${card.helper ? `<p class="text-xs text-gray-400 mt-1">${card.helper}</p>` : ''}
                    </div>
                    ${card.trend ? `<p class="text-xs mt-3 ${card.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}">${card.trend}</p>` : ''}
                </div>
            `).join('');

  const slaContainer = document.getElementById('dashboard-sla-cards');
  if (slaContainer) {
    const now = Date.now();
    const trackedStatuses = ['new', 'preparation', 'delivery'];
    const buckets = { overdue: [], atRisk: [], onTrack: [] };

    MOCK_DATA.bookings.forEach(booking => {
      if (!trackedStatuses.includes(booking.status) || !booking.targetTime) return;
      const diff = booking.targetTime - now;
      if (diff < 0) {
        buckets.overdue.push(booking);
      } else if (diff <= 3 * 60 * 60 * 1000) {
        buckets.atRisk.push(booking);
      } else {
        buckets.onTrack.push(booking);
      }
    });

    const formatBookingLabel = booking => `#${booking.id} · ${booking.carName}`;
    const slaCards = [
      { key: 'overdue', label: 'Overdue', description: 'Requires immediate action', border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-600' },
      { key: 'atRisk', label: 'SLA Risk', description: 'Plan a check in the next few hours', border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-600' },
      { key: 'onTrack', label: 'On Track', description: 'Milestones are on schedule', border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-600' }
    ];

    slaContainer.innerHTML = slaCards.map(card => {
      const items = buckets[card.key] || [];
      const sample = items.slice(0, 2).map(b => `<li>${formatBookingLabel(b)}</li>`).join('');
      return `
                        <div class="rounded-lg border ${card.border} ${card.bg} p-4 h-full">
                            <span class="text-sm font-medium ${card.text}">${card.label}</span>
                            <p class="text-2xl font-semibold mt-2 text-gray-900">${items.length}</p>
                            <p class="text-xs text-gray-600 mt-1">${card.description}</p>
                            ${sample ? `<ul class="mt-3 space-y-1 text-xs text-gray-700">${sample}</ul>` : '<p class="mt-3 text-xs text-gray-400">No bookings in this group</p>'}
                        </div>
                    `;
    }).join('');
  }

  const revenueRangeLabel = document.getElementById('dashboard-revenue-range');
  if (revenueRangeLabel) {
    revenueRangeLabel.textContent = '7 days';
  }

  const driverView = document.getElementById('dashboard-driver-view');
  if (driverView) {
    driverView.onclick = (event) => {
      event.preventDefault();
      window.location.hash = buildHash(appState.currentRole, 'analytics');
                    
    };
  }

  renderDashboardCharts();
};

const renderDashboardCharts = () => {
  const revenueCtx = document.getElementById('dashboard-revenue-chart')?.getContext('2d');
  if (revenueCtx) {
    const series = MOCK_DATA.analytics.revenueDaily;
    const labels = series.map(item => item.date.slice(-5));
    const revenueValues = series.map(item => item.revenue);
    const expenseValues = series.map(item => item.expenses);
    const bookingsValues = series.map(item => item.bookings);

    if (dashboardRevenueChart) dashboardRevenueChart.destroy();
    dashboardRevenueChart = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueValues,
            borderColor: '#111827',
            backgroundColor: 'rgba(17,24,39,0.08)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Expenses',
            data: expenseValues,
            borderColor: '#94a3b8',
            backgroundColor: 'rgba(148,163,184,0.12)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Bookings',
            data: bookingsValues,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.1)',
            tension: 0.4,
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
            ticks: {
              callback: value => `AED ${Math.round(value / 1000)}k`
            },
            grid: { color: 'rgba(15,23,42,0.05)' }
          },
          y1: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { callback: value => value }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }

  const driverCtx = document.getElementById('dashboard-driver-chart')?.getContext('2d');
  if (driverCtx) {
    const performance = MOCK_DATA.analytics.driverPerformance;
    const driverLabels = performance.map(item => {
      const driver = MOCK_DATA.drivers.find(d => d.id === item.driverId);
      return driver ? driver.name.split(' ')[0] : `ID ${item.driverId}`;
    });
    const completionRates = performance.map(item => +(item.completionRate * 100).toFixed(1));
    const npsScores = performance.map(item => +(item.nps * 20).toFixed(1));

    if (dashboardDriverChart) dashboardDriverChart.destroy();
    dashboardDriverChart = new Chart(driverCtx, {
      type: 'radar',
      data: {
        labels: driverLabels,
        datasets: [
          {
            label: 'Task completion',
            data: completionRates,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.25)'
          },
          {
            label: 'Client rating',
            data: npsScores,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.2)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            suggestedMax: 100,
            ticks: { display: true }
          }
        },
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }
};
