/* Bautagebuch – Zeichnen, Hinzufügen, Fotos, Tastatur und Klicks, Start.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
function renderDetail() {
  chrome();
  if (tab === 'profil' && PH && document.body.contains(PH)) { renderProfile(PH); return; }
  if (tab === 'profil' && window.BPHead && BPHead.einstellungen) { tab = 'bericht'; BPHead.einstellungen({ bereich: 'app' }); }
  const box = $('#detail'); box.classList.toggle('fill', tab === 'kontakte');
  $('#fab').classList.toggle('hidden', !(tab === 'bericht' && curProject() && curReport())); $('#fab').innerHTML = ic('plus', 22, 2.4);
  { const tp = $('#tabPlus'); if (tp) { tp.innerHTML = ic('plus', 22, 2.4); tp.disabled = !(tab === 'bericht' && curProject() && curReport()); } }
  ({bericht: renderReport, projekt: renderProject, kontakte: renderContacts, profil: renderProfile, suche: renderSearch}[tab])(box);
}

async function saveDue(pan, close) {   // Datum + Uhrzeit des Erinnerungs-Panels speichern
  const id = +pan.dataset.it, d = pan.querySelector('[data-dp=date]').value, tm = pan.querySelector('[data-dp=time]').value || '09:00';
  if (!d) return;
  const it = curReport().items.find(x => x.id === id); if (it) { it.due = d; it.due_time = tm; }
  await track(api('api/items/' + id, 'PUT', {due: d, due_time: tm}));
  if (!me.email) toast('Für die Erinnerung fehlt deine E-Mail-Adresse – bitte in der Verwaltung → Benutzer:in eintragen lassen.');
  else toast('Erinnerung per E-Mail am ' + fmt(d) + ' um ' + tm + ' Uhr eingetragen.');
  if (close) { dueEditId = null; renderDetail(); }
}
async function addItem(kind) {
  const inp = (q && document.querySelector(`#qs [data-add="${kind}"]`)) || document.querySelector(`[data-add="${kind}"]`), t = inp?.value.trim();
  if (!t) return;
  const row = inp.closest('.addrow,.qadd'), body = {kind, text: t};
  if (row.querySelector('[data-add-act]')) {
    const a = row.querySelector('[data-add-act]').value.trim(), n = row.querySelector('[data-add-cnt]').value;
    if (a) body.activity = a;              // leer: Tätigkeit nach Bauzeitenplan bzw. Gewerk vorschlagen (Server)
    if (n !== '') body.headcount = +n;     // leer: 1 Anwesender
  }
  const co = row.querySelector('[data-add-co]'); if (co) body.company = co.value.trim();
  const dd = row.querySelector('[data-add-due]'); if (dd && dd.value) { body.due = dd.value; body.due_time = row.querySelector('[data-add-time]').value || '09:00'; }
  const res = await api(`api/reports/${rid}/items`, 'POST', body);
  if (body.due && !me.email) toast('Für die Erinnerung fehlt deine E-Mail-Adresse – bitte in der Verwaltung → Benutzer:in eintragen lassen.');
  if (res.error) { toast(res.error); return; }
  if (addFiles.length && res.id) { const fs = addFiles; addFiles = []; await uploadPhotos(fs, res.id); }
  if (res.contact_created) toast(`„${res.name}“ wurde zu den Kontakten hinzugefügt.`);
  if (res.contact_id) contacts = await api('api/contacts');
  const war = q && q.mangel ? (q.n || 0) + 1 : 0;
  adding = null; q = null; renderQ(); setSecOpen(kind, true); document.activeElement?.blur();   // Eingabezeile und iPhone-Tastatur schließen sich nach dem Hinzufügen
  await openProject(pid, true);
  if (war) { q = {step: 'mangel-ok', n: war}; renderQ(); }
}
// iPhone: Am Anfang/Ende einer Liste „gummiert“ Safari sonst die ganze App mit (Kopf verschwindet, leere Fläche). Solche Wischer werden gestoppt.
(() => {
  let y0 = 0;
  const scroller = el => { for (; el && el !== document.body; el = el.parentElement) { const o = getComputedStyle(el).overflowY; if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el; } return null; };
  document.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, {passive: true});
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 1) return;
    const dy = e.touches[0].clientY - y0, el = scroller(e.target);
    if (!el || (dy > 0 && el.scrollTop <= 0) || (dy < 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1)) { if (e.cancelable) e.preventDefault(); }
  }, {passive: false});
})();
/* ---------- Schnell hinzufügen (runder Knopf + Fenster von unten) ---------- */
let q = null, qFiles = [], qTyping = false;   // q: {step: 'menu' | 'add' | 'assign', kind}
const listSecs = () => meta.sections.filter(x => x.type === 'list');
const heuteIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
async function mangelMelden(n = 0) {   // von der Startseite: Bericht von heute (sonst neu anlegen) und gleich das Mängelfenster
  if (!pid) { toast('Bitte zuerst ein Projekt wählen.'); return; }
  const heute = reports.find((x) => x.date === heuteIso());
  if (heute) rid = heute.id;
  else { const r = await api(`api/projects/${pid}/reports`, 'POST', {time: new Date().toTimeString().slice(0, 5)}); if (r.error) { toast(r.error); return; } rid = r.id; await openProject(pid, true); }
  tab = 'bericht'; renderDetail(); adding = null; addFiles = [];
  q = {step: 'add', kind: 'maengel', mangel: true, n}; renderQ();
}
function renderQ() {
  const box = $('#qs'); if (!q) { qTyping = false; box.classList.remove('typing'); box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.classList.remove('hidden');
  const close = `<button data-act="qClose" aria-label="Schließen">${ic('x', 20, 2.4)}</button>`;
  let h = '';
  if (q.step === 'menu') {
    h = `<h4>Hinzufügen${close}</h4><div class="qgrid"><button data-act="qCam">${ic('cam', 28)}Foto aufnehmen</button><button data-act="qLib">${ic('pdf', 28)}Foto aus Mediathek</button>
      ${listSecs().map(x => `<button data-act="qAdd" data-kind="${esc(x.key)}">${ic('plus', 28, 2.6)}${esc(x.title)}</button>`).join('')}<button data-act="addReport">${ic('doc', 28)}Neuer Bericht</button></div>`;
  } else if (q.step === 'add') {
    const x = listSecs().find(t => t.key === q.kind), lk = x.extra && x.extra.link_contacts;
    const first = lk ? `<div class="sgw" style="flex:1 1 100%"><input data-add="${esc(x.key)}" data-sg="1" placeholder="${esc(x.placeholder)}" autocomplete="nope" name="bt-add" autocorrect="off" spellcheck="false" enterkeyhint="next"><div class="sug hidden"></div></div>
        <textarea class="ed" rows="1" data-add-act placeholder="Art der Tätigkeit"></textarea><input data-add-cnt type="number" min="0" placeholder="Anz." aria-label="Anzahl Mitarbeiter:in">`
      : `<textarea data-add="${esc(x.key)}" rows="4" placeholder="${esc(x.placeholder)}"></textarea>`;
    const due = x.extra && x.extra.due ? `<label class="dl"><span class="dlt">Erinnerung per E-Mail (optional)</span><input type="date" data-add-due aria-label="Erledigen bis"> <span>um</span> ${timeSelect('09:00', 'data-add-time')}
        <span class="chips"><button class="chip" data-act="qDate" data-d="0">Heute</button><button class="chip" data-act="qDate" data-d="1">Morgen</button><button class="chip" data-act="qDate" data-d="7">+1 Woche</button></span></label>` : '';
    const ziel = q.mangel && curReport() ? `<p class="qziel">Projekt <b>${esc(curProject()?.name || '')}</b> · Bautagebuch Nr. ${curReport().number} vom ${fmt(curReport().date)}${curReport().date === heuteIso() ? ' (heute)' : ''}<br><small>Foto, Firma und Beschreibung genügen – die Mängelrüge schreibst du später unter Aufgaben &amp; Mängel.</small></p>` : '';
    h = `<h4>${q.mangel ? 'Mangel melden' : esc(x.title)}${close}</h4>${ziel}<div class="qadd">${lk ? '' : coAdd(x)}${first}${due}${photoAdd(x)}<div class="qact"><button class="ok" data-act="addItem" data-kind="${esc(x.key)}">${q.mangel ? 'Mangel speichern' : 'Hinzufügen'}</button></div></div>`;
  } else if (q.step === 'mangel-ok') {
    h = `<h4>Mangel gespeichert${close}</h4><p class="qziel">Er steht im Bautagebuch Nr. ${curReport()?.number ?? ''} vom ${fmt(curReport()?.date)} von <b>${esc(curProject()?.name || '')}</b>${q.n > 1 ? ` – ${q.n} Mängel in dieser Runde` : ''}.</p>
      <div class="qpick"><button data-act="mangelNoch">${ic('plus', 20, 2.6)} Weiteren Mangel melden</button><button data-act="mangelBericht">${ic('doc', 20)} Im Bericht ansehen</button><button data-act="mangelStart">${ic('home', 20)} Zurück zur Startseite</button></div>`;
  } else if (q.step === 'assign') {
    const cands = listSecs().filter(t => fotoOk(t)).flatMap(t => curReport().items.filter(i => i.kind === t.key).map((i, n) => ({id: i.id, label: ((t.extra && t.extra.photo_label) || t.title) + ' ' + (n + 1), text: i.text})));
    h = `<h4>Foto zuordnen${close}</h4><div class="qpick"><button data-act="qAssign" data-id="">Nur unter „Bilder“ ablegen</button>
      ${cands.map(c => `<button data-act="qAssign" data-id="${c.id}"><small>${esc(c.label)}</small>${esc(c.text.slice(0, 60))}</button>`).join('')}</div>`;
  }
  box.innerHTML = `<div class="qp" role="dialog">${h}</div>`;
  box.classList.toggle('typing', qTyping);
  const f = box.querySelector('textarea,input[data-add]'); if (f && q.step === 'add') setTimeout(() => f.focus(), 50);
}
/* Bilder hineinziehen: auf einen Eintrag → an diesen Eintrag, auf einen Abschnitt → neuer Eintrag dort (Text eingeben, Foto ist schon dabei),
   auf „Bilder“ oder sonst wohin im Bericht → unter Bilder. Im Bericht bleiben es Vorschaubilder, im Ausdruck stehen sie auf Zusatzseiten. */
const istBild = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|heic|heif|webp|gif)$/i.test(f.name || '');
const dateienIn = (e) => [...(e.dataTransfer && e.dataTransfer.types || [])].includes('Files');
document.addEventListener('dragover', (e) => {
  if (!rid || !dateienIn(e)) return;
  const z = e.target.closest && e.target.closest('[data-drop]'); if (!z && !e.target.closest('#detail,.detail,main')) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  document.querySelectorAll('.sec.over,.ln.over').forEach((x) => x.classList.remove('over'));
  const ln = e.target.closest && e.target.closest('.ln'); (ln && ln.querySelector('[data-it]') ? ln : z)?.classList.add('over');
});
document.addEventListener('dragleave', (e) => { if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) document.querySelectorAll('.sec.over,.ln.over').forEach((x) => x.classList.remove('over')); });
document.addEventListener('drop', async (e) => {
  if (!rid || !dateienIn(e)) return;
  const fs = [...e.dataTransfer.files].filter(istBild); document.querySelectorAll('.sec.over,.ln.over').forEach((x) => x.classList.remove('over'));
  const z = e.target.closest && e.target.closest('[data-drop]'); if (!z && !e.target.closest('#detail,.detail,main')) return;
  e.preventDefault(); if (!fs.length) { toast('Nur Bilder (JPG, PNG, HEIC …) lassen sich hier ablegen.'); return; }
  const ln = e.target.closest && e.target.closest('.ln'), it = ln && ln.querySelector('[data-it]');
  if (it) { await uploadPhotos(fs, +it.dataset.it); toast(fs.length > 1 ? `${fs.length} Fotos am Eintrag` : 'Foto am Eintrag'); return; }
  const k = z && z.dataset.drop;
  if (k) { adding = k; addFiles = fs; setSecOpen(k, true); renderDetail(); renderApv(); setTimeout(() => document.querySelector(`[data-add="${k}"]`)?.focus(), 50); toast('Text zum neuen Eintrag eingeben – das Foto ist schon dabei.'); return; }
  await uploadPhotos(fs, null);
});
async function uploadPhotos(files, itemId) {   // jedes Foto einzeln, klare Meldung mit „Nochmal“ (bt-kern.js)
  const r = await fotosHochladen(files, itemId);
  if (r.ok) { setSecOpen('bilder', true); await openProject(pid, true); }
  await fotosMelden(r, (fs) => uploadPhotos(fs, itemId));
}
function photoPicked(e) {
  qFiles = [...e.target.files]; e.target.value = ''; if (!qFiles.length) return;
  const has = listSecs().some(t => fotoOk(t) && curReport().items.some(i => i.kind === t.key));
  if (!has) { q = null; renderQ(); uploadPhotos(qFiles, null); } else { q = {step: 'assign'}; renderQ(); }
}
const addPicked = e => { addFiles.push(...e.target.files); e.target.value = ''; renderApv(); };
$('#acam').onchange = addPicked; $('#alib').onchange = addPicked;
$('#qcam').onchange = photoPicked; $('#qlib').onchange = photoPicked;
function showSug(inp) {   // eigene Kontaktliste statt <datalist>: erscheint bei jedem Antippen/Tippen, nicht nur beim ersten Mal
  const box = inp.parentElement.querySelector('.sug'); if (!box) return;
  const q = inp.value.trim().toLowerCase(), hits = contacts.filter(c => (c.trade || '').trim().toLowerCase() !== 'baustelle').filter(c => !q || passt(c.name, q)).filter(c => c.name.toLowerCase() !== q).slice(0, 8);
  box.innerHTML = hits.map(c => `<button type="button" data-act="pickContact" data-name="${esc(c.name)}">${esc(c.name)}</button>`).join('');
  box.classList.toggle('hidden', !hits.length);
}
const hideSug = () => document.querySelectorAll('.sug').forEach(b => b.classList.add('hidden'));
document.addEventListener('focusin', e => { if (e.target.dataset && e.target.dataset.sg) showSug(e.target); });
document.addEventListener('click', e => { if (e.target.dataset && e.target.dataset.sg) showSug(e.target); });
document.addEventListener('input', e => {
  if (e.target.id === 'btq') {   // Suchfeld in der Reiterzeile: Treffer im Inhalt, leeres Feld → zurück
    sr.q = e.target.value; clearTimeout(sr.T);
    if (!sr.q.trim()) { if (tab === 'suche') { tab = sr.vor || 'bericht'; chrome(); renderDetail(); } return; }
    if (tab !== 'suche') { sr.vor = tab; tab = 'suche'; chrome(); renderDetail(); } else { const h = document.querySelector('#detail h3'); if (h) h.firstChild.textContent = `Suche nach „${sr.q}“ `; }
    sr.T = setTimeout(doSearch, 250); return;
  }
  if (e.target.dataset && e.target.dataset.sg) showSug(e.target); });
