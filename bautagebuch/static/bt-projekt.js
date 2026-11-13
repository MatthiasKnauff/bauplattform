/* Bautagebuch – Kopfzeile, Plattform, Start der App, Projekte wählen und anlegen, Standort, Wetter.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
function chrome() {
  const p = curProject();
  $('#pname').textContent = p ? p.name : 'Projekt wählen';
  if (window.BPHead && p && BPHead.projektSetzen) BPHead.projektSetzen(p.id);   // Kopfleiste zeigt das Projekt
  $('#paddr').textContent = p ? (addr(p) || 'Keine Adresse hinterlegt – über die Projektauswahl → „Projekt bearbeiten“ eintragen') : 'Tippe hier, um ein Projekt zu wählen';
  $('#chev').innerHTML = ic('chev', 20, 3); $('#rchev').innerHTML = ic('chev', 20, 3);
  const r = p ? curReport() : null;
  $('#repBtn').classList.toggle('hidden', !p);
  $('#rname').textContent = r && r.number != null ? String(r.number) : '';   // wie die Versionsauswahl der anderen Apps: Nummer, Datum, ▾
  $('#rdate').textContent = r ? fmt(r.date) + (r.time ? ' · ' + r.time : '') : 'Kein Bericht – anlegen';
  $('#repBtn').title = r ? `Tagesbericht Nr. ${r.number} – anderen wählen` : 'Tagesbericht anlegen';
  $('#i-n').innerHTML = ic('pin', 20) + '<span>Standort</span>'; $('#i-pdf').innerHTML = ic('pdf', 20) + '<span>PDF</span>'; $('#i-g').innerHTML = ic('grid', 20, 1.7) + '<span>Mehr</span>';
  $('#i-pdf').classList.toggle('hidden', !rid);
  $('#tabs').innerHTML = TABS.map(([k, l, i]) => `<button class="tab ${k === tab ? 'on' : ''}" data-act="tab" data-t="${k}" ${k === tab ? 'aria-current="page"' : ''}>${ic(i, 20, 2)}<span>${l}</span></button>`)
    .join('<button class="tabplus" id="tabPlus" data-act="qOpen" aria-label="Hinzufügen" title="Foto, Notiz, Mangel … hinzufügen"></button>');   // am Handy: ＋ in der Mitte der Fußleiste (statt schwebend)
  const apps = (PLATFORM.apps || []).filter(a => a.allowed && a.key !== 'bautagebuch');   // Bauplattform: andere Apps (gleiche Anmeldung)
  $('#menu').innerHTML = `<div class="who">Angemeldet: ${esc(me.name)}</div><button data-act="tab" data-t="profil">${ic('gear', 18)}Einstellungen</button>`
    + (apps.length ? '<div class="msep"></div>' + apps.map(a => `<a class="mapp" href="${esc(appUrl(a))}">${ic({ gantt: 'cal', admin: 'users', portal: 'home', adressen: 'user', aufgaben: 'clock', plaene: 'folder', baukosten: 'archive' }[a.key] || 'doc', 18)}${esc(a.name)}</a>`).join('') + '<div class="msep"></div>' : '')
    + `<button data-act="logout">${ic('out', 18)}Abmelden</button>`;
}
let PLATFORM = {};
const showApp = async () => {
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  try { PLATFORM = await api('api/platform'); } catch { PLATFORM = {}; }
  if (window.BPHead) {   // gemeinsame Kopfleiste; ⚙ → „Bautagebuch“ zeigt die Einstellungen der App im Einstellungsfenster
    BPHead.mount({ app: 'bautagebuch', name: 'Bautagebuch', parent: $('#app'), before: $('#leiste') });
    if (BPHead.beiProjektWahl) BPHead.beiProjektWahl((id) => pickProject(id));   // eine Projektauswahl: die oben in der Kopfleiste
    // ⚙ → Bautagebuch: nur noch der Bericht-Assistent – Benutzer verwaltet die Verwaltung, Firma/Ablage/Mail/Sicherung stehen unter Verwaltung → Einstellungen
    BPHead.appEinstellungen([{ key: 'bt', label: 'Bautagebuch', render: (h) => {
      const vor = tab; PH = h; tab = 'profil'; renderProfile(h);
      return () => { PH = null; tab = vor === 'profil' ? 'bericht' : vor; renderDetail(); };
    } }]);
    try { await BPHead.ready; } catch { /* ohne Kopfleiste weiter */ }
  }
  try { meta = await api('api/meta'); contacts = await api('api/contacts'); settings = await api('api/settings'); people = await api('api/people'); leaderUsers = await api('api/leaders'); await loadProjects(); } catch { return; }
  const hp = /^#projekt=(\d+)(?:&bericht=(\d+))?/.exec(location.hash), hEdit = /bearbeiten=1/.test(location.hash), hNeu = location.hash === '#neues-projekt';   // Link aus Verwaltung / Mängelliste: dieses Projekt (und diesen Bericht) öffnen
  const hs = location.hash === '#einstellungen';    // Link aus der Verwaltung → Einstellungen
  const hSchritt = location.hash === '#schritt', hMangel = location.hash === '#mangel';   // Startseite (einfache Ansicht): Bericht Schritt für Schritt / Mangel melden
  if (hp || hs || hNeu || hSchritt || hMangel) history.replaceState(null, '', location.pathname);
  const gp = window.BPHead && BPHead.projektId && BPHead.projektId();   // Projekt aus der zuletzt benutzten App
  const start = (hp && projects.find(p => p.id === +hp[1])) || (gp && projects.find(p => p.id === gp)) || projects.find(p => p.id === +localStorage.getItem('pid')) || projects.find(p => !p.archived) || projects[0];
  if (start) await openProject(start.id); else renderDetail();
  if (window.BPHead && BPHead.live) BPHead.live(['reports', 'items', 'images', 'projects'], async () => {   // Änderungen anderer im Projekt (nicht während man tippt)
    if (pid && !BWZ.open) { await openProject(pid, true); BPHead.liveNotiz(); } });
  if (hNeu) newProject(); else if (hEdit && hp && start && start.id === +hp[1]) projBearbeiten();
  if (hs && window.BPHead && BPHead.einstellungen) BPHead.einstellungen({ bereich: 'app' });
  if (hp && hp[2] && start && start.id === +hp[1] && reports.some((x) => x.id === +hp[2])) { tab = 'bericht'; rid = +hp[2]; renderDetail(); }
  else if (!hp) autoPick(true);   // Projekt per GPS wählen, wenn man vor Ort ist
  if (await backfillAddresses()) autoPick(true);
  const einfach = window.BPHead && BPHead.einfach && BPHead.einfach();
  if (hMangel) mangelMelden();   // Startseite „Mangel melden“: eigenes Fenster mit Projekt und Bericht, danach klare Wahl wie weiter
  else if ((hSchritt || einfach) && curReport() && bwzPrefs().on) bwzOpen();   // einfache Ansicht: Bericht gleich Schritt für Schritt
};
async function loadProjects() {
  projects = await api('api/projects');
  if (pid && !curProject()) { pid = null; rid = null; reports = []; }
}
async function openProject(id, keep) {
  pid = id; try { localStorage.setItem('pid', id); } catch {}
  if (window.BPHead && BPHead.projektSetzen) BPHead.projektSetzen(id);   // gilt dann auch in den anderen Apps
  reports = await api(`api/projects/${id}/reports`);
  if (!keep || !curReport()) { rid = reports[0]?.id ?? null; wxEdit = headEdit = false; adding = null; }
  await loadProjects(); renderDetail(); autoWx(); checkRename(id);
}
async function checkRename(id) {   // Wurden abgelegte Dateien auf dem Server von Hand umbenannt? Dann Rückfrage im Bericht
  if (renameSeen[id]) return; renameSeen[id] = true; renameOffer = null;
  try { const r = await api('api/store/rename-check?project_id=' + id); if (r && r.count && pid === id) { renameOffer = {...r, pid: id}; if (tab === 'bericht' && !draft) renderDetail(); } } catch {}
}
const renameBanner = () => !renameOffer || renameOffer.pid !== pid ? '' : `<div class="rnb"><b>Auf dem Server wurden Dateien von Hand umbenannt.</b>
  <div>Die App hat dein Namensschema erkannt${renameOffer.example_pdf ? ' – PDF z. B. „' + esc(renameOffer.example_pdf) + '“' : ''}${renameOffer.example_dir ? ', Fotoordner z. B. „' + esc(renameOffer.example_dir) + '“' : ''}.
  ${renameOffer.count} Datei${renameOffer.count === 1 ? '' : 'en'}/Ordner trag${renameOffer.count === 1 ? 't' : 'en'} noch den Namen der App (z. B. „${esc(renameOffer.examples[0].from)}“ → „${esc(renameOffer.examples[0].to)}“). Soll die App diese jetzt automatisch umbenennen und künftig selbst so benennen?</div>
  <div class="acts"><button class="pri" data-act="renameYes">Ja, umbenennen</button><button data-act="renameNo">Nein, nicht mehr fragen</button><button data-act="renameLater">Später</button></div></div>`;
