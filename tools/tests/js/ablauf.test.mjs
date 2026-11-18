// Seite „Ablauf“ und Bauzeitenplan je Gebäudeteil (gantt/public/ablauf.js, assist.js buildTeile, 18.11.2026):
// Pfeile zwischen Teilen werden Vorgänger im Plan; gruppieren nach Bauphase und zurück behält alle Leistungen, Termine und Pfeile.
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
test('Ablauf der Gebäudeteile: Pfeile und Gruppieren', () => {
const out = vm.runInContext(`(() => {
  window.render = () => {}; window.queueSave = () => {};
  const A = window.AssistCore, c = A.defaults('k:ef:an.au.um:'); c.area = 160; c.floors = 2; c.start = 0;
  const b = A.build(c, A.recFor(c)); P = { name: 'T', start: 0, tasks: b.tasks, nextUid: b.nextUid, assist: c, cal: null, trades: {} };
  const chk = () => { const U = new Set(P.tasks.map((t) => t.uid)); const C = schedule(); return { n: P.tasks.length, leaves: P.tasks.filter((t, i) => !C.summ[i]).length, tote: P.tasks.reduce((n, t) => n + t.preds.filter((p) => !U.has(p.uid)).length, 0), cyc: C.cyc, end: fmtD(C.peDay) }; };
  const r = { start: chk() };
  P.ablauf = { links: [{ von: 'bestand', nach: 'aufstock', type: 'FS', lag: 0 }] };
  act(() => ablaufNachfuehren()); r.mitPfeil = chk();
  r.kistePreds = P.tasks.filter((t) => t.preds.some((p) => p.kiste)).map((t) => t.name);
  ablaufGruppieren('phase'); r.phase = chk(); r.phaseTop = P.tasks.filter((t) => t.lvl === 0).map((t) => t.name).slice(0, 12); r.kistePh = P.tasks.filter((t) => t.preds.some((p) => p.kiste)).length;
  ablaufGruppieren('teil'); r.teil = chk(); r.teilTop = P.tasks.filter((t) => t.lvl === 0).map((t) => t.name);
  return JSON.stringify(r); })()`, ctx);
  const r = JSON.parse(out);
  for (const k of ['start', 'mitPfeil', 'phase', 'teil']) { assert.equal(r[k].tote, 0, k + ': keine toten Verweise'); assert.equal(r[k].cyc, false); assert.equal(r[k].leaves, r.start.leaves, k + ': alle Leistungen da'); }
  assert.notEqual(r.mitPfeil.end, r.start.end, 'Pfeil Bestand → Aufstockung verschiebt das Ende');
  assert.deepEqual(r.kistePreds, ['Aufstockung']);
  assert.equal(r.phase.end, r.mitPfeil.end, 'nach Bauphase: gleiches Ende'); assert.equal(r.teil.end, r.mitPfeil.end);
  assert.ok(r.kistePh > 1, 'nach Bauphase hängt der Pfeil an jeder Aufstockung-Gruppe');
  assert.ok(r.phaseTop.includes('Rohbau') && !r.phaseTop.includes('Bestand'));
  assert.deepEqual(r.teilTop.filter((x) => ['Bestand', 'Anbau', 'Aufstockung'].includes(x)), ['Bestand', 'Anbau', 'Aufstockung']);
});
