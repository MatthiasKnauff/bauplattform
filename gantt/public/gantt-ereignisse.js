'use strict';
/* Bauzeitenplan – Bedienung: Tabelle, Diagramm mit der Maus (Ziehen, Verknüpfen, Tooltip), Zeilen verschieben, Tastatur.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: gantt-kern.js, gantt-diagramm.js, gantt-befehle.js, gantt-ereignisse.js, gantt-start.js). */
/* =====================================================================
   Ereignisse – Tabelle
   ===================================================================== */
gridBody.addEventListener('mousedown', (e) => {
  if (e.target.classList.contains('cell-ed')) return;
  const row = e.target.closest('.row'); if (!row) return;
  const r = +row.dataset.r;
  const tg = e.target.closest('[data-tog]');
  if (tg) { const i = +tg.dataset.tog; P.tasks[i].collapsed = !P.tasks[i].collapsed; queueSave(); render(); e.preventDefault(); return; }
  const cell = e.target.closest('.c'); if (cell) cur.c = cell.dataset.c;
  if (e.button === 2 && r < vis.length && sel.has(P.tasks[vis[r]].uid)) { cur.r = r; updateSel(); return; }
  const onNr = cell && cell.dataset.c === 'nr' && r < vis.length && e.button === 0;
  if (!(onNr && sel.has(P.tasks[vis[r]].uid) && !e.shiftKey && !e.ctrlKey && !e.metaKey)) selectRow(r, e);
  if (onNr) { e.preventDefault(); rowDrag = { y0: e.clientY, moved: false, n: selIdx().length }; gridBody.classList.add('rowdragging'); }
  gridBody.focus({ preventScroll: true });
});
gridBody.addEventListener('dblclick', (e) => {
  const row = e.target.closest('.row'), cell = e.target.closest('.c'); if (!row || !cell || e.target.closest('[data-tog]')) return;
  const r = +row.dataset.r, c = cell.dataset.c;
  if ((c === 'nr' || c === 'ind') && r < vis.length) taskDialog(vis[r]); else startEdit(r, c);
});
gridBody.addEventListener('contextmenu', taskCtx);

// Spaltenbreite
gridHead.addEventListener('mousedown', (e) => {
  const rz = e.target.closest('.rz'); if (!rz) return;
  e.preventDefault(); const k = rz.dataset.k, x0 = e.clientX, w0 = colW[k];
  const mv = (ev) => { colW[k] = Math.max(28, w0 + ev.clientX - x0); renderGrid(); };
  const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); LS.set('colW', colW); };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
});

// Trennlinie
$('#split').addEventListener('mousedown', (e) => {
  e.preventDefault(); const x0 = e.clientX, w0 = gridPane.offsetWidth, sp = $('#split'); sp.classList.add('drag');
  const mv = (ev) => { const w = Math.max(120, Math.min(innerWidth - 150, w0 + ev.clientX - x0)); document.documentElement.style.setProperty('--gw', w + 'px'); };
  const up = () => { sp.classList.remove('drag'); removeEventListener('mousemove', mv); removeEventListener('mouseup', up); LS.set('gw', gridPane.offsetWidth); render(); };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
});

// synchrones vertikales Scrollen
gridPane.addEventListener('scroll', () => { if (chartPane.scrollTop !== gridPane.scrollTop) chartPane.scrollTop = gridPane.scrollTop; });
chartPane.addEventListener('scroll', () => { if (gridPane.scrollTop !== chartPane.scrollTop) gridPane.scrollTop = chartPane.scrollTop; });

/* =====================================================================
   Ereignisse – Diagramm (Ziehen, Verknüpfen, Tooltip)
   ===================================================================== */
