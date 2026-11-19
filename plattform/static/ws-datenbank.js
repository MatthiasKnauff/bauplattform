'use strict';
/* Wärmeschutz – Baustoffdatenbank (Fenster „Baustoffe …“): alle Baustoffe mit λ, Rohdichte, μ, sd, c, Quelle und Stand; wo sie verwendet
   werden (Bauteile in Nachweisen, Bauteilkatalog). Eingebaute Werte (DIN 4108-4, DIN EN ISO 10456, Herstellerdatenblätter) lassen sich
   aus- und einblenden oder als eigenen Baustoff kopieren; eigene Baustoffe des Büros anlegen und ändern. Bauteile und Katalog verweisen
   auf den Schlüssel – eine Änderung gilt sofort überall. Nutzt aus ws-bauteil.js: BS, baustoffeLaden, bsName; aus ws-kern.js: zeichne, zahl. */
let BSF = { q: '', art: 'alle', sort: '' };
/* Suchen und Filtern (19.11.2026): Suchfeld mit Filtern (bp/filter.js) – Kategorie, Hersteller, λ-Stufe, Herkunft; Text sucht Name, Hersteller,
   Kategorie und Hinweis (nicht die Quelle: „ISO“ stünde sonst bei jedem Baustoff). Dieselben Filter in der Datenbank und in der Wahl an der Schicht. */
const BS_LSTUFE = (l) => (!l ? 'ohne λ' : l <= 0.025 ? 'λ bis 0,025' : l <= 0.032 ? 'λ 0,026–0,032' : l <= 0.035 ? 'λ 0,033–0,035' : l <= 0.040 ? 'λ 0,036–0,040' : l <= 0.060 ? 'λ 0,041–0,060' : l <= 0.2 ? 'λ 0,061–0,20' : 'λ über 0,20');
const bsFilter = (key, aendern) => bpFilter({ key, aendern, leerStart: key === 'wsbswahl',
  items: () => BS.filter((m) => m.aktiv),
  text: (m) => [m.name, m.hersteller, m.kat, m.hinweis].filter(Boolean).join(' '),
  arten: [{ key: 'kat', name: 'Kategorie', farbe: '#2f7d6d', werte: (m) => [m.kat] },
    { key: 'her', name: 'Hersteller', farbe: '#3b6fb0', werte: (m) => [m.hersteller || 'ohne Hersteller (Richtwert)'] },
    { key: 'lam', name: 'Wärmeleitfähigkeit', farbe: '#c07a2c', werte: (m) => [BS_LSTUFE(m.lambda)] },
    { key: 'herk', name: 'Herkunft', farbe: '#8a5bb0', werte: (m) => [m.herkunft === 'eigen' ? 'eigener Baustoff' : m.hersteller ? 'Herstellerprodukt' : 'DIN 4108-4 / ISO 10456'] }] });
const bsSort = (L) => (BSF.sort === 'lam' ? [...L].sort((a, b) => (a.lambda || 9) - (b.lambda || 9)) : L);
let BSFD = null;   // Filter der Datenbank (gemerkt)
const z3 = (v) => (v == null || v === '' ? '–' : String(+(+v).toPrecision(4)).replace('.', ','));

