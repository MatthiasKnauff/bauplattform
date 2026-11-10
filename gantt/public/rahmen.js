'use strict';
/* =====================================================================
   Bauzeitenplan im Aufbau der Plattform (wie die Ausschreibung):
   links die Navigation (bpNav), oben die Befehlsleiste (befehle), rechts der abdockbare Bereich (seite) mit den
   Reitern „Details“ (die markierte Leistung, direkt änderbar) und „Assistent“ (Planungsassistent).
   Das alte Menüband (#ribbon) bleibt unsichtbar im Dokument: app.js führt dort weiter den Zustand der Knöpfe
   (gesperrt, an) – die Befehlsleiste liest ihn und baut sich nur neu, wenn sich etwas geändert hat.
   Alle Befehle laufen über die vorhandenen Aktionen (data-act → ACTIONS in app.js).
   ===================================================================== */
(function () {
  if (!window.bpNav || !window.befehle || !window.seite) return;   // ohne Baukasten: altes Menüband
  document.body.classList.add('g-rahmen', 'bp-alt');   // bp-alt: Grundregeln des Baukastens (Felder, Knöpfe, Tabellen) nur in den Bausteine-Inseln – Fenster und Tabelle behalten ihr kompaktes Aussehen
  const NAV = $('#navL'), LEISTE = $('#leiste'), WORK = $('#work'), TABS = $('#tabs');   // TABS festhalten: steht in „oben“ in der Navigation und überlebt so deren Neuzeichnen
  const I = (k) => RIBBON_ICONS[k] || '';
  const rb = (a, extra = '') => document.querySelector(`#ribbon .rb[data-act="${a}"]${extra}`);
  /* Knopf aus einer Aktion: Zustand (gesperrt / an) wie im alten Menüband */
  const K = (act, t, ic, tip, more = {}) => { const b = rb(act, more.sel || ''); return { t, ic: I(ic), attrs: `data-act="${act}"${more.attrs || ''}`, tip: tip || (b && b.title) || t, aus: !!(b && b.disabled), an: !!(b && b.classList.contains('on')), rot: more.rot }; };
  const tab = () => LS.get('tab', 'vorgang');

  /* ---------- Befehlsleiste ---------- */
  function gruppen() {
    const t = tab(), rechts = [
      { titel: 'Datei', rechts: true, knoepfe: [K('fileExport', 'Export', 'export', 'Als Datei speichern: Excel/CSV, MS Project, Gantt-Datei'), K('printDialog', 'Drucken', 'printer', 'Drucken oder als PDF (Strg+P)')] },
      { titel: 'Plan', rechts: true, knoepfe: [K('verlaufPlan', 'Verlauf', 'history', 'Frühere Stände ansehen, vergleichen, wiederherstellen')] },   // Details/Assistent: nur noch über die Reiter des Bereichs rechts
    ];
    if (t === 'firmen') return [
      { titel: 'Projekt', knoepfe: [K('tradeAdd', 'Gewerk', 'task'), K('tradeAssignAll', 'Firmen zuweisen', 'link')] },
      { titel: 'Gewerke', knoepfe: [K('gwDialog', 'Farben', 'palette'), K('gwAuto', 'Zuordnen', 'magic')] },
      { titel: 'Ausgabe', knoepfe: [K('tradeCsv', 'Export', 'table'), K('tradeMail', 'E-Mail an alle', 'mail'), K('tradePrint', 'Liste drucken', 'printer')] },
      ...rechts];
    if (t === 'katalog') return [
      { titel: 'Katalog', knoepfe: [K('libNew', 'Neue Leistung', 'task'), K('libFromProjects', 'Aus Projekten', 'import')] },
      { titel: 'Ansicht', knoepfe: [K('libStd', 'Standardkatalog', 'table')] },
      { titel: 'Datei', knoepfe: [K('libExport', 'Export', 'export'), K('libImport', 'Import', 'open')] }];
    return [
      { titel: 'Neu', knoepfe: [K('insertTask', 'Leistung', 'task'), K('insertSummary', 'Gruppe', 'summary'), K('insertMilestone', 'Meilenstein', 'milestone')] },
      { titel: 'Bearbeiten', knoepfe: [K('undo', 'Rückgängig', 'undo'), K('redo', 'Wiederholen', 'redo'), K('deleteSel', 'Löschen', 'del', 'Markierte Leistungen löschen (Entf)', { rot: true })] },
      { titel: 'Gliederung', knoepfe: [K('outdent', 'Höher', 'outdent'), K('indent', 'Tiefer', 'indent'), K('moveUp', 'Hoch', 'up'), K('moveDown', 'Runter', 'down')] },
      { titel: 'Planen', knoepfe: [K('linkSel', 'Verknüpfen', 'link'), K('unlinkSel', 'Lösen', 'unlink'), K('splitMode', 'Unterbrechen', 'scissors'), K('tidyLinks', 'Aufräumen', 'tidy'), K('toggleAutoLink', 'Automatisch', 'autolink')] },
      { titel: 'Fortschritt', knoepfe: [0, 50, 100].map((p) => ({ ...K('pct', p + ' %', '', `Fortschritt der markierten Leistungen auf ${p} %`, { sel: `[data-pct="${p}"]`, attrs: ` data-pct="${p}"` }), ic: p + '%' })) },
      { titel: 'Ansicht', knoepfe: [K('zoomIn', 'Größer', 'zoomin'), K('zoomOut', 'Kleiner', 'zoomout'), K('fitProject', 'Ganzer Plan', 'fit'), K('goToday', 'Heute', 'today'),
        K('toggleCrit', 'Kritischer Weg', 'crit'), { t: 'Darstellung', ic: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>', fn: () => darstellung(), tip: 'Balkenbeschriftung, Pfeile, Dauer von Gruppen, Alle ein-/ausblenden, Nachfrage beim Löschen' }] },
      ...rechts];
  }
  let sig = '';
  function leisteNeu() {
    if (!LEISTE) return;
    const G = gruppen(), s = JSON.stringify(G.map((g) => [g.titel, (g.knoepfe || []).map((k) => [k.t, k.aus, k.an])]));
    if (s === sig) return; sig = s;
    befehle(LEISTE, G);
  }
  /* Zeilen im Plan und Diagramm: wie bisher (markierte Zeilen farbig) · Bänderung (jede zweite Zeile getönt) · nur die aktive Zeile mit dünnem rotem Strich */
  const ZEILEN = [['', 'Markierte Zeilen farbig'], ['band', 'Bänderung – jede zweite Zeile getönt'], ['linie', 'Nur die aktive Zeile – dünner roter Strich']];
  const zl = () => { const v = LS.get('zeilen', ''); return ZEILEN.some((x) => x[0] === v) ? v : ''; };
  const zlSetzen = () => { document.body.classList.toggle('g-zl-band', zl() === 'band'); document.body.classList.toggle('g-zl-linie', zl() === 'linie'); };
  zlSetzen();
  /* Darstellung: die Auswahlfelder des alten Menübands in einem Fenster (sie behalten ihre Handler) */
  function darstellung() {
    const teile = [...document.querySelectorAll('#ribbon .grp[data-tab="ansicht"] .rcol')];
    const da = LS.get('delAsk', true);
    const bg = modal('Darstellung', `<div class="g-darst"></div><div class="g-darst-b"><button type="button" class="btn" data-act="expandAll">Alle Gruppen aufklappen</button><button type="button" class="btn" data-act="collapseAll">Alle Gruppen zuklappen</button></div>
      <div class="g-darst-z"><span>Zeilen</span>${ZEILEN.map(([k, l]) => `<label class="g-darst-c"><input type="radio" name="gZl" value="${k}"${zl() === k ? ' checked' : ''}> ${l}</label>`).join('')}</div>
      <label class="g-darst-c"><input type="checkbox" id="gDelAsk"${da ? ' checked' : ''}> Beim Löschen fragen, ob die Dauer auf eine Hauptleistung umgelegt wird</label>`, [{ label: 'Fertig', cls: 'primary', primary: true }]);
    const box = bg.querySelector('.g-darst'); teile.forEach((x) => box.appendChild(x));
    bg.querySelectorAll('[name=gZl]').forEach((r) => r.addEventListener('change', () => { LS.set('zeilen', r.value); zlSetzen(); }));
    bg.querySelector('#gDelAsk').addEventListener('change', (e) => { if (!!LS.get('delAsk', true) !== e.target.checked) ACTIONS.toggleDelAsk(); });
    new MutationObserver((m, mo) => { if (bg.isConnected) return; mo.disconnect(); const ziel = document.querySelector('#ribbon .grp[data-tab="ansicht"]:last-of-type .btns') || document.querySelector('#ribbon .grp[data-tab="ansicht"] .btns'); teile.forEach((x) => ziel.appendChild(x)); })
      .observe(document.body, { childList: true });
  }

  /* ---------- Navigation links ---------- */
  const NI = {
    leistungen: '<path d="M4 6h9M7 12h11M5 18h7"/>', firmen: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    katalog: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M10 4h8.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', kalender: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    drucken: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M6 14h12v7H6z"/>', export: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  };
  const AKT = { projinfo: 'projectInfo', kalender: 'calendarInfo', drucken: 'printDialog', export: 'fileExport' };
  const SICHT = { leistungen: 'vorgang', firmen: 'firmen', katalog: 'katalog' };
  let VM = null;   // Versionswahl (#vmGrp aus app.js) – beim Neuzeichnen der Navigation festhalten, sonst geht sie mit verloren
  function navNeu() {
    if (!NAV) return;
    VM = $('#vmGrp') || VM;
    const t = tab(), gw = P ? new Set(P.tasks.map((x) => x.gw).filter(Boolean)).size : 0;
    const bt = P && P._bt, plaene = bt ? projects.filter((p) => p.bt_id === bt.id && !p.archived).length : 0;
    bpNav(NAV, {
      kopf: P ? { titel: (bt && bt.name) || P.name, klein: plaene > 1 ? `${plaene} Pläne` : '' } : { titel: 'Kein Plan geöffnet' },
      davor: '<div id="navVm"></div>',
      gruppen: [
        { titel: 'Terminplan', punkte: [{ id: 'leistungen', text: 'Leistungen', icon: NI.leistungen, zahl: P ? P.tasks.length : '', unter: P ? '' : '<button type="button" class="ni ni-neu" data-act="fileNew">＋ Neuer Plan</button>' }] },
        { titel: 'Beteiligte', punkte: [{ id: 'firmen', text: 'Gewerke & Firmen', icon: NI.firmen, zahl: gw || '' }] },
        { titel: 'Vorlagen', punkte: [{ id: 'katalog', text: 'Leistungskatalog', icon: NI.katalog }] },
        { titel: 'Projekt', punkte: [{ id: 'projinfo', text: 'Projektinformationen', icon: NI.info }, { id: 'kalender', text: 'Arbeitszeit & Feiertage', icon: NI.kalender }] },
      ],
      aktiv: { vorgang: 'leistungen', firmen: 'firmen', katalog: 'katalog' }[t] || 'leistungen', attr: 'gnav', lage: true,
      nachher: (el, m) => { const ziel = $('#navVm'); if (VM && ziel) { ziel.appendChild(VM); VM.style.display = P ? '' : 'none'; }   // Versionswahl in jeder Lage wieder einhängen
        // oben: eine Zeile – Version links, Suche und Speicherstand rechts in der Navigation; die Titelzeile entfällt
        const tabs = TABS, ende = el.querySelector('.nv-ende');
        if (m === 'oben' && ende) ende.appendChild(tabs); else if (tabs.parentElement !== $('#rechts')) $('#rechts').insertBefore(tabs, $('#leiste'));
        engPruefen(); },
      wahl: (id) => { if (SICHT[id]) { showTab(SICHT[id]); return; } if (!P) { toast('Kein Bauzeitenplan geöffnet.'); return; } ACTIONS[AKT[id]](); },
    });
    let ti = $('#gTitel'); if (!ti) { ti = document.createElement('span'); ti.id = 'gTitel'; $('#tabs').insertBefore(ti, $('#tabs').firstChild); }
    ti.innerHTML = P ? `Terminplan: <b>${esc(P.name)}</b>` : '';
  }

  // Navigation oben zu schmal (Zeile bricht um): Suche schrumpft auf die Lupe, klappt beim Klick auf
  function engPruefen() {
    if (!NAV) return;
    NAV.classList.remove('eng');
    if (!NAV.classList.contains('oben')) return;
    const kids = [...NAV.children].filter((x) => x.offsetParent); if (!kids.length) return;
    const top = kids[0].offsetTop; if (kids.some((x) => x.offsetTop > top + 8)) NAV.classList.add('eng');
  }
  addEventListener('resize', () => { clearTimeout(engPruefen.t); engPruefen.t = setTimeout(engPruefen, 100); });
  document.addEventListener('click', (e) => { const b = e.target.closest('.bp-nav.oben.eng .gs-box'); if (b) { const i = b.querySelector('input'); if (i && document.activeElement !== i) i.focus(); } });

  /* ---------- Bereich rechts: Details der markierten Leistung, Planungsassistent ---------- */
  const ASSIST = document.createElement('div'); ASSIST.className = 'g-assist';
  function assistentZeigen() { LS.set('assistOpen', true); seiteReiter('gantt', 'assistent'); }
  function detailsHtml() {
    if (!P || !CAL) return '<div class="card empty"><p class="hint">Kein Bauzeitenplan geöffnet.</p></div>';
    const ix = selIdx();
    if (!ix.length) return '<div class="card empty"><p class="hint">Im Plan eine Leistung anklicken – hier stehen dann Bezeichnung, Gewerk, Firma, Termine, Fortschritt und Abhängigkeiten, direkt änderbar.</p></div>';
    if (ix.length > 1) return `<div class="card g-det"><h3>${ix.length} Leistungen markiert</h3><p class="hint">Gewerk, Firma, Fortschritt und weitere Angaben für alle zugleich ändern:</p><button type="button" class="btn" data-act="taskInfo">Alle markierten bearbeiten …</button></div>`;
    const i = ix[0], t = P.tasks[i], sum = !!CAL.summ[i], ms = !sum && t.dur === 0, r = rowOfIdx(i);
    const nach = P.tasks.filter((x) => x.preds.some((p) => p.uid === t.uid)).map((x) => x.name);
    const f = (c, label, v, extra = '') => `<label>${label}<input data-gdf="${c}" value="${esc(v)}"${extra}></label>`;
    const pct = Math.round(CAL.pct[i]);
    return `<div class="card g-det" data-uid="${t.uid}">
      <div class="g-nv"><button type="button" class="btn sm" data-gdn="-1"${r > 0 ? '' : ' disabled'} title="vorige Leistung">◀</button><span class="hint">${r + 1} von ${vis.length}</span><button type="button" class="btn sm" data-gdn="1"${r < vis.length - 1 ? '' : ' disabled'} title="nächste Leistung">▶</button></div>
      <h3>${esc(t.name)}</h3>
      <div class="g-grp"><h6>${sum ? 'Leistungsgruppe' : ms ? 'Meilenstein' : 'Leistung'}</h6><div class="g-f">${f('name', 'Bezeichnung', t.name, ' class="w"')}${f('gw', 'Gewerk', t.gw || '', ' list="gwList"')}${sum ? '' : f('res', 'Firma', t.res || '')}</div></div>
      <div class="g-grp"><h6>Termin</h6><div class="g-f">${f('start', 'Anfang', fmtD(CAL.sd[i]), sum ? ' disabled' : '')}${sum || ms ? '' : f('dur', 'Dauer (Arbeitstage)', String(t.dur))}${ms ? '' : f('finish', 'Ende', fmtD(CAL.fd[i]), sum ? ' disabled' : '')}</div>
        ${sum ? `<p class="hint">Fortschritt ${pct} % – ergibt sich aus den Leistungen der Gruppe.</p>` : `<label class="g-pct-l">Fortschritt</label>${bpProzent(pct, 'data-gdp')}`}</div>
      ${sum ? '' : `<div class="g-grp"><h6>Abhängigkeiten</h6><div class="g-f">${f('pred', 'Vorgänger (Zeilen, z. B. 3; 5EA+2)', predText(t), ' class="w"')}</div><p class="hint">Nachfolger: ${nach.length ? esc(nach.join(' · ')) : 'keine'}</p></div>`}
      <div class="g-grp"><h6>Notiz</h6><textarea data-gdnotiz placeholder="z. B. Betonage nur bei Frostfreiheit">${esc(t.notes || '')}</textarea></div>
      <button type="button" class="btn sm" data-act="taskInfo" title="Alle Angaben: Einschränkung, Unterbrechungen, Verknüpfungsarten, Farbe …">Alle Angaben …</button></div>`;
  }
  let detEl = null;
  function detailsNeu() {
    if (!detEl || !detEl.isConnected) return;
    const a = document.activeElement; if (a && detEl.contains(a) && a.matches('input,textarea')) return;   // nicht unter dem Cursor neu zeichnen
    detEl.innerHTML = `<div class="sr-pad">${detailsHtml()}</div>`;
  }
  function bereich() {
    seite(WORK, 'gantt', [
      { id: 'details', titel: 'Details', mount: (el) => { detEl = el; detailsNeu(); } },
      { id: 'assistent', titel: 'Assistent', fenster: false, mount: (el) => {
        el.appendChild(ASSIST);
        if (!assistUI) assistUI = AssistUI.mount(ASSIST, AssistCore, { docked: true, onClose: () => { LS.set('assistOpen', false); seiteReiter('gantt', 'details'); }, onPopout: popoutAssist });
        LS.set('assistOpen', true);
      } },
      ...(window.GVGL && GVGL.reiter() ? [GVGL.reiter()] : []),   // Vergleich mit einer Version (vergleich.js)
    ], { start: LS.get('assistOpen', false) ? 'assistent' : 'details', w: 0.72, wechsel: () => { leisteNeu(); requestAnimationFrame(() => P && render()); } });
  }
  window.ganttBereichNeu = () => bereich();   // vergleich.js: Reiter „Vergleich“ ein-/ausblenden
  // Eingaben in den Details: wie in der Tabelle (gleicher Weg, mit Rückgängig)
  WORK.addEventListener('change', (e) => {
    const inp = e.target, k = inp.closest('.g-det[data-uid]'); if (!k) return;
    const i = idxOfUid(+k.dataset.uid); if (i < 0) return;   // die Leistung der Karte – auch wenn die Auswahl beim Wegklicken schon gewechselt hat
    if (inp.dataset.gdf) { act(() => applyField(i, inp.dataset.gdf, inp.value)); return; }
    if (inp.matches('[data-gdnotiz]')) act(() => { P.tasks[i].notes = inp.value.replace(/\s+$/, ''); });
  });
  WORK.addEventListener('keydown', (e) => {
    const inp = e.target; if (!inp.closest || !inp.closest('.g-det') || !inp.matches('input')) return;
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } else if (e.key === 'Escape') { e.preventDefault(); inp.value = inp.defaultValue; inp.blur(); }
  });
  // Plan und Diagramm halten beim Klicken den Fokus fest (preventDefault) – ein offenes Feld der Details erst abschließen, damit es gespeichert wird
  document.addEventListener('mousedown', (e) => { const a = document.activeElement; if (a && a.closest && a.closest('.g-det') && !a.closest('.g-det').contains(e.target)) a.blur(); }, true);
  WORK.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.g-det')) setTimeout(detailsNeu, 0); });
  WORK.addEventListener('change', (e) => { const r = e.target.closest && e.target.closest('.g-det input[type=range][data-gdp]'); if (r) setPct(+r.value); });
  WORK.addEventListener('click', (e) => {
    const n = e.target.closest('[data-gdn]'), p = e.target.closest('[data-gdp]'); if (!n && !p) return;
    if (p) { if (p.dataset.p != null) setPct(+p.dataset.p); return; }   // Stufe; der Schieber meldet sich über „change“
    const r = rowOfIdx(selIdx()[0]) + +n.dataset.gdn; if (r < 0 || r >= vis.length) return;
    selectRow(r); ensureVisible(r);
  });

  /* ---------- an app.js anhängen: nach jedem Zeichnen, Reiterwechsel und Auswahl nachführen ---------- */
  // Rückgängig: der Plan behält seinen eigenen Verlauf (↶ ↷ in der Befehlsleiste, Strg+Z), jeder Schritt steht zusätzlich im
  // gemeinsamen Rückgängig-Dock unten (undo.js) – beide im Gleichschritt, wie in der Ausschreibung
  const UD = [], udText = () => 'Änderung im Plan' + (P ? ` „${P.name}“` : '');
  const udAbgleich = () => { if (typeof bpUndo !== 'undefined') while (UD.length > undoS.length) bpUndo.weg(UD.pop()); };
  const udNeu = () => { if (typeof bpUndo !== 'undefined') UD.push(bpUndo.push(udText(), () => doUndo(), 'gantt')); };
  const alt2 = { act, doUndo, doRedo };
  act = function (fn) { udAbgleich(); const n = undoS.length, top = undoS[n - 1], r = alt2.act(fn); if (undoS.length !== n || undoS[undoS.length - 1] !== top) udNeu(); return r; };
  doUndo = function () { alt2.doUndo(); udAbgleich(); };
  doRedo = function () { const n = undoS.length; alt2.doRedo(); if (undoS.length > n) udNeu(); };
  window.bpRedo = { kann: () => redoS.length > 0, los: () => doRedo() };
  ACTIONS.undo = () => doUndo(); ACTIONS.redo = () => doRedo();   // Knöpfe der Befehlsleiste über dieselben Wege
  const alt = { updateRibbon, showTab, setAssistOpen, vleiste };
  updateRibbon = function () { alt.updateRibbon(); udAbgleich(); leisteNeu(); detailsNeu(); navZahlen(); };
  showTab = function (name) { alt.showTab(name); sig = ''; leisteNeu(); navNeu(); };
  setAssistOpen = function (v) { if (v) assistentZeigen(); else { LS.set('assistOpen', false); if (seiteOffen()) seiteReiter('gantt', 'details'); } };
  vleiste = function () { alt.vleiste(); navNeu(); };
  let navSig = '';
  function navZahlen() { const s = P ? `${P.id}|${P.tasks.length}|${new Set(P.tasks.map((x) => x.gw).filter(Boolean)).size}|${projects.length}` : '-'; if (s !== navSig) { navSig = s; navNeu(); } }

  bereich(); navNeu(); leisteNeu(); bpNav.breite(NAV, { key: 'gantt' });
  [NAV, LEISTE, WORK.querySelector(':scope > .sr-r')].forEach((x) => x && x.classList.add('bp-insel'));
})();
