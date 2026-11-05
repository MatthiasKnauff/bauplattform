'use strict';
/* =====================================================================
   Drucken / PDF – beliebige Papierformate, Rolle/Endlospapier,
   Anpassen auf N Seiten, Vorschau. Wird vor app.js geladen; greift erst
   beim Aufruf auf dessen Zustand (P, CAL, vis, …) zu.
   ===================================================================== */

const PAPERS = {
  A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297], A5: [148, 210], A6: [105, 148],
  B3: [353, 500], B4: [250, 353], B5: [176, 250],
  'US Letter': [215.9, 279.4], 'US Legal': [215.9, 355.6], 'Tabloid / Ledger': [279.4, 431.8],
  'ANSI C': [431.8, 558.8], 'ANSI D': [558.8, 863.6], 'ANSI E': [863.6, 1117.6],
  'ARCH C': [457.2, 609.6], 'ARCH D': [609.6, 914.4], 'ARCH E': [914.4, 1219.2],
};
const PRINT_COLS = [['nr', 'Nr.'], ['name', 'Leistung'], ['gw', 'Gewerk'], ['dur', 'Dauer'], ['start', 'Anfang'], ['finish', 'Ende'], ['pred', 'Vorgänger'], ['res', 'Unternehmer'], ['pct', '% Abg.']];
const PRINT_ZOOMS = ['Jahre / Quartale', 'Quartale / Monate', 'Monate / Wochen', 'Wochen / Tage (eng)', 'Wochen / Tage', 'Wochen / Tage (weit)'];
const PDEF = {
  paper: 'A3', orient: 'landscape', cw: 500, ch: 300, roll: 914, margin: 10,
  scaleMode: 'fit', pagesW: 1, zoom: 3, font: 100, fitH: false, pagesH: 1,
  range: 'all', from: '', to: '', outline: 'shown',
  cols: ['nr', 'name', 'gw', 'dur', 'start', 'finish'],
  repeatTable: true, links: 'all', crit: true, legend: true, header: true, footer: true, today: true, title: '',
};
let PO = null;
const printOpts = () => (PO ||= Object.assign({}, PDEF, LS.get('print', {})));

