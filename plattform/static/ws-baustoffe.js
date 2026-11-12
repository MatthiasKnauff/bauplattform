/* Wärmeschutz – Baustoffe und Musteraufbauten. Die Baustoffe stehen in der Datenbank (Tabelle ws_baustoff, eingebaute Werte aus
   bpcore/ws_baustoffe.json: DIN 4108-4, DIN EN ISO 10456 und Herstellerdatenblätter mit Stand und Quelle; dazu eigene des Büros).
   wsBaustoff(zeile) macht aus einer Zeile (Datenbank oder JSON) das Rechenmodell für ws-physik.js. Global: wsBaustoff, WS_VORLAGEN. */
(function (root) {
  'use strict';
  root.wsBaustoff = (r) => {
    const m = { id: r.schluessel || r.k, kat: r.kat, name: r.name, hersteller: r.hersteller || '', lambda: r.lambda, rho: r.rho, mu: r.mu == null ? 1 : r.mu, c: r.c || 1000,
      farbe: r.farbe || '#dcdcdc', quelle: r.quelle || '', stand: r.stand || '', url: r.url || '', hinweis: r.hinweis || '', herkunft: r.herkunft || 'eingebaut', aktiv: r.aktiv !== false };
    if (r.mu2 != null) m.mu2 = r.mu2;
    if (r.sd != null) m.sd = r.sd;
    if (r.holz) m.holz = r.holz === true ? 'vollholz' : r.holz;
    if (r.art === 'luft' || r.art === 'belueftet' || r.luft) m.luft = true;
    if (r.art === 'belueftet' || r.belueftet) m.belueftet = true;
    if (r.verwendet) m.verwendet = r.verwendet;
    return m;
  };
})(typeof window !== 'undefined' ? window : globalThis);
/* Musteraufbauten (12.11.2026: deutlich erweitert, gegliedert wie ein Bauteilkatalog im CAD – Wände, Decken, Dächer; Varianten je Dämmdicke).
   Schichten innen -> außen, Dicke in cm. m2/breite/abstand = Gefach mit Sparren/Ständern/Balken. gruppe = Abschnitt in der Auswahl. */
