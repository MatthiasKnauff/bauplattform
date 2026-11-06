'use strict';
/* Positionen aus den Baudaten wählen (gemeinsam für Ausschreibung und Baukosten).
   pdbWahl({ titel, knopf, onInsert(liste) }) – die App liefert api/baudaten/suche und api/baudaten/positionen (bpcore/baudaten.py). */
const PDB = { q: '', katalog: (() => { try { return JSON.parse(localStorage.getItem('pdb.kat') || '""'); } catch { return ''; } })(), sel: new Map() };
function pdbWahl(opt = {}) {
  PDB.sel = new Map();
  const eur = (v) => (v == null ? '' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
  let tk = 0, kats = null, korbGewaehlt = false;
  const bg = modalBox(`<h3>${esc(opt.titel || 'Positionen aus den Baudaten')}</h3>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin:.2rem 0 .5rem"><select id="pdbK" style="max-width:15rem"><option value="">Alle Kataloge</option></select>
      <input type="search" id="pdbQ" placeholder="Suchen – z. B. „Mauerwerk KS 24“, „Fliese 60x60“, Code …" value="${esc(PDB.q)}" style="flex:1;min-width:14rem" autocomplete="off"></div>
    <div id="pdbL" style="max-height:55vh;overflow:auto;min-width:min(760px,88vw);border:1px solid var(--line);border-radius:8px"></div>
    <p class="mute" id="pdbI" style="font-size:.82rem;margin:.4rem 0"></p>
    <div style="display:flex;gap:.4rem;justify-content:flex-end"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok" id="pdbOk" disabled>Einfügen</button></div>`, async (m, bg, close) => {
    if (m === 'x') return close();
    if (m !== 'ok' || !PDB.sel.size) return;
    try {
      const neu = await api('api/baudaten/positionen', 'POST', { ids: [...PDB.sel.keys()] });
      const liste = await pdbPreiswahl(neu); if (!liste) return;
      close(); if (opt.onInsert) opt.onInsert(liste);
    } catch (e) { toast(e.message, true); }
  });
  const zeichne = (r) => {
    if (r.kataloge && !kats) { kats = r.kataloge; bg.querySelector('#pdbK').innerHTML = '<option value="">Alle Kataloge</option>' + `<option value="__korb"${PDB.katalog === '__korb' ? ' selected' : ''}>Korb (gesammelt in den Baudaten)</option>` + kats.map((k) => `<option value="${esc(k.key)}"${k.key === PDB.katalog ? ' selected' : ''}>${esc(k.name)}</option>`).join(''); }
    bg.querySelector('#pdbL').innerHTML = r.positionen.length ? r.positionen.map((x) => `<label style="display:grid;grid-template-columns:1.4rem 7.5rem minmax(0,1fr) 3rem 6.5rem;gap:.4rem;padding:.35rem .6rem;border-bottom:1px solid var(--line);cursor:pointer;align-items:baseline">
      <input type="checkbox" data-pdb="${x.id}"${PDB.sel.has(x.id) ? ' checked' : ''}><span style="font-size:.76rem;color:var(--mute)">${esc(x.code)}</span>
      <span>${esc(x.bez || x.kurz)}<small style="display:block;color:var(--mute);font-size:.76rem">${esc([x.gruppe_name || x.titel, x.kg ? 'KG ' + x.kg : ''].filter(Boolean).join(' · '))}</small></span>
      <span style="color:var(--mute)">${esc(x.einheit)}</span><span style="text-align:right;font-variant-numeric:tabular-nums">${eur(x.ep_mittel_akt)}</span></label>`).join('')
      : '<p class="mute" style="padding:1rem">Nichts gefunden.</p>';
    bg.querySelector('#pdbI').textContent = `${r.gesamt.toLocaleString('de-DE')} Treffer${r.gesamt > r.positionen.length ? ` (die ersten ${r.positionen.length} – Suche verfeinern)` : ''} · Preis = Schätzpreis netto, auf heute umgerechnet · ${PDB.sel.size} gewählt`;
  };
  const laden = async () => {
    const my = ++tk, p = new URLSearchParams({ n: 120 }); if (PDB.q) p.set('q', PDB.q); if (PDB.katalog) p.set('katalog', PDB.katalog); if (!kats) p.set('kataloge', '1');
    try {
      if (PDB.katalog === '__korb') {   // Korb: alles vorgewählt
        const [k, r] = await Promise.all([api('api/baudaten/korb'), kats ? null : api('api/baudaten/suche?n=0&kataloge=1')]);
        if (my !== tk) return;
        const q = PDB.q.toLowerCase(), pos = k.filter((x) => !q || `${x.code} ${x.kurz} ${x.bez || ''}`.toLowerCase().includes(q));
        if (!korbGewaehlt) { korbGewaehlt = true; k.forEach((x) => PDB.sel.set(x.id, 1)); auswahlKnopf(); }
        zeichne({ positionen: pos, gesamt: pos.length, kataloge: r && r.kataloge });
        if (!k.length) bg.querySelector('#pdbL').innerHTML = '<p class="mute" style="padding:1rem">Der Korb ist leer – in den Baudaten Positionen mit ＋ sammeln.</p>';
        return;
      }
      const r = await api('api/baudaten/suche?' + p); if (my === tk) zeichne(r);
    } catch (e) { bg.querySelector('#pdbL').innerHTML = `<p class="mute" style="padding:1rem">${esc(e.message)}</p>`; }
  };
  function auswahlKnopf() { bg.querySelector('#pdbOk').disabled = !PDB.sel.size; bg.querySelector('#pdbOk').textContent = PDB.sel.size ? `${PDB.sel.size} ${opt.knopf || 'einfügen'}` : (opt.knopf ? opt.knopf[0].toUpperCase() + opt.knopf.slice(1) : 'Einfügen'); }
  let qt = 0;
  bg.querySelector('#pdbQ').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { PDB.q = e.target.value.trim(); laden(); }, 300); });
  bg.querySelector('#pdbK').addEventListener('change', (e) => { PDB.katalog = e.target.value; try { localStorage.setItem('pdb.kat', JSON.stringify(PDB.katalog)); } catch { /* egal */ } laden(); });
  bg.addEventListener('change', (e) => { const c = e.target.closest('[data-pdb]'); if (!c) return; const id = +c.dataset.pdb; if (c.checked) PDB.sel.set(id, 1); else PDB.sel.delete(id);
    auswahlKnopf(); });
  bg.querySelector('#pdbQ').focus();
  laden();
}

