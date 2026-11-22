/* Bereich rechts – derselbe Baustein für LV, Aufträge, Aufmaßprüfung und Rechnungen.
   Reiter oben (Details, Kopierquelle, 📄 Dokument …), Trennung zur Tabelle verschiebbar (Doppelklick: Mitte), ✕ klappt den
   Bereich an den Rand, jeder Reiter lässt sich einzeln als freies Fenster abdocken (an der Kopfzeile verschieben, an der Ecke
   ziehen, ⇲ dockt wieder an). Zustand je Bereich im Browser gemerkt.

   seite(sp, key, reiter[, opt])
     sp     – Container: erstes Kind ist die Tabelle (links); der Bereich rechts wird angehängt
     key    – Name des Bereichs (z. B. 'am', 're', 'au', 'lv') – getrennt gemerkt
     reiter – [{ id, titel, mount(el), neu?(), fenster? }]: mount füllt das Feld (im Bereich, im freien Fenster oder im eigenen
              Browserfenster), neu() wird nach einer Größenänderung aufgerufen (z. B. PDF neu zeichnen);
              Knopf „⇱“ (jeder Reiter, außer fenster: false): der Reiter zieht in ein eigenes Browserfenster (zweiter Bildschirm) und bleibt verbunden
     opt    – { planung?: false = ohne den Reiter „Planung“ (Planungsassistent, hängt sonst in Bereichen mit Projekt von selbst an), start?: Reiter beim ersten Öffnen, zu?: beim ersten Mal an den Rand geklappt, w?: Anteil der Tabelle (Standard 0,52), min?: Mindestbreite rechts in px (360), minL?: links (320), wechsel?() }: nach Umschalten (Reiter, zuklappen, abdocken) – z. B. Spaltenbreiten neu
   seiteFuellen(key, id) – einen Reiter neu füllen, wo immer er steht (rechts, freies Fenster, eigenes Browserfenster), z. B. nach neuer Auswahl
   seiteFinde(sel) / seiteAktiv() – querySelector bzw. das Feld mit dem Fokus, auch in den eigenen Browserfenstern
   seiteUmschalten() / seiteOffen() / seiteDa() – Bereich rechts an den Rand klappen bzw. fragen, ob er offen ist / da ist
   seiteAufraeumen() – freie Fenster eines nicht mehr sichtbaren Bereichs schließen (nach dem Neuzeichnen der Seite)

   bpFrei(f, { key, start, griff, neu }) – macht aus einem Element ein freies Fenster (Klasse sr-flo): am Griff verschieben,
     an der Ecke ziehen, Lage und Größe unter key gemerkt. Dasselbe Fenster benutzen die abgedockten Reiter und die Einstellungen.
     start {x,y,w,h} – Lage beim ersten Mal · griff – Auswahl der Kopfzeile im Fenster · neu() – nach deutlicher Breitenänderung
     Rückgabe: Funktion, die das Merken beendet (wenn das Fenster wieder andockt) */
