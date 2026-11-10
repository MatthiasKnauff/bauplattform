/* Farbschemata (Programmeinstellungen)
   dunkel   – wie das Bautagebuch: dunkle Flächen, Akzent Korallrot (Standard)
   hell     – helle Flächen, Akzent Korallrot
   klassisch – Grün im Stil klassischer Projektsoftware
   auto     – dunkel oder hell nach Systemeinstellung
   Das dunkle Schema wird zur Laufzeit aus style.css abgeleitet: neutrale und helle Töne werden
   umgekehrt, kräftige Farben aufgehellt. Regeln mit „data-theme“ in style.css legen Akzent und
   Kopfleiste je Schema fest und haben Vorrang. Druckvorschau und Ausdruck bleiben hell. */
window.BP_SCHEMA_EIGEN = true;   // Farbschema macht der Bauzeitenplan selbst (unten) – der Baukasten streicht hier nicht an
window.BP_UNDO_EIGEN = true;     // Strg+Z / Strg+Y gehören dem Rückgängig des Plans
(function () {
  const KEY = 'gantt.theme';
  const THEMES = [['dunkel', 'Dunkel (wie Bautagebuch)'], ['hell', 'Hell'], ['klassisch', 'Klassisch Grün'], ['auto', 'Automatisch nach System']];
  const get = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return THEMES.some((t) => t[0] === v) ? v : 'dunkel'; } catch { return 'dunkel'; } };
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const eff = (t) => (t === 'auto' ? (mq && mq.matches ? 'dunkel' : 'hell') : t);

  /* ---- Farbumrechnung ---- */
  function parse(c) {
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map((x) => x + x).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
    m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i.exec(c);
    if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]];
    if (c === 'white') return [255, 255, 255, 1];
    if (c === 'black') return [0, 0, 0, 1];
    return null;
  }
  function toHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function fromHsl(h, s, l) {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return [f(0), f(8), f(4)];
  }
  const hex = ([r, g, b]) => '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  function darkColor(c) {
    const p = parse(c); if (!p) return c;
    const [r, g, b, a] = p;
    if (a < 1) {   // Schatten und Abdunklungen bleiben, helle Schleier werden dunkel
      if (r + g + b < 60) return c;
      if (r + g + b > 700) return `rgba(255,255,255,${Math.min(0.12, a)})`;
    }
    const [h, s, l] = toHsl(p);
    let s2 = s, l2;
    const inv = (x) => 0.135 + (1 - x) * 0.74;
    if (s < 0.16) l2 = inv(l);                              // Grautöne umkehren
    else if (l > 0.72) { l2 = inv(l) + 0.03; s2 = Math.min(s, 0.32); }   // helle Tönungen → dunkle Tönungen
    else if (l < 0.5) l2 = Math.max(l, 0.64);               // dunkle Schrift-/Linienfarben aufhellen
    else l2 = l;
    const out = hex(fromHsl(h, s2, l2));
    return a < 1 ? `rgba(${parseInt(out.slice(1, 3), 16)},${parseInt(out.slice(3, 5), 16)},${parseInt(out.slice(5, 7), 16)},${a})` : out;
  }
  const COLRE = /#[0-9a-f]{3,6}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b/gi;
  const SKIP = /data-theme|pr-page|ppage|printRoot|\.pr-prev|\.pr-pages|\.bph/;   // .bph = gemeinsame Kopfleiste, bleibt immer dunkel
  function scopeSel(sel, t) {
    const pre = `html[data-theme="${t}"]`;
    return sel.split(',').map((x) => {
      x = x.trim();
      if (x === ':root' || x === 'html') return pre;
      if (/^html\b/.test(x)) return `:where(${pre})` + x.slice(4);
      return `:where(${pre}) ${x}`;   // gleiche Spezifität wie das Original – spezifischere Regeln (z. B. .btn.primary) behalten Vorrang
    }).join(',');
  }
  function buildDark(t) {
    let out = `html[data-theme="${t}"]{color-scheme:dark}\n`;
    // Variablen, die style.css für dieses Schema ausdrücklich setzt, nicht überschreiben
    const own = new Set();
    for (const ss of document.styleSheets) { let rr; try { rr = ss.cssRules; } catch { continue; } for (const r of rr || []) if (r.selectorText === `html[data-theme="${t}"]` && r.style) for (let i = 0; i < r.style.length; i++) own.add(r.style[i]); }
    for (const ss of document.styleSheets) {
      let rules; try { rules = ss.cssRules; } catch { continue; }
      if (!rules || (ss.ownerNode && ss.ownerNode.id === 'themeGen')) continue;
      for (const r of rules) {
        if (!r.style || !r.selectorText || SKIP.test(r.selectorText)) continue;   // @media print u. a. haben kein selectorText
        let decl = '';
        for (let i = 0; i < r.style.length; i++) {
          const pn = r.style[i], v = r.style.getPropertyValue(pn);
          if (!v || !COLRE.test(v) || own.has(pn)) { COLRE.lastIndex = 0; continue; }
          COLRE.lastIndex = 0;
          const nv = v.replace(COLRE, (m) => darkColor(m));
          if (nv !== v) decl += `${pn}:${nv}${r.style.getPropertyPriority(pn) ? ' !important' : ''};`;
        }
        if (decl) out += `${scopeSel(r.selectorText, t)}{${decl}}\n`;
      }
    }
    return out;
  }
  function apply(t) {
    const e = eff(t);
    document.documentElement.dataset.theme = e;
    let st = document.getElementById('themeGen');
    if (e !== 'dunkel') { if (st) st.textContent = ''; return; }
    if (!st) {
      st = document.createElement('style'); st.id = 'themeGen';
      const link = document.querySelector('link[rel=stylesheet]');
      // nach style.css: überschreibt bei gleicher Spezifität; ausdrückliche Schema-Regeln sind spezifischer
      if (link && link.nextSibling) link.parentNode.insertBefore(st, link.nextSibling); else document.head.appendChild(st);
    }
    if (!st.textContent) st.textContent = buildDark('dunkel');
  }
  document.documentElement.dataset.theme = eff(get());
  const init = () => apply(get());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (get() === 'auto') apply('auto'); });
  window.addEventListener('storage', (e) => { if (e.key === KEY) apply(get()); });   // Zweitfenster folgt
  window.Theme = {
    list: THEMES, get,
    set(t) { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* egal */ } apply(t); },
    effective: () => eff(get()),
    darkColor,
  };
})();
