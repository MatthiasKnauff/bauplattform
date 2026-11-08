/* Menüband wie in Word: statt Scrollbalken passt es sich der Breite an.
   Stufe 1: Knöpfe ohne Beschriftung (nur Symbol, Text als Tooltip) · Stufe 2: Gruppen von rechts her zu einem Knopf mit Klappmenü.
   Die Reiterzeile kürzt ebenso: erst die Beschriftung der nicht gewählten Reiter, dann Export/Drucken nur als Symbol. */
(function () {
  const R = document.getElementById('ribbon'), T = document.getElementById('tabs'); if (!R) return;
  let busy = false;
  const zu = () => document.querySelectorAll('#ribbon .grp.auf').forEach((g) => g.classList.remove('auf'));
  function gruppenKnopf(g) {
    let k = g.querySelector(':scope > .gz'); if (k) return k;
    const ico = g.querySelector('.rb svg'), lbl = (g.querySelector('.gl') || {}).textContent || '';
    k = document.createElement('button'); k.type = 'button'; k.className = 'rb gz'; k.title = lbl;
    k.innerHTML = (ico ? ico.outerHTML : '') + `<span>${lbl.replace(/[<&]/g, '')} ▾</span>`;
    g.insertBefore(k, g.firstChild); return k;
  }
  function passt(el) { return el.scrollWidth <= el.clientWidth + 1; }
  function fit() {
    if (busy) return; busy = true;
    R.classList.remove('eng'); const G = [...R.querySelectorAll('.grp.show')]; G.forEach((g) => g.classList.remove('zu', 'kl'));
    for (let i = G.length - 1; i >= 0 && !passt(R); i--) G[i].classList.add('kl');   // von rechts: nur Symbole
    for (let i = G.length - 1; i >= 0 && !passt(R); i--) { gruppenKnopf(G[i]); G[i].classList.add('zu'); }   // dann: Gruppe als Klappknopf
    if (!passt(R)) R.classList.add('eng');
    if (T) { const K = ['k1', 'k2', 'k3', 'k4']; T.classList.remove(...K); for (const k of K) { if (passt(T)) break; T.classList.add(k); } }
    busy = false;
  }
  R.addEventListener('click', (e) => {
    const k = e.target.closest('.grp.zu > .gz'); if (!k) { if (e.target.closest('.grp.zu .btns [data-act]')) setTimeout(zu, 0); return; }
    const g = k.parentElement, auf = g.classList.contains('auf'); zu(); if (auf) return;
    g.classList.add('auf'); const r = k.getBoundingClientRect(), b = g.querySelector('.btns');
    b.style.background = getComputedStyle(R).backgroundColor; b.style.top = (r.bottom + 2) + 'px'; b.style.left = Math.max(6, Math.min(r.left, innerWidth - b.offsetWidth - 6)) + 'px';
  });
  document.addEventListener('mousedown', (e) => { if (!e.target.closest('#ribbon .grp.auf')) zu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
  window.addEventListener('resize', () => requestAnimationFrame(() => { zu(); fit(); }));
  let sig = '';   // nur neu einpassen, wenn ein anderer Reiter gezeigt wird oder Knöpfe dazukommen – nicht beim Auf-/Zuklappen
  new MutationObserver(() => { const n = [...R.querySelectorAll('.grp')].map((g) => (g.classList.contains('show') ? 1 : 0)).join('') + R.querySelectorAll('.rb').length + '/' + R.querySelectorAll('.rb svg').length + '/' + R.textContent.length; if (n !== sig) { sig = n; requestAnimationFrame(() => { zu(); fit(); }); } }).observe(R, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(fit)).observe(R);
  window.ribbonFit = fit; [300, 1200, 3000].forEach((t) => setTimeout(fit, t));
})();
