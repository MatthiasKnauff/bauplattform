'use strict';
/* Adressen – einzelne, mehrere, alle gefilterten wählen (GO 23.11.2026, Mock „Adressen auswählen“: AW-1 … AW-5 alle A).
   AW-1  Haken vorn an jeder Zeile/Karte; Strg+Klick = dazu/ab, Umschalt+Klick = von … bis; Haken im Tabellenkopf (Karten: „alle“ oben) = alle
         gefilterten (halb = einige); Strg+A = alle gefilterten, Esc hebt auf. Ein einfacher Klick zeigt weiter rechts den Kontakt.
   AW-2  schwebende Leiste unten „n gewählt“ – nichts schiebt die Liste; dieselben Befehle im Kontextmenü.
   AW-3  ✉ Mail an alle (gemeinsamer Versand, einzeln, {anrede} je Kontakt) · ＋ Projekt · Ändern ▾ (Art, Gewerk, Stichwort, Tag) ·
         Zusammenführen (Duplikat-Fenster) · Excel / Drucken nur die Auswahl · Papierkorb (nur unbenutzte) – je ein Rückgängig.
   AW-4  die Auswahl bleibt beim Ändern des Filters; „x davon gerade nicht zu sehen“ mit „nur sichtbare“, „alle N gefilterten wählen“.
   AW-5  am Handy: lange tippen beginnt die Auswahl, danach tippen = dazu/ab; Leiste über der Handyleiste.
   Nutzt aus adressen.html: ALL, tableRows, load, edit, duplikate, adrDruck, KINDN, KINDS, trades, liste, AF, TV; aus adressen-rechts.js: adrSchmal,
   adrOrdner, adrKuerzel. */
const AW = { S: new Set(), anker: null, lang: false };
const awHat = (id) => AW.S.has(id);
const awSichtbar = () => tableRows().map((c) => c.id);
const awGewaehlt = () => ALL.filter((c) => AW.S.has(c.id));
/* ---------- Anzeige: nur Haken und Markierung an Ort und Stelle, die Liste wird nicht neu gezeichnet ---------- */
function awZeigen() {
  document.querySelectorAll('[data-adrck]').forEach((x) => { const an = AW.S.has(+x.dataset.adrck); x.checked = an; const z = x.closest('tr, .ct'); if (z) z.classList.toggle('sel', an); });
  const V = awSichtbar(), n = V.filter((i) => AW.S.has(i)).length;
  document.querySelectorAll('[data-adrckall]').forEach((x) => { x.checked = !!V.length && n === V.length; x.indeterminate = n > 0 && n < V.length; });
  document.documentElement.classList.toggle('adr-wahl', AW.S.size > 0);
  const nz = document.getElementById('adrN'); if (nz) { nz.hidden = !AW.S.size; nz.textContent = `${AW.S.size} gewählt`; }   // Zahl der Gewählten oben neben der Zahl der Kontakte
  awLeiste(V, n);
}
function awUmschalten(id) { if (AW.S.has(id)) AW.S.delete(id); else AW.S.add(id); }
function awBereich(a, b) {
  const V = awSichtbar(), i = V.indexOf(a), j = V.indexOf(b);
  if (i < 0 || j < 0) { awUmschalten(b); return; }
  V.slice(Math.min(i, j), Math.max(i, j) + 1).forEach((x) => AW.S.add(x));
}
function awAlle(an) { const V = awSichtbar(); if (an === undefined) an = !V.every((i) => AW.S.has(i)); V.forEach((i) => (an ? AW.S.add(i) : AW.S.delete(i))); awZeigen(); }
function awAufheben() { AW.S.clear(); awZeigen(); }
function awNach() {   // nach jedem Zeichnen (adrNachRender): Gelöschte fallen heraus, Haken stimmen
  const da = new Set(ALL.map((c) => c.id)); [...AW.S].forEach((i) => { if (!da.has(i)) AW.S.delete(i); });
  awZeigen();
}
/* ---------- Leiste unten (schwebt über der Liste, AW-2) ---------- */
const awEl = () => document.getElementById('adrSel') || (() => {
  const d = document.createElement('div'); d.id = 'adrSel'; d.hidden = true; d.setAttribute('role', 'toolbar'); d.setAttribute('aria-label', 'Auswahl'); document.body.appendChild(d); return d; })();
