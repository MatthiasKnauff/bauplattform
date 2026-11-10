// Baumtabelle (shared/bpcore/head/baum.js): Auf- und Zuklappen rechnet richtig – was unter einem zugeklappten Knoten liegt,
// ist versteckt; „zeige“ klappt alles über einer Zeile auf; der Stand wird auf Wunsch im Browser gemerkt.
//
// Aufruf:  node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
function lade() {
  const speicher = new Map();
  const window = {}, localStorage = { getItem: (k) => (speicher.has(k) ? speicher.get(k) : null), setItem: (k, v) => speicher.set(k, String(v)) };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'shared/bpcore/head/baum.js'), 'utf8'), { window, localStorage });
  return { B: window.bpBaum, speicher };
}
// Titel 1 > Titel 1.1 > Positionen; Titel 2 > Position
const Z = [{ id: 't1', t: 1 }, { id: 't11', t: 2 }, { id: 'p1', t: Infinity }, { id: 'p2', t: Infinity }, { id: 't2', t: 1 }, { id: 'p3', t: Infinity }];
const tiefe = (x) => x.t;

test('Baumzelle: Dreieck, Einrückung, Klapp-Kennung', () => {
  const { B } = lade();
  const h = B.zelle({ tiefe: 2, auf: false, klapp: 't1', icon: '<i></i>', html: 'Text', kl: 'oz' });
  assert.match(h, /^<td class="oz baumz"><div class="bz" style="padding-left:2\.3rem"><span class="car" data-zu="t1" title="aufklappen">▸<\/span><i><\/i>Text<\/div><\/td>$/);
  assert.match(B.zelle({ tiefe: 0, auf: true, klapp: 7 }), /data-zu="7" title="zuklappen">▾/);
  assert.match(B.zelle({ tiefe: 0 }), /<span class="car"><\/span>/);   // kein Dreieck, der Platz bleibt
});

test('zugeklappt: alles darunter ist versteckt, der Knoten selbst bleibt', () => {
  const { B } = lade();
  const K = B.klapp({ anfang: ['t1', 't11', 't2'] });
  assert.deepEqual([...B.sicht(Z, tiefe, K)], [true, false, false, false, true, false]);
  K.um('t1');   // Titel 1 auf: Untertitel sichtbar, aber selbst noch zu
  assert.deepEqual([...B.sicht(Z, tiefe, K)], [true, true, false, false, true, false]);
  K.um('t11');
  assert.deepEqual([...B.sicht(Z, tiefe, K)], [true, true, true, true, true, false]);
  K.setze([]);
  assert.deepEqual([...B.sicht(Z, tiefe, K)], Z.map(() => true));
});

test('zeige: klappt nur die Knoten über der Zeile auf', () => {
  const { B } = lade();
  const K = B.klapp({ anfang: () => ['t1', 't11', 't2'] });
  assert.deepEqual([...B.eltern(Z, 3, tiefe)].map((x) => x.id), ['t11', 't1']);
  B.zeige(Z, 3, tiefe, K);
  assert.deepEqual([...K.liste()], ['t2']);
  assert.equal(K.zahl(), 1);
  assert.equal(B.eltern(Z, 0, tiefe).length, 0);
  assert.equal(B.eltern(Z, 99, tiefe).length, 0);
});

test('Stand merken: mit key bleibt er über das Neuladen, ohne key nicht', () => {
  const { B, speicher } = lade();
  const K = B.klapp({ key: 'plan:3', anfang: ['a', 'b'] });
  K.um('a'); K.um(5);
  assert.deepEqual(JSON.parse(speicher.get('bp.baum.plan:3')), ['b', '5']);
  const K2 = B.klapp({ key: 'plan:3', anfang: ['x'] });   // gemerkter Stand geht vor Anfangsstand
  assert.ok(K2.zu('b') && K2.zu(5) && !K2.zu('x'));
  B.klapp({ anfang: ['a'] }).um('a');
  assert.equal(speicher.size, 1);
});
