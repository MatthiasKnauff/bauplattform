'use strict';
/* =====================================================================
   Bauplattform-Anbindung des Bauzeitenplans
   - Anmeldung: Antwortet der Server mit 401, geht es zur Anmeldeseite der Plattform (gemeinsame Anmeldung).
   - App-Umschalter oben rechts (Bautagebuch, Startseite, Verwaltung), Benutzername, Abmelden.
   - Farbschema und Akzentfarbe des Benutzers von der Startseite (Darstellung), gelten für alle Apps.
   - Mehrbenutzer: Herzschlag alle 10 s – zeigt, wer den Plan noch geöffnet hat, und lädt neue Stände
     anderer Benutzer automatisch, solange hier nichts ungespeichert ist.
   - Verknüpfung des Plans mit einem Projekt des Bautagebuchs.
   Benötigt gantt-*.js (P, api, modal, toast, reloadProject, dirty, saveTimer …).
   ===================================================================== */
(function () {
  const BP = window.BP = { me: null, conf: null, others: [] };
  const $ = (s) => document.querySelector(s);
  const escH = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const appUrl = (a) => BPHead.appUrl(a);   // Adresse einer App: ein Baustein (bp.js/head.js – kennt Proxy und Port), keine eigene Kopie

  /* ---- Terminrüge zu einer Leistung: öffnet „Aufgaben & Mängel“ mit dem Rückstand laut Arbeitsfortschritt ---- */
  BP.terminruege = (uid) => {
    const a = ((BP.conf || {}).apps || []).find((x) => x.key === 'aufgaben' && x.allowed);
    if (!a) { if (window.toast) toast('Für „Aufgaben & Mängel“ ist dein Konto nicht freigeschaltet.', true); return; }
    window.open(appUrl(a) + '/#termine&gid=' + encodeURIComponent(P.id) + '&uid=' + uid, 'bp-aufgaben');
  };
  BP.kannRuege = () => ((BP.conf || {}).apps || []).some((x) => x.key === 'aufgaben' && x.allowed);

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

  /* ---- Akzentfarbe: auf die Farbvariablen des Bauzeitenplans (--green, --accent …) übertragen; shade() aus gantt-kern.js ---- */
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
  const ICON_LINK = '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  function mountBar() {
    const tb = $('#topbar'); if (!tb || $('#bpLink')) return;
    // gemeinsame Kopfleiste der Bauplattform über der Leiste des Bauzeitenplans (App-Umschalter, KI, Abmelden)
    if (window.BPHead) {
      BPHead.mount({ app: 'gantt', name: 'Bauzeitenplan', parent: $('#app'), before: tb });
      if (BPHead.beiProjektWahl) BPHead.beiProjektWahl(async (id) => {   // Projekt in der Kopfleiste gewählt: dessen Bauzeitenplan öffnen
        let l = []; try { l = await fetch('api/projects').then((r) => r.json()); } catch { /* egal */ }
        const plan = (l || []).find((x) => x.bt_id === id && !x.archived) || (l || []).find((x) => x.bt_id === id);
        if (plan && typeof openProject === 'function') { await openProject(plan.id); if (typeof refreshProjectList === 'function') refreshProjectList(); }
        else if (typeof keinPlanFuer === 'function') keinPlanFuer();
      });
      const logo = tb.querySelector('.logo'); if (logo) logo.style.display = 'none';
    }
    const link = document.createElement('button'); link.className = 'bp-chip'; link.id = 'bpLink'; link.hidden = true;
    link.onclick = linkDialog;
    const pres = document.createElement('span'); pres.className = 'bp-pres'; pres.id = 'bpPres'; pres.hidden = true;
    // die Leiste über den Reitern entfällt: alles rechts in die Reiterzeile (neben die Suche)
    const r = document.createElement('span'); r.className = 'tb-r';
    const st = document.createElement('span'); st.id = 'saveState'; st.title = 'Es wird automatisch gespeichert. Zwischenstände: 🕘 Verlauf in der Versionsleiste';
    r.append(pres, link, ...[...tb.querySelectorAll('.ticon')], st);
    ($('#tabs') || tb).appendChild(r);
  }

  function showLink() {
    const el = $('#bpLink'); if (!el) return;
    const p = typeof P !== 'undefined' && P ? P : null, bt = p ? p._bt : null;
    el.hidden = !p || !!(p && p._bt);   // verknüpft: das Projekt steht oben im Kopf
    if (window.BPHead && bt && bt.id && BPHead.projektSetzen) BPHead.projektSetzen(bt.id);   // gilt dann auch in den anderen Apps
    if (window.BPHead && p && !bt) BPHead.setProject({ title: p.name, sub: 'Bauzeitenplan ohne Projekt – rechts „Mit Projekt verknüpfen“' });   // sonst zeigt die Kopfleiste das Projekt
    if (!p) return;
    if (bt) { el.innerHTML = ICON_LINK + '<span>' + escH(bt.name) + '</span>'; el.title = `Verknüpft mit dem Projekt „${bt.name}“${bt.address ? ' (' + bt.address + ')' : ''} – klicken zum Ändern`; }
    else { el.innerHTML = ICON_LINK + '<span>Mit Projekt verknüpfen</span>'; el.title = 'Plan mit einem Projekt des Bautagebuchs verknüpfen'; }
  }
  function showPresence() {
    const el = $('#bpPres'); if (!el) return;
    const o = BP.others || [];
    el.hidden = !o.length;
    el.textContent = o.length ? (o.length === 1 ? `${o[0]} arbeitet auch im Plan` : `Auch im Plan: ${o.join(', ')}`) : '';
    el.title = o.length ? 'Gleichzeitiges Arbeiten ist möglich: Änderungen der anderen werden automatisch übernommen, solange du selbst gerade nichts Ungespeichertes hast.' : '';
  }

  window.bpLinkDialog = () => linkDialog();
  /* Reiter „Planung“ und „Fragen und Antworten“ ohne verknüpftes Projekt (18.11.2026): die Planung liegt im Projekt – hier verknüpfen, danach bietet
     der Planungsassistent die Angaben dieses Plans zur Übernahme an */
  window.bpOhneProjekt = (titel) => `<p><b>${escH(titel)}</b> gehört zum Projekt – dieser Bauzeitenplan ist mit keinem Projekt verknüpft.</p>
    <p>${typeof P !== 'undefined' && P && P.assist && P.assist.type ? 'Die Angaben, mit denen dieser Plan erzeugt wurde, sind nicht verloren: nach dem Verknüpfen bietet die Planung sie zur Übernahme an.' : 'Nach dem Verknüpfen stehen hier die Angaben des Projekts.'}</p>
    <p><button type="button" class="btn primary" data-bplink>Mit Projekt verknüpfen …</button></p>`;
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-bplink]')) linkDialog(); });
  async function linkDialog() {
    if (typeof P === 'undefined' || !P) return;
    let list = [];
    try { list = await fetch('api/bt-projects').then(j); } catch (e) { toast('Projekte des Bautagebuchs konnten nicht geladen werden: ' + e.message, true); return; }
    const cur = P._bt ? P._bt.id : '';
    const opts = '<option value="">– keine Verknüpfung –</option>' + list.map((x) => `<option value="${x.id}"${x.id === cur ? ' selected' : ''}>${escH(x.name)}${x.address ? ' – ' + escH(x.address) : ''}${x.archived ? ' (archiviert)' : ''}${x.plan && x.plan !== P.id ? ' · hat schon einen Plan' : ''}</option>`).join('');
    modal('Mit Projekt verknüpfen', `<div style="max-width:480px;line-height:1.5">
        <p style="margin-top:0">Der Plan gehört dann zu diesem Projekt. Wer dort als zuständiger Bauleiter:in eingetragen ist, sieht auch den Plan; ohne Eintrag sehen ihn alle.</p>
        <select id="bpLinkSel" style="width:100%;padding:5px">${opts}</select>
        ${list.length ? '' : '<p style="color:var(--mut)">Im Bautagebuch gibt es noch keine Projekte.</p>'}</div>`, [
      { label: 'Abbrechen' },
      { label: 'Übernehmen', cls: 'primary', primary: true, fn: (bg) => {
        const v = bg.querySelector('#bpLinkSel').value;
        fetch(`api/projects/${P.id}/link`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: v ? +v : null }) }).then(j)
          .then((r) => { P._bt = r._bt; P._rev = r._rev; showLink(); if (window.refreshProjectList) refreshProjectList(); toast(r._bt ? `Verknüpft mit „${r._bt.name}“.` : 'Verknüpfung gelöst.'); if (r._bt) dispatchEvent(new CustomEvent('bp:verknuepft')); })
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
        await reloadProject(`Plan aktualisiert – Änderungen von ${r.by || 'einem anderen Benutzer:innen'} übernommen.`);
      }
    } catch { /* nächster Versuch */ } finally { busy = false; }
  }
  setInterval(beat, 10000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
  addEventListener('pagehide', () => { if (lastPid) origFetch(`api/projects/${lastPid}/presence`, { method: 'DELETE', keepalive: true }).catch(() => {}); });

  /* ---- Start ---- */
  async function init() {
    mountBar();
    const H = window.BPHead && BPHead.ready ? await BPHead.ready.then(() => BPHead, () => null) : null;   // die Kopfleiste hat Plattform und Person schon geholt
    if (H && H.conf && H.conf.apps) BP.conf = H.conf; else try { BP.conf = await origFetch('api/platform').then((r) => r.json()); } catch { BP.conf = { apps: [] }; }
    try {
      const r = H && H.me ? { ok: true, json: async () => H.me } : await origFetch('api/me');
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
