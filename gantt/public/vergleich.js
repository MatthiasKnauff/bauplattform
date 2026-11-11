/* Vergleich im Plan (Bauzeitenplan): eine gespeicherte Version liegt unter dem aktuellen Plan – der Plan bleibt bearbeitbar,
   der Vergleich rechnet nach jedem Zeichnen neu.
   – Termin geändert: alter Balken bunt-blass und gestrichelt, etwas schräg (rechts oben) versetzt; Pfeil zum neuen Ende, „+7 T“
   – neu: Zeile grün getönt, „neu“
   – entfallen: rote gestrichelte Linie an der alten Stelle zwischen den Zeilen (Tabelle und Diagramm)
   – an andere Stelle gerückt: violette gestrichelte Linie an der alten Stelle, Pfeil in der schmalen Spalte zwischen Tabelle und
     Diagramm zur neuen Zeile; als „gerückt“ zählt nur, was wirklich bewegt wurde (längste unveränderte Reihenfolge bleibt stehen)
   Oben ein Band (womit verglichen wird, Projektende alt → neu, Zahlen, andere Version, beenden), rechts der Reiter „Vergleich“.
   Hängt sich an gantt-*.js (compareVersion, renderGrid, renderChart) und rahmen.js (Bereich rechts) – gantt-*.js bleiben unverändert. */
