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

function getGreeting(name) {
    const hour = new Date().getHours();
    const time = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    return `Good ${time}, ${name || 'there'}`;
}

async function getHabitData() {
    const sessions = (await window.scribbit.db.get('sessions')) || [];
    if (sessions.length === 0) return { streak: 0, total: 0 };

    const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastDate = null;

    for (const s of sorted) {
        const sDate = new Date(s.date);
        sDate.setHours(0, 0, 0, 0);

        if (lastDate && lastDate.getTime() === sDate.getTime()) continue;

        const diff = lastDate ? (lastDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24) : 0;

        if (!lastDate) {
            const todayDiff = (today.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24);
            if (todayDiff > 1) break; // Streak broken
            streak = 1;
        } else if (diff === 1) {
            streak++;
        } else {
            break;
        }
        lastDate = sDate;
    }

    return { streak, total: sessions.length };
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

function buildCard(label, sublabel, type) {
    const card = document.createElement('button');
    card.className = 'home-session-card';
    card.type = 'button';
    card.dataset.session = type;

    const title = document.createElement('div');
    title.className = 'home-session-title';
    title.textContent = label;

    const sub = document.createElement('div');
    sub.className = 'home-session-sub';
    sub.textContent = sublabel;

    card.appendChild(title);
    card.appendChild(sub);
    return card;
}

async function render(container) {
    const profile = (await window.scribbit.db.get('profile')) || {};
    const encouragement = await pickEncouragement();
    const habit = await getHabitData();

    container.innerHTML = `
    <div class="home-wrapper">
      <div class="home-card">
        <div class="home-header">
          <div class="home-greeting">${escHtml(getGreeting(profile.name))}</div>
          <div class="home-encouragement">${escHtml(encouragement)}</div>
          
          <div class="home-habit" id="home-habit">
            <div class="home-habit-item">
              <span class="home-habit-val">${habit.streak}</span>
              <span class="home-habit-lab">Day Streak</span>
            </div>
            <div class="home-habit-divider"></div>
            <div class="home-habit-item">
              <span class="home-habit-val">${habit.total}</span>
              <span class="home-habit-lab">Total Sessions</span>
            </div>
          </div>
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
        buildCard('Prompted Writing', 'Get a writing prompt based on your interests', 'prompted'),
        buildCard('Read & Respond', 'Paste something to read, then write your thoughts', 'respond'),
        buildCard('Free Writing', 'No prompt. Just you and the page.', 'free'),
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
