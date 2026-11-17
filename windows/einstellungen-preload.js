/* Nur für das Fenster „Einstellungen“ der Windows-App */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('einst', {
  holen: () => ipcRenderer.invoke('einst:holen'),
  speichern: (e) => ipcRenderer.invoke('einst:speichern', e),
  abbrechen: () => ipcRenderer.send('einst:abbrechen'),
});
