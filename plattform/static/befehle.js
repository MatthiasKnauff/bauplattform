/* Befehlsleiste – derselbe Baustein für alle Bereiche (und später alle Apps).
   Gruppen mit kleiner Überschrift, Symbol über dem Text (wie das Menüband des Terminplans). Links das Fachliche des
   Bereichs (Neu · Bearbeiten · Ansicht …), rechts immer gleich: Datei · Verlauf · Löschen · Details · ⋯.
   Was gerade nicht geht, bleibt grau an seinem Platz (nichts springt). Wird es eng: erst die Texte unter den Symbolen
   weg, dann wandern die hinteren linken Gruppen in „»“ (aufklappen).

   befehle(el, gruppen)
     gruppen: [{ titel, rechts?, knoepfe?: [knopf], html? }]
     mitte:   Element (z. B. die Kennzahlen), das den freien Platz zwischen links und rechts füllt – es wird nur
              umgehängt (bleibt dasselbe Element mit seinen Handlern) und gibt als Erstes Platz ab, wenn es eng wird
     knopf:   { t: Text, ic?: SVG-Pfade oder Zeichen, attrs?: 'data-act="pos"' (die Aktion übernehmen die vorhandenen
                Klick-Handler), fn?: Funktion, aus?, an?, tip?, rot?, datei?: { accept, attrs } (Knopf öffnet eine Dateiauswahl) } */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FN = [];
  const icon = (ic) => !ic ? '' : /^</.test(ic) ? `<svg viewBox="0 0 24 24" aria-hidden="true">${ic}</svg>` : `<span class="bf-z" aria-hidden="true">${esc(ic)}</span>`;
  function knopf(k) {
    const kl = `bf-k${k.an ? ' on' : ''}${k.rot && !k.aus ? ' rot' : ''}`, tip = esc(k.tip || k.t), inner = `${icon(k.ic)}<span class="bf-t">${esc(k.t)}</span>`;
    if (k.datei) return `<label class="${kl}${k.aus ? ' aus' : ''}" title="${tip}">${inner}<input type="file" hidden accept="${esc(k.datei.accept || '')}" ${k.datei.attrs || ''}${k.aus ? ' disabled' : ''}></label>`;
    let a = k.attrs || '';
    if (k.fn) { FN.push(k.fn); a += ` data-bffn="${FN.length - 1}"`; }
    return `<button type="button" class="${kl}" ${a}${k.aus ? ' disabled' : ''} title="${tip}"${k.an != null ? ` aria-pressed="${!!k.an}"` : ''}>${inner}</button>`;
  }
  function befehle(el, gruppen, mitte) {
    if (!el) return;
    FN.length = 0;
    const G = (gruppen || []).filter((g) => g && (g.html || (g.knoepfe || []).some(Boolean)));
    const gr = (g, i) => `<div class="bf-g${g.rechts ? ' r' : ''}" data-bfg="${i}"><div class="bf-ks">${g.html || ''}${(g.knoepfe || []).filter(Boolean).map(knopf).join('')}</div>${g.titel ? `<div class="bf-gt">${esc(g.titel)}</div>` : ''}</div>`;
    const li = G.map((g, i) => [g, i]).filter(([g]) => !g.rechts), re = G.map((g, i) => [g, i]).filter(([g]) => g.rechts);
    el.innerHTML = `<div class="bf" role="toolbar">${li.map(([g, i]) => gr(g, i)).join('')}<button type="button" class="bf-mehr" hidden title="weitere Befehle" aria-haspopup="true">»</button><span class="bf-sp"></span><div class="bf-mitte"></div>${re.map(([g, i]) => gr(g, i)).join('')}<div class="bf-pop" hidden></div></div>`;
    const mi = el.querySelector('.bf-mitte');
    if (mitte) { mi.appendChild(mitte); el.querySelector('.bf-sp').remove(); } else mi.remove();
    passen(el);
    if (!el._ro) { let t = 0; el._bw = el.clientWidth; el._ro = new ResizeObserver(() => { if (el.clientWidth === el._bw) return; el._bw = el.clientWidth; clearTimeout(t); t = setTimeout(() => passen(el), 80); }); el._ro.observe(el); }   // nur auf die Breite reagieren – sonst schaukelt sich das Ein-/Ausblenden der Texte (Höhe) auf
  }
  function passen(el) {   // eng? erst Texte weg, dann linke Gruppen von hinten in „»“
    const bf = el.querySelector('.bf'); if (!bf) return;
    const mi = bf.querySelector('.bf-mitte'), K = mi && mi.firstElementChild ? [...mi.firstElementChild.children] : [];
    K.forEach((k) => k.classList.remove('bf-weg'));
    const pop = bf.querySelector('.bf-pop'), mehr = bf.querySelector('.bf-mehr');
    [...pop.children].forEach((g) => mehr.before(g));   // alles zurück an seinen Platz
    pop.hidden = true; mehr.hidden = true; bf.classList.remove('kompakt');
    const zuBreit = () => bf.scrollWidth > bf.clientWidth + 1;
    if (!zuBreit()) return mitteKuerzen(bf);
    bf.classList.add('kompakt'); if (!zuBreit()) return mitteKuerzen(bf);
    mehr.hidden = false;
    const L = [...bf.querySelectorAll(':scope > .bf-g:not(.r)')];
    for (let i = L.length - 1; i > 0 && zuBreit(); i--) pop.prepend(L[i]);
    mitteKuerzen(bf);
  }
  function mitteKuerzen(bf) {   // Kacheln in der Mitte, die nicht mehr ganz passen, ausblenden statt abschneiden
    const mi = bf.querySelector('.bf-mitte'); if (!mi || !mi.firstElementChild) return;
    const R = mi.getBoundingClientRect().right - 4;
    [...mi.firstElementChild.children].forEach((k) => { if (k.getBoundingClientRect().right > R) k.classList.add('bf-weg'); });
  }
  document.addEventListener('click', (e) => {
    const m = e.target.closest && e.target.closest('.bf-mehr');
    if (m) { const p = m.parentElement.querySelector('.bf-pop'); p.hidden = !p.hidden; if (!p.hidden) { const r = m.getBoundingClientRect(); Object.assign(p.style, { left: Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.left)) + 'px', top: (r.bottom + 4) + 'px' }); } return; }
    const f = e.target.closest && e.target.closest('[data-bffn]');
    if (f && !f.disabled) { const fn = FN[+f.dataset.bffn]; if (fn) fn(e); }
    document.querySelectorAll('.bf-pop:not([hidden])').forEach((p) => { if (!p.contains(e.target)) p.hidden = true; });
  });
  /* Mitte zu schmal (Kacheln ausgeblendet): beim Drüberfahren rollt darunter die ganze Reihe auf – zum Lesen, ohne Klick */
  let AUF = null, aufT = 0;
  const zu = () => { clearTimeout(aufT); aufT = setTimeout(() => { if (AUF) { AUF.remove(); AUF = null; } }, 220); };
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest && e.target.closest('.bf-mitte, .bf-auf'); if (!t) { if (AUF) zu(); return; }
    clearTimeout(aufT); if (t.classList.contains('bf-auf') || AUF) return;
    const q = t.firstElementChild; if (!q || !q.querySelector('.bf-weg')) return;   // alles sichtbar: nichts aufzurollen
    const r = t.getBoundingClientRect(), k = q.cloneNode(true); k.removeAttribute('id'); k.querySelectorAll('.bf-weg').forEach((x) => x.classList.remove('bf-weg'));
    AUF = document.createElement('div'); AUF.className = 'bf-auf'; AUF.appendChild(k); document.body.appendChild(AUF);
    Object.assign(AUF.style, { left: Math.max(8, r.left) + 'px', top: (r.bottom + 2) + 'px', maxWidth: Math.max(r.width, Math.min(innerWidth - r.left - 16, 640)) + 'px' });
  });
  window.befehle = befehle;
})();
