/* Bautagebuch – Kontakte.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
const CFIELDS = [['name','Firma / Name *','text','w'],['trade','Gewerk'],['contact_person','Ansprechpartner'],['role','Funktion'],['phone','Telefon','tel'],['mobile','Mobil','tel'],['email','E-Mail','email'],['website','Internet','text','w'],['street','Straße','text','w'],['zip','PLZ'],['city','Ort']];
function renderContacts(box) {
  if (!cProjSet && pid) cProj = String(pid);   // Baustellen-Ansicht: zuerst die Beteiligten des geöffneten Projekts („Alle Projekte“ hebt das auf)
  box.innerHTML = `<div class="split"><div class="clist"><div class="ch"><input id="cq" type="search" placeholder="Kontakte filtern" value="${esc(cq)}"><button data-act="addContact" title="Kontakt anlegen">${ic('plus', 22, 3)}</button></div><div class="cx"><select id="ctr" aria-label="Nach Gewerk filtern"></select><select id="cpr" aria-label="Nach Projekt filtern"></select><button data-act="cxXlsx" title="Liste als Excel-Datei laden">Excel</button><button data-act="cxPdf" title="Liste drucken (PDF)">Drucken</button></div><div class="cb" id="cb"></div></div><div class="cdet" id="cdet"></div></div>`;
  fillContactList(); fillContactDetail(); $('#ncName')?.focus();
}
const cxQS = () => '?q=' + encodeURIComponent(cq.trim()) + '&trade=' + encodeURIComponent(cTrade) + (cProj ? '&project=' + cProj : '');
function fillContactList() {
  const sel = $('#ctr'); if (sel) { const ts = tradeOpts(); if (cTrade && !ts.some(t => t.toLowerCase() === cTrade.toLowerCase())) cTrade = ''; sel.innerHTML = '<option value="">Alle Gewerke</option>' + ts.map(t => `<option ${t.toLowerCase() === cTrade.toLowerCase() ? 'selected' : ''}>${esc(t)}</option>`).join(''); }
  const sp = $('#cpr'); if (sp) { if (cProj && !projects.some(p => String(p.id) === cProj)) cProj = ''; sp.innerHTML = '<option value="">Alle Projekte</option>' + projects.map(p => `<option value="${p.id}" ${String(p.id) === cProj ? 'selected' : ''}>${esc(p.name)}</option>`).join(''); }
  const q = cq.toLowerCase(), list = contacts.filter(c => (!cProj || (c.projects || []).includes(+cProj)) && (!cTrade || (c.trade || '').trim().toLowerCase() === cTrade.toLowerCase()) && passt([c.name, c.trade, c.contact_person, c.city, c.email, c.phone].join(' '), q));
  $('#cb').innerHTML = list.length ? list.map(c => `<button class="pi ${c.id === cid ? 'on' : ''}" data-act="openContact" data-id="${c.id}"><span class="l"><b>${esc(c.name)}</b>${c.trade || c.contact_person ? `<small>${esc([c.trade, c.contact_person].filter(Boolean).join(' · '))}</small>` : ''}</span></button>`).join('')
    : `<div class="empty">${contacts.length ? 'Keine Treffer.' : 'Noch keine Kontakte. Firmen aus „Anwesende“ erscheinen hier automatisch.'}</div>`;
}
const mapBlock = (q, small) => {   // kleine Google-Karte (ohne Schlüssel, eingebettet) mit Link zur Routenplanung
  q = (q || '').trim(); if (!q) return ''; const e = encodeURIComponent(q);
  return `<div class="mapb${small ? ' sm' : ''}"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte" src="https://www.google.com/maps?q=${e}&hl=de&z=15&output=embed"></iframe><a class="mapr" href="https://www.google.com/maps/dir/?api=1&destination=${e}&travelmode=driving" target="_blank" rel="noopener">Route dorthin planen ↗</a></div>`;
};
function fillContactDetail() {
  const c = contacts.find(x => x.id === cid), box = $('#cdet');
  $('.split').classList.toggle('has', !!c || newC);
  if (newC) {
    box.innerHTML = `<div class="cform"><button class="cback" data-act="cback">‹ Kontakte</button><h3>Neuer Kontakt</h3>
      <label class="w">Firma / Name *<input id="ncName" autocomplete="off"></label>
      <div class="w" id="ncSug"></div>
      <div class="info">Beim Tippen schlägt die App Firmen aus dem Netz (OpenStreetMap) mit Adresse und – falls vorhanden – Telefon und E-Mail vor; ein Tipp legt den Kontakt damit an. Alles Weitere trägst du danach ein.</div>
      <div class="acts"><button data-act="cancelNew">Abbrechen</button><button class="pri" data-act="createContact">Anlegen</button></div></div>`;
    return;
  }
  if (!c) { box.innerHTML = '<div class="empty">Wähle einen Kontakt oder lege mit ＋ einen neuen an.</div>'; return; }
  const back = cfrom ? '<button class="cback show" data-act="backReport">‹ Zurück zum Tagesbericht</button>' : '<button class="cback" data-act="cback">‹ Kontakte</button>';
  const tel = (c.mobile || c.phone || '').replace(/[^+\d]/g, '');
  const pen = `<button data-act="editContact" title="${cedit ? 'Fertig' : 'Bearbeiten'}" aria-label="${cedit ? 'Fertig' : 'Bearbeiten'}">${cedit ? '✓' : ic('pencil', 22)}</button>`;
  if (cedit) {
    const fields = CFIELDS.map(([k, label, type = 'text', w]) => `<label class="${w ? 'w' : ''}">${label}<input data-cf="${k}" type="${type}" value="${esc(c[k])}" autocomplete="off"${listAttr(k)}></label>`).join('') + tradeList() + addrLists();
    box.innerHTML = `<div class="cform">${back}<div class="chead"><h3>${esc(c.name)}</h3>${pen}</div>${fields}
      <label class="w">Notizen<textarea data-cf="notes">${esc(c.notes)}</textarea></label>
      <div class="info">In ${c.used} Berichtseintrag${c.used === 1 ? '' : 'en'} verwendet. Bestehende Tagesberichte behalten den Namen, wie er damals eingetragen wurde.</div>
      <div class="w" id="csug"></div>
      <div class="acts"><button data-act="sugEdit">Aus dem Netz ergänzen</button><button class="bad" data-act="delContact">Kontakt löschen</button></div></div>`;
    return;
  }
  const tl = v => v ? `<a href="tel:${esc(v.replace(/[^+\d]/g, ''))}">${esc(v)}</a>` : '';
  const rows = [['Gewerk', esc(c.trade)], ['Ansprechpartner', esc([c.contact_person, c.role].filter(Boolean).join(', '))], ['Telefon', tl(c.phone)], ['Mobil', tl(c.mobile)],
    ['E-Mail', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''],
    ['Internet', c.website ? `<a href="${esc(/^https?:/i.test(c.website) ? c.website : 'https://' + c.website)}" target="_blank" rel="noopener">${esc(c.website)}</a>` : ''],
    ['Adresse', esc([c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', '))], ['Notizen', esc(c.notes)]].filter(r => r[1]);
  box.innerHTML = `<div class="cform">${back}<div class="chead"><h3>${esc(c.name)}</h3>${pen}</div>
    ${rows.length ? `<dl class="cview">${rows.map(([l, v]) => `<div><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl>` : '<div class="info">Noch keine Daten. Mit dem Stift oben rechts kannst du sie ergänzen.</div>'}
    ${mapBlock([c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', '))}
    <div class="info">In ${c.used} Berichtseintrag${c.used === 1 ? '' : 'en'} verwendet.</div>
    ${(() => { const a = (PLATFORM.apps || []).find(x => x.key === 'adressen' && x.allowed); return a ? `<div class="acts"><a class="btn" href="${esc(appUrl(a))}/#kontakt=${c.id}" title="In der Adressen-App bearbeiten – Tabelle, Export, Ins Handy, Verlauf">In Adressen bearbeiten ↗</a><a class="btn" href="${esc(appUrl(a))}/#kontakt=${c.id}&verlauf" title="Was an diesen Kontakt verschickt wurde: Pläne, Mängel- und Terminrügen">✉ Benachrichtigungen ↗</a></div>` : ''; })()}</div>`;
}
async function saveContactField(t) {
  const c = contacts.find(x => x.id === cid), k = t.dataset.cf; let v = t.value.trim();
  if (k === 'name') v = v.replace(/\s+/g, ' ');
  if (k === 'name' && !v) { toast('Der Name darf nicht leer sein.'); t.value = c.name; return; }
  const res = await api('api/contacts/' + cid, 'PUT', {[k]: v});
  if (res.error) { toast(res.error); t.value = c[k]; return; }
  t.value = v;
  if (k === 'name') document.querySelector('.cform h3').textContent = v;
  contacts = await api('api/contacts'); fillContactList();
}

/* ---------- Kontakt-Vorschläge aus dem Netz (OpenStreetMap, über den Server) ---------- */
let sugC = [], sugCT = 0, sugCQ = '';
const sugLine = x => [x.street, [x.zip, x.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
function sugHtml(list, act, msg) {
  return list.length ? `<div class="sugc"><div class="sugh">Vorschläge aus dem Netz, nächste zuerst – antippen zum Übernehmen</div>${list.map((x, i) => `<button type="button" class="pi" data-act="${act}" data-i="${i}"><span class="l"><b>${esc(x.name)}</b><small>${esc([x.km != null && (x.km < 1 ? '< 1 km' : Math.round(x.km) + ' km'), x.trade, sugLine(x), x.phone, x.email].filter(Boolean).join(' · '))}</small></span></button>`).join('')}</div>` : (msg ? `<div class="info">${msg}</div>` : '');
}
async function fetchSug(q) {
  const p = curProject(), ref = p && hasPos(p) ? p : here, near = ref ? `&lat=${ref.lat}&lon=${ref.lon}` : '';   // Bezug: Projektstandort, sonst dein Standort
  const r = await api('api/contacts/suggest?q=' + encodeURIComponent(q) + near);
  return Array.isArray(r.items) ? r.items : [];
}
function suggestContacts(q) {   // beim Tippen im Feld „Neuer Kontakt“
  clearTimeout(sugCT); sugCQ = q.trim();
  if (sugCQ.length < 3) { sugC = []; const b = $('#ncSug'); if (b) b.innerHTML = ''; return; }
  sugCT = setTimeout(async () => {
    const q0 = sugCQ, list = await fetchSug(q0).catch(() => []);
    if (q0 !== sugCQ || !$('#ncSug')) return;
    sugC = list; $('#ncSug').innerHTML = sugHtml(list, 'sugNew');
  }, 350);
}
async function sugDetail(x) {   // Telefon/E-Mail/Internet erst beim Antippen holen (eine Abfrage)
  if (x.osm_id && !x._d) { try { Object.assign(x, await api(`api/contacts/suggest/detail?type=${encodeURIComponent(x.osm_type)}&id=${x.osm_id}`)); } catch {} x._d = 1; }
  return x;
}
const sugFields = x => ({name: x.name, trade: tradeOpts().find(t => t.toLowerCase() === (x.trade || '').toLowerCase()) || x.trade, street: x.street, zip: x.zip, city: x.city, phone: x.phone, email: x.email, website: x.website || ''});
function addContact() { newC = true; cid = null; fillContactList(); fillContactDetail(); $('#ncName')?.focus(); }
async function createContact() {
  const name = ($('#ncName')?.value || '').trim().replace(/\s+/g, ' ');
  if (!name) { toast('Bitte einen Namen eingeben.'); $('#ncName')?.focus(); return; }
  const r = await api('api/contacts', 'POST', {name});
  if (r.error && !r.id) { toast(r.error); return; }
  if (r.error) toast('Diesen Kontakt gibt es schon – er wird geöffnet.');
  newC = false; cedit = true; cid = r.id; contacts = await api('api/contacts'); renderDetail();
}

/* ---------- Anmeldung (Anmelden, Kennwort vergessen/zurücksetzen, erzwungene Änderung) ---------- */
