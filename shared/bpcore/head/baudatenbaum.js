/* Baudaten-Baum – gemeinsamer Baustein (/bp/baudatenbaum.js, GO 23.11.2026, Mock „Baudaten-Baum“ BB-1 … BB-7 alle A).
   EIN Baum für die App Baudaten und (Etappe 2) den Reiter „Baudaten“ im LV: Baumtabelle (bpBaum.zelle, Ausschnitt beim Rollen,
   Tastatur, Spaltenbreiten ziehen – bpSpaltBreite), Leiste „Gruppieren:“ (bpGruppen); EP einzeilig – von–bis nur rechts in den Details, Haken je Zeile mit schwebender Leiste „n gewählt“, ★ oft geöffnete Leistungsbereiche.
   Gruppen und ihre Zahlen rechnet der Server (GET <url>?ebenen=…&pfad=[…] – bpcore/baudaten.baum), Positionen kommen erst beim
   Aufklappen (je 300, „weitere …“) – nie ein ganzer Katalog im Browser. Beim Suchen gehen Gruppen mit Treffern von selbst auf.

   const B = bpBaudatenBaum.mount(el, {
     key,                  Name zum Merken (Ebenen, offene Gruppen, ★) – je Stelle eigener Stand
     url,                  Adresse der Abfrage (z. B. 'api/baum')
     filter: () => '…',    weitere Abfrage-Werte (URLSearchParams als Text: katalog, q, kg, einheit …)
     suche: () => bool,    gerade Suche/Filter aktiv → Gruppen mit Treffern aufklappen
     ebenen: { katalog: 'Katalog', lb: 'Leistungsbereich', … }   wählbare Ebenen · vorgabe: ['katalog', 'lb', 'gruppe']
     mark: (text) → HTML   Suchwörter hervorheben (sonst nur esc)
     extra: (x) → HTML     Knopf hinter dem Preis je Position (z. B. ＋/✓ Korb) – keine eigene Spalte: die letzte Spalte nimmt beim Ziehen den Rest
     aktionen: [{ k, t }]  Knöpfe der schwebenden Leiste · aktion(k, ids, positionen)
     zeige(x)              Klick auf eine Position · doppel(x) Doppelklick · ziehen(e, ids, positionen) Ziehen beginnt
     leer                  Text, wenn nichts da ist
   })
   B.neu()       Daten neu holen (Filter geändert) · B.zeichne() nur neu zeichnen (z. B. Korb geändert)
   B.akt(id)     Position markieren (ohne Rollen) · B.auswahl() → gewählte Kennungen · B.pos(id) → geladene Position */
