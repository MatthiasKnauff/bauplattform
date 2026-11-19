/* Bautagebuch – Namenskonventionen (Gruppe „Bautagebuch“ der gemeinsamen Projektdaten-Maske, head.js) und Projekt löschen.
   Bauvorhaben, Bauleitung, Adresse, Standort: nur noch die gemeinsame Maske (BPHead.projektDaten) – der eigene Reiter „Projekt“ ist weg (18.11.2026).
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
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
async function delProject() {
  const id = pid, name = (curProject() || {}).name || 'Projekt';
  const r = await api('api/projects/' + id, 'DELETE'); pid = null; rid = null; reports = []; await loadProjects();
  if (projects[0]) { tab = 'bericht'; await openProject(projects[0].id); } else renderDetail();
  if (typeof r.papierkorb === 'number') rueckgaengig(`„${name}“ liegt im Papierkorb.`, async () => {   // aus dem Papierkorb zurückholen
    const w = await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); if (w.error) { toast(w.error); return; }
    await loadProjects(); if (projects.some(x => x.id === id)) await openProject(id); else renderDetail();
  }, { neu: async () => { await loadProjects(); renderDetail(); } });
}

/* ---------- Kontakte ---------- */
