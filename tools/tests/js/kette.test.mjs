// Bauzeitenplan: „Plan neu aus den Angaben“ gleicht ab statt zu ersetzen, Kette 🔗 (Mock BZ H1–H3, 22.11.2026) – gantt/public/kette.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
function lade() {
  const ctx = { document: { addEventListener() {} }, bpEsc: (s) => String(s) };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(ROOT + '/gantt/public/kette.js', 'utf8'), ctx);
  return ctx.GKette;
}
const T = (uid, cat, dur, preds = [], x = {}) => ({ uid, cat, dur, name: x.name || cat, blk: -1, ph: x.ph || '', lvl: x.lvl ?? 1, preds: preds.map((u) => ({ uid: u, type: 'FS', lag: 0 })), ...x });

test('Abgleich: Vorschlag wird nachgeführt, Handänderungen und Eigenes bleiben', () => {
  const K = lade();
  // alter Vorschlag (A) und neuer (B) – andere uids, wie bei jedem Aufbau
  const A = [T(1, '_start', 0, [], { lvl: 0 }), T(2, 'putz', 6, [1]), T(3, 'estrich', 2, [2]), T(4, 'maler', 4, [2]), T(5, 'alt', 3, [2]), T(6, 'weg_hand', 3, [2])];
  const B = [T(11, '_start', 0, [], { lvl: 0 }), T(12, 'putz', 8, [11]), T(13, 'putz_tr', 10, [12]), T(14, 'estrich', 2, [12]), T(15, 'maler', 5, [13]), T(16, 'fliesen', 6, [14])];
  // Plan: putz folgt, estrich von Hand 5 AT, maler mit eigenem Vorgänger, eigene Zeile „Bemusterung“, „alt“ folgt (entfällt),
  // „weg_hand“ von Hand geändert (bleibt), „fliesen“ von Hand gelöscht
  const P = [T(101, '_start', 0, [], { lvl: 0 }), T(102, 'putz', 6, [101]), T(103, 'estrich', 5, [102]), T(200, null, 1, [102], { name: 'Bemusterung' }),
    T(104, 'maler', 4, [102, 200]), T(105, 'alt', 3, [102]), T(106, 'weg_hand', 7, [102])];
  const R = K.planAbgleich(A, B, P, 201, ['fliesen|-1||#1']);
  const by = (c) => R.tasks.find((t) => t.cat === c), nm = (n) => R.tasks.find((t) => t.name === n);
  assert.equal(by('putz').uid, 102, 'uid bleibt (Firmen, Notizen, Verknüpfungen hängen daran)');
  assert.equal(by('putz').dur, 8, 'folgt dem Assistenten: neue Dauer');
  assert.equal(by('estrich').dur, 5, 'von Hand: Dauer bleibt');
  assert.equal(by('estrich').vs.d, 2, 'H3: neuer Vorschlag steht an der Kette');
  assert.equal(K.vonHand(by('estrich')), true, 'Kette gelöst');
  assert.deepEqual(by('maler').preds.map((p) => p.uid).sort(), [102, 200], 'von Hand verknüpft (eigene Zeile als Vorgänger): bleibt');
  assert.ok(nm('Bemusterung'), 'eigene Leistung bleibt');
  assert.ok(by('putz_tr') && by('putz_tr').preds[0].uid === 102, 'neue Leistung, an die vorhandene uid gehängt');
  assert.ok(!by('alt'), 'nicht mehr vorgeschlagen und nicht angefasst: entfällt');
  assert.ok(by('weg_hand'), 'nicht mehr vorgeschlagen, aber von Hand geändert: bleibt');
  assert.ok(!by('fliesen'), 'von Hand gelöscht: kommt nicht wieder');
  assert.equal(K.vonHand(by('putz')), false, 'folgt: Kette verbunden');
  assert.deepEqual([R.neu, R.weg], [1, 1]);
  const uids = R.tasks.map((t) => t.uid); assert.equal(new Set(uids).size, uids.length, 'keine doppelten uids');
  assert.ok(R.nextUid > Math.max(...uids));
  for (const t of R.tasks) for (const p of t.preds) assert.ok(uids.includes(p.uid), `Vorgänger von ${t.name} zeigt ins Leere`);
});

test('Kette: merken, lösen, von Hand erkennen', () => {
  const K = lade();
  const L = [T(1, 'putz', 6), T(2, 'maler', 4, [1]), T(3, null, 2)];
  K.merken(L);
  assert.equal(K.vonHand(L[0]), false); assert.equal(K.vonHand(L[2]), null, 'eigene Leistung: keine Kette');
  L[1].preds = []; assert.equal(K.vonHand(L[1]), true, 'Vorgänger gelöscht = von Hand');
  L[0].los = 1; assert.equal(K.vonHand(L[0]), true, 'gelöst ohne Änderung');
  const F = K.folgend(L); assert.equal(F.size, 0);
  L[0].dur = 9; K.merken(L, F); assert.equal(L[0].vs.d, 6, 'von Hand Geändertes bekommt keinen neuen Vorschlag');
});
