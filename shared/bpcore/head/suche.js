'use strict';
/* Suche in der Kopfleiste (Strg+K oder Klick auf „Suchen …“) – Baustein für alle Apps, erst bei Bedarf geladen (head.js: H.suche).
   Besprochen am 13.11.2026 (Mock „Kopfleiste: Logo und Suche“). Findet:
     In dieser App   – was die App anmeldet: BPHead.sucheAnmelden(async (q) => [{ ic, t, sub, wo, go() }])
     Funktionen      – alle Knöpfe der Befehlsleiste (befehle.js) und die Punkte der Navigation (nav.js); Enter löst sie aus wie ein Klick
     Einstellungen   – Stichwortverzeichnis aller Einstellungen (dasselbe nutzt die Verwaltung beim Durchsuchen: bpSuche.EINST)
     Apps · Projekte · Adressen
   Geheimnisse kommen hier nicht vor: Projekte und Adressen kommen über die vorhandenen Abfragen mit denselben Rechten. */
(function () {
  const H = new Proxy({}, { get: (_, k) => (window.BPHead || {})[k] });   // die Verwaltung lädt den Baustein schon mit der Seite (Stichwortverzeichnis)
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fq = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  const EINST = [   // Seite der Verwaltung (Einstellungen), Ort, Titel, Stichwörter, Abschnitt zum Hervorheben
    ['ich:konto', 'Persönlich', 'Unterschrift', 'Unterschrift unterschreiben Bild PDF Rüge zeichnen', 'Unterschrift'],
    ['ich:konto', 'Persönlich', 'E-Mail-Signatur', 'Signatur Mail Grußformel Telefon Funktion Outlook HTML', 'E-Mail-Signatur'],
    ['ich:konto', 'Persönlich', 'Absender:in meiner Mails', 'Absender Mail Büro eigene Adresse Senden als Antwort', 'Absender'],
    ['ich:konto', 'Persönlich', 'Mängel- und Terminrügen versenden', 'Rüge Mängelrüge Terminrüge Versand PDF Firma Kopie', 'Mängel- und Terminrügen'],
    ['ich:konto', 'Persönlich', 'Preise aus den Baudaten', 'Preis Baudaten Katalog tief mittel hoch von bis eigene Preise Median LV Baukosten', 'Preise aus den Baudaten'],
    ['ich:konto', 'Persönlich', 'Erinnerungen', 'Erinnerung Termin Outlook Kalender Einladung Frist', 'Erinnerungen'],
    ['ich:konto', 'Persönlich', 'Posteingang', 'Post Postfach Mails Abruf Startseite CC ausblenden', 'Posteingang'],
    ['ich:konto', 'Persönlich', 'Vor Ort erkennen', 'iPhone Kurzbefehl Standort CarPlay Baustelle Tagesbericht GPS', 'Vor Ort'],
    ['ich:konto', 'Persönlich', 'Kennwort', 'Kennwort Passwort ändern Anmeldung', 'Kennwort'],
    ['ich:look', 'Persönlich', 'Darstellung', 'Darstellung Farbschema hell dunkel Akzentfarbe Farbe Schrift Schriftgröße Stil Design Logo Kopfleiste', ''],
    ['ich:ki', 'Persönlich', 'Meine KI', 'KI vorgewählt Claude Gemini ChatGPT Ollama ohne Nachfrage', ''],
    ['firma', 'Büro & Standort', 'Firma, Logo, Briefbogen, Stempel', 'Firma Büro Name Anschrift Logo Briefbogen Briefkopf Stempel Bundesland Kammer Bauvorlage', ''],
    ['darstellung', 'Büro & Standort', 'Darstellung fürs Büro', 'Basic Einfach Profi Vorgabe Karte Kartendienst Google OpenStreetMap', ''],
    ['ablage', 'Ablage & Server', 'Ablage auf dem Server', 'Ablage Dateiserver Projektordner SMB Netzlaufwerk Ordner PDF-Namen Fotos alte Stände Eingangsordner Allplan', ''],
    ['sicherung', 'Ablage & Server', 'Datensicherung', 'Datensicherung Backup Sicherung Wiederherstellen Kopie Fotos', ''],
    ['mail', 'Mail & Kalender', 'Postausgang, Posteingang, Postfächer', 'Mailserver SMTP Postfach Versand Microsoft 365 Absenderadresse Posteingang zuweisen', ''],
    ['druck', 'Druck & Vorlagen', 'Druck-Layouts', 'Druck Layout PDF Ausdruck Briefkopf Anschrift Fenster Raster Rüge Vorlage Editor', ''],
    ['vorlagen', 'Druck & Vorlagen', 'E-Mail-Vorlagen', 'Vorlage Mail Text Rüge Einladung Platzhalter Planversand Angebotsanfrage LV-Versand', ''],
    ['allgemein', 'KI', 'KI im Büro', 'KI künstliche Intelligenz Ollama Claude Gemini ChatGPT Schlüssel Modell an aus Positionsvorschlag', ''],
    ['kataloge', 'Kataloge erzeugen', 'Kataloge erzeugen', 'Katalog Allplan kukat Vorbemerkungen Positionen Bauteil-Vorlagen KI', ''],
    ['apps', 'Apps', 'Apps im Büro', 'Apps abschalten einschalten Kacheln', ''],
    ['verlauf', 'System', 'Verlauf', 'Verlauf Änderungen zurück Version Stand wiederherstellen', ''],
    ['app:portal', 'Apps', 'Startseite', 'Startseite Kacheln Anordnung Posteingang To-dos', ''],
    ['app:aufgaben~erinnerungen', 'Apps', 'Aufgaben: Erinnerungen', 'Erinnerung Vorlauf Uhrzeit Mail Bauzeitenplan Firma Einsatz', ''],
    ['app:aufgaben~todo', 'Apps', 'Aufgaben: Regeln der To-dos', 'To-do Regeln automatisch Vergabe Mängel Rechnung Frist', ''],
    ['app:baukosten', 'Apps', 'Baukosten: Raumtypen & Kennwerte', 'Raumtypen Kennwerte Kosten m² BGF Kostendatenbank', ''],
    ['app:baudaten', 'Apps', 'Baudaten: Kataloge, Preise, Index & Löhne', 'Baudaten Katalog sirAdos Preis Index Baupreisindex Regionalfaktor Löhne', ''],
    ['app:ava', 'Apps', 'Ausschreibung: Kataloge & Abrechnung', 'Ausschreibung AVA Katalog Abrechnung Nachträge Mengenüberschreitung Bedarfsposition', ''],
    ['app:plaene', 'Apps', 'Pläne: Plannummerierung & Gewerke', 'Plan Plannummer Planname Planarten Gewerk Kennung Plotauftrag Anhang', ''],
    ['app:gantt', 'Apps', 'Bauzeitenplan: Kataloge, Phasen, Firmen', 'Bauzeitenplan Leistungskatalog Phasen Firmen Vorlagen Gantt', ''],
    ['app:bautagebuch', 'Apps', 'Bautagebuch: Bericht-Assistent', 'Bautagebuch Bericht Assistent Schritte', ''],
    ['app:honorar', 'Apps', 'Honorar: Rechnungen & Vertrag', 'Honorar Rechnungsnummer Zahlungsziel Texte Vertrag', ''],
  ];
  const appDa = (st) => !st.startsWith('app:') || ((H.conf || {}).apps || []).some((a) => a.allowed && a.key === st.slice(4).split('~')[0]);
  const passt = (text, W) => { const t = fq(text); return W.every((w) => t.includes(w)); };

  /* Funktionen: was gerade an Knöpfen und Navigationspunkten auf der Seite steht (auch die in „»“ versteckten) */
  function funktionen(W) {
    const L = [], schon = new Set();
    document.querySelectorAll('.bf .bf-k').forEach((k) => {
      if (k.disabled || k.classList.contains('aus') || k.closest('.bph-su')) return;
      const t = ((k.querySelector('.bf-t') || {}).textContent || '').trim(), tip = k.getAttribute('title') || '', gr = k.closest('.bf-g'), g = gr && gr.querySelector('.bf-gt');
      const wo = g ? g.textContent.trim() : 'Befehl', key = t + '|' + wo;
      if (!t || schon.has(key) || !passt(`${t} ${tip} ${wo}`, W)) return;
      schon.add(key); L.push({ ic: '⚡', t: tip && tip !== t ? `${t} – ${tip}` : t, wo, go: () => k.click() });
    });
    document.querySelectorAll('.bp-nav .ni, .bp-nav .nh[href]').forEach((n) => {
      const t = n.textContent.replace(/[↗▾▸]/g, '').trim() || n.getAttribute('title') || '';
      if (!t || schon.has(t + '|nav') || !passt(t, W)) return;
      schon.add(t + '|nav'); L.push({ ic: '☰', t, wo: 'Navigation', go: () => n.click() });
    });
    return L.slice(0, 8);
  }
  function einstellungen(W) {
    return EINST.filter(([st, ort, t, k]) => appDa(st) && passt(`${ort} ${t} ${k}`, W)).slice(0, 6)
      .map(([st, ort, t]) => ({ ic: '⚙', t, wo: 'Verwaltung › ' + ort, go: () => H.einstellungen({ ziel: st }) }));
  }
  function apps(W) {
    return (H.apps ? H.apps() : []).filter((a) => passt(a.key === 'portal' ? 'Startseite' : a.name, W))
      .map((a) => ({ ic: '▦', t: a.key === 'portal' ? 'Startseite' : a.name, wo: 'App', go: () => { location.href = H.appUrl(a) + '/'; } }));
  }
  let PJ = null;   // Projekte: einmal je Öffnen der Seite geholt (dieselbe Liste wie „Projekt wählen“)
  async function projekte(W) {
    if (!PJ) { try { PJ = await (await fetch('api/bp/projekte', { credentials: 'same-origin' })).json(); } catch { PJ = []; } if (!Array.isArray(PJ)) PJ = []; }
    return PJ.filter((p) => passt(`${p.name} ${p.client} ${p.street} ${p.zip} ${p.city}`, W)).slice(0, 5)
      .map((p) => ({ ic: '⌂', t: p.name, sub: [p.street, p.city].filter(Boolean).join(', ') + (p.archived ? ' · Archiv' : ''), wo: 'Projekt', go: async () => { await H.projektSetzen(p.id); location.reload(); } }));
  }
  async function adressen(q) {
    if (q.trim().length < 3) return [];
    let L; try { L = await (await fetch('api/bp/kontakte?q=' + encodeURIComponent(q.trim()), { credentials: 'same-origin' })).json(); } catch { return []; }
    return (Array.isArray(L) ? L : []).slice(0, 5).map((c) => ({ ic: '👤', t: c.name, sub: [c.trade, c.city].filter(Boolean).join(' · '), wo: 'Adresse', go: () => H.kontaktMaske({ id: c.id }) }));
  }
  const QUELLEN = H._suQ || (H._suQ = []);   // von der App angemeldet (BPHead.sucheAnmelden)

  let box = null, T = [], sel = 0, nr = 0, zuletztFokus = null;
  const GR = [['app', 'In dieser App'], ['fn', 'Funktionen'], ['einst', 'Einstellungen'], ['mehr', 'Apps · Projekte · Adressen']];
  function mark(t, W) {
    const s = esc(t); if (!W.length) return s;
    return s.replace(new RegExp(`(${W.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'), '<mark>$1</mark>');
  }
  async function suchen(q) {
    const n = ++nr, W = fq(q).split(/\s+/).filter(Boolean), Wm = q.split(/\s+/).filter((w) => w.length > 1);
    const liste = box.querySelector('.bph-su-l');
    if (!W.length) { T = []; liste.innerHTML = '<p class="bph-su-leer">Suchen nach Inhalten dieser App, Funktionen, Einstellungen, Projekten und Adressen.</p>'; return; }
    const R = { app: [], fn: funktionen(W), einst: einstellungen(W), mehr: apps(W) };
    const zeichne = () => {
      if (n !== nr) return;
      T = []; let h = '';
      GR.forEach(([k, titel]) => { if (!R[k].length) return; h += `<div class="bph-su-g">${esc(k === 'app' && H.projekt ? `${titel} · ${H.projekt.name}` : titel)}</div>`;
        R[k].forEach((x) => { const i = T.push(x) - 1; h += `<button type="button" class="bph-su-t" data-sui="${i}" role="option"><span class="i">${esc(x.ic || '•')}</span><span class="m">${mark(x.t, Wm)}${x.sub ? `<small>${mark(x.sub, Wm)}</small>` : ''}</span><span class="w">${esc(x.wo || '')}</span></button>`; }); });
      liste.innerHTML = h || `<p class="bph-su-leer">Nichts gefunden zu „${esc(q)}“.</p>`;
      sel = Math.min(sel, Math.max(0, T.length - 1)); waehle(sel, false);
    };
    zeichne();   // was auf der Seite steht, sofort; was gefragt werden muss, je nachdem, wie es kommt – keine Quelle wartet auf eine andere
    const dazu = (pr, k) => pr.then((x) => { if (n === nr && x && x.length) { R[k] = R[k].concat(x); zeichne(); } }).catch(() => {});
    QUELLEN.forEach((f) => dazu(Promise.resolve().then(() => f(q, W)).then((x) => (x || []).filter(Boolean).slice(0, 12)), 'app'));
    dazu(projekte(W), 'mehr'); dazu(adressen(q), 'mehr');
  }
  function waehle(i, rollen = true) {
    sel = i; box.querySelectorAll('.bph-su-t').forEach((b) => b.classList.toggle('on', +b.dataset.sui === i));
    const b = box.querySelector(`.bph-su-t[data-sui="${i}"]`); if (b && rollen) b.scrollIntoView({ block: 'nearest' });
  }
  function zu() { if (!box) return; box.remove(); box = null; document.removeEventListener('keydown', tasten, true); if (zuletztFokus && zuletztFokus.focus) try { zuletztFokus.focus(); } catch { /* egal */ } }
  function los(i) { const x = T[i]; if (!x) return; zuletztFokus = null; zu(); setTimeout(() => x.go(), 0); }
  function tasten(e) {
    if (!box) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zu(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (T.length) waehle((sel + (e.key === 'ArrowDown' ? 1 : T.length - 1)) % T.length); return; }
    if (e.key === 'Enter' && e.target.closest('.bph-su')) { e.preventDefault(); los(sel); }
  }
  function oeffnen(q) {
    if (box) { box.querySelector('input').select(); return; }
    zuletztFokus = document.activeElement;
    box = document.createElement('div'); box.className = 'bph-su'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Suchen');
    box.innerHTML = `<div class="bph-su-q"><span aria-hidden="true">🔍</span><input type="search" placeholder="Suchen – Inhalte, Funktionen, Einstellungen …" autocomplete="off" aria-label="Suchen" role="combobox" aria-expanded="true"><button type="button" class="bph-x" data-sux aria-label="Schließen">✕</button></div>
      <div class="bph-su-l" role="listbox"></div><div class="bph-su-f"><span>↑↓ wählen · Enter öffnen · Esc schließen</span></div>`;
    document.body.appendChild(box);   // über allem, auch über offenen Fenstern der App
    const knopf = document.querySelector('.bph .bph-such');
    if (knopf && innerWidth > 640) { const r = knopf.getBoundingClientRect(); box.style.left = Math.max(8, Math.min(r.left, innerWidth - box.offsetWidth - 8)) + 'px'; box.style.top = (r.bottom + 6) + 'px'; }
    const inp = box.querySelector('input'); let t = 0;
    inp.addEventListener('input', () => { clearTimeout(t); sel = 0; t = setTimeout(() => suchen(inp.value), 150); });
    box.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('[data-sux]')) { zu(); return; } const b = e.target.closest('[data-sui]'); if (b) los(+b.dataset.sui); });
    box.addEventListener('mousemove', (e) => { const b = e.target.closest('[data-sui]'); if (b && +b.dataset.sui !== sel) waehle(+b.dataset.sui, false); });
    document.addEventListener('keydown', tasten, true);
    inp.value = q || ''; inp.focus(); suchen(inp.value);
  }
  document.addEventListener('mousedown', (e) => { if (box && !box.contains(e.target) && !e.target.closest('.bph-such')) zu(); });   // ein Suchfeld wie ein Menü: Klick daneben schließt
  window.bpSuche = { oeffnen, zu, EINST };
})();
