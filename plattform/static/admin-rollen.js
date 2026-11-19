'use strict';
/* Verwaltung → Rollen & Rechte: Tabelle Rechte × Rollen (Kästchen ändern die Rolle, mit Rückgängig) und „Wer darf was?“
   (Personen × Rechte mit den Ausnahmen je Person). Die Rechte prüft der Server (bpcore.rechte); hier wird nur eingestellt.
   Gehört zu admin.html (gemeinsame Namen: api, esc, $, data, load). */
let RO_SICHT = 'rollen';

async function renderRollen() {
  const [r, u] = await Promise.all([api('api/rollen'), api('api/users')]); data.r = r; data.u = u;
  const R = r.rollen, L = r.rechte_liste, gruppen = [...new Set(L.map((x) => x.gruppe))];
  const ck = (an, attr, titel) => `<button type="button" class="ro-ck${an ? ' an' : ''}" ${attr} title="${esc(titel)}" aria-pressed="${an}"></button>`;
  const kopf = RO_SICHT === 'rollen'
    ? `<tr><th>Recht</th>${R.map((x) => `<th class="c"><button type="button" class="ro-n" data-ron="${x.key}" title="Klick: umbenennen">${esc(x.name)}</button><small class="mute">${x.n} Person${x.n === 1 ? '' : 'en'}</small>${x.n ? '' : `<button type="button" class="ro-x" data-rox="${x.key}" title="Rolle löschen">✕</button>`}</th>`).join('')}</tr>`
    : `<tr><th>Recht</th>${u.users.filter((p) => p.active).map((p) => `<th class="c">${esc(p.full || p.name)}<small class="mute">${esc((R.find((x) => x.key === p.rolle) || {}).name || '')}</small></th>`).join('')}</tr>`;
  const MOD = [['', 'Büro'], ['einfach', 'Basic'], ['profi', 'Profi']];   // Ansicht beim Start (Vorgabe der Rolle; jede Person kann je App umschalten)
  const modZeile = RO_SICHT === 'rollen' ? `<tr><td><b>Startet in</b><small class="mute ro-e">Basic oder Profi für alle mit dieser Rolle, solange sie nicht selbst umschalten (je App oben in der Kopfleiste). „Büro“ = Vorgabe unter Darstellung.</small></td>${R.map((ro) => `<td class="c"><span class="seg ro-mod">${MOD.map(([k, t]) => `<button type="button" class="btn sm${(ro.modus || '') === k ? ' pri' : ''}" data-romod="${ro.key}" data-m="${k}">${t}</button>`).join('')}</span></td>`).join('')}</tr>` : '';
  const zeilen = gruppen.map((gr) => `<tr class="grp"><td colspan="99">${esc(gr)}</td></tr>` + L.filter((x) => x.gruppe === gr).map((x) => `<tr><td><b>${esc(x.name)}</b><small class="mute ro-e">${esc(x.erkl)}</small></td>${RO_SICHT === 'rollen'
    ? R.map((ro) => `<td class="c">${ck(ro.rechte.includes(x.key), `data-rock="${ro.key}" data-recht="${x.key}"`, `${ro.name}: ${x.name}`)}</td>`).join('')
    : u.users.filter((p) => p.active).map((p) => { const plus = p.plus.includes(x.key), minus = p.minus.includes(x.key);
      return `<td class="c">${ck(p.rechte.includes(x.key), `data-rop="${p.id}" data-recht="${x.key}"`, plus ? 'einzeln zusätzlich gegeben – Klick: wie die Rolle' : minus ? 'einzeln entzogen – Klick: wie die Rolle' : 'aus der Rolle – Klick: Ausnahme für diese Person')}${plus ? '<i class="ro-a plus">＋</i>' : minus ? '<i class="ro-a minus">−</i>' : ''}</td>`; }).join('')}</tr>`).join('')).join('');
  /* Apps je Rolle (17.11.2026): an · nur lesen · aus – in „Rollen × Rechte“ für die Rolle, in „Wer darf was?“ als Ausnahme je Person */
  const ST = [['an', 'an'], ['lesen', 'nur lesen'], ['aus', 'aus']], stOf = (L) => L.includes('aus') ? 'aus' : L.includes('lesen') ? 'lesen' : 'an';
  const st = (rechteL, a) => stOf(['lesen', 'aus'].filter((s) => rechteL.includes(`app.${a}.${s}`)));
  const seg = (cur, attr, aus) => `<span class="seg ro-app">${ST.map(([k, t]) => `<button type="button" class="btn sm${cur === k ? ' pri ro-' + k : ''}" ${attr} data-s="${k}"${aus ? ' disabled' : ''}>${t}</button>`).join('')}</span>`;
  /* Seiten als Rechte (18.11.2026): eingerückt unter ihrer App – „seite.<key>“ (an) / „seite.<key>.lesen“; ist die App „an“, gilt die Seite mit */
  const sst = (rechteL, k) => (rechteL.includes(`seite.${k}`) ? 'an' : rechteL.includes(`seite.${k}.lesen`) ? 'lesen' : 'aus');
  const zelle = (L, attr, key, voll, ab, sk) => `<td class="c">${seg(sk ? (st(L, key) === 'an' ? 'an' : sst(L, sk)) : st(L, key), attr, voll || (sk && st(L, key) === 'an'))}${ab ? '<i class="ro-a plus" title="Ausnahme für diese Person – die Stufe der Rolle wählen hebt sie auf">＊</i>' : ''}</td>`;
  const zeile = (a, s) => { const K = s ? [`seite.${s.key}`, `seite.${s.key}.lesen`] : [`app.${a.key}.lesen`, `app.${a.key}.aus`], d = s ? ` data-seite="${s.key}"` : '';
    return `<tr${s ? ' class="ro-seite"' : ''}><td>${s ? `↳ ${esc(s.name)}<small class="mute ro-e">${esc(s.erkl)} – zuschaltbar, auch wenn die App „aus“ oder „nur lesen“ ist</small>` : `<b>${esc(a.name)}</b>`}</td>${RO_SICHT === 'rollen'
      ? R.map((ro) => zelle(ro.rechte, `data-roapp="${ro.key}" data-app="${a.key}"${d}`, a.key, ro.rechte.includes('verwaltung'), false, s && s.key)).join('')
      : u.users.filter((p) => p.active).map((p) => zelle(p.rechte, `data-roappp="${p.id}" data-app="${a.key}"${d}`, a.key, p.rechte.includes('verwaltung'), K.some((k) => p.plus.includes(k) || p.minus.includes(k)), s && s.key)).join('')}</tr>`; };
  const appZeilen = `<tr class="grp"><td colspan="99">Apps <small class="mute">an · nur lesen (sehen, nichts ändern) · aus – „Verwaltung“ hat immer alle Apps ganz</small></td></tr>` + (r.apps_liste || []).map((a) => zeile(a) + (a.seiten || []).map((s) => zeile(a, s)).join('')).join('');
  $('#main').innerHTML = `${menNav()}<h1>Rollen &amp; Rechte</h1>
    <div class="bar"><span class="seg"><button type="button" class="btn sm${RO_SICHT === 'rollen' ? ' pri' : ''}" data-ros="rollen">Rollen × Rechte</button><button type="button" class="btn sm${RO_SICHT === 'personen' ? ' pri' : ''}" data-ros="personen">Wer darf was?</button></span><span class="fill"></span><button class="btn pri" data-ronew>+ Rolle</button></div>
    <div class="tbl"><table class="ro-t"><thead>${kopf}</thead><tbody>${modZeile}${zeilen}${appZeilen}</tbody></table></div>
    <div class="note">${RO_SICHT === 'rollen' ? 'Ein Kästchen ändert die Rolle – sofort für alle mit dieser Rolle. Welche Rolle jemand hat, steht unter „Benutzer:in“ → Bearbeiten.' : 'Ein Kästchen hier ist eine Ausnahme nur für diese Person (＋ zusätzlich, − entzogen); nochmal klicken = wieder wie die Rolle.'}
      Hier stehen nur Rechte, die schon geprüft werden; weitere kommen, sobald die Apps sie nutzen. „Verwaltung“ war bisher „Administrator“.</div>`
    + (RO_SICHT === 'rollen' && ADMIN() ? werTabelle(R) : '');
}

