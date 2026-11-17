/* Bauplattform als Windows-App (beschlossen am 17.11.2026: zuerst nur fürs Büro).
   Eine Hülle um dieselbe Oberfläche wie im Browser – wie Fusion 360: die App holt sich Seiten und Programmcode vom Server, die Daten bleiben
   online. Jeder Push/jede Freigabe ist damit sofort auch in der App; die Hülle selbst aktualisiert sich über GitHub-Releases (electron-updater).
   Was die Hülle dazugibt: eigene Fenster (abgedockte Bereiche als echte Windows-Fenster, auch auf dem zweiten Bildschirm), Umschalter
   Produktion/Testserver, Windows-Benachrichtigungen, Autostart, eine Fehlerseite, wenn der Server nicht erreichbar ist.
   Offline-Betrieb kommt später als eigenes Paket. */
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_ID = 'de.gk3-architektur.bauplattform';
const STANDARD = { server: 'produktion', adressen: { produktion: 'https://bauportal.gk3-architektur.de', test: '' }, autostart: false, fenster: null };

/* ---------- Einstellungen: eine kleine JSON-Datei im Benutzerordner der App ---------- */
const DATEI = () => path.join(app.getPath('userData'), 'einstellungen.json');
function lesen() {
  try {
    const e = JSON.parse(fs.readFileSync(DATEI(), 'utf8'));
    return { ...STANDARD, ...e, adressen: { ...STANDARD.adressen, ...(e.adressen || {}) } };
  } catch { return JSON.parse(JSON.stringify(STANDARD)); }
}
function schreiben(e) { try { fs.mkdirSync(path.dirname(DATEI()), { recursive: true }); fs.writeFileSync(DATEI(), JSON.stringify(e, null, 2)); } catch (x) { console.error(x); } }
let E = null;   // aktuelle Einstellungen (nach app.ready gelesen)

const adresse = () => {
  const a = String(E.adressen[E.server] || '').trim().replace(/\/+$/, '');
  return /^https?:\/\//.test(a) ? a : '';
};
const herkunft = (u) => { try { return new URL(u).origin; } catch { return ''; } };
/* Was zur Plattform gehört (bleibt in der App): dieselbe Adresse – und beim Büro-Server alle Unteradressen der Domain (Apps unter eigenen Namen) */
function intern(u) {
  const h = herkunft(u), basis = adresse(); if (!h || !basis) return false;
  if (h === herkunft(basis)) return true;
  try {
    const a = new URL(basis).hostname, b = new URL(u).hostname, dom = a.split('.').slice(-2).join('.');
    return /\./.test(dom) && !/^\d+\.\d+$/.test(dom) && (b === dom || b.endsWith('.' + dom));
  } catch { return false; }
}

/* ---------- Hauptfenster ---------- */
let HAUPT = null;
const TITEL = () => 'Bauplattform' + (E.server === 'test' ? ' – Testserver' : '');
const sitzung = () => 'persist:' + E.server;   // je Server eine eigene Anmeldung (Cookies), Produktion und Test mischen sich nicht

function fensterOptionen(extra = {}) {
  return {
    backgroundColor: '#ffffff', icon: path.join(__dirname, 'build', 'icon.png'), autoHideMenuBar: true, title: TITEL(),
    webPreferences: { partition: sitzung(), preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, spellcheck: true, plugins: true },
    ...extra,
  };
}

function testStreifen(wc) {   // Testserver: dünner oranger Streifen oben – man sieht immer, wo man arbeitet
  if (E.server !== 'test') return;
  wc.on('dom-ready', () => { wc.insertCSS('html::after{content:"";position:fixed;inset:0 0 auto 0;height:3px;background:#e07b3a;z-index:2147483647;pointer-events:none}').catch(() => {}); });
}

