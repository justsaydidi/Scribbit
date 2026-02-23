/**
 * Writing Screen
 * Focused writing experience with timer and autosave.
 * Autosaves continuously like Google Docs - no manual save needed.
 */

const AUTOSAVE_INTERVAL_MS = 5 * 1000;
const DEBOUNCE_SAVE_MS = 3000;
const DEFAULT_PROMPT = 'Write about a moment that changed your perspective.';

let sessionState = null;
let timerInterval = null;
let autosaveInterval = null;
let debounceTimeout = null;
let allowUnload = false;
let escapeListener = null;
let currentTextarea = null;

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function wordCount(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

function getSessionTypeLabel(type) {
    if (type === 'prompted') return 'Prompted Writing';
    if (type === 'respond') return 'Read & Respond';
    return 'Free Writing';
}

function createChime() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    const context = new AudioContext();
    return () => {
        const now = context.currentTime;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
        gain.connect(context.destination);

        const osc = context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 1.0);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 1.2);
    };
}

async function saveDraft(textarea) {
    if (!sessionState) return;
    const draft = {
        ...sessionState,
        text: textarea.value,
        updatedAt: new Date().toISOString(),
    };
    await window.scribbit.db.set('sessionDraft', draft);
}

async function autosaveSession(textarea) {
    if (!sessionState || !textarea) return;
    
    const text = textarea.value;
    if (!text || text.trim().length === 0) return;
    
    const sessions = (await window.scribbit.db.get('sessions')) || [];
    const existingIndex = sessions.findIndex(s => s.id === sessionState.id);
    
    const sessionData = {
        id: sessionState.id,
        date: sessionState.startedAt,
        sessionType: getSessionTypeLabel(sessionState.type),
        prompt: sessionState.prompt || null,
        readingMaterial: sessionState.readingMaterial || null,
        text,
        wordCount: wordCount(text),
        lastAutosaved: new Date().toISOString(),
        exitMode: 'autosave',
    };
    
    if (existingIndex !== -1) {
        sessions[existingIndex] = sessionData;
    } else {
        sessions.unshift(sessionData);
    }
    
    await window.scribbit.db.set('sessions', sessions);
    
    const saveIndicator = document.getElementById('autosave-indicator');
    if (saveIndicator) {
        saveIndicator.textContent = 'Saved';
        setTimeout(() => {
            if (saveIndicator) saveIndicator.textContent = '';
        }, 2000);
    }
}

async function saveSession(textarea, mode = 'complete') {
    if (!sessionState) return null;
    const text = textarea.value;
    const sessions = (await window.scribbit.db.get('sessions')) || [];
    
    const existingIndex = sessions.findIndex(s => s.id === sessionState.id);
    
    const savedSession = {
        id: sessionState.id,
        date: sessionState.startedAt,
        sessionType: getSessionTypeLabel(sessionState.type),
        prompt: sessionState.prompt || null,
        readingMaterial: sessionState.readingMaterial || null,
        text,
        wordCount: wordCount(text),
        completedAt: new Date().toISOString(),
        exitMode: mode,
    };
    
    if (existingIndex !== -1) {
        sessions[existingIndex] = savedSession;
    } else {
        sessions.unshift(savedSession);
    }
    
    await window.scribbit.db.set('sessions', sessions);
    await window.scribbit.db.delete('sessionDraft');
    return savedSession;
}

function showExitOverlay(show) {
    const overlay = document.getElementById('writing-exit-overlay');
    if (!overlay) return;
    overlay.classList.toggle('writing-overlay--visible', show);
}

function showTimeUpBar(show) {
    const bar = document.getElementById('writing-timeup');
    if (!bar) return;
    bar.classList.toggle('writing-timeup--visible', show);
}

function stopIntervals() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (autosaveInterval) {
        clearInterval(autosaveInterval);
        autosaveInterval = null;
    }
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = null;
    }
}

