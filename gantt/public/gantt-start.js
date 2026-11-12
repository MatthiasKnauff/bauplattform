'use strict';
/* Bauzeitenplan – Menüband und Aktionen, Datei (Neu, Öffnen, Speichern, Export), Server, Versionsleiste und Verlauf, Assistent, Start.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: gantt-kern.js, gantt-diagramm.js, gantt-befehle.js, gantt-ereignisse.js, gantt-start.js). */
/* =====================================================================
   Menüband
   ===================================================================== */
const RIBBON_ICONS = {
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  task: '<rect x="2.5" y="10" width="14" height="6" class="bluef"/><path d="M19.5 3.5v6M16.5 6.5h6" class="grn"/>',
  summary: '<path d="M2.5 5.5h19v3.5l-2.2-1.7H4.7L2.5 9z" class="f"/><rect x="5" y="12" width="8" height="4" class="bluef"/><rect x="11" y="18" width="9" height="3.5" class="bluef"/>',
  milestone: '<path d="M12 4l7.5 8-7.5 8-7.5-8z" class="f"/>',
  del: '<path d="M6 6l12 12M18 6L6 18" class="red"/>',
  outdent: '<path d="M21 5H10M21 12h-7M21 19H10"/><path d="M8 8.5L4.5 12 8 15.5" class="grn"/>',
  indent: '<path d="M21 5H10M21 12h-7M21 19H10"/><path d="M3.5 8.5L7 12l-3.5 3.5" class="grn"/>',
  up: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 4v15M6 13l6 6 6-6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" class="blue"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" class="blue"/>',
  unlink: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" class="blue"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" class="blue"/><path d="M4 4l16 16" class="red"/>',
  info: '<circle cx="12" cy="12" r="9" class="blue"/><path d="M12 11v6M12 7.5v.4" class="blue"/>',
  scrollto: '<path d="M3 12h12M11 8l4 4-4 4"/><rect x="17" y="9" width="5" height="6" class="bluef"/>',
  zoomin: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20.5 20.5l-5.3-5.3M7.5 10.5h6M10.5 7.5v6"/>',
  zoomout: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20.5 20.5l-5.3-5.3M7.5 10.5h6"/>',
  fit: '<path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5"/><rect x="7" y="10" width="10" height="4" class="bluef"/>',
  today: '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/><rect x="10" y="13" width="4" height="4" class="f" style="fill:#f08a00"/>',
  crit: '<rect x="2.5" y="5" width="10" height="5" class="redf"/><rect x="9.5" y="14" width="12" height="5" class="redf"/><path d="M12.5 7.5h3v6.5" class="red"/>',
  expand: '<path d="M4 6h16M8 12h12M8 18h12"/><path d="M4 10.5l2 2 2-2" class="grn"/>',
  collapse: '<path d="M4 6h16M4 12h16M4 18h16" />',
  newfile: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M12 11v6M9 14h6" class="grn"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" class="red"/>',
  import: '<path d="M12 3v12M7 10l5 5 5-5" class="grn"/><path d="M4 17v4h16v-4"/>',
  export: '<path d="M12 15V3M7 8l5-5 5 5" class="blue"/><path d="M4 17v4h16v-4"/>',
  table: '<rect x="3" y="4" width="18" height="16"/><path d="M3 9.5h18M3 14.5h18M9 4v16"/>',
  xml: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9.5 12l-2 2 2 2M14.5 12l2 2-2 2" class="blue"/>',
  autolink: '<rect x="2.5" y="4" width="7" height="4" class="bluef"/><rect x="14.5" y="16" width="7" height="4" class="bluef"/><path d="M9.5 6h3v12h2" class="blue"/><path d="M12.5 15.5l2 2.5-2 2.5" class="blue"/><path d="M18 3.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" class="f" style="fill:#f0a400"/>',
  assist: '<rect x="3" y="4" width="11" height="16" rx="1"/><path d="M6 8.5l1.2 1.2L9.5 7.5M6 13.5l1.2 1.2 2.3-2.2" class="grn"/><path d="M11 9h1M11 14h1"/><rect x="16" y="6" width="6" height="3" class="bluef"/><rect x="17.5" y="11" width="4.5" height="3" class="bluef"/><rect x="16" y="16" width="5" height="3" class="bluef"/>',
  popout: '<rect x="3" y="6" width="13" height="14" rx="1"/><path d="M10 3h11v11"/><path d="M21 3l-9 9" class="blue"/>',
  scissors: '<circle cx="6" cy="7" r="2.6"/><circle cx="6" cy="17" r="2.6"/><path d="M8.2 8.4L20 16M8.2 15.6L20 8"/><path d="M14 12h1M17 12h1" class="blue"/>',
  vsave: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3"/><rect x="8" y="13" width="8" height="6" class="bluef"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4" class="blue"/><path d="M12 7.5V12l3 2" class="grn"/>',
  tidy: '<path d="M4 6h7l4 6h5M4 18h7l4-6" class="blue"/><path d="M16 4l4 4M20 4l-4 4" class="red"/>',
  open: '<path d="M3 6h6l2 2h9v3"/><path d="M3 6v13h15l3-8H7l-4 8" class="blue"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  saveas: '<path d="M5 3h11l3 3v7"/><path d="M5 3v18h7"/><path d="M8 3v5h7V3"/><path d="M15 21l1-3 5-5 2 2-5 5z" class="grn"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6l8.5 7 8.5-7" class="blue"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.5-4-8.2-9-8.2z"/><circle cx="7.5" cy="11" r="1.4" class="f" style="fill:#42a5f5"/><circle cx="10" cy="7" r="1.4" class="f" style="fill:#ffca28"/><circle cx="14.5" cy="7" r="1.4" class="f" style="fill:#66bb6a"/><circle cx="17" cy="10.5" r="1.4" class="f" style="fill:#ef8f5f"/>',
  magic: '<path d="M4 20L16 8"/><path d="M14 6l2-2 4 4-2 2z" class="grn"/><path d="M6 4v3M4.5 5.5h3M19 14v3M17.5 15.5h3M10 2.5v2M9 3.5h2" class="blue"/>',
  close: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21H11"/><path d="M14 3v5h5V11"/><path d="M15 15l6 6M21 15l-6 6" class="red"/>',
  verlauf: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/>',
  settings: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.3-.5-.5-2.3z"/>',
  printer: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="1.5"/><path d="M7 14h10v7H7z" class="bluef"/><circle cx="17.5" cy="11" r=".6" class="f"/>',
};
document.querySelectorAll('.rb[data-ico]').forEach((b) => { b.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 24 24">${RIBBON_ICONS[b.dataset.ico] || ''}</svg>`); });

const ACTIONS = {
  undo: doUndo, redo: doRedo,
  insertTask: () => insertTask(), insertMilestone: () => insertTask('ms'), insertSummary, deleteSel: () => deleteSel(),
  indent: () => indent(1), outdent: () => indent(-1), moveUp: () => moveSel(-1), moveDown: () => moveSel(1),
  linkSel, unlinkSel,
  taskInfo: infoForSelection,
  scrollToTask,
  pct: (b) => setPct(+b.dataset.pct),
  projectInfo: () => projectDialog('info'), calendarInfo: () => projectDialog('kalender'),
  toggleCrit: () => { showCrit = !showCrit; LS.set('crit', showCrit); render(); },
  zoomIn: () => setZoom(zoom + 1), zoomOut: () => setZoom(zoom - 1), fitProject,
  goToday: () => scrollToDay(todayN(), 0.3),
  expandAll: () => setCollapsedAll(false), collapseAll: () => setCollapsedAll(true),
  newProject: () => promptDialog('Neues Projekt', 'Projektname', 'Neues Projekt', async (name) => {
    await flushSave();
    const p = await planApi.create({ name, start: snapWork(todayN()), tasks: [] }); await refreshProjectList(); await openProject(p.id);
  }),
  renameProject: () => promptDialog('Version umbenennen', 'Name der Version (das Projekt steht oben in der Kopfleiste)', P.name, (name) => { act(() => { P.name = name; }); refreshProjectList(); }),
  deleteProject: () => archivDialog(),
  importJson: () => $('#fileInput').click(),
  exportJson: () => download(fileName('json'), JSON.stringify({ name: P.name, start: P.start, startDate: isoD(P.start), nextUid: P.nextUid, gwColors: P.gwColors || {}, tasks: P.tasks }, null, 2), 'application/json'),
  exportCsv,
  exportXml,
  printDialog,
  tradeAdd: () => promptDialog('Gewerk hinzufügen', 'Gewerk', '', (g) => { act(() => { P.trades = { ...(P.trades || {}) }; P.trades[g] = { ...(P.trades[g] || {}), extra: true }; }); gwColor(g); renderFirms(); }, tradeSuggestions()),
  tradeAssignAll: () => assignAllFirms(), tradeCsv: () => tradeCsv(), tradeMail: () => tradeMail(), tradePrint: () => tradePrint(),
  fileNew, fileOpen: () => fileOpen(), fileSave: () => fileSave(), fileSaveAs, fileExport,
  tidyLinks: () => tidyLinks(),
  saveVersion: () => saveVersionDialog(),
  versionHistory: () => versionHistory(),
  splitMode: () => setSplitMode(!splitMode),
  toggleAssist: () => setAssistOpen(!document.body.classList.contains('assist-open')),
  popoutAssist: () => popoutAssist(),
  toggleDelAsk: () => { const v = !LS.get('delAsk', true); LS.set('delAsk', v); updateRibbon(); toast(v ? 'Beim Löschen fragen: EIN – du wählst, ob die Dauer auf eine Hauptleistung umgelegt wird.' : 'Beim Löschen fragen: AUS – die Gesamtzeit verkürzt sich.'); },
  toggleAutoLink: () => { autoLink = !autoLink; LS.set('autolink', autoLink); updateRibbon(); toast(autoLink ? 'Automatisch verknüpfen: EIN – beim Einfügen und Löschen werden Verknüpfungen angepasst.' : 'Automatisch verknüpfen: AUS'); },
  gwDialog, gwAuto,
  settings: () => settingsDialog(),
  verlaufPlan: () => { if (P) versionHistory(); },
  verlaufKatalog: () => { if (window.BPHead && BPHead.verlaufAlle) BPHead.verlaufAlle({ teil: 'gs', titel: 'Verlauf der Kataloge und Einstellungen' }); },
  fileClose: () => closeProject(),
  bpVerknuepfen: () => { if (window.bpLinkDialog) window.bpLinkDialog(); },
  projMenu: (b) => projMenu(b),
  libNew: () => (libDarf() ? libNew() : libNurAdmin()), libFromProjects: () => (libDarf() ? libFromProjects() : libNurAdmin()), libStd: () => libToggleStd(), libExport: () => libExport(), libImport: () => (libDarf() ? libImportFile() : libNurAdmin()),
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  if (!P && !NOPROJ_OK.has(b.dataset.act)) { toast('Kein Bauzeitenplan geöffnet – oben im Kopf das Projekt wählen oder einen Plan anlegen.'); return; }
  const f = ACTIONS[b.dataset.act]; if (f) f(b);
});
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
// ohne geöffnetes Projekt erlaubte Befehle
const NOPROJ_OK = new Set(['fileNew', 'fileOpen', 'projMenu', 'settings', 'verlaufKatalog', 'toggleAssist', 'popoutAssist', 'libNew', 'libFromProjects', 'libStd', 'libExport', 'libImport']);
function setNoProject(on) {
  document.body.classList.toggle('no-project', on);
  if (on) { const v = document.getElementById('bph-vl'); if (v) v.style.display = 'none'; }
  document.querySelectorAll('.rb[data-act]').forEach((b) => b.classList.toggle('np-dis', on && !NOPROJ_OK.has(b.dataset.act)));
  $('#startView').hidden = !on || LS.get('tab', 'vorgang') === 'katalog';
  if (on) { $('#main').hidden = true; $('#firmView').hidden = true; }
}
async function closeProject() {
  if (!P) return;
  if (!(await leaveProjectOk())) return;
  await flushSave();
  const name = P.name;
  P = null; CAL = null; undoS = []; redoS = []; sel.clear(); dirty = false;
  LS.set('last', '__geschlossen__');
  $('#projTitle').textContent = 'Kein Projekt geöffnet'; $('#projSub').textContent = 'Klicken zum Öffnen oder Anlegen';
  setSave(' '); document.title = 'Gantt – Projektplanung';
  if ($('#projSelect')) $('#projSelect').value = '';
  setNoProject(true); renderStart(); if ($('#stInfo')) $('#stInfo').textContent = 'Kein Projekt geöffnet';
  if (window.AssistCore) AssistCore.notifySoon();
  if (!$('#libView').hidden && typeof renderLib === 'function') renderLib();
  toast(`„${name}“ geschlossen.`);
}
/* Projekt oben in der Kopfleiste hat (noch) keinen Bauzeitenplan: keinen fremden Plan zeigen, sondern anbieten, einen anzulegen */
async function keinPlanFuer() {
  if (P) { if (!(await leaveProjectOk())) return; await flushSave(); }
  P = null; CAL = null; undoS = []; redoS = []; sel.clear(); dirty = false;
  $('#projTitle').textContent = 'Kein Bauzeitenplan'; $('#projSub').textContent = 'für dieses Projekt';
  setSave(' '); if ($('#projSelect')) $('#projSelect').value = '';
  setNoProject(true); renderStart(); if ($('#stInfo')) $('#stInfo').textContent = '';
}
window.keinPlanFuer = keinPlanFuer;
async function renderStart() {
  const box = $('#startView'); if (!box || P) return;
  try { projects = await planApi.list(); } catch { /* Liste wie gehabt */ }
  const gp = window.BPHead && BPHead.projekt;
  if (gp && gp.id) {   // aktuelles Projekt der Plattform
    const eig = projects.filter((p) => p.bt_id === gp.id && !p.archived);
    if (eig.length) { await openProject(eig.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))[0].id); refreshProjectList(); return; }
    box.innerHTML = `<div class="sv"><div class="sv-h"><h2>Für ${esc(gp.name)} gibt es noch keinen Bauzeitenplan</h2>
      <p>Neu anlegen – leer, mit dem Planungsassistenten oder aus dem Ablauf eines früheren Projekts. Er gehört gleich zu diesem Projekt; die erste Version heißt „Startversion“.</p>
      <div class="sv-b"><button class="btn primary" data-act="fileNew">Bauzeitenplan anlegen …</button></div></div>
      ${eig.length ? `<div class="sv-list">${eig.map((p) => `<button class="sv-p" data-open="${p.id}"><b>${esc(p.name)}</b><small>${p.n || 0} Leistungen${p.start != null ? ' · Beginn ' + fmtD(p.start) : ''}</small></button>`).join('')}</div>` : ''}</div>`;
    return;
  }
  const rec = projects.slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 12);
  const when = (u) => { if (!u) return ''; const d = new Date(u); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  box.innerHTML = `<div class="sv"><div class="sv-h"><h2>Kein Projekt geöffnet</h2><p>Projekt aus der Liste wählen, ein neues anlegen oder mit dem Planungsassistenten starten.</p>
    <div class="sv-b"><button class="btn primary" data-act="fileNew">Neues Projekt …</button><button class="btn" data-act="fileOpen">Öffnen …</button><button class="btn" data-act="toggleAssist">Planungsassistent</button></div></div>
    <h3>Zuletzt bearbeitet</h3><div class="sv-list">${rec.map((p) => `<button class="sv-p" data-open="${p.id}"><b>${esc(p.name)}</b><small>${p.n || 0} Leistungen${p.start != null ? ' · Beginn ' + fmtD(p.start) : ''}</small><small>geändert ${when(p.updated)}</small></button>`).join('') || '<div class="hint">Noch keine Projekte.</div>'}</div></div>`;
}
$('#startView').addEventListener('click', async (e) => { const b = e.target.closest('[data-open]'); if (!b) return; await openProject(b.dataset.open); refreshProjectList(); });
function projMenu(btn) {
  const r = btn.getBoundingClientRect();
  const gp = window.BPHead && BPHead.projekt;   // nur die Pläne des Projekts oben; alle anderen über „Öffnen …“
  const rec = projects.slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).filter((p) => (!P || p.id !== P.id) && !p.archived && (!gp || !gp.id || p.bt_id === gp.id)).slice(0, 8);
  const items = [
    ...(P ? [{ label: '✔ ' + P.name, dis: true }, '-'] : []),
    ...rec.map((p) => ({ label: p.name, fn: async () => { await openProject(p.id); refreshProjectList(); } })),
    ...(rec.length ? ['-'] : []),
    { label: 'Anderen Plan öffnen …', key: 'Strg+O', fn: () => fileOpen() },
    { label: 'Neuer Bauzeitenplan …', fn: () => fileNew() },
    '-',
    { label: 'Projekt schließen', key: 'Strg+W', dis: !P, fn: () => closeProject() },
  ];
  ctxMenu(r.left, r.bottom + 4, items);
}
function showTab(name) {
  if (!document.querySelector(`.tab[data-tab="${name}"]`)) name = 'vorgang';   // Reiter „Datei“ gibt es nicht mehr (Versionsleiste)
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.grp').forEach((g) => g.classList.toggle('show', g.dataset.tab === name));
  LS.set('tab', name);
  const fv = name === 'firmen', lv = name === 'katalog';
  $('#main').hidden = fv || lv || !P; $('#firmView').hidden = !fv || !P; $('#libView').hidden = !lv;
  $('#startView').hidden = !!P || lv;
  if (fv && typeof renderFirms === 'function') renderFirms(); else if (lv && typeof renderLib === 'function') renderLib(); else if (P) render();
  if (P && CAL && (fv || lv)) { renderStatus(); updateProjSub(); }   // Projektkarte und Statusleiste auch in diesen Reitern aktuell halten
}
$('#zoomRange').addEventListener('input', (e) => setZoom(+e.target.value));
{ const sm = $('#sumModeSel'); if (sm) { sm.value = sumMode; sm.addEventListener('change', () => { sumMode = sm.value; LS.set('sumMode2', sumMode); render(); }); } }
{ const lm = $('#linkModeSel'); if (lm) { lm.value = linkMode; lm.addEventListener('change', () => { linkMode = lm.value; LS.set('linkMode', linkMode); render(); }); } }
document.querySelectorAll('select[data-lbl]').forEach((sl) => {
  sl.innerHTML = LABEL_FIELDS.map(([v, l]) => `<option value="${v}"${barLbl[sl.dataset.lbl] === v ? ' selected' : ''}>${l}</option>`).join('');
  sl.addEventListener('change', () => { barLbl[sl.dataset.lbl] = sl.value; LS.set('barLbl', barLbl); render(); });
});
$('#projStart').addEventListener('change', (e) => { const d = parseDate(e.target.value); if (d != null) act(() => { P.start = snapWork(d); }); });
$('#projSelect').addEventListener('change', async (e) => { await openProject(e.target.value); refreshProjectList(); });
{ const ac = $('#autoSaveChk'); ac.checked = autoSave; ac.addEventListener('change', async () => { autoSave = ac.checked; LS.set('autosave', autoSave); if (autoSave && dirty) await saveNow(); else markDirty(); toast(autoSave ? 'Automatisch speichern: an – jede Änderung wird sofort gesichert.' : 'Automatisch speichern: aus – mit Strg+S oder „Speichern“ sichern.'); }); }
$('#fileInput').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.tasks)) throw new Error('Keine Leistungen gefunden');
    if (data.startDate && !Number.isInteger(data.start)) data.start = parseDate(data.startDate);
    data.name = data.name || f.name.replace(/\.(gantt|json)$/i, '');
    if (!(await leaveProjectOk())) return;
    const p = await planApi.create(data); await openProject(p.id); await refreshProjectList();
    toast(`Projekt „${p.name}“ importiert.`);
  } catch (err) { toast('Import fehlgeschlagen: ' + err.message, true); }
});

