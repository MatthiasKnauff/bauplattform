/* Soll und Ist im Plan (Bauzeitenplan, Mock „Soll und Ist“ SI-1 … SI-7, GO 22.11.2026): das festgehaltene Soll (eine Version mit
   meta.soll, Server /api/projects/<id>/soll) liegt immer unter dem laufenden Plan (Ist) – der Plan bleibt bearbeitbar, der Vergleich
   rechnet nach jedem Zeichnen neu. Den Vergleich mit beliebigen alten Versionen gibt es nicht mehr (SI-1).
   – Termin geändert: Soll-Balken bunt-blass und gestrichelt, etwas schräg (rechts oben) versetzt; Pfeil zum neuen Ende, „+7 T“
   – neu: Zeile grün getönt, „neu“
   – entfallen: rote gestrichelte Linie an der alten Stelle zwischen den Zeilen (Tabelle und Diagramm)
   – an andere Stelle gerückt: violette gestrichelte Linie an der alten Stelle, Pfeil in der schmalen Spalte zwischen Tabelle und
     Diagramm zur neuen Zeile; als „gerückt“ zählt nur, was wirklich bewegt wurde (längste unveränderte Reihenfolge bleibt stehen)
   Oben ein Band (Soll vom …, Projektende Soll → Ist, Zahlen, „Soll aus“, „Soll neu festhalten …“), rechts der Reiter „Soll/Ist“.
   Ausgeblendet („Soll aus“) bleibt es je Person im Browser (LS „sollAus“). Festhalten: GVGL.festhalten() – Recht „gantt.soll“ (BP.me.soll).
   Hängt sich an gantt-*.js (renderGrid, renderChart) und rahmen.js (Bereich rechts). */
