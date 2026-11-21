'use strict';
/* Raumbuch (GO 17.11.2026, H1 I1 J1): Boden, Wand und Decke je Raum wählen – in den Details einer Raum-Zeile der Bauteile
   (bp/bauteile.js lädt diesen Baustein erst dort). Gleiche Aufbauten werden im Kern zu einer Zeile der Bauteilliste (bpcore/raumbuch.py).
   bpRaumbuch.mount(host, { basis, rev, sel: [Raum-Nr …], neu(modell) }) – rev: Stand des Modells (anderer Stand → neu laden)
   – Auswahl je Zelle (Knopf mit kleiner Liste), gilt für alle angehakten Räume, wenn der Raum angehakt ist
   – grau: Vorschlag nach Raumart, „Vorschläge übernehmen“ (alle bzw. angehakte); Fliesen an der Wand: raumhoch · bis 1,20 m · Spritzbereich
   – Rückgängig oben links (undo.js) */
(function () {
  if (window.bpRaumbuch) return;
  const esc = window.bpEsc;
  const zahl = (v) => (window.bpZahl ? bpZahl(v, 0, 1) : String(v).replace('.', ','));
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  const TEILE = [['boden', 'Boden'], ['wand', 'Wand'], ['decke', 'Decke']];
  const CACHE = {}, MEN = { m: null, ok: null };
  function menue(knopf, L, wahl) {   // kleine Auswahlliste unter dem Knopf (Esc oder Klick daneben schließt)
    zu();
    const m = document.createElement('div'); m.className = 'rb-m'; m.setAttribute('role', 'listbox');
    m.innerHTML = L.map(([k, t, sub]) => `<button type="button" data-rbw="${esc(k)}"${k === wahl ? ' class="on"' : ''}>${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`).join('');
    document.body.appendChild(m);
    const b = knopf.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(b.left, innerWidth - m.offsetWidth - 8)) + 'px';
    m.style.top = (b.bottom + m.offsetHeight + 8 > innerHeight ? Math.max(8, b.top - m.offsetHeight - 4) : b.bottom + 4) + 'px';
    MEN.m = m;
    return new Promise((ok) => { MEN.ok = ok; m.addEventListener('click', (e) => { const x = e.target.closest('[data-rbw]'); if (x) { MEN.ok = null; zu(); ok(x.dataset.rbw); } }); });
  }
  function zu() { if (MEN.m) { MEN.m.remove(); MEN.m = null; if (MEN.ok) MEN.ok(null); MEN.ok = null; } }
  document.addEventListener('pointerdown', (e) => { if (MEN.m && !MEN.m.contains(e.target)) zu(); }, true);
  document.addEventListener('keydown', (e) => { if (MEN.m && e.key === 'Escape') { e.stopPropagation(); zu(); } }, true);
  async function J(u, m, b) {
    const r = await fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || 'Der Server ist gerade nicht erreichbar.');
    return j;
  }

  const LAUF = {};   // laufende Abfragen je Basis und Stand
  function mount(host, o) {
    const S = { an: new Set() };
    const D = () => CACHE[o.basis];
    const name = (teil, vid) => ((D().vorlagen[teil] || []).find((v) => v.id === vid) || {}).name || vid;
    function zelle(r, teil) {   // Knopf statt <select>: bei vielen Räumen kein Aufbau von hunderten Auswahlfeldern
      const d = D(), e = (d.raumbuch[r.nr] || {})[teil], v = (d.vorschlag[r.nr] || {})[teil], g = (d.grund[r.nr] || {})[teil] || {};
      const txt = e ? name(teil, e.vorlage) : v ? name(teil, v.vorlage) : 'wie die Zeile' + (g.kurz ? ' (' + g.kurz.split(',')[0] + ')' : '');
      const fl = teil === 'wand' && e && d.fliesen_vorlagen.includes(e.vorlage)
        ? `<button type="button" class="rb-b rb-fl" data-rbfl="${esc(r.nr)}" title="Fliesenhöhe – der Rest der Wand bleibt in der Zeile „Wände“">${esc(d.fliesen[e.fliesen || 'raumhoch'])} ▾</button>` : '';
      return `<td class="rb-z${e ? ' gew' : v ? ' vor' : ''}"><button type="button" class="rb-b" data-rb="${esc(r.nr)}|${teil}" title="${esc(v && !e ? (v.plan ? `Aus dem Plan: „${v.plan}“` : 'Vorschlag nach Raumart') + ' – noch nicht übernommen' : txt)}">${esc(txt)} ▾</button>${fl}${v && !e && v.plan ? `<small class="rb-mu" style="display:block">Plan: ${esc(v.plan)}</small>` : ''}</td>`;
    }
    function zeichne() {
      const d = D(); if (!d || !host.isConnected) return;
      const R = d.raeume, nv = Object.keys(d.vorschlag).length, sel = new Set(o.sel || []);
      host.innerHTML = `<div class="rb"><div class="rb-k"><b>Raumbuch</b> <span class="rb-mu">Boden, Wand und Decke je Raum – gleiche Aufbauten werden zu einer Zeile. Räume anhaken: eine Auswahl gilt dann für alle angehakten.</span>
        ${nv ? `<button type="button" class="btn sm" data-rbvor>Vorschläge übernehmen${S.an.size ? ` (${S.an.size} Räume)` : ''}</button>` : ''}</div>
        <div class="rb-w"><table class="rb-t"><thead><tr><th><input type="checkbox" data-rball title="alle"${S.an.size && S.an.size === R.length ? ' checked' : ''}></th><th>Nr.</th><th>Raum</th><th class="r">Fläche</th>${TEILE.map(([, t]) => `<th>${t}</th>`).join('')}</tr></thead>
        <tbody>${R.map((r) => `<tr class="${sel.has(r.nr) ? 'sel' : ''}${S.an.has(r.nr) ? ' an' : ''}"><td><input type="checkbox" data-rban="${esc(r.nr)}"${S.an.has(r.nr) ? ' checked' : ''}></td><td>${esc(r.nr)}</td><td>${esc(r.name)}<small>${esc(r.geschoss)}</small></td><td class="r">${zahl(r.flaeche)} m²</td>${TEILE.map(([t]) => zelle(r, t)).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="rb-mu">Grau = Vorschlag nach Raumart, noch nicht übernommen. „wie die Zeile“: der Raum bleibt in der Zeile „Böden“, „Wände“ bzw. „Decken“ mit deren Aufbau. Schichten (Fliesenformat, Holzart …) wählst du in der neuen Zeile.</p></div>`;
    }
    async function senden(b, text, zurueck) {
      try {
        const r = await J(`${o.basis}/raumbuch${b.vorschlag ? '/vorschlag' : ''}`, 'POST', b);
        CACHE[o.basis] = { ...r.raumbuch, rev: r.rev }; if (o.neu) o.neu(r); else zeichne();
        if (zurueck && window.rueckgaengig) rueckgaengig(text, async () => { const x = await J(`${o.basis}/raumbuch`, 'POST', zurueck); CACHE[o.basis] = { ...x.raumbuch, rev: x.rev }; if (o.neu) o.neu(x); else zeichne(); });
      } catch (e) { sag(e.message, true); zeichne(); }
    }
    host.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('[data-rban]')) { if (t.checked) S.an.add(t.dataset.rban); else S.an.delete(t.dataset.rban); return zeichne(); }
      if (t.matches('[data-rball]')) { S.an = new Set(t.checked ? D().raeume.map((r) => r.nr) : []); return zeichne(); }
    });
    host.addEventListener('click', async (e) => {
      const kb = e.target.closest('[data-rb],[data-rbfl]');
      if (kb) {
        const d = D(), fl = !!kb.dataset.rbfl, nr = fl ? kb.dataset.rbfl : kb.dataset.rb.split('|')[0], teil = fl ? 'wand' : kb.dataset.rb.split('|')[1];
        const e0 = (d.raumbuch[nr] || {})[teil], v = (d.vorschlag[nr] || {})[teil], g = (d.grund[nr] || {})[teil] || {};
        const L = fl ? Object.entries(d.fliesen).map(([k, t]) => [k, t, k === 'raumhoch' ? '' : 'Rest der Wand: wie die Zeile „Wände“'])
          : [['', 'wie die Zeile', g.kurz || 'der Raum bleibt in der Grundzeile']].concat(v && !e0 ? [[v.vorlage, name(teil, v.vorlage), 'Vorschlag nach Raumart']] : [])
            .concat((d.vorlagen[teil] || []).filter((x) => !(v && !e0 && x.id === v.vorlage)).map((x) => [x.id, x.name, '']));
        const w = await menue(kb, L, fl ? (e0 && e0.fliesen) || 'raumhoch' : e0 ? e0.vorlage : '');
        if (w === null) return;
        const nrs = S.an.has(nr) ? [...S.an] : [nr];
        const alt = Object.fromEntries(nrs.map((n) => [n, (d.raumbuch[n] || {})[teil] || null]));
        if (fl) return senden({ raeume: nrs, teil, vorlage: e0.vorlage, fliesen: w }, 'Fliesenhöhe geändert', { teil, zurueck: alt });
        return senden({ raeume: nrs, teil, vorlage: w }, `${TEILE.find((x) => x[0] === teil)[1]}: ${w ? name(teil, w) : 'wie die Zeile'} (${nrs.length === 1 ? nr : nrs.length + ' Räume'})`, { teil, zurueck: alt });
      }
      if (!e.target.closest('[data-rbvor]')) return;
      const d = D(), nrs = S.an.size ? [...S.an] : null, alt = {};
      for (const [t] of TEILE) alt[t] = Object.fromEntries((nrs || d.raeume.map((r) => r.nr)).map((n) => [n, (d.raumbuch[n] || {})[t] || null]));
      (async () => {
        try {
          const r = await J(`${o.basis}/raumbuch/vorschlag`, 'POST', nrs ? { raeume: nrs } : {});
          CACHE[o.basis] = { ...r.raumbuch, rev: r.rev }; if (o.neu) o.neu(r); else zeichne();
          sag(`Vorschläge übernommen – ${r.n} Angaben.`);
          if (window.rueckgaengig) rueckgaengig('Vorschläge übernommen', async () => { let x; for (const [t] of TEILE) x = await J(`${o.basis}/raumbuch`, 'POST', { teil: t, zurueck: alt[t] }); CACHE[o.basis] = { ...x.raumbuch, rev: x.rev }; if (o.neu) o.neu(x); else zeichne(); });
        } catch (er) { sag(er.message, true); }
      })();
    });
    if (D() && D().rev === o.rev) zeichne();
    else {   // eine Abfrage je Stand – zeichnen die Details mehrmals hintereinander, warten alle auf dieselbe Antwort
      host.innerHTML = '<p class="rb-mu">Lade Raumbuch …</p>';
      const k = o.basis + '|' + o.rev;
      if (!LAUF[k]) LAUF[k] = J(`${o.basis}/raumbuch`).then((d) => { if (!d || !Array.isArray(d.raeume) || !d.vorlagen) throw new Error('Raumbuch nicht lesbar.'); CACHE[o.basis] = { raumbuch: {}, vorschlag: {}, grund: {}, ...d, rev: o.rev }; }).finally(() => { delete LAUF[k]; });
      LAUF[k].then(() => { if (host.isConnected) zeichne(); }, (e) => { host.innerHTML = `<p class="rb-mu">${esc(e.message)}</p>`; });
    }
  }

  if (!document.getElementById('bp-rb-css')) {
    const s = document.createElement('style'); s.id = 'bp-rb-css';
    s.textContent = `.rb{margin-top:.6rem;border-top:1px solid var(--line);padding-top:.5rem}.rb-k{display:flex;flex-wrap:wrap;gap:.3rem .6rem;align-items:baseline;margin-bottom:.35rem}
.rb-mu{color:var(--mute);font-size:.82rem}.rb-k .btn{margin-left:auto}.rb-w{overflow-x:auto}.rb-t{border-collapse:collapse;width:100%;font-size:.84rem}
.rb-t th{text-align:left;color:var(--mute);font-weight:600;font-size:.74rem;padding:.2rem .35rem;border-bottom:1px solid var(--line)}.rb-t td{padding:.15rem .35rem;border-bottom:1px solid var(--line);vertical-align:middle}
.rb-t td.r,.rb-t th.r{text-align:right;white-space:nowrap}.rb-t td small{display:block;color:var(--mute);font-size:.72rem}.rb-t tr.sel td{background:color-mix(in srgb,var(--af,var(--acc)) 8%,transparent)}
.rb-t tr.an td{background:color-mix(in srgb,var(--af,var(--acc)) 14%,transparent)}.rb-b{border:1px solid var(--line);border-radius:6px;background:var(--card,#fff);color:inherit;font:inherit;font-size:.82rem;padding:.08rem .45rem;cursor:pointer;max-width:14rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.rb-z.vor .rb-b{color:var(--mute);font-style:italic;border-style:dashed}.rb-z.gew .rb-b{font-weight:600}.rb-fl{display:block;margin-top:.15rem;font-size:.75rem}
.rb-m{position:fixed;z-index:2147483050;background:var(--card,#fff);border:1px solid var(--line);border-radius:8px;box-shadow:0 10px 26px rgba(0,0,0,.16);max-height:min(22rem,60vh);overflow:auto;min-width:13rem;padding:.2rem 0}
.rb-m button{display:block;width:100%;text-align:left;border:0;background:none;color:inherit;font:inherit;font-size:.84rem;padding:.25rem .7rem;cursor:pointer}.rb-m button:hover{background:var(--hov)}
.rb-m button.on{font-weight:700}.rb-m small{display:block;color:var(--mute);font-size:.72rem}`;
    document.head.appendChild(s);
  }
  window.bpRaumbuch = { mount, vergessen: (basis) => { delete CACHE[basis]; } };
})();
