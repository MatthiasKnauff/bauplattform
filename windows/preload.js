/* Läuft in jeder Seite der Plattform innerhalb der Windows-App. Gibt der Seite nur wenig preis:
   window.bpDesktop = { app: 'windows', version, server }  – damit die Plattform erkennen kann, dass sie in der App läuft
   und zwei Knöpfe für die Fehlerseite (Erneut versuchen, Einstellungen). Kein Zugriff auf Dateien oder Programme. */
const { contextBridge, ipcRenderer } = require('electron');

const info = ipcRenderer.sendSync('bp:info');
contextBridge.exposeInMainWorld('bpDesktop', {
  app: info.app,
  version: info.version,
  server: info.server,
  erneut: () => ipcRenderer.send('fehler:erneut'),
  einstellungen: () => ipcRenderer.send('fehler:einstellungen'),
});
