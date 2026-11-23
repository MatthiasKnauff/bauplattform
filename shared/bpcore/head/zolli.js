'use strict';
/* Zolli – Hinweise am PC (nur am PC geladen) – aus head.js ausgelagert (23.11.2026): geladen erst, wenn es gebraucht wird (BPHead.baustein('zolli')).
   Gemeinsame Hilfen der Kopfleiste über BPHead._i (head.js). */
(function () {
  const H = window.BPHead, { esc, ls, ZK } = H._i;
  /* ---------- Zolli: lästiger kleiner Zollstock (nur am PC), der auf Ablagefelder und Tricks hinweist ----------
     Ziele: bekannte Ablagefelder der Apps und jedes Element mit data-bp-tipp="Text" (optional data-bp-tipp-key). */
  const zWeg = () => { try { return new Set(JSON.parse(ls(ZK + '.weg') || '[]')); } catch { return new Set(); } };
  const ZTIPPS = [
    ['avadrop', '[data-avadrop]', 'Psst! Angebote, LVs, Aufmaße und Rechnungen kannst du einfach <b>hierher ziehen</b> – oder irgendwo auf die Seite. Ich erkenne, was es ist, und frage, wohin damit.'],
    ['amdrop', '[data-amdrop]', 'Rechnung oder Aufmaß der Firma als PDF <b>hier hineinziehen</b> – auch Scans. Dann gehen wir Position für Position durch, mit ✔ und ✘.'],
    ['redrop', '[data-redrop]', 'Die Rechnung der Firma als PDF einfach <b>hier hineinziehen</b> – sie landet auch gleich im Projektordner.'],
    ['bkdrop', '.bk-drop,.bk-plaene #drop', 'Grundrisse als PDF, IFC- oder DXF-Dateien (z. B. aus Allplan) einfach <b>hierher ziehen</b> – ich lese Räume und Flächen daraus.'],
    ['btdrop', '.sec[data-drop]', 'Fotos kannst du direkt <b>auf einen Eintrag oder Abschnitt ziehen</b> – dann hängen sie gleich dran.'],
  ];
  const ZSVG = `<svg class="bph-zolli-fig" viewBox="0 0 80 112" aria-hidden="true">
    <g class="bph-zl-arm-l"><rect x="6" y="56" width="22" height="7" rx="2" fill="#f5c518" stroke="#8a6d00" stroke-width="1" transform="rotate(-20 28 60)"/></g>
    <g class="bph-zl-arm-r"><rect x="52" y="56" width="22" height="7" rx="2" fill="#f5c518" stroke="#8a6d00" stroke-width="1" transform="rotate(-35 52 60)"/></g>
    <rect x="31" y="58" width="18" height="26" rx="2" fill="#f5c518" stroke="#8a6d00" stroke-width="1"/>
    <path d="M33 63h5M33 68h3M33 73h5M33 78h3" stroke="#3b3000" stroke-width="1"/>
    <g transform="rotate(18 34 84)"><rect x="28" y="84" width="9" height="24" rx="2" fill="#f5c518" stroke="#8a6d00" stroke-width="1"/></g>
    <g transform="rotate(-18 46 84)"><rect x="43" y="84" width="9" height="24" rx="2" fill="#f5c518" stroke="#8a6d00" stroke-width="1"/></g>
    <circle cx="40" cy="84" r="2.2" fill="#9aa0a6"/><circle cx="31" cy="60" r="2" fill="#9aa0a6"/><circle cx="49" cy="60" r="2" fill="#9aa0a6"/>
    <rect x="25" y="24" width="30" height="33" rx="4" fill="#f5c518" stroke="#8a6d00" stroke-width="1.2"/>
    <path d="M27 50h4M27 46h2M49 50h4M51 46h2" stroke="#3b3000" stroke-width="1"/>
    <ellipse cx="34" cy="37" rx="5" ry="6" fill="#fff" stroke="#3b3000" stroke-width=".8"/><ellipse cx="46" cy="37" rx="5" ry="6" fill="#fff" stroke="#3b3000" stroke-width=".8"/>
    <circle class="bph-zl-pu" cx="35" cy="38" r="2.3" fill="#1c1c1a"/><circle class="bph-zl-pu" cx="47" cy="38" r="2.3" fill="#1c1c1a"/>
    <path d="M34 48q6 5 12 0" fill="none" stroke="#3b3000" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M20 26q20-22 40 0z" fill="#f28c28" stroke="#b55d0d" stroke-width="1"/><rect x="17" y="24" width="46" height="5" rx="2.5" fill="#d96f12"/><path d="M40 8v14" stroke="#b55d0d" stroke-width="1.4"/>
  </svg>`;
  let zEl = null, zZiel = null, zKey = null;
  function zZu() { if (zEl) zEl.remove(); zEl = null; if (zZiel) zZiel.classList.remove('bph-zolli-ziel'); zZiel = null; zKey = null; }
  const zSichtbar = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 14 && r.bottom > 60 && r.top < innerHeight - 40 && r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== 'hidden'; };
  function zZeigen(ziel, html, key, knopfe = true) {
    zZu(); zZiel = ziel; zKey = key; ziel.classList.add('bph-zolli-ziel');
    zEl = document.createElement('div'); zEl.className = 'bph-zolli'; zEl.setAttribute('role', 'status');
    if (!window.__bpDlgWacht) {   // nie über einem Dialog: html.bp-dlg, solange ein Fenster offen ist (Klasse statt body:has(…) – das war bei großen Seiten teuer)
      const pruef = () => document.documentElement.classList.toggle('bp-dlg', !!document.querySelector('body > .modal-bg, body > .bph-dlg-bg, dialog[open]'));
      window.__bpDlgWacht = new MutationObserver(pruef); window.__bpDlgWacht.observe(document.body, { childList: true }); pruef(); }
    zEl.innerHTML = `<div class="bph-zolli-bl">${html}${knopfe ? '<div class="bph-zolli-k"><button type="button" data-z="ok">Verstanden</button><button type="button" data-z="spaeter">Später</button><button type="button" data-z="aus" title="Zolli ausschalten – wieder einschalten unter ⚙ → Persönlich">Geh weg!</button></div>' : ''}</div>${ZSVG}`;
    document.body.appendChild(zEl);
    const r = ziel.getBoundingClientRect(), w = zEl.offsetWidth, h = zEl.offsetHeight;
    let x = r.right + 14; if (x + w > innerWidth - 10) x = Math.max(10, r.left - w - 14);
    let y = Math.min(innerHeight - h - 10, Math.max(60, r.top + r.height / 2 - h / 2));
    zEl.style.left = x + 'px'; zEl.style.top = y + 'px'; zEl.classList.toggle('links', x < r.left);
    const sx = r.left + r.width / 2 - (x + w - 40), sy = r.top + r.height / 2 - (y + h - 60), n = Math.hypot(sx, sy) || 1;   // Augen schauen zum Ziel
    zEl.querySelectorAll('.bph-zl-pu').forEach((pu) => pu.setAttribute('transform', `translate(${(sx / n * 1.8).toFixed(2)} ${(sy / n * 2.2).toFixed(2)})`));
    try { sessionStorage.setItem(ZK + '.zuletzt', String(Date.now())); } catch { /* egal */ }
    zEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-z]'); if (!b) return;
      if (b.dataset.z === 'ok') { const w2 = zWeg(); w2.add(zKey); ls(ZK + '.weg', JSON.stringify([...w2])); }
      if (b.dataset.z === 'spaeter') { try { sessionStorage.setItem(ZK + '.spaeter', String(Date.now() + 15 * 60000)); } catch { /* egal */ } }
      if (b.dataset.z === 'aus') { ls(ZK, 'aus'); if (window.toast) window.toast('Zolli ist still. Wieder einschalten: ⚙ → Persönlich → Zolli.'); }
      zZu();
    });
  }
  function zKandidat() {
    const weg = zWeg();
    for (const [key, sel, txt] of ZTIPPS) { if (weg.has(key)) continue; const el = [...document.querySelectorAll(sel)].find(zSichtbar); if (el) return [el, txt, key]; }
    for (const el of document.querySelectorAll('[data-bp-tipp]')) { const key = el.dataset.bpTippKey || 't:' + el.dataset.bpTipp.slice(0, 60); if (!weg.has(key) && zSichtbar(el)) return [el, esc(el.dataset.bpTipp), key]; }
    return null;
  }
  function zPruefen() {
    if (!H.zolliAn() || zEl || document.querySelector('.modal-bg,.bph-dlg-bg,.bph-gv,.bed') || document.visibilityState !== 'visible') return;
    let sp = 0, zl = 0; try { sp = +sessionStorage.getItem(ZK + '.spaeter') || 0; zl = +sessionStorage.getItem(ZK + '.zuletzt') || 0; } catch { /* egal */ }
    if (Date.now() < sp || Date.now() - zl < 90000) return;
    const k = zKandidat(); if (k) zZeigen(k[0], k[1], k[2]);
  }
  function zolliStart() {
    setTimeout(zPruefen, 6000); setInterval(zPruefen, 20000);
    addEventListener('scroll', () => { if (zEl && zZiel && !zSichtbar(zZiel)) zZu(); }, { passive: true });
    let ziehT = 0;   // beim Ziehen einer Datei: „Hier rein!“ am nächsten Ablagefeld
    document.addEventListener('dragenter', (e) => {
      if (!H.zolliAn() || ![...(e.dataTransfer && e.dataTransfer.types || [])].includes('Files')) return;
      clearTimeout(ziehT); if (zEl && zKey === 'zieh') return;
      const ziele = [...document.querySelectorAll(ZTIPPS.map((t) => t[1]).join(','))].filter(zSichtbar); if (!ziele.length) return;
      zZeigen(ziele[0], 'Hier rein! ⬇ Einfach loslassen.', 'zieh', false);
    });
    const ende = () => { clearTimeout(ziehT); ziehT = setTimeout(() => { if (zKey === 'zieh') zZu(); }, 400); };
    document.addEventListener('drop', ende); document.addEventListener('dragend', ende);
    document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) ende(); });
  }
  H._zolliZu = zZu;   // Schalter „Zolli zeigen“ aus (head.js)
  zolliStart();
})();
