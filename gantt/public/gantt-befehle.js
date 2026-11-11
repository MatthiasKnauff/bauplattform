'use strict';
/* Bauzeitenplan – Befehle: Leistungen einfügen/verschieben/verknüpfen, automatisch verknüpfen, Dialoge, Gewerke, Kontextmenü.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: gantt-kern.js, gantt-diagramm.js, gantt-befehle.js, gantt-ereignisse.js, gantt-start.js). */
/* =====================================================================
   Befehle
   ===================================================================== */
function insertTask(kind = 'task') {
  let at, lvl;
  if (cur.r < vis.length) { at = vis[cur.r]; lvl = P.tasks[at].lvl; }
  else { at = P.tasks.length; const last = vis.length ? P.tasks[vis[vis.length - 1]] : null; lvl = last ? last.lvl : 0; }
  let uid;
  act(() => {
    const t = newTask(kind === 'ms' ? 'Meilenstein' : 'Neue Leistung', kind === 'ms' ? 0 : 1);
    t.lvl = lvl; P.tasks.splice(at, 0, t); uid = t.uid; sel = new Set([uid]);
    if (autoLink) autoLinkInserted(at);
  });
  flashLinkMsg();
  const i = idxOfUid(uid); cur.r = rowOfIdx(i); cur.c = 'name'; anchorR = cur.r;
  updateSel(); ensureVisible(cur.r); startEdit(cur.r, 'name');
}
function insertSummary() {
  const ix = selIdx(); if (!ix.length) return;
  const a = ix[0], b = Math.max(...ix.map(blockEnd));
  const lvl = Math.min(...P.tasks.slice(a, b + 1).map((t) => t.lvl));
  let uid;
  act(() => {
    for (let k = a; k <= b; k++) P.tasks[k].lvl++;
    const t = newTask('Neue Leistungsgruppe', 1); t.lvl = lvl;
    P.tasks.splice(a, 0, t); uid = t.uid; sel = new Set([uid]);
  });
  cur.r = rowOfIdx(idxOfUid(uid)); cur.c = 'name'; anchorR = cur.r; updateSel(); startEdit(cur.r, 'name');
}
/* ---------- Automatisch verknüpfen ---------- */
let autoLink = null;
const isSum = (k) => k + 1 < P.tasks.length && P.tasks[k + 1].lvl > P.tasks[k].lvl;
let linkMsg = '';
// Beim Löschen: Nachfolger der gelöschten Leistungen an deren Vorgänger hängen (Kette überbrücken)
function bridgeDeleted(D) {
  const T = P.tasks, delU = new Set([...D].map((i) => T[i].uid));
  const byU = new Map(T.map((t, k) => [t.uid, k]));
  const ownPreds = (k) => { let r = [...T[k].preds]; if (isSum(k)) for (let j = k + 1; j <= blockEnd(k); j++) r = r.concat(T[j].preds); return r; };
  const ext = (uid, seen = new Set()) => {
    if (seen.has(uid)) return []; seen.add(uid);
    const k = byU.get(uid); if (k == null) return [];
    const out = [];
    for (const p of ownPreds(k)) {
      if (delU.has(p.uid)) { for (const e of ext(p.uid, seen)) out.push({ uid: e.uid, fs: e.fs && p.type === 'FS', lag: e.lag + p.lag }); }
      else out.push({ uid: p.uid, fs: p.type === 'FS', lag: p.lag });
    }
    return out;
  };
  const reaches = (startK, targetUid) => {          // ist target schon (indirekt) Vorgänger von start?
    const stack = [...T[startK].preds.map((p) => p.uid)], seen = new Set();
    while (stack.length) {
      const u = stack.pop(); if (u === targetUid) return true; if (seen.has(u) || delU.has(u)) continue; seen.add(u);
      const k = byU.get(u); if (k != null) stack.push(...T[k].preds.map((p) => p.uid));
    }
    return false;
  };
  let n = 0;
  T.forEach((s, k) => {
    if (D.has(k) || !s.preds.some((p) => delU.has(p.uid))) return;
    const add = [];
    for (const p of s.preds) if (delU.has(p.uid)) for (const e of ext(p.uid)) add.push(e.fs && p.type === 'FS' ? { uid: e.uid, type: 'FS', lag: e.lag + p.lag } : { uid: e.uid, type: p.type, lag: p.lag });
    s.preds = s.preds.filter((p) => !delU.has(p.uid));
    for (const a of add) {
      const ak = byU.get(a.uid);
      if (s.preds.some((x) => x.uid === a.uid) || isAncestor(ak, k) || isAncestor(k, ak) || reaches(k, a.uid)) continue;
      s.preds.push(a); n++;
    }
  });
  if (n) linkMsg = `${n} ${n === 1 ? 'Verknüpfung' : 'Verknüpfungen'} überbrückt`;
}
// Beim Einfügen: neuen Vorgang sinnvoll in die Kette setzen
function autoLinkInserted(n) {
  const T = P.tasks, N = T[n]; if (isSum(n)) return;
  let a = -1, b = -1;
  for (let k = n - 1; k >= 0; k--) { if (T[k].lvl < N.lvl) break; if (T[k].lvl === N.lvl) { a = k; break; } }
  if (n + 1 < T.length && T[n + 1].lvl === N.lvl) b = n + 1;
  const A = a >= 0 ? T[a] : null, B = b >= 0 ? T[b] : null, nm = (t) => `„${t.name}“`;
  const ab = A && B ? B.preds.findIndex((p) => p.uid === A.uid) : -1;
  if (ab >= 0) {                                     // A → B wird zu A → Neu → B
    const old = B.preds[ab];
    N.preds = [{ uid: A.uid, type: old.type, lag: 0 }];
    B.preds[ab] = { uid: N.uid, type: 'FS', lag: old.lag };
    linkMsg = `In Kette eingefügt: ${nm(A)} → neu → ${nm(B)}`;
  } else if (A) {                                    // hinter den Vorgang darüber
    N.preds = [{ uid: A.uid, type: 'FS', lag: 0 }];
    linkMsg = `Verknüpft: ${nm(A)} → neu`;
  } else if (B && !isSum(b) && B.preds.length) {     // erster Vorgang einer Gruppe: übernimmt die Vorgänger
    N.preds = B.preds.map((p) => ({ ...p }));
    B.preds = [{ uid: N.uid, type: 'FS', lag: 0 }];
    linkMsg = `Vor ${nm(B)} in die Kette eingefügt`;
  }
}
function flashLinkMsg() { if (linkMsg) { toast(linkMsg + '  (Strg+Z macht es rückgängig)'); linkMsg = ''; } }