function bsZeilen() {
  return bsSort(BS.filter((m) => (BSF.art === 'aus' ? !m.aktiv : m.aktiv) && (!BSFD || BSFD.pruefe(m))));
}
function bsTabelle() {
  const L = bsZeilen();
  if (!L.length) return '<p class="mute">Nichts gefunden.</p>';
  let kat = null;
  return `<table class="ws-pt" data-volle><thead><tr><th>Baustoff</th><th class="r">λ</th><th class="r">ρ</th><th class="r">μ</th><th class="r">sd</th><th class="r">c</th><th>Quelle</th><th class="r">verwendet</th><th></th></tr></thead><tbody>${L.map((m) => {
    const k = BSF.sort !== 'lam' && m.kat !== kat ? `<tr><td colspan="9" style="font-weight:600;padding-top:.7rem">${esc(m.kat)}</td></tr>` : ''; kat = m.kat;
    const v = m.verwendet || [0, 0];
    return k + `<tr${m.aktiv ? '' : ' style="opacity:.5"'}><td><span class="sw" style="display:inline-block;width:.75rem;height:.75rem;border-radius:3px;background:${esc(m.farbe)};vertical-align:-1px;margin-right:.35rem"></span>${m.hersteller ? `<b>${esc(m.hersteller)}</b> ` : ''}${esc(m.name)}${m.hinweis ? `<br><small class="mute">${esc(m.hinweis)}</small>` : ''}</td>
      <td class="r">${z3(m.lambda)}</td><td class="r">${z3(m.rho)}</td><td class="r">${m.sd != null ? '' : z3(m.mu)}${m.mu2 != null && m.sd == null ? ' / ' + z3(m.mu2) : ''}</td><td class="r">${m.sd != null ? z3(m.sd) + ' m' : ''}</td><td class="r">${z3(m.c)}</td>
      <td><small>${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.quelle || 'Quelle')}</a>` : esc(m.quelle)}${m.stand ? ' · ' + esc(m.stand) : ''}${m.herkunft === 'eigen' ? ' · eigen' : ''}</small></td>
      <td class="r"><small title="in Bauteilen · im Bauteilkatalog">${v[0] || v[1] ? `${v[0]} · ${v[1]}` : ''}</small></td>
      <td class="r" style="white-space:nowrap">${m.herkunft === 'eigen' ? `<button type="button" class="btn sm" data-m="bsedit" data-k="${esc(m.id)}">Ändern</button>` : `<button type="button" class="btn sm" data-m="bskopie" data-k="${esc(m.id)}" title="Als eigenen Baustoff kopieren, z. B. mit dem Bemessungswert Ihres Produkts">Kopieren</button>`}
        <button type="button" class="btn sm" data-m="bsaktiv" data-k="${esc(m.id)}" title="${m.aktiv ? 'In der Auswahl nicht mehr anbieten (bleibt in vorhandenen Bauteilen)' : 'Wieder anbieten'}">${m.aktiv ? 'Ausblenden' : 'Einblenden'}</button></td></tr>`; }).join('')}</tbody></table>`;
}
async function baustoffeZeigen() {
  try { baustoffeSetzen((await api('api/baustoffe?verwendet=1')).baustoffe.map(wsBaustoff)); } catch (er) { toast(er.message, true); return; }
  const n = BS.length, nh = BS.filter((m) => m.hersteller).length, ne = BS.filter((m) => m.herkunft === 'eigen').length;
  const seg = () => [['alle', 'angeboten'], ['aus', 'ausgeblendet']].map(([k, t]) => `<button type="button" class="btn sm${BSF.art === k ? ' pri' : ''}" data-m="bsart" data-a="${k}">${t}</button>`).join(' ')
    + ` <button type="button" class="btn sm${BSF.sort === 'lam' ? ' pri' : ''}" data-m="bssort" title="Nach Wärmeleitfähigkeit sortieren (kleinste zuerst) statt nach Kategorie">λ ↑</button> <small class="mute" data-bsn>${bsZeilen().length} gefunden</small>`;
  modalBox(`<div class="ws-bsdlg"><h3>Baustoffe</h3><p class="mute" style="font-size:.84rem;margin:.2rem 0 .6rem">${n} Baustoffe, davon ${nh} Herstellerprodukte und ${ne} eigene. Bemessungswerte nach DIN 4108-4 / DIN EN ISO 10456 bzw. laut Datenblatt (Stand und Link). Bauteile und Bauteilkatalog sind verknüpft: Eine Änderung gilt sofort in allen Bauteilen, die den Baustoff nutzen.</p>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem"><div data-bsf style="flex:1 1 18rem;min-width:0"></div><span data-bsseg>${seg()}</span><button type="button" class="btn sm pri" data-m="bsneu">＋ Eigener Baustoff</button></div>
    <div data-bsl class="ws-bsl" style="max-height:58vh;overflow:auto">${bsTabelle()}</div>
    <div class="btns"><button type="button" class="btn" data-m="zu">Schließen</button></div></div>`, async (m, bg, close, btn) => {
    const neu = () => { bg.querySelector('[data-bsl]').innerHTML = bsTabelle(); bg.querySelector('[data-bsseg]').innerHTML = seg(); };
    if (m === 'zu') { close(); zeichne(); return; }
    if (m === 'bsart') { BSF.art = btn.dataset.a; neu(); return; }
    if (m === 'bssort') { BSF.sort = BSF.sort === 'lam' ? '' : 'lam'; neu(); return; }
    const x = BS.find((y) => y.id === btn.dataset.k);
    if (m === 'bsneu' || m === 'bskopie' || m === 'bsedit') { bsFormular(m === 'bsedit' ? x : null, m === 'bskopie' ? x : null, async () => { await baustoffeZeigenNeu(bg); }); return; }
    if (m === 'bsaktiv' && x) {
      try { await api('api/baustoffe/' + encodeURIComponent(x.id), 'PUT', { aktiv: !x.aktiv }); const war = x.aktiv; x.aktiv = !x.aktiv; neu();
        rueckgaengig(war ? 'Baustoff ausgeblendet' : 'Baustoff eingeblendet', async () => { await api('api/baustoffe/' + encodeURIComponent(x.id), 'PUT', { aktiv: war }); await baustoffeLaden(); zeichne(); }, { neu: async () => { await baustoffeLaden(); zeichne(); } }); } catch (er) { toast(er.message, true); }
    }
  });
  const platz = document.querySelector('.modal [data-bsf]');
  if (platz) { const neu = () => { const md = platz.closest('.modal'); if (!md) return; md.querySelector('[data-bsl]').innerHTML = bsTabelle(); const n = md.querySelector('[data-bsn]'); if (n) n.textContent = bsZeilen().length + ' gefunden'; };
    BSFD = bsFilter('wsbs', neu); platz.appendChild(BSFD.el); neu(); }
}
/* Baustoff an einer Schicht wählen: Suchfeld mit Filtern, Liste mit λ, ρ, μ; Klick übernimmt (19.11.2026). */
function bsWaehlen(wert, fertig, titel) {
  let F = null;
  const liste = () => { const L = bsSort(BS.filter((m) => (m.aktiv || m.id === wert) && (!F || F.pruefe(m)))), mehr = L.length > 300;
    let kat = null;
    return `<table class="ws-pt ws-bsw"><thead><tr><th>Baustoff</th><th class="r">λ</th><th class="r">ρ</th><th class="r">μ / sd</th></tr></thead><tbody>
      <tr data-bsw="eigen"${wert === 'eigen' ? ' class="on"' : ''}><td colspan="4"><b>Freier Baustoff</b> <small class="mute">λ von Hand, nur in diesem Bauteil</small></td></tr>
      ${L.slice(0, 300).map((m) => { const k = BSF.sort !== 'lam' && m.kat !== kat ? `<tr class="kat"><td colspan="4">${esc(m.kat)}</td></tr>` : ''; kat = m.kat;
        return k + `<tr data-bsw="${esc(m.id)}"${m.id === wert ? ' class="on"' : ''}><td><span class="sw" style="background:${esc(m.farbe)}"></span>${m.hersteller ? `<b>${esc(m.hersteller)}</b> ` : ''}${esc(m.name)}${m.hinweis ? `<br><small class="mute">${esc(m.hinweis)}</small>` : ''}</td>
          <td class="r">${z3(m.lambda)}</td><td class="r">${z3(m.rho)}</td><td class="r">${m.sd != null ? z3(m.sd) + ' m' : z3(m.mu)}</td></tr>`; }).join('')}</tbody></table>
      ${mehr ? `<p class="mute" style="font-size:.8rem">${L.length - 300} weitere – bitte weiter eingrenzen.</p>` : ''}${L.length ? '' : '<p class="mute">Nichts gefunden.</p>'}`; };
  modalBox(`<div class="ws-bsdlg"><h3>${esc(titel || 'Baustoff wählen')}</h3>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:flex-start;margin-bottom:.4rem"><div data-bsf style="flex:1 1 18rem;min-width:0"></div>
      <button type="button" class="btn sm${BSF.sort === 'lam' ? ' pri' : ''}" data-m="bssort" title="Nach Wärmeleitfähigkeit sortieren (kleinste zuerst)">λ ↑</button></div>
    <div data-bsl class="ws-bsl" style="max-height:58vh;overflow:auto">${liste()}</div>
    <div class="btns"><button type="button" class="btn" data-m="zu">Abbrechen</button></div></div>`, (m, bg, close, btn) => {
    if (m === 'zu') { close(); return; }
    if (m === 'bssort') { BSF.sort = BSF.sort === 'lam' ? '' : 'lam'; btn.classList.toggle('pri', BSF.sort === 'lam'); bg.querySelector('[data-bsl]').innerHTML = liste(); }
  });
  const md = [...document.querySelectorAll('.modal')].pop(); if (!md) return;
  F = bsFilter('wsbswahl', () => { md.querySelector('[data-bsl]').innerHTML = liste(); });
  md.querySelector('[data-bsf]').appendChild(F.el); md.querySelector('[data-bsl]').innerHTML = liste();
  const q = F.el.querySelector('input'); if (q) setTimeout(() => q.focus(), 0);
  md.querySelector('[data-bsl]').addEventListener('click', (e) => { const r = e.target.closest('[data-bsw]'); if (!r) return;
    const x = md.closest('.modal-bg') || md.parentElement; const zu = md.querySelector('[data-m="zu"]'); if (zu) zu.click(); else if (x) x.remove();
    if (r.dataset.bsw !== wert) fertig(r.dataset.bsw); });
}
async function baustoffeZeigenNeu(bg) {
  try { baustoffeSetzen((await api('api/baustoffe?verwendet=1')).baustoffe.map(wsBaustoff)); } catch { /* bleibt */ }
  const l = bg.querySelector('[data-bsl]'); if (l) l.innerHTML = bsTabelle();
}
/* Eigener Baustoff: neu, als Kopie eines eingebauten oder ändern */
function bsFormular(alt, vorlage, fertig) {
  const v = alt || (vorlage ? { ...vorlage, name: vorlage.name + ' (eigen)', kat: vorlage.kat } : { kat: 'Eigene Baustoffe', farbe: '#d9c7a0', c: 1000, mu: 1 });
  const f = (k, t, w = '7rem', typ = '') => `<label style="display:flex;flex-direction:column;gap:.15rem;font-size:.8rem;color:var(--mute)">${t}<input data-bf="${k}" value="${esc(v[k] == null ? '' : String(v[k]).replace(/^(\d+)\.(\d+)$/, '$1,$2'))}" style="width:${w}"${typ}></label>`;
  const KAT = [...new Set(BS.map((m) => m.kat))];
  modalBox(`<div class="ws-bsform"><h3>${alt ? 'Eigenen Baustoff ändern' : 'Eigener Baustoff'}</h3>
    <p class="mute" style="font-size:.82rem">Für den Nachweis den <b>Bemessungswert</b> λ des eingebauten Produkts eintragen (Datenblatt, Zulassung, Leistungserklärung).</p>
    <div style="display:flex;gap:.5rem 1rem;flex-wrap:wrap;align-items:flex-end">${f('name', 'Name', '16rem')}${f('hersteller', 'Hersteller', '9rem')}
      <label style="display:flex;flex-direction:column;gap:.15rem;font-size:.8rem;color:var(--mute)">Kategorie<select data-bf="kat">${[...new Set([v.kat, ...KAT])].map((k) => `<option${k === v.kat ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
      ${f('lambda', 'λ Bemessungswert [W/mK]', '6rem', ' inputmode="decimal"')}${f('rho', 'Rohdichte [kg/m³]', '6rem', ' inputmode="decimal"')}${f('mu', 'μ', '5rem', ' inputmode="decimal"')}${f('mu2', 'μ (2. Wert)', '5rem', ' inputmode="decimal"')}
      ${f('sd', 'sd [m] (Folien)', '5rem', ' inputmode="decimal"')}${f('c', 'c [J/kgK]', '5rem', ' inputmode="decimal"')}${f('quelle', 'Quelle', '12rem')}${f('stand', 'Stand', '6rem')}${f('url', 'Link zum Datenblatt', '18rem')}${f('hinweis', 'Hinweis', '18rem')}
</div>
    <div class="btns"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">${alt ? 'Speichern' : 'Anlegen'}</button></div></div>`, async (m, bg, close) => {
    if (m !== 'ok') { close(); return; }
    const b = {}; bg.querySelectorAll('[data-bf]').forEach((i) => { const t = i.value.trim(); b[i.dataset.bf] = ['lambda', 'rho', 'mu', 'mu2', 'sd', 'c'].includes(i.dataset.bf) ? (t === '' ? null : t.replace(',', '.')) : t; });
    if (vorlage && vorlage.holz) b.holz = vorlage.holz;
    try {
      if (alt) { const r = await api('api/baustoffe/' + encodeURIComponent(alt.id), 'PUT', b); const vorher = r.vorher, k = alt.id;
        if (vorher) rueckgaengig('Baustoff geändert', async () => { await api('api/baustoffe/' + encodeURIComponent(k), 'PUT', vorher); await baustoffeLaden(); zeichne(); }, { neu: async () => { await baustoffeLaden(); zeichne(); } }); }
      else { await api('api/baustoffe', 'POST', b); toast('Baustoff angelegt – steht jetzt in der Auswahl.'); }
      close(); await baustoffeLaden(); zeichne(); if (fertig) fertig();
    } catch (er) { toast(er.message, true); }
  });
}
