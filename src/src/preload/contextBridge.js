const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eauisAPI', {
    // Expose limited, secure IPC methods here
    getMood: () => ipcRenderer.invoke('get-mood'),
    submitSurvey: (data) => ipcRenderer.invoke('submit-survey', data),
    onMoodUpdate: (callback) => ipcRenderer.on('update-ui', (_event, state) => callback(state))
});
