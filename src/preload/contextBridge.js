const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eauisAPI', {
	getMood: () => ipcRenderer.invoke('get-mood'),
	saveMoodSnapshot: (data) => ipcRenderer.invoke('save-mood-snapshot', data),
	onMoodUpdate: (callback) => ipcRenderer.on('update-ui', (_event, state) => callback(state)),
	onGlobalKeyActivity: (callback) => ipcRenderer.on('global-key-activity', (_event, data) => callback(data))
});
