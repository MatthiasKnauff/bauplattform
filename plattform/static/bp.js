'use strict';
/* Bauplattform – kleine gemeinsame Hilfen für Startseite und Verwaltung */
const $ = (s, el = document) => el.querySelector(s);
/* Suchen ohne Ärger mit Umlauten: „pü“, „pue“ und „Pürzer“ (auch aus anderen Programmen mit zerlegten Umlauten) passen zusammen */
const fold = (s) => String(s ?? '').normalize('NFC').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const passt = (text, q) => { const t = fold(text); return fold(q).split(/\s+/).filter(Boolean).every((w) => t.includes(w)); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Adresse einer App: über den Reverse Proxy aufgerufen → eingetragene Adresse; direkt über IP/Rechnername und Port
// (ohne Nginx) → gleicher Rechner, Port der App (die Anmeldung gilt je Rechnername).
let BP_PROXIED = null, BP_DOMAIN = '';
const appUrl = (a) => {
  const direct = `${location.protocol}//${location.hostname}:${a.port}`, h = location.hostname;
  if (!a.url) return direct;
  const viaProxy = !BP_PROXIED || BP_PROXIED.includes(h) || (BP_DOMAIN && (h === BP_DOMAIN || h.endsWith('.' + BP_DOMAIN)));
  return viaProxy ? a.url : direct;
};
async function api(u, m = 'GET', d) {
  const r = await fetch(u, { method: m, headers: d ? { 'Content-Type': 'application/json' } : {}, body: d ? JSON.stringify(d) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && j.login) { location.href = j.login; throw new Error('Nicht angemeldet'); }
  if (!r.ok) { const e = new Error(j.error || r.statusText); e.data = j; throw e; }
  return j;
}
function toast(msg, bad = false) {
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
try { _theme = localStorage.getItem('bpTheme') || 'dunkel'; applyAccent(localStorage.getItem('accent')); } catch { applyAccent(); }
if (_mq && _mq.addEventListener) _mq.addEventListener('change', () => { if (_theme === 'auto') _paint(); });
function modalBox(html, onClick) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); const b = e.target.closest('[data-m]'); if (b) onClick(b.dataset.m, bg, close, b); });
  bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.body.appendChild(bg);
  const f = bg.querySelector('input,select,button'); if (f) f.focus();
  return bg;
}
/* wie modalBox, aber im Einstellungsfenster (⚙ → Diese App): gleicher Aufruf, „close“ schließt das Fenster */
function paneBox(host, html, onClick) {
  host.innerHTML = `<div class="modal pane">${html}</div>`;
  const close = () => { if (window.BPHead && BPHead.einstellungenSchliessen) BPHead.einstellungenSchliessen(); };
  host.onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) onClick(b.dataset.m, host, close, b); };
  return host;
}
const boxIn = (host) => (host ? (h, f) => paneBox(host, h, f) : modalBox);
const ICONS = {
  bautagebuch: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7M9 16h5"/></svg>',
  gantt: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M7 13h6M10 17h7"/></svg>',
  adressen: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="15" height="18" rx="2"/><path d="M19 7h2M19 12h2M19 17h2"/><circle cx="11.5" cy="10" r="2.5"/><path d="M7.5 17a4 4 0 0 1 8 0"/></svg>',
  plaene: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h11l5 5v11H4z"/><path d="M15 4v5h5"/><path d="M8 13h8M8 17h5"/><path d="M7 9h4"/></svg>',
  kommunikation: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M19 9h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v2l-3-2h-4"/><path d="M6 9h7M6 12h4"/></svg>',
  ava: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M8 10h8M8 13h8M8 16h5"/><path d="M14.5 17.5l1.5 1.5 3-3"/></svg>',
  aufgaben: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  baukosten: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M8 18h6"/></svg>',
  admin: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/></svg>',
  portal: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
};
/* Kopfleiste: gemeinsame Kopfleiste aller Apps (Bauportal / App · Projekt · KI · Benutzer), aus /bp/head.js */
function _loadHead() {
  if (window.BPHead) return Promise.resolve();
  if (!document.querySelector('link[href="bp/head.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'bp/head.css'; document.head.appendChild(l); }
  return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'bp/head.js'; s.onload = ok; s.onerror = () => bad(new Error('Kopfleiste nicht geladen')); document.head.appendChild(s); });
}
async function header(current, me, conf, opt = {}) {
  BP_PROXIED = conf.proxied || null; BP_DOMAIN = conf.domain || '';
  await _loadHead();
  const key = { Startseite: 'portal', Papierkorb: 'papierkorb', Verwaltung: 'admin', Adressen: 'adressen', Baukosten: 'baukosten', 'Aufgaben & Mängel': 'aufgaben', 'Mängel & Erinnerungen': 'aufgaben', 'Planstand & Versand': 'plaene', 'Ausschreibung & Abrechnung': 'ava', Kommunikation: 'kommunikation' }[current] || '';
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
function pickMenu(anchor, opt) {
  const old = document.querySelector('.pickm'); if (old) { old.remove(); anchor.setAttribute('aria-expanded', 'false'); return; }
  const m = document.createElement('div'); m.className = 'pickm'; m.setAttribute('role', 'listbox');
  m.innerHTML = (opt.search ? `<div class="pm-q"><input type="search" placeholder="${esc(opt.search)}" autocomplete="off" aria-label="Suchen"></div>` : '') + '<div class="pm-l"></div>' + (opt.footer ? `<div class="pm-f">${opt.footer}</div>` : '');
  document.body.appendChild(m); anchor.setAttribute('aria-expanded', 'true');
  const place = () => { const r = anchor.getBoundingClientRect(); m.style.top = Math.min(r.bottom + 6, innerHeight - 120) + 'px'; m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px'; };
  let act = -1, shown = [];
  const close = () => { m.remove(); anchor.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', off, true); removeEventListener('resize', place); };
  const off = (e) => { if (!m.contains(e.target) && !anchor.contains(e.target)) close(); };
  const draw = () => {
    const q = (m.querySelector('.pm-q input')?.value || '').trim().toLowerCase();
    shown = opt.items.filter((x) => !q || [x.title, x.sub, x.find].join(' ').toLowerCase().includes(q));
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
