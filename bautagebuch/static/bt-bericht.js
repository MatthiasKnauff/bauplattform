/* Bautagebuch – Der Tagesbericht: Abschnitte, Einträge, Fotos, Anwesende laut Plan, Fortschritt, Kopf, Seitenleiste.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const timeSelect = (val, attrs, blank) => {   // Uhrzeit als Auswahlliste (am iPhone ein Rad), Viertelstunden-Schritte
  const opts = []; for (let h = 5; h <= 21; h++) for (const m of [0, 15, 30, 45]) opts.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
  if (val && !opts.includes(val)) { opts.push(val); opts.sort(); }
  return `<select ${attrs} aria-label="Uhrzeit">${blank ? `<option value="" ${val ? '' : 'selected'}>–</option>` : ''}${opts.map(o => `<option ${o === (val || (blank ? '' : '09:00')) ? 'selected' : ''}>${o}</option>`).join('')}<option value="__x">Andere Zeit …</option></select>`;
};
function dueUi(i, s) {   // Erledigungsdatum mit E-Mail-Erinnerung (nur Abschnitte mit extra.due)
  if (!(s.extra && s.extra.due)) return '';
  if (dueEditId === i.id) {   // Datum (Kalender) + Uhrzeit (Rad) + Schnellwahl; speichert bei jeder Änderung, „Fertig“ schließt
    const tomorrow = new Date(Date.now() + 864e5), tm = new Date(tomorrow - tomorrow.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    return `<div class="duepanel" data-it="${i.id}"><input type="date" id="dueinp" data-dp="date" value="${esc(i.due || tm)}" aria-label="Erinnerung am">${timeSelect(i.due_time, 'data-dp="time"')}
      <span class="chips"><button class="chip" data-act="dueQuick" data-d="0">Heute</button><button class="chip" data-act="dueQuick" data-d="1">Morgen</button><button class="chip" data-act="dueQuick" data-d="7">+1 Woche</button></span>
      <button class="dueb" data-act="dueDone" title="Fertig">✓ Fertig</button><button class="dueb" data-act="dueClear" data-id="${i.id}" title="Erledigungsdatum entfernen">Datum löschen</button></div>`;
  }
  if (i.due) return `<button class="due ${!i.done && i.due < todayISO() ? 'late' : ''}" data-act="dueEdit" data-id="${i.id}" title="Erinnerung per E-Mail am ${esc(fmt(i.due))} um ${esc(i.due_time || '09:00')} Uhr – antippen zum Ändern">⏰ ${esc(fmt(i.due))} ${esc(i.due_time || '09:00')}</button>`;
  return `<button class="dueb" data-act="dueEdit" data-id="${i.id}" title="Erledigungsdatum mit E-Mail-Erinnerung">${ic('cal', 18)}</button>`;
}
const fotoOk = (s) => !!s && (s.type === 'list' || !!(s.extra && s.extra.photos));   // Fotos an Einträgen in allen Abschnitten (auch Anwesende)
function photoUi(i, s, r) {   // kleine Fotos am Eintrag (Mangel, Notiz); das große Bild liegt unter „Bilder“
  if (!fotoOk(s)) return '';
  const th = r.images.filter(x => x.item_id === i.id).map(x => `<span class="itp"><a href="uploads/${esc(x.file)}" target="_blank" title="${esc(x.caption || 'Foto')}"><img loading="lazy" src="api/thumb/96/${esc(x.file)}" alt="${esc(x.caption || 'Foto')}"></a><button type="button" class="itd" data-act="delImg" data-id="${x.id}" title="Foto löschen" aria-label="Foto löschen">×</button></span>`).join('');
  return `<span class="ith">${th}<button class="ph" data-act="itemPhoto" data-id="${i.id}" title="Foto zu diesem Eintrag">${ic('cam', 18)}</button></span>`;
}
let secOpen = {}; try { secOpen = JSON.parse(localStorage.getItem('secOpen') || '{}'); } catch {}
const secIsOpen = (k, n) => (k in secOpen ? secOpen[k] : n > 0);
const setSecOpen = (k, v) => { secOpen[k] = v; try { localStorage.setItem('secOpen', JSON.stringify(secOpen)); } catch {} };
const secHead = (s, n, open) => `<h3 class="tg" data-act="secToggle" data-key="${esc(s.key)}" data-open="${open ? 1 : 0}" role="button" aria-expanded="${open}">${secIc(s)}<span class="st">${esc(s.title)}</span>${n ? `<span class="cn">${n}</span><span class="cv ${open ? 'o' : ''}">${ic('chev', 20, 3)}</span>` : ''}</h3>`;   // leerer Abschnitt: kein Pfeil
let addFiles = [];   // Fotos, die beim Anlegen eines Eintrags gleich mitgeschickt werden
const photoAdd = s => fotoOk(s) ? `<div class="padd"><button type="button" data-act="aCam">${ic('cam', 20)} Foto aufnehmen</button><button type="button" data-act="aLib">${ic('pdf', 20)} Aus Mediathek</button><div id="apv" class="apv"></div></div>` : '';
function renderApv() {
  const box = $('#bwz #apv') || $('#apv'); if (!box) return; box.innerHTML = '';
  addFiles.forEach((f, i) => {
    const sp = document.createElement('span'), im = new Image(); im.alt = f.name; im.src = URL.createObjectURL(f);
    im.onerror = () => { const n = document.createElement('span'); n.className = 'nf'; n.textContent = '📷'; n.title = f.name; im.replaceWith(n); };
    const rm = document.createElement('button'); rm.className = 'rm'; rm.type = 'button'; rm.dataset.act = 'aRm'; rm.dataset.i = i; rm.textContent = '✕'; rm.title = 'Foto entfernen';
    sp.append(im, rm); box.append(sp);
  });
}
const SGATTR = 'data-sg="1" autocomplete="nope" name="bt-co" autocorrect="off" spellcheck="false"';
const coAdd = s => s.extra && s.extra.company ? `<div class="sgw" style="flex:1 1 100%"><input data-add-co ${SGATTR} placeholder="Firma (optional, frei eintragen oder aus Kontakten wählen)" aria-label="Firma"><div class="sug hidden" role="listbox"></div></div>` : '';
/* Anwesende laut Bauzeitenplan: erwartete Firmen vorschlagen – der Bauleiter bestätigt „anwesend“ oder „nicht da“ */
let SOLL = { rid: 0, f: [], o: [], n: [] }, sollBusy = 0;
function sollInner(k) {   // erwartete Firmen als vorausgefüllte Zeilen (Firma, Tätigkeit laut Plan, Anzahl) – erst ✓ trägt sie ein
  const f = SOLL.f.filter(x => x.status === 'offen' || x.status === 'fehlt');
  const oh = (SOLL.o || []).length ? `<div class="soll-h">Laut Bauzeitenplan heute außerdem – dort ist keine Firma eingetragen. Firma hier eintragen, dann steht sie auch im Bauzeitenplan:</div>${SOLL.o.map(x => `<div class="soll-r ohne" data-sollgw="${esc(x.gewerk)}"><span><b>${esc(x.gewerk)}</b><small>${esc(x.leistungen.join(', ') || 'ohne Vorgangsname')}</small></span>
    <span class="sgw soll-of"><input data-sollgwf ${SGATTR} placeholder="Firma eintragen …" aria-label="Firma für ${esc(x.gewerk)}"><div class="sug hidden" role="listbox"></div></span>
    <span class="soll-bt"><button class="ok" data-act="sollGw" title="Firma übernehmen – auch in den Bauzeitenplan">✓</button><button data-act="sollGwNein" title="Heute nicht – Hinweis ausblenden">–</button></span></div>`).join('')}` : '';
  if (!f.length) return oh ? `<div class="soll">${oh}</div>` : '';
  return `<div class="soll"><div class="soll-h">Laut Bauzeitenplan vorausgefüllt – bitte bestätigen ✓ oder ablehnen ✗</div>${f.map(x => x.status === 'fehlt'
    ? `<div class="soll-r fehlt" data-sollf="${esc(x.firma)}"><span><b>${esc(x.firma)}</b><small>${esc(x.leistungen.join(', '))}</small></span><span class="soll-st">nicht da</span><button data-act="sollSet" data-st="offen">Rückgängig</button></div>`
    : `<div class="soll-r pend" data-sollf="${esc(x.firma)}"><span class="sn"><b>${esc(x.firma)}</b><small>laut Bauzeitenplan</small></span>
      <textarea class="act" rows="1" data-soll-act aria-label="Art der Tätigkeit">${esc(x.leistungen.join(', '))}</textarea>
      <input class="cnt" data-soll-cnt type="number" min="0" placeholder="Anz." value="1" aria-label="Anzahl Mitarbeiter">
      <span class="soll-bt"><button class="ok" data-act="sollDa" data-kind="${esc(k)}" title="Bestätigen – als anwesend eintragen">✓</button><button data-act="sollSet" data-st="fehlt" title="Ablehnen – Firma war nicht da">✗</button><button data-act="sollSet" data-st="nein" title="Nicht nötig – z. B. Termin verschoben">–</button></span></div>`).join('')}${oh}</div>`;
}
function sollHtml(r, k) {
  if (SOLL.rid !== r.id) loadSoll(r.id);
  if (FS.rid !== r.id) loadFs(r.id);
  return `<div class="soll-box" data-soll="${esc(k)}">${SOLL.rid === r.id ? sollInner(k) : ''}</div><div class="soll-box fs-box">${FS.rid === r.id ? fsInner() : ''}</div>`;
}
/* Arbeitsfortschritt: je laufendem Vorgang Prozent und Ampel – geht direkt in den Bauzeitenplan */
let FS = { rid: 0, v: [], sw: 5 }, fsBusy = 0;
const fsVz = (n) => (n >= 10 ? Math.round(n) : String(Math.round(n * 2) / 2).replace('.', ',')) + ' AT';
function fsInner() {
  if (!FS.v.length) return '';
  const zeile = (x) => {
    const wert = x.pct_bericht != null ? x.pct_bericht : null, sollR = Math.round(x.soll / 25) * 25;
    const vz = x.verzug >= FS.sw ? `<span class="vz">≈ ${fsVz(x.verzug)} im Verzug – Terminrüge möglich</span>` : x.verzug >= 1 ? `≈ ${fsVz(x.verzug)} hinterher` : '';
    const pz = wert != null ? wert : x.ist, kl = pz >= 100 ? 'ok' : x.verzug >= 1 ? 'rot' : '';
    return `<div class="fs-r" data-fsg="${esc(x.gantt_id)}" data-fsu="${x.uid}"><span class="fs-n"><b>${esc(x.vorgang)}</b> <span class="mute">· ${esc(x.firma)}</span>
        <span class="fs-bar" title="gemeldet ${pz} % · Plan ${x.soll} %"><i class="${kl}" style="width:${Math.max(0, Math.min(100, pz))}%"></i><u style="left:calc(${Math.max(0, Math.min(100, x.soll))}% - 1px)"></u></span>
        <small>laut Plan ${x.soll} %${x.f ? ' · Ende ' + esc(x.f.slice(8, 10) + '.' + x.f.slice(5, 7) + '.') : ''} · im Bauzeitenplan ${x.ist} %${vz ? ' · ' + vz : ''}</small></span>
      <span class="fs-p">${bpProzent(pz, 'data-act="fsSet"').replace(`data-p="${sollR}"`, `data-p="${sollR}" data-soll title="${sollR} % – etwa laut Plan"`)}</span>
      <span class="fs-a" role="group" aria-label="Stand">${[['plan', 'im Plan'], ['hinterher', 'hinterher'], ['fertig', 'fertig']].map(([k, l]) => `<button type="button" data-act="fsSet" data-am="${k}" class="${x.ampel === k ? 'on' : ''}">${l}</button>`).join('')}</span></div>`;
  };
  const L = FS.alle || FS.v.length <= 8 ? FS.v : FS.v.slice(0, 6);
  return `<div class="fs"><div class="fs-h"><b>Arbeitsfortschritt</b> laut Bauzeitenplan – wird dort eingetragen. Ab ${FS.sw} Arbeitstagen Verzug schlägt die Plattform eine Terminrüge vor (To-do „Terminrüge?“ auf der Startseite und unter Aufgaben → Termine) – verschickt wird nichts von selbst.</div>${L.map(zeile).join('')}${L.length < FS.v.length ? `<button type="button" class="bd morei" data-act="fsAlle">Alle ${FS.v.length} Vorgänge anzeigen</button>` : ''}</div>`;
}
async function loadFs(rid) {
  if (fsBusy === rid) return; fsBusy = rid;
  try { const d = await api('api/reports/' + rid + '/fortschritt'); FS = { rid, v: d.vorgaenge || [], sw: d.schwelle || 5, alle: FS.rid === rid && FS.alle }; } catch (e) { FS = { rid, v: [], sw: 5 }; }
  fsBusy = 0;
  document.querySelectorAll('.fs-box').forEach(b => { b.innerHTML = fsInner(); });
}
async function loadSoll(rid) {
  if (sollBusy === rid) return; sollBusy = rid;
  try { const d = await api('api/reports/' + rid + '/soll'); SOLL = { rid, f: d.firmen || [], o: d.ohne_firma || [], n: d.nachreichen || [] }; } catch (e) { SOLL = { rid, f: [], o: [], n: [] }; }
  sollBusy = 0;
  document.querySelectorAll('.soll-box[data-soll]').forEach(b => { b.innerHTML = sollInner(b.dataset.soll); });
  document.querySelectorAll('.nr-box').forEach(b => { b.innerHTML = nrInner(); });   // nur die Vorschläge auffrischen – keine Eingabe verlieren
  if (BWZ.open) bwzRender();
}
/* Bauantrag: Bauvorlagen „wird nachgereicht“, deren Frist erreicht ist (Erinnerung im Bautagebuch) – unter „Zu erledigen“ */
function nrInner() {
  const L = SOLL.n || []; if (!L.length) return '';
  const ba = (PLATFORM.apps || []).find((a) => a.key === 'bauantrag' && a.allowed);
  return `<div class="soll-h">Aus dem Bauantrag nachzureichen:</div>${L.map((x) => `<div class="nr-z">📄 <b>${esc(x.name)}</b>${x.liefert ? ' · ' + esc(x.liefert) : ''} <span class="nr-f">Frist ${esc(fmt(x.frist))}</span>${ba ? ` <a href="${esc(appUrl(ba))}/#antrag=${x.aid}&bv=${esc(x.key)}">im Bauantrag ›</a>` : ''}</div>`).join('')}`;
}
function listSec(s, r) {
  const k = s.key, lk = s.extra && s.extra.link_contacts;
  const link = i => i.contact_id ? `<button class="lnk" data-act="gotoContact" data-id="${i.contact_id}" title="Kontakt öffnen">${esc(i.text)}</button>` : esc(i.text);
  const rows = r.items.filter(i => i.kind === k).map(i => lk ? `<div class="ln firm"><span class="fn"><span class="fav" aria-hidden="true">${esc(kuerzel(i.text))}</span>${link(i)}</span>
    <textarea class="act ed" rows="1" data-it="${i.id}" data-k="activity" placeholder="Art der Tätigkeit" aria-label="Art der Tätigkeit">${esc(i.activity)}</textarea>
    <input class="cnt" data-it="${i.id}" data-k="headcount" type="number" min="0" placeholder="Anz." value="${i.headcount ?? ''}" aria-label="Anzahl Mitarbeiter">
    ${photoUi(i, s, r)}<button class="x" data-act="delItem" data-id="${i.id}" title="Entfernen">✕</button></div>` : `<div class="ln ${i.done ? 'done' : ''}">
    ${s.checkable ? `<input type="checkbox" data-act="toggle" data-id="${i.id}" ${i.done ? 'checked' : ''} aria-label="Erledigt">` : ''}
    ${s.extra && s.extra.company ? `<div class="sgw cow"><input class="co" data-it="${i.id}" data-k="company" ${SGATTR} placeholder="Firma" value="${esc(i.company)}" aria-label="Firma"><div class="sug hidden" role="listbox"></div></div>` : ''}<textarea class="ed" data-it="${i.id}" data-k="text" rows="1" aria-label="Eintrag bearbeiten">${esc(i.text)}</textarea>${photoUi(i, s, r)}${dueUi(i, s)}<button class="x" data-act="delItem" data-id="${i.id}" title="Entfernen">✕</button></div>`).join('');
  const field = lk ? `<div class="sgw"><input data-add="${esc(k)}" data-sg="1" placeholder="${esc(s.placeholder)}" autocomplete="nope" name="bt-add" autocorrect="off" spellcheck="false" enterkeyhint="next"><div class="sug hidden" role="listbox"></div></div>`
    : `<textarea data-add="${esc(k)}" rows="3" placeholder="${esc(s.placeholder)}"></textarea>`;
  const extra = lk ? `<textarea class="ed" rows="1" data-add-act placeholder="Art der Tätigkeit"></textarea><input data-add-cnt type="number" min="0" placeholder="Anz." aria-label="Anzahl Mitarbeiter">`
    : '<div class="hint">Enter = neue Zeile · Strg+Enter = hinzufügen</div>';
  const add = adding === k ? `<div class="addrow">${lk ? '' : coAdd(s)}${field}${extra}${s.extra && s.extra.due ? `<label class="dl"><span class="dlt">Erinnerung per E-Mail (optional)</span><input type="date" data-add-due aria-label="Erledigen bis"> <span>um</span> ${timeSelect('09:00', 'data-add-time')}</label>` : ''}${photoAdd(s)}<span class="add-k"><button class="ok" data-act="addItem" data-kind="${esc(k)}">Hinzufügen</button><button class="add-weg" data-act="addWeg" data-kind="${esc(k)}">Verwerfen</button></span></div>` : '';
  const n = r.items.filter(i => i.kind === k).length, open = secIsOpen(k, n) || adding === k;
  return `<div class="sec ${open ? '' : 'col'}${!n && !open && !lk ? ' leer' : ''}" data-drop="${esc(k)}" id="sec-${esc(k)}"><div class="main">${secHead(s, n, open)}${lk ? sollHtml(r, k) : ''}${k === 'zu_erledigen' ? `<div class="soll-box nr-box">${SOLL.rid === r.id ? nrInner() : ''}</div>` : ''}${open ? `<div class="lines">${rows}</div>${add}` : ''}</div>
    <div class="side"><button class="rplus" data-act="adding" data-kind="${esc(k)}" title="${esc(s.title)} hinzufügen" aria-label="${esc(s.title)} hinzufügen">${ic('plus', 20, 2.6)}</button></div></div>`;
}
function imgSec(s, r) {
  const shown = allImgs ? r.images : r.images.slice(0, 6), rest = r.images.length - shown.length;
  const open = secIsOpen(s.key, r.images.length);
  return `<div class="sec ${open ? '' : 'col'}${r.images.length || open ? '' : ' leer'}" data-drop="" id="sec-${esc(s.key)}"><div class="main">${secHead(s, r.images.length, open)}${open && !r.images.length ? '<div class="sec-leer">Noch keine Bilder – mit ＋ wählen oder Fotos hierher ziehen.</div>' : ''}
    <div class="imgs" ${open ? '' : 'style="display:none"'}>${shown.map(i => `<div><a href="uploads/${esc(i.file)}" target="_blank"><img loading="lazy" src="api/thumb/240/${esc(i.file)}" alt="${esc(i.caption || 'Baustellenfoto')}"></a><button class="rm" data-act="delImg" data-id="${i.id}" title="Bild löschen">✕</button><input class="cap" data-img="${i.id}" value="${esc(i.caption)}" placeholder="Beschreibung" maxlength="120" autocomplete="off" aria-label="Fotobeschreibung (wird der Dateiname)"></div>`).join('')}</div>
    ${open && rest > 0 ? `<button class="bd morei" data-act="moreImgs">Alle ${r.images.length} Bilder anzeigen (+${rest})</button>` : ''}${open && allImgs && r.images.length > 6 ? `<button class="bd morei" data-act="lessImgs">Weniger anzeigen</button>` : ''}
    <input type="file" id="file" class="vh" accept="image/*,.heic,.heif" multiple></div>
    <div class="side"><button class="rplus" data-act="pickFile" title="Bilder hinzufügen" aria-label="Bilder hinzufügen">${ic('plus', 20, 2.6)}</button></div></div>`;
}
/* Wetter steht als eine Zeile im Kopf des Berichts (headSec) – keine eigene Karte mehr. Der Stift klappt die Felder auf. */
function wxSec() { return ''; }
function wxZeile(s, r) {
  const t = r.temp !== '' && r.temp != null ? esc(String(r.temp).replace('.', ',')) + ' °C' : '', leer = !t && !r.weather && !r.precip && !r.wind && !r.humidity;
  const rest = [r.precip, r.wind ? esc(r.wind) + ' km/h' : '', r.humidity ? esc(r.humidity) + ' %' : ''].filter(Boolean);
  return `<div class="kp-wx" id="sec-${esc(s.key)}" title="Wetter${r.extra && r.extra.place ? ' – ' + esc(r.extra.place) : ''}${r.plz ? ' · PLZ ' + esc(r.plz) : ''}">${ic(/regen|schnee|gewitter/i.test((r.weather || '') + (r.precip || '')) ? 'drop' : 'cloudo', 18, 2)}
    ${leer ? '<span class="wl">Wetter noch nicht eingetragen</span>' : `<b>${t || '–'}</b>${r.weather ? `<span>${esc(r.weather)}</span>` : ''}${rest.length ? `<span class="wl">· ${rest.map((x, n) => n ? x : esc(x)).join(' · ')}</span>` : ''}`}
    <button data-act="gps" title="Wetter für die Projektadresse laden" aria-label="Wetter laden">${ic('pin', 16)}</button><button data-act="wxEdit" title="${wxEdit ? 'Fertig' : 'Wetter bearbeiten'}" aria-label="Wetter bearbeiten">${wxEdit ? '✓' : ic('pencil', 15)}</button></div>`;
}
const wxFelder = (r) => `<div class="wgrid kp-ed">
      <label>Wetter<select data-f="weather"><option value=""></option>${WX.map(w => `<option ${w === r.weather ? 'selected' : ''}>${w}</option>`).join('')}</select></label>
      <label>Niederschlag<select data-f="precip"><option value=""></option>${PRECIP.map(w => `<option ${w === r.precip ? 'selected' : ''}>${w}</option>`).join('')}</select></label>
      <label>Temperatur (°C)<input data-f="temp" inputmode="decimal" value="${esc(r.temp)}"></label>
      <label>Luftfeuchtigkeit (%)<input data-f="humidity" inputmode="decimal" value="${esc(r.humidity)}"></label>
      <label>Wind (km/h)<input data-f="wind" inputmode="decimal" value="${esc(r.wind)}"></label>
      <label>PLZ<input data-f="plz" inputmode="numeric" value="${esc(r.plz)}"></label></div>`;
