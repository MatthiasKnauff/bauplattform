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

function vVersand() {   // Inhalt rechts neben dem Baum; geladen wird danach (vsSeiteLaden) – rechts der abdockbare Bereich mit der Mail (vsRechts)
  return `<div class="vs-sp"><div class="vs-l"><div class="vs-seite" id="vsSeite">${VS.D && VS.lid === (L && L.id) ? vsHtml() : '<p class="hint">Lade …</p>'}</div></div></div>`;
}
async function vsSeiteLaden(neu) {
  const el = document.getElementById('vsSeite'); if (!el || !L) return;
  if (VS.rlid !== L.id) { VS.rechner = []; VS.rlid = L.id; VS.art = ''; VS.wahl = {}; VS.fuer = null; VS.anh = ''; VS.edit = false; }
  try { if (!KONT) KONT = await api('api/kontakte').catch(() => []); if (neu || VS.lid !== L.id || !VS.D) { VS.D = await api(`api/lv/${L.id}/versand`); VS.lid = L.id; } }
  catch (e) { el.innerHTML = `<p class="hint">${esc(e.message)}</p>`; return; }
  vsNeu();
}
const vsNeu = () => { const el = document.getElementById('vsSeite'); if (el && VS.D && L && VS.lid === L.id) { el.innerHTML = vsHtml(); vsRechts(); } if (tab === 'versand') uLeisteNeu(); };

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
  const vk = (t, geaendert) => (t ? `<small class="vs-vk${geaendert ? ' gd' : ''}">verschickt ${esc(t.slice(0, 6))}${geaendert ? ' · geändert seitdem' : ''}</small>` : '<small class="vs-vk neu">noch nicht verschickt</small>');   // Stand je Unterlage – für den Nachversand
  const z = (ic, name, sub, tag, gr, x, v) => `<div class="vs-u"><span>${ic}</span><span class="vs-un">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="vs-ut">${tag}</span><span class="vs-ug">${gr}${v || ''}</span>${x || '<span></span>'}</div>`;
  return `<section class="vs-unt" data-vsdrop><h4>📎 Unterlagen für die Bieter:innen <span class="hint">· ${U.length + R.length + (D.ohne_x83 ? 1 : 2)} Dateien${g ? ' · ' + vsMb(g) + ' dazu' : ''}</span></h4>
    ${z('📄', D.namen.pdf, 'LV ohne Preise – entsteht beim Senden aus dem aktuellen Stand', 'immer dabei', '', '', vk(D.lv_verschickt, D.lv_geaendert))}
    ${D.ohne_x83 ? `<div class="vs-u vs-aus"><span>📦</span><span class="vs-un">GAEB-Datei (X83) wird nicht mitgeschickt</span><span></span><span></span><button type="button" class="ib" data-vsx83="1" title="GAEB-Datei wieder mitschicken" aria-label="GAEB-Datei wieder mitschicken">＋</button></div>`
      : z('📦', D.namen.x83, 'LV als GAEB-Datei – entsteht beim Senden', 'GAEB', '', '<button type="button" class="ib" data-vsx83="0" title="GAEB-Datei nicht mitschicken" aria-label="GAEB-Datei nicht mitschicken">✕</button>', vk(D.lv_verschickt, D.lv_geaendert))}
    ${U.map((x) => z(x.quelle === 'plan' ? '📐' : '📄', x.name, x.sub, x.quelle === 'server' ? 'Fileserver' : 'Pläne &amp; Dateien', vsMb(x.groesse), `<button type="button" class="ib" data-vsux="${esc(x.pfad)}" title="Nicht mitschicken" aria-label="Nicht mitschicken">✕</button>`, vk(x.verschickt))).join('')}
    ${R.map((x, i) => z('🖥', x.name, 'nur bis zum Senden – danach im Versand-Ordner', 'Rechner', vsMb(x.groesse), `<button type="button" class="ib" data-vsrx="${i}" title="Nicht mitschicken" aria-label="Nicht mitschicken">✕</button>`, vk(''))).join('')}
    <p class="hint vs-uh">Oben <b>Unterlagen</b>: Pläne &amp; Dateien, Fileserver oder vom Rechner – oder Dateien hierher ziehen.${g > 20 * 1048576 ? ' <b style="color:var(--red)">Zusammen über 20 MB – manche Postfächer nehmen das nicht an.</b>' : ''}</p></section>`;
}