(() => {
  if (window.bpBaudatenBaum) return;
  const esc = window.bpEsc;
  const STIL = `.bdb{display:flex;flex-direction:column;min-height:0;position:relative}
.bdb-fav{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;padding:.3rem .5rem;font-size:.8rem;border-bottom:1px solid var(--line,#d6dce3)}
.bdb-fav span{color:var(--mute,#5d6b7a)}.bdb-fav button{border:1px solid var(--line,#d6dce3);background:var(--card,#fff);color:inherit;border-radius:calc(999px*var(--rkp,1));padding:0 .55rem;font:inherit;cursor:pointer}
.bdb-fav button:hover{border-color:var(--y,#2f6fb3)}
table.bdb-t{width:100%;table-layout:fixed;border-collapse:collapse;font-size:.9rem}
table.bdb-t th{position:sticky;top:0;z-index:2;background:var(--card,#fff);text-align:left;font-weight:600;font-size:.78rem;color:var(--mute,#5d6b7a);padding:.3rem .4rem;border-bottom:1px solid var(--line,#d6dce3)}
table.bdb-t td{padding:.28rem .4rem;border-bottom:1px solid var(--line2,#eef0f3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}
table.bdb-t td.baumz .bz{display:flex;align-items:center;gap:.15rem;min-width:0;overflow:hidden}table.bdb-t td.baumz .bdb-n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
table.bdb-t th{border-right:1px solid var(--line2,#eef0f3)}table.bdb-t th:last-child{border-right:0}   /* Spaltengrenzen sichtbar: dort zieht man die Breite (bpSpaltBreite) */
table.bdb-t td.r,table.bdb-t th.r{text-align:right;font-variant-numeric:tabular-nums}
table.bdb-t td.hk{text-align:center}table.bdb-t .bdb-x{display:inline-block;margin-left:.45rem;vertical-align:middle}table.bdb-t td.hk input,table.bdb-t th.hk input{margin:0;width:1rem;height:1rem;accent-color:var(--y,#2f6fb3)}
table.bdb-t tr.bdb-g td{background:var(--hov2,color-mix(in srgb,var(--line,#d6dce3) 25%,var(--card,#fff)));font-weight:600}
table.bdb-t tr.bdb-g small{font-weight:400;color:var(--mute,#5d6b7a)}
table.bdb-t tr.bdb-p{cursor:pointer}table.bdb-t tr.bdb-p:hover td{background:var(--hov,#f2f4f7)}
table.bdb-t tr.akt td{background:color-mix(in srgb,var(--y,#2f6fb3) 14%,var(--card,#fff))}
table.bdb-t tr.bdb-w td{background:color-mix(in srgb,var(--y,#2f6fb3) 8%,var(--card,#fff))}
table.bdb-t td.bdb-m{color:var(--mute,#5d6b7a);font-style:italic}
table.bdb-t mark{background:color-mix(in srgb,var(--y,#2f6fb3) 30%,transparent);color:inherit;border-radius:2px;padding:0 1px}
.bdb-mwl{position:sticky;bottom:0;z-index:3;display:flex;flex-wrap:wrap;gap:.4rem .7rem;align-items:center;padding:.4rem .6rem;margin:.3rem;border:1px solid color-mix(in srgb,var(--y,#2f6fb3) 45%,transparent);background:color-mix(in srgb,var(--y,#2f6fb3) 9%,var(--card,#fff));border-radius:calc(8px*var(--rk,1));box-shadow:0 -4px 12px rgba(0,0,0,.08)}
.bdb-mwl .f{flex:1}`;
  const K = (pfad) => JSON.stringify(pfad);
  const zahl = (v) => (v == null ? '' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const NAME = {
    katalog: (g) => g.name || g.w, lb: (g) => `${g.w ? g.w + ' ' : ''}${g.name || ''}`.trim() || '(ohne Leistungsbereich)', gruppe: (g) => g.name || g.w || '(ohne Gruppe)',
    kg: (g) => (g.w ? 'KG ' + g.w : '(ohne Kostengruppe)'), einheit: (g) => g.w || '(ohne Einheit)', bau: (g) => g.name || g.w, genauigkeit: (g) => (g.w ? 'Genauigkeit ' + g.w : '(ohne Angabe)'),
  };
  let NR = 0;

  function mount(el, o) {
    const doc = el.ownerDocument || document;
    if (!doc.getElementById('bdb-stil')) { const s = doc.createElement('style'); s.id = 'bdb-stil'; s.textContent = STIL; doc.head.appendChild(s); }
    if (!el.id) el.id = 'bdb' + (++NR);
    const LS = bpLS('bp.bdb.' + o.key + '.');
    let G = LS.get('grp', o.vorgabe || ['katalog', 'lb']).filter((k) => o.ebenen[k]);
    if (!G.length) G = (o.vorgabe || ['katalog', 'lb']).slice();
    let OFFEN = new Set(LS.get('auf', [])), D = {}, WAHL = new Set(), AKT = null, ANKER = null, R = [], stand = 0;
    const POS = new Map();
    const fav = () => LS.get('fav', {});
    el.classList.add('bdb');
    el.innerHTML = '<div class="bdb-k"></div><div class="bdb-sc" style="flex:1;min-height:0;overflow:auto"><table class="bdb-t">'
      + `<thead><tr><th class="hk" style="width:2rem"></th><th>Bezeichnung</th><th style="width:7rem">Code</th><th style="width:3.6rem">EH</th><th class="r" style="width:${o.extra ? '9rem' : '6.5rem'}">EP</th></tr></thead><tbody></tbody></table></div><div class="bdb-u"></div>`;
    const kopf = el.querySelector('.bdb-k'), sc = el.querySelector('.bdb-sc'), tb = el.querySelector('tbody'), unten = el.querySelector('.bdb-u');
    const merkeAuf = () => LS.set('auf', [...OFFEN].slice(-400));

    function abfrage(pfad, offset) {
      const p = new URLSearchParams(o.filter ? o.filter() : '');
      p.set('ebenen', G.join(',')); p.set('pfad', JSON.stringify(pfad)); if (offset) p.set('offset', offset);
      return api(o.url + '?' + p.toString());
    }
    function hol(pfad, mehr) {   // eine Ebene holen – läuft sie schon, dieselbe Anfrage abwarten
      const k = K(pfad), alt = D[k];
      if (alt && !mehr) return alt.laedt ? alt.warte : Promise.resolve(alt);
      const w = hol0(pfad, mehr, k, alt);
      if (!mehr) D[k] = { laedt: true, warte: w };
      return w;
    }
    async function hol0(pfad, mehr, k, alt) {
      const st = stand;
      let r; try { r = await abfrage(pfad, mehr ? alt.pos.length : 0); } catch (e) { if (st === stand) D[k] = { fehler: e.message }; return D[k]; }
      if (st !== stand) return null;
      if (r.gruppen) D[k] = { gruppen: r.gruppen };
      else { (r.positionen || []).forEach((x) => POS.set(x.id, x)); D[k] = { pos: (mehr ? alt.pos : []).concat(r.positionen || []), gesamt: r.gesamt || 0 }; }
      return D[k];
    }
    /* Beim Suchen/Filtern: Gruppen mit Treffern aufklappen – kleine zuerst, bis etwa 400 Positionen offen sind */
    async function trefferAuf() {
      let platz = 400; const st = stand, warte = [[]];
      while (warte.length && platz > 0 && st === stand) {
        const pf = warte.shift(), d = await hol(pf); if (!d || !d.gruppen) continue;
        for (const g of d.gruppen.slice().sort((a, b) => a.n - b.n)) {
          if (g.n > platz && pf.length + 1 >= G.length) continue;
          const np = pf.concat(g.w); OFFEN.add(K(np)); warte.push(np);
          if (np.length >= G.length) platz -= Math.min(g.n, 300);
        }
      }
    }
    function zeilen() {   // flache Liste der sichtbaren Zeilen aus dem geladenen Stand
      const out = [];
      const walk = (pfad, t) => {
        const d = D[K(pfad)];
        if (!d || d.laedt) { out.push({ art: 'm', id: 'm' + K(pfad), t, text: 'wird geladen …' }); return; }
        if (d.fehler) { out.push({ art: 'm', id: 'f' + K(pfad), t, text: d.fehler }); return; }
        if (d.gruppen) {
          if (!d.gruppen.length && !pfad.length) out.push({ art: 'm', id: 'leer', t, text: o.leer || 'Nichts gefunden.' });
          /* nur eine Gruppe unter einer Gruppe (z. B. Vorbemerkungen: „VB1 Allgemeine …“ › „Allgemeine …“): keine eigene Zeile, gleich ihren Inhalt –
             unnötige Verschachtelung fällt weg (23.11.2026); die oberste Ebene bleibt immer stehen */
          if (pfad.length && d.gruppen.length === 1) {
            const np = pfad.concat(d.gruppen[0].w), k = K(np);
            if (!D[k]) hol(np).then(zeichne);
            walk(np, t); return;
          }
          for (const g of d.gruppen) {
            const np = pfad.concat(g.w), k = K(np), e = G[pfad.length];
            out.push({ art: 'g', id: k, t, pfad: np, e, g, auf: OFFEN.has(k) });
            if (OFFEN.has(k)) walk(np, t + 1);
          }
          return;
        }
        d.pos.forEach((x) => out.push({ art: 'p', id: 'p' + x.id, t, x }));
        if (d.gesamt > d.pos.length) out.push({ art: 'w', id: 'w' + K(pfad), t, pfad, rest: d.gesamt - d.pos.length });
        if (!d.pos.length && !pfad.length) out.push({ art: 'm', id: 'leer', t, text: o.leer || 'Nichts gefunden.' });
      };
      walk([], 0);
      return out;
    }
    const geladen = (pfad) => {   // alle schon geladenen Positionen unter einer Gruppe
      const out = [], d = D[K(pfad)]; if (!d) return out;
      if (d.pos) return d.pos.map((x) => x.id);
      (d.gruppen || []).forEach((g) => out.push(...geladen(pfad.concat(g.w))));
      return out;
    };
    function zeile(z) {
      if (z.art === 'g') {
        const ids = geladen(z.pfad), an = ids.filter((i) => WAHL.has(i)).length;
        const hk = `<input type="checkbox" data-bdbgw="${esc(z.id)}"${an && an === ids.length && ids.length >= z.g.n ? ' checked' : ''} aria-label="alle in der Gruppe wählen">`;
        return `<tr class="bdb-g" data-bdbr="${esc(z.id)}"><td class="hk">${hk}</td>${bpBaum.zelle({ tiefe: z.t, auf: z.auf, klapp: z.id, html: (() => { const t = NAME[z.e] ? NAME[z.e](z.g) : z.g.name || z.g.w; return `<span class="bdb-n" title="${esc(t)}">${esc(t)}</span>`; })() })}<td></td><td></td><td class="r"><small>${z.g.n.toLocaleString('de-DE')}</small></td></tr>`;
      }
      if (z.art === 'p') {
        const x = z.x, m = o.mark || esc, w = WAHL.has(x.id);
        return `<tr class="bdb-p${AKT === x.id ? ' akt' : ''}${w ? ' bdb-w' : ''}" data-bdbr="${esc(z.id)}" data-bdbp="${x.id}" draggable="true"><td class="hk"><input type="checkbox" data-bdbh="${x.id}"${w ? ' checked' : ''} aria-label="wählen"></td>`
          + bpBaum.zelle({ tiefe: z.t, html: `${x.favorit ? '<span style="color:var(--y)">★</span> ' : ''}<span class="bdb-n" title="${esc(x.bez || x.kurz || '')}">${m(x.bez || x.kurz || '')}</span>` })
          + `<td><small>${esc(x.code || '')}</small></td><td>${esc(x.einheit || '')}</td><td class="r">${x.ep_mittel_akt == null ? '–' : zahl(x.ep_mittel_akt) + ' €'}${o.extra ? `<span class="bdb-x">${o.extra(x)}</span>` : ''}</td>`
          + '</tr>';
      }
      if (z.art === 'w') return `<tr data-bdbr="${esc(z.id)}"><td></td><td colspan="4" style="${bpBaum.einzug(z.t)}"><button type="button" class="btn sm" data-bdbmehr="${esc(K(z.pfad))}">＋ weitere ${Math.min(300, z.rest).toLocaleString('de-DE')} von ${z.rest.toLocaleString('de-DE')}</button></td></tr>`;
      return `<tr data-bdbr="${esc(z.id)}"><td></td><td class="bdb-m" colspan="4" style="${bpBaum.einzug(z.t)}">${esc(z.text)}</td></tr>`;
    }
    function kopfZeichnen() {
      const F = fav(), L = Object.entries(F).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
      kopf.innerHTML = bpGruppen.html(G, o.ebenen, { rechts: 'Doppelklick: Details' })
        + (L.length && G.includes('lb') ? `<div class="bdb-fav"><span>★ oft geöffnet:</span>${L.map(([k, v]) => `<button type="button" data-bdbfav="${esc(k)}" title="${esc(v.titel || '')}">${esc(v.text)}</button>`).join('')}</div>` : '');
    }
    function leisteZeichnen() {
      const n = WAHL.size;
      unten.innerHTML = n ? `<div class="bdb-mwl"><b>${n} gewählt</b>${(o.aktionen || []).map((a) => `<button type="button" class="btn sm${a.pri ? ' pri' : ''}" data-bdba="${esc(a.k)}">${esc(a.t)}</button>`).join('')}<span class="f"></span><button type="button" class="btn sm" data-bdbaus title="Auswahl aufheben (Esc)">✕</button></div>` : '';
    }
    function zeichne() {
      R = zeilen();
      const key = 'bdb-' + el.id, h = (k) => zeile(R[k]);
      if (!bpBaum.fenster.tausche(key, R.length, h, { id: (k) => R[k].id })) tb.innerHTML = bpBaum.fenster.html(key, R.length, h, { id: (k) => R[k].id });
      if (window.bpSpaltBreite) bpSpaltBreite.an(el.querySelector('table.bdb-t'), 'bdb.' + o.key);   // Spaltenbreiten ziehen wie im LV (gemerkt je Person)
      leisteZeichnen();
    }
    let erst = true;
    async function neu() {   // neu holen; bis alles da ist, bleibt der alte Stand stehen (nichts springt)
      stand++; const st = stand; D = {};
      if (erst) { erst = false; zeichne(); }
      await hol([]); if (st !== stand) return;
      if (o.suche && o.suche()) await trefferAuf();
      const offen = [...OFFEN].map((k) => JSON.parse(k)).filter((p) => p.length <= G.length).sort((a, b) => a.length - b.length);
      for (let tiefe = 1; tiefe <= G.length; tiefe++) {   // gemerkte offene Gruppen Ebene für Ebene nachladen (gleichzeitig)
        await Promise.all(offen.filter((p) => p.length === tiefe && D[K(p.slice(0, -1))] && D[K(p.slice(0, -1))].gruppen && D[K(p.slice(0, -1))].gruppen.some((g) => g.w === p[p.length - 1])).map((p) => hol(p)));
        if (st !== stand) return;
      }
      zeichne();
    }
    function favMerken(z) {
      const i = G.indexOf('lb'); if (i < 0 || z.pfad.length !== i + 1) return;
      const F = fav(), k = K(z.pfad), alt = F[k] || { n: 0 };
      F[k] = { n: alt.n + 1, text: z.g.w || NAME.lb(z.g), titel: NAME.lb(z.g) };
      const L = Object.entries(F).sort((a, b) => b[1].n - a[1].n).slice(0, 12); LS.set('fav', Object.fromEntries(L));
    }
    async function klapp(k) {
      const z = R.find((x) => x.id === k); if (!z) return;
      if (OFFEN.has(k)) OFFEN.delete(k); else { OFFEN.add(k); favMerken(z); }
      merkeAuf(); zeichne();
      if (OFFEN.has(k) && !D[k]) { await hol(z.pfad); zeichne(); }
    }
    async function favAuf(k) {   // ★: den Leistungsbereich aufklappen und zeigen (Sprung von außerhalb der Liste – Rollen erlaubt)
      const p = JSON.parse(k);
      for (let i = 1; i <= p.length; i++) { OFFEN.add(K(p.slice(0, i))); await hol(p.slice(0, i - 1)); }
      await hol(p); merkeAuf(); zeichne();
      const i = R.findIndex((x) => x.id === k); if (i < 0) return;
      const tr = bpBaum.fenster.zeige('bdb-' + el.id, i) || tb.querySelector(`tr[data-bdbr="${CSS.escape(k)}"]`);
      if (tr) tr.scrollIntoView({ block: 'start' });
    }
    const posZeilen = () => R.filter((z) => z.art === 'p').map((z) => z.x.id);
    function wahl(id, e) {
      if (e.shiftKey && ANKER != null) { const L = posZeilen(), a = L.indexOf(ANKER), b = L.indexOf(id); if (a >= 0 && b >= 0) L.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((i) => WAHL.add(i)); }
      else if (WAHL.has(id)) WAHL.delete(id); else WAHL.add(id);
      ANKER = id; zeichne();
    }
    async function gruppeWahl(k, an) {
      const z = R.find((x) => x.id === k); if (!z) return;
      const lade = async (pfad, tiefe) => { const d = await hol(pfad); if (d && d.gruppen && tiefe < 6) for (const g of d.gruppen) await lade(pfad.concat(g.w), tiefe + 1); };
      if (z.g.n <= 1000) await lade(z.pfad, 0);
      geladen(z.pfad).forEach((i) => (an ? WAHL.add(i) : WAHL.delete(i))); zeichne();
    }
    const posVon = (ids) => ids.map((i) => POS.get(i)).filter(Boolean);
    el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-zu]'); if (c && el.contains(c)) { e.stopPropagation(); klapp(c.dataset.zu); return; }
      const h = e.target.closest('[data-bdbh]'); if (h) { e.stopPropagation(); wahl(+h.dataset.bdbh, e); return; }
      const gw = e.target.closest('[data-bdbgw]'); if (gw) { e.stopPropagation(); gruppeWahl(gw.dataset.bdbgw, gw.checked); return; }
      const m = e.target.closest('[data-bdbmehr]'); if (m) { const p = JSON.parse(m.dataset.bdbmehr); m.disabled = true; hol(p, true).then(zeichne); return; }
      const f = e.target.closest('[data-bdbfav]'); if (f) { favAuf(f.dataset.bdbfav); return; }
      const a = e.target.closest('[data-bdba]'); if (a) { const ids = [...WAHL]; o.aktion(a.dataset.bdba, ids, posVon(ids)); return; }
      if (e.target.closest('[data-bdbaus]')) { WAHL.clear(); zeichne(); return; }
      const g = e.target.closest('tr.bdb-g'); if (g && !e.target.closest('button,input,a')) { klapp(g.dataset.bdbr); return; }
      const p = e.target.closest('tr.bdb-p'); if (!p || e.target.closest('button,input,a,select')) return;
      const id = +p.dataset.bdbp, x = POS.get(id); if (!x) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey) { wahl(id, e); return; }
      if (e.detail === 2) { if (o.doppel) o.doppel(x); return; }   // zweiter Klick: vor dem Neuzeichnen erfassen
      AKT = id; ANKER = id;
      tb.querySelectorAll('tr.bdb-p.akt').forEach((t) => t.classList.remove('akt')); p.classList.add('akt');   // nur die Klasse – nichts neu zeichnen, nichts rollt
      if (o.zeige) o.zeige(x);
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && WAHL.size && !e.target.closest('input[type=text],input[type=search],textarea')) { WAHL.clear(); zeichne(); } });
    el.addEventListener('dragstart', (e) => {
      const p = e.target.closest && e.target.closest('tr.bdb-p'); if (!p || !o.ziehen) return;
      const id = +p.dataset.bdbp, ids = WAHL.has(id) ? [...WAHL] : [id]; o.ziehen(e, ids, posVon(ids));
    });
    bpGruppen.an(kopf, { lies: () => G, setze: (n) => { G = n.length ? n : (o.vorgabe || ['katalog', 'lb']).slice(); LS.set('grp', G); OFFEN = new Set(); merkeAuf(); kopfZeichnen(); neu(); } });
    bpBaum.tasten({ wurzel: `#${CSS.escape(el.id)} table.bdb-t > tbody`, zeilen: 'tr[data-bdbr]', aktiv: (w) => w.querySelector('tr.akt'),
      oeffne: (z) => { if (z.classList.contains('bdb-g')) klapp(z.dataset.bdbr); else z.click(); } });
    kopfZeichnen(); neu();
    return {
      neu, zeichne, kopf: kopfZeichnen,
      akt(id) { AKT = id; tb.querySelectorAll('tr.bdb-p').forEach((t) => t.classList.toggle('akt', +t.dataset.bdbp === id)); },
      auswahl: () => [...WAHL],
      leeren() { WAHL.clear(); zeichne(); },
      pos: (id) => POS.get(id),
    };
  }
  window.bpBaudatenBaum = { mount };
})();
