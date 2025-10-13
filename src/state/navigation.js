import { ROLES_CONFIG } from '../data/index.js';
import { appState } from './appState.js';

export const HASH_DEFAULT_SELECTOR = 'main';

export const buildHash = (role, page, selector = HASH_DEFAULT_SELECTOR) => {
    const safeRole = ROLES_CONFIG[role] ? role : 'operations';
    const roleConfig = ROLES_CONFIG[safeRole] || {};
    const safePage = (typeof page === 'string' && page.length) ? page : (roleConfig.defaultPage || 'dashboard');
    const finalSelector = selector ? String(selector) : HASH_DEFAULT_SELECTOR;
    return `#${safeRole}/${safePage}/${finalSelector}`;
};

export const parseHash = (hashValue) => {
    const raw = (hashValue || '').replace(/^#/, '');
    const parts = raw.split('/').filter(Boolean);
    let [role, page, selector] = parts;

    if (!ROLES_CONFIG[role]) {
        role = ROLES_CONFIG[appState.currentRole] ? appState.currentRole : 'operations';
    }

    const roleConfig = ROLES_CONFIG[role] || {};
    if (!page) page = roleConfig.defaultPage || 'dashboard';
    if (!selector) selector = HASH_DEFAULT_SELECTOR;

    const canonical = buildHash(role, page, selector);
    const isCanonical = hashValue === canonical;
    return { role, page, selector, canonical, isCanonical };
};

export const isDefaultSelector = (selector) => selector === HASH_DEFAULT_SELECTOR;
