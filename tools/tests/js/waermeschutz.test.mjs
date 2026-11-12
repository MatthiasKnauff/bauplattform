// Wärmeschutz (plattform/static/ws-physik.js): U-Wert nach DIN EN ISO 6946 (auch Sparren/Ständer, belüftete Schichten, Luftschichten),
// Glaser nach DIN 4108-3, Phasenverschiebung nach DIN EN ISO 13786, fRsi – Handrechnungen und typische Werte.
// Dazu die Umrechnung der gespeicherten Schichten (ws-kern.js wsAufbau) und die Höchstwerte nach Anlage 7 GModG.
//
// Aufruf:  node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['ws-physik.js', 'ws-baustoffe.js', 'ws-regeln.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'plattform/static', f), 'utf8'), ctx);
const DB = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/bpcore/ws_baustoffe.json'), 'utf8')).baustoffe;
ctx.WS_BAUSTOFFE = DB.map((r) => ctx.wsBaustoff(r));   // wie im Browser aus der Datenbank
const W = ctx.WSP, M = ctx.WS_BAUSTOFFE;
const m = (id) => { const x = M.find((a) => a.id === id); if (!x) throw new Error(id); return x; };
const nahe = (ist, soll, tol, name) => assert.ok(Math.abs(ist - soll) <= tol, `${name}: ${ist} (soll ${soll} ± ${tol})`);

const wdvs = { typ: 'wand', schichten: [{ mat: m('putz_kalkgips'), d: 0.01 }, { mat: m('beton_stb'), d: 0.2 }, { mat: m('eps_035'), d: 0.16 }, { mat: m('putz_wdvs'), d: 0.008 }] };
const dach = { typ: 'steildach', schichten: [{ mat: m('gkb'), d: 0.0125 }, { mat: m('dampfbremse_2'), d: 0.0002 },
  { mat: m('mw_035'), d: 0.20, mat2: m('holz_nadel'), anteil2: 0.08 / 0.70 }, { mat: m('wf_050_unterdeck'), d: 0.06 }, { mat: m('luft_belueftet'), d: 0.04 }, { mat: m('dachziegel'), d: 0.02 }] };

test('U-Wert homogen = Handrechnung', () => {
  const wand = { typ: 'wand', schichten: [{ mat: m('putz_kalkgips'), d: 0.015 }, { mat: m('hlz_daemm_08'), d: 0.365 }, { mat: m('putz_leicht'), d: 0.02 }] };
  nahe(W.uWert(wand).u, 1 / (0.13 + 0.015 / 0.7 + 0.365 / 0.08 + 0.02 / 0.25 + 0.04), 1e-6, 'Ziegelwand');
  nahe(W.uWert(wdvs).u, 1 / (0.13 + 0.01 / 0.7 + 0.2 / 2.5 + 0.16 / 0.035 + 0.008 / 0.7 + 0.04), 1e-6, 'WDVS');
  assert.ok(!W.glaser(wand).tauwasser && !W.glaser(wdvs).tauwasser, 'kein Tauwasser');
});

test('Sparren, Hinterlüftung, Luftschicht', () => {
  const u = W.uWert(dach);
  assert.ok(u.rse === 0.10 && u.belueftetAb === 4, 'belüftet: Rse = Rsi, Schichten außen nicht gerechnet');
  assert.ok(u.rOben >= u.rUnten && u.fehler < 0.2, 'R\' ≥ R\'\', Fehler < 20 %');
  nahe(u.u, 0.165, 0.015, 'Dach plausibel');
  nahe(W.uWert({ typ: 'wand', schichten: [{ mat: m('mw_035'), d: 0.1, mat2: m('holz_nadel'), anteil2: 0 }] }).u, 1 / (0.13 + 0.1 / 0.035 + 0.04), 1e-9, 'Anteil 0 = homogen');
  nahe(W.rMaterial(m('luft_ruhend'), 0.04, 'horizontal'), 0.18, 1e-9, 'Luftschicht 40 mm');
});

