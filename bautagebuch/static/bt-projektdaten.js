/* Bautagebuch – Projektdaten (Bauleiter, Adresse, Namenskonventionen).
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
const leaderUi = (ids, act) => `<div class="w leaders"><div class="lbl">Zuständige Bauleiter:in</div><div class="chips">${leaderUsers.map(u => `<button type="button" class="chip ${ids.includes(u.id) ? 'on' : ''}" data-act="${act}" data-id="${u.id}" aria-pressed="${ids.includes(u.id)}">${esc(u.name)}</button>`).join('') || '<small>Noch keine Benutzer:innen angelegt.</small>'}</div>
  <small class="lnote">${ids.length ? 'Nur die ausgewählten Bauleiter:in und die Administratoren sehen dieses Projekt in der Projektauswahl. Alle Ausgewählten dürfen weitere Bauleiter:innen ergänzen oder entfernen.' : 'Niemand ausgewählt: alle Benutzer:innen sehen dieses Projekt.'}</small></div>`;
const PFIELDS = [['name','Bauvorhaben *','text','w'],['client','Bauherrschaft (Name und Anschrift)','text','w'],['street','Straße und Hausnummer','text','w'],['zip','PLZ'],['city','Ort']];
function posInfo(p) {
  const auto = p.extra && p.extra.addr_auto ? 'Adresse und PLZ wurden automatisch aus dem Projektnamen ermittelt – bitte prüfen. ' : '';
  return auto + (hasPos(p) ? `Standort gespeichert (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}). Damit wählt die App dieses Projekt automatisch, wenn du vor Ort bist.`
    : 'Noch kein Standort. Ohne Standort kann die App dieses Projekt nicht automatisch per GPS wählen. Adresse eintragen oder „Aktuellen Standort übernehmen“ drücken.');
}
let sugT = 0;
function suggestProjects(q) {   // Vorschläge aus den Serverordnern (native Auswahlliste des Browsers)
  clearTimeout(sugT);
  sugT = setTimeout(async () => {
    const dl = $('#dl-proj'); if (!dl || !q.trim()) return;
    const r = await api('api/store/folders?q=' + encodeURIComponent(q.trim()));
    if (Array.isArray(r) && $('#dl-proj') && draft && draft.name === q) $('#dl-proj').innerHTML = r.map(n => `<option value="${esc(n)}"></option>`).join('');
  }, 250);
}
function renderDraft(box) {
  box.innerHTML = `<div class="wrap"><div class="cform"><h3>Neues Projekt</h3>
    ${PFIELDS.map(([k, l, t = 'text', w]) => `<label class="${w ? 'w' : ''}">${l}<input data-dp="${k}" type="${t}" value="${esc(draft[k])}" autocomplete="off"${k === 'name' ? ' list="dl-proj"' : ''}${listAttr(k)}></label>`).join('')}
    <datalist id="dl-proj"></datalist>${clientList()}${addrLists()}${leaderUi(draft.leaders || [], 'ldrDraft')}
    <div class="info">Beim Tippen des Namens werden vorhandene Projektordner vom Server vorgeschlagen (wenn die Ablage eingerichtet ist). Bei „Bauherrschaft“ schlägt die App Kontakte mit dem Gewerk „Bauherr:in“ bzw. „Bauherrin“ vor. Mit einer Adresse bestimmt die App den Standort automatisch und wählt das Projekt später per GPS, wenn du vor Ort bist.</div>
    <div class="acts"><button data-act="cancelDraft">Abbrechen</button><button class="pri" data-act="createProject">Projekt anlegen</button></div></div></div>`;
}
function projContactUi(p) {   // Baustellenadresse auch in die Kontakte (Adressdatenbank) – Name wird abgefragt
  const e = p.extra || {}, linked = e.contact_id && contacts.find(c => c.id === e.contact_id);
  if (linked) return `<div class="info w">In den Kontakten gespeichert als <button type="button" data-act="gotoContact" data-id="${linked.id}" style="display:inline;padding:0;color:var(--y);font-weight:700">${esc(linked.name)}</button>. Änderungen der Adresse werden dort mitgeführt.</div>`;
  if (e.contact_declined || !addr(p)) return '';
  return `<div class="rnb w"><b>Baustellenadresse auch in den Kontakten speichern?</b>
    <label>Name des Kontakts<input id="pcName" value="${esc(p.name)}" autocomplete="off"></label>
    <div class="acts"><button class="pri" data-act="pcSave">In Kontakte speichern</button><button data-act="pcNo">Nein, nicht mehr fragen</button></div></div>`;
}
function renderProject(box) {
  if (draft) { renderDraft(box); return; }
  const p = curProject();
  if (!p) { renderReport(box); return; }
  box.innerHTML = `<div class="wrap"><div class="cform"><h3>Projekt</h3>
    ${PFIELDS.map(([k, l, t = 'text', w]) => `<label class="${w ? 'w' : ''}">${l}<input data-pf="${k}" type="${t}" value="${esc(p[k])}" autocomplete="off"${listAttr(k)}></label>`).join('')}${clientList()}${addrLists()}${leaderUi(p.leaders || [], 'ldrEdit')}${projContactUi(p)}
    <label class="w">Projektordner auf dem Server (leer = automatisch über das Kürzel suchen; Unterordner mit / trennen, z. B. A450 Haupt/A450.22 Unter)<input data-pf="folder" value="${esc(p.folder)}" autocomplete="off"></label>
    <div class="info w" id="pnames">Namenskonventionen werden geladen …</div>
    <div class="info" id="pinfo">${esc(posInfo(p))}</div>
    ${mapBlock(hasPos(p) ? p.lat + ',' + p.lon : [p.street, [p.zip, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), true)}
    <div class="acts"><button data-act="geoSearch">Adresse suchen</button><button data-act="geoHere">Aktuellen Standort übernehmen</button><button data-act="archProject">${p.archived ? 'Aus dem Archiv holen' : 'Projekt archivieren'}</button><button class="bad" data-act="delProject">Projekt löschen</button></div>
    ${p.archived ? '<div class="info">Dieses Projekt ist archiviert: Es erscheint nicht in der Projektauswahl und wird nicht per GPS gewählt. Wiederfinden: Verwaltung → Projekte → „Archiv“ oder dort einfach suchen.</div>' : ''}
    <div class="info">„Adresse suchen“ nutzt die eingetragene Adresse, ohne Eintrag den Projektnamen (ohne Kürzel wie A481); die PLZ wird im Internet nachgeschlagen.</div></div></div>`;
  loadNames(p.id);
}
async function loadNames(id) {   // im Projekt aktive Namenskonventionen (Ordner, PDF-Name, Fotoordner)
  const box = $('#pnames'); if (!box) return;
  try {
    const n = await api('api/store/names?project_id=' + id); if (!$('#pnames') || id !== pid) return;
    const row = (l, v) => `<div><b>${l}:</b> <code>${esc(v)}</code></div>`;
    let open = true; try { open = localStorage.getItem('namesOpen') !== '0'; } catch {}
    box.innerHTML = `<details ${open ? 'open' : ''}><summary><b>Aktive Namenskonventionen</b> (${n.scheme ? 'Schema dieses Projekts' : 'Standard der App'})</summary>`
      + row('PDF-Datei', n.pdf_name) + row('PDF-Ordner', n.pdf_dir) + row('Fototag-Ordner', n.photo_dir.replace('{Tagesordner}', n.photo_name))
      + (n.scheme ? row('Muster PDF', n.pdf_tpl) + row('Muster Fotoordner', n.dir_tpl) : '')
      + `<small>Beispiele mit Datum ${esc(fmt(n.date))}. ${n.scheme ? 'Das Schema wurde von vorhandenen Namen auf dem Server übernommen.' : 'Werden Dateien auf dem Server von Hand umbenannt, fragt die App beim Öffnen, ob sie das Schema übernehmen soll.'}</small></details>`;
    box.querySelector('details').addEventListener('toggle', e => { try { localStorage.setItem('namesOpen', e.target.open ? '1' : '0'); } catch {} });
  } catch { box.remove(); }
}
async function saveProjectField(t) {
  const p = curProject(), k = t.dataset.pf; let v = t.value.trim().replace(/\s+/g, ' ');
  if (k === 'name' && !v) { toast('Der Name darf nicht leer sein.'); t.value = p.name; return; }
  const res = await api('api/projects/' + pid, 'PUT', {[k]: v});
  if (res.error) { toast(res.error); t.value = p[k]; return; }
  t.value = v; await loadProjects(); chrome();
  const q = curProject(); $('#pinfo').textContent = posInfo(q);
  if (res.geocoded === true) toast('Standort aus der Adresse ermittelt.');
  else if (res.geocoded === false) toast('Adresse nicht gefunden – bitte prüfen (oder „Aktuellen Standort übernehmen“).');
}
async function geoSearch() {
  const p = curProject(), a = [p.street, [p.zip, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  toast('Adresse wird gesucht …');
  const g = await api('api/geocode?q=' + encodeURIComponent(a || p.name) + (a ? '' : '&from_name=1'));
  if (!g.found) { toast('Adresse nicht gefunden. Bitte Straße, PLZ und Ort eintragen.'); return; }
  await api('api/projects/' + pid, 'PUT', {street: g.street, zip: g.zip, city: g.city, lat: g.lat, lon: g.lon, extra: {addr_auto: !a}});
  await loadProjects(); renderDetail(); toast('Adresse und Standort übernommen. Bitte kurz prüfen.');
}
async function geoHere() {
  const h = await locate(false); if (!h) return;
  let g; try { g = await api(`api/geo?lat=${h.lat}&lon=${h.lon}`); } catch { return; }
  const upd = {lat: h.lat, lon: h.lon}; if (!g.error) Object.assign(upd, {street: g.street || '', zip: g.plz || '', city: g.city || ''});
  await api('api/projects/' + pid, 'PUT', upd);
  await loadProjects(); renderDetail(); toast(g.error ? 'Standort gespeichert (Adresse nicht abrufbar).' : 'Adresse und Standort vom aktuellen Standort übernommen.');
}
async function archProject(flag) {
  const id = pid, on = flag ?? !curProject().archived, name = curProject().name;
  await api('api/projects/' + id, 'PUT', {archived: on ? 1 : 0}); await loadProjects();
  if (on) { const nx = projects.find(x => !x.archived); if (nx) await openProject(nx.id); else renderDetail(); }
  else renderDetail();
  rueckgaengig(on ? `„${name}“ archiviert – zu finden in der Verwaltung → Projekte → Archiv.` : `„${name}“ ist wieder aktiv.`, async () => { pid = id; await archProject(!on); if (!on) await openProject(id); else renderDetail(); });
}
async function delProject() {
  const id = pid, name = (curProject() || {}).name || 'Projekt';
  const r = await api('api/projects/' + id, 'DELETE'); pid = null; rid = null; reports = []; await loadProjects();
  if (projects[0]) { tab = 'bericht'; await openProject(projects[0].id); } else renderDetail();
  if (typeof r.papierkorb === 'number') rueckgaengig(`„${name}“ liegt im Papierkorb.`, async () => {   // aus dem Papierkorb zurückholen
    const w = await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); if (w.error) { toast(w.error); return; }
    await loadProjects(); if (projects.some(x => x.id === id)) await openProject(id); else renderDetail();
  });
}

/* ---------- Kontakte ---------- */
