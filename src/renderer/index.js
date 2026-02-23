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

// ── Draft Recovery ─────────────────────────────────────────────────────
let draftRecoveryPrompted = false;

async function checkForDraftRecovery() {
    try {
        const draft = await window.scribbit.db.get('sessionDraft');
        if (draft && draft.text && draft.text.trim().length > 0) {
            return draft;
        }
    } catch (err) {
        console.error('Draft check error:', err);
    }
    return null;
}

async function showDraftRecoveryModal(draft) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="draft-recovery-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;">
            <div class="draft-recovery-card" style="background:var(--color-bg-primary);border-radius:var(--radius-lg);padding:32px;max-width:420px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,0.2);">
                <h2 style="margin:0 0 12px;font-size:var(--font-size-xl);color:var(--color-text-primary);">Resume your writing?</h2>
                <p style="margin:0 0 24px;color:var(--color-text-secondary);line-height:1.5;">
                    We found an unsaved writing session from before. Would you like to continue where you left off?
                </p>
                <div style="background:var(--color-bg-secondary);padding:16px;border-radius:var(--radius-md);margin-bottom:24px;max-height:120px;overflow:auto;">
                    <p style="margin:0;font-size:var(--font-size-sm);color:var(--color-text-muted);">
                        ${draft.text.substring(0, 200)}${draft.text.length > 200 ? '...' : ''}
                    </p>
                    <p style="margin:8px 0 0;font-size:var(--font-size-xs);color:var(--color-text-muted);">
                        ${draft.wordCount || 0} words · ${new Date(draft.updatedAt).toLocaleString()}
                    </p>
                </div>
                <div style="display:flex;gap:12px;">
                    <button id="draft-discard" style="flex:1;padding:12px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:transparent;cursor:pointer;color:var(--color-text-secondary);font-size:var(--font-size-base);">
                        Discard
                    </button>
                    <button id="draft-resume" style="flex:1;padding:12px;border:none;border-radius:var(--radius-md);background:var(--color-primary);color:white;cursor:pointer;font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">
                        Resume Writing
                    </button>
                </div>
            </div>
        </div>
    `;

    return new Promise((resolve) => {
        document.getElementById('draft-discard')?.addEventListener('click', async () => {
            await window.scribbit.db.delete('sessionDraft');
            resolve('discard');
        });
        document.getElementById('draft-resume')?.addEventListener('click', async () => {
            resolve('resume');
        });
    });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
// Wait for all scripts to load, then decide which screen to show.
window.addEventListener('load', async function init() {
    const app = document.getElementById('app');
    if (window.scribbitTheme && window.scribbitTheme.initTheme) {
        window.scribbitTheme.initTheme();
    }

    try {
        // Check for API key more robustly
        const apiKey = await window.scribbit.db.get('scribbit_api_key');
        const hasKey = apiKey && apiKey.trim().length > 0;
        
        if (!hasKey) {
            window.scribbitRouter.navigate('api-setup');
            return;
        }

        // Check for draft recovery BEFORE navigating to home
        const draft = await checkForDraftRecovery();
        if (draft && !draftRecoveryPrompted) {
            draftRecoveryPrompted = true;
            const action = await showDraftRecoveryModal(draft);
            if (action === 'resume') {
                // Navigate to writing with draft data
                window.scribbitRouter.navigate('writing', { 
                    type: draft.type, 
                    prompt: draft.prompt, 
                    readingMaterial: draft.readingMaterial,
                    resumeDraft: true,
                    draftText: draft.text
                });
                return;
            }
            // If discard, continue to home
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
