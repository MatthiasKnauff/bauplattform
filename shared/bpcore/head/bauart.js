'use strict';
/* =====================================================================
   Bauart wählen in drei Ebenen – für den Planungsassistenten im Bauzeitenplan (gantt/public/assist.js)
   und den Planungsassistenten aller Apps (bp/assistent.js). Rechnet nichts selbst: Gebäude, Maßnahmen,
   Bereiche und Denkmal kommen aus dem Katalog (plankatalog.js: kombi), der Typ aus PlanKern.kombiKey.

     bpBauart.html(type, { wahl, kachel: 'Klasse der Gebäude-Kachel', attr: (k) => '', teile: 'HTML der Liste der Gebäudeteile', bestand })  → HTML
       (mit teile: Neubau, Anbau, Aufstockung, Umbau stehen nicht als Chips da – sie folgen der Liste; Bestandsmaßnahmen nur mit einem Teil „Bestand“)
     bpBauart.klick(ziel, wahl | type) → neue Wahl {geb, mass, ber, dm} oder null (Klick gehörte nicht dazu)
     bpBauart.typ(wahl) → Typ „k:ef:an.um:da:d“ · bpBauart.wahl(type) → Wahl aus einem Typ (alte Typen: leer)

   Gebäude: genau eines · Maßnahmen: eine oder mehrere (Neubau schließt die Bestandsmaßnahmen aus, Abbruch darf dazu)
   · Bereiche: keiner = alles, sonst nur diese · Denkmal: Haken.
   ===================================================================== */
window.bpBauart = (() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K = () => window.PlanKern, KB = () => (K() && K().C.kombi) || { geb: [], mass: [], ber: [] };
  function css() {
    if (document.getElementById('bpa-css')) return;
    const st = document.createElement('style'); st.id = 'bpa-css';
    st.textContent = `.bpa{display:grid;gap:.5rem}.bpa-l{font-size:.78em;color:var(--mute,#6b6f76);text-transform:uppercase;letter-spacing:.04em;margin-top:.2rem}
.bpa-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr));gap:6px}.bpa-g>button>span{min-width:0;overflow-wrap:anywhere;hyphens:auto}.bpa-g>button>span>small{display:block}.bpa-g>button>.ic+span{grid-row:1 / 3}
.bpa-cs{display:flex;flex-wrap:wrap;gap:5px}
.bpa-c{border:1px solid var(--line,#d5d5d5);background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(99px*var(--rk,1));padding:.2rem .7rem;font:inherit;font-size:.9em;cursor:pointer}
.bpa-c.on{background:color-mix(in srgb,var(--af,#2f5fb3) 14%,var(--card,#fff));border-color:var(--af,#2f5fb3);color:var(--af,#2f5fb3);font-weight:600}
.bpa-c:disabled{opacity:.45;cursor:default}.bpa-dm{display:flex;align-items:center;gap:.4rem;font-size:.92em}.bpa-alt{font-size:.85em;color:var(--mute,#6b6f76)}`;
    document.head.appendChild(st);
  }
  const TEILE = ['nb', 'an', 'au', 'um'];   // mit o.teile (Liste der Gebäudeteile, GG-D1) folgen diese Maßnahmen der Liste
  const wahl = (type) => { const t = K() && K().kombiTeile(type); return t ? { geb: t.geb, mass: t.mass.slice(), ber: t.ber.slice(), dm: t.dm } : { geb: '', mass: [], ber: [], dm: false }; };
  const typ = (w) => K().kombiKey({ geb: w.geb || 'ef', mass: w.mass && w.mass.length ? w.mass : ['nb'], ber: w.ber || [], dm: !!w.dm });
  function html(type, o = {}) {
    css();
    const w = o.wahl || wahl(type), B = KB(), kl = o.kachel || 'bpa-k', attr = o.attr || (() => '');
    const alt = type && !K().istKombi({ type }) && K().PROF[type] ? K().PROF[type].n : '';
    const nb = w.mass.includes('nb');
    return `<div class="bpa">${alt ? `<div class="bpa-alt">Bisher: <b>${esc(alt)}</b> – neu wählen, um nach Gebäude, Maßnahmen und Bereichen zu planen.</div>` : ''}
      <div class="bpa-l">Gebäude</div><div class="bpa-g">${B.geb.map((g) => `<button type="button" class="${kl}${w.geb === g.k ? ' on' : ''}" data-bpa-geb="${g.k}" ${attr(g.k)}><span class="ic">${g.ic}</span><span><b>${esc(g.n)}</b><small>${esc(g.desc)}</small></span></button>`).join('')}</div>
      ${o.teile != null ? `<div class="bpa-l">Gebäudeteile</div>${o.teile}` : ''}
      <div class="bpa-l">${o.teile == null ? 'Maßnahmen – eine oder mehrere' : o.bestand ? 'Am Bestand – eine oder mehrere' : 'Außerdem'}</div><div class="bpa-cs">${B.mass.filter((m) => o.teile == null || (!TEILE.includes(m.k) && (o.bestand || m.k === 'ab'))).map((m) => `<button type="button" class="bpa-c${w.mass.includes(m.k) ? ' on' : ''}" data-bpa-mass="${m.k}"${nb && m.k !== 'nb' && m.k !== 'ab' ? ' title="Neubau schließt Bestandsmaßnahmen aus – Klick wechselt"' : ''}>${esc(m.n)}</button>`).join('')}</div>
      <div class="bpa-l">Bereiche – keiner gewählt = alles</div><div class="bpa-cs">${B.ber.map((b) => `<button type="button" class="bpa-c${w.ber.includes(b.k) ? ' on' : ''}" data-bpa-ber="${b.k}">${esc(b.n)}</button>`).join('')}</div>
      <label class="bpa-dm"><input type="checkbox" data-bpa-dm${w.dm ? ' checked' : ''}> Denkmalschutz (Erlaubnis, Befund, Bemusterung, Dokumentation; Bestand +40 %)</label></div>`;
  }
  function klick(ziel, w0) {
    const el = ziel && ziel.closest && ziel.closest('[data-bpa-geb],[data-bpa-mass],[data-bpa-ber],[data-bpa-dm]'); if (!el) return null;
    const w = typeof w0 === 'string' || !w0 ? wahl(w0) : { geb: w0.geb, mass: w0.mass.slice(), ber: w0.ber.slice(), dm: !!w0.dm };
    if (!w.geb) w.geb = 'ef';
    if (el.dataset.bpaGeb) w.geb = el.dataset.bpaGeb;
    else if (el.dataset.bpaMass) {
      const m = el.dataset.bpaMass, an = w.mass.includes(m);
      w.mass = an ? w.mass.filter((x) => x !== m) : [...w.mass, m];
      if (!an && m === 'nb') w.mass = w.mass.filter((x) => x === 'nb' || x === 'ab');   // Neubau: Bestandsmaßnahmen raus
      else if (!an && m !== 'ab') w.mass = w.mass.filter((x) => x !== 'nb');
      if (!w.mass.length) w.mass = ['nb'];
    } else if (el.dataset.bpaBer) { const b = el.dataset.bpaBer; w.ber = w.ber.includes(b) ? w.ber.filter((x) => x !== b) : [...w.ber, b]; }
    else if (el.hasAttribute('data-bpa-dm')) w.dm = !!el.checked;
    if (!w.mass.length) w.mass = ['nb'];
    return w;
  }
  return { html, klick, typ, wahl };
})();
