/* Rückgängig – gemeinsamer Baustein für alle Apps (Plattform, Bauzeitenplan, Bautagebuch), ausgeliefert als /bp/undo.js.
   Braucht nichts außer sich selbst; Meldungen über window.toast der App, sonst still. */
const _uEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _uToast = (m, bad) => { if (typeof window.toast === 'function') window.toast(m, bad); };
/* Rückgängig mit Verlauf: rueckgaengig('„X“ erledigt', async () => {…}) merkt bis zu 50 Schritte je geöffneter Seite.
   Am Rechner fest oben links: Zurück · Wieder · ▾ Verlauf (bis zu einem Schritt zurück) – erste Gruppe der Befehlsleiste, sonst schmale Zeile
   unter der Kopfleiste. Am Handy: kurze Leiste unten, danach ↶ n in der Kopfleiste. Strg+Z außerhalb von Eingabefeldern nimmt den neuesten Schritt zurück
   (Seiten mit eigenem Strg+Z setzen window.BP_UNDO_EIGEN). Neu laden der Seite: Verlauf weg – Gelöschtes liegt im Papierkorb. */
const UNDO = { s: [], r: [], t: 0, offen: false, busy: false, el: null };   // s: Schritte zurück · r: Schritte zum Wiederholen
const UNDO_MAX = 50;
function _undoAlter(t) { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'gerade' : m < 60 ? `${m} Min.` : `${Math.round(m / 60)} Std.`; }
function _undoIc(u) { const t = (u.text || '').toLowerCase();   // Symbol je Art des Schritts
  return u.ic || (/gelöscht|papierkorb|entfernt|verworfen/.test(t) ? '🗑' : /eingefügt|angelegt|hinzugef|neu |übernommen|eingesetzt/.test(t) ? '＋' : /verschoben|eingerückt|ausgerückt|umsortiert/.test(t) ? '⇥' : /archiv|ausgeblendet/.test(t) ? '▣' : '✎'); }
// Wiederholen: Seiten mit eigenem Verlauf (AVA, Druck-Layouts) melden sich über window.bpRedo = { kann(), los() }; sonst Schritte mit u.wieder
const _redoKann = () => (window.bpRedo && window.bpRedo.kann ? window.bpRedo.kann() : UNDO.r.length > 0);
/* Am Rechner (beschlossen am 15.11.2026): kein schwebendes Dock mehr. Rückgängig und Wiederholen stehen fest oben links – in Apps mit
   Befehlsleiste als erste Gruppe (befehle.js holt den Inhalt über bpUndoGruppe()), sonst als schmale Zeile unter der Kopfleiste (.bp-undo-zeile).
   Der Verlauf klappt unter dem Knopf „▾ n“ auf. Seiten mit eigenem Stapel (Bauzeitenplan, Baukosten) melden ihn über
   window.bpUndoEigen = { n(), los(), text?(), t?() } – dieselben zwei Knöpfe bedienen dann auch ihn (der jüngere Schritt zuerst). */
