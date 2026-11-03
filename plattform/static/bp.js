'use strict';
/* Bauplattform – kleine gemeinsame Hilfen für Startseite und Verwaltung */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const appUrl = (a) => a.url || `${location.protocol}//${location.hostname}:${a.port}`;
async function api(u, m = 'GET', d) {
  const r = await fetch(u, { method: m, headers: d ? { 'Content-Type': 'application/json' } : {}, body: d ? JSON.stringify(d) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && j.login) { location.href = j.login; throw new Error('Nicht angemeldet'); }
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
function toast(msg, bad = false) {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  while (box.children.length >= 2) box.firstChild.remove();
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.setAttribute('role', 'status'); t.textContent = msg; box.appendChild(t);
  setTimeout(() => t.remove(), bad ? 6000 : 3500);
}
function applyAccent(c) {   // persönliche Farbe aus dem Bautagebuch
  c = /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#ff5fb3';
  const n = parseInt(c.slice(1), 16), lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  document.documentElement.style.setProperty('--y', c); document.documentElement.style.setProperty('--on', lum > 0.55 ? '#111' : '#fff');
  try { localStorage.setItem('accent', c); } catch { /* egal */ }
}
try { applyAccent(localStorage.getItem('accent')); } catch { applyAccent(); }
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
const ICONS = {
  bautagebuch: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7M9 16h5"/></svg>',
  gantt: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M7 13h6M10 17h7"/></svg>',
  admin: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/></svg>',
  portal: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
};
/* Kopfleiste mit Logo/Büroname und Benutzermenü (Startseite, Verwaltung) */
async function header(current, me, conf) {
  const brand = await fetch('/api/brand').then((r) => r.json()).catch(() => ({}));
  const portal = conf.apps.find((a) => a.key === 'portal');
  const logo = '/logo.png';
  const h = document.createElement('header'); h.className = 'hdr';
  h.innerHTML = `<a class="brand" href="${esc(portal ? appUrl(portal) + '/' : '/')}"><img alt="" src="${esc(logo)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'mk',innerHTML:ICONS.portal}))">
      <span><b>${esc(brand.office || 'Bauplattform')}</b><small>${esc(current)}</small></span></a><span class="fill"></span>
      <button class="who" id="whoBtn" aria-haspopup="menu"><span class="av">${esc((me.name || '?').slice(0, 1).toUpperCase())}</span><span class="nm">${esc(me.name)}</span></button>`;
  document.body.prepend(h);
  $('#whoBtn').onclick = (e) => {
    e.stopPropagation(); let m = $('#uMenu'); if (m) { m.remove(); return; }
    m = document.createElement('div'); m.className = 'menu'; m.id = 'uMenu';
    m.innerHTML = `<div class="info">Angemeldet als <b style="color:var(--ink)">${esc(me.name)}</b></div>`
      + conf.apps.filter((a) => a.allowed).map((a) => `<a href="${esc(appUrl(a))}/">${ICONS[a.key] ? ICONS[a.key].replace(/width="30" height="30"/, 'width="18" height="18"') : ''}${esc(a.name)}</a>`).join('')
      + '<div class="sep"></div><button data-out>Abmelden</button>';
    m.querySelector('[data-out]').onclick = async () => {
      const r = await fetch('/api/logout', { method: 'POST' }).then((x) => x.json()).catch(() => ({}));
      location.href = r.login || '/login';
    };
    h.appendChild(m);
  };
  document.addEventListener('click', (e) => { const m = $('#uMenu'); if (m && !m.contains(e.target)) m.remove(); });
}