(function (root) {
  const S = (m, d, x) => ({ m, d, ...(x || {}) });
  const G = (m, d, holz, breite, abstand) => S(m, d, { m2: holz || 'holz_nadel', breite, abstand });   // Gefach
  const V = [], v = (gruppe, typ, name, schichten) => V.push({ gruppe, typ, name, schichten });
  const IP = S('putz_kalkgips', 1.5), AP = S('putz_leicht', 2), WDVS = S('putz_wdvs', 0.8);
  // ---- Außenwand · Mauerwerk monolithisch
  [['poroton_t7', 'Planziegel T7'], ['poroton_t8', 'Planziegel T8'], ['poroton_t9', 'Planziegel T9'], ['poroton_t10', 'Planziegel T10'], ['poroton_t12', 'Planziegel T12'], ['poroton_t14', 'Planziegel T14']]
    .forEach(([m, n]) => [36.5, 42.5, 49].forEach((d) => v('Außenwand · Mauerwerk monolithisch', 'wand', `${n} ${String(d).replace('.', ',')} cm, verputzt`, [IP, S(m, d), AP])));
  [['porenbeton_350', 'Porenbeton PP2-0,35'], ['porenbeton_400', 'Porenbeton PP2-0,40'], ['ytong_thermultra', 'Porenbeton ThermUltra']]
    .forEach(([m, n]) => [36.5, 42.5, 48].forEach((d) => v('Außenwand · Mauerwerk monolithisch', 'wand', `${n} ${String(d).replace('.', ',')} cm, verputzt`, [IP, S(m, d), AP])));
  v('Außenwand · Mauerwerk monolithisch', 'wand', 'Leichtbeton-Mauerstein (Bims) 36,5 cm, Wärmedämmputz 6 cm', [IP, S('bims', 36.5), S('putz_waermedaemm_t1', 6)]);
  // ---- Außenwand · Mauerwerk / Beton mit WDVS
  const TRAG = [['ks_1800', 17.5, 'KS 17,5'], ['hlz_1200', 17.5, 'Hlz 17,5'], ['beton_stb', 20, 'Stahlbeton 20'], ['porenbeton_400', 24, 'Porenbeton 24']];
  const WD = [['eps_035', 'EPS 035', [12, 14, 16, 20, 24]], ['eps_031', 'EPS 031', [12, 16, 20]], ['mw_fassade_035', 'Mineralwolle 035', [14, 16, 20]], ['wf_040_platte', 'Holzfaser 040', [12, 16, 20]], ['phenol_021', 'Phenolharz 021', [8, 10, 12]]];
  TRAG.forEach(([t, td, tn]) => WD.forEach(([m, mn, ds]) => ds.forEach((d) => v('Außenwand · Mauerwerk/Beton mit WDVS', 'wand', `${tn} + WDVS ${mn} ${d} cm`, [S('putz_kalkgips', 1), S(t, td), S(m, d), WDVS]))));
  // ---- Außenwand · zweischalig (Kerndämmung, Luftschicht)
  [10, 12, 14, 16, 18].forEach((d) => v('Außenwand · zweischalig', 'wand', `KS 17,5 + Kerndämmung MW 035 ${d} cm + Verblender 11,5`, [IP, S('ks_1800', 17.5), S('mw_035', d), S('ziegel_2000', 11.5)]));
  [12, 14, 16].forEach((d) => v('Außenwand · zweischalig', 'wand', `Hlz 17,5 + Kerndämmung EPS 035 ${d} cm + Verblender 11,5`, [IP, S('hlz_1200', 17.5), S('eps_035', d), S('ziegel_2000', 11.5)]));
  [8, 10, 12].forEach((d) => v('Außenwand · zweischalig', 'wand', `KS 17,5 + MW 035 ${d} cm + Luftschicht 4 + Verblender (belüftet)`, [IP, S('ks_1800', 17.5), S('mw_035', d), S('luft_belueftet', 4), S('ziegel_2000', 11.5)]));
  // ---- Außenwand · hinterlüftete Fassade
  [[ 'ks_1800', 17.5, 'KS 17,5'], ['beton_stb', 20, 'Stahlbeton 20']].forEach(([t, td, tn]) => [14, 16, 20, 24].forEach((d) => v('Außenwand · hinterlüftete Fassade', 'wand', `${tn} + MW 035 ${d} cm + Faserzement hinterlüftet`, [IP, S(t, td), S('mw_035', d, { m2: 'holz_nadel', breite: 6, abstand: 62.5 }), S('luft_belueftet', 4), S('faserzement', 0.8)])));
  [16, 20].forEach((d) => v('Außenwand · hinterlüftete Fassade', 'wand', `KS 17,5 + MW 035 ${d} cm + Holzschalung hinterlüftet`, [IP, S('ks_1800', 17.5), S('mw_035', d, { m2: 'holz_nadel', breite: 6, abstand: 62.5 }), S('luft_belueftet', 3), S('schalung', 2.4)]));
  // ---- Außenwand · Holzbau
  [16, 20, 24].forEach((d) => {
    v('Außenwand · Holzbau', 'wand', `Holzrahmen ${d} MW 035 + Holzfaser 6 + hinterlüftet`, [S('gkb', 1.25), S('osb', 1.5), G('mw_035', d, 'holz_nadel', 6, 62.5), S('wf_050_unterdeck', 6), S('luft_belueftet', 3), S('schalung', 2.4)]);
    v('Außenwand · Holzbau', 'wand', `Holzrahmen ${d} Zellulose + Holzfaser-Putzträger 6, verputzt`, [S('gf', 1.25), S('osb', 1.8), G('zellulose_038', d, 'holz_nadel', 6, 62.5), S('wf_046_putz', 6), S('putz_wdvs', 0.8)]);
    v('Außenwand · Holzbau', 'wand', `Holzrahmen ${d} Holzfaser flex + Installationsebene 6`, [S('gkb', 1.25), G('wf_038', 6, 'holz_nadel', 6, 62.5), S('osb', 1.5), G('gutex_thermoflex', d, 'holz_nadel', 6, 62.5), S('wf_050_unterdeck', 6), S('luft_belueftet', 3), S('schalung', 2.4)]);
  });
  [16, 20, 24].forEach((d) => v('Außenwand · Holzbau', 'wand', `Brettsperrholz 10 + Holzfaser ${d} cm, verputzt`, [S('brettsperrholz', 10), S('wf_040_platte', d), S('putz_wdvs', 0.8)]));
  // ---- Außenwand · Bestand und Innendämmung
  [[24, 'Vollziegel 24'], [36.5, 'Vollziegel 36,5'], [49, 'Vollziegel 49']].forEach(([d, n]) => v('Außenwand · Bestand', 'wand', `${n} (Bestand), verputzt`, [S('putz_kalk', 1.5), S('vmz', d), S('putz_kalkzement', 2)]));
  v('Außenwand · Bestand', 'wand', 'Bimsstein 30 (Bestand, 1950er)', [S('putz_kalk', 1.5), S('bims', 30), S('putz_kalkzement', 2)]);
  v('Außenwand · Bestand', 'wand', 'Sandstein 50 (Bestand)', [S('putz_kalk', 2), S('naturstein_sand', 50)]);
  v('Außenwand · Bestand', 'wand', 'Fachwerk mit Lehmausfachung 14 (Bestand)', [S('putz_lehm', 2), S('lehmstein', 14, { m2: 'holz_laub', breite: 14, abstand: 90 }), S('putz_kalk', 2)]);
  [[4, 'wf_040_platte', 'Holzfaser'], [6, 'wf_040_platte', 'Holzfaser'], [8, 'wf_040_platte', 'Holzfaser'], [6, 'multipor_042', 'Mineraldämmplatte'], [8, 'multipor_042', 'Mineraldämmplatte'], [10, 'multipor_042', 'Mineraldämmplatte']]
    .forEach(([d, m, n]) => v('Außenwand · Innendämmung', 'wand', `Innendämmung ${n} ${d} cm auf Vollziegel 36,5`, [S(m === 'multipor_042' ? 'putz_kalk' : 'putz_lehm', 1), S(m, d), S('putz_kalk', 1), S('vmz', 36.5), S('putz_kalkzement', 2)]));
  // ---- Wand gegen Erdreich / gegen unbeheizt
  [8, 10, 12, 16, 20].forEach((d) => v('Wand gegen Erdreich', 'erdwand', `Stahlbeton 25 + Perimeterdämmung XPS ${d} cm`, [S('putz_kalkzement', 1), S('beton_stb', 25), S('bitumen_bahn', 0.5), S('xps_035', d)]));
  [12, 16].forEach((d) => v('Wand gegen Erdreich', 'erdwand', `KS 24 + Perimeterdämmung XPS ${d} cm`, [S('putz_kalkzement', 1), S('ks_2000', 24), S('bitumen_bahn', 0.5), S('xps_035', d)]));
  v('Wand gegen Erdreich', 'erdwand', 'Stahlbeton 25 + Schaumglas 12 cm', [S('beton_stb', 25), S('bitumen_bahn', 0.5), S('schaumglas', 12)]);
  [8, 10, 12].forEach((d) => v('Wand gegen unbeheizt', 'innenwand', `KS 17,5 + MW 035 ${d} cm (kalte Seite)`, [IP, S('ks_1800', 17.5), S('mw_035', d), S('gkb', 1.25)]));
  [17.5, 24].forEach((d) => v('Wand gegen unbeheizt', 'innenwand', `Planziegel T10 ${String(d).replace('.', ',')} cm, beidseitig verputzt`, [IP, S('poroton_t10', d), IP]));
  // ---- Bodenplatte gegen Erdreich (oben -> unten)
  [8, 10, 12].forEach((d) => {
    v('Bodenplatte', 'bodenplatte', `Fliesen, Estrich, EPS 035 ${d} cm über der Platte, Stahlbeton 25`, [S('fliesen', 1), S('estrich_zement', 6.5), S('pe_trenn', 0.02), S('eps_035', d), S('beton_stb', 25)]);
    v('Bodenplatte', 'bodenplatte', `Parkett, Estrich, Trittschall 3 + XPS ${d} cm unter der Platte`, [S('parkett', 1.5), S('estrich_zement', 6.5), S('trittschall_mw', 3), S('beton_stb', 25), S('xps_035', d)]);
  });
  [12, 16, 20].forEach((d) => v('Bodenplatte', 'bodenplatte', `Estrich, PUR 023 ${d} cm über der Platte, Stahlbeton 25`, [S('fliesen', 1), S('estrich_zement', 6.5), S('pur_023', d), S('beton_stb', 25)]));
  v('Bodenplatte', 'bodenplatte', 'Bestand: Estrich auf Betonplatte ohne Dämmung', [S('fliesen', 1), S('estrich_zement', 5), S('beton_normal', 15)]);
  // ---- Kellerdecke / Decke gegen unbeheizt oder Außenluft (oben -> unten)
  [8, 10, 12, 14].forEach((d) => v('Kellerdecke', 'kellerdecke', `Estrich, Trittschall 3, Stahlbeton 20 + unterseitig MW 035 ${d} cm`, [S('parkett', 1.5), S('estrich_zement', 6.5), S('trittschall_mw', 3), S('beton_stb', 20), S('mw_035', d)]));
  [8, 10, 12].forEach((d) => v('Kellerdecke', 'kellerdecke', `Bestand Stahlbeton 16 + unterseitig Mineraldämmplatte ${d} cm`, [S('fliesen', 1), S('estrich_zement', 5), S('beton_stb', 16), S('mineralschaum', d)]));
  [12, 16, 20].forEach((d) => v('Decke gegen Außenluft', 'decke_aussen', `Stahlbeton 20 + unterseitig MW 035 ${d} cm, verputzt (Durchfahrt)`, [S('parkett', 1.5), S('estrich_zement', 6.5), S('trittschall_mw', 3), S('beton_stb', 20), S('mw_fassade_035', d), S('putz_wdvs', 0.8)]));
  // ---- Oberste Geschossdecke (unten -> oben = innen -> außen)
  [16, 20, 24, 30].forEach((d) => v('Oberste Geschossdecke', 'ogd', `Stahlbeton 18 + EPS 035 ${d} cm + OSB begehbar`, [S('putz_kalkgips', 1), S('beton_stb', 18), S('eps_035', d), S('osb', 2.2)]));
  [20, 24, 30].forEach((d) => v('Oberste Geschossdecke', 'ogd', `Holzbalkendecke mit Zellulose ${d} cm, OSB begehbar`, [S('gkb', 1.25), S('dampfbremse_2', 0.02), G('zellulose_038', d, 'holz_nadel', 10, 80), S('osb', 2.2)]));
  // ---- Steildach (innen -> außen; über der Hinterlüftung zählt nichts mehr)
  const DECK = S('dachziegel', 2), HL = S('luft_belueftet', 4);
  [16, 18, 20, 22, 24].forEach((d) => {
    v('Steildach · Zwischensparren', 'steildach', `Zwischensparren MW 035 ${d} cm + Holzfaser-Unterdeck 6`, [S('gkb', 1.25), S('dampfbremse_2', 0.02), G('mw_035', d, 'holz_nadel', 8, 70), S('wf_050_unterdeck', 6), HL, DECK]);
    v('Steildach · Zwischensparren', 'steildach', `Zwischensparren MW 035 ${d} cm + Untersparren 6 + Unterdeckbahn`, [S('gkb', 1.25), G('mw_035', 6, 'holz_nadel', 5, 62.5), S('dampfbremse_2', 0.02), G('mw_035', d, 'holz_nadel', 8, 70), S('unterdeckbahn', 0.05), HL, DECK]);
  });
  [16, 20, 24].forEach((d) => v('Steildach · Zwischensparren', 'steildach', `Zwischensparren Holzfaser flex ${d} cm + Holzfaser 8`, [S('gf', 1.25), S('proclima_intello', 0.02), G('gutex_thermoflex', d, 'holz_nadel', 8, 70), S('gutex_multitherm', 8), HL, DECK]));
  [10, 12, 14, 16, 18].forEach((d) => v('Steildach · Aufsparren', 'steildach', `Aufsparren PIR ${d} cm auf Schalung, Sparren sichtbar`, [S('schalung', 2.4), S('dampfsperre_100', 0.05), S('bauder_pir_sf', d), HL, DECK]));
  [16, 20, 24].forEach((d) => v('Steildach · Aufsparren', 'steildach', `Aufsparren Holzfaser ${d} cm auf Schalung`, [S('schalung', 2.4), S('proclima_intello', 0.02), S('gutex_ultratherm', d), HL, DECK]));
  v('Steildach · Bestand', 'steildach', 'Bestand: Sparren 12 mit MW 040 8 cm, Gipskarton', [S('gkb', 1.25), G('mw_040', 8, 'holz_nadel', 8, 80), S('luft_ruhend', 4), HL, DECK]);
  v('Steildach · Bestand', 'steildach', 'Bestand: Sparren 14 ungedämmt, Lattung, Ziegel', [S('gkb', 1.25), G('luft_ruhend', 14, 'holz_nadel', 8, 80), HL, DECK]);
  // ---- Flachdach (innen -> außen)
  [14, 16, 20, 24, 28].forEach((d) => v('Flachdach · Warmdach', 'flachdach', `Stahlbeton 20 + Dampfsperre + EPS 035 ${d} cm + Abdichtung`, [S('putz_kalkgips', 1), S('beton_stb', 20), S('bitumen_dsp', 0.4), S('eps_035', d), S('bitumen_bahn', 1)]));
  [10, 12, 14, 16, 20].forEach((d) => v('Flachdach · Warmdach', 'flachdach', `Stahlbeton 20 + Dampfsperre + PIR 023 ${d} cm + Kunststoffbahn`, [S('putz_kalkgips', 1), S('beton_stb', 20), S('bitumen_dsp', 0.4), S('pur_023', d), S('fpo', 0.2)]));
  [12, 16, 20].forEach((d) => v('Flachdach · Warmdach', 'flachdach', `Stahlbeton 20 + Schaumglas ${d} cm (verklebt) + Abdichtung`, [S('putz_kalkgips', 1), S('beton_stb', 20), S('schaumglas', d), S('bitumen_bahn', 1)]));
  [16, 20, 24].forEach((d) => v('Flachdach · Umkehrdach', 'flachdach', `Stahlbeton 20 + Abdichtung + XPS ${d} cm + Kies 5`, [S('putz_kalkgips', 1), S('beton_stb', 20), S('bitumen_bahn', 1), S('xps_030', d), S('kies', 5)]));
  [16, 20].forEach((d) => v('Flachdach · Gründach', 'flachdach', `Stahlbeton 20 + PIR ${d} cm + Abdichtung + Extensivbegrünung`, [S('putz_kalkgips', 1), S('beton_stb', 20), S('bitumen_dsp', 0.4), S('pur_023', d), S('bitumen_bahn', 1), S('erdreich', 8)]));
  [20, 24].forEach((d) => v('Flachdach · Holz', 'flachdach', `Holzbalken ${d} MW 035 + Aufdach PIR 6 + Abdichtung (unbelüftet)`, [S('gkb', 1.25), S('proclima_intello', 0.02), G('mw_035', d, 'holz_nadel', 8, 62.5), S('osb', 2.2), S('pur_023', 6), S('bitumen_bahn', 1)]));
  v('Flachdach · Holz', 'flachdach', 'Holzbalken 24 Zellulose, belüftet über Konterlattung', [S('gkb', 1.25), S('dampfbremse_2', 0.02), G('zellulose_038', 24, 'holz_nadel', 8, 62.5), S('wf_050_unterdeck', 2.2), S('luft_belueftet', 6), S('schalung', 2.4), S('bitumen_bahn', 1)]);
  root.WS_VORLAGEN = V;
})(typeof window !== 'undefined' ? window : globalThis);
