/**
 * Read & Respond Setup Screen
 * Intermediate screen for pasting reading material.
 */

async function render(container) {
  container.innerHTML = `
    <div class="rsu-root">
      <div class="rsu-container">
        <header class="rsu-header">
          <h1 class="rsu-title">Paste what you'd like to respond to</h1>
        </header>

        <div class="rsu-form">
          <textarea 
            id="rsu-textarea" 
            class="rsu-textarea" 
            placeholder="Paste an article, a quote, a paragraph — anything you want to think and write about."
          ></textarea>
          <button class="rsu-btn-primary" id="rsu-start">Start Writing</button>
        </div>

        <div class="rsu-back-link">
          <button class="rsu-back-btn" id="rsu-back">Go back</button>
        </div>
      </div>
    </div>
  `;

  const textarea = container.querySelector('#rsu-textarea');
  const startBtn = container.querySelector('#rsu-start');
  const backBtn = container.querySelector('#rsu-back');

  textarea.focus();

  startBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) {
      textarea.style.borderColor = 'var(--color-error)';
      return;
    }

    if (window.scribbitRouter && window.scribbitRouter.navigate) {
      const settings = (await window.scribbit.db.get('settings')) || {};
      const showWarmup = settings.showWarmup !== false;

      if (showWarmup) {
        window.scribbitRouter.navigate('warmup-offer', {
          nextScreen: 'writing',
          nextParams: { type: 'respond', readingMaterial: text }
        });
      } else {
        window.scribbitRouter.navigate('writing', {
          type: 'respond',
          readingMaterial: text
        });
      }
    }
  });

  backBtn.addEventListener('click', () => {
    if (window.scribbitRouter && window.scribbitRouter.navigate) {
      window.scribbitRouter.navigate('home');
    }
  });
}

if (window.scribbitRouter) {
  window.scribbitRouter.register('respond-setup', render);
}

window.scribbitRespondSetup = { render };