(function () {
  const lies = (k, d) => { try { const v = localStorage.getItem('bp.sr.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const merk = (k, v) => { try { localStorage.setItem('bp.sr.' + k, JSON.stringify(v)); } catch { /* ohne Speicher: nur für diese Sitzung */ } };
  const esc = window.bpEsc;
  const AKTIV = new Map();   // key → { sp, reiter, opt }
  const EIGEN = new Map();   // 'key|id' → eigenes Browserfenster des Reiters
  const grenz = (v, a, b) => Math.max(a, Math.min(b, v));
  const MINR = 360, MINL = 320;   // Mindestbreiten in px: Bereich rechts (Formulare, Assistent bleiben lesbar) und Inhalt links
  const ENGAUF = new Set();   // Bereiche, die der Benutzer trotz zu wenig Platz selbst aufgeklappt hat
  const engVon = (sp, key, o) => innerWidth >= 900 && sp.clientWidth > 0 && sp.clientWidth < (o.minL ?? MINL) + (o.min ?? MINR) + 16 && !ENGAUF.has(key);   // zu schmal für beide Spalten: rechts von selbst zuklappen
  /* Höhe rechts: vom oberen Rand des Bereichs bis zum Fensterrand – nicht pauschal 150 px, sonst rollt bei hohen Kopf- oder Befehlsleisten
     zusätzlich die ganze Seite (zweiter Scrollbalken neben dem des Bereichs, 15.11.2026) */
  const hoehe = (sp) => { const q = sp.getBoundingClientRect(), t = q.top + scrollY, unten = Math.min(80, Math.max(0, document.documentElement.scrollHeight - (q.bottom + scrollY)));   // unten: Abstand der Seite unter dem Bereich
    /* nur am Bereich rechts (dort wird sie gebraucht, head.css .sr-r) und nur bei neuem Wert: eine Variable am ganzen Rahmen vererbt sich auf alles
       darin – der Browser rechnete dann bei jedem Zeichnen die Stile aller Zellen der Tabelle links neu (große LVs: 14 ms, 17.11.2026) */
    const r = sp.querySelector(':scope > .sr-r'), v = Math.round(Math.max(8, t) + unten + 2) + 'px';
    if (r && r.style.getPropertyValue('--sr-oben') !== v) r.style.setProperty('--sr-oben', v); };
  addEventListener('resize', () => { clearTimeout(engVon.t); engVon.t = setTimeout(() => AKTIV.forEach((v, key) => {
    if (!v.sp.isConnected) return; hoehe(v.sp); const e = engVon(v.sp, key, v.opt); if (!e && v.sp.clientWidth >= (v.opt.minL ?? MINL) + (v.opt.min ?? MINR) + 16) ENGAUF.delete(key);
    if (e !== !!v.eng) { seite(v.sp, key, v.reiter, v.opt); if (v.opt.wechsel) v.opt.wechsel(); } }), 150); });
  const spalten = (v, o) => `minmax(${o.minL ?? MINL}px,${Math.round(v * 1000)}fr) 16px minmax(${o.min ?? MINR}px,${Math.round((1 - v) * 1000)}fr)`;   // Anteile als ganze Zahlen: mit Bruchteilen unter 1 bleibt Platz leer, sobald eine Seite an ihrer Mindestbreite hängt

  /* Planungsassistent (bp/assistent.js, Projektmodell): in den Bereichen mit Projektbezug hängen hier von selbst die Reiter „Planung“, „Bauteile“ (bp/bauteile.js) und „Verknüpfungen“ (bp/karte.js) an.
     Geladen wird der Baustein erst, wenn jemand den Reiter öffnet. Projekt: window.bpPlanungPid() der App, sonst das Projekt der Kopfleiste. */
  const PLANUNG = new Set(['lv', 'ba', 'ws', 'gantt', 'bk']);   // nur wo Planung/Bauteile die App speisen (LV, Bauantrag, Wärmeschutz, Bauzeitenplan, Kosten) – nicht in Aufträgen, Aufmaß, Rechnungen, Angeboten, Versand, Honorar, Bautagebuch (17.11.2026)
  const planPid = () => (window.bpPlanungPid ? window.bpPlanungPid() : window.BPHead && BPHead.projektId && BPHead.projektId()) || null;
  const planLadung = {};
  const planBaustein = (id, titel, datei, glob, laedt, fehlt) => ({ id, titel, mount: (el) => {   // Baustein erst beim Öffnen des Reiters holen
    const pid = planPid();
    if (!pid) {   // ohne Projekt: die App sagt, wie man eins verknüpft (window.bpOhneProjekt); nach dem Verknüpfen („bp:verknuepft“) geht es hier weiter
      el.innerHTML = `<div class="sr-pad">${window.bpOhneProjekt ? window.bpOhneProjekt(titel) : 'Kein Projekt gewählt.'}</div>`;
      addEventListener('bp:verknuepft', () => { if (el.isConnected) planBaustein(id, titel, datei, glob, laedt, fehlt).mount(el); }, { once: true }); return; }
    if (window[glob]) return window[glob].mount(el, pid);
    el.innerHTML = `<div class="sr-pad">${laedt}</div>`;
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''];
    planLadung[datei] = planLadung[datei] || new Promise((ok, nein) => { const sc = document.createElement('script'); sc.src = b + datei + v; sc.onload = ok; sc.onerror = () => { planLadung[datei] = null; nein(); }; document.head.appendChild(sc); });
    planLadung[datei].then(() => { if (el.isConnected) window[glob].mount(el, planPid()); }, () => { el.innerHTML = `<div class="sr-pad">${fehlt}</div>`; });
  } });
  const planReiter = planBaustein('planung', 'Planung', 'assistent.js', 'bpAssistent', 'Planungsassistent wird geladen …', 'Der Planungsassistent konnte nicht geladen werden.');
  const baukastenReiter = planBaustein('baukasten', 'Baukasten', 'gebaeudekasten.js', 'bpBaukasten', 'Gebäude-Baukasten wird geladen …', 'Der Gebäude-Baukasten konnte nicht geladen werden.');   // Gebäude per Klick und Ziehen (bp/gebaeudekasten.js, A3 20.11.2026)
  const kartenReiter = planBaustein('karte', 'Verknüpfungen', 'karte.js', 'bpKarte', 'Verknüpfungen werden geladen …', 'Die Verknüpfungen konnten nicht geladen werden.');   // Verknüpfungs-Karte des Projektmodells (bp/karte.js)
  const fragenReiter = planBaustein('fragen', 'Fragen und Antworten', 'fragen.js', 'bpFragen', 'KI-Gespräch wird geladen …', 'Das KI-Gespräch konnte nicht geladen werden.');   // KI-Gespräch zum Projekt (bp/fragen.js) – nur Ollama
  const BAUTEILE = new Set(['bk', 'lv']);   // Bauteile nur, wo sie die App speisen (RR-A1, 18.11.2026): Kosten, LV – nicht Bauzeitenplan, Bauantrag; im Wärmeschutz steht der Baum links (ws-baum.js, WB-1 B, 22.11.2026)
  const FRAGEN = PLANUNG;   // Reiter „Fragen und Antworten“ überall, wo „Planung“ steht (18.11.2026); im Gebäudemodell eine eigene Ansicht
  const bauteilReiter = planBaustein('bauteile', 'Bauteile', 'bauteile.js', 'bpBauteile', 'Bauteil-Checkliste wird geladen …', 'Die Bauteil-Checkliste konnte nicht geladen werden.');   // Bauteil-Checkliste im Projektmodell (bp/bauteile.js)

  function seite(sp, key, reiter, opt = {}) {
    if (!sp) return;
    reiter = (reiter || []).filter(Boolean);
    if (PLANUNG.has(key) && opt.planung !== false && planPid() && !reiter.some((x) => x.id === 'planung')) reiter = [...reiter, planReiter, baukastenReiter, ...(BAUTEILE.has(key) && !reiter.some((x) => x.id === 'bauteile') ? [bauteilReiter] : []), ...(FRAGEN.has(key) ? [fragenReiter] : [])];   // Verknüpfungen nur im Gebäudemodell (RR-A1); bringt die App einen eigenen Reiter „Bauteile“ mit (Ausschreibung: Quelle aus dem Gebäudemodell, 21.11.2026), bleibt es bei dem
    const engAlt = !!(AKTIV.get(key) || {}).eng;   // Stand vom letzten Mal: damit die Spalten gesetzt sind, BEVOR gemessen wird (sonst ordnet der Browser den Inhalt links erst in voller Breite an und dann noch einmal in der Spalte – bei großen Tabellen 40 ms je Mal, 17.11.2026)
    AKTIV.set(key, { sp, reiter, opt, eng: engAlt });
    if (PLANUNG.has(key) && opt.planung !== false && !planPid() && !opt._warte) {   // Projekt der App kommt oft erst nach dem Aufbau (Bauzeitenplan: Plan lädt) – dann die Reiter nachreichen,
      let n = 0; const roh = reiter, ich = AKTIV.get(key);                                               // statt erst nach Zu- und Aufklappen des Bereichs (19.11.2026)
      const warte = () => { if (AKTIV.get(key) !== ich || !sp.isConnected) return;   // inzwischen neu aufgebaut: dieser Aufruf hat nichts mehr zu tun
        if (planPid()) seite(sp, key, roh, { ...opt, _warte: true }); else if (++n < 40) setTimeout(warte, 250); };
      setTimeout(warte, 250);
    }
    const frei = lies(key + '.frei', []).filter((id) => reiter.some((r) => r.id === id));
    const dock = reiter.filter((r) => !frei.includes(r.id));
    const akt = dock.find((r) => r.id === lies(key + '.r', opt.start || '')) || dock[0];
    const zuBasis = !!lies(key + '.zu', !!opt.zu), w = grenz(+lies(key + '.w', opt.w || 0.52) || 0.52, 0.2, 0.85), schmal = innerWidth < 900;
    sp.classList.add('sr-split'); sp.dataset.sr = key;
    let r = sp.querySelector(':scope > .sr-r');
    if (!r) { r = document.createElement('aside'); r.className = 'sr-r'; sp.appendChild(r); }
    let g = sp.querySelector(':scope > .sr-griff');
    if (!g) { g = document.createElement('div'); g.className = 'sr-griff'; g.title = 'Trennung verschieben (Doppelklick: Mitte)'; sp.insertBefore(g, r); }
    let eng = engAlt, zu = zuBasis || eng;
    const spalten_setzen = () => {
      sp.classList.toggle('sr-leer', !dock.length); sp.classList.toggle('sr-zu', !!dock.length && zu);
      const gc = schmal || !dock.length ? '' : zu ? 'minmax(0,1fr) 2.1rem' : spalten(w, opt); if (sp.style.gridTemplateColumns !== gc) sp.style.gridTemplateColumns = gc;
      g.hidden = schmal || zu || !dock.length;
    };
    spalten_setzen();
    /* ob es für beide Spalten zu eng ist, wird erst im nächsten Bild gemessen (mit der Höhe) – kein Messen mitten im Aufbau, das den Browser zur
       Anordnung zwingt; war die Annahme falsch (selten: Fenster inzwischen zu schmal/breit), wird der Bereich einmal neu aufgebaut */
    requestAnimationFrame(() => { if (!sp.isConnected || AKTIV.get(key).sp !== sp) return; hoehe(sp); const e = engVon(sp, key, opt); AKTIV.get(key).eng = e; if (e !== eng) { seite(sp, key, reiter, opt); if (opt.wechsel) opt.wechsel(); } });
    if (!dock.length) r.innerHTML = '';
    else if (zu) r.innerHTML = `<div class="sr-aufs" role="tablist" aria-label="Bereich rechts">${dock.map((x) => `<button type="button" role="tab" class="sr-auf${x === akt ? ' on' : ''}" data-sra="auf" data-srid="${esc(x.id)}" title="„${esc(x.titel)}“ zeigen"><span>${esc(x.titel)}</span></button>`).join('')}</div>`;   // je Reiter ein Kopf wie im Ordner – öffnet genau diesen
    else {
      r.innerHTML = `<div class="sr-rt" role="tablist">${dock.map((x) => `<button type="button" role="tab" class="sr-tab${x === akt ? ' on' : ''}" data-srt="${esc(x.id)}" aria-selected="${x === akt}">${esc(x.titel)}</button>`).join('')}<span class="sr-sp"></span>`
        + (eigenOffen(key, akt.id) ? '' : `${akt.fenster !== false ? `<button type="button" class="sr-ik" data-sra="fen" title="„${esc(akt.titel)}“ in ein eigenes Browserfenster – z. B. auf den zweiten Bildschirm">⇱</button>` : ''}<button type="button" class="sr-ik" data-sra="ab" title="„${esc(akt.titel)}“ als freies Fenster abdocken">⧉</button>`) + `<button type="button" class="sr-ik" data-sra="zu" title="Bereich an den Rand klappen – oben „Details“ zeigt ihn wieder">✕</button></div><div class="sr-b"></div>`;
      if (eigenOffen(key, akt.id)) r.querySelector('.sr-b').innerHTML = `<div class="sr-weg"><div><p>„${esc(akt.titel)}“ ist in einem <b>eigenen Fenster</b> geöffnet.</p><button type="button" class="btn" data-sra="hol">↩ hierher zurückholen</button></div></div>`;
      else akt.mount(r.querySelector('.sr-b'));
    }
    const neu = () => { seite(sp, key, reiter, opt); if (opt.wechsel) opt.wechsel(); };
    r.onclick = (e) => {
      const t = e.target.closest('[data-srt]'); if (t) { merk(key + '.r', t.dataset.srt); return neu(); }
      const a = e.target.closest('[data-sra]'); if (!a) return;
      if (a.dataset.sra === 'zu') { merk(key + '.zu', true); ENGAUF.delete(key); }
      else if (a.dataset.sra === 'auf') { merk(key + '.zu', false); if (eng) ENGAUF.add(key); if (a.dataset.srid) merk(key + '.r', a.dataset.srid); }
      else if (a.dataset.sra === 'fen') { eigenAuf(key, akt); return; }
      else if (a.dataset.sra === 'hol') { eigenZu(key, akt.id); return; }
      else if (a.dataset.sra === 'ab') { merk(key + '.frei', [...frei, akt.id]); merk(key + '.r', ''); }
      neu();
    };
    g.onpointerdown = (e) => { if (e.button !== 0) return; e.preventDefault(); g.setPointerCapture(e.pointerId); const b = sp.getBoundingClientRect();
      g.onpointermove = (m) => { const v = grenz((m.clientX - b.left) / b.width, Math.max(0.2, (opt.minL ?? MINL) / b.width), Math.min(0.85, 1 - ((opt.min ?? MINR) + 16) / b.width)); sp.style.gridTemplateColumns = spalten(v, opt); merk(key + '.w', v); };
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
  function frei(f, o) {
    const q = lies(o.key, null) || o.start;
    Object.assign(f.style, { left: grenz(q.x, 120 - q.w, innerWidth - 120) + 'px', top: grenz(q.y, 0, innerHeight - 60) + 'px', width: Math.min(q.w, innerWidth) + 'px', height: Math.min(q.h, innerHeight) + 'px' });
    const lage = () => merk(o.key, { x: f.offsetLeft, y: f.offsetTop, w: f.offsetWidth, h: f.offsetHeight });
    let breite = q.w, t = 0;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (!f.isConnected) return; lage();
      if (Math.abs(f.clientWidth - breite) > 40) { breite = f.clientWidth; if (o.neu) o.neu(); } }, 350); });
    ro.observe(f);
    const ab = (e) => {
      document.querySelectorAll('.sr-flo').forEach((x) => x.classList.toggle('vorn', x === f));   // angeklicktes Fenster nach vorn
      const kopf = e.target.closest(o.griff);
      if (!kopf || !f.contains(kopf) || e.button !== 0 || e.target.closest('button,input,select,a')) return;
      e.preventDefault(); kopf.setPointerCapture(e.pointerId);
      const sx = e.clientX - f.offsetLeft, sy = e.clientY - f.offsetTop;
      kopf.onpointermove = (m) => { f.style.left = grenz(m.clientX - sx, 120 - f.offsetWidth, innerWidth - 120) + 'px'; f.style.top = grenz(m.clientY - sy, 0, innerHeight - 50) + 'px'; };
      kopf.onpointerup = () => { kopf.onpointermove = kopf.onpointerup = null; lage(); };
    };
    f.addEventListener('pointerdown', ab);
    return () => { clearTimeout(t); ro.disconnect(); f.removeEventListener('pointerdown', ab); };
  }
  function fenster(key, liste, neu) {
    document.querySelectorAll('.sr-flo[data-key]').forEach((f) => { if (f.dataset.key === key && !liste.some((x) => x.id === f.dataset.id)) f.remove(); });
    liste.forEach((rt, i) => {
      let f = [...document.querySelectorAll('.sr-flo[data-key]')].find((x) => x.dataset.key === key && x.dataset.id === rt.id);
      if (!f) {
        f = document.createElement('div'); f.className = 'sr-flo'; f.dataset.key = key; f.dataset.id = rt.id; f.setAttribute('role', 'dialog'); f.setAttribute('aria-label', rt.titel); document.body.appendChild(f);
        frei(f, { key: `${key}.pos.${rt.id}`, start: { x: innerWidth - 680 - i * 32, y: 110 + i * 32, w: 620, h: innerHeight - 170 }, griff: '.sr-fk',
          neu: () => { const x = AKTIV.get(key), a = x && x.reiter.find((y) => y.id === rt.id); if (a && a.neu) a.neu(); } });
      }
      f.innerHTML = `<div class="sr-fk"><b>${esc(rt.titel)}</b>${rt.fenster !== false ? '<button type="button" class="sr-ik" data-sra="fen" title="in ein eigenes Browserfenster – z. B. auf den zweiten Bildschirm">⇱</button>' : ''}<button type="button" class="sr-ik" data-sra="an" title="wieder rechts andocken">⇲</button><button type="button" class="sr-ik" data-sra="an" title="Fenster schließen – der Reiter kommt zurück in den Bereich rechts">✕</button></div><div class="sr-b"></div>`;
      rt.mount(f.querySelector('.sr-b'));
      const kopf = f.firstElementChild;
      kopf.onclick = (e) => { if (e.target.closest('[data-sra="fen"]')) { merk(key + '.r', rt.id); f.remove(); eigenAuf(key, rt); return; } if (!e.target.closest('[data-sra="an"]')) return; merk(key + '.frei', lies(key + '.frei', []).filter((id) => id !== rt.id)); merk(key + '.r', rt.id); merk(key + '.zu', false); f.remove(); neu(); };
    });
  }

  /* eigenes Browserfenster je Reiter: der Inhalt wird wie im Bereich gefüllt (mount), nur in einem anderen Fenster.
     Bedien-Ereignisse der Seite gelten dort mit (BP_HORCHER aus bp.js); schließt man das Fenster (✕ des Fensters), sitzt der Reiter
     wieder rechts. Das Fenster hat keine eigene Kopfzeile – so bleibt oben nur die Leiste des Browsers. */
  const eigenOffen = (key, id) => { const w = EIGEN.get(key + '|' + id); if (w && w.closed) EIGEN.delete(key + '|' + id); return !!w && !w.closed; };
  const nochmal = (key) => { const x = AKTIV.get(key); if (x && x.sp.isConnected) { seite(x.sp, key, x.reiter, x.opt); if (x.opt.wechsel) x.opt.wechsel(); } };
  function eigenStil(w) {   // Aussehen der Seite übernehmen: Stilblätter, Farbschema und Stil-Variablen am <html>
    const d = w.document, H = document.documentElement;
    d.head.querySelectorAll('[data-sre]').forEach((n) => n.remove());
    document.querySelectorAll(STILE).forEach((n) => { const c = d.importNode(n, true); if (c.tagName === 'LINK') c.href = n.href; c.setAttribute('data-sre', ''); d.head.appendChild(c); });
    [...d.documentElement.attributes].forEach((a) => d.documentElement.removeAttribute(a.name));
    [...H.attributes].forEach((a) => d.documentElement.setAttribute(a.name, a.value));
    d.body.className = document.body.className + ' sr-eigen'; w._srN = -1; eigenBlaetter(w);
  }
  const STILE = 'link[rel="stylesheet"],style';
  function eigenBlaetter(w) {   // Bausteine, die erst beim Füllen laden, bringen ihren Stil später mit (auch als CSSOM-Blatt, z. B. 3D-Ansicht) – nachführen
    const d = w.document, A = document.adoptedStyleSheets || [];
    if (document.querySelectorAll(STILE).length !== d.head.querySelectorAll('[data-sre]').length) return eigenStil(w);
    if (w._srN === A.length) return;
    try { const alt = w._srB || [], eigen = [...d.adoptedStyleSheets].filter((b) => !alt.includes(b));   // eigene Blätter des Fensters bleiben
      w._srB = A.map((b) => { const n = new w.CSSStyleSheet(); n.replaceSync([...b.cssRules].map((r) => r.cssText).join('\n')); return n; });
      d.adoptedStyleSheets = [...w._srB, ...eigen]; w._srN = A.length; } catch { /* alter Browser: ohne */ }
  }
  /* F5 im eigenen Fenster (21.11.2026): das Fenster ist ein leeres Dokument, das diese Seite beschreibt – neu geladen ist es leer. Nach „pagehide“
     ist es dann noch offen: wieder beschreiben statt es als geschlossen zu behandeln. Erst wenn es wirklich zu ist, gilt es als geschlossen. */
  function nachPagehide(w, sel, zu, wieder) {
    let n = 0;
    const p = () => { let d = null; try { d = w.closed ? null : w.document; } catch { /* fremd */ }
      if (!d) return zu();
      if (d.readyState === 'complete' && !d.querySelector(sel)) return wieder();
      if (++n < 60) setTimeout(p, 50); else zu(); };
    setTimeout(p, 50);
  }
  function eigenAuf(key, rt, w0) {
    const q = lies(`${key}.win.${rt.id}`, null) || { w: 900, h: Math.min(1100, screen.availHeight - 80) };
    const w = w0 || window.open('', 'bp_sr_' + key + '_' + rt.id, `popup=yes,width=${q.w},height=${q.h}${q.x != null ? `,left=${q.x},top=${q.y}` : ''}`);
    if (!w) { if (window.toast) window.toast('Das Fenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.', true); return; }
    const d = w.document; d.open(); d.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><base href="${esc(document.baseURI)}"><title>${esc(rt.titel)}</title></head><body><div class="sr-b"></div></body></html>`); d.close();
    eigenStil(w); EIGEN.set(key + '|' + rt.id, w); BP_FENSTER.add(w);
    BP_HORCHER.forEach(([t, f, o]) => d.addEventListener(t, f, o));
    let t = 0, breite = w.innerWidth;
    w.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (w.closed) return; merk(`${key}.win.${rt.id}`, { w: w.outerWidth, h: w.outerHeight, x: w.screenX, y: w.screenY });
      if (Math.abs(w.innerWidth - breite) > 40) { breite = w.innerWidth; const x = AKTIV.get(key), a = x && x.reiter.find((y) => y.id === rt.id); if (a && a.neu) a.neu(); } }, 350); });
    w.addEventListener('pagehide', () => { try { merk(`${key}.win.${rt.id}`, { w: w.outerWidth, h: w.outerHeight, x: w.screenX, y: w.screenY }); } catch { /* egal */ }
      nachPagehide(w, '.sr-b', () => { EIGEN.delete(key + '|' + rt.id); BP_FENSTER.delete(w); nochmal(key); }, () => eigenAuf(key, rt, w)); });
    merk(key + '.frei', lies(key + '.frei', []).filter((id) => id !== rt.id));
    nochmal(key); if (rt.neu) setTimeout(() => { if (!w.closed) rt.neu(); }, 400);
  }
  /* Beliebiger Inhalt in ein eigenes Browserfenster (21.11.2026, zuerst das 3D des Gebäudemodells) – dasselbe Fenster wie für einen Reiter:
     Aussehen der Seite, Bedien-Ereignisse, gemerkte Größe/Lage. seiteFenster(id, titel, mount(el, w, wieder), zu?) → das Fenster (oder null, blockiert);
     nachher(w) führt später geladene Stilblätter nach (seiteFenster.stil(w)). Schließt man es, ruft es zu(); F5 im Fenster ruft mount erneut mit wieder = true. */
  function seiteFenster(id, titel, mount, zu, w0) {
    const q = lies(`frei.win.${id}`, null) || { w: Math.min(1400, screen.availWidth - 80), h: Math.min(1000, screen.availHeight - 80) };
    const w = w0 || window.open('', 'bp_fr_' + id, `popup=yes,width=${q.w},height=${q.h}${q.x != null ? `,left=${q.x},top=${q.y}` : ''}`);
    if (!w) { if (window.toast) window.toast('Das Fenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.', true); return null; }
    const d = w.document; d.open(); d.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><base href="${esc(document.baseURI)}"><title>${esc(titel)}</title><style>html,body{height:100%;margin:0}.sr-fr{height:100%;display:flex;flex-direction:column}.sr-fr>*{flex:1;min-height:0}</style></head><body><div class="sr-fr"></div></body></html>`); d.close();
    eigenStil(w); BP_FENSTER.add(w); BP_HORCHER.forEach(([t, f, o]) => d.addEventListener(t, f, o));
    let t = 0; const merkLage = () => { try { merk(`frei.win.${id}`, { w: w.outerWidth, h: w.outerHeight, x: w.screenX, y: w.screenY }); } catch { /* egal */ } };
    w.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (!w.closed) merkLage(); }, 350); });
    w.addEventListener('pagehide', () => { merkLage(); nachPagehide(w, '.sr-fr', () => { BP_FENSTER.delete(w); if (zu) zu(); }, () => seiteFenster(id, titel, mount, zu, w)); });
    mount(d.querySelector('.sr-fr'), w, !!w0); eigenBlaetter(w);
    return w;
  }
  seiteFenster.stil = (w) => { if (w && !w.closed) eigenBlaetter(w); };
  addEventListener('pagehide', () => BP_FENSTER.forEach((w) => { try { if (/^bp_fr_/.test(w.name)) w.close(); } catch { /* egal */ } }));
  function eigenZu(key, id) { const w = EIGEN.get(key + '|' + id); if (w && !w.closed) w.close(); else { EIGEN.delete(key + '|' + id); nochmal(key); } }
  function eigenFuellen(key) {   // nach jedem Neuzeichnen: Inhalt der eigenen Fenster dieses Bereichs nachführen
    for (const [k, w] of [...EIGEN.entries()]) { const [ke, id] = k.split('|'); if (ke !== key) continue;
      if (w.closed) { EIGEN.delete(k); BP_FENSTER.delete(w); continue; }
      const x = AKTIV.get(key), rt = x && x.sp.isConnected && x.reiter.find((y) => y.id === id), d = w.document, b = d.querySelector('.sr-b'); if (!b) continue;
      if (d.documentElement.dataset.theme !== document.documentElement.dataset.theme || d.documentElement.getAttribute('style') !== document.documentElement.getAttribute('style')) eigenStil(w);
      b.className = 'sr-b'; b.innerHTML = '';
      if (rt) { d.title = rt.titel + ' – ' + document.title; rt.mount(b); eigenBlaetter(w); }
      else b.innerHTML = '<div class="sr-weg"><div><p>Zur aktuellen Auswahl gibt es hier nichts zu zeigen.</p><p class="hint">Das Fenster füllt sich wieder, sobald du links einen passenden Eintrag wählst.</p></div></div>';
    }
  }
  addEventListener('pagehide', () => EIGEN.forEach((w) => { try { w.close(); } catch { /* egal */ } }));   // Seite verlassen: Fenster mitnehmen

  const sichtbar = () => [...AKTIV.entries()].filter(([, x]) => x.sp.isConnected && x.reiter.length);
  function seiteAufraeumen() {
    for (const [k, x] of [...AKTIV.entries()]) if (!x.sp.isConnected) AKTIV.delete(k);
    document.querySelectorAll('.sr-flo[data-key]').forEach((f) => { if (!AKTIV.has(f.dataset.key)) f.remove(); });
    for (const k of EIGEN.keys()) if (!AKTIV.has(k.split('|')[0])) eigenFuellen(k.split('|')[0]);
  }
  function seiteDa() { return sichtbar().length > 0; }
  function seiteOffen() { const s = sichtbar()[0]; return !!s && !lies(s[0] + '.zu', false); }
  function seiteReiter(key, id) {   // einen Reiter nach vorn holen (und den Bereich aufklappen) – z. B. Knopf „Kopierquelle“
    merk(key + '.r', id); merk(key + '.zu', false); merk(key + '.frei', lies(key + '.frei', []).filter((x) => x !== id));
    const x = AKTIV.get(key); if (x && x.sp.isConnected) seite(x.sp, key, x.reiter, x.opt);
  }
  /* von einem Inhalt aus (z. B. Planungsassistent): seinen Bereich finden – Reiter nach vorn bzw. den Bereich zuklappen; false, wenn er in keinem steckt */
  const keyVon = (el) => { for (const [k, x] of AKTIV) if (x.sp.isConnected && x.sp.contains(el)) return k; const f = el.closest && el.closest('.sr-flo[data-key]'); return f ? f.dataset.key : null; };
  function seiteReiterVon(el, id) { const k = keyVon(el), x = k && AKTIV.get(k); if (!x || !x.reiter.some((y) => y.id === id)) return false; seiteReiter(k, id); return true; }
  function seiteZuVon(el) { const k = keyVon(el), x = k && AKTIV.get(k); if (!x || !x.sp.isConnected) return false; merk(k + '.zu', true); merk(k + '.frei', []); seite(x.sp, k, x.reiter, x.opt); if (x.opt.wechsel) x.opt.wechsel(); return true; }
  function seiteUmschalten() {
    const s = sichtbar()[0]; if (!s) return;
    const [key, x] = s; merk(key + '.zu', !lies(key + '.zu', false)); seite(x.sp, key, x.reiter, x.opt); if (x.opt.wechsel) x.opt.wechsel();
  }
  function seiteFuellen(key, id) {
    const x = AKTIV.get(key), rt = x && x.sp.isConnected && x.reiter.find((y) => y.id === id); if (!rt) return;
    const Z = [], r = x.sp.querySelector(':scope > .sr-r'), t = r && r.querySelector('.sr-tab.on');
    if (t && t.dataset.srt === id && !eigenOffen(key, id)) Z.push(r.querySelector('.sr-b'));
    document.querySelectorAll('.sr-flo[data-key]').forEach((f) => { if (f.dataset.key === key && f.dataset.id === id) Z.push(f.querySelector('.sr-b')); });
    const w = EIGEN.get(key + '|' + id); if (w && !w.closed) Z.push(w.document.querySelector('.sr-b'));
    Z.filter(Boolean).forEach((b) => { const a = b.ownerDocument.activeElement;   // wer gerade in einem Feld dort tippt, wird nicht gestört
      if (a && b.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return; b.innerHTML = ''; rt.mount(b); });
  }
  const docs = () => [document, ...[...EIGEN.values()].filter((w) => !w.closed).map((w) => w.document)];
  const seiteFinde = (sel) => { for (const d of docs()) { const n = d.querySelector(sel); if (n) return n; } return null; };
  const seiteAktiv = () => { for (const d of docs()) if (d.hasFocus()) return d.activeElement; return document.activeElement; };   // das Fenster, in dem gerade getippt wird
  seite.planung = planReiter;   // Reiter „Planung“ für Apps, die ihre Reiter selbst zusammenstellen (Gebäudemodell)
  Object.assign(window, { seite, seiteFenster, seiteAufraeumen, seiteDa, seiteOffen, seiteUmschalten, seiteReiter, seiteReiterVon, seiteZuVon, seiteFuellen, seiteFinde, seiteAktiv, bpFrei: frei });
})();
