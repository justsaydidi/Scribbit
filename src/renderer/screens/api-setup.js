/**
 * API Key Setup Screen
 * Shown on the very first launch if no API key is found.
 */

async function render(container) {
  let selectedProvider = 'gemini';

  const PROVIDER_DATA = {
    gemini: {
      name: 'Google Gemini',
      logo: '✨',
      label: 'Free tier available. Recommended for most users.',
      placeholder: 'Enter Gemini API key...',
      helpUrl: 'https://aistudio.google.com/app/apikey'
    },
    anthropic: {
      name: 'Anthropic Claude',
      logo: '🦉',
      label: 'High quality responses.',
      placeholder: 'sk-ant-...',
      helpUrl: 'https://console.anthropic.com/account/keys'
    },
    openai: {
      name: 'OpenAI (GPT-4o)',
      logo: '🤖',
      label: 'GPT-4o mini. Widely used.',
      placeholder: 'sk-...',
      helpUrl: 'https://platform.openai.com/api-keys'
    },
    mistral: {
      name: 'Mistral AI',
      logo: '🌪️',
      label: 'Lightweight and fast.',
      placeholder: 'Enter Mistral API key...',
      helpUrl: 'https://console.mistral.ai/api-keys'
    }
  };

  function buildHtml() {
    return `
      <div class="asu-root">
        <div class="asu-container">
          <header class="asu-header">
            <h1 class="asu-title">Welcome to Scribbit</h1>
            <p class="asu-description">
              Scribbit uses AI to generate writing prompts and give you feedback after each session. 
              Choose your preferred AI provider below and add your API key. 
              Your key is stored only on your computer.
            </p>
          </header>

          <div class="asu-providers">
            ${Object.entries(PROVIDER_DATA).map(([id, data]) => `
              <div class="asu-provider-card ${selectedProvider === id ? 'asu-provider-card--active' : ''}" data-provider="${id}">
                <div class="asu-provider-logo">${data.logo}</div>
                <div class="asu-provider-name">${data.name}</div>
                <div class="asu-provider-label">${data.label}</div>
              </div>
            `).join('')}
          </div>

          <div class="asu-form">
            <div class="asu-input-group">
              <label class="asu-label" id="asu-key-label" for="asu-key-input">API Key for ${PROVIDER_DATA[selectedProvider].name}</label>
              <div class="asu-input-wrapper">
                <input 
                  type="password" 
                  id="asu-key-input" 
                  class="asu-input" 
                  placeholder="${PROVIDER_DATA[selectedProvider].placeholder}"
                  autocomplete="off"
                />
                <button class="asu-toggle-show" id="asu-toggle" type="button" title="Show/Hide">👁️</button>
              </div>
            </div>
            <button class="asu-btn-primary" id="asu-continue">Save & Continue</button>
            <a class="asu-help-link" id="asu-help">How do I get an API key for ${PROVIDER_DATA[selectedProvider].name}?</a>
          </div>
        </div>
      </div>
    `;
  }

  function update() {
    container.innerHTML = buildHtml();
    attachListeners();
  }

  function attachListeners() {
    const input = container.querySelector('#asu-key-input');
    const toggleBtn = container.querySelector('#asu-toggle');
    const continueBtn = container.querySelector('#asu-continue');
    const helpLink = container.querySelector('#asu-help');
    const cards = container.querySelectorAll('.asu-provider-card');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        selectedProvider = card.dataset.provider;
        update();
      });
    });

    toggleBtn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? '🔒' : '👁️';
    });

    helpLink.addEventListener('click', () => {
      const url = PROVIDER_DATA[selectedProvider].helpUrl;
      if (window.scribbit && window.scribbit.shell) {
        window.scribbit.shell.openExternal(url);
      }
    });

    continueBtn.addEventListener('click', async () => {
      const key = input.value.trim();
      if (!key) {
        input.style.borderColor = 'var(--color-error)';
        return;
      }

      continueBtn.disabled = true;
      continueBtn.textContent = 'Validating…';

      try {
        // Validate the API key first
        const validation = await window.scribbit.ai.validateApiKey(key, selectedProvider);
        
        if (!validation.valid) {
          continueBtn.disabled = false;
          continueBtn.textContent = 'Save & Continue';
          input.style.borderColor = 'var(--color-error)';
          input.placeholder = `Invalid key: ${validation.error}`;
          return;
        }

        continueBtn.textContent = 'Saving…';
        await window.scribbit.ai.setProvider(selectedProvider);
        await window.scribbit.ai.setApiKey(key);

        const settings = (await window.scribbit.db.get('settings')) || {};
        if (settings.onboardingComplete) {
          window.scribbitRouter.navigate('home');
        } else {
          window.scribbitRouter.navigate('onboarding');
        }
      } catch (err) {
        console.error('Failed to save AI config:', err);
        continueBtn.disabled = false;
        continueBtn.textContent = 'Save & Continue';
        alert('Error saving settings. Please try again. ' + err.message);
      }
    });
  }

  update();
}

if (window.scribbitRouter) {
  window.scribbitRouter.register('api-setup', render);
}

window.scribbitApiSetup = { render };
