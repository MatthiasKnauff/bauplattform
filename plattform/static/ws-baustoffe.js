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
