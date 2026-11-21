'use strict';
/* Gebäudemodell – Ansicht „Grundriss“ (GO 20.11.2026, Mock „Gebäudemodell schlank“ A1; Räume annehmen A1 B1 C1 D1): je Geschoss die Wände,
   Fenster und Türen von oben (aus dem 3D-Netz des Plans) und die Flächen zwischen den Wänden (Kern bpcore/grundriss.py). Blau = Raum (aus dem
   Plan oder schon ermittelt) – Klick zeigt rechts die Zeile mit dem Raumbuch; gelb gestrichelt = Fläche ohne Raum – Klick nimmt sie als Raum an
   (Ergänzung neben dem Plan, PUT /plus, mit Rückgängig). Ohne Plan gibt es keinen Grundriss – dann steht der Weg zu den Räumen da.
   Nutzt aus gebaeudemodell.js / -3d.js: PID, BT, G3, LS, api, toast, bpEingabe, seiteReiter. */
const GR = { N: null, F: null, g: null, rev: null };
const grZ = (v) => bpZahl(v, 0, 2);

async function gmGrundriss(box, neu) {
  if (!box) return;
  const st = BT ? BT.zustand() : {};
  if (neu || GR.rev !== st.rev) { GR.F = null; GR.rev = st.rev; }
  if (!GR.F) {
    box.innerHTML = '<p class="mute">Grundriss wird gerechnet …</p>';
    try {
      const [N, F] = await Promise.all([G3.N ? Promise.resolve(G3.N) : api(`api/bp/modell/${PID}/netz`).catch(() => null), api(`api/bp/modell/${PID}/grundriss`)]);
      GR.N = N; GR.F = F;
    } catch (e) { box.innerHTML = `<p class="mute">${esc(e.message)}</p>`; return; }
  }
  const N = GR.N, F = GR.F;
  if (!N || !(N.e || []).length) {
    box.innerHTML = `<div class="gm-hin"><span>Den Grundriss gibt es mit einem eingelesenen Plan (IFC). Ohne Plan: das Gebäude in „3D“ mit dem Baukasten bauen, Räume in der Tabelle unter „Räume“ eintragen.</span>
      <button type="button" class="btn" data-gmtr="raeume">Räume</button></div>`;
    return;
  }
  const G = N.geschosse || [];
  if (GR.g == null || GR.g >= G.length) { const m = +LS.get('grg'); GR.g = m >= 0 && m < G.length ? m : Math.max(0, G.findIndex((g) => /erd|eg\b/i.test(g.n))); }
  const gi = GR.g, gn = (G[gi] || {}).n || '';
  const fk = (F.geschosse || []).findIndex((g) => g.n === gn), FL = (F.flaechen || []).filter((f) => (fk >= 0 ? f.g === fk : false));
  // Wände, Fenster, Türen dieses Geschosses von oben (cm → m, y nach unten im Bild)
  const pfad = { w: '', f: '', d: '', x: '' }; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of N.e) {
    if (e.g !== gi || !(e.t in pfad)) continue;
    const v = e.v; let p = '';
    for (let k = 0; k + 8 < v.length; k += 9) {
      const a = [v[k] / 100, -v[k + 1] / 100], b = [v[k + 3] / 100, -v[k + 4] / 100], c = [v[k + 6] / 100, -v[k + 7] / 100];
      const kr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(kr) < 1e-4) continue;   // senkrechte Fläche: von oben nur eine Linie
      const [q, r] = kr > 0 ? [b, c] : [c, b];   // alle Dreiecke gleich herum – sonst heben sich Ober- und Unterseite beim Füllen auf
      p += `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${q[0].toFixed(2)} ${q[1].toFixed(2)}L${r[0].toFixed(2)} ${r[1].toFixed(2)}Z`;
      for (const q of [a, b, c]) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    }
    pfad[e.t] += p;
  }
  FL.forEach((f) => f.umriss.forEach(([x, y]) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (-y < y0) y0 = -y; if (-y > y1) y1 = -y; }));
  if (!isFinite(x0)) { x0 = 0; y0 = 0; x1 = 10; y1 = 10; }
  const R = (((st.modell || {}).bauteilliste || {}).raeume) || [], innen = (x, y, P) => { let d = false; for (let k = 0, j = P.length - 1; k < P.length; j = k++) { const [xi, yi] = P[k], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
  const raumVon = (f) => {   // welcher Raum des Modells liegt auf der Fläche?
    const [cx, cy] = f.mitte || f.umriss[0];
    const r = R.find((x) => x.umriss && x.umriss.length > 2 && innen(cx, cy, x.umriss));
    if (r) return r;
    if (f.raum) return R.find((x) => (f.raum.nr && x.nr === f.raum.nr) || (f.raum.name && x.name === f.raum.name && (!x.geschoss || x.geschoss === gn))) || { nr: f.raum.nr, name: f.raum.name || f.raum.nr };
    return null;
  };
  const pad = 1.2, w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad, fs = Math.max(0.28, Math.min(w, h) / 45);
  const fl = FL.map((f, k) => { const r = raumVon(f), pts = f.umriss.map(([x, y]) => `${x.toFixed(2)},${(-y).toFixed(2)}`).join(' '), [cx, cy] = f.mitte || f.umriss[0];
    const t = r ? [r.nr, r.name].filter(Boolean).join(' ') : '＋ Raum', s2 = Math.min(fs, Math.sqrt(f.flaeche) * 0.14, Math.sqrt(f.flaeche) * 1.6 / Math.max(4, t.length));   // Schrift passt in kleine Räume
    return `<g class="gr-f${r ? '' : ' frei'}" data-grf="${k}"><title>${esc(r ? t : 'Fläche ohne Raum – klicken nimmt sie als Raum an')} · ${grZ(f.flaeche)} m²</title><polygon points="${pts}"/><text x="${cx.toFixed(2)}" y="${(-cy).toFixed(2)}" font-size="${s2.toFixed(2)}">${esc(t)}</text><text class="gr-m" x="${cx.toFixed(2)}" y="${(-cy + s2 * 1.25).toFixed(2)}" font-size="${(s2 * 0.85).toFixed(2)}">${grZ(f.flaeche)} m²</text></g>`; }).join('');
  const nFrei = FL.filter((f) => !raumVon(f)).length;
  box.innerHTML = `<div class="gr-k"><span class="gr-gs" role="tablist">${G.map((g, k) => `<button type="button" role="tab" aria-selected="${k === gi}" class="${k === gi ? 'on' : ''}" data-grg="${k}">${esc(g.n)}</button>`).join('')}</span>
      <span class="mute">${F.art === 'ifc' ? `${FL.length} Flächen zwischen den Wänden${nFrei ? ` · <b>${nFrei} ohne Raum</b> – anklicken nimmt sie als Raum an` : ''}` : esc(F.hinweis || 'Flächen gibt es mit einem IFC-Plan.')}</span></div>
    <div class="gr-b"><svg viewBox="${(x0 - pad).toFixed(2)} ${(y0 - pad).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}" preserveAspectRatio="xMidYMid meet" aria-label="Grundriss ${esc(gn)}">
      ${fl}<path class="gr-w" d="${pfad.w}${pfad.x}"/><path class="gr-fe" d="${pfad.f}"/><path class="gr-tu" d="${pfad.d}"/></svg></div>`;
  GR.fl = FL; GR.raumVon = raumVon; GR.gn = gn;
}

document.addEventListener('click', async (e) => {
  const gb = e.target.closest && e.target.closest('[data-grg]');
  if (gb) { GR.g = +gb.dataset.grg; LS.set('grg', GR.g); return gmGrundriss(gb.closest('.gm-gr')); }
  const f = e.target.closest && e.target.closest('[data-grf]'); if (!f || !GR.fl) return;
  const x = GR.fl[+f.dataset.grf], r = GR.raumVon(x);
  if (r) {   // Raum gewählt: rechts die Zeile „Boden“ des Raums mit dem Raumbuch
    const Z = (BT.zustand().zeilen || []).find((z) => z.id.startsWith('raum:boden:') && (z.mitglieder || []).includes(r.nr));
    if (Z) { BT.zeige(Z.id, false); if (window.seiteReiter) seiteReiter('gm', 'details'); } else toast(`${[r.nr, r.name].filter(Boolean).join(' ')} – ${grZ(x.flaeche)} m²`);
    return;
  }
  const name = await bpEingabe(`Fläche ${grZ(x.flaeche)} m² im ${GR.gn} als Raum annehmen – Name des Raums`, ''); if (!name || !String(name).trim()) return;
  try {
    const D = await api(`api/bp/modell/${PID}`), alt = (((D.modell || {}).bauteilliste || {}).plus || {}).raeume || [];
    const neu = [...alt, { nr: '', name: String(name).trim().slice(0, 80), geschoss: GR.gn, flaeche: x.flaeche, hoehe: x.hoehe || 2.5 }];
    const setz = async (L) => { await api(`api/bp/modell/${PID}/plus`, 'PUT', { raeume: L }); GR.F = null; if (BT && BT.laden) await BT.laden(); };
    await setz(neu); toast(`„${String(name).trim()}“ als Raum angenommen – steht gelb als Ergänzung neben dem Plan.`);
    if (window.rueckgaengig) rueckgaengig('Raum angenommen', () => setz(alt), 10000, () => setz(neu));
  } catch (er) { toast(er.message, true); }
});
