// Rechentests Bauzeitenplan: Terminrechnung (Arbeitstage, Feiertage je Bundesland, Anordnungsbeziehungen,
// Leistungsgruppen, Einschränkung „Anfang nicht früher als“) – geprüft wird der ECHTE Programmcode aus gantt/public/gantt-*.js (früher app.js).
//
// Aufruf:  node --test tools/tests/js/
// Die Oberfläche wird in einem abgeschotteten Node-„vm“-Kontext geladen; Browser-Teile (document, fetch, localStorage …)
// sind durch Platzhalter ersetzt, die alles schlucken. Getestet wird nur die Funktion schedule() mit dem Plan P.
// Alle erwarteten Termine sind von Hand mit einem Kalender ausgezählt (Wochentage im Kommentar).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.resolve(HIER, '../../../gantt/public');
// in der Reihenfolge von index.html (bp/head.js kommt vom Server und fehlt hier)
const VORHER = ['theme.js', 'platform.js', 'catalog.js', 'print.js'];

// Platzhalter, der jeden Zugriff und Aufruf schluckt (document.querySelector(...).addEventListener(...) usw.)
function platzhalter() {
  const f = function () {};
  return new Proxy(f, {
    get(_t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === Symbol.iterator) return function* () {};
      if (k === 'then') return undefined;   // kein „Promise“
      if (k === 'length') return 0;
      return platzhalter();
    },
    apply: () => platzhalter(),
    construct: () => platzhalter(),
    set: () => true,
    has: () => true,
  });
}

function ladeApp() {
  const ctx = {
    document: platzhalter(),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { hash: '', pathname: '/', search: '', href: 'http://localhost/' },
    history: { replaceState() {}, pushState() {} },
    navigator: { userAgent: 'node', clipboard: platzhalter() },
    fetch: () => new Promise(() => {}),   // Server gibt es hier nicht – Anfragen bleiben einfach offen
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    getComputedStyle: () => platzhalter(),
    innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    Event: class {}, CustomEvent: class {}, KeyboardEvent: class {}, MouseEvent: class {},
    ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver: class { observe() {} disconnect() {} },
    BroadcastChannel: class { postMessage() {} close() {} },
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; ctx.parent = ctx; ctx.top = ctx;
  vm.createContext(ctx);
  // Grundhilfen ($, esc, api, toast) kommen wie im Betrieb aus dem Baukasten (/bp/baukasten.js beginnt mit bp.js)
  try { vm.runInContext(fs.readFileSync(path.join(PUB, '../../shared/bpcore/head/bp.js'), 'utf8'), ctx, { filename: 'bp.js' }); } catch { /* Oberflächenteil */ }
  for (const f of VORHER) {
    const p = path.join(PUB, f);
    if (!fs.existsSync(p)) continue;
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); } catch { /* Oberflächenteil – für die Rechnung unwichtig */ }
  }
  let fehler = null;
  // app.js ist geteilt (gantt-kern.js … gantt-start.js, gemeinsame Namen) – in der Reihenfolge der Seite laden
  for (const f of ['gantt-kern.js', 'gantt-diagramm.js', 'gantt-befehle.js', 'gantt-ereignisse.js', 'gantt-start.js']) {
    try { vm.runInContext(fs.readFileSync(path.join(PUB, f), 'utf8'), ctx, { filename: f }); } catch (e) { fehler = fehler || e; }
  }
  // Die Terminrechnung steht in gantt-kern.js – auch wenn später Oberflächencode scheitert, ist sie geladen.
  const da = vm.runInContext("typeof schedule === 'function' && typeof buildCal === 'function' && typeof toW === 'function'", ctx);
  assert.ok(da, 'Terminrechnung (schedule) aus gantt-kern.js nicht ladbar' + (fehler ? ': ' + fehler.message : ''));
  return ctx;
}

const APP = ladeApp();

