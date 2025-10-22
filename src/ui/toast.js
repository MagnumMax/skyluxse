export const showToast = (message, tone = 'info') => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 right-4 space-y-2 z-50';
    document.body.appendChild(container);
  }

  const toneClass = tone === 'error' ? 'bg-red-600' : tone === 'success' ? 'bg-emerald-600' : 'bg-gray-900';
  const toast = document.createElement('div');
  toast.className = `${toneClass} text-white text-sm px-4 py-2 rounded-md shadow-lg transition-opacity duration-300`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
};
