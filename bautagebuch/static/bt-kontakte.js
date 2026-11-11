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
const mapBlock = (q, small) => {   // kleine Google-Karte (ohne Schlüssel, eingebettet) mit Link zur Routenplanung
  q = (q || '').trim(); if (!q) return ''; const e = encodeURIComponent(q);
  return `<div class="mapb${small ? ' sm' : ''}"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte" src="https://www.google.com/maps?q=${e}&hl=de&z=15&output=embed"></iframe><a class="mapr" href="https://www.google.com/maps/dir/?api=1&destination=${e}&travelmode=driving" target="_blank" rel="noopener">Route dorthin planen ↗</a></div>`;
};
function fillContactDetail() {
  const c = contacts.find(x => x.id === cid), box = $('#cdet');
  $('.split').classList.toggle('has', !!c);
  if (!c) { box.innerHTML = '<div class="empty">Wähle einen Kontakt oder lege mit ＋ einen neuen an.</div>'; return; }
  const back = cfrom ? '<button class="cback show" data-act="backReport">‹ Zurück zum Tagesbericht</button>' : '<button class="cback" data-act="cback">‹ Kontakte</button>';
  const tel = (c.mobile || c.phone || '').replace(/[^+\d]/g, '');
  const pen = `<button data-act="editContact" title="Bearbeiten" aria-label="Bearbeiten">${ic('pencil', 22)}</button>`;
  const tl = v => v ? `<a href="tel:${esc(v.replace(/[^+\d]/g, ''))}">${esc(v)}</a>` : '';
  const rows = [['Gewerk', esc(c.trade)], ['Ansprechpartner', esc([c.contact_person, c.role].filter(Boolean).join(', '))], ['Telefon', tl(c.phone)], ['Mobil', tl(c.mobile)],
    ['E-Mail', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''],
    ['Internet', c.website ? `<a href="${esc(/^https?:/i.test(c.website) ? c.website : 'https://' + c.website)}" target="_blank" rel="noopener">${esc(c.website)}</a>` : ''],
    ['Adresse', esc([c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', '))], ['Notizen', esc(c.notes)]].filter(r => r[1]);
  box.innerHTML = `<div class="cform">${back}<div class="chead"><h3>${esc(c.name)}</h3>${pen}</div>
    ${rows.length ? `<dl class="cview">${rows.map(([l, v]) => `<div><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl>` : '<div class="info">Noch keine Daten. Mit dem Stift oben rechts kannst du sie ergänzen.</div>'}
    ${mapBlock([c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', '))}
    <div class="info">In ${c.used} Berichtseintrag${c.used === 1 ? '' : 'en'} verwendet.</div>
    ${(() => { const a = (PLATFORM.apps || []).find(x => x.key === 'adressen' && x.allowed); return a ? `<div class="acts"><a class="btn" href="${esc(appUrl(a))}/#kontakt=${c.id}" title="In der Adressen-App bearbeiten – Tabelle, Export, Ins Handy, Verlauf">In Adressen bearbeiten ↗</a><a class="btn" href="${esc(appUrl(a))}/#kontakt=${c.id}&verlauf" title="Was an diesen Kontakt verschickt wurde: Pläne, Mängel- und Terminrügen">✉ Benachrichtigungen ↗</a></div>` : ''; })()}
    <div class="acts"><button class="bad" data-act="delContact">Kontakt löschen</button></div></div>`;
}
/* Anlegen und Bearbeiten: gemeinsame Kontaktmaske des Baukastens (wie in „Adressen“, mit Vorschlägen aus dem Netz) */
let sugC = [];   // Vorschläge der Adresssuche (bt-suche.js)
async function kontaktMaske(id) {
  const k = await BPHead.kontaktMaske(id ? {id} : {});
  if (!k) return;
  contacts = await api('api/contacts'); if (k.id) cid = k.id; fillContactList(); fillContactDetail();
}
/* ---------- Anmeldung (Anmelden, Kennwort vergessen/zurücksetzen, erzwungene Änderung) ---------- */
