// Planungs-Kern (shared/bpcore/head/plankern.js + plankatalog.js): die Fragen des Planungsassistenten ohne Terminplan.
// Geprüft wird, dass der Kern ALLEIN läuft (ohne eine Datei des Bauzeitenplans) – so benutzt ihn der Assistent in allen Apps –
// und dass der Bauzeitenplan mit ihm weiter für jeden Gebäudetyp einen Plan baut.
//
// Aufruf:  node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const HEAD = path.resolve(HIER, '../../../shared/bpcore/head'), PUB = path.resolve(HIER, '../../../gantt/public');

function nurKern() {
  const ctx = { console: { log() {}, warn() {}, error() {} } };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of ['plankatalog.js', 'plankern.js']) vm.runInContext(fs.readFileSync(path.join(HEAD, f), 'utf8'), ctx, { filename: f });
  return ctx;
}

test('Kern läuft allein: Katalog, Leistungen, Auswahlgruppen je Gebäudetyp', () => {
  const ctx = nurKern(), K = ctx.PlanKern, C = ctx.CATALOG;
  assert.ok(K && C, 'window.PlanKern und window.CATALOG erwartet');
  for (const n of ['itemsOf', 'levelsOf', 'recFor', 'choiceOf', 'chOpts', 'live', 'dur', 'unitNames', 'defName', 'normSel', 'ctx'])
    assert.equal(typeof K[n], 'function', `PlanKern.${n} fehlt`);
  assert.ok(C.profiles.length >= 5, 'Gebäudetypen im Katalog');
  for (const p of C.profiles.filter((x) => x.k !== 'frei')) {
    const cfg = { type: p.k, units: 1, floors: 2, area: 140 };
    const alle = K.itemsOf(cfg), empf = K.recFor(cfg);
    assert.ok(alle.length > 0, `${p.k}: Leistungen`);
    assert.ok(empf.length > 0 && empf.every((id) => alle.some((i) => i.id === id)), `${p.k}: empfohlene Leistungen stammen aus dem Katalog`);
    for (const g of K.CHS.filter((x) => K.live(x, cfg))) {
      const wahl = K.choiceOf(cfg, g.k);
      assert.ok(K.chOpts(g, cfg).some((o) => o.k === wahl), `${p.k}: gewählte Möglichkeit „${wahl}“ der Gruppe ${g.k} ist erlaubt`);
    }
    for (const id of empf.slice(0, 5)) assert.ok(K.dur(id, cfg) >= 0, `${p.k}: Dauer ${id}`);
    assert.ok(K.defName(cfg), `${p.k}: Name`);
  }
  assert.equal(K.unitNames({ type: 'neubau_mfh', units: 3 }).length, 3, 'Namen der Einheiten');
  K.ctx({ type: 'neubau_efh', units: 1 });
  assert.ok(Object.keys(K.CTX.map).length > 0, 'PlanKern.CTX zeigt den gesetzten Kontext');
});

test('Bauzeitenplan baut mit dem Kern für jeden Gebäudetyp einen Plan', () => {
  const platz = () => { const f = function () {}; return new Proxy(f, { get(_t, k) { if (k === Symbol.toPrimitive) return () => 0; if (k === Symbol.iterator) return function* () {}; if (k === 'then') return undefined; if (k === 'length') return 0; return platz(); }, apply: () => platz(), construct: () => platz(), set: () => true, has: () => true }); };
  const ctx = { document: platz(), localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { hash: '', pathname: '/', search: '', href: 'http://localhost/' }, history: { replaceState() {}, pushState() {} }, navigator: { userAgent: 'node', clipboard: platz() },
    fetch: () => new Promise(() => {}), addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), getComputedStyle: () => platz(),
    innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, Event: class {}, CustomEvent: class {}, KeyboardEvent: class {}, MouseEvent: class {},
    ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver: class { observe() {} disconnect() {} }, BroadcastChannel: class { postMessage() {} close() {} },
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} } };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; ctx.parent = ctx; ctx.top = ctx; vm.createContext(ctx);
  const lade = (p) => { try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: path.basename(p) }); } catch { /* Oberflächenteil */ } };
  // Reihenfolge wie in gantt/public/index.html
  lade(path.join(HEAD, 'bp.js'));
  for (const f of ['theme.js', 'platform.js']) lade(path.join(PUB, f));
  lade(path.join(HEAD, 'plankatalog.js')); lade(path.join(HEAD, 'plankern.js')); lade(path.join(PUB, 'print.js'));
  for (const f of ['gantt-kern.js', 'gantt-diagramm.js', 'gantt-befehle.js', 'gantt-ereignisse.js', 'gantt-start.js', 'tablex.js', 'assist.js']) lade(path.join(PUB, f));
  const R = vm.runInContext(`(() => { const A = window.AssistCore; if (!A) return null; const R = {};
    for (const p of window.CATALOG.profiles) { const cfg = A.defaults(p.k), sel = A.recFor(cfg), plan = A.build(cfg, sel);
      R[p.k] = { n: plan.tasks.length, sel: sel.length, namen: plan.tasks.every((t) => typeof t.name === 'string' && t.name), gruppen: A.choiceGroups(cfg).length }; }
    return R; })()`, ctx);
  assert.ok(R, 'AssistCore aus gantt/public/assist.js nicht ladbar');
  for (const [k, r] of Object.entries(R)) {
    assert.ok(r.n >= 2 && r.namen, `${k}: Plan mit benannten Vorgängen (${r.n})`);
    if (k !== 'frei') assert.ok(r.sel > 0 && r.n > r.sel, `${k}: Vorgänge für die gewählten Leistungen plus Gruppen und Meilensteine (${r.n} / ${r.sel})`);
  }
  assert.ok(R.neubau_mfh.n > R.neubau_efh.n, 'Mehrfamilienhaus hat mehr Vorgänge als Einfamilienhaus');
});
