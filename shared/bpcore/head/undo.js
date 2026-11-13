/* Rückgängig-Dock – gemeinsamer Baustein für alle Apps (Plattform, Bauzeitenplan, Bautagebuch), ausgeliefert als /bp/undo.js.
   Braucht nichts außer sich selbst; Meldungen über window.toast der App, sonst still. */
const _uEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _uToast = (m, bad) => { if (typeof window.toast === 'function') window.toast(m, bad); };
/* Rückgängig mit Verlauf: rueckgaengig('„X“ erledigt', async () => {…}) merkt bis zu 50 Schritte je geöffneter Seite.
   Leiste unten (10 s): neuester Schritt, Anzahl, „↶ Rückgängig“, ▴ Verlauf (bis zu einem Schritt zurück).
   Danach bleibt an derselben Stelle ein kleiner Knopf „↶ n“. Strg+Z außerhalb von Eingabefeldern nimmt den neuesten Schritt zurück
   (Seiten mit eigenem Strg+Z setzen window.BP_UNDO_EIGEN). Neu laden der Seite: Verlauf weg – Gelöschtes liegt im Papierkorb. */
const UNDO = { s: [], r: [], t: 0, offen: false, busy: false, el: null };   // s: Schritte zurück · r: Schritte zum Wiederholen
const UNDO_MAX = 50;
function _undoAlter(t) { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'gerade' : m < 60 ? `${m} Min.` : `${Math.round(m / 60)} Std.`; }
function _undoIc(u) { const t = (u.text || '').toLowerCase();   // Symbol je Art des Schritts
  return u.ic || (/gelöscht|papierkorb|entfernt|verworfen/.test(t) ? '🗑' : /eingefügt|angelegt|hinzugef|neu |übernommen|eingesetzt/.test(t) ? '＋' : /verschoben|eingerückt|ausgerückt|umsortiert/.test(t) ? '⇥' : /archiv|ausgeblendet/.test(t) ? '▣' : '✎'); }
// Wiederholen: Seiten mit eigenem Verlauf (AVA, Druck-Layouts) melden sich über window.bpRedo = { kann(), los() }; sonst Schritte mit u.wieder
const _redoKann = () => (window.bpRedo && window.bpRedo.kann ? window.bpRedo.kann() : UNDO.r.length > 0);
/* Dock frei verschiebbar am Griff ⋮⋮ – die Lage gilt nur auf dieser Seite: nach dem Wechsel der App steht es wieder unten in der Mitte */
const _UG = '<span class="bp-undo-g" title="Verschieben" aria-hidden="true">⋮⋮</span>';
function _undoLage(el, x, y) { const r = el.getBoundingClientRect(); x = Math.max(4, Math.min(innerWidth - r.width - 4, x)); y = Math.max(4, Math.min(innerHeight - r.height - 4, y));
  el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.bottom = 'auto'; el.style.transform = 'none'; UNDO.pos = { x, y }; }
/* Startlage automatisch: unten links, unten Mitte, unten rechts oder oben rechts – wo das Dock am wenigsten Knöpfe, Felder und Text verdeckt.
   Gilt, solange es niemand selbst verschoben hat; einmal je Erscheinen (kein Springen während der Anzeige). */
