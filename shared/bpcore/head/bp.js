'use strict';
/* Bauplattform – gemeinsame Grundhilfen (/bp/bp.js, shared/bpcore/head) – für alle Apps */
/* Eigene Fenster (seite.js, „⇱ eigenes Fenster“): Was die Seite am Dokument an Bedien-Ereignissen anmeldet, gilt auch dort –
   deshalb merkt sich diese Stelle die Anmeldungen und gibt sie an offene Fenster weiter. */
const BP_HORCHER = [], BP_FENSTER = new Set();
/* Stand der Bausteine („?v=…“, von bpcore/tempo.py an die Verweise der Seite gehängt) – nachgeladene Dateien bekommen ihn auch, damit der Browser sie behalten darf */
const BP_V = (() => { try { const m = ((document.currentScript && document.currentScript.src) || '').match(/[?&]v=(\w+)/); return m ? '?v=' + m[1] : ''; } catch { return ''; } })();
window.BP_V = BP_V;
{ const an = document.addEventListener, ART = /^(click|dblclick|contextmenu|mouse(down|up|over|out)|pointer(down|up)|key(down|up)|input|change|focus(in|out)|paste|copy|cut|drag\w*|drop|wheel)$/;
  document.addEventListener = function (t, f, o) { if (ART.test(t)) { BP_HORCHER.push([t, f, o]); BP_FENSTER.forEach((w) => { try { w.document.addEventListener(t, f, o); } catch { /* Fenster schon zu */ } }); } return an.call(document, t, f, o); }; }
