/* Bautagebuch – Bericht per Sprache (Diktat, 13.11.2026). Teil der Seite index.html (gemeinsame Namen, nach bt-konto.js, vor bt-start.js).
   Frei erzählen (Mikrofon der iPhone-Tastatur), die KI verteilt den Text auf die Bereiche des Berichts von heute. Bestätigen je nach
   Einstellung sofort am Handy oder später am Rechner (Hinweis beim Öffnen am Rechner, To-do auf der Startseite). Übernommen wird über
   die vorhandenen Wege: Einträge (api/reports/…/items), Anwesende „fehlt“ (…/soll), Fortschritt (…/fortschritt), Wetter (PUT Bericht).
   Server: modules/diktat.py (Auswertung, Entwürfe in reports.extra.diktate). */
const dtEinst = () => ({ ok: 'spaeter', ki: 'standard', ...((me.assistent || {}).diktat || {}) });
const DT_LISTEN = [['notizen', 'Notizen'], ['maengel', 'Mängel'], ['zu_erledigen', 'Zu erledigen'], ['weisungen', 'Weisungen']];

function dtOpen() {
  const r = curReport(); if (!r) { toast('Lege zuerst einen Tagesbericht an.'); return; }
  const E = dtEinst();
  modalBox(`<h3>🎙 Diktieren</h3>
    <p class="hint" style="margin:-.2rem 0 .6rem">Bericht vom ${fmt(r.date)} · Mikrofon der Tastatur antippen und frei erzählen – Wetter, wer da war, wie weit, Mängel, Notizen. Satzzeichen sind egal.</p>
    <textarea id="dtText" rows="8" style="width:100%;box-sizing:border-box;font:inherit" placeholder="z. B. Sonnig, zwölf Grad. Elektro Wilhelmi mit drei Leuten, Kabelzug im OG. Estrich EG zur Hälfte fertig. Trockenbau Klein nicht da. Mangel: Fenster Treppenhaus undicht."></textarea>
    <label class="chk" style="margin:.5rem 0"><input type="checkbox" id="dtIntern"${E.ki === 'intern' ? ' checked' : ''}> nur die interne KI (bleibt im Büro, dauert ½–1 Minute)</label>
    <p class="hint" style="margin:0">${E.ok === 'sofort' ? 'Danach zeigt die App das Ergebnis zum Bestätigen.' : 'Danach wird es als Entwurf gemerkt – freigeben später am Rechner (Einstellung im Bautagebuch).'} Kein Ton wird gespeichert.</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Auswerten</button></div>`,
  async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const text = bg.querySelector('#dtText').value.trim(); if (!text) { toast('Bitte erst etwas diktieren.'); return; }
    btn.disabled = true; btn.textContent = 'werte aus …';
    const rId = r.id, intern = bg.querySelector('#dtIntern').checked;
    const x = await api(`api/reports/${rId}/diktat`, 'POST', { text, ki: intern ? 'intern' : '' });
    if (x.error) { btn.disabled = false; btn.textContent = 'Auswerten'; toast(x.error); return; }
    close();
    if (dtEinst().ok === 'sofort') dtPruefen(rId, x);
    else toast('Entwurf gespeichert – Freigabe später am Rechner.');
  });
  setTimeout(() => { const t = document.getElementById('dtText'); if (t) t.focus(); }, 60);
}

