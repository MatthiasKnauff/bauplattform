// Gefache im Wärmeschutz (Mock „Schichtaufbau neu – mit Gefachen“ SA-10, SA-13, GO 22.11.2026): kreuzweise = unabhängige Gruppen,
// „in Flucht“ = Holz über Holz (eine Teilfläche), R′/R″ ≤ 1,5; Soll fürs Gebäude und 5 Stufen (SA-14, SA-15). Aufruf: node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['wsphysik.js', 'wsregeln.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/bpcore/head', f), 'utf8'), ctx);
const R = ctx.WS_REGELN, P = ctx.WSP;
const M = [{ id: 'mw', name: 'MW', lambda: 0.035, rho: 30, mu: 1 }, { id: 'kvh', name: 'KVH', lambda: 0.13, rho: 500, mu: 40 }, { id: 'gk', name: 'GK', lambda: 0.25, rho: 800, mu: 8 }];
const wand = (gl) => ({ typ: 'wand', schichten: [{ m: 'gk', d: 1.25 }, { m: 'mw', d: 16, m2: 'kvh', breite: 6, abstand: 62.5 }, { m: 'mw', d: 6, m2: 'kvh', breite: 6, abstand: 62.5, ...(gl ? { gl } : {}) }] });
const u = (b) => P.uWert(R.aufbau(b, M));

test('in Flucht: zwei Teilflächen statt vier, U schlechter als „kreuzweise“ (Holz läuft durch)', () => {
  const k = u(wand()), f = u(wand('flucht'));
  assert.equal(k.pfade.length, 4); assert.equal(f.pfade.length, 2);
  assert.equal(f.gruppen.length, 1); assert.deepEqual([...f.gruppen[0].L], [1, 2]);
  assert.ok(f.u > k.u, `${f.u} > ${k.u}`);
  // Probe von Hand: obere Grenze mit Teilflächen Dämmung (90,4 %) und Holz (9,6 %)
  const rs = 0.13 + 0.04, rg = 0.0125 / 0.25, f2 = 6 / 62.5;
  const rD = rs + rg + 0.22 / 0.035, rH = rs + rg + 0.22 / 0.13, ro = 1 / ((1 - f2) / rD + f2 / rH);
  assert.ok(Math.abs(f.rOben - ro) < 1e-9);
});
test('in Flucht übernimmt Breite und Abstand vom Gefach davor', () => {
  const b = wand('flucht'); b.schichten[2].breite = 20; b.schichten[2].abstand = 30;
  assert.equal(u(b).u, u(wand('flucht')).u);
});
test('R′/R″ > 1,5 wird gemeldet', () => {
  const st = { m: 'mw', d: 10, m2: 'stahl', breite: 30, abstand: 60 };   // Stahl kreuzweise in zwei Lagen: R′ weit über R″
  const b = { typ: 'wand', schichten: [{ ...st }, { ...st }] };
  const M2 = [...M, { id: 'stahl', name: 'Stahl', lambda: 50 }];
  const x = P.uWert(R.aufbau(b, M2));
  assert.ok(x.verhaeltnis > 1.5 && x.zulaessig === false);
});
test('Soll fürs Gebäude: BEG, Referenz, Anlage 7 und 5 Stufen', () => {
  assert.equal(R.sollUmax({ typ: 'wand' }, 'beg', '19'), 0.20);
  assert.equal(R.sollUmax({ typ: 'steildach' }, 'beg', '19'), 0.14);
  assert.equal(R.sollUmax({ typ: 'wand', massnahme: '1b' }, 'gm7', '19'), 0.24);
  assert.equal(R.sollUmax({ typ: 'wand' }, 'ref', '19'), 0.28);
  assert.equal(R.sollUmax({ typ: 'fenster' }, 'ph', '19'), 0.80);
  assert.deepEqual([0.18, 0.24, 0.26, 0.3, 0.5].map((x) => R.stufe(x, 0.24).s), [0, 1, 2, 3, 4]);
  for (const S of R.SOLL) assert.ok(S.quelle && S.stand, S.k + ': Quelle und Stand');
});
