/* Ausschreibung (AVA) – Aufträge, Übersicht Projekt.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- Aufträge: Baum über alle Vergabeeinheiten (wie in ORCA: Projekt › LV › Titel › Position) ---------- */
const IC = {
  proj: '<svg class="ico" viewBox="0 0 24 24" fill="#d9a520" stroke="#a57a0c"><path d="M3 6h6l2 2h10v11H3z"/></svg>',
  lv: '<svg class="ico" viewBox="0 0 24 24" fill="#e9c46a" stroke="#b08a2e"><path d="M3 6h6l2 2h10v11H3z"/></svg>',
  ti: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#4a7fb5" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h7"/></svg>',
  pos: '<svg class="ico" viewBox="0 0 24 24" fill="#fff" stroke="#7a8a99"><path d="M6 3h9l4 4v14H6z"/></svg>',
};
const jn = (b) => (b ? 'Ja' : 'Nein');
function lvBaum(lv) {   // Titel/Positionen eines LV mit Summen
  const I = (lv.data && lv.data.items) || [], V = lv.vergabe || {}, VP = V.preise || null, nl = (V.nachlass || 0) / 100;
  const ep = (x) => (VP ? (VP[x.id] ?? null) : (x.ep_s ?? null));
  const gp = (x) => (ep(x) != null ? (x.menge || 0) * ep(x) * (VP ? 1 - nl : 1) : null);
  const rows = []; const st = [];
  I.forEach((x) => {
    if (x.typ === 'titel') {
      const lvl = x.lvl || 1; while (st.length && st[st.length - 1].lvl >= lvl) st.pop();
      const r = { k: `l${lv.id}:${x.id}`, typ: 'ti', x, lvl, par: st.length ? st[st.length - 1].k : `l${lv.id}`, g: 0, nt: 0, ntj: false };
      rows.push(r); st.push(r); return;
    }
    if (x.typ !== 'pos' || x.art === 'T') return;
    const g = gp(x), isNt = !!x.nt && x.nt_status !== 'abgelehnt';
    const r = { k: `l${lv.id}:${x.id}`, typ: 'pos', x, par: st.length ? st[st.length - 1].k : `l${lv.id}`, g: zaehlt(x) ? g : null, gRoh: g, ep: ep(x), nt: isNt && g ? g : 0, ntj: !!x.nt };
    rows.push(r);
    st.forEach((t) => { if (zaehlt(x) && g) t.g += g; if (r.nt) t.nt += r.nt; if (x.nt) t.ntj = true; });
  });
  return rows;
}
/* Aufträge: Tabelle und Karte rechts rollen in sich – so hoch, dass die Seite selbst nicht rollt (nur ein Scrollbalken je Bereich) */
function auHoehe() {
  if (tab !== 'auftraege') return;
  const w = document.querySelector('#view .au2-tab .tblw'), re = null; if (!w) return;   // Bereich rechts: Höhe über randUnten (seite.js)
  { const t = w.querySelector('table.au-t'), K = [...w.querySelectorAll('input.au-k')].map((i) => i.value.length).filter((x) => x > 0);   // Kurztext-Feld so breit wie der übliche Kurztext
    if (t && K.length) t.style.setProperty('--auk', Math.max(12, Math.min(48, Math.ceil(K.reduce((a, x) => a + x, 0) / K.length * 1.15))) + 'ch'); }
  const nach = [...w.parentElement.children].slice([...w.parentElement.children].indexOf(w) + 1).reduce((a, el) => a + el.getBoundingClientRect().height, 0);
  w.style.maxHeight = Math.max(240, innerHeight - w.getBoundingClientRect().top - nach - 10) + 'px';
  if (re && getComputedStyle(re).position === 'sticky') re.style.maxHeight = Math.max(240, innerHeight - re.getBoundingClientRect().top - 10) + 'px';
  const zuviel = document.documentElement.scrollHeight - innerHeight;   // noch etwas über (Innenabstand der Seite)? Tabelle und Karte entsprechend kürzer
  if (zuviel > 0) { w.style.maxHeight = Math.max(240, parseFloat(w.style.maxHeight) - zuviel) + 'px'; if (re && re.style.maxHeight) re.style.maxHeight = Math.max(240, parseFloat(re.style.maxHeight) - zuviel) + 'px'; }
}
addEventListener('resize', () => requestAnimationFrame(auHoehe));
/* Unten derselbe kleine Rand wie oben: die Bäume links (LV/Angebote/Rechnungen) enden 10 px über dem Fensterrand und rollen in sich */
const FELDER = { lv: ['.re2-ed .lv-split > .lv-sl'], angebote: ['.re2-ed > .tblw', '.ang-sp > .ang-l'], rechnungen: ['.re2-ed .am-split > .am-l'], aufmass: ['.re2-ed .am-split > .am-l'],
  uebersicht: ['#view > .tblw'], tueren: ['.tl-w', '.tl-d'] };   // je Bereich das Feld, das in sich rollt (wie in Aufträge)
function randUnten() {
  document.querySelectorAll('#view .re2-baum, #view .pj').forEach((el) => {
    const cs = getComputedStyle(el); if (cs.position !== 'sticky') { el.style.maxHeight = ''; return; }
    const top = Math.max(el.getBoundingClientRect().top, parseFloat(cs.top) || 0);
    el.style.maxHeight = Math.max(200, Math.floor(innerHeight - top - 10)) + 'px';
  });
  // Hauptfeld des Bereichs: endet 10 px über dem Fensterrand, rollt in sich, Ecken rund – die Seite selbst rollt nicht mehr
  const breit = innerWidth >= 1100 && !document.documentElement.classList.contains('mobil');
  const F = breit ? (FELDER[tab] || []).flatMap((q) => [...document.querySelectorAll(q)]) : [];
  document.querySelectorAll('#view .bp-feld').forEach((el) => { if (!F.includes(el)) { el.classList.remove('bp-feld'); el.style.maxHeight = ''; } });
  F.forEach((el) => {
    el.classList.add('bp-feld');
    const r = el.getBoundingClientRect(); let nach = 0;
    for (let a = el; a && a.id !== 'view' && a !== document.body; a = a.parentElement) {
      for (let n = a.nextElementSibling; n; n = n.nextElementSibling) { const q = n.getBoundingClientRect(); if (q.height && q.top >= r.bottom - 2) nach += q.height + (parseFloat(getComputedStyle(n).marginTop) || 0); }
    }
    el.style.maxHeight = Math.max(240, Math.floor(innerHeight - (r.top + scrollY) - nach - 10)) + 'px';
  });
  document.querySelectorAll('#view .am-zwei, #view .am-l.am-b').forEach((el) => {   // Aufmaß: Positionen und Mengeneingabe füllen die Höhe bis 10 px über dem Rand
    el.style.height = breit ? Math.max(320, Math.floor(innerHeight - (el.getBoundingClientRect().top + scrollY) - 10)) + 'px' : '';
  });
  document.querySelectorAll('#view .sr-split > .sr-r, #view .lv-split > .am-r').forEach((el) => {   // PDF daneben: gleich hoch, unten derselbe Rand
    if (!breit || el.closest('.frei') || el.parentElement.classList.contains('sr-zu')) { el.style.height = ''; return; }
    const top = el.parentElement.getBoundingClientRect().top + scrollY;
    el.style.height = Math.max(300, Math.floor(innerHeight - top - 10)) + 'px';
  });
}
{ let t = 0; const los = () => { if (!t) t = requestAnimationFrame(() => { t = 0; randUnten(); }); };
  addEventListener('scroll', los, { passive: true }); addEventListener('resize', los);
  const v = document.getElementById('view'); if (v) new MutationObserver(los).observe(v, { childList: true, subtree: true }); }
/* Aufträge-Tabelle: Spalten sortieren (Klick auf den Kopf, je Ebene) und ein-/ausblenden (⚙ Spalten) – gemerkt im Browser */
const AU_SP = [['Bezeichnung'], ['Menge', 1], ['EH'], ['EP (EUR)', 1], ['Firma'], ['Gesamt (EUR)', 1], ['Nachtrag'], ['Nachtrag Gesamt', 1], ['Prognose (EUR)', 1], ['Art'], ['Bedarfsposition'], ['KG'], ['abgerechnet', 1]];
if (!LS.get('au.sp2', false)) {   // einmalig: Menge/EH/EP kamen hinter „Bezeichnung“ dazu – gemerkte Spaltennummern und -breiten verschieben
  const um = (n) => (n >= 1 ? n + 3 : n); LS.set('au.aus', (LS.get('au.aus', []) || []).map(um)); const so = LS.get('au.sort', null); if (so) LS.set('au.sort', { ...so, c: um(so.c) });
  const sb = LS.get('sb', {}); delete sb['auftraege:tree.au-t']; LS.set('sb', sb); LS.set('au.sp2', true);
}
let AUSORT = LS.get('au.sort', null), AUAUS = new Set(LS.get('au.aus', []));
const auVergl = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a ?? '').localeCompare(String(b ?? ''), 'de', { numeric: true, sensitivity: 'base' })) * (AUSORT ? AUSORT.d : 1);
function auWertLv(x) { return [[x.nr, x.name].filter(Boolean).join(' '), '', '', '', x.auftragnehmer || '', x.auftrag || x.schaetzung || 0, x.n_nt || 0, (x.nachtraege || 0) + (x.nt_angemeldet || 0), x.prognose || 0, x.vergeben ? 1 : 0, '', '', x.abgerechnet || 0][AUSORT.c]; }
function auWertR(r) { const x = r.x; return [`${x.oz || ''} ${x.kurz || ''}`, r.typ === 'ti' ? '' : x.menge ?? 0, r.typ === 'ti' ? '' : x.einheit || '', r.typ === 'ti' ? '' : r.ep ?? 0, '', r.typ === 'ti' ? r.g : (r.gRoh ?? 0), r.ntj ? 1 : 0, r.nt || 0, (r.g || 0) + (r.nt || 0), r.typ === 'ti' ? 'Titel' : x.art === 'P' ? 'Pauschal' : 'Position', x.art === 'E' ? 1 : 0, x.kg || '', 0][AUSORT.c]; }
function auSpaltenStil() { return AUAUS.size ? `<style>${[...AUAUS].map((n) => `table.au-t .sp${n}`).join(',')}{display:none}</style>` : ''; }
/* Spaltenreihenfolge (wie in Excel/Explorer): Spaltenkopf ziehen oder im Spalten-Menü verschieben – „Bezeichnung“ bleibt vorn */
let AUORD = (() => { const o = (LS.get('au.ord', []) || []).filter((n) => n > 0 && n < AU_SP.length); AU_SP.forEach((_, n) => { if (n && !o.includes(n)) o.push(n); }); return [0, ...o]; })();
function auOrdSetzen(o) { AUORD = [0, ...o.filter((n) => n > 0)]; LS.set('au.ord', AUORD.slice(1)); const sb = LS.get('sb', {}); if (sb['auftraege:tree.au-t']) { delete sb['auftraege:tree.au-t']; LS.set('sb', sb); delete SB['auftraege:tree.au-t']; } render(); }
function auSpaltenAnwenden() {   // Zellen jeder Zeile in die gewählte Reihenfolge bringen und je Spalte kennzeichnen (Ein-/Ausblenden über die Klasse)
  const t = document.querySelector('table.au-t'); if (!t) return;
  t.querySelectorAll('thead tr, tbody tr[data-tr]').forEach((tr) => {
    const c = [...tr.children]; if (c.length !== AU_SP.length) return;
    c.forEach((td, n) => td.classList.add('sp' + n));
    AUORD.forEach((n) => tr.appendChild(c[n]));
  });
}
function auSpaltenWahl(x, y) {   // kleines Menü an der Maus bzw. am Knopf: Häkchen = sichtbar, ⋮⋮ ziehen = Reihenfolge
  document.querySelectorAll('.au-spm').forEach((m) => m.remove());
  const m = document.createElement('div'); m.className = 'au-spm'; m.setAttribute('role', 'menu');
  const zeichne = () => { m.innerHTML = `<div class="au-spm-k"><b>Spalten</b><button type="button" class="ib" data-spx title="Schließen">✕</button></div>${AUORD.slice(1).map((n) => `<label class="au-spm-z" draggable="true" data-spn="${n}"><span class="g" title="ziehen: Reihenfolge">⋮⋮</span><input type="checkbox" data-ausp="${n}"${AUAUS.has(n) ? '' : ' checked'}><span>${AU_SP[n][0]}</span></label>`).join('')}<div class="au-spm-f"><button type="button" class="lnk" data-spstd>Standard</button></div>`; };
  zeichne(); document.body.appendChild(m);
  const b = m.getBoundingClientRect(); m.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, x)) + 'px'; m.style.top = Math.max(8, Math.min(innerHeight - b.height - 8, y)) + 'px';
  const zu = () => { m.remove(); document.removeEventListener('pointerdown', aus, true); document.removeEventListener('keydown', esc_); };
  const aus = (e) => { if (!m.contains(e.target)) zu(); }, esc_ = (e) => { if (e.key === 'Escape') zu(); };
  setTimeout(() => { document.addEventListener('pointerdown', aus, true); document.addEventListener('keydown', esc_); }, 0);
  m.addEventListener('click', (e) => { if (e.target.closest('[data-spx]')) zu(); if (e.target.closest('[data-spstd]')) { AUAUS.clear(); LS.set('au.aus', []); auOrdSetzen(AU_SP.map((_, n) => n).slice(1)); zeichne(); } });
  m.addEventListener('change', (e) => { const c = e.target.closest('[data-ausp]'); if (!c) return; const n = +c.dataset.ausp; if (c.checked) AUAUS.delete(n); else AUAUS.add(n); LS.set('au.aus', [...AUAUS]); render(); });
  let zn = null;
  m.addEventListener('dragstart', (e) => { const z = e.target.closest('[data-spn]'); if (!z) return; zn = +z.dataset.spn; z.classList.add('zieh'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(zn)); } catch { /* egal */ } });
  m.addEventListener('dragover', (e) => { const z = e.target.closest('[data-spn]'); if (!z || zn == null) return; e.preventDefault(); const r = z.getBoundingClientRect(), un = e.clientY > r.top + r.height / 2; m.querySelectorAll('[data-spn]').forEach((q) => q.classList.remove('vor', 'nach')); z.classList.add(un ? 'nach' : 'vor'); });
  m.addEventListener('drop', (e) => { const z = e.target.closest('[data-spn]'); if (!z || zn == null) return; e.preventDefault(); const r = z.getBoundingClientRect(), un = e.clientY > r.top + r.height / 2, ziel = +z.dataset.spn;
    const o = AUORD.slice(1).filter((n) => n !== zn); if (ziel !== zn) o.splice(o.indexOf(ziel) + (un ? 1 : 0), 0, zn); else o.splice(AUORD.slice(1).indexOf(zn), 0, zn); zn = null; auOrdSetzen(o); zeichne(); });
  m.addEventListener('dragend', () => { zn = null; m.querySelectorAll('[data-spn]').forEach((q) => q.classList.remove('vor', 'nach', 'zieh')); });
}
addEventListener('contextmenu', (e) => {   // rechte Maustaste auf einen Spaltenkopf: Spalten-Menü (Standard wie in Excel und im Explorer)
  if (tab !== 'auftraege') return; const th = e.target.closest && e.target.closest('table.au-t thead th'); if (!th) return;
  e.preventDefault(); e.stopImmediatePropagation(); auSpaltenWahl(e.clientX, e.clientY);
}, true);
{ let zs = null;   // Spaltenkopf ziehen: Spalte verschieben
  document.addEventListener('dragstart', (e) => { const th = e.target.closest && e.target.closest('table.au-t thead th[data-ausort]'); if (!th || th.dataset.ausort === '0') return; zs = +th.dataset.ausort; th.classList.add('zieh'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'sp' + zs); } catch { /* egal */ } });
  document.addEventListener('dragover', (e) => { if (zs == null) return; const th = e.target.closest && e.target.closest('table.au-t thead th[data-ausort]'); if (!th || th.dataset.ausort === '0') return; e.preventDefault(); const r = th.getBoundingClientRect(), re = e.clientX > r.left + r.width / 2; document.querySelectorAll('table.au-t thead th').forEach((q) => q.classList.remove('ziel-l', 'ziel-r')); if (+th.dataset.ausort !== zs) th.classList.add(re ? 'ziel-r' : 'ziel-l'); });
  document.addEventListener('drop', (e) => { if (zs == null) return; const th = e.target.closest && e.target.closest('table.au-t thead th[data-ausort]'); if (!th) return; e.preventDefault(); const r = th.getBoundingClientRect(), re = e.clientX > r.left + r.width / 2, ziel = +th.dataset.ausort, z0 = zs; zs = null;
    if (ziel === z0 || ziel === 0) { render(); return; } const o = AUORD.slice(1).filter((n) => n !== z0); o.splice(o.indexOf(ziel) + (re ? 1 : 0), 0, z0); auOrdSetzen(o); });
  document.addEventListener('dragend', () => { if (zs != null) { zs = null; document.querySelectorAll('table.au-t thead th').forEach((q) => q.classList.remove('zieh', 'ziel-l', 'ziel-r')); } }); }
