/* Rückgängig – gemeinsamer Baustein für alle Apps (Plattform, Bauzeitenplan, Bautagebuch), ausgeliefert als /bp/undo.js.
   Braucht nichts außer sich selbst; Meldungen über window.toast der App, sonst still. */
const _uEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _uToast = (m, bad) => { if (typeof window.toast === 'function') window.toast(m, bad); };
/* Rückgängig mit Verlauf: rueckgaengig('„X“ erledigt', async () => {…}) merkt bis zu 50 Schritte je geöffneter Seite.
   Besprochen am 13.11.2026 – kein schwebendes Dock mehr: ↶ (mit Zahl) und ↷ stehen fest in der Kopfleiste jeder App; Klick auf ↶ öffnet
   den Verlauf (am Rechner unter dem Knopf, am Handy als Blatt von unten). Nach einer Änderung kurz eine Meldung unten („… · ↶ Rückgängig“),
   am Handy über der Tab-Leiste. Strg+Z außerhalb von Eingabefeldern nimmt den neuesten Schritt zurück
   (Seiten mit eigenem Strg+Z setzen window.BP_UNDO_EIGEN). Neu laden der Seite: Verlauf weg – Gelöschtes liegt im Papierkorb. */
const UNDO = { s: [], r: [], t: 0, offen: false, busy: false, el: null };   // s: Schritte zurück · r: Schritte zum Wiederholen
const UNDO_MAX = 50;
function _undoAlter(t) { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'gerade' : m < 60 ? `${m} Min.` : `${Math.round(m / 60)} Std.`; }
function _undoIc(u) { const t = (u.text || '').toLowerCase();   // Symbol je Art des Schritts
  return u.ic || (/gelöscht|papierkorb|entfernt|verworfen/.test(t) ? '🗑' : /eingefügt|angelegt|hinzugef|neu |übernommen|eingesetzt/.test(t) ? '＋' : /verschoben|eingerückt|ausgerückt|umsortiert/.test(t) ? '⇥' : /archiv|ausgeblendet/.test(t) ? '▣' : '✎'); }
