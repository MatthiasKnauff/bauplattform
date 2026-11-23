'use strict';
/* Adressen – rechts die Details des gewählten Kontakts (GO 22.11.2026, Mock „Adressen rechts“: AR-1 … AR-5 alle A).
   Bereich rechts wie in den anderen Apps (seite.js, abdockbar, Breite ziehbar) mit den Reitern
     Kontakt         – zum Lesen: Name, Art/Gewerk, Ansprechpartner, Telefon/Mail (Kopieren, ✉), Anschrift, Stichwörter, Projekte, die letzten Vorgänge;
                       „✎ Bearbeiten“ öffnet die Kontaktmaske (bp/kontakt.js)
     Projekte        – wo der Kontakt beteiligt ist (aus der Kontaktliste)
     Schriftverkehr  – Mails, LV-Versand, Rügen … aus dem Kern (/api/bp/kontakt/<id>/verlauf), geladen erst beim Öffnen; Sprung in die Kommunikation
   Ein Klick auf eine Karte oder Tabellenzeile zeigt den Kontakt rechts, Doppelklick öffnet die Kontaktmaske, ↑↓ blättert (AR-5 A);
   am Handy (schmal) öffnet ein Tippen wie bisher die Maske. Nutzt aus adressen.html: ALL, edit, addr, tel, trades, wtTel, wtMails, KINDN, TV, liste. */
