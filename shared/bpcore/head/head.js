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
  { const quelle = (document.currentScript && document.currentScript.src) || 'bp/head.js', basis = quelle.replace(/[?#].*$/, '').replace(/[^/]*$/, ''),
      vq = window.BP_V || ((quelle.match(/[?&]v=\w+/) || [''])[0].replace('&', '?'));   // Stand (bpcore/tempo.py) – nachgeladene Bausteine dürfen im Browser bleiben
    window.BP_HEAD_BASIS = [basis, vq];   // für Bausteine, die erst bei Bedarf geladen werden (hilfeseite.js)
    /* nachgeladene Bausteine jeder App: eigene Auswahllisten (wahl), Datumsauswahl statt Systemkalender (datum), Neuigkeiten (neu),
       ✍ Unterschreiben in der PDF-Vorschau, „＋ Neu“-Leiste, Live-Aktualisierung (BPHead.live), Dokumente ablegen (BPHead.ablage),
       Versanddialog (BPHead.versand), Urlaubsanträge (antrag) */
    ['wahl', 'datum', 'neu', 'unterschrift', 'neuleiste', 'live', 'ablegen', 'versand', 'antrag'].forEach((n) => { const x = document.createElement('script'); x.src = basis + n + '.js' + vq; document.head.appendChild(x); });
    if (window.top === window && !document.querySelector('link[rel="manifest"]')) {   // App-Beschreibung: das Bauportal lässt sich in Edge/Chrome als App installieren (eigenes Fenster ohne Adressleiste)
      const m = document.createElement('link'); m.rel = 'manifest'; m.href = basis + 'manifest.webmanifest'; document.head.appendChild(m); } }
  const H = window.BPHead = { me: null, conf: null, ki: 'intern', providers: [], app: '', ready: null };
  H._liveQ = []; H.live = (...a) => { H._liveQ.push(a); };   // bis live.js geladen ist: Anmeldungen merken
  /* Warte-Hinweis für alles, was der Benutzer gerade angestoßen hat (Klick/Taste) und länger braucht – in jeder App derselbe:
     nach 0,4 s erscheint unten in der Mitte, WAS gerade läuft („Texterkennung läuft …“, „PDF wird erstellt …“), nach 3 s mit der
     Dauer. Der Text wird aus der Adresse der Anfrage abgelesen (Liste WAS) – oder ausdrücklich gesetzt: BPHead.warten(promise, 'Text').
     Hintergrund-Abfragen zählen nicht. */
  {
    const WAS = [   // [Muster der Adresse, Text, nur beim Senden (POST/PUT)?] – der erste Treffer gilt
      [/\/(auslesen|lesen|beleg|belege\/\d+\/(pruefen|positionen)|lvdok\/\d+\/lesen|eingang\/verarbeiten)\b|angebot-pdf|nachtrag\/lesen|tabelle\/lesen/, 'Texterkennung läuft – das Dokument wird gelesen', true],
      [/\/ki\b|\/ai\b|langtext|assist|vorschlag\/ki/, 'Die KI arbeitet', false],
      [/\/import\b|orca|uebernehmen|gaeb/, 'Import läuft', true],
      [/\/(druck|pdf)\b|\.pdf\b|paket|export/, 'Das PDF wird erstellt', false],
      [/nachricht|\/mail\b|senden|vorgang/, 'Wird gesendet', true],
      [/ablage|eingang|projektordner|\/store\b/, 'Der Dateiserver antwortet', false],
      [/wetter|weather|\/gps\b|\/geo\b/, 'Das Wetter wird geladen', false],
      [/suche|search/, 'Suche läuft', false],
    ];
    const was = (u, o) => { const adr = String((u && u.url) || u || '').split('?')[0], m = String((o && o.method) || (u && u.method) || 'GET').toUpperCase(), senden = m !== 'GET';
      for (const [re, t, nurSenden] of WAS) if ((!nurSenden || senden) && re.test(adr)) return t;
      return senden && o && window.FormData && o.body instanceof FormData ? 'Die Datei wird hochgeladen' : m === 'PUT' || m === 'PATCH' ? 'Wird gespeichert' : m === 'DELETE' ? 'Wird gelöscht' : ''; };
    let tUser = 0, tm = 0, tick = 0, el = null, nr = 0, seit = 0;
    const laufend = new Map();   // Nummer → Text der Anfragen, auf die gerade gewartet wird
    const merk = () => { tUser = Date.now(); };
    ['pointerdown', 'keydown', 'change', 'drop'].forEach((e) => window.addEventListener(e, merk, true));
    const text = () => { const t = [...laufend.values()].filter(Boolean).pop() || 'Einen Moment', s = Math.round((Date.now() - seit) / 1000); return t + ' …' + (s >= 3 ? ` <small>${s} s</small>` : ''); };
    const ABBR = new Map();   // Nummer → AbortController der Anfragen, die man abbrechen kann
    const wt = () => el && el.querySelector('.bph-wt'), knopf = () => { const b = el && el.querySelector('.bph-wab'); if (b) b.hidden = !ABBR.size; };
    const zeig = () => { if (!laufend.size) return; if (!el) { el = document.createElement('div'); el.className = 'bph-warten'; el.setAttribute('role', 'status');
        el.innerHTML = '<span class="bph-wsp"></span><span class="bph-wt"></span><button type="button" class="bph-wab" title="Warten beenden – die Seite wartet nicht mehr auf das Ergebnis">Abbrechen</button>';
        el.querySelector('.bph-wab').addEventListener('click', () => { const n = ABBR.size; ABBR.forEach((c) => { try { c.abort(); } catch { /* egal */ } }); ABBR.clear(); if (n && window.toast) toast('Abgebrochen.'); }); }
      wt().innerHTML = text(); knopf(); if (!el.isConnected) document.body.appendChild(el);
      if (!tick) tick = setInterval(() => { if (el && el.isConnected) wt().innerHTML = text(); }, 1000); };
    const fertig = (n) => { laufend.delete(n); ABBR.delete(n); if (!laufend.size) { clearTimeout(tm); clearInterval(tick); tm = tick = 0; if (el) el.remove(); } else if (el && el.isConnected) { wt().innerHTML = text(); knopf(); } };
    H.warten = (p, t, ab) => { const n = ++nr; if (!laufend.size) seit = Date.now(); laufend.set(n, t || ''); if (ab) ABBR.set(n, ab); if (el && el.isConnected) { wt().innerHTML = text(); knopf(); } else if (!tm) tm = setTimeout(() => { tm = 0; zeig(); }, 400);
      return Promise.resolve(p).finally(() => fertig(n)); };   // auch für eigene lange Schritte: BPHead.warten(promise, 'Was gerade läuft'[, AbortController])
    const f0 = window.fetch && window.fetch.bind(window);
    if (f0) window.fetch = function (u, o) {
      if (Date.now() - tUser >= 1200) return f0(u, o);
      let ab = null;   // vom Benutzer ausgelöst: abbrechbar machen (eigenes Signal, falls die App keins mitgibt)
      if (!(o && o.signal) && !(u && u.signal) && window.AbortController) { ab = new AbortController(); o = { ...(o || {}), signal: ab.signal }; }
      return H.warten(f0(u, o), was(u, o), ab);
    };
  }
  /* Eigene Abfragefenster statt der Browser-Dialoge (alert/confirm/prompt) – in allen Apps gleich:
     await bpFrage(text, { ok, gefahr }) → true/false · await bpEingabe(text, vorgabe) → Text oder null · bpHinweis(text) */
  const DLG = (text, art, vorgabe, opt = {}) => new Promise((fertig) => {
    const esc2 = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-frage'; bg.style.zIndex = 9000;
    const zeilen = String(text || '').split('\n');
    bg.innerHTML = `<div class="bph-dlg" role="alertdialog" aria-modal="true" style="width:min(${opt.drei ? 560 : 460}px,94vw)"><div class="bph-db" style="padding-top:1.1rem">
      <p style="margin:0 0 .8rem;font-weight:600;line-height:1.4">${esc2(zeilen[0])}</p>${zeilen.slice(1).join('\n').trim() ? `<p class="bph-mu" style="margin:-.4rem 0 .8rem;white-space:pre-line">${esc2(zeilen.slice(1).join('\n').trim())}</p>` : ''}
      ${art === 'eingabe' ? `<input class="bph-frage-in" value="${esc2(vorgabe ?? '')}" style="width:100%;box-sizing:border-box;margin-bottom:.8rem">` : ''}
      <div class="bph-row" style="justify-content:flex-end;gap:.4rem">${art === 'hinweis' ? '' : `<button type="button" class="bph-btn" data-f="nein">${esc2(opt.abbrechen || 'Abbrechen')}</button>`}${opt.drei ? `<button type="button" class="bph-btn" data-f="drei">${esc2(opt.drei)}</button>` : ''}<button type="button" class="bph-btn pri${opt.gefahr ? ' bph-gefahr' : ''}" data-f="ja">${esc2(opt.ok || 'OK')}</button></div></div></div>`;
    document.body.appendChild(bg);
    const inp = bg.querySelector('.bph-frage-in');
    const zu = (ja) => { bg.remove(); window.removeEventListener('keydown', taste, true); fertig(art === 'eingabe' ? (ja ? inp.value : null) : art === 'frage' ? (ja === 'drei' ? 'drei' : !!ja) : undefined); };
    const taste = (e) => { if (!bg.isConnected) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zu(false); } else if (e.key === 'Enter' && !(e.target && e.target.tagName === 'TEXTAREA')) { e.preventDefault(); e.stopPropagation(); zu(true); } };
    window.addEventListener('keydown', taste, true);   // vor allen anderen Tastenkürzeln der Seite
    bg.addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) zu(b.dataset.f === 'ja' ? true : b.dataset.f === 'drei' ? 'drei' : false);; });
    setTimeout(() => { if (inp) { inp.focus(); inp.select(); } else bg.querySelector('[data-f="ja"]').focus(); }, 0);
  });
  window.bpFrage = (t, o) => DLG(t, 'frage', null, o);
  window.bpEingabe = (t, v, o) => DLG(t, 'eingabe', v, o);
  window.bpHinweis = (t) => DLG(t, 'hinweis');
  window.alert = (t) => { DLG(t, 'hinweis'); };   // nicht mehr blockierend – überall gleich aussehend
  /* Für Bug-Meldungen (🐞): die letzten Fehler, fehlgeschlagenen Anfragen und Klicks dieser Seite – bleibt im Browser, bis jemand meldet */
  const BUGP = { fehler: [], anfragen: [], klicks: [] };
  function bugPuffer(art, x) { const L = BUGP[art]; L.push({ t: new Date().toTimeString().slice(0, 8), ...x }); if (L.length > 25) L.shift(); }
  {
    const roh = window.fetch.bind(window);
    window.fetch = async (url, opt) => {
      const u = String(url && url.url ? url.url : url).replace(/([?&](token|key|pw|passwort|kennwort)=)[^&]*/gi, '$1…').slice(0, 300), m = (opt && opt.method) || 'GET';
      try {
        const r = await roh(url, opt);
        if (!r.ok && !/api\/bp\/(fehler|bug)/.test(u)) r.clone().text().then((t) => { let x = t; try { const j = JSON.parse(t); x = j.error || j.message || t; } catch { /* Text */ } bugPuffer('anfragen', { methode: m, url: u, status: r.status, text: String(x).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300) }); }).catch(() => {});
        return r;
      } catch (e) { bugPuffer('anfragen', { methode: m, url: u, status: 'keine Verbindung', text: String(e && e.message || e).slice(0, 200) }); throw e; }
    };
    document.addEventListener('click', (e) => {
      const el = e.target && e.target.closest ? e.target.closest('button,a,[role=button],[data-tab],[data-a],[data-m],summary,label,td,li,input,select') : null; if (!el || el.closest('.bph-bugdlg,.bph-hlp,[data-bug]')) return;
      const feld = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);   // bei Feldern nie den Inhalt, nur die Bezeichnung
      const txt = (el.getAttribute('aria-label') || el.getAttribute('title') || (feld ? el.getAttribute('placeholder') || el.name || el.type : el.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      const ds = Object.entries(el.dataset || {}).slice(0, 3).map(([k, v]) => `${k}=${String(v).slice(0, 30)}`).join(' ');
      bugPuffer('klicks', { was: `${el.tagName.toLowerCase()}${txt ? ' „' + txt + '“' : ''}${ds ? ' [' + ds + ']' : ''} ${location.hash}`.trim() });
    }, true);
  }
  { // Fehler im Browser an die Verwaltung melden (System → Fehlermeldungen) – höchstens 10 je Seite, gleiche nur einmal
    const gemeldet = new Set();
    const melden = (meldung, stack) => {
      meldung = String(meldung || '').slice(0, 600); if (meldung) bugPuffer('fehler', { m: meldung, s: String(stack || '').slice(0, 1500) });
      if (!meldung || gemeldet.has(meldung) || gemeldet.size >= 10) return;
      if (/ResizeObserver loop|Script error\.?$|NetworkError|Failed to fetch|Load failed|AbortError/i.test(meldung)) return;   // harmlos bzw. Verbindung
      gemeldet.add(meldung);
      try { fetch('api/bp/fehler', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ app: H.app || document.title, meldung, stack: String(stack || '').slice(0, 6000), pfad: location.pathname + location.hash }) }).catch(() => {}); } catch { /* egal */ }
    };
    window.addEventListener('error', (e) => { if (e && e.message) melden(e.message, (e.error && e.error.stack) || `${e.filename || ''}:${e.lineno || ''}:${e.colno || ''}`); });
    window.addEventListener('unhandledrejection', (e) => { const r = e && e.reason; if (r && (r.status || r.data)) return; melden(r && r.message ? r.message : String(r), r && r.stack); });   // API-Fehlermeldungen (400/403 …) sind keine Systemfehler
  }
  const listeners = [];
  const hatBT = () => !H.conf || !(H.conf.apps || []).length || (H.conf.apps || []).some((a) => a.key === 'bautagebuch');   // Bautagebuch im Büro vorhanden (Standort-Funktionen)
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
    zeiten: SV('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9 2h6"/>'),
    bauantrag: SV('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13l2 2 4-4"/><path d="M9 18h6"/>'),
    waermeschutz: SV('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/><path d="M2.5 14.5h3M18.5 14.5h3M2.5 17.5h3M18.5 17.5h3"/>'),
    wiki: SV('<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3"/><path d="M8 7h7M8 10.5h5"/>'),
    akquise: SV('<path d="M4 7h16v12H4z"/><path d="M9 7V5h6v2"/><path d="M4 12h16"/><path d="M11 12v2h2v-2"/>'),
    honorar: SV('<path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2"/><path d="M15.5 11.5a3 3 0 1 0 0 5"/><path d="M11 13h4M11 15h4"/>'),
    baudaten: SV('<path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
    ava: SV('<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M8 10h8M8 13h8M8 16h5"/><path d="M14.5 17.5l1.5 1.5 3-3"/>'),
    aufgaben: SV('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    baukosten: SV('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h6"/>'),
    admin: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>'),
    papierkorb: SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>'),
    out: SV('<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>'),
    look: SV('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 3a9 9 0 0 1 0 18"/>'),
    konto: SV('<path d="M4 19c3-1 4-6 6-6s1 5 3 5 2-3 3-3 2 2 4 2"/><path d="M4 22h16"/>'),
    bug: SV('<path d="M8 8a4 4 0 0 1 8 0"/><rect x="7" y="8" width="10" height="12" rx="5"/><path d="M12 12v8M3 13h4M17 13h4M4 7l3 2M20 7l-3 2M4 19l3-2M20 19l-3-2"/>'),
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
  H.kiSetzen = setKi; H.kiImmer = false;
  H.kiImmerSetzen = async function (v) {
    H.kiImmer = !!v;
    try { await fetch('api/bp/darstellung', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ki_immer: H.kiImmer }) }); } catch { /* egal */ }
  };
  /* KI wählen: an der Stelle, an der eine KI gebraucht wird – mit „immer diese verwenden“. Liefert den Schlüssel oder null.
     opt: { text, hinweis, bild (nur KI, die Bilder liest), knopf } */
  /* Aufmerksamkeit: roter Rahmen blinkt kurz, bis im Bereich (bis) zum ersten Mal geklickt oder getippt wird (höchstens ms) */
  H.achtung = function (el, opt = {}) {
    if (!el) return; const bis = opt.bis || el, ms = opt.ms || 6000;
    el.classList.remove('bph-achtung'); void el.offsetWidth; el.classList.add('bph-achtung');
    let t = 0; const weg = () => { clearTimeout(t); el.classList.remove('bph-achtung'); ['pointerdown', 'keydown', 'change'].forEach((e) => bis.removeEventListener(e, weg, true)); };
    ['pointerdown', 'keydown', 'change'].forEach((e) => bis.addEventListener(e, weg, true)); t = setTimeout(weg, ms);
  };
  H.kiFragen = function (opt = {}) {
    const P = (H.providers || []).filter((p) => p.ok && p.key !== 'intern' && (!opt.bild || p.bild));
    if (!P.length) return Promise.resolve(null);
    const vor = (P.find((p) => p.key === H.ki) || P.find((p) => p.key === 'ollama') || P[0]).key;
    if (H.kiImmer && P.some((p) => p.key === H.ki)) return Promise.resolve(H.ki);
    return new Promise((fertig) => {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="KI wählen" style="width:min(520px,96vw)"><div class="bph-dh"><b>${esc(opt.titel || 'Mit KI lesen?')}</b><button type="button" class="bph-x" data-kx aria-label="Schließen">✕</button></div><div class="bph-db">
        ${opt.text ? `<p style="margin:.2rem 0 .5rem">${opt.text}</p>` : ''}<p class="bph-mu" style="margin:0 0 .6rem">${opt.hinweis || 'Der Text des Dokuments geht an die gewählte KI. Das Ergebnis kommt als Vorschlag – übernommen wird erst nach deiner Bestätigung.'}</p>
        <div class="bph-kiw">${P.map((p) => `<label><input type="radio" name="bphKi" value="${p.key}"${p.key === vor ? ' checked' : ''}><span><b>${esc(p.label)}</b>${p.hint ? `<small>${esc(p.hint)}</small>` : ''}</span></label>`).join('')}</div>
        <label class="bph-ck" style="margin-top:.7rem"><input type="checkbox" data-kimmer> Immer diese KI verwenden, nicht mehr fragen <small class="bph-mu">(änderbar unter ⚙ → Persönlich → KI)</small></label>
        <div class="bph-row" style="justify-content:flex-end;margin-top:.8rem"><button type="button" class="bph-btn" data-kx>Nein, danke</button><button type="button" class="bph-btn pri" data-kok>${esc(opt.knopf || 'Mit KI lesen')}</button></div></div></div>`;
      document.body.appendChild(bg);
      const zu = (k) => { bg.remove(); fertig(k); };
      bg.addEventListener('click', async (e) => {
        if (e.target.closest('[data-kx]')) return zu(null);   // daneben klicken schließt nicht
        if (!e.target.closest('[data-kok]')) return;
        const k = (bg.querySelector('[name=bphKi]:checked') || {}).value || null;
        if (k && k !== H.ki) await setKi(k);   // die gewählte KI ist danach vorgewählt (gilt für den Server-Auftrag)
        if (k && bg.querySelector('[data-kimmer]').checked) await H.kiImmerSetzen(true);
        zu(k);
      });
    });
  };
  /* Ziehbare Trennung zwischen zwei Spalten eines Grids (wie in der AVA): sichtbarer Anfasser in der Mitte, Breite je Browser gemerkt,
     Doppelklick = Standard. Bei einspaltigem Layout (schmales Fenster) unsichtbar. H.trennGriff(grid, { key, min: 200, max: 0.6 }) */
  H.trennGriff = function (grid, o = {}) {
    if (!grid || grid.querySelector(':scope > .bph-trenn')) return;
    const LK = 'bph.trenn.' + (o.key || 'x'), min = o.min || 200, maxA = o.max || 0.65;
    const g = document.createElement('div'); g.className = 'bph-trenn'; g.title = 'Breite ziehen (Doppelklick: Standard)'; g.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(grid).position === 'static') grid.style.position = 'relative';
    grid.appendChild(g);
    const spalten = () => [...grid.children].filter((x) => x !== g && getComputedStyle(x).display !== 'none' && getComputedStyle(x).position !== 'absolute')
      .sort((p, q) => p.getBoundingClientRect().left - q.getBoundingClientRect().left);   // sichtbare Reihenfolge (CSS „order“)
    const ab = o.ab || 1100;   // darunter stapelt die Seite einspaltig – dann keine feste Breite (sonst bliebe sie zweispaltig)
    let breite = 0;
    const setz = (w) => { breite = w || 0; lage(); };
    const lage = () => {   // feste Breite nur, solange zwei Spalten sichtbar sind – ist eine ausgeblendet (z. B. Seitenleiste „hidden“), gilt wieder das CSS der Seite
      const n = spalten().length, soll = breite && innerWidth >= ab && n >= 2 ? `${Math.round(breite)}px minmax(0,1fr)` : '';
      if (grid.style.gridTemplateColumns !== soll) grid.style.gridTemplateColumns = soll;
      const c = spalten(), tr = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean);
      if (c.length < 2 || tr.length < 2 || innerWidth < ab) { g.hidden = true; return; }
      g.hidden = false; const gr = grid.getBoundingClientRect(), a = c[0].getBoundingClientRect(), b = c[1].getBoundingClientRect();
      g.style.left = ((a.right + Math.max(a.right, b.left)) / 2 - gr.left - 6) + 'px';
    };
    let w0 = 0; try { w0 = +localStorage.getItem(LK) || 0; } catch { /* egal */ }
    if (w0) setz(w0);
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; e.preventDefault(); g.setPointerCapture(e.pointerId); document.body.classList.add('bph-trennzieh');
      const gr = grid.getBoundingClientRect();
      g.onpointermove = (m) => setz(Math.max(min, Math.min(gr.width * maxA, m.clientX - gr.left)));
      g.onpointerup = () => { g.onpointermove = null; document.body.classList.remove('bph-trennzieh');
        try { localStorage.setItem(LK, String(Math.round(breite))); } catch { /* egal */ } };
    });
    g.addEventListener('dblclick', () => { setz(0); try { localStorage.removeItem(LK); } catch { /* egal */ } });
    const ro = new ResizeObserver(lage); ro.observe(grid); [...grid.children].forEach((x) => x !== g && ro.observe(x));   // auch Ein-/Ausblenden einer Spalte addEventListener('resize', () => setz(breite)); setTimeout(lage, 0);
    return g;
  };

  /* Grids mit data-bph-trenn="schlüssel" (optional data-bph-trenn-min / -max) bekommen den Anfasser von selbst – auch nach Neuzeichnen */
  {
    let t = 0;
    const such = () => { t = 0; document.querySelectorAll('[data-bph-trenn]').forEach((el) => { if (el.querySelector(':scope > .bph-trenn')) return;
      H.trennGriff(el, { key: el.dataset.bphTrenn, min: +el.dataset.bphTrennMin || 200, max: +el.dataset.bphTrennMax || 0.65, ab: +el.dataset.bphTrennAb || 0 }); }); };
    const los = () => { such(); new MutationObserver(() => { if (!t) t = requestAnimationFrame(such); }).observe(document.body, { childList: true, subtree: true }); };
    if (document.body) los(); else document.addEventListener('DOMContentLoaded', los);
  }

  /* Layout-Editor der Verwaltung als großes Fenster über der App (kein neues Browserfenster) */
  H.layoutEditor = function (adminUrl, bereich, zu, neu) {   // neu(): nach jedem Speichern im Editor (Vorschau dahinter sofort neu)
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Druck-Layout bearbeiten" style="width:min(1500px,97vw);height:94vh;max-height:none;display:flex;flex-direction:column;resize:both;overflow:hidden;min-width:min(720px,97vw);min-height:420px">
      <div class="bph-dh"><b>Druck-Layout bearbeiten</b><span class="bph-mu" style="font-size:.8rem;margin-left:.6rem">wird laufend gespeichert</span><span style="flex:1"></span><button type="button" class="bph-btn" data-lw title="Den Editor in einem eigenen Browserfenster öffnen – z. B. auf dem zweiten Bildschirm">⧉ Eigenes Fenster</button><button type="button" class="bph-btn pri" data-lx style="margin-left:.4rem">Fertig</button></div>
      <iframe title="Druck-Layout" src="${esc(adminUrl)}/layout?einbetten=1#${encodeURIComponent(bereich)}" style="flex:1;border:0;width:100%;background:var(--bph-card,#fff)"></iframe></div>`;
    document.body.appendChild(bg); try { dlgBeweglich(bg.querySelector('.bph-dlg')); } catch { /* egal */ }
    let nt = 0; const gesp = (e) => { if (!bg.isConnected) { removeEventListener('message', gesp); return; } if (neu && e.data && e.data.bph === 'layoutGespeichert' && e.source === bg.querySelector('iframe').contentWindow) { clearTimeout(nt); nt = setTimeout(neu, 300); } }; addEventListener('message', gesp);
    bg.addEventListener('click', async (e) => {   // daneben klicken schließt nicht
      if (e.target.closest('[data-lw]')) {   // auf Wunsch: eigenes Browserfenster (zweiter Bildschirm)
        try { const w = bg.querySelector('iframe').contentWindow; if (w && w.layoutSichern) await w.layoutSichern(); } catch { /* anderer Ursprung */ }
        const f = window.open(`${adminUrl}/layout#${encodeURIComponent(bereich)}`, 'bp-layout', `popup,width=${Math.min(1600, screen.availWidth - 40)},height=${Math.min(1000, screen.availHeight - 60)}`);
        if (!f) { bpHinweis('Der Browser hat das neue Fenster blockiert – bitte Pop-ups für das Bauportal erlauben.'); return; }
        bg.remove(); if (zu) zu(); return;
      }
      if (!e.target.closest('[data-lx]')) return;
      try { const w = bg.querySelector('iframe').contentWindow; if (w && w.layoutSichern) await w.layoutSichern(); } catch { /* anderer Ursprung – speichert selbst beim Schließen */ }
      bg.remove(); if (zu) zu();
    });
  };
  /* Die eingebettete Verwaltung (Verwaltung → Einstellungen) läuft bei Apps auf eigenen Ports in einem anderen Ursprung und kann das Fenster nicht selbst
     über der Seite öffnen – sie schickt eine Nachricht; nur aus unserer Verwaltung angenommen */
  addEventListener('message', (e) => {
    const d = e.data; if (!d || d.bph !== 'layoutEditor' || typeof d.bereich !== 'string') return;
    const a = ((H.conf || {}).apps || []).find((x) => x.key === 'admin'); if (!a) return;
    const url = appUrl(a);
    try { if (new URL(url, location.href).origin !== e.origin) return; } catch { return; }
    H.layoutEditor(url, d.bereich.slice(0, 60), () => { try { e.source.postMessage({ bph: 'layoutEditorZu' }, e.origin); } catch { /* Rahmen schon weg */ } });
  });
  /* Druckdialog für alle Apps: Layout des Ausdrucks wählen (Verwaltung → Einstellungen → Druck-Layouts, je Ausdruck mehrere) und seine Inhaltseinstellungen
     (z. B. Langtexte, Preise) – gespeichert im Layout, hier für diesen Ausdruck änderbar. Die letzte Wahl je Ausdruck wird gemerkt.
     Ergebnis: { layout, opt, qs } (qs = „&layout=…&opt=…“ zum Anhängen an die PDF-Adresse) oder null (abgebrochen).
     Gibt es nur ein Layout und keine Einstellungen, kommt ohne Dialog sofort { layout, opt: {}, qs }. */
  H.druckWahl = function (bereich, o = {}) {
    return new Promise(async (fertig) => {
      let W; try { W = await KX('api/bp/layouts/' + encodeURIComponent(bereich) + '/wahl'); } catch { fertig({ layout: '', opt: {}, qs: '' }); return; }
      const LK = 'bph.druck.' + bereich; let mem = {}; try { mem = JSON.parse(localStorage.getItem(LK) || '{}'); } catch { /* egal */ }
      let vid = W.layouts.some((l) => l.id === mem.layout) ? mem.layout : (W.layouts.find((l) => l.id === W.vorgabe) || W.layouts[0] || {}).id || '';
      const qs = (v, opt) => `&layout=${encodeURIComponent(v)}${opt && Object.keys(opt).length ? '&opt=' + encodeURIComponent(JSON.stringify(opt)) : ''}`;
      if (W.layouts.length <= 1 && !W.optionen.length) { fertig({ layout: vid, opt: {}, qs: qs(vid) }); return; }
      const adm = ((H.conf || {}).apps || []).find((a) => a.key === 'admin' && a.allowed) && H.me && H.me.is_admin;
      const werte = () => ({ ...(W.werte[vid] || {}), ...((mem.layout === vid && mem.opt) || {}) });
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      const zeichne = () => {
        const w = werte();
        bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Drucken" style="width:min(480px,96vw)"><div class="bph-dh"><b>${esc(o.titel || W.name)} drucken</b><button type="button" class="bph-x" data-dx aria-label="Schließen">✕</button></div>
          <label class="bph-dl" style="display:flex;flex-direction:column;gap:.25rem;font-weight:600">Layout<select data-dlay style="font-weight:400">${W.layouts.map((l) => `<option value="${esc(l.id)}"${l.id === vid ? ' selected' : ''}>${esc(l.name)} · ${esc(l.format)}${l.id === W.vorgabe ? ' (Vorgabe)' : ''}</option>`).join('')}</select></label>
          ${W.optionen.length ? `<div style="display:grid;gap:.45rem;margin:.8rem 0 .2rem">${W.optionen.map((x) => x.typ === 'bool'
            ? `<label class="bph-ck"><input type="checkbox" data-dopt="${esc(x.key)}"${w[x.key] ? ' checked' : ''}> ${esc(x.name)}</label>`
            : `<label style="display:flex;flex-direction:column;gap:.2rem">${esc(x.name)}<select data-dopt="${esc(x.key)}">${x.wahl.map(([k, l]) => `<option value="${esc(k)}"${String(w[x.key]) === String(k) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>` : ''}
          <p class="bph-mu" style="margin:.6rem 0 0;font-size:.82rem">Die Einstellungen sind im Layout hinterlegt und gelten hier nur für diesen Ausdruck. Layouts anlegen und gestalten: Verwaltung → Einstellungen → Druck-Layouts.</p>
          <div class="bph-row" style="justify-content:flex-end;gap:.4rem;margin-top:.9rem">${adm ? '<button type="button" class="bph-btn" data-dedit style="margin-right:auto">Layout bearbeiten …</button>' : ''}<button type="button" class="bph-btn" data-dx>Abbrechen</button><button type="button" class="bph-btn pri" data-dok>${esc(o.knopf || 'Drucken / PDF')}</button></div></div>`;
      };
      zeichne(); document.body.appendChild(bg);
      const lesen = () => Object.fromEntries([...bg.querySelectorAll('[data-dopt]')].map((i) => [i.dataset.dopt, i.type === 'checkbox' ? i.checked : i.value]));
      bg.addEventListener('change', (e) => { if (e.target.matches('[data-dlay]')) { vid = e.target.value; zeichne(); } });
      bg.addEventListener('click', (e) => {   // daneben klicken schließt nicht
        if (e.target.closest('[data-dx]')) { bg.remove(); fertig(null); return; }
        if (e.target.closest('[data-dedit]')) { const a = ((H.conf || {}).apps || []).find((x) => x.key === 'admin'); if (a) { bg.remove(); H.layoutEditor(appUrl(a), bereich, () => H.druckWahl(bereich, o).then(fertig)); } return; }   // Editor im Fenster, danach Druckdialog mit den neuen Layouts
        if (!e.target.closest('[data-dok]')) return;
        const opt = lesen(); try { localStorage.setItem(LK, JSON.stringify({ layout: vid, opt })); } catch { /* egal */ }
        bg.remove(); fertig({ layout: vid, opt, qs: qs(vid, opt) });
      });
    });
  };
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
  function hilfeMenu() {   // ? – Hilfe, Neuigkeiten, Frage/Live-Hilfe, Fehler melden in einem Knopf (Kopfleiste kompakt, 13.11.2026)
    closeMenus();
    const q = band.querySelector('.bph-hlp'), neu = q && q.classList.contains('neu'), hn = band.querySelector('.bph-hn'), n = hn && !hn.hidden ? hn.textContent : '';
    const m = document.createElement('div'); m.className = 'bph-menu'; m.setAttribute('role', 'menu');
    m.innerHTML = `<button type="button" role="menuitem" data-hm="hilfe"><span class="bph-mi">📖</span>Hilfe zu dieser App</button>`
      + `<button type="button" role="menuitem" data-hm="neu"><span class="bph-mi">✨</span>Was ist neu${neu ? ' <small class="bph-ms">neu für dich</small>' : ''}</button>`
      + `<button type="button" role="menuitem" data-hm="frage"><span class="bph-mi">💬</span>Frage stellen · Live-Hilfe${n ? ` <small class="bph-ms">${esc(n)} Antwort${n === '1' ? '' : 'en'}</small>` : ''}</button>`
      + `<button type="button" role="menuitem" data-hm="wiki"><span class="bph-mi">💡</span>Erkenntnis fürs Wiki <small class="bph-ms">was wir gelernt haben – mit Projekt und Stelle</small></button>`
      + `<button type="button" role="menuitem" data-bug>${IC.bug}Fehler melden <small class="bph-ms">kurz beschreiben, gern mit Bildschirmfoto</small></button>`;
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
      + `<div class="bph-mode bph-mode-m" role="group" aria-label="Ansicht"><button type="button" data-modus="einfach">Basic</button><button type="button" data-modus="profi">Profi</button></div>`
      + '<div class="bph-sep"></div>'
      + `<button type="button" role="menuitem" data-out>${IC.out}Abmelden</button>`;
    void apps; void portal;
    band.appendChild(m);
  }
  /* ▦ Apps: alle Apps als Kacheln – in jeder App gleich; die Verwaltung gibt es nur hier */
  function sortApps() {
    const apps = ((H.conf || {}).apps || []).filter((a) => a.allowed && !a.teil);   // teil: Seite einer anderen App (Kommunikation → Aufgaben & Post)
    const rank = (a) => (a.key === 'portal' ? -1 : a.key === 'admin' ? 99 : 0);
    return apps.slice().sort((a, b) => rank(a) - rank(b));
  }
  function appsMenu() {
    closeMenus();
    const m = document.createElement('div'); m.className = 'bph-menu bph-apps'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', 'Apps');
    const apps = sortApps();
    m.innerHTML = '<div class="bph-info">Apps' + (H.projekt && H.projekt.id ? ` <small>· Projekt <b>${esc(H.projekt.name)}</b> bleibt gewählt</small>` : '') + '</div><div class="bph-tiles">'
      + (apps.length ? apps.map((a) => `<a role="menuitem" data-af="${esc(a.key)}" href="${esc(appUrl(a))}/"${a.key === H.app || a.key === ((H.conf.apps.find((x) => x.key === H.app) || {}).teil) ? ' class="cur" aria-current="page"' : ''}>${IC[a.key === 'portal' ? 'home' : a.key] || IC.home}<span>${esc(a.key === 'portal' ? 'Startseite' : a.name)}</span><i class="bph-neutab" title="In neuem Tab öffnen" aria-label="In neuem Tab öffnen"></i></a>`).join('')
          + (() => { const pt = apps.find((a) => a.key === 'portal'); return pt ? `<a role="menuitem" data-af="papierkorb" href="${esc(appUrl(pt))}/papierkorb"${H.app === 'papierkorb' ? ' class="cur" aria-current="page"' : ''}>${IC.papierkorb}<span>Papierkorb</span><i class="bph-neutab" title="In neuem Tab öffnen" aria-label="In neuem Tab öffnen"></i></a>` : ''; })()
        : '<span class="bph-mu" style="padding:.5rem">Keine weiteren Apps.</span>') + '</div>';
    band.appendChild(m);
    // Eckdreieck: in neuem Tab · rechte Maustaste: Öffnen, neuer Tab, neues Fenster, Adresse kopieren
    m.addEventListener('click', (e) => { const d = e.target.closest('.bph-neutab'); if (!d) return; e.preventDefault(); e.stopPropagation(); window.open(d.closest('a').href, '_blank'); closeMenus(); });
    m.addEventListener('contextmenu', (e) => {
      const a = e.target.closest('.bph-tiles a'); if (!a) return; e.preventDefault();
      m.querySelectorAll('.bph-akm').forEach((x) => x.remove());
      const k = document.createElement('div'); k.className = 'bph-akm'; k.setAttribute('role', 'menu');
      k.innerHTML = [['auf', 'Öffnen'], ['tab', 'In neuem Tab öffnen'], ['fen', 'In neuem Fenster öffnen'], ['kop', 'Adresse kopieren']].map(([w, t]) => `<button type="button" role="menuitem" data-akm="${w}">${t}</button>`).join('');
      const r = m.getBoundingClientRect(); k.style.left = (e.clientX - r.left) + 'px'; k.style.top = (e.clientY - r.top) + 'px'; m.appendChild(k);
      k.addEventListener('click', async (ev) => { const b = ev.target.closest('[data-akm]'); if (!b) return; ev.stopPropagation(); const w = b.dataset.akm, u = a.href;
        if (w === 'auf') location.href = u; else if (w === 'tab') window.open(u, '_blank'); else if (w === 'fen') window.open(u, '_blank', 'popup,width=1400,height=900');
        else { try { await navigator.clipboard.writeText(u); if (window.toast) window.toast('Adresse kopiert.'); } catch { if (window.toast) window.toast(u); } }
        closeMenus(); });
    });
  }
  /* Darstellung: Farbschema und Akzentfarbe des Benutzers – kleines Fenster an der Kopfleiste oder im Einstellungsfenster, gilt in allen Apps */
  const THEMES = [['dunkel', 'Dunkel'], ['hell', 'Hell'], ['auto', 'Automatisch'], ['klassisch', 'Klassisch Grün']];
  const ACCENTS = [['#ff5fb3', 'Pink'], ['#ffd200', 'Gelb'], ['#ff9a2e', 'Orange'], ['#ff6b5e', 'Rot'], ['#3ddc84', 'Grün'], ['#2fd6c9', 'Türkis'], ['#4da3ff', 'Blau'], ['#b18cff', 'Violett'], ['#f3f3f1', 'Weiß']];
  /* Farbschemen nach Gestaltungslehre: je Schema ein ruhiger Grund (60 %), Flächen/Karten (30 %) und EINE Akzentfarbe (10 %) –
     die 60-30-10-Regel. Gedämpfte Schemen sind analog (benachbarte, entsättigte Töne), die kräftigen setzen den Akzent
     komplementär zum Grund. Alle Kombinationen erfüllen WCAG 2.1: Text ≥ 7:1 (AAA), Nebentext ≥ 4,5:1, Akzent ≥ 3:1 (Bedienelemente). */
  const SCHEMEN = [
    ['Gedämpft', [
      ['sand', 'Sand & Salbei', 'warm, ruhig, naturnah', 'hell', { bg: '#f1eee7', card: '#fbfaf6', line: '#ddd7cb', ink: '#2b2a26', mute: '#66625a', tabs: '#e6e1d5' }, '#56775f'],
      ['nebel', 'Nebel', 'kühles Grau-Blau, sachlich', 'hell', { bg: '#eef1f4', card: '#ffffff', line: '#d5dbe2', ink: '#1f2730', mute: '#58636f', tabs: '#e2e7ed' }, '#3f6496'],
      ['schiefer', 'Schiefer', 'dunkel, entsättigt, augenschonend', 'dunkel', { bg: '#22262b', card: '#2a2f35', line: '#3a414a', ink: '#e8eaed', mute: '#9ea7b1', tabs: '#2d333a' }, '#8fb3c9']]],
    ['Klassisch', [
      ['papier', 'Papier & Tusche', 'wie ein Plan: Schwarz auf Weiß, Rot als Korrektur', 'hell', { bg: '#f6f5f1', card: '#ffffff', line: '#d8d6cf', ink: '#161616', mute: '#5c5c57', tabs: '#ebe9e3' }, '#c8372a'],
      ['bauhaus', 'Bauhaus', 'Grundfarbe Blau auf warmem Weiß', 'hell', { bg: '#f4f1ea', card: '#fffdf8', line: '#ddd8cc', ink: '#1d1d1b', mute: '#5e5b55', tabs: '#e9e4d8' }, '#2a5caa'],
      ['graphit', 'Graphit', 'neutrales Dunkel mit Bernstein', 'dunkel', { bg: '#1c1c1e', card: '#252527', line: '#38383b', ink: '#f2f2f0', mute: '#a09f9b', tabs: '#29292b' }, '#f0b429']]],
    ['Modern & kräftig', [
      ['mitternacht', 'Mitternacht', 'tiefes Blau, Indigo-Akzent', 'dunkel', { bg: '#0f1420', card: '#161c2b', line: '#273049', ink: '#e6e9f2', mute: '#939cb2', tabs: '#141a28' }, '#7c9cff'],
      ['aubergine', 'Aubergine', 'dunkles Violett mit Pink', 'dunkel', { bg: '#1d1724', card: '#251e2e', line: '#3a3047', ink: '#f1ecf6', mute: '#aaa0b8', tabs: '#221b2b' }, '#ff7ab6'],
      ['mint', 'Mint & Koralle', 'frisch, komplementär', 'hell', { bg: '#f2f7f5', card: '#ffffff', line: '#d3e3dd', ink: '#1d2b27', mute: '#56695f', tabs: '#e3efea' }, '#e5533d'],
      ['terrakotta', 'Terrakotta', 'erdig-warm, wie Ziegel', 'hell', { bg: '#f6efe8', card: '#fffaf5', line: '#e4d6c8', ink: '#2e2420', mute: '#715f55', tabs: '#eee2d6' }, '#b8562a'],
      ['neon', 'Neon', 'Schwarz mit Limette – hoher Kontrast', 'dunkel', { bg: '#0d0d0f', card: '#151518', line: '#2a2a30', ink: '#f5f5f7', mute: '#9d9da6', tabs: '#121215' }, '#c6ff3d']]]];
  const SCH = Object.fromEntries(SCHEMEN.flatMap((g) => g[1]).map((x) => [x[0], x]));
  const SCH_VARS = ['--bg', '--card', '--card2', '--line', '--ink', '--mute', '--tabs', '--inp', '--hov', '--pan'];
  function schemaAnwenden(k) {   // Farben als Inline-Variablen am Dokument – gelten über den Farben der App (bp.css, Bautagebuch)
    const root = document.documentElement, S = SCH[k];
    SCH_VARS.forEach((v) => root.style.removeProperty(v));
    root.dataset.schema = S ? k : '';
    if (!S) return;
    const f = S[4], dunkel = S[3] === 'dunkel';
    const mix = (a, b, t) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(a.slice(1 + i, 3 + i), 16) * (1 - t) + parseInt(b.slice(1 + i, 3 + i), 16) * t).toString(16).padStart(2, '0')).join('');
    const W = { '--bg': f.bg, '--card': f.card, '--card2': dunkel ? mix(f.card, f.ink, 0.05) : f.card, '--line': f.line, '--ink': f.ink, '--mute': f.mute, '--tabs': f.tabs,
      '--inp': dunkel ? mix(f.bg, '#000000', 0.25) : '#ffffff', '--hov': dunkel ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)', '--pan': f.card };
    Object.entries(W).forEach(([v, x]) => root.style.setProperty(v, x));
  }
  H.schemaAnwenden = schemaAnwenden;
  /* Schrift der Oberfläche: je Benutzer unter ⚙ → Persönlich → Darstellung (früher eine Büro-Einstellung – die gilt noch als Vorgabe); bis die Antwort da ist, die zuletzt gemerkte */
  const SCHRIFT = { ubuntu: '', system: 'system-ui,"Segoe UI",-apple-system,Roboto,"Helvetica Neue",Arial,sans-serif', arial: 'Arial,Helvetica,sans-serif', verdana: 'Verdana,Geneva,sans-serif',
    calibri: 'Calibri,Carlito,"Segoe UI",system-ui,sans-serif', georgia: 'Georgia,"Times New Roman",serif' };
  const GROESSE = { klein: '12px', normal: '', gross: '14.5px' };   // Schriftgröße: --bp-fs für AVA und Bauzeitenplan (Grundgröße 13 px), dazu rem in allen übrigen Apps im selben Verhältnis
  const REM = { klein: '92.3%', gross: '111.5%' };
  function schriftAnwenden(k, g) {
    k = SCHRIFT[k] != null ? k : 'ubuntu'; g = GROESSE[g] != null ? g : 'normal';
    let st = document.getElementById('bphSchrift');
    const css = (SCHRIFT[k] ? `html body{font-family:${SCHRIFT[k]}}` : '') + (GROESSE[g] ? `html{--bp-fs:${GROESSE[g]};font-size:${REM[g]}}` : '');
    if (!css) { if (st) st.remove(); }
    else { if (!st) { st = document.createElement('style'); st.id = 'bphSchrift'; document.head.appendChild(st); } st.textContent = css; }
    try { localStorage.setItem('bpSchrift', k); localStorage.setItem('bpSchriftG', g); } catch { /* egal */ }
  }
  H.schriftAnwenden = schriftAnwenden;
  try { const k0 = localStorage.getItem('bpSchrift') || 'ubuntu', g0 = localStorage.getItem('bpSchriftG') || 'normal'; if (k0 !== 'ubuntu' || g0 !== 'normal') schriftAnwenden(k0, g0); } catch { /* egal */ }
  try { schemaAnwenden(localStorage.getItem('bpSchema') || ''); } catch { /* egal */ }   // sofort, ohne Aufblitzen
  /* Stil je Benutzer: Ecken, Schatten, Scrollbalken, Rahmen, Verläufe, Fensterelemente – als data-Attribute am <html>,
     die Regeln dazu stehen in head.css. Leer = wie bisher (Bestandsbenutzer behalten ihr gewohntes Aussehen). */
  const STIL = [
    ['ecken', 'Ecken', [['', 'wie bisher'], ['rund', 'runder'], ['dezent', 'dezent'], ['eckig', 'eckig']]],
    ['schatten', 'Schatten', [['', 'an'], ['aus', 'aus']]],
    ['sb', 'Scrollbalken', [['', 'wie bisher'], ['faden', 'Faden'], ['pille', 'Pille'], ['mac', 'macOS'], ['verlauf', 'Verlauf'], ['rinne', 'Rinne'], ['glas', 'Glas']]],
    ['rahmen', 'Rahmen', [['', 'Linie'], ['mac', 'Mac'], ['verlauf', 'Verlaufskante'], ['strich', 'Akzentstrich'], ['kantig', 'kantig'], ['glas', 'Glas']]],
    ['verlauf', 'Verläufe', [['', 'keine'], ['akzent', 'Akzent'], ['app', 'App-Farbe'], ['kopf', 'nur oben'], ['licht', 'Lichtfleck'], ['zwei', 'zweifarbig']]],
    ['fenster', 'Fensterelemente', [['', 'wie bisher'], ['mac', 'Mac-Stil']]],
    ['schalter', 'Häkchen', [['', 'Kästchen'], ['an', 'Schalter']]],
    ['bewegung', 'Bewegung (langsame Rechner)', [['', 'Animationen an'], ['aus', 'Animationen aus']]],
    ['effekte', 'Effekte (langsame Rechner)', [['', 'Unschärfe/Milchglas an'], ['aus', 'aus – schneller']]],
  ];
  /* fertige Zusammenstellungen – nur der Stil, Farben und Schrift bleiben, wie jeder sie gewählt hat */
  const STIL_PAKETE = [['Standard', {}], ['Mac', { sb: 'mac', rahmen: 'mac', fenster: 'mac', verlauf: 'app', schalter: 'an' }], ['Kacheln', { sb: 'pille', verlauf: 'akzent', ecken: 'rund' }],
    ['Technisch', { ecken: 'eckig', sb: 'rinne', rahmen: 'kantig' }], ['Ruhig', { ecken: 'dezent', schatten: 'aus', sb: 'faden', rahmen: 'strich' }],
    ['Schnell (langsame Rechner)', { ecken: 'dezent', schatten: 'aus', sb: 'faden', bewegung: 'aus', effekte: 'aus' }]];
  function stilAnwenden(st) {
    st = st || {}; const R = document.documentElement;
    STIL.forEach(([k, , L]) => { const v = L.some((o) => o[0] === st[k]) ? st[k] : ''; if (v) R.dataset[k] = v; else delete R.dataset[k]; });
    try { localStorage.setItem('bpStil', JSON.stringify(st)); } catch { /* egal */ }
  }
  H.stilAnwenden = stilAnwenden; H.STIL = STIL;
  /* Fensterelemente „Mac-Stil“: drei Punkte in Akzentfarbe im Fenstertitel – reine Zierde, ohne Funktion
     (Schließen bleibt beim ✕ bzw. den Knöpfen). Gilt für alle Fenster aller Apps. */
  const FENSTER = '.modal, .bph-dlg, .sr-flo';
  function ampel(d) {
    if (d.querySelector(':scope > .bp-ampel, :scope > * > .bp-ampel')) return;
    const a = document.createElement('span'); a.className = 'bp-ampel'; a.setAttribute('aria-hidden', 'true');
    a.innerHTML = '<i></i><i></i><i></i>';
    const kopf = d.querySelector(':scope > .mh, :scope > .bph-dh, :scope > .sr-fk');
    if (kopf) kopf.prepend(a); else d.prepend(a);
  }
  function ampelnSetzen() { if (document.documentElement.dataset.fenster !== 'mac') return; document.querySelectorAll(FENSTER).forEach(ampel); }
  try { new MutationObserver(() => ampelnSetzen()).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-fenster'] }); } catch { /* egal */ }
  try { stilAnwenden(JSON.parse(localStorage.getItem('bpStil') || '{}')); } catch { /* egal */ }
  /* Ansicht „Basic“ (intern: einfach) oder „Profi“ – je Benutzer (Mein Konto), Vorgabe des Büros. Apps fragen H.einfach() und zeigen ihre
     Einfach-Startansicht; CSS blendet Profi-Teile über html[data-modus="einfach"] aus. */
  H.modus = 'profi';
  try { H.modus = localStorage.getItem('bpModus') === 'einfach' ? 'einfach' : 'profi'; } catch { /* egal */ }
  document.documentElement.dataset.modus = H.modus;
  H.einfach = () => H.modus === 'einfach';
  H.modusSetzen = async function (m, neuLaden = true) {
    m = m === 'einfach' ? 'einfach' : 'profi';
    try { localStorage.setItem('bpModus', m); } catch { /* egal */ }
    try { await fetch('api/bp/darstellung', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modus: m }) }); } catch { /* egal */ }
    if (neuLaden) location.reload(); else { H.modus = m; document.documentElement.dataset.modus = m; }
  };
  let lookDirty = false;
  const lookHtml = () => {
    const me = H.me || {}, t = me.theme || 'dunkel', a = String(me.accent || ACCENTS[0][0]).toLowerCase(), fs = me.farbschema || '';
    const karte = ([k, n, d, b, f, acc]) => `<button type="button" class="bph-sk${fs === k ? ' on' : ''}" data-fs="${k}" title="${esc(d)}"><span class="bph-skv" style="background:${f.bg};border-color:${f.line}"><i style="background:${f.card};border-color:${f.line}"><em style="background:${f.ink}"></em><em style="background:${f.mute}"></em></i><b style="background:${acc}"></b></span><span>${esc(n)}<small>${esc(d)}</small></span></button>`;
    return `<div class="bph-info" style="padding:.2rem 0 .3rem">Grundeinstellung</div><div class="bph-lk">${THEMES.map(([k, n]) => `<button type="button" class="bph-th${k === t && !fs ? ' on' : ''}" data-th="${k}">${esc(n)}</button>`).join('')}</div>
      ${SCHEMEN.map(([g, L]) => `<div class="bph-info" style="padding:.5rem 0 .3rem">${esc(g)}</div><div class="bph-skg">${L.map(karte).join('')}</div>`).join('')}
      <div class="bph-info" style="padding:.5rem 0 .3rem">Akzentfarbe${fs ? ' <small>(das Schema bringt eine passende mit – hier änderbar)</small>' : ''}</div>
      <div class="bph-sw">${ACCENTS.map(([c, n]) => `<button type="button" class="${c === a ? 'on' : ''}" style="background:${c}" data-acc="${c}" title="${n}" aria-label="${n}"></button>`).join('')}
        <label class="${ACCENTS.some((x) => x[0] === a) ? '' : 'on'}" title="Eigene Farbe"><input type="color" value="${esc(a)}" data-accc></label></div>
      <div class="bph-info" style="padding:.5rem 0 .3rem">Schrift</div><div class="bph-lk">${SCHRIFT_N.map(([k, n]) => `<button type="button" class="bph-th${k === sAkt() ? ' on' : ''}" data-sf="${k}" style="font-family:${SCHRIFT[k] || 'Ubuntu,system-ui,sans-serif'}">${esc(n)}</button>`).join('')}</div>
      <div class="bph-info" style="padding:.5rem 0 .3rem">Schriftgröße</div><div class="bph-lk">${[['klein', 'klein', '12px'], ['normal', 'normal', '13px'], ['gross', 'groß', '14.5px']].map(([k, n, px]) => `<button type="button" class="bph-th${k === gAkt() ? ' on' : ''}" data-sg="${k}" style="font-size:${px}">${n}</button>`).join('')}</div>
      <div class="bph-info" style="padding:.5rem 0 .3rem">Büro-Logo in der Kopfleiste</div><div class="bph-lk">${[['aus', 'aus'], ['dezent', 'dezent'], ['farbe', 'in Farbe']].map(([k, n]) => `<button type="button" class="bph-th${k === logoA ? ' on' : ''}" data-logo="${k}">${n}</button>`).join('')}</div>
      <div class="bph-info" style="padding:.7rem 0 .1rem"><b>Stil</b> <small>– Aussehen von Flächen, Rahmen und Bedienelementen</small></div>
      <div class="bph-lk">${STIL_PAKETE.map(([n, P], i) => { const v = (me.stil || {}), gleich = STIL.every(([k]) => (v[k] || '') === (P[k] || '')); return `<button type="button" class="bph-th${gleich ? ' on' : ''}" data-stilp="${i}">${esc(n)}</button>`; }).join('')}</div>
      ${STIL.map(([k, n, L]) => { const v = ((me.stil || {})[k]) || ''; return `<div class="bph-info" style="padding:.35rem 0 .2rem">${esc(n)}</div><div class="bph-lk">${L.map(([w, t]) => `<button type="button" class="bph-th${w === v ? ' on' : ''}" data-stil="${k}" data-w="${w}">${esc(t)}</button>`).join('')}</div>`; }).join('')}`;
  };
  const SCHRIFT_N = [['ubuntu', 'Ubuntu'], ['system', 'Systemschrift'], ['arial', 'Arial'], ['verdana', 'Verdana'], ['calibri', 'Calibri'], ['georgia', 'Georgia']];
  const sAkt = () => (H.me && H.me.schrift) || (H.conf && H.conf.schrift) || 'ubuntu', gAkt = () => (H.me && H.me.schrift_g) || (H.conf && H.conf.schrift_groesse) || 'normal';
  function lookWire(m, redraw) {
    m.addEventListener('click', (e) => {
      const th = e.target.closest('[data-th]'), ac = e.target.closest('[data-acc]');
      const fs = e.target.closest('[data-fs]'), sf = e.target.closest('[data-sf]'), sg = e.target.closest('[data-sg]'), sl = e.target.closest('[data-stil]');
      if (th || ac || fs || sf || sg || sl) e.stopPropagation();
      const lo = e.target.closest('[data-logo]'); if (lo) { e.stopPropagation(); logoArt(lo.dataset.logo); saveLook({ logo: lo.dataset.logo }, redraw); return; }
      const sp = e.target.closest('[data-stilp]'); if (sp) { e.stopPropagation(); const st = Object.assign({}, STIL_PAKETE[+sp.dataset.stilp][1]); stilAnwenden(st); saveLook({ stil: st }, redraw); return; }
      if (sl) { const st = Object.assign({}, (H.me && H.me.stil) || {}, { [sl.dataset.stil]: sl.dataset.w }); stilAnwenden(st); saveLook({ stil: st }, redraw); return; }   // sofort sichtbar, dann gespeichert
      if (sf || sg) { saveLook(sf ? { schrift: sf.dataset.sf } : { schrift_g: sg.dataset.sg }, redraw); return; }   // Schrift und Größe: je Benutzer
      if (fs) { const S = SCH[fs.dataset.fs]; saveLook({ theme: S[3], accent: S[5], farbschema: S[0] }, redraw); }
      else if (th) saveLook({ theme: th.dataset.th, farbschema: '' }, redraw); else if (ac) saveLook({ accent: ac.dataset.acc }, redraw);
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
      H.me = Object.assign(H.me || {}, { theme: r.theme, accent: r.accent, farbschema: r.farbschema || '', schrift: r.schrift || '', schrift_g: r.schrift_g || '', stil: r.stil || {} });
      stilAnwenden(H.me.stil);
      schriftAnwenden(sAkt(), gAkt());
      schemaAnwenden(H.me.farbschema); try { localStorage.setItem('bpSchema', H.me.farbschema); } catch { /* egal */ }
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
    /* Ins Fenster geworfen, aber kein Datei-Feld in der Nähe (nur eines irgendwo auf der Seite): im Projektordner ablegen – nicht in offenen Fenstern */
    const ablage = (z, t) => !!(H.ablage && H.ablage.ablegen && !H.ablage.aus && (!z || z.zone === document.body) && !(t && t.closest && t.closest('.modal-bg, .bph-modal, [role=dialog]')));
    const weg = () => { if (mark) mark.classList.remove('bph-dropzone'); mark = null; if (hinw) { hinw.remove(); hinw = null; } };
    window.addEventListener('dragover', (e) => {
      if (!hatDateien(e) || e.defaultPrevented) return;
      e.preventDefault();   // sonst öffnet der Browser die Datei und die Seite ist weg
      const z = ziel(e.target, typen(e)), abl = ablage(z, e.target);
      e.dataTransfer.dropEffect = z || abl ? 'copy' : 'none';
      const zone = z && (z.zone === document.body ? null : z.zone);
      if (zone !== mark) { weg(); if (zone) { mark = zone; mark.classList.add('bph-dropzone'); } }
      if ((z || abl) && !zone && !hinw) { hinw = document.createElement('div'); hinw.className = 'bph-drophinw'; hinw.textContent = abl ? 'Loslassen – im Projektordner ablegen' : 'Loslassen zum Hochladen'; document.body.appendChild(hinw); }
    });
    window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) weg(); });
    window.addEventListener('drop', (e) => {
      const fs = e.dataTransfer ? [...(e.dataTransfer.files || [])] : [];
      weg();
      if (!fs.length || e.defaultPrevented) return;
      e.preventDefault();
      const z = ziel(e.target, fs);
      if (ablage(z, e.target)) { H.ablage.ablegen(fs, e.target); return; }   // kein Datei-Feld an dieser Stelle: in den Projektordner (bp/ablegen.js)
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

  /* Zeiterfassung: je Minute, in der jemand wirklich arbeitet (Fenster sichtbar, Maus/Tastatur in den letzten 3 Minuten),
     meldet die Kopfleiste App, Bereich (z. B. Reiter der AVA, window.bpBereich) und das gewählte Projekt. Nur der Benutzer
     selbst sieht daraus Vorschläge in „Zeiten“; nichts zählt, bevor er den Tag bestätigt. */
  function pulsStarten() {
    if (H._puls || !H.me || !(H.conf && (H.conf.apps || []).some((a) => a.key === 'zeiten'))) return;
    let aktiv = Date.now();
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((ev) => addEventListener(ev, () => { aktiv = Date.now(); }, { passive: true, capture: true }));
    const senden = () => {
      if (document.visibilityState !== 'visible' || Date.now() - aktiv > 180000) return;
      let bereich = ''; try { bereich = typeof window.bpBereich === 'function' ? String(window.bpBereich() || '') : ''; } catch { /* egal */ }
      fetch('api/bp/puls', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: H.app, bereich, projekt: H.projekt && H.projekt.id || null }) }).catch(() => {});
    };
    H._puls = setInterval(senden, 60000); setTimeout(senden, 4000);
  }
  /* Link zu einem Punkt in der Karte – Kartendienst wählt das Büro (Verwaltung → Darstellung: ui_karte) */
  H.karteUrl = function (lat, lon) {
    const a = +lat, o = +lon, k = (H.conf && H.conf.karte) || 'google';
    if (k === 'osm') return `https://www.openstreetmap.org/?mlat=${a}&mlon=${o}#map=18/${a}/${o}`;
    if (k === 'apple') return `https://maps.apple.com/?ll=${a},${o}&q=${a},${o}`;
    return `https://www.google.com/maps/search/?api=1&query=${a},${o}`;
  };
  /* Büro-Logo links in der Kopfleiste (Verwaltung → Büro & Standort → Firma, Logo) – je Benutzer aus, dezent oder in Farbe
     (⚙ → Persönlich → Darstellung, besprochen am 13.11.2026). Ohne hinterlegtes Logo nichts; am Handy ausgeblendet. */
  const LOGO = ['aus', 'dezent', 'farbe'];
  let logoA = (() => { try { return localStorage.getItem('bpLogo') || 'dezent'; } catch { return 'dezent'; } })();
  function logoArt(a) {
    logoA = LOGO.includes(a) ? a : 'dezent'; try { localStorage.setItem('bpLogo', logoA); } catch { /* egal */ }
    const lg = band && band.querySelector('.bph-logo'); if (!lg) return;
    lg.classList.toggle('farbe', logoA === 'farbe'); lg.hidden = logoA === 'aus' || !lg.dataset.da;
    if (logoA !== 'aus' && !lg.dataset.da) logoLaden();
  }
  function logoLaden() {
    const lg = band.querySelector('.bph-logo'), img = lg.querySelector('img'); if (logoA === 'aus' || img.getAttribute('src')) return;
    img.onload = () => {   // Logo mit weißem Hintergrund (JPG …): anders einfärben, sonst würde „dezent“ daraus ein helles Rechteck
      try { const cv = document.createElement('canvas'); cv.width = cv.height = 4; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 1, 1, 0, 0, 4, 4); if (g.getImageData(1, 1, 1, 1).data[3] > 200) lg.classList.add('opak'); } catch { /* egal */ }
      lg.dataset.da = '1'; logoArt(logoA);
    };
    img.onerror = () => { lg.hidden = true; };
    img.src = 'api/bp/bt/logo';
  }
  /* Suche (Strg+K): Baustein suche.js, erst beim ersten Öffnen geladen. Eine App meldet ihre Inhalte an – auch bevor die Kopfleiste geladen ist:
     (window.bpSucheQ = window.bpSucheQ || []).push(async (q, wörter) => [{ ic, t, sub, wo, go }])  bzw. BPHead.sucheAnmelden(fn) */
  H._suQ = window.bpSucheQ = window.bpSucheQ || [];
  H.sucheAnmelden = (f) => { if (typeof f === 'function') H._suQ.push(f); };
  H.suche = function (q) {
    if (window.bpSuche) return bpSuche.oeffnen(q);
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'suche.js' + v;
    sc.onload = () => { if (window.bpSuche) bpSuche.oeffnen(q); }; document.head.appendChild(sc);
  };
  document.addEventListener('keydown', (e) => { if (band && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); H.suche(); } });
  H.mount = function (opt) {
    opt = opt || {};
    if (band) return H.ready;
    H.app = opt.app || '';
    if (H.app && !document.documentElement.dataset.af) document.documentElement.dataset.af = H.app;   // App-Farbe (--af) für Verläufe und Akzentstrich
    if (H.app && !['admin', 'portal'].includes(H.app)) { try { localStorage.setItem('bp.letzteApp', H.app); } catch { /* egal */ } }   // „Öffnen“ in der Verwaltung führt hierhin zurück
    band = document.createElement('header');
    band.className = 'bph' + (opt.sticky ? ' bph-sticky' : '');
    band.innerHTML = `<a class="bph-logo" href="/" title="Zur Startseite" hidden><img alt="Büro-Logo"></a><a class="bph-brand" href="/" title="Zur Startseite">${IC.home}<span class="bph-plat">Bauportal</span><span class="bph-sl">/</span>${IC[opt.app] && opt.app !== 'portal' ? `<i class="bph-aic" data-af="${esc(opt.app)}">${IC[opt.app]}</i>` : ''}<span class="bph-app">${esc(opt.name || '')}</span></a>
      <div class="bph-proj" role="button" tabindex="0" title="Projekt wählen"><small></small><span></span></div>
      <span class="bph-fill"></span><button type="button" class="bph-such" aria-label="Suchen (Strg+K)" title="Suchen – Inhalte, Funktionen, Einstellungen (Strg+K)"><span aria-hidden="true">🔍</span><span class="bph-such-t">Suchen …</span><kbd>Strg K</kbd></button>
      <div class="bph-mode" role="group" aria-label="Ansicht"><button type="button" data-modus="einfach" title="Basic: große Karten, eine Hauptaufgabe je Seite">Basic</button><button type="button" data-modus="profi" title="Alle Funktionen">Profi</button></div>
      <div class="bph-ki" role="group" aria-label="KI-Auswahl"></div>
      <button type="button" class="bph-kim" aria-haspopup="menu" aria-label="KI wählen"></button>
      <button type="button" class="bph-ic bph-hlp" aria-haspopup="menu" aria-label="Hilfe" title="Hilfe, Neuigkeiten, Frage stellen, Fehler melden">?<span class="bph-hn" hidden></span></button>
      <button type="button" class="bph-ic bph-appsb" aria-haspopup="menu" aria-label="Apps" title="Apps">${IC.grid}</button>
      <button type="button" class="bph-ic bph-gear" aria-haspopup="dialog" aria-label="Einstellungen" title="Einstellungen">${IC.gear}</button>
      <button type="button" class="bph-who" aria-haspopup="menu" aria-label="Mein Konto"><span class="bph-av">?</span><span class="bph-nm"></span></button>`;
    const parent = opt.parent || document.body;
    parent.insertBefore(band, opt.before || parent.firstChild);
    renderKi();
    band.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.bph-proj')) { e.preventDefault(); if (typeof opt.projektwahl === 'function') opt.projektwahl(); else H.projektWahl(); } });
    band.addEventListener('click', (e) => {
      if (e.target.closest('.bph-such')) { closeMenus(); H.suche(); return; }
      if (e.target.closest('.bph-proj')) { closeMenus(); if (typeof opt.projektwahl === 'function') opt.projektwahl(); else H.projektWahl(); return; }
      const mo = e.target.closest('button[data-modus]'); if (mo) { e.preventDefault(); closeMenus(); if (mo.dataset.modus !== H.modus) H.modusSetzen(mo.dataset.modus); return; }
      const k = e.target.closest('[data-ki]');
      if (k) { e.preventDefault(); closeMenus(); setKi(k.dataset.ki); return; }
      if (e.target.closest('[data-out]')) { logout(); return; }
      if (e.target.closest('[data-look]')) { e.stopPropagation(); lookMenu(); return; }
      if (e.target.closest('[data-konto]')) { e.stopPropagation(); closeMenus(); H.einstellungen({ bereich: 'ich', teil: 'konto' }); return; }
      const hm = e.target.closest('[data-hm]'); if (hm) { e.stopPropagation(); closeMenus(); if (hm.dataset.hm === 'frage') H.hilfe(); else if (hm.dataset.hm === 'wiki') H.wiki('festhalten'); else H.hilfeSeite(hm.dataset.hm === 'neu' ? { reiter: 'aenderungen' } : { reiter: 'hilfe' }); return; }
      if (e.target.closest('.bph-hlp')) { e.stopPropagation(); if (band.querySelector('.bph-menu')) closeMenus(); else hilfeMenu(); return; }
      if (e.target.closest('[data-bug]')) { e.stopPropagation(); closeMenus(); H.bugMelden(); return; }
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
      if (conf.name) { band.querySelector('.bph-plat').textContent = conf.name; }   // Name der Plattform aus der Verwaltung
      setTimeout(pulsStarten, 0);
      schriftAnwenden(conf.schrift || '', conf.schrift_groesse || '');
      testBanner(conf.version);
      if (H.me) getJ('api/bp/darstellung').then((d) => { if (d.modus && d.modus !== H.modus) { try { localStorage.setItem('bpModus', d.modus); } catch { /* egal */ } location.reload(); return; } H.me.farbschema = d.farbschema || ''; H.me.stil = d.stil || {}; stilAnwenden(H.me.stil); H.me.schrift = d.schrift || ''; H.me.schrift_g = d.schrift_g || ''; if (d.schrift || d.schrift_g) schriftAnwenden(sAkt(), gAkt()); H.kiImmer = !!d.ki_immer; logoArt(d.logo); schemaAnwenden(H.me.farbschema); try { localStorage.setItem('bpSchema', H.me.farbschema); } catch { /* egal */ } }).catch(() => {});
      H.projekt = pj && pj.id ? pj : null; kopfProjekt();
      if (ki) { H.ki = ki.choice || 'intern'; H.providers = ki.providers || []; }
      const portal = (conf.apps || []).find((a) => a.key === 'portal');
      if (portal) band.querySelector('.bph-brand').href = band.querySelector('.bph-logo').href = appUrl(portal) + '/';
      if (H.me) logoLaden();
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
    H.ready.then(hilfeStart).catch(() => {});
    H.ready.then(() => { const los = () => window.bpNeu && bpNeu.start(); if (window.bpNeu) los(); else setTimeout(los, 800); }).catch(() => {});
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
  /* Wort-Modus (data-bp-projekt="wort", z. B. Zeile „Neue Aufgabe“): vervollständigt nur das Wort am Cursor –
     ein Projektkürzel wie „A48“, ein Ort oder Name („Tierheim“, „Krefeld“) –, der übrige Text bleibt stehen */
  const sugWort = (inp) => {
    const pos = inp.selectionStart == null ? inp.value.length : inp.selectionStart, vor = inp.value.slice(0, pos);
    const m = vor.match(/(?:^|\s)(@[^\s@]{2,}|[A-Za-z]{1,3}\d[\w.-]*|[^\s@\d][^\s@]{2,})$/);   // Kürzel, @Name oder jedes Wort ab 3 Buchstaben (Tierheim, Krefeld)
    return m ? { a: pos - m[1].length, b: pos, q: m[1].replace(/^@/, '') } : null;
  };
  function sugPick(i) {
    const x = sugItems[i]; if (!x || !sugFor) return;
    const inp = sugFor;
    if (inp.getAttribute('data-bp-projekt') === 'wort') {
      const w = sugWort(inp) || { a: inp.value.length, b: inp.value.length };
      const rest = inp.value.slice(w.b).replace(/^\s*/, ' ');
      inp.value = inp.value.slice(0, w.a) + x.name + rest;
      const c = w.a + x.name.length + 1; try { inp.setSelectionRange(c, c); } catch { /* egal */ }
      if (x.kind === 'bt') inp.dataset.btId = x.id;
      sugClose(); inp.focus(); return;
    }
    inp.value = x.name;
    if (x.kind === 'bt') inp.dataset.btId = x.id; else delete inp.dataset.btId;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    sugClose(); inp.focus();
  }
  async function sugLoad(inp) {
    const wort = inp.getAttribute('data-bp-projekt') === 'wort', w = wort ? sugWort(inp) : null;
    const q = wort ? (w ? w.q : '') : inp.value.trim();
    if (q.length < 2) { sugItems = []; sugRender(); return; }
    let d = null;
    try { d = await getJ('api/bp/projektnamen?q=' + encodeURIComponent(q)); } catch { return; }
    if (sugFor !== inp || (wort ? (sugWort(inp) || {}).q !== q : inp.value.trim() !== q)) return;
    const seen = new Set();
    sugItems = [...(d.projects || []).map((p) => ({ kind: 'bt', id: p.id, name: p.name, sub: [p.address, p.archived ? 'archiviert' : ''].filter(Boolean).join(' · ') })),
      ...(d.folders || []).map((f) => ({ kind: 'dir', name: f, sub: '' }))].filter((x) => { const k = x.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
    sugIdx = -1; sugRender();
  }
  document.addEventListener('input', (e) => {
    const inp = e.target; if (!inp.matches || !inp.matches('input[data-bp-projekt]')) return;
    if (inp.getAttribute('data-bp-projekt') !== 'wort') delete inp.dataset.btId;
    sugFor = inp; clearTimeout(sugT); sugT = setTimeout(() => sugLoad(inp), 220);
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
          <h4>Bauanträge – Entwurfsverfasser/in</h4><p class="bph-mu">Für die Formulare in der App „Bauantrag“. Beim Ausfüllen wählst du, ob du persönlich oder das Büro eingetragen wird – vorgewählt ist „persönlich“, wenn du hier bauvorlageberechtigt mit Kammernummer bist.</p>
          <div class="bph-row"><label style="flex:1">Berufsbezeichnung<input data-kbv="beruf" value="${esc(K.beruf || '')}" placeholder="z. B. Architekt, Dipl.-Ing." maxlength="80"></label><label style="flex:1">Kammer<input data-kbv="kammer" value="${esc(K.kammer || '')}" placeholder="z. B. Architektenkammer NRW" maxlength="80"></label></div>
          <div class="bph-row"><label style="flex:1">Mitgliedsnummer<input data-kbv="kammernr" value="${esc(K.kammernr || '')}" maxlength="40"></label><label style="flex:1;align-self:end"><input type="checkbox" data-kbv="bauvorlage"${K.bauvorlage ? ' checked' : ''}> bauvorlageberechtigt</label></div>
          <div class="bph-row"><button type="button" class="bph-btn pri" data-kbvsave>Speichern</button></div>
          <h4>Absender meiner Mails</h4><p class="bph-mu">Rügen und Planversand gehen standardmäßig vom Büro-Postfach aus. Antworten kommen in jedem Fall auch an dich (Antwort an: deine Adresse).</p>
          ${seg('absender', [['buero', 'Büro' + (K.absender_buero ? ' (' + esc(K.absender_buero) + ')' : '')], ['eigen', 'meine Adresse' + (K.email ? ' (' + esc(K.email) + ')' : '')]])}
          ${K.absender === 'eigen' ? '<p class="bph-mu">Der Mailserver muss das Senden in deinem Namen erlauben (Microsoft 365: „Senden als“ für das Büro-Postfach). Sonst erscheint beim Versand ein Hinweis.</p>' : ''}
          <h4>Mängel- und Terminrügen versenden</h4><p class="bph-mu">Vorauswahl im Dialog der Rüge – dort lässt sie sich jedes Mal ändern.</p>
          ${seg('versand', [['pdf', 'nur PDF'], ['mich', 'per E-Mail an mich'], ['firma', 'direkt an die Firma']])}
          <label class="bph-ck"><input type="checkbox" data-kchk="kopie"${K.kopie ? ' checked' : ''}> bei „direkt an die Firma“ eine Kopie an mich</label>
          <h4>Pläne versenden</h4><p class="bph-mu">Vorauswahl im Planversand und im Plotauftrag – dort lässt sie sich jedes Mal ändern.</p>
          ${(K.versand_plaene = K.versand_plaene || (K.versand === 'mich' ? 'mich' : 'direkt'), seg('versand_plaene', [['direkt', 'direkt an die Empfänger'], ['mich', 'per E-Mail an mich']]))}
          <label class="bph-ck"><input type="checkbox" data-kchk="kopie_plaene"${K.kopie_plaene !== false ? ' checked' : ''}> bei „direkt an die Empfänger“ eine Kopie an mich</label>
          <h4>Preise aus den Baudaten</h4><p class="bph-mu">Welcher Preis beim Übernehmen von Positionen aus den Baudaten ins LV oder in die Baukosten eingesetzt wird. „Fragen“ zeigt jedes Mal die Auswahl.</p>
          ${seg('pdb_preis', [['', 'fragen'], ['von', 'tief'], ['mittel', 'mittel'], ['bis', 'hoch'], ['eigen_median', 'Median eigene'], ['eigen_neu', 'neuester eigener']])}
          <p class="bph-mu">Bei „eigene Preise“ gilt für Positionen ohne eigene Preise der Katalog-Mittelwert.</p>
          <h4>Erinnerungen</h4><p class="bph-mu">Gilt für alle Apps, die erinnern: Bautagebuch (Mängel, Zu erledigen, Weisungen mit Datum), eigene Erinnerungen, Erinnerungen aus Mails.</p>
          ${(K.erinnerung_art = K.erinnerung_art || (K.kalender ? 'termin' : 'mail'), seg('erinnerung_art', [['mail', 'einfache Mail am Erinnerungstag'], ['termin', 'sofort als Outlook-Termin zum Annehmen']]))}
          ${seg('erinnerung_an', [['ich', 'nur an mich'], ['bauleiter', 'an alle Bauleiter des Projekts']])}
          <p class="bph-mu">${K.erinnerung_art === 'termin' ? 'Der Termin kommt beim Anlegen oder Verschieben als Einladung – „Annehmen“ trägt ihn in den Standardkalender ein, die angehängte termin.ics lässt sich in einen anderen Kalender übernehmen. Die Mail am Tag entfällt.' : 'Am Erinnerungstag zur eingestellten Uhrzeit kommt eine Mail.'}</p>
          <p class="bph-mu">Einzelne Erinnerungen, Fristen und Termine lassen sich außerdem jederzeit mit 📅 als Termin schicken.</p>
          <h4>Posteingang</h4><p class="bph-mu">Die Startseite zeigt die Mails zu deinen Projekten – Rechnungen, Nachträge, Termine – mit Vorschlägen für Erinnerungen. Postfächer und Abrufzeit stellst du auf der Startseite unter ⚙ → Startseite → Posteingang ein.</p>
          <div class="bph-row"><button type="button" class="bph-btn" data-kpost>📬 Postfächer einrichten …</button></div>
          <h4>Vor Ort erkennen</h4><p class="bph-mu">Dein iPhone meldet per Kurzbefehl, wenn du auf einer Baustelle warst – fehlt der Tagesbericht, erinnert die Plattform.</p>
          <div class="bph-row"><button type="button" class="bph-btn" data-kvorort>📍 Vor Ort erkennen einrichten …</button></div>
          <h4>Zolli – der Hinweis-Zollstock</h4><p class="bph-mu">Zeigt am PC, wo man Dateien hineinziehen kann und was sonst noch geht. Gilt für diesen Browser.</p>
          <label class="bph-ck"><input type="checkbox" data-kzolli${H.zolliAn() ? ' checked' : ''}> Zolli zeigen</label>
          <div class="bph-row"><button type="button" class="bph-btn" data-kzollineu>Alle Hinweise wieder zeigen</button></div>
          <h4>Kennwort</h4><div class="bph-row"><button type="button" class="bph-btn" data-kpw>🔑 Kennwort ändern …</button></div>
          <div class="bph-row">${H.verlaufKnopf('konto:' + K.uid, 'Verlauf meiner Einstellungen')}</div>
          <p class="bph-mu">${K.email ? `Mails gehen an <b>${esc(K.email)}</b>.` : '<b>Für dein Konto ist keine E-Mail-Adresse hinterlegt</b> – bitte vom Administrator in der Verwaltung (▦ → Verwaltung → Benutzer) eintragen lassen.'}${K.mail ? '' : ' Der Mailserver ist noch nicht eingerichtet (Verwaltung → Einstellungen → Mailserver).'}</p>`;
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
      if (t.closest('[data-kvorort]')) { H.vorort(); return; }
      if (t.closest('[data-kpw]')) { H.kennwort(); return; }
      const tb = t.closest('[data-ktab]'); if (tb) { tab = tb.dataset.ktab; msg = ''; draw(); return; }
      const sv = t.closest('[data-kset]'); if (sv) { save({ [sv.dataset.kset]: sv.dataset.v }); return; }
      if (t.closest('[data-kbvsave]')) { const d = {}; root.querySelectorAll('[data-kbv]').forEach((x) => { d[x.dataset.kbv] = x.type === 'checkbox' ? x.checked : x.value.trim(); }); save(d); return; }
      if (t.closest('[data-kdel]')) { if (!(await bpFrage('Unterschrift entfernen?'))) return; await KX('api/bp/signatur', { method: 'DELETE' }).catch((er) => { msg = er.message; }); K.signatur = false; draw(); return; }
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
      if (!(await bpFrage('Diesen Stand wiederherstellen? Der jetzige Stand bleibt im Verlauf erhalten und kann ebenso zurückgeholt werden.'))) return true;
      try { await JS(`api/bp/versionen/${id}/wiederherstellen`, 'POST'); } catch (er) { alert(er.message); return true; }
      if (opt && opt.nach) { opt.nach(); await reload(); } else location.reload();
      return true;
    }
    const nb = t.closest('[data-vname]');
    if (nb) {
      const n = (await bpEingabe('Name für diesen Stand (z. B. „vor der Umstellung“) – benannte Stände werden nie automatisch aufgeräumt. Leer = Name entfernen.', nb.dataset.vname));
      if (n === null) return true;
      try { await JS(`api/bp/versionen/${id}`, 'PATCH', { name: n }); } catch (er) { alert(er.message); }
      await reload(); return true;
    }
    return false;
  }
  /* Verlaufsfenster: links die Zeitleiste (nach Tagen, benannte Stände ★), rechts die Unterschiede des gewählten Stands –
     „Was hat sich geändert“ (gegenüber dem Stand davor) oder „Unterschied zu jetzt“. Jede Zeile lässt sich einzeln
     zurückholen (↶), der ganze Stand wiederherstellen. Symbole wie im Rückgängig-Dock: ＋ neu · ✎ geändert · 🗑 entfernt. */
  const vIc = (art) => ({ neu: '＋', weg: '🗑', reihe: '⇅' }[art] || '✎');
  const vZaehl = (A) => { const z = { neu: 0, aend: 0, weg: 0 }; (A || []).forEach((t) => { if (/hinzugefügt|angelegt|eingetragen/.test(t)) z.neu++; else if (/entfernt|gelöscht/.test(t)) z.weg++; else if (!/^… und/.test(t)) z.aend++; });
    const m = /… und (\d+) weitere/.exec((A || []).join(' ')); if (m) z.aend += +m[1]; return z; };
  const vTag = (s) => { const d = new Date(s), h = new Date(); const t = (x) => x.toISOString().slice(0, 10), g = new Date(h); g.setDate(h.getDate() - 1);
    return isNaN(d) ? '' : t(d) === t(h) ? 'Heute' : t(d) === t(g) ? 'Gestern' : d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const vUhr = (s) => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
  H.verlauf = async function (opt = {}) {
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = '<div class="bph-dlg bph-vx" role="dialog" aria-label="Verlauf"></div>';
    document.body.appendChild(bg); const root = bg.firstChild;
    const close = () => { bg.remove(); document.removeEventListener('keydown', esc1); };
    const esc1 = (e) => { if (e.key === 'Escape' && !document.querySelector('.bph-frage')) close(); };
    document.addEventListener('keydown', esc1);
    let D = null, msg = '', sel = null, DET = {}, modus = 'geaendert', filt = 'alle', such = '';
    const ich = (H.me && (H.me.name || H.me.display_name)) || '';
    const sicht = () => (D ? D.versionen : []).filter((v) => (filt !== 'name' || v.name) && (filt !== 'ich' || v.wer === ich)
      && (!such || ((v.aenderungen || []).join(' ') + ' ' + (v.name || '') + ' ' + (v.wer || '')).toLowerCase().includes(such.toLowerCase())));
    const links = () => { let tag = ''; return sicht().map((v) => { const t = vTag(v.wann), z = vZaehl(v.aenderungen), i0 = D.versionen[0] === v;
      const kopf = t !== tag ? `<div class="bph-vx-tag">${esc(t)}</div>` : ''; tag = t;
      return `${kopf}<button type="button" class="bph-vx-st${v.id === sel ? ' on' : ''}${i0 ? ' jetzt' : ''}${v.name ? ' named' : ''}" data-vsel="${v.id}"><span class="d"></span><span class="u">${vUhr(v.wann)}</span>
        <b>${v.name ? '★ ' + esc(v.name) : esc(v.wer || '–')}${i0 ? ' <i>jetziger Stand</i>' : ''}</b><span class="z">${z.neu ? `<em>＋${z.neu}</em>` : ''}${z.aend ? `<em>✎${z.aend}</em>` : ''}${z.weg ? `<em>🗑${z.weg}</em>` : ''}</span>
        <small>${esc(v.name && v.wer ? v.wer + ' · ' : '')}${esc((v.aenderungen || [])[0] || ART[v.art] || '')}</small></button>`; }).join('') || '<p class="bph-mu" style="padding:.6rem">Keine Stände für diesen Filter.</p>'; };
    const rechts = () => {
      const v = D && D.versionen.find((x) => x.id === sel); if (!v) return '<p class="bph-mu">Links einen Stand wählen.</p>';
      const d = DET[v.id], i0 = D.versionen[0] === v;
      const Z = d ? (modus === 'jetzt' ? d.jetzt : d.geaendert) : null;
      const gr = []; (Z || []).forEach((z, k) => { let g = gr.find((x) => x.g === z.gruppe); if (!g) gr.push(g = { g: z.gruppe, z: [] }); g.z.push([z, k]); });
      const zeile = ([z, k]) => `<div class="bph-vx-ln"><i>${vIc(z.art)}</i><span>${esc(z.text)}${z.alt != null || z.neu != null ? `: ${z.art === 'neu' ? '' : `<s>${esc(z.alt ?? 'leer')}</s> → `}<b>${esc(z.neu ?? 'leer')}</b>` : z.art === 'neu' ? ' <small>neu</small>' : z.art === 'weg' ? ' <small>entfernt</small>' : ''}</span>
        ${z.art !== 'reihe' && !(modus === 'geaendert' && d.erster) ? `<button type="button" class="bph-btn" data-vteil="${k}" title="${modus === 'jetzt' ? 'Nur diese Stelle aus dem Stand übernehmen' : 'Nur diese Änderung zurücknehmen'}">↶</button>` : ''}</div>`;
      return `<div class="bph-vx-k"><b>${esc(vTag(v.wann))} ${vUhr(v.wann)}${v.wer ? ' · ' + esc(v.wer) : ''}</b>${v.name ? ` <span class="bph-badge on">★ ${esc(v.name)}</span>` : ''}${ART[v.art] && !v.name ? ` <span class="bph-badge">${ART[v.art]}</span>` : ''}</div>
        <div class="bph-vx-seg" role="tablist"><button type="button" class="${modus === 'geaendert' ? 'on' : ''}" data-vmod="geaendert">Was hat sich geändert</button><button type="button" class="${modus === 'jetzt' ? 'on' : ''}" data-vmod="jetzt"${i0 ? ' disabled title="Das ist der jetzige Stand"' : ''}>Unterschied zu jetzt</button></div>
        ${!d ? '<p class="bph-mu">Lade …</p>' : !Z.length ? `<p class="bph-mu">${modus === 'jetzt' ? 'Entspricht dem jetzigen Stand.' : d.erster ? 'Ausgangsstand – davor gibt es keinen Stand.' : 'Keine inhaltliche Änderung.'}</p>`
          : gr.map((g) => `<div class="bph-vx-gr">${g.g ? `<h6>${esc(g.g)}</h6>` : ''}${g.z.map(zeile).join('')}</div>`).join('')}`;
    };
    const draw = () => {
      const v = D && D.versionen.find((x) => x.id === sel), i0 = v && D.versionen[0] === v;
      root.innerHTML = `<div class="bph-dh"><b>Verlauf${D ? ' · ' + esc(D.titel) : ''}</b><button type="button" class="bph-btn" data-vsave>★ Jetzigen Stand benennen …</button><button type="button" class="bph-x" data-kclose aria-label="Schließen">×</button></div>
        <div class="bph-vx-fl">${[['alle', 'Alle'], ['name', '★ benannte'], ['ich', 'von mir']].map(([k, t]) => `<button type="button" class="${filt === k ? 'on' : ''}" data-vfilt="${k}">${t}</button>`).join('')}<input type="search" data-vsuch placeholder="In Änderungen suchen …" value="${esc(such)}"></div>
        ${msg ? `<p class="bph-msg" style="margin:.4rem 1rem">${esc(msg)}</p>` : ''}
        <div class="bph-vx-bd"><div class="bph-vx-l">${D ? links() : '<p class="bph-mu" style="padding:.6rem">Lade …</p>'}</div><div class="bph-vx-r">${D ? rechts() : ''}</div></div>
        <div class="bph-vx-ft"><span class="bph-mu">Wiederherstellen legt selbst einen Stand an – der jetzige bleibt erhalten. Kennwörter und Schlüssel bleiben unverändert.</span>
          ${v ? `<button type="button" class="bph-btn" data-vname2="${esc(v.name || '')}">${v.name ? 'Umbenennen' : '★ Benennen'}</button>${i0 ? '' : '<button type="button" class="bph-btn pri" data-vback2>↶ Diesen Stand wiederherstellen</button>'}` : ''}</div>`;
    };
    const holeDet = async (id) => { if (DET[id]) return; try { DET[id] = await KX(`api/bp/versionen/${id}/details`); } catch (e) { DET[id] = { geaendert: [], jetzt: [], erster: true }; msg = e.message; } if (sel === id) draw(); };
    const fertig = async () => { DET = {}; if (opt.nach) opt.nach(); await load(); };
    const load = async () => { try { D = await KX('api/bp/versionen?bereich=' + encodeURIComponent(opt.bereich)); } catch (e) { msg = e.message; }
      if (D && (!sel || !D.versionen.some((x) => x.id === sel))) sel = (D.versionen[1] || D.versionen[0] || {}).id || null;
      draw(); if (sel) holeDet(sel); };
    root.addEventListener('input', (e) => { if (e.target.matches('[data-vsuch]')) { such = e.target.value; const l = root.querySelector('.bph-vx-l'); if (l) l.innerHTML = links(); } });
    root.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-kclose]')) { close(); return; }
      const s1 = t.closest('[data-vsel]'); if (s1) { sel = +s1.dataset.vsel; if (modus === 'jetzt' && D.versionen[0].id === sel) modus = 'geaendert'; draw(); holeDet(sel); return; }
      const f = t.closest('[data-vfilt]'); if (f) { filt = f.dataset.vfilt; draw(); return; }
      const m = t.closest('[data-vmod]'); if (m && !m.disabled) { modus = m.dataset.vmod; draw(); return; }
      if (t.closest('[data-vsave]')) { const n = await bpEingabe('Name für den jetzigen Stand, z. B. „vor Umstellung“ – benannte Stände werden nie automatisch aufgeräumt.', '');
        if (!n || !n.trim()) return; try { D = await JS('api/bp/versionen', 'POST', { bereich: opt.bereich, name: n.trim() }); msg = 'Stand „' + n.trim() + '“ festgehalten.'; sel = D.versionen[0] && D.versionen[0].id; } catch (er) { msg = er.message; } draw(); if (sel) holeDet(sel); return; }
      const nb = t.closest('[data-vname2]'); if (nb) { const n = await bpEingabe('Name für diesen Stand (leer = Name entfernen):', nb.dataset.vname2); if (n === null) return;
        try { await JS(`api/bp/versionen/${sel}`, 'PATCH', { name: n }); } catch (er) { msg = er.message; } await load(); return; }
      if (t.closest('[data-vback2]')) { if (!(await bpFrage('Diesen Stand wiederherstellen? Der jetzige Stand bleibt im Verlauf erhalten und kann ebenso zurückgeholt werden.', { ok: 'Wiederherstellen' }))) return;
        try { await JS(`api/bp/versionen/${sel}/wiederherstellen`, 'POST'); } catch (er) { msg = er.message; draw(); return; }
        msg = 'Stand wiederhergestellt.'; if (opt.nach) await fertig(); else location.reload(); return; }
      const tb = t.closest('[data-vteil]'); if (tb) { const d = DET[sel], z = (modus === 'jetzt' ? d.jetzt : d.geaendert)[+tb.dataset.vteil]; if (!z) return;
        if (!(await bpFrage(`${modus === 'jetzt' ? 'Nur diese Stelle aus dem Stand übernehmen' : 'Nur diese Änderung zurücknehmen'}?\n„${z.text}“ – alles andere bleibt, wie es jetzt ist.`, { ok: 'Zurückholen' }))) return;
        try { await JS(`api/bp/versionen/${sel}/teil`, 'POST', { weg: z.weg, aus: modus === 'jetzt' ? 'stand' : 'davor' }); msg = `„${z.text}“ zurückgeholt.`; } catch (er) { msg = er.message; draw(); return; }
        if (opt.nach) await fertig(); else location.reload(); }
    });
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
  /* ---------- Vor Ort erkennen: iPhone-Kurzbefehl meldet den Standort, fehlt der Tagesbericht, kommt ein To-do (und abends eine Mail) ---------- */
  /* ---------- Kontaktmaske wie in „Adressen“ – aus jeder App: BPHead.kontaktMaske({ name, trade, … } | {id, …}, { basis }) → Kontakt oder null ----------
     Neu: Vorschläge aus dem Netz (OpenStreetMap) zum Namen, antippen übernimmt Anschrift, Telefon, E-Mail. */
  const KM_F = [['name', 'Firma / Name', 'w'], ['trade', 'Gewerk / Rolle', ''], ['role', 'Funktion', ''], ['contact_person', 'Ansprechpartner:in', 'w'],
    ['phone', 'Telefon', '', 'tel'], ['mobile', 'Mobil', '', 'tel'], ['email', 'E-Mail', '', 'email'], ['website', 'Internet', '', 'url'],
    ['street', 'Straße, Nr.', 'w'], ['zip', 'PLZ', '', 'text'], ['city', 'Ort', '']];
  /* weitere Nummern, Mails, Anschriften, Ansprechpartner – wie in „Adressen“ */
  const KM_WT = { tel: ['☎', 'Telefon', 'z. B. Zentrale, Büro'], mail: ['✉', 'E-Mail', 'z. B. Rechnungen'], adr: ['📍', 'Anschrift', 'z. B. Rechnungsanschrift'], person: ['👤', 'Ansprechpartner:in', 'Funktion, z. B. Bauleiter:in'] };
  const kmWtZeile = (x, i) => {
    const v = (k) => esc(x[k] || ''), [ic, t, ph] = KM_WT[x.typ] || KM_WT.tel, inp = (k, pl, ty, cl) => `<input data-kwt="${i}" data-wk="${k}"${ty ? ` type="${ty}"` : ''}${cl ? ` class="${cl}"` : ''} value="${v(k)}" placeholder="${pl}" autocomplete="off" aria-label="${pl}">`;
    const f = x.typ === 'adr' ? inp('street', 'Straße, Nr.', '', 'w2') + inp('zip', 'PLZ') + inp('city', 'Ort')
      : x.typ === 'person' ? inp('wert', 'Name') + inp('bez', ph) + inp('tel', 'Telefon', 'tel') + inp('mail', 'E-Mail', 'email')
      : inp('wert', t, x.typ === 'mail' ? 'email' : 'tel', 'w2');
    return `<div class="bph-kwt-z"><div class="bph-kwt-t"><span>${ic} ${t}</span>${x.typ === 'person' ? '' : inp('bez', ph)}<button type="button" class="bph-x" data-kwtx="${i}" title="Entfernen" aria-label="Entfernen">✕</button></div><div class="bph-kwt-f">${f}</div></div>`;
  };
  H.kontaktMaske = async function (vor = {}, opt = {}) {
    const B = opt.basis || '', neu = !vor.id;
    if (!neu) { try { const v = await KX(B + 'api/bp/kontakte?ids=' + vor.id); if (Array.isArray(v) && v[0]) vor = { ...vor, ...v[0] }; } catch { /* mit dem arbeiten, was da ist */ } }
    const c = { ...vor };
    let WTL = (c.weitere || []).map((x) => ({ ...x }));
    const sugB = H.app === 'bautagebuch' ? 'api/contacts/suggest' : 'api/bp/bt/contacts/suggest';
    return new Promise((fertig) => {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg bph-dm bph-kmk" role="dialog" aria-label="Kontakt" style="width:min(580px,96vw)"><div class="bph-dlg-h"><b>${neu ? 'Neuer Kontakt' : esc(c.name || 'Kontakt')}</b><button type="button" class="bph-x" data-kmx aria-label="Schließen">✕</button></div>
        <div class="bph-dm-b"><div class="bph-dm-g">${KM_F.map(([k, l, w, t]) => `<label class="bph-dm-f${w ? ' bph-dm-w' : ''}"><span>${l}</span><input data-kmf="${k}" type="${t || 'text'}" value="${esc(c[k] || '')}" autocomplete="off"${k === 'zip' ? ' inputmode="numeric"' : ''}></label>`).join('')}
          ${neu ? '<div class="bph-dm-w bph-kmsug" data-kmsug></div>' : ''}
          <div class="bph-dm-w bph-kwt"><div data-kwtbox></div><div class="bph-kwt-add">${Object.entries(KM_WT).map(([k, [ic]]) => `<button type="button" class="bph-btn" data-kwtadd="${k}">＋ ${ic} ${{ tel: 'Nummer', mail: 'E-Mail', adr: 'Anschrift', person: 'Ansprechpartner:in' }[k]}</button>`).join('')}</div></div>
          <label class="bph-dm-f bph-dm-w"><span>Notizen</span><textarea data-kmf="notes" rows="2">${esc(c.notes || '')}</textarea></label></div></div>
        <p class="bph-err" data-kmerr></p>
        <div class="bph-row" style="align-items:center"><span class="bph-mu" style="margin:0;flex:1">Dieselben Adressen wie in „Adressen“, im Bautagebuch und im Bauzeitenplan.</span><button type="button" class="bph-btn" data-kmx>Abbrechen</button><button type="button" class="bph-btn pri" data-kms>${neu ? 'Anlegen' : 'OK'}</button></div></div>`;
      document.body.appendChild(bg);
      const root = bg.firstChild, q = (a) => root.querySelector(a);
      let SUG = [], sT = 0, done = false;
      const wtLesen = () => root.querySelectorAll('[data-kwt]').forEach((el) => { const x = WTL[+el.dataset.kwt]; if (x) x[el.dataset.wk] = el.value; });
      const wtZeichnen = (fokus) => { const bx = q('[data-kwtbox]'); bx.innerHTML = WTL.map(kmWtZeile).join(''); if (fokus) { const l = bx.querySelectorAll('.bph-kwt-z'); const i = l[l.length - 1]?.querySelector('.bph-kwt-f input'); if (i) i.focus(); } };
      wtZeichnen();
      const ende = (k) => { if (done) return; done = true; bg.remove(); document.removeEventListener('keydown', esc1, true); fertig(k || null); };
      const esc1 = (e) => { if (e.key === 'Escape') { e.stopPropagation(); ende(null); } };
      document.addEventListener('keydown', esc1, true);
     
      const sug = (t) => {
        clearTimeout(sT); const box = q('[data-kmsug]'); if (!box) return; t = t.trim(); if (t.length < 3) { box.innerHTML = ''; return; }
        sT = setTimeout(async () => {
          let r = {}; try { r = await KX(B + sugB + '?q=' + encodeURIComponent(t)); } catch { return; }
          SUG = Array.isArray(r.items) ? r.items : [];
          box.innerHTML = SUG.length ? '<small class="bph-mu">Vorschläge aus dem Netz – antippen zum Übernehmen</small>' + SUG.map((x, i) => `<button type="button" class="bph-kf-o" data-kmsg="${i}"><b>${esc(x.name)}</b><small>${esc([x.trade, [x.street, [x.zip, x.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), x.phone].filter(Boolean).join(' · '))}</small></button>`).join('') : '';
        }, 350);
      };
      root.addEventListener('input', (e) => { if (neu && e.target.dataset.kmf === 'name') sug(e.target.value); });
      root.addEventListener('click', async (e) => {
        if (e.target.closest('[data-kmx]')) return ende(null);
        const wa = e.target.closest('[data-kwtadd]'); if (wa) { wtLesen(); WTL.push({ typ: wa.dataset.kwtadd }); wtZeichnen(true); return; }
        const wx = e.target.closest('[data-kwtx]'); if (wx) { wtLesen(); WTL.splice(+wx.dataset.kwtx, 1); wtZeichnen(); return; }
        const sg = e.target.closest('[data-kmsg]');
        if (sg) {
          let x = SUG[+sg.dataset.kmsg]; if (!x) return;
          if (x.osm_id) { try { x = { ...x, ...(await KX(B + sugB + `/detail?type=${encodeURIComponent(x.osm_type)}&id=${x.osm_id}`)) }; } catch { /* egal */ } }
          const set = (k, v) => { const el = q(`[data-kmf="${k}"]`); if (el && v && !el.value.trim()) el.value = v; };
          if (x.name) q('[data-kmf="name"]').value = x.name;
          ['street', 'zip', 'city', 'phone', 'email', 'website'].forEach((k) => set(k, x[k]));
          q('[data-kmsug]').innerHTML = '<small class="bph-mu">Übernommen – bitte prüfen.</small>'; return;
        }
        if (!e.target.closest('[data-kms]')) return;
        const d = {}; root.querySelectorAll('[data-kmf]').forEach((el) => { d[el.dataset.kmf] = el.value; });
        wtLesen(); d.weitere = WTL.filter((x) => ['wert', 'street', 'city', 'tel', 'mail'].some((k) => (x[k] || '').trim()));
        if (!d.name.trim()) { q('[data-kmerr]').textContent = 'Bitte einen Namen eingeben.'; q('[data-kmf="name"]').focus(); return; }
        try {
          const r = await KX(B + 'api/bp/kontakte' + (neu ? '' : '/' + c.id), { method: neu ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
          if (window.toast) toast(neu ? 'Kontakt angelegt.' : 'Kontakt gespeichert.');
          ende(r.kontakt);
        } catch (er) { q('[data-kmerr]').textContent = er.message; }
      });
      const n = q('[data-kmf="name"]'); setTimeout(() => { n.focus(); n.setSelectionRange(n.value.length, n.value.length); if (neu) sug(n.value); }, 30);
    });
  };
  /* Kontaktkarte mit Verweisen: Name/Anschrift öffnet den Kontakt, Telefon wählt, E-Mail schreibt */
  const kLinks = (k, feld) => {
    const adr = [k.street, [k.zip, k.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const tel = k.phone || k.mobile, telH = String(tel || '').replace(/[^\d+]/g, '');
    return [`<a href="#" class="bph-kf-a" data-kfe="${esc(feld)}" title="Kontakt öffnen">${esc(adr || k.name || 'Kontakt')}</a>`, esc(k.contact_person || ''),
      tel ? `<a href="tel:${esc(telH)}" title="Anrufen">☎ ${esc(tel)}</a>` : '',
      ...String(k.email || '').split(/[,;]\s*/).filter(Boolean).map((m) => `<a href="mailto:${esc(m.trim())}" title="E-Mail schreiben">✉ ${esc(m.trim())}</a>`)].filter(Boolean).join(' · ');
  };
  const kAdr = (k) => [[k.street, [k.zip, k.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), k.contact_person, k.phone || k.mobile ? '☎ ' + (k.phone || k.mobile) : '', k.email ? '✉ ' + k.email : ''].filter(Boolean).join(' · ');

  /* ---------- Stammdaten-Maske (Projekt mit Bauherr, LV, Angebot, Auftrag) – eine Maske für alle Apps ----------
     o: { titel, unter, gruppen: [{titel, felder:[{k,l,typ,opt?,hilfe?}]}], werte, zusatz(k, werte) → html neben dem Feld,
          speichern: async (werte, extra) → {werte?, hinweis?} , knoepfe: html in der Fußzeile, klick(e, ctx) } */
  H.datenMaske = function (o) {
    let W = { ...(o.werte || {}) }, msg = '', dirty = false;
    const KC = {}, KF = {}, gefragt = {}, B = o.basis || '';   // KC: Kontakt-ID → Kontakt · KF: Feld → Felddefinition (Typ kontakt)
    o.gruppen.forEach((g) => g.felder.forEach((f) => { if (f.typ === 'kontakt') KF[f.k] = f; }));
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = '<div class="bph-dlg bph-dm" role="dialog" style="width:min(580px,96vw)"></div>'; document.body.appendChild(bg);
    const root = bg.firstChild, e1 = (e) => {
      if (e.key === 'Escape') zu();
      else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.matches && e.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=date]):not([type=time]):not([list]):not([data-kfi])')
        && root.contains(e.target) && !document.querySelector('.bp-vs') && [...document.querySelectorAll('.bph-dlg-bg, .modal-bg')].pop() === bg) { e.preventDefault(); const b = root.querySelector('[data-dms]'); if (b) b.click(); }   // Enter = OK
    };
    const zu = async () => { if (dirty && !(await (window.bpFrage ? bpFrage('Änderungen verwerfen?', { ok: 'Verwerfen' }) : Promise.resolve(true)))) return; bg.remove(); document.removeEventListener('keydown', e1); };
    document.addEventListener('keydown', e1);
    const de = (v) => (v == null ? '' : String(v).replace('.', ','));
    const feld = (f) => {
      const v = W[f.k], id = 'dm_' + f.k, z = o.zusatz ? o.zusatz(f.k, W) || '' : '';
      const hilfe = f.hilfe ? `<small class="bph-mu" style="margin:.1rem 0 0">${esc(f.hilfe)}</small>` : '';
      if (f.typ === 'check') return `<label class="bph-ck bph-dm-w"><input type="checkbox" id="${id}" data-dm="${f.k}"${v ? ' checked' : ''}> ${esc(f.l)}</label>`;
      if (f.typ === 'html') return `<div class="bph-dm-w">${z}</div>`;   // nur Anzeige/Knöpfe (zusatz), kein Wert
      if (f.typ === 'chips') {   // Mehrfachauswahl (z. B. zuständige Bauleiter): opt = [{id, name}], Wert = Liste der ids
        const L_ = Array.isArray(v) ? v : [];
        return `<div class="bph-dm-f bph-dm-w"><span>${esc(f.l)}</span><span class="bph-chips">${(f.opt || []).map((u) => `<button type="button" class="bph-chip${L_.includes(u.id) ? ' on' : ''}" data-dmchip="${f.k}" data-v="${esc(u.id)}" aria-pressed="${L_.includes(u.id)}">${esc(u.name)}</button>`).join('') || '<small>–</small>'}</span>${z}${hilfe}</div>`;
      }
      if (f.typ === 'kontakt') {
        const kc = KC[W[f.k + '_kid']];
        const karte = kc ? `<span class="bph-kf-c"><span>${kLinks(kc, f.k) || '<i>keine Anschrift im Kontakt</i>'}</span><button type="button" class="bph-btn" data-kfe="${f.k}" title="Kontakt bearbeiten (gilt überall)">✎</button><button type="button" class="bph-btn" data-kfx="${f.k}" title="Verbindung lösen">×</button></span>`
          : v ? `<span class="bph-kf-c bph-kf-oh"><span>noch kein Kontakt</span><button type="button" class="bph-btn" data-kfn="${f.k}">＋ als Kontakt anlegen</button></span>` : '';
        return `<div class="bph-dm-f bph-dm-w"><span>${esc(f.l)}</span><span class="bph-kf" data-kf="${f.k}"><input id="${id}" data-dm="${f.k}" data-kfi="${f.k}" value="${esc(v || '')}" autocomplete="off" placeholder="Name eintippen – sucht in den Kontakten" role="combobox" aria-autocomplete="list"><span class="bph-kf-l" data-kfl hidden></span></span>${karte}${z}${hilfe}</div>`;
      }
      let inp;
      if (f.typ === 'textarea') inp = `<textarea id="${id}" data-dm="${f.k}" rows="3">${esc(v || '')}</textarea>`;
      else if (f.typ === 'select') inp = `<select id="${id}" data-dm="${f.k}">${(f.opt || []).map((x) => `<option value="${esc(x)}"${(v || '') === x ? ' selected' : ''}>${esc(x || '–')}</option>`).join('')}</select>`;
      else inp = `<input id="${id}" data-dm="${f.k}" type="${{ date: 'date', time: 'time', mail: 'email', tel: 'tel' }[f.typ] || 'text'}"${['zahl', 'eur', 'prozent'].includes(f.typ) ? ' inputmode="decimal"' : ''}${f.liste && (o.listen || {})[f.liste] ? ` list="${id}-l" autocomplete="off"` : ''} value="${esc(['zahl', 'eur', 'prozent'].includes(f.typ) ? de(v) : v || '')}">${f.liste && (o.listen || {})[f.liste] ? `<datalist id="${id}-l">${o.listen[f.liste].map((x) => (Array.isArray(x) ? `<option value="${esc(x[0])}" label="${esc(x[0] + ' ' + x[1])}">${esc(x[1])}</option>` : `<option value="${esc(x)}">`)).join('')}</datalist>` : ''}`;   // Textergänzung: o.listen[f.liste] = ['…'] oder [[Wert, Bezeichnung]]
      const einheit = { eur: '€', prozent: '%' }[f.typ];
      return `<label class="bph-dm-f bph-dm-sg${f.typ === 'textarea' || f.breit ? ' bph-dm-w' : ''}" for="${id}"><span>${esc(f.l)}</span><span class="bph-dm-i">${inp}${einheit ? `<em>${einheit}</em>` : ''}</span><span class="bph-dm-x">${z}${hilfe}</span></label>`;
    };
    const draw = () => {   // neu zeichnen, ohne dass die Maske nach oben springt
      const sb = root.querySelector('.bph-dm-b'), st = sb ? sb.scrollTop : 0;
      root.innerHTML = `<div class="bph-dlg-h"><b>${esc(o.titel)}</b>${o.unter ? `<span class="bph-mu" style="margin:0 0 0 .5rem">${esc(o.unter)}</span>` : ''}<button class="bph-x" data-dmx aria-label="Schließen">✕</button></div>
        <div class="bph-dm-b">${o.gruppen.map((g) => `<fieldset><legend>${esc(g.titel)}</legend><div class="bph-dm-g">${g.felder.map(feld).join('')}</div></fieldset>`).join('')}</div>
        <div class="bph-row" style="align-items:center;margin-top:.6rem">${o.knoepfe || ''}<span class="bph-mu" data-dmm style="margin:0;flex:1">${esc(msg)}</span><button class="bph-btn" data-dmx>Abbrechen</button><button class="bph-btn pri" data-dms>OK</button></div>`;   // wie in allen Fenstern: Abbrechen verwirft, OK speichert und schließt
      const nb = root.querySelector('.bph-dm-b'); if (nb && st) nb.scrollTop = st;
    };
    const lesen = () => { root.querySelectorAll('[data-dm]').forEach((i) => { W[i.dataset.dm] = i.type === 'checkbox' ? i.checked : i.value; }); };
    root.addEventListener('input', () => { dirty = true; });
    root.addEventListener('change', () => { dirty = true; });
    /* Kontaktfelder: tippen sucht in den Kontakten; nichts gefunden → „neu anlegen?“ → gewohnte Kontaktmaske */
    let kfT = 0, kfL = [], kfI = -1;
    const kfBox = (k) => root.querySelector(`[data-kf="${k}"] [data-kfl]`);
    const kfZu = () => root.querySelectorAll('[data-kfl]').forEach((b) => { b.hidden = true; b.innerHTML = ''; });
    const kfSetzen = (k, kc) => { lesen(); if (kc) { KC[kc.id] = kc; W[k] = kc.name; W[k + '_kid'] = kc.id; } else W[k + '_kid'] = null; gefragt[k] = W[k]; dirty = true; draw(); };
    const kfZeigen = (k) => {
      const box = kfBox(k), t = (root.querySelector(`[data-kfi="${k}"]`) || {}).value || ''; if (!box) return;
      box.innerHTML = kfL.map((x, i) => `<button type="button" class="bph-kf-o${i === kfI ? ' on' : ''}" data-kfw="${i}" tabindex="-1"><b>${esc(x.name)}</b><small>${esc([x.trade, kAdr(x)].filter(Boolean).join(' · '))}</small></button>`).join('')
        + (t.trim() ? `<button type="button" class="bph-kf-o bph-kf-neu${kfI === kfL.length ? ' on' : ''}" data-kfn="${k}" tabindex="-1">＋ „${esc(t.trim())}“ als neuen Kontakt anlegen</button>` : '');
      box.hidden = !box.innerHTML;
    };
    const kfNeu = async (k) => {
      lesen(); const f = KF[k], t = (W[k] || '').trim();
      const vor = { name: t, trade: f.rolle || '' };
      if (k === 'bauherr') Object.assign(vor, { street: W.bh_strasse || '', zip: W.bh_plz || '', city: W.bh_ort || '', phone: W.bh_tel || '', email: W.bh_mail || '' });   // frühere Freitextangaben
      if (k === 'ansprech') Object.assign(vor, { contact_person: t, phone: W.tel || '', email: W.mail || '' });
      if (k === 'bauleiter_an') Object.assign(vor, { contact_person: t, phone: W.an_tel || '', email: W.an_mail || '' });
      const kc = await H.kontaktMaske(vor, { basis: B });
      if (kc) kfSetzen(k, kc); else { gefragt[k] = t; setTimeout(() => { const i = root.querySelector(`[data-kfi="${k}"]`); if (i) i.focus(); }, 30); }
    };
    root.addEventListener('input', (e) => {
      const k = e.target.dataset && e.target.dataset.kfi; if (!k) return;
      W[k + '_kid'] = null; W[k] = e.target.value; const kc = root.querySelector(`[data-kf="${k}"] ~ .bph-kf-c`); if (kc) kc.remove();
      clearTimeout(kfT); const t = e.target.value.trim(); kfI = -1;
      if (!t) { kfL = []; kfZu(); return; }
      kfT = setTimeout(async () => {
        try { kfL = await KX(B + 'api/bp/kontakte?q=' + encodeURIComponent(t) + '&rolle=' + encodeURIComponent(KF[k].rolle || '')); } catch { kfL = []; }
        if (document.activeElement === e.target && e.target.value.trim() === t) kfZeigen(k);
      }, 180);
    });
    root.addEventListener('keydown', (e) => {
      const k = e.target.dataset && e.target.dataset.kfi; if (!k) return;
      const box = kfBox(k), n = kfL.length + (e.target.value.trim() ? 1 : 0);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!n) return; e.preventDefault(); const ab = e.key === 'ArrowDown'; kfI = kfI < 0 ? (ab ? 0 : n - 1) : (kfI + (ab ? 1 : -1) + n) % n; kfZeigen(k); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (box && !box.hidden && kfI >= 0) { const b = box.querySelectorAll('.bph-kf-o')[kfI]; if (b) b.click(); } else e.target.blur(); return; }
      if (e.key === 'Escape' && box && !box.hidden) { e.stopPropagation(); kfZu(); }
    });
    root.addEventListener('mousedown', (e) => { if (e.target.closest('.bph-kf-o')) e.preventDefault(); });   // Fokus bleibt im Feld
    root.addEventListener('focusout', (e) => {
      const k = e.target.dataset && e.target.dataset.kfi; if (!k) return;
      const nach = e.relatedTarget;
      setTimeout(async () => {
        if (!root.isConnected || !e.target.isConnected || document.activeElement === e.target) return;
        kfZu(); const t = (e.target.value || '').trim();
        if (!t || W[k + '_kid'] || gefragt[k] === t) return;
        const gleich = kfL.find((x) => x.name.toLowerCase() === t.toLowerCase());
        if (gleich) { kfSetzen(k, gleich); return; }   // genau dieser Name ist ein Kontakt: verbinden
        if (nach && nach.closest && nach.closest('[data-dmx]')) return;
        gefragt[k] = t;
        if (window.bpFrage && await bpFrage(`„${t}“ gibt es in den Kontakten noch nicht. Als neuen Kontakt anlegen?`, { ok: 'Neu anlegen' })) kfNeu(k);
      }, 150);
    });
    root.addEventListener('click', async (e) => {
      if (e.target.closest('[data-dmx]')) { zu(); return; }
      const kw = e.target.closest('[data-kfw]'); if (kw) { const kc = kfL[+kw.dataset.kfw], k = kw.closest('[data-kf]').dataset.kf; kfZu(); if (kc) { kfSetzen(k, kc); const i = root.querySelector(`[data-kfi="${k}"]`); if (i) i.focus({ preventScroll: true }); } return; }
      const kn = e.target.closest('[data-kfn]'); if (kn) { kfZu(); kfNeu(kn.dataset.kfn); return; }
      const ke = e.target.closest('[data-kfe]');
      if (ke) { e.preventDefault(); const k = ke.dataset.kfe, kc = await H.kontaktMaske(KC[W[k + '_kid']], { basis: B }); if (kc) kfSetzen(k, kc); return; }
      const kx = e.target.closest('[data-kfx]'); if (kx) { kfSetzen(kx.dataset.kfx, null); return; }
      const ch = e.target.closest('[data-dmchip]');
      if (ch) { lesen(); const k = ch.dataset.dmchip, f = Object.values(o.gruppen).flatMap((g) => g.felder).find((x) => x.k === k), id = (f.opt || []).find((u) => String(u.id) === ch.dataset.v);
        const L_ = Array.isArray(W[k]) ? [...W[k]] : []; const i = L_.indexOf(id.id); if (i >= 0) L_.splice(i, 1); else L_.push(id.id); W[k] = L_; dirty = true; draw(); return; }
      const ctx = { werte: () => { lesen(); return W; }, setzen: (k, v) => { lesen(); W[k] = v; dirty = true; draw(); }, nachricht: (t) => { msg = t; const m = root.querySelector('[data-dmm]'); if (m) m.textContent = t; } };
      if (o.klick && await o.klick(e, ctx)) return;
      if (e.target.closest('[data-dms]')) {
        lesen(); ctx.nachricht('speichere …');
        try { const r = await o.speichern(W, ctx) || {}; dirty = false; zu();   // OK: gespeichert – Fenster zu; ein Hinweis über „Gespeichert.“ hinaus kommt als Meldung
          if (r.hinweis && r.hinweis !== 'Gespeichert.' && window.toast) window.toast(r.hinweis); }
        catch (er) { ctx.nachricht(er.message); }
      }
    });
    const kLaden = async () => {   // Anschrift/Telefon der verbundenen Kontakte
      const ids = Object.keys(KF).map((k) => W[k + '_kid']).filter((x) => x && !KC[x]);
      if (!ids.length) return;
      try { (await KX(B + 'api/bp/kontakte?ids=' + ids.join(','))).forEach((x) => { KC[x.id] = x; }); } catch { return; }
      if (!root.isConnected) return;
      const a = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : '';
      lesen(); draw(); const f = a && root.querySelector('#' + a); if (f) f.focus();
    };
    draw(); kLaden();
    setTimeout(() => { const i = root.querySelector('input:not([data-kfi]),textarea,select'); if (i) i.focus(); }, 30);
    return { zu, neu: (w) => { W = { ...w }; draw(); kLaden(); } };
  };
  const tagDe = (iso) => (iso ? iso.split('-').reverse().join('.') : '');
  /* Projektdaten (Bauherr, Projekt, Termine) – aus Verwaltung, AVA und Baukosten dieselbe Maske */
  /* Projekt löschen (nur Administratoren): ankreuzen, aus welchen Apps – angekreuzte Teile kommen in den Papierkorb (Startseite), der Rest bleibt.
     Derselbe Ablauf wie in der Verwaltung → Projekte. */
  /* Was im Projekt steckt – genannt wird nur, was Inhalt hat (für den Lösch-Dialog hier und in der Verwaltung) */
  H.projektInhalt = (bt) => { const t = [[bt.reports, 'Tagesbericht', 'e'], [bt.images, 'Foto', 's'], [bt.lvs, 'LV', 's']].filter((x) => x[0] > 0).map(([n, w, e]) => `${n} ${w}${n === 1 ? '' : e}`);
    return (t.length ? 'enthält ' + t.join(', ') : 'noch ohne Inhalt') + ' – Aufgaben und Pläne des Projekts gehen mit'; };
  H.projektLoeschen = async function (pid, fertig) {
    let T; try { T = await KX(`api/bp/projekt/${pid}/teile`); } catch (e) { bpHinweis(e.message); return; }
    const opts = [['bt', T.bt.id, `<b>Das Projekt selbst</b><small>${H.projektInhalt(T.bt)}</small>`],
      ...T.plans.map((x) => ['plan', x.id, `<b>Bauzeitenplan „${esc(x.name)}“</b><small>mit ${x.versions} gespeicherten Versionen</small>`]),
      ...T.bks.map((x) => ['bk', x.id, `<b>Kostenermittlung „${esc(x.name)}“</b><small>mit Raumbuch, Schätzungen und ${x.files} Plänen (PDF)</small>`])];
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Projekt löschen" style="width:min(520px,96vw)"><div class="bph-dh"><b>Was soll gelöscht werden?</b><button type="button" class="bph-x" data-lx aria-label="Schließen">✕</button></div><div class="bph-db">
      <p class="bph-mu" style="margin-top:0">„${esc(T.name)}“ – angekreuzte Teile kommen in den Papierkorb (Startseite) und lassen sich dort wiederherstellen, alles andere bleibt.</p>
      <div class="bph-ldl">${opts.map(([, , l], n) => `<label><input type="checkbox" data-ln="${n}"${opts.length === 1 ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <div class="bph-row" style="justify-content:flex-end;margin-top:.8rem"><button type="button" class="bph-btn" data-lx>Abbrechen</button><button type="button" class="bph-btn bph-bad" data-lok${opts.length === 1 ? '' : ' disabled'}>🗑 In den Papierkorb</button></div></div></div>`;
    document.body.appendChild(bg);
    const sel = () => [...bg.querySelectorAll('[data-ln]:checked')].map((c) => opts[+c.dataset.ln]);
    bg.addEventListener('change', () => { bg.querySelector('[data-lok]').disabled = !sel().length; });
    bg.addEventListener('click', async (e) => {   // daneben klicken schließt nicht
      if (e.target.closest('[data-lx]')) { bg.remove(); return; }
      const ok = e.target.closest('[data-lok]'); if (!ok) return;
      const S = sel(); if (!S.length) return;
      ok.disabled = true; ok.textContent = 'Lösche …';
      try {
        const r = await KX(`api/bp/projekt/${pid}/loeschen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bt: S.some((o) => o[0] === 'bt'), plans: S.filter((o) => o[0] === 'plan').map((o) => o[1]), bks: S.filter((o) => o[0] === 'bk').map((o) => o[1]) }) });
        bg.remove();
        const t = 'Im Papierkorb: ' + r.done.join(', ') + (r.errors.length ? ' – Fehler: ' + r.errors.join('; ') : '');
        if (window.toast) toast(t, !!r.errors.length); else bpHinweis(t);
        if (S.some((o) => o[0] === 'bt') && H.projekt && H.projekt.id === +pid) { H.projekt = null; try { await KX('api/bp/projekt', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: null }) }); } catch { /* egal */ } }
        if (fertig) fertig(r); else setTimeout(() => location.reload(), 1200);
      } catch (er) { ok.disabled = false; ok.textContent = '🗑 In den Papierkorb'; bpHinweis(er.message); }
    });
  };
  H.projektDaten = async function (pid, basis, opt = {}) {
    if (!opt.onDelete && H.me && H.me.is_admin) opt = { ...opt, onDelete: (P) => H.projektLoeschen(P.id) };   // Administratoren: „In den Papierkorb …“ auch hier
    const url = (basis || '') + `api/bp/projekt/${pid}/daten`;
    const B = (basis || '') + (H.app === 'bautagebuch' ? 'api/' : 'api/bp/bt/');
    const J = (u, m, b) => KX(B + u, m ? { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined } : {});
    let D, P = null, LEAD = [];
    try { [D, LEAD] = await Promise.all([KX(url), J('leaders').catch(() => [])]); P = D.satz || null; }   // Bauvorhaben kommt mit den Projektdaten (nicht mehr die ganze Projektliste)
    catch (e) { (window.toast || alert)(e.message, true); return; }
    let inPlan = false;
    const PF = ['p_name', 'p_street', 'p_zip', 'p_city', 'p_folder', 'p_leaders'];
    const pos = { lat: P ? P.lat : null, lon: P ? P.lon : null, geaendert: false };
    const vorn = P ? [{ titel: 'Bauvorhaben', felder: [
      { k: 'p_name', l: 'Bauvorhaben *', typ: 'text', breit: true, hilfe: 'Projektnummer und Name, z. B. A541 Schürmannstr. 4, Bottrop' },
      { k: 'p_street', l: 'Straße und Hausnummer', typ: 'text', breit: true }, { k: 'p_zip', l: 'PLZ', typ: 'text' }, { k: 'p_city', l: 'Ort', typ: 'text' },
      { k: 'p_karte', l: '', typ: 'html' },
      { k: 'p_leaders', l: 'Zuständige Bauleiter:in', typ: 'chips', opt: LEAD.map((u) => ({ id: u.id, name: u.name })), hilfe: 'Niemand ausgewählt: alle Benutzer:innen sehen das Projekt; sonst nur die Ausgewählten und die Administratoren.' },
      { k: 'p_folder', l: 'Projektordner auf dem Server', typ: 'text', breit: true, hilfe: 'leer = automatisch über das Kürzel; Unterordner mit /' }] }] : [];
    const W0 = P ? { p_name: P.name || '', p_street: P.street || '', p_zip: P.zip || '', p_city: P.city || '', p_folder: P.folder || '', p_leaders: [...(P.leaders || [])] } : {};
    const karte = () => { const q = pos.lat != null && pos.lon != null ? pos.lat + ',' + pos.lon : ''; if (!q) return ''; const e = encodeURIComponent(q);
      return `<div class="bph-map"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte" src="https://www.google.com/maps?q=${e}&hl=de&z=15&output=embed"></iframe><a href="https://www.google.com/maps/dir/?api=1&destination=${e}&travelmode=driving" target="_blank" rel="noopener">Route dorthin planen ↗</a></div>`; };
    /* Felder für Ausdrucke: eigene Felder der Druck-Layouts „je Projekt“ (Verwaltung → Druck-Layouts) – Schlüssel „dw:<feld>“ */
    const druckGruppe = () => ((D.druck || []).length ? [{ titel: 'Felder für Ausdrucke', felder: D.druck.map((x) => ({ k: 'dw:' + x.key, l: x.name, typ: 'text', breit: true, hilfe: x.hilfe || 'eigenes Feld der Druck-Layouts – steht auf jedem Ausdruck dieses Projekts' })) }] : []);
    const druckWerte = () => Object.fromEntries((D.druck || []).map((x) => ['dw:' + x.key, x.wert || '']));
    const M = H.datenMaske({
      titel: 'Projektdaten', unter: D.projekt, gruppen: [...vorn, ...D.felder, ...druckGruppe()], werte: { ...W0, ...D.werte, ...druckWerte() }, basis: basis || '',
      zusatz: (k) => {
        if (k === 'p_karte') return `<span class="bph-dm-z" style="flex-wrap:wrap"><button type="button" class="bph-btn" data-pgeo>Adresse suchen</button>${hatBT() ? `<button type="button" class="bph-btn" data-phier>Aktuellen Standort übernehmen</button>
          <span class="bph-mu">${pos.lat != null ? 'Standort gespeichert – das Bautagebuch wählt das Projekt automatisch, wenn du vor Ort bist.' : 'Noch kein Standort: Adresse eintragen und „Adresse suchen“ oder „Aktuellen Standort übernehmen“.'}</span>` : ''}</span>${karte()}`;
        if (k === 'p_folder') return '<span class="bph-dm-z bph-mu" data-pordner>Ordner wird gesucht …</span>';
        if (k === 'baubeginn') return `<span class="bph-dm-z">${D.plan.start ? `Bauzeitenplan: ${tagDe(D.plan.start)} <button type="button" class="bph-btn" data-plan="baubeginn">übernehmen</button>` : ''}${D.plan.plaene.length ? `<label class="bph-ck" style="margin:.2rem 0 0"><input type="checkbox" data-inplan${inPlan ? ' checked' : ''}> beim Speichern als Projektanfang in den Bauzeitenplan übertragen</label>` : '<span class="bph-mu">kein Bauzeitenplan verknüpft</span>'}</span>`;
        if (k === 'gemarkung') return `<span class="bph-dm-z"><button type="button" class="bph-btn" data-kataster title="Gemarkung, Flur, Flurstück und Geländehöhe über NHN an der Baustelle – amtliche Daten von Geobasis NRW (wie TIM-online)">📍 aus ALKIS ermitteln (TIM-online)</button><span data-katinfo class="bph-mu"></span></span>`;
        if (k === 'fertigstellung' && D.plan.ende) return `<span class="bph-dm-z">Bauzeitenplan: ${tagDe(D.plan.ende)} <button type="button" class="bph-btn" data-plan="fertigstellung">übernehmen</button></span>`;
        return '';
      },
      klick: async (e, ctx) => {
        if (e.target.closest('[data-pgeo]')) {   // Adresse (oder Projektname) im Netz suchen → Straße, PLZ, Ort, Standort
          const W = ctx.werte(), a = [W.p_street, [W.p_zip, W.p_city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
          try { const g = await J('geocode?q=' + encodeURIComponent(a || W.p_name) + (a ? '' : '&from_name=1'));
            if (!g.found) { ctx.nachricht('Adresse nicht gefunden – bitte Straße, PLZ und Ort eintragen.'); return true; }
            Object.assign(pos, { lat: g.lat, lon: g.lon, geaendert: true }); ctx.setzen('p_street', g.street); ctx.setzen('p_zip', g.zip); ctx.setzen('p_city', g.city); ctx.nachricht('Adresse gefunden – bitte prüfen und speichern.');
          } catch (er) { ctx.nachricht(er.message); }
          return true;
        }
        if (e.target.closest('[data-phier]')) {
          if (!navigator.geolocation) { ctx.nachricht('Standort nicht verfügbar.'); return true; }
          navigator.geolocation.getCurrentPosition(async (g) => {
            Object.assign(pos, { lat: g.coords.latitude, lon: g.coords.longitude, geaendert: true });
            try { const r = await J(`geo?lat=${pos.lat}&lon=${pos.lon}`); if (!r.error) { ctx.setzen('p_street', r.street || ''); ctx.setzen('p_zip', r.plz || ''); ctx.setzen('p_city', r.city || ''); } } catch { ctx.setzen('p_city', ctx.werte().p_city); }
            ctx.nachricht('Standort übernommen – bitte speichern.');
          }, () => ctx.nachricht('Der Standort ist nicht verfügbar – bitte im Browser erlauben.'), { enableHighAccuracy: true, timeout: 10000 });
          return true;
        }
        if (e.target.closest('[data-parch]')) { const alt = !!(P && P.archived); try { await J('projects/' + pid, 'PUT', { archived: alt ? 0 : 1 }); P.archived = !alt; ctx.nachricht(alt ? 'Aus dem Archiv geholt.' : 'Projekt archiviert.'); if (opt.onSaved) opt.onSaved(pid); } catch (er) { ctx.nachricht(er.message); } return true; }
        if (e.target.closest('[data-pdel]')) { M.zu(); opt.onDelete(P); return true; }
        const b = e.target.closest('[data-plan]'); if (b) { ctx.setzen(b.dataset.plan, b.dataset.plan === 'baubeginn' ? D.plan.start : D.plan.ende); return true; }
        if (e.target.closest('[data-inplan]')) { inPlan = e.target.checked; return true; }
        const kb = e.target.closest('[data-kataster]');
        if (kb) {
          kb.disabled = true; const alt = kb.textContent; kb.textContent = '📍 frage Geobasis NRW …';
          try {
            const r = await KX((basis || '') + `api/bp/projekt/${pid}/kataster`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            const W = ctx.werte(), neu = r.werte || {};
            const alt2 = ['gemarkung', 'flur', 'flurstueck', 'hoehe_nhn'].filter((x) => W[x] && neu[x] && String(W[x]).trim() !== String(neu[x]).trim());
            if (alt2.length && !(await bpFrage('Vorhandene Angaben überschreiben?\n\n' + alt2.map((x) => `${{ gemarkung: 'Gemarkung', flur: 'Flur', flurstueck: 'Flurstück', hoehe_nhn: 'Höhe über NHN' }[x]}: ${W[x]} → ${neu[x]}`).join('\n')))) { kb.disabled = false; kb.textContent = alt; return true; }
            for (const [x, v] of Object.entries(neu)) ctx.setzen(x, v);
            ctx.nachricht('');   // keine Meldung: die Felder zeigen das Ergebnis
          } catch (er) { kb.disabled = false; kb.textContent = alt; ctx.nachricht(er.message); }
          return true;
        }
        return false;
      },
      speichern: async (W) => {
        let hinweis = '';
        if (P) {   // Bauvorhaben, Anschrift, Bauleiter, Ordner: im Bautagebuch (Standort, Ablage, Sichtbarkeit)
          const name = (W.p_name || '').trim().replace(/\s+/g, ' ');
          if (!name) throw new Error('Bitte einen Namen für das Bauvorhaben eingeben.');
          const body = {}, map = { p_name: 'name', p_street: 'street', p_zip: 'zip', p_city: 'city', p_folder: 'folder' };
          for (const [k, f] of Object.entries(map)) { const v = (W[k] || '').trim().replace(/\s+/g, ' '); if (v !== (P[f] || '')) body[f] = v; }
          if (JSON.stringify([...(W.p_leaders || [])].sort()) !== JSON.stringify([...(P.leaders || [])].sort())) body.leaders = W.p_leaders || [];
          if (pos.geaendert) { body.lat = pos.lat; body.lon = pos.lon; if (body.street === undefined) body.street = W.p_street || ''; if (body.zip === undefined) body.zip = W.p_zip || ''; if (body.city === undefined) body.city = W.p_city || ''; }
          if (Object.keys(body).length) {
            const r0 = await J('projects/' + pid, 'PUT', body);
            Object.assign(P, body, { leaders: body.leaders || P.leaders }); pos.geaendert = false;
            if (r0 && r0.geocoded === false) hinweis = 'Adresse nicht gefunden – bitte prüfen. ';
            if (H.projekt && H.projekt.id === +pid) H.projekt = null;
          }
        }
        const rest = Object.fromEntries(Object.entries(W).filter(([k]) => !PF.includes(k) && !k.startsWith('dw:')));
        const druck = Object.fromEntries(Object.entries(W).filter(([k]) => k.startsWith('dw:')).map(([k, v]) => [k.slice(3), String(v || '').trim()]));
        const r = await KX(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ werte: rest, in_plan: inPlan, ...(Object.keys(druck).length ? { druck } : {}) }) }); D = r; inPlan = false;
        if (opt.onSaved) setTimeout(() => opt.onSaved(pid), 0);
        return { werte: { ...W, ...r.werte, ...druckWerte() }, hinweis: hinweis + (r.hinweis || 'Gespeichert – gilt in allen Apps.') };
      },
      knoepfe: (H.verlaufKnopf ? H.verlaufKnopf(`bp:projektdaten:${pid}`, 'Verlauf') : '')
        + (opt.archiv && P ? `<button type="button" class="bph-btn" data-parch>${P.archived ? 'Aus dem Archiv holen' : 'Projekt archivieren'}</button>` : '')
        + (opt.onDelete && P ? '<button type="button" class="bph-btn bph-bad" data-pdel>🗑 In den Papierkorb …</button>' : ''),
    });
    if (P) J('ablage/projektordner?project_id=' + pid).then((r) => {   // den automatisch gefundenen Ordner zeigen
      const el = document.querySelector('[data-pordner]'); if (!el) return;
      el.innerHTML = r && r.ok ? `${r.eingetragen ? 'Ordner' : 'Automatisch gefunden'}: <b>${esc(r.projekt)}</b>` : `<span style="color:#e07b3a">${esc((r && r.error) || 'Kein Ordner gefunden')}</span>`;
      const inp = document.querySelector('[data-dm="p_folder"]'); if (inp && r && r.ok && !r.eingetragen) inp.placeholder = r.projekt;
    }).catch(() => { const el = document.querySelector('[data-pordner]'); if (el) el.textContent = ''; });
    return M;
  };

  /* Grundstück (Gemarkung, Flur, Flurstück, Höhe über NHN) als kleiner Block für eigene Masken – Verwaltung und Adressen.
     opt: {werte, adresse: () => ({strasse, plz, ort}), url: Kataster-Abfrage (POST), klasse: Formular-Klasse der App, aenderung: () => …} */
  const GRUND = [['gemarkung', 'Gemarkung'], ['flur', 'Flur'], ['flurstueck', 'Flurstück'], ['hoehe_nhn', 'Höhe ü. NHN (m)']];
  H.grundstueck = function (host, opt) {
    const W = { ...(opt.werte || {}) }, e = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    host.innerHTML = `<div class="${e(opt.klasse || '')}" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1.3fr) minmax(0,1.2fr);gap:.5rem;align-items:end">
      ${GRUND.map(([k, l]) => `<label style="grid-column:auto;min-width:0">${l}<input data-gs="${k}" value="${e(W[k])}" autocomplete="off"></label>`).join('')}</div>
      <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.4rem"><button type="button" class="${e(opt.knopf || 'bph-btn')}" data-gskat title="Gemarkung, Flur, Flurstück und Geländehöhe über NHN an dieser Adresse – amtliche Daten von Geobasis NRW (wie TIM-online)">📍 aus ALKIS ermitteln (TIM-online)</button>
      <span data-gsinfo class="bph-mu" style="font-size:.8rem;flex:1 1 220px"></span></div>`;
    const info = host.querySelector('[data-gsinfo]'), inp = (k) => host.querySelector(`[data-gs="${k}"]`);
    host.addEventListener('input', (ev) => { if (ev.target.dataset.gs && opt.aenderung) opt.aenderung(); });
    host.querySelector('[data-gskat]').addEventListener('click', async (ev) => {
      const kb = ev.currentTarget, alt = kb.textContent; kb.disabled = true; kb.textContent = '📍 frage Geobasis NRW …'; info.textContent = '';
      try {
        const r = await KX(opt.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opt.adresse ? opt.adresse() : {}) });
        const neu = r.werte || {};
        const alt2 = GRUND.filter(([k]) => inp(k).value.trim() && neu[k] && inp(k).value.trim() !== String(neu[k]).trim());
        if (!alt2.length || await bpFrage('Vorhandene Angaben überschreiben?\n\n' + alt2.map(([k, l]) => `${l}: ${inp(k).value} → ${neu[k]}`).join('\n'))) {
          GRUND.forEach(([k]) => { if (neu[k] != null && neu[k] !== '') inp(k).value = neu[k]; });
          if (opt.aenderung) opt.aenderung();
        }
      } catch (er) { info.textContent = er.message; }
      kb.disabled = false; kb.textContent = alt;
    });
    return { werte: () => Object.fromEntries(GRUND.map(([k]) => [k, inp(k).value.trim()])) };
  };

  H.vorort = async function () {
    let D, msg = '';
    try { D = await KX('api/bp/vorort/einst'); } catch (e) { alert(e.message); return; }
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = '<div class="bph-dlg" role="dialog" aria-label="Vor Ort erkennen" style="width:min(760px,96vw)"></div>'; document.body.appendChild(bg);
    const root = bg.firstChild, e1 = (e) => { if (e.key === 'Escape') close(); };
    const close = () => { bg.remove(); document.removeEventListener('keydown', e1); };
    document.addEventListener('keydown', e1);
    const portal = ((H.conf || {}).apps || []).find((a) => a.key === 'portal');
    const basis = () => new URL((portal ? appUrl(portal) : '') + '/api/bp/vorort', location.href).href;
    const adresse = () => `${basis()}?k=${encodeURIComponent(D.schluessel)}&lat=`;
    const TG = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const put = async (b) => { try { D = await KX('api/bp/vorort/einst', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); msg = 'Gespeichert.'; } catch (e) { msg = e.message; } draw(); };
    const de = (d) => new Date(d + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
    function draw() {
      const E = D.einst;
      root.innerHTML = `<div class="bph-dh"><b>📍 Vor Ort erkennen (iPhone)</b><button type="button" class="bph-x" data-vx aria-label="Schließen">×</button></div><div class="bph-db">
        <p class="bph-mu">Dein iPhone meldet über einen Kurzbefehl, wo du bist. Liegt der Standort in der Arbeitszeit an einer Baustelle, merkt sich die Plattform nur <b>Projekt, Tag und Uhrzeit</b> – keine Koordinaten. Fehlt für den Tag der Tagesbericht, erscheint ein To-do${E.mail ? ' und am Ende der Arbeitszeit kommt eine Mail' : ''}.</p>
        <label class="bph-ck"><input type="checkbox" data-vf="an"${E.an ? ' checked' : ''}> eingeschaltet</label>
        <div class="bph-row" style="flex-wrap:wrap;gap:.6rem;align-items:center">Arbeitszeit <input type="time" data-vf="von" value="${esc(E.von)}" style="width:8.5rem"> bis <input type="time" data-vf="bis" value="${esc(E.bis)}" style="width:8.5rem">
          <span class="bph-chips">${TG.map((t, i) => `<button type="button" class="bph-chip${E.tage.includes(i) ? ' on' : ''}" data-vt="${i}">${t}</button>`).join('')}</span></div>
        <div class="bph-row" style="gap:.6rem;align-items:center">Baustelle erkannt bis <select data-vf="radius">${[100, 150, 250, 400, 600, 1000].map((r) => `<option value="${r}"${E.radius === r ? ' selected' : ''}>${r} m</option>`).join('')}</select> Entfernung (Projektadresse)</div>
        <label class="bph-ck"><input type="checkbox" data-vf="bericht"${E.bericht ? ' checked' : ''}> Tagesbericht automatisch anlegen – einmal am Tag je Baustelle, mit Ankunftszeit, Wetter und den Anwesenden laut Bauzeitenplan als Vorschlag</label>
        <label class="bph-ck"><input type="checkbox" data-vf="mail"${E.mail ? ' checked' : ''}> am Ende der Arbeitszeit per Mail erinnern, wenn der Tagesbericht fehlt oder noch nicht fertig ist (nicht als PDF erstellt)</label>
        <h4>Deine persönliche Adresse für den Kurzbefehl</h4>
        <div class="bph-row" style="gap:.4rem"><input readonly value="${esc(adresse())}" data-vadr style="flex:1;font-family:monospace;font-size:.82rem"><button type="button" class="bph-btn" data-vcopy>Kopieren</button><button type="button" class="bph-btn" data-vneu title="Alte Adresse wird ungültig – z. B. wenn das iPhone weg ist">Neuer Schlüssel</button></div>
        <h4>🚗 Fahrten automatisch (CarPlay)</h4>
        <p class="bph-mu">Ein zweiter Kurzbefehl „Fahrt beginnt“ bei <b>CarPlay verbindet</b> startet die Fahrt, „Baustelle melden“ bei <b>CarPlay trennt</b> beendet sie. Richtung und Projekt ergeben sich aus dem Ziel: an einer Baustelle „zur Baustelle“, am Büro „zurück ins Büro“ (Projekt der letzten Baustelle), sonst „Fahrt“ zum Bestätigen. Die Fahrt steht dann in der Zeiterfassung (erfasst, nicht geschätzt).</p>
        <div class="bph-row" style="gap:.4rem"><input readonly value="${esc(adresse().replace('&lat=', '&e=ein&lat='))}" data-vadr2 style="flex:1;font-family:monospace;font-size:.82rem"><button type="button" class="bph-btn" data-vcopy2>Kopieren</button></div>
        <p class="bph-mu">Nicht weitergeben – wer die Adresse kennt, kann Besuche für dich melden.</p>
        <details class="bph-anl"><summary><b>Anleitung: Kurzbefehl einrichten</b> (einmalig, ca. 5 Minuten)</summary>
          <ol>
            <li>Auf dem iPhone die App <b>Kurzbefehle</b> öffnen → <b>＋</b> (iOS 27: unten in der Mitte, sonst oben rechts). <b>iOS 27</b> fragt dann „Was soll dein Kurzbefehl tun?“ – nichts eintippen, sondern oben rechts <b>Bearbeiten</b>. Oben auf den Namen tippen → Umbenennen: „Baustelle melden“.</li>
            <li>Aktion <b>„Aktuellen Standort abrufen“</b> hinzufügen.</li>
            <li>Aktion <b>„Inhalte von URL abrufen“</b> hinzufügen (Suche „Inhalte“ oder Kategorie „Web“). In der Aktion auf das blaue Feld <b>URL</b> tippen und die Adresse oben einfügen (endet mit <code>&amp;lat=</code>). Direkt dahinter die Variable <b>Aktueller Standort → Breitengrad</b> einsetzen, dann <code>&amp;lon=</code> tippen und die Variable <b>Aktueller Standort → Längengrad</b> einsetzen. (Variable einsetzen: Cursor ans Ende der Adresse, über der Tastatur „Aktueller Standort“ antippen, dann die eingesetzte Variable antippen und „Breitengrad“ bzw. „Längengrad“ wählen.) Die <b>Methode</b> bleibt <b>GET</b> – dort keine Variable eintragen.</li>
            <li>Optional: Aktion <b>„Mitteilung anzeigen“</b> mit dem Ergebnis – dann siehst du „Vor Ort: A481 …“.</li>
            <li>Einmal antippen zum Testen (Standortzugriff erlauben) – unten unter „Letzte Besuche“ erscheint die Baustelle, wenn du dort bist.</li>
            <li><b>Automatisch starten – iOS 27:</b> im Editor oben <b>＋</b> → <b>Automation</b> → unter „Verbindungen“ <b>CarPlay</b> → „Trennt“. Mit dem Pfeil neben „Automation“ <b>„Vor dem Ausführen bestätigen“ ausschalten</b>. Zur Sicherheit zwei weitere Automationen <b>Tageszeit</b> (11:00 und 15:00, wöchentlich Mo–Fr). Dann unten <b>ⓘ</b> → <b>Datenschutz</b> → „Ausführen im gesperrten Zustand erlauben“ einschalten. Tipp: Einstellungen → Apps → Kurzbefehle → „Kurzbefehle öffnen in: Editor“ überspringt die KI-Frage.</li>
            <li><b>Automatisch starten – iOS 17 bis 26:</b> unten <b>Automation</b> → <b>＋</b> → <b>CarPlay</b> → „Trennt“ → <b>Sofort ausführen</b>, „Bei Ausführung benachrichtigen“ aus → Kurzbefehl „Baustelle melden“. Dazu zwei Automationen <b>Tageszeit</b> (11:00 und 15:00, Mo–Fr), ebenfalls sofort ausführen.</li>
            <li><b>Fahrten (CarPlay verbindet):</b> den Kurzbefehl „Baustelle melden“ duplizieren (lange drücken → Duplizieren), umbenennen in „Fahrt beginnt“ und in der URL die Adresse aus „Fahrten automatisch“ einsetzen (mit <code>&amp;e=ein</code>). Dann eine Automation <b>CarPlay → „Verbindet“</b> → sofort ausführen → „Fahrt beginnt“. Die vorhandene Automation „Trennt“ beendet die Fahrt.</li>
            <li><b>Ohne CarPlay:</b> statt CarPlay alle 30 Minuten in der Arbeitszeit einen Auslöser <b>Tageszeit</b> (07:00, 07:30 … 17:00, Mo–Fr). Jede Meldung braucht nur ein paar Sekunden GPS, der Akku merkt davon kaum etwas.</li>
          </ol>
          <p class="bph-mu">Ist der Kurzbefehl fertig, lässt er sich unter „Teilen → iCloud-Link kopieren“ an Kolleg:innen weitergeben – jeder trägt dann nur seine eigene Adresse ein. Die Automationen legt jeder selbst an (das erlaubt Apple nicht anders).</p></details>
        <div class="bph-row"><button type="button" class="bph-btn" data-vtest title="Mit dem Standort dieses Geräts ausprobieren">📍 Jetzt mit diesem Gerät testen</button></div>
        <h4>Letzte Besuche</h4>
        ${D.besuche.length ? `<div class="bph-vlist">${D.besuche.map((b) => `<div>${esc(de(b.datum))} · <b>${esc(b.projekt)}</b> · ${esc(b.von)}${b.bis !== b.von ? '–' + esc(b.bis) : ''} Uhr · ${b.bericht ? '✓ Bericht' : b.angelegt ? '<span style="color:#d08a1e">Bericht angelegt – ergänzen</span>' : '<span style="color:#d64545">kein Bericht</span>'}</div>`).join('')}</div>` : '<p class="bph-mu">Noch keine – sobald der Kurzbefehl eine Baustelle meldet, steht sie hier.</p>'}
        ${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}</div>`;
    }
    draw();
    root.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-vx]')) return close();
      const tg = t.closest('[data-vt]'); if (tg) { const T = new Set(D.einst.tage), i = +tg.dataset.vt; T.has(i) ? T.delete(i) : T.add(i); return put({ tage: [...T] }); }
      if (t.closest('[data-vcopy2]')) { const i = root.querySelector('[data-vadr2]'); i.select(); try { await navigator.clipboard.writeText(i.value); } catch { document.execCommand('copy'); } msg = 'Adresse für „Fahrt beginnt“ kopiert.'; draw(); return; }
      if (t.closest('[data-vcopy]')) { const i = root.querySelector('[data-vadr]'); i.select(); try { await navigator.clipboard.writeText(i.value); msg = 'Adresse kopiert.'; } catch { document.execCommand('copy'); msg = 'Adresse kopiert.'; } draw(); return; }
      if (t.closest('[data-vneu]')) { if ((await bpFrage('Neuen Schlüssel erzeugen? Der Kurzbefehl auf dem iPhone muss dann die neue Adresse bekommen.'))) put({ neuer_schluessel: true }); return; }
      if (t.closest('[data-vtest]')) {
        if (!navigator.geolocation) { msg = 'Dieses Gerät gibt keinen Standort heraus.'; return draw(); }
        msg = 'Standort wird bestimmt …'; draw();
        navigator.geolocation.getCurrentPosition(async (p) => {
          try { const r = await fetch(`${adresse()}${p.coords.latitude}&lon=${p.coords.longitude}`); msg = 'Antwort: ' + (await r.text()); D = await KX('api/bp/vorort/einst'); } catch (er) { msg = er.message; }
          draw();
        }, (er) => { msg = 'Standort nicht verfügbar: ' + er.message; draw(); }, { enableHighAccuracy: true, timeout: 15000 });
      }
    });
    root.addEventListener('change', (e) => {
      const f = e.target.dataset.vf; if (!f) return;
      put({ [f]: e.target.type === 'checkbox' ? e.target.checked : f === 'radius' ? +e.target.value : e.target.value });
    });
  };

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
      document.addEventListener('keydown', e1);
    }
    const AB = D.abruf || { rhythmus: 'tag', uhrzeit: '08:00' }, EG = D.eigene || { aus: true, postfaecher: [], cc: true }, AZ = D.anzeige || { tage: 1, wochenende: true };
    const abrufText = () => ({ tag: `einmal am Tag um ${AB.uhrzeit} Uhr`, zweimal: `zweimal am Tag, um ${AB.uhrzeit} und 5 Stunden später`, stuendlich: 'stündlich von 7 bis 19 Uhr', hand: 'nur, wenn du ↻ Jetzt abrufen drückst' })[AB.rhythmus];
    const VORL = { gmail: ['imap.gmail.com', 993], webde: ['imap.web.de', 993], gmx: ['imap.gmx.net', 993], ionos: ['imap.ionos.de', 993], strato: ['imap.strato.de', 993], tonline: ['secureimap.t-online.de', 993], outlook: ['outlook.office365.com', 993] };
    const feld = (k, i, l, typ = 'text', ph = '') => `<label style="flex:1;min-width:9rem">${l}<input data-pf="${k}" data-pi="${i}" type="${typ}" value="${typ === 'password' ? '' : esc((D.konten[i] || {})[k] ?? '')}" placeholder="${esc(ph)}" autocomplete="${typ === 'password' ? 'new-password' : 'off'}"></label>`;
    function draw() {
      root.innerHTML = `${opt.into ? '' : '<div class="bph-dh"><b>Meine Postfächer</b><button type="button" class="bph-x" data-pc aria-label="Schließen">×</button></div>'}<div class="bph-db"${opt.into ? ' style="padding:0"' : ''}>
        <p class="bph-mu">Aus diesen Postfächern stellt die Startseite die Mails zu <b>deinen</b> Projekten zusammen – ${abrufText()} (und jederzeit mit ↻). Gelesen wird nur – nichts wird verschoben, gelöscht oder als gelesen markiert. Nur du siehst die Übersicht.</p>
        <h4>Abruf</h4>
        <div class="bph-row" style="align-items:flex-end"><label style="flex:1;min-width:12rem">Wie oft<select data-pab="rhythmus" style="width:100%;font:inherit;padding:.35rem .5rem;border-radius:calc(8px*var(--rk,1));border:1px solid var(--line,#3b3e42);background:var(--inp,transparent);color:inherit">${[['tag', 'einmal am Tag'], ['zweimal', 'zweimal am Tag'], ['stuendlich', 'stündlich (7–19 Uhr)'], ['hand', 'nur von Hand (↻)']].map(([k, l]) => `<option value="${k}"${AB.rhythmus === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
          ${AB.rhythmus === 'tag' || AB.rhythmus === 'zweimal' ? `<label style="width:8rem">${AB.rhythmus === 'zweimal' ? 'ab' : 'um'}<input type="time" data-pab="uhrzeit" value="${esc(AB.uhrzeit)}"></label>` : ''}</div>
        <h4>Anzeige</h4>
        <div class="bph-row" style="align-items:center"><label style="display:flex;align-items:center;gap:.5rem">Mails stehen<select data-paz="tage" style="font:inherit;padding:.3rem .5rem;border-radius:calc(8px*var(--rk,1));border:1px solid var(--line,#3b3e42);background:var(--inp,transparent);color:inherit">${[1, 2, 3, 5, 7, 14].map((t) => `<option value="${t}"${AZ.tage === t ? ' selected' : ''}>${t} Tag${t > 1 ? 'e' : ''}</option>`).join('')}</select>in der Übersicht</label></div>
        <label class="bph-ck"><input type="checkbox" data-pazw${AZ.wochenende ? ' checked' : ''}> Wochenende nicht mitzählen – die Mails vom Freitag stehen am Montag noch da</label>
        <p class="bph-mu">Mails, zu denen du eine Erinnerung angelegt hast, bleiben stehen, bis die Erinnerung erledigt ist.</p>
        <h4>Eigene Mails</h4>
        <label class="bph-ck"><input type="checkbox" data-peg${EG.aus ? ' checked' : ''}> Mails ausblenden, die wir selbst geschickt haben – von mir${(D.zugewiesen || []).length ? ` oder aus dem Büro-Postfach (${D.zugewiesen.map(esc).join(', ')}), auch in Kopie dorthin` : ' oder aus einem gemeinsamen Büro-Postfach, auch in Kopie dorthin'}</label>
        <label class="bph-ck"><input type="checkbox" data-pegc${EG.cc !== false ? ' checked' : ''}> Mails nur zur Kenntnis ausblenden – wir stehen nur in CC, nicht unter „An“</label>
        <div class="bph-row"${EG.aus ? '' : ' hidden'}><label style="flex:1">nur in diesen Postfächern <span class="bph-mu">(leer = in allen; mehrere mit Komma)</span><input data-pegp value="${esc(EG.postfaecher.join(', '))}" placeholder="alle Postfächer – z. B. ${esc((D.zugewiesen || [])[0] || D.email || 'mail@ihr-buero.de')} eintragen" list="bph-pegl" autocomplete="off"></label><datalist id="bph-pegl">${(D.zugewiesen || []).concat(D.email ? [D.email] : []).map((a) => `<option value="${esc(a)}">`).join('')}</datalist></div>
        <h4>Büro-Postfach (Microsoft 365)</h4>
        ${D.m365_zentral ? `<label class="bph-ck"><input type="checkbox" data-pm${D.m365 ? ' checked' : ''}> mein Postfach <b>${esc(D.email || '–')}</b> einbeziehen</label>${(D.zugewiesen || []).length ? `<p class="bph-mu">Dazu vom Administrator zugewiesen: <b>${D.zugewiesen.map(esc).join(', ')}</b></p>` : ''}<div class="bph-row"><button type="button" class="bph-btn" data-ptm>Probeweise lesen</button></div>`
          : '<p class="bph-mu">Noch nicht eingerichtet – das macht der Administrator einmal unter Verwaltung → Einstellungen → Mailserver.</p>'}
        <h4>Weitere eigene Postfächer (IMAP)</h4>
        ${D.konten.map((k, i) => `<div class="bph-tpl"><div class="bph-row"><label class="bph-ck" style="flex:1"><input type="checkbox" data-pf="an" data-pi="${i}"${k.an !== false ? ' checked' : ''}> <b>${esc(k.name || k.user)}</b></label><button type="button" class="bph-btn" data-pt="${i}">Testen</button><button type="button" class="bph-btn" data-pd="${i}">Entfernen</button></div>
          <div class="bph-row">${feld('name', i, 'Bezeichnung', 'text', 'z. B. Projektpostfach')}${feld('user', i, 'Benutzername / Adresse')}</div>
          <div class="bph-row">${feld('host', i, 'IMAP-Server', 'text', 'imap.example.de')}<label style="width:6rem">Port<input data-pf="port" data-pi="${i}" value="${esc(k.port || 993)}" inputmode="numeric"></label>${feld('ordner', i, 'Ordner', 'text', 'INBOX')}</div>
          <div class="bph-row">${feld('pass', i, k.pass_set ? 'Kennwort (gespeichert – zum Ändern neu eingeben)' : 'Kennwort / App-Passwort', 'password', k.pass_set ? '••••••••' : '')}</div></div>`).join('') || '<p class="bph-mu">Keine weiteren Postfächer.</p>'}
        <div class="bph-row"><select data-pv><option value="">+ Postfach hinzufügen …</option><option value="gmail">Gmail (mit App-Passwort)</option><option value="webde">WEB.DE</option><option value="gmx">GMX</option><option value="tonline">T-Online</option><option value="ionos">IONOS (1&1)</option><option value="strato">Strato</option><option value="eigen">anderer Anbieter</option></select></div>
        <p class="bph-mu">Gmail, GMX, WEB.DE & Co. verlangen meist ein <b>App-Passwort</b> und eingeschaltetes IMAP in den Einstellungen des Postfachs.</p>
        <div class="bph-row"><button type="button" class="bph-btn pri" data-ps>Speichern</button></div>${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}</div>`;
    }
    const lesen = () => { const az = root.querySelector('[data-paz="tage"]'); if (az) AZ.tage = +az.value; const azw = root.querySelector('[data-pazw]'); if (azw) AZ.wochenende = azw.checked; const eg = root.querySelector('[data-peg]'); if (eg) EG.aus = eg.checked; const egc = root.querySelector('[data-pegc]'); if (egc) EG.cc = egc.checked; const egp = root.querySelector('[data-pegp]'); if (egp) EG.postfaecher = egp.value.split(/[\s,;]+/).filter((a) => a.includes('@')); root.querySelectorAll('[data-pab]').forEach((el) => { AB[el.dataset.pab] = el.value || AB[el.dataset.pab]; }); root.querySelectorAll('[data-pf]').forEach((el) => { const k = D.konten[+el.dataset.pi]; if (!k) return; const f = el.dataset.pf; k[f] = el.type === 'checkbox' ? el.checked : el.value; }); const m = root.querySelector('[data-pm]'); if (m) D.m365 = m.checked; };
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

  /* ---------- ⚙ Einstellungen: alle stehen in der Verwaltung unter „Einstellungen“ (besprochen am 13.11.2026) – ⚙ springt im selben Fenster dorthin.
     Persönlich (#einstellungen-ich:konto|look|ki), Büro (#einstellungen-<teil>), je App (#einstellungen-app:<app>[~<teil>]).
     Eine App meldet ihre Einstellungen mit BPHead.appEinstellungen([{ key, label, text, render(host) | open() }]); die Verwaltung zeigt sie als
     eigene Seite der App (?einbetten=1#bpeinst[-<teil>]). Darf jemand nicht in die Verwaltung, zeigt sie nur „Einstellungen“. */
  let appSet = [];
  H.appEinstellungen = (list) => { appSet = (list || []).filter(Boolean); if (/[#&]bpeinst\b/.test(location.hash)) H.einstSeite(); };
  H.einstSeite = () => {
    document.documentElement.classList.add('bph-einst'); let w = document.getElementById('bphEV'); if (!w) { w = document.createElement('div'); w.id = 'bphEV'; document.body.appendChild(w); }
    w.innerHTML = appSet.length ? '' : '<p class="bph-mu">Diese App hat keine eigenen Einstellungen.</p>';
    appSet.forEach((x) => { const h = document.createElement('section'); h.className = 'bph-drp bph-evs'; h.dataset.teil = x.key; h.innerHTML = `<h3>${esc(x.label)}</h3>`; w.appendChild(h);
      if (!x.render) { h.insertAdjacentHTML('beforeend', `${x.text ? `<p class="bph-mu">${esc(x.text)}</p>` : ''}<button type="button" class="bph-btn">${esc(x.label)} öffnen …</button>`); h.querySelector('button').addEventListener('click', () => x.open()); return; }
      const c = document.createElement('div'); h.appendChild(c); try { x.render(c, {}); } catch (e) { c.textContent = 'Fehler: ' + e.message; } });
    const t = (location.hash.match(/bpeinst-([\w-]+)/) || [])[1], z = t && w.querySelector(`[data-teil="${t}"]`); if (z) z.scrollIntoView({ block: 'start' });
  };
  H.einstIch = (host, teil) => {   // Verwaltung → Einstellungen → Persönlich: Mein Konto, Darstellung, KI
    if (teil === 'look') { host.innerHTML = '<p class="bph-mu">Farbschema, Akzentfarbe, Schrift und Schriftgröße – gelten für dich in allen Apps und auf allen Geräten.</p><div class="bph-lookp"></div>'; const lp = host.querySelector('.bph-lookp'), re = () => { lp.innerHTML = lookHtml(); }; re(); lookWire(lp, re); return; }
    if (teil !== 'ki') return H.konto({ into: host, tab: 'konto', nurKonto: true });   // Versprechen: fertig gezeichnet (Suche springt danach zum Abschnitt)
    const zeichne = () => {
      host.innerHTML = `<p class="bph-mu">Wo eine KI helfen kann (Dokumente lesen, Texte vorschlagen), fragt die Plattform an Ort und Stelle, welche du verwenden willst. Hier stellst du ein, welche vorgewählt ist – und ob ohne Nachfrage.</p>
        <div class="bph-kiw">${(H.providers.length ? H.providers : [prov('intern')]).map((p) => `<label class="${p.ok ? '' : 'aus'}"><input type="radio" name="bphKiE" value="${p.key}"${p.key === H.ki ? ' checked' : ''}${p.ok ? '' : ' disabled'}><span><b>${esc(p.label)}</b><small>${esc(p.hint || (p.key === 'intern' ? 'ohne KI – nur die eingebaute Erkennung' : ''))}</small></span></label>`).join('')}</div>
        <label class="bph-ck" style="margin-top:.8rem"><input type="checkbox" data-kie${H.kiImmer ? ' checked' : ''}> Diese KI immer ohne Nachfrage verwenden</label>
        <p class="bph-mu" style="margin-top:.6rem">Welche KI überhaupt erlaubt ist (und ob kostenpflichtige), legt die Verwaltung fest.</p>`;
      host.querySelectorAll('[name=bphKiE]').forEach((r) => r.addEventListener('change', async () => { await setKi(r.value); }));
      host.querySelector('[data-kie]').addEventListener('change', (e) => H.kiImmerSetzen(e.target.checked));
    };
    zeichne();
  };
  H.einstellungenSchliessen = () => {};   // früher das Seitenfenster; bleibt für ältere Aufrufer
  H.einstellungen = function (opt = {}) {
    const ich = { konto: 'ich:konto', look: 'ich:look', ki: 'ich:ki' }, b = opt.bereich || (appSet.length ? 'app' : 'ich');
    const z = opt.ziel ? opt.ziel : b === 'ich' ? ich[opt.teil] || 'ich:konto' : b === 'buero' ? (opt.teil || 'firma') : 'app:' + (H.app || 'portal') + (opt.teil ? '~' + opt.teil : '');
    if (H.app === 'admin') { location.hash = 'einstellungen-' + z; return; }
    const adm = ((H.conf || {}).apps || []).find((a) => a.key === 'admin');
    if (!adm) { tip('Die Verwaltung ist nicht erreichbar.'); return; }
    location.href = appUrl(adm) + '/#einstellungen-' + z;
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
      ${akt ? `<button type="button" class="bph-vl-b pri" data-vl="neu" title="Kopie der aktuellen Version unter neuem Namen – die alte bleibt, wie sie ist">＋ Neue Version …</button><button type="button" class="bph-vl-b" data-vl="ren">✎ Umbenennen</button>${o.onVerlauf ? '<button type="button" class="bph-vl-b" data-vl="ver" title="Automatisch gesicherte Zwischenstände dieser Version">🕘 Verlauf</button>' : ''}${o.onVerwalten ? '<button type="button" class="bph-vl-b" data-vl="verw" title="Die ganze Version archivieren oder in den Papierkorb legen">🗄 Version archivieren / löschen</button>' : ''}` : ''}
      <span class="bph-vl-r"></span><span class="bph-vl-st" role="status">${esc(stT)}</span>`;
    const r = el.querySelector('.bph-vl-r');
    if ((o.rechts || []).length) { r.insertAdjacentHTML('beforebegin', '<span class="bph-vl-sp"></span>'); (o.rechts || []).forEach((x) => x && r.appendChild(x)); }
    return el;
  };
  /* Kompaktes Versionsmenü (ein Knopf „1 Version: Startversion ▾“ statt der breiten Leiste) – für alle Module gleich.
     H.versionsMenue({ in: Element, liste, aktuell, gueltig, onWahl, onNeu, onUmbenennen, onVerlauf, onVerwalten, onGueltig, extra, wahlHinweis,
       wort ('Version' – z. B. 'Antrag'), neuText, giltText, fragen: false (beim Wechsel nicht nach „gilt“ fragen) })
     gueltig: die Version, die für Bautagebuch, Erinnerungen, To-dos … gilt (★); onGueltig(id) setzt sie. Erneut aufrufen zum Aktualisieren. */
  H.versionsMenue = function (o) {
    const box = o.in; if (!box) return null;
    let el = box.querySelector(':scope > .bph-vm');
    if (!el) {
      el = document.createElement('div'); el.className = 'bph-vm'; box.appendChild(el);
      el.addEventListener('click', async (e) => {
        const O = el._o, m = el.querySelector('.bph-vm-m'), b = e.target.closest('[data-vm]'); if (!b || !O) return;
        const a = b.dataset.vm;
        if (a === 'dd') {   // fest positioniert, damit es nicht von einer Werkzeugleiste mit overflow abgeschnitten wird
          m.hidden = !m.hidden;
          if (!m.hidden) { const r = b.getBoundingClientRect(); Object.assign(m.style, { position: 'fixed', left: Math.max(4, Math.min(r.left, innerWidth - m.offsetWidth - 4)) + 'px', top: r.bottom + 4 + 'px', minWidth: r.width + 'px', maxHeight: Math.max(160, innerHeight - r.bottom - 16) + 'px' }); }
          return;
        }
        m.hidden = true;
        if (a === 'w') {
          if (String(b.dataset.id) === String(O.aktuell) || !O.onWahl) return;
          const id = b.dataset.id, ziel = (O.liste || []).find((x) => String(x.id) === String(id)) || {};
          // Wechseln heißt nicht gleich „gilt“: jedes Mal fragen – Nein wechselt trotzdem (nur ansehen/bearbeiten)
          if (O.onGueltig && O.gueltig != null && O.fragen !== false && String(id) !== String(O.gueltig) && window.bpFrage) {
            const r = await bpFrage(`Soll „${ziel.name || 'diese Version'}“ ab jetzt gelten?\n${O.wahlHinweis || 'Sie gilt dann für alle, die im Projekt arbeiten.'}\nMit „Nein“ wechselst du nur – die bisherige Version gilt weiter. Beim nächsten Wechsel wird wieder gefragt.`, { ok: 'Ja, gilt ab jetzt', drei: 'Nein, nur wechseln', abbrechen: 'Abbrechen' });
            if (!r) return;
            await O.onWahl(id, r === true); if (r === true) await O.onGueltig(id, true); return;
          }
          O.onWahl(id); return;
        }
        if (a === 'x') { const x = (O.extra || [])[+b.dataset.i]; if (x && x.fn) x.fn(); return; }
        const f = { neu: O.onNeu, ren: O.onUmbenennen, ver: O.onVerlauf, verw: O.onVerwalten, gilt: O.onGueltig && (() => O.onGueltig(O.aktuell)) }[a]; if (f) f();
      });
    }
    if (!H._vmDoc) {   // einmal für alle Menüs: Klick daneben oder Esc schließt
      H._vmDoc = true;
      const zu = (ausser) => document.querySelectorAll('.bph-vm-m:not([hidden])').forEach((m) => { if (!ausser || !m.parentNode.contains(ausser)) m.hidden = true; });
      document.addEventListener('mousedown', (e) => zu(e.target));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
    }
    el._o = o;
    const L = o.liste || [], akt = L.find((x) => String(x.id) === String(o.aktuell)), aktiv = L.filter((x) => !x.archiviert), nr = (x) => aktiv.indexOf(x) + 1;
    const gilt = (x) => o.gueltig != null && String(x.id) === String(o.gueltig);
    const zeile = (x) => `<button type="button" class="bph-vm-i${x === akt ? ' on' : ''}" data-vm="w" data-id="${esc(x.id)}" role="menuitem"><span class="n">${x.archiviert ? '🗄' : nr(x)}</span><span class="t">${esc(x.name || 'ohne Namen')}${gilt(x) ? ' <em title="Diese Version gilt">★ gilt</em>' : ''}</span><small>${esc(x.datum || '')}</small></button>`;
    const hinweis = akt && o.gueltig != null && !gilt(akt) && o.fragen !== false ? `<span class="bph-vm-ng" title="Bautagebuch, Erinnerungen und To-dos richten sich nach der gültigen Version">gilt nicht</span>` : akt && o.gueltig != null && gilt(akt) ? '<span class="bph-vm-g" title="Diese Version gilt – für Bautagebuch, Erinnerungen und To-dos">★</span>' : '';
    el.innerHTML = `<button type="button" class="bph-vm-b" data-vm="dd" aria-haspopup="menu" title="Version wechseln, neu anlegen, umbenennen …"${akt ? '' : ' disabled'}><span class="n">${akt ? (akt.archiviert ? '🗄' : nr(akt)) : '–'}</span><span class="t">${esc(o.wort || 'Version')}: <b>${esc(akt ? akt.name || 'ohne Namen' : '–')}</b></span>${hinweis}<span class="c">▾</span></button>
      <div class="bph-vm-m" role="menu" hidden>${aktiv.map(zeile).join('')}${L.some((x) => x.archiviert) ? '<div class="bph-vm-h">Archiviert</div>' + L.filter((x) => x.archiviert).map(zeile).join('') : ''}
        <hr>${akt && o.onGueltig && !gilt(akt) ? `<button type="button" data-vm="gilt" class="bph-vm-pri">${esc(o.giltText || '★ Diese Version gilt ab jetzt …')}</button>` : ''}${akt && o.onNeu ? `<button type="button" data-vm="neu">${esc(o.neuText || `＋ Neue Version aus „${akt.name || ''}“ …`)}</button>` : ''}${(o.extra || []).map((x, i) => `<button type="button" data-vm="x" data-i="${i}">${esc(x.text)}</button>`).join('')}${akt && o.onUmbenennen ? '<button type="button" data-vm="ren">✎ Umbenennen …</button>' : ''}${o.onVerlauf ? '<button type="button" data-vm="ver">🕘 Verlauf …</button>' : ''}${akt && o.onVerwalten ? '<button type="button" data-vm="verw">🗄 Archivieren / löschen …</button>' : ''}</div>`;
    return el;
  };
  H.versionStatus = (t) => { const s = document.querySelector('#bph-vl .bph-vl-st'); if (s) s.textContent = t || ''; };

  /* ---------- Testserver: Stand als durchsichtiges Wasserzeichen über jeder Seite (Freigaben haben eine reine Versionsnummer) ---------- */
  function testBanner(v) {
    const m = /^\s*(\S+?)-test\s*\(([0-9a-f]{7})(?:,\s*([^)]+))?\)/.exec(String(v || '')); if (!m || document.querySelector('.bph-testwz')) return;
    const d = document.createElement('div'); d.className = 'bph-testwz'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = `<div><b>TESTSERVER</b><span>wird v${esc(m[1])} · Stand ${m[2]}${m[3] ? ' · gebaut ' + esc(m[3]) : ''}</span></div>`;
    document.body.appendChild(d);
  }

  /* ---------- Fehler melden (🐞): Beschreibung, Bildschirmfoto, dazu automatisch die wichtigen Angaben für die Entwicklung ---------- */
  /* Was Fehlermeldungen und Hilfe-Anfragen automatisch mitschicken (keine Eingaben aus Feldern) */
  function bugKontext() {
    let zustand = null; try { zustand = typeof window.bpBugZustand === 'function' ? window.bpBugZustand() : null; } catch (e) { zustand = { fehler: String(e) }; }
    return { url: location.href.replace(/([?&](token|key|pw)=)[^&#]*/gi, '$1…'), titel: document.title, app: H.app || '', projekt: H.projekt ? `${H.projekt.name || ''} (${H.projekt.id})` : '',
      modus: H.modus || '', version: (H.conf && H.conf.version) || '', fenster: `${innerWidth}×${innerHeight}, Zoom ${Math.round(devicePixelRatio * 100)} %`, zustand,
      fehler: BUGP.fehler.slice(), anfragen: BUGP.anfragen.slice(), klicks: BUGP.klicks.slice(-20) };
  }
  const bildVerkleinern = (src, max = 2000, q = 0.85) => new Promise((ok, bad) => { const im = new Image(); im.onload = () => { const f = Math.min(1, max / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = Math.round(im.width * f); cv.height = Math.round(im.height * f); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ok(cv.toDataURL('image/jpeg', q)); }; im.onerror = () => bad(new Error('Das Bild konnte nicht gelesen werden.')); im.src = src; });
  /* Diese Ansicht aufnehmen (Browser fragt, welcher Tab) → JPEG-Daten-URL oder '' (abgebrochen) */
  async function ansichtAufnehmen() {
    if (!window.isSecureContext) { bpHinweis('Aufnehmen geht nur über eine sichere Adresse (https://…) – hier ist die Seite über ' + location.protocol + '//' + location.host + ' geöffnet, das erlaubt der Browser nicht. Bitte mit Win+Umschalt+S ein Bildschirmfoto machen und hier mit Strg+V einfügen.'); return ''; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { bpHinweis('Dieser Browser kann die Ansicht nicht selbst aufnehmen. Bitte mit Win+Umschalt+S ein Bildschirmfoto machen und hier mit Strg+V einfügen.'); return ''; }
    try {
      const st = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
      const v = document.createElement('video'); v.srcObject = st; v.muted = true; await v.play(); await new Promise((ok) => setTimeout(ok, 350));
      const cv = document.createElement('canvas'); cv.width = v.videoWidth; cv.height = v.videoHeight; cv.getContext('2d').drawImage(v, 0, 0);
      st.getTracks().forEach((t) => t.stop());
      return await bildVerkleinern(cv.toDataURL('image/png'));
    } catch (er) { if (er && er.name !== 'NotAllowedError') bpHinweis('Aufnehmen hat nicht geklappt – bitte mit Win+Umschalt+S ein Bildschirmfoto machen und hier mit Strg+V einfügen.'); return ''; }
  }
  H.bugMelden = function (vor = {}) {
    if (document.querySelector('.bph-bugdlg')) return;
    let bild = vor.bild || '';
    const kontext = bugKontext;
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-bugdlg';
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Fehler melden" style="width:min(560px,96vw)"><div class="bph-dh"><b>🐞 Fehler melden</b><button type="button" class="bph-x" data-bx aria-label="Schließen">✕</button></div><div class="bph-db">
      <label style="display:block">Was ist passiert – und was hättest du erwartet?<textarea data-btext rows="5" maxlength="8000" style="width:100%;margin-top:.3rem" placeholder="z. B. Ich habe im LV auf „Speichern“ geklickt, dann war die Position weg.">${esc(vor.text || '')}</textarea></label>
      <div class="bph-row" style="margin-top:.6rem;flex-wrap:wrap;gap:.4rem"><button type="button" class="bph-btn" data-bshot>📷 Diese Ansicht aufnehmen</button><label class="bph-btn">🖼 Bild wählen<input type="file" accept="image/png,image/jpeg,image/webp" data-bfile hidden></label><small class="bph-mu" style="align-self:center">oder ein Bild mit Strg+V einfügen</small></div>
      <div data-bvor style="margin-top:.5rem"></div>
      <details style="margin-top:.6rem"><summary class="bph-mu" style="cursor:pointer">Was automatisch mitgeschickt wird</summary><pre data-bk style="white-space:pre-wrap;font-size:.72rem;max-height:14rem;overflow:auto;margin:.4rem 0 0"></pre>
        <small class="bph-mu">Adresse, App, Projekt, Browser, Fenstergröße, Version, die letzten Fehlermeldungen und Klicks auf dieser Seite – keine Eingaben aus Feldern. Die Meldung sieht nur die Verwaltung.</small></details>
      <div class="bph-row" style="justify-content:flex-end;margin-top:.8rem"><button type="button" class="bph-btn" data-bx>Abbrechen</button><button type="button" class="bph-btn pri" data-bok>Melden</button></div></div></div>`;
    document.body.appendChild(bg);
    const dlg = bg.querySelector('.bph-dlg'); dlgBeweglich(dlg);
    const kz = (k) => [`Adresse: ${k.url}`, `App: ${k.app || k.titel}`, k.projekt && `Projekt: ${k.projekt}`, `Ansicht: ${k.modus}`, `Version: ${k.version}`, `Fenster: ${k.fenster}`, `Browser: ${navigator.userAgent}`,
      `Fehler auf dieser Seite: ${k.fehler.length}`, `Fehlgeschlagene Anfragen: ${k.anfragen.length}`, `Letzte Klicks: ${k.klicks.length}`].filter(Boolean).join('\n');
    bg.querySelector('[data-bk]').textContent = kz(kontext());
    const vorschau = () => { const v = bg.querySelector('[data-bvor]'); v.innerHTML = bild ? `<div style="position:relative;display:inline-block"><img src="${bild}" alt="Bildschirmfoto" style="max-width:100%;max-height:220px;border:1px solid var(--bph-line,#ccc);border-radius:calc(6px*var(--rk,1))"><button type="button" class="bph-x" data-bweg title="Bild entfernen" aria-label="Bild entfernen" style="position:absolute;top:4px;right:4px;background:#fff">✕</button></div>` : ''; };
    const verkleinern = (src) => bildVerkleinern(src);
    const ausDatei = (f) => { if (!f || !/^image\//.test(f.type)) return; const r = new FileReader(); r.onload = async () => { try { bild = await verkleinern(r.result); vorschau(); } catch (e) { bpHinweis(e.message); } }; r.readAsDataURL(f); };
    const zu = () => { bg.remove(); document.removeEventListener('paste', einfuegen, true); };
    const einfuegen = (e) => { const it = [...((e.clipboardData && e.clipboardData.items) || [])].find((x) => x.type.startsWith('image/')); if (it) { e.preventDefault(); ausDatei(it.getAsFile()); } };
    document.addEventListener('paste', einfuegen, true);
    bg.addEventListener('dragover', (e) => e.preventDefault());
    bg.addEventListener('drop', (e) => { e.preventDefault(); ausDatei(e.dataTransfer.files[0]); });
    bg.querySelector('[data-bfile]').addEventListener('change', (e) => ausDatei(e.target.files[0]));
    bg.addEventListener('click', async (e) => {
      if (e.target.closest('[data-bx]')) { if (!bg.querySelector('[data-btext]').value.trim() && !bild || await bpFrage('Meldung verwerfen?', { ok: 'Verwerfen' })) zu(); return; }   // daneben klicken schließt nicht
      if (e.target.closest('[data-bweg]')) { bild = ''; vorschau(); return; }
      if (e.target.closest('[data-bshot]')) { bg.style.visibility = 'hidden'; const x = await ansichtAufnehmen(); bg.style.visibility = ''; if (x) { bild = x; vorschau(); } return; }
      if (e.target.closest('[data-bok]')) {
        const text = bg.querySelector('[data-btext]').value.trim();
        if (text.length < 3) { bpHinweis('Bitte kurz beschreiben, was passiert ist.'); return; }
        const k = bg.querySelector('[data-bok]'); k.disabled = true; k.textContent = 'wird gesendet …';
        try {
          const r = await fetch('api/bp/bug', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: H.app || document.title, text, bild, kontext: kontext() }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || 'Senden hat nicht geklappt (' + r.status + ').');
          zu(); if (window.toast) toast('Danke! Die Meldung ist bei der Verwaltung angekommen (Nr. ' + j.id + ').'); else bpHinweis('Danke! Die Meldung ist angekommen (Nr. ' + j.id + ').');
        } catch (er) { k.disabled = false; k.textContent = 'Melden'; bpHinweis(er.message); }
      }
    });
    if (bild) vorschau();
    setTimeout(() => bg.querySelector('[data-btext]').focus(), 0);
  };

  /* ---------- Hilfe & Fehler (🐞?): Frage per Nachricht, Live-Hilfe mit geteiltem Bildschirm, Fehler melden ----------
     Live-Hilfe ohne Zusatzdienst: der Browser des Hilfesuchenden schickt etwa ein Bild pro Sekunde an den Server, der Helfer holt es ab.
     Fernsteuern gibt es nicht – der Helfer zeigt mit einem roten Zeiger (mit Text) und schreibt. Nichts davon wird aufbewahrt. */
  const HJ = (u, m, d) => KX(u, m ? { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d || {}) } : {});
  const hZeit = (t) => { if (!t) return ''; const d = new Date(t), h = new Date(); return d.toDateString() === h.toDateString() ? d.toTimeString().slice(0, 5) : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + d.toTimeString().slice(0, 5); };
  const hVerlauf = (L) => L.map((m) => `<div class="bph-hm${m.ich ? ' ich' : ''}"><small>${esc(m.von)} · ${esc(hZeit(m.ts))}</small><p>${esc(m.text)}</p></div>`).join('') || '<p class="bph-mu">Noch keine Nachrichten.</p>';
  let HSTAND = { helfer: false }, HLIVE = null, HFENSTER = null;
  const hAppName = () => ((band && band.querySelector('.bph-app') ? band.querySelector('.bph-app').textContent : '') || H.app || document.title).trim().slice(0, 60);
  /* „?“: Hilfe zur App und alle Änderungen – Baustein hilfeseite.js, erst beim ersten Klick geladen */
  H.hilfeSeite = function (o) {
    if (window.bpHilfeSeite) { bpHilfeSeite(o); return; }
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'hilfeseite.js' + v;
    sc.onload = () => window.bpHilfeSeite && bpHilfeSeite(o); document.head.appendChild(sc);
  };
  /* Wiki (Baustein wiki.js, erst bei Bedarf geladen): H.wiki('festhalten', {quelle, text}) · H.wiki('hinweis', el, [Worte]) · H.wiki('warnung', text, {worte}) */
  H.wiki = function (was, ...a) {
    if (window.bpWiki) return bpWiki[was](...a);
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'wiki.js' + v;
    return new Promise((ok) => { sc.onload = () => ok(window.bpWiki && bpWiki[was](...a)); document.head.appendChild(sc); });
  };
  /* Dateien aus dem Projektordner wählen (Baustein dateiwahl.js, erst bei Bedarf geladen): Pläne & Dateien oder Fileserver → Verweise */
  H.dateiWahl = function (o) {
    if (window.bpDateiWahl) return bpDateiWahl(o);
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'dateiwahl.js' + v;
    return new Promise((ok) => { sc.onload = () => ok(window.bpDateiWahl ? bpDateiWahl(o) : null); sc.onerror = () => ok(null); document.head.appendChild(sc); });
  };
  H.hilfe = async function (o = {}) {
    if (document.querySelector('.bph-hdlg')) return;
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-hdlg';
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Hilfe und Fehler" style="width:min(640px,96vw)"><div class="bph-dh"><b>🐞 Hilfe &amp; Fehler</b><button type="button" class="bph-x" data-hx aria-label="Schließen">✕</button></div><div class="bph-db" data-hb></div></div>`;
    document.body.appendChild(bg);
    const B = bg.querySelector('[data-hb]'); let ansicht = o.id ? 'faden' : 'start', fid = o.id || 0, bild = '', D = { meine: [], offen: [] }, tFaden = 0, letzte = 0;
    const zu = () => { clearInterval(tFaden); bg.remove(); document.removeEventListener('paste', einf, true); };
    const einf = (e) => { if (ansicht !== 'frage') return; const it = [...((e.clipboardData && e.clipboardData.items) || [])].find((x) => x.type.startsWith('image/')); if (!it) return; e.preventDefault(); const r = new FileReader(); r.onload = async () => { try { bild = await bildVerkleinern(r.result); zeigen(); } catch (er) { bpHinweis(er.message); } }; r.readAsDataURL(it.getAsFile()); };
    document.addEventListener('paste', einf, true);
    const laden = async () => { try { D = await KX('api/bp/hilfe'); HSTAND.helfer = D.helfer; } catch (e) { D = { meine: [], offen: [], fehler: e.message }; } };
    const zeile = (x, helfer) => `<button type="button" class="bph-hz" data-hf="${x.id}"><span class="bph-hz-a">${x.art === 'live' ? '🖥️' : '✉️'}</span><span class="bph-hz-t"><b>${esc(helfer ? x.user_name : (x.text || x.art_name).slice(0, 80))}</b><small>${esc([helfer ? (x.letzte ? x.letzte.text : x.text).slice(0, 90) : (x.letzte ? x.letzte.von + ': ' + x.letzte.text : ''), x.app, x.projekt].filter(Boolean).join(' · ').slice(0, 160))}</small></span><span class="bph-hz-s"><span class="bph-hs ${esc(x.status)}">${esc(x.status_name)}${x.helfer_name && x.status === 'laeuft' ? ' · ' + esc(x.helfer_name) : ''}</span>${x.neu ? `<span class="bph-hneu">${x.neu} neu</span>` : ''}<small>${esc(hZeit(x.geaendert || x.ts))}</small></span></button>`;
    async function zeigen() {
      if (ansicht === 'start') {
        const offen = (D.offen || []).filter((x) => x.user_id !== (H.me || {}).id);
        B.innerHTML = `<div class="bph-hk">
            <button type="button" class="bph-hc" data-ha="bug"><span>🐞</span><b>Fehler melden</b><small>Kurz beschreiben, Bildschirmfoto dazu. Geht an die Verwaltung.</small></button>
            <button type="button" class="bph-hc" data-ha="frage"><span>✉️</span><b>Frage stellen</b><small>Nachricht mit Foto an die Helfer im Büro. Die Antwort kommt hier und per Mail.</small></button>
            <button type="button" class="bph-hc" data-ha="live"><span>🖥️</span><b>Live-Hilfe</b><small>Bildschirm teilen – ein Helfer sieht deine Ansicht, zeigt mit dem Zeiger und schreibt mit.</small></button></div>
          ${HLIVE ? '<p class="bph-hinfo">🔴 Du teilst gerade deinen Bildschirm. Beenden über den roten Balken oben.</p>' : ''}
          ${D.helfer ? `<h4 class="bph-hh">Anfragen an die Helfer${offen.length ? ` · ${offen.length}` : ''}</h4>${offen.map((x) => zeile(x, true)).join('') || '<p class="bph-mu">Keine offenen Anfragen.</p>'}` : ''}
          <h4 class="bph-hh">Meine Anfragen</h4>${(D.meine || []).slice(0, 12).map((x) => zeile(x, false)).join('') || '<p class="bph-mu">Noch keine – Fragen und Antworten bleiben hier stehen.</p>'}
          ${D.fehler ? `<p class="bph-mu">${esc(D.fehler)}</p>` : ''}`;
      } else if (ansicht === 'frage' || ansicht === 'live') {
        const live = ansicht === 'live';
        B.innerHTML = `<button type="button" class="bph-hback" data-ha="start">‹ zurück</button>
          <label style="display:block;margin-top:.4rem">${live ? 'Worum geht es? (kurz, optional)' : 'Deine Frage'}<textarea data-ht rows="${live ? 2 : 5}" maxlength="8000" style="width:100%;margin-top:.3rem" placeholder="${live ? 'z. B. Ich finde im Auftrag den Nachtrag nicht.' : 'z. B. Wie bekomme ich den Nachtrag NT3 in die Teilrechnung?'}"></textarea></label>
          ${live ? `<p class="bph-mu" style="font-size:.85em">Nach „Bildschirm teilen“ fragt der Browser, was geteilt wird – am besten <b>diesen Tab</b>. Die Helfer bekommen sofort Bescheid. Sie sehen nur, was du teilst, können aber nichts anklicken. Beenden jederzeit über den roten Balken oben; aufbewahrt wird nichts.</p>`
            : `<div class="bph-row" style="margin-top:.5rem"><button type="button" class="bph-btn" data-ha="shot">📷 Diese Ansicht aufnehmen</button><label class="bph-btn">🖼 Bild wählen<input type="file" accept="image/png,image/jpeg,image/webp" data-hfile hidden></label><small class="bph-mu" style="align-self:center">oder mit Strg+V einfügen</small></div>
            ${bild ? `<div style="position:relative;display:inline-block;margin-top:.4rem"><img src="${bild}" alt="Bild zur Frage" style="max-width:100%;max-height:200px;border:1px solid var(--line,#ccc);border-radius:calc(6px*var(--rk,1))"><button type="button" class="bph-x" data-ha="bildweg" aria-label="Bild entfernen" style="position:absolute;top:4px;right:4px;background:#fff;color:#111">✕</button></div>` : ''}
            <p class="bph-mu" style="font-size:.8em;margin:.5rem 0 0">Mitgeschickt werden automatisch Seite, App, Projekt und Browser – wie beim Fehlermelden, keine Eingaben aus Feldern.</p>`}
          <div class="bph-row" style="justify-content:flex-end;margin-top:.7rem"><button type="button" class="bph-btn" data-ha="start">Abbrechen</button><button type="button" class="bph-btn pri" data-ha="${live ? 'livelos' : 'senden'}">${live ? '🖥️ Bildschirm teilen' : 'Senden'}</button></div>`;
        setTimeout(() => { const t = B.querySelector('[data-ht]'); if (t) t.focus(); }, 0);
        const f = B.querySelector('[data-hfile]'); if (f) f.onchange = () => { const x = f.files[0]; if (!x) return; const r = new FileReader(); r.onload = async () => { try { bild = await bildVerkleinern(r.result); zeigen(); } catch (er) { bpHinweis(er.message); } }; r.readAsDataURL(x); };
      } else if (ansicht === 'faden') {
        let F; try { F = await KX('api/bp/hilfe/' + fid); } catch (e) { B.innerHTML = `<button type="button" class="bph-hback" data-ha="start">‹ zurück</button><p class="bph-mu">${esc(e.message)}</p>`; return; }
        letzte = F.nachrichten.length ? F.nachrichten[F.nachrichten.length - 1].id : 0;
        const ich = F.user_id === (H.me || {}).id, zu2 = ['erledigt', 'beendet'].includes(F.status);
        B.innerHTML = `<button type="button" class="bph-hback" data-ha="start">‹ zurück</button>
          <div class="bph-hkopf"><b>${F.art === 'live' ? '🖥️ Live-Hilfe' : '✉️ Frage'} · ${esc(F.user_name)}</b><span class="bph-hs ${esc(F.status)}">${esc(F.status_name)}${F.helfer_name ? ' · ' + esc(F.helfer_name) : ''}</span><small class="bph-mu">${esc([F.app, F.projekt, hZeit(F.ts)].filter(Boolean).join(' · '))}</small></div>
          ${F.bild ? `<a href="api/bp/hilfe/${F.id}/bild" target="_blank" rel="noopener"><img src="api/bp/hilfe/${F.id}/bild" alt="Bild zur Frage" class="bph-hbild"></a>` : ''}
          <div class="bph-hv" data-hv>${hVerlauf(F.nachrichten)}</div>
          ${zu2 ? '' : `<div class="bph-hin"><textarea data-hantw rows="2" maxlength="8000" placeholder="${ich ? 'Nachricht an die Helfer …' : 'Antwort …'}"></textarea><button type="button" class="bph-btn pri" data-ha="antw">Senden</button></div>`}
          <div class="bph-row" style="justify-content:flex-end;margin-top:.6rem">
            ${F.ich_helfer && F.art === 'live' && !zu2 ? '<button type="button" class="bph-btn pri" data-ha="helfen">🖥️ Live ansehen</button>' : ''}
            ${F.ich_helfer && F.status === 'offen' && F.art !== 'live' ? '<button type="button" class="bph-btn" data-ha="uebern">Übernehmen</button>' : ''}
            ${!zu2 && (F.ich_helfer || ich) ? `<button type="button" class="bph-btn" data-ha="erl">✓ ${ich ? 'Hat sich erledigt' : 'Erledigt'}</button>` : ''}
            ${zu2 ? '<button type="button" class="bph-btn" data-ha="wieder">↺ Wieder öffnen</button>' : ''}</div>`;
        const v = B.querySelector('[data-hv]'); v.scrollTop = v.scrollHeight;
        const t = B.querySelector('[data-hantw]'); if (t) { t.focus(); t.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); B.querySelector('[data-ha="antw"]').click(); } }); }
        clearInterval(tFaden);
        tFaden = setInterval(async () => {   // neue Nachrichten im offenen Verlauf
          if (!bg.isConnected || ansicht !== 'faden') return clearInterval(tFaden);
          try { const N = await KX(`api/bp/hilfe/${fid}?seit=${letzte}`); if (N.nachrichten.length) { letzte = N.nachrichten[N.nachrichten.length - 1].id; const vv = B.querySelector('[data-hv]'); if (vv) { if (vv.querySelector('p.bph-mu')) vv.innerHTML = ''; vv.insertAdjacentHTML('beforeend', hVerlauf(N.nachrichten)); vv.scrollTop = vv.scrollHeight; } } } catch { /* nächstes Mal */ }
        }, 4000);
      }
    }
    bg.addEventListener('click', async (e) => {
      if (e.target.closest('[data-hx]')) { zu(); return; }   // daneben klicken schließt nicht
      const z = e.target.closest('[data-hf]'); if (z) { fid = +z.dataset.hf; ansicht = 'faden'; zeigen(); return; }
      const b = e.target.closest('[data-ha]'); if (!b) return; const a = b.dataset.ha;
      if (a === 'start') { clearInterval(tFaden); ansicht = 'start'; await laden(); hilfeZaehler(); zeigen(); return; }
      if (a === 'bug') { zu(); H.bugMelden(); return; }
      if (a === 'frage' || a === 'live') { if (a === 'live' && HLIVE) { bpHinweis('Du teilst deinen Bildschirm schon.'); return; } ansicht = a; zeigen(); return; }
      if (a === 'bildweg') { bild = ''; zeigen(); return; }
      if (a === 'shot') { const tx = (B.querySelector('[data-ht]') || {}).value || ''; bg.style.visibility = 'hidden'; const x = await ansichtAufnehmen(); bg.style.visibility = ''; if (x) { bild = x; zeigen(); setTimeout(() => { const t = B.querySelector('[data-ht]'); if (t) t.value = tx; }, 0); } return; }
      if (a === 'senden') {
        const text = B.querySelector('[data-ht]').value.trim(); if (text.length < 3) { bpHinweis('Bitte die Frage kurz beschreiben.'); return; }
        b.disabled = true; b.textContent = 'wird gesendet …';
        try { const r = await HJ('api/bp/hilfe', 'POST', { art: 'frage', text, bild, app: hAppName(), kontext: bugKontext() }); bild = ''; fid = r.anfrage.id; ansicht = 'faden'; zeigen(); if (window.toast) toast('Frage ist bei den Helfern angekommen.'); }
        catch (er) { b.disabled = false; b.textContent = 'Senden'; bpHinweis(er.message); }
        return;
      }
      if (a === 'livelos') { const text = B.querySelector('[data-ht]').value.trim(); bg.style.visibility = 'hidden'; const ok = await liveStarten(text); if (ok) zu(); else bg.style.visibility = ''; return; }
      if (a === 'antw') {
        const t = B.querySelector('[data-hantw]'), text = t.value.trim(); if (!text) return;
        b.disabled = true; try { await HJ('api/bp/hilfe/' + fid, 'PUT', { text }); t.value = ''; await zeigen(); } catch (er) { bpHinweis(er.message); } b.disabled = false; return;
      }
      if (a === 'erl' || a === 'wieder' || a === 'uebern') { try { await HJ('api/bp/hilfe/' + fid, 'PUT', { status: a === 'erl' ? 'erledigt' : a === 'wieder' ? 'offen' : 'laeuft' }); zeigen(); hilfeZaehler(); } catch (er) { bpHinweis(er.message); } return; }
      if (a === 'helfen') { zu(); H.hilfeLive(fid); }
    });
    await laden(); hilfeZaehler(); zeigen();
  };

  /* Hilfesuchender: Bildschirm teilen, Bilder senden, Zeiger und Nachrichten des Helfers zeigen */
  async function liveStarten(text) {
    if (!window.isSecureContext) { bpHinweis('Bildschirm teilen geht nur über eine sichere Adresse (https://…) – hier ist die Seite über ' + location.protocol + '//' + location.host + ' geöffnet. Bitte „Frage stellen“ mit einem Bildschirmfoto nutzen.'); return false; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { bpHinweis('Dieser Browser kann den Bildschirm nicht teilen. Bitte „Frage stellen“ mit einem Bildschirmfoto nutzen.'); return false; }
    let st; try { st = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: 5 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' }); }
    catch (er) { if (er && er.name !== 'NotAllowedError') bpHinweis('Teilen hat nicht geklappt: ' + (er.message || er)); return false; }
    let A; try { A = (await HJ('api/bp/hilfe', 'POST', { art: 'live', text, app: hAppName(), kontext: bugKontext() })).anfrage; }
    catch (er) { st.getTracks().forEach((t) => t.stop()); bpHinweis(er.message); return false; }
    const v = document.createElement('video'); v.srcObject = st; v.muted = true; v.playsInline = true; try { await v.play(); } catch { /* egal */ }
    const bar = document.createElement('div'); bar.className = 'bph-lbar'; bar.innerHTML = '<span>🔴 <b>Du teilst deinen Bildschirm</b> · <span data-lw>wartet auf einen Helfer …</span></span><button type="button" data-lchat>💬 Chat</button><button type="button" data-lend>Beenden</button>';
    const zg = document.createElement('div'); zg.className = 'bph-lzeiger'; zg.hidden = true; zg.innerHTML = '<i></i><span></span>';
    const ch = document.createElement('div'); ch.className = 'bph-lchat'; ch.innerHTML = '<div class="bph-lchat-h"><b>Live-Hilfe</b><button type="button" class="bph-x" data-lzu aria-label="Chat einklappen">–</button></div><div class="bph-hv" data-lv><p class="bph-mu">Hier schreibt der Helfer.</p></div><div class="bph-hin"><input data-lin placeholder="Nachricht …" maxlength="2000"><button type="button" class="bph-btn pri" data-lsend>›</button></div>';
    document.body.append(bar, zg, ch);
    const cv = document.createElement('canvas'), kl = document.createElement('canvas'); kl.width = 32; kl.height = 18;
    let seit = 0, alt = '', zuletzt = 0, aus = false, laeuft = false, zseq = -1;
    HLIVE = { id: A.id };
    const ende = async (grund) => {
      if (aus) return; aus = true; clearInterval(t); st.getTracks().forEach((x) => x.stop()); bar.remove(); zg.remove(); ch.remove(); HLIVE = null;
      if (grund !== 'server') { try { await HJ('api/bp/hilfe/' + A.id, 'PUT', { status: 'beendet' }); } catch { /* egal */ } }
      if (window.toast) toast(grund === 'server' ? 'Die Live-Hilfe wurde beendet.' : 'Bildschirm wird nicht mehr geteilt.');
    };
    st.getVideoTracks()[0].addEventListener('ended', () => ende());
    bar.addEventListener('click', (e) => { if (e.target.closest('[data-lend]')) ende(); if (e.target.closest('[data-lchat]')) ch.classList.toggle('zu'); });
    const senden = async () => { const i = ch.querySelector('[data-lin]'), tx = i.value.trim(); if (!tx) return; i.value = ''; try { await HJ('api/bp/hilfe/' + A.id, 'PUT', { text: tx, seit }); } catch (er) { bpHinweis(er.message); } };
    ch.addEventListener('click', (e) => { if (e.target.closest('[data-lzu]')) ch.classList.toggle('zu'); if (e.target.closest('[data-lsend]')) senden(); });
    ch.querySelector('[data-lin]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); senden(); } });
    const takt = async () => {
      if (aus || laeuft || !v.videoWidth) return; laeuft = true;
      try {
        kl.getContext('2d').drawImage(v, 0, 0, 32, 18); const fp = kl.toDataURL('image/jpeg', 0.5);
        let bildD = '';
        if (fp !== alt || Date.now() - zuletzt > 5000) {   // nur wenn sich etwas geändert hat (spätestens alle 5 s)
          const f = Math.min(1, 1440 / v.videoWidth); cv.width = Math.round(v.videoWidth * f); cv.height = Math.round(v.videoHeight * f);
          cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height); bildD = cv.toDataURL('image/jpeg', 0.62); alt = fp; zuletzt = Date.now();
        }
        const r = await HJ(`api/bp/hilfe/${A.id}/live`, 'POST', { bild: bildD, seit });
        if (r.ende) { ende('server'); return; }
        bar.querySelector('[data-lw]').textContent = r.helfer && r.status === 'laeuft' ? `${r.helfer} sieht zu` : 'wartet auf einen Helfer …';
        if (r.nachrichten && r.nachrichten.length) { seit = r.nachrichten[r.nachrichten.length - 1].id; const vv = ch.querySelector('[data-lv]'); if (vv.querySelector('p.bph-mu')) vv.innerHTML = ''; vv.insertAdjacentHTML('beforeend', hVerlauf(r.nachrichten)); vv.scrollTop = vv.scrollHeight; if (r.nachrichten.some((m) => !m.ich)) ch.classList.remove('zu'); }
        const z = r.live && r.live.zeiger;
        if (r.live && r.live.zseq !== zseq) { zseq = r.live.zseq; zg.hidden = !z; if (z) { zg.style.left = z.x + '%'; zg.style.top = z.y + '%'; zg.querySelector('span').textContent = z.text || ''; zg.classList.remove('neu'); void zg.offsetWidth; zg.classList.add('neu'); } }
      } catch { /* Netz – nächster Takt */ }
      laeuft = false;
    };
    const t = setInterval(takt, 800); takt();
    if (window.toast) toast('Die Helfer haben Bescheid bekommen.');
    return true;
  }

  /* Helfer: großes, verschiebbares Fenster mit dem Live-Bild, Zeiger und Chat */
  H.hilfeLive = async function (id) {
    if (HFENSTER) { HFENSTER.querySelector('.bph-dlg').focus(); return; }
    try { await HJ('api/bp/hilfe/' + id, 'PUT', { status: 'laeuft' }); } catch (er) { bpHinweis(er.message); return; }
    let F; try { F = await KX('api/bp/hilfe/' + id); } catch (er) { bpHinweis(er.message); return; }
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-hlive'; HFENSTER = bg;
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Live-Hilfe" tabindex="-1" style="width:min(1300px,97vw);height:88vh;max-height:none;display:flex;flex-direction:column;overflow:hidden">
      <div class="bph-dh"><b>🖥️ Live-Hilfe – ${esc(F.user_name)}${F.app ? ' · ' + esc(F.app) : ''}${F.projekt ? ' · ' + esc(F.projekt) : ''}</b><span class="bph-live" data-lst>● verbindet …</span><button type="button" class="bph-x" data-lend aria-label="Beenden">✕</button></div>
      <div class="bph-lb"><div class="bph-ls" data-ls title="Klicken: dorthin zeigen"><img data-limg alt="Bildschirm von ${esc(F.user_name)}"><div class="bph-lzeiger" data-lz hidden><i></i><span></span></div><p class="bph-mu" data-lwarte>Warte auf das erste Bild …</p></div>
        <div class="bph-lc"><div class="bph-hv" data-hv>${hVerlauf(F.nachrichten)}</div><div class="bph-hin"><input data-lin placeholder="Nachricht …" maxlength="2000"><button type="button" class="bph-btn pri" data-lsend>›</button></div></div></div>
      <div class="bph-lf"><span>👆 Ins Bild klicken: roter Zeiger erscheint bei ${esc(F.user_name)}</span><input data-ltext placeholder="Text am Zeiger, z. B. „Hier rechts klicken“" maxlength="120"><button type="button" class="bph-btn" data-lweg>Zeiger weg</button><span style="flex:1"></span><button type="button" class="bph-btn" data-lbug>🐞 Als Fehler melden</button><button type="button" class="bph-btn" data-lerl>✓ Erledigt</button><button type="button" class="bph-btn danger" data-lend>Beenden</button></div></div>`;
    document.body.appendChild(bg);
    const dlg = bg.querySelector('.bph-dlg'); try { dlgBeweglich(dlg); } catch { /* egal */ }
    const img = bg.querySelector('[data-limg]'), zg = bg.querySelector('[data-lz]'), st = bg.querySelector('[data-lst]'), vv = bg.querySelector('[data-hv]');
    let seq = 0, letzte = F.nachrichten.length ? F.nachrichten[F.nachrichten.length - 1].id : 0, aus = false, z = null, n = 0;
    const lage = () => { if (!z || !img.naturalWidth) { zg.hidden = true; return; } const r = img.getBoundingClientRect(), p = img.parentElement.getBoundingClientRect(); zg.hidden = false; zg.style.left = (r.left - p.left + r.width * z.x / 100) + 'px'; zg.style.top = (r.top - p.top + r.height * z.y / 100) + 'px'; zg.querySelector('span').textContent = z.text || ''; };
    const zu = (meldung) => { if (aus) return; aus = true; clearInterval(t1); bg.remove(); HFENSTER = null; if (meldung && window.toast) toast(meldung); hilfeZaehler(); };
    const zeigerSetzen = async (neu) => { z = neu; lage(); try { await HJ('api/bp/hilfe/' + id, 'PUT', { zeiger: neu }); } catch (er) { bpHinweis(er.message); } };
    bg.querySelector('[data-ls]').addEventListener('click', (e) => { if (!img.naturalWidth) return; const r = img.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return; zeigerSetzen({ x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100, text: bg.querySelector('[data-ltext]').value.trim() }); });
    bg.querySelector('[data-ltext]').addEventListener('change', () => { if (z) zeigerSetzen({ ...z, text: bg.querySelector('[data-ltext]').value.trim() }); });
    const senden = async () => { const i = bg.querySelector('[data-lin]'), tx = i.value.trim(); if (!tx) return; i.value = ''; try { await HJ('api/bp/hilfe/' + id, 'PUT', { text: tx }); } catch (er) { bpHinweis(er.message); } };
    bg.querySelector('[data-lin]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); senden(); } });
    new ResizeObserver(lage).observe(bg.querySelector('[data-ls]'));
    bg.addEventListener('click', async (e) => {
      if (e.target.closest('[data-lsend]')) { senden(); return; }
      if (e.target.closest('[data-lweg]')) { zeigerSetzen(null); return; }
      if (e.target.closest('[data-lbug]')) { if (!img.src) { bpHinweis('Noch kein Bild da.'); return; } H.bugMelden({ bild: img.src, text: `Aus der Live-Hilfe mit ${F.user_name}${F.app ? ' (' + F.app + ')' : ''}: ` }); return; }
      if (e.target.closest('[data-lerl]')) { try { await HJ('api/bp/hilfe/' + id, 'PUT', { status: 'erledigt' }); } catch { /* egal */ } zu('Live-Hilfe als erledigt abgeschlossen.'); return; }
      if (e.target.closest('[data-lend]')) { if (!(await bpFrage('Live-Hilfe beenden? Das Teilen hört bei ' + F.user_name + ' auf.', { ok: 'Beenden' }))) return; try { await HJ('api/bp/hilfe/' + id, 'PUT', { status: 'beendet' }); } catch { /* egal */ } zu('Live-Hilfe beendet.'); }
    });
    const takt = async () => {
      if (aus) return;
      try {
        const r = await KX(`api/bp/hilfe/${id}/live?seq=${seq}`);
        if (r.ende) { st.textContent = '● beendet'; st.classList.add('aus'); zu(`${F.user_name} hat das Teilen beendet.`); return; }
        if (r.neu) { seq = r.seq; img.src = r.bild; bg.querySelector('[data-lwarte]').hidden = true; st.textContent = '● LIVE'; st.classList.remove('aus'); setTimeout(lage, 30); }
        if (++n % 3 === 0) {
          const N = await KX(`api/bp/hilfe/${id}?seit=${letzte}`);
          if (N.nachrichten.length) { letzte = N.nachrichten[N.nachrichten.length - 1].id; if (vv.querySelector('p.bph-mu')) vv.innerHTML = ''; vv.insertAdjacentHTML('beforeend', hVerlauf(N.nachrichten)); vv.scrollTop = vv.scrollHeight; }
          if (N.live && N.live.ts) { const alt = (Date.now() - new Date(N.live.ts).getTime()) / 1000; if (alt > 15) { st.textContent = '● kein Bild seit ' + Math.round(alt) + ' s'; st.classList.add('aus'); } }
        }
      } catch { st.textContent = '● Verbindung …'; }
    };
    const t1 = setInterval(takt, 700); takt();
    setTimeout(() => bg.querySelector('[data-lin]').focus(), 50);
  };

  /* Zähler am 🐞? (neue Antworten für mich + offene Anfragen für Helfer) und Hinweis an die Helfer bei neuen Anfragen */
  const HGESEHEN = new Set(); try { JSON.parse(sessionStorage.getItem('bph.hilfe.gesehen') || '[]').forEach((x) => HGESEHEN.add(x)); } catch { /* egal */ }
  async function hilfeZaehler() {
    if (!H.me || !band) return;
    let d; try { d = await KX('api/bp/hilfe?kurz=1'); } catch { return; }
    HSTAND.helfer = d.helfer;
    const offen = (d.offen || []).filter((x) => x.user_id !== H.me.id && x.status === 'offen'), n = (d.neu || 0) + offen.length + (d.offen || []).filter((x) => x.helfer_id === H.me.id && x.neu).length;
    const el = band.querySelector('.bph-hn'); if (el) { el.hidden = !n; el.textContent = n > 9 ? '9+' : String(n || ''); }
    const hq = band.querySelector('.bph-hlp'); if (hq) { hq.classList.toggle('neu', !!d.aenderungen); hq.title = d.aenderungen ? `Hilfe und Änderungen – ${d.aenderungen} neu für dich` : 'Hilfe zu dieser App und alle Änderungen'; }
    if (d.eingang && d.eingang.n) { if (window.bpEingang) bpEingang.stand(d.eingang); else { H.eingangStand = d.eingang; const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'eingang.js' + v; document.head.appendChild(sc); } }   // Scans im Eingang: Fenster in jeder App (bp/eingang.js)
    offen.filter((x) => !HGESEHEN.has(x.id)).forEach((x) => {   // neue Anfrage → Hinweis oben rechts (einmal je Sitzung)
      HGESEHEN.add(x.id); try { sessionStorage.setItem('bph.hilfe.gesehen', JSON.stringify([...HGESEHEN].slice(-200))); } catch { /* egal */ }
      if (Date.now() - new Date(x.ts).getTime() > 30 * 60 * 1000) return;   // ältere nicht mehr aufpoppen lassen
      const tt = document.createElement('div'); tt.className = 'bph-htoast'; tt.setAttribute('role', 'status');
      tt.innerHTML = `<span>🙋 <b>${esc(x.user_name)}</b> bittet um ${x.art === 'live' ? 'Live-Hilfe' : 'Hilfe'}${x.app ? ' – ' + esc(x.app) : ''}${x.text ? `<small>${esc(x.text.slice(0, 90))}</small>` : ''}</span><button type="button" class="bph-btn pri" data-th>${x.art === 'live' ? 'Helfen' : 'Ansehen'}</button><button type="button" class="bph-x" data-tz aria-label="Später">✕</button>`;
      document.body.appendChild(tt);
      tt.addEventListener('click', (e) => { if (e.target.closest('[data-th]')) { tt.remove(); if (x.art === 'live') H.hilfeLive(x.id); else H.hilfe({ id: x.id }); } else if (e.target.closest('[data-tz]')) tt.remove(); });
      setTimeout(() => tt.remove(), 120000);
    });
  }
  function hilfeStart() {
    if (!H.me) return;
    hilfeZaehler();
    setInterval(() => { if (document.visibilityState === 'visible') hilfeZaehler(); }, 20000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') hilfeZaehler(); });
    const m = /[#&]hilfe=(\d+)/.exec(location.hash); if (m) { H.hilfe({ id: +m[1] }); try { history.replaceState(null, '', location.href.replace(/[#&]hilfe=\d+/, '')); } catch { /* egal */ } }
  }

  /* ---------- Dialoge der Kopfleiste (Projekt, Verlauf, Konto …): an der Titelzeile verschieben, an der Ecke in der Größe ändern ---------- */
  function dlgBeweglich(m) {
    if (!m || m.dataset.beweglich || innerWidth <= 700) return; m.dataset.beweglich = '1';
    m.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || e.target.closest('button,input,select,textarea,a,label,[contenteditable]')) return;
      const k = m.querySelector('.bph-dh,.bph-dlg-h,.bph-pe-h,h3,h2'), r = m.getBoundingClientRect(), kr = k && k.getBoundingClientRect();
      if (!(k && k.contains(e.target)) && !(e.clientY < Math.max(r.top + 34, kr ? kr.bottom + 4 : 0))) return;   // Kopf oder oberer Streifen des Fensters
      const dx = e.clientX - r.left, dy = e.clientY - r.top; e.preventDefault();
      Object.assign(m.style, { position: 'fixed', margin: '0', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px' });
      const mv = (ev) => { m.style.left = Math.max(-r.width + 100, Math.min(innerWidth - 100, ev.clientX - dx)) + 'px'; m.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + 'px'; };
      try { m.setPointerCapture(e.pointerId); } catch { /* egal */ }   // Ziehen reißt nicht ab (schnelle Bewegung, über PDF-Ansichten)
      const up = () => { m.removeEventListener('pointermove', mv); m.removeEventListener('pointerup', up); m.removeEventListener('pointercancel', up); };
      m.addEventListener('pointermove', mv); m.addEventListener('pointerup', up); m.addEventListener('pointercancel', up);
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
  /* ---------- Einheitliches Auswahlfeld (wie die Projektauswahl): <select data-bp-auswahl> mit <option data-sub="…" data-such="…">
     <select multiple data-bp-auswahl>: Häkchen je Eintrag, die Liste bleibt offen – suchen, anhaken, weiter suchen, anhaken …;
     „Übernehmen“ (oder Schließen) meldet change mit allen gewählten Optionen.
     und <optgroup label="…" [data-zu]> – data-zu: Gruppe zugeklappt („aus anderen Projekten (n) – anzeigen“), bei der Suche offen.
     Einheitliches Projektfeld: jede <select data-bp-projekte> wird zum Suchfeld mit Vervollständigung,
     darunter „Meine Projekte“ und „Andere Projekte“. Die <select> bleibt unsichtbar die Quelle (value + change-Ereignis),
     App-Code ändert sich also nicht. Gruppen der App (z. B. „erkannt“) und Sondereinträge („Alle Projekte“, „＋ neu“) bleiben. */
  let PA_MEIN = null, PA_P = {};
  const paMein = (neu) => (PA_MEIN = (!neu && PA_MEIN) || KX('api/bp/projekte').then((P) => { PA_P = Object.fromEntries(P.map((p) => [String(p.id), p])); return new Set(P.filter((p) => p.mein).map((p) => String(p.id))); }).catch(() => null));
  /* Standort für „Nach Standort“ und die Entfernungen (5 Minuten gemerkt, wie in der großen Projektauswahl) */
  H.standort = () => new Promise((ok, nein) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((g) => { const h = { lat: g.coords.latitude, lon: g.coords.longitude }; try { sessionStorage.setItem('bpHier', JSON.stringify(h)); } catch { /* egal */ } ok(h); }, nein, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }) : nein(new Error('kein GPS')));
  const paHier = () => { try { return JSON.parse(sessionStorage.getItem('bpHier') || 'null'); } catch { return null; } };
  const paDist = (p, h) => { if (!h || !p || p.lat == null || p.lon == null) return null; const r = (x) => x * Math.PI / 180;
    return 12742000 * Math.asin(Math.sqrt(Math.sin(r(p.lat - h.lat) / 2) ** 2 + Math.cos(r(h.lat)) * Math.cos(r(p.lat)) * Math.sin(r(p.lon - h.lon) / 2) ** 2)); };
  const paAdr = (p) => (p ? [p.street, [p.zip, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '');
  H.projektAuswahl = function (sel) {
    if (!sel || sel._bpPa) return; sel._bpPa = true;
    const w = document.createElement('span'); w.className = 'bph-pa';
    w.innerHTML = '<input type="text" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false"><span class="bph-pa-c" aria-hidden="true">▾</span>';
    const inp = w.firstChild; inp.setAttribute('aria-label', sel.getAttribute('aria-label') || 'Projekt'); if (sel.id) { inp.id = sel.id + '_pa'; const lb = document.querySelector(`label[for="${sel.id}"]`); if (lb) lb.htmlFor = inp.id; }
    const sw = sel.getBoundingClientRect().width; if (sw > 40 && !sel.closest('.fm,.bph-dm,.bph-row')) w.style.width = Math.max(sw, 200) + 'px';
    sel.after(w); sel.style.display = 'none'; sel.tabIndex = -1;
    let box = null, L = [], ak = -1, mein = null;
    const ALLG = sel.hasAttribute('data-bp-auswahl'), offenZu = new Set();   // allgemeine Liste (Firmen, Aufträge …) · aufgeklappte Gruppen
    const MEHR = ALLG && sel.multiple;
    const text = () => { const o = sel.selectedOptions[0]; inp.value = MEHR ? '' : o ? o.textContent.trim() : ''; inp.placeholder = sel.dataset.ph || (ALLG ? 'Suchen …' : 'Projekt suchen …'); };
    const eintraege = () => {
      const out = [];
      [...sel.querySelectorAll('option')].forEach((o) => {
        if (o.disabled && !o.value) return;
        const og = o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : '';
        const projekt = !ALLG && /^\d+$/.test(o.value) && !(og && !/alle|projekte/i.test(og));
        if (ALLG && !o.value) return;
        if (ALLG) { out.push({ v: o.value, t: o.textContent.trim(), g: og || '', p: false, a: o.dataset.sub || '', s: o.dataset.such || '', d: null, zu: o.parentElement.tagName === 'OPTGROUP' && o.parentElement.hasAttribute('data-zu') }); return; }
        const pp = projekt ? PA_P[o.value] : null, h = paHier(), d = paDist(pp, h);
        out.push({ v: o.value, t: o.textContent.trim(), g: projekt ? (mein ? (mein.has(o.value) ? 'Meine Projekte' : 'Andere Projekte') : 'Projekte') : og || (o.value === '' ? '' : '…'), p: projekt,
          a: paAdr(pp), s: pp ? [pp.street, pp.zip, pp.city, pp.client, pp.bauleiter].join(' ') : '', d });
      });
      return out;
    };
    const zu = () => { if (MEHR && box && sel.selectedOptions.length) { box.remove(); box = null; sel.dispatchEvent(new Event('change', { bubbles: true })); } if (box) { box.remove(); box = null; } inp.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', aussen, true); window.removeEventListener('scroll', lage, true); };
    const aussen = (e) => { if (!w.contains(e.target) && !(box && box.contains(e.target))) { zu(); text(); } };
    const lage = () => { if (!box) return; const r = inp.getBoundingClientRect(), un = innerHeight - r.bottom; box.style.left = r.left + 'px'; box.style.width = Math.min(innerWidth - r.left - 8, Math.max(r.width, 340)) + 'px';
      if (un < 220 && r.top > un) { box.style.top = ''; box.style.bottom = (innerHeight - r.top + 2) + 'px'; box.style.maxHeight = Math.min(360, r.top - 10) + 'px'; } else { box.style.bottom = ''; box.style.top = (r.bottom + 2) + 'px'; box.style.maxHeight = Math.min(360, un - 10) + 'px'; } };
    const zeichnen = (q) => {
      const ws = q.trim().toLowerCase().split(/\s+/).filter(Boolean), E = eintraege().filter((x) => !ws.length || ws.every((t) => (x.t + ' ' + (x.s || '')).toLowerCase().includes(t)));
      if (E.some((x) => x.d != null)) E.sort((a, b) => (a.p && b.p ? (a.d ?? 1e12) - (b.d ?? 1e12) : 0));   // mit Standort: nächstes zuerst
      const ord = ['', ...new Set(E.filter((x) => !x.p && x.g && x.g !== '…').map((x) => x.g)), 'Meine Projekte', 'Projekte', 'Andere Projekte', '…'];
      L = []; let h = '';
      ord.forEach((gr) => { let G = E.filter((x) => x.g === gr); if (!G.length) return;
        if (G[0].zu && !ws.length) { const auf = offenZu.has(gr); h += `<button type="button" class="bph-pa-o bph-pa-zu" data-pazu="${esc(gr)}" tabindex="-1">${auf ? '▾' : '▸'} ${esc(gr)} (${G.length}) – ${auf ? 'ausblenden' : 'anzeigen'}</button>`; if (!auf) return; }
        else if (gr && gr !== '…') h += `<div class="bph-pa-g">${esc(gr)}</div>`;
        G.forEach((x) => { L.push(x); const km = x.d == null ? '' : x.d < 1000 ? Math.max(10, Math.round(x.d / 10) * 10) + ' m' : (x.d / 1000).toFixed(1).replace('.', ',') + ' km';
        const an = MEHR ? [...sel.selectedOptions].some((o) => o.value === x.v) : x.v === sel.value;
        h += `<button type="button" class="bph-pa-o${an ? ' on' : ''}${MEHR ? ' bph-pa-ck' : ''}${x.a ? ' zw' : ''}" data-pa="${L.length - 1}" tabindex="-1"><span>${esc(x.t)}${x.a ? `<small>${esc(x.a)}</small>` : ''}</span>${km ? `<i>${km}</i>` : ''}</button>`; }); });
      const nG = sel.selectedOptions.length;
      const fuss = MEHR ? `<div class="bph-pa-f"><span class="bph-pa-n2">${nG ? `${nG} gewählt` : 'anhaken – auch über mehrere Suchen'}</span>${nG ? '<button type="button" data-pafuss="leeren" tabindex="-1">Leeren</button>' : ''}<button type="button" data-pafuss="ok" tabindex="-1"${nG ? '' : ' disabled'}>Übernehmen</button></div>`
        : ALLG || sel.dataset.bpProjekte === 'einfach' ? '' : `<div class="bph-pa-f"><button type="button" data-pafuss="neu" tabindex="-1">＋ Neues Projekt</button><button type="button" data-pafuss="stand" tabindex="-1">📍 Nach Standort</button><button type="button" data-pafuss="gross" tabindex="-1" title="Große Projektauswahl mit allen Projekten">⤢ Alle</button></div>`;
      box.innerHTML = (h || `<div class="bph-pa-n">${sel.dataset.leer || 'Kein Projekt gefunden.'}</div>`) + fuss;
      ak = ws.length ? (L.findIndex((x) => x.p) >= 0 ? L.findIndex((x) => x.p) : 0) : L.findIndex((x) => x.v === sel.value); mark();
    };
    const mark = () => { if (!box) return; box.querySelectorAll('.bph-pa-o').forEach((b, i) => b.classList.toggle('ak', i === ak)); const b = box.querySelector('.ak'); if (b) b.scrollIntoView({ block: 'nearest' }); };
    let oeffnet = null;
    const auf = async () => {
      if (box) return; if (oeffnet) return oeffnet;   // schnelles Tippen: nur eine Liste öffnen
      oeffnet = ALLG ? Promise.resolve(null) : paMein(); mein = await oeffnet; oeffnet = null; if (box) return;
      box = document.createElement('div'); box.className = 'bph-pa-box'; box.setAttribute('role', 'listbox'); document.body.appendChild(box);
      inp.setAttribute('aria-expanded', 'true'); lage(); zeichnen(''); inp.select();
      document.addEventListener('mousedown', aussen, true); window.addEventListener('scroll', lage, true);
      box.addEventListener('mousedown', (e) => { e.preventDefault(); const f = e.target.closest('[data-pafuss]'); if (f) { fussAktion(f.dataset.pafuss); return; }
        const z = e.target.closest('[data-pazu]'); if (z) { const g = z.dataset.pazu; if (offenZu.has(g)) offenZu.delete(g); else offenZu.add(g); zeichnen(inp.value === (sel.selectedOptions[0] || {}).textContent ? '' : inp.value); return; } const b = e.target.closest('[data-pa]'); if (b) waehle(L[+b.dataset.pa]); });
    };
    /* Projekt per ID setzen – fehlt es in der Liste der App (z. B. gerade angelegt), wird es als Eintrag ergänzt */
    const setzeId = async (id, name) => {
      if (!id) return; const v = String(id);
      if (![...sel.options].some((o) => o.value === v)) { await paMein(true); const o = document.createElement('option'); o.value = v; o.textContent = name || (PA_P[v] || {}).name || ('Projekt ' + v); sel.appendChild(o); }
      waehle({ v });
    };
    const fussAktion = async (a) => {
      if (a === 'leeren') { [...sel.options].forEach((o) => { o.selected = false; }); zeichnen(inp.value); return; }
      zu(); text(); if (a === 'ok') return;
      if (a === 'neu') return H.projektBearbeiten(null, { onSaved: (id) => setzeId(id) });
      if (a === 'gross') return H.projektWahl({ aktuell: /^\d+$/.test(sel.value) ? +sel.value : null, onPick: (id, p) => setzeId(id, p && p.name) });
      if (a === 'stand') {
        let h; try { h = await H.standort(); } catch { if (window.bpHinweis) bpHinweis('Der Standort ist nicht verfügbar – bitte im Browser erlauben.'); return; }
        await paMein(); const n = [...sel.options].filter((o) => /^\d+$/.test(o.value)).map((o) => [o.value, paDist(PA_P[o.value], h)]).filter((x) => x[1] != null).sort((x, y) => x[1] - y[1])[0];
        if (n) waehle({ v: n[0] }); else if (window.toast) toast('Kein Projekt mit Lage in der Nähe gefunden.', true);
      }
    };
    const waehle = (x) => { if (!x) return;
      if (MEHR) { const o = [...sel.options].find((y) => y.value === x.v); if (o) o.selected = !o.selected; const q = inp.value, k = ak; zeichnen(q); ak = k; mark(); inp.focus(); return; }   // anhaken, Liste bleibt offen
      zu(); if (sel.value !== x.v) { sel.value = x.v; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } text(); };
    if (!ALLG) {   // Projektfeld: immer die Standardmaske (große Projektauswahl) – Sondereinträge der App (z. B. „ohne Projekt“, „erkannt“) stehen darin oben
      inp.readOnly = true; inp.style.cursor = 'pointer';
      const gross = (q) => {
        const oben = eintraege().filter((x) => !x.p && !(x.v === '' && /wählen/i.test(x.t))).map((x) => ({ value: x.v, titel: x.t, sub: x.g && x.g !== '…' ? x.g : '' }));
        H.projektWahl({ aktuell: /^\d+$/.test(sel.value) ? +sel.value : null, aktuellWert: sel.value, q: q || '', oben, onPick: (id, p) => (typeof id === 'string' && !/^\d+$/.test(id) ? waehle({ v: id }) : setzeId(id, p && p.name)) });
      };
      inp.addEventListener('click', () => gross());
      w.querySelector('.bph-pa-c').addEventListener('mousedown', (e) => { e.preventDefault(); gross(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); gross(); } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); gross(e.key); } });
      sel.addEventListener('change', text);
      new MutationObserver(() => text()).observe(sel, { childList: true, subtree: true, attributes: true });
      if (sel.disabled) inp.disabled = true;
      text(); return;
    }
    inp.addEventListener('focus', auf); inp.addEventListener('click', auf);
    w.querySelector('.bph-pa-c').addEventListener('mousedown', (e) => { e.preventDefault(); if (box) { zu(); text(); } else inp.focus(); });
    inp.addEventListener('input', () => { if (!box) auf().then(() => zeichnen(inp.value)); else zeichnen(inp.value); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!box) { auf(); return; } ak = Math.max(0, Math.min(L.length - 1, ak + (e.key === 'ArrowDown' ? 1 : -1))); mark(); }
      else if (e.key === 'Enter') { if (box) { e.preventDefault(); e.stopPropagation(); waehle(L[ak]); } }
      else if (e.key === 'Escape') { if (box) { e.preventDefault(); e.stopPropagation(); zu(); text(); } }
      else if (e.key === 'Tab') { zu(); text(); }
    });
    sel.addEventListener('change', text);
    new MutationObserver(() => { if (!box) text(); }).observe(sel, { childList: true, subtree: true, attributes: true });
    if (sel.disabled) inp.disabled = true;
    text();
  };
  /* Enter in Tabellen wie in einer Tabellenkalkulation: Wert übernehmen und eine Zeile tiefer ins Feld derselben Spalte
     (Umschalt+Enter: eine Zeile höher). Apps, die Enter selbst behandeln, rufen preventDefault – dann passiert hier nichts;
     data-enter="eigen" an einem Feld oder Bereich schaltet es ab. Läuft am window, also nach den Handlern der Apps. */
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target; if (!el || !el.closest) return;
    const istFeld = (el.tagName === 'INPUT' && !/^(button|submit|reset|file|image|hidden|range|color)$/i.test(el.type)) || el.tagName === 'SELECT';
    if (!istFeld || el.closest('[data-enter="eigen"]') || el.getAttribute('role') === 'combobox' || el.list) return;
    const td = el.closest('td,th'), tr = td && td.parentElement; if (!tr || !tr.closest('table')) return;
    const col = td.cellIndex, feldIn = (z) => { const c = z.cells && z.cells[col]; return c ? [...c.querySelectorAll('input:not([type=hidden]):not([disabled]):not([readonly]),select:not([disabled]),textarea:not([disabled]):not([readonly])')].find((x) => x.offsetParent !== null) : null; };
    let z = e.shiftKey ? tr.previousElementSibling : tr.nextElementSibling, ziel = null;
    while (z && !ziel) { ziel = feldIn(z); z = e.shiftKey ? z.previousElementSibling : z.nextElementSibling; }
    e.preventDefault();
    const fokus = (f) => { f.focus(); if (f.select && f.type !== 'date') try { f.select(); } catch { /* egal */ } };
    if (!ziel) { el.blur(); return; }   // letzte Zeile: nur übernehmen
    // Zeichnet die App die Tabelle nach dem Speichern neu, das Feld über seine data-Merkmale wiederfinden
    const sel = ziel.tagName.toLowerCase() + [...ziel.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
    fokus(ziel);
    if (sel.includes('[')) [60, 250, 600].forEach((t) => setTimeout(() => { if (document.body.contains(ziel)) return; const n = document.querySelector(sel); if (n && document.activeElement !== n) fokus(n); }, t));
  });
  const PA_SEL = 'select[data-bp-projekte],select[data-bp-auswahl]';
  const paScan = (r) => { (r.matches && r.matches(PA_SEL) ? [r] : []).concat([...(r.querySelectorAll ? r.querySelectorAll(PA_SEL) : [])]).forEach(H.projektAuswahl); };
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) paScan(n); }))).observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) paScan(document.body); else document.addEventListener('DOMContentLoaded', () => paScan(document.body));
  /* Die Kopfleiste zeigt immer das aktuelle Projekt (eine Projektauswahl für alle Apps); Apps wählen darunter nur ihr LV, ihren Plan … */
  function kopfProjekt() { const p = H.projekt; H.setProject(p ? { title: p.name, sub: p.adresse || 'Keine Adresse hinterlegt' } : null); }
  /* ---------- Projekt bearbeiten / anlegen – EINE Maske für alle Apps (Bautagebuch, Verwaltung, Projektauswahl) ----------
     H.projektBearbeiten(id | null, { onSaved(id), onDelete(projekt, close) })  – gespeichert wird im Bautagebuch */
  H.projektBearbeiten = async function (id, opt = {}) {
    if (id && !opt.klein) return H.projektDaten(id, '', opt);   // vorhandenes Projekt: eine Maske für alles (Bauvorhaben, Bauherr, Beteiligte, Termine …)
    const B = H.app === 'bautagebuch' ? 'api/' : 'api/bp/bt/';
    const J = (u, m, b) => KX(B + u, m ? { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined } : {});
    let P, LEAD;
    try { [P, LEAD] = await Promise.all([id ? J('projects').then((l) => l.find((x) => x.id === +id)) : null, J('leaders')]); } catch (e) { alert(e.message); return; }
    if (id && !P) { alert('Projekt nicht gefunden.'); return; }
    const neu = !P, me = H.me || {};
    const d = P ? { ...P, leaders: [...(P.leaders || [])] } : { name: opt.name || '', client: '', street: '', zip: '', city: '', folder: '', leaders: [me.id].filter(Boolean) };   // wer anlegt, ist zuständiger Bauleiter (abwählbar)
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = '<div class="bph-dlg bph-pe" role="dialog" aria-label="Projekt"></div>'; document.body.appendChild(bg);
    const root = bg.firstChild, close = () => { bg.remove(); document.removeEventListener('keydown', k1); }, k1 = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', k1);
    const adr = () => [d.street, [d.zip, d.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const hatPos = () => d.lat != null && d.lon != null;
    const karte = () => { const q = hatPos() ? d.lat + ',' + d.lon : adr(); if (!q) return ''; const e = encodeURIComponent(q);
      return `<div class="bph-map"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte" src="https://www.google.com/maps?q=${e}&hl=de&z=15&output=embed"></iframe><a href="https://www.google.com/maps/dir/?api=1&destination=${e}&travelmode=driving" target="_blank" rel="noopener">Route dorthin planen ↗</a></div>`; };
    const posInfo = () => ((d.extra && d.extra.addr_auto) ? 'Adresse und PLZ wurden automatisch aus dem Projektnamen ermittelt – bitte prüfen. ' : '')
      + (!hatBT() ? (neu ? 'Ohne Adresse wird sie beim Anlegen aus dem Projektnamen ermittelt.' : '') : hatPos() ? 'Standort gespeichert – damit wählt das Bautagebuch dieses Projekt automatisch, wenn du vor Ort bist.' : neu ? 'Ohne Adresse wird sie beim Anlegen aus dem Projektnamen ermittelt.' : 'Noch kein Standort: Adresse eintragen oder „Aktuellen Standort übernehmen“.');
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
        <div class="bph-row"><button type="button" class="bph-btn" data-pgeo>Adresse suchen</button>${hatBT() ? '<button type="button" class="bph-btn" data-phier>Aktuellen Standort übernehmen</button>' : ''}</div>
        <p class="bph-mu">${esc(posInfo())}</p>${karte()}
        <h4>Zuständige Bauleiter:in</h4><div class="bph-chips">${LEAD.map((u) => `<button type="button" class="bph-chip${d.leaders.includes(u.id) ? ' on' : ''}" data-pl="${u.id}" aria-pressed="${d.leaders.includes(u.id)}">${esc(u.name)}</button>`).join('') || '<small>Noch keine Benutzer:innen.</small>'}</div>
        <p class="bph-mu">${d.leaders.length ? 'Nur die ausgewählten Bauleiter:in und die Administratoren sehen dieses Projekt in der Projektauswahl.' : 'Niemand ausgewählt: alle Benutzer:innen sehen dieses Projekt.'}</p>
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
    let q = opt.q || '', fremd = false, hier = null;
    try { hier = JSON.parse(sessionStorage.getItem('bpHier') || 'null'); } catch { /* egal */ }
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-pw-bg';
    bg.innerHTML = `<div class="bph-dlg bph-pw" role="dialog" aria-label="Projekt wählen"><div class="bph-pwh"><input type="search" placeholder="Projekt suchen (Name oder Adresse)" autocomplete="off" data-pq><button type="button" class="bph-x" data-px aria-label="Schließen">×</button></div>
      <div class="bph-pwl" data-pl></div>
      <div class="bph-pwf"><button type="button" class="bph-btn" data-pneu>＋ Neues Projekt</button><button type="button" class="bph-btn" data-pstand>Nach Standort wählen</button><button type="button" class="bph-btn" data-pedit style="grid-column:1/-1">Projekt bearbeiten</button></div></div>`;
    document.body.appendChild(bg);
    const L = bg.querySelector('[data-pl]'), close = () => { bg.remove(); document.removeEventListener('keydown', k1); }, k1 = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', k1);
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
      const OB = (opt.oben || []).filter((x) => !q.trim() || (x.titel + ' ' + (x.sub || '')).toLowerCase().includes(q.trim().toLowerCase()));
      let h = (OB.length ? OB.map((x) => `<button type="button" class="bph-pi${String(opt.aktuellWert || '') === String(x.value) ? ' on' : ''}" data-poben="${esc(String(x.value))}"><span><b>${esc(x.titel)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span></button>`).join('') : '')
        + `<div class="bph-pws">Meine Projekte</div>` + (M.length ? M.map((p) => zeile(p, rechts(p))).join('') : `<div class="bph-pwe">${q.trim() ? 'Keine Treffer bei deinen Projekten.' : 'Du bist bei keinem Projekt als Bauleiter:in eingetragen.'}</div>`);
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
      const po = t.closest('[data-poben]'); if (po) { close(); if (opt.onPick) opt.onPick(po.dataset.poben, null); return; }
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
    draw(); { const qi = bg.querySelector('[data-pq]'); qi.value = q; qi.focus(); }
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
          <label style="flex:1.6">Ansprechpartner:in<input data-k="contact_person"></label></div>
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
    if (kom && L.length) host.insertAdjacentHTML('beforeend', `<p><a href="${esc(appUrl(kom))}/#kontakt=${cid}">↗ Alles mit diesem Kontakt in „Aufgaben & Post“</a></p>`);
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
  /* Größte Fläche je Zeichenfläche (Pixel): iOS/iPadOS stürzt ab oder bleibt weiß, wenn Canvas zu groß werden – ältere Geräte
     (iOS/Safari < 15) vertragen deutlich weniger. Aktuelle Geräte behalten die volle Schärfe (bis an die Grenze, die Safari ohnehin hat). */
  const CANVAS_MAX = (() => {
    const ua = navigator.userAgent || '', ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (!ios) return 32e6;
    const v = /OS (\d+)_\d+.* like Mac OS X/.exec(ua) || /Version\/(\d+)/.exec(ua);
    return v && +v[1] < 15 ? 4e6 : 16e6;
  })();
  const canvasMass = (w, h) => { const f = Math.min(1, Math.sqrt(CANVAS_MAX / Math.max(1, w * h))); return [Math.floor(w * f), Math.floor(h * f), f]; };
  /* Eine PDF-Seite zeichnen – ein Weg für pdfIn, Ansehen, Druckseite, Editoren: H.pdfSeite(seite, breiteCssPx, {doc, klasse, scharf, annot}) → {cv, v (CSS-Pixel), sc, fertig} */
  H.pdfSeite = function (pg, breite, o = {}) {
    const doc = o.doc || document, v0 = pg.getViewport({ scale: 1 }), sc = breite / v0.width, dpr = Math.min(2, Math.max((doc.defaultView || window).devicePixelRatio || 1, o.scharf ? 2 : 1));
    const vv = pg.getViewport({ scale: sc * dpr * canvasMass(v0.width * sc * dpr, v0.height * sc * dpr)[2] }), cv = Object.assign(doc.createElement('canvas'), { width: vv.width, height: vv.height, className: o.klasse || '' });
    return { cv, sc, v: pg.getViewport({ scale: sc }), fertig: pg.render({ canvasContext: cv.getContext('2d'), viewport: vv, ...(o.annot != null ? { annotationMode: o.annot } : {}) }).promise };
  }; H.pdfLib = () => pdfjs();
  /* PDF im Bereich rechts (z. B. Vorschau des Tagesberichts): alle Seiten untereinander, auf die Breite des Bereichs – statt <iframe>,
     das in manchen Browsern (Safari/iPad, schmale Bereiche) nur die erste Seite zeigt. BPHead.pdfIn(el, url, {ziel, top}) → Promise(Seitenzahl).
     Benannte Ziele des PDFs (z. B. „schritt-grundstueck“) lassen sich anspringen: o.ziel beim Laden, später BPHead.pdfZiel(el, name);
     o.top stellt nach dem Neuladen dieselbe Rollposition wieder her. */
  const pdfRoller = (el) => { for (let x = el; x && x.nodeType === 1; x = x.parentElement) { const o = getComputedStyle(x).overflowY; if ((o === 'auto' || o === 'scroll') && x.scrollHeight > x.clientHeight) return x; } return null; };
  function pdfWunsch(el, fertig) {
    const w = el._pdfWunsch, cvs = el.querySelectorAll(':scope > canvas.bph-pdfs, :scope > div > canvas'); if (!w) return;
    const sc = pdfRoller(el) || pdfRoller(el.parentElement); if (!sc) { if (fertig) el._pdfWunsch = null; return; }
    if (w.top != null) {   // wieder an dieselbe Stelle, sobald so viel gezeichnet ist
      const letzte = cvs[cvs.length - 1];
      if (!fertig && (!letzte || letzte.offsetTop + letzte.offsetHeight < w.top + sc.clientHeight)) return;
      sc.scrollTop = w.top; el._pdfWunsch = null; return;
    }
    const z = (el._pdfZiele || {})[w.ziel], cv = z && cvs[z.seite];
    if (!cv) { if (fertig) el._pdfWunsch = null; return; }
    const r = cv.getBoundingClientRect(), rs = sc.getBoundingClientRect();
    sc.scrollTo({ top: Math.max(0, sc.scrollTop + r.top - rs.top + z.y * r.height - 8), behavior: w.sanft ? 'smooth' : 'auto' });
    el._pdfWunsch = null;
  }
  H.pdfRolle = (el) => { const sc = el && (pdfRoller(el) || pdfRoller(el.parentElement)); return sc ? sc.scrollTop : 0; };   // für o.top beim Neuladen
  H.pdfZiel = function (el, name) { if (!el) return; el._pdfWunsch = { ziel: name, sanft: true }; pdfWunsch(el, !el._pdfLaeuft); };
  H.pdfIn = async function (el, url, o = {}) {   // o.box: jede Seite in ein <div class=o.box> (Druckseite, Zoom über --bpz) · o.breite: höchstens so breit · alte Seiten bleiben bis zum Tausch stehen
    const my = (el._pdfTok = (el._pdfTok || 0) + 1);
    el.classList.add('bph-pdfin'); const alt = !!el.querySelector('canvas'); if (!alt) el.innerHTML = '<div class="bph-gvl">Lade …</div>';   // alte Seiten bleiben stehen, bis die neuen fertig sind
    el._pdfZiele = {}; el._pdfLaeuft = true;
    el._pdfWunsch = o.ziel ? { ziel: o.ziel } : o.top ? { top: o.top } : null;
    try {
      const lib = await pdfjs();
      const data = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' })   // nachfragen statt neu laden: unverändert → aus dem Browser (ETag)
        .then((r) => { if (!r.ok) return r.json().catch(() => ({})).then((j) => { throw new Error(j.error || 'PDF nicht lesbar (' + r.status + ')'); }); return r.arrayBuffer(); });
      if (my !== el._pdfTok) return 0;
      if (o.daten) el._pdfDaten = data.slice(0);   // für „PDF“ / „Drucken“ ohne zweiten Abruf
      const doc = el.ownerDocument || document;   // im eigenen Browserfenster (⇱): Schriften dort anmelden, sonst erscheinen Kästchen statt Buchstaben
      const pdf = await lib.getDocument({ isEvalSupported: false, data, ownerDocument: doc }).promise;
      const ziele = {};   // benannte Ziele: {name: {seite, top}} – y als Anteil der Seite ergibt sich beim Zeichnen
      try { const Dz = (await pdf.getDestinations()) || {};
        for (const [k, d] of Object.entries(Dz)) { if (!Array.isArray(d) || d[0] == null) continue;
          const s = typeof d[0] === 'number' ? d[0] : await pdf.getPageIndex(d[0]), art = d[1] && d[1].name;
          ziele[k] = { seite: s, top: art === 'XYZ' ? d[3] : art === 'FitH' || art === 'FitBH' ? d[2] : null, y: 0 }; } } catch (e) { /* PDF ohne Ziele */ }
      if (my !== el._pdfTok) return 0;
      el._pdfZiele = ziele;
      const w = Math.min(o.breite || 1e9, Math.max(240, (el.clientWidth || 600) - (o.box ? 24 : 16)));
      const Z = alt ? doc.createElement('div') : el; if (!alt) el.innerHTML = '';   // neu gezeichnet wird daneben, dann in einem Zug getauscht
      for (let n = 1; n <= pdf.numPages && my === el._pdfTok; n++) {
        const pg = await pdf.getPage(n), S = H.pdfSeite(pg, w, { doc, klasse: o.box ? '' : 'bph-pdfs', scharf: pdf.numPages <= 12 });
        if (o.box) { const b = doc.createElement('div'); b.className = o.box; b.dataset.seite = n; b.style.width = S.v.width + 'px'; b.style.height = S.v.height + 'px'; b.appendChild(S.cv); Z.appendChild(b); } else Z.appendChild(S.cv);
        S.cv.setAttribute('aria-label', 'Seite ' + n);
        Object.values(ziele).forEach((z) => { if (z.seite === n - 1 && z.top != null) { const [, y0, , y1] = pg.view; z.y = Math.max(0, Math.min(1, (y1 - z.top) / ((y1 - y0) || 1))); } });
        await S.fertig;
        if (my === el._pdfTok && Z === el) pdfWunsch(el, false);
      }
      if (my === el._pdfTok) { if (Z !== el) el.replaceChildren(...Z.childNodes); el._pdfLaeuft = false; pdfWunsch(el, true); }
      return pdf.numPages;
    } catch (e) { if (my === el._pdfTok) { el._pdfLaeuft = false; el._pdfWunsch = null; el.innerHTML = `<div class="bph-gvl">${esc(e.message || 'PDF nicht lesbar')}</div>`; } return 0; }
  };
  H.pdfDrucken = function (u) {   // PDF (auch blob:) direkt drucken – am Handy im neuen Tab, dort über Teilen
    if (/iPhone|iPad|Android/i.test(navigator.userAgent)) { window.open(u, '_blank'); return; }
    const f = Object.assign(document.createElement('iframe'), { src: u, onload: () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(u, '_blank'); } setTimeout(() => f.remove(), 60000); } });
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(f);
  };
  H.ansehen = function (items, start = 0) {
    items = (items || []).filter((x) => x && x.url); if (!items.length) return;
    if (gv) gv.close(true);
    const el = document.createElement('div'); el.className = 'bph-gv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Ansicht');
    /* Aufbau wie der eingebaute Viewer (Mock 11.11.2026): schmale Leiste oben (am Handy blendet sie sich beim Scrollen aus, Antippen holt sie),
       am PC links die Pläne der Reihe als kleine Bilder, Zoom oben; Markieren-Werkzeuge in einer Leiste unten, Weiteres im Menü ⋯ */
    el.innerHTML = `<div class="bph-gvb"><button type="button" data-gv="x" aria-label="Schließen">✕</button><span class="bph-gvt"></span><span class="bph-gvn"></span>
      <span class="bph-gvz bp-zoom"><button type="button" data-gv="zm" aria-label="Verkleinern">−</button><button type="button" data-gv="fb" class="bph-gvzp" title="Auf Breite (zurück auf 100 %)">100 %</button><button type="button" data-gv="zp" aria-label="Vergrößern">+</button><button type="button" data-gv="fs" title="Ganze Seite">▢</button></span>
      <button type="button" data-gv="sk" class="bph-skb" aria-label="Markieren" title="Markieren – auch gemeinsam mit Kolleg:innen gleichzeitig" hidden>✏️ Markieren</button>
      <button type="button" data-gv="us" class="bph-gvus" aria-label="Unterschreiben" title="Unterschreiben oder stempeln – deine Unterschrift liegt gleich auf der letzten Seite, Stempel des Büros über 🔖" hidden>✍ Unterschreiben</button><button type="button" data-gv="dr" class="bph-gvpc" aria-label="Drucken" title="Drucken (mit Markierungen)">🖨</button><button type="button" data-gv="dl" aria-label="Teilen oder speichern" title="Teilen / speichern (mit Markierungen)">⤓</button><button type="button" data-gv="me" aria-label="Mehr" title="Mehr">⋯</button><button type="button" data-sk="ende" class="bph-gvf" hidden title="Markieren beenden (die Skizze bleibt gespeichert)">Fertig</button></div>
      <div class="bph-gvm" hidden></div>
      <div class="bph-gvk"><div class="bph-gvth" hidden></div><div class="bph-gvs"></div></div>
      <div class="bph-skl" hidden></div><div class="bph-gvd" hidden></div><button type="button" class="bph-gvmk" data-gv="sk" hidden>✏️ Markieren</button>
      <div class="bph-skm" hidden><button type="button" data-skm="stift" title="Zeichnen">✏️</button><button type="button" data-skm="zeigen" title="Nur zeigen / blättern">☝</button><button type="button" data-skm="zurueck" title="Letzten Strich zurück">↶</button><button type="button" data-skm="voll" title="Leisten wieder einblenden">⤡</button></div>
      <button type="button" class="bph-gvp" data-gv="prev" aria-label="Vorheriges">‹</button><button type="button" class="bph-gvp n" data-gv="next" aria-label="Nächstes">›</button>`;
    document.body.appendChild(el); document.body.classList.add('bph-gv-offen');
    if (H.GAST) el.querySelectorAll('[data-gv="dr"],[data-gv="dl"],[data-gv="x"]').forEach((b) => { b.hidden = true; });
    const TOUCH = matchMedia('(pointer:coarse)').matches, ENG = () => innerWidth < 760;   // Gäste: nur ansehen und markieren
    const S = el.querySelector('.bph-gvs'); S.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey) || !pdf) return; e.preventDefault(); setZoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });   // Strg + Mausrad wie auf der Druckseite
    let i = Math.max(0, Math.min(items.length - 1, start)), zoom = 1, tok = 0, pdf = null, roh = null, hoch = 1.414;   // hoch: Seitenverhältnis der ersten Seite (für „Ganze Seite“)
    const SK = { id: null, striche: [], seq: 0, werkzeug: 'stift', farbe: '#e5484d', leute: [], t: 0, zt: 0, owner: null, aus: false, dauerhaft: false, dauer: null };
    const fitW = () => Math.max(320, Math.min((S.clientWidth || window.innerWidth) - 16, 1400));
    async function show() {
      const x = items[i], my = ++tok; zoom = 1; pdf = null;
      el.querySelector('.bph-gvt').textContent = x.name || '';
      el.querySelector('.bph-gvn').textContent = items.length > 1 ? `${i + 1} / ${items.length}` : '';
      el.querySelectorAll('.bph-gvp').forEach((b) => { b.hidden = items.length < 2 || TOUCH || !TH.hidden; });   // Handy: wischen · PC mit Seitenleiste: Liste
      S.scrollTop = 0; S.innerHTML = '<div class="bph-gvl">Lade …</div>'; zoomText();
      el.querySelector('.bph-skb').hidden = x.typ !== 'pdf'; leisten();
      TH.querySelectorAll('[data-gvi]').forEach((b) => b.classList.toggle('on', +b.dataset.gvi === i));
      const on = TH.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
      const D = el.querySelector('.bph-gvd'); D.hidden = items.length < 2 || !(TOUCH || ENG());
      D.innerHTML = items.length > 12 ? `${i + 1} / ${items.length}` : items.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
      if (SK.id && !x.skizze) skEnde(true);
      if (!SK.id) { SK.striche = []; SK.dauer = null; skKnopf(); }
      if (x.typ !== 'pdf') { S.innerHTML = `<img class="bph-gvi" src="${esc(x.url)}" alt="${esc(x.name || '')}">`; return; }
      try {
        const lib = await pdfjs();
        const data = await fetch(x.url, { credentials: 'same-origin' }).then((r) => { if (!r.ok) throw new Error(r.status === 403 ? 'Keine Einladung zu dieser Skizze.' : 'Datei nicht lesbar (' + r.status + ')'); return r.arrayBuffer(); });
        if (my !== tok) return;
        roh = data.slice(0);
        pdf = await lib.getDocument({ isEvalSupported: false, data }).promise;
        await renderPdf(my);
        if (x.skizze && SK.id !== x.skizze) skBeitreten(x.skizze); else if (!x.skizze) skDauerSuchen(my);
      } catch (e) { if (my === tok) S.innerHTML = `<div class="bph-gvl">${esc(e.message || 'PDF nicht lesbar')}<br><a href="${esc(x.url)}" download>Datei herunterladen</a></div>`; }
    }
    async function renderPdf(my) {
      if (!pdf) return;
      S.innerHTML = '';
      for (let n = 1; n <= pdf.numPages && my === tok; n++) {
        const pg = await pdf.getPage(n), P = H.pdfSeite(pg, fitW() * zoom, { klasse: 'bph-gvc' }); if (n === 1) hoch = P.v.height / P.v.width;
        const wr = document.createElement('div'); wr.className = 'bph-pg'; wr.dataset.seite = n; wr.style.width = (zoom * 100) + '%';
        const ov = document.createElement('canvas'); ov.className = 'bph-skc';
        wr.append(P.cv, ov); S.appendChild(wr);
        await P.fertig;
        skZeichnen(n);
      }
      skModus();
    }
    /* ---------- Markieren, auch gemeinsam: Striche relativ zur Seite (0…1), Abgleich alle 0,7 s (siehe bpcore/skizze.py) ---------- */
    const SKW = { stift: ['✏️', 'Stift', 0.0022], marker: ['🖍', 'Marker', 0.011], pfeil: ['↗', 'Pfeil', 0.0025], rechteck: ['▭', 'Rechteck', 0.0025], text: ['T', 'Text', 0.0045], haken: ['✔', 'Haken (grün) – geprüft, in Ordnung', 0.004], kreuz: ['✘', 'Kreuz (rot) – gestrichen / nicht anerkannt', 0.004], zeigen: ['☝', 'Nur zeigen / blättern', 0] };
    /* Gäste ohne Anmeldung (H.GAST, Seite /gast/<Link>): dieselben Aufrufe gehen an api/bp/gast/<Link>/… – nur Stand, Strich, Löschen (eigene), Zeiger */
    const gastUrl = (u) => { const m = /^api\/bp\/skizze\/[\w-]+(?:\/(strich|loeschen|zeiger))?(\?.*)?$/.exec(u); if (!m) throw new Error('Für Gäste nicht verfügbar'); return `api/bp/gast/${encodeURIComponent(H.GAST.token)}/${m[1] || 'stand'}${m[2] || ''}`; };
    const SKJ = (u, m, b) => {
      if (!H.GAST) return KX(u, m ? { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) } : {});
      const h = { 'X-Gast-Id': H.GAST.id, 'X-Gast-Name': encodeURIComponent(H.GAST.name) };
      return KX(gastUrl(u), m ? { method: m, headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) } : { headers: h });
    };
    const ich = () => (H.me && H.me.id) || null;
    function skLeiste() {
      const L = el.querySelector('.bph-skl'); L.hidden = !SK.id;
      if (!SK.id) return;
      const andere = SK.leute.filter((p) => p.uid !== ich() && p.aktiv);
      const html = `${Object.entries(SKW).map(([k, [ic, t]]) => `<button type="button" data-skw="${k}" class="${SK.werkzeug === k ? 'on' : ''}" title="${t}">${ic}</button>`).join('')}
        <span class="bph-skf" style="background:${SK.farbe}" title="deine Farbe"></span><button type="button" data-sk="zurueck" title="Meinen letzten Strich zurücknehmen">↶</button>
        <span class="bph-skp" title="Wer gerade mitmarkiert">${andere.length ? andere.map((p) => `<i style="background:${p.farbe}"></i>${esc(p.name.split(' ')[0])}`).join(' ') : ''}</span>`;   // Behalten, Einladen, PDF, Löschen: im Menü ⋯ · Fertig: oben
      if (L._h !== html) { L._h = html; L.innerHTML = html; }   // nur bei Änderung neu zeichnen (Knöpfe bleiben klickbar)
    }
    function skModus() {   // Zeichnen fängt Maus/Finger ab, „Zeigen“ lässt blättern
      const malen = !!SK.id && SK.werkzeug !== 'zeigen';
      S.classList.toggle('bph-malen', malen);
      el.querySelector('.bph-skb').classList.toggle('on', !!SK.id);
      leisten();
    }
    function leisten() {   // was oben und unten steht: beim Markieren „Fertig“ oben und die Werkzeuge unten, sonst „Markieren“
      const mark = !!SK.id, isPdf = items[i] && items[i].typ === 'pdf';
      el.classList.toggle('bph-gvmark', mark);
      el.querySelector('.bph-gvf').hidden = !mark;
      el.querySelector('.bph-skb').hidden = !isPdf || mark;
      el.querySelector('.bph-gvus').hidden = !isPdf || mark || !!H.GAST || !window.bpUnterschrift;
      el.querySelector('.bph-gvmk').hidden = !isPdf || mark || !(TOUCH || ENG());
      el.querySelector('.bph-gvz').hidden = (TOUCH && ENG()) || !items[i];
    }
    const zoomText = () => { const z = el.querySelector('.bph-gvzp'); if (z) z.textContent = Math.round(zoom * 100) + ' %'; };
    /* Menü ⋯: Drucken, Teilen – beim Markieren dazu Behalten, Einladen, PDF mit Markierungen, Löschen, Leisten ausblenden */
    function menue() {
      const M = el.querySelector('.bph-gvm');
      if (!M.hidden) { M.hidden = true; return; }
      const mk = !!SK.id, x = items[i] || {};
      M.innerHTML = [mk && !H.GAST ? `<button type="button" data-sk="dauer">📌 ${SK.dauerhaft ? 'Dauerhaft am Plan – aufheben' : 'Markierungen am Plan behalten'}</button>` : '',
        mk && !H.GAST ? '<button type="button" data-sk="einladen">👥 Kolleg:innen oder Externe einladen …</button>' : '',
        mk && !H.GAST ? '<button type="button" data-sk="pdf">⤓ Plan mit Markierungen als PDF</button>' : '',
        mk ? `<button type="button" data-sk="alle">🗑 ${SK.owner === ich() ? 'Alle Markierungen löschen' : 'Alle meine Markierungen löschen'}</button>` : '',
        mk ? '<button type="button" data-sk="voll">⤢ Leisten ausblenden (mehr Platz)</button>' : '', mk && !H.GAST ? '<hr>' : '',
        H.GAST ? '' : `<button type="button" data-gv="dr">🖨 Drucken${mk || SK.dauer ? ' mit Markierungen' : ''}</button><button type="button" data-gv="dl">⤴ Teilen / speichern</button>`,
        x.typ === 'pdf' && TOUCH && ENG() ? '<button type="button" data-gv="fs">▢ Ganze Seite</button><button type="button" data-gv="fb">↔ Auf Breite</button>' : ''].join('');
      M.hidden = !M.innerHTML.trim();
    }
    function skZeichnen(seite) {
      const wr = S.querySelector(`.bph-pg[data-seite="${seite}"]`); if (!wr) return;
      const ov = wr.querySelector('.bph-skc'), dpr = Math.min(2, window.devicePixelRatio || 1), W = wr.clientWidth, Hh = wr.clientHeight;
      if (!W || !Hh) return;
      const k = dpr * canvasMass(W * dpr, Hh * dpr)[2];   // Überlage nicht größer als das Gerät verträgt
      if (ov.width !== Math.round(W * k) || ov.height !== Math.round(Hh * k)) { ov.width = Math.round(W * k); ov.height = Math.round(Hh * k); }
      const g = ov.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, W, Hh);
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
      if (d.art === 'haken' || d.art === 'kreuz') {   // Prüfzeichen
        const [x, y] = P[0], q = Math.max(10, bw * 4); g.strokeStyle = d.farbe; g.lineWidth = Math.max(2, q / 6); g.beginPath();
        if (d.art === 'haken') { const a = -(((d.pts[0][0] * 131 + d.pts[0][1] * 977) * 9301 + 49297) % 233280 / 233280 * 16 - 8) * Math.PI / 180, Q = (u, v) => [x + q * (u * Math.cos(a) - v * Math.sin(a)), y + q * (u * Math.sin(a) + v * Math.cos(a))];   // wie mit dem Stift gezogen (gleich wie im Ausdruck: skizze.pdf_zeichnen)
          g.moveTo(...Q(-.42, 0)); g.bezierCurveTo(...Q(-.32, .08), ...Q(-.22, .2), ...Q(-.15, .36)); g.bezierCurveTo(...Q(0, 0), ...Q(.3, -.42), ...Q(.66, -.63)); }
        else { g.moveTo(x - q * .45, y - q * .45); g.lineTo(x + q * .45, y + q * .45); g.moveTo(x - q * .45, y + q * .45); g.lineTo(x + q * .45, y - q * .45); }
        g.stroke(); return; }
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
      if (H.GAST && r.ich) { H.me = { ...(H.me || {}), id: r.ich }; if (r.name) el.querySelector('.bph-gvt').textContent = r.name; }
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
      catch (e) { if (/gibt es nicht|Keine Einladung|nicht \(mehr\) gültig/.test(e.message)) { skEnde(true); alert(e.message); } }
    }
    function skLauf() { clearInterval(SK.t); SK.t = setInterval(() => { if (document.visibilityState === 'visible') skAbgleich(); }, 700); }
    async function skStart() {
      if (!roh) return;
      if (H.GAST) return skBeitreten('gast');
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
    async function skEnde(still) {
      const warId = SK.id, eigene = SK.striche.some((d) => d.uid === ich());
      if (!still && !H.GAST && warId && !SK.dauerhaft && eigene) {   // beim Fertig und beim Schließen: klar fragen, ob die Markierung bleibt
        const ja = await bpFrage('Markierungen am Plan behalten?\n\nBleibende Markierungen sieht jeder, der diesen Plan öffnet – auch in den anderen Apps. In der Planliste steht dann „📌 markiert“.', { ok: '📌 Behalten', abbrechen: 'Nicht behalten' });
        if (ja) SKJ(`api/bp/skizze/${warId}/dauerhaft`, 'POST', { an: true }).then(() => { skDauerSuchen(tok); if (window.toast) toast('Markierung bleibt – in der Planliste als „📌 markiert“ vermerkt.'); }).catch((er) => alert(er.message));
        else if (window.toast) toast('Markierung nicht behalten – sie erscheint beim nächsten Öffnen nicht mehr.');
      } else if (!still && SK.dauerhaft && window.toast) toast('Markierung bleibt am Plan (📌 in der Planliste).');
      clearInterval(SK.t); if (SK.id) SKJ(`api/bp/skizze/${SK.id}/zeiger`, 'POST', { seite: 0, x: null, y: null }).catch(() => {});
      SK.id = null; SK.striche = []; SK.leute = []; SK.dauerhaft = false; SK.dauer = null; el.classList.remove('bph-voll'); el.querySelector('.bph-skm').hidden = true; skLeiste(); skModus(); skKnopf(); if (!still) { alleZeichnen(); if (warId && items[i] && !items[i].skizze) skDauerSuchen(tok); }
    }
    function skPunkt(e) { const wr = e.target.closest && e.target.closest('.bph-pg'); if (!wr) return null; const r = wr.getBoundingClientRect(); return { wr, seite: +wr.dataset.seite, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
    S.addEventListener('pointerdown', (e) => {
      if (!SK.id || SK.werkzeug === 'zeigen') return;
      const p = skPunkt(e); if (!p) return;
      e.preventDefault();
      if (SK.werkzeug === 'haken' || SK.werkzeug === 'kreuz') {   // ein Klick setzt das Prüfzeichen (Haken grün, Kreuz rot)
        const d = { seite: p.seite, art: SK.werkzeug, farbe: SK.werkzeug === 'haken' ? '#1f9d4c' : '#e02424', breite: SKW[SK.werkzeug][2], pts: [[p.x, p.y]], tmp: true, uid: ich() };
        SK.striche.push(d); skZeichnen(p.seite); SKJ(`api/bp/skizze/${SK.id}/strich`, 'POST', d).then((r) => { d.id = r.id; delete d.tmp; }).catch((er) => bpHinweis(er.message)); return;
      }
      if (SK.werkzeug === 'text') {   // direkt an der Stelle im Plan tippen – Enter übernimmt, Esc verwirft
        const alt = p.wr.querySelector('.bph-sktxt'); if (alt) { alt.blur(); return; }
        const W = p.wr.getBoundingClientRect().width, fs = Math.max(10, Math.max(1, SKW.text[2] * W) * 4);
        const inp = document.createElement('input'); inp.className = 'bph-sktxt'; inp.placeholder = 'Text …';
        Object.assign(inp.style, { left: (p.x * 100) + '%', top: (p.y * 100) + '%', fontSize: fs + 'px', color: SK.farbe, borderColor: SK.farbe });
        p.wr.appendChild(inp); setTimeout(() => inp.focus(), 0);
        let fertig = false;
        const ende = (ok) => {
          if (fertig) return; fertig = true; const t = inp.value.trim(); inp.remove();
          if (!ok || !t) return;
          const d = { seite: p.seite, art: 'text', farbe: SK.farbe, breite: SKW.text[2], pts: [[p.x, p.y]], text: t, tmp: true, uid: ich() };
          SK.striche.push(d); skZeichnen(p.seite); SKJ(`api/bp/skizze/${SK.id}/strich`, 'POST', d).then((r) => { d.id = r.id; delete d.tmp; }).catch((er) => bpHinweis(er.message));
        };
        inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); ende(true); } else if (ev.key === 'Escape') { ev.preventDefault(); ende(false); } });
        inp.addEventListener('blur', () => ende(true));
        inp.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        return;
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
      if (!roh || SK.id || H.GAST) return;
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
      el.querySelector('.bph-gvmk').innerHTML = b.innerHTML;
      b.title = n ? 'Dieser Plan hat dauerhafte Markierungen – klicken zum Weitermarkieren' : 'Markieren – auch gemeinsam mit Kolleg:innen gleichzeitig';
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
        if (items[i].typ !== 'pdf') { window.open(u, '_blank'); return; }
        H.pdfDrucken(u);
      } catch (e) { alert(e.message || 'Drucken nicht möglich'); }
    }
    async function skEinladen() {
      let K; try { K = await SKJ('api/bp/kollegen'); } catch (e) { alert(e.message); return; }
      const link = location.origin + location.pathname + '#skizze=' + SK.id;
      const d = document.createElement('div'); d.className = 'bph-dlg-bg'; d.style.zIndex = 6000;
      d.innerHTML = `<div class="bph-dlg" style="max-width:26rem"><div class="bph-dh"><b>Gemeinsam markieren</b><button type="button" class="bph-x" data-kx>×</button></div><div class="bph-db">
        <p class="bph-mu" style="margin:0 0 .2rem">Kolleg:innen antippen und einladen – oder den Link selbst verschicken. Striche und Zeiger sehen alle gleichzeitig.</p>
        <div class="bph-skk">${K.map((k) => `<label class="bph-skw${k.online ? ' da' : ''}" title="${k.online ? 'gerade angemeldet' : ''}"><input type="checkbox" value="${k.id}">${esc(k.name)}</label>`).join('') || '<p class="bph-mu">Keine weiteren Benutzer:in.</p>'}</div>
        <label class="bph-ck" style="margin:.1rem 0 .4rem;font-size:.86em"><input type="checkbox" data-kmail checked> zusätzlich per E-Mail (mit Link)</label>
        <div class="bph-row"><button type="button" class="bph-btn pri" data-ko>Einladen</button><button type="button" class="bph-btn" data-kl>Link kopieren</button><a class="bph-btn" data-kmailto href="mailto:?subject=${encodeURIComponent('Gemeinsam markieren: ' + (items[i].name || 'Plan'))}&body=${encodeURIComponent('Bitte öffne den Plan, dann markieren wir gemeinsam:\n' + link)}" title="Eigene Mail mit dem Link schreiben – auch an Leute außerhalb">✉ Per Mail …</a></div>
        <p class="bph-mu" data-km></p>
        <div class="bph-skx"><b>Externe ohne Anmeldung</b><p class="bph-mu" style="margin:.2rem 0 .4rem">Ein eigener, befristeter Link nur für diesen Plan – z. B. für Fachplaner:in oder Bauherr:in. Externe sehen nichts anderes, zeichnen mit und löschen nur ihre eigenen Striche. Zurückziehen geht jederzeit.</p>
          <div class="bph-gm"><span data-gmc></span><input data-gmi list="bphGmL" placeholder="E-Mail oder Name aus den Adressen …" autocomplete="off" aria-label="E-Mail-Adresse"><datalist id="bphGmL"></datalist></div>
          <div class="bph-row"><select data-kgt aria-label="gültig"><option value="1">1 Tag gültig</option><option value="7" selected>7 Tage gültig</option><option value="30">30 Tage gültig</option></select><button type="button" class="bph-btn pri" data-kgm>✉ Per E-Mail einladen</button><button type="button" class="bph-btn" data-kg>🔗 Nur Link erzeugen</button></div>
          <div data-kgl></div></div></div></div>`;
      el.appendChild(d);
      const gl = (L, neu) => {   // gültige Gast-Links; ein neuer steht einmal im Klartext da (gespeichert wird nur eine Prüfsumme)
        const de = (t) => new Date(t).toLocaleDateString('de-DE');
        d.querySelector('[data-kgl]').innerHTML = (neu ? `<div class="bph-skneu"><input readonly value="${esc(neu.url)}" aria-label="Link für Externe"><div class="bph-row"><button type="button" class="bph-btn pri" data-kgc>Kopieren</button><a class="bph-btn" href="mailto:?subject=${encodeURIComponent('Plan gemeinsam markieren: ' + (items[i].name || 'Plan'))}&body=${encodeURIComponent('Bitte öffne den Plan über diesen Link, dann markieren wir gemeinsam (keine Anmeldung nötig, gültig bis ' + de(neu.ablauf) + '):\n' + neu.url)}">✉ Per Mail …</a></div><small class="bph-mu">Den Link nur an die vorgesehenen Personen schicken – wer ihn hat, kommt bis zum ${de(neu.ablauf)} auf diesen Plan.</small></div>` : '')
          + (L.length ? `<div class="bph-mu" style="margin-top:.4rem">Gültige Links: ${L.map((x) => `<span class="bph-chip">bis ${de(x.ablauf)} · ${esc(x.von)} <button type="button" data-kgx="${esc(x.id)}" title="Link zurückziehen – er funktioniert dann sofort nicht mehr">✕</button></span>`).join(' ')}${L.length > 1 ? ' <button type="button" class="bph-btn" data-kgx="*">alle zurückziehen</button>' : ''}</div>` : '');
      };
      SKJ(`api/bp/skizze/${SK.id}/gastlinks`).then((r) => gl(r.links || [])).catch(() => {});
      /* Empfänger für die Einladung per E-Mail: aus den Adressen (auch weitere E-Mails) oder frei eingetippt */
      const GM = [], gmI = d.querySelector('[data-gmi]'), gmOk = (v) => /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/.test(v);
      const gmZeigen = () => { d.querySelector('[data-gmc]').innerHTML = GM.map((m, k) => `<span class="bph-chip">${esc(m)} <button type="button" data-gmx="${k}" aria-label="entfernen">✕</button></span>`).join(''); };
      const gmAdd = () => { const v = gmI.value.trim().replace(/[,;]$/, ''); if (!v) return true; if (!gmOk(v)) return false; if (!GM.some((x) => x.toLowerCase() === v.toLowerCase())) GM.push(v); gmI.value = ''; gmZeigen(); return true; };
      let gmT = 0;
      gmI.addEventListener('input', () => {
        if (/[,;\s]$/.test(gmI.value) && gmOk(gmI.value.trim().replace(/[,;]$/, ''))) { gmAdd(); return; }
        if (gmOk(gmI.value.trim()) && [...d.querySelectorAll('#bphGmL option')].some((o) => o.value === gmI.value.trim())) { gmAdd(); return; }   // aus der Liste gewählt
        clearTimeout(gmT); const q = gmI.value.trim(); if (q.length < 2) return;
        gmT = setTimeout(async () => { try { const L = await KX('api/bp/mailadressen?q=' + encodeURIComponent(q)); d.querySelector('#bphGmL').innerHTML = L.map((x) => `<option value="${esc(x.email)}">${esc(x.name)}</option>`).join(''); } catch { /* ohne Vorschläge */ } }, 200);
      });
      gmI.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); if (!gmAdd()) d.querySelector('[data-km]').textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.'; } });
      d.addEventListener('click', async (e) => {
        if (e.target.closest('[data-kx]')) return d.remove();   // daneben klicken schließt nicht
        const gx0 = e.target.closest('[data-gmx]'); if (gx0) { GM.splice(+gx0.dataset.gmx, 1); gmZeigen(); return; }
        const gmb = e.target.closest('[data-kgm]');
        if (gmb) {
          if (!gmAdd()) { d.querySelector('[data-km]').textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.'; return; }
          if (!GM.length) { d.querySelector('[data-km]').textContent = 'Bitte eine E-Mail-Adresse eingeben oder aus den Adressen wählen.'; gmI.focus(); return; }
          gmb.disabled = true;
          try {
            const r = await SKJ(`api/bp/skizze/${SK.id}/gastmail`, 'POST', { an: GM, tage: +d.querySelector('[data-kgt]').value, basis: location.origin });
            gl(r.links || []); GM.length = 0; gmZeigen();
            d.querySelector('[data-km]').textContent = (r.gesendet.length ? 'Eingeladen per E-Mail: ' + r.gesendet.join(', ') + '. Jeder hat einen eigenen Link, einzeln zurückziehbar.' : '') + (r.fehler.length ? ' Nicht gesendet: ' + r.fehler.join('; ') : '');
          } catch (er) { d.querySelector('[data-km]').textContent = er.message; } finally { gmb.disabled = false; }
          return;
        }
        const gb = e.target.closest('[data-kg]');
        if (gb) { gb.disabled = true; try { const r = await SKJ(`api/bp/skizze/${SK.id}/gastlinks`, 'POST', { tage: +d.querySelector('[data-kgt]').value }); gl(r.links || [], { url: location.origin + '/gast/' + r.token, ablauf: r.ablauf }); } catch (er) { d.querySelector('[data-km]').textContent = er.message; } finally { gb.disabled = false; } return; }
        const gc = e.target.closest('[data-kgc]'); if (gc) { const inp = d.querySelector('.bph-skneu input'); try { await navigator.clipboard.writeText(inp.value); gc.textContent = 'Kopiert ✓'; } catch { inp.select(); } return; }
        const gx = e.target.closest('[data-kgx]');
        if (gx) { if (!(await bpFrage(gx.dataset.kgx === '*' ? 'Alle Links für Externe zurückziehen?' : 'Diesen Link zurückziehen? Er funktioniert dann sofort nicht mehr.', { ok: 'Zurückziehen' }))) return;
          try { const r = await KX(`api/bp/skizze/${SK.id}/gastlinks`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gx.dataset.kgx === '*' ? {} : { id: gx.dataset.kgx }) }); gl(r.links || []); } catch (er) { d.querySelector('[data-km]').textContent = er.message; } return; }
        if (e.target.closest('[data-kl]')) { try { await navigator.clipboard.writeText(link); d.querySelector('[data-km]').textContent = 'Link kopiert – z. B. in Teams oder per Mail schicken. Wer ihn öffnet, ist sofort dabei, eine Einladung ist nicht nötig.'; } catch { (await bpEingabe('Link:', link)); } return; }
        if (e.target.closest('[data-ko]')) {
          const an = [...d.querySelectorAll('.bph-skk input:checked')].map((x) => +x.value); if (!an.length) return;
          try {
            const r = await SKJ(`api/bp/skizze/${SK.id}/einladen`, 'POST', { an, mail: d.querySelector('[data-kmail]').checked, link });
            d.remove(); if (window.toast) toast('Eingeladen' + (r.mails && r.mails.length ? ' und per E-Mail benachrichtigt' : '') + ' – sobald sie mitmachen, siehst du ihre Zeiger.' + (r.fehler && r.fehler.length ? ' Mail nicht gesendet: ' + r.fehler.join('; ') : ''), !!(r.fehler && r.fehler.length));
          } catch (er) { d.querySelector('[data-km]').textContent = er.message; }
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
    el.addEventListener('click', async (e) => {
      if (!e.target.closest('.bph-skl,.bph-gvm,.bph-gvb')) return;
      const w = e.target.closest('[data-skw]'); if (w) { SK.werkzeug = w.dataset.skw; if (w.dataset.skw !== 'zeigen') SK.letztes = w.dataset.skw; skLeiste(); skModus(); return; }
      const b = e.target.closest('[data-sk]'); if (!b) return;
      const a = b.dataset.sk; el.querySelector('.bph-gvm').hidden = true;
      if (!SK.id) return;
      if (a === 'zurueck') { await SKJ(`api/bp/skizze/${SK.id}/loeschen`, 'POST', { was: 'letzter' }).catch((er) => alert(er.message)); return skAbgleich(); }
      if (a === 'alle') { if (!(await bpFrage(SK.owner === ich() ? 'Alle Markierungen auf diesem Plan löschen – auch die der anderen?' : 'Alle deine Markierungen löschen?'))) return; await SKJ(`api/bp/skizze/${SK.id}/loeschen`, 'POST', { was: 'alle' }).catch((er) => alert(er.message)); return skAbgleich(); }
      if (a === 'einladen') return skEinladen();
      if (a === 'pdf') return skPdf();
      if (a === 'dauer') { const an = !SK.dauerhaft; if (!an && !(await bpFrage('Markierungen nicht mehr dauerhaft am Plan zeigen?'))) return; await SKJ(`api/bp/skizze/${SK.id}/dauerhaft`, 'POST', { an }).catch((er) => alert(er.message)); return skAbgleich(); }
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
    function setZoom(d, abs) {
      zoom = Math.max(0.3, Math.min(5, abs != null ? abs : zoom * (d > 0 ? 1.4 : 1 / 1.4))); zoomText();
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
      if (!gv) return; tok++; skEnde(true); el.remove(); document.body.classList.remove('bph-gv-offen'); document.removeEventListener('keydown', key, true); removeEventListener('popstate', pop); gv = null;
      setTimeout(() => document.dispatchEvent(new CustomEvent('bph:ansehen-zu')), 700);   // Apps frischen auf (z. B. „📌 markiert“ in der Planliste)
      if (!ohneZurueck && history.state && history.state.bphGv) history.back();
    }
    const pop = () => close(true);
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-gvi]'); if (t) { i = +t.dataset.gvi; show(); return; }
      const b = e.target.closest('[data-gv]');
      if (!e.target.closest('.bph-gvm,[data-gv="me"]')) el.querySelector('.bph-gvm').hidden = true;
      if (!b) { if (TOUCH && S.contains(e.target) && !(SK.id && SK.werkzeug !== 'zeigen')) el.classList.toggle('bph-gvzu'); return; }   // Antippen: Leisten aus/ein (schließen nur über ✕)
      const a = b.dataset.gv; if (b.closest('.bph-gvm')) el.querySelector('.bph-gvm').hidden = true;
      if (a === 'me') { menue(); return; }
      if (a === 'us') { const us = (o) => bpUnterschrift.start({ el, S, roh: roh.slice(0), name: items[i].name, ...o, fertig: async (blob, nm) => { const cb = items[i].beiUnterschrift, F = items[i].folge || []; items[i] = { ...items[i], url: URL.createObjectURL(blob), name: nm, skizze: null, unterschrieben: true, folge: F.slice(1) }; await show(); if (F.length) us(F[0]); else if (cb) cb(blob, nm); } }); if (window.bpUnterschrift && roh) us({}); return; }   // folge: weitere Unterschriften nacheinander (z. B. [{ fremd: 'Bieter:in' }]), erst danach beiUnterschrift
      if (a === 'fb') { setZoom(0, 1); return; }
      if (a === 'fs') { setZoom(0, Math.min(1, (S.clientHeight - 16) / (fitW() * hoch))); return; }
      if (a === 'sk') { if (SK.id) { el.querySelector('.bph-skl').hidden = !el.querySelector('.bph-skl').hidden; } else skStart(); return; } if (a === 'x') { if (SK.id && !H.GAST) skEnde().then(() => close()); else close(); } else if (a === 'prev') go(-1); else if (a === 'next') go(1); else if (a === 'zp') setZoom(1); else if (a === 'zm') setZoom(-1); else if (a === 'dl') teilen(); else if (a === 'dr') drucken();
    });
    let tx = null, ty = 0, pz = null;   // Wischen links/rechts blättert (nur ohne Vergrößerung) · zwei Finger zoomen
    const abst = (T) => Math.hypot(T[0].clientX - T[1].clientX, T[0].clientY - T[1].clientY);
    S.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } else tx = null;
      if (e.touches.length === 2 && !(SK.id && SK.werkzeug !== 'zeigen')) pz = { d0: abst(e.touches), z0: zoom, f: 1 };
    }, { passive: true });
    S.addEventListener('touchmove', (e) => {
      if (!pz || e.touches.length !== 2) return; e.preventDefault();
      pz.f = Math.max(0.3 / pz.z0, Math.min(5 / pz.z0, abst(e.touches) / pz.d0));
      S.querySelectorAll('.bph-pg').forEach((w) => { w.style.width = (pz.z0 * pz.f * 100) + '%'; });   // sofort (unscharf), scharf nach dem Loslassen
      const im = S.querySelector('.bph-gvi'); if (im) { im.style.maxWidth = 'none'; im.style.maxHeight = 'none'; im.style.width = (fitW() * pz.z0 * pz.f) + 'px'; }
      const z = el.querySelector('.bph-gvzp'); if (z) z.textContent = Math.round(pz.z0 * pz.f * 100) + ' %';
    }, { passive: false });
    S.addEventListener('touchend', (e) => { if (pz && e.touches.length < 2) { const z = pz.z0 * pz.f; pz = null; tx = null; if (Math.abs(z - zoom) > 0.02) setZoom(0, z); } }, { passive: true });
    let sy = 0;   // am Handy: beim Scrollen nach unten Leisten aus, nach oben wieder ein
    S.addEventListener('scroll', () => { if (!TOUCH) return; const d = S.scrollTop - sy; sy = S.scrollTop; if (Math.abs(d) > 12) el.classList.toggle('bph-gvzu', d > 0 && S.scrollTop > 40); }, { passive: true });
    S.addEventListener('touchend', (e) => {
      if (tx == null || zoom !== 1 || (SK.id && SK.werkzeug !== 'zeigen')) return; const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    });
    S.addEventListener('dblclick', () => { if (!SK.id || SK.werkzeug === 'zeigen') setZoom(zoom === 1 ? 1 : -1); });
    /* PC: Seitenleiste mit den Plänen bzw. Fotos der Reihe – kleine Bilder (PDF: erste Seite, erst wenn sichtbar) */
    const TH = el.querySelector('.bph-gvth');
    if (items.length > 1 && !TOUCH && innerWidth >= 900) {
      TH.hidden = false;
      TH.innerHTML = items.map((x, k) => `<button type="button" data-gvi="${k}" title="${esc(x.name || '')}"><span class="bph-gvtb">${x.typ === 'pdf' ? '<canvas></canvas>' : `<img src="${esc(x.url)}" alt="" loading="lazy">`}</span><small>${esc(x.name || (k + 1) + '')}</small></button>`).join('');
      const io = new IntersectionObserver((E) => E.forEach(async (en) => {
        if (!en.isIntersecting) return; io.unobserve(en.target);
        const x = items[+en.target.dataset.gvi], cv = en.target.querySelector('canvas'); if (!cv) return;
        try { const lib = await pdfjs(), d = await fetch(x.url, { credentials: 'same-origin' }).then((r) => r.arrayBuffer()), pg = await (await lib.getDocument({ isEvalSupported: false, data: d }).promise).getPage(1);
          const v0 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: 240 / v0.width }); cv.width = v.width; cv.height = v.height; await pg.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise; } catch { /* ohne Bildchen */ }
      }), { root: TH });
      TH.querySelectorAll('[data-gvi]').forEach((b) => io.observe(b));
    }
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
  /* Externe ohne Anmeldung (Seite /gast/<Link>): nur dieser eine Plan, Zeichnen gleich an */
  H.gastStart = (g) => {
    H.GAST = g; H.me = { id: null, name: g.name };
    H.ansehen([{ url: `api/bp/gast/${encodeURIComponent(g.token)}/datei`, typ: 'pdf', name: 'Plan', skizze: 'gast' }]);
  };
  H.skizzeOeffnen = (id, name) => H.ansehen([{ url: `api/bp/skizze/${id}/datei`, typ: 'pdf', name: name || 'Gemeinsame Skizze', skizze: id }]);
  function skWache() {
    const m = /#skizze=([\w-]+)/.exec(location.hash);
    if (m) { history.replaceState(null, '', location.pathname + location.search); setTimeout(() => H.skizzeOeffnen(m[1]), 300); }
    const pr = () => { if (document.visibilityState !== 'visible' || gv) return; KX('api/bp/skizze-einladungen').then((l) => { if (l && l[0]) skHinweis(l[0]); }).catch(() => {}); };
    setTimeout(pr, 2500); setInterval(pr, 15000);
  }
  /* ---------- Zolli: lästiger kleiner Zollstock (nur am PC), der auf Ablagefelder und Tricks hinweist ----------
     Ziele: bekannte Ablagefelder der Apps und jedes Element mit data-bp-tipp="Text" (optional data-bp-tipp-key). */
  const ZK = 'bph.zolli', ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } return null; };
  const zWeg = () => { try { return new Set(JSON.parse(ls(ZK + '.weg') || '[]')); } catch { return new Set(); } };
  H.zolliAn = () => ls(ZK) !== 'aus';
  document.addEventListener('change', (e) => { if (e.target.matches && e.target.matches('[data-kzolli]')) { ls(ZK, e.target.checked ? 'an' : 'aus'); if (!e.target.checked) zZu(); } });
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-kzollineu]')) { ls(ZK + '.weg', '[]'); ls(ZK, 'an'); try { sessionStorage.removeItem(ZK + '.spaeter'); sessionStorage.removeItem(ZK + '.zuletzt'); } catch { /* egal */ } if (window.toast) window.toast('Zolli zeigt alle Hinweise wieder.'); } });
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
    if (!window.matchMedia || !matchMedia('(pointer: fine) and (min-width: 1000px)').matches) return;   // nur am PC
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', zolliStart); else zolliStart();

  /* ---------- Rechte Maustaste: einheitliches Kontextmenü in allen Apps (nur am PC; Umschalt + Rechtsklick = Menü des Browsers) ----------
     Inhalt: 1. was die App anbietet (Ereignis 'bph:kontext', detail.punkte.push({text, fn, icon?, gefahr?})),
     2. die Knöpfe der angeklickten Zeile/Karte (Bearbeiten, Löschen …), 3. Standards: Link, Text, Eingabefeld, Seite. */
  let kmEl = null;
  const kmZu = () => { if (kmEl) { kmEl.remove(); kmEl = null; } };
  const kmText = (b) => (b.getAttribute('aria-label') || b.title || b.textContent || '').replace(/\s+/g, ' ').replace(/\s*[(–].*$/, '').replace(/(\p{L})\d+$/u, '$1').trim().slice(0, 44);
  const kmSicht = (b) => b.offsetParent !== null && !b.disabled && !b.closest('[hidden],.bph-km');
  const KMB = 'button,[role=button],[data-a],a.btn';
  function kmZeile(t) {   // nächster umgebender Block (Zeile, Karte, Abschnitt), der eigene Knöpfe hat – in jeder App, ohne Anpassung
    for (let z = t; z && z !== document.body; z = z.parentElement) {
      if (z.matches('.bph,.bph-km,.bph-dlg-bg')) return null;
      if (z.getBoundingClientRect().height > innerHeight * 0.75) return null;   // ganze Seiten/Spalten nicht
      if (z === t && z.matches(KMB)) continue;
      if ([...z.querySelectorAll(KMB)].some((b) => kmSicht(b) && kmText(b))) return z;
    }
    return null;
  }
  async function kmEinfuegen(el) {
    try { const t = await navigator.clipboard.readText(); el.focus(); if (!document.execCommand('insertText', false, t)) { const a = el.selectionStart ?? el.value.length; el.setRangeText(t, a, el.selectionEnd ?? a, 'end'); el.dispatchEvent(new Event('input', { bubbles: true })); } }
    catch { if (window.toast) window.toast('Einfügen bitte mit Strg+V – der Browser erlaubt das hier nicht.'); }
  }
  const kmKopie = (t) => navigator.clipboard.writeText(t).then(() => window.toast && window.toast('Kopiert.')).catch(() => window.toast && window.toast('Kopieren bitte mit Strg+C.'));
  document.addEventListener('contextmenu', (e) => {
    kmZu();
    if (e.defaultPrevented || e.shiftKey || matchMedia('(pointer: coarse)').matches) return;   // App hat eigenes Menü / Browser-Menü gewünscht / Touch
    const t = e.target.closest ? e.target : e.target.parentElement; if (!t || t.closest('.bph-km,canvas,iframe,embed,object,video')) return;
    const G = [];   // Gruppen von Punkten
    const app = []; t.dispatchEvent(new CustomEvent('bph:kontext', { bubbles: true, detail: { punkte: app, ziel: t, x: e.clientX, y: e.clientY } }));
    if (app.length) G.push(app);
    const ed = t.closest('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]):not([type=range]),textarea,[contenteditable=""],[contenteditable=true]');
    const sel = String(getSelection() || '');
    if (ed) {   // Eingabefeld: Rechtschreibvorschläge gibt es weiter mit Umschalt + Rechtsklick
      const ro = ed.readOnly || ed.disabled, markiert = ed.isContentEditable ? !!sel : (ed.selectionEnd || 0) > (ed.selectionStart || 0);
      G.push([
        { text: 'Rückgängig', k: 'Strg+Z', fn: () => { ed.focus(); document.execCommand('undo'); }, aus: ro },
        { text: 'Ausschneiden', k: 'Strg+X', fn: () => { ed.focus(); document.execCommand('cut') || kmKopie(sel); }, aus: ro || !markiert },
        { text: 'Kopieren', k: 'Strg+C', fn: () => { ed.focus(); document.execCommand('copy') || kmKopie(sel); }, aus: !markiert },
        { text: 'Einfügen', k: 'Strg+V', fn: () => kmEinfuegen(ed), aus: ro },
        { text: 'Alles markieren', k: 'Strg+A', fn: () => { ed.focus(); if (ed.select) ed.select(); else document.execCommand('selectAll'); } },
      ]);
    } else {
      const lk = t.closest('a[href]'), img = t.closest('img');
      const x = [];
      if (sel.trim()) x.push({ text: 'Kopieren', k: 'Strg+C', fn: () => kmKopie(sel) });
      if (lk && !/^javascript:/i.test(lk.getAttribute('href'))) {
        x.push({ text: 'Link öffnen', fn: () => { location.href = lk.href; } });
        x.push({ text: 'Link kopieren', fn: () => kmKopie(lk.href) });
      }
      if (img && img.src && !/^data:/.test(img.src)) x.push({ text: 'Bild ansehen', fn: () => H.ansehen ? H.ansehen([{ url: img.currentSrc || img.src, typ: 'bild', name: img.alt || 'Bild' }]) : (location.href = img.src) });
      const z = kmZeile(t);
      if (!sel.trim() && z) {   // Text der Zeile kopieren (z. B. Adresse, Position)
        const zt = (z.innerText || '').replace(/\n{2,}/g, '\n').trim();
        if (zt && zt.length < 2000) x.push({ text: 'Text kopieren', fn: () => kmKopie(zt.replace(/\t/g, ' ')) });
      }
      if (x.length) G.push(x);
    }
    {
      const z = kmZeile(t);
      if (z) {   // Knöpfe der Zeile/Karte – dasselbe wie ein Klick darauf
        const gesehen = new Set(), k = [];
        for (const b of z.querySelectorAll(KMB)) {
          if (!kmSicht(b) || b.matches('input,select,textarea')) continue;
          const tx = kmText(b); if (!tx || gesehen.has(tx) || /^[▸▾▴▹◂›‹»«]+$/.test(tx)) continue;
          gesehen.add(tx);
          k.push({ text: tx, fn: () => b.click(), gefahr: /lösch|entfern|🗑|✕|weg/i.test(tx + ' ' + (b.title || '')) });
          if (k.length >= 12) break;
        }
        if (k.length) G.push(k);
      }
    }
    G.push([
      { text: 'Zurück', k: 'Alt+←', fn: () => history.back(), aus: history.length < 2 },
      { text: 'Neu laden', k: 'F5', fn: () => location.reload() },
      { text: 'Drucken …', k: 'Strg+P', fn: () => print() },
    ]);
    e.preventDefault();
    kmEl = document.createElement('div'); kmEl.className = 'bph-km'; kmEl.setAttribute('role', 'menu');
    const alle = [];
    kmEl.innerHTML = G.map((g) => g.map((p) => { alle.push(p); return `<button type="button" role="menuitem" data-km="${alle.length - 1}"${p.aus ? ' disabled' : ''}${p.gefahr ? ' class="gef"' : ''}><span>${esc(p.text)}</span>${p.k ? `<small>${p.k}</small>` : ''}</button>`; }).join('')).join('<hr>')
      + '<div class="bph-km-h">Umschalt + Rechtsklick: Menü des Browsers</div>';
    document.body.appendChild(kmEl);
    const w = kmEl.offsetWidth, h = kmEl.offsetHeight;
    kmEl.style.left = Math.max(4, Math.min(e.clientX, innerWidth - w - 4)) + 'px';
    kmEl.style.top = Math.max(4, e.clientY + h > innerHeight - 4 ? e.clientY - h : e.clientY) + 'px';
    kmEl.addEventListener('click', (ev) => { const b = ev.target.closest('[data-km]'); if (!b || b.disabled) return; const p = alle[+b.dataset.km]; kmZu(); try { p.fn(); } catch (er) { if (window.toast) window.toast(er.message, true); } });
    const erste = kmEl.querySelector('button:not([disabled])'); if (erste) erste.focus({ preventScroll: true });
  });
  document.addEventListener('mousedown', (e) => { if (kmEl && !e.target.closest('.bph-km')) kmZu(); }, true);
  document.addEventListener('keydown', (e) => {
    if (!kmEl) return;
    if (e.key === 'Escape') { e.preventDefault(); kmZu(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); const bs = [...kmEl.querySelectorAll('button:not([disabled])')], i = bs.indexOf(document.activeElement);
      bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus();
    }
  }, true);
  addEventListener('blur', kmZu); addEventListener('resize', kmZu); addEventListener('scroll', kmZu, { passive: true, capture: true });
  H.setProject = function (p) {
    if (!band) return;
    const box = band.querySelector('.bph-proj');
    box.querySelector('small').textContent = (p && p.sub) || '';
    box.querySelector('span').textContent = (p && p.title) || '';
    box.title = (p ? [p.sub, p.title].filter(Boolean).join(' – ') + ' · ' : '') + 'Klick: Projekt wählen';
  };
  H.onKi = function (fn) { listeners.push(fn); };
  H.provider = () => prov(H.ki); H.appUrl = appUrl; H.apps = sortApps;
})();