document.addEventListener('click', (e) => {
  if (tab !== 'auftraege') return;
  if (e.target.closest('[data-auspw]')) { e.stopPropagation(); const r = e.target.closest('[data-auspw]').getBoundingClientRect(); auSpaltenWahl(r.left, r.bottom + 4); return; }
  const th = e.target.closest('th[data-ausort]'); if (!th || e.target.closest('.sb-griff')) return;
  const c = +th.dataset.ausort;
  AUSORT = !AUSORT || AUSORT.c !== c ? { c, d: 1 } : AUSORT.d > 0 ? { c, d: -1 } : null;   // auf – ab – wie im LV
  LS.set('au.sort', AUSORT); render();
});
/* Aufträge: Bezeichnung (Kurztext) und Kostengruppe direkt in der Tabelle ändern – Klick auf die schon markierte Zeile bzw. auf die KG */
async function auBearb(span) {
  const tr = span.closest('tr[data-tr]'), m = /^l(\d+):(.+)$/.exec(tr ? tr.dataset.tr : ''); if (!m) return;
  const lvId = +m[1], id = m[2], feld = span.dataset.aued;
  const lv = PC[lvId]; const y0 = lv && (lv.data.items || []).find((q) => q.id === id); if (!y0) return;
  const inp = document.createElement('input'); inp.className = 'au-ed'; inp.value = y0[feld] || ''; if (feld === 'kg') { inp.maxLength = 3; inp.inputMode = 'numeric'; inp.style.width = '4rem'; }
  span.replaceWith(inp); inp.focus(); inp.select();
  let fertig = false;
  const ende = async (ok) => {
    if (fertig) return; fertig = true;
    const v = feld === 'kg' ? inp.value.replace(/\D/g, '').slice(0, 3) : inp.value.trim();
    if (!ok || v === (y0[feld] || '') || (feld === 'kurz' && !v)) { render(); return; }
    await kmLv(lvId, async () => { const x = items().find((q) => q.id === id); if (!x) return; x[feld] = v; HIST.next = `${x.oz || 'Position'}: ${feld === 'kg' ? 'Kostengruppe' : 'Bezeichnung'} in „Aufträge“ geändert`; changed(true); clearTimeout(saveT); saveT = 0; try { await saveNow(); } catch (er) { toast(er.message, true); } PC[lvId] = L; render(); });
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ende(true); } else if (e.key === 'Escape') { e.preventDefault(); ende(false); } });
  inp.addEventListener('blur', () => ende(true));
}
document.addEventListener('click', (e) => {
  if (tab !== 'auftraege') return;
  const sp = e.target.closest('span[data-aued]'); if (!sp) return;
  const tr = sp.closest('tr[data-tr]'); if (!tr) return;
  if (sp.dataset.aued === 'kurz' && !tr.classList.contains('sel')) return;   // erster Klick wählt nur die Zeile (wie im Explorer)
  e.stopPropagation(); clearTimeout(auBearb.t); auBearb.t = setTimeout(() => auBearb(sp), 260);   // nicht beim Doppelklick
}, true);
/* Aufträge: Kurztext, Menge, EH und EP direkt in der Zeile (wie im LV) – EP ist beim vergebenen LV der Auftragspreis, sonst die Schätzung */
const auEp = (lv, x) => { const VP = (lv.vergabe || {}).preise; return VP ? (VP[x.id] ?? null) : (x.ep_s ?? null); };
function auFelder(lv, x) {
  const a = `data-aulv="${lv.id}" data-auid="${esc(x.id)}"`, ep = auEp(lv, x);
  return { bz: `<b class="au-oz">${esc(x.oz || '')}</b><input class="aui au-k" ${a} data-auf="kurz" value="${esc(x.kurz || '')}" title="Kurztext – Enter speichert, Esc verwirft · Doppelklick: Eigenschaften wie im LV">`,
    mx: [`<input class="aui r" ${a} data-auf="menge" value="${x.menge != null ? nf(x.menge) : ''}" inputmode="decimal" style="width:5.6rem">`,
      `<input class="aui" ${a} data-auf="einheit" value="${esc(x.einheit || '')}" data-vs="eh" autocomplete="off" style="width:3.8rem">`,
      `<input class="aui r" ${a} data-auf="ep" value="${ep != null ? nf2(ep) : ''}" inputmode="decimal" style="width:6.6rem" title="${(lv.vergabe || {}).preise ? 'Einheitspreis des Auftrags' + (x.nt ? ' (Nachtragspreis)' : '') : 'geschätzter Einheitspreis'}">`] };
}
let AUZIEL = null;   // nach dem Speichern dort weiter (Tab / Enter)
const auZielVon = (inp, vor) => { const A = [...document.querySelectorAll('table.au-t input.aui')], i = A.indexOf(inp); const n = A[i + (vor ? -1 : 1)]; return n ? { id: n.dataset.auid, f: n.dataset.auf, lv: n.dataset.aulv } : null; };
const auZielRunter = (inp) => { const A = [...document.querySelectorAll(`table.au-t input.aui[data-auf="${inp.dataset.auf}"]`)], n = A[A.indexOf(inp) + 1]; return n ? { id: n.dataset.auid, f: n.dataset.auf, lv: n.dataset.aulv } : null; };
function auZielFokus() { const z = AUZIEL; AUZIEL = null; if (!z) return; const el = document.querySelector(`table.au-t input.aui[data-aulv="${z.lv}"][data-auid="${CSS.escape(z.id)}"][data-auf="${z.f}"]`); if (el) { el.focus(); el.select(); const tr = el.closest('tr[data-tr]'); if (tr && !tr.classList.contains('sel')) { document.querySelectorAll('.tree tr.sel').forEach((r) => r.classList.remove('sel')); tr.classList.add('sel'); TSEL = tr.dataset.tr; } } }
const AUFELD = { kurz: 'Kurztext', menge: 'Menge', einheit: 'Einheit', ep: 'EP', art: 'Art', kg: 'Kostengruppe', lang: 'Langtext' };
async function auSetze(lvId, id, f, v) {
  await kmLv(lvId, async () => {
    const x = items().find((q) => q.id === id); if (!x) return;
    if (f === 'ep' && L.vergabe && L.vergabe.preise) { await flush(); const r = await api('api/lv/' + L.id, 'PUT', { vergabe: { preise: { [id]: v } } }); L.rev = r.rev; L.calc = r.calc; L.vergabe = r.vergabe; }
    else { if (f === 'art') { if (v === 'V') { x.art = 'T'; x.vb = true; } else { x.art = v; delete x.vb; } } else x[f === 'ep' ? 'ep_s' : f] = v;
      HIST.next = `${x.oz || 'Position'}: ${AUFELD[f] || f} geändert`; changed(true); clearTimeout(saveT); saveT = 0; await saveNow(); }
    PC[lvId] = L;
  });
  render(); auZielFokus(); lvEintrag(lvId).then(() => { if (tab === 'auftraege' && !(document.activeElement && document.activeElement.matches('input.aui'))) render(); }).catch(() => {});
}
async function auFeldFertig(inp) {
  const lvId = +inp.dataset.aulv, id = inp.dataset.auid, f = inp.dataset.auf, lv = PC[lvId], x = lv && (lv.data.items || []).find((q) => q.id === id); if (!x) return;
  const zahl = f === 'menge' || f === 'ep', roh = f === 'lang' ? inp.value.replace(/\s+$/, '') : inp.value.trim();
  let v = zahl ? (roh === '' ? null : pf(roh)) : roh;
  if (f === 'art') { v = roh.toUpperCase(); if (!ARTEN[v]) { inp.value = inp.defaultValue; return; } }   // nur gültige Arten (Feld mit Vorschlagsliste wie im LV)
  if (zahl && roh !== '' && v == null) { toast('Bitte eine Zahl eingeben, z. B. 12,5.', true); inp.value = inp.defaultValue; return; }
  if (f === 'kurz' && !v) { inp.value = inp.defaultValue; return; }
  const alt = f === 'ep' ? auEp(lv, x) : f === 'menge' ? (x.menge ?? null) : f === 'art' ? artW(x) : (x[f] || '');
  if (v === alt || (zahl && v != null && alt != null && Math.abs(v - alt) < 1e-9)) { auZielFokus(); return; }
  try {
    await auSetze(lvId, id, f, v);
    rueckgaengig(`${x.oz || 'Position'}: ${AUFELD[f] || f} geändert`, () => auSetze(lvId, id, f, alt));
  } catch (e) { toast(e.message, true); render(); }
}
document.addEventListener('keydown', (e) => {
  const inp = e.target.closest && e.target.closest('table.au-t input.aui, .au-pk input.aui, .au-pk textarea.aui'); if (!inp) return;
  if (inp.tagName === 'TEXTAREA') { if (e.key === 'Escape') { e.preventDefault(); inp.value = inp.defaultValue; inp.blur(); } return; }   // Langtext: Enter ist ein Zeilenumbruch
  if (inp.closest('.au-pk')) { if (e.key === 'Escape') { e.preventDefault(); inp.value = inp.defaultValue; inp.blur(); } else if (e.key === 'Enter') { e.preventDefault(); AUZIEL = null; inp.blur(); } return; }   // Karte rechts: Enter speichert, springt nicht in die Tabelle
  if (e.key === 'Escape') { e.preventDefault(); inp.value = inp.defaultValue; AUZIEL = null; inp.blur(); return; }
  if (e.key === 'Tab') { AUZIEL = auZielVon(inp, e.shiftKey); return; }   // der Browser springt selbst – nach dem Neuzeichnen geht es dort weiter
  if (e.key === 'Enter') { e.preventDefault(); AUZIEL = auZielRunter(inp); if (inp.value === inp.defaultValue) { auZielFokus(); return; } inp.blur(); }
});
document.addEventListener('change', (e) => { const inp = e.target.closest && e.target.closest('table.au-t input.aui, .au-pk input.aui, .au-pk textarea.aui'); if (inp) auFeldFertig(inp); });
/* Karte „Position“: Nachtrag an/aus (wie in den Eigenschaften im LV), Langtext, blättern */
async function auNtSetzen(lvId, id, an) {   // an: true = neuer Nachtrag, false = keiner, {nt, nt_status, nt_grund} = genau so (Rückgängig)
  await kmLv(lvId, async () => { const x = items().find((q) => q.id === id); if (!x) return;
    delete x.nt; delete x.nt_status; delete x.nt_grund;
    if (an === true) { x.nt = 'NT' + ntNr(); x.nt_status = 'angemeldet'; } else if (an) Object.entries(an).forEach(([k, v]) => { if (v != null) x[k] = v; });
    ntErben(items()); HIST.next = `${x.oz || 'Position'}: ${an ? 'als Nachtrag markiert' : 'kein Nachtrag mehr'}`; changed(true); clearTimeout(saveT); saveT = 0; await saveNow(); PC[lvId] = L; });
  render(); lvEintrag(lvId).then(() => { if (tab === 'auftraege') render(); }).catch(() => {});
}
document.addEventListener('change', async (e) => { const c = e.target.closest && e.target.closest('[data-aunt1]'); if (!c) return;
  const [lvId, id] = c.dataset.aunt1.split(':'), an = c.checked, x0 = ((PC[+lvId] || {}).data.items || []).find((q) => q.id === id) || {}, vor = x0.nt ? { nt: x0.nt, nt_status: x0.nt_status, nt_grund: x0.nt_grund } : false;
  const wer = `„${[x0.oz, (x0.kurz || '').length > 60 ? x0.kurz.slice(0, 58) + '…' : x0.kurz].filter(Boolean).join(' ') || 'Diese Zeile'}“`;   // erst nachfragen – ein Häkchen ist schnell versehentlich gesetzt
  if (!(await bpFrage(an ? `${wer} als Nachtrag anmelden?\nSie bekommt die nächste Nachtragsnummer und den Stand „angemeldet“.` : `Nachtrag ${vor.nt || ''} aufheben?\n${wer} wird wieder ${x0.typ === 'titel' ? 'ein normaler Gliederungspunkt' : 'eine normale Position'}.`, { ok: an ? 'Als Nachtrag anmelden' : 'Nachtrag aufheben' }))) { c.checked = !an; return; }
  try { await auNtSetzen(+lvId, id, an); rueckgaengig(an ? 'Als Nachtrag markiert' : `${vor.nt} aufgehoben`, () => auNtSetzen(+lvId, id, vor)); } catch (er) { toast(er.message, true); render(); } });