// Hauptleistung für eine zu löschende Leistung: Katalog-Zuordnung, sonst gleiches Gewerk in derselben Gruppe, sonst Vorgänger in der Gruppe
function mergeTargetFor(k, del) {
  const T = P.tasks, t = T[k], isLeaf = (j) => !(j + 1 < T.length && T[j + 1].lvl > T[j].lvl) && T[j].dur > 0 && !del.has(j);
  const base = String(t.cat || '').split('~')[0], it = base && window.CATALOG ? CATALOG.items.find((x) => x.id === base) : null;
  if (it && it.m) { const j = T.findIndex((x, q) => x.cat === it.m && (x.blk ?? -1) === (t.blk ?? -1) && isLeaf(q)); if (j >= 0) return j; }
  let p = k - 1; while (p >= 0 && T[p].lvl >= t.lvl) p--;   // Elterngruppe
  const from = p + 1, to = p >= 0 ? blockEnd(p) : T.length - 1;
  if (t.gw) { let best = -1; for (let j = from; j <= to; j++) if (j !== k && isLeaf(j) && T[j].gw === t.gw && T[j].lvl === t.lvl && (best < 0 || Math.abs(j - k) < Math.abs(best - k))) best = j; if (best >= 0) return best; }
  for (const pr of t.preds || []) { const j = idxOfUid(pr.uid); if (j >= from && j <= to && isLeaf(j)) return j; }
  return -1;
}
function deleteSel(mode) {
  const ix = selIdx(); if (!ix.length) return;
  const del = new Set(); ix.forEach((i) => { for (let k = i; k <= blockEnd(i); k++) del.add(k); });
  const firstRow = rowOfIdx(ix[0]);
  // Rückfrage: Gesamtzeit verkürzen oder Dauer auf Hauptleistungen umlegen
  const cand = [...del].filter((k) => !(k + 1 < P.tasks.length && P.tasks[k + 1].lvl > P.tasks[k].lvl) && P.tasks[k].dur > 0).map((k) => ({ k, to: mergeTargetFor(k, del) })).filter((x) => x.to >= 0);
  if (!mode && cand.length && LS.get('delAsk', true)) {
    const leafOpts = (sel0) => '<option value="">– entfällt –</option>' + P.tasks.map((x, j) => (del.has(j) || (j + 1 < P.tasks.length && P.tasks[j + 1].lvl > x.lvl) || !(x.dur > 0)) ? '' : `<option value="${x.uid}"${j === sel0 ? ' selected' : ''}>${j + 1} – ${esc(x.name)}</option>`).join('');
    const tot = cand.reduce((a, c) => a + P.tasks[c.k].dur, 0);
    const bg = modal('Leistungen löschen', `<div style="margin-bottom:8px">${del.size === 1 ? 'Die Leistung wird' : del.size + ' Leistungen werden'} gelöscht – zusammen <b>${fmtDur(tot)}</b> Arbeit. Soll sich die Gesamtzeit verkürzen oder wird die Dauer auf die Hauptleistung umgelegt?</div>
      <table class="ptab"><thead><tr><th>Gelöschte Leistung</th><th style="width:80px">Dauer</th><th>Dauer umlegen auf</th></tr></thead><tbody>${cand.map((c) => `<tr><td>${esc(P.tasks[c.k].name)}</td><td>${fmtDur(P.tasks[c.k].dur)}</td><td><select data-mk="${P.tasks[c.k].uid}">${leafOpts(c.to)}</select></td></tr>`).join('')}</tbody></table>
      <label class="cb" style="margin-top:8px"><input type="checkbox" id="delAskOff"> nicht mehr fragen (immer verkürzen) – wieder einschalten im Reiter „Leistung“ → „Beim Löschen fragen“</label>`,
      [{ label: 'Gesamtzeit verkürzen', fn: (b2) => { if (b2.querySelector('#delAskOff').checked) LS.set('delAsk', false); setTimeout(() => deleteSel('cut'), 0); } },
        { label: 'Dauer umlegen', cls: 'primary', primary: true, fn: (b2) => { const m = {}; b2.querySelectorAll('[data-mk]').forEach((s2) => { if (s2.value) m[s2.dataset.mk] = +s2.value; }); setTimeout(() => deleteSel(m), 0); } },
        { label: 'Abbrechen', left: true }]);
    bg.querySelector('.modal').style.width = 'min(700px,94vw)';
    return;
  }
  const merge = mode && typeof mode === 'object' ? mode : null;
  linkMsg = '';
  act(() => {
    if (merge) for (const [from, to] of Object.entries(merge)) {
      const f = P.tasks.find((x) => x.uid === +from), tt = P.tasks.find((x) => x.uid === to); if (!f || !tt) continue;
      if (segList(tt)) tt.segs[tt.segs.length - 1].d += f.dur; tt.dur += f.dur;
    }
    if (autoLink) bridgeDeleted(del); P.tasks = P.tasks.filter((t, k) => !del.has(k)); sel.clear();
  });
  flashLinkMsg();
  cur.r = Math.max(0, Math.min(firstRow, vis.length)); if (cur.r < vis.length) { sel = new Set([P.tasks[vis[cur.r]].uid]); }
  updateSel();
}
function indent(dir) {
  const ix = selIdx(); if (!ix.length) return;
  act(() => {
    const T = P.tasks, uids = ix.map((i) => T[i].uid);
    const selSet = new Set(ix);
    for (const uid of uids) {
      const i = idxOfUid(uid);
      // nur oberste markierte Ebene bewegen (Kinder wandern mit)
      let skip = false; for (let a = i - 1; a >= 0; a--) if (T[a].lvl < T[i].lvl && selSet.has(a) && isAncestor(a, i)) { skip = true; break; }
      if (skip) continue;
      const e = blockEnd(i);
      if (dir > 0) { if (i === 0 || T[i].lvl > T[i - 1].lvl) continue; for (let k = i; k <= e; k++) T[k].lvl++; }
      else { if (T[i].lvl === 0) continue; for (let k = i; k <= e; k++) T[k].lvl--; }
    }
  });
}
function moveSel(dir) {
  const ix = selIdx(); if (!ix.length) return;
  const i = ix[0], T = P.tasks, lvl = T[i].lvl, e = blockEnd(i), uid = T[i].uid;
  sel = new Set([uid]);
  const n0 = undoS.length;
  act(() => {
    if (dir < 0) {
      let j = -1; for (let k = i - 1; k >= 0; k--) { if (T[k].lvl < lvl) break; if (T[k].lvl === lvl) { j = k; break; } }
      if (j < 0) return;
      const block = T.splice(i, e - i + 1); T.splice(j, 0, ...block);
    } else {
      const n = e + 1; if (n >= T.length || T[n].lvl !== lvl) return;
      const e2 = blockEnd(n); const block = T.splice(i, e - i + 1); T.splice(e2 - (e - i), 0, ...block);
    }
  });
  const ni = idxOfUid(uid);
  if (ni >= 0) { cur.r = rowOfIdx(ni); anchorR = cur.r; } updateSel();
  if (undoS.length > n0) afterMove(uid);
}
/* ---------- Nach dem Verschieben: Vorgänger neu wählen ---------- */
let relink = null, lastRelink = null;   // { uid, orig, above, below, choice, succ }
function closeRelink() { const el = document.getElementById('relinkPop'); if (el) el.remove(); if (relink) lastRelink = { uid: relink.uid, orig: relink.orig, at: Date.now() }; relink = null; }
function afterMove(uid) {
  const i = idxOfUid(uid); if (i < 0 || isSum(i) || P.tasks[i].dur == null) { closeRelink(); return; }
  const t = P.tasks[i], r = rowOfIdx(i);
  const orig = relink && relink.uid === uid ? relink.orig : lastRelink && lastRelink.uid === uid && Date.now() - lastRelink.at < 60000 ? lastRelink.orig : t.preds.map((p) => ({ ...p }));
  if (relink && relink.uid !== uid) closeRelink();
  const near = (dir) => { const out = []; for (let k = r + dir; k >= 0 && k < vis.length && out.length < 4; k += dir) { const j = vis[k]; if (!CAL.summ[j] && j !== i) out.push(P.tasks[j].uid); } return out; };
  const above = near(-1), below = near(1);
  relink = { uid, orig, above, below, choice: autoLink && above.length ? above[0] : 'orig', succ: false, base: new Map(P.tasks.map((x) => [x.uid, x.preds.map((p) => ({ ...p }))])) };
  applyRelink(true);
  showRelink();
}
function applyRelink(merge) {
  const R = relink; if (!R) return false;
  const i = idxOfUid(R.uid); if (i < 0) return false;
  const n0 = undoS.length;
  const ok = act(() => {
    // Ausgangslage direkt nach dem Verschieben wiederherstellen, dann Auswahl anwenden
    for (const t of P.tasks) if (R.base.has(t.uid)) t.preds = R.base.get(t.uid).map((p) => ({ ...p }));
    const t = P.tasks[idxOfUid(R.uid)], byU = new Map(P.tasks.map((x) => [x.uid, x]));
    const dependsOn = (x, m, seen = new Set()) => { if (x === m) return true; if (seen.has(x)) return false; seen.add(x); const o = byU.get(x); return !!o && o.preds.some((p) => dependsOn(p.uid, m, seen)); };
    let newPreds;
    if (R.choice === 'orig') newPreds = R.orig.map((p) => ({ ...p }));
    else if (R.choice === 'none') newPreds = [];
    else newPreds = [{ uid: R.choice, type: 'FS', lag: 0 }];
    // Steht die Leistung jetzt hinter einem ihrer Nachfolger: diese Abhängigkeit überbrücken (sonst Zirkelbezug)
    R.bridged = [];
    for (const np of newPreds) {
      if (!dependsOn(np.uid, t.uid)) continue;
      for (const o of P.tasks) {
        if (o === t || !o.preds.some((p) => p.uid === t.uid)) continue;
        if (o.uid === np.uid || dependsOn(np.uid, o.uid)) {
          o.preds = o.preds.filter((p) => p.uid !== t.uid);
          for (const op of R.orig) if (op.uid !== o.uid && !o.preds.some((p) => p.uid === op.uid) && !dependsOn(op.uid, o.uid)) o.preds.push({ ...op });
          R.bridged.push(o.name);
        }
      }
    }
    t.preds = newPreds;
    // Leistung darunter auf diese warten lassen (in die Kette einfügen)
    const B = R.below.length ? byU.get(R.below[0]) : null;
    if (R.succ && B) {
      if (typeof R.choice === 'number') B.preds = B.preds.filter((p) => p.uid !== R.choice);
      if (!B.preds.some((p) => p.uid === t.uid)) B.preds.push({ uid: t.uid, type: 'FS', lag: 0 });
    }
  });
  if (merge && ok && undoS.length === n0 + 1) undoS.pop();   // ein Rückgängig-Schritt für Verschieben + Verknüpfen
  return ok;
}
function showRelink() {
  const R = relink; document.getElementById('relinkPop')?.remove();
  if (!R) return;
  const i = idxOfUid(R.uid), r = rowOfIdx(i); if (r < 0) return;
  const row = gridBody.querySelector(`.row[data-r="${r}"]`); if (!row) return;
  const nm = (u) => { const k = idxOfUid(u); return k < 0 ? '?' : `${k + 1} – ${esc(P.tasks[k].name)}`; };
  const origTxt = R.orig.length ? R.orig.map((p) => { const k = idxOfUid(p.uid); return k < 0 ? '' : P.tasks[k].name; }).filter(Boolean).join(', ') : 'keine';
  const opt = (v, l) => `<option value="${v}"${String(R.choice) === String(v) ? ' selected' : ''}>${l}</option>`;
  const B = R.below.length ? P.tasks[idxOfUid(R.below[0])] : null;
  const el = document.createElement('div'); el.id = 'relinkPop'; el.className = 'relink';
  el.innerHTML = `<div class="rl-h">Vorgänger von „${esc(P.tasks[i].name)}“<button class="rl-x" title="Schließen (Esc)">×</button></div>
    <select class="rl-sel">
      ${R.above.length ? `<optgroup label="Darüber">${R.above.map((u, k) => opt(u, nm(u) + (k === 0 ? '  (direkt darüber)' : ''))).join('')}</optgroup>` : ''}
      ${R.below.length ? `<optgroup label="Darunter">${R.below.map((u) => opt(u, nm(u))).join('')}</optgroup>` : ''}
      <optgroup label="Sonst">${opt('orig', 'bisherige behalten: ' + esc(origTxt))}${opt('none', 'kein Vorgänger – frei planen')}</optgroup>
    </select>
    ${B ? `<label class="cb rl-cb"><input type="checkbox"${R.succ ? ' checked' : ''}> „${esc(B.name)}“ (darunter) wartet auf diese Leistung</label>` : ''}
    ${R.bridged && R.bridged.length ? `<div class="rl-note">Damit kein Zirkelbezug entsteht, wartet „${esc(R.bridged.join('“, „'))}“ nicht mehr auf diese Leistung, sondern auf deren bisherige Vorgänger.</div>` : ''}
    <div class="rl-f"><span>Strg+Z nimmt Verschieben und Verknüpfen zurück</span><button class="btn sm primary rl-ok">OK</button></div>`;
  document.body.appendChild(el);
  const rb = row.getBoundingClientRect(), gx = gridPane.getBoundingClientRect();
  const left = Math.min(gx.left + colW.nr + colW.ind + 30, innerWidth - el.offsetWidth - 8);
  let top = rb.bottom + 4; if (top + el.offsetHeight > innerHeight - 30) top = rb.top - el.offsetHeight - 4;
  el.style.left = Math.max(4, left) + 'px'; el.style.top = Math.max(4, top) + 'px';
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  el.querySelector('.rl-sel').addEventListener('change', (e) => {
    const v = e.target.value, prev = R.choice;
    R.choice = v === 'orig' || v === 'none' ? v : +v;
    if (!applyRelink(false)) { R.choice = prev; }
    showRelink();
  });
  const cb = el.querySelector('.rl-cb input');
  if (cb) cb.addEventListener('change', () => { R.succ = cb.checked; if (!applyRelink(false)) R.succ = !cb.checked; showRelink(); });
  el.querySelector('.rl-ok').onclick = closeRelink; el.querySelector('.rl-x').onclick = closeRelink;
}
document.addEventListener('mousedown', (e) => { if (relink && !e.target.closest('#relinkPop')) closeRelink(); });
gridPane.addEventListener('scroll', () => { if (relink) closeRelink(); });