let ADR_SEL = null, ADR_VL = { id: null, L: null };
const adrSchmal = () => matchMedia('(max-width: 820px)').matches;
const adrC = () => ALL.find((c) => c.id === ADR_SEL) || null;
function adrRechts() {
  if (!window.seite || adrSchmal() || document.querySelector('#adrW > .sr-r')) return;
  seite($('#adrW'), 'adr', [{ id: 'kontakt', titel: 'Kontakt', mount: (el) => adrFuellen(el, 'kontakt') }, { id: 'projekte', titel: 'Projekte', mount: (el) => adrFuellen(el, 'projekte') },
    { id: 'schrift', titel: 'Schriftverkehr', mount: (el) => adrFuellen(el, 'schrift') }], { planung: false, start: 'kontakt', w: 0.62, minL: 420, min: 340 });
}
const ADR_FELD = {};   // Reiter → Feld
function adrFuellen(el, id) {
  if (el) ADR_FELD[id] = el; el = ADR_FELD[id]; if (!el || !el.isConnected) return;
  const c = adrC();
  if (!c) { el.innerHTML = '<div class="adr-r mute">Links einen Kontakt anklicken – hier stehen dann seine Angaben, Projekte und der Schriftverkehr.</div>'; return; }
  if (id === 'kontakt') el.innerHTML = adrKontaktHtml(c);
  if (id === 'projekte') { el.innerHTML = `<div class="adr-r"><h3>${esc(c.name)}</h3>${adrProjekteHtml(c, true) || '<p class="mute">In keinem Projekt eingetragen.</p>'}<div><button type="button" class="btn sm" data-adrpj>＋ Projekt</button></div></div>`; adrOrdner().then(() => { if (ADR_SEL === c.id && el.isConnected && el.querySelector('[data-adrpj]')) el.querySelector('.adr-r').innerHTML = `<h3>${esc(c.name)}</h3>${adrProjekteHtml(c, true) || '<p class="mute">In keinem Projekt eingetragen.</p>'}<div><button type="button" class="btn sm" data-adrpj>＋ Projekt</button></div>`; }); }
  if (id === 'schrift') adrSchrift(el, c);
}
function adrAlleNeu() { ['kontakt', 'projekte', 'schrift'].forEach((k) => adrFuellen(null, k)); }
const adrKopie = (v) => `<button type="button" class="adr-k" data-adrkopie="${esc(v)}" title="kopieren">kopieren</button>`;
function adrKontaktHtml(c) {
  const z = (l, v, x = '') => (v ? `<div class="adr-z"><span>${l}</span><span>${v}</span>${x || '<span></span>'}</div>` : '');
  const T = [['Telefon', c.phone], ['Mobil', c.mobile], ...wtTel(c)].filter((x) => x[1]);
  const M = wtMails(c), chips = [...liste(c.stichworte), ...liste(c.tags)], a = addr(c);
  return `<div class="adr-r"><div><h3>${esc(c.name)}</h3><div class="mute">${esc(KINDN[c.kind] || c.kind || '')}${c.trade ? ' · ' + esc(c.trade) : ''}</div></div>
    ${z('Ansprechpartner', esc([c.contact_person, c.role].filter(Boolean).join(' · ')))}
    ${T.map(([l, v]) => z(esc(l || 'Telefon'), `<a href="tel:${esc(tel(v))}">${esc(v)}</a>`, adrKopie(v))).join('')}
    ${M.map((m, i) => z(i ? 'E-Mail' : 'E-Mail', esc(m), `<span class="adr-zk"><a class="adr-k" href="mailto:${esc(m)}" title="Mail schreiben">✉</a>${adrKopie(m)}</span>`)).join('')}
    ${z('Anschrift', esc(a), a ? `<a class="adr-k" href="${esc(BPHead.adresseUrl(a))}" target="_blank" rel="noopener" title="Auf der Karte zeigen">Karte</a>` : '')}
    ${z('Internet', c.website ? `<a href="${esc(/^https?:/i.test(c.website) ? c.website : 'https://' + c.website)}" target="_blank" rel="noopener">${esc(c.website)}</a>` : '')}
    ${chips.length ? `<div class="adr-chips">${chips.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
    ${c.notes ? `<div class="adr-notiz">${esc(c.notes)}</div>` : ''}
    ${adrProjekteHtml(c) ? `<div class="adr-ab"><b>Projekte</b>${adrProjekteHtml(c)}</div>` : ''}
    <div class="adr-ab" data-adrzuletzt><b>Zuletzt</b><div class="mute">wird geladen …</div></div>
    <div><button type="button" class="btn sm" data-adredit>✎ Bearbeiten</button></div></div>`;
}
/* Projektnummern am Kontakt (Mock „Behörden in den Adressen“ PZ-1, 23.11.2026): ein Projekt im Bauportal mit dem Kürzel = beteiligt; sonst steht der Name
   aus den Projektordnern des Dateiservers daneben (nur gelesen, es wird kein Projekt angelegt). ＋ Projekt sucht in beidem. */
let ADR_ORD = null, ADR_ORDL = [];   // Projektordner – einmal je Seite geholt
const adrOrdner = () => (ADR_ORD || (ADR_ORD = api('api/contacts/projektordner').then((L) => (ADR_ORDL = Array.isArray(L) ? L : [])).catch(() => (ADR_ORDL = []))));
const adrKuerzel = (n) => ((/^\s*([A-Za-z]{1,3}\d{2,5}(?:\.\d+)?)\b/.exec(n || '') || [])[1] || '').toUpperCase();
function adrProjekteHtml(c, aendern) {
  const P = [...new Set([...(c.projects || []), c.site_of].filter(Boolean))], O = ADR_ORDL;
  const nrVon = (p) => (c.projektnr || []).find((k) => adrKuerzel(p) === k);
  return P.map((p) => `<div class="adr-pz"><span>${esc(p)}</span><small class="mute">${p === c.site_of ? 'Baustelle' : 'beteiligt'}</small>${aendern && nrVon(p) ? `<button type="button" class="bph-x" data-adrpjx="${esc(nrVon(p))}" title="Projekt vom Kontakt lösen" aria-label="lösen">✕</button>` : ''}</div>`).join('')
    + (c.projektnr_offen || []).map((k) => { const o = O.find((n) => adrKuerzel(n) === k);
      return `<div class="adr-pz"><span>${esc(o || k)}</span><small class="mute" title="Projekt noch nicht im Bauportal – Name aus dem Projektordner">${o ? 'Ordner' : 'Nummer'}</small>${aendern ? `<button type="button" class="bph-x" data-adrpjx="${esc(k)}" title="Projektnummer entfernen" aria-label="entfernen">✕</button>` : ''}</div>`; }).join('');
}
async function adrProjektnr(c, L, text) {
  const alt = c.projektnr || [];
  await api(`api/bp/kontakte/${c.id}`, 'PUT', { projektnr: L }); await load();
  rueckgaengig(text, async () => { await api(`api/bp/kontakte/${c.id}`, 'PUT', { projektnr: alt }); await load(); }, { neu: load });
}
document.addEventListener('click', async (e) => {
  const c = ADR_SEL && ALL.find((x) => x.id === ADR_SEL); if (!c) return;
  const x = e.target.closest('[data-adrpjx]');
  if (x) return adrProjektnr(c, (c.projektnr || []).filter((k) => k !== x.dataset.adrpjx), `Projekt ${x.dataset.adrpjx} gelöst`);
  const b = e.target.closest('[data-adrpj]'); if (!b) return;
  const [PJ, ORD] = await Promise.all([api('api/bp/projekte').catch(() => []), adrOrdner()]);
  const namen = [...new Set([...(Array.isArray(PJ) ? PJ : PJ.projekte || []).map((p) => p.name), ...(Array.isArray(ORD) ? ORD : [])])].filter((n) => adrKuerzel(n) && !(c.projektnr || []).includes(adrKuerzel(n)));
  pickMenu(b, { search: 'Projekt oder Nummer …', items: namen.map((n) => ({ title: n, value: adrKuerzel(n) })), onPick: (k) => adrProjektnr(c, [...(c.projektnr || []), k], `Projekt ${k} zugeordnet`) });
});
async function adrVerlauf(c) {   // Schriftverkehr aus dem Kern – einmal je Kontakt geholt, für „Zuletzt“ und den Reiter
  if (ADR_VL.id === c.id && ADR_VL.L) return ADR_VL.L;
  const id = c.id; ADR_VL = { id, L: null };
  const L = await api(`api/bp/kontakt/${id}/verlauf`).catch(() => []);
  if (ADR_VL.id === id) ADR_VL.L = Array.isArray(L) ? L : [];
  return ADR_VL.L || [];
}
const adrDatum = (ts) => { const d = new Date(String(ts || '').replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }); };
const adrVz = (x, i) => `<div class="adr-pz adr-vz" data-adrvz="${i}" role="button" tabindex="0" title="Öffnen"><span>${esc(x.betreff || x.art_name || 'Sendung')}${x.projekt ? ` <small class="mute">· ${esc(x.projekt)}</small>` : ''}</span><small class="mute">${esc(adrDatum(x.ts))}</small></div>`;
async function adrZuletzt(c) {
  const L = await adrVerlauf(c), box = document.querySelector('.sr-r [data-adrzuletzt], .sr-flo [data-adrzuletzt]');
  if (!box || ADR_SEL !== c.id) return;
  box.innerHTML = `<b>Zuletzt</b>${L.slice(0, 3).map((x, i) => adrVz(x, i)).join('') || '<div class="mute">Noch kein Schriftverkehr.</div>'}`;
}
async function adrSchrift(el, c) {
  const km = ((window.BPHead && BPHead.conf) || {}).apps ? BPHead.conf.apps.find((a) => a.key === 'kommunikation') : null;
  el.innerHTML = '<div class="adr-r mute">Schriftverkehr wird geladen …</div>';
  const L = await adrVerlauf(c); if (ADR_SEL !== c.id) return;
  el.innerHTML = `<div class="adr-r"><h3>${esc(c.name)}</h3>${L.map((x, i) => adrVz(x, i)).join('') || '<p class="mute">Noch kein Schriftverkehr.</p>'}
    ${km ? `<div><a class="btn sm" href="${esc(BPHead.appUrl(km))}/#kontakt=${c.id}">↗ in der Kommunikation öffnen</a></div>` : ''}</div>`;
}
/* Schriftverkehr anklicken (23.11.2026): ein Eintrag öffnet sich mit Inhalt, Empfänger:in, Weg und Stand; ↑ ↓ blättert, „↗ öffnen“ führt zur Sache */
function adrVzOeffnen(i) {
  const L = ADR_VL.L || []; let k = i;
  const html = (x) => `<div class="mh"><h3 style="margin:0">${esc(x.betreff || x.art_name || 'Sendung')}</h3><button type="button" class="x" data-m="x" aria-label="Schließen">✕</button></div>
    <div class="mb adr-vzd"><dl><dt>Datum</dt><dd>${esc(adrDatum(x.ts))}</dd><dt>Art</dt><dd>${esc(x.art_name || '')}${x.weg_name ? ' · ' + esc(x.weg_name) : ''}</dd>
      <dt>An</dt><dd>${esc([x.name, x.email].filter(Boolean).join(' · ') || '–')}</dd>${x.projekt ? `<dt>Projekt</dt><dd>${esc(x.projekt)}</dd>` : ''}
      ${x.von ? `<dt>Von</dt><dd>${esc(x.von)}</dd>` : ''}<dt>Stand</dt><dd>${esc(x.status === 'fehler' ? 'nicht gesendet' + (x.fehler ? ' – ' + x.fehler : '') : x.status || 'gesendet')}</dd></dl>
      ${x.inhalt ? `<div class="adr-vzt">${esc(x.inhalt)}</div>` : '<p class="mute">Kein Text gespeichert.</p>'}</div>
    <div class="mf"><button type="button" class="btn" data-m="prev"${k > 0 ? '' : ' disabled'}>↑</button><button type="button" class="btn" data-m="next"${k < L.length - 1 ? '' : ' disabled'}>↓</button>
      <span style="flex:1"></span>${x.link ? `<a class="btn" href="${esc(x.link)}">↗ öffnen</a>` : ''}<button type="button" class="btn" data-m="zu">Schließen</button></div>`;
  const bg = modalBox(html(L[k]), (m, bg, close) => {
    if (m === 'x' || m === 'zu') return close();
    k = Math.max(0, Math.min(L.length - 1, k + (m === 'next' ? 1 : m === 'prev' ? -1 : 0)));
    bg.querySelector('.modal').innerHTML = html(L[k]);
  });
  bg.querySelector('.modal').classList.add('adr-vzm');
}
document.addEventListener('click', (e) => { const z = e.target.closest('[data-adrvz]'); if (z) adrVzOeffnen(+z.dataset.adrvz); });
document.addEventListener('keydown', (e) => { const z = e.key === 'Enter' && e.target.closest && e.target.closest('[data-adrvz]'); if (z) { e.preventDefault(); adrVzOeffnen(+z.dataset.adrvz); } });
/* Wählen: Karte oder Zeile → rechts zeigen; nichts springt – nur die Markierung wechselt, rechts wird neu gefüllt */
function adrWaehle(id, fokus) {
  ADR_SEL = id;
  document.querySelectorAll('#list .ct.on, #tw tr.on').forEach((x) => x.classList.remove('on'));
  const k = document.querySelector(`#list .ct[data-id="${id}"], #tw tbody tr[data-id="${id}"]`);
  if (k) { k.classList.add('on'); if (fokus) { k.scrollIntoView({ block: 'nearest' }); if (k.classList.contains('ct')) k.focus(); } }
  adrAlleNeu();
  const c = adrC(); if (c) adrZuletzt(c);
}
function adrKlick(c) { if (!c) return; if (adrSchmal() || !document.querySelector('#adrW > .sr-r')) { edit(c); return; } adrWaehle(c.id); }
function adrNachRender() {   // nach jedem Zeichnen der Liste: Markierung wieder setzen, rechts nachführen (geänderter Kontakt)
  adrRechts();
  if (ADR_SEL != null && !adrC()) ADR_SEL = null;
  if (ADR_SEL != null) { const k = document.querySelector(`#list .ct[data-id="${ADR_SEL}"], #tw tbody tr[data-id="${ADR_SEL}"]`); if (k) k.classList.add('on'); }
  ADR_VL = { id: null, L: null }; adrAlleNeu(); const c = adrC(); if (c) adrZuletzt(c);
  if (typeof awNach === 'function') awNach();   // Auswahl: Haken und Leiste (adressen-auswahl.js)
}
$('#list').addEventListener('dblclick', (e) => { if (e.target.closest('a')) return; const el = e.target.closest('.ct'); if (el) edit(ALL.find((c) => c.id === +el.dataset.id)); });
$('#list').addEventListener('keydown', (e) => {   // ↑↓ blättert durch die Karten, Enter öffnet die Maske
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) || !e.target.classList.contains('ct')) return;
  const K = [...document.querySelectorAll('#list .ct')], i = K.indexOf(e.target), n = K[i + (e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1)];
  if (n) { e.preventDefault(); adrWaehle(+n.dataset.id, true); }
});
$('#tw').addEventListener('click', (e) => {   // Tabelle: Klick in eine Zeile (nicht in ein Feld) zeigt den Kontakt rechts
  const tr = e.target.closest('tbody tr[data-id]'); if (!tr || e.target.closest('a,button,[data-open]') || adrSchmal()) return;
  if (ADR_SEL !== +tr.dataset.id) adrWaehle(+tr.dataset.id);
});
document.addEventListener('click', (e) => {
  const k = e.target.closest && e.target.closest('[data-adrkopie]');
  if (k) { const v = k.dataset.adrkopie; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast(`„${v}“ kopiert.`), () => toast('Kopieren ging nicht – bitte markieren.', true)); return; }
  if (e.target.closest && e.target.closest('[data-adredit]')) { const c = adrC(); if (c) edit(c); }
});
addEventListener('resize', () => { clearTimeout(adrRechts.t); adrRechts.t = setTimeout(adrRechts, 200); });