const svgXY = (e) => { const r = chartBody.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
function showTip(e, html) { tip.innerHTML = html; tip.style.display = 'block'; const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.min(e.clientX + 14, innerWidth - w - 6) + 'px'; tip.style.top = Math.min(e.clientY + 16, innerHeight - h - 6) + 'px'; }
const hideTip = () => { tip.style.display = 'none'; };
function taskTip(i) {
  const t = P.tasks[i], kind = CAL.summ[i] ? 'Leistungsgruppe' : t.dur === 0 ? 'Meilenstein' : 'Leistung';
  return `<b>${esc(t.name || '(ohne Namen)')}</b><table>
    <tr><td>${kind}</td><td>Nr. ${i + 1}</td></tr>
    <tr><td>Anfang:</td><td>${fmtD(CAL.sd[i])}</td></tr><tr><td>Ende:</td><td>${fmtD(CAL.fd[i])}</td></tr>
    ${CAL.summ[i] ? `<tr><td>Summe Arbeit:</td><td>${fmtDur(sumWork(i))} <small style="color:var(--mut)">(Summe der Leistungen)</small></td></tr><tr><td>Zeitspanne:</td><td>${fmtDur(CAL.dur[i])} <small style="color:var(--mut)">(erste bis letzte Leistung)</small></td></tr>` : `<tr><td>Dauer:</td><td>${fmtDur(CAL.dur[i])}</td></tr>`}<tr><td>Abgeschlossen:</td><td>${Math.round(CAL.pct[i])}%</td></tr>
    ${t.gw ? `<tr><td>Gewerk:</td><td><span class="gwdot" style="background:${gwColor(t.gw)}"></span>${esc(t.gw)}</td></tr>` : ''}
    ${t.res ? `<tr><td>Unternehmer:</td><td>${esc(t.res)}</td></tr>` : ''}${relRows(i)}</table>`;
}
function relRows(i) {
  const t = P.tasks[i], nm = (k) => { const n = P.tasks[k].name || ''; return `<span style="white-space:nowrap">${esc(n.length > 40 ? n.slice(0, 38) + '…' : n)}</span>`; };
  const pre = (t.preds || []).map((p) => idxOfUid(p.uid)).filter((k) => k >= 0);
  const suc = []; P.tasks.forEach((x, k) => { if ((x.preds || []).some((p) => p.uid === t.uid)) suc.push(k); });
  const list = (a) => a.slice(0, 4).map(nm).join('<br>') + (a.length > 4 ? `<br>… und ${a.length - 4} weitere` : '');
  return (pre.length ? `<tr><td><span class="tip-pre">◀ Vorgänger:</span></td><td>${list(pre)}</td></tr>` : '') + (suc.length ? `<tr><td><span class="tip-suc">Nachfolger ▶</span></td><td>${list(suc)}</td></tr>` : '');
}

/* ---------- Hilfen für die Mausbedienung ---------- */
const dayAtX = (x) => view.start + Math.floor(x / ZOOMS[zoom].ppd);
let splitMode = false;
function setSplitMode(v) {
  splitMode = v; chartBody.classList.toggle('splitting', v);
  const b = document.querySelector('.rb[data-act="splitMode"]'); if (b) b.classList.toggle('on', v);
  if (v) toast('Unterbrechen: auf die Stelle im Balken klicken, an der die Pause beginnen soll (Esc bricht ab).');
  else { hideTip(); const m = document.getElementById('splitMark'); if (m) m.remove(); }
}
function segAtDay(i, day) {   // Abschnitt, der den Tag enthält (oder -1)
  const S = CAL.segS[i], E = CAL.segE[i], w = toW(day);
  if (!S) return -1;
  for (let k = 0; k < S.length; k++) if (w >= S[k] && w < E[k] && !isWE(day)) return k;
  return -1;
}
function doSplit(i, day, gap = 5) {
  const t = P.tasks[i];
  if (CAL.summ[i] || !(t.dur > 1)) { toast('Nur Leistungen mit mindestens 2 Tagen Dauer lassen sich unterbrechen.', true); return false; }
  const k = segAtDay(i, day), S = CAL.segS[i];
  const w = toW(day);
  if (k < 0 || w <= S[k]) { toast('Bitte auf einen Tag innerhalb des Balkens klicken – nicht auf den ersten Tag eines Abschnitts.', true); return false; }
  const segs = segList(t) ? t.segs.map((x) => ({ ...x })) : [{ d: t.dur, gap: 0 }];
  const d1 = w - S[k], d2 = segs[k].d - d1;
  segs.splice(k, 1, { d: d1, gap: segs[k].gap }, { d: d2, gap: Math.max(1, gap) });
  // Verknüpfungen an späteren Abschnitten verschieben sich um eins
  const ok = act(() => {
    t.segs = segs;
    for (const p of t.preds) if (p.ss != null && p.ss > k) p.ss++;
    for (const o of P.tasks) for (const p of o.preds) if (p.uid === t.uid && p.ps != null && p.ps > k) p.ps++;
  });
  if (ok) toast(`Unterbrochen: Abschnitt ${k + 1} endet ${fmtD(fromW(w - 1))}, ${gap} Arbeitstage Pause. Den hinteren Teil kannst du mit der Maus verschieben.`);
  return ok;
}
function unsplit(i) { const t = P.tasks[i]; if (!segList(t)) return; act(() => { t.segs = null; for (const p of t.preds) delete p.ss; for (const o of P.tasks) for (const p of o.preds) if (p.uid === t.uid) delete p.ps; }); }
function splitDialog(i, day) {
  modal('Leistung unterbrechen', `<div class="form"><label>Unterbrechen ab</label><div class="ro full">${fmtD(day)}</div>
      <label>Pause</label><input id="spGap" class="full" value="5 Tage"></div><div class="hint">Die Leistung wird an diesem Tag geteilt; der hintere Abschnitt beginnt nach der Pause. Beide Abschnitte lassen sich einzeln verschieben und verknüpfen.</div>`,
  [{ label: 'Unterbrechen', cls: 'primary', primary: true, fn: (bg) => { const g = parseDur(bg.querySelector('#spGap').value); if (g == null || g < 1) { toast('Bitte eine Pause von mindestens 1 Tag angeben.', true); return false; } doSplit(i, day, g); } }, { label: 'Abbrechen' }]);
}
function setHover(r) {
  const hb = document.getElementById('hovband'); if (hb) hb.setAttribute('y', r == null || r >= vis.length ? -100 : r * RH);
  gridBody.querySelectorAll('.row.hov').forEach((x) => x.classList.remove('hov'));
  if (r != null && r < vis.length) { const row = gridBody.querySelector(`.row[data-r="${r}"]`); if (row) row.classList.add('hov'); }
}
function addLinkSeg(pi, si, ps, ss) {
  if (pi === si) return false;
  if (isAncestor(pi, si) || isAncestor(si, pi)) { toast('Leistungsgruppen können nicht mit ihren eigenen Teilleistungen verknüpft werden.', true); return false; }
  const s = P.tasks[si], puid = P.tasks[pi].uid;
  const ex = s.preds.find((p) => p.uid === puid);
  if (ex && (ex.ps ?? null) === (ps ?? null) && (ex.ss ?? null) === (ss ?? null)) { toast('Diese Leistungen sind bereits so verknüpft.'); return false; }
  return act(() => {
    const l = { uid: puid, type: 'FS', lag: 0 }; if (ps != null) l.ps = ps; if (ss != null) l.ss = ss;
    if (ex) Object.assign(ex, l); else s.preds.push(l);
  });
}
const segName = (i, k) => (k == null || !segList(P.tasks[i]) ? '' : ` (Abschnitt ${k + 1})`);

/* ---------- Diagramm: Maus ---------- */
chartBody.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  hideTip();
  const { x, y } = svgXY(e);
  const r = Math.floor(y / RH);
  if (e.target.closest('.lk')) return;
  const b = e.target.closest('.bar');
  if (splitMode) {
    e.preventDefault();
    if (b && !CAL.summ[+b.dataset.i]) { const i = +b.dataset.i; if (doSplit(i, dayAtX(x))) setSplitMode(false); }
    else setSplitMode(false);
    return;
  }
  if (!b) {
    e.preventDefault();
    drag = { mode: r >= vis.length ? 'draw' : 'pan', r, x0: e.clientX, y0: e.clientY, sx: x, sy: y, sl: chartPane.scrollLeft, st: chartPane.scrollTop, moved: false, ev: e };
    return;
  }
  const i = +b.dataset.i, ri = rowOfIdx(i);
  if (e.ctrlKey || e.shiftKey || !sel.has(P.tasks[i].uid)) selectRow(ri, e);
  cur.r = ri;
  const cl = e.target.classList, segEl = e.target.closest('[data-seg]'), k = segEl ? +segEl.dataset.seg : null;
  let mode;
  if (cl.contains('lkdot')) mode = 'link';
  else if (CAL.summ[i]) mode = 'link';
  else if (cl.contains('rh')) mode = 'resize';
  else if (cl.contains('lh')) mode = 'lresize';
  else if (cl.contains('ph')) mode = 'pct';
  else if (k > 0) mode = 'seg';
  else mode = 'move';
  const nSeg = geo[i].segs.length;
  drag = { i, mode, k, x0: e.clientX, y0: e.clientY, sx: x, sy: y, moved: false, el: b, fromDot: cl.contains('lkdot'),
    ps: k != null && nSeg > 1 && k < nSeg - 1 ? k : null };
  e.preventDefault();
});

