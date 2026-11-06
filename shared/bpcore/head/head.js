'use strict';
/* =====================================================================
   Bauplattform – gemeinsame Kopfleiste aller Apps
   Bauportal / <App>  ·  aktuelles Projekt  ·  KI-Auswahl  ·  Benutzer (Apps, Darstellung, Abmelden)

   Einbinden:
     <link rel="stylesheet" href="bp/head.css"><script src="bp/head.js"></script>
     BPHead.mount({ app: 'gantt', name: 'Bauzeitenplan', parent: el, before: el2, sticky: false });
     BPHead.setProject({ sub: 'Projekt A526 · Bauherr', title: 'Umgestaltung …' });
     BPHead.onKi((ki, provider) => …);      // Auswahl geändert (gilt in allen Apps)
   Braucht in der App: /api/me, /api/platform, /api/bp/ki (bpcore.head), /api/logout
   ===================================================================== */
(function () {
  if (window.BPHead) return;
  const H = window.BPHead = { me: null, conf: null, ki: 'intern', providers: [], app: '', ready: null };
  const listeners = [];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getJ = (u) => fetch(u, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))));
  const SV = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const IC = {
    home: SV('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
    bautagebuch: SV('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7M9 16h5"/>'),
    gantt: SV('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M7 13h6M10 17h7"/>'),
    adressen: SV('<rect x="4" y="3" width="15" height="18" rx="2"/><circle cx="11.5" cy="10" r="2.5"/><path d="M7.5 17a4 4 0 0 1 8 0"/>'),
    plaene: SV('<path d="M4 4h11l5 5v11H4z"/><path d="M15 4v5h5"/><path d="M8 13h8M8 17h5"/><path d="M7 9h4"/>'),
    kommunikation: SV('<path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M19 9h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v2l-3-2h-4"/><path d="M6 9h7M6 12h4"/>'),
    baudaten: SV('<path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
    ava: SV('<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M8 10h8M8 13h8M8 16h5"/><path d="M14.5 17.5l1.5 1.5 3-3"/>'),
    aufgaben: SV('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    baukosten: SV('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h6"/>'),
    admin: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>'),
    papierkorb: SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>'),
    out: SV('<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>'),
    look: SV('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 3a9 9 0 0 1 0 18"/>'),
    konto: SV('<path d="M4 19c3-1 4-6 6-6s1 5 3 5 2-3 3-3 2 2 4 2"/><path d="M4 22h16"/>'),
    grid: SV('<rect x="4" y="4" width="4" height="4" rx="1"/><rect x="10" y="4" width="4" height="4" rx="1"/><rect x="16" y="4" width="4" height="4" rx="1"/><rect x="4" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="16" y="10" width="4" height="4" rx="1"/><rect x="4" y="16" width="4" height="4" rx="1"/><rect x="10" y="16" width="4" height="4" rx="1"/><rect x="16" y="16" width="4" height="4" rx="1"/>'),
    gear: SV('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    buero: SV('<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5"/><path d="M9 10h.01M15 10h.01"/>'),
  };
  H.IC = IC;
  const appUrl = (a) => {   // wie bp.js: über den Reverse Proxy → eingetragene Adresse, direkt über Port → gleicher Rechner
    const h = location.hostname, direct = `${location.protocol}//${h}:${a.port}`;
    if (!a.url) return direct;
    const c = H.conf || {}, dom = c.domain || '';
    const via = !c.proxied || c.proxied.includes(h) || (dom && (h === dom || h.endsWith('.' + dom)));
    return via ? a.url : direct;
  };
  let band = null, tipT = 0;
  function tip(msg) {
    if (!band) return;
    let t = band.querySelector('.bph-tip'); if (!t) { t = document.createElement('div'); t.className = 'bph-tip'; t.setAttribute('role', 'status'); band.appendChild(t); }
    t.textContent = msg; clearTimeout(tipT); tipT = setTimeout(() => t.remove(), 5000);
  }
  function closeMenus() {
    if (!band) return;
    band.querySelectorAll('.bph-menu').forEach((m) => m.remove());
    if (lookDirty) {   // Apps mit eigener Farbsteuerung (Bautagebuch, Bauzeitenplan) übernehmen die neuen Farben beim Neuladen
      lookDirty = false;
      Promise.resolve(typeof window.flushSave === 'function' ? window.flushSave() : null).catch(() => null).then(() => location.reload());
    }
  }
  const prov = (k) => H.providers.find((p) => p.key === k) || { key: k, label: k, ok: k === 'intern', hint: '' };

  function renderKi() {
    if (!band) return;
    const box = band.querySelector('.bph-ki');
    box.innerHTML = '<span class="bph-lbl">KI</span>' + (H.providers.length ? H.providers : [prov('intern')]).map((p) =>
      `<button type="button" class="bph-pill${p.key === H.ki ? ' on' : ''}${p.ok ? '' : ' off'}" data-ki="${p.key}" aria-pressed="${p.key === H.ki}" title="${esc(p.hint)}">${esc(p.label)}</button>`).join('');
    band.querySelector('.bph-kim').innerHTML = `KI: <b style="margin-left:.3rem">${esc(prov(H.ki).label)}</b>`;
  }
  async function setKi(k) {
    const p = prov(k);
    if (!p.ok) { tip(`${p.label}: ${p.hint || 'nicht eingerichtet'}`); return; }
    if (k === H.ki) return;
    const old = H.ki; H.ki = k; renderKi();
    try {
      const r = await fetch('api/bp/ki', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ki: k }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || r.statusText);
      H.providers = d.providers || H.providers;
    } catch (e) { H.ki = old; renderKi(); tip('KI-Auswahl nicht gespeichert: ' + e.message); return; }
    renderKi();
    tip(`KI: ${p.label} – gilt jetzt in allen Apps.${p.paid ? ' Anfragen kosten je Nutzung Geld.' : ''}`);
    listeners.forEach((f) => { try { f(H.ki, prov(H.ki)); } catch { /* App-Fehler nicht weitergeben */ } });
  }
  /* KI-Auswahl neu laden (z. B. nachdem der Administrator kostenpflichtige KI abgeschaltet hat) – auch im Fenster, das die Büro-Einstellungen eingebettet hat */
  H.kiLaden = async function () {
    try {
      const d = await getJ('api/bp/ki'), alt = H.ki;
      H.ki = d.choice || 'intern'; H.providers = d.providers || []; renderKi();
      if (alt !== H.ki) listeners.forEach((f) => { try { f(H.ki, prov(H.ki)); } catch { /* egal */ } });
    } catch { /* egal */ }
    try { if (window.parent !== window && window.parent.BPHead && window.parent.BPHead.kiLaden) window.parent.BPHead.kiLaden(); } catch { /* andere Herkunft */ }
  };
  function kiMenu() {
    closeMenus();
    const m = document.createElement('div'); m.className = 'bph-menu'; m.setAttribute('role', 'menu');
    m.innerHTML = '<div class="bph-info">KI für alle Apps</div>' + H.providers.map((p) =>
      `<button type="button" role="menuitemradio" aria-checked="${p.key === H.ki}" class="bph-k${p.key === H.ki ? ' on' : ''}" data-ki="${p.key}"${p.ok ? '' : ' aria-disabled="true"'}><span>${esc(p.label)}<small>${esc(p.hint)}</small></span></button>`).join('');
    band.appendChild(m);
  }
  function userMenu() {
    closeMenus();
    const me = H.me || {}, apps = ((H.conf || {}).apps || []).filter((a) => a.allowed);
    const portal = apps.find((a) => a.key === 'portal');
    const m = document.createElement('div'); m.className = 'bph-menu'; m.setAttribute('role', 'menu');
    m.innerHTML = `<div class="bph-info">Angemeldet als <b>${esc(me.full || me.name || '')}</b>${me.full && me.full !== me.name ? ` <small>(${esc(me.name)})</small>` : ''}</div>`
      + `<button type="button" role="menuitem" data-konto>${IC.user}Mein Konto <small class="bph-ms">Unterschrift, Signatur, Versand, Kalender</small></button>`
      + `<button type="button" role="menuitem" data-look>${IC.look}Darstellung</button>`
      + '<div class="bph-sep"></div>'
      + `<button type="button" role="menuitem" data-out>${IC.out}Abmelden</button>`;
    void apps; void portal;
    band.appendChild(m);
  }
  /* ▦ Apps: alle Apps als Kacheln – in jeder App gleich; die Verwaltung gibt es nur hier */
  function sortApps() {
    const apps = ((H.conf || {}).apps || []).filter((a) => a.allowed);
    const rank = (a) => (a.key === 'portal' ? -1 : a.key === 'admin' ? 99 : 0);
    return apps.slice().sort((a, b) => rank(a) - rank(b));
  }
  function appsMenu() {
    closeMenus();
    const m = document.createElement('div'); m.className = 'bph-menu bph-apps'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', 'Apps');
    const apps = sortApps();
    m.innerHTML = '<div class="bph-info">Apps' + (H.projekt && H.projekt.id ? ` <small>· Projekt <b>${esc(H.projekt.name)}</b> bleibt gewählt</small>` : '') + '</div><div class="bph-tiles">'
      + (apps.length ? apps.map((a) => `<a role="menuitem" data-af="${esc(a.key)}" href="${esc(appUrl(a))}/"${a.key === H.app ? ' class="cur" aria-current="page"' : ''}>${IC[a.key === 'portal' ? 'home' : a.key] || IC.home}<span>${esc(a.key === 'portal' ? 'Startseite' : a.name)}</span></a>`).join('')
          + (() => { const pt = apps.find((a) => a.key === 'portal'); return pt ? `<a role="menuitem" data-af="papierkorb" href="${esc(appUrl(pt))}/papierkorb"${H.app === 'papierkorb' ? ' class="cur" aria-current="page"' : ''}>${IC.papierkorb}<span>Papierkorb</span></a>` : ''; })()
        : '<span class="bph-mu" style="padding:.5rem">Keine weiteren Apps.</span>') + '</div>';
    band.appendChild(m);
  }
  /* Darstellung: Farbschema und Akzentfarbe des Benutzers – kleines Fenster an der Kopfleiste oder im Einstellungsfenster, gilt in allen Apps */
  const THEMES = [['dunkel', 'Dunkel'], ['hell', 'Hell'], ['auto', 'Automatisch'], ['klassisch', 'Klassisch Grün']];
  const ACCENTS = [['#ff5fb3', 'Pink'], ['#ffd200', 'Gelb'], ['#ff9a2e', 'Orange'], ['#ff6b5e', 'Rot'], ['#3ddc84', 'Grün'], ['#2fd6c9', 'Türkis'], ['#4da3ff', 'Blau'], ['#b18cff', 'Violett'], ['#f3f3f1', 'Weiß']];
  let lookDirty = false;
  const lookHtml = () => {
    const me = H.me || {}, t = me.theme || 'dunkel', a = String(me.accent || ACCENTS[0][0]).toLowerCase();
    return `<div class="bph-lk">${THEMES.map(([k, n]) => `<button type="button" class="bph-th${k === t ? ' on' : ''}" data-th="${k}">${esc(n)}</button>`).join('')}</div>
      <div class="bph-sw">${ACCENTS.map(([c, n]) => `<button type="button" class="${c === a ? 'on' : ''}" style="background:${c}" data-acc="${c}" title="${n}" aria-label="${n}"></button>`).join('')}
        <label class="${ACCENTS.some((x) => x[0] === a) ? '' : 'on'}" title="Eigene Farbe"><input type="color" value="${esc(a)}" data-accc></label></div>`;
  };
  function lookWire(m, redraw) {
    m.addEventListener('click', (e) => {
      const th = e.target.closest('[data-th]'), ac = e.target.closest('[data-acc]');
      if (th || ac) e.stopPropagation();
      if (th) saveLook({ theme: th.dataset.th }, redraw); else if (ac) saveLook({ accent: ac.dataset.acc }, redraw);
    });
    m.addEventListener('change', (e) => { if (e.target.matches('[data-accc]')) saveLook({ accent: e.target.value }, redraw); });
  }
  function lookMenu() {
    band.querySelectorAll('.bph-menu').forEach((x) => x.remove());
    const m = document.createElement('div'); m.className = 'bph-menu bph-look'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Darstellung');
    m.innerHTML = '<div class="bph-info"><b>Darstellung</b> – gilt für dich in allen Apps</div>' + lookHtml();
    m.addEventListener('click', (e) => e.stopPropagation());
    band.appendChild(m);
    lookWire(m, lookMenu);
  }
  async function saveLook(d, redraw) {
    try {
      const r = await fetch('api/bp/darstellung', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      H.me = Object.assign(H.me || {}, { theme: r.theme, accent: r.accent });
      setTimeout(eigeneFarben, 50);
      if (typeof window.applyLook === 'function') window.applyLook(H.me); else lookDirty = true;
      (redraw || lookMenu)();
      try { localStorage.setItem('bpTheme', r.theme); if (r.accent) localStorage.setItem('accent', r.accent); } catch { /* egal */ }
    } catch (e) { alert('Darstellung konnte nicht gespeichert werden: ' + e.message); }
  }
  H.look = lookMenu;
  /* Apps ohne bp.css (Bauzeitenplan) kennen --card/--ink/--y nicht – dann bekämen die gemeinsamen Dialoge die dunklen
     Ersatzfarben und Pink. Dort setzt die Kopfleiste Schema (head.css: html.bph-eigen) und die persönliche Akzentfarbe. */
  function eigeneFarben() {
    const root = document.documentElement;
    if (!root.classList.contains('bph-eigen') && getComputedStyle(root).getPropertyValue('--card').trim()) return;   // App hat eigene Farben (bp.css)
    root.classList.add('bph-eigen');
    const lum = (x) => { const n = parseInt(x.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
    const sh = (x, f) => { const n = parseInt(x.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join(''); };
    let c = /^#[0-9a-f]{6}$/i.test((H.me && H.me.accent) || '') ? H.me.accent : '#ff5fb3';
    if ((root.dataset.theme || 'dunkel') !== 'dunkel') while (lum(c) > 0.62) c = sh(c, 0.85);   // wie bp.js: auf hellem Grund lesbar
    root.style.setProperty('--y', c); root.style.setProperty('--on', lum(c) > 0.55 ? '#111' : '#fff');
  }
  H.eigeneFarben = eigeneFarben;
  /* Überall, wo man Dateien hochladen kann, geht auch Ziehen und Ablegen: die Datei landet im nächstgelegenen Datei-Feld
     (passender Typ, z. B. Fotos → Feld für Bilder). Apps mit eigener Ablage (Fotos an LV-Positionen, Grundrisse …) behandeln
     das Ereignis selbst – dann greift dies nicht (defaultPrevented). */
  (function dropUeberall() {
    let mark = null, hinw = null;
    const hatDateien = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
    const typen = (e) => [...(e.dataTransfer.items || [])].filter((i) => i.kind === 'file').map((i) => ({ type: i.type || '', name: '' }));
    const passt = (inp, fs) => {
      const acc = (inp.accept || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
      return !acc.length || fs.every((f) => acc.some((a) => (a.endsWith('/*') ? (f.type || '').startsWith(a.slice(0, -1))
        : a.startsWith('.') ? (!f.name ? !f.type || /octet|xml|sheet|excel|json|pdf/.test(f.type) || a.includes(f.type.split('/')[1] || '#') : f.name.toLowerCase().endsWith(a))
          : f.type === a) || (f.name && /\.(heic|heif)$/i.test(f.name) && a === 'image/*')));
    };
    const sichtbar = (el) => !el.closest('[hidden]:not(input), .hidden:not(input)') || el.closest('label');
    function ziel(start, fs) {
      for (let el = start; el && el !== document.documentElement; el = el.parentElement) {
        const ins = [...el.querySelectorAll('input[type=file]')].filter((i) => !i.disabled && passt(i, fs) && sichtbar(i));
        if (ins.length) return { inp: ins.find((i) => !i.hasAttribute('capture')) || ins[0], zone: el };
      }
      return null;
    }
    const weg = () => { if (mark) mark.classList.remove('bph-dropzone'); mark = null; if (hinw) { hinw.remove(); hinw = null; } };
    window.addEventListener('dragover', (e) => {
      if (!hatDateien(e) || e.defaultPrevented) return;
      e.preventDefault();   // sonst öffnet der Browser die Datei und die Seite ist weg
      const z = ziel(e.target, typen(e));
      e.dataTransfer.dropEffect = z ? 'copy' : 'none';
      const zone = z && (z.zone === document.body ? null : z.zone);
      if (zone !== mark) { weg(); if (zone) { mark = zone; mark.classList.add('bph-dropzone'); } }
      if (z && !zone && !hinw) { hinw = document.createElement('div'); hinw.className = 'bph-drophinw'; hinw.textContent = 'Loslassen zum Hochladen'; document.body.appendChild(hinw); }
    });
    window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) weg(); });
    window.addEventListener('drop', (e) => {
      const fs = e.dataTransfer ? [...(e.dataTransfer.files || [])] : [];
      weg();
      if (!fs.length || e.defaultPrevented) return;
      e.preventDefault();
      const z = ziel(e.target, fs);
      if (!z) { if (window.toast) window.toast('Hier kann keine Datei abgelegt werden.', true); return; }
      const dt = new DataTransfer(); (z.inp.multiple ? fs : fs.slice(0, 1)).forEach((f) => dt.items.add(f));
      z.inp.files = dt.files; z.inp.dispatchEvent(new Event('change', { bubbles: true })); z.inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
  })();
  try { new MutationObserver(() => { if (document.documentElement.classList.contains('bph-eigen')) eigeneFarben(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { /* egal */ }
  async function logout() {
    if (typeof window.flushSave === 'function') { try { await window.flushSave(); } catch { /* weiter */ } }
    const r = await fetch('api/logout', { method: 'POST', credentials: 'same-origin' }).then((x) => x.json()).catch(() => ({}));
    const portal = ((H.conf || {}).apps || []).find((a) => a.key === 'portal');
    location.href = r.login || (portal ? appUrl(portal) + '/login' : '/');
  }

  H.mount = function (opt) {
    opt = opt || {};
    if (band) return H.ready;
    H.app = opt.app || '';
    band = document.createElement('header');
    band.className = 'bph' + (opt.sticky ? ' bph-sticky' : '');
    band.innerHTML = `<a class="bph-brand" href="/" title="Zur Startseite">${IC.home}<span class="bph-plat">Bauportal</span><span class="bph-sl">/</span><span class="bph-app">${esc(opt.name || '')}</span></a>
      <div class="bph-proj" role="button" tabindex="0" title="Projekt wählen"><small></small><span></span></div><span class="bph-fill"></span>
      <div class="bph-ki" role="group" aria-label="KI-Auswahl"></div>
      <button type="button" class="bph-kim" aria-haspopup="menu" aria-label="KI wählen"></button>
      <button type="button" class="bph-ic bph-appsb" aria-haspopup="menu" aria-label="Apps" title="Apps">${IC.grid}</button>
      <button type="button" class="bph-ic bph-gear" aria-haspopup="dialog" aria-label="Einstellungen" title="Einstellungen">${IC.gear}</button>
      <button type="button" class="bph-who" aria-haspopup="menu" aria-label="Mein Konto"><span class="bph-av">?</span><span class="bph-nm"></span></button>`;
    const parent = opt.parent || document.body;
    parent.insertBefore(band, opt.before || parent.firstChild);
    renderKi();
    band.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.bph-proj')) { e.preventDefault(); if (typeof opt.projektwahl === 'function') opt.projektwahl(); else H.projektWahl(); } });
    band.addEventListener('click', (e) => {
      if (e.target.closest('.bph-proj')) { closeMenus(); if (typeof opt.projektwahl === 'function') opt.projektwahl(); else H.projektWahl(); return; }
      const k = e.target.closest('[data-ki]');
      if (k) { e.preventDefault(); closeMenus(); setKi(k.dataset.ki); return; }
      if (e.target.closest('[data-out]')) { logout(); return; }
      if (e.target.closest('[data-look]')) { e.stopPropagation(); lookMenu(); return; }
      if (e.target.closest('[data-konto]')) { e.stopPropagation(); closeMenus(); H.einstellungen({ bereich: 'ich', teil: 'konto' }); return; }
      if (e.target.closest('.bph-appsb')) { e.stopPropagation(); if (band.querySelector('.bph-apps')) closeMenus(); else appsMenu(); return; }
      if (e.target.closest('.bph-gear')) { e.stopPropagation(); closeMenus(); H.einstellungen(); return; }
      if (e.target.closest('.bph-kim')) { e.stopPropagation(); if (band.querySelector('.bph-menu')) closeMenus(); else kiMenu(); return; }
      if (e.target.closest('.bph-who')) { e.stopPropagation(); if (band.querySelector('.bph-menu')) closeMenus(); else userMenu(); }
    });
    document.addEventListener('click', (e) => { if (band && !band.contains(e.target)) closeMenus(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
    if (opt.project) H.setProject(opt.project);
    H.ready = (async () => {
      const [conf, me, ki, pj] = await Promise.all([getJ('api/platform').catch(() => ({ apps: [] })), opt.me ? Promise.resolve(opt.me) : getJ('api/me').catch(() => null), getJ('api/bp/ki').catch(() => null), getJ('api/bp/projekt').catch(() => null)]);
      H.conf = conf; H.me = me && me.ok !== false ? me : null;
      H.projekt = pj && pj.id ? pj : null; kopfProjekt();
      if (ki) { H.ki = ki.choice || 'intern'; H.providers = ki.providers || []; }
      const portal = (conf.apps || []).find((a) => a.key === 'portal');
      if (portal) band.querySelector('.bph-brand').href = appUrl(portal) + '/';
      if (H.me) {
        const acc = /^#[0-9a-f]{6}$/i.test(H.me.accent || '') ? H.me.accent : '#ff5fb3';
        const n = parseInt(acc.slice(1), 16), lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
        band.style.setProperty('--bph-acc', lum < 0.3 ? '#e8a57e' : acc);   // sehr dunkle Farben wären auf der dunklen Leiste unsichtbar
        band.style.setProperty('--bph-on', lum > 0.55 ? '#111' : '#fff');
        band.querySelector('.bph-av').textContent = (H.me.vorname || H.me.name || '?').slice(0, 1).toUpperCase();
        band.querySelector('.bph-nm').textContent = H.me.full || H.me.name || '';
      }
      eigeneFarben();
      renderKi();
      return H;
    })();
    H.ready.then(skWache).catch(() => {});
    return H.ready;
  };

  /* ---------- Projektnamen vorschlagen: Projekte im Bautagebuch und Ordner auf dem Server ----------
     Jedes Eingabefeld mit data-bp-projekt bekommt beim Tippen eine Vorschlagsliste. Wird ein Bautagebuch-Projekt
     gewählt, steht dessen Nummer danach in input.dataset.btId (z. B. zum Verknüpfen). */
  let sugBox = null, sugFor = null, sugT = 0, sugItems = [], sugIdx = -1;
  function sugClose() { if (sugBox) sugBox.remove(); sugBox = null; sugFor = null; sugItems = []; sugIdx = -1; }
  function sugPlace() {
    if (!sugBox || !sugFor) return;
    const r = sugFor.getBoundingClientRect();
    Object.assign(sugBox.style, { left: r.left + 'px', top: r.bottom + 2 + 'px', width: Math.max(r.width, 300) + 'px' });
  }
  function sugRender() {
    if (!sugFor) return;
    if (!sugItems.length) { if (sugBox) sugBox.remove(); sugBox = null; return; }
    if (!sugBox) { sugBox = document.createElement('div'); sugBox.className = 'bph-sug'; sugBox.setAttribute('role', 'listbox'); document.body.appendChild(sugBox); }
    let last = '';
    sugBox.innerHTML = sugItems.map((x, i) => {
      const grp = x.kind !== last ? `<div class="bph-sug-g">${x.kind === 'bt' ? 'Projekte im Bautagebuch' : 'Ordner auf dem Server'}</div>` : ''; last = x.kind;
      return grp + `<button type="button" role="option" class="bph-sug-o${i === sugIdx ? ' on' : ''}" data-i="${i}" aria-selected="${i === sugIdx}"><b>${esc(x.name)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</button>`;
    }).join('');
    sugPlace();
  }
  function sugPick(i) {
    const x = sugItems[i]; if (!x || !sugFor) return;
    const inp = sugFor;
    inp.value = x.name;
    if (x.kind === 'bt') inp.dataset.btId = x.id; else delete inp.dataset.btId;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    sugClose(); inp.focus();
  }
  async function sugLoad(inp) {
    const q = inp.value.trim();
    if (q.length < 2) { sugItems = []; sugRender(); return; }
    let d = null;
    try { d = await getJ('api/bp/projektnamen?q=' + encodeURIComponent(q)); } catch { return; }
    if (sugFor !== inp || inp.value.trim() !== q) return;
    const seen = new Set();
    sugItems = [...(d.projects || []).map((p) => ({ kind: 'bt', id: p.id, name: p.name, sub: [p.address, p.archived ? 'archiviert' : ''].filter(Boolean).join(' · ') })),
      ...(d.folders || []).map((f) => ({ kind: 'dir', name: f, sub: '' }))].filter((x) => { const k = x.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
    sugIdx = -1; sugRender();
  }
  document.addEventListener('input', (e) => {
    const inp = e.target; if (!inp.matches || !inp.matches('input[data-bp-projekt]')) return;
    delete inp.dataset.btId; sugFor = inp; clearTimeout(sugT); sugT = setTimeout(() => sugLoad(inp), 220);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!sugBox || e.target !== sugFor) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length) % sugItems.length; sugRender(); }
    else if (e.key === 'Enter' && sugIdx >= 0) { e.preventDefault(); e.stopPropagation(); sugPick(sugIdx); }
    else if (e.key === 'Escape') { e.stopPropagation(); sugClose(); }
  }, true);
  document.addEventListener('mousedown', (e) => {
    if (!sugBox) return;
    const o = e.target.closest && e.target.closest('.bph-sug-o');
    if (o) { e.preventDefault(); sugPick(+o.dataset.i); return; }
    if (!sugBox.contains(e.target) && e.target !== sugFor) sugClose();
  }, true);
  window.addEventListener('resize', sugPlace); document.addEventListener('scroll', sugPlace, true);
  H.projektFeld = (inp) => { if (inp) { inp.setAttribute('data-bp-projekt', ''); inp.setAttribute('autocomplete', 'off'); } };

/* ---------- Mein Konto: Unterschrift, Versand von Rügen, Kalendertermine; für Administratoren die E-Mail-Vorlagen ----------
     H.konto()                       Fenster (Benutzermenü jeder App)
     H.konto({ into: el, tab })      in eine Seite einbetten (Verwaltung → Einstellungen, Einstellungen einer App) */
  const KX = (u, o = {}) => fetch(u, { credentials: 'same-origin', ...o }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || ([502, 503, 504].includes(r.status) ? 'Der Server ist gerade nicht erreichbar – vermutlich wird gerade ein Update eingespielt. Bitte in einer Minute noch einmal versuchen.' : 'Fehler ' + r.status)); return j; });
  H.konto = async function (opt = {}) {
    let K, V = null, tab = opt.tab || 'konto', root, busy = false, sigV = Date.now(), msg = '';
    try { K = await KX('api/bp/konto'); } catch (e) { alert(e.message); return; }
    if (opt.into) root = opt.into;
    else {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = '<div class="bph-dlg" role="dialog" aria-label="Unterschrift, E-Mail und Kalender"></div>';
      document.body.appendChild(bg); root = bg.firstChild;
      const close = () => { bg.remove(); document.removeEventListener('keydown', esc1); };
      const esc1 = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', esc1);
      bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
      root.close = close;
    }
    const seg = (k, opts) => `<div class="bph-seg">${opts.map(([v, l]) => `<button type="button" data-kset="${k}" data-v="${v}" class="${String(K[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    function html() {
      const tabs = K.admin && !opt.nurKonto && !opt.nurVorlagen ? `<div class="bph-tabs"><button type="button" data-ktab="konto" class="${tab === 'konto' ? 'on' : ''}">Mein Konto</button><button type="button" data-ktab="vorlagen" class="${tab === 'vorlagen' ? 'on' : ''}">E-Mail-Vorlagen</button></div>` : '';
      let b = '';
      if (tab === 'konto') {
        b = `<h4>Unterschrift</h4><p class="bph-mu">Für Mängel- und Terminrügen. Einfach mit dunklem Stift auf weißes Papier unterschreiben und mit dem Handy fotografieren – die App stellt die Unterschrift frei und schneidet sie zu.</p>
          <div class="bph-sig">${K.signatur ? `<img src="api/bp/signatur?v=${sigV}" alt="Unterschrift">` : '<span class="bph-mu">Noch keine Unterschrift hinterlegt.</span>'}</div>
          <div class="bph-row"><label class="bph-btn pri">${busy ? 'wird aufbereitet …' : K.signatur ? 'Neues Foto' : 'Foto aufnehmen oder wählen'}<input type="file" accept="image/*" data-ksig hidden></label>${K.signatur ? '<button type="button" class="bph-btn" data-kdel>Entfernen</button>' : ''}</div>
          <h4>E-Mail-Signatur</h4><p class="bph-mu">Steht unter allen Mails, die du aus der Plattform verschickst (Rügen, Planversand). Signatur aus Outlook, Word oder einer Webseite mit Formatierung, Logo und Links hineinkopieren oder mit den Platzhaltern zusammenklicken.</p>
          <div class="bph-row"><label style="flex:1">Funktion<input data-kf="funktion" value="${esc(K.funktion || '')}" placeholder="z. B. Bauleitung" maxlength="80"></label><label style="flex:1">Telefon (eigenes)<input data-kf="telefon" value="${esc(K.telefon || '')}" placeholder="sonst das des Büros" maxlength="60"></label></div>
          <div class="bph-sigt bph-sige" contenteditable="true" data-ksigt>${K.mailsignatur_html || esc(K.mailsignatur || K.sig_standard).replace(/\n/g, '<br>')}</div>
          <div class="bph-chips">${Object.entries(K.sig_platz || {}).map(([k, l]) => `<button type="button" data-kph="${k}" title="${esc(l)}">{${k}}</button>`).join('')}</div>
          <div class="bph-row"><button type="button" class="bph-btn pri" data-ksigsave>Signatur speichern</button><button type="button" class="bph-btn" data-ksigstd>Auf Standard zurücksetzen</button></div>
          <div class="bph-mu">So sieht sie in der Mail aus${K.mailsignatur_html ? ' (Mailprogramme ohne HTML zeigen sie als Text)' : ''}:</div><div class="bph-sigp bph-sigh">${K.sig_vorschau_html || esc(K.sig_vorschau || '').replace(/\n/g, '<br>')}</div>
          <h4>Absender meiner Mails</h4><p class="bph-mu">Rügen und Planversand gehen standardmäßig vom Büro-Postfach aus. Antworten kommen in jedem Fall auch an dich (Antwort an: deine Adresse).</p>
          ${seg('absender', [['buero', 'Büro' + (K.absender_buero ? ' (' + esc(K.absender_buero) + ')' : '')], ['eigen', 'meine Adresse' + (K.email ? ' (' + esc(K.email) + ')' : '')]])}
          ${K.absender === 'eigen' ? '<p class="bph-mu">Der Mailserver muss das Senden in deinem Namen erlauben (Microsoft 365: „Senden als“ für das Büro-Postfach). Sonst erscheint beim Versand ein Hinweis.</p>' : ''}
          <h4>Mängel- und Terminrügen versenden</h4><p class="bph-mu">Vorauswahl im Dialog der Rüge – dort lässt sie sich jedes Mal ändern.</p>
          ${seg('versand', [['pdf', 'nur PDF'], ['mich', 'per E-Mail an mich'], ['firma', 'direkt an die Firma']])}
          <label class="bph-ck"><input type="checkbox" data-kchk="kopie"${K.kopie ? ' checked' : ''}> bei „direkt an die Firma“ eine Kopie an mich</label>
          <h4>Kalender</h4><label class="bph-ck"><input type="checkbox" data-kchk="kalender"${K.kalender ? ' checked' : ''}> eigene und verschobene Erinnerungen automatisch als Termin an mich senden (Outlook & Co.: annehmen trägt ihn in den Kalender ein)</label>
          <p class="bph-mu">Einzelne Erinnerungen, Fristen und Termine lassen sich außerdem jederzeit mit 📅 als Termin schicken.</p>
          <h4>Posteingang</h4><p class="bph-mu">Die Startseite zeigt die Mails zu deinen Projekten – Rechnungen, Nachträge, Termine – mit Vorschlägen für Erinnerungen. Postfächer und Abrufzeit stellst du auf der Startseite unter ⚙ → Startseite → Posteingang ein.</p>
          <div class="bph-row"><button type="button" class="bph-btn" data-kpost>📬 Postfächer einrichten …</button></div>
          <h4>Kennwort</h4><div class="bph-row"><button type="button" class="bph-btn" data-kpw>🔑 Kennwort ändern …</button></div>
          <div class="bph-row">${H.verlaufKnopf('konto:' + K.uid, 'Verlauf meiner Einstellungen')}</div>
          <p class="bph-mu">${K.email ? `Mails gehen an <b>${esc(K.email)}</b>.` : '<b>Für dein Konto ist keine E-Mail-Adresse hinterlegt</b> – bitte vom Administrator in der Verwaltung (▦ → Verwaltung → Benutzer) eintragen lassen.'}${K.mail ? '' : ' Der Mailserver ist noch nicht eingerichtet (⚙ → Büro → Mailserver).'}</p>`;
      } else if (!V) { b = '<p class="bph-mu">Lade …</p>'; KX('api/bp/mailvorlagen').then((v) => { V = v; draw(); }).catch((e) => { msg = e.message; draw(); }); }
      else {
        b = `<p class="bph-mu">Texte der E-Mails, die die Plattform verschickt. Platzhalter in geschweiften Klammern werden beim Versand ersetzt. Leer lassen = Standardtext.</p>`
          + Object.entries(V.vorlagen).map(([k, t]) => `<div class="bph-tpl"><h4>${esc(t.name)}${t.standard ? ' <small class="bph-mu">Standard</small>' : ''}</h4>
            <label>Betreff<input data-tk="${k}" data-tf="betreff" value="${esc(t.betreff)}"${V.admin ? '' : ' disabled'}></label>
            <label>Text<textarea rows="6" data-tk="${k}" data-tf="text"${V.admin ? '' : ' disabled'}>${esc(t.text)}</textarea></label>
            <p class="bph-mu">${t.platzhalter.map((p) => `<code title="${esc(V.erkl[p] || '')}">{${p}}</code> ${esc(V.erkl[p] || '')}`).join(' · ')}</p></div>`).join('')
          + (V.admin ? `<div class="bph-row"><button type="button" class="bph-btn pri" data-ksave>Vorlagen speichern</button>${H.verlaufKnopf('einst:vorlagen')}</div>` : '');
      }
      return (opt.into ? '' : `<div class="bph-dh"><b>Unterschrift, E-Mail & Kalender</b><button type="button" class="bph-x" data-kclose aria-label="Schließen">×</button></div>`)
        + tabs + `<div class="bph-db">${b}${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}</div>`;
    }
    function draw() { root.innerHTML = html(); }
    async function save(d) { try { K = { ...K, ...(await KX('api/bp/konto', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })) }; msg = 'Gespeichert.'; } catch (e) { msg = e.message; } draw(); }
    root.addEventListener('mousedown', (e) => { if (e.target.closest('[data-kph]')) e.preventDefault(); });
    root.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-kclose]')) { root.close && root.close(); return; }
      if (t.closest('[data-kpost]')) { H.postfaecher(); return; }
      if (t.closest('[data-kpw]')) { H.kennwort(); return; }
      const tb = t.closest('[data-ktab]'); if (tb) { tab = tb.dataset.ktab; msg = ''; draw(); return; }
      const sv = t.closest('[data-kset]'); if (sv) { save({ [sv.dataset.kset]: sv.dataset.v }); return; }
      if (t.closest('[data-kdel]')) { if (!confirm('Unterschrift entfernen?')) return; await KX('api/bp/signatur', { method: 'DELETE' }).catch((er) => { msg = er.message; }); K.signatur = false; draw(); return; }
      const ph = t.closest('[data-kph]');
      if (ph) {
        const ed = root.querySelector('[data-ksigt]'), s = window.getSelection(), ins = '{' + ph.dataset.kph + '}';
        if (!s.rangeCount || !ed.contains(s.anchorNode)) { ed.focus(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
        if (!document.execCommand('insertText', false, ins)) { const r = s.getRangeAt(0); r.deleteContents(); r.insertNode(document.createTextNode(ins)); r.collapse(false); }
        return;
      }
      if (t.closest('[data-ksigsave]') || t.closest('[data-ksigstd]')) {
        const std = !!t.closest('[data-ksigstd]'), ed = root.querySelector('[data-ksigt]');
        // nur Text (Zeilen): als Text-Signatur speichern – leere Platzhalterzeilen fallen dann weg; sonst als HTML
        const rich = [...ed.querySelectorAll('*')].some((x) => !/^(BR|DIV|P|SPAN)$/.test(x.tagName) || x.attributes.length);
        const txt = ed.innerText.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        const d = std ? { mailsignatur: '', mailsignatur_html: '' }
          : rich ? { mailsignatur: '', mailsignatur_html: ed.innerHTML }
          : { mailsignatur: txt === K.sig_standard ? '' : txt, mailsignatur_html: '' };
        root.querySelectorAll('[data-kf]').forEach((x) => { d[x.dataset.kf] = x.value.trim(); });
        await save(d); msg = std ? 'Signatur auf Standard zurückgesetzt.' : 'Signatur gespeichert.'; draw(); return;
      }
      if (t.closest('[data-ksave]')) {
        const d = {}; root.querySelectorAll('[data-tk]').forEach((x) => { (d[x.dataset.tk] ||= {})[x.dataset.tf] = x.value; });
        try { V = await KX('api/bp/mailvorlagen', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); msg = 'Vorlagen gespeichert.'; } catch (er) { msg = er.message; }
        draw();
      }
    });
    root.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.dataset.kchk) { save({ [t.dataset.kchk]: t.checked }); return; }
      if (t.dataset.ksig !== undefined && t.files && t.files[0]) {
        busy = true; msg = ''; draw();
        const fd = new FormData(); fd.append('file', t.files[0]);
        try { await KX('api/bp/signatur', { method: 'POST', body: fd }); K.signatur = true; sigV = Date.now(); msg = 'Unterschrift gespeichert.'; } catch (er) { msg = er.message; }
        busy = false; draw();
      }
    });
    draw();
  };

  /* ---------- Verlauf: automatisch gespeicherte Stände aller Einstellungen und Stammdaten ----------
     H.verlauf({ bereich, titel?, nach? })   Fenster mit allen Ständen eines Bereichs (nach = nach dem Wiederherstellen; sonst Seite neu laden)
     H.verlaufAlle({ into })                 Änderungsverlauf aller Bereiche mit Filter und (für Administratoren) Aufbewahrung */
  const JS = (u, m, d) => KX(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d || {}) });
  const fmtT = (s) => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
  const fmtB = (n) => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const ART = { benannt: 'benannt', wiederhergestellt: 'wiederhergestellt', ausgang: 'Ausgangsstand' };
  function vItem(v, i, opt) {
    const a = v.aenderungen || [], more = a.length > 4;
    return `<li class="bph-v" data-vid="${v.id}"><div class="bph-vh"><b>${fmtT(v.wann)}</b>${v.wer ? ` · ${esc(v.wer)}` : ''}
      ${opt.titel ? `<span class="bph-mu"> · ${esc(v.titel)}</span>` : ''}${v.name ? ` <span class="bph-badge on">${esc(v.name)}</span>` : (ART[v.art] ? ` <span class="bph-badge">${ART[v.art]}</span>` : '')}
      ${i === 0 && !opt.titel ? ' <span class="bph-badge cur">jetziger Stand</span>' : ''}</div>
      <ul class="bph-va">${a.slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join('')}${more ? `<li class="bph-vmore" hidden>${a.slice(4).map(esc).join('</li><li>')}</li><li><button type="button" class="bph-link" data-vmore>… ${a.length - 4} weitere</button></li>` : ''}</ul>
      <div class="bph-vcmp" hidden></div>
      <div class="bph-row">${opt.titel ? `<button type="button" class="bph-btn" data-vopen="${esc(v.bereich)}">Verlauf öffnen</button>` : ''}
        ${i > 0 || opt.titel ? `<button type="button" class="bph-btn" data-vcmp>Vergleichen</button><button type="button" class="bph-btn" data-vback>Wiederherstellen</button>` : ''}
        <button type="button" class="bph-btn" data-vname="${esc(v.name || '')}">${v.name ? 'Umbenennen' : 'Benennen'}</button></div></li>`;
  }
  async function vClick(e, root, reload, opt) {
    const t = e.target, li = t.closest('[data-vid]'), id = li && li.dataset.vid;
    if (t.closest('[data-vmore]')) { li.querySelectorAll('.bph-vmore').forEach((x) => { x.hidden = false; }); t.closest('li').remove(); return true; }
    if (t.closest('[data-vopen]')) { H.verlauf({ bereich: t.closest('[data-vopen]').dataset.vopen, nach: () => { if (opt && opt.nach) opt.nach(); reload(); } }); return true; }
    if (t.closest('[data-vcmp]')) {
      const box = li.querySelector('.bph-vcmp');
      if (!box.hidden) { box.hidden = true; return true; }
      try { const r = await KX(`api/bp/versionen/${id}/vergleich`); box.innerHTML = `<b>Beim Wiederherstellen ändert sich gegenüber jetzt:</b><ul>${r.aenderungen.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; box.hidden = false; } catch (er) { alert(er.message); }
      return true;
    }
    if (t.closest('[data-vback]')) {
      if (!confirm('Diesen Stand wiederherstellen? Der jetzige Stand bleibt im Verlauf erhalten und kann ebenso zurückgeholt werden.')) return true;
      try { await JS(`api/bp/versionen/${id}/wiederherstellen`, 'POST'); } catch (er) { alert(er.message); return true; }
      if (opt && opt.nach) { opt.nach(); await reload(); } else location.reload();
      return true;
    }
    const nb = t.closest('[data-vname]');
    if (nb) {
      const n = prompt('Name für diesen Stand (z. B. „vor der Umstellung“) – benannte Stände werden nie automatisch aufgeräumt. Leer = Name entfernen.', nb.dataset.vname);
      if (n === null) return true;
      try { await JS(`api/bp/versionen/${id}`, 'PATCH', { name: n }); } catch (er) { alert(er.message); }
      await reload(); return true;
    }
    return false;
  }
  H.verlauf = async function (opt = {}) {
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = '<div class="bph-dlg" role="dialog" aria-label="Verlauf"></div>';
    document.body.appendChild(bg); const root = bg.firstChild;
    const close = () => { bg.remove(); document.removeEventListener('keydown', esc1); };
    const esc1 = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc1);
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    let D = null, msg = '';
    const draw = () => {
      root.innerHTML = `<div class="bph-dh"><b>Verlauf${D ? ' – ' + esc(D.titel) : ''}</b><button type="button" class="bph-x" data-kclose aria-label="Schließen">×</button></div><div class="bph-db">
        <p class="bph-mu">Jede Speicherung wird automatisch als Stand festgehalten – Änderungen innerhalb von 10 Minuten zusammengefasst. Ein früherer Stand lässt sich jederzeit wiederherstellen; der jetzige bleibt dabei erhalten. Kennwörter und Schlüssel bleiben beim Wiederherstellen unverändert.</p>
        <div class="bph-row"><input data-vnew placeholder="Name für den jetzigen Stand, z. B. „vor Umstellung“" maxlength="120" style="flex:1"><button type="button" class="bph-btn pri" data-vsave>Stand benennen</button></div>
        ${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}
        ${!D ? '<p class="bph-mu">Lade …</p>' : D.versionen.length ? `<ul class="bph-vl">${D.versionen.map((v, i) => vItem(v, i, {})).join('')}</ul>` : '<p class="bph-mu">Noch keine Stände.</p>'}</div>`;
    };
    const load = async () => { try { D = await KX('api/bp/versionen?bereich=' + encodeURIComponent(opt.bereich)); } catch (e) { msg = e.message; } draw(); };
    root.addEventListener('click', async (e) => {
      if (e.target.closest('[data-kclose]')) { close(); return; }
      if (e.target.closest('[data-vsave]')) {
        const n = root.querySelector('[data-vnew]').value.trim(); if (!n) { root.querySelector('[data-vnew]').focus(); return; }
        try { D = await JS('api/bp/versionen', 'POST', { bereich: opt.bereich, name: n }); msg = 'Stand „' + n + '“ festgehalten.'; } catch (er) { msg = er.message; }
        draw(); return;
      }
      await vClick(e, root, load, opt);
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-vnew]')) root.querySelector('[data-vsave]').click(); });
    draw(); load();
  };
  /* Knopf „Verlauf“ für eine beliebige Stelle: H.verlaufKnopf('einst:bt', { nach }) → HTML; Klick öffnet den Verlauf */
  /* Eigenes Kennwort ändern (die Benutzerverwaltung liegt nur in der Verwaltung) */
  H.kennwort = function () {
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Kennwort ändern" style="max-width:26rem"><div class="bph-dh"><b>Kennwort ändern</b><button type="button" class="bph-x" data-kc aria-label="Schließen">×</button></div><div class="bph-db">
      <p class="bph-mu">Gilt für alle Apps der Bauplattform. Mindestens 8 Zeichen.</p>
      <label style="display:block;margin:.4rem 0">Bisheriges Kennwort<input type="password" data-ka autocomplete="current-password"></label>
      <label style="display:block;margin:.4rem 0">Neues Kennwort<input type="password" data-kn autocomplete="new-password"></label>
      <label style="display:block;margin:.4rem 0">Neues Kennwort wiederholen<input type="password" data-kw autocomplete="new-password"></label>
      <p class="bph-mu" data-km></p>
      <div class="bph-row"><button type="button" class="bph-btn" data-kc>Abbrechen</button><button type="button" class="bph-btn pri" data-ks>Kennwort ändern</button></div></div></div>`;
    document.body.appendChild(bg);
    const q = (a) => bg.querySelector(a), close = () => bg.remove(), m = q('[data-km]');
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); if (e.key === 'Enter') q('[data-ks]').click(); });
    bg.addEventListener('click', async (e) => {
      if (e.target.closest('[data-kc]')) return close();
      if (!e.target.closest('[data-ks]')) return;
      const a = q('[data-ka]').value, n = q('[data-kn]').value;
      if (n !== q('[data-kw]').value) { m.textContent = 'Die beiden neuen Kennwörter stimmen nicht überein.'; return; }
      try { await KX('api/bp/kennwort', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alt: a, neu: n }) }); close(); if (window.toast) toast('Kennwort geändert.'); else alert('Kennwort geändert.'); }
      catch (err) { m.textContent = err.message; }
    });
    q('[data-ka]').focus();
  };
  /* Meine Postfächer: Microsoft 365 (zentral eingerichtet) an/aus und eigene IMAP-Konten */
  /* opt.into: in ein Element zeichnen (Einstellungen → Startseite → Posteingang) statt als Fenster; opt.nachSpeichern(D) */
  H.postfaecher = async function (opt = {}) {
    let D, msg = '';
    if (opt.into) opt.into.innerHTML = '<p class="bph-mu">Lade …</p>';
    try { D = await KX('api/bp/postfaecher'); } catch (e) { if (opt.into) opt.into.textContent = e.message; else alert(e.message); return; }
    let root, close;
    if (opt.into) { root = opt.into; close = () => {}; } else {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = '<div class="bph-dlg" role="dialog" aria-label="Meine Postfächer"></div>'; document.body.appendChild(bg);
      const e1 = (e) => { if (e.key === 'Escape') close(); };
      root = bg.firstChild; close = () => { bg.remove(); document.removeEventListener('keydown', e1); };
      document.addEventListener('keydown', e1); bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    }
    const AB = D.abruf || { rhythmus: 'tag', uhrzeit: '08:00' }, EG = D.eigene || { aus: true, postfaecher: [] }, AZ = D.anzeige || { tage: 1, wochenende: true };
    const abrufText = () => ({ tag: `einmal am Tag um ${AB.uhrzeit} Uhr`, zweimal: `zweimal am Tag, um ${AB.uhrzeit} und 5 Stunden später`, stuendlich: 'stündlich von 7 bis 19 Uhr', hand: 'nur, wenn du ↻ Jetzt abrufen drückst' })[AB.rhythmus];
    const VORL = { gmail: ['imap.gmail.com', 993], webde: ['imap.web.de', 993], gmx: ['imap.gmx.net', 993], ionos: ['imap.ionos.de', 993], strato: ['imap.strato.de', 993], tonline: ['secureimap.t-online.de', 993], outlook: ['outlook.office365.com', 993] };
    const feld = (k, i, l, typ = 'text', ph = '') => `<label style="flex:1;min-width:9rem">${l}<input data-pf="${k}" data-pi="${i}" type="${typ}" value="${typ === 'password' ? '' : esc((D.konten[i] || {})[k] ?? '')}" placeholder="${esc(ph)}" autocomplete="${typ === 'password' ? 'new-password' : 'off'}"></label>`;
    function draw() {
      root.innerHTML = `${opt.into ? '' : '<div class="bph-dh"><b>Meine Postfächer</b><button type="button" class="bph-x" data-pc aria-label="Schließen">×</button></div>'}<div class="bph-db"${opt.into ? ' style="padding:0"' : ''}>
        <p class="bph-mu">Aus diesen Postfächern stellt die Startseite die Mails zu <b>deinen</b> Projekten zusammen – ${abrufText()} (und jederzeit mit ↻). Gelesen wird nur – nichts wird verschoben, gelöscht oder als gelesen markiert. Nur du siehst die Übersicht.</p>
        <h4>Abruf</h4>
        <div class="bph-row" style="align-items:flex-end"><label style="flex:1;min-width:12rem">Wie oft<select data-pab="rhythmus" style="width:100%;font:inherit;padding:.35rem .5rem;border-radius:8px;border:1px solid var(--line,#3b3e42);background:var(--inp,transparent);color:inherit">${[['tag', 'einmal am Tag'], ['zweimal', 'zweimal am Tag'], ['stuendlich', 'stündlich (7–19 Uhr)'], ['hand', 'nur von Hand (↻)']].map(([k, l]) => `<option value="${k}"${AB.rhythmus === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
          ${AB.rhythmus === 'tag' || AB.rhythmus === 'zweimal' ? `<label style="width:8rem">${AB.rhythmus === 'zweimal' ? 'ab' : 'um'}<input type="time" data-pab="uhrzeit" value="${esc(AB.uhrzeit)}"></label>` : ''}</div>
        <h4>Anzeige</h4>
        <div class="bph-row" style="align-items:center"><label style="display:flex;align-items:center;gap:.5rem">Mails stehen<select data-paz="tage" style="font:inherit;padding:.3rem .5rem;border-radius:8px;border:1px solid var(--line,#3b3e42);background:var(--inp,transparent);color:inherit">${[1, 2, 3, 5, 7, 14].map((t) => `<option value="${t}"${AZ.tage === t ? ' selected' : ''}>${t} Tag${t > 1 ? 'e' : ''}</option>`).join('')}</select>in der Übersicht</label></div>
        <label class="bph-ck"><input type="checkbox" data-pazw${AZ.wochenende ? ' checked' : ''}> Wochenende nicht mitzählen – die Mails vom Freitag stehen am Montag noch da</label>
        <p class="bph-mu">Mails, zu denen du eine Erinnerung angelegt hast, bleiben stehen, bis die Erinnerung erledigt ist.</p>
        <h4>Eigene Mails</h4>
        <label class="bph-ck"><input type="checkbox" data-peg${EG.aus ? ' checked' : ''}> Mails ausblenden, die ich selbst geschickt habe – z. B. in Kopie an ${esc((D.zugewiesen || [])[0] || 'mail@…')}</label>
        <div class="bph-row"${EG.aus ? '' : ' hidden'}><label style="flex:1">nur in diesen Postfächern <span class="bph-mu">(leer = in allen; mehrere mit Komma)</span><input data-pegp value="${esc(EG.postfaecher.join(', '))}" placeholder="alle Postfächer – z. B. ${esc((D.zugewiesen || [])[0] || 'mail@gk3-architektur.de')} eintragen" list="bph-pegl" autocomplete="off"></label><datalist id="bph-pegl">${(D.zugewiesen || []).concat(D.email ? [D.email] : []).map((a) => `<option value="${esc(a)}">`).join('')}</datalist></div>
        <h4>Büro-Postfach (Microsoft 365)</h4>
        ${D.m365_zentral ? `<label class="bph-ck"><input type="checkbox" data-pm${D.m365 ? ' checked' : ''}> mein Postfach <b>${esc(D.email || '–')}</b> einbeziehen</label>${(D.zugewiesen || []).length ? `<p class="bph-mu">Dazu vom Administrator zugewiesen: <b>${D.zugewiesen.map(esc).join(', ')}</b></p>` : ''}<div class="bph-row"><button type="button" class="bph-btn" data-ptm>Probeweise lesen</button></div>`
          : '<p class="bph-mu">Noch nicht eingerichtet – das macht der Administrator einmal unter ⚙ → Büro → Mailserver.</p>'}
        <h4>Weitere eigene Postfächer (IMAP)</h4>
        ${D.konten.map((k, i) => `<div class="bph-tpl"><div class="bph-row"><label class="bph-ck" style="flex:1"><input type="checkbox" data-pf="an" data-pi="${i}"${k.an !== false ? ' checked' : ''}> <b>${esc(k.name || k.user)}</b></label><button type="button" class="bph-btn" data-pt="${i}">Testen</button><button type="button" class="bph-btn" data-pd="${i}">Entfernen</button></div>
          <div class="bph-row">${feld('name', i, 'Bezeichnung', 'text', 'z. B. Projektpostfach')}${feld('user', i, 'Benutzername / Adresse')}</div>
          <div class="bph-row">${feld('host', i, 'IMAP-Server', 'text', 'imap.example.de')}<label style="width:6rem">Port<input data-pf="port" data-pi="${i}" value="${esc(k.port || 993)}" inputmode="numeric"></label>${feld('ordner', i, 'Ordner', 'text', 'INBOX')}</div>
          <div class="bph-row">${feld('pass', i, k.pass_set ? 'Kennwort (gespeichert – zum Ändern neu eingeben)' : 'Kennwort / App-Passwort', 'password', k.pass_set ? '••••••••' : '')}</div></div>`).join('') || '<p class="bph-mu">Keine weiteren Postfächer.</p>'}
        <div class="bph-row"><select data-pv><option value="">+ Postfach hinzufügen …</option><option value="gmail">Gmail</option><option value="outlook">Outlook.com / Microsoft (IMAP)</option><option value="webde">WEB.DE</option><option value="gmx">GMX</option><option value="tonline">T-Online</option><option value="ionos">IONOS (1&1)</option><option value="strato">Strato</option><option value="eigen">anderer Anbieter</option></select></div>
        <p class="bph-mu">Gmail, GMX, WEB.DE & Co. verlangen meist ein <b>App-Passwort</b> und eingeschaltetes IMAP in den Einstellungen des Postfachs.</p>
        <div class="bph-row"><button type="button" class="bph-btn pri" data-ps>Speichern</button></div>${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}</div>`;
    }
    const lesen = () => { const az = root.querySelector('[data-paz="tage"]'); if (az) AZ.tage = +az.value; const azw = root.querySelector('[data-pazw]'); if (azw) AZ.wochenende = azw.checked; const eg = root.querySelector('[data-peg]'); if (eg) EG.aus = eg.checked; const egp = root.querySelector('[data-pegp]'); if (egp) EG.postfaecher = egp.value.split(/[\s,;]+/).filter((a) => a.includes('@')); root.querySelectorAll('[data-pab]').forEach((el) => { AB[el.dataset.pab] = el.value || AB[el.dataset.pab]; }); root.querySelectorAll('[data-pf]').forEach((el) => { const k = D.konten[+el.dataset.pi]; if (!k) return; const f = el.dataset.pf; k[f] = el.type === 'checkbox' ? el.checked : el.value; }); const m = root.querySelector('[data-pm]'); if (m) D.m365 = m.checked; };
    root.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-pc]')) return close();
      if (t.closest('[data-pd]')) { lesen(); D.konten.splice(+t.closest('[data-pd]').dataset.pd, 1); draw(); return; }
      if (t.closest('[data-ps]')) { lesen(); try { D = { ...D, ...(await JS('api/bp/postfaecher', 'PUT', { m365: D.m365, konten: D.konten, abruf: AB, eigene: EG, anzeige: AZ })) }; Object.assign(AB, D.abruf || {}); Object.assign(EG, D.eigene || {}); Object.assign(AZ, D.anzeige || {}); msg = 'Gespeichert.'; if (opt.nachSpeichern) opt.nachSpeichern(D); } catch (er) { msg = er.message; } draw(); return; }
      if (t.closest('[data-ptm]')) { msg = 'lese …'; draw(); try { const r = await JS('api/bp/postfaecher/test', 'POST', { m365: true }); msg = r.ok ? '✔ ' + r.text : '✖ ' + r.error; } catch (er) { msg = er.message; } draw(); return; }
      const pt = t.closest('[data-pt]'); if (pt) { lesen(); msg = 'verbinde …'; draw(); try { const r = await JS('api/bp/postfaecher/test', 'POST', { konto: D.konten[+pt.dataset.pt] }); msg = r.ok ? '✔ ' + r.text : '✖ ' + r.error; } catch (er) { msg = er.message; } draw(); }
    });
    root.addEventListener('change', (e) => { if (e.target.closest('[data-pab="rhythmus"],[data-peg]')) { lesen(); draw(); return; } const v = e.target.closest('[data-pv]'); if (!v || !v.value) return; lesen(); const x = VORL[v.value] || ['', 993]; D.konten.push({ name: v.options[v.selectedIndex].text.replace(/ \(.*/, ''), host: x[0], port: x[1], user: '', ordner: 'INBOX', an: true }); draw(); });
    draw();
  };
  H.verlaufKnopf = (bereich, label) => `<button type="button" class="bph-btn bph-vbtn" data-bph-verlauf="${esc(bereich)}" title="Frühere Stände ansehen und wiederherstellen">🕘 ${esc(label || 'Verlauf')}</button>`;
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-bph-verlauf]'); if (b) { e.preventDefault(); H.verlauf({ bereich: b.dataset.bphVerlauf, nach: H.nachVerlauf || window.bpNachVerlauf }); } });

  H.verlaufAlle = async function (opt = {}) {
    let root = opt.into, D = null, C = null, f = { teil: opt.teil || '', wer: '', q: '' }, msg = '';
    if (!root) {   // als Fenster (z. B. Adressen → Änderungsverlauf)
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Verlauf"><div class="bph-dh"><b>${esc(opt.titel || 'Verlauf')}</b><button type="button" class="bph-x" aria-label="Schließen">×</button></div><div class="bph-db"></div></div>`;
      document.body.appendChild(bg); root = bg.querySelector('.bph-db');
      const close = () => { bg.remove(); document.removeEventListener('keydown', esc1); };
      const esc1 = (e) => { if (e.key === 'Escape' && !document.querySelector('.bph-dlg-bg ~ .bph-dlg-bg')) close(); };
      document.addEventListener('keydown', esc1);
      bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
      bg.querySelector('.bph-x').onclick = close;
    }
    const draw = () => {
      const st = C && C.statistik;
      root.innerHTML = `<div class="bph-vall">
        <p class="bph-mu">Alle automatisch gespeicherten Stände von Einstellungen, Vorlagen, Raumtypen, Kostenermittlungen und Adressen. Bautagesberichte und Bauzeitenpläne haben ihren eigenen Verlauf in der jeweiligen App.</p>
        <div class="bph-row"><select data-vf="teil"><option value="">Alle Bereiche</option>${D ? Object.entries(D.teile).map(([k, l]) => `<option value="${k}"${f.teil === k ? ' selected' : ''}>${esc(l)}</option>`).join('') : ''}</select>
          <select data-vf="wer"><option value="">Alle Personen</option>${D ? D.wer.map((w) => `<option${f.wer === w ? ' selected' : ''}>${esc(w)}</option>`).join('') : ''}</select>
          <input data-vf="q" placeholder="Suchen …" value="${esc(f.q)}" style="flex:1;min-width:8rem"></div>
        ${!D ? '<p class="bph-mu">Lade …</p>' : D.versionen.length ? `<ul class="bph-vl">${D.versionen.map((v, i) => vItem(v, i, { titel: true })).join('')}</ul>` : '<p class="bph-mu">Keine Stände gefunden.</p>'}
        ${C ? `<h4>Aufbewahrung</h4><p class="bph-mu">Belegt: <b>${fmtB(st.bytes)}</b> in ${st.anzahl} Ständen (${st.bereiche} Bereiche)${st.seit ? ', seit ' + fmtT(st.seit).split(' ')[0] : ''} · letzte 30 Tage: ${st.monat_anzahl} Stände, ${fmtB(st.monat_bytes)}.
          Immer erhalten bleiben der jüngste Stand jedes Bereichs, benannte Stände und der Ausgangsstand.</p>
          <div class="bph-row"><label>alle Stände behalten <input type="number" min="1" max="3650" data-vc="alle_tage" value="${C.alle_tage}" style="width:5.5rem"> Tage</label>
          <label>danach einen je Tag bis <input type="number" min="0" max="3650" data-vc="taeglich_tage" value="${C.taeglich_tage}" style="width:5.5rem"> Tage <small class="bph-mu">(0 = nie löschen)</small></label>
          <button type="button" class="bph-btn pri" data-vcsave>Speichern</button>${H.verlaufKnopf('bp:versionen_conf')}</div>
          <p class="bph-mu">Vorschläge mit geschätztem Speicherbedarf (aus der Nutzung der letzten 30 Tage):</p>
          <div class="bph-row">${st.vorschlaege.map((v) => `<button type="button" class="bph-btn${v.alle_tage === C.alle_tage && v.taeglich_tage === C.taeglich_tage ? ' on' : ''}" data-vsug="${v.alle_tage},${v.taeglich_tage}">${esc(v.name)}: ${v.alle_tage} Tage alle, ${v.taeglich_tage ? `bis ${v.taeglich_tage} Tage täglich` : 'danach täglich unbegrenzt'} · ca. ${fmtB(v.bytes)}${v.hinweis ? ' ' + esc(v.hinweis) : ''}</button>`).join('')}</div>` : ''}
        ${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}</div>`;
    };
    const load = async () => {
      try { D = await KX('api/bp/versionen/alle?' + new URLSearchParams(f)); if (D.admin && !C) C = await KX('api/bp/versionen/conf'); } catch (e) { msg = e.message; }
      draw();
    };
    let tm = null;
    root.addEventListener('change', (e) => { const k = e.target.dataset.vf; if (k && k !== 'q') { f[k] = e.target.value; load(); } });
    root.addEventListener('input', (e) => { if (e.target.dataset.vf === 'q') { f.q = e.target.value; clearTimeout(tm); tm = setTimeout(async () => { await load(); const q = root.querySelector('[data-vf="q"]'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 350); } });
    root.addEventListener('click', async (e) => {
      const sg = e.target.closest('[data-vsug]');
      if (sg) { const [a, t] = sg.dataset.vsug.split(','); root.querySelector('[data-vc="alle_tage"]').value = a; root.querySelector('[data-vc="taeglich_tage"]').value = t; return; }
      if (e.target.closest('[data-vcsave]')) {
        const d = {}; root.querySelectorAll('[data-vc]').forEach((x) => { d[x.dataset.vc] = +x.value || 0; });
        if (d.taeglich_tage && d.taeglich_tage < d.alle_tage) { msg = '„bis … Tage“ muss mindestens so groß sein wie „alle Stände behalten“.'; draw(); return; }
        try { C = await JS('api/bp/versionen/conf', 'PUT', d); msg = 'Aufbewahrung gespeichert' + (C.entfernt ? `, ${C.entfernt} ältere Stände aufgeräumt.` : '.'); } catch (er) { msg = er.message; }
        draw(); return;
      }
      await vClick(e, root, load, { nach: () => { const f2 = H.nachVerlauf || window.bpNachVerlauf; if (f2 && !opt.into) f2(); } });
    });
    draw(); load();
  };

  /* ---------- ⚙ Einstellungen: ein Fenster für alle Apps (von rechts, nie ein neues Browserfenster) ----------
     Diese App  – was die App registriert: BPHead.appEinstellungen([{ key, label, text, render(host) | open() }])
     Für mich   – Mein Konto (Unterschrift, Signatur, Versand, Kalender), Darstellung
     Büro       – nur Administrator: Firma & Logo, Briefbogen, Ablage, Mailserver, E-Mail-Vorlagen, KI, Datensicherung … */
  let appSet = [], dr = null;
  H.appEinstellungen = (list) => { appSet = (list || []).filter(Boolean); if (dr && dr.bereich === 'app') dr.draw(); };
  H.einstellungenSchliessen = () => { if (dr) dr.close(); };
  const BUERO = [
    ['firma', 'Firma & Logo', 'Name, Anschrift, Logo und Briefbogen für Briefe und Mails'],
    ['ablage', 'Ablage', 'Dateiserver (Projektordner), Zugang'],
    ['mail', 'Mailserver', 'Postfach, über das die Plattform Mails verschickt'],
    ['allgemein', 'KI', 'Anbieter, Schlüssel, KI im Büro (Ollama)'],
    ['sicherung', 'Datensicherung', 'tägliche Sicherung, Kopie auf dem Dateiserver, Wiederherstellen'],
  ];
  H.einstellungen = function (opt = {}) {
    if (dr) dr.close();
    const admin = !!(H.me && (H.me.is_admin || H.me.admin));
    const appName = (band && band.querySelector('.bph-app') ? band.querySelector('.bph-app').textContent : '') || 'Diese App';
    let bereich = opt.bereich || (appSet.length ? 'app' : 'ich');
    if (bereich === 'buero' && !admin) bereich = 'ich';
    let teil = opt.teil || '';
    const bg = document.createElement('div'); bg.className = 'bph-dr-bg';
    bg.innerHTML = '<aside class="bph-dr" role="dialog" aria-modal="true" aria-label="Einstellungen"><div class="bph-drh"><b>' + IC.gear + 'Einstellungen</b><button type="button" class="bph-x" data-drx aria-label="Schließen">×</button></div><div class="bph-drt"></div><div class="bph-drn"></div><div class="bph-drb"></div></aside>';
    document.body.appendChild(bg);
    const T = bg.querySelector('.bph-drt'), N = bg.querySelector('.bph-drn'), B = bg.querySelector('.bph-drb');
    const kopf = () => {
      T.innerHTML = [['app', IC[H.app === 'portal' ? 'home' : H.app] || IC.home, appName], ['ich', IC.user, 'Für mich']].concat(admin ? [['buero', IC.buero, 'Büro']] : [])
        .map(([k, i, l]) => `<button type="button" data-drb="${k}" class="${k === bereich ? 'on' : ''}"${k === bereich ? ' aria-current="true"' : ''}>${i}<span>${esc(l)}</span></button>`).join('');
    };
    const nav = (items) => {
      if (!items.find((x) => x[0] === teil)) teil = items.length ? items[0][0] : '';
      N.innerHTML = items.length > 1 ? items.map(([k, l]) => `<button type="button" data-drt="${esc(k)}" class="${k === teil ? 'on' : ''}">${esc(l)}</button>`).join('') : '';
      N.hidden = items.length < 2;
    };
    let aufr = null;   // Aufräumen der App beim Wechsel/Schließen (render darf eine Funktion zurückgeben)
    const aufraeumen = () => { const f = aufr; aufr = null; if (typeof f === 'function') { try { f(); } catch { /* App-Fehler nicht weitergeben */ } } };
    function draw() {
      aufraeumen();
      kopf(); B.innerHTML = ''; B.scrollTop = 0; B.classList.remove('bph-drb-if');
      if (bereich === 'app') {
        nav(appSet.filter((x) => x.render).map((x) => [x.key, x.label]));
        const links = appSet.filter((x) => !x.render && x.open);
        const cur = appSet.find((x) => x.render && x.key === teil);
        if (!appSet.length) { B.innerHTML = `<p class="bph-mu">${esc(appName)} hat keine eigenen Einstellungen. Persönliches findest du unter „Für mich“${admin ? ', Büroweites unter „Büro“' : ''}.</p>`; return; }
        if (cur) { const host = document.createElement('div'); host.className = 'bph-drp'; B.appendChild(host); try { const r = cur.render(host, { schliessen: () => dr && dr.close() }); if (typeof r === 'function') aufr = r; } catch (e) { host.textContent = 'Fehler: ' + e.message; } }
        if (links.length) {
          const box = document.createElement('div'); box.className = 'bph-cards';
          box.innerHTML = (cur ? '<h4>Weitere Einstellungen</h4>' : '') + links.map((x, i) => `<button type="button" class="bph-card" data-dro="${i}"><b>${esc(x.label)}</b>${x.text ? `<small>${esc(x.text)}</small>` : ''}</button>`).join('');
          box.addEventListener('click', (e) => { const b = e.target.closest('[data-dro]'); if (!b) return; const x = links[+b.dataset.dro]; dr.close(); x.open(); });
          B.appendChild(box);
        }
        return;
      }
      if (bereich === 'ich') {
        nav([['konto', 'Mein Konto'], ['look', 'Darstellung']]);
        if (teil === 'look') {
          B.innerHTML = '<h4>Darstellung</h4><p class="bph-mu">Farbschema und Akzentfarbe – gelten für dich in allen Apps und auf allen Geräten.</p><div class="bph-lookp"></div>';
          const lp = B.querySelector('.bph-lookp'); const re = () => { lp.innerHTML = lookHtml(); }; re(); lookWire(lp, re);
        } else { const host = document.createElement('div'); B.appendChild(host); H.konto({ into: host, tab: 'konto', nurKonto: true }); }
        return;
      }
      nav(BUERO.map(([k, l]) => [k, l]).concat([['vorlagen', 'E-Mail-Vorlagen'], ['verlauf', 'Verlauf']]));
      if (teil === 'vorlagen') { const host = document.createElement('div'); B.appendChild(host); H.konto({ into: host, tab: 'vorlagen', nurVorlagen: true }); return; }
      if (teil === 'verlauf') { const host = document.createElement('div'); B.appendChild(host); H.verlaufAlle({ into: host }); return; }
      const adm = sortApps().find((a) => a.key === 'admin');
      if (!adm) { B.innerHTML = '<p class="bph-mu">Die Verwaltung ist für dein Konto nicht erreichbar.</p>'; return; }
      // Büro-Einstellungen der Verwaltung direkt hier (eingebettet, dieselben Formulare)
      B.classList.add('bph-drb-if');
      B.innerHTML = `<iframe class="bph-if" title="Büro-Einstellungen" src="${esc(appUrl(adm))}/?einbetten=1#einstellungen${teil === 'allgemein' ? '' : '-' + esc(teil)}"></iframe>`;
    }
    const close = () => {
      bg.remove(); dr = null; document.removeEventListener('keydown', key); aufraeumen();
      if (lookDirty) { lookDirty = false; Promise.resolve(typeof window.flushSave === 'function' ? window.flushSave() : null).catch(() => null).then(() => location.reload()); }
      if (opt.onClose) opt.onClose();
    };
    const key = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal-bg,.bph-dlg-bg,#sheet:not(.hidden)')) close(); };
    document.addEventListener('keydown', key);
    bg.addEventListener('click', (e) => {
      if (e.target === bg || e.target.closest('[data-drx]')) { close(); return; }
      const b = e.target.closest('[data-drb]'); if (b) { bereich = b.dataset.drb; teil = ''; draw(); return; }
      const t = e.target.closest('[data-drt]'); if (t) { teil = t.dataset.drt; draw(); }
    });
    dr = { close, draw, get bereich() { return bereich; } };
    draw();
    requestAnimationFrame(() => bg.classList.add('in'));
    return dr;
  };

  /* ---------- Versionsleiste: je Projekt EINE Datei je App, darin Versionen mit Unternamen (Startversion, nach Bauherrengespräch …)
     H.versionsleiste({ vor: Element, liste: [{ id, name, sub, datum, wer, archiviert }], aktuell: id, rechts: [Elemente],
       onWahl(id), onNeu(), onUmbenennen(), onVerlauf(), onVerwalten() })  – erneut aufrufen zum Aktualisieren.
     Gespeichert wird in den Apps automatisch; „gespeichert“ zeigt H.versionStatus(text). */
  H.versionsleiste = function (o) {
    let el = document.getElementById('bph-vl');
    if (!el) {
      el = document.createElement('div'); el.id = 'bph-vl'; el.className = 'bph-vleiste';
      (o.vor && o.vor.parentNode ? o.vor.parentNode : document.body).insertBefore(el, o.vor || null);
      el.addEventListener('click', (e) => {
        const O = el._o, b = e.target.closest('[data-vl]'); if (!b || !O) return;
        const a = b.dataset.vl;
        if (a === 'dd') { const m = el.querySelector('.bph-vl-menu'); m.hidden = !m.hidden; return; }
        el.querySelector('.bph-vl-menu').hidden = true;
        if (a === 'w') { if (String(b.dataset.id) !== String(O.aktuell) && O.onWahl) O.onWahl(b.dataset.id); return; }
        if (a === 'x') { const x = (O.extra || [])[+b.dataset.i]; if (x && x.fn) x.fn(); return; }
        const f = { neu: O.onNeu, ren: O.onUmbenennen, ver: O.onVerlauf, verw: O.onVerwalten }[a]; if (f) f();
      });
      document.addEventListener('mousedown', (e) => { const m = el.querySelector('.bph-vl-menu'); if (m && !m.hidden && !e.target.closest('.bph-vl-menu,[data-vl="dd"]')) m.hidden = true; });
      document.addEventListener('keydown', (e) => { const m = el.querySelector('.bph-vl-menu'); if (e.key === 'Escape' && m) m.hidden = true; });
    }
    el._o = o;
    const L = o.liste || [], akt = L.find((x) => String(x.id) === String(o.aktuell)), nr = (x) => L.filter((y) => !y.archiviert).indexOf(x) + 1;
    const zeile = (x) => `<button type="button" class="bph-vl-i${x === akt ? ' on' : ''}${x.archiviert ? ' alt' : ''}" data-vl="w" data-id="${x.id}"><span class="n">${x.archiviert ? '🗄' : nr(x)}</span><span class="t"><b>${esc(x.name || 'ohne Namen')}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span><span class="d">${esc(x.wer || '')}${x.datum ? '<br>' + esc(x.datum) : ''}</span></button>`;
    const aktiv = L.filter((x) => !x.archiviert), arch = L.filter((x) => x.archiviert);
    const st = el.querySelector('.bph-vl-st'), stT = st ? st.textContent : '';
    el.innerHTML = `<span class="bph-vl-l">Version</span>
      <span class="bph-vl-w"><button type="button" class="bph-vl-dd" data-vl="dd" aria-haspopup="listbox"${akt ? '' : ' disabled'}>${akt ? `<b class="n">${akt.archiviert ? '🗄' : nr(akt)}</b><b class="t">${esc(akt.name || 'ohne Namen')}</b>${akt.sub ? `<small>${esc(akt.sub)}</small>` : ''}` : '<b class="t">–</b>'}<span class="c">▾</span></button>
      <div class="bph-vl-menu" hidden>${aktiv.map(zeile).join('')}${arch.length ? '<div class="bph-vl-h">Archiviert</div>' + arch.map(zeile).join('') : ''}
        <div class="bph-vl-sep2"></div>${akt ? `<button type="button" class="bph-vl-a" data-vl="neu">＋ Neue Version aus „${esc(akt.name || '')}“ …</button>` : ''}${(o.extra || []).map((x, i) => `<button type="button" class="bph-vl-a" data-vl="x" data-i="${i}">${esc(x.text)}</button>`).join('')}${o.onVerwalten && akt ? `<button type="button" class="bph-vl-a" data-vl="verw">🗄 Diese Version archivieren / löschen …</button>` : ''}</div></span>
      ${akt ? `<button type="button" class="bph-vl-b pri" data-vl="neu" title="Kopie der aktuellen Version unter neuem Namen – die alte bleibt, wie sie ist">＋ Neue Version …</button><button type="button" class="bph-vl-b" data-vl="ren">✎ Umbenennen</button>${o.onVerlauf ? '<button type="button" class="bph-vl-b" data-vl="ver" title="Automatisch gesicherte Zwischenstände dieser Version">🕘 Verlauf</button>' : ''}` : ''}
      <span class="bph-vl-r"></span><span class="bph-vl-st" role="status">${esc(stT)}</span>`;
    const r = el.querySelector('.bph-vl-r');
    if ((o.rechts || []).length) { r.insertAdjacentHTML('beforebegin', '<span class="bph-vl-sp"></span>'); (o.rechts || []).forEach((x) => x && r.appendChild(x)); }
    return el;
  };
  H.versionStatus = (t) => { const s = document.querySelector('#bph-vl .bph-vl-st'); if (s) s.textContent = t || ''; };

  /* ---------- Dialoge der Kopfleiste (Projekt, Verlauf, Konto …): an der Titelzeile verschieben, an der Ecke in der Größe ändern ---------- */
  function dlgBeweglich(m) {
    if (!m || m.dataset.beweglich || innerWidth <= 700) return; m.dataset.beweglich = '1';
    m.addEventListener('pointerdown', (e) => {
      const k = m.querySelector('.bph-dh'); if (!k || !k.contains(e.target) || e.target.closest('button,input,select,a') || e.button > 0) return;
      const r = m.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top; e.preventDefault();
      Object.assign(m.style, { position: 'fixed', margin: '0', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px' });
      const mv = (ev) => { m.style.left = Math.max(-r.width + 100, Math.min(innerWidth - 100, ev.clientX - dx)) + 'px'; m.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + 'px'; };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
  }
  const dlgBeob = () => new MutationObserver((ms) => ms.forEach((x) => x.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.classList.contains('bph-dlg-bg')) setTimeout(() => dlgBeweglich(n.querySelector('.bph-dlg')), 0); })))
    .observe(document.body, { childList: true });   // Dialoge hängen direkt am <body> – nur dort schauen (schnell)
  if (document.body) dlgBeob(); else addEventListener('DOMContentLoaded', dlgBeob);

  /* ---------- aktuelles Projekt: gilt in allen Apps (wer die App wechselt, bleibt im selben Projekt) ---------- */
  H.projektSetzen = async function (id) {
    id = id ? +id : null;
    if ((H.projekt && H.projekt.id) === id) { kopfProjekt(); return H.projekt; }
    try {
      const r = await fetch('api/bp/projekt', { method: 'PUT', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then((x) => x.json());
      H.projekt = r && r.id ? r : null; kopfProjekt();
    } catch { /* nicht schlimm */ }
    return H.projekt;
  };
  H.projektId = () => (H.projekt && H.projekt.id) || null;
  /* Die Kopfleiste zeigt immer das aktuelle Projekt (eine Projektauswahl für alle Apps); Apps wählen darunter nur ihr LV, ihren Plan … */
  function kopfProjekt() { const p = H.projekt; H.setProject(p ? { title: p.name, sub: p.adresse || 'Keine Adresse hinterlegt' } : null); }
  /* ---------- Projekt bearbeiten / anlegen – EINE Maske für alle Apps (Bautagebuch, Verwaltung, Projektauswahl) ----------
     H.projektBearbeiten(id | null, { onSaved(id), onDelete(projekt, close) })  – gespeichert wird im Bautagebuch */
  H.projektBearbeiten = async function (id, opt = {}) {
    const B = H.app === 'bautagebuch' ? 'api/' : 'api/bp/bt/';
    const J = (u, m, b) => KX(B + u, m ? { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined } : {});
    let P, LEAD;
    try { [P, LEAD] = await Promise.all([id ? J('projects').then((l) => l.find((x) => x.id === +id)) : null, J('leaders')]); } catch (e) { alert(e.message); return; }
    if (id && !P) { alert('Projekt nicht gefunden.'); return; }
    const neu = !P, me = H.me || {};
    const d = P ? { ...P, leaders: [...(P.leaders || [])] } : { name: opt.name || '', client: '', street: '', zip: '', city: '', folder: '', leaders: me.is_admin ? [] : [me.id].filter(Boolean) };
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = '<div class="bph-dlg bph-pe" role="dialog" aria-label="Projekt"></div>'; document.body.appendChild(bg);
    const root = bg.firstChild, close = () => { bg.remove(); document.removeEventListener('keydown', k1); }, k1 = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', k1); bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    const adr = () => [d.street, [d.zip, d.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const hatPos = () => d.lat != null && d.lon != null;
    const karte = () => { const q = hatPos() ? d.lat + ',' + d.lon : adr(); if (!q) return ''; const e = encodeURIComponent(q);
      return `<div class="bph-map"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte" src="https://www.google.com/maps?q=${e}&hl=de&z=15&output=embed"></iframe><a href="https://www.google.com/maps/dir/?api=1&destination=${e}&travelmode=driving" target="_blank" rel="noopener">Route dorthin planen ↗</a></div>`; };
    const posInfo = () => ((d.extra && d.extra.addr_auto) ? 'Adresse und PLZ wurden automatisch aus dem Projektnamen ermittelt – bitte prüfen. ' : '')
      + (hatPos() ? 'Standort gespeichert – damit wählt das Bautagebuch dieses Projekt automatisch, wenn du vor Ort bist.' : neu ? 'Ohne Adresse wird sie beim Anlegen aus dem Projektnamen ermittelt.' : 'Noch kein Standort: Adresse eintragen oder „Aktuellen Standort übernehmen“.');
    const f = (k, l, w, extra = '') => `<label class="${w ? 'w' : ''}">${l}<input data-pe="${k}" value="${esc(d[k] || '')}" autocomplete="off"${extra}></label>`;
    let msg = '', ordT = 0;
    const ordnerVorschlag = (inp) => {   // Ordner auf dem Server zur Eingabe (Name: nur bei neuen Projekten; Projektordner: mit Hauptordner)
      clearTimeout(ordT); const qq = inp.value.trim(), k = inp.dataset.pe; if (qq.length < 2) return;
      ordT = setTimeout(async () => {
        let r = []; try { r = await KX(B + 'store/folders?q=' + encodeURIComponent(qq.split('/').pop() || qq) + (k === 'folder' ? '&pfad=1' : '')); } catch { return; }
        const dl = root.querySelector('#bph-dl-' + k); if (!dl || inp.value.trim() !== qq) return;
        dl.innerHTML = (Array.isArray(r) ? r : []).map((n) => `<option value="${esc(n)}"></option>`).join('');
      }, 250);
    };
    function draw() {
      root.innerHTML = `<div class="bph-dh"><b>${neu ? 'Neues Projekt' : esc(d.name || 'Projekt')}</b><button type="button" class="bph-x" data-pc aria-label="Schließen">×</button></div><div class="bph-db">
        <div class="bph-pef">${f('name', 'Bauvorhaben *', 1, ' placeholder="Projektnummer und Name, z. B. A541 Schürmannstr. 4, Bottrop"' + (neu ? ' list="bph-dl-name"' : ''))}<datalist id="bph-dl-name"></datalist>${f('client', 'Bauherrschaft (Name und Anschrift)', 1)}${f('street', 'Straße und Hausnummer', 1)}${f('zip', 'PLZ', 0, ' inputmode="numeric"')}${f('city', 'Ort')}</div>
        <div class="bph-row"><button type="button" class="bph-btn" data-pgeo>Adresse suchen</button><button type="button" class="bph-btn" data-phier>Aktuellen Standort übernehmen</button></div>
        <p class="bph-mu">${esc(posInfo())}</p>${karte()}
        <h4>Zuständige Bauleiter</h4><div class="bph-chips">${LEAD.map((u) => `<button type="button" class="bph-chip${d.leaders.includes(u.id) ? ' on' : ''}" data-pl="${u.id}" aria-pressed="${d.leaders.includes(u.id)}">${esc(u.name)}</button>`).join('') || '<small>Noch keine Benutzer.</small>'}</div>
        <p class="bph-mu">${d.leaders.length ? 'Nur die ausgewählten Bauleiter und die Administratoren sehen dieses Projekt in der Projektauswahl.' : 'Niemand ausgewählt: alle Benutzer sehen dieses Projekt.'}</p>
        <div class="bph-pef">${f('folder', 'Projektordner auf dem Server (leer = automatisch über das Kürzel; Unterordner mit /)', 1, ' list="bph-dl-folder" placeholder="Ordnernamen tippen – Vorschläge vom Server"')}<datalist id="bph-dl-folder"></datalist></div>
        ${msg ? `<p class="bph-err">${esc(msg)}</p>` : ''}
        <div class="bph-row bph-pea">${neu ? '' : `${opt.archiv ? `<button type="button" class="bph-btn" data-parch>${d.archived ? 'Aus dem Archiv holen' : 'Projekt archivieren'}</button>` : ''}${opt.onDelete ? '<button type="button" class="bph-btn bph-bad" data-pdel>🗑 In den Papierkorb …</button>' : ''}`}
          <span style="flex:1"></span><button type="button" class="bph-btn" data-pc>Abbrechen</button><button type="button" class="bph-btn pri" data-pok>${neu ? 'Anlegen' : 'Speichern'}</button></div></div>`;
    }
    const lesen = () => root.querySelectorAll('[data-pe]').forEach((i) => { d[i.dataset.pe] = i.value.trim().replace(/\s+/g, ' '); });
    async function speichern(extra) {
      lesen(); if (!d.name) { msg = 'Bitte einen Namen für das Bauvorhaben eingeben.'; draw(); root.querySelector('[data-pe="name"]').focus(); return; }
      const body = { name: d.name, client: d.client, street: d.street, zip: d.zip, city: d.city, folder: d.folder, leaders: d.leaders, ...(extra || {}) };
      if (P) for (const k of ['street', 'zip', 'city']) if ((P[k] || '') === body[k]) delete body[k];   // Adresse unverändert: Standort nicht neu suchen
      try {
        const r = neu ? await J('projects', 'POST', body) : await J('projects/' + P.id, 'PUT', body);
        const nid = neu ? r.id : P.id; close(); if (H.projekt && H.projekt.id === nid) H.projekt = null;   // Kopfleiste neu laden (Name/Adresse geändert)
        const t = r.auto_address ? 'Adresse aus dem Projektnamen ermittelt – bitte prüfen.' : r.geocoded === false ? 'Adresse nicht gefunden – bitte prüfen.' : neu ? 'Projekt angelegt.' : 'Gespeichert.';
        if (!neu && extra && 'archived' in extra && typeof window.rueckgaengig === 'function') {   // Archivieren: mit Rückgängig
          const alt = d.archived ? 1 : 0;
          window.rueckgaengig(`„${d.name}“ ${alt ? 'aus dem Archiv geholt' : 'archiviert'}`, async () => {
            await J('projects/' + nid, 'PUT', { archived: alt });
            if (opt.onSaved) opt.onSaved(nid); else location.reload();
          });
        } else if (window.toast) toast(t);
        if (opt.onSaved) opt.onSaved(nid); else { await H.projektSetzen(nid); location.reload(); }
      } catch (e) { msg = e.message; draw(); }
    }
    root.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-pc]')) return close();
      const ch = t.closest('[data-pl]'); if (ch) { lesen(); const u = +ch.dataset.pl; d.leaders = d.leaders.includes(u) ? d.leaders.filter((x) => x !== u) : [...d.leaders, u]; return draw(); }
      if (t.closest('[data-pok]')) return speichern();
      if (t.closest('[data-parch]')) { lesen(); return speichern({ archived: d.archived ? 0 : 1 }); }
      if (t.closest('[data-pdel]')) { close(); return opt.onDelete(P); }
      if (t.closest('[data-pgeo]')) {
        lesen(); const a = adr(); msg = '';
        try { const g = await J('geocode?q=' + encodeURIComponent(a || d.name) + (a ? '' : '&from_name=1'));
          if (!g.found) msg = 'Adresse nicht gefunden. Bitte Straße, PLZ und Ort eintragen.'; else Object.assign(d, { street: g.street, zip: g.zip, city: g.city, lat: g.lat, lon: g.lon });
        } catch (er) { msg = er.message; }
        return draw();
      }
      if (t.closest('[data-phier]')) {
        lesen(); if (!navigator.geolocation) { msg = 'Standort nicht verfügbar.'; return draw(); }
        navigator.geolocation.getCurrentPosition(async (g) => {
          d.lat = g.coords.latitude; d.lon = g.coords.longitude;
          try { const r = await J(`geo?lat=${d.lat}&lon=${d.lon}`); if (!r.error) Object.assign(d, { street: r.street || '', zip: r.plz || '', city: r.city || '' }); } catch { /* nur Standort */ }
          if (P) { try { await J('projects/' + P.id, 'PUT', { lat: d.lat, lon: d.lon, street: d.street, zip: d.zip, city: d.city }); P.street = d.street; P.zip = d.zip; P.city = d.city; } catch (er) { msg = er.message; } }
          draw();
        }, () => { msg = 'Der Standort ist nicht verfügbar – bitte im Browser erlauben.'; draw(); }, { enableHighAccuracy: true, timeout: 10000 });
      }
    });
    root.addEventListener('input', (e) => { if (e.target.matches('[data-pe="folder"]') || (neu && e.target.matches('[data-pe="name"]'))) ordnerVorschlag(e.target); });
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-pe]')) speichern(); });
    draw(); root.querySelector('[data-pe="name"]').focus();
  };

  /* ---------- Projektauswahl – dieselbe Maske wie im Bautagebuch, in allen Apps ----------
     H.projektWahl({ aktuell, onPick(id, projekt) })  – ohne onPick: als aktuelles Projekt setzen und die App neu laden
     (oder die App hat mit H.beiProjektWahl(fn) eine eigene Reaktion hinterlegt). */
  let pwFn = null;
  H.beiProjektWahl = (fn) => { pwFn = fn; };
  H.projektWahl = async function (opt = {}) {
    let P; try { P = await KX('api/bp/projekte'); } catch (e) { alert(e.message); return; }
    const akt = opt.aktuell != null ? +opt.aktuell : H.projektId();
    let q = '', fremd = false, hier = null;
    try { hier = JSON.parse(sessionStorage.getItem('bpHier') || 'null'); } catch { /* egal */ }
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-pw-bg';
    bg.innerHTML = `<div class="bph-dlg bph-pw" role="dialog" aria-label="Projekt wählen"><div class="bph-pwh"><input type="search" placeholder="Projekt suchen (Name oder Adresse)" autocomplete="off" data-pq><button type="button" class="bph-x" data-px aria-label="Schließen">×</button></div>
      <div class="bph-pwl" data-pl></div>
      <div class="bph-pwf"><button type="button" class="bph-btn" data-pneu>＋ Neues Projekt</button><button type="button" class="bph-btn" data-pstand>Nach Standort wählen</button><button type="button" class="bph-btn" data-pedit style="grid-column:1/-1">Projekt bearbeiten</button></div></div>`;
    document.body.appendChild(bg);
    const L = bg.querySelector('[data-pl]'), close = () => { bg.remove(); document.removeEventListener('keydown', k1); }, k1 = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', k1); bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    const rad = (x) => x * Math.PI / 180, dist = (p) => (hier && p.lat != null && p.lon != null ? 12742000 * Math.asin(Math.sqrt(Math.sin(rad(p.lat - hier.lat) / 2) ** 2 + Math.cos(rad(hier.lat)) * Math.cos(rad(p.lat)) * Math.sin(rad(p.lon - hier.lon) / 2) ** 2)) : null);
    const fd = (m) => (m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km');
    const adr = (p) => [p.street, [p.zip, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const passt = (p) => { const t = [p.name, p.street, p.zip, p.city, p.client].join(' ').toLowerCase(); return q.trim().toLowerCase().split(/\s+/).every((w) => t.includes(w)); };
    const zeile = (p, rechts, alt) => `<button type="button" class="bph-pi${p.id === akt ? ' on' : ''}${alt ? ' old' : ''}" data-pid="${p.id}"><span><b>${esc(p.name)}</b>${(alt || adr(p)) ? `<small>${esc(alt || adr(p))}</small>` : ''}</span>${rechts ? `<i>${esc(rechts)}</i>` : ''}</button>`;
    let ordner = [], ordT = 0;
    function draw() {   // nur aktive Projekte (Archiv: Verwaltung); oben die eigenen, aufklappbar die der anderen
      const A = P.filter((p) => !p.archived && passt(p)), M = A.filter((p) => p.mein), W = A.filter((p) => !p.mein);
      const nW = P.filter((p) => !p.archived && !p.mein).length;
      const sort = (l) => (hier ? l.sort((a, b) => (dist(a) ?? 1e12) - (dist(b) ?? 1e12) || b.id - a.id) : l);
      sort(M); sort(W);
      const zW = fremd || !P.some((p) => !p.archived && p.mein) || (q.trim() && W.length);
      const rechts = (p) => (dist(p) != null ? fd(dist(p)) : '');
      let h = `<div class="bph-pws">Meine Projekte</div>` + (M.length ? M.map((p) => zeile(p, rechts(p))).join('') : `<div class="bph-pwe">${q.trim() ? 'Keine Treffer bei deinen Projekten.' : 'Du bist bei keinem Projekt als Bauleiter eingetragen.'}</div>`);
      if (nW) h += `<button type="button" class="bph-pi bph-pt" data-pfremd>👥 Projekte der anderen (${q.trim() ? W.length : nW}) ${zW ? '– ausblenden' : '– anzeigen'}</button>`
        + (zW ? W.map((p) => zeile(p, rechts(p), [p.bauleiter && 'Bauleiter: ' + p.bauleiter, adr(p)].filter(Boolean).join(' · ') || ' ')).join('') : '');
      if (q.trim().length >= 2 && ordner.length) h += '<div class="bph-pws">Ordner auf dem Server – antippen legt das Projekt an</div>' + ordner.map((n) => `<button type="button" class="bph-pi" data-pordner="${esc(n)}"><span><b>＋ ${esc(n)}</b></span></button>`).join('');
      L.innerHTML = h;
      const e = L.querySelector('.on'); if (e && !q) e.scrollIntoView({ block: 'nearest' });
    }
    const ordnerSuchen = () => { clearTimeout(ordT); const qq = q.trim(); if (qq.length < 2) { ordner = []; return; }
      ordT = setTimeout(async () => { try { const r = await KX((H.app === 'bautagebuch' ? 'api/' : 'api/bp/bt/') + 'store/folders?q=' + encodeURIComponent(qq)); if (qq === q.trim()) { const vorh = new Set(P.map((p) => p.name)); ordner = (Array.isArray(r) ? r : []).filter((n) => !vorh.has(n)).slice(0, 8); draw(); } } catch { /* ohne Ablage */ } }, 300); };
    async function waehlen(id) {
      const p = P.find((x) => x.id === id); close();
      if (opt.onPick) return opt.onPick(id, p);
      await H.projektSetzen(id);
      if (pwFn) return pwFn(id, p);
      location.reload();
    }
    const waehlenNeu = async (id) => { if (opt.onPick) return opt.onPick(id, null); await H.projektSetzen(id); if (pwFn) return pwFn(id, null); location.reload(); };
    const standort = () => new Promise((ok, nein) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((g) => { hier = { lat: g.coords.latitude, lon: g.coords.longitude }; try { sessionStorage.setItem('bpHier', JSON.stringify(hier)); } catch { /* egal */ } ok(hier); }, nein, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }) : nein(new Error('kein GPS')));
    bg.addEventListener('input', (e) => { if (e.target.matches('[data-pq]')) { q = e.target.value; draw(); ordnerSuchen(); } });
    bg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-pq]')) { const b = L.querySelector('[data-pid]'); if (b) waehlen(+b.dataset.pid); } });
    bg.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-px]')) return close();
      const pi = t.closest('[data-pid]'); if (pi) return waehlen(+pi.dataset.pid);
      const od = t.closest('[data-pordner]'); if (od) { close(); return H.projektBearbeiten(null, { name: od.dataset.pordner, onSaved: (id) => waehlenNeu(id) }); }
      if (t.closest('[data-pfremd]')) { fremd = !fremd; return draw(); }
      if (t.closest('[data-pstand]')) {
        try { await standort(); } catch { alert('Der Standort ist nicht verfügbar – bitte im Browser erlauben.'); return; }
        const n = P.filter((p) => !p.archived && dist(p) != null).sort((a, b) => dist(a) - dist(b))[0];
        if (n) return waehlen(n.id); draw(); return;
      }
      if (t.closest('[data-pneu]')) { close(); return H.projektBearbeiten(null, { onSaved: (id) => waehlenNeu(id) }); }
      if (t.closest('[data-pedit]')) { if (!akt) return alert('Bitte zuerst ein Projekt wählen.'); close(); return H.projektBearbeiten(akt, { onSaved: (id) => waehlenNeu(id) }); }
    });
    draw(); bg.querySelector('[data-pq]').focus();
    if (!hier && navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then((r) => { if (r.state === 'granted') standort().then(draw).catch(() => {}); }).catch(() => {});
  };
  /* Leiste unter der Kopfleiste, z. B. „Für A541 gibt es noch keine Kostenermittlung – anlegen?“ */
  H.hinweisLeiste = function (text, knopf, fn) {
    if (!band) return;
    let el = document.querySelector('.bph-hl'); if (el) el.remove();
    if (!text) return;
    el = document.createElement('div'); el.className = 'bph-hl'; el.setAttribute('role', 'status');
    el.innerHTML = `<span>${esc(text)}</span>${knopf ? `<button type="button" class="bph-btn pri" data-hl>${esc(knopf)}</button>` : ''}<button type="button" class="bph-x" data-hlx aria-label="Ausblenden">×</button>`;
    el.addEventListener('click', (e) => { if (e.target.closest('[data-hl]')) { el.remove(); fn && fn(); } else if (e.target.closest('[data-hlx]')) el.remove(); });
    band.after(el);
  };

  /* ---------- Benachrichtigungen an Kontakte ----------
     BPHead.kontaktAnlegen(['a@b.de'], { name, trade })  nach einer Sendung an Adressen ohne Kontakt kurz fragen, ob ein Kontakt angelegt werden soll
     BPHead.benachrichtigungen(kontaktId, host)          Verlauf der Sendungen an diesen Kontakt (Planversand, Rügen …) in host zeichnen */
  H.kontaktAnlegen = function (emails, vor = {}) {
    const L = [...new Set((emails || []).filter(Boolean))];
    if (!L.length) return Promise.resolve([]);
    return new Promise((fertig) => {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg bph-kn" role="dialog" aria-label="Als Kontakt anlegen?"><div class="bph-dh"><b>Als Kontakt anlegen?</b><button type="button" class="bph-x" aria-label="Schließen">×</button></div><div class="bph-db">
        <p class="bph-mu">Für ${L.length > 1 ? 'diese Adressen gibt' : 'diese Adresse gibt'} es noch keinen Kontakt. Die Sendung ist trotzdem im Verlauf vermerkt – sie erscheint beim Kontakt, sobald er mit dieser E-Mail-Adresse angelegt ist.</p>
        ${L.map((m, i) => `<div class="bph-kn-z" data-kn="${i}"><div class="bph-kn-m">✉ <b>${esc(m)}</b></div>
          <div class="bph-row"><label style="flex:2">Firma / Name<input data-k="name" value="${esc(L.length === 1 ? vor.name || '' : '')}" placeholder="${esc(m.split('@')[1] || '')}"></label>
          <label style="flex:1.4">Gewerk<input data-k="trade" value="${esc(vor.trade || '')}"></label>
          <label style="flex:1.6">Ansprechpartner<input data-k="contact_person"></label></div>
          <div class="bph-row"><button type="button" class="bph-btn pri" data-kja>Kontakt anlegen</button><span class="bph-kn-st bph-mu"></span></div></div>`).join('')}
        <div class="bph-row" style="justify-content:flex-end;margin-top:.6rem"><button type="button" class="bph-btn" data-knein>Nicht jetzt</button></div></div></div>`;
      document.body.appendChild(bg);
      const neu = [];
      const close = () => { bg.remove(); fertig(neu); };
      bg.querySelector('.bph-x').onclick = close; bg.querySelector('[data-knein]').onclick = close;
      bg.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-kja]'); if (!b) return;
        const z = b.closest('[data-kn]'), i = +z.dataset.kn, st = z.querySelector('.bph-kn-st');
        const d = { email: L[i] }; z.querySelectorAll('[data-k]').forEach((x) => { d[x.dataset.k] = x.value.trim(); });
        b.disabled = true; st.textContent = 'wird angelegt …';
        try {
          const r = await KX('api/bp/kontakt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
          neu.push(r.id); st.textContent = r.vorhanden ? '✓ gab es schon' : '✓ angelegt';
          z.querySelectorAll('input').forEach((x) => { x.disabled = true; });
          if (!bg.querySelector('[data-kja]:not(:disabled)')) setTimeout(close, 700);
        } catch (er) { b.disabled = false; st.textContent = er.message; }
      });
      const f = bg.querySelector('[data-k="name"]'); if (f) f.focus();
    });
  };
  H.benachrichtigungen = async function (cid, host) {
    host.innerHTML = '<p class="bph-mu">Lade …</p>';
    let L; try { L = await KX(`api/bp/kontakt/${cid}/verlauf`); } catch (e) { host.innerHTML = `<p class="bph-mu">${esc(e.message)}</p>`; return; }
    const apps = ((H.conf || {}).apps || []).filter((a) => a.allowed);
    const lk = (l) => { const [k, fr] = String(l || '').split(':'); const a = apps.find((x) => x.key === k); return a && fr != null ? appUrl(a) + '/' + l.slice(k.length + 1) : ''; };
    const dt = (t) => { const d = new Date(t); return isNaN(d) ? t : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
    const IC2 = { planversand: '📐', maengelruege: '⚠', terminruege: '⏱' };
    host.innerHTML = L.length ? `<ul class="bph-bn">${L.map((x) => `<li class="${x.status === 'fehler' ? 'f' : ''}"><details><summary><span class="bph-bn-i">${IC2[x.art] || '✉'}</span>
        <span class="bph-bn-t"><span><b>${esc(x.art_name)}</b>${x.projekt ? ' · ' + esc(x.projekt) : ''}</span><small>${dt(x.ts)} · ${esc(x.weg_name)}${x.von ? ' · von ' + esc(x.von) : ''}${x.email ? ' · ' + esc(x.email) : ''}${x.status === 'fehler' ? ' · <b>nicht zugestellt</b>' : ''}</small></span></summary>
        <div class="bph-bn-d">${x.betreff ? `<div><b>${esc(x.betreff)}</b></div>` : ''}${x.inhalt ? `<pre>${esc(x.inhalt)}</pre>` : ''}${x.fehler ? `<div class="bph-mu">Fehler: ${esc(x.fehler)}</div>` : ''}${lk(x.link) ? `<a href="${esc(lk(x.link))}" data-bnp="${x.project_id || ''}">↗ ${x.art === 'planversand' ? 'Planversandliste' : 'Liste'} öffnen</a>` : ''}</div></details></li>`).join('')}</ul>`
      : '<p class="bph-mu">Noch keine Pläne, Mängel- oder Terminrügen an diesen Kontakt verschickt.</p>';
    const kom = apps.find((a) => a.key === 'kommunikation');
    if (kom && L.length) host.insertAdjacentHTML('beforeend', `<p><a href="${esc(appUrl(kom))}/#kontakt=${cid}">↗ Alles mit diesem Kontakt in „Kommunikation“</a></p>`);
    host.onclick = async (e) => {   // vorher das Projekt der Sendung als aktuelles Projekt setzen
      const a = e.target.closest('[data-bnp]'); if (!a || !a.dataset.bnp) return;
      e.preventDefault(); try { await H.projektSetzen(+a.dataset.bnp); } catch { /* egal */ } location.href = a.href;
    };
  };

  /* ---------- Ansicht für Fotos und PDFs: im Fenster der App blättern (nie ein neuer Tab – am iPhone kommt man sonst nicht zurück) ----------
     BPHead.ansehen([{ url, name, typ: 'bild'|'pdf' }], start)
     Automatisch für Links auf Fotos (uploads/…, .jpg/.png …) und für Links mit data-ansehen="pdf"|"bild".
     Alle passenden Links im selben Bereich ([data-galerie], sonst die Seite) sind eine Reihe: ‹ › , Wischen, Pfeiltasten. */
  const IMG_RX = /(^|\/)uploads\/|\.(jpe?g|png|webp|gif|heic)(\?|#|$)/i;
  const typVon = (a) => a.dataset.ansehen || (IMG_RX.test(a.getAttribute('href') || '') ? 'bild' : /\.pdf(\?|#|$)/i.test(a.getAttribute('href') || '') ? 'pdf' : '');
  let pdfjsP = null;
  function pdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsP) return pdfjsP;
    const tryLoad = (base) => new Promise((ok, bad) => { const s = document.createElement('script'); s.src = base + 'pdf.js'; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.js'; ok(window.pdfjsLib); }; s.onerror = () => { s.remove(); bad(); }; document.head.appendChild(s); });
    pdfjsP = tryLoad('static/vendor/pdfjs/').catch(() => tryLoad('vendor/pdfjs/')).catch(() => { pdfjsP = null; throw new Error('PDF-Anzeige nicht verfügbar'); });
    return pdfjsP;
  }
  let gv = null;
  H.ansehen = function (items, start = 0) {
    items = (items || []).filter((x) => x && x.url); if (!items.length) return;
    if (gv) gv.close(true);
    const el = document.createElement('div'); el.className = 'bph-gv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Ansicht');
    el.innerHTML = `<div class="bph-gvb"><button type="button" data-gv="x" aria-label="Schließen">✕</button><span class="bph-gvt"></span><span class="bph-gvn"></span>
      <button type="button" data-gv="zm" aria-label="Verkleinern">−</button><button type="button" data-gv="zp" aria-label="Vergrößern">+</button>
      <button type="button" data-gv="sk" class="bph-skb" aria-label="Markieren" title="Markieren – auch gemeinsam mit Kollegen gleichzeitig" hidden>✏️ Markieren</button>
      <button type="button" data-gv="dr" aria-label="Drucken" title="Drucken (mit Markierungen)">🖨</button><button type="button" data-gv="dl" aria-label="Teilen oder speichern" title="Teilen / speichern (mit Markierungen)">⤓</button></div><div class="bph-skl" hidden></div><div class="bph-skm" hidden><button type="button" data-skm="stift" title="Zeichnen">✏️</button><button type="button" data-skm="zeigen" title="Nur zeigen / blättern">☝</button><button type="button" data-skm="zurueck" title="Letzten Strich zurück">↶</button><button type="button" data-skm="voll" title="Leisten wieder einblenden">⤡</button></div>
      <div class="bph-gvs"></div><button type="button" class="bph-gvp" data-gv="prev" aria-label="Vorheriges">‹</button><button type="button" class="bph-gvp n" data-gv="next" aria-label="Nächstes">›</button>`;
    document.body.appendChild(el);
    const S = el.querySelector('.bph-gvs');
    let i = Math.max(0, Math.min(items.length - 1, start)), zoom = 1, tok = 0, pdf = null, roh = null;
    const SK = { id: null, striche: [], seq: 0, werkzeug: 'stift', farbe: '#e5484d', leute: [], t: 0, zt: 0, owner: null, aus: false, dauerhaft: false, dauer: null };
    const fitW = () => Math.max(320, Math.min((S.clientWidth || window.innerWidth) - 16, 1400));
    async function show() {
      const x = items[i], my = ++tok; zoom = 1; pdf = null;
      el.querySelector('.bph-gvt').textContent = x.name || '';
      el.querySelector('.bph-gvn').textContent = items.length > 1 ? `${i + 1} / ${items.length}` : '';
      el.querySelectorAll('.bph-gvp').forEach((b) => { b.hidden = items.length < 2; });
      S.scrollTop = 0; S.innerHTML = '<div class="bph-gvl">Lade …</div>';
      el.querySelector('.bph-skb').hidden = x.typ !== 'pdf';
      if (SK.id && !x.skizze) skEnde(true);
      if (!SK.id) { SK.striche = []; SK.dauer = null; skKnopf(); }
      if (x.typ !== 'pdf') { S.innerHTML = `<img class="bph-gvi" src="${esc(x.url)}" alt="${esc(x.name || '')}">`; return; }
      try {
        const lib = await pdfjs();
        const data = await fetch(x.url, { credentials: 'same-origin' }).then((r) => { if (!r.ok) throw new Error(r.status === 403 ? 'Keine Einladung zu dieser Skizze.' : 'Datei nicht lesbar (' + r.status + ')'); return r.arrayBuffer(); });
        if (my !== tok) return;
        roh = data.slice(0);
        pdf = await lib.getDocument({ data }).promise;
        await renderPdf(my);
        if (x.skizze && SK.id !== x.skizze) skBeitreten(x.skizze); else if (!x.skizze) skDauerSuchen(my);
      } catch (e) { if (my === tok) S.innerHTML = `<div class="bph-gvl">${esc(e.message || 'PDF nicht lesbar')}<br><a href="${esc(x.url)}" download>Datei herunterladen</a></div>`; }
    }
    async function renderPdf(my) {
      if (!pdf) return;
      S.innerHTML = '';
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      for (let n = 1; n <= pdf.numPages && my === tok; n++) {
        const pg = await pdf.getPage(n), v0 = pg.getViewport({ scale: 1 }), sc = (fitW() / v0.width) * zoom, v = pg.getViewport({ scale: sc * dpr });
        const wr = document.createElement('div'); wr.className = 'bph-pg'; wr.dataset.seite = n; wr.style.width = (zoom * 100) + '%';
        const cv = document.createElement('canvas'); cv.width = v.width; cv.height = v.height; cv.className = 'bph-gvc';
        const ov = document.createElement('canvas'); ov.className = 'bph-skc';
        wr.append(cv, ov); S.appendChild(wr);
        await pg.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise;
        skZeichnen(n);
      }
      skModus();
    }
    /* ---------- Markieren, auch gemeinsam: Striche relativ zur Seite (0…1), Abgleich alle 0,7 s (siehe bpcore/skizze.py) ---------- */
    const SKW = { stift: ['✏️', 'Stift', 0.0022], marker: ['🖍', 'Marker', 0.011], pfeil: ['↗', 'Pfeil', 0.0025], rechteck: ['▭', 'Rechteck', 0.0025], text: ['T', 'Text', 0.0045], zeigen: ['☝', 'Nur zeigen / blättern', 0] };
    const SKJ = (u, m, b) => KX(u, m ? { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) } : {});
    const ich = () => (H.me && H.me.id) || null;
    function skLeiste() {
      const L = el.querySelector('.bph-skl'); L.hidden = !SK.id;
      if (!SK.id) return;
      const andere = SK.leute.filter((p) => p.uid !== ich() && p.aktiv);
      const html = `${Object.entries(SKW).map(([k, [ic, t]]) => `<button type="button" data-skw="${k}" class="${SK.werkzeug === k ? 'on' : ''}" title="${t}">${ic}</button>`).join('')}
        <span class="bph-skf" style="background:${SK.farbe}" title="deine Farbe"></span>
        <button type="button" data-sk="zurueck" title="Meinen letzten Strich zurücknehmen">↶</button><button type="button" data-sk="alle" title="${SK.owner === ich() ? 'Alle Markierungen löschen' : 'Alle meine Markierungen löschen'}">🗑</button>
        <span class="bph-skp">${andere.length ? andere.map((p) => `<i style="background:${p.farbe}"></i>${esc(p.name.split(' ')[0])}`).join(' ') : 'nur du'}</span>
        <button type="button" data-sk="dauer" class="${SK.dauerhaft ? 'on' : ''}" title="${SK.dauerhaft ? 'Markierungen bleiben dauerhaft am Plan – jeder, der den Plan öffnet, sieht sie. Klicken zum Aufheben.' : 'Markierungen dauerhaft am Plan behalten – erscheinen wieder, wenn jemand den Plan öffnet'}">📌 ${SK.dauerhaft ? 'Dauerhaft' : 'Behalten'}</button>
        <button type="button" data-sk="einladen" title="Kollegen einladen – sie sehen den Plan und zeichnen gleichzeitig mit">👥 Einladen</button>
        <button type="button" data-sk="pdf" title="Plan mit allen Markierungen als PDF">⤓ PDF</button><button type="button" data-sk="voll" title="Leisten ausblenden – mehr Platz zum Zeichnen (z. B. iPhone quer)">⤢</button><button type="button" data-sk="ende" title="Markieren beenden (die Skizze bleibt gespeichert)">✓ Fertig</button>`;
      if (L._h !== html) { L._h = html; L.innerHTML = html; }   // nur bei Änderung neu zeichnen (Knöpfe bleiben klickbar)
    }
    function skModus() {   // Zeichnen fängt Maus/Finger ab, „Zeigen“ lässt blättern
      const malen = !!SK.id && SK.werkzeug !== 'zeigen';
      S.classList.toggle('bph-malen', malen);
      el.querySelector('.bph-skb').classList.toggle('on', !!SK.id);
    }
    function skZeichnen(seite) {
      const wr = S.querySelector(`.bph-pg[data-seite="${seite}"]`); if (!wr) return;
      const ov = wr.querySelector('.bph-skc'), dpr = Math.min(2, window.devicePixelRatio || 1), W = wr.clientWidth, Hh = wr.clientHeight;
      if (!W || !Hh) return;
      if (ov.width !== Math.round(W * dpr) || ov.height !== Math.round(Hh * dpr)) { ov.width = Math.round(W * dpr); ov.height = Math.round(Hh * dpr); }
      const g = ov.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, Hh);
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
      if (d.art === 'text') { g.font = `bold ${Math.max(10, bw * 4)}px system-ui,sans-serif`; g.textBaseline = 'bottom'; g.fillText(d.text || '', P[0][0], P[0][1]); g.globalAlpha = 1; return; }
      if (d.art === 'rechteck' && P.length > 1) { const [a, b] = [P[0], P[P.length - 1]]; g.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); g.globalAlpha = 1; return; }
      const pts = d.art === 'pfeil' && P.length > 1 ? [P[0], P[P.length - 1]] : P;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); if (pts.length === 1) g.lineTo(pts[0][0] + 0.1, pts[0][1]); g.stroke();
      if (d.art === 'pfeil' && pts.length > 1) { const [a, b] = pts, w = Math.atan2(b[1] - a[1], b[0] - a[0]), L = Math.max(10, bw * 5);
        g.beginPath(); for (const dw of [2.6, -2.6]) { g.moveTo(b[0], b[1]); g.lineTo(b[0] + L * Math.cos(w + dw), b[1] + L * Math.sin(w + dw)); } g.stroke(); }
      g.globalAlpha = 1;
    }
    const alleZeichnen = () => S.querySelectorAll('.bph-pg').forEach((w) => skZeichnen(+w.dataset.seite));
    function skUebernehmen(r) {
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
      catch (e) { if (/gibt es nicht|Keine Einladung/.test(e.message)) { skEnde(true); alert(e.message); } }
    }
    function skLauf() { clearInterval(SK.t); SK.t = setInterval(() => { if (document.visibilityState === 'visible') skAbgleich(); }, 700); }
    async function skStart() {
      if (!roh) return;
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
    function skEnde(still) {
      const warId = SK.id, eigene = SK.striche.some((d) => d.uid === ich());
      if (!still && warId && !SK.dauerhaft && eigene && confirm('Markierungen dauerhaft am Plan behalten?\n\nDann sieht sie jeder wieder, der diesen Plan öffnet – auch in den anderen Apps.')) {
        SKJ(`api/bp/skizze/${warId}/dauerhaft`, 'POST', { an: true }).then(() => skDauerSuchen(tok)).catch((er) => alert(er.message));
      }
      clearInterval(SK.t); if (SK.id) SKJ(`api/bp/skizze/${SK.id}/zeiger`, 'POST', { seite: 0, x: null, y: null }).catch(() => {});
      SK.id = null; SK.striche = []; SK.leute = []; SK.dauerhaft = false; SK.dauer = null; el.classList.remove('bph-voll'); el.querySelector('.bph-skm').hidden = true; skLeiste(); skModus(); skKnopf(); if (!still) { alleZeichnen(); if (warId && items[i] && !items[i].skizze) skDauerSuchen(tok); }
    }
    function skPunkt(e) { const wr = e.target.closest && e.target.closest('.bph-pg'); if (!wr) return null; const r = wr.getBoundingClientRect(); return { wr, seite: +wr.dataset.seite, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
    S.addEventListener('pointerdown', (e) => {
      if (!SK.id || SK.werkzeug === 'zeigen') return;
      const p = skPunkt(e); if (!p) return;
      e.preventDefault();
      if (SK.werkzeug === 'text') {
        const t = prompt('Text auf dem Plan:'); if (!t) return;
        const d = { seite: p.seite, art: 'text', farbe: SK.farbe, breite: SKW.text[2], pts: [[p.x, p.y]], text: t, tmp: true, uid: ich() };
        SK.striche.push(d); skZeichnen(p.seite); SKJ(`api/bp/skizze/${SK.id}/strich`, 'POST', d).then((r) => { d.id = r.id; delete d.tmp; }).catch((er) => alert(er.message)); return;
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
      if (!roh || SK.id) return;
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
      b.innerHTML = n ? `📌 Markiert <small>(${n})</small>` : '✏️ Markieren';
      b.title = n ? 'Dieser Plan hat dauerhafte Markierungen – klicken zum Weitermarkieren' : 'Markieren – auch gemeinsam mit Kollegen gleichzeitig';
    }
    async function markiertesPdf() {   // Plan mit Markierungen, sonst das Original
      const x = items[i], sid = SK.id || SK.dauer;
      if (x.typ === 'pdf' && sid && SK.striche.length) {
        try {
          const r = await fetch(`api/bp/skizze/${sid}/pdf`, { credentials: 'same-origin' });
          if (r.ok) return { b: await r.blob(), name: (x.name || 'Plan.pdf').replace(/\.pdf$/i, '') + ' (markiert).pdf' };
        } catch (e) { /* Original */ }
      }
      const b = await fetch(x.url, { credentials: 'same-origin' }).then((r) => r.blob());
      return { b, name: x.name || (x.typ === 'pdf' ? 'Datei.pdf' : 'Foto.jpg') };
    }
    async function drucken() {
      try {
        const { b } = await markiertesPdf(), u = URL.createObjectURL(b);
        if (items[i].typ !== 'pdf' || /iPhone|iPad|Android/i.test(navigator.userAgent)) { window.open(u, '_blank'); return; }
        const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; f.src = u;
        f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(u, '_blank'); } setTimeout(() => f.remove(), 60000); };
        document.body.appendChild(f);
      } catch (e) { alert(e.message || 'Drucken nicht möglich'); }
    }
    async function skEinladen() {
      let K; try { K = await SKJ('api/bp/kollegen'); } catch (e) { alert(e.message); return; }
      const link = location.origin + location.pathname + '#skizze=' + SK.id;
      const d = document.createElement('div'); d.className = 'bph-dlg-bg'; d.style.zIndex = 6000;
      d.innerHTML = `<div class="bph-dlg" style="max-width:26rem"><div class="bph-dh"><b>Gemeinsam markieren</b><button type="button" class="bph-x" data-kx>×</button></div><div class="bph-db">
        <p class="bph-mu">Wer eingeladen ist, bekommt in der Bauplattform einen Hinweis und sieht den Plan mit allen Markierungen – Striche und Zeiger erscheinen bei allen gleichzeitig.</p>
        <div class="bph-skk">${K.map((k) => `<label class="bph-ck"><input type="checkbox" value="${k.id}"> ${esc(k.name)} ${k.online ? '<small style="color:#2f9e5a">● angemeldet</small>' : ''}</label>`).join('') || '<p class="bph-mu">Keine weiteren Benutzer.</p>'}</div>
        <div class="bph-row"><button type="button" class="bph-btn pri" data-ko>Einladen</button><button type="button" class="bph-btn" data-kl>Link kopieren</button></div>
        <p class="bph-mu" data-km></p></div></div>`;
      el.appendChild(d);
      d.addEventListener('click', async (e) => {
        if (e.target === d || e.target.closest('[data-kx]')) return d.remove();
        if (e.target.closest('[data-kl]')) { try { await navigator.clipboard.writeText(link); d.querySelector('[data-km]').textContent = 'Link kopiert – z. B. in Teams einfügen. Er funktioniert für angemeldete Kollegen.'; } catch { prompt('Link:', link); } return; }
        if (e.target.closest('[data-ko]')) {
          const an = [...d.querySelectorAll('input:checked')].map((x) => +x.value); if (!an.length) return;
          try { await SKJ(`api/bp/skizze/${SK.id}/einladen`, 'POST', { an }); d.remove(); if (window.toast) toast('Eingeladen – sobald sie mitmachen, siehst du ihre Zeiger.'); } catch (er) { d.querySelector('[data-km]').textContent = er.message; }
        }
      });
    }
    async function skPdf() {
      try {
        const r = await fetch(`api/bp/skizze/${SK.id}/pdf`, { credentials: 'same-origin' });
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Fehler ' + r.status); }
        const b = await r.blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (items[i].name || 'Plan.pdf').replace(/\.pdf$/i, '') + ' (markiert).pdf'; document.body.appendChild(a); a.click(); a.remove();
      } catch (e) { alert(e.message); }
    }
    el.querySelector('.bph-skl').addEventListener('click', async (e) => {
      const w = e.target.closest('[data-skw]'); if (w) { SK.werkzeug = w.dataset.skw; if (w.dataset.skw !== 'zeigen') SK.letztes = w.dataset.skw; skLeiste(); skModus(); return; }
      const b = e.target.closest('[data-sk]'); if (!b) return;
      const a = b.dataset.sk;
      if (a === 'zurueck') { await SKJ(`api/bp/skizze/${SK.id}/loeschen`, 'POST', { was: 'letzter' }).catch((er) => alert(er.message)); return skAbgleich(); }
      if (a === 'alle') { if (!confirm(SK.owner === ich() ? 'Alle Markierungen auf diesem Plan löschen – auch die der anderen?' : 'Alle deine Markierungen löschen?')) return; await SKJ(`api/bp/skizze/${SK.id}/loeschen`, 'POST', { was: 'alle' }).catch((er) => alert(er.message)); return skAbgleich(); }
      if (a === 'einladen') return skEinladen();
      if (a === 'pdf') return skPdf();
      if (a === 'dauer') { const an = !SK.dauerhaft; if (!an && !confirm('Markierungen nicht mehr dauerhaft am Plan zeigen?')) return; await SKJ(`api/bp/skizze/${SK.id}/dauerhaft`, 'POST', { an }).catch((er) => alert(er.message)); return skAbgleich(); }
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
    function setZoom(d) {
      zoom = Math.max(0.5, Math.min(4, zoom * (d > 0 ? 1.4 : 1 / 1.4)));
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
    const key = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); else return; e.preventDefault(); e.stopPropagation(); };
    function close(ohneZurueck) {
      if (!gv) return; tok++; skEnde(true); el.remove(); document.removeEventListener('keydown', key, true); removeEventListener('popstate', pop); gv = null;
      if (!ohneZurueck && history.state && history.state.bphGv) history.back();
    }
    const pop = () => close(true);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gv]'); if (!b) { if (e.target === S && !SK.id) close(); return; }
      const a = b.dataset.gv; if (a === 'sk') { if (SK.id) { el.querySelector('.bph-skl').hidden = !el.querySelector('.bph-skl').hidden; } else skStart(); return; } if (a === 'x') close(); else if (a === 'prev') go(-1); else if (a === 'next') go(1); else if (a === 'zp') setZoom(1); else if (a === 'zm') setZoom(-1); else if (a === 'dl') teilen(); else if (a === 'dr') drucken();
    });
    let tx = null, ty = 0;   // Wischen links/rechts blättert (nur ohne Vergrößerung)
    S.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } else tx = null; }, { passive: true });
    S.addEventListener('touchend', (e) => {
      if (tx == null || zoom !== 1 || (SK.id && SK.werkzeug !== 'zeigen')) return; const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    });
    S.addEventListener('dblclick', () => { if (!SK.id || SK.werkzeug === 'zeigen') setZoom(zoom === 1 ? 1 : -1); });
    document.addEventListener('keydown', key, true);
    history.pushState({ bphGv: 1 }, ''); addEventListener('popstate', pop);   // Zurück-Geste schließt die Ansicht
    gv = { close };
    show();
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || a.hasAttribute('download') || a.dataset.ansehen === 'nein') return;
    const typ = typVon(a); if (!typ) return;
    e.preventDefault();
    const scope = a.closest('[data-galerie]') || document, seen = new Set(), items = [];
    let start = 0;
    scope.querySelectorAll('a[href]').forEach((x) => {
      const t = typVon(x); if (!t || x.dataset.ansehen === 'nein' || x.hasAttribute('download')) return;
      const url = x.getAttribute('href'); if (seen.has(url)) { if (x === a) start = items.findIndex((y) => y.url === url); return; }
      seen.add(url); if (x === a) start = items.length;
      const img = x.querySelector('img');
      items.push({ url, typ: t, name: x.dataset.name || x.title || (img && img.alt) || x.textContent.trim() || '' });
    });
    H.ansehen(items, start);
  }, true);

  /* Einladungen zum gemeinsamen Markieren: in jeder App ein Hinweis unten rechts; Link #skizze=<id> öffnet direkt */
  const skGezeigt = new Set();
  function skHinweis(e) {
    if (skGezeigt.has(e.id) || document.querySelector('.bph-ski')) return; skGezeigt.add(e.id);
    const d = document.createElement('div'); d.className = 'bph-ski'; d.setAttribute('role', 'alert');
    d.innerHTML = `<b>👥 ${esc(e.von)}</b> möchte mit dir <b>„${esc(e.name)}“</b> gemeinsam ansehen und markieren.<div class="bph-row"><button type="button" class="bph-btn pri" data-ja>Mitmachen</button><button type="button" class="bph-btn" data-nein>Später</button></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-ja]')) { d.remove(); H.ansehen([{ url: `api/bp/skizze/${e.skizze}/datei`, typ: 'pdf', name: e.name, skizze: e.skizze }]); }
      else if (ev.target.closest('[data-nein]')) { d.remove(); KX('api/bp/skizze-einladungen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: e.id }) }).catch(() => {}); }
    });
  }
  H.skizzeOeffnen = (id, name) => H.ansehen([{ url: `api/bp/skizze/${id}/datei`, typ: 'pdf', name: name || 'Gemeinsame Skizze', skizze: id }]);
  function skWache() {
    const m = /#skizze=([\w-]+)/.exec(location.hash);
    if (m) { history.replaceState(null, '', location.pathname + location.search); setTimeout(() => H.skizzeOeffnen(m[1]), 300); }
    const pr = () => { if (document.visibilityState !== 'visible' || gv) return; KX('api/bp/skizze-einladungen').then((l) => { if (l && l[0]) skHinweis(l[0]); }).catch(() => {}); };
    setTimeout(pr, 2500); setInterval(pr, 15000);
  }
  H.setProject = function (p) {
    if (!band) return;
    const box = band.querySelector('.bph-proj');
    box.querySelector('small').textContent = (p && p.sub) || '';
    box.querySelector('span').textContent = (p && p.title) || '';
    box.title = (p ? [p.sub, p.title].filter(Boolean).join(' – ') + ' · ' : '') + 'Klick: Projekt wählen';
  };
  H.onKi = function (fn) { listeners.push(fn); };
  H.provider = () => prov(H.ki);
  H.appUrl = appUrl;
})();
