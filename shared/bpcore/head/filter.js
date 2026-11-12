/* Suchfeld mit Filtern – gemeinsamer Baustein (/bp/filter.js). Statt Auswahllisten und Filterknöpfen: beim Tippen Vorschläge
   nach Art (Firma, Projekt, Status …) aus den Daten selbst, mit Anzahl; ein Vorschlag wird zum Filter, freier Text bleibt Volltextsuche.
   Ein Filter je Art mit beliebig vielen Werten; innerhalb und zwischen den Filtern ODER/UND per Klick auf das Wort, ein Klick auf
   einen Wert dreht ihn zu NICHT; ✕ entfernt Wert bzw. ganzen Filter. Senkrecht gedacht (Navigation links), jede Art in eigener Farbe.

   const F = bpFilter({ key, arten, items, text, aendern, start })
     key     Name zum Merken im Browser (localStorage bp.filter.<key>)
     arten   [{ key, name, farbe, werte: (item) => ['Wert', …] }]   farbe: CSS-Farbe der Art
     items   () => Liste der Einträge (für Vorschläge und Anzahl)
     text    (item) => Text für die Volltextsuche
     aendern () => …   nach jeder Änderung (die App zeichnet die Liste neu)
     start   [{ art, werte: ['…'] }]   Filter beim ersten Öffnen (ohne gemerkten Stand)
   F.el                      das Feld (einhängen, wo es stehen soll – z. B. bpNav davor/nachher: F.einhaengen(platz))
   F.pruefe(item) → bool     passt der Eintrag?
   F.wert(art) → 'Wert'|''   der eine Wert einer Art (ohne NICHT), sonst ''
   F.setzen(art, wert) · F.weg(art) · F.leeren()
   F.satz() → Text der ganzen Bedingung */
