// Baukosten: Kennwert und Bauteile gewichten – die Rechnung im Browser (plattform/static/baukosten-kern.js: mixGewichte, btGeschaetzt)
// muss dieselbe sein wie auf dem Server (plattform/baukosten_mix.py; dort dieselben Fälle in tools/tests/einheit/plattform_baukosten.py).
//
// Aufruf:  node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(HIER, '../../../plattform/static/baukosten-kern.js'), 'utf8');
const a = src.indexOf('const MIX_ALT'), b = src.indexOf('function calc(d)');
assert.ok(a > 0 && b > a, 'mixGewichte steht vor calc() in baukosten-kern.js');
const ctx = vm.createContext({});
vm.runInContext(src.slice(a, b) + '\nthis.M = { MIX_ALT, btGeschaetzt, mixGewichte };', ctx);
const { MIX_ALT, btGeschaetzt, mixGewichte } = ctx.M;
const rund = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)));

test('Automatik: bekannt zählt voll, geschätzt halb; über alles nach Kennwert gewichtet', () => {
  const G = { 330: { kw: 100, bek: 0, ges: 50 }, 350: { kw: 100, bek: 80, ges: 0 } };
  const [W, w0] = mixGewichte(G, { haupt: null, kg: {} });
  assert.deepEqual(rund([W[330], W[350], w0]), [{ w: 0.5, auto: 0.5, hand: false }, { w: 1, auto: 1, hand: false }, 0.75]);
  const [X] = mixGewichte({ 330: { kw: 35000, bek: 20000, ges: 10000 } }, { haupt: null, kg: {} });
  assert.equal(Math.round(X[330].w * 1000) / 10, 83.3);
});

test('Hauptschieber verschiebt alle gemeinsam, von Hand gestellte Gruppen bleiben', () => {
  const G = { 330: { kw: 100, bek: 0, ges: 50 }, 350: { kw: 100, bek: 80, ges: 0 } };
  assert.deepEqual(rund(Object.values(mixGewichte(G, { haupt: 37.5, kg: {} })[0]).map((x) => x.w)), [0.25, 0.5]);
  assert.deepEqual(rund(Object.values(mixGewichte(G, { haupt: 87.5, kg: {} })[0]).map((x) => x.w)), [0.75, 1]);
  assert.deepEqual(rund(Object.values(mixGewichte(G, { haupt: 0, kg: {} })[0]).map((x) => x.w)), [0, 0]);
  assert.deepEqual(rund(Object.values(mixGewichte(G, MIX_ALT)[0]).map((x) => x.w)), [1, 1], 'alte Kostenermittlungen: Bauteile ersetzen den Kennwert ganz');
  assert.deepEqual(rund(mixGewichte(G, { haupt: 0, kg: { 330: 50 } })[0][330]), { w: 0.5, auto: 0.5, hand: true });
});

test('ohne Kennwert-Anteil gelten die Bauteile; geschätzt = Vorschlag, Modell, KI', () => {
  assert.deepEqual(rund(mixGewichte({ 330: { kw: 0, bek: 0, ges: 40 } }, { haupt: 0, kg: { 330: 10 } })[0][330]), { w: 1, auto: 1, hand: false });
  assert.deepEqual([{ src: 'KI · Claude' }, { src: 'Modell' }, { src: 'Vorschlag' }, { src: 'IFC' }, { src: 'von Hand' }, {}].map(btGeschaetzt), [true, true, true, false, false, false]);
});
