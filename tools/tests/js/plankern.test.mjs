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
  for (const f of ['gantt-kern.js', 'gantt-diagramm.js', 'gantt-befehle.js', 'gantt-ereignisse.js', 'gantt-kopieren.js', 'gantt-start.js', 'tablex.js', 'assist.js']) lade(path.join(PUB, f));
  const R = vm.runInContext(`(() => { const A = window.AssistCore; if (!A) return null; const R = {};
    const KB = window.CATALOG.kombi, kombi = [];   // Bauart in Ebenen: jedes Gebäude mit jeder Maßnahme, dazu Kombinationen mit Bereichen und Denkmal
    for (const g of KB.geb) { for (const m of KB.mass) kombi.push(window.PlanKern.kombiKey({ geb: g.k, mass: [m.k] }));
      kombi.push(window.PlanKern.kombiKey({ geb: g.k, mass: ['an', 'au', 'um', 'es'], ber: ['da', 'fa', 'tg'], dm: true }), window.PlanKern.kombiKey({ geb: g.k, mass: ['nb', 'ab'] }), window.PlanKern.kombiKey({ geb: g.k, mass: ['ks'], ber: ['ba', 'bf'] })); }
    for (const k of [...window.CATALOG.profiles.map((p) => p.k), ...kombi]) { const p = { k }; const cfg = A.defaults(p.k), sel = A.recFor(cfg), plan = A.build(cfg, sel);
      R[p.k] = { n: plan.tasks.length, sel: sel.length, namen: plan.tasks.every((t) => typeof t.name === 'string' && t.name), gruppen: A.choiceGroups(cfg).length }; }
    return R; })()`, ctx);
  assert.ok(R, 'AssistCore aus gantt/public/assist.js nicht ladbar');
  for (const [k, r] of Object.entries(R)) {
    assert.ok(r.n >= 2 && r.namen, `${k}: Plan mit benannten Vorgängen (${r.n})`);
    if (k !== 'frei') assert.ok(r.sel > 0 && r.n > r.sel, `${k}: Vorgänge für die gewählten Leistungen plus Gruppen und Meilensteine (${r.n} / ${r.sel})`);
  }
  assert.ok(R.neubau_mfh.n > R.neubau_efh.n, 'Mehrfamilienhaus hat mehr Vorgänge als Einfamilienhaus');
});

test('Katalog stimmt in sich: eindeutige Schlüssel, bekannte Vorgänger und Gewerke, Angebote je Bauart', () => {
  const C = nurKern().CATALOG, ids = new Set(), phasen = new Set(C.phases.map((p) => p.k));
  for (const it of C.items) {
    assert.ok(!ids.has(it.id), `Schlüssel ${it.id} doppelt`); ids.add(it.id);
    assert.ok(phasen.has(it.ph), `${it.id}: Phase ${it.ph}`);
    assert.ok(it.gw && it.n, `${it.id}: Name und Gewerk`);
    assert.ok(it.ms || it.d > 0, `${it.id}: Dauer oder Meilenstein`);
  }
  for (const it of C.items) for (const a of it.a || []) assert.ok(a === 'start' || ids.has(a), `${it.id}: Vorgänger ${a} unbekannt`);
  for (const p of C.profiles) for (const id of [...(p.rec || []), ...(Array.isArray(p.opt) ? p.opt : [])]) assert.ok(ids.has(id), `${p.k}: ${id} nicht im Katalog`);
  assert.ok(C.items.length >= 220, 'erweiterter Katalog (über 220 Leistungen)');
  const angeboten = new Set(C.profiles.flatMap((p) => [...(p.rec || []), ...(Array.isArray(p.opt) ? p.opt : [])]));
  for (const id of ['baugrund', 'kampfm', 'wu', 'flachdach', 'hydr', 'rwm', 'pflege', 'schluessel']) assert.ok(angeboten.has(id), `${id} wird angeboten`);
  const mfh = C.profiles.find((p) => p.k === 'neubau_mfh');
  assert.ok(mfh.opt.includes('aufzug_abn') && !mfh.rec.includes('aufzug_abn'), 'neue Leistungen nur optional, nicht vorausgewählt');
});

