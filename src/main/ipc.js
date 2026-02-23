'use strict';

/**
 * IPC handler registration.
 * All communication between renderer and main process goes through here.
 */

const { ipcMain, app, BrowserWindow } = require('electron');
const ai = require('./ai');

module.exports = function registerIpcHandlers(db, aiModule, getMainWindow) {
    // ── Database ──────────────────────────────────────────────────────────────
    ipcMain.handle('db:get', (_event, key) => db.get(key));
    ipcMain.handle('db:set', (_event, key, value) => db.set(key, value));
    ipcMain.handle('db:delete', (_event, key) => db.delete(key));
    ipcMain.handle('db:getAll', () => db.getAll());
    ipcMain.handle('db:createBackup', () => db.createBackup());
    ipcMain.handle('db:restoreBackup', (_event, backupPath) => db.restoreFromBackup(backupPath));
    ipcMain.handle('db:getBackups', () => db.getBackups());

    // ── AI ────────────────────────────────────────────────────────────────────
    ipcMain.handle('ai:complete', async (_event, messages, options) => {
        try {
            return await aiModule.complete(db, messages, options);
        } catch (err) {
            console.error('[IPC] ai:complete error:', err);
            throw err;
        }
    });
    ipcMain.handle('ai:setApiKey', (_event, key) => {
        try {
            return aiModule.setApiKey(db, key);
        } catch (err) {
            console.error('[IPC] ai:setApiKey error:', err);
            throw err;
        }
    });
    ipcMain.handle('ai:hasApiKey', () => {
        try {
            return aiModule.hasApiKey(db);
        } catch (err) {
            console.error('[IPC] ai:hasApiKey error:', err);
            throw err;
        }
    });
    ipcMain.handle('ai:validateApiKey', async (_event, key, provider) => {
        try {
            return await aiModule.validateApiKey(db, key, provider);
        } catch (err) {
            console.error('[IPC] ai:validateApiKey error:', err);
            throw err;
        }
    });
    ipcMain.handle('ai:getProvider', () => {
        try {
            return aiModule.getProvider(db);
        } catch (err) {
            console.error('[IPC] ai:getProvider error:', err);
            throw err;
        }
    });
    ipcMain.handle('ai:setProvider', (_event, provider) => {
        try {
            return aiModule.setProvider(db, provider);
        } catch (err) {
            console.error('[IPC] ai:setProvider error:', err);
            throw err;
        }
    });

    // ── Theme ─────────────────────────────────────────────────────────────────
    ipcMain.handle('theme:get', () => {
        const settings = db.get('settings') || {};
        return settings.theme || 'light';
    });

    ipcMain.handle('theme:set', (_event, mode) => {
        const settings = db.get('settings') || {};
        settings.theme = mode;
        db.set('settings', settings);

        // Notify all windows
        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('theme:changed', mode);
        });
        return mode;
    });

    // ── App ───────────────────────────────────────────────────────────────────
    ipcMain.handle('app:getVersion', () => app.getVersion());
    ipcMain.handle('app:saveToDownloads', async (_event, filename, content) => {
        const fs = require('fs/promises');
        const path = require('path');
        const downloadPath = path.join(app.getPath('downloads'), filename);
        await fs.writeFile(downloadPath, content, 'utf8');
        return downloadPath;
    });
    ipcMain.handle('app:savePDFToDownloads', async (_event, filename, htmlContent) => {
        const fs = require('fs/promises');
        const path = require('path');
        const os = require('os');
        const puppeteer = require('puppeteer-core');

        const downloadPath = path.join(app.getPath('downloads'), filename);
        const tempHtmlPath = path.join(os.tmpdir(), `scribbit_${Date.now()}.html`);

        // Create a complete HTML document with styling
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 60px 80px;
        }
        body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 14pt;
            line-height: 1.8;
            color: #333333;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: left;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid #cccccc;
        }
        .logo {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 10pt;
            color: #888888;
            margin-bottom: 5px;
        }
        .meta {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 9pt;
            color: #888888;
            margin-bottom: 3px;
        }
        .prompt {
            font-style: italic;
            color: #666666;
            margin: 25px 0;
            padding: 15px 20px;
            background-color: #f5f5f5;
            border-left: 3px solid #cccccc;
        }
        .divider {
            border: none;
            border-top: 1px solid #cccccc;
            margin: 30px 0;
        }
        .content {
            text-align: left;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .feedback-section {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #cccccc;
        }
        .feedback-title {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 16pt;
            font-weight: bold;
            color: #333333;
            margin-bottom: 20px;
        }
        .feedback-content {
            font-size: 12pt;
            line-height: 1.6;
            color: #444444;
        }
        @media print {
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;

        let browser = null;

        try {
            // Write HTML to temp file
            await fs.writeFile(tempHtmlPath, fullHtml, 'utf8');

            // Find Chrome/Chromium executable
            const chromePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/usr/bin/google-chrome',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium'
            ];

            let executablePath = null;
            for (const p of chromePaths) {
                try {
                    await fs.access(p);
                    executablePath = p;
                    break;
                } catch {
                    continue;
                }
            }

            if (!executablePath) {
                // Fallback: try to use Edge on Windows
                try {
                    await fs.access('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
                    executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
                } catch {
                    throw new Error('Could not find Chrome, Chromium, or Edge browser for PDF generation');
                }
            }

            // Launch browser and generate PDF
            browser = await puppeteer.launch({
                executablePath,
                headless: true
            });

            const page = await browser.newPage();
            await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });

            await page.pdf({
                path: downloadPath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '60px',
                    bottom: '60px',
                    left: '80px',
                    right: '80px'
                },
                displayHeaderFooter: true,
                headerTemplate: '<div></div>',
                footerTemplate: '<div style="font-size: 9px; width: 100%; text-align: center; color: #888;"><span class="pageNumber"></span></div>'
            });

            await browser.close();
            browser = null;

            // Clean up temp file
            await fs.unlink(tempHtmlPath);

            return downloadPath;
        } catch (err) {
            // Clean up
            if (browser) {
                try {
                    await browser.close();
                } catch { }
            }
            try {
                await fs.unlink(tempHtmlPath);
            } catch { }
            throw err;
        }
    });

    // ── Window ────────────────────────────────────────────────────────────────
    const writingState = new Map();

    ipcMain.handle('window:setWritingMode', (_event, enabled) => {
        const win = getMainWindow ? getMainWindow() : BrowserWindow.getFocusedWindow();
        if (!win) return false;

        const id = win.id;
        if (enabled) {
            if (!writingState.has(id)) {
                writingState.set(id, {
                    fullScreen: win.isFullScreen(),
                    menuBarVisible: win.isMenuBarVisible(),
                    autoHideMenuBar: win.isMenuBarAutoHide(),
                });
            }
            win.setMenuBarVisibility(false);
            win.setAutoHideMenuBar(true);
            win.setFullScreen(true);
        } else {
            const prev = writingState.get(id);
            if (prev) {
                win.setFullScreen(prev.fullScreen);
                win.setMenuBarVisibility(prev.menuBarVisible);
                win.setAutoHideMenuBar(prev.autoHideMenuBar);
                writingState.delete(id);
            } else {
                win.setFullScreen(false);
                win.setMenuBarVisibility(true);
                win.setAutoHideMenuBar(false);
            }
        }
        return true;
    });

    ipcMain.on('shell:openExternal', (_event, url) => {
        const { shell } = require('electron');
        shell.openExternal(url);
    });
};
