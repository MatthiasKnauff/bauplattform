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
.bpu-quer.gedreht{inset:auto!important;top:0!important;left:var(--qx)!important;width:var(--qw)!important;height:var(--qh)!important;max-width:none!important;max-height:none!important;transform-origin:top left;transform:rotate(90deg);box-sizing:border-box}
.bpu-pad .a{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap}`;
  document.head.appendChild(css);
  const TOUCH = () => matchMedia('(pointer:coarse)').matches;
  const heute = () => new Date().toLocaleDateString('de-DE');

  /* Tinte wie mit dem Füller: Strichstärke aus dem Tempo (schnell = dünn), beim Stift aus dem Druck; weiche Kurven durch die Mittelpunkte.
     flaeche(canvas) → { leer(), hat(), png(maxW) → dataURL, blob() → Promise<Blob> }. Striche bleiben als Punkte gespeichert (Breite-bezogen),
     beim Drehen/Größe ändern wird neu gezeichnet. Liegt die Fläche in einem gedrehten Behälter (.bpu-quer.gedreht), werden die Zeigerpunkte zurückgedreht. */
  const TINTE = '#13307a', MINW = 0.6, MAXW = 4;
  function strich(ctx, Z, f) {   // Z: [{x,y,w}] in Fläche-Einheiten, f: Maßstab
    if (!Z.length) return;
    ctx.fillStyle = TINTE;
    const punkt = (x, y, w) => { ctx.beginPath(); ctx.arc(x * f, y * f, Math.max(0.35, (w * f) / 2), 0, 6.2832); ctx.fill(); };
    if (Z.length === 1) { punkt(Z[0].x, Z[0].y, Z[0].w * 1.2); return; }
    let m0 = Z[0], w0 = Z[0].w;
    for (let i = 1; i < Z.length; i++) {
      const c = Z[i - 1], n = Z[i], m1 = i === Z.length - 1 ? n : { x: (c.x + n.x) / 2, y: (c.y + n.y) / 2 }, w1 = (c.w + n.w) / 2;
      const len = Math.hypot(c.x - m0.x, c.y - m0.y) + Math.hypot(m1.x - c.x, m1.y - c.y), st = Math.max(2, Math.ceil(len * f / 0.6));
      for (let k = 0; k <= st; k++) { const t = k / st, u = 1 - t;
        punkt(u * u * m0.x + 2 * u * t * c.x + t * t * m1.x, u * u * m0.y + 2 * u * t * c.y + t * t * m1.y, w0 + (w1 - w0) * t); }
      m0 = m1; w0 = w1;
    }
  }
  function flaeche(cv) {
    const ctx = cv.getContext('2d'), Zs = []; let akt = null, v = 0, last = null, B = 1;
    const neu = () => { const k = devicePixelRatio || 1, W = cv.offsetWidth, Hh = cv.offsetHeight; if (!W) return; cv.width = W * k; cv.height = Hh * k; ctx.setTransform(k, 0, 0, k, 0, 0); B = W; malen(); };
    const malen = () => { ctx.clearRect(0, 0, cv.width, cv.height); Zs.forEach((Z) => strich(ctx, Z, B)); };
    const pt = (e) => { const r = cv.getBoundingClientRect(), g = cv.closest('.bpu-quer.gedreht');
      return g ? [e.clientY - r.top, r.right - e.clientX] : [e.clientX - r.left, e.clientY - r.top]; };
    const breite = (e, x, y) => {
      if (e.pointerType === 'pen' && e.pressure > 0 && e.pressure !== 0.5) return (MINW + (MAXW - MINW) * Math.min(1, e.pressure * 1.25)) / B;
      const dt = Math.max(1, e.timeStamp - last.t), sp = Math.hypot(x - last.x, y - last.y) / dt;   // px je ms
      v = 0.75 * sp + 0.25 * v; return Math.max(MINW, MAXW / (v * 2.2 + 1)) / B;
    };
    const dazu = (e) => { const [x, y] = pt(e); if (last && Math.hypot(x - last.x, y - last.y) < 0.8) return;
      const w = last ? breite(e, x, y) : (MAXW * 0.7) / B; akt.push({ x: x / B, y: y / B, w }); last = { x, y, t: e.timeStamp };
      const n = akt.length; ctx.save(); if (n >= 2) strich(ctx, akt.slice(Math.max(0, n - 3)), B); else strich(ctx, akt, B); ctx.restore(); };
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch { /* egal */ } akt = []; Zs.push(akt); v = 0; last = null; dazu(e); });
    cv.addEventListener('pointermove', (e) => { if (!akt) return; e.preventDefault(); (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(dazu); });
    const ende = () => { if (akt) { akt = null; malen(); } }; cv.addEventListener('pointerup', ende); cv.addEventListener('pointercancel', ende);
    const ro = new ResizeObserver(neu); ro.observe(cv); neu();
    const rahmen = () => { const P = Zs.flat(); if (P.length < 3) return null; const xs = P.map((p) => p.x), ys = P.map((p) => p.y), r = MAXW / B * 2;
      return { x0: Math.min(...xs) - r, y0: Math.min(...ys) - r, x1: Math.max(...xs) + r, y1: Math.max(...ys) + r }; };
    const bild = (maxW = 900) => { const R = rahmen(); if (!R) return null; const f = Math.min(maxW / Math.max(1e-6, R.x1 - R.x0), 2 * B * (devicePixelRatio || 1));   // höchstens doppelt so fein wie am Bildschirm
      const o = document.createElement('canvas'); o.width = Math.ceil((R.x1 - R.x0) * f); o.height = Math.ceil((R.y1 - R.y0) * f);
      const c2 = o.getContext('2d'); c2.translate(-R.x0 * f, -R.y0 * f); Zs.forEach((Z) => strich(c2, Z, f)); return o; };
    return { leer() { Zs.length = 0; malen(); }, hat: () => Zs.some((Z) => Z.length), png: (m) => { const o = bild(m); return o ? o.toDataURL('image/png') : ''; },
      blob: (m) => new Promise((ok) => { const o = bild(m); if (!o) ok(null); else o.toBlob(ok, 'image/png'); }), weg: () => ro.disconnect() };
  }
  /* Querformat erzwingen: Vollbild + Sperre (Android); geht das nicht (iPhone), wird der Behälter bei Hochformat um 90° gedreht gezeigt */
  function quer(box) {
    box.classList.add('bpu-quer');
    let gesperrt = false;
    const pruef = () => { const g = !gesperrt && innerHeight > innerWidth; box.classList.toggle('gedreht', g);   // Maße aus dem sichtbaren Fenster (100vh ist am iPhone zu hoch)
      box.style.setProperty('--qx', innerWidth + 'px'); box.style.setProperty('--qw', innerHeight + 'px'); box.style.setProperty('--qh', innerWidth + 'px'); };
    if (TOUCH()) {
      const fs = document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen({ navigationUI: 'hide' }) : Promise.reject();
      fs.then(() => screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : Promise.reject()).then(() => { gesperrt = true; pruef(); }).catch(() => {});
    }
    pruef(); addEventListener('resize', pruef);
    return () => { removeEventListener('resize', pruef); try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch { /* egal */ }
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); };
  }

  /* Unterschriftsfeld im Vollbild (Finger oder Stift) → { blob } (PNG, durchsichtig, beschnitten) */
  function pad() {
    return new Promise((fertig) => {
      const d = document.createElement('div'); d.className = 'bpu-pad';
      d.innerHTML = `<div class="k"><b>Unterschreiben</b><button type="button" class="bpu-b" data-p="x">Abbrechen</button></div>
        <div class="f"><canvas></canvas><span class="li"></span></div>
        <div class="a"><button type="button" class="bpu-b" data-p="leer">Löschen</button><button type="button" class="bpu-b" data-p="meine">Gespeicherte nehmen</button><button type="button" class="bpu-b pri" data-p="ok">Einsetzen</button></div>`;
      document.body.appendChild(d);
      const F = flaeche(d.querySelector('canvas')), frei = quer(d);
      const zu = (v) => { F.weg(); frei(); d.remove(); fertig(v); };
      d.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return;
        if (b.dataset.p === 'x') zu(null);
        else if (b.dataset.p === 'leer') F.leer();
        else if (b.dataset.p === 'meine') zu({ meine: true });
        else if (!F.hat()) { if (window.toast) toast('Bitte zuerst unterschreiben.', true); }
        else zu({ blob: F.blob() }); });
    });
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
    let wahl = null, blob = null, rot = 0;
    if (o.stempel) {   // direkt mit einem Stempel des Büros anfangen
      const r = await fetch('api/bp/stempel/' + o.stempel, { credentials: 'same-origin' }).catch(() => null);
      if (!r || !r.ok) { if (window.toast) toast('Dieser Stempel ist noch nicht hinterlegt (Verwaltung → Büro-Einstellungen → Firma & Logo).', true); return; }
      wahl = { stempel: o.stempel }; blob = await r.blob(); rot = locker();
    } else {
    const r0 = await fetch('api/bp/signatur', { credentials: 'same-origin' }).catch(() => null);   // vorbelegt: die eigene Unterschrift aus „Mein Konto“
    if (r0 && r0.ok) { wahl = { meine: true }; blob = await r0.blob(); }
    else {
      wahl = TOUCH() ? await pad() : await auswahl(knopf, el);
      if (!wahl) return;
      if (wahl.meine) { if (window.toast) toast('Noch keine Unterschrift hinterlegt – unter „Mein Konto“ ein Foto hochladen oder selbst zeichnen.', true); return; }
      blob = await wahl.blob;
    }
    }
    let src = URL.createObjectURL(blob);
    const seiten = [...S.querySelectorAll('.bph-pg')]; if (!seiten.length) return;
    let pg = seiten[seiten.length - 1];
    const sig = document.createElement('div'); sig.className = 'bpu-sig'; sig.innerHTML = `<img alt="Unterschrift" src="${src}"><i title="Größe ändern"></i>`;
    const P = wahl.stempel ? { x: 0.55, y: 0.62, w: 0.3, h: 0.12 } : { x: 0.08, y: 0.72, w: 0.3, h: 0.07 };
    const img = sig.querySelector('img'); img.onload = () => { const v = img.naturalWidth / Math.max(1, img.naturalHeight), pr = pg.getBoundingClientRect(); P.h = Math.min(0.15, (P.w * pr.width) / v / pr.height); setz(); };
    const setz = () => { if (sig.parentElement !== pg) { pg.style.position = 'relative'; pg.appendChild(sig); } Object.assign(sig.style, { left: P.x * 100 + '%', top: P.y * 100 + '%', width: P.w * 100 + '%', height: P.h * 100 + '%', transform: rot ? `rotate(${rot}deg)` : '' }); };
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
      <label><input type="checkbox" data-u="txt"${!wahl.stempel || wahl.stempel === 'pruef' ? ' checked' : ''}> Name und Datum eintragen</label><button type="button" class="bpu-b" data-u="anders">✍ Anders unterschreiben</button><button type="button" class="bpu-b" data-u="stempel">🔖 Stempel</button><button type="button" class="bpu-b" data-u="ab">Abbrechen</button><button type="button" class="bpu-b pri" data-u="ok">Übernehmen</button>`;
    el.appendChild(bar);
    const ende = () => { S.removeEventListener('click', tipp, true); sig.remove(); bar.remove(); URL.revokeObjectURL(src); };
    bar.addEventListener('click', async (e) => { const b = e.target.closest('button[data-u]'); if (!b) return;
      if (b.dataset.u === 'ab') { ende(); return; }
      if (b.dataset.u === 'stempel') {   // Stempel des Büros statt Unterschrift – leicht schräg wie von Hand
        const L = await fetch('api/bp/stempel', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => []);
        const da = L.filter((x) => x.vorhanden); if (!da.length) { if (window.toast) toast('Noch keine Stempel hinterlegt (Verwaltung → Büro-Einstellungen → Firma & Logo).', true); return; }
        const art = await stempelWahl(b, el, da); if (!art) return;
        const r = await fetch('api/bp/stempel/' + art, { credentials: 'same-origin' }); if (!r.ok) return;
        blob = await r.blob(); wahl = { stempel: art }; rot = locker(); bar.querySelector('[data-u="txt"]').checked = art === 'pruef';   // Prüfstempel: Datum und Name gleich eintragen
        Object.assign(P, { w: 0.3, h: 0.12 }); URL.revokeObjectURL(src); src = URL.createObjectURL(blob); img.src = src; return; }
      if (b.dataset.u === 'anders') { const w = await pad(); if (!w) return; rot = 0;
        if (w.meine) { const r = await fetch('api/bp/signatur', { credentials: 'same-origin' }); if (!r.ok) { if (window.toast) toast('Noch keine Unterschrift in „Mein Konto“.', true); return; } blob = await r.blob(); wahl = { meine: true }; }
        else { blob = await w.blob; wahl = w; }
        URL.revokeObjectURL(src); src = URL.createObjectURL(blob); img.src = src; return; }
      b.disabled = true; b.textContent = 'Wird eingesetzt …';
      const fd = new FormData(); fd.append('pdf', new Blob([o.roh], { type: 'application/pdf' }), 'dokument.pdf');
      if (wahl.stempel) fd.append('stempel', wahl.stempel); else if (wahl.meine) fd.append('meine', '1'); else fd.append('bild', blob, 'unterschrift.png');
      if (rot) fd.append('drehung', rot);
      if (wahl.stempel && bar.querySelector('[data-u="txt"]').checked) fd.append('eintragen', '1');   // Prüfstempel: Datum und Name in die Felder
      fd.append('seite', pg.dataset.seite || seiten.length); ['x', 'y', 'w', 'h'].forEach((k) => fd.append(k, P[k]));
      if (!wahl.stempel && bar.querySelector('[data-u="txt"]').checked) fd.append('text', [name, heute()].filter(Boolean).join(' · '));
      try {
        const r = await fetch('api/bp/pdf/unterschreiben', { method: 'POST', body: fd, credentials: 'same-origin' });
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Fehler ' + r.status); }
        const neu = await r.blob(); ende();
        const nm = String(o.name || 'Dokument.pdf').replace(/(\s*\((unterschrieben|gestempelt)\))?\.pdf$/i, '') + (wahl.stempel ? ' (gestempelt).pdf' : ' (unterschrieben).pdf');
        o.fertig(neu, nm);
        if (window.toast) toast((wahl.stempel ? 'Gestempelt' : 'Unterschrieben') + ' – Teilen, Speichern und Drucken nehmen jetzt dieses PDF.');
      } catch (er) { b.disabled = false; b.textContent = 'Übernehmen'; if (window.toast) toast(er.message, true); }
    });
  }
  const locker = () => (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 4);   // 1,5–5,5° schräg – wie ein Stempel von Hand
  function stempelWahl(knopf, el, L) {   // kleine Liste der Stempel mit Vorschau
    return new Promise((fertig) => {
      const m = document.createElement('div'); m.className = 'bpu-m';
      m.innerHTML = `<div class="g">Stempel des Büros</div>${L.map((x) => `<button type="button" data-st="${esc(x.art)}"><img alt="" src="api/bp/stempel/${esc(x.art)}"><span>${esc(x.name)}<small>${esc(x.text)}</small></span></button>`).join('')}<button type="button" data-st=""><span style="width:70px"></span><span>Abbrechen</span></button>`;
      el.appendChild(m);
      const r = knopf.getBoundingClientRect(), re = el.getBoundingClientRect();
      m.style.top = Math.max(8, r.top - re.top - m.offsetHeight - 8) + 'px'; m.style.left = Math.max(8, Math.min(re.width - m.offsetWidth - 8, r.left - re.left)) + 'px';
      m.addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (!b) return; m.remove(); fertig(b.dataset.st || null); });
    });
  }
  window.bpUnterschrift = { start, pad, flaeche, quer };
})();
