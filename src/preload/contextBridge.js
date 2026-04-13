const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eauisAPI', {
	getMood: () => ipcRenderer.invoke('get-mood'),
	saveMoodSnapshot: (data) => ipcRenderer.invoke('save-mood-snapshot', data),
	onMoodUpdate: (callback) => ipcRenderer.on('update-ui', (_event, state) => callback(state))
});
