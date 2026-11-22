'use strict';
/* Wärmeschutz – der Bereich rechts (seite.js, abdockbar) mit den Grafiken:
   Querschnitt mit Temperaturverlauf (Ergebnisleiste am Bauteil: ws-schichten.js), Glaser-Diagramm (Dampfdruck über sd), Hitzeschutz (Temperaturwelle über 24 h), Prüfung.
   Nutzt aus ws-kern.js: D, WORK, R7, zahl, ergebnis, bauteil, pruefungHtml; aus ws-bauteil.js: BSI, bsName, ntz. */
const WSR = {};   // Reiter-Felder rechts: id → Element
const WS_FARBE = { innen: '#c84b3a', aussen: '#3b6fb0', p: '#2f7d6d', ps: '#c84b3a' };

/* ---------- Bereich rechts ---------- */
function bereich() {
  if (!window.seite || matchMedia('(max-width: 820px)').matches) return;
  const R = (id, titel) => ({ id, titel, mount: (el) => { WSR[id] = el; rechtsFuellen(id); } });
  /* WR-1/WR-7 A (22.11.2026): Gebäudemodell (wie die Baudaten im LV) · Bauphysik (Tauwasser und Hitzeschutz untereinander) · 3D –
     Querschnitt steht im Schichtaufbau in der Mitte, Prüfung ist Karte und Punkt links */
  seite(WORK, 'ws', [{ id: 'modell', titel: 'Gebäudemodell', mount: (el) => wsBaumReiter(el) }, R('phys', 'Bauphysik'), { id: 'd3', titel: '3D', mount: (el) => ws3Mount(el) }], { start: 'modell', w: 0.6, minL: 560, min: 340 });
}
function rechtsNeu() { Object.keys(WSR).forEach(rechtsFuellen); ws3Neu(); }
function rechtsFuellen(id) {
  const el = WSR[id]; if (!el || !el.isConnected) return;
  const b = bauteil(), e = b ? ergebnis(b) : null;
  if (!b || !e || !e.r) { el.innerHTML = `<div class="ws-r mute">${b && R7.ohneSchichten(b.typ) ? 'Fenster und Türen: U-Wert aus dem Datenblatt – keine Schichten.' : 'Links ein Bauteil mit Schichten wählen.'}</div>`; return; }
  if (id !== 'phys') return;
  const r = e.r, g = r.glaser, i = r.inst, m = (t, w, x) => `<div class="ws-mb"><small>${t}</small><b>${w}</b>${x ? `<small>${x}</small>` : ''}</div>`;
  el.innerHTML = `<div class="ws-r"><h4>${esc(b.kurz || '')} ${esc(b.name || '')}</h4>
    <div class="ws-mini">${m('Oberfläche innen', zahl(r.tSchimmel.tsi, 1) + ' °C', 'bei −5 °C, Rsi 0,25')}${m('Dicke · Masse', zahl(r.dicke * 100, 1) + ' cm', zahl(r.masse, 0) + ' kg/m²')}${b.flaeche ? m('Wärmeverlust', zahl(e.u * b.flaeche, 1) + ' W/K', `bei ${zahl(b.flaeche, 1)} m²`) : ''}</div>
    <h4>Tauwasser – Glaser-Verfahren (DIN 4108-3)</h4>${glaserSvg(b, r)}
    <div class="ws-mini">${m('Tauperiode', '−5 / 20 °C', '80 % / 50 %, 90 Tage')}${m('Tauwasser', g.tauwasser ? zahl(g.mc, 3) + ' kg/m²' : 'kein', g.tauwasser ? 'Grenze 1,0 (0,5 an Holz)' : 'Dampfdruck unter Sättigung')}
      ${g.tauwasser ? m('Verdunstung', zahl(g.mev, 3) + ' kg/m²', g.mev >= g.mc ? '✓ trocknet aus' : '✗ trocknet nicht aus') : ''}${m('sd gesamt', zahl(g.sdGes, 2) + ' m', '')}</div>
    <h4>Hitzeschutz – sommerlicher Wärmeschutz (DIN EN ISO 13786)</h4>${i ? hitzeSvg(i) : '<p class="mute">Nicht rechenbar.</p>'}
    ${i ? `<div class="ws-mini">${m('Phasenverschiebung', zahl(i.phasenverschiebung, 1) + ' h', i.phasenverschiebung >= 10 ? '✓ gut (≥ 10 h)' : 'Ziel: ≥ 10 h')}${m('Amplitudendämpfung', zahl(i.daempfung, 1), '')}${m('Dekrement', zahl(i.dekrement, 2), 'kleiner = besser')}</div>` : ''}</div>`;
}

/* ---------- Grafiken ---------- */
const kurzName = (m, s) => ((m ? m.name : s.name) || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/ WLS \d+| \d{3,4}$/, '').trim();


/* Dampfdruck über der sd-Achse: Sättigungsdampfdruck (rot) und vorhandener Dampfdruck (grün); berühren sie sich: Tauwasser */
function glaserSvg(b, r) {
  const g0 = r.glaser, K = g0.knoten, W = 560, H = 300, x0 = 54, x1 = W - 20, y0 = 20, y1 = 230, sdG = Math.max(g0.sdGes, 1e-6);
  const pmax = Math.max(g0.pi, ...K.map((k) => k.ps)) * 1.08, X = (sd) => x0 + sd / sdG * (x1 - x0), Y = (p) => y1 - p / pmax * (y1 - y0);
  let g = '', sd0 = 0;
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