document.addEventListener('focusout', e => { if (e.target.dataset && e.target.dataset.sg) setTimeout(hideSug, 200); });
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.sug, .adrsug')) e.preventDefault(); });   // Eingabefeld behält den Fokus
// Schnell-Fenster: Beim Tippen rückt es nach OBEN unter die Kopfzeile, damit die iPhone-Tastatur es nie verdeckt (Safari verschiebt sonst die Seite)
document.addEventListener('focusin', e => { if (e.target.closest && e.target.closest('#qs') && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { qTyping = true; $('#qs').classList.add('typing'); } });
// Eingabelage (oben, Platz für die Tastatur) bleibt, bis das Fenster zu ist – sonst springt es beim Klick in eine freie Stelle
const fitApp = () => {   // App-Höhe = sichtbarer Bereich (mit Tastatur kleiner, ohne wieder voll)
  const vv = window.visualViewport, a = $('#app'); if (!vv || !a) return;
  const bz = $('#bwz');   // Assistent: genau in den sichtbaren Bereich über der Tastatur legen, beim Tippen nach oben
  if (bz) {
    const f = document.activeElement, kbz = vv.height < innerHeight - 120 && /^(INPUT|TEXTAREA|SELECT)$/.test(f?.tagName || '');
    bz.style.top = vv.offsetTop + 'px'; bz.style.height = vv.height + 'px'; bz.style.bottom = 'auto';
    bz.classList.toggle('kb', kbz);
    if (kbz && f && bz.contains(f)) {   // iPhone: Seite NICHT verschieben (sonst sitzt das Fenster unter der Tastatur), nur im Fenster scrollen
      const bb = f.closest('.bb');
      if (bb) { const r = f.getBoundingClientRect(), rb = bb.getBoundingClientRect(); if (r.bottom > rb.bottom - 8 || r.top < rb.top) bb.scrollTop += r.top - rb.top - 40; }
      return;
    }
  }
  if (qTyping) { a.style.height = ''; if (vv.offsetTop || vv.pageTop) window.scrollTo(0, 0); return; }   // Schnell-Fenster sitzt oben: keine Höhenanpassung nötig
  a.style.height = Math.abs(vv.height - innerHeight) < 2 ? '' : vv.height + 'px';
  const kb = vv.height < innerHeight - 120 && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
  document.body.classList.toggle('kb', kb);   // Tastatur offen: Tab-Leiste und + ausblenden, mehr Platz zum Tippen
  if (kb) setTimeout(() => document.activeElement?.scrollIntoView?.({ block: 'nearest' }), 80);
  if (vv.offsetTop || vv.pageTop) window.scrollTo(0, 0);
};
if (window.visualViewport) { visualViewport.addEventListener('resize', fitApp); visualViewport.addEventListener('scroll', fitApp); }
document.addEventListener('focusin', e => {   // Assistent: der Tastatur folgen, solange sie aufgeht (iPhone animiert ~300 ms)
  if (!(e.target.closest && e.target.closest('#bwz'))) return;
  const t0 = Date.now(); const lauf = () => { fitApp(); if (Date.now() - t0 < 900) requestAnimationFrame(lauf); }; lauf();
});
const resetView = () => { if (!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) { window.scrollTo(0, 0); document.body.scrollTop = 0; document.documentElement.scrollTop = 0; } };   // iPhone: nach der Tastatur sitzt die Seite sonst verschoben
document.addEventListener('focusout', () => { setTimeout(() => { resetView(); fitApp(); }, 120); setTimeout(() => { resetView(); fitApp(); }, 450); });
if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (visualViewport.height > innerHeight - 80) setTimeout(resetView, 60); });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.img) e.target.blur(); });   // Beschreibung mit Enter abschließen
document.addEventListener('focusout', e => {   // leere Eingabezeile schließt sich, sobald man woanders hintippt
  const row = e.target.closest && e.target.closest('.addrow'); if (!row || row.classList.contains('qadd')) return;
  setTimeout(() => {
    if (!row.isConnected || row.contains(document.activeElement)) return;
    if ([...row.querySelectorAll('input,textarea')].some(x => x.value.trim())) return;
    adding = null; renderDetail();
  }, 200);
});