addEventListener('mousemove', (e) => {
  if (!drag) {
    if (!e.target.closest) return;
    const inChart = e.target.closest('#chartBody');
    if (inChart) {
      const { x, y } = svgXY(e), r = Math.floor(y / RH);
      setHover(r);
      const b = e.target.closest('#chartBody .bar'), lk = !b && e.target.closest('#chartBody .lk');
      if (splitMode) {
        const svg = document.getElementById('chartSvg'); let m = document.getElementById('splitMark');
        if (!m) { m = document.createElementNS('http://www.w3.org/2000/svg', 'line'); m.id = 'splitMark'; m.setAttribute('class', 'splitmark'); svg.appendChild(m); }
        const d = dayAtX(x), xx = X(d);
        m.setAttribute('x1', xx); m.setAttribute('x2', xx); m.setAttribute('y1', r * RH); m.setAttribute('y2', r * RH + RH);
        showTip(e, b ? `<b>Unterbrechen ab ${fmtD(d)}</b>Klicken, um hier eine Pause einzufügen` : '<b>Unterbrechen</b>Auf einen Balken klicken');
        return;
      }
      chartBody.style.cursor = b || lk ? '' : r >= vis.length ? 'crosshair' : 'grab';
      if (linkMode === 'sel') { const hi = b ? +b.dataset.i : null; if (hi !== hoverLinkI) { hoverLinkI = hi; markLinks(); } }
      if (b) {
        const i = +b.dataset.i, cl = e.target.classList;
        if (cl.contains('lkdot')) showTip(e, '<b>Verknüpfen</b>Ziehen auf die nachfolgende Leistung');
        else if (cl.contains('ph')) showTip(e, `<b>Fortschritt</b>${Math.round(CAL.pct[i])}% – ziehen zum Ändern`);
        else if (cl.contains('lh')) showTip(e, '<b>Anfang verschieben</b>Ziehen ändert Anfang und Dauer, das Ende bleibt');
        else showTip(e, taskTip(i));
      } else if (lk) {
        const si = +lk.dataset.s, p = P.tasks[si].preds[+lk.dataset.k], pi = CAL.idx.get(p.uid);
        showTip(e, `<b>Anordnungsbeziehung</b><table><tr><td>Von:</td><td>${pi + 1} – ${esc(P.tasks[pi].name)}${segName(pi, p.ps)}</td></tr><tr><td>Nach:</td><td>${si + 1} – ${esc(P.tasks[si].name)}${segName(si, p.ss)}</td></tr><tr><td>Art:</td><td>${TNAME[p.type]}</td></tr><tr><td>Zeitabstand:</td><td>${p.lag ? fmtLag(p.lag) : '0 Tage'}</td></tr></table><div style="color:var(--mut);margin-top:3px">Doppelklick oder Rechtsklick zum Bearbeiten</div>`);
      } else if (r >= vis.length) showTip(e, '<b>Neue Leistung</b>Waagerecht ziehen, um einen Balken aufzuziehen');
      else hideTip();
    } else if (!e.target.closest('#tip')) { hideTip(); }
    return;
  }
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0, ppd = ZOOMS[zoom].ppd;
  if (!drag.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
  drag.moved = true;
  const svg = document.getElementById('chartSvg');
  if (drag.mode === 'pan') {
    chartPane.scrollLeft = drag.sl - dx; chartPane.scrollTop = drag.st - dy; chartBody.style.cursor = 'grabbing'; hideTip(); return;
  }
  if (drag.mode === 'draw') {
    const p = svgXY(e), a = dayAtX(Math.min(drag.sx, p.x)), z = dayAtX(Math.max(drag.sx, p.x));
    const s0 = snapWork(a), nd = Math.max(1, toW(z + 1) - toW(s0));
    let pv = document.getElementById('drawPrev');
    if (!pv) { pv = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); pv.id = 'drawPrev'; pv.setAttribute('class', 'drawprev'); svg.appendChild(pv); }
    const x1 = X(s0), x2 = X(fromW(toW(s0) + nd - 1) + 1);
    pv.setAttribute('x', x1); pv.setAttribute('y', drag.r * RH + 6); pv.setAttribute('width', Math.max(2, x2 - x1)); pv.setAttribute('height', 12);
    drag.val = { start: s0, dur: nd };
    showTip(e, `<b>Neue Leistung</b><table><tr><td>Anfang:</td><td>${fmtD(s0)}</td></tr><tr><td>Ende:</td><td>${fmtD(fromW(toW(s0) + nd - 1))}</td></tr><tr><td>Dauer:</td><td>${fmtDur(nd)}</td></tr></table>`);
    return;
  }
  const i = drag.i, t = P.tasks[i], g = geo[i];
  if (drag.mode === 'move' && !drag.fromDot && Math.abs(dy) > RH * 0.8 && !segList(t)) { drag.mode = 'link'; drag.el.removeAttribute('transform'); }
  if (drag.mode === 'move' && !drag.fromDot && Math.abs(dy) > RH * 0.8 && segList(t)) { drag.mode = 'link'; drag.el.removeAttribute('transform'); }
  if (drag.mode === 'move') {
    const dd = Math.round(dx / ppd);
    drag.el.setAttribute('transform', `translate(${dd * ppd},0)`); drag.el.classList.add('dragging');
    const ns = snapWork(CAL.sd[i] + dd + (CAL.msEnd[i] ? 1 : 0));
    const span = CAL.ef[i] - CAL.es[i];
    const nf = t.dur > 0 ? fromW(toW(ns) + span - 1) : ns;
    drag.val = ns;
    showTip(e, `<b>${esc(t.name)}</b><table><tr><td>Anfang:</td><td>${fmtD(ns)}</td></tr><tr><td>Ende:</td><td>${fmtD(nf)}</td></tr></table>`);
  } else if (drag.mode === 'seg') {
    const k = drag.k, S = CAL.segS[i], E = CAL.segE[i];
    const dd = Math.round(dx / ppd);
    const ns = snapWork(fromW(S[k]) + dd);
    const gap = Math.max(0, toW(ns) - E[k - 1]);
    const sh = (E[k - 1] + gap - S[k]);   // Verschiebung in Arbeitstagen
    const px = X(fromW(S[k] + sh)) - X(fromW(S[k]));
    drag.el.querySelectorAll('.sg').forEach((el) => { if (+el.dataset.seg >= k) el.setAttribute('transform', `translate(${px},0)`); });
    drag.el.classList.add('dragging');
    drag.val = gap;
    showTip(e, `<b>${esc(t.name)} – Abschnitt ${k + 1}</b><table><tr><td>Anfang:</td><td>${fmtD(fromW(E[k - 1] + gap))}</td></tr><tr><td>Pause:</td><td>${gap ? fmtDur(gap) : '<b>keine – Abschnitte werden zusammengeführt</b>'}</td></tr></table>`);
  } else if (drag.mode === 'resize') {
    const last = g.segs.length - 1, sg = g.segs[last];
    const rect = drag.el.querySelector(`rect.b[data-seg="${last}"]`);
    rect.setAttribute('width', Math.max(ppd, sg.x2 - sg.x1 + dx));
    const end = fromW(CAL.segE[i][last] - 1) + Math.round(dx / ppd);
    const nd = Math.max(1, toW(end + 1) - CAL.segS[i][last]);
    drag.val = nd;
    const tot = t.dur - sg.d + nd;
    showTip(e, `<b>${esc(t.name)}</b><table><tr><td>Ende:</td><td>${fmtD(fromW(CAL.segS[i][last] + nd - 1))}</td></tr><tr><td>Dauer:</td><td>${fmtDur(tot)}</td></tr></table>`);
  } else if (drag.mode === 'lresize') {
    const sg = g.segs[0], rect = drag.el.querySelector('rect.b[data-seg="0"]');
    const ns = snapWork(CAL.sd[i] + Math.round(dx / ppd));
    const d0 = CAL.segE[i][0] - toW(ns);
    if (d0 >= 1) {
      const nx = X(ns); rect.setAttribute('x', nx); rect.setAttribute('width', Math.max(2, sg.x2 - nx));
      drag.val = { ns, d0 };
      showTip(e, `<b>${esc(t.name)}</b><table><tr><td>Anfang:</td><td>${fmtD(ns)}</td></tr><tr><td>Dauer:</td><td>${fmtDur(t.dur - sg.d + d0)}</td></tr></table>`);
    }
  } else if (drag.mode === 'pct') {
    const p = svgXY(e); let done = 0;
    for (const sg of g.segs) { if (p.x >= sg.x2) done += sg.d; else if (p.x > sg.x1) done += (p.x - sg.x1) / (sg.x2 - sg.x1) * sg.d; }
    const v = Math.max(0, Math.min(100, Math.round(done / t.dur * 20) * 5));
    drag.val = v;
    const ph = drag.el.querySelector('.ph'); if (ph) ph.setAttribute('transform', `translate(${p.x - drag.sx},0)`);
    showTip(e, `<b>Fortschritt</b>${v}% abgeschlossen`);
  } else if (drag.mode === 'link') {
    let ln = svg.querySelector('.dragline');
    if (!ln) { ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); ln.setAttribute('class', 'dragline'); svg.appendChild(ln); }
    const from = segAnchor(g, drag.ps), p = svgXY(e);
    ln.setAttribute('x1', drag.fromDot ? g.x2 + 7 : from.x2); ln.setAttribute('y1', g.y + RH / 2); ln.setAttribute('x2', p.x); ln.setAttribute('y2', p.y);
    svg.querySelectorAll('.bar.target').forEach((x) => x.classList.remove('target'));
    const tr = Math.floor(p.y / RH), ti = vis[tr];
    drag.target = null; drag.ss = null;
    if (ti != null && ti !== i && !isAncestor(ti, i) && !isAncestor(i, ti)) {
      drag.target = ti; const tb = svg.querySelector(`.bar[data-i="${ti}"]`); if (tb) tb.classList.add('target');
      const tg = geo[ti];
      if (tg.segs.length > 1) { let best = 0, bd = Infinity; tg.segs.forEach((sg, kk) => { const dd2 = p.x < sg.x1 ? sg.x1 - p.x : p.x > sg.x2 ? p.x - sg.x2 : 0; if (dd2 < bd) { bd = dd2; best = kk; } }); drag.ss = best > 0 ? best : null; }
      showTip(e, `<b>Leistungen verknüpfen</b><table><tr><td>Von:</td><td>${i + 1} – ${esc(t.name)}${segName(i, drag.ps)}</td></tr><tr><td>Nach:</td><td>${ti + 1} – ${esc(P.tasks[ti].name)}${segName(ti, drag.ss ?? (tg.segs.length > 1 ? 0 : null))}</td></tr></table>`);
    } else showTip(e, '<b>Leistungen verknüpfen</b>Auf eine andere Leistung ziehen');
  }
});

