'use strict';
/* =====================================================================
   Reiter „Gewerke & Firmen“
   - Tabelle je Gewerk des Projekts: Firma, Kontakt, Vergabestatus, Notiz,
     Leistungen und Einsatzzeitraum aus dem Plan.
   - Firmen stehen in einem projektübergreifenden Adressbuch (Server: firms.json),
     die Zuordnung Gewerk → Firma, Status und Notiz gehören zum Projekt (P.trades).
   ===================================================================== */
let FIRMS = [], firmsLoaded = false, firmSaveT = null, fvBookOpen = false, fvQuery = '';
const VERGABE = [['', '–'], ['offen', 'offen'], ['angefragt', 'angefragt'], ['angebot', 'Angebot liegt vor'], ['beauftragt', 'beauftragt'], ['fertig', 'abgeschlossen']];
// übliche Unternehmerbezeichnung je Gewerk
const CRAFT = { Abbruch: 'Abbruchunternehmer', Rohbau: 'Maurer / Betonbauer', Sanitär: 'Installateur (SHK)', Heizung: 'Heizungsbauer (SHK)', Elektro: 'Elektroinstallateur',
  Fenster: 'Fensterbauer', Putz: 'Stuckateur / Putzer', Estrich: 'Estrichleger', Fliesen: 'Fliesenleger', Trockenbau: 'Trockenbauer', Maler: 'Maler und Lackierer',
  Bodenbelag: 'Bodenleger / Parkettleger', Tischler: 'Tischler / Schreiner', Dach: 'Dachdecker', Zimmerer: 'Zimmerer', Klempner: 'Klempner / Spengler', Gerüst: 'Gerüstbauer',
  Erdbau: 'Erdbauer', Abdichtung: 'Bauwerksabdichter', Fassade: 'Fassadenbauer / Stuckateur', Lüftung: 'Lüftungsbauer', Aufzug: 'Aufzugsbauer', Außenanlagen: 'Garten- und Landschaftsbauer',
  Reinigung: 'Gebäudereiniger', Bauleitung: 'Bauleitung', Vermessung: 'Vermessungsingenieur', Metallbau: 'Metallbauer / Schlosser', Naturstein: 'Steinmetz', Stahlbau: 'Stahlbauer',
  Spezialtiefbau: 'Spezialtiefbauer', Tiefbau: 'Tiefbauer', Dämmung: 'Isolierer', Statiker: 'Tragwerksplaner', Architekt: 'Architekt:in / Objektplaner',
  Rollladen: 'Rollladen- und Sonnenschutztechniker', Glaser: 'Glaser', Küche: 'Küchenmonteur / Tischler' };
const GW_DIN = { Abbruch: '18459', Rohbau: '18330 / 18331', Erdbau: '18300', Sanitär: '18381', Heizung: '18380', Elektro: '18382', Lüftung: '18379', Fenster: '18355', Tischler: '18355',
  Putz: '18350', Estrich: '18353', Fliesen: '18352', Trockenbau: '18340', Maler: '18363', Bodenbelag: '18356 / 18365', Dach: '18338', Zimmerer: '18334', Klempner: '18339',
  Gerüst: '18451', Abdichtung: '18336', Fassade: '18345', Aufzug: '18385', Außenanlagen: '18318 / 18320', Metallbau: '18360', Naturstein: '18332', Stahlbau: '18335', Bauleitung: '18299',
  Rollladen: '18358', Glaser: '18361', Küche: '18355', Spezialtiefbau: '18301' };