// Datum „JJJJ-MM-TT“ ↔ Tageszahl (Tage seit 1970, UTC – so speichert der Bauzeitenplan Termine)
const tag = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
const iso = (n) => new Date(n * 86400000).toISOString().slice(0, 10);

const NW = { week: 5, state: 'NW', free: [] };

// Leistung im Speicherformat des Servers
function L(uid, dur, { lvl = 0, preds = [], cons = null, segs = null, name } = {}) {
  return { uid, name: name || 'Leistung ' + uid, dur, lvl, preds, cons, segs, pct: 0, res: '', gw: '', collapsed: false };
}
const nach = (uid, type = 'FS', lag = 0) => ({ uid, type, lag });

// Plan rechnen lassen – Ergebnis als ISO-Daten (Anfang/Ende) je Leistung, Reihenfolge wie im Plan
function rechne({ start, cal = NW, tasks }) {
  APP.__plan = JSON.stringify({ id: 'test', name: 'Test', start: tag(start), nextUid: 100, cal, tasks });
  const r = JSON.parse(vm.runInContext(`(() => {
    P = JSON.parse(__plan); const C = schedule();
    return JSON.stringify({ sd: Array.from(C.sd), fd: Array.from(C.fd), dur: Array.from(C.dur), summ: Array.from(C.summ),
                            crit: Array.from(C.crit), slack: Array.from(C.slack), msEnd: Array.from(C.msEnd), cyc: C.cyc, peDay: C.peDay });
  })()`, APP));
  return { ...r, anfang: r.sd.map(iso), ende: r.fd.map(iso), planende: iso(r.peDay) };
}

// ------------------------------------------------------------------ Arbeitstage und Feiertage
test('Dauer zählt nur Arbeitstage: Wochenende wird übersprungen', () => {
  // Do 12.11.26 + 5 AT: Do 12., Fr 13., (Sa/So), Mo 16., Di 17., Mi 18.
  const r = rechne({ start: '2026-11-12', tasks: [L(1, 5)] });
  assert.equal(r.anfang[0], '2026-11-12');
  assert.equal(r.ende[0], '2026-11-18');
});

test('Projektbeginn am Samstag: erste Leistung beginnt am Montag', () => {
  // Sa 07.11.26 → Mo 09.11.26; 2 AT → Di 10.11.
  const r = rechne({ start: '2026-11-07', tasks: [L(1, 2)] });
  assert.equal(r.anfang[0], '2026-11-09');
  assert.equal(r.ende[0], '2026-11-10');
});

test('Ostern NRW: Karfreitag und Ostermontag sind arbeitsfrei', () => {
  // Ostersonntag 05.04.26. Mi 01.04., Do 02.04., (Fr 03. Karfreitag, Sa, So, Mo 06. Ostermontag), Di 07., Mi 08., Do 09.
  const r = rechne({ start: '2026-04-01', tasks: [L(1, 5)] });
  assert.equal(r.ende[0], '2026-04-09');
});

test('1. Mai (Freitag) und Christi Himmelfahrt werden übersprungen', () => {
  // Do 30.04.26, (Fr 01.05., Sa, So), Mo 04.05., Di 05.05. → 3 AT bis 05.05.
  const a = rechne({ start: '2026-04-30', tasks: [L(1, 3)] });
  assert.equal(a.ende[0], '2026-05-05');
  // Himmelfahrt Do 14.05.26: Mi 13., (Do 14.), Fr 15., Mo 18. → 3 AT bis 18.05.
  const b = rechne({ start: '2026-05-13', tasks: [L(1, 3)] });
  assert.equal(b.ende[0], '2026-05-18');
});

test('Fronleichnam ist in NRW frei, in Niedersachsen nicht', () => {
  // Fronleichnam Do 04.06.26. Beginn Mi 03.06., 2 AT.
  const nw = rechne({ start: '2026-06-03', tasks: [L(1, 2)] });
  assert.equal(nw.ende[0], '2026-06-05', 'NRW: Mi 03., (Do 04.), Fr 05.');
  const ni = rechne({ start: '2026-06-03', cal: { week: 5, state: 'NI', free: [] }, tasks: [L(1, 2)] });
  assert.equal(ni.ende[0], '2026-06-04', 'Niedersachsen: Mi 03., Do 04.');
});

