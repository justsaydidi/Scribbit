/**
 * Warm-up Writing Screen
 * 2-minute free writing session. Nothing is saved.
 */

let warmupState = {
  timerInterval: null,
  secondsRemaining: 120, // 2 minutes
  nextScreen: 'home',
  nextParams: {}
};

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function exitWarmup(container) {
  if (warmupState.timerInterval) {
    clearInterval(warmupState.timerInterval);
    warmupState.timerInterval = null;
  }

  // SILENTLY DISCARD TEXT - Just navigate away
  // We show a transition overlay first if timer reached 0
  const overlay = container.querySelector('#warmup-transition');
  if (overlay && warmupState.secondsRemaining === 0) {
    overlay.classList.add('warmup-transition--visible');
    setTimeout(() => {
      window.scribbitRouter.navigate(warmupState.nextScreen, warmupState.nextParams);
    }, 1500);
  } else {
    // If cancelled via Escape
    if (window.scribbit && window.scribbit.window) {
      await window.scribbit.window.setWritingMode(false);
    }
    window.scribbitRouter.navigate(warmupState.nextScreen, warmupState.nextParams);
  }
}

async function render(container, params = {}) {
  warmupState.nextScreen = params.nextScreen || 'home';
  warmupState.nextParams = params.nextParams || {};
  warmupState.secondsRemaining = 120;

  if (window.scribbit && window.scribbit.window) {
    await window.scribbit.window.setWritingMode(true);
  }

  container.innerHTML = `
    <div class="writing-root warmup-root">
      <div class="writing-header">
        <div class="writing-timer" id="warmup-timer">Warm-up — 02:00</div>
      </div>

      <div class="writing-body">
        <div class="writing-main">
          <div class="writing-prompt">Write anything. Don't stop. Don't edit. Just go.</div>
          <textarea
            id="warmup-input"
            class="writing-input"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            placeholder="..."
          ></textarea>
        </div>
      </div>

      <div class="warmup-transition" id="warmup-transition">
        <div class="warmup-transition-card">
          <div class="warmup-transition-text">Good. Now the real thing.</div>
        </div>
      </div>
    </div>
  `;

  const timerEl = container.querySelector('#warmup-timer');
  const textarea = container.querySelector('#warmup-input');
  textarea.focus();

  warmupState.timerInterval = setInterval(() => {
    warmupState.secondsRemaining--;
    timerEl.textContent = `Warm-up — ${formatTime(warmupState.secondsRemaining)}`;

    if (warmupState.secondsRemaining <= 0) {
      exitWarmup(container);
    }
  }, 1000);

  // Escape cancels warmup silently and goes to main session
  const keyListener = (e) => {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', keyListener);
      exitWarmup(container);
    }
  };
  document.addEventListener('keydown', keyListener);
}

if (window.scribbitRouter) {
  window.scribbitRouter.register('warmup', render);
}

window.scribbitWarmup = { render };
