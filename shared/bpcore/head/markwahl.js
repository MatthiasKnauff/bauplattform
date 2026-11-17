/* Markierungen auswählen, verschieben und löschen – und Unterschriften als Ebene (GO 17.11.2026, Entwurf „Unterschrift als Markierung“).
   Geladen von der PDF-Ansicht in head.js (H.ansehen), sobald sie offen ist. Keine eigene Speicherung: alles geht über die Skizze im Kern
   (bpcore/skizze.py – Strich anlegen, einzeln löschen; „bild“ = Unterschrift/Stempel, eingebrannt erst beim Hinausgeben).
   bpMarkWahl.bild(g, d, W, H, neu)          Unterschrift auf die Zeichenfläche (Bild, Drehung, Felder des Prüfstempels, Name und Datum)
   bpMarkWahl.einrichten(ctx) → { weg() }    ctx = { el, S, SK, SKJ, ich, zeichnen(seite), abgleich() }
     ✋ (Werkzeug „zeigen“): Klick auf eine Markierung wählt sie aus – Rahmen, ✕ und Entf löschen; eine Unterschrift lässt sich ziehen und an der Ecke größer ziehen.
     🧽 (Werkzeug „radier“): über Markierungen wischen löscht sie ganz (M1) – Unterschriften nicht (N1).
   Löschen lässt sich mit Rückgängig zurücknehmen (rueckgaengig aus undo.js). Eigene Markierungen löscht jede:r, alle nur, wer das Markieren
   gestartet hat; Unterschriften nur, wer unterschrieben hat – das prüft der Kern noch einmal. */
