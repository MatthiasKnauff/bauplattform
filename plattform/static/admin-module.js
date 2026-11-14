'use strict';
/* Verwaltung → Projekte: die Felder je Projekt (Bautagebuch, Bauzeitenplan, Baukosten) antippen → Öffnen, Archivieren, Zurückholen,
   In den Papierkorb (besprochen am 13.11.2026). Bei mehreren Plänen fragt ein Fenster nach, welche – einzeln oder alle.
   Archivieren: Bauzeitenplan merkt es in den Plandaten, Kostenermittlung im Feld archived (Server: PUT api/projects/module);
   Papierkorb: derselbe Weg wie „⋯ → Löschen …“ (api/projects/delete). Das Bautagebuch trägt das Projekt – dort gilt es fürs ganze Projekt. */
function modChips(p) {
  const n = (L) => L.filter((x) => !x.archived).length, a = (L) => L.filter((x) => x.archived).length;
  const chip = (art, titel, L, tip) => { const on = n(L), ar = a(L);
    return `<button type="button" class="chip${on ? '' : ' marc'}" data-mod="${art}" title="${esc(tip)} – antippen: öffnen, archivieren, löschen">${titel}${L.length > 1 || ar ? ' · ' + on : ''}${ar ? ` <small>(${ar} archiviert)</small>` : ''}</button>`; };
  return (p.bt && p.bt.reports ? `<button type="button" class="chip bt" data-mod="bt" title="Tagesberichte im Bautagebuch – antippen: öffnen, archivieren, löschen">Bautagebuch · ${p.bt.reports}</button>` : '')
    + (p.plans.length ? chip('plan', 'Bauzeitenplan', p.plans, 'Bauzeitenplan: ' + p.plans.map((x) => x.name).join(', ')) : '')
    + (p.bks.length ? chip('bk', 'Baukosten', p.bks, 'Baukosten: ' + p.bks.map((x) => x.name).join(', ')) : '');
}
function modMenu(p, art, anchor) {
  document.querySelectorAll('.pmenu').forEach((x) => x.remove());
  const L = art === 'plan' ? p.plans : art === 'bk' ? p.bks : [], aktiv = L.filter((x) => !x.archived), arch = L.filter((x) => x.archived);
  const m = document.createElement('div'); m.className = 'pmenu';
  m.innerHTML = `<button data-mm="auf">↗ Öffnen</button>`
    + (art === 'bt' ? `<button data-mm="btarch">🗄 ${p.archived ? 'Projekt aus dem Archiv holen' : 'Projekt archivieren'}</button><button data-mm="btdel" class="dn">🗑 Projekt in den Papierkorb …</button>`
      : (aktiv.length ? '<button data-mm="arch">🗄 Archivieren …</button>' : '') + (arch.length ? '<button data-mm="zur">↩ Aus dem Archiv holen …</button>' : '') + '<button data-mm="del" class="dn">🗑 In den Papierkorb …</button>');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  Object.assign(m.style, { top: r.bottom + 4 + 'px', left: Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.left)) + 'px' });
  m.onclick = async (e) => {
    const b = e.target.closest('[data-mm]'); if (!b) return; m.remove();
    const w = b.dataset.mm;
    if (w === 'auf') { const app = { bt: 'bautagebuch', plan: 'gantt', bk: 'baukosten' }[art], frag = art === 'bt' ? '#projekt=' + p.bt.id : art === 'plan' ? '#plan=' + encodeURIComponent((aktiv[0] || L[0]).id) : '#bk=' + (aktiv[0] || L[0]).id;
      if (p.bt && window.BPHead && BPHead.projektSetzen) { try { await BPHead.projektSetzen(p.bt.id); } catch { /* egal */ } }
      location.href = linkTo(app, frag); return; }
    if (w === 'btarch') { try { await api('api/projects/' + p.bt.id, 'PUT', { archived: !p.archived }); archivRueck(p, p.archived ? 'aus dem Archiv geholt' : 'archiviert'); load(); } catch (er) { toast(er.message, true); } return; }
    if (w === 'btdel') { delDlg(p); return; }
    modWahl(p, art, w === 'zur' ? arch : w === 'arch' ? aktiv : L, w);
  };
  setTimeout(() => document.addEventListener('click', function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
}
/* Welche? Eines → gleich ausführen; mehrere → Fenster mit „Alle“ und je Plan ein Häkchen */
function modWahl(p, art, L, was) {
  const wort = { arch: 'archivieren', zur: 'aus dem Archiv holen', del: 'in den Papierkorb legen' }[was], ding = art === 'plan' ? 'Bauzeitenplan' : 'Kostenermittlung';
  const los = (ids) => modAusfuehren(p, art, ids, was);
  if (L.length === 1 && was !== 'del') { los([L[0].id]); return; }
  const info = (x) => (art === 'plan' ? `${x.versions} gespeicherte Version${x.versions === 1 ? '' : 'en'}` : `${x.stufe ? 'Stufe ' + esc(x.stufe) + ' · ' : ''}${x.files} Pläne (PDF)`) + (x.archived ? ' · archiviert' : '');
  modalBox(`<h3>${ding === 'Bauzeitenplan' ? 'Welche Bauzeitenpläne' : 'Welche Kostenermittlungen'} ${wort}?</h3>
    <p class="mute" style="font-size:.85rem;margin:.2rem 0 .5rem">„${esc(p.name)}“${was === 'del' ? ' – kommt in den Papierkorb (30 Tage wiederherstellbar).' : was === 'arch' ? ' – verschwindet aus der Auswahl, die Daten bleiben.' : ''}</p>
    ${L.length > 1 ? '<label class="chk" style="font-weight:600"><input type="checkbox" data-malle checked> Alle</label>' : ''}
    <div class="dl">${L.map((x) => `<label><input type="checkbox" data-mid="${esc(x.id)}" checked><span><b>${esc(x.name)}</b><small>${info(x)}</small></span></label>`).join('')}</div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn ${was === 'del' ? 'danger' : 'pri'}" data-m="ok">${was === 'del' ? '🗑 In den Papierkorb' : was === 'arch' ? '🗄 Archivieren' : '↩ Zurückholen'}</button></div>`,
  async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const ids = [...bg.querySelectorAll('[data-mid]:checked')].map((c) => c.dataset.mid);
    if (!ids.length) { toast('Nichts ausgewählt.', true); return; }
    btn.disabled = true; close(); await los(ids);
  });
  const bg = [...document.querySelectorAll('.modal-bg')].pop(), alle = bg.querySelector('[data-malle]');
  if (alle) {
    alle.addEventListener('change', () => bg.querySelectorAll('[data-mid]').forEach((c) => { c.checked = alle.checked; }));
    bg.addEventListener('change', (e) => { if (e.target.matches('[data-mid]')) alle.checked = [...bg.querySelectorAll('[data-mid]')].every((c) => c.checked); });
  }
}
async function modAusfuehren(p, art, ids, was) {
  const feld = art === 'plan' ? 'plans' : 'bks', wert = (x) => (art === 'plan' ? x : +x);
  try {
    if (was === 'del') {
      const r = await api('api/projects/delete', 'POST', { bt: null, plans: art === 'plan' ? ids : [], bks: art === 'bk' ? ids.map(Number) : [] });
      toast('Im Papierkorb: ' + r.done.join(', ') + (r.errors.length ? ' – Fehler: ' + r.errors.join('; ') : ''), !!r.errors.length);
    } else {
      const an = was === 'arch';
      await api('api/projects/module', 'PUT', { [feld]: ids.map(wert), archived: an });
      const was2 = ids.length === 1 ? (art === 'plan' ? 'Bauzeitenplan' : 'Kostenermittlung') : `${ids.length} ${art === 'plan' ? 'Bauzeitenpläne' : 'Kostenermittlungen'}`;
      rueckgaengig(`${was2} ${an ? 'archiviert' : 'zurückgeholt'}`,
        async () => { await api('api/projects/module', 'PUT', { [feld]: ids.map(wert), archived: !an }); load(); });
    }
    load();
  } catch (er) { toast(er.message, true); }
}
document.addEventListener('click', (e) => {
  const c = e.target.closest && e.target.closest('.papps [data-mod]'); if (!c) return;
  e.preventDefault(); e.stopPropagation(); modMenu(projOf(c), c.dataset.mod, c);
}, true);
