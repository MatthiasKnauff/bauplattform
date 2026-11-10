/* Spalten wählen und ordnen – gemeinsamer Baustein (/bp/spalten.js) für jede Tabelle.
   <table data-sp="schluessel"> → rechte Maustaste auf den Spaltenkopf (oder ein Knopf mit data-spw="schluessel") öffnet das
   Spalten-Menü: Häkchen = sichtbar, ⋮⋮ ziehen = Reihenfolge, „Standard“ setzt zurück. Die erste Spalte bleibt immer vorn.
   Gemerkt je Benutzer im Browser (bp.sp.<schluessel>). Tabellen werden nach jedem Neuzeichnen selbst erkannt.
   Nach einer Änderung: Ereignis „bp-spalten“ am <table> (detail: {key}) – z. B. um gemerkte Spaltenbreiten zu verwerfen. */
(() => {
  if (window.bpSpalten) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lies = (k) => { try { return JSON.parse(localStorage.getItem('bp.sp.' + k) || '{}') || {}; } catch { return {}; } };
  const merk = (k, v) => { try { localStorage.setItem('bp.sp.' + k, JSON.stringify(v)); } catch { /* egal */ } };
  const kopf = (t) => t.tHead && t.tHead.rows[0];
  const anzahl = (t) => { const k = kopf(t); return k ? k.cells.length : 0; };
  function zustand(t) {
    const N = t._spN || anzahl(t), z = lies(t.dataset.sp), aus = new Set((z.aus || []).filter((n) => n > 0 && n < N));
    const ord = (z.ord || []).filter((n, i, a) => n > 0 && n < N && a.indexOf(n) === i); for (let n = 1; n < N; n++) if (!ord.includes(n)) ord.push(n);
    return { N, aus, ord: [0, ...ord] };
  }
  /* Zeile auf N Zellen bringen: leere Zellen über mehrere Spalten (colspan) in einzelne Zellen teilen – sonst lässt sie sich nicht ordnen */
  function regulaer(tr, N) {
    const c = [...tr.cells]; if (c.length === N) return true;
    if (c.reduce((a, x) => a + (x.colSpan || 1), 0) !== N || c.some((x) => x.colSpan > 1 && x.textContent.trim())) return false;
    c.forEach((x) => { const k = x.colSpan; if (k > 1) { x.colSpan = 1; for (let i = 1; i < k; i++) x.after(document.createElement(x.tagName)); } });
    return tr.cells.length === N;
  }
  function anwenden(t) {
    const k = kopf(t); if (!k) return;
    if (!t._spN) { t._spN = k.cells.length; t._spNamen = [...k.cells].map((th) => (th.dataset.spname || th.textContent || '').trim()); }
    const { N, aus, ord } = zustand(t);
    [...t.rows].forEach((tr) => {
      if (!tr._sp) { if (!regulaer(tr, N)) { tr._sp = -1; return; } [...tr.cells].forEach((td, n) => { td.dataset.spn = n; }); tr._sp = 1; }   // -1: lässt sich nicht ordnen – nicht bei jedem Durchlauf neu versuchen
      if (tr._sp < 0) return;
      const c = {}; [...tr.cells].forEach((td) => { c[td.dataset.spn] = td; });
      /* Zellen nur anfassen, wenn sie falsch stehen: jedes Umhängen ist eine Änderung am Dokument – stünde die Zelle gerade unter der
         gedrückten Maustaste, ginge der Klick verloren (und der Beobachter unten liefe im Kreis) */
      let i = 0; ord.forEach((n) => { const td = c[n]; if (!td) return; if (tr.cells[i] !== td) tr.insertBefore(td, tr.cells[i] || null); i++; if (td.classList.contains('bp-sp-aus') !== aus.has(n)) td.classList.toggle('bp-sp-aus', aus.has(n)); });
    });
    t._spStand = localStorage.getItem('bp.sp.' + t.dataset.sp) || '';
  }
  function setzen(t, z) { merk(t.dataset.sp, { aus: [...z.aus], ord: z.ord.slice(1) }); anwenden(t); t.dispatchEvent(new CustomEvent('bp-spalten', { bubbles: true, detail: { key: t.dataset.sp } })); }
  function menue(t, x, y) {
    document.querySelectorAll('.bp-spm').forEach((m) => m.remove());
    const m = document.createElement('div'); m.className = 'bp-spm'; m.setAttribute('role', 'menu');
    const zeichne = () => { const z = zustand(t); m.innerHTML = `<div class="bp-spm-k"><b>Spalten</b><button type="button" class="bp-spm-x" data-spx title="Schließen">✕</button></div>${z.ord.slice(1).map((n) => (t._spNamen[n] ? `<label class="bp-spm-z" draggable="true" data-spn="${n}"><span class="g" title="ziehen: Reihenfolge">⋮⋮</span><input type="checkbox" class="bp-chk-alt" data-spc="${n}"${z.aus.has(n) ? '' : ' checked'}><span>${esc(t._spNamen[n])}</span></label>` : '')).join('')}<div class="bp-spm-f"><button type="button" data-spstd>Standard</button></div>`; };
    zeichne(); document.body.appendChild(m);
    const b = m.getBoundingClientRect(); m.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, x)) + 'px'; m.style.top = Math.max(8, Math.min(innerHeight - b.height - 8, y)) + 'px';
    const zu = () => { m.remove(); document.removeEventListener('pointerdown', aussen, true); document.removeEventListener('keydown', taste); };
    const aussen = (e) => { if (!m.contains(e.target)) zu(); }, taste = (e) => { if (e.key === 'Escape') zu(); };
    setTimeout(() => { document.addEventListener('pointerdown', aussen, true); document.addEventListener('keydown', taste); }, 0);
    m.addEventListener('click', (e) => { if (e.target.closest('[data-spx]')) zu(); if (e.target.closest('[data-spstd]')) { merk(t.dataset.sp, {}); anwenden(t); t.dispatchEvent(new CustomEvent('bp-spalten', { bubbles: true, detail: { key: t.dataset.sp } })); zeichne(); } });
    m.addEventListener('change', (e) => { const c = e.target.closest('[data-spc]'); if (!c) return; const z = zustand(t), n = +c.dataset.spc; if (c.checked) z.aus.delete(n); else z.aus.add(n); setzen(t, z); });
    let zn = null;
    m.addEventListener('dragstart', (e) => { const r = e.target.closest('[data-spn]'); if (!r) return; zn = +r.dataset.spn; r.classList.add('zieh'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'sp' + zn); } catch { /* egal */ } });
    m.addEventListener('dragover', (e) => { const r = e.target.closest('[data-spn]'); if (!r || zn == null) return; e.preventDefault(); const q = r.getBoundingClientRect(), un = e.clientY > q.top + q.height / 2; m.querySelectorAll('[data-spn]').forEach((o) => o.classList.remove('vor', 'nach')); r.classList.add(un ? 'nach' : 'vor'); });
    m.addEventListener('drop', (e) => { const r = e.target.closest('[data-spn]'); if (!r || zn == null) return; e.preventDefault(); const q = r.getBoundingClientRect(), un = e.clientY > q.top + q.height / 2, ziel = +r.dataset.spn, z = zustand(t);
      if (ziel !== zn) { const o = z.ord.slice(1).filter((n) => n !== zn); o.splice(o.indexOf(ziel) + (un ? 1 : 0), 0, zn); z.ord = [0, ...o]; setzen(t, z); } zn = null; zeichne(); });
    m.addEventListener('dragend', () => { zn = null; m.querySelectorAll('[data-spn]').forEach((o) => o.classList.remove('vor', 'nach', 'zieh')); });
  }
  addEventListener('contextmenu', (e) => {   // rechte Maustaste auf einen Spaltenkopf (wie in Excel und im Explorer)
    const th = e.target.closest && e.target.closest('table[data-sp] thead th'); if (!th || e.shiftKey || th.ownerDocument !== document) return;
    e.preventDefault(); e.stopImmediatePropagation(); menue(th.closest('table'), e.clientX, e.clientY);
  }, true);
  document.addEventListener('click', (e) => {
    const k = e.target.closest && e.target.closest('[data-spw]'); if (!k) return;
    const t = document.querySelector(`table[data-sp="${CSS.escape(k.dataset.spw)}"]`); if (!t) return;
    e.stopPropagation(); const r = k.getBoundingClientRect(); menue(t, r.left, r.bottom + 4);
  });
  /* neu gezeichnete Tabellen selbst erkennen (auch neue Zeilen in einer schon geordneten Tabelle) */
  let warte = 0;
  const alle = () => { warte = 0; document.querySelectorAll('table[data-sp]').forEach((t) => { if (!t._spN || [...t.rows].some((tr) => !tr._sp && tr.cells.length > 1)) anwenden(t); }); };
  try { new MutationObserver(() => { if (!warte) warte = requestAnimationFrame(alle); }).observe(document.documentElement, { childList: true, subtree: true }); } catch { /* egal */ }
  window.bpSpalten = { anwenden, menue, zustand };
})();