document.addEventListener('click', (e) => {
  const n = e.target.closest && e.target.closest('[data-aupn]');
  if (n) { const [lvId, xid] = n.dataset.aupx.split(':'), lv = PC[+lvId], x = lv && (lv.data.items || []).find((y) => y.id === xid); if (!x) return;
    const I = (lv.data.items || []).filter((y) => y.typ === x.typ), y = I[I.indexOf(x) + +n.dataset.aupn]; if (!y) return;
    if (tab === 'lv') { LVAKT = y.id; LVSEL = new Set([y.id]); lvAktZeigen(); const k = items().indexOf(y), tr = document.querySelector(`table.lv tr[data-i="${k}"]`); if (tr) tr.scrollIntoView({ block: 'nearest' }); return; }
    TSEL = `l${lv.id}:${y.id}`; document.querySelectorAll('.tree tr.sel').forEach((q) => q.classList.remove('sel')); const tr = document.querySelector(`.tree tr[data-tr="${CSS.escape(TSEL)}"]`); if (tr) { tr.classList.add('sel'); tr.scrollIntoView({ block: 'nearest' }); } auSeite(); return; }
  const lg = e.target.closest && e.target.closest('[data-aulang]');
  if (lg) { const [lvId, id] = lg.dataset.aulang.split(':'), lv = PC[+lvId], x = lv && (lv.data.items || []).find((y) => y.id === id); if (!x) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    kmLv(+lvId, () => { LS.set('eigTab', 'allgemein'); eigDialog(id); }); }   // der vollständige Positionsdialog (Allgemein · Weiteres · Menge · Grafik) – Langtext steht unter „Allgemein“
});
function vAuftraege() {
  const xs = LIST.filter((x) => !x.archived);
  if (!xs.length) return '<div class="card empty">Noch keine Leistungsverzeichnisse in diesem Projekt. Oben „Neu“ legt eines an.</div>';
  if (L) PC[L.id] = L;
  const pn = (PROJ.find((p) => p.id === pid) || {}).name || 'Projekt';
  const S = { g: 0, nt: 0, pr: 0, ab: 0 };
  xs.forEach((x) => { S.g += x.auftrag || x.schaetzung; S.nt += x.nachtraege + x.nt_angemeldet; S.pr += x.prognose; S.ab += x.abgerechnet; });
  const e2 = (v) => (v ? eur(v).replace(' €', '') : '');
  const pk = 'p' + pid, out = [];
  let NTZ = false;   // Zeilen eines Nachtrags (Gruppe und Positionen) farbig wie im LV
  const row = (k, lvl, kids, ico, bez, c, mx) => out.push(`<tr data-tr="${k}" class="${k === pk ? 'root' : ''}${TSEL === k ? ' sel' : ''}${NTZ ? ' ntz' : ''}"><td><span class="tw" style="padding-left:${lvl * 1.1}rem"><span class="car${kids === 'leer' ? ' leer' : ''}" ${kids && kids !== 'leer' ? `data-car="${k}"` : ''}>${kids === 'leer' ? '▸' : kids ? (EXP.has(k) ? '▾' : '▸') : ''}</span>${ico}<span class="au-bz">${bez}</span></span></td>${(mx || ['', '', '']).map((v, i) => `<td class="${i === 1 ? '' : 'r'}">${v}</td>`).join('')}${c.map((v, i) => `<td class="${[1, 3, 4, 8].includes(i) ? 'r' : ''}${i === 2 && v === 'Ja' ? ' nt' : ''}">${v}</td>`).join('')}</tr>`);   // mx: Menge · EH · EP (Positionen: Eingabefelder)
  const auf = !EXP.has('-' + pk);   // Projekt ist standardmäßig aufgeklappt
  out.push(`<tr data-tr="${pk}" class="root${TSEL === pk ? ' sel' : ''}"><td><span class="tw"><span class="car" data-car="-${pk}">${auf ? '▾' : '▸'}</span>${IC.proj}<span>${esc(pn)}</span></span></td><td></td><td></td><td></td><td></td><td class="r">${e2(S.g)}</td><td></td><td class="r">${e2(S.nt)}</td><td class="r">${e2(S.pr)}</td><td></td><td></td><td></td><td class="r">${e2(S.ab)}</td></tr>`);
  if (auf) (AUSORT ? [...xs].sort((p1, p2) => auVergl(auWertLv(p1), auWertLv(p2))) : xs).forEach((x) => {
    const k = 'l' + x.id, aufgetragen = !!x.auftrag;
    row(k, 1, x.n_el == null || x.n_el > 0 || x.n_nt > 0 || 'leer', IC.lv, `${esc([x.nr, x.name].filter(Boolean).join(' '))}`,
      [x.aufgehoben ? `<span class="mu" title="Beauftragung aufgehoben – Rechnungen deaktiviert">⏸ ${esc(x.aufgehoben.bieter || '')} (aufgehoben)</span>` : esc(x.auftragnehmer || ''), e2(x.auftrag || x.schaetzung), jn(x.n_nt), e2(x.nachtraege + x.nt_angemeldet), e2(x.prognose), aufgetragen || x.vergeben ? (x.frei && x.ohne_lv !== false ? 'Auftrag ohne LV' : 'Auftrag') : x.aufgehoben ? 'aufgehoben' : x.status === 'nicht_vergeben' ? 'nicht vergeben' : 'Ausschreibung', '', '', e2(x.abgerechnet)]);
    if (!EXP.has(k)) return;
    const lv = PC[x.id];
    if (!lv) { out.push(`<tr><td colspan="13" class="mu" style="padding-left:3.4rem">wird geladen …</td></tr>`); pcLaden(x.id); return; }
    const R = lvBaum(lv), sicht = new Set([k]);
    const ALLE = (lv.data.items || []).filter((y) => y.nt && (y.typ === 'pos' || y.typ === 'titel'));
    const G = new Map();   // je Nachtragsnummer eine Gruppe: Stand wird für den ganzen Nachtrag gesetzt (auch auf Gliederungsebene)
    ALLE.forEach((y) => { const g = G.get(y.nt) || { nt: y.nt, titel: null, pos: [] }; if (y.typ === 'titel' && !g.titel) g.titel = y; else if (y.typ === 'pos') g.pos.push(y); G.set(y.nt, g); });
    const NT = [...G.values()];
    const stVon = (gq) => { const st = [...new Set([gq.titel, ...gq.pos].filter(Boolean).map((y) => y.nt_status || 'angemeldet'))]; return st.length === 1 ? st[0] : 'gemischt'; };   // Stand des ganzen Nachtrags; einzelne Positionen können abweichen
    const zahl = (st) => NT.filter((gq) => stVon(gq) === st).length;
    // (Knöpfe für Nachträge stehen oben in der Leiste – keine Knopf- oder Eingabezeilen mehr in der Tabelle)
    const ntSel = (st, key, grund, t = '') => `<select class="nt-st ${st}" data-ntst="${key}" title="${esc(t || grund || '')}">${st === 'gemischt' ? '<option value="gemischt" selected>gemischt</option>' : ''}${['angemeldet', 'beauftragt', 'abgelehnt'].map((s3) => `<option value="${s3}"${st === s3 ? ' selected' : ''}>${s3}</option>`).join('')}</select>`;
    NT.forEach((gq) => {
      const st = stVon(gq), ab = st === 'abgelehnt', kopf = gq.titel || (gq.pos.length === 1 ? gq.pos[0] : null), kk = `${k}:nt:${gq.nt}`;
      const summe = gq.pos.reduce((a, y) => { const r = R.find((q) => q.x === y) || {}; return a + (r.nt || r.gRoh || 0); }, 0);
      const grund = (gq.titel || gq.pos[0] || {}).nt_grund || '';
      const einzeln = !gq.titel && gq.pos.length === 1;   // einzelne Nachtragsposition: wie bisher eine Zeile
      const bez = (einzeln ? `<span class="badge nt">${esc(gq.nt)}</span> ${auFelder(lv, kopf).bz}`
        : `<span class="badge nt">${esc(gq.nt)}</span>${gq.titel ? ` <b>${esc(gq.titel.oz || '')}</b> ${esc(gq.titel.kurz || '')}` : ''} <small class="mu">${gq.titel ? 'Gliederungspunkt · ' : ''}${gq.pos.length} Pos.</small>`)
        + (ntPruef(x.id) ? ntZeileInfo(lv, gq.nt, st, summe) : '');
      NTZ = true;
      row(kk, 2, !einzeln, gq.titel ? IC.ti : IC.pos, `<span class="${ab ? 'mu' : ''}" title="${esc(grund)}">${bez}</span>`,
        ['', '', ntSel(st, `${x.id}:nt=${encodeURIComponent(gq.nt)}`, grund, einzeln ? grund : 'Stand für den ganzen Nachtrag – gilt für alle Positionen darunter' + (grund ? ' · ' + grund : '')), e2(summe), e2(summe), gq.titel ? 'Nachtragstitel' : 'Nachtrag', '', esc((kopf || {}).kg || ''), `<button type="button" class="ib nt-del" data-ntdel="${x.id}:${encodeURIComponent(gq.nt)}:" title="Nachtrag ${esc(gq.nt)} löschen (mit Rückgängig)">🗑</button>`], einzeln ? auFelder(lv, kopf).mx : null);
      if (!einzeln && EXP.has(kk)) { gq.pos.forEach((y) => { const r = R.find((q) => q.x === y) || {}, sy = y.nt_status || 'angemeldet';
        const fy = auFelder(lv, y);
        row(`${k}:${y.id}`, 3, false, IC.pos, `<span class="${sy === 'abgelehnt' ? 'mu' : ''}">${fy.bz}</span>`, ['', '', ntSel(sy, `${x.id}:${y.id}`, y.nt_grund, 'Stand nur dieser Position (weicht dann vom Nachtrag ab)'), e2(r.nt || r.gRoh || 0), e2(r.nt || r.gRoh || 0), 'Position', jn(y.art === 'E'), esc(y.kg || ''), `<button type="button" class="ib nt-del" data-ntdel="${x.id}:${encodeURIComponent(gq.nt)}:${y.id}" title="Diese Nachtragsposition löschen (mit Rückgängig)">🗑</button>`], fy.mx); });
      }
    });
    NTZ = false;

    const kinder = (par) => { const L2 = R.filter((q) => q.par === par && !q.x.nt); return AUSORT ? L2.sort((p1, p2) => auVergl(auWertR(p1), auWertR(p2))) : L2; };   // Nachträge stehen oben
    const zeig = (par) => kinder(par).forEach((r) => {
      const tief = r.typ === 'ti' ? r.lvl + 1 : (R.find((q) => q.k === r.par) || { lvl: 0 }).lvl + 2;
      const kids = r.typ === 'ti' && (R.some((q) => q.par === r.k) || 'leer');   // Titel ohne Inhalt: grauer Pfeil
      if (r.typ === 'ti') {
        row(r.k, tief, kids, IC.ti, `${esc(r.x.oz || '')} <span data-aued="kurz" title="Klick auf die markierte Zeile: Bezeichnung ändern · Doppelklick: Dialog">${esc(r.x.kurz || '')}</span>`, ['', e2(r.g), jn(r.ntj), e2(r.nt), e2(r.g + r.nt), 'Titel', '', `<span data-aued="kg" title="Klick: Kostengruppe ändern">${esc(r.x.kg || '')}</span>`, '']);
        if (EXP.has(r.k)) zeig(r.k);
      } else {
        const x2 = r.x, mu = !zaehlt(x2) && !x2.nt, f2 = auFelder(lv, x2);
        row(r.k, tief, false, IC.pos, `<span class="${mu ? 'mu' : ''}">${f2.bz}</span>`,
          ['', r.gRoh != null ? `<span class="${mu ? 'mu' : ''}">${e2(r.gRoh)}</span>` : '', '', e2(r.nt), e2((r.g || 0) + r.nt), x2.art === 'P' ? 'Pauschal' : 'Position', jn(x2.art === 'E'), `<span data-aued="kg" title="Klick: Kostengruppe ändern">${esc(x2.kg || '')}</span>`, ''], f2.mx);
      }
    });
    zeig(k);
  });
  out.push(archivZeilen(AU_SP.length));
  const tabelle = `${auSpaltenStil()}<div class="tblw"><table class="tree au-t" data-sp="-"><thead><tr>${AU_SP.map(([t, r], n) => `<th${n === 0 ? ' style="min-width:12rem"' : ' draggable="true"'} class="${r ? 'r ' : ''}au-sk" data-ausort="${n}" title="Klick: sortieren (nochmal: absteigend, dritter Klick: wie im LV)${n ? ' · ziehen: Spalte verschieben' : ''} · rechte Maustaste: Spalten wählen">${t}${AUSORT && AUSORT.c === n ? (AUSORT.d > 0 ? ' ▲' : ' ▼') : ''}${n === 0 ? '<button type="button" class="ib au-spw" data-auspw title="Spalten ein-/ausblenden und verschieben (auch: rechte Maustaste auf einen Spaltenkopf)">⚙ Spalten</button>' : ''}</th>`).join('')}</tr></thead><tbody>${out.join('')}</tbody></table></div>
`;
  return `<div class="au2"><div class="au2-tab">${tabelle}</div></div>`;   // rechts: auSeite() – Reiter „Position“ und „Auftrag“
}

