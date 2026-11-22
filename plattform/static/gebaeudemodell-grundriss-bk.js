'use strict';
/* Gebäudemodell – Grundriss im Baukasten (Etappe 5 „Gebäudemodell neu“, GO 22.11.2026, Mock „Etappe 5“: G1-A G2-A G3-A G4-A).
   Ohne Plan entsteht das Innere hier: „／ Wand“ – Linie ziehen (Maus drücken, loslassen; rechtwinklig, Umschalt = frei; rastet an Außen- und
   Innenwänden ein) = Innenwand; „▭ Treppe“ – Rechteck ziehen, Laufrichtung = Zugrichtung, danach das Eigenschaften-Fenster (Form, Material,
   Steigungen, Schrittmaß); Doppelklick in einen Raum = Name, Rechtsklick = „offen bis unters Dach“. Gewählte Wand/Treppe: Entf.
   Die Daten gehören dem Baukasten (bp/gebaeudekasten.js, G3.BK.grundriss): er rechnet das 3D und speichert mit Rückgängig; die Räume rechnet der
   Kern (bpcore/baukasten_innen.py) – sie kommen mit dem nächsten Stand.
   Nutzt aus gebaeudemodell*.js: PID, BT, G3, GR, LS, api, toast, esc, bpEingabe, bpEigen, grZ, gmGrundriss. */
const GRB = { tool: 'wahl', sel: null, zieh: null };
const grR = (v) => Math.round(v / 0.05) * 0.05;
const grKz = (F, fk, p) => (F.koerper || []).find((k) => k.g === fk && p[0] >= k.x - 0.01 && p[0] <= k.x + k.w + 0.01 && p[1] >= k.y - 0.01 && p[1] <= k.y + k.d + 0.01);
function grPunkt(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, -q.y]; }
function grFang(F, k, p, achse) {   // an Innenkanten der Außenwand und vorhandenen Innenwänden einrasten (30 cm), sonst 5-cm-Raster; nie aus dem Körper
  const a = k.aussen, X = [k.x + a, k.x + k.w - a], Y = [k.y + a, k.y + k.d - a];
  (F.innen || []).filter((w) => w.k === k.k).forEach((w) => { if (Math.abs(w.a[0] - w.b[0]) < 0.01) X.push(w.a[0]); if (Math.abs(w.a[1] - w.b[1]) < 0.01) Y.push(w.a[1]); });
  const nah = (L, v) => L.reduce((b, q) => (Math.abs(q - v) < Math.abs(b - v) ? q : b), Infinity);
  let [x, y] = [grR(p[0]), grR(p[1])];
  if (achse !== 'y' && Math.abs(nah(X, p[0]) - p[0]) < 0.3) x = nah(X, p[0]);
  if (achse !== 'x' && Math.abs(nah(Y, p[1]) - p[1]) < 0.3) y = nah(Y, p[1]);
  return [Math.min(Math.max(x, X[0]), X[1]), Math.min(Math.max(y, Y[0]), Y[1])];
}
const grBK = () => (G3.BK && G3.BK.grundriss) || null;

