/**
 * Prompt Setup Screen
 * Generates and displays intermediate prompts for Prompted Writing sessions.
 */

async function render(container, params = {}) {
  container.innerHTML = `
    <div class="psu-root">
      <div class="psu-container" id="psu-container">
        <div class="psu-loading">
          <div class="psu-pulse"></div>
          <div class="psu-loading-text">Generating your prompt…</div>
        </div>
      </div>
    </div>
  `;

  const psuContainer = container.querySelector('#psu-container');

  async function generate() {
    psuContainer.innerHTML = `
      <button class="psu-back-btn" id="psu-back" style="position:absolute;top:20px;left:20px;background:none;border:none;font-size:24px;cursor:pointer;z-index:10;">←</button>
      <div class="psu-loading">
        <div class="psu-pulse"></div>
        <div class="psu-loading-text">Generating your prompt…</div>
      </div>
    `;
    
    psuContainer.querySelector('#psu-back')?.addEventListener('click', () => {
      window.scribbitRouter.navigate('home');
    });

    try {
      const profile = (await window.scribbit.db.get('profile')) || {};
      const interests = profile.interests || [];
      const writingTypes = profile.writingTypes || [];
      const usedPrompts = (await window.scribbit.db.get('scribbit_used_prompts')) || [];

      // Limit to 20 most recent if > 50
      const recentUsed = usedPrompts.length > 50 ? usedPrompts.slice(0, 20) : usedPrompts;
      const usedText = recentUsed.length > 0
        ? `\n\nThe following prompts have already been shown to this user. Do not generate anything similar to these: [${recentUsed.map(p => p.text).join(', ')}]. Generate something genuinely different in topic and angle.`
        : '';

      const systemPrompt = `You are a writing prompt generator. You will be given a user's interests and preferred writing styles. Generate exactly one writing prompt tailored to them.

Rules:
- The prompt must relate to at least one of their stated interests
- The prompt should match or rotate between their preferred writing styles
- The prompt must be specific enough to give direction but open enough not to feel restrictive
- The prompt must be written in plain, direct language — not overly poetic or abstract
- The prompt must be 1 to 3 sentences maximum
- Do not start with "Write about…" — instead, ask a question or set a scene or make a provocation
- Do not generate cliché prompts like "Write about a time you overcame a challenge"
- Return only the prompt text. Nothing else. No introduction, no label, no quotation marks.${usedText}`;

      const userMessage = `My interests are: ${interests.join(', ')}. My preferred writing styles are: ${writingTypes.join(', ')}.`;

      const prompt = await window.scribbit.ai.complete(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );

      renderPrompt(prompt);
    } catch (err) {
      console.error('Prompt generation error:', err);
      psuContainer.innerHTML = `
        <div class="psu-error">
          <p style="color:var(--color-error)">Failed to generate prompt. Please check your AI settings.</p>
          <div style="display:flex; gap:12px; margin-top:24px;">
            <button class="psu-btn-primary" id="psu-retry">Retry</button>
            <button class="psu-btn-text" id="psu-settings" style="text-decoration:none; border:1px solid var(--color-border); padding:8px 16px; border-radius:20px;">Settings</button>
          </div>
        </div>
      `;
      psuContainer.querySelector('#psu-retry').addEventListener('click', generate);
      psuContainer.querySelector('#psu-settings').addEventListener('click', () => {
        window.scribbitRouter.navigate('settings');
      });
    }
  }

  async function renderPrompt(promptText) {
    const savedPrompts = (await window.scribbit.db.get('scribbit_saved_prompts')) || [];
    let isSaved = savedPrompts.some(p => p.text === promptText);

    function updateInner() {
      psuContainer.innerHTML = `
        <button class="psu-back-btn" id="psu-back" style="position:absolute;top:20px;left:20px;background:none;border:none;font-size:24px;cursor:pointer;z-index:10;">←</button>
        <div class="psu-prompt-view">
          <div class="psu-prompt-box">
            <div class="psu-prompt-text">"${promptText}"</div>
            <button class="psu-bookmark-btn ${isSaved ? 'psu-bookmark-btn--active' : ''}" id="psu-bookmark" title="Save for later">
              ${isSaved ? '🔖' : '📑'}
            </button>
          </div>
          <div class="psu-actions">
            <button class="psu-btn-primary" id="psu-start">Start Writing</button>
            <button class="psu-btn-text" id="psu-again">Give me a different prompt</button>
          </div>
        </div>
      `;
      
      psuContainer.querySelector('#psu-back')?.addEventListener('click', () => {
        window.scribbitRouter.navigate('home');
      });

      psuContainer.querySelector('#psu-start').addEventListener('click', async () => {
        // Record as used
        const used = (await window.scribbit.db.get('scribbit_used_prompts')) || [];
        if (!used.some(p => p.text === promptText)) {
          used.unshift({ text: promptText, date: new Date().toISOString() });
          await window.scribbit.db.set('scribbit_used_prompts', used);
        }

        const settings = (await window.scribbit.db.get('settings')) || {};
        const showWarmup = settings.showWarmup !== false;

        if (showWarmup) {
          window.scribbitRouter.navigate('warmup-offer', {
            nextScreen: 'writing',
            nextParams: { type: 'prompted', prompt: promptText }
          });
        } else {
          window.scribbitRouter.navigate('writing', { type: 'prompted', prompt: promptText });
        }
      });

      psuContainer.querySelector('#psu-again').addEventListener('click', generate);

      psuContainer.querySelector('#psu-bookmark').addEventListener('click', async () => {
        const currentSaved = (await window.scribbit.db.get('scribbit_saved_prompts')) || [];
        if (isSaved) {
          const filtered = currentSaved.filter(p => p.text !== promptText);
          await window.scribbit.db.set('scribbit_saved_prompts', filtered);
          isSaved = false;
        } else {
          currentSaved.unshift({ text: promptText, date: new Date().toISOString() });
          await window.scribbit.db.set('scribbit_saved_prompts', currentSaved);
          isSaved = true;
        }
        updateInner();
      });
    }

    updateInner();
  }

  // Start generation on mount
  generate();
}

if (window.scribbitRouter) {
  window.scribbitRouter.register('prompt-setup', render);
}

window.scribbitPromptSetup = { render };
