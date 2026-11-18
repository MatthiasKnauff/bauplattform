/* Bautagebuch – Kontakte.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
function renderContacts(box) {
  if (!cProjSet && pid) cProj = String(pid);   // Baustellen-Ansicht: zuerst die Beteiligten des geöffneten Projekts („Alle Projekte“ hebt das auf)
  box.innerHTML = `<div class="split"><div class="clist"><div class="ch"><input id="cq" type="search" placeholder="Kontakte filtern" value="${esc(cq)}"><button data-act="addContact" title="Kontakt anlegen">${ic('plus', 22, 3)}</button></div><div class="cx"><select id="ctr" aria-label="Nach Gewerk filtern"></select><select id="cpr" aria-label="Nach Projekt filtern"></select><button data-act="cxXlsx" title="Liste als Excel-Datei laden">Excel</button><button data-act="cxPdf" title="Liste drucken (PDF)">Drucken</button></div><div class="cb" id="cb"></div></div><div class="cdet" id="cdet"></div></div>`;
  fillContactList(); fillContactDetail();
}
const cxQS = () => '?q=' + encodeURIComponent(cq.trim()) + '&trade=' + encodeURIComponent(cTrade) + (cProj ? '&project=' + cProj : '');
function fillContactList() {
  const sel = $('#ctr'); if (sel) { const ts = tradeOpts(); if (cTrade && !ts.some(t => t.toLowerCase() === cTrade.toLowerCase())) cTrade = ''; sel.innerHTML = '<option value="">Alle Gewerke</option>' + ts.map(t => `<option ${t.toLowerCase() === cTrade.toLowerCase() ? 'selected' : ''}>${esc(t)}</option>`).join(''); }
  const sp = $('#cpr'); if (sp) { if (cProj && !projects.some(p => String(p.id) === cProj)) cProj = ''; sp.innerHTML = '<option value="">Alle Projekte</option>' + projects.map(p => `<option value="${p.id}" ${String(p.id) === cProj ? 'selected' : ''}>${esc(p.name)}</option>`).join(''); }
  const q = cq.toLowerCase(), list = contacts.filter(c => (!cProj || (c.projects || []).includes(+cProj)) && (!cTrade || (c.trade || '').trim().toLowerCase() === cTrade.toLowerCase()) && passt([c.name, c.trade, c.contact_person, c.city, c.email, c.phone].join(' '), q));
  $('#cb').innerHTML = list.length ? list.map(c => `<button class="pi ${c.id === cid ? 'on' : ''}" data-act="openContact" data-id="${c.id}"><span class="l"><b>${esc(c.name)}</b>${c.trade || c.contact_person ? `<small>${esc([c.trade, c.contact_person].filter(Boolean).join(' · '))}</small>` : ''}</span></button>`).join('')
    : `<div class="empty">${contacts.length ? 'Keine Treffer.' : 'Noch keine Kontakte. Firmen aus „Anwesende“ erscheinen hier automatisch.'}</div>`;
}
function fillContactDetail() {   // rechts nur ein Hinweis – der Kontakt öffnet als Karte wie in „Adressen“ (gemeinsame Kontaktmaske)
  const box = $('#cdet'); if (!box) return;
  $('.split').classList.remove('has');
  box.innerHTML = '<div class="empty">Kontakt antippen – er öffnet als Karte wie in „Adressen“. Mit ＋ legst du einen neuen an.</div>';
}
/* Anlegen und Bearbeiten: gemeinsame Kontaktmaske des Baukastens (wie in „Adressen“, mit Vorschlägen aus dem Netz) */
let sugC = [];   // Vorschläge der Adresssuche (bt-suche.js)
async function kontaktMaske(id) {   // Anzeigen, Bearbeiten, Anlegen, Löschen – überall dieselbe Karte (auch aus dem Tagesbericht und der Suche)
  const c = id && contacts.find((x) => x.id === id);
  const k = await BPHead.kontaktMaske(id ? { id } : {}, !id ? {} : {
    info: c && c.used ? `<div class="info">In ${c.used} Berichtseintrag${c.used === 1 ? '' : 'en'} verwendet.</div>` : '',
    loeschen: async () => { const r = await api('api/contacts/' + id, 'DELETE'); if (r.error) throw new Error(r.error); if (r.papierkorb) toast('In den Papierkorb gelegt – dort wiederherstellbar.'); } });
  contacts = await api('api/contacts'); if (k && k.id) cid = k.id;
  if ($('#cb')) fillContactList();
}
/* ---------- Anmeldung (Anmelden, Kennwort vergessen/zurücksetzen, erzwungene Änderung) ---------- */