function grBk(box, F, fk) {   // nach jedem Zeichnen des Grundrisses (gmGrundriss), nur Baukasten-Arbeitsstand
  const kopf = box.querySelector('.gr-k'), svg = box.querySelector('.gr-b svg'); if (!kopf || !svg) return;
  const n = (F.flaechen || []).filter((f) => f.g === fk).length;
  kopf.querySelector('.mute').textContent = `${n} ${n === 1 ? 'Raum' : 'Räume'} aus den Wänden · Doppelklick in einen Raum: Name`;
  kopf.insertAdjacentHTML('beforeend', `<span class="gr-wz" role="group" aria-label="Werkzeug">${[['wahl', '✋ Wählen', 'Wand oder Treppe wählen (Entf entfernt), Raum doppelklicken = Name'], ['wand', '／ Wand', 'Linie ziehen = Innenwand – rechtwinklig, Umschalt = frei; rastet an den Wänden ein'], ['treppe', '▭ Treppe', 'Rechteck ziehen = Treppe, Laufrichtung = Zugrichtung']]
    .map(([k, t, ti]) => `<button type="button" class="btn sm${GRB.tool === k ? ' on' : ''}" data-grwz="${k}" aria-pressed="${GRB.tool === k}" title="${ti}">${t}</button>`).join('')}</span>`);
  const y = (v) => (-v).toFixed(3);
  const iw = (F.innen || []).filter((w) => w.g === fk).map((w) => `<g class="gr-iw${GRB.sel === w.id ? ' an' : ''}" data-griw="${esc(w.id)}"><title>Innenwand – ${grZ(Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]))} m · Entf entfernt</title><line x1="${w.a[0]}" y1="${y(w.a[1])}" x2="${w.b[0]}" y2="${y(w.b[1])}"/></g>`).join('');
  const tr = (F.treppen || []).filter((t) => t.g === fk).map((t) => { const pf = { xp: '→', xm: '←', yp: '↑', ym: '↓' }[t.r];
    return `<g class="gr-tr${GRB.sel === t.id ? ' an' : ''}" data-grtr="${esc(t.id)}"><title>Treppe – ${t.stg} Steigungen · Doppelklick: Eigenschaften · Entf entfernt</title><rect x="${t.x}" y="${y(t.y + t.l)}" width="${t.w}" height="${t.l}"/>
      <text x="${t.x + t.w / 2}" y="${y(t.y + t.l / 2)}" font-size="${Math.min(t.w, t.l) * 0.4}">${pf}</text></g>`; }).join('');
  svg.insertAdjacentHTML('beforeend', `<g class="gr-bk">${iw}${tr}</g><line class="gr-neu" hidden/><rect class="gr-neu" hidden/>`);
  svg.classList.toggle('gr-zieh', GRB.tool !== 'wahl');
  svg.onpointerdown = (e) => {
    if (GRB.tool === 'wahl' || e.button !== 0) return;
    const p = grPunkt(svg, e), k = grKz(F, fk, p); if (!k) return toast('Bitte innerhalb des Gebäudes beginnen.');
    e.preventDefault(); svg.setPointerCapture(e.pointerId); GRB.zieh = { k, a: grFang(F, k, p), id: e.pointerId };
  };
  svg.onpointermove = (e) => {
    const Z = GRB.zieh; if (!Z) return;
    const p = grPunkt(svg, e);
    if (GRB.tool === 'wand') {
      let b = grFang(F, Z.k, p, e.shiftKey ? '' : Math.abs(p[0] - Z.a[0]) >= Math.abs(p[1] - Z.a[1]) ? 'x' : 'y');
      if (!e.shiftKey) b = Math.abs(p[0] - Z.a[0]) >= Math.abs(p[1] - Z.a[1]) ? [b[0], Z.a[1]] : [Z.a[0], b[1]];
      Z.b = b; const l = svg.querySelector('line.gr-neu'); Object.entries({ x1: Z.a[0], y1: y(Z.a[1]), x2: b[0], y2: y(b[1]) }).forEach(([k, v]) => l.setAttribute(k, v)); l.hidden = false;
    } else { const b = grFang(F, Z.k, p); Z.b = b; const r = svg.querySelector('rect.gr-neu');
      Object.entries({ x: Math.min(Z.a[0], b[0]), y: y(Math.max(Z.a[1], b[1])), width: Math.abs(b[0] - Z.a[0]), height: Math.abs(b[1] - Z.a[1]) }).forEach(([k, v]) => r.setAttribute(k, v)); r.hidden = false; }
  };
  svg.onpointerup = () => {
    const Z = GRB.zieh; GRB.zieh = null; if (!Z || !Z.b) return;
    const B = grBK(); if (!B) return toast('Der Baukasten lädt noch – bitte gleich noch einmal.', true);
    if (GRB.tool === 'wand') {
      if (Math.hypot(Z.b[0] - Z.a[0], Z.b[1] - Z.a[1]) < 0.3) return;
      B.innenNeu(Z.k.k, Z.a, Z.b); toast('Innenwand gezogen – die Räume teilen sich mit dem Speichern.');
    } else {
      const w = grR(Math.abs(Z.b[0] - Z.a[0])), l = grR(Math.abs(Z.b[1] - Z.a[1])); if (w < 0.6 || l < 0.6) return toast('Eine Treppe braucht mindestens 60 cm in beide Richtungen.');
      const r = w >= l ? (Z.b[0] > Z.a[0] ? 'xp' : 'xm') : (Z.b[1] > Z.a[1] ? 'yp' : 'ym');
      const id = B.treppeNeu(Z.k.k, { x: Math.min(Z.a[0], Z.b[0]), y: Math.min(Z.a[1], Z.b[1]), w, l, r }); GRB.sel = id; grTreppe(id, Z.k);
    }
  };
}