const $ = (s, el = document) => el.querySelector(s);
/* Suchen ohne Ärger mit Umlauten: „pü“, „pue“ und „Pürzer“ (auch aus anderen Programmen mit zerlegten Umlauten) passen zusammen */
const fold = (s) => String(s ?? '').normalize('NFC').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const passt = (text, q) => { const t = fold(text); return fold(q).split(/\s+/).filter(Boolean).every((w) => t.includes(w)); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Zahlen, Datum, Merken im Browser – einmal für alle Apps.
   bpZahl(v, min, max) – deutsche Zahl mit min bis max Nachkommastellen (ohne Angabe: 0 bis 3). Das Zahlenformat wird je Stellenpaar einmal
     angelegt und wiederverwendet – toLocaleString legt es bei jedem Aufruf neu an (in großen Tabellen der größte Zeitfresser).
   bpTag('2026-11-14') → '14.11.2026' (Text ohne Datum bleibt, leer → '')
   bpEur0(v) → '1.235 €' (leer oder keine Zahl → '–') · bpB64(datei) → Promise mit dem Inhalt als Base64 (ohne Vorspann) · bpBreit() → Bereich rechts hat Platz (seite.js da, Fenster über 820 px)
   bpLS('ava.') → { get(k, d), set(k, v) }: Einstellungen je Browser unter dem Vorsatz der App; get liefert d (Standard null), wenn nichts gemerkt ist */
const _BPNF = {};
const bpZahl = (v, min = 0, max = Math.max(min, 3)) => (_BPNF[min + '|' + max] || (_BPNF[min + '|' + max] = new Intl.NumberFormat('de-DE', { minimumFractionDigits: min, maximumFractionDigits: max }))).format(v);
const bpEur0 = (v) => (v == null || isNaN(v) ? '–' : bpZahl(Math.round(+v)) + ' €');
const bpB64 = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(r.error); r.readAsDataURL(f); });
const bpBreit = () => !!window.seite && !matchMedia('(max-width: 820px)').matches;
/* Platzhalter für das Wiki-Symbol (bp/wikisym.js füllt ihn, wenn es dazu geprüfte Einträge gibt): bpWk(['Kurztext', …], projektId?) */
const bpWk = (w, p) => { const t = [].concat(w || []).map((x) => String(x || '').trim()).filter(Boolean).join('|'); return t || p ? `<span data-wk="${esc(t.slice(0, 300))}"${p ? ` data-wkp="${+p}"` : ''}></span>` : ''; };
const bpTag = (t) => (t && t.length >= 10 ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : t || '');
const bpLS = (vor) => ({ get(k, d = null) { try { const v = localStorage.getItem(vor + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(vor + k, JSON.stringify(v)); } catch { /* ohne Speicher: nur für diese Sitzung */ } } });
// Adresse einer App: über den Reverse Proxy aufgerufen → eingetragene Adresse; direkt über IP/Rechnername und Port
// (ohne Nginx) → gleicher Rechner, Port der App (die Anmeldung gilt je Rechnername).
let BP_PROXIED = null, BP_DOMAIN = '';
const appUrl = (a) => {   // der eine Baustein – head.js (BPHead.appUrl) und die Apps rufen ihn; Einstellungen aus header() oder aus der Kopfleiste (BPHead.conf)
  const direct = `${location.protocol}//${location.hostname}:${a.port}`, h = location.hostname;
  if (!a.url) return direct;
  const c = window.BPHead && BPHead.conf ? BPHead.conf : { proxied: BP_PROXIED, domain: BP_DOMAIN }, dom = c.domain || '';
  const viaProxy = !c.proxied || c.proxied.includes(h) || (dom && (h === dom || h.endsWith('.' + dom)));
  return viaProxy ? a.url : direct;
};
window.bpAppUrl = appUrl;   // für head.js (lädt auf manchen Seiten vor dem Baukasten, ruft erst später)
async function api(u, m = 'GET', d) {
  let r;
  try { r = await fetch(u, { method: m, headers: d ? { 'Content-Type': 'application/json' } : {}, body: d ? JSON.stringify(d) : undefined }); }
  catch (e) { if (e && e.name === 'AbortError') { const a = new Error('Abgebrochen.'); a.abgebrochen = true; throw a; } throw e; }
  const j = await r.json().catch(() => null);
  if (j === null) {   // keine JSON-Antwort, z. B. Fehlerseite des Webservers (Zeitüberschreitung, Datei zu groß)
    throw new Error(r.status === 504 || r.status === 502 ? 'Der Server hat zu lange gebraucht – bitte noch einmal versuchen.'
      : r.status === 413 ? 'Die Datei ist für den Webserver zu groß.' : r.ok ? 'Unerwartete Antwort vom Server.' : `Fehler ${r.status} ${r.statusText || ''}`.trim());
  }
  if (r.status === 401 && j.login) { location.href = j.login; throw new Error('Nicht angemeldet'); }
  if (!r.ok) { const e = new Error(j.error || r.statusText); e.data = j; e.status = r.status; throw e; }
  return j;
}
function toast(msg, bad = false) {
  if (msg == null || !String(msg).trim()) return;   // ohne Text kein Hinweis: sonst bliebe unten ein leerer Kasten stehen (z. B. toast(e.message), wenn e kein Fehler-Objekt ist)
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  while (box.children.length >= 2) box.firstChild.remove();
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.setAttribute('role', 'status'); t.textContent = msg; box.appendChild(t);
  setTimeout(() => t.remove(), bad ? 6000 : 3500);
}
/* Darstellung (zentral auf der Startseite eingestellt, gilt für alle Apps): Farbschema und Akzentfarbe */
const THEMES = [['dunkel', 'Dunkel', 'wie das Bautagebuch'], ['hell', 'Hell', 'helle Flächen'], ['auto', 'Automatisch', 'nach Systemeinstellung des Geräts'], ['klassisch', 'Klassisch Grün', 'Bauzeitenplan in Grün, sonst hell']];
const ACCENTS = [['#ff5fb3', 'Pink'], ['#ffd200', 'Gelb'], ['#ff9a2e', 'Orange'], ['#ff6b5e', 'Rot'], ['#3ddc84', 'Grün'], ['#2fd6c9', 'Türkis'], ['#4da3ff', 'Blau'], ['#b18cff', 'Violett'], ['#f3f3f1', 'Weiß']];
const _mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
let _theme = 'dunkel', _accent = '#ff5fb3';
const effTheme = (t) => (t === 'auto' ? (_mq && !_mq.matches ? 'hell' : 'dunkel') : (t || 'dunkel'));
function _shade(c, f) { const n = parseInt(c.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.round(x * f).toString(16).padStart(2, '0')).join(''); }
function _paint() {
  const e = effTheme(_theme), root = document.documentElement; root.dataset.theme = e;
  let c = _accent; const lum = (x) => { const n = parseInt(x.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  if (e !== 'dunkel') while (lum(c) > 0.62) c = _shade(c, 0.85);   // helle Farben auf hellem Grund lesbar halten
  root.style.setProperty('--y', c); root.style.setProperty('--on', lum(c) > 0.55 ? '#111' : '#fff');
}
function applyTheme(t) { _theme = THEMES.some((x) => x[0] === t) ? t : 'dunkel'; try { localStorage.setItem('bpTheme', _theme); } catch { /* egal */ } _paint(); }
function applyAccent(c) {   // persönliche Farbe (Startseite → Darstellung)
  _accent = /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#ff5fb3';
  try { localStorage.setItem('accent', _accent); } catch { /* egal */ }
  _paint();
}
function applyLook(me) { if (!me) return; _theme = THEMES.some((x) => x[0] === me.theme) ? me.theme : 'dunkel'; try { localStorage.setItem('bpTheme', _theme); } catch { /* egal */ } applyAccent(me.accent); }
if (!window.BP_SCHEMA_EIGEN) {   // Apps mit eigenem Farbschema (Bauzeitenplan: theme.js) streichen selbst an
  try { _theme = localStorage.getItem('bpTheme') || 'dunkel'; applyAccent(localStorage.getItem('accent')); } catch { applyAccent(); }
  if (_mq && _mq.addEventListener) _mq.addEventListener('change', () => { if (_theme === 'auto') _paint(); });
}
function modalBox(html, onClick) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', taste, true); };
  let unten = null; bg.addEventListener('pointerdown', (e) => { unten = e.target; });   // Ziehen/Größe ändern, das außerhalb endet, schließt nicht
  /* OK und Abbrechen – in allen Fenstern gleich: OK (bzw. der Knopf mit dem Verb, data-m="ok"/"save") speichert und schließt, Abbrechen, ✕ und Esc
     schließen ohne zu speichern; wurde etwas geändert, fragt Abbrechen nach („Änderungen verwerfen?“). Knöpfe, die selbst entscheiden
     („Verwerfen“, „Später“, „Schließen“ in Fenstern, die sofort speichern), fragen nicht. */
  let geaendert = false;
  bg.addEventListener('input', () => { geaendert = true; }); bg.addEventListener('change', () => { geaendert = true; });
  const OKSEL = '[data-m="ok"]:not([disabled]),[data-m="save"]:not([disabled])', XSEL = '[data-m="x"],[data-m="zu"],[data-m="abbrechen"],[data-m="close"]';
  const fragen = (b) => geaendert && bg.querySelector(OKSEL) && /^(Abbrechen|✕|×|)$/.test((b.textContent || '').trim()) && window.bpFrage;
  bg.addEventListener('click', async (e) => { /* daneben klicken schließt nie – nur Abbrechen, ✕ oder Esc */
    const b = e.target.closest('[data-m]'); if (!b || b.disabled) return;
    if (b.matches(XSEL) && fragen(b) && !(await window.bpFrage('Änderungen verwerfen?', { ok: 'Verwerfen' }))) return;
    onClick(b.dataset.m, bg, close, b);
  });
  /* Tastatur (nur für das oberste Fenster): Esc = Abbrechen; Enter in einem einzeiligen Feld = OK; ← → (in Eingabefeldern Alt+← →),
     ↑ ↓ (auch in einzeiligen Feldern) oder Bild↑/Bild↓ springen zum vorigen/nächsten Eintrag (Dialoge mit Vor/Zurück) */
  const taste = (e) => {
    const alle = [...document.querySelectorAll('.modal-bg')]; if (alle[alle.length - 1] !== bg || document.querySelector('.bph-frage')) return;   // eine Rückfrage darüber hat Vorrang
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const x = bg.querySelector(XSEL); if (!x) { close(); return; } const f = fragen(x); x.click(); if (!f && bg.isConnected) close(); return; }
    const feld = e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]');
    const zeile = feld && feld.tagName === 'INPUT' && !feld.list && !['checkbox', 'radio', 'file', 'button', 'submit', 'number', 'range', 'date', 'time'].includes(feld.type);   // einzeiliges Feld
    const blaettern = bg.querySelector('[data-m="prev"],[data-m="next"],[data-m="zurueck"],[data-m="weiter"],[data-m="vor"],[data-m="naechst"]');
    if (e.key === 'Enter' && zeile && !e.shiftKey && !e.isComposing && bg.contains(feld) && !feld.closest('table, [data-enter]') && !document.querySelector('.bp-vs')) {   // Enter = OK (Eingabezeilen in Tabellen und Felder mit data-enter haben ihr eigenes Enter)
      const ok = bg.querySelector(OKSEL) || (blaettern && bg.querySelector(XSEL));
      if (ok && /danger|rot/.test(ok.className)) return;   // Löschen u. Ä. nie per Enter
      if (ok) { e.preventDefault(); e.stopPropagation(); feld.dispatchEvent(new Event('change', { bubbles: true })); ok.click(); }
      return;
    }
    const vor = e.key === 'PageUp' || (e.key === 'ArrowLeft' && (!feld || e.altKey)) || (e.key === 'ArrowUp' && (!feld || zeile) && !!blaettern),
      nach = e.key === 'PageDown' || (e.key === 'ArrowRight' && (!feld || e.altKey)) || (e.key === 'ArrowDown' && (!feld || zeile) && !!blaettern);
    if (!vor && !nach) return;
    const b = bg.querySelector(vor ? '[data-m="prev"],[data-m="zurueck"],[data-m="vor"]' : '[data-m="next"],[data-m="weiter"],[data-m="naechst"]');
    if (b && !b.disabled) { e.preventDefault(); e.stopPropagation(); if (feld) feld.dispatchEvent(new Event('change', { bubbles: true })); b.click(); }
  };
  document.addEventListener('keydown', taste, true);
  new MutationObserver((m, o) => { if (!bg.isConnected) { document.removeEventListener('keydown', taste, true); o.disconnect(); } }).observe(document.body, { childList: true });
  document.body.appendChild(bg);
  dlgBeweglich(bg.querySelector('.modal'));
  /* Großes Textfeld (≥ 6 Zeilen) wächst mit dem Fenster mit – ohne eigenen Ziehpunkt */
  { const md = bg.querySelector('.modal'); let h0 = 0;
    const passen = () => { const ta = [...md.querySelectorAll('textarea')].filter((t) => (t.rows || 2) >= 6 && t.offsetParent).sort((a, b) => b.offsetHeight - a.offsetHeight)[0]; if (!ta) return;
      ta.style.resize = 'none'; if (!h0) h0 = ta.offsetHeight;
      const cs = getComputedStyle(md), last = [...md.children].filter((c) => c.offsetParent).pop(); if (!last) return;
      const frei = md.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth) - last.getBoundingClientRect().bottom - parseFloat(getComputedStyle(last).marginBottom || 0);
      const neu = Math.max(h0, ta.offsetHeight + frei); if (Math.abs(neu - ta.offsetHeight) > 2) ta.style.height = neu + 'px'; };
    try { new ResizeObserver(() => requestAnimationFrame(passen)).observe(md); } catch { /* alte Browser: wie bisher */ }
    new MutationObserver(() => requestAnimationFrame(passen)).observe(md, { childList: true, subtree: true }); }
  const f = bg.querySelector('input,select,button'); if (f) f.focus();
  return bg;
}
/* Rückgängig-Dock: gemeinsamer Baustein in /bp/undo.js (wird mit bp.js geladen) */
/* Dialoge an der Überschrift verschieben und an der Ecke rechts unten in der Größe ändern – je Dialog gemerkt (data-dlg, sonst der Titel).
   Ein Baustein für alle Fenster: modalBox, Dialoge der Kopfleiste (head.js), Versand (versand.js). */