test('Tag der Deutschen Einheit (Dienstag 03.10.2028) ist arbeitsfrei', () => {
  // Mo 02.10.28, (Di 03.10.), Mi 04.10., Do 05.10. → 3 AT
  const r = rechne({ start: '2028-10-02', tasks: [L(1, 3)] });
  assert.equal(r.ende[0], '2028-10-05');
});

test('Weihnachten und Neujahr: Heiligabend und Silvester sind Arbeitstage', () => {
  // Mi 23.12.26, Do 24.12., (Fr 25., Sa 26., So 27.), Mo 28., Di 29., Mi 30., Do 31., (Fr 01.01.27, Sa, So), Mo 04.01., Di 05.01. → 8 AT
  const r = rechne({ start: '2026-12-23', tasks: [L(1, 8)] });
  assert.equal(r.ende[0], '2027-01-05');
});

test('Buß- und Bettag nur in Sachsen frei', () => {
  // Buß- und Bettag 2026: Mi 18.11. Beginn Do 12.11., 5 AT.
  const sn = rechne({ start: '2026-11-12', cal: { week: 5, state: 'SN', free: [] }, tasks: [L(1, 5)] });
  assert.equal(sn.ende[0], '2026-11-19', 'Sachsen: Do 12., Fr 13., Mo 16., Di 17., (Mi 18.), Do 19.');
  const nw = rechne({ start: '2026-11-12', tasks: [L(1, 5)] });
  assert.equal(nw.ende[0], '2026-11-18', 'NRW: Mi 18.11. ist Arbeitstag');
});

test('Ohne Bundesland (leer) gibt es keine Feiertage', () => {
  // Mi 01.04.26 + 5 AT ohne Feiertage: Mi 01., Do 02., Fr 03., Mo 06., Di 07.
  const r = rechne({ start: '2026-04-01', cal: { week: 5, state: '', free: [] }, tasks: [L(1, 5)] });
  assert.equal(r.ende[0], '2026-04-07');
});

test('6-Tage-Woche zählt Samstage mit, 7-Tage-Woche auch Sonntage', () => {
  // Do 12.11.26 + 5 AT. 6-Tage: Do 12., Fr 13., Sa 14., Mo 16., Di 17.  7-Tage: 12.–16.
  const w6 = rechne({ start: '2026-11-12', cal: { week: 6, state: 'NW', free: [] }, tasks: [L(1, 5)] });
  assert.equal(w6.ende[0], '2026-11-17');
  const w7 = rechne({ start: '2026-11-12', cal: { week: 7, state: 'NW', free: [] }, tasks: [L(1, 5)] });
  assert.equal(w7.ende[0], '2026-11-16');
});

test('Eigene freie Tage (Betriebsferien), auch jährlich wiederkehrend', () => {
  // Betriebsferien 24.12.26–01.01.27: Mi 23.12., (24.12.–01.01., Wochenenden), Mo 04.01., Di 05.01. → 3 AT
  const r = rechne({ start: '2026-12-23', cal: { week: 5, state: 'NW', free: [{ from: '2026-12-24', to: '2027-01-01', name: 'Betriebsferien' }] }, tasks: [L(1, 3)] });
  assert.equal(r.ende[0], '2027-01-05');
  // jährlich, angelegt 2025 (24.–31.12.) → gilt auch 2026: Mi 23.12.26, dann Mo 04.01.27 → 2 AT
  const j = rechne({ start: '2026-12-23', cal: { week: 5, state: 'NW', free: [{ from: '2025-12-24', to: '2025-12-31', name: 'Ferien', yearly: true }] }, tasks: [L(1, 2)] });
  assert.equal(j.ende[0], '2027-01-04');
});

