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
      liste.forEach((x) => { delete x._mittel; }); close(); if (opt.onInsert) opt.onInsert(liste);
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
  bg.addEventListener('dblclick', (e) => { const l = e.target.closest('label'); const c = l && l.querySelector('[data-pdb]'); if (!c) return; e.preventDefault(); c.click(); pdbDetail(+c.dataset.pdb); });   // Doppelklick: Details (der erste Klick hat umgeschaltet)
  bg.querySelector('#pdbQ').focus();
  laden();
}

/* Welcher Preis beim Übernehmen aus den Baudaten? Einstellung „Preise aus den Baudaten“ (⚙ → Für mich): leer = fragen,
   sonst mittel | von | bis | eigen_median | eigen_neu (ohne eigene Preise: Mittel). Beim Fragen lässt sich die Wahl als Standard merken.
   liste: Einträge mit ep_s (Mittel), ep_von, ep_bis, ep_median, eigene[{ep, firma, datum}]. Gibt die Liste (ep_s, quelle angepasst) oder null zurück. */
const PDBART = [['mittel', 'Katalog Mittel'], ['von', 'Katalog von'], ['bis', 'Katalog bis'], ['eigen_median', 'Median eigene'], ['eigen_neu', 'Neuester eigener']];
async function pdbPreiswahl(liste) {
  const mit = (liste || []).filter((x) => x.typ !== 'titel' && (x.ep_s != null || x.ep_von != null || (x.eigene && x.eigene.length)));
  if (!mit.length) return liste;
  const eur = (v) => (v == null ? '–' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
  const dat = (d) => (d ? d.slice(0, 10).split('-').reverse().join('.') : '');
  mit.forEach((x) => { if (x._mittel === undefined) x._mittel = x.ep_s; });
  const optionen = (x) => {
    const o = [['k', 'Katalog Mittel', x._mittel]];
    if (x.ep_von != null) o.push(['kv', 'Katalog von', x.ep_von]);
    if (x.ep_bis != null) o.push(['kb', 'Katalog bis', x.ep_bis]);
    const E = x.eigene || [];
    if (E.length > 1 && x.ep_median != null) o.push(['m', `Median eigene (${E.length})`, x.ep_median]);
    E.forEach((p, i) => o.push(['e' + i, (i === 0 ? 'Neuester: ' : '') + [p.firma, dat(p.datum)].filter(Boolean).join(', '), p.ep]));
    return o;
  };
  const wahl = (x, art) => { const o = optionen(x).map((y) => y[0]), E = (x.eigene || []).length;
    if (art === 'von' && o.includes('kv')) return 'kv'; if (art === 'bis' && o.includes('kb')) return 'kb';
    if (art === 'eigen_median' && E) return o.includes('m') ? 'm' : 'e0'; if (art === 'eigen_neu' && E) return 'e0'; return 'k'; };
  const anwenden = (x, v) => { const o = optionen(x).find((y) => y[0] === v); if (!o) return;
    x.ep_s = o[2];
    if (v !== 'k') x.quelle = `${x.quelle || 'Baudaten'} · ${v === 'kv' || v === 'kb' ? o[1] : v === 'm' ? 'Median eigener Preise' : 'eigener Preis ' + [x.eigene[+v.slice(1)].firma, dat(x.eigene[+v.slice(1)].datum)].filter(Boolean).join(' ')}`.slice(0, 200); };
  let std = '';
  try { std = (window.BPHead && BPHead.konto && BPHead.konto.pdb_preis != null) ? BPHead.konto.pdb_preis : ((await api('api/bp/konto')).pdb_preis || ''); } catch { std = ''; }
  if (std) {   // Standard aus den Einstellungen – ohne zu fragen
    mit.forEach((x) => anwenden(x, wahl(x, std)));
    if (typeof toast === 'function') toast(`Preise: ${(PDBART.find((a) => a[0] === std) || [, std])[1]} (Standard – änderbar unter ⚙ → Für mich)`);
    return liste;
  }
  const hatEigene = mit.some((x) => x.eigene && x.eigene.length);
  return new Promise((fertig) => {
    let ok = false;
    const bg = modalBox(`<h3>Welche Preise verwenden?</h3>
      <p class="mute" style="margin:.1rem 0 .6rem;font-size:.86rem">${mit.length === 1 ? 'Eine Position' : mit.length + ' Positionen'} aus den Baudaten${hatEigene ? ' – für einige gibt es eigene Preise aus Vergaben' : ''}. Für alle wählen oder je Position.</p>
      <div id="ppAlle" style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-bottom:.6rem"><span class="mute" style="font-size:.86rem">Für alle:</span>${PDBART.filter((a) => hatEigene || !a[0].startsWith('eigen')).map(([k, l], i) => `<button class="btn sm${i === 0 ? ' pri' : ''}" data-pa="${k}">${l}</button>`).join('')}</div>
      <div style="max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:8px">${mit.map((x, i) => `
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(12rem,17rem);gap:.6rem;align-items:center;padding:.4rem .6rem;border-bottom:1px solid var(--line)">
          <span>${esc(x.kurz)}<small style="display:block;color:var(--mute);font-size:.76rem">${esc([x.code || x.oz, x.einheit].filter(Boolean).join(' · '))}</small></span>
          <select data-pp="${i}">${optionen(x).map((o) => `<option value="${o[0]}">${esc(o[1])} – ${eur(o[2])}</option>`).join('')}</select></div>`).join('')}</div>
      <label style="display:block;margin-top:.7rem;font-size:.9rem;line-height:1.4"><input type="checkbox" id="ppStd" style="width:auto;margin:0 .4rem 0 0;vertical-align:-2px"><span>Auswahl „<span id="ppStdN">Katalog Mittel</span>“ als Standard merken und nicht mehr fragen <span class="mute">(änderbar unter ⚙ → Für mich)</span></span></label>
      <div style="display:flex;gap:.4rem;justify-content:flex-end;margin-top:.7rem"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Übernehmen</button></div>`, async (m, bg, close) => {
      if (m === 'x') { close(); return; }
      if (m !== 'ok') return;
      mit.forEach((x, i) => anwenden(x, bg.querySelector(`[data-pp="${i}"]`).value));
      if (bg.querySelector('#ppStd').checked) {
        try { const r = await api('api/bp/konto', 'PUT', { pdb_preis: aktiv }); if (window.BPHead && BPHead.konto) BPHead.konto.pdb_preis = r.pdb_preis; } catch (e) { if (typeof toast === 'function') toast(e.message, true); }
      }
      ok = true; close();
    });
    let aktiv = 'mittel';
    bg.querySelector('.modal').style.width = 'min(760px,100%)';
    bg.querySelector('#ppAlle').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pa]'); if (!b) return;
      aktiv = b.dataset.pa; bg.querySelector('#ppStdN').textContent = b.textContent;
      bg.querySelectorAll('[data-pa]').forEach((y) => y.classList.toggle('pri', y === b));
      mit.forEach((x, i) => { bg.querySelector(`[data-pp="${i}"]`).value = wahl(x, aktiv); });
    });
    new MutationObserver((_, mo) => { if (!bg.isConnected) { mo.disconnect(); fertig(ok ? liste : null); } }).observe(document.body, { childList: true, subtree: true });
  });
}

