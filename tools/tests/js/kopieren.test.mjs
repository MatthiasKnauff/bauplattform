// Bauzeitenplan: Kopieren, Einfügen, Duplizieren mit Master (gantt/public/gantt-kopieren.js, GKopie – GO 16.11.2026).
// Geprüft werden die reinen Funktionen ohne Oberfläche: Namen hochzählen, Verknüpfungen innen/außen, Takt, Schema, Master in die Kopien.
//
// Aufruf:  node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(HIER, '../../../gantt/public/gantt-kopieren.js'), 'utf8'), ctx, { filename: 'gantt-kopieren.js' });
const K = ctx.GKopie;
const gl = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, m);   // Listen aus dem vm-Kontext: über JSON vergleichen
const L = (uid, name, lvl, preds = [], dur = 5) => ({ uid, name, lvl, dur, pct: 30, preds: preds.map((u) => ({ uid: u, type: 'FS', lag: 0 })), gw: 'Ausbau' });
const plan = () => [L(1, 'Rohbau', 0), L(2, 'Wohnung 1', 0, [1]), L(3, 'Estrich', 1, [1]), L(4, 'Boden', 1, [3]), L(5, 'Abnahme', 0, [2])];
const zaehler = (n) => () => n++;

test('Zahl im Namen hochzählen', () => {
  assert.equal(K.nummer('Wohnung 1', 1), 'Wohnung 2');
  assert.equal(K.nummer('1. OG', 2), '3. OG');
  assert.equal(K.nummer('Haus 2 Wohnung 1', 3), 'Haus 2 Wohnung 4');
  assert.equal(K.nummer('Bad', 1), 'Bad (2)');
});

test('Einfügen: Verknüpfungen innen kommen mit, nach außen nicht, kein Master', () => {
  const T = plan(), A = K.ablegen(T, [1]);
  gl(A.map((t) => [t.uid, t.lvl]), [[2, 0], [3, 1], [4, 1]], 'Gruppe mit Untergruppen, Ebenen ab 0');
  const N = K.einfuegen(T, A, 5, 0, zaehler(100));
  const neu = N.slice(5);
  gl(neu.map((t) => [t.uid, t.name, t.lvl]), [[100, 'Wohnung 1', 0], [101, 'Estrich', 1], [102, 'Boden', 1]]);
  gl(neu[2].preds.map((p) => p.uid), [101], 'Boden wartet auf den kopierten Estrich');
  gl(neu[1].preds, [], 'Estrich verliert die Verknüpfung nach außen (Rohbau)');
  assert.ok(neu.every((t) => t.mu == null && !t.mst && t.pct === 0), 'ohne Master, Fortschritt 0');
});

test('Duplizieren im Takt mit Schema: Namen, Master, Takt, Vorgänger und Nachfolger außen', () => {
  const N = K.duplizieren(plan(), [1], 2, 'takt', true, zaehler(100));
  const nm = N.map((t) => t.name);
  gl(nm, ['Rohbau', 'Wohnung 1', 'Estrich', 'Boden', 'Wohnung 2', 'Estrich', 'Boden', 'Wohnung 3', 'Estrich', 'Boden', 'Abnahme']);
  assert.equal(N[1].mst, true, 'Wohnung 1 ist Master');
  gl(N.slice(4, 10).map((t) => t.mu), [2, 3, 4, 2, 3, 4], 'jede Leistung kennt ihr Gegenstück im Master');
  const e2 = N[5], e3 = N[8];
  gl(e2.preds.map((p) => p.uid).sort(), [1, 3], 'Estrich Whg 2: Rohbau (Schema) und Estrich Whg 1 (Takt)');
  assert.ok(e3.preds.some((p) => p.uid === e2.uid), 'Estrich Whg 3 wartet auf Estrich Whg 2');
  assert.ok(!N[4].preds.some((p) => p.uid === 2), 'Gruppen bekommen keinen Takt');
  const ab = N[10];
  gl(ab.preds.map((p) => p.uid).sort((a, b) => a - b), [2, N[4].uid, N[7].uid], 'Abnahme wartet auf alle Wohnungen');
});

