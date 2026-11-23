'use strict';
/* Kosten – Seite der App (Entwurf „Kosten aus Bauteilen“, entschieden am 16.11.2026). Kosten = Bauteile × Preis.
   Die Bauteile kommen aus der Checkliste im Projektmodell (Reiter „Bauteile“ rechts, Baustein bp/bauteile.js); hier nur Preise
   überschreiben, Zuschläge (Unvorhergesehenes, Baunebenkosten KG 700, Umsatzsteuer), Stufe, Genauigkeit, DIN 276 und Mittelabfluss.
   Server: plattform/baukosten.py. */
const NAV = $('#navL'), V = $('#view'), LEISTE = $('#bfl'), WORK = $('#work'), LS = bpLS('bk.');
const TABS = [['uebersicht', 'Übersicht'], ['bauteile', 'Bauteile'], ['din', 'DIN 276'], ['mittel', 'Mittelabfluss']];
const IC = { uebersicht: '<path d="M5 20V11M11 20V5M17 20v-7M3 20h18"/>', bauteile: '<path d="M4 7h16M4 12h16M4 17h16"/>', din: '<path d="M5 5h14v14H5zM5 10h14M10 10v9"/>',
  mittel: '<path d="M3 17l5-5 4 3 8-8M15 7h5v5"/>' };
const ICL = { version: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 3v5h6"/>', druck: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/>',
  bh: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>', ueb: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', details: '<path d="M4 4h16v16H4zM14 4v16"/>',
  xl: '<path d="M5 3h10l4 4v14H5z"/><path d="M9 11l5 6M14 11l-5 6"/>' };
const BEREICH = { rohbau: 'Rohbau', oeffnung: 'Öffnungen', raum: 'Räume – Oberflächen', ausbau: 'Küche und Bad', frage: 'Weitere (nicht im Modell)', hand: 'Von Hand', leistung: 'Leistungen ohne Bauteil', excel: 'Aus der Excel-Liste' };
const AMPEL = { gruen: ['im Ziel', 'var(--ok,#2e9d5b)'], gelb: ['am Rand des Ziels', 'var(--warn,#c99a06)'], rot: ['außerhalb des Ziels', 'var(--red,#c62f2a)'] };
let LIST = [], B = null, tab = LS.get('tab') || 'uebersicht', FLOW = null, saveT = 0;
const eur = (v) => (v == null ? '–' : bpZahl(Math.round(v), 0, 0) + ' €');
const eur2 = (v) => (v == null ? '–' : bpZahl(v, 2, 2) + ' €');
const pz = (v) => (v == null ? '–' : bpZahl(v, 0, 1) + ' %');
window.bpPlanungPid = () => (B && B.project_id) || (window.BPHead && BPHead.projektId && BPHead.projektId()) || null;