function vsHtml() {
  const D = VS.D, B = D.bieter, n = (k) => B.filter((b) => (b.rueck || '') === k).length;
  const heute = new Date().toISOString().slice(0, 10);
  const zeile = (b) => { const st = b.rueck || '', ang = st === 'angebot', A = b.anrufe || [], faellig = b.naechst && b.naechst <= heute && (st === '' || st === 'zusage');
    const frist = !st && b.versendet && D.rueckmeldung && D.rueckmeldung < heute;
    return `<tr data-vscid="${b.contact_id}" class="${faellig ? 'vs-faellig' : ''}${VS.fuer === b.contact_id ? ' vs-akt' : ''}">
      <td class="vs-fi"><button type="button" class="vs-n" data-vsk title="Adresse bearbeiten (E-Mail, Ansprechperson, Telefon …)">${esc(b.name)}</button><small>${esc([b.trade, b.city].filter(Boolean).join(' · '))}${b.telefon ? ` · ☎ ${esc(b.telefon)}` : ''}</small></td>
      <td class="vs-an"><select data-vsf="email" data-bp-auswahl aria-label="An">${b.adressen.length ? (b.adressen.length > 1 && !b.email ? '<option value="">– bitte wählen –</option>' : '') + b.adressen.map((a) => `<option value="${esc(a.email)}"${a.email === b.email ? ' selected' : ''}>${esc([a.name, a.funktion].filter(Boolean).join(' · ') || 'Firma')} – ${esc(a.email)}</option>`).join('') : '<option value="">keine E-Mail in den Adressen</option>'}</select>
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
    <div class="bar" style="margin:.2rem 0 .6rem"><select data-vsdazu multiple data-bp-auswahl data-neu="Firma" data-ph="＋ Bieter:innen suchen oder eintippen – mehrere anhaken …" aria-label="Bieter:innen hinzufügen">${D.vorschlaege.length ? `<optgroup label="Gewerk passt">${D.vorschlaege.map((k) => `<option value="${k.contact_id}">${esc(k.name)}${k.city ? ' · ' + esc(k.city) : ''}</option>`).join('')}</optgroup>` : ''}<optgroup label="Alle Firmen">${(KONT || []).filter((k) => !B.some((b) => b.contact_id === k.id) && !D.vorschlaege.some((v) => v.contact_id === k.id)).slice(0, 400).map((k) => `<option value="${k.id}">${esc(k.name)}${k.trade ? ' · ' + esc(k.trade) : ''}</option>`).join('')}</optgroup></select></div>
    <div class="vs-b">${B.length ? `<div class="tblw"><table class="vs-tab"><thead><tr><th>Firma</th><th>An · Anrede</th><th>Stand · darunter Telefonnotizen</th><th></th></tr></thead><tbody>${B.map(zeile).join('')}</tbody></table></div>` : '<div class="card empty"><p class="hint">Noch keine Bieter:innen – oben suchen und anhaken (gern mehrere; passendes Gewerk steht oben). Gibt es die Firma noch nicht: Namen eintippen und „＋ … als neue Firma anlegen“. Wer ein Angebot abgegeben hat, steht hier von selbst.</p></div>'}</div>
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
/* Bieter:in, die es noch nicht gibt: im Feld eintippen → „＋ … als neue Firma anlegen“ → dieselbe Kontaktmaske wie überall → steht in der Liste */
document.addEventListener('bp-neu', async (e) => {
  if (!e.target.matches || !e.target.matches('[data-vsdazu]') || !L) return;
  try {
    const k = await BPHead.kontaktMaske({ name: e.detail.text, trade: L.gewerk || '' }); if (!k) return;
    KONT = null; await vsSetzen({ bieter: { [k.id]: { weg: false } } }, `${k.name} hinzugefügt`);
  } catch (er) { toast(er.message, true); }
});
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
  if (!e.target.closest('button,input,select,a,label,textarea,.bp-auswahl') && VS.fuer !== +cid) {   // Zeile anklicken: rechts die Mail an diese Firma
    VS.fuer = +cid; document.querySelectorAll('#vsSeite tr.vs-akt').forEach((x) => x.classList.remove('vs-akt')); document.querySelectorAll(`#vsSeite tr[data-vscid="${cid}"]`).forEach((x) => x.classList.add('vs-akt'));
    seiteFuellen('vs', 'mail'); seiteFuellen('vs', 'bieter'); return; }
  const st = e.target.closest('[data-vsrueck]'); if (st) { const v = st.dataset.vsrueck; if (v === (b.rueck || '')) return;
    if ((v === 'abgegeben' || v === 'absage') && b.todo_id) vsTodo(b, '');   // kein Anruf mehr nötig
    return vsSetzen({ bieter: { [cid]: { rueck: v } } }, `${b.name}: ${VS_RUECK[v]}`); }
  const ab = e.target.closest('[data-vsangerufen]'); if (ab) { const i = rz.querySelector('[data-vsanruf]'); return vsAnruf(b, (i && i.value.trim()) || 'angerufen'); }
  const aw = e.target.closest('[data-vsaweg]'); if (aw) { const alt = JSON.parse(JSON.stringify(b.anrufe || [])); return vsSetzen({ bieter: { [cid]: { anruf_weg: +aw.dataset.vsaweg } } }, `${b.name}: Notiz gelöscht`); }
});
/* Rechts (seite.js, abdockbar): Mail · Anhang · Bieter:in (Mock „Versand-Mail“, GO 14.11.2026).
   Mail: Art (Versand, Erinnerung, Nachversand), Empfänger:innen mit Haken „alle“ (vorgewählt nach Rückmeldung), Vorschau je Firma
   (Platzhalter gefüllt, wie sie hinausgeht), Anhänge mit Versanddatum, Betreff und Text bearbeiten – für dieses LV oder nur für eine Firma.
   „Senden“ (hier unten oder oben in der Befehlsleiste) schickt genau diese Mails nach einer kurzen Rückfrage – je Firma eine eigene. */
