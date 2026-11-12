'use strict';
/* Bauzeitenplan – Zeichnen: Einstellungen, Zeitskala, Diagramm, Balken und Beschriftung, Pfeile, Auswahl und Bearbeiten in der Tabelle, Vorschlagsliste.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: gantt-kern.js, gantt-diagramm.js, gantt-befehle.js, gantt-ereignisse.js, gantt-start.js). */
/* =====================================================================
   Rendering
   ===================================================================== */
function computeVis() {
  vis = []; const T = P.tasks; let hide = Infinity;
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.lvl > hide) continue;
    hide = Infinity; vis.push(i);
    if (CAL.summ[i] && t.collapsed) hide = t.lvl;
  }
}
const nRows = () => vis.length + Math.max(25, Math.ceil((gridPane.clientHeight || 600) / RH));

function render() {
  if (!P) return;
  computeVis();
  if (cur.r >= nRows()) cur.r = nRows() - 1;
  renderGrid(); renderChart(); renderStatus(); updateRibbon(); updateProjSub();
  if (window.AssistCore) AssistCore.notifySoon();
  if (typeof renderFirms === 'function' && !$('#firmView').hidden && !window.fvSkip) renderFirms();
  if (typeof renderLib === 'function' && !$('#libView').hidden) renderLib();
}

function updateProjSub() {
  const el = $('#projSub'); if (!el || !P) return;
  const n = P.tasks.length;
  el.textContent = n && CAL ? `${fmtD(P.start)} – ${fmtD(CAL.peDay)} · ${n} Leistungen` : 'Noch keine Leistungen';
}

/* ---------- Einstellungen: zentral in der Verwaltung (KI, Farben …); „Beim Löschen fragen“ im Reiter Leistung ---------- */
function settingsDialog() {
  if (window.BPHead && BPHead.einstellungen) { BPHead.einstellungen(); return; }   // ⚙ – gleiches Einstellungsfenster wie in allen Apps
  const conf = window.BP && BP.conf, me = window.BP && BP.me;
  const portal = conf && (conf.apps || []).find((a) => a.key === 'portal');
  modal('Einstellungen', `<div style="max-width:440px;line-height:1.5">Die Einstellungen der Bauplattform (KI, Kennwerte …) nimmt die Verwaltung vor${me ? '' : ''}.<br><br>
    Deine Farben stellst du auf der Startseite unter <b>Darstellung</b> ein${portal && window.BPHead ? ` – <a href="${esc(BPHead.appUrl(portal))}/#darstellung">zur Startseite</a>` : ''}.<br>
    Ob beim Löschen von Leistungen nachgefragt wird, schaltest du im Reiter <b>Leistung</b> um.</div>`, [{ label: 'OK', cls: 'primary', primary: true }]);
}
function renderAfterTheme() { if (P) render(); }

function cellHTML(k, i, t) {
  const c = CAL;
  switch (k) {
    case 'nr': return i + 1;
    case 'ind': {
      let s = '';
      if (!c.summ[i] && (t.pct || 0) >= 100) s += '<span class="ico-d" title="Diese Leistung ist abgeschlossen.">✓</span>';
      if (t.cons != null) s += `<span class="ico-c" title="Einschränkung: Anfang nicht früher als ${fmtD(t.cons)}">▦</span>`;
      if (segList(t)) s += `<span class="ico-s" title="Unterbrochen: ${t.segs.map((x, k) => (k ? `Pause ${x.gap} T, ` : '') + `${x.d} T`).join(', ')}">⋯</span>`;
      if (t.notes) s += `<span class="ico-n" title="${esc(t.notes)}">✎</span>`;
      return s;
    }
    case 'name': {
      const tog = c.summ[i] ? `<span class="tog" data-tog="${i}">${t.collapsed ? '▶' : '◢'}</span>` : '<span class="tog"></span>';
      return `<span class="ind" style="width:${t.lvl * 16}px"></span>${tog}<span class="nm">${esc(t.name)}</span>`;
    }
    case 'dur': return durText(i);
    case 'start': return fmtD(c.sd[i]);
    case 'finish': return fmtD(c.fd[i]);
    case 'pred': return esc(predText(t));
    case 'res': return esc(t.res || '');
    case 'gw': return (t.gw || t.color) ? `<span class="gwdot${t.color ? ' own' : ''}" style="background:${effColor(t)}" title="${t.color ? 'Eigene Balkenfarbe' : 'Farbe des Gewerks'}"></span><span class="nm">${esc(t.gw || '')}</span>` : '';
    case 'pct': return Math.round(c.pct[i]) + '%';
  }
  return '';
}

function renderGrid() {
  const COLS = VCOLS(); if (window.bpSpalten && !gridHead._spListe) { bpSpalten.liste(gridHead, SP.key, SP.namen); gridHead.addEventListener('bp-spalten', () => renderGrid()); }
  gridHead.innerHTML = COLS.map((c) => `<div class="hc c-${c.k}" style="width:${colW[c.k]}px"><span class="lbl">${c.t}</span>${c.k !== 'nr' ? `<span class="rz" data-k="${c.k}"></span>` : ''}</div>`).join('');
  const total = nRows(); const T = P.tasks; let h = '';
  for (let r = 0; r < total; r++) {
    const i = vis[r];
    if (i == null) {
      h += `<div class="row blank" data-r="${r}">` + COLS.map((c) => `<div class="c c-${c.k}${cur.r === r && cur.c === c.k ? ' cur' : ''}" style="width:${colW[c.k]}px" data-c="${c.k}"></div>`).join('') + '</div>';
      continue;
    }
    const t = T[i];
    const cls = ['row', sel.has(t.uid) ? 'sel' : '', CAL.summ[i] ? 'sum' : '', !CAL.summ[i] && t.dur === 0 ? 'ms' : ''].join(' ');
    h += `<div class="${cls}" data-r="${r}">` + COLS.map((c) => `<div class="c c-${c.k}${cur.r === r && cur.c === c.k ? ' cur' : ''}" style="width:${colW[c.k]}px" data-c="${c.k}">${cellHTML(c.k, i, t)}</div>`).join('') + '</div>';
  }
  gridBody.innerHTML = h;
}

