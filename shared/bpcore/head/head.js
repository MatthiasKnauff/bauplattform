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
    baukosten: SV('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h6"/>'),
    admin: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>'),
    out: SV('<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>'),
    look: SV('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 3a9 9 0 0 1 0 18"/>'),
  };
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
      + apps.map((a) => `<a role="menuitem" href="${esc(appUrl(a))}/"${a.key === H.app ? ' class="cur" aria-current="page"' : ''}>${IC[a.key === 'portal' ? 'home' : a.key] || IC.home}${esc(a.key === 'portal' ? 'Startseite' : a.name)}</a>`).join('')
      + '<div class="bph-sep"></div>'
      + `<button type="button" role="menuitem" data-look>${IC.look}Darstellung (Farben)</button>`
      + `<button type="button" role="menuitem" data-out>${IC.out}Abmelden</button>`;
    band.appendChild(m);
  }
  /* Darstellung: Farbschema und Akzentfarbe des Benutzers – kleines Fenster direkt an der Kopfleiste, gilt in allen Apps */
  const THEMES = [['dunkel', 'Dunkel'], ['hell', 'Hell'], ['auto', 'Automatisch'], ['klassisch', 'Klassisch Grün']];
  const ACCENTS = [['#ff5fb3', 'Pink'], ['#ffd200', 'Gelb'], ['#ff9a2e', 'Orange'], ['#ff6b5e', 'Rot'], ['#3ddc84', 'Grün'], ['#2fd6c9', 'Türkis'], ['#4da3ff', 'Blau'], ['#b18cff', 'Violett'], ['#f3f3f1', 'Weiß']];
  let lookDirty = false;
  function lookMenu() {
    band.querySelectorAll('.bph-menu').forEach((x) => x.remove());
    const me = H.me || {}, t = me.theme || 'dunkel', a = String(me.accent || ACCENTS[0][0]).toLowerCase();
    const m = document.createElement('div'); m.className = 'bph-menu bph-look'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Darstellung');
    m.innerHTML = `<div class="bph-info"><b>Darstellung</b> – gilt für dich in allen Apps</div>
      <div class="bph-lk">${THEMES.map(([k, n]) => `<button type="button" class="bph-th${k === t ? ' on' : ''}" data-th="${k}">${esc(n)}</button>`).join('')}</div>
      <div class="bph-sw">${ACCENTS.map(([c, n]) => `<button type="button" class="${c === a ? 'on' : ''}" style="background:${c}" data-acc="${c}" title="${n}" aria-label="${n}"></button>`).join('')}
        <label class="${ACCENTS.some((x) => x[0] === a) ? '' : 'on'}" title="Eigene Farbe"><input type="color" value="${esc(a)}" data-accc></label></div>`;
    band.appendChild(m);
    m.addEventListener('click', (e) => {
      e.stopPropagation();
      const th = e.target.closest('[data-th]'), ac = e.target.closest('[data-acc]');
      if (th) saveLook({ theme: th.dataset.th }); else if (ac) saveLook({ accent: ac.dataset.acc });
    });
    m.querySelector('[data-accc]').addEventListener('change', (e) => saveLook({ accent: e.target.value }));
  }
  async function saveLook(d) {
    try {
      const r = await fetch('api/bp/darstellung', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      H.me = Object.assign(H.me || {}, { theme: r.theme, accent: r.accent });
      if (typeof window.applyLook === 'function') { window.applyLook(H.me); lookMenu(); } else { lookDirty = true; lookMenu(); }
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
      <button type="button" class="bph-who" aria-haspopup="menu" aria-label="Benutzer und Apps"><span class="bph-av">?</span><span class="bph-nm"></span></button>`;
    const parent = opt.parent || document.body;
    parent.insertBefore(band, opt.before || parent.firstChild);
    renderKi();
    band.addEventListener('click', (e) => {
      const k = e.target.closest('[data-ki]');
      if (k) { e.preventDefault(); closeMenus(); setKi(k.dataset.ki); return; }
      if (e.target.closest('[data-out]')) { logout(); return; }
      if (e.target.closest('[data-look]')) { e.stopPropagation(); lookMenu(); return; }
      if (e.target.closest('.bph-kim')) { e.stopPropagation(); if (band.querySelector('.bph-menu')) closeMenus(); else kiMenu(); return; }
      if (e.target.closest('.bph-who')) { e.stopPropagation(); if (band.querySelector('.bph-menu')) closeMenus(); else userMenu(); }
    });
    document.addEventListener('click', (e) => { if (band && !band.contains(e.target)) closeMenus(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
    if (opt.project) H.setProject(opt.project);
    H.ready = (async () => {
      const [conf, me, ki] = await Promise.all([getJ('api/platform').catch(() => ({ apps: [] })), opt.me ? Promise.resolve(opt.me) : getJ('api/me').catch(() => null), getJ('api/bp/ki').catch(() => null)]);
      H.conf = conf; H.me = me && me.ok !== false ? me : null;
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
