'use strict';
/* =====================================================================
   Reiter „Leistungskatalog“
   Eigene Leistungen projektübergreifend anlegen (Server: library.json) oder aus
   vorhandenen Projekten übernehmen. Sie erscheinen im Planungsassistenten im
   jeweiligen Abschnitt; empfohlene für einen Gebäudetyp sind dort vorausgewählt.
   Gewerk, DIN, Unternehmerbezeichnung und Firma wirken wie im Reiter
   „Gewerke & Firmen“: beim Einfügen wird die Firma des Gewerks eingetragen.
   ===================================================================== */
window.LIBRARY = [];
let libLoaded = false, libSaveT = null, libQuery = '', libStd = LS.get('libStd2', true), libDelAsk = null, libFocus = null, libPrjOpen = LS.get('libPrj', true), libPrjEmpty = false;
const libSg = {};   // Vorschlagsleisten je Katalog-Leistung
let CATFIRMS = {}, catfSaveT = null, libSub = LS.get('libSub', 'alle');
const newLibId = () => 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const libPhases = () => CATALOG.phases;
const libPhName = (k) => (CATALOG.phases.find((p) => p.k === k) || {}).n || k;

/* ---------- Abschnitte: Reihenfolge, Namen, eigene Abschnitte (für alle Projekte) ---------- */
const PH_STD = CATALOG.phases.map((p) => ({ k: p.k, n: p.n }));
function applyPhaseList(saved) {
  const std = new Map(PH_STD.map((p) => [p.k, p])), out = [], seen = new Set();
  for (const x of saved || []) { if (seen.has(x.k) || (!x.own && !std.has(x.k))) continue; seen.add(x.k); out.push({ k: x.k, n: x.n || (std.get(x.k) || {}).n || x.k, own: !!x.own }); }
  PH_STD.forEach((p, i) => { if (seen.has(p.k)) return; const prev = i ? out.findIndex((x) => x.k === PH_STD[i - 1].k) : -1; out.splice(prev + 1, 0, { ...p }); seen.add(p.k); });
  CATALOG.phases.splice(0, CATALOG.phases.length, ...out);
}
let phSaveT = null;
function savePhases() {
  clearTimeout(phSaveT);
  phSaveT = setTimeout(() => fetch('api/phases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CATALOG.phases.map((p) => ({ k: p.k, n: p.n, own: !!p.own }))) }).then(j)
    .catch((e) => toast('Abschnitte nicht gespeichert: ' + e.message, true)), 300);
  if (window.AssistCore) AssistCore.notifySoon();
}
async function loadLibrary() {
  try { const [a, b, ph, sc] = await Promise.all([fetch('api/library').then(j), fetch('api/catfirms').then(j), fetch('api/phases').then(j), fetch('api/catscope').then(j).catch(() => ({}))]); window.LIBRARY = a; CATFIRMS = b || {}; window.CATSCOPE = sc || {}; applyPhaseList(ph); libLoaded = true; }
  catch (e) { toast('Leistungskatalog konnte nicht geladen werden: ' + e.message, true); }
  if (window.AssistCore) AssistCore.notifySoon();
  if (!$('#libView').hidden) renderLib();
}
function libSet(list, now) {
  window.LIBRARY = list;   // immer neues Array – der Assistent erkennt Änderungen an der Identität
  if (window.AssistCore) AssistCore.notifySoon();
  clearTimeout(libSaveT);
  const run = () => fetch('api/library', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(window.LIBRARY) }).then(j)
    .catch((e) => { toast('Leistungskatalog nicht gespeichert: ' + e.message, true); throw e; });
  if (now) return run();
  libSaveT = setTimeout(run, 500); return Promise.resolve();
}
// Bezug der Standardleistungen (Gebäude / je Einheit) – Vorgabe für neue Planungen im Assistenten
let catsSaveT = null;
function saveCatScope() {
  clearTimeout(catsSaveT);
  catsSaveT = setTimeout(() => fetch('api/catscope', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(window.CATSCOPE || {}) }).then(j)
    .catch((e) => toast('Bezug nicht gespeichert: ' + e.message, true)), 300);
}
const stdScope = (i) => ((window.CATSCOPE || {})[i.id] || i.sc);
function saveCatFirms() {
  clearTimeout(catfSaveT);
  catfSaveT = setTimeout(() => fetch('api/catfirms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CATFIRMS) }).then(j)
    .catch((e) => toast('Firmen-Vorgaben nicht gespeichert: ' + e.message, true)), 400);
}
// Stammfirma eines Gewerks: Firma im Adressbuch, bei der das Gewerk eingetragen ist
function gwFirm(gw) {
  if (!gw || typeof FIRMS === 'undefined') return '';
  const g = gw.toLowerCase(), l = FIRMS.filter((f) => (f.gewerke || []).some((x) => x.toLowerCase() === g)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return l.length ? l[0].name : '';
}
const gwFirmCount = (gw) => (typeof FIRMS === 'undefined' || !gw ? 0 : FIRMS.filter((f) => (f.gewerke || []).some((x) => x.toLowerCase() === gw.toLowerCase())).length);
// Vorgabe für alle Projekte: eigene Angabe je Leistung, sonst Stammfirma des Gewerks
function libFirmFor(id, gw) {
  const own = (window.LIBRARY.find((x) => x.id === id) || {}).firm || CATFIRMS[id] || '';
  return own ? { name: own, own: true } : { name: gwFirm(gw), own: false };
}
window.Library = {
  firmFor: libFirmFor,
  async add(it) { const x = libClean({ ...it, id: it.id || newLibId() }); await libSet([...window.LIBRARY, x], true); if (!$('#libView').hidden) renderLib(); return x; },
};
function libClean(x) {
  return { id: x.id || newLibId(), n: String(x.n || 'Leistung'), ph: x.ph || 'ausbau', gw: x.gw || '', din: x.din || '', craft: x.craft || '', firm: x.firm || '',
    sc: x.sc === 'bau' ? 'bau' : 'we', d: Math.max(1, Math.round(+x.d) || 1), a: x.a || [], b: x.b || [], rec: x.rec || [], info: x.info || '', src: x.src || '', from: x.from || '' };
}
// wahrscheinlicher Abschnitt zu Gewerk/Bezeichnung
function libGuessPh(n, gw) {
  try { if (typeof builtinPlace === 'function') { const r = builtinPlace(n, AssistCore.items({ type: 'frei' }), ''); if (r && !/keine ähnliche/.test(r.why)) return r.ph; } } catch { /* Stichworte unten */ }
  const s = String(n || '').toLowerCase();
  const kw = [['abbruch', 'abbruch'], ['rückbau', 'abbruch'], ['entkern', 'abbruch'], ['aushub', 'erd'], ['fundament', 'erd'], ['dach', 'huelle'], ['fassade', 'huelle'], ['fenster', 'huelle'], ['gerüst', 'huelle'],
    ['rohinstall', 'tga_roh'], ['feininstall', 'tga_fein'], ['montage objekte', 'tga_fein'], ['garten', 'aussen'], ['pflaster', 'aussen'], ['zaun', 'aussen'], ['reinigung', 'abschluss'], ['abnahme', 'abschluss']];
  for (const [k, ph] of kw) if (s.includes(k)) return ph;
  const it = CATALOG.items.find((i) => i.gw === gw); return it ? it.ph : 'ausbau';
}
const libDinFor = (gw, n) => (typeof GW_DIN !== 'undefined' && GW_DIN[gw]) || ((AssistCore.dinSuggest(n)[0] || {}).din) || '';

function libPredOpts(cur, selfId) {
  const groups = libPhases().map((p) => {
    const its = [...CATALOG.items.filter((i) => i.ph === p.k && !i.ms), ...window.LIBRARY.filter((x) => x.ph === p.k && x.id !== selfId)];
    return its.length ? `<optgroup label="${esc(p.n)}">${its.map((i) => `<option value="${i.id}"${cur === i.id ? ' selected' : ''}>${esc(i.n)}</option>`).join('')}</optgroup>` : '';
  }).join('');
  return groups;
}
function renderLib() {
  const box = $('#libView'); if (!box) return;
  const sc = box.querySelector('.fv-scroll'), st = sc ? sc.scrollTop : 0;
  const q = libQuery.trim().toLowerCase();
  const hit = (x) => !q || [x.n, x.gw, x.din, x.craft, x.firm].join(' ').toLowerCase().includes(q);
  const L = window.LIBRARY, profs = CATALOG.profiles.filter((p) => p.k !== 'frei');
  const sub = libSub === 'abs' ? 'abs' : P && libSub === 'prj' ? 'prj' : 'alle';
  let h = `<div class="fv"><nav class="lv-sub"><button class="lv-st${sub === 'alle' ? ' on' : ''}" data-lsub="alle">Vorgaben für alle Projekte</button>${P ? `<button class="lv-st${sub === 'prj' ? ' on' : ''}" data-lsub="prj">Projekt: ${esc(P.name)}</button>` : ''}<button class="lv-st${sub === 'abs' ? ' on' : ''}" data-lsub="abs">Abschnitte</button></nav>`;
  if (sub === 'abs') { box.innerHTML = h + libPhasesHtml() + '</div>'; libAfter(box, st); return; }
  if (sub === 'prj') { box.innerHTML = h + `<div class="fv-head"><div><h3>Firmen im Projekt</h3><span>${esc(P.name)}</span></div><input id="libQ" class="lv-q" placeholder="Suchen …" value="${esc(libQuery)}"><span class="fv-hint">Gilt nur für dieses Projekt. Rechts in jeder Zeile: „← Vorgabe übernehmen“ trägt die Firma aus der Vorgabe ein, „↑ als Vorgabe speichern“ macht die Projekt-Firma zur Vorgabe für alle Projekte.</span></div><div class="fv-scroll">${libProjectHtml()}</div></div>` + libLists(); libAfter(box, st); return; }
  h += `<div class="fv-head"><div><h3>Leistungskatalog</h3><span>${L.length} eigene Leistungen · Firmen-Vorgaben für alle Projekte</span></div>
    <input id="libQ" class="lv-q" placeholder="Suchen …" value="${esc(libQuery)}">
    <span class="fv-hint"><b>Firma</b>: Vorgabe für alle neuen Planungen – grau = Stammfirma des Gewerks aus dem Adressbuch, eigener Eintrag gilt nur für diese Leistung. Eigene Leistungen erscheinen im Planungsassistenten im gewählten Abschnitt – unter „Weitere Leistungen“ oder, wenn unter <b>Vorausgewählt bei</b> die Projektart markiert ist, dort gleich angekreuzt. Gewerk, Unternehmer und Firma werden beim Einfügen wie im Reiter „Gewerke &amp; Firmen“ übernommen.</span></div>
    <div class="fv-scroll"><table class="fv-t lv-t" data-tk="lv-alle"><thead><tr><th style="min-width:250px">Leistung</th><th>Abschnitt</th><th style="min-width:120px">Gewerk</th><th>DIN</th><th style="min-width:140px">Unternehmer</th><th style="min-width:140px">Firma</th><th>Bezug</th><th class="num">AT</th><th style="min-width:170px">Folgt auf</th><th style="min-width:150px">Muss fertig sein vor</th><th style="min-width:130px" title="Bei welchen Projektarten der Planungsassistent diese Leistung von sich aus ankreuzt. Symbol anklicken = ein/aus. Bei allen anderen Projektarten steht sie zur Auswahl, ist aber nicht angekreuzt.">Vorausgewählt bei</th><th></th></tr></thead><tbody>`;
  let shown = 0;
  for (const ph of libPhases()) {
    const own = L.filter((x) => x.ph === ph.k && hit(x));
    const std = libStd ? CATALOG.items.filter((i) => i.ph === ph.k && !i.ms && hit(i)) : [];
    if (!own.length && !std.length && q) continue;   // leere Abschnitte zeigen – dort kann man Leistungen anlegen
    h += `<tr class="lv-ph"><td colspan="12">${esc(ph.n)}<button class="btn sm" data-lnew="${ph.k}" title="Neue Leistung in diesem Abschnitt">＋ Leistung</button></td></tr>`;
    for (const x of own) {
      shown++;
      const dt = typeof dinTitle === 'function' ? dinTitle(x.din) : '';
      h += `<tr data-lid="${x.id}"><td><div class="lv-n"><span class="gwdot" style="background:${gwColor(x.gw) || '#9e9e9e'}"></span><input data-k="n" value="${esc(x.n)}"></div>${x.src ? `<small class="lv-src">aus: ${esc(x.src)}</small>` : ''}</td>
        <td><select data-k="ph">${libPhases().map((p) => `<option value="${p.k}"${p.k === x.ph ? ' selected' : ''}>${esc(p.n.split(' (')[0])}</option>`).join('')}</select></td>
        <td><input data-k="gw" list="lvGwList" value="${esc(x.gw)}"></td>
        <td><input data-k="din" list="fvDinList2" value="${esc(x.din)}" title="${esc(dt || 'ATV DIN-Nummer')}" style="min-width:70px"></td>
        <td><input data-k="craft" value="${esc(x.craft)}" placeholder="${esc((typeof CRAFT !== 'undefined' && CRAFT[x.gw]) || '')}"></td>
        <td><input data-k="firm" list="fvFirmList2" value="${esc(x.firm)}" placeholder="${esc(gwFirm(x.gw) ? gwFirm(x.gw) + ' (Gewerk)' : 'Firma wählen')}" class="${x.firm ? 'lv-fown' : ''}"></td>
        <td><select data-k="sc"><option value="we"${x.sc === 'we' ? ' selected' : ''}>je Einheit</option><option value="bau"${x.sc === 'bau' ? ' selected' : ''}>Gebäude</option></select></td>
        <td><input data-k="d" type="number" min="1" max="999" value="${x.d}" class="lv-d"></td>
        <td><select data-k="a"><option value="">automatisch – Ende des Abschnitts</option>${libPredOpts((x.a || [])[0], x.id)}</select></td>
        <td><select data-k="b"><option value="">–</option>${libPredOpts((x.b || [])[0], x.id)}</select></td>
        <td class="lv-rec">${profs.map((p) => `<button class="lv-pr${(x.rec || []).includes(p.k) ? ' on' : ''}" data-rec="${p.k}" title="${esc(p.n)}: ${(x.rec || []).includes(p.k) ? 'im Assistenten vorausgewählt (klicken = aus)' : 'nicht vorausgewählt (klicken = ein)'}">${p.ic}</button>`).join('')}</td>
        <td class="lv-act">${window.AiPlace && AiPlace.enabled() ? `<button class="fv-x lv-ai" data-lai="${x.id}" title="${esc(AiPlace.label())}: Abschnitt, Gewerk, DIN, Dauer und Position vorschlagen">✨</button>` : ''}<button class="fv-x" data-lplan="${x.id}" title="In das geöffnete Projekt einfügen">＋ Plan</button><button class="fv-x" data-ldup="${x.id}" title="Duplizieren">⧉</button><button class="fv-x${libDelAsk === x.id ? ' sure' : ''}" data-ldel="${x.id}" title="Aus dem Katalog löschen">${libDelAsk === x.id ? 'Löschen?' : '✕'}</button></td></tr>`
        + (libSg[x.id] && window.SugBar ? `<tr class="lv-sgrow" data-sgfor="${x.id}"><td colspan="12">${SugBar.html(libSg[x.id])}<button class="fv-x" data-sgclose="${x.id}" title="Vorschlagsleiste schließen">schließen</button></td></tr>` : '');
    }
    for (const i of std) {
      h += `<tr class="lv-std"><td><div class="lv-n"><span class="gwdot" style="background:${gwColor(i.gw) || '#9e9e9e'}"></span><span>${esc(i.n)}</span></div></td><td>${esc(ph.n.split(' (')[0])}</td><td>${esc(i.gw)}</td><td>${esc(i.din || '')}</td>
        <td>${esc((typeof CRAFT !== 'undefined' && CRAFT[i.gw]) || '')}</td><td><input data-sfirm="${i.id}" data-gw="${esc(i.gw)}" list="fvFirmList2" value="${esc(CATFIRMS[i.id] || '')}" placeholder="${esc(gwFirm(i.gw) ? gwFirm(i.gw) + ' (Gewerk)' : '–')}" class="${CATFIRMS[i.id] ? 'lv-fown' : ''}"></td><td><select data-sscope="${i.id}" class="${stdScope(i) !== i.sc ? 'lv-fown' : ''}" title="Vorgabe für neue Planungen. Standard: ${i.sc === 'bau' ? 'Gebäude' : 'je Einheit'}. In bestehenden Plänen im Planungsassistenten je Projekt umstellbar."><option value="we"${stdScope(i) === 'we' ? ' selected' : ''}>je Einheit</option><option value="bau"${stdScope(i) === 'bau' ? ' selected' : ''}>Gebäude</option></select></td><td class="num">${i.d}</td><td colspan="3" class="lv-stdh">Standardkatalog</td>
        <td class="lv-act"><button class="fv-x" data-lcopy="${i.id}" title="Als eigene Leistung kopieren und anpassen">⧉ kopieren</button></td></tr>`;
    }
  }
  if (!shown && !libStd) h += `<tr><td colspan="12" class="fv-empty">${q ? 'Keine Treffer.' : 'Noch keine eigenen Leistungen. Mit „Neue Leistung“ anlegen, mit „Aus Projekten übernehmen“ aus vorhandenen Plänen holen oder im Planungsassistenten mit „＋ eigene“ – dort ist „auch im Leistungskatalog speichern“ vorgewählt. Mit „Standardkatalog“ siehst du die mitgelieferten Leistungen und kannst sie als eigene Variante kopieren.'}</td></tr>`;
  h += '</tbody></table></div></div>' + libLists();
  box.innerHTML = h; libAfter(box, st);
}
function libLists() {
  return `<datalist id="lvGwList">${AssistCore.gewerke().map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
    <datalist id="fvFirmList2">${(typeof FIRMS !== 'undefined' ? FIRMS : []).map((f) => `<option value="${esc(f.name)}">`).join('')}</datalist>
    <datalist id="fvDinList2">${(window.DIN_ATV || []).map((x) => `<option value="${x[0]}">${esc(x[1])}</option>`).join('')}</datalist>`;
}
function libAfter(box, st) {
  if (typeof enhanceTables === 'function') enhanceTables(box);
  const sc2 = box.querySelector('.fv-scroll'); if (sc2) sc2.scrollTop = st;
  if (libFocus) { const el = box.querySelector(libFocus); if (el) { el.focus(); if (el.select) el.select(); } libFocus = null; }
  const bs = $('#btnLibStd'); if (bs) bs.classList.toggle('on', !!libStd);
}
// Firma ins Adressbuch aufnehmen bzw. Gewerk dort ergänzen
function libBook(name, gw) {
  if (!name || typeof FIRMS === 'undefined') return;
  let f = firmByName(name);
  if (!f) { FIRMS.push({ id: newFirmId(), name, gewerke: gw ? [gw] : [], contact: '', phone: '', mobile: '', mail: '', address: '', note: '' }); saveFirmsSoon(); }
  else if (gw && !(f.gewerke || []).includes(gw)) { f.gewerke = [...(f.gewerke || []), gw]; saveFirmsSoon(); }
}
const libUpd = (id, f) => libSet(window.LIBRARY.map((x) => (x.id === id ? { ...x, ...f } : x)));
function libNew(ph = 'ausbau', base) {
  const x = libClean({ n: 'Neue Leistung', ph, d: 2, sc: 'we', ...(base || {}), id: newLibId() });
  libSet([x, ...window.LIBRARY]);
  if ($('#libView').hidden) showTab('katalog');
  libFocus = `tr[data-lid="${x.id}"] input[data-k="n"]`; renderLib();
}
function libPhasesHtml() {
  const cnt = (k) => CATALOG.items.filter((i) => i.ph === k).length + window.LIBRARY.filter((x) => x.ph === k).length;
  const ph = CATALOG.phases, live = P && P.assist && P.tasks.some((t) => t.cat === '_grp');
  let h = `<div class="fv-head"><div><h3>Abschnitte</h3><span>${ph.length} Abschnitte · Reihenfolge und Namen gelten für alle Projekte</span></div>
    <span class="fv-hint">Abschnitte gliedern den Planungsassistenten und den erzeugten Plan. Reihenfolge mit ↑ ↓ oder durch Ziehen am Griff ändern, Namen direkt überschreiben. Eigene Abschnitte können gelöscht werden – ihre Leistungen wandern dann in den Abschnitt davor.</span></div>
    <div class="fv-scroll"><div class="lv-ptools"><input id="phNew" class="lv-q" placeholder="Name des neuen Abschnitts, z. B. Brandschutz"><button class="btn sm" data-phadd="1">＋ Abschnitt anlegen</button>
      <button class="btn sm" data-phreset="1" title="Reihenfolge und Namen der Standardabschnitte zurücksetzen (eigene Abschnitte bleiben, am Ende)">Standard wiederherstellen</button>
      ${live ? `<button class="btn sm" data-phplan="1" title="Leistungsgruppen im geöffneten Projekt in diese Reihenfolge bringen">Reihenfolge im Projekt „${esc(P.name)}“ anwenden</button>` : ''}</div>
    <table class="fv-t lv-t lv-abs" data-tk="lv-abs" data-nosort><thead><tr><th style="width:30px"></th><th style="width:40px" class="num">Pos.</th><th style="min-width:320px">Abschnitt</th><th>Art</th><th class="num">Leistungen</th><th></th></tr></thead><tbody>`;
  ph.forEach((p, i) => {
    h += `<tr data-phk="${p.k}" draggable="true"><td class="lv-grip" title="Ziehen, um die Position zu ändern">⠿</td><td class="num">${i + 1}</td><td><input data-phn="${p.k}" value="${esc(p.n)}"></td>
      <td class="lv-dim">${p.own ? 'eigener Abschnitt' : 'Standard'}</td><td class="num">${cnt(p.k)}</td>
      <td class="lv-act"><button class="fv-x" data-phmv="-1" ${i ? '' : 'disabled'} title="nach oben">↑</button><button class="fv-x" data-phmv="1" ${i < ph.length - 1 ? '' : 'disabled'} title="nach unten">↓</button>${p.own ? `<button class="fv-x${libDelAsk === 'ph:' + p.k ? ' sure' : ''}" data-phdel="1" title="Abschnitt löschen">${libDelAsk === 'ph:' + p.k ? 'Löschen?' : '✕'}</button>` : ''}</td></tr>`;
  });
  return h + '</tbody></table></div>';
}
function phMove(k, to) {
  const ph = CATALOG.phases, i = ph.findIndex((p) => p.k === k); if (i < 0) return;
  const [x] = ph.splice(i, 1); ph.splice(Math.max(0, Math.min(ph.length, to)), 0, x); savePhases(); renderLib();
}
// Leistungsgruppen im geöffneten Projekt nach der Abschnitts-Reihenfolge sortieren (Verknüpfungen bleiben)
function phApplyToPlan() {
  const ord = (k) => { const i = CATALOG.phases.findIndex((p) => p.k === k); return i < 0 ? 999 : i; };
  let moved = 0;
  act(() => {
    const T = P.tasks;
    const sortKids = (from, to) => {   // Geschwister im Bereich from..to (gleiche Ebene)
      const kids = []; for (let c = from; c <= to; c = blockEnd(c) + 1) kids.push([c, blockEnd(c)]);
      for (const [a, e] of kids) if (e > a) sortKids(a + 1, e);   // erst innen sortieren (Bereiche bleiben gleich lang)
      for (let k = 0; k < kids.length;) {
        if (T[kids[k][0]].cat !== '_grp') { k++; continue; }
        let m = k; while (m < kids.length && T[kids[m][0]].cat === '_grp') m++;
        const s0 = kids[k][0], e0 = kids[m - 1][1];
        const blocks = kids.slice(k, m).map(([a, e]) => T.slice(a, e + 1));
        const sorted = blocks.slice().sort((x, y) => ord(x[0].ph) - ord(y[0].ph));
        if (sorted.some((x, q) => x !== blocks[q])) { moved++; T.splice(s0, e0 - s0 + 1, ...sorted.flat()); }
        k = m;
      }
    };
    if (T.length) sortKids(0, T.length - 1);
    for (const t of T) if (t.cat === '_grp') { const p = CATALOG.phases.find((x) => x.k === t.ph); if (p && PH_STD.some((s) => s.k === t.ph && s.n === t.name)) t.name = p.n; }
  });
  toast(moved ? 'Leistungsgruppen im Projekt neu geordnet.' : 'Das Projekt hat bereits diese Reihenfolge.');
}
let phDrag = null;
$('#libView').addEventListener('dragstart', (e) => { const tr = e.target.closest && e.target.closest('tr[data-phk]'); if (!tr) return; phDrag = tr.dataset.phk; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', phDrag); } catch { /* egal */ } });
$('#libView').addEventListener('dragover', (e) => { if (!phDrag) return; const tr = e.target.closest('tr[data-phk]'); if (!tr) return; e.preventDefault(); $('#libView').querySelectorAll('.lv-drop').forEach((x) => x.classList.remove('lv-drop')); tr.classList.add('lv-drop'); });
$('#libView').addEventListener('drop', (e) => { if (!phDrag) return; e.preventDefault(); const tr = e.target.closest('tr[data-phk]'); const k = phDrag; phDrag = null; if (!tr || tr.dataset.phk === k) { renderLib(); return; } const to = CATALOG.phases.findIndex((p) => p.k === tr.dataset.phk); phMove(k, to); });
$('#libView').addEventListener('dragend', () => { phDrag = null; $('#libView').querySelectorAll('.lv-drop').forEach((x) => x.classList.remove('lv-drop')); });

function libToggleStd() { libStd = !libStd; LS.set('libStd2', libStd); renderLib(); }

/* ---------- Untertabelle: Firmen im geöffneten Projekt ---------- */
function libProjectRows() {
  const T = P.tasks, groups = new Map(), stack = [];
  T.forEach((t, i) => {
    const lvl = t.lvl || 0; stack.length = lvl;
    const sum = i + 1 < T.length && (T[i + 1].lvl || 0) > lvl;
    if (sum) { stack[lvl] = t.name; return; }
    if (!(t.dur > 0) || (t.cat && t.cat[0] === '_')) return;
    const key = t.cat ? 'c:' + t.cat : 'n:' + t.name + '|' + t.gw;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, cat: t.cat || '', name: t.name, gw: t.gw || '', idx: [], sec: stack.filter(Boolean).slice(-1)[0] || '', sd: Infinity, fd: -Infinity }));
    g.idx.push(i); if (CAL) { g.sd = Math.min(g.sd, fromW(CAL.es[i])); g.fd = Math.max(g.fd, fromW(CAL.ef[i] - 1)); }
  });
  return [...groups.values()];
}
const isCraftName = (r, gw) => !r || r === gw || (typeof CRAFT !== 'undefined' && Object.values(CRAFT).includes(r)) || (typeof craftOf === 'function' && r === craftOf(gw));
function libDefaultFor(g) { return g.cat ? libFirmFor(g.cat.split('~')[0], g.gw) : { name: gwFirm(g.gw), own: false }; }
function libProjectHtml() {
  if (!P) return '';
  const rows = libProjectRows();
  const firmOf = (g) => { const v = [...new Set(g.idx.map((i) => P.tasks[i].res || ''))]; return v.length === 1 ? v[0] : null; };
  const open = rows.filter((g) => { const f = firmOf(g); return f === null || isCraftName(f, g.gw); }).length;
  const diff = rows.filter((g) => { const f = firmOf(g), d = libDefaultFor(g).name; return d && f !== d; }).length;
  const shown = libPrjEmpty ? rows.filter((g) => { const f = firmOf(g); return f === null || isCraftName(f, g.gw); }) : rows;
  const q = libQuery.trim().toLowerCase(), list = shown.filter((g) => !q || [g.name, g.gw, ...g.idx.map((i) => P.tasks[i].res)].join(' ').toLowerCase().includes(q));
  let h = `<div class="lv-prj"><div class="lv-psum">${rows.length} Leistungen · <b>${open}</b> ohne Firma · <b>${diff}</b> abweichend von der Vorgabe</div>
    <div class="lv-ptools"><label class="cb"><input type="checkbox" id="lvPrjEmpty"${libPrjEmpty ? ' checked' : ''}> nur Leistungen ohne Firma</label>
      <button class="btn sm" data-lpall="empty" title="Bei allen Leistungen ohne Firma die Vorgabe eintragen">Vorgaben für Leistungen ohne Firma übernehmen</button>
      <button class="btn sm" data-lpall="all" title="Bei allen Leistungen die Vorgabe eintragen (auch wo schon eine Firma steht)">Alle auf Vorgabe setzen</button>
</div>
    <table class="fv-t lv-t lv-pt" data-tk="lv-prj"><thead><tr><th style="min-width:260px">Leistung</th><th>Abschnitt</th><th>Gewerk</th><th class="num">Anz.</th><th>Zeitraum</th><th style="min-width:190px">Firma im Projekt</th><th style="min-width:170px">Vorgabe (alle Projekte)</th><th>Telefon</th><th>Vorgabe</th></tr></thead><tbody>`;
  for (const g of list) {
    const f = firmOf(g), d = libDefaultFor(g), cur = f && !isCraftName(f, g.gw) ? f : '', book = cur && typeof firmByName === 'function' ? firmByName(cur) : null;
    const same = d.name && cur === d.name;
    h += `<tr data-lpk="${esc(g.key)}"><td><div class="lv-n"><span class="gwdot" style="background:${gwColor(g.gw) || '#9e9e9e'}"></span><span>${esc(g.name)}</span></div></td><td>${libSecSelect(g)}</td><td><input data-pgw="1" list="lvGwList" value="${esc(g.gw)}" placeholder="Gewerk"></td><td class="num">${g.idx.length}</td>
      <td class="lv-dim" style="white-space:nowrap" data-sort="${isFinite(g.sd) ? String(g.sd).padStart(8, '0') : ''}">${isFinite(g.sd) ? (g.sd === g.fd ? fmtD(g.sd) : fmtShort(g.sd) + ' – ' + fmtD(g.fd)) : ''}</td>
      <td><input data-pfirm="1" list="fvFirmList2" value="${esc(f === null ? '' : cur)}" placeholder="${f === null ? 'verschieden – neu setzen' : 'keine Firma'}" class="${!cur ? 'lv-miss' : same ? '' : d.name ? 'lv-diff' : ''}"></td>
      <td class="lv-dim">${d.name ? esc(d.name) + (d.own ? '' : ' <small>(Gewerk)</small>') : '–'}</td>
      <td class="lv-dim">${book && (book.phone || book.mobile) ? esc(book.phone || book.mobile) : ''}</td>
      <td class="lv-act">${same ? '<span class="lv-same" title="Projekt-Firma und Vorgabe stimmen überein">✓ wie Vorgabe</span>' : `<button class="fv-x" data-lptake="1"${d.name ? ` title="Vorgabe „${esc(d.name)}“ im Projekt eintragen"` : ' disabled title="Keine Vorgabe für dieses Gewerk"'}>← Vorgabe übernehmen</button><button class="fv-x" data-lpup="1"${cur ? ` title="„${esc(cur)}“ als Vorgabe für alle Projekte speichern"` : ' disabled title="Im Projekt ist keine Firma eingetragen"'}>↑ als Vorgabe speichern</button>`}</td></tr>`;
  }
  if (!list.length) h += `<tr><td colspan="9" class="fv-empty">${rows.length ? 'Alle Leistungen haben eine Firma.' : 'Das Projekt hat noch keine Leistungen.'}</td></tr>`;
  return h + '</tbody></table></div>';
}
// Abschnitt im Projekt: Assistenten-Leistungen über den Planungsassistenten (Abschnitt = Phase),
// sonst Verschieben unter einen gleichnamigen Abschnitt im selben Gebäude-/Wohnungsblock
const libLiveAssist = () => !!(window.AssistCore && P && P.assist && AssistCore.status().live);
function libSecSelect(g) {
  const T = P.tasks, t0 = T[g.idx[0]];
  if (g.cat && libLiveAssist()) {
    const it = AssistCore.items(P.assist).find((x) => x.id === g.cat), cur = it ? it.ph : '';
    if (cur) return `<select data-psec="ph">${libPhases().map((p) => `<option value="${p.k}"${p.k === cur ? ' selected' : ''}>${esc(p.n)}</option>`).join('')}</select>`;
  }
  const L = (t0.lvl || 0) - 1; if (L < 0) return `<span class="lv-dim">${esc(g.sec)}</span>`;
  const names = [...new Set(T.filter((t, i) => (t.lvl || 0) === L && i + 1 < T.length && (T[i + 1].lvl || 0) > L).map((t) => t.name))];
  if (!names.includes(g.sec)) names.unshift(g.sec);
  return `<select data-psec="name">${names.map((n) => `<option${n === g.sec ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
}
function libMoveSection(g, name) {
  const uids = g.idx.map((i) => P.tasks[i].uid); let moved = 0, miss = 0;
  act(() => {
    for (const u of uids) {
      const T = P.tasks, i = T.findIndex((t) => t.uid === u); if (i < 0) continue;
      const L = T[i].lvl || 0; let p = i - 1; while (p >= 0 && (T[p].lvl || 0) >= L) p--;
      if (p < 0 || T[p].name === name) continue;
      const pl = T[p].lvl || 0; let gp = p - 1; while (gp >= 0 && (T[gp].lvl || 0) >= pl) gp--;
      const from = gp < 0 ? 0 : gp + 1, to = gp < 0 ? T.length - 1 : blockEnd(gp);
      let j = -1; for (let k = from; k <= to; k++) if ((T[k].lvl || 0) === pl && k !== p && T[k].name === name && k + 1 < T.length && (T[k + 1].lvl || 0) > pl) { j = k; break; }
      if (j < 0) { miss++; continue; }
      const tgt = T[j], [t] = T.splice(i, 1), jj = T.indexOf(tgt); T.splice(blockEnd(jj) + 1, 0, t); moved++;
    }
  });
  toast(miss ? `${moved} verschoben · ${miss}× gibt es „${name}“ im selben Block nicht – dort im Plan unter „Leistung“ verschieben.` : `„${g.name}“ nach „${name}“ verschoben.`, !!miss && !moved);
}
function libSetProjectFirm(keys, nameOf) {
  const rows = libProjectRows().filter((g) => keys.includes(g.key)); let n = 0;
  const book = new Set();
  act(() => {
    for (const g of rows) {
      const v = String(nameOf(g) || '').trim();
      for (const i of g.idx) if ((P.tasks[i].res || '') !== v) { P.tasks[i].res = v; n++; }
      if (v && g.gw) book.add(v + '\u0000' + g.gw);
    }
  });
  // neue Firmen ins Adressbuch, Gewerk dort ergänzen
  if (typeof FIRMS !== 'undefined') {
    let ch = false;
    for (const k of book) {
      const [nm, gw] = k.split('\u0000'); let f = firmByName(nm);
      if (!f) { f = { id: newFirmId(), name: nm, gewerke: [gw], contact: '', phone: '', mobile: '', mail: '', address: '', note: '' }; FIRMS.push(f); ch = true; }
      else if (!(f.gewerke || []).includes(gw)) { f.gewerke = [...(f.gewerke || []), gw]; ch = true; }
    }
    if (ch) saveFirmsSoon();
  }
  return n;
}
function libSetDefault(cat, gw, name) {
  const id = cat.split('~')[0], own = window.LIBRARY.find((x) => x.id === id);
  if (own) libUpd(id, { firm: name }); else if (CATALOG.items.some((i) => i.id === id)) { if (name) CATFIRMS[id] = name; else delete CATFIRMS[id]; CATFIRMS = { ...CATFIRMS }; saveCatFirms(); }
  else return false;
  return true;
}

$('#libView').addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'lvPrjEmpty') { libPrjEmpty = t.checked; renderLib(); return; }
  if (t.dataset.phn) { const p = CATALOG.phases.find((x) => x.k === t.dataset.phn); const v = t.value.trim(); if (p && v) { p.n = v; savePhases(); } renderLib(); return; }
  if (t.dataset.sscope) {
    const i = CATALOG.items.find((y) => y.id === t.dataset.sscope); if (!i) return;
    const m = { ...(window.CATSCOPE || {}) }; if (t.value === i.sc) delete m[i.id]; else m[i.id] = t.value;
    window.CATSCOPE = m; saveCatScope(); if (window.AssistCore) AssistCore.notifySoon(); renderLib();
    toast(`„${i.n}“: neue Planungen ${t.value === 'bau' ? 'einmal für das Gebäude' : 'je Einheit / Wohnung'}.`);
    return;
  }
  if (t.dataset.sfirm) { const v = t.value.trim(); libBook(v, (CATALOG.items.find((i) => i.id === t.dataset.sfirm) || {}).gw); if (v) CATFIRMS[t.dataset.sfirm] = v; else delete CATFIRMS[t.dataset.sfirm]; CATFIRMS = { ...CATFIRMS }; saveCatFirms(); if (window.AssistCore) AssistCore.notifySoon(); renderLib(); return; }
  if (t.dataset.pfirm) { const k = t.closest('tr').dataset.lpk; libSetProjectFirm([k], () => t.value); renderLib(); return; }
  if (t.dataset.pgw || t.dataset.psec) {
    const k = t.closest('tr').dataset.lpk, g = libProjectRows().find((x) => x.key === k); if (!g) return;
    if (t.dataset.pgw) {
      const v = t.value.trim(); if (!v || v === g.gw) { renderLib(); return; }
      gwColor(v); act(() => { for (const i of g.idx) P.tasks[i].gw = v; }); toast(`Gewerk von „${g.name}“: ${v}`);
    } else if (t.dataset.psec === 'ph') {
      if (AssistCore.movePhase(g.cat, t.value) === false) toast('Abschnitt nicht änderbar – siehe Hinweis im Plan.', true); else toast(`„${g.name}“ nach „${libPhName(t.value)}“ verschoben.`);
    } else libMoveSection(g, t.value);
    renderLib(); return;
  }
  const tr = t.closest('tr[data-lid]'); if (!tr || !t.dataset.k) return;
  const id = tr.dataset.lid, k = t.dataset.k, x = window.LIBRARY.find((y) => y.id === id); if (!x) return;
  let v = t.value; const f = {};
  if (k === 'd') v = Math.max(1, Math.min(999, Math.round(+v) || 1));
  if (k === 'a' || k === 'b') v = v ? [v] : [];
  if (typeof v === 'string') v = v.trim();
  f[k] = v;
  if (k === 'gw' && v) { gwColor(v); if (!x.din) f.din = libDinFor(v, x.n); }
  if (k === 'firm' && v) libBook(v, x.gw);
  if (k === 'n' && v && !x.gw) { const s = AssistCore.dinSuggest(v)[0]; if (s) { f.gw = s.gw; f.din = x.din || s.din; gwColor(s.gw); } }
  libUpd(id, f); renderLib();
});
$('#libView').addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('lv-prj')) { libPrjOpen = e.target.open; LS.set('libPrj', libPrjOpen); } }, true);
$('#libView').addEventListener('input', (e) => { if (e.target.id === 'libQ') { libQuery = e.target.value; libFocus = '#libQ'; renderLib(); const q = $('#libQ'); if (q) { const n = q.value.length; q.setSelectionRange(n, n); } } });
const LIB_SGKEYS = ['ph', 'gw', 'din', 'sc', 'd', 'a', 'b', 'craft'];
// Original einer Kopie: Leistung des Standardkatalogs oder Kopiervorlage im eigenen Katalog
function libSource(x) {
  let std = x.from ? CATALOG.items.find((i) => i.id === x.from) : null;
  if (!x.from && x.src === 'Standardkatalog') std = CATALOG.items.find((i) => i.n === x.n.replace(/ \(Kopie\)$/, ''));
  if (std) return { label: 'wie Standardkatalog', vals: { ph: std.ph, gw: std.gw, din: std.din || '', sc: std.sc, d: std.d || 1, a: (std.a || []).map((z) => (Array.isArray(z) ? z[0] : z)).filter((z) => z !== 'start').slice(0, 1), b: [], craft: (typeof CRAFT !== 'undefined' && CRAFT[std.gw]) || '', why: `Werte aus dem Standardkatalog: „${std.n}“` } };
  const own = x.from ? window.LIBRARY.find((y) => y.id === x.from) : null;
  if (own) return { label: 'wie Kopiervorlage', vals: { ph: own.ph, gw: own.gw, din: own.din, sc: own.sc, d: own.d, a: (own.a || []).slice(), b: (own.b || []).slice(), craft: own.craft, why: `Werte der Kopiervorlage „${own.n}“` } };
  return null;
}
function libSgOpts(id) {
  const x = () => window.LIBRARY.find((y) => y.id === id) || {};
  return {
    text: () => x().n,
    snap: () => Object.fromEntries(LIB_SGKEYS.map((k) => [k, Array.isArray(x()[k]) ? x()[k].slice() : x()[k]])),
    fetch: (kind, force) => AiPlace.suggest(x().n, P && P.assist ? P.assist : { type: 'frei' }, (libSg[id].own || x()).ph, kind, force),
    apply: (r) => {
      const st = libSg[id]; if (!st) return;
      if (!r) { libUpd(id, st.own || {}); return; }
      const f = { ph: r.ph, gw: r.gw || x().gw, din: r.din || '', sc: r.sc, d: r.d, a: r.a.slice(0, 1), b: r.b.slice(0, 1) };
      if (r.craft && !(st.own && st.own.craft)) f.craft = r.craft;
      if (f.gw) gwColor(f.gw); libUpd(id, f);
    },
    redraw: () => renderLib(),
  };
}
$('#libView').addEventListener('click', (e) => {
  { const row = e.target.closest('tr[data-sgfor]'); if (row && e.target.closest('[data-sgv]') && libSg[row.dataset.sgfor]) { SugBar.click(e, libSg[row.dataset.sgfor], libSgOpts(row.dataset.sgfor)); return; } }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.phadd) {
    const inp = $('#phNew'), n = (inp && inp.value.trim()) || 'Neuer Abschnitt', k = 'u' + Date.now().toString(36);
    CATALOG.phases.push({ k, n, own: true }); savePhases(); libFocus = `input[data-phn="${k}"]`; renderLib(); toast(`Abschnitt „${n}“ angelegt – am Ende eingefügt, mit ↑ oder Ziehen an die gewünschte Stelle setzen.`); return;
  }
  if (b.dataset.phmv) { const k = b.closest('tr').dataset.phk, i = CATALOG.phases.findIndex((p) => p.k === k); phMove(k, i + +b.dataset.phmv); return; }
  if (b.dataset.phreset) { const own = CATALOG.phases.filter((p) => p.own); CATALOG.phases.splice(0, CATALOG.phases.length, ...PH_STD.map((p) => ({ ...p })), ...own); savePhases(); renderLib(); return; }
  if (b.dataset.phplan) { phApplyToPlan(); return; }
  if (b.dataset.phdel) {
    const k = b.closest('tr').dataset.phk;
    if (libDelAsk !== 'ph:' + k) { libDelAsk = 'ph:' + k; renderLib(); setTimeout(() => { if (libDelAsk === 'ph:' + k) { libDelAsk = null; renderLib(); } }, 3000); return; }
    libDelAsk = null; const i = CATALOG.phases.findIndex((p) => p.k === k), to = (CATALOG.phases[i - 1] || CATALOG.phases[i + 1]).k;
    CATALOG.phases.splice(i, 1); savePhases();
    if (window.LIBRARY.some((x) => x.ph === k)) libSet(window.LIBRARY.map((x) => (x.ph === k ? { ...x, ph: to } : x)));
    renderLib(); return;
  }
  if (b.dataset.lsub) { libSub = b.dataset.lsub; LS.set('libSub', libSub); renderLib(); return; }
  if (b.dataset.lnew) { libNew(b.dataset.lnew); return; }
  if (b.dataset.rec) { const id = b.closest('tr').dataset.lid, x = window.LIBRARY.find((y) => y.id === id), r = new Set(x.rec || []); if (r.has(b.dataset.rec)) r.delete(b.dataset.rec); else r.add(b.dataset.rec); libUpd(id, { rec: [...r] }); renderLib(); return; }
  if (b.dataset.ldup) { const x = window.LIBRARY.find((y) => y.id === b.dataset.ldup); libNew(x.ph, { ...x, n: x.n + ' (Kopie)', from: x.id, src: 'Kopie von „' + x.n + '“' }); return; }
  if (b.dataset.lcopy) { const i = CATALOG.items.find((y) => y.id === b.dataset.lcopy); libNew(i.ph, { n: i.n, gw: i.gw, din: i.din || '', sc: i.sc, d: i.d || 1, a: (i.a || []).map((z) => (Array.isArray(z) ? z[0] : z)).filter((z) => z !== 'start').slice(0, 1), craft: (typeof CRAFT !== 'undefined' && CRAFT[i.gw]) || '', src: 'Standardkatalog', from: i.id }); return; }
  if (b.dataset.ldel) {
    if (libDelAsk !== b.dataset.ldel) { libDelAsk = b.dataset.ldel; renderLib(); setTimeout(() => { if (libDelAsk === b.dataset.ldel) { libDelAsk = null; renderLib(); } }, 3000); return; }
    libDelAsk = null; libSet(window.LIBRARY.filter((y) => y.id !== b.dataset.ldel)); renderLib(); return;
  }
  if (b.dataset.lplan) { libToPlan(b.dataset.lplan); return; }
  if (b.dataset.sgclose) { delete libSg[b.dataset.sgclose]; renderLib(); return; }
  if (b.dataset.lai) {
    const id = b.dataset.lai;
    if (libSg[id]) { delete libSg[id]; renderLib(); return; }
    libSg[id] = SugBar.state(null);
    const src = libSource(window.LIBRARY.find((y) => y.id === id) || {});
    if (src) { libSg[id].srcLabel = src.label; libSg[id].srcVals = src.vals; renderLib(); return; }   // Kopie: erst Leiste zeigen, Original ist eine Wahl
    renderLib();
    SugBar.run(libSg[id], AiPlace.preferred(), false, libSgOpts(id));
    return;
  }
  if (b.dataset.lptake || b.dataset.lpup) {
    const k = b.closest('tr').dataset.lpk, g = libProjectRows().find((x) => x.key === k); if (!g) return;
    if (b.dataset.lptake) libSetProjectFirm([k], () => libDefaultFor(g).name);
    else { const v = P.tasks[g.idx[0]].res; if (!g.cat || !libSetDefault(g.cat, g.gw, v)) { const x = libClean({ n: g.name, gw: g.gw, ph: libGuessPh(g.name, g.gw), d: P.tasks[g.idx[0]].dur, firm: v, src: P.name }); libSet([...window.LIBRARY, x]); toast(`„${g.name}“ mit Firma „${v}“ in den Katalog übernommen.`); } else toast(`„${v}“ ist jetzt Vorgabe für „${g.name}“ in allen Projekten.`); }
    renderLib(); return;
  }
  if (b.dataset.lpall) {
    const rows = libProjectRows().filter((g) => libDefaultFor(g).name && (b.dataset.lpall === 'all' || [...new Set(g.idx.map((i) => P.tasks[i].res || ''))].every((r) => isCraftName(r, g.gw))));
    const n = libSetProjectFirm(rows.map((g) => g.key), (g) => libDefaultFor(g).name);
    toast(n ? `Bei ${n} Leistungen die Vorgabe eingetragen.` : 'Nichts zu ändern.'); renderLib(); return;
  }
});
function libToPlan(id) {
  if (!P) return;
  const x = window.LIBRARY.find((y) => y.id === id); if (!x) return;
  const st = AssistCore.status();
  if (st.live) {
    if (st.pres[id]) { toast(`„${x.n}“ ist schon im Plan.`); return; }
    if (AssistCore.toggle(id, true) !== false) toast(`„${x.n}“ in „${libPhName(x.ph)}“ eingefügt und verknüpft.`);
  } else if (AssistCore.insertSingle(id, P.assist || { type: 'frei' }) !== false) {
    const t = P.tasks.find((y) => y.name === x.n && !y.res && x.firm); if (t) t.res = x.firm;
    toast(`„${x.n}“ an der markierten Zeile eingefügt.`);
  }
}

