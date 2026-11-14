'use strict';
/* Honorar überschlagen – einfacher HOAI-Rechner (Gebäude, § 35), ohne Auftrag (Mock 13.11.2026). „✓ Ablegen“ merkt das Ergebnis ohne Projekt
   (Mock 14.11.2026); am Rechner fragt Honorar dann, ob ein Honorarangebot daraus werden soll (Fenster „Abgelegte Überschläge“: in ein Projekt
   übernehmen, löschen; Akquiseprojekte kommen mit der eigenen Akquise-App) – Server: honorar_ueberschlag.py.
   Am Handy immer oben über den Aufträgen (zusammenklappbar, je Gerät gemerkt), am Rechner hinter dem Knopf „🧮 Überschlagen“ in der Navigation.
   Rechnet auf dem Server mit derselben Honorartafel wie die Aufträge (/api/ueberschlag). Gemeinsame Namen aus honorar.js (api, eur, eur0, esc, modalBox). */
const UE = { kosten: '', wofuer: '', zone: 3, satz: 0, umbau: 0, nk: 5, r: null, offen: (() => { try { return localStorage.getItem('honorar:ue-offen') !== '0'; } catch { return true; } })(), lph: false, t: 0 };
const ueZahl = (v) => { const x = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(x) ? x : 0; };
function ueKarte() {
  const r = UE.r, seg = (k, L) => `<span class="seg ue-seg">${L.map(([v, t]) => `<button type="button" class="${+UE[k] === v ? 'on' : ''}" data-ue="${k}" data-v="${v}">${t}</button>`).join('')}</span>`;
  const erg = r && r.netto ? `<div class="ue-erg"><span>LPh 1–9 (100 %)</span><b>${eur0(r.summe_lph)}</b>${r.umbau ? `<span>Umbauzuschlag ${UE.umbau} %</span><b>${eur0(r.umbau)}</b>` : ''}
      <span class="mute">Spanne bis oberer Satz</span><span class="mute">${eur0(r.oben)}</span><span>Nebenkosten ${UE.nk} %</span><b>${eur0(r.nk)}</b>
      <span><b>netto</b></span><b class="ue-gr">${eur0(r.netto)}</b><span class="mute">brutto</span><span class="mute">${eur0(r.brutto)}</span></div>`
    : `<div class="ue-erg"><span class="mute">${r && r.warnungen && r.warnungen.length ? esc(r.warnungen[0]) : 'Anrechenbare Kosten eintragen.'}</span></div>`;
  return `<div class="ho-k ue" data-uek><button type="button" class="ue-kopf" data-uezu aria-expanded="${UE.offen}"><b>🧮 Honorar überschlagen</b><small>HOAI 2021 · Gebäude</small><span>${UE.offen ? '▾' : '▸'}</span></button>
    <label>Anrechenbare Kosten netto<input class="ue-in" data-uein="kosten" value="${esc(UE.kosten)}" inputmode="decimal" placeholder="z. B. 850.000"></label>
    ${r && r.vorschlag ? `<small class="mute">aus der Kostenermittlung: ${esc(r.vorschlag.info)}</small>` : ''}
    ${UE.offen ? `<label>Honorarzone${seg('zone', [[1, 'I'], [2, 'II'], [3, 'III'], [4, 'IV'], [5, 'V']])}</label>
    <label>Honorarsatz${seg('satz', [[0, 'Basis'], [50, 'Mittel'], [100, 'oben']])}</label>
    <div class="ue-r2"><label>Umbauzuschlag %<input class="ue-in" data-uein="umbau" value="${UE.umbau}" inputmode="decimal"></label><label>Nebenkosten %<input class="ue-in" data-uein="nk" value="${UE.nk}" inputmode="decimal"></label></div>` : ''}
    ${erg}
    ${UE.offen && r && r.netto ? `<button type="button" class="ue-mehr" data-uelph>${UE.lph ? '▾' : '▸'} Leistungsphasen einzeln</button>
      ${UE.lph ? `<div class="ue-lph">${r.phasen.map((p) => `<span>${p.key.slice(3)} ${esc(p.name)}</span><span class="mute">${p.p} %</span><b>${eur0(p.honorar)}</b>`).join('')}</div>` : ''}` : ''}
    ${r && r.netto ? `<label class="ue-wf">Wofür? (optional)<input class="ue-in" data-uein="wofuer" value="${esc(UE.wofuer)}" placeholder="z. B. MFH Schulz, Gelsenkirchen"></label>
      <button type="button" class="btn pri ue-ab" data-ueab title="Ergebnis mit allen Eingaben ablegen – am Rechner wird daraus auf Wunsch ein Honorarangebot">✓ Ablegen</button>` : ''}</div>`;
}
async function ueRechnen(mitVorschlag) {
  const pid = window.BPHead && BPHead.projektId ? BPHead.projektId() : null;
  try {
    UE.r = await api('api/ueberschlag', 'POST', { kosten: UE.kosten, zone: UE.zone, satz: UE.satz, umbau: UE.umbau, nk: UE.nk, ...(mitVorschlag && pid ? { project_id: +pid } : {}) });
    if (UE.r.vorschlag && !ueZahl(UE.kosten)) UE.kosten = UE.r.kosten.toLocaleString('de-DE');
  } catch (e) { UE.r = null; toast(e.message, true); }
  ueNeu();
}
function ueNeu() {   // alle sichtbaren Karten (Handy oben, Fenster am Rechner) neu – das gerade benutzte Feld behält den Fokus
  const f = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.uein, pos = f ? document.activeElement.selectionStart : 0;
  document.querySelectorAll('[data-uek]').forEach((k) => { k.outerHTML = ueKarte(); });
  if (f) { const i = document.querySelector(`[data-uein="${f}"]`); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch { /* egal */ } } }
}
function ueFenster() {   // am Rechner: Knopf „🧮 Überschlagen“
  modalBox(`${ueKarte()}<div class="acts"><button class="btn pri" data-m="x">Schließen</button></div>`, (m, bg, close) => { if (m === 'x') close(); });
  if (!UE.r) ueRechnen(true);
}
document.addEventListener('input', (e) => {
  const i = e.target.closest && e.target.closest('[data-uein]'); if (!i) return;
  UE[i.dataset.uein] = ['kosten', 'wofuer'].includes(i.dataset.uein) ? i.value : ueZahl(i.value);
  if (i.dataset.uein === 'wofuer') return;   // ändert am Ergebnis nichts
  clearTimeout(UE.t); UE.t = setTimeout(() => ueRechnen(false), 250);   // nicht bei jedem Tastendruck rechnen
});
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-ue],[data-uezu],[data-uelph],[data-ueauf],[data-ueab],[data-uel]'); if (!t) return;
  if (t.dataset.ueauf != null) return ueFenster();
  if (t.hasAttribute('data-ueab')) return ueAblegen();
  if (t.hasAttribute('data-uel')) return ueListe();
  if (t.dataset.ue) { UE[t.dataset.ue] = +t.dataset.v; return ueRechnen(false); }
  if (t.hasAttribute('data-uezu')) { UE.offen = !UE.offen; try { localStorage.setItem('honorar:ue-offen', UE.offen ? '1' : '0'); } catch { /* egal */ } return ueNeu(); }
  if (t.hasAttribute('data-uelph')) { UE.lph = !UE.lph; ueNeu(); }
});

