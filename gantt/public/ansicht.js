'use strict';
/* Bauzeitenplan – Ansicht für Externe: liest /api/ansicht/<Schlüssel> und zeichnet Tabelle und Balken (nur lesen). */
(() => {
  const tok = location.pathname.split('/').filter(Boolean).pop();
  const api = new URL('../api/ansicht/' + encodeURIComponent(tok), location.href);
  const $ = (s) => document.querySelector(s), esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PPD = { tag: 26, woche: 7, monat: 2.2 };
  let D = null, zoom = 'woche'; const ZU = new Set();
  try { zoom = localStorage.getItem('ak.zoom') || 'woche'; } catch { /* egal */ }
  const tag = (s) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5);
  const ausTag = (n) => new Date(n * 864e5);
  const de = (s) => s ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(2, 4)}` : '';
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  function zeichnen() {
    const Z = D.zeilen; if (!Z.length) { $('#plan').innerHTML = '<p class="ak-lade">Der Plan enthält noch keine Leistungen.</p>'; return; }
    const ppd = PPD[zoom] || 7, h0 = tag(D.heute);
    let a = Math.min(...Z.map((x) => tag(x.s))), b = Math.max(...Z.map((x) => tag(x.f)));
    a -= (ausTag(a).getUTCDay() + 6) % 7 + 3; b += 10;   // ab Montag, etwas Luft
    const frei = ($('#plan').clientWidth || 0) - (zeichnen.links || 480) - 2; if (frei > (b - a + 1) * ppd) b = a + Math.ceil(frei / ppd) - 1;   // keine leere Fläche rechts neben dem Plan
    const W = Math.ceil((b - a + 1) * ppd), X = (n) => (n - a) * ppd;
    // Zeitkopf: Monate (und je nach Maßstab Wochen/Tage)
    let kopf = '', fein = '';
    for (let d = a; d <= b;) { const t = ausTag(d), e = Math.min(b + 1, tag(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)));
      kopf += `<span style="width:${(e - d) * ppd}px">${MON[t.getUTCMonth()]} ${String(t.getUTCFullYear()).slice(2)}</span>`; d = e; }
    if (zoom !== 'monat') for (let d = a; d <= b; d += zoom === 'tag' ? 1 : 7) { const t = ausTag(d); fein += `<span style="width:${(zoom === 'tag' ? 1 : 7) * ppd}px">${zoom === 'tag' ? t.getUTCDate() : 'KW ' + kw(t)}</span>`; }
    const we = zoom === 'monat' ? '' : (() => { let s = ''; for (let d = a; d <= b; d++) { const w = ausTag(d).getUTCDay(); if (w === 6) s += `<div class="we" style="left:${X(d)}px;width:${2 * ppd}px"></div>`; } return s; })();
    const heute = h0 >= a && h0 <= b ? `<div class="heute" style="left:${X(h0)}px" title="Heute"></div>` : '';
    // sichtbare Zeilen (zugeklappte Gruppen ausblenden)
    const vis = []; let bis = -1;
    Z.forEach((x, i) => { if (bis >= 0 && x.l > bis) return; bis = -1; vis.push(i); if (x.g && ZU.has(i)) bis = x.l; });
    const P = D.fortschritt;
    const rows = vis.map((i, k) => { const x = Z[i], s = tag(x.s), f = tag(x.f), col = x.c || '#9aa3ad';
      const bal = x.m ? `<div class="ms" style="left:${X(s)}px" title="${esc(x.n)} · ${de(x.s)}"></div>`
        : `<div class="bar${x.g ? ' g' : ''}" style="left:${X(s)}px;width:${Math.max(2, (f - s + 1) * ppd)}px;${x.g ? '' : 'background:' + esc(col)}" title="${esc(x.n)} · ${de(x.s)} – ${de(x.f)}${P ? ' · ' + x.p + ' %' : ''}">${P && !x.g && x.p ? `<i style="width:${Math.min(100, x.p)}%"></i>` : ''}</div>`;
      const lab = !x.g && x.r ? `<span class="bl" style="left:${X(f + 1) + 6}px">${esc(x.r)}</span>` : '';
      return `<tr class="${x.g ? 'grp' : ''}" data-i="${i}"><td class="fix c-nr">${k + 1}</td><td class="fix c-n" style="padding-left:${0.5 + x.l * 1.1}rem"${x.g ? ` title="auf-/zuklappen"` : ''}>${x.g ? `<span class="car">${ZU.has(i) ? '▸' : '▾'}</span>` : ''}${esc(x.n)}</td>
        <td class="c-d">${de(x.s)}</td><td class="c-d${P ? '' : ' c-last'}">${de(x.f)}</td>${P ? `<td class="c-p c-last">${x.p} %</td>` : ''}<td class="bal"><div class="zeit" style="width:${W}px">${bal}${lab}</div></td></tr>`; }).join('');
    $('#plan').innerHTML = `<table><thead><tr><th class="fix c-nr">Nr.</th><th class="fix c-n">Leistung</th><th class="c-d">Anfang</th><th class="c-d${P ? '' : ' c-last'}">Ende</th>${P ? '<th class="c-p c-last">Fertig</th>' : ''}
      <th style="padding:0"><div class="zk" style="width:${W}px">${kopf}</div>${fein ? `<div class="zk" style="width:${W}px">${fein}</div>` : ''}</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
    // Wochenenden und Heute-Linie über die ganze Höhe: einmal je Zeile wäre zu viel – als Hintergrund der Zeitspalte
    $('#plan').querySelectorAll('td.bal .zeit').forEach((z) => z.insertAdjacentHTML('afterbegin', we + heute));
    const bal = $('#plan').querySelector('td.bal'); if (bal) { const l = bal.offsetLeft; if (Math.abs(l - (zeichnen.links || 0)) > 4) { zeichnen.links = l; zeichnen(); } }   // Breite der Tabelle links gemessen → Zeitachse füllt den Rest
  }
  function kw(d) { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const n = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - n + 3); const j = new Date(Date.UTC(t.getUTCFullYear(), 0, 4)); return 1 + Math.round(((t - j) / 864e5 - 3 + ((j.getUTCDay() + 6) % 7)) / 7); }
  function zuHeute() { const m = $('#plan'), h = m.querySelector('.heute'); if (h) m.scrollLeft = Math.max(0, h.offsetLeft - m.clientWidth / 3); }

  document.addEventListener('click', (e) => {
    const z = e.target.closest('[data-z]'); if (z) { zoom = z.dataset.z; try { localStorage.setItem('ak.zoom', zoom); } catch { /* egal */ } document.querySelectorAll('[data-z]').forEach((b) => b.classList.toggle('on', b === z)); zeichnen(); zuHeute(); return; }
    if (e.target.closest('#heute')) { zuHeute(); return; }
    if (e.target.closest('#drucken')) { window.print(); return; }
    const g = e.target.closest('tr.grp .c-n'); if (g) { const i = +g.closest('tr').dataset.i; if (ZU.has(i)) ZU.delete(i); else ZU.add(i); zeichnen(); }
  });
  document.querySelectorAll('[data-z]').forEach((b) => b.classList.toggle('on', b.dataset.z === zoom));
  fetch(api, { credentials: 'omit' }).then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Der Plan ist nicht erreichbar.'); return d; })
    .then((d) => {
      D = d; document.title = `${d.projekt || d.plan} – Bauzeitenplan`;
      $('#titel').textContent = d.titel || d.projekt || d.plan;
      $('#unter').textContent = [d.titel ? d.projekt : '', d.adresse, d.stand].filter(Boolean).join(' · ');
      zeichnen(); setTimeout(zuHeute, 0);
    })
    .catch((er) => { $('#plan').innerHTML = `<div class="ak-fehler"><b>${esc(er.message)}</b>Bitte wende dich an die Person, die dir den Link geschickt hat.</div>`; $('.ak-k').hidden = true; });
})();
