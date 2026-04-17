const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeIPC } = require('./backend/router');
const { uIOhook } = require('uiohook-napi');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 380,
        height: 480,
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

    mainWindow.loadFile(path.join(__dirname, 'frontend/pages/main.html'));
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

// APP STARTUP
app.whenReady().then(() => {
    initializeIPC();
    createWindow();
    startGlobalKeyboardTracking();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// WINDOW CONTROLS
ipcMain.on('window:minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('window:close', () => {
    mainWindow.close();
});

// SECURE FILE LOADER
ipcMain.handle('page:load', async (event, pageName) => {
    try {
        const filePath = path.join(__dirname, 'frontend/pages', `${pageName}.html`);
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return `<h2>Error</h2><p>File not found: ${pageName}.html</p>`;
    }
});

// APP EXIT LOGIC
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

