const { ipcMain } = require('electron');
const surveyController = require('../controllers/surveyController');
// const moodController = require('../controllers/moodController'); // Example for later

function initializeIPC() {
    // UI to Database Flow: The router catches IPC calls and maps them to controllers
    ipcMain.handle('submit-survey', (event, data) => surveyController.handleSurveySubmission(event, data));
    
    // Background OS tracking to UI Flow Example:
    // ipcMain.handle('get-mood', moodController.getCurrentMood);
}

module.exports = { initializeIPC };