document.addEventListener('click', async e => {
  if (e.target.matches && e.target.matches('input[type=date],input[type=time],input[type=datetime-local]')) { try { e.target.showPicker(); } catch {} }   // Auswahl-Dialog direkt öffnen
  if (!e.target.closest('.menu') && !e.target.closest('#i-g')) $('#menu').classList.add('hidden');
   // Fenster schließen nie durch Daneben-Klicken – nur mit ✕ bzw. Esc
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
  const a = b.dataset.act, id = +b.dataset.id;
  if (DANGER.has(a) && !arm(b, a + (b.dataset.id || ''))) return;
  if (a === 'logout') { await api('api/logout', 'POST'); showLogin(); }
  else if (a === 'srZu') { $('#btq').value = ''; sr.q = ''; tab = sr.vor || 'bericht'; chrome(); renderDetail(); }
  else if (a === 'tab') { $('#menu').classList.add('hidden'); tab = b.dataset.t; if ($('#btq')) { $('#btq').value = ''; sr.q = ''; } if (tab !== 'projekt') draft = null; cfrom = null; renderDetail(); }
  else if (a === 'menu') $('#menu').classList.toggle('hidden');
  else if (a === 'reload') { $('#menu').classList.add('hidden'); contacts = await api('api/contacts'); await loadProjects(); if (pid) await openProject(pid, true); else renderDetail(); }
  else if (a === 'projPicker') { if (window.BPHead && BPHead.projektWahl) BPHead.projektWahl({ aktuell: pid, onPick: (id) => pickProject(id) }); else openSheet('proj'); }
  else if (a === 'repPicker') openSheet('rep');
  else if (a === 'pickReport') { closeSheet(); rid = id; wxEdit = headEdit = false; tab = 'bericht'; calOff = 0; renderDetail(); }
  else if (a === 'calM') { calOff += +b.dataset.d; const sd = document.querySelector('.btside'); if (sd) sd.outerHTML = sideHtml(curReport()); }
  else if (a === 'gehZu') { const el = document.getElementById('sec-' + b.dataset.k); if (el) el.scrollIntoView({ block: 'start' }); }
  else if (a === 'editProject') { closeSheet(); $('#menu').classList.add('hidden'); if (!pid) return toast('Bitte zuerst ein Projekt wählen.'); if (projBearbeiten()) return; draft = null; tab = 'projekt'; renderDetail(); }
  else if (a === 'closeSheet') closeSheet();
  else if (a === 'pickProject') pickProject(id);
  else if (a === 'dueEdit') { dueEditId = id; renderDetail(); }
  else if (a === 'dueDone') { dueEditId = null; renderDetail(); }
  else if (a === 'dueQuick') {
    const pan = b.closest('.duepanel'), d = new Date(Date.now() + +b.dataset.d * 864e5);
    pan.querySelector('[data-dp=date]').value = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); saveDue(pan, false);
  }
  else if (a === 'dueClear') {
    const it = (curReport()?.items || []).find(x => x.id === id), alt = it && it.due ? {due: it.due, due_time: it.due_time || '09:00'} : null;   // alten Termin merken
    dueEditId = null; await api('api/items/' + id, 'PUT', {due: ''}); openProject(pid, true);
    if (alt) rueckgaengig('Erledigungsdatum entfernt.', async () => { await api('api/items/' + id, 'PUT', alt); openProject(pid, true); });
  }
  else if (a === 'addPerson') {
    const r = curReport(), v = r.site_manager ? r.site_manager.replace(/[,\s]+$/, '') + ', ' + b.dataset.name : b.dataset.name;
    r.site_manager = v; await api('api/reports/' + r.id, 'PUT', {site_manager: v}); renderDetail();
  }
  else if (a === 'createFromFolder') {
    const r = await api('api/projects', 'POST', {name: b.dataset.name}); await loadProjects(); await pickProject(r.id);
    toast(r.auto_address ? 'Projekt angelegt. Adresse und PLZ wurden aus dem Projektnamen ermittelt – bitte prüfen.' : 'Projekt angelegt. Die Adresse kannst du im Reiter „Projekt“ eintragen.');
  }
  else if (a === 'newProject') newProject();
  else if (a === 'nearest') { closeSheet(); await autoPick(false); if (!$('#sheet').classList.contains('hidden')) renderSheet(); }
  else if (a === 'geoSearch') geoSearch();
  else if (a === 'geoHere') geoHere();
  else if (a === 'delProject') delProject();
  else if (a === 'archProject') archProject();
  else if (a === 'srScope') { sr.scope = b.dataset.k; renderSearch($('#detail')); doSearch(); }
  else if (a === 'goHit') goHit(b);
  else if (a === 'bkNew') { b.disabled = true; await api('api/backups', 'POST'); toast('Datenbankversion angelegt.'); await loadBackups(); }
  else if (a === 'bkDel') { const r = await api('api/backups/' + encodeURIComponent(b.dataset.id), 'DELETE'); if (r.error) toast(r.error); await loadBackups(); }
  else if (a === 'bkRestore') { const r = await api(`api/backups/${encodeURIComponent(b.dataset.id)}/restore`, 'POST'); if (r.error) toast(r.error); else { toast('Wiederhergestellt – lade neu …'); setTimeout(() => location.reload(), 800); } }
  else if (a === 'verToggle') { verOpen = !verOpen; if (verOpen) await loadVer(); else fillVer(); }
  else if (a === 'verView') { if (verView === id) { verView = verSnap = null; } else { verView = id; verSnap = null; fillVer(); verSnap = (await api('api/versions/' + id)).data; } fillVer(); }
  else if (a === 'restoreVer') { const r = await api(`api/versions/${id}/restore`, 'POST'); if (r.error) toast(r.error); else { verView = verSnap = null; toast('Bericht auf die gewählte Version zurückgesetzt (der vorherige Stand steht im Verlauf).'); await openProject(pid, true); } }
  else if (a === 'toggleArch') { sheetArch = !sheetArch; renderSheet(); }
  else if (a === 'toggleForeign') { sheetForeign = !sheetForeign; renderSheet(); }
  else if (a === 'pcSave') {
    const r = await api('api/projects/' + pid + '/contact', 'POST', {accept: true, name: $('#pcName')?.value || ''});
    if (r.error) return toast(r.error);
    contacts = await api('api/contacts'); await loadProjects(); renderDetail(); toast('In den Kontakten gespeichert.');
  }
  else if (a === 'pcNo') { await api('api/projects/' + pid + '/contact', 'POST', {accept: false}); await loadProjects(); renderDetail(); }
  else if (a === 'adrPick') adrPick(+b.dataset.i);
  else if (a === 'cxXlsx') { location.assign('api/contacts/export.xlsx' + cxQS()); toast('Excel-Datei wird geladen …'); }
  else if (a === 'cxPdf') openPdf('api/contacts/export.pdf' + cxQS(), 'Kontakte');
  else if (a === 'renameLater') { renameOffer = null; renderDetail(); }
  else if (a === 'renameYes' || a === 'renameNo') {
    const o = renameOffer; if (!o) return; renameOffer = null; renderDetail();
    const r = await api('api/store/rename-apply', 'POST', {project_id: o.pid, accept: a === 'renameYes'});
    toast(r.error || (a === 'renameYes' ? `${r.renamed} umbenannt. Die App benennt künftig im selben Schema.` : 'Gut, die App fragt für dieses Projekt nicht mehr nach.'));
  }
  else if (a === 'openContact') { cid = id; cfrom = null; fillContactList(); fillContactDetail(); }
  else if (a === 'cback') { cid = null; cfrom = null; fillContactList(); fillContactDetail(); }
  else if (a === 'ldrDraft') { const i = +b.dataset.id, l = draft.leaders || (draft.leaders = []); l.includes(i) ? l.splice(l.indexOf(i), 1) : l.push(i); renderDetail(); }
  else if (a === 'ldrEdit') {
    const p = curProject(), i = +b.dataset.id, l = (p.leaders || []).slice(), self = me.id, alt = l.slice(), weg = l.includes(i), id = pid;
    l.includes(i) ? l.splice(l.indexOf(i), 1) : l.push(i);
    const res = await api('api/projects/' + pid, 'PUT', {leaders: l});
    if (res.error) { toast(res.error); return; }
    await loadProjects();
    if (weg) rueckgaengig(`${b.textContent.trim() || 'Bauleiter:in'} entfernt.`, async () => {   // alte Liste der Bauleiter wiederherstellen
      const x = await api('api/projects/' + id, 'PUT', {leaders: alt}); if (x.error) { toast(x.error); return; }
      await loadProjects(); if (projects.some(y => y.id === id)) await openProject(id, id === pid); else renderDetail();
    });
    if (!curProject()) { toast('Du bist bei diesem Projekt nicht mehr eingetragen – es erscheint nicht mehr in deiner Projektauswahl.'); const nx = projects.find(x => !x.archived); if (nx) await openProject(nx.id); else renderDetail(); }
    else renderDetail();
  }
  else if (a === 'createProject') createProject();
  else if (a === 'cancelDraft') { draft = null; renderDetail(); }
  else if (a === 'gotoContact') { cid = id; cfrom = 'bericht'; tab = 'kontakte'; renderDetail(); }
  else if (a === 'backReport') { cfrom = null; tab = 'bericht'; renderDetail(); }
  else if (a === 'editContact') kontaktMaske(cid);
  else if (a === 'addContact') kontaktMaske(0);
  else if (a === 'delContact') { const r = await api('api/contacts/' + cid, 'DELETE'); if (r.error) { toast(r.error); return; } cid = null; contacts = await api('api/contacts'); renderDetail(); if (r.papierkorb) toast('In den Papierkorb gelegt – dort wiederherstellbar.'); }
  else if (a === 'addReport') { q = null; renderQ(); closeSheet(); const r = await api(`api/projects/${pid}/reports`, 'POST', {time: new Date().toTimeString().slice(0, 5)}); rid = r.id; wxEdit = headEdit = false; tab = 'bericht'; await openProject(pid, true); if (bwzPrefs().on && bwzPrefs().auto) bwzOpen(); }
  else if (a === 'delReportId') {   // aus der Berichtsliste: diesen Bericht löschen (Rückgängig über die Meldung)
    const del = +b.dataset.id, nr = (reports.find(x => x.id === del) || {}).number, r = await api('api/reports/' + del, 'DELETE');
    if (r && r.error) { toast(r.error); return; }
    if (rid === del) rid = null;
    await openProject(pid); if (!$('#sheet').classList.contains('hidden')) renderSheet();
    if (r && r.undo) rueckgaengig(`Bericht Nr. ${nr} gelöscht.`, async () => { const x = await api('api/reports/' + del + '/restore', 'POST', {}); if (x.error) { toast(x.error); return; } await openProject(pid, true); if (!$('#sheet').classList.contains('hidden')) renderSheet(); toast('Bericht wiederhergestellt.'); });
  }
  else if (a === 'delReport') {
    const del = rid, r = await api('api/reports/' + del, 'DELETE'); await openProject(pid);
    if (r && r.undo) rueckgaengig('Bericht gelöscht.', async () => { const x = await api('api/reports/' + del + '/restore', 'POST', {}); if (x.error) { toast(x.error); return; } rid = del; await openProject(pid, true); toast('Bericht wiederhergestellt.'); });
  }
  else if (a === 'editHead') { headEdit = !headEdit; renderDetail(); }
  else if (a === 'gps') fillGeo(false);
  else if (a === 'wxEdit') { wxEdit = !wxEdit; renderDetail(); }
  else if (a === 'addWeg') {   // Eingabe verwerfen – mit Rückgängig (Text, Firma, Termin und Fotos kommen zurück)
    const k = b.dataset.kind, row = b.closest('.addrow'), W = {}, F = addFiles;
    row.querySelectorAll('input:not([type=file]),textarea,select').forEach((x, i) => { W[i] = x.value; });
    adding = null; addFiles = []; renderDetail(); renderApv();
    if (Object.values(W).some((v) => String(v).trim() && v !== '09:00') || F.length) rueckgaengig('Eingabe verworfen', () => { adding = k; addFiles = F; setSecOpen(k, true); renderDetail(); renderApv();
      const r2 = document.querySelector(`[data-add="${k}"]`)?.closest('.addrow'); if (r2) r2.querySelectorAll('input:not([type=file]),textarea,select').forEach((x, i) => { if (W[i] != null) x.value = W[i]; }); });
  }
  else if (a === 'adding') { adding = adding === b.dataset.kind ? null : b.dataset.kind; addFiles = []; if (adding) setSecOpen(adding, true); renderDetail(); renderApv(); }
  else if (a === 'secFokus') { btFokus = b.dataset.key || null; adding = null; renderDetail(); $('#detail').scrollTop = 0; }
  else if (a === 'secToggle') {   // auch leere Bereiche öffnen: Einträge gleich mit Eingabezeile, Bilder mit Hinweis
    const k = b.dataset.key, auf = b.dataset.open !== '1', r = curReport(), s = meta.sections.find((x) => x.key === k) || {};
    const leer = r && s.type === 'list' && !r.items.some((i) => i.kind === k);
    setSecOpen(k, auf);
    if (auf && leer) { adding = k; renderDetail(); setTimeout(() => document.querySelector(`[data-add="${k}"]`)?.focus(), 50); return; }
    if (!auf && adding === k) adding = null;
    renderDetail(); }
  else if (a === 'addItem') addItem(b.dataset.kind);
  else if (a === 'delItem') {
    const r = await api('api/items/' + id, 'DELETE'); await openProject(pid, true);
    if (r.item) rueckgaengig('Eintrag gelöscht.', async () => {
      const x = await api('api/items/restore', 'POST', r.item);
      if (x.error) toast(x.error); else await openProject(pid, true);
    });
  }
  else if (a === 'pickFile') $('#file').click();
  else if (a === 'itemPhoto') { itemPhotoFor = id; $('#ifile').click(); }
  else if (a === 'moreImgs') { allImgs = true; renderDetail(); }
  else if (a === 'lessImgs') { allImgs = false; renderDetail(); }
  else if (a === 'bwzStart') bwzOpen();
  else if (a === 'bwzStartNow') { BWZ.set = false; bwzOpen(); }
  else if (a === 'bwzSet') { if (!BWZ.open) { BWZ.open = true; } BWZ.set = !BWZ.set || !$('#bwz'); bwzRender(); }
  else if (a === 'bwzClose') bwzClose();
  else if (a === 'bwzNext') { addFiles = []; BWZ.i++; bwzRender(); $('#bwz .bb')?.scrollTo(0, 0); }
  else if (a === 'bwzPrev') { addFiles = []; BWZ.i--; bwzRender(); }
  else if (a === 'bwzAdd') bwzAdd(b.dataset.kind);
  else if (a === 'fsSet' && b.type !== 'range') fsSetzen(b);
  else if (a === 'sollGw' || a === 'sollGwNein') {   // Gewerk ohne Firma im Bauzeitenplan: Firma eintragen (Rückfluss in den Plan) oder heute ausblenden
    const r = curReport(), row = b.closest('[data-sollgw]'); if (!r || !row) return;
    const gw = row.dataset.sollgw, rId = r.id, neu = async () => { SOLL.rid = 0; await loadSoll(rId); };
    try {
      if (a === 'sollGwNein') {
        const x = await api('api/reports/' + rId + '/soll', 'POST', {firma: 'gewerk:' + gw, status: 'nein'}); if (x.error) { toast(x.error); return; }
        await neu(); rueckgaengig(`${gw}: heute ausgeblendet.`, async () => { await api('api/reports/' + rId + '/soll', 'POST', {firma: 'gewerk:' + gw, status: 'offen'}); await neu(); });
        return;
      }
      const inp = row.querySelector('[data-sollgwf]'), firma = inp ? inp.value.trim() : '';
      if (!firma) { toast('Erst die Firma eintragen.'); if (inp) inp.focus(); return; }
      const x = await api('api/reports/' + rId + '/soll/gewerk', 'POST', {gewerk: gw, firma}); if (x.error) { toast(x.error); return; }
      await neu(); toast(`${firma} für ${gw} in den Bauzeitenplan übernommen${x.kontakt ? '' : ' (als Unternehmer:in – nicht in den Adressen)'} – jetzt oben bestätigen.`);
      const alt = x.alt; rueckgaengig(`${firma} für ${gw} eingetragen.`, async () => { await api('api/reports/' + rId + '/soll/gewerk', 'POST', {gewerk: gw, zurueck: alt}); await neu(); });
    } catch (er) { toast(er.message); }
    return;
  }
  else if (a === 'sollDa' || a === 'sollSet') {
    const r = curReport(); if (!r) return;
    try {
      const row = b.closest('[data-sollf]'), firma = row ? row.dataset.sollf : b.dataset.f;
      if (a === 'sollDa') {
        const act = row && row.querySelector('[data-soll-act]'), cnt = row && row.querySelector('[data-soll-cnt]');
        const x = await api('api/reports/' + r.id + '/items', 'POST', {kind: b.dataset.kind, text: firma, activity: act ? act.value.trim() : '', headcount: cnt && cnt.value !== '' ? +cnt.value : null}); if (x.error) { toast(x.error); return; }
      } else {
        const vorher = ((SOLL.f || []).find(y => y.firma === firma) || {}).status || 'offen', st = b.dataset.st, rId = r.id;   // alten Stand merken
        const x = await api('api/reports/' + rId + '/soll', 'POST', {firma, status: st}); if (x.error) { toast(x.error); return; }
        if (st !== 'offen' && vorher !== st) rueckgaengig(`${firma}: ${st === 'nein' ? 'gelöscht' : 'nicht da'}.`, async () => {
          const y = await api('api/reports/' + rId + '/soll', 'POST', {firma, status: ['fehlt', 'nein'].includes(vorher) ? vorher : 'offen'}); if (y.error) { toast(y.error); return; }
          SOLL.rid = 0; openProject(pid, true);
        });
      }
    } catch (e) { return; }
    SOLL.rid = 0; openProject(pid, true);
  }
  else if (a === 'delImg') { const r = await api('api/images/' + id, 'DELETE'); openProject(pid, true);
    if (r && typeof r.papierkorb === 'number') rueckgaengig('Foto im Papierkorb.', async () => { const w = await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); if (w.error) { toast(w.error); return; } openProject(pid, true); }); }
  else if (a === 'druck') druckDialog();
  else if (a === 'print') {
    if (!rid) { toast('Lege zuerst einen Tagesbericht an.'); return; }
    await Promise.allSettled([...saving]);   // erst fertig speichern, dann PDF im gemeinsamen Viewer; abgelegt wird es beim Erzeugen im Projektordner
    const R = curReport();
    await openPdf('api/reports/' + rid + '/pdf', R && R.number != null ? `Tagesbericht Nr. ${R.number}` : 'Tagesbericht'); setTimeout(ablageMelden, 2500);
  }
  else if (a === 'pvClose') { if (history.state && history.state.pv) history.back(); else closePv(); }
  else if (a === 'pvZoom' && pv && pv.doc) { pv.zoom = Math.min(2.6, Math.max(1, +(pv.zoom + (+b.dataset.d) * .6).toFixed(1))); pvRender(); }
  else if (a === 'pvShare') pvShare();
  else if (a === 'pickLogo') $('#logoFile').click();
  else if (a === 'storeTest') { toast('Verbindung wird getestet …'); const r = await api('api/store/test', 'POST'); toast(r.ok ? 'Verbindung funktioniert, Schreiben ist möglich.' : 'Fehlgeschlagen: ' + (r.error || 'unbekannt')); }
  else if (a === 'storeRun') { toast('Übertragung läuft …'); const r = await api('api/store/run', 'POST'); await storeStatus(); toast(r.error && r.pending ? 'Server nicht erreichbar – wird später erneut versucht.' : `${r.sent} Datei(en) übertragen.`); }
  else if (a === 'storeBackfill') { const r = await api('api/store/backfill', 'POST'); toast(r.error || `${r.queued} Foto(s) werden übertragen.`); setTimeout(storeStatus, 2500); }
  else if (a === 'stab') { stab = b.dataset.s; renderDetail(); }
  else if (a === 'pickContact') {
    const inp = b.closest('.sgw').querySelector('input'); inp.value = b.dataset.name; hideSug();
    const row = b.closest('.addrow,.qadd');
    if (!row) inp.dispatchEvent(new Event('change', {bubbles: true}));   // bestehende Zeile: gleich speichern
    else (row.querySelector('[data-add-act]') || (inp.matches('[data-add-co]') && row.querySelector('[data-add]')) || inp).focus();
  }
  else if (a === 'qOpen') { adding = null; q = {step: 'menu'}; renderQ(); }
  else if (a === 'qClose') { q = null; renderQ(); }
  else if (a === 'mangelNoch') mangelMelden(q && q.n || 0);
  else if (a === 'mangelBericht') { q = null; renderQ(); setSecOpen('maengel', true); renderDetail(); setTimeout(() => document.getElementById('sec-maengel')?.scrollIntoView({ block: 'start' }), 60); }
  else if (a === 'mangelStart') { q = null; renderQ(); location.href = '../'; }
  else if (a === 'qCam') { $('#qcam').click(); }
  else if (a === 'qLib') { $('#qlib').click(); }
  else if (a === 'qAdd') { adding = null; addFiles = []; renderDetail(); setSecOpen(b.dataset.kind, true); q = {step: 'add', kind: b.dataset.kind}; renderQ(); renderApv(); }
  else if (a === 'aCam') { $('#acam').click(); }
  else if (a === 'aLib') { $('#alib').click(); }
  else if (a === 'aRm') { addFiles.splice(+b.dataset.i, 1); renderApv(); }
  else if (a === 'qDate') { const d = new Date(Date.now() + +b.dataset.d * 864e5); b.closest('.qadd').querySelector('[data-add-due]').value = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
  else if (a === 'qAssign') { const fs = qFiles; q = null; renderQ(); await uploadPhotos(fs, b.dataset.id || null); }
  else if (a === 'changePw') {
    if ($('#pwNew').value !== $('#pwNew2').value) return toast('Die beiden Kennwörter sind nicht gleich.');
    const r = await api('api/password', 'POST', {new: $('#pwNew').value});
    toast(r.ok ? 'Kennwort geändert.' : r.error); if (r.ok) ['#pwNew', '#pwNew2'].forEach(x => $(x).value = '');
  }
  else if (a === 'mailTest') { toast('Testmail wird gesendet …'); const r = await api('api/mail/test', 'POST'); toast(r.ok ? 'Testmail an ' + r.to + ' gesendet' + (r.hinweis ? ' – ' + r.hinweis : '') + '.' : 'Fehlgeschlagen: ' + r.error); }
  else if (a === 'storeAlte' || a === 'storeAlteWeg') {
    const o = $('#altOut'); if (!o) return;
    if (a === 'storeAlteWeg' && !(await bpFrage('Alte Stände auf dem Server nach der Einstellung löschen? Gelöschtes lässt sich nicht wiederherstellen.'))) return;
    o.textContent = a === 'storeAlte' ? 'Suche in den Projektordnern …' : 'Räume auf …';
    const r = await api('api/store/alte', a === 'storeAlte' ? 'GET' : 'POST');
    o.innerHTML = altText(r);
  }
  else if (a === 'mailPassClear') { await api('api/settings', 'PUT', {mail_pass_clear: '1'}); settings = await api('api/settings'); renderDetail(); }
  else if (a === 'storePassClear') { await api('api/settings', 'PUT', {store_pass_clear: '1'}); settings = await api('api/settings'); renderDetail(); }
  else if (a === 'delLogo') { await api('api/logo', 'DELETE'); settings = await api('api/settings'); favicon(); renderDetail(); }
});
document.addEventListener('change', async e => {   // Begründung zu einer gelöschten erwarteten Firma (Anwesende)
  const n = e.target.closest && e.target.closest('[data-soll-notiz]'); if (n) { const r = curReport(), row = n.closest('[data-sollf]'); if (r && row) { const x = await api('api/reports/' + r.id + '/soll', 'POST', { firma: row.dataset.sollf, status: 'fehlt', notiz: n.value.trim() }); if (x.error) toast(x.error); else { const y = SOLL.f.find((z) => z.firma === row.dataset.sollf); if (y) y.notiz = n.value.trim(); } } return; }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.tagName === 'SELECT' && t.value === '__x') {   // „Andere Zeit …“: Auswahlliste wird zum freien Zeitfeld (Minutengenau)
    const prev = [...t.options].find(o => o.defaultSelected)?.value || '09:00', n = document.createElement('input');
    n.type = 'time'; n.value = prev; n.step = 60; n.setAttribute('aria-label', 'Uhrzeit');
    for (const a of ['data-dp', 'data-add-time', 'data-f']) if (t.hasAttribute(a)) n.setAttribute(a, t.getAttribute(a));
    t.replaceWith(n); n.focus(); try { n.showPicker?.(); } catch (_) {} return;
  }
  if (t.dataset.act === 'pick') { rid = +t.value; wxEdit = headEdit = false; renderDetail(); }
  else if (t.dataset.act === 'toggle') {
    const id = +t.dataset.id, an = t.checked, it = (curReport()?.items || []).find(x => x.id === id), txt = it ? it.text.slice(0, 40) : 'Eintrag';
    await api('api/items/' + id, 'PUT', {done: an ? 1 : 0}); openProject(pid, true);   // Spalte „done“ ist INTEGER – 1/0 statt true/false
    rueckgaengig(`„${txt}“ ${an ? 'erledigt' : 'wieder offen'}.`, async () => { await api('api/items/' + id, 'PUT', {done: an ? 0 : 1}); openProject(pid, true); });
  }
  else if (t.dataset.img) { const r = await api('api/images/' + t.dataset.img, 'PUT', {caption: t.value}); if (r.error) toast(r.error); else { const im = curReport().images.find(x => x.id === +t.dataset.img); if (im) im.caption = t.value.trim().replace(/\s+/g, ' '); } }
  else if (t.dataset.pf) saveProjectField(t);
  else if (t.dataset.acc) { const r = await api('api/account', 'PUT', {email: t.value}); if (r.error) { toast(r.error); t.value = me.email; } else { me.email = t.value.trim(); toast('E-Mail-Adresse gespeichert.'); } }
  else if (t.dataset.stck) { settings[t.dataset.stck] = t.checked ? '1' : '0'; await track(api('api/settings', 'PUT', {[t.dataset.stck]: settings[t.dataset.stck]})); }
  else if (t.dataset.st) {
    const k = t.dataset.st, sec = /_pass$/.test(k); if (sec && !t.value) return;
    if (!sec) settings[k] = t.value;
    await track(api('api/settings', 'PUT', {[k]: t.value}));
    if (sec || k === 'store_mode') { settings = await api('api/settings'); renderDetail(); }
    else if (k.startsWith('store_')) storeStatus();
  }
  else if (t.dataset.dp && t.closest('.duepanel')) saveDue(t.closest('.duepanel'), t.dataset.dp === 'time');
  else if (t.dataset.it) {
    const v = t.dataset.k === 'headcount' ? (t.value === '' ? null : +t.value) : t.value.trim();
    const it = curReport().items.find(x => x.id === +t.dataset.it);
    if (t.dataset.k === 'text' && !v) { toast('Der Eintrag darf nicht leer sein. Zum Entfernen ✕ tippen.'); if (it) t.value = it.text; grow(t); return; }
    if (it) it[t.dataset.k] = v;
    await track(api('api/items/' + t.dataset.it, 'PUT', {[t.dataset.k]: v}));

  }
  else if (t.dataset.f) {
    const r = curReport(), v = t.type === 'checkbox' ? (t.checked ? 1 : 0) : t.value; r[t.dataset.f] = v;
    const manualWx = WXK.includes(t.dataset.f);   // von Hand geändert: nicht mehr automatisch überschreiben
    await track(api('api/reports/' + r.id, 'PUT', manualWx ? {[t.dataset.f]: v, extra: {wx_auto: 0}} : {[t.dataset.f]: v}));
    if (manualWx) r.extra = {...(r.extra || {}), wx_auto: 0};
    if (['date', 'time'].includes(t.dataset.f) && r.extra && r.extra.wx_auto) { await fillGeo(true, true); openProject(pid, true); return; }   // Datum/Uhrzeit geändert: automatisches Wetter nachziehen
    if (['date', 'number'].includes(t.dataset.f)) openProject(pid, true);
  }
});
/* Arbeitsfortschritt im Feld der Firma: Stufe (Knopf) oder Schieber – b ist das bediente Element */
async function fsSetzen(b) {
  const r = curReport(), row = b.closest('[data-fsg]'); if (!r || !row) return;
  const x = FS.v.find(y => y.gantt_id === row.dataset.fsg && y.uid === +row.dataset.fsu); if (!x) return;
  const body = { gantt_id: x.gantt_id, uid: x.uid, pct: +b.dataset.p };   // Stand („hinterher“, „fertig“) ergibt sich aus Prozent und Plan
  body.ampel = body.pct >= 100 ? 'fertig' : '';
  try {
    const d = await api('api/reports/' + r.id + '/fortschritt', 'POST', body); if (d.error) { toast(d.error); return; }
    FS = { rid: r.id, v: d.vorgaenge || [], sw: d.schwelle || 5 };
    fsAuffrischen();
    if (!d.im_plan) toast('Gespeichert – ein späterer Bericht hat für diesen Vorgang schon einen Stand, der Bauzeitenplan bleibt daher.');
  } catch (e) { toast(e.message || 'Speichern fehlgeschlagen'); }
}
document.addEventListener('change', e => {
  if (e.target.matches && e.target.matches('.fs-p input[type=range]')) { e.target.dataset.p = e.target.value; fsSetzen(e.target); return; } if (e.target.id === 'ctr') { cTrade = e.target.value; fillContactList(); } if (e.target.id === 'cpr') { cProj = e.target.value; cProjSet = true; fillContactList(); } });
