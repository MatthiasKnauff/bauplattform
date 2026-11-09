// Ordnungsprüfung Seiten: Jede Seite verweist nur auf Dateien, die es gibt.
//
// Aufruf:  node --test tools/tests/js/
// Geprüft werden alle <script src> und <link href> der Seiten (Plattform, Bauzeitenplan, Bautagebuch) und jeder
// 'bp/….js|css'-Verweis im Programmcode der Oberflächen. Gemeinsame Bausteine (/bp/<name>) müssen in
// shared/bpcore/head liegen UND in head.py freigegeben sein – sonst lädt die Seite im Betrieb nicht (404),
// ohne dass ein Rechen- oder Ablauftest es merkt (die prüfen nur die Schnittstellen, nicht die Seiten).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const BP = path.join(ROOT, 'shared/bpcore/head');
const gibt = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
const lies = (p) => fs.readFileSync(p, 'utf8');

// Freigabeliste der Route /bp/<name> (shared/bpcore/head.py, Funktion asset)
function freigegeben() {
  const m = lies(path.join(ROOT, 'shared/bpcore/head.py')).match(/if name not in \(("head\.js"[^)]*)\)/);
  assert.ok(m, 'Freigabeliste für /bp/<name> in shared/bpcore/head.py nicht gefunden');
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
}
const BUENDEL = new Set(['baukasten.js']);   // wird vom Server aus den Bausteinen zusammengesetzt (head.py, BAUKASTEN)

// Ordner mit Seiten: wohin zeigen „static/…“ (Plattform) bzw. Verweise ohne Ordner (Bauzeitenplan, Bautagebuch)?
const ORTE = [
  { dir: 'plattform/static', statisch: 'plattform/static', relativ: null },
  { dir: 'gantt/public', statisch: null, relativ: 'gantt/public' },
  { dir: 'bautagebuch/static', statisch: null, relativ: 'bautagebuch/static' },
];
const dateien = (dir, endung) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(endung)).map((f) => path.join(dir, f));

test('Seiten verweisen nur auf vorhandene Skripte und Stilblätter', () => {
  const frei = freigegeben(), fehler = [];
  for (const ort of ORTE) {
    for (const seite of dateien(ort.dir, '.html')) {
      const s = lies(path.join(ROOT, seite));
      const verweise = [...s.matchAll(/<script[^>]*\ssrc="([^"]+)"/g), ...s.matchAll(/<link[^>]*\shref="([^"]+)"/g)].map((m) => m[1]);
      for (const v of verweise) {
        if (v.startsWith('bp/')) {
          const n = v.slice(3);
          if (BUENDEL.has(n)) continue;
          if (!frei.has(n)) fehler.push(`${seite}: „${v}“ ist in head.py nicht freigegeben`);
          else if (!gibt(path.join(BP, n))) fehler.push(`${seite}: „${v}“ fehlt in shared/bpcore/head`);
        } else if (v.startsWith('static/')) {
          if (!ort.statisch || !gibt(path.join(ROOT, ort.statisch, v.slice(7)))) fehler.push(`${seite}: „${v}“ gibt es nicht`);
        } else if (ort.relativ && /^[\w.-]+\.(js|css)$/.test(v)) {
          if (!gibt(path.join(ROOT, ort.relativ, v))) fehler.push(`${seite}: „${v}“ gibt es nicht`);
        }   // alles andere (logo.png, api/…, data:, manifest) liefert der Server zur Laufzeit
      }
    }
  }
  assert.deepEqual(fehler, [], '\n' + fehler.join('\n'));
});

test('Jeder bp/-Verweis im Programmcode ist freigegeben und vorhanden; die Freigabeliste nennt nur vorhandene Dateien', () => {
  const frei = freigegeben(), fehler = [];
  const quellen = [...ORTE.flatMap((o) => [...dateien(o.dir, '.html'), ...dateien(o.dir, '.js')]), ...dateien('shared/bpcore/head', '.js')];
  for (const q of quellen) {
    for (const m of lies(path.join(ROOT, q)).matchAll(/["'`]bp\/([\w.-]+\.(?:js|css))["'`]/g)) {
      if (BUENDEL.has(m[1])) continue;
      if (!frei.has(m[1])) fehler.push(`${q}: „bp/${m[1]}“ ist in head.py nicht freigegeben`);
      else if (!gibt(path.join(BP, m[1]))) fehler.push(`${q}: „bp/${m[1]}“ fehlt in shared/bpcore/head`);
    }
  }
  for (const n of frei) if (!gibt(path.join(BP, n))) fehler.push(`head.py gibt „${n}“ frei, die Datei fehlt in shared/bpcore/head`);
  assert.deepEqual(fehler, [], '\n' + fehler.join('\n'));
});
