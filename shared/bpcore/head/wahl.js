/* Auswahllisten – gemeinsamer Baustein (/bp/wahl.js, wird von head.js nachgeladen und gilt damit in jeder App).
   Jedes <select> öffnet statt der Systemliste (am iPhone das graue iOS-Menü) die eigene Liste: am Computer direkt am Feld,
   am Handy als Blatt von unten mit Überschrift und „Schließen“. Ab 12 Einträgen mit Suchfeld. Die Wahl setzt den Wert des
   <select> und meldet „input“ und „change“ – die Apps merken keinen Unterschied. Ausnehmen: <select data-nativ>. */
(() => {
  if (window.bpWahl) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = (s) => String(s ?? '').normalize('NFC').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const geht = (s) => s && s.tagName === 'SELECT' && s.ownerDocument === document && !s.multiple && !(s.size > 1) && !s.disabled && !s.hasAttribute('data-nativ');
  const schmal = () => innerWidth < 700;
  let OFFEN = null;
  function titel(sel) {
    const l = sel.getAttribute('aria-label') || (sel.labels && sel.labels[0] && [...sel.labels[0].childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim()) || sel.title || '';
    return l.replace(/\s+/g, ' ').trim() || 'Auswählen';
  }
  function zu(fokus) {
    if (!OFFEN) return; const o = OFFEN; OFFEN = null; o.bg.remove(); o.sel.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', o.aussen, true); removeEventListener('resize', o.ort); removeEventListener('scroll', o.roll, true);
    if (fokus) try { o.sel.focus({ preventScroll: true }); } catch { /* egal */ }
  }
  function auf(sel) {
    if (OFFEN) { const war = OFFEN.sel; zu(false); if (war === sel) return; }
    const E = []; [...sel.children].forEach((c) => { if (c.tagName === 'OPTGROUP') { [...c.children].forEach((o) => E.push({ o, g: c.label, aus: c.disabled || o.disabled })); } else if (c.tagName === 'OPTION') E.push({ o: c, g: '', aus: c.disabled }); });
    const blatt = schmal(), such = E.length >= 12;
    const bg = document.createElement('div'); bg.className = 'bph-wahl-bg' + (blatt ? ' blatt' : '');
    bg.innerHTML = `<div class="bph-wahl" role="listbox" aria-label="${esc(titel(sel))}">${blatt ? `<div class="bph-wahl-k"><b>${esc(titel(sel))}</b><button type="button" class="bph-wahl-x" data-wx>Schließen</button></div>` : ''}${such ? '<div class="bph-wahl-q"><input type="search" placeholder="Suchen …" autocomplete="off" aria-label="Suchen"></div>' : ''}<div class="bph-wahl-l"></div></div>`;
    document.body.appendChild(bg); sel.setAttribute('aria-expanded', 'true');
    const m = bg.firstChild, L = m.querySelector('.bph-wahl-l'), q = m.querySelector('input');
    let zeige = [], akt = Math.max(0, E.findIndex((x) => x.o.selected));
    const zeichne = () => {
      const w = q ? fold(q.value.trim()).split(/\s+/).filter(Boolean) : [];
      zeige = E.filter((x) => !w.length || w.every((t) => fold(x.o.textContent).includes(t)));
      let g = '';
      L.innerHTML = zeige.map((x, i) => { const k = x.g && x.g !== g ? `<div class="bph-wahl-g">${esc(x.g)}</div>` : ''; g = x.g;
        return k + `<div class="bph-wahl-o${x.o.selected ? ' on' : ''}${i === akt ? ' akt' : ''}${x.aus ? ' aus' : ''}" role="option" aria-selected="${x.o.selected}" data-wi="${i}"><span class="h">${x.o.selected ? '✓' : ''}</span><span class="t">${esc(x.o.textContent.trim()) || '<i>– leer –</i>'}</span></div>`; }).join('') || '<div class="bph-wahl-e">Nichts gefunden.</div>';
      const a = L.querySelector('.akt'); if (a) a.scrollIntoView({ block: 'nearest' });
    };
    const ort = () => {   // am Computer: unter dem Feld, sonst darüber – immer ganz im Fenster
      if (blatt) return; const r = sel.getBoundingClientRect(); m.style.minWidth = Math.max(160, r.width) + 'px'; m.style.maxHeight = ''; m.style.top = '0px'; m.style.bottom = '';
      const h = m.offsetHeight, unten = innerHeight - r.bottom - 12, oben = r.top - 12;
      if (h <= unten || unten >= oben) { m.style.top = (r.bottom + 4) + 'px'; if (h > unten) m.style.maxHeight = Math.max(140, unten) + 'px'; }
      else { m.style.top = ''; m.style.bottom = (innerHeight - r.top + 4) + 'px'; if (h > oben) m.style.maxHeight = Math.max(140, oben) + 'px'; }
      m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
    };
    const nimm = (x) => { if (!x || x.aus) return; const neu = !x.o.selected; zu(true); if (!neu) return; sel.value = x.o.value; x.o.selected = true;
      sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); };
    const schritt = (d) => { let i = akt; for (let n = 0; n < zeige.length; n++) { i = Math.max(0, Math.min(zeige.length - 1, i + d)); if (!zeige[i] || !zeige[i].aus || i === 0 || i === zeige.length - 1) break; } akt = i; zeichne(); };
    const aussen = (e) => { if (blatt) return; if (!m.contains(e.target) && e.target !== sel) zu(false); };   // das Blatt am Handy schließt nur über „Schließen“
    const roll = (e) => { if (!blatt && !m.contains(e.target)) ort(); };
    OFFEN = { sel, bg, aussen, ort, roll };
    zeichne(); akt = Math.max(0, zeige.findIndex((x) => x.o.selected)); zeichne(); ort();
    setTimeout(() => document.addEventListener('pointerdown', aussen, true), 0); addEventListener('resize', ort); addEventListener('scroll', roll, true);
    m.addEventListener('click', (e) => { if (e.target.closest('[data-wx]')) { zu(true); return; } const o = e.target.closest('[data-wi]'); if (o) nimm(zeige[+o.dataset.wi]); });
    m.addEventListener('mousedown', (e) => { if (!e.target.closest('input')) e.preventDefault(); });   // Fokus bleibt am Feld
    const taste = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zu(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); schritt(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); schritt(-1); }
      else if (e.key === 'Home') { e.preventDefault(); akt = 0; zeichne(); } else if (e.key === 'End') { e.preventDefault(); akt = zeige.length - 1; zeichne(); }
      else if (e.key === 'Enter' || (e.key === ' ' && e.target !== q)) { e.preventDefault(); nimm(zeige[akt]); }
      else if (e.key === 'Tab') zu(false);
      else if (!q && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { const i = zeige.findIndex((x, n) => n > akt && fold(x.o.textContent.trim()).startsWith(fold(e.key))); const j = i >= 0 ? i : zeige.findIndex((x) => fold(x.o.textContent.trim()).startsWith(fold(e.key))); if (j >= 0) { akt = j; zeichne(); } }
    };
    OFFEN.taste = taste; m.addEventListener('keydown', taste);
    if (q) { q.addEventListener('input', () => { akt = 0; zeichne(); ort(); }); if (!blatt) q.focus(); }
  }
  /* Systemliste abfangen: Maus (mousedown), Finger (touchend – iOS öffnet sein Menü sonst beim Antippen), Tastatur */
  document.addEventListener('mousedown', (e) => { const s = e.target.closest && e.target.closest('select'); if (!geht(s) || e.button) return; e.preventDefault(); try { s.focus({ preventScroll: true }); } catch { /* egal */ } auf(s); }, true);
  let tx = 0, ty = 0;
  document.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) { tx = t.clientX; ty = t.clientY; } }, { capture: true, passive: true });
  document.addEventListener('touchend', (e) => { const s = e.target.closest && e.target.closest('select'); if (!geht(s)) return; const t = e.changedTouches[0];
    if (t && Math.hypot(t.clientX - tx, t.clientY - ty) > 10) return;   // gewischt (gescrollt), nicht getippt
    e.preventDefault(); auf(s); }, { capture: true, passive: false });
  document.addEventListener('keydown', (e) => { const s = e.target; if (!geht(s)) return;
    if (OFFEN && OFFEN.sel === s) { OFFEN.taste(e); return; }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'F4' || ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && (e.altKey || /Mac|iPhone|iPad/.test(navigator.platform || '')))) { e.preventDefault(); auf(s); } }, true);
  window.bpWahl = { auf, zu: () => zu(false) };
})();
