'use strict';
/* =====================================================================
   Seite „Ablauf“ – Gebäudeteile als Kisten mit Pfeilen (GO 18.11.2026, Mock „Gebäudeteile in der Planung“: F, G2, H)
   - Eine zweite ganze Seite neben dem Gantt (Navigation „Ablauf der Teile“). Kisten = Gebäudeteile des Plans (Gruppen „_teil“,
     assist.js: buildTeile). Doppelklick öffnet eine Kiste mit ihren Leistungen.
   - Pfeile von Kiste zu Kiste oder von/zu einer Leistung darin, alle Arten (EA, AA, EE, AE) mit Abstand in AT. Gespeichert in
     P.ablauf.links ({von, nach, vonCat?, nachCat?, type, lag}) und immer als Vorgänger im Plan nachgeführt (pred.kiste) – dieselbe
     Verknüpfung, zwei Ansichten (H: immer automatisch). Ein neu erzeugter Plan bekommt die Pfeile wieder (Katalog-Kennung der Leistung).
   - Pfeile zwischen Leistungen verschiedener Teile, die man im Gantt zieht, erscheinen hier gestrichelt und lassen sich ebenso ändern.
   - Gruppieren nach Gebäudeteil oder Bauphase (B2): gruppieren(mode) ordnet die Zeilen des Plans um, Blätter behalten Nummer und Vorgänger.
   ===================================================================== */
