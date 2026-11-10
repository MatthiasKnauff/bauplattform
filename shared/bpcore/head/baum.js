/* Baumtabelle – gemeinsamer Baustein (/bp/baum.js): Projekt → LV/Plan → Gliederung → Zeilen, als <table class="bp-baum">.
   Bisher: die Baumzelle (Einrückung, Dreieck, Symbol), ihr Aussehen (bp.css), das Auf-/Zuklappen, die Rollposition beim
   Neuzeichnen und die Tastatur (unten). Markieren und Ziehen stecken noch in der AVA und folgen hierher.

   bpBaum.zelle(o) → '<td class="… baumz">…</td>'
     o.tiefe   Ebene (0 = Wurzel); je Ebene bpBaum.EINZUG rem eingerückt
     o.auf     true = aufgeklappt (▾), false = zugeklappt (▸), sonst kein Dreieck (der Platz bleibt, damit die Texte fluchten)
     o.klapp   Kennung des Knotens: das Dreieck klappt ihn auf und zu (data-zu, siehe bpBaum.klappbar)
     o.car     zusätzliche Attribute am Dreieck (für Dreiecke mit eigener Bedeutung)
     o.icon    HTML des Symbols
     o.html    Inhalt hinter dem Symbol (Text, Eingabefeld, Marken)
     o.kl      weitere Klassen der Zelle, o.attr weitere Attribute der Zelle
   bpBaum.einzug(tiefe) → 'padding-left:…rem' (für Zeilen, die ihre Zelle selbst bauen)

   Auf- und Zuklappen – die Zeilen liegen als flache Liste vor, jede mit einer Tiefe (Blätter: Infinity):
   bpBaum.klapp({ anfang, key }) → K   Stand „welche Knoten sind zu“
     anfang    Kennungen, die anfangs zu sind (Liste oder Funktion)
     key       Name zum Merken im Browser (bp.baum.<key>); ohne key gilt der Stand bis zum Neuladen der Seite
     K.zu(id) · K.um(id) · K.oeffne(id) · K.setze(ids) · K.liste() · K.zahl()
   bpBaum.sicht(zeilen, tiefe, K, id) → je Zeile true/false: sichtbar? (alles unter einem zugeklappten Knoten ist versteckt)
     tiefe(x) → Ebene der Zeile, id(x) → Kennung (Vorgabe x.id)
   bpBaum.eltern(zeilen, i, tiefe) → die Knoten über Zeile i, vom nächsten bis zur Wurzel
   bpBaum.zeige(zeilen, i, tiefe, K, id) → klappt alles über Zeile i auf (z. B. vor dem Hinscrollen)
   bpBaum.klappbar(wurzel, { klapp: () => K oder null, neu: () => …, alle: () => Kennungen aller Knoten })
     → Klick auf ein Dreieck mit data-zu klappt um und zeichnet neu; ein Knopf mit data-zualle="zu" klappt alles zu, mit "auf" alles auf */
