/**
 * @fileoverview Функции для форматирования данных в приложении
 */

/**
 * Форматирует число как валюту в AED
 * @param {number|string} value - Значение для форматирования
 * @returns {string} Отформатированная строка валюты
 */
export const formatCurrency = (value) => {
  const numeric = Number(value) || 0;
  return `AED ${Math.round(numeric).toLocaleString('en-US')}`;
};

/**
 * Форматирует дату и время
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @param {string} time - Время в формате HH:MM
 * @returns {string} Отформатированная строка даты и времени или '—' если нет данных
 */
export const formatDateTime = (date, time) => {
  if (!date && !time) return '—';
  if (!date) return time || '—';
  return time ? `${date} ${time}` : date;
};

/**
 * Форматирует относительное время (например, "in 2 hours")
 * @param {Date} targetDate - Целевая дата
 * @param {Date} [baseDate=new Date()] - Базовая дата для сравнения
 * @returns {string} Отформатированная строка относительного времени
 */
export const formatRelativeTime = (targetDate, baseDate = new Date()) => {
  if (!targetDate || Number.isNaN(targetDate.getTime())) return '';
  const diffMs = targetDate.getTime() - baseDate.getTime();
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  const hours = Math.round(absMs / 3600000);
  const days = Math.round(absMs / 86400000);
  const suffix = diffMs < 0 ? ' ago' : '';
  const prefix = diffMs >= 0 ? 'in ' : '';
  if (minutes < 60) {
    const value = Math.max(minutes, 1);
    return `${prefix}${value} min${value === 1 ? '' : 's'}${suffix}`.trim();
  }
  if (hours < 48) {
    return `${prefix}${hours} h${hours === 1 ? '' : 's'}${suffix}`.trim();
  }
  return `${prefix}${days} day${days === 1 ? '' : 's'}${suffix}`.trim();
};

/**
 * Форматирует дату для отображения
 * @param {Date} targetDate - Дата для форматирования
 * @returns {string} Отформатированная строка даты или '—' если недействительная
 */
export const formatDateLabel = (targetDate) => {
  if (!targetDate || Number.isNaN(targetDate.getTime())) return '—';
  return targetDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Форматирует пробег
 * @param {number|string} value - Значение пробега
 * @returns {string} Отформатированная строка пробега или '—'
 */
export const formatMileage = (value) => {
  if (value === 0) return '0 km';
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString('en-US')} km`;
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return '—';
};

/**
 * Форматирует уровень топлива
 * @param {number|string} value - Значение уровня топлива
 * @returns {string} Отформатированная строка или '—'
 */
export const formatFuelLevel = (value) => {
  if (value === 0) return '0';
  if (value == null) return '—';
  const str = String(value).trim();
  return str.length ? str : '—';
};