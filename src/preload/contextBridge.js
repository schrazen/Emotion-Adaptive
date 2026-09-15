const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('eauisAPI', {
// 	getMood: () => ipcRenderer.invoke('get-mood'),
// 	saveMoodSnapshot: (data) => ipcRenderer.invoke('save-mood-snapshot', data),
// 	onMoodUpdate: (callback) => ipcRenderer.on('update-ui', (_event, state) => callback(state)),
// 	onGlobalKeyActivity: (callback) => ipcRenderer.on('global-key-activity', (_event, data) => callback(data))
// });

contextBridge.exposeInMainWorld('api', {
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    closeWindow: () => ipcRenderer.send('window:close'),
    getPageContent: (pageName) => ipcRenderer.invoke('page:load', pageName),
    getMood: () => ipcRenderer.invoke('get-mood'),
    getMoodHistory: (limit) => ipcRenderer.invoke('get-mood-history', limit),
    saveMoodSnapshot: (data) => ipcRenderer.invoke('save-mood-snapshot', data),
    saveDetailedSignals: (data) => ipcRenderer.invoke('save-detailed-signals', data),
    addMoodFeedback: (data) => ipcRenderer.invoke('add-mood-feedback', data),
    getAccuracyReport: (days) => ipcRenderer.invoke('get-accuracy-report', days),
    onMoodUpdate: (callback) => ipcRenderer.on('update-ui', (_event, state) => callback(state)),
    onGlobalKeyActivity: (callback) => ipcRenderer.on('global-key-activity', (_event, data) => callback(data)),
    onGlobalMouseActivity: (callback) => ipcRenderer.on('global-mouse-activity', (_event, data) => callback(data)),
    getWidgetOnlyMode: () => ipcRenderer.invoke('widget:get-mode'),
    setWidgetOnlyMode: (enabled) => ipcRenderer.invoke('widget:set-mode', enabled),
    returnToNormalMode: () => ipcRenderer.invoke('widget:return-to-normal'),
    getSelectedCharacter: () => ipcRenderer.invoke('character:get-selected'),
    setSelectedCharacter: (character) => ipcRenderer.invoke('character:set-selected', character),
    getActiveWindowTitle: () => ipcRenderer.invoke('window:get-active-title'),
    beginWidgetDrag: (screenX, screenY) => ipcRenderer.send('widget:drag-start', { screenX, screenY }),
    moveWidgetDrag: (screenX, screenY) => ipcRenderer.send('widget:drag-move', { screenX, screenY }),
    endWidgetDrag: () => ipcRenderer.send('widget:drag-end'),
    beginWindowResize: (screenX, screenY, edge = 'bottom-right') => ipcRenderer.send('window:resize-start', { screenX, screenY, edge }),
    moveWindowResize: (screenX, screenY) => ipcRenderer.send('window:resize-move', { screenX, screenY }),
    endWindowResize: () => ipcRenderer.send('window:resize-end'),
    logMoodDebug: (payload) => ipcRenderer.send('mood:debug-log', payload),
    getMoodDebugLogPath: () => ipcRenderer.invoke('mood:debug-log-path')
});
