/* Pläne & Dateien → „Alle Dateien“: Dateien ändern (GO 17.11.2026, W1 X1 Y1) – Kontextmenü (Rechtsklick, am Tablet lange drücken),
   Strg+C/X/V, F2, Entf, Ziehen auf einen Ordner links (verschieben, mit Strg kopieren), „Kopieren/Verschieben nach …“ (auch in ein
   anderes Projekt), Papierkorb mit Wiederherstellen. Jede Änderung mit Rückgängig (oben links, Strg+Z) – der Server gibt die Schritte
   zurück, mit denen sie sich umkehren lässt. Server: plaene_alle.py → Bautagebuch modules/dateiops.py. Das Menü zeigt head.js
   (Ereignis bph:kontext). Benutzt die gemeinsamen Namen von plaene.html und plaene-alle.js. */
let ALLE_CLIP = null;   // { art: 'kopieren' | 'verschieben', pid, pfade }
const doNurLesen = () => document.documentElement.classList.contains('bp-nurlesen');
const doName = (p) => p.split('/').pop();
const doOrdnerVon = (p) => p.split('/').slice(0, -1).join('/');

function doMarkiert(x) {   // die markierten Pfade – ist die angeklickte Datei nicht dabei, nur sie
  if (x && !ALLE_MARK.has(x)) return [x];
  return [...ALLE_MARK].filter((p) => (alleListe() || []).some((y) => y.pfad === p));
}

async function doAktion(b, text) {
  const body = { project_id: pid, ...b };
  let r;
  try {
    r = await api('api/alle/aktion', 'POST', body);
    if (r && r.konflikte) {
      const k = r.konflikte;
      const w = await bpFrage(`${k.length > 1 ? k.length + ' Namen gibt' : `„${k[0]}“ gibt`} es im Ziel schon.\n${k.slice(0, 6).join('\n')}${k.length > 6 ? '\n…' : ''}`,
        { ok: 'Beide behalten', drei: 'Ersetzen', abbrechen: 'Überspringen' });
      body.konflikt = w === 'drei' ? 'ersetzen' : w ? 'beide' : 'ueberspringen';
      r = await api('api/alle/aktion', 'POST', body);
    }
  } catch (e) { toast(e.message, true); return null; }
  if (r.testserver) { toast('Testserver: auf dem Dateiserver wurde nichts geändert.', true); return r; }
  if (!r.schritte || !r.schritte.length) { toast('Nichts geändert.'); return r; }
  await alleLaden(false);
  let S = r.schritte;
  const um = async () => { try { const z = await api('api/alle/aktion', 'POST', { project_id: pid, art: 'zurueck', schritte: S }); S = z.schritte || []; await alleLaden(false); } catch (e) { toast(e.message, true); } };
  if (window.rueckgaengig) rueckgaengig(text, um, 10000, um); else toast(text);
  return r;
}

const doKopieren = (pfade, art) => { ALLE_CLIP = { art, pid, pfade }; toast(`${pfade.length > 1 ? pfade.length + ' Einträge' : '„' + doName(pfade[0]) + '“'} ${art === 'kopieren' ? 'kopiert' : 'ausgeschnitten'} – mit Strg+V in einen Ordner einfügen.`); };
async function doEinfuegen(ziel) {
  const c = ALLE_CLIP; if (!c) return;
  const r = await doAktion({ art: c.art, pfade: c.pfade, ziel, ...(c.pid !== pid ? { project_id: c.pid, ziel_projekt: pid } : {}) },
    `${c.pfade.length > 1 ? c.pfade.length + ' Einträge' : '„' + doName(c.pfade[0]) + '“'} ${c.art === 'kopieren' ? 'eingefügt' : 'verschoben'}`);
  if (r && r.schritte && c.art === 'verschieben') ALLE_CLIP = null;
}
async function doUmbenennen(pfad) {
  const n = await bpEingabe('Neuer Name', doName(pfad), { ok: 'Umbenennen' }); if (!n || n.trim() === doName(pfad)) return;
  const r = await doAktion({ art: 'umbenennen', pfade: [pfad], name: n.trim() }, `Umbenannt in „${n.trim()}“`);
  if (r && r.schritte && r.schritte.length && AF.ordner === pfad) alleSetzen({ ordner: doOrdnerVon(pfad) ? doOrdnerVon(pfad) + '/' + n.trim() : n.trim() });
}
async function doNeuerOrdner(ziel) {
  const n = await bpEingabe('Name des neuen Ordners', 'Neuer Ordner', { ok: 'Anlegen' }); if (!n || !n.trim()) return;
  const r = await doAktion({ art: 'ordner', ziel, name: n.trim() }, `Ordner „${n.trim()}“ angelegt`);
  if (r && r.schritte && r.schritte.length && ziel) { ALLE_AUF.add(ziel); alleAufMerken(); render(); }
}
const doLoeschen = (pfade) => doAktion({ art: 'loeschen', pfade }, `${pfade.length > 1 ? pfade.length + ' Einträge' : '„' + doName(pfade[0]) + '“'} in den Papierkorb gelegt`);
function doWiederherstellen(pfade) {   // je Datei an ihren alten Platz (auch ganze Ordner im Papierkorb)
  const L = (alleListe() || []).filter((x) => pfade.some((p) => x.pfad === p || x.pfad.startsWith(p + '/'))).map((x) => x.pfad).filter((p) => p.split('/').length > 2);
  if (!L.length) { toast('Darin liegen keine Dateien.'); return; }
  doAktion({ art: 'wiederherstellen', pfade: L }, `${L.length > 1 ? L.length + ' Dateien' : '„' + doName(L[0]) + '“'} wiederhergestellt`);
}

