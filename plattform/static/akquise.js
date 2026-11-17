'use strict';
/* Akquise – Seite der App (besprochen am 14.11.2026, Entwurf „Akquise-App“, GO 09:45). Links die Akquisen nach Stand (bpNav), unter der
   gewählten ihr Dateibaum (Projektpfad „Akquise/…“), oben die Befehlsleiste, in der Mitte die Daten (sofort gespeichert, Rückgängig-Dock),
   rechts der abdockbare Bereich: Datei (Vorschau) und Umwandeln (Projektnummer nachfragen, Dateien einsortieren). Server: plattform/akquise.py. */
let L = null, A = null, AID = null, B = null, DATEI = '', ARCH = false, UW = null;
const NAV = $('#navL'), LEISTE = $('#bfl'), V = $('#view'), WORK = $('#work'), RE = {};
const IC = { neu: '<path d="M12 5v14M5 12h14"/>', akq: '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 11l4-3.2 4 3.2"/><path d="M9 10.3V14h6v-3.7"/>', hoch: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  ordner: '<path d="M3 6h6l2 2h10v11H3z"/><path d="M12 11v5M9.5 13.5h5"/>', um: '<path d="M5 12h12M13 7l5 5-5 5"/>', archiv: '<path d="M4 4h16v4H4z"/><path d="M5 8v12h14V8"/><path d="M10 12h4"/>',
  weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', ue: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2"/>' };
const FARBE = { anfrage: 'var(--mute)', angebot: 'var(--y)', zusage: 'var(--ok,#1e8a4c)', absage: 'var(--red,#b42318)' };
const deD = bpTag;
const eur0 = (v) => bpEur0(+v || 0);   // bp.js
const LS = bpLS('aq.');
const alle = () => [...L.akquisen, ...(L.archiv || [])];

async function laden(aid) {
  L = await api('api/akquisen' + (ARCH ? '?archiv=1' : ''));
  if (aid !== undefined) AID = aid;
  if (!alle().some((x) => x.id === AID)) AID = (alle().find((x) => x.id === LS.get('aid')) || L.akquisen[0] || {}).id || null;
  if (AID) LS.set('aid', AID);
  A = alle().find((x) => x.id === AID) || null;
  if (!B || B.aid !== AID) { B = null; DATEI = ''; UW = null; }
  zeichne();
  if (A && !B) baumLaden();
}
async function baumLaden() {
  const aid = AID;
  try { const b = await api(`api/akquisen/${aid}/baum`); if (aid === AID) { B = { aid, ...b }; nav(); rechtsNeu(); } } catch (e) { toast(e.message, true); }
}

