/* Navigation links – gemeinsamer Baustein (/bp/nav.js): Kopf (Projekt), Gruppen mit Bereichen, Fuß.
   bpNav(el, o)
     el        das Feld links (bekommt die Klasse bp-nav – oder steht in einem Element mit dieser Klasse)
     o.kopf    { titel, klein }                       z. B. Projektname und „16 LVs“
     o.davor   HTML direkt unter dem Kopf             z. B. die Versionswahl (wird von der App gefüllt)
     o.gruppen [{ titel, href, tip, punkte: [{ id, text, icon, farbe, zahl, zahlTip, unter }] }]
               href: die Gruppe ist ein Verweis in eine andere App (dann ohne Punkte, mit ↗)
               icon: Inhalt eines <svg viewBox="0 0 24 24"> (Pfade), als Kachel gezeichnet; farbe: Farbe der Kachel (CSS, Standard grau); unter: HTML unter dem gewählten Punkt (z. B. „＋ Neu“)
     o.aktiv   id des gewählten Punkts
     o.fuss    HTML am Ende                           z. B. Ablagefeld
     o.attr    Name des data-Attributs der Punkte     (Standard „nav“ → data-nav="id")
     o.wahl    (id, ereignis) => …                    Klick auf einen Punkt; ohne o.wahl meldet die App den Klick selbst am Attribut an
   Jeder Aufruf zeichnet neu; angemeldet wird der Klick nur einmal je Feld.

   o.lage    true = Lage wählbar: 📌 Heftzwecke im Kopf (angeheftet = offen · gelöst = nur Symbole, klappt beim Darüberfahren über
               dem Inhalt auf) und ⋮⋮ Griff (nach oben ziehen = Bereichszeile oben, an den Rand ziehen = wieder links);
               „oben“ setzt am Elternelement die Klasse bp-nav-oben-an (die App stellt dort z. B. von Zeile auf Spalte um);
               in „oben“ steht o.davor vorn links, und .nv-ende (rechts) kann die App in o.nachher füllen
     o.nachher (el, lage) => …                        nach jedem Zeichnen (z. B. Versionswahl in .nv-davor einhängen)

   bpNav.breite(el, { key, min = 180, max = 520 }) – Anfasser am rechten Rand: Breite ziehen, Doppelklick = Standard,
     gemerkt je Browser (bp.navw.<key>). Der Anfasser steht als eigenes Element direkt hinter el (übersteht das Neuzeichnen). */
