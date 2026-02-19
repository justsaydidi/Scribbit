/**
 * Onboarding Screen
 * Multi-step profile setup shown only on first launch.
 * Steps: 1) Name  2) Interests  3) Writing Types  4) Open Prompt
 */

const INTERESTS = [
    'Business & Entrepreneurship', 'Technology', 'Personal Development',
    'Relationships', 'Culture & Society', 'Faith', 'Health & Wellbeing',
    'Finance', 'Leadership', 'Creativity', 'Current Events', 'History',
    'Philosophy', 'Sports',
];

const WRITING_TYPES = [
    'Storytelling', 'Opinion Writing', 'Thought Leadership', 'Journaling',
    'Essays', 'Articles', 'Sales & Marketing Copy', 'Free Writing',
];

const STEPS = ['name', 'interests', 'writing', 'prompt'];

// ── State ─────────────────────────────────────────────────────────────────
let state = {
    step: 0,
    name: '',
    interests: new Set(),
    writingTypes: new Set(),
    openPrompt: '',
};

let isEditMode = false;

// ── Render helpers ────────────────────────────────────────────────────────

function renderStep(container) {
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'ob-wrapper';

    const card = document.createElement('div');
    card.className = 'ob-card';

    const progress = buildProgress();
    card.appendChild(progress);

    const body = document.createElement('div');
    body.className = 'ob-body';

    switch (STEPS[state.step]) {
        case 'name': buildNameStep(body); break;
        case 'interests': buildTagStep(body, 'interests'); break;
        case 'writing': buildTagStep(body, 'writing'); break;
        case 'prompt': buildPromptStep(body); break;
    }

    card.appendChild(body);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
}

function buildProgress() {
    const el = document.createElement('div');
    el.className = 'ob-progress';
    STEPS.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'ob-dot' + (i === state.step ? ' ob-dot--active' : i < state.step ? ' ob-dot--done' : '');
        el.appendChild(dot);
    });
    return el;
}

// ── Step 1: Name ──────────────────────────────────────────────────────────

