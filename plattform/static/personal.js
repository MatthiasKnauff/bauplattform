'use strict';
/* Personal – Seite der App (besprochen am 14.11.2026, Mock „App Personal“). Links die Personen (bpNav: Personen, Überblick, Archiv),
   oben die Befehlsleiste, in der Mitte die Person (Daten, Urlaub und Anträge) oder ein Überblick (Abwesenheiten des Monats, Urlaubsanträge),
   rechts der abdockbare Bereich (seite.js): Abwesenheiten im Monat und die Akte 🔒 (nur Recht „Personal“; jedes Öffnen steht im Protokoll).
   Urlaub und Abwesenheit kommen aus dem Kern der Zeiten – nichts doppelt. Server: plattform/personal.py. */
let ME = null, L = null, P = null, SEL = null, AUS = false, AN = null, KAL = null, AKTE = null, DATEI = '';
let MONAT = new Date().toISOString().slice(0, 7);
const NAV = $('#navL'), LEISTE = $('#bfl'), V = $('#view'), WORK = $('#work'), RE = {};
const IC = { person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>', kal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  urlaub: '<path d="M12 21V11"/><path d="M12 11c-3-4-7-3-8 0 3-1 6 0 8 0zM12 11c3-4 7-3 8 0-3-1-6 0-8 0zM12 11c-1-4 1-7 4-7"/>', archiv: '<path d="M4 4h16v4H4z"/><path d="M5 8v12h14V8"/><path d="M10 12h4"/>',
  neu: '<path d="M12 5v14M5 12h14"/>', akte: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><rect x="9" y="12" width="7" height="6" rx="1"/><path d="M10.5 12v-1.5a2 2 0 0 1 4 0V12"/>', ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>' };
