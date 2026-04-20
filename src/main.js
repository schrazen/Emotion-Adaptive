const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let initializeIPC = null;

let uIOhook = null;
try {
    ({ uIOhook } = require('uiohook-napi'));
} catch (error) {
    console.warn('uiohook-napi failed to load. Global key tracking disabled.', error.message);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.quit();
}

let mainWindow = null;
let widgetOnlyMode = false;
let dragSession = null;
let selectedCharacter = 'pikachu';
let globalHookStarted = false;

const moodLogDir = path.join(__dirname, 'backend', 'database', 'logs');
const moodLogPath = path.join(moodLogDir, 'mood-debug.log');

function appendMoodDebugLog(payload) {
    try {
        fs.mkdirSync(moodLogDir, { recursive: true });
        const line = JSON.stringify({ at: new Date().toISOString(), ...payload }) + '\n';
        fs.appendFileSync(moodLogPath, line, 'utf8');
    } catch (error) {
        console.error('Failed to append mood debug log:', error.message);
    }
}

function mapKeycodeToToken(keycode) {
    if (typeof keycode !== 'number') {
        return null;
    }

    const letterMap = {
        30: 'a', 48: 'b', 46: 'c', 32: 'd', 18: 'e', 33: 'f', 34: 'g', 35: 'h',
        23: 'i', 36: 'j', 37: 'k', 38: 'l', 50: 'm', 49: 'n', 24: 'o', 25: 'p',
        16: 'q', 19: 'r', 31: 's', 20: 't', 22: 'u', 47: 'v', 17: 'w', 45: 'x',
        21: 'y', 44: 'z'
    };

    if (letterMap[keycode]) return letterMap[keycode];
    if (keycode === 57) return 'SPACE';
    if (keycode === 28) return 'ENTER';
    if (keycode === 14) return 'BACKSPACE';
    return null;
}

function applyWindowMode() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return;
    }

    if (widgetOnlyMode) {
        mainWindow.setSize(220, 220);
        mainWindow.loadFile(path.join(__dirname, 'frontend/pages/widget.html'));
        return;
    }

    mainWindow.setSize(380, 480);
    mainWindow.loadFile(path.join(__dirname, 'frontend/pages/main.html'));
}

function centerMainWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return;
    }

    const bounds = mainWindow.getBounds();
    const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
    const workArea = display.workArea;
    const centerX = Math.round(workArea.x + (workArea.width - bounds.width) / 2);
    const centerY = Math.round(workArea.y + (workArea.height - bounds.height) / 2);
    mainWindow.setPosition(centerX, centerY);
}

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

    applyWindowMode();
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startGlobalKeyboardTracking() {
    if (!uIOhook) {
        return;
    }

    if (globalHookStarted) {
        return;
    }

    uIOhook.on('keydown', (event) => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return;
        }

        mainWindow.webContents.send('global-key-activity', {
            keycode: event.keycode,
            token: mapKeycodeToToken(event.keycode),
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            when: Date.now(),
        });
    });

    try {
        uIOhook.start();
        globalHookStarted = true;
    } catch (error) {
        console.warn('Global key hook failed to start. Continuing without global tracking.', error.message);
    }
}

// APP STARTUP
app.whenReady().then(() => {
    const databaseRoot = path.join(app.getPath('userData'), 'database');
    fs.mkdirSync(databaseRoot, { recursive: true });
    process.env.EAUIS_DATA_DIR = databaseRoot;

    try {
        const localSessionPath = path.join(app.getPath('userData'), 'electron-session');
        fs.mkdirSync(localSessionPath, { recursive: true });
        app.setPath('sessionData', localSessionPath);
    } catch (error) {
        console.warn('Failed to set local sessionData path:', error.message);
    }

    initializeIPC = require('./backend/router').initializeIPC;
    initializeIPC();
    createWindow();
    startGlobalKeyboardTracking();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }

        mainWindow.focus();
    }
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

ipcMain.handle('widget:get-mode', () => widgetOnlyMode);

ipcMain.handle('widget:set-mode', (_event, enabled) => {
    widgetOnlyMode = Boolean(enabled);
    applyWindowMode();
    return widgetOnlyMode;
});

ipcMain.handle('widget:return-to-normal', () => {
    widgetOnlyMode = false;
    applyWindowMode();
    centerMainWindow();
    return widgetOnlyMode;
});

ipcMain.handle('character:get-selected', () => selectedCharacter);

ipcMain.handle('character:set-selected', (_event, character) => {
    const next = character === 'kirby' || character === 'bmo' ? character : 'pikachu';
    selectedCharacter = next;
    return selectedCharacter;
});

ipcMain.on('widget:drag-start', (_event, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return;
    }

    if (!payload || typeof payload.screenX !== 'number' || typeof payload.screenY !== 'number') {
        return;
    }

    const [winX, winY] = mainWindow.getPosition();
    dragSession = {
        startMouseX: payload.screenX,
        startMouseY: payload.screenY,
        startWinX: winX,
        startWinY: winY,
    };
});

ipcMain.on('widget:drag-move', (_event, payload) => {
    if (!mainWindow || mainWindow.isDestroyed() || !dragSession) {
        return;
    }

    if (!payload || typeof payload.screenX !== 'number' || typeof payload.screenY !== 'number') {
        return;
    }

    const nextX = dragSession.startWinX + Math.round(payload.screenX - dragSession.startMouseX);
    const nextY = dragSession.startWinY + Math.round(payload.screenY - dragSession.startMouseY);
    mainWindow.setPosition(nextX, nextY);
});

ipcMain.on('widget:drag-end', () => {
    dragSession = null;
});

ipcMain.on('mood:debug-log', (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
        return;
    }

    appendMoodDebugLog(payload);
});

ipcMain.handle('mood:debug-log-path', () => moodLogPath);

// APP EXIT LOGIC
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    try {
        if (uIOhook && globalHookStarted) {
            uIOhook.stop();
        }
    } catch (_error) {
        // Ignore cleanup errors during app shutdown.
    }
});

