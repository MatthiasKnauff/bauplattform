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
  const STRUKTUR = new Set(['_teil', '_grp', '_teilph', '_gw']);
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
    return act(() => ordne(mode));
  }
  function ordne(mode) {
    if (window.ganttStufe) ganttStufe.entfernen();   // Gewerk-Zeilen der Gliederung „mittel“ erst heraus, am Ende wieder hinein
    {
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
      const TL = teileListe().sort((a, b) => (b.k === '_gem') - (a.k === '_gem')), out = [];   // „Gemeinsam“ vorne
      const zeile = (cat, teil, ph, name, lvl) => { const k = `${cat}|${teil}|${ph}`; let r = alt.get(k); if (!r) { r = newTask(name, 1); r.cat = cat; r.teil = teil || undefined; r.ph = ph; if (!teil) delete r.teil; } r.lvl = lvl; if (cat === '_teil' || cat === '_teilph') r.name = name; out.push(r); };
      const setze = (u, lvl) => { const d = lvl - u.rows[0].lvl; u.rows.forEach((r) => { r.lvl += d; out.push(r); }); };
      const gem = (phs) => phs.forEach((ph) => { const U = einh.filter((u) => (!u.teil || (mode === 'phase' && u.teil === '_gem')) && u.ph === ph && u.cat !== '_start' && u.cat !== '_end'); if (!U.length) return; zeile('_grp', '', ph, PK().PHN[ph], 0); U.forEach((u) => setze(u, 1)); });
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
      if (window.ganttStufe && AB().stufe) ganttStufe.anwenden();
      ablaufNachfuehren();
    }
  }
  window.ablaufGruppieren = gruppieren;

  /* ---------- Leistungen in eine andere Kiste ziehen (GO 18.11.2026, Mock „Leistungen umziehen“: UZ-A1 B1) ----------
     Die Leistung (mit ihren Unterzeilen) gehört danach zum Ziel-Teil, steht dort in derselben Bauphase; Dauer, Firma und Vorgänger bleiben.
     Gemerkt in P.ablauf.umzug [{von, cat, nach}] (von = Teil laut Katalog) – „Plan neu aus den Angaben“ wendet die Umzüge wieder an (A1).
     Pfeile der Seite, die an der Leistung hängen, wandern mit. */
  function blkVon(k) { const t = P.tasks.find((x) => x.teil === k && Number.isInteger(x.blk)); return t ? t.blk : undefined; }
  function setzeTeil(i, ziel) {   // Zeile i samt Unterzeilen
    const T = P.tasks, b = blkVon(ziel), l0 = T[i].lvl;
    for (let j = i; j < T.length && (j === i || T[j].lvl > l0); j++) { T[j].teil = ziel; if (b !== undefined) T[j].blk = b; }
  }
  function umziehenOhneAct(uids, ziel) {
    const A = AB(); A.umzug = A.umzug || [];
    let n = 0;
    for (const uid of uids) {
      const i = P.tasks.findIndex((t) => t.uid === uid); if (i < 0) continue;
      const t = P.tasks[i], von = t.teil; if (!von || von === ziel || STRUKTUR.has(t.cat)) continue;
      if (t.cat && t.cat[0] !== '_') {
        const e = A.umzug.find((u) => u.cat === t.cat && u.nach === von);
        if (e) { if (e.von === ziel) A.umzug.splice(A.umzug.indexOf(e), 1); else e.nach = ziel; } else A.umzug.push({ von, cat: t.cat, nach: ziel });
        A.links.forEach((l) => { if (l.von === von && l.vonCat === t.cat) l.von = ziel; if (l.nach === von && l.nachCat === t.cat) l.nach = ziel; });
        A.links = A.links.filter((l) => !(l.von === l.nach && (l.vonCat || '') === (l.nachCat || '')));
      }
      setzeTeil(i, ziel); n++;
    }
    if (n) ordne(A.gruppe === 'phase' ? 'phase' : 'teil');
    return n;
  }
  /* nach „Plan neu aus den Angaben“ (assist.js regenerate): gemerkte Umzüge wieder anwenden – vor dem Nachführen der Pfeile */
  window.ablaufUmzug = () => {
    const U = P && P.ablauf && Array.isArray(P.ablauf.umzug) ? P.ablauf.umzug : []; if (!U.length || !hatTeile()) return;
    const da = new Set(P.tasks.filter((t) => t.teil).map((t) => t.teil)); let n = 0;
    for (const u of U) { if (!da.has(u.nach)) continue; P.tasks.forEach((t, i) => { if (t.teil === u.von && t.cat === u.cat) { setzeTeil(i, u.nach); n++; } }); }
    if (n) ordne(P.ablauf.gruppe === 'phase' ? 'phase' : 'teil');
  };
  window.ablaufHatTeile = hatTeile;

  /* ---------- Seite ---------- */
  const SICHT = () => document.getElementById('ablaufView');
  const an = () => { const v = SICHT(); return !!(v && !v.hidden); };
  const offen = new Set((() => { try { return JSON.parse(localStorage.getItem('gantt.ablauf.auf') || '[]'); } catch { return []; } })());
  const merkeOffen = () => { try { localStorage.setItem('gantt.ablauf.auf', JSON.stringify([...offen])); } catch { /* ohne Speicher */ } };
  const KW = 280;
  function lage(TL) {
    const A = AB(), pos = {};
    TL.filter((tl) => tl.k !== '_gem').forEach((tl, i) => { const p = A.pos[tl.k]; pos[tl.k] = p ? { x: p[0], y: p[1] } : (i ? { x: 30 + KW + 140, y: 30 + (i - 1) * 150 } : { x: 30, y: 30 }) });
    TL.filter((tl) => tl.k === '_gem').forEach((tl) => { const p = A.pos[tl.k]; pos[tl.k] = p ? { x: p[0], y: p[1] } : { x: 30 + 2 * (KW + 140), y: 30 + 75 }; });   // Gemeinsames rechts daneben – Pfeile laufen nicht durch die Teile   // Vorgabe: treppab, damit Pfeile nicht durch Kisten laufen
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
    const TL = teileListe(), pos = lage(TL);
    const kiste = (tl) => {
      const B = blaetter(tl.k), auf = offen.has(tl.k), p = pos[tl.k];
      const von = B.length ? Math.min(...B.map((b) => CAL.es[b.i])) : 0, bis = B.length ? Math.max(...B.map((b) => CAL.ef[b.i])) : 0;
      const zeit = B.length ? `${fmtD(Math.min(...B.map((b) => CAL.sd[b.i])))} – ${fmtD(Math.max(...B.map((b) => CAL.fd[b.i])))} · ${bis - von} AT` : 'keine Leistungen';
      return `<div class="ab-k${auf ? ' auf' : ''}${tl.k === '_gem' ? ' gem' : ''}" data-abk="${esc(tl.k)}" style="left:${p.x}px;top:${p.y}px;width:${KW}px">
        <div class="ab-kk" data-abziel="${esc(tl.k)}|" title="Doppelklick: ${auf ? 'schließen' : 'öffnen'} · ziehen: verschieben"><b>${esc(tl.n)}</b><small>${B.length} Leistungen · ${esc(zeit)}${window.ganttStufe && ganttStufe.hatStufen() ? ' · Gliederung ' + esc(ganttStufe.stufeVon(tl.k)) : ''}</small>
          <span class="ab-h" data-abvon="${esc(tl.k)}|" title="Pfeil ziehen: diese Kiste vor eine andere Kiste oder Leistung"></span></div>
        ${auf ? `<div class="ab-l">${B.map((b, nr) => `<div class="ab-z${mark.has(b.t.uid) ? ' mark' : ''}" data-abuid="${b.t.uid}" data-abziel="${esc(tl.k)}|${esc(b.t.cat || '#' + b.t.uid)}" title="In eine andere Kiste ziehen = gehört dann zu diesem Teil · Strg+Klick markiert mehrere"><span class="ab-hl" data-abvon="${esc(tl.k)}|${esc(b.t.cat || '#' + b.t.uid)}" title="Pfeil ziehen"></span><i class="ab-zf" style="background:${esc((typeof effColor === 'function' && effColor(b.t)) || '#9e9e9e')}" title="${esc(b.t.gw || 'Farbe aus dem Gantt')}"></i><span class="ab-zn"><small class="ab-nr">${nr + 1}</small> ${esc(b.t.name)}</span><small>${CAL.dur[b.i]} AT</small><span class="ab-h" data-abvon="${esc(tl.k)}|${esc(b.t.cat || '#' + b.t.uid)}" title="Pfeil ziehen: diese Leistung vor …"></span></div>`).join('') || '<div class="ab-z"><small>keine Leistungen</small></div>'}</div>` : ''}</div>`;
    };
    const w = Math.max(900, ...TL.map((tl) => pos[tl.k].x + KW + 60)), h = Math.max(500, ...TL.map((tl) => pos[tl.k].y + (offen.has(tl.k) ? 60 + 26 * blaetter(tl.k).length : 80) + 60));
    const roll = v.querySelector('.ab-roll'), sx = roll ? roll.scrollLeft : 0, sy = roll ? roll.scrollTop : 0;
    v.innerHTML = `<div class="ab-kopf"><b>Ablauf der Gebäudeteile</b><span class="mute">Doppelklick öffnet eine Kiste · in der Kiste gilt die Reihenfolge, Pfeile nur zwischen den Kisten · am Punkt rechts ziehen = Pfeil · Leistung am Namen in eine andere Kiste ziehen = umziehen · Pfeil anklicken = Art und Abstand · dieselben Verknüpfungen wie im Gantt</span>
</div>
      <div class="ab-roll"><div class="ab-flaeche" style="width:${w}px;height:${h}px"><svg class="ab-svg" width="${w}" height="${h}"><defs><marker id="abP" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="currentColor"/></marker></defs></svg>${TL.map(kiste).join('')}</div></div>`;
    const r2 = v.querySelector('.ab-roll'); r2.scrollLeft = sx; r2.scrollTop = sy;
    pfeile();
  }
  /* alle Pfeile: eigene (P.ablauf.links) und Verknüpfungen zwischen Leistungen verschiedener Teile aus dem Gantt */
  function pfeilListe() {
    const L = AB().links.map((l, i) => ({ ...l, i, eigen: true }));
    const byU = new Map(P.tasks.map((t) => [t.uid, t]));
    /* nur die nötigen (PF-A1): was über andere Verknüpfungen und die Reihenfolge im Teil ohnehin gilt, zeigt die Seite nicht – „Aufräumen“ entfernt es auch im Plan */
    const weg = new Set(typeof ueberfluessigeLinks === 'function' ? ueberfluessigeLinks(P.tasks, (t, q) => t.teil && q.teil && t.teil !== q.teil).map(([, p]) => p) : []);
    for (const t of P.tasks) for (const p of t.preds || []) {
      if (p.kiste || weg.has(p)) continue; const q = byU.get(p.uid);
      if (q && q.teil && t.teil && q.teil !== t.teil && !STRUKTUR.has(q.cat) && !STRUKTUR.has(t.cat)) L.push({ von: q.teil, nach: t.teil, vonCat: q.cat || '#' + q.uid, nachCat: t.cat || '#' + t.uid, type: p.type, lag: p.lag, gantt: { s: t.uid, p: q.uid } });
    }
    return L;
  }
  function anker(k, cat) {   // Rechteck des Ziels in Koordinaten der Fläche; Leistung einer geschlossenen Kiste → die Kiste
    const v = SICHT(), F = v.querySelector('.ab-flaeche'), fr = F.getBoundingClientRect();
    let el = cat ? v.querySelector(`[data-abziel="${CSS.escape(k + '|' + cat)}"]`) : null, zeile = !!el;
    if (el) { const li = el.closest('.ab-l'), lr = li && li.getBoundingClientRect(), r0 = el.getBoundingClientRect();   // Zeile aus der Liste gerollt: an die Kiste, nicht ins Leere
      if (lr && (r0.bottom < lr.top + 4 || r0.top > lr.bottom - 4)) { el = null; zeile = false; } }
    if (!el) el = v.querySelector(`[data-abk="${CSS.escape(k)}"]`);
    if (!el) return null; const r = el.getBoundingClientRect();
    return { l: r.left - fr.left, r: r.right - fr.left, t: r.top - fr.top, b: r.bottom - fr.top, zeile };
  }
  /* Seite der Andockung automatisch (18.11.2026): die einander zugewandten Seiten – nebeneinander rechts/links, übereinander unten/oben;
     Zeilen in einer offenen Kiste nur seitlich (sonst liefe der Pfeil durch die anderen Zeilen). */
  function seiten(A, B) {
    const ca = { x: (A.l + A.r) / 2, y: (A.t + A.b) / 2 }, cb = { x: (B.l + B.r) / 2, y: (B.t + B.b) / 2 };
    const seitlich = A.zeile || B.zeile || B.l >= A.r - 10 || B.r <= A.l + 10;
    const pt = (R, s) => (s === 'r' ? { x: R.r, y: (R.t + R.b) / 2, nx: 1, ny: 0 } : s === 'l' ? { x: R.l, y: (R.t + R.b) / 2, nx: -1, ny: 0 } : s === 'u' ? { x: (R.l + R.r) / 2, y: R.b, nx: 0, ny: 1 } : { x: (R.l + R.r) / 2, y: R.t, nx: 0, ny: -1 });
    if (seitlich) { const re = cb.x >= ca.x; return [pt(A, re ? 'r' : 'l'), pt(B, B.l >= A.r - 10 || (re && !(B.r <= A.l + 10)) ? 'l' : 'r')]; }
    const ab = cb.y >= ca.y; return [pt(A, ab ? 'u' : 'o'), pt(B, ab ? 'o' : 'u')];
  }
  function pfeile() {
    const v = SICHT(), svg = v.querySelector('.ab-svg'), F = v.querySelector('.ab-flaeche'); if (!svg) return;
    const kurz = { FS: 'EA', SS: 'AA', FF: 'EE', SF: 'AE' };
    let hMax = 0; v.querySelectorAll('.ab-k').forEach((k) => { hMax = Math.max(hMax, k.offsetTop + k.offsetHeight + 60); });   // Fläche so hoch wie die Kisten – kein Pfeil endet abgeschnitten
    if (hMax > F.offsetHeight) { F.style.height = hMax + 'px'; svg.setAttribute('height', hMax); }
    const M = pfeilListe().map((l, j) => {
      const A = anker(l.von, l.vonCat), B = anker(l.nach, l.nachCat); if (!A || !B) return '';
      const [a, b] = seiten(A, B), dd = Math.max(40, Math.hypot(b.x - a.x, b.y - a.y) / 3);
      const d = `M${a.x},${a.y} C${a.x + a.nx * dd},${a.y + a.ny * dd} ${b.x + b.nx * dd},${b.y + b.ny * dd} ${b.x},${b.y}`, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const txt = `${kurz[l.type] || 'EA'}${+l.lag ? (l.lag > 0 ? ' +' : ' ') + l.lag + ' AT' : ''}`;
      return `<g class="ab-p${l.gantt ? ' gantt' : ''}" data-abp="${j}"><path d="${d}" class="ab-ps"/><path d="${d}" class="ab-pl" marker-end="url(#abP)"/><text x="${mx}" y="${my - 5}" text-anchor="middle">${esc(txt)}</text></g>`;
    }).join('');
    svg.querySelectorAll('g').forEach((g) => g.remove());
    svg.insertAdjacentHTML('beforeend', M);
  }

  /* ---------- Bedienung ---------- */
  document.addEventListener('scroll', (e) => { if (an() && e.target.classList && e.target.classList.contains('ab-l')) pfeile(); }, true);   // Liste einer Kiste gerollt: Pfeile folgen
  let zug = null;   // { art: 'kiste', k, dx, dy } | { art: 'pfeil', von } | { art: 'zeile', uid, k }
  const mark = new Set();   // mit Strg+Klick markierte Leistungen – ziehen zusammen
  /* Kontextmenü an der Kiste (gemeinsames Menü, head.js): Gliederung grob · mittel · fein für diesen Gebäudeteil (GL-B1) */
  document.addEventListener('bph:kontext', (e) => {
    const box = an() && e.target.closest && e.target.closest('[data-abk]'); if (!box || !window.ganttStufe || !ganttStufe.hatStufen()) return;
    ganttStufe.blockPunkte(box.dataset.abk).forEach((p) => e.detail.punkte.push({ text: p.label, fn: p.fn, aus: !!p.dis }));
  });
  document.addEventListener('dblclick', (e) => {
    const kk = an() && e.target.closest('.ab-kk'); if (!kk) return;
    const k = kk.closest('[data-abk]').dataset.abk; if (offen.has(k)) offen.delete(k); else offen.add(k); merkeOffen(); zeichne();
  });
  document.addEventListener('pointerdown', (e) => {
    if (!an() || e.button !== 0) return;
    const h = e.target.closest('[data-abvon]');
    if (h) { e.preventDefault(); zug = { art: 'pfeil', von: h.dataset.abvon }; return; }
    const zr = e.target.closest('.ab-z[data-abuid]');
    if (zr) { e.preventDefault(); zug = { art: 'zeile', uid: +zr.dataset.abuid, k: zr.closest('[data-abk]').dataset.abk, el: zr, x0: e.clientX, y0: e.clientY, strg: e.ctrlKey || e.metaKey }; return; }
    const kk = e.target.closest('.ab-kk'); if (!kk) return;
    const box = kk.closest('[data-abk]'), r = box.getBoundingClientRect();
    zug = { art: 'kiste', k: box.dataset.abk, el: box, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY };
  });
  document.addEventListener('pointermove', (e) => {
    if (!zug || !an()) return;
    const F = SICHT().querySelector('.ab-flaeche'), fr = F.getBoundingClientRect();
    if (zug.art === 'zeile') {
      if (Math.abs(e.clientX - zug.x0) + Math.abs(e.clientY - zug.y0) < 5 && !zug.zieht) return;
      if (!zug.zieht) { zug.zieht = true; if (!mark.has(zug.uid)) { mark.clear(); mark.add(zug.uid); } zug.uids = [...mark];
        F.insertAdjacentHTML('beforeend', `<div class="ab-geist">${esc(zug.uids.length > 1 ? zug.uids.length + ' Leistungen' : (P.tasks.find((x) => x.uid === zug.uid) || {}).name || '')}</div>`);
        SICHT().querySelectorAll('.ab-z.mark').forEach((z) => z.classList.add('zieht')); zug.el.classList.add('zieht'); }
      const gs = F.querySelector('.ab-geist'); gs.style.left = (e.clientX - fr.left + 12) + 'px'; gs.style.top = (e.clientY - fr.top + 8) + 'px';
      const box = (document.elementFromPoint(e.clientX, e.clientY) || document.body).closest('[data-abk]'), k2 = box && box.dataset.abk !== zug.k ? box.dataset.abk : '';
      SICHT().querySelectorAll('.ab-k.ab-ziel').forEach((x) => { if (x.dataset.abk !== k2) x.classList.remove('ab-ziel'); }); if (k2) box.classList.add('ab-ziel');
      return;
    }
    if (zug.art === 'kiste') {
      if (Math.abs(e.clientX - zug.x0) + Math.abs(e.clientY - zug.y0) < 4 && !zug.zieht) return; zug.zieht = true;
      zug.el.style.left = Math.max(0, e.clientX - fr.left - zug.dx) + 'px'; zug.el.style.top = Math.max(0, e.clientY - fr.top - zug.dy) + 'px'; pfeile(); return;
    }
    const [k, cat] = zug.von.split('|'), A = anker(k, cat); if (!A) return; const a = { x: A.r, y: (A.t + A.b) / 2 };
    let t = F.querySelector('.ab-zug'); if (!t) { F.querySelector('.ab-svg').insertAdjacentHTML('beforeend', '<path class="ab-zug" marker-end="url(#abP)"/>'); t = F.querySelector('.ab-zug'); }
    t.setAttribute('d', `M${a.x},${a.y} L${e.clientX - fr.left},${e.clientY - fr.top}`);
  });
  document.addEventListener('pointerup', async (e) => {
    if (!zug || !an()) { zug = null; return; }
    const z = zug; zug = null;
    if (z.art === 'zeile') {
      if (!z.zieht) { if (z.strg) { if (mark.has(z.uid)) mark.delete(z.uid); else mark.add(z.uid); z.el.classList.toggle('mark', mark.has(z.uid)); } else if (mark.size) { mark.clear(); SICHT().querySelectorAll('.ab-z.mark').forEach((x) => x.classList.remove('mark')); } return; }
      const box = (document.elementFromPoint(e.clientX, e.clientY) || document.body).closest('[data-abk]'), ziel = box && box.dataset.abk;
      const F = SICHT().querySelector('.ab-flaeche'); (F.querySelector('.ab-geist') || { remove() {} }).remove();
      SICHT().querySelectorAll('.zieht,.ab-ziel').forEach((x) => x.classList.remove('zieht', 'ab-ziel'));
      if (!ziel || ziel === z.k) return;
      let n = 0; act(() => { n = umziehenOhneAct(z.uids, ziel); }); mark.clear();
      const zn = (teileListe().find((x) => x.k === ziel) || {}).n || ziel;
      if (n) toast(`${n > 1 ? n + ' Leistungen gehören' : '„' + ((P.tasks.find((x) => x.uid === z.uid) || {}).name || '') + '“ gehört'} jetzt zu „${zn}“ – Rückgängig oben links.`);
      return;
    }
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
      if (q && s && (await pruefeLink(von, vonCat, nach, nachCat))) act(() => { s.preds.push({ uid: q.uid, type: 'FS', lag: 0 }); });
      return;
    }
    if (!(await pruefeLink(von, vonCat, nach, nachCat))) return;
    act(() => { AB().links.push(l); ablaufNachfuehren(); });
  });
  /* Unlogische Verknüpfungen (Wunsch 18.11.2026): ein Kreis wird abgelehnt; läuft der Pfeil gegen die übliche Reihenfolge des Katalogs
     (z. B. „Hydraulischer Abgleich“ vor „Fußbodenheizung“), fragt die Seite nach. */
  const endenVon = (k, cat) => (cat ? P.tasks.filter((t) => t.teil === k && (t.cat === cat || '#' + t.uid === cat)) : P.tasks.filter((t) => (t.cat === '_teil' || t.cat === '_teilph') && t.teil === k));
  function vorher(ziel, von) {   // liegt eine der Zeilen „ziel“ (auch über Gruppen) schon vor einer der Zeilen „von“?
    const byU = new Map(P.tasks.map((t) => [t.uid, t])), Z = new Set(ziel.map((t) => t.uid)), offen = [...von], seen = new Set();
    const inTeil = (t) => (t.cat === '_teil' ? P.tasks.filter((x) => x.teil === t.teil && x !== t) : []);
    while (offen.length) { const t = offen.pop(); if (!t || seen.has(t.uid)) continue; seen.add(t.uid); if (Z.has(t.uid) && !von.includes(t)) return true;
      (t.preds || []).forEach((p) => offen.push(byU.get(p.uid))); inTeil(t).forEach((x) => offen.push(x)); }
    return false;
  }
  function katalogVor(a, b) {   // kommt Leistung a im Katalog (über die Vorgänger) vor Leistung b?
    const K = PK(); if (!K || !a || !b) return false; const A = K.baseOf(a), Bb = K.baseOf(b), seen = new Set(), offen = [Bb];
    while (offen.length) { const x = offen.pop(); if (seen.has(x)) continue; seen.add(x); const it = K.B(x); for (const v of (it && it.a) || []) { const y = K.baseOf(v); if (y === A) return true; offen.push(y); } }
    return false;
  }
  async function pruefeLink(von, vonCat, nach, nachCat) {
    const Q = endenVon(von, vonCat), Z = endenVon(nach, nachCat), nm = (k, c) => { const t = c && P.tasks.find((x) => x.teil === k && (x.cat === c || '#' + x.uid === c)); return t ? t.name : ((teileListe().find((x) => x.k === k) || {}).n || k); };
    if (Z.length && Q.length && vorher(Z, Q)) { toast(`Geht nicht: „${nm(nach, nachCat)}“ liegt schon vor „${nm(von, vonCat)}“ – das ergäbe einen Kreis.`, true); return false; }
    if (vonCat && nachCat && !vonCat.startsWith('#') && !nachCat.startsWith('#') && katalogVor(nachCat, vonCat)) {
      const msg = `Unüblich: „${nm(nach, nachCat)}“ kommt normalerweise vor „${nm(von, vonCat)}“. Trotzdem so verknüpfen?`;
      return window.bpFrage ? !!(await bpFrage(msg, { ok: 'Trotzdem verknüpfen' })) : false;
    }
    return true;
  }
  document.addEventListener('click', async (e) => {
    if (!an()) return;
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
  if (typeof r0 === 'function') window.render = function () { const v = SICHT(); if (v && !v.hidden) { zeichne(); if (typeof updateRibbon === 'function') updateRibbon(); return; } return r0.apply(this, arguments); };   // Leiste nachführen (Gruppieren markiert)
  window.ablaufZeichnen = zeichne;

  /* Drucken / PDF (18.11.2026): die Seite „Ablauf“ als eine Seite – Kisten wie am Bildschirm (offene mit allen Leistungen), Pfeile mit Art;
     „Drucken“ der Befehlsleiste führt hierher, solange die Seite offen ist (print.js printDialog → window.ablaufDruck). */
  function druckSvg(fmt) {
    const v = SICHT(), F = v.querySelector('.ab-flaeche'); v.classList.add('ab-druck');
    const fr = F.getBoundingClientRect(), R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - fr.left, t: r.top - fr.top, r: r.right - fr.left, b: r.bottom - fr.top }; };
    const K = [...v.querySelectorAll('.ab-k')].map((k) => ({ gem: k.classList.contains('gem'), R: R(k), kopf: R(k.querySelector('.ab-kk')), titel: k.querySelector('.ab-kk b').textContent, sub: k.querySelector('.ab-kk small').textContent,
      Z: [...k.querySelectorAll('.ab-z')].map((z) => ({ R: R(z), f: (z.querySelector('.ab-zf') || {}).style ? z.querySelector('.ab-zf').style.background : '', n: z.querySelector('.ab-zn').textContent, d: (z.querySelector('small') || {}).textContent || '' })) }));
    const kurz = { FS: 'EA', SS: 'AA', FF: 'EE', SF: 'AE' };
    const P2 = pfeilListe().map((l) => { const A = anker(l.von, l.vonCat), B = anker(l.nach, l.nachCat); if (!A || !B) return null; const [a, b] = seiten(A, B), dd = Math.max(40, Math.hypot(b.x - a.x, b.y - a.y) / 3);
      return { d: `M${a.x},${a.y} C${a.x + a.nx * dd},${a.y + a.ny * dd} ${b.x + b.nx * dd},${b.y + b.ny * dd} ${b.x},${b.y}`, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: `${kurz[l.type] || 'EA'}${+l.lag ? (l.lag > 0 ? ' +' : ' ') + l.lag + ' AT' : ''}`, g: !!l.gantt }; }).filter(Boolean);
    v.classList.remove('ab-druck'); pfeile();
    const x0 = Math.min(...K.map((k) => k.R.l)) - 20, y0 = Math.min(...K.map((k) => k.R.t)) - 20, W = Math.max(...K.map((k) => k.R.r)) + 20 - x0, H = Math.max(...K.map((k) => k.R.b)) + 20 - y0;
    const [pw, ph] = { A4: [297, 210], A3: [420, 297], A2: [594, 420] }[fmt] || [420, 297], m = 10, kopf = 12, s = Math.min((pw - 2 * m) / W, (ph - 2 * m - kopf - 6) / H);
    const t = (x) => esc(String(x)), proj = (P._bt && P._bt.name) || P.name || '', stamp = new Date().toLocaleDateString('de-DE');
    let g = `<defs><marker id="abD" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#3b5a8f"/></marker></defs>
      <rect width="${pw}" height="${ph}" fill="#fff"/><text x="${m}" y="${m + 6}" font-size="6" font-weight="700" fill="#1e1e1e">Ablauf der Gebäudeteile${proj ? ' – ' + t(proj) : ''}</text>
      <text x="${pw - m}" y="${m + 6}" font-size="3.2" fill="#555" text-anchor="end">gedruckt ${t(stamp)} · ${t(P.name || '')}</text>
      <g transform="translate(${m},${m + kopf}) scale(${s}) translate(${-x0},${-y0})">`;
    for (const k of K) {
      g += `<rect x="${k.R.l}" y="${k.R.t}" width="${k.R.r - k.R.l}" height="${k.R.b - k.R.t}" rx="6" fill="#fff" stroke="#9a9a9a"/><rect x="${k.R.l}" y="${k.R.t}" width="${k.R.r - k.R.l}" height="${k.kopf.b - k.kopf.t}" rx="6" fill="${k.gem ? '#ece4f6' : '#eef1f6'}"/>
        <text x="${k.R.l + 10}" y="${k.R.t + 17}" font-size="13" font-weight="700" fill="#1e1e1e">${t(k.titel)}</text><text x="${k.R.l + 10}" y="${k.R.t + 32}" font-size="9.5" fill="#555">${t(k.sub)}</text>`;
      for (const z of k.Z) g += `<line x1="${k.R.l}" x2="${k.R.r}" y1="${z.R.b}" y2="${z.R.b}" stroke="#e3e5e8"/>${z.f ? `<rect x="${z.R.l + 6}" y="${z.R.t + 4}" width="5" height="${z.R.b - z.R.t - 8}" rx="1.5" fill="${esc(z.f)}"/>` : ''}<text x="${z.R.l + 16}" y="${(z.R.t + z.R.b) / 2 + 3.5}" font-size="10" fill="#1e1e1e">${t(z.n.length > 46 ? z.n.slice(0, 45) + '…' : z.n)}</text><text x="${z.R.r - 10}" y="${(z.R.t + z.R.b) / 2 + 3.5}" font-size="9" fill="#555" text-anchor="end">${t(z.d)}</text>`;
    }
    for (const a of P2) g += `<path d="${a.d}" fill="none" stroke="#3b5a8f" stroke-width="1.6"${a.g ? ' stroke-dasharray="5 3"' : ''} marker-end="url(#abD)"/><text x="${a.x}" y="${a.y - 5}" font-size="10" fill="#3b5a8f" stroke="#fff" stroke-width="3" paint-order="stroke" text-anchor="middle">${t(a.t)}</text>`;
    return { pages: [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pw} ${ph}" width="${pw}mm" height="${ph}mm" font-family="Segoe UI, system-ui, Arial, sans-serif">${g}</g></svg>`], pw, ph, o: { title: proj } };
  }
  window.ablaufPruefeLink = (...a) => pruefeLink(...a);
  window.ablaufDruck = () => {
    if (!an() || !hatTeile()) return false;
    let fmt = 'A3'; try { fmt = localStorage.getItem('gantt.ablauf.druck') || 'A3'; } catch { /* ohne Speicher */ }
    const html = `<div class="mh">Ablauf der Gebäudeteile drucken</div><div class="mb"><div class="ab-pop"><label>Papier <select data-abfmt>${['A4', 'A3', 'A2'].map((f) => `<option${f === fmt ? ' selected' : ''}>${f}</option>`).join('')}</select> quer</label>
      <p class="mute" style="margin:.4rem 0 0">Eine Seite, so wie die Kisten liegen – offene Kisten mit allen Leistungen. Gestrichelt = Verknüpfung aus dem Gantt.</p></div></div>
      <div class="mf"><button type="button" class="btn" data-m="zu">Schließen</button><span class="pd-luft"></span><button type="button" class="btn" data-m="pdf">PDF</button><button type="button" class="btn primary" data-m="druck">Drucken</button></div>`;
    modalBox(html, (wahl, box, zu) => {
      if (wahl === 'zu') return zu();
      const f = box.querySelector('[data-abfmt]').value; try { localStorage.setItem('gantt.ablauf.druck', f); } catch { /* ohne Speicher */ }
      zu(); const L = druckSvg(f);
      if (wahl === 'pdf') doPdf(L, null); else doPrint(L);
    });
    return true;
  };
})();
