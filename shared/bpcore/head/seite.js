/* Bereich rechts – derselbe Baustein für LV, Aufträge, Aufmaßprüfung und Rechnungen.
   Reiter oben (Details, Kopierquelle, 📄 Dokument …), Trennung zur Tabelle verschiebbar (Doppelklick: Mitte), ✕ klappt den
   Bereich an den Rand, jeder Reiter lässt sich einzeln als freies Fenster abdocken (an der Kopfzeile verschieben, an der Ecke
   ziehen, ⇲ dockt wieder an). Zustand je Bereich im Browser gemerkt.

   seite(sp, key, reiter[, opt])
     sp     – Container: erstes Kind ist die Tabelle (links); der Bereich rechts wird angehängt
     key    – Name des Bereichs (z. B. 'am', 're', 'au', 'lv') – getrennt gemerkt
     reiter – [{ id, titel, mount(el), neu?(), fenster? }]: mount füllt das Feld (im Bereich, im freien Fenster oder im eigenen
              Browserfenster), neu() wird nach einer Größenänderung aufgerufen (z. B. PDF neu zeichnen);
              fenster: true → Knopf „⇱“: der Reiter zieht in ein eigenes Browserfenster (zweiter Bildschirm) und bleibt verbunden
     opt    – { start?: Reiter beim ersten Öffnen, w?: Anteil der Tabelle (Standard 0,52), wechsel?() }: nach Umschalten (Reiter, zuklappen, abdocken) – z. B. Spaltenbreiten neu
   seiteUmschalten() / seiteOffen() / seiteDa() – für den Knopf „Details“ in der Leiste
   seiteAufraeumen() – freie Fenster eines nicht mehr sichtbaren Bereichs schließen (nach dem Neuzeichnen der Seite) */