// ------------------------------------------------------------------ Anordnungsbeziehungen
test('Ende-Anfang (EA) ohne und mit Zeitabstand', () => {
  // A: Mo 02.11.26, 3 AT → Mi 04.11.
  // B = A EA: Do 05.11., 2 AT → Fr 06.11.
  // C = A EA +2 Tage: Do/Fr Wartezeit → Mo 09.11.
  // D = A EA −1 Tag (Überlappung): Mi 04.11.
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 3), L(2, 2, { preds: [nach(1)] }), L(3, 1, { preds: [nach(1, 'FS', 2)] }), L(4, 1, { preds: [nach(1, 'FS', -1)] })] });
  assert.deepEqual([r.anfang[0], r.ende[0]], ['2026-11-02', '2026-11-04']);
  assert.deepEqual([r.anfang[1], r.ende[1]], ['2026-11-05', '2026-11-06']);
  assert.equal(r.anfang[2], '2026-11-09');
  assert.equal(r.anfang[3], '2026-11-04');
});

test('Zeitabstand zählt Arbeitstage über Ostern', () => {
  // A: Mi 01.04.26, 2 AT → Do 02.04. B = A EA +1: nächster AT Di 07.04. (Karfreitag/Ostermontag frei) +1 → Mi 08.04.
  const r = rechne({ start: '2026-04-01', tasks: [L(1, 2), L(2, 1, { preds: [nach(1, 'FS', 1)] })] });
  assert.equal(r.ende[0], '2026-04-02');
  assert.equal(r.anfang[1], '2026-04-08');
});

test('Anfang-Anfang (AA) mit Zeitabstand', () => {
  // A: Mo 02.11.26, 5 AT. B = A AA +2: Mi 04.11., 3 AT → Fr 06.11.
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 5), L(2, 3, { preds: [nach(1, 'SS', 2)] })] });
  assert.deepEqual([r.anfang[1], r.ende[1]], ['2026-11-04', '2026-11-06']);
});

test('Ende-Ende (EE): Nachfolger endet mit dem Vorgänger (bzw. Zeitabstand danach)', () => {
  // A: Mo 02.11.–Fr 06.11.26 (5 AT). B = A EE, 2 AT → Do 05.11.–Fr 06.11.
  // C = A EE +1, 3 AT → endet Mo 09.11., beginnt Do 05.11.
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 5), L(2, 2, { preds: [nach(1, 'FF')] }), L(3, 3, { preds: [nach(1, 'FF', 1)] })] });
  assert.equal(r.ende[0], '2026-11-06');
  assert.deepEqual([r.anfang[1], r.ende[1]], ['2026-11-05', '2026-11-06']);
  assert.deepEqual([r.anfang[2], r.ende[2]], ['2026-11-05', '2026-11-09']);
});

test('Ende-Ende kann nicht vor den Projektbeginn ziehen', () => {
  // A: Mo 02.11.26, 3 AT → Mi 04.11. B = A EE, 5 AT würde am Do 29.10. beginnen → frühestens Projektbeginn Mo 02.11., Ende Fr 06.11.
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 3), L(2, 5, { preds: [nach(1, 'FF')] })] });
  assert.deepEqual([r.anfang[1], r.ende[1]], ['2026-11-02', '2026-11-06']);
});

test('Anfang-Ende (AE): Nachfolger ist fertig, bevor der Vorgänger beginnt', () => {
  // A beginnt frühestens Mi 04.11.26 (Einschränkung). B = A AE, 2 AT → Mo 02.11.–Di 03.11.
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 2, { cons: tag('2026-11-04') }), L(2, 2, { preds: [nach(1, 'SF')] })] });
  assert.equal(r.anfang[0], '2026-11-04');
  assert.deepEqual([r.anfang[1], r.ende[1]], ['2026-11-02', '2026-11-03']);
});

