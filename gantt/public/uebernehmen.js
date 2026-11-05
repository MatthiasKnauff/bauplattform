'use strict';
/* =====================================================================
   Bauzeitenplan aus einem anderen Projekt übernehmen
   - Datei → Neu → „Aus anderem Bauzeitenplan“: neuer Plan als Kopie eines anderen, verschoben auf den neuen Projektanfang
   - Datei → „Aus anderem Plan übernehmen“: Abschnitte (Gruppen) eines anderen Plans an den geöffneten Plan anhängen
   Termine (Einschränkungen „Anfang nicht früher als“) werden um den Unterschied der Projektanfänge verschoben,
   Verknüpfungen innerhalb der übernommenen Leistungen bleiben erhalten, Fortschritt wird auf Wunsch zurückgesetzt.
   ===================================================================== */
(function () {
  const E = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plaene = (ohne) => (projects || []).filter((p) => p.id !== ohne)
    .sort((a, b) => (!!a.archived - !!b.archived) || (b.updated || '').localeCompare(a.updated || ''));
  /* Auswahl in zwei Schritten: Projekt, dann dessen Version (Versionen = Pläne desselben Projekts) */
  const projekteVon = (ohne) => {
    const m = new Map();
    plaene(ohne).forEach((p) => {
      const k = p.bt_id ? 'b' + p.bt_id : 'p' + p.id;
      if (!m.has(k)) m.set(k, { k, name: p.bt || p.name, arch: true, plaene: [], eigen: !!(P && P._bt && p.bt_id === P._bt.id) });
      const x = m.get(k); x.plaene.push(p); if (!p.archived) x.arch = false;
    });
    return [...m.values()].sort((a, b) => (b.eigen - a.eigen) || (a.arch - b.arch) || a.name.localeCompare(b.name, 'de'));
  };
  const auswahl = (ohne) => {
    const L = projekteVon(ohne);
    if (!L.length) return '<p class="hint">Es gibt noch keinen anderen Bauzeitenplan.</p>';
    const og = (lbl, xs) => (xs.length ? `<optgroup label="${lbl}">${xs.map((x) => `<option value="${E(x.k)}">${E(x.name)}</option>`).join('')}</optgroup>` : '');
    return `<div style="display:grid;grid-template-columns:3fr 2fr;gap:.5rem"><select id="ubP" class="full" aria-label="Projekt"><option value="">– Projekt wählen –</option>${og('Dieses Projekt', L.filter((x) => x.eigen))}${og('Projekte', L.filter((x) => !x.eigen && !x.arch))}${og('Archiv', L.filter((x) => !x.eigen && x.arch))}</select>
      <select id="ubQ" class="full" aria-label="Version" disabled><option value="">– Version –</option></select></div>`;
  };
  function auswahlBinden(bg, ohne) {
    const P1 = bg.querySelector('#ubP'), Q = bg.querySelector('#ubQ'); if (!P1 || !Q) return;
    P1.addEventListener('change', () => {
      const x = projekteVon(ohne).find((y) => y.k === P1.value);
      const V = x ? x.plaene.slice().sort((a, b) => (a.created || '').localeCompare(b.created || '') || a.id.localeCompare(b.id)) : [];
      Q.innerHTML = V.length ? V.map((p, i) => `<option value="${E(p.id)}">${i + 1} · ${E(p.name)}${p.archived ? ' (archiviert)' : ''}</option>`).join('') : '<option value="">– Version –</option>';
      Q.disabled = !V.length;
      const neu = V.filter((p) => !p.archived).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))[0] || V[V.length - 1];   // zuletzt bearbeitete Version vorschlagen
      if (neu) Q.value = neu.id;
      Q.dispatchEvent(new Event('change'));
    });
  }

  /* Leistungen kopieren: neue Nummern, Verknüpfungen nur innerhalb der Auswahl, Termine verschoben */
  function kopieren(tasks, shift, opt, nextUid) {
    const map = new Map();
    tasks.forEach((t) => { map.set(t.uid, nextUid++); });
    const out = tasks.map((t0) => {
      const t = JSON.parse(JSON.stringify(t0));
      t.uid = map.get(t0.uid);
      t.preds = (t.preds || []).filter((p) => map.has(p.uid)).map((p) => ({ ...p, uid: map.get(p.uid) }));
      if (t.cons != null && Number.isInteger(t.cons)) t.cons = typeof snapWork === 'function' ? snapWork(t.cons + shift) : t.cons + shift;
      if (opt.fortschritt) t.pct = 0;
      if (!opt.notizen) t.notes = '';
      if (!opt.firmen) t.res = '';   // Unternehmer erst einmal leer – die Firmen des neuen Projekts stehen noch nicht fest
      if (opt.wurzel != null && t.cons == null && !t.preds.length && !(tasks[tasks.indexOf(t0) + 1] && (tasks[tasks.indexOf(t0) + 1].lvl || 0) > (t0.lvl || 0))) t.cons = opt.wurzel;
      return typeof fillTask === 'function' ? fillTask(t) : t;
    });
    return { tasks: out, nextUid };
  }
  // Gewerke-Angaben ohne Firmen (Unternehmerbezeichnung, DIN bleiben; Firma, Vergabe, Kontakt nicht)
  const ohneFirmen = (tr) => Object.fromEntries(Object.entries(tr || {}).map(([gw, v]) => [gw, Object.fromEntries(Object.entries(v || {}).filter(([k]) => ['craft', 'din', 'extra'].includes(k)))]));
  const firmenFrage = (n) => `<div class="ub-q" style="margin-top:.6rem;border:1px solid var(--line,#ccc);border-radius:8px;padding:.5rem .7rem">
      <b>Firmen (Unternehmer)?</b>
      <label class="cb"><input type="radio" name="ubF" value="0" checked> leer lassen – Firmen trage ich ein, sobald vergeben ist</label>
      <label class="cb"><input type="radio" name="ubF" value="1"> aus ${n} übernehmen – nur, wenn dieselben Firmen bauen</label></div>`;

  /* ---------- 1) neuer Plan aus einem anderen ---------- */
  window.planAusAnderem = function (name0, start0, btId) {
    const bg = modal('Neuer Plan aus anderem Bauzeitenplan', `<div class="form" style="min-width:min(520px,86vw)">
        <label>Vorlage – Projekt und Version</label>${auswahl(null)}
        <label>Projektname</label><input id="ubName" class="full" value="${E(name0 || '')}" placeholder="Name des neuen Plans" data-bp-projekt autocomplete="off">
        <label>Projektanfang *</label><input id="ubStart" type="date" class="full" value="" required title="Wann beginnt das neue Projekt?">
      </div>${firmenFrage('der Vorlage')}<div style="margin-top:.5rem"><label class="cb"><input type="checkbox" id="ubPct" checked> Fortschritt (% erledigt) zurücksetzen</label>
          <label class="cb"><input type="checkbox" id="ubNotes" checked> Notizen übernehmen</label></div><p class="hint" id="ubInfo" style="margin:.4rem 0 0">Alle Leistungen, Dauern, Verknüpfungen, Gewerke und der Kalender werden übernommen und auf den neuen Projektanfang verschoben.</p>`,
    [{ label: 'Abbrechen' }, { label: 'Plan anlegen', cls: 'primary', primary: true, fn: (bg) => {
      const q = bg.querySelector('#ubQ') && bg.querySelector('#ubQ').value;
      if (!q) { toast('Bitte Projekt und Version als Vorlage wählen.', true); return false; }
      const nw = bg.querySelector('#ubName'), name = nw.value.trim();
      if (!name) { toast('Bitte einen Namen eingeben.', true); return false; }
      const st0 = parseDate(bg.querySelector('#ubStart').value);
      if (st0 == null) { toast('Bitte den Projektanfang des neuen Projekts eintragen.', true); bg.querySelector('#ubStart').focus(); return false; }
      const st = snapWork(st0);
      const bt = nw.dataset.btId ? +nw.dataset.btId : btId || null;
      const opt = { fortschritt: bg.querySelector('#ubPct').checked, notizen: bg.querySelector('#ubNotes').checked, firmen: (bg.querySelector('[name=ubF]:checked') || {}).value === '1' };
      (async () => {
        if (!(await leaveProjectOk())) return;
        const src = await api.get(q);
        const k = kopieren(src.tasks || [], st - src.start, opt, 1);
        const p = await api.create({ name, start: st, tasks: k.tasks, nextUid: k.nextUid, cal: src.cal || null, assist: src.assist || null,
          gwColors: src.gwColors || {}, trades: opt.firmen ? src.trades || {} : ohneFirmen(src.trades) });
        if (bt) await fetch(`api/projects/${p.id}/link`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: bt }) }).catch(() => {});
        await openProject(p.id); await refreshProjectList();
        toast(`„${name}“ aus „${src.name}“ angelegt – ${k.tasks.length} Leistungen, Beginn ${fmtD(st)}${opt.firmen ? ', Firmen übernommen' : ', Unternehmer noch leer'}.`);
      })().catch((e) => toast('Fehler: ' + e.message, true));
    } }]);
    auswahlBinden(bg, null);
    const sel = bg.querySelector('#ubQ');
    if (sel) sel.addEventListener('change', async () => {
      const info = bg.querySelector('#ubInfo'); if (!sel.value) return;
      try {
        const s = await api.get(sel.value), n = (s.tasks || []).filter((t, i, a) => !(a[i + 1] && a[i + 1].lvl > t.lvl)).length;
        info.innerHTML = `<b>${E(s.name)}</b>: ${n} Leistungen, Beginn dort ${fmtD(s.start)}. Alles wird auf den neuen Projektanfang verschoben.`;
        const nm = bg.querySelector('#ubName'); if (!nm.value.trim()) nm.placeholder = 'z. B. ' + s.name.replace(/\s*\(Kopie\)$/, '') + ' – neues Projekt';
      } catch { /* egal */ }
    });
  };

  /* ---------- 2) Abschnitte aus einem anderen Plan anhängen ---------- */
  window.planTeileUebernehmen = function () {
    if (!P) return;
    let SRC = null;
    const bg = modal('Aus anderem Plan übernehmen', `<div class="form" style="min-width:min(560px,88vw)"><label>Aus Projekt und Version</label>${auswahl(P.id)}</div>
      <div id="ubTeile" style="margin-top:.6rem"></div>
      <div class="form" style="margin-top:.6rem"><label>Beginn der Abschnitte *</label><input id="ubAb" type="date" class="full" value="" title="Ab wann sollen die übernommenen Leistungen frühestens beginnen?"></div>
      ${firmenFrage('dem anderen Plan')}
      <div style="margin-top:.5rem"><label class="cb"><input type="checkbox" id="ubPct" checked> Fortschritt zurücksetzen</label>
        <label class="cb"><input type="checkbox" id="ubNotes" checked> Notizen übernehmen</label></div>
      <p class="hint" style="margin:.4rem 0 0">Die gewählten Abschnitte werden unten an „${E(P.name)}“ angehängt – mit Dauern, Gewerken und den Verknüpfungen untereinander. Leistungen ohne Vorgänger beginnen frühestens am gewählten Tag, feste Termine verschieben sich entsprechend. ↶ Rückgängig nimmt alles wieder heraus.</p>`,
    [{ label: 'Abbrechen' }, { label: 'Übernehmen', cls: 'primary', primary: true, fn: (bg) => {
      if (!SRC) { toast('Bitte Projekt und Version wählen.', true); return false; }
      const T = SRC.tasks || [], idx = [...bg.querySelectorAll('[data-ubg]:checked')].map((x) => +x.dataset.ubg);
      if (!idx.length) { toast('Bitte mindestens einen Abschnitt wählen.', true); return false; }
      const teil = [];
      idx.forEach((i) => { const l0 = T[i].lvl || 0; teil.push(T[i]); for (let j = i + 1; j < T.length && (T[j].lvl || 0) > l0; j++) teil.push(T[j]); });
      const ab0 = parseDate(bg.querySelector('#ubAb').value);
      if (ab0 == null) { toast('Bitte eintragen, ab wann die übernommenen Abschnitte beginnen.', true); bg.querySelector('#ubAb').focus(); return false; }
      const ab = snapWork(ab0);
      const opt = { fortschritt: bg.querySelector('#ubPct').checked, notizen: bg.querySelector('#ubNotes').checked, firmen: (bg.querySelector('[name=ubF]:checked') || {}).value === '1', wurzel: ab };
      let n = 0;
      const ok = act(() => {
        const k = kopieren(teil, ab - SRC.start, opt, P.nextUid);
        if (opt.firmen) { const tr = { ...(P.trades || {}) }; teil.forEach((t) => { if (t.gw && SRC.trades && SRC.trades[t.gw] && !(tr[t.gw] && tr[t.gw].firm)) tr[t.gw] = { ...(tr[t.gw] || {}), ...SRC.trades[t.gw] }; }); P.trades = tr; }
        const minL = Math.min(...k.tasks.map((t) => t.lvl || 0));
        k.tasks.forEach((t) => { t.lvl = (t.lvl || 0) - minL; });
        P.tasks.push(...k.tasks); P.nextUid = k.nextUid; n = k.tasks.length;
        if (SRC.gwColors) P.gwColors = { ...SRC.gwColors, ...(P.gwColors || {}) };
        sel = new Set(k.tasks.map((t) => t.uid));
      });
      if (ok !== false) toast(`${n} Leistungen aus „${SRC.name}“ übernommen (ab ${fmtD(ab)}${opt.firmen ? ', mit Firmen' : ', Unternehmer leer'}) – unten im Plan markiert.`);
    } }]);
    auswahlBinden(bg, P.id);
    const q = bg.querySelector('#ubQ'); if (!q) return;
    q.addEventListener('change', async () => {
      const box = bg.querySelector('#ubTeile'); SRC = null; box.innerHTML = '';
      if (!q.value) return;
      box.innerHTML = '<p class="hint">Lade …</p>';
      try { SRC = await api.get(q.value); } catch (e) { box.innerHTML = `<p class="hint">${E(e.message)}</p>`; return; }
      const T = SRC.tasks || [];
      const top = T.map((t, i) => ({ t, i })).filter(({ t }) => (t.lvl || 0) === 0);
      const anz = (i) => { let n = 0; const l0 = T[i].lvl || 0; for (let j = i + 1; j < T.length && (T[j].lvl || 0) > l0; j++) if (!(T[j + 1] && T[j + 1].lvl > T[j].lvl)) n++; return n; };
      box.innerHTML = top.length ? `<div class="hint" style="margin-bottom:.3rem">Abschnitte aus „${E(SRC.name)}“ <button type="button" class="btn sm" data-uball>alle</button> <button type="button" class="btn sm" data-ubnone>keine</button></div>
        <div style="max-height:46vh;overflow:auto;border:1px solid var(--line,#ccc);border-radius:8px;padding:.4rem .6rem">${top.map(({ t, i }) => { const n = anz(i);
          return `<label class="cb" style="display:flex;gap:.4rem;padding:.15rem 0"><input type="checkbox" data-ubg="${i}"> <span><b>${E(t.name)}</b>${n ? ` <small class="hint">${n} Leistung${n > 1 ? 'en' : ''}</small>` : t.gw ? ` <small class="hint">${E(t.gw)}</small>` : ''}</span></label>`; }).join('')}</div>`
        : '<p class="hint">Dieser Plan hat keine Leistungen.</p>';
    });
    bg.addEventListener('click', (e) => {
      if (e.target.closest('[data-uball]')) bg.querySelectorAll('[data-ubg]').forEach((x) => { x.checked = true; });
      if (e.target.closest('[data-ubnone]')) bg.querySelectorAll('[data-ubg]').forEach((x) => { x.checked = false; });
    });
  };
  if (typeof ACTIONS === 'object') ACTIONS.planUebernehmen = () => window.planTeileUebernehmen();
})();
