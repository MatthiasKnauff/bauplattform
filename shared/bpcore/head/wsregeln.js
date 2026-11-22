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

  /* Soll fürs ganze Gebäude (Mock „Schichtaufbau neu“ SA-14 … SA-17, GO 22.11.2026): EINE Wahl am Nachweis (grundlagen.soll).
     Werte je Bauteilgruppe in W/(m²K), recherchiert am 22.11.2026 – je Eintrag Quelle und Stand. „gm7“ = Höchstwert nach der Maßnahme
     am Bauteil (Anlage 7). Länder erscheinen im Ausdruck nur, wenn sie hier gewählt sind (SA-17). Gruppen: wand · dach · unten (gegen
     Erdreich/unbeheizt) · aussen (Decke über Außenluft) · fenster · dachfenster · tuer. z12 = Werte bei 12 bis < 19 °C, wenn die Quelle sie nennt. */
  const SG = { wand: 'wand', steildach: 'dach', flachdach: 'dach', ogd: 'dach', kellerdecke: 'unten', bodenplatte: 'erde', erdwand: 'erde', innenwand: 'unten', decke_aussen: 'aussen',
    fenster: 'fenster', dachfenster: 'dachfenster', tuer: 'tuer', lichtkuppel: 'dachfenster' };
  const refMal = (f) => Object.fromEntries(Object.entries(REF).map(([k, v]) => [k, Math.round(v * f * 100) / 100]));
  const SOLL = [
    { k: 'gm7', land: 'DE', gruppe: 'Deutschland', n: 'GModG Anlage 7 – Änderung im Bestand', kurz: 'GModG', quelle: 'GModG § 36 mit Anlage 7 (Höchstwert je Maßnahme am Bauteil)', stand: '29.07.2026' },
    { k: 'ref', land: 'DE', gruppe: 'Deutschland', n: 'GModG Neubau – Referenzgebäude (Anlage 1)', kurz: 'Ref.', quelle: 'GModG Anlage 1 Nr. 1.1–1.7 (Referenzausführung; der Neubau wird eigentlich über H′T nachgewiesen)', stand: '29.07.2026', typ: { ...REF } },
    { k: 'beg', land: 'DE', gruppe: 'Deutschland', n: 'BEG Einzelmaßnahme – Fördergrenze', kurz: 'BEG', quelle: 'Richtlinie BEG EM, Anlage Technische Mindestanforderungen Nr. 1.1 (Werte unverändert seit BAnz AT 29.12.2023 B1)', stand: '17.07.2026',
      g: { wand: 0.20, dach: 0.14, unten: 0.25, erde: 0.25, aussen: 0.20, fenster: 0.95, dachfenster: 1.0, tuer: 1.3 }, typ: { erdwand: 0.25, innenwand: 0.25 },
      z12: { wand: 0.25, dach: 0.25, unten: 0.25, erde: 0.25, aussen: 0.25, fenster: 1.3, dachfenster: 1.1, tuer: 1.6 }, z12typ: { flachdach: 0.20 } },
    { k: 'eh55', land: 'DE', gruppe: 'Deutschland', n: 'Effizienzhaus 55 – Orientierung je Bauteil', kurz: 'EH55', quelle: 'Referenzgebäude × 0,70 – Effizienzhaus 55: H′T höchstens 70 % des Referenzgebäudes; gilt fürs ganze Gebäude, je Bauteil nur Orientierung', stand: '22.11.2026', typ: refMal(0.70) },
    { k: 'eh40', land: 'DE', gruppe: 'Deutschland', n: 'Effizienzhaus 40 – Orientierung je Bauteil', kurz: 'EH40', quelle: 'Referenzgebäude × 0,55 – Effizienzhaus 40: H′T höchstens 55 % des Referenzgebäudes; gilt fürs ganze Gebäude, je Bauteil nur Orientierung', stand: '22.11.2026', typ: refMal(0.55) },
    { k: 'ph', land: 'DE', gruppe: 'Freiwillig', n: 'Passivhaus – Richtwerte', kurz: 'PH', quelle: 'Passivhaus Institut: Fenster Uw ≤ 0,80 (Merkblatt Fenster); opake Hülle ≤ 0,15 als Planungsrichtwert', stand: '22.11.2026',
      g: { wand: 0.15, dach: 0.15, unten: 0.15, erde: 0.15, aussen: 0.15, fenster: 0.80, dachfenster: 0.80, tuer: 0.80 } },
    { k: 'at', land: 'AT', gruppe: 'Nachbarländer', n: 'Österreich – OIB-Richtlinie 6, Neubau', kurz: 'AT', quelle: 'OIB-Richtlinie 6, Pkt. 4.4.1 (OIB-330.6-009/15)', stand: 'Ausgabe 2015',
      g: { wand: 0.35, dach: 0.20, unten: 0.40, erde: 0.40, aussen: 0.20, fenster: 1.40, dachfenster: 1.70, tuer: 1.70 } },
    { k: 'ch', land: 'CH', gruppe: 'Nachbarländer', n: 'Schweiz – MuKEn 2014, Neubau / neue Bauteile', kurz: 'CH', quelle: 'MuKEn 2014 Anhang 1 (Einzelbauteilnachweis, gegen Außenklima bzw. unbeheizt/Erdreich > 2 m)', stand: 'MuKEn 2014',
      g: { wand: 0.17, dach: 0.17, unten: 0.25, erde: 0.17, aussen: 0.17, fenster: 1.0, dachfenster: 1.0, tuer: 1.2 } },
    { k: 'chum', land: 'CH', gruppe: 'Nachbarländer', n: 'Schweiz – MuKEn 2014, Umbau', kurz: 'CH Umbau', quelle: 'MuKEn 2014 Anhang 2 (Umbauten und Umnutzungen)', stand: 'MuKEn 2014',
      g: { wand: 0.25, dach: 0.25, unten: 0.28, erde: 0.25, aussen: 0.25, fenster: 1.0, dachfenster: 1.0, tuer: 1.2 } },
  ];
  const sollVon = (k) => SOLL.find((x) => x.k === k) || SOLL[0];
  /* Höchstwert eines Bauteils nach dem gewählten Soll (gm7: nach der Maßnahme am Bauteil) */
  function sollUmax(b, sollK, zone) {
    const S = sollVon(sollK), z12 = (b.zone || zone) === '12';
    if (S.k === 'gm7') return umax(b.typ, b.massnahme, b.zone || zone);
    const g = SG[b.typ] || 'wand';
    if (z12 && S.z12) return (S.z12typ && S.z12typ[b.typ] != null) ? S.z12typ[b.typ] : S.z12[g] != null ? S.z12[g] : null;
    if (S.typ && S.typ[b.typ] != null) return S.typ[b.typ];
    return S.g && S.g[g] != null ? S.g[g] : null;
  }
  /* Bewertung bezogen aufs Soll (SA-15): 0 ✓✓ deutlich besser (≤ 80 %) · 1 ✓ erfüllt · 2 ⚠ knapp drüber (bis +10 %) · 3 ✗ nicht erfüllt (bis +50 %) · 4 ✗✗ weit drüber */
  const STUFEN = [['✓✓', 'deutlich besser'], ['✓', 'erfüllt'], ['⚠', 'knapp drüber'], ['✗', 'nicht erfüllt'], ['✗✗', 'weit drüber']];
  function stufe(u, um) {
    if (u == null || um == null) return null;
    const q = (Math.round(u * 100) / 100) / um;
    const s = q <= 0.8 + 1e-9 ? 0 : q <= 1 + 1e-9 ? 1 : q <= 1.1 + 1e-9 ? 2 : q <= 1.5 + 1e-9 ? 3 : 4;
    return { s, zeichen: STUFEN[s][0], text: STUFEN[s][1], prozent: Math.round(q * 100) };
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
    let kopf = null;   // Gefach in Flucht übernimmt Breite und Abstand vom Gefach davor (SA-10)
    return { typ: b.typ, schichten: (b.schichten || []).map((s) => {
      const y = { mat: mat(s), d: (+s.d || 0) / 100 };
      if (s.m2) {
        const q = s.gl === 'flucht' && kopf ? kopf : s;
        if (q.breite > 0 && q.abstand > 0) { y.mat2 = finde(s.m2) || null; y.anteil2 = Math.min(1, q.breite / q.abstand); if (q !== s) y.flucht = true; }
        if (q === s) kopf = s;
      }
      if (y.mat.belueftet) y.belueftet = true;
      return y;
    }) };
  }
  /* Ergebnis eines Bauteils: U-Wert, Höchstwert, erfüllt? (Fenster/Türen: U aus dem Datenblatt) */
  function pruefe(b, zone, physik, soll) {
    const P = physik || root.WSP;
    const um = sollUmax(b, soll || 'gm7', zone);
    if (ohneSchichten(b.typ)) { const u = b.uw > 0 ? +b.uw : null; return { u, umax: um, ok: u == null ? null : um == null ? true : u <= um + 1e-9, stufe: stufe(u, um) }; }
    if (!(b.schichten || []).length) return { u: null, umax: um, ok: null };
    const r = P.berechne(aufbau(b));
    const u = r.u.u;
    return { u, umax: um, ok: um == null ? true : Math.round(u * 100) / 100 <= um + 1e-9, r, stufe: stufe(u, um) };
  }
  root.WS_REGELN = { TYPEN, A7, REF, SOLL, SG, sollVon, sollUmax, stufe, STUFEN, massnahmen, umax, anforderung, aufbau, pruefe, ohneSchichten };
})(typeof window !== 'undefined' ? window : globalThis);