function nav() {
  if (!B) { NAV.hidden = true; return; } NAV.hidden = false;
  bpNav(NAV, { kopf: { titel: 'Kosten', klein: '' }, lage: true, attr: 'tab', aktiv: tab, davor: '<div class="bk-vm-nav"></div>',
    nachher: (el) => { const b = el.querySelector('.bk-vm-nav'); if (b && BPHead.versionsMenue) BPHead.versionsMenue({ ...vo(), in: b }); },
    gruppen: [{ titel: 'Kostenermittlung', punkte: TABS.map(([k, t]) => ({ id: k, text: t, icon: IC[k] })) }],
    wahl: (id) => { tab = id; LS.set('tab', id); zeichne(); } });
  bpNav.breite(NAV, { key: 'baukosten' });
}
const dkurz = (t) => (t ? new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
const versionen = () => (B ? LIST.filter((x) => x.project_id === B.project_id).sort((a, b) => a.id - b.id) : []);
function vo() {
  const V2 = versionen(), G = V2.find((x) => x.gueltig);
  return { aktuell: B && B.id, gueltig: G ? G.id : null, liste: V2.map((x) => ({ id: x.id, name: x.name, datum: dkurz(x.updated), wer: x.updated_by, archiviert: x.archived })),
    onWahl: async (id) => { await oeffnen(+id); }, onGueltig: gilt, onNeu: neueVersion, onUmbenennen: umbenennen, onVerwalten: versionLoeschen };
}
/* Version löschen – wie in den anderen Apps über das Versionsmenü („Archivieren / löschen …“), auch die gültige; immer über den Papierkorb mit Rückgängig (20.11.2026) */
async function versionLoeschen() {
  if (!B || !(await bpFrage(`Version „${B.name}“ in den Papierkorb legen?${(LIST.find((x) => x.id === B.id) || {}).gueltig ? '\n\nSie ist die gültige Kostenermittlung des Projekts – danach gilt keine, bis du eine andere gültig machst.' : ''}`, { ok: 'Löschen' }))) return;
  try {
    const id = B.id, r = await api('api/bk/' + id, 'DELETE'), pk = r.papierkorb;
    rueckgaengig('Kostenermittlung gelöscht', async () => { await api('api/bp/papierkorb/' + pk + '/zurueck', 'POST'); await laden(id); }, { neu: async () => { await laden(); } });
    await laden();
  } catch (e) { toast(e.message, true); }
}
async function gilt(id) { try { await api(`api/bk/${id}/gueltig`, 'PUT'); LIST = await api('api/bk'); nav(); toast('Diese Kostenermittlung gilt jetzt.'); } catch (e) { toast(e.message, true); } }
async function neueVersion() {
  const n = await bpEingabe('Name der neuen Version (Kopie dieser Kostenermittlung, z. B. „nach Bauherrengespräch“):', ''); if (!n || !String(n).trim()) return;
  try { const r = await api(`api/bk/${B.id}/kopie`, 'POST', { name: String(n).trim() }); LIST = await api('api/bk'); await oeffnen(r.id); toast(`Version „${r.name}“ angelegt.`); } catch (e) { toast(e.message, true); }
}
async function umbenennen() {
  const n = await bpEingabe('Name der Version:', B.name); if (!n || !String(n).trim()) return;
  await speichern({ name: String(n).trim() }); LIST = await api('api/bk'); nav();
}

async function laden(id) {
  LIST = await api('api/bk');
  const pid = BPHead.projektId();
  const fit = id ? LIST.find((x) => x.id === id) : pid ? (LIST.find((x) => x.project_id === pid && x.gueltig) || LIST.find((x) => x.project_id === pid && !x.archived)) : null;
  if (fit) await oeffnen(fit.id); else { B = null; zeichne(); }
}
async function oeffnen(id) { B = await api('api/bk/' + id); FLOW = null; if (B.project_id) BPHead.projektSetzen(B.project_id); zeichne(); }
async function speichern(felder, still) {
  clearTimeout(saveT);
  try { B = await api('api/bk/' + B.id, 'PUT', { rev: B.rev, ...felder }); if (!still) zeichne(); else teilZeichnen(); }
  catch (e) { toast(e.message, true); if (e.status === 409) await oeffnen(B.id); }
}
function datenAendern(text, neu) {   // Preise und Zuschläge: speichern, mit Rückgängig
  const alt = JSON.parse(JSON.stringify(B.data)), werte = {};
  Object.keys(neu).forEach((k) => { werte[k] = alt[k]; });
  speichern({ data: { ...alt, ...neu } }, true);
  if (window.rueckgaengig) rueckgaengig(text, async () => { await speichern({ data: { ...B.data, ...werte } }); }, 10000, async () => { await speichern({ data: { ...B.data, ...neu } }); });
}

/* ---------- Ansichten ---------- */
function band(G) {
  if (!G) return '<p class="mute">Noch keine Bauteile mit Preis – die Genauigkeit entsteht, sobald die ersten Zeilen in der Checkliste „wird berechnet“ haben.</p>';
  const s = B.calc.bauwerk + B.calc.extra, lo = G.unten, hi = G.oben, min = Math.min(lo, s * (1 - G.ziel[1] / 100)), max = Math.max(hi, s * (1 + G.ziel[1] / 100)), w = max - min || 1;
  const x = (v) => `${((v - min) / w * 100).toFixed(1)}%`, a = AMPEL[G.ampel];
  return `<div class="bk-band"><div class="bk-ziel" style="left:${x(s * (1 - G.ziel[0] / 100))};right:calc(100% - ${x(s * (1 + G.ziel[0] / 100))})"></div>
      <div class="bk-spanne" style="left:${x(lo)};right:calc(100% - ${x(hi)});background:${a[1]}"></div><div class="bk-mitte" style="left:${x(s)}"></div></div>
    <div class="bk-bz"><span>${eur(lo)}</span><b>${eur(s)}</b><span>${eur(hi)}</span></div>
    <p><b style="color:${a[1]}">−${pz(G.minus)} / +${pz(G.plus)}</b> · ${a[0]} der ${esc(B.stufen.find((x) => x.key === B.stufe).name)} (Ziel ±${G.ziel[0]}–${G.ziel[1]} %)</p>
    <table class="bk-t"><tr><td>Preise (Spannen der Bauteile)</td><td class="z">±${pz(G.teile.preise)}</td></tr><tr><td>Markt, Index, Region (trifft alle gleich)</td><td class="z">±${pz(G.teile.markt)}</td></tr>
      <tr><td>Mengen (nach Herkunft)</td><td class="z">±${pz(G.teile.mengen)}</td></tr><tr><td>noch offen (${G.offen})</td><td class="z">+${pz(G.teile.offen)}</td></tr></table>
    ${G.besser.length ? `<p class="mute" style="margin:.5rem 0 .2rem">Am meisten genauer wird es durch:</p><ul class="bk-ul">${G.besser.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <p class="mute bk-q">Band mit 90 % Wahrscheinlichkeit, nur aus den Bauteilen. Ziel: ${esc(G.ziel_quelle)}.</p>`;
}
function zuschlaege() {
  const d = B.data, c = B.calc, inp = (k, v, t) => `<input class="n" data-bkz="${k}" value="${v == null ? '' : bpZahl(v, 0, 2)}" inputmode="decimal" aria-label="${esc(t)}">`;
  return `<table class="bk-t bk-sum">
    <tr><td>Bauteile KG 300</td><td></td><td class="z">${eur(c.kg300)}</td></tr><tr><td>Bauteile KG 400</td><td></td><td class="z">${eur(c.kg400)}</td></tr>
    ${c.extra ? `<tr><td>weitere Kostengruppen</td><td></td><td class="z">${eur(c.extra)}</td></tr>` : ''}
    <tr><td>Unvorhergesehenes</td><td>${inp('risiko', d.risiko, 'Unvorhergesehenes in Prozent')} %</td><td class="z">${eur(c.risiko)}</td></tr>
    <tr><td>Baunebenkosten KG 700</td><td>${inp('nk', d.nk_fest == null ? d.nk : null, 'Baunebenkosten in Prozent')} % oder ${inp('nk_fest', d.nk_fest, 'Baunebenkosten fest in Euro')} €</td><td class="z">${eur(c.nk)}</td></tr>
    <tr class="s"><td>Summe netto</td><td></td><td class="z">${eur(c.total)}</td></tr>
    <tr><td>Umsatzsteuer</td><td>${inp('mwst', d.mwst, 'Umsatzsteuer in Prozent')} %</td><td class="z">${eur(c.mwst)}</td></tr>
    <tr class="s"><td>Summe brutto</td><td></td><td class="z">${eur(c.brutto)}</td></tr></table>`;
}
function hinweisModell() {
  const M = B.modell || {};
  const a = M.neu ? `<div class="bk-hw"><b>Das Projektmodell hat sich geändert.</b> <span class="mute">Die Kostenermittlung zeigt noch den Stand von vorher.</span> <button type="button" class="btn sm pri" data-bkueb>Aus dem Projektmodell übernehmen</button></div>` : '';
  const o = (M.offen || []).length ? `<div class="bk-hw rot"><b>${M.offen.length} offen in der Checkliste</b> <span class="mute">– gehen nur als Risiko nach oben ins Band.</span> <button type="button" class="btn sm" data-bkcheck>Checkliste öffnen</button></div>` : '';
  return a + o;
}
function uebersicht() {
  const c = B.calc;
  return `${hinweisModell()}<div class="bk-stufen">${B.stufen.map((s) => `<button type="button" class="btn sm${s.key === B.stufe ? ' pri' : ''}" data-bkstufe="${s.key}">${esc(s.name)}</button>`).join('')}</div>
    <div class="bk-zwei"><section class="card"><h3>Kosten</h3>${zuschlaege()}<p class="mute bk-q">${B.data.excel ? `${B.data.excel.zeilen.length} Beträge aus „${esc(B.data.excel.datei)}“` : `${B.data.bauteile.length} Bauteile aus dem Projektmodell`}${c.area ? ` · ${bpZahl(c.area, 0, 2)} m² Räume · ${eur(c.kw)}/m² Bauwerk` : ''}</p></section>
    <section class="card"><h3>Genauigkeit</h3>${band(c.genau)}</section></div>${teileHtml(c)}`;
}
// Gebäudeteile (GT-C1, 18.11.2026): Bauteile je Teil, netto ohne Zuschläge – nur wenn das Modell mehrere Teile hat
function teileHtml(c) {
  const T = Object.entries(c.teile || {}); if (T.length < 2) return '';
  const N = c.teile_namen || {}, s = T.reduce((a, [, v]) => a + v, 0);
  return `<section class="card bk-teile"><h3>Je Gebäudeteil</h3><table class="bk-t">${T.map(([k, v]) => `<tr><td>${esc(N[k] || k)}</td><td class="z">${eur(v)}</td><td class="z mute">${s ? bpZahl(100 * v / s, 0, 0) + ' %' : ''}</td></tr>`).join('')}
    <tr class="s"><td>Bauteile mit Teil</td><td class="z">${eur(s)}</td><td></td></tr></table><p class="mute bk-q">Bauteile ohne Teil (Fragen, von Hand) und Zuschläge sind darin nicht enthalten.</p></section>`;
}
function bauteile() {
  const Z = B.calc.zeilen;
  if (!Z.length) return `${hinweisModell()}<p class="mute">Noch keine Bauteile. Im Reiter „Bauteile“ rechts das Modell (IFC) einlesen bzw. Zeilen beantworten – jede Zeile mit „wird berechnet“ wird hier eine Kostenzeile.</p><button type="button" class="btn" data-bkcheck>Checkliste öffnen</button>`;
  const grp = {}; Z.forEach((z) => { (grp[z.bereich || 'hand'] ||= []).push(z); });
  return `${hinweisModell()}<table class="bk-t bk-zl"><thead><tr><th>Bauteil</th><th>KG</th><th>Element</th><th class="z">Menge</th><th class="z">EP</th><th class="z">Spanne</th><th class="z">Betrag</th></tr></thead><tbody>
    ${Object.entries(grp).map(([b, L]) => `<tr class="g"><td colspan="7">${esc(BEREICH[b] || b)}</td></tr>${L.map((z) => `<tr data-bkzl="${esc(z.id)}">
      <td>${esc(z.name)}<div class="mute bk-k">${esc([z.einordnung, z.mat].filter(Boolean).join(' · '))}</div></td><td>${esc(z.kg)}</td><td>${z.code ? `<code>${esc(z.code)}</code>` : z.aufbau ? `<code>${esc(z.aufbau.v)}</code> <span class="mute">nach Wahl</span>` : '<span class="mute">kein Aufbau</span>'}</td>
      <td class="z">${z.quelle === 'excel' ? `${bpZahl(z.menge, 0, 2)}` : `<input class="n${z.hand_menge ? ' hand' : ''}" data-bkmg="${esc(z.id)}" value="${bpZahl(z.menge, 0, 2)}" inputmode="decimal" title="${z.hand_menge ? `Menge hier geändert (Modell: ${bpZahl(z.menge_modell, 0, 2)}) – leeren für die Menge aus dem Modell` : 'Menge aus dem Gebäudemodell – ändern möglich, geht als Vorschlag ans Modell'}" aria-label="Menge ${esc(z.name)}">`} ${esc(z.einheit)}</td>
      <td class="z"><input class="n${z.hand ? ' hand' : ''}" data-bkep="${esc(z.id)}" value="${bpZahl(z.ep, 2, 2)}" inputmode="decimal" title="${z.hand ? 'Preis von Hand – leeren für den Preis aus dem Baukasten' : 'Preis aus dem Baukasten (mittel) – überschreiben möglich'}" aria-label="Einheitspreis ${esc(z.name)}"></td>
      <td class="z mute">${z.ep_von ? `${bpZahl(z.ep_von, 0, 0)}–${bpZahl(z.ep_bis, 0, 0)}` : '–'}</td><td class="z">${eur(z.betrag)}</td></tr>`).join('')}`).join('')}
    <tr class="s"><td colspan="6">Summe Bauteile</td><td class="z">${eur(B.calc.bauwerk + B.calc.extra)}</td></tr></tbody></table>`;
}
function din() {
  const k2 = B.calc.kg2, D = B.din, r = (k, w, s = '') => `<tr class="${s}"><td>${k}</td><td>${esc(D[k] || '')}</td><td class="z">${eur(w)}</td></tr>`;
  const ex = {}; B.calc.zeilen.filter((z) => !/^[34]/.test(z.kg)).forEach((z) => { const k = (z.kg || '0').slice(0, 1) + '00'; ex[k] = (ex[k] || 0) + z.betrag; });
  return `<table class="bk-t bk-din"><thead><tr><th>KG</th><th>Bezeichnung</th><th class="z">Betrag</th></tr></thead><tbody>
    ${Object.entries(ex).filter(([k]) => k < '300').map(([k, v]) => r(k, v, 'g')).join('')}
    ${r('300', B.calc.kg300, 'g')}${Object.keys(k2).filter((k) => k[0] === '3').map((k) => r(k, k2[k].wert)).join('')}
    ${r('400', B.calc.kg400, 'g')}${Object.keys(k2).filter((k) => k[0] === '4').map((k) => r(k, k2[k].wert)).join('')}
    ${Object.entries(ex).filter(([k]) => k > '400').map(([k, v]) => r(k, v, 'g')).join('')}
    <tr><td></td><td>Unvorhergesehenes (${bpZahl(B.data.risiko, 0, 2)} %)</td><td class="z">${eur(B.calc.risiko)}</td></tr>${r('700', B.calc.nk, 'g')}
    <tr class="s"><td></td><td>Summe netto</td><td class="z">${eur(B.calc.total)}</td></tr></tbody></table>
    <p class="mute bk-q">Nur Anzeige – die Kostengruppen entstehen aus den Bauteilen (KG des gewählten Aufbaus).</p>`;
}
async function mittel() {
  if (!FLOW) { V.innerHTML = '<p class="mute">Lade …</p>'; try { FLOW = await api(`api/bk/${B.id}/flow`); } catch (e) { FLOW = { ok: false, why: e.message }; } }
  if (!FLOW.ok) return `<p class="mute">${esc(FLOW.why)}</p>`;
  const max = Math.max(...FLOW.months.map((m) => m.idx), 1);
  return `<p>Bauzeitenplan „${esc(FLOW.plan)}“ · ${bpTag(FLOW.start)} – ${bpTag(FLOW.end)} · Basis ${eur(FLOW.base)} · mit Preissteigerung
      <input class="n" data-bkz="rate" value="${bpZahl(B.data.rate, 0, 2)}" inputmode="decimal" aria-label="Preissteigerung in Prozent je Jahr"> %/Jahr: ${eur(FLOW.total_idx)}</p>
    <table class="bk-t"><thead><tr><th>Monat</th><th class="z">Betrag</th><th class="z">mit Steigerung</th><th class="z">kumuliert</th><th></th></tr></thead><tbody>
    ${FLOW.months.map((m) => `<tr><td>${m.ym.slice(5)}/${m.ym.slice(0, 4)}</td><td class="z">${eur(m.amount)}</td><td class="z">${eur(m.idx)}</td><td class="z">${eur(m.cum_idx)}</td>
      <td class="bk-bal"><span style="width:${(m.idx / max * 100).toFixed(1)}%"></span></td></tr>`).join('')}</tbody></table>`;
}

/* Kostenstand fürs Bauherrenportal (bp/freigeben.js): 1. Ebene DIN 276 mit Zuschlägen, Stufe und Genauigkeit – je Projekt einer, ersetzt den früheren */
function bauherr() {
  const c = B.calc, G = c.genau, st = (B.stufen.find((x) => x.key === B.stufe) || {}).name || '';
  const Z = [['Kostengruppe', 'Betrag'], ['300 Bauwerk – Baukonstruktionen', eur(c.kg300)], ['400 Bauwerk – Technische Anlagen', eur(c.kg400)], ...(c.extra ? [['weitere Kostengruppen', eur(c.extra)]] : []),
    ['Unvorhergesehenes', eur(c.risiko)], ['700 Baunebenkosten', eur(c.nk)], ['Summe netto', eur(c.total)], ['Umsatzsteuer', eur(c.mwst)], ['Summe brutto', eur(c.brutto)]];
  BPHead.bauherrFreigeben({ pid: B.project_id, art: 'kosten', titel: `Kosten – ${st}`, schluessel: 'bk:' + B.project_id, stand: new Date().toISOString().slice(0, 10),
    daten: { text: `${st}, Stand ${new Date().toLocaleDateString('de-DE')}.${G ? ` Genauigkeit etwa −${pz(G.minus)} / +${pz(G.plus)}.` : ''}`, zeilen: Z } });
}
function drucken() {   // gemeinsame Druckseite (bp/druck.js); Gliederung, netto/brutto, Runden, „vorläufig“ im Druck-Layout „Kostenermittlung (DIN 276)“
  const st = (B.stufen.find((x) => x.key === B.stufe) || {}).name || 'Kosten', xl = !!B.data.excel;   // Stand aus Excel: gewohnter Aufbau (Zusammenstellung, Anhang) vorgewählt
  bpDruck({ titel: `${st} drucken`, name: `${st} ${B.name}${B.project ? ' – ' + B.project.name : ''}`, merk: 'kosten', bereich: 'kosten', mail: window.bpMailStandard(),
    teile: [['deckblatt', 'Deckblatt', true], ['zusammenfassung', 'Zusammenfassung (Stufe, Summe, Genauigkeit)', !xl], ['din', 'Kosten nach DIN 276', true],
      ['zusammenstellung', 'Zusammenstellung der Kosten mit Ort, Datum, Unterschrift', xl],
      ['bauteile', 'Bauteile (Menge × Preis, mit Einzelpreisen)', false], ['genauigkeit', 'Genauigkeit (Spannen, Offenes)', !xl],
      ['mittelabfluss', 'Mittelabfluss mit Diagramm', !xl], ['grundlagen', 'Erläuterungen und Grundlagen', !xl],
      ...(xl ? [['aenderungen', 'Anhang: Änderungen beim Einlesen', true]] : [])],
    url: (T) => `api/bk/${B.id}/bericht.pdf?teile=${T.join(',')}` });
}

function excelAus(e) {   // Excel im gewohnten Aufbau (baukosten_ausgabe.py) – Fassung wählen
  const k = e && e.target && e.target.closest('[data-bffn]'); if (!k) return;
  pickMenu(k, { items: [{ title: 'DIN 276:2018-12', sub: 'wie die Plattform', value: '2018' }, { title: 'DIN 276-1:2008-12', sub: 'anrechenbare Kosten nach HOAI', value: '2008' }],
    onPick: (v) => { location.assign(`api/bk/${B.id}/kosten.xlsx?fassung=${v}`); toast('Excel-Datei wird erstellt …'); } });
}
function leiste() {   // Befehlsleiste wie in allen Apps (befehle.js): Rückgängig · Neu · Modell · Ausgabe · rechts Ansicht
  if (!window.befehle) return;
  const pid = BPHead.projektId(), bh = window.BPHead && BPHead.bauherrAn && BPHead.bauherrAn();
  befehle(LEISTE, [
    { titel: 'Neu', knoepfe: [B ? { t: 'Version', ic: ICL.version, fn: neueVersion, tip: 'Neue Version als Kopie dieser Kostenermittlung' }
      : { t: 'Kostenermittlung', ic: ICL.version, fn: anlegen, aus: !pid, tip: 'Kostenermittlung für dieses Projekt anlegen' },
      { t: 'Aus Excel …', ic: ICL.xl, fn: () => bkExcel.einlesen(), aus: !pid, tip: 'Kostenberechnung aus einer Excel-Liste (.xls/.xlsx) als neuen Kostenstand einlesen – DIN 276:2008 wird auf 2018 umgesetzt' }] },
    { titel: 'Modell', knoepfe: [{ t: 'Bauteile übernehmen', ic: ICL.ueb, fn: uebernehmen, aus: !B || !!B.data.excel, tip: 'Bauteile und Mengen aus dem Projektmodell neu übernehmen' }] },
    { titel: 'Ausgabe', knoepfe: [{ t: 'Drucken …', ic: ICL.druck, fn: drucken, aus: !B, tip: 'Bericht als PDF: Deckblatt, Zusammenfassung, DIN 276, Genauigkeit, Mittelabfluss … – ankreuzen, Vorschau, senden, ablegen; Fassung 2018/2008 im Druck-Layout' },
      { t: 'Excel ▾', ic: ICL.xl, fn: excelAus, aus: !B, tip: 'Kostenermittlung als Excel im gewohnten Aufbau (Summen als Formeln) – DIN 276:2018 oder 2008 (anrechenbare Kosten HOAI)' }] },
    { titel: 'Teilen', knoepfe: [bh ? { t: 'Bauherr:in', ic: ICL.bh, fn: bauherr, aus: !B, tip: 'Kostenstand (DIN 276, 1. Ebene) für die Bauherr:innen freigeben – Bauherrenportal' } : null] },
    { titel: 'Ansicht', rechts: true, knoepfe: [{ t: 'Details', ic: ICL.details, fn: () => window.seiteUmschalten && seiteUmschalten(), aus: !B, tip: 'Bereich rechts (Bauteile, Planung, Fragen) zeigen oder an den Rand klappen' }] },
  ]);
}
async function anlegen() {   // erster Stand im Projekt: Startdaten aus dem Gebäudemodell? (setzt die Linie „Kosten“)
  const pid = BPHead.projektId(), erster = pid && !LIST.some((x) => x.project_id === pid);
  const sd = erster ? await BPHead.startdaten({ pid, app: 'kosten', titel: 'Neue Kostenermittlung' }) : { modus: 'uebernahme' }; if (!sd) return;
  try { const r = await api('api/bk', 'POST', { project_id: pid, modell: sd.modus !== 'getrennt' }); LIST = await api('api/bk'); await oeffnen(r.id); } catch (er) { toast(er.message, true); }
}
async function uebernehmen() { try { B = await api(`api/bk/${B.id}/uebernehmen`, 'POST'); FLOW = null; zeichne(); toast('Bauteile aus dem Projektmodell übernommen.'); } catch (er) { toast(er.message, true); } }

let HEFT = false;
async function zeichne() {
  nav(); leiste();
  if (!HEFT && window.befehle && befehle.heft) { HEFT = true; befehle.heft({ key: 'kosten', vor: WORK, einstufig: true, leiste: LEISTE, nach: () => dispatchEvent(new Event('resize')) }); }   // Heftzwecke wie Ausschreibung und Bauzeitenplan (21.11.2026)
  const pid = BPHead.projektId();
  if (!B) {
    V.className = pid ? '' : 'bk-leer';
    V.innerHTML = pid ? bpLeer({ was: 'keine Kostenermittlung', text: 'Neu anlegen – die Kosten entstehen aus den Bauteilen des Gebäudemodells (Reiter „Bauteile“).', knopf: 'Kostenermittlung anlegen …', attrs: 'data-bkneu' })
      : '<p>Bitte oben ein Projekt wählen – die Kosten gehören immer zu einem Projekt.</p><button type="button" class="btn pri" data-bkprojekt>Projekt wählen</button>';
    return;
  }
  V.className = 'bp-voll bk';
  V.innerHTML = tab === 'bauteile' ? bauteile() : tab === 'din' ? (B.data.excel ? bkExcel.din() : din()) : tab === 'mittel' ? await mittel() : uebersicht();
  seiteRechts();
}
const FOKUS = ['bkep', 'bkz', 'bkmg', 'bkxb', 'bkxn', 'bkxkg'];   // Felder, die nach dem Speichern den Fokus behalten (Kosten aus Excel: baukosten-excel.js)
function teilZeichnen() { const f = document.activeElement && document.activeElement.dataset, a = f && FOKUS.find((x) => f[x]), k = a && f[a]; zeichne().then(() => { if (k) { const el = V.querySelector(`[data-${a}="${CSS.escape(k)}"]`); if (el) el.focus(); } }); }
function seiteRechts() { if (window.seite) seite(WORK, 'bk', [], { start: 'bauteile' }); }

V.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.closest('[data-bkprojekt]')) return BPHead.projektWahl();
  if (t.closest('[data-bkneu]')) return anlegen();
  if (t.closest('[data-bkueb]')) return uebernehmen();
  if (t.closest('[data-bkcheck]')) { const r = document.querySelector('.sr-tab[data-srt="bauteile"]'); if (r) r.click(); else toast('Die Checkliste steht rechts im Reiter „Bauteile“.'); return; }
  const s = t.closest('[data-bkstufe]'); if (s && s.dataset.bkstufe !== B.stufe) { const alt = B.stufe; await speichern({ stufe: s.dataset.bkstufe }); if (window.rueckgaengig) rueckgaengig('Stufe geändert', () => speichern({ stufe: alt }), 10000, () => speichern({ stufe: s.dataset.bkstufe })); }
});
V.addEventListener('change', (e) => {
  const t = e.target, zahl = (v) => (String(v).trim() === '' ? null : parseFloat(String(v).replace(/\./g, '').replace(',', '.')));
  if (t.dataset.bkep) {
    const P = { ...(B.data.preise || {}) }, v = zahl(t.value), z = B.calc.zeilen.find((x) => x.id === t.dataset.bkep);
    if (v == null || (z && !z.hand && Math.abs(v - z.ep) < 0.005)) delete P[t.dataset.bkep]; else P[t.dataset.bkep] = v;
    return datenAendern(`Preis „${z ? z.name : ''}“`, { preise: P });
  }
  if (t.dataset.bkmg) {   // Menge nur hier ändern – mit Schalter „ins Modell“ (Checkliste) kommt sie als Vorschlag ans Gebäudemodell
    const M = { ...(B.data.mengen || {}) }, v = zahl(t.value), z = B.calc.zeilen.find((x) => x.id === t.dataset.bkmg), orig = z ? (z.hand_menge ? z.menge_modell : z.menge) : null;
    if (v == null || (orig != null && Math.abs(v - orig) < 0.0005)) delete M[t.dataset.bkmg]; else M[t.dataset.bkmg] = v;
    return datenAendern(`Menge „${z ? z.name : ''}“`, { mengen: M });
  }
  if (t.dataset.bkz) {
    const k = t.dataset.bkz, v = zahl(t.value), neu = { [k]: v == null ? (k === 'nk_fest' ? null : 0) : v };
    if (k === 'nk' && v != null) neu.nk_fest = null;
    if (k === 'rate') FLOW = null;
    return datenAendern('Zuschlag geändert', neu);
  }
});

(async () => {
  const [me, conf] = await Promise.all([api('api/me'), api('api/platform')]); applyLook(me);   // gleichzeitig
  await header('Kosten', me, conf);
  if (window.BPHead && BPHead.beiProjektWahl) BPHead.beiProjektWahl(async () => { await laden(); });
  const hb = /^#bk=(\d+)/.exec(location.hash);
  if (!TABS.some((t) => t[0] === tab)) tab = 'uebersicht';
  await laden(hb ? +hb[1] : undefined);
})().catch((e) => toast(e.message, true));
window.bpAeltereStaende = () => (B ? () => BPHead.verlauf({ bereich: 'bkp:' + B.id, nach: () => oeffnen(B.id) }) : null);   // Rückgängig ▾ → „Ältere Stände …“
window.bpMailStandard = () => ({ art: 'baukosten', pid: (B && B.project_id) || null, link: 'baukosten:' });

/* Links ⇄ rechts (19.11.2026): Kostenzeile und Karte im Reiter „Bauteile“ leuchten gemeinsam auf; Klick holt die andere Seite ins Bild.
   Ändert sich rechts eine Antwort, rechnet die Tabelle links neu (Ereignis „bp:bauteile“ aus bp/bauteile.js). */
const bkPaar = (el) => { const r = el && el.closest && el.closest('[data-bkzl],[data-btz]'); return r ? (r.dataset.bkzl != null ? ['btz', r.dataset.bkzl] : ['bkzl', r.dataset.btz]) : null; };
let bkLicht = '';
WORK.addEventListener('pointerover', (e) => {
  const p = bkPaar(e.target), id = p ? p[1] : '';
  if (id === bkLicht) return;
  WORK.querySelectorAll('.bp-paar').forEach((x) => x.classList.remove('bp-paar'));
  bkLicht = id; if (!id) return;
  WORK.querySelectorAll(`[data-bkzl="${CSS.escape(id)}"],[data-btz="${CSS.escape(id)}"]`).forEach((x) => x.classList.add('bp-paar'));
});
WORK.addEventListener('click', (e) => {
  if (e.target.closest('button,input,select,a,label,summary')) return;
  const p = bkPaar(e.target); if (!p) return;
  const ziel = WORK.querySelector(`[data-${p[0]}="${CSS.escape(p[1])}"]`); if (ziel) ziel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});
window.addEventListener('bp:bauteile', async (e) => {
  if (!B || !e.detail || +e.detail.pid !== +B.project_id) return;
  try { B = await api('api/bk/' + B.id); teilZeichnen(); } catch { /* nächstes Öffnen rechnet neu */ }
});
