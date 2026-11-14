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
    /* kompakt (besprochen am 14.11.2026): eine Zeile je Firma – Klick klappt darunter die Details auf (An, Anrede, Stand, Telefonnotizen) */
    const v = b.verlauf || {}, letzt = [...(v.nachgefragt || [])].pop(), zul = letzt ? `${letzt.weg === 'tel' ? '☎' : '✉'} ${vsTag(letzt.t).slice(0, 6)}` : b.versendet ? `✉ ${esc(b.versendet.slice(0, 6))}` : '–';
    const cls = ang || st === 'abgegeben' ? 'ok' : st === 'absage' ? 'no' : st === 'zusage' ? 'z' : 'o', auf = VS.auf === b.contact_id;
    return `<tr data-vscid="${b.contact_id}" class="vs-kz${faellig ? ' vs-faellig' : ''}${VS.fuer === b.contact_id ? ' vs-akt' : ''}${auf ? ' auf' : ''}">
      <td class="vs-fi"><span class="vs-car">${auf ? '▾' : '▸'}</span><b>${esc(b.name)}</b>${b.trade ? ` <small>${esc(b.trade)}</small>` : ''}</td>
      <td class="vs-an1">${b.email ? esc(b.email) : '<span class="vs-rot">keine E-Mail</span>'}</td>
      <td class="vs-st1"><button type="button" class="vs-ch ${cls}" data-vsstw${ang ? ' disabled title="Angebot eingetragen – unter Angebote &amp; Preisspiegel"' : ''}>${ang ? 'Angebot ✓' : esc(VS_RUECK[st] || 'offen') + ' ▾'}</button>${st === 'zusage' && b.bis ? ` <small>bis ${esc(vsDe(b.bis).slice(0, 6))}</small>` : frist ? ' <small class="vs-rot">Frist um</small>' : ''}</td>
      <td class="vs-zl">${zul}</td>
      <td class="vs-mh"><button type="button" class="ib" data-vsmehr title="Mehr" aria-label="Mehr">⋯</button></td></tr>
      ${auf ? `<tr data-vscid="${b.contact_id}" class="vs-det"><td colspan="5"><div class="vs-dg">
        <div class="vs-an"><select data-vsf="email" data-bp-auswahl aria-label="An">${b.adressen.length ? (b.adressen.length > 1 && !b.email ? '<option value="">– bitte wählen –</option>' : '') + b.adressen.map((a) => `<option value="${esc(a.email)}"${a.email === b.email ? ' selected' : ''}>${esc([a.name, a.funktion].filter(Boolean).join(' · ') || 'Firma')} – ${esc(a.email)}</option>`).join('') : '<option value="">keine E-Mail in den Adressen</option>'}</select>
        <input data-vsf="anrede" value="${esc(b.anrede)}" aria-label="Anrede" title="Anrede – aus dem Namen der Ansprechperson, hier für diese Firma änderbar"><small>${b.versendet ? `versendet ${esc(b.versendet)}` : 'noch nicht versendet'}</small></div>
        <div class="vs-sta"><span class="seg sm" role="group" aria-label="Stand">${Object.entries(VS_RUECK).map(([k, t]) => `<button type="button" data-vsrueck="${k}" class="${(ang ? 'abgegeben' : st) === k ? 'on ' + (VS_ST[k] || '') : ''}"${ang ? ' disabled' : ''}>${t}</button>`).join('')}</span>
        ${ang ? '<small>Angebot eingetragen – unter Angebote &amp; Preisspiegel</small>' : st === 'zusage' ? `<label class="vs-kl">Abgabe zugesagt bis<input type="date" data-vsf="bis" value="${esc(b.bis)}"${D.abgabe ? ` max="${esc(D.abgabe.slice(0, 10))}"` : ''}></label>` : st === 'absage' ? `<input class="vs-kl" data-vsf="grund" value="${esc(b.grund)}" placeholder="Grund (z. B. keine Kapazität)">` : frist ? `<small class="vs-rot">noch keine Rückmeldung · Frist ${esc(vsDe(D.rueckmeldung))}</small>` : ''}</div>
        <div class="vs-nf">${A.map((x, i) => `<div class="vs-a"><i>${i + 1}</i><span class="d">${esc(vsZeit(x.t))}</span><span>${esc(x.text)}${x.wer ? ` <small>· ${esc(x.wer)}</small>` : ''}</span><button type="button" class="ib" data-vsaweg="${i}" aria-label="Notiz löschen">✕</button></div>`).join('')}
        ${b.naechst && (st === '' || st === 'zusage') ? `<div class="vs-a nx"><i>↻</i><span class="d">${esc(vsDe(b.naechst))}</span><span>wieder anrufen</span></div>` : ''}
        ${ang || st === 'abgegeben' || st === 'absage' ? '' : A.length >= 10 ? '<small>10 von 10 Notizen</small>' : `<div class="vs-ae"><input data-vsanruf placeholder="Telefonnotiz … (Enter)" aria-label="Telefonnotiz"><label class="vs-kl" title="nächster Anruf – legt ein To-do an">↻<input type="date" data-vsnaechst value="${esc(b.naechst)}" aria-label="nächster Anruf"></label><button type="button" class="btn sm" data-vsangerufen title="Notiz „angerufen“ mit jetzt anlegen">📞 angerufen</button></div>${A.length ? `<small>${A.length} von 10 Notizen</small>` : ''}`}</div></div></td></tr>` : ''}`; };
  const art = { versand: 'Versand', erinnerung: 'Erinnerung', nachversand: 'Nachversand' };
  return `<div class="vs-t"><label>Abgabe der Angebote<input type="datetime-local" data-vst="abgabe" value="${esc(D.abgabe)}"${D.rueckmeldung ? ` min="${esc(D.rueckmeldung.slice(0, 10))}T00:00"` : ''}></label><label>Rückmeldung bis<input type="date" data-vst="rueckmeldung" value="${esc(D.rueckmeldung)}"${D.abgabe ? ` max="${esc(D.abgabe.slice(0, 10))}"` : ''} title="Bis wann die Firma zu- oder absagt – spätestens am Tag der Abgabe"></label>
    <div class="vs-z"><span>angeschrieben <b>${B.filter((b) => b.versendet).length}</b> von ${B.length}</span><span>abgegeben <b class="ok">${n('angebot') + n('abgegeben')}</b></span><span>wollen abgeben <b class="wo">${n('zusage')}</b></span><span>geben nicht ab <b class="no">${n('absage')}</b></span><span>offen <b>${n('')}</b></span></div></div>
    ${vsUnterlagenHtml()}
    <h4 class="vs-h">Bieter:innen</h4>
    <div class="bar" style="margin:.2rem 0 .6rem"><select data-vsdazu multiple data-bp-auswahl data-neu="Firma" data-ph="＋ Bieter:innen suchen oder eintippen – mehrere anhaken …" aria-label="Bieter:innen hinzufügen">${D.vorschlaege.length ? `<optgroup label="Gewerk passt">${D.vorschlaege.map((k) => `<option value="${k.contact_id}">${esc(k.name)}${k.city ? ' · ' + esc(k.city) : ''}</option>`).join('')}</optgroup>` : ''}<optgroup label="Alle Firmen">${(KONT || []).filter((k) => !B.some((b) => b.contact_id === k.id) && !D.vorschlaege.some((v) => v.contact_id === k.id)).slice(0, 400).map((k) => `<option value="${k.id}">${esc(k.name)}${k.trade ? ' · ' + esc(k.trade) : ''}</option>`).join('')}</optgroup></select></div>
    <div class="vs-b">${B.length ? `<div class="tblw"><table class="vs-tab"><thead><tr><th>Firma</th><th class="vs-an1">An</th><th>Stand</th><th>zuletzt</th><th></th></tr></thead><tbody>${B.map(zeile).join('')}</tbody></table></div>` : '<div class="card empty"><p class="hint">Noch keine Bieter:innen – oben suchen und anhaken (gern mehrere; passendes Gewerk steht oben). Gibt es die Firma noch nicht: Namen eintippen und „＋ … als neue Firma anlegen“. Wer ein Angebot abgegeben hat, steht hier von selbst.</p></div>'}</div>
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
  if (rz.classList.contains('vs-kz') && !e.target.closest('button,input,select,a,label,textarea,.bp-auswahl')) {   // Zeile: Details auf/zu, rechts die Mail an diese Firma
    VS.fuer = +cid; VS.auf = VS.auf === +cid ? null : +cid; vsNeu(); return; }
  const sw = e.target.closest('[data-vsstw]');
  if (sw) { pickMenu(sw, { items: Object.entries(VS_RUECK).map(([k, t]) => ({ value: k, title: t, on: k === (b.rueck || '') })), onPick: (v) => {
    if (v === (b.rueck || '')) return; if ((v === 'abgegeben' || v === 'absage') && b.todo_id) vsTodo(b, '');
    if (v === 'zusage' || v === 'absage') VS.auf = b.contact_id;   // Zusage bis / Grund gleich darunter eintragen
    vsSetzen({ bieter: { [cid]: { rueck: v } } }, `${b.name}: ${VS_RUECK[v]}`); } }); return; }
  const mh = e.target.closest('[data-vsmehr]');
  if (mh) { pickMenu(mh, { items: [{ value: 'adr', title: 'Adresse öffnen' }, { value: 'weg', title: 'Nicht mehr anfragen' }], onPick: async (v) => {
    if (v === 'weg') return vsSetzen({ bieter: { [cid]: { weg: true } } }, `${b.name} nicht mehr anfragen`);
    if (await BPHead.kontaktMaske({ id: +cid })) { KONT = null; vsSeiteLaden(true); } } }); return; }
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

function vsRechts() {   // rechts: Anhänge ansehen und die Bieter:innen – geschrieben und gesendet wird im gemeinsamen Versand-Dialog (vsSenden → BPHead.versand)
  const sp = document.querySelector('#view .vs-sp'); if (!sp || !VS.D) return;
  seite(sp, 'vs', [{ id: 'bieter', titel: 'Bieter:innen', mount: vsBieterMount }, { id: 'anh', titel: 'Anhang ansehen', mount: vsAnhMount }],
    { start: 'bieter', w: 0.55, minL: 420, min: 380, wechsel: () => uLeisteNeu() });
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
/* Reiter „Bieter:innen“ (besprochen am 14.11.2026): oben der Verlauf aller Firmen – angeschrieben · nachgesandt · nachgefragt (mehrmals, mit Notiz) ·
   Zusage bis · abgesagt (= „gibt nicht ab“) · Angebot; Spalten sortier- und wählbar, Filter, Drucken (liegt dann auch im LV-Ordner unter „Bieterliste“).
   Darunter für die gewählte Firma nur der Status. */
const VS_SP = [['firma', 'Firma'], ['kontakt', 'E-Mail / Telefon'], ['angeschrieben', 'Angeschrieben'], ['nachgesandt', 'Nachgesandt'], ['nachgefragt', 'Nachgefragt · Notiz'],
  ['zusage_bis', 'Zusage bis'], ['abgesagt', 'Abgesagt · Grund'], ['angebot', 'Stand']];
const vsSpAn = () => { if (!VS.sp) { let v = null; try { v = JSON.parse(localStorage.getItem('ava.vsliste.sp') || 'null'); } catch { /* egal */ } VS.sp = new Set(Array.isArray(v) ? v : VS_SP.map((x) => x[0]).filter((k) => !['kontakt', 'zusage_bis', 'abgesagt'].includes(k))); }   /* Vorgabe: was in den schmalen Bereich passt */ return VS.sp; };
const vsTag = (t) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t || ''); return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : (t || ''); };
const vsGruppe = (b) => (b.rueck === 'angebot' || b.rueck === 'abgegeben' ? 'angebot' : b.rueck === 'absage' ? 'abgesagt' : 'offen');
function vsSortWert(b, k) {
  const v = b.verlauf || {};
  return k === 'firma' ? b.name.toLowerCase() : k === 'kontakt' ? (b.email || '') : k === 'nachgesandt' ? (v.nachgesandt || []).slice(-1)[0] || ''
    : k === 'nachgefragt' ? ((v.nachgefragt || []).slice(-1)[0] || {}).t || '' : v[k] || '';
}
function vsListe() {
  const S = VS.lsort || { k: 'firma', ab: false }, F = VS.lfilter || 'alle';
  const B = VS.D.bieter.filter((b) => F === 'alle' || vsGruppe(b) === F);
  return B.sort((a, b) => { const x = vsSortWert(a, S.k), y = vsSortWert(b, S.k); const r = x === y ? 0 : !x ? 1 : !y ? -1 : x < y ? -1 : 1; return S.ab ? -r : r; });
}
function vsZelle(b, k) {
  const v = b.verlauf || {};
  if (k === 'firma') return `<b>${esc(b.name)}</b>${b.trade ? `<small>${esc(b.trade)}</small>` : ''}`;
  if (k === 'kontakt') return [b.email, b.telefon].filter(Boolean).map(esc).join('<br>') || '<span class="mute">–</span>';
  if (k === 'nachgesandt') return (v.nachgesandt || []).map(vsTag).join('<br>') || '–';
  if (k === 'nachgefragt') return (v.nachgefragt || []).map((n) => `<div class="vs-nfv">${vsTag(n.t)} ${n.weg === 'tel' ? '☎' : '✉'} <span>${esc(n.text)}</span></div>`).join('') || '–';
  if (k === 'abgesagt') return v.abgesagt || v.grund ? `${esc(vsTag(v.abgesagt))}${v.grund ? `<small>${esc(v.grund)}</small>` : ''}` : '–';
  if (k === 'angebot') return v.angebot ? `<span class="vs-ch ok">Angebot ${v.angebot === 'ja' ? '' : esc(vsTag(v.angebot))}</span>` : b.rueck === 'absage' ? `<span class="vs-ch no">abgesagt ${esc(vsTag(v.abgesagt))}</span>${v.grund ? `<small>${esc(v.grund)}</small>` : ''}`
    : b.rueck === 'zusage' ? `<span class="vs-ch z">will abgeben</span>${v.zusage_bis ? `<small>bis ${esc(vsTag(v.zusage_bis))}</small>` : ''}` : '<span class="vs-ch o">offen</span>';
  return esc(vsTag(v[k])) || '–';
}
function vsBieterMount(el) {
  if (!VS.D || !VS.D.bieter.length) { el.innerHTML = '<p class="hint sr-pad">Noch keine Bieter:innen.</p>'; return; }
  const SP = VS_SP.filter(([k]) => vsSpAn().has(k)), S = VS.lsort || { k: 'firma', ab: false }, F = VS.lfilter || 'alle', B = VS.D.bieter;
  const n = (g) => B.filter((b) => g === 'alle' || vsGruppe(b) === g).length, b = vsFuer();
  el.innerHTML = `<div class="sr-pad vs-vl">
    <div class="vs-vb">${[['alle', 'alle'], ['offen', 'offen'], ['angebot', 'Angebot'], ['abgesagt', 'abgesagt']].map(([k, t]) => `<button type="button" class="vs-ch ${k === 'angebot' ? 'ok' : k === 'abgesagt' ? 'no' : k === 'offen' ? 'o' : ''}${F === k ? ' on' : ''}" data-vslf="${k}">${t} ${n(k)}</button>`).join('')}
      <span style="flex:1"></span><details class="vs-spw"><summary class="btn sm">▦ Spalten</summary><div>${VS_SP.map(([k, t]) => `<label class="vs-ck"><input type="checkbox" data-vssp="${k}"${vsSpAn().has(k) ? ' checked' : ''}${k === 'firma' ? ' disabled' : ''}> ${t}</label>`).join('')}</div></details>
      <button type="button" class="btn sm" data-vsdruck title="Als PDF – liegt dann auch im LV-Ordner unter „Bieterliste“">🖨 Drucken</button></div>
    <div class="tblw"><table class="vs-vt"><thead><tr>${SP.map(([k, t]) => `<th data-vsls="${k}" class="${S.k === k ? (S.ab ? 'ab' : 'auf') : ''}">${t}</th>`).join('')}</tr></thead>
      <tbody>${vsListe().map((x) => `<tr data-vslz="${x.contact_id}" class="${b && x.contact_id === b.contact_id ? 'vs-akt' : ''}">${SP.map(([k]) => `<td class="vs-v-${k}">${vsZelle(x, k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    ${b ? `<div class="vs-stk"><h5 class="vs-mh5">Status</h5><div class="vs-stz"><b><button type="button" class="vs-n" data-vsk2="${b.contact_id}" title="Adresse öffnen">${esc(b.name)}</button></b>
      <span class="vs-ch ${vsGruppe(b) === 'angebot' ? 'ok' : vsGruppe(b) === 'abgesagt' ? 'no' : b.rueck === 'zusage' ? 'z' : 'o'}">${esc(VS_RT[b.rueck || ''])}</span>${b.bis ? `<span>Zusage bis ${esc(vsDe(b.bis))}</span>` : ''}${b.grund ? `<span>${esc(b.grund)}</span>` : ''}</div></div>` : ''}</div>`;
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !VS.D || !L) return;
  const f = e.target.closest('[data-vslf]'); if (f) { VS.lfilter = f.dataset.vslf; seiteFuellen('vs', 'bieter'); return; }
  const h = e.target.closest('th[data-vsls]'); if (h) { const k = h.dataset.vsls, S = VS.lsort || { k: 'firma', ab: false }; VS.lsort = { k, ab: S.k === k ? !S.ab : false }; seiteFuellen('vs', 'bieter'); return; }
  const z = e.target.closest('tr[data-vslz]'); if (z && !e.target.closest('button,a')) { VS.fuer = +z.dataset.vslz; seiteFuellen('vs', 'bieter'); const m = document.getElementById('vsSeite'); if (m) m.innerHTML = vsHtml(); return; }
  if (e.target.closest('[data-vsdruck]')) {
    const warte = setTimeout(() => toast('Liste wird erstellt …'), 1500);
    try {
      const r = await fetch(`api/lv/${L.id}/versand/liste`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spalten: VS_SP.map((x) => x[0]).filter((k) => vsSpAn().has(k)), ids: vsListe().map((x) => x.contact_id) }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Fehler ' + r.status);
      const u = URL.createObjectURL(await r.blob()); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000);
      const a = decodeURIComponent(r.headers.get('X-Ablage') || ''); if (a) toast(a);
    } catch (er) { toast(er.message, true); } finally { clearTimeout(warte); }
  }
});
document.addEventListener('change', (e) => {
  const c = e.target.closest && e.target.closest('[data-vssp]'); if (!c) return;
  const S = vsSpAn(); if (c.checked) S.add(c.dataset.vssp); else S.delete(c.dataset.vssp);
  try { localStorage.setItem('ava.vsliste.sp', JSON.stringify([...S])); } catch { /* egal */ }
  seiteFuellen('vs', 'bieter'); const d = document.querySelector('.vs-spw'); if (d) d.open = true;
});
async function vsTexteSpeichern(art, betreff, text, nurFirma, b) {   // gemerkt je LV bzw. je Firma (ohne Rückgängig-Schritt je Taste)
  const t = { [art]: betreff == null ? null : { betreff, text } };
  try { VS.D = await api(`api/lv/${L.id}/versand`, 'PUT', nurFirma && b ? { bieter: { [b.contact_id]: { texte: t } } } : { texte: t }); }
  catch (e) { toast(e.message, true); }
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !L || !VS.D) return;
  const an = e.target.closest('[data-vsanh]'); if (an) { VS.anh = an.dataset.vsanh; seiteReiter('vs', 'anh'); seiteFuellen('vs', 'anh'); return; }
  const k2 = e.target.closest('[data-vsk2]'); if (k2 && BPHead.kontaktMaske) { if (await BPHead.kontaktMaske({ id: +k2.dataset.vsk2 })) { KONT = null; vsSeiteLaden(true); } return; }
});
/* Senden über den gemeinsamen Versand-Dialog (bp/versand.js): Was (LV, GAEB, Unterlagen der Seite) · An wen (Bieter:innen, vorgewählt nach Stand) ·
   Nachricht (Text dieses LV, je Firma mit persönlicher Anrede – „Vorschau für“) · Optionen. Gesendet wird je Firma eine eigene Mail. */
async function vsSenden(art) {
  const D = VS.D; if (!D) return;
  VS.art = art;
  const w = vsWahl(art), mitAnh = art !== 'erinnerung', R = VS.rechner, T = vsText(art, null), A = vsAnhaenge(art);
  const url = (x) => (x.k === 'lv' ? `api/lv/${L.id}/versand/ansehen?was=lv` : x.k.startsWith('p:') && x.pdf ? `api/lv/${L.id}/versand/ansehen?pfad=${encodeURIComponent(x.k.slice(2))}`
    : x.k.startsWith('r:') && x.pdf ? async () => new Blob([Uint8Array.from(atob(R[+x.k.slice(2)].daten), (c) => c.charCodeAt(0))], { type: 'application/pdf' }) : null);
  const std = (D.standard || {})[art] || D.vorlage;
  await BPHead.versand({
    titel: `${VS_ART[art]} an Bieter:innen – ${L.nr || ''} ${L.name || ''}`.trim(),
    was: A.map((x) => ({ icon: x.ic, name: x.name, sub: [x.gr, art === 'nachversand' ? (x.gd ? 'geändert' : !x.v ? 'neu' : '') : '', x.k === 'lv' ? 'LV ohne Preise – entsteht beim Senden' : x.k === 'x83' ? 'GAEB-Datei – entsteht beim Senden' : ''].filter(Boolean).join(' · '), pdf: url(x), ohneUnterschrift: true })),
    hinweis: `<p class="bpv-h">${mitAnh ? 'Unterlagen ändern: Dialog schließen – oben „Unterlagen“ oder im Kasten „Unterlagen für die Bieter:innen“.' : 'Erinnerung ohne Anhänge – das LV haben die Firmen schon.'}${D.abgabe ? '' : ' <b>Noch kein Abgabetermin</b> – die Zeile fällt in der Mail weg.'}</p>`,
    empfaenger: D.bieter.map((b) => ({ name: b.name, sub: b.email ? (VS_RT[b.rueck || ''] || '') + (b.versendet ? ' · angeschrieben ' + vsTag(b.versendet) : '') : 'keine E-Mail-Adresse', email: b.email || '', contact_id: b.contact_id, on: w.has(b.contact_id) })),
    zusatz: false, kopie: !!VS.kopie, betreff: T.betreff, text: T.text,
    textHilfe: 'Platzhalter füllt die Plattform je Firma: {anrede}, {firma}, {lv}, {projekt}, {bauvorhaben}, {abgabe}, {rueckmeldung}, {signatur}.',
    vorschau: async (x, V) => { const b = D.bieter.find((y) => y.contact_id === x.contact_id) || {}, eig = b.texte && b.texte[art];   // eigener Text dieser Firma geht vor
      const r = await api(`api/lv/${L.id}/versand/vorschau`, 'POST', { art, contact_id: x.contact_id, betreff: eig ? eig.betreff : V.betreff, text: eig ? eig.text : V.text });
      return { an: r.an || x.email, betreff: r.betreff, text: (eig ? '(eigener Text nur für diese Firma)\n\n' : '') + (r.text || '') }; },
    optionen: `<label><input type="checkbox" data-vsmerk checked> Text für dieses LV merken</label><button type="button" class="bpv-x" data-vsstd title="Betreff und Text wieder wie in der Vorlage des Büros (Kommunikation → Vorlagen)" style="font-size:.86rem;color:var(--y)">↺ Text der Vorlage</button>`,
    optionenBind: (box) => { box.querySelector('[data-vsstd]').addEventListener('click', () => { box.querySelector('[data-betreff]').value = std.betreff; box.querySelector('[data-text]').value = art === 'versand' && D.ohne_x83 ? std.text.replace(' und als GAEB-Datei (X83)', '') : std.text; }); },
    knopf: () => `${VS_ART[art]} senden`, fuss: (box) => { const n = box.querySelectorAll('[data-e]:checked').length; return `${n} Mail${n === 1 ? '' : 's'} – jede Firma bekommt ihre eigene, niemand sieht die anderen`; },
    senden: async (W, box) => {
      const an = W.an.map((x) => D.bieter.find((b) => b.contact_id === x.contact_id)).filter(Boolean);
      if (!an.length) throw new Error('Keine Empfänger:in gewählt.');
      VS.kopie = W.kopie; VS.wahl[art] = new Set(an.map((b) => b.contact_id));
      const geaendert = W.betreff !== T.betreff || W.text !== T.text;
      if (geaendert && box.querySelector('[data-vsmerk]').checked) await vsTexteSpeichern(art, W.betreff, W.text, false, null);
      const r = await api(`api/lv/${L.id}/versand/senden`, 'POST', { art, an: an.map((b) => ({ contact_id: b.contact_id, email: b.email, name: b.name, anrede: b.anrede })),
        betreff: W.betreff, text: W.text, kopie: !!W.kopie, pdf: mitAnh, x83: mitAnh && !D.ohne_x83, unterlagen: mitAnh, anhaenge: mitAnh ? R.map((x) => ({ name: x.name, mime: x.mime, daten: x.daten })) : [] });
      VS.D = r; VS.wahl = {}; if (mitAnh && r.ergebnis.some((x) => x.ok)) VS.rechner = [];   // vom Rechner: jetzt im Versand-Ordner
      const fe = r.ergebnis.filter((x) => !x.ok);
      toast(`${r.ergebnis.length - fe.length} Mail${r.ergebnis.length - fe.length === 1 ? '' : 's'} gesendet${fe.length ? ` – ${fe.length} Fehler: ${fe.map((x) => x.name + ' (' + x.fehler + ')').join(', ')}` : ''}${r.ablage.length ? ` · im Projektordner: „${r.ordner}“` : r.ablage_fehler ? ' · ' + r.ablage_fehler : ''}.`, !!fe.length);
      if (typeof refreshList === 'function') refreshList();
      vsNeu();
    } });
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
