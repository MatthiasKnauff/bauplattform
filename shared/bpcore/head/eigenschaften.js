'use strict';
/* Eigenschaften-Fenster – EIN Baustein für alle Apps (Mock „Eigenschaften-Fenster“ EF-D1, 21.11.2026): freies Fenster (bpFrei aus seite.js:
   verschieben, Größe ziehen, Lage je Person gemerkt) mit grauem Kopf (Titel, ↑ ↓ blättern, ✕), Reitern, Inhalt und – wo gewünscht – einer Liste
   unten und einer Fußzeile. FESTE Größe: ein anderer Reiter ändert nichts an der Größe, Längeres rollt im Inhalt.

   bpEigen({ key, titel, reiter: [[id, titel]], an, blaettern: true, unten: true, fuss: html, aktion(m, f, zu, knopf), reiterWechsel(id), zu(),
             start: { w, h }, doc }) → { f, body, unten, fuss, titel(t), reiter(liste, an), zu(), vorn() }
   Ein Fenster je key: ein zweiter Aufruf mit demselben key gibt das offene Fenster zurück (Inhalt zeichnet die App neu).
   Klicks auf [data-m] gehen an aktion(m …) – „x“ schließt; Reiter [data-eigt] an reiterWechsel. Tastatur im Fenster: Esc schließt,
   ↑ ↓ (nicht in Feldern), Bild↑/Bild↓ und Alt + ← → blättern, wenn blaettern an ist (aktion('prev'|'next')).
   Benutzt: Bauteile (bp/bauteile.js – mit Liste unten), Ausschreibung (Eigenschaften einer Position – ohne Liste, EF-D1). */