/* ---------- Ablegen und später übernehmen ---------- */
const UEGER = () => (matchMedia('(max-width: 820px)').matches ? 'handy' : 'rechner');
async function ueAblegen() {
  try {
    const r = await api('api/ueberschlaege', 'POST', { wofuer: UE.wofuer, kosten: ueZahl(UE.kosten), zone: UE.zone, satz: UE.satz, umbau: UE.umbau, nk: UE.nk, geraet: UEGER() });
    UE.wofuer = ''; ueNeu(); ueZahlNeu(1);
    toast(UEGER() === 'handy' ? 'Abgelegt – am Rechner kannst du daraus ein Honorarangebot machen.' : 'Abgelegt.');
    rueckgaengig('Überschlag abgelegt', async () => { await api('api/ueberschlaege/' + r.id, 'DELETE'); ueZahlNeu(-1); });
  } catch (er) { toast(er.message, true); }
}
function ueZahlNeu(d) { if (typeof L !== 'undefined' && L) { L.ueberschlaege = Math.max(0, (L.ueberschlaege || 0) + d); if (typeof HANDY === 'undefined' || !HANDY.matches) { nav(); ueBannerNeu(); } } }
const ueSpaeter = () => { try { return sessionStorage.getItem('honorar:ue-spaeter') === '1'; } catch { return false; } };
function ueBanner() {   // am Rechner über dem Auftrag: „daraus ein Honorarangebot machen?“ – „Später“ fragt erst beim nächsten Öffnen wieder
  const n = (L && L.ueberschlaege) || 0;
  return n && !ueSpaeter() ? `<div class="ue-ban" data-ueban><b>💼 ${n} abgelegte${n === 1 ? 'r' : ''} Überschl${n === 1 ? 'ag' : 'äge'}</b><span>– daraus ein Honorarangebot machen?</span><span class="sp"></span>
    <button type="button" class="btn sm pri" data-uel>Ansehen …</button><button type="button" class="btn sm" data-uesp>Später</button></div>` : '';
}
function ueBannerNeu() { const b = document.querySelector('[data-ueban]'), h = ueBanner(); if (b) b.outerHTML = h || ''; else if (h && V.firstElementChild) V.firstElementChild.insertAdjacentHTML('afterbegin', h); }
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-uesp]')) { try { sessionStorage.setItem('honorar:ue-spaeter', '1'); } catch { /* egal */ } ueBannerNeu(); } });