/* ---------- links: Akquisen nach Stand, Dateibaum der gewählten ---------- */
function baumHtml() {
  if (!B) return '<div class="aq-baum"><span class="mute">Dateien …</span></div>';
  if (B.error) return `<div class="aq-baum"><span class="mute" title="${esc(B.error)}">Dateien nicht erreichbar</span></div>`;
  const tief = (p) => (p ? p.split('/').length : 0);
  const Z = [...B.ordner.map((o) => ({ o, rel: o })), ...B.dateien].sort((x, y) => (x.rel || '').localeCompare(y.rel || '', 'de'));
  return `<div class="aq-baum">${Z.length ? Z.map((z) => (z.o
    ? `<span class="o" style="padding-left:${(tief(z.o) - 1) * .8 + .4}rem">📁 ${esc(z.o.split('/').pop())}</span>`
    : `<button type="button" data-aqd="${esc(z.rel)}" class="${z.rel === DATEI ? 'on' : ''}" style="padding-left:${tief(z.ordner) * .8 + .4}rem" title="${esc(z.rel)}">${/\.pdf$/i.test(z.name) ? '📄' : /\.(jpe?g|png|gif|webp|heic)$/i.test(z.name) ? '🖼' : '📎'} <span class="n">${esc(z.name)}</span></button>`)).join('')
    : '<span class="mute">noch keine Dateien – hineinziehen</span>'}</div>`;
}
function nav() {
  const G = {};
  for (const x of L.akquisen) (G[x.stand] = G[x.stand] || []).push(x);
  const P = (x) => ({ id: 'a:' + x.id, text: x.name, icon: IC.akq, farbe: FARBE[x.stand], zahl: x.wiedervorlage && x.wiedervorlage <= new Date().toISOString().slice(0, 10) ? '🔔' : '', zahlTip: x.wiedervorlage ? 'Wiedervorlage ' + deD(x.wiedervorlage) : '', unter: x.id === AID ? baumHtml() : '' });
  const gruppen = Object.keys(L.staende).filter((s) => G[s]).map((s) => ({ titel: `${L.staende[s]} · ${G[s].length}`, punkte: G[s].map(P) }));
  gruppen.push({ titel: 'Archiv', klapp: 'aq:archiv', punkte: ARCH ? (L.archiv || []).map(P) : [{ id: 'archiv', text: `Archivierte zeigen (${L.archiv_zahl})`, icon: IC.archiv }] });
  if (L.ueberschlaege.length) gruppen.push({ titel: `Abgelegte Überschläge · ${L.ueberschlaege.length}`, klapp: 'aq:ue', punkte: L.ueberschlaege.map((u) => ({ id: 'u:' + u.id, text: `${u.wofuer || 'ohne Angabe'} – ${eur0(u.netto)}`, icon: IC.ue })) });
  bpNav(NAV, { kopf: { titel: 'Akquise', klein: `${L.akquisen.length} offen` }, attr: 'aq', lage: true, gruppen, aktiv: AID ? 'a:' + AID : '',

    wahl: (id) => { if (id === 'archiv') { ARCH = true; laden(); } else if (id.startsWith('a:')) laden(+id.slice(2)); else if (id.startsWith('u:')) ueberschlagWahl(+id.slice(2)); } });
}
NAV.addEventListener('click', (e) => {
  const d = e.target.closest('[data-aqd]'); if (d) { e.stopPropagation(); DATEI = d.dataset.aqd; nav(); if (window.seiteReiter && breit()) seiteReiter('aq', 'datei'); rechtsNeu(); return; }
  if (e.target.closest('[data-aqneu]')) neuDialog();
});

/* ---------- Befehlsleiste ---------- */
function leiste() {
  const K = (t, ic, fn, o = {}) => ({ t, ic, fn, tip: o.tip || t, aus: !!o.aus, rot: !!o.rot });
  befehle(LEISTE, [
    { titel: 'Neu', knoepfe: [K('Akquise', IC.neu, () => neuDialog()), K('Hochladen', IC.hoch, () => $('#aqFile') && $('#aqFile').click(), { aus: !A, tip: 'Dateien in den Ordner der Akquise (oder einfach hineinziehen)' }),
      K('Ordner', IC.ordner, ordnerNeu, { aus: !A })] },
    { titel: 'Akquise', knoepfe: [K('In Projekt umwandeln', IC.um, () => { if (breit()) seiteReiter('aq', 'umwandeln'); else rechtsNeu(); }, { aus: !A || A.archiviert, tip: 'Echtes Projekt mit Nummer anlegen, Dateien in den Projektordner einsortieren' }),
      K(A && A.archiviert ? 'Zurückholen' : 'Archivieren', IC.archiv, archivieren, { aus: !A, tip: A && A.archiviert ? 'Wieder unter den offenen Akquisen' : 'Ordner nach „Akquise/_Archiv“, aus der Liste weg' })] },
    { titel: 'Bearbeiten', rechts: true, knoepfe: [K('Löschen', IC.weg, loeschen, { aus: !A, rot: true, tip: 'In den Papierkorb – die Dateien bleiben im Ordner liegen' })] },
  ]);
}

