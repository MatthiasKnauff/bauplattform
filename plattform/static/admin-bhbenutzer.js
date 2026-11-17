/* Verwaltung → Bauherrenportal → Benutzer (GO 17.11.2026, BH A1 B1 C1 D1 + löschbar): alle Zugänge über alle Projekte.
   Links die Liste (Filter: alle · aktiv · eingeladen · gesperrt/abgelaufen, Suche), rechts die Details der gewählten Person:
   Kontakt aus Adressen, Projekte mit Rolle, „Darf im Portal“ je Projekt (◐ = abweichend von der Rolle), Ablauf, Zugang senden,
   Abmelden (alle Geräte), Sperren, Löschen – alles mit Rückgängig. Server: bpcore/bauherren_benutzer.py (/api/bp/bauherren/benutzer). */
let BHB = { D: null, sel: '', f: 'alle', q: '', pid: null };
function bhbStil() {
  if (document.getElementById('bhbStil')) return;
  const s = document.createElement('style'); s.id = 'bhbStil';
  s.textContent = `.bhb{display:grid;grid-template-columns:minmax(0,1fr) 22rem;gap:1rem;align-items:start}@media (max-width:900px){.bhb{grid-template-columns:1fr}}
.bhb-l{min-width:0}.bhb-tw{overflow-x:auto}.bhb table{border-collapse:collapse;width:100%;font-size:.9rem}.bhb th,.bhb td{padding:.35rem .5rem;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
.bhb th{color:var(--mute);font-size:.78rem;font-weight:600}.bhb tr[data-bhbm]{cursor:pointer}.bhb tr.sel td{background:var(--yb,rgba(59,90,143,.08))}.bhb tr.gesp td{color:var(--mute)}
.bhb-st{border:1px solid;border-radius:999px;padding:0 .5rem;font-size:.75rem}.bhb-st.aktiv{color:var(--ok,#2e9d5b)}.bhb-st.eingeladen{color:var(--or,#c27a00)}.bhb-st.gesperrt,.bhb-st.abgelaufen{color:var(--err,#c62f2a)}
.bhb-pj{display:inline-block;border:1px solid var(--line);border-radius:6px;padding:0 .35rem;margin-right:.2rem;font-size:.75rem}
.bhb-leiste{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem}.bhb-leiste input{margin-left:auto;min-width:12rem}
.bhb-d{border:1px solid var(--line);border-radius:10px;padding:.8rem;display:flex;flex-direction:column;gap:.6rem;font-size:.9rem;min-width:0}
.bhb-k{display:grid;grid-template-columns:6.5rem 1fr;gap:.25rem .5rem}.bhb-k>span:nth-child(odd){color:var(--mute)}
.bhb-box{border:1px solid var(--line);border-radius:8px;padding:.5rem .6rem;display:flex;flex-direction:column;gap:.25rem}
.bhb-r{display:flex;justify-content:space-between;align-items:center;gap:.4rem}.bhb-r label{display:flex;gap:.4rem;align-items:center}`;
  document.head.appendChild(s);
}
async function renderBhBenutzer(z) {
  bhbStil();
  if (!BHB.D || z === 'neu') { try { BHB.D = await api('api/bp/bauherren/benutzer'); } catch (e) { $('#main').innerHTML = stNav() + `<p class="err">${esc(e.message)}</p>`; return; } }
  const D = BHB.D, P = D.personen, n = (f) => P.filter(f).length;
  const F = { alle: () => true, aktiv: (p) => p.stand === 'aktiv', eingeladen: (p) => p.stand === 'eingeladen', gesperrt: (p) => p.stand === 'gesperrt' || p.stand === 'abgelaufen' };
  const q = BHB.q.toLowerCase(), L = P.filter(F[BHB.f]).filter((p) => !q || [p.name, p.email, ...p.projekte.map((x) => x.projekt)].join(' ').toLowerCase().includes(q));
  const dt = (t) => (t ? new Date(t.length === 10 ? t + 'T12:00' : t).toLocaleString('de-DE', t.length === 10 ? { day: '2-digit', month: '2-digit', year: 'numeric' } : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–');
  const stand = (p) => `<span class="bhb-st ${p.stand}">${p.stand === 'eingeladen' && p.eingeladen ? 'eingeladen ' + esc(dt(p.eingeladen.slice(0, 10))) : esc(p.stand)}</span>${p.gesendet ? '' : ' <small class="mute">wird übertragen …</small>'}`;
  const rolle = (p) => [...new Set(p.projekte.map((x) => D.rollen[x.rolle] || x.rolle))].join(', ');
  const kette = (k) => `<button class="btn sm${BHB.f === k ? ' pri' : ''}" data-bhbf="${k}">${{ alle: 'Alle', aktiv: 'aktiv', eingeladen: 'eingeladen, nie angemeldet', gesperrt: 'gesperrt / abgelaufen' }[k]} ${n(F[k])}</button>`;
  const p = P.find((x) => x.email === BHB.sel);
  $('#main').innerHTML = stNav() + `<div class="bhb"><div class="bhb-l"><div class="bhb-leiste"><button class="btn pri" data-bhba="einladen">＋ Einladen …</button>${['alle', 'aktiv', 'eingeladen', 'gesperrt'].map(kette).join('')}
    <input type="search" id="bhbQ" placeholder="Name, Mail, Projekt …" value="${esc(BHB.q)}"></div>
    <div class="bhb-tw"><table><thead><tr><th>Name</th><th>E-Mail</th><th>Projekte</th><th>Rolle</th><th>zuletzt da</th><th>Stand</th></tr></thead><tbody>
    ${L.map((x) => `<tr data-bhbm="${esc(x.email)}" class="${x.email === BHB.sel ? 'sel' : ''}${x.stand === 'gesperrt' || x.stand === 'abgelaufen' ? ' gesp' : ''}"><td><b>${esc(x.name || '–')}</b></td><td>${esc(x.email)}</td>
      <td>${x.projekte.map((y) => `<span class="bhb-pj" title="${esc(y.projekt)}">${esc(y.projekt.split(' ')[0])}</span>`).join('')}</td><td>${esc(rolle(x))}</td><td>${esc(x.zuletzt ? dt(x.zuletzt) : '–')}</td><td>${stand(x)}</td></tr>`).join('')
      || `<tr><td colspan="6" class="mute">${P.length ? 'Nichts gefunden.' : 'Noch niemand eingeladen – „＋ Einladen …“ oder am Projekt unter Freigaben.'}</td></tr>`}</tbody></table></div>
    <p class="mute" style="font-size:.85rem">Jede Bauherr:in ist ein Kontakt aus Adressen. Sperren, Rollen und „Abmelden (alle Geräte)“ gehen mit dem nächsten Abgleich ins Portal. Ohne Angabe endet ein Zugang 12 Monate nach der Archivierung des Projekts.</p></div>
    <div class="bhb-d">${p ? detail(p) : '<p class="mute">Links eine Person wählen.</p>'}</div></div>`;
  function detail(p) {
    const pr = p.projekte.find((x) => x.pid === BHB.pid) || p.projekte[0]; BHB.pid = pr && pr.pid;
    const abl = pr ? (pr.ablauf === 'nie' ? 'nie' : pr.ablauf ? 'am ' + dt(pr.ablauf) : pr.ablauf_tag ? '12 Monate nach Archivierung (' + dt(pr.ablauf_tag) + ')' : '12 Monate nach Archivierung') : '';
    return `<h3 style="margin:0">${esc(p.name || p.email)}</h3>
      <div class="bhb-k"><span>Kontakt</span><span>${p.kontakt ? `aus Adressen: <a href="#" data-bhba="kontakt" data-kid="${p.kontakt.id}">${esc(p.kontakt.name)} ↗</a>` : '<span class="mute">nicht in Adressen</span> <button class="btn sm" data-bhba="inadressen">In Adressen anlegen</button>'}</span>
        <span>E-Mail</span><span>${esc(p.email)}</span><span>zuletzt da</span><span>${esc(p.zuletzt ? dt(p.zuletzt) : 'noch nie')}</span>
        <span>läuft ab</span><span><select data-bhbabl><option value=""${pr && !pr.ablauf ? ' selected' : ''}>12 Monate nach Archivierung</option><option value="nie"${pr && pr.ablauf === 'nie' ? ' selected' : ''}>nie</option><option value="datum"${pr && pr.ablauf && pr.ablauf !== 'nie' ? ' selected' : ''}>${pr && pr.ablauf && pr.ablauf !== 'nie' ? 'am ' + esc(dt(pr.ablauf)) : 'an einem Datum …'}</option></select><br><small class="mute">${esc(abl)}</small></span></div>
      <div class="bhb-box"><b>Projekte und Rolle</b>${p.projekte.map((x) => `<div class="bhb-r"><label><input type="radio" name="bhbp" data-bhbp="${x.pid}"${x.pid === BHB.pid ? ' checked' : ''}> <span class="bhb-pj">${esc(x.projekt)}</span>${x.aktiv ? '' : ` <small class="mute">${x.abgelaufen ? 'abgelaufen ' + esc(dt(x.abgelaufen)) : 'gesperrt'}</small>`}</label>
        <span><select data-bhbrolle="${x.pid}">${Object.entries(D.rollen).map(([k, t]) => `<option value="${k}"${k === x.rolle ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select> <button class="btn sm" data-bhba="projektweg" data-pid="${x.pid}" title="Projekt entfernen">✕</button></span></div>`).join('')}
        <div><button class="btn sm" data-bhba="projekt">＋ weiteres Projekt …</button></div></div>
      ${pr ? `<div class="bhb-box"><b>Darf im Portal – ${esc(pr.projekt)}</b>${Object.entries(D.rechte).map(([k, t]) => `<div class="bhb-r"><label><input type="checkbox" data-bhbr="${k}"${pr.rechte[k] ? ' checked' : ''}> ${esc(t)}</label>${pr.eigen.includes(k) ? `<button class="btn sm" data-bhba="std" data-k="${k}" title="abweichend von der Rolle – zurück auf die Vorgabe">◐ ↺</button>` : ''}</div>`).join('')}
        <p class="mute" style="margin:.2rem 0 0;font-size:.82rem">Vorgabe aus der Rolle – je Person abweichend möglich (◐). Was das Projekt im Portal ganz ausgeschaltet hat, bleibt aus.</p></div>` : ''}
      <div style="display:flex;gap:.4rem;flex-wrap:wrap"><button class="btn sm" data-bhba="senden">✉ Zugang senden …</button><button class="btn sm" data-bhba="abmelden">Abmelden (alle Geräte)</button>
        <button class="btn sm" data-bhba="sperren">${p.stand === 'gesperrt' || p.stand === 'abgelaufen' ? 'Wieder zulassen' : 'Sperren'}</button><button class="btn sm" style="color:var(--err,#c62f2a)" data-bhba="loeschen">Löschen</button></div>
      <p class="mute" style="margin:0;font-size:.82rem">${p.eingeladen ? 'Einladung verschickt ' + esc(dt(p.eingeladen.slice(0, 10))) + ' · ' : ''}${p.abmelden ? 'Abmelden wird übertragen …' : ''}</p>`;
  }
}
async function bhbPost(body, text) {
  try { const r = await api('api/bp/bauherren/benutzer', 'POST', body); BHB.D = r; renderBhBenutzer();
    if (r.zurueck) rueckgaengig(text, async () => { try { BHB.D = await api('api/bp/bauherren/benutzer', 'POST', { zurueck: r.zurueck }); renderBhBenutzer(); } catch (e) { toast(e.message, true); } });
    return true;
  } catch (e) { toast(e.message, true); return false; }
}
async function bhbEinladen(mail) {
  const D = BHB.D, p = mail ? D.personen.find((x) => x.email === mail) : null, frei = D.projekte.filter((x) => !p || !p.projekte.some((y) => y.pid === x.id));
  if (!frei.length) { toast('Kein weiteres Projekt frei.'); return; }
  const bg = modalBox(`<h3>${p ? 'Weiteres Projekt für ' + esc(p.name || p.email) : 'Bauherr:in einladen'}</h3><div class="sf">
    ${p ? '' : `<div class="w"><button type="button" class="btn sm" data-bhbadr>Aus Adressen wählen …</button></div><label class="w">Name<input data-bhbn></label><label class="w">E-Mail<input type="email" data-bhbe></label>`}
    <label class="w">Projekt<select data-bhbpj>${frei.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>
    <label>Rolle<select data-bhbro>${Object.entries(D.rollen).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></label></div>
    <p class="mute" style="font-size:.85rem">Die Einladungsmail schickst du danach über „✉ Zugang senden …“ – nichts geht automatisch hinaus.</p>
    <div class="acts"><button class="btn" data-m="zu">Abbrechen</button><button class="btn pri" data-m="ok">${p ? 'Hinzufügen' : 'Einladen'}</button></div>`, async (m, b, close) => {
    if (m === 'zu') { close(); return; }
    const email = p ? p.email : b.querySelector('[data-bhbe]').value.trim().toLowerCase(), name = p ? p.name : b.querySelector('[data-bhbn]').value.trim();
    if (!p && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Bitte eine gültige E-Mail-Adresse angeben.', true); return; }
    if (await bhbPost({ email, name, projekt: { pid: +b.querySelector('[data-bhbpj]').value, rolle: b.querySelector('[data-bhbro]').value, neu: true } }, p ? 'Projekt hinzugefügt' : 'Zugang angelegt')) { BHB.sel = email; close(); renderBhBenutzer(); }
  });
  const adr = bg.querySelector('[data-bhbadr]');
  if (adr) adr.addEventListener('click', async () => {
    const k = await BPHead.kontaktWahl({ titel: 'Bauherr:in aus Adressen', rolle: 'Bauherr' }); if (!k) return;
    let mailK = ''; try { const v = await api('api/bp/kontakte?ids=' + k.id); mailK = (Array.isArray(v) && v[0] && v[0].email) || ''; } catch { /* ohne Mail */ }
    bg.querySelector('[data-bhbn]').value = k.name; bg.querySelector('[data-bhbe]').value = String(mailK).split(/[,;]/)[0].trim();
    if (!mailK) toast('Der Kontakt hat keine E-Mail-Adresse – bitte eintragen (und in Adressen ergänzen).');
  });
}
document.addEventListener('click', async (e) => {
  const t = e.target; if (!t.closest || !t.closest('.bhb, .bhb-leiste')) return;
  const f = t.closest('[data-bhbf]'); if (f) { BHB.f = f.dataset.bhbf; renderBhBenutzer(); return; }
  const r = t.closest('[data-bhbm]'); if (r) { BHB.sel = r.dataset.bhbm; BHB.pid = null; renderBhBenutzer(); return; }
  const a = t.closest('[data-bhba]'); if (!a) return; e.preventDefault();
  const p = BHB.D.personen.find((x) => x.email === BHB.sel), was = a.dataset.bhba;
  if (was === 'einladen') return bhbEinladen();
  if (!p) return;
  if (was === 'projekt') return bhbEinladen(p.email);
  if (was === 'projektweg') { if (await bpFrage(`Projekt bei ${esc(p.name || p.email)} entfernen?${p.projekte.length === 1 ? ' Es ist das letzte – der Zugang wird damit im Portal gelöscht.' : ''}`, { ok: 'Entfernen', gefahr: true })) bhbPost({ email: p.email, projekt: { pid: +a.dataset.pid, weg: true } }, 'Projekt entfernt'); return; }
  if (was === 'std') return bhbPost({ email: p.email, projekt: { pid: BHB.pid, rechte: { [a.dataset.k]: null } } }, 'Wieder wie die Rolle');
  if (was === 'abmelden') return bhbPost({ email: p.email, abmelden: true }, 'Abmelden wird übertragen');
  if (was === 'sperren') { const zu = p.stand === 'gesperrt' || p.stand === 'abgelaufen'; return bhbPost({ email: p.email, aktiv: zu }, zu ? 'Wieder zugelassen' : 'Gesperrt'); }
  if (was === 'loeschen') { if (await bpFrage(`Zugang von ${esc(p.name || p.email)} löschen? Er verschwindet aus allen Projekten und aus dem Portal (Papierkorb).`, { ok: 'Löschen', gefahr: true })) bhbPost({ email: p.email, aktion: 'loeschen' }, 'Zugang gelöscht'); return; }
  if (was === 'senden') { const pr = p.projekte.find((x) => x.pid === BHB.pid) || p.projekte[0]; BPHead.bauherrProjekt(pr.pid, pr.projekt); return; }   // Einladung über den Versand-Dialog am Projekt
  if (was === 'kontakt') { if (await BPHead.kontaktMaske({ id: +a.dataset.kid, name: p.kontakt.name })) renderBhBenutzer('neu'); return; }   // Kontakt aus Adressen ansehen/ändern
  if (was === 'inadressen') { if (await BPHead.kontaktMaske({ name: p.name, email: p.email, trade: 'Bauherr:in' })) renderBhBenutzer('neu'); }
});
document.addEventListener('change', async (e) => {
  const t = e.target; if (!t.closest || !t.closest('.bhb')) return;
  const p = BHB.D.personen.find((x) => x.email === BHB.sel); if (!p) return;
  if (t.matches('[data-bhbp]')) { BHB.pid = +t.dataset.bhbp; renderBhBenutzer(); return; }
  if (t.matches('[data-bhbrolle]')) return bhbPost({ email: p.email, projekt: { pid: +t.dataset.bhbrolle, rolle: t.value } }, 'Rolle geändert');
  if (t.matches('[data-bhbr]')) return bhbPost({ email: p.email, projekt: { pid: BHB.pid, rechte: { [t.dataset.bhbr]: t.checked } } }, 'Recht geändert');
  if (t.matches('[data-bhbabl]')) {
    let v = t.value;
    if (v === 'datum') { v = await bpEingabe('Zugang endet am (TT.MM.JJJJ)', ''); const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec((v || '').trim()); if (!m) { if (v) toast('Bitte als TT.MM.JJJJ.', true); renderBhBenutzer(); return; } v = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
    return bhbPost({ email: p.email, ablauf: v }, 'Ablauf geändert');
  }
});
document.addEventListener('input', (e) => { if (e.target.id !== 'bhbQ') return; BHB.q = e.target.value; const pos = e.target.selectionStart; renderBhBenutzer(); const f = $('#bhbQ'); f.focus(); f.setSelectionRange(pos, pos); });