test('Mehrere Vorgänger: der späteste bestimmt den Anfang', () => {
  // A: 02.–04.11.26 (3 AT), B: 02.–09.11. (6 AT: Mo–Fr, Mo). C = A;B → Di 10.11.
  // D = A EA +5 (Do 05.11. + 5 AT = Do 12.11.) und B → Do 12.11.
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 3), L(2, 6), L(3, 1, { preds: [nach(1), nach(2)] }), L(4, 1, { preds: [nach(1, 'FS', 5), nach(2)] })] });
  assert.equal(r.ende[1], '2026-11-09');
  assert.equal(r.anfang[2], '2026-11-10');
  assert.equal(r.anfang[3], '2026-11-12');
});

test('Kritischer Weg und Puffer bei parallelen Leistungen', () => {
  // A 3 AT und B 6 AT parallel, C wartet auf beide → B und C kritisch, A hat 3 AT Puffer
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 3), L(2, 6), L(3, 2, { preds: [nach(1), nach(2)] })] });
  assert.deepEqual(r.crit, [false, true, true]);
  assert.equal(r.slack[0], 3);
  assert.equal(r.planende, '2026-11-11', 'C: Di 10.11.–Mi 11.11.');
});

test('Zirkelbezug wird erkannt', () => {
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 2, { preds: [nach(2)] }), L(2, 2, { preds: [nach(1)] })] });
  assert.equal(r.cyc, true);
});

// ------------------------------------------------------------------ Leistungsgruppen, Meilensteine, Einschränkungen
test('Leistungsgruppe umfasst ihre Teilleistungen (Anfang, Ende, Dauer)', () => {
  // Gruppe: A 02.–04.11.26 (3 AT), B = A EA, 4 AT: Do 05., Fr 06., Mo 09., Di 10.11. → Gruppe 02.–10.11., 7 AT
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 0, { name: 'Rohbau' }), L(2, 3, { lvl: 1 }), L(3, 4, { lvl: 1, preds: [nach(2)] })] });
  assert.equal(r.summ[0], true);
  assert.deepEqual([r.anfang[0], r.ende[0]], ['2026-11-02', '2026-11-10']);
  assert.equal(r.dur[0], 7);
});

test('Vorgänger einer Gruppe gilt für alle Teilleistungen, Nachfolger wartet auf die ganze Gruppe', () => {
  // X: 02.–03.11.26 (2 AT). Gruppe G (Vorgänger X) mit A 1 AT und B 3 AT → beide ab Mi 04.11.; B bis Fr 06.11.
  // Y = G EA → Mo 09.11.
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 2), L(2, 0, { preds: [nach(1)] }), L(3, 1, { lvl: 1 }), L(4, 3, { lvl: 1 }), L(5, 1, { preds: [nach(2)] })] });
  assert.equal(r.anfang[2], '2026-11-04');
  assert.equal(r.anfang[3], '2026-11-04');
  assert.deepEqual([r.anfang[1], r.ende[1]], ['2026-11-04', '2026-11-06']);
  assert.equal(r.anfang[4], '2026-11-09');
});

test('Meilenstein nach einer Leistung steht am Ende ihres letzten Tages', () => {
  // A: 02.–04.11.26. Meilenstein M = A EA → angezeigt am Mi 04.11. (Ende des Vortags)
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 3), L(2, 0, { preds: [nach(1)] })] });
  assert.equal(r.anfang[1], '2026-11-04');
  assert.equal(r.msEnd[1], true);
});

test('„Anfang nicht früher als“: Wochenende rastet auf Montag ein, Vorgänger kann später schieben', () => {
  // Einschränkung Sa 07.11.26 → Mo 09.11.
  const a = rechne({ start: '2026-11-02', tasks: [L(1, 2, { cons: tag('2026-11-07') })] });
  assert.equal(a.anfang[0], '2026-11-09');
  // Vorgänger endet früher (Mi 04.11.) → Einschränkung Mo 09.11. gilt
  const b = rechne({ start: '2026-11-02', tasks: [L(1, 3), L(2, 1, { preds: [nach(1)], cons: tag('2026-11-09') })] });
  assert.equal(b.anfang[1], '2026-11-09');
  // Vorgänger endet später (10 AT: 02.–13.11.) → Beginn Mo 16.11. trotz Einschränkung 09.11.
  const c = rechne({ start: '2026-11-02', tasks: [L(1, 10), L(2, 1, { preds: [nach(1)], cons: tag('2026-11-09') })] });
  assert.equal(c.anfang[1], '2026-11-16');
});