(() => {
  const OFFEN = new Map();   // key → Fenster
  const STIL = `.bp-eig{font-size:var(--fs,.9rem)}.bp-eig .bp-eigk{display:flex;align-items:center;gap:.3rem;padding:.35rem .45rem .35rem .75rem;cursor:move;border-bottom:1px solid var(--line,#d5d9de);background:var(--tabs,#eef1f5);touch-action:none}
.bp-eig .bp-eigk b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bp-eig .bp-eigk button{all:unset;box-sizing:border-box;cursor:pointer;min-width:1.7rem;text-align:center;padding:.05rem .4rem;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));background:var(--card,#fff);color:var(--mute,#6b7380);line-height:1.35}
.bp-eig .bp-eigk button:hover:not([disabled]){color:var(--ink,#1f2630);border-color:var(--y,#3b5a8f)}.bp-eig .bp-eigk button[disabled]{opacity:.4;cursor:default}
.bp-eig .bp-eigt{display:flex;gap:.2rem;padding:.35rem .6rem 0;border-bottom:1px solid var(--line,#d5d9de);flex:none}
.bp-eig .bp-eigt button{border:1px solid var(--line,#d5d9de);border-bottom:0;background:var(--tabs,#eef1f5);padding:.3rem .85rem;border-radius:calc(6px*var(--rk,1)) calc(6px*var(--rk,1)) 0 0;font:inherit;cursor:pointer;color:var(--mute,#6b7380)}
.bp-eig .bp-eigt button.on{background:var(--card,#fff);color:var(--ink,#1f2630);font-weight:600;margin-bottom:-1px;padding-bottom:calc(.3rem + 1px)}
.bp-eig .bp-eigb{flex:1;min-height:0;overflow:auto;padding:.6rem .75rem}
.bp-eig .bp-eigu{flex:0 0 38%;min-height:0;overflow:auto;border-top:1px solid var(--line,#d5d9de);background:color-mix(in srgb,var(--tabs,#eef1f5) 45%,var(--card,#fff));padding:.45rem .75rem}
.bp-eig .bp-eigf{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;padding:.4rem .6rem;border-top:1px solid var(--line,#d5d9de);background:var(--tabs,#eef1f5);flex:none}`;
  const stil = (d) => { if (d.getElementById('bp-eig-stil')) return; const s = d.createElement('style'); s.id = 'bp-eig-stil'; s.textContent = STIL; d.head.appendChild(s); };
  const esc = window.bpEsc;

  function bpEigen(o) {
    const da = OFFEN.get(o.key);
    if (da && da.f.isConnected) { da.o = o; da.titel(o.titel); if (o.reiter) da.reiter(o.reiter, o.an); da.vorn(); return da; }
    const D = o.doc || document; stil(D);
    const f = D.createElement('div'); f.className = 'sr-flo bp-eig' + (o.klasse ? ' ' + o.klasse : ''); f.setAttribute('role', 'dialog'); f.tabIndex = -1;
    f.innerHTML = `<div class="bp-eigk"><b></b>${o.blaettern ? '<button type="button" data-m="prev" title="vorheriger Eintrag (↑ oder Bild↑)" aria-label="vorheriger">↑</button><button type="button" data-m="next" title="nächster Eintrag (↓ oder Bild↓)" aria-label="nächster">↓</button>' : ''}<button type="button" data-m="x" title="Schließen (Esc)" aria-label="Schließen">✕</button></div>`
      + '<div class="bp-eigt" role="tablist" hidden></div><div class="bp-eigb"></div>' + (o.unten ? '<div class="bp-eigu"></div>' : '') + (o.fuss != null ? `<div class="bp-eigf">${o.fuss}</div>` : '');
    D.body.appendChild(f);
    const E = { o, f, body: f.querySelector('.bp-eigb'), unten: f.querySelector('.bp-eigu'), fuss: f.querySelector('.bp-eigf') };
    E.titel = (t) => { const b = f.querySelector('.bp-eigk b'); b.textContent = t || 'Eigenschaften'; f.setAttribute('aria-label', b.textContent); };
    E.reiter = (L, an) => { const t = f.querySelector('.bp-eigt'); t.hidden = !(L && L.length);
      t.innerHTML = (L || []).map(([id, n]) => `<button type="button" role="tab" data-eigt="${esc(id)}" class="${id === an ? 'on' : ''}" aria-selected="${id === an}">${esc(n)}</button>`).join(''); };
    E.vorn = () => { D.querySelectorAll('.sr-flo').forEach((x) => x.classList.toggle('vorn', x === f)); };
    let los = null;
    E.zu = () => { if (!f.isConnected) return; if (los) los(); f.remove(); OFFEN.delete(o.key); D.removeEventListener('keydown', taste, true); if (E.o.zu) E.o.zu(); };
    E.titel(o.titel); if (o.reiter) E.reiter(o.reiter, o.an);
    const W = D.defaultView || window;
    if (W.bpFrei) los = W.bpFrei(f, { key: 'eig.' + o.key, start: { x: Math.max(16, Math.round(W.innerWidth * 0.3)), y: 96, w: (o.start && o.start.w) || 640, h: Math.min((o.start && o.start.h) || 720, W.innerHeight - 130) }, griff: '.bp-eigk' });
    else Object.assign(f.style, { left: '20%', top: '80px', width: '640px', height: '70vh' });
    f.addEventListener('click', (e) => {
      const t = e.target.closest('[data-eigt]'); if (t && f.contains(t)) { f.querySelectorAll('[data-eigt]').forEach((x) => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); }); if (E.o.reiterWechsel) E.o.reiterWechsel(t.dataset.eigt); return; }
      const b = e.target.closest('[data-m]'); if (!b || !f.contains(b) || b.disabled) return;
      if (b.dataset.m === 'x' && !E.o.aktion) return E.zu();
      if (E.o.aktion) E.o.aktion(b.dataset.m, f, E.zu, b); else if (b.dataset.m === 'x') E.zu();
    });
    function taste(e) {
      if (!f.isConnected || !f.contains(e.target) && e.target !== f) return;
      if (D.querySelector('.bph-frage, .modal-bg')) return;   // eine Rückfrage darüber hat Vorrang
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const x = f.querySelector('.bp-eigk [data-m="x"]'); x.click(); return; }
      if (!o.blaettern) return;
      const feld = e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]');
      const vor = e.key === 'PageUp' || (e.key === 'ArrowLeft' && e.altKey) || (e.key === 'ArrowUp' && !feld),
        nach = e.key === 'PageDown' || (e.key === 'ArrowRight' && e.altKey) || (e.key === 'ArrowDown' && !feld);
      if (!vor && !nach) return;
      const b = f.querySelector(`.bp-eigk [data-m="${vor ? 'prev' : 'next'}"]`); if (!b || b.disabled) return;
      e.preventDefault(); e.stopPropagation(); b.click();
    }
    D.addEventListener('keydown', taste, true);
    OFFEN.set(o.key, E); E.vorn();
    return E;
  }
  bpEigen.offen = (key) => { const E = OFFEN.get(key); return E && E.f.isConnected ? E : null; };
  window.bpEigen = bpEigen;
})();