/* ---------- aus Projekten übernehmen ---------- */
async function libFromProjects() {
  let src;
  try { src = await fetch('api/library/sources').then(j); } catch (e) { toast('Projekte konnten nicht gelesen werden: ' + e.message, true); return; }
  const have = new Set(window.LIBRARY.map((x) => (x.n + '|' + x.gw).toLowerCase()));
  const rows = [];
  const body = src.length ? `<div class="hint" style="margin:0 0 8px">Gezeigt werden Leistungen, die nicht aus dem Standardkatalog stammen – von Hand angelegte und eigene Leistungen des Planungsassistenten.</div>
    <input id="lfQ" class="lv-q" placeholder="Filtern …" style="width:100%;margin-bottom:8px">
    <div class="lf-list">${src.map((p, pk) => `<details class="lf-p"${pk < 3 ? ' open' : ''}><summary><label class="cb" onclick="event.stopPropagation()"><input type="checkbox" data-lfall="${pk}"> <b>${esc(p.name)}</b></label><small>${p.items.length} Leistungen</small></summary>
      <table class="ptab"><tr><th></th><th>Leistung</th><th>Gewerk</th><th>AT</th><th>Abschnitt</th></tr>${p.items.map((it) => { const k = rows.push({ ...it, src: p.name }) - 1, dup = have.has((it.n + '|' + it.gw).toLowerCase()); const ph = it.ph || libGuessPh(it.n, it.gw);
        return `<tr data-lfr="${k}" data-txt="${esc((it.n + ' ' + it.gw).toLowerCase())}"><td><input type="checkbox" data-lf="${k}" data-p="${pk}"${dup ? ' disabled title="schon im Katalog"' : ''}></td><td>${esc(it.n)}${dup ? ' <small class="lv-src">schon im Katalog</small>' : ''}</td><td>${esc(it.gw)}</td><td>${it.d}</td>
        <td><select data-lfph="${k}">${libPhases().map((q) => `<option value="${q.k}"${q.k === ph ? ' selected' : ''}>${esc(q.n.split(' (')[0])}</option>`).join('')}</select></td></tr>`; }).join('')}</table></details>`).join('')}</div>`
    : '<div class="hint">In den vorhandenen Projekten gibt es keine Leistungen außerhalb des Standardkatalogs.</div>';
  const bg = modal('Leistungen aus Projekten übernehmen', body, [{ label: 'Übernehmen', cls: 'primary', primary: true, fn: (bg2) => {
    const pick = [...bg2.querySelectorAll('input[data-lf]:checked')].map((c) => { const r = rows[+c.dataset.lf]; const ph = bg2.querySelector(`[data-lfph="${c.dataset.lf}"]`).value;
      return libClean({ n: r.n, gw: r.gw, din: r.din || libDinFor(r.gw, r.n), ph, sc: r.sc, d: r.d, craft: (typeof CRAFT !== 'undefined' && CRAFT[r.gw]) || '', src: r.src }); });
    if (!pick.length) { toast('Keine Leistung markiert.'); return false; }
    libSet([...window.LIBRARY, ...pick]); showTab('katalog'); toast(`${pick.length} Leistungen in den Katalog übernommen.`);
  } }, { label: 'Abbrechen' }]);
  bg.querySelector('.modal').style.width = 'min(820px,94vw)';
  bg.addEventListener('change', (e) => { const a = e.target.dataset.lfall; if (a != null) bg.querySelectorAll(`input[data-p="${a}"]:not(:disabled)`).forEach((c) => { if (!c.closest('tr').hidden) c.checked = e.target.checked; }); });
  const q = bg.querySelector('#lfQ'); if (q) q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); bg.querySelectorAll('tr[data-lfr]').forEach((tr) => { tr.hidden = !!v && !tr.dataset.txt.includes(v); }); });
}

/* ---------- Datei ---------- */
function libExport() { download('Leistungskatalog.json', JSON.stringify({ format: 'gantt-leistungskatalog', version: 1, items: window.LIBRARY }, null, 2), 'application/json'); }
function libImportFile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); const arr = Array.isArray(d) ? d : d.items; if (!Array.isArray(arr)) throw new Error('keine Leistungsliste');
      const ids = new Set(window.LIBRARY.map((x) => x.id)), keys = new Set(window.LIBRARY.map((x) => (x.n + '|' + x.gw).toLowerCase()));
      const add = arr.filter((x) => x && x.n && !ids.has(x.id) && !keys.has((x.n + '|' + (x.gw || '')).toLowerCase())).map(libClean);
      libSet([...window.LIBRARY, ...add]); renderLib(); toast(`${add.length} Leistungen importiert` + (arr.length > add.length ? `, ${arr.length - add.length} schon vorhanden.` : '.'));
    } catch (e) { toast('Import fehlgeschlagen: ' + e.message, true); }
  };
  inp.click();
}

loadLibrary();
