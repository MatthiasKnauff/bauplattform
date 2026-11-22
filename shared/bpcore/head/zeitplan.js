'use strict';
/* Bauzeitenplan zum Ansehen (nur lesen): Tabelle links (Nr., Leistung, Anfang, Ende, Fertig) und Balken rechts, Maßstab Tage/Wochen/Monate,
   Heute-Linie, Gruppen auf-/zuklappen. Ein Baustein für die Link-Ansicht (gantt/public/ansicht.js) und das Bauherrenportal (bauherren/static/bh.js).
   Daten: { zeilen: [{ n, l, s, f, g, m, gw, c, r, p }], heute: 'JJJJ-MM-TT', fortschritt } – Zeilen baut der Kern (bpcore/zeitplan.py).
   Ohne style-Attribute: Lagen und Farben setzt das Skript per CSSOM, der Stil kommt als CSSOM-Blatt – geht unter strenger CSP (Portal: style-src 'self').

   const z = bpZeitplan.mount(el, D, { leiste: true });   // el ist der Bereich, der rollt
   z.zoom('monat'); z.heute(); */
(() => {
  if (window.bpZeitplan) return;
  const STIL = `.zp{--zl:#e2e0da;--zm:#6b6d70;--zk:#fff;--zx:#faf9f7;--zh:#d63b3b;--zg:#3b3d42;--za:var(--acc,var(--af,#3b5bab))}
.zp-l{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:0 0 .5rem}
.zp-l button{font:inherit;font-size:.9rem;border:1px solid var(--zl);background:var(--zk);color:inherit;border-radius:8px;padding:.3rem .75rem;cursor:pointer}
.zp-seg{display:inline-flex;border:1px solid var(--zl);border-radius:8px;overflow:hidden}.zp-seg button{border:0;border-radius:0}.zp-seg button.on{background:var(--za);color:#fff}
.zp-s{overflow:auto;position:relative}
.zp table{border-collapse:separate;border-spacing:0;font-size:.85rem;width:auto;margin:0}
.zp th,.zp td{height:30px;vertical-align:middle;padding:0 .5rem;border:0;border-bottom:1px solid var(--zl);white-space:nowrap;background:var(--zk);text-align:left;font-weight:400}
.zp thead th{position:sticky;top:0;z-index:3;background:var(--zx);font-weight:600;color:var(--zm);height:auto;padding:.35rem .5rem}
.zp .fix{position:sticky;z-index:2}.zp thead .fix{z-index:4}
.zp .c-nr{left:0;width:2.6rem;min-width:2.6rem;color:var(--zm);text-align:right}
.zp .c-n{left:2.6rem;min-width:16rem;max-width:22rem;overflow:hidden;text-overflow:ellipsis}
.zp .c-d{min-width:5.6rem}.zp .c-p{min-width:3.6rem;text-align:right}
.zp .c-last{border-right:1px solid var(--zl)}
.zp tr.grp td{font-weight:700}.zp tr.grp .c-n{cursor:pointer}.zp .car{display:inline-block;width:1em}
.zp td.bal{position:relative;padding:0}
.zp .zeit{position:relative;height:100%}
.zp .zk{display:flex;font-size:.72rem;color:var(--zm);font-weight:400}.zp .zk span{flex:none;border-left:1px solid var(--zl);padding:0 .25rem;overflow:hidden;white-space:nowrap}
.zp .bar{position:absolute;top:8px;height:14px;border-radius:3px;background:#9aa3ad}
.zp .bar i{position:absolute;left:0;top:0;bottom:0;background:rgba(0,0,0,.28);border-radius:3px 0 0 3px}
.zp .bar.pf::before{content:"";position:absolute;inset:0;background:#fff;opacity:.68;border-radius:3px}.zp .bar.pf i{background:inherit;z-index:1}   /* wie im Bauzeitenplan: offen hell, erledigt kräftig (SI2-2 A) */
.zp .bar.g{top:11px;height:7px;background:var(--zg);border-radius:0}.zp .bar.g::before,.zp .bar.g::after{content:"";position:absolute;bottom:-5px;border:5px solid transparent;border-top-color:var(--zg)}.zp .bar.g::before{left:-5px}.zp .bar.g::after{right:-5px}
.zp .ms{position:absolute;top:8px;width:13px;height:13px;background:var(--zg);transform:rotate(45deg);margin-left:-6px}
.zp .bl{position:absolute;top:6px;font-size:.72rem;color:var(--zm);white-space:nowrap}
.zp .we{position:absolute;top:0;bottom:0;background:rgba(0,0,0,.035)}
.zp .heute{position:absolute;top:0;bottom:0;width:0;border-left:2px solid var(--zh);z-index:1}
.zp-leer{padding:2rem;text-align:center;color:var(--zm)}
@media (max-width:700px){.zp .c-d,.zp .c-p{display:none}.zp .c-n{min-width:8rem;max-width:9.5rem}}
@media print{.zp-l{display:none}.zp-s{overflow:visible!important;max-height:none!important}.zp thead th,.zp .fix{position:static}}`;
  function stil() {
    if (window.bpZeitplanStil) return; window.bpZeitplanStil = true;
    try { const b = new CSSStyleSheet(); b.replaceSync(STIL); document.adoptedStyleSheets = [...document.adoptedStyleSheets, b]; }
    catch { const s = document.createElement('style'); s.textContent = STIL; document.head.appendChild(s); }
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PPD = { tag: 26, woche: 7, monat: 2.2 };
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const tag = (s) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5);
  const ausTag = (n) => new Date(n * 864e5);
  const de = (s) => s ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(2, 4)}` : '';
  const iso = (d) => d.toISOString().slice(0, 10);
  function kw(d) { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const n = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - n + 3); const j = new Date(Date.UTC(t.getUTCFullYear(), 0, 4)); return 1 + Math.round(((t - j) / 864e5 - 3 + ((j.getUTCDay() + 6) % 7)) / 7); }
  const LS = { get() { try { return localStorage.getItem('zp.zoom'); } catch { return null; } }, set(v) { try { localStorage.setItem('zp.zoom', v); } catch { /* egal */ } } };

  function mount(host, D, opt = {}) {
    stil();
    host.classList.add('zp'); host.replaceChildren();
    let zoom = PPD[opt.zoom] ? opt.zoom : (PPD[LS.get()] ? LS.get() : 'woche'), links = 0;
    const ZU = new Set();
    const Z = Array.isArray(D && D.zeilen) ? D.zeilen.filter((x) => x && x.s && x.f) : [];
    const leiste = opt.leiste ? document.createElement('div') : null;
    if (leiste) {
      leiste.className = 'zp-l';
      leiste.innerHTML = `<span class="zp-seg" role="group" aria-label="Maßstab"><button type="button" data-zz="tag">Tage</button><button type="button" data-zz="woche">Wochen</button><button type="button" data-zz="monat">Monate</button></span><button type="button" data-zh>Heute</button>`;
      host.appendChild(leiste);
    }
    const sc = opt.leiste ? document.createElement('div') : host;   // was rollt: mit eigener Leiste ein Kasten darunter, sonst der Bereich selbst
    if (sc !== host) { sc.className = 'zp-s'; host.appendChild(sc); }
    const knoepfe = () => leiste && leiste.querySelectorAll('[data-zz]').forEach((b) => b.classList.toggle('on', b.dataset.zz === zoom));

    function zeichnen() {
      if (!Z.length) { sc.innerHTML = '<p class="zp-leer">Der Plan enthält noch keine Leistungen.</p>'; return; }
      const ppd = PPD[zoom], h0 = tag(D.heute || iso(new Date()));
      let a = Math.min(...Z.map((x) => tag(x.s))), b = Math.max(...Z.map((x) => tag(x.f)));
      a -= (ausTag(a).getUTCDay() + 6) % 7 + 3; b += 10;   // ab Montag, etwas Luft
      const frei = (sc.clientWidth || 0) - (links || 480) - 2; if (frei > (b - a + 1) * ppd) b = a + Math.ceil(frei / ppd) - 1;   // keine leere Fläche rechts neben dem Plan
      const W = Math.ceil((b - a + 1) * ppd), X = (n) => Math.round((n - a) * ppd);
      let kopf = '', fein = '';
      for (let d = a; d <= b;) { const t = ausTag(d), e = Math.min(b + 1, tag(iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1)))));
        kopf += `<span data-w="${(e - d) * ppd}">${MON[t.getUTCMonth()]} ${String(t.getUTCFullYear()).slice(2)}</span>`; d = e; }
      if (zoom !== 'monat') for (let d = a; d <= b; d += zoom === 'tag' ? 1 : 7) { const t = ausTag(d); fein += `<span data-w="${(zoom === 'tag' ? 1 : 7) * ppd}">${zoom === 'tag' ? t.getUTCDate() : 'KW ' + kw(t)}</span>`; }
      let we = ''; if (zoom !== 'monat') for (let d = a; d <= b; d++) if (ausTag(d).getUTCDay() === 6) we += `<div class="we" data-x="${X(d)}" data-w="${2 * ppd}"></div>`;
      const heute = h0 >= a && h0 <= b ? `<div class="heute" data-x="${X(h0)}" title="Heute"></div>` : '';
      const vis = []; let bis = -1;
      Z.forEach((x, i) => { if (bis >= 0 && x.l > bis) return; bis = -1; vis.push(i); if (x.g && ZU.has(i)) bis = x.l; });
      const P = !!D.fortschritt;
      const rows = vis.map((i, k) => { const x = Z[i], s = tag(x.s), f = tag(x.f), p = Math.min(100, Math.max(0, +x.p || 0));
        const bal = x.m ? `<div class="ms" data-x="${X(s)}" title="${esc(x.n)} · ${de(x.s)}"></div>`
          : `<div class="bar${x.g ? ' g' : P ? ' pf' : ''}" data-x="${X(s)}" data-w="${Math.max(2, Math.round((f - s + 1) * ppd))}"${x.g ? '' : ` data-c="${esc(x.c || '')}"`} title="${esc(x.n)} · ${de(x.s)} – ${de(x.f)}${P ? ' · ' + p + ' %' : ''}">${P && !x.g && p ? `<i data-p="${p}"></i>` : ''}</div>`;
        const lab = !x.g && x.r ? `<span class="bl" data-x="${X(f + 1) + 6}">${esc(x.r)}</span>` : '';
        return `<tr class="${x.g ? 'grp' : ''}" data-i="${i}"><td class="fix c-nr">${k + 1}</td><td class="fix c-n" data-l="${x.l || 0}"${x.g ? ' title="auf-/zuklappen"' : ''}>${x.g ? `<span class="car">${ZU.has(i) ? '▸' : '▾'}</span>` : ''}${esc(x.n)}</td>
          <td class="c-d">${de(x.s)}</td><td class="c-d${P ? '' : ' c-last'}">${de(x.f)}</td>${P ? `<td class="c-p c-last">${p} %</td>` : ''}<td class="bal"><div class="zeit" data-w="${W}">${we}${heute}${bal}${lab}</div></td></tr>`; }).join('');
      const tp = document.createElement('template');
      tp.innerHTML = `<table><thead><tr><th class="fix c-nr">Nr.</th><th class="fix c-n">Leistung</th><th class="c-d">Anfang</th><th class="c-d${P ? '' : ' c-last'}">Ende</th>${P ? '<th class="c-p c-last">Fertig</th>' : ''}
        <th class="zp-zt"><div class="zk" data-w="${W}">${kopf}</div>${fein ? `<div class="zk" data-w="${W}">${fein}</div>` : ''}</th></tr></thead><tbody>${rows}</tbody></table>`;
      // Lagen und Farben per CSSOM (kein style-Attribut im Markup) – vor dem Einsetzen, damit die Tabelle einmal mit den richtigen Maßen angeordnet wird
      tp.content.querySelectorAll('[data-x],[data-w],[data-c],[data-l],[data-p]').forEach((e) => { const d = e.dataset, st = e.style;
        if (d.x) st.left = d.x + 'px'; if (d.w) st.width = d.w + 'px'; if (d.c && /^#[0-9a-f]{3,8}$|^rgb/i.test(d.c)) st.background = d.c;
        if (d.l) st.paddingLeft = (0.5 + (+d.l) * 1.1) + 'rem'; if (d.p) st.width = d.p + '%'; });
      const zt = tp.content.querySelector('.zp-zt'); if (zt) zt.style.padding = '0';
      sc.replaceChildren(tp.content);
      const bal = sc.querySelector('td.bal'); if (bal) { const l = bal.offsetLeft; if (Math.abs(l - links) > 4) { links = l; zeichnen(); } }   // Tabelle links gemessen → Zeitachse füllt den Rest
    }
    function zuHeute() { const h = sc.querySelector('.heute'); if (h) sc.scrollLeft = Math.max(0, h.offsetLeft + (links || 0) - sc.clientWidth / 3); }
    function setze(z) { if (!PPD[z]) return; zoom = z; LS.set(z); knoepfe(); zeichnen(); zuHeute(); }
    host.addEventListener('click', (e) => {
      const z = e.target.closest('[data-zz]'); if (z) { setze(z.dataset.zz); return; }
      if (e.target.closest('[data-zh]')) { zuHeute(); return; }
      const g = e.target.closest('tr.grp .c-n'); if (g) { const i = +g.closest('tr').dataset.i; if (ZU.has(i)) ZU.delete(i); else ZU.add(i); zeichnen(); }
    });
    knoepfe(); zeichnen(); setTimeout(zuHeute, 0);
    return { zoom: setze, heute: zuHeute, get stufe() { return zoom; } };
  }
  window.bpZeitplan = { mount };
})();
