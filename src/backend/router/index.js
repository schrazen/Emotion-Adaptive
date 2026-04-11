const { ipcMain } = require('electron');
const moodController = require('../controllers/moodController');

function initializeIPC() {
    ipcMain.handle('save-mood-snapshot', (event, data) => moodController.handleMoodSnapshot(event, data));
    ipcMain.handle('get-mood', () => moodController.handleGetMood());
}

module.exports = { initializeIPC };
