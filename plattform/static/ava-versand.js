'use strict';
/* Ausschreibung – Versand an Bieter:innen (vor ava-start.js geladen, gemeinsame Namen; Server: ava_versand.py).
   Eigene Seite links unter Vergabe → „Versand an Bieter:innen“ (besprochen am 13.11.2026, Mock „Versand als Seite“): links die LVs,
   darüber Ablauf und Befehlsleiste (Senden, Erinnern, Nachversand · Unterlagen aus Pläne & Dateien, Fileserver, vom Rechner).
   Auf der Seite: Termine (Abgabe, Rückmeldung), der Bereich „Unterlagen“, je Bieter:in Ansprechperson, Anrede und Stand, darunter die Läufe.
   Senden öffnet den gemeinsamen Versand-Dialog (BPHead.versand) – jede Firma bekommt ihre eigene Mail, nichts geht automatisch. Danach liegt
   alles in einem Ordner „Versand <Datum>“ unter dem LV-Ordner im Projektordner (mit „Angefragte Firmen“ als PDF und Excel). */
const VS = { D: null, lid: null, rechner: [], rlid: null };   // rechner: Dateien vom Rechner – nur bis zum Senden (nicht in der Datenbank)
const vsDe = (t) => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(t || ''); return m ? `${m[3]}.${m[2]}.${m[1]}${m[4] ? ' ' + m[4] : ''}` : ''; };
const VS_RUECK = { abgegeben: 'abgegeben', zusage: 'will abgeben', absage: 'gibt nicht ab', '': 'offen' };   // von Hand; „angebot“ setzt die Plattform, sobald ein Angebot eingetragen ist
const VS_ST = { abgegeben: 'ok', angebot: 'ok', zusage: 'wo', absage: 'no' };
const vsZeit = (t) => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(t || ''); return m ? `${m[3]}.${m[2]}. ${m[4]}` : ''; };
const vsMb = (n) => (n >= 1048576 ? (n / 1048576).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' MB' : n ? Math.max(1, Math.round(n / 1024)) + ' KB' : '');
const VS_TEXTE = {   // Erinnern und Nachversand: eigene Texte (die Angebotsanfrage steht in Kommunikation → Vorlagen)
  erinnerung: { betreff: 'Erinnerung: Angebotsanfrage {lv} – {projekt}',
    text: '{anrede}\n\nwir möchten an unsere Anfrage zu {lv} für das Bauvorhaben {bauvorhaben} erinnern.\n\nBitte teilen Sie uns bis {rueckmeldung} kurz mit, ob Sie ein Angebot abgeben.\nAbgabe des Angebots bis {abgabe}.\n\nMit freundlichen Grüßen\n\n{signatur}' },
  nachversand: { betreff: 'Geänderte Unterlagen: {lv} – {projekt}',
    text: '{anrede}\n\nzu unserer Anfrage {lv} für das Bauvorhaben {bauvorhaben} haben sich die Unterlagen geändert. Anbei der aktuelle Stand – bitte legen Sie ihn Ihrem Angebot zugrunde.\n\nAbgabe des Angebots bis {abgabe}.\n\nMit freundlichen Grüßen\n\n{signatur}' } };

function vVersand() {   // Inhalt rechts neben dem Baum; geladen wird danach (vsSeiteLaden)
  return `<div class="vs-seite" id="vsSeite">${VS.D && VS.lid === (L && L.id) ? vsHtml() : '<p class="hint">Lade …</p>'}</div>`;
}
async function vsSeiteLaden(neu) {
  const el = document.getElementById('vsSeite'); if (!el || !L) return;
  if (VS.rlid !== L.id) { VS.rechner = []; VS.rlid = L.id; }
  try { if (!KONT) KONT = await api('api/kontakte').catch(() => []); if (neu || VS.lid !== L.id || !VS.D) { VS.D = await api(`api/lv/${L.id}/versand`); VS.lid = L.id; } }
  catch (e) { el.innerHTML = `<p class="hint">${esc(e.message)}</p>`; return; }
  vsNeu();
}
const vsNeu = () => { const el = document.getElementById('vsSeite'); if (el && VS.D && L && VS.lid === L.id) el.innerHTML = vsHtml(); if (tab === 'versand') uLeisteNeu(); };