// Wiederholen: Seiten mit eigenem Verlauf (AVA, Druck-Layouts) melden sich über window.bpRedo = { kann(), los() }; sonst Schritte mit u.wieder
const _redoKann = () => (window.bpRedo && window.bpRedo.kann ? window.bpRedo.kann() : UNDO.r.length > 0);
const _UH = matchMedia('(max-width: 700px)');   // Handy: Verlauf als Blatt, Meldung über die volle Breite
const _kopf = () => !!document.querySelector('.bph .bph-hlp');   // Kopfleiste da (eingebettete Seiten haben keine: dort nur Meldung und Strg+Z)
function _undoUnten() {   // Höhe einer Leiste am unteren Rand (Tab-Leiste der App: volle Breite, flach), damit die Meldung darüber sitzt
  for (let x = document.elementFromPoint(innerWidth / 2, innerHeight - 3); x && x !== document.body; x = x.parentElement) {
    const r = x.getBoundingClientRect();
    if (r.bottom >= innerHeight - 4 && r.width >= innerWidth * 0.9 && r.height < 110 && r.top > innerHeight * 0.75) return innerHeight - r.top;
  }
  return 0;
}
function _undoKopf(n) {   // ↶ n und ↷ in der Kopfleiste (↷ am Handy im Verlauf)
  const hlp = document.querySelector('.bph .bph-hlp'); let k = document.querySelector('.bph .bph-undo'), w = document.querySelector('.bph .bph-redo');
  const rk = _redoKann();
  if (!_kopf() || (!n && !rk)) { if (k) k.remove(); if (w) w.remove(); return; }
  if (!k) { k = document.createElement('button'); k.type = 'button'; k.className = 'bph-ic bph-undo'; k.setAttribute('aria-haspopup', 'dialog');
    k.addEventListener('click', (e) => { e.stopPropagation(); UNDO.offen = !UNDO.offen; clearTimeout(UNDO.t); _undoZeichnen(false); }); hlp.before(k); }
  if (!w) { w = document.createElement('button'); w.type = 'button'; w.className = 'bph-ic bph-redo'; w.title = 'Wiederholen (Strg+Y)'; w.setAttribute('aria-label', w.title); w.textContent = '↷';
    w.addEventListener('click', (e) => { e.stopPropagation(); _redo(); }); k.after(w); }
  k.title = `Rückgängig – ${n} ${n === 1 ? 'Schritt' : 'Schritte'} (Strg+Z) · Klick: Verlauf`; k.setAttribute('aria-label', k.title); k.setAttribute('aria-expanded', String(UNDO.offen));
  k.innerHTML = `↶${n ? `<i>${n}</i>` : ''}`; k.classList.toggle('leer', !n);
  w.style.display = !rk || _UH.matches ? 'none' : '';   // .bph-ic setzt display fest – hidden reicht nicht
}
function _undoBlatt() {   // Verlauf: am Handy als Blatt von unten, am Rechner unter dem Knopf; schließt über ✕, ↶ oder einen Schritt
  let b = document.querySelector('.bp-undo-blatt');
  if (!UNDO.offen || !_kopf()) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.className = 'bp-undo-blatt'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Rückgängig'); document.body.appendChild(b); b.addEventListener('click', _undoKlick); }
  const n = UNDO.s.length;
  b.innerHTML = `<div class="bp-undo-bs"><div class="bp-undo-bk"><b>Rückgängig</b><button type="button" data-u="zu" aria-label="Schließen">✕</button></div>
    <div class="bp-undo-bl">${UNDO.s.slice().reverse().map((u, i) => `<button type="button" data-u="bis" data-i="${i}"><i>${_undoIc(u)}</i><span>${_uEsc(u.text)}</span><small>${_undoAlter(u.t)}</small></button>`).join('') || '<p>Nichts mehr rückgängig zu machen.</p>'}</div>
    <p class="bp-undo-bh">${_UH.matches ? 'Tippen' : 'Klick'} auf einen Schritt: bis dahin zurück</p>
    <div class="bp-undo-ba"><button type="button" class="bp-undo-u" data-u="eins"${n ? '' : ' disabled'}>↶ Letzten Schritt zurück</button><button type="button" data-u="redo"${_redoKann() ? '' : ' disabled'}>↷ Wiederholen</button></div>
    ${_verlaufB() ? '<button type="button" class="bp-undo-vl" data-u="verlauf">🕘 Ältere Stände im Verlauf …</button>' : ''}</div>`;
  b.classList.toggle('breit', !_UH.matches);
  const k = document.querySelector('.bph .bph-undo'), bs = b.firstElementChild;
  if (!_UH.matches && k) { const r = k.getBoundingClientRect(); bs.style.top = (r.bottom + 6) + 'px'; bs.style.right = Math.max(8, innerWidth - r.right - 40) + 'px'; }
}
function _undoZeichnen(kurz) {   // kurz = gerade geändert: Meldung unten zeigen
  let el = UNDO.el; const n = UNDO.s.length;
  _undoKopf(n); _undoBlatt();
  if (!kurz || UNDO.offen || !n) { if (el) el.remove(); UNDO.el = null; return; }
  if (!el) { el = UNDO.el = document.createElement('div'); el.className = 'bp-undo bp-undo-h'; el.setAttribute('role', 'status'); document.body.appendChild(el); el.addEventListener('click', _undoKlick); }
  el.classList.toggle('breit', !_UH.matches);
  el.style.bottom = `calc(${_undoUnten() + (_UH.matches ? 8 : 18)}px + env(safe-area-inset-bottom, 0px))`;
  el.innerHTML = `<div class="bp-undo-z"><span class="bp-undo-t">${_uEsc(UNDO.s[n - 1].text)}</span><button type="button" class="bp-undo-u" data-u="eins">↶ Rückgängig</button></div>`;
}
function _undoZeigen(ms = 6000) { clearTimeout(UNDO.t); _undoZeichnen(true); UNDO.t = setTimeout(() => { if (!UNDO.offen) _undoZeichnen(false); }, Math.min(ms, _UH.matches ? 5000 : 6000)); }
_UH.addEventListener('change', () => { UNDO.offen = false; _undoZeichnen(false); });
async function _undoBis(k) {   // k = 0: nur der neueste Schritt; k = 2: die drei neuesten
  if (UNDO.busy) return; UNDO.busy = true; let n = 0;
  try { for (let i = 0; i <= k && UNDO.s.length; i++) { const u = UNDO.s.pop(); if (window.bpUndoWeg) window.bpUndoWeg(u); await u.fn(); if (u.wieder) UNDO.r.push(u); n++; } }
  catch (e) { _uToast(e.message || 'Rückgängig ging nicht', true); }
  finally { UNDO.busy = false; UNDO.offen = false; }
  _uToast(n > 1 ? `${n} Schritte rückgängig gemacht.` : 'Rückgängig gemacht.');
  _undoZeichnen(false);
}
async function _redo() {
  if (UNDO.busy) return; UNDO.busy = true;
  try { if (window.bpRedo && window.bpRedo.los) await window.bpRedo.los(); else { const u = UNDO.r.pop(); if (u) { await u.wieder(); UNDO.s.push(u); } } }
  catch (e) { _uToast(e.message || 'Wiederholen ging nicht', true); }
  finally { UNDO.busy = false; }
  _undoZeichnen(false);
}
// Verbindung zum gespeicherten Verlauf: Seiten nennen ihren Bereich über window.bpVerlaufBereich() (z. B. 'avalv:12')
const _verlaufB = () => { try { return window.bpVerlaufBereich && window.BPHead && BPHead.verlauf ? window.bpVerlaufBereich() : null; } catch { return null; } };
function _undoKlick(e) {
  const b = e.target.closest('[data-u]'); if (!b || b.disabled) return; e.stopPropagation(); const a = b.dataset.u;
  if (a === 'eins') return _undoBis(0);
  if (a === 'verlauf') { const b = _verlaufB(); UNDO.offen = false; _undoZeichnen(false); if (b) BPHead.verlauf({ bereich: b, nach: window.bpVerlaufNach }); return; }
  if (a === 'redo') return _redo();
  if (a === 'bis') return _undoBis(+b.dataset.i);
  if (a === 'zu') { UNDO.offen = false; clearTimeout(UNDO.t); _undoZeichnen(false); }
}
/* rueckgaengig('„X“ erledigt', async () => {…}[, ms, wieder]) – wieder: Funktion, die den Schritt erneut ausführt (für ↷) */
function rueckgaengig(text, fn, ms = 6000, wieder = null) {
  const u = { text, fn, t: Date.now(), ...(wieder ? { wieder } : {}) }; UNDO.s.push(u); if (UNDO.s.length > UNDO_MAX) UNDO.s.shift(); UNDO.r = [];
  if (window.bpUndoHook) window.bpUndoHook(u);
  UNDO.offen = false; _undoZeigen(ms);
  return u;
}
/* Für Seiten mit eigenem Verlauf (z. B. LV-Bearbeitung): Schritte leise in denselben Verlauf legen – nur ↶ n | ↷ in der Kopfleiste,
   keine Meldung bei jedem Tastendruck. art: um alle Schritte einer Sorte auf einmal zu entfernen (anderes LV geöffnet). */
const _undoNeu = () => _undoZeichnen(!!UNDO.el);
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
