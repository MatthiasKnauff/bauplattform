// Rechnung prüfen im Dokument (ava-aufmass.js amHkWeiter, ava-dokument.js amKorrekturen/amZeileY – GO 17.11.2026 K1 L1 N1).
// Geprüft: Antippen ✔ → ✘ → leer auf freier Stelle und auf errechneten Zeichen; Werte an Ort und Stelle; Prüfzeichen auf der Zeile mit den Zahlen.
//
// Aufruf:  node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url)), STAT = path.resolve(HIER, '../../../plattform/static');
const am = fs.readFileSync(path.join(STAT, 'ava-aufmass.js'), 'utf8');
const stueck = (name) => { const a = am.indexOf(name); assert.ok(a >= 0, name + ' fehlt'); return am.slice(a, am.indexOf('\n', am.indexOf('\n}', a) + 1)); };
const zeile = (name) => { const a = am.indexOf(name); return am.slice(a, am.indexOf('\n', a)); };
const ctx = { console, nf: (v) => String(v).replace('.', ','), nf2: (v) => v.toFixed(2).replace('.', ','), L: { calc: { aufmass: { p2: 70 } }, vergabe: { preise: { p2: 75 } } } };
vm.createContext(ctx);
vm.runInContext([zeile('const hkNah'), zeile('const hkTeil'), stueck('function amHkWeiter'), zeile('function amSummen'),
  fs.readFileSync(path.join(STAT, 'ava-dokument.js'), 'utf8').replace(/document\.addEventListener[\s\S]*?\n\}\);\n/g, '')].join('\n') + '\nthis.W = amHkWeiter; this.K = amKorrekturen; this.Y = amZeileY;', ctx);
const gl = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, m);
const kl = (...c) => ({ classList: { contains: (x) => c.includes(x) } });

test('freie Stelle: ✔ → ✘ → weg', () => {
  let H = ctx.W([], '1|1|0.5|0.2', null, { auto: [] }); gl(H, ['1|1|0.5|0.2'], 'Haken');
  H = ctx.W(H, H[0], kl('hk'), { auto: [] }); gl(H, ['1|1|0.5|0.2|k'], 'Kreuz');
  H = ctx.W(H, H[0], kl('hk', 'kz'), { auto: [] }); gl(H, [], 'weg');
});

test('errechneter grüner Haken: ✘ → leer → ✔', () => {
  const V = { auto: [[1, 1, 0.3]] };
  let H = ctx.W([], '1|1|0.3000|0.9', kl('ok'), V); gl(H, ['1|1|0.3000|0.9|k'], 'Kreuz statt grünem Haken');
  H = ctx.W(H, H[0], kl('hk', 'kz'), V); gl(H, ['1|1|0.3000|0.9|w'], 'leer – das errechnete Zeichen bleibt weg');
  H = ctx.W(H, '1|1|0.3010|0.88', null, V); gl(H, ['1|1|0.3000|0.9'], 'noch mal: wieder ein Haken');
});

test('Werte an Ort und Stelle, Zeile mit den Zahlen', () => {
  const A = { zahlen: { 1: [[0.08, 0.1, 0.1, 0.11, 90], [0.85, 0.1, 0.93, 0.11, 6750], [0.85, 0.6, 0.93, 0.61, 6750]] },
    pos: { p2: { seite: 1, box: [0.02, 0.1, 0.93, 0.55], menge: 90, ep: 75, gp: 6750 } }, kopf: { summen: [{ art: 'netto', wert: 6750, seite: 1, box: [0.85, 0.6, 0.93, 0.61] }] } };
  const K = ctx.K(A, { art: 'abschlag', status: 'offen', data: {} }, { leistung: 5250, nachlass: 0, mwst: 997.5, brutto: 6247.5, auszahlung: 6247.5 });
  gl(K.map((x) => x[2]), ['70', '5250,00', '5250,00', 'Zahlbetrag lt. Prüfung: 6247,50 €'], 'Menge, GP, Netto und Zahlbetrag');
  assert.ok(Math.abs(ctx.Y(A, A.pos.p2) - 0.105) < 1e-9, 'Prüfzeichen auf der Zeile mit den Zahlen');
});