/* ---------- Dateihandling: Neu, Öffnen, Speichern, Speichern unter, Speichern als ---------- */
const GANTT_TYPES = [{ description: 'Gantt-Projekt', accept: { 'application/json': ['.gantt', '.json'] } }];
const projectFileData = () => ({ format: 'gantt-projekt', version: 1, name: P.name, start: P.start, startDate: isoD(P.start), nextUid: P.nextUid, cal: P.cal || null, assist: P.assist || null, gwColors: P.gwColors || {}, tasks: P.tasks });
async function writeFileHandle(h) { const w = await h.createWritable(); await w.write(JSON.stringify(projectFileData(), null, 1)); await w.close(); }
function readProjectFile(text, fname) {
  const data = JSON.parse(text);
  if (!Array.isArray(data.tasks)) throw new Error('Keine Leistungen gefunden – ist das eine Gantt-Projektdatei?');
  if (data.startDate && !Number.isInteger(data.start)) data.start = parseDate(data.startDate);
  data.name = data.name || fname.replace(/\.(gantt|json)$/i, '');
  return data;
}
async function fileSave() {
  if (!P) return;
  clearTimeout(saveTimer); await saveNow();
  toast(fileHandles[P.id] ? `Gespeichert – auf dem Server und in „${fileHandles[P.id].name}“.` : 'Gespeichert.');
}
function fileNew() {
  modal('Neu', `<div class="nw-opts">
      <button class="nw-opt" data-nw="empty"><b>Leeres Projekt</b><small>Leistungen selbst eintragen</small></button>
      <button class="nw-opt" data-nw="assist"><b>Mit Planungsassistent</b><small>Gebäudetyp wählen, Leistungen vorschlagen lassen</small></button>
      <button class="nw-opt" data-nw="kopie"><b>Aus anderem Bauzeitenplan</b><small>Ablauf eines früheren Projekts übernehmen, auf den neuen Anfang verschoben</small></button>
    </div><div class="form" style="margin-top:10px"><label>Projektname</label><input id="nwName" class="full" value="" placeholder="Projektnummer oder Name – Vorschläge aus Bautagebuch und Server" data-bp-projekt autocomplete="off"><label>Projektanfang</label><input id="nwStart" type="date" class="full" value="${isoD(startOf('week', todayN() + 7))}"></div>`, [{ label: 'Abbrechen' }]);
  const bg = [...document.querySelectorAll('.modal-bg')].pop();
  // Projekt, aus dem man gekommen ist (gemeinsames Projekt der Apps): hat es noch keinen Plan, dessen Namen vorschlagen und verknüpfen
  const gp = window.BPHead && BPHead.projekt;
  const gnr = gp && gp.id ? (gp.name.match(/^[A-Za-z]\d{3}(?:\.\d+)?/) || [''])[0].toLowerCase() : '';
  if (gp && gp.id && !projects.some((p) => p.bt_id === gp.id || (gnr && !p.bt_id && p.name.toLowerCase().startsWith(gnr)))) {   // Projekt steht oben: erste Version, ohne Namensabfrage
    const nw = bg.querySelector('#nwName'); nw.value = 'Startversion'; nw.dataset.btId = gp.id;
    const lb = nw.previousElementSibling; if (lb && lb.tagName === 'LABEL') lb.hidden = true; nw.hidden = true; }
  bg.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-nw]'); if (!b) return;
    const nw = bg.querySelector('#nwName'), name = nw.value.trim() || 'Neues Projekt', st = parseDate(bg.querySelector('#nwStart').value) ?? todayN();
    const btId = nw.dataset.btId ? +nw.dataset.btId : null;   // Vorschlag „Projekt im Bautagebuch“ gewählt → gleich verknüpfen
    bg.remove();
    if (b.dataset.nw === 'kopie' && window.planAusAnderem) { window.planAusAnderem(nw.value.trim(), st, btId); return; }
    if (!(await leaveProjectOk())) return;
    const p = await planApi.create({ name, start: snapWork(st), tasks: [], cal: P ? P.cal : null });
    if (btId) await fetch(`api/projects/${p.id}/link`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: btId }) }).catch(() => {});
    await openProject(p.id); await refreshProjectList();
    if (btId) toast('Mit dem Projekt verknüpft.');
    if (b.dataset.nw === 'assist') { setAssistOpen(true); toast('Wähle rechts im Planungsassistenten die Maßnahme – „In … erzeugen“ füllt das neue Projekt.'); }
  });
}
/* Archivieren statt Löschen (wie in den Baukosten): archivierte Pläne bleiben erhalten, stehen in den Listen unten */
function archivDialog() {
  if (!P) return;
  const arch = !!P.archived;
  modal(arch ? 'Archiviertes Projekt' : 'Archivieren oder löschen', `<div style="max-width:460px;line-height:1.5">
    <p><b>${arch ? 'Zurückholen' : 'Archivieren'}</b> ${arch ? 'stellt „' + esc(P.name) + '“ wieder zu den laufenden Plänen.' : 'nimmt „' + esc(P.name) + '“ aus den laufenden Plänen – er bleibt mit allen Versionen erhalten und lässt sich jederzeit zurückholen (Öffnen → unten „Archiv“).'}</p>
    <p><b>In den Papierkorb</b> nimmt diese Version mit ihrem Verlauf heraus. Aus dem Papierkorb (Startseite) lässt sie sich wiederherstellen, bis er geleert wird.</p></div>`, [
    { label: '🗑 In den Papierkorb', cls: 'danger', left: true, fn: () => { reallyDelete(); } },
    { label: 'Abbrechen' },
    { label: arch ? 'Zurückholen' : 'Archivieren', cls: 'primary', primary: true, fn: async () => {
      act(() => { P.archived = !arch; }); await saveNow(); await refreshProjectList();
      toast(arch ? `„${P.name}“ ist wieder ein laufender Plan.` : `„${P.name}“ archiviert – unter Öffnen → „Archiv“ jederzeit erreichbar.`);
    } }]);
}
function reallyDelete() {
  (async () => {
    await flushSave(); clearTimeout(saveTimer); saveTimer = null; const name = P.name;
    const bt = P._bt && P._bt.id;
    const id = P.id, r = await planApi.del(id); projects = await planApi.list(); P = null;
    const next = bt ? projects.find((p) => !p.archived && p.bt_id === bt) || projects.find((p) => p.bt_id === bt) : projects.find((p) => !p.archived);   // nächste Version desselben Projekts
    if (next) await openProject(next.id); else { await keinPlanFuer(); }
    refreshProjectList();
    if (typeof r.papierkorb === 'number') rueckgaengig(`„${name}“ liegt im Papierkorb.`, async () => { await ausPapierkorb(r.papierkorb); projects = await planApi.list(); await openProject(id); refreshProjectList(); });
    else toast(`„${name}“ liegt im Papierkorb – wiederherstellen unter Startseite → Papierkorb.`);
  })().catch((e) => toast(e.message, true));
}
async function fileOpen() {
  let list = await planApi.list();
  const fmtTs = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const bg = modal('Öffnen', `<div class="op-top"><input id="opQ" placeholder="Suchen …"><button class="btn" id="opFile">Vom Computer öffnen …</button></div><div id="opList" class="op-list"></div>
    <div class="hint">Doppelklick öffnet. Dateien vom Computer (.gantt / .json) werden als Projekt übernommen und mit der Datei verknüpft: „Speichern“ schreibt dann auch in diese Datei (in Chrome/Edge).</div>`, [{ label: 'Schließen' }]);
  bg.querySelector('.modal').style.width = '760px';
  const draw = () => {
    const qv = bg.querySelector('#opQ').value.trim().toLowerCase();
    const rows = list.filter((p) => !qv || (p.name || '').toLowerCase().includes(qv)).sort((a, b) => (!!a.archived - !!b.archived) || (b.updated || '').localeCompare(a.updated || ''));
    let archH = false;
    bg.querySelector('#opList').innerHTML = rows.map((p) => `${p.archived && !archH && (archH = true) ? '<div class="op-arch">Archiv</div>' : ''}<div class="op-row${P && p.id === P.id ? ' cur' : ''}${p.archived ? ' arch' : ''}" data-op="${p.id}"><div class="op-n"><b>${esc(p.name)}</b><small>${p.n ?? '?'} Leistungen · Anfang ${p.start != null ? fmtD(p.start) : '–'}${p.assist ? ' · mit Assistent' : ''}${P && p.id === P.id ? ' · <i>geöffnet</i>' : ''}</small></div>
      <span class="op-d">geändert ${fmtTs(p.updated)}</span><button class="btn sm primary" data-opo="${p.id}">Öffnen</button><button class="btn sm" data-opc="${p.id}" title="Kopie anlegen">Duplizieren</button><button class="btn sm" data-opa="${p.id}" title="${p.archived ? 'Wieder zu den laufenden Plänen' : 'Archivieren – bleibt erhalten, steht unten im Archiv'}">${p.archived ? 'Zurückholen' : 'Archivieren'}</button><button class="btn sm" data-opd="${p.id}" title="Löschen">✕</button></div>`).join('') || '<div class="hint">Keine Projekte gefunden.</div>';
  };
  bg.querySelector('#opQ').addEventListener('input', draw);
  const openId = async (id) => { bg.remove(); if (await openProject(id) !== false) refreshProjectList(); };
  bg.addEventListener('dblclick', (e) => { const r = e.target.closest('[data-op]'); if (r) openId(r.dataset.op); });
  bg.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.id === 'opFile') { bg.remove(); openFromComputer(); return; }
    if (t.dataset.opo) { openId(t.dataset.opo); return; }
    if (t.dataset.opc) { const src = t.dataset.opc === P.id ? projectFileData() : await planApi.get(t.dataset.opc); const c = await planApi.create({ ...src, name: src.name + ' (Kopie)' }); list = await planApi.list(); draw(); toast(`Kopie „${c.name}“ angelegt.`); refreshProjectList(); return; }
    if (t.dataset.opa) {
      const id = t.dataset.opa, x = list.find((p) => p.id === id);
      if (P && id === P.id) { act(() => { P.archived = !P.archived; }); await saveNow(); }
      else {
        const archiv = (a) => fetch('api/projects/' + encodeURIComponent(id) + '/archiv', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archiviert: a }) }).then(j);
        const alt = !!x.archived; await archiv(!alt);
        rueckgaengig(`„${x.name}“ ${alt ? 'zurückgeholt' : 'archiviert'}.`, async () => { await archiv(alt); if (bg.isConnected) { list = await planApi.list(); draw(); } refreshProjectList(); });
      }
      list = await planApi.list(); draw(); refreshProjectList(); return;
    }
    if (t.dataset.opd) {
      if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Löschen?'; t.classList.add('danger'); setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = '✕'; t.classList.remove('danger'); } }, 3000); return; }
      const id = t.dataset.opd;
      if (P && id === P.id) { toast('Das geöffnete Projekt bitte über „Projekt löschen“ löschen.', true); return; }
      const x = list.find((p) => p.id === id), r = await planApi.del(id); list = await planApi.list(); draw(); refreshProjectList();
      if (typeof r.papierkorb === 'number') rueckgaengig(`„${x ? x.name : 'Plan'}“ liegt im Papierkorb.`, async () => { await ausPapierkorb(r.papierkorb); if (bg.isConnected) { list = await planApi.list(); draw(); } refreshProjectList(); });
    }
  });
  draw(); setTimeout(() => bg.querySelector('#opQ').focus(), 0);
}
async function openFromComputer() {
  if (!window.showOpenFilePicker) { $('#fileInput').click(); return; }
  let h; try { [h] = await window.showOpenFilePicker({ types: GANTT_TYPES, multiple: false }); } catch { return; }
  try {
    const f = await h.getFile(), data = readProjectFile(await f.text(), f.name);
    if (!(await leaveProjectOk())) return;
    const p = await planApi.create(data); fileHandles[p.id] = h;
    await openProject(p.id); await refreshProjectList(); markDirty();
    toast(`„${f.name}“ geöffnet und verknüpft – „Speichern“ schreibt auch in diese Datei.`);
  } catch (err) { toast('Öffnen fehlgeschlagen: ' + err.message, true); }
}
function fileSaveAs() {   // „Speichern unter“ = wie eine Datei abspeichern: Formate oder Kopie unter neuem Namen
  if (!P) return;
  const canPick = !!window.showSaveFilePicker;
  const bg = modal('Speichern unter', `<div class="ex-opts">
      <button class="nw-opt" data-ex="gantt"><b>Gantt-Projektdatei (.gantt)</b><small>${canPick ? 'Speicherort frei wählbar; der Plan bleibt mit der Datei verknüpft – Änderungen werden auch dorthin geschrieben.' : 'Vollständig – zum Sichern, Weitergeben und wieder Öffnen (als Download)'}</small></button>
      <button class="nw-opt" data-ex="csv"><b>Excel / CSV (.csv)</b><small>Tabelle aller Leistungen mit Terminen, Gewerk, Unternehmer:in</small></button>
      <button class="nw-opt" data-ex="xml"><b>MS Project (.xml)</b><small>Zum Öffnen in Microsoft Project und kompatiblen Programmen</small></button>
      <button class="nw-opt" data-ex="pdf"><b>PDF</b><small>Bauzeitenplan mit Format- und Seitenwahl (wie Drucken)</small></button>
      <button class="nw-opt" data-ex="kopie"><b>Kopie unter neuem Namen</b><small>Neuer Bauzeitenplan auf dem Server – danach arbeitest du in der Kopie weiter, das Original bleibt erhalten.</small></button>
    </div>`, [{ label: 'Abbrechen' }]);
  bg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ex]'); if (!b) return; bg.remove();
    const k = b.dataset.ex;
    if (k === 'csv') return exportCsv();
    if (k === 'xml') return exportXml();
    if (k === 'pdf') return printDialog();
    if (k === 'kopie') {
      modal('Kopie unter neuem Namen', `<div class="form"><label>Name</label><input id="saName" class="full" value="${esc(P.name)} (Kopie)"></div>`, [{ label: 'Speichern', cls: 'primary', primary: true, fn: (bg2) => {
        const name = bg2.querySelector('#saName').value.trim(); if (!name) { toast('Bitte einen Namen eingeben.', true); return false; }
        (async () => {
          const p = await planApi.create({ ...projectFileData(), name });
          dirty = false; clearTimeout(saveTimer); saveTimer = null;
          await openProject(p.id); await refreshProjectList(); toast(`Gespeichert unter „${name}“ – du arbeitest jetzt in der Kopie.`);
        })().catch((er) => toast('Speichern fehlgeschlagen: ' + er.message, true));
      } }, { label: 'Abbrechen' }]);
      return;
    }
    (async () => {   // .gantt
      if (canPick) {
        let h; try { h = await window.showSaveFilePicker({ suggestedName: fileName('gantt'), types: GANTT_TYPES }); } catch { return; }
        await flushSave(); await writeFileHandle(h); fileHandles[P.id] = h; markDirty();
        toast(`Gespeichert in „${h.name}“ – Änderungen werden auch in diese Datei geschrieben.`);
      } else download(fileName('gantt'), JSON.stringify(projectFileData(), null, 1), 'application/json');
    })().catch((er) => toast('Speichern fehlgeschlagen: ' + er.message, true));
  });
}
function fileExport() {
  const bg = modal('Exportieren', `<div class="ex-opts">
      <button class="nw-opt" data-ex="gantt"><b>Gantt-Projektdatei (.gantt)</b><small>Vollständig – zum Sichern, Weitergeben und wieder Öffnen</small></button>
      <button class="nw-opt" data-ex="csv"><b>Excel / CSV (.csv)</b><small>Tabelle aller Leistungen mit Terminen, Gewerk, Unternehmer:in</small></button>
      <button class="nw-opt" data-ex="xml"><b>MS Project (.xml)</b><small>Zum Öffnen in Microsoft Project und kompatiblen Programmen</small></button>
      <button class="nw-opt" data-ex="pdf"><b>PDF / Drucken</b><small>Bauzeitenplan mit Format- und Seitenwahl</small></button>
    </div>`, [{ label: 'Abbrechen' }]);
  bg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ex]'); if (!b) return; bg.remove();
    const k = b.dataset.ex;
    if (k === 'gantt') download(fileName('gantt'), JSON.stringify(projectFileData(), null, 1), 'application/json');
    else if (k === 'csv') exportCsv(); else if (k === 'xml') exportXml(); else printDialog();
  });
}