/* ---------- Zeitskala ---------- */
function startOf(u, n) {
  const D = ud(n), y = D.getUTCFullYear(), m = D.getUTCMonth();
  switch (u) {
    case 'day': return n;
    case 'week': return n - ((D.getUTCDay() + 6) % 7);
    case 'month': return Date.UTC(y, m, 1) / DAY;
    case 'quarter': return Date.UTC(y, m - (m % 3), 1) / DAY;
    case 'year': return Date.UTC(y, 0, 1) / DAY;
  }
}
function nextOf(u, n) {
  const D = ud(n), y = D.getUTCFullYear(), m = D.getUTCMonth();
  switch (u) {
    case 'day': return n + 1;
    case 'week': return n + 7;
    case 'month': return Date.UTC(y, m + 1, 1) / DAY;
    case 'quarter': return Date.UTC(y, m + 3, 1) / DAY;
    case 'year': return Date.UTC(y + 1, 0, 1) / DAY;
  }
}
function tier(u, a, b) { const out = []; let d = startOf(u, a); while (d < b) { const e = nextOf(u, d); out.push([d, e]); d = e; } return out; }
function tlabel(u, n, w, top) {
  const D = ud(n), y = D.getUTCFullYear(), m = D.getUTCMonth(), d = D.getUTCDate(), yy = String(y).slice(2);
  switch (u) {
    case 'year': return String(y);
    case 'quarter': { const q = Math.floor(m / 3) + 1; return top ? (w > 110 ? `${q}. Quartal ${y}` : `Q${q} '${yy}`) : (w > 70 ? `${q}. Quartal` : `Q${q}`); }
    case 'month': return top ? (w > 110 ? `${MONL[m]} ${y}` : `${MON[m]} '${yy}`) : (w > 70 ? MONL[m] : w > 26 ? MON[m] : MON[m][0]);
    case 'week': return top ? (w > 220 ? `${pad(d)}. ${MONL[m]} ${y}` : `${pad(d)}. ${MON[m]} '${yy}`) : (w > 38 ? `${pad(d)}.${pad(m + 1)}.` : pad(d));
    case 'day': { const g = D.getUTCDay(); return w < 26 ? WD1[g] : w < 50 ? pad(d) : `${WD2[g]} ${pad(d)}.`; }
  }
  return '';
}

/* ---------- Diagramm ---------- */
const X = (d) => (d - view.start) * ZOOMS[zoom].ppd;

function linkPath(a, b, type) {
  const ya = a.y + RH / 2, yb = b.y + RH / 2, down = yb >= ya, g = 7;
  switch (type) {
    case 'FS': {
      const xa = a.x2;
      if (b.cx >= xa + g + 3) return `M${xa},${ya}H${b.cx}V${down ? b.y + 5 : b.y + RH - 5}`;
      const yh = down ? b.y : b.y + RH;
      return `M${xa},${ya}h${g}V${yh}H${b.x1 - g * 1.6}V${yb}H${b.x1}`;
    }
    case 'SS': { const xl = Math.min(a.x1, b.x1) - g * 1.6; return `M${a.x1},${ya}H${xl}V${yb}H${b.x1}`; }
    case 'FF': { const xr = Math.max(a.x2, b.x2) + g * 1.6; return `M${a.x2},${ya}H${xr}V${yb}H${b.x2}`; }
    case 'SF': { const yh = down ? b.y : b.y + RH; return `M${a.x1},${ya}h${-g}V${yh}H${b.x2 + g * 1.6}V${yb}H${b.x2}`; }
  }
  return '';
}