test('Leistung ohne Vorgänger: mit Einschränkung bleibt ihr Termin, ohne beginnt sie am Projektbeginn', () => {
  // B hing an A (02.–06.11.26) und begann Mo 09.11.; ihr Anfang ist als Einschränkung 09.11. gesetzt.
  const mit = rechne({ start: '2026-11-02', tasks: [L(1, 5), L(2, 2, { preds: [nach(1)], cons: tag('2026-11-09') })] });
  assert.equal(mit.anfang[1], '2026-11-09');
  // Verknüpfung gelöst – die Einschränkung hält den Termin
  const geloest = rechne({ start: '2026-11-02', tasks: [L(1, 5), L(2, 2, { cons: tag('2026-11-09') })] });
  assert.deepEqual([geloest.anfang[1], geloest.ende[1]], ['2026-11-09', '2026-11-10']);
  // ohne Einschränkung: „so früh wie möglich“ = Projektbeginn
  const frei = rechne({ start: '2026-11-02', tasks: [L(1, 5), L(2, 2)] });
  assert.equal(frei.anfang[1], '2026-11-02');
});

// Verknüpfung über die Oberfläche lösen (act wie bei jedem Bearbeiten) – Ergebnis wie oben, plus gesetzte Einschränkungen
function loese({ start, cal = NW, tasks }, aenderung) {
  APP.__plan = JSON.stringify({ id: 'test', name: 'Test', start: tag(start), nextUid: 100, cal, tasks });
  APP.__aend = aenderung;
  return JSON.parse(vm.runInContext(`(() => {
    P = JSON.parse(__plan); undoS = []; redoS = []; CAL = schedule();
    act(() => { (new Function('P', __aend))(P); });
    return JSON.stringify({ anfang: Array.from(CAL.sd).map((n) => new Date(n * 86400000).toISOString().slice(0, 10)),
                            cons: P.tasks.map((t) => t.cons == null ? null : new Date(t.cons * 86400000).toISOString().slice(0, 10)) });
  })()`, APP));
}

test('Verknüpfung lösen: die Leistung bleibt an ihrem Termin statt an den Projektanfang zu springen', () => {
  // A 02.–06.11.26, B hängt an A (Mo 09.11.), C hängt an B
  const plan = { start: '2026-11-02', tasks: [L(1, 5), L(2, 2, { preds: [nach(1)] }), L(3, 1, { preds: [nach(2)] })] };
  const r = loese(plan, 'P.tasks[1].preds = [];');
  assert.equal(r.anfang[1], '2026-11-09');
  assert.equal(r.cons[1], '2026-11-09');
  assert.equal(r.anfang[2], '2026-11-11');          // Nachfolger bleibt dahinter
  assert.equal(r.cons[2], null);                     // … ohne eigene Einschränkung
});

test('Verknüpfung lösen ohne Terminsprung (überflüssige Verknüpfung): keine Einschränkung', () => {
  // C hängt an A und an B (B nach A) – die Verknüpfung A→C ist überflüssig
  const plan = { start: '2026-11-02', tasks: [L(1, 5), L(2, 2, { preds: [nach(1)] }), L(3, 1, { preds: [nach(1), nach(2)] })] };
  const r = loese(plan, 'P.tasks[2].preds = P.tasks[2].preds.filter((p) => p.uid !== 1);');
  assert.equal(r.anfang[2], '2026-11-11');
  assert.equal(r.cons[2], null);
});

