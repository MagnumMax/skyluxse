export const formatPercent = (value, digits = 0) => `${(value * 100).toFixed(digits)}%`;

export const formatCurrency = (value) => {
    const numeric = Number(value) || 0;
    return `AED ${Math.round(numeric).toLocaleString('en-US')}`;
};
