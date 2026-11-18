/* Wärmeschutz – Regeln: Höchstwerte der Wärmedurchgangskoeffizienten bei Änderung bestehender Gebäude (GModG § 36, Anlage 7;
   bis 28.07.2026 GEG § 48 Anlage 7 – Werte unverändert) und die Umrechnung der gespeicherten Schichten in das Rechenmodell (bp/wsphysik.js).
   Global: WS_REGELN. Läuft im Browser und im Test (node). */
(function (root) {
  'use strict';
  // Bauteilarten: Schlüssel wie bp/wsphysik.js BAUTEILTYPEN, dazu Fenster und Türen (U-Wert aus dem Datenblatt, keine Schichten)
  const TYPEN = [
    ['wand', 'Außenwand', 'AW'], ['steildach', 'Steildach / Dachschräge', 'D'], ['flachdach', 'Flachdach', 'FD'], ['ogd', 'Oberste Geschossdecke', 'OGD'],
    ['kellerdecke', 'Kellerdecke (gegen unbeheizt)', 'KD'], ['bodenplatte', 'Bodenplatte gegen Erdreich', 'BP'], ['erdwand', 'Wand gegen Erdreich', 'EW'],
    ['decke_aussen', 'Decke nach unten gegen Außenluft', 'DA'], ['innenwand', 'Wand gegen unbeheizt', 'IW'], ['fenster', 'Fenster / Fenstertür', 'F'], ['tuer', 'Außentür', 'T']];
  // Anlage 7: [Nr., Maßnahme, U max bei ≥ 19 °C, U max bei 12 bis < 19 °C (null = keine Anforderung), Größe]
  const A7 = {
    wand: [['1a', 'Ersatz oder erstmaliger Einbau', 0.24, 0.35], ['1b', 'Dämmung, Bekleidung, Vorsatzschale außen oder Außenputz erneuern', 0.24, 0.35]],
    dach: [['5a', 'Dachfläche (auch Gauben), Decke/Wand gegen unbeheizten Dachraum – Ersatz/Einbau', 0.24, 0.35],
      ['5b', 'Dachdeckung mit Lattung/Schalung neu oder Dämmung auf der kalten Seite', 0.24, 0.35], ['5c', 'Abdichtung der Dachfläche ersetzt', 0.20, 0.35]],
    unten: [['6a', 'gegen Erdreich/unbeheizt – Ersatz oder Einbau', 0.30, null], ['6b', 'außen Bekleidung, Feuchtesperre, Drainage oder Deckenbekleidung kalte Seite', 0.30, null],
      ['6c', 'Fußbodenaufbau auf der beheizten Seite', 0.50, null]],
    aussen: [['6d', 'Decke nach unten zur Außenluft – Ersatz oder Einbau', 0.24, 0.35], ['6e', 'Decke nach unten zur Außenluft – Bekleidung kalte Seite', 0.24, 0.35]],
    fenster: [['2a', 'Fenster, Fenstertür – Ersatz, Einbau, Vor-/Innenfenster (Uw)', 1.3, 1.9], ['2b', 'Dachflächenfenster (Uw)', 1.4, 1.9], ['2c', 'nur Verglasung ersetzt (Ug)', 1.1, null],
      ['2d', 'Pfosten-Riegel-Fassade (Uc)', 1.5, 1.9], ['2e', 'Glasdach (Uw/Ug)', 2.0, 2.7], ['2f', 'Fenstertür mit Klapp-, Falt-, Schiebe-, Hebemechanismus (Uw)', 1.6, 1.9],
      ['3a', 'mit Sonderverglasung (Uw)', 2.0, 2.8], ['3b', 'Sonderverglasung ersetzt (Ug)', 1.6, null], ['3c', 'Vorhangfassade mit Sonderverglasung (Uc)', 2.3, 3.0]],
    tuer: [['4', 'Außentür neu (Türfläche)', 1.8, 1.8]],
  };
  // Referenzgebäude Wohngebäude (GModG Anlage 1, Nr. 1.1–1.7; geprüft 18.11.2026) – Maßstab für Neubauten in der Bauteilliste (U-Werte, UW-B1)
  const REF = { wand: 0.28, erdwand: 0.35, bodenplatte: 0.35, kellerdecke: 0.35, innenwand: 0.35, steildach: 0.20, flachdach: 0.20, ogd: 0.20,
    decke_aussen: 0.28, fenster: 1.3, dachfenster: 1.4, lichtkuppel: 2.7, tuer: 1.8 };
  const GRUPPE = { wand: 'wand', innenwand: 'unten', erdwand: 'unten', steildach: 'dach', flachdach: 'dach', ogd: 'dach', kellerdecke: 'unten', bodenplatte: 'unten', decke_aussen: 'aussen', fenster: 'fenster', tuer: 'tuer' };
  const massnahmen = (typ) => (A7[GRUPPE[typ] || 'wand'] || []).map(([k, n, u19, u12]) => ({ k, n, u19, u12 }));
  function umax(typ, k, zone) {
    const x = massnahmen(typ).find((y) => y.k === k);
    if (!x) return null;
    return zone === '12' ? x.u12 : x.u19;
  }
  const ohneSchichten = (typ) => typ === 'fenster' || typ === 'tuer' || typ === 'dachfenster' || typ === 'lichtkuppel';
  /* Anforderung für die Farbe in der Bauteilliste: Neubau → Referenzgebäude (Anlage 1), sonst Höchstwert bei Änderung (Anlage 7, ≥ 19 °C,
     Flachdach mit neuer Abdichtung 5c, Dachflächenfenster 2b, Glasdach 2e) */
  function anforderung(typ, neubau) {
    if (neubau) return REF[typ] != null ? { u: REF[typ], quelle: 'GModG Anlage 1 (Referenzgebäude, Neubau)' } : null;
    const k = { flachdach: '5c', dachfenster: '2b', lichtkuppel: '2e' }[typ];
    const t = { dachfenster: 'fenster', lichtkuppel: 'fenster' }[typ] || typ;
    const x = k ? massnahmen(t).find((y) => y.k === k) : massnahmen(t)[0];
    return x ? { u: x.u19, quelle: `GModG Anlage 7 Nr. ${x.k} (Änderung im Bestand)` } : null;
  }

  /* Gespeicherte Schichten (d in cm, Baustoff-Schlüssel, Gefach m2 mit Breite/Abstand) → Rechenmodell (d in m, mat-Objekte) */
  function aufbau(b, baustoffe) {
    const M = baustoffe || root.WS_BAUSTOFFE || [];
    const finde = (id) => M.find((x) => x.id === id);
    const mat = (s) => {
      const basis = finde(s.m) || { id: 'eigen', name: s.name || 'Eigener Baustoff', lambda: 0.04, rho: 100, mu: 1, c: 1000, farbe: '#dcdcdc' };
      const x = { ...basis };
      if (s.lam > 0) x.lambda = s.lam;
      if (s.mu != null) x.mu = s.mu;
      if (s.sd != null) x.sd = s.sd;
      if (s.name) x.name = s.name;
      return x;
    };
    return { typ: b.typ, schichten: (b.schichten || []).map((s) => {
      const y = { mat: mat(s), d: (+s.d || 0) / 100 };
      if (s.m2 && s.breite > 0 && s.abstand > 0) { y.mat2 = finde(s.m2) || null; y.anteil2 = Math.min(1, s.breite / s.abstand); }
      if (y.mat.belueftet) y.belueftet = true;
      return y;
    }) };
  }
  /* Ergebnis eines Bauteils: U-Wert, Höchstwert, erfüllt? (Fenster/Türen: U aus dem Datenblatt) */
  function pruefe(b, zone, physik) {
    const P = physik || root.WSP;
    const um = umax(b.typ, b.massnahme, b.zone || zone);
    if (ohneSchichten(b.typ)) { const u = b.uw > 0 ? +b.uw : null; return { u, umax: um, ok: u == null ? null : um == null ? true : u <= um + 1e-9 }; }
    if (!(b.schichten || []).length) return { u: null, umax: um, ok: null };
    const r = P.berechne(aufbau(b));
    const u = r.u.u;
    return { u, umax: um, ok: um == null ? true : Math.round(u * 100) / 100 <= um + 1e-9, r };
  }
  root.WS_REGELN = { TYPEN, A7, REF, massnahmen, umax, anforderung, aufbau, pruefe, ohneSchichten };
})(typeof window !== 'undefined' ? window : globalThis);