function triggerDebouncedSave(textarea) {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(() => {
        autosaveSession(textarea);
    }, DEBOUNCE_SAVE_MS);
}

async function exitWritingMode() {
    if (currentTextarea) {
        await autosaveSession(currentTextarea);
    }
    if (window.scribbit && window.scribbit.window) {
        await window.scribbit.window.setWritingMode(false);
    }
    allowUnload = true;
    window.onbeforeunload = null;
    if (escapeListener) {
        document.removeEventListener('keydown', escapeListener);
        escapeListener = null;
    }
    currentTextarea = null;
}

async function handleFinish(textarea) {
    stopIntervals();
    await saveSession(textarea, 'complete');
    await exitWritingMode();
    // Stop ambient sound
    if (window.scribbitAmbientSound) {
        window.scribbitAmbientSound.stop();
    }
    if (window.scribbitRouter && window.scribbitRouter.navigate) {
        window.scribbitRouter.navigate('post-session', { id: sessionState.id });
    }
}

async function handleSaveExit(textarea) {
    stopIntervals();
    await saveSession(textarea, 'exit');
    await exitWritingMode();
    // Stop ambient sound
    if (window.scribbitAmbientSound) {
        window.scribbitAmbientSound.stop();
    }
    if (window.scribbitRouter && window.scribbitRouter.navigate) {
        window.scribbitRouter.navigate('home');
    }
}

async function initTimer(textarea) {
    const timerEl = document.getElementById('writing-timer');

    // Get timer length from settings (default to 30 minutes)
    const settings = (await window.scribbit.db.get('settings')) || {};
    const timerLengthMinutes = settings.timerLength || 30;
    const sessionSeconds = timerLengthMinutes * 60;

    let remaining = sessionSeconds;
    const startTime = Date.now();
    timerEl.textContent = formatTime(remaining);

    // Get sound setting from settings (default to true)
    const sessionSound = settings.sessionSound !== false;
    const playChime = sessionSound ? createChime() : null;

    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        remaining = Math.max(sessionSeconds - elapsed, 0);
        if (remaining > 0) {
            timerEl.textContent = formatTime(remaining);
            return;
        }

        timerEl.textContent = "Time's up.";
        clearInterval(timerInterval);
        timerInterval = null;
        showTimeUpBar(true);
        if (playChime) playChime();
        // Stop ambient sound when timer ends
        if (window.scribbitAmbientSound) {
            window.scribbitAmbientSound.stop();
        }
    }, 1000);
}

