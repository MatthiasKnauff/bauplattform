/* Spaltenbreiten am Spaltenkopf ziehen – gemeinsamer Baustein (/bp/spaltbreite.js, im Bündel; 22.11.2026 aus der Ausschreibung herausgelöst,
   „bei den Bauteilen kann ich die Spaltenbreite nicht anpassen“). Wie in Excel: nur die gezogene Spalte ändert sich, die letzte nimmt den Rest;
   gemerkt je Tabelle und Person im Browser, proportional zum Platz; Doppelklick auf den Griff: zurücksetzen. Zahlen und kurze Werte werden nie abgeschnitten.
     bpSpaltBreite.an(table, schluessel, { ls })   Griffe an die Kopfzeile (einmal je Tabelle – nach jedem Neuzeichnen wieder aufrufen)
                                                    ls = bpLS('<app>.') (Vorgabe bpLS('bp.')) – Ort im Browser, Eintrag „sb“
     bpSpaltBreite.vergessen(vorsilbe, ls)          gemerkte Breiten aller Tabellen, deren Schlüssel so beginnt, verwerfen (nach Spaltenwahl) → true, wenn etwas weg ist
   Stil: .sb-griff, body.sb-zieh, table.sb-fest (bp.css). */
(() => {
  if (window.bpSpaltBreite) return;
  const lsVor = () => bpLS('bp.');
  function an(t, key, o = {}) {
    const tr = t && t.tHead && t.tHead.rows[0]; if (!tr || t.dataset.sb) return; t.dataset.sb = '1';
    const ls = o.ls || lsVor(), SB = ls.get('sb', {}), w = SB[key] || {};
    const merk = () => { const S = ls.get('sb', {}); if (SB[key]) S[key] = SB[key]; else delete S[key]; ls.set('sb', S); };   // nur diese Tabelle – die anderen bleiben, wie sie gerade gemerkt sind
  const alle = [...tr.children], thsJ = () => alle.filter((h) => getComputedStyle(h).display !== 'none');   // jedes Mal neu: ⚙ Spalten blendet erst nach dem ersten Bild aus   // auch Spalten ohne Breite (ausgeblendet) zählen nicht   // ausgeblendete Spalten (⚙ Spalten) zählen nicht – sonst wäre die „letzteJ()“ unsichtbar und könnte den Rest nicht nehmen
  // wie in Excel: nur die gezogene Spalte ändert sich, alles rechts davon rückt nach; die letzte Spalte nimmt den Rest der Breite
  // nie ein leerer Bereich neben der Tabelle: beim Ziehen nimmt die letzte Spalte den Rest bis zum Rand
  const breite = () => { const sum = thsJ().slice(0, -1).reduce((a, h) => a + (parseFloat(h.style.width) || h.getBoundingClientRect().width), 0); t.style.width = Math.max(sum + 90, platz()) + 'px'; };
  const fest = (ohneBreite) => { if (t.style.tableLayout === 'fixed') return; const v = thsJ(), W = v.map((h) => Math.round(h.getBoundingClientRect().width));   // erst alle messen, dann setzen – abwechselnd rechnete der Browser die Tabelle je Spalte neu
    v.forEach((h, i) => { if (i === v.length - 1) { h.style.width = ''; h.style.minWidth = '90px'; return; } h.style.width = W[i] + 'px'; h.style.minWidth = '0'; }); t.style.tableLayout = 'fixed'; t.classList.add('sb-fest'); if (!ohneBreite) breite(); };
  // proportional: gemerkt wird die Breite, die der Platz beim Ziehen hatte (_b) – wird der Platz breiter oder schmaler (Trenner, Fenster), wachsen bzw. schrumpfen alle Spalten im selben Verhältnis
  // schmalste Breite einer Spalte: so breit wie die längste Zahl bzw. der längste kurze Wert (Feld oder Text) – nichts wird abgeschnitten
  const cv = document.createElement('canvas').getContext('2d');
  const minZahl = (j) => { let w = 0; if (j === 0 && t.classList.contains('baum')) return 120;   // Baumspalte: Text bricht um – darf schmal werden (nicht unter 120 px)
    const R = t.tBodies[0] ? [...t.tBodies[0].rows].slice(0, 400) : [];   // j = Index der Zelle in der Zeile
    for (const row of R) { if (row.cells.length !== alle.length) continue; const c = row.cells[j]; if (!c) continue;
      const cs = getComputedStyle(c), inp = c.querySelector('input:not([type=checkbox]),select');
      if (inp) {   // Zahl in einem Eingabefeld (Aufträge): Text des Felds messen
        const is = getComputedStyle(inp); if (!String(inp.value).trim() || (j === 0 && inp.value.length > 14)) continue;   // jedes Feld mit kurzem Inhalt (Zahl, KG, Art, EH) – nie abgeschnitten
        cv.font = `${is.fontWeight} ${is.fontSize} ${is.fontFamily}`; w = Math.max(w, Math.ceil(cv.measureText(inp.value).width + parseFloat(is.paddingLeft) + parseFloat(is.paddingRight) + parseFloat(is.borderLeftWidth) * 2 + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 4); continue; }
      if (!c.textContent.trim() || c.querySelector('textarea')) continue;
      if (cs.textAlign !== 'right' && cs.textAlign !== 'end' && c.textContent.trim().length > 12) continue;   // Zahlen und kurze Werte (KG, EH, Art) ganz zeigen – lange Texte dürfen umbrechen
      cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;   // Text auf der Leinwand messen statt mit getBoundingClientRect – das zwingt den Browser nicht zur Anordnung der ganzen Tabelle (17.11.2026)
      w = Math.max(w, Math.ceil(cv.measureText(c.textContent.trim()).width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 2); }
    return w; };
  const platz = () => { const e = t.parentElement; if (!e) return 0; const cs = getComputedStyle(e); return e.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0); };   // Innenbreite
  const anwenden = () => { const s = SB[key]; if (!s || !t.isConnected) return; const p = platz(); if (!p) return;
    if (!s._b) { s._b = p; merk(); }
    const f = p / s._b, v = thsJ(), mz = v.map((h, i) => (i === v.length - 1 || !s[h.cellIndex] ? 0 : minZahl(h.cellIndex)));   // alles messen, bevor die erste Breite gesetzt wird (ein Rechengang statt einer je Spalte)
    fest(true); let sum = 0;   // die Gesamtbreite setzt die letzte Zeile hier
    v.forEach((h, i) => { const j = h.cellIndex; if (i === v.length - 1 || !s[j]) return; const b = Math.max(36, mz[i], Math.round(s[j] * f)); h.style.width = b + 'px'; sum += b; });
    let rest = Math.max(90, Math.round((s._t ? s._t - Object.keys(s).filter((k) => /^\d+$/.test(k)).reduce((a, k) => a + s[k], 0) : 90) * f));
    if (sum + rest < p - 1) {   // schmaler als der Platz: alle Spalten im selben Verhältnis breiter, bis die Tabelle den Platz füllt
      const g = (p - 1) / (sum + rest); sum = 0; v.forEach((h, i) => { if (i === v.length - 1 || !h.style.width) return; const b = Math.round(parseFloat(h.style.width) * g); h.style.width = b + 'px'; sum += b; }); rest = Math.max(90, p - 1 - sum); }
    t.style.width = (sum + rest) + 'px'; };
  if (!Object.keys(w).length) t.style.minWidth = '100%';   // ohne eigene Breiten: der Browser verteilt den Platz auf alle Spalten
  if (Object.keys(w).length) anwenden();
  /* Breite des Platzes: erst beim ersten Melden des Beobachters merken (der meldet sich von selbst, nachdem der Browser ohnehin angeordnet hat) –
     ein Lesen hier mitten im Aufbau zwang ihn, die ganze neue Tabelle vorzeitig anzuordnen (17.11.2026) */
  if (window.ResizeObserver && t.parentElement) { let alt = null; const ro = new ResizeObserver(() => { if (!t.isConnected) { ro.disconnect(); return; } if (document.body.classList.contains('sb-zieh')) return; const p = platz(); if (alt === null || Math.abs(p - alt) < 2) { alt = alt === null ? p : alt; return; } alt = p; anwenden(); }); ro.observe(t.parentElement); }   // gleich (noch vor dem Bild) – mit requestAnimationFrame war ein Bild lang die alte Breite zu sehen: die Tabelle flackerte beim Speichern
  const TH = thsJ(), statisch = TH.map((th) => getComputedStyle(th).position === 'static');   // erst alle lesen, dann schreiben (sonst rechnet der Browser je Spalte die Stile neu)
  TH.forEach((th, i, v) => {
    if (i === v.length - 1) return;
    const ci = th.cellIndex;
    if (statisch[i]) th.style.position = 'relative';   // sticky Kopfzeilen bleiben sticky (sonst rutschte der Kopf um „top“ nach unten)
    const g = document.createElement('span'); g.className = 'sb-griff'; g.title = 'Spaltenbreite ziehen · Doppelklick: zurücksetzen'; th.appendChild(g);
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); fest(); g.setPointerCapture(e.pointerId);
      const x0 = e.clientX, w0 = th.getBoundingClientRect().width, mz = minZahl(ci); document.body.classList.add('sb-zieh');
      g.onpointermove = (m) => { th.style.width = Math.max(36, mz, w0 + m.clientX - x0) + 'px'; breite(); };   // Zahlen bleiben ganz lesbar
      g.onpointerup = () => { g.onpointermove = null; document.body.classList.remove('sb-zieh'); SB[key] = {}; thsJ().forEach((h, i, v) => { if (i !== v.length - 1) SB[key][h.cellIndex] = Math.round(h.getBoundingClientRect().width); }); SB[key]._b = platz(); SB[key]._t = Math.round(t.getBoundingClientRect().width); merk(); };
    });
    g.addEventListener('dblclick', (e) => { e.stopPropagation(); e.preventDefault(); delete SB[key]; merk(); thsJ().forEach((h) => { h.style.width = ''; h.style.minWidth = ''; }); t.style.tableLayout = ''; t.classList.remove('sb-fest'); t.style.width = ''; t.style.minWidth = '100%'; toast('Spaltenbreiten zurückgesetzt.'); });
    g.addEventListener('click', (e) => e.stopPropagation());
  });
  }
  function vergessen(vor, ls) {
    ls = ls || lsVor(); const S = ls.get('sb', {}); let weg = false;
    Object.keys(S).forEach((k) => { if (k.startsWith(vor)) { delete S[k]; weg = true; } });
    if (weg) ls.set('sb', S); return weg;
  }
  window.bpSpaltBreite = { an, vergessen };
})();
