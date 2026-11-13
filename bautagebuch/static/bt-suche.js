/* Bautagebuch – Suche, Datensicherung, Versionen des Berichts, Vorschlagslisten, Adress-Ergänzung.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
let sr = {q: '', scope: 'all', res: null, T: 0};
const mark = parts => parts.map(([t, h]) => h ? `<mark>${esc(t)}</mark>` : esc(t)).join('');
function renderSearch(box) {
  const p = curProject();
  box.innerHTML = `<div class="wrap"><div class="cform" style="max-width:760px"><h3>Suche${sr.q ? ` nach „${esc(sr.q)}“` : ''} <button class="bd" data-act="srZu" style="float:right;font-size:.85rem">✕ Schließen</button></h3>
    <div class="chips w"><button class="chip ${sr.scope === 'all' ? 'on' : ''}" data-act="srScope" data-k="all">Alle Projekte</button>${p ? `<button class="chip ${sr.scope === 'one' ? 'on' : ''}" data-act="srScope" data-k="one">Nur ${esc(p.name)}</button>` : ''}</div>
    <div class="info w">Durchsucht Projekte, Berichte (Datum, Bauleitung, Wetter), Mängel, Notizen, Anwesende, Weisungen, Zu erledigen, Fotobeschreibungen und Kontakte. Alle Wörter müssen vorkommen; Groß-/Kleinschreibung und Umlaute spielen keine Rolle („haeser“ findet „Häser“).</div>
    <div id="srl" class="w audl"></div></div></div>`;
  fillSearch();
}
async function doSearch() {
  const q = sr.q.trim(); if (!q) { sr.res = null; return fillSearch(); }
  const r = await api('api/search?q=' + encodeURIComponent(q) + (sr.scope === 'one' && pid ? '&project_id=' + pid : ''));
  if (q !== sr.q.trim()) return; sr.res = r.results || []; sr.trunc = r.truncated; fillSearch();
}
function fillSearch() {
  const b = $('#srl'); if (!b) return;
  if (sr.res === null) { b.style.display = 'none'; return; }
  b.style.display = '';
  b.innerHTML = sr.res.length ? sr.res.map(x => `<button class="ar sr" data-act="goHit" data-p="${x.project_id || ''}" data-r="${x.report_id || ''}" data-c="${x.contact_id || ''}"><div class="at">${esc(x.type)}${x.date ? '<br>' + fmt(x.date) : ''}</div><div class="aa"><span class="ad">${mark(x.snip)}</span><small>${esc([x.project && x.project + (x.archived ? ' (archiviert)' : ''), x.report].filter(Boolean).join(' · '))}</small></div></button>`).join('')
    + (sr.trunc ? '<div class="empty">Es werden nur die ersten 150 Treffer gezeigt – bitte genauer suchen.</div>' : '') : '<div class="empty">Nichts gefunden.</div>';
}
async function goHit(b) {
  if (b.dataset.c) { cid = +b.dataset.c; cfrom = null; tab = 'kontakte'; return renderDetail(); }
  if (!b.dataset.p) return;
  tab = 'bericht'; await openProject(+b.dataset.p);
  if (b.dataset.r && reports.some(x => x.id === +b.dataset.r)) { rid = +b.dataset.r; wxEdit = headEdit = false; renderDetail(); }
}
/* Protokoll und „Alte PDFs aufräumen“ stehen jetzt in der Verwaltung → System */
const fsize = b => b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
/* ---------- Versionsverlauf der Berichte ---------- */
let verOpen = false, verData = null, verView = null, verSnap = null;
const dt = iso => { const d = new Date(String(iso).replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'}) + ' ' + d.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'}); };
async function loadVer() {
  const my = rid; if (!my) return;
  try { const v = await api(`api/reports/${my}/versions`); if (my !== rid) return; verData = v; } catch { return; }
  fillVer();
}
function verSummary(snap) {
  const r = snap.report, byKind = {};
  snap.items.forEach(i => (byKind[i.kind] = byKind[i.kind] || []).push(i));
  const head = [['Datum', fmt(r.date)], ['Uhrzeit', r.time], ['Bauleitung', r.site_manager], ['Wetter', [r.weather, r.precip, r.temp && r.temp + ' °C'].filter(Boolean).join(', ')]].filter(x => x[1]).map(x => `${x[0]}: ${esc(x[1])}`).join(' · ');
  const secs = meta.sections.filter(x => x.type === 'list' && byKind[x.key]).map(x => `<b>${esc(x.title)}</b><ul>${byKind[x.key].map(i => `<li>${esc(i.text)}${i.activity ? ' – ' + esc(i.activity) : ''}${i.headcount != null && i.headcount !== '' ? ' (' + esc(i.headcount) + ')' : ''}</li>`).join('')}</ul>`).join('');
  return `<div class="vsum">${head}<br>${secs}<small>${snap.images.length} Foto(s)</small></div>`;
}
function fillVer() {
  const box = $('#vbox'); if (!box || !verData) return;
  const v = verData, ex = v.last_export, n = v.versions.length;
  const stat = v.status === 'never' ? `<span class="vs no">Noch nicht als PDF exportiert</span>`
    : v.status === 'exported' ? `<span class="vs ok" title="${esc(ex.pdf_name)} · ${dt(ex.created)}">✓ Als PDF exportiert<span class="vl-lang">: ${esc(ex.pdf_name)} · ${dt(ex.created)}</span></span>`
    : `<span class="vs chg" title="letzter Export: ${esc(ex.pdf_name)} · ${dt(ex.created)}">Seit dem Export geändert<span class="vl-lang"> – letzter Export: ${esc(ex.pdf_name)} · ${dt(ex.created)}</span></span>`;
  const label = x => x.reason === 'export' ? `PDF exportiert: <b>${esc(x.pdf_name)}</b>` : x.reason === 'before_restore' ? 'Stand vor einer Wiederherstellung' : 'Änderung gespeichert';
  const list = verOpen ? `<div class="vlist">${n ? v.versions.map(x => `<div class="vrow ${x.reason}"><div class="vt"><span>${dt(x.created)}${x.user_name ? ' · ' + esc(x.user_name) : ''}</span><span>${label(x)}</span></div>
      <div class="va"><button data-act="verView" data-id="${x.id}">${verView === x.id ? 'Zuklappen' : 'Ansehen'}</button><button data-act="restoreVer" data-id="${x.id}" data-arm="Wiederherstellen? Nochmal tippen" title="Bericht auf diesen Stand zurücksetzen (Fotos bleiben)">Wiederherstellen</button></div>
      ${verView === x.id ? (verSnap ? verSummary(verSnap) : '<div class="vsum">lädt …</div>') : ''}</div>`).join('') : '<div class="vsum">Noch keine Versionen. Sie entstehen automatisch nach Änderungen und bei jedem PDF-Export.</div>'}</div>` : '';
  box.innerHTML = `<div class="vline">${stat}<button data-act="verToggle" class="vbtn">${ic('clock', 16, 2.4)} Verlauf (${n})</button></div>${list}`;
}
/* ---------- Projekt (Stammdaten) ---------- */
const clientOpts = () => contacts.filter(c => /bauherr/i.test(c.trade || '')).map(c => [c.name, [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', '));   // Kontakte mit Gewerk „Bauherr/Bauherrin“
const clientList = () => `<datalist id="dl-client">${clientOpts().map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
const tradeOpts = () => {   // Gewerke aus dem Verlauf: bereits vergebene, häufigste zuerst (Schreibweise der ersten Verwendung)
  const m = new Map();
  for (const c of contacts) { const t = (c.trade || '').trim(); if (!t) continue; const k = t.toLowerCase(), e = m.get(k); e ? e.n++ : m.set(k, {t, n: 1}); }
  return [...m.values()].sort((a, b) => b.n - a.n || a.t.localeCompare(b.t, 'de')).map(e => e.t);
};
const tradeList = () => `<datalist id="dl-trade">${tradeOpts().map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
const listAttr = k => ({client: ' list="dl-client"', trade: ' list="dl-trade"', zip: ' list="dl-zip"', city: ' list="dl-city"', co_zip: ' list="dl-zip"', co_city: ' list="dl-city"'})[k] || '';
const addrLists = () => {   // Orte und PLZ aus dem Verlauf (Kontakte, Projekte, Firmendaten), häufigste zuerst – funktioniert offline
  const cnt = (arr) => { const m = new Map(); for (const v of arr) { const t = (v || '').trim(); if (t) m.set(t, (m.get(t) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de')).map(x => x[0]); };
  const all = [...contacts, ...projects, {zip: settings.co_zip, city: settings.co_city}];
  return `<datalist id="dl-zip">${cnt(all.map(x => x.zip)).map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist><datalist id="dl-city">${cnt(all.map(x => x.city)).map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
};
let addrBusy = false;
async function addrComplete(el) {   // PLZ ↔ Ort und Straße → PLZ/Ort ergänzen (nur leere Felder): erst Verlauf, dann Netz
  const key = (el.dataset.dp || el.dataset.pf || el.dataset.cf || el.dataset.st || '').replace(/^co_/, '');
  if (!['street', 'zip', 'city'].includes(key) || addrBusy) return;
  const root = el.closest('.cform'); if (!root) return;
  const f = k => root.querySelector(`[data-dp="${k}"],[data-pf="${k}"],[data-cf="${k}"],[data-st="co_${k}"]`);
  const st = f('street'), zp = f('zip'), ct = f('city'); if (!zp || !ct) return;
  const v = x => (x?.value || '').trim();
  if ((v(zp) && v(ct)) || (!v(zp) && !v(ct))) return;
  addrBusy = true;
  try {
    const r = await api('api/address/complete?street=' + encodeURIComponent(v(st)) + '&zip=' + encodeURIComponent(v(zp)) + '&city=' + encodeURIComponent(v(ct)));
    const done = [];
    for (const [k, inp] of [['zip', zp], ['city', ct]]) {
      if (r && r[k] && !v(inp)) { inp.value = r[k]; inp.dispatchEvent(new Event('input', {bubbles: true})); inp.dispatchEvent(new Event('change', {bubbles: true})); done.push(k === 'zip' ? 'PLZ ' + r[k] : r[k]); }
    }
    if (done.length) toast('Ergänzt: ' + done.join(', ') + (r.source === 'netz' ? ' (aus dem Netz – bitte prüfen)' : ' (aus deinen Daten)'));
  } catch {} finally { addrBusy = false; }
}
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('input')) setTimeout(() => addrComplete(e.target), 300); });
/* ---------- Adressvorschläge beim Tippen in „Straße“ (wie bei Paketdiensten) ---------- */
let adrT = 0, adrQ = '';
const adrKey = el => (el.dataset.dp || el.dataset.pf || el.dataset.cf || el.dataset.st || '').replace(/^co_/, '');
function adrClose() { document.querySelectorAll('.adrsug').forEach(n => n.remove()); }
function adrSuggest(el) {
  clearTimeout(adrT); const root = el.closest('.cform'), q = el.value.trim();
  if (q.length < 3 || !root) return adrClose();
  const f = k => root.querySelector(`[data-dp="${k}"],[data-pf="${k}"],[data-cf="${k}"],[data-st="co_${k}"]`);
  const full = [q, (f('zip')?.value || '').trim(), (f('city')?.value || '').trim()].filter(Boolean).join(' '); adrQ = full;
  adrT = setTimeout(async () => {
    const p = typeof curProject === 'function' ? curProject() : null, ref = p && hasPos(p) ? p : here, near = ref ? `&lat=${ref.lat}&lon=${ref.lon}` : '';
    let items = []; try { const r = await api('api/address/suggest?q=' + encodeURIComponent(full) + near); items = Array.isArray(r.items) ? r.items : []; } catch {}
    if (full !== adrQ || document.activeElement !== el) return;
    adrClose(); if (!items.length) return;
    sugC = items;
    const box = document.createElement('div'); box.className = 'adrsug sugc w';
    box.innerHTML = items.map((x, i) => `<button type="button" class="pi" data-act="adrPick" data-i="${i}"><span class="l"><b>${esc(x.street)}</b><small>${esc([x.zip, x.city].filter(Boolean).join(' ') + (x.km != null ? ' · ' + (x.km < 1 ? '< 1' : Math.round(x.km)) + ' km' : ''))}</small></span></button>`).join('');
    (el.closest('label') || el).insertAdjacentElement('afterend', box);
  }, 300);
}
function adrPick(i) {
  const x = sugC[i]; if (!x) return; const el = document.activeElement && document.activeElement.matches('input') ? document.activeElement : document.querySelector('[data-dp=street],[data-pf=street],[data-cf=street],[data-st=co_street]');
  const root = (el && el.closest('.cform')) || document;
  const set = (k, v) => { const inp = root.querySelector(`[data-dp="${k}"],[data-pf="${k}"],[data-cf="${k}"],[data-st="co_${k}"]`); if (inp && v != null) { inp.value = v; inp.dispatchEvent(new Event('input', {bubbles: true})); inp.dispatchEvent(new Event('change', {bubbles: true})); } };
  adrClose(); set('street', x.street); set('zip', x.zip); set('city', x.city);
}
document.addEventListener('input', e => { const el = e.target; if (el.matches && el.matches('input') && adrKey(el) === 'street' && el.closest('.cform')) adrSuggest(el); });
document.addEventListener('focusout', e => { if (e.target.matches && e.target.matches('input') && adrKey(e.target) === 'street') setTimeout(adrClose, 200); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') adrClose(); });