(function () {
  const lies = (k, d) => { try { const v = localStorage.getItem('bp.sr.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const merk = (k, v) => { try { localStorage.setItem('bp.sr.' + k, JSON.stringify(v)); } catch { /* ohne Speicher: nur für diese Sitzung */ } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const AKTIV = new Map();   // key → { sp, reiter, opt }
  const EIGEN = new Map();   // 'key|id' → eigenes Browserfenster des Reiters
  const grenz = (v, a, b) => Math.max(a, Math.min(b, v));

  function seite(sp, key, reiter, opt = {}) {
    if (!sp) return;
    reiter = (reiter || []).filter(Boolean);
    AKTIV.set(key, { sp, reiter, opt });
    const frei = lies(key + '.frei', []).filter((id) => reiter.some((r) => r.id === id));
    const dock = reiter.filter((r) => !frei.includes(r.id));
    const akt = dock.find((r) => r.id === lies(key + '.r', opt.start || '')) || dock[0];
    const zu = !!lies(key + '.zu', false), w = grenz(+lies(key + '.w', opt.w || 0.52) || 0.52, 0.2, 0.85), schmal = innerWidth < 900;
    sp.classList.add('sr-split'); sp.dataset.sr = key;
    let r = sp.querySelector(':scope > .sr-r');
    if (!r) { r = document.createElement('aside'); r.className = 'sr-r'; sp.appendChild(r); }
    let g = sp.querySelector(':scope > .sr-griff');
    if (!g) { g = document.createElement('div'); g.className = 'sr-griff'; g.title = 'Trennung verschieben (Doppelklick: Mitte)'; sp.insertBefore(g, r); }
    sp.classList.toggle('sr-leer', !dock.length); sp.classList.toggle('sr-zu', !!dock.length && zu);
    sp.style.gridTemplateColumns = schmal || !dock.length ? '' : zu ? 'minmax(0,1fr) 2.6rem' : `minmax(0,${w}fr) 16px minmax(0,${1 - w}fr)`;
    g.hidden = schmal || zu || !dock.length;
    if (!dock.length) r.innerHTML = '';
    else if (zu) r.innerHTML = `<button type="button" class="sr-auf" data-sra="auf" title="Bereich rechts wieder zeigen">${dock.map((x) => `<span>${esc(x.titel)}</span>`).join('')}</button>`;
    else {
      r.innerHTML = `<div class="sr-rt" role="tablist">${dock.map((x) => `<button type="button" role="tab" class="sr-tab${x === akt ? ' on' : ''}" data-srt="${esc(x.id)}" aria-selected="${x === akt}">${esc(x.titel)}</button>`).join('')}<span class="sr-sp"></span>`
        + (eigenOffen(key, akt.id) ? '' : `${akt.fenster ? `<button type="button" class="sr-ik" data-sra="fen" title="„${esc(akt.titel)}“ in ein eigenes Browserfenster – z. B. auf den zweiten Bildschirm">⇱</button>` : ''}<button type="button" class="sr-ik" data-sra="ab" title="„${esc(akt.titel)}“ als freies Fenster abdocken">⧉</button>`) + `<button type="button" class="sr-ik" data-sra="zu" title="Bereich an den Rand klappen – oben „Details“ zeigt ihn wieder">✕</button></div><div class="sr-b"></div>`;
      if (eigenOffen(key, akt.id)) r.querySelector('.sr-b').innerHTML = `<div class="sr-weg"><div><p>„${esc(akt.titel)}“ ist in einem <b>eigenen Fenster</b> geöffnet.</p><button type="button" class="btn" data-sra="hol">↩ hierher zurückholen</button></div></div>`;
      else akt.mount(r.querySelector('.sr-b'));
    }
    const neu = () => { seite(sp, key, reiter, opt); if (opt.wechsel) opt.wechsel(); };
    r.onclick = (e) => {
      const t = e.target.closest('[data-srt]'); if (t) { merk(key + '.r', t.dataset.srt); return neu(); }
      const a = e.target.closest('[data-sra]'); if (!a) return;
      if (a.dataset.sra === 'zu') merk(key + '.zu', true);
      else if (a.dataset.sra === 'auf') merk(key + '.zu', false);
      else if (a.dataset.sra === 'fen') { eigenAuf(key, akt); return; }
      else if (a.dataset.sra === 'hol') { eigenZu(key, akt.id); return; }
      else if (a.dataset.sra === 'ab') { merk(key + '.frei', [...frei, akt.id]); merk(key + '.r', ''); }
      neu();
    };
    g.onpointerdown = (e) => { if (e.button !== 0) return; e.preventDefault(); g.setPointerCapture(e.pointerId); const b = sp.getBoundingClientRect();
      g.onpointermove = (m) => { const v = grenz((m.clientX - b.left) / b.width, 0.2, 0.85); sp.style.gridTemplateColumns = `minmax(0,${v}fr) 16px minmax(0,${1 - v}fr)`; merk(key + '.w', v); };
      g.onpointerup = () => { g.onpointermove = null; if (akt && akt.neu) akt.neu(); if (opt.wechsel) opt.wechsel(); }; };
    g.ondblclick = () => { merk(key + '.w', opt.w || 0.52); neu(); if (akt && akt.neu) akt.neu(); };
    if (akt && akt.neu && !r._ro) {   // Breite des Bereichs ändert sich (Fenster, Trennung): Inhalt neu zeichnen
      let breite = r.clientWidth, t = 0;
      r._ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { const x = AKTIV.get(key), w2 = r.clientWidth; if (Math.abs(w2 - breite) > 40 && x) { breite = w2; const a2 = x.reiter.find((y) => y.id === lies(key + '.r', x.opt.start || '')) || x.reiter.find((y) => !lies(key + '.frei', []).includes(y.id)); if (a2 && a2.neu) a2.neu(); } }, 350); });
      r._ro.observe(r);
    }
    fenster(key, reiter.filter((x) => frei.includes(x.id)), neu);
    eigenFuellen(key);
    seiteAufraeumen();
  }

  /* freie Fenster: eines je abgedocktem Reiter */
  function fenster(key, liste, neu) {
    document.querySelectorAll('.sr-flo').forEach((f) => { if (f.dataset.key === key && !liste.some((x) => x.id === f.dataset.id)) f.remove(); });
    liste.forEach((rt, i) => {
      let f = [...document.querySelectorAll('.sr-flo')].find((x) => x.dataset.key === key && x.dataset.id === rt.id);
      if (!f) {
        f = document.createElement('div'); f.className = 'sr-flo'; f.dataset.key = key; f.dataset.id = rt.id; f.setAttribute('role', 'dialog'); f.setAttribute('aria-label', rt.titel); document.body.appendChild(f);
        const q = lies(`${key}.pos.${rt.id}`, null) || { x: innerWidth - 680 - i * 32, y: 110 + i * 32, w: 620, h: innerHeight - 170 };
        Object.assign(f.style, { left: grenz(q.x, 120 - q.w, innerWidth - 120) + 'px', top: grenz(q.y, 0, innerHeight - 60) + 'px', width: q.w + 'px', height: q.h + 'px' });
        let breite = q.w, t = 0;
        new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (!f.isConnected) return; merk(`${key}.pos.${f.dataset.id}`, { x: f.offsetLeft, y: f.offsetTop, w: f.offsetWidth, h: f.offsetHeight });
          if (Math.abs(f.clientWidth - breite) > 40) { breite = f.clientWidth; const x = AKTIV.get(key), a = x && x.reiter.find((y) => y.id === f.dataset.id); if (a && a.neu) a.neu(); } }, 350); }).observe(f);
      }
      f.innerHTML = `<div class="sr-fk"><b>${esc(rt.titel)}</b>${rt.fenster ? '<button type="button" class="sr-ik" data-sra="fen" title="in ein eigenes Browserfenster – z. B. auf den zweiten Bildschirm">⇱</button>' : ''}<button type="button" class="sr-ik" data-sra="an" title="wieder rechts andocken">⇲</button><button type="button" class="sr-ik" data-sra="an" title="Fenster schließen – der Reiter kommt zurück in den Bereich rechts">✕</button></div><div class="sr-b"></div>`;
      rt.mount(f.querySelector('.sr-b'));
      const kopf = f.firstElementChild;
      kopf.onpointerdown = (e) => { if (e.button !== 0 || e.target.closest('button,input,select,a')) return; e.preventDefault(); kopf.setPointerCapture(e.pointerId);
        const sx = e.clientX - f.offsetLeft, sy = e.clientY - f.offsetTop;
        kopf.onpointermove = (m) => { f.style.left = grenz(m.clientX - sx, 120 - f.offsetWidth, innerWidth - 120) + 'px'; f.style.top = grenz(m.clientY - sy, 0, innerHeight - 50) + 'px'; };
        kopf.onpointerup = () => { kopf.onpointermove = null; merk(`${key}.pos.${rt.id}`, { x: f.offsetLeft, y: f.offsetTop, w: f.offsetWidth, h: f.offsetHeight }); }; };
      f.onpointerdown = () => { document.querySelectorAll('.sr-flo').forEach((x) => x.classList.toggle('vorn', x === f)); };   // angeklicktes Fenster nach vorn
      kopf.onclick = (e) => { if (e.target.closest('[data-sra="fen"]')) { merk(key + '.r', rt.id); f.remove(); eigenAuf(key, rt); return; } if (!e.target.closest('[data-sra="an"]')) return; merk(key + '.frei', lies(key + '.frei', []).filter((id) => id !== rt.id)); merk(key + '.r', rt.id); merk(key + '.zu', false); f.remove(); neu(); };
    });
  }

  /* eigenes Browserfenster je Reiter: der Inhalt wird wie im Bereich gefüllt (mount), nur in einem anderen Fenster.
     Bedien-Ereignisse der Seite gelten dort mit (BP_HORCHER aus bp.js); schließt man das Fenster, sitzt der Reiter wieder rechts. */
  const eigenOffen = (key, id) => { const w = EIGEN.get(key + '|' + id); if (w && w.closed) EIGEN.delete(key + '|' + id); return !!w && !w.closed; };
  const nochmal = (key) => { const x = AKTIV.get(key); if (x && x.sp.isConnected) { seite(x.sp, key, x.reiter, x.opt); if (x.opt.wechsel) x.opt.wechsel(); } };
  function eigenStil(w) {   // Aussehen der Seite übernehmen: Stilblätter, Farbschema und Stil-Variablen am <html>
    const d = w.document, H = document.documentElement;
    d.head.querySelectorAll('[data-sre]').forEach((n) => n.remove());
    document.querySelectorAll('link[rel="stylesheet"],style').forEach((n) => { const c = d.importNode(n, true); if (c.tagName === 'LINK') c.href = n.href; c.setAttribute('data-sre', ''); d.head.appendChild(c); });
    [...d.documentElement.attributes].forEach((a) => d.documentElement.removeAttribute(a.name));
    [...H.attributes].forEach((a) => d.documentElement.setAttribute(a.name, a.value));
    d.body.className = document.body.className + ' sr-eigen';
  }
  function eigenAuf(key, rt) {
    const q = lies(`${key}.win.${rt.id}`, null) || { w: 900, h: Math.min(1100, screen.availHeight - 80) };
    const w = window.open('', 'bp_sr_' + key + '_' + rt.id, `popup=yes,width=${q.w},height=${q.h}${q.x != null ? `,left=${q.x},top=${q.y}` : ''}`);
    if (!w) { if (window.toast) window.toast('Das Fenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.', true); return; }
    const d = w.document; d.open(); d.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><base href="${esc(document.baseURI)}"><title>${esc(rt.titel)}</title></head><body><div class="sr-ek"><b></b><button type="button" class="btn sm" data-sre="zur" title="Fenster schließen – der Reiter sitzt wieder rechts im Bereich">↩ zurück</button></div><div class="sr-b"></div></body></html>`); d.close();
    eigenStil(w); EIGEN.set(key + '|' + rt.id, w); BP_FENSTER.add(w);
    BP_HORCHER.forEach(([t, f, o]) => d.addEventListener(t, f, o));
    d.addEventListener('click', (e) => { if (e.target.closest('[data-sre="zur"]')) w.close(); });
    let t = 0, breite = w.innerWidth;
    w.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (w.closed) return; merk(`${key}.win.${rt.id}`, { w: w.outerWidth, h: w.outerHeight, x: w.screenX, y: w.screenY });
      if (Math.abs(w.innerWidth - breite) > 40) { breite = w.innerWidth; const x = AKTIV.get(key), a = x && x.reiter.find((y) => y.id === rt.id); if (a && a.neu) a.neu(); } }, 350); });
    w.addEventListener('pagehide', () => { try { merk(`${key}.win.${rt.id}`, { w: w.outerWidth, h: w.outerHeight, x: w.screenX, y: w.screenY }); } catch { /* egal */ }
      EIGEN.delete(key + '|' + rt.id); BP_FENSTER.delete(w); setTimeout(() => nochmal(key), 0); });
    merk(key + '.frei', lies(key + '.frei', []).filter((id) => id !== rt.id));
    nochmal(key); if (rt.neu) setTimeout(() => { if (!w.closed) rt.neu(); }, 400);
  }
  function eigenZu(key, id) { const w = EIGEN.get(key + '|' + id); if (w && !w.closed) w.close(); else { EIGEN.delete(key + '|' + id); nochmal(key); } }
  function eigenFuellen(key) {   // nach jedem Neuzeichnen: Inhalt der eigenen Fenster dieses Bereichs nachführen
    for (const [k, w] of [...EIGEN.entries()]) { const [ke, id] = k.split('|'); if (ke !== key) continue;
      if (w.closed) { EIGEN.delete(k); BP_FENSTER.delete(w); continue; }
      const x = AKTIV.get(key), rt = x && x.sp.isConnected && x.reiter.find((y) => y.id === id), d = w.document, b = d.querySelector('.sr-b'); if (!b) continue;
      if (d.documentElement.dataset.theme !== document.documentElement.dataset.theme || d.documentElement.getAttribute('style') !== document.documentElement.getAttribute('style')) eigenStil(w);
      b.className = 'sr-b'; b.innerHTML = '';
      if (rt) { d.title = rt.titel + ' – ' + document.title; d.querySelector('.sr-ek b').textContent = rt.titel; rt.mount(b); }
      else b.innerHTML = '<div class="sr-weg"><div><p>Zur aktuellen Auswahl gibt es hier nichts zu zeigen.</p><p class="hint">Das Fenster füllt sich wieder, sobald du links einen passenden Eintrag wählst.</p></div></div>';
    }
  }
  addEventListener('pagehide', () => EIGEN.forEach((w) => { try { w.close(); } catch { /* egal */ } }));   // Seite verlassen: Fenster mitnehmen

  const sichtbar = () => [...AKTIV.entries()].filter(([, x]) => x.sp.isConnected && x.reiter.length);
  function seiteAufraeumen() {
    for (const [k, x] of [...AKTIV.entries()]) if (!x.sp.isConnected) AKTIV.delete(k);
    document.querySelectorAll('.sr-flo').forEach((f) => { if (!AKTIV.has(f.dataset.key)) f.remove(); });
    for (const k of EIGEN.keys()) if (!AKTIV.has(k.split('|')[0])) eigenFuellen(k.split('|')[0]);
  }
  function seiteDa() { return sichtbar().length > 0; }
  function seiteOffen() { const s = sichtbar()[0]; return !!s && !lies(s[0] + '.zu', false); }
  function seiteReiter(key, id) {   // einen Reiter nach vorn holen (und den Bereich aufklappen) – z. B. Knopf „Kopierquelle“
    merk(key + '.r', id); merk(key + '.zu', false); merk(key + '.frei', lies(key + '.frei', []).filter((x) => x !== id));
    const x = AKTIV.get(key); if (x && x.sp.isConnected) seite(x.sp, key, x.reiter, x.opt);
  }
  function seiteUmschalten() {
    const s = sichtbar()[0]; if (!s) return;
    const [key, x] = s; merk(key + '.zu', !lies(key + '.zu', false)); seite(x.sp, key, x.reiter, x.opt); if (x.opt.wechsel) x.opt.wechsel();
  }
  Object.assign(window, { seite, seiteAufraeumen, seiteDa, seiteOffen, seiteUmschalten, seiteReiter });
})();