function dlgBeweglich(m) {
  if (!m || m.dataset.beweglich) return; m.dataset.beweglich = '1';
  const kopf = () => m.querySelector('.bph-dh,.bph-dlg-h,.bph-pe-h,.bpv-k,h3,h2,.mh');   // Überschrift kann erst nach dem Öffnen gezeichnet werden
  const key = () => { if (m.dataset.dlg) return 'bp.dlg2.' + m.dataset.dlg; const k = kopf(); return k ? 'bp.dlg2.' + ((k.childNodes[0] && k.childNodes[0].textContent) || k.textContent || '').trim().slice(0, 40) : ''; };
  const lesen = () => { try { return (key() && JSON.parse(localStorage.getItem(key()) || 'null')) || {}; } catch { return {}; } };
  const setzen = (r) => {
    if (r.l != null) Object.assign(m.style, { position: 'fixed', margin: '0', left: Math.max(100 - (r.w || m.offsetWidth || 400), Math.min(innerWidth - 100, r.l)) + 'px', top: Math.max(0, Math.min(innerHeight - 40, r.t)) + 'px' });
    if (r.w) m.style.width = Math.min(innerWidth - 16, r.w) + 'px';
    if (r.h) { m.style.height = Math.min(innerHeight - 16, r.h) + 'px'; m.style.maxHeight = 'none'; }
  };
  const merken = (teil) => { if (!key()) return; try { localStorage.setItem(key(), JSON.stringify({ ...lesen(), ...teil })); } catch { /* egal */ } };
  const holen = () => { const r = lesen(); if (m.classList.contains('fest')) { delete r.w; delete r.h; } if (innerWidth > 700 && (r.l != null || r.w)) setzen(r); };   // .fest: feste Größe, nur verschiebbar
  if (kopf()) holen(); else setTimeout(holen, 0);
  m.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || innerWidth <= 700) return;
    const r = m.getBoundingClientRect();
    if (e.target === m && e.clientX > r.right - 20 && e.clientY > r.bottom - 20 && !m.classList.contains('fest')) {   // Ecke rechts unten: Größe ändern – nur dann wird die Größe gemerkt
      const up = () => { removeEventListener('pointerup', up); const n = m.getBoundingClientRect();
        if (Math.abs(n.width - r.width) > 2 || Math.abs(n.height - r.height) > 2) merken({ w: Math.round(n.width), h: Math.round(n.height) }); };
      addEventListener('pointerup', up); return;
    }
    // Anfassen: Überschrift oder der ganze obere Streifen des Dialogs (nicht auf Knöpfen/Feldern) – vorher musste man die Schrift genau treffen
    const k = kopf(), kr = k && k.getBoundingClientRect();
    const oben = e.clientY < Math.max(r.top + 34, kr ? kr.bottom + 4 : 0);
    if (!(k && k.contains(e.target)) && !oben) return;
    if (e.target.closest('button,input,select,textarea,a,label,[contenteditable],[data-m]')) return;
    const dx = e.clientX - r.left, dy = e.clientY - r.top; e.preventDefault();
    setzen({ l: r.left, t: r.top }); m.style.width = r.width + 'px';
    try { m.setPointerCapture(e.pointerId); } catch { /* egal */ }   // Bewegung geht nicht verloren, auch über PDF-Ansicht oder bei schnellem Ziehen
    document.body.style.userSelect = 'none';
    // über den Rand hinaus schieben: links/rechts/unten bis auf 100 px, oben bleibt die Überschrift greifbar
    const mv = (ev) => { m.style.left = Math.max(100 - r.width, Math.min(innerWidth - 100, ev.clientX - dx)) + 'px'; m.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + 'px'; };
    const up = () => { m.removeEventListener('pointermove', mv); m.removeEventListener('pointerup', up); m.removeEventListener('pointercancel', up); document.body.style.userSelect = '';
      const n = m.getBoundingClientRect(); merken({ l: Math.round(n.left), t: Math.round(n.top) }); };
    m.addEventListener('pointermove', mv); m.addEventListener('pointerup', up); m.addEventListener('pointercancel', up);
  });
}
/* wie modalBox, aber im Einstellungsfenster (⚙): gleicher Aufruf, „close“ schließt das Fenster */
function paneBox(host, html, onClick) {
  host.innerHTML = `<div class="modal pane">${html}</div>`;
  const close = () => { if (window.BPHead && BPHead.einstellungenSchliessen) BPHead.einstellungenSchliessen(); };
  host.onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) onClick(b.dataset.m, host, close, b); };
  return host;
}
const boxIn = (host) => (host ? (h, f) => paneBox(host, h, f) : modalBox);
/* Kopfleiste: gemeinsame Kopfleiste aller Apps (Bauportal / App · Projekt · KI · Benutzer), aus /bp/head.js */
function _loadHead() {
  if (window.BPHead) return Promise.resolve();
  if (!document.querySelector('link[href^="bp/head.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'bp/head.css' + BP_V; document.head.appendChild(l); }
  return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'bp/head.js' + BP_V; s.onload = ok; s.onerror = () => bad(new Error('Kopfleiste nicht geladen')); document.head.appendChild(s); });
}
async function header(current, me, conf, opt = {}) {
  BP_PROXIED = conf.proxied || null; BP_DOMAIN = conf.domain || '';
  await _loadHead();
  const key = { Startseite: 'portal', Papierkorb: 'papierkorb', Verwaltung: 'admin', Adressen: 'adressen', Baukosten: 'baukosten', 'Aufgaben & Mängel': 'aufgaben', 'Mängel & Erinnerungen': 'aufgaben', 'Pläne & Dateien': 'plaene', 'Ausschreibung & Abrechnung': 'ava', Kommunikation: 'kommunikation', Baudaten: 'baudaten', Zeiten: 'zeiten', Bauantrag: 'bauantrag', Wärmeschutz: 'waermeschutz', Wiki: 'wiki', Honorar: 'honorar', Gebäudemodell: 'gebaeudemodell', Planung: 'gebaeudemodell' }[current] || '';
  await BPHead.mount({ app: key, name: current, me, sticky: true, project: opt.project });
}