addEventListener('blur', () => { if (drag && drag.mode !== 'draw') { drag = null; hideTip(); document.querySelectorAll('.dragline').forEach((x) => x.remove()); chartBody.style.cursor = ''; if (P) render(); } });
addEventListener('mouseup', () => {
  if (!drag) return;
  const d = drag; drag = null; hideTip(); chartBody.style.cursor = '';
  document.querySelectorAll('.dragline').forEach((x) => x.remove());   // Verknüpfungs-Vorschau immer entfernen
  if (d.mode === 'pan') { if (!d.moved) selectRow(d.r, d.ev); return; }
  if (d.mode === 'draw') {
    const pv = document.getElementById('drawPrev'); if (pv) pv.remove();
    if (!d.moved || !d.val) { selectRow(d.r, d.ev); return; }
    let uid;
    const ok = act(() => {
      const last = vis.length ? P.tasks[vis[vis.length - 1]] : null;
      const t = newTask('Neue Leistung', d.val.dur); t.cons = d.val.start; t.lvl = last ? last.lvl : 0;
      P.tasks.push(t); uid = t.uid; sel = new Set([uid]);
    });
    if (ok) { cur.r = rowOfIdx(idxOfUid(uid)); cur.c = 'name'; anchorR = cur.r; updateSel(); startEdit(cur.r, 'name'); }
    return;
  }
  if (!d.moved) return;
  const t = P.tasks[d.i];
  if (d.mode === 'move' && d.val != null) act(() => { t.cons = d.val; });
  else if (d.mode === 'seg' && d.val != null) act(() => { t.segs[d.k].gap = d.val; });
  else if (d.mode === 'resize' && d.val != null) act(() => { if (segList(t)) { const L = t.segs.length - 1; t.dur += d.val - t.segs[L].d; t.segs[L].d = d.val; } else t.dur = d.val; });
  else if (d.mode === 'lresize' && d.val) act(() => { t.cons = d.val.ns; if (segList(t)) { t.dur += d.val.d0 - t.segs[0].d; t.segs[0].d = d.val.d0; } else t.dur = d.val.d0; });
  else if (d.mode === 'pct' && d.val != null) act(() => { t.pct = d.val; });
  else if (d.mode === 'link' && d.target != null) addLinkSeg(d.i, d.target, d.ps, d.ss);
  else render();
});

