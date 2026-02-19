/**
 * Scribbit Renderer Entry Point
 * Initialises theme, sets up router, and boots to the correct screen.
 */

// ── Theme initialisation ──────────────────────────────────────────────────
(async function initTheme() {
    const DEFAULT_THEME = 'light';
    try {
        const saved = await window.scribbit.theme.get();
        document.documentElement.setAttribute('data-theme', saved || DEFAULT_THEME);
    } catch {
        document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
    }
    window.scribbit.theme.onChange((mode) => {
        document.documentElement.setAttribute('data-theme', mode);
    });
})();

// ── Simple client-side router ─────────────────────────────────────────────
const routes = {};

window.scribbitRouter = {
    register(name, renderFn) {
        routes[name] = renderFn;
    },
    navigate(name, params = {}) {
        const app = document.getElementById('app');
        if (!app) return;
        const renderFn = routes[name];
        if (!renderFn) {
            // Home screen not built yet — show placeholder
            app.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--font-family);color:var(--color-text-secondary);">
          <p>🏠 Home screen coming soon…</p>
        </div>`;
            return;
        }
        app.innerHTML = '';
        renderFn(app, params);
    },
};

// ── Bootstrap ─────────────────────────────────────────────────────────────
// Wait for all scripts to load, then decide which screen to show.
window.addEventListener('load', async function init() {
    const app = document.getElementById('app');
    if (window.scribbitTheme && window.scribbitTheme.initTheme) {
        window.scribbitTheme.initTheme();
    }

    try {
        const hasKey = await window.scribbit.ai.hasApiKey();
        if (!hasKey) {
            window.scribbitRouter.navigate('api-setup');
            return;
        }

        const settings = (await window.scribbit.db.get('settings')) || {};
        if (settings.onboardingComplete) {
            window.scribbitRouter.navigate('home');
        } else {
            window.scribbitRouter.navigate('onboarding');
        }
    } catch (err) {
        console.error('Bootstrap error:', err);
        // Default to setup if we can't determine state
        window.scribbitRouter.navigate('api-setup');
    }
});