test('Duplizieren parallel ohne Schema: nur Verknüpfungen innen', () => {
  const N = K.duplizieren(plan(), [1], 1, 'parallel', false, zaehler(100));
  gl(N[5].preds, [], 'Estrich der Kopie: kein Rohbau, kein Takt');
  gl(N[6].preds.map((p) => p.uid), [N[5].uid]);
  gl(N[7].preds.map((p) => p.uid), [2], 'Abnahme unverändert');
});

test('Master ändern → in die Kopien übernehmen; Abweichungen von Hand bleiben', () => {
  const u = zaehler(100);
  const T = K.duplizieren(plan(), [1], 2, 'parallel', false, u);
  const alt = JSON.parse(JSON.stringify(T));
  T[2].dur = 8;                       // Master: Estrich 8 Tage
  T[3].gw = 'Bodenleger';             // Master: Gewerk Boden
  T[7 + 2].gw = 'Eigenleistung';      // Kopie 2 (Wohnung 3): Boden von Hand geändert
  const alt2 = JSON.parse(JSON.stringify(T)); alt2[2].dur = 5; alt2[3].gw = 'Ausbau';
  const G = K.masterGeaendert(alt2, T);
  assert.equal(G.length, 1); assert.equal(G[0].kopien, 2);
  const { T: N, n } = K.uebertragen(alt2, T, 2, u);
  assert.ok(n >= 3, `Änderungen gezählt: ${n}`);
  gl([N[5].dur, N[8].dur], [8, 8], 'Dauer in beiden Kopien');
  assert.equal(N[6].gw, 'Bodenleger', 'Gewerk in Wohnung 2');
  assert.equal(N[9].gw, 'Eigenleistung', 'von Hand geändert: bleibt');
  gl([N[4].name, N[7].name], ['Wohnung 2', 'Wohnung 3'], 'Namen der Kopien bleiben');
  void alt;
});

test('Neue und gelöschte Leistung im Master kommen in die Kopien', () => {
  const u = zaehler(100);
  const T = K.duplizieren(plan(), [1], 1, 'parallel', false, u);
  const alt = JSON.parse(JSON.stringify(T));
  T.splice(4, 0, { ...L(50, 'Fliesen', 1, [4]) });   // neu hinter „Boden“ im Master
  T.splice(2, 1);                                      // „Estrich“ im Master gelöscht
  const { T: N } = K.uebertragen(alt, T, 2, u);
  const kopie = N.slice(N.findIndex((t) => t.name === 'Wohnung 2'));
  gl(kopie.slice(0, 3).map((t) => t.name), ['Wohnung 2', 'Boden', 'Fliesen'], `Kopie: ${kopie.map((t) => t.name)}`);
  assert.equal(kopie[2].mu, 50);
});

test('Kette weiterführen: Kopie noch einmal duplizieren → hinten anhängen, Zahl läuft weiter, Takt nach der letzten Kopie', () => {
  const u = zaehler(100);
  let T = K.duplizieren(plan(), [1], 2, 'takt', true, u);   // Wohnung 1 (Master), 2, 3
  const w3 = T.findIndex((t) => t.name === 'Wohnung 3'), e3 = T[w3 + 1].uid;
  T = K.duplizieren(T, [w3], 1, 'takt', true, u);           // eine Kopie gewählt → Wohnung 4 hinten an
  gl(T.map((t) => t.name), ['Rohbau', 'Wohnung 1', 'Estrich', 'Boden', 'Wohnung 2', 'Estrich', 'Boden', 'Wohnung 3', 'Estrich', 'Boden', 'Wohnung 4', 'Estrich', 'Boden', 'Abnahme']);
  const w4 = T.findIndex((t) => t.name === 'Wohnung 4');
  assert.equal(T[w4].mu, 2, 'gehört zum selben Master');
  assert.ok(T[w4 + 1].preds.some((p) => p.uid === e3), 'Estrich Whg 4 wartet auf Estrich Whg 3');
  assert.ok(T.at(-1).preds.some((p) => p.uid === T[w4].uid), 'Abnahme wartet auch auf Wohnung 4');
  assert.equal(K.kopienVon(T, 2).length, 3, 'drei Kopien in der Kette');
});

