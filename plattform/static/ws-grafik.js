'use strict';
/* Wärmeschutz – Ergebniszeile (Ampel) am Bauteil und der Bereich rechts (seite.js, abdockbar) mit den Grafiken:
   Querschnitt mit Temperaturverlauf, Glaser-Diagramm (Dampfdruck über sd), Hitzeschutz (Temperaturwelle über 24 h), Prüfung.
   Nutzt aus ws-kern.js: D, WORK, R7, zahl, ergebnis, bauteil, pruefungHtml; aus ws-bauteil.js: BSI, bsName, ntz. */
const WSR = {};   // Reiter-Felder rechts: id → Element
const WS_FARBE = { innen: '#c84b3a', aussen: '#3b6fb0', p: '#2f7d6d', ps: '#c84b3a' };

/* ---------- Ergebniszeile am Bauteil ---------- */
function ampelKl(b) { const e = ergebnis(b); return e.ok === false ? 'no' : e.ok ? 'ok' : ''; }
function ampelHtml(b) {
  const e = ergebnis(b);
  if (e.u == null) return '<span class="mute">Schichten eintragen – U-Wert, Tauwasser und Temperaturen rechnen sofort mit.</span>';
  const ch = (ok, t) => `<span class="ws-a ${ok == null ? '' : ok ? 'ok' : 'no'}">${ok == null ? '' : ok ? '✓ ' : '✗ '}${t}</span>`;
  let mehr = '';
  if (e.ok === false && e.r && e.umax) {   // wie viel Dämmung (WLS 035) fehlt bis U max
    const d = Math.ceil((1 / e.umax - e.r.u.rT) * 0.035 * 100);
    if (d > 0) mehr = ` · rund <b>${d} cm</b> Dämmung WLS 035 mehr`;
  }
  let h = `<span class="ws-u">U = ${zahl(e.u, 3)}</span><span>${e.umax == null ? (b.massnahme ? 'keine Anforderung' : 'Maßnahme wählen') : `U max ${zahl(e.umax)} (Nr. ${esc(b.massnahme)})${mehr}`}</span>`;
  if (e.r) {
    const gl = e.r.glaser;
    h += ch(!gl.tauwasser || (gl.mc <= 1 && gl.mev >= gl.mc), gl.tauwasser ? `Tauwasser ${zahl(gl.mc, 3)} kg/m²` : 'kein Tauwasser');
    h += ch(e.r.frsi >= 0.7, `fRsi ${zahl(e.r.frsi)}`);
    if (e.r.inst) h += ch(null, `Phasenversch. ${zahl(e.r.inst.phasenverschiebung, 1)} h`);
  }
  return h;
}