test('Dauer über Mengen: großes Haus mit Kolonnen, Bestand mit Zuschlag, Rechenweg', () => {
  const K = nurKern().PlanKern;
  const efh = { type: 'neubau_efh', area: 140, floors: 1, units: 1, dg: 'aus' }, mfh = { type: 'neubau_mfh', area: 1200, floors: 4, units: 14, dg: 'kalt' };
  const w1 = K.dur('wdvs', efh), w2 = K.dur('wdvs', mfh);
  assert.ok(w1 >= 6 && w1 <= 14, `WDVS EFH ${w1}`);
  assert.ok(w2 > w1 && w2 < 40, `WDVS MFH ${w2}: länger, aber mit mehr Kolonnen`);
  assert.match(K.durWeg('wdvs', mfh), /m² Fassade ÷ 20 m²\/Tag ÷ [\d,]+ Kolonnen/);
  const san = { type: 'kern_efh', area: 140, floors: 2, units: 1, dg: 'kalt' };
  assert.match(K.durWeg('putz', san), /\+ 25 % Bestand/);
  assert.ok(K.dur('san_roh', { ...mfh }) <= 5, 'je Einheit gerechnet');
  assert.equal(K.durWeg('wdvs', { ...efh, dur: { wdvs: 7 } }), 'von Hand gesetzt');
  assert.equal(K.durWeg('baugen', efh), '');
});

test('Umbau mit Anbau: Neubau-Anteil rechnet mit der Fläche der Erweiterung, ohne Bestandszuschlag', () => {
  const K = nurKern().PlanKern;
  const c = { type: 'umbau_efh', area: 170, floors: 2, units: 1, dg: 'kalt', choice: { erweiterung: 'anbau' } };
  assert.equal(K.erwFlaeche(c), 51, 'Anbau geschätzt 30 %');
  assert.match(K.durWeg('mauer', c), /^Erweiterung: /);
  assert.doesNotMatch(K.durWeg('mauer', c), /Bestand/);
  assert.match(K.durWeg('putz', c), /\+ 25 % Bestand/);
  assert.ok(K.dur('mauer', { ...c, erwArea: 120 }) > K.dur('mauer', c), 'größerer Anbau dauert länger');
  assert.equal(K.erwFlaeche({ type: 'neubau_efh', area: 140 }), 0);
});

test('Standard je Bauart: neue Leistungen vorausgewählt, wo sie praktisch immer anfallen', () => {
  const ctx = nurKern(), K = ctx.PlanKern, C = ctx.CATALOG, p = (k) => C.profiles.find((x) => x.k === k);
  assert.ok(p('neubau_efh').rec.includes('rwm') && !p('neubau_efh').opt.includes('rwm'), 'Rauchwarnmelder Standard im Neubau');
  assert.ok(p('neubau_mfh').rec.includes('spiel'), 'Spielplatz Standard im MFH');
  assert.ok(p('bad').rec.includes('vorwand') && !p('bad').rec.includes('bauantr'), 'Bad ohne Bauantrag');
  assert.ok(p('neubau_efh').opt.includes('kampfm'), 'Kampfmittel bleibt optional');
  const efh = { type: 'neubau_efh', area: 140, units: 1, floors: 1 };
  assert.ok(K.recFor(efh).includes('rwm'), 'recFor liefert die neuen Standards');
});