function vsBefehle() {   // Befehlsleiste (ava-kern.js → bereichBefehle)
  const D = VS.D && VS.lid === L.id ? VS.D : null, B = D ? D.bieter : [], mit = B.filter((b) => b.email), raus = mit.filter((b) => b.versendet);
  const ic = { mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', glocke: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    neu: '<path d="M4 4v6h6"/><path d="M20 12a8 8 0 1 1-2.3-5.7L20 9"/>', plan: '<path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 3v16M15 5v16"/>', server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01"/>', pc: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>' };
  return [{ titel: 'Versand', knoepfe: [{ t: 'An Bieter:innen senden', ic: ic.mail, attrs: 'data-vssenden="versand"', aus: !mit.length, tip: mit.length ? 'Jede Firma bekommt ihre eigene Mail mit LV und Unterlagen – nichts geht automatisch' : 'Erst Bieter:innen mit E-Mail-Adresse hinzufügen' },
    { t: 'Erinnern', ic: ic.glocke, attrs: 'data-vssenden="erinnerung"', aus: !raus.length, tip: 'Wer noch nicht geantwortet hat, an Rückmeldung und Abgabe erinnern' },
    { t: 'Nachversand', ic: ic.neu, attrs: 'data-vssenden="nachversand"', aus: !raus.length, tip: 'Geändertes LV und Unterlagen an alle schicken, die schon angefragt sind (ohne Absagen)' }] },
  { titel: 'Unterlagen', knoepfe: [{ t: 'Pläne & Dateien', ic: ic.plan, attrs: 'data-vsu="plaene"', aus: !L.project_id && !pid, tip: 'Pläne (neuester Stand) und PDFs aus dem Projekt beilegen' },
    { t: 'Fileserver', ic: ic.server, attrs: 'data-vsu="server"', aus: !L.project_id && !pid, tip: 'Dateien aus dem Projektordner beilegen' },
    { t: 'Vom Rechner', ic: ic.pc, datei: { accept: '', attrs: 'data-vsrechner multiple' }, tip: 'Dateien vom Rechner beilegen – oder in den Bereich „Unterlagen“ ziehen' }] }];
}

function vsUnterlagenHtml() {
  const D = VS.D, U = D.unterlagen || [], R = VS.rechner, g = U.reduce((s, x) => s + (x.groesse || 0), 0) + R.reduce((s, x) => s + x.groesse, 0);
  const z = (ic, name, sub, tag, gr, x) => `<div class="vs-u"><span>${ic}</span><span class="vs-un">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="vs-ut">${tag}</span><span class="vs-ug">${gr}</span>${x || '<span></span>'}</div>`;
  return `<section class="vs-unt" data-vsdrop><h4>📎 Unterlagen für die Bieter:innen <span class="hint">· ${U.length + R.length + (D.ohne_x83 ? 1 : 2)} Dateien${g ? ' · ' + vsMb(g) + ' dazu' : ''}</span></h4>
    ${z('📄', D.namen.pdf, 'LV ohne Preise – entsteht beim Senden aus dem aktuellen Stand', 'immer dabei', '')}
    ${D.ohne_x83 ? `<div class="vs-u vs-aus"><span>📦</span><span class="vs-un">GAEB-Datei (X83) wird nicht mitgeschickt</span><span></span><span></span><button type="button" class="ib" data-vsx83="1" title="GAEB-Datei wieder mitschicken" aria-label="GAEB-Datei wieder mitschicken">＋</button></div>`
      : z('📦', D.namen.x83, 'LV als GAEB-Datei – entsteht beim Senden', 'GAEB', '', '<button type="button" class="ib" data-vsx83="0" title="GAEB-Datei nicht mitschicken" aria-label="GAEB-Datei nicht mitschicken">✕</button>')}
    ${U.map((x) => z(x.quelle === 'plan' ? '📐' : '📄', x.name, x.sub, x.quelle === 'server' ? 'Fileserver' : 'Pläne &amp; Dateien', vsMb(x.groesse), `<button type="button" class="ib" data-vsux="${esc(x.pfad)}" title="Nicht mitschicken" aria-label="Nicht mitschicken">✕</button>`)).join('')}
    ${R.map((x, i) => z('🖥', x.name, 'nur bis zum Senden – danach im Versand-Ordner', 'Rechner', vsMb(x.groesse), `<button type="button" class="ib" data-vsrx="${i}" title="Nicht mitschicken" aria-label="Nicht mitschicken">✕</button>`)).join('')}
    <p class="hint vs-uh">Oben <b>Unterlagen</b>: Pläne &amp; Dateien, Fileserver oder vom Rechner – oder Dateien hierher ziehen.${g > 20 * 1048576 ? ' <b style="color:var(--red)">Zusammen über 20 MB – manche Postfächer nehmen das nicht an.</b>' : ''}</p></section>`;
}