/* Haben gewählte Positionen eigene Preise (Baudaten → Eigene Preise), wird nachgefragt, welcher Preis ins LV / in die Kosten geht.
   liste: Einträge mit ep_s, ep_von, ep_bis, ep_median, eigene[{ep, firma, datum}]. Gibt die Liste (ep_s, quelle angepasst) oder null (abgebrochen) zurück. */
function pdbPreiswahl(liste) {
  const mit = (liste || []).filter((x) => x.eigene && x.eigene.length);
  if (!mit.length) return Promise.resolve(liste);
  const eur = (v) => (v == null ? '–' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
  const dat = (d) => (d ? d.slice(0, 10).split('-').reverse().join('.') : '');
  const optionen = (x) => {
    const o = [['k', 'Katalog Mittel', x.ep_s]];
    if (x.ep_von != null) o.push(['kv', 'Katalog von', x.ep_von]);
    if (x.ep_bis != null) o.push(['kb', 'Katalog bis', x.ep_bis]);
    if (x.eigene.length > 1 && x.ep_median != null) o.push(['m', `Median eigene (${x.eigene.length})`, x.ep_median]);
    x.eigene.forEach((p, i) => o.push(['e' + i, (i === 0 ? 'Neuester: ' : '') + [p.firma, dat(p.datum)].filter(Boolean).join(', '), p.ep]));
    return o;
  };
  const wahl = (x, art) => { const o = optionen(x); return art === 'm' ? (o.find((y) => y[0] === 'm') ? 'm' : 'e0') : art === 'n' ? 'e0' : 'k'; };
  return new Promise((fertig) => {
    let ok = false;
    const bg = modalBox(`<h3>Welche Preise verwenden?</h3>
      <p class="mute" style="margin:.1rem 0 .6rem;font-size:.86rem">${mit.length === 1 ? 'Für eine gewählte Position gibt' : `Für ${mit.length} der gewählten Positionen gibt`} es eigene Preise (Baudaten → Eigene Preise).</p>
      <div id="ppAlle" style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-bottom:.6rem"><span class="mute" style="font-size:.86rem">Für alle:</span><button class="btn sm pri" data-pa="k">Katalogpreis</button><button class="btn sm" data-pa="m">Median eigene</button><button class="btn sm" data-pa="n">Neuester eigener</button></div>
      <div style="max-height:50vh;overflow:auto;border:1px solid var(--line);border-radius:8px">${mit.map((x, i) => `
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(12rem,17rem);gap:.6rem;align-items:center;padding:.4rem .6rem;border-bottom:1px solid var(--line)">
          <span>${esc(x.kurz)}<small style="display:block;color:var(--mute);font-size:.76rem">${esc([x.code || x.oz, x.einheit].filter(Boolean).join(' · '))}</small></span>
          <select data-pp="${i}">${optionen(x).map((o) => `<option value="${o[0]}">${esc(o[1])} – ${eur(o[2])}</option>`).join('')}</select></div>`).join('')}</div>
      <div style="display:flex;gap:.4rem;justify-content:flex-end;margin-top:.7rem"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Übernehmen</button></div>`, (m, bg, close) => {
      if (m === 'x') { close(); return; }
      if (m !== 'ok') return;
      mit.forEach((x, i) => {
        const v = bg.querySelector(`[data-pp="${i}"]`).value, o = optionen(x).find((y) => y[0] === v);
        if (!o || v === 'k') return;
        x.ep_s = o[2];
        x.quelle = `${x.quelle || 'Baudaten'} · ${v === 'kv' || v === 'kb' ? o[1] : v === 'm' ? 'Median eigener Preise' : 'eigener Preis ' + [x.eigene[+v.slice(1)].firma, dat(x.eigene[+v.slice(1)].datum)].filter(Boolean).join(' ')}`.slice(0, 200);
      });
      ok = true; close();
    });
    bg.querySelector('.modal').style.width = 'min(720px,100%)';
    bg.querySelector('#ppAlle').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pa]'); if (!b) return;
      bg.querySelectorAll('[data-pa]').forEach((y) => y.classList.toggle('pri', y === b));
      mit.forEach((x, i) => { bg.querySelector(`[data-pp="${i}"]`).value = wahl(x, b.dataset.pa); });
    });
    new MutationObserver((_, mo) => { if (!bg.isConnected) { mo.disconnect(); fertig(ok ? liste : null); } }).observe(document.body, { childList: true, subtree: true });
  });
}