test('Duplizieren mit wählbarer Verknüpfung (GO 17.11.2026): Standard Ende letzter → Anfang erster, eigene Paare, Kette', () => {
  const T = plan();
  const E = K.duplizieren(T, [1], 2, 'ende', false, zaehler(100));
  const k1 = E.filter((t) => t.mu === 3)[0], k2 = E.filter((t) => t.mu === 3)[1];
  gl(k1.preds.filter((p) => p.uid === 4), [{ uid: 4, type: 'FS', lag: 0 }], 'erste Kopie: Estrich wartet auf das Ende von „Boden“ (letzter Vorgang des Originals)');
  const b1 = E.find((t) => t.mu === 4 && t.uid !== 4 && E.indexOf(t) < E.indexOf(k2));
  gl(k2.preds.filter((p) => p.uid === b1.uid), [{ uid: b1.uid, type: 'FS', lag: 0 }], 'zweite Kopie hängt an der ersten');
  const X = K.duplizieren(plan(), [1], 1, 'eigen', false, zaehler(200), [{ von: 3, vt: 'A', nach: 4, nt: 'A' }]);
  const b = X.find((t) => t.mu === 4 && t.uid >= 200);
  gl(b.preds.filter((p) => p.uid === 3), [{ uid: 3, type: 'SS', lag: 0 }], 'Anfang Estrich (Original) → Anfang Boden (Kopie) = Anfang–Anfang');
  assert.ok(!X.find((t) => t.mu === 3 && t.uid >= 200).preds.some((p) => p.uid === 4), 'keine Standard-Verknüpfung bei „eigen“');
  const Pa = K.duplizieren(plan(), [1], 1, 'parallel', false, zaehler(300));
  assert.ok(!Pa.filter((t) => t.uid >= 300).some((t) => t.preds.some((p) => p.uid < 300 && p.uid !== 1)), 'parallel: keine Verknüpfung zum Original');
});

test('Duplizieren: der Block bleibt in Form – Anfänge der Kopie hängen mit Abstand an „von“ (Rückmeldung 17.11.2026)', () => {
  // vier Leistungen hintereinander (1 → 2 → 3 → 4), je 5 Arbeitstage; Ende 4 → Anfang Kopie von 3
  const T = [L(1, 'A', 0, [], 5), L(2, 'B', 0, [1], 5), L(3, 'C', 0, [2], 5), L(4, 'D', 0, [3], 5)];
  const lage = new Map([[1, { s: 0, f: 5 }], [2, { s: 5, f: 10 }], [3, { s: 10, f: 15 }], [4, { s: 15, f: 20 }]]);
  const E = K.duplizieren(T, [0, 1, 2, 3], 1, 'eigen', false, zaehler(100), [{ von: 4, vt: 'E', nach: 3, nt: 'A' }], lage);
  const k = (m) => E.find((t) => t.mu === m && t.uid >= 100);
  gl(k(1).preds, [{ uid: 4, type: 'FS', lag: -10 }], 'Anfang der Kopie: Ende 4 minus Abstand 1→3 im Original');
  assert.ok(k(2).preds.some((p) => p.uid === k(1).uid), 'Verknüpfungen in der Kopie bleiben');
  assert.ok(k(3).preds.some((p) => p.uid === 4 && p.type === 'FS' && !p.lag), 'die gewählte Verknüpfung steht auch da');
  const O = K.duplizieren(T, [0, 1, 2, 3], 1, 'eigen', false, zaehler(200), [{ von: 4, vt: 'E', nach: 3, nt: 'A' }]);
  assert.ok(!O.find((t) => t.mu === 1 && t.uid >= 200).preds.length, 'ohne Lage wie bisher');
});