/* Ergebnis prüfen: links gesagt, rechts daraus wird – jede Zeile abwählbar und änderbar; Übernehmen trägt alles in den Bericht ein */
function dtPruefen(rId, x) {
  const V = x.vorschlag || {}, W = V.wetter || {};
  const z = (art, k, html) => `<div class="dt-z"><input type="checkbox" checked data-dtan="${art}:${k}" aria-label="übernehmen">${html}</div>`;
  const inp = (art, k, f, v, ph, w) => `<input data-dtf="${art}:${k}:${f}" value="${esc(v == null ? '' : v)}" placeholder="${ph}"${w ? ` style="width:${w}"` : ''}>`;
  const blk = (titel, inner) => (inner ? `<div class="dt-b"><b>${titel}</b>${inner}</div>` : '');
  const h = blk('Wetter', W.weather || W.temp ? z('wetter', 0, inp('wetter', 0, 'weather', W.weather, 'Wetter', '9rem') + inp('wetter', 0, 'temp', W.temp, '°C', '4rem') + ' °C') : '')
    + blk('Anwesend', (V.anwesend || []).map((a, k) => z('anwesend', k, inp('anwesend', k, 'firma', a.firma, 'Firma') + inp('anwesend', k, 'kopf', a.kopf, 'Anz.', '3.5rem') + inp('anwesend', k, 'taetigkeit', a.taetigkeit, 'Tätigkeit'))).join(''))
    + blk('Nicht da (laut Plan erwartet)', (V.fehlt || []).map((f, k) => z('fehlt', k, inp('fehlt', k, 'firma', f, 'Firma'))).join(''))
    + blk('Arbeitsfortschritt', (V.fortschritt || []).map((f, k) => z('fortschritt', k, `<span class="dt-l">${esc(f.vorgang)}${f.firma ? ' · ' + esc(f.firma) : ''}</span>${inp('fortschritt', k, 'pct', f.pct, '%', '4rem')} %`)).join(''))
    + DT_LISTEN.map(([key, t]) => blk(t, (V[key] || []).map((s, k) => z(key, k, inp(key, k, 'text', s, t))).join(''))).join('')
    + ((V.unsicher || []).length ? `<p class="hint" style="color:var(--warn,#b7791f)">Unsicher: ${esc(V.unsicher.join(' · '))} – bitte prüfen.</p>` : '');
  modalBox(`<h3>🎙 Diktat übernehmen</h3>
    <div class="dt-pc"><div><small class="hint">Gesagt${x.von ? ' · ' + esc(x.von) : ''}</small><div class="dt-orig">${esc(x.text)}</div></div>
      <div><small class="hint">Daraus wird – abwählen oder ändern</small>${h || '<p class="hint">Die KI hat nichts zuordnen können.</p>'}</div></div>
    <div class="acts"><button class="btn danger" data-m="weg">Verwerfen</button><button class="btn" data-m="x">Später</button><button class="btn pri" data-m="ok">Übernehmen</button></div>`,
  async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m === 'weg') { await api(`api/reports/${rId}/diktat/${x.id}`, 'PUT', { status: 'verworfen' }); close(); toast('Diktat verworfen.');
      rueckgaengig('Diktat verworfen', async () => { await api(`api/reports/${rId}/diktat/${x.id}`, 'PUT', { status: 'offen' }); }); return; }
    if (m !== 'ok') return;
    const an = (art, k) => (bg.querySelector(`[data-dtan="${art}:${k}"]`) || {}).checked;
    const f = (art, k, n) => ((bg.querySelector(`[data-dtf="${art}:${k}:${n}"]`) || {}).value || '').trim();
    btn.disabled = true; btn.textContent = 'trage ein …';
    const neu = [], fehler = [];
    const post = async (u, b) => { const y = await api(u, 'POST', b); if (y && y.error) fehler.push(y.error); return y || {}; };
    if ((W.weather || W.temp) && an('wetter', 0)) { const y = await api('api/reports/' + rId, 'PUT', { weather: f('wetter', 0, 'weather'), temp: f('wetter', 0, 'temp'), extra: { wx_auto: 0 } }); if (y && y.error) fehler.push(y.error); }
    for (const [k] of (V.anwesend || []).entries()) if (an('anwesend', k) && f('anwesend', k, 'firma')) {
      const kp = parseInt(f('anwesend', k, 'kopf'), 10);
      const y = await post(`api/reports/${rId}/items`, { kind: 'anwesende', text: f('anwesend', k, 'firma'), activity: f('anwesend', k, 'taetigkeit'), headcount: kp > 0 ? kp : null }); if (y.id) neu.push(y.id); }
    for (const [k] of (V.fehlt || []).entries()) if (an('fehlt', k) && f('fehlt', k, 'firma')) await post(`api/reports/${rId}/soll`, { firma: f('fehlt', k, 'firma'), status: 'fehlt' });
    for (const [k, g] of (V.fortschritt || []).entries()) if (an('fortschritt', k)) { const p = Math.max(0, Math.min(100, parseInt(f('fortschritt', k, 'pct'), 10) || 0));
      await post(`api/reports/${rId}/fortschritt`, { gantt_id: g.gantt_id, uid: g.uid, pct: p, ampel: p >= 100 ? 'fertig' : '' }); }
    for (const [key] of DT_LISTEN) for (const [k] of (V[key] || []).entries()) if (an(key, k) && f(key, k, 'text')) { const y = await post(`api/reports/${rId}/items`, { kind: key, text: f(key, k, 'text') }); if (y.id) neu.push(y.id); }
    await api(`api/reports/${rId}/diktat/${x.id}`, 'PUT', { status: 'uebernommen' });
    close(); if (pid) await openProject(pid, true);
    toast(fehler.length ? 'Übernommen – nicht alles: ' + fehler.slice(0, 2).join(' · ') : 'Diktat in den Bericht übernommen.', !!fehler.length);
    rueckgaengig('Diktat übernommen', async () => {   // Einträge wieder heraus, Entwurf wieder offen (Fortschritt und „nicht da“ bleiben)
      for (const id of neu) await api('api/items/' + id, 'DELETE');
      await api(`api/reports/${rId}/diktat/${x.id}`, 'PUT', { status: 'offen' }); if (pid) await openProject(pid, true); });
  });
}

/* Am Rechner: offene Diktate melden (einmal je Sitzung) – „Jetzt ansehen“ öffnet Projekt, Bericht und Prüfen */
async function dtMelden() {
  if (matchMedia('(hover:none)').matches && dtEinst().ok !== 'sofort') return;   // am Handy nicht – freigegeben wird am Rechner
  let L = []; try { L = await api('api/diktate'); } catch { return; }
  if (!Array.isArray(L) || !L.length) return;
  const hier = L.find((y) => y.rid === rid); if (hier) { dtPruefen(hier.rid, hier); return; }   // aus dem To-do der Startseite: gleich prüfen
  try { if (sessionStorage.getItem('bt.dtGemeldet')) return; } catch { /* egal */ }
  try { sessionStorage.setItem('bt.dtGemeldet', '1'); } catch { /* egal */ }
  const x = L[0];
  if (!(await bpFrage(`${L.length === 1 ? 'Ein diktierter Bericht wartet' : L.length + ' diktierte Berichte warten'} auf deine Freigabe.\n${x.projekt} · Bericht vom ${fmt(x.datum)}`, { ok: 'Jetzt ansehen', abbrechen: 'Später' }))) return;
  dtAnsehen(x);
}
async function dtAnsehen(x) {
  if (pid !== x.pid) await pickProject(x.pid);
  rid = x.rid; gewaehlt = x.rid; tab = 'bericht'; renderDetail();
  dtPruefen(x.rid, x);
}
