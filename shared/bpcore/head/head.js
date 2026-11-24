'use strict';
/* =====================================================================
   Bauplattform – gemeinsame Kopfleiste aller Apps
   Bauportal / <App>  ·  aktuelles Projekt  ·  Benutzer (Apps, Darstellung, Abmelden) – die KI wählt man nur in den Einstellungen

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
    /* sofort nachgeladen, weil sie jeden Klick auf ein Auswahl-/Datumsfeld übernehmen: eigene Auswahllisten (wahl), Datumsauswahl (datum),
       „＋ Neu“-Leiste. Alles Übrige erst beim ersten Gebrauch (BPHead.baustein, Platzhalter unten – 23.11.2026). */
    ['wahl', 'datum', 'neuleiste'].forEach((n) => { const x = document.createElement('script'); x.src = basis + n + '.js' + vq; document.head.appendChild(x); });
    if (window.top === window && !document.querySelector('link[rel="manifest"]')) {   // App-Beschreibung: das Bauportal lässt sich in Edge/Chrome als App installieren (eigenes Fenster ohne Adressleiste)
      const m = document.createElement('link'); m.rel = 'manifest'; m.href = basis + 'manifest.webmanifest'; document.head.appendChild(m); } }
  const H = window.BPHead = { me: null, conf: null, ki: 'intern', providers: [], app: '', ready: null };
  /* Teile der Kopfleiste, die erst bei Bedarf geladen werden (23.11.2026 – head.js lud 357 KB auf jeder Seite): BPHead.baustein(name) lädt bp/<name>.js
     einmal; bis dahin stehen dort kleine Platzhalter, die den Teil laden und dann den echten Aufruf machen (die Teile ersetzen sie beim Laden).
     ansehen.js – Ansehen-Fenster, PDF im Bereich · masken.js – Verlauf, Datenmaske, Projektdaten, Postfächer · hilfe.js – 🐞 und Hilfe · zolli.js – Hinweise am PC */
  const BST = {};
  H.baustein = (n) => BST[n] || (BST[n] = new Promise((ok, bad) => { const [b, v] = window.BP_HEAD_BASIS, sc = document.createElement('script'); sc.src = b + n + '.js' + v;
    sc.onload = () => ok(); sc.onerror = () => { delete BST[n]; bad(new Error(`„${n}“ ließ sich nicht laden – bitte die Seite neu laden.`)); }; document.head.appendChild(sc); }));
  const spaeter = (n, namen) => namen.forEach((k) => { const st = H[k] = (...a) => H.baustein(n).then(() => { if (H[k] === st) throw new Error(`${k} fehlt in ${n}.js`); return H[k](...a); }); });
  spaeter('ansehen', ['ansehen', 'pdfLib', 'pdfIn', 'pdfDrucken', 'pdfZiel']);
  spaeter('masken', ['verlauf', 'kennwort', 'datenMaske', 'projektLoeschen', 'projektDaten', 'vorort', 'postfaecher', 'verlaufAlle']);
  spaeter('hilfe', ['bugMelden', 'hilfe', 'hilfeLive']);
  spaeter('versand', ['versand', 'unterlagenSenden']);   // versand.js – gemeinsamer Versanddialog
  spaeter('freigeben', ['bauherrFreigeben', 'bauherrPdf', 'bauherrProjekt']);   // freigeben.js – ans Bauherrenportal
  spaeter('projektordner', ['projektOrdner']);   // projektordner.js – Projektordner nach der Vorlage anlegen (nach „Anlegen“ eines Projekts)
  spaeter('live', ['liveNotiz']);
  H._liveQ = []; H.live = (...a) => { H._liveQ.push(a); H.baustein('live'); };   // live.js lädt mit der ersten Anmeldung und übernimmt die gemerkten
  H.ablage = { ablegen: (...a) => H.baustein('ablegen').then(() => H.ablage.ablegen(...a)) };   // ablegen.js ersetzt ablegen; Seiten setzen hier hier/nachher/aus
  H.bauherrAn = () => !!(H.conf && H.conf.bauherren);   // Knopf „Freigeben“ nur, wenn das Bauherrenportal eingerichtet ist
  /* Angaben für unterlagenSenden aus { name, datei, pdf, art, pid, projekt, an, betreff, text, link, danach, einzeln } – hier, weil Apps es
     gleich beim Aufruf von unterlagenSenden(…) brauchen, bevor versand.js geladen ist */
  H.mailVorgabe = (m) => { const nm = String(m.name || 'Unterlage').replace(/\.pdf$/i, '');
    return { titel: `„${nm}“ per Mail senden`, art: m.art || 'unterlagen', pid: m.pid || null, projekt: m.projekt || '', link: m.link || '', an: m.an || [],
      was: [{ icon: '📄', name: nm, datei: m.datei || nm.replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 100) + '.pdf', pdf: m.pdf, ohneUnterschrift: true }],
      betreff: m.betreff || nm + (m.projekt ? ' – ' + m.projekt : ''), text: m.text || `Guten Tag,\n\nanbei erhalten Sie ${nm}${m.projekt ? ' zum Bauvorhaben ' + m.projekt : ''}.\n\nMit freundlichen Grüßen`, danach: m.danach, einzeln: m.einzeln }; };
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
      ${art === 'eingabe' ? `<input class="bph-frage-in"${opt.typ ? ` type="${esc2(opt.typ)}"` : ''} value="${esc2(vorgabe ?? '')}" style="width:100%;box-sizing:border-box;margin-bottom:.8rem">` : ''}
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
  const esc = window.bpEsc || (window.bpEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));   // dieselbe Fassung wie in bp.js – nur für Seiten, auf denen head.js vor dem Bündel oder ohne es läuft
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
    gebaeudemodell: SV('<path d="M12 2.8l8.2 4.6v9.2L12 21.2l-8.2-4.6V7.4z"/><path d="M3.8 7.4L12 12l8.2-4.6M12 12v9.2"/>'),   // Gebäudemodell: Quader des Modells, Mitte der Apps
    personal: SV('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.5a3 3 0 0 1 0 5.6M17.5 14.4c1.7.6 2.8 2.2 3 4.6"/>'),
    akquise: SV('<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 11l4-3.2 4 3.2"/><path d="M9 10.3V14h6v-3.7"/>'),   // Sprechblase mit Haus: Anfrage zu einem Bauvorhaben
    honorar: SV('<path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2"/><path d="M15.5 11.5a3 3 0 1 0 0 5"/><path d="M11 13h4M11 15h4"/>'),
    baudaten: SV('<path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
    ava: SV('<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M8 10h8M8 13h8M8 16h5"/><path d="M14.5 17.5l1.5 1.5 3-3"/>'),
    aufgaben: SV('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    baukosten: SV('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h6"/>'),
    admin: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>'),
    papierkorb: SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>'),
    nachverfolgen: SV('<path d="M5 3h8l4 4v5"/><path d="M5 3v18h7"/><path d="M8 9h5M8 12h3"/><path d="M12 17l9-4-3 9-2-3.5z"/>'),   // LV-Nachverfolgung: LV mit Papierflieger (Ausschreibung → Nachverfolgen)
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
  const appUrl = (a) => window.bpAppUrl(a);   // Adresse einer App: ein Baustein in bp.js (Proxy oder Port) – der Baukasten ist auf jeder Seite da
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

  async function setKi(k) {
    const p = prov(k);
    if (!p.ok) { tip(`${p.label}: ${p.hint || 'nicht eingerichtet'}`); return; }
    if (k === H.ki) return;
    const old = H.ki; H.ki = k;
    try {
      const r = await fetch('api/bp/ki', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ki: k }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || r.statusText);
      H.providers = d.providers || H.providers;
    } catch (e) { H.ki = old; tip('KI-Auswahl nicht gespeichert: ' + e.message); return; }
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
  H.kiSchieber = (el, stelle, o) => bpKiSchieber(el, stelle, o);   // KI-Schieber an einer Stelle (bp.js)

  /* Bilder (Pläne, Scans) lassen sich nicht anonymisieren (Datenschutz, 14.11.2026): vor dem Senden an externe KI nachfragen */
  H.kiFragen = async function (opt = {}) {
    const k = await kiWaehlen(opt);
    if (k && (opt.bild || opt.bilder) && ['claude', 'gemini', 'chatgpt'].includes(k) && window.bpFrage
      && !(await bpFrage(`Das Bild (Plan, Scan, Foto) kann Namen, Adressen oder Unterschriften enthalten. Texte anonymisiert die Plattform – Bilder lassen sich nicht austauschen.\n\nTrotzdem an ${prov(k).label} senden?`, { ok: 'Trotzdem senden', abbrechen: 'Nicht senden' }))) return null;
    return k;
  };
  /* Welche KI arbeitet, steht nur in den Einstellungen (⚙ → Persönlich → KI; erlaubt ist, was die Verwaltung freigibt) – 18.11.2026:
     keine Auswahl mehr an der Stelle, an der eine KI gebraucht wird. Hier nur noch: passt die eingestellte KI (bei Bildern: liest sie Bilder?),
     sonst die KI im Büro; dann die Frage „Mit KI lesen?“ – außer jemand hat „nicht mehr fragen“ gewählt. Liefert den Schlüssel oder null. */
  const kiWaehlen = function (opt = {}) {
    const P = (H.providers || []).filter((p) => p.ok && p.key !== 'intern' && (!opt.bild || p.bild));
    const einst = () => H.einstellungen && H.einstellungen({ ziel: 'ich:ki' });
    if (!P.length) {
      tip(opt.bild ? 'Keine KI eingestellt, die Bilder liest – ⚙ → Persönlich → KI (erlaubt sind die KI aus der Verwaltung).' : 'Keine KI eingestellt – ⚙ → Persönlich → KI.');
      return Promise.resolve(null);
    }
    const k = (P.find((p) => p.key === H.ki) || P.find((p) => p.key === 'ollama') || P[0]).key;
    if (H.kiImmer) return Promise.resolve(k);
    return new Promise((fertig) => {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Mit KI lesen" style="width:min(520px,96vw)"><div class="bph-dh"><b>${esc(opt.titel || 'Mit KI lesen?')}</b><button type="button" class="bph-x" data-kx aria-label="Schließen">✕</button></div><div class="bph-db">
        ${opt.text ? `<p style="margin:.2rem 0 .5rem">${opt.text}</p>` : ''}<p class="bph-mu" style="margin:0 0 .6rem">${opt.hinweis || 'Der Text des Dokuments geht an die KI. Das Ergebnis kommt als Vorschlag – übernommen wird erst nach deiner Bestätigung.'}</p>
        <p style="margin:0">KI: <b>${esc(prov(k).label)}</b> <button type="button" class="bph-link" data-keinst>in den Einstellungen ändern</button> <span data-kks></span></p>
        <label class="bph-ck" style="margin-top:.7rem"><input type="checkbox" data-kimmer> Nicht mehr fragen</label>
        <div class="bph-row" style="justify-content:flex-end;margin-top:.8rem"><button type="button" class="bph-btn" data-kx>Nein, danke</button><button type="button" class="bph-btn pri" data-kok>${esc(opt.knopf || 'Mit KI lesen')}</button></div></div></div>`;
      document.body.appendChild(bg);
      let KS = null;   // KI-Schieber (KS, 18.11.2026): ohne KI · KI im Büro · externe KI an der Stelle – welche KI genau, bleibt in ⚙
      H.kiSchieber(bg.querySelector('[data-kks]'), opt.stelle || 'lesen', { kompakt: true, vorgabe: H.kiVorgabe }).then((x) => { KS = x; }).catch(() => {});
      const nimm = (st) => (st === 'aus' ? null : st === 'buero' ? ((P.find((p) => p.key === 'ollama') || {}).key || k) : ((P.find((p) => p.key === H.ki && p.key !== 'ollama') || P.find((p) => p.key !== 'ollama') || {}).key || k));
      const zu = (x) => { bg.remove(); fertig(x && KS ? nimm(KS.wert()) : x); };
      bg.addEventListener('click', async (e) => {
        if (e.target.closest('[data-kx]')) return zu(null);   // daneben klicken schließt nicht
        if (e.target.closest('[data-keinst]')) { zu(null); einst(); return; }
        if (!e.target.closest('[data-kok]')) return;
        if (bg.querySelector('[data-kimmer]').checked) await H.kiImmerSetzen(true);
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
    if (document.body) setTimeout(los, 0); else document.addEventListener('DOMContentLoaded', los);   // H.einstSeite steht erst weiter unten
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
      H.ki = d.choice || 'intern'; H.providers = d.providers || [];
      if (alt !== H.ki) listeners.forEach((f) => { try { f(H.ki, prov(H.ki)); } catch { /* egal */ } });
    } catch { /* egal */ }
    try { if (window.parent !== window && window.parent.BPHead && window.parent.BPHead.kiLaden) window.parent.BPHead.kiLaden(); } catch { /* andere Herkunft */ }
  };
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
      + `<button type="button" role="menuitem" data-meinordner><span class="bph-mi">📁</span>Mein Ordner <small class="bph-ms"></small></button>`   // Baustein meinordner.js (C1: ohne Eintrag grau)
      + `<div class="bph-mode bph-mode-m" role="group" aria-label="Ansicht"><button type="button" data-modus="einfach">Basic</button><button type="button" data-modus="profi">Profi</button></div>`
      + (window.bpWinApp ? bpWinApp.menue() : window.bpDesktop || /Windows/i.test(navigator.userAgent) ? `<button type="button" role="menuitem" data-winapp><span class="bph-mi">🪟</span>Windows-App</button>` : '')   // Baustein winapp.js
      + '<div class="bph-sep"></div>'
      + `<button type="button" role="menuitem" data-out>${IC.out}Abmelden</button>`;
    void apps; void portal;
    band.appendChild(m); H.meinordner().then(() => bpMeinOrdner.menue(m));
  }
  /* ▦ Apps: alle Apps als Kacheln – in jeder App gleich; die Verwaltung gibt es nur hier */
  function sortApps() {
    const apps = ((H.conf || {}).apps || []).filter((a) => a.allowed && !a.teil && a.kachel !== false);   // teil: Seite einer anderen App (Kommunikation → Aufgaben & Post); kachel: false = nur die Kachel weg (Verwaltung – ⚙ führt hin)
    const rank = (a) => (a.key === 'portal' ? -1 : a.key === 'admin' ? 99 : 0);
    return apps.slice().sort((a, b) => rank(a) - rank(b));
  }
  function appsMenu() {
    closeMenus();
    const m = document.createElement('div'); m.className = 'bph-menu bph-apps'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', 'Apps');
    const apps = sortApps();
    m.innerHTML = '<div class="bph-info">Apps' + (H.projekt && H.projekt.id ? ` <small>· Projekt <b>${esc(H.projekt.name)}</b> bleibt gewählt</small>` : '') + '</div><div class="bph-tiles">'
      + (apps.length ? apps.map((a) => `<a role="menuitem" data-af="${esc(a.key)}" href="${esc(appUrl(a))}/"${a.key === H.app || a.key === ((H.conf.apps.find((x) => x.key === H.app) || {}).teil) ? ' class="cur" aria-current="page"' : ''}>${IC[a.key === 'portal' ? 'home' : a.key] || IC.home}<span>${esc(a.key === 'portal' ? 'Startseite' : a.name)}</span><i class="bph-neutab" title="In neuem Tab öffnen" aria-label="In neuem Tab öffnen"></i></a>`).join('')
          + (() => { const av = (H.conf.apps || []).find((a) => a.key === 'ava' && (a.allowed || (a.seiten || {}).nachverfolgen)); return av ? `<a role="menuitem" data-af="nachverfolgen" href="${esc(appUrl(av))}/#nachverfolgen">${IC.nachverfolgen}<span>LV-Nachverfolgung</span><i class="bph-neutab" title="In neuem Tab öffnen" aria-label="In neuem Tab öffnen"></i></a>` : ''; })()
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
    ['klapp', 'Ausklappen', [['', '▸ Dreieck'], ['pfeil', '› Pfeil'], ['plus', '+ / −'], ['grau', '▸ grau']]],
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
  /* Je App wählbar (Schalter oben stellt die gerade offene App um); ohne eigene Wahl gilt die Vorgabe der Person, dann der Rolle, dann des Büros. */
  const modusVon = (app) => { try { const a = app && localStorage.getItem('bpModus.' + app); return (a || localStorage.getItem('bpModus')) === 'einfach' ? 'einfach' : 'profi'; } catch { return 'profi'; } };
  H.modus = modusVon('');
  document.documentElement.dataset.modus = H.modus;
  H.einfach = () => H.modus === 'einfach';
  H.modusSetzen = async function (m, neuLaden = true) {
    m = m === 'einfach' ? 'einfach' : 'profi';
    try { localStorage.setItem(H.app ? 'bpModus.' + H.app : 'bpModus', m); } catch { /* egal */ }
    try { await fetch('api/bp/darstellung', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modus: m, app: H.app || '' }) }); } catch { /* egal */ }
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
      ${handyHtml()}
      <div class="bph-info" style="padding:.7rem 0 .1rem"><b>Stil</b> <small>– Aussehen von Flächen, Rahmen und Bedienelementen</small></div>
      <div class="bph-lk">${STIL_PAKETE.map(([n, P], i) => { const v = (me.stil || {}), gleich = STIL.every(([k]) => (v[k] || '') === (P[k] || '')); return `<button type="button" class="bph-th${gleich ? ' on' : ''}" data-stilp="${i}">${esc(n)}</button>`; }).join('')}</div>
      ${STIL.map(([k, n, L]) => { const v = ((me.stil || {})[k]) || ''; return `<div class="bph-info" style="padding:.35rem 0 .2rem">${esc(n)}</div><div class="bph-lk">${L.map(([w, t]) => `<button type="button" class="bph-th${w === v ? ' on' : ''}" data-stil="${k}" data-w="${w}">${esc(t)}</button>`).join('')}</div>`; }).join('')}`;
  };
  /* Untere Leiste am Handy (HG-4): fünf Plätze; Klick auf einen Platz wählt ihn, darunter steht zur Wahl, was es gibt */
  let hPlatz = 0;
  const HANDY_V = ['portal', 'bautagebuch', 'aufgaben', 'adressen', 'suche'];
  const handyName = (k) => (k === 'suche' ? 'Suche' : k === 'portal' ? 'Start' : String((((H.conf || {}).apps || []).find((a) => a.key === k) || {}).name || k).replace(/ &.*$/, ''));
  function handyHtml() {
    const L = Array.isArray((H.me || {}).handy) && H.me.handy.length ? H.me.handy : HANDY_V;
    const alle = ['portal', 'suche', ...((H.conf || {}).apps || []).filter((a) => a.allowed !== false && !a.teil && !['portal', 'admin', 'papierkorb'].includes(a.key)).map((a) => a.key)];
    return `<div class="bph-info" style="padding:.5rem 0 .3rem">Untere Leiste am Handy <small>– Platz antippen, dann wählen</small></div>
      <div class="bph-lk">${L.map((k, i) => `<button type="button" class="bph-th${i === hPlatz ? ' on' : ''}" data-hplatz="${i}">${i + 1}. ${esc(handyName(k))}</button>`).join('')}<button type="button" class="bph-th" data-hwahl="" title="Vorgabe: Start · Bautagebuch · Aufgaben · Adressen · Suche">↺</button></div>
      <div class="bph-lk">${alle.filter((k) => !L.includes(k)).map((k) => `<button type="button" class="bph-th" data-hwahl="${esc(k)}">${esc(handyName(k))}</button>`).join('')}</div>`;
  }
  const SCHRIFT_N = [['ubuntu', 'Ubuntu'], ['system', 'Systemschrift'], ['arial', 'Arial'], ['verdana', 'Verdana'], ['calibri', 'Calibri'], ['georgia', 'Georgia']];
  const sAkt = () => (H.me && H.me.schrift) || (H.conf && H.conf.schrift) || 'ubuntu', gAkt = () => (H.me && H.me.schrift_g) || (H.conf && H.conf.schrift_groesse) || 'normal';
  function lookWire(m, redraw) {
    m.addEventListener('click', (e) => {
      const th = e.target.closest('[data-th]'), ac = e.target.closest('[data-acc]');
      const fs = e.target.closest('[data-fs]'), sf = e.target.closest('[data-sf]'), sg = e.target.closest('[data-sg]'), sl = e.target.closest('[data-stil]');
      if (th || ac || fs || sf || sg || sl) e.stopPropagation();
      const hp = e.target.closest('[data-hplatz]'); if (hp) { e.stopPropagation(); hPlatz = +hp.dataset.hplatz; (redraw || lookMenu)(); return; }
      const hw = e.target.closest('[data-hwahl]'); if (hw) { e.stopPropagation(); const L = (Array.isArray((H.me || {}).handy) && H.me.handy.length ? H.me.handy : HANDY_V).slice();
        if (hw.dataset.hwahl) L[hPlatz] = hw.dataset.hwahl; saveLook({ handy: hw.dataset.hwahl ? L : [] }, redraw); return; }
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
      H.me = Object.assign(H.me || {}, { handy: r.handy || [], theme: r.theme, accent: r.accent, farbschema: r.farbschema || '', schrift: r.schrift || '', schrift_g: r.schrift_g || '', stil: r.stil || {} });
      stilAnwenden(H.me.stil); if (window.bpHandy) bpHandy.neu();
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
  H.adresseUrl = function (text) {   // dasselbe für eine Anschrift (Adressen: „Karte“ rechts, 🧭 am Handy) – öffnet am Handy die Karten-App mit Route
    const q = encodeURIComponent(String(text || '')), k = (H.conf && H.conf.karte) || 'google';
    if (k === 'osm') return `https://www.openstreetmap.org/search?query=${q}`;
    if (k === 'apple') return `https://maps.apple.com/?q=${q}`;
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
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
    if (H.app) { H.modus = modusVon(H.app); document.documentElement.dataset.modus = H.modus; }   // Basic/Profi dieser App
    if (H.app && !document.documentElement.dataset.af) document.documentElement.dataset.af = H.app;   // App-Farbe (--af) für Verläufe und Akzentstrich
    if (H.app && !['admin', 'portal'].includes(H.app)) { try { localStorage.setItem('bp.letzteApp', H.app); } catch { /* egal */ } }   // „Öffnen“ in der Verwaltung führt hierhin zurück
    band = document.createElement('header');
    band.className = 'bph' + (opt.sticky ? ' bph-sticky' : '');
    band.innerHTML = `<a class="bph-logo" href="/" title="Zur Startseite" hidden><img alt="Büro-Logo"></a><a class="bph-brand" href="/" title="Zur Startseite">${IC.home}<span class="bph-plat">Bauportal</span><span class="bph-sl">/</span>${IC[opt.app] && opt.app !== 'portal' ? `<i class="bph-aic" data-af="${esc(opt.app)}">${IC[opt.app]}</i>` : ''}<span class="bph-app">${esc(opt.name || '')}</span></a>
      <div class="bph-proj" role="button" tabindex="0" title="Projekt wählen"><small></small><span></span></div>
      <span class="bph-fill"></span><button type="button" class="bph-such" aria-label="Suchen (Strg+K)" title="Suchen – Inhalte, Funktionen, Einstellungen (Strg+K)"><span aria-hidden="true">🔍</span><span class="bph-such-t">Suchen …</span><kbd>Strg K</kbd></button>
      <div class="bph-mode" role="group" aria-label="Ansicht"><button type="button" data-modus="einfach" title="Basic: große Karten, eine Hauptaufgabe je Seite">Basic</button><button type="button" data-modus="profi" title="Alle Funktionen">Profi</button></div>
      <button type="button" class="bph-ic bph-hlp" aria-haspopup="menu" aria-label="Hilfe" title="Hilfe, Neuigkeiten, Frage stellen, Fehler melden">?<span class="bph-hn" hidden></span></button>
      <button type="button" class="bph-ic bph-appsb" aria-haspopup="menu" aria-label="Apps" title="Apps">${IC.grid}</button>
      <button type="button" class="bph-ic bph-gear" aria-haspopup="dialog" aria-label="Einstellungen" title="Einstellungen">${IC.gear}</button>
      <button type="button" class="bph-who" aria-haspopup="menu" aria-label="Mein Konto"><span class="bph-av">?</span><span class="bph-nm"></span></button>`;
    const parent = opt.parent || document.body;
    parent.insertBefore(band, opt.before || parent.firstChild);
    band.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.bph-proj')) { e.preventDefault(); if (typeof opt.projektwahl === 'function') opt.projektwahl(); else H.projektWahl(); } });
    band.addEventListener('click', (e) => {
      if (e.target.closest('.bph-such')) { closeMenus(); H.suche(); return; }
      if (e.target.closest('.bph-proj')) { closeMenus(); if (typeof opt.projektwahl === 'function') opt.projektwahl(); else H.projektWahl(); return; }
      const mo = e.target.closest('button[data-modus]'); if (mo) { e.preventDefault(); closeMenus(); if (mo.dataset.modus !== H.modus) H.modusSetzen(mo.dataset.modus); return; }
      if (e.target.closest('[data-out]')) { logout(); return; }
      if (e.target.closest('[data-look]')) { e.stopPropagation(); lookMenu(); return; }
      if (e.target.closest('[data-konto]')) { e.stopPropagation(); closeMenus(); H.einstellungen({ bereich: 'ich', teil: 'konto' }); return; }
      if (e.target.closest('[data-meinordner]')) { e.stopPropagation(); closeMenus(); H.meinordner().then(() => bpMeinOrdner.oeffnen()); return; }
      if (e.target.closest('[data-winapp]')) { e.stopPropagation(); closeMenus(); H.winapp().then(() => bpWinApp.oeffnen()); return; }
      const hm = e.target.closest('[data-hm]'); if (hm) { e.stopPropagation(); closeMenus(); if (hm.dataset.hm === 'frage') H.hilfe(); else if (hm.dataset.hm === 'wiki') H.wiki('festhalten'); else H.hilfeSeite(hm.dataset.hm === 'neu' ? { reiter: 'aenderungen' } : { reiter: 'hilfe' }); return; }
      if (e.target.closest('.bph-hlp')) { e.stopPropagation(); if (band.querySelector('.bph-menu')) closeMenus(); else hilfeMenu(); return; }
      if (e.target.closest('[data-bug]')) { e.stopPropagation(); closeMenus(); H.bugMelden(); return; }
      if (e.target.closest('.bph-appsb')) { e.stopPropagation(); if (band.querySelector('.bph-apps')) closeMenus(); else appsMenu(); return; }
      if (e.target.closest('.bph-gear')) { e.stopPropagation(); closeMenus(); H.einstellungen(); return; }
      if (e.target.closest('.bph-who')) { e.stopPropagation(); if (band.querySelector('.bph-menu')) closeMenus(); else userMenu(); }
    });
    document.addEventListener('click', (e) => { if (band && !band.contains(e.target)) closeMenus(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
    if (opt.project) H.setProject(opt.project);
    H.ready = (async () => {
      const mitConf = !(opt.conf && opt.conf.apps);   // EINE Abfrage für die Kopfleiste (bpcore/head.py, /api/bp/kopf): conf, ki, projekt, darstellung – /api/me bleibt je App
      const [K, me] = await Promise.all([getJ('api/bp/kopf' + (mitConf ? '' : '?conf=0')).catch(() => ({})), opt.me ? Promise.resolve(opt.me) : getJ('api/me').catch(() => null)]);
      const conf = mitConf ? K.conf || { apps: [] } : opt.conf, ki = K.ki, pj = K.projekt;
      H.conf = conf; H.me = me && me.ok !== false ? me : null;
      try { if (sessionStorage.getItem('bpZurueck') || sessionStorage.getItem('bpZurueckTun')) { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'zurueck.js' + v; document.head.appendChild(sc); } } catch { /* egal */ }   // Rücksprung aus „Zu tun“/Suche (zurueck.js)
      if (H.me && (window.bpDesktop || (H.app === 'portal' && /Windows/i.test(navigator.userAgent)))) H.winapp();   // Windows-App: in der App „genutzt“ melden, auf der Startseite einmal anbieten (winapp.js)
      if (conf.name) { band.querySelector('.bph-plat').textContent = conf.name; }   // Name der Plattform aus der Verwaltung
      { const ca = (conf.apps || []).find((x) => x.key === H.app) || {}, nl = ca.nur_lesen ? ['nur lesen', 'Deine Rolle erlaubt hier nur Ansehen – Ändern ist gesperrt'] : ca.seiten ? [`nur diese Seite${Object.values(ca.seiten).includes('an') ? '' : ' · nur lesen'}`, 'Deine Rolle schaltet nur einzelne Seiten dieser App frei'] : null;   // Apps je Rolle / Seiten als Rechte – der Server sperrt (bpcore/nurlesen.py), hier nur der Hinweis
        if (nl) { if (ca.nur_lesen) document.documentElement.classList.add('bp-nurlesen'); band.querySelector('.bph-brand').insertAdjacentHTML('afterend', `<span class="bph-nl" title="${nl[1]}">${nl[0]}</span>`); } }
      setTimeout(pulsStarten, 0);
      H.handyLaden();   // Handyansicht (handy.js): nur wenn schmal, sonst erst, wenn das Fenster schmal wird
      schriftAnwenden(conf.schrift || '', conf.schrift_groesse || '');
      testBanner(conf.version);
      if (H.me && K.darstellung) ((d) => { const dm = (d.modus_apps || {})[H.app] || d.modus; if (dm && dm !== H.modus) { try { localStorage.setItem('bpModus', d.modus); if (H.app) localStorage.setItem('bpModus.' + H.app, dm); } catch { /* egal */ } location.reload(); return; } H.me.farbschema = d.farbschema || ''; H.me.stil = d.stil || {}; H.me.handy = d.handy || []; if (window.bpHandy) bpHandy.neu(); stilAnwenden(H.me.stil); H.me.schrift = d.schrift || ''; H.me.schrift_g = d.schrift_g || ''; if (d.schrift || d.schrift_g) schriftAnwenden(sAkt(), gAkt()); H.kiImmer = !!d.ki_immer; H.kiVorgabe = d.ki_vorgabe || 'buero'; logoArt(d.logo); schemaAnwenden(H.me.farbschema); try { localStorage.setItem('bpSchema', H.me.farbschema); } catch { /* egal */ } })(K.darstellung);
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
      return H;
    })();
    H.ready.then(skWache).catch(() => {});
    H.ready.then(hilfeStart).catch(() => {});
    H.ready.then(() => {   // Urlaubsanträge (antrag.js) nur, wenn es etwas zu entscheiden oder zu sehen gibt; Neuigkeiten (neu.js) nur, wo sie von selbst kommen
      const c = H.conf || {}; if (!H.me) return;
      if (c.antraege || c.freigeben) H.baustein('antrag').catch(() => {});
      let tour = false; try { tour = !!localStorage.getItem('bp.neu.tour'); } catch { /* egal */ }
      if (window.top === window && !navigator.webdriver && (tour || /-test\b/.test(String(c.version || '')))) H.baustein('neu').then(() => bpNeu.start()).catch(() => {});
    }).catch(() => {});
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
          <div class="bph-row"><label style="flex:1">Funktion<input data-kf="funktion" data-vs="funktion" data-vs-kern autocomplete="off" value="${esc(K.funktion || '')}" placeholder="z. B. Bauleitung" maxlength="80"></label><label style="flex:1">Telefon (eigenes)<input data-kf="telefon" value="${esc(K.telefon || '')}" placeholder="sonst das des Büros" maxlength="60"></label></div>
          <div class="bph-sigt bph-sige" contenteditable="true" data-ksigt>${K.mailsignatur_html || esc(K.mailsignatur || K.sig_standard).replace(/\n/g, '<br>')}</div>
          <div class="bph-chips">${Object.entries(K.sig_platz || {}).map(([k, l]) => `<button type="button" data-kph="${k}" title="${esc(l)}">{${k}}</button>`).join('')}</div>
          <div class="bph-row"><button type="button" class="bph-btn pri" data-ksigsave>Signatur speichern</button><button type="button" class="bph-btn" data-ksigstd>Auf Standard zurücksetzen</button></div>
          <div class="bph-mu">So sieht sie in der Mail aus${K.mailsignatur_html ? ' (Mailprogramme ohne HTML zeigen sie als Text)' : ''}:</div><div class="bph-sigp bph-sigh">${K.sig_vorschau_html || esc(K.sig_vorschau || '').replace(/\n/g, '<br>')}</div>
          <h4>Bauanträge – Entwurfsverfasser/in</h4><p class="bph-mu">Für die Formulare in der App „Bauantrag“. Beim Ausfüllen wählst du, ob du persönlich oder das Büro eingetragen wird – vorgewählt ist „persönlich“, wenn du hier bauvorlageberechtigt mit Kammernummer bist.</p>
          <div class="bph-row"><label style="flex:1">Berufsbezeichnung<input data-kbv="beruf" data-vs="beruf" data-vs-kern autocomplete="off" value="${esc(K.beruf || '')}" placeholder="z. B. Architekt, Dipl.-Ing." maxlength="80"></label><label style="flex:1">Kammer<input data-kbv="kammer" data-vs="kammer" data-vs-kern autocomplete="off" value="${esc(K.kammer || '')}" placeholder="z. B. Architektenkammer NRW" maxlength="80"></label></div>
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
          <h4>Mein Ordner</h4><div data-kmo></div>
          <h4>Kennwort</h4><div class="bph-row"><button type="button" class="bph-btn" data-kpw>🔑 Kennwort ändern …</button></div>
          <p class="bph-mu">${K.email ? `Mails gehen an <b>${esc(K.email)}</b>.` : '<b>Für dein Konto ist keine E-Mail-Adresse hinterlegt</b> – bitte vom Administrator in der Verwaltung (▦ → Verwaltung → Benutzer) eintragen lassen.'}${K.mail ? '' : ' Der Mailserver ist noch nicht eingerichtet (Verwaltung → Einstellungen → Mailserver).'}</p>`;
      } else if (!V) { b = '<p class="bph-mu">Lade …</p>'; KX('api/bp/mailvorlagen').then((v) => { V = v; draw(); }).catch((e) => { msg = e.message; draw(); }); }
      else {
        b = `<p class="bph-mu">Texte der E-Mails, die die Plattform verschickt. Platzhalter in geschweiften Klammern werden beim Versand ersetzt. Leer lassen = Standardtext.</p>`
          + Object.entries(V.vorlagen).map(([k, t]) => `<div class="bph-tpl"><h4>${esc(t.name)}${t.standard ? ' <small class="bph-mu">Standard</small>' : ''}</h4>
            <label>Betreff<input data-tk="${k}" data-tf="betreff" value="${esc(t.betreff)}"${V.admin ? '' : ' disabled'}></label>
            <label>Text<textarea rows="6" data-tk="${k}" data-tf="text"${V.admin ? '' : ' disabled'}>${esc(t.text)}</textarea></label>
            <p class="bph-mu">${t.platzhalter.map((p) => `<code title="${esc(V.erkl[p] || '')}">{${p}}</code> ${esc(V.erkl[p] || '')}`).join(' · ')}</p></div>`).join('')
          + (V.admin ? `<div class="bph-row"><button type="button" class="bph-btn pri" data-ksave>Vorlagen speichern</button></div>` : '');
      }
      return (opt.into ? '' : `<div class="bph-dh"><b>Unterschrift, E-Mail & Kalender</b><button type="button" class="bph-x" data-kclose aria-label="Schließen">×</button></div>`)
        + tabs + `<div class="bph-db">${b}${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}</div>`;
    }
    function draw() { root.innerHTML = html(); const mo = root.querySelector('[data-kmo]'); if (mo) H.meinordner().then(() => bpMeinOrdner.konto(mo)); }
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

  /* ---------- Kontaktmaske – dieselbe wie in „Adressen“, aus jeder App (Baustein kontakt.js, erst bei Bedarf geladen):
     BPHead.kontaktMaske({ name, trade, … } | {id, …}, { basis, speichern, loeschen, info, grundstueck }) → Kontakt oder null ---------- */
  const kontaktJs = () => (window.bpKontakt ? Promise.resolve(true) : new Promise((ok) => {
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'kontakt.js' + v;
    sc.onload = () => ok(!!window.bpKontakt); sc.onerror = () => ok(false); document.head.appendChild(sc); }));
  H.kontaktMaske = async (vor = {}, opt = {}) => ((await kontaktJs()) ? bpKontakt(vor, opt) : null);
  /* Kontaktfeld: H.kontaktFeld(host, { wert, kid, rolle, basis, platz, vor, setzen(kontakt | null, text) }) – suchen, wählen oder neu anlegen */
  H.kontaktFeld = async (host, opt = {}) => { if (await kontaktJs()) bpKontaktFeld(host, opt); };
  /* Adresse wählen mit Filter oben: H.kontaktWahl({ titel, rolle, kids }) → { id, name, trade } oder null (kontakt.js) */
  H.kontaktWahl = async (o = {}) => ((await kontaktJs()) ? bpKontaktWahl(o) : null);
  /* Teilen ohne Anmeldung (Baustein teilen.js, erst bei Bedarf geladen): BPHead.teilen({ app, titel, sicht, url, liste, neu, aendern, loeschen, mail … }) */
  const teilenJs = () => (window.bpTeilen ? Promise.resolve(true) : new Promise((ok) => {
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'teilen.js' + v;
    sc.onload = () => ok(!!window.bpTeilen); sc.onerror = () => ok(false); document.head.appendChild(sc); }));
  H.teilen = async (o) => { if (await teilenJs()) return bpTeilen(o); };
  /* Abwesenheit zurücknehmen/löschen und eigene Arten (Baustein abwesenheit.js, erst bei Bedarf): BPHead.abwesenheit({ uid, tag, nachher }), BPHead.abwArten(host) */
  const abwJs = () => (window.bpAbwesenheit ? Promise.resolve(true) : new Promise((ok) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'abwesenheit.js' + v; sc.onload = () => ok(!!window.bpAbwesenheit); sc.onerror = () => ok(false); document.head.appendChild(sc); }));
  H.meldungen = (host, o) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', '']; const go = () => bpMeldungen.mount(host, o || {}); if (window.bpMeldungen) return go(); const sc = document.createElement('script'); sc.src = b + 'meldungen.js' + v; sc.onload = go; document.head.appendChild(sc); };   // Benachrichtigungen verwalten (meldungen.js, erst bei Bedarf)
  H.abwesenheit = async (o) => { if (await abwJs()) return bpAbwesenheit.oeffnen(o); }; H.abwArten = async (host) => { if (await abwJs()) bpAbwesenheit.arten(host); };
  /* Kontaktkarte mit Verweisen: Name/Anschrift öffnet den Kontakt, Telefon wählt, E-Mail schreibt */
  H.projektInhalt = (bt) => { const t = [[bt.reports, 'Tagesbericht', 'e'], [bt.images, 'Foto', 's'], [bt.lvs, 'LV', 's']].filter((x) => x[0] > 0).map(([n, w, e]) => `${n} ${w}${n === 1 ? '' : e}`);
    return (t.length ? 'enthält ' + t.join(', ') : 'noch ohne Inhalt') + ' – Aufgaben und Pläne des Projekts gehen mit'; };
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


  /* ---------- ⚙ Einstellungen: alle stehen in der Verwaltung unter „Einstellungen“ (besprochen am 13.11.2026) – ⚙ springt im selben Fenster dorthin.
     Persönlich (#einstellungen-ich:konto|look|ki), Büro (#einstellungen-<teil>), je App (#einstellungen-app:<app>[~<teil>]).
     Eine App meldet ihre Einstellungen mit BPHead.appEinstellungen([{ key, label, text, render(host) | open() }]); die Verwaltung zeigt sie als
     eigene Seite der App (?einbetten=1#bpeinst[-<teil>]). Darf jemand nicht in die Verwaltung, zeigt sie nur „Einstellungen“. */
  let appSet = [];
  H.appEinstellungen = (list) => { appSet = (list || []).filter(Boolean); if (/[#&]bpeinst\b/.test(location.hash)) H.einstSeite(); };
  if (/[#&]bpeinst\b/.test(location.hash)) {   // eingebettet als Einstellungsseite: die App gar nicht erst zeigen – meldet sie keine Einstellungen, steht das da
    const los = () => { if (!document.getElementById('bphEV') && document.body) { H.einstSeite(); document.getElementById('bphEV').innerHTML = '<p class="bph-mu">Lade …</p>'; } };
    if (document.body) setTimeout(los, 0); else document.addEventListener('DOMContentLoaded', los);   // H.einstSeite steht erst weiter unten
    // Apps ohne Einstellungen lädt die Verwaltung gar nicht erst (platform.py: einst False) – hier keine Wartezeit-Krücke mehr
  }
  H.einstSeite = () => {
    document.documentElement.classList.add('bph-einst'); let w = document.getElementById('bphEV'); if (!w) { w = document.createElement('div'); w.id = 'bphEV'; document.body.appendChild(w); }
    w.innerHTML = appSet.length ? '' : '<p class="bph-mu">Diese App hat keine eigenen Einstellungen.</p>';
    appSet.forEach((x) => { const h = document.createElement('section'); h.className = 'bph-drp bph-evs'; h.dataset.teil = x.key; h.innerHTML = `<h3>${esc(x.label)}</h3>`; w.appendChild(h);
      if (!x.render) { h.insertAdjacentHTML('beforeend', `${x.text ? `<p class="bph-mu">${esc(x.text)}</p>` : ''}<button type="button" class="bph-btn">${esc(x.label)} öffnen …</button>`); h.querySelector('button').addEventListener('click', () => x.open()); return; }
      const c = document.createElement('div'); h.appendChild(c); try { x.render(c, {}); } catch (e) { c.textContent = 'Fehler: ' + e.message; } });
    const t = (location.hash.match(/bpeinst-([\w-]+)/) || [])[1], z = t && w.querySelector(`[data-teil="${t}"]`); if (z) z.scrollIntoView({ block: 'start' });
  };
  H.einstIch = (host, teil) => {   // Verwaltung → Einstellungen → Persönlich: Mein Konto, Darstellung, KI, Benachrichtigungen
    if (teil === 'meldungen') return H.meldungen(host, { nurIch: true });
    if (teil === 'look') { host.innerHTML = '<p class="bph-mu">Farbschema, Akzentfarbe, Schrift und Schriftgröße – gelten für dich in allen Apps und auf allen Geräten.</p><div class="bph-lookp"></div>'; const lp = host.querySelector('.bph-lookp'), re = () => { lp.innerHTML = lookHtml(); }; re(); lookWire(lp, re); return; }
    if (teil !== 'ki') return H.konto({ into: host, tab: 'konto', nurKonto: true });   // Versprechen: fertig gezeichnet (Suche springt danach zum Abschnitt)
    const zeichne = async () => {   // was die Verwaltung nicht erlaubt, ist auch hier ausgegraut – mit Grund (19.11.2026)
      const ER = await fetch('api/bp/ki/stufen', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null) || { buero: true, extern: true, grund: {} }, GR = ER.grund || {};
      const EXT = H.providers.filter((p) => p.paid), BU = prov('ollama'), V = H.kiVorgabe || 'buero';   // KI-Schieber (KS-A1, 19.11.2026): Startstellung + welche externe KI
      host.innerHTML = `<p class="bph-mu">An jeder Stelle mit KI steht der KI-Schieber <b>ohne KI · KI im Büro · externe KI</b>. Hier stellst du ein, wo er anfangs steht und welche KI bei „externe KI“ arbeitet – das gilt in allen Apps. Was die Verwaltung oder das Projekt nicht erlaubt, ist im Schieber ausgegraut. Eine andere Wahl an einer Stelle merkt sich der Schieber dort.</p>
        <div class="bph-row" style="align-items:center;gap:.6rem;margin:.6rem 0"><b>Startstellung</b><span class="bph-seg" role="group" aria-label="Startstellung des KI-Schiebers">${[['aus', 'ohne KI'], ['buero', 'KI im Büro'], ['extern', 'externe KI']].map(([k, l]) => `<button type="button" data-kiv="${k}" class="${V === k ? 'on' : ''}"${k !== 'aus' && !ER[k] ? ` disabled title="${esc(GR[k] || 'von der Verwaltung nicht erlaubt')}"` : ''}>${l}</button>`).join('')}</span></div>
        <p style="margin:.6rem 0 .2rem"><b>KI im Büro</b> <span class="bph-mu">${esc(BU.ok ? BU.label + (BU.hint ? ' – ' + BU.hint : '') : (BU.hint || 'nicht eingerichtet oder von der Verwaltung ausgeschaltet'))}</span></p>
        <p style="margin:.6rem 0 .2rem"><b>Externe KI</b> <span class="bph-mu">anonymisiert, kostet je Anfrage, steht im Datenschutz-Protokoll</span></p>
        <div class="bph-kiw">${EXT.length ? EXT.map((p) => `<label class="${p.ok && ER.extern ? '' : 'aus'}"${ER.extern ? '' : ` title="${esc(GR.extern || '')}"`}><input type="radio" name="bphKiE" value="${p.key}"${p.key === H.ki ? ' checked' : ''}${p.ok && ER.extern ? '' : ' disabled'}><span><b>${esc(p.label)}</b><small>${esc(p.hint || '')}</small></span></label>`).join('') : '<p class="bph-mu">Keine externe KI eingerichtet oder von der Verwaltung erlaubt.</p>'}</div>
        <label class="bph-ck" style="margin-top:.8rem"><input type="checkbox" data-kie${H.kiImmer ? ' checked' : ''}> Beim Lesen von Dokumenten nicht mehr fragen („Mit KI lesen?“)</label>
        <p class="bph-mu" style="margin-top:.6rem">Welche KI es überhaupt gibt und wie weit der Schieber gehen darf („Höchste Stufe im Büro“), legt die Verwaltung fest.</p>`;
      host.querySelectorAll('[name=bphKiE]').forEach((r) => r.addEventListener('change', async () => { await setKi(r.value); }));
      host.querySelector('[data-kie]').addEventListener('change', (e) => H.kiImmerSetzen(e.target.checked));
      host.querySelectorAll('[data-kiv]').forEach((b) => b.addEventListener('click', async () => {
        H.kiVorgabe = b.dataset.kiv; host.querySelectorAll('[data-kiv]').forEach((x) => x.classList.toggle('on', x === b));
        try { await fetch('api/bp/darstellung', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ki_vorgabe: H.kiVorgabe }) }); tip('Startstellung des KI-Schiebers: ' + b.textContent); } catch { tip('Nicht gespeichert.'); }
      }));
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
       onWahl(id), onNeu(), onUmbenennen(), onVerwalten() })  – erneut aufrufen zum Aktualisieren.
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
        const f = { neu: O.onNeu, ren: O.onUmbenennen, verw: O.onVerwalten }[a]; if (f) f();
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
      ${akt ? `<button type="button" class="bph-vl-b pri" data-vl="neu" title="Kopie der aktuellen Version unter neuem Namen – die alte bleibt, wie sie ist">＋ Neue Version …</button><button type="button" class="bph-vl-b" data-vl="ren">✎ Umbenennen</button>${o.onVerwalten ? '<button type="button" class="bph-vl-b" data-vl="verw" title="Die ganze Version archivieren oder in den Papierkorb legen">🗄 Version archivieren / löschen</button>' : ''}` : ''}
      <span class="bph-vl-r"></span><span class="bph-vl-st" role="status">${esc(stT)}</span>`;
    const r = el.querySelector('.bph-vl-r');
    if ((o.rechts || []).length) { r.insertAdjacentHTML('beforebegin', '<span class="bph-vl-sp"></span>'); (o.rechts || []).forEach((x) => x && r.appendChild(x)); }
    return el;
  };
  /* Kompaktes Versionsmenü (ein Knopf „1 Version: Startversion ▾“ statt der breiten Leiste) – für alle Module gleich.
     H.versionsMenue({ in: Element, liste, aktuell, gueltig, onWahl, onNeu, onUmbenennen, onVerwalten, onGueltig, extra, wahlHinweis,
       wort ('Version' – z. B. 'Antrag'), neuText, giltText, fragen: false (beim Wechsel nicht nach „gilt“ fragen),
       gruppen: {schlüssel: Überschrift} – Einträge mit gruppe stehen eingeklappt darunter (22.11.2026) })
     gueltig: die Version, die für Bautagebuch, Erinnerungen, To-dos … gilt (★); onGueltig(id) setzt sie. Erneut aufrufen zum Aktualisieren. */
  H.versionsMenue = function (o) {
    const box = o.in; if (!box) return null;
    let el = box.querySelector(':scope > .bph-vm');
    if (!el) {
      el = document.createElement('div'); el.className = 'bph-vm'; box.appendChild(el);
      el._klick = async (e) => {
        const O = el._o, m = el._m, b = e.target.closest('[data-vm]'); if (!b || !O) return;
        const a = b.dataset.vm;
        if (a === 'dd') {   // offen hängt das Menü direkt an <body>: sonst verdeckt es der Bereich daneben (eigene Ebene) oder eine Werkzeugleiste (overflow) schneidet es ab
          m.hidden = !m.hidden;
          if (!m.hidden) { if (m.parentNode !== document.body) document.body.appendChild(m); m.style.setProperty('--af', getComputedStyle(el).getPropertyValue('--af')); const r = b.getBoundingClientRect(); Object.assign(m.style, { position: 'fixed', left: Math.max(4, Math.min(r.left, innerWidth - m.offsetWidth - 4)) + 'px', top: r.bottom + 4 + 'px', minWidth: r.width + 'px', maxHeight: Math.max(160, innerHeight - r.bottom - 16) + 'px' }); }
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
        const f = { neu: O.onNeu, ren: O.onUmbenennen, verw: O.onVerwalten, gilt: O.onGueltig && (() => O.onGueltig(O.aktuell)) }[a]; if (f) f();
      };
      el.addEventListener('click', el._klick);
    }
    if (!H._vmDoc) {   // einmal für alle Menüs: Klick daneben oder Esc schließt
      H._vmDoc = true;
      const zu = (ausser) => document.querySelectorAll('.bph-vm-m:not([hidden])').forEach((m) => { if (!ausser || !(m.contains(ausser) || (m._el && m._el.contains(ausser)))) m.hidden = true; });
      document.addEventListener('mousedown', (e) => zu(e.target));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
    }
    el._o = o;
    const L = o.liste || [], akt = L.find((x) => String(x.id) === String(o.aktuell)), aktiv = L.filter((x) => !x.archiviert && !x.gruppe), nr = (x) => aktiv.indexOf(x) + 1;
    const GR = [...new Set(L.filter((x) => !x.archiviert && x.gruppe).map((x) => x.gruppe))];   // o.gruppen = {schlüssel: Überschrift} – eingeklappt (Gebäudemodell: „Versand“)
    const gilt = (x) => o.gueltig != null && String(x.id) === String(o.gueltig);
    const zeile = (x) => `<button type="button" class="bph-vm-i${x === akt ? ' on' : ''}" data-vm="w" data-id="${esc(x.id)}" role="menuitem"><span class="n">${x.archiviert ? '🗄' : x.gruppe ? '·' : nr(x)}</span><span class="t">${esc(x.name || 'ohne Namen')}${gilt(x) ? ' <em title="Diese Version gilt">★ gilt</em>' : ''}</span><small>${esc(x.datum || '')}</small></button>`;
    const hinweis = akt && o.gueltig != null && !gilt(akt) && o.fragen !== false ? `<span class="bph-vm-ng" title="Bautagebuch, Erinnerungen und To-dos richten sich nach der gültigen Version">gilt nicht</span>` : akt && o.gueltig != null && gilt(akt) ? '<span class="bph-vm-g" title="Diese Version gilt – für Bautagebuch, Erinnerungen und To-dos">★</span>' : '';
    if (el._m && el._m.parentNode === document.body) el._m.remove();   // altes Menü (hing offen an <body>)
    el.innerHTML = `<button type="button" class="bph-vm-b" data-vm="dd" aria-haspopup="menu" title="Version wechseln, neu anlegen, umbenennen …"${akt || L.length || o.onNeu ? '' : ' disabled'}><span class="n">${akt ? (akt.archiviert ? '🗄' : akt.gruppe ? '·' : nr(akt)) : '–'}</span><span class="t">${esc(o.wort || 'Version')}: <b>${esc(akt ? akt.name || 'ohne Namen' : L.length ? '–' : 'noch keiner')}</b></span>${hinweis}<span class="c">▾</span></button>
      <div class="bph-vm-m" role="menu" hidden>${aktiv.map(zeile).join('')}${GR.map((g) => { const X = L.filter((x) => !x.archiviert && x.gruppe === g); return `<details class="bph-vm-gr bp-klapp-aus"${akt && X.includes(akt) ? ' open' : ''}><summary class="bph-vm-h">${esc((o.gruppen || {})[g] || g)} (${X.length})</summary>${X.map(zeile).join('')}</details>`; }).join('')}${L.some((x) => x.archiviert) ? '<div class="bph-vm-h">Archiviert</div>' + L.filter((x) => x.archiviert).map(zeile).join('') : ''}
        <hr>${akt && o.onGueltig && !gilt(akt) ? `<button type="button" data-vm="gilt" class="bph-vm-pri">${esc(o.giltText || '★ Diese Version gilt ab jetzt …')}</button>` : ''}${o.onNeu && (akt || o.neuText) ? `<button type="button" data-vm="neu">${esc(o.neuText || `＋ Neue Version aus „${akt.name || ''}“ …`)}</button>` : ''}${(o.extra || []).map((x, i) => `<button type="button" data-vm="x" data-i="${i}">${esc(x.text)}</button>`).join('')}${akt && o.onUmbenennen ? '<button type="button" data-vm="ren">✎ Umbenennen …</button>' : ''}${akt && o.onVerwalten ? '<button type="button" data-vm="verw">🗄 Archivieren / löschen …</button>' : ''}</div>`;
    el._m = el.querySelector('.bph-vm-m'); el._m._el = el; el._m.addEventListener('click', el._klick);
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

  const HSTAND = { helfer: false };   // bin ich Helfer:in (hilfeZaehler) – auch für hilfe.js
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
  /* Wiki-Symbol (Baustein wikisym.js, Entwurf „Wiki-Symbol überall“ 16.11.2026): erst geladen, wenn die Seite Platzhalter [data-wk] hat –
     nach dem Aufbau der Seite, nie beim Öffnen; der Baustein übernimmt dann selbst das Nachsehen. */
  { let tw = 0, mo = null;
    const sieh = () => { if (window.bpWikiSym || !document.querySelector('span[data-wk]')) return; if (mo) mo.disconnect();
      const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'wikisym.js' + v; document.head.appendChild(sc); };
    const los = () => { setTimeout(sieh, 1200); mo = new MutationObserver(() => { clearTimeout(tw); tw = setTimeout(sieh, 800); }); mo.observe(document.body, { childList: true, subtree: true }); };
    if (document.body) setTimeout(los, 0); else document.addEventListener('DOMContentLoaded', los); }
  H.meinordner = () => window.bpMeinOrdner ? Promise.resolve() : new Promise((ok) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'meinordner.js' + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); });   // Mein Ordner (meinordner.js) erst bei Bedarf
  /* Handyansicht (GO 22.11.2026, Mock „Handyansicht je App“): Baustein handy.js erst laden, wenn das Fenster schmal ist (≤ 820 px) */
  H.handyLaden = () => {
    const mq = matchMedia('(max-width: 820px)'), los = () => { if (window.bpHandy || H.handyLaden.l) return; H.handyLaden.l = 1;
      const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'handy.js' + v; document.head.appendChild(sc); };
    if (mq.matches) los(); else mq.addEventListener('change', (e) => { if (e.matches) los(); });
  };
  H.winapp = () => window.bpWinApp ? Promise.resolve() : new Promise((ok) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'winapp.js' + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); });   // Baustein winapp.js erst bei Bedarf
  /* Dateien aus dem Projektordner wählen (Baustein dateiwahl.js, erst bei Bedarf geladen): Pläne & Dateien oder Fileserver → Verweise */
  H.dateiWahl = function (o) {
    if (window.bpDateiWahl) return bpDateiWahl(o);
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'dateiwahl.js' + v;
    return new Promise((ok) => { sc.onload = () => ok(window.bpDateiWahl ? bpDateiWahl(o) : null); sc.onerror = () => ok(null); document.head.appendChild(sc); });
  };
  /* Startdaten aus dem Gebäudemodell beim ersten Stand einer App (Baustein startdaten.js, erst bei Bedarf geladen) */
  H.startdaten = function (o) {
    if (window.bpStartdaten) return bpStartdaten(o);
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'startdaten.js' + v;
    return new Promise((ok) => { sc.onload = () => ok(window.bpStartdaten ? bpStartdaten(o) : { modus: 'leer' }); sc.onerror = () => ok({ modus: 'leer' }); document.head.appendChild(sc); });
  };
  H.ablageEinst = function (host, app, o) {   // Einstellungsseite einer App: was sie auf dem Dateiserver ablegt (Baustein ablageeinst.js, erst bei Bedarf)
    if (window.bpAblageEinst) return bpAblageEinst(host, app, o);
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'ablageeinst.js' + v; sc.onload = () => bpAblageEinst(host, app, o); document.head.appendChild(sc);
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

  /* ---------- Dialoge der Kopfleiste (Projekt, Verlauf, Konto …): verschieben/Größe über dlgBeweglich aus bp.js ---------- */
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
     data-neu="Firma": steht das Gesuchte nicht in der Liste, letzte Zeile „＋ … als neue Firma anlegen“ → Ereignis „bp-neu“ (detail.text).
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
        if (G[0].zu && !ws.length) { const auf = offenZu.has(gr); h += `<button type="button" class="bph-pa-o bph-pa-zu" data-pazu="${esc(gr)}" tabindex="-1">${bpKlapp(auf)}${esc(gr)} (${G.length}) – ${auf ? 'ausblenden' : 'anzeigen'}</button>`; if (!auf) return; }
        else if (gr && gr !== '…') h += `<div class="bph-pa-g">${esc(gr)}</div>`;
        G.forEach((x) => { L.push(x); const km = x.d == null ? '' : x.d < 1000 ? Math.max(10, Math.round(x.d / 10) * 10) + ' m' : (x.d / 1000).toFixed(1).replace('.', ',') + ' km';
        const an = MEHR ? [...sel.selectedOptions].some((o) => o.value === x.v) : x.v === sel.value;
        h += `<button type="button" class="bph-pa-o${an ? ' on' : ''}${MEHR ? ' bph-pa-ck' : ''}${x.a ? ' zw' : ''}" data-pa="${L.length - 1}" tabindex="-1"><span>${esc(x.t)}${x.a ? `<small>${esc(x.a)}</small>` : ''}</span>${km ? `<i>${km}</i>` : ''}</button>`; }); });
      const qt = q.trim();   // data-neu="Firma": was es nicht gibt, gleich anlegen – meldet „bp-neu“ (detail.text) an der <select>
      if (ALLG && sel.dataset.neu && qt && !E.some((x) => x.t.toLowerCase() === qt.toLowerCase())) { L.push({ neu: qt }); h += `<button type="button" class="bph-pa-o bph-pa-neu" data-pa="${L.length - 1}" tabindex="-1"><span>＋ „${esc(qt)}“ als neue ${esc(sel.dataset.neu)} anlegen</span></button>`; }
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
      if (x.neu) { zu(); text(); sel.dispatchEvent(new CustomEvent('bp-neu', { bubbles: true, detail: { text: x.neu } })); return; }
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
        if (neu) { try { await H.projektOrdner(nid, d.name); } catch (er) { if (window.toast) toast('Projektordner: ' + er.message, true); } }   // Ordner auf dem Dateiserver – erst nach Rückfrage
        const t = r.auto_address ? 'Adresse aus dem Projektnamen ermittelt – bitte prüfen.' : r.geocoded === false ? 'Adresse nicht gefunden – bitte prüfen.' : neu ? 'Projekt angelegt.' : 'Gespeichert.';
        if (!neu && extra && 'archived' in extra && typeof window.rueckgaengig === 'function') {   // Archivieren: mit Rückgängig
          const alt = d.archived ? 1 : 0;
          window.rueckgaengig(`„${d.name}“ ${alt ? 'aus dem Archiv geholt' : 'archiviert'}`, async () => {
            await J('projects/' + nid, 'PUT', { archived: alt });
            if (opt.onSaved) opt.onSaved(nid); else location.reload();
          }, { neu: async () => { if (opt.onSaved) opt.onSaved(nid); else location.reload(); } });
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
  H.projektWahl = async function (opt = {}) {   // Fenster im Baustein projektwahl.js (Mock „Projekt wählen – neu“, 19.11.2026), erst beim Öffnen geladen
    if (!window.bpProjektWahl) await new Promise((ok) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'projektwahl.js' + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); });
    if (window.bpProjektWahl) return bpProjektWahl(H, opt, { KX, esc, nachWahl: (id, p) => (pwFn ? pwFn(id, p) : location.reload()) });
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
        <p class="bph-mu">Für ${L.length > 1 ? 'diese Adressen gibt' : 'diese Adresse gibt'} es noch keinen Kontakt. Die Sendung ist trotzdem im Protokoll der Kommunikation vermerkt – sie erscheint beim Kontakt, sobald er mit dieser E-Mail-Adresse angelegt ist.</p>
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
  const pdfRoller = (el) => { for (let x = el; x && x.nodeType === 1; x = x.parentElement) { const o = getComputedStyle(x).overflowY; if ((o === 'auto' || o === 'scroll') && x.scrollHeight > x.clientHeight) return x; } return null; };
  H.pdfRolle = (el) => { const sc = el && (pdfRoller(el) || pdfRoller(el.parentElement)); return sc ? sc.scrollTop : 0; };   // für o.top beim Neuladen
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
    const pr = () => { if (document.visibilityState !== 'visible' || document.querySelector('.bph-gv')) return; KX('api/bp/skizze-einladungen').then((l) => { if (l && l[0]) skHinweis(l[0]); }).catch(() => {}); };
    setTimeout(pr, 2500); setInterval(pr, 15000);
  }
  const ZK = 'bph.zolli', ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } return null; };
  H.zolliAn = () => ls(ZK) !== 'aus';
  document.addEventListener('change', (e) => { if (e.target.matches && e.target.matches('[data-kzolli]')) { ls(ZK, e.target.checked ? 'an' : 'aus'); if (!e.target.checked && H._zolliZu) H._zolliZu(); } });
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-kzollineu]')) { ls(ZK + '.weg', '[]'); ls(ZK, 'an'); try { sessionStorage.removeItem(ZK + '.spaeter'); sessionStorage.removeItem(ZK + '.zuletzt'); } catch { /* egal */ } if (window.toast) window.toast('Zolli zeigt alle Hinweise wieder.'); } });
  const zolliLaden = () => { if (window.matchMedia && matchMedia('(pointer: fine) and (min-width: 1000px)').matches) H.baustein('zolli'); };   // nur am PC (zolli.js)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', zolliLaden); else zolliLaden();

  /* ---------- Rechte Maustaste: einheitliches Kontextmenü in allen Apps (nur am PC; Umschalt + Rechtsklick = Menü des Browsers) ----------
     Inhalt (alle Punkte, Gruppen durch Trennlinien – entschieden 17.11.2026, wie im Bauzeitenplan): 1. was die App anbietet (Ereignis 'bph:kontext', detail.punkte.push({text, fn, k?, gefahr?, aus?}),
     {titel} als kleine Überschrift; detail.nur = true: auch am Tablet), sonst 2. Eingabefeld bzw. die wichtigsten 3 Knöpfe der Zeile,
     Kopieren, Link. Kein Zurück/Neu laden/Drucken (Umschalt + Rechtsklick = Menü des Browsers). */
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
    if (e.defaultPrevented || e.shiftKey) return;   // App hat eigenes Menü / Browser-Menü gewünscht
    const t = e.target.closest ? e.target : e.target.parentElement; if (!t || t.closest('.bph-km,canvas:not([data-kontext]),iframe,embed,object,video')) return;   // 3D-Ansicht mit Punkten der App (data-kontext, Baukasten)
    const app = [], KD = { punkte: app, ziel: t, x: e.clientX, y: e.clientY, nur: false }; t.dispatchEvent(new CustomEvent('bph:kontext', { bubbles: true, detail: KD }));
    if (!KD.nur && matchMedia('(pointer: coarse)').matches) return;   // Touch: nur Menüs der App (detail.nur, z. B. Dateien – lange drücken)
    /* Was die App hier anbietet – sonst Eingabefeld bzw. die Knöpfe der Zeile (Löschen zuletzt), Kopieren, Link; die Befehle der ausgeblendeten
       Leiste (Heftzwecke, bf) hinten. Alle Punkte, Gruppen als Trennlinie (17.11.2026: Entscheidung A statt „höchstens 6 + Weitere …“). */
    const eigen = app.filter((p) => !p.bf), heft = app.filter((p) => p.bf);
    let L = [];
    const ed = KD.nur ? null : t.closest('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]):not([type=range]),textarea,[contenteditable=""],[contenteditable=true]');
    if (eigen.some((p) => p.titel == null) && !ed) L = eigen.slice();
    else if (!KD.nur) {   // im Eingabefeld: Punkte der App oben, darunter die Grundpunkte zum Bearbeiten (19.11.2026, Mock „Kontextmenü im LV“ A1)
      const sel = String(getSelection() || '');
      if (ed) {   // Eingabefeld: Rechtschreibvorschläge gibt es weiter mit Umschalt + Rechtsklick
        const ro = ed.readOnly || ed.disabled, markiert = ed.isContentEditable ? !!sel : (ed.selectionEnd || 0) > (ed.selectionStart || 0);
        L = [{ text: 'Rückgängig', k: 'Strg+Z', fn: () => { ed.focus(); document.execCommand('undo'); }, aus: ro },
          { text: 'Ausschneiden', k: 'Strg+X', fn: () => { ed.focus(); document.execCommand('cut') || kmKopie(sel); }, aus: ro || !markiert },
          { text: 'Kopieren', k: 'Strg+C', fn: () => { ed.focus(); document.execCommand('copy') || kmKopie(sel); }, aus: !markiert },
          { text: 'Einfügen', k: 'Strg+V', fn: () => kmEinfuegen(ed), aus: ro },
          { text: 'Alles markieren', k: 'Strg+A', fn: () => { ed.focus(); if (ed.select) ed.select(); else document.execCommand('selectAll'); } }];
        if (eigen.some((p) => p.titel == null)) L = eigen.concat({ titel: '' }, L);
      } else {
        const z = kmZeile(t), k = [], gesehen = new Set();
        if (z) for (const b of z.querySelectorAll(KMB)) {   // Knöpfe der Zeile/Karte – dasselbe wie ein Klick darauf
          if (!kmSicht(b) || b.matches('input,select,textarea')) continue;
          const tx = kmText(b); if (!tx || gesehen.has(tx) || /^[▸▾▴▹◂›‹»«]+$/.test(tx)) continue;
          gesehen.add(tx); k.push({ text: tx, fn: () => b.click(), gefahr: /lösch|entfern|🗑|✕|weg/i.test(tx + ' ' + (b.title || '')) });
          if (k.length >= 12) break;
        }
        const gef = k.filter((p) => p.gefahr), norm = k.filter((p) => !p.gefahr), vorn = norm.slice(0, gef.length ? 2 : 3).concat(gef.slice(0, 1));
        const x = [], lk = t.closest('a[href]'), img = t.closest('img');
        if (sel.trim()) x.push({ text: 'Kopieren', k: 'Strg+C', fn: () => kmKopie(sel) });
        else if (z) { const zt = (z.innerText || '').replace(/\n{2,}/g, '\n').trim(); if (zt && zt.length < 2000) x.push({ text: 'Text kopieren', fn: () => kmKopie(zt.replace(/\t/g, ' ')) }); }
        if (lk && !/^javascript:/i.test(lk.getAttribute('href'))) x.push({ text: 'Link öffnen', fn: () => { location.href = lk.href; } }, { text: 'Link kopieren', fn: () => kmKopie(lk.href) });
        if (img && img.src && !/^data:/.test(img.src)) x.push({ text: 'Bild ansehen', fn: () => H.ansehen ? H.ansehen([{ url: img.currentSrc || img.src, typ: 'bild', name: img.alt || 'Bild' }]) : (location.href = img.src) });
        L = eigen.concat(vorn.filter((p) => !p.gefahr), x, norm.slice(vorn.length - (gef.length ? 1 : 0)), gef);   // Löschen immer zuletzt
      }
    }
    if (heft.length) L = L.concat(heft);
    { const da = new Set(); L = L.filter((p) => p.titel != null || (!da.has(p.text) && da.add(p.text))); }   // doppelte Texte nur einmal
    if (!L.some((p) => p.titel == null)) return;   // nichts Passendes: das Menü des Browsers
    e.preventDefault();
    kmEl = document.createElement('div'); kmEl.className = 'bph-km'; kmEl.setAttribute('role', 'menu');
    const zeichne = () => {   // alle Punkte; Gruppen (titel) als Trennlinie statt Überschrift, Löschen mit Linie davor (GO 17.11.2026: „wie im Bauzeitenplan“)
      let h = '';
      for (let j = 0; j < L.length; j++) {
        const p = L[j];
        if (p.titel != null) { if (h && !/<hr[^>]*>$/.test(h) && L.slice(j + 1).some((q) => q.titel == null)) h += `<hr data-t="${esc(p.titel)}">`; continue; }
        if (p.gefahr && h && !/<hr[^>]*>$/.test(h)) h += '<hr>';
        h += `<button type="button" role="menuitem" data-km="${j}"${p.aus ? ' disabled' : ''}${p.gefahr ? ' class="gef"' : ''}><span>${esc(p.text)}</span>${p.k ? `<small>${p.k}</small>` : ''}</button>`;
      }
      kmEl.innerHTML = h;
    };
    zeichne();
    document.body.appendChild(kmEl);
    if (kmEl.offsetHeight > innerHeight - 8) kmEl.classList.add('eng');   // lang: enger statt Rollbalken
    const lage = () => { const w = kmEl.offsetWidth, h = kmEl.offsetHeight;
      kmEl.style.left = Math.max(4, Math.min(e.clientX, innerWidth - w - 4)) + 'px';
      kmEl.style.top = Math.max(4, e.clientY + h > innerHeight - 4 ? e.clientY - h : e.clientY) + 'px'; };
    lage();
    kmEl.addEventListener('click', (ev) => { const b = ev.target.closest('[data-km]'); if (!b || b.disabled) return;
      const p = L[+b.dataset.km]; kmZu(); try { p.fn(); } catch (er) { if (window.toast) window.toast(er.message, true); } });
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
  /* für die bei Bedarf geladenen Teile (ansehen.js, masken.js, hilfe.js, zolli.js) – nur dafür, keine Schnittstelle für Apps */
  H._i = { esc, KX, hatBT, appUrl, BUGP, HSTAND, hilfeZaehler, pdfRoller, ls, ZK, band: () => band };
})();
