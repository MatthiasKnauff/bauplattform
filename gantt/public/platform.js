'use strict';
/* =====================================================================
   Bauplattform-Anbindung des Bauzeitenplans
   - Anmeldung: Antwortet der Server mit 401, geht es zur Anmeldeseite der Plattform (gemeinsame Anmeldung).
   - App-Umschalter oben rechts (Bautagebuch, Startseite, Verwaltung), Benutzername, Abmelden.
   - Farbschema und Akzentfarbe des Benutzers von der Startseite (Darstellung), gelten für alle Apps.
   - Mehrbenutzer: Herzschlag alle 10 s – zeigt, wer den Plan noch geöffnet hat, und lädt neue Stände
     anderer Benutzer automatisch, solange hier nichts ungespeichert ist.
   - Verknüpfung des Plans mit einem Projekt des Bautagebuchs.
   Benötigt app.js (P, api, modal, toast, reloadProject, dirty, saveTimer …).
   ===================================================================== */
(function () {
  const BP = window.BP = { me: null, conf: null, others: [] };
  const $ = (s) => document.querySelector(s);
  const escH = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const appUrl = (a) => a.url || `${location.protocol}//${location.hostname}:${a.port}`;

  /* ---- 401 → Anmeldeseite ---- */
  const origFetch = window.fetch.bind(window);
  let leaving = false;
  window.fetch = async (...args) => {
    const r = await origFetch(...args);
    const u = String(args[0] && args[0].url ? args[0].url : args[0]);
    if (r.status === 401 && u.startsWith('api/') && !leaving) {
      leaving = true;
      const d = await r.clone().json().catch(() => ({}));
      location.href = d.login ? d.login.replace(/next=[^&]*/, 'next=' + encodeURIComponent(location.href)) : '/';
    }
    return r;
  };

  /* ---- Akzentfarbe ---- */
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.max(0, Math.min(255, Math.round(x * f))));
    return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  function applyAccent(c) {
    if (!/^#[0-9a-f]{6}$/i.test(c || '')) return;
    const n = parseInt(c.slice(1), 16), lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    let st = $('#bpAccent'); if (!st) { st = document.createElement('style'); st.id = 'bpAccent'; document.head.appendChild(st); }
    const dark = lum > 0.82 ? shade(c, 0.75) : c;   // sehr helle Farben (Weiß) bleiben auf hellem Grund lesbar
    st.textContent = `html[data-theme="dunkel"]{--green:${c};--green-d:${shade(c, 0.85)};--accent:${c};--top-ic:${c};--bp-accent:${c};--bp-on:${lum > 0.55 ? '#111' : '#fff'}}
html[data-theme="hell"]{--green:${dark};--green-d:${shade(dark, 0.85)};--accent:${dark};--top-ic:${dark};--bp-accent:${dark};--bp-on:#fff}
html[data-theme="dunkel"] .btn.primary{color:${lum > 0.55 ? '#111' : '#fff'}}`;
  }

  /* ---- Kopfleiste: Verknüpfung, „auch im Plan“, App-Umschalter ---- */
  const ICON_APPS = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="4" height="4" rx="1"/><rect x="10" y="4" width="4" height="4" rx="1"/><rect x="16" y="4" width="4" height="4" rx="1"/><rect x="4" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="16" y="10" width="4" height="4" rx="1"/><rect x="4" y="16" width="4" height="4" rx="1"/><rect x="10" y="16" width="4" height="4" rx="1"/><rect x="16" y="16" width="4" height="4" rx="1"/></svg>';
  const ICON_LINK = '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  function mountBar() {
    const tb = $('#topbar'); if (!tb || $('#bpLink')) return;
    // gemeinsame Kopfleiste der Bauplattform über der Leiste des Bauzeitenplans (App-Umschalter, KI, Abmelden)
    if (window.BPHead) {
      BPHead.mount({ app: 'gantt', name: 'Bauzeitenplan', parent: $('#app'), before: tb });
      BPHead.ready.then(() => window.bpApplyKi && window.bpApplyKi());
      BPHead.onKi(() => window.bpApplyKi && window.bpApplyKi());
      const logo = tb.querySelector('.logo'); if (logo) logo.style.display = 'none';
    }
    const fill = tb.querySelector('.tb-fill');
    const link = document.createElement('button'); link.className = 'bp-chip'; link.id = 'bpLink'; link.hidden = true;
    link.onclick = linkDialog;
    const pres = document.createElement('span'); pres.className = 'bp-pres'; pres.id = 'bpPres'; pres.hidden = true;
    fill.after(link, pres);
  }
  /* KI-Auswahl der Kopfleiste auf den Positionsvorschlag übertragen (Intern = eingebauter Vorschlag) */
  window.bpApplyKi = function () {
    const S = window.AI_SETTINGS; if (!S || !window.BPHead || S.mode === 'off') return;
    const k = BPHead.ki, pv = BPHead.provider();
    if (k === 'intern' || !pv.ok) { S.mode = 'builtin'; S.provider = ''; }
    else { S.mode = 'ai'; S.hasKey = true; S.provider = k; }
    if (window.AssistCore && AssistCore.notifySoon) AssistCore.notifySoon();
  };
  function toggleMenu(force) {
    let m = $('#bpMenu');
    if (m && force !== true) { m.remove(); return; }
    if (m) m.remove();
    if (!BP.conf) return;
    m = document.createElement('div'); m.id = 'bpMenu'; m.className = 'bp-menu';
    const apps = BP.conf.apps.filter((a) => a.allowed && a.key !== 'gantt');
    m.innerHTML = `<div class="bp-who">Angemeldet: <b>${escH(BP.me ? BP.me.name : '')}</b></div>`
      + apps.map((a) => `<a href="${escH(appUrl(a))}">${escH(a.name)}</a>`).join('')
      + (typeof P !== 'undefined' && P ? `<div class="bp-sep"></div><button data-bp="link">${ICON_LINK}Mit Bautagebuch-Projekt verknüpfen …</button>` : '')
      + '<div class="bp-sep"></div><button data-bp="logout">Abmelden</button>';
    m.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-bp]'); if (!b) return;
      m.remove();
      if (b.dataset.bp === 'logout') {
        if (typeof flushSave === 'function') await flushSave().catch(() => {});
        const r = await origFetch('api/logout', { method: 'POST' }).then((x) => x.json()).catch(() => ({}));
        leaving = true; location.href = r.login || '/';
      } else linkDialog();
    });
    document.body.appendChild(m);
  }
  document.addEventListener('click', (e) => { const m = $('#bpMenu'); if (m && !m.contains(e.target)) m.remove(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const m = $('#bpMenu'); if (m) m.remove(); } });

  function showLink() {
    const el = $('#bpLink'); if (!el) return;
    const p = typeof P !== 'undefined' && P ? P : null, bt = p ? p._bt : null;
    el.hidden = !p;
    if (window.BPHead && bt && bt.id && BPHead.projektSetzen && window.bpHalten !== p.id) BPHead.projektSetzen(bt.id);   // gilt dann auch in den anderen Apps
    if (window.BPHead) BPHead.setProject(p ? { sub: bt ? 'Bautagebuch-Projekt: ' + bt.name + (bt.address ? ' · ' + bt.address : '') : 'Bauzeitenplan', title: p.name } : { sub: '', title: '' });
    if (!p) return;
    if (bt) { el.innerHTML = ICON_LINK + '<span>' + escH(bt.name) + '</span>'; el.title = `Verknüpft mit dem Bautagebuch-Projekt „${bt.name}“${bt.address ? ' (' + bt.address + ')' : ''} – klicken zum Ändern`; }
    else { el.innerHTML = ICON_LINK + '<span>Mit Projekt verknüpfen</span>'; el.title = 'Plan mit einem Projekt des Bautagebuchs verknüpfen'; }
  }
  function showPresence() {
    const el = $('#bpPres'); if (!el) return;
    const o = BP.others || [];
    el.hidden = !o.length;
    el.textContent = o.length ? (o.length === 1 ? `${o[0]} arbeitet auch im Plan` : `Auch im Plan: ${o.join(', ')}`) : '';
    el.title = o.length ? 'Gleichzeitiges Arbeiten ist möglich: Änderungen der anderen werden automatisch übernommen, solange du selbst gerade nichts Ungespeichertes hast.' : '';
  }

  async function linkDialog() {
    if (typeof P === 'undefined' || !P) return;
    let list = [];
    try { list = await fetch('api/bt-projects').then(j); } catch (e) { toast('Projekte des Bautagebuchs konnten nicht geladen werden: ' + e.message, true); return; }
    const cur = P._bt ? P._bt.id : '';
    const opts = '<option value="">– keine Verknüpfung –</option>' + list.map((x) => `<option value="${x.id}"${x.id === cur ? ' selected' : ''}>${escH(x.name)}${x.address ? ' – ' + escH(x.address) : ''}${x.archived ? ' (archiviert)' : ''}${x.plan && x.plan !== P.id ? ' · hat schon einen Plan' : ''}</option>`).join('');
    modal('Mit Bautagebuch-Projekt verknüpfen', `<div style="max-width:480px;line-height:1.5">
        <p style="margin-top:0">Der Plan gehört dann zum Projekt im Bautagebuch. Wer dort als zuständiger Bauleiter eingetragen ist, sieht auch den Plan; ohne Eintrag sehen ihn alle.</p>
        <select id="bpLinkSel" style="width:100%;padding:5px">${opts}</select>
        ${list.length ? '' : '<p style="color:var(--mut)">Im Bautagebuch gibt es noch keine Projekte.</p>'}</div>`, [
      { label: 'Abbrechen' },
      { label: 'Übernehmen', cls: 'primary', primary: true, fn: (bg) => {
        const v = bg.querySelector('#bpLinkSel').value;
        fetch(`api/projects/${P.id}/link`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: v ? +v : null }) }).then(j)
          .then((r) => { P._bt = r._bt; P._rev = r._rev; showLink(); toast(r._bt ? `Verknüpft mit „${r._bt.name}“.` : 'Verknüpfung gelöst.'); })
          .catch((e) => toast('Verknüpfen fehlgeschlagen: ' + e.message, true));
      } }]);
  }

  /* ---- Herzschlag: wer ist im Plan, gibt es einen neueren Stand? ---- */
  let lastPid = null, busy = false;
  async function beat() {
    if (busy || document.hidden) return;
    const p = typeof P !== 'undefined' ? P : null;
    if (!p) { BP.others = []; showPresence(); showLink(); return; }
    if (lastPid && lastPid !== p.id) origFetch(`api/projects/${lastPid}/presence`, { method: 'DELETE' }).catch(() => {});
    lastPid = p.id;
    busy = true;
    try {
      const r = await origFetch(`api/projects/${p.id}/presence`, { method: 'POST' }).then((x) => x.json());
      if (typeof P === 'undefined' || !P || P.id !== p.id || r.error) return;
      BP.others = r.others || []; showPresence(); showLink();
      const pending = (typeof dirty !== 'undefined' && dirty) || (typeof saveTimer !== 'undefined' && saveTimer) || (typeof conflictOpen !== 'undefined' && conflictOpen);
      if (r.rev && P._rev && r.rev > P._rev && !pending && !document.querySelector('.modal-bg')) {
        await reloadProject(`Plan aktualisiert – Änderungen von ${r.by || 'einem anderen Benutzer'} übernommen.`);
      }
    } catch { /* nächster Versuch */ } finally { busy = false; }
  }
  setInterval(beat, 10000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
  addEventListener('pagehide', () => { if (lastPid) origFetch(`api/projects/${lastPid}/presence`, { method: 'DELETE', keepalive: true }).catch(() => {}); });

  /* ---- Start ---- */
  async function init() {
    mountBar();
    try { BP.conf = await origFetch('api/platform').then((r) => r.json()); } catch { BP.conf = { apps: [] }; }
    try {
      const r = await origFetch('api/me');
      if (r.ok) {
        BP.me = await r.json(); applyAccent(BP.me.accent || '#ff5fb3');   // ohne eigene Farbe: Standard des Bautagebuchs
        // Farbschema von der Startseite (Darstellung) – gilt für alle Apps; nur neu zeichnen, wenn es sich geändert hat
        if (window.Theme && BP.me.theme && window.Theme.get() !== BP.me.theme) { window.Theme.set(BP.me.theme); if (typeof renderAfterTheme === 'function') renderAfterTheme(); }
      }
    } catch { /* Anmeldung prüft fetch() oben */ }
    setTimeout(beat, 1500);
    // Verknüpfung nach jedem Öffnen eines Plans anzeigen
    let seen = null;
    setInterval(() => { const id = typeof P !== 'undefined' && P ? P.id + ':' + P.name + ':' + (P._bt ? P._bt.id : '') : null; if (id !== seen) { seen = id; showLink(); if (P) beat(); } }, 700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