/* ---------- Export ---------- */
const fileName = (ext) => (P.name || 'Projekt').replace(/[^\wäöüÄÖÜß.-]+/g, '_') + '.' + ext;
function download(name, content, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportCsv() {
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const rows = [['Nr.', 'Gliederungsebene', 'Leistung', 'Dauer (Tage)', 'Anfang', 'Ende', 'Vorgänger', 'Gewerk', 'Unternehmer:in', '% Abgeschlossen', 'Leistungsgruppe', 'Meilenstein', 'Kritisch', 'Notizen']];
  P.tasks.forEach((t, i) => rows.push([i + 1, t.lvl + 1, t.name, CAL.dur[i], fmtD(CAL.sd[i]).slice(3), fmtD(CAL.fd[i]).slice(3), predText(t), t.gw || '', t.res || '', Math.round(CAL.pct[i]), CAL.summ[i] ? 'Ja' : 'Nein', !CAL.summ[i] && t.dur === 0 ? 'Ja' : 'Nein', CAL.crit[i] ? 'Ja' : 'Nein', t.notes || '']));
  download(fileName('csv'), '﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}
// Microsoft-Project-XML (MSPDI), lässt sich in gängiger Projektsoftware öffnen
function exportXml() {
  const x = (s) => esc(s);
  const dt = (n, end) => isoD(n) + (end ? 'T17:00:00' : 'T08:00:00');
  const durS = (d) => `PT${d * 8}H0M0S`;
  const resNames = [...new Set(P.tasks.flatMap((t) => (t.res || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean)))];
  const typeCode = { FF: 0, FS: 1, SF: 2, SS: 3 };
  let tasks = `<Task><UID>0</UID><ID>0</ID><Name>${x(P.name)}</Name><OutlineLevel>0</OutlineLevel><Summary>1</Summary><Start>${dt(P.start)}</Start><Finish>${dt(CAL.peDay, true)}</Finish></Task>`;
  P.tasks.forEach((t, i) => {
    const ms = !CAL.summ[i] && t.dur === 0;
    tasks += `<Task><UID>${t.uid}</UID><ID>${i + 1}</ID><Name>${x(t.name)}</Name><Manual>0</Manual><OutlineLevel>${t.lvl + 1}</OutlineLevel>`
      + `<Start>${dt(CAL.sd[i], ms && CAL.msEnd[i])}</Start><Finish>${dt(CAL.fd[i], !ms || CAL.msEnd[i])}</Finish><Duration>${durS(CAL.dur[i])}</Duration><DurationFormat>7</DurationFormat>`
      + `<Milestone>${ms ? 1 : 0}</Milestone><Summary>${CAL.summ[i] ? 1 : 0}</Summary><Critical>${CAL.crit[i] ? 1 : 0}</Critical><PercentComplete>${Math.round(CAL.pct[i])}</PercentComplete>`
      + (t.cons != null ? `<ConstraintType>4</ConstraintType><ConstraintDate>${dt(t.cons)}</ConstraintDate>` : '<ConstraintType>0</ConstraintType>')
      + (t.notes ? `<Notes>${x(t.notes)}</Notes>` : '')
      + t.preds.map((p) => `<PredecessorLink><PredecessorUID>${p.uid}</PredecessorUID><Type>${typeCode[p.type]}</Type><LinkLag>${p.lag * 4800}</LinkLag><LagFormat>7</LagFormat></PredecessorLink>`).join('')
      + '</Task>';
  });
  const resources = resNames.map((r, k) => `<Resource><UID>${k + 1}</UID><ID>${k + 1}</ID><Name>${x(r)}</Name><Type>1</Type></Resource>`).join('');
  let auid = 1, assigns = '';
  P.tasks.forEach((t) => (t.res || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean).forEach((r) => { assigns += `<Assignment><UID>${auid++}</UID><TaskUID>${t.uid}</TaskUID><ResourceUID>${resNames.indexOf(r) + 1}</ResourceUID><Units>1</Units></Assignment>`; }));
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Project xmlns="http://schemas.microsoft.com/project"><Name>${x(P.name)}</Name><Title>${x(P.name)}</Title><ScheduleFromStart>1</ScheduleFromStart><StartDate>${dt(P.start)}</StartDate><FinishDate>${dt(CAL.peDay, true)}</FinishDate><MinutesPerDay>480</MinutesPerDay><MinutesPerWeek>2400</MinutesPerWeek><DaysPerMonth>20</DaysPerMonth><DefaultStartTime>08:00:00</DefaultStartTime><DefaultFinishTime>17:00:00</DefaultFinishTime><NewTasksAreManual>0</NewTasksAreManual><Tasks>${tasks}</Tasks><Resources>${resources}</Resources><Assignments>${assigns}</Assignments></Project>`;
  download(fileName('xml'), xml, 'application/xml');
}

/* =====================================================================
   Server / Speichern
   ===================================================================== */
const j = async (r) => {
  if (!r.ok) { const d = await r.json().catch(() => ({})); const e = new Error(d.error || r.statusText); e.status = r.status; e.data = d; throw e; }
  return r.json();
};
const planApi = {   // Server-Aufrufe des Bauzeitenplans (Pläne und Stände)
  list: () => fetch('api/projects').then(j),
  get: (id) => fetch('api/projects/' + id).then(j),
  create: (p) => fetch('api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(j),
  save: (p, keepalive = false) => fetch('api/projects/' + p.id, { method: 'PUT', keepalive, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, sched: P && p.id === P.id ? schedOut() : undefined }) }).then(j),
  del: (id) => fetch('api/projects/' + id, { method: 'DELETE' }).then(j),
  versions: (id) => fetch(`api/projects/${id}/versions`).then(j),
  version: (id, v) => fetch(`api/projects/${id}/versions/${v}`).then(j),
  addVersion: (id, b) => fetch(`api/projects/${id}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j),
  patchVersion: (id, v, b) => fetch(`api/projects/${id}/versions/${v}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j),
  delVersion: (id, v) => fetch(`api/projects/${id}/versions/${v}`, { method: 'DELETE' }).then(j),
};
/* berechnete Termine mitspeichern – die Baukosten-App verteilt damit die Kosten über die Bauzeit (Mittelabfluss) */
function schedOut() {
  try { return P.tasks.map((t, i) => ({ uid: t.uid, s: isoD(CAL.sd[i]), f: isoD(CAL.fd[i]), g: CAL.summ[i] ? 1 : 0 })); } catch { return null; }
}
const setSave = (s) => { const el = $('#saveState'); if (el) el.textContent = /^Gespeichert/.test(s) ? '✓ ' + s.replace(/^Gespeichert/, 'gespeichert') : s; };
function queueSave() {
  dirty = true; markDirty();
  clearTimeout(saveTimer); saveTimer = null;
  if (autoSave) { setSave('Nicht gespeicherte Änderungen …'); saveTimer = setTimeout(saveNow, 600); }
  else setSave('● Nicht gespeichert – Strg+S');
}
function markDirty() {
  if (!P) return;
  const fh = fileHandles[P.id];
  $('#projTitle').textContent = (dirty && !autoSave ? '● ' : '') + P.name + (fh ? '  ·  ' + fh.name : '');
  $('#projCard').title = P.name + (fh ? '\nDatei: ' + fh.name : '') + '\nKlicken: Projekt wechseln, öffnen, neu anlegen oder schließen';
  document.title = (dirty && !autoSave ? '● ' : '') + P.name + ' – Gantt';
}
const lastAutoV = {};
let conflictOpen = false;
async function saveNow(force = false) {
  saveTimer = null; if (!P || conflictOpen) return;
  try {
    const r = await planApi.save(force ? { ...P, _force: true } : P);
    if (P && r.id === P.id) { P._rev = r._rev; P._by = r._by; P.updated = r.updated; }
    dirty = false; const d = new Date(); setSave(`Gespeichert ${pad(d.getHours())}:${pad(d.getMinutes())}`); markDirty();
    if (fileHandles[P.id]) { try { await writeFileHandle(fileHandles[P.id]); setSave(`Gespeichert ${pad(d.getHours())}:${pad(d.getMinutes())} · auch in ${fileHandles[P.id].name}`); } catch (e) { toast('In die Datei konnte nicht geschrieben werden: ' + e.message, true); } }
    // automatischer Zwischenstand höchstens alle 15 Minuten
    if (Date.now() - (lastAutoV[P.id] || 0) > 15 * 60000) { lastAutoV[P.id] = Date.now(); planApi.addVersion(P.id, { auto: true, end: CAL.peDay }).catch(() => {}); }
  }
  catch (e) {
    if (e.status === 409) return saveConflict(e.data || {});
    setSave('Speichern fehlgeschlagen'); toast('Speichern fehlgeschlagen: ' + e.message, true);
  }
}
/* Mehrbenutzer: Jemand anderes hat den Plan gespeichert, während hier noch Änderungen offen waren */
function saveConflict(d) {
  if (conflictOpen || !P) return; conflictOpen = true;
  setSave('Nicht gespeichert – Plan wurde geändert');
  const when = d.updated ? new Date(d.updated).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
  const done = () => { conflictOpen = false; };
  modal('Plan wurde inzwischen geändert', `<div style="max-width:470px;line-height:1.5"><b>${esc(d.by || 'Jemand anderes')}</b> hat „${esc(P.name)}“${when ? ' um ' + when : ''} gespeichert, während du hier Änderungen gemacht hast.<br><br>
      <b>Neu laden</b> übernimmt den gespeicherten Stand – deine letzten Änderungen gehen verloren.<br>
      <b>Meine Fassung speichern</b> überschreibt den anderen Stand (er bleibt in der Versionshistorie).<br>
      <b>Als Kopie speichern</b> legt deine Fassung als eigenes Projekt an.</div>`, [
    { label: 'Als Kopie speichern', left: true, fn: () => { done(); (async () => { const c = await planApi.create({ ...projectFileData(), trades: P.trades || {}, name: P.name + ' (meine Fassung)' }); dirty = false; await openProject(c.id); await refreshProjectList(); toast(`Deine Fassung ist als „${c.name}“ gespeichert.`); })().catch((e) => toast(e.message, true)); } },
    { label: 'Meine Fassung speichern', fn: () => { done(); (async () => { await planApi.addVersion(P.id, { name: `Stand von ${d.by || 'anderem Benutzer:in'} vor dem Überschreiben`, auto: false }).catch(() => {}); await saveNow(true); })(); } },
    { label: 'Neu laden', cls: 'primary', primary: true, fn: () => { done(); reloadProject(); } },
  ]);
  const bgs = document.querySelectorAll('.modal-bg'); const last = bgs[bgs.length - 1];
  last.querySelector('.mx').addEventListener('click', done);
}
/* Gespeicherten Stand neu laden, Ansicht (Bildlauf, Zeitachse, Reiter) bleibt */
async function reloadProject(note) {
  if (!P) return;
  const id = P.id, top = gridPane.scrollTop, vs = view.start;
  clearTimeout(saveTimer); saveTimer = null;
  const p = await planApi.get(id); if (!P || P.id !== id) return;
  p.gwColors ||= {}; p.trades ||= {}; p.tasks = (p.tasks || []).map(fillTask);
  P = p; dirty = false; undoS = []; redoS = [];
  normalize(); allGw().forEach(gwColor); CAL = schedule(); render();
  view.start = vs; gridPane.scrollTop = top; render(); markDirty();
  setSave('Gespeichert');
  if (note) toast(note);
}
async function flushSave() { if (saveTimer) { clearTimeout(saveTimer); await saveNow(); } }
addEventListener('beforeunload', (e) => { if (saveTimer && P) { planApi.save(P, true); } else if (dirty && !autoSave && P) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Versionsleiste: je Projekt EIN Bauzeitenplan, darin Versionen (Startversion, 1. Überarbeitung …) = Pläne desselben Projekts ---------- */
let vlKnoepfe = null;
function vleiste() {
  if (!window.BPHead || !BPHead.versionsleiste) return;
  if (!vlKnoepfe) {
    const mk = (act, txt, tip) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'bph-vl-b'; b.dataset.act = act; b.textContent = txt; b.title = tip; return b; };
    vlKnoepfe = [mk('printDialog', '🖨 Drucken / PDF …', 'Bauzeitenplan drucken oder als PDF (Strg+P)'), mk('fileExport', '⤓ Exportieren …', 'Als Datei speichern: Excel/CSV, MS Project, Gantt-Datei'), mk('verlaufPlan', '🕘 Verlauf', 'Frühere Stände dieses Bauzeitenplans ansehen, vergleichen und wiederherstellen')];
  }
  const bt = P && P._bt ? P._bt.id : null;
  const L = !P ? [] : (bt ? projects.filter((p) => p.bt_id === bt) : projects.filter((p) => p.id === P.id)).slice().sort((a, b) => (a.created || '').localeCompare(b.created || '') || a.id.localeCompare(b.id));
  const when = (u) => { if (!u) return ''; const d = new Date(u); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`; };
  const G = L.find((p) => p.gueltig);
  const O = { aktuell: P && P.id, gueltig: bt && G ? G.id : null,
    liste: L.map((p) => ({ id: p.id, name: p.id === (P && P.id) ? P.name : p.name, datum: when(p.updated), wer: p.by || '', archiviert: p.archived })),
    onWahl: async (id) => { await flushSave(); if (await openProject(String(id)) !== false) refreshProjectList(); },
    onGueltig: bt ? versionGilt : null,
    onNeu: neueVersion, extra: [{ text: '⎘ Aus anderem Plan übernehmen …', fn: () => ACTIONS.planUebernehmen() }, ...(L.length > 1 && window.GVGL ? [{ text: '⇄ Vergleichen mit anderer Version …', fn: () => GVGL.versionWahl() }] : [])], onUmbenennen: () => ACTIONS.renameProject(), onVerlauf: () => versionHistory(), onVerwalten: () => archivDialog() };
  // kompaktes Versionsmenü vorne in der Werkzeugleiste (wie in der AVA); Drucken/Exportieren rechts in der Reiterzeile
  const el = BPHead.versionsleiste({ vor: $('#tabs'), ...O }); el.style.display = 'none';
  let vb = $('#vmGrp');
  if (!vb) { vb = document.createElement('div'); vb.id = 'vmGrp'; vb.className = 'vm-grp'; vb.innerHTML = '<div class="vm-in"></div><div class="gl">Version</div>'; $('#ribbon').insertBefore(vb, $('#ribbon').firstChild); }
  vb.style.display = P ? '' : 'none';
  if (BPHead.versionsMenue) BPHead.versionsMenue({ ...O, in: vb.querySelector('.vm-in') });
  const tr = document.querySelector('#tabs .tb-r');
  if (tr && !vlKnoepfe[0].isConnected) { vlKnoepfe.forEach((b) => { b.className = 'tb-k'; tr.insertBefore(b, tr.firstChild); }); }
}
async function versionGilt(id, schon) {
  const p = projects.find((x) => String(x.id) === String(id)); if (!p) return;
  if (!schon && window.bpFrage && !(await bpFrage(`„${p.id === P.id ? P.name : p.name}“ gilt ab jetzt: Das Bautagebuch (Anwesende), die Erinnerungen und die To-dos richten sich nach dieser Version. Die Erinnerungen der bisher gültigen Version entfallen.`, { ok: 'Gilt ab jetzt' }))) return;
  try { const r = await fetch(`api/projects/${encodeURIComponent(id)}/gueltig`, { method: 'PUT' }); const x = await r.json(); if (!r.ok) throw new Error(x.error || r.status); await refreshProjectList(); toast('Diese Version gilt jetzt.'); }
  catch (er) { toast('Nicht möglich: ' + er.message, true); }
}
window.ganttVleiste = vleiste;
function neueVersion() {
  if (!P) return;
  modal('Neue Version', `<div class="form" style="max-width:460px"><div class="hint" style="margin:0 0 8px">Kopie von „${esc(P.name)}“ mit allen Leistungen, Verknüpfungen, Firmen und Kalender. Danach arbeitest du in der neuen Version weiter, die alte bleibt, wie sie ist.</div>
    <label>Name der Version</label><input id="nvName" class="full" placeholder="z. B. 1. Überarbeitung, nach den Sommerferien">
    ${P._bt ? '<label></label><label class="full" style="display:flex;gap:6px;align-items:center;white-space:normal"><input type="checkbox" id="nvGilt" style="width:auto" checked> gilt ab sofort (Bautagebuch, Erinnerungen, To-dos)</label>' : ''}</div>`, [{ label: 'Anlegen', cls: 'primary', primary: true, fn: (bg) => {
    const name = bg.querySelector('#nvName').value.trim(); if (!name) { toast('Bitte einen Namen eingeben.', true); return false; }
    const gilt = !!(bg.querySelector('#nvGilt') || {}).checked, altId = P.id, btId = P._bt ? P._bt.id : null;
    (async () => {
      await flushSave();
      const src = JSON.parse(JSON.stringify(P)); delete src._rev; delete src._by; delete src._bt;
      const p = await planApi.create({ ...src, name, archived: false, _link: P._bt ? P._bt.id : null });
      if (btId) await fetch(`api/projects/${encodeURIComponent(gilt ? p.id : (projects.find((x) => x.gueltig && x.bt_id === btId) || { id: altId }).id)}/gueltig`, { method: 'PUT' }).catch(() => {});   // sonst gälte automatisch die neueste
      await openProject(p.id); await refreshProjectList(); toast(`Version „${name}“ angelegt – du arbeitest jetzt darin.`);
    })().catch((er) => toast('Anlegen fehlgeschlagen: ' + er.message, true));
  } }, { label: 'Abbrechen' }]);
  setTimeout(() => { const i = document.querySelector('#nvName'); if (i) i.focus(); }, 30);
}
async function refreshProjectList() {
  projects = await planApi.list();
  const opt = (p) => `<option value="${p.id}"${P && p.id === P.id ? ' selected' : ''}>${esc(p.id === P?.id ? P.name : p.name)}</option>`;
  const lauf = projects.filter((p) => !p.archived), arch = projects.filter((p) => p.archived);
  $('#projSelect').innerHTML = lauf.map(opt).join('') + (arch.length ? `<optgroup label="Archiv">${arch.map(opt).join('')}</optgroup>` : '');
  vleiste();
}
function askUnsaved() {
  return new Promise((resolve) => {
    modal('Nicht gespeicherte Änderungen', `<div style="max-width:440px;line-height:1.5">Sollen die Änderungen an „<b>${esc(P.name)}</b>“ gespeichert werden?</div>`, [
      { label: 'Abbrechen', left: true, fn: () => resolve('cancel') },
      { label: 'Speichern', cls: 'primary', primary: true, fn: () => resolve('save') },
      { label: 'Nicht speichern', fn: () => resolve('discard') }]);
    const bg = document.querySelectorAll('.modal-bg'); const last = bg[bg.length - 1];
    last.querySelector('.mx').addEventListener('click', () => resolve('cancel'));
    const iv = setInterval(() => { if (!last.isConnected) { clearInterval(iv); resolve('cancel'); } }, 200);
  });
}
async function leaveProjectOk() {
  if (!P || !dirty || autoSave) { await flushSave(); return true; }
  const c = await askUnsaved();
  if (c === 'cancel') { $('#projSelect').value = P.id; return false; }
  if (c === 'save') await saveNow(); else dirty = false;
  return true;
}
async function openProject(id) {
  if (P && P.id !== id && !(await leaveProjectOk())) return false;
  const p = await planApi.get(id);
  dirty = false;
  p.gwColors ||= {}; p.trades ||= {};
  p.tasks = (p.tasks || []).map(fillTask);
  P = p; LS.set('last', id);
  undoS = []; redoS = []; sel.clear(); cur = { r: 0, c: 'name' }; anchorR = 0; view.start = null;
  normalize(); allGw().forEach(gwColor); CAL = schedule();
  setNoProject(false); showTab(LS.get('tab', 'vorgang'));   // blendet den passenden Bereich ein und zeichnet
  setSave('Gespeichert');
  $('#projSelect').value = id;
  gridPane.scrollTop = 0;
  scrollToDay(P.start, 0.02);
  // erster Stand eines Projekts ohne Versionen
  planApi.versions(id).then((l) => { if (!l.length && P && P.id === id) planApi.addVersion(id, { name: 'Erster Stand', auto: true, end: CAL.peDay }); }).catch(() => {});
}
const fillTask = (t) => ({ cat: '', blk: -1, ph: '', preds: [], pct: 0, res: '', gw: '', color: '', notes: '', lvl: 0, cons: null, collapsed: false, ...t });

/* ---------- Versionshistorie ---------- */
function saveVersionDialog(after) {
  modal('Stand speichern', `<div class="form"><label>Name</label><input id="vName" class="full" placeholder="z. B. Stand Ausschreibung, an Bauherr:in" value="Stand ${fmtShort(todayN())}${ud(todayN()).getUTCFullYear()}">
      <label>Notiz</label><textarea id="vNote" class="full" placeholder="optional – was hat sich geändert?"></textarea></div>
      <div class="hint">Gespeichert wird der aktuelle Plan mit allen Leistungen, Verknüpfungen, Kalender und Assistent-Einstellungen. Projektende jetzt: ${fmtD(CAL.peDay)}.</div>`,
  [{ label: 'Speichern', cls: 'primary', primary: true, fn: (bg) => {
    const name = bg.querySelector('#vName').value.trim(); if (!name) { toast('Bitte einen Namen eingeben.', true); return false; }
    (async () => { await flushSave(); await planApi.addVersion(P.id, { name, note: bg.querySelector('#vNote').value, end: CAL.peDay }); toast(`Stand „${name}“ gespeichert – er steht im Verlauf.`); if (after) after(); })().catch((e) => toast('Fehler: ' + e.message, true));
  } }, { label: 'Abbrechen' }]);
}
function scheduleOf(data) {   // Termine eines gespeicherten Stands berechnen, ohne den aktuellen Plan anzufassen
  const save = P; let C2, T2;
  try { P = { ...data, tasks: (data.tasks || []).map(fillTask) }; normalize(); C2 = schedule(); T2 = P.tasks; }
  finally { P = save; buildCal(P.cal); }
  return { C: C2, T: T2 };
}
async function versionHistory() {
  await flushSave();
  let list = [];
  const bg = modal('Verlauf – ' + P.name, '<div id="vhBody">Lade …</div>', [
    { label: 'Schließen' }]);
  bg.querySelector('.modal').style.width = '860px';
  const fmtTs = (iso) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const draw = () => {
    const box = bg.querySelector('#vhBody');
    if (!list.length) { box.innerHTML = '<div class="hint">Noch keine Versionen. Mit „Aktuellen Stand als Version speichern“ legst du einen benannten Planstand an; außerdem entstehen beim Arbeiten automatische Zwischenstände (höchstens alle 15 Minuten, die letzten 60 bleiben).</div>'; return; }
    box.innerHTML = `<div class="vh-cur">Aktueller Stand: <b>${P.tasks.length} Leistungen</b> · Projektende <b>${fmtD(CAL.peDay)}</b></div>
      <table class="ptab vh"><thead><tr><th style="width:120px">Gespeichert</th><th>Version</th><th style="width:70px">Leistungen</th><th style="width:100px">Projektende</th><th style="width:250px"></th></tr></thead><tbody>`
      + list.map((v) => `<tr class="${v.auto ? 'auto' : ''}"><td>${fmtTs(v.created)}</td>
        <td>${v.auto && !v.name ? '<span class="vh-auto">automatischer Zwischenstand</span>' : `<b>${esc(v.name)}</b>`}${v.note ? `<div class="vh-note">${esc(v.note)}</div>` : ''}</td>
        <td style="text-align:right">${v.n}</td><td>${v.end != null ? fmtD(v.end) : '–'}${v.end != null && v.end !== CAL.peDay ? `<div class="vh-d ${v.end < CAL.peDay ? 'late' : 'early'}">jetzt ${CAL.peDay > v.end ? '+' : ''}${CAL.peDay - v.end} Tage</div>` : ''}</td>
        <td class="vh-act"><button class="btn sm" data-vc="${v.id}">Vergleichen</button><button class="btn sm" data-vr="${v.id}">Wiederherstellen</button><button class="btn sm" data-vo="${v.id}" title="Als neues Projekt öffnen">Als Projekt</button><button class="btn sm" data-vn="${v.id}" title="Benennen">✎</button><button class="btn sm" data-vd="${v.id}" title="Löschen">✕</button></td></tr>`).join('')
      + '</tbody></table>';
  };
  const load = async () => { try { list = await planApi.versions(P.id); } catch (e) { list = []; toast('Versionen konnten nicht geladen werden: ' + e.message, true); } draw(); };
  bg.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const v = list.find((x) => x.id === (b.dataset.vc || b.dataset.vr || b.dataset.vo || b.dataset.vn || b.dataset.vd)); if (!v) return;
    const label = v.name || 'Zwischenstand vom ' + fmtTs(v.created);
    if (b.dataset.vc) { compareVersion(v, label); return; }
    if (b.dataset.vr) {
      confirmDialog('Version wiederherstellen', `Den Plan auf „<b>${esc(label)}</b>“ zurücksetzen? Der aktuelle Stand wird vorher als Version „Vor Wiederherstellung“ gesichert; zusätzlich lässt sich das Zurücksetzen mit Strg+Z rückgängig machen.`, async () => {
        try {
          await flushSave(); await planApi.addVersion(P.id, { name: 'Vor Wiederherstellung', note: 'automatisch vor dem Zurücksetzen auf „' + label + '“', end: CAL.peDay });
          const full = await planApi.version(P.id, v.id), d = full.data;
          const ok = act(() => { P.tasks = (d.tasks || []).map(fillTask); P.start = d.start; P.cal = d.cal || null; P.assist = d.assist || null; P.gwColors = d.gwColors || {}; P.nextUid = Math.max(d.nextUid || 1, P.nextUid); sel = new Set(); });
          if (ok) { allGw().forEach(gwColor); render(); toast(`Plan auf „${label}“ zurückgesetzt.`); }
          bg.remove();
        } catch (err) { toast('Fehler: ' + err.message, true); }
      }, 'Wiederherstellen');
      return;
    }
    if (b.dataset.vo) {
      try { const full = await planApi.version(P.id, v.id); await flushSave(); const p = await planApi.create({ ...full.data, name: `${P.name} – ${label}` }); bg.remove(); await refreshProjectList(); await openProject(p.id); await refreshProjectList(); toast(`„${label}“ als neues Projekt geöffnet.`); }
      catch (err) { toast('Fehler: ' + err.message, true); }
      return;
    }
    if (b.dataset.vn) { promptDialog('Version benennen', 'Name', v.name || '', async (name) => { await planApi.patchVersion(P.id, v.id, { name }); load(); }); return; }
    if (b.dataset.vd) {
      if (b.dataset.sure) { await planApi.delVersion(P.id, v.id); load(); }
      else { b.dataset.sure = '1'; b.textContent = 'Löschen?'; b.classList.add('danger'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = '✕'; b.classList.remove('danger'); } }, 3000); }
    }
  });
  load();
}
async function compareVersion(v, label) {
  let full; try { full = await planApi.version(P.id, v.id); } catch (e) { toast('Fehler: ' + e.message, true); return; }
  const { C: C2, T: T2 } = scheduleOf(full.data);
  const leaf = (T, C, i) => !C.summ[i];
  const old = new Map(), cur = new Map(), oldByName = new Map();
  T2.forEach((t, i) => { if (leaf(T2, C2, i)) { const o = { name: t.name, sd: C2.sd[i], fd: C2.fd[i], dur: C2.dur[i], res: t.res, i }; old.set(t.uid, o); if (!oldByName.has(t.name)) oldByName.set(t.name, o); } });
  P.tasks.forEach((t, i) => { if (!CAL.summ[i]) cur.set(t.uid, { name: t.name, sd: CAL.sd[i], fd: CAL.fd[i], dur: CAL.dur[i], i }); });
  const used = new Set(), rows = [];
  for (const [u, c] of cur) {
    let o = old.get(u); if (!o || o.name !== c.name) { const byN = oldByName.get(c.name); if (byN && !used.has(byN)) o = byN; else if (o && used.has(o)) o = null; }
    if (o) { used.add(o); if (o.sd !== c.sd || o.fd !== c.fd || o.dur !== c.dur) rows.push({ k: 'ch', c, o }); }
    else rows.push({ k: 'new', c });
  }
  for (const o of old.values()) if (!used.has(o)) rows.push({ k: 'del', o });
  rows.sort((a, b) => (a.c ? a.c.i : 1e6 + a.o.i) - (b.c ? b.c.i : 1e6 + b.o.i));
  const dd = (a, b) => b - a, sgn = (n) => (n > 0 ? '+' + n : String(n));
  const endD = CAL.peDay - C2.peDay;
  const nCh = rows.filter((r) => r.k === 'ch').length, nNew = rows.filter((r) => r.k === 'new').length, nDel = rows.filter((r) => r.k === 'del').length;
  const body = `<div class="vh-sum"><div><span>Projektende</span><b>${fmtD(C2.peDay)}</b> → <b>${fmtD(CAL.peDay)}</b> <i class="${endD > 0 ? 'late' : endD < 0 ? 'early' : ''}">${endD ? sgn(endD) + ' Kalendertage' : 'unverändert'}</i></div>
      <div><span>Leistungen</span>${nCh} verschoben/geändert · ${nNew} neu · ${nDel} entfallen</div></div>
    ${rows.length ? `<div style="max-height:56vh;overflow:auto"><table class="ptab vh"><thead><tr><th>Leistung</th><th>Anfang: ${esc(label.length > 24 ? 'Version' : label)} → jetzt</th><th>Ende: Version → jetzt</th><th style="width:90px">Ende Δ</th></tr></thead><tbody>`
      + rows.map((r) => r.k === 'new' ? `<tr class="vh-new"><td>${r.c.i + 1} – ${esc(r.c.name)} <i class="t in">neu</i></td><td>${fmtD(r.c.sd)}</td><td>${fmtD(r.c.fd)}</td><td></td></tr>`
        : r.k === 'del' ? `<tr class="vh-del"><td>${esc(r.o.name)} <i class="t part">entfallen</i></td><td>${fmtD(r.o.sd)}</td><td>${fmtD(r.o.fd)}</td><td></td></tr>`
        : `<tr><td>${r.c.i + 1} – ${esc(r.c.name)}${r.o.dur !== r.c.dur ? ` <small>(${r.o.dur} → ${r.c.dur} AT)</small>` : ''}</td><td>${r.o.sd === r.c.sd ? fmtD(r.c.sd) : `${fmtD(r.o.sd)} → <b>${fmtD(r.c.sd)}</b>`}</td><td>${r.o.fd === r.c.fd ? fmtD(r.c.fd) : `${fmtD(r.o.fd)} → <b>${fmtD(r.c.fd)}</b>`}</td><td class="${dd(r.o.fd, r.c.fd) > 0 ? 'late' : dd(r.o.fd, r.c.fd) < 0 ? 'early' : ''}">${dd(r.o.fd, r.c.fd) ? sgn(dd(r.o.fd, r.c.fd)) + ' Tage' : '–'}</td></tr>`).join('')
      + '</tbody></table></div>' : '<div class="hint">Keine Unterschiede bei den Leistungen.</div>'}`;
  const m = modal(`Vergleich: „${label}“ ↔ aktueller Stand`, body, [{ label: 'Schließen' }]);
  m.querySelector('.modal').style.width = '900px';
}

