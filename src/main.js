const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initializeIPC } = require('./backend/router');
const { uIOhook } = require('uiohook-napi');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 240,
        height: 140,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        transparent: true,
        skipTaskbar: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload/contextBridge.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'frontend/index.html'));
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startGlobalKeyboardTracking() {
    uIOhook.on('keydown', (event) => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return;
        }

        mainWindow.webContents.send('global-key-activity', {
            keycode: event.keycode,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            when: Date.now(),
        });
    });

    uIOhook.start();
}

app.whenReady().then(() => {
    initializeIPC();
    createWindow();
    startGlobalKeyboardTracking();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    try {
        uIOhook.stop();
    } catch (_error) {
        // Ignore cleanup errors during app shutdown.
    }
});