/* Projektauswahl: nur oben in der Kopfleiste (gemeinsam für alle Apps). */
function projektKnopf(sel) {   // die App-eigene <select> bleibt unsichtbar die Quelle; gewählt wird nur oben in der Kopfleiste
  if (!sel || !window.BPHead || !BPHead.beiProjektWahl) return;
  sel.hidden = true; sel.style.display = 'none';
  const vor = sel.previousElementSibling; if (vor && vor.classList.contains('pjk')) vor.remove();
  BPHead.beiProjektWahl((id, p) => {
    if (![...sel.options].some((o) => +o.value === id)) { const o = document.createElement('option'); o.value = id; o.textContent = (p && p.name) || 'Projekt ' + id; sel.appendChild(o); }
    sel.value = String(id); sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/* Auswahlknopf + aufklappende Liste (wie die Projektauswahl im Bauzeitenplan).
   pickButton(el, {title, sub}) zeichnet den Knopf; pickMenu(anchor, opt) öffnet die Liste:
   opt.items: [{group, title, sub, value, on, extra}], opt.onPick(value, item), opt.search (Platzhalter), opt.footer (HTML), opt.onFooter(e, close) */
const PICK_CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
function pickButton(el, o) { el.classList.add('pick'); el.setAttribute('aria-haspopup', 'listbox'); el.innerHTML = `<span class="pk-t"><b>${esc(o.title || '')}</b><small>${esc(o.sub || '') || '&nbsp;'}</small></span>${PICK_CHEV}`; }
/* Rechnen in Zahlenfeldern (überall): „20*20*7“, „12,5 × 2 + 3“, „(4,5-0,24)*2,75“ → Ergebnis. bpRechne(text) → Zahl oder null.
   Felder mit inputmode="decimal" oder data-rechnen (aus: data-nicht-rechnen) rechnen beim Verlassen bzw. Enter selbst: der Wert wird ersetzt, die Rechnung steht im Tooltip. */
function bpRechne(s) {
  let t = String(s == null ? '' : s).trim(); if (!t) return null;
  t = t.replace(/[×·xX]/g, '*').replace(/÷|:/g, '/').replace(/[–−]/g, '-').replace(/(\d)\.(?=\d{3}(\D|$))/g, '$1').replace(/,/g, '.').replace(/\s+/g, '');
  if (!/^[\d.+\-*/()]+$/.test(t) || !/\d/.test(t)) return null;
  try { const v = Function('"use strict";return (' + t + ')')(); return typeof v === 'number' && isFinite(v) ? Math.round(v * 10000) / 10000 : null; } catch { return null; }
}
document.addEventListener('change', (e) => {
  const f = e.target; if (!f || f.tagName !== 'INPUT' || !(f.inputMode === 'decimal' || f.hasAttribute('data-rechnen')) || f.hasAttribute('data-nicht-rechnen')) return;
  const roh = f.value; if (!/\d\s*[-+*/×x÷]\s*[\d(]|\)/.test(roh) || /\d:\d\d/.test(roh)) return;   // nur echte Rechnungen – keine einzelne (negative) Zahl, keine Uhrzeit
  const v = bpRechne(roh); if (v == null) return;
  f.value = String(v).replace('.', ','); f.title = '= ' + roh;
  f.dispatchEvent(new Event('input', { bubbles: true }));   // Apps, die beim Tippen rechnen, sehen das Ergebnis vor dem Speichern
}, true);

function pickMenu(anchor, opt) {
  const old = document.querySelector('.pickm'); if (old) { old.remove(); anchor.setAttribute('aria-expanded', 'false'); return; }
  const m = document.createElement('div'); m.className = 'pickm'; m.setAttribute('role', 'listbox');
  m.innerHTML = (opt.search ? `<div class="pm-q"><input type="search" placeholder="${esc(opt.search)}" autocomplete="off" aria-label="Suchen"></div>` : '') + '<div class="pm-l"></div>' + (opt.footer ? `<div class="pm-f">${opt.footer}</div>` : '');
  document.body.appendChild(m); anchor.setAttribute('aria-expanded', 'true');
  const place = () => {   // immer ganz lesbar: unten, wenn Platz ist, sonst über dem Knopf – höchstens so hoch wie der Platz dort
    const r = anchor.getBoundingClientRect(); m.style.maxHeight = ''; m.style.bottom = ''; m.style.top = '0px';
    const h = m.offsetHeight, unten = innerHeight - r.bottom - 14, oben = r.top - 14;
    if (h <= unten || unten >= oben) { m.style.top = (r.bottom + 6) + 'px'; if (h > unten) m.style.maxHeight = Math.max(120, unten) + 'px'; }
    else { m.style.top = ''; m.style.bottom = (innerHeight - r.top + 6) + 'px'; if (h > oben) m.style.maxHeight = Math.max(120, oben) + 'px'; }
    m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px'; };
  let act = -1, shown = [];
  const close = () => { m.remove(); anchor.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', off, true); removeEventListener('resize', place); };
  const off = (e) => { if (!m.contains(e.target) && !anchor.contains(e.target)) close(); };
  const draw = () => {
    const q = (m.querySelector('.pm-q input')?.value || '').trim().toLowerCase();
    shown = opt.items.filter((x) => !q || passt([x.title, x.sub, x.find, x.group].join(' '), q));   // jedes Wort muss vorkommen (wie überall)
    let g = null; const L = m.querySelector('.pm-l');
    L.innerHTML = shown.map((x, i) => { const h = x.group && x.group !== g ? `<div class="pm-g">${esc(x.group)}</div>` : ''; g = x.group;
      return h + `<div class="pm-o${x.on ? ' on' : ''}${i === act ? ' act' : ''}" data-i="${i}" role="option" aria-selected="${!!x.on}"><span><b>${esc(x.title)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span>${x.extra ? `<span class="pm-x">${x.extra}</span>` : ''}</div>`; }).join('')
      || `<div class="pm-e">${esc(opt.empty || 'Nichts gefunden.')}</div>`;
    const a = L.querySelector('.act'); if (a) a.scrollIntoView({ block: 'nearest' });
  };
  draw(); place(); addEventListener('resize', place);
  setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  const inp = m.querySelector('.pm-q input'); if (inp) { inp.focus(); inp.addEventListener('input', () => { act = -1; draw(); }); }
  m.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); anchor.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(shown.length - 1, act + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); draw(); }
    else if (e.key === 'Enter' && shown[Math.max(0, act)]) { e.preventDefault(); const x = shown[Math.max(0, act)]; close(); opt.onPick(x.value, x, e); }
  });
  m.addEventListener('click', (e) => {
    const f = e.target.closest('.pm-f'); if (f && opt.onFooter) { opt.onFooter(e, close); return; }
    if (e.target.closest('.pm-x a')) { close(); return; }
    const b = e.target.closest('[data-i]'); if (!b) return; const x = shown[+b.dataset.i]; close(); opt.onPick(x.value, x, e);
  });
  return { close };
}

/* Tabellen: Textspalten nur so breit wie ihr üblicher (durchschnittlicher) Inhalt – Längeres endet mit „…“, der ganze Text steht im Tooltip.
   Greift von selbst in Listen-Tabellen (mit Kopfzeile, ab 5 Zeilen), auch nach dem Neuzeichnen; abschalten je Tabelle mit data-volle.
   Zellen mit Eingabefeldern bleiben, wie sie sind. Der Inhalt kommt in ein <span class="sp-in"> – nur so hält Chrome die Breite ein. */
function spaltenSchnitt(t) {
  const B = t.tBodies[0]; if (!B || !t.tHead || t.hasAttribute('data-volle') || t.closest('.modal,.modal-bg,.bph-dlg-bg,[data-volle]')) return;
  const R = [...B.rows].filter((r) => r.cells.length > 1 && !r.classList.contains('lang')); if (R.length < 5) return;
  const n = Math.max(...R.map((r) => r.cells.length)), S = R.length > 400 ? R.filter((_, i) => i % Math.ceil(R.length / 400) === 0) : R;
  const frei = (c) => c && c.colSpan === 1 && !c.querySelector('input,select,textarea,canvas,svg,img,table,button');
  const txt = (c) => c.textContent.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < n; i++) {
    const L = S.map((r) => r.cells[i]).filter(frei).map((c) => txt(c).length).filter((x) => x > 0);
    if (L.length < 5) continue;
    const avg = L.reduce((a, x) => a + x, 0) / L.length, max = Math.max(...L);
    if (avg < 12 || max < avg * 1.35) continue;
    const w = Math.max(14, Math.ceil(avg * 1.15)) + 'ch';
    R.forEach((r) => { const c = r.cells[i]; if (!frei(c)) return;
      let s = c.firstElementChild && c.firstElementChild.classList.contains('sp-in') && c.childNodes.length === 1 ? c.firstElementChild : null;
      if (!s) { s = document.createElement('span'); s.className = 'sp-in'; while (c.firstChild) s.appendChild(c.firstChild); c.appendChild(s); }
      if (s.style.maxWidth !== w) s.style.maxWidth = w;
      if (!c.title) { const x = txt(c); if (x.length > avg * 1.15) c.title = x; } });
  }
}
/* Fortschritt in Prozent – Stufen 0 · 25 · 50 · 75 · 100 und darunter ein Schieber (5er-Schritte), wie der Arbeitsfortschritt im Bautagebuch.
   bpProzent(wert, 'data-x') → HTML. Die App hört auf Klicks an [data-x] (Stufe, Wert in data-p) und auf „change“ am Schieber (value);
   „input“ am Schieber zeigt den Wert schon beim Ziehen an. */
