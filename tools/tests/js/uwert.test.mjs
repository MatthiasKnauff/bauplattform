// U-Werte an den Bauteilen (shared/bpcore/head/uwert.js, GO 18.11.2026 UW-A1 B1 C1 D1): gerechnet mit dem Rechenkern des Wärmeschutzes
// (wsphysik.js, wsregeln.js), Farbe nach GModG – Neubau gegen Anlage 1 (Referenzgebäude), Bestand gegen Anlage 7. Aufruf: node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ctx = { console, document: { getElementById: () => null } };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['wsphysik.js', 'wsregeln.js', 'uwert.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/bpcore/head', f), 'utf8'), ctx);
const DB = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/bpcore/ws_baustoffe.json'), 'utf8')).baustoffe;
const bs = (k) => { const e = DB.find((x) => x.k === k); return { id: k, name: e.name, lambda: e.lambda, rho: e.rho, mu: e.mu, c: e.c || 1000 }; };
const B = Object.fromEntries(['ks_1800', 'eps_035', 'putz_kalkgips', 'mw_035', 'holz_nadel', 'gkb'].map((k) => [k, bs(k)]));

test('Außenwand KS 17,5 + EPS 032 16 cm + Gipsputz: U ≈ 0,19, grün gegen Anlage 1 (0,28)', () => {
  const R = ctx.bpUwert.rechne({ neubau: true, baustoffe: B, zeilen: {
    aw: { typ: 'wand', s: [{ n: 'Gipsputz', m: 'putz_kalkgips', d: 1 }, { n: 'KS', m: 'ks_1800', d: 17.5 }, { n: 'EPS', m: 'eps_035', d: 16, lam: 0.032 }], mit: ['wdvs'] },
    wdvs: { typ: 'wand', wie: 'aw' } } });
  assert.ok(Math.abs(R.aw.u - 0.19) < 0.01, String(R.aw.u));
  assert.equal(R.aw.anf.u, 0.28);
  assert.equal(R.wdvs.u, R.aw.u, 'Ergänzung zeigt den Wert der Kern-Zeile');
});

test('Bestand: Anforderung aus Anlage 7 (Außenwand 0,24, Flachdach 0,20, Dachflächenfenster 1,4)', () => {
  const A = ctx.WS_REGELN.anforderung;
  assert.equal(A('wand', false).u, 0.24);
  assert.equal(A('flachdach', false).u, 0.20);
  assert.equal(A('dachfenster', false).u, 1.4);
  assert.equal(A('bodenplatte', true).u, 0.35);
});

test('Schicht ohne Baustoff: gerechnet ohne sie, unvollständig (C1); Fenster: Uw von Hand geht vor (D1)', () => {
  const R = ctx.bpUwert.rechne({ neubau: false, baustoffe: B, zeilen: {
    d: { typ: 'steildach', s: [{ n: 'GK', m: 'gkb', d: 1.25 }, { n: 'ZSD', m: 'mw_035', d: 20, m2: 'holz_nadel', breite: 8, abstand: 75 }, { n: 'CaSi', m: '', d: 5, fehlt: true }] },
    f: { typ: 'fenster', uw: 0.8, uw_pos: 0.95 } } });
  assert.equal(R.d.fehlt.length, 1);
  assert.ok(R.d.u > 0.17 && R.d.u < 0.25, String(R.d.u));
  assert.equal(R.f.u, 0.8);
  assert.equal(R.f.eigen, true);
});
