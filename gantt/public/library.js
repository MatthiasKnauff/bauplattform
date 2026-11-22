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
let LIBMODUS = LS.get('libModus', 'liste') === 'netz' ? 'netz' : 'liste';   // Liste | Abhängigkeiten (Mock LK, K1-A)
let libLoaded = false, libSaveT = null, libQuery = '', libEk = LS.get('libEk', LS.get('libStd2', true) ? 0 : 1), libZu = new Set(LS.get('libZu', [])),   // Einklappen (GO 18.11.2026, EK-A1 B2): 0 alles · 1 nur eigene · 2 nur Abschnitte
   libDelAsk = null, libFocus = null;
let CATFIRMS = {}, catfSaveT = null;
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
  phStand = out.map((p) => ({ ...p }));
}
/* Rückgängig im Leistungskatalog (15.11.2026): jede Änderung an Leistungen und Abschnitten ist ein Schritt im gemeinsamen Verlauf (undo.js,
   oben links und Strg+Z). Zurückgeholt wird der vorige Stand – ohne dabei selbst wieder einen Schritt anzulegen. libText: Text des nächsten Schritts. */
let phStand = null, libText = '';
const libSchritt = (text, zurueck) => { if (window.rueckgaengig) rueckgaengig(text, async () => { zurueck(); if (typeof renderLib === 'function' && !$('#libView').hidden) renderLib(); }); };
let phSaveT = null;
/* Katalog für alle Projekte: nur der Administrator ändert ihn – alle anderen sehen ihn (der Server prüft es ebenfalls) */
const libDarf = () => !!(window.BP && BP.me && BP.me.katalog);   // Verwaltung je Rolle: Block „Bauzeitenplan: Kataloge …“
const libNurAdmin = () => { toast('Den Leistungskatalog für alle Projekte pflegt der Administrator.', true); return false; };
function savePhases(still) {
  if (!libDarf()) return;
  const alt = phStand, neu = CATALOG.phases.map((p) => ({ ...p }));
  if (!still && alt && JSON.stringify(alt) !== JSON.stringify(neu)) libSchritt(libText || 'Abschnitte geändert', () => { CATALOG.phases.splice(0, CATALOG.phases.length, ...alt.map((p) => ({ ...p }))); PHDRAFT = null; savePhases(true); });
  phStand = neu; libText = '';
  clearTimeout(phSaveT);
  phSaveT = setTimeout(() => fetch('api/phases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CATALOG.phases.map((p) => ({ k: p.k, n: p.n, own: !!p.own }))) }).then(j)
    .catch((e) => toast('Abschnitte nicht gespeichert: ' + e.message, true)), 300);
  if (window.AssistCore) AssistCore.notifySoon();
}
async function loadLibrary() {
  try { const [a, b, ph, sc, kb] = await Promise.all([fetch('api/library').then(j), fetch('api/catfirms').then(j), fetch('api/phases').then(j), fetch('api/catscope').then(j).catch(() => ({})), fetch('api/catbuero').then(j).catch(() => ({}))]); window.LIBRARY = a; CATFIRMS = b || {}; window.CATSCOPE = sc || {};
    if (window.KatBuero) KatBuero.laden(kb); /* Abweichungen des Büros vom Werkskatalog (katalogbuero.js, 22.11.2026) */ applyPhaseList(ph); scStand = { ...window.CATSCOPE }; cfStand = { ...CATFIRMS }; libLoaded = true; }
  catch (e) { toast('Leistungskatalog konnte nicht geladen werden: ' + e.message, true); }
  if (window.AssistCore) AssistCore.notifySoon();
  if (!$('#libView').hidden) renderLib();
}
function libSet(list, now, still) {
  if (!libDarf()) { libNurAdmin(); return; }
  const alt = window.LIBRARY;
  if (!still && alt !== list) libSchritt(libText || 'Leistungskatalog geändert', () => libSet(alt, true, true));
  libText = '';
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
let scStand = null, cfStand = null;   // zuletzt gespeicherter Stand – für Rückgängig
function saveCatScope(still) {
  if (!libDarf()) return libNurAdmin();
  const alt = scStand || {}, neu = { ...(window.CATSCOPE || {}) };
  if (!still && JSON.stringify(alt) !== JSON.stringify(neu)) libSchritt('Bezug einer Standardleistung geändert', () => { window.CATSCOPE = { ...alt }; saveCatScope(true); if (window.AssistCore) AssistCore.notifySoon(); });
  scStand = neu;
  clearTimeout(catsSaveT);
  catsSaveT = setTimeout(() => fetch('api/catscope', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(window.CATSCOPE || {}) }).then(j)
    .catch((e) => toast('Bezug nicht gespeichert: ' + e.message, true)), 300);
}
const stdScope = (i) => ((window.CATSCOPE || {})[i.id] || i.sc);
function saveCatFirms(still) {
  if (!libDarf()) return libNurAdmin();
  const alt = cfStand || {}, neu = { ...CATFIRMS };
  if (!still && JSON.stringify(alt) !== JSON.stringify(neu)) libSchritt('Firmen-Vorgabe geändert', () => { CATFIRMS = { ...alt }; saveCatFirms(true); if (window.AssistCore) AssistCore.notifySoon(); });
  cfStand = neu;
  clearTimeout(catfSaveT);
  catfSaveT = setTimeout(() => fetch('api/catfirms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CATFIRMS) }).then(j)
    .catch((e) => toast('Firmen-Vorgaben nicht gespeichert: ' + e.message, true)), 400);
}
// Vorgabe je Gewerk (für alle künftigen Pläne, 15.11.2026): eigener Eintrag in den Firmen-Vorgaben (catfirms, Schlüssel gw~…) – sonst die Stammfirma
const gwKey = (gw) => 'gw~' + String(gw || '').replace(/[^\p{L}\p{N}_]+/gu, '_').slice(0, 55);
function gwVorgabe(gw, name) {   // name leer = eigene Vorgabe weg (dann wieder die Stammfirma aus dem Adressbuch)
  if (!libDarf()) return libNurAdmin();
  const k = gwKey(gw); if (name) CATFIRMS[k] = name; else delete CATFIRMS[k]; CATFIRMS = { ...CATFIRMS }; saveCatFirms(); if (window.AssistCore) AssistCore.notifySoon(); return true;
}
// Stammfirma eines Gewerks: Vorgabe des Gewerks, sonst die Firma im Adressbuch, bei der das Gewerk eingetragen ist
function gwFirm(gw) {
  const v = gw && String(CATFIRMS[gwKey(gw)] || '').trim();
  if (v) return /^[-–—]+$/.test(v) ? '' : v;   // „-“ eingetragen = bewusst keine Firma
  if (!gw || typeof FIRMS === 'undefined') return '';
  const g = gw.toLowerCase(), l = FIRMS.filter((f) => (f.gewerke || []).some((x) => x.toLowerCase() === g)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return l.length ? l[0].name : '';
}
window.Library = {
  async add(it) { if (!libDarf()) throw new Error('Den Leistungskatalog für alle Projekte pflegt der Administrator – die Leistung bleibt in diesem Plan.'); const x = libClean({ ...it, id: it.id || newLibId() }); await libSet([...window.LIBRARY, x], true); if (!$('#libView').hidden) renderLib(); return x; },
};
function libClean(x) {
  return { id: x.id || newLibId(), n: String(x.n || 'Leistung'), ph: x.ph || 'ausbau', gw: x.gw || '', din: x.din || '', craft: x.craft || '',
    sc: x.sc === 'bau' || x.sc === 'gs' ? x.sc : 'we', ...(x.ms ? { ms: 1 } : {}), d: Math.max(1, Math.round(+x.d) || 1), a: x.a || [], b: x.b || [], rec: x.rec || [], info: x.info || '', src: x.src || '', from: x.from || '' };
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
  const sc = box.querySelector('.fv-scroll'), st = sc ? sc.scrollTop : 0, sl = sc ? sc.scrollLeft : 0;   // Rollposition in beiden Richtungen merken – die Tabelle ist breiter als das Fenster
  const q = libQuery.trim().toLowerCase();
  const hit = (x) => !q || [x.n, x.gw, x.din, x.craft].join(' ').toLowerCase().includes(q);
  const L = window.LIBRARY, profs = CATALOG.profiles.filter((p) => p.k !== 'frei');
  /* ein Reiter (15.11.2026, Mock „Bauzeitenplan aufgeräumt“): Abschnitte als blaue Zwischenzeilen – umbenennen, ziehen, ＋ Leistung;
     Firmen im Projekt stehen unter „Gewerke & Firmen“, Stände & Verlauf oben in der Befehlsleiste */
  let h = '<div class="fv">';
  const nurLesen = () => { if (libDarf()) return;   // Katalog für alle Projekte: nur ansehen
    const fv = box.querySelector('.fv'); fv.insertAdjacentHTML('afterbegin', '<div class="lv-ro">🔒 Nur ansehen – den Katalog für alle Projekte (Leistungen, Abschnitte, Vorgaben) pflegt der Administrator.</div>');
    fv.querySelectorAll('input:not(#libQ),select,textarea').forEach((x) => { x.disabled = true; });
    fv.querySelectorAll('button').forEach((x) => { if (!/^(lstd|lsort|phklapp)$/.test(Object.keys(x.dataset)[0] || '')) x.disabled = true; });
    fv.querySelectorAll('[draggable]').forEach((x) => x.removeAttribute('draggable')); };
  const modus = `<span class="kn-seg lv-modus" role="tablist"><button type="button" role="tab" data-lmodus="liste" aria-selected="${LIBMODUS === 'liste'}" class="${LIBMODUS === 'liste' ? 'on' : ''}">Liste</button><button type="button" role="tab" data-lmodus="netz" aria-selected="${LIBMODUS === 'netz'}" class="${LIBMODUS === 'netz' ? 'on' : ''}">Abhängigkeiten</button></span>`;
  if (LIBMODUS === 'netz' && window.KatBuero && typeof katNetzHtml === 'function') {
    box.innerHTML = `<div class="fv"><div class="fv-head"><div><h3>Leistungskatalog</h3><span>eine Leistung in der Mitte – Vorgänger links, Nachfolger rechts</span></div>${modus}</div>${libLernHtml()}${katNetzHtml(LIBNETZ)}</div>`;
    LIBNETZ = null;   // nur einmal: danach führt die Ansicht selbst (Klick auf eine Kiste)
    nurLesen(); return;
  }
  h += `<div class="fv-head"><div><h3>Leistungskatalog</h3><span>${libPhases().length} Abschnitte · ${L.length} eigene Leistungen · gilt für alle neuen Planungen (Planungsassistent)</span></div>${modus}
    <input id="libQ" class="lv-q" placeholder="Suchen …" value="${esc(libQuery)}">
    <span class="fv-hint">Firmen stehen nicht im Katalog: sie gehören zum Projekt (Reiter „Gewerke &amp; Firmen“, dort auch die Vorgabe je Gewerk für alle Projekte). Eigene Leistungen erscheinen im Planungsassistenten im gewählten Abschnitt – unter „Weitere Leistungen“ oder, wenn unter <b>Vorausgewählt bei</b> die Projektart markiert ist, dort gleich angekreuzt. Beim Einfügen bekommt die Leistung die Firma, die ihr Gewerk im Projekt hat. <b>Abschnitte</b>: Namen in der blauen Zeile überschreiben, am ⠿ ziehen, oben „＋ Abschnitt“.</span></div>
    ${libLernHtml()}<div class="fv-scroll"><table class="fv-t lv-t" data-tk="lv-alle"><thead><tr><th style="min-width:250px">Leistung</th><th>Abschnitt</th><th style="min-width:120px">Gewerk</th><th>DIN</th><th style="min-width:140px" title="Rolle der ausführenden Firma oder Planer:in, z. B. Tragwerksplaner, Rohbauer">Fachrichtung</th><th>Bezug</th><th class="num">AT</th><th style="min-width:170px">Folgt auf</th><th style="min-width:150px">Muss fertig sein vor</th><th style="min-width:130px" title="Bei welchen Projektarten der Planungsassistent diese Leistung von sich aus ankreuzt. Symbol anklicken = ein/aus. Bei allen anderen Projektarten steht sie zur Auswahl, ist aber nicht angekreuzt.">Vorausgewählt bei</th><th></th></tr></thead><tbody>`;
  let shown = 0;
  for (const [phi, ph] of libPhases().entries()) {
    const own = L.filter((x) => x.ph === ph.k && hit(x));
    const zu = !q && libZu.has(ph.k);   // Suche klappt Abschnitte mit Treffern auf
    const std = libEk === 0 && !zu ? CATALOG.items.filter((i) => i.ph === ph.k && hit(i)) : [];   // mit Meilensteinen (◆)
    if (!own.length && !std.length && q) continue;   // leere Abschnitte zeigen – dort kann man Leistungen anlegen
    const n = CATALOG.items.filter((i) => i.ph === ph.k).length + L.filter((x) => x.ph === ph.k).length;
    h += `<tr class="lv-ph" data-phk="${ph.k}" draggable="true"><td colspan="12"><span class="lv-kl" data-phklapp="${ph.k}" title="${zu ? 'Aufklappen' : 'Zuklappen'}">${typeof bpKlapp === 'function' ? bpKlapp(!zu) : ''}</span><span class="lv-grip" title="Ziehen, um die Reihenfolge zu ändern (oder im Namen Alt+↑ / Alt+↓)">⠿</span>${phi + 1} · <input class="lv-phn" data-phn="${ph.k}" value="${esc(ph.n)}" title="Name des Abschnitts – gilt für alle Projekte"><button class="btn sm" data-lnew="${ph.k}" title="Neue Leistung in diesem Abschnitt">＋ Leistung</button><button class="btn sm" data-lwiz="${ph.k}" title="Neue Leistung Schritt für Schritt: Abschnitt, Gewerk, Dauer, Reihenfolge, Gebäudetypen">✨ mit Assistent</button><span class="lv-dim">${n} Leistung${n === 1 ? '' : 'en'}${L.filter((x) => x.ph === ph.k).length ? ` · ${L.filter((x) => x.ph === ph.k).length} eigene` : ''}${ph.own ? '' : ' · Standard'}</span>${ph.own ? `<button class="fv-x${libDelAsk === 'ph:' + ph.k ? ' sure' : ''}" data-phdel="1" title="Eigenen Abschnitt löschen – seine Leistungen wandern in den Abschnitt davor">${libDelAsk === 'ph:' + ph.k ? 'wirklich löschen?' : '✕'}</button>` : ''}</td></tr>`;
    for (const x of zu ? [] : own) {
      shown++;
      const dt = typeof dinTitle === 'function' ? dinTitle(x.din) : '';
      h += `<tr data-lid="${x.id}"><td><div class="lv-n"><span class="lv-grip lv-lg" draggable="true" title="Ziehen – auch in einen anderen Abschnitt (oder im Namen Alt+↑ / Alt+↓)">⠿</span><span class="gwdot" style="background:${gwColor(x.gw) || '#9e9e9e'}"></span><input data-k="n" value="${esc(x.n)}"></div>${x.src ? `<small class="lv-src">aus: ${esc(x.src)}</small>` : ''}</td>
        <td><select data-k="ph">${libPhases().map((p) => `<option value="${p.k}"${p.k === x.ph ? ' selected' : ''}>${esc(p.n.split(' (')[0])}</option>`).join('')}</select></td>
        <td><input data-k="gw" list="lvGwList" value="${esc(x.gw)}"></td>
        <td><input data-k="din" list="fvDinList2" value="${esc(x.din)}" title="${esc(dt || 'ATV DIN-Nummer')}" style="min-width:70px"></td>
        <td><input data-k="craft" value="${esc(x.craft)}" placeholder="${esc((typeof CRAFT !== 'undefined' && CRAFT[x.gw]) || '')}"></td>
        <td><select data-k="sc"><option value="we"${x.sc === 'we' && !x.ms ? ' selected' : ''}>je Einheit</option><option value="bau"${x.sc === 'bau' && !x.ms ? ' selected' : ''}>Gebäude</option><option value="gs"${x.sc === 'gs' && !x.ms ? ' selected' : ''}>je Geschoss</option><option value="ms"${x.ms ? ' selected' : ''}>◆ Meilenstein</option></select></td>
        <td>${x.ms ? '<span class="lv-ms" title="Meilenstein – ohne Dauer">◆</span>' : `<input data-k="d" type="number" min="1" max="999" value="${x.d}" class="lv-d">`}</td>
        <td><select data-k="a"><option value="">automatisch – Ende des Abschnitts</option>${libPredOpts((x.a || [])[0], x.id)}</select></td>
        <td><select data-k="b"><option value="">–</option>${libPredOpts((x.b || [])[0], x.id)}</select></td>
        <td class="lv-rec">${profs.map((p) => `<button class="lv-pr${(x.rec || []).includes(p.k) ? ' on' : ''}" data-rec="${p.k}" title="${esc(p.n)}: ${(x.rec || []).includes(p.k) ? 'im Assistenten vorausgewählt (klicken = aus)' : 'nicht vorausgewählt (klicken = ein)'}">${p.ic}</button>`).join('')}</td>
        <td class="lv-act"><button class="fv-x" data-lnetz="${x.id}" title="Abhängigkeiten dieser Leistung">⇆</button><button class="fv-x" data-lplan="${x.id}" title="In das geöffnete Projekt einfügen">＋ Plan</button><button class="fv-x" data-ldup="${x.id}" title="Duplizieren">⧉</button><button class="fv-x${libDelAsk === x.id ? ' sure' : ''}" data-ldel="${x.id}" title="Aus dem Katalog löschen">${libDelAsk === x.id ? 'Löschen?' : '✕'}</button></td></tr>`;
    }
    for (const i of std) {
      const ab = KatBuero.abw(i.id);
      h += `<tr class="lv-std"><td><div class="lv-n"><span class="gwdot" style="background:${gwColor(i.gw) || '#9e9e9e'}"></span><span>${esc(i.n)}</span></div></td><td>${esc(ph.n.split(' (')[0])}</td><td>${esc(i.gw)}</td><td>${esc(i.din || '')}</td>
        <td>${esc((typeof CRAFT !== 'undefined' && CRAFT[i.gw]) || '')}</td><td><select data-sscope="${i.id}" class="${stdScope(i) !== i.sc ? 'lv-fown' : ''}" title="Vorgabe für neue Planungen. Standard: ${i.sc === 'bau' ? 'Gebäude' : 'je Einheit'}. In bestehenden Plänen im Planungsassistenten je Projekt umstellbar."><option value="we"${stdScope(i) === 'we' ? ' selected' : ''}>je Einheit</option><option value="bau"${stdScope(i) === 'bau' ? ' selected' : ''}>Gebäude</option></select></td><td class="num">${i.ms ? '◆' : `<input data-kbd="${i.id}" type="number" min="0.5" max="999" step="0.5" value="${i.d}" class="lv-d${ab.includes('d') ? ' lv-fown' : ''}" title="Richtdauer (EFH 140 m²) – ${esc(KatBuero.art(i))}">${ab.includes('d') ? `<button class="lv-ru" data-kbz="${i.id}:d" title="zurück auf Werk: ${KatBuero.werk(i.id).d} AT">↺</button>` : ''}`}</td>
        <td>${libSchilder(KatBuero.vor(i.id).map((v) => v.id), i.id, ab.includes('a'))}</td><td>${libSchilder(KatBuero.nach(i.id), i.id)}</td><td class="lv-stdh">${ab.length ? '<span class="lv-fown">Büro</span>' : 'Werk'}</td>
        <td class="lv-act"><button class="fv-x" data-lnetz="${i.id}" title="Abhängigkeiten dieser Leistung">⇆</button><button class="fv-x" data-lcopy="${i.id}" title="Als eigene Leistung kopieren (nur für eine wirklich andere Leistung – ändern geht direkt)">⧉ kopieren</button></td></tr>`;
    }
  }
  if (!shown && libEk === 1) h += `<tr><td colspan="12" class="fv-empty">${q ? 'Keine Treffer.' : 'Noch keine eigenen Leistungen. Mit „Neue Leistung“ anlegen, mit „Aus Projekten übernehmen“ aus vorhandenen Plänen holen oder im Planungsassistenten mit „＋ eigene“ – dort ist „auch im Leistungskatalog speichern“ vorgewählt. Mit „Standardkatalog“ siehst du die mitgelieferten Leistungen und kannst sie als eigene Variante kopieren.'}</td></tr>`;
  h += '</tbody></table></div></div>' + libLists();
  box.innerHTML = h; nurLesen(); libAfter(box, st, sl);
}
let LIBNETZ = null;
/* Lernen (Mock LK C, K3-A + K7): Vorschläge aus den Plänen des Büros – zum Übernehmen, nie automatisch (Server gantt/lernen.py) */
let LIBLERN = null, libLernP = null;
function libLernListe() {
  if (!LIBLERN) { if (!libLernP) libLernP = fetch('api/catlernen').then(j).then((d) => { LIBLERN = d; if (!$('#libView').hidden) renderLib(); }, () => { LIBLERN = { dauer: {}, links: {}, eigene: {}, nein: [] }; }); return []; }
  const nein = new Set(LIBLERN.nein || []), n = (id) => ((CATALOG.items.find((i) => i.id === id) || {}).n || id).split(' (')[0], V = [];
  for (const [cat, L] of Object.entries(LIBLERN.dauer || {})) {
    const i = CATALOG.items.find((x) => x.id === cat); if (!i || i.ms) continue;
    const f = L.reduce((a, x) => a + x.f, 0) / L.length; if (Math.abs(f - 1) < 0.1) continue;
    const d = Math.max(0.5, Math.round(i.d * f * 2) / 2); if (d === i.d) continue;
    const k = `d:${cat}:${d}`; if (nein.has(k)) continue;
    V.push({ k, art: 'd', id: cat, d, text: `„${n(cat)}“ war in <b>${L.length} Plänen</b> ${f > 1 ? 'länger' : 'kürzer'} als vorgeschlagen (Ø ${f > 1 ? '+' : ''}${Math.round((f - 1) * 100)} %) – Richtdauer ${i.d} → ${d} AT?`, wo: L.map((x) => x.p) });
  }
  for (const [vn, P] of Object.entries(LIBLERN.links || {})) {
    const [von, nach] = vn.split('>'), it = CATALOG.items.find((x) => x.id === nach);
    if (!it || !CATALOG.items.some((x) => x.id === von) || (it.a || []).some((a) => (Array.isArray(a) ? a[0] : a) === von)) continue;
    const k = `a:${vn}`; if (nein.has(k)) continue;
    V.push({ k, art: 'a', von, nach, text: `„${n(von)}“ wurde in <b>${P.length} Plänen</b> vor „${n(nach)}“ gehängt – als Abhängigkeit aufnehmen?`, wo: P });
  }
  const eig = new Set((window.LIBRARY || []).map((x) => x.n.toLowerCase()));
  for (const [kn, e] of Object.entries(LIBLERN.eigene || {})) {
    if (eig.has(kn) || CATALOG.items.some((i) => i.n.toLowerCase() === kn)) continue;
    const k = `e:${kn}`; if (nein.has(k)) continue;
    V.push({ k, art: 'e', e, text: `Eigene Leistung „${esc(e.n)}“ in <b>${e.p.length} Plänen</b> – in den Leistungskatalog?`, wo: e.p });
  }
  return V;
}
function libLernHtml() {
  const V = libLernListe(); if (!V.length) return '';
  return `<details class="lv-lern" data-klapp="gantt.lern"${typeof bpKlappOffen === 'function' && bpKlappOffen('gantt.lern', false) ? ' open' : ''}><summary>💡 ${V.length} ${V.length === 1 ? 'Vorschlag' : 'Vorschläge'} aus euren Plänen</summary>
    ${V.map((v, x) => `<div class="lv-lz"><span>${v.text} <small class="mut" title="${esc(v.wo.join(', '))}">(${esc(v.wo.slice(0, 3).join(', '))}${v.wo.length > 3 ? ' …' : ''})</small></span><span style="flex:1"></span><button type="button" class="fv-x" data-lern="ja:${x}">Übernehmen</button><button type="button" class="fv-x" data-lern="nein:${x}">Nicht mehr vorschlagen</button></div>`).join('')}
    <p class="mut">Grundlage: von Hand geänderte Leistungen (Kette 🔗 gelöst) und Fortschritt über 100 % mit Grund „liegt an der Leistung“ – ab 2 Plänen. Ohne KI.</p></details>`;
}
async function libLernKlick(b) {
  if (!libDarf()) return libNurAdmin();
  const [was, x] = b.dataset.lern.split(':'), v = libLernListe()[+x]; if (!v) return;
  if (was === 'nein') { try { LIBLERN.nein = (await fetch('api/catlernen/nein', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schluessel: v.k }) }).then(j)).nein; } catch (e) { toast(e.message, true); } return renderLib(); }
  if (v.art === 'd') KatBuero.setzen(v.id, { d: v.d }, `Gelernt: ${v.id} ${v.d} AT`);
  else if (v.art === 'a') knVerbinde(v.von, v.nach);
  else { libText = `Gelernt: „${v.e.n}“ in den Katalog`; libSet([...window.LIBRARY, libClean({ n: v.e.n, gw: v.e.gw, d: Math.max(1, Math.round(+v.e.d || 1)), sc: 'we', ph: libGuessPh(v.e.n, v.e.gw), id: newLibId() })]); }
  renderLib();
}
function libSchilder(ids, eigen, gelb) {   // Vorgänger/Nachfolger als Schilder (Mock LK A) – Klick = Abhängigkeiten dieser Leistung
  const n = (id) => ((CATALOG.items.find((i) => i.id === id) || (window.LIBRARY || []).find((x) => x.id === id) || {}).n || id).split(' (')[0];
  if (!ids.length) return '<span class="mut">–</span>';
  return `<span class="lv-chips${gelb ? ' lv-fown' : ''}" data-lnetz="${esc(eigen)}" title="Abhängigkeiten ansehen und ändern">${ids.slice(0, 2).map((id) => `<span class="lv-chip">${esc(n(id))}</span>`).join('')}${ids.length > 2 ? `<span class="lv-chip p">+${ids.length - 2}</span>` : ''}</span>`;
}
function libLists() {
  return `<datalist id="lvGwList">${AssistCore.gewerke().map((g) => `<option value="${esc(g)}">`).join('')}</datalist>

    <datalist id="fvDinList2">${(window.DIN_ATV || []).map((x) => `<option value="${x[0]}">${esc(x[1])}</option>`).join('')}</datalist>`;
}
function libAfter(box, st, sl = 0) {
  if (typeof enhanceTables === 'function') enhanceTables(box);
  const sc2 = box.querySelector('.fv-scroll'); if (sc2) { sc2.scrollTop = st; sc2.scrollLeft = sl; }
  if (libFocus) { const el = box.querySelector(libFocus); if (el) { el.focus(); if (el.select) el.select(); } libFocus = null; }
  document.querySelectorAll('[data-act="libKlapp"]').forEach((b) => { b.classList.toggle('on', libEk > 0); b.title = ['Alles offen', 'Nur eigene Leistungen (Standard ausgeblendet)', 'Nur Abschnitte'][libEk] + ' – Klick: ' + ['nur eigene Leistungen', 'nur Abschnitte', 'alles offen'][libEk]; });
}
const libUpd = (id, f) => libSet(window.LIBRARY.map((x) => (x.id === id ? { ...x, ...f } : x)));
function libNew(ph = 'ausbau', base) {
  const x = libClean({ n: 'Neue Leistung', ph, d: 2, sc: 'we', ...(base || {}), id: newLibId() });
  libSet([x, ...window.LIBRARY]);
  if ($('#libView').hidden) showTab('katalog');
  libFocus = `tr[data-lid="${x.id}"] input[data-k="n"]`; renderLib();
}
/* Reihenfolge und Namen der Abschnitte erst ändern, wenn „Übernehmen“ geklickt wird (vorher nur ein Entwurf) */
let PHDRAFT = null;
const phListe = () => PHDRAFT || CATALOG.phases;
const phEntwurf = () => (PHDRAFT = PHDRAFT || CATALOG.phases.map((p) => ({ ...p })));
function phUebernehmen() { if (!PHDRAFT) return; CATALOG.phases.splice(0, CATALOG.phases.length, ...PHDRAFT); PHDRAFT = null; savePhases(); }
function phMove(k, to) {   // gilt sofort für alle Projekte; bestehende Pläne erst mit „Reihenfolge im Plan anwenden“
  const ph = phEntwurf(), i = ph.findIndex((p) => p.k === k); if (i < 0) return;
  const [x] = ph.splice(i, 1); ph.splice(Math.max(0, Math.min(ph.length, to)), 0, x); phUebernehmen(); renderLib();
}
function phSchieb(k, d) { const i = phListe().findIndex((p) => p.k === k); if (i < 0 || i + d < 0 || i + d >= phListe().length) return false; libFocus = `input[data-phn="${k}"]`; phMove(k, i + d); return true; }   // Tastatur: Alt+↑ / Alt+↓ im Namen
function phLoesche(k, still) {   // eigener Abschnitt – seine Leistungen wandern in den Abschnitt davor (still: ohne eigenen Rückgängig-Schritt – „Zurücksetzen …“ legt einen für alles an)
  const i = CATALOG.phases.findIndex((p) => p.k === k); if (i < 0 || !CATALOG.phases[i].own || CATALOG.phases.length < 2) return;
  const to = (CATALOG.phases[i - 1] || CATALOG.phases[i + 1]).k;
  const altP = phStand, altL = window.LIBRARY, n = CATALOG.phases[i].n;   // ein Schritt: Abschnitt und seine Leistungen zusammen zurück
  CATALOG.phases.splice(i, 1); if (PHDRAFT) PHDRAFT = PHDRAFT.filter((p) => p.k !== k); savePhases(true);
  if (window.LIBRARY.some((x) => x.ph === k)) libSet(window.LIBRARY.map((x) => (x.ph === k ? { ...x, ph: to } : x)), false, true);
  if (!still) libSchritt(`Abschnitt „${n}“ gelöscht`, () => { CATALOG.phases.splice(0, CATALOG.phases.length, ...altP.map((p) => ({ ...p }))); PHDRAFT = null; savePhases(true); libSet(altL, true, true); });
}
function phNeu() {   // Befehlsleiste „Abschnitte“: umbenennen, Reihenfolge, neu, löschen – gilt sofort für alle Projekte
  if (!libDarf()) return libNurAdmin();
  let fokus = null;
  const zahl = (k) => CATALOG.items.filter((i) => i.ph === k).length + window.LIBRARY.filter((x) => x.ph === k).length;
  const liste = () => CATALOG.phases.map((p, i) => `<div class="pd-z" data-pdk="${p.k}"><span class="pd-grip" draggable="true" title="Ziehen, um die Reihenfolge zu ändern (oder im Namen Alt+↑ / Alt+↓)">⠿</span><span class="pd-nr">${i + 1}</span><input class="full" data-pdn="${p.k}" value="${esc(p.n)}" aria-label="Name des Abschnitts"><span class="pd-dim">${zahl(p.k)}${p.own ? '' : ' · Standard'}</span>${p.own ? `<button type="button" class="btn sm" data-m="weg" data-k="${p.k}" title="Eigenen Abschnitt löschen – seine Leistungen wandern in den Abschnitt davor">✕</button>` : '<span class="pd-leer"></span>'}</div>`).join('');
  const bg = modalBox(`<div class="mh">Abschnitte</div><div class="mb"><div class="hint">Namen und Reihenfolge gelten sofort für alle Projekte. Bestehende Pläne ordnet „Reihenfolge im Plan“ neu.</div><div class="pd-l"></div></div>
    <div class="mf"><button type="button" class="btn" data-m="neu">＋ Abschnitt</button><span class="pd-luft"></span><button type="button" class="btn primary" data-m="zu">Schließen</button></div>`, async (m, box, close, b) => {
    const k = b.dataset.k, i = CATALOG.phases.findIndex((p) => p.k === k);
    if (m === 'zu') { close(); return; }
    if (m === 'weg') { const p = CATALOG.phases[i]; if (!p || !(await bpFrage(`Abschnitt „${p.n}“ löschen? Seine ${zahl(k)} Leistungen wandern in den Abschnitt davor.`, { ok: 'Löschen' }))) return; phLoesche(k); renderLib(); }
    if (m === 'neu') { const nk = 'u' + Date.now().toString(36); CATALOG.phases.push({ k: nk, n: 'Neuer Abschnitt', own: true }); savePhases(); renderLib(); fokus = `input[data-pdn="${nk}"]`; }
    zeig();
  });
  const zeig = () => { const l = bg.querySelector('.pd-l'), st = l.scrollTop; l.innerHTML = liste(); l.scrollTop = st; if (fokus) { const el = l.querySelector(fokus); if (el && !el.disabled) { el.focus(); if (el.select) el.select(); el.scrollIntoView({ block: 'nearest' }); } fokus = null; } };
  const schieb = (k, to) => { PHDRAFT = null; phMove(k, to); zeig(); };   // ziehen oder Alt+↑/↓ – gilt sofort für alle Projekte
  let zieh = null; const L = bg.querySelector('.pd-l');
  L.addEventListener('dragstart', (e) => { const g = e.target.closest && e.target.closest('.pd-grip'); if (!g) return; zieh = g.closest('.pd-z').dataset.pdk; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', zieh); e.dataTransfer.setDragImage(g.closest('.pd-z'), 12, 12); } catch { /* egal */ } });
  const ziel = (e) => { const z = e.target.closest && e.target.closest('.pd-z'); if (!z) return null; const r = z.getBoundingClientRect(); return { z, unten: e.clientY > r.top + r.height / 2 }; };
  L.addEventListener('dragover', (e) => { if (!zieh) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const w = ziel(e);
    L.querySelectorAll('.pd-ueber,.pd-unter').forEach((x) => x.classList.remove('pd-ueber', 'pd-unter')); if (w) w.z.classList.add(w.unten ? 'pd-unter' : 'pd-ueber'); });
  L.addEventListener('drop', (e) => { if (!zieh) return; e.preventDefault(); const w = ziel(e), k = zieh; zieh = null; if (!w || w.z.dataset.pdk === k) { zeig(); return; }
    const ph = CATALOG.phases, von = ph.findIndex((p) => p.k === k); let nach = ph.findIndex((p) => p.k === w.z.dataset.pdk) + (w.unten ? 1 : 0); if (von < nach) nach--; schieb(k, nach); });
  L.addEventListener('dragend', () => { zieh = null; L.querySelectorAll('.pd-ueber,.pd-unter').forEach((x) => x.classList.remove('pd-ueber', 'pd-unter')); });
  L.addEventListener('keydown', (e) => { const t = e.target; if (!e.altKey || !t.dataset || !t.dataset.pdn || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return; e.preventDefault();
    const i = CATALOG.phases.findIndex((p) => p.k === t.dataset.pdn), d = e.key === 'ArrowUp' ? -1 : 1; if (i + d < 0 || i + d >= CATALOG.phases.length) return; fokus = `input[data-pdn="${t.dataset.pdn}"]`; schieb(t.dataset.pdn, i + d); });
  bg.addEventListener('change', (e) => { const t = e.target; if (!t.dataset || !t.dataset.pdn) return; const p = CATALOG.phases.find((x) => x.k === t.dataset.pdn), v = t.value.trim(); if (p && v && v !== p.n) { p.n = v; savePhases(); renderLib(); } else if (p) t.value = p.n; });
  zeig();
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
const phZiel = (el) => { let tr = el && el.closest && el.closest('#libView tbody tr'); while (tr && !tr.dataset.phk) tr = tr.previousElementSibling; return tr; };   // jede Zeile zählt zu ihrem Abschnitt
$('#libView').addEventListener('dragover', (e) => { if (!phDrag) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  const sc = $('#libView').querySelector('.fv-scroll'); if (sc) { const r = sc.getBoundingClientRect(), rand = 60; if (e.clientY < r.top + rand) sc.scrollTop -= 18; else if (e.clientY > r.bottom - rand) sc.scrollTop += 18; }
  const tr = phZiel(e.target); $('#libView').querySelectorAll('.lv-drop').forEach((x) => { if (x !== tr) x.classList.remove('lv-drop'); }); if (tr) tr.classList.add('lv-drop'); });
$('#libView').addEventListener('drop', (e) => { if (!phDrag) return; e.preventDefault(); const tr = phZiel(e.target); const k = phDrag; phDrag = null; if (!tr || tr.dataset.phk === k) { renderLib(); return; } const to = phListe().findIndex((p) => p.k === tr.dataset.phk); phMove(k, to); });
/* Eigene Leistungen ziehen – innerhalb des Abschnitts und in einen anderen (der Abschnitt der Leistung ändert sich mit).
   Ablegen: auf eine Leistung (obere/untere Hälfte = davor/danach), auf die Abschnittszeile (an den Anfang) oder auf eine Standardleistung (ans Ende der eigenen). */
let lDrag = null;
function libVerschieb(id, ph, vorId, text) {   // Leistung id in Abschnitt ph, vor die Leistung vorId (null = ans Ende des Abschnitts)
  const alt = window.LIBRARY, x = alt.find((y) => y.id === id); if (!x || vorId === id) return;
  const L = alt.filter((y) => y.id !== id), neu = { ...x, ph };
  let i = vorId ? L.findIndex((y) => y.id === vorId) : -1;
  if (i < 0) { const im = L.map((y, k) => (y.ph === ph ? k : -1)).filter((k) => k >= 0); i = im.length ? im[im.length - 1] + 1 : L.length; }
  L.splice(i, 0, neu);
  if (L.every((y, k) => y === alt[k] || (y === neu && alt[k] === x && x.ph === ph))) return;
  libFocus = `tr[data-lid="${id}"] .lv-lg`; libText = text || `Leistung „${x.n}“ verschoben`; libSet(L); renderLib();
}
const lZiel = (e) => {
  const tr = e.target.closest && e.target.closest('#libView tbody tr'); if (!tr) return null;
  if (tr.dataset.lid) { const r = tr.getBoundingClientRect(), unten = e.clientY > r.top + r.height / 2, ph = (window.LIBRARY.find((y) => y.id === tr.dataset.lid) || {}).ph;
    let vor = tr.dataset.lid; if (unten) { let n = tr.nextElementSibling; while (n && n.classList.contains('lv-sgrow')) n = n.nextElementSibling; vor = n && n.dataset.lid ? n.dataset.lid : null; }
    return { tr, ph, vor, cls: unten ? 'lv-dropu' : 'lv-drop' }; }
  if (tr.dataset.phk) { const erst = window.LIBRARY.find((y) => y.ph === tr.dataset.phk); return { tr, ph: tr.dataset.phk, vor: erst ? erst.id : null, cls: 'lv-dropu' }; }
  let h = tr; while (h && !h.dataset.phk) h = h.previousElementSibling;
  return h ? { tr, ph: h.dataset.phk, vor: null, cls: 'lv-drop' } : null;
};
$('#libView').addEventListener('dragstart', (e) => { const g = e.target.closest && e.target.closest('.lv-lg'); if (!g) return; e.stopPropagation(); lDrag = g.closest('tr').dataset.lid;
  e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', lDrag); e.dataTransfer.setDragImage(g.closest('tr'), 16, 16); } catch { /* egal */ } }, true);
$('#libView').addEventListener('dragover', (e) => { if (!lDrag) return; e.preventDefault(); e.stopImmediatePropagation(); e.dataTransfer.dropEffect = 'move';
  const sc = $('#libView').querySelector('.fv-scroll'); if (sc) { const r = sc.getBoundingClientRect(); if (e.clientY < r.top + 60) sc.scrollTop -= 18; else if (e.clientY > r.bottom - 60) sc.scrollTop += 18; }
  const w = lZiel(e); $('#libView').querySelectorAll('.lv-drop,.lv-dropu').forEach((x) => x.classList.remove('lv-drop', 'lv-dropu')); if (w) w.tr.classList.add(w.cls); }, true);
$('#libView').addEventListener('drop', (e) => { if (!lDrag) return; e.preventDefault(); e.stopImmediatePropagation(); const w = lZiel(e), id = lDrag; lDrag = null;
  $('#libView').querySelectorAll('.lv-drop,.lv-dropu').forEach((x) => x.classList.remove('lv-drop', 'lv-dropu'));
  if (!w || !libDarf()) { if (!libDarf()) libNurAdmin(); return; }
  const x = window.LIBRARY.find((y) => y.id === id), p = libPhases().find((q) => q.k === w.ph);
  libVerschieb(id, w.ph, w.vor, x && p && x.ph !== w.ph ? `„${x.n}“ nach „${p.n}“ verschoben` : null); }, true);
$('#libView').addEventListener('dragend', () => { lDrag = null; $('#libView').querySelectorAll('.lv-drop,.lv-dropu').forEach((x) => x.classList.remove('lv-drop', 'lv-dropu')); }, true);
$('#libView').addEventListener('keydown', (e) => {   // Leistung ohne Maus: Alt+↑ / Alt+↓ im Namen – am Rand des Abschnitts in den nächsten
  const t = e.target; if (!e.altKey || t.dataset.k !== 'n' || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  const tr = t.closest('tr[data-lid]'); if (!tr) return; e.preventDefault(); if (!libDarf()) { libNurAdmin(); return; }
  const id = tr.dataset.lid, ph = libPhases().map((p) => p.k), x = window.LIBRARY.find((y) => y.id === id); if (!x) return;
  const reihe = ph.flatMap((k) => window.LIBRARY.filter((y) => y.ph === k)), i = reihe.indexOf(x), auf = e.key === 'ArrowUp';
  const nb = reihe[i + (auf ? -1 : 1)], pi = ph.indexOf(x.ph);
  if (nb && nb.ph === x.ph) libVerschieb(id, x.ph, auf ? nb.id : (reihe[i + 2] && reihe[i + 2].ph === x.ph ? reihe[i + 2].id : null));
  else if (auf ? pi > 0 : pi < ph.length - 1) { const z = ph[pi + (auf ? -1 : 1)], erst = window.LIBRARY.find((y) => y.ph === z); libVerschieb(id, z, auf ? null : (erst ? erst.id : null)); }
  libFocus = `tr[data-lid="${id}"] input[data-k="n"]`; renderLib();
});
$('#libView').addEventListener('keydown', (e) => {   // Abschnitt verschieben ohne Maus: Alt+↑ / Alt+↓ im Namen
  const t = e.target; if (!e.altKey || !t.dataset || !t.dataset.phn || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault(); if (!libDarf()) { libNurAdmin(); return; } phSchieb(t.dataset.phn, e.key === 'ArrowUp' ? -1 : 1);
});
$('#libView').addEventListener('dragend', () => { phDrag = null; $('#libView').querySelectorAll('.lv-drop').forEach((x) => x.classList.remove('lv-drop')); });

function libKlapp() {   // drei Stellungen je Klick: alles offen → nur eigene (Standard ausgeblendet) → nur Abschnitte → alles offen
  libEk = (libEk + 1) % 3; libZu = new Set(libEk === 2 ? libPhases().map((p) => p.k) : []);
  LS.set('libEk', libEk); LS.set('libZu', [...libZu]); renderLib();
}
function libPhKlapp(k) { if (libZu.has(k)) libZu.delete(k); else libZu.add(k); LS.set('libZu', [...libZu]); renderLib(); }

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

$('#libView').addEventListener('change', (e) => {
  const t = e.target;
  if (typeof katNetzAendern === 'function' && katNetzAendern(e)) return;
  if (t.dataset.kbd) {   // Richtdauer einer Werk-Leistung: Abweichung des Büros (K5-A)
    if (!libDarf()) { libNurAdmin(); return renderLib(); }
    const i = CATALOG.items.find((y) => y.id === t.dataset.kbd), v = Math.max(0.5, Math.min(999, Math.round((+String(t.value).replace(',', '.') || 1) * 2) / 2));
    if (i) KatBuero.setzen(i.id, { d: v }, `${i.n}: Richtdauer ${v} AT`); renderLib(); return;
  }
  if (t.dataset.phn) { const p = phEntwurf().find((x) => x.k === t.dataset.phn); const v = t.value.trim(); if (p && v && v !== p.n) { p.n = v; phUebernehmen(); toast(`Abschnitt heißt jetzt „${v}“ – gilt für alle Projekte.`); } else PHDRAFT = null; renderLib(); return; }
  if (t.dataset.sscope) {
    const i = CATALOG.items.find((y) => y.id === t.dataset.sscope); if (!i) return;
    const m = { ...(window.CATSCOPE || {}) }; if (t.value === i.sc) delete m[i.id]; else m[i.id] = t.value;
    window.CATSCOPE = m; saveCatScope(); if (window.AssistCore) AssistCore.notifySoon(); renderLib();
    toast(`„${i.n}“: neue Planungen ${t.value === 'bau' ? 'einmal für das Gebäude' : 'je Einheit / Wohnung'}.`);
    return;
  }
  const tr = t.closest('tr[data-lid]'); if (!tr || !t.dataset.k) return;
  const id = tr.dataset.lid, k = t.dataset.k, x = window.LIBRARY.find((y) => y.id === id); if (!x) return;
  let v = t.value; const f = {};
  if (k === 'd') v = Math.max(1, Math.min(999, Math.round(+v) || 1));
  if (k === 'a' || k === 'b') v = v ? [v] : [];
  if (k === 'sc') { f.ms = v === 'ms' ? 1 : 0; if (v === 'ms') v = 'bau'; }   // Meilenstein: ein Termin für das Gebäude, ohne Dauer
  if (typeof v === 'string') v = v.trim();
  f[k] = v;
  if (k === 'gw' && v) { gwColor(v); if (!x.din) f.din = libDinFor(v, x.n); }
  if (k === 'n' && v && !x.gw) { const s = AssistCore.dinSuggest(v)[0]; if (s) { f.gw = s.gw; f.din = x.din || s.din; gwColor(s.gw); } }
  libUpd(id, f); renderLib();
});
$('#libView').addEventListener('input', (e) => { if (e.target.id === 'libQ') { libQuery = e.target.value; libFocus = '#libQ'; renderLib(); const q = $('#libQ'); if (q) { const n = q.value.length; q.setSelectionRange(n, n); } } });
$('#libView').addEventListener('click', (e) => {
  const kl = e.target.closest && e.target.closest('[data-phklapp]'); if (kl) { libPhKlapp(kl.dataset.phklapp); return; }
  if (typeof katNetzKlick === 'function' && katNetzKlick(e)) return;
  const nz = e.target.closest('[data-lnetz]'); if (nz) { LIBNETZ = nz.dataset.lnetz; LIBMODUS = 'netz'; LS.set('libModus', 'netz'); renderLib(); return; }
  const md = e.target.closest('[data-lmodus]'); if (md) { LIBMODUS = md.dataset.lmodus; LS.set('libModus', LIBMODUS); renderLib(); return; }
  const lz = e.target.closest('[data-lern]'); if (lz) { libLernKlick(lz); return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.kbz) { if (!libDarf()) return libNurAdmin(); const [id, f] = b.dataset.kbz.split(':'); KatBuero.zurueck(id, f); renderLib(); return; }
  if (b.dataset.phdel) {
    const k = b.closest('tr').dataset.phk;
    if (libDelAsk !== 'ph:' + k) { libDelAsk = 'ph:' + k; renderLib(); setTimeout(() => { if (libDelAsk === 'ph:' + k) { libDelAsk = null; renderLib(); } }, 3000); return; }
    libDelAsk = null; phLoesche(k);
    renderLib(); return;
  }
  if (b.dataset.lnew) { libNew(b.dataset.lnew); return; }
  if (b.dataset.lwiz) { leistungWizard({ ph: b.dataset.lwiz }); return; }
  if (b.dataset.rec) { const id = b.closest('tr').dataset.lid, x = window.LIBRARY.find((y) => y.id === id), r = new Set(x.rec || []); if (r.has(b.dataset.rec)) r.delete(b.dataset.rec); else r.add(b.dataset.rec); libUpd(id, { rec: [...r] }); renderLib(); return; }
  if (b.dataset.ldup) { const x = window.LIBRARY.find((y) => y.id === b.dataset.ldup); libNew(x.ph, { ...x, n: x.n + ' (Kopie)', from: x.id, src: 'Kopie von „' + x.n + '“' }); return; }
  if (b.dataset.lcopy) { const i = CATALOG.items.find((y) => y.id === b.dataset.lcopy); libNew(i.ph, { n: i.n, gw: i.gw, din: i.din || '', sc: i.sc, ...(i.ms ? { ms: 1 } : {}), d: i.d || 1, a: (i.a || []).map((z) => (Array.isArray(z) ? z[0] : z)).filter((z) => z !== 'start').slice(0, 1), craft: (typeof CRAFT !== 'undefined' && CRAFT[i.gw]) || '', src: 'Standardkatalog', from: i.id }); return; }
  if (b.dataset.ldel) {
    if (libDelAsk !== b.dataset.ldel) { libDelAsk = b.dataset.ldel; renderLib(); setTimeout(() => { if (libDelAsk === b.dataset.ldel) { libDelAsk = null; renderLib(); } }, 3000); return; }
    libDelAsk = null; libSet(window.LIBRARY.filter((y) => y.id !== b.dataset.ldel)); renderLib(); return;
  }
  if (b.dataset.lplan) { libToPlan(b.dataset.lplan); return; }
});
function libToPlan(id) {
  if (!P) return;
  const x = window.LIBRARY.find((y) => y.id === id); if (!x) return;
  const st = AssistCore.status();
  if (st.live) {
    if (st.pres[id]) { toast(`„${x.n}“ ist schon im Plan.`); return; }
    if (AssistCore.toggle(id, true) !== false) toast(`„${x.n}“ in „${libPhName(x.ph)}“ eingefügt und verknüpft.`);
  } else if (AssistCore.insertSingle(id, P.assist || { type: 'frei' }) !== false) {
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

/* ---------- Leistungs-Assistent: neue Leistung Schritt für Schritt (Leistungskatalog und „Assistent einrichten“) ----------
   leistungWizard({ ph, rec: ['neubau_efh'], onDone(x) }) – legt die Leistung im Leistungskatalog an.
   Jeder Schritt hat einen Vorschlag; „Fertig“ geht jederzeit, der Rest bleibt beim Vorschlag. */
function leistungWizard(opt = {}) {
  const profs = CATALOG.profiles.filter((p) => p.k !== 'frei' && !p.hidden);
  const f = { n: '', ph: opt.ph || '', gw: '', din: '', d: 2, sc: 'we', a: '', b: '', rec: [...(opt.rec || [])] };
  let step = 0, guessed = false, why = '';
  const STEPS = ['Bezeichnung', 'Abschnitt und Gewerk', 'Dauer', 'Reihenfolge', 'Gebäudetypen'];
  const bg = document.createElement('div'); bg.className = 'modal-bg lw-bg';
  bg.innerHTML = `<div class="modal lw" role="dialog" aria-label="Neue Leistung"><div class="mh">Neue Leistung – Assistent<button type="button" class="mx" title="Schließen (Esc)" aria-label="Schließen">✕</button></div>
    <div class="lw-steps"></div><div class="mb lw-b"></div><div class="mf lw-f"></div></div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  const guess = () => {   // Vorschläge aus der Bezeichnung (Abschnitt, Gewerk, DIN, Bezug)
    if (guessed || !f.n.trim()) return; guessed = true;
    const sug = (window.AssistCore && AssistCore.dinSuggest(f.n)[0]) || null;
    if (!f.gw && sug) f.gw = sug.gw || '';
    if (!f.ph) f.ph = libGuessPh(f.n, f.gw);
    if (!f.din) f.din = libDinFor(f.gw, f.n);
    const v = window.LeistungVorschlag ? LeistungVorschlag.platz(f.n.trim(), (typeof P !== 'undefined' && P && P.assist) || { type: 'frei' }, f.ph) : null;   // Textvergleich mit dem Katalog, ohne KI (K6-A)
    if (v) { if (!f.a) f.a = (v.a || [])[0] || ''; if (!f.b) f.b = (v.b || [])[0] || ''; why = v.why || ''; }
    const sim = CATALOG.items.find((i) => i.gw === f.gw && i.ph === f.ph);
    if (sim) { f.sc = sim.sc || f.sc; if (sim.d) f.d = sim.d; }
    else f.sc = ['planung', 'vorb', 'abbruch', 'erd', 'rohbau', 'huelle', 'aussen'].includes(f.ph) ? 'bau' : 'we';   // Gebäude oder je Einheit
  };
  const read = () => {
    bg.querySelectorAll('[data-lw]').forEach((el) => {
      const k = el.dataset.lw;
      if (k === 'rec') return;
      f[k] = k === 'ms' ? (el.checked ? 1 : 0) : k === 'd' ? Math.max(1, Math.round(+el.value) || 1) : el.value;
    });
    if (step === 4) f.rec = [...bg.querySelectorAll('[data-lw="rec"]:checked')].map((x) => x.value);
  };
  const phOpts = () => libPhases().map((p) => `<option value="${p.k}"${p.k === f.ph ? ' selected' : ''}>${esc(p.n)}</option>`).join('');
  function draw() {
    bg.querySelector('.lw-steps').innerHTML = STEPS.map((s, i) => `<button class="${i === step ? 'on' : i < step ? 'done' : ''}" data-lwgo="${i}"${!f.n.trim() && i ? ' disabled' : ''}>${i + 1}. ${esc(s)}</button>`).join('');
    let h = '';
    if (step === 0) h = `<p class="lw-q">Wie heißt die Leistung?</p><input data-lw="n" class="lw-in" value="${esc(f.n)}" placeholder="z. B. Bewehrungsabnahme, Innenputz Kalk, Treppenlift einbauen" autocomplete="off">
      <p class="lw-h">Aus der Bezeichnung schlägt der Assistent Abschnitt, Gewerk, DIN und Dauer vor. Mit „Fertig“ kannst du jederzeit abschließen – der Rest bleibt beim Vorschlag.</p>`;
    else if (step === 1) h = `<p class="lw-q">In welchen Abschnitt gehört sie, und welches Gewerk führt sie aus?</p>
      <label>Abschnitt<select data-lw="ph">${phOpts()}</select></label>
      <label>Gewerk<input data-lw="gw" list="lwGw" value="${esc(f.gw)}" placeholder="z. B. Rohbau, Statiker:in, Architekt:in"></label>
      <label>DIN (ATV)<input data-lw="din" list="lwDin" value="${esc(f.din)}" placeholder="z. B. 18331"></label>
      <datalist id="lwGw">${AssistCore.gewerke().map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
      <datalist id="lwDin">${(window.DIN_ATV || []).map((x) => `<option value="${x[0]}">${esc(x[1])}</option>`).join('')}</datalist>`;
    else if (step === 2) h = `<p class="lw-q">Wie lange dauert sie, und gilt sie einmal für das Gebäude, je Geschoss oder je Wohnung/Einheit?</p>
      <label>Richtdauer (Arbeitstage)<input data-lw="d" type="number" min="1" max="999" value="${f.d}" class="lw-n"></label>
      <label>Bezug<select data-lw="sc"><option value="bau"${f.sc === 'bau' ? ' selected' : ''}>einmal für das Gebäude</option><option value="gs"${f.sc === 'gs' ? ' selected' : ''}>je Geschoss</option><option value="we"${f.sc === 'we' ? ' selected' : ''}>je Einheit (Wohnung, Bauabschnitt)</option></select></label>
      <label class="lw-cb"><input type="checkbox" data-lw="ms"${f.ms ? ' checked' : ''}> als Meilenstein eintragen (◆ ohne Dauer – z. B. Genehmigung, Abnahme, Übergabe)</label>
      <p class="lw-h">${f.sc === 'gs' ? 'Je Geschoss: die Richtdauer wird mit der Zahl der Geschosse (mit Keller und ausgebautem Dach) malgenommen – ein Vorgang für das Gebäude.' : 'Die Richtdauer gilt für die Referenzgröße und wird im Assistenten mit der Fläche skaliert.'}</p>`;
    else if (step === 3) h = `<p class="lw-q">Wann kommt sie dran?</p>
      <label>beginnt nach<select data-lw="a"><option value="">automatisch – am Ende des Abschnitts</option>${libPredOpts(f.a, '')}</select></label>
      <label>muss fertig sein vor<select data-lw="b"><option value="">–</option>${libPredOpts(f.b, '')}</select></label>`;
    else h = `<p class="lw-q">Bei welchen Gebäudetypen soll sie im Assistenten schon angehakt sein (empfohlen)?</p>
      <div class="lw-pr">${profs.map((p) => `<label class="chk"><input type="checkbox" data-lw="rec" value="${p.k}"${f.rec.includes(p.k) ? ' checked' : ''}> ${esc(p.ic || '')} ${esc(p.n)}</label>`).join('')}</div>
      <p class="lw-h">Bei den übrigen Typen steht sie unter „Weitere Leistungen“.</p>`;
    if (why) h += `<p class="lw-ki">Vorschlag aus dem Katalog: ${esc(why)} – bitte prüfen.</p>`;
    bg.querySelector('.lw-b').innerHTML = h;
    bg.querySelector('.lw-f').innerHTML = `${step ? '<button class="btn" data-lwb="back">Zurück</button>' : ''}<span style="flex:1"></span>
      <button class="btn" data-lwb="x">Abbrechen</button>${step < STEPS.length - 1 ? '<button class="btn" data-lwb="next">Weiter</button>' : ''}<button class="btn primary" data-lwb="ok"${f.n.trim() ? '' : ' disabled'}>Fertig</button>`;
    const fi = bg.querySelector('.lw-b input, .lw-b select'); if (fi) { fi.focus(); if (fi.select && step === 0) fi.select(); }
  }
  async function done() {
    read(); guess();
    const x = libClean({ n: f.n.trim(), ph: f.ph || 'ausbau', gw: f.gw.trim(), din: f.din.trim(), d: f.d, sc: f.sc, ms: f.ms, a: f.a ? [f.a] : [], b: f.b ? [f.b] : [], rec: f.rec });
    try { await window.Library.add(x); } catch { return; }
    close(); toast(`„${x.n}“ angelegt – steht im Leistungskatalog und im Planungsassistenten.`);
    if (opt.onDone) opt.onDone(x);
  }
  bg.addEventListener('click', (e) => {
    if (e.target.closest('.mx')) { close(); return; }
    const go = e.target.closest('[data-lwgo]'); if (go && !go.disabled) { read(); guess(); step = +go.dataset.lwgo; draw(); return; }
    const b = e.target.closest('[data-lwb]'); if (!b) return;
    const a = b.dataset.lwb;
    if (a === 'x') close();
    else if (a === 'back') { read(); step--; draw(); }
    else if (a === 'next') { read(); if (!f.n.trim()) return; guess(); step++; draw(); }
    else if (a === 'ok') done();
  });
  bg.addEventListener('input', (e) => { if (e.target.dataset.lw === 'n') { f.n = e.target.value; guessed = false; why = '';
      f.gw = f.din = ''; if (!opt.ph) f.ph = ''; const ok = bg.querySelector('[data-lwb="ok"]'); if (ok) ok.disabled = !f.n.trim(); } });
  bg.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); read(); if (!f.n.trim()) return; if (step < STEPS.length - 1) { guess(); step++; draw(); } else done(); }
  });
  draw();
}
window.leistungWizard = leistungWizard;

/* Hinweise in den Köpfen (Katalog, Gewerke & Firmen) stehen einzeilig – der ganze Text als Tipp beim Darüberfahren */
document.addEventListener('mouseover', (e) => { const h = e.target.closest && e.target.closest('.fv-hint'); if (h && !h.title) h.title = h.textContent.trim(); });

/* ---------- Sichern: benannte Stände, Vergleich, Zurückholen in Teilen, Datei (Server: gantt/katalog.py) ---------- */
const KST_TEILE = [['leistungen', 'Leistungen', 'eigene Leistungen mit Dauer, Reihenfolge, Vorauswahl', true], ['abschnitte', 'Abschnitte', 'Namen und Reihenfolge', true],
  ['vorgaben', 'Firmen-Vorgaben', 'Firma je Gewerk, Bezug', true], ['firmen', 'Firmen im Adressbuch', 'Kontaktdaten – gelten für alle Apps; geändert oder wieder angelegt, nie gelöscht', false]];
const kstZ = (z) => z ? `${z.leistungen} Leistungen · ${z.abschnitte} Abschnitte · ${z.vorgaben} Vorgaben · ${z.firmen} Firmen` : '';
const kstDe = (t) => (t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)} ${t.slice(11, 16)}` : '');
async function kstSichern() {
  if (!libDarf()) { libNurAdmin(); return; }
  const n = await bpEingabe('Stand sichern – Name', 'vor Umbau ' + new Date().toLocaleDateString('de-DE'), { ok: 'Sichern' }); if (n == null) return;
  try { await fetch('api/katalog/staende', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) }).then(j); toast(`Stand „${n}“ gesichert.`); }
  catch (e) { toast(e.message, true); }
}
async function kstListe() {
  let D; try { D = await fetch('api/katalog/staende').then(j); } catch (e) { toast(e.message, true); return; }
  const html = () => `<div class="hint" style="margin:0 0 6px">Jetzt: ${kstZ(D.jetzt)}</div>
    <div class="kst-l">${D.staende.map((x) => `<div class="kst${x.fest ? ' fest' : ''}" data-sid="${x.id}"><div><b>${x.fest ? '⭐ ' : ''}${esc(x.name)}</b><small>${kstDe(x.am)} · ${esc(x.von || '')} · ${kstZ(x.zahlen)}</small><div class="kst-d" hidden></div></div>
      <div class="kst-a"><button type="button" class="btn sm" data-kv>Vergleichen</button>${D.admin ? `<button type="button" class="btn sm" data-kz>Zurückholen …</button><button type="button" class="btn sm" data-kf title="${x.fest ? 'Schutz aufheben' : 'Schützen – wird nie automatisch weggeräumt'}">${x.fest ? '☆' : '⭐'}</button>${x.fest ? '' : '<button type="button" class="btn sm" data-kx title="Löschen">✕</button>'}` : ''}</div></div>`).join('') || '<div class="hint">Noch kein gesicherter Stand.</div>'}</div>
    <div class="g-sec">Als Datei</div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><a class="btn sm" href="api/katalog/datei" download>⬇ Herunterladen</a>${D.admin ? '<label class="btn sm">⬆ Datei einlesen<input type="file" accept=".json,application/json" data-kdatei hidden></label><span class="hint">Eingelesene Dateien erscheinen oben als Stand – zurückgeholt wird erst auf Wunsch.</span>' : ''}</div>`;
  const bg = modal('Leistungskatalog – Stände', `<div id="kstBox">${html()}</div>`, [{ label: 'Schließen', cls: 'primary', primary: true }]);
  bg.querySelector('.modal').style.width = 'min(820px, 96vw)';
  const neu = (d) => { if (d && d.staende) D.staende = d.staende; bg.querySelector('#kstBox').innerHTML = html(); };
  const api2 = (u, m, b) => fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then(j);
  bg.addEventListener('change', async (e) => { const f = e.target.closest('[data-kdatei]'); if (!f || !f.files[0]) return;
    const fd = new FormData(); fd.append('datei', f.files[0]);
    try { neu(await fetch('api/katalog/datei', { method: 'POST', body: fd }).then(j)); toast('Datei als Stand abgelegt – mit „Zurückholen …“ übernehmen.'); } catch (er) { toast(er.message, true); } });
  bg.addEventListener('click', async (e) => {
    const row = e.target.closest('[data-sid]'); if (!row) return; const sid = row.dataset.sid, x = D.staende.find((y) => y.id === sid);
    try {
      if (e.target.closest('[data-kv]')) { const v = await fetch(`api/katalog/staende/${sid}/vergleich`).then(j), d = row.querySelector('.kst-d');
        d.innerHTML = KST_TEILE.map(([k, l]) => { const z = v.seither[k]; return `<span>${l}: ${z.dazu || z.weg || z.anders ? `${z.dazu ? `<b class="pl">+${z.dazu}</b> seither dazu ` : ''}${z.weg ? `<b class="mi">−${z.weg}</b> seither weg ` : ''}${z.anders ? `~${z.anders} geändert` : ''}` : 'gleich'}</span>`; }).join('');
        d.hidden = !d.hidden; return; }
      if (e.target.closest('[data-kf]')) { neu(await api2(`api/katalog/staende/${sid}`, 'PUT', { fest: !x.fest })); return; }
      if (e.target.closest('[data-kx]')) { if (!(await bpFrage(`Stand „${x.name}“ löschen?`, { ok: 'Löschen', gefahr: true }))) return; neu(await api2(`api/katalog/staende/${sid}`, 'DELETE')); return; }
      if (e.target.closest('[data-kz]')) { bg.remove(); kstZurueck(x); }
    } catch (er) { toast(er.message, true); }
  });
}
async function kstZurueck(x) {
  let v = null; try { v = await fetch(`api/katalog/staende/${x.id}/vergleich`).then(j); } catch { /* ohne Vergleich */ }
  const zl = (k) => { const z = v && v.seither[k]; return z ? (z.dazu || z.weg || z.anders ? ` – seither ${[z.dazu ? z.dazu + ' dazu' : '', z.weg ? z.weg + ' weg' : '', z.anders ? z.anders + ' geändert' : ''].filter(Boolean).join(', ')}` : ' – gleich') : ''; };
  modal(`„${x.name}“ zurückholen`, `<div class="hint" style="margin:0 0 8px">Gesichert ${kstDe(x.am)}. Vorher wird der jetzige Stand automatisch gesichert – zurück geht also jederzeit. Laufende Projektpläne ändern sich nicht.</div>
    ${KST_TEILE.map(([k, l, t, an]) => `<label class="cb" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="checkbox" data-kt="${k}"${an ? ' checked' : ''}><span><b>${l}</b>${esc(zl(k))}<br><small class="hint">${t}</small></span></label>`).join('')}`,
  [{ label: 'Zurückholen', cls: 'primary', primary: true, fn: (bg) => {
    const teile = [...bg.querySelectorAll('[data-kt]:checked')].map((c) => c.dataset.kt); if (!teile.length) { toast('Bitte mindestens einen Teil wählen.', true); return false; }
    fetch(`api/katalog/staende/${x.id}/zurueck`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teile }) }).then(j)
      .then(async (r) => { await loadLibrary(); if (teile.includes('firmen') && typeof loadFirms === 'function') await loadFirms(); renderLib();
        toast(`„${x.name}“ zurückgeholt${r.firmen ? ` (${r.firmen} Firmen)` : ''}. Der vorige Stand ist gesichert.`); })
      .catch((er) => toast(er.message, true));
  } }, { label: 'Abbrechen', fn: () => { setTimeout(kstListe, 0); } }]);
}