const VS_ART = { versand: 'Versand', erinnerung: 'Erinnerung', nachversand: 'Nachversand' };
const VS_RT = { angebot: 'Angebot da', abgegeben: 'abgegeben', zusage: 'will abgeben', absage: 'gibt nicht ab', '': 'keine Rückmeldung' };
const vsArt = () => VS.art || (VS.D && VS.D.bieter.some((b) => b.email && !b.versendet && b.rueck !== 'absage') ? 'versand' : 'nachversand');
const vsAnStd = (b, art) => !!b.email && (art === 'versand' ? !b.versendet && b.rueck !== 'absage' : art === 'erinnerung' ? !!b.versendet && (!b.rueck || b.rueck === 'zusage') : !!b.versendet && b.rueck !== 'absage' && b.rueck !== 'angebot');
function vsWahl(art) {   // gewählte Empfänger:innen je Art – vorgewählt nach Stand und Rückmeldung, danach einzeln zu- und abwählbar
  VS.wahl = VS.wahl || {};
  if (!VS.wahl[art]) VS.wahl[art] = new Set(VS.D.bieter.filter((b) => vsAnStd(b, art)).map((b) => b.contact_id));
  return VS.wahl[art];
}
function vsText(art, b) {   // Betreff und Text: eigener der Firma → eigener des LV → Standard (Vorlage)
  const D = VS.D, eig = b && b.texte && b.texte[art];
  if (eig) return { ...eig, eigen: 'firma' };
  if (D.texte && D.texte[art]) return { ...D.texte[art], eigen: 'lv' };
  const t = (D.standard || {})[art] || D.vorlage;
  return { betreff: t.betreff, text: art === 'versand' && D.ohne_x83 ? t.text.replace(' und als GAEB-Datei (X83)', '') : t.text, eigen: '' };
}
function vsAnhaenge(art) {
  const D = VS.D; if (art === 'erinnerung') return [];
  return [{ k: 'lv', ic: '📄', name: D.namen.pdf, gr: '', v: D.lv_verschickt, gd: D.lv_geaendert, pdf: true },
    ...(D.ohne_x83 ? [] : [{ k: 'x83', ic: '📦', name: D.namen.x83, gr: '', v: D.lv_verschickt, gd: D.lv_geaendert }]),
    ...(D.unterlagen || []).map((x) => ({ k: 'p:' + x.pfad, ic: x.quelle === 'plan' ? '📐' : '📄', name: x.name, gr: vsMb(x.groesse), v: x.verschickt, pdf: /\.pdf$/i.test(x.pfad) })),
    ...VS.rechner.map((x, i) => ({ k: 'r:' + i, ic: '🖥', name: x.name, gr: vsMb(x.groesse), pdf: /pdf/.test(x.mime) }))];
}
const vsFuer = () => { const B = VS.D.bieter, w = vsWahl(vsArt()); return B.find((b) => b.contact_id === VS.fuer) || B.find((b) => w.has(b.contact_id)) || B.find((b) => b.email) || B[0] || null; };