chartBody.addEventListener('dblclick', (e) => {
  const lk = e.target.closest('.lk');
  if (lk) { linkDialog(+lk.dataset.s, +lk.dataset.k); return; }
  const b = e.target.closest('.bar'); if (b) { taskDialog(+b.dataset.i); return; }
  const { x, y } = svgXY(e), r = Math.floor(y / RH);
  if (r < vis.length) { taskDialog(vis[r]); return; }
  // Doppelklick in eine leere Zeile: neue Leistung an diesem Tag
  let uid;
  const ok = act(() => { const last = vis.length ? P.tasks[vis[vis.length - 1]] : null; const t = newTask('Neue Leistung', 1); t.cons = snapWork(dayAtX(x)); t.lvl = last ? last.lvl : 0; P.tasks.push(t); uid = t.uid; sel = new Set([uid]); });
  if (ok) { cur.r = rowOfIdx(idxOfUid(uid)); cur.c = 'name'; anchorR = cur.r; updateSel(); startEdit(cur.r, 'name'); }
});
chartBody.addEventListener('contextmenu', (e) => {
  e.preventDefault(); hideTip();
  const lk = e.target.closest('.lk');
  if (lk) {
    const si = +lk.dataset.s, k = +lk.dataset.k, s2 = P.tasks[si], p = s2.preds[k];
    ctxMenu(e.clientX, e.clientY, [
      { label: 'Verknüpfung bearbeiten …', fn: () => linkDialog(si, k) },
      '-',
      ...['FS', 'SS', 'FF', 'SF'].map((ty) => ({ label: (p.type === ty ? '✓ ' : ' ') + TNAME[ty], fn: () => act(() => { p.type = ty; }) })),
      '-',
      { label: 'Verknüpfung löschen', fn: () => act(() => { s2.preds.splice(k, 1); }) },
    ]);
    return;
  }
  const b = e.target.closest('.bar'); const { x, y } = svgXY(e);
  const r = b ? rowOfIdx(+b.dataset.i) : Math.floor(y / RH);
  if (r < vis.length && !sel.has(P.tasks[vis[r]].uid)) selectRow(r, null); else cur.r = r;
  if (!b || CAL.summ[+b.dataset.i]) { taskCtx(e); return; }
  const i = +b.dataset.i, t = P.tasks[i], day = dayAtX(x);
  ctxMenu(e.clientX, e.clientY, [
    { label: `Hier unterbrechen (ab ${fmtShort(day)}) …`, dis: !(t.dur > 1), fn: () => splitDialog(i, day) },
    { label: 'Unterbrechungen entfernen', dis: !segList(t), fn: () => unsplit(i) },
    '-',
    { label: 'Fortschritt 0 %', fn: () => act(() => { t.pct = 0; }) },
    { label: 'Fortschritt 50 %', fn: () => act(() => { t.pct = 50; }) },
    { label: 'Fortschritt 100 %', fn: () => act(() => { t.pct = 100; }) },
    ...(window.BP && BP.kannRuege && BP.kannRuege() ? [{ label: 'Terminrüge …', dis: (t.pct || 0) >= 100, fn: () => BP.terminruege(t.uid) }] : []),
    '-',
    { label: 'Leistung einfügen', key: 'Einfg', fn: () => insertTask() },
    { label: 'Leistung löschen', key: 'Entf', fn: deleteSel },
    { label: 'Verknüpfungen dieser Leistung lösen', fn: unlinkSel },
    '-',
    { label: selIdx().length > 1 ? `Gemeinsam bearbeiten … (${selIdx().length})` : 'Informationen …', key: '⇧+F2', fn: infoForSelection },
  ]);
});
chartBody.addEventListener('mouseleave', () => { if (!drag) { setHover(null); hideTip(); if (hoverLinkI != null) { hoverLinkI = null; markLinks(); } } });
gridBody.addEventListener('mousemove', (e) => { if (drag || rowDrag) return; const row = e.target.closest('.row'); setHover(row ? +row.dataset.r : null); });
gridBody.addEventListener('mouseleave', () => setHover(null));

