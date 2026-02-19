/**
 * Writings Library Screen
 * Shows all past writing sessions in a searchable, browsable library.
 * Includes Writing Pattern Intelligence for longitudinal analysis.
 */

// State for the writings screen
let writingsState = {
    sessions: [],
    savedPrompts: [],
    usedPrompts: [],
    searchQuery: '',
    selectedSession: null,
    activeTab: 'writing', // 'writing' or 'prompts'
    selectedIds: new Set(),
};

// Pattern analysis state
let patternState = {
    isAnalyzing: false,
    analysisResult: null,
};

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Get preview text (first 100 characters)
function getPreview(text) {
    if (!text) return '';
    const clean = text.trim().replace(/\s+/g, ' ');
    if (clean.length <= 100) return clean;
    return clean.substring(0, 100) + '…';
}

// Render the library view
async function renderLibrary(container) {
    if (writingsState.activeTab === 'writing') {
        writingsState.sessions = (await window.scribbit.db.get('sessions')) || [];
        writingsState.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        const filteredSessions = writingsState.searchQuery
            ? writingsState.sessions.filter(s =>
                s.text.toLowerCase().includes(writingsState.searchQuery.toLowerCase())
            )
            : writingsState.sessions;

        const hasSessions = writingsState.sessions.length > 0;
        const hasFilteredSessions = filteredSessions.length > 0;
        const sessionCount = writingsState.sessions.length;
        const canShowPatterns = sessionCount >= 5;

        container.innerHTML = `
            <div class="writings-root">
                <div class="writings-container">
                    <header class="writings-header">
                        <button class="writings-back-btn" id="writings-back" aria-label="Back to home">←</button>
                        <h1 class="writings-title">Library</h1>
                    </header>

                    <div class="writings-tabs">
                        <button class="writings-tab ${writingsState.activeTab === 'writing' ? 'writings-tab--active' : ''}" id="tab-writing">My Writing</button>
                        <button class="writings-tab ${writingsState.activeTab === 'prompts' ? 'writings-tab--active' : ''}" id="tab-prompts">Saved Prompts</button>
                    </div>

                    ${canShowPatterns ? `
                        <div class="writings-patterns-section">
                            <button class="writings-patterns-btn" id="writings-patterns-btn">
                                <span class="writings-patterns-icon">📊</span>
                                <span class="writings-patterns-text">See My Writing Patterns</span>
                            </button>
                        </div>
                    ` : sessionCount > 0 ? `
                        <div class="writings-patterns-placeholder">
                            Complete ${5 - sessionCount} more writing session${5 - sessionCount === 1 ? '' : 's'} to unlock pattern insights
                        </div>
                    ` : ''}

                    <div class="writings-search">
                        <input 
                            type="text" 
                            id="writings-search-input"
                            class="writings-search-input"
                            placeholder="Search your writing..."
                            value="${escHtml(writingsState.searchQuery)}"
                        />
                        ${writingsState.selectedIds.size > 0 ? `
                            <button class="writings-export-btn" id="writings-export-selected">
                                Export ${writingsState.selectedIds.size} Selected (PDF)
                            </button>
                        ` : ''}
                    </div>

                    <div class="writings-content">
                        ${!hasSessions ? `
                            <div class="writings-empty">
                                <div class="writings-empty-icon">✍️</div>
                                <div class="writings-empty-title">No writings yet</div>
                                <button class="writings-start-btn" id="writings-start">Start Writing</button>
                            </div>
                        ` : !hasFilteredSessions ? `
                            <div class="writings-empty">
                                <div class="writings-empty-icon">🔍</div>
                                <div class="writings-empty-title">No results</div>
                            </div>
                        ` : `
                            <div class="writings-grid">
                                ${filteredSessions.map(session => `
                                    <div class="writings-card ${writingsState.selectedIds.has(session.id) ? 'writings-card--selected' : ''}" data-session-id="${session.id}">
                                        <div class="writings-card-checkbox">
                                            <input type="checkbox" ${writingsState.selectedIds.has(session.id) ? 'checked' : ''} />
                                        </div>
                                        <div class="writings-card-main">
                                            <div class="writings-card-header">
                                                <div class="writings-card-date">${formatDate(session.date)}</div>
                                                ${session.aiFeedback ? `<span class="writings-card-reviewed">Reviewed</span>` : ''}
                                            </div>
                                            <div class="writings-card-type">${session.sessionType}</div>
                                            <div class="writings-card-preview">${escHtml(getPreview(session.text))}</div>
                                            <div class="writings-card-footer">
                                                <span class="writings-card-count">${session.wordCount} words</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    } else {
        writingsState.savedPrompts = (await window.scribbit.db.get('scribbit_saved_prompts')) || [];
        writingsState.usedPrompts = (await window.scribbit.db.get('scribbit_used_prompts')) || [];

        container.innerHTML = `
            <div class="writings-root">
                <div class="writings-container">
                    <header class="writings-header">
                        <button class="writings-back-btn" id="writings-back" aria-label="Back to home">←</button>
                        <h1 class="writings-title">Library</h1>
                    </header>

                    <div class="writings-tabs">
                        <button class="writings-tab ${writingsState.activeTab === 'writing' ? 'writings-tab--active' : ''}" id="tab-writing">My Writing</button>
                        <button class="writings-tab ${writingsState.activeTab === 'prompts' ? 'writings-tab--active' : ''}" id="tab-prompts">Saved Prompts</button>
                    </div>

                    <div class="writings-content">
                        ${writingsState.savedPrompts.length === 0 ? `
                            <div class="writings-empty">
                                <div class="writings-empty-icon">🔖</div>
                                <div class="writings-empty-title">No saved prompts</div>
                                <div class="writings-empty-subtitle">Bookmark prompts you like during setup to see them here.</div>
                            </div>
                        ` : `
                            <div class="writings-grid">
                                ${writingsState.savedPrompts.map((prompt, idx) => {
            const isUsed = writingsState.usedPrompts.some(p => p.text === prompt.text);
            return `
                                        <div class="writings-card writings-card--prompt">
                                            <div class="writings-card-header">
                                                <div class="writings-card-date">Saved ${formatDate(prompt.date)}</div>
                                                ${isUsed ? `<span class="writings-card-reviewed">Already written</span>` : ''}
                                            </div>
                                            <div class="writings-card-preview writings-card-preview--full">${escHtml(prompt.text)}</div>
                                            <div class="writings-card-actions">
                                                <button class="writings-card-btn-primary" data-action="write" data-index="${idx}">Start Writing</button>
                                                <button class="writings-card-btn-text" data-action="remove" data-index="${idx}">Remove</button>
                                            </div>
                                        </div>
                                    `;
        }).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    attachLibraryListeners(container);
}

function attachLibraryListeners(container) {
    container.querySelector('#writings-back')?.addEventListener('click', () => {
        window.scribbitRouter.navigate('home');
    });

    container.querySelector('#tab-writing')?.addEventListener('click', () => {
        writingsState.activeTab = 'writing';
        renderLibrary(container);
    });

    container.querySelector('#tab-prompts')?.addEventListener('click', () => {
        writingsState.activeTab = 'prompts';
        renderLibrary(container);
    });

    container.querySelector('#writings-patterns-btn')?.addEventListener('click', () => {
        renderPatternAnalysis(container);
    });

    if (writingsState.activeTab === 'writing') {
        container.querySelector('#writings-search-input')?.addEventListener('input', (e) => {
            writingsState.searchQuery = e.target.value;
            renderLibrary(container);
        });

        container.querySelectorAll('.writings-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const sessionId = card.dataset.sessionId;

                // If clicking checkbox area or holding Shift/Cmd, toggle selection
                if (e.target.closest('.writings-card-checkbox') || e.metaKey || e.ctrlKey) {
                    e.stopPropagation();
                    if (writingsState.selectedIds.has(sessionId)) {
                        writingsState.selectedIds.delete(sessionId);
                    } else {
                        writingsState.selectedIds.add(sessionId);
                    }
                    renderLibrary(container);
                    return;
                }

                window.scribbitRouter.navigate('reading', { sessionId });
            });
        });

        container.querySelector('#writings-export-selected')?.addEventListener('click', async () => {
            const selectedSessions = writingsState.sessions.filter(s => writingsState.selectedIds.has(s.id));
            if (selectedSessions.length === 0) return;

            const filename = `Scribbit_Collection_${new Date().toISOString().split('T')[0]}.pdf`;
            const exportBtn = container.querySelector('#writings-export-selected');

            try {
                exportBtn.textContent = 'Generating PDF...';

                const sessionsData = selectedSessions.map(s => ({
                    date: new Date(s.date).toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    }),
                    sessionType: s.sessionType,
                    prompt: s.prompt ? escHtml(s.prompt) : null,
                    text: escHtml(s.text),
                    aiFeedback: s.aiFeedback ? formatFeedbackForPDF(s.aiFeedback) : null
                }));

                await window.scribbit.app.savePDFToDownloads(filename, sessionsData);

                exportBtn.textContent = 'Exported to Downloads!';
                setTimeout(() => {
                    writingsState.selectedIds.clear();
                    renderLibrary(container);
                }, 2000);
            } catch (err) {
                console.error('Batch export error:', err);
                alert('Failed to export collection: ' + err.message);
                exportBtn.textContent = 'Export Failed';
            }
        });

        container.querySelector('#writings-start')?.addEventListener('click', () => {
            window.scribbitRouter.navigate('home');
        });
    } else {
        container.querySelectorAll('.writings-card-btn-primary').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = e.target.dataset.index;
                const prompt = writingsState.savedPrompts[idx];

                // Record as used
                const used = (await window.scribbit.db.get('scribbit_used_prompts')) || [];
                if (!used.some(p => p.text === prompt.text)) {
                    used.unshift({ text: prompt.text, date: new Date().toISOString() });
                    await window.scribbit.db.set('scribbit_used_prompts', used);
                }

                const settings = (await window.scribbit.db.get('settings')) || {};
                const showWarmup = settings.showWarmup !== false;

                if (showWarmup) {
                    window.scribbitRouter.navigate('warmup-offer', {
                        nextScreen: 'writing',
                        nextParams: { type: 'prompted', prompt: prompt.text }
                    });
                } else {
                    window.scribbitRouter.navigate('writing', { type: 'prompted', prompt: prompt.text });
                }
            });
        });

        container.querySelectorAll('.writings-card-btn-text').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = e.target.dataset.index;
                const promptText = writingsState.savedPrompts[idx].text;
                const filtered = writingsState.savedPrompts.filter(p => p.text !== promptText);
                await window.scribbit.db.set('scribbit_saved_prompts', filtered);
                renderLibrary(container);
            });
        });
    }
}

// Render the pattern analysis view
async function renderPatternAnalysis(container) {
    if (patternState.isAnalyzing) {
        renderPatternLoading(container);
        return;
    }

    if (!patternState.analysisResult) {
        // Need to run analysis
        renderPatternLoading(container);
        await runPatternAnalysis();
        renderPatternAnalysis(container);
        return;
    }

    const sessions = writingsState.sessions;

    container.innerHTML = `
        <div class="writings-root">
            <div class="writings-container">
                <header class="writings-header">
                    <button class="writings-back-btn" id="patterns-back" aria-label="Back to library">←</button>
                    <h1 class="writings-title">Your Writing Patterns</h1>
                </header>

                <div class="patterns-subheader">
                    Based on ${sessions.length} writing session${sessions.length === 1 ? '' : 's'}
                </div>

                <div class="patterns-content">
                    ${formatPatternAnalysis(patternState.analysisResult)}
                </div>

                <div class="patterns-actions">
                    <button class="patterns-btn-primary" id="patterns-refresh">
                        <span>🔄</span> Refresh Analysis
                    </button>
                    <button class="patterns-btn-secondary" id="patterns-export">
                        <span>💾</span> Export Insights
                    </button>
                </div>

                <p class="patterns-note">Your patterns will evolve as you write more.</p>
            </div>
        </div>
    `;

    attachPatternListeners(container);
}

function renderPatternLoading(container) {
    container.innerHTML = `
        <div class="writings-root">
            <div class="writings-container">
                <header class="writings-header">
                    <button class="writings-back-btn" id="patterns-back-loading" aria-label="Back to library">←</button>
                    <h1 class="writings-title">Your Writing Patterns</h1>
                </header>

                <div class="patterns-loading">
                    <div class="patterns-loading-spinner"></div>
                    <div class="patterns-loading-text">Analysing your writing across all sessions…</div>
                </div>
            </div>
        </div>
    `;

    container.querySelector('#patterns-back-loading')?.addEventListener('click', () => {
        renderLibrary(container);
    });
}

async function runPatternAnalysis() {
    patternState.isAnalyzing = true;

    try {
        const sessions = (await window.scribbit.db.get('sessions')) || [];

        // Sort by date, most recent first
        sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Use most recent 15 sessions if there are more
        const sessionsToAnalyze = sessions.slice(0, 15);

        // Compile all writing text
        const compiledText = sessionsToAnalyze.map((session, idx) => {
            return `--- SESSION ${sessionsToAnalyze.length - idx} (${session.sessionType}) ---\n${session.text}`;
        }).join('\n\n');

        const systemPrompt = `You are a writing coach analysing a writer's body of work over multiple sessions. You will be given multiple pieces of writing labelled by session number and type. Your job is to identify genuine patterns — not to give general writing advice, but to make observations specific to what this particular writer actually does repeatedly across their work.

Respond in exactly this structure:

**Your Writing Fingerprint:**
In 2–3 sentences, describe what makes this writer's voice distinctly theirs. What is consistent across almost everything they write? This should feel like an accurate portrait, not a compliment.

**Patterns That Are Serving You:**
Identify 2 specific stylistic or structural things this writer does consistently that work in their favour. Be precise — reference the kind of writing or themes where this shows up.

**Patterns Worth Breaking:**
Identify 2–3 specific habits or tendencies that appear repeatedly and are limiting the writing. Examples: always starting with a broad statement before getting to the point, sentences that are consistently the same length, conclusions that trail off rather than land, overusing a particular type of phrasing. Name the pattern specifically, explain why it limits the work, and give one concrete suggestion for how to break it.

**What You Write Best:**
Based on all sessions, identify the writing type or context where this writer is most alive — where the writing has the most energy, specificity, or clarity. Be specific about what kind of writing or topic brings out their best.

**One Thing To Try Next:**
A single, specific challenge for the writer's next session. Not generic advice — something directly responsive to their patterns.

Keep the full response under 400 words. Tone: like a trusted writing mentor who has read everything this person has written and is giving them an honest, caring read.`;

        const messages = [{ role: 'user', content: compiledText }];

        const analysis = await window.scribbit.ai.complete(messages, { system: systemPrompt });
        patternState.analysisResult = analysis;
    } catch (err) {
        console.error('Pattern analysis error:', err);
        patternState.analysisResult = 'Unable to analyse patterns at this time. Please try again later.';
    } finally {
        patternState.isAnalyzing = false;
    }
}

function formatPatternAnalysis(analysis) {
    if (!analysis || typeof analysis !== 'string') {
        return '<div class="patterns-error">Unable to display analysis.</div>';
    }

    // Parse the markdown-style sections
    const sections = [];
    const lines = analysis.split('\n');
    let currentSection = null;
    let currentContent = [];

    lines.forEach(line => {
        const sectionMatch = line.match(/^\*\*(.+?):\*\*$/);
        if (sectionMatch) {
            if (currentSection) {
                sections.push({
                    title: currentSection,
                    content: currentContent.join('\n').trim()
                });
            }
            currentSection = sectionMatch[1];
            currentContent = [];
        } else if (currentSection && line.trim()) {
            currentContent.push(line);
        }
    });

    if (currentSection) {
        sections.push({
            title: currentSection,
            content: currentContent.join('\n').trim()
        });
    }

    if (sections.length === 0) {
        // Fallback: just display the text
        return `<div class="patterns-section"><div class="patterns-section-content">${escHtml(analysis).replace(/\n/g, '<br>')}</div></div>`;
    }

    return sections.map(section => `
        <div class="patterns-section">
            <h2 class="patterns-section-title">${escHtml(section.title)}</h2>
            <div class="patterns-section-content">${escHtml(section.content).replace(/\n/g, '<br>')}</div>
        </div>
    `).join('');
}

function attachPatternListeners(container) {
    container.querySelector('#patterns-back')?.addEventListener('click', () => {
        renderLibrary(container);
    });

    container.querySelector('#patterns-refresh')?.addEventListener('click', async () => {
        patternState.analysisResult = null;
        renderPatternAnalysis(container);
    });

    container.querySelector('#patterns-export')?.addEventListener('click', async () => {
        if (!patternState.analysisResult) return;

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `Scribbit_Writing_Patterns_${dateStr}.txt`;

        const header = `Writing Pattern Analysis\nGenerated: ${new Date().toLocaleString()}\nBased on: ${writingsState.sessions.length} sessions\n\n`;
        const content = header + patternState.analysisResult;

        try {
            await window.scribbit.app.saveToDownloads(filename, content);
            const btn = container.querySelector('#patterns-export');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span>✓</span> Exported!';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export analysis.');
        }
    });
}

// Render the detail view for a single session
function renderDetail(container) {
    const session = writingsState.selectedSession;
    if (!session) {
        renderLibrary(container);
        return;
    }

    container.innerHTML = `
        <div class="writings-root">
            <div class="writings-container">
                <header class="writings-header">
                    <button class="writings-back-btn" id="writings-detail-back" aria-label="Back to library">←</button>
                    <h1 class="writings-title">Session Details</h1>
                </header>

                <div class="writings-detail">
                    <div class="writings-detail-meta">
                        <div class="writings-detail-date">${formatDate(session.date)}</div>
                        <div class="writings-detail-type">${session.sessionType}</div>
                        <div class="writings-detail-count">${session.wordCount} words</div>
                    </div>

                    ${session.prompt ? `
                        <div class="writings-detail-section">
                            <div class="writings-detail-label">Prompt</div>
                            <div class="writings-detail-prompt">${escHtml(session.prompt)}</div>
                        </div>
                    ` : ''}

                    ${session.readingMaterial ? `
                        <div class="writings-detail-section">
                            <div class="writings-detail-label">Reading Material</div>
                            <div class="writings-detail-reading">${escHtml(session.readingMaterial)}</div>
                        </div>
                    ` : ''}

                    <div class="writings-detail-section">
                        <div class="writings-detail-label">Your Writing</div>
                        <div class="writings-detail-text">${escHtml(session.text)}</div>
                    </div>

                    ${session.aiFeedback ? `
                        <div class="writings-detail-section">
                            <div class="writings-detail-label">AI Feedback</div>
                            <div class="writings-detail-feedback">${formatFeedback(session.aiFeedback)}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="writings-detail-actions">
                    <button class="writings-detail-btn" id="detail-export-txt">Export as TXT</button>
                    <button class="writings-detail-btn writings-detail-btn--primary" id="detail-export-pdf">Export as PDF</button>
                </div>
            </div>
        </div>
    `;

    attachDetailListeners(container, session);
}

// Format AI feedback for display
function formatFeedback(feedback) {
    if (!feedback.includes('**')) {
        return `<div class="writings-feedback-content">${feedback.replace(/\n/g, '<br>')}</div>`;
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
                <div class="writings-feedback-item">
                    <div class="writings-feedback-title">${title}</div>
                    <div class="writings-feedback-content">${content}</div>
                </div>
            `;
        } else {
            const colonIdx = part.indexOf(':');
            if (colonIdx !== -1) {
                const t = part.substring(0, colonIdx).trim();
                const c = part.substring(colonIdx + 1).trim().replace(/\n/g, '<br>');
                html += `
                    <div class="writings-feedback-item">
                        <div class="writings-feedback-title">${t}</div>
                        <div class="writings-feedback-content">${c}</div>
                    </div>
                `;
            }
        }
    });

    return html;
}

function attachDetailListeners(container, session) {
    const backBtn = container.querySelector('#writings-detail-back');
    const exportTxtBtn = container.querySelector('#detail-export-txt');
    const exportPdfBtn = container.querySelector('#detail-export-pdf');

    backBtn?.addEventListener('click', () => {
        writingsState.selectedSession = null;
        renderLibrary(container);
    });

    exportTxtBtn?.addEventListener('click', async () => {
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

    exportPdfBtn?.addEventListener('click', async () => {
        const dateStr = new Date(session.date).toISOString().split('T')[0];
        const firstWords = session.text.split(' ').slice(0, 4).join('_').replace(/[^a-zA-Z0-9_]/g, '');
        const filename = `Scribbit_${dateStr}_${firstWords}.pdf`;

        try {
            // Build HTML content for PDF
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
}

function formatFeedbackForPDF(feedback) {
    // Convert markdown-style feedback to HTML for PDF
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

async function render(container) {
    writingsState.searchQuery = '';
    writingsState.selectedSession = null;
    writingsState.activeTab = 'writing';
    patternState.analysisResult = null;
    patternState.isAnalyzing = false;
    await renderLibrary(container);
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (window.scribbitRouter) {
    window.scribbitRouter.register('writings', render);
}

window.scribbitWritings = { render };