let UEL = null, UEA = [];
async function ueListe() {
  try { const r = await api('api/ueberschlaege'); UEL = r.ueberschlaege; UEA = r.akquisen || []; } catch (er) { return toast(er.message, true); }
  const zeit = (s) => `${s.slice(8, 10)}.${s.slice(5, 7)}. ${s.slice(11, 16)}`, satz = (v) => (!+v ? 'Basis' : +v === 50 ? 'Mittel' : +v === 100 ? 'oben' : v + ' %');
  const zeilen = () => (UEL.length ? UEL.map((u) => `<tr data-uid="${u.id}"><td>${esc(zeit(u.erstellt))}<br><small class="mute">${esc(u.von)} · ${esc(u.geraet)}</small></td>
      <td>${u.wofuer ? esc(u.wofuer) : '<span class="mute">ohne Angabe</span>'}${u.akquise ? `<br><small class="mute">💼 Akquise: ${esc(u.akquise)}</small>` : ''}</td><td class="r">${eur0(u.kosten)}</td>
      <td>${['I', 'II', 'III', 'IV', 'V'][u.zone - 1]} · ${satz(u.satz)}<br><small class="mute">NK ${zahl(u.nk)} %${+u.umbau ? ` · Umbau ${zahl(u.umbau)} %` : ''}</small></td><td class="r"><b>${eur0(u.netto)}</b></td>
      <td><span class="ue-akt"><button type="button" class="btn sm pri" data-uep="${u.id}" title="In ein vorhandenes Projekt: dort entsteht ein Honorarauftrag (Stand Angebot) mit diesen Werten">→ in Projekt …</button>
        <button type="button" class="btn sm" data-uea="${u.id}" title="An eine Akquise hängen oder eine neue Akquise daraus machen (App „Akquise“)">💼 Akquise …</button>
        <button type="button" class="btn sm" data-uew="${u.id}" title="Löschen (Papierkorb)" aria-label="Löschen">🗑</button></span></td></tr>`).join('')
    : '<tr><td colspan="6" class="mute">Keine abgelegten Überschläge.</td></tr>');
  modalBox(`<h3>Abgelegte Überschläge <small class="mute">nur für die Geschäftsführung · ohne Projekt, bis du sie übernimmst</small></h3>
    <div class="ue-tw"><table class="ho-t ue-t"><thead><tr><th>abgelegt</th><th>Wofür</th><th class="r">Kosten</th><th>Zone · Satz</th><th class="r">netto</th><th></th></tr></thead><tbody>${zeilen()}</tbody></table></div>
    <div class="acts"><button type="button" class="btn" data-m="zu">Schließen</button></div>`, (m, bg, close) => { if (m === 'zu') close(); });
  const box = [...document.querySelectorAll('.modal-bg')].pop(), tb = box.querySelector('.ue-t tbody'); box.querySelector('.modal').classList.add('breit');
  const neu = () => { tb.innerHTML = zeilen(); };
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-uep],[data-uew],[data-uea]'); if (!b) return;
    const id = +(b.dataset.uep || b.dataset.uew || b.dataset.uea), u = UEL.find((x) => x.id === id); if (!u) return;
    if (b.dataset.uea) {   // an eine Akquise hängen oder neue Akquise (Baustein des Kerns, sichtbar in der App „Akquise“)
      pickMenu(b, { items: [{ value: 'neu', title: '＋ Neue Akquise daraus' }, ...(u.akquise_id ? [{ value: 'los', title: 'von der Akquise lösen' }] : []), ...UEA.map((a) => ({ value: 'a' + a.id, title: '→ ' + a.name, on: a.id === u.akquise_id }))],
        onPick: async (w) => {
          let body = null;
          if (w === 'neu') { const n = await bpEingabe('Name der neuen Akquise', u.wofuer || '', { ok: 'Anlegen' }); if (!n || !n.trim()) return; body = { neu: n.trim() }; }
          else body = { akquise_id: w === 'los' ? null : +w.slice(1) };
          try { const r = await api(`api/ueberschlaege/${id}/akquise`, 'POST', body); const r2 = await api('api/ueberschlaege'); UEL = r2.ueberschlaege; UEA = r2.akquisen || []; neu();
            toast(w === 'los' ? 'Von der Akquise gelöst.' : 'An die Akquise gehängt – in der App „Akquise“ zu sehen.');
            rueckgaengig('Akquise geändert', async () => { await api(`api/ueberschlaege/${id}/akquise`, 'POST', { akquise_id: r.vorher }); if (box.isConnected) { const r3 = await api('api/ueberschlaege'); UEL = r3.ueberschlaege; UEA = r3.akquisen || []; neu(); } });
          } catch (er) { toast(er.message, true); } } });
      return;
    }
    if (b.dataset.uew) {
      try { const r = await api('api/ueberschlaege/' + id, 'DELETE'); UEL = UEL.filter((x) => x !== u); neu(); ueZahlNeu(-1);
        rueckgaengig('Überschlag gelöscht', async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); ueZahlNeu(1); if (box.isConnected) { UEL = (await api('api/ueberschlaege')).ueberschlaege; neu(); } });
      } catch (er) { toast(er.message, true); }
      return;
    }
    const pid = await ueProjekt(); if (!pid) return;
    try {
      const r = await api(`api/ueberschlaege/${id}/uebernehmen`, 'POST', { project_id: pid });
      box.querySelector('[data-m="zu"]').click(); ueZahlNeu(-1); await laden(r.auftrag_id);
      rueckgaengig('Überschlag ins Projekt übernommen', async () => {
        await api('api/ueberschlaege/zurueck', 'POST', { auftrag_id: r.auftrag_id, papierkorb: r.papierkorb }); AID = null; await laden(); });
    } catch (er) { toast(er.message, true); }
  });
}
function ueProjekt() {   // Projekt wählen (Suchfeld wie überall: select data-bp-projekte)
  const P = L.projekte, gp = (window.BPHead && BPHead.projekt && BPHead.projekt.id) || (P[0] || {}).id;
  if (!P.length) { toast('Es gibt noch kein Projekt.', true); return Promise.resolve(null); }
  return new Promise((ok) => modalBox(`<h3>In welches Projekt?</h3><p class="mute" style="margin:0 0 .6rem">Dort entsteht ein Honorarauftrag im Stand „Angebot“ mit den Werten des Überschlags.</p>
    <div class="row"><label>Projekt</label><select id="ueP" data-bp-projekte>${P.map((p) => `<option value="${p.id}"${p.id === gp ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
    <div class="acts"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Übernehmen</button></div>`,
  (m, bg, close) => { const v = m === 'ok' ? +bg.querySelector('#ueP').value : null; close(); ok(v); }));
}
