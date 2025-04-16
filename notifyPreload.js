const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    onMetaData: (callback) => ipcRenderer.on('set-meta', callback),
    onCloseNotify: (index) => ipcRenderer.send('close-notify', index)
})
