'use strict';
/* =====================================================================
   Bauzeitenplan im Aufbau der Plattform (wie die Ausschreibung):
   links die Navigation (bpNav), oben die Befehlsleiste (befehle), rechts der abdockbare Bereich (seite) mit den
   Reitern „Details“ (die markierte Leistung, direkt änderbar) und „Assistent“ (Planungsassistent).
   Das alte Menüband (#ribbon) bleibt unsichtbar im Dokument: gantt-*.js führen dort weiter den Zustand der Knöpfe
   (gesperrt, an) – die Befehlsleiste liest ihn und baut sich nur neu, wenn sich etwas geändert hat.
   Alle Befehle laufen über die vorhandenen Aktionen (data-act → ACTIONS in gantt-start.js).
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
  // Gebäudeteile (GT-B2): Gantt nach Gebäudeteil oder Bauphase gruppieren – in „Leistungen“ und auf der Seite „Ablauf“
  const gruppieren = () => ({ titel: 'Gruppieren', knoepfe: [{ t: 'nach Gebäudeteil', ic: I('summary'), fn: () => window.ablaufGruppieren && ablaufGruppieren('teil'), an: !(P && P.ablauf && P.ablauf.gruppe === 'phase') },
    { t: 'nach Bauphase', ic: I('summary'), fn: () => window.ablaufGruppieren && ablaufGruppieren('phase'), an: !!(P && P.ablauf && P.ablauf.gruppe === 'phase') }] });
  // Gliederung grob · mittel · fein (GL-B1): für den ganzen Plan; je Block abweichend im Kontextmenü der Blockzeile bzw. an der Kiste
  const detail = () => ({ titel: 'Detail', knoepfe: window.ganttStufe ? ganttStufe.STUFEN.map(([k, n]) => ({ t: n, ic: I('summary'), fn: () => ganttStufe.setze(k), an: ganttStufe.plan() === k,
    tip: { grob: 'Je Bauphase eine Zeile – die Leistungen bleiben darunter erhalten', mittel: 'Je Gewerk eine Zeile – die Leistungen bleiben darunter erhalten', fein: 'Alle Leistungen' }[k] })) : [] });
  const hatDetail = () => !!(window.ganttStufe && P && ganttStufe.hatStufen());
  function gruppen() {
    const t = tab(), rechts = [
      { titel: 'Finden', rechts: true, html: '<span class="g-such"></span>' },   // Suchfeld (suche.js) – keine eigene Zeile mehr über der Leiste (17.11.2026)
      { titel: 'Ausgabe', rechts: true, knoepfe: [K('fileExport', 'Export', 'export', 'Als Datei speichern: Excel/CSV, MS Project, Gantt-Datei'), K('printDialog', 'Drucken', 'printer', 'Drucken oder als PDF (Strg+P)'), K('verlaufPlan', 'Verlauf', 'history', 'Frühere Stände ansehen, vergleichen, wiederherstellen')] },
      { titel: 'Teilen', rechts: true, knoepfe: [{ t: 'Link', ic: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>', fn: () => window.ganttTeilen && ganttTeilen(), aus: !P, tip: 'Link zum Ansehen für Firmen, Fachplaner:in, Bauherr:in – ohne Anmeldung, schreibgeschützt' },
        ...(window.BPHead && BPHead.bauherrAn && BPHead.bauherrAn() ? [{ t: 'Bauherr:in', ic: '<path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-4 3-6 6-6s6 2 6 6M17 11a2.5 2.5 0 1 0 0-5M17 14c3 0 4 2 4 5"/>', fn: () => ganttBauherr(), aus: !P || !bpPlanungPid(), tip: bpPlanungPid() ? 'Termine als Liste für die Bauherr:innen freigeben (Bauherrenportal)' : 'Erst den Plan mit einem Projekt verknüpfen' }] : [])] },   // E (17.11.2026): überall „Teilen“ – Link, Bauherr:in   // Details/Assistent: nur noch über die Reiter des Bereichs rechts
    ];
    if (t === 'firmen') return [
      { titel: 'Neu', knoepfe: [K('tradeAdd', 'Gewerk', 'task')] },
      { titel: 'Projekt', knoepfe: [K('tradeAssignAll', 'Firmen in den Plan', 'link', 'Die Firma jedes Gewerks bei allen seinen Leistungen als Unternehmer:in eintragen – bei abweichendem Eintrag wird gefragt')] },
      { titel: 'Vorgabe', knoepfe: [{ t: 'Vorgaben übernehmen', ic: I('import'), fn: () => window.fvVorgabenAlle && fvVorgabenAlle(), aus: !P, tip: 'Gewerke ohne Firma: die Vorgabe (alle Projekte) als Firma eintragen' }] },
      { titel: 'Gewerke', knoepfe: [K('gwDialog', 'Farben', 'palette'), K('gwAuto', 'Gewerke erkennen', 'magic', 'Leistungen ohne Gewerk: Gewerk aus Bezeichnung und Unternehmer:in vorschlagen – zum Abhaken')] },
      { titel: 'Ausgabe', knoepfe: [K('tradeCsv', 'Export', 'table'), K('tradeMail', 'E-Mail an alle', 'mail'), K('tradePrint', 'Liste drucken', 'printer')] },
      ...rechts];
    if (t === 'ablauf') return [
      { titel: 'Ansicht', knoepfe: [{ t: 'Gantt', ic: I('summary'), fn: () => showTab('vorgang'), tip: 'Zurück zum Balkenplan' }] },
      gruppieren(),
      ...(hatDetail() ? [detail()] : []),
      ...rechts];
    if (t === 'katalog') return [
      { titel: 'Neu', knoepfe: [K('libNew', 'Leistung', 'task')] },
      { titel: 'Katalog', knoepfe: [{ t: 'Abschnitte', ic: I('summary'), fn: () => window.phNeu && phNeu(), tip: 'Abschnitte bearbeiten: umbenennen, Reihenfolge ändern, neu anlegen, löschen' }, K('libFromProjects', 'Aus Projekten', 'import')] },
      { titel: 'Ansicht', knoepfe: [K('libKlapp', 'Einklappen', 'table')] },
      ...(P && P.assist && P.tasks.some((x) => x.cat === '_grp') ? [{ titel: 'Plan', knoepfe: [{ t: 'Reihenfolge im Plan', ic: I('tidy'), fn: () => window.phApplyToPlan && phApplyToPlan(), tip: `Leistungsgruppen im geöffneten Projekt „${P.name}“ in die Reihenfolge der Abschnitte bringen` }] }] : []),
      { titel: 'Datei', knoepfe: [K('libExport', 'Export', 'export'), K('libImport', 'Import', 'open')] },
      { titel: 'Stände', knoepfe: [...(typeof libDarf === 'function' && libDarf() ? [{ t: 'Stand sichern', ic: I('vsave'), fn: () => kstSichern(), tip: 'Leistungen, Abschnitte, Firmen-Vorgaben und Adressbuch jetzt als benannten Stand sichern' }] : []), { t: 'Stände & Verlauf', ic: I('history'), fn: () => kstListe(), tip: 'Gesicherte Stände, automatischer Verlauf, als Datei' }] }];
    return [
      { titel: 'Neu', knoepfe: [K('fileNew', 'Plan', 'summary', 'Neuer Bauzeitenplan …'), K('insertTask', 'Leistung', 'task'), K('insertSummary', 'Gruppe', 'summary'), K('insertMilestone', 'Meilenstein', 'milestone')] },
      { titel: 'Bearbeiten', knoepfe: [   // Kopieren · Ausschneiden · Einfügen · Duplizieren auch hier, nicht nur im Kontextmenü (GO 17.11.2026)
        { t: 'Kopieren', ic: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', fn: () => window.kopierenSel && kopierenSel(), aus: !P || !selIdx().length, tip: 'Markierte Leistungen kopieren (Strg+C)' },
        { t: 'Ausschneiden', ic: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.1 16.1L19 4M15.9 16.1L5 4"/>', fn: () => window.ausschneidenSel && ausschneidenSel(), aus: !P || !selIdx().length, tip: 'Kopieren und löschen (Strg+X)' },
        { t: 'Einfügen', ic: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V3h6v2"/>', fn: () => window.einfuegenSel && einfuegenSel(), aus: !P || !(window.kannEinfuegen && kannEinfuegen()), tip: 'Unter der aktuellen Zeile einfügen (Strg+V)' },
        { t: 'Duplizieren …', ic: '<rect x="3" y="3" width="10" height="10" rx="2"/><rect x="11" y="11" width="10" height="10" rx="2"/>', fn: () => window.duplizierenDialog && duplizierenDialog(), aus: !P || !selIdx().length, tip: 'Kopien mit Master, Verknüpfung wählbar (Strg+D)' },
        K('deleteSel', 'Löschen', 'del', 'Markierte Leistungen löschen (Entf)', { rot: true })] },
      { titel: 'Gliederung', knoepfe: [K('outdent', 'Höher', 'outdent'), K('indent', 'Tiefer', 'indent'), K('moveUp', 'Hoch', 'up'), K('moveDown', 'Runter', 'down')] },
      { titel: 'Planen', knoepfe: [K('linkSel', 'Verknüpfen', 'link'), K('unlinkSel', 'Lösen', 'unlink'), K('splitMode', 'Unterbrechen', 'scissors'), K('tidyLinks', 'Aufräumen', 'tidy'), K('toggleAutoLink', 'Automatisch', 'autolink')] },
      { titel: 'Fortschritt', html: pzLeiste() },
      ...(window.ablaufHatTeile && ablaufHatTeile() ? [gruppieren()] : []),
      ...(hatDetail() ? [detail()] : []),
      { titel: 'Ansicht', knoepfe: [K('zoomIn', 'Größer', 'zoomin'), K('zoomOut', 'Kleiner', 'zoomout'), K('fitProject', 'Ganzer Plan', 'fit'), K('goToday', 'Heute', 'today'), K('scrollToTask', 'Zur Leistung', 'scrollto', 'Diagramm zur markierten Leistung rollen'),
        K('toggleCrit', 'Kritischer Weg', 'crit'), { t: 'Darstellung', ic: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>', fn: () => darstellung(), tip: 'Balkenbeschriftung, Pfeile, Dauer von Gruppen, Alle ein-/ausblenden, Nachfrage beim Löschen' }] },
      ...rechts];
  }
  // Fortschritt der markierten Leistung(en): Stufen 0 · 25 · 50 · 75 · 100 und kleiner Schieber darunter (Baustein bpProzent)
  function pzLeiste() {
    const ix = P && CAL ? selIdx().filter((i) => !CAL.summ[i]) : [], w = ix.length ? Math.round(CAL.pct[ix[0]]) : 0;
    return `<div class="g-pzl${ix.length ? '' : ' aus'}" title="${ix.length ? 'Fortschritt der markierten Leistungen' : 'Erst eine Leistung markieren'}">${typeof bpProzent === 'function' ? bpProzent(w, 'data-gpz') : ''}</div>`;
  }
  LEISTE.addEventListener('click', (e) => { const b = e.target.closest('.g-pzl [data-gpz][data-p]'); if (b) setPct(+b.dataset.p); });
  LEISTE.addEventListener('change', (e) => { const r = e.target.closest && e.target.closest('.g-pzl input[type=range]'); if (r) setPct(+r.value); });
  let sig = '';
  function leisteNeu() {
    if (!LEISTE) return;
    const G = gruppen(), s = JSON.stringify(G.map((g) => [g.titel, g.html || '', (g.knoepfe || []).map((k) => [k.t, k.aus, k.an])]));
    if (s === sig) return; sig = s;
    const box = document.querySelector('.gs-box');   // vor dem Neuzeichnen festhalten – befehle() ersetzt den Inhalt der Leiste
    befehle(LEISTE, G, null, (el) => { const ziel = el.querySelector('.g-such'); if (ziel && box) ziel.appendChild(box); });   // Suchfeld vor dem Messen einhängen (sonst beim Öffnen abgeschnitten); Handler bleiben
  }
  /* Zeilen im Plan und Diagramm: wie bisher (markierte Zeilen farbig) · Bänderung (jede zweite Zeile getönt) · nur die aktive Zeile mit dünnem rotem Strich */
  const ZEILEN = [['', 'Markierte Zeilen farbig'], ['band', 'Bänderung – jede zweite Zeile getönt'], ['linie', 'Nur die aktive Zeile – dünner roter Rahmen (gestrichelt)']];
  const zl = () => { const v = LS.get('zeilen', ''); return ZEILEN.some((x) => x[0] === v) ? v : ''; };
  const zlSetzen = () => { document.body.classList.toggle('g-zl-band', zl() === 'band'); document.body.classList.toggle('g-zl-linie', zl() === 'linie'); };
  zlSetzen();
  /* Darstellung: die Auswahlfelder des alten Menübands in einem Fenster (sie behalten ihre Handler) */
  function darstellung() {
    const teile = [...document.querySelectorAll('#ribbon .grp[data-tab="ansicht"] .rcol')];
    const da = LS.get('delAsk', true);
    const bg = modal('Darstellung', `<div class="g-darst"><h6>Beschriftung der Balken</h6><div class="g-d3"></div><h6>Anzeige</h6><div class="g-d2"></div>
      <h6>Zeilen</h6><div class="g-darst-z">${ZEILEN.map(([k, l]) => `<label class="g-darst-c"><input type="radio" name="gZl" value="${k}"${zl() === k ? ' checked' : ''}> ${l}</label>`).join('')}</div>
      <h6>Gruppen</h6><div class="g-darst-b"><button type="button" class="btn sm" data-act="expandAll">alle aufklappen</button><button type="button" class="btn sm" data-act="collapseAll">alle zuklappen</button></div>
      <label class="g-darst-c"><input type="checkbox" id="gDelAsk"${da ? ' checked' : ''}> Beim Löschen fragen, ob die Dauer auf eine Hauptleistung umgelegt wird</label></div>`, [{ label: 'Fertig', cls: 'primary', primary: true }]);
    teile.forEach((x) => bg.querySelector(x.querySelector('[data-lbl]') ? '.g-d3' : '.g-d2').appendChild(x));   // Beschriftung nebeneinander, die übrigen als Zeile „Name | Auswahl“
    bg.querySelectorAll('[name=gZl]').forEach((r) => r.addEventListener('change', () => { LS.set('zeilen', r.value); zlSetzen(); }));
    bg.querySelector('#gDelAsk').addEventListener('change', (e) => { if (!!LS.get('delAsk', true) !== e.target.checked) ACTIONS.toggleDelAsk(); });
    new MutationObserver((m, mo) => { if (bg.isConnected) return; mo.disconnect(); const ziel = document.querySelector('#ribbon .grp[data-tab="ansicht"]:last-of-type .btns') || document.querySelector('#ribbon .grp[data-tab="ansicht"] .btns'); teile.forEach((x) => ziel.appendChild(x)); })
      .observe(document.body, { childList: true });
  }

  /* ---------- Navigation links ---------- */
  const NI = {
    ablauf: '<rect x="2" y="4" width="7" height="6" rx="1.5"/><rect x="15" y="14" width="7" height="6" rx="1.5"/><path d="M9 7h3a2 2 0 0 1 2 2v5"/><path d="M12 12l2 2 2-2"/>',
    leistungen: '<path d="M4 6h9M7 12h11M5 18h7"/>', firmen: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    katalog: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M10 4h8.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', kalender: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    drucken: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M6 14h12v7H6z"/>', export: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  };
  const AKT = { projinfo: 'projectInfo', kalender: 'calendarInfo', drucken: 'printDialog', export: 'fileExport' };
  const SICHT = { leistungen: 'vorgang', firmen: 'firmen', katalog: 'katalog', ablauf: 'ablauf' };
  let VM = null;   // Versionswahl (#vmGrp aus gantt-start.js) – beim Neuzeichnen der Navigation festhalten, sonst geht sie mit verloren
  function navNeu() {
    if (!NAV) return;
    VM = $('#vmGrp') || VM;
    const t = tab(), gw = P ? new Set(P.tasks.map((x) => x.gw).filter(Boolean)).size : 0;
    const bt = P && P._bt, plaene = bt ? projects.filter((p) => p.bt_id === bt.id && !p.archived).length : 0;
    bpNav(NAV, {
      kopf: P ? { titel: (bt && bt.name) || P.name, klein: plaene > 1 ? `${plaene} Pläne` : '' } : { titel: 'Kein Plan geöffnet' },
      davor: '<div id="navVm"></div>',
      gruppen: [
        { titel: 'Terminplan', punkte: [{ id: 'leistungen', text: 'Leistungen', icon: NI.leistungen, farbe: 'var(--c-b)', zahl: P ? P.tasks.length : '' },
          ...(window.ablaufHatTeile && ablaufHatTeile() ? [{ id: 'ablauf', text: 'Ablauf der Teile', icon: NI.ablauf || NI.leistungen, farbe: 'var(--c-t)', zahl: P.tasks.filter((x) => x.cat === '_teil').length || '' }] : [])] },   // Gebäudeteile als Kisten (ablauf.js)
        { titel: 'Beteiligte', punkte: [{ id: 'firmen', text: 'Gewerke & Firmen', icon: NI.firmen, farbe: 'var(--c-g)', zahl: gw || '' }] },
        { titel: 'Vorlagen', punkte: [{ id: 'katalog', text: 'Leistungskatalog', icon: NI.katalog, farbe: 'var(--c-v)' }] },
        { titel: 'Projekt', punkte: [{ id: 'projinfo', text: 'Projektinformationen', icon: NI.info, farbe: 'var(--c-t)' }, { id: 'kalender', text: 'Arbeitszeit & Feiertage', icon: NI.kalender, farbe: 'var(--c-o)' }] },
      ],
      aktiv: { vorgang: 'leistungen', firmen: 'firmen', katalog: 'katalog', ablauf: 'ablauf' }[t] || 'leistungen', attr: 'gnav', lage: true,
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

  /* ---------- Bereich rechts: Details der markierten Leistung; Planungsassistent = der gemeinsame (Reiter „Planung“, seite.js) ---------- */
  function assistentZeigen() { LS.set('assistOpen', true); seiteReiter('gantt', 'planung'); }
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
      ...(window.GVGL && GVGL.reiter() ? [GVGL.reiter()] : []),   // Vergleich mit einer Version (vergleich.js)
    ], { start: LS.get('assistOpen', false) ? 'planung' : 'details', w: 0.72, wechsel: () => { leisteNeu(); requestAnimationFrame(() => P && render()); } });
  }
  /* Termine fürs Bauherrenportal (bp/freigeben.js): der Plan als Balken (wie die Link-Ansicht) und als Tabelle – der aktuelle Stand, ersetzt den früheren */
  window.ganttBauherr = () => {
    if (!P || !CAL) return;
    const d = (n) => { const x = ud(n); return pad(x.getUTCDate()) + '.' + pad(x.getUTCMonth() + 1) + '.' + x.getUTCFullYear(); };
    /* Gliederung grob · mittel (GL-C1): das Portal bekommt die Zeilen wie eingestellt – zugeklappte Gruppen als ein farbiger Balken */
    const st = P.ablauf && P.ablauf.stufe, gl = !!(window.ganttStufe && st && (st.plan !== 'fein' || Object.keys(st.blk || {}).length));
    const I = gl ? vis.slice() : P.tasks.map((t, i) => i), zu = (i) => gl && CAL.summ[i] && P.tasks[i].collapsed;
    const Z = I.map((i) => { const t = P.tasks[i]; return [(CAL.summ[i] && !zu(i) ? '▸ ' : '') + (t.name || ''), d(CAL.sd[i]), !CAL.summ[i] && !t.dur ? '–' : d(CAL.fd[i]), t.res || t.firma || '']; }).filter((z) => z[0].trim());
    const firma = Z.some((z) => z[3]);
    BPHead.bauherrFreigeben({ pid: bpPlanungPid(), art: 'termine', titel: 'Bauzeitenplan – ' + (P.name || 'Termine'), schluessel: 'gantt:' + P.id, stand: new Date().toISOString().slice(0, 10),
      daten: { zeilen: [['Leistung', 'Beginn', 'Ende', ...(firma ? ['Firma'] : [])], ...Z.map((z) => (firma ? z : z.slice(0, 3)))],
        ...(gl ? { gliederung: true } : {}),
        plan: { tasks: I.map((i) => { const t = P.tasks[i]; return zu(i) ? { uid: t.uid, name: t.name, lvl: t.lvl, dur: Math.max(1, CAL.dur[i] || 0), gw: t.cat === '_gw' ? t.gw : '', res: '', pct: Math.round(CAL.pct[i] || 0), zu: true, farbe: ganttStufe.summeFarbe(i) || '' }
          : { uid: t.uid, name: t.name, lvl: t.lvl, dur: t.dur, gw: t.gw, res: t.res || t.firma || '', pct: t.pct }; }), sched: schedOut(), gwColors: P.gwColors || {} } } });   // Balken im Portal: der Kern baut daraus die Zeilen (bpcore/zeitplan.py)
  };
  window.bpPlanungPid = () => (typeof P !== 'undefined' && P && P._bt && P._bt.id) || null;   // Reiter „Planung“ (Projektmodell): das Projekt, mit dem der Plan verknüpft ist
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

  /* ---------- an gantt-*.js anhängen: nach jedem Zeichnen, Reiterwechsel und Auswahl nachführen ---------- */
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
  window.bpUndoEigen = { n: () => undoS.length, los: () => doUndo(), text: () => 'Änderung am Plan', t: () => undoT };   // Rückgängig oben links (undo.js) bedient den Stapel des Plans
  ACTIONS.undo = () => doUndo(); ACTIONS.redo = () => doRedo();   // Knöpfe der Befehlsleiste über dieselben Wege
  const alt = { updateRibbon, showTab, setAssistOpen, vleiste };
  updateRibbon = function () { alt.updateRibbon(); udAbgleich(); leisteNeu(); detailsNeu(); navZahlen(); };
  showTab = function (name) { alt.showTab(name); sig = ''; leisteNeu(); navNeu(); };
  setAssistOpen = function (v) { if (v) assistentZeigen(); else { LS.set('assistOpen', false); if (seiteOffen()) seiteReiter('gantt', 'details'); } };
  vleiste = function () { alt.vleiste(); navNeu(); };
  let navSig = '';
  function navZahlen() { const s = P ? `${P.id}|${P.tasks.length}|${new Set(P.tasks.map((x) => x.gw).filter(Boolean)).size}|${projects.length}` : '-'; if (s !== navSig) { navSig = s; navNeu(); } }

  bereich(); navNeu(); leisteNeu(); bpNav.breite(NAV, { key: 'gantt' });
  // Heftzwecke wie in der Ausschreibung: Kopf (Titel, Reiter) und Befehlsleiste zweistufig ausblenden – Befehle dann im Kontextmenü (ctxMenu)
  befehle.heft({ key: 'gantt', vor: WORK, einstufig: true, stufe1: [TABS], leiste: LEISTE, nach: () => { dispatchEvent(new Event('resize')); if (P) requestAnimationFrame(render); } });
  [NAV, LEISTE, WORK.querySelector(':scope > .sr-r')].forEach((x) => x && x.classList.add('bp-insel'));
})();