/* Überflüssige Verknüpfungen: A → C entfällt, wenn C über einen anderen Weg (nur Ende-Anfang, Abstand ≥ 0) ohnehin auf A wartet.
   Die berechneten Termine ändern sich dadurch nicht. */
function tidyLinks() {
  const T = P.tasks, byU = new Map(T.map((t, i) => [t.uid, i])), leaf = (i) => !isSum(i);
  const plain = (p) => (p.type || 'FS') === 'FS' && (p.lag || 0) >= 0 && p.ps == null && p.ss == null;
  const reach = (from, target, skipEdge, seen = new Set()) => {   // wartet „from“ (rückwärts über Vorgänger) auf „target“?
    const t = T[byU.get(from)]; if (!t) return false;
    for (const p of t.preds) {
      if (skipEdge && from === skipEdge[1] && p.uid === skipEdge[0]) continue;
      if (!plain(p)) continue;
      const pi = byU.get(p.uid); if (pi == null || !leaf(pi)) continue;
      if (p.uid === target) return true;
      if (seen.has(p.uid)) continue; seen.add(p.uid);
      if (reach(p.uid, target, null, seen)) return true;
    }
    return false;
  };
  let n = 0;
  const ok = act(() => {
    for (let i = 0; i < T.length; i++) {
      if (!leaf(i)) continue;
      const t = T[i];
      for (const p of [...t.preds]) {
        const pi = byU.get(p.uid);
        if (pi == null || !leaf(pi) || !plain(p) || p.lag) continue;
        if (reach(t.uid, p.uid, [p.uid, t.uid])) { t.preds = t.preds.filter((x) => x !== p); n++; }
      }
    }
  });
  if (ok) toast(n ? `${n} überflüssige Verknüpfungen entfernt – die Termine bleiben gleich (Strg+Z macht es rückgängig).` : 'Keine überflüssigen Verknüpfungen gefunden.');
}
function linkSel() {
  const ix = selIdx(); if (ix.length < 2) { toast('Markiere mindestens zwei Leistungen (Strg- oder Umschalt-Klick).'); return; }
  act(() => {
    for (let k = 1; k < ix.length; k++) {
      const p = P.tasks[ix[k - 1]], s = P.tasks[ix[k]];
      if (isAncestor(ix[k - 1], ix[k]) || isAncestor(ix[k], ix[k - 1])) continue;
      if (!s.preds.some((x) => x.uid === p.uid)) s.preds.push({ uid: p.uid, type: 'FS', lag: 0 });
    }
  });
}
function unlinkSel() {
  const ix = selIdx(); if (!ix.length) return;
  const uids = new Set(ix.map((i) => P.tasks[i].uid));
  act(() => {
    if (uids.size === 1) { const u = [...uids][0]; for (const t of P.tasks) { if (t.uid === u) t.preds = []; else t.preds = t.preds.filter((p) => p.uid !== u); } }
    else for (const t of P.tasks) if (uids.has(t.uid)) t.preds = t.preds.filter((p) => !uids.has(p.uid));
  });
}
function setPct(v) { const ix = selIdx().filter((i) => !CAL.summ[i]); const all = new Set(); selIdx().forEach((i) => { for (let k = i; k <= blockEnd(i); k++) if (!CAL.summ[k]) all.add(k); }); if (!all.size) return; act(() => { all.forEach((i) => { P.tasks[i].pct = v; }); }); void ix; }
function setZoom(z, centerDay) {
  z = Math.max(0, Math.min(ZOOMS.length - 1, z)); if (z === zoom && centerDay == null) return;
  const oldPpd = ZOOMS[zoom].ppd;
  const c = centerDay != null ? centerDay : view.start + (chartPane.scrollLeft + chartPane.clientWidth / 2) / oldPpd;
  zoom = z; LS.set('zoom', z); render();
  chartPane.scrollLeft = X(c) - chartPane.clientWidth / 2;
}
function scrollToDay(d, frac = 0.15) { chartPane.scrollLeft = Math.max(0, X(d) - chartPane.clientWidth * frac); }
function scrollToTask() { const ix = selIdx(); if (ix.length) scrollToDay(CAL.sd[ix[0]], 0.05); }
function fitProject() {
  const T = P.tasks; if (!T.length) return;
  let mn = Infinity, mx = -Infinity; T.forEach((t, i) => { mn = Math.min(mn, CAL.sd[i]); mx = Math.max(mx, CAL.fd[i] + 1); });
  const span = mx - mn, w = chartPane.clientWidth - 80;
  let z = 0; for (let k = ZOOMS.length - 1; k >= 0; k--) if (span * ZOOMS[k].ppd <= w) { z = k; break; }
  zoom = z; LS.set('zoom', z); render(); chartPane.scrollLeft = Math.max(0, X(mn) - 30);
}
function setCollapsedAll(v) { P.tasks.forEach((t, i) => { if (CAL.summ[i]) t.collapsed = v; }); render(); queueSave(); }