$('#main').addEventListener('click', async (e) => {
  const t = e.target.closest('[data-ros],[data-ronew],[data-ron],[data-rox],[data-rock],[data-rop],[data-romod],[data-roapp],[data-roappp]'); if (!t || tab !== 'rollen') return;
  const ro = (k) => data.r.rollen.find((x) => x.key === k), rn = (k) => (data.r.rechte_liste.find((x) => x.key === k) || {}).name;
  try {
    if (t.dataset.ros) { RO_SICHT = t.dataset.ros; return renderRollen(); }
    if (t.dataset.romod) { const x = ro(t.dataset.romod), alt = x.modus || '', m = t.dataset.m; if (m === alt) return;
      await api('api/rollen/' + x.key, 'PUT', { modus: m }); await renderRollen();
      return rueckgaengig(`${x.name}: startet in ${{ '': 'Vorgabe des Büros', einfach: 'Basic', profi: 'Profi' }[m]}`, async () => { await api('api/rollen/' + x.key, 'PUT', { modus: alt }); renderRollen(); }, { neu: async () => { renderRollen(); } }); }
    if (t.hasAttribute('data-ronew')) {
      const n = await bpEingabe('Name der neuen Rolle (die Rechte stellst du danach ein):', '', { ok: 'Anlegen' }); if (!n) return;
      const r = await api('api/rollen', 'POST', { name: n }); await renderRollen();
      return rueckgaengig(`Rolle „${n}“ angelegt`, async () => { await api('api/rollen/' + r.key, 'DELETE'); renderRollen(); }, { neu: async () => { renderRollen(); } });
    }
    if (t.dataset.ron) {
      const x = ro(t.dataset.ron), n = await bpEingabe('Rolle umbenennen:', x.name, { ok: 'Umbenennen' }); if (!n || n === x.name) return;
      await api('api/rollen/' + x.key, 'PUT', { name: n }); await renderRollen();
      return rueckgaengig(`Rolle „${x.name}“ → „${n}“`, async () => { await api('api/rollen/' + x.key, 'PUT', { name: x.name }); renderRollen(); }, { neu: async () => { renderRollen(); } });
    }
    if (t.dataset.rox) {
      const x = ro(t.dataset.rox); await api('api/rollen/' + x.key, 'DELETE'); await renderRollen();
      return rueckgaengig(`Rolle „${x.name}“ gelöscht`, async () => { const r = await api('api/rollen', 'POST', { name: x.name }); await api('api/rollen/' + r.key, 'PUT', { rechte: x.rechte }); renderRollen(); }, { neu: async () => { renderRollen(); } });
    }
    if (t.dataset.rock) {
      const x = ro(t.dataset.rock), k = t.dataset.recht, alt = x.rechte.slice(), neu = alt.includes(k) ? alt.filter((y) => y !== k) : alt.concat(k);
      await api('api/rollen/' + x.key, 'PUT', { rechte: neu }); await renderRollen();
      return rueckgaengig(`${x.name}: „${rn(k)}“ ${neu.includes(k) ? 'gegeben' : 'entzogen'}`, async () => { await api('api/rollen/' + x.key, 'PUT', { rechte: alt }); renderRollen(); }, { neu: async () => { renderRollen(); } });
    }
    if (t.dataset.roapp || t.dataset.roappp) {   // Apps je Rolle / Ausnahme je Person: gewünschte Stufe → Einträge „app.<key>.lesen/aus“
      const a = t.dataset.app, s = t.dataset.s, sk = t.dataset.seite, A = data.r.apps_liste.find((x) => x.key === a) || {};
      const an = sk ? `${A.name} → ${(A.seiten.find((x) => x.key === sk) || {}).name}` : A.name;
      const W = sk ? (s === 'aus' ? [] : [s === 'an' ? `seite.${sk}` : `seite.${sk}.lesen`]) : s === 'an' ? [] : [`app.${a}.${s}`], K = sk ? [`seite.${sk}`, `seite.${sk}.lesen`] : [`app.${a}.lesen`, `app.${a}.aus`];
      const txt = { an: 'an', lesen: 'nur lesen', aus: 'aus' }[s];
      if (t.dataset.roapp) {
        const x = ro(t.dataset.roapp), alt = x.rechte.slice(), neu = alt.filter((k) => !K.includes(k)).concat(W);
        if (JSON.stringify(neu.slice().sort()) === JSON.stringify(alt.slice().sort())) return;
        await api('api/rollen/' + x.key, 'PUT', { rechte: neu }); await renderRollen();
        return rueckgaengig(`${x.name}: ${an} ${txt}`, async () => { await api('api/rollen/' + x.key, 'PUT', { rechte: alt }); renderRollen(); }, { neu: async () => { renderRollen(); } });
      }
      const p = data.u.users.find((y) => y.id === +t.dataset.roappp), rr = (ro(p.rolle) || { rechte: [] }).rechte, alt = { plus: p.plus, minus: p.minus };
      const neu = { plus: p.plus.filter((k) => !K.includes(k)), minus: p.minus.filter((k) => !K.includes(k)) };
      K.forEach((k) => { if (W.includes(k) && !rr.includes(k)) neu.plus.push(k); if (!W.includes(k) && rr.includes(k)) neu.minus.push(k); });   // nur, was von der Rolle abweicht
      await api('api/users/' + p.id, 'PUT', neu); await renderRollen();
      return rueckgaengig(`${p.full || p.name}: ${an} ${txt}`, async () => { await api('api/users/' + p.id, 'PUT', alt); renderRollen(); }, { neu: async () => { renderRollen(); } });
    }
    if (t.dataset.rop) {
      const p = data.u.users.find((y) => y.id === +t.dataset.rop), k = t.dataset.recht, alt = { plus: p.plus, minus: p.minus };
      const inRolle = (ro(p.rolle) || { rechte: [] }).rechte.includes(k), ohne = (L) => L.filter((y) => y !== k);
      const neu = p.plus.includes(k) || p.minus.includes(k) ? { plus: ohne(p.plus), minus: ohne(p.minus) } : inRolle ? { plus: p.plus, minus: p.minus.concat(k) } : { plus: p.plus.concat(k), minus: p.minus };
      await api('api/users/' + p.id, 'PUT', neu); await renderRollen();
      return rueckgaengig(`${p.full || p.name}: „${rn(k)}“ geändert`, async () => { await api('api/users/' + p.id, 'PUT', alt); renderRollen(); }, { neu: async () => { renderRollen(); } });
    }
  } catch (er) { toast(er.message, true); renderRollen(); }
});
