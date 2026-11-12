/* Wärmeschutz – Baustoffe (Richtwerte DIN 4108-4 / DIN EN ISO 10456) und Musteraufbauten, aus dem Bauteilrechner übernommen. Global: WS_BAUSTOFFE, WS_VORLAGEN. */
/* Materialdatenbank – Richtwerte nach DIN 4108-4 / DIN EN ISO 10456 bzw. typische Herstellerangaben.
 * lambda [W/(m·K)], rho [kg/m³], mu [-] (rechnerisch ungünstigerer Wert), c [J/(kg·K)]
 * Für den Nachweis immer die Werte des tatsächlich verwendeten Produkts (Bemessungswert) einsetzen!
 */
(function (root) {
  'use strict';
  const M = [
    // Putze & Mörtel
    ['putz_kalkgips', 'Putze', 'Kalkgipsputz / Gipsputz', 0.70, 1400, 10, 1000, '#efe6d6'],
    ['putz_kalk', 'Putze', 'Kalkputz', 1.00, 1800, 15, 1000, '#ece0c8'],
    ['putz_kalkzement', 'Putze', 'Kalkzementputz', 1.00, 1800, 35, 1000, '#e2d7c2'],
    ['putz_zement', 'Putze', 'Zementputz', 1.00, 2000, 35, 1000, '#d8d2c4'],
    ['putz_leicht', 'Putze', 'Leichtputz / Dämmputz', 0.25, 600, 10, 1000, '#f2ead8'],
    ['putz_wdvs', 'Putze', 'Oberputz WDVS (mineralisch)', 0.70, 1600, 25, 1000, '#f4efe4'],
    ['putz_lehm', 'Putze', 'Lehmputz', 0.91, 1700, 10, 1000, '#c9a67a'],
    ['estrich_zement', 'Putze', 'Zementestrich', 1.40, 2000, 50, 1000, '#cfcac0'],
    ['estrich_anhydrit', 'Putze', 'Calciumsulfatestrich', 1.20, 2000, 50, 1000, '#d9d5cc'],
    // Mauerwerk & Beton
    ['beton_stb', 'Mauerwerk & Beton', 'Stahlbeton (2 % Bewehrung)', 2.50, 2400, 130, 1000, '#a9a9a9'],
    ['beton_normal', 'Mauerwerk & Beton', 'Beton unbewehrt', 2.00, 2300, 130, 1000, '#b4b4b4'],
    ['beton_leicht', 'Mauerwerk & Beton', 'Leichtbeton (1200 kg/m³)', 0.54, 1200, 10, 1000, '#bcbcb4'],
    ['porenbeton_350', 'Mauerwerk & Beton', 'Porenbeton PP2-0,35', 0.09, 350, 5, 1000, '#ececec'],
    ['porenbeton_400', 'Mauerwerk & Beton', 'Porenbeton PP2-0,40', 0.10, 400, 5, 1000, '#e8e8e8'],
    ['porenbeton_500', 'Mauerwerk & Beton', 'Porenbeton PP4-0,50', 0.12, 500, 5, 1000, '#e4e4e4'],
    ['ks_1800', 'Mauerwerk & Beton', 'Kalksandstein 1800', 0.99, 1800, 25, 1000, '#e7e3da'],
    ['ks_2000', 'Mauerwerk & Beton', 'Kalksandstein 2000', 1.10, 2000, 25, 1000, '#ddd8cc'],
    ['vmz', 'Mauerwerk & Beton', 'Vollziegel / Klinker (1800)', 0.81, 1800, 10, 1000, '#b5523b'],
    ['hlz_1200', 'Mauerwerk & Beton', 'Hochlochziegel HLz 1200', 0.50, 1200, 10, 1000, '#c4674c'],
    ['hlz_daemm_08', 'Mauerwerk & Beton', 'Wärmedämmziegel λ 0,08', 0.08, 650, 5, 1000, '#cf7a5c'],
    ['hlz_daemm_10', 'Mauerwerk & Beton', 'Wärmedämmziegel λ 0,10', 0.10, 700, 5, 1000, '#cc7558'],
    ['hlz_daemm_12', 'Mauerwerk & Beton', 'Hochlochziegel λ 0,12', 0.12, 750, 5, 1000, '#c87054'],
    ['hlz_daemm_14', 'Mauerwerk & Beton', 'Hochlochziegel λ 0,14', 0.14, 800, 5, 1000, '#c46b50'],
    ['bims', 'Mauerwerk & Beton', 'Leichtbetonstein (Bims) 800', 0.29, 800, 5, 1000, '#b8b2a2'],
    ['naturstein_sand', 'Mauerwerk & Beton', 'Sandstein', 2.30, 2600, 30, 1000, '#c8b48c'],
    ['naturstein_granit', 'Mauerwerk & Beton', 'Granit', 2.80, 2700, 10000, 1000, '#8e8a86'],
    ['lehmstein', 'Mauerwerk & Beton', 'Lehmstein 1600', 0.73, 1600, 10, 1000, '#b28a5e'],
    // Dämmstoffe
    ['mw_032', 'Dämmstoffe', 'Mineralwolle WLS 032', 0.032, 30, 1, 1030, '#f5df73'],
    ['mw_035', 'Dämmstoffe', 'Mineralwolle WLS 035', 0.035, 25, 1, 1030, '#f7e27e'],
    ['mw_040', 'Dämmstoffe', 'Mineralwolle WLS 040', 0.040, 20, 1, 1030, '#f8e58a'],
    ['mw_fassade_035', 'Dämmstoffe', 'Steinwolle Putzträgerplatte WLS 035', 0.035, 110, 1, 1030, '#eccd5c'],
    ['eps_031', 'Dämmstoffe', 'EPS grau WLS 031', 0.031, 15, 50, 1450, '#c9ccd6'],
    ['eps_035', 'Dämmstoffe', 'EPS weiß WLS 035', 0.035, 15, 50, 1450, '#f4f6fb'],
    ['eps_040', 'Dämmstoffe', 'EPS weiß WLS 040', 0.040, 15, 50, 1450, '#f0f2f7'],
    ['xps_035', 'Dämmstoffe', 'XPS WLS 035 (Perimeter)', 0.035, 35, 150, 1450, '#a8d4e6'],
    ['pur_023', 'Dämmstoffe', 'PUR/PIR alukaschiert WLS 023', 0.023, 30, 60, 1400, '#efe1b0'],
    ['pur_026', 'Dämmstoffe', 'PUR/PIR vlieskaschiert WLS 026', 0.026, 30, 60, 1400, '#ece0b6'],
    ['phenol_021', 'Dämmstoffe', 'Phenolharz-Hartschaum WLS 021', 0.021, 35, 35, 1400, '#f1d3c1'],
    ['wf_038', 'Dämmstoffe', 'Holzfaser-Dämmmatte WLS 038', 0.038, 50, 2, 2100, '#b98c5a'],
    ['wf_040_platte', 'Dämmstoffe', 'Holzfaser-Dämmplatte WLS 040 (140 kg/m³)', 0.040, 140, 3, 2100, '#a97c4c'],
    ['wf_046_putz', 'Dämmstoffe', 'Holzfaser-Putzträgerplatte WLS 046', 0.046, 230, 5, 2100, '#9b6f41'],
    ['wf_050_unterdeck', 'Dämmstoffe', 'Holzfaser-Unterdeckplatte WLS 050', 0.050, 250, 5, 2100, '#8f6539'],
    ['zellulose_038', 'Dämmstoffe', 'Zellulose-Einblasdämmung WLS 038', 0.038, 50, 1.5, 2100, '#d7d0c0'],
    ['hanf_040', 'Dämmstoffe', 'Hanf / Flachs WLS 040', 0.040, 40, 1.5, 1600, '#bcc49a'],
    ['kork_040', 'Dämmstoffe', 'Backkork WLS 040', 0.040, 120, 10, 1700, '#8b5a3c'],
    ['schaumglas', 'Dämmstoffe', 'Schaumglas WLS 041', 0.041, 115, 100000, 1000, '#4d4f55'],
    ['perlite', 'Dämmstoffe', 'Perlite-Schüttung', 0.050, 90, 3, 1000, '#ebe9e3'],
    ['vip', 'Dämmstoffe', 'Vakuumdämmpaneel (VIP) WLS 007', 0.007, 200, 1000000, 800, '#bfc6ce'],
    ['mineralschaum', 'Dämmstoffe', 'Mineraldämmplatte WLS 045', 0.045, 115, 3, 1300, '#e9e6de'],
    ['trittschall_mw', 'Dämmstoffe', 'Trittschalldämmung Mineralwolle WLS 035', 0.035, 100, 1, 1030, '#f1d86e'],
    // Holz & Holzwerkstoffe
    ['holz_nadel', 'Holz', 'Nadelholz (Sparren, Balken, KVH)', 0.13, 500, 40, 1600, '#d9a960', true],
    ['holz_laub', 'Holz', 'Laubholz (Eiche/Buche)', 0.18, 700, 50, 1600, '#b88446', true],
    ['bsh', 'Holz', 'Brettschichtholz', 0.13, 450, 40, 1600, '#dcae68', true],
    ['brettsperrholz', 'Holz', 'Brettsperrholz (CLT)', 0.13, 470, 40, 1600, '#d5a45f', true],
    ['schalung', 'Holz', 'Holzschalung / Dielen', 0.13, 500, 40, 1600, '#cf9d5a', true],
    ['osb', 'Holz', 'OSB-Platte', 0.13, 650, 200, 1700, '#d6b27a', 'werkstoff'],
    ['spanplatte', 'Holz', 'Spanplatte', 0.14, 600, 50, 1700, '#d3b98e', 'werkstoff'],
    ['mdf', 'Holz', 'MDF-Platte', 0.14, 700, 20, 1700, '#b89a72', 'werkstoff'],
    ['sperrholz', 'Holz', 'Sperrholz', 0.13, 500, 200, 1600, '#d1a76a', 'werkstoff'],
    ['dwd', 'Holz', 'DWD / MDF diffusionsoffen', 0.10, 550, 11, 1700, '#9f7b51', 'werkstoff'],
    ['parkett', 'Holz', 'Parkett', 0.18, 700, 50, 1600, '#c08b52', true],
    // Platten
    ['gkb', 'Platten', 'Gipskartonplatte', 0.25, 900, 10, 1000, '#f2f2ee'],
    ['gf', 'Platten', 'Gipsfaserplatte', 0.32, 1150, 13, 1100, '#e9e7e1'],
    ['zementplatte', 'Platten', 'Zementgebundene Bauplatte', 0.35, 1150, 30, 1000, '#c4c2bb'],
    ['fliesen', 'Platten', 'Fliesen / Keramik', 1.30, 2300, 200, 840, '#c9d7de'],
    ['faserzement', 'Platten', 'Faserzementplatte', 0.58, 1800, 50, 1000, '#9da3a6'],
    // Folien & Bahnen (sd-Wert fest, Dicke klein)
    ['dampfbremse_2', 'Folien & Bahnen', 'Dampfbremse PE (sd 2 m)', 0.40, 980, null, 1800, '#5aa1d6', false, { sd: 2 }],
    ['dampfsperre_100', 'Folien & Bahnen', 'Dampfsperre (sd 100 m)', 0.40, 980, null, 1800, '#2d6fa8', false, { sd: 100 }],
    ['alufolie', 'Folien & Bahnen', 'Alu-Dampfsperre (sd 1500 m)', 0.40, 980, null, 1800, '#7d8b99', false, { sd: 1500 }],
    ['feuchtevariabel', 'Folien & Bahnen', 'Feuchtevariable Dampfbremse (Winter sd 5 m)', 0.40, 980, null, 1800, '#68b8a3', false, { sd: 5 }],
    ['unterdeckbahn', 'Folien & Bahnen', 'Unterdeckbahn diffusionsoffen (sd 0,02 m)', 0.40, 980, null, 1800, '#3e3e44', false, { sd: 0.02 }],
    ['bitumen_bahn', 'Folien & Bahnen', 'Bitumenschweißbahn', 0.17, 1100, 50000, 1000, '#2b2b2b'],
    ['bitumen_dsp', 'Folien & Bahnen', 'Bitumen-Dampfsperre (Alu-Einlage)', 0.17, 1100, null, 1000, '#363636', false, { sd: 1500 }],
    ['fpo', 'Folien & Bahnen', 'Kunststoffdachbahn FPO/PVC', 0.17, 1200, null, 1000, '#7a8188', false, { sd: 25 }],
    ['pe_trenn', 'Folien & Bahnen', 'PE-Folie 0,2 mm (Trennlage)', 0.40, 980, null, 1800, '#9bc4e2', false, { sd: 50 }],
    // Luft & Sonstiges
    ['luft_ruhend', 'Luftschichten', 'Luftschicht ruhend', null, 1.2, 1, 1000, '#ffffff', false, { luft: true }],
    ['luft_belueftet', 'Luftschichten', 'Luftschicht belüftet / Hinterlüftung', null, 1.2, 1, 1000, '#ffffff', false, { luft: true, belueftet: true }],
    ['kies', 'Sonstiges', 'Kies / Schotter (Auflast)', 2.00, 1700, 50, 1000, '#a39e92'],
    ['erdreich', 'Sonstiges', 'Erdreich (Sand/Kies)', 2.00, 1950, 50, 1050, '#8b6f4e'],
    ['dachziegel', 'Sonstiges', 'Dachziegel / Betondachstein', 1.00, 2000, 40, 800, '#a2402e'],
    ['stahl', 'Sonstiges', 'Stahl', 50, 7800, 1000000, 450, '#6f7a85'],
    ['aluminium', 'Sonstiges', 'Aluminium', 160, 2800, 1000000, 880, '#b9c2cb'],
    ['glas', 'Sonstiges', 'Glas', 1.00, 2500, 1000000, 750, '#cfe7ef'],
    ['bodenbelag_lino', 'Sonstiges', 'Linoleum / Kautschuk', 0.17, 1200, 1000, 1400, '#7c9a6b']
  ];

  const MATERIALIEN = M.map(r => {
    const m = { id: r[0], kat: r[1], name: r[2], lambda: r[3], rho: r[4], mu: r[5] == null ? 1 : r[5], c: r[6], farbe: r[7] };
    if (r[8]) m.holz = r[8] === true ? 'vollholz' : r[8];
    if (r[9]) Object.assign(m, r[9]);
    return m;
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = MATERIALIEN;
  root.WS_BAUSTOFFE = MATERIALIEN;
})(typeof window !== 'undefined' ? window : globalThis);

/* Vorlagen: Schichten innen -> außen, Dicke in cm. m2/breite/abstand = Gefach mit Sparren/Ständern */
(function (root) {
  const V = [
    { name: 'Außenwand Ziegel monolithisch 36,5', typ: 'wand', schichten: [
      { m: 'putz_kalkgips', d: 1.5 }, { m: 'hlz_daemm_08', d: 36.5 }, { m: 'putz_leicht', d: 2 }] },
    { name: 'Außenwand KS + WDVS 16 cm', typ: 'wand', schichten: [
      { m: 'putz_kalkgips', d: 1 }, { m: 'ks_1800', d: 17.5 }, { m: 'eps_035', d: 16 }, { m: 'putz_wdvs', d: 0.8 }] },
    { name: 'Außenwand Bestand Vollziegel 36,5', typ: 'wand', schichten: [
      { m: 'putz_kalk', d: 1.5 }, { m: 'vmz', d: 36.5 }, { m: 'putz_kalkzement', d: 2 }] },
    { name: 'Innendämmung Holzfaser auf Vollziegel', typ: 'wand', schichten: [
      { m: 'putz_lehm', d: 1 }, { m: 'wf_040_platte', d: 6 }, { m: 'putz_kalk', d: 1 }, { m: 'vmz', d: 36.5 }, { m: 'putz_kalkzement', d: 2 }] },
    { name: 'Holzrahmenwand hinterlüftet', typ: 'wand', schichten: [
      { m: 'gkb', d: 1.25 }, { m: 'osb', d: 1.5 }, { m: 'mw_035', d: 20, m2: 'holz_nadel', breite: 6, abstand: 62.5 },
      { m: 'wf_050_unterdeck', d: 6 }, { m: 'luft_belueftet', d: 3 }, { m: 'schalung', d: 2.4 }] },
    { name: 'Steildach Zwischensparren + Aufdach Holzfaser', typ: 'steildach', schichten: [
      { m: 'gkb', d: 1.25 }, { m: 'dampfbremse_2', d: 0.02 }, { m: 'mw_035', d: 20, m2: 'holz_nadel', breite: 8, abstand: 70 },
      { m: 'wf_050_unterdeck', d: 6 }, { m: 'luft_belueftet', d: 4 }, { m: 'dachziegel', d: 2 }] },
    { name: 'Flachdach Stahlbeton, Warmdach PIR', typ: 'flachdach', schichten: [
      { m: 'putz_kalkgips', d: 1 }, { m: 'beton_stb', d: 20 }, { m: 'bitumen_dsp', d: 0.4 }, { m: 'pur_023', d: 16 }, { m: 'bitumen_bahn', d: 1 }, { m: 'kies', d: 5 }] },
    { name: 'Oberste Geschossdecke Holzbalken', typ: 'ogd', schichten: [
      { m: 'gkb', d: 1.25 }, { m: 'dampfbremse_2', d: 0.02 }, { m: 'mw_035', d: 20, m2: 'holz_nadel', breite: 10, abstand: 80 }, { m: 'osb', d: 2.2 }] },
    { name: 'Kellerdecke mit Dämmung unterseitig', typ: 'kellerdecke', schichten: [
      { m: 'parkett', d: 1 }, { m: 'estrich_zement', d: 5 }, { m: 'pe_trenn', d: 0.02 }, { m: 'trittschall_mw', d: 3 }, { m: 'beton_stb', d: 18 }, { m: 'mw_fassade_035', d: 12 }] },
    { name: 'Bodenplatte mit Perimeterdämmung', typ: 'bodenplatte', schichten: [
      { m: 'fliesen', d: 1 }, { m: 'estrich_zement', d: 6 }, { m: 'pe_trenn', d: 0.02 }, { m: 'eps_035', d: 6 }, { m: 'bitumen_bahn', d: 0.5 }, { m: 'beton_stb', d: 25 }, { m: 'xps_035', d: 14 }] }
  ];
  root.WS_VORLAGEN = V;
})(typeof window !== 'undefined' ? window : globalThis);