/* ⚙ → Bauzeitenplan: Einstellungen dieser App */
function ganttSettings(host) {
  const draw = () => {
    host.innerHTML = `<h4>Bearbeiten</h4>
      <label class="bph-ck"><input type="checkbox" data-gs="delAsk"${LS.get('delAsk', true) ? ' checked' : ''}> Beim Löschen von Leistungen fragen</label>
      <label class="bph-ck"><input type="checkbox" data-gs="autoLink"${autoLink ? ' checked' : ''}> Neue Leistungen automatisch mit der vorherigen verknüpfen</label>
      <p class="bph-mu">Gilt auf diesem Gerät. Beides lässt sich auch im Reiter „Leistung“ umschalten.</p>
      <h4>Kataloge, Phasen, Firmen und Vorlagen</h4>
      <p class="bph-mu">Leistungskatalog und Vorlagen pflegst du im Reiter „Leistungskatalog“, den Planungsassistenten über ✦ in der Leiste. Frühere Stände lassen sich hier zurückholen.</p>
      <div class="bph-row"><button type="button" class="bph-btn" data-gs="verlauf">🕘 Verlauf der Kataloge und Einstellungen</button></div>`;
  };
  host.onchange = (e) => {
    const k = e.target.dataset.gs;
    if (k === 'delAsk') { LS.set('delAsk', e.target.checked); updateRibbon(); }
    if (k === 'autoLink') { autoLink = e.target.checked; LS.set('autolink', autoLink); updateRibbon(); }
  };
  host.onclick = (e) => { if (e.target.closest('[data-gs="verlauf"]')) ACTIONS.verlaufKatalog(); };
  draw();
}
if (window.BPHead && BPHead.appEinstellungen) BPHead.appEinstellungen([{ key: 'gantt', label: 'Bauzeitenplan', render: (h) => ganttSettings(h) }]);