function _undoAuto(el) {
  if (UNDO.pos) return;
  const r = el.getBoundingClientRect(), w = Math.max(r.width, 260), h = Math.max(r.height, 44), m = 16, unten = innerHeight - h - m - 8;
  const kopf = (document.querySelector('.bph') || {}).offsetHeight || 0;
  const K = [[m, unten], [(innerWidth - w) / 2, unten], [innerWidth - w - m - 8, unten], [innerWidth - w - m - 8, kopf + 60]];
  const wichtig = (x) => { if (!x || x === document.body || x === document.documentElement || el.contains(x)) return 0;
    if (x.closest('button,a,input,textarea,select,label,[role="button"],[contenteditable="true"]')) return 3;
    return x.childElementCount === 0 && (x.textContent || '').trim() ? 1 : 0; };
  const alt = el.style.visibility; el.style.visibility = 'hidden';
  let best = null;
  K.forEach(([x, y], i) => {
    let s = 0;
    for (let a = 0; a < 5; a++) for (let b = 0; b < 3; b++) s += wichtig(document.elementFromPoint(x + (w * (a + 0.5)) / 5, y + (h * (b + 0.5)) / 3));
    if (!best || s < best.s) best = { s, x, y, i };
  });
  el.style.visibility = alt;
  if (!best) return;
  el.style.left = Math.max(4, best.x) + 'px'; el.style.transform = 'none';
  if (best.i === 3) { el.style.top = best.y + 'px'; el.style.bottom = 'auto'; } else { el.style.top = 'auto'; el.style.bottom = (innerHeight - best.y - h) + 'px'; }
}
function _undoZieh(e) {
  if (!e.target.closest('.bp-undo-g') || e.button !== 0) return; e.preventDefault();
  const el = UNDO.el, r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top, g = e.target; g.setPointerCapture(e.pointerId);
  g.onpointermove = (m) => _undoLage(el, m.clientX - dx, m.clientY - dy);
  g.onpointerup = () => { g.onpointermove = g.onpointerup = null; };
}
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
  let el = UNDO.el; const n = UNDO.s.length, rk = _redoKann();
  _undoKopf(n); _undoBlatt();
  if (!n && !rk) { if (el) el.remove(); UNDO.el = null; UNDO.offen = false; _undoBlatt(); return; }
  if (_handy()) {   // Handy: nur die kurze Leiste direkt nach einer Änderung, sonst nichts Schwebendes
    if (!kurz || UNDO.offen || !n) { if (el) el.remove(); UNDO.el = null; return; }
    if (!el) { el = UNDO.el = document.createElement('div'); el.className = 'bp-undo bp-undo-h'; el.setAttribute('role', 'status'); document.body.appendChild(el); el.addEventListener('click', _undoKlick); }
    el.style.bottom = `calc(${_undoUnten() + 8}px + env(safe-area-inset-bottom, 0px))`;
    el.innerHTML = `<div class="bp-undo-z"><span class="bp-undo-t">${_uEsc(UNDO.s[n - 1].text)}</span><button type="button" class="bp-undo-u" data-u="eins">↶ Rückgängig</button></div>`;
    return;
  }
  if (el && el.classList.contains('bp-undo-h')) { el.remove(); el = UNDO.el = null; }   // vom Handy auf breit gedreht
  if (!el) { el = UNDO.el = document.createElement('div'); el.className = 'bp-undo'; el.setAttribute('role', 'status'); document.body.appendChild(el);
    el.addEventListener('click', _undoKlick); el.addEventListener('mouseover', _undoHover); el.addEventListener('mouseout', _undoHover);
    el.addEventListener('pointerdown', _undoZieh); if (UNDO.pos) _undoLage(el, UNDO.pos.x, UNDO.pos.y); el._neu = true; }
  const top = UNDO.s[n - 1], klein = !kurz && !UNDO.offen;
  el.classList.toggle('klein', klein);
  const redo = `<button type="button" class="bp-undo-r" data-u="redo"${rk ? '' : ' disabled'} title="Wiederholen (Strg+Y)">↷</button>`;
  el.innerHTML = klein ? `<div class="bp-undo-mini">${_UG}<button type="button" class="bp-undo-u" data-u="auf"${n ? '' : ' disabled'} title="Rückgängig – ${n} ${n === 1 ? 'Schritt' : 'Schritte'} (Strg+Z) · Klick: Verlauf">↶ ${n}</button>${redo}</div>`
    : `${UNDO.offen ? `<div class="bp-undo-l" role="list"><div class="bp-undo-lk"><span>Verlauf</span><span>Klick = bis hierher zurück</span></div>${UNDO.s.slice().reverse().map((u, i) => `<button type="button" role="listitem" data-u="bis" data-i="${i}"><i>${_undoIc(u)}</i><span>${_uEsc(u.text)}</span><small>${_undoAlter(u.t)}</small></button>`).join('')}${_verlaufB() ? '<button type="button" class="bp-undo-vl" data-u="verlauf">🕘 Ältere Stände im Verlauf …</button>' : ''}</div>` : ''}
      <div class="bp-undo-z">${_UG}<span class="bp-undo-t">${UNDO.offen && UNDO.hov != null && UNDO.s[n - 1 - UNDO.hov] ? `bis „${_uEsc(UNDO.s[n - 1 - UNDO.hov].text)}“: ${UNDO.hov + 1} Schritt${UNDO.hov ? 'e' : ''}` : top ? _uEsc(top.text) : 'Nichts mehr rückgängig zu machen'}</span>
        <button type="button" class="bp-undo-u" data-u="eins"${n ? '' : ' disabled'}>↶ Rückgängig${n > 1 ? ` <em>${n}</em>` : ''}</button>${redo}${n > 1 ? `<button type="button" class="bp-undo-r" data-u="liste" title="Verlauf" aria-expanded="${UNDO.offen}">${UNDO.offen ? '▾' : '▴'}</button>` : ''}<button type="button" class="bp-undo-x" data-u="zu" title="Ausblenden">✕</button></div>`;
  if (el._neu) { el._neu = false; _undoAuto(el); }
}
function _undoHover(e) {   // im Verlauf: hell, was alles zurückgenommen würde – und unten „bis …: n Schritte“
  if (!UNDO.offen || !UNDO.el) return; const b = e.type === 'mouseover' && e.target.closest('[data-u="bis"]'), t = UNDO.el.querySelector('.bp-undo-t');
  UNDO.hov = b ? +b.dataset.i : null; UNDO.el.querySelectorAll('[data-u="bis"]').forEach((x) => x.classList.toggle('hi', b && +x.dataset.i <= UNDO.hov));
  const n = UNDO.s.length; if (t) t.textContent = b ? `bis „${UNDO.s[n - 1 - UNDO.hov].text}“: ${UNDO.hov + 1} Schritt${UNDO.hov ? 'e' : ''}` : (UNDO.s[n - 1] || {}).text || '';
}
function _undoZeigen(ms = 10000) { clearTimeout(UNDO.t); _undoZeichnen(true); UNDO.t = setTimeout(() => { if (!UNDO.offen) _undoZeichnen(false); }, _handy() ? Math.min(ms, 5000) : ms); }
_UH.addEventListener('change', () => { UNDO.offen = false; _undoZeichnen(false); });
async function _undoBis(k) {   // k = 0: nur der neueste Schritt; k = 2: die drei neuesten
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
  if (a === 'liste') { UNDO.offen = !UNDO.offen; UNDO.hov = null; clearTimeout(UNDO.t); _undoZeichnen(true); if (!UNDO.offen) _undoZeigen(); return; }
  if (a === 'auf') { UNDO.offen = UNDO.s.length > 1; clearTimeout(UNDO.t); _undoZeichnen(true); if (!UNDO.offen) _undoZeigen(15000); return; }
  if (a === 'zu') { UNDO.offen = false; clearTimeout(UNDO.t); _undoZeichnen(false); }
}
/* rueckgaengig('„X“ erledigt', async () => {…}[, ms, wieder]) – wieder: Funktion, die den Schritt erneut ausführt (für ↷) */
function rueckgaengig(text, fn, ms = 10000, wieder = null) {
  const u = { text, fn, t: Date.now(), ...(wieder ? { wieder } : {}) }; UNDO.s.push(u); if (UNDO.s.length > UNDO_MAX) UNDO.s.shift(); UNDO.r = [];
  if (window.bpUndoHook) window.bpUndoHook(u);
  UNDO.offen = false; _undoZeigen(ms);
  return u;
}
/* Für Seiten mit eigenem Verlauf (z. B. LV-Bearbeitung): Schritte leise in denselben Verlauf legen – nur der kleine Knopf „↶ n | ↷“,
   keine Leiste bei jedem Tastendruck. art: um alle Schritte einer Sorte auf einmal zu entfernen (anderes LV geöffnet). */
