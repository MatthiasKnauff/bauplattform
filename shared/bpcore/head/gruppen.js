/* Gruppieren-Leiste – gemeinsamer Baustein (/bp/gruppen.js, im Bündel; 21.11.2026, Mock „Bauteile wie der LV-Baum“ C1): die Ebenen einer
   Baumtabelle als Chips in ihrer Reihenfolge – außen vor innen. Ziehen ordnet um, ✕ nimmt eine Ebene weg, „＋“ fügt eine hinzu.
   bpGruppen.html(G, O, opt)   G = gewählte Schlüssel in Reihenfolge, O = { schlüssel: 'Name' } alle möglichen; opt.titel (Standard „Gruppieren:“),
                               opt.rechts = HTML rechts in der Leiste (z. B. Hinweis „Doppelklick: Eigenschaften“)
   bpGruppen.an(box, { lies: () => G, setze: (G) => … })   Klicks und Ziehen in box anmelden (einmal je box)
   Zuerst benutzt: Bauteile im Gebäudemodell (bp/bauteile.js). */
(() => {
  if (window.bpGruppen) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STIL = `.bp-grp{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .35rem;padding:.3rem .5rem;font-size:var(--fs-s,.84rem);border-bottom:1px solid var(--line,#d6dce3)}
.bp-grp-t{font-weight:600}.bp-grp-s{opacity:.55}.bp-grp-r{margin-left:auto;opacity:.7;font-size:.8rem}
.bp-grp-c{display:inline-flex;align-items:center;gap:.25rem;border:1px solid color-mix(in srgb,var(--y,#2f6fb3) 45%,transparent);background:color-mix(in srgb,var(--y,#2f6fb3) 10%,transparent);color:var(--y,#2f6fb3);border-radius:calc(999px*var(--rkp,1));padding:.05rem .25rem .05rem .55rem;font-weight:600;cursor:grab;user-select:none}
.bp-grp-c.zieht{opacity:.45}.bp-grp-c button{border:0;background:none;color:inherit;opacity:.65;cursor:pointer;font:inherit;padding:0 .2rem}.bp-grp-c button:hover{opacity:1}
.bp-grp-p{border:1px dashed var(--line,#c9ced4);background:none;color:var(--mute,#5d6b7a);border-radius:calc(999px*var(--rkp,1));padding:.05rem .55rem;cursor:pointer;font:inherit}`;
  function stil(d) { if (!d.getElementById('bp-grp-stil')) { const s = d.createElement('style'); s.id = 'bp-grp-stil'; s.textContent = STIL; d.head.appendChild(s); } }
  function html(G, O, opt = {}) {
    const rest = Object.keys(O).filter((k) => !G.includes(k));
    return `<div class="bp-grp" data-bpgrp><span class="bp-grp-t">${esc(opt.titel || 'Gruppieren:')}</span>${G.length ? G.map((k, i) => `${i ? '<span class="bp-grp-s">›</span>' : ''}<span class="bp-grp-c" draggable="true" data-bpgk="${esc(k)}" title="Ziehen ordnet um">${esc(O[k] || k)}<button type="button" data-bpgweg="${esc(k)}" aria-label="${esc(O[k] || k)} entfernen" title="Ebene entfernen">✕</button></span>`).join('') : '<span class="bp-grp-s">ohne Gruppen</span>'}`
      + (rest.length ? `<button type="button" class="bp-grp-p" data-bpgplus title="Ebene hinzufügen">＋ ${esc(rest.map((k) => O[k]).join(' · '))}</button>` : '')
      + (opt.rechts ? `<span class="bp-grp-r">${opt.rechts}</span>` : '') + '</div>';
  }
  function an(box, o) {
    stil(box.ownerDocument || document);
    if (box._bpGrp) { box._bpGrp = o; return; }
    box._bpGrp = o;
    const O = () => box._bpGrp;
    box.addEventListener('click', (e) => {
      const w = e.target.closest('[data-bpgweg]'); if (w && box.contains(w)) { e.stopPropagation(); return O().setze(O().lies().filter((k) => k !== w.dataset.bpgweg)); }
      const p = e.target.closest('[data-bpgplus]'); if (!p || !box.contains(p)) return;
      e.stopPropagation();
      const G = O().lies(), N = O().namen || {}, rest = Object.keys(N).filter((k) => !G.includes(k));
      if (rest.length === 1 || typeof window.pickMenu !== 'function') return O().setze([...G, rest[0]]);
      window.pickMenu(p, { items: rest.map((k) => ({ value: k, title: N[k] })), onPick: (k) => O().setze([...G, k]) });
    });
    let von = null;
    box.addEventListener('dragstart', (e) => { const c = e.target.closest && e.target.closest('[data-bpgk]'); if (!c) return; von = c.dataset.bpgk; c.classList.add('zieht'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', von); } catch { /* egal */ } });
    box.addEventListener('dragover', (e) => { if (von && e.target.closest && e.target.closest('[data-bpgk]')) e.preventDefault(); });
    box.addEventListener('dragend', () => { von = null; box.querySelectorAll('.zieht').forEach((x) => x.classList.remove('zieht')); });
    box.addEventListener('drop', (e) => {
      const c = e.target.closest && e.target.closest('[data-bpgk]'); if (!von || !c) return; e.preventDefault();
      const G = O().lies().filter((k) => k !== von), i = G.indexOf(c.dataset.bpgk), r = c.getBoundingClientRect(), nach = e.clientX > r.left + r.width / 2;
      G.splice(i < 0 ? G.length : i + (nach ? 1 : 0), 0, von); von = null; O().setze(G);
    });
  }
  window.bpGruppen = { html, an };
})();
