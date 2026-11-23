'use strict';
/* Ansehen-Fenster für Fotos und PDFs, PDF im Bereich (pdfIn), gemeinsames Markieren – aus head.js ausgelagert (23.11.2026): geladen erst, wenn es gebraucht wird (BPHead.baustein('ansehen')).
   Gemeinsame Hilfen der Kopfleiste über BPHead._i (head.js). */
(function () {
  const H = window.BPHead, { esc, KX, pdfRoller } = H._i;
  let pdfjsP = null;
  function pdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsP) return pdfjsP;
    /* pdf.js als Modul – EINE Fassung im Kern (shared/bpcore/vendor/pdfjs, legacy; Workflow „pdf.js aktualisieren“), in jeder App unter bp/pdfjs/ */
    const [b0, vq] = window.BP_HEAD_BASIS, base = new URL(b0 + 'pdfjs/', document.baseURI).href;
    pdfjsP = import(base + 'pdf.mjs' + vq).then((m) => { m.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.mjs' + vq; window.pdfjsLib = m; return m; })
      .catch(() => { pdfjsP = null; throw new Error('PDF-Anzeige nicht verfügbar'); });
    return pdfjsP;
  }
  let gv = null;
  /* Größte Fläche je Zeichenfläche (Pixel): iOS/iPadOS stürzt ab oder bleibt weiß, wenn Canvas zu groß werden – ältere Geräte
     (iOS/Safari < 15) vertragen deutlich weniger. Aktuelle Geräte behalten die volle Schärfe (bis an die Grenze, die Safari ohnehin hat). */
  const CANVAS_MAX = (() => {
    const ua = navigator.userAgent || '', ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (!ios) return 32e6;
    const v = /OS (\d+)_\d+.* like Mac OS X/.exec(ua) || /Version\/(\d+)/.exec(ua);
    return v && +v[1] < 15 ? 4e6 : 16e6;
  })();
  const canvasMass = (w, h) => { const f = Math.min(1, Math.sqrt(CANVAS_MAX / Math.max(1, w * h))); return [Math.floor(w * f), Math.floor(h * f), f]; };
  /* Eine PDF-Seite zeichnen – ein Weg für pdfIn, Ansehen, Druckseite, Editoren: H.pdfSeite(seite, breiteCssPx, {doc, klasse, scharf, annot}) → {cv, v (CSS-Pixel), sc, feld(rect) → {left, top, width, height}, fertig} */
  H.pdfSeite = function (pg, breite, o = {}) {
    const doc = o.doc || document, v0 = pg.getViewport({ scale: 1 }), sc = breite / v0.width, dpr = Math.min(2, Math.max((doc.defaultView || window).devicePixelRatio || 1, o.scharf ? 2 : 1));
    const vv = pg.getViewport({ scale: sc * dpr * canvasMass(v0.width * sc * dpr, v0.height * sc * dpr)[2] }), cv = Object.assign(doc.createElement('canvas'), { width: vv.width, height: vv.height, className: o.klasse || '' });
    const v = pg.getViewport({ scale: sc });
    const feld = (r) => { const [x1, y1] = v.convertToViewportPoint(r[0], r[1]), [x2, y2] = v.convertToViewportPoint(r[2], r[3]); return { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }; };   // Rechteck eines Formularfelds in CSS-Pixeln (pdf.js 6 kennt convertToViewportRectangle nicht mehr)
    return { cv, sc, v, feld, fertig: pg.render({ canvas: cv, canvasContext: cv.getContext('2d'), viewport: vv, ...(o.annot != null ? { annotationMode: o.annot } : {}) }).promise };
  }; H.pdfLib = () => pdfjs();
  /* PDF im Bereich rechts (z. B. Vorschau des Tagesberichts): alle Seiten untereinander, auf die Breite des Bereichs – statt <iframe>,
     das in manchen Browsern (Safari/iPad, schmale Bereiche) nur die erste Seite zeigt. BPHead.pdfIn(el, url, {ziel, top}) → Promise(Seitenzahl).
     Benannte Ziele des PDFs (z. B. „schritt-grundstueck“) lassen sich anspringen: o.ziel beim Laden, später BPHead.pdfZiel(el, name);
     o.top stellt nach dem Neuladen dieselbe Rollposition wieder her. */
  function pdfWunsch(el, fertig) {
    const w = el._pdfWunsch, cvs = el.querySelectorAll(':scope > canvas.bph-pdfs, :scope > div > canvas'); if (!w) return;
    const sc = pdfRoller(el) || pdfRoller(el.parentElement); if (!sc) { if (fertig) el._pdfWunsch = null; return; }
    if (w.top != null) {   // wieder an dieselbe Stelle, sobald so viel gezeichnet ist
      const letzte = cvs[cvs.length - 1];
      if (!fertig && (!letzte || letzte.offsetTop + letzte.offsetHeight < w.top + sc.clientHeight)) return;
      sc.scrollTop = w.top; el._pdfWunsch = null; return;
    }
    const z = (el._pdfZiele || {})[w.ziel], cv = z && cvs[z.seite];
    if (!cv) { if (fertig) el._pdfWunsch = null; return; }
    const r = cv.getBoundingClientRect(), rs = sc.getBoundingClientRect();
    sc.scrollTo({ top: Math.max(0, sc.scrollTop + r.top - rs.top + z.y * r.height - 8), behavior: w.sanft ? 'smooth' : 'auto' });
    el._pdfWunsch = null;
  }
  H.pdfZiel = function (el, name) { if (!el) return; el._pdfWunsch = { ziel: name, sanft: true }; pdfWunsch(el, !el._pdfLaeuft); };
  H.pdfIn = async function (el, url, o = {}) {   // o.box: jede Seite in ein <div class=o.box> (Druckseite, Zoom über --bpz) · o.breite: höchstens so breit · alte Seiten bleiben bis zum Tausch stehen
    const my = (el._pdfTok = (el._pdfTok || 0) + 1);
    el.classList.add('bph-pdfin'); const alt = !!el.querySelector('canvas'); if (!alt) el.innerHTML = '<div class="bph-gvl">Lade …</div>';   // alte Seiten bleiben stehen, bis die neuen fertig sind
    el._pdfZiele = {}; el._pdfLaeuft = true;
    el._pdfWunsch = o.ziel ? { ziel: o.ziel } : o.top ? { top: o.top } : null;
    try {
      const lib = await pdfjs();
      const data = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' })   // nachfragen statt neu laden: unverändert → aus dem Browser (ETag)
        .then((r) => { if (!r.ok) return r.json().catch(() => ({})).then((j) => { throw new Error(j.error || 'PDF nicht lesbar (' + r.status + ')'); }); return r.arrayBuffer(); });
      if (my !== el._pdfTok) return 0;
      if (o.daten) el._pdfDaten = data.slice(0);   // für „PDF“ / „Drucken“ ohne zweiten Abruf
      const doc = el.ownerDocument || document;   // im eigenen Browserfenster (⇱): Schriften dort anmelden, sonst erscheinen Kästchen statt Buchstaben
      const pdf = await lib.getDocument({ isEvalSupported: false, data, ownerDocument: doc }).promise;
      const ziele = {};   // benannte Ziele: {name: {seite, top}} – y als Anteil der Seite ergibt sich beim Zeichnen
      try { const Dz = (await pdf.getDestinations()) || {};
        for (const [k, d] of Object.entries(Dz)) { if (!Array.isArray(d) || d[0] == null) continue;
          const s = typeof d[0] === 'number' ? d[0] : await pdf.getPageIndex(d[0]), art = d[1] && d[1].name;
          ziele[k] = { seite: s, top: art === 'XYZ' ? d[3] : art === 'FitH' || art === 'FitBH' ? d[2] : null, y: 0 }; } } catch (e) { /* PDF ohne Ziele */ }
      if (my !== el._pdfTok) return 0;
      el._pdfZiele = ziele;
      const w = Math.min(o.breite || 1e9, Math.max(240, (el.clientWidth || 600) - (o.box ? 24 : 16)));
      const Z = alt ? doc.createElement('div') : el; if (!alt) el.innerHTML = '';   // neu gezeichnet wird daneben, dann in einem Zug getauscht
      for (let n = 1; n <= pdf.numPages && my === el._pdfTok; n++) {
        const pg = await pdf.getPage(n), S = H.pdfSeite(pg, w, { doc, klasse: o.box ? '' : 'bph-pdfs', scharf: pdf.numPages <= 12 });
        if (o.box) { const b = doc.createElement('div'); b.className = o.box; b.dataset.seite = n; b.style.width = S.v.width + 'px'; b.style.height = S.v.height + 'px'; b.appendChild(S.cv); Z.appendChild(b); } else Z.appendChild(S.cv);
        S.cv.setAttribute('aria-label', 'Seite ' + n);
        Object.values(ziele).forEach((z) => { if (z.seite === n - 1 && z.top != null) { const [, y0, , y1] = pg.view; z.y = Math.max(0, Math.min(1, (y1 - z.top) / ((y1 - y0) || 1))); } });
        await S.fertig;
        if (my === el._pdfTok && Z === el) pdfWunsch(el, false);
      }
      if (my === el._pdfTok) { if (Z !== el) el.replaceChildren(...Z.childNodes); el._pdfLaeuft = false; pdfWunsch(el, true); }
      return pdf.numPages;
    } catch (e) { if (my === el._pdfTok) { el._pdfLaeuft = false; el._pdfWunsch = null; el.innerHTML = `<div class="bph-gvl">${esc(e.message || 'PDF nicht lesbar')}</div>`; } return 0; }
  };
  H.pdfDrucken = function (u) {   // PDF (auch blob:) direkt drucken – am Handy im neuen Tab, dort über Teilen
    if (/iPhone|iPad|Android/i.test(navigator.userAgent)) { window.open(u, '_blank'); return; }
    const f = Object.assign(document.createElement('iframe'), { src: u, onload: () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(u, '_blank'); } setTimeout(() => f.remove(), 60000); } });
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(f);
  };
  /* ✍ Unterschreiben (unterschrift.js) lädt mit dem Fenster – erst wenn es da ist, öffnet das Fenster, sonst fehlte der Knopf beim ersten Mal */
  const US = H.baustein('unterschrift').catch(() => {});
  H.ansehen = (items, start = 0) => (window.bpUnterschrift ? ansehen0(items, start) : US.then(() => ansehen0(items, start)));
  function ansehen0(items, start) {
    items = (items || []).filter((x) => x && x.url); if (!items.length) return;
    if (gv) gv.close(true);
    const el = document.createElement('div'); el.className = 'bph-gv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Ansicht');
    /* Aufbau wie der eingebaute Viewer (Mock 11.11.2026): schmale Leiste oben (am Handy blendet sie sich beim Scrollen aus, Antippen holt sie),
       am PC links die Pläne der Reihe als kleine Bilder, Zoom oben; Markieren-Werkzeuge in einer Leiste unten, Weiteres im Menü ⋯ */
    el.innerHTML = `<div class="bph-gvb"><button type="button" data-gv="x" aria-label="Schließen">✕</button><span class="bph-gvt"></span><span class="bph-gvn"></span>
      <span class="bph-gva"><button type="button" data-gv="ml" class="bph-gvbt" title="Per Mail senden (mit Unterschrift und Markierungen)" hidden><i>✉</i>Senden</button><button type="button" data-gv="ab" class="bph-gvbt" title="Im Projektordner ablegen" hidden><i>📁</i>Ablegen</button><button type="button" data-gv="dr" class="bph-gvbt" title="Drucken (mit Markierungen)"><i>🖨</i>Drucken</button><button type="button" data-gv="dl" class="bph-gvbt" title="Teilen / speichern (mit Markierungen)"><i>⤓</i>Speichern</button><span class="bph-gvsep"></span>
      <button type="button" data-gv="sk" class="bph-skb bph-gvbt" title="Markieren – auch gemeinsam mit Kolleg:innen gleichzeitig" hidden><i>✎</i>Markieren</button><button type="button" data-sk="gemeinsam" class="bph-gvge bph-gvbt" title="Gemeinsam markieren – Kolleg:innen oder Externe einladen" hidden><i>👥</i>Gemeinsam</button><button type="button" data-gv="us" class="bph-gvus bph-gvbt" title="Unterschreiben oder stempeln – deine Unterschrift liegt gleich auf der letzten Seite, Stempel des Büros über 🔖" hidden><i>✍</i>Unterschreiben</button><span class="bph-gvsep"></span></span>
      <span class="bph-gvz bp-zoom"><button type="button" data-gv="zm" aria-label="Verkleinern">−</button><button type="button" data-gv="fb" class="bph-gvzp" title="Auf Breite (zurück auf 100 %)">100 %</button><button type="button" data-gv="zp" aria-label="Vergrößern">+</button><button type="button" data-gv="fs" title="Ganze Seite">▢</button></span>
      <button type="button" data-gv="me" aria-label="Mehr" title="Mehr">⋯</button><button type="button" data-sk="ende" class="bph-gvf" hidden title="Markieren beenden (die Skizze bleibt gespeichert)">Fertig</button></div>
      <div class="bph-gvm" hidden></div>
      <div class="bph-gvk"><div class="bph-gvth" hidden></div><div class="bph-gvs"></div></div>
      <div class="bph-skl" hidden></div><div class="bph-gvd" hidden></div><div class="bph-gvmk" hidden><button type="button" data-gv="ml" hidden><i>✉</i>Senden</button><button type="button" data-gv="ab" hidden><i>📁</i>Ablegen</button><button type="button" data-gv="sk"><i>✎</i>Markieren</button><button type="button" data-gv="us" hidden><i>✍</i>Unterschr.</button><button type="button" data-gv="me"><i>⋯</i>Mehr</button></div>
      <div class="bph-skm" hidden><button type="button" data-skm="stift" title="Zeichnen">✏️</button><button type="button" data-skm="zeigen" title="Nur zeigen / blättern">☝</button><button type="button" data-skm="zurueck" title="Letzten Strich zurück">↶</button><button type="button" data-skm="voll" title="Leisten wieder einblenden">⤡</button></div>
      <button type="button" class="bph-gvp" data-gv="prev" aria-label="Vorheriges">‹</button><button type="button" class="bph-gvp n" data-gv="next" aria-label="Nächstes">›</button>`;
    document.body.appendChild(el); document.body.classList.add('bph-gv-offen');
    if (H.GAST) el.querySelectorAll('[data-gv="dr"],[data-gv="dl"],[data-gv="x"]').forEach((b) => { b.hidden = true; });
    const TOUCH = matchMedia('(pointer:coarse)').matches, ENG = () => innerWidth < 760;   // Gäste: nur ansehen und markieren
    const S = el.querySelector('.bph-gvs'); S.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey) || !pdf) return; e.preventDefault(); setZoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });   // Strg + Mausrad wie auf der Druckseite
    let i = Math.max(0, Math.min(items.length - 1, start)), zoom = 1, tok = 0, pdf = null, roh = null, hoch = 1.414;   // hoch: Seitenverhältnis der ersten Seite (für „Ganze Seite“)
    const SK = { id: null, striche: [], seq: 0, werkzeug: 'stift', farbe: '#e5484d', leute: [], t: 0, zt: 0, owner: null, aus: false, dauerhaft: false, dauer: null };
    { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'markwahl.js' + v;   // erst mit der Ansicht geladen
      sc.onload = () => { MW = bpMarkWahl.einrichten({ el, S, SK, SKJ, ich, zeichnen: skZeichnen, abgleich: skAbgleich }); alleZeichnen(); }; if (window.bpMarkWahl) Promise.resolve().then(sc.onload); else document.head.appendChild(sc); }
    const fitW = () => Math.max(320, Math.min((S.clientWidth || window.innerWidth) - 16, 1400));
    async function show() {
      const x = items[i], my = ++tok; zoom = 1; pdf = null;
      el.querySelector('.bph-gvt').textContent = x.name || '';
      el.querySelector('.bph-gvn').textContent = items.length > 1 ? `${i + 1} / ${items.length}` : '';
      el.querySelectorAll('.bph-gvp').forEach((b) => { b.hidden = items.length < 2 || TOUCH || !TH.hidden; });   // Handy: wischen · PC mit Seitenleiste: Liste
      S.scrollTop = 0; S.innerHTML = '<div class="bph-gvl">Lade …</div>'; zoomText();
      leisten();
      TH.querySelectorAll('[data-gvi]').forEach((b) => b.classList.toggle('on', +b.dataset.gvi === i));
      const on = TH.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
      const D = el.querySelector('.bph-gvd'); D.hidden = items.length < 2 || !(TOUCH || ENG());
      D.innerHTML = items.length > 12 ? `${i + 1} / ${items.length}` : items.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
      if (SK.id && !x.skizze) skEnde(true);
      if (!SK.id) { SK.striche = []; SK.dauer = null; skKnopf(); }
      if (x.typ !== 'pdf') { S.innerHTML = `<img class="bph-gvi" src="${esc(x.url)}" alt="${esc(x.name || '')}">`; return; }
      try {
        const lib = await pdfjs();
        const data = await fetch(x.url, { credentials: 'same-origin' }).then((r) => { if (!r.ok) throw new Error(r.status === 403 ? 'Keine Einladung zu dieser Skizze.' : 'Datei nicht lesbar (' + r.status + ')'); return r.arrayBuffer(); });
        if (my !== tok) return;
        roh = data.slice(0);
        pdf = await lib.getDocument({ isEvalSupported: false, data }).promise;
        await renderPdf(my); seiten(my);
        if (x.skizze && SK.id !== x.skizze) skBeitreten(x.skizze); else if (!x.skizze) skDauerSuchen(my);
      } catch (e) { if (my === tok) S.innerHTML = `<div class="bph-gvl">${esc(e.message || 'PDF nicht lesbar')}<br><a href="${esc(x.url)}" download>Datei herunterladen</a></div>`; }
    }
    function seiten(my) {   // D (17.11.2026): bei einem PDF ab 3 Seiten am Rechner links die Seiten als kleine Bilder zum Springen
      if (items.length > 1 || TOUCH || innerWidth < 900 || !pdf || pdf.numPages < 3) { if (items.length < 2) TH.hidden = true; return; }
      TH.hidden = false; TH.innerHTML = Array.from({ length: pdf.numPages }, (_, k) => `<button type="button" data-gvs="${k + 1}"${k ? '' : ' class="on"'}><span class="bph-gvtb"><canvas></canvas></span><small>Seite ${k + 1}</small></button>`).join('');
      el.querySelector('.bph-gvn').textContent = pdf.numPages + ' Seiten';
      const io = new IntersectionObserver((E) => E.forEach(async (en) => { if (!en.isIntersecting || my !== tok) return; io.unobserve(en.target);
        try { const pg = await pdf.getPage(+en.target.dataset.gvs), cv = en.target.querySelector('canvas'), v0 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: 240 / v0.width }); cv.width = v.width; cv.height = v.height; await pg.render({ canvas: cv, canvasContext: cv.getContext('2d'), viewport: v }).promise; } catch { /* ohne Bildchen */ } }), { root: TH });
      TH.querySelectorAll('[data-gvs]').forEach((b) => io.observe(b));
    }
    async function renderPdf(my) {
      if (!pdf) return;
      S.innerHTML = '';
      for (let n = 1; n <= pdf.numPages && my === tok; n++) {
        const pg = await pdf.getPage(n), P = H.pdfSeite(pg, fitW() * zoom, { klasse: 'bph-gvc' }); if (n === 1) hoch = P.v.height / P.v.width;
        const wr = document.createElement('div'); wr.className = 'bph-pg'; wr.dataset.seite = n; wr.style.width = (zoom * 100) + '%';
        const ov = document.createElement('canvas'); ov.className = 'bph-skc';
        wr.append(P.cv, ov); S.appendChild(wr);
        await P.fertig;
        skZeichnen(n);
      }
      skModus();
    }
    /* ---------- Markieren, auch gemeinsam: Striche relativ zur Seite (0…1), Abgleich alle 0,7 s (siehe bpcore/skizze.py) ---------- */
    const SKW = { stift: ['✏️', 'Stift', 0.0022], marker: ['🖍', 'Marker', 0.011], pfeil: ['↗', 'Pfeil', 0.0025], rechteck: ['▭', 'Rechteck', 0.0025], text: ['T', 'Text', 0.0045], haken: ['✔', 'Haken (grün) – geprüft, in Ordnung', 0.004], kreuz: ['✘', 'Kreuz (rot) – gestrichen / nicht anerkannt', 0.004], radier: ['🧽', 'Radiergummi – über Markierungen wischen löscht sie', 0], unterschrift: ['✍', 'Unterschreiben – liegt auf dem Plan, beim Senden, Ablegen und Drucken eingesetzt', 0], zeigen: ['☝', 'Zeigen / auswählen – Markierung antippen, dann ✕ oder Entf', 0] };
    let MW = null;   // markwahl.js: auswählen, radieren, Unterschrift als Ebene (GO 17.11.2026)
    /* Gäste ohne Anmeldung (H.GAST, Seite /gast/<Link>): dieselben Aufrufe gehen an api/bp/gast/<Link>/… – nur Stand, Strich, Löschen (eigene), Zeiger */
    const gastUrl = (u) => { const m = /^api\/bp\/skizze\/[\w-]+(?:\/(strich|loeschen|zeiger))?(\?.*)?$/.exec(u); if (!m) throw new Error('Für Gäste nicht verfügbar'); return `api/bp/gast/${encodeURIComponent(H.GAST.token)}/${m[1] || 'stand'}${m[2] || ''}`; };
    const SKJ = (u, m, b) => {
      if (!H.GAST) return KX(u, m ? { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) } : {});
      const h = { 'X-Gast-Id': H.GAST.id, 'X-Gast-Name': encodeURIComponent(H.GAST.name) };
      return KX(gastUrl(u), m ? { method: m, headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) } : { headers: h });
    };
    const ich = () => (H.me && H.me.id) || null;
    function skLeiste() {
      const L = el.querySelector('.bph-skl'); L.hidden = !SK.id;
      if (!SK.id) return;
      const andere = SK.leute.filter((p) => p.uid !== ich() && p.aktiv);
      const html = `${Object.entries(SKW).filter(([k]) => k !== 'unterschrift' || (!H.GAST && window.bpUnterschrift)).map(([k, [ic, t]]) => `<button type="button" data-skw="${k}" class="${SK.werkzeug === k ? 'on' : ''}" title="${t}">${ic}</button>`).join('')}
        <span class="bph-skf" style="background:${SK.farbe}" title="deine Farbe"></span><button type="button" data-sk="zurueck" title="Meinen letzten Strich zurücknehmen">↶</button>
        <span class="bph-skp" title="Wer gerade mitmarkiert">${andere.length ? andere.map((p) => `<i style="background:${p.farbe}"></i>${esc(p.name.split(' ')[0])}`).join(' ') : ''}</span>`;   // Behalten, Einladen, PDF, Löschen: im Menü ⋯ · Fertig: oben
      if (L._h !== html) { L._h = html; L.innerHTML = html; }   // nur bei Änderung neu zeichnen (Knöpfe bleiben klickbar)
    }
    function skModus() {   // Zeichnen fängt Maus/Finger ab, „Zeigen“ lässt blättern
      const malen = !!SK.id && !['zeigen', 'radier', 'unterschrift'].includes(SK.werkzeug);
      if (MW) { MW.modus(); if (SK.werkzeug !== 'zeigen') MW.weg(); }
      S.classList.toggle('bph-malen', malen);
      el.querySelector('.bph-skb').classList.toggle('on', !!SK.id);
      leisten();
    }
    function leisten() {   // was oben und unten steht: beim Markieren „Fertig“ oben und die Werkzeuge unten, sonst „Markieren“
      const mark = !!SK.id, isPdf = items[i] && items[i].typ === 'pdf';
      el.classList.toggle('bph-gvmark', mark);
      el.querySelector('.bph-gvf').hidden = !mark;
      el.querySelector('.bph-skb').hidden = !isPdf || mark;
      el.querySelector('.bph-gvge').hidden = !isPdf || mark || H.GAST || ENG();   // am Rechner oben neben „Markieren“; schmal/Handy im Menü ⋯
      const x = items[i] || {}, kann = { ml: isPdf && !H.GAST && !!H.unterlagenSenden, ab: isPdf && !H.GAST && !!(H.ablage && H.ablage.ablegen && !H.ablage.aus), us: isPdf && !mark && !H.GAST && !!window.bpUnterschrift, dr: !H.GAST, dl: !H.GAST };
      const haupt = x.haupt || (kann.ml && (x.mail || window.bpMailStandard) ? 'ml' : 'dr');   // B1 (17.11.2026): Hauptknopf je App
      el.querySelectorAll('.bph-gva [data-gv], .bph-gvmk [data-gv]').forEach((b) => { const k = b.dataset.gv; if (k in kann) b.hidden = !kann[k]; b.classList.toggle('bph-gvh', k === haupt); });
      el.querySelector('.bph-gvmk').hidden = !isPdf || mark || !ENG();
      el.querySelector('.bph-gvz').hidden = (TOUCH && ENG()) || !items[i];
      const leer = !mehrHtml().trim(); el.querySelectorAll('[data-gv="me"]').forEach((b) => { b.hidden = leer; });
    }
    const zoomText = () => { const z = el.querySelector('.bph-gvzp'); if (z) z.textContent = Math.round(zoom * 100) + ' %'; };
    /* Menü ⋯: Drucken, Teilen – beim Markieren dazu Behalten, Einladen, PDF mit Markierungen, Löschen, Leisten ausblenden */
    function menue() {
      const M = el.querySelector('.bph-gvm');
      if (!M.hidden) { M.hidden = true; return; }
      M.innerHTML = mehrHtml(); M.hidden = !M.innerHTML.trim();
    }
    function mehrHtml() {   // leer → ⋯ wird gar nicht gezeigt (17.11.2026: vorher ein Knopf ohne Wirkung)
      const mk = !!SK.id, x = items[i] || {};
      return [!mk && !H.GAST && x.typ === 'pdf' && ENG() ? '<button type="button" data-sk="gemeinsam">👥 Gemeinsam markieren – Kolleg:innen oder Externe einladen …</button>' : '', mk && !H.GAST ? `<button type="button" data-sk="dauer">📌 ${SK.dauerhaft ? 'Dauerhaft am Plan – aufheben' : 'Markierungen am Plan behalten'}</button>` : '',
        mk && !H.GAST ? '<button type="button" data-sk="einladen">👥 Kolleg:innen oder Externe einladen …</button>' : '',
        mk && !H.GAST ? '<button type="button" data-sk="pdf">⤓ Plan mit Markierungen als PDF</button>' : '',
        mk ? `<button type="button" data-sk="alle">🗑 ${SK.owner === ich() ? 'Alle Markierungen löschen' : 'Alle meine Markierungen löschen'}</button>` : '',
        mk ? '<button type="button" data-sk="voll">⤢ Leisten ausblenden (mehr Platz)</button>' : '', mk && !H.GAST ? '<hr>' : '',
        H.GAST || !(ENG() || mk) ? '' : `<button type="button" data-gv="dr">🖨 Drucken${mk || SK.dauer ? ' mit Markierungen' : ''}</button><button type="button" data-gv="dl">⤴ Teilen / speichern</button>`,   // am Rechner stehen Senden, Ablegen, Drucken, Speichern oben
        x.typ === 'pdf' && TOUCH && ENG() ? '<button type="button" data-gv="fs">▢ Ganze Seite</button><button type="button" data-gv="fb">↔ Auf Breite</button>' : '',
        !mk && !H.GAST && x.url && H.bauherrAn && H.bauherrAn() && (x.pid || H.projektId()) ? '<button type="button" data-gv="bh">🏠 Für Bauherr:in freigeben …</button>' : ''].join('');   // Fotos, Rechnungen, Mängel … ins Bauherrenportal (bp/freigeben.js)
    }
    function skZeichnen(seite) {
      const wr = S.querySelector(`.bph-pg[data-seite="${seite}"]`); if (!wr) return;
      const ov = wr.querySelector('.bph-skc'), dpr = Math.min(2, window.devicePixelRatio || 1), W = wr.clientWidth, Hh = wr.clientHeight;
      if (!W || !Hh) return;
      const k = dpr * canvasMass(W * dpr, Hh * dpr)[2];   // Überlage nicht größer als das Gerät verträgt
      if (ov.width !== Math.round(W * k) || ov.height !== Math.round(Hh * k)) { ov.width = Math.round(W * k); ov.height = Math.round(Hh * k); }
      const g = ov.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, W, Hh);
      const alle = SK.striche.filter((d) => d.seite === seite).concat(SK.akt && SK.akt.seite === seite ? [SK.akt] : []);
      for (const d of alle) skStrich(g, d, W, Hh);
      wr.querySelectorAll('.bph-ptr').forEach((x) => x.remove());
      for (const p of SK.leute) {
        if (p.uid === ich() || !p.aktiv || p.seite !== seite || p.x == null) continue;
        const z = document.createElement('div'); z.className = 'bph-ptr'; z.style.left = (p.x * 100) + '%'; z.style.top = (p.y * 100) + '%'; z.style.setProperty('--f', p.farbe);
        z.innerHTML = `<b></b><span>${esc(p.name.split(' ')[0])}</span>`; wr.appendChild(z);
      }
    }
    function skStrich(g, d, W, Hh) {
      const P = d.pts.map(([x, y]) => [x * W, y * Hh]), bw = Math.max(1, d.breite * W);
      g.strokeStyle = d.farbe; g.fillStyle = d.farbe; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = d.art === 'marker' ? 0.35 : 1; g.lineWidth = bw;
      if (d.art === 'haken' || d.art === 'kreuz') {   // Prüfzeichen
        const [x, y] = P[0], q = Math.max(10, bw * 4); g.strokeStyle = d.farbe; g.lineWidth = Math.max(2, q / 6); g.beginPath();
        if (d.art === 'haken') { const a = -(((d.pts[0][0] * 131 + d.pts[0][1] * 977) * 9301 + 49297) % 233280 / 233280 * 16 - 8) * Math.PI / 180, Q = (u, v) => [x + q * (u * Math.cos(a) - v * Math.sin(a)), y + q * (u * Math.sin(a) + v * Math.cos(a))];   // wie mit dem Stift gezogen (gleich wie im Ausdruck: skizze.pdf_zeichnen)
          g.moveTo(...Q(-.42, 0)); g.bezierCurveTo(...Q(-.32, .08), ...Q(-.22, .2), ...Q(-.15, .36)); g.bezierCurveTo(...Q(0, 0), ...Q(.3, -.42), ...Q(.66, -.63)); }
        else { g.moveTo(x - q * .45, y - q * .45); g.lineTo(x + q * .45, y + q * .45); g.moveTo(x - q * .45, y + q * .45); g.lineTo(x + q * .45, y - q * .45); }
        g.stroke(); return; }
      if (d.art === 'bild') { if (window.bpMarkWahl) bpMarkWahl.bild(g, d, W, Hh, () => skZeichnen(d.seite)); return; }   // Unterschrift als Ebene
      if (d.art === 'text') { g.font = `bold ${Math.max(10, bw * 4)}px system-ui,sans-serif`; g.textBaseline = 'bottom'; g.fillText(d.text || '', P[0][0], P[0][1]); g.globalAlpha = 1; return; }
      if (d.art === 'rechteck' && P.length > 1) { const [a, b] = [P[0], P[P.length - 1]]; g.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); g.globalAlpha = 1; return; }
      const pts = d.art === 'pfeil' && P.length > 1 ? [P[0], P[P.length - 1]] : P;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); if (pts.length === 1) g.lineTo(pts[0][0] + 0.1, pts[0][1]); g.stroke();
      if (d.art === 'pfeil' && pts.length > 1) { const [a, b] = pts, w = Math.atan2(b[1] - a[1], b[0] - a[0]), L = Math.max(10, bw * 5);
        g.beginPath(); for (const dw of [2.6, -2.6]) { g.moveTo(b[0], b[1]); g.lineTo(b[0] + L * Math.cos(w + dw), b[1] + L * Math.sin(w + dw)); } g.stroke(); }
      g.globalAlpha = 1;
    }
    const alleZeichnen = () => { S.querySelectorAll('.bph-pg').forEach((w) => skZeichnen(+w.dataset.seite)); if (MW) MW.zeig(); };
    function skUebernehmen(r) {
      if (H.GAST && r.ich) { H.me = { ...(H.me || {}), id: r.ich }; if (r.name) el.querySelector('.bph-gvt').textContent = r.name; }
      SK.owner = r.owner; SK.farbe = r.farbe || SK.farbe; SK.leute = r.leute || []; SK.dauerhaft = !!r.dauerhaft;
      const weg = new Set(r.geloescht || []); if (weg.size) SK.striche = SK.striche.filter((d) => !weg.has(d.id));
      for (const d of r.striche || []) {
        if (SK.striche.some((x) => x.id === d.id)) continue;
        const tmp = d.uid === ich() && SK.striche.find((x) => x.tmp && x.pts.length === d.pts.length && Math.abs(x.pts[0][0] - d.pts[0][0]) < 1e-4 && Math.abs(x.pts[0][1] - d.pts[0][1]) < 1e-4);
        if (tmp) { tmp.id = d.id; delete tmp.tmp; } else SK.striche.push(d);
      }
      SK.seq = Math.max(SK.seq, r.seq || 0);
    }
    async function skAbgleich() {
      if (!SK.id || SK.aus) return;
      try { const r = await SKJ(`api/bp/skizze/${SK.id}?seit=${SK.seq}`); skUebernehmen(r); alleZeichnen(); skLeiste(); }
      catch (e) { if (/gibt es nicht|Keine Einladung|nicht \(mehr\) gültig/.test(e.message)) { skEnde(true); alert(e.message); } }
    }
    function skLauf() { clearInterval(SK.t); SK.t = setInterval(() => { if (document.visibilityState === 'visible') skAbgleich(); }, 700); skAdresse(SK.id); }
    function skAdresse(id) {   // laufende gemeinsame Skizze in der Adresse (#skizze=<id>) – nach dem Neuladen geht es in derselben Skizze weiter (skWache)
      if (H.GAST || id === 'gast') return; const h = id ? '#skizze=' + id : (SK.vorHash || ''); if (id && !/^#skizze=/.test(location.hash)) SK.vorHash = location.hash;
      if (location.hash !== h) history.replaceState(history.state, '', location.pathname + location.search + h); if (!id) SK.vorHash = '';
    }
    async function skStart() {
      if (!roh) return;
      if (H.GAST) return skBeitreten('gast');
      if (SK.dauer) return skBeitreten(SK.dauer);
      const b = el.querySelector('.bph-skb'); b.disabled = true;
      try {
        const fd = new FormData(); fd.append('datei', new Blob([roh], { type: 'application/pdf' }), items[i].name || 'Plan.pdf'); fd.append('name', items[i].name || 'Plan.pdf');
        const r = await KX('api/bp/skizze', { method: 'POST', body: fd });
        SK.id = r.id; SK.striche = []; SK.seq = 0; items[i].skizze = r.id;
        await skAbgleich(); skLauf(); skModus();
      } catch (e) { alert(e.message); } finally { b.disabled = false; }
    }
    async function skBeitreten(id) {
      try { const r = await SKJ(`api/bp/skizze/${id}`, 'POST'); SK.id = id; SK.striche = []; SK.seq = 0; skUebernehmen(r); alleZeichnen(); skLeiste(); skLauf(); skModus(); }
      catch (e) { alert(e.message); }
    }
    async function skEnde(still) {
      const warId = SK.id, eigene = SK.striche.some((d) => d.uid === ich());
      if (!still && !H.GAST && warId && !SK.dauerhaft && eigene) {   // beim Fertig und beim Schließen: klar fragen, ob die Markierung bleibt
        const ja = await bpFrage('Markierungen am Plan behalten?\n\nBleibende Markierungen sieht jeder, der diesen Plan öffnet – auch in den anderen Apps. In der Planliste steht dann „📌 markiert“.', { ok: '📌 Behalten', abbrechen: 'Nicht behalten' });
        if (ja) SKJ(`api/bp/skizze/${warId}/dauerhaft`, 'POST', { an: true }).then(() => { skDauerSuchen(tok); if (window.toast) toast('Markierung bleibt – in der Planliste als „📌 markiert“ vermerkt.'); }).catch((er) => alert(er.message));
        else if (window.toast) toast('Markierung nicht behalten – sie erscheint beim nächsten Öffnen nicht mehr.');
      } else if (!still && SK.dauerhaft && window.toast) toast('Markierung bleibt am Plan (📌 in der Planliste).');
      clearInterval(SK.t); skAdresse(null); if (SK.id) SKJ(`api/bp/skizze/${SK.id}/zeiger`, 'POST', { seite: 0, x: null, y: null }).catch(() => {});
      SK.id = null; SK.striche = []; SK.leute = []; SK.dauerhaft = false; SK.dauer = null; el.classList.remove('bph-voll'); el.querySelector('.bph-skm').hidden = true; skLeiste(); skModus(); skKnopf(); if (!still) { alleZeichnen(); if (warId && items[i] && !items[i].skizze) skDauerSuchen(tok); }
    }
    function skPunkt(e) { const wr = e.target.closest && e.target.closest('.bph-pg'); if (!wr) return null; const r = wr.getBoundingClientRect(); return { wr, seite: +wr.dataset.seite, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
    S.addEventListener('pointerdown', (e) => {
      if (!SK.id || ['zeigen', 'radier', 'unterschrift'].includes(SK.werkzeug)) return;   // auswählen und radieren: markwahl.js
      const p = skPunkt(e); if (!p) return;
      e.preventDefault();
      if (SK.werkzeug === 'haken' || SK.werkzeug === 'kreuz') {   // ein Klick setzt das Prüfzeichen (Haken grün, Kreuz rot)
        const d = { seite: p.seite, art: SK.werkzeug, farbe: SK.werkzeug === 'haken' ? '#1f9d4c' : '#e02424', breite: SKW[SK.werkzeug][2], pts: [[p.x, p.y]], tmp: true, uid: ich() };
        SK.striche.push(d); skZeichnen(p.seite); SKJ(`api/bp/skizze/${SK.id}/strich`, 'POST', d).then((r) => { d.id = r.id; delete d.tmp; }).catch((er) => bpHinweis(er.message)); return;
      }
      if (SK.werkzeug === 'text') {   // direkt an der Stelle im Plan tippen – Enter übernimmt, Esc verwirft
        const alt = p.wr.querySelector('.bph-sktxt'); if (alt) { alt.blur(); return; }
        const W = p.wr.getBoundingClientRect().width, fs = Math.max(10, Math.max(1, SKW.text[2] * W) * 4);
        const inp = document.createElement('input'); inp.className = 'bph-sktxt'; inp.placeholder = 'Text …';
        Object.assign(inp.style, { left: (p.x * 100) + '%', top: (p.y * 100) + '%', fontSize: fs + 'px', color: SK.farbe, borderColor: SK.farbe });
        p.wr.appendChild(inp); setTimeout(() => inp.focus(), 0);
        let fertig = false;
        const ende = (ok) => {
          if (fertig) return; fertig = true; const t = inp.value.trim(); inp.remove();
          if (!ok || !t) return;
          const d = { seite: p.seite, art: 'text', farbe: SK.farbe, breite: SKW.text[2], pts: [[p.x, p.y]], text: t, tmp: true, uid: ich() };
          SK.striche.push(d); skZeichnen(p.seite); SKJ(`api/bp/skizze/${SK.id}/strich`, 'POST', d).then((r) => { d.id = r.id; delete d.tmp; }).catch((er) => bpHinweis(er.message));
        };
        inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); ende(true); } else if (ev.key === 'Escape') { ev.preventDefault(); ende(false); } });
        inp.addEventListener('blur', () => ende(true));
        inp.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        return;
      }
      SK.akt = { seite: p.seite, art: SK.werkzeug, farbe: SK.farbe, breite: SKW[SK.werkzeug][2], pts: [[p.x, p.y]], uid: ich() };
      try { S.setPointerCapture(e.pointerId); } catch { /* egal */ }
    });
    S.addEventListener('pointermove', (e) => {
      if (!SK.id) return;
      const wr = SK.akt && S.querySelector(`.bph-pg[data-seite="${SK.akt.seite}"]`);
      if (SK.akt && wr) {
        const r = wr.getBoundingClientRect(), q = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
        if (SK.akt.art === 'rechteck' || SK.akt.art === 'pfeil') SK.akt.pts = [SK.akt.pts[0], q]; else SK.akt.pts.push(q);
        skZeichnen(SK.akt.seite);
      }
      const now = Date.now(); if (now - SK.zt < 250) return; SK.zt = now;   // Zeiger für die anderen
      const p = skPunkt(e); if (p) SKJ(`api/bp/skizze/${SK.id}/zeiger`, 'POST', { seite: p.seite, x: p.x, y: p.y }).catch(() => {});
    });
    const skLos = () => {
      const d = SK.akt; SK.akt = null; if (!d || !SK.id) return;
      if (d.pts.length > 400) d.pts = d.pts.filter((_, k) => k % Math.ceil(d.pts.length / 400) === 0 || k === d.pts.length - 1);
      d.tmp = true; SK.striche.push(d); skZeichnen(d.seite);
      SKJ(`api/bp/skizze/${SK.id}/strich`, 'POST', d).then((r) => { if (d.tmp) { d.id = r.id; delete d.tmp; } }).catch((er) => alert(er.message));
    };
    S.addEventListener('pointerup', skLos); S.addEventListener('pointercancel', skLos);
    async function skHash(buf) {
      try { return crypto.subtle ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('') : ''; } catch (e) { return ''; }
    }
    async function skDauerSuchen(my) {   // dauerhafte Markierungen zu diesem Plan anzeigen (ohne Zeichenmodus)
      if (!roh || SK.id || H.GAST) return;
      try {
        const x = items[i], h = await skHash(roh);
        const q = await SKJ(`api/bp/skizze-dauerhaft?hash=${h}&name=${encodeURIComponent(x.name || '')}&groesse=${roh.byteLength}`);
        if (my !== tok || SK.id || !q.id) return;
        const r = await SKJ(`api/bp/skizze/${q.id}`);
        if (my !== tok || SK.id) return;
        SK.dauer = q.id; SK.striche = r.striche || []; alleZeichnen(); skKnopf();
      } catch (e) { /* ohne Markierungen weiter */ }
    }
    function skKnopf() {
      const b = el.querySelector('.bph-skb'), n = SK.dauer && !SK.id ? SK.striche.length : 0;
      b.innerHTML = n ? `<i>📌</i>Markiert (${n})` : '<i>✎</i>Markieren';
      el.querySelector('.bph-gvmk [data-gv="sk"]').innerHTML = b.innerHTML;
      b.title = n ? 'Dieser Plan hat dauerhafte Markierungen – klicken zum Weitermarkieren' : 'Markieren – auch gemeinsam mit Kolleg:innen gleichzeitig';
    }
    async function markiertesPdf() {   // Plan mit Markierungen, sonst das Original
      const x = items[i], sid = SK.id || SK.dauer;
      if (x.typ === 'pdf' && sid && SK.striche.length) {
        try {
          const r = await fetch(`api/bp/skizze/${sid}/pdf`, { credentials: 'same-origin' });
          if (r.ok) return { b: await r.blob(), name: (x.name || 'Plan.pdf').replace(/\.pdf$/i, '') + (SK.striche.some((d) => d.art === 'bild') ? ' (unterschrieben).pdf' : ' (markiert).pdf') };
        } catch (e) { /* Original */ }
      }
      const b = await fetch(x.url, { credentials: 'same-origin' }).then((r) => r.blob());
      return { b, name: x.name || (x.typ === 'pdf' ? 'Datei.pdf' : 'Foto.jpg') };
    }
    async function drucken() {
      try {
        const { b } = await markiertesPdf(), u = URL.createObjectURL(b);
        if (items[i].typ !== 'pdf') { window.open(u, '_blank'); return; }
        H.pdfDrucken(u);
      } catch (e) { alert(e.message || 'Drucken nicht möglich'); }
    }
    async function skEinladen() {
      let K; try { K = await SKJ('api/bp/kollegen'); } catch (e) { alert(e.message); return; }
      const link = location.origin + location.pathname + '#skizze=' + SK.id;
      const d = document.createElement('div'); d.className = 'bph-dlg-bg'; d.style.zIndex = 6000;
      d.innerHTML = `<div class="bph-dlg" style="max-width:26rem"><div class="bph-dh"><b>Gemeinsam markieren</b><button type="button" class="bph-x" data-kx>×</button></div><div class="bph-db">
        <p class="bph-mu" style="margin:0 0 .2rem">Kolleg:innen antippen und einladen – oder den Link selbst verschicken. Striche und Zeiger sehen alle gleichzeitig.</p>
        <div class="bph-skk">${K.map((k) => `<label class="bph-skw${k.online ? ' da' : ''}" title="${k.online ? 'gerade angemeldet' : ''}"><input type="checkbox" value="${k.id}">${esc(k.name)}</label>`).join('') || '<p class="bph-mu">Keine weiteren Benutzer:in.</p>'}</div>
        <label class="bph-ck" style="margin:.1rem 0 .4rem;font-size:.86em"><input type="checkbox" data-kmail checked> zusätzlich per E-Mail (mit Link)</label>
        <div class="bph-row"><button type="button" class="bph-btn pri" data-ko>Einladen</button><button type="button" class="bph-btn" data-kl>Link kopieren</button><a class="bph-btn" data-kmailto href="mailto:?subject=${encodeURIComponent('Gemeinsam markieren: ' + (items[i].name || 'Plan'))}&body=${encodeURIComponent('Bitte öffne den Plan, dann markieren wir gemeinsam:\n' + link)}" title="Eigene Mail mit dem Link schreiben – auch an Leute außerhalb">✉ Per Mail …</a></div>
        <p class="bph-mu" data-km></p>
        <div class="bph-skx"><b>Externe ohne Anmeldung</b><p class="bph-mu" style="margin:.2rem 0 .4rem">Ein eigener, befristeter Link nur für diesen Plan – z. B. für Fachplaner:in oder Bauherr:in. Externe sehen nichts anderes, zeichnen mit und löschen nur ihre eigenen Striche. Zurückziehen geht jederzeit.</p>
          <div class="bph-gm"><span data-gmc></span><input data-gmi list="bphGmL" placeholder="E-Mail oder Name aus den Adressen …" autocomplete="off" aria-label="E-Mail-Adresse"><datalist id="bphGmL"></datalist></div>
          <div class="bph-row"><select data-kgt aria-label="gültig"><option value="1">1 Tag gültig</option><option value="7" selected>7 Tage gültig</option><option value="30">30 Tage gültig</option></select><button type="button" class="bph-btn pri" data-kgm>✉ Per E-Mail einladen</button><button type="button" class="bph-btn" data-kg>🔗 Nur Link erzeugen</button></div>
          <div data-kgl></div></div></div></div>`;
      el.appendChild(d);
      const gl = (L, neu) => {   // gültige Gast-Links; ein neuer steht einmal im Klartext da (gespeichert wird nur eine Prüfsumme)
        const de = (t) => new Date(t).toLocaleDateString('de-DE');
        d.querySelector('[data-kgl]').innerHTML = (neu ? `<div class="bph-skneu"><input readonly value="${esc(neu.url)}" aria-label="Link für Externe"><div class="bph-row"><button type="button" class="bph-btn pri" data-kgc>Kopieren</button><a class="bph-btn" href="mailto:?subject=${encodeURIComponent('Plan gemeinsam markieren: ' + (items[i].name || 'Plan'))}&body=${encodeURIComponent('Bitte öffne den Plan über diesen Link, dann markieren wir gemeinsam (keine Anmeldung nötig, gültig bis ' + de(neu.ablauf) + '):\n' + neu.url)}">✉ Per Mail …</a></div><small class="bph-mu">Den Link nur an die vorgesehenen Personen schicken – wer ihn hat, kommt bis zum ${de(neu.ablauf)} auf diesen Plan.</small></div>` : '')
          + (L.length ? `<div class="bph-mu" style="margin-top:.4rem">Gültige Links: ${L.map((x) => `<span class="bph-chip">bis ${de(x.ablauf)} · ${esc(x.von)} <button type="button" data-kgx="${esc(x.id)}" title="Link zurückziehen – er funktioniert dann sofort nicht mehr">✕</button></span>`).join(' ')}${L.length > 1 ? ' <button type="button" class="bph-btn" data-kgx="*">alle zurückziehen</button>' : ''}</div>` : '');
      };
      SKJ(`api/bp/skizze/${SK.id}/gastlinks`).then((r) => gl(r.links || [])).catch(() => {});
      /* Empfänger für die Einladung per E-Mail: aus den Adressen (auch weitere E-Mails) oder frei eingetippt */
      const GM = [], gmI = d.querySelector('[data-gmi]'), gmOk = (v) => /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/.test(v);
      const gmZeigen = () => { d.querySelector('[data-gmc]').innerHTML = GM.map((m, k) => `<span class="bph-chip">${esc(m)} <button type="button" data-gmx="${k}" aria-label="entfernen">✕</button></span>`).join(''); };
      const gmAdd = () => { const v = gmI.value.trim().replace(/[,;]$/, ''); if (!v) return true; if (!gmOk(v)) return false; if (!GM.some((x) => x.toLowerCase() === v.toLowerCase())) GM.push(v); gmI.value = ''; gmZeigen(); return true; };
      let gmT = 0;
      gmI.addEventListener('input', () => {
        if (/[,;\s]$/.test(gmI.value) && gmOk(gmI.value.trim().replace(/[,;]$/, ''))) { gmAdd(); return; }
        if (gmOk(gmI.value.trim()) && [...d.querySelectorAll('#bphGmL option')].some((o) => o.value === gmI.value.trim())) { gmAdd(); return; }   // aus der Liste gewählt
        clearTimeout(gmT); const q = gmI.value.trim(); if (q.length < 2) return;
        gmT = setTimeout(async () => { try { const L = await KX('api/bp/mailadressen?q=' + encodeURIComponent(q)); d.querySelector('#bphGmL').innerHTML = L.map((x) => `<option value="${esc(x.email)}">${esc(x.name)}</option>`).join(''); } catch { /* ohne Vorschläge */ } }, 200);
      });
      gmI.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); if (!gmAdd()) d.querySelector('[data-km]').textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.'; } });
      d.addEventListener('click', async (e) => {
        if (e.target.closest('[data-kx]')) return d.remove();   // daneben klicken schließt nicht
        const gx0 = e.target.closest('[data-gmx]'); if (gx0) { GM.splice(+gx0.dataset.gmx, 1); gmZeigen(); return; }
        const gmb = e.target.closest('[data-kgm]');
        if (gmb) {
          if (!gmAdd()) { d.querySelector('[data-km]').textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.'; return; }
          if (!GM.length) { d.querySelector('[data-km]').textContent = 'Bitte eine E-Mail-Adresse eingeben oder aus den Adressen wählen.'; gmI.focus(); return; }
          gmb.disabled = true;
          try {
            const r = await SKJ(`api/bp/skizze/${SK.id}/gastmail`, 'POST', { an: GM, tage: +d.querySelector('[data-kgt]').value, basis: location.origin });
            gl(r.links || []); GM.length = 0; gmZeigen();
            d.querySelector('[data-km]').textContent = (r.gesendet.length ? 'Eingeladen per E-Mail: ' + r.gesendet.join(', ') + '. Jeder hat einen eigenen Link, einzeln zurückziehbar.' : '') + (r.fehler.length ? ' Nicht gesendet: ' + r.fehler.join('; ') : '');
          } catch (er) { d.querySelector('[data-km]').textContent = er.message; } finally { gmb.disabled = false; }
          return;
        }
        const gb = e.target.closest('[data-kg]');
        if (gb) { gb.disabled = true; try { const r = await SKJ(`api/bp/skizze/${SK.id}/gastlinks`, 'POST', { tage: +d.querySelector('[data-kgt]').value }); gl(r.links || [], { url: location.origin + '/gast/' + r.token, ablauf: r.ablauf }); } catch (er) { d.querySelector('[data-km]').textContent = er.message; } finally { gb.disabled = false; } return; }
        const gc = e.target.closest('[data-kgc]'); if (gc) { const inp = d.querySelector('.bph-skneu input'); try { await navigator.clipboard.writeText(inp.value); gc.textContent = 'Kopiert ✓'; } catch { inp.select(); } return; }
        const gx = e.target.closest('[data-kgx]');
        if (gx) { if (!(await bpFrage(gx.dataset.kgx === '*' ? 'Alle Links für Externe zurückziehen?' : 'Diesen Link zurückziehen? Er funktioniert dann sofort nicht mehr.', { ok: 'Zurückziehen' }))) return;
          try { const r = await KX(`api/bp/skizze/${SK.id}/gastlinks`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gx.dataset.kgx === '*' ? {} : { id: gx.dataset.kgx }) }); gl(r.links || []); } catch (er) { d.querySelector('[data-km]').textContent = er.message; } return; }
        if (e.target.closest('[data-kl]')) { try { await navigator.clipboard.writeText(link); d.querySelector('[data-km]').textContent = 'Link kopiert – z. B. in Teams oder per Mail schicken. Wer ihn öffnet, ist sofort dabei, eine Einladung ist nicht nötig.'; } catch { (await bpEingabe('Link:', link)); } return; }
        if (e.target.closest('[data-ko]')) {
          const an = [...d.querySelectorAll('.bph-skk input:checked')].map((x) => +x.value); if (!an.length) return;
          try {
            const r = await SKJ(`api/bp/skizze/${SK.id}/einladen`, 'POST', { an, mail: d.querySelector('[data-kmail]').checked, link });
            d.remove(); if (window.toast) toast('Eingeladen' + (r.mails && r.mails.length ? ' und per E-Mail benachrichtigt' : '') + ' – sobald sie mitmachen, siehst du ihre Zeiger.' + (r.fehler && r.fehler.length ? ' Mail nicht gesendet: ' + r.fehler.join('; ') : ''), !!(r.fehler && r.fehler.length));
          } catch (er) { d.querySelector('[data-km]').textContent = er.message; }
        }
      });
    }
    /* Unterschrift als Ebene (L1): liegt wie eine Markierung auf dem Plan (immer dauerhaft), eingesetzt erst beim Senden, Ablegen, Speichern, Drucken.
       folge: weitere Unterschriften nacheinander (z. B. [{ fremd: 'Bieter:in' }]), danach beiUnterschrift(blob, name) mit dem PDF samt Ebenen */
    function usStart() {
      if (!window.bpUnterschrift || !roh) return;
      if (SK.id) { SK.werkzeug = 'zeigen'; skLeiste(); skModus(); }
      const us = (o) => bpUnterschrift.start({ el, S, roh: roh.slice(0), name: items[i].name, ...o, ebene: usEbene, fertig: async () => { const x = items[i], cb = x.beiUnterschrift, F = x.folge || [];
        x.folge = F.slice(1); x.unterschrieben = true; if (F.length) us(F[0]); else if (cb) { const m = await markiertesPdf(); cb(m.b, m.name); } } });
      us({});
    }
    async function usEbene(d) {
      if (!SK.id) await skStart();
      if (!SK.id) throw new Error('Die Unterschrift ließ sich nicht auf den Plan legen.');
      await SKJ(`api/bp/skizze/${SK.id}/strich`, 'POST', { ...d, art: 'bild' }); await skAbgleich(); SK.werkzeug = 'zeigen'; skLeiste(); skModus();
    }
    async function skPdf() {
      try {
        const r = await fetch(`api/bp/skizze/${SK.id}/pdf`, { credentials: 'same-origin' });
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Fehler ' + r.status); }
        const b = await r.blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (items[i].name || 'Plan.pdf').replace(/\.pdf$/i, '') + ' (markiert).pdf'; document.body.appendChild(a); a.click(); a.remove();
      } catch (e) { alert(e.message); }
    }
    el.addEventListener('click', async (e) => {
      if (!e.target.closest('.bph-skl,.bph-gvm,.bph-gvb')) return;
      const w = e.target.closest('[data-skw]'); if (w && w.dataset.skw === 'unterschrift') { usStart(); return; } if (w) { SK.werkzeug = w.dataset.skw; if (w.dataset.skw !== 'zeigen') SK.letztes = w.dataset.skw; skLeiste(); skModus(); return; }
      const b = e.target.closest('[data-sk]'); if (!b) return;
      const a = b.dataset.sk; el.querySelector('.bph-gvm').hidden = true;
      if (a === 'gemeinsam') { if (!SK.id) await skStart(); if (SK.id) skEinladen(); return; }   // Markieren beginnen und gleich einladen
      if (!SK.id) return;
      if (a === 'zurueck') { await SKJ(`api/bp/skizze/${SK.id}/loeschen`, 'POST', { was: 'letzter' }).catch((er) => alert(er.message)); return skAbgleich(); }
      if (a === 'alle') { if (!(await bpFrage(SK.owner === ich() ? 'Alle Markierungen auf diesem Plan löschen – auch die der anderen?' : 'Alle deine Markierungen löschen?'))) return; await SKJ(`api/bp/skizze/${SK.id}/loeschen`, 'POST', { was: 'alle' }).catch((er) => alert(er.message)); return skAbgleich(); }
      if (a === 'einladen') return skEinladen();
      if (a === 'pdf') return skPdf();
      if (a === 'dauer') { const an = !SK.dauerhaft; if (!an && !(await bpFrage('Markierungen nicht mehr dauerhaft am Plan zeigen?'))) return; await SKJ(`api/bp/skizze/${SK.id}/dauerhaft`, 'POST', { an }).catch((er) => alert(er.message)); return skAbgleich(); }
      if (a === 'voll') return skVoll(true);
      if (a === 'ende') { skEnde(false); }
    });
    function skVoll(an) {   // Leisten aus: nur Plan + kleine Werkzeugpille (iPhone quer)
      el.classList.toggle('bph-voll', an); el.querySelector('.bph-skm').hidden = !an;
      el.querySelectorAll('.bph-skm [data-skm]').forEach((b) => b.classList.toggle('on', b.dataset.skm === (SK.werkzeug === 'zeigen' ? 'zeigen' : 'stift')));
      setTimeout(alleZeichnen, 50);
    }
    el.querySelector('.bph-skm').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-skm]'); if (!b) return; const a = b.dataset.skm;
      if (a === 'voll') return skVoll(false);
      if (a === 'zurueck') { await SKJ(`api/bp/skizze/${SK.id}/loeschen`, 'POST', { was: 'letzter' }).catch(() => {}); return skAbgleich(); }
      SK.werkzeug = a === 'zeigen' ? 'zeigen' : (SK.letztes || 'stift'); skLeiste(); skModus(); skVoll(true);
    });
    addEventListener('resize', () => { if (gv) alleZeichnen(); });
    function setZoom(d, abs) {
      zoom = Math.max(0.3, Math.min(5, abs != null ? abs : zoom * (d > 0 ? 1.4 : 1 / 1.4))); zoomText();
      if (pdf) renderPdf(tok); else { const im = S.querySelector('img'); if (im) { im.style.maxWidth = zoom === 1 ? '' : 'none'; im.style.maxHeight = zoom === 1 ? '' : 'none'; im.style.width = zoom === 1 ? '' : (fitW() * zoom) + 'px'; } }
    }
    const go = (d) => { if (items.length < 2) return; i = (i + d + items.length) % items.length; show(); };
    async function teilen() {
      const x = items[i];
      try {
        const { b, name } = await markiertesPdf();
        const f = new File([b], name, { type: b.type || (x.typ === 'pdf' ? 'application/pdf' : '') });
        if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; }
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      } catch (e) { if (!e || e.name !== 'AbortError') window.open(x.url, '_blank'); }
    }
    async function mailen() {   // das gezeigte PDF (mit Unterschrift und Markierungen) über den gemeinsamen Versand-Dialog verschicken; x.mail = { art, pid, projekt, an, betreff, text, link } gibt die App mit
      const x = items[i], m = x.mail || (window.bpMailStandard ? window.bpMailStandard(x) : null) || {}, pj = H.projekt || {};   // bpMailStandard: Vorgaben der App (Projekt)
      try { const { b, name } = await markiertesPdf(); close();
        H.unterlagenSenden(H.mailVorgabe({ ...m, name: x.name || name, datei: name, pdf: async () => b, pid: m.pid || pj.id || null, projekt: m.projekt || pj.name || '' }));
      } catch (e) { if (window.toast) toast('Das PDF ließ sich nicht vorbereiten.', true); }
    }
    async function ablegen() {   // das gezeigte PDF (mit Unterschrift und Markierungen) auf den Fileserver – Ordner und Name wie beim Hereinziehen (bp/ablegen.js)
      const x = items[i];
      if (x.abgelegt && !(await bpFrage(`Liegt schon in ${x.abgelegt}.\nTrotzdem eine Kopie an anderer Stelle ablegen?`, { ok: 'Kopie ablegen' }))) return;   // C: z. B. Tagesbericht – legt das Bautagebuch selbst ab
      try { const { b, name } = await markiertesPdf(), n = x.name || name, f = new File([b], /\.pdf$/i.test(n) ? n : n + '.pdf', { type: 'application/pdf' }); await H.ablage.ablegen([f], null, { merk: x.merk || 'ansehen:' + n.replace(/[\d.\-_ ]+/g, ' ').trim().slice(0, 40), name: true }); }   // x.merk: Art des Dokuments der App (z. B. „bautagebuch:berichte“) – derselbe gemerkte Ordner wie beim Drucken
      catch (e) { if (window.toast) toast('Das PDF ließ sich nicht vorbereiten.', true); }
    }
    const key = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); else return; e.preventDefault(); e.stopPropagation(); };
    function close(ohneZurueck) {
      if (!gv) return; tok++; skEnde(true); el.remove(); document.body.classList.remove('bph-gv-offen'); document.removeEventListener('keydown', key, true); removeEventListener('popstate', pop); gv = null;
      setTimeout(() => document.dispatchEvent(new CustomEvent('bph:ansehen-zu')), 700);   // Apps frischen auf (z. B. „📌 markiert“ in der Planliste)
      if (!ohneZurueck && history.state && history.state.bphGv) history.back();
    }
    const pop = () => close(true);
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-gvi]'); if (t) { i = +t.dataset.gvi; show(); return; }
      const sv = e.target.closest('[data-gvs]'); if (sv) { TH.querySelectorAll('[data-gvs]').forEach((b) => b.classList.toggle('on', b === sv)); const w = S.querySelector(`.bph-pg[data-seite="${sv.dataset.gvs}"]`); if (w) S.scrollTo({ top: w.getBoundingClientRect().top - S.getBoundingClientRect().top + S.scrollTop - 8, behavior: 'smooth' }); return; }
      const b = e.target.closest('[data-gv]');
      if (!e.target.closest('.bph-gvm,[data-gv="me"]')) el.querySelector('.bph-gvm').hidden = true;
      if (!b) { if (TOUCH && S.contains(e.target) && !(SK.id && SK.werkzeug !== 'zeigen')) el.classList.toggle('bph-gvzu'); return; }   // Antippen: Leisten aus/ein (schließen nur über ✕)
      const a = b.dataset.gv; if (b.closest('.bph-gvm')) el.querySelector('.bph-gvm').hidden = true;
      if (a === 'me') { menue(); return; }
      if (a === 'us') { usStart(); return; }
      if (a === 'bh') { const x = items[i] || {}; H.bauherrPdf({ pid: x.pid || H.projektId(), name: x.name, url: x.url, bild: x.typ !== 'pdf' }); return; }
      if (a === 'fb') { setZoom(0, 1); return; }
      if (a === 'fs') { setZoom(0, Math.min(1, (S.clientHeight - 16) / (fitW() * hoch))); return; }
      if (a === 'sk') { if (SK.id) { el.querySelector('.bph-skl').hidden = !el.querySelector('.bph-skl').hidden; } else skStart(); return; } if (a === 'x') { if (SK.id && !H.GAST) skEnde().then(() => close()); else close(); } else if (a === 'prev') go(-1); else if (a === 'next') go(1); else if (a === 'zp') setZoom(1); else if (a === 'zm') setZoom(-1); else if (a === 'dl') teilen(); else if (a === 'ml') mailen(); else if (a === 'ab') ablegen(); else if (a === 'dr') drucken();
    });
    let tx = null, ty = 0, pz = null;   // Wischen links/rechts blättert (nur ohne Vergrößerung) · zwei Finger zoomen
    const abst = (T) => Math.hypot(T[0].clientX - T[1].clientX, T[0].clientY - T[1].clientY);
    S.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } else tx = null;
      if (e.touches.length === 2 && !(SK.id && SK.werkzeug !== 'zeigen')) pz = { d0: abst(e.touches), z0: zoom, f: 1 };
    }, { passive: true });
    S.addEventListener('touchmove', (e) => {
      if (!pz || e.touches.length !== 2) return; e.preventDefault();
      pz.f = Math.max(0.3 / pz.z0, Math.min(5 / pz.z0, abst(e.touches) / pz.d0));
      S.querySelectorAll('.bph-pg').forEach((w) => { w.style.width = (pz.z0 * pz.f * 100) + '%'; });   // sofort (unscharf), scharf nach dem Loslassen
      const im = S.querySelector('.bph-gvi'); if (im) { im.style.maxWidth = 'none'; im.style.maxHeight = 'none'; im.style.width = (fitW() * pz.z0 * pz.f) + 'px'; }
      const z = el.querySelector('.bph-gvzp'); if (z) z.textContent = Math.round(pz.z0 * pz.f * 100) + ' %';
    }, { passive: false });
    S.addEventListener('touchend', (e) => { if (pz && e.touches.length < 2) { const z = pz.z0 * pz.f; pz = null; tx = null; if (Math.abs(z - zoom) > 0.02) setZoom(0, z); } }, { passive: true });
    S.addEventListener('scroll', () => { if (TH.hidden || !TH.querySelector('[data-gvs]')) return; const o = S.getBoundingClientRect().top + S.clientHeight / 3, w = [...S.querySelectorAll('.bph-pg')].find((p) => p.getBoundingClientRect().bottom > o);
      if (w) TH.querySelectorAll('[data-gvs]').forEach((b) => b.classList.toggle('on', b.dataset.gvs === w.dataset.seite)); }, { passive: true });   // Seitenübersicht: aktuelle Seite markiert
    let sy = 0;   // am Handy: beim Scrollen nach unten Leisten aus, nach oben wieder ein
    S.addEventListener('scroll', () => { if (!TOUCH) return; const d = S.scrollTop - sy; sy = S.scrollTop; if (Math.abs(d) > 12) el.classList.toggle('bph-gvzu', d > 0 && S.scrollTop > 40); }, { passive: true });
    S.addEventListener('touchend', (e) => {
      if (tx == null || zoom !== 1 || (SK.id && SK.werkzeug !== 'zeigen')) return; const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    });
    S.addEventListener('dblclick', () => { if (!SK.id || SK.werkzeug === 'zeigen') setZoom(zoom === 1 ? 1 : -1); });
    /* PC: Seitenleiste mit den Plänen bzw. Fotos der Reihe – kleine Bilder (PDF: erste Seite, erst wenn sichtbar) */
    const TH = el.querySelector('.bph-gvth');
    if (items.length > 1 && !TOUCH && innerWidth >= 900) {
      TH.hidden = false;
      TH.innerHTML = items.map((x, k) => `<button type="button" data-gvi="${k}" title="${esc(x.name || '')}"><span class="bph-gvtb">${x.typ === 'pdf' ? '<canvas></canvas>' : `<img src="${esc(x.url)}" alt="" loading="lazy">`}</span><small>${esc(x.name || (k + 1) + '')}</small></button>`).join('');
      const io = new IntersectionObserver((E) => E.forEach(async (en) => {
        if (!en.isIntersecting) return; io.unobserve(en.target);
        const x = items[+en.target.dataset.gvi], cv = en.target.querySelector('canvas'); if (!cv) return;
        try { const lib = await pdfjs(), d = await fetch(x.url, { credentials: 'same-origin' }).then((r) => r.arrayBuffer()), pg = await (await lib.getDocument({ isEvalSupported: false, data: d }).promise).getPage(1);
          const v0 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: 240 / v0.width }); cv.width = v.width; cv.height = v.height; await pg.render({ canvas: cv, canvasContext: cv.getContext('2d'), viewport: v }).promise; } catch { /* ohne Bildchen */ }
      }), { root: TH });
      TH.querySelectorAll('[data-gvi]').forEach((b) => io.observe(b));
    }
    document.addEventListener('keydown', key, true);
    history.pushState({ bphGv: 1 }, ''); addEventListener('popstate', pop);   // Zurück-Geste schließt die Ansicht
    gv = { close };
    show();
  };
})();