const _undoNeu = () => _undoZeichnen(UNDO.offen || !!(UNDO.el && !UNDO.el.classList.contains('klein')));
const bpUndo = {
  push(text, fn, art = '') { const u = { text, fn, t: Date.now(), art }; UNDO.s.push(u); if (UNDO.s.length > UNDO_MAX) UNDO.s.shift(); _undoNeu(); return u; },
  text(u, text) { if (u) { u.text = text; u.t = Date.now(); if (UNDO.el) _undoNeu(); } },
  weg(u) { const i = u ? UNDO.s.lastIndexOf(u) : -1; if (i < 0) return; UNDO.s.splice(i, 1); _undoNeu(); },
  wegArt(art) { const n = UNDO.s.length; UNDO.s = UNDO.s.filter((u) => u.art !== art); if (UNDO.s.length !== n) _undoZeichnen(false); },
  zeichnen() { if (UNDO.s.length || _redoKann() || UNDO.el) _undoNeu(); },   // Seite mit eigenem Wiederholen: ↷ neu zeigen
};
document.addEventListener('keydown', (e) => {   // Strg+Z / Strg+Y (Strg+Umschalt+Z): nicht beim Tippen und nicht in offenen Dialogen
  if (window.BP_UNDO_EIGEN || !(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = (e.key || '').toLowerCase(), redo = k === 'y' || (k === 'z' && e.shiftKey); if (k !== 'z' && k !== 'y') return;
  const t = e.target; if (t && (t.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]') || t.isContentEditable)) return;
  if (document.querySelector('.modal-bg,.bph-dlg-bg')) return;
  if (redo) { if (_redoKann()) { e.preventDefault(); _redo(); } return; }
  if (UNDO.s.length) { e.preventDefault(); _undoBis(0); }
});
