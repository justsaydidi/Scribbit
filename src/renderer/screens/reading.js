/**
 * Reading View Screen
 * A beautiful, distraction-free reading experience for past writing sessions.
 */

// State for reading view
let readingState = {
    session: null,
    showFeedback: false,
    scrollProgress: 0
};

// Format date nicely
function formatReadingDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Render the reading view
async function render(container, params = {}) {
    const sessionId = params.sessionId;
    if (!sessionId) {
        window.scribbitRouter.navigate('writings');
        return;
    }

    // Get session data
    const sessions = (await window.scribbit.db.get('sessions')) || [];
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
        window.scribbitRouter.navigate('writings');
        return;
    }

    readingState.session = session;
    readingState.showFeedback = false;
    readingState.scrollProgress = 0;

    // Get current theme
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = currentTheme === 'dark';

    container.innerHTML = `
        <div class="reading-view-root ${isDark ? 'reading-view-dark' : 'reading-view-light'}">
            <!-- Progress bar -->
            <div class="reading-progress-container">
                <div class="reading-progress-bar" id="reading-progress-bar" style="width: 0%"></div>
            </div>

            <!-- Back button -->
            <button class="reading-back-btn" id="reading-back-btn" aria-label="Back to library">
                <span class="reading-back-arrow">←</span>
                <span class="reading-back-text">Back</span>
            </button>

            <!-- Theme selector -->
            <div class="reading-themes">
                <button class="reading-theme-btn reading-theme-btn--light" data-theme="light" title="Light"></button>
                <button class="reading-theme-btn reading-theme-btn--cream" data-theme="cream" title="Cream"></button>
                <button class="reading-theme-btn reading-theme-btn--sepia" data-theme="sepia" title="Sepia"></button>
                <button class="reading-theme-btn reading-theme-btn--dark" data-theme="dark" title="Dark"></button>
            </div>

            <!-- Main content -->
            <div class="reading-content-wrapper">
                <article class="reading-article">
                    <!-- Meta header -->
                    <header class="reading-meta">
                        <span class="reading-meta-date">${formatReadingDate(session.date)}</span>
                        <span class="reading-meta-separator">·</span>
                        <span class="reading-meta-type">${session.sessionType}</span>
                        <span class="reading-meta-separator">·</span>
                        <span class="reading-meta-count">${session.wordCount} words</span>
                    </header>

                    <!-- Prompt (if applicable) -->
                    ${session.prompt ? `
                        <div class="reading-prompt-section">
                            <p class="reading-prompt">${escHtml(session.prompt)}</p>
                        </div>
                    ` : ''}

                    <!-- Main text -->
                    <div class="reading-text" id="reading-text">
                        ${escHtml(session.text)}
                    </div>

                    <!-- Feedback toggle (if exists) -->
                    ${session.aiFeedback ? `
                        <div class="reading-feedback-toggle">
                            <button class="reading-feedback-btn" id="reading-feedback-btn">
                                <span>View Feedback</span>
                                <span class="reading-feedback-arrow" id="feedback-arrow">↑</span>
                            </button>
                        </div>
                    ` : ''}

                    <!-- Export buttons -->
                    <div class="reading-export-actions">
                        <button class="reading-export-btn" id="reading-export-pdf">Export as PDF</button>
                        <button class="reading-export-btn reading-export-btn--secondary" id="reading-export-txt">Export as TXT</button>
                    </div>
                </article>
            </div>

            <!-- Feedback panel (slide up) -->
            ${session.aiFeedback ? `
                <div class="reading-feedback-panel" id="reading-feedback-panel">
                    <div class="reading-feedback-panel-content">
                        <div class="reading-feedback-panel-header">
                            <h3>Writing Feedback</h3>
                            <button class="reading-feedback-close" id="reading-feedback-close">✕</button>
                        </div>
                        <div class="reading-feedback-panel-body">
                            ${formatFeedbackForReading(session.aiFeedback)}
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    attachReadingListeners(container);
    setupScrollProgress();
}

