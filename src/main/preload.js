'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a safe, limited API to the renderer process via window.scribbit
 */
contextBridge.exposeInMainWorld('scribbit', {
    // ── Database ──────────────────────────────────────────────────────────────
    db: {
        get: (key) => ipcRenderer.invoke('db:get', key),
        set: (key, value) => ipcRenderer.invoke('db:set', key, value),
        delete: (key) => ipcRenderer.invoke('db:delete', key),
        getAll: () => ipcRenderer.invoke('db:getAll'),
    },

    // ── AI ────────────────────────────────────────────────────────────────────
    ai: {
        complete: (messages, options) => ipcRenderer.invoke('ai:complete', messages, options),
        setApiKey: (key) => ipcRenderer.invoke('ai:setApiKey', key),
        hasApiKey: () => ipcRenderer.invoke('ai:hasApiKey'),
        getProvider: () => ipcRenderer.invoke('ai:getProvider'),
        setProvider: (provider) => ipcRenderer.invoke('ai:setProvider', provider),
    },

    // ── Theme ─────────────────────────────────────────────────────────────────
    theme: {
        get: () => ipcRenderer.invoke('theme:get'),
        set: (mode) => ipcRenderer.invoke('theme:set', mode),
        onChange: (callback) => {
            ipcRenderer.on('theme:changed', (_event, mode) => callback(mode));
        },
    },

    // ── App ───────────────────────────────────────────────────────────────────
    app: {
        getVersion: () => ipcRenderer.invoke('app:getVersion'),
        saveToDownloads: (filename, content) => ipcRenderer.invoke('app:saveToDownloads', filename, content),
        savePDFToDownloads: (filename, htmlContent) => ipcRenderer.invoke('app:savePDFToDownloads', filename, htmlContent),
    },

    // ── Window ───────────────────────────────────────────────────────────────
    window: {
        setWritingMode: (enabled) => ipcRenderer.invoke('window:setWritingMode', enabled),
    },

    // ── Shell ────────────────────────────────────────────────────────────────
    shell: {
        openExternal: (url) => ipcRenderer.send('shell:openExternal', url),
    },
});
