/* Datums- und Zeitauswahl – gemeinsamer Baustein (/bp/datum.js, wird von head.js nachgeladen und gilt damit in jeder App).
   Jedes <input type="date">, type="time" und type="datetime-local" öffnet (Uhrzeit: Stunde, dann Minute antippen) statt des Systemkalenders den eigenen: am Computer direkt am Feld (Tippen im Feld geht weiter),
   am Handy als Blatt von unten. Monat blättern, Kalenderwoche, heute markiert, Schnellwahl (heute, +1/+2/+4 Wochen), Leeren.
   Die Wahl setzt den Wert und meldet „input“ und „change“ – die Apps merken keinen Unterschied. Ausnehmen: <input type="date" data-nativ>. */
(() => {
  if (window.bpDatum) return;
  const css = document.createElement('style');
  css.textContent = `input:is([type=date],[type=time],[type=datetime-local]):not([data-nativ])::-webkit-calendar-picker-indicator{opacity:0;width:0;padding:0;margin:0}
input:is([type=date],[type=datetime-local]):not([data-nativ]){background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.8'%3E%3Crect x='3.5' y='5' width='17' height='15' rx='2'/%3E%3Cpath d='M3.5 9.5h17M8 3v4M16 3v4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .5rem center;background-size:1.05rem;padding-right:2rem;cursor:pointer}
.bpd-bg{position:fixed;inset:0;z-index:9800;pointer-events:none}.bpd-bg.blatt{pointer-events:auto;background:rgba(0,0,0,.38);display:flex;align-items:flex-end}
.bpd{pointer-events:auto;position:fixed;width:300px;background:var(--card,#fff);color:var(--ink,#1c1c1a);border:1px solid var(--line,#cfcfca);border-radius:calc(12px*var(--rk,1));box-shadow:var(--sh0,0 12px 36px rgba(0,0,0,.28));padding:.6rem;font-size:.92rem;user-select:none}
.bpd-bg.blatt .bpd{position:static;width:100%;box-sizing:border-box;border-radius:calc(16px*var(--rk,1)) calc(16px*var(--rk,1)) 0 0;border-width:1px 0 0;padding:.8rem .9rem calc(.9rem + env(safe-area-inset-bottom,0px));font-size:1.02rem}
.bpd-k{display:flex;align-items:center;gap:.3rem;margin-bottom:.4rem}.bpd-k b{flex:1;text-align:center;font-size:1em}
.bpd button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;border-radius:calc(8px*var(--rk,1))}
.bpd-n{width:2rem;height:2rem;font-size:1.15rem!important;color:var(--mute,#777)!important}.bpd-n:hover{background:var(--hov,rgba(0,0,0,.06))}
.bpd-g{display:grid;grid-template-columns:1.9rem repeat(7,1fr);gap:2px;text-align:center}
.bpd-g .w{font-size:.72em;color:var(--mute,#888);padding:.2rem 0}.bpd-g .kw{font-size:.7em;color:var(--mute,#999);align-self:center}
.bpd-g .t{padding:.38rem 0;font-variant-numeric:tabular-nums}.bpd-bg.blatt .bpd-g .t{padding:.6rem 0}
.bpd-g .t:hover{background:var(--hov,rgba(0,0,0,.06))}.bpd-g .t.x{color:var(--mute,#999)}.bpd-g .t.we{color:color-mix(in srgb,var(--ink,#222) 60%,transparent)}
.bpd-g .t.heute{box-shadow:inset 0 0 0 1.5px var(--y,#d4357f)}.bpd-g .t.on{background:var(--y,#d4357f)!important;color:var(--on,#fff)!important;font-weight:700}
.bpd-g .t:disabled{opacity:.3;cursor:default}
.bpd-s{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.5rem;padding-top:.5rem;border-top:1px solid var(--line,#ddd)}
.bpd-s button{border:1px solid var(--line,#ccc)!important;border-radius:calc(999px*var(--rkp,1))!important;padding:.22rem .65rem;font-size:.85em}.bpd-s button:hover{border-color:var(--y,#d4357f)!important}
.bpd-s .weg{margin-left:auto;color:var(--mute,#777)}
.bpd-u{display:grid;grid-template-columns:repeat(6,1fr);gap:3px;text-align:center}.bpd-u button{padding:.42rem 0;font-variant-numeric:tabular-nums}.bpd-u button:hover{background:var(--hov,rgba(0,0,0,.06))}.bpd-u button.on{background:var(--y,#d4357f);color:var(--on,#fff);font-weight:700}.bpd-u button.n{color:var(--mute,#999)}
.bpd-ul{font-size:.72em;color:var(--mute,#888);margin:.45rem 0 .2rem;text-transform:uppercase;letter-spacing:.05em}.bpd-bg.blatt .bpd-u button{padding:.65rem 0}`;
  document.head.appendChild(css);
  const geht = (i) => i && i.tagName === 'INPUT' && ['date', 'time', 'datetime-local'].includes(i.type) && !i.disabled && !i.readOnly && !i.hasAttribute('data-nativ');
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ab = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const kw = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const j = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - j) / 864e5 + 1) / 7); };
  const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  let OFFEN = null;
  function zu() { if (!OFFEN) return; const o = OFFEN; OFFEN = null; o.bg.remove(); document.removeEventListener('pointerdown', o.aussen, true); removeEventListener('resize', o.ort); removeEventListener('scroll', o.roll, true); }
  function auf(inp) {
    if (OFFEN) { const war = OFFEN.inp; zu(); if (war === inp) return; }
    const blatt = innerWidth < 700 || matchMedia('(pointer:coarse)').matches;
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const art = inp.type, teil = (v) => (art === 'datetime-local' ? String(v || '').slice(0, 10) : v);
    const wert = ab(teil(inp.value)), min = ab(teil(inp.min)), max = ab(teil(inp.max));
    let tag = art === 'datetime-local' ? teil(inp.value) : '', zeit = art === 'time' ? inp.value : art === 'datetime-local' ? String(inp.value || '').slice(11, 16) : '', stufe = art === 'time' ? 'uhr' : 'tag';
    let mon = new Date((wert || heute).getFullYear(), (wert || heute).getMonth(), 1);
    const bg = document.createElement('div'); bg.className = 'bpd-bg' + (blatt ? ' blatt' : '');
    const m = document.createElement('div'); m.className = 'bpd'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Datum wählen'); bg.appendChild(m);
    document.body.appendChild(bg);
    const plus = (t) => { const d = new Date(heute); d.setDate(d.getDate() + t); return d; };
    const uhr = () => {   // Stunde und Minute antippen (Minuten in 5er-Schritten; eintippen geht im Feld weiter)
      const [hh, mm] = (zeit || '').split(':');
      m.innerHTML = `<div class="bpd-k">${art === 'datetime-local' ? '<button type="button" class="bpd-n" data-zt aria-label="Zurück zum Kalender">‹</button>' : ''}<b>${tag ? tag.split('-').reverse().join('.') + ' · ' : ''}${zeit || 'Uhrzeit'}</b>${blatt ? '<button type="button" class="bpd-n" data-x aria-label="Schließen">✕</button>' : ''}</div>
        <div class="bpd-ul">Stunde</div><div class="bpd-u">${Array.from({ length: 24 }, (_, h) => `<button type="button" data-h="${String(h).padStart(2, '0')}" class="${hh === String(h).padStart(2, '0') ? 'on' : h < 6 || h > 20 ? 'n' : ''}">${h}</button>`).join('')}</div>
        <div class="bpd-ul">Minute</div><div class="bpd-u">${Array.from({ length: 12 }, (_, k) => String(k * 5).padStart(2, '0')).map((x) => `<button type="button" data-mi="${x}" class="${mm === x ? 'on' : ''}">${x}</button>`).join('')}</div>
        <div class="bpd-s"><button type="button" data-jetzt>Jetzt</button>${inp.required ? '' : '<button type="button" class="weg" data-t="">Leeren</button>'}</div>`;
    };
    const zeichne = () => {
      if (stufe === 'uhr') { uhr(); return; }
      const erst = new Date(mon), start = new Date(erst); start.setDate(1 - ((erst.getDay() || 7) - 1));
      let h = `<div class="bpd-k"><button type="button" class="bpd-n" data-d="-1" aria-label="Voriger Monat">‹</button><b>${MON[mon.getMonth()]} ${mon.getFullYear()}</b><button type="button" class="bpd-n" data-d="1" aria-label="Nächster Monat">›</button>${blatt ? '<button type="button" class="bpd-n" data-x aria-label="Schließen">✕</button>' : ''}</div>
        <div class="bpd-g"><span class="w">KW</span>${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((t) => `<span class="w">${t}</span>`).join('')}`;
      for (let w = 0; w < 6; w++) {
        const z = new Date(start); z.setDate(start.getDate() + w * 7); if (w === 5 && z.getMonth() !== mon.getMonth()) break;
        h += `<span class="kw">${kw(z)}</span>`;
        for (let t = 0; t < 7; t++) { const d = new Date(z); d.setDate(z.getDate() + t); const s = iso(d), aus = (min && d < min) || (max && d > max);
          h += `<button type="button" class="t${d.getMonth() !== mon.getMonth() ? ' x' : ''}${t > 4 ? ' we' : ''}${+d === +heute ? ' heute' : ''}${inp.value === s ? ' on' : ''}" data-t="${s}"${aus ? ' disabled' : ''}>${d.getDate()}</button>`; }
      }
      h += `</div><div class="bpd-s">${[['Heute', 0], ['+1 Woche', 7], ['+2 Wochen', 14], ['+4 Wochen', 28]].map(([l, n]) => `<button type="button" data-t="${iso(plus(n))}">${l}</button>`).join('')}${inp.required ? '' : '<button type="button" class="weg" data-t="">Leeren</button>'}</div>`;
      m.innerHTML = h;
    };
    const ort = () => { if (blatt) return; const r = inp.getBoundingClientRect(), hh = m.offsetHeight, unten = innerHeight - r.bottom - 10;
      m.style.top = (hh <= unten || unten > r.top ? r.bottom + 4 : Math.max(8, r.top - hh - 4)) + 'px'; m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px'; };
    const fertig = () => { const v = art === 'time' ? zeit : `${tag}T${zeit}`; inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); zu(); };
    const nimm = (s) => { if (art === 'datetime-local' && s) { tag = s; stufe = 'uhr'; if (!zeit) zeit = '08:00'; zeichne(); ort(); return; } inp.value = s; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); zu(); };
    const aussen = (e) => { if (blatt) return; if (!m.contains(e.target) && e.target !== inp) zu(); };   // das Blatt am Handy schließt nur über ✕
    const roll = (e) => { if (!blatt && !m.contains(e.target)) ort(); };
    OFFEN = { inp, bg, aussen, ort, roll };
    zeichne(); ort();
    setTimeout(() => document.addEventListener('pointerdown', aussen, true), 0); addEventListener('resize', ort); addEventListener('scroll', roll, true);
    m.addEventListener('mousedown', (e) => e.preventDefault());   // Fokus bleibt im Feld (Tippen geht weiter)
    m.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) { zu(); return; }
      const n = e.target.closest('[data-d]'); if (n) { mon = new Date(mon.getFullYear(), mon.getMonth() + +n.dataset.d, 1); zeichne(); ort(); return; }
      if (e.target.closest('[data-zt]')) { stufe = 'tag'; zeichne(); ort(); return; }
      const h = e.target.closest('[data-h]'); if (h) { zeit = h.dataset.h + ':' + ((zeit || '').split(':')[1] || '00'); zeichne(); return; }
      const mi = e.target.closest('[data-mi]'); if (mi) { zeit = ((zeit || '').split(':')[0] || '08') + ':' + mi.dataset.mi; fertig(); return; }
      if (e.target.closest('[data-jetzt]')) { const d = new Date(); zeit = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); if (art === 'datetime-local' && !tag) tag = iso(d); fertig(); return; }
      const t = e.target.closest('[data-t]'); if (t && !t.disabled) nimm(t.dataset.t);
    });
  }
  /* Systemkalender abfangen: Maus öffnet den eigenen (Tippen im Feld bleibt), Finger nur den eigenen (keine Systemauswahl), Alt+↓ / F4 */
  document.addEventListener('mousedown', (e) => { const i = e.target.closest && e.target.closest('input'); if (!geht(i) || e.button) return; setTimeout(() => { if (!OFFEN || OFFEN.inp !== i) auf(i); }, 0); }, true);
  let tx = 0, ty = 0;
  document.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) { tx = t.clientX; ty = t.clientY; } }, { capture: true, passive: true });
  const ziel = (t) => { if (!t || !t.closest) return null; const i = t.closest('input'); if (i) return i; const l = t.closest('label'); return l && l.control && l.control.tagName === 'INPUT' ? l.control : null; };   // auch Tippen auf die Beschriftung
  document.addEventListener('touchend', (e) => { const i = ziel(e.target); if (!geht(i)) return; const t = e.changedTouches[0];
    if (t && Math.hypot(t.clientX - tx, t.clientY - ty) > 10) return;
    e.preventDefault(); auf(i); }, { capture: true, passive: false });
  document.addEventListener('keydown', (e) => { const i = e.target; if (!geht(i)) return;
    if (e.key === 'Escape' && OFFEN) { e.preventDefault(); zu(); return; }
    if (e.key === 'F4' || (e.key === 'ArrowDown' && e.altKey)) { e.preventDefault(); auf(i); } else if (e.key === 'Tab') zu(); }, true);
  document.addEventListener('focusin', (e) => { const i = e.target; if (!matchMedia('(pointer:coarse)').matches || !geht(i) || (OFFEN && OFFEN.inp === i)) return;   // Handy: nie der Systemkalender
    try { i.blur(); } catch { /* egal */ } auf(i); }, true);
  window.bpDatum = { auf, zu };
})();