function attachReadingListeners(container) {
    const backBtn = container.querySelector('#reading-back-btn');
    const feedbackBtn = container.querySelector('#reading-feedback-btn');
    const feedbackClose = container.querySelector('#reading-feedback-close');
    const feedbackPanel = container.querySelector('#reading-feedback-panel');
    const exportPdfBtn = container.querySelector('#reading-export-pdf');
    const exportTxtBtn = container.querySelector('#reading-export-txt');
    const themeBtns = container.querySelectorAll('.reading-theme-btn');

    // Theme switching
    const root = container.querySelector('.reading-view-root');
    const updateActiveTheme = (theme) => {
        themeBtns.forEach(btn => {
            btn.classList.toggle('reading-theme-btn--active', btn.dataset.theme === theme);
        });

        // Remove old theme classes
        root.classList.remove('reading-view-light', 'reading-view-dark', 'reading-view-sepia', 'reading-view-cream');
        root.classList.add(`reading-view-${theme}`);
    };

    // Initial active theme
    const settings = (window.scribbit.db.getSync ? window.scribbit.db.getSync('settings') : {}) || {};
    const initialTheme = settings.readingTheme || (document.documentElement.getAttribute('data-theme') || 'light');
    updateActiveTheme(initialTheme);

    themeBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const theme = btn.dataset.theme;
            updateActiveTheme(theme);

            // Save preference
            const settings = (await window.scribbit.db.get('settings')) || {};
            settings.readingTheme = theme;
            await window.scribbit.db.set('settings', settings);
        });
    });

    // Back button
    backBtn?.addEventListener('click', () => {
        window.scribbitRouter.navigate('writings');
    });

    // Feedback toggle
    feedbackBtn?.addEventListener('click', () => {
        readingState.showFeedback = !readingState.showFeedback;
        const panel = container.querySelector('#reading-feedback-panel');
        const arrow = container.querySelector('#feedback-arrow');

        if (readingState.showFeedback) {
            panel?.classList.add('reading-feedback-panel--visible');
            if (arrow) arrow.textContent = '↓';
            feedbackBtn.querySelector('span').textContent = 'Hide Feedback';
        } else {
            panel?.classList.remove('reading-feedback-panel--visible');
            if (arrow) arrow.textContent = '↑';
            feedbackBtn.querySelector('span').textContent = 'View Feedback';
        }
    });

    // Close feedback button
    feedbackClose?.addEventListener('click', () => {
        readingState.showFeedback = false;
        const panel = container.querySelector('#reading-feedback-panel');
        const arrow = container.querySelector('#feedback-arrow');
        const btn = container.querySelector('#reading-feedback-btn');

        panel?.classList.remove('reading-feedback-panel--visible');
        if (arrow) arrow.textContent = '↑';
        if (btn) btn.querySelector('span').textContent = 'View Feedback';
    });

    // Export PDF
    exportPdfBtn?.addEventListener('click', async () => {
        const session = readingState.session;
        if (!session) return;

        const dateStr = new Date(session.date).toISOString().split('T')[0];
        const firstWords = session.text.split(' ').slice(0, 4).join('_').replace(/[^a-zA-Z0-9_]/g, '');
        const filename = `Scribbit_${dateStr}_${firstWords}.pdf`;

        try {
            const dateFormatted = new Date(session.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            let htmlContent = `
                <div class="header">
                    <div class="logo">Scribbit</div>
                    <div class="meta">${dateFormatted}</div>
                    <div class="meta">${session.sessionType}</div>
                </div>
            `;

            if (session.prompt) {
                htmlContent += `<div class="prompt">${escHtml(session.prompt)}</div>`;
            }

            htmlContent += `<hr class="divider">`;
            htmlContent += `<div class="content">${escHtml(session.text)}</div>`;

            if (session.aiFeedback) {
                htmlContent += `
                    <div class="feedback-section">
                        <div class="feedback-title">Writing Feedback</div>
                        <div class="feedback-content">${formatFeedbackForPDF(session.aiFeedback)}</div>
                    </div>
                `;
            }

            await window.scribbit.app.savePDFToDownloads(filename, htmlContent);
            exportPdfBtn.textContent = 'Exported!';
            setTimeout(() => exportPdfBtn.textContent = 'Export as PDF', 2000);
        } catch (err) {
            console.error('PDF Export error:', err);
            alert('Failed to export PDF: ' + err.message);
        }
    });

    // Export TXT
    exportTxtBtn?.addEventListener('click', async () => {
        const session = readingState.session;
        if (!session) return;

        const dateStr = new Date(session.date).toISOString().split('T')[0];
        const firstWords = session.text.split(' ').slice(0, 4).join('_').replace(/[^a-zA-Z0-9_]/g, '');
        const filename = `Scribbit_${dateStr}_${firstWords}.txt`;

        try {
            await window.scribbit.app.saveToDownloads(filename, session.text);
            exportTxtBtn.textContent = 'Exported!';
            setTimeout(() => exportTxtBtn.textContent = 'Export as TXT', 2000);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export file.');
        }
    });
}

