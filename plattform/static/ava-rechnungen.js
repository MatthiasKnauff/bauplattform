/* Ausschreibung (AVA) – Rechnungen.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- Rechnungen ---------- */
const RE_NAME = { abschlag: 'Teilrechnung', schluss: 'Schlussrechnung', regie: 'Regierechnung', nachtrag: 'Nachtragsrechnung', sicherheit: 'Freigabe der Sicherheit' };
const reZusatz = (r) => (r && (r.titel || (r.data && r.data.titel))) || '';   // Erklärung hinter dem Namen (Doppelklick im Baum), z. B. „3. Teilrechnung · Rohbau EG“
const reTitel = (r, lvId) => reTitelStd(r, lvId) + (reZusatz(r) ? ' · ' + reZusatz(r) : '');
const reTitelStd = (r, lvId) => ((r.art === 'abschlag' || !RE_NAME[r.art]) && istOA(lvId || (L && L.id)) ? `${r.nr}. Rechnung` : r.art === 'abschlag' || !RE_NAME[r.art] ? `${r.nr}. Teilrechnung` : `${r.nr}. ${RE_NAME[r.art]}`);
/* Sicherheiten (VOB/B § 17): Vertragserfüllung und Mängelansprüche – Einbehalt oder Bürgschaft; Abnahme und Frist */
function vSicherheiten(K) {
  const S = K.sicherheit || {}, ve = S.ve || {}, ma = S.ma || {}, ein = (k, f, v, ph = '', typ = 'text', w = '') => `<input data-si="${k}.${f}" value="${esc(v ?? '')}" type="${typ}" placeholder="${esc(ph)}"${w ? ` style="width:${w}"` : ''}${typ === 'text' && /betrag|pct/.test(f) ? ' inputmode="decimal"' : ''}>`;
  const heute = new Date().toISOString().slice(0, 10), ende = S.gw_ende || '';
  const tage = ende ? Math.round((new Date(ende) - new Date(heute)) / 864e5) : null;
  const zurueck = (x) => x.form === 'buergschaft' ? !!x.rueckgabe : false;
  const warn = [];
  if (ve.form === 'buergschaft' && ve.eingang && !ve.rueckgabe && S.abnahme && (ma.form !== 'buergschaft' || ma.eingang)) warn.push('Abnahme ist erfolgt – Vertragserfüllungsbürgschaft zurückgeben (sobald die Sicherheit für Mängelansprüche vorliegt).');
  if (tage != null && tage <= 60 && (K.sicherheit.offen > 0.5 || (ma.form === 'buergschaft' && ma.eingang && !zurueck(ma)))) warn.push(tage < 0 ? `Verjährungsfrist für Mängelansprüche ist seit ${-tage} Tagen abgelaufen – Sicherheit freigeben bzw. Bürgschaft zurückgeben (vorher Mängel prüfen).` : `Verjährungsfrist für Mängelansprüche endet in ${tage} Tagen (${de(ende)}) – Begehung vorher, dann Sicherheit freigeben.`);
  const block = (k, x, titel, txt) => `<div class="si-b"><b>${titel}</b><span class="hint">${txt}</span>
      <div class="si-g"><label>Art<select data-si="${k}.form"><option value="einbehalt"${x.form !== 'buergschaft' ? ' selected' : ''}>Einbehalt</option><option value="buergschaft"${x.form === 'buergschaft' ? ' selected' : ''}>Bürgschaft</option></select></label>
      ${k === 've' ? `<label>Einbehalt %<input data-ve="einbehalt" value="${esc(nf(ve.pct, 2))}" inputmode="decimal" style="width:5rem"></label>` : `<label>Einbehalt %${ein(k, 'pct', nf(x.pct, 2), '3', 'text', '5rem')}</label>`}
      ${x.form === 'buergschaft' ? `<label>Betrag €${ein(k, 'betrag', x.betrag != null ? nf(x.betrag, 2) : '', '', 'text', '8rem')}</label><label>Bürge (Bank/Versicherung)${ein(k, 'buerge', x.buerge, 'z. B. Sparkasse Essen')}</label>
        <label>Nr.${ein(k, 'nr', x.nr, '', 'text', '8rem')}</label><label>erhalten am${ein(k, 'eingang', x.eingang, '', 'date')}</label><label>zurückgegeben am${ein(k, 'rueckgabe', x.rueckgabe, '', 'date')}</label>` : ''}</div>
      ${x.form === 'buergschaft' && x.eingang ? `<span class="hint">${k === 've' ? 'Bürgschaft liegt vor – in Teilrechnungen wird nichts einbehalten.' : 'Bürgschaft liegt vor – in der Schlussrechnung wird nichts einbehalten.'}</span>` : ''}
      <div class="si-dok">${(L.buergschaften || []).filter((d) => d.art === k || (!d.art && x.dok === d.id)).map((d) => `<span class="re-b"><a href="api/buergschaft/${d.id}" target="_blank" rel="noopener" title="${esc(d.ablage ? 'Im Projektordner: ' + d.ablage : 'nur in der Plattform gespeichert')}">📄 ${esc(d.name)}</a><button type="button" class="pj-del" data-bgweg="${d.id}" title="Urkunde entfernen">🗑</button></span>`).join('')}
        <label class="btn sm" title="Bürgschaftsurkunde als PDF, Scan oder Foto – Art, Betrag, Bürge und Nummer werden gelesen und zum Prüfen gezeigt">📎 Bürgschaft ablegen<input type="file" accept="application/pdf,.pdf,image/*,.docx" hidden data-bghoch="${k}"></label></div></div>`;
  return `<div class="card si"><h3>Sicherheiten <span class="hint">VOB/B § 17</span></h3>
    ${warn.map((w) => `<p class="si-w">⚠ ${esc(w)}</p>`).join('')}
    <div class="si-sum"><span>einbehalten <b>${eur(S.einbehalten)}</b></span><span>freigegeben <b>${eur(S.freigegeben)}</b></span><span>noch einbehalten <b>${eur(S.offen)}</b></span>
      ${S.offen > 0.5 ? `<button type="button" class="btn sm pri" data-act="siFrei" title="Freigabe der Sicherheit als eigene Rechnung – gegen Bürgschaft (Austausch, VOB/B § 17 Abs. 3) oder nach Ablauf der Verjährungsfrist">Sicherheit freigeben …</button>` : ''}</div>
    <p class="hint" style="margin:.2rem 0 .6rem">Einbehalt wird gegen eine Bürgschaft ausgetauscht oder nach Ablauf der Verjährungsfrist freigegeben – beides als „Freigabe der Sicherheit“ unter den Rechnungen. Eingescannte Urkunden hier ablegen: Art, Betrag, Bürge und Nummer werden erkannt.</p>
    ${block('ve', ve, 'Vertragserfüllungssicherheit', 'Sicherheit für die Vertragserfüllung: Einbehalt in jeder Teil-, Nachtrags- und Regierechnung – oder abgelöst durch Bürgschaft')}
    ${block('ma', ma, 'Sicherheit für Mängelansprüche (Gewährleistung)', 'Einbehalt in der Schlussrechnung – oder abgelöst durch Bürgschaft')}
    <div class="si-g"><label>Abnahme am${ein('', 'abnahme', S.abnahme, '', 'date')}</label><label>Verjährung Jahre${ein('', 'gw_jahre', S.gw_jahre, '4', 'text', '4rem')}</label>
      <label>Frist endet am<input data-si=".gw_ende" type="date" value="${esc(ende)}"></label></div></div>`;
}
/* Bürgschaftsurkunde hochladen: Server liest Art, Betrag, Bürge, Nr., Datum – hier prüfen, dann Sicherheit eintragen und ggf. Einbehalt freigeben */
async function buergschaftHoch(f, o = {}) {
  if (!f || !L) return;
  const fd = new FormData(); fd.append('datei', f); if (o.art) fd.append('art', o.art);
  if (o.ordner === 'nein') fd.append('ordner', 'nein'); else if (Array.isArray(o.ordner)) fd.append('ordner', JSON.stringify(o.ordner)); if (o.name) fd.append('name_hand', o.name);
  toast(`„${f.name}“ wird gelesen …`);
  let r;
  try { const x = await fetch(`api/lv/${L.id}/buergschaft`, { method: 'POST', body: fd, credentials: 'same-origin' }); r = await jsonAus(x); if (!x.ok) throw new Error(r.error || 'Fehler ' + x.status); }
  catch (e) { toast(e.message, true); return; }
  await openLv(L.id); render();
  const E = { ...(r.erkannt || {}), ...(o.erkannt || {}) }, art = o.art || E.art || 've', S = (L.calc.sicherheit || {});
  const heute = new Date().toISOString().slice(0, 10);
  const was = E.text ? (E.sicher ? 'Angaben aus der Urkunde gelesen – bitte prüfen.' : 'Urkunde gelesen, aber nicht alles sicher erkannt – bitte ergänzen.') : 'Kein lesbarer Text in der Datei – bitte die Angaben eintragen.';
  const bg = modalBox(`<h3>Bürgschaft eintragen</h3><p class="hint" style="margin:0 0 .6rem"><b>${esc(r.name || f.name)}</b>${r.ablage ? ' · im Projektordner: ' + esc(r.ablage) : ''}${E.ablage_fehler ? ` · <span style="color:#e07b3a">nicht im Projektordner abgelegt: ${esc(E.ablage_fehler)}</span>` : ''}<br>${was}${E.ocr ? ' (Texterkennung)' : ''}</p>
    <div class="fm"><label>Sicherheit für</label><select id="bgArt"><option value="ve"${art !== 'ma' ? ' selected' : ''}>Vertragserfüllungssicherheit</option><option value="ma"${art === 'ma' ? ' selected' : ''}>Sicherheit für Mängelansprüche (Gewährleistung)</option></select>
      <label>Höchstbetrag €</label><input id="bgBetrag" value="${E.betrag != null ? nf(E.betrag, 2) : ''}" inputmode="decimal">
      <label>Bürge</label><input id="bgBuerge" value="${esc(E.buerge || '')}" placeholder="Bank / Versicherung">
      <label>Bürgschafts-Nr.</label><input id="bgNr" value="${esc(E.nr || '')}">
      <label>Urkunde vom</label><input type="date" id="bgDatum" value="${esc(E.datum || '')}">
      <label>erhalten am</label><input type="date" id="bgEingang" value="${heute}"></div>
    <p class="hint" id="bgFrei" style="margin:.6rem 0 0"></p>
    <div class="acts"><button class="btn" data-m="x">Verwerfen</button><button class="btn pri" data-m="ok">Eintragen</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') { close(); try { await call('api/buergschaft/' + r.id, 'DELETE'); } catch { /* egal */ } return; }
    if (m !== 'ok') return;
    const k = $('#bgArt').value, betrag = pf($('#bgBetrag').value);
    if (!(betrag > 0)) { toast('Bitte den Höchstbetrag der Bürgschaft eintragen.', true); return; }
    btn.disabled = true;
    try {
      await call('api/lv/' + L.id, 'PUT', { vergabe: { sicherheit: { [k]: { form: 'buergschaft', betrag, buerge: $('#bgBuerge').value.trim(), nr: $('#bgNr').value.trim(), datum: $('#bgDatum').value, eingang: $('#bgEingang').value || heute, dok: r.id } } } });
      close(); toast('Bürgschaft eingetragen.');
      const offen = (L.calc.sicherheit || {}).offen || 0, sp = offen > 0.5 && reSperre('sicherheit');
      if (sp) { bpHinweis(`Noch einbehalten sind ${eur(offen)}. Die Freigabe gegen die Bürgschaft geht, sobald alle Rechnungen geprüft sind – „${reTitel(sp)}“ ist noch in Prüfung. Danach oben „Sicherheit freigeben …“.`); return; }
      if (offen > 0.5 && await bpFrage(`Noch einbehalten sind ${eur(offen)}. Den Einbehalt gegen die Bürgschaft freigeben (Austausch nach § 17 Abs. 3 VOB/B)?\n\nEs wird eine „Freigabe der Sicherheit“ über höchstens ${eur(Math.min(offen, betrag))} angelegt – zur Prüfung wie jede Rechnung.`, { ok: 'Freigabe anlegen' })) reDialog('sicherheit', { betrag, grund: 'austausch' });
    } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  const frei = () => { const k = $('#bgArt').value, offen = S.offen || 0; $('#bgFrei').textContent = offen > 0.5 ? `Noch einbehalten: ${eur(offen)} – nach dem Eintragen kann der Einbehalt gegen die Bürgschaft freigegeben werden.` : k === 've' ? 'In Teil-, Nachtrags- und Regierechnungen wird dann nichts mehr einbehalten.' : 'In der Schlussrechnung wird dann nichts mehr einbehalten.'; };
  bg.addEventListener('change', (e) => { if (e.target.id === 'bgArt') frei(); }); frei();
}
document.addEventListener('change', (e) => { const i = e.target.closest && e.target.closest('[data-bghoch]'); if (i && i.files[0]) { const f = i.files[0], k = i.dataset.bghoch; i.value = ''; buergschaftHoch(f, { art: k }); } });
document.addEventListener('click', async (e) => {
  const w = e.target.closest && e.target.closest('[data-bgweg]');
  if (w) { if (!(await bpFrage('Diese Bürgschaftsurkunde aus der Plattform entfernen? (Eine Kopie im Projektordner bleibt.)', { ok: 'Entfernen', gefahr: true }))) return; try { await call('api/buergschaft/' + w.dataset.bgweg, 'DELETE'); } catch (er) { toast(er.message, true); } return; }
  if (e.target.closest && e.target.closest('[data-act="siFrei"]')) { e.stopPropagation(); const sp = reSperre('sicherheit'); if (sp) { toast(`Erst „${reTitel(sp)}“ abschließen – alle Rechnungen müssen geprüft sein.`, true); return; } reDialog('sicherheit'); }
});
async function siSave(el) {
  const [k, f] = el.dataset.si.split('.'), b = {};
  const v = el.value;
  if (!k) b[f] = f === 'gw_jahre' ? pf(v) : v; else b[k] = { [f]: /betrag|pct/.test(f) ? pf(v) : v };
  try { await call('api/lv/' + L.id, 'PUT', { vergabe: { sicherheit: b } }); } catch (e) { toast(e.message, true); }
}
/* Abnahme in der Schlussrechnung: zeigen und eintragen (Feld der Sicherheiten – Beginn der Verjährung, Fälligkeit der Schlusszahlung) */
const ABN_TIP = 'Ohne Abnahme ist die Schlusszahlung nicht fällig (§ 641 BGB, § 16 Abs. 3 VOB/B) und die Verjährungsfrist für Mängelansprüche beginnt nicht.';
function abnahmeZeile() {
  const ab = (L.calc.sicherheit || {}).abnahme || '';
  return `<div class="re-abn${ab ? '' : ' offen'}"><label title="${esc(ABN_TIP)}">Abnahme erfolgt am<input type="date" data-si=".abnahme" value="${esc(ab)}"></label>
    <span class="hint">${ab ? `Abnahme am ${de(ab)} – gilt auch für die Sicherheiten und die Verjährung.` : '⚠ Abnahme noch nicht eingetragen. ' + esc(ABN_TIP)}</span></div>`;
}
function vRechnungen() {
  if (aufgehoben()) { const h = vRechnungen0(); return aufhBanner() + `<div class="deakt" aria-disabled="true">${h}</div>`; }
  return vRechnungen0();
}
let RETEIL = '', RESUM = '';   // Inhalt der Reiter „Rechnung“ und Summenzeile für „Auftrag“ (Bereich rechts)
function vRechnungen0() {
  RESUM = '';
  if (!vergeben() && !aufgehoben()) return `<div class="card empty"><p>Rechnungen werden mit den Preisen des Auftrags geprüft – bitte erst unter „Angebote & Preisspiegel“ vergeben.</p>
    <p class="hint" style="margin:.8rem 0 .4rem"><b>Ohne LV und Angebot</b> (z. B. kleine Handwerker:in mit Zettelwirtschaft): Firma und Auftragssumme direkt eintragen – Rechnungen werden dann mit dem geprüften Betrag erfasst und freigegeben und stehen in der Kostenkontrolle.</p>
    ${freiFelder()}<div class="bar" style="justify-content:center"><button class="btn pri" data-act="freiVergeben">Auftrag frei eintragen</button></div></div>`;
  const K = L.calc, RC = Object.fromEntries(K.rechnungen.map((r) => [r.id, r]));
  const RS = [...L.rechnungen].sort((a, b) => a.nr - b.nr);
  const SEL = (PJSEL && PJSEL[0] === 'r' && RS.find((r) => 'r' + r.id === PJSEL)) || RS.find((r) => r.status !== 'geprueft') || RS[RS.length - 1];
  const cards = (SEL ? [SEL] : []).map((r) => {
    const c = RC[r.id], g = r.status === 'geprueft', last = !reNachfolger(r), ab = r.data.abzuege || [], art = r.art || 'abschlag';
    const L1 = c.leistung - c.nachlass, dis = g ? ' disabled' : '';
    const belege = `<div class="re-bel" data-redrop="${r.id}">${(r.belege || []).map((b) => `<span class="re-b"><a href="#" data-reb="beleg" data-id="${r.id}" data-bid="${b.id}" title="${esc((b.ablage ? 'Im Projektordner: ' + b.ablage : 'nur in der Plattform gespeichert') + ' – Klick: im Reiter „Dokument“ ansehen und abhaken')}">📄 ${esc(b.name)}</a>${b.ablage ? ' <small class="hint">✓ im Projektordner</small>' : ''}<button class="ib" data-reb="belegdel" data-id="${r.id}" data-bid="${b.id}" title="Entfernen">✕</button></span>`).join('')}<label class="re-bel-ziel${(r.belege || []).length ? ' kl' : ''}" title="Rechnung der Firma als PDF, Scan oder Foto – hierher ziehen oder klicken und auswählen"><span class="i">⤓</span><span>${(r.belege || []).length ? 'weiteres Dokument hierher ziehen oder <u>auswählen</u>' : '<b>Rechnung der Firma hierher ziehen</b> oder <u>auswählen</u> <small>· PDF, Scan oder Foto</small>'}</span><input type="file" accept=".pdf,application/pdf,image/*,.docx" hidden data-rebf="${r.id}"></label>
</div>`;
    const kopf = `<div class="re-wo">${esc(L.vergabe && L.vergabe.bieter || L.auftragnehmer || '')}${L.nr || L.name ? ' · LV ' + esc([L.nr, L.name].filter(Boolean).join(' ')) : ''}</div><h3>${esc(reTitel(r))}${r.re_nr ? ` <span class="hint">Nr. ${esc(r.re_nr)}</span>` : ''}
        <span class="pill ${g ? 'ok' : 'y'}">${g ? 'geprüft ' + de(r.data.geprueft_am) : art === 'regie' || art === 'sicherheit' || c.frei ? 'in Prüfung' : 'in Prüfung – Aufmaß von heute'}</span></h3>
      <div class="g re-kopf"><label title="Rechnungsnummer der Firma">Rechnungsnr.<input data-re="re_nr" data-id="${r.id}" value="${esc(r.re_nr)}"${dis}></label>
        <label title="Rechnungsdatum">Datum<input type="date" data-re="datum" data-id="${r.id}" value="${esc(r.datum)}"${dis}></label>
        <label>Eingang<input type="date" data-re="eingang" data-id="${r.id}" value="${esc(r.eingang)}"${dis}></label>
        ${art === 'sicherheit' ? `<label>freizugebender Betrag netto<input data-re="betrag" data-id="${r.id}" value="${nf(r.data.betrag || 0, 2)}" inputmode="decimal"${dis}></label><label>Grund<select data-re="grund" data-id="${r.id}"${dis}>${[['austausch', 'Austausch gegen Bürgschaft'], ['frist', 'Ablauf der Verjährungsfrist'], ['teil', 'Teilfreigabe']].map(([k, l]) => `<option value="${k}"${(r.data.grund || 'frist') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`
          : `<label title="gefordert ${c.einzeln ? 'netto' : 'kumuliert, netto'}">gefordert<input data-re="gefordert" data-id="${r.id}" value="${r.gefordert ? nf(r.gefordert, 2) : ''}" inputmode="decimal"${dis}></label>
        ${istOA(L.id) ? '' : `<label title="Sicherheitseinbehalt in Prozent">Einb. %<input data-re="einbehalt" data-id="${r.id}" value="${nf(c.einbehalt_pct, 2)}" inputmode="decimal"${dis}></label>`}`}</div>
      ${art === 'schluss' ? abnahmeZeile() : ''}
      ${art !== 'sicherheit' && c.abzug && !istOA(L.id) ? (() => { const A0 = abzAuftrag(), abw = Object.fromEntries(ABZ.map(([k]) => [k, c.abzug[k] !== A0[k]]));
        return `<div class="hint abz-z">Abziehen:${abzChips(c.abzug, 'data-reabz', g, abw)}${!g && Object.values(abw).some(Boolean) ? `<button type="button" class="ib" data-reabz0="${r.id}" title="Wie im Auftrag eingestellt">↺ wie Auftrag</button>` : ''}</div>`; })().replace(/data-reabz="/g, `data-reid2="${r.id}" data-reabz="`) : ''}
      ${art !== 'regie' && art !== 'sicherheit' && !istOA(L.id) ? `<div class="re-art"><span class="hint">Prüfen</span><span class="seg" role="radiogroup" aria-label="Wie wird geprüft?"><button type="button" class="${c.frei ? '' : 'on'}" data-refrei="0" data-id="${r.id}"${dis} title="Aufmaß × Auftrags-EP, kumuliert">nach Aufmaß</button><button type="button" class="${c.frei ? 'on' : ''}" data-refrei="1" data-id="${r.id}"${dis} title="Für Handwerker ohne Aufmaß: geprüften Betrag oder Positionen von Hand eintragen – zählt einzeln (nicht kumuliert)">ohne Aufmaß (Betrag / Positionen)</button></span></div>` : ''}${belege}`;
    const fuss = `<label class="hint" style="display:block;margin-top:.6rem">Bemerkung zur Prüfung<textarea data-re="notiz" data-id="${r.id}" style="min-height:3rem;font:inherit">${esc(r.notiz || '')}</textarea></label>
      <div class="bar" style="margin:.5rem 0 0"><button class="btn sm" data-reb="freigabe" data-id="${r.id}" title="Für den Bauherrn: Freigabe mit Zahlbetrag – dazu wählbar Prüfblatt, Massenermittlung und Rechnung der Firma in einer PDF">🖨 Rechnungsfreigabe / PDF …</button>
        ${g ? (last ? `<button class="btn sm" data-reb="zurueck" data-id="${r.id}">Prüfung zurücknehmen</button>` : '') : `<button class="btn sm pri" data-reb="pruefen" data-id="${r.id}" title="${art === 'regie' || art === 'sicherheit' ? 'Prüfung abschließen' : 'Aufmaßstand festhalten – spätere Aufmaße zählen erst in der nächsten Rechnung'}">✓ Prüfung abschließen</button>`}
        ${last ? `<button class="btn sm danger" data-reb="del" data-id="${r.id}" title="Rechnung in den Papierkorb – mit Rückgängig">🗑 In den Papierkorb</button>` : ''}</div>`;
    if (art === 'sicherheit') {
      return `<div class="card" data-reid="${r.id}">${kopf}<table><tbody>
        <tr><td>noch einbehalten (alle geprüften Rechnungen)</td><td class="r">${eur(K.sicherheit.offen + (g ? c.zahlung : 0))}</td></tr>
        <tr class="s"><td>= Freigabe netto</td><td class="r">${eur(c.zahlung)}</td></tr>
        <tr><td>+ Umsatzsteuer 19 %</td><td class="r">${eur(c.mwst)}</td></tr>
        <tr class="s"><td>= Auszahlung brutto</td><td class="r">${eur(c.brutto)}</td></tr></tbody></table>${fuss}</div>`;
    }
    const zeilen = art === 'regie' ? `<div class="re-zw"><table class="re-z"><thead><tr><th>Stundenlohnarbeiten (Stundenzettel)</th><th class="r">Menge</th><th>Einh.</th><th class="r">Satz €</th><th class="r">Betrag</th><th></th></tr></thead><tbody>
        ${(r.data.zeilen || []).map((z, k) => `<tr><td><input data-re="z-text" data-id="${r.id}" data-k="${k}" value="${esc(z.text || '')}" placeholder="z. B. Facharbeiter 12.10." ${dis}></td>
          <td class="r"><input data-re="z-menge" data-id="${r.id}" data-k="${k}" value="${z.menge != null ? nf(z.menge, 2) : ''}" inputmode="decimal"${dis}></td>
          <td><input data-re="z-einheit" data-id="${r.id}" data-k="${k}" value="${esc(z.einheit || 'h')}"${dis}></td>
          <td class="r"><input data-re="z-ep" data-id="${r.id}" data-k="${k}" value="${z.ep != null ? nf(z.ep, 2) : ''}" inputmode="decimal"${dis}></td>
          <td class="r">${eur((z.menge || 0) * (z.ep || 0))}</td><td>${g ? '' : `<button class="ib" data-reb="zdel" data-id="${r.id}" data-k="${k}">✕</button>`}</td></tr>`).join('')}
        ${g ? '' : `<tr><td colspan="6"><button class="ib" data-reb="zneu" data-id="${r.id}">+ Zeile (Lohn, Gerät, Material laut Stundenzettel)</button></td></tr>`}</tbody></table></div>`
      : c.frei && (r.data.zeilen || []).length ? `<div class="re-zw"><table class="re-z re-z2"><thead><tr><th>Positionen der Rechnung (von Hand)</th><th class="r">Menge</th><th>EH</th><th class="r">EP €</th><th class="r">Betrag</th><th></th></tr></thead><tbody>
        ${(r.data.zeilen || []).map((z, k) => `<tr><td><input data-re="z-text" data-id="${r.id}" data-k="${k}" value="${esc(z.text || '')}" placeholder="Kurztext der Leistung" ${dis}></td>
          <td class="r"><input data-re="z-menge" data-id="${r.id}" data-k="${k}" value="${z.menge != null ? nf(z.menge, 3) : ''}" inputmode="decimal"${dis}></td>
          <td><input data-re="z-einheit" data-id="${r.id}" data-k="${k}" value="${esc(z.einheit || '')}" placeholder="m²"${dis}></td>
          <td class="r"><input data-re="z-ep" data-id="${r.id}" data-k="${k}" value="${z.ep != null ? nf(z.ep, 2) : ''}" inputmode="decimal"${dis}></td>
          <td class="r">${eur((z.menge || 0) * (z.ep || 0))}</td><td style="white-space:nowrap">${z.pos ? `<span class="hint" title="Steht im LV">✓ ${esc(((L.data.items || []).find((y) => y.id === z.pos) || {}).nt || 'im LV')}</span>` : (z.text || '').trim() ? `<button class="ib" data-reb="zlv" data-id="${r.id}" data-k="${k}" title="Ins LV übernehmen (Kostenkontrolle)">→ LV</button>` : ''}${g ? '' : `<button class="ib" data-reb="zdel" data-id="${r.id}" data-k="${k}">✕</button>`}</td></tr>`).join('')}
        <tr><td colspan="6">${g ? '' : `<button class="ib" data-reb="fzneu" data-id="${r.id}">+ Position</button>`}${(r.data.zeilen || []).some((z) => !z.pos && (z.text || '').trim()) ? `<button class="ib" data-reb="zlv" data-id="${r.id}" title="Alle noch nicht übernommenen Positionen ins LV – für die Kostenkontrolle">→ alle ins LV</button>` : ''}</td></tr></tbody></table></div>` : '';
    return `<div class="card" data-reid="${r.id}">${kopf}${zeilen}
      <table><tbody>
        ${c.frei && (r.data.zeilen || []).length ? `<tr><td>Summe der Positionen netto (ohne Aufmaß)</td><td class="r">${eur(c.leistung)}</td></tr>`
          : c.frei ? `<tr><td>geprüfter Betrag netto (ohne Aufmaß)${g ? '' : ` <button class="ib" data-reb="fzneu" data-id="${r.id}" title="Statt eines Betrags die Positionen der Rechnung einzeln eintragen">+ Positionen von Hand</button>`}</td><td class="r"><input data-re="frei" data-id="${r.id}" value="${nf(r.data.frei || 0, 2)}" inputmode="decimal" style="width:9rem;text-align:right"${dis}></td></tr>`
          : `<tr><td>${art === 'regie' ? 'Summe Stundenlohnarbeiten' : art === 'nachtrag' ? 'Leistungsstand Nachträge (Aufmaß × Nachtrags-EP)' : 'Leistungsstand netto (Aufmaß × Auftrags-EP)'}</td><td class="r">${eur(c.leistung)}</td></tr>`}
        ${c.nachlass ? `<tr><td>– Nachlass ${nlText(L.vergabe)}</td><td class="r">${eur(-c.nachlass)}</td></tr>` : c.abzug && !c.abzug.nachlass && (L.vergabe.nachlass || L.vergabe.nachlass_eur) ? '<tr class="aus"><td>Nachlass – bei dieser Rechnung nicht abgezogen</td><td class="r">–</td></tr>' : ''}
        ${ab.map((z, k) => `<tr><td><div class="abz"><span>–</span><input data-re="abz-text" data-id="${r.id}" data-k="${k}" value="${esc(z.text || '')}" placeholder="z. B. Bauwasser/Strom" style="flex:1"${dis}>
          <input data-re="abz-pct" data-id="${r.id}" data-k="${k}" value="${z.pct != null ? nf(z.pct, 2) : ''}" placeholder="%" style="width:4rem;flex:0 1 4rem" inputmode="decimal"${dis}>
          <input data-re="abz-betrag" data-id="${r.id}" data-k="${k}" value="${z.betrag != null ? nf(z.betrag, 2) : ''}" placeholder="oder €" style="width:6rem;flex:0 1 6rem" inputmode="decimal"${dis}>${g ? '' : `<button class="ib" data-reb="abzdel" data-id="${r.id}" data-k="${k}">✕</button>`}</div></td>
          <td class="r">${eur(-(z.pct != null ? L1 * z.pct / 100 : (z.betrag || 0)))}</td></tr>`).join('')}
        ${g ? '' : `<tr><td colspan="2"><button class="ib" data-reb="abzneu" data-id="${r.id}">+ Abzug (Umlage Bauwasser/Strom, Bauleistungsversicherung, Schadensersatz …)</button></td></tr>`}
        ${istOA(L.id) ? '' : c.abzug && !c.abzug.einbehalt ? `<tr class="aus"><td>${art === 'schluss' ? 'Sicherheit für Mängelansprüche' : 'Sicherheitseinbehalt'} – bei dieser Rechnung nicht einbehalten</td><td class="r">–</td></tr>` : (() => { const SK = (L.calc.sicherheit || {}), soll = art === 'schluss' ? SK.pct_schluss : SK.pct_abschlag, abw = r.data.einbehalt != null && soll != null && Math.abs((r.data.einbehalt || 0) - soll) > 0.004;
          return `<tr><td>– ${art === 'schluss' ? 'Sicherheit für Mängelansprüche' : 'Sicherheitseinbehalt (Vertragserfüllung)'} ${nf(c.einbehalt_pct, 2)} %${abw ? ` <span class="hint" style="color:#e07b3a">bei dieser Rechnung fest eingetragen – Auftrag: ${nf(soll, 2)} %</span>${g ? '' : ` <button type="button" class="ib" data-reb="ebAuftrag" data-id="${r.id}" title="Satz dieser Rechnung löschen – es gilt wieder die Sicherheit des Auftrags">wie Auftrag</button>`}` : ''}</td><td class="r">${eur(-c.einbehalt)}</td></tr>`; })()}
        <tr class="s"><td>= anerkannt${c.einzeln ? '' : ' (kumuliert)'}</td><td class="r">${eur(c.anerkannt)}</td></tr>
        ${c.einzeln ? '' : c.abzug && !c.abzug.vorher ? '<tr class="aus"><td>bisher anerkannt – bei dieser Rechnung nicht abgezogen (Achtung: Doppelzahlung bei kumulierten Rechnungen)</td><td class="r">–</td></tr>' : `<tr><td>– bisher anerkannt${art === 'nachtrag' ? ' (Nachtragsrechnungen)' : ''}</td><td class="r">${eur(-c.vorher)}</td></tr>`}
        ${c.hand ? `<tr class="mute"><td>rechnerisch ${c.frei ? '' : 'nach Aufmaß'}</td><td class="r"><s>${eur(c.hand.rechnerisch)}</s></td></tr>
        <tr class="s re-hand"><td>= Zahlbetrag netto <span class="re-hand-t">von Hand festgesetzt</span>${g ? '' : ` <button type="button" class="ib" data-rehand0="${r.id}" title="Wieder den rechnerischen Betrag freigeben">✕ wieder rechnerisch</button>`}
          <label class="re-hand-g">Grund: <input data-rehand="grund" data-id="${r.id}" value="${esc(c.hand.grund)}" placeholder="Pflicht: warum weicht der Betrag ab?"${dis}></label></td>
          <td class="r"><input data-rehand="betrag" data-id="${r.id}" value="${nf(c.zahlung, 2)}" inputmode="decimal" style="width:8.5rem;text-align:right"${dis}><div class="re-hand-a">Abweichung ${eur(c.hand.abweichung)}</div></td></tr>`
        : `<tr class="s"><td>= Zahlbetrag netto${g ? '' : ` <button type="button" class="ib" data-rehand1="${r.id}" title="Einen anderen Betrag freigeben als das Aufmaß ergibt – mit Grund, deutlich vermerkt">✎ Betrag von Hand</button>`}</td><td class="r">${eur(c.zahlung)}</td></tr>`}
        <tr><td>+ Umsatzsteuer 19 %</td><td class="r">${eur(c.mwst)}</td></tr>
        <tr class="s"><td>= Zahlbetrag brutto</td><td class="r">${eur(c.brutto)}</td></tr>
        ${c.skonto ? `<tr><td>– Skonto ${nf(c.skonto_pct, 2)} %${c.skonto_bis ? ` bei Zahlung bis <b>${de(c.skonto_bis)}</b>` : ''}</td><td class="r">${eur(-c.skonto)}</td></tr>
          <tr class="s"><td>= Zahlbetrag mit Skonto</td><td class="r">${eur(c.brutto_skonto)}</td></tr>` : ''}
        ${r.gefordert ? `<tr><td>gefordert ${eur(r.gefordert)} · Differenz zum geprüften Leistungsstand</td><td class="r" style="color:${c.differenz > 0.5 ? 'var(--red)' : 'inherit'}">${eur(c.differenz)}</td></tr>` : ''}
      </tbody></table>${reSkonto(r, c)}${fuss}</div>`;
  }).join('');
  RESUM = `<p class="hint" style="margin:0 0 .5rem">Auftrag ${eur(K.auftrag)}${K.nachtraege.beauftragt ? ` + Nachträge ${eur(K.nachtraege.beauftragt)}` : ''} · Leistungsstand ${eur(K.leistung)} · anerkannt ${eur(K.abgerechnet)} · einbehalten ${eur((K.sicherheit || {}).offen || 0)}</p>`;
  return `<div class="re">${cards || abzLeer()}</div>`;   // links der Baum (Projekt → LV → Rechnung), rechts (seite.js) die Reiter „Rechnung“, „Auftrag“ und „📄 Dokument“
}
/* Eigene Felder der Druck-Layouts (Verwaltung → Einstellungen → Druck-Layouts): vor dem Ausdruck abfragen, was „bei jedem Ausdruck“ gilt
   oder für das Projekt noch fehlt. Ergebnis: '' (nichts zu fragen) bzw. '&lw=…' – null = abgebrochen. */
async function druckfelder(bereich, _x) {
  let F = [];
  try { F = await api(`api/lv/${L.id}/druckfelder?bereich=${bereich}`); } catch { return ''; }
  const frag = F.filter((x) => x.fehlt);
  if (!frag.length) return '';
  return new Promise((fertig) => {
    modalBox(`<h2 style="margin-top:0">Angaben für den Ausdruck</h2>
      <div style="display:grid;gap:.7rem;min-width:min(420px,80vw)">${frag.map((x) => `<label style="display:flex;flex-direction:column;gap:.2rem;font-weight:600">${esc(x.name)}
        <input data-df="${esc(x.key)}" value="${esc(x.wert || '')}" autocomplete="off" style="width:100%;box-sizing:border-box;font-weight:400">
        <small class="hint">${x.quelle === 'projekt' ? 'wird für dieses Projekt gemerkt – später änderbar in der Verwaltung beim Projekt' : 'wird bei jedem Ausdruck abgefragt'}${x.hilfe ? ' · ' + esc(x.hilfe) : ''}</small></label>`).join('')}</div>
      <div class="bar" style="justify-content:flex-end;margin-top:1rem"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Weiter zum Ausdruck</button></div>`, async (m, bg, close) => {
      if (m === 'x') { close(); fertig(null); return; }
      if (m !== 'ok') return;
      const werte = Object.fromEntries([...bg.querySelectorAll('[data-df]')].map((i) => [i.dataset.df, i.value.trim()]));
      try { await api(`api/lv/${L.id}/druckfelder`, 'POST', { bereich, werte }); } catch (e) { toast(e.message, true); }
      close();
      const lw = Object.fromEntries(frag.filter((x) => x.quelle === 'ausdruck').map((x) => [x.key, werte[x.key] || '']));
      fertig(Object.keys(lw).length ? '&lw=' + encodeURIComponent(JSON.stringify(lw)) : '');
    });
    setTimeout(() => { const i = document.querySelector('[data-df]'); if (i) i.focus(); }, 50);
  });
}
async function pdfZeigen(bereich, url, name) {   // mit Druck-Layout: derselbe Druckdialog wie beim PDF-Paket (Layout, Einstellungen, Vorschau)
  if (bereich) return paketDruck({ titel: name.replace(/\.pdf$/, '') + ' drucken', bereich, merk: 'pk.' + bereich, name, teile: [], url: () => url });
  if (window.BPHead && BPHead.ansehen) BPHead.ansehen([{ url, typ: 'pdf', name }]); else location.href = url;
}
/* Skonto je Rechnung (leer = wie im Auftrag) und „bezahlt am“ – danach keine Erinnerung mehr */
function reSkonto(r, c) {
  const V = L.vergabe || {}, rest = c.skonto_bis && !c.bezahlt ? Math.round((new Date(c.skonto_bis) - new Date(new Date().toISOString().slice(0, 10))) / 864e5) : null;
  return `<div class="g re-sk" style="margin-top:.5rem">
    <label title="Leer: wie im Auftrag (${nf(V.skonto || 0, 2)} %)">Skonto %<input data-re="skonto" data-id="${r.id}" value="${r.data.skonto != null ? nf(r.data.skonto, 2) : ''}" placeholder="${nf(V.skonto || 0, 2)}" inputmode="decimal"></label>
    <label title="Frist ab Rechnungseingang. Leer: wie im Auftrag (${V.skonto_tage || 0} ${{ kt: 'Kalendertage', wt: 'Werktage', at: 'Arbeitstage', wo: 'Wochen' }[V.skonto_art || 'kt']})">Skontofrist (${{ kt: 'Tage', wt: 'Werktage', at: 'Arbeitstage', wo: 'Wochen' }[V.skonto_art || 'kt']})<input data-re="skonto_tage" data-id="${r.id}" value="${r.data.skonto_tage != null ? r.data.skonto_tage : ''}" placeholder="${V.skonto_tage || ''}" inputmode="numeric"></label>
    <label>bezahlt am<input type="date" data-re="bezahlt" data-id="${r.id}" value="${esc(r.data.bezahlt || '')}"></label>
    <span class="hint" style="align-self:end;padding-bottom:.45rem">${c.skonto && !r.eingang ? '⚠ Eingangsdatum fehlt – ohne Eingang keine Skontofrist' : c.bezahlt ? '✓ bezahlt' : rest == null ? '' : rest < 0 ? `Skontofrist abgelaufen am ${de(c.skonto_bis)}` : `<b style="color:${rest <= 3 ? 'var(--red)' : 'inherit'}">Skonto noch ${rest === 0 ? 'heute' : rest + ' Tag' + (rest === 1 ? '' : 'e')}</b> (bis ${de(c.skonto_bis)})`}</span></div>`;
}
/* Auftrag ohne LV / Angebot („Zettelwirtschaft“) */
function freiFelder() {
  return `<div class="fm" style="max-width:34rem;margin:0 auto .6rem;text-align:left"><label for="frFirma">Firma</label><input id="frFirma" data-vs="firma" autocomplete="off" placeholder="aus den Adressen oder frei">
    <label for="frSumme">Auftragssumme netto</label><input id="frSumme" inputmode="decimal" placeholder="optional – sonst zählt, was abgerechnet wird">
    <label for="frEb">Einbehalt %</label><input id="frEb" inputmode="decimal" value="0" style="max-width:6rem"></div>`;
}
async function freiVergeben(lvId, root = document) {
  const q = (id) => root.querySelector('#' + id);
  const bieter = (q('frFirma') || {}).value?.trim(); if (!bieter) { toast('Bitte die Firma angeben.', true); return false; }
  const k = (KONT || []).find((x) => x.name === bieter);
  const body = { frei: true, bieter, contact_id: k ? k.id : null, summe: pf(q('frSumme').value) || 0, einbehalt: pf(q('frEb').value) ?? 0 };
  if (L && L.id === lvId) await call(`api/lv/${lvId}/vergabe`, 'POST', body); else await api(`api/lv/${lvId}/vergabe`, 'POST', body);
  return true;
}
/* Neuer Auftrag: mit Häkchen „ohne Angebot und LV“ nur Firma und Summe; ohne Häkchen ein vorhandenes LV (mit Angebot) wählen
   oder ein neues LV anlegen, das gleich an die Firma vergeben ist – die Positionen kommen danach dazu */
async function auftragDialog() {
  if (!pid) { toast('Bitte zuerst oben ein Projekt wählen.', true); return; }
  const frei = LIST.filter((x) => !x.archived && !x.vergeben && !x.frei && !x.aufgehoben);
  const n = String(LIST.length + 1).padStart(2, '0');
  const bg = modalBox(`<h3>Neuer Auftrag</h3>
    <label class="au-ohne" style="display:flex;gap:.55rem;align-items:center;margin:0 0 .8rem;font-weight:600;cursor:pointer"><input type="checkbox" id="auOhne" style="width:1.15rem;height:1.15rem"> ohne Angebot und LV
      <small class="hint" style="font-weight:400">– nur Firma und Summe, z. B. kleine Handwerker:in</small></label>
    <div id="auLvBox" style="margin:0 0 .8rem">
      <label class="hint" style="display:grid;gap:.25rem">LV<select id="auLv">${frei.map((x) => `<option value="${x.id}">${esc([x.nr, x.name].filter(Boolean).join(' '))}${x.n_angebote ? ` · ${x.n_angebote} Angebot${x.n_angebote === 1 ? '' : 'e'}` : ''}${x.status === 'nicht_vergeben' ? ' · nicht vergeben' : ''}</option>`).join('')}<option value="neu">＋ neues LV anlegen</option></select></label>
      <label class="hint" id="auAngL" style="display:grid;gap:.25rem;margin-top:.5rem">Angebot<select id="auAng"></select></label></div>
    <div class="nlf" id="auKopf"><label>Bezeichnung<input id="auName" placeholder="z. B. Metallbau Geländer, Gebäudereinigung"></label>
      <label>Gewerk<input id="auGw" data-vs="gewerk" autocomplete="off" placeholder="optional"></label><label>Nr.<input id="auNr" value="${n}"></label></div>
    <div class="fm" id="auFelder" style="text-align:left">
      <label for="auFirma" data-au="firma">Firma</label><input id="auFirma" data-vs="firma" autocomplete="off" placeholder="aus den Adressen oder frei" data-au="firma">
      <label for="auSumme" data-au="summe">Auftragssumme netto</label><input id="auSumme" inputmode="decimal" placeholder="optional – sonst zählt, was abgerechnet wird" data-au="summe">
      <label for="auDatum">Auftrag vom</label><input id="auDatum" type="date" value="${new Date().toISOString().slice(0, 10)}">
      <label for="auEb">Sicherheitseinbehalt %</label><input id="auEb" inputmode="decimal" value="0" style="max-width:6rem">
      <label for="auSk" data-au="skonto">Skonto %</label><span data-au="skonto" style="display:flex;gap:.4rem;align-items:center"><input id="auSk" inputmode="decimal" placeholder="%" style="max-width:5rem"> in <input id="auSkT" inputmode="numeric" placeholder="z. B. 14" style="max-width:5rem" title="Kalendertage – die Frist läuft ab Eingang der prüfbaren Rechnung"> Kalendertagen ab Eingang der prüfbaren Rechnung</span></div>
    <p class="hint" id="auHinweis" style="margin:.6rem 0 0"></p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Auftrag anlegen</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const q = (id) => bg.querySelector('#' + id);
    const ohne = q('auOhne').checked, lvW = ohne ? 'neu' : q('auLv').value, angW = q('auAng').value;
    const mitAngebot = !ohne && lvW !== 'neu' && angW && angW !== 'frei';
    const firma = q('auFirma').value.trim();
    if (!mitAngebot && !firma) { toast('Bitte die Firma angeben.', true); return; }
    const name = q('auName').value.trim() || (lvW === 'neu' ? firma : '');
    if (lvW === 'neu' && !name) { toast('Bitte eine Bezeichnung eingeben.', true); return; }
    btn.disabled = true;
    try {
      let id;
      if (lvW === 'neu') {
        const r = await api('api/lv', 'POST', { project_id: pid, name, gewerk: q('auGw').value.trim(), nr: q('auNr').value.trim(), ...(vSicht() ? { version_id: vSicht() } : {}) });
        id = r.id;
      } else id = +lvW;
      const k = (KONT || []).find((x) => x.name === firma);
      if (mitAngebot) await api(`api/lv/${id}/vergabe`, 'POST', { angebot_id: +angW, datum: q('auDatum').value, einbehalt: pf(q('auEb').value) ?? 0 });
      else await api(`api/lv/${id}/vergabe`, 'POST', { frei: true, ohne_lv: ohne, bieter: firma, contact_id: k ? k.id : null, summe: pf(q('auSumme').value) || 0,
        datum: q('auDatum').value, einbehalt: pf(q('auEb').value) ?? 0, skonto: pf(q('auSk').value) || 0, skonto_tage: pf(q('auSkT').value) || 0 });
      close();
      L = await api('api/lv/' + id); LS.set('lv:' + pid, id);
      tab = !ohne && lvW === 'neu' ? 'lv' : 'rechnungen'; LS.set('tab', tab);
      await refreshList(); render();
      toast(!ohne && lvW === 'neu' ? 'Auftrag angelegt – jetzt die Positionen eintragen oder aus einer Datei holen.' : 'Auftrag angelegt – Rechnungen über „＋ Neue Rechnung“ erfassen.');
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  });
  const q = (id) => bg.querySelector('#' + id);
  const zeig = (el, an) => { if (el.dataset.d === undefined) el.dataset.d = el.style.display || ''; el.style.display = an ? el.dataset.d : 'none'; };   // hidden wirkt nicht gegen display aus CSS
  const draw = () => {
    const ohne = q('auOhne').checked, lvW = q('auLv').value;
    zeig(q('auLvBox'), !ohne);
    const neu = ohne || lvW === 'neu';
    zeig(q('auKopf'), neu);
    let angebote = [];
    if (!neu) { const x = LIST.find((y) => y.id === +lvW); angebote = x ? [...x.angebote].sort((a, b) => (a.rang || 99) - (b.rang || 99)) : []; }
    zeig(q('auAngL'), !neu);
    if (!neu) {
      const alt = q('auAng').value;
      q('auAng').innerHTML = angebote.map((a) => `<option value="${a.id}">${a.rang ? a.rang + '. ' : ''}${esc(a.bieter)}${a.netto ? ' · ' + eur(a.netto) : ''}</option>`).join('') + '<option value="frei">ohne Angebot – Firma und Summe eintragen</option>';
      if (alt && [...q('auAng').options].some((o) => o.value === alt)) q('auAng').value = alt;
    }
    const mitAngebot = !neu && q('auAng').value !== 'frei';
    bg.querySelectorAll('[data-au]').forEach((el) => zeig(el, !(mitAngebot && ['firma', 'summe', 'skonto'].includes(el.dataset.au))));
    q('auHinweis').textContent = ohne ? 'Rechnungen werden mit dem geprüften Betrag erfasst. Positionen lassen sich später trotzdem ergänzen, z. B. aus der ersten Rechnung der Firma.'
      : lvW === 'neu' ? 'Das LV wird angelegt und ist gleich an die Firma vergeben. Danach die Positionen eintragen – von Hand, aus einer Datei (PDF, Excel, GAEB) oder aus der ersten Rechnung.'
        : mitAngebot ? 'Firma, Preise, Nachlass und Skonto kommen aus dem gewählten Angebot – wie unter „Angebote & Preisspiegel“ → vergeben.'
          : 'Das LV wird ohne Angebot an die Firma vergeben – mit der eingetragenen Summe.';
  };
  bg.addEventListener('change', (e) => { if (['auOhne', 'auLv', 'auAng'].includes(e.target.id)) draw(); });
  if (!frei.length) q('auLv').value = 'neu';
  draw();
  bg.querySelector('.modal').classList.add('wide');
  q('auFirma').focus();
}
/* Ausgeschrieben, aber nicht beauftragt */
function nichtVergebenDialog() {
  modalBox(`<h3>Nicht vergeben</h3><p class="hint" style="margin:0 0 .7rem">LV ${esc([L.nr, L.name].filter(Boolean).join(' '))} wird nicht beauftragt. Es zählt dann nicht mehr für Budget, Prognose und To-dos.
    Angebote und Preisspiegel bleiben erhalten – für spätere Preisvergleiche. Zurücknehmen geht jederzeit.</p>
    <div class="fm" style="text-align:left"><label for="nvGrund">Grund</label><select id="nvGrund">${NICHT_GRUENDE.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select>
    <label for="nvNotiz">Notiz</label><input id="nvNotiz" placeholder="optional, z. B. „in Rohbau enthalten“"></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Als nicht vergeben markieren</button></div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    try { await call(`api/lv/${L.id}/vergabe`, 'POST', { nicht: true, grund: bg.querySelector('#nvGrund').value, notiz: bg.querySelector('#nvNotiz').value.trim() }); close(); await refreshList(); toast('Als „nicht vergeben“ markiert.'); } catch (e) { toast(e.message, true); }
  });
}
/* Welche offene Rechnung hält eine neue dieser Art auf? Nur die eigene kumulierte Kette (Teil-/Schluss- bzw. Nachtragsrechnungen);
   Regierechnungen und Rechnungen ohne Aufmaß zählen einzeln, die Freigabe der Sicherheit braucht alle geprüft – wie auf dem Server */
function reSperre(art) {
  const RC = Object.fromEntries((L.calc.rechnungen || []).map((x) => [x.id, x]));
  return L.rechnungen.find((o) => { if (o.status === 'geprueft') return false;
    if (art === 'sicherheit') return true;
    const einzeln = o.art === 'regie' || o.art === 'sicherheit' || (RC[o.id] || {}).frei;
    return !einzeln && ['abschlag', 'schluss', 'nachtrag'].includes(art) && (o.art === 'nachtrag') === (art === 'nachtrag'); });
}
const istOA = (lvId) => !!(LIST.find((y) => y.id === lvId) || {}).ohne_auftrag;   // Sammel-Auftrag „ohne LV / Auftrag“ einer Firma
const OA_ITEM = { value: 'ohneauftrag', title: '📄 Rechnung ohne LV / Auftrag', sub: 'z. B. Gebühren, Gutachten, Kleinmaterial, Handwerker:in ohne Auftrag – geht auch, wenn kein LV gewählt ist' };
function reNeuMenu(anchor) {
  if (!L || !vergeben() || istOA(L.id)) { pickMenu(anchor, { items: [OA_ITEM], onPick: () => oaDialog() }); return; }
  const schluss = L.rechnungen.some((r) => r.art === 'schluss');
  const it = [['abschlag', 'Teilrechnung', 'kumuliert über das Aufmaß', schluss], ['schluss', 'Schlussrechnung', 'kumuliert über das Aufmaß, danach keine Teilrechnung mehr', schluss],
    ['regie', 'Regierechnung', 'Stundenlohnarbeiten nach Stundenzetteln', false],
    ['sicherheit', 'Freigabe der Sicherheit', `noch einbehalten ${eur((L.calc.sicherheit || {}).offen || 0)}`, false],
    ['nachtrag', 'Nachtragsrechnung (selten)', 'nur wenn die Firma Nachträge getrennt abrechnet – sonst stecken sie in der Teilrechnung', schluss]];
  pickMenu(anchor, { items: [...it.map(([v, t, sub, dis]) => { const sp = !dis && reSperre(v); return { value: dis ? '' : v, title: t, sub: dis ? 'nach der Schlussrechnung nicht mehr' : sp ? `erst „${reTitel(sp)}“ abschließen – wird gefragt` : sub }; }), OA_ITEM],
    onPick: (v) => (v === 'ohneauftrag' ? oaDialog() : reNeuStart(v, anchor)) });
}
const RE_ARTEN_NEU = [['abschlag', 'Teilrechnung'], ['schluss', 'Schlussrechnung'], ['regie', 'Regierechnung'], ['sicherheit', 'Freigabe der Sicherheit'], ['nachtrag', 'Nachtragsrechnung']];
/* Neue Rechnung einer Art anlegen (aus dem Menü „＋ Neue Rechnung“ oder dem Kontextmenü im Baum): offene Rechnung derselben Kette erst abschließen */
async function reNeuStart(v, anchor) {
      if (!v || !L) return;
      if (v !== 'regie' && v !== 'sicherheit' && L.rechnungen.some((r) => r.art === 'schluss')) { toast('Nach der Schlussrechnung gibt es keine Teil-, Schluss- oder Nachtragsrechnung mehr.', true); return; }
      const sp = reSperre(v);
      if (sp) {   // kumuliert: erst die offene Rechnung derselben Kette abschließen – fragen, ob das jetzt passieren soll
        const c = (L.calc.rechnungen || []).find((x) => x.id === sp.id) || {};
        const ja = await bpFrage(`„${reTitel(sp)}“ ist noch in Prüfung.\nEine neue ${v === 'sicherheit' ? 'Freigabe der Sicherheit' : 'Rechnung dieser Art'} geht erst, wenn sie abgeschlossen ist – sonst würde doppelt abgerechnet. Anerkannt sind zurzeit ${eur(c.anerkannt || 0)}, Zahlbetrag ${eur(c.zahlung || 0)} netto.`, { ok: 'Prüfung abschließen, dann weiter', abbrechen: 'Abbrechen', drei: `${reTitel(sp)} öffnen` });
        if (ja === 'drei') { PJSEL = 'r' + sp.id; tab = 'rechnungen'; LS.set('tab', tab); render(); return; }
        if (!ja) return;
        try { await call('api/rechnungen/' + sp.id, 'PUT', { status: 'geprueft' }); toast(`${reTitel(sp)}: Prüfung abgeschlossen – der Aufmaßstand ist festgehalten.`); }
        catch (e) { toast(e.message, true); return; }
        if (reSperre(v)) return anchor ? reNeuMenu(anchor) : reNeuStart(v, anchor);   // noch eine offen (z. B. bei der Sicherheit)
      }
      reDialog(v);
}
/* Rechnung ohne LV / Auftrag: je Firma (und Kostengruppe) ein Sammel-Auftrag ohne LV – im Baum ganz oben unter „Ohne LV / Auftrag“.
   Geprüft wird wie „ohne Aufmaß“ (Betrag oder Positionen von Hand), ohne Einbehalt, jede Rechnung für sich. */
let KGN = null;
async function oaDialog() {
  if (!pid) { toast('Bitte zuerst oben ein Projekt wählen.', true); return; }
  if (!KONT) KONT = await api('api/kontakte').catch(() => []);
  if (!KGN) KGN = await api('api/kg_namen').catch(() => ({}));
  const heute = new Date().toISOString().slice(0, 10), vorFirma = L && istOA(L.id) ? (LIST.find((y) => y.id === L.id) || {}).auftragnehmer || '' : '';
  const vorKg = L && istOA(L.id) ? (LIST.find((y) => y.id === L.id) || {}).kg || '' : '';
  const bg = modalBox(`<h3>Rechnung ohne LV / Auftrag</h3>
    <datalist id="oaKg">${Object.entries(KGN || {}).map(([k, n]) => `<option value="${k} ${esc(n)}"></option>`).join('')}</datalist>
    <div class="fm">
      <label for="oaFirma">Firma</label><input id="oaFirma" data-vs="firma" autocomplete="off" value="${esc(vorFirma)}" placeholder="aus den Adressen oder neu">
      <label for="oaF">Rechnung (PDF)</label><input type="file" id="oaF" accept="application/pdf,.pdf,image/*">
      <label for="oaNr">Rechnungsnr.</label><input id="oaNr">
      <label for="oaD">Rechnungsdatum</label><input type="date" id="oaD">
      <label for="oaE">Eingang</label><input type="date" id="oaE" value="${heute}">
      <label for="oaB">Betrag netto</label><input id="oaB" inputmode="decimal" placeholder="0,00" style="text-align:right">
      <label for="oaKgI">Kostengruppe</label><input id="oaKgI" list="oaKg" value="${vorKg ? esc(vorKg + ' ' + ((KGN || {})[vorKg] || '')) : ''}" placeholder="z. B. 440 – für die Kostenkontrolle">
      <label for="oaW">Wofür</label><input id="oaW" placeholder="z. B. Baustromverteiler Miete Okt.">
    </div>
    <p class="hint">Geprüft wird wie „ohne Aufmaß“: Betrag oder Positionen von Hand, Abzüge, Skonto, Rechnungsfreigabe-PDF – ohne Einbehalt und ohne „bisher anerkannt“. Zählt in der Kostenkontrolle unter der Kostengruppe.</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Anlegen</button></div>`, async (m, bg2, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const q = (id) => bg2.querySelector('#' + id), firma = q('oaFirma').value.trim(), kg = (/^\s*(\d{3})/.exec(q('oaKgI').value) || [])[1] || '';
    if (!firma) { toast('Bitte die Firma angeben.', true); q('oaFirma').focus(); return; }
    btn.disabled = true;
    try {
      let x = LIST.find((y) => y.ohne_auftrag && !y.archived && (y.auftragnehmer || '').toLowerCase() === firma.toLowerCase() && (y.kg || '') === kg), id;
      if (x) id = x.id;
      else {
        const k = (KONT || []).find((y) => y.name === firma);
        id = (await api('api/lv', 'POST', { project_id: pid, name: firma + (kg ? ' · KG ' + kg : ''), nr: '', ...(vSicht() ? { version_id: vSicht() } : {}) })).id;
        await api(`api/lv/${id}/vergabe`, 'POST', { frei: true, ohne_lv: true, ohne_auftrag: true, bieter: firma, contact_id: k ? k.id : null, summe: 0, einbehalt: 0 });
        if (kg) await api(`api/lv/${id}/daten`, 'PUT', { lv: { kg } });
      }
      let d = await api(`api/lv/${id}/rechnungen`, 'POST', { art: 'abschlag', frei: pf(q('oaB').value) || 0, re_nr: q('oaNr').value.trim(), datum: q('oaD').value, eingang: q('oaE').value || heute });
      const neu = [...(d.rechnungen || [])].sort((a, b) => b.id - a.id)[0];
      if (neu && q('oaW').value.trim()) d = await api('api/rechnungen/' + neu.id, 'PUT', { notiz: q('oaW').value.trim() });
      const f = q('oaF').files[0]; close();
      LIST = await lvListe(); L = await api('api/lv/' + id); LS.set('lv:' + pid, id);
      if (!['aufmass', 'rechnungen'].includes(tab)) { tab = 'rechnungen'; LS.set('tab', tab); }
      OAZU = false; PJX.clear(); PJX.add(id); if (neu) PJSEL = 'r' + neu.id; render();
      toast(`${firma}: ${neu ? reTitel(neu, id) : 'Rechnung'} angelegt.`);
      if (f && neu) await reBelegHoch(neu.id, f);
    } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  bg.querySelector('.modal').classList.add('breit');
  { const i = bg.querySelector(vorFirma ? '#oaNr' : '#oaFirma'); if (i) i.focus(); }
}
function reDialog(art = 'abschlag', vorgabe = null) {
  const n = L.rechnungen.length + 1, offen = (L.calc.sicherheit || {}).offen || 0;
  const bgR = modalBox(`<h3>${art === 'abschlag' ? n + '. Teilrechnung' : RE_NAME[art]} erfassen</h3><div class="fm">
      <label>Rechnung (PDF)</label><input type="file" id="reF" accept="application/pdf,.pdf">
      <label>Rechnungsnr.</label><input id="reNr">
      <label>Rechnungsdatum</label><input type="date" id="reD">
      <label>Eingang</label><input type="date" id="reE" value="${new Date().toISOString().slice(0, 10)}">
      ${art === 'schluss' ? `<label title="${esc(ABN_TIP)}">Abnahme erfolgt am</label><input type="date" id="reAb" value="${esc((L.calc.sicherheit || {}).abnahme || '')}">` : ''}
      ${art === 'sicherheit' ? `<label>Freigegeben wird</label><select id="reWas" disabled title="ergibt sich aus dem Stand der Sicherheit: solange etwas einbehalten ist, wird der Einbehalt freigegeben"><option value="einbehalt"${offen > 0.5 ? ' selected' : ''}>Sicherheitseinbehalt – noch einbehalten ${eur(offen)}</option><option value="frei"${offen > 0.5 ? '' : ' selected'}>freier Betrag</option></select>
      <label>Freigabe netto</label><input id="reB" value="${nf(vorgabe && vorgabe.betrag != null ? Math.min(offen, vorgabe.betrag) : offen, 2)}" inputmode="decimal">
      <label>Grund</label><select id="reGr"><option value="austausch"${vorgabe && vorgabe.grund === 'austausch' ? ' selected' : ''}>Austausch gegen Bürgschaft (§ 17 Abs. 3 VOB/B)</option><option value="frist"${!vorgabe || vorgabe.grund !== 'austausch' ? ' selected' : ''}>Ablauf der Verjährungsfrist für Mängelansprüche</option><option value="teil">Teilfreigabe (z. B. nach Teilabnahme)</option></select>` : `<label>gefordert netto</label><input id="reG" placeholder="${art === 'regie' ? 'Betrag laut Rechnung' : 'kumulierter Betrag laut Rechnung'}" inputmode="decimal">`}</div>
    <p class="hint">${art === 'regie' ? 'Die Stundenzettel danach als Zeilen eintragen.' : art === 'sicherheit' ? 'Austausch: der einbehaltene Betrag wird gegen die vorgelegte Bürgschaft ausgezahlt. Frist: Freigabe nach Ablauf der Verjährungsfrist für Mängelansprüche (Begehung vorher).' : 'Geprüft wird mit dem Aufmaß unter „Aufmaß“ – bitte dort die Mengen der Firma prüfen und eintragen.'} Die PDF wird im Projektordner unter „Rechnungsprüfung / Firma“ abgelegt.</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Anlegen</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    if (art === 'schluss') {   // Abnahme abfragen: Datum eintragen oder bewusst ohne Abnahme anlegen
      const ab = $('#reAb').value, alt = (L.calc.sicherheit || {}).abnahme || '';
      if (!ab && !(await bpFrage('Ist die Abnahme erfolgt?\n' + ABN_TIP, { ok: 'Noch nicht – trotzdem anlegen', abbrechen: 'Datum eintragen' }))) { $('#reAb').focus(); return; }
      if (ab && ab !== alt) { try { await call('api/lv/' + L.id, 'PUT', { vergabe: { sicherheit: { abnahme: ab } } }); } catch (e) { toast(e.message, true); return; } }
    }
    if (art === 'sicherheit' && !(pf($('#reB').value) > 0)) { toast($('#reWas').value === 'einbehalt' ? 'Es ist nichts einbehalten – „freier Betrag“ wählen und den Betrag eintragen.' : 'Bitte den Betrag eintragen.', true); return; }
    btn.disabled = true;
    try {
      const r = await call(`api/lv/${L.id}/rechnungen`, 'POST', { art, re_nr: $('#reNr').value, datum: $('#reD').value, eingang: $('#reE').value,
        gefordert: art === 'sicherheit' ? 0 : (pf($('#reG').value) || 0), betrag: art === 'sicherheit' ? (pf($('#reB').value) || 0) : undefined, grund: art === 'sicherheit' ? $('#reGr').value : undefined });
      const f = $('#reF').files[0]; close();
      const neu = r.rechnungen.reduce((a, x) => (x.nr > a.nr ? x : a), r.rechnungen[0]);
      if (neu) { PJSEL = 'r' + neu.id; render(); toast(`${reTitel(neu)} angelegt.`); }
      if (f && neu) await reBelegHoch(neu.id, f);
    } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  bgR.querySelector('.modal').classList.add('breit');   // von Anfang an breit genug – nichts läuft über
  bgR.addEventListener('change', (e) => { if (e.target.id === 'reWas') { const b = $('#reB'); if (e.target.value === 'einbehalt') { b.value = nf(offen, 2); b.readOnly = false; } else { b.value = ''; b.focus(); } } });
}
document.addEventListener('change', (e) => { const i = e.target.closest && e.target.closest('input[data-rebf]'); if (i && i.files[0]) reBelegHoch(+i.dataset.rebf, i.files[0]); });
async function reBelegHoch(rid, f) {
  if (!f) return;
  if (!/\.(pdf|jpe?g|png|tiff?|docx)$/i.test(f.name) && !/^(application\/pdf|image\/)/.test(f.type)) return toast('Bitte eine PDF-Datei, einen Scan oder ein Foto wählen.', true);
  const fd = new FormData(); fd.append('datei', f);
  toast('Rechnung wird gespeichert und im Projektordner abgelegt …');
  try {
    const r = await fetch(`api/rechnungen/${rid}/beleg`, { method: 'POST', body: fd, credentials: 'same-origin' });
    const d = await jsonAus(r); if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status);
    L = d; render(); toast(d.hinweis || 'Rechnung gespeichert.', !!(d.hinweis && /nicht im Projektordner/.test(d.hinweis)));
  } catch (e) { toast(e.message, true); }
}
document.addEventListener('click', async (e) => {
  const v = e.target.closest('[data-vabz]');
  if (v && L) { const k = v.dataset.vabz, A = abzAuftrag(), alt = { ...(L.vergabe.abzug || {}) };
    try { await call('api/lv/' + L.id, 'PUT', { vergabe: { abzug: { [k]: !A[k] } } }); rueckgaengig(`${ABZ.find((x) => x[0] === k)[1]} ${A[k] ? 'wird nicht mehr' : 'wird wieder'} abgezogen`, () => call('api/lv/' + L.id, 'PUT', { vergabe: { abzug: Object.fromEntries(ABZ.map(([x]) => [x, alt[x] !== false])) } })); } catch (er) { toast(er.message, true); } return; }
  const r = e.target.closest('[data-reabz]');
  if (r && L) { const rid = +r.dataset.reid2, c = (L.calc.rechnungen || []).find((x) => x.id === rid); if (!c) return; const k = r.dataset.reabz;
    try { await call('api/rechnungen/' + rid, 'PUT', { abzug: { [k]: !c.abzug[k] } }); } catch (er) { toast(er.message, true); } return; }
  const r0 = e.target.closest('[data-reabz0]');
  if (r0 && L) { try { await call('api/rechnungen/' + r0.dataset.reabz0, 'PUT', { abzug: Object.fromEntries(ABZ.map(([k]) => [k, null])) }); } catch (er) { toast(er.message, true); } }
});
document.addEventListener('change', (e) => { const i = e.target.closest && e.target.closest('[data-rebeleg]'); if (i && i.files[0]) { reBelegHoch(+i.dataset.rebeleg, i.files[0]); i.value = ''; } });
document.addEventListener('change', (e) => { const el = e.target.closest && e.target.closest('[data-si],[data-ve]'); if (!el || !L) return;
  if (el.dataset.ve) { mitUndo(el, (q) => call('api/lv/' + L.id, 'PUT', { vergabe: { einbehalt: pf(q.value) ?? 5 } }).catch((er) => toast(er.message, true)), 'Einbehalt'); return; }
  mitUndo(el, siSave, 'Sicherheit'); });
document.addEventListener('dragover', (e) => { const z = e.target.closest && e.target.closest('[data-redrop]'); if (z && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); z.classList.add('over'); } });
document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-redrop]'); if (z) z.classList.remove('over'); });
document.addEventListener('drop', (e) => { const z = e.target.closest && e.target.closest('[data-redrop]'); if (!z || !e.dataTransfer.files.length) return; e.preventDefault(); z.classList.remove('over'); reBelegHoch(+z.dataset.redrop, e.dataTransfer.files[0]); });
async function reSave(el) {
  const r = L.rechnungen.find((x) => x.id === +el.dataset.id); if (!r) return;
  const f = el.dataset.re, body = {};
  if (f.startsWith('z-')) { const zs = (r.data.zeilen || []).map((z) => ({ ...z })), k = +el.dataset.k, key = f.slice(2); zs[k][key] = ['menge', 'ep'].includes(key) ? pf(el.value) : el.value; body.zeilen = zs; }
  else if (f === 'betrag') body.betrag = pf(el.value) || 0;
  else if (f === 'freiAn') body.frei = el.checked ? (r.gefordert || 0) : null;
  else if (f === 'frei') body.frei = pf(el.value) || 0;
  else if (f.startsWith('abz-')) { const ab = (r.data.abzuege || []).map((z) => ({ ...z })), k = +el.dataset.k, key = f.slice(4); ab[k][key] = key === 'text' ? el.value : pf(el.value); if (key === 'pct' && ab[k].pct != null) ab[k].betrag = null; if (key === 'betrag' && ab[k].betrag != null) ab[k].pct = null; body.abzuege = ab; }
  else if (f === 'skonto' || f === 'skonto_tage') body[f] = el.value.trim() === '' ? null : pf(el.value);
  else body[f] = ['gefordert', 'einbehalt'].includes(f) ? pf(el.value) : el.value;
  try { await call('api/rechnungen/' + r.id, 'PUT', body); } catch (e) { toast(e.message, true); }
}
async function reAktion(b) {
  const r = L.rechnungen.find((x) => x.id === +b.dataset.id); if (!r) return;
  const a = b.dataset.reb;
  try {
    if (a === 'pdf' || a === 'freigabe') return reDruck(r);
    if (a === '_alt') { const lw = await druckfelder(a === 'freigabe' ? 'rechnungsfreigabe' : 'rechnungspruefung', ''); if (lw == null) return;
      const url = `api/lv/${L.id}/pdf?art=rechnung&rid=${r.id}${a === 'freigabe' ? '&freigabe=1' : ''}${lw}`;
      if (window.BPHead && BPHead.ansehen) BPHead.ansehen([{ url, typ: 'pdf', name: pdfName(a === 'freigabe' ? 'Rechnungsfreigabe' : 'Prüfblatt', reTitel(r) + (r.re_nr ? ' Nr. ' + r.re_nr : '')) }]); else location.href = url; return; }
    if (a === 'abzneu') return call('api/rechnungen/' + r.id, 'PUT', { abzuege: [...(r.data.abzuege || []), { text: '', pct: null, betrag: null }] });
    if (a === 'fzneu') return call('api/rechnungen/' + r.id, 'PUT', { zeilen: [...(r.data.zeilen || []), { text: '', menge: null, einheit: '', ep: null }] });
    if (a === 'zlv') return reZeilenInsLv(r.id, b.dataset.k != null ? +b.dataset.k : null);
    if (a === 'zneu') return call('api/rechnungen/' + r.id, 'PUT', { zeilen: [...(r.data.zeilen || []), { text: '', menge: null, einheit: 'h', ep: null }] });
    if (a === 'zdel') { const alt = JSON.parse(JSON.stringify(r.data.zeilen || [])); await call('api/rechnungen/' + r.id, 'PUT', { zeilen: alt.filter((_, k) => k !== +b.dataset.k) });
      rueckgaengig('Zeile entfernt', () => call('api/rechnungen/' + r.id, 'PUT', { zeilen: alt })); return; }
    if (a === 'ebAuftrag') { try { await call('api/rechnungen/' + r.id, 'PUT', { einbehalt: null }); toast('Sicherheitseinbehalt wie im Auftrag.'); } catch (er) { toast(er.message, true); } return; }
    if (a === 'beleg' || a === 'belegpruef') {   // Rechnung der Firma ansehen und abhaken: immer im Reiter „📄 Dokument“ (ein Fenster für beides)
      AMB = +b.dataset.bid; if (AMV && AMV.bid !== AMB) AMV = null;
      render(); seiteReiter(tab === 'rechnungen' ? 're' : 'am', 'dok'); return; }
    if (a === 'belegdel') return belegWeg(+b.dataset.bid);
    if (a === 'abzdel') {
      const alt = JSON.parse(JSON.stringify(r.data.abzuege || [])), ab = alt.filter((_, k) => k !== +b.dataset.k), z = alt[+b.dataset.k] || {};
      await call('api/rechnungen/' + r.id, 'PUT', { abzuege: ab });
      rueckgaengig(`Abzug ${z.text ? '„' + z.text + '“ ' : ''}entfernt`, () => call('api/rechnungen/' + r.id, 'PUT', { abzuege: alt }));
      return;
    }
    if (a === 'pruefen') {
      const id = L.id, stAlt = L.status;
      const n = await call('api/rechnungen/' + r.id, 'PUT', { status: 'geprueft' });
      rueckgaengig('Prüfung abgeschlossen – der Aufmaßstand ist festgehalten', async () => {
        await call('api/rechnungen/' + r.id, 'PUT', { status: 'offen' });
        if (n.status !== stAlt) await call('api/lv/' + id, 'PUT', { status: stAlt });   // Schlussrechnung hatte das LV auf „abgerechnet“ gesetzt
      });
      return;
    }
    if (a === 'zurueck') return call('api/rechnungen/' + r.id, 'PUT', { status: 'offen' });
    if (a === 'del') return reLoeschen(r.id);
  } catch (e) { toast(e.message, true); }
}