function vsRechts() {
  const sp = document.querySelector('#view .vs-sp'); if (!sp || !VS.D) return;
  seite(sp, 'vs', [{ id: 'mail', titel: 'Mail', mount: vsMailMount }, { id: 'anh', titel: 'Anhang ansehen', mount: vsAnhMount }, { id: 'bieter', titel: 'Bieter:in', mount: vsBieterMount }],
    { start: 'mail', w: 0.55, minL: 420, min: 380, wechsel: () => uLeisteNeu() });
}
function vsMailMount(el) {
  const D = VS.D; if (!D) return;
  const art = vsArt(), w = vsWahl(art), B = D.bieter, b = vsFuer(), T = vsText(art, b), A = vsAnhaenge(art), mit = B.filter((x) => x.email);
  const alle = mit.length && mit.every((x) => w.has(x.contact_id)), n = mit.filter((x) => w.has(x.contact_id)).length;
  el.innerHTML = `<div class="sr-pad vs-mail">
    <div class="seg sm" role="group" aria-label="Welche Mail">${Object.entries(VS_ART).map(([k, t]) => `<button type="button" data-vsart="${k}" class="${k === art ? 'on' : ''}">${t}</button>`).join('')}</div>
    <h5 class="vs-mh5">Empfänger:innen <small>vorgewählt nach Rückmeldung</small></h5>
    <label class="vs-ck vs-alle"><input type="checkbox" data-vsalle${alle ? ' checked' : ''}${mit.length ? '' : ' disabled'}> <b>alle</b> <small>${n} von ${mit.length}</small></label>
    <div class="vs-emp">${B.map((x) => `<label class="vs-ck${x.email ? '' : ' aus'}"><input type="checkbox" data-vswahl="${x.contact_id}"${w.has(x.contact_id) ? ' checked' : ''}${x.email ? '' : ' disabled'}>
      <span>${esc(x.name)}<small>${x.email ? esc(VS_RT[x.rueck || ''] || '') + (x.versendet ? ' · angeschrieben ' + esc(x.versendet.slice(0, 6)) : '') : 'keine E-Mail-Adresse'}</small></span></label>`).join('')}</div>
    <div class="vs-mk"><span>Vorschau für</span><select data-vsfuer data-bp-auswahl aria-label="Vorschau für">${B.map((x) => `<option value="${x.contact_id}"${b && x.contact_id === b.contact_id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <button type="button" class="btn sm${VS.edit ? ' pri' : ''}" data-vsedit>${VS.edit ? '✓ Fertig' : '✎ Text bearbeiten'}</button></div>
    <div class="vs-mbox">
      <div class="vs-mz"><span>An</span><b>${esc(b && b.email ? b.email : '–')}</b></div>
      <div class="vs-mz"><span>Betreff</span>${VS.edit ? `<input data-vsbetreff value="${esc(T.betreff)}" aria-label="Betreff">` : '<b id="vsBetreff">…</b>'}</div>
      <div class="vs-mz"><span>Kopie</span><label class="vs-ck"><input type="checkbox" data-vskopie${VS.kopie ? ' checked' : ''}> an mich</label></div>
      ${A.length ? `<div class="vs-anh">${A.map((x) => `<button type="button" class="vs-ac" data-vsanh="${esc(x.k)}" title="Anhang ansehen">${x.ic} ${esc(x.name.length > 34 ? x.name.slice(0, 32) + '…' : x.name)}${x.gr ? ` <small>${x.gr}</small>` : ''}${art === 'nachversand' ? (x.gd ? ' <i class="gd">geändert</i>' : !x.v ? ' <i class="neu">neu</i>' : '') : ''}</button>`).join('')}</div>` : '<p class="hint" style="margin:.3rem 0">Erinnerung ohne Anhänge – das LV haben die Firmen schon.</p>'}
      ${VS.edit ? `<textarea data-vstext rows="14" aria-label="Text">${esc(T.text)}</textarea>
        <div class="vs-me"><label class="vs-ck"><input type="checkbox" data-vseigen${T.eigen === 'firma' ? ' checked' : ''}${b ? '' : ' disabled'}> nur für ${esc(b ? b.name : 'diese Firma')}</label>
          <button type="button" class="btn sm" data-vsvorlage title="Eigenen Text verwerfen – wieder der Text der Vorlage"${T.eigen ? '' : ' disabled'}>↺ Vorlage</button></div>
        <p class="hint">Platzhalter füllt die Plattform je Firma: {anrede}, {firma}, {lv}, {projekt}, {bauvorhaben}, {abgabe}, {rueckmeldung}, {signatur}. Änderungen gelten für dieses LV${T.eigen === 'firma' ? ' – hier nur für diese Firma' : ''}. Vorlage des Büros: Kommunikation → Vorlagen.</p>`
        : `<iframe class="vs-mf" sandbox="allow-same-origin" title="Mail-Vorschau" id="vsMf"></iframe>${T.eigen ? `<p class="hint">${T.eigen === 'firma' ? 'Eigener Text nur für diese Firma.' : 'Eigener Text für dieses LV.'}</p>` : ''}`}
    </div>
    ${D.abgabe ? '' : '<p class="hint vs-warn">Noch kein Abgabetermin – links eintragen, sonst fällt die Zeile in der Mail weg.</p>'}
    <button type="button" class="btn pri vs-go" data-vsgo${n ? '' : ' disabled'}>✉ ${n} ${VS_ART[art]}-Mail${n === 1 ? '' : 's'} senden</button></div>`;
  if (!VS.edit && b) vsVorschau(el, art, b);
}
async function vsVorschau(el, art, b) {
  const T = vsText(art, b), tok = (VS.vtok = (VS.vtok || 0) + 1);
  let r; try { r = await api(`api/lv/${L.id}/versand/vorschau`, 'POST', { art, contact_id: b.contact_id, betreff: T.betreff, text: T.text }); } catch (e) { r = { betreff: '', html: `<p>${esc(e.message)}</p>` }; }
  if (tok !== VS.vtok) return;
  const bt = el.querySelector('#vsBetreff'), f = el.querySelector('#vsMf'); if (bt) bt.textContent = r.betreff;
  if (f) { f.onload = () => { try { f.style.height = Math.min(900, f.contentDocument.documentElement.scrollHeight + 8) + 'px'; } catch { /* egal */ } };
    f.srcdoc = `<!doctype html><meta charset="utf-8"><style>body{font:14px/1.5 system-ui,sans-serif;margin:.6rem;color:#222;background:#fff}</style>${r.html || esc(r.text || '').replace(/\n/g, '<br>')}`; }
}
function vsAnhMount(el) {
  const A = vsAnhaenge(vsArt() === 'erinnerung' ? 'versand' : vsArt()); if (!A.length) { el.innerHTML = '<p class="hint sr-pad">Keine Anhänge.</p>'; return; }
  const x = A.find((y) => y.k === VS.anh) || A[0]; VS.anh = x.k;
  el.innerHTML = `<div class="vs-ansicht"><div class="am-pk">${A.map((y) => `<button type="button" class="btn sm${y.k === x.k ? ' pri' : ''}" data-vsanh="${esc(y.k)}" title="${esc(y.name)}">${y.ic} ${esc(y.name.length > 26 ? y.name.slice(0, 24) + '…' : y.name)}</button>`).join('')}</div><div class="vs-av"></div></div>`;
  const v = el.querySelector('.vs-av'), url = x.k === 'lv' ? `api/lv/${L.id}/versand/ansehen?was=lv` : x.k === 'x83' ? `api/lv/${L.id}/versand/ansehen?was=x83`
    : x.k.startsWith('p:') ? `api/lv/${L.id}/versand/ansehen?pfad=${encodeURIComponent(x.k.slice(2))}` : '';
  if (x.k.startsWith('r:')) {   // vom Rechner: nur im Browser
    const f = VS.rechner[+x.k.slice(2)];
    if (f && x.pdf) { const u = URL.createObjectURL(new Blob([Uint8Array.from(atob(f.daten), (c) => c.charCodeAt(0))], { type: 'application/pdf' })); BPHead.pdfIn(v, u).finally(() => URL.revokeObjectURL(u)); }
    else v.innerHTML = `<p class="hint">Keine Vorschau für „${esc(x.name)}“ – geht so mit.</p>`;
    return;
  }
  if (x.k === 'x83') { v.innerHTML = '<p class="hint">Lade …</p>'; fetch(url, { credentials: 'same-origin' }).then((r) => r.text()).then((t) => { v.innerHTML = `<pre class="vs-x83">${esc(t.slice(0, 200000))}</pre>`; }).catch((e) => { v.innerHTML = `<p class="hint">${esc(e.message)}</p>`; }); return; }
  if (x.pdf) BPHead.pdfIn(v, url).catch((e) => { v.innerHTML = `<p class="hint">${esc(e.message)}</p>`; });
  else v.innerHTML = `<p class="hint">Keine Vorschau für „${esc(x.name)}“ – geht so mit.</p>`;
}
function vsBieterMount(el) {
  const b = VS.D && vsFuer(); if (!b) { el.innerHTML = '<p class="hint sr-pad">Noch keine Bieter:innen.</p>'; return; }
  const A = b.anrufe || [];
  el.innerHTML = `<div class="sr-pad vs-bk"><h4><button type="button" class="vs-n" data-vsk2="${b.contact_id}" title="Adresse bearbeiten">${esc(b.name)}</button></h4>
    <dl><dt>An</dt><dd>${esc(b.email || 'keine E-Mail-Adresse')}</dd><dt>Anrede</dt><dd>${esc(b.anrede)}</dd>${b.telefon ? `<dt>Telefon</dt><dd><a href="tel:${esc(b.telefon.replace(/[^\d+]/g, ''))}">${esc(b.telefon)}</a></dd>` : ''}
    <dt>Stand</dt><dd>${esc(VS_RT[b.rueck || ''])}${b.bis ? ' · bis ' + esc(vsDe(b.bis)) : ''}${b.grund ? ' · ' + esc(b.grund) : ''}</dd><dt>Angeschrieben</dt><dd>${esc(b.versendet || 'noch nicht')}</dd></dl>
    ${A.length ? `<h5 class="vs-mh5">Telefonnotizen</h5>${A.map((x) => `<div class="vs-a"><i>☎</i><span class="d">${esc(vsZeit(x.t))}</span><span>${esc(x.text)}</span></div>`).join('')}` : ''}
    <p class="hint">Stand, Anrede und Notizen links in der Liste ändern; der Name öffnet die Adresse.</p></div>`;
}
async function vsTexteSpeichern(art, betreff, text, nurFirma, b) {   // gemerkt je LV bzw. je Firma (ohne Rückgängig-Schritt je Taste)
  const t = { [art]: betreff == null ? null : { betreff, text } };
  try { VS.D = await api(`api/lv/${L.id}/versand`, 'PUT', nurFirma && b ? { bieter: { [b.contact_id]: { texte: t } } } : { texte: t }); }
  catch (e) { toast(e.message, true); }
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !L || !VS.D) return;
  const ar = e.target.closest('[data-vsart]'); if (ar) { VS.art = ar.dataset.vsart; seiteFuellen('vs', 'mail'); return; }
  const an = e.target.closest('[data-vsanh]'); if (an) { VS.anh = an.dataset.vsanh; seiteReiter('vs', 'anh'); seiteFuellen('vs', 'anh'); return; }
  const ed = e.target.closest('[data-vsedit]'); if (ed) { VS.edit = !VS.edit; seiteFuellen('vs', 'mail'); return; }
  const vl = e.target.closest('[data-vsvorlage]'); if (vl) { const art = vsArt(), b = vsFuer(), T = vsText(art, b);
    await vsTexteSpeichern(art, null, null, T.eigen === 'firma', b); rueckgaengig('Wieder der Text der Vorlage', async () => { await vsTexteSpeichern(art, T.betreff, T.text, T.eigen === 'firma', b); seiteFuellen('vs', 'mail'); }); seiteFuellen('vs', 'mail'); return; }
  const k2 = e.target.closest('[data-vsk2]'); if (k2 && BPHead.kontaktMaske) { if (await BPHead.kontaktMaske({ id: +k2.dataset.vsk2 })) { KONT = null; vsSeiteLaden(true); } return; }
  if (e.target.closest('[data-vsgo]')) vsSenden(vsArt());
});
document.addEventListener('change', async (e) => {
  const t = e.target; if (!t.closest || !t.closest('.vs-mail') || !VS.D) return;
  const art = vsArt(), w = vsWahl(art);
  if (t.matches('[data-vsalle]')) { VS.D.bieter.filter((b) => b.email).forEach((b) => (t.checked ? w.add(b.contact_id) : w.delete(b.contact_id))); seiteFuellen('vs', 'mail'); return; }
  if (t.matches('[data-vswahl]')) { const c = +t.dataset.vswahl; if (t.checked) { w.add(c); VS.fuer = c; } else w.delete(c); seiteFuellen('vs', 'mail'); return; }
  if (t.matches('[data-vsfuer]')) { VS.fuer = +t.value; seiteFuellen('vs', 'mail'); seiteFuellen('vs', 'bieter'); const el = document.getElementById('vsSeite'); if (el) el.innerHTML = vsHtml(); return; }
  if (t.matches('[data-vskopie]')) { VS.kopie = t.checked; return; }
  if (t.matches('[data-vseigen]')) {   // eigener Text nur für diese Firma – oder wieder der gemeinsame
    const b = vsFuer(), box = t.closest('.vs-mail'), be = box.querySelector('[data-vsbetreff]').value, tx = box.querySelector('[data-vstext]').value;
    if (t.checked) await vsTexteSpeichern(art, be, tx, true, b); else await vsTexteSpeichern(art, null, null, true, b);
    seiteFuellen('vs', 'mail');
  }
});
document.addEventListener('input', (e) => {   // Betreff und Text: kurz nach dem Tippen gemerkt
  const t = e.target; if (!t.matches || !t.matches('.vs-mail [data-vstext], .vs-mail [data-vsbetreff]') || !VS.D) return;
  clearTimeout(VS.tT); const box = t.closest('.vs-mail'), art = vsArt(), b = vsFuer(), nur = !!box.querySelector('[data-vseigen]:checked');
  VS.tT = setTimeout(() => vsTexteSpeichern(art, box.querySelector('[data-vsbetreff]').value, box.querySelector('[data-vstext]').value, nur, b), 600);
});