(() => {
  let V = null;   // { label, T2, C2 } – der alte Stand
  let D = null;   // Ergebnis des letzten Vergleichs
  const DAY = 86400000;
  const kurz = (n) => (n > 0 ? '+' + n : String(n)) + ' T';

  /* ---------- Unterschiede: je aktueller Leistung (Index) Art und alter Stand; entfallene; gerückte ---------- */
  function bleiben(idx) {   // längste aufsteigende Folge: diese Leistungen haben ihre Reihenfolge behalten
    const n = idx.length, L = new Array(n).fill(1), Vr = new Array(n).fill(-1); let b = -1;
    for (let i = 0; i < n; i++) { for (let j = 0; j < i; j++) if (idx[j] < idx[i] && L[j] + 1 > L[i]) { L[i] = L[j] + 1; Vr[i] = j; } if (b < 0 || L[i] > L[b]) b = i; }
    const S = new Set(); while (b >= 0) { S.add(b); b = Vr[b]; } return S;
  }
  function rechnen() {
    const { T2, C2 } = V, T = P.tasks, alt = new Map(), altName = new Map();
    T2.forEach((t, j) => { const o = { j, uid: t.uid, name: t.name, sd: C2.sd[j], fd: C2.fd[j], dur: C2.dur[j], summ: !!C2.summ[j], ms: !C2.summ[j] && t.dur === 0 }; alt.set(t.uid, o); if (!altName.has(t.name)) altName.set(t.name, o); });
    const benutzt = new Set(), R = new Array(T.length);
    T.forEach((t, i) => {
      let o = alt.get(t.uid); if (o && benutzt.has(o)) o = null;
      if (!o) { const n = altName.get(t.name); if (n && !benutzt.has(n) && !T.some((x) => x.uid === n.uid)) o = n; }
      if (!o) { R[i] = { k: 'neu' }; return; }
      benutzt.add(o);
      const dEnde = Math.round((CAL.fd[i] - o.fd)), dAnf = CAL.sd[i] - o.sd;
      R[i] = { k: dEnde || dAnf || o.dur !== CAL.dur[i] ? 'zeit' : 'gleich', o, d: dEnde };
    });
    const da = T.map((t, i) => i).filter((i) => R[i].o), fest = bleiben(da.map((i) => R[i].o.j));
    da.forEach((i, k) => { if (!fest.has(k)) R[i].ort = true; });
    const weg = [...alt.values()].filter((o) => !benutzt.has(o));
    // alte Stelle (Zeile im aktuellen Plan): hinter dem nächsten alten Vorgänger, der noch da ist und nicht gerückt wurde
    const jZuI = new Map(); da.forEach((i) => { if (!R[i].ort) jZuI.set(R[i].o.j, i); });
    const stelle = (j) => { for (let q = j - 1; q >= 0; q--) { const i = jZuI.get(q); if (i != null) { const r = vis.indexOf(i); if (r >= 0) return r + 1; } } return 0; };
    const n = (f) => R.filter(f).length;
    D = { R, weg, stelle, nZeit: n((x) => x.k === 'zeit' && !x.ort && !x.o.summ), nNeu: n((x) => x.k === 'neu'), nOrt: n((x) => x.ort), nWeg: weg.filter((o) => !o.summ).length };
    return D;
  }

  /* ---------- Band oben ---------- */
  function band() {
    let b = document.getElementById('vgBand');
    if (!V) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'vgBand'; const w = document.getElementById('work'); w.parentElement.insertBefore(b, w); }
    const dE = CAL.peDay - V.C2.peDay;
    b.innerHTML = `<b>Vergleich</b><span class="vg-chip" title="Alter Stand">„${esc(V.label)}“ ↔ aktueller Stand</span>
      <span>Projektende ${fmtD(V.C2.peDay)} → <b>${fmtD(CAL.peDay)}</b> <b class="${dE > 0 ? 'vg-sp' : dE < 0 ? 'vg-fr' : 'vg-gl'}">${dE ? kurz(dE).replace(' T', ' KT') : 'unverändert'}</b></span>
      <span>${D.nZeit} Termin geändert · <b class="vg-fr">${D.nNeu} neu</b> · <b class="vg-sp">${D.nWeg} entfallen</b> · <b class="vg-ort">${D.nOrt} an anderer Stelle</b></span>
      <span class="vg-lg"><i class="vg-lg-alt"></i>alter Stand <i class="vg-lg-pf"></i>verschoben</span><span class="vg-sp0"></span>
      <button type="button" class="btn sm" data-vgwahl>⇄ andere Version</button><button type="button" class="btn sm" data-vgende>✕ Vergleich beenden</button>`;
  }

  /* ---------- Tabelle: Kennzeichen und Δ in der Namenszelle, Linien an alten Stellen ---------- */
  function tabelle() {
    if (!V || !D) return;
    gridBody.querySelectorAll('.row[data-r]').forEach((row) => {
      const i = vis[+row.dataset.r]; if (i == null) return; const x = D.R[i]; if (!x) return;
      const c = row.querySelector('.c-name'); if (!c) return;
      row.classList.toggle('vg-neu', x.k === 'neu'); row.classList.toggle('vg-ort', !!x.ort);
      const d = x.o && !x.o.summ && x.d ? `<i class="vg-d ${x.d > 0 ? 'vg-sp' : 'vg-fr'}">${kurz(x.d)}</i>` : '';
      const m = x.k === 'neu' ? '<i class="vg-m vg-m-neu">neu</i>' : x.ort ? '<i class="vg-m vg-m-ort" title="An eine andere Stelle gerückt">↕ neue Stelle</i>' : '';
      if (d || m) c.insertAdjacentHTML('beforeend', `<span class="vg-z">${m}${d}</span>`);
    });
    linien(gridBody, (y, f, t) => `<div class="vg-li" style="top:${y - 1}px;border-color:${f}"><span style="color:${f}">${esc(t)}</span></div>`);
  }
  function alteStellen() {
    const L = [];
    D.weg.forEach((o) => L.push({ r: D.stelle(o.j), f: '#c0392b', t: `${o.name} – entfällt`, o }));
    D.R.forEach((x, i) => { if (x.ort && vis.indexOf(i) >= 0) L.push({ r: D.stelle(x.o.j), f: '#8e6bd6', t: `${P.tasks[i].name} – stand vorher hier`, o: x.o, i }); });
    return L;
  }
  function linien(box, html) { box.insertAdjacentHTML('beforeend', alteStellen().map((l) => html(l.r * RH, l.f, l.t)).join('')); }

  /* ---------- Diagramm: alter Stand unter den Balken, Pfeile, Linien ---------- */
  function diagramm() {
    const svg = chartBody.querySelector('svg'); if (!svg || !V || !D) return;
    const ppd = ZOOMS[zoom].ppd;
    let s = '<defs><marker id="vgmr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="#c0392b"/></marker>'
      + '<marker id="vgmg" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="#2e8b57"/></marker></defs>';
    vis.forEach((i, r) => {
      const x = D.R[i], g = geo[i]; if (!x || !g) return; const y = r * RH;
      if (x.k === 'neu') { s += `<rect class="vg-neub" x="0" y="${y}" width="100%" height="${RH}"/><text class="vg-t vg-fr" x="${g.x2 + 6}" y="${y + 9}">neu</text>`; return; }
      if (x.o.summ || (x.k === 'gleich' && !x.ort)) return;
      const ox = X(x.o.sd) + 4, ow = x.o.ms ? 8 : Math.max(4, X(x.o.fd + 1) - X(x.o.sd)), f = x.ort ? '#8e6bd6' : effColor(P.tasks[i]) || '#8db3e2';
      s += `<rect class="vg-alt" x="${ox}" y="${y + 2}" width="${ow}" height="12" rx="2" style="fill:${f}40;stroke:${f}"/>`;
      if (x.d) s += `<path class="vg-pf" d="M${ox + ow} ${y + 8}L${g.x2 - 3} ${y + 12}" style="stroke:${x.d > 0 ? '#c0392b' : '#2e8b57'}" marker-end="url(#vgm${x.d > 0 ? 'r' : 'g'})"/>`
        + `<text class="vg-t ${x.d > 0 ? 'vg-sp' : 'vg-fr'}" x="${Math.max(g.x2, ox + ow) + 6}" y="${y + 9}">${kurz(x.d)}</text>`;
    });
    alteStellen().forEach((l) => { const y = l.r * RH, ox = X(l.o.sd); s += `<line class="vg-lin" x1="0" y1="${y}" x2="100%" y2="${y}" style="stroke:${l.f}"/>`
      + `<text class="vg-t" x="${Math.max(4, ox)}" y="${y - 3}" style="fill:${l.f}">${esc(l.t)}</text>`; });
    const gr = document.createElementNS('http://www.w3.org/2000/svg', 'g'); gr.id = 'vgl'; gr.innerHTML = s;
    const vor = svg.querySelector('.bar, .lk'); svg.insertBefore(gr, vor || null);
    rinne();
  }

  /* ---------- Spalte zwischen Tabelle und Diagramm: Pfeile von der alten zur neuen Stelle ---------- */
  function rinne() {
    let r = document.getElementById('vgRinne');
    if (!V) { if (r) r.remove(); return; }
    if (!r) { r = document.createElement('div'); r.id = 'vgRinne'; r.innerHTML = '<div class="vg-rk" title="An eine andere Stelle gerückt">↕</div><svg></svg>'; chartPane.parentElement.insertBefore(r, chartPane); }
    const L = alteStellen().filter((l) => l.i != null), H = Math.max(1, vis.length) * RH + 20;
    let s = '<defs><marker id="vgmv" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7z" fill="#8e6bd6"/></marker></defs>';
    L.forEach((l, k) => { const x = 7 + (k % 3) * 7, y0 = l.r * RH, y1 = vis.indexOf(l.i) * RH + RH / 2, ab = y1 > y0 ? 1 : -1;
      s += `<circle cx="27" cy="${y0}" r="2.5" fill="#8e6bd6"/><path d="M27 ${y0}C${x} ${y0},${x} ${y0},${x} ${y0 + 8 * ab}V${y1 - 8 * ab}C${x} ${y1},${x} ${y1},26 ${y1}" fill="none" stroke="#8e6bd6" stroke-width="1.7" marker-end="url(#vgmv)"><title>${esc(P.tasks[l.i].name)}: von der alten an die neue Stelle</title></path>`; });
    const sv = r.querySelector('svg'); sv.setAttribute('width', 30); sv.setAttribute('height', H); sv.innerHTML = s;
    rinneRollen();
  }
  function rinneRollen() { const r = document.getElementById('vgRinne'); if (r) r.querySelector('svg').style.transform = `translateY(${-chartPane.scrollTop}px)`; }
  chartPane.addEventListener('scroll', rinneRollen, { passive: true });

  /* ---------- Bereich rechts: Reiter „Vergleich“ mit der Liste ---------- */
  let listeEl = null;
  function liste() {
    if (!listeEl || !listeEl.isConnected || !V || !D) return;
    const Z = [];
    D.R.forEach((x, i) => {
      const t = P.tasks[i]; if (x.k === 'gleich' && !x.ort) return; if (x.o && x.o.summ && !x.ort) return;
      Z.push({ i, n: t.name, k: x.k === 'neu' ? 'neu' : x.ort ? 'ort' : x.d > 0 ? 'sp' : x.d < 0 ? 'fr' : 'zeit',
        w: x.k === 'neu' ? 'neu' : x.ort ? `↕ Zeile ${x.o.j + 1} → ${i + 1}${x.d ? ' · ' + kurz(x.d) : ''}` : x.d ? kurz(x.d) : 'Anfang/Dauer',
        z: x.o ? `${fmtD(x.o.sd)} – ${fmtD(x.o.fd)} → ${fmtD(CAL.sd[i])} – ${fmtD(CAL.fd[i])}` : `${fmtD(CAL.sd[i])} – ${fmtD(CAL.fd[i])}` });
    });
    D.weg.filter((o) => !o.summ).forEach((o) => Z.push({ i: -1, n: o.name, k: 'weg', w: 'entfällt', z: `war ${fmtD(o.sd)} – ${fmtD(o.fd)}` }));
    listeEl.innerHTML = `<div class="sr-pad vg-liste"><h4>${Z.length} Änderung${Z.length === 1 ? '' : 'en'} gegenüber „${esc(V.label)}“</h4>`
      + (Z.length ? Z.map((z) => `<button type="button" class="vg-e vg-e-${z.k}" data-vgi="${z.i}"><span>${esc(z.n)}</span><b>${esc(z.w)}</b><small>${esc(z.z)}</small></button>`).join('') : '<p class="hint">Keine Unterschiede.</p>') + '</div>';
  }
  window.GVGL = {
    versionWahl,
    aktiv: () => !!V,
    reiter: () => (V ? { id: 'vergleich', titel: 'Vergleich', mount: (el) => { listeEl = el; liste(); } } : null),
  };

  /* ---------- an gantt-*.js anhängen ---------- */
  const alt = { renderGrid, renderChart };
  renderGrid = function () { alt.renderGrid(); if (V) { rechnen(); tabelle(); } };
  renderChart = function () { alt.renderChart(); if (V) { if (!D) rechnen(); diagramm(); band(); liste(); } };
  compareVersion = async function (v, label) {
    let full; try { full = await planApi.version(P.id, v.id); } catch (e) { toast('Fehler: ' + e.message, true); return; }
    const { C: C2, T: T2 } = scheduleOf(full.data);
    V = { label, T2, C2 }; D = null;
    document.querySelectorAll('.modal-bg').forEach((b) => { if (b.querySelector('#vhBody')) b.remove(); });   // Verlaufsfenster zu: der Vergleich steht im Plan
    document.body.classList.add('g-vgl');
    if (window.ganttBereichNeu) ganttBereichNeu();
    render();
    if (typeof seiteReiter === 'function') seiteReiter('gantt', 'vergleich');
  };
  /* Vergleich mit einer anderen Version des Plans (Versionsleiste: „Startversion“, „nach Bauherrengespräch“ …) – deren aktueller Stand */
  async function mitPlan(id, name) {
    let full; try { await flushSave(); full = await planApi.get(id); } catch (e) { toast('Fehler: ' + e.message, true); return; }
    const { C: C2, T: T2 } = scheduleOf(full);
    V = { label: 'Version ' + (name || full.name || ''), T2, C2 }; D = null;
    document.body.classList.add('g-vgl');
    if (window.ganttBereichNeu) ganttBereichNeu();
    render();
    if (typeof seiteReiter === 'function') seiteReiter('gantt', 'vergleich');
  }
  function versionWahl() {   // andere Version desselben Projekts wählen
    const bt = P && P._bt ? P._bt.id : null;
    const L = bt ? projects.filter((p) => p.bt_id === bt && p.id !== P.id) : [];
    if (!L.length) { toast('Es gibt keine andere Version dieses Plans – „＋ Neue Version“ in der Versionsleiste legt eine an.'); return; }
    const bg = modal('Vergleichen mit …', `<p class="hint" style="margin-top:0">Der aktuelle Plan bleibt bearbeitbar; die gewählte Version liegt als alter Stand darunter.</p>
      <div style="display:grid;gap:.35rem">${L.map((p) => `<button type="button" class="btn" data-vid="${esc(p.id)}" style="display:flex;justify-content:space-between;gap:1rem"><span>${esc(p.name)}${p.gueltig ? ' ★' : ''}</span><small class="hint">${esc((p.updated || '').slice(0, 10))}</small></button>`).join('')}</div>`, [{ label: 'Abbrechen' }]);
    bg.addEventListener('click', (e) => { const b = e.target.closest('[data-vid]'); if (!b) return; bg.remove(); const p = L.find((x) => x.id === b.dataset.vid); mitPlan(b.dataset.vid, p && p.name); });
  }
  function beenden() {
    V = null; D = null; document.body.classList.remove('g-vgl'); band(); rinne();
    if (window.ganttBereichNeu) ganttBereichNeu();
    render();
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-vgende]')) { beenden(); return; }
    if (e.target.closest('[data-vgwahl]')) { versionHistory(); return; }
    const z = e.target.closest('[data-vgi]'); if (z) { const i = +z.dataset.vgi; if (i < 0) return; const r = vis.indexOf(i); if (r >= 0) { selectRow(r); ensureVisible(r); } }
  });
  // Plan gewechselt: Vergleich gehört zum alten Plan – beenden
  let planId = null;
  const r0 = renderChart; renderChart = function () { if (V && P && planId != null && P.id !== planId) { V = null; D = null; document.body.classList.remove('g-vgl'); band(); rinne(); if (window.ganttBereichNeu) setTimeout(ganttBereichNeu, 0); } planId = P && P.id; r0(); };
})();