const bpPzFarbe = (w) => (w >= 100 ? '#2e7d32' : w >= 75 ? '#7cb342' : w >= 50 ? '#e0a800' : w >= 25 ? '#e5533d' : '#b71c1c');   // 0 sehr rot · 25 rot · 50 gelb · 75 hellgrün · 100 grün
/* Farbe nach dem Abstand zum Terminplan statt nach der Prozentzahl (besprochen 13.11.2026): Rückstand in Arbeitstagen im Verhältnis zur
   Dauer des Vorgangs – ein 14-Tage-Einsatz ist am 3. Tag nicht rot, nur weil er erst halb fertig ist. Rot erst ab der Schwelle der
   Terminrüge (Vorgabe 5 AT) bzw. der halben Dauer, je nachdem, was größer ist. plan: {ist, soll, dauer, verzug, schwelle} (verzug zum Wert ist) */
function bpPlanFarbe(w, plan) {
  if (!plan || !plan.dauer) return bpPzFarbe(w);
  if (w >= 100) return '#2e7d32';
  const v = Math.max(0, (+plan.verzug || 0) - (w - (+plan.ist || 0)) / 100 * plan.dauer), r = v / Math.max(+plan.schwelle || 5, plan.dauer * 0.5);
  return v <= 0.05 ? '#2e7d32' : r < 0.25 ? '#7cb342' : r < 0.6 ? '#e0a800' : r < 1 ? '#e5833d' : '#b71c1c';
}
/* Ist gegenüber Soll – ein Balken für alle (besprochen 13.11.2026: Aufmaß gegen LV-Menge, Arbeitsfortschritt gegen Terminplan).
   Mitte = Soll, Strich = Ist; der Verlauf liegt immer ganz da. bpBalken({ wert: 0…100 (50 = Soll), stufen: [[pos, [r,g,b]], …], schwelle: pos (Strich),
   gross, tip, text, textFarbe }) → HTML. bpVerlauf(stufen) und bpVerlaufFarbe(stufen, pos) liefern Verlauf und Farbe an einer Stelle. */