// Zeitskala: ziehen = waagerecht verschieben, Mausrad = waagerecht blättern
chartHead.addEventListener('mousedown', (e) => {
  e.preventDefault(); const x0 = e.clientX, sl = chartPane.scrollLeft; chartHead.style.cursor = 'grabbing';
  const mv = (ev) => { chartPane.scrollLeft = sl - (ev.clientX - x0); };
  const up = () => { chartHead.style.cursor = ''; removeEventListener('mousemove', mv); removeEventListener('mouseup', up); };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
});
chartHead.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); chartPane.scrollLeft += e.deltaY + e.deltaX; }, { passive: false });

/* ---------- Tabelle: Zeilen per Maus verschieben (an der Nummernspalte ziehen) ---------- */
let rowDrag = null;
function moveRowsTo(ix, rt) {
  const T = P.tasks;
  const tops = ix.filter((i) => !ix.some((j) => j !== i && isAncestor(j, i)));
  const moving = new Set(); tops.forEach((i) => { for (let k = i; k <= blockEnd(i); k++) moving.add(k); });
  const targetIdx = rt < vis.length ? vis[rt] : T.length;
  if (moving.has(targetIdx)) return false;
  const uids = tops.map((i) => T[i].uid);
  const ok = act(() => {
    const block = T.filter((t, k) => moving.has(k));
    const tgt = targetIdx < T.length ? T[targetIdx] : null;
    const rest = T.filter((t, k) => !moving.has(k));
    const at = tgt ? rest.indexOf(tgt) : rest.length;
    const base = tgt ? tgt.lvl : rest.length ? rest[rest.length - 1].lvl : 0;
    const delta = base - Math.min(...block.map((t) => t.lvl));
    block.forEach((t) => { t.lvl = Math.max(0, t.lvl + delta); });
    rest.splice(at, 0, ...block); P.tasks = rest;
    sel = new Set(uids);
  });
  if (ok) { const r0 = rowOfIdx(idxOfUid(uids[0])); if (r0 >= 0) { cur.r = r0; anchorR = r0; } updateSel(); if (uids.length === 1) afterMove(uids[0]); }
  return ok;
}
addEventListener('mousemove', (e) => {
  if (!rowDrag) return;
  if (!rowDrag.moved && Math.abs(e.clientY - rowDrag.y0) < 4) return;
  rowDrag.moved = true;
  const rb = gridBody.getBoundingClientRect();
  const rt = Math.max(0, Math.min(vis.length, Math.round((e.clientY - rb.top) / RH)));
  rowDrag.rt = rt;
  let ln = document.getElementById('rowDropLine');
  if (!ln) { ln = document.createElement('div'); ln.id = 'rowDropLine'; gridBody.appendChild(ln); }
  ln.style.top = (rt * RH - 1) + 'px';
  showTip(e, `<b>Verschieben</b>${rowDrag.n} ${rowDrag.n === 1 ? 'Leistung' : 'Leistungen'} ${rt < vis.length ? 'vor Zeile ' + (vis[rt] + 1) : 'ans Ende'}`);
  // am Rand automatisch blättern
  const pr = gridPane.getBoundingClientRect();
  if (e.clientY > pr.bottom - 30) gridPane.scrollTop += 12; else if (e.clientY < pr.top + HH + 20) gridPane.scrollTop -= 12;
});
addEventListener('mouseup', () => {
  if (!rowDrag) return;
  const d = rowDrag; rowDrag = null; hideTip();
  const ln = document.getElementById('rowDropLine'); if (ln) ln.remove();
  gridBody.classList.remove('rowdragging');
  if (d.moved && d.rt != null) moveRowsTo(selIdx(), d.rt);
});

