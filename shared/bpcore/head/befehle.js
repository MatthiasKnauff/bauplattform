/* Befehlsleiste – derselbe Baustein für alle Bereiche (und später alle Apps).
   Gruppen mit kleiner Überschrift, Symbol über dem Text (wie das Menüband des Terminplans). Ganz links immer „Rückgängig“ (undo.js), dann „Neu“ (Gruppe mit Titel „Neu…“ –
   kurze Beschriftung, Symbol der Sache, das ＋ setzt die Leiste selbst dazu), dann das Fachliche des Bereichs (Bearbeiten · Ansicht …), rechts immer gleich: Datei · Verlauf · Löschen · Details · ⋯.
   Was gerade nicht geht, bleibt grau an seinem Platz (nichts springt). Wird es eng: erst kleinere Texte unter den Symbolen, dann die Texte
   weg, dann wandern die hinteren linken Gruppen in „»“ (aufklappen).

   befehle(el, gruppen)
     gruppen: [{ titel, rechts?, knoepfe?: [knopf], html? }]
     mitte:   Element (z. B. die Kennzahlen), das den freien Platz zwischen links und rechts füllt – es wird nur
              umgehängt (bleibt dasselbe Element mit seinen Handlern) und gibt als Erstes Platz ab, wenn es eng wird
     knopf:   { t: Text, ic?: SVG-Pfade oder Zeichen, attrs?: 'data-act="pos"' (die Aktion übernehmen die vorhandenen
                Klick-Handler), fn?: Funktion, aus?, an?, tip?, rot?, datei?: { accept, attrs } (Knopf öffnet eine Dateiauswahl) } */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FN = [];
  const icon = (ic) => !ic ? '' : /^</.test(ic) ? `<svg viewBox="0 0 24 24" aria-hidden="true">${ic}</svg>` : `<span class="bf-z" aria-hidden="true">${esc(ic)}</span>`;
  function knopf(k) {
    const kl = `bf-k${k.an ? ' on' : ''}${k.rot && !k.aus ? ' rot' : ''}${/M12 5v14M5 12h14|^[+＋]$/.test(k.ic || '') ? ' bf-p' : ''}`   /* bf-p: Symbol ist schon ein ＋ – in „Neu“ kein zweites */, tip = esc(k.tip || k.t), inner = `${icon(k.ic)}<span class="bf-t">${esc(k.t)}</span>`;
    if (k.datei) return `<label class="${kl}${k.aus ? ' aus' : ''}" title="${tip}">${inner}<input type="file" hidden accept="${esc(k.datei.accept || '')}" ${k.datei.attrs || ''}${k.aus ? ' disabled' : ''}></label>`;
    let a = k.attrs || '';
    if (k.fn) { FN.push(k.fn); a += ` data-bffn="${FN.length - 1}"`; }
    return `<button type="button" class="${kl}" ${a}${k.aus ? ' disabled' : ''} title="${tip}"${k.an != null ? ` aria-pressed="${!!k.an}"` : ''}>${inner}</button>`;
  }
  function befehle(el, gruppen, mitte) {
    if (!el) return;
    FN.length = 0;
    const G = (gruppen || []).filter((g) => g && (g.html || (g.knoepfe || []).some(Boolean)));
    const gr = (g, i) => `<div class="bf-g${g.rechts ? ' r' : ''}${neu(g) ? ' bf-neu' : ''}" data-bfg="${i}"><div class="bf-ks">${g.html || ''}${(g.knoepfe || []).filter(Boolean).map((k) => knopf(neu(g) && document.documentElement.classList.contains('bp-nurlesen') ? { ...k, aus: true, tip: 'Nur lesen – deine Rolle erlaubt hier kein Anlegen' } : k)).join('')}</div>${g.titel ? `<div class="bf-gt">${esc(g.titel)}</div>` : ''}</div>`;
    const neu = (g) => /^Neu\b/.test(g.titel || '');   // „Neu“ immer gleich hinter Rückgängig (beschlossen am 15.11.2026) – in jeder App an derselben Stelle
    const li = G.map((g, i) => [g, i]).filter(([g]) => !g.rechts).sort(([a], [b]) => neu(b) - neu(a)), re = G.map((g, i) => [g, i]).filter(([g]) => g.rechts);
    // Rückgängig · Wiederholen · Verlauf: immer die erste Gruppe (undo.js füllt und bedient sie) – nicht in Leisten von Dialogen und im Bereich rechts
    const undo = window.bpUndoGruppe && !el.closest('.modal, .modal-bg, .bph-dlg, .sr-r, .sr-flo') ? `<div class="bf-g bf-undo" data-bfg="u"><div class="bf-ks">${window.bpUndoGruppe()}</div><div class="bf-gt">Rückgängig</div></div>` : '';
    const html = `<div class="bf" role="toolbar">${undo}${li.map(([g, i]) => gr(g, i)).join('')}<button type="button" class="bf-mehr" hidden title="weitere Befehle" aria-haspopup="true">»</button><span class="bf-sp"></span><div class="bf-mitte"></div>${re.map(([g, i]) => gr(g, i)).join('')}<div class="bf-pop" hidden></div></div>`;
    /* Gleiche Leiste wie beim letzten Mal (gleicher Inhalt, gleiche Breite): nicht neu bauen und nicht neu messen (17.11.2026). Das Messen
       (passen) zwingt den Browser, die ganze Seite anzuordnen – kommt die Leiste nach einer großen Tabelle (LV), kostete das 40 % der Zeit
       des Neuzeichnens. Die Knöpfe bleiben dieselben (data-bffn zeigt auf dieselbe Stelle in FN, die Funktionen sind eben neu eingetragen);
       nur die Mitte (z. B. Kennzahlen) wird umgehängt und im nächsten Bild gekürzt. */
    const schl = html + '|' + !!mitte, bf0 = el.querySelector(':scope > .bf');
    if (bf0 && el._bfSchl === schl && el._bw && el._bfBreite === el._bw) {
      const mi0 = bf0.querySelector('.bf-mitte');
      if (mi0 && mitte && mi0.firstElementChild !== mitte) { mi0.replaceChildren(mitte); requestAnimationFrame(() => { if (bf0.isConnected) mitteKuerzen(bf0); }); }
      return;
    }
    el.innerHTML = html;
    const mi = el.querySelector('.bf-mitte');
    if (mitte) { mi.appendChild(mitte); el.querySelector('.bf-sp').remove(); } else mi.remove();
    passen(el);
    el._bfSchl = schl; el._bfBreite = el._bw || (el._bw = el.clientWidth);
    if (!el._ro) { let t = 0; el._ro = new ResizeObserver(() => { if (el.clientWidth === el._bw) return; el._bw = el.clientWidth; clearTimeout(t); t = setTimeout(() => { passen(el); el._bfBreite = el._bw; }, 80); }); el._ro.observe(el); }   // nur auf die Breite reagieren – sonst schaukelt sich das Ein-/Ausblenden der Texte (Höhe) auf
  }
  function passen(el) {   // eng? erst kleiner Text, dann Texte weg, dann linke Gruppen von hinten in „»“
    const bf = el.querySelector('.bf'); if (!bf) return;
    const mi = bf.querySelector('.bf-mitte'), K = mi && mi.firstElementChild ? [...mi.firstElementChild.children] : [];
    K.forEach((k) => k.classList.remove('bf-weg'));
    const pop = bf.querySelector('.bf-pop'), mehr = bf.querySelector('.bf-mehr');
    [...pop.children].forEach((g) => mehr.before(g));   // alles zurück an seinen Platz
    pop.hidden = true; mehr.hidden = true; bf.classList.remove('kompakt', 'klein');
    const zuBreit = () => bf.scrollWidth > bf.clientWidth + 1;
    if (!zuBreit()) return mitteKuerzen(bf);
    bf.classList.add('klein'); if (!zuBreit()) return mitteKuerzen(bf);   // erst: Symbole bleiben groß, der Text darunter wird klein und eng
    bf.classList.remove('klein'); bf.classList.add('kompakt'); if (!zuBreit()) return mitteKuerzen(bf);
    mehr.hidden = false;
    const L = [...bf.querySelectorAll(':scope > .bf-g:not(.r)')];
    for (let i = L.length - 1; i > 0 && zuBreit(); i--) pop.prepend(L[i]);
    mitteKuerzen(bf);
  }
  function mitteKuerzen(bf) {   // Kacheln in der Mitte, die nicht mehr ganz passen, ausblenden statt abschneiden
    const mi = bf.querySelector('.bf-mitte'); if (!mi || !mi.firstElementChild) return;
    const R = mi.getBoundingClientRect().right - 4;
    [...mi.firstElementChild.children].forEach((k) => { if (k.getBoundingClientRect().right > R) k.classList.add('bf-weg'); });
  }
  document.addEventListener('click', (e) => {
    const m = e.target.closest && e.target.closest('.bf-mehr');
    if (m) { const p = m.parentElement.querySelector('.bf-pop'); p.hidden = !p.hidden; if (!p.hidden) { const r = m.getBoundingClientRect(); Object.assign(p.style, { left: Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.left)) + 'px', top: (r.bottom + 4) + 'px' }); } return; }
    const f = e.target.closest && e.target.closest('[data-bffn]');
    if (f && !f.disabled) { const fn = FN[+f.dataset.bffn]; if (fn) fn(e); }
    document.querySelectorAll('.bf-pop:not([hidden])').forEach((p) => { if (!p.contains(e.target)) p.hidden = true; });
  });
  /* Mitte zu schmal (Kacheln ausgeblendet): beim Drüberfahren rollt darunter die ganze Reihe auf – zum Lesen, ohne Klick */
  let AUF = null, aufT = 0;
  const zu = () => { clearTimeout(aufT); aufT = setTimeout(() => { if (AUF) { AUF.remove(); AUF = null; } }, 220); };
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest && e.target.closest('.bf-mitte, .bf-auf'); if (!t) { if (AUF) zu(); return; }
    clearTimeout(aufT); if (t.classList.contains('bf-auf') || AUF) return;
    const q = t.firstElementChild; if (!q || !q.querySelector('.bf-weg')) return;   // alles sichtbar: nichts aufzurollen
    // nur die ausgeblendeten Kacheln, untereinander, unter der letzten sichtbaren ausklappend
    const sicht = [...q.children].filter((x) => !x.classList.contains('bf-weg')), letzte = sicht[sicht.length - 1];
    const r = (letzte || t).getBoundingClientRect(), k = q.cloneNode(false); k.removeAttribute('id');
    q.querySelectorAll(':scope > .bf-weg').forEach((x) => { const c = x.cloneNode(true); c.classList.remove('bf-weg'); k.appendChild(c); });
    AUF = document.createElement('div'); AUF.className = 'bf-auf bf-auf-sp'; AUF.appendChild(k); document.body.appendChild(AUF);
    const b = Math.max(r.width, AUF.offsetWidth);
    Object.assign(AUF.style, { left: Math.max(8, Math.min(innerWidth - b - 8, r.left - 6)) + 'px', top: (r.bottom + 2) + 'px' });
  });
  /* Kopf und Leiste zweistufig weg (beschlossen am 16.11.2026, zuerst Ausschreibung): eine Heftzwecke oben rechts über dem Arbeitsbereich
     schaltet reihum – 0 alles da · 1 Kopf weg · 2 auch die Befehlsleiste weg (Befehle dann per rechter Maustaste, Strg+Z wie immer).
     befehle.heft({ key, vor: Element, stufe1: [Elemente], leiste: Element der Befehlsleiste, einstufig?: true, nach?: () => … }); gemerkt je Browser.
     einstufig (Bauzeitenplan, 17.11.2026): ein Klick blendet Kopfzeile und Befehlsleiste zusammen aus, der nächste holt beide zurück. */
  const HEFT = ['Kopf ausblenden – mehr Platz für die Tabelle', 'Auch die Befehlsleiste ausblenden – Befehle dann mit der rechten Maustaste', 'Kopf und Befehlsleiste wieder anheften'];
  function heft(o) {
    const k = 'bp.kopf.' + o.key, lies = () => { try { const v = Math.min(2, Math.max(0, +localStorage.getItem(k) || 0)); return o.einstufig && v ? 2 : v; } catch { return 0; } };
    let z = o.vor.previousElementSibling && o.vor.previousElementSibling.classList.contains('bf-heftz') ? o.vor.previousElementSibling : null;
    if (!z) { z = document.createElement('div'); z.className = 'bf-heftz'; z.innerHTML = '<button type="button" class="bf-heft"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="npf" d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7"/></svg></button>'; o.vor.before(z); }
    const b = z.firstElementChild;
    const merkDisplay = (x) => { if (x && !x.classList.contains('bf-zu')) x.dataset.bfd = getComputedStyle(x).display; };
    const setzen = (s) => {
      weg(true); [...(o.stufe1 || []), o.leiste].forEach(merkDisplay);
      (o.stufe1 || []).forEach((x) => x && x.classList.toggle('bf-zu', s >= 1));
      if (o.leiste) { o.leiste.classList.toggle('bf-zu', s >= 2); if (s >= 2) o.leiste.dataset.bfkm = ''; else delete o.leiste.dataset.bfkm; }
      const t = o.einstufig && !s ? 'Kopf und Befehlsleiste ausblenden – Befehle dann mit der rechten Maustaste' : HEFT[s];
      b.dataset.stufe = s; b.classList.toggle('an', !s); b.title = t; b.setAttribute('aria-label', t);
      if (o.nach) o.nach(s);
      requestAnimationFrame(lage);
    };
    const lage = () => {   // oben an der rechten Kante des Arbeitsbereichs – nicht über dem abdockbaren Bereich rechts (seite.js)
      const S = o.vor.matches('.sr-split') ? o.vor : o.vor.querySelector('.sr-split'), R = o.vor.getBoundingClientRect();
      const A = S && [...S.children].find((x) => !x.matches('.sr-r,.sr-flo,[hidden]'));
      if (A && A !== o.vor._heftA) { o.vor._heftA = A; o.vor._heftRo.observe(A); }
      b.style.right = Math.max(0, R.right - (A ? A.getBoundingClientRect().right : R.right)) + 4 + 'px';
      b.style.top = Math.max(0, (S ? S.getBoundingClientRect().top : R.top) - R.top) + 3 + 'px';   // oben am Arbeitsbereich – Hinweiszeilen darüber (z. B. GAEB) bleiben frei
    };
    /* Eingeklappt: mit der Maus an die Oberkante fahren zeigt Kopf und Leiste über dem Inhalt – wie die Navigation links (17.11.2026);
       nichts verschiebt sich, weg sind sie, sobald die Maus sie verlässt (nicht, solange darin getippt wird) */
    const zu = () => [...(o.stufe1 || []), o.leiste].filter((x) => x && x.classList.contains('bf-zu'));
    let tw = 0;
    function zeig() {
      clearTimeout(tw); if (z._offen) return; z._offen = true;
      let y = o.vor.getBoundingClientRect().top;
      zu().forEach((x) => { const P = x.parentElement.getBoundingClientRect(); x.classList.add('bf-schwebt'); x.style.setProperty('display', x.dataset.bfd && x.dataset.bfd !== 'none' ? x.dataset.bfd : 'flex', 'important');
        Object.assign(x.style, { top: (y + 4) + 'px', left: (P.left + 6) + 'px', width: Math.max(120, P.width - 12) + 'px' }); y += x.getBoundingClientRect().height + 4; });   // etwas eingerückt, mit Abstand (runde Ecken: bp.css)
    }
    function weg(sofort) {
      clearTimeout(tw);
      const f = () => { const X = zu(); if (!sofort && X.some((x) => x.contains(document.activeElement) && document.activeElement.matches('input,textarea,select'))) return;
        z._offen = false; [...(o.stufe1 || []), o.leiste].forEach((x) => { if (!x || !x.classList.contains('bf-schwebt')) return; x.classList.remove('bf-schwebt'); ['display', 'top', 'left', 'width'].forEach((p) => x.style.removeProperty(p)); }); };
      if (sofort) f(); else tw = setTimeout(f, 350);
    }
    if (!z._hz) {
      z._hz = true;
      document.addEventListener('mousemove', (e) => {   // Oberkante des Arbeitsbereichs (10 px, ohne die Heftzwecke rechts) – unabhängig davon, was dort liegt
        if (z._offen || !lies() || e.buttons) return; const R = o.vor.getBoundingClientRect();
        if (e.clientY >= R.top - 2 && e.clientY <= R.top + 10 && e.clientX >= R.left && e.clientX <= R.right - 40) zeig();
      }, { passive: true });
      [...(o.stufe1 || []), o.leiste].forEach((x) => { if (!x) return; x.addEventListener('mouseenter', () => { if (z._offen) clearTimeout(tw); }); x.addEventListener('mouseleave', () => { if (z._offen) weg(); });
        x.addEventListener('focusout', () => { if (z._offen) setTimeout(() => { if (!x.contains(document.activeElement)) weg(); }, 0); }); });
    }
    if (!o.vor._heftRo) { o.vor._heftRo = new ResizeObserver(lage); o.vor._heftRo.observe(o.vor); new MutationObserver(lage).observe(o.vor, { childList: true }); }
    b.onclick = () => { const s = o.einstufig ? (lies() ? 0 : 2) : (lies() + 1) % 3; try { localStorage.setItem(k, s); } catch { /* egal */ } setzen(s); };
    setzen(lies());
  }
  befehle.heft = heft;
  /* Stufe 2: die Befehle der versteckten Leiste ins Kontextmenü (nach den Befehlen der Zeile; Kopf je Gruppe).
     befehle.kmPunkte() → [{titel} | {text, fn, gefahr}] – das Kontextmenü der Kopfleiste nimmt sie über 'bph:kontext', Seiten mit eigenem
     Kontextmenü (Bauzeitenplan) hängen sie selbst an. */
  function kmPunkte() {
    const P = [];
    document.querySelectorAll('[data-bfkm]').forEach((el) => {
      el.querySelectorAll('.bf-g').forEach((g) => {
        const K = [...g.querySelectorAll('button,label.bf-k')].filter((x) => !x.disabled && !x.classList.contains('aus') && !x.classList.contains('bf-mehr'));
        const T = K.map((x) => [x, (x.querySelector('.bf-t') || x).textContent.trim()]).filter(([, tx]) => tx && !/^\d+$/.test(tx));
        if (!T.length) return;
        P.push({ titel: (g.querySelector('.bf-gt') || {}).textContent || '', bf: true });   // bf: Befehle der Leiste – das Menü stellt sie hinter die Punkte der Stelle
        T.forEach(([x, tx]) => P.push({ text: tx, fn: () => x.click(), gefahr: /lösch/i.test(tx), bf: true }));
      });
    });
    return P;
  }
  befehle.kmPunkte = kmPunkte;
  addEventListener('bph:kontext', (e) => { e.detail.punkte.push(...kmPunkte()); });
  window.befehle = befehle;
})();