test('Vorgänger ersetzen (neue Verknüpfung statt alter): Leistung folgt dem neuen Vorgänger', () => {
  const plan = { start: '2026-11-02', tasks: [L(1, 5), L(2, 1), L(3, 2, { preds: [nach(1)] })] };
  const r = loese(plan, 'P.tasks[2].preds = [{ uid: 2, type: "FS", lag: 0 }];');
  assert.equal(r.anfang[2], '2026-11-03');
  assert.equal(r.cons[2], null);
});

test('Gelöschte Vorgänger-Leistung: Nachfolger behält seinen Termin', () => {
  const plan = { start: '2026-11-02', tasks: [L(1, 5), L(2, 2, { preds: [nach(1)] })] };
  const r = loese(plan, 'P.tasks.splice(0, 1);');
  assert.equal(r.anfang[0], '2026-11-09');
  assert.equal(r.cons[0], '2026-11-09');
});

test('Einschränkung einer Gruppe gilt für ihre Teilleistungen', () => {
  // Gruppe mit Einschränkung Mi 04.11.26; Teilleistung 2 AT → Mi 04.–Do 05.11.
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 0, { cons: tag('2026-11-04') }), L(2, 2, { lvl: 1 })] });
  assert.deepEqual([r.anfang[1], r.ende[1]], ['2026-11-04', '2026-11-05']);
});

test('Unterbrochene Leistung: Pause zählt Arbeitstage, Dauer = Summe der Abschnitte', () => {
  // 5 AT als 2 AT + Pause 2 AT + 3 AT ab Mo 02.11.26: Mo 02., Di 03., (Mi 04., Do 05. Pause), Fr 06., Mo 09., Di 10.
  const r = rechne({ start: '2026-11-02', tasks: [L(1, 5, { segs: [{ d: 2, gap: 0 }, { d: 3, gap: 2 }] }), L(2, 1, { preds: [nach(1)] })] });
  assert.deepEqual([r.anfang[0], r.ende[0]], ['2026-11-02', '2026-11-10']);
  assert.equal(r.anfang[1], '2026-11-11');
});

// ------------------------------------------------------------------ Drucken
// Seitenaufteilung aus gantt/public/print.js (printLayout) – gemeldeter Fehler: A3 quer, „auf 1 Seite hoch“, 82 Zeilen →
// die letzte Zeile rutschte durch Rundung allein auf Seite 2.
function seiten(anzahl, opts) {
  APP.__plan = JSON.stringify({ id: 'druck', name: 'Druck', start: tag('2026-11-09'), nextUid: anzahl + 1, cal: NW,
                                tasks: Array.from({ length: anzahl }, (_, k) => L(k + 1, 1 + (k % 9), { preds: k ? [nach(k)] : [] })) });
  APP.__opts = JSON.stringify(opts);
  return JSON.parse(vm.runInContext(`(() => {
    P = JSON.parse(__plan); CAL = schedule(); vis = P.tasks.map((t, i) => i);
    const L = printLayout(Object.assign({}, PDEF, JSON.parse(__opts)));
    return JSON.stringify({ baender: L.bands.length, breite: L.slices.length });
  })()`, APP));
}

for (const [papier, zeilen] of [['A3', 82], ['A3', 40], ['A4', 82], ['A2', 150], ['A3', 1]]) {
  test(`Drucken ${papier} quer, „auf 1 Seite hoch“: alle ${zeilen} Zeilen auf einer Seite`, () => {
    const r = seiten(zeilen, { paper: papier, orient: 'landscape', scaleMode: 'fit', pagesW: 1, fitH: true, pagesH: 1, outline: 'all' });
    assert.equal(r.baender, 1, `${r.baender} Seiten statt 1`);
    assert.equal(r.breite, 1);
  });
}

test('Drucken A3 quer, „auf 2 Seiten hoch“: 82 Zeilen auf genau 2 Seiten', () => {
  const r = seiten(82, { paper: 'A3', orient: 'landscape', scaleMode: 'fit', pagesW: 1, fitH: true, pagesH: 2, outline: 'all' });
  assert.equal(r.baender, 2);
});
