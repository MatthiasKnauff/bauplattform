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
    aufgaben: SV('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    baukosten: SV('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h6"/>'),
    admin: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>'),
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
      + (apps.length ? apps.map((a) => `<a role="menuitem" href="${esc(appUrl(a))}/"${a.key === H.app ? ' class="cur" aria-current="page"' : ''}>${IC[a.key === 'portal' ? 'home' : a.key] || IC.home}<span>${esc(a.key === 'portal' ? 'Startseite' : a.name)}</span></a>`).join('')
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
      if (typeof window.applyLook === 'function') window.applyLook(H.me); else lookDirty = true;
      (redraw || lookMenu)();
      try { localStorage.setItem('bpTheme', r.theme); if (r.accent) localStorage.setItem('accent', r.accent); } catch { /* egal */ }
    } catch (e) { alert('Darstellung konnte nicht gespeichert werden: ' + e.message); }
  }
  H.look = lookMenu;
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
      <div class="bph-proj"><small></small><span></span></div><span class="bph-fill"></span>
      <div class="bph-ki" role="group" aria-label="KI-Auswahl"></div>
      <button type="button" class="bph-kim" aria-haspopup="menu" aria-label="KI wählen"></button>
      <button type="button" class="bph-ic bph-appsb" aria-haspopup="menu" aria-label="Apps" title="Apps">${IC.grid}</button>
      <button type="button" class="bph-ic bph-gear" aria-haspopup="dialog" aria-label="Einstellungen" title="Einstellungen">${IC.gear}</button>
      <button type="button" class="bph-who" aria-haspopup="menu" aria-label="Mein Konto"><span class="bph-av">?</span><span class="bph-nm"></span></button>`;
    const parent = opt.parent || document.body;
    parent.insertBefore(band, opt.before || parent.firstChild);
    renderKi();
    band.addEventListener('click', (e) => {
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
      H.projekt = pj && pj.id ? pj : null;
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
      renderKi();
      return H;
    })();
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
  const KX = (u, o = {}) => fetch(u, { credentials: 'same-origin', ...o }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || 'Fehler ' + r.status); return j; });
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
          <h4>Mängel- und Terminrügen versenden</h4><p class="bph-mu">Vorauswahl im Dialog der Rüge – dort lässt sie sich jedes Mal ändern.</p>
          ${seg('versand', [['pdf', 'nur PDF'], ['mich', 'per E-Mail an mich'], ['firma', 'direkt an die Firma']])}
          <label class="bph-ck"><input type="checkbox" data-kchk="kopie"${K.kopie ? ' checked' : ''}> bei „direkt an die Firma“ eine Kopie an mich</label>
          <h4>Kalender</h4><label class="bph-ck"><input type="checkbox" data-kchk="kalender"${K.kalender ? ' checked' : ''}> eigene und verschobene Erinnerungen automatisch als Termin an mich senden (Outlook & Co.: annehmen trägt ihn in den Kalender ein)</label>
          <p class="bph-mu">Einzelne Erinnerungen, Fristen und Termine lassen sich außerdem jederzeit mit 📅 als Termin schicken.</p>
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
  H.verlaufKnopf = (bereich, label) => `<button type="button" class="bph-btn bph-vbtn" data-bph-verlauf="${esc(bereich)}" title="Frühere Stände ansehen und wiederherstellen">↶ ${esc(label || 'Verlauf')}</button>`;
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-bph-verlauf]'); if (b) { e.preventDefault(); H.verlauf({ bereich: b.dataset.bphVerlauf, nach: H.nachVerlauf || window.bpNachVerlauf }); } });

  H.verlaufAlle = async function (opt = {}) {
    let root = opt.into, D = null, C = null, f = { teil: opt.teil || '', wer: '', q: '' }, msg = '';
    if (!root) {   // als Fenster (z. B. Adressen → Änderungsverlauf)
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Änderungsverlauf"><div class="bph-dh"><b>${esc(opt.titel || 'Änderungsverlauf')}</b><button type="button" class="bph-x" aria-label="Schließen">×</button></div><div class="bph-db"></div></div>`;
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
    ['allgemein', 'KI und Kostendatenbanken', 'Anbieter, Schlüssel, eigene Server'],
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
      kopf(); B.innerHTML = ''; B.scrollTop = 0;
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
      nav([['karten', 'Übersicht'], ['vorlagen', 'E-Mail-Vorlagen'], ['verlauf', 'Änderungsverlauf']]);
      if (teil === 'vorlagen') { const host = document.createElement('div'); B.appendChild(host); H.konto({ into: host, tab: 'vorlagen', nurVorlagen: true }); return; }
      if (teil === 'verlauf') { const host = document.createElement('div'); B.appendChild(host); H.verlaufAlle({ into: host }); return; }
      const adm = sortApps().find((a) => a.key === 'admin');
      B.innerHTML = '<p class="bph-mu">Gilt für alle im Büro. Öffnet die Verwaltung an der passenden Stelle.</p><div class="bph-cards">'
        + BUERO.map(([k, l, t]) => `<a class="bph-card" href="${adm ? esc(appUrl(adm)) + '/#einstellungen' + (k === 'allgemein' ? '' : '-' + k) : '#'}"><b>${esc(l)}</b><small>${esc(t)}</small></a>`).join('')
        + (adm ? `<a class="bph-card" href="${esc(appUrl(adm))}/"><b>Verwaltung</b><small>Projekte, Benutzer & Rechte, Angemeldet, System</small></a>` : '') + '</div>';
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

  /* ---------- aktuelles Projekt: gilt in allen Apps (wer die App wechselt, bleibt im selben Projekt) ---------- */
  H.projektSetzen = async function (id) {
    id = id ? +id : null;
    if ((H.projekt && H.projekt.id) === id) return H.projekt;
    try {
      const r = await fetch('api/bp/projekt', { method: 'PUT', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then((x) => x.json());
      H.projekt = r && r.id ? r : null;
    } catch { /* nicht schlimm */ }
    return H.projekt;
  };
  H.projektId = () => (H.projekt && H.projekt.id) || null;
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

  H.setProject = function (p) {
    if (!band) return;
    const box = band.querySelector('.bph-proj');
    box.querySelector('small').textContent = (p && p.sub) || '';
    box.querySelector('span').textContent = (p && p.title) || '';
    box.title = p ? [p.sub, p.title].filter(Boolean).join(' – ') : '';
  };
  H.onKi = function (fn) { listeners.push(fn); };
  H.provider = () => prov(H.ki);
  H.appUrl = appUrl;
})();