const ARTF = { urlaub: '#9fc3ef', urlaub_halb: '#9fc3ef', krank: '#f2b4ac', frei: '#b9dfc6', schule: '#e6d29a' };
const deD = (t) => (t && t.length >= 10 ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : t || '');
const zahl = (v) => (Math.round((+v || 0) * 10) / 10).toLocaleString('de-DE');
const std = (m) => `${m < 0 ? '−' : '+'}${zahl(Math.abs(m) / 60)} h`;
const heute = () => new Date().toISOString().slice(0, 10);
const LS = { get(k) { try { return JSON.parse(localStorage.getItem('pe.' + k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem('pe.' + k, JSON.stringify(v)); } catch { /* egal */ } } };
const breit = () => window.seite && !matchMedia('(max-width: 820px)').matches;

async function laden(sel) {
  L = await api('api/personen' + (AUS ? '?aus=1' : ''));
  if (sel !== undefined) SEL = sel;
  if (!SEL) SEL = LS.get('sel') || 'p:' + L.ich;
  if (SEL.startsWith('p:') && !AUS && ME.alle && L.aus && !L.personen.some((x) => 'p:' + x.id === SEL)) {   // ausgeschieden (z. B. aus dem To-do „Akte löschen“)
    const A = await api('api/personen?aus=1'); if (A.personen.some((x) => 'p:' + x.id === SEL)) { AUS = true; L = A; } }
  if (SEL.startsWith('p:') && !L.personen.some((x) => 'p:' + x.id === SEL)) SEL = L.personen.length ? 'p:' + (L.personen.find((x) => x.id === L.ich) || L.personen[0]).id : 'abw';
  LS.set('sel', SEL);
  P = null; AKTE = null; DATEI = '';
  if (SEL.startsWith('p:')) { try { P = await api('api/personen/' + SEL.slice(2)); } catch (e) { toast(e.message, true); } }
  if (SEL === 'ant' || P) AN = await api('api/antraege').catch(() => null);
  zeichne();
}

/* ---------- links ---------- */
function nav() {
  const pp = L.personen.map((x) => ({ id: 'p:' + x.id, text: x.name, icon: IC.person }));
  const offen = L.antraege_offen;
  const gruppen = [{ titel: AUS ? `Ausgeschieden · ${pp.length}` : 'Personen', punkte: pp.length ? pp : [{ id: 'leer', text: 'keine', icon: IC.person }] },
    { titel: 'Überblick', punkte: [{ id: 'abw', text: 'Abwesenheiten', icon: IC.kal }, { id: 'ant', text: 'Urlaubsanträge', icon: IC.urlaub, zahl: offen ? `${offen} offen` : '', farbe: offen ? 'var(--red,#b42318)' : '' }] }];
  if (ME.alle) gruppen.push({ titel: 'Archiv', punkte: [{ id: 'aus', text: AUS ? 'Aktive zeigen' : `Ausgeschieden (${L.aus})`, icon: IC.archiv }] });
  bpNav(NAV, { kopf: { titel: 'Personal', klein: AUS ? 'ausgeschieden' : `${L.personen.length} aktiv` }, attr: 'pe', lage: true, gruppen, aktiv: SEL,
    wahl: (id) => { if (id === 'leer') return; if (id === 'aus') { AUS = !AUS; SEL = null; laden(); } else laden(id); } });
}

/* ---------- Befehlsleiste ---------- */
function leiste() {
  const K = (t, ic, fn, o = {}) => ({ t, ic, fn, tip: o.tip || t, aus: !!o.aus });
  const adm = ((BPHead.conf || {}).apps || []).find((a) => a.key === 'admin' && a.allowed);
  const ich = P && P.id === L.ich;
  befehle(LEISTE, [
    { titel: 'Abwesenheit', knoepfe: [K(ich || !P ? 'Urlaub beantragen' : 'Abwesenheit eintragen', IC.urlaub, () => abwDialog(), { tip: 'Urlaub, Frei, Fortbildung beantragen – die vorgesetzte Person genehmigt; krank sofort eintragen' }),
      K('Kalender', IC.kal, () => { if (breit()) seiteReiter('pe', 'kal'); else laden('abw'); })] },
    ...(ME.akte ? [{ titel: 'Akte', knoepfe: [K('Akte öffnen', IC.akte, () => { if (breit()) seiteReiter('pe', 'akte'); else akteUnten(); }, { aus: !P, tip: 'Dokumente der Person auf dem Dateiserver (nur Recht „Personal“, wird protokolliert)' }),
      K('Dokument ablegen', IC.neu, () => { const f = $('#peFile'); if (f) f.click(); }, { aus: !P })] }] : []),
    ...(adm ? [{ titel: 'Verwaltung', rechts: true, knoepfe: [K('Person anlegen', IC.ext, () => { location.href = BPHead.appUrl(adm) + '/#users'; }, { tip: 'Anmeldung, Rolle, Vorgesetzte:r und Rechte – in der Verwaltung' })] }] : []),
  ]);
}

/* ---------- Mitte ---------- */
function zeichne() {
  nav(); leiste();
  const pos = V.scrollTop;
  if (SEL === 'abw') V.innerHTML = `<div class="pe-w"><div class="pe-k"><h3>Abwesenheiten <small>alle, die du siehst – Grund nur bei dir selbst und für wer Urlaub entscheidet</small></h3><div data-kal></div></div></div>`;
  else if (SEL === 'ant') V.innerHTML = `<div class="pe-w"><div class="pe-k"><h3>Urlaubsanträge <small>offene und die von ${new Date().getFullYear()}, offene zuerst – entscheiden kann die vorgesetzte Person</small></h3>${antraegeHtml(AN ? AN.antraege : [], true)}</div></div>`;
  else if (!P) V.innerHTML = '<div class="leer">Links eine Person wählen.</div>';
  else V.innerHTML = personHtml();
  V.scrollTop = pos;
  if (SEL === 'abw') kalender(V.querySelector('[data-kal]'));
  rechts();
}
function personHtml() {
  const f = (k, l, o = {}) => (P.darf_aendern ? `<label>${l}<input data-pef="${k}" value="${esc(P[k] || '')}"${o.typ ? ` type="${o.typ}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}></label>`
    : `<label>${l}<span class="wert">${esc((o.typ === 'date' ? deD(P[k]) : P[k]) || '–')}</span></label>`);
  const w = (l, v) => `<label>${l}<span class="wert">${esc(v || '–')}</span></label>`;
  const k = P.konto || {}, rest = k.urlaub_rest;
  const aus = P.austritt && P.austritt <= heute();
  return `<div class="pe-w">
    <div class="pe-k"><h2>${esc(P.name)} <small>${esc(P.rolle || '')}${P.eintritt ? ' · seit ' + deD(P.eintritt) : ''}${aus ? ' · ausgeschieden ' + deD(P.austritt) : ''}</small></h2>
      <div class="pe-f">${w('Rolle', P.rolle)}${w('Vorgesetzte:r', P.vorgesetzter)}${w('E-Mail', P.email)}
        ${f('telefon', 'Telefon / Handy')}${w('Wochenstunden (Soll)', zahl(P.soll_woche) + ' h')}${w('Urlaubsanspruch / Jahr', zahl(P.urlaub) + ' Tage')}
        ${f('eintritt', 'Eintritt', { typ: 'date' })}${f('austritt', 'Austritt', { typ: 'date' })}${f('notfall', 'Notfallkontakt', { ph: 'Name, Telefon' })}
        ${P.gehalt_feld ? f('gehalt', 'Gehalt', { ph: 'z. B. 3.800 € brutto / Monat' }) : ''}</div>
      ${P.darf_aendern ? `<label class="mute" style="display:grid;gap:.15rem;font-size:.78rem">Notiz<textarea data-pef="notiz">${esc(P.notiz || '')}</textarea></label>` : ''}
      <p class="pe-hin">Rolle, Vorgesetzte:r, Soll-Stunden und Urlaubsanspruch stehen in der Verwaltung bzw. in „Zeiten“ – hier nur angezeigt, nichts doppelt.${P.darf_aendern ? '' : ' Ändern darf, wer das Recht „Personal“ hat.'}</p></div>
    <div class="pe-k"><h3>Urlaub ${new Date().getFullYear()} <small>aus „Zeiten“</small></h3>
      <div class="pe-zahlen"><div>Anspruch<b>${zahl(P.urlaub)}</b></div><div>genommen / eingetragen<b>${zahl(k.urlaub_genommen)}</b></div><div>beantragt<b>${zahl(k.urlaub_beantragt)}</b></div>
        <div class="${rest < 0 ? 'rot' : 'ok'}">übrig<b>${zahl(rest)}</b></div><div>Zeitkonto<b>${std(k.saldo || 0)}</b></div>${k.krank != null && P.darf_aendern ? `<div>krank (Tage)<b>${zahl(k.krank)}</b></div>` : ''}</div>
      ${antraegeHtml((AN ? AN.antraege : []).filter((a) => a.user_id === P.id), false)}
      <div class="knopf"><button type="button" class="btn sm pri" data-peabw>${P.id === L.ich ? '🌴 Urlaub beantragen …' : '🌴 Abwesenheit eintragen …'}</button></div></div>
    ${P.akte && !breit() ? '<div class="pe-k" id="peAkteU"></div>' : ''}
    ${!breit() ? '<div class="pe-k" id="peKalU"></div>' : ''}</div>`;
}
function antraegeHtml(A, mitName) {
  if (!A.length) return '<p class="pe-hin">Keine Anträge in diesem Jahr.</p>';
  const art = (a) => (AN && AN.arten[a.art]) || a.art;
  return `<table class="pe-t"><tr>${mitName ? '<th>Person</th>' : ''}<th>Zeitraum</th><th>Art</th><th class="r">Tage</th><th>Stand</th></tr>${A.map((a) => {
    const nm = (L.personen.find((x) => x.id === a.user_id) || {}).name || a.name;
    const k = a.status === 'offen' && a.darf ? `<button type="button" class="btn sm pri" data-pea="genehmigen:${a.id}">Genehmigen</button> <button type="button" class="btn sm" data-pea="ablehnen:${a.id}">Ablehnen</button>`
      : a.rueckzug === 'beantragt' && a.darf ? `<button type="button" class="btn sm" data-pea="rueckzug_ok:${a.id}">Zurückziehen erlauben</button> <button type="button" class="btn sm" data-pea="rueckzug_nein:${a.id}">nein</button>`
        : a.user_id === L.ich && ['offen', 'genehmigt'].includes(a.status) && a.rueckzug !== 'beantragt' ? `<button type="button" class="btn sm" data-pea="zurueckziehen:${a.id}">Zurückziehen</button>` : '';
    return `<tr>${mitName ? `<td>${esc(nm)}</td>` : ''}<td class="zr">${deD(a.von)}${a.bis !== a.von ? ' – ' + deD(a.bis) : ''}${a.notiz ? `<br><small class="mute">${esc(a.notiz)}</small>` : ''}</td><td>${esc(art(a))}</td><td class="r">${zahl(a.tage)}</td>
      <td><span class="pe-st ${a.status}">${esc(a.status === 'zurueckgezogen' ? 'zurückgezogen' : a.status)}</span>${a.rueckzug === 'beantragt' ? ' <small class="mute">Zurückziehen erbeten</small>' : ''}${a.antwort ? `<br><small class="mute">${esc(a.antwort)}</small>` : ''}${k ? `<div class="k">${k}</div>` : ''}</td></tr>`; }).join('')}</table>`;
}
V.addEventListener('change', async (e) => {
  const f = e.target.closest('[data-pef]'); if (!f || !P) return;
  const k = f.dataset.pef; if ((P[k] || '') === f.value) return;
  const uid = P.id, vorher = { [k]: P[k] || '' };
  try { await api('api/personen/' + uid, 'PUT', { [k]: f.value }); await laden('p:' + uid);
    rueckgaengig('Geändert', async () => { await api('api/personen/' + uid, 'PUT', vorher); await laden('p:' + uid); }); } catch (er) { toast(er.message, true); }
});
document.addEventListener('click', async (e) => {
  if (!e.target.closest) return;
  if (e.target.closest('[data-peabw]')) { abwDialog(); return; }
  const b = e.target.closest('[data-pea]'); if (!b) return;
  const [aktion, id] = b.dataset.pea.split(':');
  let antwort = '';
  if (aktion === 'ablehnen' || aktion === 'rueckzug_nein') { antwort = await bpEingabe('Begründung (sieht die Person)', '', { ok: aktion === 'ablehnen' ? 'Ablehnen' : 'Senden' }); if (!antwort || !antwort.trim()) return; }
  try { await api('api/antraege/' + id, 'PUT', { aktion, antwort }); toast({ genehmigen: 'Genehmigt – steht im Kalender.', ablehnen: 'Abgelehnt.', zurueckziehen: 'Zurückgezogen.', rueckzug_ok: 'Zurückgezogen.', rueckzug_nein: 'Gesendet.' }[aktion]); KAL = null; await laden(SEL); } catch (er) { toast(er.message, true); }
});

/* Abwesenheit: für sich Urlaub, Frei, Fortbildung beantragen (wenn so eingestellt), krank sofort; Vorgesetzte und Personal tragen für andere direkt ein */
function abwDialog() {
  const uid = P ? P.id : L.ich, ich = uid === L.ich, pflicht = AN ? AN.pflicht : true;
  const arten = Object.entries((AN && AN.arten) || { urlaub: 'Urlaub', krank: 'Krank' });
  const t = heute();
  modalBox(`<h3>${ich ? 'Urlaub beantragen / abwesend' : 'Abwesenheit eintragen – ' + esc(P.name)}</h3><div class="pe-f" style="min-width:min(26rem,80vw)">
      <label>Art<select id="peArt" data-bp-auswahl>${arten.map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}${ich ? '' : '<option value="">– austragen –</option>'}</select></label>
      <label>von<input id="peVon" type="date" value="${t}"></label><label>bis<input id="peBis" type="date" value="${t}"></label>
      <label style="grid-column:1/-1">Notiz / Vertretung <small>(nie eine Diagnose)</small><input id="peNotiz" maxlength="300"></label></div>
    <p class="pe-hin" id="peHin"></p>
    <div class="acts"><span class="fill"></span><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">OK</button></div>`,
  async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const b = { uid, art: bg.querySelector('#peArt').value, von: bg.querySelector('#peVon').value, bis: bg.querySelector('#peBis').value || bg.querySelector('#peVon').value, notiz: bg.querySelector('#peNotiz').value };
    const antrag = ich && pflicht && !ME.alle && (AN ? AN.antrag_arten : ['urlaub', 'urlaub_halb', 'frei', 'schule']).includes(b.art);
    try {
      if (antrag) { const r = await api('api/antraege', 'POST', b); close(); toast('Beantragt – die vorgesetzte Person bekommt ein To-do.'); KAL = null; await laden(SEL);
        rueckgaengig('Urlaub beantragt', async () => { await api('api/antraege/' + r.antrag.id, 'PUT', { aktion: 'zurueckziehen' }); KAL = null; await laden(SEL); }); return; }
      const r = await api('api/abwesenheit', 'PUT', b); close(); toast(r.tage ? `${r.tage} Tag${r.tage === 1 ? '' : 'e'} eingetragen.` : 'Kein Arbeitstag im Zeitraum.'); KAL = null; await laden(SEL);
      if (b.art) rueckgaengig('Abwesenheit eingetragen', async () => { await api('api/abwesenheit', 'PUT', { ...b, art: '' }); KAL = null; await laden(SEL); });
    } catch (er) { toast(er.message, true); }
  });
}

/* ---------- Kalender (rechts und Überblick) ---------- */
async function kalender(el) {
  if (!el || !el.isConnected) return;
  if (!KAL || KAL.monat !== MONAT) { el.innerHTML = '<p class="mute">Lade …</p>'; try { KAL = { monat: MONAT, ...(await api('api/abwesenheiten?monat=' + MONAT)) }; } catch (er) { el.innerHTML = `<p class="err">${esc(er.message)}</p>`; return; } }
  if (!el.isConnected) return;
  const [j, mo] = MONAT.split('-').map(Number), t0 = heute();
  const name = new Date(j, mo - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const ART = { urlaub: 'Urlaub', urlaub_halb: 'Urlaub ½', krank: 'krank', frei: 'Frei', schule: 'Fortbildung', beantragt: 'beantragt', weg: 'abwesend' };
  el.innerHTML = `<div class="pe-r" style="padding:0"><div class="kopf"><button type="button" class="btn sm" data-pem="-1" aria-label="Monat zurück">‹</button><b style="text-align:center">${esc(name)}</b><button type="button" class="btn sm" data-pem="1" aria-label="Monat vor">›</button></div>
    <div class="pe-kal-w"><table class="pe-kal"><tr><th class="n"></th>${KAL.tage.map((d) => `<th class="${d.we ? 'we' : ''}" title="${esc(d.feiertag)}">${+d.tag.slice(8)}</th>`).join('')}</tr>
    ${KAL.personen.map((p) => `<tr class="${p.id === L.ich ? 'ich' : ''}"><th class="n" title="${esc(p.rolle || '')}">${esc(p.name)}</th>${KAL.tage.map((d) => { const a = p.abw[d.tag] || '';
      return `<td class="${d.we ? 'we ' : ''}${d.feiertag ? 'ft ' : ''}${a}${d.tag === t0 ? ' heute' : ''}" title="${esc(deD(d.tag) + (d.feiertag ? ' · ' + d.feiertag : '') + (a ? ' · ' + (ART[a] || a) : ''))}"></td>`; }).join('')}</tr>`).join('')}</table></div>
    <div class="pe-leg"><span><i style="background:${ARTF.urlaub}"></i>Urlaub</span><span><i style="background:repeating-linear-gradient(45deg,#9fc3ef 0 3px,transparent 3px 6px)"></i>beantragt</span><span><i style="background:${ARTF.krank}"></i>krank</span><span><i style="background:${ARTF.frei}"></i>Frei</span><span><i style="background:${ARTF.schule}"></i>Fortbildung</span><span><i style="background:color-mix(in srgb,var(--mute) 45%,transparent)"></i>abwesend</span></div></div>`;
}
document.addEventListener('click', (e) => {
  const m = e.target.closest && e.target.closest('[data-pem]'); if (!m) return;
  const [j, mo] = MONAT.split('-').map(Number), d = new Date(j, mo - 1 + +m.dataset.pem, 1);
  MONAT = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  kalender(m.closest('[data-kal]') || RE.kal || $('#peKalU'));
});

/* ---------- rechts: Abwesenheiten und Akte (seite.js; schmal unter der Person) ---------- */
function rechts() {
  if (breit()) {
    if (!WORK.querySelector(':scope > .sr-r')) {
      const R = (id, titel) => ({ id, titel, mount: (el) => { RE[id] = el; rechtsFuellen(id); }, neu: () => rechtsFuellen(id) });
      seite(WORK, 'pe', [R('kal', 'Abwesenheiten'), ...(ME.akte ? [R('akte', 'Akte 🔒')] : [])], { start: 'kal', w: 0.5, minL: 440, min: 340 });
    } else ['kal', 'akte'].forEach(rechtsFuellen);
  } else {
    const k = $('#peKalU'); if (k) { k.setAttribute('data-kal', ''); kalender(k); }
  }
}
function rechtsFuellen(id) {
  const el = RE[id]; if (!el || !el.isConnected) return;
  if (id === 'kal') { el.innerHTML = '<div class="pe-r" data-kal></div>'; kalender(el.firstChild); return; }
  if (!P) { el.innerHTML = '<div class="pe-r"><p class="mute">Links eine Person wählen.</p></div>'; return; }
  akteZeigen(el);
}
function akteUnten() { const u = $('#peAkteU'); if (u) { akteZeigen(u); u.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }
async function akteZeigen(el) {
  if (!P || !ME.akte) return;
  const uid = P.id;
  if (!AKTE || AKTE.uid !== uid) {
    el.innerHTML = `<div class="pe-r"><b>Akte 🔒 ${esc(P.name)}</b><p class="mute">Öffnen wird protokolliert … <button type="button" class="btn sm" data-peakte>Akte öffnen</button></p></div>`;
    el.querySelector('[data-peakte]').addEventListener('click', async () => { el.innerHTML = '<div class="pe-r"><p class="mute">Lade …</p></div>'; try { AKTE = { uid, ...(await api(`api/personen/${uid}/akte`)) }; } catch (er) { AKTE = { uid, error: er.message, dateien: [] }; } if (P && P.id === uid) akteZeigen(el); });
    return;
  }
  const url = (rel) => `api/personen/${uid}/akte/datei?rel=${encodeURIComponent(rel)}`;
  el.innerHTML = `<div class="pe-r"><div class="kopf"><b>Akte 🔒 ${esc(P.name)}</b><button type="button" class="btn sm" data-peneu>↻</button></div>
    ${AKTE.error ? `<p class="err">${esc(AKTE.error)}</p>` : ''}
    <div class="pe-akte">${AKTE.dateien.length ? AKTE.dateien.map((d) => `<button type="button" data-pedat="${esc(d.rel)}" class="${d.rel === DATEI ? 'on' : ''}" title="${esc(d.rel)}">${/\.pdf$/i.test(d.name) ? '📄' : '📎'} ${esc(d.rel)}</button>`).join('') : '<p class="mute" style="margin:0">Noch keine Dokumente.</p>'}</div>
    <div class="pe-drop" data-pedrop>Dokumente hierher ziehen oder <label>auswählen<input type="file" id="peFile" multiple hidden data-pefile></label> – sie liegen auf dem Dateiserver unter „${esc(AKTE.pfad || 'Büro/Personal')}“, in der Datenbank nichts.${AKTE.testserver ? ' <b>Testserver: die Ablage wird nur gelesen.</b>' : ''}</div>
    ${P.austritt && P.austritt <= heute() && !P.akte_geloescht ? '<div class="knopf"><button type="button" class="btn sm" data-pegel>Akte auf dem Dateiserver gelöscht – vermerken</button></div>' : P.akte_geloescht ? `<p class="pe-hin">Akte gelöscht am ${deD(P.akte_geloescht)}.</p>` : ''}
    ${DATEI ? `<div class="kopf"><b>${esc(DATEI.split('/').pop())}</b><a class="btn sm" href="${url(DATEI)}" target="_blank" rel="noopener">Öffnen</a></div><div class="pv"></div>` : ''}</div>`;
  const pv = el.querySelector('.pv');
  if (pv) { if (/\.pdf$/i.test(DATEI)) BPHead.pdfIn(pv, url(DATEI)); else if (/\.(jpe?g|png|gif|webp)$/i.test(DATEI)) pv.innerHTML = `<img src="${url(DATEI)}" alt="">`; else pv.innerHTML = '<p class="mute">Keine Vorschau – „Öffnen“ lädt die Datei.</p>'; }
}
const akteEl = () => (breit() ? RE.akte : $('#peAkteU'));
document.addEventListener('click', async (e) => {
  if (!e.target.closest) return;
  const d = e.target.closest('[data-pedat]'); if (d) { DATEI = d.dataset.pedat; akteZeigen(akteEl()); return; }
  if (e.target.closest('[data-peneu]')) { AKTE = null; akteZeigen(akteEl()); akteEl() && akteEl().querySelector('[data-peakte]') && akteEl().querySelector('[data-peakte]').click(); return; }
  if (e.target.closest('[data-pegel]') && P) {
    if (!(await bpFrage(`Die Akte von ${P.name} ist auf dem Dateiserver gelöscht?\n\nGelöscht wird dort von Hand – hier wird es nur vermerkt, damit das To-do verschwindet.`, { ok: 'Vermerken' }))) return;
    try { await api(`api/personen/${P.id}/akte/geloescht`, 'POST'); await laden(SEL); } catch (er) { toast(er.message, true); }
  }
});
document.addEventListener('change', (e) => { if (e.target.matches && e.target.matches('[data-pefile]')) { ablegen([...e.target.files]); e.target.value = ''; } });
document.addEventListener('dragover', (e) => { const z = e.target.closest && e.target.closest('[data-pedrop]'); if (z && e.dataTransfer.types.includes('Files')) { e.preventDefault(); z.classList.add('an'); } });
document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-pedrop]'); if (z) z.classList.remove('an'); });
document.addEventListener('drop', (e) => { const z = e.target.closest && e.target.closest('[data-pedrop]'); if (!z || !e.dataTransfer.files.length) return; e.preventDefault(); z.classList.remove('an'); ablegen([...e.dataTransfer.files]); });
const b64 = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(f); });
async function ablegen(fs) {
  if (!P || !fs.length) return; const uid = P.id; let n = 0;
  if (!AKTE || AKTE.uid !== uid) { try { AKTE = { uid, ...(await api(`api/personen/${uid}/akte`)) }; } catch (er) { toast(er.message, true); return; } }
  const warte = setTimeout(() => toast('Lege ab …'), 1500);
  for (const f of fs) {
    if (f.size > 30 * 1048576) { toast(`„${f.name}“ ist zu groß (höchstens 30 MB).`, true); continue; }
    try { await api(`api/personen/${uid}/akte`, 'POST', { name: f.name, datei: await b64(f) }); n++; } catch (er) { toast(er.message, true); }
  }
  clearTimeout(warte);
  if (n) { toast(n === 1 ? 'Dokument abgelegt.' : n + ' Dokumente abgelegt.'); AKTE = { uid, ...(await api(`api/personen/${uid}/akte`)) }; akteZeigen(akteEl()); }
}

