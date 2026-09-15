const { ipcMain } = require('electron');
const moodController = require('../controllers/moodController');

function initializeIPC() {
    ipcMain.handle('save-mood-snapshot', (event, data) => moodController.handleMoodSnapshot(event, data));
    ipcMain.handle('get-mood', () => moodController.handleGetMood());
    ipcMain.handle('get-mood-history', (event, limit) => moodController.handleGetMoodHistory(event, limit));
    ipcMain.handle('save-detailed-signals', (event, data) => moodController.handleSaveDetailedSignals(event, data));
    ipcMain.handle('add-mood-feedback', (event, data) => moodController.handleAddMoodFeedback(event, data));
    ipcMain.handle('get-accuracy-report', (event, days) => moodController.handleGetAccuracyReport(event, days));
}

module.exports = { initializeIPC };
