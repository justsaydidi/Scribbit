/**
 * Theme manager for Scribbit renderer.
 * Exposed on window.scribbitTheme for use by other renderer scripts.
 */

const THEME_ATTR = 'data-theme';
const DEFAULT_THEME = 'light';

function applyTheme(mode) {
    document.documentElement.setAttribute(THEME_ATTR, mode || DEFAULT_THEME);
}

async function initTheme() {
    try {
        const saved = await window.scribbit.theme.get();
        applyTheme(saved || DEFAULT_THEME);
    } catch {
        applyTheme(DEFAULT_THEME);
    }
    window.scribbit.theme.onChange((mode) => applyTheme(mode));
}

async function toggleTheme() {
    const current = document.documentElement.getAttribute(THEME_ATTR) || DEFAULT_THEME;
    const next = current === 'light' ? 'dark' : 'light';
    await window.scribbit.theme.set(next);
    applyTheme(next);
    return next;
}

async function setTheme(mode) {
    await window.scribbit.theme.set(mode);
    applyTheme(mode);
}

window.scribbitTheme = { initTheme, toggleTheme, setTheme, applyTheme };
