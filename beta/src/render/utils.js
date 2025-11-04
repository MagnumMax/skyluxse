export const formatPercent = (value, digits = 0) => `${(value * 100).toFixed(digits)}%`;

export const formatCurrency = (value) => {
  const numeric = Number(value) || 0;
  return `AED ${Math.round(numeric).toLocaleString('en-US')}`;
};

export const getSalesRatingMeta = (rating) => {
  const numeric = Number(rating);
  const value = Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;

  if (!value) {
    return {
      value: null,
      label: 'Not rated',
      helper: 'Waiting for CEO feedback',
      chipClass: 'inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600 font-semibold',
      toneClass: 'text-slate-500',
      level: 'none'
    };
  }

  if (value >= 8) {
    return {
      value,
      label: `${value}/10`,
      helper: 'Outstanding client handling',
      chipClass: 'inline-flex items-center px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold',
      toneClass: 'text-emerald-700',
      level: 'high'
    };
  }

  if (value >= 5) {
    return {
      value,
      label: `${value}/10`,
      helper: 'Meets expectations with room to polish',
      chipClass: 'inline-flex items-center px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 font-semibold',
      toneClass: 'text-amber-700',
      level: 'medium'
    };
  }

  return {
    value,
    label: `${value}/10`,
    helper: 'Critical follow-up required',
    chipClass: 'inline-flex items-center px-2 py-0.5 rounded-md border border-rose-200 bg-rose-50 text-rose-700 font-semibold',
    toneClass: 'text-rose-700',
    level: 'low'
  };
};
