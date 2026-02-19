/**
/**
 * Post-Session Screen
 * Displays session summary, full text, and handles AI feedback.
 */

async function render(container, params = {}) {
    const sessionId = params.id;
    if (!sessionId) {
        window.scribbitRouter.navigate('home');
        return;
    }

    const sessions = (await window.scribbit.db.get('sessions')) || [];
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
        window.scribbitRouter.navigate('home');
        return;
    }

    container.innerHTML = `
    <div class="ps-root">
      <div class="ps-container">
        <header class="ps-header">
          <div class="ps-title">Session complete.</div>
          <div class="ps-wordcount">You wrote ${session.wordCount} words.</div>
        </header>

        <article class="ps-text-view" id="ps-text">${escHtml(session.text)}</article>

        <section class="ps-feedback-section">
          <div class="ps-section-label">Writing Feedback</div>
          <div id="ps-ai-container" class="ps-ai-placeholder">
             <button class="ps-btn-primary" id="ps-ask-ai">Ask the AI to review my writing</button>
          </div>
        </section>

         <footer class="ps-actions">
           <button class="ps-btn-text" id="ps-copy">Copy Text</button>
           <button class="ps-btn-text" id="ps-export-txt">Export as TXT</button>
           <button class="ps-btn-text" id="ps-export-pdf">Export as PDF</button>
           <button class="ps-btn-text" id="ps-new">Start New Session</button>
         </footer>
      </div>
    </div>
  `;

    const askAiBtn = container.querySelector('#ps-ask-ai');
    const aiContainer = container.querySelector('#ps-ai-container');
    const copyBtn = container.querySelector('#ps-copy');
    const exportTxtBtn = container.querySelector('#ps-export-txt');
    const exportPdfBtn = container.querySelector('#ps-export-pdf');
    const newBtn = container.querySelector('#ps-new');

    // Restore AI feedback if already exists
    if (session.aiFeedback) {
        displayFeedback(aiContainer, session.aiFeedback);
    }

    askAiBtn?.addEventListener('click', async () => {
        askAiBtn.disabled = true;
        askAiBtn.textContent = 'Reviewing your writing…';

        try {
            const feedback = await requestAiFeedback(session);
            session.aiFeedback = feedback;

            // Update session in DB
            const updatedSessions = (await window.scribbit.db.get('sessions')) || [];
            const idx = updatedSessions.findIndex(s => s.id === sessionId);
            if (idx !== -1) {
                updatedSessions[idx].aiFeedback = feedback;
                await window.scribbit.db.set('sessions', updatedSessions);
            }

            displayFeedback(aiContainer, feedback);
        } catch (err) {
            console.error('AI Feedback error:', err);
            aiContainer.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
                    <div class="ps-ai-item-content" style="color:var(--color-error)">Error: ${err.message}</div>
                    <button class="ps-btn-text" id="ps-feedback-settings" style="text-decoration:underline;">Go to Settings to set your API Key</button>
                </div>
            `;
            aiContainer.querySelector('#ps-feedback-settings').addEventListener('click', () => {
                window.scribbitRouter.navigate('settings');
            });
        }
    });

    copyBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(session.text);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });

    exportTxtBtn.addEventListener('click', async () => {
        const dateStr = new Date(session.date).toISOString().split('T')[0];
        const firstWords = session.text.split(' ').slice(0, 4).join('_').replace(/[^a-zA-Z0-9_]/g, '');
        const filename = `Scribbit_${dateStr}_${firstWords}.txt`;

        try {
            await window.scribbit.app.saveToDownloads(filename, session.text);
            const originalText = exportTxtBtn.textContent;
            exportTxtBtn.textContent = 'Exported!';
            setTimeout(() => exportTxtBtn.textContent = originalText, 2000);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export file.');
        }
    });

    exportPdfBtn.addEventListener('click', async () => {
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
            const originalText = exportPdfBtn.textContent;
            exportPdfBtn.textContent = 'Exported!';
            setTimeout(() => exportPdfBtn.textContent = originalText, 2000);
        } catch (err) {
            console.error('PDF Export error:', err);
            alert('Failed to export PDF: ' + err.message);
        }
    });

    newBtn.addEventListener('click', () => {
        window.scribbitRouter.navigate('home');
    });
}

function displayFeedback(container, feedback) {
    // Process the Markdown-style response into structured HTML
    // We expect the structure specified in the prompt

    // Quick regex based parser for the specific sections
    const sections = [
        { key: 'Writing Type Detected', label: 'Writing Type Detected' },
        { key: 'What\'s Working', label: 'What\'s Working' },
        { key: '2–3 Things to Develop', label: 'Things to Develop' },
        { key: 'One Question to Take Forward', label: 'One Question' }
    ];

    let html = '<div class="ps-ai-box"><div class="ps-ai-response">';

    // Fallback if the AI doesn't follow instructions perfectly (simple display)
    if (!feedback.includes('**')) {
        html += `<div class="ps-ai-item-content">${feedback.replace(/\n/g, '<br>')}</div>`;
    } else {
        // Simple heuristic split
        const parts = feedback.split('**');
        parts.forEach(part => {
            if (!part.trim()) return;
            const lines = part.trim().split('\n');
            const title = lines[0].replace(/:$/, '');
            const content = lines.slice(1).join('<br>').trim();

            if (content) {
                html += `
                    <div class="ps-ai-item">
                        <div class="ps-ai-item-title">${title}</div>
                        <div class="ps-ai-item-content">${content}</div>
                    </div>
                `;
            } else {
                // If the prompt put content on the same line as the bold title
                const colonIdx = part.indexOf(':');
                if (colonIdx !== -1) {
                    const t = part.substring(0, colonIdx).trim();
                    const c = part.substring(colonIdx + 1).trim().replace(/\n/g, '<br>');
                    html += `
                        <div class="ps-ai-item">
                            <div class="ps-ai-item-title">${t}</div>
                            <div class="ps-ai-item-content">${c}</div>
                        </div>
                    `;
                }
            }
        });
    }

    html += '</div></div>';
    container.innerHTML = html;
}

async function requestAiFeedback(session) {
    let systemPrompt = `You are a writing coach. You will be given a piece of writing. Your job is to give structured, honest, specific feedback. Never correct spelling or grammar. Never rewrite sentences. Never give a score or rating. Never be generic.

Respond in exactly this structure:

**Writing Type Detected:**
Identify what form of writing this appears to be (e.g. personal essay, opinion piece, narrative story, stream of consciousness, thought leadership article, journal entry, sales copy, reflective writing). State it in one sentence.

**What's Working:**
Identify the single strongest element of this piece. Be specific — name the actual sentence, phrase, or structural choice that works and explain briefly why.

**2–3 Things to Develop:**
Give 2 to 3 specific, actionable structural or stylistic observations. Focus on things like: sentence length variety, paragraph rhythm, opening strength, clarity of argument, voice consistency, pacing, or conclusion. Do not mention spelling, grammar, or punctuation.

**One Question to Take Forward:**
Ask one open-ended question that pushes the writer's thinking further on the subject they wrote about. Make it specific to what they actually wrote.

Keep the entire response under 300 words. Use plain language. Tone: thoughtful, direct, encouraging but honest — like a respected writing mentor, not a teacher grading an assignment.`;

    if (session.sessionType === 'Read & Respond') {
        systemPrompt += `\n\nNote: this writer was responding to a piece of reading material. Comment briefly on how well their writing engaged with or built on the source.`;
    }

    const messages = [
        { role: 'user', content: session.text }
    ];

    return await window.scribbit.ai.complete(messages, { system: systemPrompt });
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

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (window.scribbitRouter) {
    window.scribbitRouter.register('post-session', render);
}

window.scribbitPostSession = { render };
