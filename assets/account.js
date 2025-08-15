// account-tabs.js
(() => {
    const STORAGE_KEY = 'account.activeTab';
    const DEFAULT_TAB = 'profile';

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    const getTabFromHash = () => {
        const h = (location.hash || '').replace('#', '').trim();
        return h || null;
    };

    const saveTab = (tab) => {
        try {
            localStorage.setItem(STORAGE_KEY, tab);
        } catch (_) {}
    };

    const readSavedTab = () => {
        try {
            return localStorage.getItem(STORAGE_KEY) || null;
        } catch (_) {
            return null;
        }
    };

    const panels = $$('[data-account-panel]');
    const menuLinks = $$('.accountmenu__link[role="tab"]');

    const activate = (tab) => {
        if (!tab) tab = DEFAULT_TAB;

        // Панелі
        panels.forEach((p) => {
            const isActive = p.getAttribute('data-account-panel') === tab;
            p.toggleAttribute('hidden', !isActive);
            p.setAttribute('aria-hidden', String(!isActive));
        });

        // Меню
        menuLinks.forEach((a) => {
            const href = a.getAttribute('href') || '';
            const hash = href.startsWith('#') ? href.slice(1) : '';
            const active = hash === tab;
            a.classList.toggle('accountmenu__link--active', active);
            a.setAttribute('aria-selected', String(active));
            a.tabIndex = active ? 0 : -1;
        });

        // URL
        if (location.hash.replace('#', '') !== tab) {
            history.replaceState(null, '', `#${tab}`);
        }

        saveTab(tab);
        document.dispatchEvent(new CustomEvent('account:tabchange', { detail: { tab } }));
    };

    const initFromState = () => {
        const fromHash = getTabFromHash();
        const fromStorage = readSavedTab();
        activate(fromHash || fromStorage || DEFAULT_TAB);
    };

    const handleMenuClick = (e) => {
        const link = e.target.closest('.accountmenu__link[role="tab"]');
        if (!link) return;
        const href = link.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        e.preventDefault();
        const tab = href.slice(1);
        activate(tab);
    };

    const handleTargetClick = (e) => {
        const t = e.target.closest('[data-account-target]');
        if (!t) return;
        e.preventDefault();
        const tab = t.getAttribute('data-account-target');
        activate(tab);
    };

    const handleHashChange = () => {
        const tab = getTabFromHash();
        if (tab) activate(tab);
    };

    // Bootstrap
    document.addEventListener('click', handleMenuClick);
    document.addEventListener('click', handleTargetClick);
    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('DOMContentLoaded', initFromState);
})();
