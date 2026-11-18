/* Wärmeschutz – Bauphysik-Kern (aus dem Bauteilrechner übernommen, global WSP; Anforderungen: ws-kern.js ANLAGE7)
 * U-Wert nach DIN EN ISO 6946 (inkl. inhomogener Schichten, obere/untere Grenze)
 * Tauwasser nach Glaser (DIN 4108-3), fein unterteilt
 * Instationär nach DIN EN ISO 13786 (Phasenverschiebung, Dekrementfaktor)
 * Läuft im Browser (globales Objekt WSP) und in Node (module.exports).
 */
(function (root) {
  'use strict';

  const DELTA0 = 2.0e-10;          // Wasserdampf-Diffusionsleitkoeff. Luft [kg/(m·s·Pa)]
  const PERIODE = 86400;           // s

  // Bauteiltypen: Wärmeübergangswiderstände (ISO 6946 Tab. 7) und Anforderungen
  const BAUTEILTYPEN = {
    wand:      { name: 'Außenwand',                    rsi: 0.13, rse: 0.04, richtung: 'horizontal', geg: 0.24, ref: 0.28, beg: 0.20 },
    steildach: { name: 'Steildach / Dachschräge',      rsi: 0.10, rse: 0.04, richtung: 'aufwaerts',  geg: 0.24, ref: 0.20, beg: 0.14 },
    flachdach: { name: 'Flachdach',                    rsi: 0.10, rse: 0.04, richtung: 'aufwaerts',  geg: 0.20, ref: 0.20, beg: 0.14 },
    ogd:       { name: 'Oberste Geschossdecke',        rsi: 0.10, rse: 0.10, richtung: 'aufwaerts',  geg: 0.24, ref: 0.20, beg: 0.14 },
    kellerdecke:{ name: 'Kellerdecke (gegen unbeheizt)', rsi: 0.17, rse: 0.17, richtung: 'abwaerts', geg: 0.30, ref: 0.35, beg: 0.25 },
    bodenplatte:{ name: 'Bodenplatte gegen Erdreich',   rsi: 0.17, rse: 0.00, richtung: 'abwaerts',  geg: 0.30, ref: 0.35, beg: 0.25 },
    erdwand:   { name: 'Wand gegen Erdreich',          rsi: 0.13, rse: 0.00, richtung: 'horizontal', geg: 0.30, ref: 0.35, beg: 0.25 },
    decke_aussen:{ name: 'Decke nach unten gegen Außenluft', rsi: 0.17, rse: 0.04, richtung: 'abwaerts', geg: 0.24, ref: 0.28, beg: 0.20 },
    innenwand: { name: 'Innenwand (gegen unbeheizt)',  rsi: 0.13, rse: 0.13, richtung: 'horizontal', geg: 0.30, ref: 0.35, beg: 0.25 }
  };

  // Ruhende Luftschichten, ISO 6946 Tab. 8 (Dicke mm -> R)
  const LUFT = {
    horizontal: [[0, 0], [5, 0.11], [7, 0.13], [10, 0.15], [15, 0.17], [25, 0.18], [300, 0.18]],
    aufwaerts:  [[0, 0], [5, 0.11], [7, 0.13], [10, 0.15], [15, 0.16], [25, 0.16], [300, 0.16]],
    abwaerts:   [[0, 0], [5, 0.11], [7, 0.13], [10, 0.15], [15, 0.17], [25, 0.19], [50, 0.21], [100, 0.22], [300, 0.23]]
  };

  // Standardklima DIN 4108-3:2018 (bearbeitbar)
  const KLIMA_STANDARD = {
    tau:  { ti: 20, phii: 0.50, te: -5, phie: 0.80, tage: 90 },
    verd: { ti: 20, phii: 0.60, te: 20, phie: 0.60, tage: 90, tEbeneDach: 20 },
    schimmel: { ti: 20, te: -5, rsi: 0.25 }
  };

  function interpol(tab, x) {
    if (x <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) {
      if (x <= tab[i][0]) {
        const [x0, y0] = tab[i - 1], [x1, y1] = tab[i];
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
    }
    return tab[tab.length - 1][1];
  }

  /** Sättigungsdampfdruck [Pa] (Magnus, DIN 4108-3) */
  function psat(t) {
    return t >= 0 ? 610.5 * Math.exp(17.269 * t / (237.3 + t))
                  : 610.5 * Math.exp(21.875 * t / (265.5 + t));
  }
  /** Taupunkt [°C] aus Temperatur und rel. Feuchte (0..1) */
  function taupunkt(t, phi) {
    const p = phi * psat(t);
    const l = Math.log(p / 610.5);
    return l >= 0 ? 237.3 * l / (17.269 - l) : 265.5 * l / (21.875 - l);
  }

  /** Wärmedurchlasswiderstand einer Teilfläche (homogen) */
  function rMaterial(mat, d, richtung) {
    if (!mat) return 0;
    if (mat.luft) return interpol(LUFT[richtung] || LUFT.horizontal, d * 1000);
    if (mat.r != null) return mat.r;           // feste Widerstände (z. B. Folien)
    return mat.lambda > 0 ? d / mat.lambda : 0;
  }

  /**
   * Bereitet die Schichten auf. Schichten: Reihenfolge innen -> außen.
   * schicht = { mat, d [m], mat2?, anteil2? (0..1, z. B. Sparrenanteil), belueftet? }
   * Alles außerhalb einer belüfteten Schicht wird nicht gerechnet, Rse = Rsi.
   */
  function aufbereiten(bauteil) {
    const typ = BAUTEILTYPEN[bauteil.typ] || BAUTEILTYPEN.wand;
    let rsi = typ.rsi, rse = typ.rse;
    const aktiv = [];
    let belueftetAb = -1;
    for (let i = 0; i < bauteil.schichten.length; i++) {
      const s = bauteil.schichten[i];
      if (s.belueftet || (s.mat && s.mat.belueftet)) { belueftetAb = i; break; }
      aktiv.push(s);
    }
    if (belueftetAb >= 0) rse = rsi;
    if (bauteil.rsi != null) rsi = bauteil.rsi;
    if (bauteil.rse != null) rse = bauteil.rse;
    return { typ, rsi, rse, aktiv, belueftetAb };
  }

  /** U-Wert nach ISO 6946 Abschnitt 6.7 (obere/untere Grenze) */
  function uWert(bauteil) {
    const a = aufbereiten(bauteil);
    const r = a.typ.richtung;
    const inh = a.aktiv.map((s, i) => (s.mat2 && s.anteil2 > 0) ? i : -1).filter(i => i >= 0);

    // untere Grenze R'': je Schicht flächengewichtet parallel
    let rUnten = a.rsi + a.rse;
    const rSchicht = a.aktiv.map(s => {
      const ra = rMaterial(s.mat, s.d, r);
      if (!(s.mat2 && s.anteil2 > 0)) return ra;
      const rb = rMaterial(s.mat2, s.d, r);
      const f = s.anteil2;
      return 1 / ((1 - f) / Math.max(ra, 1e-9) + f / Math.max(rb, 1e-9));
    });
    rSchicht.forEach(x => rUnten += x);

    // obere Grenze R': Pfade (Kombination aller inhomogenen Schichten, unabhängig angenommen)
    let rOben = rUnten;
    let pfade = [{ f: 1, r: a.rsi + a.rse }];
    if (inh.length) {
      const n = Math.min(inh.length, 8);
      pfade = [];
      for (let m = 0; m < (1 << n); m++) {
        let f = 1, rt = a.rsi + a.rse;
        a.aktiv.forEach((s, i) => {
          const k = inh.indexOf(i);
          if (k >= 0 && k < n) {
            const b = (m >> k) & 1;
            f *= b ? s.anteil2 : 1 - s.anteil2;
            rt += rMaterial(b ? s.mat2 : s.mat, s.d, r);
          } else rt += rMaterial(s.mat, s.d, r);
        });
        if (f > 0) pfade.push({ f, r: rt });
      }
      rOben = 1 / pfade.reduce((sum, p) => sum + p.f / p.r, 0);
    }
    const rT = (rOben + rUnten) / 2;
    const fehler = inh.length ? (rOben - rUnten) / (2 * rT) : 0;
    return {
      u: 1 / rT, rT, rOben, rUnten, fehler, rsi: a.rsi, rse: a.rse,
      rSchicht, inhomogen: inh.length > 0, belueftetAb: a.belueftetAb, typ: a.typ
    };
  }

  /** Effektive (flächengewichtete) Kennwerte einer Schicht für Temperatur-/Diffusionsrechnung */
  function schichtKennwerte(s, richtung, uRes, idx) {
    const r = uRes ? uRes.rSchicht[idx] : rMaterial(s.mat, s.d, richtung);
    const f = (s.mat2 && s.anteil2 > 0) ? s.anteil2 : 0;
    const mu = (1 - f) * (s.mat.mu || 1) + f * ((s.mat2 && s.mat2.mu) || 1);
    // Diffusion: bei inhomogenen Schichten ist das Gefach (Material 1) maßgebend
    const sd = s.mat.sd != null ? s.mat.sd : (s.mat.mu || 1) * s.d;
    const rho = (1 - f) * (s.mat.rho || 0) + f * ((s.mat2 && s.mat2.rho) || 0);
    const c = (1 - f) * (s.mat.c || 1000) + f * ((s.mat2 && s.mat2.c) || 1000);
    const lambdaEq = r > 0 ? s.d / r : 0;
    return { r, sd, mu, rho, c, lambdaEq, masse: rho * s.d };
  }

  /** Temperaturverlauf an den Schichtgrenzen */
  function temperaturen(bauteil, ti, te, rsiOverride) {
    const u = uWert(bauteil);
    const a = aufbereiten(bauteil);
    const rsi = rsiOverride != null ? rsiOverride : u.rsi;
    const rT = u.rT - u.rsi + rsi;
    const q = (ti - te) / rT;
    const punkte = [{ x: 0, t: ti - q * rsi }];
    let rKum = rsi, x = 0;
    a.aktiv.forEach((s, i) => {
      rKum += u.rSchicht[i]; x += s.d;
      punkte.push({ x, t: ti - q * rKum });
    });
    return { q, tsi: punkte[0].t, tse: punkte[punkte.length - 1].t, punkte, rT };
  }

  /**
   * Glaser-Verfahren. Schichten werden in dünne Scheiben geteilt, damit
   * Tauwasserbereiche auch innerhalb dicker Schichten gefunden werden.
   */
  function glaser(bauteil, klima) {
    klima = klima || KLIMA_STANDARD;
    const u = uWert(bauteil);
    const a = aufbereiten(bauteil);
    const r = a.typ.richtung;
    const K = klima.tau;

    // Feine Unterteilung
    const knoten = []; // {sd, R (ab innen inkl. Rsi), x, schicht}
    let sdKum = 0, rKum = u.rsi, xKum = 0;
    knoten.push({ sd: 0, R: rKum, x: 0, schicht: -1 });
    const kenn = a.aktiv.map((s, i) => schichtKennwerte(s, r, u, i));
    a.aktiv.forEach((s, i) => {
      const kw = kenn[i];
      const n = Math.max(1, Math.min(40, Math.ceil(kw.r / 0.05)));
      for (let k = 1; k <= n; k++) {
        knoten.push({ sd: sdKum + kw.sd * k / n, R: rKum + kw.r * k / n, x: xKum + s.d * k / n, schicht: i, grenze: k === n });
      }
      sdKum += kw.sd; rKum += kw.r; xKum += s.d;
    });
    const sdGes = sdKum;
    const rT = u.rT;
    const q = (K.ti - K.te) / rT;
    knoten.forEach(k => { k.t = K.ti - q * k.R; k.ps = psat(k.t); });

    const pi = K.phii * psat(K.ti), pe = K.phie * psat(K.te);
    // untere konvexe Hülle von (0,pi) über psat-Knoten zu (sdGes,pe)
    const pts = [{ sd: 0, p: pi, idx: -1 }];
    knoten.forEach((k, i) => pts.push({ sd: k.sd, p: k.ps, idx: i }));
    pts.push({ sd: sdGes, p: pe, idx: -2 });
    // Punkte mit gleichem sd: kleinster p (Folien mit sd>0 aber d≈0 werden so sauber)
    const hull = [];
    for (const p of pts) {
      while (hull.length >= 2) {
        const o = hull[hull.length - 2], b = hull[hull.length - 1];
        const cross = (b.sd - o.sd) * (p.p - o.p) - (b.p - o.p) * (p.sd - o.sd);
        if (cross <= 0) hull.pop(); else break;
      }
      hull.push(p);
    }
    const ebenen = hull.filter(h => h.idx >= 0);
    const ergebnis = {
      pi, pe, sdGes, knoten, hull, tauwasser: false, mc: 0, mev: 0, ebenen: [],
      zonen: [], t: K.tage * 86400, gc: 0, klima
    };
    // Tauwasser nur, wenn Ebene den Sättigungsdruck erreicht (Hülle liegt unter Gerade)
    if (ebenen.length === 0 || sdGes <= 0) return ergebnis;
    // Prüfen: Liegt Gerade pi->pe überall unter psat? Dann keine Ebene in der Hülle.
    ergebnis.tauwasser = true;
    const first = ebenen[0], last = ebenen[ebenen.length - 1];
    const s1 = Math.max(first.sd, 1e-6), s2 = Math.max(sdGes - last.sd, 1e-6);
    const gin = DELTA0 * (pi - first.p) / s1;
    const gout = DELTA0 * (last.p - pe) / s2;
    const gc = gin - gout;
    ergebnis.gc = gc;
    ergebnis.mc = Math.max(0, gc * ergebnis.t);
    ergebnis.ebenen = ebenen.map(e => ({ sd: e.sd, x: knoten[e.idx].x, schicht: knoten[e.idx].schicht, t: knoten[e.idx].t }));

    // Verdunstung
    const V = klima.verd;
    const istDach = a.typ.richtung === 'aufwaerts';
    const qv = (V.ti - V.te) / rT;
    const tEbene = (R) => (istDach && V.tEbeneDach != null) ? V.tEbeneDach : V.ti - qv * R;
    const pc1 = psat(tEbene(knoten[first.idx].R)), pc2 = psat(tEbene(knoten[last.idx].R));
    const piV = V.phii * psat(V.ti), peV = V.phie * psat(V.te);
    const gev = DELTA0 * ((pc1 - piV) / s1 + (pc2 - peV) / s2);
    ergebnis.gev = Math.max(0, gev);
    ergebnis.mev = ergebnis.gev * V.tage * 86400;

    // Holzfeuchte-Zunahme in angrenzenden Holzschichten
    const holz = [];
    new Set(ergebnis.ebenen.map(e => e.schicht)).forEach(si => {
      [si, si + 1].forEach(j => {
        const s = a.aktiv[j];
        if (s && s.mat && s.mat.holz) {
          const m = (s.mat.rho || 500) * s.d;
          holz.push({ schicht: j, name: s.mat.name, zunahme: ergebnis.mc / m, grenze: s.mat.holz === 'werkstoff' ? 0.03 : 0.05 });
        }
      });
    });
    ergebnis.holz = holz;
    return ergebnis;
  }

  // ---------- Komplexe Zahlen für ISO 13786 ----------
  const C = {
    mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    abs: a => Math.hypot(a[0], a[1]),
    arg: a => Math.atan2(a[1], a[0])
  };
  function mmul(A, B) {
    return [
      [C.add(C.mul(A[0][0], B[0][0]), C.mul(A[0][1], B[1][0])), C.add(C.mul(A[0][0], B[0][1]), C.mul(A[0][1], B[1][1]))],
      [C.add(C.mul(A[1][0], B[0][0]), C.mul(A[1][1], B[1][0])), C.add(C.mul(A[1][0], B[0][1]), C.mul(A[1][1], B[1][1]))]
    ];
  }
  function widerstandsMatrix(R) { return [[[1, 0], [-R, 0]], [[0, 0], [1, 0]]]; }
  function schichtMatrix(d, lambda, rho, c) {
    if (!(rho > 0) || !(c > 0) || !(lambda > 0)) return widerstandsMatrix(d / (lambda || 1));
    const delta = Math.sqrt(lambda * PERIODE / (Math.PI * rho * c));
    const xi = d / delta;
    const ch = Math.cosh(xi), sh = Math.sinh(xi), co = Math.cos(xi), si = Math.sin(xi);
    const z11 = [ch * co, sh * si];
    const k12 = -delta / (2 * lambda);
    const z12 = [k12 * (sh * co + ch * si), k12 * (ch * si - sh * co)];
    const k21 = -lambda / delta;
    const z21 = [k21 * (sh * co - ch * si), k21 * (sh * co + ch * si)];
    return [[z11, z12], [z21, z11]];
  }

  /** Sommerlicher Wärmeschutz: Phasenverschiebung, Dekrementfaktor, Amplitudendämpfung */
  function instationaer(bauteil) {
    const u = uWert(bauteil);
    const a = aufbereiten(bauteil);
    const r = a.typ.richtung;
    // Reihenfolge: außen -> innen (Z = Z_si · Z_1 ... · Z_se nach ISO, Seite 1 = innen)
    let Z = widerstandsMatrix(u.rse);
    for (let i = a.aktiv.length - 1; i >= 0; i--) {
      const s = a.aktiv[i];
      const kw = schichtKennwerte(s, r, u, i);
      const m = (s.mat.luft || s.mat.r != null || !(kw.lambdaEq > 0))
        ? widerstandsMatrix(kw.r)
        : schichtMatrix(s.d, kw.lambdaEq, kw.rho, kw.c);
      Z = mmul(m, Z);
    }
    Z = mmul(widerstandsMatrix(u.rsi), Z);
    const z12 = Z[0][1];
    const y12abs = 1 / C.abs(z12);
    // Y12 = -1/Z12  ->  arg(Y12) = -arg(-Z12); Zeitverschiebung = T/(2π)·|arg|
    const argY = -C.arg([-z12[0], -z12[1]]);
    let dt = -argY / (2 * Math.PI) * 24;
    dt = ((dt % 24) + 24) % 24;
    return {
      phasenverschiebung: dt,
      dekrement: y12abs / u.u,
      daempfung: u.u / y12abs,
      y12: y12abs
    };
  }

  /** Alles auf einmal */
  function berechne(bauteil, klima) {
    const u = uWert(bauteil);
    const a = aufbereiten(bauteil);
    const kenn = a.aktiv.map((s, i) => schichtKennwerte(s, a.typ.richtung, u, i));
    const sk = (klima || KLIMA_STANDARD).schimmel;
    const tWinter = temperaturen(bauteil, (klima || KLIMA_STANDARD).tau.ti, (klima || KLIMA_STANDARD).tau.te);
    const tSchimmel = temperaturen(bauteil, sk.ti, sk.te, sk.rsi);
    const frsi = (tSchimmel.tsi - sk.te) / (sk.ti - sk.te);
    const gl = glaser(bauteil, klima);
    let inst = null;
    try { inst = instationaer(bauteil); } catch (e) { inst = null; }
    const dicke = bauteil.schichten.reduce((s, x) => s + (x.d || 0), 0);
    const masse = bauteil.schichten.reduce((s, x) => {
      const f = (x.mat2 && x.anteil2 > 0) ? x.anteil2 : 0;
      return s + ((1 - f) * (x.mat.rho || 0) + f * ((x.mat2 && x.mat2.rho) || 0)) * x.d;
    }, 0);
    return { u, kenn, tWinter, tSchimmel, frsi, glaser: gl, inst, dicke, masse, typ: a.typ, aktiv: a.aktiv, belueftetAb: a.belueftetAb };
  }

  const WSP = { BAUTEILTYPEN, KLIMA_STANDARD, LUFT, psat, taupunkt, uWert, temperaturen, glaser, instationaer, berechne, rMaterial, schichtKennwerte, DELTA0 };
  if (typeof module !== 'undefined' && module.exports) module.exports = WSP;
  root.WSP = WSP;
})(typeof window !== 'undefined' ? window : globalThis);
