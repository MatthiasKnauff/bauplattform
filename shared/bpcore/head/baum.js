/* Baumtabelle – gemeinsamer Baustein (/bp/baum.js): Projekt → LV/Plan → Gliederung → Zeilen, als <table class="bp-baum">.
   Bisher: die Baumzelle (Einrückung, Dreieck, Symbol), ihr Aussehen (bp.css), das Auf-/Zuklappen, die Rollposition beim
   Neuzeichnen und die Tastatur (unten). Markieren und Ziehen stecken noch in der AVA und folgen hierher.

   bpBaum.zelle(o) → '<td class="… baumz">…</td>'   (o.leer: Knoten ohne Inhalt – ganz blasser Pfeil)
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
    return `<td class="${o.kl ? o.kl + ' ' : ''}baumz"${o.attr || ''}><div class="bz" style="${einzug(o.tiefe)}"><span class="car${o.auf == null && o.leer ? ' leer' : ''}"${o.klapp != null ? ` data-zu="${o.klapp}" title="${o.auf === false ? 'aufklappen' : 'zuklappen'}"` : ''}${o.car || ''}>${o.auf === true ? '▾' : o.auf === false || o.leer ? '▸' : ''}</span>${o.icon || ''}${o.html || ''}</div></td>`;
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
  const ZUSTAND = /^(akt|on|sel|zu|an|bp-kc|bp-kw|bp-feld)$/;   // bp-feld setzt erst die Höhenberechnung nach dem Zeichnen
  function rolle(w) {
    const alt = [], x0 = window.scrollX, y0 = window.scrollY;
    const sig = (el) => el.tagName.toLowerCase() + [...el.classList].filter((c) => !ZUSTAND.test(c)).map((c) => '.' + CSS.escape(c)).join('');
    if (w) w.querySelectorAll('*').forEach((el) => { if (el.scrollTop > 0 || el.scrollLeft > 0) { const s = sig(el); alt.push([s, [...w.querySelectorAll(s)].indexOf(el), el.scrollTop, el.scrollLeft]); } });
    return () => {
      alt.forEach(([s, i, t, l]) => { const el = w && w.querySelectorAll(s)[i]; if (el) { el.scrollTop = t; el.scrollLeft = l; } });
      if (Math.abs(window.scrollY - y0) > 1 || Math.abs(window.scrollX - x0) > 1) window.scrollTo(x0, y0);
    };
  }

  /* ---------- Anker: die angeklickte Zeile bleibt unter der Maus ----------
     const zurueck = bpBaum.anker(zeile); …neu zeichnen, anderes öffnen…; zurueck(sel) – sel: wie die Zeile danach zu finden ist
     (Standard: dieselbe Zeile). Rollt den Bereich um genau so viel, wie sich die Zeile verschoben hat (Zeilen darüber zugeklappt,
     Hinweis darüber eingeblendet). Reicht der Platz oben nicht (schon ganz oben), hält ein leerer Streifen über der Tabelle die
     Lage; er verschwindet unsichtbar, sobald weit genug gerollt wird, und beim nächsten Neuzeichnen. */
  const rollt = (n) => { let w = n.parentElement; while (w && w !== document.body && !(w.scrollHeight > w.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(w).overflowY))) w = w.parentElement; return w && w !== document.body ? w : null; };
  function anker(z, sel0) {
    if (!z) return () => {};
    const y0 = z.getBoundingClientRect().top, sel = sel0 || (() => { const t = z.closest('table'), a = [...z.attributes].filter((x) => x.name.startsWith('data-'));
      return a.length ? (t && t.className ? 'table.' + t.className.trim().split(/\s+/).map(CSS.escape).join('.') + ' ' : '') + 'tr' + a.map((x) => `[${x.name}="${CSS.escape(x.value)}"]`).join('') : null; })();
    return (s) => {
      const n = typeof s === 'string' ? document.querySelector(s) : s instanceof Element ? s : sel && document.querySelector(sel); if (!n) return;
      let d = n.getBoundingClientRect().top - y0; if (Math.abs(d) < 1) return;
      const w = rollt(n);
      if (!w) { scrollBy(0, d); return; }
      if (d < 0 && w.scrollTop + d < 0) {   // ganz oben: Platz schaffen statt springen
        const tb = n.closest('table'), sp = document.createElement('div'); sp.className = 'bp-anker'; sp.style.height = (-(w.scrollTop + d)) + 'px';
        (tb && tb.closest('.tblw') || tb || n).before(sp); d = n.getBoundingClientRect().top - y0;
        const weg = () => { if (!sp.isConnected) return w.removeEventListener('scroll', weg); if (w.scrollTop >= sp.offsetHeight) { const h = sp.offsetHeight; sp.remove(); w.scrollTop -= h; w.removeEventListener('scroll', weg); } };
        w.addEventListener('scroll', weg, { passive: true });
      }
      w.scrollTop += d;
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
       o.tabOhne    Auswahl von Feldern, die Tab überspringt (z. B. Art und KG im LV – erreichbar mit der Maus oder ↑↓/Enter in der Spalte)
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
  function markiereStill(z) { if (KC && KC !== z) KC.classList.remove('bp-kc'); KC = z || null; if (z) z.classList.add('bp-kc'); }   // ohne zu rollen
  function markiere(z) { markiereStill(z); if (z) mitte(z); }
  /* die aktive Zeile bleibt in der Mitte: verlässt sie beim Wandern mit der Tastatur das mittlere Feld (¼ … ¾ der Höhe), rollt der Bereich
     so, dass sie wieder mittig steht – innerhalb des mittleren Felds bewegt sich nichts (kein Springen bei jedem Schritt) */
  let TASTE = 0;   // Zeitpunkt der letzten Taste: nur Wandern mit der Tastatur stellt mittig, ein Mausklick (z. B. Auf-/Zuklappen) rollt nicht
  if (typeof document !== 'undefined') {   // im Rechentest (node) gibt es kein document
    document.addEventListener('keydown', () => { TASTE = Date.now(); }, true);
    document.addEventListener('pointerdown', () => { TASTE = 0; }, true);
  }
  function mitte(el) {
    if (Date.now() - TASTE > 400) { el.scrollIntoView({ block: 'nearest' }); return; }
    let p = el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) break; p = p.parentElement; }
    if (!p || p === document.body || p === document.documentElement) { el.scrollIntoView({ block: 'nearest' }); return; }
    const r = el.getBoundingClientRect(), b = p.getBoundingClientRect(), top = r.top - b.top;
    if (top < b.height * 0.25 || top + r.height > b.height * 0.75) p.scrollTop += top - (b.height - r.height) / 2;
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
    f.focus({ preventScroll: true }); mitte(f.closest('tr') || f);
    if (f.tagName === 'SELECT') return;
    try { if (ende) { const n = f.value.length; f.setSelectionRange(n, n); } else f.select(); } catch { /* Feldart ohne Auswahl */ }
  }
  function zeilenTaste(e, o, w) {
    let Z = zeilenVon(o, w); if (!Z.length) return false;
    let z = aktuell(o, w), i = Math.max(0, Z.indexOf(z)); const k = e.key;
    const F = fenster.von(w);   // große Tabelle: nur ein Ausschnitt steht auf der Seite – vor dem Sprung die Zielzeilen holen
    const hole = (kz) => { if (fenster.zeige(F.key, Math.max(0, Math.min(F.n - 1, kz)))) { Z = zeilenVon(o, w); if (!z.isConnected) z = aktuell(o, w); i = Math.max(0, Z.indexOf(z)); } };
    if (F && !e.altKey && !e.ctrlKey && !e.metaKey) { const kz = z.dataset.bpk != null ? +z.dataset.bpk : null;
      if (k === 'Home') hole(0); else if (k === 'End') hole(F.n - 1);
      else if (kz != null && (k === 'ArrowDown' || k === 'PageDown')) hole(kz + 12); else if (kz != null && (k === 'ArrowUp' || k === 'PageUp')) hole(kz - 12); }
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
        const t = tiefeVon(o, z);
        for (let lauf = 0; F && lauf < 80 && z.dataset.bpk != null; lauf++) {   // der Ordner darüber kann außerhalb des Ausschnitts liegen: Stück für Stück nach oben holen
          let da = false; for (let j = i - 1; j >= 0 && !da; j--) if (Z[j].dataset.bpk != null && tiefeVon(o, Z[j]) < t) da = true;
          const a0 = F.a; if (da || a0 === 0) break; hole(a0 - 30); if (F.a === a0) break;
        }
        for (let j = i - 1; j >= 0; j--) if (tiefeVon(o, Z[j]) < t) return zu(j); return true; }
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
    const c = confVon(t.tBodies[0] || t), unter = c && c[0].unterzeile, weg = c && c[0].tabOhne,
      ok = (f) => sichtbar(f) && !f.closest('thead,tfoot,.acts-c') && !OHNE.some((s) => f.matches(s)) && !(weg && f.matches(weg));
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
  /* Markieren – eine Regel für alle Bäume (wie im Explorer). Der Stand gehört der App: { akt, sel: Set, anker }.
       akt    die Zeile, auf der man steht (dahinter wird eingefügt) · sel  Mehrfachmarkierung · anker  Startzeile für Umschalt
     bpBaum.markiere(stand, ids, id, { umschalt, strg }) → neuer Stand
       ids  Kennungen aller Zeilen in Reihenfolge · id  die angeklickte Zeile
       Klick: nur diese Zeile · Strg+Klick: einzeln dazu oder weg · Umschalt+Klick: von der Ankerzeile bis hierher
     bpBaum.markiert(stand, ids) → die markierten Kennungen in Reihenfolge (Mehrfachmarkierung, sonst die Zeile, auf der man steht) */
  function markRegel(st, ids, id, o) {
    o = o || {}; let akt = st.akt, sel = new Set(st.sel || []), anker = st.anker;
    if (o.umschalt) {
      const a = ids.indexOf(anker != null ? anker : akt), b = ids.indexOf(id);
      sel = a < 0 || b < 0 ? new Set([id]) : new Set(ids.slice(Math.min(a, b), Math.max(a, b) + 1));
      akt = id;   // der Anker bleibt – ein weiterer Umschalt+Klick zieht den Bereich neu auf
    } else if (o.strg) {
      if (!sel.size && akt != null) sel.add(akt);
      if (sel.has(id)) { sel.delete(id); if (akt === id) akt = [...sel].pop() ?? null; } else { sel.add(id); akt = id; }
      anker = id;
    } else { sel = new Set([id]); akt = id; anker = id; }
    return { akt, sel, anker };
  }
  function markiert(st, ids) { const m = st.sel && st.sel.size ? st.sel : new Set(st.akt != null ? [st.akt] : []); return ids.filter((x) => m.has(x)); }
  /* ---------- Fenster: große Tabellen nur so weit aufbauen, wie man sie sieht (13.11.2026) ----------
     Eine Tabelle mit tausenden Zeilen macht jede Eingabe langsam – der Browser rechnet bei jeder Änderung Aussehen und Anordnung aller
     Elemente neu. Deshalb stehen nur die Zeilen im Bild (und ein Puffer davor und danach) wirklich auf der Seite; darüber und darunter
     hält je eine leere Zeile den Platz frei, damit der Rollbalken stimmt. Beim Rollen werden Zeilen nachgebaut und entfernte abgebaut.

       tbody.innerHTML = … + bpBaum.fenster.html(key, n, zeile, { um, nachher }) + …
         key      Name der Tabelle (eine je Ansicht, z. B. 'lv')
         n        Zahl der Einträge; zeile(k) → HTML des Eintrags k (ein oder mehrere <tr>) – wird beim Nachbauen neu aufgerufen und
                  muss deshalb den Stand von jetzt liefern (aus den Daten, nicht aus einer Kopie)
         um       Eintrag, der sicher dabei sein soll (z. B. die gerade angelegte Zeile)
         nachher  (tbody) → nach jedem Nachbauen: Markierungen, Summen u. Ä. an den neuen Zeilen setzen
         spalten  true: Spaltenbreiten festhalten (Tabellen, deren Spalten so breit sind wie ihr Inhalt) – eine Spalte wird beim Rollen nie
                  schmaler, nur breiter, wenn ein längerer Inhalt kommt; die erste Spalte (Baum) nimmt weiter den Rest
       bpBaum.fenster.zeige(key, k) → der Eintrag k steht danach auf der Seite; liefert sein erstes <tr> (zum Hinrollen, Fokussieren)
       Bis bpBaum.fenster.AB Einträge wird alles gebaut wie bisher. Tastatur (tasten), Pos1/Ende und „zum Ordner darüber“ kennen das Fenster. */
  const FEN = new Map(), F_PUFFER = 30, F_RAND = 10;
  const fenster = { AB: 120 };
  const fZeile = (S, k) => String(S.zeile(k)).replace(/<tr\b/g, `<tr data-bpk="${k}"`);
  const fTeil = (S, a, b) => { let h = ''; for (let k = a; k < b; k++) h += fZeile(S, k); return h; };
  const fLeer = (key, wo, px) => `<tr class="bp-fo" data-bpf="${key}" data-bpfo="${wo}" aria-hidden="true"><td style="height:${Math.max(0, Math.round(px))}px;padding:0;border:0"></td></tr>`;
  const fEnden = (S) => { const o = document.querySelector(`tr.bp-fo[data-bpf="${S.key}"][data-bpfo="o"]`), u = o && o.parentNode.querySelector(`:scope > tr.bp-fo[data-bpf="${S.key}"][data-bpfo="u"]`); return o && u ? [o, u] : null; };
  const fRoller = (el) => { for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) { const oy = getComputedStyle(a).overflowY; if ((oy === 'auto' || oy === 'scroll') && a.scrollHeight > a.clientHeight + 1) return a; } return null; };
  fenster.html = (key, n, zeile, o = {}) => {
    const alt = FEN.get(key);
    if (n <= fenster.AB) { FEN.delete(key); let h = ''; for (let k = 0; k < n; k++) h += zeile(k); return h; }
    const len = Math.min(n, Math.max(alt ? alt.b - alt.a : 0, 2 * F_PUFFER + 40));
    let a = alt ? alt.a : 0;
    if (o.um != null && o.um >= 0 && (o.um < a + 2 || o.um >= a + len - 2)) a = Math.round(o.um - len / 2);
    a = Math.max(0, Math.min(n - len, a));
    const S = { key, n, zeile, a, b: a + len, h: alt ? alt.h : 30, nachher: o.nachher, ziehen: false, spalten: !!o.spalten, sw: (o.spalten && alt && alt.sw) || [] };
    FEN.set(key, S); fPlane();   // nach dem Einsetzen prüfen, ob der Ausschnitt zur Rollposition passt
    return fLeer(key, 'o', S.a * S.h) + fTeil(S, S.a, S.b) + fLeer(key, 'u', (n - S.b) * S.h);
  };
  function fSchiebe(S, E, a2, b2) {
    const [o, u] = E, tb = o.parentNode;
    a2 = Math.max(0, Math.round(a2)); b2 = Math.min(S.n, Math.round(b2));
    if (S.ziehen) { a2 = Math.min(a2, S.a); b2 = Math.max(b2, S.b); }   // während des Ziehens nur anbauen – die gezogene Zeile muss bleiben
    if (a2 === S.a && b2 === S.b) return true;
    const ae = document.activeElement, atr = ae && ae.closest && ae.closest('tr[data-bpk]');
    if (atr && atr.parentNode === tb && (+atr.dataset.bpk < a2 || +atr.dataset.bpk >= b2)) { ae.blur(); if (!o.isConnected || FEN.get(S.key) !== S) return false; }   // Eingabe abschließen, bevor ihre Zeile geht
    const bleibt = a2 < S.b && b2 > S.a, halt = bleibt ? tb.querySelector(`:scope > tr[data-bpk="${Math.max(S.a, a2)}"]`) : null, y0 = halt ? halt.getBoundingClientRect().top : 0;
    for (const tr of [...tb.querySelectorAll(':scope > tr[data-bpk]')]) { const k = +tr.dataset.bpk; if (k < a2 || k >= b2) tr.remove(); }
    if (!bleibt) o.insertAdjacentHTML('afterend', fTeil(S, a2, b2));
    else { if (a2 < S.a) o.insertAdjacentHTML('afterend', fTeil(S, a2, S.a)); if (b2 > S.b) u.insertAdjacentHTML('beforebegin', fTeil(S, S.b, b2)); }
    S.a = a2; S.b = b2;
    o.firstElementChild.style.height = Math.round(S.a * S.h) + 'px'; u.firstElementChild.style.height = Math.round((S.n - S.b) * S.h) + 'px';
    if (halt) { const d = halt.getBoundingClientRect().top - y0; if (Math.abs(d) > 0.5) { const r = fRoller(tb); if (r) r.scrollTop += d; else window.scrollBy(0, d); } }   // was stehen bleibt, bleibt an seiner Stelle
    if (S.nachher) try { S.nachher(tb); } catch (e) { console.error(e); }
    if (S.spalten) fBreiten(S, tb);
    if (KC && !KC.isConnected && LETZT) { const w = wurzelVon(LETZT); if (w && (w === tb || w.contains(tb))) markiereStill(aktuell(LETZT, w)); }
    return true;
  }
  function fBreiten(S, tb) {   // Option spalten: gemessene Breite je Spalte als Mindestbreite an die Kopfzelle (außer der ersten)
    const t = tb.parentNode, k = t && t.tHead && t.tHead.rows[0]; if (!k || t.style.tableLayout === 'fixed') return;
    const W = [...k.cells].map((c) => c.getBoundingClientRect().width);
    [...k.cells].forEach((c, i) => { if (!i || !W[i]) return; const w = Math.max(S.sw[i] || 0, Math.ceil(W[i])); if (w !== S.sw[i]) { S.sw[i] = w; } if (c.style.minWidth !== w + 'px') c.style.minWidth = w + 'px'; });
  }
  function fPruef() {
    for (const S of FEN.values()) {
      const E = fEnden(S); if (!E) continue;
      if (S.spalten) fBreiten(S, E[0].parentNode);
      const [o, u] = E, ro = o.getBoundingClientRect(), ru = u.getBoundingClientRect();
      if (!ro.width && !ru.width) continue;   // Tabelle gerade nicht zu sehen
      const r = fRoller(o), vt = r ? Math.max(0, r.getBoundingClientRect().top) : 0, vb = r ? Math.min(innerHeight, r.getBoundingClientRect().bottom) : innerHeight;
      const hh = (ru.top - ro.bottom) / Math.max(1, S.b - S.a);
      if (hh > 6 && Math.abs(hh - S.h) > 0.15 * S.h) {   // gemessene Zeilenhöhe weicht deutlich von der Annahme ab: Platzhalter gleich anpassen (Rollbalken stimmt), Bild bleibt stehen
        const d = Math.round(S.a * hh) - Math.round(S.a * S.h); S.h = hh;
        o.firstElementChild.style.height = Math.round(S.a * S.h) + 'px'; u.firstElementChild.style.height = Math.round((S.n - S.b) * S.h) + 'px';
        if (d) { if (r) r.scrollTop += d; else window.scrollBy(0, d); }
        fPlane(); continue;
      }
      const erste = Math.max(0, Math.min(S.n - 1, Math.floor(S.a + (vt - ro.bottom) / S.h))), letzte = Math.max(0, Math.min(S.n, Math.ceil(S.b - (ru.top - vb) / S.h)));
      if ((erste - S.a < F_RAND && S.a > 0) || (S.b - letzte < F_RAND && S.b < S.n)) fSchiebe(S, E, erste - F_PUFFER, letzte + F_PUFFER);
    }
  }
  let fWartet = false;
  function fPlane() { if (fWartet || typeof requestAnimationFrame !== 'function') return; fWartet = true; requestAnimationFrame(() => { fWartet = false; fPruef(); }); }
  fenster.zeige = (key, k) => {
    const S = FEN.get(key), E = S && fEnden(S); if (!E || !(k >= 0 && k < S.n)) return null;
    if (k < S.a + 2 || k >= S.b - 2) { const len = S.b - S.a, a2 = Math.max(0, Math.min(S.n - len, Math.round(k - len / 2))); if (!fSchiebe(S, E, a2, a2 + len)) return null; }
    return E[0].parentNode.querySelector(`:scope > tr[data-bpk="${k}"]`);
  };
  fenster.von = (el) => { const f = el && el.querySelector && el.querySelector('tr.bp-fo'); return (f && FEN.get(f.dataset.bpf)) || null; };
  if (typeof document !== 'undefined') {
    document.addEventListener('scroll', fPlane, { capture: true, passive: true });
    window.addEventListener('resize', fPlane);
    const zieh = (an) => (e) => { const tr = e.target && e.target.closest && e.target.closest('tr[data-bpk]'); for (const S of FEN.values()) S.ziehen = an && !!tr; if (!an) fPlane(); };
    document.addEventListener('dragstart', zieh(true), true); document.addEventListener('dragend', zieh(false), true); document.addEventListener('drop', zieh(false), true);
  }
  window.bpBaum = { EINZUG, einzug, zelle, klapp, sicht, eltern, zeige, klappbar, rolle, anker, tasten, markiere: markRegel, markiert, fenster };
})();