/* ---------- Mitte: Daten, Honorar, Dateien ---------- */
function zeichne() {
  nav(); leiste();
  if (!A) { V.innerHTML = L.akquisen.length ? '<div class="leer">Links eine Akquise wählen.</div>' : bpLeer({ titel: 'Es gibt noch keine Akquise', text: 'Neu anlegen – oder in Honorar einen abgelegten Überschlag übernehmen.', knopf: 'Akquise anlegen …' }); rechts(); return; }
  const f = (k, l, o = {}) => `<label>${l}<input data-aqf="${k}" value="${esc(A[k] || '')}"${o.typ ? ` type="${o.typ}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}></label>`;
  const U = A.ueberschlaege || [];
  const pos = V.scrollTop;
  V.innerHTML = `<div class="aq-w">
    <div class="aq-k"><h3><input class="aq-ti" data-aqf="name" value="${esc(A.name)}" aria-label="Name"><span class="aq-st ${A.stand}">${esc(L.staende[A.stand])}</span>${A.archiviert ? '<span class="aq-st">archiviert</span>' : ''}<small>seit ${deD(A.erstellt)} · ${esc(A.von)}</small></h3>
      <div class="aq-f"><div class="aq-kf"><span>Bauherr:in / Anfrage von</span><div id="aqKf"></div></div>
        ${A.kontakt_id ? '' : f('ansprech', 'Ansprechpartner:in') + f('telefon', 'Telefon') + f('email', 'E-Mail', { typ: 'email' }) + f('adresse', 'Adresse', { ph: 'Straße Nr., PLZ Ort' })}
        <label>Stand<select data-aqf="stand" data-bp-auswahl>${Object.entries(L.staende).map(([k, t]) => `<option value="${k}"${k === A.stand ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
        ${f('wiedervorlage', 'Wiedervorlage 🔔', { typ: 'date' })}</div>
      <label class="mute" style="display:grid;gap:.15rem;font-size:.78rem">Notiz<textarea data-aqf="notiz">${esc(A.notiz || '')}</textarea></label></div>
    <div class="aq-k"><h3>Honorar <small>abgelegte Überschläge – beim Umwandeln werden sie Honoraraufträge (Stand Angebot)</small></h3>
      ${U.length ? `<table class="aq-t"><tr><th>abgelegt</th><th>Wofür</th><th class="r">Kosten</th><th>Zone</th><th class="r">netto</th><th></th></tr>
        ${U.map((u) => `<tr data-aquoffen="${u.id}" title="Doppelklick: im Honorar-Rechner öffnen"><td>${deD(u.erstellt)} <small class="mute">${esc(u.von)}</small></td><td>${esc(u.wofuer || '–')}</td><td class="r">${eur0(u.kosten)}</td><td>${['I', 'II', 'III', 'IV', 'V'][u.zone - 1] || ''}</td><td class="r"><b>${eur0(u.netto)}</b></td>
          <td class="r"><button type="button" class="btn sm" data-aqudel="${u.id}" title="Überschlag löschen (Rückgängig möglich)">löschen</button></td></tr>`).join('')}</table>`
        : '<p class="mute" style="margin:0;font-size:.85rem">Noch kein Überschlag. Im Honorar-Rechner „✓ Ablegen“ – dann links unter „Abgelegte Überschläge“ hierher hängen.</p>'}
      ${L.ueberschlaege.length ? `<div class="aq-ue"><small class="mute">Abgelegt, ohne Akquise:</small>${L.ueberschlaege.map((u) => `<button type="button" class="btn sm" data-aqudazu="${u.id}">＋ ${esc(u.wofuer || 'ohne Angabe')} · ${eur0(u.netto)}</button>`).join('')}</div>` : ''}</div>
    <div class="aq-drop" data-aqdrop>Dateien hierher ziehen oder <label>auswählen<input type="file" id="aqFile" multiple hidden data-aqfile></label> – sie liegen im Projektpfad unter „${esc(L.wurzel || 'Akquise')}/${esc(A.archiviert ? (L.archiv_ordner || '_Archiv') + '/' : '')}${esc(A.ordner)}“.</div>
    ${breit() ? '' : '<div id="aqUnten"></div>'}</div>`;
  V.scrollTop = pos;
  kontaktFeld();
  rechts();
}
/* Bauherr:in: aus den Kontakten wählen oder neu anlegen (dieselbe Maske wie überall) – ohne Kontakt bleibt es Text */
function kontaktFeld() {
  const host = $('#aqKf'); if (!host || !A) return; const aid = A.id;
  BPHead.kontaktFeld(host, { wert: A.bauherr || '', kid: A.kontakt_id || null, rolle: 'Bauherr', platz: 'Name eintippen – wählen oder als Kontakt anlegen',
    vor: { contact_person: A.ansprech || '', phone: A.telefon || '', email: A.email || '', ...adrTeile(A.adresse) },
    setzen: (k, text) => {
      if (!A || A.id !== aid) return;
      if (k) { if (k.id === A.kontakt_id && k.name === A.bauherr) return;
        speichern({ kontakt_id: k.id, bauherr: k.name, ansprech: k.contact_person || '', telefon: k.phone || k.mobile || '', email: k.email || '', adresse: [k.street, [k.zip, k.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') }, `Bauherr:in: ${k.name}`); return; }
      if (!A.kontakt_id && (A.bauherr || '') === text) return;
      speichern({ kontakt_id: null, bauherr: text }, A.kontakt_id ? 'Kontakt gelöst' : 'Geändert');
    } });
}
const adrTeile = (t) => { const m = /^(.*?),\s*(\d{5})?\s*(.*)$/.exec(t || ''); return m ? { street: m[1].trim(), zip: m[2] || '', city: m[3].trim() } : { street: t || '' }; };
async function speichern(body, text) {
  if (!A) return; const aid = A.id, vorher = {}; Object.keys(body).forEach((k) => { vorher[k] = A[k]; });
  try { await api('api/akquisen/' + aid, 'PUT', body); await laden(aid);
    if (text) rueckgaengig(text, async () => { await api('api/akquisen/' + aid, 'PUT', vorher); await laden(aid); }); } catch (e) { toast(e.message, true); }
}
V.addEventListener('change', (e) => {
  const f = e.target.closest('[data-aqf]');
  if (f && A) { const k = f.dataset.aqf; if ((A[k] || '') !== f.value) speichern({ [k]: f.value }, { name: 'Name geändert', stand: 'Stand geändert', wiedervorlage: 'Wiedervorlage geändert' }[k] || 'Geändert'); return; }
  if (e.target.matches('[data-aqfile]')) { hochladen([...e.target.files]); e.target.value = ''; }
});
V.addEventListener('click', async (e) => {
  const d = e.target.closest('[data-aqudazu]'); if (d && A) { const id = +d.dataset.aqudazu; await speichern({ ueberschlag_dazu: id }); rueckgaengig('Überschlag angehängt', async () => { await api('api/akquisen/' + AID, 'PUT', { ueberschlag_weg: id }); await laden(AID); }); return; }
  const dl = e.target.closest('[data-aqudel]');
  if (dl && A) { const id = +dl.dataset.aqudel, aid = A.id;
    try { const r = await api(`api/akquisen/${aid}/ueberschlaege/${id}`, 'DELETE'); await laden(aid);
      rueckgaengig('Überschlag gelöscht', async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); await laden(aid); }); } catch (er) { toast(er.message, true); }
    return; }
  const l = e.target.closest('[data-aqulos]'); if (l && A) { const id = +l.dataset.aqulos, aid = A.id; await speichern({ ueberschlag_weg: id }); rueckgaengig('Überschlag gelöst', async () => { await api('api/akquisen/' + aid, 'PUT', { ueberschlag_dazu: id }); await laden(aid); }); }
});
V.addEventListener('dragover', (e) => { const z = e.target.closest('[data-aqdrop]') || (A && V); if (!z || !e.dataTransfer.types.includes('Files')) return; e.preventDefault(); const d = V.querySelector('[data-aqdrop]'); if (d) d.classList.add('an'); });
V.addEventListener('dragleave', (e) => { if (e.target.closest('[data-aqdrop]')) e.target.closest('[data-aqdrop]').classList.remove('an'); });
V.addEventListener('drop', (e) => { if (!A || !e.dataTransfer.files.length) return; e.preventDefault(); const d = V.querySelector('[data-aqdrop]'); if (d) d.classList.remove('an'); hochladen([...e.dataTransfer.files]); });
NAV.addEventListener('dragover', (e) => { if (A && e.dataTransfer.types.includes('Files')) e.preventDefault(); });
NAV.addEventListener('drop', (e) => { if (!A || !e.dataTransfer.files.length) return; e.preventDefault(); hochladen([...e.dataTransfer.files]); });

async function hochladen(fs) {
  if (!A || !fs.length) return; const aid = A.id; let n = 0;
  const warte = setTimeout(() => toast('Lade hoch …'), 1500);
  for (const f of fs) {
    if (f.size > 80 * 1048576) { toast(`„${f.name}“ ist zu groß (höchstens 80 MB).`, true); continue; }
    const fd = new FormData(); fd.append('datei', f);
    try { const r = await fetch(`api/akquisen/${aid}/datei`, { method: 'POST', body: fd, credentials: 'same-origin' }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Fehler'); n++; } catch (er) { toast(er.message, true); }
  }
  clearTimeout(warte);
  if (n) { toast(n === 1 ? 'Datei abgelegt.' : n + ' Dateien abgelegt.'); B = null; await laden(aid); }
}
async function ordnerNeu() {
  if (!A) return; const n = await bpEingabe('Name des neuen Ordners', '', { ok: 'Anlegen' }); if (!n || !n.trim()) return;
  try { await api(`api/akquisen/${A.id}/ordner`, 'POST', { rel: n.trim() }); B = null; await laden(A.id); } catch (e) { toast(e.message, true); }
}

/* ---------- Neu, Archiv, Löschen, Überschlag ---------- */
async function neuDialog(name = '', ue = null) {
  if (typeof name !== 'string') name = '';   // Befehlsknöpfe geben das Klick-Ereignis mit
  const n = await bpEingabe('Name der Akquise (z. B. Bauvorhaben und Ort)', name, { ok: 'Anlegen' }); if (!n || !n.trim()) return;
  try { const a = await api('api/akquisen', 'POST', { name: n.trim(), ...(ue ? { ueberschlag: ue } : {}) }); ARCH = false; await laden(a.id);
    rueckgaengig('Akquise angelegt', async () => { await api('api/akquisen/' + a.id, 'DELETE'); AID = null; await laden(); }); } catch (e) { toast(e.message, true); }
}
function ueberschlagWahl(id) {
  const u = L.ueberschlaege.find((x) => x.id === id); if (!u) return;
  const items = [{ value: 'neu', title: '＋ Neue Akquise daraus' }, ...(A ? [{ value: 'dazu', title: `→ an „${A.name}“ hängen` }] : [])];
  const el = NAV.querySelector(`[data-aq="u:${id}"]`) || NAV;
  pickMenu(el, { items, onPick: async (w) => { if (w === 'neu') neuDialog(u.wofuer || '', id); else if (w === 'dazu') { await speichern({ ueberschlag_dazu: id }); rueckgaengig('Überschlag angehängt', async () => { await api('api/akquisen/' + AID, 'PUT', { ueberschlag_weg: id }); await laden(AID); }); } } });
}
async function archivieren() {
  if (!A) return; const aid = A.id, an = !A.archiviert;
  try { await api(`api/akquisen/${aid}/archiv`, 'POST', { an }); if (an) { ARCH = false; AID = null; } await laden(an ? undefined : aid);
    rueckgaengig(an ? 'Akquise archiviert' : 'Akquise zurückgeholt', async () => { await api(`api/akquisen/${aid}/archiv`, 'POST', { an: !an }); ARCH = an; await laden(aid); }); } catch (e) { toast(e.message, true); }
}
async function loeschen() {
  if (!A || !(await bpFrage(`„${A.name}“ löschen?\n\nDie Daten gehen in den Papierkorb, die Dateien bleiben im Ordner „${L.wurzel || 'Akquise'}/${A.ordner}“.`, { ok: 'Löschen', gefahr: true }))) return;
  const aid = A.id;
  try { const r = await api('api/akquisen/' + aid, 'DELETE'); AID = null; await laden();
    if (r.papierkorb) rueckgaengig('Akquise gelöscht', async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); await laden(aid); }); } catch (e) { toast(e.message, true); }
}

/* ---------- rechts: Datei und Umwandeln (seite.js; am Handy unter den Daten) ---------- */
const breit = bpBreit;   // bp.js
function rechts() {
  if (breit()) {
    if (!WORK.querySelector(':scope > .sr-r')) {
      const R = (id, titel) => ({ id, titel, mount: (el) => { RE[id] = el; rechtsFuellen(id); }, neu: () => rechtsFuellen(id) });
      seite(WORK, 'aq', [R('datei', 'Datei'), R('umwandeln', 'Umwandeln')], { start: 'datei', w: 0.55, minL: 460, min: 340 });
    } else rechtsNeu();
  } else { const u = $('#aqUnten'); if (u) { u.innerHTML = '<div class="aq-k" data-r="datei"></div><div class="aq-k" data-r="umwandeln"></div>'; RE.datei = u.firstChild; RE.umwandeln = u.lastChild; rechtsFuellen('datei'); rechtsFuellen('umwandeln'); } }
}
function rechtsNeu() { if (breit()) ['datei', 'umwandeln'].forEach(rechtsFuellen); else rechts(); }
function rechtsFuellen(id) {
  const el = RE[id]; if (!el || !el.isConnected) return;
  if (!A) { el.innerHTML = '<div class="aq-r"><p class="mute">Links eine Akquise wählen.</p></div>'; return; }
  if (id === 'datei') dateiZeigen(el); else umwandelnZeigen(el);
}
function dateiZeigen(el) {
  if (!DATEI) { el.innerHTML = '<div class="aq-r"><p class="mute">Links im Dateibaum eine Datei wählen.</p></div>'; return; }
  const url = `api/akquisen/${A.id}/datei?rel=${encodeURIComponent(DATEI)}`, name = DATEI.split('/').pop();
  el.innerHTML = `<div class="aq-r"><div class="k"><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(name)}</b><button type="button" class="btn sm" data-aqren>✎ Umbenennen</button><a class="btn sm" href="${url}" target="_blank" rel="noopener">Öffnen</a></div><div class="pv"></div></div>`;
  const pv = el.querySelector('.pv');
  if (/\.pdf$/i.test(name)) BPHead.pdfIn(pv, url);
  else if (/\.(jpe?g|png|gif|webp)$/i.test(name)) pv.innerHTML = `<img src="${url}" alt="${esc(name)}">`;
  else pv.innerHTML = '<p class="mute">Keine Vorschau – „Öffnen“ lädt die Datei.</p>';
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !e.target.closest('[data-aqren]') || !A || !DATEI) return;
  const alt = DATEI, n = await bpEingabe('Neuer Name', alt.split('/').pop(), { ok: 'Umbenennen' }); if (!n || !n.trim() || n.trim() === alt.split('/').pop()) return;
  const aid = A.id;
  try { const r = await api(`api/akquisen/${aid}/umbenennen`, 'POST', { rel: alt, neu: n.trim() }); DATEI = r.rel; B = null; await laden(aid);
    rueckgaengig('Datei umbenannt', async () => { await api(`api/akquisen/${aid}/umbenennen`, 'POST', { rel: r.rel, neu: alt.split('/').pop() }); DATEI = alt; B = null; await laden(aid); }); } catch (er) { toast(er.message, true); }
});

/* Umwandeln: nächste freie Nummer vorschlagen (änderbar – z. B. A450.23 als Folgeprojekt), Dateien einsortieren (Vorschlag je Datei, änderbar),
   was nicht passt, kommt in „… Leistungsphase 0“; Überschläge werden Honoraraufträge */
async function umwandelnZeigen(el, nummer) {
  if (A.archiviert) { el.innerHTML = '<div class="aq-r"><p class="mute">Archivierte Akquisen erst zurückholen.</p></div>'; return; }
  if (!UW || UW.aid !== A.id || nummer !== undefined) {
    el.innerHTML = '<div class="aq-r"><p class="mute">Lade Vorschlag (Projektvorlage, Dateien) …</p></div>';
    const aid = A.id;
    try { const v = await api(`api/akquisen/${aid}/umwandeln${nummer ? '?nummer=' + encodeURIComponent(nummer) : ''}`); UW = { aid, ...v, nummer: nummer || v.nummer, name: UW && UW.aid === aid ? UW.name : A.name }; } catch (er) { el.innerHTML = `<div class="aq-r"><p class="err">${esc(er.message)}</p></div>`; return; }
    if (aid !== AID) return;
  }
  const O = UW.ordner.length ? UW.ordner : [UW.lph0];
  el.innerHTML = `<div class="aq-r aq-uw">
    <b>„${esc(A.name)}“ in ein Projekt umwandeln</b>
    <label>Projektnummer <small>nächste freie vorgeschlagen – bei einem Folgeprojekt z. B. A450.23</small><input type="text" data-uwn value="${esc(UW.nummer)}"></label>
    <label>Projektname<input type="text" data-uwname value="${esc(UW.name)}"></label>
    <div><b style="font-size:.84rem">Dateien einsortieren</b> <small class="mute">– Vorschlag je Datei, änderbar; sonst „${esc(UW.lph0 || 'Leistungsphase 0')}“</small></div>
    ${UW.dateien.length ? `<div class="tw"><table class="aq-t"><tr><th>Datei</th><th>kommt nach</th></tr>${UW.dateien.map((f, i) => `<tr><td title="${esc(f.rel)}">${esc(f.name)}<br><small class="mute">${esc(f.grund || '')}</small></td>
      <td><select data-uwz="${i}" data-bp-auswahl>${[...new Set([f.ziel, ...O])].map((o) => `<option value="${esc(o)}"${o === f.ziel ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></td></tr>`).join('')}</table></div>` : '<p class="mute" style="margin:0">Keine Dateien im Ordner.</p>'}
    ${A.ueberschlaege.length ? `<label class="ck"><input type="checkbox" data-uwho checked> ${A.ueberschlaege.length} Überschl${A.ueberschlaege.length === 1 ? 'ag wird Honorarauftrag' : 'äge werden Honoraraufträge'} (Stand Angebot)</label>` : ''}
    <label class="ck"><input type="checkbox" data-uwich> Projekt erst nur für mich sichtbar <small class="mute">(sonst für alle)</small></label>
    ${UW.hinweis ? `<p class="hin">${esc(UW.hinweis)}</p>` : ''}${UW.testserver ? '<p class="hin">Testserver: die Ablage wird nur gelesen – Ordner und Dateien bleiben, wo sie sind.</p>' : ''}
    <div class="k"><button type="button" class="btn sm" data-uwneu>↻ Vorschlag neu (mit dieser Nummer)</button><span style="flex:1"></span><button type="button" class="btn pri" data-uwok>In Projekt umwandeln</button></div></div>`;
}
document.addEventListener('change', (e) => {
  const z = e.target.closest && e.target.closest('[data-uwz]'); if (z && UW) { UW.dateien[+z.dataset.uwz].ziel = z.value; return; }
  if (e.target.matches && e.target.matches('[data-uwname]') && UW) UW.name = e.target.value;
  if (e.target.matches && e.target.matches('[data-uwn]') && UW) UW.nummer = e.target.value.trim();
});
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !UW || !A) return;
  const box = e.target.closest('.aq-uw'); if (!box) return;
  if (e.target.closest('[data-uwneu]')) { umwandelnZeigen(RE.umwandeln, box.querySelector('[data-uwn]').value.trim()); return; }
  if (!e.target.closest('[data-uwok]')) return;
  const nummer = box.querySelector('[data-uwn]').value.trim(), name = box.querySelector('[data-uwname]').value.trim();
  if (!(await bpFrage(`Projekt „${nummer} ${name}“ anlegen?\n\nDer Ordner „${L.wurzel || 'Akquise'}/${A.ordner}“ wandert in den Projektpfad (Ordner nach der Vorlage des Büros), die Dateien wie zugeordnet.`, { ok: 'Umwandeln' }))) return;
  const aid = A.id, warte = setTimeout(() => toast('Lege Projekt und Ordner an …'), 1500);
  try {
    const r = await api(`api/akquisen/${aid}/umwandeln`, 'POST', { nummer, name, zuordnung: UW.dateien.map((f) => ({ rel: f.rel, ziel: f.ziel })),
      honorar: !box.querySelector('[data-uwho]') || box.querySelector('[data-uwho]').checked, nur_ich: box.querySelector('[data-uwich]').checked });
    clearTimeout(warte); UW = null; AID = null; await laden();
    await bpHinweis(`Projekt „${nummer} ${name}“ angelegt.\n\n${r.dateien} Datei${r.dateien === 1 ? '' : 'en'} im Projektordner${r.pfad ? ' „' + r.pfad + '“' : ''}${r.honorar ? `, ${r.honorar} Honorarauftrag/-aufträge (Angebot)` : ''}.${r.fehler.length ? '\n\nHinweise:\n' + r.fehler.slice(0, 8).join('\n') : ''}`);
  } catch (er) { clearTimeout(warte); toast(er.message, true); }
});