function awLeiste(V, n) {
  const el = awEl(), z = AW.S.size;
  if (!z) { el.hidden = true; return; }
  const weg = z - n, handy = adrSchmal();
  el.innerHTML = `<b>${z} gewählt</b>${weg ? `<span class="mute">${weg} davon gerade nicht zu sehen · <button type="button" class="aw-l" data-aw="sicht">nur sichtbare</button></span>` : ''}
    ${n < V.length ? `<button type="button" class="aw-l" data-aw="alle">alle ${V.length} gefilterten wählen</button>` : ''}<button type="button" class="aw-l" data-aw="ab">Auswahl aufheben</button>
    <span class="aw-sp"></span><button type="button" class="btn sm" data-aw="mail">✉ Mail an alle</button><button type="button" class="btn sm" data-aw="projekt">＋ Projekt</button>
    ${handy ? '' : '<button type="button" class="btn sm" data-aw="aendern">Ändern ▾</button>'}<button type="button" class="btn sm" data-aw="mehr">mehr ▾</button>`;
  el.hidden = false;
  const L = document.getElementById('adrL'), r = L && !handy ? L.getBoundingClientRect() : null, w = el.offsetWidth;   // über der Liste mittig (nicht über dem Bereich rechts), nie über den Rand
  el.style.left = r ? Math.round(Math.max(w / 2 + 8, Math.min(innerWidth - w / 2 - 8, r.left + r.width / 2))) + 'px' : '';
}
/* ---------- Befehle ---------- */
const AW_BEF = { alle: () => awAlle(true), ab: awAufheben, sicht: () => { const V = new Set(awSichtbar()); [...AW.S].forEach((i) => { if (!V.has(i)) AW.S.delete(i); }); awZeigen(); },
  mail: awMail, projekt: awProjekt, aendern: awAendern, zusammen: awZusammen, xlsx: () => awExport('xlsx'), pdf: () => awExport('pdf'), weg: awWeg,
  mehr: (b) => pickMenu(b, { items: [...(adrSchmal() ? [['aendern', 'Ändern …']] : []), ['zusammen', 'Zusammenführen …'], ['xlsx', 'Excel (nur die Auswahl)'], ['pdf', 'Drucken (nur die Auswahl)'], ['weg', 'In den Papierkorb …']]
    .map(([value, title]) => ({ value, title, aus: value === 'zusammen' && AW.S.size < 2, sub: value === 'weg' ? 'nur Kontakte, die nirgends verwendet werden' : value === 'zusammen' && AW.S.size < 2 ? 'ab zwei Kontakten' : '' })),
    onPick: (v) => AW_BEF[v](b) }) };