const _UI = { z: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>', v: '<path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3"/>' };
const _eigen = () => { try { const e = window.bpUndoEigen; return e && e.n && e.n() > 0 ? e : null; } catch { return null; } };
const _undoN = () => UNDO.s.length + (_eigen() ? _eigen().n() : 0);
const _eigenZuerst = () => { const e = _eigen(), top = UNDO.s[UNDO.s.length - 1]; return !!e && (!top || !e.t || e.t() >= top.t); };
const _undoText = () => { const top = UNDO.s[UNDO.s.length - 1], e = _eigen(); return _eigenZuerst() ? (e.text && e.text()) || 'letzte Änderung' : top ? top.text : ''; };
function bpUndoGruppe() {   // Inhalt der Gruppe „Rückgängig“ (Knöpfe wie in der Befehlsleiste)
  const n = _undoN(), rk = _redoKann(), t = _undoText(), k = (u, ic, text, aus, tip, mehr = '') => `<button type="button" class="bf-k" data-u="${u}"${aus ? ' disabled' : ''} title="${_uEsc(tip)}"${mehr}>${ic}<span class="bf-t">${text}</span></button>`;
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  return k('eins', svg(_UI.z), 'Zurück', !n, n ? `Rückgängig: ${t} (Strg+Z)` : 'Nichts rückgängig zu machen') + k('redo', svg(_UI.v), 'Wieder', !rk, rk ? 'Wiederholen (Strg+Y)' : 'Nichts zu wiederholen')
    + k('liste', '<span class="bf-z" aria-hidden="true">▾</span>', String(n), UNDO.s.length < 2, UNDO.s.length < 2 ? 'Verlauf – ab zwei Schritten' : `Verlauf: ${UNDO.s.length} Schritte – bis zu einem Schritt zurück`, ` aria-expanded="${!!UNDO.offen}" aria-haspopup="true"`);
}
function _undoOben() {   // Gruppe in jeder sichtbaren Befehlsleiste füllen; gibt es keine, die schmale Zeile unter der Kopfleiste
  const H = [...document.querySelectorAll('.bf-undo .bf-ks')].filter((x) => x.offsetParent), kopf = document.querySelector('.bph');
  H.forEach((x) => { x.innerHTML = bpUndoGruppe(); });
  let z = document.querySelector('.bp-undo-zeile');
  if (H.length || !kopf || _handy() || window.BP_UNDO_OHNE || !UNDO.bereit) { if (z) z.remove(); return; }
  if (!z) { z = document.createElement('div'); z.className = 'bp-undo-zeile'; z.setAttribute('role', 'toolbar'); z.setAttribute('aria-label', 'Rückgängig'); kopf.after(z); }
  const t = _undoText(); z.innerHTML = bpUndoGruppe() + `<span class="bp-undo-zt">${t ? 'zuletzt: ' + _uEsc(t) : ''}</span>`;
}
/* Die Zeile erst setzen, wenn die App steht (ihre Befehlsleiste kommt oft erst mit den Daten) – sonst erschiene sie kurz und verschwände wieder */
addEventListener('load', () => setTimeout(() => { UNDO.bereit = true; _undoZeichnen(false); }, 1200));
document.addEventListener('click', (e) => {
  const o = e.target.closest && e.target.closest('.bf-undo, .bp-undo-zeile');
  if (o) { if (e.target.closest('[data-u]')) _undoKlick(e); return; }
  if (UNDO.offen && UNDO.el && !UNDO.el.contains(e.target) && !_handy()) { UNDO.offen = false; _undoZeichnen(false); }   // Verlauf: Klick daneben klappt ihn zu (wie die Menüs der Befehlsleiste)
});
/* Am Handy (besprochen am 13.11.2026): kein schwebendes Dock. Nach einer Änderung kurz eine Leiste unten über der Tab-Leiste (volle Breite),
   danach ↶ mit Zahl in der Kopfleiste; Tippen öffnet den Verlauf als Blatt von unten. */
const _UH = matchMedia('(max-width: 700px)');
const _handy = () => _UH.matches && !!document.querySelector('.bph .bph-hlp');
function _undoUnten() {   // Höhe einer Leiste am unteren Rand (Tab-Leiste der App: volle Breite, flach), damit die Meldung darüber sitzt
  for (let x = document.elementFromPoint(innerWidth / 2, innerHeight - 3); x && x !== document.body; x = x.parentElement) {
    const r = x.getBoundingClientRect();
    if (r.bottom >= innerHeight - 4 && r.width >= innerWidth * 0.9 && r.height < 110 && r.top > innerHeight * 0.75) return innerHeight - r.top;
  }
  return 0;
}
function _undoKopf(n) {   // ↶ n in der Kopfleiste (nur am Handy)
  const hlp = document.querySelector('.bph .bph-hlp'); let k = document.querySelector('.bph .bph-undo');
  if (!_handy() || (!n && !_redoKann())) { if (k) k.remove(); return; }
  if (!k) { k = document.createElement('button'); k.type = 'button'; k.className = 'bph-ic bph-undo'; k.setAttribute('aria-haspopup', 'dialog');
    k.addEventListener('click', (e) => { e.stopPropagation(); UNDO.offen = true; clearTimeout(UNDO.t); _undoZeichnen(false); }); hlp.before(k); }
  k.title = `Rückgängig – ${n} ${n === 1 ? 'Schritt' : 'Schritte'}`; k.setAttribute('aria-label', k.title);
  k.innerHTML = `↶${n ? `<i>${n}</i>` : ''}`;
}
function _undoBlatt() {   // Verlauf als Blatt von unten (Handy); schließt nur über ✕ oder einen Schritt
  let b = document.querySelector('.bp-undo-blatt');
  if (!UNDO.offen || !_handy()) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.className = 'bp-undo-blatt'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Rückgängig'); document.body.appendChild(b); b.addEventListener('click', _undoKlick); }
  const n = UNDO.s.length;
  b.innerHTML = `<div class="bp-undo-bs"><div class="bp-undo-bk"><b>Rückgängig</b><button type="button" data-u="zu" aria-label="Schließen">✕</button></div>
    <div class="bp-undo-bl">${UNDO.s.slice().reverse().map((u, i) => `<button type="button" data-u="bis" data-i="${i}"><i>${_undoIc(u)}</i><span>${_uEsc(u.text)}</span><small>${_undoAlter(u.t)}</small></button>`).join('') || '<p>Nichts mehr rückgängig zu machen.</p>'}</div>
    <p class="bp-undo-bh">Tippen auf einen Schritt: bis dahin zurück</p>
    <div class="bp-undo-ba"><button type="button" class="bp-undo-u" data-u="eins"${n ? '' : ' disabled'}>↶ Letzten Schritt zurück</button><button type="button" data-u="redo"${_redoKann() ? '' : ' disabled'}>↷ Wiederholen</button></div>
    ${_verlaufB() ? '<button type="button" class="bp-undo-vl" data-u="verlauf">🕘 Ältere Stände im Verlauf …</button>' : ''}</div>`;
}
function _undoZeichnen(kurz) {
  let el = UNDO.el; const n = _undoN(), rk = _redoKann();
  _undoKopf(n); _undoBlatt();
  if (!n && !rk) { if (el) el.remove(); UNDO.el = null; UNDO.offen = false; _undoBlatt(); if (!_handy()) _undoOben(); return; }
  if (_handy()) {   // Handy: nur die kurze Leiste direkt nach einer Änderung, sonst nichts Schwebendes
    if (!kurz || UNDO.offen || !n) { if (el) el.remove(); UNDO.el = null; return; }
    if (!el) { el = UNDO.el = document.createElement('div'); el.className = 'bp-undo bp-undo-h'; el.setAttribute('role', 'status'); document.body.appendChild(el); el.addEventListener('click', _undoKlick); }
    el.style.bottom = `calc(${_undoUnten() + 8}px + env(safe-area-inset-bottom, 0px))`;
    el.innerHTML = `<div class="bp-undo-z"><span class="bp-undo-t">${_uEsc(UNDO.s[n - 1].text)}</span><button type="button" class="bp-undo-u" data-u="eins">↶ Rückgängig</button></div>`;
    return;
  }
  if (el && el.classList.contains('bp-undo-h')) { el.remove(); el = UNDO.el = null; }   // vom Handy auf breit gedreht
  _undoOben();
  if (!UNDO.offen || UNDO.s.length < 2) { if (el) el.remove(); UNDO.el = null; UNDO.offen = false; return; }
  if (!el) { el = UNDO.el = document.createElement('div'); el.className = 'bp-undo bp-undo-oben'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Verlauf'); document.body.appendChild(el);
    el.addEventListener('click', _undoKlick); el.addEventListener('mouseover', _undoHover); el.addEventListener('mouseout', _undoHover); }
  el.innerHTML = `<div class="bp-undo-l" role="list"><div class="bp-undo-lk"><span>Verlauf</span><span class="bp-undo-t">Klick = bis hierher zurück</span></div>${UNDO.s.slice().reverse().map((u, i) => `<button type="button" role="listitem" data-u="bis" data-i="${i}"><i>${_undoIc(u)}</i><span>${_uEsc(u.text)}</span><small>${_undoAlter(u.t)}</small></button>`).join('')}${_verlaufB() ? '<button type="button" data-u="verlauf"><i>🕘</i><span>Ältere Stände im Verlauf …</span></button>' : ''}</div>`;
  const a = [...document.querySelectorAll('.bf-undo [data-u="liste"], .bp-undo-zeile [data-u="liste"]')].find((x) => x.offsetParent), r = a ? a.getBoundingClientRect() : { left: 16, bottom: 60 };
  Object.assign(el.style, { left: Math.max(8, Math.min(innerWidth - el.offsetWidth - 8, r.left)) + 'px', top: (r.bottom + 4) + 'px' });
}
function _undoHover(e) {   // im Verlauf: hell, was alles zurückgenommen würde – und unten „bis …: n Schritte“
  if (!UNDO.offen || !UNDO.el) return; const b = e.type === 'mouseover' && e.target.closest('[data-u="bis"]'), t = UNDO.el.querySelector('.bp-undo-t');
  UNDO.hov = b ? +b.dataset.i : null; UNDO.el.querySelectorAll('[data-u="bis"]').forEach((x) => x.classList.toggle('hi', b && +x.dataset.i <= UNDO.hov));
  const n = UNDO.s.length; if (t) t.textContent = b ? `bis „${UNDO.s[n - 1 - UNDO.hov].text}“: ${UNDO.hov + 1} Schritt${UNDO.hov ? 'e' : ''}` : 'Klick = bis hierher zurück';
}
function _undoZeigen(ms = 10000) { clearTimeout(UNDO.t); _undoZeichnen(true); UNDO.t = setTimeout(() => { if (!UNDO.offen) _undoZeichnen(false); }, _handy() ? Math.min(ms, 5000) : ms); }
_UH.addEventListener('change', () => { UNDO.offen = false; _undoZeichnen(false); });
async function _undoBis(k) {   // k = 0: nur der neueste Schritt; k = 2: die drei neuesten
  if (k === 0 && _eigenZuerst()) { if (UNDO.busy) return; UNDO.busy = true; try { await _eigen().los(); } catch (e) { _uToast(e.message || 'Rückgängig ging nicht', true); } finally { UNDO.busy = false; } return _undoZeichnen(false); }   // Seite mit eigenem Stapel: ihr jüngster Schritt
  if (UNDO.busy) return; UNDO.busy = true; UNDO.hov = null; let n = 0;
  try { for (let i = 0; i <= k && UNDO.s.length; i++) { const u = UNDO.s.pop(); if (window.bpUndoWeg) window.bpUndoWeg(u); await u.fn(); if (u.wieder) UNDO.r.push(u); n++; } }
  catch (e) { _uToast(e.message || 'Rückgängig ging nicht', true); }
  finally { UNDO.busy = false; UNDO.offen = false; UNDO.hov = null; }
  if (n > 1) _uToast(`${n} Schritte rückgängig gemacht.`);
  if (UNDO.s.length || _redoKann()) _undoZeigen(); else _undoZeichnen(false);
}
async function _redo() {
  if (UNDO.busy) return; UNDO.busy = true;
  try { if (window.bpRedo && window.bpRedo.los) await window.bpRedo.los(); else { const u = UNDO.r.pop(); if (u) { await u.wieder(); UNDO.s.push(u); } } }
  catch (e) { _uToast(e.message || 'Wiederholen ging nicht', true); }
  finally { UNDO.busy = false; }
  _undoZeigen();
}
// Verbindung zum gespeicherten Verlauf: Seiten nennen ihren Bereich über window.bpVerlaufBereich() (z. B. 'avalv:12')
const _verlaufB = () => { try { return window.bpVerlaufBereich && window.BPHead && BPHead.verlauf ? window.bpVerlaufBereich() : null; } catch { return null; } };
function _undoKlick(e) {
  const b = e.target.closest('[data-u]'); if (!b || b.disabled) return; e.stopPropagation(); const a = b.dataset.u;
  if (a === 'eins') return _undoBis(0);
  if (a === 'verlauf') { const b = _verlaufB(); UNDO.offen = false; _undoZeichnen(false); if (b) BPHead.verlauf({ bereich: b, nach: window.bpVerlaufNach }); return; }
  if (a === 'redo') return _redo();
  if (a === 'bis') return _undoBis(+b.dataset.i);
  if (a === 'liste') { UNDO.offen = !UNDO.offen; UNDO.hov = null; clearTimeout(UNDO.t); _undoZeichnen(true); return; }
  if (a === 'auf') { UNDO.offen = UNDO.s.length > 1; clearTimeout(UNDO.t); _undoZeichnen(true); if (!UNDO.offen) _undoZeigen(15000); return; }
  if (a === 'zu') { UNDO.offen = false; clearTimeout(UNDO.t); _undoZeichnen(false); }
}
/* rueckgaengig('„X“ erledigt', async () => {…}[, ms, wieder]) – wieder: Funktion, die den Schritt erneut ausführt (für ↷) */
function rueckgaengig(text, fn, ms = 10000, wieder = null) {
  const u = { text, fn, t: Date.now(), ...(wieder ? { wieder } : {}) }; UNDO.s.push(u); if (UNDO.s.length > UNDO_MAX) UNDO.s.shift(); UNDO.r = [];
  if (window.bpUndoHook) window.bpUndoHook(u);
  UNDO.offen = false; _undoZeigen(ms);
  if (!_handy()) document.querySelectorAll('.bf-undo, .bp-undo-zeile').forEach((x) => { x.classList.remove('neu'); void x.offsetWidth; x.classList.add('neu'); });   // Rechner: die Gruppe oben leuchtet kurz auf
  return u;
}
/* Für Seiten mit eigenem Verlauf (z. B. LV-Bearbeitung): Schritte leise in denselben Verlauf legen – nur der kleine Knopf „↶ n | ↷“,
   keine Leiste bei jedem Tastendruck. art: um alle Schritte einer Sorte auf einmal zu entfernen (anderes LV geöffnet). */
const _undoNeu = () => _undoZeichnen(UNDO.offen);
const bpUndo = {
  push(text, fn, art = '') { const u = { text, fn, t: Date.now(), art }; UNDO.s.push(u); if (UNDO.s.length > UNDO_MAX) UNDO.s.shift(); _undoNeu(); return u; },
  text(u, text) { if (u) { u.text = text; u.t = Date.now(); if (UNDO.el) _undoNeu(); } },
  weg(u) { const i = u ? UNDO.s.lastIndexOf(u) : -1; if (i < 0) return; UNDO.s.splice(i, 1); _undoNeu(); },
  wegArt(art) { const n = UNDO.s.length; UNDO.s = UNDO.s.filter((u) => u.art !== art); if (UNDO.s.length !== n) _undoZeichnen(false); },
  zeichnen() { _undoNeu(); },   // Seite mit eigenem Stapel oder eigenem Wiederholen: Knöpfe oben neu zeichnen
};
document.addEventListener('keydown', (e) => {   // Strg+Z / Strg+Y (Strg+Umschalt+Z): nicht beim Tippen und nicht in offenen Dialogen
  if (window.BP_UNDO_EIGEN || !(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = (e.key || '').toLowerCase(), redo = k === 'y' || (k === 'z' && e.shiftKey); if (k !== 'z' && k !== 'y') return;
  const t = e.target; if (t && (t.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]') || t.isContentEditable)) return;
  if (document.querySelector('.modal-bg,.bph-dlg-bg')) return;
  if (redo) { if (_redoKann()) { e.preventDefault(); _redo(); } return; }
  if (_undoN()) { e.preventDefault(); _undoBis(0); }
});