function buildNameStep(body) {
    body.innerHTML = `
    <p class="ob-eyebrow">Welcome to Scribbit</p>
    <h1 class="ob-heading">What should we call you?</h1>
    <p class="ob-sub">Just your first name is fine.</p>
    <input
      id="ob-name-input"
      class="ob-input"
      type="text"
      placeholder="Your first name"
      maxlength="50"
      autocomplete="off"
      value="${escHtml(state.name)}"
    />
    <div class="ob-actions">
      <button id="ob-next-btn" class="ob-btn ob-btn--primary">Continue →</button>
    </div>
  `;

    const input = body.querySelector('#ob-name-input');
    const btn = body.querySelector('#ob-next-btn');

    input.focus();

    input.addEventListener('input', () => { state.name = input.value.trim(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') advance(); });
    btn.addEventListener('click', advance);
}

// ── Step 2 & 3: Tag selection ─────────────────────────────────────────────

function buildTagStep(body, type) {
    const isInterests = type === 'interests';
    const tags = isInterests ? INTERESTS : WRITING_TYPES;
    const chosen = isInterests ? state.interests : state.writingTypes;

    const heading = isInterests
        ? 'What topics interest you?'
        : 'What kinds of writing do you want to practice?';
    const sub = isInterests
        ? 'Select everything that resonates — you can change this later.'
        : 'Pick one or more. No wrong answers.';

    body.innerHTML = `
    <h1 class="ob-heading">${heading}</h1>
    <p class="ob-sub">${sub}</p>
    <div class="ob-tags" id="ob-tags"></div>
    <div class="ob-actions">
      <button id="ob-back-btn" class="ob-btn ob-btn--ghost">← Back</button>
      <button id="ob-next-btn" class="ob-btn ob-btn--primary">Continue →</button>
    </div>
  `;

    const tagsEl = body.querySelector('#ob-tags');
    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'ob-tag' + (chosen.has(tag) ? ' ob-tag--selected' : '');
        btn.textContent = tag;
        btn.addEventListener('click', () => {
            if (chosen.has(tag)) { chosen.delete(tag); btn.classList.remove('ob-tag--selected'); }
            else { chosen.add(tag); btn.classList.add('ob-tag--selected'); }
        });
        tagsEl.appendChild(btn);
    });

    body.querySelector('#ob-back-btn').addEventListener('click', () => { state.step--; renderStep(document.getElementById('app')); });
    body.querySelector('#ob-next-btn').addEventListener('click', advance);
}

// ── Step 4: Open prompt ───────────────────────────────────────────────────

function buildPromptStep(body) {
    body.innerHTML = `
    <h1 class="ob-heading">Almost there.</h1>
    <p class="ob-sub">Share anything you'd like us to keep in mind.</p>
    <label class="ob-label" for="ob-prompt-input">What's on your mind lately? (Optional — helps us give you better prompts)</label>
    <textarea
      id="ob-prompt-input"
      class="ob-textarea"
      placeholder="Anything goes — a project, a feeling, a question you've been sitting with…"
      rows="5"
    >${escHtml(state.openPrompt)}</textarea>
    <div class="ob-actions">
      <button id="ob-back-btn" class="ob-btn ob-btn--ghost">← Back</button>
      <button id="ob-save-btn" class="ob-btn ob-btn--primary">${isEditMode ? 'Save Changes' : 'Save &amp; Start Writing'}</button>
    </div>
  `;

    const textarea = body.querySelector('#ob-prompt-input');
    textarea.addEventListener('input', () => { state.openPrompt = textarea.value; });

    body.querySelector('#ob-back-btn').addEventListener('click', () => { state.step--; renderStep(document.getElementById('app')); });
    body.querySelector('#ob-save-btn').addEventListener('click', saveAndFinish);
}

// ── Navigation ────────────────────────────────────────────────────────────

function advance() {
    if (STEPS[state.step] === 'name' && !state.name) {
        const input = document.getElementById('ob-name-input');
        if (input) { input.classList.add('ob-input--error'); input.focus(); }
        return;
    }
    state.step++;
    renderStep(document.getElementById('app'));
}

// ── Save ──────────────────────────────────────────────────────────────────

async function saveAndFinish() {
    const btn = document.getElementById('ob-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    const profile = {
        name: state.name,
        interests: [...state.interests],
        writingTypes: [...state.writingTypes],
        openPrompt: state.openPrompt,
        completedAt: new Date().toISOString(),
    };

    try {
        await window.scribbit.db.set('profile', profile);

        // Mark onboarding as done
        const settings = (await window.scribbit.db.get('settings')) || {};
        settings.onboardingComplete = true;
        await window.scribbit.db.set('settings', settings);

        // Navigate based on mode
        if (window.scribbitRouter && window.scribbitRouter.navigate) {
            if (isEditMode) {
                window.scribbitRouter.navigate('settings');
            } else {
                window.scribbitRouter.navigate('home');
            }
        } else {
            showSavedPlaceholder(profile);
        }
    } catch (err) {
        console.error('Failed to save profile:', err);
        if (btn) { btn.disabled = false; btn.textContent = 'Save & Start Writing'; }
    }
}

function showSavedPlaceholder(profile) {
    const app = document.getElementById('app');
    app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;font-family:var(--font-family);color:var(--color-text-primary);">
      <div style="font-size:48px;">✍️</div>
      <h2 style="font-size:var(--font-size-xl);font-weight:var(--font-weight-semibold);">Welcome, ${escHtml(profile.name)}!</h2>
      <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);">Profile saved. Home screen coming soon.</p>
      <pre style="margin-top:24px;background:var(--color-bg-secondary);padding:16px;border-radius:var(--radius-md);font-size:11px;max-width:480px;overflow:auto;">${JSON.stringify(profile, null, 2)}</pre>
    </div>
  `;
}

// ── Utility ───────────────────────────────────────────────────────────────

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Register with router ──────────────────────────────────────────────────

async function render(container, params = {}) {
    // Check if we're in edit mode
    isEditMode = params.editMode === true;

    if (isEditMode) {
        // Load existing profile data
        const profile = (await window.scribbit.db.get('profile')) || {};
        state = {
            step: 0,
            name: profile.name || '',
            interests: new Set(profile.interests || []),
            writingTypes: new Set(profile.writingTypes || []),
            openPrompt: profile.openPrompt || '',
        };
    } else {
        // Reset state for fresh onboarding
        state = { step: 0, name: '', interests: new Set(), writingTypes: new Set(), openPrompt: '' };
    }

    renderStep(container);
}

if (window.scribbitRouter) {
    window.scribbitRouter.register('onboarding', render);
}

window.scribbitOnboarding = { render };