const atvOf = (num) => (window.DIN_ATV || []).find((x) => x[0] === String(num).trim());
function dinOf(gw) {
  const o = tradeOf(gw).din; if (o) return o;
  const nums = new Map();
  P.tasks.forEach((t) => {
    if (t.gw !== gw || !t.cat) return;
    let din = '';
    if (window.CATALOG) { const it = CATALOG.items.find((x) => x.id === t.cat) || ((P.assist && P.assist.custom) || []).find((x) => x.id === t.cat); if (it && it.din) din = it.din; }
    for (const n of String(din).split(/[^0-9]+/).filter((x) => x.length === 5)) nums.set(n, (nums.get(n) || 0) + 1);
  });
  if (nums.size) return [...nums.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]).join(' / ');
  if (GW_DIN[gw]) return GW_DIN[gw];
  const a = (window.DIN_ATV || []).find((x) => x[2] === gw);
  return a ? a[0] : '';
}
const dinTitle = (din) => String(din || '').split(/[^0-9]+/).filter(Boolean).map((n) => (atvOf(n) || [n, ''])[1]).filter(Boolean).join(' / ');
function craftOf(gw) {
  const o = tradeOf(gw).craft; if (o) return o;
  const cnt = new Map();   // im Plan eingetragene Bezeichnungen (keine Firmen aus dem Adressbuch)
  P.tasks.forEach((t) => { if (t.gw === gw && t.res && t.res !== gw && !firmByName(t.res)) cnt.set(t.res, (cnt.get(t.res) || 0) + 1); });
  if (cnt.size) return [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return CRAFT[gw] || gw;
}
const FV_FIELDS = [['contact', 'Ansprechpartner:in'], ['phone', 'Telefon'], ['mobile', 'Mobil'], ['mail', 'E-Mail'], ['address', 'Adresse']];

async function loadFirms() {
  try { FIRMS = await fetch('api/firms').then(j); } catch (e) { toast('Adressbuch konnte nicht geladen werden: ' + e.message, true); }
  firmsLoaded = true; if (fvVisible()) renderFirms();
}
// Das Adressbuch ist das Kontaktverzeichnis des Bautagebuchs (Bauplattform) – mehrere Benutzer arbeiten gleichzeitig darin.
// Gelöscht wird deshalb nur, was hier ausdrücklich gelöscht wurde; neue Firmen anderer Benutzer werden übernommen.
let FIRMS_DEL = [];
function saveFirmsSoon() {
  clearTimeout(firmSaveT);
  firmSaveT = setTimeout(() => {
    const del = FIRMS_DEL.slice();
    fetch('api/firms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firms: FIRMS, deleted: del }) })
      .then(async (r) => {
        const list = await j(r);
        FIRMS_DEL = FIRMS_DEL.filter((x) => !del.includes(x));
        // eine hier neu angelegte Firma gab es schon (gleicher Name) → deren Eintrag verwenden, Verweise im Plan umstellen
        const srv = new Set(list.map((f) => f.id)), low = (x) => String(x || '').trim().toLowerCase();
        for (const f of FIRMS.filter((x) => !srv.has(x.id))) {
          const m = list.find((x) => low(x.name) === low(f.name) && !FIRMS.some((y) => y.id === x.id));
          if (!m) continue;
          const old = f.id; Object.assign(f, m);
          if (P && Object.values(P.trades || {}).some((t) => t.firm === old)) act(() => { for (const t of Object.values(P.trades)) if (t.firm === old) t.firm = m.id; });
        }
        const known = new Set(FIRMS.map((f) => f.id)), added = list.filter((f) => !known.has(f.id) && !FIRMS_DEL.includes(f.id));
        if (added.length) { FIRMS.push(...added); if (fvVisible() && !$('#firmView').contains(document.activeElement)) renderFirms(); }
        const kept = r.headers.get('X-Kept');
        if (kept) toast(`Nicht gelöscht, weil noch verwendet (Bautagebuch, Baustelle oder ein anderer Bauzeitenplan): ${decodeURIComponent(kept)}`, true);
        setSave('Adressbuch gespeichert');
      }).catch((e) => toast('Adressbuch: Speichern fehlgeschlagen – ' + e.message, true));
  }, 400);
}
const firmById = (id) => FIRMS.find((f) => f.id === id);
const firmByName = (n) => { n = String(n || '').trim().toLowerCase(); return n ? FIRMS.find((f) => f.name.trim().toLowerCase() === n) : null; };
const fvVisible = () => !$('#firmView').hidden;
const newFirmId = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function tradeRows() {
  const map = new Map();
  P.tasks.forEach((t, i) => {
    if (!t.gw || CAL.summ[i]) return;
    let r = map.get(t.gw); if (!r) map.set(t.gw, (r = { gw: t.gw, n: 0, sd: Infinity, fd: -Infinity, res: new Set(), names: [] }));
    r.n++; r.names.push(t.name); r.sd = Math.min(r.sd, CAL.sd[i]); r.fd = Math.max(r.fd, CAL.fd[i]); if (t.res) r.res.add(t.res);
    // Arbeitszeiträume in Arbeitstagen (je Abschnitt bei unterbrochenen Leistungen)
    const S = CAL.segS[i] || [], E = CAL.segE[i] || [];
    (r.wiv || (r.wiv = [])).push(...S.map((x, k) => [x, E[k]]).filter(([a, b]) => b > a));
  });
  // zusammenhängende Arbeitstage zusammenfassen, Lücken (Pausen) bleiben
  for (const r of map.values()) {
    const w = (r.wiv || []).sort((a, b) => a[0] - b[0]), m = [];
    for (const [a, b] of w) { const l = m[m.length - 1]; if (l && a <= l[1]) l[1] = Math.max(l[1], b); else m.push([a, b]); }
    r.iv = m.map(([a, b]) => [fromW(a), fromW(b - 1)]);
  }
  for (const g of Object.keys(P.trades || {})) if (!map.has(g)) map.set(g, { gw: g, n: 0, sd: Infinity, fd: -Infinity, res: new Set() });
  return [...map.values()].sort((a, b) => (a.sd - b.sd) || a.gw.localeCompare(b.gw, 'de'));
}
const tradeOf = (gw) => (P.trades && P.trades[gw]) || {};
// Vorschläge für „Gewerk hinzufügen“: übliche Gewerke und Gewerke aus dem Adressbuch, ohne die schon im Projekt vorhandenen
function tradeSuggestions() {
  const have = new Set(tradeRows().map((r) => r.gw.toLowerCase())), out = new Map();
  for (const g of [...Object.keys(CRAFT), ...FIRMS.flatMap((f) => f.gewerke || [])]) {
    const k = String(g || '').trim(); if (k && !have.has(k.toLowerCase()) && !out.has(k.toLowerCase())) out.set(k.toLowerCase(), k);
  }
  return [...out.values()].sort((a, b) => a.localeCompare(b, 'de'));
}

function renderFirms() {
  const box = $('#firmView'); if (!P || !CAL) { box.innerHTML = ''; return; }
  const ae = document.activeElement, keep = ae && box.contains(ae) && ae.closest('tr') ? { gw: ae.closest('tr').dataset.gw, fid: ae.closest('tr').dataset.fid, sel: ['f', 'c', 'dc'].map((k) => ae.dataset[k] != null ? `[data-${k}="${ae.dataset[k]}"]` : '').join('') } : null;
  const sc = box.querySelector('.fv-scroll'), st = sc ? sc.scrollTop : 0;
  const rows = tradeRows();
  const withFirm = rows.filter((r) => firmById(tradeOf(r.gw).firm)).length, booked = rows.filter((r) => tradeOf(r.gw).status === 'beauftragt' || tradeOf(r.gw).status === 'fertig').length;
  const per = (r) => (r.n ? (r.sd === r.fd ? fmtD(r.sd) : `${fmtShort(r.sd)} – ${fmtD(r.fd)}`) : '–');
  // Zeitbalken wie in der gedruckten Liste: Projektzeitraum, Monatsraster, Einsatz in der Gewerkfarbe
  const ps = P.start, pe = CAL.peDay, span = Math.max(1, pe - ps + 1), pos = (n) => Math.max(0, Math.min(100, ((n - ps) / span) * 100));
  const ticks = []; { const d0 = ud(ps); let d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); for (let g = 0; g < 60; g++) { const n = Math.round(d.getTime() / 864e5); if (n > pe) break; ticks.push(n); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); } }
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const showLbl = ticks.length <= 14 ? 1 : Math.ceil(ticks.length / 12);
  const tlHead = `<div class="fv-tl fv-tlh">${ticks.map((n, k) => `<i style="left:${pos(n)}%"></i>${k % showLbl ? '' : `<span style="left:${pos(n)}%">${MON[ud(n).getUTCMonth()]}</span>`}`).join('')}</div>`;
  const tlBar = (r) => `<div class="fv-tl">${ticks.map((n) => `<i style="left:${pos(n)}%"></i>`).join('')}${(r.iv || []).map(([a, b]) => `<b style="left:${pos(a)}%;width:${Math.max(1, pos(b + 1) - pos(a))}%;background:${gwColor(r.gw)}" title="${esc(a === b ? fmtD(a) : fmtShort(a) + ' – ' + fmtD(b))}"></b>`).join('')}</div>`;
  let h = `<div class="fv"><div class="fv-head"><div><h3>Gewerke &amp; Firmen</h3><span>${esc(P.name)} · ${rows.length} Gewerke · ${withFirm} mit Firma · ${booked} beauftragt</span></div>
    <span class="fv-hint">Firma wählen oder neu eintragen – sie wird als Unternehmer:in bei den Leistungen des Gewerks eingetragen. Kontaktdaten stehen im Adressbuch und gelten für alle Projekte.</span></div>
    <div class="fv-scroll"><table class="fv-t" data-tk="fv-main"><thead><tr><th style="min-width:200px">Gewerk</th><th style="min-width:210px">Leistungsbereich nach DIN (VOB/C)</th><th style="min-width:170px">Firma</th>${FV_FIELDS.map(([, l]) => `<th>${l}</th>`).join('')}<th>Vergabe</th><th class="fv-perh">Einsatz im Plan${ticks.length ? tlHead : ''}</th><th style="min-width:140px">Notiz</th><th></th></tr></thead><tbody>`;
  for (const r of rows) {
    const tr = tradeOf(r.gw), f = firmById(tr.firm);
    const cr = craftOf(r.gw), planRes = [...r.res].filter((x) => (!f || x !== f.name) && x !== cr && x !== r.gw && !Object.values(CRAFT).includes(x));
    const din = dinOf(r.gw), dt = dinTitle(din);
    h += `<tr data-gw="${esc(r.gw)}" class="${tr.status ? 'st-' + tr.status : ''}"><td class="fv-gw"><div class="fv-din"><span class="gwdot fv-dot" style="background:${gwColor(r.gw)}"></span><input data-f="craft" value="${esc(craftOf(r.gw))}" title="Gewerk / Unternehmerbezeichnung, z. B. Fensterbauer, Estrichleger"></div><small class="fv-pl">im Plan: ${esc(r.gw)}</small></td>
      <td class="fv-lb"><input data-f="dint" list="fvDinList" value="${esc(dt || '')}" placeholder="Leistungsbereich wählen …" title="Leistungsbereich nach VOB/C wählen – die DIN-Nummer wird eingetragen"><small class="fv-pl">${din ? 'DIN ' + esc(din) : '&nbsp;'}</small></td>
      <td><input data-f="firm" list="fvFirmList" value="${esc(f ? f.name : '')}" placeholder="Firma wählen / eintragen">${!f && planRes.length ? `<div class="fv-plan">im Plan: ${planRes.map((x) => `<button class="fv-take" data-take="${esc(x)}" title="Als Firma übernehmen">${esc(x)}</button>`).join(' ')}</div>` : ''}</td>
      ${FV_FIELDS.map(([k]) => `<td><input data-c="${k}" value="${esc(f ? f[k] || '' : '')}"${f ? '' : ' disabled'}${k === 'mail' ? ' type="email"' : ''}></td>`).join('')}
      <td><select data-f="status">${VERGABE.map(([v, l]) => `<option value="${v}"${(tr.status || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></td>
      <td class="fv-per" data-sort="${r.n ? String(r.sd).padStart(8, '0') : ''}"${r.n ? ` title="${esc(r.n + (r.n === 1 ? ' Leistung:\n' : ' Leistungen:\n') + (r.names || []).slice(0, 25).join('\n') + ((r.names || []).length > 25 ? '\n…' : ''))}"` : ''}><div class="fv-dt2">${per(r)}</div>${tlBar(r)}</td>
      <td><input data-f="note" value="${esc(tr.note || '')}"></td>
      <td>${f && f.mail ? `<a class="fv-mail" href="mailto:${esc(f.mail)}?subject=${encodeURIComponent(P.name + ' – ' + r.gw)}" title="E-Mail schreiben">✉</a>` : ''}${!r.n ? `<button class="fv-x" data-rm="${esc(r.gw)}" title="Gewerk aus der Liste entfernen">✕</button>` : ''}</td></tr>`;
  }
  if (!rows.length) h += `<tr><td colspan="${FV_FIELDS.length + 6}" class="fv-empty">Noch keine Gewerke im Projekt – Gewerke in der Spalte „Gewerk“ der Leistungen eintragen oder mit „Gewerk hinzufügen“ ergänzen.</td></tr>`;
  h += '</tbody></table>';
  // Adressbuch
  const q = fvQuery.trim().toLowerCase();
  const book = FIRMS.filter((f) => !q || [f.name, f.contact, f.mail, ...(f.gewerke || [])].join(' ').toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  h += `<details class="fv-book"${fvBookOpen ? ' open' : ''}><summary>Adressbuch – alle Firmen (${FIRMS.length}), projektübergreifend</summary>
    <div class="fv-bt"><input id="fvQ" placeholder="Suchen …" value="${esc(fvQuery)}"><button class="btn sm" data-a="firm-new">+ Firma</button></div>
    <table class="fv-t" data-tk="fv-book"><thead><tr><th style="min-width:170px">Firma</th><th>Gewerke</th>${FV_FIELDS.map(([, l]) => `<th>${l}</th>`).join('')}<th>Notiz</th><th></th></tr></thead><tbody>`
    + (book.map((f) => `<tr data-fid="${f.id}"><td><input data-dc="name" value="${esc(f.name)}"></td><td><input data-dc="gewerke" value="${esc((f.gewerke || []).join(', '))}" placeholder="z. B. Elektro, Heizung"></td>
      ${FV_FIELDS.map(([k]) => `<td><input data-dc="${k}" value="${esc(f[k] || '')}"></td>`).join('')}<td><input data-dc="note" value="${esc(f.note || '')}"></td>
      <td><button class="fv-x" data-del="${f.id}" title="Firma aus dem Adressbuch löschen">✕</button></td></tr>`).join('') || `<tr><td colspan="${FV_FIELDS.length + 4}" class="fv-empty">${FIRMS.length ? 'Keine Treffer.' : 'Noch keine Firmen – oben bei einem Gewerk eine Firma eintragen oder „+ Firma“.'}</td></tr>`)
    + '</tbody></table></details></div>';
  h += `<datalist id="fvDinList">${(window.DIN_ATV || []).slice().sort((a, b) => a[1].localeCompare(b[1], 'de')).map((x) => `<option value="${esc(x[1])}">DIN ${x[0]}${x[2] ? ' · ' + esc(x[2]) : ''}</option>`).join('')}</datalist>`;
  h += `<datalist id="fvFirmList">${FIRMS.slice().sort((a, b) => a.name.localeCompare(b.name, 'de')).map((f) => `<option value="${esc(f.name)}">${esc((f.gewerke || []).join(', '))}</option>`).join('')}</datalist></div>`;
  box.innerHTML = h;
  if (typeof enhanceTables === 'function') enhanceTables(box);
  const sc2 = box.querySelector('.fv-scroll'); if (sc2) sc2.scrollTop = st;
  if (keep && keep.sel) { const row = keep.gw != null ? box.querySelector(`tr[data-gw="${CSS.escape(keep.gw)}"]`) : keep.fid ? box.querySelector(`tr[data-fid="${keep.fid}"]`) : null; const el = row && row.querySelector(keep.sel); if (el) el.focus({ preventScroll: true }); }
}

// Firma einem Gewerk zuordnen und bei dessen Leistungen als Unternehmer eintragen
function setTradeFirm(gw, name) {
  name = String(name || '').trim();
  const old = firmById(tradeOf(gw).firm), craft = craftOf(gw);
  let f = name ? firmByName(name) : null;
  if (name && !f) { f = { id: newFirmId(), name, gewerke: [gw], contact: '', phone: '', mobile: '', mail: '', address: '', note: '' }; FIRMS.push(f); }
  if (f && !(f.gewerke || []).includes(gw)) f.gewerke = [...(f.gewerke || []), gw];
  if (f || old) saveFirmsSoon();
  let n = 0;
  act(() => {
    P.trades = { ...(P.trades || {}) };
    P.trades[gw] = { ...tradeOf(gw), firm: f ? f.id : '' };
    for (const t of P.tasks) if (t.gw === gw && (!t.res || (old && t.res === old.name) || t.res === craft)) { const nv = f ? f.name : craft; if (t.res !== nv) { t.res = nv; n++; } }
  });
  if (f) toast(`${f.name} für ${gw}` + (n ? ` – bei ${n} Leistungen als Unternehmer:in eingetragen.` : '.'));
}
function assignAllFirms() {
  let n = 0;
  act(() => { for (const [gw, tr] of Object.entries(P.trades || {})) { const f = firmById(tr.firm); if (!f) continue; for (const t of P.tasks) if (t.gw === gw && t.res !== f.name) { t.res = f.name; n++; } } });
  toast(n ? `Bei ${n} Leistungen die Unternehmer:in aus der Firmenliste eingetragen.` : 'Alle Leistungen haben bereits die zugeordnete Firma.');
}
function tradeCsv() {
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const out = [['DIN', 'Gewerk nach DIN', 'Gewerk im Plan', 'Unternehmer:in', 'Firma', ...FV_FIELDS.map(([, l]) => l), 'Vergabe', 'Leistungen', 'Beginn', 'Ende', 'Notiz']];
  for (const r of tradeRows()) { const tr = tradeOf(r.gw), f = firmById(tr.firm) || {}; out.push([dinOf(r.gw), dinTitle(dinOf(r.gw)), r.gw, craftOf(r.gw), f.name || '', ...FV_FIELDS.map(([k]) => f[k] || ''), (VERGABE.find((x) => x[0] === (tr.status || '')) || ['', ''])[1], r.n, r.n ? fmtD(r.sd).slice(3) : '', r.n ? fmtD(r.fd).slice(3) : '', tr.note || '']); }
  download(fileName('csv').replace(/\.csv$/, '_Firmen.csv'), '﻿' + out.map((r) => r.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}
function tradeMail() {
  const mails = [...new Set(tradeRows().map((r) => (firmById(tradeOf(r.gw).firm) || {}).mail).filter(Boolean))];
  if (!mails.length) { toast('Für dieses Projekt sind noch keine E-Mail-Adressen eingetragen.', true); return; }
  location.href = `mailto:?bcc=${encodeURIComponent(mails.join(','))}&subject=${encodeURIComponent(P.name)}`;
}
function tradePrint() {
  const rows = tradeRows(), w = window.open('', '_blank'); if (!w) { toast('Bitte Pop-ups für diese Seite erlauben.', true); return; }
  const now = new Date(), stand = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  const ps = P.start, pe = CAL ? CAL.peDay : ps, span = Math.max(1, pe - ps + 1);
  const withFirm = rows.filter((r) => firmById(tradeOf(r.gw).firm)).length;
  const booked = rows.filter((r) => ['beauftragt', 'fertig'].includes(tradeOf(r.gw).status)).length;
  const ST = { offen: ['#fff3e0', '#b35c00'], angefragt: ['#e8f0fb', '#1f5fa8'], angebot: ['#fff8d6', '#7a6000'], beauftragt: ['#e6f4ea', '#1e6b34'], fertig: ['#eceff1', '#455a64'] };
  // Monatsraster für die Einsatz-Balken
  const ticks = []; { const d0 = ud(ps); let d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); while (true) { const n = Math.round(d.getTime() / 864e5); if (n > pe) break; ticks.push(n); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); } }
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const pos = (n) => Math.max(0, Math.min(100, ((n - ps) / span) * 100));
  const bar = (r) => !r.n ? '<div class="tl"></div>' : `<div class="tl">${ticks.map((n) => `<i style="left:${pos(n)}%"></i>`).join('')}${(r.iv || []).map(([a, b]) => `<b style="left:${pos(a)}%;width:${Math.max(0.8, pos(b + 1) - pos(a))}%;background:${gwColor(r.gw)}"></b>`).join('')}</div>`;
  const head = `<div class="tl hd">${ticks.map((n) => `<i style="left:${pos(n)}%"></i><span style="left:${pos(n)}%">${MON[ud(n).getUTCMonth()]}</span>`).join('')}</div>`;
  const rowHtml = (r) => {
    const tr = tradeOf(r.gw), f = firmById(tr.firm) || {}, din = dinOf(r.gw), st = ST[tr.status];
    const kontakt = [f.contact && `<div class="c1">${esc(f.contact)}</div>`, f.phone && `<div>Tel. ${esc(f.phone)}</div>`, f.mobile && `<div>Mobil ${esc(f.mobile)}</div>`, f.mail && `<div class="ml">${esc(f.mail)}</div>`].filter(Boolean).join('');
    return `<tr><td class="gw" style="border-left-color:${gwColor(r.gw)}">${din ? `<span class="din">DIN ${esc(din)}</span>` : ''}<div class="gt">${esc(dinTitle(din) || r.gw)}</div><div class="sub">${esc(craftOf(r.gw))}</div></td>
      <td>${f.name ? `<div class="fn">${esc(f.name)}</div>` : '<div class="nf">noch offen</div>'}${f.address ? `<div class="sub">${esc(f.address).replace(/\n/g, '<br>')}</div>` : ''}</td>
      <td class="kt">${kontakt || '<span class="nf">–</span>'}</td>
      <td>${st ? `<span class="pill" style="background:${st[0]};color:${st[1]}">${esc((VERGABE.find((x) => x[0] === tr.status) || ['', ''])[1])}</span>` : '<span class="nf">–</span>'}</td>
      <td class="ein"><div class="dt">${r.n ? (r.sd === r.fd ? fmtD(r.sd) : fmtShort(r.sd) + ' – ' + fmtD(r.fd)) : '–'}${r.n ? ` <span class="sub">· ${r.n} ${r.n === 1 ? 'Leistung' : 'Leistungen'}</span>` : ''}</div>${bar(r)}</td>
      <td class="nt">${esc(tr.note || '')}</td></tr>`;
  };
  w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Gewerke und Firmen – ${esc(P.name)}</title><style>
    @page{size:A4 landscape;margin:12mm 12mm 14mm;@bottom-left{content:"${esc(P.name).replace(/"/g, '')} · Gewerke und Firmen · Stand ${stand}";font:8.5px "Segoe UI",Arial,sans-serif;color:#888}@bottom-right{content:"Seite " counter(page) " von " counter(pages);font:8.5px "Segoe UI",Arial,sans-serif;color:#888}}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font:10px/1.35 "Segoe UI",system-ui,Arial,sans-serif;margin:0;color:#222}
    .top{display:flex;align-items:flex-end;gap:18px;border-bottom:3px solid #e8604c;padding:0 0 8px;margin-bottom:10px}
    .top h1{font-size:19px;margin:0;font-weight:700;letter-spacing:-.2px}.top .k{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:#e8604c;font-weight:700;margin-bottom:2px}
    .top .meta{color:#666;margin-top:2px}.kpi{margin-left:auto;display:flex;gap:6px}
    .kpi div{border:1px solid #e3ddd8;background:#faf7f5;border-radius:calc(6px*var(--rk,1));padding:4px 10px;text-align:right;min-width:72px}.kpi b{display:block;font-size:15px;line-height:1.1}.kpi span{color:#777;font-size:8.5px}
    table{border-collapse:collapse;width:100%}thead{display:table-header-group}tr{break-inside:avoid}
    th{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:#666;text-align:left;font-weight:600;padding:5px 7px;border-bottom:1.5px solid #333}
    td{padding:6px 7px;border-bottom:1px solid #e4e4e4;vertical-align:top}tbody tr:nth-child(even) td{background:#fafafa}
    td.gw{width:27%}.din{display:inline-block;font-size:8.5px;font-weight:700;background:#f1efed;border-radius:calc(3px*var(--rk,1));padding:0 5px;margin-bottom:2px;color:#444}
    .gt{font-weight:600}.sub{color:#777;font-size:9px}.fn{font-weight:700}.nf{color:#b0b0b0;font-style:italic}.c1{font-weight:600}.ml{color:#1f5fa8}
    .kt{width:17%}.ein{width:22%}.nt{width:12%;color:#444}
    .pill{display:inline-block;border-radius:calc(9px*var(--rk,1));padding:1px 8px;font-weight:600;font-size:9px;white-space:nowrap}
    .tl{position:relative;height:7px;background:#f0f0f0;border-radius:calc(3px*var(--rk,1));margin-top:4px;overflow:hidden}.tl i{position:absolute;top:0;bottom:0;width:1px;background:#fff}
    .tl b{position:absolute;top:0;bottom:0;border-radius:calc(3px*var(--rk,1))}
    .tl.hd{background:none;height:12px;overflow:visible;margin:0}.tl.hd i{background:#ccc;top:8px}.tl.hd span{position:absolute;top:-1px;font-size:8px;color:#888;padding-left:2px;text-transform:none;letter-spacing:0}
    .foot{margin-top:10px;color:#888;font-size:8.5px;display:flex;gap:14px;flex-wrap:wrap}.foot span{display:inline-flex;align-items:center;gap:4px}
    </style></head><body>
    <div class="top"><div><div class="k">Gewerke und Firmen</div><h1>${esc(P.name)}</h1><div class="meta">Bauzeit ${fmtD(ps)} – ${fmtD(pe)} · Stand ${stand}</div></div>
      <div class="kpi"><div><b>${rows.length}</b><span>Gewerke</span></div><div><b>${withFirm}</b><span>mit Firma</span></div><div><b>${booked}</b><span>beauftragt</span></div></div></div>
    <table><thead><tr><th>Gewerk nach DIN (VOB/C) · Unternehmer:in</th><th>Firma</th><th>Kontakt</th><th>Vergabe</th><th>Einsatz im Plan${ticks.length ? head : ''}</th><th>Notiz</th></tr></thead>
    <tbody>${rows.map(rowHtml).join('')}</tbody></table>
    <div class="foot">${Object.entries(ST).map(([k, c]) => `<span><span class="pill" style="background:${c[0]};color:${c[1]}">${esc((VERGABE.find((x) => x[0] === k) || ['', k])[1])}</span></span>`).join('')}<span>Balken: Einsatzzeitraum im Bauzeitenplan (${fmtD(ps)} – ${fmtD(pe)})</span></div>
    <script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);
  w.document.close();
}

// Ereignisse
$('#firmView').addEventListener('change', (e) => {
  const t = e.target, tr = t.closest('tr'); if (!tr) return;
  if (tr.dataset.gw != null) {
    const gw = tr.dataset.gw;
    if (t.dataset.f === 'firm') { setTradeFirm(gw, t.value); renderFirms(); return; }
    if (t.dataset.f === 'dint') {   // Auswahl über den Namen des Leistungsbereichs; eine DIN-Nummer geht auch
      if (t.value.trim() === dinTitle(dinOf(gw))) return;
      const v = t.value.trim(), a = (window.DIN_ATV || []).find((x) => x[1].toLowerCase() === v.toLowerCase()) || (window.DIN_ATV || []).find((x) => v && x[1].toLowerCase().startsWith(v.toLowerCase()));
      const num = /\d{5}/.test(v) ? v.replace(/^din\s*/i, '') : a ? a[0] : v ? null : '';
      if (num == null) { toast('Leistungsbereich nicht gefunden – bitte aus der Liste wählen.', true); renderFirms(); return; }
      act(() => { P.trades = { ...(P.trades || {}) }; P.trades[gw] = { ...tradeOf(gw), din: num }; }); renderFirms(); return;
    }
    if (t.dataset.f === 'din') { const v = t.value.trim().replace(/^din\s*/i, ''); act(() => { P.trades = { ...(P.trades || {}) }; P.trades[gw] = { ...tradeOf(gw), din: v }; }); renderFirms(); return; }
    if (t.dataset.f === 'craft') { const v = t.value.trim(), old = craftOf(gw); act(() => { P.trades = { ...(P.trades || {}) }; P.trades[gw] = { ...tradeOf(gw), craft: v }; for (const x of P.tasks) if (x.gw === gw && x.res && x.res === old && old !== v) x.res = v; }); renderFirms(); return; }
    if (t.dataset.f === 'status' || t.dataset.f === 'note') {
      // ohne Neuaufbau der Tabelle – sonst schließt sich eine geöffnete Auswahlliste sofort wieder
      const v = t.value; window.fvSkip = true;
      try { act(() => { P.trades = { ...(P.trades || {}) }; P.trades[gw] = { ...tradeOf(gw), [t.dataset.f]: v }; }); } finally { window.fvSkip = false; }
      if (t.dataset.f === 'status') tr.className = v ? 'st-' + v : '';
      return;
    }
    if (t.dataset.c) { const f = firmById(tradeOf(gw).firm); if (f) { f[t.dataset.c] = t.value; saveFirmsSoon(); renderFirms(); } return; }
  }
  if (tr.dataset.fid) {
    const f = firmById(tr.dataset.fid); if (!f || !t.dataset.dc) return;
    if (t.dataset.dc === 'gewerke') f.gewerke = t.value.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
    else if (t.dataset.dc === 'name') {
      const old = f.name, nn = t.value.trim() || old; f.name = nn;
      if (nn !== old) act(() => { for (const x of P.tasks) if (x.res === old) x.res = nn; });   // Unternehmer im geöffneten Projekt mit umbenennen
    } else f[t.dataset.dc] = t.value;
    saveFirmsSoon(); renderFirms();
  }
});
$('#firmView').addEventListener('input', (e) => { if (e.target.id === 'fvQ') { fvQuery = e.target.value; const pos = e.target.selectionStart; renderFirms(); const q = $('#fvQ'); q.focus(); q.setSelectionRange(pos, pos); } });
$('#firmView').addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('fv-book')) fvBookOpen = e.target.open; }, true);
$('#firmView').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); });
$('#firmView').addEventListener('click', (e) => {
  const t = e.target;
  if (t.dataset.take) { const gw = t.closest('tr').dataset.gw; setTradeFirm(gw, t.dataset.take); renderFirms(); return; }
  if (t.dataset.rm) { const gw = t.dataset.rm; act(() => { P.trades = { ...(P.trades || {}) }; delete P.trades[gw]; }); renderFirms(); return; }
  if (t.dataset.del) {
    if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Löschen?'; t.classList.add('sure'); setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = '✕'; t.classList.remove('sure'); } }, 3000); return; }
    const id = t.dataset.del;
    // gleiche Regel in allen Apps: nur löschen, was nirgends verwendet wird – hier im Plan zuerst beim Gewerk entfernen
    const inPlan = Object.entries(P.trades || {}).filter(([, x]) => x.firm === id).map(([k]) => k);
    if (inPlan.length) { toast(`Die Firma ist in diesem Plan bei ${inPlan.join(', ')} eingetragen – dort zuerst entfernen, dann löschen.`, true); renderFirms(); return; }
    FIRMS = FIRMS.filter((f) => f.id !== id); FIRMS_DEL.push(id); saveFirmsSoon();
    renderFirms(); return;
  }
  if (t.dataset.a === 'firm-new') { fvBookOpen = true; FIRMS.push({ id: newFirmId(), name: 'Neue Firma', gewerke: [], contact: '', phone: '', mobile: '', mail: '', address: '', note: '' }); saveFirmsSoon(); fvQuery = ''; renderFirms(); const inp = $('#firmView').querySelector(`tr[data-fid="${FIRMS[FIRMS.length - 1].id}"] input`); if (inp) { inp.focus(); inp.select(); } }
});

// Firmenvorschläge: Firmen mit passendem Gewerk aus dem Adressbuch zuerst (auch „Heizung“ ↔ „Heizung Sanitär“)
const gwNorm = (s) => String(s || '').toLowerCase().replace(/[^a-zäöüß0-9]+/g, ' ').trim();
function firmGwScore(f, gw) {
  const g = gwNorm(gw); if (!g) return 0;
  let best = 0;
  for (const x of (f.gewerke || [])) {
    const n = gwNorm(x); if (!n) continue;
    if (n === g) return 3;
    if (n.split(' ').includes(g) || g.split(' ').includes(n)) best = Math.max(best, 2);
    else if (n.includes(g) || g.includes(n)) best = Math.max(best, 1);
  }
  return best;
}
function firmOptions(gw) {
  const fs = FIRMS.map((f) => [f, firmGwScore(f, gw)]).sort((a, b) => (b[1] - a[1]) || a[0].name.localeCompare(b[0].name, 'de'));
  return fs.map(([f, sc]) => `<option value="${esc(f.name)}">${sc ? '★ ' : ''}${esc((f.gewerke || []).join(', '))}</option>`).join('');
}
function updateResList(i) {
  let dl = document.getElementById('resList');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'resList'; document.body.appendChild(dl); }
  dl.innerHTML = firmOptions(P.tasks[i] ? P.tasks[i].gw : '');
}
// Alle anderen Firmenfelder (Katalog, Projekt-Firmen, Gewerke-Liste): Gewerk der Zeile ermitteln und die Liste danach ordnen
const FIRM_LISTS = ['fvFirmList', 'fvFirmList2', 'firmSugList'];
document.addEventListener('focusin', (e) => {
  const el = e.target; if (!el.matches || !el.matches('input[list]') || !FIRM_LISTS.includes(el.getAttribute('list'))) return;
  const tr = el.closest('tr');
  const gw = el.dataset.gw || (tr && (tr.dataset.gw || tr.querySelector('[data-pgw],[data-k="gw"],[data-f="gw"]')?.value)) || '';
  let dl = document.getElementById('firmSugList');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'firmSugList'; document.body.appendChild(dl); }
  dl.innerHTML = firmOptions(gw); el.setAttribute('list', 'firmSugList');
});
loadFirms();

/* Klick auf das Farbkästchen eines Gewerks: Farbzuordnung (Gewerke & Farben) mit dieser Zeile öffnen */
$('#firmView').addEventListener('click', (e) => { const d = e.target.closest('.fv-dot'); if (!d) return; const tr = d.closest('tr[data-gw]'); if (tr) gwDialog(tr.dataset.gw); });