/* „Kopieren nach …“ / „Verschieben nach …“: Projekt und Ordner wählen */
async function doNach(pfade, art) {
  let zp = pid, ziel = AF.ordner && !alleImPk(AF.ordner) ? AF.ordner : '', ord = [], q = '';
  const laden = async () => {
    if (zp === pid) { ord = Object.keys(alleListe().reduce((m, x) => { const t = x.ordner ? x.ordner.split('/') : []; for (let i = 1; i <= t.length; i++) m[t.slice(0, i).join('/')] = 1; return m; }, Object.fromEntries((ALLE.ordner || []).map((o) => [o, 1])))); }
    else { try { const d = await api(`api/alle?project_id=${zp}`); const m = {}; (d.ordner || []).forEach((o) => { m[o] = 1; }); (d.dateien || []).forEach(([p]) => { const t = p.split('/').slice(0, -1); for (let i = 1; i <= t.length; i++) m[t.slice(0, i).join('/')] = 1; }); ord = Object.keys(m); } catch (e) { toast(e.message, true); ord = []; } }
    ord = ord.filter((o) => !alleImPk(o)).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  };
  await laden();
  const projekte = (PROJ || []).filter((p) => !p.archived || p.id === pid);
  const liste = () => ['', ...ord.filter((o) => !q || o.toLowerCase().includes(q))].map((o) => `<button type="button" class="do-o${o === ziel ? ' on' : ''}" data-dozi="${esc(o)}" style="padding-left:${0.5 + (o ? o.split('/').length : 0) * 0.8}rem">${o ? '📁 ' + esc(doName(o)) : '🏠 Projektordner'}</button>`).join('');
  modalBox(`<h3>${art === 'kopieren' ? 'Kopieren' : 'Verschieben'} nach …</h3>
    <div class="do-nach"><p class="mu" style="margin:0 0 .5rem">${pfade.length > 1 ? pfade.length + ' Einträge' : '„' + esc(doName(pfade[0])) + '“'} – Projekt und Ordner wählen</p>
      <div class="do-pj">${projekte.map((p) => `<button type="button" class="chip${p.id === zp ? ' on' : ''}" data-dop="${p.id}">${esc(p.name)}</button>`).join('')}</div>
      <input type="search" placeholder="🔍 Ordner suchen …" data-doq>
      <div class="do-ol" data-dool>${liste()}</div></div>
    <div class="acts"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">${art === 'kopieren' ? 'Hierher kopieren' : 'Hierher verschieben'}</button></div>`,
  async (m, bg, close) => {
    if (m === 'x') return close();
    if (m === 'ok') { close(); await doAktion({ art, pfade, ziel, ziel_projekt: zp }, `${pfade.length > 1 ? pfade.length + ' Einträge' : '„' + doName(pfade[0]) + '“'} ${art === 'kopieren' ? 'kopiert' : 'verschoben'} nach „${ziel ? doName(ziel) : 'Projektordner'}“${zp !== pid ? ' (' + ((PROJ.find((p) => p.id === zp) || {}).name || '') + ')' : ''}`); }
  });
  const bg = [...document.querySelectorAll('.modal-bg')].pop(); bg.querySelector('.modal').classList.add('wide');
  const neu = () => { bg.querySelector('[data-dool]').innerHTML = liste(); };
  bg.addEventListener('click', async (e) => {
    const o = e.target.closest('[data-dozi]'); if (o) { ziel = o.dataset.dozi; neu(); return; }
    const p = e.target.closest('[data-dop]'); if (p) { zp = +p.dataset.dop; ziel = ''; bg.querySelectorAll('[data-dop]').forEach((b) => b.classList.toggle('on', b === p)); await laden(); neu(); }
  });
  bg.addEventListener('input', (e) => { if (e.target.matches('[data-doq]')) { q = e.target.value.trim().toLowerCase(); neu(); } });
  const on = bg.querySelector('[data-dop].on'); if (on) on.scrollIntoView({ block: 'nearest' });
}