document.addEventListener('click', (e) => { const b = e.target.closest('#adrSel [data-aw]'); if (b && !b.disabled) AW_BEF[b.dataset.aw](b); });
async function awMehr(feld, op, wert, text) {
  const ids = [...AW.S];
  let r; try { r = await api('api/contacts/mehr', 'POST', { ids, feld, op, wert }); } catch (e) { toast(e.message, true); return; }
  await load();
  if (!r.n) { toast('Nichts zu ändern – alle gewählten hatten das schon.'); return; }
  const alt = r.alt;
  rueckgaengig(`${text} – ${r.n} Kontakt${r.n > 1 ? 'e' : ''}`, async () => { await api('api/contacts/mehr/zurueck', 'POST', { alt }); await load(); }, { neu: load });
}
function awMail() {
  const G = awGewaehlt(), mit = G.filter((c) => c.email), ohne = G.length - mit.length;
  if (!mit.length) { toast('Keiner der gewählten Kontakte hat eine E-Mail-Adresse.', true); return; }
  if (mit.length > 200) { toast('Höchstens 200 Empfänger:innen auf einmal.', true); return; }
  const person = (c) => (c.kind === 'bauherr' && !(c.firma || {}).ist_firma && !c.contact_person ? c.name : c.contact_person);   // Bauherr:in als Person: der Name ist die Person
  BPHead.unterlagenSenden({ titel: `Mail an ${mit.length} Kontakt${mit.length > 1 ? 'e' : ''}`, art: 'unterlagen', was: [], einzeln: true, kopie: false,
    an: mit.map((c) => ({ name: person(c) || c.name, sub: c.name, email: c.email, contact_id: c.id })),
    betreff: '', text: '{anrede}\n\n\n\nMit freundlichen Grüßen',
    textHilfe: '{anrede} wird je Empfänger:in durch die persönliche Anrede ersetzt („Sehr geehrte Frau …“). Mit „einzeln senden“ sieht niemand die anderen.'
      + (ohne ? ` <b>${ohne} der gewählten Kontakte ${ohne > 1 ? 'haben' : 'hat'} keine E-Mail-Adresse.</b>` : '') });
}
async function awProjekt(b) {
  const [PJ, ORD] = await Promise.all([api('api/bp/projekte').catch(() => []), adrOrdner()]);
  const namen = [...new Set([...(Array.isArray(PJ) ? PJ : PJ.projekte || []).map((p) => p.name), ...(Array.isArray(ORD) ? ORD : [])])].filter((n) => adrKuerzel(n));
  pickMenu(b, { search: 'Projekt oder Nummer …', items: namen.map((n) => ({ title: n, value: adrKuerzel(n) })), onPick: (k) => awMehr('projektnr', 'dazu', k, `Projekt ${k} zugeordnet`) });
}
const AW_FELD = { trade: ['Gewerk', (c) => trades(c)], stichworte: ['Stichwort', (c) => liste(c.stichworte)], tags: ['Tag', (c) => liste(c.tags)] };
function awAendern(b) {
  const items = [{ value: 'art', title: 'Art setzen …' }];
  Object.entries(AW_FELD).forEach(([f, [n]]) => items.push({ value: f + ':dazu', title: `${n} dazu …` }, { value: f + ':weg', title: `${n} entfernen …` }));
  items.push({ value: 'projektnr:weg', title: 'Projekt entfernen …' });
  pickMenu(b, { items, onPick: (v) => setTimeout(() => awWert(b, v), 0) });
}
function awWert(b, v) {
  const [feld, op] = v.split(':'), G = awGewaehlt();
  if (feld === 'art') {
    return pickMenu(b, { items: [...KINDS.filter(([k]) => k), ['＋', 'Eigene Art …']].map(([k, l]) => ({ value: k, title: k === '＋' ? l : KINDN[k] || l })),
      onPick: async (k) => { if (k === '＋') { const t = await bpEingabe('Eigene Art für die gewählten Kontakte', ''); if (t && t.trim()) awMehr('art', 'setzen', t.trim(), `Art „${t.trim()}“ gesetzt`); return; }
        awMehr('art', 'setzen', k, `Art „${KINDN[k] || k}“ gesetzt`); } });
  }
  if (feld === 'projektnr') {
    const W = [...new Set(G.flatMap((c) => c.projektnr || []))].sort();
    if (!W.length) { toast('Die gewählten Kontakte haben keine Projektnummer.'); return; }
    return pickMenu(b, { items: W.map((k) => ({ value: k, title: k })), onPick: (k) => awMehr('projektnr', 'weg', k, `Projekt ${k} entfernt`) });
  }
  const [name, werte] = AW_FELD[feld];
  const Z = {}; (op === 'weg' ? G : ALL).forEach((c) => werte(c).forEach((w) => { Z[w] = (Z[w] || 0) + 1; }));
  const items = Object.keys(Z).sort((a, c) => a.localeCompare(c, 'de')).map((w) => ({ value: w, title: w, sub: `${Z[w]} Kontakt${Z[w] > 1 ? 'e' : ''}` }));
  if (op === 'weg' && !items.length) { toast(`Die gewählten Kontakte haben kein ${name}.`); return; }
  if (op === 'dazu') items.unshift({ value: '＋', title: `Neues ${name === 'Gewerk' ? 'Gewerk' : name} …` });
  pickMenu(b, { search: `${name} suchen …`, items, onPick: async (w) => {
    if (w === '＋') { w = await bpEingabe(`${name} für die gewählten Kontakte`, ''); w = (w || '').trim(); if (!w) return; }
    awMehr(feld, op, w, `${name} „${w}“ ${op === 'weg' ? 'entfernt' : 'dazu'}`); } });
}
function awZusammen() {
  const G = awGewaehlt(); if (G.length < 2) return;
  if (G.length > 8) { toast('Höchstens 8 Kontakte auf einmal zusammenführen.', true); return; }
  duplikate([{ ids: G.map((c) => c.id), grund: `${G.length} gewählte Adressen`, kontakte: G }]);
}
function awExport(art) {
  const ids = awSichtbar().filter((i) => AW.S.has(i)).concat([...AW.S].filter((i) => !awSichtbar().includes(i)));
  const qs = '?' + new URLSearchParams({ ids: ids.join(','), filter: `Auswahl (${ids.length} Kontakte)` });
  if (art === 'pdf') adrDruck(qs, ids.length); else { location.assign('api/contacts/export.xlsx' + qs); toast('Excel-Datei wird geladen …'); }
}
async function awWeg() {
  const G = awGewaehlt(), frei = G.filter((c) => !c.used && !c.site_of);
  if (!frei.length) { toast('Alle gewählten Kontakte werden verwendet (Bautagebuch, Baustelle …) – nichts gelöscht.', true); return; }
  if (!(await bpFrage(`${frei.length} Kontakt${frei.length > 1 ? 'e' : ''} in den Papierkorb legen?${G.length > frei.length ? `\n\n${G.length - frei.length} verwendete bleiben.` : ''}`, { ok: 'In den Papierkorb', gefahr: true }))) return;
  let r; try { r = await api('api/contacts/mehr', 'POST', { ids: frei.map((c) => c.id), op: 'loeschen' }); } catch (e) { toast(e.message, true); return; }
  await load();
  const pk = r.papierkorb || [];
  if (r.blockiert && r.blockiert.length) toast(`Bleiben, weil verwendet: ${r.blockiert.slice(0, 5).join(', ')}${r.blockiert.length > 5 ? ' …' : ''}`, true);
  if (pk.length) rueckgaengig(`${pk.length} Kontakt${pk.length > 1 ? 'e' : ''} im Papierkorb`, async () => { for (const p of pk) await api(`api/bp/papierkorb/${p}/zurueck`, 'POST'); await load(); }, { neu: load });
}
/* ---------- Klicks: Haken, Strg, Umschalt (AW-1), am Handy lange tippen (AW-5) ---------- */
function awKlick(e) {
  const alle = e.target.closest('[data-adrckall]');
  if (alle) { e.stopPropagation(); awAlle(); return; }
  const z = e.target.closest('#tw tbody tr[data-id], #list .ct'); if (!z) return;
  if (AW.lang) { AW.lang = false; e.preventDefault(); e.stopPropagation(); return; }   // der Klick nach dem langen Tippen
  const id = +z.dataset.id, ck = e.target.closest('[data-adrck]'), mod = e.ctrlKey || e.metaKey;
  const handyWahl = adrSchmal() && AW.S.size > 0 && !e.target.closest('a');
  if (!ck && !mod && !e.shiftKey && !handyWahl) { AW.anker = id; return; }   // einfacher Klick: rechts zeigen (adressen-rechts.js)
  if (!ck && e.target.closest('a')) return;
  e.stopPropagation(); if (!ck) e.preventDefault();
  if (e.shiftKey && AW.anker != null) awBereich(AW.anker, id); else { awUmschalten(id); AW.anker = id; }
  awZeigen();
}
['list', 'tw'].forEach((k) => {
  const el = document.getElementById(k);
  el.addEventListener('click', awKlick, true);
  el.addEventListener('mousedown', (e) => { if (e.shiftKey && e.target.closest('tbody tr[data-id], .ct')) e.preventDefault(); }, true);   // Umschalt+Klick markiert keinen Text
  let t = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return; const z = e.target.closest('tbody tr[data-id], .ct'); if (!z) return;
    clearTimeout(t); t = setTimeout(() => { AW.lang = true; awUmschalten(+z.dataset.id); AW.anker = +z.dataset.id; awZeigen(); if (navigator.vibrate) navigator.vibrate(15); }, 500);
  });
  ['pointerup', 'pointercancel', 'pointermove'].forEach((ev) => el.addEventListener(ev, (e) => { if (ev !== 'pointermove' || Math.abs(e.movementX) + Math.abs(e.movementY) > 6) clearTimeout(t); }));
  el.addEventListener('contextmenu', (e) => { if (AW.lang) e.preventDefault(); });
});
document.getElementById('adrAlle').addEventListener('click', (e) => { if (e.target.matches('[data-adrckall]')) awAlle(); });
document.addEventListener('keydown', (e) => {
  if (document.querySelector('.modal-bg, .bpv-bg, .pickm') || bpTippt(e.target)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); awAlle(true); }
  else if (e.key === 'Escape' && AW.S.size) awAufheben();
});
/* ---------- Kontextmenü: dieselben Befehle wie in der Leiste ---------- */
document.addEventListener('bph:kontext', (e) => {
  const z = e.detail.ziel.closest && e.detail.ziel.closest('#tw tbody tr[data-id], #list .ct'); if (!z) return;
  const id = +z.dataset.id;
  if (!AW.S.has(id)) e.detail.punkte.push({ text: 'Auswählen', k: 'Strg+Klick', fn: () => { AW.S.add(id); AW.anker = id; awZeigen(); } });
  if (!AW.S.size) return;
  const n = AW.S.size, b = () => z;
  e.detail.punkte.push({ titel: `${n} gewählt` }, { text: `Mail an ${n === 1 ? 'den gewählten' : `alle ${n}`} …`, fn: awMail }, { text: 'Projekt zuordnen …', fn: () => awProjekt(b()) },
    { text: 'Ändern …', fn: () => awAendern(b()) }, { text: 'Zusammenführen …', aus: n < 2, fn: awZusammen }, { text: 'Excel (Auswahl)', fn: () => awExport('xlsx') },
    { text: 'Drucken (Auswahl)', fn: () => awExport('pdf') }, { text: 'Auswahl aufheben', k: 'Esc', fn: awAufheben }, { text: 'In den Papierkorb …', gefahr: true, fn: awWeg });
});
addEventListener('resize', () => { if (AW.S.size) awZeigen(); });