function vsHtml() {
  const D = VS.D, B = D.bieter, n = (k) => B.filter((b) => (b.rueck || '') === k).length;
  const heute = new Date().toISOString().slice(0, 10);
  const zeile = (b) => { const st = b.rueck || '', ang = st === 'angebot', A = b.anrufe || [], faellig = b.naechst && b.naechst <= heute && (st === '' || st === 'zusage');
    const frist = !st && b.versendet && D.rueckmeldung && D.rueckmeldung < heute;
    return `<tr data-vscid="${b.contact_id}" class="${faellig ? 'vs-faellig' : ''}">
      <td class="vs-fi"><button type="button" class="vs-n" data-vsk title="Adresse bearbeiten (E-Mail, Ansprechperson, Telefon …)">${esc(b.name)}</button><small>${esc([b.trade, b.city].filter(Boolean).join(' · '))}${b.telefon ? ` · ☎ ${esc(b.telefon)}` : ''}</small></td>
      <td class="vs-an"><select data-vsf="email" aria-label="An">${b.adressen.length ? (b.adressen.length > 1 && !b.email ? '<option value="">– bitte wählen –</option>' : '') + b.adressen.map((a) => `<option value="${esc(a.email)}"${a.email === b.email ? ' selected' : ''}>${esc([a.name, a.funktion].filter(Boolean).join(' · ') || 'Firma')} – ${esc(a.email)}</option>`).join('') : '<option value="">keine E-Mail in den Adressen</option>'}</select>
        <input data-vsf="anrede" value="${esc(b.anrede)}" aria-label="Anrede" title="Anrede – aus dem Namen der Ansprechperson, hier für diese Firma änderbar"><small>${b.versendet ? `versendet ${esc(b.versendet)}` : 'noch nicht versendet'}</small></td>
      <td class="vs-sta"><span class="seg sm" role="group" aria-label="Stand">${Object.entries(VS_RUECK).map(([k, t]) => `<button type="button" data-vsrueck="${k}" class="${(ang ? 'abgegeben' : st) === k ? 'on ' + (VS_ST[k] || '') : ''}"${ang ? ' disabled' : ''}>${t}</button>`).join('')}</span>
        ${ang ? '<small>Angebot eingetragen – unter Angebote &amp; Preisspiegel</small>' : st === 'zusage' ? `<label class="vs-kl">Abgabe zugesagt bis<input type="date" data-vsf="bis" value="${esc(b.bis)}"${D.abgabe ? ` max="${esc(D.abgabe.slice(0, 10))}"` : ''}></label>` : st === 'absage' ? `<input class="vs-kl" data-vsf="grund" value="${esc(b.grund)}" placeholder="Grund (z. B. keine Kapazität)">` : frist ? `<small class="vs-rot">noch keine Rückmeldung · Frist ${esc(vsDe(D.rueckmeldung))}</small>` : ''}</td>
      <td><button type="button" class="ib" data-vsweg title="Nicht mehr anfragen" aria-label="Nicht mehr anfragen">✕</button></td></tr>
      <tr data-vscid="${b.contact_id}" class="vs-nfz${faellig ? ' vs-faellig' : ''}"><td></td><td colspan="3" class="vs-nf">${A.map((x, i) => `<div class="vs-a"><i>${i + 1}</i><span class="d">${esc(vsZeit(x.t))}</span><span>${esc(x.text)}${x.wer ? ` <small>· ${esc(x.wer)}</small>` : ''}</span><button type="button" class="ib" data-vsaweg="${i}" aria-label="Notiz löschen">✕</button></div>`).join('')}
        ${b.naechst && (st === '' || st === 'zusage') ? `<div class="vs-a nx"><i>↻</i><span class="d">${esc(vsDe(b.naechst))}</span><span>wieder anrufen</span></div>` : ''}
        ${ang || st === 'abgegeben' || st === 'absage' ? '' : A.length >= 10 ? '<small>10 von 10 Notizen</small>' : `<div class="vs-ae"><input data-vsanruf placeholder="Telefonnotiz … (Enter)" aria-label="Telefonnotiz"><label class="vs-kl" title="nächster Anruf – legt ein To-do an">↻<input type="date" data-vsnaechst value="${esc(b.naechst)}" aria-label="nächster Anruf"></label><button type="button" class="btn sm" data-vsangerufen title="Notiz „angerufen“ mit jetzt anlegen">📞 angerufen</button></div>${A.length ? `<small>${A.length} von 10 Notizen</small>` : ''}`}</td></tr>`; };
  const art = { versand: 'Versand', erinnerung: 'Erinnerung', nachversand: 'Nachversand' };
  return `<div class="vs-t"><label>Abgabe der Angebote<input type="datetime-local" data-vst="abgabe" value="${esc(D.abgabe)}"${D.rueckmeldung ? ` min="${esc(D.rueckmeldung.slice(0, 10))}T00:00"` : ''}></label><label>Rückmeldung bis<input type="date" data-vst="rueckmeldung" value="${esc(D.rueckmeldung)}"${D.abgabe ? ` max="${esc(D.abgabe.slice(0, 10))}"` : ''} title="Bis wann die Firma zu- oder absagt – spätestens am Tag der Abgabe"></label>
    <div class="vs-z"><span>angeschrieben <b>${B.filter((b) => b.versendet).length}</b> von ${B.length}</span><span>abgegeben <b class="ok">${n('angebot') + n('abgegeben')}</b></span><span>wollen abgeben <b class="wo">${n('zusage')}</b></span><span>geben nicht ab <b class="no">${n('absage')}</b></span><span>offen <b>${n('')}</b></span></div></div>
    ${vsUnterlagenHtml()}
    <h4 class="vs-h">Bieter:innen</h4>
    <div class="bar" style="margin:.2rem 0 .6rem"><select data-vsdazu multiple data-bp-auswahl data-ph="＋ Bieter:innen aus den Adressen – mehrere anhaken …" aria-label="Bieter:innen hinzufügen">${D.vorschlaege.length ? `<optgroup label="Gewerk passt">${D.vorschlaege.map((k) => `<option value="${k.contact_id}">${esc(k.name)}${k.city ? ' · ' + esc(k.city) : ''}</option>`).join('')}</optgroup>` : ''}<optgroup label="Alle Firmen">${(KONT || []).filter((k) => !B.some((b) => b.contact_id === k.id) && !D.vorschlaege.some((v) => v.contact_id === k.id)).slice(0, 400).map((k) => `<option value="${k.id}">${esc(k.name)}${k.trade ? ' · ' + esc(k.trade) : ''}</option>`).join('')}</optgroup></select><input data-vsfrei placeholder="＋ oder Firma eintippen, Enter" aria-label="Bieter:in ohne Adresse eintragen" autocomplete="off" style="min-width:13rem;flex:1"></div>
    <div class="vs-b">${B.length ? `<div class="tblw"><table class="vs-tab"><thead><tr><th>Firma</th><th>An · Anrede</th><th>Stand · darunter Telefonnotizen</th><th></th></tr></thead><tbody>${B.map(zeile).join('')}</tbody></table></div>` : '<div class="card empty"><p class="hint">Noch keine Bieter:innen – oben aus den Adressen anhaken (gern mehrere) oder einfach den Namen eintippen (Firmen mit passendem Gewerk stehen oben, alle anderen darunter). Wer ein Angebot abgegeben hat, steht hier von selbst.</p></div>'}</div>
    ${D.laeufe.length ? `<h4 class="vs-h">Bisher verschickt</h4>${D.laeufe.slice().reverse().map((x) => `<div class="vs-l"><b>${esc(art[x.art] || 'Versand')} ${esc(x.datum)}</b> · ${esc(x.wer)} · ${x.an.filter((a) => a.ok).length} Mail${x.an.filter((a) => a.ok).length === 1 ? '' : 's'}${x.an.some((a) => !a.ok) ? ` · <span style="color:var(--red)">${x.an.filter((a) => !a.ok).length} Fehler</span>` : ''}<small>${esc(x.an.map((a) => a.name).join(', '))}</small>${(x.anlagen || []).length ? `<small>📎 ${esc(x.anlagen.join(', '))}</small>` : ''}${(x.ablage || []).length ? `<small>📁 ${esc(String(x.ablage[0]).split('/').filter((t) => !/\.[a-z0-9]{2,4}$/i.test(t)).join('/'))}</small>` : ''}</div>`).join('')}` : ''}`;
}
async function vsSetzen(body, text) {
  const alt = VS.D;
  try { VS.D = await api(`api/lv/${L.id}/versand`, 'PUT', body); vsNeu(); if (text) rueckgaengig(text, async () => { VS.D = await api(`api/lv/${L.id}/versand`, 'PUT', vsZurueck(alt, body)); vsNeu(); }); }
  catch (e) { toast(e.message, true); vsNeu(); }   // abgelehnt (z. B. Rückmeldung nach der Abgabe): wieder den gespeicherten Stand zeigen
}
function vsZurueck(alt, body) {   // Rückgängig: die betroffenen Werte wie vorher
  const out = {}; ['abgabe', 'rueckmeldung', 'unterlagen', 'ohne_x83'].forEach((k) => { if (k in body) out[k] = alt[k] || (k === 'unterlagen' ? [] : k === 'ohne_x83' ? false : ''); });
  if (body.bieter) { out.bieter = {}; Object.entries(body.bieter).forEach(([cid, x]) => { const b = alt.bieter.find((y) => String(y.contact_id) === cid) || {}; out.bieter[cid] = {};
    Object.keys(x).forEach((f) => { if (f === 'anruf' || f === 'anruf_weg') { out.bieter[cid].anrufe = b.anrufe || []; return; } out.bieter[cid][f] = f === 'weg' ? !b.contact_id : f === 'anrede' ? (b.anrede_hand ? b.anrede : '') : f === 'rueck' ? (b.rueck === 'angebot' ? '' : b.rueck || '') : b[f] || ''; }); }); }
  return out;
}
/* Unterlagen: Verweise aus Pläne & Dateien oder vom Fileserver (Baustein dateiwahl.js), Dateien vom Rechner bis zum Senden im Browser */
async function vsUnterlagenWahl(start) {
  const pj = L.project_id || pid, U = VS.D.unterlagen || [];
  const neu = await BPHead.dateiWahl({ project_id: pj, start, titel: 'Unterlagen für die Bieter:innen', schon: U.map((x) => x.pfad) });
  if (!neu || !neu.length) return;
  vsSetzen({ unterlagen: [...U, ...neu] }, neu.length === 1 ? `„${neu[0].name}“ beigelegt` : `${neu.length} Unterlagen beigelegt`);
}
async function vsRechnerDazu(files) {
  const neu = [];
  for (const f of files) {
    if (f.size > 25 * 1048576) { toast(`„${f.name}“ ist zu groß für eine Mail.`, true); continue; }
    const daten = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(r.error); r.readAsDataURL(f); });
    neu.push({ name: f.name, mime: f.type || 'application/octet-stream', daten, groesse: f.size });
  }
  if (!neu.length) return;
  VS.rechner.push(...neu); vsNeu();
  rueckgaengig(neu.length === 1 ? `„${neu[0].name}“ beigelegt` : `${neu.length} Dateien beigelegt`, () => { VS.rechner = VS.rechner.filter((x) => !neu.includes(x)); vsNeu(); });
}
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches && t.matches('[data-vsrechner]') && L) { const fs = [...t.files]; t.value = ''; vsRechnerDazu(fs); return; }
  if (!t.closest || !t.closest('#vsSeite') || !L) return;
  if (t.dataset.vst) return vsSetzen({ [t.dataset.vst]: t.value }, t.dataset.vst === 'abgabe' ? 'Abgabe geändert' : 'Rückmeldefrist geändert');
  if (t.matches('[data-vsdazu]')) {   // mehrere angehakt (auch über mehrere Suchen): alle auf einmal, ein Schritt zum Rückgängigmachen
    const ids = [...t.selectedOptions].map((o) => o.value).filter(Boolean); [...t.options].forEach((o) => { o.selected = false; });
    if (ids.length) vsSetzen({ bieter: Object.fromEntries(ids.map((c) => [c, { weg: false }])) }, ids.length === 1 ? 'Bieter:in hinzugefügt' : `${ids.length} Bieter:innen hinzugefügt`); return; }
  const r = t.closest('[data-vscid]'), f = t.dataset.vsf; if (!r || !f) return;
  const b = VS.D.bieter.find((y) => y.contact_id === +r.dataset.vscid), x = { [f]: t.value };
  if (f === 'email' && !b.anrede_hand) x.anrede = '';   // andere Ansprechperson: Anrede neu aus deren Namen
  vsSetzen({ bieter: { [r.dataset.vscid]: x } }, `${b.name}: ${{ email: 'Ansprechperson', anrede: 'Anrede', bis: 'Abgabe zugesagt bis', grund: 'Grund' }[f] || 'Stand'} geändert`);
});
document.addEventListener('dragover', (e) => { if (e.target.closest && e.target.closest('[data-vsdrop]') && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); e.target.closest('[data-vsdrop]').classList.add('ueber'); } });
document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-vsdrop]'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('ueber'); });
document.addEventListener('drop', (e) => { const z = e.target.closest && e.target.closest('[data-vsdrop]'); if (!z || !L) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('ueber'); vsRechnerDazu([...e.dataTransfer.files]); }, true);   // vor „Datei ablegen“ der Seite
/* Bieter:in ohne Adresse: Name eintippen + Enter → steht gleich in der Liste (als Kontakt angelegt), ergänzt wird später per Klick auf den Namen */
async function vsFrei(inp) {
  const name = inp.value.trim(); if (!name || !L) return;
  inp.value = '';
  try {
    if (!KONT) KONT = await api('api/kontakte').catch(() => []);
    let k = (KONT || []).find((x) => (x.name || '').trim().toLowerCase() === name.toLowerCase());   // gibt es schon: kein zweiter Eintrag
    if (!k) { k = (await api('api/bp/kontakte', 'POST', { name, trade: L.gewerk || '' })).kontakt || {}; KONT = null; }
    const id = k.id || k.contact_id; if (!id) throw new Error('Kontakt nicht angelegt');
    await vsSetzen({ bieter: { [id]: { weg: false } } }, `${name} hinzugefügt`);
    toast(`${name} steht in der Liste – Namen anklicken, um E-Mail und Adresse zu ergänzen.`);
  } catch (er) { inp.value = name; toast(er.message, true); }
}
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-vsfrei]')) { e.preventDefault(); vsFrei(e.target); } });
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !L) return;
  const k = e.target.closest('#vsSeite [data-vsk]');
  if (k && window.BPHead && BPHead.kontaktMaske) {   // Adresse im Fenster bearbeiten – die Seite bleibt
    const cid = +k.closest('[data-vscid]').dataset.vscid, kc = await BPHead.kontaktMaske({ id: cid });
    if (kc) { KONT = null; vsSeiteLaden(true); }
    return;
  }
  const gx = e.target.closest('[data-vsx83]'); if (gx) { const an = gx.dataset.vsx83 === '1'; vsSetzen({ ohne_x83: !an }, an ? 'GAEB-Datei wird wieder mitgeschickt' : 'GAEB-Datei nicht mitschicken'); return; }
  const u = e.target.closest('[data-vsu]'); if (u && VS.D) { vsUnterlagenWahl(u.dataset.vsu); return; }
  const ux = e.target.closest('[data-vsux]'); if (ux) { const p = ux.dataset.vsux, x = (VS.D.unterlagen || []).find((y) => y.pfad === p); vsSetzen({ unterlagen: VS.D.unterlagen.filter((y) => y.pfad !== p) }, `„${x ? x.name : 'Unterlage'}“ nicht mitschicken`); return; }
  const rx = e.target.closest('[data-vsrx]'); if (rx) { const x = VS.rechner.splice(+rx.dataset.vsrx, 1)[0]; vsNeu(); rueckgaengig(`„${x.name}“ nicht mitschicken`, () => { VS.rechner.push(x); vsNeu(); }); return; }
  const w = e.target.closest('#vsSeite [data-vsweg]');
  if (w) { const r = w.closest('[data-vscid]'), b = VS.D.bieter.find((y) => y.contact_id === +r.dataset.vscid); return vsSetzen({ bieter: { [r.dataset.vscid]: { weg: true } } }, `${b.name} nicht mehr anfragen`); }
  const s = e.target.closest('[data-vssenden]'); if (s && VS.D) vsSenden(s.dataset.vssenden || 'versand');
  const rz = e.target.closest('#vsSeite [data-vscid]'); if (!rz || !VS.D) return;
  const cid = rz.dataset.vscid, b = VS.D.bieter.find((y) => y.contact_id === +cid);
  const st = e.target.closest('[data-vsrueck]'); if (st) { const v = st.dataset.vsrueck; if (v === (b.rueck || '')) return;
    if ((v === 'abgegeben' || v === 'absage') && b.todo_id) vsTodo(b, '');   // kein Anruf mehr nötig
    return vsSetzen({ bieter: { [cid]: { rueck: v } } }, `${b.name}: ${VS_RUECK[v]}`); }
  const ab = e.target.closest('[data-vsangerufen]'); if (ab) { const i = rz.querySelector('[data-vsanruf]'); return vsAnruf(b, (i && i.value.trim()) || 'angerufen'); }
  const aw = e.target.closest('[data-vsaweg]'); if (aw) { const alt = JSON.parse(JSON.stringify(b.anrufe || [])); return vsSetzen({ bieter: { [cid]: { anruf_weg: +aw.dataset.vsaweg } } }, `${b.name}: Notiz gelöscht`); }
});
/* Senden: versand (neu anfragen) · erinnerung (wer noch nicht geantwortet hat) · nachversand (geändertes LV an alle Angefragten ohne Absage) */
async function vsSenden(art) {
  const D = VS.D, mit = D.bieter.filter((b) => b.email), ohne = D.bieter.filter((b) => !b.email), U = D.unterlagen || [], R = VS.rechner;
  const an = (b) => (art === 'versand' ? !b.versendet && b.rueck !== 'absage' : art === 'erinnerung' ? !!b.versendet && (!b.rueck || b.rueck === 'zusage') : !!b.versendet && b.rueck !== 'absage');
  const T = art === 'versand' ? D.vorlage : VS_TEXTE[art], mitAnh = art !== 'erinnerung';
  const lvPdf = async () => { const r = await fetch(`api/lv/${L.id}/druck`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layout: { preise: 'leer' } }) });
    if (!r.ok) throw new Error('LV-PDF nicht möglich'); return r.blob(); };
  const titel = { versand: `LV ${L.nr} an Bieter:innen senden`, erinnerung: `Bieter:innen an LV ${L.nr} erinnern`, nachversand: `Geändertes LV ${L.nr} nachschicken` }[art];
  const ok = await BPHead.versand({ titel,
    was: mitAnh ? [{ icon: '📄', name: D.namen.pdf, sub: 'LV ohne Preise – derselbe Druck wie „Drucken“', pdf: lvPdf, ohneUnterschrift: true },
      ...(D.ohne_x83 ? [] : [{ icon: '📦', name: D.namen.x83, sub: 'LV als GAEB-Datei – entsteht beim Senden aus dem aktuellen Stand' }]),
      ...U.map((x) => ({ icon: x.quelle === 'plan' ? '📐' : '📄', name: x.name, sub: [x.quelle === 'server' ? 'Fileserver' : 'Pläne & Dateien', vsMb(x.groesse)].filter(Boolean).join(' · ') })),
      ...R.map((x) => ({ icon: '🖥', name: x.name, sub: 'vom Rechner · ' + vsMb(x.groesse) }))] : [{ icon: '🔔', name: 'Erinnerung ohne Anhänge', sub: 'nur der Text – das LV haben die Firmen schon' }],
    hinweis: (D.abgabe ? '' : '<p class="hint" style="color:var(--warn,#b7791f);margin:.3rem 0 0">Noch kein Abgabetermin – oben auf der Seite eintragen, sonst fällt die Zeile in der Mail weg.</p>') + (ohne.length ? `<p class="hint" style="color:var(--warn,#b7791f);margin:.3rem 0 0">Ohne E-Mail-Adresse (nicht wählbar): ${esc(ohne.map((b) => b.name).join(', '))}</p>` : ''),
    empfaenger: mit.map((b) => ({ name: b.name, sub: b.email, email: b.email, contact_id: b.contact_id, on: an(b) })),
    kopie: false, betreff: T.betreff, text: D.ohne_x83 ? T.text.replace(' und als GAEB-Datei (X83)', '') : T.text,   // ohne GAEB: den Halbsatz aus der Vorlage nehmen
    textHilfe: 'Jede Firma bekommt eine eigene Mail. Platzhalter füllt die Plattform je Firma: {anrede} (persönlich, siehe Liste), {firma}, {lv}, {projekt}, {bauvorhaben}, {abgabe}, {rueckmeldung}, {signatur}. Vorlage der Anfrage ändern: Kommunikation → Vorlagen.',
    fuss: () => `Abgabe ${esc(vsDe(D.abgabe) || '–')} · Rückmeldung ${esc(vsDe(D.rueckmeldung) || '–')} · danach im Projektordner: LV-Ordner → „${{ versand: 'Versand', erinnerung: 'Erinnerung', nachversand: 'Nachversand' }[art]} ${new Date().toISOString().slice(0, 10)}“`,
    knopf: () => 'Mails senden',
    senden: async (W) => {
      const liste = W.an.map((a) => { const b = D.bieter.find((y) => y.contact_id === a.contact_id || y.email === a.email) || {}; return { contact_id: a.contact_id || b.contact_id || null, email: a.email, name: a.name || b.name || '', anrede: b.anrede || '' }; });
      const r = await api(`api/lv/${L.id}/versand/senden`, 'POST', { art, an: liste, betreff: W.betreff, text: W.text, kopie: !!W.kopie, pdf: mitAnh, x83: mitAnh && !D.ohne_x83, unterlagen: mitAnh,
        anhaenge: mitAnh ? R.map((x) => ({ name: x.name, mime: x.mime, daten: x.daten })) : [] });
      VS.D = r; if (mitAnh && r.ergebnis.some((x) => x.ok)) VS.rechner = [];   // vom Rechner: jetzt im Versand-Ordner
      const fe = r.ergebnis.filter((x) => !x.ok);
      toast(`${r.ergebnis.length - fe.length} Mail${r.ergebnis.length - fe.length === 1 ? '' : 's'} gesendet${fe.length ? ` – ${fe.length} Fehler: ${fe.map((x) => x.name + ' (' + x.fehler + ')').join(', ')}` : ''}${r.ablage.length ? ` · im Projektordner: „${r.ordner}“` : r.ablage_fehler ? ' · ' + r.ablage_fehler : ''}.`, !!fe.length);
      if (typeof refreshList === 'function') refreshList();
    } });
  if (ok) vsNeu();
}