(() => {
  if (window.bpNav) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* Lage der Navigation (o.lage = true): „links“ angeheftet, „frei“ gelöst (nur Symbole, Darüberfahren klappt auf), „oben“ als Bereichszeile.
     Gemerkt je Browser für alle Apps (bp.navlage); ältere Werte: schmal → frei, auto → links. */
  const LAGEN = ['links', 'frei', 'oben'];
  const lageGet = () => { try { const v = localStorage.getItem('bp.navlage'); return v === 'schmal' ? 'frei' : LAGEN.includes(v) ? v : 'links'; } catch { return 'links'; } };
  const ALLE = new Set();
  const svg = (p) => (p.icon ? `<svg viewBox="0 0 24 24">${p.icon}</svg>` : `<span class="nbu">${esc(String(p.text || '?').trim().charAt(0))}</span>`);
  const GRIFF = '<span class="ngrip" title="Navigation verschieben: nach oben ziehen = Bereichszeile oben · an den linken Rand ziehen = links" aria-label="Navigation verschieben">⋮⋮</span>';
  const PIN = (an) => `<button type="button" class="npin${an ? ' an' : ''}" title="${an ? 'Lösen – nur Symbole, klappt beim Darüberfahren auf' : 'Anheften – Navigation bleibt offen'}" aria-pressed="${an}"><svg viewBox="0 0 24 24"><path class="npf" d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7"/><circle class="npk" cx="12" cy="21" r="1"/></svg></button>`;   // Heftzwecke Nr. 5 (Vorschlag 11.11.2026): Linie, angeheftet leicht gefüllt
  function zeichne(el) {
    const o = el._bpNavO, a = o.attr || 'nav', m = o.lage ? lageGet() : 'links';
    const box = el.closest('.bp-nav') || el;   // steht das Feld in einer Navigation mit Suche darüber (AVA), gilt die Lage für die ganze Navigation
    [el, box].forEach((x) => { x.classList.toggle('frei', m === 'frei'); x.classList.toggle('oben', m === 'oben'); });
    if (box.parentElement) box.parentElement.classList.toggle('bp-nav-oben-an', m === 'oben');
    const ni = (p, mitText = true) => { const an = p.id === o.aktiv;
      return `<button type="button" class="ni${an ? ' on' : ''}" data-${a}="${esc(p.id)}"${p.farbe ? ` style="--kf:${esc(p.farbe)}"` : ''}${an ? ' aria-current="page"' : ''}${mitText ? '' : ` title="${esc(p.text)}${p.zahl ? ' (' + esc(p.zahl) + ')' : ''}"`}>${svg(p)}${mitText ? `${esc(p.text)}${p.zahl ? `<small${p.zahlTip ? ` title="${esc(p.zahlTip)}"` : ''}>${esc(p.zahl)}</small>` : ''}` : ''}</button>`; };
    const G = o.gruppen || [];
    if (m === 'oben') {
      el.innerHTML = GRIFF + `<div class="nv-davor">${o.davor || ''}</div>` + G.map((g, k) => {
        if (g.href) return `<a class="ni" href="${esc(g.href)}"${g.tip ? ` title="${esc(g.tip)}"` : ''}>${esc(g.titel)} ↗</a>`;
        const P = g.punkte || [];
        if (P.length === 1) return ni(P[0]);
        const an = P.some((p) => p.id === o.aktiv);
        return `<span class="nt"><button type="button" class="ni ntb${an ? ' on' : ''}" data-ntg="${k}">${esc(g.titel)} ▾</button><div class="npop" hidden>${P.map((p) => ni(p)).join('')}</div></span>`;
      }).join('') + '<span class="nsp"></span><div class="nv-ende"></div>';   // oben: davor (z. B. Version) links, nv-ende rechts für die App (Suche, Speicherstand)
    } else {
      el.innerHTML = (o.kopf || o.lage ? `<div class="nk">${o.lage ? GRIFF : ''}<b>${esc(o.kopf ? o.kopf.titel : '')}</b>${o.kopf && o.kopf.klein ? `<small>${esc(o.kopf.klein)}</small>` : ''}${o.lage ? PIN(m === 'links') : ''}</div>` : '') + `<div class="nv-davor">${o.davor || ''}</div>`
        + G.map((g) => `<div class="ng${(g.punkte || []).some((p) => p.id === o.aktiv) ? ' an' : ''}">${g.href ? `<a class="nh" href="${esc(g.href)}"${g.tip ? ` title="${esc(g.tip)}"` : ''}>${esc(g.titel)} <span>↗</span></a>` : `<div class="nh">${esc(g.titel)}</div>`}${(g.punkte || []).map((p) => ni(p) + (p.id === o.aktiv && p.unter ? p.unter : '')).join('')}</div>`).join('')
        + (o.fuss || '');
    }
    if (o.nachher) o.nachher(el, m);
  }
  const zu = (el, ausser) => el.querySelectorAll('.npop').forEach((x) => { if (x !== ausser) x.hidden = true; });
  function lageSetzen(l) {
    try { localStorage.setItem('bp.navlage', l); } catch { /* egal */ }
    ALLE.forEach((x) => { if (x.isConnected) zeichne(x); else ALLE.delete(x); });
    dispatchEvent(new Event('resize'));   // die App passt ihre Flächen an (Diagramm, Spalten)
  }
  /* ⋮⋮ ziehen: Ablagestellen „oben“ und „links“ über dem Bereich der App zeigen, beim Loslassen dorthin legen */
  function ziehen(el, e) {
    const box = el.closest('.bp-nav') || el, R = (box.parentElement || document.body).getBoundingClientRect();
    const Z = [['oben', R.left + 70, R.top + 4, R.width - 78, 46, 'Navigation oben'], ['links', R.left + 4, R.top + 58, 220, R.height - 66, 'Navigation links']];
    const zs = Z.map(([k, x, y, w, h, t]) => { const d = document.createElement('div'); d.className = 'bp-nav-zone'; d.dataset.l = k; d.textContent = 'hier ablegen: ' + t;
      Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: Math.max(40, h) + 'px' }); document.body.appendChild(d); return d; });
    document.body.classList.add('bp-nav-zieht');
    const treffer = (ev) => zs.find((d) => { const q = d.getBoundingClientRect(); return ev.clientX >= q.left && ev.clientX <= q.right && ev.clientY >= q.top && ev.clientY <= q.bottom; });
    const bew = (ev) => zs.forEach((d) => d.classList.toggle('hot', d === treffer(ev)));
    const los = (ev) => { removeEventListener('pointermove', bew); removeEventListener('pointerup', los); document.body.classList.remove('bp-nav-zieht');
      const t = treffer(ev); zs.forEach((d) => d.remove()); if (!t) return;
      const ziel = t.dataset.l === 'oben' ? 'oben' : lageGet() === 'oben' ? 'links' : lageGet(); if (ziel !== lageGet()) lageSetzen(ziel); };
    addEventListener('pointermove', bew); addEventListener('pointerup', los); bew(e);
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
        if (t.closest('.npin')) { lageSetzen(lageGet() === 'links' ? 'frei' : 'links'); return; }
        const b = t.closest('.ni[data-' + a + ']'); if (b) { zu(el); if (el._bpNavWahl) el._bpNavWahl(b.getAttribute('data-' + a), e); }
      });
      el.addEventListener('pointerdown', (e) => { if (e.button === 0 && e.target.closest && e.target.closest('.ngrip')) { e.preventDefault(); ziehen(el, e); } });
      document.addEventListener('pointerdown', (e) => { if (!el.contains(e.target)) zu(el); }, true);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(el); });
    }
  }
  bpNav.lage = lageGet;
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