function setupScrollProgress() {
    const progressBar = document.getElementById('reading-progress-bar');
    const contentWrapper = document.querySelector('.reading-content-wrapper');

    if (!progressBar || !contentWrapper) return;

    const updateProgress = () => {
        const scrollTop = contentWrapper.scrollTop;
        const scrollHeight = contentWrapper.scrollHeight - contentWrapper.clientHeight;
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    };

    contentWrapper.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
}

function formatFeedbackForReading(feedback) {
    if (!feedback.includes('**')) {
        return `<div class="reading-feedback-text">${escHtml(feedback).replace(/\n/g, '<br>')}</div>`;
    }

    let html = '';
    const parts = feedback.split('**');

    parts.forEach(part => {
        if (!part.trim()) return;
        const lines = part.trim().split('\n');
        const title = lines[0].replace(/:$/, '');
        const content = lines.slice(1).join('<br>').trim();

        if (content) {
            html += `
                <div class="reading-feedback-item">
                    <div class="reading-feedback-item-title">${escHtml(title)}</div>
                    <div class="reading-feedback-item-content">${escHtml(content).replace(/\n/g, '<br>')}</div>
                </div>
            `;
        } else {
            const colonIdx = part.indexOf(':');
            if (colonIdx !== -1) {
                const t = part.substring(0, colonIdx).trim();
                const c = part.substring(colonIdx + 1).trim();
                html += `
                    <div class="reading-feedback-item">
                        <div class="reading-feedback-item-title">${escHtml(t)}</div>
                        <div class="reading-feedback-item-content">${escHtml(c).replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }
        }
    });

    return html;
}

function formatFeedbackForPDF(feedback) {
    if (!feedback.includes('**')) {
        return escHtml(feedback).replace(/\n/g, '<br>');
    }

    let html = '';
    const parts = feedback.split('**');
    parts.forEach(part => {
        if (!part.trim()) return;
        const lines = part.trim().split('\n');
        const title = lines[0].replace(/:$/, '');
        const content = lines.slice(1).join('<br>').trim();

        if (content) {
            html += `<p><strong>${escHtml(title)}</strong><br>${escHtml(content).replace(/\n/g, '<br>')}</p>`;
        } else {
            const colonIdx = part.indexOf(':');
            if (colonIdx !== -1) {
                const t = part.substring(0, colonIdx).trim();
                const c = part.substring(colonIdx + 1).trim();
                html += `<p><strong>${escHtml(t)}</strong><br>${escHtml(c).replace(/\n/g, '<br>')}</p>`;
            }
        }
    });

    return html;
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (window.scribbitRouter) {
    window.scribbitRouter.register('reading', render);
}

window.scribbitReading = { render };