async function render(container, params = {}) {
    allowUnload = false;
    if (window.scribbit && window.scribbit.window) {
        await window.scribbit.window.setWritingMode(true);
    }

    const sessionType = params.type || 'free';
    sessionState = {
        id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : `session-${Date.now()}`,
        type: sessionType,
        prompt: sessionType === 'prompted' ? (params.prompt || DEFAULT_PROMPT) : null,
        readingMaterial: sessionType === 'respond' ? (params.readingMaterial || 'No reading material yet.') : null,
        startedAt: new Date().toISOString(),
    };

    // Start ambient sound if configured
    const settings = (await window.scribbit.db.get('settings')) || {};
    const ambientSound = settings.ambientSound || 'silence';
    const ambientVolume = (settings.ambientVolume ?? 50) / 100;

    if (ambientSound !== 'silence' && window.scribbitAmbientSound) {
        window.scribbitAmbientSound.play(ambientSound, ambientVolume);
    }

    container.innerHTML = `
    <div class="writing-root">
      <div class="writing-header">
        <div class="writing-timer" id="writing-timer">30:00</div>
        <div class="autosave-indicator" id="autosave-indicator"></div>
      </div>

      <div class="writing-body">
        <div class="writing-main" id="writing-main">
          <div class="writing-prompt" id="writing-prompt"></div>
          <textarea
            id="writing-input"
            class="writing-input"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            placeholder="Start writing here..."
          ></textarea>
        </div>
        <aside class="writing-sidebar writing-sidebar--hidden" id="writing-sidebar">
          <div class="writing-sidebar-title">Reading Material</div>
          <div id="writing-reading"></div>
        </aside>
      </div>

      <button class="writing-sidebar-toggle" id="writing-sidebar-toggle" type="button">Reading</button>

      <div class="writing-overlay" id="writing-exit-overlay">
        <div class="writing-overlay-card">
          <div class="writing-overlay-title">Your session is still running.</div>
          <div class="writing-overlay-actions">
            <button class="writing-btn" id="writing-keep">Keep Writing</button>
            <button class="writing-btn writing-btn--primary" id="writing-save-exit">Save &amp; Exit</button>
          </div>
        </div>
      </div>

      <div class="writing-timeup" id="writing-timeup">
        <div class="writing-timeup-text">Your writing time is up.</div>
        <div class="writing-timeup-actions">
          <button class="writing-btn" id="writing-keep-going">Keep Writing</button>
          <button class="writing-btn writing-btn--primary" id="writing-finish">Finish Session</button>
        </div>
      </div>
    </div>
  `;

    const textarea = container.querySelector('#writing-input');
    const promptEl = container.querySelector('#writing-prompt');
    const sidebar = container.querySelector('#writing-sidebar');
    const sidebarToggle = container.querySelector('#writing-sidebar-toggle');
    const readingEl = container.querySelector('#writing-reading');
    
    currentTextarea = textarea;

    if (sessionState.prompt) {
        promptEl.textContent = sessionState.prompt;
    } else {
        promptEl.style.display = 'none';
    }

    if (sessionState.readingMaterial) {
        readingEl.textContent = sessionState.readingMaterial;
        sidebar.classList.remove('writing-sidebar--hidden');
        sidebarToggle.textContent = 'Hide';
        sidebarToggle.dataset.open = 'true';
    } else {
        sidebar.classList.add('writing-sidebar--hidden');
        sidebarToggle.style.display = 'none';
    }

    sidebarToggle.addEventListener('click', () => {
        const isOpen = sidebarToggle.dataset.open === 'true';
        sidebarToggle.dataset.open = isOpen ? 'false' : 'true';
        sidebarToggle.textContent = isOpen ? 'Show' : 'Hide';
        sidebar.classList.toggle('writing-sidebar--hidden', isOpen);
    });

    textarea.focus();

    textarea.addEventListener('input', () => {
        triggerDebouncedSave(textarea);
    });

    autosaveInterval = setInterval(() => {
        autosaveSession(textarea);
    }, AUTOSAVE_INTERVAL_MS);

    await initTimer(textarea);

    if (escapeListener) {
        document.removeEventListener('keydown', escapeListener);
    }
    escapeListener = (event) => {
        if (event.key === 'Escape') {
            showExitOverlay(true);
        }
    };
    document.addEventListener('keydown', escapeListener);

    window.onbeforeunload = (event) => {
        if (allowUnload) return;
        event.preventDefault();
        showExitOverlay(true);
        event.returnValue = '';
    };

    container.querySelector('#writing-keep').addEventListener('click', () => showExitOverlay(false));
    container.querySelector('#writing-save-exit').addEventListener('click', () => handleSaveExit(textarea));
    container.querySelector('#writing-keep-going').addEventListener('click', () => {
        showTimeUpBar(false);
        // Hide the timer when continuing after time's up
        const timerEl = document.getElementById('writing-timer');
        if (timerEl) {
            timerEl.style.display = 'none';
        }
    });
    container.querySelector('#writing-finish').addEventListener('click', () => handleFinish(textarea));
}

if (window.scribbitRouter) {
    window.scribbitRouter.register('writing', render);
}

window.scribbitWriting = { 
    render,
    autosaveSession: async () => {
        if (currentTextarea && sessionState) {
            await autosaveSession(currentTextarea);
        }
    }
};