async function backfillAddresses() {   // einmal pro Projekt ohne Adresse: aus dem Projektnamen im Internet suchen
  const todo = projects.filter(p => !addr(p) && !hasPos(p) && !(p.extra && p.extra.addr_tried));
  if (!todo.length) return false;
  let n = 0;
  for (const p of todo) { try { const r = await api(`api/projects/${p.id}/autoaddress`, 'POST'); if (r.error) return false; if (r.found) n++; } catch { return false; } }
  await loadProjects(); chrome();
  if (!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && (tab === 'projekt' || n)) renderDetail();
  if (n) toast(`Für ${n} Projekt${n === 1 ? '' : 'e'} wurde die Adresse aus dem Projektnamen ermittelt – bitte über die Projektauswahl → „Projekt bearbeiten“ prüfen.`);
  return n > 0;
}
async function pickProject(id) { draft = null; closeSheet(); if (tab !== 'projekt') tab = 'bericht'; await openProject(id); }

/* ---------- Projektauswahl ---------- */
let sheetMode = 'proj', sheetArch = false, sheetForeign = false, renameOffer = null, renameSeen = {};
function openSheet(mode = 'proj') {
  sheetMode = mode; sheetQ = ''; sheetSug = []; $('#sq').value = '';
  $('#sq').placeholder = mode === 'rep' ? 'Bericht suchen (Nummer oder Datum)' : 'Projekt suchen (Name oder Adresse)';
  $('#sheet .panel').setAttribute('aria-label', mode === 'rep' ? 'Tagesbericht wählen' : 'Projekt wählen');
  $('#pfp').classList.toggle('hidden', mode === 'rep'); $('#pfr').classList.toggle('hidden', mode !== 'rep');
  $('#sheet').classList.remove('hidden'); renderSheet(); $('#sq').focus();
}
function closeSheet() { $('#sheet').classList.add('hidden'); }
let sheetSug = [], sheetSugT = 0;
function sheetSuggest() {   // Ordner vom Server, die noch kein Projekt sind (Tippen im Auswahlfenster)
  clearTimeout(sheetSugT); const q = sheetQ.trim();
  if (!q) { sheetSug = []; return renderSheet(); }
  sheetSugT = setTimeout(async () => {
    try { const r = await api('api/store/folders?q=' + encodeURIComponent(q)); if (q === sheetQ.trim() && Array.isArray(r)) { sheetSug = r; renderSheet(); } } catch {}
  }, 250);
}
function renderSheet() {
  if (sheetMode === 'rep') {
    const q = sheetQ.toLowerCase().trim(), cur = curReport();
    const list = [...reports].sort((a, b) => (b.date + String(b.number).padStart(6, '0')).localeCompare(a.date + String(a.number).padStart(6, '0')))
      .filter(x => !q || `nr. ${x.number} ${x.number} ${fmt(x.date)} ${x.date} ${x.site_manager || ''}`.toLowerCase().includes(q));
    $('#pl').innerHTML = list.length ? list.map(x => `<button class="pi ${cur && x.id === cur.id ? 'on' : ''}" data-act="pickReport" data-id="${x.id}"><span class="l"><b>Nr. ${x.number} – ${fmt(x.date)}</b>${[x.time && x.time + ' Uhr', x.weather, x.site_manager].filter(Boolean).length ? `<small>${esc([x.time && x.time + ' Uhr', x.weather, x.site_manager].filter(Boolean).join(' · '))}</small>` : ''}</span><span class="pi-del" role="button" tabindex="0" data-act="delReportId" data-id="${x.id}" title="Bericht Nr. ${x.number} löschen (mit Rückgängig)">${ic('trash', 18)}</span></button>`).join('')
      : `<div class="empty">${reports.length ? 'Keine Treffer.' : 'Noch kein Tagesbericht.'}</div>`;
    return;
  }
  const q = sheetQ.toLowerCase(), d = p => here && hasPos(p) ? dist(here.lat, here.lon, p.lat, p.lon) : null;
  const match = p => passt([p.name, p.street, p.zip, p.city, p.client].join(' '), q);
  const foreignP = p => me.is_admin && (p.leaders || []).length > 0 && !(p.leaders || []).includes(me.id);   // nur Administratoren sehen Projekte anderer Bauleiter
  const mine = projects.filter(p => !foreignP(p)), foreign = projects.filter(foreignP);
  const list = mine.filter(p => !p.archived && match(p));
  const arch = mine.filter(p => p.archived && match(p)), archAll = mine.filter(p => p.archived).length;
  const fMatch = foreign.filter(match), showF = sheetForeign || (q.trim() && fMatch.length);
  if (here) list.sort((a, b) => (d(a) ?? 1e12) - (d(b) ?? 1e12) || b.id - a.id);
  $('#pl').innerHTML = list.length ? list.map(p => `<button class="pi ${p.id === pid ? 'on' : ''}" data-act="pickProject" data-id="${p.id}"><span class="l"><b>${esc(p.name)}</b>${addr(p) ? `<small>${esc(addr(p))}</small>` : ''}</span>${d(p) != null ? `<span class="dist">${fmtDist(d(p))}</span>` : ''}</button>`).join('')
    : (sheetSug.length || arch.length ? '' : `<div class="empty">${projects.length ? 'Keine Treffer.' : 'Noch keine Projekte.'}</div>`);
  const showA = sheetArch || (q.trim() && arch.length);   // Archiv: per Knopf oder automatisch, wenn die Suche dort etwas findet
  if (archAll) $('#pl').innerHTML += `<button class="pi arch" data-act="toggleArch">${ic('archive', 16, 2.4)} Archiv (${archAll}) ${showA && !q.trim() ? '– ausblenden' : (showA ? '' : '– anzeigen')}</button>`;
  if (showA) $('#pl').innerHTML += arch.map(p => `<button class="pi old ${p.id === pid ? 'on' : ''}" data-act="pickProject" data-id="${p.id}"><span class="l"><b>${esc(p.name)}</b>${addr(p) ? `<small>${esc(addr(p))}</small>` : ''}</span><span class="dist">archiviert</span></button>`).join('');
  if (foreign.length) {
    const lname = p => (p.leaders || []).map(i => (leaderUsers.find(u => u.id === i) || {}).name).filter(Boolean).join(', ');
    $('#pl').innerHTML = `<div class="sugh">Eigene Projekte</div>` + $('#pl').innerHTML;
    $('#pl').innerHTML += `<button class="pi arch" data-act="toggleForeign">${ic('users', 16, 2.4)} Fremde Projekte (${foreign.length}) ${showF && !q.trim() ? '– ausblenden' : (showF ? '' : '– anzeigen')}</button>`;
    if (showF) $('#pl').innerHTML += fMatch.map(p => `<button class="pi old ${p.id === pid ? 'on' : ''}" data-act="pickProject" data-id="${p.id}"><span class="l"><b>${esc(p.name)}</b><small>${esc([lname(p) && 'Bauleiter: ' + lname(p), p.archived && 'archiviert'].filter(Boolean).join(' · ') || addr(p))}</small></span></button>`).join('');
  }
  if (sheetQ.trim() && sheetSug.length) $('#pl').innerHTML += `<div class="sugh">Ordner auf dem Server – antippen legt das Projekt an</div>` +
    sheetSug.map(n => `<button class="pi" data-act="createFromFolder" data-name="${esc(n)}"><span class="l"><b>${ic('plus', 16, 3)} ${esc(n)}</b></span></button>`).join('');
}
function projBearbeiten() {   // gemeinsame Projektmaske (Kopfleiste) – true, wenn geöffnet
  if (!(window.BPHead && BPHead.projektBearbeiten) || !pid) return false;
  BPHead.projektBearbeiten(pid, { onSaved: btGespeichert, onDelete: async () => { delProject(); } });
  return true;
}
async function btGespeichert(id) { await loadProjects(); await openProject(id); }   // nach der gemeinsamen Projektmaske
function newProject() {   // dieselbe Projektmaske wie in allen Apps; ohne Kopfleiste: Eingabe im Reiter „Projekt“
  closeSheet(); $('#menu').classList.add('hidden');
  if (window.BPHead && BPHead.projektBearbeiten) return BPHead.projektBearbeiten(null, { onSaved: btGespeichert });
  draft = {name: '', client: '', street: '', zip: '', city: '', leaders: [me.id]}; tab = 'projekt'; renderDetail();
  document.querySelector('[data-dp=name]')?.focus();
}
async function createProject() {
  const d = draft; if (!d) return;
  if (!d.name.trim()) { toast('Bitte einen Projektnamen eingeben.'); document.querySelector('[data-dp=name]')?.focus(); return; }
  const r = await api('api/projects', 'POST', Object.fromEntries(Object.entries(d).map(([k, v]) => [k, typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v])));
  draft = null; tab = 'projekt'; await openProject(r.id);
  toast(r.auto_address ? 'Projekt angelegt. Adresse und PLZ wurden aus dem Projektnamen ermittelt – bitte prüfen.' : r.geocoded === true ? 'Projekt angelegt, Standort aus der Adresse ermittelt.' : r.geocoded === false ? 'Projekt angelegt, aber die Adresse wurde nicht gefunden – bitte prüfen.' : 'Projekt angelegt. Im Projektnamen wurde keine Adresse gefunden – trage sie ein oder übernimm den aktuellen Standort.');
}