(() => {
  if (window.bpBaum) return;
  const EINZUG = 1.15;
  const einzug = (t) => `padding-left:${(t || 0) * EINZUG}rem`;
  function zelle(o) {
    return `<td class="${o.kl ? o.kl + ' ' : ''}baumz"${o.attr || ''}><div class="bz" style="${einzug(o.tiefe)}"><span class="car"${o.klapp != null ? ` data-zu="${o.klapp}" title="${o.auf === false ? 'aufklappen' : 'zuklappen'}"` : ''}${o.car || ''}>${o.auf === true ? '▾' : o.auf === false ? '▸' : ''}</span>${o.icon || ''}${o.html || ''}</div></td>`;
  }
  const SP = 'bp.baum.';
  function klapp(o) {
    o = o || {};
    let S = null;
    if (o.key) try { const v = JSON.parse(localStorage.getItem(SP + o.key)); if (Array.isArray(v)) S = new Set(v.map(String)); } catch { /* ohne Speicher: Anfangsstand */ }
    if (!S) S = new Set((typeof o.anfang === 'function' ? o.anfang() : o.anfang || []).map(String));
    const merke = () => { if (o.key) try { localStorage.setItem(SP + o.key, JSON.stringify([...S])); } catch { /* egal */ } };
    return {
      zu: (id) => S.has(String(id)),
      um(id) { id = String(id); if (S.has(id)) S.delete(id); else S.add(id); merke(); },
      oeffne(id) { if (S.delete(String(id))) merke(); },
      setze(ids) { S = new Set((ids || []).map(String)); merke(); },
      liste: () => [...S],
      zahl: () => S.size,
    };
  }
  const kenn = (x) => x.id;
  function sicht(zeilen, tiefe, K, id) {
    id = id || kenn; let zuAb = null;   // zuAb: ab dieser Ebene ist zugeklappt
    return zeilen.map((x) => {
      const t = tiefe(x); if (zuAb != null && t <= zuAb) zuAb = null;
      if (zuAb != null) return false;
      if (t !== Infinity && K.zu(id(x))) zuAb = t;
      return true;
    });
  }
  function eltern(zeilen, i, tiefe) {
    const out = []; if (i < 0 || i >= zeilen.length) return out;
    let t = tiefe(zeilen[i]);
    for (let j = i - 1; j >= 0; j--) { const tj = tiefe(zeilen[j]); if (tj < t) { out.push(zeilen[j]); t = tj; } }
    return out;
  }
  function zeige(zeilen, i, tiefe, K, id) { id = id || kenn; eltern(zeilen, i, tiefe).forEach((x) => K.oeffne(id(x))); }
  function klappbar(wurzel, o) {
    wurzel.addEventListener('click', (e) => {
      const c = e.target.closest && e.target.closest('[data-zu]'), a = !c && o.alle && e.target.closest && e.target.closest('[data-zualle]');
      if (!c && !a) return;
      const K = o.klapp(); if (!K) return;
      e.stopPropagation();
      if (c) K.um(c.dataset.zu); else K.setze(a.dataset.zualle === 'zu' ? o.alle() : []);
      o.neu();
    }, true);
  }
  /* ---------- Rollposition: vor dem Neuzeichnen merken, danach wiederherstellen (Auf-/Zuklappen springt nicht nach oben) ----------
     const zurueck = bpBaum.rolle(el); … el.innerHTML = …; requestAnimationFrame(zurueck)
     merkt jedes gerollte Element unter el (nach Art und Klassen) und die Seite selbst */
  const ZUSTAND = /^(akt|on|sel|zu|an|bp-kc|bp-kw)$/;
  function rolle(w) {
    const alt = [], x0 = window.scrollX, y0 = window.scrollY;
    const sig = (el) => el.tagName.toLowerCase() + [...el.classList].filter((c) => !ZUSTAND.test(c)).map((c) => '.' + CSS.escape(c)).join('');
    if (w) w.querySelectorAll('*').forEach((el) => { if (el.scrollTop > 0 || el.scrollLeft > 0) { const s = sig(el); alt.push([s, [...w.querySelectorAll(s)].indexOf(el), el.scrollTop, el.scrollLeft]); } });
    return () => {
      alt.forEach(([s, i, t, l]) => { const el = w && w.querySelectorAll(s)[i]; if (el) { el.scrollTop = t; el.scrollLeft = l; } });
      if (Math.abs(window.scrollY - y0) > 1 || Math.abs(window.scrollX - x0) > 1) window.scrollTo(x0, y0);
    };
  }

  /* ---------- Tastatur im Baum (besprochen am 10.11.2026) ----------
     Zeilenmodus (der Baum hat den Fokus): ↑ ↓ Zeile, → aufklappen bzw. hinein, ← zuklappen bzw. zum Ordner darüber,
       Pos1/Ende, Bild↑/Bild↓, Umschalt+↑↓ markieren, Enter ins erste Feld (ohne Felder: öffnen), F2 ins erste Feld (Cursor ans Ende),
       Buchstabe tippen → ins erste Feld und losschreiben, Alt+Enter Eigenschaften, Einfg neue Position, Umschalt+Einfg neuer Titel,
       Alt+Umschalt+↑↓ Zeile verschieben.
     Feldmodus (in einem Feld einer Tabelle): Tab/Umschalt+Tab nächstes/voriges Feld (am Zeilenende in die nächste Zeile),
       Enter/Umschalt+Enter und ↑ ↓ (einzeilige Felder) dieselbe Spalte eine Zeile tiefer/höher, Esc holt den alten Wert zurück,
       ein zweites Esc geht zurück in den Zeilenmodus. Beim Hineinspringen ist der Inhalt markiert: Tippen ersetzt.
     F6 springt reihum zwischen den Bäumen der Seite und dem Bereich rechts (seite.js).

     bpBaum.tasten(o) meldet einen Baum an:
       o.wurzel  Auswahl der Baum-Elemente (z. B. '#view table.lv.baum > tbody') – bekommt den Fokus im Zeilenmodus
       o.zeilen  Auswahl der Zeilen darin
       o.aktiv(w) → gewählte Zeile (Vorgabe: .akt, .on oder .sel)
       o.waehle(z, { umschalt }) → Zeile wählen; fehlt es, wandert nur der Cursor und Enter öffnet die Zeile
       o.oeffne(z)  Enter auf einer Zeile ohne Felder (Vorgabe: Klick auf die Zeile)
       o.tiefe(z)   Ebene (Vorgabe: Einrückung der Baumzelle)
       o.eigen(z)   Alt+Enter (Vorgabe: Doppelklick auf die Zeile) · o.neu(z, titel) Einfg · o.schiebe(z, ±1) Alt+Umschalt+↑↓
       o.ohne       Auswahl von Feldern, deren Tasten die App selbst steuert
       o.unterzeile Auswahl von Zeilen, die zur Zeile darüber gehören (Langtext): ihre Felder kommen bei Tab gleich nach der ersten Zelle
     Der Feldmodus gilt in den angemeldeten Bäumen und in den Tabellen unter window.bpBaumFelder (Auswahl, z. B. der Preisspiegel). */
  const BAEUME = [], OHNE = [], CUR = new Map();
  let LETZT = null, KC = null;
  const FELD = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]):not([readonly]):not([disabled]),select:not([disabled]),textarea:not([readonly]):not([disabled])';
  const sichtbar = (el) => !!el && el.getClientRects().length > 0;
  const halt = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
  const kennZ = (z) => { const a = [...z.attributes].filter((x) => x.name.startsWith('data-')).map((x) => x.name + '=' + x.value); return a.length ? a.join('|') : [...z.classList].filter((c) => !ZUSTAND.test(c)).join('.'); };
  const confVon = (el) => { if (!el || !el.closest) return null; for (const o of BAEUME) { const w = el.closest(o.wurzel); if (w) return [o, w]; } return null; };
  const wurzelVon = (o) => [...document.querySelectorAll(o.wurzel)].find(sichtbar) || null;
  const zeilenVon = (o, w) => [...w.querySelectorAll(o.zeilen)].filter(sichtbar);
  const tiefeVon = (o, z) => { if (o.tiefe) return o.tiefe(z); const b = z.querySelector('.bz,.tw,[style*="padding-left"]'); return b ? parseFloat(b.style.paddingLeft) || 0 : 0; };
  const felderVon = (z) => [...z.querySelectorAll(FELD)].filter((f) => sichtbar(f) && !f.closest('.acts-c'));
  function tasten(o) { BAEUME.push(o); if (o.ohne) OHNE.push(o.ohne); }
  function aktuell(o, w) {
    const Z = zeilenVon(o, w); if (!Z.length) return null;
    const k = CUR.get(o), a = o.aktiv ? o.aktiv(w) : w.querySelector('.akt,.on,.sel');
    return (k && Z.find((z) => kennZ(z) === k)) || (a && Z.includes(a) ? a : null) || Z[0];
  }
  function markiere(z) {
    if (KC && KC !== z) KC.classList.remove('bp-kc');
    KC = z || null; if (!z) return;
    z.classList.add('bp-kc'); z.scrollIntoView({ block: 'nearest' });
  }
  function fokusWurzel(w) {
    w.classList.add('bp-kw'); if (!w.hasAttribute('tabindex')) w.setAttribute('tabindex', '-1');
    if (document.activeElement !== w) w.focus({ preventScroll: true });
  }
  function nachher(o) {   // nach einer Aktion, die neu zeichnen kann: Cursor und Fokus wieder in den Baum
    setTimeout(() => { const w = wurzelVon(o); if (!w || LETZT !== o) return; markiere(aktuell(o, w));
      const a = document.activeElement; if (!a || a === document.body || !a.isConnected) fokusWurzel(w); }, 40);
  }
  function gehe(o, z, umschalt) {
    CUR.set(o, kennZ(z)); markiere(z);
    if (o.waehle) { o.waehle(z, { umschalt: !!umschalt }); nachher(o); }
  }
  const klickZiel = (z) => z.querySelector('.ozt, .t, .au-bz, td') || z;
  function feldFokus(f, ende) {
    f.focus();
    if (f.tagName === 'SELECT') return;
    try { if (ende) { const n = f.value.length; f.setSelectionRange(n, n); } else f.select(); } catch { /* Feldart ohne Auswahl */ }
  }
  function zeilenTaste(e, o, w) {
    const Z = zeilenVon(o, w); if (!Z.length) return false;
    const z = aktuell(o, w), i = Math.max(0, Z.indexOf(z)), k = e.key;
    if (e.ctrlKey || e.metaKey) return false;
    if (e.altKey && e.shiftKey && (k === 'ArrowUp' || k === 'ArrowDown')) { if (!o.schiebe) return false; o.schiebe(z, k === 'ArrowUp' ? -1 : 1); CUR.delete(o); nachher(o); return true; }
    if (e.altKey && k === 'Enter') { const t = klickZiel(z); if (o.eigen) o.eigen(z); else t.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); return true; }
    if (e.altKey) return false;
    const zu = (j) => { gehe(o, Z[Math.max(0, Math.min(Z.length - 1, j))], e.shiftKey); return true; };
    const knoten = () => { const c = z.querySelector('.car'), t = c && c.textContent.trim(); return t === '▾' || t === '▸' ? { auf: t === '▾', c } : null; };
    switch (k) {
      case 'ArrowDown': return zu(i + 1);
      case 'ArrowUp': return zu(i - 1);
      case 'Home': return zu(0);
      case 'End': return zu(Z.length - 1);
      case 'PageDown': return zu(i + 10);
      case 'PageUp': return zu(i - 10);
      case 'ArrowRight': { const n = knoten(); if (n && !n.auf) { n.c.click(); nachher(o); return true; }
        if (n && Z[i + 1] && tiefeVon(o, Z[i + 1]) > tiefeVon(o, z)) return zu(i + 1); return true; }
      case 'ArrowLeft': { const n = knoten(); if (n && n.auf) { n.c.click(); nachher(o); return true; }
        const t = tiefeVon(o, z); for (let j = i - 1; j >= 0; j--) if (tiefeVon(o, Z[j]) < t) return zu(j); return true; }
      case 'Enter': { if (e.shiftKey) return false; const f = felderVon(z)[0]; if (f) { feldFokus(f); return true; }
        if (o.oeffne) o.oeffne(z); else klickZiel(z).click(); nachher(o); return true; }
      case 'F2': { const f = felderVon(z)[0]; if (!f) return false; feldFokus(f, true); return true; }
      case 'Insert': if (!o.neu) return false; o.neu(z, e.shiftKey); return true;
      default: break;
    }
    if (k.length === 1 && k !== ' ') {   // losschreiben: ersetzt den Inhalt des ersten Felds (wie in einer Tabellenkalkulation)
      const f = felderVon(z)[0]; if (!f || f.tagName !== 'INPUT') return false;
      feldFokus(f); f.value = k; f.dispatchEvent(new Event('input', { bubbles: true })); feldFokus(f, true); return true;
    }
    return false;
  }
  /* Feldmodus: Spalte = Lage der Zelle (Spaltenbreiten mitgezählt) und Stelle des Felds in der Zelle */
  const spalte = (td) => { let p = 0; for (const c of td.parentNode.cells) { if (c === td) return p; p += c.colSpan || 1; } return p; };
  const zelleAn = (tr, p) => { let q = 0; for (const c of tr.cells) { if (q === p) return c; q += c.colSpan || 1; if (q > p) return null; } return null; };
  function lage(f) {
    const td = f.closest('td,th'), tr = td && td.parentNode, t = tr && tr.closest('table'); if (!t) return null;
    return { t, tr, p: spalte(td), cs: td.colSpan || 1, n: felderVon(td).indexOf(f), art: f.tagName };
  }
  function spaltenNachbar(f, d) {
    const L = lage(f); if (!L) return null;
    const R = [...L.t.tBodies].flatMap((b) => [...b.rows]); let i = R.indexOf(L.tr);
    for (i += d; i >= 0 && i < R.length; i += d) {
      const tr = R[i]; if (!sichtbar(tr)) continue;
      const td = zelleAn(tr, L.p); if (!td || (td.colSpan || 1) !== L.cs) continue;
      const g = felderVon(td)[Math.max(0, L.n)]; if (g && g.tagName === L.art && g.tagName !== 'TEXTAREA') return g;
    }
    return null;
  }
  function tabFelder(t) {   // Reihenfolge für Tab: Zeile für Zeile; eine Unterzeile (o.unterzeile, z. B. der Langtext) kommt gleich nach der ersten Zelle ihrer Zeile
    const c = confVon(t.tBodies[0] || t), unter = c && c[0].unterzeile, ok = (f) => sichtbar(f) && !f.closest('thead,tfoot,.acts-c') && !OHNE.some((s) => f.matches(s));
    if (!unter) return [...t.querySelectorAll(FELD)].filter(ok);
    const out = [];
    [...t.rows].forEach((tr) => {
      if (tr.matches(unter)) return;
      const F = [...tr.querySelectorAll(FELD)].filter(ok), n = tr.cells[0] ? F.filter((f) => tr.cells[0].contains(f)).length : 0, u = tr.nextElementSibling;
      out.push(...F.slice(0, n), ...(u && u.matches(unter) ? [...u.querySelectorAll(FELD)].filter(ok) : []), ...F.slice(n));
    });
    return out;
  }
  function zielFokus(n, L) {   // ins Feld springen; zeichnet die App dabei neu (Speichern beim Verlassen), danach dasselbe Feld wieder suchen
    L = L || lage(n); const k = L && kennZ(L.tr), tk = L && (L.t.dataset.sp || L.t.className);
    if (n.isConnected) feldFokus(n);
    if (L) setTimeout(() => { if (n.isConnected) return; const a = document.activeElement; if (a && a !== document.body && a.isConnected) return;
      const t = [...document.querySelectorAll('table')].find((x) => sichtbar(x) && (x.dataset.sp || x.className) === tk); if (!t) return;
      const tr = [...t.rows].find((r) => kennZ(r) === k), td = tr && zelleAn(tr, L.p), g = td && felderVon(td)[Math.max(0, L.n)]; if (g) feldFokus(g); }, 80);
  }
  function feldTaste(e, f) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (OHNE.some((s) => f.matches(s)) || !f.closest('td,th')) return false;
    const k = e.key, ta = f.tagName === 'TEXTAREA', sel = f.tagName === 'SELECT';
    if (k === 'Escape') {
      const v0 = f.dataset.bpv0;
      if (!sel && v0 != null && f.value !== v0) { const L = lage(f); f.value = v0; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); zielFokus(f, L); return true; }
      const c = confVon(f), z = c && f.closest(c[0].zeilen); f.blur();
      if (c) { LETZT = c[0]; if (z) CUR.set(c[0], kennZ(z)); const w = wurzelVon(c[0]) || c[1]; fokusWurzel(w); markiere(aktuell(c[0], w)); }
      return true;
    }
    if (k === 'Tab') { const t = f.closest('table'), A = tabFelder(t), n = A[A.indexOf(f) + (e.shiftKey ? -1 : 1)]; if (!n) return false; zielFokus(n); return true; }
    if (ta || sel || e.isComposing) return false;
    if (k === 'Enter' || k === 'ArrowDown' || k === 'ArrowUp') {
      const n = spaltenNachbar(f, k === 'ArrowUp' || (k === 'Enter' && e.shiftKey) ? -1 : 1);
      if (n) zielFokus(n); else if (k === 'Enter') { f.dispatchEvent(new Event('change', { bubbles: true })); feldFokus(f); }
      return true;
    }
    return false;
  }
  function f6(rueck) {
    const Z = [...new Set([...BAEUME.map(wurzelVon), ...document.querySelectorAll('.sr-r .sr-b, .sr-flo .sr-b')])].filter(sichtbar);
    if (!Z.length) return false;
    const a = document.activeElement; let i = Z.findIndex((z) => z.contains(a));
    if (i < 0 && LETZT) i = Z.indexOf(wurzelVon(LETZT));
    const n = Z[i < 0 ? 0 : (i + (rueck ? -1 : 1) + Z.length) % Z.length], o = BAEUME.find((b) => n.matches(b.wurzel));
    if (o) { LETZT = o; fokusWurzel(n); markiere(aktuell(o, n)); return true; }
    LETZT = null; markiere(null);
    const f = [...n.querySelectorAll(FELD + ',button,[href]')].find(sichtbar);
    if (f) f.focus(); else { n.setAttribute('tabindex', '-1'); n.focus(); }
    return true;
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('focusin', (e) => {
      const f = e.target; if (!f.matches || !f.matches(FELD)) return;
      f.dataset.bpv0 = f.value;
      const c = confVon(f); if (!c) return;
      const z = f.closest(c[0].zeilen); LETZT = c[0]; if (z) { CUR.set(c[0], kennZ(z)); markiere(z); }
    });
    document.addEventListener('pointerdown', (e) => {
      const c = confVon(e.target);
      if (!c) { if (!(e.target.closest && e.target.closest('.bp-vs, .bp-ctx, .bp-menu'))) { LETZT = null; markiere(null); } return; }
      LETZT = c[0]; const z = e.target.closest(c[0].zeilen); if (z) CUR.set(c[0], kennZ(z));
      if (!e.target.closest(FELD)) setTimeout(() => { const w = wurzelVon(c[0]); if (!w) return; const a = document.activeElement;
        if (!a || a === document.body || !a.isConnected || a === w || w.contains(a) && !a.matches(FELD)) { fokusWurzel(w); markiere(aktuell(c[0], w)); } }, 0);
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.isComposing || document.querySelector('.modal-bg, .bed')) return;
      const a = ((e.target && e.target.ownerDocument) || document).activeElement;   // auch in eigenen Browserfenstern (seite.js)
      if (a && a.matches && a.matches(FELD)) { if ((confVon(a) || (window.bpBaumFelder && a.closest(window.bpBaumFelder))) && feldTaste(e, a)) halt(e); return; }
      if (e.key === 'F6') { if (f6(e.shiftKey)) halt(e); return; }
      let c = a && a !== document.body ? confVon(a) : null;
      if (!c && LETZT && (!a || a === document.body || !a.isConnected)) { const w = wurzelVon(LETZT); if (w) c = [LETZT, w]; }
      if (!c || (a && a !== c[1] && a.closest && a.closest('button, a, [contenteditable="true"]'))) return;
      if (zeilenTaste(e, c[0], c[1])) halt(e);
    });
  }
  window.bpBaum = { EINZUG, einzug, zelle, klapp, sicht, eltern, zeige, klappbar, rolle, tasten };
})();