/* ---------- Bereich rechts ---------- */
function bereich() {
  if (!window.seite || matchMedia('(max-width: 820px)').matches) return;
  const R = (id, titel) => ({ id, titel, mount: (el) => { WSR[id] = el; rechtsFuellen(id); } });
  seite(WORK, 'ws', [R('quer', 'Querschnitt'), R('tau', 'Tauwasser'), R('hitze', 'Hitzeschutz'), R('pruef', 'Prüfung')], { start: 'quer', w: 0.6, minL: 560, min: 340 });
}
function rechtsNeu() { Object.keys(WSR).forEach(rechtsFuellen); }
function rechtsFuellen(id) {
  const el = WSR[id]; if (!el || !el.isConnected) return;
  if (id === 'pruef') { el.innerHTML = `<div class="ws-r">${D ? pruefungHtml() : ''}</div>`; return; }
  const b = bauteil(), e = b ? ergebnis(b) : null;
  if (!b || !e || !e.r) { el.innerHTML = `<div class="ws-r mute">${b && R7.ohneSchichten(b.typ) ? 'Fenster und Türen: U-Wert aus dem Datenblatt – keine Schichten.' : 'Links ein Bauteil mit Schichten wählen.'}</div>`; return; }
  const r = e.r, m = (t, w, s) => `<div class="ws-mb"><small>${t}</small><b>${w}</b>${s ? `<small>${s}</small>` : ''}</div>`;
  if (id === 'quer') el.innerHTML = `<div class="ws-r"><h4>${esc(b.kurz || '')} ${esc(b.name || '')}</h4>${querschnitt(b, r)}
    <div class="ws-mini">${m('Oberfläche innen', zahl(r.tSchimmel.tsi, 1) + ' °C', 'bei −5 °C, Rsi 0,25')}${m('Dicke · Masse', zahl(r.dicke * 100, 1) + ' cm', zahl(r.masse, 0) + ' kg/m²')}
      ${m('Wärmedurchlasswiderstand', zahl(r.u.rT, 2) + ' m²K/W', r.u.inhomogen ? `Gefach · Fehler ${zahl(r.u.fehler * 100, 1)} %` : '')}${b.flaeche ? m('Wärmeverlust', zahl(e.u * b.flaeche, 1) + ' W/K', `bei ${zahl(b.flaeche, 1)} m²`) : ''}</div></div>`;
  if (id === 'tau') { const g = r.glaser;
    el.innerHTML = `<div class="ws-r"><h4>Glaser-Verfahren (DIN 4108-3)</h4>${glaserSvg(b, r)}
      <div class="ws-mini">${m('Tauperiode', '−5 / 20 °C', '80 % / 50 %, 90 Tage')}${m('Tauwasser', g.tauwasser ? zahl(g.mc, 3) + ' kg/m²' : 'kein', g.tauwasser ? 'Grenze 1,0 (0,5 an Holz)' : 'Dampfdruck unter Sättigung')}
        ${g.tauwasser ? m('Verdunstung', zahl(g.mev, 3) + ' kg/m²', g.mev >= g.mc ? '✓ trocknet aus' : '✗ trocknet nicht aus') : ''}${m('sd gesamt', zahl(g.sdGes, 2) + ' m', '')}</div></div>`; }
  if (id === 'hitze') { const i = r.inst;
    el.innerHTML = `<div class="ws-r"><h4>Sommerlicher Wärmeschutz (DIN EN ISO 13786)</h4>${i ? hitzeSvg(i) : '<p class="mute">Nicht rechenbar.</p>'}
      ${i ? `<div class="ws-mini">${m('Phasenverschiebung', zahl(i.phasenverschiebung, 1) + ' h', i.phasenverschiebung >= 10 ? '✓ gut (≥ 10 h)' : 'Ziel: ≥ 10 h')}${m('Amplitudendämpfung', zahl(i.daempfung, 1), '')}${m('Dekrement', zahl(i.dekrement, 2), 'kleiner = besser')}</div>` : ''}</div>`; }
}

/* ---------- Grafiken ---------- */
const MUSTER = `<defs>
  <pattern id="wsD" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 q3.5 -5 7 0 t7 0" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1"/></pattern>
  <pattern id="wsM" width="24" height="12" patternUnits="userSpaceOnUse"><path d="M0 .5h24M0 6.5h24M6 .5v6M18 6.5v6" stroke="#000" stroke-opacity=".16" stroke-width="1" fill="none"/></pattern>
  <pattern id="wsB" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="#000" fill-opacity=".22"/><circle cx="6" cy="6" r=".6" fill="#000" fill-opacity=".16"/></pattern>
  <pattern id="wsH" width="6" height="20" patternUnits="userSpaceOnUse"><path d="M1 0 q2 10 0 20M4 0 q-2 10 0 20" stroke="#5a3a17" stroke-opacity=".25" fill="none" stroke-width=".8"/></pattern>
  <pattern id="wsP" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".5" fill="#000" fill-opacity=".15"/></pattern>
  <linearGradient id="wsWarm" x1="0" x2="1"><stop offset="0" stop-color="${WS_FARBE.innen}" stop-opacity=".16"/><stop offset="1" stop-color="${WS_FARBE.innen}" stop-opacity=".03"/></linearGradient>
  <linearGradient id="wsKalt" x1="0" x2="1"><stop offset="0" stop-color="${WS_FARBE.aussen}" stop-opacity=".03"/><stop offset="1" stop-color="${WS_FARBE.aussen}" stop-opacity=".18"/></linearGradient></defs>`;
