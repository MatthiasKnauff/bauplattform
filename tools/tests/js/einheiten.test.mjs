// Einheiten im Bauzeitenplan (gantt/public/assist.js setUnits/umgliedern, 19.11.2026): wechselt die Zahl der Einheiten zwischen 1 und
// mehreren, gliedert der Plan die vorhandenen Leistungen um – bei einer Einheit keine Gruppe „Wohnung 1“ und kein „Gebäude / Allgemein“.
// Aufruf:  node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const HIER = path.dirname(fileURLToPath(import.meta.url));
const HEAD = path.resolve(HIER, '../../../shared/bpcore/head'), PUB = path.resolve(HIER, '../../../gantt/public');
const platz = () => { const f = function () {}; return new Proxy(f, { get(_t, k) { if (k === Symbol.toPrimitive) return () => 0; if (k === Symbol.iterator) return function* () {}; if (k === 'then') return undefined; if (k === 'length') return 0; return platz(); }, apply: () => platz(), construct: () => platz(), set: () => true, has: () => true }); };
const ctx = { document: platz(), localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { hash: '', pathname: '/', search: '', href: 'http://localhost/' }, history: { replaceState() {}, pushState() {} }, navigator: { userAgent: 'node', clipboard: platz() },
  fetch: () => new Promise(() => {}), addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), getComputedStyle: () => platz(),
  innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, Event: class {}, CustomEvent: class {}, KeyboardEvent: class {}, MouseEvent: class {},
  ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver: class { observe() {} disconnect() {} }, BroadcastChannel: class { postMessage() {} close() {} },
  console: { log() {}, info() {}, warn() {}, error() {}, debug() {} } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
const lade = (p) => { try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: path.basename(p) }); } catch { /* Oberflächenteil */ } };
lade(path.join(HEAD, 'bp.js')); for (const f of ['theme.js', 'platform.js']) lade(path.join(PUB, f));
lade(path.join(HEAD, 'plankatalog.js')); lade(path.join(HEAD, 'plankern.js')); lade(path.join(PUB, 'print.js'));
for (const f of ['gantt-kern.js', 'gantt-diagramm.js', 'gantt-befehle.js', 'gantt-ereignisse.js', 'gantt-kopieren.js', 'gantt-start.js', 'tablex.js', 'assist.js', 'ablauf.js']) lade(path.join(PUB, f));
test('Einheiten: 2 → 1 → 2 gliedert um wie ein frisch erzeugter Plan', () => {
const out = vm.runInContext(`(() => {
  window.render = () => {}; window.queueSave = () => {};
  const A = window.AssistCore, mk = (u) => { const c = A.defaults('neubau_efh'); c.units = u; c.start = 0; return c; };
  const neu = (u) => { const c = mk(u), b = A.build(c, A.recFor(c)); return { c, b }; };
  const sicht = () => { const U = new Set(P.tasks.map((t) => t.uid)); const C = schedule();
    return { top: P.tasks.filter((t) => t.lvl === 0).map((t) => t.name), leist: P.tasks.filter((t) => t.cat && t.cat[0] !== '_').map((t) => t.cat + '|' + t.blk + '|' + t.lvl).sort(),
      unit: P.tasks.filter((t) => t.cat === '_unit' || t.cat === '_bau').length, tote: P.tasks.reduce((n, t) => n + t.preds.filter((p) => !U.has(p.uid)).length, 0), cyc: C.cyc, end: fmtD(C.peDay) }; };
  const ref = (u) => { const { c, b } = neu(u); P = { name: 'R', start: 0, tasks: b.tasks, nextUid: b.nextUid, assist: c, cal: null, trades: {} }; return sicht(); };
  const r = { ref1: ref(1), ref2: ref(2) };
  const { c, b } = neu(2); P = { name: 'T', start: 0, tasks: b.tasks, nextUid: b.nextUid, assist: c, cal: null, trades: {} };
  const t = P.tasks.find((x) => x.cat && x.cat[0] !== '_' && x.blk === 0); t.dur += 3; t.notes = 'von Hand'; const uid = t.uid;
  r.zu1 = A.setUnits(1); r.eins = sicht(); const t1 = P.tasks.find((x) => x.uid === uid); r.behalten = !!t1 && t1.notes === 'von Hand';
  r.zu2 = A.setUnits(2); r.zwei = sicht();
  return JSON.stringify(r); })()`, ctx);
  const r = JSON.parse(out);
  assert.equal(r.ref1.unit, 0, 'frischer Plan mit 1 Einheit hat keine Einheiten-Gruppen');
  assert.ok(r.zu1, '2 → 1 wird ausgeführt');
  assert.equal(r.eins.unit, 0, 'nach 2 → 1 keine Gruppe „Wohnung 1“ / „Gebäude / Allgemein“');
  assert.ok(!r.eins.top.some((n) => /^Wohnung/.test(n)));
  assert.deepEqual(r.eins.leist, r.ref1.leist, 'gleiche Leistungen, Ebenen und Bezug wie frisch erzeugt');
  assert.deepEqual(r.eins.top, r.ref1.top, 'gleiche Gliederung oben wie frisch erzeugt');
  assert.ok(r.behalten, 'Leistung behält uid und eigene Eingaben');
  assert.equal(r.eins.tote, 0); assert.equal(r.eins.cyc, false);
  assert.ok(r.zu2, '1 → 2 wird ausgeführt');
  assert.deepEqual(r.zwei.leist, r.ref2.leist, 'zurück auf 2 Einheiten wie frisch erzeugt');
  assert.deepEqual(r.zwei.top, r.ref2.top);
  assert.equal(r.zwei.tote, 0); assert.equal(r.zwei.cyc, false);
});
