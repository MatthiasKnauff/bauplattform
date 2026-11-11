/* =====================================================================
   Live-Aktualisierung – Änderungen anderer erscheinen ohne Neuladen (Server: bpcore/live.py, Trigger in Migration 0046).
     BPHead.live(tabellen, fn, opt)   fn(ereignisse) wird gerufen, wenn jemand anderes in diesen Tabellen etwas geändert hat
       tabellen   ['reports','items'] oder '*'
       opt.projekt  true (Vorgabe): nur Änderungen im aktuellen Projekt (und solche ohne Projekt); false: alle
       opt.ruhig    true (Vorgabe): warten, solange jemand gerade in ein Feld tippt oder ein Dialog offen ist
   Gefragt wird alle 10 Sekunden, solange das Fenster sichtbar ist (sofort beim Zurückkehren in den Tab).
   Was neu geladen wurde, meldet eine kleine Notiz unten („Aktualisiert – Anna hat geändert“ ohne Namen: „von anderen“).
   ===================================================================== */
(function los() {
  if (!window.BPHead) { setTimeout(los, 50); return; }
  const H = window.BPHead;
  if (H.live && !H._liveQ) return;
  const Q = H._liveQ || []; delete H._liveQ;
  const ABOS = [];
  let seit = 0, tm = 0, laeuft = false;
  const tippt = () => { const a = document.activeElement; return !!(a && (a.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !/^(button|checkbox|radio|range|submit)$/i.test(a.type || '')))); };
  const dialogOffen = () => !!document.querySelector('.bph-dlg-bg,.modal-bg,.bph-gv,.sheet:not(.hidden)');
  const aktuell = () => (H.projektId ? H.projektId() : null);
  function verteilen(ev) {
    ABOS.forEach((a) => {
      const E = ev.filter((e) => (a.t === '*' || a.t.includes(e.t)) && (a.o.projekt === false || e.p == null || !aktuell() || e.p === aktuell()));
      if (!E.length) return;
      a.offen = (a.offen || []).concat(E);
      if (a.o.ruhig !== false && (tippt() || dialogOffen())) return;   // später, wenn niemand tippt
      const x = a.offen; a.offen = [];
      try { a.fn(x); } catch (er) { console.warn('live', er); }
    });
  }
  async function frage() {
    if (laeuft || document.visibilityState !== 'visible' || !ABOS.length) return;
    laeuft = true;
    try {
      const r = await fetch('api/bp/live' + (seit ? '?seit=' + seit : ''), { credentials: 'same-origin', cache: 'no-store' });
      if (r.ok) { const d = await r.json(); const erst = !seit; seit = d.seit || seit; if (!erst && d.ev && d.ev.length) verteilen(d.ev); }
    } catch { /* offline: beim nächsten Mal */ }
    laeuft = false;
    ABOS.forEach((a) => { if (a.offen && a.offen.length && !(a.o.ruhig !== false && (tippt() || dialogOffen()))) { const x = a.offen; a.offen = []; try { a.fn(x); } catch (er) { console.warn('live', er); } } });
  }
  function starten() { if (tm) return; tm = setInterval(frage, 10000); frage(); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') frage(); });
  H.live = (tabellen, fn, opt = {}) => { ABOS.push({ t: tabellen === '*' ? '*' : [].concat(tabellen), fn, o: opt }); starten(); };
  Q.forEach((a) => H.live(...a));
  /* kleine Notiz unten links, verschwindet von selbst */
  H.liveNotiz = (text) => {
    let el = document.querySelector('.bph-live'); if (!el) { el = document.createElement('div'); el.className = 'bph-live'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = '⟳ ' + (text || 'Aktualisiert – Änderungen von anderen'); el.classList.add('an'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('an'), 3500);
  };
  const st = document.createElement('style');
  st.textContent = `.bph-live{position:fixed;left:50%;margin-left:-8rem;width:16rem;text-align:center;bottom:calc(.8rem + env(safe-area-inset-bottom,0px));z-index:880;background:rgba(28,28,26,.85);color:#fff;font:13px/1.3 system-ui,sans-serif;border-radius:calc(999px*var(--rkp,1));padding:.35rem .8rem;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none}
  .bph-live.an{opacity:1;transform:none}`;
  document.head.appendChild(st);
})();