const muster = (m) => { const k = (m && m.kat) || ''; return /Dämm/.test(k) ? 'wsD' : /Mauer/.test(k) ? 'wsM' : /Beton/.test(k) ? 'wsB' : /Holz/.test(k) ? 'wsH' : /Putz|Estrich|Platten/.test(k) ? 'wsP' : ''; };
const kurzName = (m, s) => ((m ? m.name : s.name) || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/ WLS \d+| \d{3,4}$/, '').trim();

function querschnitt(b, r) {
  const S = b.schichten || [], A = r.aktiv, W = 560, H = 300, x0 = 54, x1 = W - 54, y0 = 22, y1 = 238, ti = 20, te = -5;
  const dg = S.reduce((s, x) => s + (+x.d || 0), 0); if (!dg) return '';
  const sc = (x1 - x0) / dg, y = (t) => y0 + (ti - t) / (ti - te) * (y1 - y0);
  let g = MUSTER + `<rect x="0" y="${y0}" width="${x0}" height="${y1 - y0}" fill="url(#wsWarm)"/><rect x="${x1}" y="${y0}" width="${W - x1}" height="${y1 - y0}" fill="url(#wsKalt)"/>`;
  for (const t of [20, 10, 0, -5]) g += `<line x1="${x0 - 4}" x2="${x1}" y1="${y(t)}" y2="${y(t)}" stroke="currentColor" stroke-opacity=".08"/><text x="${x0 - 7}" y="${y(t) + 3.5}" text-anchor="end" class="ax">${t}°</text>`;
  let xs = x0;
  S.forEach((s, i) => { const m = BSI[s.m], w = Math.max((+s.d || 0) * sc, 1.5), aus = i >= A.length, mu = muster(m);
    g += `<g${aus ? ' opacity=".35"' : ''}><rect x="${xs}" y="${y0}" width="${w}" height="${y1 - y0}" fill="${esc((m || {}).farbe || '#dcdcdc')}"/>${mu ? `<rect x="${xs}" y="${y0}" width="${w}" height="${y1 - y0}" fill="url(#${mu})"/>` : ''}`;
    if (s.m2 && s.breite > 0 && s.abstand > 0 && w > 4) { const m2 = BSI[s.m2] || {}, h = (y1 - y0) * Math.min(1, s.breite / s.abstand); g += `<rect x="${xs}" y="${y0 + (y1 - y0 - h) / 2}" width="${w}" height="${h}" fill="${esc(m2.farbe || '#d9a960')}"/><rect x="${xs}" y="${y0 + (y1 - y0 - h) / 2}" width="${w}" height="${h}" fill="url(#wsH)"/>`; }
    g += `<line x1="${xs}" x2="${xs}" y1="${y0}" y2="${y1}" stroke="#fff" stroke-opacity=".7"/></g>`;
    const n = kurzName(m, s);
    if (w > 34) g += `<text x="${xs + w / 2}" y="${y1 + 16}" text-anchor="middle" class="lb">${esc(n.slice(0, Math.floor(w / 6)))}</text><text x="${xs + w / 2}" y="${y1 + 29}" text-anchor="middle" class="ax">${ntz(s.d)} cm</text>`;
    else if (w > 10) g += `<text transform="translate(${xs + w / 2 + 3},${y1 + 6}) rotate(60)" class="ax">${esc(n.slice(0, 14))}</text>`;
    xs += w; });
  const T = r.tWinter.punkte, P = [[0, ti], [x0, T[0].t]]; let xk = x0;
  A.forEach((_, i) => { xk += (+S[i].d || 0) * sc; P.push([xk, T[i + 1].t]); }); P.push([W, te]);
  const tp = window.WSP.taupunkt(20, 0.5);
  g += `<line x1="${x0}" x2="${x1}" y1="${y(tp)}" y2="${y(tp)}" stroke="${WS_FARBE.aussen}" stroke-width="1.2" stroke-dasharray="6 4"/><text x="${x0 + 4}" y="${y(tp) - 5}" class="tp">Taupunkt ${zahl(tp, 1)} °C</text>`;
  g += `<polyline points="${P.map((p) => p[0].toFixed(1) + ',' + y(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="${WS_FARBE.innen}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  P.slice(1, -1).forEach((p, i) => { g += `<circle cx="${p[0]}" cy="${y(p[1])}" r="3.5" fill="#fff" stroke="${WS_FARBE.innen}" stroke-width="2"/>`;
    if (i === 0 || i === P.length - 3) g += `<g transform="translate(${p[0] + (i ? -6 : 6)},${y(p[1]) + (i ? -10 : 14)})"><rect x="${i ? -34 : 0}" y="-10" width="34" height="15" rx="7" fill="#fff" stroke="${WS_FARBE.innen}" stroke-opacity=".5"/><text x="${i ? -17 : 17}" y="1" text-anchor="middle" class="pl">${zahl(p[1], 1)}°</text></g>`; });
  (r.glaser.ebenen || []).forEach((e) => { const x = x0 + e.x * 100 * sc; g += `<line x1="${x}" x2="${x}" y1="${y0}" y2="${y1}" stroke="${WS_FARBE.aussen}" stroke-width="2.5"/><text x="${x + 4}" y="${y0 + 12}" class="tp">💧 Tauwasser</text>`; });
  g += `<text x="6" y="14" class="hd">innen 20 °C</text><text x="${W - 6}" y="14" text-anchor="end" class="hd">außen −5 °C</text>`;
  return `<svg class="ws-g" viewBox="0 0 ${W} ${H}" role="img" aria-label="Querschnitt mit Temperaturverlauf">${g}</svg>`;
}

/* Dampfdruck über der sd-Achse: Sättigungsdampfdruck (rot) und vorhandener Dampfdruck (grün); berühren sie sich: Tauwasser */
function glaserSvg(b, r) {
  const g0 = r.glaser, K = g0.knoten, W = 560, H = 300, x0 = 54, x1 = W - 20, y0 = 20, y1 = 230, sdG = Math.max(g0.sdGes, 1e-6);
  const pmax = Math.max(g0.pi, ...K.map((k) => k.ps)) * 1.08, X = (sd) => x0 + sd / sdG * (x1 - x0), Y = (p) => y1 - p / pmax * (y1 - y0);
  let g = MUSTER, sd0 = 0;
  const kenn = r.aktiv.map((s, i) => WSP.schichtKennwerte(s, r.typ.richtung, r.u, i));
  r.aktiv.forEach((s, i) => { const w = Math.max(X(sd0 + kenn[i].sd) - X(sd0), 1), m = BSI[(b.schichten[i] || {}).m];
    g += `<rect x="${X(sd0)}" y="${y0}" width="${w}" height="${y1 - y0}" fill="${esc((m || {}).farbe || '#ddd')}" fill-opacity=".35"/><line x1="${X(sd0)}" x2="${X(sd0)}" y1="${y0}" y2="${y1}" stroke="currentColor" stroke-opacity=".12"/>`;
    if (w > 40) g += `<text x="${X(sd0) + w / 2}" y="${y1 + 14}" text-anchor="middle" class="ax">${esc(kurzName(m, b.schichten[i] || {}).slice(0, Math.floor(w / 6)))}</text>`;
    sd0 += kenn[i].sd; });
  for (let p = 0; p <= pmax; p += 500) g += `<line x1="${x0}" x2="${x1}" y1="${Y(p)}" y2="${Y(p)}" stroke="currentColor" stroke-opacity=".08"/><text x="${x0 - 6}" y="${Y(p) + 3.5}" text-anchor="end" class="ax">${p}</text>`;
  g += `<path d="M${K.map((k) => X(k.sd).toFixed(1) + ',' + Y(k.ps).toFixed(1)).join('L')}" fill="none" stroke="${WS_FARBE.ps}" stroke-width="2.6"/>`;
  g += `<path d="M${g0.hull.map((h) => X(h.sd).toFixed(1) + ',' + Y(h.p).toFixed(1)).join('L')}" fill="none" stroke="${WS_FARBE.p}" stroke-width="2.6" stroke-dasharray="${g0.tauwasser ? '' : '7 4'}"/>`;
  (g0.ebenen || []).forEach((e) => { g += `<circle cx="${X(e.sd)}" cy="${Y(WSP.psat(e.t))}" r="5" fill="${WS_FARBE.aussen}"/>`; });
  g += `<text x="${x0}" y="12" class="hd">Pa</text><text x="${x1}" y="${y1 + 26}" text-anchor="end" class="ax">sd [m] →</text>
    <g transform="translate(${x0},${y1 + 34})"><rect width="12" height="3" y="4" fill="${WS_FARBE.ps}"/><text x="18" y="9" class="lb">Sättigungsdampfdruck</text><rect width="12" height="3" x="170" y="4" fill="${WS_FARBE.p}"/><text x="188" y="9" class="lb">Dampfdruck${g0.tauwasser ? ' – berührt: Tauwasser' : ''}</text></g>`;
  return `<svg class="ws-g" viewBox="0 0 ${W} ${H}" role="img" aria-label="Glaser-Diagramm">${g}</svg>`;
}

/* Hitzeschutz: Temperaturschwankung außen (±10 K) und innen über zwei Tage – gedämpft und verschoben */
function hitzeSvg(i) {
  const W = 560, H = 250, x0 = 44, x1 = W - 16, ym = 112, A = 70, X = (h) => x0 + h / 48 * (x1 - x0), ai = A * Math.min(1, i.dekrement);
  const welle = (amp, vers) => { let d = ''; for (let h = 0; h <= 48; h += 0.25) d += (h ? 'L' : 'M') + X(h).toFixed(1) + ',' + (ym - amp * Math.cos((h - 15 - vers) / 24 * 2 * Math.PI)).toFixed(1); return d; };
  let g = '';
  for (let h = 0; h <= 48; h += 6) g += `<line x1="${X(h)}" x2="${X(h)}" y1="30" y2="${H - 46}" stroke="currentColor" stroke-opacity=".08"/><text x="${X(h)}" y="${H - 34}" text-anchor="middle" class="ax">${h} h</text>`;
  g += `<line x1="${x0}" x2="${x1}" y1="${ym}" y2="${ym}" stroke="currentColor" stroke-opacity=".15"/>`;
  g += `<path d="${welle(A, 0)}" fill="none" stroke="${WS_FARBE.innen}" stroke-width="2.6"/><path d="${welle(ai, i.phasenverschiebung)}" fill="none" stroke="${WS_FARBE.aussen}" stroke-width="2.6"/>`;
  const hm = 15 + i.phasenverschiebung;
  g += `<line x1="${X(15)}" x2="${X(hm)}" y1="${ym - A - 8}" y2="${ym - A - 8}" stroke="currentColor" stroke-opacity=".5" marker-end="url(#wsPf)"/><text x="${(X(15) + X(hm)) / 2}" y="${ym - A - 12}" text-anchor="middle" class="lb">${zahl(i.phasenverschiebung, 1)} h später</text>`;
  g += `<defs><marker id="wsPf" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="currentColor" fill-opacity=".5"/></marker></defs>
    <g transform="translate(${x0},${H - 14})"><rect width="12" height="3" y="-4" fill="${WS_FARBE.innen}"/><text x="18" y="1" class="lb">außen (±10 K)</text><rect width="12" height="3" x="130" y="-4" fill="${WS_FARBE.aussen}"/><text x="148" y="1" class="lb">innen – gedämpft und verschoben</text></g>`;
  return `<svg class="ws-g" viewBox="0 0 ${W} ${H}" role="img" aria-label="Temperaturwelle über einen Tag">${g}</svg>`;
}
