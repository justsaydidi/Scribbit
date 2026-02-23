'use strict';

const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const db = require('./db');
const ai = require('./ai');

let mainWindow;
let isQuitting = false;

const cacheDir = path.join(app.getPath('userData'), 'Cache');
app.commandLine.appendSwitch('disk-cache-dir', cacheDir);
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, '../../src/renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register IPC handlers
  require('./ipc')(db, ai, () => mainWindow);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Save session before quitting
app.on('before-quit', async (event) => {
  if (isQuitting) return;
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    event.preventDefault();
    isQuitting = true;
    
    try {
      await mainWindow.webContents.executeJavaScript(`
        if (window.scribbitWriting && window.scribbitWriting.autosaveSession) {
          window.scribbitWriting.autosaveSession();
        }
      `);
    } catch (err) {
      console.error('Error saving session before quit:', err);
    }
    
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
