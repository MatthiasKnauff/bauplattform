/* Navigation links – gemeinsamer Baustein (/bp/nav.js): Kopf (Projekt), Gruppen mit Bereichen, Fuß.
   bpNav(el, o)
     el        das Feld links (bekommt die Klasse bp-nav – oder steht in einem Element mit dieser Klasse)
     o.kopf    { titel, klein }                       z. B. Projektname und „16 LVs“
     o.davor   HTML direkt unter dem Kopf             z. B. die Versionswahl (wird von der App gefüllt)
     o.gruppen [{ titel, href, tip, punkte: [{ id, text, icon, zahl, zahlTip, unter }] }]
               href: die Gruppe ist ein Verweis in eine andere App (dann ohne Punkte, mit ↗)
               icon: Inhalt eines <svg viewBox="0 0 24 24"> (Pfade); unter: HTML unter dem gewählten Punkt (z. B. „＋ Neu“)
     o.aktiv   id des gewählten Punkts
     o.fuss    HTML am Ende                           z. B. Ablagefeld
     o.attr    Name des data-Attributs der Punkte     (Standard „nav“ → data-nav="id")
     o.wahl    (id, ereignis) => …                    Klick auf einen Punkt; ohne o.wahl meldet die App den Klick selbst am Attribut an
   Jeder Aufruf zeichnet neu; angemeldet wird der Klick nur einmal je Feld.

   bpNav.breite(el, { key, min = 180, max = 520 }) – Anfasser am rechten Rand: Breite ziehen, Doppelklick = Standard,
     gemerkt je Browser (bp.navw.<key>). Der Anfasser steht als eigenes Element direkt hinter el (übersteht das Neuzeichnen). */
(() => {
  if (window.bpNav) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function bpNav(el, o) {
    if (!el) return;
    const a = o.attr || 'nav';
    if (!el.closest('.bp-nav')) el.classList.add('bp-nav');   // steht das Feld schon in einer Navigation (mit Suche darüber), bekommt die den Rahmen
    el.innerHTML = (o.kopf ? `<div class="nk"><b>${esc(o.kopf.titel)}</b>${o.kopf.klein ? `<small>${esc(o.kopf.klein)}</small>` : ''}</div>` : '') + (o.davor || '')
      + (o.gruppen || []).map((g) => `<div class="ng">${g.href ? `<a class="nh" href="${esc(g.href)}"${g.tip ? ` title="${esc(g.tip)}"` : ''}>${esc(g.titel)} <span>↗</span></a>` : `<div class="nh">${esc(g.titel)}</div>`}${(g.punkte || []).map((p) => {
        const an = p.id === o.aktiv;
        return `<button type="button" class="ni${an ? ' on' : ''}" data-${a}="${esc(p.id)}"${an ? ' aria-current="page"' : ''}>${p.icon ? `<svg viewBox="0 0 24 24">${p.icon}</svg>` : ''}${esc(p.text)}${p.zahl ? `<small${p.zahlTip ? ` title="${esc(p.zahlTip)}"` : ''}>${esc(p.zahl)}</small>` : ''}</button>${an && p.unter ? p.unter : ''}`;
      }).join('')}</div>`).join('')
      + (o.fuss || '');
    el._bpNavWahl = o.wahl || null;
    if (!el._bpNavAn) {
      el._bpNavAn = 1;
      el.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.ni[data-' + a + ']'); if (b && el._bpNavWahl) el._bpNavWahl(b.getAttribute('data-' + a), e); });
    }
  }
  bpNav.breite = function (el, o) {
    if (!el || el._bpBreite) return; el._bpBreite = 1;
    const key = 'bp.navw.' + o.key, min = o.min || 180, max = o.max || 520;
    const setz = (w) => { el.style.width = w ? w + 'px' : ''; };
    try { const w = +localStorage.getItem(key); if (w) setz(Math.max(min, Math.min(max, w))); } catch { /* egal */ }
    const g = document.createElement('div'); g.className = 'bp-nav-griff'; g.title = 'Breite der Navigation ziehen (Doppelklick: Standard)'; g.setAttribute('aria-hidden', 'true');
    el.after(g);
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; e.preventDefault(); g.setPointerCapture(e.pointerId); document.body.classList.add('bph-trennzieh');
      const x0 = el.getBoundingClientRect().left;
      g.onpointermove = (m) => setz(Math.round(Math.max(min, Math.min(max, m.clientX - x0))));
      g.onpointerup = () => { g.onpointermove = g.onpointerup = null; document.body.classList.remove('bph-trennzieh');
        try { localStorage.setItem(key, String(el.offsetWidth)); } catch { /* egal */ } dispatchEvent(new Event('resize')); };
    });
    g.addEventListener('dblclick', () => { setz(0); try { localStorage.removeItem(key); } catch { /* egal */ } dispatchEvent(new Event('resize')); });
  };
  window.bpNav = bpNav;
})();
