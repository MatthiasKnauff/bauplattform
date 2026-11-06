'use strict';
/* Positionen aus den Baudaten wählen (gemeinsam für Ausschreibung und Baukosten).
   pdbWahl({ titel, knopf, onInsert(liste) }) – die App liefert api/baudaten/suche und api/baudaten/positionen (bpcore/baudaten.py). */
const PDB = { q: '', katalog: (() => { try { return JSON.parse(localStorage.getItem('pdb.kat') || '""'); } catch { return ''; } })(), sel: new Map() };
function pdbWahl(opt = {}) {
  PDB.sel = new Map();
  const eur = (v) => (v == null ? '' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
  let tk = 0, kats = null;
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
      close(); if (opt.onInsert) opt.onInsert(neu);
    } catch (e) { toast(e.message, true); }
  });
  const zeichne = (r) => {
    if (r.kataloge && !kats) { kats = r.kataloge; bg.querySelector('#pdbK').innerHTML = '<option value="">Alle Kataloge</option>' + kats.map((k) => `<option value="${esc(k.key)}"${k.key === PDB.katalog ? ' selected' : ''}>${esc(k.name)}</option>`).join(''); }
    bg.querySelector('#pdbL').innerHTML = r.positionen.length ? r.positionen.map((x) => `<label style="display:grid;grid-template-columns:1.4rem 7.5rem minmax(0,1fr) 3rem 6.5rem;gap:.4rem;padding:.35rem .6rem;border-bottom:1px solid var(--line);cursor:pointer;align-items:baseline">
      <input type="checkbox" data-pdb="${x.id}"${PDB.sel.has(x.id) ? ' checked' : ''}><span style="font-size:.76rem;color:var(--mute)">${esc(x.code)}</span>
      <span>${esc(x.bez || x.kurz)}<small style="display:block;color:var(--mute);font-size:.76rem">${esc([x.gruppe_name || x.titel, x.kg ? 'KG ' + x.kg : ''].filter(Boolean).join(' · '))}</small></span>
      <span style="color:var(--mute)">${esc(x.einheit)}</span><span style="text-align:right;font-variant-numeric:tabular-nums">${eur(x.ep_mittel_akt)}</span></label>`).join('')
      : '<p class="mute" style="padding:1rem">Nichts gefunden.</p>';
    bg.querySelector('#pdbI').textContent = `${r.gesamt.toLocaleString('de-DE')} Treffer${r.gesamt > r.positionen.length ? ` (die ersten ${r.positionen.length} – Suche verfeinern)` : ''} · Preis = Schätzpreis netto, auf heute umgerechnet · ${PDB.sel.size} gewählt`;
  };
  const laden = async () => {
    const my = ++tk, p = new URLSearchParams({ n: 120 }); if (PDB.q) p.set('q', PDB.q); if (PDB.katalog) p.set('katalog', PDB.katalog); if (!kats) p.set('kataloge', '1');
    try { const r = await api('api/baudaten/suche?' + p); if (my === tk) zeichne(r); } catch (e) { bg.querySelector('#pdbL').innerHTML = `<p class="mute" style="padding:1rem">${esc(e.message)}</p>`; }
  };
  let qt = 0;
  bg.querySelector('#pdbQ').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { PDB.q = e.target.value.trim(); laden(); }, 300); });
  bg.querySelector('#pdbK').addEventListener('change', (e) => { PDB.katalog = e.target.value; try { localStorage.setItem('pdb.kat', JSON.stringify(PDB.katalog)); } catch { /* egal */ } laden(); });
  bg.addEventListener('change', (e) => { const c = e.target.closest('[data-pdb]'); if (!c) return; const id = +c.dataset.pdb; if (c.checked) PDB.sel.set(id, 1); else PDB.sel.delete(id);
    bg.querySelector('#pdbOk').disabled = !PDB.sel.size; bg.querySelector('#pdbOk').textContent = PDB.sel.size ? `${PDB.sel.size} ${opt.knopf || 'einfügen'}` : (opt.knopf ? opt.knopf[0].toUpperCase() + opt.knopf.slice(1) : 'Einfügen'); });
  bg.querySelector('#pdbQ').focus();
  laden();
}