/* ---------- Dialoge ---------- */
// Dialog an der Titelleiste verschieben; Position je Dialog merken, Doppelklick = wieder mittig
const dlgPos = {};
function makeDraggable(box, handle, key) {
  if (!box || !handle) return;
  handle.classList.add('drag-h'); handle.title = 'Zum Verschieben ziehen · Doppelklick: wieder mittig';
  const place = (x, y) => {
    const r = box.getBoundingClientRect();
    x = Math.max(-r.width + 120, Math.min(innerWidth - 120, x)); y = Math.max(0, Math.min(innerHeight - 40, y));
    Object.assign(box.style, { position: 'fixed', left: x + 'px', top: y + 'px', margin: '0' }); dlgPos[key] = { x, y };
  };
  if (dlgPos[key]) requestAnimationFrame(() => place(dlgPos[key].x, dlgPos[key].y));
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('button,input,select')) return;
    e.preventDefault();
    const r = box.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    document.body.classList.add('dragging-dlg');
    const mv = (ev) => place(ev.clientX - dx, ev.clientY - dy);
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); document.body.classList.remove('dragging-dlg'); };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  });
  handle.addEventListener('dblclick', (e) => { if (e.target.closest('button')) return; delete dlgPos[key]; Object.assign(box.style, { position: '', left: '', top: '', margin: '' }); });
}
function modal(title, body, buttons) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-label="${esc(title)}"><div class="mh">${esc(title)}<button class="mx" title="Schließen">×</button></div><div class="mb">${body}</div><div class="mf"></div></div>`;
  const close = () => { bg.remove(); gridBody.focus({ preventScroll: true }); };
  const mf = bg.querySelector('.mf');
  const run = (b) => { if (b.fn && b.fn(bg) === false) return; close(); };
  buttons.forEach((b) => {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = b.label; el.className = 'btn ' + (b.cls || '');
    if (b.left) el.style.marginRight = 'auto';
    el.onclick = () => run(b); mf.appendChild(el);
  });
  bg.querySelector('.mx').onclick = close;
  bg.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const p = buttons.find((b) => b.primary); if (p) { e.preventDefault(); run(p); } }
    // ← → (in Eingabefeldern Alt+← →) bzw. Bild↑/Bild↓: vorige / nächste Leistung, wenn der Dialog solche Knöpfe hat
    const feld = e.target.closest && e.target.closest('input,textarea,select');
    const vor = e.key === 'PageUp' || (e.key === 'ArrowLeft' && (!feld || e.altKey)), nach = e.key === 'PageDown' || (e.key === 'ArrowRight' && (!feld || e.altKey));
    if (vor || nach) { const b = buttons.find((x) => (vor ? /^◀/ : /▶$/).test(x.label || '')); if (b) { e.preventDefault(); if (feld) feld.dispatchEvent(new Event('change', { bubbles: true })); run(b); } }
  });

  document.body.appendChild(bg);
  makeDraggable(bg.querySelector('.modal'), bg.querySelector('.mh'), 'dlgPos:' + title);
  setTimeout(() => { const f = bg.querySelector('input:not([disabled]),select,textarea'); if (f) { f.focus(); if (f.select) f.select(); } }, 0);
  return bg;
}

function taskDialog(i) {
  const t = P.tasks[i], isS = CAL.summ[i];
  let preds = t.preds.map((p) => ({ ...p }));
  const opts = (u) => '<option value="">– auswählen –</option>' + P.tasks.map((x, j) => (j === i || isAncestor(j, i) || isAncestor(i, j)) ? '' : `<option value="${x.uid}"${x.uid === u ? ' selected' : ''}>${j + 1} – ${esc(x.name)}</option>`).join('');
  const predRows = () => preds.map((p, k) => `<tr data-k="${k}"><td><select class="pu">${opts(p.uid)}</select></td>
      <td><select class="pt">${['FS', 'SS', 'FF', 'SF'].map((ty) => `<option value="${ty}"${ty === p.type ? ' selected' : ''}>${TNAME[ty]}</option>`).join('')}</select></td>
      <td><input class="pl" value="${p.lag ? (p.lag > 0 ? '+' : '-') + Math.abs(p.lag) + 't' : '0t'}"></td>
      <td style="width:30px;text-align:center"><button type="button" class="btn sm prm" data-k="${k}" title="Entfernen">✕</button></td></tr>`).join('')
    || '<tr><td colspan="4" style="color:var(--mut);padding:6px">Keine Vorgänger</td></tr>';
  const body = `<div class="form">
      <label>Bezeichnung</label><div class="full combo-wrap"><input id="fName" value="${esc(t.name)}"></div>
      <label>Dauer</label><input id="fDur" value="${fmtDur(CAL.dur[i])}" ${isS ? 'disabled' : ''}>
      <label>% Abgeschlossen</label><input id="fPct" type="number" min="0" max="100" value="${Math.round(CAL.pct[i])}" ${isS ? 'disabled' : ''}>
      <label>Anfang nicht früher als</label><input id="fCons" type="date" value="${t.cons != null ? isoD(t.cons) : ''}">
      <label>Berechnet</label><div class="ro">${fmtD(CAL.sd[i])} – ${fmtD(CAL.fd[i])}</div>
      <label>Gewerk</label><input id="fGw" list="gwList" value="${esc(t.gw || '')}" placeholder="${esc(guessGw(t) ? 'Vorschlag: ' + guessGw(t) : 'z. B. Elektro')}">
      <label>Balkenfarbe</label><div class="ro colrow"><select id="fColM"><option value="">vom Gewerk</option><option value="own"${t.color ? ' selected' : ''}>eigene Farbe</option></select><input type="color" id="fCol" value="${t.color || effColor(t) || '#8db3e2'}"><span id="fGwC"></span></div>
      <label>Unternehmer</label><div class="full combo-wrap"><input id="fRes" value="${esc(t.res || '')}" placeholder="z. B. Firma Müller; Elektro Schmidt"></div>
      ${!isS && window.AiPlace && AiPlace.enabled() ? '<div id="tdSg" style="grid-column:1 / span 4"></div>' : ''}
      <label>Gesamtpuffer</label><div class="ro">${isS ? '–' : fmtDur(CAL.slack[i])}${CAL.crit[i] ? ' · <b style="color:var(--critbd)">kritisch</b>' : ''}</div><span></span><span></span>
    </div>
    ${!isS && t.dur > 1 ? `<div class="sec">Abschnitte (Unterbrechungen)</div><div id="segBox"></div>` : ''}
    <div class="sec">Vorgänger</div>
    <table class="ptab"><thead><tr><th>Leistung</th><th>Art</th><th style="width:80px">Zeitabstand</th><th></th></tr></thead><tbody id="pBody">${predRows()}</tbody></table>
    <button type="button" class="btn sm" id="pAdd" style="margin-top:6px">+ Vorgänger hinzufügen</button>
    <div class="sec">Notizen</div>
    <div class="form"><textarea id="fNotes" class="full" style="grid-column:1 / span 4">${esc(t.notes || '')}</textarea></div>
    <div class="hint">Leeres Feld „Anfang nicht früher als“ = so früh wie möglich planen.</div>`;
  const readPreds = (bg) => {
    preds = [...bg.querySelectorAll('#pBody tr[data-k]')].map((tr) => ({ uid: tr.querySelector('.pu').value === '' ? null : +tr.querySelector('.pu').value, type: tr.querySelector('.pt').value, lagS: tr.querySelector('.pl').value }))
      .map((p) => ({ uid: p.uid, type: p.type, lag: parseLag(p.lagS) ?? 0, bad: parseLag(p.lagS) == null }));
  };
  const apply = (bg) => {
    readPreds(bg);
    if (preds.some((p) => p.bad)) { toast('Ungültiger Zeitabstand. Beispiele: +2t, -1t, 1w', true); return false; }
    const v = (id) => bg.querySelector(id).value;
    return act(() => {
      t.name = v('#fName').trim(); nameHistAdd(t.name);
      if (!isS) {
        const d = parseDur(v('#fDur')); if (d == null) throw new UErr('Ungültige Dauer.'); t.dur = d;
        t.pct = Math.max(0, Math.min(100, Math.round(+v('#fPct') || 0)));
      }
      const cs = v('#fCons'); t.cons = cs ? snapWork(parseDate(cs)) : null;
      t.res = v('#fRes').trim(); t.notes = v('#fNotes');
      const gw = v('#fGw').trim(); if (gw !== (t.gw || '')) applyField(i, 'gw', gw);
      t.color = v('#fColM') === 'own' ? v('#fCol') : '';
      const seen = new Set(), old = new Map(t.preds.map((p) => [p.uid, p]));
      t.preds = preds.filter((p) => p.uid != null && !seen.has(p.uid) && seen.add(p.uid)).map(({ uid, type, lag }) => { const l = { uid, type, lag }, o = old.get(uid); if (o && o.ps != null) l.ps = o.ps; if (o && o.ss != null) l.ss = o.ss; return l; });
      for (const su of sucUids) { const x = P.tasks.find((y) => y.uid === su); if (x && !x.preds.some((p) => p.uid === t.uid)) x.preds.push({ uid: t.uid, type: 'FS', lag: 0 }); }
      if (segBox && segsEd) { if (segsEd.length > 1) { t.segs = segsEd.map((x) => ({ ...x })); t.dur = segsEd.reduce((a, x) => a + x.d, 0); } else if (segList(t)) { t.dur = segsEd[0].d; t.segs = null; } }
    }) ? undefined : false;
  };
  updateGwList();
  // Vor/Zurück: Änderungen übernehmen und zur benachbarten Leistung springen
  const nav = (dir) => (bgx) => {
    const r = rowOfIdx(i), nr = r + dir; if (nr < 0 || nr >= vis.length) { toast(dir < 0 ? 'Das ist die erste Leistung.' : 'Das ist die letzte Leistung.'); return false; }
    if (apply(bgx) === false) return false;
    const ni = vis[nr]; sel = new Set([P.tasks[ni].uid]); cur.r = nr; updateSel(); ensureVisible(nr);
    setTimeout(() => taskDialog(ni), 0);
  };
  const bg = modal('Leistungsinformationen', body, [
    { label: '◀ Vorherige', cls: 'sm td-nav', fn: nav(-1) }, { label: 'Nächste ▶', cls: 'sm td-nav', fn: nav(1) },
    { label: '↶ Rückgängig', cls: 'sm td-undo', left: true, fn: () => { undoLocal(); return false; } },
    { label: 'OK', cls: 'primary', primary: true, fn: apply }, { label: 'Abbrechen' }]);
  // Navigation und Rückgängig in die Titelleiste – dort springen sie nicht mit der Fensterhöhe
  { const mh = bg.querySelector('.mh'), mx = mh.querySelector('.mx'), grp = document.createElement('span'); grp.className = 'mh-tools';
    bg.querySelectorAll('.mf .td-nav, .mf .td-undo').forEach((b) => { b.style.marginRight = ''; grp.appendChild(b); });
    mh.insertBefore(grp, mx);
    grp.addEventListener('mousedown', (e) => e.stopPropagation()); }   // kein Verschieben beim Klick auf die Knöpfe
  bg.querySelectorAll('.td-nav')[0].title = 'Änderungen übernehmen und zur vorherigen Leistung (Alt+↑)';
  bg.querySelectorAll('.td-nav')[1].title = 'Änderungen übernehmen und zur nächsten Leistung (Alt+↓)';
  bg.querySelector('.td-undo').title = 'Letzte Änderung in diesem Fenster zurücknehmen (Strg+Z)';
  bg.querySelector('.modal').style.width = '640px';
  const showC = () => {
    const own = bg.querySelector('#fColM').value === 'own', g = bg.querySelector('#fGw').value.trim();
    bg.querySelector('#fCol').style.display = own ? '' : 'none';
    bg.querySelector('#fGwC').innerHTML = own ? '' : g ? `<span class="gwdot" style="background:${P.gwColors?.[g] || GW_DEFAULT[g] || '#ccc'}"></span>${P.gwColors?.[g] ? '' : '(wird vergeben)'}` : '<span style="color:var(--mut)">Standard</span>';
  };
  bg.querySelector('#fGw').addEventListener('input', showC); bg.querySelector('#fColM').addEventListener('change', showC); showC();
  attachCombo(bg.querySelector('#fName'), () => nameGroups(t.name), null);
  attachCombo(bg.querySelector('#fRes'), () => resGroups(bg.querySelector('#fGw').value.trim(), bg.querySelector('#fRes').value), null);   // nur die Bezeichnung – das Gewerk bleibt offen
  // Vorschlag: Gewerk, Dauer, Vorgänger und Nachfolger aus dem Plan – Eigene | Eingebaut | KI
  let sucUids = [];
  const sgBox = bg.querySelector('#tdSg');
  if (sgBox) {
    const st = SugBar.state(null), uidOf = (id) => +String(id).slice(1);
    const nm = (u) => { const x = P.tasks.find((y) => y.uid === u); return x ? esc(x.name) : '?'; };
    const draw = () => {
      const r = st.cur !== 'own' && st.res[st.cur];
      sgBox.innerHTML = SugBar.html(st, 'td-sg') + (r && (r.a.length || r.b.length) ? `<div class="td-sgi">${r.a.length ? `<span class="tip-pre">◀ Vorgänger:</span> ${r.a.map((x) => nm(uidOf(x))).join(', ')}` : ''}${r.b.length ? `${r.a.length ? ' · ' : ''}<span class="tip-suc">Nachfolger ▶</span> ${r.b.map((x) => nm(uidOf(x))).join(', ')} <small>(wird bei OK verknüpft)</small>` : ''}</div>` : '');
      bg.querySelector('#pBody').innerHTML = predRows(); showC();
    };
    const o = {
      text: () => bg.querySelector('#fName').value,
      snap: () => { readPreds(bg); return { gw: bg.querySelector('#fGw').value, dur: bg.querySelector('#fDur').value, preds: preds.map((p) => ({ uid: p.uid, type: p.type, lag: p.lag })) }; },
      fetch: (kind, force) => AiPlace.suggestInPlan(i, bg.querySelector('#fName').value, kind, force),
      apply: (r) => {
        const own = st.own || {};
        if (!r) { bg.querySelector('#fGw').value = own.gw || ''; if (own.dur != null) bg.querySelector('#fDur').value = own.dur; preds = (own.preds || []).map((p) => ({ ...p })); sucUids = []; return; }
        if (r.gw) bg.querySelector('#fGw').value = r.gw;
        if (r.d && !segsEd) bg.querySelector('#fDur').value = fmtDur(r.d);
        const add = r.a.map(uidOf).filter((u) => u !== t.uid && !(own.preds || []).some((p) => p.uid === u));
        preds = [...(own.preds || []).map((p) => ({ ...p })), ...add.map((u) => ({ uid: u, type: 'FS', lag: 0 }))];
        sucUids = r.b.map(uidOf).filter((u) => u !== t.uid);
      },
      redraw: () => { draw(); ldRecord(); },
    };
    st.text = (t.name || '').trim();
    draw();
    sgBox.addEventListener('click', (e) => SugBar.click(e, st, o));
  }
  // Lokales Rückgängig: Zustand der Felder und Vorgänger nach jeder Änderung merken
  const ldSnap = () => {
    const vals = {}; bg.querySelectorAll('.mb input[id], .mb select[id], .mb textarea[id]').forEach((el) => { vals[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
    readPreds(bg); return JSON.stringify({ vals, preds: preds.map(({ uid, type, lag }) => ({ uid, type, lag })), suc: sucUids });
  };
  let ldLast = null; const ldStack = [];
  const ldUpd = () => { const b = bg.querySelector('.td-undo'); if (b) b.disabled = !ldStack.length; };
  const ldRecord = () => setTimeout(() => { if (!bg.isConnected) return; const sNow = ldSnap(); if (sNow !== ldLast) { if (ldLast) ldStack.push(ldLast); ldLast = sNow; ldUpd(); } }, 0);
  function undoLocal() {
    if (!ldStack.length) return;
    const st0 = JSON.parse(ldStack.pop()); ldLast = JSON.stringify(st0);
    for (const [id, v] of Object.entries(st0.vals)) { const el = bg.querySelector('#' + id); if (el) { if (el.type === 'checkbox') el.checked = v; else el.value = v; } }
    preds = st0.preds.map((p) => ({ ...p })); sucUids = st0.suc.slice();
    bg.querySelector('#pBody').innerHTML = predRows(); showC(); ldUpd();
  }
  setTimeout(() => { ldLast = ldSnap(); ldUpd(); }, 0);   // Ausgangszustand
  bg.addEventListener('change', ldRecord); bg.addEventListener('click', (e) => { if (!e.target.closest('.mf')) ldRecord(); });
  bg.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(e.target.matches('input,textarea') && e.target.value !== (JSON.parse(ldLast || '{"vals":{}}').vals[e.target.id] ?? e.target.value))) { e.preventDefault(); undoLocal(); }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); const r = nav(e.key === 'ArrowUp' ? -1 : 1)(bg); if (r !== false) bg.remove(); }
  });
  // Abschnitte bearbeiten
  const segBox = bg.querySelector('#segBox');
  let segsEd = null;
  if (segBox) {
    segsEd = segList(t) ? t.segs.map((x) => ({ ...x })) : null;
    const segHtml = () => {
      if (!segsEd) return '<div class="hint" style="margin:0">Nicht unterbrochen. <button type="button" class="btn sm" id="segAdd">Unterbrechung einfügen</button> teilt die Leistung in der Mitte mit 5 Tagen Pause – oder im Diagramm per Rechtsklick auf den Balken bzw. mit „Unterbrechen“.</div>';
      return `<table class="ptab"><thead><tr><th>Abschnitt</th><th style="width:110px">Pause davor</th><th style="width:110px">Dauer</th><th>Termine (berechnet)</th><th></th></tr></thead><tbody>${segsEd.map((x, k) => `<tr>
        <td>Abschnitt ${k + 1}</td><td>${k ? `<input data-sg="gap" data-k="${k}" type="number" min="0" value="${x.gap}">` : '–'}</td>
        <td><input data-sg="d" data-k="${k}" type="number" min="1" value="${x.d}"></td>
        <td style="color:var(--mut)">${CAL.segS[i] && CAL.segS[i][k] != null && segList(t) && t.segs.length === segsEd.length ? fmtD(fromW(CAL.segS[i][k])) + ' – ' + fmtD(fromW(CAL.segE[i][k] - 1)) : ''}</td>
        <td style="width:30px;text-align:center">${k ? `<button type="button" class="btn sm" data-sgdel="${k}" title="Pause entfernen (mit vorherigem Abschnitt zusammenführen)">✕</button>` : ''}</td></tr>`).join('')}</tbody></table>
        <button type="button" class="btn sm" id="segAdd" style="margin-top:6px">+ weitere Unterbrechung</button> <span class="hint">Dauer der Leistung = Summe der Abschnitte (${segsEd.reduce((a, x) => a + x.d, 0)} Tage). Pause 0 führt Abschnitte zusammen.</span>`;
    };
    const draw = () => {
      segBox.innerHTML = segHtml();
      const fd = bg.querySelector('#fDur'); if (fd) { fd.disabled = !!segsEd; if (segsEd) fd.value = fmtDur(segsEd.reduce((a, x) => a + x.d, 0)); }
      segBox.querySelectorAll('input[data-sg]').forEach((inp) => inp.addEventListener('change', () => { const x = segsEd[+inp.dataset.k]; x[inp.dataset.sg] = Math.max(inp.dataset.sg === 'd' ? 1 : 0, Math.round(+inp.value || 0)); if (inp.dataset.sg === 'gap' && x.gap === 0) { segsEd[+inp.dataset.k - 1].d += x.d; segsEd.splice(+inp.dataset.k, 1); if (segsEd.length < 2) segsEd = [segsEd[0]]; } draw(); }));
      segBox.querySelectorAll('[data-sgdel]').forEach((b) => { b.onclick = () => { const k = +b.dataset.sgdel; segsEd[k - 1].d += segsEd[k].d; segsEd.splice(k, 1); draw(); }; });
      const add = segBox.querySelector('#segAdd');
      if (add) add.onclick = () => {
        if (!segsEd) { const d = parseDur(bg.querySelector('#fDur').value) || t.dur; if (d < 2) { toast('Für eine Unterbrechung braucht die Leistung mindestens 2 Tage.', true); return; } segsEd = [{ d: Math.ceil(d / 2), gap: 0 }, { d: Math.floor(d / 2), gap: 5 }]; }
        else { const L = segsEd[segsEd.length - 1]; if (L.d < 2) { toast('Der letzte Abschnitt ist zu kurz zum Teilen.', true); return; } const h = Math.floor(L.d / 2); L.d -= h; segsEd.push({ d: h, gap: 5 }); }
        draw();
      };
    };
    draw();
  }
  const wire = () => {
    bg.querySelectorAll('.prm').forEach((b) => { b.onclick = () => { readPreds(bg); preds.splice(+b.dataset.k, 1); bg.querySelector('#pBody').innerHTML = predRows(); wire(); }; });
  };
  bg.querySelector('#pAdd').onclick = () => { readPreds(bg); preds.push({ uid: null, type: 'FS', lag: 0 }); bg.querySelector('#pBody').innerHTML = predRows(); wire(); };
  wire();
}

function multiDialog(ix) {
  const T = P.tasks, ts = ix.map((i) => T[i]), leaves = ix.filter((i) => !CAL.summ[i]);
  const same = (f) => { const v = ts.map(f); return v.every((x) => x === v[0]) ? v[0] : undefined; };
  const sameL = (f) => { const v = leaves.map((i) => f(T[i], i)); return v.length && v.every((x) => x === v[0]) ? v[0] : undefined; };
  const val = (x) => (x === undefined ? '' : esc(x));
  const ph = (x) => (x === undefined ? ' placeholder="(unterschiedlich)"' : '');
  const gw = same((t) => t.gw || ''), res = same((t) => t.res || ''), col = same((t) => t.color || '');
  const dur = sameL((t) => t.dur), pct = sameL((t) => t.pct || 0), cons = same((t) => t.cons ?? null);
  const namen = ts.map((t) => t.name || '(ohne Namen)');
  const seg = (f, opts) => `<div class="md-seg" role="radiogroup" data-seg="${f}">${opts.map(([v, l], k) => `<button type="button" role="radio" data-v="${v}" aria-checked="${k ? 'false' : 'true'}"${k ? '' : ' class="on"'}>${l}</button>`).join('')}</div><input type="hidden" data-f="${f}" value="keep">`;
  const zeile = (f, label, feld, hilfe) => `<div class="md-z" data-z="${f}"><label>${label}</label><div class="md-f">${feld}${hilfe ? `<small>${hilfe}</small>` : ''}</div><button type="button" class="md-rs" data-rs="${f}" title="Zurück auf unverändert" aria-label="${label} zurücksetzen">↺</button></div>`;
  const consTxt = cons === undefined ? 'unterschiedlich' : cons == null ? 'keiner' : fmtD(cons);
  const body = `<div class="md-kopf"><b>${ix.length} Leistungen</b> markiert – geändert wird nur, was du anfasst.
      <details><summary>welche?</summary><ol>${namen.map((n) => `<li>${esc(n)}</li>`).join('')}</ol></details>
      ${leaves.length < ix.length ? `<small>Davon ${ix.length - leaves.length} Leistungsgruppen: Dauer und % gelten nur für Teilleistungen, ein Gewerk geht an alle Teilleistungen.</small>` : ''}</div>
    <div class="md">
      <h4>Zuordnung</h4>
      ${zeile('gw', 'Gewerk', `<input data-f="gw" list="gwList" value="${val(gw)}"${ph(gw)}>`)}
      ${zeile('res', 'Unternehmer', `<input data-f="res" value="${val(res)}"${res === undefined ? ' placeholder="(unterschiedlich)"' : res === '' ? ' placeholder="(bei allen leer)"' : ''}>`)}
      ${zeile('colm', 'Balkenfarbe', `<div class="md-row">${seg('colm', [['keep', 'unverändert'], ['gw', 'vom Gewerk'], ['own', 'eigene']])}<input type="color" data-f="col" value="${col || '#8db3e2'}" aria-label="eigene Farbe"></div>`)}
      <h4>Termine</h4>
      ${zeile('dur', 'Dauer', `<div class="md-row"><input data-f="dur" class="md-k" value="${dur === undefined ? '' : fmtDur(dur)}"${dur === undefined ? ' placeholder="(unterschiedlich)"' : ''}${leaves.length ? '' : ' disabled'}><span>z. B. 5t, 2w</span></div>`)}
      ${zeile('pct', '% Abgeschlossen', `<div class="md-row"><input data-f="pct" class="md-k" type="number" min="0" max="100" value="${pct === undefined ? '' : Math.round(pct)}"${pct === undefined ? ' placeholder="(unterschiedlich)"' : ''}${leaves.length ? '' : ' disabled'}><span>%</span></div>`)}
      ${zeile('consm', 'Anfang nicht früher als', `<div class="md-row">${seg('consm', [['keep', 'unverändert'], ['clear', 'so früh wie möglich'], ['set', 'ab Datum …']])}<input type="date" data-f="cons" value="${cons != null && cons !== undefined ? isoD(cons) : ''}" aria-label="Datum"></div>`, `bisher: ${consTxt}`)}
      <h4>Weiteres</h4>
      ${zeile('notesm', 'Notizen', `${seg('notesm', [['keep', 'unverändert'], ['append', 'anhängen …'], ['replace', 'ersetzen …'], ['clear', 'leeren']])}<textarea data-f="notes" rows="3" placeholder="Text …"></textarea>`)}
    </div>`;
  updateGwList();
  const dirty = new Set();
  const bg = modal('Mehrere Leistungen bearbeiten', body, [{ label: 'Übernehmen', cls: 'primary', primary: true, fn: (bg) => {
    const g = (f) => bg.querySelector(`[data-f="${f}"]`).value;
    let durV = null, pctV = null, consV;
    if (dirty.has('dur')) { durV = parseDur(g('dur')); if (durV == null) { toast('Ungültige Dauer.', true); return false; } }
    if (dirty.has('pct')) { pctV = Math.max(0, Math.min(100, Math.round(+g('pct') || 0))); }
    if (g('consm') === 'set') { consV = parseDate(g('cons')); if (consV == null) { toast('Bitte ein Datum wählen.', true); return false; } }
    const n = dirty.size + (g('colm') !== 'keep') + (g('consm') !== 'keep') + (g('notesm') !== 'keep');
    if (!n) return;
    const ok = act(() => {
      ix.forEach((i) => {
        const t = T[i], leaf = !CAL.summ[i];
        if (dirty.has('gw')) applyField(i, 'gw', g('gw'));
        if (dirty.has('res')) t.res = g('res').trim();
        if (leaf && durV != null) t.dur = durV;
        if (leaf && pctV != null) t.pct = pctV;
        if (g('colm') === 'gw') t.color = ''; else if (g('colm') === 'own') t.color = g('col');
        if (g('consm') === 'clear') t.cons = null; else if (g('consm') === 'set') t.cons = snapWork(consV);
        const nm = g('notesm'), tx = g('notes');
        if (nm === 'clear') t.notes = ''; else if (nm === 'replace') t.notes = tx; else if (nm === 'append' && tx.trim()) t.notes = (t.notes ? t.notes + '\n' : '') + tx;
      });
    });
    if (!ok) return false;
    toast(`${ix.length} Leistungen geändert.`);
  } }, { label: 'Abbrechen' }]);
  const M = bg.querySelector('.modal'); M.classList.add('md-modal');
  const ok = M.querySelector('.mf .btn.primary');
  const anfang = {}; bg.querySelectorAll('input[data-f],textarea[data-f]').forEach((el) => { anfang[el.dataset.f] = el.value; });
  const g = (f) => bg.querySelector(`[data-f="${f}"]`);
  const sync = () => {
    const segs = ['colm', 'consm', 'notesm'];
    g('col').hidden = g('colm').value !== 'own';
    g('cons').hidden = g('consm').value !== 'set';
    g('notes').hidden = !['append', 'replace'].includes(g('notesm').value);
    bg.querySelectorAll('[data-seg]').forEach((w) => w.querySelectorAll('button').forEach((b) => { const on = b.dataset.v === g(w.dataset.seg).value; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }));
    const geaendert = new Set([...dirty, ...segs.filter((f) => g(f).value !== 'keep')]);
    bg.querySelectorAll('.md-z').forEach((z) => z.classList.toggle('ch', geaendert.has(z.dataset.z)));
    ok.textContent = geaendert.size ? `Übernehmen (${geaendert.size} ${geaendert.size === 1 ? 'Änderung' : 'Änderungen'})` : 'Übernehmen';
    ok.disabled = !geaendert.size;
  };
  bg.querySelectorAll('input[data-f],textarea[data-f]').forEach((el) => el.addEventListener('input', () => {
    if (['gw', 'res', 'dur', 'pct'].includes(el.dataset.f)) { if (el.value === anfang[el.dataset.f]) dirty.delete(el.dataset.f); else dirty.add(el.dataset.f); }
    sync();
  }));
  bg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg] button');
    if (b) { const f = b.closest('[data-seg]').dataset.seg; g(f).value = b.dataset.v; sync(); const z = { colm: 'col', consm: 'cons', notesm: 'notes' }[f]; if (!g(z).hidden) g(z).focus(); return; }
    const r = e.target.closest('[data-rs]');
    if (r) { const f = r.dataset.rs; if (['colm', 'consm', 'notesm'].includes(f)) g(f).value = 'keep'; else { g(f).value = anfang[f]; dirty.delete(f); } sync(); }
  });
  bg.addEventListener('change', sync); sync();
}
function infoForSelection() { const ix = selIdx(); if (ix.length > 1) multiDialog(ix); else if (ix.length) taskDialog(ix[0]); }

function linkDialog(si, k) {
  const s = P.tasks[si], p = s.preds[k], pi = CAL.idx.get(p.uid), pt = P.tasks[pi];
  const body = `<div class="form">
      <label>Von</label><div class="ro full">${pi + 1} – ${esc(pt.name)}</div>
      <label>Nach</label><div class="ro full">${si + 1} – ${esc(s.name)}</div>
      <label>Art</label><select id="lType" class="full">${['FS', 'SS', 'FF', 'SF'].map((ty) => `<option value="${ty}"${ty === p.type ? ' selected' : ''}>${TNAME[ty]}</option>`).join('')}</select>
      <label>Zeitabstand</label><input id="lLag" class="full" value="${p.lag ? (p.lag > 0 ? '+' : '-') + Math.abs(p.lag) + 't' : '0t'}">
      ${segList(pt) ? `<label>Von Abschnitt</label><select id="lPs" class="full"><option value="">ganze Leistung (Standard)</option>${pt.segs.map((x, k) => `<option value="${k}"${p.ps === k ? ' selected' : ''}>Abschnitt ${k + 1} (${fmtShort(fromW(CAL.segS[pi][k]))} – ${fmtShort(fromW(CAL.segE[pi][k] - 1))})</option>`).join('')}</select>` : ''}
      ${segList(s) ? `<label>An Abschnitt</label><select id="lSs" class="full"><option value="">Standard (Anfang bzw. Ende der Leistung)</option>${s.segs.map((x, k) => `<option value="${k}"${p.ss === k ? ' selected' : ''}>Abschnitt ${k + 1} (${fmtShort(fromW(CAL.segS[si][k]))} – ${fmtShort(fromW(CAL.segE[si][k] - 1))})</option>`).join('')}</select>` : ''}
    </div>`;
  modal('Anordnungsbeziehung', body, [
    { label: 'Löschen', cls: 'danger', left: true, fn: () => { act(() => { s.preds.splice(k, 1); }); } },
    { label: 'OK', cls: 'primary', primary: true, fn: (bg) => {
      const lag = parseLag(bg.querySelector('#lLag').value);
      if (lag == null) { toast('Ungültiger Zeitabstand. Beispiele: +2t, -1t, 1w', true); return false; }
      const ps = bg.querySelector('#lPs'), ss = bg.querySelector('#lSs');
      return act(() => { const l = { uid: p.uid, type: bg.querySelector('#lType').value, lag }; const pv = ps ? ps.value : p.ps ?? '', sv = ss ? ss.value : p.ss ?? ''; if (pv !== '' && pv != null) l.ps = +pv; if (sv !== '' && sv != null) l.ss = +sv; s.preds[k] = l; }) ? undefined : false;
    } },
    { label: 'Abbrechen' },
  ]);
}

function projectDialog(teil = 'info') {   // 'info': Name, Anfang, Ende · 'kalender': Arbeitswoche, Feiertage, freie Tage
  const cal = { week: 5, state: 'DE', free: [], ...(P.cal || {}) };
  let free = (cal.free || []).map((f) => ({ ...f }));
  const freeRows = () => free.map((f, k) => `<tr><td><input type="date" data-fr="from" data-k="${k}" value="${esc(f.from || '')}"></td><td><input type="date" data-fr="to" data-k="${k}" value="${esc(f.to || f.from || '')}"></td>
      <td><input data-fr="name" data-k="${k}" value="${esc(f.name || '')}" placeholder="z. B. Betriebsferien"></td><td style="text-align:center"><input type="checkbox" data-fr="yearly" data-k="${k}"${f.yearly ? ' checked' : ''} title="jedes Jahr"></td>
      <td style="width:30px;text-align:center"><button type="button" class="btn sm" data-frdel="${k}" title="Entfernen">✕</button></td></tr>`).join('')
    || '<tr><td colspan="5" style="color:var(--mut);padding:6px">Keine eigenen freien Tage</td></tr>';
  const body = `<div class="form"${teil === 'kalender' ? ' style="display:none"' : ''}>
      <label>Projektname</label><input id="pName" class="full" value="${esc(P.name)}" data-bp-projekt autocomplete="off">
      <label>Projektanfang</label><input id="pStart" type="date" class="full" value="${isoD(P.start)}">
      <label>Projektende</label><div class="ro full">${fmtD(CAL.peDay)} (berechnet)</div>
      <label>Kalender</label><div class="ro full">${esc((WEEKS.find(([v]) => v === +cal.week) || [0, ''])[1])} · ${esc((STATES.find(([v]) => v === (cal.state ?? 'DE')) || [0, ''])[1])} · ${(cal.free || []).length} eigene freie Zeiträume <button type="button" class="btn sm" id="pZurKal" style="margin-left:6px">Arbeitszeit &amp; Feiertage …</button></div>
    </div>
    <div${teil === 'kalender' ? '' : ' style="display:none"'}>
    <div class="sec" style="margin-top:0">Arbeitszeit und Feiertage</div>
    <div class="form">
      <label>Arbeitswoche</label><select id="pWeek" class="full">${WEEKS.map(([v, l]) => `<option value="${v}"${+cal.week === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <label>Feiertage</label><select id="pState" class="full">${STATES.map(([v, l]) => `<option value="${v}"${(cal.state ?? 'DE') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <div class="sec">Eigene freie Tage</div>
    <table class="ptab"><thead><tr><th style="width:130px">Von</th><th style="width:130px">Bis</th><th>Bezeichnung</th><th style="width:48px" title="jedes Jahr wiederholen">jährl.</th><th></th></tr></thead><tbody id="frBody">${freeRows()}</tbody></table>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
      <button type="button" class="btn sm" id="frAdd">+ freie Tage</button>
      <button type="button" class="btn sm" data-q="xmas">+ Weihnachtsferien 24.12.–01.01. (jährlich)</button>
      <button type="button" class="btn sm" data-q="eve">+ Heiligabend und Silvester (jährlich)</button>
    </div>
    <div class="sec">Freie Tage im Projektzeitraum</div><div id="frPrev" class="frprev"></div>
    </div>`;
  const read = (bg) => {
    bg.querySelectorAll('[data-fr]').forEach((el) => { const f = free[+el.dataset.k]; if (!f) return; f[el.dataset.fr] = el.type === 'checkbox' ? el.checked : el.value; });
    return { week: +bg.querySelector('#pWeek').value, state: bg.querySelector('#pState').value, free: free.filter((f) => f.from) };
  };
  const bg = modal(teil === 'kalender' ? 'Arbeitszeit & Feiertage' : 'Projektinformationen', body, [{ label: 'OK', cls: 'primary', primary: true, fn: (bg) => {
    const nm = bg.querySelector('#pName').value.trim() || P.name, d = parseDate(bg.querySelector('#pStart').value), c = read(bg);
    const end0 = CAL.peDay;
    const ok = act(() => { P.name = nm; P.cal = c; buildCal(c); if (d != null) P.start = snapWork(d); });
    if (ok && CAL.peDay !== end0) toast(`Projektende jetzt ${fmtD(CAL.peDay)} (vorher ${fmtD(end0)}).`);
    refreshProjectList();
  } }, { label: 'Abbrechen', fn: () => { buildCal(P.cal); } }]);
  bg.querySelector('.modal').style.width = teil === 'kalender' ? 'min(860px, 96vw)' : '520px';
  if (teil === 'kalender') bg.querySelector('.modal').style.height = 'min(780px, 94vh)';   // gleich groß – nicht erst an der Ecke aufziehen
  const prev = () => {
    const c = read(bg), a = P.start, z = Math.max(CAL.peDay, P.start + 60);
    const m = freeMap({ state: c.state, free: c.free }, ud(a).getUTCFullYear(), ud(z).getUTCFullYear());
    const rows = [...m.entries()].filter(([d]) => d >= a && d <= z && (c.week === 7 || (c.week === 6 ? wdOf(d) !== 0 : wdOf(d) !== 0 && wdOf(d) !== 6))).sort((x, y) => x[0] - y[0]);
    bg.querySelector('#frPrev').innerHTML = rows.length ? `<div class="hint" style="margin:0 0 4px">${rows.length} zusätzliche arbeitsfreie Tage zwischen ${fmtD(a)} und ${fmtD(z)}:</div>` + rows.map(([d, n]) => `<span class="frday"><b>${fmtD(d)}</b> ${esc(n)}</span>`).join('') : '<div class="hint" style="margin:0">Keine Feiertage oder freien Tage im Projektzeitraum.</div>';
  };
  const redraw = () => { bg.querySelector('#frBody').innerHTML = freeRows(); prev(); };
  bg.addEventListener('change', (e) => { if (e.target.closest('.modal')) { read(bg); prev(); } });
  bg.addEventListener('click', (e) => {
    if (e.target.id === 'pZurKal') { bg.querySelector('.mx').click(); setTimeout(() => projectDialog('kalender'), 0); return; }
    const del = e.target.closest('[data-frdel]'); if (del) { read(bg); free.splice(+del.dataset.frdel, 1); redraw(); return; }
    if (e.target.id === 'frAdd') { read(bg); const t = isoD(Math.max(todayN(), P.start)); free.push({ from: t, to: t, name: '', yearly: false }); redraw(); return; }
    const q = e.target.closest('[data-q]'); if (!q) return;
    read(bg); const y = ud(P.start).getUTCFullYear();
    if (q.dataset.q === 'xmas') free.push({ from: `${y}-12-24`, to: `${y + 1}-01-01`, name: 'Weihnachtsferien', yearly: true });
    else { free.push({ from: `${y}-12-24`, to: `${y}-12-24`, name: 'Heiligabend', yearly: true }); free.push({ from: `${y}-12-31`, to: `${y}-12-31`, name: 'Silvester', yearly: true }); }
    redraw();
  });
  prev();
}

/* ---------- Gewerke ---------- */
function gwAuto() {
  const props = [];
  P.tasks.forEach((t, i) => { if (!CAL.summ[i] && t.dur > 0 && !t.gw) { const g = guessGw(t); if (g) props.push([i, g]); } });
  const open = P.tasks.filter((t, i) => !CAL.summ[i] && t.dur > 0 && !t.gw).length - props.length;
  if (!props.length) { toast(open ? `Keine eindeutige Zuordnung gefunden – ${open} Leistungen bitte von Hand eintragen.` : 'Alle Leistungen haben bereits ein Gewerk.'); return; }
  const rows = props.map(([i, g]) => `<tr><td style="text-align:right;color:var(--mut)">${i + 1}</td><td>${esc(P.tasks[i].name)}</td><td><label class="cb"><input type="checkbox" data-i="${i}" checked><span class="gwdot" style="background:${P.gwColors[g] || GW_DEFAULT[g] || '#ccc'}"></span>${esc(g)}</label></td></tr>`).join('');
  modal('Gewerke automatisch zuordnen', `<div style="margin-bottom:8px">Für ${props.length} Leistungen ohne Gewerk wurde eine eindeutige Zuordnung gefunden (aus Leistung und Unternehmer). Bereits eingetragene Gewerke bleiben unverändert.${open > 0 ? ` <b>${open}</b> weitere Leistungen sind nicht eindeutig und bleiben leer.` : ''}</div>
    <div style="max-height:52vh;overflow:auto"><table class="ptab"><thead><tr><th>Nr.</th><th>Leistung</th><th>Gewerk</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  [{ label: 'Übernehmen', cls: 'primary', primary: true, fn: (bg) => {
    const ok = new Set([...bg.querySelectorAll('input[data-i]:checked')].map((x) => +x.dataset.i));
    act(() => { props.forEach(([i, g]) => { if (ok.has(i)) { P.tasks[i].gw = g; gwColor(g); } }); });
  } }, { label: 'Abbrechen' }]);
}
function gwDialog() {
  const list = allGw();
  const cnt = (g) => P.tasks.filter((t) => t.gw === g).length;
  const rows = list.map((g) => `<tr><td><input type="color" data-g="${esc(g)}" value="${gwColor(g)}" style="width:42px;height:24px;padding:0;border:1px solid var(--bd)"></td>
      <td><input data-r="${esc(g)}" value="${esc(g)}"></td><td style="text-align:right;color:var(--mut);white-space:nowrap">${cnt(g)} Leistungen</td></tr>`).join('')
    || '<tr><td colspan="3" style="padding:8px;color:var(--mut)">Noch keine Gewerke eingetragen. Spalte „Gewerk“ ausfüllen oder „Automatisch zuordnen“ verwenden.</td></tr>';
  modal('Gewerke & Farben', `<table class="ptab"><thead><tr><th style="width:56px">Farbe</th><th>Gewerk (umbenennen möglich)</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="hint">Die Farbe gilt für alle Leistungen des Gewerks – im Diagramm, in der Tabelle und beim Drucken.</div>`,
  [{ label: 'Automatisch zuordnen…', left: true, fn: () => { setTimeout(gwAuto, 0); } },
    { label: 'OK', cls: 'primary', primary: true, fn: (bg) => {
      act(() => {
        bg.querySelectorAll('input[data-g]').forEach((el) => { P.gwColors[el.dataset.g] = el.value; });
        bg.querySelectorAll('input[data-r]').forEach((el) => {
          const o = el.dataset.r, n = el.value.trim(); if (!n || n === o) return;
          P.tasks.forEach((t) => { if (t.gw === o) t.gw = n; });
          if (!P.gwColors[n]) P.gwColors[n] = P.gwColors[o]; delete P.gwColors[o];
        });
      });
    } }, { label: 'Abbrechen' }]);
}

// suggest: optionale Vorschlagsliste. autocomplete="off": sonst schlägt der Browser Einträge aus anderen
// Dialogen vor (z. B. Projektnamen = Bauvorhabenadressen beim Anlegen eines Gewerks).
function promptDialog(title, label, value, onOk, suggest) {
  const dl = suggest && suggest.length ? `<datalist id="pvList">${suggest.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>` : '';
  modal(title, `<div class="form"><label>${esc(label)}</label><input id="pv" class="full" value="${esc(value)}" autocomplete="off"${dl ? ' list="pvList"' : ''}${label === 'Projektname' ? ' data-bp-projekt' : ''}>${dl}</div>`,
    [{ label: 'OK', cls: 'primary', primary: true, fn: (bg) => { const v = bg.querySelector('#pv').value.trim(); if (!v) return false; onOk(v); } }, { label: 'Abbrechen' }]);
}
function confirmDialog(title, text, onOk, okLabel = 'Löschen') {
  modal(title, `<div style="max-width:420px;line-height:1.5">${text}</div>`, [{ label: okLabel, cls: 'primary', primary: true, fn: onOk }, { label: 'Abbrechen' }]);
}

/* ---------- Kontextmenü & Hinweise ---------- */
function ctxMenu(x, y, items) {
  document.querySelectorAll('.ctx').forEach((m) => m.remove());
  const m = document.createElement('div'); m.className = 'ctx';
  m.innerHTML = items.map((it, k) => (it === '-' ? '<hr>' : `<div data-k="${k}" class="${it.dis ? 'dis' : ''}">${esc(it.label)}${it.key ? `<kbd>${it.key}</kbd>` : ''}</div>`)).join('');
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 4) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 4) + 'px';
  m.addEventListener('mousedown', (e) => e.stopPropagation());
  m.addEventListener('click', (e) => { const d = e.target.closest('[data-k]'); if (!d) return; const it = items[+d.dataset.k]; if (it.dis) return; m.remove(); it.fn(); });
  setTimeout(() => { const off = () => { m.remove(); document.removeEventListener('mousedown', off); }; document.addEventListener('mousedown', off); }, 0);
}
function taskCtx(e) {
  e.preventDefault();
  const has = selIdx().length > 0;
  ctxMenu(e.clientX, e.clientY, [
    { label: 'Leistung einfügen', key: 'Einfg', fn: () => insertTask() },
    { label: 'Meilenstein einfügen', fn: () => insertTask('ms') },
    { label: 'Leistung löschen', key: 'Entf', dis: !has, fn: deleteSel },
    '-',
    { label: 'Tiefer stufen', key: 'Alt+⇧+→', dis: !has, fn: () => indent(1) },
    { label: 'Höher stufen', key: 'Alt+⇧+←', dis: !has, fn: () => indent(-1) },
    '-',
    { label: 'Leistungen verknüpfen', key: 'Strg+F2', dis: selIdx().length < 2, fn: linkSel },
    { label: 'Verknüpfung lösen', dis: !has, fn: unlinkSel },
    '-',
    { label: 'Zur Leistung scrollen', dis: !has, fn: scrollToTask },
    ...(window.BP && BP.kannRuege && BP.kannRuege() ? [{ label: 'Terminrüge …', dis: selIdx().length !== 1, fn: () => BP.terminruege(P.tasks[selIdx()[0]].uid) }] : []),
    { label: selIdx().length > 1 ? `Gemeinsam bearbeiten… (${selIdx().length})` : 'Informationen…', key: '⇧+F2', dis: !has, fn: infoForSelection },
  ]);
}
/* Plan aus dem Papierkorb zurückholen (Rückgängig nach dem Löschen) */
const ausPapierkorb = (pk) => fetch(`api/bp/papierkorb/${pk}/zurueck`, { method: 'POST' }).then(j);
