import { MOCK_DATA } from '/src/data/index.js';
import { appState } from '/src/state/appState.js';
import { getIcon } from '/src/ui/icons.js';
import { formatPercent } from '/src/render/utils.js';
import { buildHash } from '/src/state/navigation.js';
import { getChartPalette, getThemeColor, getThemeColorWithAlpha } from '/src/ui/theme.js';

let dashboardRevenueChart;
let dashboardDriverChart;

export const renderDashboard = () => {
  const kpiGrid = document.getElementById('dashboard-kpi-grid');
  if (!kpiGrid) return;

  const kpis = MOCK_DATA.analytics.kpis;
  const cards = [
    { icon: 'layoutDashboard', label: 'Fleet Utilization', value: formatPercent(kpis.fleetUtilization, 0), helper: 'Target ≥ 90%', trend: '+4% WoW' },
    { icon: 'clipboardCheck', label: 'SLA Met', value: formatPercent(kpis.slaCompliance, 0), helper: 'Threshold ≥ 85%', trend: '+2% WoW' },
    { icon: 'users', label: 'Active Bookings', value: kpis.activeBookings.toString(), helper: 'Monitored by fleet managers', trend: '+3 per day' },
    { icon: 'activity', label: 'Client NPS', value: `${kpis.clientNps}`, helper: 'Target ≥ 70', trend: '+1 pt' }
  ];

  kpiGrid.innerHTML = cards.map(card => `
                <div class="sl-card p-5 flex flex-col justify-between h-full">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-muted-foreground">${card.label}</span>
                        <span class="text-muted-foreground">${getIcon(card.icon, 'w-5 h-5')}</span>
                    </div>
                    <div class="mt-4 space-y-1">
                        <p class="text-3xl font-semibold text-foreground">${card.value}</p>
                        ${card.helper ? `<p class="text-xs text-muted-foreground">${card.helper}</p>` : ''}
                    </div>
                    ${card.trend ? `<p class="text-xs mt-3 ${card.trend.startsWith('+') ? 'text-emerald-600' : 'text-destructive'}">${card.trend}</p>` : ''}
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
      { key: 'overdue', label: 'Overdue', description: 'Requires immediate action', surface: 'border border-destructive/30 bg-destructive/10', accent: 'text-destructive' },
      { key: 'atRisk', label: 'SLA Risk', description: 'Plan a check in the next few hours', surface: 'border border-amber-200 bg-amber-50/70', accent: 'text-amber-600' },
      { key: 'onTrack', label: 'On Track', description: 'Milestones are on schedule', surface: 'border border-emerald-200 bg-emerald-50/70', accent: 'text-emerald-600' }
    ];

    slaContainer.innerHTML = slaCards.map(card => {
      const items = buckets[card.key] || [];
      const sample = items.slice(0, 2).map(b => `<li>${formatBookingLabel(b)}</li>`).join('');
      return `
                        <div class="rounded-lg p-4 h-full ${card.surface}">
                            <span class="text-sm font-semibold ${card.accent}">${card.label}</span>
                            <p class="mt-2 text-2xl font-semibold text-foreground">${items.length}</p>
                            <p class="mt-1 text-xs text-muted-foreground">${card.description}</p>
                            ${sample ? `<ul class="mt-3 space-y-1 text-xs text-muted-foreground">${sample}</ul>` : '<p class="mt-3 text-xs text-muted-foreground">No bookings in this group</p>'}
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
  const palette = getChartPalette();
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
            borderColor: palette.strong,
            backgroundColor: getThemeColorWithAlpha('gray-900', 0.08, 'rgba(17,24,39,0.08)'),
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Expenses',
            data: expenseValues,
            borderColor: getThemeColor('slate-500', '#94a3b8'),
            backgroundColor: getThemeColorWithAlpha('slate-500', 0.12, 'rgba(148,163,184,0.12)'),
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Bookings',
            data: bookingsValues,
            borderColor: palette.primaryLine,
            backgroundColor: getThemeColorWithAlpha('indigo-500', 0.1, 'rgba(99,102,241,0.1)'),
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
            borderColor: palette.primaryLine,
            backgroundColor: getThemeColorWithAlpha('indigo-500', 0.25, 'rgba(99,102,241,0.25)')
          },
          {
            label: 'Client rating',
            data: npsScores,
            borderColor: palette.success,
            backgroundColor: getThemeColorWithAlpha('emerald-500', 0.2, 'rgba(16,185,129,0.2)')
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
