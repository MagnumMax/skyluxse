const cssVarCache = new Map();

const getRootElement = () => (typeof document !== 'undefined' ? document.documentElement : null);

/**
 * @param {string} token
 * @returns {string}
 */
const readCssVariable = (token) => {
  const root = getRootElement();
  if (!root) return '';
  const normalized = token.startsWith('--') ? token : `--${token}`;
  if (cssVarCache.has(normalized)) {
    return cssVarCache.get(normalized);
  }
  const style = (typeof globalThis !== 'undefined' && typeof globalThis.getComputedStyle === 'function')
    ? globalThis.getComputedStyle(root)
    : null;
  if (!style) return '';
  const value = style.getPropertyValue(normalized).trim();
  if (value) {
    cssVarCache.set(normalized, value);
  }
  return value;
};

/**
 * @param {string} token
 * @returns {string}
 */
const readColorToken = (token) => readCssVariable(`sl-color-${token}`) || readCssVariable(token);

/**
 * Возвращает цвет в формате hsl() на основе токена дизайн-системы.
 * @param {string} token
 * @param {string} fallback
 */
export const getThemeColor = (token, fallback = '#000000') => {
  const hslValue = readColorToken(token);
  return hslValue ? `hsl(${hslValue})` : fallback;
};

/**
 * Возвращает цвет в формате hsl() с контролем прозрачности.
 * @param {string} token
 * @param {number} alpha
 * @param {string} fallback
 */
export const getThemeColorWithAlpha = (token, alpha = 1, fallback = '#000000') => {
  const hslValue = readColorToken(token);
  if (!hslValue) return fallback;
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));
  return `hsl(${hslValue} / ${normalizedAlpha})`;
};

/**
 * Палитра по умолчанию для графиков и статусов.
 */
export const getChartPalette = () => ({
  primary: getThemeColor('indigo-500', '#5e6ad2'),
  primaryLine: getThemeColor('indigo-600', '#4c51bf'),
  primarySoft: getThemeColorWithAlpha('indigo-100', 1, '#ecebff'),
  neutral: getThemeColor('gray-500', '#6b7280'),
  strong: getThemeColor('gray-900', '#111827'),
  muted: getThemeColor('slate-500', '#6b7280'),
  success: getThemeColor('emerald-500', '#10b981'),
  warning: getThemeColor('amber-500', '#f59e0b'),
  danger: getThemeColor('rose-500', '#f43f5e'),
  info: getThemeColor('sky-500', '#0ea5e9'),
  infoSoft: getThemeColorWithAlpha('sky-100', 1, '#e0f2fe')
});

export const refreshThemeCache = () => cssVarCache.clear();
