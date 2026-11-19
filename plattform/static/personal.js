'use strict';
/* Personal – Seite der App (besprochen am 14.11.2026, Mock „App Personal“). Links die Personen (bpNav: Personen, Überblick, Archiv),
   oben die Befehlsleiste, in der Mitte die Person (Daten, Urlaub und Anträge) oder ein Überblick (Abwesenheiten des Monats, Urlaubsanträge),
   rechts der abdockbare Bereich (seite.js): Abwesenheiten im Monat und die Akte 🔒 (nur Recht „Personal“; jedes Öffnen steht im Protokoll).
   Urlaub und Abwesenheit kommen aus dem Kern der Zeiten – nichts doppelt. Server: plattform/personal.py. */
let ME = null, L = null, P = null, SEL = null, AUS = false, OHNE = false, AN = null, KAL = null, AKTE = null, DATEI = '';
let MONAT = new Date().toISOString().slice(0, 7);
const NAV = $('#navL'), LEISTE = $('#bfl'), V = $('#view'), WORK = $('#work'), RE = {};
const IC = { person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>', kal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  urlaub: '<path d="M12 21V11"/><path d="M12 11c-3-4-7-3-8 0 3-1 6 0 8 0zM12 11c3-4 7-3 8 0-3-1-6 0-8 0zM12 11c-1-4 1-7 4-7"/>', archiv: '<path d="M4 4h16v4H4z"/><path d="M5 8v12h14V8"/><path d="M10 12h4"/>',
  neu: '<path d="M12 5v14M5 12h14"/>', akte: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><rect x="9" y="12" width="7" height="6" rx="1"/><path d="M10.5 12v-1.5a2 2 0 0 1 4 0V12"/>', ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>' };
const ARTF = { urlaub: '#9fc3ef', urlaub_halb: '#9fc3ef', krank: '#f2b4ac', frei: '#b9dfc6', schule: '#e6d29a' };
const deD = bpTag;
const zahl = (v) => bpZahl((Math.round((+v || 0) * 10) / 10));
const nf = (v, n = 1) => (v == null || v === '' ? '' : bpZahl(+v, 0, n));
const std = (m) => `${m < 0 ? '−' : '+'}${zahl(Math.abs(m) / 60)} h`;
const heute = () => new Date().toISOString().slice(0, 10);
const LS = bpLS('pe.');
const breit = bpBreit;   // bp.js

async function laden(sel) {
  L = await api('api/personen' + (OHNE ? '?ohne=1' : AUS ? '?aus=1' : ''));
  if (sel !== undefined) SEL = sel;
  if (!SEL) SEL = LS.get('sel') || 'p:' + L.ich;
  if (SEL.startsWith('p:') && !AUS && !OHNE && ME.alle && (L.aus || L.ohne) && !L.personen.some((x) => 'p:' + x.id === SEL)) {   // ausgeschieden oder ohne Personalstatus (z. B. aus einem To-do)
    for (const q of ['aus', 'ohne']) { const A = await api(`api/personen?${q}=1`); if (A.personen.some((x) => 'p:' + x.id === SEL)) { if (q === 'aus') AUS = true; else OHNE = true; L = A; break; } } }
  if (SEL.startsWith('p:') && !L.personen.some((x) => 'p:' + x.id === SEL)) SEL = L.personen.length ? 'p:' + (L.personen.find((x) => x.id === L.ich) || L.personen[0]).id : 'abw';
  LS.set('sel', SEL);
  P = null; AKTE = null; DATEI = '';
  if (SEL.startsWith('p:')) { try { P = await api('api/personen/' + SEL.slice(2)); } catch (e) { toast(e.message, true); } }
  if (SEL === 'ant' || P) AN = await api('api/antraege').catch(() => null);
  zeichne();
}

