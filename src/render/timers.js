import { appState } from '/src/state/appState.js';
import { getIcon } from '/src/ui/icons.js';

export const startTimers = () => {
  if (appState.timerInterval) clearInterval(appState.timerInterval);

  const updateCountdowns = () => {
    const now = new Date().getTime();

    document.querySelectorAll('.card-timer').forEach(timerEl => {
      const targetTime = parseInt(timerEl.dataset.targetTime, 10);
      if (!targetTime) return;
      const diff = targetTime - now;

      if (diff <= 0) {
        timerEl.innerHTML = 'Overdue';
        timerEl.classList.add('text-red-600');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      timerEl.innerHTML = `${getIcon('clock', 'w-3 h-3 inline mr-1')} ${d}d ${h}h ${m}m`;
    });

    document.querySelectorAll('.task-countdown').forEach(timerEl => {
      const targetTime = parseInt(timerEl.dataset.targetTime, 10);
      if (!targetTime || Number.isNaN(targetTime)) return;

      const diff = targetTime - now;
      timerEl.classList.remove('text-green-600', 'text-amber-500', 'text-red-600');

      if (diff <= 0) {
        timerEl.innerHTML = `${getIcon('clock', 'w-3 h-3 inline mr-1')} Overdue`;
        timerEl.classList.add('text-red-600');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      timerEl.innerHTML = `${getIcon('clock', 'w-3 h-3 inline mr-1')} ${parts.join(' ')}`;

      if (diff <= 2 * 60 * 60 * 1000) {
        timerEl.classList.add('text-red-600');
      } else if (diff <= 6 * 60 * 60 * 1000) {
        timerEl.classList.add('text-amber-500');
      } else {
        timerEl.classList.add('text-green-600');
      }
    });
  };

  updateCountdowns();
  appState.timerInterval = setInterval(updateCountdowns, 1000);
};