/* Eigenschaften der Treppe – das gemeinsame Eigenschaften-Fenster (bp/eigenschaften.js) */
const TR_FORM = [['gerade', 'gerade'], ['viertel', 'L · viertelgewendelt'], ['halb', 'U · halbgewendelt'], ['wendel', 'Wendel']];
const TR_MAT = [['stahlbeton', 'Stahlbeton'], ['holz', 'Holz'], ['stahl', 'Stahl'], ['stahlholz', 'Stahl + Holzstufen']];
function grTreppe(id, k) {
  const B = grBK(); if (!B || !window.bpEigen) return;
  const t = () => B.jetzt().treppen.find((x) => x.id === id); if (!t()) return;
  const KK = k || (GR.F.koerper || []).find((q) => q.k === t().k) || { h: 2.75 };
  const E = bpEigen({ key: 'gr.tr', titel: 'Eigenschaften · Treppe', klasse: 'gr-trp', aktion: (m, f, zu) => { if (m === 'x') zu(); } });
  const zeig = () => { const T = t(); if (!T) return E.zu(); const n = T.stg || Math.max(2, Math.round((KK.h + 0.2) / 0.175)), s = (KK.h + 0.2) / n * 100, lauf = T.r === 'xp' || T.r === 'xm' ? T.w : T.l, a = lauf / Math.max(1, n - 1) * 100, sm = 2 * s + a;
    E.body.innerHTML = `<div class="gr-trf"><div><b>Form</b><div class="gr-ch">${TR_FORM.map(([v, x]) => `<button type="button" class="bt-chip${T.form === v ? ' on' : ''}" data-trf="form:${v}">${x}</button>`).join('')}</div></div>
      <div><b>Material</b><div class="gr-ch">${TR_MAT.map(([v, x]) => `<button type="button" class="bt-chip${T.mat === v ? ' on' : ''}" data-trf="mat:${v}">${x}</button>`).join('')}</div></div>
      <label class="gr-trz"><b>Steigungen</b><input type="number" min="2" max="40" value="${n}" data-trstg> <span class="mute">${T.stg ? 'eingegeben' : `Vorschlag aus ${grZ(KK.h)} m Geschosshöhe`} → ${grZ(s)} cm</span></label>
      <p class="gr-trh${sm < 59 || sm > 65 ? ' rot' : ''}">Schrittmaß 2 × ${grZ(s)} + ${grZ(a)} = ${grZ(sm)} cm ${sm < 59 || sm > 65 ? '– außerhalb 59–65 cm' : '✓ (59–65)'}. Keine Planung nach DIN 18065 – nur für Kosten und Ausschreibung.</p>
      <p class="mute">Laufbreite ${grZ(T.r === 'xp' || T.r === 'xm' ? T.l : T.w)} m · Kostengruppe 351 · das Deckenloch kommt von selbst in die Decke darüber.</p>
      <button type="button" class="btn sm" data-trweg>Treppe entfernen</button></div>`; };
  zeig();
  E.body.onclick = (e) => { const c = e.target.closest('[data-trf]'); if (c) { const [f, v] = c.dataset.trf.split(':'); B.treppeSetzen(id, { [f]: v }); return zeig(); }
    if (e.target.closest('[data-trweg]')) { B.treppeWeg(id); E.zu(); } };
  E.body.onchange = (e) => { if (e.target.matches('[data-trstg]')) { B.treppeSetzen(id, { stg: Math.max(2, Math.min(40, Math.round(+e.target.value || 0))) }); zeig(); } };
}

