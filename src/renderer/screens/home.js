/**
 * Home Screen
 * Shows greeting, encouragement, and session options.
 */

const ENCOURAGEMENTS = [
    "Your ideas deserve to exist. Let's get them out.",
    '30 minutes. Just write. Everything else can wait.',
    "The blank page isn't your enemy. Let's prove it.",
    'Something worth reading starts with you choosing to write it.',
    'No pressure. No perfection. Just write.',
];

function getGreetingParts(name) {
    const hour = new Date().getHours();
    const time = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    return {
        prefix: `Good ${time}, `,
        name: name || 'there'
    };
}

async function pickEncouragement() {
    // Get last shown index from storage to rotate through encouragements
    const settings = (await window.scribbit.db.get('settings')) || {};
    let lastIndex = settings.lastEncouragementIndex ?? -1;

    // Move to next encouragement, wrap around
    const nextIndex = (lastIndex + 1) % ENCOURAGEMENTS.length;

    // Save the new index
    settings.lastEncouragementIndex = nextIndex;
    await window.scribbit.db.set('settings', settings);

    return ENCOURAGEMENTS[nextIndex];
}

function buildCard(label, sublabel, type, iconPath, delay) {
    const card = document.createElement('button');
    card.className = 'home-session-card';
    card.type = 'button';
    card.dataset.session = type;
    card.style.animationDelay = `${delay}ms`;

    const icon = document.createElement('div');
    icon.className = 'home-session-icon';
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;

    const title = document.createElement('div');
    title.className = 'home-session-title';
    title.textContent = label;

    const sub = document.createElement('div');
    sub.className = 'home-session-sub';
    sub.textContent = sublabel;

    const arrow = document.createElement('div');
    arrow.className = 'home-session-arrow';
    arrow.textContent = '→';

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(sub);
    card.appendChild(arrow);
    return card;
}

async function render(container) {
    const profile = (await window.scribbit.db.get('profile')) || {};
    const encouragement = await pickEncouragement();
    const greeting = getGreetingParts(profile.name);

    container.innerHTML = `
    <div class="home-wrapper">
      <div class="home-card">
        <div class="home-header">
          <div class="home-greeting">
            ${escHtml(greeting.prefix)}<span class="home-name-italic">${escHtml(greeting.name)}</span>
          </div>
          <div class="home-encouragement">${escHtml(encouragement)}</div>
          
          <div class="home-divider-rule"></div>
        </div>

        <div class="home-section">
          <div class="home-section-title">What kind of session today?</div>
          <div class="home-cards" id="home-cards"></div>
        </div>

        <div class="home-footer">
          <a class="home-link" href="#" id="home-writings">My Writings</a>
          <button class="home-settings" id="home-settings" type="button" aria-label="Settings">
            ⚙
          </button>
        </div>
      </div>
    </div>
  `;

    const cardsEl = container.querySelector('#home-cards');
    const cards = [
        buildCard('Prompted Writing', 'Get a writing prompt based on your interests', 'prompted', '<path d="M12 3L14.5 9L21 12L14.5 15L12 21L9.5 15L3 12L9.5 9L12 3Z" />', 220),
        buildCard('Read & Respond', 'Paste something to read, then write your thoughts', 'respond', '<rect x="4" y="4" width="12" height="12" rx="1"/><rect x="8" y="8" width="12" height="12" rx="1"/>', 300),
        buildCard('Free Writing', 'No prompt. Just you and the page.', 'free', '<path d="M4 12c3-4 5-4 8 0s5 4 8 0" />', 380),
    ];

    cards.forEach(card => {
        card.addEventListener('click', async () => {
            if (window.scribbitRouter && window.scribbitRouter.navigate) {
                const sessionType = card.dataset.session;
                let nextScreen = 'writing';
                let nextParams = { type: sessionType };

                if (sessionType === 'prompted') {
                    window.scribbitRouter.navigate('prompt-setup');
                    return;
                } else if (sessionType === 'respond') {
                    window.scribbitRouter.navigate('respond-setup');
                    return;
                }

                // For Free Writing, check warmup setting
                const settings = (await window.scribbit.db.get('settings')) || {};
                const showWarmup = settings.showWarmup !== false;

                if (showWarmup) {
                    window.scribbitRouter.navigate('warmup-offer', {
                        nextScreen: 'writing',
                        nextParams: { type: 'free' }
                    });
                } else {
                    window.scribbitRouter.navigate('writing', { type: 'free' });
                }
            }
        });
        cardsEl.appendChild(card);
    });

    const writingsLink = container.querySelector('#home-writings');
    writingsLink.addEventListener('click', (event) => {
        event.preventDefault();
        if (window.scribbitRouter && window.scribbitRouter.navigate) {
            window.scribbitRouter.navigate('writings');
        }
    });

    const settingsBtn = container.querySelector('#home-settings');
    settingsBtn.addEventListener('click', () => {
        if (window.scribbitRouter && window.scribbitRouter.navigate) {
            window.scribbitRouter.navigate('settings');
        }
    });
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (window.scribbitRouter) {
    window.scribbitRouter.register('home', render);
}

window.scribbitHome = { render };
