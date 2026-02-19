/**
 * Warm-up Offer Screen
 * Intermediate screen asking the user if they want a 2-minute warm-up.
 */

async function render(container, params = {}) {
  const { nextScreen, nextParams } = params;

  container.innerHTML = `
    <div class="wo-root">
      <div class="wo-container">
        <div class="wo-icon">🧘‍♂️</div>
        <h1 class="wo-title">Want to warm up first?</h1>
        <p class="wo-text">
          2 minutes of completely free writing before your session. 
          No prompt, no pressure, nothing saved. Just clear your head.
        </p>
        
        <div class="wo-actions">
          <button class="wo-btn-primary" id="wo-yes">Yes, warm me up</button>
          <button class="wo-btn-text" id="wo-skip">Skip, start writing</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#wo-yes').addEventListener('click', () => {
    window.scribbitRouter.navigate('warmup', { nextScreen, nextParams });
  });

  container.querySelector('#wo-skip').addEventListener('click', () => {
    window.scribbitRouter.navigate(nextScreen, nextParams);
  });
}

if (window.scribbitRouter) {
  window.scribbitRouter.register('warmup-offer', render);
}

window.scribbitWarmupOffer = { render };