(function () {
  const ART = [['FS', 'Ende → Anfang'], ['SS', 'Anfang → Anfang'], ['FF', 'Ende → Ende'], ['SF', 'Anfang → Ende']];
  const STRUKTUR = new Set(['_teil', '_grp', '_teilph']);
  const AB = () => { if (!P.ablauf || typeof P.ablauf !== 'object') P.ablauf = {}; P.ablauf.pos = P.ablauf.pos || {}; P.ablauf.links = P.ablauf.links || []; return P.ablauf; };
  const PK = () => window.PlanKern;
  const hatTeile = () => !!(P && P.tasks.some((t) => t.cat === '_teil' || t.cat === '_teilph'));
  function teileListe() {   // Reihenfolge und Namen: Assistent, sonst die Gruppen im Plan
    const L = [], da = new Set();
    const ausAss = P.assist && P.assist.type && PK() ? PK().teile(JSON.parse(JSON.stringify(P.assist))) : [];
    for (const t of P.tasks) if ((t.cat === '_teil' || t.cat === '_teilph') && t.teil && !da.has(t.teil)) { da.add(t.teil); const a = ausAss.find((x) => x.k === t.teil); L.push({ k: t.teil, n: (a && a.n) || t.name }); }
    return L;
  }

  /* ---------- Pfeile als Vorgänger nachführen ---------- */
  function ablaufNachfuehren() {
    if (!P || !P.ablauf || !Array.isArray(P.ablauf.links)) return;
    for (const t of P.tasks) if (t.preds && t.preds.some((p) => p.kiste)) t.preds = t.preds.filter((p) => !p.kiste);
    const enden = (k, cat) => (cat ? P.tasks.filter((t) => t.teil === k && t.cat === cat) : P.tasks.filter((t) => (t.cat === '_teil' || t.cat === '_teilph') && t.teil === k));
    for (const l of P.ablauf.links) {
      const Q = enden(l.von, l.vonCat), Z = enden(l.nach, l.nachCat);
      for (const z of Z) for (const q of Q) if (q !== z && !z.preds.some((p) => p.uid === q.uid)) z.preds.push({ uid: q.uid, type: l.type || 'FS', lag: +l.lag || 0, kiste: true });
    }
  }
  window.ablaufNachfuehren = ablaufNachfuehren;

  /* ---------- Gruppieren nach Gebäudeteil oder Bauphase ---------- */
  function gruppieren(mode) {
    if (!hatTeile()) return false;
    return act(() => {
      const T = P.tasks, n = T.length, st = [], info = [];
      for (let i = 0; i < n; i++) {
        const t = T[i]; while (st.length && T[st[st.length - 1]].lvl >= t.lvl) st.pop();
        const anc = st.map((j) => T[j]); st.push(i);
        info.push({ t, anc, teil: t.teil || ((anc.slice().reverse().find((a) => a.teil)) || {}).teil || '', ph: (anc.slice().reverse().find((a) => a.cat === '_grp' && a.ph) || {}).ph || '' });
      }
      // Einheiten: Teilbäume, deren Wurzel keine Gliederungszeile ist und deren Eltern nur Gliederungszeilen sind
      const einh = [], alt = new Map();
      for (let i = 0; i < n; i++) {
        const x = info[i];
        if (STRUKTUR.has(x.t.cat)) { alt.set(`${x.t.cat}|${x.t.teil || ''}|${x.t.cat === '_teil' ? '' : x.t.ph || x.ph}`, x.t); continue; }
        if (x.anc.some((a) => !STRUKTUR.has(a.cat))) continue;
        const rows = [x.t]; for (let j = i + 1; j < n && T[j].lvl > x.t.lvl; j++) rows.push(T[j]);
        einh.push({ rows, teil: x.teil, ph: x.t.cat === '_start' || x.t.cat === '_end' ? '' : x.ph || (x.t.cat ? (PK().B(x.t.cat) || {}).ph || '' : ''), cat: x.t.cat });
      }
      const PH = PK().C.phases.map((p) => p.k), GEM = (window.AssistCore && AssistCore.GEMEINSAM) || ['planung', 'vorb', 'abschluss'];
      const TL = teileListe(), out = [];
      const zeile = (cat, teil, ph, name, lvl) => { const k = `${cat}|${teil}|${ph}`; let r = alt.get(k); if (!r) { r = newTask(name, 1); r.cat = cat; r.teil = teil || undefined; r.ph = ph; if (!teil) delete r.teil; } r.lvl = lvl; if (cat === '_teil' || cat === '_teilph') r.name = name; out.push(r); };
      const setze = (u, lvl) => { const d = lvl - u.rows[0].lvl; u.rows.forEach((r) => { r.lvl += d; out.push(r); }); };
      const gem = (phs) => phs.forEach((ph) => { const U = einh.filter((u) => !u.teil && u.ph === ph && u.cat !== '_start' && u.cat !== '_end'); if (!U.length) return; zeile('_grp', '', ph, PK().PHN[ph], 0); U.forEach((u) => setze(u, 1)); });
      einh.filter((u) => u.cat === '_start').forEach((u) => setze(u, 0));
      gem(GEM.filter((p) => p !== 'abschluss'));
      einh.filter((u) => !u.teil && !u.ph && u.cat !== '_start' && u.cat !== '_end').forEach((u) => setze(u, 0));
      if (mode === 'phase') {
        PH.filter((ph) => !GEM.includes(ph)).forEach((ph) => {
          const da = TL.filter((tl) => einh.some((u) => u.teil === tl.k && u.ph === ph)); if (!da.length) return;
          zeile('_grp', '', ph, PK().PHN[ph], 0);
          da.forEach((tl) => { zeile('_teilph', tl.k, ph, tl.n, 1); einh.filter((u) => u.teil === tl.k && u.ph === ph).forEach((u) => setze(u, 2)); });
        });
        TL.forEach((tl) => { const U = einh.filter((u) => u.teil === tl.k && !PH.includes(u.ph)); if (U.length) { zeile('_teilph', tl.k, '', tl.n, 0); U.forEach((u) => setze(u, 1)); } });
      } else {
        TL.forEach((tl) => {
          zeile('_teil', tl.k, '', tl.n, 0);
          PH.forEach((ph) => { const U = einh.filter((u) => u.teil === tl.k && u.ph === ph); if (!U.length) return; zeile('_grp', tl.k, ph, PK().PHN[ph], 1); U.forEach((u) => setze(u, 2)); });
          einh.filter((u) => u.teil === tl.k && !PH.includes(u.ph)).forEach((u) => setze(u, 1));
        });
      }
      gem(['abschluss']);
      einh.filter((u) => u.cat === '_end').forEach((u) => setze(u, 0));
      const drin = new Set(out); T.filter((t) => !drin.has(t)).forEach((t) => { if (!STRUKTUR.has(t.cat)) { t.lvl = 0; out.push(t); } });   // nichts geht verloren
      const weg = new Set(T.filter((t) => !out.includes(t)).map((t) => t.uid));
      P.tasks = out; P.tasks.forEach((t) => { t.preds = (t.preds || []).filter((p) => !weg.has(p.uid)); });
      AB().gruppe = mode === 'phase' ? 'phase' : 'teil';
      ablaufNachfuehren();
    });
  }
  window.ablaufGruppieren = gruppieren;
  window.ablaufHatTeile = hatTeile;

  /* ---------- Seite ---------- */
  const SICHT = () => document.getElementById('ablaufView');
  const an = () => { const v = SICHT(); return !!(v && !v.hidden); };
  const offen = new Set((() => { try { return JSON.parse(localStorage.getItem('gantt.ablauf.auf') || '[]'); } catch { return []; } })());
  const merkeOffen = () => { try { localStorage.setItem('gantt.ablauf.auf', JSON.stringify([...offen])); } catch { /* ohne Speicher */ } };
  const KW = 280;
  function lage(TL) {
    const A = AB(), pos = {};
    TL.forEach((tl, i) => { const p = A.pos[tl.k]; pos[tl.k] = p ? { x: p[0], y: p[1] } : { x: 30 + (i % 3) * (KW + 90), y: 30 + Math.floor(i / 3) * 260 }; });
    return pos;
  }
  function blaetter(k) {
    const out = []; if (!CAL) return out;
    P.tasks.forEach((t, i) => { if (t.teil === k && !CAL.summ[i] && !STRUKTUR.has(t.cat)) out.push({ t, i }); });
    return out.sort((a, b) => CAL.es[a.i] - CAL.es[b.i] || a.i - b.i);
  }
  function zeichne() {
    const v = SICHT(); if (!v || !P) return;
    if (!hatTeile()) {
      v.innerHTML = `<div class="ab-leer">${typeof bpLeer === 'function' ? bpLeer({ was: 'keine Gebäudeteile', text: 'Die Seite „Ablauf“ zeigt die Gebäudeteile als Kisten. Gebäudeteile entstehen in der Planung aus den Maßnahmen (Anbau, Aufstockung) oder über „＋ Gebäudeteil“ – danach „Plan neu aus den Angaben erzeugen“.' }) : 'Dieser Plan hat keine Gebäudeteile.'}</div>`;
      return;
    }
    const TL = teileListe(), pos = lage(TL), A = AB();
    const kiste = (tl) => {
      const B = blaetter(tl.k), auf = offen.has(tl.k), p = pos[tl.k];
      const von = B.length ? Math.min(...B.map((b) => CAL.es[b.i])) : 0, bis = B.length ? Math.max(...B.map((b) => CAL.ef[b.i])) : 0;
      const zeit = B.length ? `${fmtD(Math.min(...B.map((b) => CAL.sd[b.i])))} – ${fmtD(Math.max(...B.map((b) => CAL.fd[b.i])))} · ${bis - von} AT` : 'keine Leistungen';
      return `<div class="ab-k${auf ? ' auf' : ''}" data-abk="${esc(tl.k)}" style="left:${p.x}px;top:${p.y}px;width:${KW}px">
        <div class="ab-kk" data-abziel="${esc(tl.k)}|" title="Doppelklick: ${auf ? 'schließen' : 'öffnen'} · ziehen: verschieben"><b>${esc(tl.n)}</b><small>${B.length} Leistungen · ${esc(zeit)}</small>
          <span class="ab-h" data-abvon="${esc(tl.k)}|" title="Pfeil ziehen: diese Kiste vor eine andere Kiste oder Leistung"></span></div>
        ${auf ? `<div class="ab-l">${B.map((b) => `<div class="ab-z" data-abziel="${esc(tl.k)}|${esc(b.t.cat || '#' + b.t.uid)}"><span class="ab-hl" data-abvon="${esc(tl.k)}|${esc(b.t.cat || '#' + b.t.uid)}" title="Pfeil ziehen"></span><span class="ab-zn">${esc(b.t.name)}</span><small>${CAL.dur[b.i]} AT</small><span class="ab-h" data-abvon="${esc(tl.k)}|${esc(b.t.cat || '#' + b.t.uid)}" title="Pfeil ziehen: diese Leistung vor …"></span></div>`).join('') || '<div class="ab-z"><small>keine Leistungen</small></div>'}</div>` : ''}</div>`;
    };
    const w = Math.max(900, ...TL.map((tl) => pos[tl.k].x + KW + 60)), h = Math.max(500, ...TL.map((tl) => pos[tl.k].y + (offen.has(tl.k) ? 60 + 26 * blaetter(tl.k).length : 80) + 60));
    const roll = v.querySelector('.ab-roll'), sx = roll ? roll.scrollLeft : 0, sy = roll ? roll.scrollTop : 0;
    v.innerHTML = `<div class="ab-kopf"><b>Ablauf der Gebäudeteile</b><span class="mute">Doppelklick öffnet eine Kiste · am Punkt rechts ziehen = Pfeil · Pfeil anklicken = Art und Abstand · dieselben Verknüpfungen wie im Gantt</span>
      <span class="ab-gr" role="group" aria-label="Gantt gruppieren nach"><span>Gantt gruppiert nach</span><button type="button" data-abgr="teil" class="${A.gruppe === 'phase' ? '' : 'on'}">Gebäudeteil</button><button type="button" data-abgr="phase" class="${A.gruppe === 'phase' ? 'on' : ''}">Bauphase</button></span></div>
      <div class="ab-roll"><div class="ab-flaeche" style="width:${w}px;height:${h}px"><svg class="ab-svg" width="${w}" height="${h}"><defs><marker id="abP" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="currentColor"/></marker></defs></svg>${TL.map(kiste).join('')}</div></div>`;
    const r2 = v.querySelector('.ab-roll'); r2.scrollLeft = sx; r2.scrollTop = sy;
    pfeile();
  }
  /* alle Pfeile: eigene (P.ablauf.links) und Verknüpfungen zwischen Leistungen verschiedener Teile aus dem Gantt */
  function pfeilListe() {
    const L = AB().links.map((l, i) => ({ ...l, i, eigen: true }));
    const byU = new Map(P.tasks.map((t) => [t.uid, t]));
    for (const t of P.tasks) for (const p of t.preds || []) {
      if (p.kiste) continue; const q = byU.get(p.uid);
      if (q && q.teil && t.teil && q.teil !== t.teil && !STRUKTUR.has(q.cat) && !STRUKTUR.has(t.cat)) L.push({ von: q.teil, nach: t.teil, vonCat: q.cat || '#' + q.uid, nachCat: t.cat || '#' + t.uid, type: p.type, lag: p.lag, gantt: { s: t.uid, p: q.uid } });
    }
    return L;
  }
  function anker(k, cat, rechts) {
    const v = SICHT(), F = v.querySelector('.ab-flaeche'), fr = F.getBoundingClientRect();
    let el = cat ? v.querySelector(`[data-abziel="${CSS.escape(k + '|' + cat)}"]`) : null;
    if (!el) el = v.querySelector(`[data-abziel="${CSS.escape(k + '|')}"]`);
    if (!el) return null; const r = el.getBoundingClientRect();
    return { x: (rechts ? r.right : r.left) - fr.left, y: r.top + r.height / 2 - fr.top };
  }
  function pfeile() {
    const v = SICHT(), svg = v.querySelector('.ab-svg'); if (!svg) return;
    const kurz = { FS: 'EA', SS: 'AA', FF: 'EE', SF: 'AE' };
    const M = pfeilListe().map((l, j) => {
      const a = anker(l.von, l.vonCat, l.type !== 'SS' && l.type !== 'SF'), b = anker(l.nach, l.nachCat, l.type === 'FF' || l.type === 'SF'); if (!a || !b) return '';
      const dx = Math.max(40, Math.abs(b.x - a.x) / 2), c1 = a.x + (l.type === 'SS' || l.type === 'SF' ? -dx : dx), c2 = b.x + (l.type === 'FF' || l.type === 'SF' ? dx : -dx);
      const d = `M${a.x},${a.y} C${c1},${a.y} ${c2},${b.y} ${b.x},${b.y}`, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const txt = `${kurz[l.type] || 'EA'}${+l.lag ? (l.lag > 0 ? ' +' : ' ') + l.lag + ' AT' : ''}`;
      return `<g class="ab-p${l.gantt ? ' gantt' : ''}" data-abp="${j}"><path d="${d}" class="ab-ps"/><path d="${d}" class="ab-pl" marker-end="url(#abP)"/><text x="${mx}" y="${my - 5}" text-anchor="middle">${esc(txt)}</text></g>`;
    }).join('');
    svg.querySelectorAll('g').forEach((g) => g.remove());
    svg.insertAdjacentHTML('beforeend', M);
  }

  /* ---------- Bedienung ---------- */
  let zug = null;   // { art: 'kiste', k, dx, dy } | { art: 'pfeil', von }
  document.addEventListener('dblclick', (e) => {
    const kk = an() && e.target.closest('.ab-kk'); if (!kk) return;
    const k = kk.closest('[data-abk]').dataset.abk; if (offen.has(k)) offen.delete(k); else offen.add(k); merkeOffen(); zeichne();
  });
  document.addEventListener('pointerdown', (e) => {
    if (!an() || e.button !== 0) return;
    const h = e.target.closest('[data-abvon]');
    if (h) { e.preventDefault(); zug = { art: 'pfeil', von: h.dataset.abvon }; return; }
    const kk = e.target.closest('.ab-kk'); if (!kk) return;
    const box = kk.closest('[data-abk]'), r = box.getBoundingClientRect();
    zug = { art: 'kiste', k: box.dataset.abk, el: box, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY };
  });
  document.addEventListener('pointermove', (e) => {
    if (!zug || !an()) return;
    const F = SICHT().querySelector('.ab-flaeche'), fr = F.getBoundingClientRect();
    if (zug.art === 'kiste') {
      if (Math.abs(e.clientX - zug.x0) + Math.abs(e.clientY - zug.y0) < 4 && !zug.zieht) return; zug.zieht = true;
      zug.el.style.left = Math.max(0, e.clientX - fr.left - zug.dx) + 'px'; zug.el.style.top = Math.max(0, e.clientY - fr.top - zug.dy) + 'px'; pfeile(); return;
    }
    const [k, cat] = zug.von.split('|'), a = anker(k, cat, true); if (!a) return;
    let t = F.querySelector('.ab-zug'); if (!t) { F.querySelector('.ab-svg').insertAdjacentHTML('beforeend', '<path class="ab-zug" marker-end="url(#abP)"/>'); t = F.querySelector('.ab-zug'); }
    t.setAttribute('d', `M${a.x},${a.y} L${e.clientX - fr.left},${e.clientY - fr.top}`);
  });
  document.addEventListener('pointerup', (e) => {
    if (!zug || !an()) { zug = null; return; }
    const z = zug; zug = null;
    if (z.art === 'kiste') { if (!z.zieht) return; const x = parseFloat(z.el.style.left), y = parseFloat(z.el.style.top); act(() => { AB().pos[z.k] = [Math.round(x), Math.round(y)]; }); return; }
    const ziel = document.elementFromPoint(e.clientX, e.clientY), zel = ziel && ziel.closest('[data-abziel]');
    const t = SICHT().querySelector('.ab-zug'); if (t) t.remove();
    if (!zel) return;
    const [von, vonCat] = z.von.split('|'), [nach, nachCat] = zel.dataset.abziel.split('|');
    if (von === nach && (vonCat || '') === (nachCat || '')) return;
    if (von === nach) { toast('Pfeile innerhalb eines Teils zieht man im Gantt (Verknüpfen).'); return; }
    const l = { von, nach, type: 'FS', lag: 0, ...(vonCat ? { vonCat } : {}), ...(nachCat ? { nachCat } : {}) };
    if (AB().links.some((x) => x.von === l.von && x.nach === l.nach && (x.vonCat || '') === (vonCat || '') && (x.nachCat || '') === (nachCat || ''))) return;
    if ((vonCat || '').startsWith('#') || (nachCat || '').startsWith('#')) {   // Leistung ohne Katalog-Kennung: als gewöhnliche Verknüpfung im Gantt
      const q = P.tasks.find((x) => x.teil === von && (vonCat ? '#' + x.uid === vonCat || x.cat === vonCat : x.cat === '_teil')), s = P.tasks.find((x) => x.teil === nach && (nachCat ? '#' + x.uid === nachCat || x.cat === nachCat : x.cat === '_teil'));
      if (q && s) act(() => { s.preds.push({ uid: q.uid, type: 'FS', lag: 0 }); });
      return;
    }
    act(() => { AB().links.push(l); ablaufNachfuehren(); });
  });
  document.addEventListener('click', async (e) => {
    if (!an()) return;
    const gr = e.target.closest('[data-abgr]'); if (gr) { if ((AB().gruppe || 'teil') !== gr.dataset.abgr) gruppieren(gr.dataset.abgr); return; }
    const g = e.target.closest('[data-abp]'); if (!g) return;
    const l = pfeilListe()[+g.dataset.abp]; if (!l) return;
    const name = (k, cat) => { const tl = teileListe().find((x) => x.k === k); const t = cat && P.tasks.find((x) => x.teil === k && (x.cat === cat || '#' + x.uid === cat)); return (tl ? tl.n : k) + (t ? ' · ' + t.name : ''); };
    const html = `<div class="mh">Pfeil zwischen Gebäudeteilen</div><div class="mb"><div class="ab-pop"><p><b>${esc(name(l.von, l.vonCat))}</b> → <b>${esc(name(l.nach, l.nachCat))}</b></p>
      <label>Art <select data-abart>${ART.map(([k, n]) => `<option value="${k}"${k === (l.type || 'FS') ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Abstand <input type="number" data-ablag value="${+l.lag || 0}" style="width:5rem"> AT <small class="mute">(negativ = überlappend)</small></label></div></div>
      <div class="mf"><button type="button" class="btn danger" data-m="loesen">Lösen</button><span class="pd-luft"></span><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn primary" data-m="ok">OK</button></div>`;
    const m = await new Promise((ok) => modalBox(html, (wahl, box, zu) => { ok({ wahl, typ: box.querySelector('[data-abart]').value, lag: Math.round(+box.querySelector('[data-ablag]').value || 0) }); zu(); }));
    if (!m || m.wahl === 'abbrechen') return;
    act(() => {
      if (l.eigen) { const L = AB().links; if (m.wahl === 'loesen') L.splice(l.i, 1); else Object.assign(L[l.i], { type: m.typ, lag: m.lag }); ablaufNachfuehren(); return; }
      const s = P.tasks.find((x) => x.uid === l.gantt.s); if (!s) return;
      if (m.wahl === 'loesen') s.preds = s.preds.filter((p) => p.uid !== l.gantt.p); else s.preds.forEach((p) => { if (p.uid === l.gantt.p && !p.kiste) Object.assign(p, { type: m.typ, lag: m.lag }); });
    });
  });

  /* nach jedem Neuzeichnen des Plans auch die Seite, wenn sie offen ist */
  const r0 = window.render;
  if (typeof r0 === 'function') window.render = function () { const v = SICHT(); if (v && !v.hidden) { zeichne(); return; } return r0.apply(this, arguments); };
  window.ablaufZeichnen = zeichne;
})();
