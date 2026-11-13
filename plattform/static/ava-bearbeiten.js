/* Ausschreibung (AVA) – Kopierquelle, Zeilen verschieben, Nachtragsabwicklung, Eigenschaften einer Position.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- Kopierquelle: LV aus einem anderen Projekt daneben (schreibgeschützt), Positionen herüberkopieren ---------- */
let QU = { ber: LS.get('qu.ber', ''), inG: LS.get('qu.inG', true), gw: null, an: LS.get('qu.an', false), pid: LS.get('qu.pid', null), lv: LS.get('qu.lv', null), list: [], L: null, sel: new Set(), mengen: LS.get('qu.mengen', true), preise: LS.get('qu.preise', true) }, LASTI = null;
document.addEventListener('focusin', (e) => { const tr = e.target.closest && e.target.closest('table.lv tr[data-i]'); if (tr) LASTI = +tr.dataset.i; });
let KAT = null;   // {kataloge: [...]} – eingelesene Kataloge (sirAdos Positionen, sirAdos Elemente …)
const istKat = (v) => String(v || '').startsWith('kat:');
const katId = (v) => { const t = String(v).split(':')[1] || ''; return /^\d+$/.test(t) ? +t : t; };   // Zahl (Katalog der AVA) oder „bd-gk3“ (Baudaten)
/* in den Einstellungen → Kataloge ausgeblendete Kataloge (je Browser, gemeinsam mit den Baudaten): Schlüssel gk3e, eigen … bzw. ava<id> */
const katAus = () => { try { return new Set(JSON.parse(localStorage.getItem('bd.ausgeblendet') || '[]')); } catch { return new Set(); } };
const alleKat = () => { const a = katAus(); return [...((KAT && KAT.kataloge) || []).filter((x) => !a.has('ava' + x.id)), ...((KAT && KAT.bd) || []).filter((x) => x.id === 'bd-korb' || !a.has(String(x.id).replace(/^bd-/, '')))]; };
/* Drehkreis (wie unter Windows) über der Kopierquelle, solange geladen wird – Größe passt sich der Spalte an */
let QUBUSY = 0;
function quBusy(d) { QUBUSY = Math.max(0, QUBUSY + d); quDreh(!!QUBUSY); }
function quDreh(an) {
  const box = $('#quelle'); if (!box) return;
  let o = box.querySelector(':scope > .qu-busy');
  if (an && !o) { o = document.createElement('div'); o.className = 'qu-busy'; o.setAttribute('role', 'status'); o.innerHTML = '<div class="wspin" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><span>Kopierquelle wird geladen …</span>'; box.appendChild(o); }
  if (!an && o) o.remove();
}
const quLvLaden0 = (v) => { const t = String(v).split(':'); return (istKat(v) ? api(t[2] === 'suche' ? `api/katalog/${t[1]}/suche?q=` + encodeURIComponent(QU.q || '') + (QU.inG && QU.gw ? '&gewerk=' + encodeURIComponent(QU.gw) : '') + (QU.ber ? '&bereich=' + QU.ber : '') : `api/katalog/${t[1]}/gewerk/` + encodeURIComponent(t.slice(2).join(':'))) : api('api/lv/' + v)).catch(() => null); };
/* Zwischenspeicher der Kopierquelle: Kataloggewerke im Browser (IndexedDB, bleibt über Neuladen erhalten – bis der Katalog neu eingelesen wird),
   Baudaten-Gruppen sofort aus dem Speicher und im Hintergrund aufgefrischt */