(() => {
  let V = null;   // { label, T2, C2, m } – das Soll, wenn es gezeigt wird
  let S = null;   // das geladene Soll des Plans (Meta + Daten) bzw. null
  let D = null;   // Ergebnis des letzten Vergleichs
  const aus = () => !!LS.get('sollAus', false);
  const darf = () => !!(window.BP && BP.me && BP.me.soll);
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
    if (!S) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'vgBand'; const w = document.getElementById('work'); w.parentElement.insertBefore(b, w); }
    const neu = darf() ? '<button type="button" class="btn sm" data-sollneu>📌 Soll neu festhalten …</button>' : '';
    if (!V) { b.className = 'vg-aus'; b.innerHTML = `<b>Soll</b><span class="mute">vom ${esc(S.tag)} ausgeblendet</span><span class="vg-sp0"></span><button type="button" class="btn sm" data-sollan>Soll zeigen</button>${neu}`; return; }
    b.className = '';
    const dE = CAL.peDay - V.C2.peDay;
    b.innerHTML = `<b>Soll vom ${esc(S.tag)}</b><span class="vg-chip" title="${esc(S.note || '')}">„${esc(S.name || 'Soll')}“${S.by ? ' · ' + esc(S.by) : ''}</span>
      <span>Projektende ${fmtD(V.C2.peDay)} → <b>${fmtD(CAL.peDay)}</b> <b class="${dE > 0 ? 'vg-sp' : dE < 0 ? 'vg-fr' : 'vg-gl'}">${dE ? kurz(dE).replace(' T', ' KT') : 'unverändert'}</b></span>
      <span>${D.nZeit} Termin geändert · <b class="vg-fr">${D.nNeu} neu</b> · <b class="vg-sp">${D.nWeg} entfallen</b> · <b class="vg-ort">${D.nOrt} an anderer Stelle</b></span>
      <span class="vg-lg"><i class="vg-lg-alt"></i>Soll <i class="vg-lg-pf"></i>verschoben</span><span class="vg-sp0"></span>
      <button type="button" class="btn sm" data-vgende>Soll aus</button>${neu}`;
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
    listeEl.innerHTML = `<div class="sr-pad vg-liste"><h4>${Z.length} Abweichung${Z.length === 1 ? '' : 'en'} vom Soll „${esc(V.label)}“</h4>`
      + (Z.length ? Z.map((z) => `<button type="button" class="vg-e vg-e-${z.k}" data-vgi="${z.i}"><span>${esc(z.n)}</span><b>${esc(z.w)}</b><small>${esc(z.z)}</small></button>`).join('') : '<p class="hint">Keine Unterschiede.</p>') + '</div>';
  }
  /* ---------- Soll laden, zeigen, festhalten ---------- */
  let planId = null, ladeNr = 0;
  async function laden() {
    const id = P && P.id, nr = ++ladeNr; S = null; V = null; D = null;
    if (id == null) return zeigen();
    let x = null; try { const r = await fetch(`api/projects/${encodeURIComponent(id)}/soll`); x = r.ok ? await r.json() : null; } catch { x = null; }
    if (nr !== ladeNr || !P || P.id !== id) return;
    if (x && x.data) { const d = new Date(x.created); S = { ...x, tag: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` }; }
    zeigen();
  }
  function zeigen() {
    if (S && !aus()) { const { C: C2, T: T2 } = scheduleOf(S.data); V = { label: S.name || 'Soll', T2, C2 }; } else V = null;
    D = null;
    document.body.classList.toggle('g-vgl', !!V);
    if (!V) { band(); rinne(); }   // mit Soll zeichnet renderChart das Band (nach dem Vergleich)
    if (window.ganttBereichNeu) ganttBereichNeu();
    if (P) render();
  }
  function festhalten(planId2, erstes) {   // Soll (neu) festhalten – erstes: nach „Gilt ab jetzt“ (SI-4), ohne Pflicht-Begründung
    const id = planId2 || (P && P.id); if (id == null) return;
    const neu = !!S && String(id) === String(P && P.id), heute = fmtD(todayN());
    modal(neu ? 'Soll neu festhalten' : 'Als Soll festhalten', `<div class="form" style="max-width:480px">
      <div class="hint full" style="margin:0 0 8px">${neu ? `Der heutige Plan wird das neue Soll. Das bisherige Soll („${esc(S.name || 'Soll')}“ vom ${esc(S.tag)}) bleibt als früheres Soll im Verlauf.`
        : 'Der heutige Plan wird als Soll festgehalten und liegt ab jetzt blass unter dem laufenden Plan (Ist). Fortschritt, Überziehung und verschobene Termine trägst du im Ist ein.'}</div>
      <label>Name</label><input id="soName" class="full" value="${esc(erstes ? 'Soll ' + heute : neu ? '' : 'Soll ' + heute)}" placeholder="z. B. Nachtrag 2 – Bauzeitverlängerung">
      <label>Begründung${neu ? ' (Pflicht)' : ''}</label><textarea id="soNote" class="full" placeholder="${neu ? 'z. B. vereinbart mit der Bauherrschaft am …' : 'optional'}"></textarea></div>`,
    [{ label: 'Festhalten', cls: 'primary', primary: true, fn: (bg) => {
      const name = bg.querySelector('#soName').value.trim() || 'Soll ' + heute, note = bg.querySelector('#soNote').value.trim();
      if (neu && !note) { toast('Bitte begründen, warum das Soll neu festgehalten wird.', true); return false; }
      (async () => { if (String(id) === String(P && P.id)) await flushSave();
        await planApi.addVersion(id, { soll: true, name, note, end: String(id) === String(P && P.id) ? CAL.peDay : undefined });
        LS.set('sollAus', false); toast(`Soll „${name}“ festgehalten.`); if (String(id) === String(P && P.id)) laden(); })().catch((e) => toast('Fehler: ' + e.message, true));
    } }, { label: erstes ? 'Später' : 'Abbrechen' }]);
  }
  async function erstesSoll(id) {   // SI-4: beim „Gilt ab jetzt“ fragen, wenn der Plan noch kein Soll hat
    if (!darf()) return;
    try { const r = await fetch(`api/projects/${encodeURIComponent(id)}/soll`); const x = r.ok ? await r.json() : {}; if (x && x.data) return; } catch { return; }
    festhalten(id, true);
  }
  window.GVGL = {
    aktiv: () => !!V,
    soll: () => S,
    festhalten: () => festhalten(),
    erstesSoll,
    laden,
    reiter: () => (V ? { id: 'vergleich', titel: 'Soll/Ist', mount: (el) => { listeEl = el; liste(); } } : null),
  };

  /* ---------- an gantt-*.js anhängen ---------- */
  const alt = { renderGrid, renderChart };
  renderGrid = function () { alt.renderGrid(); if (V) { rechnen(); tabelle(); } };
  renderChart = function () {
    if (P && P.id !== planId) { planId = P.id; V = null; S = null; D = null; document.body.classList.remove('g-vgl'); band(); rinne(); setTimeout(laden, 0); }   // anderer Plan: dessen Soll laden
    alt.renderChart(); if (V) { if (!D) rechnen(); diagramm(); band(); liste(); }
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-vgende]')) { LS.set('sollAus', true); zeigen(); return; }
    if (e.target.closest('[data-sollan]')) { LS.set('sollAus', false); zeigen(); return; }
    if (e.target.closest('[data-sollneu]')) { festhalten(); return; }
    const z = e.target.closest('[data-vgi]'); if (z) { const i = +z.dataset.vgi; if (i < 0) return; const r = vis.indexOf(i); if (r >= 0) { selectRow(r); ensureVisible(r); } }
  });
})();