function tiersFor(ppd) {
  if (ppd < 1.8) return ['year', 'quarter'];
  if (ppd < 4.5) return ['quarter', 'month'];
  if (ppd < 12) return ['month', 'week'];
  return ['week', 'day'];
}
const fit = (s, px, cw = 6.1) => { s = String(s ?? ''); const n = Math.floor((px - 8) / cw); return n <= 1 ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* ---------- Layout berechnen ---------- */
function printLayout(o) {
  const T = P.tasks, c = CAL;
  const rows = o.outline === 'all' ? T.map((t, i) => i) : vis.slice();
  const n = rows.length;
  let mn = P.start, mx = P.start;
  if (n) { mn = Infinity; mx = -Infinity; rows.forEach((i) => { mn = Math.min(mn, c.sd[i]); mx = Math.max(mx, c.fd[i]); }); }
  let d0 = mn - 1, d1 = mx + 2;
  if (o.range === 'custom') {
    const a = parseDate(o.from), b = parseDate(o.to);
    if (a != null) d0 = a; if (b != null && b >= d0) d1 = b + 1;
  }
  const cols = PRINT_COLS.filter(([k]) => o.cols.includes(k)).map(([k, t]) => ({ k, t, w: colW[k] }));
  const tableW = cols.reduce((s, x) => s + x.w, 0);
  const PADL = 8, PADR = 120;
  const m = Math.max(0, +o.margin || 0);
  const baseS = 0.2646 * 0.85 * (Math.max(30, Math.min(300, +o.font || 100)) / 100); // mm je Bildpunkt
  let pw, ph, s = baseS, ppd, rpp, slices = [];
  const days = Math.max(1, d1 - d0);
  const hdr = (w, h) => { const u = Math.max(2.4, Math.min(w, h) * 0.011); return { u, hb: o.header ? u * 3.4 : 0, fb: (o.footer || o.legend) ? u * 3 : 0 }; };

  if (o.paper === 'roll') {
    const rw = Math.max(50, +o.roll || 914);
    if (o.orient === 'landscape') {          // Zeitachse läuft entlang der Rolle
      ph = rw; const { hb, fb } = hdr(rw, rw);
      s = (ph - 2 * m - hb - fb) / (HH + Math.max(1, n) * RH);   // Zeilen füllen die Rollenbreite
      ppd = ZOOMS[o.zoom].ppd;
      const cw = days * ppd + PADL + PADR;
      pw = 2 * m + (tableW + cw) * s;
    } else {                                  // Rolle hochkant: Breite fest, Länge nach Zeilen
      pw = rw; const { hb, fb } = hdr(rw, rw);
      const Wpx = (pw - 2 * m) / s;
      ppd = (Wpx - tableW - PADL - PADR) / days;
      if (ppd < 0.4) { ppd = 0.4; s = (pw - 2 * m) / (tableW + days * ppd + PADL + PADR); }
      ph = 2 * m + hb + fb + (HH + Math.max(1, n) * RH) * s;
    }
    rpp = Math.max(1, n);
    const cw = days * ppd + PADL + PADR;
    slices = [{ tw: tableW, x0: 0, x1: cw }];
  } else {
    [pw, ph] = o.paper === 'custom' ? [Math.max(30, +o.cw || 297), Math.max(30, +o.ch || 210)] : PAPERS[o.paper] || PAPERS.A3;
    if (o.paper !== 'custom' && o.orient === 'landscape') [pw, ph] = [Math.max(pw, ph), Math.min(pw, ph)];
    if (o.paper !== 'custom' && o.orient === 'portrait') [pw, ph] = [Math.min(pw, ph), Math.max(pw, ph)];
    const { hb, fb } = hdr(pw, ph);
    const Wc = pw - 2 * m, Hc = ph - 2 * m - hb - fb;
    if (o.fitH) { const r = Math.ceil(Math.max(1, n) / Math.max(1, +o.pagesH || 1)); s = Math.min(s, Hc / (HH + r * RH)); }
    let repeat = o.repeatTable && tableW < (Wc / s) * 0.6;
    if (o.scaleMode === 'fit') {
      const N = Math.max(1, Math.round(+o.pagesW || 1));
      const tabs = repeat ? N : 1;
      ppd = (N * Wc / s - tabs * tableW - PADL - PADR) / days;
      if (ppd < 0.4) { ppd = 0.4; s = N * Wc / (tabs * tableW + days * ppd + PADL + PADR); repeat = o.repeatTable && tableW < (Wc / s) * 0.6; }
    } else ppd = ZOOMS[o.zoom].ppd;
    const Wpx = Wc / s, cw = days * ppd + PADL + PADR;
    let x = 0, p = 0;
    while (x < cw - 0.5 && p < 400) {
      const tw = (p === 0 || repeat) ? tableW : 0;
      const sw = Math.max(20, Wpx - tw);
      slices.push({ tw, x0: x, x1: Math.min(cw, x + sw) }); x += sw; p++;
    }
    rpp = Math.max(1, Math.floor((Hc / s - HH) / RH));
  }
  const bands = []; for (let r = 0; r < Math.max(1, n); r += rpp) bands.push([r, Math.min(n, r + rpp)]);
  return { o, rows, cols, tableW, d0, d1, ppd, s, pw, ph, m, slices, bands, PADL, PADR, cw: days * ppd + PADL + PADR, hdr: hdr(pw, ph), total: bands.length * slices.length };
}

/* ---------- Inhalte (logische Bildpunkte) ---------- */
function printTable(L) {
  const { cols, tableW, rows, o } = L, c = CAL, T = P.tasks;
  let x = 0; const xs = cols.map((cl) => { const v = x; x += cl.w; return v; });
  let head = `<rect x="0" y="0" width="${tableW}" height="${HH}" fill="#f3f3f3"/>`;
  cols.forEach((cl, k) => {
    head += `<text x="${cl.k === 'nr' ? xs[k] + cl.w / 2 : xs[k] + 5}" y="${HH - 8}" font-size="11.5" font-weight="600" fill="#333"${cl.k === 'nr' ? ' text-anchor="middle"' : ''}>${esc(fit(cl.t, cl.w, 6.6))}</text>`;
    if (k) head += `<line x1="${xs[k]}" y1="0" x2="${xs[k]}" y2="${HH}" stroke="#c6c6c6"/>`;
  });
  head += `<line x1="0" y1="${HH - 0.5}" x2="${tableW}" y2="${HH - 0.5}" stroke="#c6c6c6"/>`;
  let body = '';
  rows.forEach((i, r) => {
    const t = T[i], y = HH + r * RH, sum = c.summ[i], ty = y + 16;
    if (cols[0] && cols[0].k === 'nr') body += `<rect x="0" y="${y}" width="${cols[0].w}" height="${RH}" fill="#f3f3f3"/>`;
    cols.forEach((cl, k) => {
      const x0 = xs[k], w = cl.w, fw = sum ? ' font-weight="700"' : '';
      let v = '', anchor = '', tx = x0 + 5;
      switch (cl.k) {
        case 'nr': v = i + 1; anchor = ' text-anchor="middle"'; tx = x0 + w / 2; break;
        case 'name': {
          const ind = t.lvl * 16 + 15; tx = x0 + 5 + ind;
          if (sum) body += `<text x="${x0 + 5 + t.lvl * 16}" y="${ty}" font-size="9" fill="#444">${t.collapsed ? '▶' : '◢'}</text>`;
          v = fit(t.name, w - ind, sum ? 6.7 : 6.1); break;
        }
        case 'dur': v = c === CAL && typeof durText === 'function' ? durText(i) : fmtDur(c.dur[i]); anchor = ' text-anchor="end"'; tx = x0 + w - 5; break;
        case 'start': v = fmtD(c.sd[i]); break;
        case 'finish': v = fmtD(c.fd[i]); break;
        case 'pred': v = fit(predText(t), w); break;
        case 'res': v = fit(t.res || '', w); break;
        case 'gw': if (t.gw) { body += `<rect x="${x0 + 5}" y="${y + 7}" width="10" height="10" rx="2" fill="${gwColor(t.gw)}" stroke="rgba(0,0,0,.3)"/>`; tx = x0 + 20; v = fit(t.gw, w - 15); } break;
        case 'pct': v = Math.round(c.pct[i]) + '%'; anchor = ' text-anchor="end"'; tx = x0 + w - 5; break;
      }
      if (cl.k !== 'name' && cl.k !== 'pred' && cl.k !== 'res' && cl.k !== 'gw') v = fit(v, w, sum ? 6.7 : 6.1) || v;
      body += `<text x="${tx}" y="${ty}" font-size="11.5"${fw}${anchor} fill="#222">${esc(v)}</text>`;
    });
    body += `<line x1="0" y1="${y + RH - 0.5}" x2="${tableW}" y2="${y + RH - 0.5}" stroke="#e3e3e3"/>`;
  });
  const H = HH + rows.length * RH;
  cols.forEach((cl, k) => { if (k) body += `<line x1="${xs[k]}" y1="${HH}" x2="${xs[k]}" y2="${H}" stroke="#e3e3e3"/>`; });
  return { head, body };
}

function printChart(L) {
  const { rows, d0, d1, ppd, PADL, cw, o } = L, c = CAL, T = P.tasks;
  const X = (d) => PADL + (d - d0) * ppd;
  const [tt, tb] = tiersFor(ppd);
  const H = HH + rows.length * RH;
  const a0 = d0 - Math.ceil(PADL / ppd) - 1, a1 = d1 + Math.ceil(L.PADR / ppd) + 1;
  const headFor = (cx0) => {
  let head = `<rect x="0" y="0" width="${cw}" height="${HH}" fill="#f3f3f3"/>`;
  for (const [a, b] of tier(tt, a0, a1)) {
    const x = X(a), w = (b - a) * ppd;
    head += `<line x1="${x}" y1="0" x2="${x}" y2="22" stroke="#c6c6c6"/>`;
    const lx = Math.max(x, cx0) + 5, avail = X(b) - lx - 4;
    let lab = tlabel(tt, a, w, true);
    if (lab.length * 6.6 > avail) lab = tlabel(tt, a, 60, true);   // Kurzform
    if (lab.length * 6.6 <= avail) head += `<text x="${lx}" y="15" font-size="11.5" fill="#333">${lab}</text>`;
  }
  head += `<line x1="0" y1="22.5" x2="${cw}" y2="22.5" stroke="#c6c6c6"/>`;
  for (const [a, b] of tier(tb, a0, a1)) {
    const x = X(a), w = (b - a) * ppd;
    head += `<line x1="${x}" y1="22" x2="${x}" y2="${HH}" stroke="#c6c6c6"/>`;
    if (w >= 9) head += `<text x="${x + w / 2}" y="37" text-anchor="middle" font-size="11" fill="${tb === 'day' && isWE(a) ? '#8a8a8a' : '#444'}">${tlabel(tb, a, w, false)}</text>`;
  }
  head += `<line x1="0" y1="${HH - 0.5}" x2="${cw}" y2="${HH - 0.5}" stroke="#c6c6c6"/>`;
  return head;
  };

  let body = '';
  if (ppd >= 3) for (let d = a0; d < a1; d++) { if (isWork(d)) continue; body += `<rect x="${X(d)}" y="${HH}" width="${ppd}" height="${H - HH}" fill="${freeName(d) ? '#fbe3e3' : '#f1f1f1'}"/>`; }
  if (ppd >= 6) for (const [a] of tier(tb, a0, a1)) body += `<line x1="${X(a)}" y1="${HH}" x2="${X(a)}" y2="${H}" stroke="#ececec"/>`;
  for (const [a] of tier(tt, a0, a1)) body += `<line x1="${X(a)}" y1="${HH}" x2="${X(a)}" y2="${H}" stroke="#d6d6d6"/>`;
  const td = todayN();
  if (o.today && td >= d0 && td < d1) body += `<line x1="${X(td)}" y1="${HH}" x2="${X(td)}" y2="${H}" stroke="#f08a00" stroke-width="1.5" stroke-dasharray="4 3"/>`;

  const g = {}, pos = new Map(rows.map((i, r) => [i, r]));
  rows.forEach((i, r) => { g[i] = barGeo(i, HH + r * RH, X, ppd); });
  const red = '#c00000', navy = '#1f3864';
  if (o.links !== 'none') rows.forEach((i) => {
    (T[i].preds || []).forEach((p) => {
      const pi = c.idx.get(p.uid); if (pi == null || !pos.has(pi)) return;
      if (o.links === 'crit' && !(c.crit[i] && c.crit[pi])) return;
      const cr = o.crit && c.crit[i] && c.crit[pi], col = cr ? red : navy;
      const d = linkPath(segAnchor(g[pi], p.ps), segAnchor(g[i], p.ss), p.type);
      body += `<path d="${d}" fill="none" stroke="${col}" stroke-width="1" marker-end="url(#pah${cr ? 'c' : ''})"/>`;
    });
  });
  const inl = (h) => h.replace(/class="blabel inbar"/g, 'font-size="11" font-weight="500"').replace(/class="blabel"/g, 'font-size="11" fill="#333"');
  rows.forEach((i) => {
    const t = T[i], q = g[i], y = q.y, cr = o.crit && c.crit[i];
    if (c.summ[i]) {
      const x1 = q.x1, x2 = Math.max(q.x2, x1 + 8);
      body += `<path fill="${cr ? red : '#262626'}" d="M${x1},${y + 7}H${x2}V${y + 17}L${x2 - 5},${y + 12}H${x1 + 5}L${x1},${y + 17}Z"/>`;
    } else if (t.dur === 0) {
      body += `<path fill="${cr ? red : '#262626'}" d="M${q.cx},${y + 5}L${q.cx + 7},${y + 12}L${q.cx},${y + 19}L${q.cx - 7},${y + 12}Z"/>`;
    } else {
      const gc = effColor(t);
      const fill = gc || (cr ? '#ec9b9b' : '#8db3e2'), stroke = cr ? red : gc ? shade(gc, 0.7) : '#4f7fb8';
      let done = t.dur * (t.pct || 0) / 100;
      q.segs.forEach((sg, k) => {
        const w = Math.max(2, sg.x2 - sg.x1), f = Math.max(0, Math.min(1, done / sg.d)); done -= sg.d;
        if (k) body += `<line x1="${q.segs[k - 1].x2}" y1="${y + 12}" x2="${sg.x1}" y2="${y + 12}" stroke="#555" stroke-width="1.2" stroke-dasharray="2 3"/>`;
        body += `<rect x="${sg.x1}" y="${y + 6}" width="${w}" height="12" fill="${fill}" stroke="${stroke}" stroke-width="${cr && gc ? 2 : 1}"/>`;
        if (f > 0) body += `<rect x="${sg.x1}" y="${y + 10}" width="${w * f}" height="4" fill="${gc ? shade(gc, 0.42) : cr ? '#7a0000' : navy}"/>`;
      });
    }
    body += inl(barLabels(i, q, y));
  });
  return { headFor, body };
}

/* ---------- Seiten zusammensetzen ---------- */
// Büro-Logo für die Kopfzeile (einmal laden, als data-URL – so landet es sicher im Druck/PDF)
let PRINT_LOGO = null;
(async () => {
  try {
    const r = await fetch('api/logo'); if (!r.ok) return;
    const b = await r.blob(); if (!/^image\//.test(b.type)) return;
    const url = await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });
    const im = new Image(); im.onload = () => { PRINT_LOGO = { url, ar: im.naturalWidth / im.naturalHeight || 1 }; }; im.src = url;
  } catch { /* ohne Logo drucken */ }
})();
function printPages(L) {
  const { o, s, pw, ph, m, slices, bands, tableW } = L, { u, hb, fb } = L.hdr;
  const tab = printTable(L), ch = printChart(L);
  const title = (o.title || '').trim() || (P._bt && P._bt.name) || P.name;   // Projektname (die Version steht im Kopf des Plans nicht)
  const now = new Date(), stamp = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const span = P.tasks.length ? `${fmtD(CAL.sd[L.rows[0]] ?? P.start)} – ${fmtD(CAL.peDay)}` : '';
  const defs = `<defs><marker id="pah" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.6L8,4L0,7.4z" fill="#1f3864"/></marker><marker id="pahc" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.6L8,4L0,7.4z" fill="#c00000"/></marker></defs>`;
  const legend = () => {
    if (!o.legend) return '';
    const gws = [...new Set(L.rows.map((i) => P.tasks[i].gw).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    const y = ph - m - fb * 0.45, h = u * 0.9; let x = m, out = '';
    const maxX = pw - m - (o.footer ? u * 20 : 0); let full = false;
    const item = (shape, label) => { if (full) return; if (x + h * 3.2 + label.length * u * 0.5 > maxX) { full = true; out += `<text x="${x}" y="${y}" font-size="${u * 0.85}" fill="#333">…</text>`; return; } out += shape(x, y - h * 0.8, h) + `<text x="${x + h * 3.2}" y="${y}" font-size="${u * 0.85}" fill="#333">${label}</text>`; x += h * 3.2 + label.length * u * 0.5 + u * 2; };
    if (!gws.length) item((x0, y0, hh) => `<rect x="${x0}" y="${y0}" width="${hh * 2.6}" height="${hh}" fill="#8db3e2" stroke="#4f7fb8" stroke-width="${hh * 0.08}"/><rect x="${x0}" y="${y0 + hh * 0.33}" width="${hh * 1.3}" height="${hh * 0.34}" fill="#1f3864"/>`, 'Leistung / Fortschritt');
    if (o.crit) item((x0, y0, hh) => `<rect x="${x0}" y="${y0}" width="${hh * 2.6}" height="${hh}" fill="#fff" stroke="#c00000" stroke-width="${hh * 0.16}"/>`, 'Kritisch (roter Rand)');
    gws.forEach((gname) => { const gc = gwColor(gname); item((x0, y0, hh) => `<rect x="${x0}" y="${y0}" width="${hh * 2.6}" height="${hh}" fill="${gc}" stroke="${shade(gc, 0.7)}" stroke-width="${hh * 0.08}"/>`, gname); });
    item((x0, y0, hh) => `<path fill="#262626" d="M${x0},${y0}h${hh * 2.6}v${hh}l${-hh * 0.4},${-hh * 0.4}h${-hh * 1.8}l${-hh * 0.4},${hh * 0.4}z"/>`, 'Leistungsgruppe');
    item((x0, y0, hh) => `<path fill="#262626" d="M${x0 + hh * 1.3},${y0 - hh * 0.1}l${hh * 0.6},${hh * 0.6}l${-hh * 0.6},${hh * 0.6}l${-hh * 0.6},${-hh * 0.6}z"/>`, 'Meilenstein');
    if (o.today) item((x0, y0, hh) => `<line x1="${x0 + hh * 1.3}" y1="${y0 - hh * 0.2}" x2="${x0 + hh * 1.3}" y2="${y0 + hh * 1.2}" stroke="#f08a00" stroke-width="${hh * 0.12}" stroke-dasharray="${hh * 0.3} ${hh * 0.2}"/>`, 'Heute');
    return out;
  };
  const pages = []; let pg = 0;
  bands.forEach(([r0, r1]) => {
    const nr = Math.max(0, r1 - r0), Hpx = HH + nr * RH;
    slices.forEach((sl) => {
      pg++;
      const id = 'pp' + pg + '_' + Math.random().toString(36).slice(2, 7);
      const sw = sl.x1 - sl.x0;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pw} ${ph}" width="${pw}mm" height="${ph}mm" font-family="Segoe UI, system-ui, -apple-system, Roboto, Arial, sans-serif">${defs}<rect width="${pw}" height="${ph}" fill="#fff"/>`;
      if (o.header) {
        const lh = u * 2.3, lw = PRINT_LOGO ? Math.min(lh * PRINT_LOGO.ar, u * 12) : 0;
        if (PRINT_LOGO) svg += `<image href="${PRINT_LOGO.url}" x="${pw - m - lw}" y="${m}" width="${lw}" height="${lh}" preserveAspectRatio="xMaxYMid meet"/>`;
        svg += `<text x="${m}" y="${m + u * 1.6}" font-size="${u * 1.45}" font-weight="700" fill="#1e1e1e">${esc(title)}</text>`
          + `<text x="${pw - m - (lw ? lw + u * 1.2 : 0)}" y="${m + u * 1.6}" font-size="${u * 0.95}" fill="#555" text-anchor="end">${esc(span)}</text>`
          + `<line x1="${m}" y1="${m + hb - u * 0.9}" x2="${pw - m}" y2="${m + hb - u * 0.9}" stroke="#2f6f3e" stroke-width="${u * 0.12}"/>`;
      }
      svg += `<clipPath id="${id}t"><rect x="0" y="0" width="${sl.tw}" height="${HH}"/></clipPath><clipPath id="${id}tb"><rect x="0" y="${HH}" width="${sl.tw}" height="${nr * RH}"/></clipPath>`
        + `<clipPath id="${id}c"><rect x="${sl.tw}" y="0" width="${sw}" height="${HH}"/></clipPath><clipPath id="${id}cb"><rect x="${sl.tw}" y="${HH}" width="${sw}" height="${nr * RH}"/></clipPath>`;
      svg += `<g transform="translate(${m},${m + hb}) scale(${s})">`;
      if (sl.tw) {
        svg += `<g clip-path="url(#${id}t)">${tab.head}</g><g clip-path="url(#${id}tb)"><g transform="translate(0,${-r0 * RH})">${tab.body}</g></g>`;
      }
      svg += `<g clip-path="url(#${id}c)"><g transform="translate(${sl.tw - sl.x0},0)">${ch.headFor(sl.x0)}</g></g>`
        + `<g clip-path="url(#${id}cb)"><g transform="translate(${sl.tw - sl.x0},${-r0 * RH})">${ch.body}</g></g>`;
      if (sl.tw) svg += `<line x1="${sl.tw}" y1="0" x2="${sl.tw}" y2="${Hpx}" stroke="#9a9a9a" stroke-width="1.2"/>`;
      svg += `<rect x="0.5" y="0.5" width="${sl.tw + sw - 1}" height="${Hpx - 1}" fill="none" stroke="#9a9a9a"/></g>`;
      svg += legend();
      if (o.footer) svg += `<text x="${pw - m}" y="${ph - m - fb * 0.45}" font-size="${u * 0.85}" fill="#555" text-anchor="end">Seite ${pg} von ${L.total}  ·  gedruckt ${stamp}</text>`;
      pages.push(svg + '</svg>');
    });
  });
  return pages;
}

/* ---------- Dialog mit Vorschau ---------- */
function printDialog() {
  if (!P) return;
  const o = printOpts();
  const opt = (v, l, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`;
  const body = `<div class="pr-wrap">
    <div class="pr-form">
      <div class="sec" style="margin-top:0">Papier</div>
      <label>Format</label>
      <select data-o="paper">
        <optgroup label="DIN / ISO">${['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B3', 'B4', 'B5'].map((k) => opt(k, `${k}  (${PAPERS[k][0]} × ${PAPERS[k][1]} mm)`, o.paper)).join('')}</optgroup>
        <optgroup label="Nordamerika">${['US Letter', 'US Legal', 'Tabloid / Ledger', 'ANSI C', 'ANSI D', 'ANSI E', 'ARCH C', 'ARCH D', 'ARCH E'].map((k) => opt(k, `${k}  (${PAPERS[k][0]} × ${PAPERS[k][1]} mm)`, o.paper)).join('')}</optgroup>
        <optgroup label="Frei">${opt('custom', 'Benutzerdefiniert (Breite × Höhe)', o.paper)}${opt('roll', 'Rolle / Endlospapier (Plotter)', o.paper)}</optgroup>
      </select>
      <div class="pr-row" data-show="custom"><label>Breite mm</label><input type="number" min="30" max="10000" data-o="cw" value="${o.cw}"><label>Höhe mm</label><input type="number" min="30" max="10000" data-o="ch" value="${o.ch}"></div>
      <div class="pr-row" data-show="roll"><label>Rollenbreite mm</label><input type="number" min="50" max="5000" data-o="roll" value="${o.roll}" list="rollList"><datalist id="rollList"><option value="297"><option value="420"><option value="594"><option value="610"><option value="841"><option value="914"><option value="1067"></datalist></div>
      <label>Ausrichtung</label>
      <select data-o="orient">${opt('landscape', 'Querformat', o.orient)}${opt('portrait', 'Hochformat', o.orient)}</select>
      <div class="pr-hint" data-show="roll">Querformat: Zeitachse läuft entlang der Rolle, Länge automatisch. Hochformat: Zeitachse über die Rollenbreite, Länge nach Anzahl der Zeilen.</div>
      <label>Ränder mm</label><input type="number" min="0" max="100" data-o="margin" value="${o.margin}">

      <div class="sec">Skalierung</div>
      <div data-hide="roll">
        <label>Zeitachse</label>
        <select data-o="scaleMode">${opt('fit', 'An Seitenbreite anpassen', o.scaleMode)}${opt('fixed', 'Feste Zeitskala', o.scaleMode)}</select>
        <div class="pr-row" data-showmode="fit"><label>auf</label><input type="number" min="1" max="50" data-o="pagesW" value="${o.pagesW}"><span>Seite(n) breit</span></div>
      </div>
      <div data-showmode="fixed"><label>Zeitskala</label><select data-o="zoom">${PRINT_ZOOMS.map((l, k) => opt(k, l, o.zoom)).join('')}</select></div>
      <div data-hide-roll-l><label>Schriftgröße</label><div class="pr-row"><input type="range" min="40" max="250" step="5" data-o="font" value="${o.font}"><span class="pr-val" data-val="font">${o.font}%</span></div></div>
      <div class="pr-row" data-hide="roll"><label class="cb"><input type="checkbox" data-o="fitH"${o.fitH ? ' checked' : ''}> Zeilen anpassen auf</label><input type="number" min="1" max="50" data-o="pagesH" value="${o.pagesH}"><span>Seite(n) hoch</span></div>

      <div class="sec">Inhalt</div>
      <label>Zeitraum</label>
      <select data-o="range">${opt('all', 'Gesamtes Projekt', o.range)}${opt('custom', 'Von – bis', o.range)}</select>
      <div class="pr-row" data-showrange="custom"><input type="date" data-o="from" value="${o.from}"><span>bis</span><input type="date" data-o="to" value="${o.to}"></div>
      <label>Leistungen</label>
      <select data-o="outline">${opt('shown', 'Wie angezeigt (eingeklappte ausblenden)', o.outline)}${opt('all', 'Alle Leistungen (Gliederung erweitert)', o.outline)}</select>
      <label>Spalten</label>
      <div class="pr-cols">${PRINT_COLS.map(([k, t]) => `<label class="cb"><input type="checkbox" data-col="${k}"${o.cols.includes(k) ? ' checked' : ''}> ${t}</label>`).join('')}</div>
      <label>Verknüpfungspfeile</label><select data-o="links">${opt('all', 'alle drucken', o.links)}${opt('crit', 'nur kritischer Weg', o.links)}${opt('none', 'keine drucken', o.links)}</select>
      <label>Optionen</label>
      <div class="pr-cols">
        <label class="cb"><input type="checkbox" data-o="repeatTable"${o.repeatTable ? ' checked' : ''}> Tabelle auf jeder Seite</label>
        <label class="cb"><input type="checkbox" data-o="crit"${o.crit ? ' checked' : ''}> Kritischen Weg rot</label>
        <label class="cb"><input type="checkbox" data-o="today"${o.today ? ' checked' : ''}> Heute-Linie</label>
        <label class="cb"><input type="checkbox" data-o="legend"${o.legend ? ' checked' : ''}> Legende</label>
        <label class="cb"><input type="checkbox" data-o="header"${o.header ? ' checked' : ''}> Kopfzeile</label>
        <label class="cb"><input type="checkbox" data-o="footer"${o.footer ? ' checked' : ''}> Seitenzahl / Datum</label>
      </div>
      <label>Titel</label><input data-o="title" value="${esc(o.title)}" placeholder="${esc((P._bt && P._bt.name) || P.name)}">
    </div>
    <div class="pr-prev"><div class="pr-info" id="prInfo"></div><div class="pr-pages" id="prPages"></div></div>
  </div>`;
  let L = null;
  const bg = modal('Drucken / PDF', body, [
    { label: 'Standard', left: true, fn: () => { PO = Object.assign({}, PDEF); LS.set('print', PO); setTimeout(printDialog, 0); } },
    { label: 'Drucken…', cls: 'primary', primary: true, fn: () => { LS.set('print', o); doPrint(L); } },
    { label: 'Schließen', fn: () => { LS.set('print', o); } },
  ]);
  bg.querySelector('.modal').classList.add('pr-modal');
  const read = () => {
    bg.querySelectorAll('[data-o]').forEach((el) => {
      const k = el.dataset.o;
      o[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range' || k === 'zoom') ? +el.value : el.value;
    });
    o.cols = PRINT_COLS.map(([k]) => k).filter((k) => bg.querySelector(`[data-col="${k}"]`).checked);
  };
  const vis2 = () => {
    bg.querySelectorAll('[data-show]').forEach((el) => { el.style.display = el.dataset.show === o.paper ? '' : 'none'; });
    bg.querySelectorAll('[data-hide]').forEach((el) => { el.style.display = el.dataset.hide === o.paper ? 'none' : ''; });
    bg.querySelectorAll('[data-showmode]').forEach((el) => { el.style.display = (el.dataset.showmode === o.scaleMode || (o.paper === 'roll' && el.dataset.showmode === 'fixed' && o.orient === 'landscape')) && !(o.paper === 'roll' && el.dataset.showmode === 'fixed' && o.orient === 'portrait') ? '' : 'none'; });
    bg.querySelectorAll('[data-hide-roll-l]').forEach((el) => { el.style.display = o.paper === 'roll' && o.orient === 'landscape' ? 'none' : ''; });
    bg.querySelectorAll('[data-showrange]').forEach((el) => { el.style.display = el.dataset.showrange === o.range ? '' : 'none'; });
    bg.querySelector('[data-val="font"]').textContent = o.font + '%';
  };
  const refresh = () => {
    read(); vis2();
    L = printLayout(o);
    const pages = printPages(L);
    L.pages = pages;
    const prev = bg.querySelector('#prPages');
    const area = prev.clientWidth - 30 || 600;
    const many = pages.length > 1;
    const wpx = many ? Math.min(area / Math.min(pages.length, L.slices.length > 1 ? Math.min(L.slices.length, 3) : 2) - 16, 340) : Math.min(area, 620 * (L.pw >= L.ph ? 1 : L.pw / L.ph));
    const hpx = wpx * L.ph / L.pw;
    const shown = pages.slice(0, 40);
    prev.innerHTML = shown.map((p, k) => `<div class="pr-page" style="width:${wpx}px;height:${hpx}px" title="Seite ${k + 1}">${p}</div>`).join('')
      + (pages.length > shown.length ? `<div class="pr-more">… und ${pages.length - shown.length} weitere Seiten</div>` : '');
    const small = L.s * 11 < 1.6; // Schrift < ~4,5 pt
    bg.querySelector('#prInfo').innerHTML = `<b>${pages.length} ${pages.length === 1 ? 'Seite' : 'Seiten'}</b> · ${L.slices.length} breit × ${L.bands.length} hoch · Papier ${Math.round(L.pw)} × ${Math.round(L.ph)} mm · Schrift ca. ${(L.s * 11.5 / 0.3528).toFixed(1)} pt`
      + (small ? ' · <span style="color:#b00020">Schrift sehr klein – mehr Seiten oder größeres Format wählen</span>' : '')
      + (pages.length > 60 ? ' · <span style="color:#b00020">sehr viele Seiten</span>' : '');
  };
  let t = null;
  bg.addEventListener('input', () => { clearTimeout(t); t = setTimeout(refresh, 120); });
  bg.addEventListener('change', () => { clearTimeout(t); refresh(); });
  setTimeout(refresh, 0);
}

function doPrint(L) {
  if (!L) return;
  let root = document.getElementById('printRoot');
  if (!root) { root = document.createElement('div'); root.id = 'printRoot'; document.body.appendChild(root); }
  root.innerHTML = (L.pages || printPages(L)).map((p) => `<div class="ppage">${p}</div>`).join('');
  let st = document.getElementById('printPageStyle');
  if (!st) { st = document.createElement('style'); st.id = 'printPageStyle'; document.head.appendChild(st); }
  st.textContent = `@page{size:${L.pw.toFixed(1)}mm ${L.ph.toFixed(1)}mm;margin:0}.ppage{width:${L.pw.toFixed(1)}mm;height:${L.ph.toFixed(1)}mm}`;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  setTimeout(() => window.print(), 60);
}

// Drucken über das Browser-Menü: mit den zuletzt gewählten Einstellungen
addEventListener('beforeprint', () => {
  if (document.body.classList.contains('printing') || typeof P === 'undefined' || !P) return;
  const L = printLayout(printOpts()); L.pages = printPages(L);
  let root = document.getElementById('printRoot');
  if (!root) { root = document.createElement('div'); root.id = 'printRoot'; document.body.appendChild(root); }
  root.innerHTML = L.pages.map((p) => `<div class="ppage">${p}</div>`).join('');
  let st = document.getElementById('printPageStyle');
  if (!st) { st = document.createElement('style'); st.id = 'printPageStyle'; document.head.appendChild(st); }
  st.textContent = `@page{size:${L.pw.toFixed(1)}mm ${L.ph.toFixed(1)}mm;margin:0}.ppage{width:${L.pw.toFixed(1)}mm;height:${L.ph.toFixed(1)}mm}`;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
});