/* ---------- links ---------- */
function nav() {
  const pp = L.personen.map((x) => ({ id: 'p:' + x.id, text: x.name, icon: IC.person, zahl: x.konto || '', zahlTip: 'Benutzerkonto (Anmeldename)' }));   // verknüpftes Benutzerkonto rechts klein
  const offen = L.antraege_offen;
  const gruppen = [{ titel: OHNE ? `Ohne Personalstatus · ${pp.length}` : AUS ? `Ausgeschieden · ${pp.length}` : 'Personen', punkte: pp.length ? pp : [{ id: 'leer', text: 'keine', icon: IC.person }] },
    { titel: 'Überblick', punkte: [{ id: 'abw', text: 'Abwesenheiten', icon: IC.kal }, { id: 'ant', text: 'Urlaubsanträge', icon: IC.urlaub, zahl: offen ? `${offen} offen` : '', farbe: offen ? 'var(--red,#b42318)' : '' }] }];
  if (ME.alle) gruppen.push({ titel: 'Archiv', punkte: [{ id: 'aus', text: AUS ? 'Aktive zeigen' : `Ausgeschieden (${L.aus})`, icon: IC.archiv }, { id: 'ohne', text: OHNE ? 'Personal zeigen' : `Ohne Personalstatus (${L.ohne || 0})`, icon: IC.person }] });
  bpNav(NAV, { kopf: { titel: 'Personal', klein: OHNE ? 'ohne Personalstatus' : AUS ? 'ausgeschieden' : `${L.personen.length} aktiv` }, attr: 'pe', lage: true, gruppen, aktiv: SEL,
    wahl: (id) => { if (id === 'leer') return; if (id === 'aus') { AUS = !AUS; OHNE = false; SEL = null; laden(); } else if (id === 'ohne') { OHNE = !OHNE; AUS = false; SEL = null; laden(); } else laden(id); } });
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
/* Person in Reitern (Mock „Personalakte“): Person · Vertrag · Arbeitszeit & Urlaub · Vergütung 🔒 · Qualifikation & Fristen */
let REITER = LS.get('reiter') || 'person';
const TAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function personHtml() {
  const ed = P.darf_aendern, F = P.felder || {};
  const feld = (k, l, o = {}) => {
    const v = P[k] ?? '', typ = o.typ || (F[k] || {}).typ || 'text';
    if (!ed || o.lesen) return `<label>${l}<span class="wert">${esc((typ === 'date' ? deD(v) : v) || '–')}</span></label>`;
    if (typ === 'select') return `<label>${l}<select data-pef="${k}" data-bp-auswahl><option value="">–</option>${(P.vertragsarten || []).map((x) => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`;
    return `<label>${l}<input data-pef="${k}" value="${esc(v)}"${typ === 'date' ? ' type="date"' : ''}${typ === 'zahl' ? ' inputmode="decimal"' : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${typ === 'geheim' && !P.geheim_gezeigt && v ? ' readonly title="verdeckt – „aufdecken“ zum Ändern"' : ''}></label>`;
  };
  const w = (l, v) => `<label>${l}<span class="wert">${esc(v || '–')}</span></label>`;
  const Zt = P.zeit || {}, k = P.urlaubskonto || {}, rest = k.urlaub_rest, aus = P.austritt && P.austritt <= heute();
  const zf = (key, l, v, o = {}) => (ed ? `<label>${l}<input data-pez="${key}" value="${esc(v ?? '')}"${o.typ ? ` type="${o.typ}"` : ' inputmode="decimal"'}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}></label>` : w(l, o.anz || v));
  const R = [['person', 'Person'], ['vertrag', 'Vertrag'], ['zeit', 'Arbeitszeit & Urlaub'], ...(P.akte ? [['geld', 'Vergütung 🔒']] : []), ['fristen', 'Qualifikation & Fristen']];
  if (!R.some(([x]) => x === REITER)) REITER = 'person';
  const inhalt = {
    person: `<div class="pe-f">${w('Benutzerkonto', P.konto)}${w('Rolle', P.rolle)}${w('Vorgesetzte:r', P.vorgesetzter)}${w('E-Mail (dienstlich)', P.email)}
        ${feld('telefon', 'Telefon / Handy')}${feld('geburt', 'Geburtsdatum')}${feld('anschrift', 'Anschrift', { ph: 'Straße Nr., PLZ Ort' })}
        ${feld('tel_privat', 'Telefon privat')}${feld('mail_privat', 'E-Mail privat')}${feld('notfall', 'Notfallkontakt', { ph: 'Name, Telefon' })}${feld('personalnr', 'Personalnummer (Lohn)', { ph: 'wie im Lohnprogramm' })}</div>
      ${ed ? `<label class="pe-st-l"><button type="button" class="pe-sw${P.personal ? ' on' : ''}" data-pestatus aria-pressed="${P.personal}"></button> gehört zum Personal <small class="mute">(aus: nicht in Liste, Kalender und Urlaub – z. B. „admin“, Externe)</small></label>
        <label class="mute" style="display:grid;gap:.15rem;font-size:.78rem">Notiz<textarea data-pef="notiz">${esc(P.notiz || '')}</textarea></label>` : ''}`,
    vertrag: `<div class="pe-f">${feld('taetigkeit', 'Tätigkeit / Position')}${feld('vertragsart', 'Vertragsart')}${feld('befristet_bis', 'befristet bis')}
        ${feld('eintritt', 'Eintritt', { typ: 'date' })}${feld('probezeit_bis', 'Probezeit bis')}${feld('kuendigungsfrist', 'Kündigungsfrist', { ph: 'z. B. 3 Monate zum Monatsende' })}
        ${feld('austritt', 'Austritt', { typ: 'date' })}${feld('austritt_grund', 'Austrittsgrund')}${w('Rolle / Vorgesetzte:r', [P.rolle, P.vorgesetzter].filter(Boolean).join(' · '))}</div>
      <p class="pe-hin">Den Arbeitsvertrag selbst legst du in der Akte unter „01 Vertrag & Nachträge“ ab. Rolle und Vorgesetzte:r: Verwaltung → Benutzer:in.</p>`,
    zeit: `<div class="pe-f">${zf('soll_woche', 'Wochenstunden (Soll)', Zt.soll_woche != null ? nf(Zt.soll_woche, 1) : '', { anz: zahl(Zt.soll_woche) + ' h' })}
        <label>Arbeitstage<span class="pe-tage">${TAGE.map((t, i) => `<button type="button" class="${(Zt.tage || '').includes(String(i)) ? 'on' : ''}" data-petag="${i}"${ed ? '' : ' disabled'}>${t}</button>`).join('')}</span></label>
        ${zf('pause', 'Pause (Vorgabe)', Zt.pause || '', { typ: 'text', ph: 'z. B. 12:00–12:30' })}${zf('urlaub', 'Urlaubsanspruch / Jahr (Tage)', Zt.urlaub != null ? nf(Zt.urlaub, 1) : '')}
        ${feld('urlaub_uebertrag', 'Resturlaub Vorjahr (Tage)')}${feld('uebertrag_bis', 'Resturlaub verfällt am')}
        ${zf('saldo_start', 'Zeitkonto Startsaldo (h)', Zt.saldo_start != null ? nf(Zt.saldo_start, 1) : '')}${zf('ab', 'Zeitkonto ab', Zt.ab || '', { typ: 'date' })}
        ${ed ? `<label>Zeiterfassung<span><button type="button" class="pe-sw${Zt.aus ? '' : ' on'}" data-pezaus aria-pressed="${!Zt.aus}"></button> ${Zt.aus ? 'aus' : 'an'}</span></label>` : ''}</div>
      <p class="pe-hin">Dieselben Werte wie in „Zeiten“ – hier und dort änderbar, gespeichert an einer Stelle.</p>
      <div class="pe-zahlen"><div>Anspruch<b>${zahl(P.urlaub)}</b></div>${k.urlaub_uebertrag ? `<div>+ Vorjahr<b>${zahl(k.urlaub_uebertrag)}</b></div>` : ''}<div>genommen / eingetragen<b>${zahl(k.urlaub_genommen)}</b></div><div>beantragt<b>${zahl(k.urlaub_beantragt)}</b></div>
        <div class="${rest < 0 ? 'rot' : 'ok'}">übrig<b>${zahl(rest)}</b></div><div>Zeitkonto<b>${std(k.saldo || 0)}</b></div>${k.krank != null && P.darf_aendern ? `<div>krank (Tage)<b>${zahl(k.krank)}</b></div>` : ''}</div>`,
    geld: `<div class="pe-f">${P.gehalt_feld ? feld('gehalt', 'Monatsbrutto (€)', { ph: 'z. B. 3800' }) : '<label>Gehalt<span class="wert">als Dokument in der Akte <small>(Feld: Einstellungen)</small></span></label>'}${feld('gehalt_ab', 'gültig ab')}
        ${feld('steuerklasse', 'Steuerklasse')}${feld('krankenkasse', 'Krankenkasse')}${feld('steuer_id', 'Steuer-ID')}${feld('sv_nr', 'Sozialversicherungsnummer')}
        ${feld('kontoinhaber', 'Kontoinhaber:in')}${feld('iban', 'IBAN')}${feld('bic', 'BIC')}</div>
      <div class="knopf">${P.geheim_gezeigt ? '<span class="pe-hin">Steuer-ID, SV-Nummer und IBAN sind aufgedeckt (steht im Protokoll).</span> <button type="button" class="btn sm" data-pegeheim="0">verdecken</button>' : '<button type="button" class="btn sm" data-pegeheim="1" title="Wird im Protokoll vermerkt">🔓 Steuer-ID, SV-Nummer, IBAN aufdecken</button>'}</div>
      ${P.kostensatz != null ? `<p class="pe-hin">Kostensatz für den Abgleich Honorar ↔ Zeiten: <b>${nf(P.kostensatz, 2)} €/h</b> (aus dem Gehalt, mit Arbeitgeberanteil und produktiven Stunden – Einstellungen). Im Honorar erscheinen nur Summen je Projekt.</p>` : ''}`,
    fristen: `<table class="pe-t pe-fr"><tr><th>Was</th><th>gültig bis</th><th>Wiederholung · 🔔</th><th></th></tr>${(P.fristen || []).map((f) => {
        const ab = f.bis && f.bis < heute(), bald = f.bis && !ab && new Date(f.bis) - Date.now() < (f.vorab || 0) * 864e5;
        return `<tr data-pefr="${f.id}"><td>${ed ? `<input data-pefw="titel" value="${esc(f.titel)}">` : esc(f.titel)}${f.notiz ? `<br><small class="mute">${esc(f.notiz)}</small>` : ''}</td>
          <td>${ed ? `<input type="date" data-pefw="bis" value="${esc(f.bis)}">` : deD(f.bis)}${ab ? ' <span class="pe-st abgelehnt">abgelaufen</span>' : bald ? ' <span class="pe-st offen">bald</span>' : ''}</td>
          <td>${ed ? `alle <input data-pefw="intervall" value="${f.intervall || ''}" inputmode="numeric" class="pe-kz" placeholder="–" title="Monate bis zur Wiederholung (leer = einmalig)"> Mon. · 🔔 <input data-pefw="vorab" value="${f.vorab}" inputmode="numeric" class="pe-kz" title="so viele Tage vorher erinnern"> T. vorher` : `${f.intervall ? `alle ${f.intervall} Monate` : 'einmalig'} · 🔔 ${f.vorab} Tage vorher`}</td>
          <td class="k">${ed ? `<button type="button" class="btn sm" data-pefok="${f.id}" title="${f.intervall ? 'Erledigt – rückt um das Intervall weiter' : 'Erledigt – Frist entfällt'}">✓ erledigt</button><button type="button" class="ib" data-pefx="${f.id}" title="Löschen">✕</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="4" class="mute">Noch keine Fristen.</td></tr>'}</table>
      ${ed ? `<div class="knopf">${['Ersthelfer:in', 'Unterweisung Arbeitsschutz', 'Führerschein geprüft', 'Fortbildung', 'Eigene …'].map((t) => `<button type="button" class="btn sm" data-pefneu="${esc(t)}">＋ ${esc(t)}</button>`).join('')}</div>
        <p class="pe-hin">Die Glocke erinnert so viele Tage vorher als To-do auf der Startseite (Recht „Personal“). „Erledigt“ setzt eine wiederkehrende Frist um das Intervall weiter.</p>` : ''}`,
  };
  return `<div class="pe-w">
    <div class="pe-k"><h2>${esc(P.name)} <small>${esc([P.taetigkeit || P.rolle, P.personalnr ? 'Personal-Nr. ' + P.personalnr : '', P.eintritt ? 'seit ' + deD(P.eintritt) : '', aus ? 'ausgeschieden ' + deD(P.austritt) : ''].filter(Boolean).join(' · '))}</small>${P.personal ? '' : '<span class="pe-st">ohne Personalstatus</span>'}</h2>
      <div class="pe-reiter" role="tablist">${R.map(([x, t]) => `<button type="button" role="tab" class="${x === REITER ? 'on' : ''}" data-pereiter="${x}" aria-selected="${x === REITER}">${t}</button>`).join('')}</div>
      ${inhalt[REITER]}</div>
    <div class="pe-k"><h3>Urlaubsanträge ${new Date().getFullYear()}</h3>
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
async function peSpeichern(body, text) {   // Daten der Person ändern – mit Rückgängig (der Server schickt den alten Stand mit)
  if (!P) return; const uid = P.id;
  try { const r = await api('api/personen/' + uid, 'PUT', body); await laden('p:' + uid);
    if (r.vorher && Object.keys(r.vorher).length) rueckgaengig(text || 'Geändert', async () => { await api('api/personen/' + uid, 'PUT', r.vorher); await laden('p:' + uid); }, { neu: async () => { await laden('p:' + uid); } });
  } catch (er) { toast(er.message, true); laden('p:' + uid); }
}
async function peFrist(url, methode, body, text, zurueck) {
  if (!P) return; const uid = P.id;
  try { const r = await api(url, methode, body); await laden('p:' + uid); if (zurueck) rueckgaengig(text, async () => { await zurueck(r); await laden('p:' + uid); }, { neu: async () => { await laden('p:' + uid); } }); return r; } catch (er) { toast(er.message, true); return null; }
}
V.addEventListener('change', async (e) => {
  if (!P) return;
  const f = e.target.closest('[data-pef]');
  if (f) { const k = f.dataset.pef; if (String(P[k] ?? '') === f.value) return; await peSpeichern({ [k]: f.value }); return; }
  const z = e.target.closest('[data-pez]');
  if (z) { const k = z.dataset.pez; await peSpeichern({ zeit: { [k]: z.value } }, 'Arbeitszeit geändert'); return; }
  const fw = e.target.closest('[data-pefw]');
  if (fw) { const tr = fw.closest('[data-pefr]'), fid = +tr.dataset.pefr, alt = (P.fristen || []).find((x) => x.id === fid); if (!alt) return;
    const b = { ...alt, [fw.dataset.pefw]: fw.value }; await peFrist('api/fristen/' + fid, 'PUT', b, 'Frist geändert', () => api('api/fristen/' + fid, 'PUT', alt)); }
});
V.addEventListener('click', async (e) => {
  const t = e.target.closest('button'); if (!t || !P) return;
  if (t.dataset.pereiter) { REITER = t.dataset.pereiter; LS.set('reiter', REITER); zeichne(); return; }
  if (t.dataset.pestatus !== undefined) { await peSpeichern({ personal: !P.personal }, P.personal ? 'ohne Personalstatus' : 'gehört zum Personal'); return; }
  if (t.dataset.petag) { const T = new Set((P.zeit.tage || '').split('')); if (T.has(t.dataset.petag)) T.delete(t.dataset.petag); else T.add(t.dataset.petag); await peSpeichern({ zeit: { tage: [...T].sort().join('') } }, 'Arbeitstage geändert'); return; }
  if (t.dataset.pezaus !== undefined) { await peSpeichern({ zeit: { aus: !P.zeit.aus } }, 'Zeiterfassung ' + (P.zeit.aus ? 'an' : 'aus')); return; }
  if (t.dataset.pegeheim) { const uid = P.id; try { P = await api(`api/personen/${uid}${t.dataset.pegeheim === '1' ? '?zeigen=1' : ''}`); zeichne(); } catch (er) { toast(er.message, true); } return; }
  if (t.dataset.pefneu) { let titel = t.dataset.pefneu; if (titel === 'Eigene …') { titel = await bpEingabe('Was ist zu erneuern? (z. B. G 41, SiGeKo-Schein)', '', { ok: 'Anlegen' }); if (!titel || !titel.trim()) return; }
    const iv = { 'Ersthelfer:in': 24, 'Unterweisung Arbeitsschutz': 12, 'Führerschein geprüft': 6 }[titel] || 0;
    await peFrist(`api/personen/${P.id}/fristen`, 'POST', { titel: titel.trim(), bis: '', intervall: iv, vorab: 30 }, 'Frist angelegt', (r) => api('api/fristen/' + r.frist_id, 'DELETE')); return; }
  if (t.dataset.pefok) { const fid = +t.dataset.pefok, alt = (P.fristen || []).find((x) => x.id === fid);
    await peFrist(`api/fristen/${fid}/erledigt`, 'POST', {}, alt.intervall ? 'Frist weitergesetzt' : 'Frist erledigt', (r) => (r.ergebnis.geloescht ? api(`api/personen/${alt.user_id || P.id}/fristen`, 'POST', alt) : api('api/fristen/' + fid, 'PUT', alt))); return; }
  if (t.dataset.pefx) { const fid = +t.dataset.pefx, alt = (P.fristen || []).find((x) => x.id === fid), uid = P.id;
    await peFrist('api/fristen/' + fid, 'DELETE', null, 'Frist gelöscht', () => api(`api/personen/${uid}/fristen`, 'POST', alt)); }
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
function abwDialog(o = {}) {   // o: { uid, name, von, bis, art } – aus dem Kalender (Ziehen/Klick) vorbelegt
  const uid = o.uid || (P ? P.id : L.ich), ich = uid === L.ich, pflicht = AN ? AN.pflicht : true, name = o.name || (P ? P.name : '');
  const arten = Object.entries((AN && AN.arten) || { urlaub: 'Urlaub', krank: 'Krank' });
  const t = heute(), von = o.von || t, bis = o.bis || von;
  modalBox(`<h3>${ich ? 'Urlaub beantragen / abwesend' : 'Abwesenheit eintragen – ' + esc(name)}</h3><div class="pe-f" style="min-width:min(26rem,80vw)">
      <label>Art<select id="peArt" data-bp-auswahl>${arten.map(([k, v]) => `<option value="${k}"${o.art === k ? ' selected' : ''}>${esc(v)}</option>`).join('')}${ich && !o.art ? '' : '<option value="">– austragen –</option>'}</select></label>
      <label>von<input id="peVon" type="date" value="${von}"></label><label>bis<input id="peBis" type="date" value="${bis}"></label>
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
        rueckgaengig('Urlaub beantragt', async () => { await api('api/antraege/' + r.antrag.id, 'PUT', { aktion: 'zurueckziehen' }); KAL = null; await laden(SEL); }, { neu: async () => { KAL = null; await laden(SEL); } }); return; }
      const r = await api('api/abwesenheit', 'PUT', b); close(); toast(r.tage ? `${r.tage} Tag${r.tage === 1 ? '' : 'e'} eingetragen.` : 'Kein Arbeitstag im Zeitraum.'); KAL = null; await laden(SEL);
      if (b.art) rueckgaengig('Abwesenheit eingetragen', async () => { await api('api/abwesenheit', 'PUT', { ...b, art: '' }); KAL = null; await laden(SEL); }, { neu: async () => { KAL = null; await laden(SEL); } });
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
  const ART = { urlaub: 'Urlaub', urlaub_halb: 'Urlaub ½', krank: 'krank', frei: 'Frei', schule: 'Fortbildung', kind_krank: 'Kind krank', sonderurlaub: 'Sonderurlaub', elternzeit: 'Elternzeit', unbezahlt: 'unbezahlt', berufsschule: 'Berufsschule', beantragt: 'beantragt', weg: 'abwesend' };
  el.innerHTML = `<div class="pe-r" style="padding:0"><div class="kopf"><button type="button" class="btn sm" data-pem="-1" aria-label="Monat zurück">‹</button><b style="text-align:center">${esc(name)}</b><button type="button" class="btn sm" data-pem="1" aria-label="Monat vor">›</button></div>
    <div class="pe-kal-w"><table class="pe-kal"><tr><th class="n"></th>${KAL.tage.map((d) => `<th class="${d.we ? 'we' : ''}" title="${esc(d.feiertag)}">${+d.tag.slice(8)}</th>`).join('')}</tr>
    ${KAL.personen.map((p) => `<tr class="${p.id === L.ich ? 'ich' : ''}" data-peku="${p.id}"><th class="n" title="${esc([p.name, p.konto && 'Konto: ' + p.konto, p.rolle].filter(Boolean).join(' · '))}">${esc(p.name)}${p.konto && KAL.personen.filter((q) => q.name === p.name).length > 1 ? ` <small class="mute">${esc(p.konto)}</small>` : ''}</th>${KAL.tage.map((d) => { const a = p.abw[d.tag] || '';
      return `<td class="${d.we ? 'we ' : ''}${d.feiertag ? 'ft ' : ''}${a && !ART[a] ? 'eigen' : a}${d.tag === t0 ? ' heute' : ''}" data-pekd="${d.tag}" title="${esc(deD(d.tag) + (d.feiertag ? ' · ' + d.feiertag : '') + (a ? ' · ' + (ART[a] || ((AN && AN.arten) || {})[a] || a) : ''))}"></td>`; }).join('')}</tr>`).join('')}</table></div>
    <p class="pe-hin">In einer Zeile von Tag zu Tag ziehen (oder einen freien Tag anklicken): Abwesenheit eintragen bzw. beantragen. Klick auf eine Abwesenheit: zurücknehmen oder löschen.</p>
    <div class="pe-leg"><span><i style="background:${ARTF.urlaub}"></i>Urlaub</span><span><i style="background:repeating-linear-gradient(45deg,#9fc3ef 0 3px,transparent 3px 6px)"></i>beantragt</span><span><i style="background:${ARTF.krank}"></i>krank</span><span><i style="background:${ARTF.frei}"></i>Frei</span><span><i style="background:${ARTF.schule}"></i>Fortbildung / Berufsschule</span><span><i style="background:#c9b8ec"></i>Sonderurlaub</span><span><i style="background:#d6d0c4"></i>Elternzeit, unbezahlt, eigene</span><span><i style="background:color-mix(in srgb,var(--mute) 45%,transparent)"></i>abwesend</span></div></div>`;
}
/* Ziehen im Kalender: in der Zeile einer Person von Tag zu Tag – danach das Fenster mit Art, von, bis (Mock „Personalakte“) */
let ZIEH = null;
const kalZelle = (e) => { const td = e.target.closest && e.target.closest('td[data-pekd]'); return td && td.closest('[data-peku]') ? td : null; };
const ziehMalen = () => { document.querySelectorAll('.pe-kal td.zieh').forEach((x) => x.classList.remove('zieh')); if (!ZIEH) return;
  const [a, b] = [ZIEH.von, ZIEH.bis].sort(); ZIEH.tr.querySelectorAll('td[data-pekd]').forEach((x) => { if (x.dataset.pekd >= a && x.dataset.pekd <= b) x.classList.add('zieh'); }); };
document.addEventListener('pointerdown', (e) => { const td = kalZelle(e); if (!td || e.button !== 0) return; e.preventDefault(); ZIEH = { tr: td.closest('[data-peku]'), uid: +td.closest('[data-peku]').dataset.peku, von: td.dataset.pekd, bis: td.dataset.pekd }; ziehMalen(); });
document.addEventListener('pointerover', (e) => { if (!ZIEH) return; const td = kalZelle(e); if (!td || td.closest('[data-peku]') !== ZIEH.tr) return; ZIEH.bis = td.dataset.pekd; ziehMalen(); });
document.addEventListener('pointerup', () => {
  if (!ZIEH) return; const z = ZIEH; ZIEH = null; const [von, bis] = [z.von, z.bis].sort();
  const pk = (KAL && KAL.personen || []).find((x) => x.id === z.uid) || {}, art = von === bis ? (pk.abw || {})[von] : '';
  setTimeout(ziehMalen, 0);
  if (art && art !== 'weg') { BPHead.abwesenheit({ uid: z.uid, tag: von, nachher: async () => { KAL = null; await laden(SEL); } }); return; }   // vorhandene Abwesenheit: zurücknehmen oder löschen
  abwDialog({ uid: z.uid, name: pk.name, von, bis, art: art && art !== 'beantragt' && art !== 'weg' ? art : '' });
});
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
    <div class="pe-akte">${akteBaum()}</div>
    <div class="pe-drop" data-pedrop>Ablegen in <select data-peziel data-bp-auswahl>${akteOrdner().map((o) => `<option${o === ZIELORDNER ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select> – Dokumente hierher ziehen oder <label>auswählen<input type="file" id="peFile" multiple hidden data-pefile></label>. Sie liegen auf dem Dateiserver unter „${esc(AKTE.pfad || 'Büro/Personal')}“, in der Datenbank nichts.${AKTE.testserver ? ' <b>Testserver: die Ablage wird nur gelesen.</b>' : ''}</div>
    ${P.austritt && P.austritt <= heute() && !P.akte_geloescht ? '<div class="knopf"><button type="button" class="btn sm" data-pegel>Akte auf dem Dateiserver gelöscht – vermerken</button></div>' : P.akte_geloescht ? `<p class="pe-hin">Akte gelöscht am ${deD(P.akte_geloescht)}.</p>` : ''}
    ${DATEI ? `<div class="kopf"><b>${esc(DATEI.split('/').pop())}</b><a class="btn sm" href="${url(DATEI)}" target="_blank" rel="noopener">Öffnen</a></div><div class="pv"></div>` : ''}</div>`;
  const pv = el.querySelector('.pv');
  if (pv) { if (/\.pdf$/i.test(DATEI)) BPHead.pdfIn(pv, url(DATEI)); else if (/\.(jpe?g|png|gif|webp)$/i.test(DATEI)) pv.innerHTML = `<img src="${url(DATEI)}" alt="">`; else pv.innerHTML = '<p class="mute">Keine Vorschau – „Öffnen“ lädt die Datei.</p>'; }
}
const akteEl = () => (breit() ? RE.akte : $('#peAkteU'));
/* Akte nach Ordnern (01 Vertrag … 07 Austritt – beim ersten Öffnen angelegt); Dateien direkt in der Akte unter „(ohne Ordner)“ */
const AKTE_STANDARD = ['01 Vertrag & Nachträge', '02 Bewerbung, Zeugnisse, Nachweise', '03 Lohn & Gehalt', '04 Arbeitsschutz & Unterweisungen', '05 Datenschutz & Einwilligungen', '06 Schriftverkehr', '07 Austritt'];
let ZIELORDNER = AKTE_STANDARD[0];
const akteOrdner = () => [...new Set([...AKTE_STANDARD, ...((AKTE && AKTE.ordner) || []).filter((o) => !o.includes('/'))])].sort((a, b) => a.localeCompare(b, 'de'));
function akteBaum() {
  const D = (AKTE && AKTE.dateien) || [], G = {};
  D.forEach((d) => { const o = d.rel.includes('/') ? d.rel.split('/')[0] : ''; (G[o] = G[o] || []).push(d); });
  const ord = [...new Set([...akteOrdner(), ...Object.keys(G)])].filter((o) => o || G['']);
  return ord.map((o) => `<div class="pe-ao"><b>📁 ${esc(o || '(ohne Ordner)')}</b> <small class="mute">${(G[o] || []).length || ''}</small></div>${(G[o] || []).map((d) => `<button type="button" data-pedat="${esc(d.rel)}" class="pe-ad${d.rel === DATEI ? ' on' : ''}" title="${esc(d.rel)}">${/\.pdf$/i.test(d.name) ? '📄' : '📎'} ${esc(d.name)}</button>`).join('')}`).join('');
}
document.addEventListener('change', (e) => { const s_ = e.target.closest && e.target.closest('[data-peziel]'); if (s_) ZIELORDNER = s_.value; });
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
const b64 = bpB64;   // bp.js
async function ablegen(fs) {
  if (!P || !fs.length) return; const uid = P.id; let n = 0;
  if (!AKTE || AKTE.uid !== uid) { try { AKTE = { uid, ...(await api(`api/personen/${uid}/akte`)) }; } catch (er) { toast(er.message, true); return; } }
  const warte = setTimeout(() => toast('Lege ab …'), 1500);
  for (const f of fs) {
    if (f.size > 30 * 1048576) { toast(`„${f.name}“ ist zu groß (höchstens 30 MB).`, true); continue; }
    try { await api(`api/personen/${uid}/akte`, 'POST', { name: f.name, ordner: ZIELORDNER, datei: await b64(f) }); n++; } catch (er) { toast(er.message, true); }
  }
  clearTimeout(warte);
  if (n) { toast((n === 1 ? 'Dokument abgelegt' : n + ' Dokumente abgelegt') + ` – in „${ZIELORDNER}“.`); AKTE = { uid, ...(await api(`api/personen/${uid}/akte`)) }; akteZeigen(akteEl()); }
}

/* Verwaltung → Einstellungen → Apps → Personal: Gehalt als Feld, Aufbewahrungsfrist der Akte nach dem Austritt */
function peEinst(host) {
  const zeichne = (E) => {
    host.innerHTML = `<div class="pee">
      <label><input type="checkbox" data-pee="gehalt_feld"${E.gehalt_feld ? ' checked' : ''}> Gehalt als Feld in den Daten (sehen nur, wer das Recht „Personal“ hat) – sonst nur als Dokument in der Akte</label>
      <label>Akte löschen vorschlagen <input type="number" min="1" max="30" data-pee="frist_jahre" value="${E.frist_jahre}"> Jahre nach dem Austritt (To-do für das Recht „Personal“)</label>
      <p class="bph-mu" style="margin:.4rem 0 0"><b>Kostensatz für das Honorar</b> (Abgleich mit den Zeiten): Monatsbrutto × 12 × (1 + Arbeitgeberanteil) ÷ produktive Stunden. Im Honorar erscheinen nur Summen je Projekt.</p>
      <label>Arbeitgeberanteil (Sozialversicherung, Umlagen …) <input type="number" min="0" max="100" step="0.5" data-pee="ag_pct" value="${E.ag_pct}"> %</label>
      <label>Feiertage im Jahr <input type="number" min="0" max="30" data-pee="feiertage" value="${E.feiertage}"> Tage</label>
      <label>Ausfall (Krankheit, Fortbildung, Büroarbeit ohne Projekt) <input type="number" min="0" max="60" step="0.5" data-pee="ausfall_pct" value="${E.ausfall_pct}"> %</label>
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
  BPHead.appEinstellungen([{ key: 'personal', label: 'Gehalt und Aufbewahrung', render: (h) => peEinst(h) }, { key: 'abwarten', label: 'Abwesenheitsarten', render: (h) => BPHead.abwArten(h) }, { key: 'ablage', label: 'Ablage: Ordner der Personalakte', render: (h) => BPHead.ablageEinst(h, 'personal') }]);
  bpNav.breite(NAV, { key: 'personal' });
  const h = /^#p=(\d+)$/.exec(location.hash);   // aus dem To-do der Startseite (Akte löschen)
  if (h) history.replaceState(null, '', location.pathname + location.search);
  await laden(h ? 'p:' + h[1] : undefined);
  BPHead.live(['personal_person', 'zeit_antrag'], async () => { KAL = null; await laden(SEL); BPHead.liveNotiz(); }, { projekt: false });
})().catch((e) => toast(e.message, true));
