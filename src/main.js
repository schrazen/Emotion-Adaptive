const {app, BrowserWindow} = require('electron');
const path = require('path');
const { initializeIPC } = require('./backend/router');

function createWindow(){
    const win = new BrowserWindow ({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload/contextBridge.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    })
    win.loadFile(path.join(__dirname, 'frontend/index.html'));
}

app.whenReady().then(() => {
    initializeIPC();
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

