'use strict';
/* Baudaten – Suchen und Filtern wie in der Kopierquelle der Ausschreibung (besprochen am 13.11.2026, Mock „Baudaten-Suche“).
   Vor dem Skript der Seite geladen, gemeinsame Namen (F, S, L, LS, laden, seite, esc); die Seite ruft bdInit(), sobald F steht.
   Neu: Suche „in: alle Bereiche / nur …“, Neubau · Altbau (Stichwörter der Positionen), Preis von–bis, Sortieren, aktive Filter als Chips,
   Suchwörter markiert, Leistungsbereich suchen, „★ oft geöffnet“, zuletzt gesuchte Begriffe. Server: bpcore/baudaten.py (_wo, suche). */
function bdInit() { Object.assign(F, { bau: LS.get('bau', ''), ep_von: '', ep_bis: '', sort: '', ueberall: false }); }
let BDLB = '';   // Filter über den Leistungsbereichen

/* zusätzliche Parameter für api/suche (params der Seite ruft das auf) */
function bdParams(p) {
  for (const k of ['bau', 'ep_von', 'ep_bis', 'sort']) if (F[k]) p.set(k, String(F[k]).replace(',', '.'));
  if (F.q && F.ueberall) { p.delete('lb'); p.delete('gruppe'); }   // Suche über alle Bereiche
}
/* Suchwörter in den Treffern markieren */
function bdMark(t) {
  const s = esc(t || ''), w = (F.q || '').split(/\s+/).filter((x) => x.length >= 2 && !/^[\d.]+$/.test(x)).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return w.length ? s.replace(new RegExp(`(${w.map((x) => esc(x)).join('|')})`, 'gi'), '<mark>$1</mark>') : s;
}
/* Leiste über der Liste: Bereich der Suche, Neubau · Altbau; darunter Preis, Sortieren, Chips */
function bdLeiste() {
  const lb = F.lb && (S.lbs.find((l) => l.nr === F.lb) || {}), gr = F.gruppe && ((typeof GR !== 'undefined' && GR[F.lb]) || []).find((g) => g.nr === F.gruppe);
  const wo = gr ? `${F.gruppe} ${gr.name || ''}` : lb ? `${lb.nr} ${lb.name || ''}` : '';
  $('#bdIn').innerHTML = wo ? `<select id="sIn" title="Wo gesucht wird"><option value="nur"${F.ueberall ? '' : ' selected'}>in: nur ${esc(wo.length > 34 ? wo.slice(0, 33) + '…' : wo)}</option><option value="alle"${F.ueberall ? ' selected' : ''}>in: allen Bereichen</option></select>` : '';
  $('#bdBau').innerHTML = [['', 'Alle'], ['neubau', 'Neubau'], ['altbau', 'Altbau']].map(([k, t]) => `<button type="button" data-bau="${k}" class="${F.bau === k ? 'on' : ''}">${t}</button>`).join('');
  const C = [];
  if (F.q) C.push(['q', `„${F.q}“`]);
  if (F.q && F.ueberall && wo) C.push(['ueberall', 'alle Bereiche']);
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
  if (k === '*' || k === 'ueberall') F.ueberall = false;
  if (k === '*' || k === 'bau') { F.bau = ''; LS.set('bau', ''); }
  if (k === '*' || k === 'kg') { F.kg = ''; $('#kg').value = ''; }
  if (k === '*' || k === 'einheit') { F.einheit = ''; $('#einh').value = ''; }
  if (k === '*' || k === 'genauigkeit') { F.genauigkeit = ''; $('#gen').value = ''; }
  if (k === '*' || k === 'preis') { F.ep_von = F.ep_bis = ''; $('#pVon').value = $('#pBis').value = ''; }
  if (k === '*' || k === 'fav') { if (F.fav) { F.fav = false; bdNav(); } }
  N = 100; laden();
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
/* Leistungsbereiche: Suchfeld und „★ oft geöffnet“ über der Liste (seite() ruft das) */
const bdHaeufig = () => (LS.get('lbHaeufig', {})[F.katalog] || {});
function bdLbZaehlen(nr) { if (!nr) return; const A = LS.get('lbHaeufig', {}), H = A[F.katalog] || (A[F.katalog] = {}); H[nr] = (H[nr] || 0) + 1; LS.set('lbHaeufig', A); }
function bdSeiteKopf() {
  const H = bdHaeufig(), top = Object.entries(H).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nr]) => S.lbs.find((l) => l.nr === nr)).filter(Boolean);
  return `<div class="lbq"><input type="search" id="lbQ" placeholder="Leistungsbereich suchen … z. B. Dach" value="${esc(BDLB)}" autocomplete="off" aria-label="Leistungsbereich suchen"></div>`
    + (top.length && !BDLB ? `<div class="lbfav"><span>★ oft geöffnet</span>${top.map((l) => `<button type="button" data-lb="${esc(l.nr)}" title="${esc(l.nr + ' ' + (l.name || ''))}">${esc(l.nr)} ${esc((l.name || '').length > 16 ? l.name.slice(0, 15) + '…' : l.name || '')}</button>`).join('')}</div>` : '');
}
const bdLbPasst = (l) => !BDLB || BDLB.toLowerCase().split(/\s+/).every((w) => `${l.nr} ${l.name || ''}`.toLowerCase().includes(w));

document.addEventListener('click', (e) => {
  const t = e.target;
  const b = t.closest && t.closest('[data-bau]'); if (b) { F.bau = b.dataset.bau; LS.set('bau', F.bau); N = 100; laden(); return; }
  const c = t.closest && t.closest('[data-chip]'); if (c) { bdFilterWeg(c.dataset.chip); return; }
  const z = t.closest && t.closest('[data-zul]'); if (z) { F.q = z.dataset.zul; $('#q').value = F.q; bdZuletztZeigen(false); N = 100; laden(); return; }
  const lb = t.closest && t.closest('#side [data-lb]'); if (lb) bdLbZaehlen(lb.dataset.lb);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'sIn') { F.ueberall = e.target.value === 'alle'; N = 100; laden(); }
  if (e.target.id === 'sSort') { F.sort = e.target.value; N = 100; laden(); }
});
let BDT = 0;
document.addEventListener('input', (e) => {
  if (e.target.id === 'pVon' || e.target.id === 'pBis') { clearTimeout(BDT); BDT = setTimeout(() => { F.ep_von = $('#pVon').value.trim(); F.ep_bis = $('#pBis').value.trim(); N = 100; laden(); }, 400); }
  if (e.target.id === 'lbQ') { BDLB = e.target.value.trim(); const pos = e.target.selectionStart; seite(); const i = $('#lbQ'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }
  if (e.target.id === 'q') bdZuletztZeigen(true);
});
document.addEventListener('focusin', (e) => { if (e.target.id === 'q') bdZuletztZeigen(true); });
document.addEventListener('focusout', (e) => { if (e.target.id === 'q') setTimeout(() => { bdZuletztZeigen(false); bdMerken(F.q); }, 200); });
document.addEventListener('keydown', (e) => { if (e.target.id === 'q' && e.key === 'Enter') { bdMerken(e.target.value.trim()); bdZuletztZeigen(false); } });
