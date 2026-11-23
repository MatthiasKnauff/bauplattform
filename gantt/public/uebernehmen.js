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
  /* Auswahl ohne native Liste (23.11.2026): Suchfeld, Projekte als Zeilen (dieses Projekt vorn, Archiv eingeklappt),
     darunter die Versionen als Knöpfe – die zuletzt bearbeitete ist vorgewählt. Ergebnis im versteckten #ubQ (value + change). */
  const tag = (d) => (d ? String(d).slice(8, 10) + '.' + String(d).slice(5, 7) + '.' + String(d).slice(0, 4) : '');
  const auswahl = (ohne) => {
    if (!projekteVon(ohne).length) return '<p class="hint">Es gibt noch keinen anderen Bauzeitenplan.</p>';
    return `<div class="ub-wahl"><input type="search" id="ubS" class="full" placeholder="Projekt suchen – Kürzel oder Name" autocomplete="off" aria-label="Projekt suchen">
      <div class="ub-l" id="ubL" role="listbox" aria-label="Projekt"></div><div class="ub-v" id="ubV" hidden></div><input type="hidden" id="ubQ" value=""></div>`;
  };
  function auswahlBinden(bg, ohne) {
    const S = bg.querySelector('#ubS'), L = bg.querySelector('#ubL'), V = bg.querySelector('#ubV'), Q = bg.querySelector('#ubQ'); if (!L || !Q) return;
    const PJ = projekteVon(ohne); let akt = '', archAuf = false;
    const zuletzt = (x) => x.plaene.reduce((m, p) => ((p.updated || '') > m ? p.updated || '' : m), '');
    const zeile = (x) => `<button type="button" class="ub-z${x.k === akt ? ' on' : ''}" role="option" aria-selected="${x.k === akt}" data-ubp="${E(x.k)}"><b>${E(x.name)}</b><small>${x.plaene.length > 1 ? x.plaene.length + ' Versionen · ' : ''}zuletzt ${tag(zuletzt(x))}</small></button>`;
    function liste() {
      const w = S.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const T = PJ.filter((x) => w.every((t) => (x.name + ' ' + x.plaene.map((p) => p.name).join(' ')).toLowerCase().includes(t)));
      const gr = (titel, xs) => (xs.length ? `<div class="ub-s">${titel}</div>` + xs.map(zeile).join('') : '');
      const ar = T.filter((x) => x.arch && !x.eigen);
      L.innerHTML = gr('Dieses Projekt', T.filter((x) => x.eigen)) + gr(w.length ? 'Treffer' : 'Projekte', T.filter((x) => !x.eigen && !x.arch))
        + (ar.length ? (w.length || archAuf ? gr('Archiv', ar) : `<button type="button" class="ub-s ub-arch" data-ubarch>${bpKlapp(false)} Archiv (${ar.length})</button>`) : '')
        + (T.length ? '' : `<p class="hint">Kein Plan passt zu „${E(S.value.trim())}“.</p>`);
    }
    function versionen() {
      const x = PJ.find((y) => y.k === akt);
      const VS = x ? x.plaene.slice().sort((a, b) => (a.created || '').localeCompare(b.created || '') || a.id.localeCompare(b.id)) : [];
      if (!VS.some((p) => p.id === Q.value)) {   // zuletzt bearbeitete Version vorschlagen
        const neu = VS.filter((p) => !p.archived).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))[0] || VS[VS.length - 1];
        Q.value = neu ? neu.id : '';
      }
      V.hidden = !VS.length;
      V.innerHTML = VS.length ? `<span class="hint">Version</span>` + VS.map((p, i) => `<button type="button" class="ub-vk${p.id === Q.value ? ' on' : ''}" data-ubq="${E(p.id)}" title="zuletzt bearbeitet ${tag(p.updated)}">${i + 1} · ${E(p.name)}${p.archived ? ' <small>(archiviert)</small>' : ''}</button>`).join('') : '';
      Q.dispatchEvent(new Event('change'));
    }
    liste();
    S.addEventListener('input', liste);
    S.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = L.querySelector('[data-ubp]'); if (b) b.click(); } });
    L.addEventListener('click', (e) => {
      if (e.target.closest('[data-ubarch]')) { archAuf = true; liste(); return; }
      const b = e.target.closest('[data-ubp]'); if (!b || b.dataset.ubp === akt) return;
      akt = b.dataset.ubp; Q.value = '';
      L.querySelectorAll('[data-ubp]').forEach((z) => { const an = z === b; z.classList.toggle('on', an); z.setAttribute('aria-selected', an); });
      versionen();
    });
    V.addEventListener('click', (e) => { const b = e.target.closest('[data-ubq]'); if (!b || b.dataset.ubq === Q.value) return; Q.value = b.dataset.ubq; V.querySelectorAll('[data-ubq]').forEach((z) => z.classList.toggle('on', z === b)); Q.dispatchEvent(new Event('change')); });
    const eigen = PJ.find((x) => x.eigen);   // dieses Projekt hat weitere Pläne → gleich vorschlagen
    if (eigen) L.querySelector(`[data-ubp="${eigen.k}"]`).click();
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
  /* ---------- gemeinsames Fenster (Mock „Aus anderem Plan übernehmen neu“, UB-1 … UB-5, 23.11.2026) ----------
     links woher (Projekt, Version), rechts was (Abschnitte bzw. Name und Projektanfang), unten wie (Beginn, Firmen, Schalter),
     im Fuß die Zusammenfassung. Beschriftungen über den Feldern, keine Stile von Hand. */
  const firmenZeilen = (n) => `<div class="ub-firm"><span class="ub-lb">Firmen (Unternehmer:in)</span>
      <label class="cb"><input type="radio" name="ubF" value="0" checked> leer lassen – Firmen trage ich ein, sobald vergeben ist</label>
      <label class="cb"><input type="radio" name="ubF" value="1"> aus ${n} übernehmen – nur, wenn dieselben Firmen bauen</label></div>`;
  const schalter = `<label class="cb"><input type="checkbox" id="ubPct" checked> Fortschritt auf 0 %</label><label class="cb"><input type="checkbox" id="ubNotes" checked> Notizen übernehmen</label>`;
  function fenster(titel, ohne, rechts, unten, knopf, fn) {
    const bg = modal(titel, `<div class="ub-fe"><div class="ub-sp"><div class="ub-li">${auswahl(ohne)}</div><div class="ub-re">${rechts}</div></div><div class="ub-ein">${unten}</div></div>`,
      [{ label: 'Abbrechen' }, { label: knopf, cls: 'primary', primary: true, fn }]);
    bg.querySelector('.modal').classList.add('ub-modal');
    bg.querySelector('.mf').insertAdjacentHTML('afterbegin', '<span class="ub-sum" id="ubSum"></span>');
    auswahlBinden(bg, ohne);
    return bg;
  }
  const opts = (bg, extra) => ({ fortschritt: bg.querySelector('#ubPct').checked, notizen: bg.querySelector('#ubNotes').checked, firmen: (bg.querySelector('[name=ubF]:checked') || {}).value === '1', ...extra });
  const blatt = (T, i) => !(T[i + 1] && (T[i + 1].lvl || 0) > (T[i].lvl || 0));
  const unter = (T, i) => { const l0 = T[i].lvl || 0, r = []; for (let j = i + 1; j < T.length && (T[j].lvl || 0) > l0; j++) r.push(j); return r; };
  const mz = (n, a, b) => `${n} ${n === 1 ? a : b}`;

  /* ---------- 1) neuer Plan aus einem anderen (UB-4: dasselbe Fenster, rechts Name und Projektanfang) ---------- */
  window.planAusAnderem = function (name0, start0, btId) {
    const anfang = start0 != null ? isoD(snapWork(start0)) : '';
    const bg = fenster('Neuer Plan aus anderem Bauzeitenplan', null,
      `<label class="ub-f"><span class="ub-lb">Name des neuen Plans</span><input id="ubName" value="${E(name0 || '')}" placeholder="Name des neuen Plans" data-bp-projekt autocomplete="off"></label>
       <label class="ub-f"><span class="ub-lb">Projektanfang</span><input id="ubStart" type="date" value="${anfang}"></label>
       <p class="hint" id="ubInfo">Links Projekt und Version als Vorlage wählen – alle Abschnitte werden übernommen.</p>`,
      firmenZeilen('der Vorlage') + `<div class="ub-sw">${schalter}</div>`, 'Plan anlegen', (bg) => {
        const q = bg.querySelector('#ubQ') && bg.querySelector('#ubQ').value;
        if (!q) { toast('Bitte links Projekt und Version als Vorlage wählen.', true); return false; }
        const nw = bg.querySelector('#ubName'), name = nw.value.trim();
        if (!name) { toast('Bitte einen Namen eingeben.', true); nw.focus(); return false; }
        const st0 = parseDate(bg.querySelector('#ubStart').value);
        if (st0 == null) { toast('Bitte den Projektanfang des neuen Projekts eintragen.', true); return false; }
        const st = snapWork(st0), bt = nw.dataset.btId ? +nw.dataset.btId : btId || null, opt = opts(bg);
        (async () => {
          if (!(await leaveProjectOk())) return;
          const src = await planApi.get(q);
          const k = kopieren(src.tasks || [], st - src.start, opt, 1);
          const p = await planApi.create({ name, start: st, tasks: k.tasks, nextUid: k.nextUid, cal: src.cal || null, assist: src.assist || null,
            gwColors: src.gwColors || {}, trades: opt.firmen ? src.trades || {} : ohneFirmen(src.trades) });
          if (bt) await fetch(`api/projects/${p.id}/link`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: bt }) });
          await openProject(p.id); await refreshProjectList();
          toast(`„${name}“ aus „${src.name}“ angelegt – ${k.tasks.length} Leistungen, Beginn ${fmtD(st)}${opt.firmen ? ', Firmen übernommen' : ', Unternehmer:in noch leer'}.`);
        })().catch((e) => toast('Fehler: ' + e.message, true));
      });
    const q = bg.querySelector('#ubQ'), sum = bg.querySelector('#ubSum'); let SRC = null;
    const fuss = () => { const d = parseDate(bg.querySelector('#ubStart').value);
      sum.textContent = SRC ? `${mz((SRC.tasks || []).filter((t, i, a) => blatt(a, i)).length, 'Leistung', 'Leistungen')} aus „${SRC.name}“${d != null ? ' · Beginn ' + fmtD(snapWork(d)) : ''}` : ''; };
    bg.querySelector('#ubStart').addEventListener('change', fuss);
    if (q) q.addEventListener('change', async () => {
      const info = bg.querySelector('#ubInfo'); SRC = null; fuss(); if (!q.value) return;
      const id = q.value, s = await planApi.get(id).catch((e) => { toast(e.message, true); return null; });
      if (!s || q.value !== id) return;
      SRC = s; fuss();
      info.innerHTML = `<b>${E(s.name)}</b> begann am ${fmtD(s.start)} – alles wird auf den neuen Projektanfang verschoben, mit Dauern, Verknüpfungen, Gewerken und Kalender.`;
      const nm = bg.querySelector('#ubName'); if (!nm.value.trim()) nm.placeholder = 'z. B. ' + s.name.replace(/\s*\(Kopie\)$/, '') + ' – neues Projekt';
    });
  };

  /* ---------- 2) Abschnitte oder einzelne Leistungen aus einem anderen Plan anhängen (UB-5) ---------- */
  window.planTeileUebernehmen = function () {
    if (!P) return;
    let SRC = null, AUF = new Set(), WAHL = new Set();   // WAHL = gewählte Leistungen (Blätter) des anderen Plans
    // UB-2: Beginn vorbelegt – nächster Arbeitstag nach dem Ende des Plans
    const C = CAL || schedule(), ende = P.tasks.reduce((m, t, i) => (C.summ[i] ? m : Math.max(m, C.ef[i])), -Infinity);
    const ab0 = isFinite(ende) ? fromW(ende) : snapWork(P.start);
    const bg = fenster('Aus anderem Plan übernehmen', P.id, '<div id="ubTeile"><p class="hint">Links Projekt und Version wählen – hier erscheinen dessen Abschnitte.</p></div>',
      `<label class="ub-f ub-beg"><span class="ub-lb">Beginn</span><input id="ubAb" type="date" value="${isoD(ab0)}"></label><span class="hint ub-abh">${isFinite(ende) ? 'nach dem Ende des Plans' : 'Projektanfang'}</span>`
      + firmenZeilen('dem anderen Plan') + `<div class="ub-sw">${schalter}</div>`, 'Übernehmen', (bg) => {
        if (!SRC) { toast('Bitte links Projekt und Version wählen.', true); return false; }
        const T = SRC.tasks || [], teil = T.filter((t, i) => (blatt(T, i) ? WAHL.has(i) : unter(T, i).some((j) => WAHL.has(j))));
        if (!teil.length) { toast('Bitte mindestens einen Abschnitt oder eine Leistung wählen.', true); return false; }
        const d = parseDate(bg.querySelector('#ubAb').value);
        if (d == null) { toast('Bitte eintragen, ab wann die übernommenen Leistungen beginnen.', true); return false; }
        const ab = snapWork(d), opt = opts(bg, { wurzel: ab });
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
        if (ok !== false) toast(`${n} Zeilen aus „${SRC.name}“ übernommen (ab ${fmtD(ab)}${opt.firmen ? ', mit Firmen' : ', Unternehmer:in leer'}) – unten im Plan markiert.`);
      });
    const box = bg.querySelector('#ubTeile'), sum = bg.querySelector('#ubSum'), q = bg.querySelector('#ubQ');
    const fuss = () => {
      const T = SRC ? SRC.tasks || [] : [], ab = parseDate(bg.querySelector('#ubAb').value);
      const abschn = T.map((t, i) => i).filter((i) => (T[i].lvl || 0) === 0 && (blatt(T, i) ? WAHL.has(i) : unter(T, i).some((j) => WAHL.has(j)))).length;
      sum.textContent = WAHL.size ? `${mz(WAHL.size, 'Leistung', 'Leistungen')} aus ${mz(abschn, 'Abschnitt', 'Abschnitten')}${ab != null ? ' · ab ' + fmtD(snapWork(ab)) : ''} · unten angehängt, ↶ nimmt alles heraus` : '';
    };
    // Baum: Abschnitte mit Haken (halb = einige), Dreieck zeigt die Leistungen darunter mit eigenem Haken
    function zeichne() {
      const T = SRC.tasks || [];
      const zeile = (i) => {
        const t = T[i], bl = blatt(T, i), B = bl ? [i] : unter(T, i).filter((j) => blatt(T, j));
        const auf = AUF.has(i), lv = Math.min(t.lvl || 0, 6);
        let h = `<div class="ub-ab ub-l${lv}${bl ? '' : ' ub-gr'}"><span class="ub-kl">${bl ? '' : `<button type="button" class="ub-kb" data-ubauf="${i}" aria-label="${auf ? 'Zuklappen' : 'Aufklappen'}">${bpKlapp(auf)}</button>`}</span>`
          + `<label class="cb"><input type="checkbox" data-ubg="${i}"> <span>${bl ? E(t.name) : `<b>${E(t.name)}</b>`}</span></label>`
          + `<small>${bl ? (t.dur ? t.dur + ' AT' : 'Meilenstein') + (t.gw ? ' · ' + E(t.gw) : '') : mz(B.length, 'Leistung', 'Leistungen')}</small></div>`;
        if (!bl && auf) { const l0 = t.lvl || 0; unter(T, i).filter((j) => (T[j].lvl || 0) === l0 + 1).forEach((j) => { h += zeile(j); }); }
        return h;
      };
      const top = T.map((t, i) => i).filter((i) => (T[i].lvl || 0) === 0);
      box.innerHTML = top.length ? `<div class="ub-kopf">Abschnitte aus „${E(SRC.name)}“ <span class="hint">Haken = übernehmen · Dreieck zeigt die Leistungen</span></div>
        <div class="ub-baum">${top.map(zeile).join('')}</div><div class="ub-alle"><button type="button" class="btn sm" data-uball>alle</button> <button type="button" class="btn sm" data-ubnone>keine</button></div>`
        : '<p class="hint">Dieser Plan hat keine Leistungen.</p>';
      haken();
    }
    function haken() {   // Haken an Ort und Stelle nachführen – der Baum wird dafür nicht neu gezeichnet (nichts springt)
      const T = SRC.tasks || [];
      box.querySelectorAll('[data-ubg]').forEach((x) => { const i = +x.dataset.ubg, B = blatt(T, i) ? [i] : unter(T, i).filter((j) => blatt(T, j)), n = B.filter((j) => WAHL.has(j)).length;
        x.checked = !!n && n === B.length; x.indeterminate = !!n && n < B.length; });
      fuss();
    }
    bg.querySelector('#ubAb').addEventListener('change', fuss);
    box.addEventListener('click', (e) => {
      const k = e.target.closest('[data-ubauf]'); if (k) { const i = +k.dataset.ubauf; if (AUF.has(i)) AUF.delete(i); else AUF.add(i); zeichne(); return; }
      if (e.target.closest('[data-uball],[data-ubnone]')) { const T = SRC.tasks || []; WAHL = e.target.closest('[data-uball]') ? new Set(T.map((t, i) => i).filter((i) => blatt(T, i))) : new Set(); haken(); }
    });
    box.addEventListener('change', (e) => {
      const c = e.target.closest('[data-ubg]'); if (!c) return;
      const T = SRC.tasks || [], i = +c.dataset.ubg, B = blatt(T, i) ? [i] : unter(T, i).filter((j) => blatt(T, j));
      B.forEach((j) => { if (c.checked) WAHL.add(j); else WAHL.delete(j); });
      haken();
    });
    if (q) q.addEventListener('change', async () => {
      SRC = null; WAHL = new Set(); AUF = new Set(); fuss();
      if (!q.value) { box.innerHTML = ''; return; }
      const id = q.value; box.innerHTML = '<p class="hint">Lade …</p>';
      const s = await planApi.get(id).catch((e) => { box.innerHTML = `<p class="hint">${E(e.message)}</p>`; return null; });
      if (!s || q.value !== id) return;
      SRC = s; zeichne();
    });
  };
  if (typeof ACTIONS === 'object') ACTIONS.planUebernehmen = () => window.planTeileUebernehmen();
})();
