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

   o.lage    true = Lage wählbar (⇔): links · schmal (nur Symbole) · oben (Bereichszeile) · automatisch nach Fensterbreite;
               „oben“ setzt am Elternelement die Klasse bp-nav-oben-an (die App stellt dort z. B. von Zeile auf Spalte um);
               in „oben“ steht o.davor vorn links, und .nv-ende (rechts) kann die App in o.nachher füllen
     o.nachher (el, lage) => …                        nach jedem Zeichnen (z. B. Versionswahl in .nv-davor einhängen)

   bpNav.breite(el, { key, min = 180, max = 520 }) – Anfasser am rechten Rand: Breite ziehen, Doppelklick = Standard,
     gemerkt je Browser (bp.navw.<key>). Der Anfasser steht als eigenes Element direkt hinter el (übersteht das Neuzeichnen). */
(() => {
  if (window.bpNav) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* Lage der Navigation (o.lage = true): „links“ voll, „schmal“ nur Symbole, „oben“ als Bereichszeile, „auto“ nach Fensterbreite.
     Gewählt über ⇔ in der Navigation, gemerkt je Browser für alle Apps (bp.navlage). */
  const LAGEN = [['auto', 'Automatisch – nach Fensterbreite'], ['links', 'Links'], ['schmal', 'Schmal (nur Symbole)'], ['oben', 'Oben']];
  const lageGet = () => { try { const v = localStorage.getItem('bp.navlage'); return LAGEN.some((l) => l[0] === v) ? v : 'auto'; } catch { return 'auto'; } };
  const lageEff = () => { const l = lageGet(); return l !== 'auto' ? l : innerWidth >= 1600 ? 'links' : 'schmal'; };
  const ALLE = new Set();
  const svg = (p) => (p.icon ? `<svg viewBox="0 0 24 24">${p.icon}</svg>` : `<span class="nbu">${esc(String(p.text || '?').trim().charAt(0))}</span>`);
  const LAGEK = '<button type="button" class="nlage" title="Lage der Navigation: links · schmal · oben · automatisch" aria-label="Lage der Navigation">⇔</button>';
  function zeichne(el) {
    const o = el._bpNavO, a = o.attr || 'nav', m = o.lage ? lageEff() : 'links';
    const box = el.closest('.bp-nav') || el;   // steht das Feld in einer Navigation mit Suche darüber (AVA), gilt die Lage für die ganze Navigation
    [el, box].forEach((x) => { x.classList.toggle('schmal', m === 'schmal'); x.classList.toggle('oben', m === 'oben'); });
    if (box.parentElement) box.parentElement.classList.toggle('bp-nav-oben-an', m === 'oben');
    const ni = (p, mitText = true) => { const an = p.id === o.aktiv;
      return `<button type="button" class="ni${an ? ' on' : ''}" data-${a}="${esc(p.id)}"${an ? ' aria-current="page"' : ''}${mitText ? '' : ` title="${esc(p.text)}${p.zahl ? ' (' + esc(p.zahl) + ')' : ''}"`}>${svg(p)}${mitText ? `${esc(p.text)}${p.zahl ? `<small${p.zahlTip ? ` title="${esc(p.zahlTip)}"` : ''}>${esc(p.zahl)}</small>` : ''}` : ''}</button>`; };
    const G = o.gruppen || [];
    if (m === 'schmal') {
      el.innerHTML = `<button type="button" class="nauf" title="Navigation aufklappen" aria-label="Navigation aufklappen">⟩</button>`
        + G.map((g) => `<div class="ng">${g.href ? `<a class="ni" href="${esc(g.href)}" title="${esc(g.titel)} ↗"><span class="nbu">↗</span></a>` : (g.punkte || []).map((p) => ni(p, false)).join('')}</div>`).join('') + LAGEK;
    } else if (m === 'oben') {
      el.innerHTML = `<div class="nv-davor">${o.davor || ''}</div>` + G.map((g, k) => {
        if (g.href) return `<a class="ni" href="${esc(g.href)}"${g.tip ? ` title="${esc(g.tip)}"` : ''}>${esc(g.titel)} ↗</a>`;
        const P = g.punkte || [];
        if (P.length === 1) return ni(P[0]);
        const an = P.some((p) => p.id === o.aktiv);
        return `<span class="nt"><button type="button" class="ni ntb${an ? ' on' : ''}" data-ntg="${k}">${esc(g.titel)} ▾</button><div class="npop" hidden>${P.map((p) => ni(p)).join('')}</div></span>`;
      }).join('') + '<span class="nsp"></span><div class="nv-ende"></div>' + LAGEK;   // oben: davor (z. B. Version) links, nv-ende rechts für die App (Suche, Speicherstand)
    } else {
      el.innerHTML = (o.kopf || o.lage ? `<div class="nk"><b>${esc(o.kopf ? o.kopf.titel : '')}</b>${o.kopf && o.kopf.klein ? `<small>${esc(o.kopf.klein)}</small>` : ''}${o.lage ? LAGEK : ''}</div>` : '') + `<div class="nv-davor">${o.davor || ''}</div>`
        + G.map((g) => `<div class="ng">${g.href ? `<a class="nh" href="${esc(g.href)}"${g.tip ? ` title="${esc(g.tip)}"` : ''}>${esc(g.titel)} <span>↗</span></a>` : `<div class="nh">${esc(g.titel)}</div>`}${(g.punkte || []).map((p) => ni(p) + (p.id === o.aktiv && p.unter ? p.unter : '')).join('')}</div>`).join('')
        + (o.fuss || '');
    }
    if (o.nachher) o.nachher(el, m);
  }
  const zu = (el, ausser) => el.querySelectorAll('.npop,.nlm').forEach((x) => { if (x !== ausser) { if (x.classList.contains('nlm')) x.remove(); else x.hidden = true; } });
  function lageSetzen(l) {
    try { localStorage.setItem('bp.navlage', l); } catch { /* egal */ }
    ALLE.forEach((x) => { if (x.isConnected) zeichne(x); else ALLE.delete(x); });
    dispatchEvent(new Event('resize'));   // die App passt ihre Flächen an (Diagramm, Spalten)
  }
  function bpNav(el, o) {
    if (!el) return;
    const a = o.attr || 'nav';
    if (!el.closest('.bp-nav')) el.classList.add('bp-nav');   // steht das Feld schon in einer Navigation (mit Suche darüber), bekommt die den Rahmen
    el._bpNavO = o; if (o.lage) ALLE.add(el);
    zeichne(el);
    el._bpNavWahl = o.wahl || null;
    if (!el._bpNavAn) {
      el._bpNavAn = 1;
      el.addEventListener('click', (e) => {
        const t = e.target.closest ? e.target : e.target.parentElement;
        const tg = t.closest('.ntb'); if (tg) { const pop = tg.nextElementSibling; zu(el, pop); pop.hidden = !pop.hidden; return; }
        if (t.closest('.nauf')) { lageSetzen('links'); return; }
        const lk = t.closest('.nlage'); if (lk) {
          const war = el.querySelector('.nlm'); zu(el); if (war) return;
          const akt = lageGet(), m = document.createElement('div'); m.className = 'nlm'; m.setAttribute('role', 'menu');
          m.innerHTML = '<b>Navigation</b>' + LAGEN.map(([k, l]) => `<button type="button" data-nlage="${k}" class="${k === akt ? 'on' : ''}">${k === akt ? '✓ ' : ''}${esc(l)}</button>`).join('');
          el.appendChild(m); const r = lk.getBoundingClientRect(), h = m.offsetHeight, w = m.offsetWidth, seitlich = el.classList.contains('schmal');   // fest am Bildschirm: wird von der Navigation nicht abgeschnitten
          m.style.left = Math.max(4, Math.min(innerWidth - w - 4, seitlich ? r.right + 6 : r.left)) + 'px';
          m.style.top = Math.max(4, Math.min(innerHeight - h - 4, seitlich ? r.top : r.bottom + 4)) + 'px';
          return;
        }
        const wl = t.closest('[data-nlage]'); if (wl) { lageSetzen(wl.dataset.nlage); return; }
        const b = t.closest('.ni[data-' + a + ']'); if (b) { zu(el); if (el._bpNavWahl) el._bpNavWahl(b.getAttribute('data-' + a), e); }
      });
      document.addEventListener('pointerdown', (e) => { if (!el.contains(e.target)) zu(el); }, true);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(el); });
    }
  }
  let rzT = 0, rzW = innerWidth;
  addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (lageGet() !== 'auto' || (innerWidth >= 1600) === (rzW >= 1600)) { rzW = innerWidth; return; } rzW = innerWidth; ALLE.forEach((x) => x.isConnected && zeichne(x)); }, 150); });
  bpNav.lage = lageEff;
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
