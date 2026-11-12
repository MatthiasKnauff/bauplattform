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
  const zeilen = gruppen.map((gr) => `<tr class="grp"><td colspan="99">${esc(gr)}</td></tr>` + L.filter((x) => x.gruppe === gr).map((x) => `<tr><td><b>${esc(x.name)}</b><small class="mute ro-e">${esc(x.erkl)}</small></td>${RO_SICHT === 'rollen'
    ? R.map((ro) => `<td class="c">${ck(ro.rechte.includes(x.key), `data-rock="${ro.key}" data-recht="${x.key}"`, `${ro.name}: ${x.name}`)}</td>`).join('')
    : u.users.filter((p) => p.active).map((p) => { const plus = p.plus.includes(x.key), minus = p.minus.includes(x.key);
      return `<td class="c">${ck(p.rechte.includes(x.key), `data-rop="${p.id}" data-recht="${x.key}"`, plus ? 'einzeln zusätzlich gegeben – Klick: wie die Rolle' : minus ? 'einzeln entzogen – Klick: wie die Rolle' : 'aus der Rolle – Klick: Ausnahme für diese Person')}${plus ? '<i class="ro-a plus">＋</i>' : minus ? '<i class="ro-a minus">−</i>' : ''}</td>`; }).join('')}</tr>`).join('')).join('');
  $('#main').innerHTML = `${menNav()}<h1>Rollen &amp; Rechte</h1>
    <div class="bar"><span class="seg"><button type="button" class="btn sm${RO_SICHT === 'rollen' ? ' pri' : ''}" data-ros="rollen">Rollen × Rechte</button><button type="button" class="btn sm${RO_SICHT === 'personen' ? ' pri' : ''}" data-ros="personen">Wer darf was?</button></span><span class="fill"></span><button class="btn pri" data-ronew>+ Rolle</button></div>
    <div class="tbl"><table class="ro-t"><thead>${kopf}</thead><tbody>${zeilen}</tbody></table></div>
    <div class="note">${RO_SICHT === 'rollen' ? 'Ein Kästchen ändert die Rolle – sofort für alle mit dieser Rolle. Welche Rolle jemand hat, steht unter „Benutzer:in“ → Bearbeiten.' : 'Ein Kästchen hier ist eine Ausnahme nur für diese Person (＋ zusätzlich, − entzogen); nochmal klicken = wieder wie die Rolle.'}
      Hier stehen nur Rechte, die schon geprüft werden; weitere kommen, sobald die Apps sie nutzen. „Verwaltung“ war bisher „Administrator“.</div>`;
}

$('#main').addEventListener('click', async (e) => {
  const t = e.target.closest('[data-ros],[data-ronew],[data-ron],[data-rox],[data-rock],[data-rop]'); if (!t || tab !== 'rollen') return;
  const ro = (k) => data.r.rollen.find((x) => x.key === k), rn = (k) => (data.r.rechte_liste.find((x) => x.key === k) || {}).name;
  try {
    if (t.dataset.ros) { RO_SICHT = t.dataset.ros; return renderRollen(); }
    if (t.hasAttribute('data-ronew')) {
      const n = await bpEingabe('Name der neuen Rolle (die Rechte stellst du danach ein):', '', { ok: 'Anlegen' }); if (!n) return;
      const r = await api('api/rollen', 'POST', { name: n }); await renderRollen();
      return rueckgaengig(`Rolle „${n}“ angelegt`, async () => { await api('api/rollen/' + r.key, 'DELETE'); renderRollen(); });
    }
    if (t.dataset.ron) {
      const x = ro(t.dataset.ron), n = await bpEingabe('Rolle umbenennen:', x.name, { ok: 'Umbenennen' }); if (!n || n === x.name) return;
      await api('api/rollen/' + x.key, 'PUT', { name: n }); await renderRollen();
      return rueckgaengig(`Rolle „${x.name}“ → „${n}“`, async () => { await api('api/rollen/' + x.key, 'PUT', { name: x.name }); renderRollen(); });
    }
    if (t.dataset.rox) {
      const x = ro(t.dataset.rox); await api('api/rollen/' + x.key, 'DELETE'); await renderRollen();
      return rueckgaengig(`Rolle „${x.name}“ gelöscht`, async () => { const r = await api('api/rollen', 'POST', { name: x.name }); await api('api/rollen/' + r.key, 'PUT', { rechte: x.rechte }); renderRollen(); });
    }
    if (t.dataset.rock) {
      const x = ro(t.dataset.rock), k = t.dataset.recht, alt = x.rechte.slice(), neu = alt.includes(k) ? alt.filter((y) => y !== k) : alt.concat(k);
      await api('api/rollen/' + x.key, 'PUT', { rechte: neu }); await renderRollen();
      return rueckgaengig(`${x.name}: „${rn(k)}“ ${neu.includes(k) ? 'gegeben' : 'entzogen'}`, async () => { await api('api/rollen/' + x.key, 'PUT', { rechte: alt }); renderRollen(); });
    }
    if (t.dataset.rop) {
      const p = data.u.users.find((y) => y.id === +t.dataset.rop), k = t.dataset.recht, alt = { plus: p.plus, minus: p.minus };
      const inRolle = (ro(p.rolle) || { rechte: [] }).rechte.includes(k), ohne = (L) => L.filter((y) => y !== k);
      const neu = p.plus.includes(k) || p.minus.includes(k) ? { plus: ohne(p.plus), minus: ohne(p.minus) } : inRolle ? { plus: p.plus, minus: p.minus.concat(k) } : { plus: p.plus.concat(k), minus: p.minus };
      await api('api/users/' + p.id, 'PUT', neu); await renderRollen();
      return rueckgaengig(`${p.full || p.name}: „${rn(k)}“ geändert`, async () => { await api('api/users/' + p.id, 'PUT', alt); renderRollen(); });
    }
  } catch (er) { toast(er.message, true); renderRollen(); }
});
