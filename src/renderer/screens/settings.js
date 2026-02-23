/**
 * Settings Screen
 * Manage profile, timer, theme, sound, and API settings.
 */

const TIMER_OPTIONS = [15, 20, 30, 45];
const APP_VERSION = '1.0.0';

async function render(container) {
  const profile = (await window.scribbit.db.get('profile')) || {};
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const apiKey = (await window.scribbit.db.get('scribbit_api_key')) || '';
  const currentProvider = await window.scribbit.ai.getProvider();

  // Get app settings with defaults
  const settings = (await window.scribbit.db.get('settings')) || {};
  const timerLength = settings.timerLength || 30;
  const sessionSound = settings.sessionSound !== false; // Default true
  const showWarmup = settings.showWarmup !== false; // Default true
  const ambientSound = settings.ambientSound || 'silence';
  const ambientVolume = settings.ambientVolume ?? 50;

  const PROVIDER_DATA = {
    gemini: { name: 'Google Gemini', logo: '✨', placeholder: 'Enter Gemini key...' },
    anthropic: { name: 'Anthropic Claude', logo: '🦉', placeholder: 'sk-ant-...' },
    openai: { name: 'OpenAI (GPT-4o)', logo: '🤖', placeholder: 'sk-...' },
    mistral: { name: 'Mistral AI', logo: '🌪️', placeholder: 'Enter Mistral key...' }
  };

  let editProvider = currentProvider;
  const maskedKey = apiKey ? `••••••••••••••••••••${apiKey.slice(-4)}` : 'Not set';

  function buildHtml() {
    return `
      <div class="st-root">
        <div class="st-container">
          <header class="st-header">
            <button class="st-back-btn" id="st-back" aria-label="Back to dashboard">←</button>
            <h1 class="st-title">Settings</h1>
          </header>

          <!-- Profile -->
          <section class="st-section">
            <div class="st-section-title">Profile</div>
            <div class="st-card">
              <div class="st-profile-header">
                <div class="st-profile-info">
                  <div class="st-profile-name">${escHtml(profile.name || 'Not set')}</div>
                  <div class="st-profile-tags" id="st-tags"></div>
                </div>
                <button class="st-edit-btn" id="st-edit-profile">Edit Profile</button>
              </div>
            </div>
          </section>

          <!-- Timer Settings -->
          <section class="st-section">
            <div class="st-section-title">Timer Length</div>
            <div class="st-timer-group">
              ${TIMER_OPTIONS.map(min => `
                <button class="st-timer-btn ${timerLength === min ? 'st-timer-btn--active' : ''}" data-minutes="${min}">
                  <span class="st-timer-value">${min}</span>
                  <span class="st-timer-label">min</span>
                </button>
              `).join('')}
            </div>
          </section>

          <!-- Appearance -->
          <section class="st-section">
            <div class="st-section-title">Theme</div>
            <div class="st-theme-group">
              <button class="st-theme-btn ${currentTheme === 'light' ? 'st-theme-btn--active' : ''}" id="st-theme-light">
                <span style="font-size: 20px;">☀️</span>
                <span class="st-theme-name">Light</span>
              </button>
              <button class="st-theme-btn ${currentTheme === 'dark' ? 'st-theme-btn--active' : ''}" id="st-theme-dark">
                <span style="font-size: 20px;">🌙</span>
                <span class="st-theme-name">Dark</span>
              </button>
            </div>
          </section>

          <!-- Sound Settings -->
          <section class="st-section">
            <div class="st-section-title">Session Sound</div>
            <div class="st-sound-group">
              <button class="st-sound-btn ${sessionSound ? 'st-sound-btn--active' : ''}" id="st-sound-on">
                <span style="font-size: 18px;">🔔</span>
                <span class="st-sound-label">On</span>
              </button>
              <button class="st-sound-btn ${!sessionSound ? 'st-sound-btn--active' : ''}" id="st-sound-off">
                <span style="font-size: 18px;">🔕</span>
                <span class="st-sound-label">Off</span>
              </button>
            </div>
            <p class="st-sound-hint">Plays a chime when your writing session ends</p>
          </section>

           <!-- Ambient Sound During Writing -->
           <section class="st-section">
             <div class="st-section-title">Ambient Sound During Writing</div>
             <div class="st-sound-selector">
               <button class="st-sound-option ${ambientSound === 'silence' ? 'st-sound-option--active' : ''}" data-sound="silence">
                 <span class="st-sound-option-icon">🔇</span>
                 <span class="st-sound-option-name">Silence</span>
               </button>
               <button class="st-sound-option ${ambientSound === 'rain' ? 'st-sound-option--active' : ''}" data-sound="rain">
                 <span class="st-sound-option-icon">🌧️</span>
                 <span class="st-sound-option-name">Rain</span>
               </button>
               <button class="st-sound-option ${ambientSound === 'coffee-shop' ? 'st-sound-option--active' : ''}" data-sound="coffee-shop">
                 <span class="st-sound-option-icon">☕</span>
                 <span class="st-sound-option-name">Coffee Shop</span>
               </button>
               <button class="st-sound-option ${ambientSound === 'white-noise' ? 'st-sound-option--active' : ''}" data-sound="white-noise">
                 <span class="st-sound-option-icon">📻</span>
                 <span class="st-sound-option-name">White Noise</span>
               </button>
             </div>
             
             <div class="st-volume-control">
               <label class="st-volume-label">Volume</label>
               <input 
                 type="range" 
                 class="st-volume-slider" 
                 id="st-volume-slider"
                 min="0" 
                 max="100" 
                 value="${ambientVolume}"
                 ${ambientSound === 'silence' ? 'disabled' : ''}
               />
               <span class="st-volume-value" id="st-volume-value">${ambientVolume}%</span>
             </div>
           </section>

           <!-- Session Preferences -->
           <section class="st-section">
             <div class="st-section-title">Session Preferences</div>
             <div class="st-card">
               <div style="display:flex; align-items:center; justify-content:space-between;">
                 <div>
                   <div style="font-weight:var(--font-weight-medium); color:var(--color-text-primary);">Show warm-up offer</div>
                   <div style="font-size:var(--font-size-xs); color:var(--color-text-muted); margin-top:2px;">Briefly clears your head before writing.</div>
                 </div>
                 <button class="st-toggle-btn ${showWarmup ? 'st-toggle-btn--active' : ''}" id="st-warmup-toggle">
                   <div class="st-toggle-dot"></div>
                 </button>
               </div>
             </div>
           </section>

          <!-- AI Configuration -->
          <section class="st-section">
            <div class="st-section-title">AI Provider & Key</div>
            <div class="st-card">
              <div id="st-api-view">
                <div class="st-input-group">
                  <label class="st-label">Current Provider</label>
                  <div style="font-weight:bold; margin: 4px 0;">${PROVIDER_DATA[currentProvider].logo} ${PROVIDER_DATA[currentProvider].name}</div>
                </div>
                <div class="st-input-group" style="margin-top:12px;">
                  <label class="st-label">API Key</label>
                  <div style="font-family:monospace; margin: 4px 0; color:var(--color-text-secondary);">${maskedKey}</div>
                </div>
                <button class="st-btn-text" id="st-edit-key" style="margin-top:16px; text-decoration:underline;">Change Provider &amp; Key</button>
              </div>
              
              <div id="st-api-edit" style="display:none;">
                <label class="st-label">Select Provider</label>
                <div class="st-providers">
                  ${Object.entries(PROVIDER_DATA).map(([id, data]) => `
                    <div class="st-provider-card ${editProvider === id ? 'st-provider-card--active' : ''}" data-provider="${id}">
                      <div class="st-provider-logo">${data.logo}</div>
                      <div class="st-provider-name">${data.name}</div>
                    </div>
                  `).join('')}
                </div>

                <div class="st-input-group">
                  <label class="st-label" id="st-edit-label" for="st-api-input">New API Key for ${PROVIDER_DATA[editProvider].name}</label>
                  <input type="password" id="st-api-input" class="st-input" placeholder="${PROVIDER_DATA[editProvider].placeholder}" autocomplete="off" />
                </div>
                
                <div style="display:flex; gap:12px; margin-top:20px;">
                  <button class="st-save-btn" id="st-save-key">Save Changes</button>
                  <button class="st-btn-text" id="st-cancel-edit">Cancel</button>
                </div>
                <p style="font-size:11px; color:var(--color-text-muted); margin-top:12px;">Your keys are stored locally on your device only.</p>
              </div>
            </div>
          </section>

          <!-- Data Management -->
          <section class="st-section">
            <div class="st-section-title">Data Management</div>
            <div class="st-card">
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:var(--font-weight-medium); color:var(--color-text-primary);">Backup Data</div>
                    <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Create a backup of all your writings and settings.</div>
                  </div>
                  <button class="st-btn-text" id="st-backup-btn" style="text-decoration:underline;">Create Backup</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:var(--font-weight-medium); color:var(--color-text-primary);">Restore Data</div>
                    <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Restore from a previous backup.</div>
                  </div>
                  <button class="st-btn-text" id="st-restore-btn" style="text-decoration:underline;">Restore</button>
                </div>
              </div>
            </div>
          </section>

          <div class="st-version">
            Scribbit v${APP_VERSION}
          </div>
        </div>
      </div>
    `;
  }

  function updateUi() {
    container.innerHTML = buildHtml();
    attachListeners();
  }

  function attachListeners() {
    const backBtn = container.querySelector('#st-back');
    const themeLight = container.querySelector('#st-theme-light');
    const themeDark = container.querySelector('#st-theme-dark');
    const tagsContainer = container.querySelector('#st-tags');
    const editProfileBtn = container.querySelector('#st-edit-profile');
    const timerBtns = container.querySelectorAll('.st-timer-btn');
    const soundOnBtn = container.querySelector('#st-sound-on');
    const soundOffBtn = container.querySelector('#st-sound-off');

    const apiView = container.querySelector('#st-api-view');
    const apiEdit = container.querySelector('#st-api-edit');
    const editBtn = container.querySelector('#st-edit-key');
    const cancelBtn = container.querySelector('#st-cancel-edit');
    const saveBtn = container.querySelector('#st-save-key');
    const apiInput = container.querySelector('#st-api-input');
    const cards = container.querySelectorAll('.st-provider-card');

    // Edit Profile
    editProfileBtn?.addEventListener('click', () => {
      window.scribbitRouter.navigate('onboarding', { editMode: true });
    });

    // Timer selection
    timerBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const minutes = parseInt(btn.dataset.minutes);
        const settings = (await window.scribbit.db.get('settings')) || {};
        settings.timerLength = minutes;
        await window.scribbit.db.set('settings', settings);

        // Update UI
        timerBtns.forEach(b => b.classList.remove('st-timer-btn--active'));
        btn.classList.add('st-timer-btn--active');
      });
    });

    // Sound toggle
    soundOnBtn?.addEventListener('click', async () => {
      const settings = (await window.scribbit.db.get('settings')) || {};
      settings.sessionSound = true;
      await window.scribbit.db.set('settings', settings);

      soundOnBtn.classList.add('st-sound-btn--active');
      soundOffBtn.classList.remove('st-sound-btn--active');
    });

    soundOffBtn?.addEventListener('click', async () => {
      const settings = (await window.scribbit.db.get('settings')) || {};
      settings.sessionSound = false;
      await window.scribbit.db.set('settings', settings);

      soundOffBtn.classList.add('st-sound-btn--active');
      soundOnBtn.classList.remove('st-sound-btn--active');
    });

    // Warm-up toggle
    const warmupToggle = container.querySelector('#st-warmup-toggle');
    warmupToggle?.addEventListener('click', async () => {
      const settings = (await window.scribbit.db.get('settings')) || {};
      const newValue = settings.showWarmup === false; // If currently false (not set is true), make it true. No, default is true.

      // Correct logic: if settings.showWarmup is undefined or true, set to false. If false, set to true.
      const currentVal = settings.showWarmup !== false;
      settings.showWarmup = !currentVal;
      await window.scribbit.db.set('settings', settings);

      warmupToggle.classList.toggle('st-toggle-btn--active', settings.showWarmup);
    });

    // Ambient Sound selection
    const soundOptions = container.querySelectorAll('.st-sound-option');
    const volumeSlider = container.querySelector('#st-volume-slider');
    const volumeValue = container.querySelector('#st-volume-value');

    soundOptions.forEach(option => {
      option.addEventListener('click', async () => {
        const sound = option.dataset.sound;
        const settings = (await window.scribbit.db.get('settings')) || {};
        settings.ambientSound = sound;
        await window.scribbit.db.set('settings', settings);

        // Update UI
        soundOptions.forEach(opt => opt.classList.remove('st-sound-option--active'));
        option.classList.add('st-sound-option--active');

        // Enable/disable volume slider
        if (volumeSlider) {
          volumeSlider.disabled = sound === 'silence';
        }

        // Preview the sound briefly
        if (sound !== 'silence' && window.scribbitAmbientSound) {
          const volume = (settings.ambientVolume ?? 50) / 100;
          window.scribbitAmbientSound.play(sound, volume);
          // Stop after 2 seconds
          setTimeout(() => {
            window.scribbitAmbientSound.stop();
          }, 2000);
        }
      });
    });

    // Volume slider
    let volumeSaveTimeout = null;
    volumeSlider?.addEventListener('input', async (e) => {
      const volume = parseInt(e.target.value);
      if (volumeValue) {
        volumeValue.textContent = `${volume}%`;
      }

      // Update playing sound volume immediately (real-time)
      if (window.scribbitAmbientSound && window.scribbitAmbientSound.isPlaying) {
        window.scribbitAmbientSound.setVolume(volume / 100);
      }

      // Debounce the DB save to avoid lag
      if (volumeSaveTimeout) clearTimeout(volumeSaveTimeout);
      volumeSaveTimeout = setTimeout(async () => {
        const settings = (await window.scribbit.db.get('settings')) || {};
        settings.ambientVolume = volume;
        await window.scribbit.db.set('settings', settings);
      }, 200);
    });

    // API Edit toggling
    editBtn.addEventListener('click', () => {
      apiView.style.display = 'none';
      apiEdit.style.display = 'block';
      apiInput.focus();
    });

    cancelBtn.addEventListener('click', () => {
      editProvider = currentProvider;
      updateUi();
    });

    cards.forEach(card => {
      card.addEventListener('click', () => {
        editProvider = card.dataset.provider;
        updateUi();
        // Re-open edit view immediately after re-render
        container.querySelector('#st-api-view').style.display = 'none';
        container.querySelector('#st-api-edit').style.display = 'block';
        container.querySelector('#st-api-input').focus();
      });
    });

    saveBtn.addEventListener('click', async () => {
      const key = apiInput.value.trim();
      if (!key) return;

      saveBtn.disabled = true;
      saveBtn.textContent = 'Validating…';

      try {
        // Validate the API key first
        const validation = await window.scribbit.ai.validateApiKey(key, editProvider);
        
        if (!validation.valid) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
          apiInput.style.borderColor = 'var(--color-error)';
          apiInput.placeholder = `Invalid key: ${validation.error}`;
          return;
        }

        saveBtn.textContent = 'Saving…';
        await window.scribbit.ai.setProvider(editProvider);
        await window.scribbit.ai.setApiKey(key);
        window.scribbitRouter.navigate('settings'); // Refresh
      } catch (err) {
        console.error(err);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
        alert('Error saving settings. ' + err.message);
      }
    });

    // Render tags
    const allTags = [...(profile.interests || []), ...(profile.writingTypes || [])];
    allTags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'st-tag';
      tagEl.textContent = tag;
      tagsContainer.appendChild(tagEl);
    });

    // Theme logic
    themeLight.addEventListener('click', async () => {
      await window.scribbitTheme.setTheme('light');
      updateThemeButtons('light');
    });

    themeDark.addEventListener('click', async () => {
      await window.scribbitTheme.setTheme('dark');
      updateThemeButtons('dark');
    });

    function updateThemeButtons(mode) {
      themeLight.classList.toggle('st-theme-btn--active', mode === 'light');
      themeDark.classList.toggle('st-theme-btn--active', mode === 'dark');
    }

    // Backup functionality
    const backupBtn = container.querySelector('#st-backup-btn');
    backupBtn?.addEventListener('click', async () => {
      try {
        const backupPath = await window.scribbit.db.createBackup();
        alert('Backup created successfully!\n\nSaved to: ' + backupPath);
      } catch (err) {
        console.error('Backup error:', err);
        alert('Failed to create backup: ' + err.message);
      }
    });

    // Restore functionality
    const restoreBtn = container.querySelector('#st-restore-btn');
    restoreBtn?.addEventListener('click', async () => {
      try {
        const backups = await window.scribbit.db.getBackups();
        if (backups.length === 0) {
          alert('No backups found.');
          return;
        }

        const backupList = backups.map((b, i) => `${i + 1}. ${b.filename}\n   Created: ${new Date(b.createdAt).toLocaleString()}`).join('\n');
        const choice = prompt('Available backups:\n\n' + backupList + '\n\nEnter the number of the backup to restore:');
        
        if (!choice) return;
        
        const idx = parseInt(choice) - 1;
        if (isNaN(idx) || idx < 0 || idx >= backups.length) {
          alert('Invalid selection.');
          return;
        }

        const confirm = window.confirm('This will replace ALL current data with the backup. Are you sure?');
        if (!confirm) return;

        await window.scribbit.db.restoreBackup(backups[idx].path);
        alert('Data restored successfully! The app will reload.');
        window.location.reload();
      } catch (err) {
        console.error('Restore error:', err);
        alert('Failed to restore: ' + err.message);
      }
    });

    backBtn.addEventListener('click', () => {
      window.scribbitRouter.navigate('home');
    });
  }

  updateUi();
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (window.scribbitRouter) {
  window.scribbitRouter.register('settings', render);
}

window.scribbitSettings = { render };