function verdrahten(win) {
  const wc = win.webContents;
  testStreifen(wc);
  /* window.open: Seiten der Plattform als eigenes Windows-Fenster (abgedockte Bereiche, PDF, Assistent); alles andere im Standardbrowser */
  wc.setWindowOpenHandler(({ url }) => {
    if (intern(url) || url === 'about:blank') return { action: 'allow', overrideBrowserWindowOptions: fensterOptionen({ width: 1000, height: 760 }) };
    if (/^(https?|mailto):/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('did-create-window', (kind) => verdrahten(kind));
  wc.on('will-navigate', (ev, url) => { if (!intern(url) && !url.startsWith('file:')) { ev.preventDefault(); if (/^(https?|mailto):/.test(url)) shell.openExternal(url); } });
  wc.on('page-title-updated', (ev) => { ev.preventDefault(); win.setTitle(TITEL()); });
  /* Tastenkürzel wie im Browser: F5 neu laden, F11 Vollbild, Strg+/−/0 Zoom (Strg+R gehört der Plattform nicht) */
  wc.on('before-input-event', (ev, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F5') { ev.preventDefault(); wc.reloadIgnoringCache(); }
    else if (i.key === 'F11') { ev.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    else if (i.key === 'F12' || (i.control && i.shift && i.key.toLowerCase() === 'i')) { ev.preventDefault(); wc.toggleDevTools(); }
  });
}

function laden() {
  const a = adresse();
  if (!a) return einstellungen(true);
  HAUPT.setTitle(TITEL());
  HAUPT.loadURL(a + '/').catch(() => {});   // Fehler fängt did-fail-load
}

function hauptfenster() {
  const f = E.fenster || {};
  HAUPT = new BrowserWindow(fensterOptionen({ width: f.width || 1440, height: f.height || 900, x: f.x, y: f.y, show: false }));
  if (f.max) HAUPT.maximize();
  HAUPT.once('ready-to-show', () => HAUPT.show());
  verdrahten(HAUPT);
  HAUPT.webContents.on('did-fail-load', (ev, code, text, url, haupt) => {   // Server nicht erreichbar: eigene Seite mit „Erneut versuchen“
    if (!haupt || code === -3) return;   // -3: abgebrochen (z. B. weitergeleitet)
    HAUPT.loadFile(path.join(__dirname, 'fehler.html'), { query: { adresse: adresse(), server: E.server, text: String(text || code) } });
  });
  const merken = () => { if (HAUPT.isMinimized() || HAUPT.isFullScreen()) return; const b = HAUPT.getNormalBounds(); E.fenster = { ...b, max: HAUPT.isMaximized() }; schreiben(E); };
  HAUPT.on('close', merken);
  HAUPT.on('closed', () => { HAUPT = null; });
  laden();
}

/* ---------- Einstellungen (eigenes kleines Fenster, hell, ohne Systemdialoge) ---------- */
let EINST = null;
function einstellungen(zwingend) {
  if (EINST) return EINST.focus();
  EINST = new BrowserWindow({ width: 560, height: 520, resizable: false, minimizable: false, maximizable: false, parent: HAUPT || undefined, modal: !!HAUPT,
    title: 'Einstellungen – Bauplattform', backgroundColor: '#ffffff', autoHideMenuBar: true, icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'einstellungen-preload.js'), contextIsolation: true, sandbox: true } });
  EINST.setMenu(null);
  EINST.loadFile(path.join(__dirname, 'einstellungen.html'), { query: { zwingend: zwingend ? '1' : '' } });
  EINST.on('closed', () => { EINST = null; if (zwingend && !adresse()) app.quit(); });
}
ipcMain.handle('einst:holen', () => ({ ...E, version: app.getVersion() }));
ipcMain.handle('einst:speichern', (ev, neu) => {
  const alt = { server: E.server, adr: adresse() };
  const s = (v) => String(v || '').trim().replace(/\/+$/, '');
  E.adressen = { produktion: s(neu.adressen && neu.adressen.produktion), test: s(neu.adressen && neu.adressen.test) };
  E.server = neu.server === 'test' ? 'test' : 'produktion';
  E.autostart = !!neu.autostart;
  if (!adresse()) return { fehler: `Für ${E.server === 'test' ? 'den Testserver' : 'die Produktion'} fehlt die Adresse (z. B. https://bauportal.gk3-architektur.de).` };
  schreiben(E);
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: E.autostart });
  if (EINST) EINST.close();
  if (!HAUPT) hauptfenster();
  else if (alt.server !== E.server || alt.adr !== adresse()) wechseln();
  menue();
  return { ok: true };
});
ipcMain.on('einst:abbrechen', () => { if (EINST) EINST.close(); });
ipcMain.on('fehler:erneut', () => laden());
ipcMain.on('fehler:einstellungen', () => einstellungen(false));
ipcMain.on('bp:info', (ev) => { ev.returnValue = { app: 'windows', version: app.getVersion(), server: E.server }; });

