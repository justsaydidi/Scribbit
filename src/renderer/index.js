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
        if (!renderFn) return;

        // Apply exit animation to existing content
        const currentScreen = app.firstElementChild;
        if (currentScreen) {
            currentScreen.classList.add('screen-exit');
            // Wait for exit animation to finish before rendering new screen
            setTimeout(() => {
                app.innerHTML = '';
                const screenWrapper = document.createElement('div');
                screenWrapper.className = 'screen-enter';
                app.appendChild(screenWrapper);
                renderFn(screenWrapper, params);
            }, 200);
        } else {
            app.innerHTML = '';
            const screenWrapper = document.createElement('div');
            screenWrapper.className = 'screen-enter';
            app.appendChild(screenWrapper);
            renderFn(screenWrapper, params);
        }
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
