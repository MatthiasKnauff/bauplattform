/* Bautagebuch – Bericht Schritt für Schritt (Assistent).
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
/* ---------- Bericht Schritt für Schritt: fragt nacheinander ab, was in den Bericht gehört – Schritte je Benutzer wählbar ---------- */
const BWZ = {open: false, i: 0, set: false};
const bwzPrefs = () => ({on: true, auto: false, steps: {}, ...(me.assistent || {})});
function bwzAll() {   // alle möglichen Schritte in der Reihenfolge des Berichts; Prüfpunkte und Abschluss am Ende
  const S = [];
  for (const sec of meta.sections) {
    if (sec.type === 'weather') S.push({k: 'wetter', t: sec.title || 'Wetter'});
    else if (sec.type === 'list') S.push({k: sec.key, t: sec.title, sec});
    else if (sec.type === 'images') S.push({k: 'fotos', t: sec.title || 'Fotos'});
  }
  S.push({k: 'pruefpunkte', t: 'Prüfpunkte'}, {k: 'abschluss', t: 'Abschluss'});
  return S;
}
const bwzSteps = () => { const P = bwzPrefs(); return bwzAll().filter(x => P.steps[x.k] !== false); };
function bwzOpen() { if (!curReport()) { toast('Lege zuerst einen Tagesbericht an.'); return; } BWZ.open = true; BWZ.i = 0; BWZ.set = false; SOLL.rid = 0; bwzRender(); loadSoll(rid).then(bwzRender); }
function bwzClose() { BWZ.open = false; BWZ.set = false; $('#bwz')?.remove(); }
function bwzRender() {
  if (!BWZ.open) return;
  let box = $('#bwz'); if (!box) { box = document.createElement('div'); box.id = 'bwz'; document.body.appendChild(box); }
  const keep = document.activeElement && box.contains(document.activeElement) ? document.activeElement.dataset.bk : null;
  if (BWZ.set) { box.innerHTML = bwzSetHtml(); return; }
  const S = bwzSteps(); if (!S.length) { BWZ.set = true; box.innerHTML = bwzSetHtml(); return; }
  BWZ.i = Math.max(0, Math.min(BWZ.i, S.length - 1));
  const x = S[BWZ.i], r = curReport(), last = BWZ.i === S.length - 1;
  box.innerHTML = `<div class="bp" role="dialog" aria-label="Bericht Schritt für Schritt"><div class="bh"><b>${esc(x.t)}</b><small style="color:var(--mute)">${BWZ.i + 1} / ${S.length}</small><button data-act="bwzSet" title="Schritte wählen">⚙</button><button data-act="bwzClose" title="Schließen">×</button></div>
    <div class="dots">${S.map((y, k) => `<i class="${k === BWZ.i ? 'on' : k < BWZ.i ? 'done' : ''}"></i>`).join('')}</div>
    <div class="bb">${r ? bwzBody(x, r) : ''}</div>
    <div class="bf">${BWZ.i ? '<button data-act="bwzPrev">Zurück</button>' : ''}<button data-act="bwzClose">Pausieren</button><button class="nx" data-act="${last ? 'bwzClose' : 'bwzNext'}">${last ? 'Fertig' : 'Weiter'}</button></div></div>`;
  if (keep) box.querySelector(`[data-bk="${keep}"]`)?.focus();
  if (box.querySelector('#apv')) renderApv();
}
function bwzBody(x, r) {
  const its = k => r.items.filter(i => i.kind === k);
  if (x.k === 'wetter') return `<p class="sub">Automatisch für den Ort und die Uhrzeit des Berichts eingetragen – bitte prüfen.</p><div class="wg">
      <label>Wetter<select data-f="weather"><option value=""></option>${WX.map(w => `<option ${w === r.weather ? 'selected' : ''}>${w}</option>`).join('')}</select></label>
      <label>Niederschlag<select data-f="precip"><option value=""></option>${PRECIP.map(w => `<option ${w === r.precip ? 'selected' : ''}>${w}</option>`).join('')}</select></label>
      <label>Temperatur (°C)<input data-f="temp" inputmode="decimal" value="${esc(r.temp)}"></label><label>Wind (km/h)<input data-f="wind" inputmode="decimal" value="${esc(r.wind)}"></label></div>
      <button class="big" data-act="gps" style="margin-top:.7rem">${ic('pin', 18)} Wetter für die Projektadresse neu laden</button>`;
  if (x.k === 'pruefpunkte') return `<p class="sub">Zum Abschluss des Baustellentags.</p>${CHECKS.map(([k, l]) => `<label class="chk"><input type="checkbox" data-f="${k}" ${r[k] ? 'checked' : ''}>${l}</label>`).join('')}`;
  if (x.k === 'fotos') return `<p class="sub">${r.images.length ? r.images.length + ' Foto' + (r.images.length > 1 ? 's' : '') + ' im Bericht.' : 'Noch keine Fotos im Bericht.'}</p>
      <button class="big pri" data-act="pickFile">${ic('cam', 18)} Fotos aufnehmen oder auswählen</button>`;
  if (x.k === 'abschluss') {
    const n = listSecs().map(t => [t.title, its(t.key).length]).filter(([, c]) => c).map(([t, c]) => `${c} ${esc(t)}`).join(' · ');
    return `<p class="sub">${n || 'Noch keine Einträge.'}${r.images.length ? ' · ' + r.images.length + ' Fotos' : ''}</p>
      <button class="big pri" data-act="print">${ic('pdf', 18)} Bericht als PDF erzeugen</button><button class="big" data-act="bwzClose">Fertig – Bericht ansehen</button>`;
  }
  const sec = x.sec, lk = sec.extra && sec.extra.link_contacts, list = its(sec.key);
  if (lk) {   // Anwesende: laut Bauzeitenplan vorausgefüllt – bestätigen oder ablehnen, weitere Firmen ergänzen
    const f = (SOLL.rid === r.id ? SOLL.f : []).filter(y => y.status === 'offen' || y.status === 'fehlt' || y.status === 'nein');
    return (f.length ? `<p class="sub">Laut Bauzeitenplan an diesem Tag erwartet – bitte bestätigen oder löschen.</p>` : '')
      + f.map(y => y.status === 'nein' ? sollWeg(y) : y.status === 'fehlt' ? `<div class="card fehlt" data-sollf="${esc(y.firma)}"><b>${esc(y.firma)}</b> – nicht da <div class="r3"><button data-act="sollSet" data-st="offen">Rückgängig</button></div></div>`
        : `<div class="card" data-sollf="${esc(y.firma)}"><b>${esc(y.firma)}</b><div class="r2"><textarea rows="1" data-soll-act data-bk="a${esc(y.key)}" aria-label="Art der Tätigkeit">${esc(y.leistungen.join(', '))}</textarea><input data-soll-cnt data-bk="c${esc(y.key)}" type="number" min="0" placeholder="Anz." aria-label="Anzahl"></div>
          <div class="r3"><button class="ok" data-act="sollDa" data-kind="${esc(sec.key)}">✓ Bestätigen</button><button data-act="sollSet" data-st="nein">🗑 Löschen</button></div></div>`).join('')
      + (list.length ? `<div class="have">Eingetragen:<ul>${list.map(i => `<li>${esc(i.text)}${i.activity ? ' – ' + esc(i.activity) : ''}${i.headcount != null && i.headcount !== '' ? ' (' + esc(i.headcount) + ')' : ''}</li>`).join('')}</ul></div>` : '')
      + `<div class="add qadd"><div class="sgw" style="flex:1 1 100%"><input data-add="${esc(sec.key)}" data-bk="n" ${SGATTR} placeholder="Weitere Firma …"><div class="sug hidden" role="listbox"></div></div>
          <textarea class="ed" rows="1" data-add-act placeholder="Art der Tätigkeit"></textarea><input data-add-cnt type="number" min="0" placeholder="Anz." aria-label="Anzahl Mitarbeiter"><button class="ok" data-act="bwzAdd" data-kind="${esc(sec.key)}">Hinzufügen</button></div>`;
  }
  return (list.length ? `<div class="have">Schon im Bericht:<ul>${list.map(i => `<li>${esc(i.text)}</li>`).join('')}</ul></div>` : `<p class="sub">Noch nichts eingetragen – sonst einfach „Weiter“.</p>`)
    + `<div class="add qadd">${coAdd(sec)}<textarea data-add="${esc(sec.key)}" data-bk="t" rows="3" placeholder="${esc(sec.placeholder)}"></textarea>
      ${sec.extra && sec.extra.due ? `<label class="dl"><span class="dlt">Erinnerung per E-Mail (optional)</span><input type="date" data-add-due> <span>um</span> ${timeSelect('09:00', 'data-add-time')}</label>` : ''}
      ${photoAdd(sec)}<button class="ok" data-act="bwzAdd" data-kind="${esc(sec.key)}">Hinzufügen</button></div>`;
}
function bwzSetHtml() {
  const P = bwzPrefs();
  return `<div class="bp" role="dialog" aria-label="Bericht-Assistent einstellen"><div class="bh"><b>Bericht-Assistent</b><button data-act="bwzClose" title="Schließen">×</button></div>
    <div class="bb"><p class="sub">Welche Schritte soll der Assistent abfragen? Die Einstellung gilt für dein Konto auf allen Geräten.</p>
      ${bwzAll().map(x => `<label class="chk"><input type="checkbox" data-bwzstep="${esc(x.k)}" ${P.steps[x.k] !== false ? 'checked' : ''}>${esc(x.t)}</label>`).join('')}
      <p class="sub" style="margin-top:1rem">Allgemein</p>
      <label class="chk"><input type="checkbox" data-bwzpref="auto" ${P.auto ? 'checked' : ''}>Bei jedem neuen Tagesbericht automatisch starten</label>
      <label class="chk"><input type="checkbox" data-bwzpref="on" ${P.on ? 'checked' : ''}>Assistent im Bericht anbieten (sonst ganz ohne Assistent arbeiten)</label></div>
    <div class="bf">${curReport() && P.on ? '<button data-act="bwzStartNow">Jetzt starten</button>' : ''}<button class="nx" data-act="bwzClose">Fertig</button></div></div>`;
}
async function bwzSave(P) { me.assistent = P; const r = await api('api/account', 'PUT', {assistent: P}); if (r.error) toast(r.error); renderDetail(); }
async function bwzAdd(kind) {   // wie „Hinzufügen“ im Abschnitt, Eingabe aus dem Assistenten
  const box = $('#bwz'), inp = box.querySelector(`[data-add="${kind}"]`), t = inp?.value.trim(); if (!t) { inp?.focus(); return; }
  const row = inp.closest('.add'), body = {kind, text: t};
  if (row.querySelector('[data-add-act]')) { const a = row.querySelector('[data-add-act]').value.trim(), n = row.querySelector('[data-add-cnt]').value; if (a) body.activity = a; if (n !== '') body.headcount = +n; }
  const co = row.querySelector('[data-add-co]'); if (co) body.company = co.value.trim();
  const dd = row.querySelector('[data-add-due]'); if (dd && dd.value) { body.due = dd.value; body.due_time = row.querySelector('[data-add-time]').value || '09:00'; }
  const res = await api(`api/reports/${rid}/items`, 'POST', body); if (res.error) { toast(res.error); return; }
  if (addFiles.length && res.id) { const fs = addFiles; addFiles = []; await uploadPhotos(fs, res.id); }
  if (res.contact_created) toast(`„${res.name}“ wurde zu den Kontakten hinzugefügt.`);
  if (res.contact_id) contacts = await api('api/contacts');
  setSecOpen(kind, true); await openProject(pid, true); bwzRender(); renderApv(); $('#bwz')?.querySelector(`[data-add="${kind}"]`)?.focus();
}
/* Von Hand eingetragene Firma: Tätigkeit (laut Bauzeitenplan, sonst nach Gewerk) und 1 Anwesenden vorschlagen */
async function taetVorschlag(row) {
  const inp = row && row.querySelector('[data-add]'), act = row && row.querySelector('[data-add-act]'), cnt = row && row.querySelector('[data-add-cnt]');
  if (!inp || !act || !rid) return;
  const f = inp.value.trim(); if (!f || act.value.trim() || act.dataset.vf === f) return;
  act.dataset.vf = f;
  try { const r = await api(`api/reports/${rid}/taetigkeit?firma=` + encodeURIComponent(f)); if (r.taetigkeit && !act.value.trim() && inp.value.trim() === f) { act.value = r.taetigkeit; act.dispatchEvent(new Event('input', {bubbles: true})); } } catch (e) { /* ohne Vorschlag */ }
  if (cnt && cnt.value === '') cnt.value = '1';
}
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-add]')) taetVorschlag(e.target.closest('.addrow,.qadd,.add')); });
document.addEventListener('focusin', e => { if (e.target.matches && (e.target.matches('[data-add-act]') || e.target.matches('[data-add-cnt]'))) taetVorschlag(e.target.closest('.addrow,.qadd,.add')); });
document.addEventListener('change', e => {
  const t = e.target; if (!t.closest || !t.closest('#bwz')) return;
  if (t.dataset.bwzstep) { const P = bwzPrefs(); P.steps = {...P.steps, [t.dataset.bwzstep]: t.checked}; bwzSave(P); }
  if (t.dataset.bwzpref) { const P = bwzPrefs(); P[t.dataset.bwzpref] = t.checked; bwzSave(P).then(bwzRender); }
});

/* ---------- Volltextsuche ---------- */