/* Senden: genau die Mails rechts – nach einer kurzen Rückfrage. Oben in der Befehlsleiste: erst die Mail rechts zeigen. */
async function vsSenden(art) {
  const D = VS.D; if (!D) return;
  if (art !== vsArt() || !seiteOffen()) { VS.art = art; seiteReiter('vs', 'mail'); seiteFuellen('vs', 'mail'); toast('Rechts steht die Mail – prüfen, dann unten „Senden“.'); return; }
  clearTimeout(VS.tT);
  const w = vsWahl(art), an = D.bieter.filter((b) => b.email && w.has(b.contact_id)), mitAnh = art !== 'erinnerung', R = VS.rechner;
  if (!an.length) { toast('Keine Empfänger:in gewählt.', true); return; }
  if (!(await bpFrage(`${an.length} ${VS_ART[art]}-Mail${an.length === 1 ? '' : 's'} senden?\n${an.map((b) => b.name).join(', ')}${D.abgabe ? '' : '\nNoch kein Abgabetermin – die Zeile fällt in der Mail weg.'}`))) return;
  const T = vsText(art, null);
  try {
    const r = await api(`api/lv/${L.id}/versand/senden`, 'POST', { art, an: an.map((b) => ({ contact_id: b.contact_id, email: b.email, name: b.name, anrede: b.anrede })),
      betreff: T.betreff, text: T.text, kopie: !!VS.kopie, pdf: mitAnh, x83: mitAnh && !D.ohne_x83, unterlagen: mitAnh, anhaenge: mitAnh ? R.map((x) => ({ name: x.name, mime: x.mime, daten: x.daten })) : [] });
    VS.D = r; VS.wahl = {}; if (mitAnh && r.ergebnis.some((x) => x.ok)) VS.rechner = [];   // vom Rechner: jetzt im Versand-Ordner
    const fe = r.ergebnis.filter((x) => !x.ok);
    toast(`${r.ergebnis.length - fe.length} Mail${r.ergebnis.length - fe.length === 1 ? '' : 's'} gesendet${fe.length ? ` – ${fe.length} Fehler: ${fe.map((x) => x.name + ' (' + x.fehler + ')').join(', ')}` : ''}${r.ablage.length ? ` · im Projektordner: „${r.ordner}“` : r.ablage_fehler ? ' · ' + r.ablage_fehler : ''}.`, !!fe.length);
    if (typeof refreshList === 'function') refreshList();
    vsNeu();
  } catch (er) { toast(er.message, true); }
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