function headSec(s, r) {
  const p = curProject();
  const felder = headEdit ? `<div class="wgrid kp-ed">
      <label>Nummer<input data-f="number" type="number" min="1" value="${esc(r.number)}"></label>
      <label>Datum<input data-f="date" type="date" value="${esc(r.date)}"></label>
      <label>Uhrzeit${timeSelect(r.time, 'data-f="time"', true)}</label>
      <label>Bauleitung vor Ort<input data-f="site_manager" value="${esc(r.site_manager)}"></label>
      <div class="chips">${people.filter(n => !(r.site_manager || '').toLowerCase().includes(n.toLowerCase())).map(n => `<button class="chip" data-act="addPerson" data-name="${esc(n)}">+ ${esc(n)}</button>`).join('')}<small>Mehrere Personen mit Komma trennen oder oben antippen.</small></div></div>` : '';
  const info = `<div class="hm"><span>${ic('cal', 16, 2)}${fmt(r.date)}${r.time ? ' · ' + esc(r.time) + ' Uhr' : ''}</span>${r.site_manager ? `<span title="Bauleitung vor Ort">${ic('user', 16, 2)}${esc(r.site_manager)}</span>` : ''}${p && p.client ? `<span title="Bauherrschaft">${ic('home', 16, 2)}${esc(p.client)}</span>` : ''}${p && addr(p) ? `<span class="kp-adr" title="Baustelle">${ic('pin', 16, 2)}${esc(addr(p))}</span>` : ''}${r.extra && r.extra.auto === 'vorort' && !(verData && verData.last_export && verData.versions && verData.status === 'exported') ? `<br><small style="color:var(--mute)">Automatisch angelegt bei der Ankunft (${esc(r.extra.ankunft || r.time || '')} Uhr) – bitte ergänzen und als PDF erstellen.</small>` : ''}</div>`;
  const W = meta.sections.find((x) => x.type === 'weather');
  const kurz = { chk_tidy: 'aufgeräumt', chk_photos: 'Fotos', chk_firms: 'Firmen angesprochen' };   // kurze Namen der Häkchen (voller Name im Tooltip)
  return `<div class="sec kopf" id="sec-${esc(s.key)}">
    <div class="kp-1"><h3>${secIc(s)}<span class="st">${esc(s.title)}${r.number ? ` <span class="nr">Nr. ${esc(r.number)}</span>` : ''}</span></h3>${info}
      <div class="kp-kn"><button data-act="addReport" title="Neuer Bericht">${ic('plus', 20, 3)}</button><button data-act="editHead" title="${headEdit ? 'Fertig' : 'Bericht bearbeiten (Datum, Uhrzeit, Bauleitung)'}">${headEdit ? '✓' : ic('pencil', 17)}</button><button data-act="delReport" title="Bericht löschen">${ic('trash', 17)}</button></div></div>${felder}
    <div class="kp-2">${W ? wxZeile(W, r) : ''}<div class="checks">${CHECKS.map(([k, l]) => `<label title="${esc(l)}"><input type="checkbox" data-f="${k}" ${r[k] ? 'checked' : ''}>${esc(kurz[k] || l)}</label>`).join('')}</div></div>${W && wxEdit ? wxFelder(r) : ''}
  </div><div id="vbox" class="vbox"></div>`;
}
// Register: neuer Abschnitts-Typ = ein Eintrag hier + eine Zeile in der Tabelle "sections". Unbekannte Typen werden übersprungen.
const RENDER = {header: headSec, weather: wxSec, list: listSec, images: imgSec};
/* Seitenleiste (nur auf breiten Bildschirmen): Monat mit Berichten, Abschnitte mit Anzahl, Fortschritt */
let calOff = 0;
function sideHtml(r) {
  if (!r) return '';
  const d0 = new Date(r.date + 'T12:00'), m = new Date(d0.getFullYear(), d0.getMonth() + calOff, 1), y = m.getFullYear(), mo = m.getMonth();
  const tage = new Date(y, mo + 1, 0).getDate(), vor = (m.getDay() + 6) % 7, iso = (t) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
  const B = {}; reports.forEach((x) => { if (!B[x.date] || x.id === r.id) B[x.date] = x; });
  const heute = todayISO();
  let g = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((t) => `<i>${t}</i>`).join('') + '<span></span>'.repeat(vor);
  for (let t = 1; t <= tage; t++) { const k = iso(t), x = B[k]; g += x ? `<button type="button" class="${x.id === r.id ? 'on' : ''}${k === heute ? ' heute' : ''}" data-act="pickReport" data-id="${x.id}" title="Bericht Nr. ${esc(x.number)}">${t}</button>` : `<span class="${k === heute ? 'heute' : ''}">${t}</span>`; }
  const n = (s) => s.type === 'list' ? r.items.filter((i) => i.kind === s.key).length : s.type === 'images' ? r.images.length : s.type === 'weather' ? (r.temp || r.weather ? 1 : 0) : 1;
  const L = meta.sections.filter((s) => RENDER[s.type]);
  const fertig = L.filter((s) => n(s) > 0 || ['maengel', 'zu_erledigen', 'weisungen', 'notizen'].includes(s.key)).length, pr = Math.round(fertig / Math.max(1, L.length) * 100);
  return `<aside class="btside" aria-label="Berichte und Abschnitte">
    <div class="bcal"><div class="bcal-h"><button type="button" data-act="calM" data-d="-1" aria-label="Voriger Monat">‹</button><b>${m.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</b><button type="button" data-act="calM" data-d="1" aria-label="Nächster Monat">›</button></div><div class="bcal-g">${g}</div></div>
    <div class="bsum"><span class="ring" style="background:conic-gradient(var(--y) 0 ${pr}%,var(--hov) 0)"><b>${fertig}/${L.length}</b></span><span><b>${r.number ? 'Nr. ' + esc(r.number) + ' · ' : ''}${fmt(r.date)}</b><small>${pr >= 100 ? 'alle Abschnitte ausgefüllt' : 'Abschnitte ausgefüllt'}</small></span></div>
    <nav class="btoc">${L.map((s) => { const k = n(s), z = s.type === 'list' || s.type === 'images'; return `<button type="button" data-act="gehZu" data-k="${esc(s.key)}">${secIc(s)}<span>${esc(s.title)}</span>${z ? `<span class="n${k ? ' ok' : ''}">${k}</span>` : `<span class="n${k ? ' ok' : ''}">${k ? '✓' : '–'}</span>`}</button>`; }).join('')}</nav>
  </aside>`;
}
function renderReport(box) {
  const p = curProject();
  if (!p) { box.innerHTML = `<div class="empty">Noch kein Projekt gewählt.<br><br><button class="bd" data-act="projPicker">Projekt wählen</button> <button class="bd" data-act="newProject">Neues Projekt</button></div>`; return; }
  const r = curReport();
  if (!r) { box.innerHTML = `<div class="empty">Noch kein Tagesbericht.<br><br><button class="bd" data-act="addReport">Ersten Tagesbericht anlegen</button></div>`; return; }
  const bwzBar = bwzPrefs().on ? `<div class="bwz-bar"><button class="go" data-act="bwzStart">▶ Bericht Schritt für Schritt</button><button data-act="bwzSet" title="Schritte wählen oder Assistent ausschalten">⚙</button></div>` : '';
  box.innerHTML = `<div class="btl" data-bph-trenn-ab="1180" data-bph-trenn="bt" data-bph-trenn-min="200" data-bph-trenn-max="0.45">${sideHtml(r)}<div class="wrap">` + renameBanner() + (btKachel() ? kachelnHtml(r, bwzBar) : bwzBar + meta.sections.map(s => (RENDER[s.type] || (() => ''))(s, r)).join('')) + `</div></div>`;
  box.insertAdjacentHTML('beforeend', '<input type="file" id="ifile" class="vh" accept="image/*,.heic,.heif" multiple>');
  $('#ifile').onchange = async e => {
    const fs = [...e.target.files]; e.target.value = ''; await uploadPhotos(fs, itemPhotoFor);
  };
  const f = $('#file'); if (f) f.onchange = async e => {
    const fs = [...e.target.files]; e.target.value = ''; await uploadPhotos(fs, null);
  };
  if (!BWZ.open) document.querySelector('[data-add]')?.focus(); growAll(); loadVer();
  if (BWZ.open) bwzRender();
}