/* Aufträge: Leiste wie im LV – alles, was hier angelegt wird, ist ein Nachtrag des gewählten Auftrags */
function auNtLv() { const m = /^l(\d+)/.exec(TSEL || ''); const id = m ? +m[1] : L && L.id; const x = LIST.find((y) => y.id === id); return x && x.vergeben && !x.aufgehoben ? x : null; }
function auNtLeiste() {
  const x = auNtLv(), lv = x && (PC[x.id] || (L && L.id === x.id ? L : null)), dis = x ? '' : ' disabled';
  let info = '<span class="hint">Auftrag in der Tabelle wählen – dann Nachträge anlegen</span>';
  if (x && lv) { const NT = [...new Set((lv.data.items || []).filter((y) => y.nt).map((y) => y.nt))], st = (nt) => ((lv.data.items || []).find((y) => y.nt === nt && (y.typ === 'titel' || !y.nt_erbe)) || {}).nt_status || 'angemeldet';
    const z = (s2) => NT.filter((n) => st(n) === s2).length;
    info = `<span class="hint">Nachträge zu <b>${esc([x.nr, x.name].filter(Boolean).join(' '))}</b>: ${NT.length ? `${NT.length} · angemeldet ${z('angemeldet')} · beauftragt ${z('beauftragt')} · abgelehnt ${z('abgelehnt')}` : 'noch keine'}</span>${ntModusKopf(x.id, lv)}`; }
  return `<div class="bar au-ntbar"><button type="button" class="btn sm" data-aunt="glied"${dis} title="Neuer Nachtrag als Gliederungspunkt – Positionen kommen darunter">＋ Gliederungspunkt</button><button type="button" class="btn sm" data-aunt="pos"${dis} title="Nachtragsposition – in den gewählten Nachtrags-Gliederungspunkt, sonst als eigener Nachtrag">＋ Position</button><button type="button" class="btn sm" data-aunt="ang"${dis} title="Nachtragsangebot der Firma (GAEB X84, Excel, PDF oder Scan) lesen">📄 Nachtragsangebot einlesen …</button>${info}</div>`;
}
async function auNtNeu(art) {
  const x = auNtLv(); if (!x) return; const lvId = x.id;
  if (art === 'nt') return ntDialog(lvId);
  if (art === 'ang') return ntAngebot(lvId);
  const fertig = (r, fokusId, key) => { PC[lvId] = r; if (L && L.id === lvId) L = r; EXP.add('l' + lvId); if (key) { EXP.add(key); TSEL = key; } LS.set('exp', [...EXP].slice(-300)); render(); lvEintrag(lvId).then(() => { if (tab === 'auftraege' && !(document.activeElement && document.activeElement.closest('table.au-t'))) render(); }).catch(() => {});   // nicht neu zeichnen, solange getippt wird
    if (fokusId) setTimeout(() => { const i = document.querySelector(`table.au-t input.aui[data-aulv="${lvId}"][data-auid="${CSS.escape(fokusId)}"][data-auf="kurz"]`); if (i) { i.scrollIntoView({ block: 'nearest' }); i.focus(); i.select(); } }, 60); };
  try {
    if (art === 'glied') {
      const name = await new Promise((ok) => { modalBox(`<h3>Neuer Nachtrag (Gliederungspunkt)</h3><div class="fm"><label for="anG">Bezeichnung</label><input id="anG" placeholder="z. B. Zusätzliche Durchbrüche Haustechnik" autocomplete="off"></div>
        <p class="hint">Positionen kommen danach mit „＋ Position“ darunter – sie gehören automatisch zu diesem Nachtrag.</p><div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Anlegen</button></div>`, (m, bg, close) => {
          if (m === 'x') { close(); ok(null); return; } if (m !== 'ok') return; const v = bg.querySelector('#anG').value.trim(); if (!v) { toast('Bitte eine Bezeichnung eingeben.', true); return; } close(); ok(v); });
        setTimeout(() => { const i = document.querySelector('#anG'); if (i) { i.focus(); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.querySelector('.modal [data-m="ok"]').click(); } }); } }, 30); });
      if (!name) return;
      const alt = new Set(((PC[lvId] || {}).data || { items: [] }).items.filter((y) => y.nt).map((y) => y.nt));
      const r = await api(`api/lv/${lvId}/nachtrag`, 'POST', { kurz: name, als_titel: true, status: 'angemeldet' });
      const neu = (r.data.items || []).find((y) => y.nt && y.typ === 'titel' && !alt.has(y.nt));
      fertig(r, null, neu ? `l${lvId}:nt:${encodeURIComponent(neu.nt)}` : null); toast(neu ? `${neu.nt} angelegt – jetzt „＋ Position“.` : 'Nachtrag angelegt.'); return;
    }
    // Position: in den gewählten Nachtrags-Gliederungspunkt, sonst eigener Nachtrag
    const m = /^l(\d+):nt:(.+)$/.exec(TSEL || ''), lv = PC[lvId] || L, nt = m && +m[1] === lvId ? decodeURIComponent(m[2]) : null;
    const titel = nt && (lv.data.items || []).some((y) => y.nt === nt && y.typ === 'titel');
    const vor = new Set((lv.data.items || []).map((y) => y.id));
    const r = titel ? await api(`api/lv/${lvId}/nachtrag`, 'POST', { zu_nt: nt, positionen: [{ kurz: 'Neue Position', menge: 1, einheit: 'psch' }] })
      : await api(`api/lv/${lvId}/nachtrag`, 'POST', { kurz: 'Neue Position', menge: 1, einheit: 'psch', status: 'angemeldet' });
    const p = (r.data.items || []).find((y) => !vor.has(y.id) && y.typ === 'pos');
    fertig(r, p && p.id, titel ? `l${lvId}:nt:${encodeURIComponent(nt)}` : p ? `l${lvId}:nt:${encodeURIComponent(p.nt)}` : null);
  } catch (er) { toast(er.message, true); }
}
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-aunt]'); if (!b) return; e.stopPropagation(); auNtNeu(b.dataset.aunt); });
/* Eingabezeile in der Aufträge-Tabelle (wie in Excel): Bezeichnung · Menge · EH · EP, Enter speichert; nt = '' legt einen neuen Nachtrag an.
   Strg+V mit mehreren Zeilen (Excel/Mail/PDF-Text) erfasst alle auf einmal – Menge, Einheit und EP werden aus der Zeile gelesen. */