/* ---------- Standort ---------- */
const HTTP_GPS = 'Der Browser (nicht die App) sperrt GPS bei Adressen mit http://. Mit https:// über den Reverse Proxy geht es. Zum Testen: Chrome/Edge → chrome://flags bzw. edge://flags → „Insecure origins treated as secure“ → diese Adresse eintragen.';
async function locate(silent) {
  const say = m => { if (!silent) toast(m); };
  if (!navigator.geolocation) { say(window.isSecureContext ? 'Dieser Browser unterstützt keine Standortbestimmung.' : HTTP_GPS); return null; }
  if (!silent) toast('Standort wird ermittelt …');
  const pos = await new Promise(ok => navigator.geolocation.getCurrentPosition(ok, e => ok(e), {timeout: silent ? 8000 : 15000, maximumAge: 120000, enableHighAccuracy: true}));
  if (!pos.coords) { say(pos.code === 1 ? (window.isSecureContext ? 'Standortzugriff wurde nicht erlaubt.' : HTTP_GPS) : 'Standort konnte nicht ermittelt werden.'); return null; }
  return here = {lat: pos.coords.latitude, lon: pos.coords.longitude};
}
async function autoPick(silent) {
  if (!projects.some(p => hasPos(p) && !p.archived)) { if (!silent) toast('Noch kein Projekt hat einen Standort. Trage über die Projektauswahl → „Projekt bearbeiten“ eine Adresse ein.'); return; }
  const h = await locate(silent); if (!h) return;
  let best = null;
  for (const p of projects) if (hasPos(p) && !p.archived) { const m = dist(h.lat, h.lon, p.lat, p.lon); if (!best || m < best.m) best = {p, m}; }
  if (best.m > NEAR_M) { if (!silent) toast(`Kein Projekt in der Nähe. Am nächsten: ${best.p.name} (${fmtDist(best.m)}).`); return; }
  if (best.p.id === pid) { if (!silent) toast(`Du bist bei „${best.p.name}“ (${fmtDist(best.m)}).`); return; }
  if (silent && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;   // nichts umschalten, während getippt wird
  closeSheet(); if (tab !== 'projekt') tab = 'bericht'; await openProject(best.p.id);
  toast(`Projekt nach Standort gewählt: ${best.p.name} (${fmtDist(best.m)})`);
}
// Wetter + Ort per GPS in den aktuellen Bericht. silent = automatischer Versuch ohne Fehlermeldungen.
const WXK = ['weather', 'precip', 'temp', 'humidity', 'wind'], wxTried = new Set();
function autoWx() {   // Bericht ohne Wetter (z. B. nachträglich angelegt): Wetter zum Berichtsdatum automatisch eintragen
  const r = curReport(); if (!r || wxTried.has(r.id) || WXK.some(k => r[k]) || !r.date) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
  wxTried.add(r.id); fillGeo(true);
}
async function fillGeo(silent, force) {   // Wetter für die ADRESSE DES PROJEKTS zum DATUM/zur Uhrzeit des Berichts (nicht GPS des Geräts)
  const r = curReport(), p = curProject(); if (!r || !p) return;
  let lat = p.lat, lon = p.lon;
  if (lat == null || lon == null) {   // noch keine Koordinaten am Projekt: aus der Adresse ermitteln
    const addr = [p.street, [p.zip, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    if (addr) { try { const h = await api('api/geocode?q=' + encodeURIComponent(addr)); if (h.found) { lat = h.lat; lon = h.lon; } } catch {} }
  }
  if (lat == null || lon == null) { if (!silent) toast('Für das Wetter bitte zuerst die Adresse im Projekt eintragen.'); return; }
  const rid0 = r.id, needAddr = !(p.zip && p.city);
  let g; try { g = await api(`api/geo?lat=${lat}&lon=${lon}&date=${encodeURIComponent(r.date || '')}&time=${encodeURIComponent(r.time || '')}${needAddr ? '' : '&noaddr=1'}`); } catch { return; }
  if (g.error) { if (!silent) toast(g.error); return; }
  if (rid0 !== (curReport() || {}).id) return;   // inzwischen anderer Bericht geöffnet
  const upd = {};
  WXK.forEach(k => { if (g[k] && (!silent || force || !r[k])) upd[k] = g[k]; });
  const plz = p.zip || g.plz, place = [p.street, p.city].filter(Boolean).join(', ') || g.place;
  if (plz) upd.plz = plz;
  upd.extra = {...(place ? {place} : {}), wx_auto: 1};
  if (!Object.keys(upd).length) { if (!silent) toast('Keine Daten erhalten.'); return; }
  await api('api/reports/' + r.id, 'PUT', upd);
  if (!silent) toast(`Wetter für die Projektadresse am ${fmt(r.date)} übernommen` + (g.partial.length ? ` (${g.partial.join(', ')} nicht verfügbar)` : '') + '.');
  await openProject(pid, true);
}

/* ---------- Bericht ---------- */