function renderChart() {
  const z = ZOOMS[zoom], ppd = z.ppd, T = P.tasks, c = CAL;
  let mn = P.start, mx = P.start;
  for (let i = 0; i < T.length; i++) { mn = Math.min(mn, c.sd[i]); mx = Math.max(mx, c.fd[i]); }
  const old = view.start, oldPpd = view.ppd;
  view.start = startOf(z.t, mn - Math.ceil(90 / ppd) - 2);
  view.end = nextOf(z.t, Math.max(mx + Math.ceil(240 / ppd), view.start + Math.ceil((chartPane.clientWidth || 1200) * 1.2 / ppd)));
  view.ppd = ppd;
  const W = Math.ceil((view.end - view.start) * ppd);
  const total = nRows(), H = total * RH;

  // Kopf
  let h = `<svg width="${W}" height="${HH}"><rect width="${W}" height="${HH}" class="tsbg"/>`;
  for (const [a, b] of tier(z.t, view.start, view.end)) {
    const x = Math.round(X(a)) + 0.5, w = (b - a) * ppd;
    h += `<line x1="${x}" y1="0" x2="${x}" y2="22" class="tl"/>`;
    if (w > 28) h += `<text x="${x + 5}" y="15" class="tt">${tlabel(z.t, a, w, true)}</text>`;
  }
  h += `<line x1="0" y1="22.5" x2="${W}" y2="22.5" class="tl"/>`;
  for (const [a, b] of tier(z.b, view.start, view.end)) {
    const x = Math.round(X(a)) + 0.5, w = (b - a) * ppd;
    h += `<line x1="${x}" y1="22" x2="${x}" y2="${HH}" class="tl"/>`;
    if (z.b === 'day' && freeName(a)) h += `<rect x="${x}" y="22.5" width="${w}" height="${HH - 23}" class="holh"><title>${esc(freeName(a))}</title></rect>`;
    if (w >= 9) h += `<text x="${x + w / 2}" y="37" text-anchor="middle" class="tb${z.b === 'day' && isWE(a) ? ' we' : ''}${z.b === 'day' && freeName(a) ? ' ho' : ''}">${tlabel(z.b, a, w, false)}</text>`;
  }
  chartHead.style.width = W + 'px';
  chartHead.innerHTML = h + '</svg>';

  // Körper
  let s = `<svg width="${W}" height="${H}" id="chartSvg"><defs>
    <marker id="ah" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.6L8,4L0,7.4z" class="ahp"/></marker>
    <marker id="ahc" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.6L8,4L0,7.4z" class="ahp crit"/></marker>
    <marker id="ahpre" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0.6L8,4L0,7.4z" class="ahp pre"/></marker>
    <marker id="ahsuc" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0.6L8,4L0,7.4z" class="ahp suc"/></marker></defs>`;
  if (ppd >= 3) {
    for (let d = view.start; d < view.end; d++) {
      if (isWork(d)) continue;
      const fn = freeName(d);
      s += `<rect x="${X(d)}" y="0" width="${ppd}" height="${H}" class="${fn ? 'hol' : 'wes'}">${fn ? `<title>${esc(fn)} – ${fmtD(d)}</title>` : ''}</rect>`;
    }
  }
  if (ppd >= 6) for (const [a] of tier(z.b, view.start, view.end)) { const x = Math.round(X(a)) + 0.5; s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" class="gl"/>`; }
  for (const [a] of tier(z.t, view.start, view.end)) { const x = Math.round(X(a)) + 0.5; s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" class="gl2"/>`; }
  s += '<g id="selg"></g><g id="relg"></g>';
  const td = todayN();
  if (td >= view.start && td < view.end) s += `<line x1="${X(td) + 0.5}" y1="0" x2="${X(td) + 0.5}" y2="${H}" class="today"><title>Heute: ${fmtD(td)}</title></line>`;
  s += `<line x1="${X(P.start) + 0.5}" y1="0" x2="${X(P.start) + 0.5}" y2="${H}" class="pstart"><title>Projektanfang: ${fmtD(P.start)}</title></line>`;

  // Geometrie
  geo = {};
  vis.forEach((i, r) => { geo[i] = barGeo(i, r * RH, X, ppd); });
  // Verknüpfungslinien
  let links = '';
  vis.forEach((i) => {
    const t = T[i];
    (t.preds || []).forEach((p, k) => {
      const pi = c.idx.get(p.uid); if (pi == null || !geo[pi]) return;
      const cr = showCrit && c.crit[i] && c.crit[pi];
      const d = linkPath(segAnchor(geo[pi], p.ps), segAnchor(geo[i], p.ss), p.type);
      links += `<g class="lk${c.crit[i] && c.crit[pi] ? ' critl' : ''}" data-s="${i}" data-p="${pi}" data-k="${k}"><path d="${d}" class="lkh"/><path d="${d}" class="lkl${cr ? ' crit' : ''}" marker-end="url(#${cr ? 'ahc' : 'ah'})"/></g>`;
    });
  });
  // Balken
  let bars = '';
  vis.forEach((i) => {
    const t = T[i], g = geo[i], y = g.y, cr = showCrit && c.crit[i];
    if (c.summ[i]) {
      const { x1 } = g, x2 = Math.max(g.x2, x1 + 8);
      const pw = (x2 - x1) * c.pct[i] / 100;
      bars += `<g class="bar sum${cr ? ' crit' : ''}" data-i="${i}"><path class="sumbar" d="M${x1},${y + 7}H${x2}V${y + 17}L${x2 - 5},${y + 12}H${x1 + 5}L${x1},${y + 17}Z"/>`
        + (pw > 0 ? `<rect class="sumprog" x="${x1}" y="${y + 9}" width="${pw}" height="1.5"/>` : '') + `<circle class="lkdot" cx="${x2 + 7}" cy="${y + 12}" r="3.5"/></g>`;
    } else if (t.dur === 0) {
      bars += `<g class="bar${cr ? ' crit' : ''}" data-i="${i}"><path class="ms" d="M${g.cx},${y + 5}L${g.cx + 7},${y + 12}L${g.cx},${y + 19}L${g.cx - 7},${y + 12}Z"/><circle class="lkdot" cx="${g.cx + 13}" cy="${y + 12}" r="3.5"/></g>`;
    } else {
      const gc = effColor(t);
      const bst = gc ? ` style="fill:${gc};stroke:${cr ? '#c00000' : shade(gc, 0.7)};stroke-width:${cr ? 2 : 1}"` : '';
      const pst = gc ? ` style="fill:${shade(gc, 0.42)}"` : '';
      let doneW = t.dur * (t.pct || 0) / 100, h = '', px = g.x1;
      g.segs.forEach((sg, k) => {
        const w = Math.max(2, sg.x2 - sg.x1), d = sg.d;
        const f = Math.max(0, Math.min(1, doneW / d)); doneW -= d;
        if (f > 0) px = sg.x1 + w * f;
        if (k) h += `<line class="segc" x1="${g.segs[k - 1].x2}" y1="${y + 12}" x2="${sg.x1}" y2="${y + 12}"/>`;
        h += `<g class="sg" data-seg="${k}"><rect class="b" data-seg="${k}" x="${sg.x1}" y="${y + 6}" width="${w}" height="12"${bst}/>`
          + (f > 0 ? `<rect class="p" x="${sg.x1}" y="${y + 10}" width="${w * f}" height="4"${pst}/>` : '') + '</g>';
      });
      bars += `<g class="bar${cr ? ' crit' : ''}${g.segs.length > 1 ? ' split' : ''}" data-i="${i}">${h}`
        + `<rect class="lh" x="${g.x1 - 3}" y="${y + 4}" width="7" height="16"/><rect class="rh" x="${g.x2 - 5}" y="${y + 4}" width="8" height="16"/>`
        + `<path class="ph" d="M${px},${y + 17}l4,5h-8z"/><circle class="lkdot" cx="${g.x2 + 7}" cy="${y + 12}" r="3.5"/></g>`;
    }
    bars += barLabels(i, g, y);
  });
  chartBody.style.width = W + 'px';
  chartBody.className = 'lk-' + linkMode + (typeof splitMode !== 'undefined' && splitMode ? ' splitting' : '');
  chartBody.innerHTML = s + '<rect id="hovband" x="0" y="-100" width="100%" height="' + RH + '"/>' + links + bars + '</svg>';
  updateSelBands(); markLinks();
  // Scrollposition stabil halten, wenn sich der Anfang der Zeitachse verschiebt
  if (old != null && oldPpd === ppd && old !== view.start) chartPane.scrollLeft += (old - view.start) * ppd;
}

/* ---------- Balkengeometrie (auch für den Druck) ---------- */
function barGeo(i, y, Xf, ppd) {
  const c = CAL, t = P.tasks[i];
  if (!c.summ[i] && t.dur === 0) { const cx = Xf(c.sd[i]) + (c.msEnd[i] ? ppd : 0); return { x1: cx - 6, x2: cx + 6, cx, y, ms: true, segs: [] }; }
  if (c.summ[i]) { const x1 = Xf(c.sd[i]), x2 = c.dur[i] > 0 ? Xf(c.fd[i] + 1) : x1 + 2; return { x1, x2, cx: x1 + Math.min(6, (x2 - x1) / 2), y, segs: [] }; }
  const S = c.segS[i], E = c.segE[i], D = segList(t) ? t.segs.map((x) => x.d) : [t.dur];
  const segs = S.map((st, k) => ({ x1: Xf(fromW(st)), x2: Xf(fromW(E[k] - 1) + 1), d: D[k], s: st, e: E[k] }));
  const x1 = segs[0].x1, x2 = segs[segs.length - 1].x2;
  return { x1, x2, cx: x1 + Math.min(6, (segs[0].x2 - x1) / 2), y, segs };
}
function segAnchor(g, k) {
  if (k == null || !g.segs || !g.segs[k]) return g;
  const sg = g.segs[k];
  return { ...g, x1: sg.x1, x2: sg.x2, cx: sg.x1 + Math.min(6, (sg.x2 - sg.x1) / 2) };
}

/* ---------- Balkenbeschriftung (links / im Balken / rechts) ---------- */
const LABEL_FIELDS = [['', '– keine –'], ['name', 'Leistung'], ['res', 'Unternehmer:in'], ['craft', 'Unternehmer-Bezeichnung (Firmenliste)'], ['gw', 'Gewerk'], ['dur', 'Dauer'], ['start', 'Anfang'], ['finish', 'Ende'], ['dates', 'Anfang – Ende'], ['pct', '% Abgeschlossen'], ['nr', 'Nr.']];
/* Dauer von Leistungsgruppen: Zeitspanne wie MS Project (Standard), Summe der Leistungen oder beides */
let sumMode = LS.get('sumMode2', 'span');
function sumWork(i) {
  let s = 0; const e = blockEnd(i);
  for (let k = i + 1; k <= e; k++) if (!CAL.summ[k]) s += Math.max(0, P.tasks[k].dur || 0);
  return s;
}
function durText(i) {
  if (!CAL.summ[i]) return fmtDur(CAL.dur[i]);
  const sum = sumWork(i), span = CAL.dur[i];
  if (sumMode === 'span') return fmtDur(span);
  if (sumMode === 'both') return sum === span ? fmtDur(sum) : `${fmtDur(sum)} (Spanne ${span})`;
  return fmtDur(sum);
}
let barLbl = Object.assign({ l: '', m: '', r: 'res' }, LS.get('barLbl', {}));
function lblVal(i, f) {
  const t = P.tasks[i], c = CAL;
  switch (f) {
    case 'name': return t.name || '';
    case 'res': return t.res || '';
    case 'gw': return t.gw || '';
    case 'craft': return t.gw && typeof craftOf === 'function' ? craftOf(t.gw) : '';
    case 'dur': return c.summ[i] || t.dur ? durText(i) : '';
    case 'start': return fmtShort(c.sd[i]);
    case 'finish': return fmtShort(c.fd[i]);
    case 'dates': return c.sd[i] === c.fd[i] ? fmtShort(c.sd[i]) : fmtShort(c.sd[i]) + ' – ' + fmtShort(c.fd[i]);
    case 'pct': return Math.round(c.pct[i]) + '%';
    case 'nr': return String(i + 1);
  }
  return '';
}
const textOn = (hex) => { if (!hex || hex[0] !== '#') return '#1e1e1e'; const n = parseInt(hex.slice(1), 16); const L = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); return L < 150 ? '#fff' : '#1e1e1e'; };
const clipTxt = (s, px, cw = 6.1) => { s = String(s || ''); const n = Math.floor((px - 6) / cw); return n < 2 ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s; };
function barLabels(i, g, y, lbl = barLbl) {
  const t = P.tasks[i], c = CAL, ms = !c.summ[i] && t.dur === 0;
  let out = '';
  const L = lbl.l ? lblVal(i, lbl.l) : '';
  if (L) out += `<text class="blabel" text-anchor="end" x="${(ms ? g.cx - 9 : g.x1) - 6}" y="${y + 16}">${esc(L)}</text>`;
  if (lbl.m && !ms && !c.summ[i] && g.segs.length) {
    const sg = g.segs.reduce((a, b) => (b.x2 - b.x1 > a.x2 - a.x1 ? b : a), g.segs[0]);
    const txt = clipTxt(lblVal(i, lbl.m), sg.x2 - sg.x1);
    if (txt) out += `<text class="blabel inbar" x="${sg.x1 + 4}" y="${y + 15.5}" style="fill:${textOn(effColor(t) || '#8db3e2')}">${esc(txt)}</text>`;
  }
  let R = lbl.r ? lblVal(i, lbl.r) : '';
  if (ms && !R) R = fmtShort(c.sd[i]);
  if (R) out += `<text class="blabel" x="${(ms ? g.cx + 7 : Math.max(g.x2, g.x1 + 8)) + 14}" y="${y + 16}">${esc(R)}</text>`;
  return out;
}

function renderStatus() {
  const n = P.tasks.length;
  const c0 = P.cal || {}, calTxt = `${+c0.week || 5}-Tage-Woche · ${(STATES.find((x) => x[0] === (c0.state ?? 'DE')) || STATES[1])[1].replace('nur bundesweite Feiertage', 'Feiertage bundesweit')}${(c0.free || []).length ? ' · ' + c0.free.length + ' eigene freie Zeiträume' : ''}`;
  $('#stInfo').textContent = n ? `${n} Leistungen  ·  Anfang ${fmtD(P.start)}  ·  Ende ${fmtD(CAL.peDay)}  ·  ${CAL.pe - toW(P.start)} Arbeitstage  ·  ${calTxt}` : 'Keine Leistungen – tippe einen Namen in die erste Zeile';
  markDirty();
  $('#projStart').value = isoD(P.start);
  $('#zoomRange').value = zoom;
}

function updateSelBands() {
  const g = document.getElementById('selg'); if (!g) return;
  let s = '';
  vis.forEach((i, r) => { if (sel.has(P.tasks[i].uid)) s += `<rect x="0" y="${r * RH}" width="100%" height="${RH}" class="selband"/>`; });
  g.innerHTML = s;
}
/* ---------- Pfeile anzeigen: alle / nur markierte / kritischer Weg / keine ---------- */
let linkMode = LS.get('linkMode', 'sel'), hoverLinkI = null;
// markierte Leistung: Vorgänger blau, Nachfolger orange – Pfeile, Balken und Zeilen
function markLinks() {
  const on = new Set(selIdx()); if (hoverLinkI != null) on.add(hoverLinkI);
  if (linkMode === 'sel') chartBody.querySelectorAll('.lk').forEach((g) => g.classList.toggle('on', on.has(+g.dataset.s) || on.has(+g.dataset.p)));
  const pre = new Set(), suc = new Set(), few = on.size > 0 && on.size <= 12;
  chartBody.querySelectorAll('.lk').forEach((g) => {
    const si = +g.dataset.s, pi = +g.dataset.p, isPre = few && on.has(si) && !on.has(pi), isSuc = few && on.has(pi) && !on.has(si);
    g.classList.toggle('pre', isPre); g.classList.toggle('suc', isSuc);
    if (isPre) { pre.add(pi); g.parentNode.appendChild(g); } if (isSuc) { suc.add(si); g.parentNode.appendChild(g); }   // nach vorn holen
  });
  chartBody.querySelectorAll('.bar[data-i]').forEach((b) => { const i = +b.dataset.i; b.classList.toggle('is-pre', pre.has(i)); b.classList.toggle('is-suc', suc.has(i) && !pre.has(i)); });
  gridBody.querySelectorAll('.row').forEach((row) => { const i = vis[+row.dataset.r]; row.classList.toggle('row-pre', pre.has(i)); row.classList.toggle('row-suc', suc.has(i) && !pre.has(i)); });
  const g = document.getElementById('relg');
  if (g) { let h = ''; vis.forEach((i, r) => { if (pre.has(i)) h += `<rect x="0" y="${r * RH}" width="100%" height="${RH}" class="preband"/>`; else if (suc.has(i)) h += `<rect x="0" y="${r * RH}" width="100%" height="${RH}" class="sucband"/>`; }); g.innerHTML = h; }
}
function updateSel() {
  gridBody.querySelectorAll('.row').forEach((row) => { const i = vis[+row.dataset.r]; row.classList.toggle('sel', i != null && sel.has(P.tasks[i].uid)); });
  gridBody.querySelectorAll('.c.cur').forEach((x) => x.classList.remove('cur'));
  const cc = gridBody.querySelector(`.row[data-r="${cur.r}"] .c-${cur.c}`); if (cc) cc.classList.add('cur');
  updateSelBands(); markLinks(); updateRibbon();
}
function updateRibbon() {
  const b = (a) => document.querySelector(`.rb[data-act="${a}"]`);
  b('undo').disabled = !undoS.length; b('redo').disabled = !redoS.length;
  $('#btnCrit').classList.toggle('on', showCrit);
  $('#btnAuto').classList.toggle('on', !!autoLink);
  { const da = $('#btnDelAsk'); if (da) da.classList.toggle('on', !!LS.get('delAsk', true)); }
  $('#btnAssist').classList.toggle('on', document.body.classList.contains('assist-open'));
  const has = selIdx().length > 0;
  ['deleteSel', 'indent', 'outdent', 'unlinkSel', 'taskInfo', 'scrollToTask', 'moveUp', 'moveDown', 'insertSummary'].forEach((a) => { b(a).disabled = !has; });
  document.querySelectorAll('.rb[data-act="pct"]').forEach((x) => { x.disabled = !has; });
  b('linkSel').disabled = selIdx().length < 2;
}

/* =====================================================================
   Auswahl & Tabelle bearbeiten
   ===================================================================== */
function selectRow(r, e) {
  cur.r = r;
  if (r >= vis.length) { if (!(e && (e.ctrlKey || e.metaKey || e.shiftKey))) sel.clear(); anchorR = r; updateSel(); return; }
  const uid = P.tasks[vis[r]].uid;
  if (e && e.shiftKey) {
    sel.clear(); const a = Math.min(anchorR, r), b = Math.max(anchorR, r);
    for (let k = a; k <= b && k < vis.length; k++) sel.add(P.tasks[vis[k]].uid);
  } else if (e && (e.ctrlKey || e.metaKey)) { sel.has(uid) ? sel.delete(uid) : sel.add(uid); anchorR = r; }
  else { sel = new Set([uid]); anchorR = r; }
  updateSel();
}
function selectTaskIdx(i) { const r = rowOfIdx(i); if (r >= 0) { sel = new Set([P.tasks[i].uid]); cur.r = r; anchorR = r; } }
function ensureVisible(r) {
  const top = r * RH, bottom = top + RH, vh = gridPane.clientHeight - HH - 16;
  if (top < gridPane.scrollTop) gridPane.scrollTop = top;
  else if (bottom > gridPane.scrollTop + vh) gridPane.scrollTop = bottom - vh;
  const cell = gridBody.querySelector(`.row[data-r="${r}"] .c-${cur.c}`);
  if (cell) {
    const l = cell.offsetLeft, rr = l + cell.offsetWidth;
    if (l < gridPane.scrollLeft) gridPane.scrollLeft = l;
    else if (rr > gridPane.scrollLeft + gridPane.clientWidth - 16) gridPane.scrollLeft = rr - gridPane.clientWidth + 16;
  }
}
function rawVal(i, c) {
  const t = P.tasks[i];
  switch (c) {
    case 'name': return t.name;
    case 'dur': return fmtDur(CAL.dur[i]);
    case 'start': return fmtD(CAL.sd[i]);
    case 'finish': return fmtD(CAL.fd[i]);
    case 'pred': return predText(t);
    case 'res': return t.res || '';
    case 'gw': return t.gw || '';
    case 'pct': return String(t.pct || 0);
  }
  return '';
}
/* ---------- Vorschlagsliste für Bezeichnungen: zuletzt verwendet · im Projekt · Leistungskatalog ---------- */
function nameHistAdd(n) {
  n = String(n || '').trim(); if (n.length < 2) return;
  const h = LS.get('nameHist', []).filter((x) => x !== n); h.unshift(n); LS.set('nameHist', h.slice(0, 40));
}
function nameGroups(exclude) {
  const seen = new Set([String(exclude || '').trim().toLowerCase()]), g = [];
  const add = (title, list) => { const items = []; for (const it of list) { const k = it.n.trim().toLowerCase(); if (!k || seen.has(k)) continue; seen.add(k); items.push(it); } if (items.length) g.push({ title, items }); };
  add('Zuletzt verwendet', LS.get('nameHist', []).map((n) => ({ n })));
  if (P) add('In diesem Projekt', P.tasks.filter((t, i) => t.name && !(i + 1 < P.tasks.length && P.tasks[i + 1].lvl > t.lvl)).map((t) => ({ n: t.name, gw: t.gw })));
  add('Leistungskatalog', [...(window.LIBRARY || []).map((x) => ({ n: x.n, gw: x.gw })), ...(window.CATALOG ? CATALOG.items.filter((x) => !x.ms).map((x) => ({ n: x.n, gw: x.gw })) : [])]);
  return g;
}
// Vorschläge für den Unternehmer: Firmen des Gewerks · Unternehmerbezeichnung · im Projekt · Adressbuch
function resGroups(gw, cur) {
  const seen = new Set([String(cur || '').trim().toLowerCase()]), g = [];
  const add = (title, names) => { const items = []; for (const n of names) { const k = String(n || '').trim().toLowerCase(); if (!k || seen.has(k)) continue; seen.add(k); items.push({ n: String(n).trim() }); } if (items.length) g.push({ title, items }); };
  const book = typeof FIRMS !== 'undefined' ? FIRMS.slice().sort((a, b) => a.name.localeCompare(b.name, 'de')) : [];
  if (gw) {
    const tr = P && P.trades && P.trades[gw], f = tr && tr.firm && typeof firmById === 'function' ? firmById(tr.firm) : null;
    add('Firmen für ' + gw, [...(f ? [f.name] : []), ...book.map((x) => [x, typeof firmGwScore === 'function' ? firmGwScore(x, gw) : 0]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).map((x) => x[0].name)]);
    add('Unternehmerbezeichnung', [typeof craftOf === 'function' ? craftOf(gw) : '']);
  }
  if (P) add('Im Projekt verwendet', [...new Set(P.tasks.map((t) => t.res).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')));
  add('Adressbuch', book.map((x) => x.name));
  return g;
}
// Eingabefeld mit Aufklappliste (▾ oder Alt+↓ öffnet, Tippen filtert, ↑/↓ + Enter wählt)
function attachCombo(inp, groupsFn, onPick) {
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'combo-dd'; btn.tabIndex = -1; btn.textContent = '▾'; btn.title = 'Vorschläge anzeigen';
  inp.insertAdjacentElement('afterend', btn); inp.setAttribute('autocomplete', 'off');
  let pop = null, act = -1, flat = [];
  const close = () => { if (pop) { pop.remove(); pop = null; } act = -1; };
  const open = (filter) => {
    const q = String(filter || '').trim().toLowerCase();
    const groups = groupsFn().map((g) => ({ title: g.title, items: g.items.filter((x) => !q || x.n.toLowerCase().includes(q)).slice(0, q ? 12 : 8) })).filter((g) => g.items.length);
    if (!groups.length) { close(); return; }
    if (!pop) { pop = document.createElement('div'); pop.className = 'combo-pop'; document.body.appendChild(pop); pop.addEventListener('mousedown', (e) => { e.preventDefault(); const d = e.target.closest('[data-ci]'); if (d) pick(+d.dataset.ci); }); }
    flat = []; let h = '';
    for (const g of groups) { h += `<div class="combo-h">${esc(g.title)}</div>`; for (const it of g.items) { h += `<div class="combo-i" data-ci="${flat.length}"><span>${esc(it.n)}</span></div>`; flat.push(it); } }
    pop.innerHTML = h; act = -1;
    const r = inp.getBoundingClientRect(); pop.style.left = r.left + 'px'; pop.style.minWidth = Math.max(r.width + 24, 320) + 'px';
    const below = innerHeight - r.bottom > 260 || r.top < 260; pop.style.top = below ? r.bottom + 2 + 'px' : ''; pop.style.bottom = below ? '' : (innerHeight - r.top + 2) + 'px';
  };
  const mark = () => { if (!pop) return; pop.querySelectorAll('.combo-i').forEach((d) => d.classList.toggle('on', +d.dataset.ci === act)); const el = pop.querySelector('.combo-i.on'); if (el) el.scrollIntoView({ block: 'nearest' }); };
  const pick = (k) => { const it = flat[k]; if (!it) return; inp.value = it.n; close(); onPick && onPick(it); inp.dispatchEvent(new Event('change', { bubbles: true })); inp.focus(); };
  btn.addEventListener('mousedown', (e) => { e.preventDefault(); if (pop) close(); else { inp.focus(); open(''); } });
  inp.addEventListener('input', () => open(inp.value));
  inp.addEventListener('blur', () => setTimeout(close, 120));
  inp.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); open(''); return; }
    if (!pop) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); act = Math.max(0, Math.min(flat.length - 1, act + (e.key === 'ArrowDown' ? 1 : -1))); mark(); }
    else if (e.key === 'Enter' && act >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pick(act); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }, true);
  return { close, remove: () => { close(); btn.remove(); } };
}
function startEdit(r, c, initial) {
  if (!EDITABLE.has(c) || editing) return;
  const isTask = r < vis.length, i = isTask ? vis[r] : -1;
  if (isTask && CAL.summ[i] && ['dur', 'pct', 'finish'].includes(c)) { toast('Dauer, Ende und % Abgeschlossen von Leistungsgruppen werden aus den Teilleistungen berechnet.'); return; }
  const row = gridBody.querySelector(`.row[data-r="${r}"]`); if (!row) return;
  const cell = row.querySelector(`.c-${c}`);
  const inp = document.createElement('input');
  inp.className = 'cell-ed'; inp.spellcheck = false;
  if (c === 'gw') { updateGwList(); inp.setAttribute('list', 'gwList'); }
  if (c === 'res' && typeof updateResList === 'function') { updateResList(isTask ? i : -1); inp.setAttribute('list', 'resList'); }
  const orig = isTask ? rawVal(i, c) : '';
  inp.value = initial != null ? initial : orig;
  inp.style.left = cell.offsetLeft + 'px'; inp.style.top = row.offsetTop + 'px';
  inp.style.width = Math.max(cell.offsetWidth, c === 'name' ? 160 : 90) + 'px';
  gridBody.appendChild(inp);
  let combo = null;
  if (c === 'name') { combo = attachCombo(inp, () => nameGroups(orig), null); /* nur die Bezeichnung – das Gewerk trägst du selbst ein */ const b = inp.nextElementSibling; b.classList.add('cell-dd'); b.style.left = (cell.offsetLeft + Math.max(cell.offsetWidth, 160) - 18) + 'px'; b.style.top = row.offsetTop + 'px'; }
  inp.focus();
  if (initial == null) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
  editing = { r, c, inp, orig };
  let typed = initial != null; inp.addEventListener('input', () => { typed = true; });
  const finish = (commit, move) => {
    if (!editing || editing.inp !== inp) return;
    const v = inp.value; editing = null; inp.remove(); if (combo) combo.remove();
    if (commit && c === 'name' && v !== orig) nameHistAdd(v);
    const multi = MULTI_FIELDS.has(c) && sel.size > 1 && r < vis.length && sel.has(P.tasks[vis[r]].uid);
    if (commit && (v !== orig || (multi && typed))) commitEdit(r, c, v);
    if (multi) { updateSel(); gridBody.focus({ preventScroll: true }); return; }
    if (move === 'down') cur.r = Math.min(cur.r + 1, nRows() - 1);
    else if (move === 'up') cur.r = Math.max(cur.r - 1, 0);
    else if (move === 'right' || move === 'left') {
      const order = COLK.filter((k) => EDITABLE.has(k));
      let ix = order.indexOf(cur.c) + (move === 'right' ? 1 : -1);
      ix = Math.max(0, Math.min(order.length - 1, ix)); cur.c = order[ix];
    }
    if (cur.r < vis.length) { sel = new Set([P.tasks[vis[cur.r]].uid]); anchorR = cur.r; } else sel.clear();
    updateSel(); ensureVisible(cur.r); gridBody.focus({ preventScroll: true });
  };
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); finish(true, 'down'); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    else if (e.key === 'Tab') { e.preventDefault(); finish(true, e.shiftKey ? 'left' : 'right'); }
    else if (e.key === 'ArrowDown' && c !== 'name') { e.preventDefault(); finish(true, 'down'); }
    else if (e.key === 'ArrowUp' && c !== 'name') { e.preventDefault(); finish(true, 'up'); }
  });
  inp.addEventListener('blur', () => finish(true));
}
function applyField(i, c, v) {
  const t = P.tasks[i]; v = v.trim();
  switch (c) {
    case 'name': t.name = v; break;
    case 'dur': { const d = parseDur(v); if (d == null) throw new UErr('Ungültige Dauer. Beispiele: 5  ·  5t  ·  2w (= 10 Tage)  ·  0 (Meilenstein)'); t.dur = d; break; }
    case 'start': {
      if (!v) { t.cons = null; break; }
      const d = parseDate(v); if (d == null) throw new UErr('Ungültiges Datum. Format: TT.MM.JJ, z. B. 02.11.26');
      t.cons = snapWork(d); break;
    }
    case 'finish': {
      const d = parseDate(v); if (d == null) throw new UErr('Ungültiges Datum. Format: TT.MM.JJ, z. B. 02.11.26');
      if (t.dur === 0) { t.cons = snapWork(d); break; }
      const nd = toW(d + 1) - CAL.es[i];
      if (nd < 1) throw new UErr('Das Ende darf nicht vor dem Anfang liegen.');
      t.dur = nd; break;
    }
    case 'pred': { const old = new Map(t.preds.map((p) => [p.uid, p])); t.preds = parsePreds(v, i).map((p) => { const o = old.get(p.uid); if (o && o.ps != null) p.ps = o.ps; if (o && o.ss != null) p.ss = o.ss; return p; }); break; }
    case 'res': t.res = v; break;
    case 'gw': {   // bei Leistungsgruppen für alle Teilleistungen
      t.gw = v; if (CAL.summ[i]) for (let k = i + 1; k <= blockEnd(i); k++) P.tasks[k].gw = v;
      if (v) gwColor(v); break;
    }
    case 'pct': { const p = parseFloat(v.replace('%', '').replace(',', '.')); if (isNaN(p)) throw new UErr('Bitte eine Zahl von 0 bis 100 eingeben.'); t.pct = Math.max(0, Math.min(100, Math.round(p))); break; }
  }
}
function commitEdit(r, c, v) {
  if (r >= vis.length) {
    if (!v.trim()) return false;
    return act(() => {
      const last = vis.length ? P.tasks[vis[vis.length - 1]] : null;
      const t = newTask(c === 'name' ? v.trim() : 'Neue Leistung');
      t.lvl = last ? last.lvl : 0;
      P.tasks.push(t);
      if (autoLink) autoLinkInserted(P.tasks.length - 1);
      CAL = schedule(); computeVis();
      if (c !== 'name') applyField(P.tasks.length - 1, c, v);
      sel = new Set([t.uid]);
      cur.r = vis.length - 1;
    }) && (flashLinkMsg(), true);
  }
  const i0 = vis[r];
  if (MULTI_FIELDS.has(c) && sel.size > 1 && sel.has(P.tasks[i0].uid)) {
    const ix = selIdx().filter((i) => !(CAL.summ[i] && LEAF_ONLY.has(c)));
    const ok = act(() => { ix.forEach((i) => applyField(i, c, v)); });
    if (ok) toast(`Für ${ix.length} markierte Leistungen übernommen.`);
    return ok;
  }
  return act(() => applyField(i0, c, v));
}