document.addEventListener('input', e => {
  if (e.target.classList.contains('ed')) grow(e.target);
  else if (e.target.dataset.dp && draft) {
    draft[e.target.dataset.dp] = e.target.value;
    if (e.target.dataset.dp === 'name') suggestProjects(e.target.value);
  }
  else if (e.target.id === 'sq') { sheetQ = e.target.value; renderSheet(); if (sheetMode === 'proj') sheetSuggest(); }
  else if (e.target.id === 'cq') { cq = e.target.value; fillContactList(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSheet(); $('#menu').classList.add('hidden'); if (BWZ.open) bwzClose(); }
  const wrow = e.target.closest && e.target.closest('#bwz .add');
  if (wrow && e.key === 'Enter' && !e.defaultPrevented && (e.target.tagName !== 'TEXTAREA' || e.ctrlKey || e.metaKey)) { e.preventDefault(); bwzAdd(wrow.querySelector('[data-add]').dataset.add); return; }
  const row = e.target.closest && e.target.closest('.addrow');
  const ta = e.target.tagName === 'TEXTAREA';
  if (e.key === 'Enter' && row && (!ta || e.ctrlKey || e.metaKey)) { e.preventDefault(); addItem(row.querySelector('[data-add]').dataset.add); }
  else if (e.key === 'Enter' && e.target.dataset && e.target.dataset.dp) createProject();
});
window.addEventListener('resize', growAll);
if (location.hash.startsWith('#reset=')) authView('reset');
else if (location.hash === '#forgot') { history.replaceState(null, '', location.pathname); authView('forgot'); }   // Link „Kennwort vergessen“ der Startseite
else api('api/me').then(r => { if (!r.ok) return authView('login'); me = r; applyLook(r); r.must_change ? authView('change') : showApp(); });