test('Bauart in Ebenen: Gebäude × Maßnahmen × Bereiche + Denkmal', () => {
  const ctx = nurKern(), K = ctx.PlanKern, C = ctx.CATALOG, P = (k) => K.PROF[k];
  assert.equal(K.kombiKey({ geb: 'mf', mass: ['es', 'an', 'nb'], ber: ['fa', 'da'] }), 'k:mf:nb:da.fa', 'Neubau schließt Bestandsmaßnahmen aus, Reihenfolge wie im Katalog');
  assert.equal(K.kombiKey({ geb: 'ef', mass: ['ab', 'nb'] }), 'k:ef:nb.ab:', 'Abbruch darf zum Neubau');
  const an = P('k:ef:an.au.es:');
  assert.equal(an.fest.erweiterung, 'beides', 'Anbau + Aufstockung = beides');
  assert.match(an.n, /Anbau.*Aufstockung.*Energetische/);
  assert.ok(!K.choiceGroups(K.grund('k:ef:an:')).some((g) => g.k === 'erweiterung'), 'Erweiterung wird nicht noch einmal gefragt');
  const ha = P('k:ha:nb:'), haR = K.recFor(K.grund('k:ha:nb:'));
  assert.ok(haR.includes('stahlhalle') && haR.includes('indboden') && !haR.some((x) => /^mauer/.test(x)) && !haR.includes('fliesen'), 'Halle: Hallenbau statt Wohnbau');
  assert.equal(ha.kenn.fl, 'bgf');
  assert.ok(!P('k:ha:es:').rec.includes('stahlhalle'), 'reine Bestandsmaßnahme: Hallentragwerk nur angeboten');
  const bad = K.recFor(K.grund('k:ef:um:ba'));
  assert.ok(bad.includes('vorwand') && bad.includes('fliesen') && !bad.includes('wdvs') && !bad.includes('dach_deck'), 'Bereich Bäder grenzt ein');
  const dm = K.grund('k:mf:ks::d');
  assert.ok(K.recFor(dm).includes('befund') && K.recFor(dm).includes('denkmal_erl'), 'Denkmal: Befund und Erlaubnis');
  assert.match(K.durWeg('putz', dm), /\+ 40 % Bestand/);
  assert.match(K.durWeg('wdvs', K.grund('k:bu:nb:')), /m² Fassade/, 'Nichtwohnbau rechnet über Mengen');
  const sc = K.recFor(K.grund('k:sc:nb:')); assert.ok(sc.includes('spiel') && sc.includes('ela') && sc.includes('akustik'), 'Schule: Spielfläche, Alarmierung, Akustik');
  const pf = K.recFor(K.grund('k:pf:nb:')); assert.ok(pf.includes('ruf') && pf.includes('aufzug'), 'Pflege: Lichtruf, Aufzug');
  assert.ok(!K.recFor(K.grund('k:bu:nb:')).includes('spiel'), 'Büro ohne Spielplatz');
  for (const g of C.kombi.geb) for (const m of C.kombi.mass) {
    const p = P(K.kombiKey({ geb: g.k, mass: [m.k] })); assert.ok(p && p.rec.length > 3, `${g.k}/${m.k}: Standardleistungen`);
    for (const id of [...p.rec, ...p.opt]) assert.ok(C.items.some((i) => i.id === id), `${g.k}/${m.k}: ${id} nicht im Katalog`);
  }
  // Wohnungssanierung: Rückbau, Bad, Oberflächen, Türen als Standard – Grundrissänderung nur angeboten; zusammen mit Umbau wieder Standard
  const ws = P('k:wo:ws:'), wsR = K.recFor(K.grund('k:wo:ws:'));
  assert.equal(ws.n, 'Wohnung · Wohnungssanierung'); assert.equal(ws.area, 80); assert.equal(ws.units, 1);
  for (const id of ['entk', 'el_roh', 'san_roh', 'fliesen', 'maler', 'boden', 'tischler', 'reinig']) assert.ok(wsR.includes(id), `Wohnungssanierung: ${id} fehlt im Standard`);
  for (const id of ['wand_ab', 'durchbr', 'statik']) assert.ok(!ws.rec.includes(id) && ws.opt.includes(id), `Wohnungssanierung: ${id} nur angeboten`);
  assert.ok(P('k:wo:um.ws:').rec.includes('wand_ab'), 'Umbau + Wohnungssanierung: Wände abbrechen ist Standard');
  assert.ok(!P('k:wo:ks:').rec.includes('geruest') && !P('k:wo:es:').rec.includes('wdvs'), 'Wohnung: Gerüst und Fassade gehören zum Haus');
  assert.equal(K.erwFlaeche(K.grund('k:ef:an:')), 42, 'Anbau: 30 % der Wohnfläche');
});

test('Geschossweise aufgeteilt: die Teile ergeben zusammen die Dauer der Leistung', () => {
  const K = nurKern().PlanKern;
  for (const k of ['neubau_mfh', 'k:ef:nb:', 'k:bu:nb:']) {
    const cfg = K.grund(k, 0); K.ctx(cfg);
    const teile = K.itemsOf(cfg).filter((i) => i.vb === 'mauer'), summe = teile.reduce((a, i) => a + K.dur(i.id, cfg), 0);
    const ganz = K.dur('mauer', { ...cfg, flDetail: false });
    assert.ok(teile.length >= 2 && Math.abs(summe - ganz) <= teile.length, `${k}: Teile ${summe} statt ${ganz} Tage`);
  }
});