function wechseln() {   // Server gewechselt: alle Fenster der alten Sitzung schließen, Hauptfenster neu aufbauen
  const f = HAUPT;
  BrowserWindow.getAllWindows().forEach((w) => { if (w !== f && w !== EINST) w.close(); });
  if (f) { f.removeAllListeners('close'); f.destroy(); }
  hauptfenster();
}

/* ---------- Menü (Alt blendet es ein – die Plattform hat ihre eigene Kopfleiste) ---------- */
function menue() {
  const server = (art, text) => ({ label: text, type: 'radio', checked: E.server === art, enabled: !!E.adressen[art] || art === E.server,
    click: () => { if (E.server === art) return; E.server = art; schreiben(E); wechseln(); menue(); } });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Bauplattform', submenu: [
      { label: 'Startseite', accelerator: 'Alt+Home', click: () => HAUPT && laden() },
      { label: 'Neu laden', accelerator: 'F5', click: () => HAUPT && HAUPT.webContents.reloadIgnoringCache() },
      { type: 'separator' },
      server('produktion', 'Produktion'), server('test', 'Testserver'),
      { type: 'separator' },
      { label: 'Einstellungen …', accelerator: 'CmdOrCtrl+,', click: () => einstellungen(false) },
      { type: 'separator' },
      { label: 'Beenden', role: 'quit' },
    ] },
    { label: 'Ansicht', submenu: [
      { label: 'Größer', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' }, { label: 'Kleiner', role: 'zoomOut' }, { label: 'Normalgröße', role: 'resetZoom' },
      { type: 'separator' }, { label: 'Vollbild', role: 'togglefullscreen', accelerator: 'F11' },
      { type: 'separator' }, { label: 'Entwicklerwerkzeuge', accelerator: 'CmdOrCtrl+Shift+I', click: (m, w) => w && w.webContents.toggleDevTools() },
    ] },
    { label: 'Hilfe', submenu: [
      { label: 'Nach Updates suchen', click: () => updates(true) },
      { label: `Version ${app.getVersion()}`, enabled: false },
    ] },
  ]));
}

/* ---------- Updates der Hülle: aus den GitHub-Releases (dort hängt die Pipeline das Setup an) ---------- */
let UPD = null;
function updates(vonHand) {
  if (!app.isPackaged) { if (vonHand) dialogHinweis('Updates gibt es nur in der installierten App.'); return; }
  if (!UPD) {
    UPD = require('electron-updater').autoUpdater;
    UPD.autoDownload = true; UPD.autoInstallOnAppQuit = true;
    UPD.on('update-downloaded', (i) => dialogHinweis('Neue Version der Windows-App ' + i.version + ' geladen – sie gilt nach dem nächsten Neustart der App.'));
    UPD.on('error', (x) => console.error('Update:', x && x.message));
  }
  UPD.checkForUpdates().then((r) => { if (vonHand && (!r || !r.updateInfo || r.updateInfo.version === app.getVersion())) dialogHinweis('Die Windows-App ist auf dem neuesten Stand.'); }).catch((x) => { if (vonHand) dialogHinweis('Update-Suche fehlgeschlagen: ' + (x && x.message)); });
}
function dialogHinweis(text) {   // kein Systemdialog: Hinweis als Meldung der Plattform (toast aus bp.js)
  if (HAUPT) HAUPT.webContents.executeJavaScript(`window.toast ? toast(${JSON.stringify(text)}) : 0`).catch(() => {});
}

/* ---------- Start ---------- */
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (HAUPT) { if (HAUPT.isMinimized()) HAUPT.restore(); HAUPT.focus(); } });
  app.setAppUserModelId(APP_ID);   // Windows-Benachrichtigungen der Plattform tragen Name und Symbol der App
  app.whenReady().then(() => {
    E = lesen();
    menue();
    if (adresse()) hauptfenster(); else einstellungen(true);
    updates(false);
    setInterval(() => updates(false), 6 * 3600 * 1000);
  });
  app.on('window-all-closed', () => app.quit());
}

module.exports = { _test: { intern, adresse, lesen, setze: (e) => { E = e; } } };   // für tools/tests/js/windows.test.mjs