/* Kontextmenü: Dateien (Kacheln, Zeilen) und Ordner (Baum links) */
document.addEventListener('bph:kontext', (e) => {
  if (tab !== 'alle' || !ALLE || ALLE.error) return;
  const d = e.detail, z = d.ziel, datei = z.closest('#viewA [data-ap]'), ordner = z.closest('.al-b [data-aord]');
  if (!datei && !ordner) return;
  d.nur = true;
  const P = d.punkte, ro = doNurLesen(), aus = (x) => x || ro;
  if (datei) {
    const p = datei.dataset.ap; if (!ALLE_MARK.has(p)) { const x = alleListe().find((y) => y.pfad === p); if (x) alleWaehlen(x); }
    const L = doMarkiert(p), eins = L.length === 1, imPk = alleImPk(p);
    P.push({ titel: eins ? doName(p) : `${L.length} Dateien markiert` });
    if (eins) { const i = alleSichtbar.F.findIndex((y) => y.pfad === p); P.push({ text: 'Öffnen', k: 'Enter', fn: () => alleOeffnen(i) }, { text: 'Herunterladen', fn: () => { const a = document.createElement('a'); a.href = alleUrl(p, true); a.dataset.ansehen = 'nein'; a.download = doName(p); document.body.appendChild(a); a.click(); a.remove(); } }); }
    if (imPk) { P.push({ text: 'Wiederherstellen', fn: () => doWiederherstellen(L), aus: ro }); return; }
    P.push({ text: 'Kopieren', k: 'Strg+C', fn: () => doKopieren(L, 'kopieren') }, { text: 'Ausschneiden', k: 'Strg+X', fn: () => doKopieren(L, 'verschieben'), aus: aus(false) },
      { text: 'Einfügen', k: 'Strg+V', fn: () => doEinfuegen(doOrdnerVon(p)), aus: aus(!ALLE_CLIP) },
      { text: 'Kopieren nach …', fn: () => doNach(L, 'kopieren'), aus: ro }, { text: 'Verschieben nach …', fn: () => doNach(L, 'verschieben'), aus: ro },
      { text: 'Umbenennen', k: 'F2', fn: () => doUmbenennen(p), aus: aus(!eins) }, { text: 'Neuer Ordner', fn: () => doNeuerOrdner(doOrdnerVon(p)), aus: ro },
      { text: 'Löschen', k: 'Entf', fn: () => doLoeschen(L), aus: ro, gefahr: true });
    return;
  }
  const k = ordner.dataset.aord;
  P.push({ titel: k ? (k === A_PK ? 'Papierkorb' : doName(k)) : 'Projektordner' });
  if (alleImPk(k)) { if (k !== A_PK) P.push({ text: 'Wiederherstellen', fn: () => doWiederherstellen([k]), aus: ro }); else P.push({ text: 'Dateien bleiben 30 Tage, dann löschen die Dienste sie endgültig.', fn: () => {}, aus: true }); return; }
  P.push({ text: 'Neuer Ordner', fn: () => doNeuerOrdner(k), aus: ro }, { text: 'Einfügen', k: 'Strg+V', fn: () => doEinfuegen(k), aus: aus(!ALLE_CLIP) });
  if (k) P.push({ text: 'Kopieren', fn: () => doKopieren([k], 'kopieren') }, { text: 'Ausschneiden', fn: () => doKopieren([k], 'verschieben'), aus: ro },
    { text: 'Kopieren nach …', fn: () => doNach([k], 'kopieren'), aus: ro }, { text: 'Verschieben nach …', fn: () => doNach([k], 'verschieben'), aus: ro },
    { text: 'Umbenennen', fn: () => doUmbenennen(k), aus: ro }, { text: 'Löschen', fn: () => doLoeschen([k]), aus: ro, gefahr: true });
});

