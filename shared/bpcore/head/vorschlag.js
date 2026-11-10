/* Vorschlagsliste für Eingabefelder – gemeinsamer Baustein (/bp/vorschlag.js), ersetzt <datalist>.
   <input data-vs="eh"> → kleine Liste unter dem Feld (aufklappen per Klick oder Alt+↓, beim Tippen die passenden); ↑/↓ wählen, Enter/Klick übernimmt, Esc schließt.
   Listen: window.bpVorschlag.listen[name] = [{w:'m2', t:'Quadratmeter'}, …] oder Funktion(input) → Liste.
   Optional bpVorschlag.norm[name] = Funktion(wert) → vereinheitlichter Wert beim Verlassen des Feldes. */
(() => {
  if (window.bpVorschlag) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* GAEB-Mengeneinheiten (DA XML, Element QU, höchstens 4 Zeichen) – so wie STLB-Bau/ORCA sie schreiben */
  const GAEB = [
    ['m', 'Meter'], ['m2', 'Quadratmeter'], ['m3', 'Kubikmeter'], ['St', 'Stück'], ['psch', 'pauschal'],
    ['kg', 'Kilogramm'], ['t', 'Tonne'], ['l', 'Liter'], ['h', 'Stunde'], ['d', 'Tag'], ['Wo', 'Woche'], ['Mt', 'Monat'], ['Satz', 'Satz'],
  ].map(([w, t]) => ({ w, t }));
  const SYN = { 'm²': 'm2', qm: 'm2', 'm³': 'm3', cbm: 'm3', lfm: 'm', lfdm: 'm', mtr: 'm', st: 'St', stk: 'St', stck: 'St', 'stück': 'St', stueck: 'St',
    pausch: 'psch', pau: 'psch', psch: 'psch', pschl: 'psch', std: 'h', h: 'h', tag: 'd', tage: 'd', d: 'd', wo: 'Wo', woche: 'Wo', mon: 'Mt', monat: 'Mt', mt: 'Mt',
    to: 't', t: 't', kg: 'kg', ltr: 'l', l: 'l', satz: 'Satz', m: 'm', m2: 'm2', m3: 'm3' };
  const ehNorm = (v) => { const k = String(v || '').trim().replace(/\.$/, ''); return SYN[k.toLowerCase()] || k; };
  const V = window.bpVorschlag = { listen: { eh: GAEB }, norm: { eh: ehNorm }, GAEB, ehNorm };

  let POP = null, IN = null, SEL = -1, L = [];
  const zu = () => { if (POP) POP.remove(); POP = null; IN = null; SEL = -1; };
  function zeigen(inp, alle) {
    const n = inp.dataset.vs, q = alle ? '' : inp.value.trim().toLowerCase();
    let li = V.listen[n]; if (typeof li === 'function') li = li(inp); li = li || [];
    L = q ? li.filter((x) => x.w.toLowerCase().startsWith(q) || (x.t || '').toLowerCase().startsWith(q) || (V.norm[n] && V.norm[n](q) === x.w)) : li;
    if (q && L.length === 1 && L[0].w === inp.value.trim()) L = [];
    if (!L.length) { if (POP) POP.remove(); POP = null; return; }
    if (!POP) { POP = document.createElement('div'); POP.className = 'bp-vs'; POP.setAttribute('role', 'listbox'); document.body.appendChild(POP); }
    IN = inp; SEL = q ? 0 : L.findIndex((x) => x.w === inp.value.trim());
    POP.innerHTML = L.map((x, i) => `<div class="bp-vs-z${i === SEL ? ' an' : ''}" data-vsi="${i}" role="option"><b>${esc(x.w)}</b>${x.t ? `<span>${esc(x.t)}</span>` : ''}</div>`).join('');
    const r = inp.getBoundingClientRect(), h = POP.offsetHeight, w = POP.offsetWidth;
    const top = r.bottom + 2 + h > innerHeight - 6 ? r.top - h - 2 : r.bottom + 2;
    Object.assign(POP.style, { left: Math.max(4, Math.min(innerWidth - w - 4, r.left)) + 'px', top: Math.max(4, top) + 'px' });
    const a = POP.querySelector('.an'); if (a) a.scrollIntoView({ block: 'nearest' });
  }
  function nehmen(i) {
    const x = L[i], inp = IN; if (!x || !inp) return; zu();
    inp.value = x.w; STILL = true; try { inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); } finally { STILL = false; }
  }
  const ziel = (e) => e.target && e.target.matches && e.target.ownerDocument === document && e.target.matches('input[data-vs]') ? e.target : null;   // nicht in eigenen Fenstern (seite.js)
  /* die ganze Liste klappt nur mit der Maus auf (Klick ins Feld) oder mit Alt+↓ – wer mit Tab/Enter durch die Felder geht, bekommt
     keine Liste in den Weg; beim Tippen erscheinen die passenden Vorschläge wie bisher */
  let MAUS = null;
  document.addEventListener('pointerdown', (e) => { MAUS = { el: e.target, t: Date.now() }; }, true);
  const perMaus = (i) => MAUS && MAUS.el === i && Date.now() - MAUS.t < 1500;
  document.addEventListener('focusin', (e) => { const i = ziel(e); if (i) { if (perMaus(i)) zeigen(i, true); else if (POP) zu(); } else if (POP && !POP.contains(e.target)) zu(); });
  document.addEventListener('click', (e) => { const i = ziel(e); if (i && !POP && document.activeElement === i) zeigen(i, true); });
  let STILL = false;
  document.addEventListener('input', (e) => { const i = ziel(e); if (i && !STILL) zeigen(i, false); });
  document.addEventListener('focusout', (e) => { const i = ziel(e); if (i) setTimeout(() => { if (document.activeElement !== i && IN === i) zu(); }, 120); });
  /* vereinheitlichen, bevor die App den Wert speichert (Erfassungsphase läuft vor ihren change-Handlern) */
  document.addEventListener('change', (e) => { const i = ziel(e), f = i && V.norm[i.dataset.vs]; if (f) { const n = f(i.value); if (n !== i.value) i.value = n; } }, true);
  document.addEventListener('keydown', (e) => {
    if (!POP && e.altKey && e.key === 'ArrowDown') { const i = ziel(e); if (i) { e.preventDefault(); e.stopPropagation(); zeigen(i, true); } return; }
    if (!POP || e.target !== IN) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); SEL = (SEL + (e.key === 'ArrowDown' ? 1 : -1) + L.length) % L.length; zeigen0(); }
    else if (e.key === 'Enter' && SEL >= 0) { e.preventDefault(); e.stopPropagation(); nehmen(SEL); }
    else if (e.key === 'Escape') { e.stopPropagation(); zu(); }
  }, true);
  function zeigen0() { POP.querySelectorAll('.bp-vs-z').forEach((z, i) => z.classList.toggle('an', i === SEL)); const a = POP.querySelector('.an'); if (a) a.scrollIntoView({ block: 'nearest' }); }
  document.addEventListener('mousedown', (e) => {
    const z = e.target.closest && e.target.closest('.bp-vs-z'); if (z) { e.preventDefault(); nehmen(+z.dataset.vsi); return; }
    if (POP && !POP.contains(e.target) && e.target !== IN) zu();
  }, true);
  addEventListener('scroll', (e) => { if (POP && !POP.contains(e.target)) zu(); }, true);
})();