const QUMEM = new Map(); let QUDBP = null;
const quDb = () => QUDBP || (QUDBP = new Promise((ok) => { try { const r = indexedDB.open('bp-kopierquelle', 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); } catch { ok(null); } }));
const quCache = async (k, v) => { const d = await quDb(); if (!d) return null; return new Promise((ok) => { try { const st = d.transaction('k', v === undefined ? 'readonly' : 'readwrite').objectStore('k'); const r = v === undefined ? st.get(k) : st.put(v, k); r.onsuccess = () => ok(v === undefined ? r.result || null : v); r.onerror = () => ok(null); } catch { ok(null); } }); };
async function quLvLadenC(v) {
  const t = String(v).split(':'), statisch = t[0] === 'kat' && /^\d+$/.test(t[1]) && t[2] !== 'suche', bd = t[0] === 'kat' && /^bd-/.test(t[1]) && t[1] !== 'bd-korb' && t[2] !== 'suche';
  if (!statisch && !bd) return quLvLaden0(v);
  const kat = statisch ? ((KAT && KAT.kataloge) || []).find((x) => String(x.id) === t[1]) : null, key = v + '|' + (kat ? kat.importiert || kat.n_pos : 'bd');
  if (QUMEM.has(key)) { if (bd) quLvLaden0(v).then((x) => { if (x) { QUMEM.set(key, x); quCache(key, x); } }); return QUMEM.get(key); }
  const alt = await quCache(key);
  if (alt) { QUMEM.set(key, alt); if (bd) quLvLaden0(v).then((x) => { if (x) { QUMEM.set(key, x); quCache(key, x); if (QU.lv === v) { QU.L = x; quZeigen(); } } }); return alt; }
  const x = await quLvLaden0(v); if (x) { QUMEM.set(key, x); quCache(key, x); } return x;
}
const quLvLaden = async (v) => { quBusy(1); try { return await quLvLadenC(v); } finally { quBusy(-1); } };
async function quLaden() { quBusy(1); try { await quLaden0(); } finally { quBusy(-1); } }
async function quLaden0() {
  if (!KAT || !Array.isArray(KAT.kataloge)) KAT = await api('api/katalog').catch(() => ({ kataloge: [] })); if (!Array.isArray(KAT.kataloge)) KAT.kataloge = [];
  if (!Array.isArray(KAT.bd)) KAT.bd = await api('api/baudaten/kataloge').catch(() => []);   // Positionsdatenbank und eigene Positionen
  if (QU.pid === 'kat') QU.pid = KAT.kataloge[0] ? 'kat:' + KAT.kataloge[0].id : null;   // vorher: ein einziger Katalog
  if (istKat(QU.pid) && !alleKat().some((x) => x.id === katId(QU.pid))) QU.pid = null;
  if (!QU.pid) QU.pid = (PROJ.find((p) => p.id !== pid) || PROJ[0] || {}).id || null;
  QU.vers = QU.pid && !istKat(QU.pid) ? await api('api/versionen?project_id=' + QU.pid).catch(() => []) : [];
  if (!QU.vers.some((v) => v.id === QU.ver)) QU.ver = ((QU.vers.find((v) => v.aktiv) || QU.vers[0]) || {}).id || null;
  QU.list = istKat(QU.pid) ? ((await api('api/katalog/' + katId(QU.pid)).catch(() => ({ gewerke: [] }))).gewerke || []) : QU.pid ? await api('api/lv?project_id=' + QU.pid + (QU.ver ? '&version_id=' + QU.ver : '')).catch(() => []) : [];
  const suche = istKat(QU.pid) && QU.lv === `${QU.pid}:suche`;
  if (!suche && !QU.list.some((x) => x.id === QU.lv)) QU.lv = (QU.list[0] || {}).id || null;
  if (istKat(QU.lv) && !suche) QU.gw = String(QU.lv).split(':').slice(2).join(':');
  if (quBaum()) await quBaumBauen(); else QU.L = QU.lv ? await quLvLaden(QU.lv) : null;
  QU.sel = new Set(); LS.set('qu.pid', QU.pid); LS.set('qu.lv', QU.lv); quZeigen();
  if (quBaum()) setTimeout(quVorladen, 1200);
}
/* Kataloge als Baum: erst nur die Gliederung (Bereich › Gewerk/Gruppe), Positionen beim Aufklappen; häufig gebrauchte oben als ★ und im Hintergrund vorgeladen */
const QUGL = new Map();
QU.auf = new Set(LS.get('qu.auf', [])); QU.bzu = new Set(LS.get('qu.bzu', [])); QU.nurFav = LS.get('qu.nurFav', false);
const quBaum = () => istKat(QU.pid) && katId(QU.pid) !== 'bd-korb' && !(QU.lv && String(QU.lv).endsWith(':suche'));
const quHaeufig = () => LS.get('qu.haeufig', {});
async function quBaumBauen(laden = true) {
  const auf = (QU.list || []).filter((g) => QU.auf.has(g.id));
  if (laden) for (const g of auf) if (!QUGL.has(g.id)) { const x = await quLvLaden(g.id); if (x) QUGL.set(g.id, x); }
  const items = []; QU.rng = {};
  for (const g of auf) {
    const x = QUGL.get(g.id); if (!x) continue; const a = items.length;
    items.push({ id: 'g:' + g.id, typ: 'titel', lvl: 1, oz: g.nr || '', kurz: g.name });
    for (const y of (x.data && x.data.items) || []) items.push(y.typ === 'titel' ? { ...y, lvl: Math.min(4, (y.lvl || 1) + 1) } : y);
    QU.rng[g.id] = [a, items.length];
  }
  const k = alleKat().find((x) => x.id === katId(QU.pid)) || {};
  QU.L = { katalog: true, projekt: k.name || 'Katalog', name: k.name || 'Katalog', nr: '', data: { items }, vergabe: {}, mehr: false };
}
async function quGewerkAuf(gid, an, scroll) {
  if (an === undefined) an = !QU.auf.has(gid);
  if (an) { QU.auf.add(gid); const H = quHaeufig(); H[gid] = (H[gid] || 0) + 1; LS.set('qu.haeufig', H); } else QU.auf.delete(gid);
  LS.set('qu.auf', [...QU.auf].slice(-40));
  if (an && !QUGL.has(gid)) { quBaumBauen(false); quZeigen(); }   // Zeile „lädt …“ sofort zeigen
  await quBaumBauen(); quZeigen();
  if (scroll) setTimeout(() => {   // Überschrift unter dem festen Tabellenkopf sichtbar lassen, kurz rot markieren
    const r = document.querySelector(`#quelle tr[data-qg="${CSS.escape(gid)}"]`); if (!r) return;
    const th = r.closest('table')?.querySelector('thead'), sc = r.closest('.qu-l'), h0 = (th ? th.offsetHeight : 0) + 2;
    if (sc) {   // nur wenn die Überschrift nicht zu sehen ist – dann ohne Rutschen direkt unter den Tabellenkopf
      const a = sc.getBoundingClientRect(), b = r.getBoundingClientRect();
      if (b.top < a.top + h0 || b.bottom > a.bottom) sc.scrollTop += b.top - a.top - h0;
    } else { r.style.scrollMarginTop = h0 + 'px'; r.scrollIntoView({ block: 'start' }); }
    window.BPHead?.achtung?.(r, { bis: document.getElementById('quelle') || r });
  }, 30);
}
let QUVOR = false;
async function quVorladen() {   // die am häufigsten gebrauchten Gewerke dieses Katalogs still in den Zwischenspeicher
  if (QUVOR || !quBaum()) return; QUVOR = true;
  try { const H = quHaeufig(); for (const g of (QU.list || []).filter((x) => H[x.id] && !QUGL.has(x.id)).sort((a, b) => H[b.id] - H[a.id]).slice(0, 5)) { const x = await quLvLadenC(g.id).catch(() => null); if (x) QUGL.set(g.id, x); } }
  finally { QUVOR = false; }
}
function quGliedMenu(anchor) {   // Gliederung als kleine Hierarchie: Bereich › Gewerk mit Häkchen (= aufgeklappt), ★ = oft geöffnet, Filter oben
  const old = document.querySelector('.pickm'); if (old) { old.remove(); return; }
  const m = document.createElement('div'); m.className = 'pickm qu-pm qu-gm'; document.body.appendChild(m);
  let q = '';
  const zeichne = () => {
    const H = quHaeufig(), nf = Object.keys(H).length;
    const alle = QU.list.filter((x) => !QU.ber || (QU.ber === 'altbau') === /^Altbau/.test(x.bereich || ''));
    const ls = alle.filter((g) => (!QU.nurFav || H[g.id] || QU.auf.has(g.id)) && (!q || passt(`${g.nr || ''} ${g.name}`, q)));
    const grp = []; ls.forEach((g) => { const b = g.bereich || 'Gewerke'; let x = grp.find((y) => y.b === b); if (!x) grp.push(x = { b, g: [] }); x.g.push(g); });
    const zeile = (g) => `<label class="gm-g"><input type="checkbox" data-gmg="${esc(g.id)}"${QU.auf.has(g.id) ? ' checked' : ''}><span class="gm-n">${g.nr ? `<small>${esc(g.nr)}</small> ` : ''}${esc(g.name)}</span><span class="hint">${g.n_pos}</span><button type="button" class="gm-s${H[g.id] ? ' on' : ''}" data-gms="${esc(g.id)}" title="${H[g.id] ? 'Aus „Oft geöffnet“ entfernen' : 'Zu „Oft geöffnet“ hinzufügen'}">${H[g.id] ? '★' : '☆'}</button></label>`;
    m.querySelector('.gm-l').innerHTML = grp.map(({ b, g }) => { const n = g.filter((x) => QU.auf.has(x.id)).length, zu = grp.length > 1 && !q && QU.bzu.has(b);
      return (grp.length > 1 ? `<div class="gm-b"><button type="button" class="gm-t" data-gmt="${esc(b)}">${zu ? '▸' : '▾'}</button><input type="checkbox" data-gmb="${esc(b)}"${n === g.length ? ' checked' : ''}${n && n < g.length ? ' data-halb="1"' : ''} title="Alle Gewerke dieses Bereichs auf- oder zuklappen"><b data-gmt="${esc(b)}">${esc(b)}</b><span class="hint">${n ? n + ' / ' : ''}${g.length}</span></div>` : '')
        + (zu ? '' : `<div class="gm-k">${g.map(zeile).join('')}</div>`); }).join('') || `<div class="pm-e">${QU.nurFav ? 'Noch nichts oft geöffnet – ☆ antippen merkt ein Gewerk.' : 'Nichts gefunden.'}</div>`;
    m.querySelectorAll('[data-halb]').forEach((c) => { c.indeterminate = true; });
    m.querySelector('.gm-f').innerHTML = `<label><input type="checkbox" data-gmfav${QU.nurFav ? ' checked' : ''}> nur ★ oft geöffnet${nf ? ` <span class="hint">(${nf})</span>` : ''}</label><span style="flex:1"></span>${QU.auf.size ? `<button type="button" class="btn sm" data-gmzu>Alle zuklappen</button>` : ''}`;
  };
  m.innerHTML = `<div class="pm-q"><input type="search" placeholder="Gewerk suchen …" autocomplete="off" aria-label="Gewerk suchen"></div><div class="gm-f"></div><div class="pm-l gm-l"></div>`;
  const r = anchor.getBoundingClientRect(); m.style.top = Math.min(r.bottom + 6, innerHeight - 200) + 'px';
  zeichne(); m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
  const inp = m.querySelector('input'); inp.focus(); inp.addEventListener('input', () => { q = inp.value.trim(); zeichne(); });
  const zu = () => { m.remove(); document.removeEventListener('pointerdown', weg, true); document.removeEventListener('keydown', esc_, true); };
  const weg = (e) => { if (!m.contains(e.target) && !e.target.closest('#quSel')) zu(); };
  const esc_ = (e) => { if (e.key === 'Escape') zu(); };
  setTimeout(() => { document.addEventListener('pointerdown', weg, true); document.addEventListener('keydown', esc_, true); }, 0);
  const neu = async () => { await quBaumBauen(); quZeigen(); if (document.body.contains(m)) zeichne(); };
  m.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-gms]'); if (s) { e.preventDefault(); const H = quHaeufig(); if (H[s.dataset.gms]) delete H[s.dataset.gms]; else H[s.dataset.gms] = 1; LS.set('qu.haeufig', H); quZeigen(); zeichne(); return; }
    const t = e.target.closest('[data-gmt]'); if (t) { e.preventDefault(); const b = t.dataset.gmt; if (QU.bzu.has(b)) QU.bzu.delete(b); else QU.bzu.add(b); LS.set('qu.bzu', [...QU.bzu]); zeichne(); return; }
    if (e.target.closest('[data-gmzu]')) { QU.auf.clear(); LS.set('qu.auf', []); await neu(); return; }
    const n = e.target.closest('.gm-n'); if (n) { e.preventDefault(); const id = n.closest('.gm-g').querySelector('[data-gmg]').dataset.gmg; zu(); QU.gw = String(id).split(':').slice(2).join(':'); const g = QU.list.find((x) => x.id === id); if (g) QU.bzu.delete(g.bereich || 'Gewerke'); quGewerkAuf(id, true, true); }
  });
  m.addEventListener('change', async (e) => {
    const c = e.target;
    if (c.matches('[data-gmfav]')) { QU.nurFav = c.checked; LS.set('qu.nurFav', QU.nurFav); quZeigen(); zeichne(); return; }
    if (c.matches('[data-gmg]')) { const id = c.dataset.gmg; if (c.checked) { const g = QU.list.find((x) => x.id === id); if (g) QU.bzu.delete(g.bereich || 'Gewerke'); } await quGewerkAuf(id, c.checked); if (document.body.contains(m)) zeichne(); return; }
    if (c.matches('[data-gmb]')) {
      const gs = QU.list.filter((x) => (x.bereich || 'Gewerke') === c.dataset.gmb && (!QU.nurFav || quHaeufig()[x.id] || QU.auf.has(x.id)));
      if (c.checked && gs.length > 12 && !(await bpFrage(`Alle ${gs.length} Gewerke von „${c.dataset.gmb}“ aufklappen? Das lädt viele Positionen.`))) { zeichne(); return; }
      gs.forEach((g) => { if (c.checked) QU.auf.add(g.id); else QU.auf.delete(g.id); }); if (c.checked) QU.bzu.delete(c.dataset.gmb);
      LS.set('qu.auf', [...QU.auf].slice(-40)); quBaumBauen(false); quZeigen(); zeichne(); await neu();
    }
  });
}
function quProjMenu(anchor) {   // Kataloge oben, darunter Projekte mit kleinem Filterfeld (wie die Projektauswahl, aber für die Kopierquelle)
  const old = document.querySelector('.pickm'); if (old) { old.remove(); return; }
  const m = document.createElement('div'); m.className = 'pickm qu-pm'; m.setAttribute('role', 'listbox');
  const opt = (v, t, sub) => `<div class="pm-o${String(v) === String(QU.pid) ? ' on' : ''}" data-v="${esc(v)}" role="option"><span><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></div>`;
  const kat = alleKat();
  m.innerHTML = `<div class="pm-l">${kat.length ? '<div class="pm-g">Kataloge</div>' + kat.map((x) => opt('kat:' + x.id, x.name, x.n_pos ? `${Number(x.n_pos).toLocaleString('de-DE')} Positionen` : '')).join('') : ''}
    <div class="pm-g">Projekte</div><div class="pm-q" style="padding:.1rem .6rem .45rem;border:0"><input type="search" placeholder="Projekt filtern – Nr., Straße, Ort …" autocomplete="off" aria-label="Projekte filtern"></div><div class="qu-pl"></div></div>`;
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(); m.style.top = Math.min(r.bottom + 6, innerHeight - 160) + 'px'; m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
  const zeichne = (q) => {
    const ps = PROJ.filter((p) => !q || passt(p.name, q));
    const akt = ps.filter((p) => !p.archived), arc = ps.filter((p) => p.archived);
    m.querySelector('.qu-pl').innerHTML = (akt.map((p) => opt(p.id, p.name)).join('') || (q ? '<div class="pm-e">Kein Projekt gefunden.</div>' : ''))
      + (arc.length ? '<div class="pm-g">Archiv</div>' + arc.map((p) => opt(p.id, p.name)).join('') : '');
  };
  zeichne('');
  const inp = m.querySelector('input'); inp.addEventListener('input', () => zeichne(inp.value.trim()));
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const o = m.querySelector('.qu-pl .pm-o'); if (o) o.click(); } if (e.key === 'Escape') zu(); });
  const zu = () => { m.remove(); document.removeEventListener('pointerdown', weg, true); };
  const weg = (e) => { if (!m.contains(e.target) && !anchor.contains(e.target)) zu(); };
  setTimeout(() => document.addEventListener('pointerdown', weg, true), 0);
  m.addEventListener('click', async (e) => {
    const o = e.target.closest('.pm-o[data-v]'); if (!o) return; zu();
    const v = o.dataset.v; QU.pid = istKat(v) ? v : +v; QU.lv = null; QU.ver = null; QU.q = ''; QU.gw = null; await quLaden();
  });
  if (!istKat(QU.pid)) inp.focus();
}
const quItems = () => (QU.L && QU.L.data && QU.L.data.items) || [];
let QUSK = '';
function quZeigen() { const k = `${QU.pid}|${quBaum() ? 'baum' : QU.lv}`, st = k === QUSK ? document.querySelector('#quelle .qu-l')?.scrollTop || 0 : 0; QUSK = k; quZeigen0(); const l = document.querySelector('#quelle .qu-l'); if (l && st) l.scrollTop = st; quDreh(!!QUBUSY && QU.an && tab === 'lv'); }
function quZeigen0() {
  const box = QUBOX, an = QU.an && tab === 'lv' && box.isConnected && !!box.closest('.sr-b');
  if (box.closest('.sr-b')) box.hidden = !an; $('#quBtn').classList.toggle('on', an && quSichtbar());
  if (!an) return;
  if (!KAT) { box.innerHTML = ''; quDreh(true); return; }   // quLaden läuft noch: nur der Drehkreis
  const VP = (QU.L && QU.L.vergabe && QU.L.vergabe.preise) || {};
  const epq = (x) => VP[x.id] ?? x.ep_s;
  const I = quItems();
  const zeile = (x, i) => x.typ === 'titel'
    ? `<tr class="ti${QU.sel.has(x.id) ? ' on' : ''}" draggable="true" data-qi="${i}"><td><input type="checkbox" data-qs="${i}"${QU.sel.has(x.id) ? ' checked' : ''} aria-label="Titel mit Positionen wählen"></td><td>${esc(x.oz || '')}</td><td colspan="4" style="padding-left:${((x.lvl || 1) - 1) * .9 + .35}rem">${esc(x.kurz)}</td></tr>`
    : `<tr class="${QU.sel.has(x.id) ? 'on' : ''}" draggable="true" data-qi="${i}"><td><input type="checkbox" data-qs="${i}"${QU.sel.has(x.id) ? ' checked' : ''} aria-label="Position wählen"></td><td>${esc(x.oz || '')}</td><td>${esc(x.bez || x.kurz || '')}${x.lang ? `<div class="lt${QU.offen && QU.offen.has(x.id) ? ' voll' : ''}">${esc(x.lang)}</div>` : ''}</td><td style="text-align:right">${x.art === 'T' ? '' : nf(x.menge)}</td><td>${esc(x.einheit || '')}</td><td style="text-align:right"${x.spanne ? ` title="Katalog: von ${nf2(x.spanne[0])} bis ${nf2(x.spanne[1])} €"` : ''}>${epq(x) != null && x.art !== 'T' ? nf2(epq(x)) : ''}</td></tr>`;
  let rows = '', favs = '';
  if (quBaum()) {   // Baum: Bereich › Gewerk › (aufgeklappt) Positionen
    const H = quHaeufig(), alle = QU.list.filter((x) => !QU.ber || (QU.ber === 'altbau') === /^Altbau/.test(x.bereich || ''));
    const sichtbar = QU.nurFav && alle.some((g) => H[g.id]) ? alle.filter((g) => H[g.id] || QU.auf.has(g.id)) : alle;
    favs = alle.filter((g) => H[g.id]).sort((a, b) => H[b.id] - H[a.id]).slice(0, 6).map((g) => `<span class="qu-fav${QU.auf.has(g.id) ? ' on' : ''}"><button type="button" data-qfav="${esc(g.id)}" title="${esc(g.bereich || '')} · ${g.n_pos} Positionen – öffnen">★ ${esc(g.name.length > 26 ? g.name.slice(0, 25) + '…' : g.name)}</button><button type="button" class="qu-favx" data-qfavx="${esc(g.id)}" title="Aus „Oft geöffnet“ entfernen" aria-label="Aus „Oft geöffnet“ entfernen">×</button></span>`).join('');
    const grp = []; sichtbar.forEach((g) => { const b = g.bereich || 'Gewerke'; let x = grp.find((y) => y.b === b); if (!x) grp.push(x = { b, g: [] }); x.g.push(g); });
    rows = grp.map(({ b, g }) => { const zu = grp.length > 1 && QU.bzu.has(b);
      return (grp.length > 1 ? `<tr class="qb" data-qb="${esc(b)}"><td>${zu ? '▸' : '▾'}</td><td colspan="5"><b>${esc(b)}</b> <span class="hint">${g.length}</span></td></tr>` : '') + (zu ? '' : g.map((x) => {
        const auf = QU.auf.has(x.id), r = QU.rng && QU.rng[x.id];
        return `<tr class="qg${auf ? ' auf' : ''}" data-qg="${esc(x.id)}"><td>${auf ? '▾' : '▸'}</td><td>${esc(x.nr || '')}</td><td colspan="3">${esc(x.name)}</td><td class="hint" style="text-align:right">${x.n_pos}</td></tr>`
          + (auf ? (r ? I.slice(r[0] + 1, r[1]).map((y, j) => zeile(y, r[0] + 1 + j)).join('') : '<tr><td></td><td colspan="5" class="hint">lädt …</td></tr>') : '');
      }).join('')); }).join('');
  } else rows = I.map(zeile).join('');
  const lvo = QU.list.find((x) => x.id === QU.lv);
  const sir = istKat(QU.pid) && /^sirados/i.test((((KAT && KAT.kataloge) || []).find((x) => x.id === katId(QU.pid)) || {}).quelle || '');
  const gwName = QU.gw && ((QU.list || []).find((x) => x.id === `${QU.pid}:${QU.gw}`) || {}).name;
  box.innerHTML = `<div class="qu-h">
      <div class="rr"><button type="button" id="quProj" aria-label="Katalog oder Projekt der Kopierquelle"></button><button type="button" id="quSel" aria-label="LV der Kopierquelle wählen"></button><button class="ib" data-qu="zu" title="Kopierquelle schließen (schreibgeschützt – hier lässt sich nichts ändern)">✕</button></div>
      ${(QU.vers || []).length > 1 ? `<div class="rr"><label style="display:flex;gap:.5rem;align-items:center;flex:1;font-size:var(--fs);color:var(--mute)">Version<select id="quVer" style="flex:1">${QU.vers.map((v, i) => `<option value="${v.id}"${v.id === QU.ver ? ' selected' : ''}>${i + 1} · ${esc(v.name)}${v.aktiv ? ' (aktuell)' : ''}${v.archived ? ' (archiviert)' : ''}</option>`).join('')}</select></label></div>` : ''}
      ${istKat(QU.pid) ? `<div class="rr qu-s"><input type="search" id="quQ" value="${esc(QU.q || '')}" placeholder="Suchen – z. B. Kalksandstein 17,5" autocomplete="off">
        ${gwName ? `<select id="quIn" aria-label="Wo suchen"><option value=""${QU.inG ? '' : ' selected'}>überall</option><option value="g"${QU.inG ? ' selected' : ''}>nur ${esc(gwName.length > 22 ? gwName.slice(0, 21) + '…' : gwName)}</option></select>` : ''}
        ${sir ? `<span class="qu-seg">${[['', 'Alle'], ['neubau', 'Neubau'], ['altbau', 'Altbau']].map(([k, l]) => `<button type="button" data-qber="${k}" class="${(QU.ber || '') === k ? 'on' : ''}">${l}</button>`).join('')}</span>` : ''}</div>` : ''}
      <div class="qu-o"><label><input type="checkbox" id="quM"${QU.mengen ? ' checked' : ''}> Mengen</label><label title="Auftragspreise, sonst Schätzpreise der Quelle (Katalog: mittlerer Preis) – werden hier zur Schätzung"><input type="checkbox" id="quP"${QU.preise ? ' checked' : ''}> Preise als Schätzung</label>
        ${quBaum() && QU.auf.size ? '<button type="button" class="ib" data-quzu title="Alle aufgeklappten Gewerke wieder zuklappen">⊟ Alles einklappen</button>' : ''}
        <span class="hint" style="flex:1 1 0;text-align:right">${QU.sel.size ? `${quAuswahl().length} gewählt` : 'anhaken oder ziehen · Doppelklick: Langtext'}</span>
        <button class="btn sm pri" data-qu="ein" ${QU.sel.size && L ? '' : 'disabled'} title="${LASTI != null ? 'nach der zuletzt bearbeiteten Zeile einfügen' : 'am Ende einfügen'}">← Übernehmen</button></div></div>
    ${favs ? `<div class="qu-favs" title="Die Gewerke, die du in Katalogen am häufigsten aufklappst (in diesem Browser gezählt) – antippen öffnet sie"><button type="button" class="qu-favf${QU.nurFav ? ' on' : ''}" data-qnurfav title="${QU.nurFav ? 'Wieder alle Gewerke zeigen' : 'Nur die oft geöffneten Gewerke in der Liste zeigen'}"><input type="checkbox" tabindex="-1" aria-hidden="true"${QU.nurFav ? ' checked' : ''}> Oft geöffnet</button>${favs}</div>` : ''}
    <div class="qu-l">${quBaum() ? `<table><thead><tr><th></th><th>OZ</th><th>Kurztext</th><th style="text-align:right">Menge</th><th>EH</th><th style="text-align:right">EP</th></tr></thead><tbody>${rows}</tbody></table>` : QU.L ? (I.length ? `<table><thead><tr><th></th><th>OZ</th><th>Kurztext</th><th style="text-align:right">Menge</th><th>EH</th><th style="text-align:right">EP</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="hint" style="padding:1rem">Dieses LV ist leer.</p>') : `<p class="hint" style="padding:1rem">${QU.list.length ? 'LV wählen.' : 'In diesem Projekt gibt es kein LV.'}</p>`}</div>
`;
  const qk = istKat(QU.pid) ? alleKat().find((x) => x.id === katId(QU.pid)) : null, qp = !istKat(QU.pid) ? PROJ.find((p) => p.id === QU.pid) : null;
  pickButton($('#quProj'), qk ? { title: qk.name, sub: 'Katalog' } : qp ? { title: qp.name, sub: qp.archived ? 'Projekt (Archiv)' : 'Projekt' } : { title: 'Quelle wählen', sub: '' });
  if (quBaum()) pickButton($('#quSel'), { title: QU.nurFav ? 'Gliederung · ★ oft geöffnet' : 'Gliederung', sub: `${QU.list.length} Gewerke · ${QU.auf.size ? QU.auf.size + ' aufgeklappt' : 'anhaken klappt auf'}` });
  else pickButton($('#quSel'), istKat(QU.lv) && QU.lv.endsWith(':suche') ? { title: QU.L ? QU.L.name : 'Suche', sub: QU.L ? `${quItems().filter((x) => x.typ === 'pos').length}${QU.L.mehr ? '+' : ''} Treffer` : '' }
    : lvo ? { title: `${lvo.nr ? lvo.nr + ' · ' : ''}${lvo.name}`, sub: istKat(QU.pid) ? `${lvo.bereich} · ${lvo.n_pos} Positionen` : [lvo.gewerk, STATUS.find((x) => x[0] === lvo.status)[1], lvo.auftragnehmer].filter(Boolean).join(' · ') } : { title: 'Kein LV', sub: '' });
}
function quAuswahl(nur) {   // gewählte Zeilen in LV-Reihenfolge; ein gewählter Titel bringt seinen Inhalt mit
  const I = quItems(), out = [], wahl = nur || QU.sel;
  for (let i = 0; i < I.length; i++) {
    const x = I[i]; if (!wahl.has(x.id)) continue;
    out.push(x);
    if (x.typ === 'titel') { const lv = x.lvl || 1; while (i + 1 < I.length && !(I[i + 1].typ === 'titel' && (I[i + 1].lvl || 1) <= lv)) { i++; out.push(I[i]); } }
  }
  return out;
}
/* Bauteil (Element) der Baudaten: woraus es besteht – Teilpositionen mit Menge je Einheit, EP und Anteil */
function quBauteilZeigen(i) {
  const I = quItems(), t = I[i], T = [];
  for (let j = i + 1; j < I.length && I[j].typ !== 'titel'; j++) T.push(I[j]);
  const sum = T.reduce((a, x) => a + (x.menge || 0) * (x.ep_s || 0), 0);
  const bg = modalBox(`<h3>${esc(t.oz || '')} ${esc((t.kurz || '').replace(/ – je 1 .*$/, ''))}</h3><p class="hint" style="margin:0 0 .5rem">${esc((/ – (je 1 .*)$/.exec(t.kurz || '') || [, ''])[1])} · Doppelklick auf eine Teilposition zeigt ihre Details</p>
    <div class="tblw"><table class="lv"><thead><tr><th>Pos.</th><th>Teilleistung</th><th class="r">Menge je Einheit</th><th class="r">EP</th><th class="r">Anteil</th></tr></thead><tbody>
    ${T.map((x) => `<tr data-qbsrc="${esc(x.src || '')}" style="cursor:pointer" title="Doppelklick: Details der Position"><td>${esc(x.oz || '')}</td><td>${esc(x.bez || x.kurz || '')}</td><td class="r">${nf(x.menge)} ${esc(x.einheit || '')}</td><td class="r">${x.ep_s != null ? nf2(x.ep_s) : '–'}</td><td class="r">${x.ep_s != null ? nf2((x.menge || 0) * x.ep_s) : '–'}</td></tr>`).join('')}
    <tr><td></td><td><b>Summe je Einheit</b></td><td></td><td></td><td class="r"><b>${nf2(sum)}</b></td></tr></tbody></table></div>
    <div class="acts"><button class="btn pri" data-m="x">Schließen</button></div>`, (m, b, close) => { if (m === 'x') close(); });
  bg.addEventListener('dblclick', (e) => { const r = e.target.closest('[data-qbsrc]'), m = r && /^b(\d+)$/.exec(r.dataset.qbsrc); if (m && typeof pdbDetail === 'function') pdbDetail(+m[1]); });
}
/* Ein ganzer Titel oder ein Bauteil wird übernommen: vorher die Einzelpositionen ankreuzen lassen (alle vorgewählt) */
function quTeileWahl(liste) {
  return new Promise((fertig) => {
    const zeilen = liste.map((x, i) => x.typ === 'titel' ? `<div class="qtw-t" style="padding-left:${((x.lvl || 1) - 1) * .8}rem"><label><input type="checkbox" data-qtt="${i}" checked> <b>${esc(x.oz || '')} ${esc(x.kurz || '')}</b></label></div>`
      : `<label class="qtw-p"><input type="checkbox" data-qtp="${i}" checked> <span>${esc(x.oz || '')}</span> ${esc(x.bez || x.kurz || '')}${x.art !== 'T' && x.menge ? ` <small class="hint">${nf(x.menge)} ${esc(x.einheit || '')}</small>` : ''}</label>`).join('');
    let ok = false;
    const bg = modalBox(`<h3>Welche Positionen übernehmen?</h3><p class="hint" style="margin:0 0 .5rem">Alle sind angehakt – abwählen, was nicht ins LV soll.</p>
      <div class="qtw">${zeilen}</div><div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Übernehmen</button></div>`, (m, b2, close) => {
      if (m === 'x') { close(); return; }
      if (m !== 'ok') return;
      const an = new Set([...b2.querySelectorAll('[data-qtp]:checked')].map((c) => +c.dataset.qtp));
      const raus = liste.filter((x, i) => x.typ !== 'titel' ? an.has(i) : liste.some((y, j) => j > i && y.typ !== 'titel' && an.has(j) && !liste.slice(i + 1, j).some((z) => z.typ === 'titel' && (z.lvl || 1) <= (x.lvl || 1))));
      ok = true; close(); fertig(raus);
    });
    bg.addEventListener('change', (e) => { const t = e.target.closest('[data-qtt]'); if (!t) return; const i = +t.dataset.qtt, lv = liste[i].lvl || 1;
      for (let j = i + 1; j < liste.length && !(liste[j].typ === 'titel' && (liste[j].lvl || 1) <= lv); j++) { const c = bg.querySelector(`[data-qtp="${j}"],[data-qtt="${j}"]`); if (c) c.checked = t.checked; } });
    new MutationObserver(() => { if (!bg.isConnected && !ok) fertig(null); }).observe(document.body, { childList: true });
  });
}
async function quEinfuegen(liste, nach) {
  if (!L || !liste.length) return;
  if (liste.some((x) => x.typ === 'titel') && liste.filter((x) => x.typ === 'pos').length > 1) { liste = await quTeileWahl(liste); if (!liste || !liste.length) return; }
  const VP = (QU.L.vergabe && QU.L.vergabe.preise) || {};
  let neu = liste.map((x) => {
    const y = JSON.parse(JSON.stringify(x)); y.id = uid(); delete y.nt; delete y.nt_status; delete y.nt_grund;
    if (y.typ === 'pos') { if (!QU.mengen) y.menge = 0; const ep = VP[x.id] ?? x.ep_s; y.ep_s = QU.preise && ep != null ? ep : null; y.quelle = (QU.L.katalog ? `${QU.L.projekt}, Pos. ${x.oz || ''}${x.spanne ? ` (von ${nf2(x.spanne[0])} bis ${nf2(x.spanne[1])} €)` : ''}` : `aus LV ${QU.L.nr} ${QU.L.name} (${QU.L.projekt || ''}), Pos. ${x.oz || ''}`).slice(0, 200);
      { const m = /^b(\d+)$/.exec(x.src || x.id); if (QU.L.katalog && m) y.pdb = +m[1]; } delete y.src;   // Herkunft merken: Auftrags-/Angebotspreise fließen später in die Baudaten zurück
      if (QU.L.katalog && (y.spanne || y.eigene)) { y._bd = true; if (y.spanne) { y.ep_von = y.spanne[0]; y.ep_bis = y.spanne[1]; } } delete y.spanne; }
    return y;
  });
  if (QU.preise && neu.some((y) => y._bd)) {   // aus einem Katalog: welcher Preis? (Einstellung oder Nachfrage)
    const bd = neu.filter((y) => y._bd); if (!(await pdbPreiswahl(bd))) return; }
  neu.forEach((y) => { if (y._bd) { delete y.ep_von; delete y.ep_bis; } delete y._bd; delete y._mittel; delete y.eigene; delete y.ep_median; });
  const I = items(), at = nach === -1 ? 0 : nach != null && nach >= 0 && nach < I.length ? nach + 1 : I.length;   // -1: ganz an den Anfang (auf die Kopfzeile gezogen)
  I.splice(at, 0, ...neu); HIST.next = `${neu.length} Zeilen übernommen`;
  numerieren(); changed(true);
  { const n = neu.filter((y) => y.typ === 'pos').length; toast(`${n === 1 ? '1 Position' : n + ' Positionen'} übernommen – ↶ Rückgängig nimmt es zurück.`); }
  QU.sel = new Set(); quZeigen();
  setTimeout(() => { const r = document.querySelector(`table.lv tr[data-i="${at}"]`); if (r) { r.scrollIntoView({ block: 'nearest' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 1600); } }, 50);
}
$('#quBtn').onclick = async () => { if (quSichtbar()) { seiteUmschalten(); uLeisteNeu(); return; }   // noch ein Klick schaltet sie wieder aus (Bereich rechts zu)
  QU.an = true; LS.set('qu.an', true); if (tab !== 'lv') { await flush(); tab = 'lv'; LS.set('tab', tab); } seiteReiter('lv', 'quelle'); render();
  quBusy(1); try { quZeigen();   // Spalte sofort öffnen – der Drehkreis zeigt, dass geladen wird
    if (QU.an && !QU.L) await quLaden(); } finally { quBusy(-1); } quZeigen(); };
document.addEventListener('click', (e) => {
  const q = e.target.closest('#quelle'); if (!q) return;
  const b = e.target.closest('[data-qu]');
  if (b && b.dataset.qu === 'zu') { QU.an = false; LS.set('qu.an', false); seiteReiter('lv', 'details'); render(); return; }
  const qg = e.target.closest('[data-qg]'); if (qg) { QU.gw = String(qg.dataset.qg).split(':').slice(2).join(':'); quGewerkAuf(qg.dataset.qg); return; }
  const qf = e.target.closest('[data-qfav]'); if (qf) { const g = QU.list.find((x) => x.id === qf.dataset.qfav); if (g) QU.bzu.delete(g.bereich || 'Gewerke'); quGewerkAuf(qf.dataset.qfav, true, true); return; }
  if (e.target.closest('[data-quzu]')) { QU.auf.clear(); LS.set('qu.auf', []); quBaumBauen(false).then(quZeigen); return; }
  const qb = e.target.closest('[data-qb]'); if (qb) { const k = qb.dataset.qb; if (QU.bzu.has(k)) QU.bzu.delete(k); else QU.bzu.add(k); LS.set('qu.bzu', [...QU.bzu]); quZeigen(); return; }
  if (b && b.dataset.qu === 'ein') { quEinfuegen(quAuswahl(), LASTI); return; }
  if (e.target.closest('#quProj')) { quProjMenu($('#quProj')); return; }
  if (e.target.closest('#quSel') && quBaum()) { quGliedMenu($('#quSel')); return; }
  if (e.target.closest('#quSel')) {
    pickMenu($('#quSel'), { search: QU.list.length > 6 ? (istKat(QU.pid) ? 'Gewerk suchen …' : 'LV suchen …') : '', empty: 'Kein LV in diesem Projekt.',
      items: QU.list.filter((x) => !istKat(QU.pid) || !QU.ber || (QU.ber === 'altbau') === /^Altbau/.test(x.bereich || '')).map((x) => ({ group: x.bereich || (x.archived ? 'Archiv' : 'Leistungsverzeichnisse'), title: `${x.nr ? x.nr + ' · ' : ''}${x.name}`, sub: [x.gewerk, x.n_pos + ' Pos.'].filter(Boolean).join(' · '), value: x.id, on: x.id === QU.lv })),
      onPick: async (v) => { if (quBaum()) { QU.gw = String(v).split(':').slice(2).join(':'); return quGewerkAuf(v, true, true); }
        QU.lv = v; if (istKat(v)) { QU.gw = String(v).split(':').slice(2).join(':'); QU.q = ''; } QU.L = await quLvLaden(v); QU.sel = new Set(); LS.set('qu.lv', QU.lv); quZeigen(); } });
    return;
  }
  const cbx = e.target.closest('[data-qs]');
  if (cbx) { const x = quItems()[+cbx.dataset.qs]; if (cbx.checked) QU.sel.add(x.id); else QU.sel.delete(x.id); quWahlUi(); return; }
  const tr = e.target.closest('tr[data-qi]');
  if (tr && !e.target.closest('input') && e.detail < 2) { const x = quItems()[+tr.dataset.qi]; if (QU.sel.has(x.id)) QU.sel.delete(x.id); else QU.sel.add(x.id); quWahlUi(); }
});
async function quSucheNeu() {   // Suche mit den aktuellen Filtern neu laden (oder zurück zum Gewerk)
  const q = (QU.q || '').trim();
  if (q.length < 3) { if (istKat(QU.lv) && QU.lv.endsWith(':suche')) { QU.lv = QU.gw ? `${QU.pid}:${QU.gw}` : (QU.list[0] || {}).id || null; if (quBaum()) await quBaumBauen(); else QU.L = QU.lv ? await quLvLaden(QU.lv) : null; QU.sel = new Set(); quZeigen(); } return; }
  QU.lv = `${QU.pid}:suche`; QU.L = await quLvLaden(QU.lv); QU.sel = new Set(); quZeigen();
}
document.addEventListener('click', async (e) => {
  const fx = e.target.closest('#quelle [data-qfavx]'); if (fx) { const H = quHaeufig(); delete H[fx.dataset.qfavx]; LS.set('qu.haeufig', H); quZeigen(); return; }
  if (e.target.closest('#quelle [data-qnurfav]')) { QU.nurFav = !QU.nurFav; LS.set('qu.nurFav', QU.nurFav); quZeigen(); return; }
  const b = e.target.closest('#quelle [data-qber]'); if (!b) return;
  QU.ber = b.dataset.qber; LS.set('qu.ber', QU.ber);
  if (QU.ber && QU.gw && QU.inG) { const x = QU.list.find((y) => y.id === `${QU.pid}:${QU.gw}`); if (x && (QU.ber === 'altbau') !== /^Altbau/.test(x.bereich || '')) QU.inG = false; }
  if ((QU.q || '').trim().length >= 3) await quSucheNeu(); else quZeigen();
});
function quWahlUi() {   // Auswahl anzeigen, ohne die Liste neu zu zeichnen (sonst gehen Doppelklick und Scrollposition verloren)
  const I = quItems();
  document.querySelectorAll('#quelle tr[data-qi]').forEach((tr) => { const x = I[+tr.dataset.qi], on = !!x && QU.sel.has(x.id); tr.classList.toggle('on', on); const c = tr.querySelector('[data-qs]'); if (c) c.checked = on; });
  const h = document.querySelector('#quelle .qu-o .hint'); if (h) h.textContent = QU.sel.size ? `${quAuswahl().length} gewählt` : 'anhaken oder ziehen · Doppelklick: Langtext';
  const b = document.querySelector('#quelle [data-qu="ein"]'); if (b) b.disabled = !(QU.sel.size && L);
}
document.addEventListener('dblclick', (e) => {   // Langtext ganz zeigen / wieder kürzen
  const tr = e.target.closest && e.target.closest('#quelle tr[data-qi]'); if (!tr || e.target.closest('input')) return;
  const x = quItems()[+tr.dataset.qi]; if (!x) return;
  if (x.typ === 'titel' && /^e\d+$/.test(x.id)) { quBauteilZeigen(+tr.dataset.qi); return; }
  if (x.typ !== 'pos') return;
  if (QU.sel.has(x.id)) QU.sel.delete(x.id); else QU.sel.add(x.id); quWahlUi();   // der erste Klick des Doppelklicks hat die Zeile umgeschaltet
  const kp = QU.L && QU.L.katalog && /^([bk])(\d+)$/.exec(x.src || x.id);   // Katalogposition: Detailfenster wie in den Baudaten
  if (kp && x.art !== 'T' && typeof pdbDetail === 'function') { window.getSelection && window.getSelection().removeAllRanges(); pdbDetail(kp[1] === 'k' ? -kp[2] : +kp[2]); return; }
  QU.offen ||= new Set(); if (QU.offen.has(x.id)) QU.offen.delete(x.id); else QU.offen.add(x.id);
  const lt = tr.querySelector('.lt'); if (lt) lt.classList.toggle('voll', QU.offen.has(x.id));
  window.getSelection && window.getSelection().removeAllRanges();
});
let quQT = 0;
document.addEventListener('input', (e) => {
  if (e.target.id !== 'quQ') return;
  QU.q = e.target.value; clearTimeout(quQT);
  quQT = setTimeout(async () => {
    await quSucheNeu();
    const i = $('#quQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }, 350);
});
document.addEventListener('change', async (e) => {
  if (e.target.id === 'quIn') { QU.inG = e.target.value === 'g'; LS.set('qu.inG', QU.inG); await quSucheNeu(); }
  else if (e.target.id === 'quVer') { QU.ver = +e.target.value; QU.lv = null; await quLaden(); }
  else if (e.target.id === 'quM') { QU.mengen = e.target.checked; LS.set('qu.mengen', QU.mengen); }
  else if (e.target.id === 'quP') { QU.preise = e.target.checked; LS.set('qu.preise', QU.preise); }
});
// Ziehen: aus der Quelle ins LV (Einfügen nach der Zeile, über der losgelassen wird)
document.addEventListener('dragstart', (e) => {
  const tr = e.target.closest && e.target.closest('#quelle tr[data-qi]'); if (!tr) return;
  const x = quItems()[+tr.dataset.qi]; const wahl = QU.sel.has(x.id) ? QU.sel : new Set([x.id]);
  e.dataTransfer.setData('text/x-ava-quelle', JSON.stringify([...wahl])); e.dataTransfer.effectAllowed = 'copy';
});
document.addEventListener('dragover', (e) => {
  if (![...(e.dataTransfer.types || [])].includes('text/x-ava-quelle')) return;
  const tr = e.target.closest && (e.target.closest('table.lv tr[data-i]') || e.target.closest('table.lv thead tr, table.lv tr.wurzel'));
  document.querySelectorAll('.drop-hier').forEach((r) => r.classList.remove('drop-hier'));
  if (tr || e.target.closest('.pane')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (tr) tr.classList.add('drop-hier'); }
});
document.addEventListener('drop', (e) => {
  const d = e.dataTransfer.getData('text/x-ava-quelle'); if (!d) return;
  e.preventDefault(); document.querySelectorAll('.drop-hier').forEach((r) => r.classList.remove('drop-hier'));
  const tr = e.target.closest && e.target.closest('table.lv tr[data-i]'), kopf = !tr && e.target.closest && e.target.closest('table.lv thead tr, table.lv tr.wurzel');
  quEinfuegen(quAuswahl(new Set(JSON.parse(d))), tr ? +tr.dataset.i : kopf ? -1 : null);
});

/* ---------- Zeilen verschieben: an der Ordnungszahl greifen und an die neue Stelle ziehen (Titel nehmen ihren Inhalt mit) ---------- */
let ZIEH = null;
/* Beim Ziehen über einem zugeklappten LV-Ordner kurz verweilen: er klappt auf und zeigt seine Zeilen als Ziele (nur zum Ablegen, ohne das LV zu wechseln) */
let LVZT = 0, LVZR = null;
function lvZielAuf(tr) {
  if (LVZR === tr || tr.dataset.zielauf) return;
  clearTimeout(LVZT); LVZR = tr;
  LVZT = setTimeout(async () => {
    if (LVZR !== tr || !tr.isConnected || !tr.classList.contains('zieh-lv')) { LVZR = null; return; }
    tr.dataset.zielauf = '1'; const id = +tr.dataset.lvopen, car = tr.querySelector('.car'); if (car) car.textContent = '▾';
    try {
      const T = await api('api/lv/' + id), nc = tr.children.length, I = T.data.items || [];
      const h = I.map((x, k) => { const tief = x.typ === 'titel' ? (x.lvl || 1) : 1 + Math.max(1, ...I.slice(0, k).filter((y) => y.typ === 'titel').slice(-1).map((y) => y.lvl || 1));
        return `<tr class="zl${x.typ === 'titel' ? ' ti' : ''}" data-ziellv="${id}" data-zi="${k}"><td class="baumz"><div class="bz" style="padding-left:${(1 + tief) * 1.15}rem">${x.typ === 'titel' ? IC.ti : IC.pos}<span class="oz" style="margin:0 .5rem 0 .3rem">${esc(x.oz || '')}</span><span>${esc(x.kurz || '')}</span></div></td><td class="r">${x.typ === 'titel' || !x.menge ? '' : nf(x.menge)}</td><td>${esc(x.typ === 'titel' ? '' : x.einheit || '')}</td><td colspan="${Math.max(1, nc - 3)}"></td></tr>`; }).join('')
        || `<tr class="zl" data-ziellv="${id}" data-zi="0"><td colspan="${nc}" class="hint" style="padding-left:3rem">noch leer – hier ablegen</td></tr>`;
      if (tr.isConnected) tr.insertAdjacentHTML('afterend', h);
    } catch (er) { delete tr.dataset.zielauf; }
    LVZR = null;
  }, 650);
}
document.addEventListener('dragend', () => { clearTimeout(LVZT); LVZR = null; if (document.querySelector('table.lv tr[data-ziellv]')) render(); });
/* Zeilen auf ein anderes LV des Projekts ziehen: verschieben oder kopieren (beauftragte LVs: nur kopieren) – mit Rückgängig */
async function lvZiehNach(zielId, von, an) {   // an: Stelle im Ziel-LV (Index), ohne = ans Ende
  const Z = LIST.find((x) => x.id === zielId), I = items(), x = I[von]; if (!Z || !L || !x) return;
  let blk;
  if (LVSEL.size > 1 && LVSEL.has(x.id)) blk = I.filter((y) => LVSEL.has(y.id));
  else { let ende = von + 1; if (x.typ === 'titel') { const lv = x.lvl || 1; while (ende < I.length && !(I[ende].typ === 'titel' && (I[ende].lvl || 1) <= lv)) ende++; } blk = I.slice(von, ende); }
  const nurKopie = vergeben() || !!Z.vergeben, quelle = L.id;
  const was = blk.length === 1 ? `„${x.kurz || x.oz || 'Zeile'}“` : `${blk.length} Zeilen`, ziel = `${Z.nr || ''} ${Z.name || ''}`.trim();
  const a = await bpFrage(`${was} nach „${ziel}“?\n` + (nurKopie ? 'Eines der beiden LVs ist beauftragt – deshalb wird kopiert, nicht verschoben.' : 'Verschieben nimmt die Zeilen aus diesem LV heraus. Kopieren lässt sie hier stehen.'),
    nurKopie ? { ok: 'Kopieren' } : { ok: 'Verschieben', drei: 'Kopieren' });
  if (!a) return;
  const move = !nurKopie && a === true;
  await flush();
  const T = await api('api/lv/' + zielId), entwurf = (Z.status || 'entwurf') === 'entwurf';
  const neu = blk.map((y) => ({ ...JSON.parse(JSON.stringify(y)), id: uid(), ...(entwurf ? {} : { oz: '' }) }));   // im Entwurf wird neu nummeriert, sonst bleiben die vorhandenen OZ unangetastet (neue Zeilen ohne OZ)
  await api('api/lv/' + zielId, 'PUT', { rev: T.rev, data: { ...T.data, items: (() => { const Q = [...(T.data.items || [])]; Q.splice(an == null ? Q.length : Math.max(0, Math.min(Q.length, an)), 0, ...neu); return Q; })() }, ...(entwurf ? { nummerieren: true } : {}) });
  const vorher = move ? JSON.parse(JSON.stringify(I)) : null;
  if (move) { const weg = new Set(blk.map((y) => y.id)); L.data.items = I.filter((y) => !weg.has(y.id)); LVSEL = new Set(); if (weg.has(LVAKT)) LVAKT = null; HIST.next = `${was} nach „${ziel}“ verschoben`; changed(true); await flush(); }
  delete PC[zielId]; await refreshList(); render();
  toast(`${was} ${move ? 'verschoben' : 'kopiert'} nach „${ziel}“${entwurf ? '' : ' – dort ohne OZ angehängt (Nummerieren vergibt sie)'}`);
  rueckgaengig(`${was} nach „${ziel}“ ${move ? 'verschoben' : 'kopiert'}`, async () => {
    const T2 = await api('api/lv/' + zielId), ids = new Set(neu.map((y) => y.id));
    await api('api/lv/' + zielId, 'PUT', { rev: T2.rev, data: { ...T2.data, items: (T2.data.items || []).filter((y) => !ids.has(y.id)) }, ...(entwurf ? { nummerieren: true } : {}) });
    if (move) { await flush(); if (!L || L.id !== quelle) await openLv(quelle); L.data.items = vorher; changed(true); await flush(); }
    delete PC[zielId]; await refreshList(); render();
  });
}
document.addEventListener('mousedown', (e) => { const td = e.target.closest && e.target.closest('table.lv tr[data-i]:not(.lang) td.oz'); const f = e.target.closest('input,select,button'); if (td && tab === 'lv' && (!f || (f.tagName === 'INPUT' && f !== document.activeElement))) td.parentElement.draggable = true; });   // auch an der Bezeichnung greifen – solange man nicht darin schreibt
document.addEventListener('dragstart', (e) => {
  const tr = e.target.closest && e.target.closest('table.lv tr[data-i]'); if (!tr || !tr.draggable || tab !== 'lv') return;
  ZIEH = +tr.dataset.i; e.dataTransfer.setData('text/x-ava-zeile', String(ZIEH)); e.dataTransfer.effectAllowed = 'move';
});
document.addEventListener('dragover', (e) => {
  if (ZIEH == null || ![...(e.dataTransfer.types || [])].includes('text/x-ava-zeile')) return;
  document.querySelectorAll('.zieh-lv').forEach((r) => r.classList.remove('zieh-lv'));
  const anderes = e.target.closest && e.target.closest('table.lv tr[data-lvopen]');   // auf ein anderes LV des Projekts: dorthin verschieben oder kopieren
  if (anderes) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; document.querySelectorAll('.zieh-hier,.zieh-davor').forEach((r) => r.classList.remove('zieh-hier', 'zieh-davor')); anderes.classList.add('zieh-lv'); lvZielAuf(anderes); return; }
  const zz = e.target.closest && e.target.closest('table.lv tr[data-ziellv]');   // Zeile im aufgeklappten Ziel-LV: davor oder dahinter einfügen
  if (zz) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; document.querySelectorAll('.zieh-hier,.zieh-davor').forEach((r) => r.classList.remove('zieh-hier', 'zieh-davor')); const r = zz.getBoundingClientRect(); zz.classList.add(e.clientY < r.top + r.height / 2 ? 'zieh-davor' : 'zieh-hier'); return; }
  const tr = e.target.closest && e.target.closest('table.lv tr[data-i]'), kopf = !tr && e.target.closest && e.target.closest('table.lv thead, table.lv tr.wurzel');
  document.querySelectorAll('.zieh-hier,.zieh-davor').forEach((r) => r.classList.remove('zieh-hier', 'zieh-davor'));
  if (tr) { e.preventDefault(); const r = tr.getBoundingClientRect(); tr.classList.add(e.clientY < r.top + r.height / 2 ? 'zieh-davor' : 'zieh-hier'); }   // obere Hälfte: davor einfügen (so geht es auch ganz nach oben)
  else if (kopf) { e.preventDefault(); const t0 = kopf.closest('table').querySelector('tbody tr[data-i]'); if (t0) t0.classList.add('zieh-davor'); }
});
document.addEventListener('drop', (e) => {
  if (ZIEH == null || !e.dataTransfer.getData('text/x-ava-zeile')) return;
  const anderes = e.target.closest && e.target.closest('table.lv tr[data-lvopen]');
  document.querySelectorAll('.zieh-lv').forEach((r) => r.classList.remove('zieh-lv'));
  if (anderes) { e.preventDefault(); const von = ZIEH; ZIEH = null; lvZiehNach(+anderes.dataset.lvopen, von).catch((er) => toast(er.message, true)); return; }
  const zz = e.target.closest && e.target.closest('table.lv tr[data-ziellv]');
  if (zz) { e.preventDefault(); const von = ZIEH, davor = zz.classList.contains('zieh-davor'); ZIEH = null; document.querySelectorAll('.zieh-hier,.zieh-davor').forEach((r) => r.classList.remove('zieh-hier', 'zieh-davor'));
    lvZiehNach(+zz.dataset.ziellv, von, +zz.dataset.zi + (davor ? 0 : 1)).catch((er) => toast(er.message, true)); return; }
  e.preventDefault(); const markiert = document.querySelector('.zieh-davor,.zieh-hier'); const davor = !!(markiert && markiert.classList.contains('zieh-davor'));
  document.querySelectorAll('.zieh-hier,.zieh-davor').forEach((r) => r.classList.remove('zieh-hier', 'zieh-davor'));
  const tr = (e.target.closest && e.target.closest('table.lv tr[data-i]')) || markiert; const von = ZIEH; ZIEH = null; if (!tr || !tr.dataset || tr.dataset.i == null) return;
  const I = items(), x = I[von]; let nach = +tr.dataset.i;
  if (LVSEL.size > 1 && LVSEL.has(x.id)) {   // mehrere markierte Zeilen zusammen verschieben
    const ziel = I[nach]; if (LVSEL.has(ziel.id)) return;
    const blk = I.filter((y) => LVSEL.has(y.id)), rest = I.filter((y) => !LVSEL.has(y.id));
    rest.splice(rest.indexOf(ziel) + (davor ? 0 : 1), 0, ...blk); L.data.items = rest; HIST.next = `${blk.length} Zeilen verschoben`; numerieren(); changed(true); return;
  }
  let ende = von + 1; if (x.typ === 'titel') { const lv = x.lvl || 1; while (ende < I.length && !(I[ende].typ === 'titel' && (I[ende].lvl || 1) <= lv)) ende++; }
  if (nach >= von && nach < ende) return;   // in sich selbst
  const blk = I.splice(von, ende - von); if (nach >= ende) nach -= blk.length;
  I.splice(nach + (davor ? 0 : 1), 0, ...blk); HIST.next = 'Verschoben'; numerieren(); changed(true);
});
document.addEventListener('dragend', () => { ZIEH = null; document.querySelectorAll('table.lv tr[draggable="true"]').forEach((r) => { r.draggable = false; }); document.querySelectorAll('.zieh-hier,.zieh-davor').forEach((r) => r.classList.remove('zieh-hier', 'zieh-davor')); });



/* ---------- Nachtragsabwicklung: „einfach“ (wie bisher) oder „mit Prüfablauf“ – je Projekt, dazu bürobreit ab einer Auftragssumme ---------- */
const NTM = {}, NTA = {};
const NT_PH = { '': ['angemeldet', 's1'], angekuendigt: ['angekündigt', 's1'], angebot: ['Angebot liegt vor', 's2'], geprueft: ['geprüft – bei der Bauherr:in', 's3'], strittig: ['strittig · angeordnet', 's6'] };
async function ntmLaden() { if (!pid || NTM[pid]) return; NTM[pid] = { modus: 'einfach', grenze: null, laed: true }; try { NTM[pid] = await api('api/ntmodus?pid=' + pid); } catch { NTM[pid] = { modus: 'einfach', grenze: null }; } if (tab === 'auftraege') render(); }
function ntPruef(lvId) { const m = NTM[pid]; if (!m) { ntmLaden(); return false; } const x = LIST.find((y) => y.id === lvId) || {};
  return m.modus === 'pruefung' || (!!m.grenze && (x.auftrag || 0) >= m.grenze); }
function ntAkteVon(lv, nt) { return ((lv.vergabe || {}).nt_akte || {})[nt] || {}; }
function ntBetraege(lv, nt, st, summe) {   // angeboten · geprüft · beauftragt
  const A = ntAkteVon(lv, nt), ph = st === 'beauftragt' || st === 'abgelehnt' ? '' : A.phase || '';
  const ang = A.angeboten ?? null;
  const gep = A.geprueft ?? (['geprueft', 'strittig'].includes(ph) || st === 'beauftragt' ? summe : st === 'abgelehnt' ? 0 : null);
  const bea = st === 'beauftragt' ? (A.beauftragt ?? summe) : ph === 'strittig' ? (A.beauftragt ?? (ang != null ? Math.round(ang * 80) / 100 : null)) : null;
  return { A, ph, ang, gep, bea };
}
function ntStufe(st, ph) { return st === 'beauftragt' ? ['beauftragt', 's4'] : st === 'abgelehnt' ? ['abgelehnt', 's5'] : NT_PH[ph] || NT_PH['']; }
function ntNaechsteFrist(A) { const h = new Date().toISOString().slice(0, 10);
  return [['frist_angebot', 'Angebot bis'], ['frist_pruefung', 'Prüfung bis'], ['frist_bauherr', 'Bauherr:in bis']].filter(([k]) => A[k] && !(A.todos_ok || {})[k]).map(([k, t]) => ({ t, d: A[k], rot: A[k] <= h })).sort((a, b) => a.d.localeCompare(b.d))[0]; }
function ntZeileInfo(lv, nt, st, summe) {
  const B = ntBetraege(lv, nt, st, summe), [lab, cls] = ntStufe(st, B.ph), e3 = (v) => (v == null ? '–' : eur(v).replace(' €', ''));
  const f = st === 'angemeldet' ? ntNaechsteFrist(B.A) : null, nd = (B.A.dateien_n || 0);
  return `<span class="nt-zl"><span class="nt-ph ${cls}">${lab}</span><small class="nt-b" title="angeboten · geprüft · beauftragt">${e3(B.ang)} · ${e3(B.gep)} · ${e3(B.bea)}${B.ph === 'strittig' && B.A.beauftragt == null && B.bea != null ? ' (80 %)' : ''}</small>${f ? ` <small class="nt-fr${f.rot ? ' rot' : ''}">${f.t} ${de(f.d).slice(0, 6)}</small>` : ''}</span>`;
}
function ntModusKopf(lvId, lv) {
  const m = NTM[pid] || { modus: 'einfach' }, an = ntPruef(lvId), auto = an && m.modus !== 'pruefung';
  let sum = '';
  if (an) { const S = { a: 0, g: 0, b: 0 }; const G = {}; (lv.data.items || []).filter((y) => y.nt && y.typ === 'pos').forEach((y) => { (G[y.nt] = G[y.nt] || []).push(y); });
    const R = lvBaum(lv); Object.entries(G).forEach(([nt, P]) => { const sm = P.reduce((a, y) => { const r = R.find((q) => q.x === y) || {}; return a + (r.nt || r.gRoh || 0); }, 0);
      const st = ((lv.data.items || []).find((y) => y.nt === nt && (y.typ === 'titel' || !y.nt_erbe)) || P[0]).nt_status || 'angemeldet', B = ntBetraege(lv, nt, st, sm); S.a += B.ang || 0; S.g += B.gep || 0; S.b += B.bea || 0; });
    sum = `<span class="hint" style="margin-left:.6rem">angeboten ${eur(S.a)} · geprüft ${eur(S.g)} · beauftragt ${eur(S.b)}</span>`; }
  return `<span class="nt-modus" title="Nachträge einfach (Stand + Betrag) oder mit Prüfablauf (Akte, drei Beträge, Fristen, Nachtragsempfehlung) – gilt für das ganze Projekt"><span class="seg sm" role="radiogroup"><button type="button" class="${an ? '' : 'on'}" data-ntm="einfach"${auto ? ' disabled title="Prüfablauf gilt hier automatisch ab der Auftragssumme"' : ''}>einfach</button><button type="button" class="${an ? 'on' : ''}" data-ntm="pruefung">mit Prüfablauf</button></span><button type="button" class="ib" data-ntgrenze title="Prüfablauf automatisch ab einer Auftragssumme (für alle Projekte)">⚙${m.grenze ? ' ab ' + eur(m.grenze).replace(',00 €', ' €') : ''}</button></span>${sum}`;
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest && e.target.closest('[data-ntm]');
  if (b && pid) { e.stopPropagation(); const alt = (NTM[pid] || {}).modus || 'einfach', neu = b.dataset.ntm; if (alt === neu) return;
    try { NTM[pid] = await api('api/ntmodus?pid=' + pid, 'PUT', { modus: neu }); render(); rueckgaengig(`Nachträge: ${neu === 'pruefung' ? 'mit Prüfablauf' : 'einfach'}`, async () => { NTM[pid] = await api('api/ntmodus?pid=' + pid, 'PUT', { modus: alt }); render(); }); } catch (er) { toast(er.message, true); } return; }
  const g = e.target.closest && e.target.closest('[data-ntgrenze]');
  if (g && pid) { e.stopPropagation(); const m = NTM[pid] || {};
    modalBox(`<h3>Prüfablauf automatisch</h3><p class="hint" style="margin-top:0">Gilt für alle Projekte: Aufträge ab dieser Auftragssumme (netto) bekommen den Prüfablauf für Nachträge, auch wenn das Projekt auf „einfach“ steht. Leer = aus.</p>
      <div class="fm"><label for="ntgB">ab Auftragssumme</label><input id="ntgB" inputmode="decimal" value="${m.grenze ? nf(m.grenze, 0) : ''}" placeholder="z. B. 100.000" style="text-align:right"></div>
      <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">OK</button></div>`, async (mm, bg, close) => {
      if (mm === 'x') { close(); return; } if (mm !== 'ok') return;
      try { NTM[pid] = await api('api/ntmodus?pid=' + pid, 'PUT', { grenze: pf(bg.querySelector('#ntgB').value) || null }); close(); render(); } catch (er) { toast(er.message, true); } });
    return; }
});
/* Rechte Spalte in Aufträge: Akte des gewählten Nachtrags (Prüfablauf), sonst die Auftragskarte */
/* Aufträge, Bereich rechts (seite.js): „Position“ folgt der Auswahl in der Tabelle, „Auftrag“ zeigt Summen, Bedingungen, Sicherheiten */
function auSeite() {
  const sp = document.querySelector('#view .au2'); if (!sp) return;
  seite(sp, 'au', [{ id: 'pos', titel: 'Position', mount: (el) => { el.innerHTML = `<div class="sr-pad">${auAuswahl()}</div>`; } },
    { id: 'auftrag', titel: 'Auftrag', mount: (el) => { el.innerHTML = `<div class="sr-pad">${auftragKarte()}</div>`; } }], { w: 0.7, wechsel: () => { uLeisteNeu(); requestAnimationFrame(randUnten); } });
}
function auAuswahl() {
  const m = /^l(\d+):nt:(.+)$/.exec(TSEL || '');
  if (m) { const lvId = +m[1], nt = decodeURIComponent(m[2]), lv = PC[lvId]; if (!lv) return ''; if (ntPruef(lvId)) return auRechts(); const G = (lv.data.items || []).filter((y) => String(y.nt) === nt); return G.length === 1 ? auPosKarte(lv, G[0]) : auNtKarte(lv, nt); }
  const p = /^l(\d+):(.+)$/.exec(TSEL || ''), lv = p && PC[+p[1]], x = lv && (lv.data.items || []).find((y) => y.id === p[2]);
  if (x) return auPosKarte(lv, x);
  return '<div class="card empty"><p class="hint">In der Tabelle eine Position oder einen Nachtrag wählen – hier stehen dann Menge, Preis, Langtext und ob es ein Nachtrag ist.</p></div>';
}
function auPosKarte(lv, x) {   // dieselben Felder wie in der Tabelle (input.aui) – speichern, Rückgängig, Enter/Tab laufen über denselben Weg
  const f = auFelder(lv, x), I = (lv.data.items || []).filter((y) => y.typ === x.typ), k = I.indexOf(x), ti = x.typ === 'titel';
  const st = x.nt_status || 'angemeldet', R = lvBaum(lv), rr = R.find((q) => q.x === x) || {};
  const aa = `data-aulv="${lv.id}" data-auid="${esc(x.id)}"`;   // alles in der Karte lässt sich ändern – derselbe Speicherweg wie die Felder der Tabelle (auFeldFertig)
  return `<div class="card au-pk${ti ? '' : ' pk-teil'}"><div class="nv"><button type="button" class="btn sm" data-aupn="-1" data-aupx="${lv.id}:${esc(x.id)}"${k > 0 ? '' : ' disabled'} title="vorige ${ti ? 'Gliederung' : 'Position'}">◀</button><span class="hint">${k + 1} von ${I.length}</span><button type="button" class="btn sm" data-aupn="1" data-aupx="${lv.id}:${esc(x.id)}"${k < I.length - 1 ? '' : ' disabled'} title="nächste">▶</button></div>
    <h3>${esc(x.oz || '')} ${esc(x.kurz || '')}</h3>
    <div class="grp"><h6>${ti ? 'Gliederungspunkt' : 'Position'}</h6><div class="pk-f"><label class="w">Kurztext${f.bz.replace(/<b class="au-oz">.*?<\/b>/, '')}</label>${ti ? '' : `<label>Menge${f.mx[0]}</label><label>Einheit${f.mx[1]}</label><label>EP €${f.mx[2]}</label><label>GP<b>${eur(rr.gRoh || 0)}</b></label>
      <label>Art<input class="aui" ${aa} data-auf="art" value="${artW(x)}" data-vs="art" autocomplete="off" maxlength="1" style="width:3.8rem" title="${esc(ARTEN[artW(x)] || '')} – N Normal · E Bedarf · A Wahl · P Pauschal · T Hinweistext · V Vorbemerkung"></label>
      <label>Kostengruppe<input class="aui" ${aa} data-auf="kg" value="${esc(x.kg || '')}" data-vs="kg" autocomplete="off" inputmode="numeric" style="width:4.6rem" title="Kostengruppe DIN 276"></label>`}</div></div>
    ${ti ? '' : `<div class="grp pk-lt"><h6>Langtext</h6><textarea class="aui" ${aa} data-auf="lang" placeholder="Langtext – Leistungsbeschreibung, Material, Fabrikat, Ausführung, Abrechnung" title="Langtext – gespeichert wird beim Verlassen des Feldes, Esc verwirft">${esc(x.lang || '')}</textarea><button type="button" class="btn sm" data-aulang="${lv.id}:${esc(x.id)}" style="margin-top:.35rem" title="Alle Angaben der Position: Texte, Kostengruppen, Positionsart, Rechenweg der Menge, Fotos">Details bearbeiten …</button></div>`}
    <div class="grp"><h6>Nachtrag</h6><label class="chk"><input type="checkbox" data-aunt1="${lv.id}:${esc(x.id)}"${x.nt ? ' checked' : ''}${x.nt_erbe ? ' disabled title="gehört zum Nachtrag des Gliederungspunkts darüber"' : ''}> ${ti ? 'Dieser Gliederungspunkt ist ein Nachtrag' : 'Diese Position ist ein Nachtrag'}</label>
      ${x.nt ? `<div class="fd" style="margin-top:.35rem"><span>Nummer</span><b>${esc(x.nt)}</b><span>Stand</span><select class="nt-st ${st}" data-ntst="${lv.id}:${esc(x.id)}">${['angemeldet', 'beauftragt', 'abgelehnt'].map((s3) => `<option value="${s3}"${st === s3 ? ' selected' : ''}>${s3}</option>`).join('')}</select></div>` : '<p class="hint" style="margin:.3rem 0 0">Haken setzen: wird Nachtrag „angemeldet“ mit der nächsten Nummer.</p>'}</div></div>`;
}
function auNtKarte(lv, nt) {   // Nachtrag als Ganzes (einfacher Ablauf): Positionen, Summe, Stand
  const I = (lv.data.items || []).filter((y) => String(y.nt) === nt), P = I.filter((y) => y.typ === 'pos'), R = lvBaum(lv);
  const summe = P.reduce((a, y) => a + ((R.find((q) => q.x === y) || {}).gRoh || 0), 0);
  return `<div class="card au-pk"><h3><span class="badge nt">${esc(nt)}</span> ${esc((I.find((y) => y.typ === 'titel') || P[0] || {}).kurz || '')}</h3>
    <div class="grp"><h6>Nachtrag</h6><div class="fd"><span>Positionen</span><b>${P.length}</b><span>Summe</span><b>${eur(summe)}</b></div></div>
    <div class="grp"><h6>Positionen</h6>${P.map((y) => `<div style="display:flex;gap:.5rem;justify-content:space-between;padding:.15rem 0"><span>${esc(y.oz || '')} ${esc(y.kurz || '')}</span><b>${eur((R.find((q) => q.x === y) || {}).gRoh || 0)}</b></div>`).join('') || '<p class="hint">noch keine</p>'}</div></div>`;
}
function auRechts() {
  const m = /^l(\d+):nt:(.+)$/.exec(TSEL || ''); if (!m || !ntPruef(+m[1])) return auftragKarte();
  const lvId = +m[1], nt = decodeURIComponent(m[2]), lv = PC[lvId]; if (!lv) return auftragKarte();
  const key = lvId + ':' + nt, D = NTA[key];
  if (!D) { api(`api/lv/${lvId}/ntakte/${encodeURIComponent(nt)}`).then((d) => { NTA[key] = d; if (TSEL === `l${lvId}:nt:${m[2]}`) auSeite(); }).catch((er) => toast(er.message, true)); return '<div class="card"><p class="hint">Akte wird geladen …</p></div>'; }
  return ntAkteHtml(lv, nt, D);
}
function ntAkteHtml(lv, nt, D) {
  const I = lv.data.items || [], grp = I.filter((y) => String(y.nt) === nt), kopf = grp.find((y) => y.typ === 'titel') || grp[0] || {};
  const st = kopf.nt_status || 'angemeldet', R = lvBaum(lv), summe = grp.filter((y) => y.typ === 'pos').reduce((a, y) => { const r = R.find((q) => q.x === y) || {}; return a + (r.nt || r.gRoh || 0); }, 0);
  const B = ntBetraege(lv, nt, st, summe), A = { ...B.A, ...(D.akte || {}) }, [lab, cls] = ntStufe(st, B.ph), k = `${lv.id}:${encodeURIComponent(nt)}`;
  const stufen = [['angekuendigt', 'angekündigt'], ['angebot', 'Angebot'], ['geprueft', 'geprüft'], ['beauftragt', 'beauftragt']];
  const idx = st === 'beauftragt' ? 3 : Math.max(-1, ['angekuendigt', 'angebot', 'geprueft'].indexOf(B.ph === 'strittig' ? 'geprueft' : B.ph));
  const inp = (f, v, extra = '') => `<input data-nta="${f}" data-k="${k}" value="${esc(v ?? '')}" ${extra}>`;
  const betr = (f, v, t) => `<label class="nta-b${f === 'geprueft' ? ' g' : ''}"><small>${t}</small><input data-nta="${f}" data-k="${k}" inputmode="decimal" value="${v != null ? nf(v, 2) : ''}" placeholder="${f === 'geprueft' && A.geprueft == null && B.gep != null ? nf(B.gep, 2) : f === 'beauftragt' && A.beauftragt == null && B.bea != null ? nf(B.bea, 2) : '–'}"></label>`;
  return `<div class="card nta"><div class="nta-k"><span class="badge nt">${esc(nt)}</span> <b>${esc(kopf.oz || '')} ${esc(kopf.kurz || '')}</b> <span class="nt-ph ${cls}">${lab}</span></div>
    <div class="hint">${esc((lv.vergabe || {}).bieter || '')} · LV ${esc([lv.nr, lv.name].filter(Boolean).join(' '))} · Positionen ${eur(summe)}</div>
    <div class="nta-st" role="radiogroup" aria-label="Stufe">${stufen.map(([s2, t], i) => `<button type="button" class="${i < idx ? 'ok' : i === idx ? 'on' : ''}" data-ntph="${s2}" data-k="${k}">${i < idx ? '✓ ' : ''}${t}</button>`).join('')}</div>
    <div class="nta-f">
      <label>Anlass</label><span><select data-nta="anlass_vg" data-k="${k}"><option value="">– Vorgang aus Kommunikation –</option>${(D.vorgaenge || []).map((v) => `<option value="${v.id}"${A.anlass_vg === v.id ? ' selected' : ''}>${esc((v.zeit || '').slice(0, 10).split('-').reverse().join('.'))} ${esc(v.titel || v.art)}</option>`).join('')}</select>${inp('anlass', A.anlass, 'placeholder="oder kurz beschreiben"')}</span>
      <label>Rechtsgrundlage</label><select data-nta="grundlage" data-k="${k}"><option value="">–</option>${Object.entries(D.grundlagen || {}).map(([g2, t]) => `<option value="${g2}"${A.grundlage === g2 ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
      <label>Angekündigt am</label><span class="nta-r">${inp('angekuendigt', A.angekuendigt, 'type="date"')}<label class="nta-c"><input type="checkbox" data-nta="vor_ausf" data-k="${k}"${A.vor_ausf ? ' checked' : ''}> vor Ausführung</label></span>
    </div>
    <div class="nta-3">${betr('angeboten', A.angeboten, 'angeboten (Firma)')}${betr('geprueft', A.geprueft, 'geprüft (Bauleitung)')}${betr('beauftragt', A.beauftragt, st === 'beauftragt' ? 'beauftragt (Bauherr:in)' : B.ph === 'strittig' ? 'Abschlag 80 % (§ 650c)' : 'beauftragt (Bauherr:in)')}</div>
    <div class="nta-f"><label>Prüfvermerk</label><textarea data-nta="vermerk" data-k="${k}" rows="2" placeholder="z. B. EP auf Urkalkulation zurückgeführt, Menge nach Planung">${esc(A.vermerk || '')}</textarea>
      <label>Bauzeit</label><span class="nta-r">${inp('bauzeit', A.bauzeit || '', 'type="number" step="1" style="width:5rem"')} Arbeitstage</span></div>
    <h4>Fristen <small class="hint">(als To-do mit Erinnerung)</small></h4>
    <div class="nta-f">${Object.entries({ frist_angebot: 'Angebot der Firma', frist_pruefung: 'Prüfung Bauleitung', frist_bauherr: 'Entscheidung Bauherr:in' }).map(([f, t]) => `<label>${t}</label>${inp(f, A[f], 'type="date"')}`).join('')}</div>
    <h4>Unterlagen</h4>
    <div class="nta-u">${(D.akte.dateien || []).map((d) => `<span><a href="api/ntdatei/${d.id}" target="_blank" rel="noopener">📄 ${esc(d.name)}</a> <small class="hint">${esc((d.created || '').slice(0, 10).split('-').reverse().join('.'))}</small><button type="button" class="ib" data-ntdw="${d.id}" data-k="${k}" title="Entfernen">✕</button></span>`).join('') || '<span class="hint">noch keine – Nachtragsangebot, Urkalkulation, Fotos …</span>'}
      <label class="btn sm">＋ Datei<input type="file" data-ntdh="${k}" accept="application/pdf,image/*,.xlsx,.xls" hidden></label></div>
    <div class="bar" style="margin-top:.7rem;flex-wrap:wrap"><button type="button" class="btn sm pri" data-ntpdf="${k}">🖨 Nachtragsempfehlung für den Bauherrn …</button>
      ${st !== 'beauftragt' ? `<button type="button" class="btn sm" data-ntent="beauftragt" data-k="${k}">✓ Bauherr hat beauftragt</button>` : ''}${st !== 'abgelehnt' ? `<button type="button" class="btn sm" data-ntent="abgelehnt" data-k="${k}">✕ abgelehnt</button>` : ''}
      ${B.ph !== 'strittig' && st === 'angemeldet' ? `<button type="button" class="btn sm" data-ntph="strittig" data-k="${k}" title="Keine Einigung: Bauherr ordnet an (§ 650b BGB), Abschlag 80 % des Angebots (§ 650c)">⚖ strittig / angeordnet</button>` : ''}
      ${st !== 'angemeldet' ? `<button type="button" class="btn sm" data-ntent="angemeldet" data-k="${k}">↺ wieder offen</button>` : ''}</div></div>`;
}
async function ntAktePut(k, body, rueck) {
  const [lvId, ntE] = k.split(':'), nt = decodeURIComponent(ntE);
  const r = await api(`api/lv/${lvId}/ntakte/${ntE}`, 'PUT', body);
  NTA[lvId + ':' + nt] = r.ntakte; delete r.ntakte; PC[+lvId] = r; if (L && L.id === +lvId) L = r; render();
  if (rueck) rueckgaengig(rueck.text, async () => { const r2 = await api(`api/lv/${lvId}/ntakte/${ntE}`, 'PUT', rueck.body); NTA[lvId + ':' + nt] = r2.ntakte; delete r2.ntakte; PC[+lvId] = r2; if (L && L.id === +lvId) L = r2; render(); });
  lvEintrag(+lvId).catch(() => {});
}
document.addEventListener('change', async (e) => {
  const el = e.target.closest && e.target.closest('[data-nta]'); if (!el) return;
  const f = el.dataset.nta, k = el.dataset.k, [lvId, ntE] = k.split(':'), A = (NTA[lvId + ':' + decodeURIComponent(ntE)] || {}).akte || {};
  let v = el.type === 'checkbox' ? el.checked : el.value; if (['angeboten', 'geprueft', 'beauftragt'].includes(f)) v = el.value.trim() === '' ? null : pf(el.value);
  const alt = A[f] ?? (el.type === 'checkbox' ? false : null);
  try { await ntAktePut(k, { [f]: v }, { text: 'Nachtragsakte geändert', body: { [f]: alt } }); } catch (er) { toast(er.message, true); }
});
document.addEventListener('click', async (e) => {
  const ph = e.target.closest && e.target.closest('[data-ntph]');
  if (ph) { e.stopPropagation(); const k = ph.dataset.k, [lvId, ntE] = k.split(':'), nt = decodeURIComponent(ntE), lv = PC[+lvId], A = ntAkteVon(lv, nt);
    const kopf = (lv.data.items || []).find((y) => String(y.nt) === nt && (y.typ === 'titel' || !y.nt_erbe)) || {};
    const neu = ph.dataset.ntph, altSt = kopf.nt_status || 'angemeldet';
    const body = neu === 'beauftragt' ? { status: 'beauftragt' } : { phase: neu, ...(altSt !== 'angemeldet' ? { status: 'angemeldet' } : {}) };
    try { await ntAktePut(k, body, { text: `${nt}: Stufe geändert`, body: { phase: A.phase || '', status: altSt } }); } catch (er) { toast(er.message, true); } return; }
  const en = e.target.closest && e.target.closest('[data-ntent]');
  if (en) { e.stopPropagation(); const k = en.dataset.k, [lvId, ntE] = k.split(':'), nt = decodeURIComponent(ntE), lv = PC[+lvId];
    const kopf = (lv.data.items || []).find((y) => String(y.nt) === nt && (y.typ === 'titel' || !y.nt_erbe)) || {}, altSt = kopf.nt_status || 'angemeldet';
    try { await ntAktePut(k, { status: en.dataset.ntent }, { text: `${nt} ${en.dataset.ntent === 'angemeldet' ? 'wieder offen' : en.dataset.ntent}`, body: { status: altSt } }); toast(`${nt}: ${en.dataset.ntent === 'angemeldet' ? 'wieder offen' : en.dataset.ntent}.`); } catch (er) { toast(er.message, true); } return; }
  const pdfB = e.target.closest && e.target.closest('[data-ntpdf]');
  if (pdfB) { e.stopPropagation(); const [lvId, ntE] = pdfB.dataset.ntpdf.split(':'); window.open(`api/lv/${lvId}/pdf?art=ntempf&nt=${ntE}`, '_blank', 'noopener'); return; }
  const dw = e.target.closest && e.target.closest('[data-ntdw]');
  if (dw) { e.stopPropagation(); if (!(await bpFrage('Diese Unterlage aus der Nachtragsakte entfernen?', { ok: 'Entfernen', gefahr: true }))) return;
    try { const [lvId, ntE] = dw.dataset.k.split(':'); NTA[lvId + ':' + decodeURIComponent(ntE)] = await api('api/ntdatei/' + dw.dataset.ntdw, 'DELETE'); render(); } catch (er) { toast(er.message, true); } }
});
document.addEventListener('change', async (e) => {
  const i = e.target.closest && e.target.closest('[data-ntdh]'); if (!i || !i.files[0]) return;
  const [lvId, ntE] = i.dataset.ntdh.split(':'), fd = new FormData(); fd.append('datei', i.files[0]); i.value = '';
  try { const r = await fetch(`api/lv/${lvId}/ntakte/${ntE}/datei`, { method: 'POST', body: fd, credentials: 'same-origin' }); const d = await jsonAus(r); if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status);
    NTA[lvId + ':' + decodeURIComponent(ntE)] = d; render(); toast('Unterlage abgelegt.'); } catch (er) { toast(er.message, true); }
});
/* ---------- Aufträge: Nachtragsposition bzw. Nachtrag (Gliederungspunkt mit Inhalt) per Drag & Drop verschieben ----------
   auf einen Nachtrags-Gliederungspunkt: übernimmt dessen Nummer und Stand · zwischen Zeilen: Reihenfolge / Stelle im LV · mit Rückgängig */
let NTZIEH = null;
const auItem = (key) => { const m = /^l(\d+):(.+)$/.exec(key || ''); if (!m) return null; const lvId = +m[1], lv = PC[lvId] || (L && L.id === lvId ? L : null); if (!lv) return null;
  const I = lv.data.items || []; let x;
  if (m[2].startsWith('nt:')) { const nt = decodeURIComponent(m[2].slice(3)); x = I.find((y) => y.nt === nt && y.typ === 'titel') || I.find((y) => y.nt === nt); }
  else x = I.find((y) => y.id === m[2]);
  return x ? { lvId, lv, x } : null; };
document.addEventListener('mousedown', (e) => {
  if (tab !== 'auftraege') return; const tr = e.target.closest && e.target.closest('table.au-t tr[data-tr]'); if (!tr || e.target.closest('input,select,button,a,[data-car]')) return;
  const it = auItem(tr.dataset.tr); if (it && it.x.nt) tr.draggable = true;
});
document.addEventListener('dragstart', (e) => {
  const tr = e.target.closest && e.target.closest('table.au-t tr[data-tr]'); if (!tr || !tr.draggable || tab !== 'auftraege') return;
  const it = auItem(tr.dataset.tr); if (!it) return;
  NTZIEH = { lvId: it.lvId, id: it.x.id }; e.dataTransfer.setData('text/x-ava-nt', it.x.id); e.dataTransfer.effectAllowed = 'move';
});
const ntZiel = (e) => { const tr = e.target.closest && e.target.closest('table.au-t tr[data-tr]'); if (!tr || !NTZIEH) return null;
  const it = auItem(tr.dataset.tr); if (!it || it.lvId !== NTZIEH.lvId || it.x.id === NTZIEH.id) return null;
  const r = tr.getBoundingClientRect(), y = (e.clientY - r.top) / r.height;
  const wo = it.x.typ === 'titel' ? (y < 0.25 ? 'davor' : y > 0.75 ? 'danach' : 'in') : (y < 0.5 ? 'davor' : 'danach');
  return { tr, it, wo }; };
document.addEventListener('dragover', (e) => {
  if (!NTZIEH || ![...(e.dataTransfer.types || [])].includes('text/x-ava-nt')) return;
  document.querySelectorAll('table.au-t .zieh-hier,table.au-t .zieh-davor,table.au-t .zieh-in').forEach((r) => r.classList.remove('zieh-hier', 'zieh-davor', 'zieh-in'));
  const z = ntZiel(e); if (!z) return; e.preventDefault();
  z.tr.classList.add(z.wo === 'in' ? 'zieh-in' : z.wo === 'davor' ? 'zieh-davor' : 'zieh-hier');
});
document.addEventListener('drop', async (e) => {
  if (!NTZIEH || !e.dataTransfer.getData('text/x-ava-nt')) return;
  e.preventDefault(); const z = ntZiel(e), von = NTZIEH; NTZIEH = null;
  document.querySelectorAll('table.au-t .zieh-hier,table.au-t .zieh-davor,table.au-t .zieh-in').forEach((r) => r.classList.remove('zieh-hier', 'zieh-davor', 'zieh-in'));
  if (!z) return;
  const lv = z.it.lv, I = lv.data.items || [], x = I.find((y) => y.id === von.id); if (!x) return;
  const am = (lv.calc && lv.calc.aufmass) || {}, mitAm = x.typ === 'pos' ? (am[x.id] || 0) > 0 : false;
  const zielNt = z.wo === 'in' ? z.it.x.nt : z.it.x.nt_erbe ? z.it.x.nt : null;
  if (mitAm && x.nt_status === 'beauftragt' && zielNt && zielNt !== x.nt
    && !(await bpFrage(`„${x.kurz || x.oz}“ ist beauftragt und hat schon Aufmaß.\nSie wird Teil von ${zielNt} und übernimmt dessen Stand. Aufmaß und Rechnungen bleiben an der Position.`, { ok: 'Verschieben' }))) return;
  const alt = JSON.parse(JSON.stringify(lv.data));
  try {
    const r = await api(`api/lv/${von.lvId}/nachtrag/verschieben`, 'POST', { id: von.id, ziel: z.it.x.id, wo: z.wo });
    PC[von.lvId] = r; if (L && L.id === von.lvId) L = r; render();
    const neu = (r.data.items || []).find((y) => y.id === von.id) || x;
    rueckgaengig(`${neu.oz || ''} ${x.kurz || ''} verschoben${neu.nt !== x.nt ? ` (${x.nt} → ${neu.nt})` : ''}`.trim(), async () => {
      const w = await api('api/lv/' + von.lvId, 'PUT', { data: alt, rev: (PC[von.lvId] || r).rev }); const r2 = await api('api/lv/' + von.lvId); PC[von.lvId] = r2; if (L && L.id === von.lvId) L = r2; render(); });
    lvEintrag(von.lvId).then(() => { if (tab === 'auftraege') render(); }).catch(() => {});
  } catch (er) { toast(er.message, true); }
});
document.addEventListener('dragend', () => { if (!NTZIEH && !document.querySelector('table.au-t tr[draggable="true"]')) return; NTZIEH = null; document.querySelectorAll('table.au-t tr[draggable="true"]').forEach((r) => { r.draggable = false; }); document.querySelectorAll('table.au-t .zieh-hier,table.au-t .zieh-davor,table.au-t .zieh-in').forEach((r) => r.classList.remove('zieh-hier', 'zieh-davor', 'zieh-in')); });
/* ---------- Eigenschaften einer Position (wie in ORCA: Allgemein · Weiteres · Menge · Grafik) ---------- */
const LB = ['000 Baustelleneinrichtung', '002 Erdarbeiten', '006 Spezialtiefbau', '009 Entwässerungskanalarbeiten', '012 Mauerarbeiten', '013 Betonarbeiten', '014 Natur-, Betonwerksteinarbeiten', '016 Zimmer- und Holzbauarbeiten', '017 Stahlbauarbeiten', '018 Abdichtungsarbeiten', '020 Dachdeckungsarbeiten', '021 Dachabdichtungsarbeiten', '022 Klempnerarbeiten', '023 Putz- und Stuckarbeiten, Wärmedämmsysteme', '024 Fliesen- und Plattenarbeiten', '025 Estricharbeiten', '026 Fenster, Außentüren', '027 Tischlerarbeiten', '028 Parkett-, Holzpflasterarbeiten', '029 Beschlagarbeiten', '030 Rollladenarbeiten', '031 Metallbauarbeiten', '032 Verglasungsarbeiten', '034 Maler- und Lackierarbeiten', '036 Bodenbelagarbeiten', '037 Tapezierarbeiten', '038 Vorgehängte hinterlüftete Fassaden', '039 Trockenbauarbeiten', '040 Wärmeversorgungsanlagen', '042 Gas- und Wasserinstallation', '044 Abwasserinstallation', '045 Sanitärausstattung', '053 Niederspannungsanlagen', '069 Aufzüge', '080 Straßen, Wege, Plätze', '081 Betonerhaltungsarbeiten', '084 Abbruch- und Rückbauarbeiten', '087 Abfallentsorgung'];
function eigDialog(id) {
  let tabE = LS.get('eigTab', 'weiteres'), snap = {};
  const posen = () => items().filter((y) => y.typ === 'pos');
  const X = () => items().find((y) => y.id === id);
  const merk = () => { if (!snap[id]) snap[id] = JSON.parse(JSON.stringify(X())); };
  const bg = modalBox('<div id="eigBox"></div>', async (m, bg, close) => {
    const x = X(); if (!x) return close();
    if (m === 'x') { close(); render(); return; }
    if (m.startsWith('t:')) { tabE = m.slice(2); LS.set('eigTab', tabE); draw(); return; }
    if (m === 'prev' || m === 'next') { const P = posen(), k = P.findIndex((y) => y.id === id); const n = P[k + (m === 'prev' ? -1 : 1)];
      const fe = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.e;   // dasselbe Feld wieder fokussieren
      if (n) { id = n.id; draw(); const f = fe && box.querySelector(`[data-e="${fe}"]`);   // nur wenn vorher ein Feld aktiv war – sonst bleiben ← → zum Blättern frei
        if (f) { f.focus(); if (f.select && f.tagName === 'INPUT') f.select(); } else { const md = bg.querySelector('.modal'); md.tabIndex = -1; md.focus({ preventScroll: true }); } } return; }
    if (m === 'neu') {
      const I = items(), at = I.findIndex((y) => y.id === id) + 1;
      const nx = { id: uid(), typ: 'pos', art: 'N', oz: '', kurz: '', lang: '', menge: 0, einheit: x.einheit || 'm2', kg: x.kg || '' };
      I.splice(at, 0, nx); numerieren(); changed(true); id = nx.id; tabE = 'allgemein'; draw();
      { const f = bg.querySelector('[data-e="kurz"]'); if (f) f.focus(); } return;
    }
    if (m === 'undo') { if (!snap[id]) return; const I = items(), k = I.findIndex((y) => y.id === id); I[k] = JSON.parse(JSON.stringify(snap[id])); delete snap[id]; changed(true); draw(); toast('Änderungen an dieser Position zurückgenommen.'); return; }
    if (m === 'mf') { const f = bg.querySelector('[data-e="mf"]'); try { const r = await api('api/formel', 'POST', { formel: f.value }); if (r.wert == null) throw new Error('Rechenweg nicht lesbar'); merk(); x.mf = f.value.trim(); x.menge = Math.round(r.wert * 1000) / 1000; changed(true); draw(); } catch (er) { toast(er.message, true); } }
  });
  const box = bg.querySelector('#eigBox'); bg.querySelector('.modal').classList.add('eig');
  const cb = (k, l, on, dis = false, t = '') => `<label class="chk${dis ? ' dis' : ''}" title="${esc(t)}"><input type="checkbox" data-e="${k}"${on ? ' checked' : ''}${dis ? ' disabled' : ''}> ${l}</label>`;
  function draw() {
    const x = X(); if (!x) return;
    const P = posen(), k = P.findIndex((y) => y.id === id), V = vergeben(), ep = V ? (L.vergabe.preise || {})[x.id] : null;
    const am = L.aufmass.filter((a) => a.pos_id === x.id).reduce((s, a) => s + (a.menge || 0), 0);
    const T = [['allgemein', 'Allgemein'], ['weiteres', 'Weiteres'], ['menge', 'Menge'], ['grafik', 'Grafik']];
    let h = '';
    if (tabE === 'allgemein') h = `<div class="fm">
      <label>OZ</label><input value="${esc(x.oz)}" disabled>
      <label>Kurztext</label><input data-e="kurz" value="${esc(x.kurz)}">
      <label>Langtext</label><textarea data-e="lang" rows="8">${esc(x.lang || '')}</textarea>
      <label>Einheit</label><input data-e="einheit" value="${esc(x.einheit || '')}" data-vs="eh" autocomplete="off" style="max-width:8rem">
      <label>EP Schätzung</label><input class="n" data-e="ep_s" value="${x.ep_s != null ? nf2(x.ep_s) : ''}" inputmode="decimal" style="max-width:10rem">
      ${V ? `<label>EP Auftrag</label><input class="n" value="${ep != null ? nf2(ep) : ''}" disabled style="max-width:10rem">` : ''}</div>`;
    else if (tabE === 'weiteres') h = `<div class="fm">
      <label>Kostengruppen</label><table class="eigkg"><thead><tr><th>Kostenberechnung</th><th>Kostengruppe</th></tr></thead><tbody>
        <tr><td>DIN 276 (2018-12)</td><td><input data-e="kg" value="${esc(x.kg || '')}" inputmode="numeric" placeholder="z. B. 331"></td></tr>
        <tr><td>DIN 276 (1981)</td><td><input data-e="kg81" value="${esc(x.kg81 || '')}" inputmode="numeric"></td></tr>
        <tr><td>Leistungsbereiche</td><td><input data-e="lb" value="${esc(x.lb || '')}" list="lbList" placeholder="z. B. 012 Mauerarbeiten"></td></tr></tbody></table>
      <label>Positionsart</label><select data-e="pa"><option value="N"${['N', 'E'].includes(x.art) ? ' selected' : ''}>Position</option><option value="P"${x.art === 'P' ? ' selected' : ''}>Pauschalposition</option><option value="A"${x.art === 'A' ? ' selected' : ''}>Wahlposition (Alternative)</option><option value="T"${x.art === 'T' && !x.vb ? ' selected' : ''}>Hinweistext</option><option value="V"${x.art === 'T' && x.vb ? ' selected' : ''}>Vorbemerkung</option></select>
      <label></label><div class="eiggrid">
        ${cb('nt', 'Die Position ist eine Nachtragsposition', !!x.nt)}<span></span>
        ${cb('bed', 'Die Position ist eine Bedarfsposition', x.art === 'E', !['N', 'E'].includes(x.art))}${cb('gb', 'Mit Gesamtpreis', !!x.gb, x.art !== 'E', 'Bedarfsposition zählt in die Summe')}
        ${cb('entf', 'Position entfällt', !!x.entf)}${cb('sp', 'Schwerpunktposition', !!x.sp, false, 'besonders wichtige Position (im Ausdruck mit [S])')}</div>
      <label>Bezug auf Position</label><select data-e="bezug"><option value="">–</option>${P.filter((y) => y.id !== x.id).map((y) => `<option value="${y.id}"${x.bezug === y.id ? ' selected' : ''}>${esc(y.oz)} ${esc((y.kurz || '').slice(0, 60))}</option>`).join('')}</select>
      <label>Quellverweis</label><input value="${esc(x.quelle || '')}" disabled placeholder="z. B. aus Kostenermittlung oder GAEB">
      <label>Druckoptionen</label><div class="eiggrid">${cb('np_vor', 'Neue Seite vorher', !!x.np_vor)}${cb('np_nach', 'Neue Seite nachher', !!x.np_nach)}</div></div>`;
    else if (tabE === 'menge') h = `<div class="fm">
      <label>LV-Menge</label><div style="display:flex;gap:.4rem;align-items:center"><input class="n" data-e="menge" value="${nf(x.menge)}" inputmode="decimal" style="max-width:9rem"><span>${esc(x.einheit || '')}</span></div>
      <label>Rechenweg</label><div style="display:flex;gap:.4rem"><input data-e="mf" value="${esc(x.mf || '')}" placeholder="z. B. 2 × 12,40 × 2,75 – 3 × 1,01 × 2,13" style="flex:1"><button class="btn sm" data-m="mf">= übernehmen</button></div>
      <label>Aufmaß</label><div>${am ? `${nf(am)} ${esc(x.einheit || '')} aufgemessen · ${x.menge ? Math.round(am / x.menge * 100) + ' % der LV-Menge' : ''}` : '<span class="hint">noch kein Aufmaß</span>'}</div></div>`;
    else h = `<div class="fm"><label>Fotos und Skizzen</label><div>${fotoLeiste(x) || '<span class="hint">Noch keine Bilder – sie stehen im Ausdruck unter dem Langtext.</span>'}
      <div class="bar" style="margin:.5rem 0 0"><label class="btn sm">📷 Foto hinzufügen<input type="file" accept="image/*" multiple hidden data-foto="${x.id}"></label></div></div></div>`;
    box.innerHTML = `<h3 style="display:flex;gap:.5rem;align-items:baseline">Eigenschaften: Position <span class="hint">${esc(x.oz)} ${esc((x.kurz || '').slice(0, 50))}</span></h3>
      <div class="eigtabs">${T.map(([kk, l]) => `<button type="button" data-m="t:${kk}" class="${tabE === kk ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="eigbody">${h}</div>
      <div class="acts"><button class="btn sm" data-m="prev" ${k <= 0 ? 'disabled' : ''} title="vorherige Position (↑ oder Bild↑)" aria-label="vorherige Position">↑</button><button class="btn sm" data-m="next" ${k >= P.length - 1 ? 'disabled' : ''} title="nächste Position (↓ oder Bild↓) · Enter schließt, Esc auch" aria-label="nächste Position">↓</button>
        <button class="btn sm" data-m="neu" title="neue Position darunter">Neu</button><button class="btn sm" data-m="undo" ${snap[id] ? '' : 'disabled'}>Rückgängig</button><span style="flex:1"></span><button class="btn pri" data-m="x">Schließen</button></div>`;
  }
  const setz = (el) => {
    const x = X(); const e = el.dataset.e; if (!x || !e || e === 'mf') return;
    merk();
    const v = el.type === 'checkbox' ? el.checked : el.value;
    if (e === 'ep_s') x.ep_s = pf(v);
    else if (e === 'menge') { x.menge = pf(v) ?? 0; }
    else if (e === 'kg' || e === 'kg81') x[e] = String(v).replace(/\D/g, '').slice(0, 3);
    else if (e === 'pa') { if (v === 'V') { x.art = 'T'; x.vb = true; } else { x.art = v; delete x.vb; } if (v !== 'N') delete x.gb; }
    else if (e === 'bed') { if (['N', 'E'].includes(x.art)) x.art = v ? 'E' : 'N'; if (!v) delete x.gb; }
    else if (e === 'nt') { if (v) { x.nt = 'NT' + ntNr(); x.nt_status = 'angemeldet'; } else { delete x.nt; delete x.nt_status; delete x.nt_grund; } }
    else if (['gb', 'entf', 'sp', 'np_vor', 'np_nach'].includes(e)) { if (v) x[e] = true; else delete x[e]; }
    else if (e === 'bezug' || e === 'lb') { if (v) x[e] = v; else delete x[e]; }
    else x[e] = v;
    changed(['pa', 'bed', 'nt', 'gb', 'entf', 'sp'].includes(e) || el.type === 'checkbox' || el.tagName === 'SELECT');
    if (el.type === 'checkbox' || el.tagName === 'SELECT') draw();
  };
  window.eigNeu = draw;
  box.addEventListener('change', (e) => setz(e.target));
  box.addEventListener('input', (e) => { if (['kurz', 'lang', 'einheit', 'lb'].includes(e.target.dataset.e)) { const x = X(); merk(); x[e.target.dataset.e] = e.target.value; changed(); } });
  draw();
  { const md = bg.querySelector('.modal'); md.tabIndex = -1; md.focus({ preventScroll: true }); md.style.outline = 'none'; }   // Fokus aufs Fenster: ← → blättern sofort
}
document.addEventListener('dblclick', (e) => {   // Doppelklick auf eine Position öffnet ihre Eigenschaften, auf einen Titel die des Gliederungspunkts
  if (tab !== 'lv' || e.target.closest('textarea,select,.lang,.acts-c')) return;
  const tr = e.target.closest('tr[data-i]'); const x = tr && items()[+tr.dataset.i]; if (!x || (x.typ !== 'pos' && x.typ !== 'titel')) return;
  e.preventDefault(); if (window.getSelection) window.getSelection().removeAllRanges(); if (x.typ === 'titel') titelDialog(x.id); else eigDialog(x.id);
});
/* Eigenschaften eines Gliederungspunkts: Bezeichnung, Ebene, Nachtrag (Nummer, Stand, Grund – gilt für alle Positionen darunter) */
function titelDialog(id) {
  const x = items().find((y) => y.id === id); if (!x) return;
  const I = items(), i = I.indexOf(x), lv = x.lvl || 1; let e = i + 1; while (e < I.length && !(I[e].typ === 'titel' && (I[e].lvl || 1) <= lv)) e++;
  const nPos = I.slice(i + 1, e).filter((y) => y.typ === 'pos').length, nTi = I.slice(i + 1, e).filter((y) => y.typ === 'titel').length;
  const bg = modalBox(`<h3>Gliederungspunkt <span class="hint">· ${esc(x.oz || '')} · Ebene ${lv} · ${nPos} Position${nPos === 1 ? '' : 'en'}${nTi ? `, ${nTi} Untertitel` : ''}</span></h3><div class="fm">
      <label>Bezeichnung</label><input id="tiK" value="${esc(x.kurz || '')}" placeholder="z. B. Erdarbeiten">
      <label>Nachtrag</label><label class="chk"><input type="checkbox" id="tiNt"${x.nt ? ' checked' : ''}> Dieser Gliederungspunkt ist ein Nachtrag <span class="hint">– alle Positionen darunter gehören dazu</span></label>
      <label>Nummer</label><input id="tiNr" value="${esc(x.nt || '')}" placeholder="NT${ntNr()}" style="width:7rem"${x.nt ? '' : ' disabled'}>
      <label>Stand</label><select id="tiSt"${x.nt ? '' : ' disabled'}>${['angemeldet', 'beauftragt', 'abgelehnt'].map((s2) => `<option${(x.nt_status || 'angemeldet') === s2 ? ' selected' : ''}>${s2}</option>`).join('')}</select>
      <label>Grund / Bemerkung</label><input id="tiG" value="${esc(x.nt_grund || '')}" placeholder="z. B. geänderte Ausführung, Bauherrenwunsch"${x.nt ? '' : ' disabled'}></div>
    <p class="hint" style="margin:.6rem 0 0">Nachträge auf Gliederungsebene erscheinen unter Aufträge als ein Nachtrag mit allen Positionen; der Stand lässt sich dort für den ganzen Nachtrag oder je Position setzen.</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">OK</button></div>`, (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const q = (k) => bg.querySelector('#' + k);
    x.kurz = q('tiK').value.trim();
    if (q('tiNt').checked) {
      const nr = q('tiNr').value.trim() || 'NT' + ntNr();
      if (items().some((y) => y !== x && y.nt === nr && !y.nt_erbe && !(y.typ === 'pos' && I.indexOf(y) > i && I.indexOf(y) < e))) { toast(`Die Nummer „${nr}“ ist schon vergeben.`, true); return; }
      x.nt = nr; x.nt_status = q('tiSt').value; x.nt_grund = q('tiG').value.trim();
    } else { delete x.nt; delete x.nt_status; delete x.nt_grund; }
    ntErben(items()); HIST.next = `Gliederungspunkt ${x.oz || ''} ${x.kurz}`.trim(); close(); changed(true);
  });
  { const md = bg.querySelector('.modal'); md.classList.add('fest'); Object.assign(md.style, { width: '', height: '', maxHeight: '' }); }   // feste Größe, nur verschiebbar
  bg.querySelector('#tiNt').addEventListener('change', (ev) => { ['tiNr', 'tiSt', 'tiG'].forEach((k) => { bg.querySelector('#' + k).disabled = !ev.target.checked; }); if (ev.target.checked && !bg.querySelector('#tiNr').value) bg.querySelector('#tiNr').value = 'NT' + ntNr(); });
  bg.querySelector('#tiK').focus();
}
