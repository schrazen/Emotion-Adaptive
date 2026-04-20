const { ipcMain } = require('electron');
const moodController = require('../controllers/moodController');

function initializeIPC() {
    ipcMain.handle('save-mood-snapshot', (event, data) => moodController.handleMoodSnapshot(event, data));
    ipcMain.handle('get-mood', () => moodController.handleGetMood());
    ipcMain.handle('get-mood-history', (event, limit) => moodController.handleGetMoodHistory(event, limit));
}

module.exports = { initializeIPC };