(() => {
  if (window.bpMarkWahl) return;
  const css = document.createElement('style');
  css.textContent = `.bpm-sel{position:absolute;z-index:7;border:2px dashed var(--y,#d4357f);border-radius:6px;box-sizing:border-box;pointer-events:none}
.bpm-sel.b{pointer-events:auto;cursor:move;touch-action:none;background:rgba(212,53,127,.05)}
.bpm-sel i{position:absolute;right:-9px;bottom:-9px;width:18px;height:18px;border-radius:50%;background:var(--y,#d4357f);cursor:nwse-resize;touch-action:none;pointer-events:auto}
.bpm-x{position:absolute;z-index:8;width:24px;height:24px;border-radius:50%;border:0;background:var(--y,#d4357f);color:var(--on,#fff);font:700 13px/24px system-ui,sans-serif;cursor:pointer;padding:0;transform:translate(-50%,-50%)}
.bph-gvs.bpm-radier,.bph-gvs.bpm-radier .bph-pg{cursor:cell;touch-action:none}`;
  document.head.appendChild(css);

  const BILD = new Map();   // Base64 → Image (einmal dekodieren)
  const rgb = (f) => (Array.isArray(f) && f.length === 3 ? `rgb(${f.map((v) => Math.round(v * 255)).join(',')})` : 'rgb(20,41,128)');
  function bild(g, d, W, Hh, neu) {
    const [[a, b], [c, e]] = d.pts, x = Math.min(a, c) * W, y = Math.min(b, e) * Hh, w = Math.abs(c - a) * W, h = Math.abs(e - b) * Hh;
    let im = BILD.get(d.png);
    if (!im) { im = new Image(); im.onload = () => neu && neu(); im.src = 'data:image/png;base64,' + d.png; BILD.set(d.png, im); }
    g.save(); g.globalAlpha = 1;
    if (im.complete && im.naturalWidth) {   // wie im PDF (bpcore/unterschrift.stempeln): mittig im Feld, Seitenverhältnis bleibt
      const f = Math.min(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * f, dh = im.naturalHeight * f;
      g.translate(x + w / 2, y + h / 2); g.rotate(((d.drehung || 0) * Math.PI) / 180); g.drawImage(im, -dw / 2, -dh / 2, dw, dh);
      for (const [t, rx, ry, rh, neig, farbe, breite] of d.felder || []) {   // Prüfstempel: Datum und Name wie von Hand
        if (!t) continue;
        let fs = Math.max(5, rh * dh); g.save(); g.translate(-dw / 2 + rx * dw, -dh / 2 + ry * dh); g.rotate(((neig || 0) * Math.PI) / 180);
        const mx = dw * (breite || (1 - rx) * (neig ? 0.72 : 0.84)); g.fillStyle = rgb(farbe);
        do { g.font = `italic ${fs}px Helvetica,Arial,sans-serif`; } while (g.measureText(t).width > mx && (fs -= 0.5) > 5);
        g.fillText(t, 0, 0); g.restore();
      }
    }
    g.restore();
    if (d.text) { g.save(); g.fillStyle = '#595959'; g.font = `${Math.max(7, W * 0.0118)}px Helvetica,Arial,sans-serif`; g.textBaseline = 'top'; g.fillText(d.text, x, y + h + 2); g.restore(); }
  }

  /* Treffer: Abstand in Bildpunkten zur gezeichneten Form */
  const abst = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  function rahmen(d, W, Hh) {   // Umriss in Bildpunkten [x, y, w, h]
    const P = d.pts.map(([a, b]) => [a * W, b * Hh]), bw = Math.max(1, d.breite * W);
    if (d.art === 'haken' || d.art === 'kreuz') { const q = Math.max(10, bw * 4); return [P[0][0] - q * 0.5, P[0][1] - q * 0.7, q * 1.2, q * 1.2]; }
    if (d.art === 'text') { const fs = Math.max(10, bw * 4); return [P[0][0], P[0][1] - fs, Math.max(fs, String(d.text || '').length * fs * 0.6), fs * 1.15]; }
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), r = d.art === 'bild' ? 0 : bw / 2 + 3;
    return [Math.min(...xs) - r, Math.min(...ys) - r, Math.max(...xs) - Math.min(...xs) + 2 * r, Math.max(...ys) - Math.min(...ys) + 2 * r];
  }
  function treffer(d, p, W, Hh, tol) {
    const P = d.pts.map(([a, b]) => [a * W, b * Hh]), bw = Math.max(1, d.breite * W), t = (tol || 6) + bw / 2;
    if (['bild', 'haken', 'kreuz', 'text'].includes(d.art)) { const [x, y, w, h] = rahmen(d, W, Hh); return p[0] >= x - 3 && p[0] <= x + w + 3 && p[1] >= y - 3 && p[1] <= y + h + 3; }
    if (d.art === 'rechteck' && P.length > 1) { const [a, b] = [P[0], P[P.length - 1]], E = [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]];
      return E.some((q, k) => abst(p, q, E[(k + 1) % 4]) <= t); }
    const L = d.art === 'pfeil' && P.length > 1 ? [P[0], P[P.length - 1]] : P;
    if (L.length === 1) return Math.hypot(p[0] - L[0][0], p[1] - L[0][1]) <= t;
    for (let k = 1; k < L.length; k++) if (abst(p, L[k - 1], L[k]) <= t) return true;
    return false;
  }

  function einrichten(X) {
    const { el, S, SK } = X;
    let sel = null, zieh = null;   // sel: ausgewählte Markierung (Objekt aus SK.striche)
    const darf = (d) => !!d.id && (d.uid === X.ich() || (d.art !== 'bild' && SK.owner === X.ich()));
    const seiteVon = (d) => S.querySelector(`.bph-pg[data-seite="${d.seite}"]`);
    const punkt = (e) => {   // Seite unter dem Zeiger – nach der Lage, nicht nach e.target (beim Wischen hält S den Zeiger fest)
      let r = null; const wr = [...S.querySelectorAll('.bph-pg')].find((w) => { r = w.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
      if (!wr) return null;
      return { wr, seite: +wr.dataset.seite, p: [e.clientX - r.left, e.clientY - r.top], W: r.width, Hh: r.height }; };
    const roh = (d) => { const { id, uid, name, tmp, ...o } = d; return o; };   // zum Wiederherstellen ohne Kennung
    function weg() { S.querySelectorAll('.bpm-sel,.bpm-x').forEach((x) => x.remove()); }
    function zeig() {
      if (zieh) return;   // beim Ziehen bleibt der Rahmen (sonst geht der Zeiger verloren)
      weg(); if (!sel || !SK.striche.includes(sel)) { sel = null; return; }
      const wr = seiteVon(sel); if (!wr) return;
      const W = wr.clientWidth, Hh = wr.clientHeight, [x, y, w, h] = rahmen(sel, W, Hh), b = sel.art === 'bild' && darf(sel);
      const r = document.createElement('div'); r.className = 'bpm-sel' + (b ? ' b' : ''); Object.assign(r.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      if (b) { r.innerHTML = '<i title="Größe ändern"></i>'; r.title = 'Unterschrift verschieben – an der Ecke größer ziehen'; ziehbar(r, wr); }
      wr.appendChild(r);
      if (darf(sel)) { const k = document.createElement('button'); k.type = 'button'; k.className = 'bpm-x'; k.textContent = '✕'; k.title = sel.art === 'bild' ? 'Unterschrift löschen (Entf)' : 'Markierung löschen (Entf)';
        Object.assign(k.style, { left: x + w + 'px', top: y + 'px' }); k.addEventListener('click', (e) => { e.stopPropagation(); loeschen([sel]); }); wr.appendChild(k); }
    }
    async function loeschen(L, text) {
      L = L.filter(darf); if (!L.length) return;
      for (const d of L) { SK.striche = SK.striche.filter((x) => x !== d); X.zeichnen(d.seite); }
      sel = null; weg();
      const n = (await Promise.all(L.map((d) => X.SKJ(`api/bp/skizze/${SK.id}/loeschen`, 'POST', { was: d.id }).then((r) => r.n || 0).catch(() => 0)))).reduce((a, b) => a + b, 0);
      if (n < L.length && window.bpHinweis) bpHinweis('Nicht alles ließ sich löschen – Unterschriften löscht nur, wer unterschrieben hat; fremde Markierungen nur, wer das Markieren gestartet hat.');
      await X.abgleich();
      const sid = SK.id, bilder = L.some((d) => d.art === 'bild');
      if (n && window.rueckgaengig) rueckgaengig(text || (bilder ? 'Unterschrift gelöscht' : L.length === 1 ? 'Markierung gelöscht' : `${L.length} Markierungen gelöscht`),
        async () => { if (SK.id !== sid) return; for (const d of L) await X.SKJ(`api/bp/skizze/${sid}/strich`, 'POST', roh(d)).catch(() => {}); await X.abgleich(); });
    }
    function ziehbar(r, wr) {   // Unterschrift verschieben / größer ziehen – beim Loslassen ersetzt (löschen + neu, ohne Rückgängig-Eintrag fürs Löschen)
      r.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); r.setPointerCapture(e.pointerId);
        const [[a, b], [c, d]] = sel.pts; zieh = { gr: !!e.target.closest('i'), x: e.clientX, y: e.clientY, P: [Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b)], W: wr.clientWidth, Hh: wr.clientHeight }; });
      r.addEventListener('pointermove', (e) => { if (!zieh) return; const dx = (e.clientX - zieh.x) / zieh.W, dy = (e.clientY - zieh.y) / zieh.Hh, [x, y, w, h] = zieh.P;
        let n;
        if (zieh.gr) { const nw = Math.max(0.04, Math.min(1 - x, w + dx)); n = [x, y, nw, (h * nw) / w]; } else n = [Math.max(0, Math.min(1 - w, x + dx)), Math.max(0, Math.min(1 - h, y + dy)), w, h];
        sel.pts = [[n[0], n[1]], [n[0] + n[2], n[1] + n[3]]]; X.zeichnen(sel.seite);
        const [rx, ry, rw, rh] = rahmen(sel, zieh.W, zieh.Hh); Object.assign(r.style, { left: rx + 'px', top: ry + 'px', width: rw + 'px', height: rh + 'px' }); S.querySelectorAll('.bpm-x').forEach((k) => k.remove()); });
      const los = async () => { if (!zieh) return; const d = sel, alt = zieh; zieh = null; if (!d) return;
        const [[a, b]] = d.pts; if (Math.abs(a - alt.P[0]) < 1e-4 && Math.abs(b - alt.P[1]) < 1e-4 && !alt.gr) return;
        try { const r2 = await X.SKJ(`api/bp/skizze/${SK.id}/strich`, 'POST', roh(d)); await X.SKJ(`api/bp/skizze/${SK.id}/loeschen`, 'POST', { was: d.id }); d.id = r2.id; }
        catch (er) { if (window.bpHinweis) bpHinweis(er.message); }
        await X.abgleich(); sel = SK.striche.find((x) => x.id === d.id) || null; zeig(); };
      r.addEventListener('pointerup', los); r.addEventListener('pointercancel', los);
    }
    /* ✋ auswählen */
    S.addEventListener('click', (e) => {
      if (!SK.id || SK.werkzeug !== 'zeigen' || e.target.closest('.bpm-x,.bpm-sel,.bpu-sig,.bph-sktxt')) return;
      const q = punkt(e); if (!q) { sel = null; weg(); return; }
      const L = SK.striche.filter((d) => d.seite === q.seite && d.id);
      sel = [...L].reverse().find((d) => treffer(d, q.p, q.W, q.Hh)) || null;   // oben liegende zuerst
      zeig(); if (sel) e.stopPropagation();
    });
    document.addEventListener('keydown', (e) => {
      if (!sel || !el.isConnected || !['Delete', 'Backspace'].includes(e.key) || (window.bpTippt && bpTippt(e.target)) || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      e.preventDefault(); loeschen([sel]);
    });
    /* 🧽 radieren: ganze Markierungen, über die man wischt – keine Unterschriften */
    let rad = null;
    S.addEventListener('pointerdown', (e) => {
      if (!SK.id || SK.werkzeug !== 'radier') return;
      const q = punkt(e); if (!q) return; e.preventDefault(); try { S.setPointerCapture(e.pointerId); } catch { /* egal */ }
      rad = []; reib(e);
    });
    function reib(e) {
      const q = punkt(e); if (!q || !rad) return;
      for (const d of SK.striche) if (d.seite === q.seite && d.id && d.art !== 'bild' && darf(d) && !rad.includes(d) && treffer(d, q.p, q.W, q.Hh, 10)) { rad.push(d); d.weg = true; }
      const keep = SK.striche.filter((d) => !d.weg); if (keep.length !== SK.striche.length) { const L = SK.striche.filter((d) => d.weg); SK.striche = keep; SK._rad = (SK._rad || []).concat(L); X.zeichnen(q.seite); }
    }
    S.addEventListener('pointermove', (e) => { if (rad) reib(e); });
    const radLos = () => { if (!rad) return; const L = rad; rad = null; SK._rad = []; L.forEach((d) => { delete d.weg; });
      if (L.length) { SK.striche.push(...L); loeschen(L, L.length === 1 ? 'Markierung wegradiert' : `${L.length} Markierungen wegradiert`); } };
    S.addEventListener('pointerup', radLos); S.addEventListener('pointercancel', radLos);
    return { weg: () => { sel = null; weg(); }, modus: () => S.classList.toggle('bpm-radier', !!SK.id && SK.werkzeug === 'radier'), zeig };
  }
  window.bpMarkWahl = { bild, einrichten, treffer, rahmen };
})();