(async () => {
  const me = await api('api/me'); applyLook(me);
  const PC = await api('api/platform');
  await header('Akquise', me, PC);
  BPHead.appEinstellungen([{ key: 'ordner', label: 'Ordner im Projektpfad', render: (h) => aqEinst(h) }]);   // Verwaltung → Einstellungen → Apps → Akquise
  bpNav.breite(NAV, { key: 'akquise' });
  await laden();
  ueAusHash(); await aqAusHash();
  BPHead.live(['akquise', 'honorar_ueberschlag'], async () => { await laden(AID); BPHead.liveNotiz(); }, { projekt: false });
})().catch((e) => toast(e.message, true));

/* Aus dem To-do der Startseite: #ue=<id> fragt gleich, wohin der Überschlag soll; #ue klappt die Gruppe „Abgelegte Überschläge“ auf */
function ueAusHash() {
  const m = /^#ue(?:=(\d+))?$/.exec(location.hash); if (!m || !L) return;
  history.replaceState(null, '', location.pathname + location.search);
  const id = +m[1] || (L.ueberschlaege[0] || {}).id;
  if (!id || !L.ueberschlaege.some((u) => u.id === id)) { toast('Der Überschlag ist schon zugeordnet.'); return; }
  const el = NAV.querySelector(`[data-aq="u:${id}"]`); if (el) el.scrollIntoView({ block: 'center' });
  ueberschlagWahl(id);
}
window.addEventListener('hashchange', ueAusHash);
/* Aus der Verwaltung (Projekte → Akquise, gleiche Knöpfe wie bei Projekten, 15.11.2026): #a=<id> öffnet, &tun=daten|umwandeln|archiv|loeschen führt aus */
async function aqAusHash() {
  const m = /^#a=(\d+)(?:&tun=(\w+))?$/.exec(location.hash); if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  const id = +m[1]; await laden(id);
  if (AID !== id) { ARCH = true; await laden(id); }
  if (AID !== id) { toast('Diese Akquise gibt es nicht mehr.', true); return; }
  const el = NAV.querySelector(`[data-aq="${id}"]`); if (el) el.scrollIntoView({ block: 'center' });
  if (m[2] === 'daten') { const f = document.querySelector('#view input[data-aqf]'); if (f) f.focus(); }
  else if (m[2] === 'umwandeln') { if (breit()) seiteReiter('aq', 'umwandeln'); else rechtsNeu(); }
  else if (m[2] === 'archiv') archivieren();
  else if (m[2] === 'loeschen') loeschen();
}
window.addEventListener('hashchange', aqAusHash);
/* Doppelklick auf einen Überschlag: im Honorar-Rechner öffnen (mit seinen Werten) */
document.addEventListener('dblclick', (e) => {
  const z = e.target.closest && e.target.closest('tr[data-aquoffen]'); if (!z || e.target.closest('button')) return;
  const a = ((BPHead.conf || {}).apps || []).find((x) => x.key === 'honorar');
  if (a) location.href = BPHead.appUrl(a) + '/#ue=' + z.dataset.aquoffen; else toast('Die App „Honorar“ ist für dein Konto nicht freigeschaltet.', true);
});