/* Wählen, Entf, Doppelklick, Kontextmenü – nur im Baukasten-Grundriss */
const grBkAn = () => GR.F && GR.F.art === 'baukasten' && !GR.an && GR.box && GR.box.isConnected && GR.box.offsetParent !== null;
document.addEventListener('click', (e) => {
  const w = e.target.closest && e.target.closest('[data-grwz]');
  if (w) { GRB.tool = w.dataset.grwz; GRB.sel = null; return gmGrundriss(w.closest('.gm-gr')); }
  if (!grBkAn()) return;
  const s = e.target.closest && e.target.closest('[data-griw],[data-grtr]');
  if (s && GRB.tool === 'wahl') { GRB.sel = s.dataset.griw || s.dataset.grtr; GR.box.querySelectorAll('.gr-bk .an').forEach((g) => g.classList.remove('an')); s.classList.add('an');
    if (s.dataset.grtr && e.detail === 2) grTreppe(s.dataset.grtr); }
}, true);
document.addEventListener('dblclick', async (e) => {
  if (!grBkAn() || GRB.tool !== 'wahl') return;
  const g = e.target.closest && e.target.closest('[data-grf]'); if (!g) return;
  const f = GR.fl[+g.dataset.grf], B = grBK(); if (!f || !B) return;
  const n = await bpEingabe(`Name des Raums (${grZ(f.flaeche)} m²):`, (f.raum || {}).name === 'Raum' ? '' : (f.raum || {}).name || ''); if (n == null) return;
  B.raum(f.k, f.mitte, { name: String(n).trim().slice(0, 80) });
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Delete' || !GRB.sel || !grBkAn() || (window.bpTippt && bpTippt(e.target))) return;
  const B = grBK(); if (!B) return; e.preventDefault(); e.stopImmediatePropagation();
  if (GR.box.querySelector(`[data-griw="${CSS.escape(GRB.sel)}"]`)) B.innenWeg(GRB.sel); else B.treppeWeg(GRB.sel);
  GRB.sel = null;
}, true);
document.addEventListener('bph:kontext', (e) => {
  if (!grBkAn()) return;
  const t = e.detail && e.detail.ziel, B = grBK(); if (!B || !t || !t.closest) return;
  const s = t.closest('[data-griw],[data-grtr]');
  if (s) { const id = s.dataset.griw || s.dataset.grtr; e.detail.punkte.push({ titel: s.dataset.griw ? 'Innenwand' : 'Treppe' }, ...(s.dataset.grtr ? [{ text: 'Eigenschaften …', fn: () => grTreppe(id) }] : []),
    { text: 'Entfernen', k: 'Entf', gefahr: true, fn: () => (s.dataset.griw ? B.innenWeg(id) : B.treppeWeg(id)) }); return; }
  const g = t.closest('[data-grf]'); if (!g) return;
  const f = GR.fl[+g.dataset.grf], o = !!f.offen;
  e.detail.punkte.push({ titel: (f.raum || {}).name || 'Raum' }, { text: 'Umbenennen …', fn: async () => { const n = await bpEingabe('Name des Raums:', (f.raum || {}).name || ''); if (n != null) B.raum(f.k, f.mitte, { name: String(n).trim().slice(0, 80) }); } },
    { text: o ? 'Mit Decke (nicht offen)' : 'Offen bis unters Dach', fn: () => B.raum(f.k, f.mitte, { offen: !o, name: (f.raum || {}).name === 'Raum' ? '' : (f.raum || {}).name }) });
});
