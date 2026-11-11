/* Unterschreiben in der gemeinsamen PDF-Vorschau (/bp/unterschrift.js, lädt head.js von selbst) – Knopf „✍ Unterschreiben“.
   PC (Maus): Unterschrift auswählen – „Meine Unterschrift“ (Mein Konto) bzw. eine schon in diesem Dokument benutzte.
   Handy/Tablet (Finger): Unterschriftsfeld im Vollbild, mit dem Finger; „Gespeicherte“ nimmt die aus Mein Konto.
   Danach liegt die Unterschrift auf der Seite (Vorgabe: letzte Seite unten links) – verschieben, an der Ecke größer ziehen,
   auf eine andere Seite tippen setzt sie dorthin. „Übernehmen“ erzeugt das PDF neu (api/bp/pdf/unterschreiben),
   die Vorschau zeigt es, Teilen/Speichern/Drucken nehmen dann das unterschriebene.
   bpUnterschrift.start({ el, S, roh, name, fertig(blob, name) })   el = Vorschau, S = Seitenbereich, roh = ArrayBuffer des PDFs */
(() => {
  if (window.bpUnterschrift) return;
  const H = window.BPHead, esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = document.createElement('style');
  css.textContent = `.bpu-sig{position:absolute;z-index:6;border:2px dashed var(--y,#d4357f);border-radius:6px;cursor:move;touch-action:none;background:rgba(255,95,179,.06);box-sizing:border-box}
.bpu-sig img{width:100%;height:100%;object-fit:contain;pointer-events:none;display:block}
.bpu-sig i{position:absolute;right:-9px;bottom:-9px;width:18px;height:18px;border-radius:50%;background:var(--y,#d4357f);cursor:nwse-resize;touch-action:none}
.bpu-bar{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:30;display:flex;gap:.45rem;align-items:center;flex-wrap:wrap;justify-content:center;
  background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(12px*var(--rk,1));box-shadow:var(--sh0,0 10px 30px rgba(0,0,0,.35));padding:.5rem .7rem;max-width:calc(100% - 24px);font-size:.88rem}
.bpu-bar label{display:flex;gap:.35rem;align-items:center;color:var(--mute,#666)}
.bpu-b{border:1px solid var(--line,#ccc);background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(9px*var(--rk,1));padding:.4rem .8rem;font:inherit;cursor:pointer}
.bpu-b.pri{background:var(--y,#d4357f);border-color:var(--y,#d4357f);color:var(--on,#fff);font-weight:600}
.bpu-m{position:absolute;z-index:31;background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(12px*var(--rk,1));box-shadow:var(--sh0,0 14px 34px rgba(0,0,0,.35));padding:.35rem;display:grid;gap:.1rem;min-width:260px;font-size:.9rem}
.bpu-m button{display:flex;gap:.6rem;align-items:center;border:0;background:none;color:inherit;font:inherit;text-align:left;padding:.45rem .55rem;border-radius:8px;cursor:pointer}.bpu-m button:hover{background:var(--hov,rgba(0,0,0,.05))}
.bpu-m img{width:70px;height:28px;object-fit:contain;background:#fff;border:1px solid var(--line,#ddd);border-radius:4px}.bpu-m small{display:block;color:var(--mute,#666);font-size:.76rem}
.bpu-m .g{font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mute,#666);padding:.35rem .55rem .1rem}
.bpu-pad{position:fixed;inset:0;z-index:5000;background:var(--bg,#f3f2ef);display:flex;flex-direction:column;gap:.5rem;padding:calc(.6rem + env(safe-area-inset-top,0px)) calc(.8rem + env(safe-area-inset-right,0px)) calc(.6rem + env(safe-area-inset-bottom,0px)) calc(.8rem + env(safe-area-inset-left,0px))}
.bpu-pad .k{display:flex;gap:.6rem;align-items:center}.bpu-pad .k b{flex:1}
.bpu-pad .f{flex:1;min-height:160px;position:relative;background:#fff;border-radius:calc(12px*var(--rk,1));border:1px solid var(--line,#ccc);overflow:hidden}
.bpu-pad canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}
.bpu-pad .li{position:absolute;left:8%;right:8%;bottom:28%;border-bottom:1px dashed #9aa;pointer-events:none}
.bpu-pad .q{position:absolute;left:0;right:0;top:.6rem;text-align:center;color:#999;font-size:.8rem;pointer-events:none}@media (orientation:landscape){.bpu-pad .q{display:none}}
.bpu-pad .a{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap}`;
  document.head.appendChild(css);
  const TOUCH = () => matchMedia('(pointer:coarse)').matches;
  const heute = () => new Date().toLocaleDateString('de-DE');

  /* Unterschriftsfeld im Vollbild (Finger oder Stift) → PNG-Blob mit durchsichtigem Grund, beschnitten */
  function pad() {
    return new Promise((fertig) => {
      const d = document.createElement('div'); d.className = 'bpu-pad';
      d.innerHTML = `<div class="k"><b>Unterschreiben</b><button type="button" class="bpu-b" data-p="x">Abbrechen</button></div>
        <div class="f"><canvas></canvas><span class="li"></span><span class="q">Gerät quer halten für mehr Platz</span></div>
        <div class="a"><button type="button" class="bpu-b" data-p="leer">Löschen</button><button type="button" class="bpu-b" data-p="meine">Gespeicherte nehmen</button><button type="button" class="bpu-b pri" data-p="ok">Einsetzen</button></div>`;
      document.body.appendChild(d);
      const cv = d.querySelector('canvas'), ctx = cv.getContext('2d'); let zug = null, hat = false;
      const groesse = () => { const r = cv.getBoundingClientRect(), f = devicePixelRatio || 1; const alt = hat ? cv.toDataURL() : null; cv.width = r.width * f; cv.height = r.height * f; ctx.scale(f, f);
        ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#13307a'; ctx.lineWidth = 2.6;
        if (alt) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, r.width, r.height); im.src = alt; } };
      groesse(); addEventListener('resize', groesse);
      const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); zug = pt(e); ctx.beginPath(); ctx.arc(zug[0], zug[1], 1.2, 0, 7); ctx.fillStyle = '#13307a'; ctx.fill(); hat = true; });
      cv.addEventListener('pointermove', (e) => { if (!zug) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(zug[0], zug[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); zug = p; });
      const los = () => { zug = null; }; cv.addEventListener('pointerup', los); cv.addEventListener('pointercancel', los);
      const zu = (v) => { removeEventListener('resize', groesse); d.remove(); fertig(v); };
      d.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return;
        if (b.dataset.p === 'x') zu(null);
        else if (b.dataset.p === 'leer') { ctx.clearRect(0, 0, cv.width, cv.height); hat = false; }
        else if (b.dataset.p === 'meine') zu({ meine: true });
        else if (!hat) { if (window.toast) toast('Bitte zuerst unterschreiben.', true); }
        else zu({ blob: beschneiden(cv) }); });
    });
  }
  function beschneiden(cv) {   // nur die Fläche mit Strichen (etwas Rand) – sonst wäre das Bild meist leer
    const c = cv.getContext('2d'), { width: W, height: Hh } = cv, D = c.getImageData(0, 0, W, Hh).data;
    let x0 = W, y0 = Hh, x1 = 0, y1 = 0;
    for (let y = 0; y < Hh; y += 2) for (let x = 0; x < W; x += 2) if (D[(y * W + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const r = 12, w = Math.max(10, x1 - x0 + 2 * r), h = Math.max(10, y1 - y0 + 2 * r), o = document.createElement('canvas'); o.width = w; o.height = h;
    o.getContext('2d').drawImage(cv, Math.max(0, x0 - r), Math.max(0, y0 - r), w, h, 0, 0, w, h);
    return new Promise((ok) => o.toBlob(ok, 'image/png'));
  }

  /* PC: Auswahl */
  function auswahl(knopf, el) {
    return new Promise((fertig) => {
      const m = document.createElement('div'); m.className = 'bpu-m';
      m.innerHTML = `<div class="g">Unterschrift wählen</div><button type="button" data-u="meine"><img alt="" src="api/bp/signatur?t=${Date.now()}"><span>Meine Unterschrift<small>aus „Mein Konto“</small></span></button>
        <button type="button" data-u="zeichnen"><span style="font-size:1.2rem;width:70px;text-align:center">✍</span><span>Selbst zeichnen<small>mit Maus, Stift oder Touchscreen</small></span></button>
        <button type="button" data-u="x"><span style="width:70px"></span><span>Abbrechen</span></button>`;
      el.appendChild(m);
      m.querySelector('img').addEventListener('error', (e) => { e.target.style.visibility = 'hidden'; });
      const r = knopf.getBoundingClientRect(), re = el.getBoundingClientRect();
      m.style.top = (r.bottom - re.top + 6) + 'px'; m.style.left = Math.max(8, Math.min(re.width - m.offsetWidth - 8, r.right - re.left - m.offsetWidth)) + 'px';
      m.addEventListener('click', async (e) => { const b = e.target.closest('[data-u]'); if (!b) return; m.remove();
        if (b.dataset.u === 'meine') fertig({ meine: true });
        else if (b.dataset.u === 'zeichnen') fertig(await pad());
        else fertig(null); });
    });
  }

  async function start(o) {
    const { el, S } = o;
    if (el.querySelector('.bpu-bar')) return;
    const knopf = el.querySelector('[data-gv="us"]') || el.querySelector('.bph-gvb');
    let wahl = null, blob = null;
    const r0 = await fetch('api/bp/signatur', { credentials: 'same-origin' }).catch(() => null);   // vorbelegt: die eigene Unterschrift aus „Mein Konto“
    if (r0 && r0.ok) { wahl = { meine: true }; blob = await r0.blob(); }
    else {
      wahl = TOUCH() ? await pad() : await auswahl(knopf, el);
      if (!wahl) return;
      if (wahl.meine) { if (window.toast) toast('Noch keine Unterschrift hinterlegt – unter „Mein Konto“ ein Foto hochladen oder selbst zeichnen.', true); return; }
      blob = await wahl.blob;
    }
    let src = URL.createObjectURL(blob);
    const seiten = [...S.querySelectorAll('.bph-pg')]; if (!seiten.length) return;
    let pg = seiten[seiten.length - 1];
    const sig = document.createElement('div'); sig.className = 'bpu-sig'; sig.innerHTML = `<img alt="Unterschrift" src="${src}"><i title="Größe ändern"></i>`;
    const P = { x: 0.08, y: 0.72, w: 0.3, h: 0.07 };
    const img = sig.querySelector('img'); img.onload = () => { const v = img.naturalWidth / Math.max(1, img.naturalHeight), pr = pg.getBoundingClientRect(); P.h = Math.min(0.15, (P.w * pr.width) / v / pr.height); setz(); };
    const setz = () => { if (sig.parentElement !== pg) { pg.style.position = 'relative'; pg.appendChild(sig); } Object.assign(sig.style, { left: P.x * 100 + '%', top: P.y * 100 + '%', width: P.w * 100 + '%', height: P.h * 100 + '%' }); };
    setz(); pg.scrollIntoView({ block: 'end', behavior: 'smooth' });
    let zieh = null;
    sig.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true }); sig.addEventListener('click', (e) => e.stopPropagation());   // nicht blättern, Leisten bleiben
    sig.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); sig.setPointerCapture(e.pointerId); const r = pg.getBoundingClientRect(); zieh = { gr: !!e.target.closest('i'), x: e.clientX, y: e.clientY, P0: { ...P }, W: r.width, Hh: r.height }; });
    sig.addEventListener('pointermove', (e) => { if (!zieh) return; const dx = (e.clientX - zieh.x) / zieh.W, dy = (e.clientY - zieh.y) / zieh.Hh;
      if (zieh.gr) { const v = zieh.P0.w / zieh.P0.h; P.w = Math.max(0.06, Math.min(1 - P.x, zieh.P0.w + dx)); P.h = P.w / v; } else { P.x = Math.max(0, Math.min(1 - P.w, zieh.P0.x + dx)); P.y = Math.max(0, Math.min(1 - P.h, zieh.P0.y + dy)); }
      setz(); });
    const los = () => { zieh = null; }; sig.addEventListener('pointerup', los); sig.addEventListener('pointercancel', los);
    const tipp = (e) => { const z = e.target.closest('.bph-pg'); if (!z || e.target.closest('.bpu-sig')) return; e.stopPropagation(); const r = z.getBoundingClientRect(); pg = z;   // auf eine Seite tippen: Unterschrift dorthin
      P.x = Math.max(0, Math.min(1 - P.w, (e.clientX - r.left) / r.width - P.w / 2)); P.y = Math.max(0, Math.min(1 - P.h, (e.clientY - r.top) / r.height - P.h / 2)); setz(); };
    S.addEventListener('click', tipp, true);
    const name = (H && H.me && (H.me.full || H.me.name)) || '';
    const bar = document.createElement('div'); bar.className = 'bpu-bar';
    bar.innerHTML = `<span>Unterschrift verschieben, an der Ecke größer ziehen · auf eine Seite tippen setzt sie dorthin</span>
      <label><input type="checkbox" data-u="txt" checked> Name und Datum darunter</label><button type="button" class="bpu-b" data-u="anders">✍ Anders unterschreiben</button><button type="button" class="bpu-b" data-u="ab">Abbrechen</button><button type="button" class="bpu-b pri" data-u="ok">Übernehmen</button>`;
    el.appendChild(bar);
    const ende = () => { S.removeEventListener('click', tipp, true); sig.remove(); bar.remove(); URL.revokeObjectURL(src); };
    bar.addEventListener('click', async (e) => { const b = e.target.closest('button[data-u]'); if (!b) return;
      if (b.dataset.u === 'ab') { ende(); return; }
      if (b.dataset.u === 'anders') { const w = await pad(); if (!w) return;
        if (w.meine) { const r = await fetch('api/bp/signatur', { credentials: 'same-origin' }); if (!r.ok) { if (window.toast) toast('Noch keine Unterschrift in „Mein Konto“.', true); return; } blob = await r.blob(); wahl = { meine: true }; }
        else { blob = await w.blob; wahl = w; }
        URL.revokeObjectURL(src); src = URL.createObjectURL(blob); img.src = src; return; }
      b.disabled = true; b.textContent = 'Wird eingesetzt …';
      const fd = new FormData(); fd.append('pdf', new Blob([o.roh], { type: 'application/pdf' }), 'dokument.pdf');
      if (wahl.meine) fd.append('meine', '1'); else fd.append('bild', blob, 'unterschrift.png');
      fd.append('seite', pg.dataset.seite || seiten.length); ['x', 'y', 'w', 'h'].forEach((k) => fd.append(k, P[k]));
      if (bar.querySelector('[data-u="txt"]').checked) fd.append('text', [name, heute()].filter(Boolean).join(' · '));
      try {
        const r = await fetch('api/bp/pdf/unterschreiben', { method: 'POST', body: fd, credentials: 'same-origin' });
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Fehler ' + r.status); }
        const neu = await r.blob(); ende();
        const nm = String(o.name || 'Dokument.pdf').replace(/(\s*\(unterschrieben\))?\.pdf$/i, '') + ' (unterschrieben).pdf';
        o.fertig(neu, nm);
        if (window.toast) toast('Unterschrieben – Teilen, Speichern und Drucken nehmen jetzt das unterschriebene PDF.');
      } catch (er) { b.disabled = false; b.textContent = 'Übernehmen'; if (window.toast) toast(er.message, true); }
    });
  }
  window.bpUnterschrift = { start, pad };
})();