/* Tastatur: Strg+C/X/V, F2, Entf – nicht in Eingabefeldern und nicht, wenn ein Fenster offen ist */
document.addEventListener('keydown', (e) => {
  if (tab !== 'alle' || !ALLE || e.target.closest('input,textarea,select,[contenteditable="true"]') || document.querySelector('.modal-bg,.bph-dlg-bg,.off-bg')) return;
  const L = doMarkiert(), strg = e.ctrlKey || e.metaKey, imPk = L.some(alleImPk);
  if (strg && e.key.toLowerCase() === 'c' && L.length && !String(getSelection())) { e.preventDefault(); doKopieren(L, 'kopieren'); }
  else if (strg && e.key.toLowerCase() === 'x' && L.length && !imPk && !doNurLesen()) { e.preventDefault(); doKopieren(L, 'verschieben'); }
  else if (strg && e.key.toLowerCase() === 'v' && ALLE_CLIP && !doNurLesen() && !alleImPk(AF.ordner)) { e.preventDefault(); doEinfuegen(AF.ordner); }
  else if (e.key === 'F2' && L.length === 1 && !imPk && !doNurLesen()) { e.preventDefault(); doUmbenennen(L[0]); }
  else if (e.key === 'Delete' && L.length && !imPk && !doNurLesen()) { e.preventDefault(); doLoeschen(L); }
});

/* Ziehen: Dateien (und Ordner im Baum) auf einen Ordner links – verschieben, mit Strg kopieren (X1: im Projekt verschieben) */
let DO_ZUG = null, doAufT = null, doUeber = null;
document.addEventListener('dragstart', (e) => {
  if (tab !== 'alle' || doNurLesen()) return;
  const d = e.target.closest && e.target.closest('#viewA [data-ap], .al-b [data-aord]'); if (!d) return;
  const p = d.dataset.ap != null ? d.dataset.ap : d.dataset.aord; if (!p || alleImPk(p)) { if (d.dataset.aord != null) e.preventDefault(); return; }
  DO_ZUG = d.dataset.ap != null ? doMarkiert(p) : [p];
  e.dataTransfer.effectAllowed = 'copyMove';
  e.dataTransfer.setData('text/plain', DO_ZUG.map(doName).join('\n'));
  const g = document.createElement('div'); g.className = 'do-geist'; g.textContent = DO_ZUG.length > 1 ? `${DO_ZUG.length} Einträge` : doName(DO_ZUG[0]);
  document.body.appendChild(g); e.dataTransfer.setDragImage(g, -12, -8); setTimeout(() => g.remove(), 0);
});
const doZielVon = (e) => { const b = e.target.closest && e.target.closest('.al-b [data-aord]'); return b && !alleImPk(b.dataset.aord) ? b : null; };
document.addEventListener('dragover', (e) => {
  if (!DO_ZUG) return;
  const b = doZielVon(e);
  if (doUeber && doUeber !== b) { doUeber.classList.remove('ab-ziel'); clearTimeout(doAufT); doUeber = null; }
  if (!b || DO_ZUG.some((p) => b.dataset.aord === p || b.dataset.aord.startsWith(p + '/'))) return;
  e.preventDefault(); e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
  if (doUeber !== b) {
    doUeber = b; b.classList.add('ab-ziel');
    const k = b.dataset.aord; doAufT = setTimeout(() => { if (k && !ALLE_AUF.has(k)) { ALLE_AUF.add(k); alleAufMerken(); render(); } }, 800);   // zugeklappter Ordner klappt nach kurzem Halten auf
  }
});
document.addEventListener('drop', (e) => {
  if (!DO_ZUG) return;
  const b = doZielVon(e), L = DO_ZUG; DO_ZUG = null; clearTimeout(doAufT);
  document.querySelectorAll('.ab-ziel').forEach((x) => x.classList.remove('ab-ziel'));
  if (!b) return;
  e.preventDefault();
  const ziel = b.dataset.aord, art = e.ctrlKey || e.metaKey ? 'kopieren' : 'verschieben';
  if (art === 'verschieben' && L.every((p) => doOrdnerVon(p) === ziel)) return;
  doAktion({ art, pfade: L, ziel }, `${L.length > 1 ? L.length + ' Einträge' : '„' + doName(L[0]) + '“'} ${art === 'kopieren' ? 'kopiert' : 'verschoben'} nach „${ziel ? doName(ziel) : 'Projektordner'}“`);
});
document.addEventListener('dragend', () => { DO_ZUG = null; clearTimeout(doAufT); document.querySelectorAll('.ab-ziel').forEach((x) => x.classList.remove('ab-ziel')); });
