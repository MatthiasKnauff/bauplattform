'use strict';
/* Baudaten – Suchen und Filtern wie in der Kopierquelle der Ausschreibung (besprochen am 13.11.2026, Mock „Baudaten-Suche“).
   Vor dem Skript der Seite geladen, gemeinsame Namen (F, S, L, LS, laden, seite, esc); die Seite ruft bdInit(), sobald F steht.
   Neubau · Altbau (Stichwörter der Positionen), Preis von–bis, Sortieren, aktive Filter als Chips, Suchwörter markiert, zuletzt gesuchte
   Begriffe. Die Leistungsbereiche und „★ oft geöffnet“ stehen seit 23.11.2026 im Baum (bp/baudatenbaum.js). Server: bpcore/baudaten.py (_wo, baum). */
function bdInit() { Object.assign(F, { bau: LS.get('bau', ''), ep_von: '', ep_bis: '', sort: '' }); }

/* zusätzliche Parameter für api/baum (params der Seite ruft das auf) */
function bdParams(p) {
  for (const k of ['bau', 'ep_von', 'ep_bis', 'sort']) if (F[k]) p.set(k, String(F[k]).replace(',', '.'));
}
/* Suchwörter in den Treffern markieren */
function bdMark(t) {
  const s = esc(t || ''), w = (F.q || '').split(/\s+/).filter((x) => x.length >= 2 && !/^[\d.]+$/.test(x)).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return w.length ? s.replace(new RegExp(`(${w.map((x) => esc(x)).join('|')})`, 'gi'), '<mark>$1</mark>') : s;
}
/* Leiste über dem Baum: Neubau · Altbau; darunter Preis, Sortieren, Chips */
function bdLeiste() {
  $('#bdBau').innerHTML = [['', 'Alle'], ['neubau', 'Neubau'], ['altbau', 'Altbau']].map(([k, t]) => `<button type="button" data-bau="${k}" class="${F.bau === k ? 'on' : ''}">${t}</button>`).join('');
  const C = [];
  if (F.q) C.push(['q', `„${F.q}“`]);
  if (F.bau) C.push(['bau', F.bau === 'altbau' ? 'Altbau' : 'Neubau']);
  if (F.kg) C.push(['kg', 'KG ' + F.kg]);
  if (F.einheit) C.push(['einheit', F.einheit]);
  if (F.genauigkeit) C.push(['genauigkeit', 'Genauigkeit ' + F.genauigkeit]);
  if (F.ep_von || F.ep_bis) C.push(['preis', `${F.ep_von || '0'}–${F.ep_bis || '…'} €`]);
  if (F.fav) C.push(['fav', '★ Favoriten']);
  $('#bdChips').innerHTML = C.map(([k, t]) => `<span class="chip">${esc(t)}<button type="button" data-chip="${k}" title="Filter entfernen" aria-label="Filter ${esc(t)} entfernen">✕</button></span>`).join('')
    + (C.length > 1 ? '<button type="button" class="chipx" data-chip="*">alle Filter zurücksetzen</button>' : '');
}
function bdFilterWeg(k) {
  const vor = { ...F };
  if (k === '*' || k === 'q') { F.q = ''; $('#q').value = ''; }
  if (k === '*' || k === 'bau') { F.bau = ''; LS.set('bau', ''); }
  if (k === '*' || k === 'kg') { F.kg = ''; $('#kg').value = ''; }
  if (k === '*' || k === 'einheit') { F.einheit = ''; $('#einh').value = ''; }
  if (k === '*' || k === 'genauigkeit') { F.genauigkeit = ''; $('#gen').value = ''; }
  if (k === '*' || k === 'preis') { F.ep_von = F.ep_bis = ''; $('#pVon').value = $('#pBis').value = ''; }
  if (k === '*' || k === 'fav') { if (F.fav) { F.fav = false; bdNav(); } }
  laden();
  rueckgaengig(k === '*' ? 'Filter zurückgesetzt' : 'Filter entfernt', () => {
    Object.assign(F, vor); $('#q').value = F.q; $('#kg').value = F.kg; $('#einh').value = F.einheit; $('#gen').value = F.genauigkeit; $('#pVon').value = F.ep_von; $('#pBis').value = F.ep_bis;
    LS.set('bau', F.bau); bdNav(); laden(); });
}
/* Zuletzt gesucht (je Browser) */
const bdZuletzt = () => LS.get('zuletzt', []);
function bdMerken(q) { if (!q || q.length < 3) return; LS.set('zuletzt', [q, ...bdZuletzt().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8)); }
function bdZuletztZeigen(an) {
  const box = $('#bdHist'), Z = bdZuletzt().filter((x) => !F.q || x.toLowerCase().includes(F.q.toLowerCase()) && x !== F.q);
  box.hidden = !an || !Z.length;
  if (!box.hidden) box.innerHTML = '<div class="h">zuletzt gesucht</div>' + Z.map((x) => `<button type="button" data-zul="${esc(x)}">${esc(x)}</button>`).join('');
}
document.addEventListener('click', (e) => {
  const t = e.target;
  const b = t.closest && t.closest('[data-bau]'); if (b) { F.bau = b.dataset.bau; LS.set('bau', F.bau); laden(); return; }
  const c = t.closest && t.closest('[data-chip]'); if (c) { bdFilterWeg(c.dataset.chip); return; }
  const z = t.closest && t.closest('[data-zul]'); if (z) { F.q = z.dataset.zul; $('#q').value = F.q; bdZuletztZeigen(false); laden(); return; }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'sSort') { F.sort = e.target.value; laden(); }
});
let BDT = 0;
document.addEventListener('input', (e) => {
  if (e.target.id === 'pVon' || e.target.id === 'pBis') { clearTimeout(BDT); BDT = setTimeout(() => { F.ep_von = $('#pVon').value.trim(); F.ep_bis = $('#pBis').value.trim(); laden(); }, 400); }
  if (e.target.id === 'q') bdZuletztZeigen(true);
});
document.addEventListener('focusin', (e) => { if (e.target.id === 'q') bdZuletztZeigen(true); });
document.addEventListener('focusout', (e) => { if (e.target.id === 'q') setTimeout(() => { bdZuletztZeigen(false); bdMerken(F.q); }, 200); });
document.addEventListener('keydown', (e) => { if (e.target.id === 'q' && e.key === 'Enter') { bdMerken(e.target.value.trim()); bdZuletztZeigen(false); } });
