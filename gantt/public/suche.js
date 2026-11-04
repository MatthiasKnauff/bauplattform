'use strict';
/* =====================================================================
   Suche im Bauzeitenplan (rechts in der Reiterleiste)
   Sucht in Bezeichnung, Gewerk, Unternehmer und Notizen. Treffer werden in der Tabelle markiert,
   Enter / › springt zum nächsten (zugeklappte Gruppen gehen auf), Umschalt+Enter / ‹ zurück, Esc leert.
   Strg+F setzt den Cursor ins Suchfeld.
   ===================================================================== */
(function () {
  const tabs = document.getElementById('tabs'); if (!tabs) return;
  const box = document.createElement('div'); box.className = 'gs-box';
  box.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>
    <input type="search" id="gsQ" placeholder="Im Plan suchen – Leistung, Gewerk, Firma" aria-label="Im Bauzeitenplan suchen" autocomplete="off">
    <span class="gs-n" id="gsN"></span><button type="button" data-gs="-1" title="Vorheriger Treffer (Umschalt+Enter)" aria-label="Vorheriger Treffer">‹</button><button type="button" data-gs="1" title="Nächster Treffer (Enter)" aria-label="Nächster Treffer">›</button>`;
  tabs.appendChild(box);
  const q = box.querySelector('#gsQ'), nEl = box.querySelector('#gsN');
  let hits = [], pos = -1;

  const norm = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  function suchen() {
    const w = norm(q.value).trim().split(/\s+/).filter(Boolean);
    hits = [];
    if (w.length && typeof P !== 'undefined' && P) P.tasks.forEach((t, i) => { const h = norm([t.name, t.gw, t.res, t.notes].join(' ')); if (w.every((x) => h.includes(x))) hits.push(t.uid); });
    pos = -1; markieren(); zahl();
  }
  function zahl() {
    const v = q.value.trim();
    nEl.textContent = !v ? '' : hits.length ? `${pos >= 0 ? pos + 1 : '–'} / ${hits.length}` : 'keine';
    box.classList.toggle('none', !!v && !hits.length);
  }
  function markieren() {
    if (typeof gridBody === 'undefined' || !gridBody || typeof P === 'undefined' || !P) return;
    const H = new Set(hits);
    gridBody.querySelectorAll('.row').forEach((row) => { const i = vis[+row.dataset.r]; row.classList.toggle('gs-hit', i != null && H.has(P.tasks[i] && P.tasks[i].uid)); });
  }
  function springen(dir) {
    if (!hits.length) { if (q.value.trim()) toast('Nichts gefunden.'); return; }
    pos = (pos + dir + hits.length) % hits.length;
    const uid = hits[pos], T = P.tasks, i = T.findIndex((t) => t.uid === uid); if (i < 0) return;
    // zugeklappte übergeordnete Gruppen öffnen
    let lvl = T[i].lvl, auf = false;
    for (let j = i - 1; j >= 0 && lvl > 0; j--) if (T[j].lvl < lvl) { if (T[j].collapsed) { T[j].collapsed = false; auf = true; } lvl = T[j].lvl; }
    if (auf) { render(); if (typeof queueSave === 'function') queueSave(); }
    if (typeof selectTaskIdx === 'function') selectTaskIdx(i);
    render();
    const r = vis.indexOf(i); if (r >= 0 && typeof ensureVisible === 'function') ensureVisible(r);
    if (typeof scrollToTask === 'function') scrollToTask();
    zahl();
  }
  q.addEventListener('input', suchen);
  q.addEventListener('keydown', (e) => {
    e.stopPropagation();   // Tastenkürzel des Plans nicht auslösen
    if (e.key === 'Enter') { e.preventDefault(); springen(e.shiftKey ? -1 : 1); }
    if (e.key === 'Escape') { q.value = ''; suchen(); q.blur(); }
  });
  box.addEventListener('click', (e) => { const b = e.target.closest('[data-gs]'); if (b) springen(+b.dataset.gs); });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && !document.querySelector('.modal-bg') && typeof P !== 'undefined' && P) { e.preventDefault(); q.focus(); q.select(); }
  }, true);
  // nach jedem Neuzeichnen Treffer wieder markieren (Plan gewechselt → neu suchen)
  if (typeof window.render === 'function') {
    const orig = window.render; let pid = null;
    window.render = function () { const r = orig.apply(this, arguments); try { if (P && P.id !== pid) { pid = P.id; if (q.value) suchen(); } else markieren(); } catch { /* egal */ } return r; };
  }
})();