function ntZeile(lvId, nt, tiefe, st) {
  const neu = !nt;
  return `<tr class="nt-ein" data-ntein="${lvId}" data-ntnt="${esc(nt)}"><td colspan="6"><span class="tw" style="padding-left:${tiefe * 1.1}rem;gap:.35rem"><span class="car"></span>${neu ? IC.ti : IC.pos}<input data-ne="kurz" placeholder="${neu ? '＋ neuer Nachtrag … (Bezeichnung, Enter) – oder mehrere Zeilen einfügen' : '＋ weitere Position … (Bezeichnung, Tab)'}" style="width:${neu ? 30 : 17}rem">${neu ? '' : '<input data-ne="menge" placeholder="Menge" inputmode="decimal" style="width:4.6rem;text-align:right"><input data-ne="einheit" placeholder="EH" data-vs="eh" autocomplete="off" style="width:3.4rem"><input data-ne="ep" placeholder="EP €" inputmode="decimal" style="width:5.6rem;text-align:right">'}</span></td>
    <td>${neu ? '<span class="hint">angemeldet</span>' : `<span class="hint" title="übernimmt den Stand des Nachtrags">erbt: ${esc(st)}</span>`}</td>
    <td colspan="6" class="hint"><span class="au-fl" title="${neu ? `wird NT${ntNaechste(lvId)} · Strg+V: erste Zeile = Nachtrag, weitere = Positionen` : 'Enter = speichern · Strg+V: mehrere Zeilen auf einmal'}">${neu ? `wird NT${ntNaechste(lvId)} · Strg+V: erste Zeile = Nachtrag, weitere = Positionen` : 'Enter = speichern · Strg+V: mehrere Zeilen auf einmal'}</span></td></tr>`;
}
function ntNaechste(lvId) { const lv = PC[lvId]; const v = new Set(((lv && lv.data.items) || []).filter((y) => y.nt).map((y) => String(y.nt))); let k = v.size + 1; while (v.has('NT' + k)) k++; return k; }
/* Zeile aus Zwischenablage/Eingabe zerlegen: „Kernbohrung DN 150  4 St 185,50“ · Tab-getrennt aus Excel · „4 St Kernbohrung … 185,50 €“ */
function ntParse(z) {
  const EH = ['psch', 'pau', 'st', 'stk', 'stck', 'm', 'm2', 'm²', 'qm', 'm3', 'm³', 'cbm', 'lfm', 'h', 'std', 'kg', 't', 'l', 'tag', 'wo', 'mon', 'pa'];
  const num = (t) => pf(String(t).replace(/[€\s]/g, ''));
  let t = z.replace(/\s+/g, ' ').trim(); if (!t) return null;
  const teile = z.includes('\t') ? z.split('\t').map((q) => q.trim()).filter(Boolean) : null;
  if (teile && teile.length >= 2) {   // Spalten: Text | Menge | EH | EP (Reihenfolge frei, Zahlen und Einheiten werden erkannt)
    const o = { kurz: '', menge: null, einheit: '', ep: null };
    teile.forEach((q) => { const n = num(q); if (n != null && /^[\d.,\s€]+$/.test(q)) { if (o.menge == null) o.menge = n; else if (o.ep == null) o.ep = n; else o.ep = n; } else if (EH.includes(q.toLowerCase()) && !o.einheit) o.einheit = q; else o.kurz = (o.kurz ? o.kurz + ' ' : '') + q; });
    if (o.ep == null && o.menge != null && !o.einheit && teile.length === 2) { o.ep = o.menge; o.menge = null; }
    return o.kurz ? { kurz: o.kurz, menge: o.menge ?? 1, einheit: o.einheit || 'psch', ep: o.ep } : null;
  }
  const o = { kurz: '', menge: null, einheit: '', ep: null };
  let m = /\s(-?[\d.]+(?:,\d+)?)\s*(?:€|eur)?\s*(?:\/\s*\w+)?$/i.exec(t); if (m) { o.ep = num(m[1]); t = t.slice(0, m.index).trim(); }   // EP am Ende
  m = new RegExp('^(\\d+(?:[.,]\\d+)?)\\s*(' + EH.join('|') + ')\\b\\s+(.+)$', 'i').exec(t); if (m) { o.menge = num(m[1]); o.einheit = m[2]; t = m[3]; }   // Menge EH vorn
  if (!o.einheit) { m = new RegExp('^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(' + EH.join('|') + ')\\.?$', 'i').exec(t); if (m) { t = m[1]; o.menge = num(m[2]); o.einheit = m[3]; } }   // Menge EH hinten
  o.kurz = t.replace(/^\d+(?:\.\d+)*\.?\s+/, '').trim();   // führende OZ weg
  return o.kurz ? { kurz: o.kurz, menge: o.menge ?? 1, einheit: o.einheit || 'psch', ep: o.ep } : null;
}
async function ntEinSenden(tr, positionen, nt) {
  const lvId = +tr.dataset.ntein; const neu = !nt;
  tr.querySelectorAll('input').forEach((i) => { i.disabled = true; });
  try {
    const r = neu ? await api(`api/lv/${lvId}/nachtrag`, 'POST', { kurz: positionen[0].kurz, als_titel: true, status: 'angemeldet', positionen: positionen.length > 1 ? positionen.slice(1) : [] })
      : await api(`api/lv/${lvId}/nachtrag`, 'POST', { zu_nt: nt, positionen });
    PC[lvId] = r; if (L && L.id === lvId) L = r;
    const ntNeu = neu ? (r.data.items.filter((y) => y.nt && !y.nt_erbe).pop() || {}).nt : nt;
    EXP.add('l' + lvId); EXP.add(`l${lvId}:nt:${ntNeu}`); render();
    const f = document.querySelector(`tr[data-ntein="${lvId}"][data-ntnt="${CSS.escape(ntNeu)}"] input[data-ne="kurz"]`); if (f) f.focus();   // weiter in der nächsten Zeile
    toast(neu ? `${ntNeu} angelegt${positionen.length > 1 ? ` mit ${positionen.length - 1} Positionen` : ''}.` : `${positionen.length} Position${positionen.length === 1 ? '' : 'en'} zu ${nt}.`);
    lvEintrag(lvId).then(() => { if (tab === 'auftraege') ntRenderBehalten(); }).catch(() => {});
  } catch (e) { toast(e.message, true); tr.querySelectorAll('input').forEach((i) => { i.disabled = false; }); }
}
/* Tabelle neu zeichnen, ohne dem Benutzer die gerade getippte Eingabezeile wegzunehmen */
function ntRenderBehalten() {
  const a = document.activeElement, i = a && a.closest && a.closest('tr[data-ntein]') ? a : null;
  const merk = i ? { lv: i.closest('tr').dataset.ntein, nt: i.closest('tr').dataset.ntnt, ne: i.dataset.ne, werte: [...i.closest('tr').querySelectorAll('input')].map((q) => [q.dataset.ne, q.value]), s: i.selectionStart } : null;
  render();
  if (!merk) return;
  const tr = document.querySelector(`tr[data-ntein="${merk.lv}"][data-ntnt="${CSS.escape(merk.nt)}"]`); if (!tr) return;
  merk.werte.forEach(([k, v]) => { const q = tr.querySelector(`input[data-ne="${k}"]`); if (q) q.value = v; });
  const f = tr.querySelector(`input[data-ne="${merk.ne}"]`); if (f) { f.focus(); try { f.setSelectionRange(merk.s, merk.s); } catch { /* egal */ } }
}
document.addEventListener('keydown', (e) => {
  const i = e.target.closest && e.target.closest('tr[data-ntein] input'); if (!i) return;
  const tr = i.closest('tr'), nt = tr.dataset.ntnt;
  if (e.key === 'Escape') { tr.querySelectorAll('input').forEach((q) => { q.value = ''; }); i.blur(); return; }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const kurz = tr.querySelector('[data-ne="kurz"]').value.trim(); if (!kurz) return;
  const q = (k) => { const el = tr.querySelector(`[data-ne="${k}"]`); return el ? el.value.trim() : ''; };
  const pos = nt ? { kurz, menge: pf(q('menge')) ?? 1, einheit: q('einheit') || 'psch', ep: q('ep') === '' ? null : pf(q('ep')) } : { kurz };
  ntEinSenden(tr, [pos], nt);
});
document.addEventListener('paste', (e) => {   // mehrere Zeilen auf einmal
  const i = e.target.closest && e.target.closest('tr[data-ntein] input[data-ne="kurz"]'); if (!i) return;
  const txt = (e.clipboardData || window.clipboardData).getData('text') || ''; const zeilen = txt.split(/\r?\n/).map((z) => z.replace(/\s+$/, '')).filter((z) => z.trim());
  if (zeilen.length < 2) return;
  e.preventDefault();
  const tr = i.closest('tr'), nt = tr.dataset.ntnt, P = zeilen.map(ntParse).filter(Boolean); if (!P.length) return;
  const html = `<h3>${nt ? `${P.length} Positionen zu ${esc(nt)}` : `Neuer Nachtrag mit ${P.length - 1} Position${P.length === 2 ? '' : 'en'}`}</h3>
    <p class="hint" style="margin:0 0 .5rem">${nt ? 'Erkannt aus der Zwischenablage – bitte kurz prüfen:' : 'Erste Zeile = Bezeichnung des Nachtrags, die weiteren = Positionen. Erkannt aus der Zwischenablage – bitte kurz prüfen:'}</p>
    <table class="nt-pos"><thead><tr><th>Bezeichnung</th><th style="width:5.5rem">Menge</th><th style="width:4.5rem">EH</th><th style="width:7rem">EP netto €</th></tr></thead><tbody>${P.map((z, n) => `<tr><td><input data-np="kurz" value="${esc(z.kurz)}"></td>${!nt && n === 0 ? '<td colspan="3" class="hint">Gliederungspunkt</td>' : `<td><input data-np="menge" value="${nf(z.menge, 2)}"></td><td><input data-np="einheit" value="${esc(z.einheit)}"></td><td><input data-np="ep" value="${z.ep != null ? nf(z.ep, 2) : ''}"></td>`}</tr>`).join('')}</tbody></table>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Übernehmen</button></div>`;
  const bg = modalBox(html, (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const rows = [...bg.querySelectorAll('tbody tr')].map((r) => { const g = (k) => { const el = r.querySelector(`[data-np="${k}"]`); return el ? el.value.trim() : ''; }; return { kurz: g('kurz'), menge: pf(g('menge')) ?? 1, einheit: g('einheit') || 'psch', ep: g('ep') === '' ? null : pf(g('ep')) }; }).filter((z) => z.kurz);
    if (!rows.length) return; close(); ntEinSenden(tr, rows, nt);
  });
  bg.querySelector('.modal').classList.add('breit');
});
/* Nachtrag (ganz) oder eine Nachtragsposition aus Aufträge löschen – mit Rückgängig (alter Stand wird zurückgeschrieben) */
async function ntLoeschen(lvId, nt, posId) {
  let lv = L && L.id === lvId ? L : PC[lvId]; if (!lv) { try { lv = await api('api/lv/' + lvId); PC[lvId] = lv; } catch (e) { toast(e.message, true); return; } }
  const I = lv.data.items || [], weg = I.filter((y) => (posId ? y.id === posId : String(y.nt) === nt));
  if (!weg.length) return;
  if (!posId && weg.length > 1 && !(await bpFrage(`Nachtrag ${nt} mit ${weg.filter((y) => y.typ === 'pos').length} Position(en) löschen?`, { ok: 'Löschen', gefahr: true }))) return;
  const alt = JSON.parse(JSON.stringify(lv.data)), ids = new Set(weg.map((y) => y.id));
  if (L && L.id === lvId) await flush();
  try {
    const r = await api('api/lv/' + lvId, 'PUT', { rev: lv.rev, data: { ...lv.data, items: I.filter((y) => !ids.has(y.id)) }, nummerieren: true });
    PC[lvId] = r; if (L && L.id === lvId) L = r; render(); lvEintrag(lvId).then(() => { if (tab === 'auftraege') render(); }).catch(() => {});
    rueckgaengig(posId ? `Nachtragsposition „${weg[0].kurz || ''}“ gelöscht` : `Nachtrag ${nt} gelöscht`, async () => {
      const cur = PC[lvId] || (L && L.id === lvId ? L : null) || await api('api/lv/' + lvId);
      const r2 = await api('api/lv/' + lvId, 'PUT', { rev: cur.rev, data: alt, nummerieren: true }); PC[lvId] = r2; if (L && L.id === lvId) L = r2; render(); lvEintrag(lvId).then(() => { if (tab === 'auftraege') render(); }).catch(() => {});
    });
  } catch (e) { toast(e.message, true); }
}
const PCL = new Set();   // LVs, die gerade für die Aufträge-Tabelle geladen werden (aufgeklappt gemerkt, Daten noch nicht da)
function pcLaden(id) { if (PCL.has(id) || PC[id]) return; PCL.add(id); api('api/lv/' + id).then((r) => { PC[id] = r; if (tab === 'auftraege') render(); }).catch(() => {}).finally(() => PCL.delete(id)); }
/* Rechts neben der Aufträge-Tabelle: Bedingungen des gewählten Auftrags (wie die Rechnungskarte rechts unter Rechnungen) – Konditionen direkt änderbar */
function auftragKarte() {
  const x = L && LIST.find((y) => y.id === L.id);
  if (!x) return '<div class="card empty au-k"><p>Links einen Auftrag wählen – hier stehen dann Firma, Summen und Auftragsbedingungen (Nachlass, Skonto, Sicherheiten).</p></div>';
  const V = L.vergabe || {}, K = L.calc || {}, nt = K.nachtraege || {}, an = !!(V.bieter && (V.preise || V.frei));
  const kopf = `<div class="re-wo">${esc([x.nr, x.name].filter(Boolean).join(' '))}${x.gewerk ? ' · ' + esc(x.gewerk) : ''}</div>`;
  if (!an) return `<div class="card au-k">${kopf}<h3>Noch kein Auftrag</h3><p class="hint">${x.status === 'nicht_vergeben' ? 'Als „nicht vergeben“ gekennzeichnet.' : x.angebote.length ? `${x.angebote.length} Angebot${x.angebote.length === 1 ? '' : 'e'} – vergeben unter „Angebote & Preisspiegel“.` : 'Noch keine Angebote.'}</p>
    <div class="au-sum"><span>Schätzung<b>${eur(K.schaetzung || 0)}</b></span></div></div>`;
  const ges = (K.auftrag || 0) + (nt.beauftragt || 0), rest = ges - (K.abgerechnet || 0);
  const zeile = (l, v, t = '') => `<span${t ? ` title="${esc(t)}"` : ''}>${l}<b>${v}</b></span>`;
  return `<div class="card au-k">${kopf}<h3>${x.aufgehoben ? '⏸ ' : ''}${esc(V.bieter)} <span class="pill ${x.aufgehoben ? 'mu' : 'ok'}">${x.aufgehoben ? 'Beauftragung aufgehoben' : V.frei && !V.preise ? 'Auftrag frei eingetragen' : 'beauftragt' + (V.datum ? ' am ' + de(V.datum) : '')}</span></h3>
    <div class="au-sum">${zeile('Auftrag netto', eur(K.auftrag || 0), V.nachlass || V.nachlass_eur ? 'nach ' + nlText(V) + ' Nachlass' : '')}${zeile('Nachträge beauftragt', eur(nt.beauftragt || 0))}${nt.angemeldet ? zeile('angemeldet', eur(nt.angemeldet)) : ''}${zeile('Prognose', eur(ges + (nt.angemeldet || 0)), 'Auftrag + beauftragte und angemeldete Nachträge')}${zeile('Leistungsstand', eur(K.leistung || 0))}${zeile('abgerechnet', eur(K.abgerechnet || 0))}${zeile('noch offen', eur(rest), 'Auftrag + beauftragte Nachträge − abgerechnet')}</div>
    <h4>Auftragsbedingungen</h4>
    <div class="au-kond">${auftragKonditionen(V)}</div>
    <p class="hint" style="margin:.4rem 0 0">Auftragsnummer, Vertragsart, Fristen, Vertragsstrafe und Zahlungsfrist: <button type="button" class="btn sm" data-act="lvDaten">LV- &amp; Auftragsdaten …</button></p>
  </div>${istOA(L.id) ? '' : vSicherheiten(K)}`;
}
/* Nachtrag von Hand (Aufträge): Text, Menge × EP oder Pauschale, Status – Position unter „Nachträge“, EP wird Auftragspreis */
/* Langtext in einem eigenen Fenster bearbeiten (wie im LV) – fertig(text) bei „Übernehmen“ */
function langFenster(titel, text, fertig) {
  const bg = modalBox(`<h3>${esc(titel || 'Langtext')}</h3><p class="hint" style="margin:0 0 .5rem">Langtext – Leistungsbeschreibung, Material, Fabrikat, Ausführung, Abrechnung.</p>
    <textarea id="dLang" rows="16" style="width:100%;box-sizing:border-box;font:inherit;line-height:1.45">${esc(text || '')}</textarea>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">OK</button></div>`, (m, b2, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const neu = b2.querySelector('#dLang').value.replace(/\s+$/, ''); close(); fertig(neu);
  });
  bg.querySelector('.modal').style.width = 'min(760px,100%)'; bg.style.zIndex = 9500;
  setTimeout(() => { const t = bg.querySelector('#dLang'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 30);
}
/* Nachtragsangebot der Firma einlesen (GAEB X84/X86, Excel oder PDF/Scan): Positionen lesen, im Nachtragsdialog prüfen, als ein Nachtrag übernehmen */
function ntAngebot(lvId, datei) {
  const los = async (f) => {
    if (!f) return; const fd = new FormData(); fd.append('datei', f);
    try {
      const r = await fetch(`api/lv/${lvId}/nachtrag/lesen`, { method: 'POST', body: fd, credentials: 'same-origin' }); const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) throw new Error(j.error || 'Lesen hat nicht geklappt (' + r.status + ').');
      if (!j.positionen.length) { toast('In der Datei wurden keine Positionen erkannt – bitte von Hand erfassen.', true); ntDialog(lvId); return; }
      ntDialog(lvId, null, { liste: j.positionen, titel: j.titel, datei: f.name, ocr: j.ocr, grund: `Nachtragsangebot ${j.firma ? j.firma + ' ' : ''}(${f.name})` });
    } catch (e) { toast(e.message, true); }
  };
  if (datei) return los(datei);
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.x84,.x86,.x83,.d84,.p84,.xml,.xlsx,.pdf,image/*'; i.onchange = () => los(i.files[0]); i.click();
}
/* Nachtrag aus einer Auftragsposition ableiten: Mehrmenge (gleiche Leistung, Auftrags-EP) oder geänderte Leistung („wie Pos. …, jedoch …“) */
function ntAbleiten(lvId, posId) {
  const lv = PC[lvId] || (L && L.id === lvId ? L : null); if (!lv) return;
  const y = (lv.data.items || []).find((q) => q.id === posId); if (!y || y.typ !== 'pos') return;
  const ep = ((lv.vergabe || {}).preise || {})[y.id] ?? y.ep_s ?? null;
  ntDialog(lvId, null, { oz: y.oz || '', kurz: y.kurz || '', lang: y.lang || '', einheit: y.einheit || 'psch', ep, menge: y.menge });
}
function ntDialog(lvId, zuNt = null, ab = null) {   // zuNt: weitere Positionen zu einem vorhandenen Nachtrag (nur die Positionstabelle); ab: aus einer Position ableiten
  const x = LIST.find((y) => y.id === lvId) || {};
  const bg = modalBox(`<h3>${zuNt ? `Positionen zu ${esc(zuNt)} hinzufügen` : 'Nachtrag erfassen'} <span class="hint">· ${esc([x.nr, x.name].filter(Boolean).join(' '))}${x.auftragnehmer ? ' · ' + esc(x.auftragnehmer) : ''}</span></h3><div class="fm"${zuNt ? ' hidden' : ''}>
      ${ab && !ab.liste ? `<label>Abgeleitet aus</label><div><b>${esc([ab.oz, ab.kurz].filter(Boolean).join(' '))}</b><span class="hint"> · Auftrag ${esc(nf(ab.menge))} ${esc(ab.einheit)}${ab.ep != null ? ' à ' + eur(ab.ep) : ''}</span></div>
      <label>Art</label><select id="ntA"><option value="mehr">Mehrmenge – gleiche Leistung zum Auftrags-EP</option><option value="aend">Geänderte Leistung – „wie Pos. …, jedoch …“</option></select>` : ''}
      <label>Umfang</label><select id="ntU"${ab && !ab.liste ? ' disabled' : ''}><option value="pos">eine Position (unter dem Titel „Nachträge“)</option><option value="titel">eigener Gliederungspunkt (mehrere Positionen folgen im LV)</option></select>
      <label>Bezeichnung</label><div style="display:flex;gap:.4rem"><input id="ntK" placeholder="z. B. Zusätzliche Kernbohrungen DN 150" style="flex:1"><button type="button" class="ib" id="ntL" title="Langtext">¶</button></div>
      <label>Menge</label><input id="ntM" value="1" inputmode="decimal" style="width:7rem">
      <label>Einheit</label><input id="ntE" value="psch" data-vs="eh" autocomplete="off" style="width:7rem">
      <label>EP netto €</label><input id="ntP" inputmode="decimal" style="width:9rem" placeholder="Preis der Firma">
      <label>Stand</label><select id="ntS"><option value="angemeldet">angemeldet (Firma hat angekündigt)</option><option value="beauftragt">beauftragt</option><option value="abgelehnt">abgelehnt</option></select>
      <label>Grund / Bemerkung</label><input id="ntG" placeholder="z. B. geänderte Ausführung, Bauherrenwunsch"></div>
    <div id="ntPos" hidden style="margin-top:.7rem"><b style="font-size:var(--fs)">Positionen des Nachtrags</b> <span class="hint">– Tab/Enter springt weiter, in der letzten Zeile kommt eine neue dazu; Zeilen ohne Bezeichnung werden übergangen</span>
      <table class="nt-pos"><thead><tr><th>Bezeichnung</th><th style="width:5.5rem">Menge</th><th style="width:4.5rem">EH</th><th style="width:7rem">EP netto €</th><th></th></tr></thead><tbody id="ntPosB"></tbody></table>
      <button type="button" class="btn sm" data-ntz="+">＋ Zeile</button></div>
    <p class="hint" style="margin:.6rem 0 0" id="ntH">Kommt als Position unter den Titel „Nachträge“ des LV; beauftragte und angemeldete Nachträge zählen in Prognose und Rechnungsprüfung, abgelehnte nicht. Langtext und Details danach im Leistungsverzeichnis.</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Erfassen</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const kurz = $('#ntK').value.trim(); if (!kurz && !zuNt) { toast('Bitte eine Bezeichnung eintragen.', true); return; }
    btn.disabled = true;
    try {
      if (zuNt) {
        const positionen = [...bg.querySelectorAll('#ntPosB tr')].map((tr) => ({ kurz: tr.querySelector('[data-np="kurz"]').value.trim(), menge: pf(tr.querySelector('[data-np="menge"]').value) ?? 1, einheit: tr.querySelector('[data-np="einheit"]').value.trim() || 'psch', ep: tr.querySelector('[data-np="ep"]').value.trim() === '' ? null : pf(tr.querySelector('[data-np="ep"]').value), lang: tr.dataset.lang || '' })).filter((z) => z.kurz);
        if (!positionen.length) { toast('Bitte mindestens eine Position mit Bezeichnung eintragen.', true); btn.disabled = false; return; }
        const r = await api(`api/lv/${lvId}/nachtrag`, 'POST', { zu_nt: zuNt, positionen });
        close(); PC[lvId] = r; if (L && L.id === lvId) L = r; EXP.add('l' + lvId); EXP.add(`l${lvId}:nt:${zuNt}`); render(); toast(`${positionen.length} Position${positionen.length === 1 ? '' : 'en'} zu ${zuNt} hinzugefügt.`);
        lvEintrag(lvId).then(() => { if (tab === 'auftraege') render(); }).catch(() => {}); return;
      }
      const titel = $('#ntU').value === 'titel';
      const positionen = titel ? [...bg.querySelectorAll('#ntPosB tr')].map((tr) => ({ kurz: tr.querySelector('[data-np="kurz"]').value.trim(), menge: pf(tr.querySelector('[data-np="menge"]').value) ?? 1, einheit: tr.querySelector('[data-np="einheit"]').value.trim() || 'psch', ep: tr.querySelector('[data-np="ep"]').value.trim() === '' ? null : pf(tr.querySelector('[data-np="ep"]').value), lang: tr.dataset.lang || '' })).filter((z) => z.kurz) : [];
      const r = await api(`api/lv/${lvId}/nachtrag`, 'POST', { kurz, menge: pf($('#ntM').value), einheit: $('#ntE').value.trim(), ep: $('#ntP').value.trim() === '' ? null : pf($('#ntP').value), status: $('#ntS').value, grund: $('#ntG').value.trim(), als_titel: titel, positionen,
        ...(ab && !ab.liste ? { lang: $('#ntA').value === 'mehr' ? ab.lang : (ab.lang ? `wie Pos. ${ab.oz}, jedoch: …\n\n${ab.lang}` : ''), bezug: ab.oz } : {}), ...(langK && !(ab && !ab.liste && langK === ab.lang) ? { lang: langK } : {}) });
      close(); PC[lvId] = r; if (L && L.id === lvId) L = r; EXP.add('l' + lvId); EXP.add(`l${lvId}:nt:${(r.data.items.filter((y) => y.nt && !y.nt_erbe).pop() || {}).nt}`);
      render(); toast(titel && positionen.length ? `Nachtrag mit ${positionen.length} Position${positionen.length === 1 ? '' : 'en'} erfasst.` : 'Nachtrag erfasst.');
      lvEintrag(lvId).then(() => { if (tab === 'auftraege') render(); }).catch(() => {});   // Summen des LV nachziehen, ohne die ganze Liste neu zu rechnen
    } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  let langK = ab && !ab.liste ? ab.lang || '' : '';   // Langtext der einzelnen Position
  const lMark = () => { const b = bg.querySelector('#ntL'); if (b) b.classList.toggle('on', !!langK); bg.querySelectorAll('#ntPosB tr').forEach((tr) => { const x = tr.querySelector('[data-ntz="lang"]'); if (x) x.classList.toggle('on', !!tr.dataset.lang); }); };
  if (ab && !ab.liste) {   // Felder aus der Position vorbelegen; Art umschalten passt Bezeichnung und Menge an
    const setz = () => { const mehr = $('#ntA').value === 'mehr';
      $('#ntK').value = mehr ? `Mehrmenge zu Pos. ${ab.oz} ${ab.kurz}`.trim() : `wie Pos. ${ab.oz}, jedoch: `;
      $('#ntM').value = mehr ? '' : nf(ab.menge || 1); $('#ntE').value = ab.einheit || 'psch'; $('#ntP').value = ab.ep != null ? nf(ab.ep, 2) : '';
      $('#ntG').value = mehr ? 'Mehrmenge gegenüber dem Auftrag' : 'geänderte Ausführung';
      langK = mehr ? ab.lang || '' : (ab.lang ? `wie Pos. ${ab.oz}, jedoch: …\n\n${ab.lang}` : ''); lMark();
      $('#ntH').textContent = mehr ? 'Gleiche Leistung, Einheitspreis aus dem Auftrag – nur die zusätzliche Menge eintragen. Kommt als Position unter „Nachträge“.' : 'Text, Menge und Preis an die geänderte Ausführung anpassen; der Langtext der Position wird mit „wie Pos. …, jedoch“ übernommen.';
      setTimeout(() => { const f = mehr ? $('#ntM') : $('#ntK'); f.focus(); if (!mehr) f.setSelectionRange(f.value.length, f.value.length); }, 0); };
    $('#ntA').addEventListener('change', setz); setz();
  }
  const zeile = () => { const tr = document.createElement('tr'); tr.innerHTML = '<td><input data-np="kurz" placeholder="Bezeichnung"></td><td><input data-np="menge" value="1" inputmode="decimal"></td><td><input data-np="einheit" value="psch" data-vs="eh" autocomplete="off"></td><td><input data-np="ep" inputmode="decimal" placeholder="EP"></td><td style="white-space:nowrap"><button type="button" class="ib" data-ntz="lang" title="Langtext">¶</button><button type="button" class="ib" data-ntz="-" title="Zeile entfernen">✕</button></td>'; bg.querySelector('#ntPosB').appendChild(tr); return tr; };
  bg.querySelector('#ntL').addEventListener('click', (ev) => { ev.stopPropagation(); langFenster($('#ntK').value.trim() || 'Langtext', langK, (t) => { langK = t; lMark(); }); });
  bg.querySelector('#ntPos').addEventListener('click', (ev) => { const b = ev.target.closest('[data-ntz]'); if (!b) return; ev.stopPropagation();
    if (b.dataset.ntz === 'lang') { const tr = b.closest('tr'); langFenster(tr.querySelector('[data-np="kurz"]').value.trim() || 'Langtext', tr.dataset.lang || '', (t) => { tr.dataset.lang = t; lMark(); }); return; }
    if (b.dataset.ntz === '+') zeile().querySelector('input').focus(); else { b.closest('tr').remove(); if (!bg.querySelector('#ntPosB tr')) zeile(); } });
  bg.querySelector('#ntPos').addEventListener('keydown', (ev) => {   // Enter/Tab in der letzten Zeile: neue Zeile
    if (!ev.target.matches('[data-np]')) return; const tr = ev.target.closest('tr'), letzte = tr === bg.querySelector('#ntPosB tr:last-child'), letztesFeld = ev.target.dataset.np === 'ep';
    if (ev.key === 'Enter' || (ev.key === 'Tab' && !ev.shiftKey && letzte && letztesFeld)) { if (letzte && (letztesFeld || ev.key === 'Enter')) { ev.preventDefault(); if (tr.querySelector('[data-np="kurz"]').value.trim()) zeile().querySelector('input').focus(); } else if (ev.key === 'Enter') { ev.preventDefault(); const f = [...tr.querySelectorAll('[data-np]')]; (f[f.indexOf(ev.target) + 1] || tr.nextElementSibling.querySelector('input')).focus(); } }
  });
  bg.querySelector('#ntU').addEventListener('change', (ev) => {   // Gliederungspunkt: Positionen gleich mit erfassen, Menge/Einheit/EP oben entfallen
    const t = ev.target.value === 'titel'; ['#ntM', '#ntE', '#ntP'].forEach((q) => { const el = bg.querySelector(q); el.disabled = t; });
    bg.querySelector('#ntK').placeholder = t ? 'Bezeichnung des Nachtrags, z. B. Umbau Lüftung Keller' : 'z. B. Zusätzliche Kernbohrungen DN 150';
    const box = bg.querySelector('#ntPos'); box.hidden = !t; if (t && !box.querySelector('tbody tr')) { zeile(); zeile(); zeile(); }
    bg.querySelector('#ntH').textContent = t ? 'Legt unter dem Titel „Nachträge“ einen eigenen Gliederungspunkt als Nachtrag an – mit den Positionen aus der Tabelle; die EPs werden Auftragspreise. Weitere Positionen später im Leistungsverzeichnis darunter eintragen – sie gehören automatisch zum Nachtrag.'
      : 'Kommt als Position unter den Titel „Nachträge“ des LV; beauftragte und angemeldete Nachträge zählen in Prognose und Rechnungsprüfung, abgelehnte nicht. Langtext und Details danach im Leistungsverzeichnis.';
    const md = bg.querySelector('.modal'); if (md) md.classList.toggle('breit', t);
  });
  if (ab && ab.liste) {   // Nachtragsangebot der Firma: alle gelesenen Positionen als eigener Gliederungspunkt
    const u = bg.querySelector('#ntU'); u.value = 'titel'; u.dispatchEvent(new Event('change'));
    bg.querySelector('#ntPosB').innerHTML = '';
    ab.liste.forEach((z) => { const tr = zeile(); tr.dataset.lang = z.lang || ''; tr.title = z.lang ? z.lang.slice(0, 600) : ''; tr.querySelector('[data-np="kurz"]').value = [z.oz, z.kurz].filter(Boolean).join(' ');
      tr.querySelector('[data-np="menge"]').value = z.menge != null ? nf(z.menge) : '1'; tr.querySelector('[data-np="einheit"]').value = z.einheit || 'psch'; tr.querySelector('[data-np="ep"]').value = z.ep != null ? nf(z.ep, 2) : ''; });
    if (!ab.liste.length) zeile();
    lMark();
    $('#ntK').value = ab.titel || 'Nachtragsangebot'; $('#ntG').value = ab.grund || '';
    bg.querySelector('#ntH').textContent = `${ab.liste.length} Position${ab.liste.length === 1 ? '' : 'en'} aus „${ab.datei || 'Angebot'}“ gelesen${ab.ocr ? ' (Scan – bitte besonders prüfen)' : ''}. Prüfen, korrigieren, überflüssige Zeilen mit ✕ entfernen – dann als ein Nachtrag mit eigenem Gliederungspunkt erfassen; die EPs werden Auftragspreise.`;
    const md = bg.querySelector('.modal'); if (md) md.classList.add('breit');
  }
  if (zuNt) { const box = bg.querySelector('#ntPos'); box.hidden = false; zeile(); zeile(); zeile(); bg.querySelector('#ntH').textContent = `Die Positionen kommen zum Nachtrag ${zuNt} und übernehmen seinen Stand; die EPs werden Auftragspreise.`; const md = bg.querySelector('.modal'); if (md) md.classList.add('breit'); bg.querySelector('[data-m="ok"]').textContent = 'Hinzufügen'; setTimeout(() => bg.querySelector('#ntPosB input').focus(), 30); return; }
  setTimeout(() => $('#ntK').focus(), 30);
}
document.addEventListener('click', async (e) => { const b = e.target.closest && e.target.closest('[data-ntdel]'); if (!b) return; e.stopPropagation(); const [lv, nt, pid_] = b.dataset.ntdel.split(':');
  const sel = b.closest('tr') && b.closest('tr').querySelector('select.nt-st.beauftragt'); if (sel && !(await bpFrage('Dieser Nachtrag ist beauftragt.\n\nWirklich löschen?', { ok: 'Löschen', abbrechen: 'Nicht löschen', gefahr: true }))) return;   // beauftragt: nur nach Bestätigung
  ntLoeschen(+lv, decodeURIComponent(nt), pid_ || null); });
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-ntneu]'); if (b) { e.stopPropagation(); ntDialog(+b.dataset.ntneu); } });
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-ntang]'); if (b) { e.stopPropagation(); ntAngebot(+b.dataset.ntang); } });
document.addEventListener('change', async (e) => {
  const s = e.target.closest && e.target.closest('[data-ntst]'); if (!s || s.value === 'gemischt') return;
  const war = ['angemeldet', 'beauftragt', 'abgelehnt'].find((c) => s.classList.contains(c));
  if (war === 'beauftragt' && !(await bpFrage('Dieser Nachtrag ist beauftragt.\n\nStand wirklich ändern?', { ok: '🔓 Ändern', abbrechen: 'Nicht ändern' }))) { s.value = war; return; }   // beauftragt: nur nach Bestätigung
  const [lvId, pid_] = s.dataset.ntst.split(':'); s.classList.remove('angemeldet', 'beauftragt', 'abgelehnt'); s.classList.add(s.value);   // Farbe gleich umschalten
  try { const r = await api(`api/lv/${lvId}/nachtrag/${pid_}`, 'PUT', { status: s.value }); PC[+lvId] = r; if (L && L.id === +lvId) L = r; render(); toast(`Nachtrag ${s.value}.`); lvEintrag(+lvId).then(() => { if (tab === 'auftraege') render(); }).catch(() => {}); }
  catch (er) { toast(er.message, true); }
});
async function treeCar(k) {
  if (EXP.has(k)) EXP.delete(k); else EXP.add(k);
  // Zuklappen räumt die Unterebenen ab: beim nächsten Aufklappen kommt die kompakte Liste, aufgeklappt wird dann gezielt einzeln
  if (k.startsWith('-p') && EXP.has(k)) { [...EXP].forEach((q) => { if (/^l\d+/.test(q)) EXP.delete(q); }); }   // Projekt zu → alle LVs samt Titeln/Nachträgen zu
  else if (/^l\d+$/.test(k) && EXP.has(k)) { [...EXP].forEach((q) => { if (/^l\d+/.test(q) && q !== k && !q.startsWith(k + ':')) EXP.delete(q); }); }   // LV auf → die anderen LVs klappen zu
  else if (/^l\d+$/.test(k) && !EXP.has(k)) { [...EXP].forEach((q) => { if (q.startsWith(k + ':')) EXP.delete(q); }); }   // LV zu → seine Titel und Nachträge zu
  else if (/^l\d+:/.test(k) && !EXP.has(k)) {   // Titel zu → seine Untertitel zu
    const lv = PC[+k.slice(1).split(':')[0]]; if (lv) { const R = lvBaum(lv), unter = new Set([k]); R.forEach((r) => { if (unter.has(r.par)) unter.add(r.k); }); unter.forEach((q) => EXP.delete(q)); }
  }
  LS.set('exp', [...EXP].slice(-300));
  const m = /^l(\d+)$/.exec(k);
  if (m && EXP.has(k) && !PC[+m[1]]) { render(); try { PC[+m[1]] = await api('api/lv/' + m[1]); } catch (e) { toast(e.message, true); } }
  render();
}
document.addEventListener('click', async (e) => {
  if (tab !== 'auftraege') return;
  const c = e.target.closest('[data-car]'); if (c) { e.stopPropagation(); const z = c.closest('tr'), zurueck = bpBaum.anker(z, z && z.dataset.tr ? `table.au-t tr[data-tr="${CSS.escape(z.dataset.tr)}"]` : null); await treeCar(c.dataset.car); zurueck(); return; }   // Zeile bleibt unter der Maus
  const tr = e.target.closest('tr[data-tr]'); if (!tr) return;
  TSEL = tr.dataset.tr; const m = /^l(\d+)/.exec(TSEL);
  // nur die Markierung umsetzen – kein Neuaufbau, sonst geht der Doppelklick ins Leere
  document.querySelectorAll('.tree tr.sel').forEach((r) => r.classList.remove('sel')); tr.classList.add('sel');
  if (m && (!L || L.id !== +m[1])) { await flush(); L = await api('api/lv/' + m[1]); LS.set('lv:' + pid, L.id); PC[L.id] = L; selBtn(); kpis(); $('#phT').textContent = 'Aufträge: ' + ((PROJ.find((p) => p.id === pid) || {}).name || '');
  }
  auSeite();   // Bereich rechts folgt der Auswahl, die Tabelle bleibt stehen
  uLeisteNeu();   // Befehlsleiste folgt dem gewählten Auftrag
});
document.addEventListener('bph:kontext', (e) => {   // rechte Maustaste in der Aufträge-Tabelle
  if (tab !== 'auftraege') return;
  const tr = e.detail.ziel.closest && e.detail.ziel.closest('.tree tr[data-tr]'); if (!tr) return;
  const k = tr.dataset.tr, P = e.detail.punkte;
  let m = /^l(\d+):nt:(.+)$/.exec(k);
  if (m) {   // Nachtrag (Gruppe): Positionen dazu, Stand, im LV öffnen
    const lvId = +m[1], nt = decodeURIComponent(m[2]);
    P.push({ text: `Positionen zu ${nt} hinzufügen …`, fn: () => ntDialog(lvId, nt) });
    ['angemeldet', 'beauftragt', 'abgelehnt'].forEach((st) => P.push({ text: `${nt} → ${st}`, fn: async () => { try { const r = await api(`api/lv/${lvId}/nachtrag/nt=${encodeURIComponent(nt)}`, 'PUT', { status: st }); PC[lvId] = r; if (L && L.id === lvId) L = r; render(); lvEintrag(lvId).then(() => { if (tab === 'auftraege') render(); }).catch(() => {}); } catch (er) { toast(er.message, true); } } }));
    P.push({ text: 'Im Leistungsverzeichnis öffnen', fn: () => kmLv(lvId, () => { tab = 'lv'; LS.set('tab', tab); render(); }) });
    P.push({ text: `Nachtrag ${nt} löschen …`, gefahr: true, fn: () => ntLoeschen(lvId, nt, null) });
    return;
  }
  m = /^l(\d+)(?::(.+))?$/.exec(k); if (!m) return;
  const lvId = +m[1];
  if (m[2]) { const lv = PC[lvId], y = lv && (lv.data.items || []).find((q) => q.id === m[2]); if (y && y.nt && y.typ === 'pos') P.push({ text: 'Diese Nachtragsposition löschen', gefahr: true, fn: () => ntLoeschen(lvId, String(y.nt), y.id) });
    if (y && !y.nt && y.typ === 'pos') P.push({ text: 'Nachtrag aus dieser Position …', fn: () => ntAbleiten(lvId, y.id) });
    P.push({ text: 'Im Leistungsverzeichnis öffnen', fn: () => kmLv(lvId, () => { tab = 'lv'; LS.set('tab', tab); render(); setTimeout(() => { const z = document.querySelector(`table.lv tr[data-i]`); const I = items(), i = I.findIndex((y) => y.id === m[2]); const row = i >= 0 && document.querySelector(`table.lv tr[data-i="${i}"]`); if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('pj-blink'); setTimeout(() => row.classList.remove('pj-blink'), 1600); } else if (z) z.scrollIntoView(); }, 300); }) }); return; }
  kmLvPunkte(P, lvId);
  P.push({ text: 'LV- & Auftragsdaten …', fn: () => kmLv(lvId, () => lvDaten()) });
});
/* Aufträge: Doppelklick auf einen Nachtrag → abgespeckter Dialog für die Ebene Nachtrag (Bezeichnung, Nummer, Stand, Grund);
   auf eine Nachtragsposition → Bezeichnung, Menge, Einheit, EP, Stand. Gespeichert wird über das LV (data + Auftragspreis). */
async function ntSpeichern(lvId, aendern) {
  let lv = L && L.id === lvId ? L : PC[lvId]; if (!lv) { lv = await api('api/lv/' + lvId); PC[lvId] = lv; }
  if (L && L.id === lvId) await flush();
  const data = JSON.parse(JSON.stringify(lv.data)), preise = {};
  aendern(data.items || [], preise);
  const body = { rev: lv.rev, data, nummerieren: true }; if (Object.keys(preise).length) body.vergabe = { preise };
  const r = await api('api/lv/' + lvId, 'PUT', body); PC[lvId] = r; if (L && L.id === lvId) L = r; render();
  lvEintrag(lvId).then(() => { if (tab === 'auftraege') render(); }).catch(() => {});
}
function ntKopfDialog(lvId, nt) {
  const lv = PC[lvId] || (L && L.id === lvId ? L : null); if (!lv) return;
  const I = lv.data.items || [], grp = I.filter((y) => String(y.nt) === nt), titel = grp.find((y) => y.typ === 'titel'), kopf = titel || grp[0]; if (!kopf) return;
  const nPos = grp.filter((y) => y.typ === 'pos').length, einzeln = !titel && nPos === 1;
  const bg = modalBox(`<h3>Nachtrag ${esc(nt)} <span class="hint">· ${titel ? 'Gliederungspunkt · ' : ''}${nPos} Position${nPos === 1 ? '' : 'en'}</span></h3><div class="fm">
      <label>Bezeichnung</label><input id="nkK" value="${esc(kopf.kurz || '')}"${!titel && !einzeln ? ' disabled title="mehrere Einzelpositionen – Bezeichnung je Position"' : ''}>
      <label>Nummer</label><input id="nkN" value="${esc(nt)}" style="width:7rem">
      <label>Stand</label><select id="nkS">${['angemeldet', 'beauftragt', 'abgelehnt'].map((s2) => `<option${(kopf.nt_status || 'angemeldet') === s2 ? ' selected' : ''}>${s2}</option>`).join('')}</select>
      <label>Grund / Bemerkung</label><input id="nkG" value="${esc(kopf.nt_grund || '')}" placeholder="z. B. geänderte Ausführung, Bauherrenwunsch"></div>
    <p class="hint" style="margin:.6rem 0 0">Stand und Grund gelten für alle Positionen des Nachtrags. Langtexte und Details der Positionen im Leistungsverzeichnis (Doppelklick auf eine Position).</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">OK</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const q = (k) => bg.querySelector('#' + k), nr = q('nkN').value.trim() || nt, st = q('nkS').value, gr = q('nkG').value.trim(), kz = q('nkK').value.trim();
    if (nr !== nt && I.some((y) => String(y.nt) === nr)) { toast(`Die Nummer „${nr}“ ist schon vergeben.`, true); return; }
    btn.disabled = true;
    try {
      await ntSpeichern(lvId, (items) => items.forEach((y) => { if (String(y.nt) !== nt) return; y.nt = nr; y.nt_status = st; y.nt_grund = gr; if ((titel && y.typ === 'titel') || (einzeln && y.typ === 'pos')) y.kurz = kz || y.kurz; }));
      if (nr !== nt) { EXP.delete(`l${lvId}:nt:${nt}`); EXP.add(`l${lvId}:nt:${nr}`); render(); }
      close(); toast(`Nachtrag ${nr} übernommen.`);
    } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  setTimeout(() => bg.querySelector('#nkK:not([disabled]), #nkS').focus(), 30);
}
function ntPosDialog(lvId, posId) {
  const lv = PC[lvId] || (L && L.id === lvId ? L : null); if (!lv) return;
  const y = (lv.data.items || []).find((q) => q.id === posId); if (!y) return;
  const VP = (lv.vergabe || {}).preise || {}, ep = VP[y.id] ?? y.ep_s;
  const bg = modalBox(`<h3>Nachtragsposition <span class="hint">· ${esc(y.nt || '')} · ${esc(y.oz || '')}</span></h3><div class="fm">
      <label>Bezeichnung</label><input id="npK" value="${esc(y.kurz || '')}">
      <label>Menge</label><input id="npM" value="${nf(y.menge || 0, 3).replace(/,?0+$/, '')}" inputmode="decimal" style="width:7rem">
      <label>Einheit</label><input id="npE" value="${esc(y.einheit || '')}" data-vs="eh" autocomplete="off" style="width:7rem">
      <label>EP netto €</label><input id="npP" value="${ep != null ? nf(ep, 2) : ''}" inputmode="decimal" style="width:9rem" placeholder="Preis der Firma">
      <label>Langtext</label><div><button type="button" class="btn sm${y.lang ? ' on' : ''}" id="npL">¶ Langtext …</button> <span class="hint" id="npLh">${y.lang ? esc(y.lang.slice(0, 60)) + (y.lang.length > 60 ? ' …' : '') : 'noch keiner'}</span></div>
      <label>Stand</label><select id="npS"${y.nt_erbe ? ' title="erbt vom Gliederungspunkt – ein eigener Stand löst die Position davon"' : ''}>${['angemeldet', 'beauftragt', 'abgelehnt'].map((s2) => `<option${(y.nt_status || 'angemeldet') === s2 ? ' selected' : ''}>${s2}</option>`).join('')}</select></div>
    <p class="hint" style="margin:.6rem 0 0">Kostengruppe und alles Weitere im Leistungsverzeichnis.</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">OK</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const q = (k) => bg.querySelector('#' + k).value.trim(); const kz = q('npK'); if (!kz) { toast('Bitte eine Bezeichnung eintragen.', true); return; }
    const menge = pf(q('npM')) ?? y.menge, einheit = q('npE') || y.einheit, epN = q('npP') === '' ? null : pf(q('npP')), st = q('npS');
    btn.disabled = true;
    try {
      await ntSpeichern(lvId, (items, preise) => { const z = items.find((w) => w.id === posId); if (!z) return; z.kurz = kz; z.lang = langN; z.menge = menge; z.einheit = einheit; if (epN != null) { z.ep_s = epN; preise[posId] = epN; } if (st !== (z.nt_status || 'angemeldet')) { z.nt_status = st; delete z.nt_erbe; } });
      close(); toast('Position übernommen.');
    } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  let langN = y.lang || '';
  bg.querySelector('#npL').addEventListener('click', (ev) => { ev.stopPropagation(); langFenster(bg.querySelector('#npK').value.trim() || y.kurz, langN, (t) => { langN = t; bg.querySelector('#npL').classList.toggle('on', !!t); bg.querySelector('#npLh').textContent = t ? t.slice(0, 60) + (t.length > 60 ? ' …' : '') : 'noch keiner'; }); });
  setTimeout(() => bg.querySelector('#npK').focus(), 30);
}
document.addEventListener('dblclick', async (e) => {
  if (tab !== 'auftraege') return;
  const tr = e.target.closest('tr[data-tr]'); if (!tr) return;
  if (e.target.closest('select,button') || (e.target.closest('input') && !e.target.closest('input.aui'))) return;
  const g = /^l(\d+):nt:(.+)$/.exec(tr.dataset.tr);
  if (g) { e.preventDefault(); if (getSelection) getSelection().removeAllRanges(); const lvId = +g[1], nt = decodeURIComponent(g[2]), lv = PC[lvId], I = (lv && lv.data.items) || [];
    const gl = I.filter((y) => String(y.nt) === nt), ein = !gl.some((y) => y.typ === 'titel') && gl.filter((y) => y.typ === 'pos');
    if (ein && ein.length === 1) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); kmLv(lvId, () => eigDialog(ein[0].id)); return; }   // einzelne Nachtragsposition: Eigenschaften wie im LV
    ntKopfDialog(lvId, nt); return; }
  const m = /^l(\d+)(?::(.+))?$/.exec(tr.dataset.tr);
  clearTimeout(auBearb.t);   // kein Bearbeiten im Feld, wenn doppelt geklickt wurde
  if (m && m[2]) { const lv = PC[+m[1]], y = lv && (lv.data.items || []).find((q) => q.id === m[2]); if (y) { e.preventDefault(); if (getSelection) getSelection().removeAllRanges(); const lvId = +m[1];   // wie im LV: Eigenschaften der Position bzw. des Gliederungspunkts
      kmLv(lvId, () => (y.typ === 'titel' ? titelDialog(y.id) : eigDialog(y.id))); return; } }
  if (!m) { if (tr.dataset.tr.startsWith('p')) treeCar('-' + tr.dataset.tr); return; }
  if (!m[2]) {   // Auftrag (LV-Zeile): Eigenschaften öffnen wie bei Nachtrag und Gliederungspunkt – nicht auf- und zuklappen (das macht der Pfeil), kein Neuaufbau
    e.preventDefault(); if (getSelection) getSelection().removeAllRanges(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    kmLv(+m[1], () => lvDaten()); return; }
  await flush(); if (!L || L.id !== +m[1]) await openLv(+m[1]);
  if (m[2]) {
    tab = 'lv'; LS.set('tab', tab); OPEN.add(m[2]); render();
    const i = items().findIndex((x) => x.id === m[2]); const r = document.querySelector(`tr[data-i="${i}"]`);
    if (r) { r.scrollIntoView({ block: 'center' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 1600); }
  }
});

/* ---------- Übersicht Projekt (Kostenkontrolle) ---------- */
function vUebersicht() {
  if (!LIST.length) return '<div class="card empty">Noch keine Leistungsverzeichnisse in diesem Projekt.</div>';
  const S = { s: 0, a: 0, au: 0, nt: 0, ab: 0 };
  const rows = LIST.filter((x) => !x.archived).map((x) => {
    const auf = x.auftrag + x.nachtraege; S.s += x.schaetzung; S.a += x.min_angebot; S.au += x.auftrag; S.nt += x.nachtraege; S.ab += x.abgerechnet;
    return `<tr data-ue="${x.id}"><td>${esc(x.nr)}</td><td><b>${esc(x.name)}</b><br><span class="hint">${esc([x.gewerk, x.auftragnehmer].filter(Boolean).join(' · '))}</span></td><td>${esc(STATUS.find((s) => s[0] === x.status)[1])}</td>
      <td class="r">${x.schaetzung ? eur0(x.schaetzung) : '–'}</td><td class="r">${x.min_angebot ? eur0(x.min_angebot) : '–'}${x.n_angebote ? `<br><span class="hint">${x.n_angebote} Angebote</span>` : ''}</td>
      <td class="r">${x.auftrag ? eur0(x.auftrag) : '–'}</td><td class="r">${x.nachtraege ? eur0(x.nachtraege) : '–'}</td><td class="r">${x.abgerechnet ? eur0(x.abgerechnet) : '–'}</td>
      <td class="r">${auf ? eur0(auf - x.abgerechnet) : '–'}</td><td class="r" style="${auf && x.schaetzung && auf > x.schaetzung * 1.05 ? 'color:var(--red);font-weight:600' : ''}">${auf && x.schaetzung ? (auf >= x.schaetzung ? '+' : '') + Math.round((auf / x.schaetzung - 1) * 100) + ' %' : ''}</td></tr>`;
  }).join('');
  const ges = S.au + S.nt;
  return `<p class="hint" style="margin:0 0 .6rem">Alle Vergabeeinheiten des Projekts: Schätzung im LV, bestes Angebot, Auftrag und beauftragte Nachträge, anerkannte Abrechnung. Klick öffnet das LV.</p>
    <div class="tblw"><table class="lv ue"><thead><tr><th>Nr.</th><th>LV</th><th>Stand</th><th class="r">Schätzung</th><th class="r">bestes Angebot</th><th class="r">Auftrag</th><th class="r">Nachträge</th><th class="r">abgerechnet</th><th class="r">noch offen</th><th class="r">Abw. zur Schätzung</th></tr></thead>
      <tbody>${rows}</tbody><tfoot><tr><td></td><td><b>Summe netto</b></td><td></td><td class="r"><b>${eur0(S.s)}</b></td><td class="r">${eur0(S.a)}</td><td class="r"><b>${eur0(S.au)}</b></td><td class="r">${eur0(S.nt)}</td><td class="r"><b>${eur0(S.ab)}</b></td><td class="r">${eur0(ges - S.ab)}</td>
      <td class="r">${ges && S.s ? (ges >= S.s ? '+' : '') + Math.round((ges / S.s - 1) * 100) + ' %' : ''}</td></tr></tfoot></table></div>`;
}