chartPane.addEventListener('wheel', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  const day = view.start + (chartPane.scrollLeft + (e.clientX - chartPane.getBoundingClientRect().left)) / ZOOMS[zoom].ppd;
  const nz = zoom + (e.deltaY < 0 ? 1 : -1); if (nz < 0 || nz >= ZOOMS.length) return;
  zoom = nz; LS.set('zoom', nz); render();
  chartPane.scrollLeft = X(day) - (e.clientX - chartPane.getBoundingClientRect().left);
}, { passive: false });

/* =====================================================================
   Tastatur
   ===================================================================== */
document.addEventListener('keydown', (e) => {
  if (document.querySelector('.modal-bg') || editing) return;
  if (e.target.matches('input,textarea,select')) return;
  if (!$('#firmView').hidden && !(e.ctrlKey || e.metaKey)) return;
  if (e.target.closest && e.target.closest('#assistPane')) return;
  const k = e.key, ctrl = e.ctrlKey || e.metaKey, lk = k.toLowerCase();
  if (!P) { if (ctrl && lk === 'o') { e.preventDefault(); fileOpen(); } return; }
  if (k === 'Escape' && splitMode) { setSplitMode(false); return; }
  if (k === 'Escape' && relink) { closeRelink(); return; }
  if (ctrl && lk === 'p') { e.preventDefault(); printDialog(); return; }
  if (ctrl && lk === 's') { e.preventDefault(); if (e.shiftKey) fileSaveAs(); else fileSave(); return; }
  if (ctrl && lk === 'o') { e.preventDefault(); fileOpen(); return; }
  if (ctrl && lk === 'z') { e.preventDefault(); doUndo(); return; }
  if (ctrl && (lk === 'y' || (e.shiftKey && lk === 'z'))) { e.preventDefault(); doRedo(); return; }
  if (ctrl && k === 'F2') { e.preventDefault(); e.shiftKey ? unlinkSel() : linkSel(); return; }
  if (e.shiftKey && k === 'F2') { e.preventDefault(); infoForSelection(); return; }
  if (e.altKey && e.shiftKey && k === 'ArrowRight') { e.preventDefault(); indent(1); return; }
  if (e.altKey && e.shiftKey && k === 'ArrowLeft') { e.preventDefault(); indent(-1); return; }
  if (e.altKey && e.shiftKey && k === 'ArrowUp') { e.preventDefault(); moveSel(-1); return; }
  if (e.altKey && e.shiftKey && k === 'ArrowDown') { e.preventDefault(); moveSel(1); return; }
  if (ctrl && lk === 'a') { e.preventDefault(); sel = new Set(vis.map((i) => P.tasks[i].uid)); updateSel(); return; }
  if (k === 'Insert') { e.preventDefault(); insertTask(); return; }
  if (k === 'Delete') { e.preventDefault(); deleteSel(); return; }
  if (k === 'F2') { e.preventDefault(); startEdit(cur.r, cur.c); return; }
  const mv = (dr, dc) => {
    e.preventDefault();
    if (dr) {
      const nr = Math.max(0, Math.min(nRows() - 1, cur.r + dr));
      if (e.shiftKey) { cur.r = nr; sel.clear(); const a = Math.min(anchorR, nr), b = Math.max(anchorR, nr); for (let x = a; x <= b && x < vis.length; x++) sel.add(P.tasks[vis[x]].uid); updateSel(); }
      else selectRow(nr, null);
    }
    if (dc) { const ix = Math.max(0, Math.min(COLK.length - 1, COLK.indexOf(cur.c) + dc)); cur.c = VCOLS()[ix].k; updateSel(); }
    ensureVisible(cur.r);
  };
  if (k === 'ArrowDown' || k === 'Enter') return mv(e.shiftKey && k === 'Enter' ? -1 : 1, 0);
  if (k === 'ArrowUp') return mv(-1, 0);
  if (k === 'ArrowLeft') return mv(0, -1);
  if (k === 'ArrowRight' || k === 'Tab') return mv(0, e.shiftKey && k === 'Tab' ? -2 : 1);
  if (k === 'PageDown') return mv(Math.floor(gridPane.clientHeight / RH) - 2, 0);
  if (k === 'PageUp') return mv(-(Math.floor(gridPane.clientHeight / RH) - 2), 0);
  if (k.length === 1 && !ctrl && !e.altKey && EDITABLE.has(cur.c)) { e.preventDefault(); startEdit(cur.r, cur.c, k); }
});
