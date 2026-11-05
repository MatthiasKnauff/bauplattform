'use strict';
/* To-do-Liste: auf der Startseite klein (TDKLEIN = true), in der App „Aufgaben & Mängel“ komplett.
   Braucht bp.js (api, esc, toast, appUrl) und ein Element #todo. */
var TDKLEIN = false;
/* ---------- To-dos: automatisch aus den Daten der Apps + eigene Aufgaben (rechts neben der Post) ---------- */
let TD = null, TDREF = null, TDOFFEN = null, TDZEIG = { spaeter: false, erledigt: false };
const tdHeute = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const tdPlus = (n) => { const d = new Date(Date.now() + n * 864e5); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const tdDatum = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T12:00'), h = tdHeute(); if (iso === h) return 'heute'; if (iso === tdPlus(1)) return 'morgen'; if (iso === tdPlus(-1)) return 'gestern'; return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
function tdDatumAus(t) {   // „Statik nachfordern bis Fr“ → Titel + Datum
  const WT = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6, sonntag: 0 };
  let d = '', m;
  const weg = (re) => { t = t.replace(re, ' ').replace(/\s+/g, ' ').trim(); };
  if ((m = /\b(?:bis\s+|am\s+)?(heute|morgen|übermorgen)\b/i.exec(t))) { d = tdPlus({ heute: 0, morgen: 1, 'übermorgen': 2 }[m[1].toLowerCase()]); weg(m[0]); }
  else if ((m = /\b(?:bis\s+|am\s+)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/i.exec(t))) { const j = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String(new Date().getFullYear()); d = `${j}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; if (!m[3] && d < tdHeute()) d = `${+j + 1}${d.slice(4)}`; weg(m[0]); }
  else if ((m = /\b(?:bis\s+|am\s+)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so)\b\.?/i.exec(t))) { const z = WT[m[1].toLowerCase()]; let n = (z - new Date().getDay() + 7) % 7; if (!n) n = 7; d = tdPlus(n); weg(m[0]); }
  else if ((m = /\bin\s+(\d{1,3})\s+tag(?:en)?\b/i.exec(t))) { d = tdPlus(+m[1]); weg(m[0]); }
  else if ((m = /\b(?:in\s+)?(\d{1,2})\s+woche[n]?\b|\bnächste\s+woche\b/i.exec(t))) { d = tdPlus(7 * (+m[1] || 1)); weg(m[0]); }
  return { titel: t.replace(/\s+(bis|am)$/i, '').trim(), faellig: d };
}
async function tdLaden() {
  try { TD = await api('api/bp/todo'); } catch (e) { TD = { auto: [], manuell: [], fehler: [e.message] }; }
  tdZeigen();
}
async function tdRef() { if (!TDREF) TDREF = await api('api/bp/todo-regeln').catch(() => ({ regeln: [], projekte: [], benutzer: [], ich: null })); return TDREF; }
function tdAlle() {
  const h = tdHeute();
  const A = (TD.auto || []).map((x) => ({ ...x, f: x.faellig || '' }));
  const M = (TD.manuell || []).map((x) => ({ ...x, f: x.faellig || '', projekt: x.pid && TDREF ? ((TDREF.projekte || []).find((p) => p.id === x.pid) || {}).name || '' : '' }));
  return { offen: [...A.filter((x) => !x.spaeter), ...M.filter((x) => x.status === 'offen')], spaeter: A.filter((x) => x.spaeter), erledigt: M.filter((x) => x.status === 'erledigt'), h };
}
function tdZeile(x) {
  const h = tdHeute(), rot = x.f && x.f < h;
  const unter = [x.auto ? `<span class="rg" title="automatisch erkannt">⚙ ${esc(x.regel_name)}</span>` : '', x.projekt, x.text, !x.auto && x.personen_namen && x.personen_namen.length ? '👥 ' + x.personen_namen.join(', ') : '', !x.auto && (x.dateien || []).length ? '📎 ' + x.dateien.length : '',
    !x.auto && x.erstellt_name && TDREF && x.erstellt_von !== TDREF.ich ? 'von ' + x.erstellt_name : '', x.spaeter ? 'zurückgestellt bis ' + tdDatum(x.spaeter) : '', x.status === 'erledigt' ? `erledigt ${x.erledigt_name ? 'von ' + x.erledigt_name : ''}` : ''].filter(Boolean);
  return `<div class="tr${x.status === 'erledigt' ? ' fertig' : ''}" data-tk="${esc(x.key)}">
    <input type="checkbox" class="ck" data-td="fertig"${x.status === 'erledigt' ? ' checked' : ''} title="${x.auto ? 'Erledigt – ausblenden (kommt nicht wieder)' : 'Erledigt'}" aria-label="erledigt">
    <span class="tt" data-td="${x.auto ? 'oeffnen' : 'bearbeiten'}" title="${x.auto ? 'Zur Stelle in der App' : 'Bearbeiten'}"><b>${x.prio ? '<span class="pr">❗</span>' : ''}${esc(x.titel)}</b><span class="x">${unter.map((u, i) => i === 0 && x.auto ? u : esc(u)).join(' · ')}</span></span>
    <span><span class="tz${rot ? ' rot' : ''}">${esc(tdDatum(x.f))}</span><span class="ta">${x.auto ? `${x.spaeter ? '<button data-td="jetzt" title="Wieder anzeigen">↺</button>' : '<button data-td="spaeter" title="Zurückstellen">⏱ später</button>'}${x.link ? '<button data-td="oeffnen" title="Öffnen">↗</button>' : ''}` : `<button data-td="spaeterm" title="Fälligkeit verschieben">⏱</button>`}</span></span>
    ${TDOFFEN === x.key ? tdEditor(x) : ''}</div>`;
}
function tdEditor(x) {
  const R = TDREF || { projekte: [], benutzer: [] }, pers = new Set(x.personen || []);
  return `<div class="te" data-te="${x.id || ''}">
    <label>Aufgabe<input data-tf="titel" value="${esc(x.titel || '')}"></label>
    <div class="row"><label>fällig am<input type="date" data-tf="faellig" value="${esc(x.faellig || '')}"></label>
      <label>Projekt<span style="display:flex;gap:.3rem"><input type="hidden" data-tf="pid" value="${x.pid || ''}"><button type="button" class="tdp" data-td="projekt">${x.pid ? esc(((R.projekte.find((p) => p.id === x.pid)) || {}).name || 'Projekt') : '– ohne Projekt –'} ▾</button>${x.pid ? '<button type="button" class="tdp" data-td="ohneprojekt" title="Ohne Projekt" style="flex:none">✕</button>' : ''}</span></label></div>
    <div><span style="font-size:.8rem;color:var(--mute)">Beteiligte – sehen die Aufgabe und können sie erledigen</span><div class="bph-chips">${R.benutzer.filter((u) => u.id !== R.ich).map((u) => `<button type="button" class="bph-chip${pers.has(u.id) ? ' on' : ''}" data-tp="${u.id}" aria-pressed="${pers.has(u.id)}">${esc(u.name)}</button>`).join('') || '<small>Keine weiteren Benutzer.</small>'}</div></div>
    <label class="ck2"><input type="checkbox" data-tf="mail"${x.mail ? ' checked' : ''}> Beteiligte per Mail benachrichtigen (beim Hinzufügen)</label>
    <label class="ck2"><input type="checkbox" data-tf="prio"${x.prio ? ' checked' : ''}> ❗ wichtig</label>
    <label>Notiz<textarea data-tf="notiz" rows="2">${esc(x.notiz || '')}</textarea></label>
    <div><span style="font-size:.8rem;color:var(--mute)">Anhänge und Fotos</span>
      <div class="tdf">${(x.dateien || []).map((d) => `<span class="tdd">${/^image\//.test(d.mime) ? `<img src="api/bp/todo/${x.id}/datei/${d.id}" alt="" data-tda="${d.id}">` : `<button type="button" class="tdn" data-tda="${d.id}">📄 ${esc(d.name)}</button>`}<button type="button" class="tdx" data-tdx="${d.id}" title="Entfernen" aria-label="Entfernen">×</button></span>`).join('')}
        ${x.id ? `<label class="btn sm">📎 Anhang<input type="file" data-tup multiple hidden></label><label class="btn sm">📷 Foto<input type="file" data-tup accept="image/*" capture="environment" multiple hidden></label>` : '<small class="mute">Nach dem Speichern kannst du Anhänge und Fotos hinzufügen.</small>'}</div></div>
    <div class="btns"><button class="btn sm pri" data-td="speichern">Speichern</button><button class="btn sm" data-td="zu">Abbrechen</button><span style="flex:1"></span>${x.id && (!TDREF || x.erstellt_von === TDREF.ich) ? '<button class="btn sm" data-td="loeschen">Löschen</button>' : ''}</div></div>`;
}
function tdZeigen() {
  const box = $('#todo'); if (!box) return; if (!TD) { box.innerHTML = '<div class="post-h"><h2>☑ To-dos</h2></div><p class="mute">Lade …</p>'; return; }
  const { offen, spaeter, erledigt, h } = tdAlle();
  const wo = tdPlus(7 - ((new Date().getDay() + 6) % 7) - 1);   // Sonntag dieser Woche
  const G = [['Überfällig', (x) => x.f && x.f < h, 1], ['Heute', (x) => x.f === h], ['Diese Woche', (x) => x.f > h && x.f <= wo], ['Später', (x) => x.f > wo], ['Ohne Datum', (x) => !x.f]];
  const sort = (a, b) => (b.prio || 0) - (a.prio || 0) || (a.f || '9').localeCompare(b.f || '9') || (a.titel || '').localeCompare(b.titel || '');
  const app = window.BPHead && BPHead.conf && (BPHead.conf.apps || []).find((a) => a.key === 'aufgaben' && a.allowed), appL = app ? appUrl(app) + '/#todos' : '';
  let html = `<div class="post-h"><h2>☑ To-dos</h2><span class="mute">${offen.length} offen</span></div>
    <form class="tq" data-td="neuform"><input id="tdNeu" placeholder="+ Neue Aufgabe – z. B. „Statik nachfordern bis Fr“" autocomplete="off" aria-label="Neue Aufgabe"><button class="btn sm pri">Anlegen</button></form>`;
  if (TDOFFEN === 'neu') html += `<div class="tr">${tdEditor({ titel: (TD._neu || {}).titel, faellig: (TD._neu || {}).faellig, pid: window.BPHead && BPHead.projektId ? BPHead.projektId() : null, personen: [], mail: true })}</div>`;
  let n = 0, rest = TDKLEIN ? 6 : 1e9;   // Startseite: nur die dringendsten sechs
  for (const [name, fn, rot] of G) {
    const L = offen.filter(fn).sort(sort); if (!L.length) continue; n += L.length;
    if (rest <= 0) continue;
    html += `<div class="tg${rot ? ' rot' : ''}">${name} · ${L.length}</div>` + L.slice(0, rest).map(tdZeile).join('');
    rest -= L.length;
  }
  if (TDKLEIN) {
    if (!n) html += '<p class="mute" style="margin:.4rem 0">Nichts zu tun 🎉</p>';
    if (appL) html += `<a class="tdalle" href="${esc(appL)}">${n > 6 ? `Alle ${n} offenen To-dos` : 'To-dos'}, Mängel und Erinnerungen →</a>`;
    if ((TD.fehler || []).length) html += `<div class="fehler">${TD.fehler.map(esc).join('<br>')}</div>`;
    box.innerHTML = html; return;
  }
  if (!n) html += `<p class="mute" style="margin:.4rem 0">Nichts zu tun 🎉${(TD.auto || []).length ? '' : ' – automatisch erkannte Aufgaben stellst du unter ⚙ → Aufgaben & Mängel → To-dos ein.'}</p>`;
  if (spaeter.length) html += `<div class="tg">Zurückgestellt · ${spaeter.length} <button data-td="zeig" data-w="spaeter">${TDZEIG.spaeter ? 'ausblenden' : 'anzeigen'}</button></div>` + (TDZEIG.spaeter ? spaeter.sort(sort).map(tdZeile).join('') : '');
  if (erledigt.length) html += `<div class="tg">Erledigt (7 Tage) · ${erledigt.length} <button data-td="zeig" data-w="erledigt">${TDZEIG.erledigt ? 'ausblenden' : 'anzeigen'}</button></div>` + (TDZEIG.erledigt ? erledigt.map(tdZeile).join('') : '');
  if ((TD.fehler || []).length) html += `<div class="fehler">${TD.fehler.map(esc).join('<br>')}</div>`;
  box.innerHTML = html;
}
const tdFinde = (key) => [...(TD.auto || []), ...(TD.manuell || [])].find((x) => x.key === key);
function tdSpaeterMenue(btn, fn) {
  document.querySelectorAll('.sp').forEach((x) => x.remove());
  const r = btn.getBoundingClientRect(), m = document.createElement('div'); m.className = 'sp';
  const fr = (5 - new Date().getDay() + 7) % 7 || 7, mo = (8 - new Date().getDay()) % 7 || 7;
  const ns = new Set();
  m.innerHTML = [['Morgen', 1], ['Übermorgen', 2], ['Freitag', fr], ['Nächsten Montag', mo], ['In einer Woche', 7], ['In zwei Wochen', 14]].filter(([, n]) => !ns.has(n) && ns.add(n)).map(([l, n]) => `<button data-n="${n}">${l} <small style="color:var(--mute)">${tdDatum(tdPlus(n))}</small></button>`).join('') + `<input type="date" aria-label="Datum" min="${tdPlus(1)}">`;
  m.style.top = (r.bottom + scrollY + 4) + 'px'; m.style.left = Math.max(8, r.right + scrollX - 220) + 'px';
  document.body.appendChild(m);
  m.addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (b) { m.remove(); fn(tdPlus(+b.dataset.n)); } });
  m.querySelector('input').addEventListener('change', (e) => { if (e.target.value) { m.remove(); fn(e.target.value); } });
  setTimeout(() => document.addEventListener('mousedown', function weg(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', weg); } }), 0);
}
function tdLesen(te) {
  const v = (k) => te.querySelector(`[data-tf="${k}"]`);
  return { titel: v('titel').value.trim(), faellig: v('faellig').value, pid: +v('pid').value || null, mail: v('mail').checked, prio: v('prio').checked, notiz: v('notiz').value,
    personen: [...te.querySelectorAll('[data-tp].on')].map((b) => +b.dataset.tp) };
}
document.addEventListener('submit', async (e) => {
  if (!e.target.closest('[data-td="neuform"]')) return; e.preventDefault();
  const t = $('#tdNeu').value.trim(); if (!t) return;
  const x = tdDatumAus(t);
  try { const r = await api('api/bp/todo', 'POST', { ...x, pid: window.BPHead && BPHead.projektId ? BPHead.projektId() : null }); TD.manuell.unshift(r.aufgabe); tdZeigen(); toast(`Aufgabe angelegt${x.faellig ? ' – fällig ' + tdDatum(x.faellig) : ''}. Antippen, um Beteiligte oder Notiz zu ergänzen.`); }
  catch (er) { toast(er.message, true); }
});
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-td],[data-tp]'); if (!b || !b.closest('#todo')) return;
  if (b.dataset.tp) { b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); return; }
  const a = b.dataset.td, row = b.closest('[data-tk]'), x = row && tdFinde(row.dataset.tk);
  if (a === 'einst') { if (window.BPHead && BPHead.einstellungen) BPHead.einstellungen({ bereich: 'app', teil: 'todo' }); return; }
  if (a === 'zeig') { TDZEIG[b.dataset.w] = !TDZEIG[b.dataset.w]; tdZeigen(); return; }
  if (a === 'zu') { TDOFFEN = null; tdZeigen(); return; }
  if (a === 'projekt' || a === 'ohneprojekt') {   // dieselbe Projektauswahl wie oben (meine, die der anderen – ohne Archiv)
    const te = b.closest('.te'), setze = (id, name) => { te.querySelector('[data-tf="pid"]').value = id || ''; const st = tdLesen(te); const ziel = x || {}; Object.assign(ziel, st, { pid: id || null }); if (name && TDREF && id && !TDREF.projekte.some((p) => p.id === id)) TDREF.projekte.push({ id, name }); tdZeigen(); };
    if (a === 'ohneprojekt') return setze(null);
    if (window.BPHead && BPHead.projektWahl) BPHead.projektWahl({ aktuell: +te.querySelector('[data-tf="pid"]').value || null, onPick: (id, p) => setze(id, p && p.name) });
    return;
  }
  if (a === 'bearbeiten' && x && TDKLEIN) { const app = ((BPHead.conf || {}).apps || []).find((y) => y.key === 'aufgaben' && y.allowed); if (app) location.href = appUrl(app) + '/#todos&t=' + x.id; return; }
  if (a === 'bearbeiten' && x) { await tdRef(); TDOFFEN = TDOFFEN === x.key ? null : x.key; tdZeigen(); return; }
  if (a === 'oeffnen' && x) {
    if (!x.link) return; if (/^https?:/.test(x.link)) { window.open(x.link, 'bp-outlook'); return; }
    const [k] = x.link.split(':'), app = ((BPHead.conf || {}).apps || []).find((y) => y.key === k && y.allowed);
    if (!app) return toast('Für diese App ist dein Konto nicht freigeschaltet.', true);
    if (x.pid && BPHead.projektSetzen) { try { await BPHead.projektSetzen(x.pid); } catch { /* egal */ } }
    location.href = appUrl(app) + '/' + x.link.slice(k.length + 1); return;
  }
  if (a === 'spaeter' && x) { tdSpaeterMenue(b, async (bis) => { await api('api/bp/todo-zustand', 'POST', { key: x.key, bis }).catch((er) => toast(er.message, true)); x.spaeter = bis; tdZeigen(); toast(`Zurückgestellt bis ${tdDatum(bis)}.`); }); return; }
  if (a === 'spaeterm' && x) { tdSpaeterMenue(b, async (bis) => { try { const r = await api('api/bp/todo/' + x.id, 'PUT', { faellig: bis }); Object.assign(x, r.aufgabe); tdZeigen(); } catch (er) { toast(er.message, true); } }); return; }
  if (a === 'jetzt' && x) { await api('api/bp/todo-zustand', 'POST', { key: x.key }).catch(() => {}); delete x.spaeter; tdZeigen(); return; }
  if (a === 'fertig' && x) {
    if (x.auto) { await api('api/bp/todo-zustand', 'POST', { key: x.key, aus: true }).catch((er) => toast(er.message, true)); TD.auto = TD.auto.filter((y) => y.key !== x.key); tdZeigen(); toast('Ausgeblendet – erscheint nicht wieder.'); return; }
    try { const r = await api('api/bp/todo/' + x.id, 'PUT', { erledigt: b.checked }); Object.assign(x, r.aufgabe); tdZeigen(); } catch (er) { toast(er.message, true); }
    return;
  }
  if (a === 'speichern') {
    const te = b.closest('.te'), body = tdLesen(te); if (!body.titel) return toast('Bitte einen Titel eingeben.', true);
    try {
      const r = x ? await api('api/bp/todo/' + x.id, 'PUT', body) : await api('api/bp/todo', 'POST', body);
      if (x) Object.assign(x, r.aufgabe); else TD.manuell.unshift(r.aufgabe);
      TDOFFEN = null; tdZeigen(); if (r.hinweis) toast(r.hinweis, true);
    } catch (er) { toast(er.message, true); }
    return;
  }
  if (a === 'loeschen' && x) { if (!confirm('Aufgabe löschen?')) return; await api('api/bp/todo/' + x.id, 'DELETE').catch((er) => toast(er.message, true)); TD.manuell = TD.manuell.filter((y) => y.id !== x.id); TDOFFEN = null; tdZeigen(); }
});
async function tdKlein(f) {   // Fotos vor dem Hochladen auf höchstens 2400 px verkleinern
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) || f.size < 600000) return f;
  try {
    const bmp = await createImageBitmap(f), k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    if (k === 1 && f.type === 'image/jpeg') return f;
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const b = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.85));
    return b ? new File([b], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : f;
  } catch { return f; }
}
document.addEventListener('change', async (e) => {
  const inp = e.target.closest('[data-tup]'); if (!inp || !inp.files.length) return;
  const row = inp.closest('[data-tk]'), x = row && tdFinde(row.dataset.tk); if (!x || !x.id) return;
  const fd = new FormData(); for (const f of inp.files) fd.append('datei', await tdKlein(f));
  inp.value = '';
  try {
    const r = await fetch('api/bp/todo/' + x.id + '/datei', { method: 'POST', body: fd, credentials: 'same-origin' });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Hochladen fehlgeschlagen');
    const te = row.querySelector('.te'), stand = te ? tdLesen(te) : null;   // Eingaben im offenen Editor behalten
    x.dateien = d.dateien; if (stand) Object.assign(x, stand, { pid: stand.pid }); tdZeigen();
  } catch (er) { toast(er.message, true); }
});
document.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-tda],[data-tdx]'); if (!a || !a.closest('#todo')) return;
  e.preventDefault(); e.stopPropagation();
  const row = a.closest('[data-tk]'), x = row && tdFinde(row.dataset.tk); if (!x) return;
  if (a.dataset.tdx) {
    if (!confirm('Anhang entfernen?')) return;
    try { const d = await api(`api/bp/todo/${x.id}/datei/${a.dataset.tdx}`, 'DELETE'); x.dateien = d.dateien; tdZeigen(); } catch (er) { toast(er.message, true); }
    return;
  }
  const L = (x.dateien || []).filter((d) => /^image\/|pdf$/.test(d.mime)), k = L.findIndex((d) => String(d.id) === a.dataset.tda);
  if (k >= 0 && window.BPHead && BPHead.ansehen) BPHead.ansehen(L.map((d) => ({ url: `api/bp/todo/${x.id}/datei/${d.id}`, typ: /pdf$/.test(d.mime) ? 'pdf' : 'foto', name: d.name })), k);
  else window.open(`api/bp/todo/${x.id}/datei/${a.dataset.tda}?laden=1`, '_blank');
}, true);
/* Einstellungen → Startseite → To-dos: jede automatische Prüfung an/aus, für wen, für welche Projekte, Schwelle */
async function tdEinstellungen(host) {
  host.innerHTML = '<p class="bph-mu">Lade …</p>';
  const R = await api('api/bp/todo-regeln').catch((e) => { host.textContent = e.message; return null; }); if (!R) return;
  TDREF = R;
  const C = {}; R.regeln.forEach((r) => { C[r.key] = { ...r, fuer: r.fuer === 'alle' ? 'alle' : [...r.fuer], projekte: Array.isArray(r.projekte) ? [...r.projekte] : r.projekte }; });
  const offen = new Set();
  const zeichnen = () => {
    host.innerHTML = `<p class="bph-mu">Die To-do-Liste der Startseite zeigt deine eigenen Aufgaben und – je nach Einstellung – Aufgaben, die die Plattform selbst aus den Daten der Apps erkennt. Die Einstellungen gelten für das ganze Büro; „für wen“ legt fest, wer die Aufgaben sieht.</p>`
      + R.regeln.map((r0) => { const r = C[r0.key], o = offen.has(r.key);
        return `<div style="border:1px solid var(--line);border-radius:10px;padding:.55rem .7rem;margin:.45rem 0" data-rk="${r.key}">
          <div style="display:flex;gap:.6rem;align-items:center"><label class="bph-ck" style="flex:1;margin:0"><input type="checkbox" data-rf="an"${r.an ? ' checked' : ''}> <b>${esc(r.name)}</b></label>
            <small class="bph-mu" style="margin:0">${r.an ? `${r.fuer === 'alle' ? 'alle Benutzer' : r.fuer.length === 1 && r.fuer[0] === R.ich ? 'nur ich' : r.fuer.length + ' Person(en)'} · ${r.projekte === 'meine' ? 'eigene Projekte' : r.projekte === 'alle' ? 'alle Projekte' : r.projekte.length + ' Projekt(e)'}` : 'aus'}</small>
            <button type="button" class="bph-btn" data-rf="mehr" style="padding:.15rem .55rem">${o ? '▴' : '▾'}</button></div>
          ${o ? `<p class="bph-mu" style="margin:.3rem 0">${esc(r.text)}</p>
            ${r.wert_name ? `<label style="display:flex;gap:.4rem;align-items:center;font-size:.9em">${esc(r.wert_name)} <input type="number" min="0" max="365" data-rf="wert" value="${r.wert}" style="width:5rem"> ${esc(r.einheit)}</label>` : ''}
            <div style="margin-top:.4rem;font-size:.85em">Für wen</div>
            <div class="bph-chips"><button type="button" class="bph-chip${r.fuer === 'alle' ? ' on' : ''}" data-rf="fuer-alle">Alle Benutzer</button><button type="button" class="bph-chip${Array.isArray(r.fuer) && r.fuer.length === 1 && r.fuer[0] === R.ich ? ' on' : ''}" data-rf="fuer-ich">Nur ich</button>
              ${Array.isArray(r.fuer) ? R.benutzer.filter((u) => u.id !== R.ich).map((u) => `<button type="button" class="bph-chip${r.fuer.includes(u.id) ? ' on' : ''}" data-rfu="${u.id}">${esc(u.name)}</button>`).join('') : ''}</div>
            <div style="margin-top:.4rem;font-size:.85em">Für welche Projekte</div>
            <div class="bph-chips"><button type="button" class="bph-chip${r.projekte === 'meine' ? ' on' : ''}" data-rf="pr-meine" title="Projekte, in denen die jeweilige Person als Bauleitung eingetragen ist">Eigene Projekte</button><button type="button" class="bph-chip${r.projekte === 'alle' ? ' on' : ''}" data-rf="pr-alle">Alle Projekte</button><button type="button" class="bph-chip${Array.isArray(r.projekte) ? ' on' : ''}" data-rf="pr-wahl">Bestimmte …</button></div>
            ${Array.isArray(r.projekte) ? `<div class="bph-chips">${R.projekte.map((p) => `<button type="button" class="bph-chip${r.projekte.includes(p.id) ? ' on' : ''}" data-rfp="${p.id}">${esc(p.name)}</button>`).join('')}</div>` : ''}` : ''}</div>`; }).join('')
      + `<div class="bph-row" style="margin-top:.6rem"><button type="button" class="bph-btn pri" data-rf="speichern">Speichern</button><span class="bph-mu" data-rmsg style="margin:0"></span></div>`;
  };
  zeichnen();
  host.onchange = (e) => { const k = e.target.closest('[data-rk]'); if (!k) return; const r = C[k.dataset.rk]; if (e.target.dataset.rf === 'an') { r.an = e.target.checked; zeichnen(); } if (e.target.dataset.rf === 'wert') r.wert = +e.target.value || 0; };
  host.onclick = async (e) => {
    const b = e.target.closest('[data-rf],[data-rfu],[data-rfp]'); if (!b || ['an', 'wert'].includes(b.dataset.rf)) return;   // Haken und Zahl: über „change“ (sonst zeichnet der Klick vorher neu und der Haken springt zurück)
    if (b.dataset.rf === 'speichern') {
      try { const n = await api('api/bp/todo-regeln', 'PUT', C); TDREF = n; host.querySelector('[data-rmsg]').textContent = 'Gespeichert.'; tdLaden(); } catch (er) { host.querySelector('[data-rmsg]').textContent = er.message; }
      return;
    }
    const r = C[b.closest('[data-rk]').dataset.rk];
    if (b.dataset.rf === 'mehr') { offen.has(r.key) ? offen.delete(r.key) : offen.add(r.key); }
    else if (b.dataset.rf === 'fuer-alle') r.fuer = 'alle';
    else if (b.dataset.rf === 'fuer-ich') r.fuer = [R.ich];
    else if (b.dataset.rfu) { const u = +b.dataset.rfu; if (r.fuer === 'alle') r.fuer = [R.ich]; r.fuer = r.fuer.includes(u) ? r.fuer.filter((i) => i !== u) : [...r.fuer, u]; if (!r.fuer.length) r.fuer = [R.ich]; }
    else if (b.dataset.rf === 'pr-meine') r.projekte = 'meine';
    else if (b.dataset.rf === 'pr-alle') r.projekte = 'alle';
    else if (b.dataset.rf === 'pr-wahl') r.projekte = Array.isArray(r.projekte) ? r.projekte : [];
    else if (b.dataset.rfp) { const p = +b.dataset.rfp; r.projekte = r.projekte.includes(p) ? r.projekte.filter((i) => i !== p) : [...r.projekte, p]; }
    zeichnen();
  };
}
