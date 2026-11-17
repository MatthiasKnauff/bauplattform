/* Bauplattform – zu schmale Reiter- und Menüleisten (GO 17.11.2026), ein Baustein für alle Apps.
   Gilt von selbst für jede Leiste mit role="tablist", class="tabs" oder data-bpleiste (abschalten: data-bpleiste="aus").
   Passt eine Leiste nicht mehr in ihre Breite: 1. die Reiter rücken enger zusammen, 2. die letzten wandern ins Pulldown „+n ▾“ –
   der gewählte Reiter bleibt immer sichtbar. Knöpfe ohne role="tab" neben Reitern (z. B. ⇱ ⧉ ✕ im Bereich rechts) bleiben stehen.
   Ein Punkt im Pulldown klickt den versteckten Reiter – die App braucht dafür nichts Eigenes. Die Befehlsleiste hat ihr eigenes „»“ (befehle.js). */
(() => {
  'use strict';
  if (window.bpLeiste) return;
  const SEL = '[role="tablist"],.tabs,[data-bpleiste]';
  const reg = new Set();
  const plan = new Set(); let raf = 0;
  const bald = (L) => { plan.add(L); if (!raf) raf = requestAnimationFrame(() => { raf = 0; const P = [...plan]; plan.clear(); P.forEach(pass); }); };
  const ro = new ResizeObserver((E) => E.forEach((e) => { const L = e.target, w = Math.round(e.contentRect.width); if (L._bplW === w) return; L._bplW = w; bald(L); }));

  const aktiv = (x) => x.classList.contains('on') || x.classList.contains('act') || x.classList.contains('active') || x.getAttribute('aria-selected') === 'true' || x.hasAttribute('aria-current');
  function eintraege(L) {
    const K = [...L.children].filter((x) => !x.classList.contains('bp-ul-mehr') && !x.hidden && !x.hasAttribute('data-bpl-fest'));
    const T = K.filter((x) => x.getAttribute('role') === 'tab');
    return T.length ? T : K.filter((x) => x.tagName === 'BUTTON' || x.tagName === 'A');
  }
  const name = (x) => (x.textContent || '').replace(/\s+/g, ' ').trim() || x.getAttribute('aria-label') || x.title || '…';

  function pass(L) {
    if (!L.isConnected) { weg(L); return; }
    const I = eintraege(L), m = L.querySelector(':scope>.bp-ul-mehr');
    I.forEach((x) => x.classList.remove('bp-ul-weg', 'bp-ul-eng'));
    if (m) m.hidden = true;
    const voll = () => L.scrollWidth > L.clientWidth + 1;
    if (I.length > 1 && voll()) {
      I.forEach((x) => x.classList.add('bp-ul-eng'));
      if (voll()) {
        let b = m;
        if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'bp-ul-mehr'; b.setAttribute('aria-haspopup', 'menu'); }
        const letzt = I[I.length - 1]; if (b.previousElementSibling !== letzt) letzt.after(b);
        b.hidden = false; let n = 0;
        for (let i = I.length - 1; i >= 0; i--) {
          if (aktiv(I[i])) continue;
          I[i].classList.add('bp-ul-weg'); n++; b.textContent = `+${n} ▾`;
          if (!voll()) break;
        }
        b.title = I.filter((x) => x.classList.contains('bp-ul-weg')).map(name).join(' · ');
      }
    }
    if (L._bplMo) L._bplMo.takeRecords();   // eigene Änderungen nicht wieder melden
  }

  function an(L) {
    if (reg.has(L) || L.getAttribute('data-bpleiste') === 'aus' || L.getAttribute('aria-orientation') === 'vertical') return;
    reg.add(L); ro.observe(L);
    L._bplMo = new MutationObserver(() => bald(L));
    L._bplMo.observe(L, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-selected'] });
    bald(L);
  }
  function weg(L) { reg.delete(L); ro.unobserve(L); if (L._bplMo) L._bplMo.disconnect(); }

  /* Pulldown */
  let offen = null;
  function zu() { if (!offen) return; offen.m.remove(); document.removeEventListener('pointerdown', offen.weg, true); document.removeEventListener('keydown', offen.esc, true); offen = null; }
  function auf(knopf) {
    zu();
    const L = knopf.parentElement, M = document.createElement('div');
    M.className = 'bp-ul-menue'; M.setAttribute('role', 'menu');
    const W = eintraege(L).filter((x) => x.classList.contains('bp-ul-weg'));
    W.forEach((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.dataset.bpl = i; b.textContent = name(x); M.appendChild(b); });
    document.body.appendChild(M);
    const r = knopf.getBoundingClientRect();
    M.style.top = Math.round(Math.min(r.bottom + 4, innerHeight - M.offsetHeight - 4)) + 'px';
    M.style.left = Math.round(Math.max(4, Math.min(r.right - M.offsetWidth, innerWidth - M.offsetWidth - 4))) + 'px';
    const o = { m: M, knopf,
      weg: (e) => { if (!M.contains(e.target) && !knopf.contains(e.target)) zu(); },
      esc: (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); zu(); knopf.focus(); } } };
    offen = o;
    document.addEventListener('pointerdown', o.weg, true); document.addEventListener('keydown', o.esc, true);
    M.addEventListener('click', (e) => { const b = e.target.closest('[data-bpl]'); if (!b) return; const ziel = W[+b.dataset.bpl]; zu(); if (ziel && ziel.isConnected) ziel.click(); });
    const f = M.querySelector('button'); if (f) f.focus();
  }
  // im Einfangen, damit die Klick-Verteiler der Apps den Knopf nie für einen Reiter halten
  document.addEventListener('click', (e) => {
    const k = e.target.closest && e.target.closest('.bp-ul-mehr'); if (!k) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (offen && offen.knopf === k) zu(); else auf(k);
  }, true);

  /* Leisten finden – beim Laden und wenn Seiten neue einsetzen */
  let such = 0;
  const suche = () => { such = 0; document.querySelectorAll(SEL).forEach(an); reg.forEach((L) => { if (!L.isConnected) weg(L); }); };
  const start = () => { suche(); new MutationObserver(() => { if (!such) such = requestAnimationFrame(suche); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  addEventListener('resize', zu);

  window.bpLeiste = { an, pass, auf };
})();