/* Nachverfolgung: Telefonnotiz (höchstens 10 je Firma) und „nächster Anruf am …“ mit To-do auf der Startseite */
async function vsAnruf(b, text) { await vsSetzen({ bieter: { [b.contact_id]: { anruf: text } } }, `${b.name}: Telefonnotiz`); const i = document.querySelector(`#vsSeite [data-vscid="${b.contact_id}"] [data-vsanruf]`); if (i) i.focus(); }
async function vsTodo(b, datum) {   // To-do „<Firma> anrufen“ anlegen, verschieben oder (ohne Datum) entfernen; gibt die id zurück
  try {
    if (!datum) { if (b.todo_id) await api('api/bp/todo/' + b.todo_id, 'DELETE').catch(() => {}); return null; }
    if (b.todo_id) { try { await api('api/bp/todo/' + b.todo_id, 'PUT', { faellig: datum }); return b.todo_id; } catch { /* gelöscht oder erledigt: neu anlegen */ } }
    const r = await api('api/bp/todo', 'POST', { titel: `${b.name} anrufen – Angebot ${[L.nr, L.name].filter(Boolean).join(' ')}`.slice(0, 200), notiz: [b.telefon && '☎ ' + b.telefon, D_abgabe()].filter(Boolean).join(' · '), project_id: pid, faellig: datum, prio: 1 });
    return (r.aufgabe || {}).id || null;
  } catch (e) { toast('To-do nicht angelegt: ' + e.message, true); return b.todo_id || null; }
}
const D_abgabe = () => (VS.D && VS.D.abgabe ? 'Abgabe ' + vsDe(VS.D.abgabe) : '');
document.addEventListener('keydown', (e) => { const i = e.target; if (e.key !== 'Enter' || !i.matches || !i.matches('#vsSeite [data-vsanruf]') || !VS.D) return; e.preventDefault();
  const t = i.value.trim(); if (!t) return; const b = VS.D.bieter.find((y) => y.contact_id === +i.closest('[data-vscid]').dataset.vscid); if (b) vsAnruf(b, t); });
document.addEventListener('change', async (e) => { const i = e.target; if (!i.matches || !i.matches('#vsSeite [data-vsnaechst]') || !VS.D) return;
  const b = VS.D.bieter.find((y) => y.contact_id === +i.closest('[data-vscid]').dataset.vscid); if (!b) return;
  const tid = await vsTodo(b, i.value);
  vsSetzen({ bieter: { [b.contact_id]: { naechst: i.value, todo_id: tid } } }, i.value ? `${b.name}: nächster Anruf ${vsDe(i.value)} (To-do)` : `${b.name}: kein Anruf mehr geplant`); });