/* Verwaltung → Einstellungen → Apps → Akquise: wo die Dateien liegen (Ablage + Ordner der Akquisen), Ordnernamen änderbar */
function aqEinst(host) {
  const zeichne = (E) => {
    const voll = (o) => (E.basis ? E.basis.replace(/[\\/]$/, '') + (E.basis.includes('\\') ? '\\' : '/') : '…/') + o;
    host.innerHTML = `<div class="aqe">
      <p class="bph-mu">Die Dateien jeder Akquise liegen auf dem Dateiserver im Projektpfad (Verwaltung → Einstellungen → <b>Ablage</b>) in einem eigenen Ordner; in der Datenbank stehen nur die Daten.</p>
      <div class="aqe-p"><span>Projektpfad</span><code>${esc(E.basis || 'nicht eingerichtet')}</code><span>Akquisen</span><code>${esc(voll(E.ordner))}</code><span>Archiv</span><code>${esc(voll(E.ordner + (E.basis.includes('\\') ? '\\' : '/') + E.archiv))}</code></div>
      ${E.darf ? `<div class="aqe-f"><label>Ordner der Akquisen<input data-aqe="ordner" value="${esc(E.ordner)}" placeholder="Akquise"></label><label>Archiv darin<input data-aqe="archiv" value="${esc(E.archiv)}" placeholder="_Archiv"></label></div>
        <label class="aqe-c"><input type="checkbox" data-aqe="ue_sammel"${E.ue_sammel ? ' checked' : ''}> Abgelegte Honorar-Überschläge als <b>ein</b> Sammel-To-do auf der Startseite (sonst ein To-do je Überschlag)</label>
        <p class="bph-mu">Ändern verschiebt keine vorhandenen Ordner – bitte auf dem Dateiserver selbst umbenennen. „In Projekt umwandeln“ legt den Projektordner nach der Ordnervorlage des Büros an (Ablage); was nicht zugeordnet ist, kommt in „… Leistungsphase 0“.</p>` : '<p class="bph-mu">Ändern nur in der Verwaltung.</p>'}</div>`;
  };
  host.addEventListener('change', async (e) => {
    const i = e.target.closest('[data-aqe]'); if (!i) return;
    try { const E = await api('api/einstellungen', 'PUT', { [i.dataset.aqe]: i.type === 'checkbox' ? i.checked : i.value }); zeichne(E); toast('Gespeichert.'); if (L) L.wurzel = E.ordner; } catch (er) { toast(er.message, true); }
  });
  api('api/einstellungen').then(zeichne).catch((e) => { host.textContent = e.message; });
}
