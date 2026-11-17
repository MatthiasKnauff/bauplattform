// Windows-App (windows/main.js, 17.11.2026): was in der App bleibt und was der Standardbrowser öffnet, Einstellungen lesen.
// Electron gibt es in der Pipeline nicht – das Modul wird hier nachgebildet; geprüft wird die Logik der Hülle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bpwin-'));
const nichts = () => {};
const electron = {
  app: { getPath: () => tmp, requestSingleInstanceLock: () => false, quit: nichts, on: nichts, setAppUserModelId: nichts, whenReady: () => new Promise(nichts), getVersion: () => '0.0.0', isPackaged: false },
  BrowserWindow: class {}, Menu: { setApplicationMenu: nichts, buildFromTemplate: () => ({}) }, shell: { openExternal: nichts },
  ipcMain: { handle: nichts, on: nichts },
};
const laden0 = Module._load;
Module._load = function (req, ...rest) { return req === 'electron' ? electron : laden0.call(this, req, ...rest); };
const { _test: W } = Module.createRequire(import.meta.url)(path.join(REPO, 'windows/main.js'));
Module._load = laden0;

test('Einstellungen: ohne Datei die Vorgaben (Produktion, Adresse des Büros)', () => {
  const e = W.lesen();
  assert.equal(e.server, 'produktion');
  assert.equal(e.adressen.produktion, 'https://bauportal.gk3-architektur.de');
  assert.equal(e.adressen.test, '');
});

test('Einstellungen: gespeicherte Werte ergänzen die Vorgaben', () => {
  fs.writeFileSync(path.join(tmp, 'einstellungen.json'), JSON.stringify({ server: 'test', adressen: { test: 'http://192.168.1.20:8090' } }));
  const e = W.lesen();
  assert.equal(e.server, 'test');
  assert.equal(e.adressen.test, 'http://192.168.1.20:8090');
  assert.equal(e.adressen.produktion, 'https://bauportal.gk3-architektur.de', 'Produktion bleibt aus den Vorgaben');
  fs.writeFileSync(path.join(tmp, 'einstellungen.json'), '{kaputt');
  assert.equal(W.lesen().server, 'produktion', 'kaputte Datei → Vorgaben');
});

test('Produktion: Seiten der Plattform und der Büro-Domain bleiben in der App, fremde Seiten nicht', () => {
  W.setze({ server: 'produktion', adressen: { produktion: 'https://bauportal.gk3-architektur.de/', test: '' } });
  assert.equal(W.adresse(), 'https://bauportal.gk3-architektur.de', 'Schrägstrich am Ende weg');
  assert.ok(W.intern('https://bauportal.gk3-architektur.de/ava/'));
  assert.ok(W.intern('https://bautagebuch.gk3-architektur.de/'), 'Unteradresse der Büro-Domain');
  assert.ok(!W.intern('https://www.juris.de/'));
  assert.ok(!W.intern('https://gk3-architektur.de.example.com/'), 'nur echte Unteradressen');
  assert.ok(!W.intern('kein-url'));
});

test('Testserver per IP: nur genau diese Adresse bleibt in der App', () => {
  W.setze({ server: 'test', adressen: { produktion: 'https://bauportal.gk3-architektur.de', test: 'http://192.168.1.20:8090' } });
  assert.ok(W.intern('http://192.168.1.20:8090/gantt/'));
  assert.ok(!W.intern('http://192.168.1.21:8090/'), 'anderer Rechner im Netz');
  assert.ok(!W.intern('http://192.168.1.20:9000/'), 'anderer Dienst auf demselben Rechner');
  assert.ok(!W.intern('https://bauportal.gk3-architektur.de/'), 'Produktion öffnet nicht im Testfenster');
});

test('ohne gültige Adresse: kein Laden (die App fragt nach)', () => {
  W.setze({ server: 'test', adressen: { produktion: 'https://bauportal.gk3-architektur.de', test: '' } });
  assert.equal(W.adresse(), '');
  W.setze({ server: 'produktion', adressen: { produktion: 'bauportal.gk3-architektur.de', test: '' } });
  assert.equal(W.adresse(), '', 'ohne http(s):// nicht laden');
});

test('Paket: alle Dateien der Hülle sind im Setup, Symbol kommt aus dem Logo des Kerns', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'windows/package.json'), 'utf8'));
  for (const f of pkg.build.files) if (f !== 'build/icon.png') assert.ok(fs.existsSync(path.join(REPO, 'windows', f)), f + ' fehlt');
  assert.equal(pkg.build.win.icon, 'build/icon.png', 'Symbol entsteht beim Bauen (symbol.js) – Bilder gehören nicht ins Repo');
  const svg = Module.createRequire(import.meta.url)(path.join(REPO, 'windows/symbol.js')).svgAusKern();
  assert.match(svg, /^<svg [^>]*viewBox="0 0 512 512".*<\/svg>$/s, 'APP_SVG aus head.py lesbar');
  const main = fs.readFileSync(path.join(REPO, 'windows/main.js'), 'utf8');
  for (const m of main.matchAll(/path\.join\(__dirname, '([^']+)'(?:, '([^']+)')?\)/g)) {
    const f = m[2] ? m[1] + '/' + m[2] : m[1];
    assert.ok(pkg.build.files.includes(f), `${f} wird in main.js benutzt, steht aber nicht in build.files`);
  }
});