(() => {
  if (window.bpFilter) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const klein = (s) => String(s == null ? '' : s).toLocaleLowerCase('de');
  const css = document.createElement('style');
  css.textContent = `.bpf{position:relative;display:flex;flex-direction:column;gap:.3rem;margin:.1rem 0 .5rem}
.bpf-in{width:100%;box-sizing:border-box;font:inherit;font-size:.9rem;padding:.4rem .6rem;border:1px solid var(--line);border-radius:calc(9px*var(--rk,1));background:var(--inp,var(--card));color:var(--ink)}
.bpf-in:focus{outline:2px solid var(--y);outline-offset:0;border-color:transparent}
.bpf-g{border:1px solid color-mix(in srgb,var(--f) 45%,transparent);background:color-mix(in srgb,var(--f) 12%,var(--card));border-radius:calc(10px*var(--rk,1));padding:.25rem .35rem .35rem}
.bpf-k{display:flex;align-items:center;font-size:.72rem;color:var(--mute);letter-spacing:.03em}.bpf-k span{flex:1}
.bpf-w{display:flex;flex-wrap:wrap;gap:.2rem;align-items:center}
.bpf-v{display:inline-flex;align-items:center;gap:.2rem;background:var(--card);border:1px solid color-mix(in srgb,var(--f) 35%,transparent);border-radius:calc(999px*var(--rkp,1));padding:.05rem .1rem .05rem .5rem;font-size:.84rem;cursor:pointer;max-width:100%}
.bpf-v>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bpf-v.nicht{color:var(--red)}.bpf-v.nicht>span{text-decoration:line-through}
.bpf-x{border:0;background:none;color:var(--mute);cursor:pointer;font-size:.72rem;width:1.15rem;height:1.15rem;border-radius:50%;padding:0;flex:none}.bpf-x:hover{background:var(--red);color:#fff}
.bpf-op{border:0;background:none;font:inherit;font-size:.68rem;font-weight:700;letter-spacing:.04em;color:var(--f,var(--mute));cursor:pointer;padding:0 .15rem}
.bpf-zw{text-align:left;padding-left:.6rem}.bpf-satz{font-size:.74rem;color:var(--mute);line-height:1.35}
.bpf-pop{position:absolute;left:0;top:2.3rem;z-index:40;min-width:100%;width:max-content;max-width:min(360px,90vw);background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:calc(10px*var(--rk,1));box-shadow:var(--sh0,0 10px 28px rgba(0,0,0,.18));padding:.25rem;max-height:60vh;overflow:auto}
.bpf-pop h5{margin:.35rem .45rem .1rem;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);display:flex;align-items:center;gap:.35rem}.bpf-pop h5 i{width:.6rem;height:.6rem;border-radius:50%;background:var(--f)}
.bpf-pop div{display:flex;gap:.6rem;padding:.3rem .45rem;border-radius:7px;cursor:pointer;font-size:.88rem}.bpf-pop div small{margin-left:auto;color:var(--mute)}.bpf-pop div.an{background:var(--hov)}
.bpf-pop mark{background:color-mix(in srgb,var(--y) 35%,transparent);color:inherit;border-radius:2px}`;
  document.head.appendChild(css);

  window.bpFilter = function (o) {
    const LK = 'bp.filter.' + o.key, A = Object.fromEntries(o.arten.map((a) => [a.key, a]));
    let S = null;
    try { S = JSON.parse(localStorage.getItem(LK) || 'null'); } catch { S = null; }
    if (!S || !Array.isArray(S.g)) S = { g: (o.start || []).map((x) => ({ art: x.art, op: 'oder', w: x.werte.map((w) => ({ w, n: false })) })), zw: [], q: '' };
    S.g = S.g.filter((g) => A[g.art] && g.w.length);
    const el = document.createElement('div'); el.className = 'bpf';
    let POP = null, VL = [], SEL = 0;
    const merken = () => { try { localStorage.setItem(LK, JSON.stringify(S)); } catch { /* egal */ } };
    const geaendert = () => { merken(); zeichnen(); if (o.aendern) o.aendern(); };
    const zw = (i) => S.zw[i] || 'und';
    const OPW = { und: 'UND', oder: 'ODER' };
    function satz() {
      const T = S.g.map((g, i) => { const t = g.w.map((v) => (v.n ? 'NICHT ' : '') + v.w).join(' ' + OPW[g.op] + ' ');
        return (i ? OPW[zw(i - 1)] + ' ' : '') + (g.w.length > 1 ? '(' + t + ')' : t); });
      const q = S.q.trim(); if (q) T.push((T.length ? 'UND ' : '') + 'Text „' + q + '“');
      return T.join(' ');
    }
    function zeichnen() {
      const fokus = document.activeElement && document.activeElement.classList.contains('bpf-in'), inp = el.querySelector('.bpf-in'), pos = inp ? inp.selectionStart : null;
      el.innerHTML = `<input class="bpf-in" type="search" autocomplete="off" placeholder="Suchen und filtern …" aria-label="Suchen und filtern" value="${esc(S.q)}">`
        + S.g.map((g, i) => `${i ? `<button type="button" class="bpf-op bpf-zw" data-bpf-zw="${i - 1}" title="Verknüpfung der Filter – Klick: UND ↔ ODER">${OPW[zw(i - 1)]}</button>` : ''}<div class="bpf-g" style="--f:${A[g.art].farbe || 'var(--mute)'}">
          <div class="bpf-k"><span>${esc(A[g.art].name)}</span><button type="button" class="bpf-x" data-bpf-gx="${i}" title="Filter „${esc(A[g.art].name)}“ entfernen" aria-label="Filter entfernen">✕</button></div>
          <div class="bpf-w">${g.w.map((v, k) => `${k ? `<button type="button" class="bpf-op" data-bpf-op="${i}" title="Verknüpfung innerhalb – Klick: ODER ↔ UND">${OPW[g.op]}</button>` : ''}<span class="bpf-v${v.n ? ' nicht' : ''}" data-bpf-n="${i}:${k}" title="${v.n ? 'NICHT – Klick: wieder normal' : 'Klick: NICHT (ausschließen)'}"><span>${esc(v.w)}</span><button type="button" class="bpf-x" data-bpf-vx="${i}:${k}" aria-label="Wert entfernen">✕</button></span>`).join('')}</div></div>`).join('')
        + (S.g.length || S.q.trim() ? `<div class="bpf-satz">${esc(satz())}</div>` : '');
      if (fokus) { const n = el.querySelector('.bpf-in'); n.focus(); if (pos != null) n.setSelectionRange(pos, pos); }
    }
    function pruefe(it) {
      let erg = null;
      S.g.forEach((g, i) => {
        const W = (A[g.art].werte(it) || []).map(klein);
        const r = g.w.map((v) => W.includes(klein(v.w)) !== v.n);
        const x = g.op === 'und' ? r.every(Boolean) : r.some(Boolean);
        erg = erg === null ? x : zw(i - 1) === 'oder' ? erg || x : erg && x;
      });
      if (erg === false) return false;
      const q = S.q.trim(); if (!q) return true;
      const t = klein(o.text ? o.text(it) : '');
      return q.split(/\s+/).every((w) => (w.startsWith('-') && w.length > 1 ? !t.includes(klein(w.slice(1))) : t.includes(klein(w))));
    }
    function dazu(art, w, n) {
      let g = S.g.find((x) => x.art === art);
      if (!g) { g = { art, op: 'oder', w: [] }; S.g.push(g); }
      if (!g.w.some((v) => klein(v.w) === klein(w))) g.w.push({ w, n: !!n });
      S.q = ''; zu(); geaendert();
    }
    function vorschlaege() {
      const roh = S.q.trim(), nicht = roh.startsWith('-'), q = klein(nicht ? roh.slice(1) : roh);
      if (!q) return zu();
      const I = o.items() || [];
      VL = [];
      let h = '';
      o.arten.forEach((a) => {
        const z = new Map();
        I.forEach((it) => [...new Set(a.werte(it) || [])].forEach((w) => { if (w && klein(w).includes(q)) z.set(w, (z.get(w) || 0) + 1); }));
        const L = [...z.entries()].sort((x, y) => (klein(x[0]).startsWith(q) ? 0 : 1) - (klein(y[0]).startsWith(q) ? 0 : 1) || y[1] - x[1]).slice(0, 6);
        if (!L.length) return;
        h += `<h5 style="--f:${a.farbe || 'var(--mute)'}"><i></i>${esc(a.name)}</h5>` + L.map(([w, n]) => {
          VL.push({ art: a.key, w, n: nicht }); const i = klein(w).indexOf(q);
          return `<div data-bpf-i="${VL.length - 1}">${nicht ? '<b style="color:var(--red)">NICHT</b> ' : ''}<span>${esc(w.slice(0, i))}<mark>${esc(w.slice(i, i + q.length))}</mark>${esc(w.slice(i + q.length))}</span><small>${n}</small></div>`; }).join('');
      });
      VL.push({ text: true });
      h += `<h5><i style="background:var(--mute)"></i>Text</h5><div data-bpf-i="${VL.length - 1}">„${esc(roh)}“ im Text suchen<small>Enter</small></div>`;
      if (!POP) { POP = document.createElement('div'); POP.className = 'bpf-pop'; POP.setAttribute('role', 'listbox'); el.appendChild(POP); }
      SEL = 0; POP.innerHTML = h; markiere();
    }
    const markiere = () => { if (POP) POP.querySelectorAll('[data-bpf-i]').forEach((d) => d.classList.toggle('an', +d.dataset.bpfI === SEL)); };
    const zu = () => { if (POP) POP.remove(); POP = null; VL = []; };
    const nimm = (i) => { const v = VL[i]; if (!v) return; if (v.text) { zu(); return; } dazu(v.art, v.w, v.n); };

    el.addEventListener('input', (e) => { if (!e.target.classList.contains('bpf-in')) return; S.q = e.target.value; merken(); vorschlaege(); clearTimeout(el._t); el._t = setTimeout(() => { if (o.aendern) o.aendern(); const s = el.querySelector('.bpf-satz'); if (s) s.textContent = satz(); }, 250); });
    el.addEventListener('keydown', (e) => {
      if (!e.target.classList.contains('bpf-in')) return;
      if (e.key === 'ArrowDown' && POP) { e.preventDefault(); SEL = Math.min(VL.length - 1, SEL + 1); markiere(); }
      else if (e.key === 'ArrowUp' && POP) { e.preventDefault(); SEL = Math.max(0, SEL - 1); markiere(); }
      else if (e.key === 'Enter' && POP) { e.preventDefault(); nimm(SEL); }
      else if (e.key === 'Escape') { zu(); }
      else if (e.key === 'Backspace' && !e.target.value && S.g.length) { const g = S.g[S.g.length - 1]; g.w.pop(); if (!g.w.length) { S.g.pop(); S.zw.splice(S.g.length - 1, 1); } geaendert(); }
    });
    el.addEventListener('mousedown', (e) => { if (e.target.closest('[data-bpf-i]')) e.preventDefault(); });   // Klick in die Liste: Feld behält den Fokus
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-bpf-i],[data-bpf-gx],[data-bpf-vx],[data-bpf-op],[data-bpf-zw],[data-bpf-n]'); if (!t) return;
      e.stopPropagation();
      const d = t.dataset;
      if (d.bpfI != null) return nimm(+d.bpfI);
      if (d.bpfGx != null) { const i = +d.bpfGx; S.g.splice(i, 1); S.zw.splice(Math.max(0, i - 1), 1); return geaendert(); }
      if (d.bpfVx != null) { const [i, k] = d.bpfVx.split(':').map(Number); S.g[i].w.splice(k, 1); if (!S.g[i].w.length) { S.g.splice(i, 1); S.zw.splice(Math.max(0, i - 1), 1); } return geaendert(); }
      if (d.bpfOp != null) { const g = S.g[+d.bpfOp]; g.op = g.op === 'oder' ? 'und' : 'oder'; return geaendert(); }
      if (d.bpfZw != null) { S.zw[+d.bpfZw] = zw(+d.bpfZw) === 'und' ? 'oder' : 'und'; return geaendert(); }
      if (d.bpfN != null) { const [i, k] = d.bpfN.split(':').map(Number); S.g[i].w[k].n = !S.g[i].w[k].n; return geaendert(); }
    });
    el.addEventListener('focusout', () => setTimeout(() => { if (!el.contains(document.activeElement)) zu(); }, 150));
    zeichnen();
    return {
      el, pruefe, satz,
      einhaengen(platz) { if (!platz || el.parentElement === platz) return; const f = el.contains(document.activeElement); platz.appendChild(el); if (f) { const n = el.querySelector('.bpf-in'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); } },
      wert(art) { const g = S.g.find((x) => x.art === art); return g && g.w.length === 1 && !g.w[0].n ? g.w[0].w : ''; },
      setzen(art, w) { const g = S.g.find((x) => x.art === art); if (g) g.w = [{ w, n: false }]; else S.g.push({ art, op: 'oder', w: [{ w, n: false }] }); geaendert(); },
      weg(art) { const i = S.g.findIndex((x) => x.art === art); if (i < 0) return; S.g.splice(i, 1); S.zw.splice(Math.max(0, i - 1), 1); geaendert(); },
      leeren() { S = { g: [], zw: [], q: '' }; geaendert(); },
    };
  };
})();
