'use strict';
/* Stempel und Unterschriften in der Druckvorschau verschieben (Baukasten, lädt druck.js bei Bedarf): /bp/stempellage.js
   bpStempelLage.start({ S, side, info, speichern(lage), fertig() })
     S     Vorschau mit den Seiten (Kinder mit data-seite 1…n, BPHead.pdfIn) – gezeigt OHNE Stempel, hier liegen sie als verschiebbare Felder darüber
     side  Bereich links (Liste: auf welcher Seite was liegt, Gelöschtes wieder einfügen, Hinzufügen)
     info  { teile: [{ teil, von, n }], lage: [{ id, art, teil, s, x, y, w, h, weg }], vorhanden: { art: bool } }
   Ziehen verschiebt – auch auf eine andere Seite (das Feld wandert mit); Ecke ändert die Größe; ✕ löscht (bleibt in der Liste zum Wiedereinfügen).
   Gemerkt wird nur die Lage (Teil, Seite im Teil, Anteile der Seite) – das PDF wird beim Herunterladen, Drucken, Ablegen gestempelt. */
(() => {
  if (window.bpStempelLage) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NAME = { buero: 'Bürostempel', pruef: 'Prüfstempel', zahlbetrag: 'Zahlbetrag siehe Anlage', sig: 'Unterschrift' };
  const TEIL = (t) => (t === 'freigabe' ? 'Rechnungsfreigabe' : t === 'pruef' ? 'Prüfblatt' : t === 'aufmass' ? 'Massenermittlung' : t.startsWith('rechnung') ? 'Rechnung der Firma' : t);
  const BILD = (art) => (art === 'sig' ? 'api/bp/signatur' : 'api/bp/stempel/' + art);
  const css = document.createElement('style');
  css.textContent = `.bps-o{position:absolute;z-index:6;box-sizing:border-box;border:2px dashed transparent;border-radius:6px;cursor:move;touch-action:none}
.bps-o:hover,.bps-o.akt{border-color:var(--y,#2f5fb3);background:rgba(47,95,179,.05)}
.bps-o img{width:100%;height:100%;object-fit:contain;pointer-events:none;display:block}
.bps-o.sig img{filter:brightness(0) saturate(100%) invert(16%) sepia(92%) saturate(4800%) hue-rotate(354deg) brightness(88%)}
.bps-o .x{position:absolute;top:-10px;right:-10px;width:20px;height:20px;border-radius:50%;background:var(--red,#b42318);color:#fff;font-size:12px;line-height:20px;text-align:center;cursor:pointer;opacity:0}
.bps-o .g{position:absolute;right:-7px;bottom:-7px;width:14px;height:14px;border-radius:3px;background:var(--y,#2f5fb3);cursor:nwse-resize;opacity:0}
.bps-o:hover .x,.bps-o:hover .g,.bps-o.akt .x,.bps-o.akt .g{opacity:1}
@media (pointer:coarse){.bps-o .x,.bps-o .g{opacity:1}}
.bps-l{display:flex;flex-direction:column;gap:.3rem;margin-top:.6rem}.bps-l .h{font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-top:.4rem}
.bps-z{display:flex;gap:.4rem;align-items:center;font-size:.84rem;border:1px solid var(--line);border-radius:calc(7px*var(--rk,1));padding:.25rem .45rem;background:var(--card)}
.bps-z span{flex:1;min-width:0}.bps-z small{display:block;color:var(--mute)}.bps-z.weg{border-style:dashed;opacity:.8}
.bps-add{display:grid;grid-template-columns:1fr 1fr;gap:.3rem}`;
  document.head.appendChild(css);

  function start(o) {
    const { S, side, info } = o;
    let L = (info.lage || []).map((x) => ({ ...x })), akt = null;
    const teil = (seite0) => info.teile.find((t) => seite0 >= t.von && seite0 < t.von + t.n);   // Seite im Paket (0-basiert) → Teil
    const seiteVon = (x) => { const t = info.teile.find((q) => q.teil === x.teil); return t ? t.von + Math.min(x.s, t.n - 1) : null; };
    const pg = (seite0) => S.querySelector(`:scope > [data-seite="${seite0 + 1}"]`);
    const zeichnen = () => {
      S.querySelectorAll('.bps-o').forEach((d) => d.remove());
      L.forEach((x) => { if (x.weg) return; const s0 = seiteVon(x), p = s0 == null ? null : pg(s0); if (!p) return;
        const d = document.createElement('div'); d.className = 'bps-o' + (x.art === 'sig' ? ' sig' : '') + (akt === x.id ? ' akt' : ''); d.dataset.bps = x.id;
        d.title = `${NAME[x.art]} – ziehen (auch auf eine andere Seite), Ecke: Größe, ✕: löschen`;
        d.innerHTML = `<img alt="${esc(NAME[x.art])}" src="${BILD(x.art)}"><b class="x" data-bpsx title="löschen">✕</b><b class="g" title="Größe ändern"></b>`;
        Object.assign(d.style, { left: x.x * 100 + '%', top: x.y * 100 + '%', width: x.w * 100 + '%', height: x.h * 100 + '%' });
        p.style.position = 'relative'; p.appendChild(d); });
      liste();
    };
    const liste = () => {
      const auf = L.filter((x) => !x.weg), weg = L.filter((x) => x.weg), sd = (x) => { const s0 = seiteVon(x); return s0 == null ? '' : `S. ${s0 + 1} · ${TEIL(x.teil)}`; };
      const fehlt = Object.entries(info.vorhanden || {}).filter(([, v]) => !v).map(([k]) => NAME[k]);
      side.innerHTML = `<div class="bps-l"><div class="h">Stempel &amp; Unterschrift</div>
        ${auf.map((x) => `<div class="bps-z" data-bpsg="${esc(x.id)}"><span>${esc(NAME[x.art])}<small>${esc(sd(x))}</small></span><button type="button" class="ib" data-bpsx="${esc(x.id)}" title="löschen">✕</button></div>`).join('') || '<span class="hint">keine</span>'}
        ${weg.length ? `<div class="h">Gelöscht – wieder einfügen</div>${weg.map((x) => `<div class="bps-z weg"><span>${esc(NAME[x.art])}<small>war: ${esc(sd(x))}</small></span><button type="button" class="btn sm" data-bpsein="${esc(x.id)}">↺ einfügen</button></div>`).join('')}` : ''}
        <div class="h">Hinzufügen (auf die Seite im Bild)</div><div class="bps-add">${Object.keys(NAME).map((k) => `<button type="button" class="btn sm" data-bpsneu="${k}"${(info.vorhanden || {})[k] === false ? ' disabled title="noch nicht hinterlegt"' : ''}>${k === 'sig' ? '✍' : '＋'} ${esc(NAME[k])}</button>`).join('')}</div>
        ${fehlt.length ? `<p class="hint">Noch nicht hinterlegt: ${esc(fehlt.join(', '))} – Stempel unter Verwaltung → Büro-Einstellungen → Firma &amp; Logo, die Unterschrift unter Mein Konto.</p>` : ''}
        <div class="bps-add" style="margin-top:.4rem"><button type="button" class="btn sm" data-bpsvor title="Alle wieder an die vorgesehenen Stellen">↺ Vorgesehene Stellen</button><button type="button" class="btn sm pri" data-bpsok>✓ Fertig</button></div></div>`;
    };
    const imBild = () => { const r = S.getBoundingClientRect(); let best = null, bv = -1;   // Seite, die am meisten im Bild ist
      S.querySelectorAll(':scope > [data-seite]').forEach((p) => { const q = p.getBoundingClientRect(), v = Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top); if (v > bv) { bv = v; best = p; } });
      return best ? +best.dataset.seite - 1 : 0; };
    let zieh = null;
    const ab = (e) => { const d = e.target.closest('.bps-o'); if (!d || e.target.closest('[data-bpsx]')) return; e.preventDefault(); e.stopPropagation();
      const x = L.find((q) => q.id === d.dataset.bps); if (!x) return; akt = x.id; d.classList.add('akt');
      const p = d.parentElement.getBoundingClientRect(); zieh = { x, d, gr: !!e.target.closest('.g'), sx: e.clientX, sy: e.clientY, P0: { ...x }, W: p.width, H: p.height }; d.setPointerCapture(e.pointerId); };
    const zug = (e) => { if (!zieh) return; const { x, d } = zieh, dx = (e.clientX - zieh.sx) / zieh.W, dy = (e.clientY - zieh.sy) / zieh.H;
      if (zieh.gr) { const v = zieh.P0.w / zieh.P0.h; x.w = Math.max(0.05, Math.min(1 - x.x, zieh.P0.w + dx)); x.h = x.w / v; }
      else {
        const unter = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.parentElement === S && el.dataset && el.dataset.seite);
        if (unter && unter !== d.parentElement) {   // auf eine andere Seite gezogen: das Feld wandert mit (Teil und Seite im Teil neu)
          const s0 = +unter.dataset.seite - 1, t = teil(s0); if (t) { x.teil = t.teil; x.s = s0 - t.von; unter.appendChild(d); const r = unter.getBoundingClientRect();
            zieh = { ...zieh, sx: e.clientX, sy: e.clientY, W: r.width, H: r.height, P0: { ...x, x: Math.max(0, Math.min(1 - x.w, (e.clientX - r.left) / r.width - x.w / 2)), y: Math.max(0, Math.min(1 - x.h, (e.clientY - r.top) / r.height - x.h / 2)) } }; }
        }
        x.x = Math.max(0, Math.min(1 - x.w, zieh.P0.x + (e.clientX - zieh.sx) / zieh.W)); x.y = Math.max(0, Math.min(1 - x.h, zieh.P0.y + (e.clientY - zieh.sy) / zieh.H));
      }
      Object.assign(d.style, { left: x.x * 100 + '%', top: x.y * 100 + '%', width: x.w * 100 + '%', height: x.h * 100 + '%' }); };
    const los = () => { if (zieh) { zieh = null; liste(); } };
    S.addEventListener('pointerdown', ab, true); S.addEventListener('pointermove', zug); S.addEventListener('pointerup', los); S.addEventListener('pointercancel', los);
    const klick = async (e) => {
      const x_ = e.target.closest('[data-bpsx]'); if (x_) { e.stopPropagation(); const id = x_.dataset.bpsx || x_.closest('.bps-o').dataset.bps, x = L.find((q) => q.id === id); if (x) { x.weg = true; zeichnen(); } return; }
      const ein = e.target.closest('[data-bpsein]'); if (ein) { const x = L.find((q) => q.id === ein.dataset.bpsein); if (x) { x.weg = false; zeichnen(); const s0 = seiteVon(x); if (s0 != null && pg(s0)) pg(s0).scrollIntoView({ block: 'center' }); } return; }
      const neu = e.target.closest('[data-bpsneu]'); if (neu) { const s0 = imBild(), t = teil(s0); if (!t) return; const art = neu.dataset.bpsneu, w = art === 'buero' ? 0.32 : art === 'zahlbetrag' ? 0.3 : art === 'pruef' ? 0.17 : 0.2;
        const h = w * 0.707 / ({ buero: 2.6, pruef: 1, zahlbetrag: 6, sig: 3.2 }[art]); L.push({ id: art + '-' + Date.now(), art, teil: t.teil, s: s0 - t.von, x: 0.5 - w / 2, y: 0.45, w, h, weg: false }); zeichnen(); return; }
      const gz = e.target.closest('[data-bpsg]'); if (gz) { const x = L.find((q) => q.id === gz.dataset.bpsg), s0 = x && seiteVon(x); if (s0 != null && pg(s0)) pg(s0).scrollIntoView({ block: 'center' }); akt = x && x.id; zeichnen(); return; }
      if (e.target.closest('[data-bpsvor]')) { ende(); await o.speichern(null); o.fertig(); return; }
      if (e.target.closest('[data-bpsok]')) { ende(); await o.speichern(L); o.fertig(); }
    };
    side.addEventListener('click', klick); S.addEventListener('click', klick, true);
    const ende = () => { S.removeEventListener('pointerdown', ab, true); S.removeEventListener('pointermove', zug); S.removeEventListener('pointerup', los); S.removeEventListener('pointercancel', los);
      side.removeEventListener('click', klick); S.removeEventListener('click', klick, true); S.querySelectorAll('.bps-o').forEach((d) => d.remove()); side.innerHTML = ''; };
    zeichnen();
    return { ende };
  }
  window.bpStempelLage = { start };
})();