const bpVerlauf = (S) => `linear-gradient(90deg,${S.map(([p, c]) => `rgb(${c.join(',')}) ${p}%`).join(',')})`;
function bpVerlaufFarbe(S, pos) {
  const p = Math.min(100, Math.max(0, pos));
  for (let i = 1; i < S.length; i++) if (p <= S[i][0]) { const [a, ca] = S[i - 1], [b, cb] = S[i], t = b > a ? (p - a) / (b - a) : 1; return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(',')})`; }
  return `rgb(${S[S.length - 1][1].join(',')})`;
}
function bpBalken(o) {
  const w = Math.max(0.5, Math.min(99.5, +o.wert || 0)), f = bpVerlaufFarbe(o.stufen, w);
  return `<span class="bp-bal${o.gross ? ' gr' : ''}"${o.tip ? ` title="${String(o.tip).replace(/"/g, '&quot;')}"` : ''}><span class="tr" style="background:${bpVerlauf(o.stufen)}"><s class="m"></s>${o.schwelle != null ? `<s class="r" style="left:${o.schwelle}%"></s>` : ''}<s class="w${o.ueber ? ' ueber' : ''}" style="left:${w}%"></s></span>${o.text ? `<b style="color:${o.textFarbe || f}">${o.text}</b>` : ''}</span>`;
}
/* Arbeitsfortschritt gegen Terminplan: links hinterher (rot am Rand = Schwelle der Terminrüge bzw. halbe Dauer), Mitte im Plan, rechts voraus */
const BP_PLAN_STUFEN = [[0, [217, 48, 37]], [20, [240, 138, 60]], [38, [246, 194, 122]], [48, [58, 167, 109]], [100, [58, 167, 109]]];
function bpPlanBalken(w, plan, gross) {
  if (!plan || !plan.dauer) return '';
  const v = Math.max(0, (+plan.verzug || 0) - (w - (+plan.ist || 0)) / 100 * plan.dauer), skala = Math.max(+plan.schwelle || 5, plan.dauer * 0.5);
  const voraus = Math.max(0, (w - (+plan.soll || 0)) / 100 * plan.dauer), pos = v > 0.05 ? 50 - Math.min(50, v / skala * 50) : 50 + Math.min(50, voraus / skala * 50);
  const at = (x) => (Math.round(x * 2) / 2).toLocaleString('de-DE');
  return bpBalken({ wert: pos, stufen: BP_PLAN_STUFEN, gross, tip: `gemeldet ${w} % · laut Plan ${plan.soll} %`, text: gross ? (v > 0.05 ? `≈ ${at(v)} AT hinterher` : voraus > 0.25 ? `≈ ${at(voraus)} AT voraus` : 'im Plan') : '' });
}
/* Wert in % oder € – ein Feld mit Umschalter (15.11.2026: in der ganzen Oberfläche so, wie die Umlagen bei den Abzügen).
   bpPzEur({ pct, eur, typ, attr, art, w, dis }) → HTML. attr: Attribute des Felds (zum Speichern), art: Kennung für die App (data-pzart).
   Das Feld trägt data-pe="pct|eur" (welcher Wert gilt). Umschalten: der Wert wandert mit – am Feld kommt das Ereignis „bp-pzeur“
   mit detail { typ, wert, art } (wert 0: nur umgeschaltet, nichts zu speichern). Sind % und € gesetzt (ältere Daten), steht der Betrag dahinter. */
function bpPzEur(o) {
  const t = o.typ || (o.eur && !o.pct ? 'eur' : 'pct'), v = t === 'eur' ? o.eur : o.pct, d = o.dis ? ' disabled' : '', z = (x) => bpZahl(+x, 0, 2);
  return `<span class="bp-pzeur" data-pzart="${esc(o.art || '')}"><input class="n" ${o.attr || ''} data-pe="${t}" value="${v ? z(v) : ''}" placeholder="0" style="width:${o.w || 4.6}rem" inputmode="decimal"${d} title="${t === 'eur' ? 'fester Betrag' : 'Prozent'}">`
    + `<span class="seg sm"><button type="button" class="${t === 'pct' ? 'on' : ''}" data-pet="pct"${d}>%</button><button type="button" class="${t === 'eur' ? 'on' : ''}" data-pet="eur"${d}>€</button></span>`
    + `${t === 'pct' && o.eur ? `<span class="hint">+ ${z(o.eur)} €</span>` : ''}</span>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('.bp-pzeur [data-pet]'); if (!b) return;
  const w = b.closest('.bp-pzeur'), i = w.querySelector('input'), neu = b.dataset.pet; if (i.dataset.pe === neu) return;
  const v = parseFloat(String(i.value || '').replace(/\./g, '').replace(',', '.')) || 0;
  i.dataset.pe = neu; i.title = neu === 'eur' ? 'fester Betrag' : 'Prozent'; w.querySelectorAll('[data-pet]').forEach((x) => x.classList.toggle('on', x === b));
  if (!v) i.focus();
  i.dispatchEvent(new CustomEvent('bp-pzeur', { bubbles: true, detail: { typ: neu, wert: v, art: w.dataset.pzart } }));
});
const _pzPlan = (z) => { try { return z && z.dataset.plan ? JSON.parse(z.dataset.plan) : null; } catch { return null; } };
function bpProzent(wert, attr = 'data-pz', plan = null) {
  const w = Math.max(0, Math.min(100, Math.round(+wert || 0)));
  return `<div class="bp-pz" style="--pz:${bpPlanFarbe(w, plan)}"${plan ? ` data-plan='${JSON.stringify(plan).replace(/'/g, '&#39;')}'` : ''}><span class="bp-pz-s" role="group" aria-label="Fortschritt">${[0, 25, 50, 75, 100].map((p) => `<button type="button" ${attr} data-p="${p}"${w === p ? ' class="on"' : ''} title="${p} % fertig">${p}</button>`).join('')}</span>`
    + `<span class="bp-pz-r"><input type="range" min="0" max="100" step="5" value="${w}" ${attr} aria-label="Fortschritt in Prozent"><output>${w} %</output></span></div>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.bp-pz-s button'); if (b) { const z = b.closest('.bp-pz'); z.style.setProperty('--pz', bpPlanFarbe(+b.dataset.p, _pzPlan(z))); } }, true);
document.addEventListener('input', (e) => { const r = e.target.closest && e.target.closest('.bp-pz input[type=range]'); if (!r) return; const o = r.nextElementSibling; if (o) o.textContent = r.value + ' %';
  const z = r.closest('.bp-pz'); z.style.setProperty('--pz', bpPlanFarbe(+r.value, _pzPlan(z))); z.querySelectorAll('.bp-pz-s button').forEach((b) => b.classList.toggle('on', +b.dataset.p === +r.value)); });
(() => {
  const st = document.createElement('style'); st.textContent = 'table[style*="table-layout: fixed"] .sp-in{max-width:100%!important}.sp-in{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-in>small,.sp-in>.mute,.sp-in>.hint{display:block;overflow:hidden;text-overflow:ellipsis}'; document.head.appendChild(st);
  const alle = () => document.querySelectorAll('table').forEach((x) => { try { spaltenSchnitt(x); } catch { /* egal */ } });
  /* gleich beim Neuzeichnen, noch vor dem Malen (MutationObserver läuft vor dem nächsten Bild) – sonst sieht man die Tabelle erst
     mit vollen Spalten und dann geschnitten: alles darin springt („flackert“) bei jedem Klick */
  const mo = new MutationObserver((M) => { if (M.every((m) => m.target.classList && m.target.classList.contains('sp-in') || [...m.addedNodes].every((x) => x.classList && x.classList.contains('sp-in')))) return;
    const T = new Set();
    M.forEach((m) => { const z = m.target.closest && m.target.closest('table'); if (z) T.add(z); m.addedNodes.forEach((x) => { if (x.nodeType !== 1) return; if (x.tagName === 'TABLE') T.add(x); else x.querySelectorAll('table').forEach((y) => T.add(y)); }); });
    T.forEach((x) => { if (x.isConnected) try { spaltenSchnitt(x); } catch { /* egal */ } }); });
  const los = () => { alle(); mo.observe(document.body, { childList: true, subtree: true }); };
  if (document.body) los(); else document.addEventListener('DOMContentLoaded', los);
})();
/* iPhone/iPad: Die Dateiauswahl zeigt nur Dateien, deren Art iOS selbst kennt – .ifc, GAEB (.x83 …), .gantt, .ava, .mdb bleiben sonst grau
   und lassen sich nicht wählen. Enthält der Filter einer Auswahl so eine Endung, fällt er dort beim Öffnen weg; die App prüft die gewählte Datei ohnehin. */
(() => {
  if (!(/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))) return;
  const KENNT = /^(\.(pdf|jpe?g|png|gif|webp|heic|heif|tiff?|docx?|xlsx?|xlsm|csv|txt|json|xml|zip)|[a-z]+\/[\w.+*-]+)$/i;
  const frei = (el) => { if (el && el.type === 'file' && el.accept && !el.accept.split(',').every((x) => KENNT.test(x.trim()))) el.removeAttribute('accept'); };
  document.addEventListener('click', (e) => { if (!e.target.closest) return; const l = e.target.closest('label'); frei(e.target.closest('input[type=file]') || (l && l.control)); }, true);
  const klick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () { frei(this); return klick.call(this); };
  window.bpDateiFrei = frei;
})();
/* Fenster stapeln (17.11.2026): was zuletzt aufgeht, liegt oben – ein Dialog aus dem Ansehen-Fenster (z. B. „Im Projektordner ablegen“,
   „Per Mail senden“) blieb sonst hinter dem PDF, ein PDF aus einem Dialog liegt weiter darüber. Gilt für alle Fenster am <body>;
   Auswahllisten, Kalender und Hinweise liegen ohnehin darüber. */
(() => {
  const FENSTER = '.modal-bg,.bph-dlg-bg,.bpv-bg,.bph-gv,.bpu-pad';
  const oben = (n) => {
    let z = 0;
    for (const x of document.body.children) if (x !== n && x.matches(FENSTER)) z = Math.max(z, +getComputedStyle(x).zIndex || 0);
    if (z >= (+getComputedStyle(n).zIndex || 0)) n.style.zIndex = z + 1;
  };
  const los = () => new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.matches(FENSTER)) oben(n); })))
    .observe(document.body, { childList: true });
  if (document.body) los(); else addEventListener('DOMContentLoaded', los);
})();