/* ---------- Am Handy: Abschnitte als Kacheln (zwei Spalten, mit Anzahl). Tippen öffnet den Abschnitt allein, „‹ Bericht“ führt zurück.
   Hinzufügen nur über das ＋ unten in der Fußleiste bzw. im geöffneten Abschnitt über die breite Zeile „＋ … hinzufügen“. Am PC bleibt alles wie bisher. */
let btFokus = null;   // geöffneter Abschnitt (Schlüssel) in der Kachelansicht
const btKachel = () => matchMedia('(max-width:720px)').matches && !BWZ.open;
function kachelnHtml(r, bwzBar) {
  const kopf = meta.sections.filter((s) => s.type === 'header' || s.type === 'weather').map((s) => RENDER[s.type](s, r)).join('');
  const L = meta.sections.filter((s) => s.type === 'list' || s.type === 'images');
  const n = (s) => (s.type === 'images' ? r.images.length : r.items.filter((i) => i.kind === s.key).length);
  const f = btFokus && L.find((s) => s.key === btFokus);
  if (f) {
    secOpen[f.key] = true;
    const neu = f.type === 'images' ? `<button class="bt-neu" data-act="pickFile">＋ Bilder hinzufügen</button>` : adding === f.key ? '' : `<button class="bt-neu" data-act="adding" data-kind="${esc(f.key)}">＋ ${esc(f.title)} hinzufügen</button>`;
    return `<button class="bt-zur" data-act="secFokus" data-key="">‹ Bericht</button><div class="bt-fokus">${RENDER[f.type](f, r)}${neu}</div>`;
  }
  const offen = (s) => s.checkable ? r.items.filter((i) => i.kind === s.key && !i.done).length : null;
  return kopf + bwzBar + `<div class="bt-kach">${L.map((s) => { const z = n(s), o = offen(s);
    return `<button class="bt-k" data-act="secFokus" data-key="${esc(s.key)}">${secIc(s)}<b>${esc(s.title)}</b>${z ? `<span class="z">${z}</span>${o ? `<small>${o} offen</small>` : ''}` : `<small>${s.type === 'images' ? 'noch keine' : 'leer'}</small>`}</button>`; }).join('')}</div>`;
}