test('Bauzeit-Faktor: im Kopf für alles, je Leistungsbereich zusätzlich, von Hand gesetzte Dauern bleiben', () => {
  const K = nurKern().PlanKern, c = K.grund('k:mf:nb:', 0), d0 = K.dur('wdvs', c), p0 = K.dur('putz', c);
  assert.equal(K.dur('wdvs', { ...c, fak: 1.2 }), Math.round(d0 * 1.2));
  assert.equal(K.dur('wdvs', { ...c, fak: '1,2', fakPh: { huelle: 1.5 } }), Math.max(1, Math.round(K.dur('wdvs', { ...c, fak: 1.8 }))), 'Faktoren multiplizieren sich');
  assert.equal(K.dur('putz', { ...c, fakPh: { huelle: 2 } }), p0, 'anderer Bereich bleibt');
  assert.equal(K.dur('wdvs', { ...c, fak: 2, dur: { wdvs: 7 } }), 7, 'von Hand gesetzt bleibt');
  assert.match(K.durWeg('wdvs', { ...c, fak: 1.2 }), /× 1,2 Bauzeit-Faktor/);
  assert.equal(K.fakZahl(''), 1); assert.equal(K.fakZahl('0'), 1); assert.equal(K.fakZahl(9), 5);
});

test('Bezug „je Geschoss“: Richtdauer mal Geschosse (mit Keller und ausgebautem Dach)', () => {
  const ctx = nurKern(), K = ctx.PlanKern;
  ctx.LIBRARY = [{ id: 'lib_x', n: 'Brandschotts je Geschoss', ph: 'ausbau', gw: 'Brandschutz', sc: 'gs', d: 2 }];
  const c = { ...K.grund('neubau_mfh', 0), floors: 3, dg: 'kalt' };
  const n = K.levelsOf(c).L.length + (K.levelsOf(c).kg ? 1 : 0);
  assert.equal(K.dur('lib_x', c), 2 * n);
  assert.match(K.durWeg('lib_x', c), /2 AT je Geschoss × \d Geschosse/);
  assert.equal(K.item('lib_x', c).sc, 'bau', 'ein Vorgang für das Gebäude');
});

test('Leistungskatalog: eigene Leistung als Meilenstein (ohne Dauer)', () => {
  const ctx = nurKern(), K = ctx.PlanKern;
  ctx.LIBRARY = [{ id: 'lib_ms', n: 'Übergabe an den Nutzer', ph: 'abschluss', gw: 'Bauleitung', sc: 'bau', ms: 1, d: 1 }];
  const c = K.grund('neubau_efh', 0);
  assert.equal(K.dur('lib_ms', c), 0, 'Dauer 0 = Meilenstein im Plan');
  assert.ok(K.item('lib_ms', c).ms);
});

test('Tempo: Dauer und Name aller Leistungen je Anzeige – die Liste wird je Kontext einmal aufgebaut, nicht je Leistung', () => {
  // Die Oberflächen fragen je Leistung mit einer frischen Kopie der Angaben (dur(id, clone(cfg))). Am 15.11.2026 baute der Kern dafür die Liste aller
  // Leistungen jedes Mal neu auf (259 Leistungen → 259-mal je Anzeige, 37 ms je Gebäudetyp).
  const ctx = nurKern(), K = ctx.PlanKern;
  const cfg = { type: 'neubau_mfh', units: 6, floors: 3, area: 480 }, kopie = () => JSON.parse(JSON.stringify(cfg));
  const ids = K.itemsOf(kopie()).map((i) => i.id);
  assert.ok(ids.length > 150, `Katalog groß genug für die Messung (${ids.length})`);
  const a = performance.now();
  for (let r = 0; r < 5; r++) for (const id of ids) { K.dur(id, kopie()); K.item(id, kopie()); }
  const ms = (performance.now() - a) / 5;
  assert.ok(ms < 60, `Dauer und Name aller ${ids.length} Leistungen: ${ms.toFixed(1)} ms je Anzeige (Grenze 60 ms; vor der Korrektur über 200 ms)`);
  // gleiches Ergebnis wie mit einem frisch gebauten Kontext, und geänderte Angaben werden sofort berücksichtigt
  const d1 = ids.map((id) => K.dur(id, kopie())); K.ctx(null); const d2 = ids.map((id) => K.dur(id, kopie()));
  assert.deepEqual(d1, d2, 'gemerkter und frisch gebauter Kontext liefern dieselben Dauern');
  const gross = { ...cfg, area: 2400 }, d3 = ids.map((id) => K.dur(id, JSON.parse(JSON.stringify(gross))));
  assert.ok(d3.some((d, i) => d > d1[i]), 'andere Fläche → andere Dauern (kein veralteter Kontext)');
});