async function boot() {
  const gw = LS.get('gw', null); if (gw) document.documentElement.style.setProperty('--gw', gw + 'px');
  showTab(LS.get('tab', 'vorgang'));
  autoLink = LS.get('autolink', true);
  try {
    projects = await planApi.list();
    let id = LS.get('last', null);
    const hp = /^#plan=([\w-]+)/.exec(location.hash);   // Link aus der Verwaltung: diesen Plan öffnen
    if (hp && projects.some((p) => p.id === hp[1])) {
      id = hp[1];
      const ht = /[&#]tab=(\w+)/.exec(location.hash); if (ht) showTab(ht[1]);   // z. B. aus den Adressen: „Gewerke & Firmen“
      history.replaceState(null, '', location.pathname);
    }
    if (id === '__geschlossen__' && projects.length) { await refreshProjectList(); $('#projTitle').textContent = 'Kein Projekt geöffnet'; $('#projSub').textContent = 'Klicken zum Öffnen oder Anlegen'; setNoProject(true); renderStart(); if (LS.get('assistOpen', false)) setAssistOpen(true); return; }
    if (!hp) {   // Projekt aus der zuletzt benutzten App: dessen Plan (verknüpft oder gleiche Projektnummer)
      await new Promise((ok) => (document.readyState === 'loading' ? addEventListener('DOMContentLoaded', ok) : ok()));
      if (window.BPHead && BPHead.ready) await BPHead.ready.catch(() => null);
      const gp = window.BPHead && BPHead.projekt;
      if (gp && gp.id) {
        const nr = (gp.name.match(/^[A-Za-z]\d{3}(?:\.\d+)?/) || [''])[0].toLowerCase();
        const fit = projects.find((p) => p.id === id && p.bt_id === gp.id) || projects.find((p) => p.bt_id === gp.id)
          || (nr && projects.find((p) => !p.bt_id && p.name.toLowerCase().startsWith(nr)));
        if (fit) id = fit.id;
        else { await refreshProjectList(); await keinPlanFuer(); if (LS.get('assistOpen', false)) setAssistOpen(true); return; }   // kein fremder Plan unter diesem Projekt
      }
    }
    if (!projects.some((p) => p.id === id)) id = (projects.find((p) => !p.archived) || projects[0])?.id;
    if (!id) { const p = await planApi.create({ name: 'Startversion', start: snapWork(todayN()), tasks: [] }); id = p.id; }   // erste Version heißt wie überall „Startversion“
    await openProject(id);
    await refreshProjectList();
    const aw = LS.get('aw', null); if (aw) document.documentElement.style.setProperty('--aw', aw + 'px');
    if (LS.get('assistOpen', false)) setAssistOpen(true);
  } catch (e) { toast('Server nicht erreichbar: ' + e.message, true); }
}
/* ---------- Planungsassistent (angedockt / eigenes Fenster) ---------- */
let assistUI = null;
function setAssistOpen(v) {
  document.body.classList.toggle('assist-open', v);
  if (v && !assistUI) assistUI = AssistUI.mount($('#assistPane'), AssistCore, { docked: true, onClose: () => setAssistOpen(false), onPopout: popoutAssist });
  if (!v && assistUI) { assistUI.destroy(); assistUI = null; }
  LS.set('assistOpen', v); render();
}
function popoutAssist() {
  const w = window.open('assistent.html', 'gantt_assistent', 'width=640,height=960');
  if (!w) { toast('Das Fenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.', true); return; }
  w.focus(); setAssistOpen(false);
}
$('#split2').addEventListener('mousedown', (e) => {
  e.preventDefault(); const x0 = e.clientX, w0 = $('#assistPane').offsetWidth, sp = $('#split2'); sp.classList.add('drag');
  const mv = (ev) => { const w = Math.max(300, Math.min(innerWidth * 0.7, w0 - (ev.clientX - x0))); document.documentElement.style.setProperty('--aw', w + 'px'); };
  const up = () => { sp.classList.remove('drag'); removeEventListener('mousemove', mv); removeEventListener('mouseup', up); LS.set('aw', $('#assistPane').offsetWidth); render(); };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
});

let rzT = null;
addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => P && render(), 120); });
boot();
