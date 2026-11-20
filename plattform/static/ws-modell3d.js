'use strict';
/* Wärmeschutz – Reiter „3D“ im Bereich rechts (20.11.2026, Probe „3D-Ansicht“: A1 B1 C1): das Gebäude aus dem gültigen Planstand,
   gefärbt nach dem Nachweis. Derselbe Betrachter wie im Gebäudemodell (bp/ansicht3d.js) – hier nur die Zuordnung:
   Bauteil des Nachweises (ref „bk:<Ermittlung>:<Zeile>“) → Zeile der Bauteilliste → Bauteile im Plan (ids).
   Klick im Modell wählt das Bauteil des Nachweises; ein links gewähltes Bauteil leuchtet im Modell violett.
   Geladen wird erst beim Öffnen des Reiters (Baustein, Modell, Netz). Nutzt aus ws-kern.js: D, PID, BID, R7, ergebnis, typName, zahl, zeichne, WS_AUF. */
let WS3 = null, WS3_EL = null, WS3_Z = null, WS3_T = 0;   // Betrachter, sein Feld, Zeile → Bauteile im Plan, Wartezeit
const WS3_AMPEL = { g: '#58b368', y: '#e9b949', r: '#d9534f', o: '#b9b7af' };
const WS3_ART = ['#d8c4a1', '#c2694b', '#b0553d', '#9fa9b3', '#7f8c99', '#8b99a6', '#a58bb5', '#c9a26b', '#e6e3dc', '#7db5da', '#8a6a4f'];

function ws3Baustein() {
  if (window.bp3d) return Promise.resolve();
  const [b, v] = window.BP_HEAD_BASIS || ['bp/', ''];
  return new Promise((ok, nein) => { const s = document.createElement('script'); s.src = b + 'ansicht3d.js' + v; s.onload = ok; s.onerror = () => nein(new Error('Die 3D-Ansicht konnte nicht geladen werden.')); document.head.appendChild(s); });
}
/* Bauteil im Plan (Nummer) → Bauteil des Nachweises */
function ws3Karte() {
  const K = new Map();
  if (!D || !WS3_Z) return K;
  D.bauteile.forEach((b) => { const ref = b.ref || (b.bk ? 'bk:' + b.bk : ''); if (!ref.startsWith('bk:')) return;
    (WS3_Z[ref.replace(/^bk:[^:]*:/, '')] || []).forEach((i) => K.set(+i, b)); });
  return K;
}
const ws3Stufe = (b) => { const e = ergebnis(b); return e.u == null ? 'o' : e.ok !== false ? 'g' : e.umax && e.u <= e.umax * 1.1 ? 'y' : 'r'; };
function ws3Modi() {
  const K = ws3Karte(), T = R7.TYPEN.map((t) => t[0]);
  return [{ key: 'ws-u', name: 'U-Wert', farbe: (e) => { const b = K.get(e.i); return b ? WS3_AMPEL[ws3Stufe(b)] : null; },
    legende: [[WS3_AMPEL.g, 'hält den Höchstwert ein'], [WS3_AMPEL.y, 'bis 10 % darüber'], [WS3_AMPEL.r, 'darüber'], [WS3_AMPEL.o, 'noch ohne U-Wert'], ['#d6d8da', 'nicht im Nachweis']] },
  { key: 'ws-art', name: 'Bauteilart', farbe: (e) => { const b = K.get(e.i); return b ? WS3_ART[Math.max(0, T.indexOf(b.typ))] : null; },
    legende: [...new Set(D.bauteile.map((b) => b.typ))].map((t) => [WS3_ART[Math.max(0, T.indexOf(t))], typName(t)]).concat([['#d6d8da', 'nicht im Nachweis']]) }];
}
function ws3Info(e) {
  const b = ws3Karte().get(e.i);
  if (!b) return '<b>Nicht im Nachweis</b><small>Dieses Bauteil des Plans gehört zu keinem Bauteil des Nachweises.</small>';
  const r = ergebnis(b), s = ws3Stufe(b);
  return `<b>${esc(`${b.kurz || ''} ${b.name || typName(b.typ)}`.trim())}</b>${esc(typName(b.typ))}${b.flaeche ? ' · ' + zahl(b.flaeche, 1) + ' m²' : ''}<br>`
    + (r.u == null ? 'noch ohne U-Wert' : `U = ${zahl(r.u, 3)}${r.umax != null ? ` · U max ${zahl(r.umax)} ${s === 'g' ? '✓' : '✗'}` : ' · keine Anforderung'}`);
}
function ws3Wahl(ids, e) {   // Klick im Modell: das Bauteil des Nachweises wählen (links und in der Mitte)
  const b = e ? ws3Karte().get(e.i) : null;
  if (b && b.id !== BID) { BID = b.id; WS_AUF.add('bauteile'); zeichne(); }
  else if (e && ids.length < 2 && WS3) WS3.waehle(ws3Ids(bauteil()));   // einfacher Klick: es leuchtet immer das Bauteil, das links gewählt ist
}
const ws3Ids = (b) => { if (!b || !WS3_Z) return []; const ref = b.ref || (b.bk ? 'bk:' + b.bk : ''); return ref.startsWith('bk:') ? (WS3_Z[ref.replace(/^bk:[^:]*:/, '')] || []) : []; };
async function ws3Mount(el) {
  WS3 = null; WS3_EL = el; const pid = PID;
  if (!pid || !D) { el.innerHTML = '<div class="ws-r mute">Erst einen Nachweis anlegen.</div>'; return; }
  el.innerHTML = '<div class="ws-r mute">3D-Ansicht wird geladen …</div>';
  try {
    const [, m] = await Promise.all([ws3Baustein(), api(`api/bp/modell/${pid}`)]);
    if (pid !== PID || !el.isConnected) return;
    const Z = (((m || {}).modell || {}).bauteilliste || {}).zeilen || [];
    WS3_Z = {}; Z.forEach((z) => { WS3_Z[z.id] = z.ids || []; });
    el.innerHTML = '<div class="ws-3d"></div>';
    WS3 = bp3d.mount(el.firstChild, { url: `api/bp/modell/${pid}/netz`, zeilen: Z, modi: ws3Modi(), start: 'ws-u', wahl: true, info: ws3Info, onWahl: ws3Wahl });
    if (WS3 && bauteil()) WS3.waehle(ws3Ids(bauteil()));
  } catch (er) { el.innerHTML = `<div class="ws-r mute">${esc(er.message)}</div>`; }
}
/* nach jedem Neuzeichnen der Seite: Farben und das gewählte Bauteil nachführen – nur wenn der Reiter offen ist, und nicht bei jedem Tastendruck */
function ws3Neu() {
  if (!WS3 || !WS3_EL || !WS3_EL.isConnected || !WS3_EL.offsetParent) return;
  clearTimeout(WS3_T); WS3_T = setTimeout(() => { if (!WS3 || !D) return; WS3.farben(ws3Modi()); WS3.waehle(ws3Ids(bauteil())); }, 200);
}