test('Glaser, Taupunkt, Phasenverschiebung, fRsi', () => {
  const innen = { typ: 'wand', schichten: [{ mat: m('gkb'), d: 0.0125 }, { mat: m('mw_035'), d: 0.10 }, { mat: m('beton_stb'), d: 0.2 }, { mat: m('putz_kalkzement'), d: 0.02 }] };
  const g = W.glaser(innen);
  assert.ok(g.tauwasser && g.mc > 0.5, 'Innendämmung ohne Dampfbremse: Tauwasser');
  nahe(W.psat(20), 2337, 2, 'psat(20)');
  nahe(W.taupunkt(20, 0.5), 9.3, 0.1, 'Taupunkt 20 °C / 50 %');
  nahe(W.instationaer({ typ: 'wand', schichten: [{ mat: m('mw_035'), d: 0.001 }] }).dekrement, 1, 0.01, 'dünne Schicht');
  const pv = W.instationaer({ typ: 'wand', schichten: [{ mat: m('beton_normal'), d: 0.24 }] }).phasenverschiebung;
  assert.ok(pv > 6 && pv < 8, `Beton 24 cm: ${pv} h`);
  assert.ok(W.berechne(wdvs).frsi >= 0.7, 'fRsi WDVS');
});

test('Baustoffdatenbank vollständig und plausibel', () => {
  const K = new Set();
  for (const r of DB) {
    assert.ok(!K.has(r.k), 'Schlüssel doppelt: ' + r.k); K.add(r.k);
    assert.ok(r.name && r.kat && r.quelle, 'Name, Kategorie, Quelle: ' + r.k);
    if (!r.luft) assert.ok(r.lambda > 0.005 && r.lambda < 500, 'λ: ' + r.k);
    assert.ok(r.rho > 0 && r.c > 0, 'Rohdichte und c: ' + r.k);
    if (r.hersteller) assert.ok(r.url && r.url.startsWith('https://'), 'Herstellerprodukt mit Quelle: ' + r.k);
  }
  for (const v of ctx.WS_VORLAGEN) for (const s of v.schichten) { assert.ok(K.has(s.m), 'Vorlage ' + v.name + ': ' + s.m); if (s.m2) assert.ok(K.has(s.m2), s.m2); }
  assert.ok(DB.length >= 150 && DB.filter((r) => r.hersteller).length >= 20, 'genug Baustoffe');
});

test('gespeicherte Schichten → Rechenmodell, Anlage 7', () => {
  const R = ctx.WS_REGELN;
  const b = R.aufbau({ typ: 'steildach', schichten: [{ m: 'gkb', d: 1.25 }, { m: 'mw_035', d: 20, m2: 'holz_nadel', breite: 8, abstand: 70 }, { m: 'eigen', d: 4, lam: 0.04, name: 'Dämmung X' }] });
  assert.equal(b.schichten[1].d, 0.2, 'cm → m');
  nahe(b.schichten[1].anteil2, 8 / 70, 1e-9, 'Sparrenanteil');
  assert.equal(b.schichten[2].mat.lambda, 0.04, 'eigener Baustoff mit λ von Hand');
  const b2 = R.aufbau({ typ: 'wand', schichten: [{ m: 'eps_035', d: 10, lam: 0.032 }] });
  assert.equal(b2.schichten[0].mat.lambda, 0.032, 'λ von Hand überschreibt den Baustoff');
  assert.equal(R.umax('wand', '1b', '19'), 0.24);
  assert.equal(R.umax('wand', '1b', '12'), 0.35);
  assert.equal(R.umax('flachdach', '5c', '19'), 0.20);
  assert.equal(R.umax('kellerdecke', '6c', '12'), null, 'keine Anforderung');
  assert.equal(R.umax('fenster', '2a', '19'), 1.3);
  assert.ok(R.massnahmen('wand').length >= 2 && R.massnahmen('fenster').some((x) => x.k === '2b'));
});