/* Verwaltung → Einstellungen → Apps → Personal: Gehalt als Feld, Aufbewahrungsfrist der Akte nach dem Austritt */
function peEinst(host) {
  const zeichne = (E) => {
    host.innerHTML = `<div class="pee">
      <label><input type="checkbox" data-pee="gehalt_feld"${E.gehalt_feld ? ' checked' : ''}> Gehalt als Feld in den Daten (sehen nur, wer das Recht „Personal“ hat) – sonst nur als Dokument in der Akte</label>
      <label>Akte löschen vorschlagen <input type="number" min="1" max="30" data-pee="frist_jahre" value="${E.frist_jahre}"> Jahre nach dem Austritt (To-do für das Recht „Personal“)</label>
      <p class="bph-mu">Lohnunterlagen bewahrt das Steuerbüro auf (6 bzw. 10 Jahre). Die Frist für die Personalakte bitte mit Steuerbüro und Datenschutzbeauftragter:m abstimmen. Gelöscht wird auf dem Dateiserver nie automatisch.</p></div>`;
  };
  host.addEventListener('change', async (e) => {
    const i = e.target.closest('[data-pee]'); if (!i) return;
    try { zeichne(await api('api/einstellungen', 'PUT', { [i.dataset.pee]: i.type === 'checkbox' ? i.checked : +i.value })); toast('Gespeichert.'); } catch (er) { toast(er.message, true); }
  });
  api('api/einstellungen').then(zeichne).catch((e) => { host.textContent = e.message; });
}

(async () => {
  ME = await api('api/me'); applyLook(ME);
  const PC = await api('api/platform');
  await header('Personal', ME, PC);
  BPHead.appEinstellungen([{ key: 'personal', label: 'Gehalt und Aufbewahrung', render: (h) => peEinst(h) }]);
  bpNav.breite(NAV, { key: 'personal' });
  const h = /^#p=(\d+)$/.exec(location.hash);   // aus dem To-do der Startseite (Akte löschen)
  if (h) history.replaceState(null, '', location.pathname + location.search);
  await laden(h ? 'p:' + h[1] : undefined);
  BPHead.live(['personal_person', 'zeit_antrag'], async () => { KAL = null; await laden(SEL); BPHead.liveNotiz(); }, { projekt: false });
})().catch((e) => toast(e.message, true));