/* ---------- Drucken: dieser Bericht, im Kalender markierte (Umschalt + Klick), Zeitraum oder alle Berichte des Projekts ----------
   Ein Bericht: wie bisher (PDF wird erzeugt und abgelegt). Mehrere: ein gemeinsames PDF zum Ansehen und Drucken – ohne Ablage. */
let btMark = null;   // {von, bis} – im Kalender mit Umschalt markierter Zeitraum
const drN = (n) => (n === 1 ? '1 Bericht' : n + ' Berichte');
const drAnz = (von, bis) => reports.filter((x) => x.date && x.date >= von && x.date <= bis).length;
function druckDialog() {
  const p = curProject(), r = curReport(); if (!p) return;
  const D = reports.map((x) => x.date).filter(Boolean).sort(), erst = D[0] || todayISO(), letzt = D[D.length - 1] || todayISO();
  const mk = btMark, art0 = mk ? 'mark' : r ? 'eins' : 'zeit';
  const opt = (v, t, k) => `<label class="bt-drw"><input type="radio" name="drArt" value="${v}"${v === art0 ? ' checked' : ''}><span><b>${t}</b>${k ? `<small>${k}</small>` : ''}</span></label>`;
  modalBox(`<h3>Drucken</h3><div class="bt-dr">
    ${r ? opt('eins', 'Dieser Bericht', `${r.number != null ? 'Nr. ' + esc(r.number) + ' · ' : ''}${fmt(r.date)} – wird als PDF abgelegt`) : ''}
    ${mk ? opt('mark', 'Im Kalender markiert', `${fmt(mk.von)} – ${fmt(mk.bis)} · ${drN(drAnz(mk.von, mk.bis))}`) : ''}
    ${opt('zeit', 'Zeitraum', '')}<div class="bt-drz"><input type="date" id="drVon" value="${esc(mk ? mk.von : r ? r.date : erst)}" aria-label="von"><span>bis</span><input type="date" id="drBis" value="${esc(mk ? mk.bis : r ? r.date : letzt)}" aria-label="bis"><small id="drN"></small></div>
    ${opt('alle', 'Alle Berichte des Projekts', `${drN(reports.length)} · ${fmt(erst)} – ${fmt(letzt)}`)}
    <label class="bt-drf"><input type="checkbox" id="drFoto" checked> mit Fotos</label>
    <p class="hint">Mehrere Berichte kommen in ein gemeinsames PDF – nur zum Ansehen und Drucken, abgelegt wird es nicht. Tipp: Im Kalender einen Tag anklicken und mit gedrückter Umschalttaste einen zweiten – das markiert den Zeitraum.</p></div>
    <div class="acts"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">PDF erstellen</button></div>`,
  async (m, bg, close) => {
    if (m !== 'ok') { close(); return; }
    const art = bg.querySelector('[name=drArt]:checked').value, foto = bg.querySelector('#drFoto').checked ? '' : '&fotos=0';
    if (art === 'eins') { close(); los0('print'); return; }
    let von = erst, bis = letzt;
    if (art === 'mark') ({ von, bis } = mk); else if (art === 'zeit') { von = bg.querySelector('#drVon').value; bis = bg.querySelector('#drBis').value; if (von > bis) [von, bis] = [bis, von]; }
    if (!drAnz(von, bis)) { toast('Im gewählten Zeitraum gibt es keinen Tagesbericht.'); return; }
    close(); await Promise.allSettled([...saving]);
    const u = `api/projects/${p.id}/berichte.pdf?von=${von}&bis=${bis}${foto}`;
    if (isStandalone()) openPdf(u); else { const w = window.open(u, '_blank'); if (!w) location.href = u; }
  });
  const bg = [...document.querySelectorAll('.modal-bg')].pop(), zahl = () => { const a = bg.querySelector('#drVon').value, b = bg.querySelector('#drBis').value, n = drAnz(a < b ? a : b, a < b ? b : a); bg.querySelector('#drN').textContent = drN(n); };
  bg.addEventListener('input', (e) => { if (e.target.closest('.bt-drz')) { bg.querySelector('[name=drArt][value=zeit]').checked = true; zahl(); } });
  zahl();
}
const los0 = (act) => { const b = document.createElement('button'); b.hidden = true; b.dataset.act = act; document.body.appendChild(b); b.click(); b.remove(); };