/* Detailfenster einer Position der Baudaten (wie im Modul Baudaten) – Doppelklick in der Kopierquelle oder im Auswahldialog */
async function pdbDetail(id) {
  let x; try { x = await api('api/baudaten/position/' + id); } catch (e) { toast(e.message, true); return; }
  const eur = (v) => (v == null ? '–' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
  const num = (v, n = 2) => (v == null ? '' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: n }));
  const kalk = x.quelle === 'katalog' && x.h ? `<h4 style="margin:.9rem 0 .3rem">Kalkulation (Preisstand ${esc(x.preisstand || '')})</h4><table style="width:100%;font-size:.9rem">
      <tr><td>Zeitansatz</td><td style="text-align:right">${num(x.h, 3)} h/${esc(x.einheit)}</td></tr>
      <tr><td>Verrechnungslohn</td><td style="text-align:right">${eur(x.verrechnungslohn)}/h</td></tr>
      <tr><td>Lohn</td><td style="text-align:right">${eur(x.h * x.verrechnungslohn)}</td></tr>
      <tr><td>Stoff + Gerät (+ 12 %)</td><td style="text-align:right">${eur(((x.stoff || 0) + (x.geraet || 0)) * 1.12)}</td></tr>
      <tr><td><b>EP zum Preisstand</b></td><td style="text-align:right"><b>${eur(x.ep_mittel)}</b></td></tr>
      <tr><td>Umrechnung auf heute</td><td style="text-align:right">× ${num(x.umrechnung, 4)}</td></tr></table>` : '';
  const eig = (x.preise || []).length ? `<h4 style="margin:.9rem 0 .3rem">Eigene Preise aus Vergaben · Median ${eur(x.ep_eigen_median)}</h4><table style="width:100%;font-size:.9rem">${x.preise.map((p) => `<tr${p.alt ? ' style="opacity:.45" title="älter als 5 Jahre – zählt nicht mehr"' : ''}><td>${p.auto ? '<small class="mute">AVA</small> ' : ''}${esc(p.datum || '')} ${esc(p.firma || '')}${p.menge ? ' · ' + num(p.menge) + ' ' + esc(x.einheit) : ''}</td><td style="text-align:right">${eur(p.ep)}</td></tr>`).join('')}</table>` : '';
  const bg = modalBox(`<div class="mute" style="font-size:.82rem">${esc(x.katalog_name || '')} · ${esc(x.code || '')}${x.lb_name ? ' · ' + esc((x.lb_nr || '') + ' ' + x.lb_name) : ''}${x.gruppe_name ? ' › ' + esc(x.gruppe_name) : ''}</div>
    <h3 style="margin:.3rem 0">${esc(x.bez || x.kurz)}</h3>${x.bez ? `<div class="mute" style="font-size:.85rem">Kurztext (LV): ${esc(x.kurz)}</div>` : ''}
    <div class="mute" style="margin:.3rem 0 .6rem;font-size:.88rem">Einheit <b>${esc(x.einheit || '')}</b>${x.kg ? ` · DIN 276 KG <b>${esc(x.kg)}</b>` : ''}${x.genauigkeit ? ` · Genauigkeit <b>${esc(x.genauigkeit)}</b>` : ''}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;text-align:center;margin-bottom:.7rem">${[['von', x.ep_von_akt], ['mittel', x.ep_mittel_akt], ['bis', x.ep_bis_akt]].map(([l, v]) => `<div style="border:${l === 'mittel' ? '2px solid var(--y)' : '1px solid var(--line)'};border-radius:10px;padding:.45rem"><small class="mute">${l}</small><div style="font-size:1.15rem;font-weight:600">${eur(v)}</div></div>`).join('')}</div>
    <pre style="white-space:pre-wrap;font:inherit;font-size:.92rem;max-height:34vh;overflow:auto;margin:0;background:var(--hov,transparent);padding:.5rem .6rem;border-radius:8px">${esc(x.lang_voll || x.lang || '')}</pre>
    ${x.hinweis ? `<p class="mute">Hinweis: ${esc(x.hinweis)}</p>` : ''}${kalk}${eig}
    <div style="display:flex;justify-content:flex-end;margin-top:.8rem"><button class="btn pri" data-m="x">Schließen</button></div>`, (m, bg, close) => { if (m === 'x') close(); });
  bg.querySelector('.modal').style.width = 'min(720px,100%)';
}
