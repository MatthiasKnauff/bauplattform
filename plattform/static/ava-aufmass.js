/* Ausschreibung (AVA) – Angebote, Preisspiegel, Vergabe, Aufmaßprüfung.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- Angebote, Preisspiegel, Vergabe ---------- */
const nlText = (V) => [V.nachlass ? nf(V.nachlass, 2) + ' %' : '', V.nachlass_eur ? eur(V.nachlass_eur) : ''].filter(Boolean).join(' + ') || '0 %';
/* Konditionen des Auftrags: Nachlass (% / €) und Skonto (% / Tage) – aus dem Angebot übernommen, hier änderbar */
const auftragKonditionen = (V) => `<span class="vk hint" style="display:inline-flex;gap:.35rem;align-items:center;flex-wrap:wrap">Nachlass
  <input data-ang="v_nachlass" value="${V.nachlass ? nf(V.nachlass, 2) : ''}" placeholder="%" style="width:3.6rem" inputmode="decimal" title="Nachlass in Prozent">
  <input data-ang="v_nachlass_eur" value="${V.nachlass_eur ? nf(V.nachlass_eur, 2) : ''}" placeholder="€" style="width:5.5rem" inputmode="decimal" title="Nachlass als fester Betrag netto – wird anteilig auf jede Rechnung umgelegt">
  · Skonto <input data-ang="v_skonto" value="${V.skonto ? nf(V.skonto, 2) : ''}" placeholder="%" style="width:3.6rem" inputmode="decimal"> % in
  <input data-ang="v_skonto_tage" value="${V.skonto_tage || ''}" placeholder="Anzahl" style="width:3.6rem" inputmode="numeric" title="Frist ab Rechnungseingang">
  <select data-ang="v_skonto_art" title="Wie die Skontofrist gezählt wird">${[['kt', 'Kalendertagen (Mo–So)'], ['wt', 'Werktagen (Mo–Sa)'], ['at', 'Arbeitstagen (Mo–Fr)'], ['wo', 'Wochen']].map(([k, l]) => `<option value="${k}"${(V.skonto_art || 'kt') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></span>${kondAbweichung(V)}`;
/* Weichen die Konditionen des Auftrags vom beauftragten Angebot ab (dort stehen auch die Werte aus der Angebotsbesprechung)? Hinweis mit „Zurücksetzen“ */
const KOND = [['nachlass', 'Nachlass', (v) => nf(v, 2) + ' %'], ['nachlass_eur', 'Nachlass', (v) => eur(v)], ['skonto', 'Skonto', (v) => nf(v, 2) + ' %'], ['skonto_tage', 'Skontofrist', (v) => v + ' Tage']];
function kondVertrag(V) { const a = V && V.angebot_id && L && (L.angebote || []).find((x) => x.id === V.angebot_id); return a || null; }
function kondAbweichung(V) {
  const a = kondVertrag(V); if (!a) return '';
  const D = KOND.filter(([k]) => Math.abs((+V[k] || 0) - (+a[k] || 0)) > 1e-6);
  if (!D.length) return '';
  return `<div class="vk-abw" role="status">⚠ Weicht vom Vertrag ab (beauftragtes Angebot${(L.vergabedok || []).some((x) => x.art === 'besprechung' && x.angebot_id === a.id && x.status !== 'entwurf') ? ' / Angebotsbesprechung' : ''}): ${D.map(([k, l, f]) => `${l} hier ${(+V[k] || 0) ? f(+V[k]) : '–'}, laut Vertrag ${(+a[k] || 0) ? f(+a[k]) : '–'}`).join(' · ')}
    <button type="button" class="btn sm" data-kondzurueck>Auf Vertrag zurücksetzen</button></div>`;
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !e.target.closest('[data-kondzurueck]') || !L) return;
  const V = L.vergabe || {}, a = kondVertrag(V); if (!a) return;
  const alt = Object.fromEntries(KOND.map(([k]) => [k, +V[k] || 0])), neu = Object.fromEntries(KOND.map(([k]) => [k, +a[k] || 0])), lid = L.id;
  try { await call('api/lv/' + lid, 'PUT', { vergabe: neu }); } catch (er) { toast(er.message, true); return; }
  rueckgaengig('Auftragsbedingungen auf den Vertrag zurückgesetzt', async () => { if (L && L.id === lid) await call('api/lv/' + lid, 'PUT', { vergabe: alt }); });
});
function vAngebote(teil) {   // teil: 'kopf' = Vergabe-Karte, 'ps' = Preisspiegel, ohne = beides
  const P = posOf().filter((x) => !x.nt), A = L.angebote, K = L.calc, kA = Object.fromEntries(K.angebote.map((a) => [a.id, a])), V = L.vergabe;
  const NV = L.status === 'nicht_vergeben' && !V.bieter ? (V.nicht_vergeben || {}) : null;
  const head = `    ${NV ? `<div class="vb"><span>✗ <b>Nicht vergeben</b>${NV.grund ? ' – ' + esc((NICHT_GRUENDE.find((g) => g[0] === NV.grund) || [, ''])[1]) : ''}${NV.datum ? ' · am ' + de(NV.datum) : ''}${NV.von ? ' von ' + esc(NV.von) : ''}${NV.notiz ? ' · ' + esc(NV.notiz) : ''}</span>
      <span class="vb-k"><span class="hint">zählt nicht für Budget, Prognose und To-dos · Angebote bleiben erhalten</span><span class="fill"></span><button class="btn sm" data-act="nichtVergebenWeg">Zurücknehmen</button></span></div>` : ''}
    ${(L.vergabedok || []).length ? `<div class="vg-chips">${L.vergabedok.map((x) => `<button type="button" class="vg-chip ${x.status}" data-vgoffen="${x.id}" data-lid="${L.id}" title="öffnen">${x.art === 'besprechung' ? '📋 Angebotsbesprechung' : x.art === 'vertrag' ? '📄 Bauvertrag' : '✉ Auftragsschreiben'}${x.art === 'besprechung' ? ' · ' + esc((L.angebote.find((a) => a.id === x.angebot_id) || {}).bieter || '') : ''} · ${x.status === 'unterschrieben' ? '✍ unterschrieben' : x.status === 'abgeschlossen' ? 'abgeschlossen' : 'Entwurf'}</button>`).join('')}</div>` : ''}
    ${V.bieter ? `<div class="vb"><span>✓ Vergeben an <b>${esc(V.bieter)}</b> am ${de(V.datum)} · Auftrag ${eur(K.auftrag)}${V.nachlass || V.nachlass_eur ? ` (nach ${nlText(V)} Nachlass)` : ''}${V.frei ? ` · <label class="hint" style="display:inline-flex;gap:.25rem;align-items:center" title="Auftrag nur mit Firma und Summe. Positionen lassen sich trotzdem jederzeit im LV ergänzen, z. B. aus der ersten Rechnung.">${V.ohne_lv === false ? '☐' : '☑'} ohne Angebot und LV</label>` : ''}</span>
      <span class="vb-k">${auftragKonditionen(V)}
      <label class="hint">Sicherheitseinbehalt <input data-ang="einbehalt" value="${nf(V.einbehalt ?? 5, 2)}" style="width:4rem" inputmode="decimal"> %</label><span class="fill"></span><button class="btn sm" data-act="vergabeWeg">Vergabe aufheben</button></span></div>` : ''}`;
  if (teil === 'kopf') return head;
  const head0 = head; { /* Preisspiegel allein: ohne Vergabe-Karte */ }
  if (!A.length) return (teil === 'ps' ? '' : head0) + `<div class="card empty"><p>Noch keine Angebote. Bieter hinzufügen und Preise eintragen – oder die GAEB-Datei (X84) bzw. das ausgefüllte Excel einer Firma einlesen.</p>
    <p class="hint">Das LV gibst du oben rechts unter „Export“ als GAEB X83, Excel oder PDF an die Bieter.</p></div>`;
  const PSK = `ava.ps.${L.id}`, AUS = psOhne(A);   // Bieter grau/aus (Spaltenauswahl): zählen nicht für „günstigster“ und Mittel
  const best = (id) => { const v = A.filter((a) => !AUS.has(a.id)).map((a) => a.preise[id]).filter((x) => x != null); return { mn: v.length > 1 ? Math.min(...v) : null, mit: v.length ? v.reduce((s, x) => s + x, 0) / v.length : null }; };
  const rows = items().filter((x) => !x.nt).map((x) => {
    if (x.typ === 'titel') return `<tr class="ti"><td class="oz">${esc(x.oz)}</td><td colspan="${5 + A.length}">${esc(x.kurz)}</td></tr>`;
    if (x.art === 'T') return '';
    const b = best(x.id);
    return `<tr><td class="oz">${esc(x.oz)}</td><td>${esc(x.kurz)}${x.art !== 'N' ? `<span class="badge">${esc(ARTEN[artW(x)])}</span>` : ''}</td><td class="r">${nf(x.menge)}</td><td>${esc(x.einheit)}</td><td class="r ps-s" title="Schätzung des Planers (EP)${x.ep_s != null && zaehlt(x) ? ' · GP ' + eur((x.menge || 0) * x.ep_s) : ''}">${x.ep_s != null ? nf2(x.ep_s) : ''}</td>`
      + A.map((a) => { const e = a.preise[x.id]; const cls = e != null && b.mn != null && e === b.mn ? 'min' : e != null && b.mit && Math.abs(e / b.mit - 1) > 0.3 ? 'aus' : '';
        const gp = e != null && zaehlt(x) ? 'GP ' + eur((x.menge || 0) * e) : '';
        return `<td class="bp ${AUS.has(a.id) ? '' : cls}"><input class="n ep" data-ang="ep" data-aid="${a.id}" data-pid="${x.id}" value="${e != null ? nf2(e) : ''}" inputmode="decimal" title="${[gp, !AUS.has(a.id) && cls === 'aus' ? 'weicht mehr als 30 % vom Mittel ab' : ''].filter(Boolean).join(' · ')}"></td>`; }).join('') + `<td class="r ps-m" title="Mittel der zählenden Angebote">${b.mit != null ? nf2(b.mit) : ''}</td></tr>`;
  }).join('');
  const sorted = [...A];
  return (teil === 'ps' ? '' : head0) + `<p class="hint" style="margin:${teil === 'ps' ? '0' : '-.2rem'} 0 .5rem">Einheitspreise direkt eintragen (Tab springt weiter), GP im Tooltip. Bieter ausgrauen oder ausblenden: rechte Maustaste auf den Spaltenkopf oder <button type="button" class="btn sm" data-spw="${PSK}">Spalten …</button> (an → grau → aus) – grau zählt nicht, im Druck fehlen beide. <b style="color:var(--ok)">Grün</b> = niedrigster Preis, <span style="text-decoration:underline wavy #e07b3a">unterstrichen</span> = mehr als 30 % vom Mittel entfernt.${K.schaetzung ? ` Schätzung des Planers: <b>${eur(K.schaetzung)}</b>.` : ''}</p>
    <div class="tblw"><table class="lv ps" data-sp="${PSK}"><thead><tr><th>OZ</th><th style="min-width:11rem">Kurztext</th><th class="r">Menge</th><th>EH</th><th class="r" title="Einheitspreis der Schätzung (Planer)">Schätzung</th>
      ${sorted.map((a) => `<th class="bh${V.angebot_id === a.id ? ' win' : ''}" data-spgrau data-aid="${a.id}" data-spname="${esc(a.bieter)}"><div class="bn"><input data-ang="bieter" data-aid="${a.id}" value="${esc(a.bieter)}" style="font-weight:600"><button class="ib" data-angdaten="${a.id}" title="Angaben zum Angebot: Nummer, Datum, Bindefrist, Ansprechpartner …">ⓘ</button><button class="ib" data-angdel="${a.id}" title="Angebot löschen">✕</button></div>
        <label class="hint" style="font-weight:400">Eingang <input type="date" data-ang="eingang" data-aid="${a.id}" value="${esc(a.eingang || '')}" style="width:auto"></label></th>`).join('')}<th class="r" title="Mittel der zählenden Angebote (ohne graue/ausgeblendete)">Mittel</th></tr></thead>
      <tbody>${rows}</tbody><tfoot>
      <tr><td></td><td colspan="3">Summe netto</td><td class="r ps-s">${K.schaetzung ? eur(K.schaetzung) : ''}</td>${sorted.map((a) => `<td class="r">${eur(kA[a.id].summe)}${kA[a.id].fehlt ? `<br><span class="hint">${kA[a.id].fehlt} Preise fehlen</span>` : ''}</td>`).join('')}<td></td></tr>
      <tr><td></td><td colspan="4">Nachlass <span class="hint">% und/oder fester Betrag €</span></td>${sorted.map((a) => `<td class="r"><input class="n" data-ang="nachlass" data-aid="${a.id}" value="${a.nachlass ? nf(a.nachlass, 2) : ''}" placeholder="%" style="width:4rem" inputmode="decimal" title="Nachlass in Prozent"> <input class="n" data-ang="nachlass_eur" data-aid="${a.id}" value="${a.nachlass_eur ? nf(a.nachlass_eur, 2) : ''}" placeholder="€" style="width:5.5rem" inputmode="decimal" title="Nachlass als fester Betrag (netto)"></td>`).join('')}<td></td></tr>
      <tr><td></td><td colspan="4">Skonto <span class="hint">% innerhalb von … Kalendertagen ab Eingang der prüfbaren Rechnung</span></td>${sorted.map((a) => `<td class="r"><input class="n" data-ang="skonto" data-aid="${a.id}" value="${a.skonto ? nf(a.skonto, 2) : ''}" placeholder="%" style="width:4rem" inputmode="decimal"> <input class="n" data-ang="skonto_tage" data-aid="${a.id}" value="${a.skonto_tage || ''}" placeholder="Tage" style="width:4rem" inputmode="numeric"></td>`).join('')}<td></td></tr>
      <tr><td></td><td colspan="4"><b>Wertung netto</b></td>${sorted.map((a) => `<td class="r"><b>${eur(kA[a.id].netto)}</b>${kA[a.id].rang ? `<br><span class="pill${kA[a.id].rang === 1 ? ' ok' : ''}">Rang ${kA[a.id].rang}</span>` : ''}</td>`).join('')}<td></td></tr>
      <tr><td></td><td colspan="4"></td>${sorted.map((a) => `<td class="r">${V.angebot_id === a.id ? '<span class="pill ok">beauftragt</span>' : `<button class="btn sm" data-vergabe="${a.id}">Vergeben …</button>`}<br><button class="ib" data-angx84="${a.id}" title="Angebot als GAEB X84 speichern">X84</button></td>`).join('')}<td></td></tr>
      </tfoot></table></div>`;
}
/* Bieter, die im Preisspiegel grau oder aus sind (Spaltenauswahl, Schlüssel ava.ps.<LV>): Spalte 5 + Reihenfolge der Angebote */
function psOhne(A) {
  if (!window.bpSpalten || !L) return new Set();
  const z = bpSpalten.stand(`ava.ps.${L.id}`, 6 + A.length, []);   // OZ, Kurztext, Menge, EH, Schätzung, Bieter …, Mittel
  return new Set(A.filter((a, i) => z.aus.has(5 + i) || (z.grau && z.grau.has(5 + i))).map((a) => a.id));
}
document.addEventListener('bp-spalten', (e) => { if (L && e.detail && e.detail.key === `ava.ps.${L.id}`) render(); });   // grau/aus geändert: „günstigster“ neu
async function angSave(el) {
  const a = el.dataset.ang;
  try {
    if (a === 'einbehalt') return call('api/lv/' + L.id, 'PUT', { vergabe: { einbehalt: pf(el.value) ?? 5 } });
    if (a.startsWith('v_')) return call('api/lv/' + L.id, 'PUT', { vergabe: { [a.slice(2)]: a === 'v_skonto_art' ? el.value : pf(el.value) ?? 0 } });
    const body = a === 'ep' ? { preise: { [el.dataset.pid]: el.value } } : { [a]: ['nachlass', 'nachlass_eur', 'skonto', 'skonto_tage'].includes(a) ? pf(el.value) ?? 0 : el.value };
    const r = await api('api/angebote/' + el.dataset.aid, 'PUT', body);
    const ae = seiteAktiv(), pos = ae && ae.dataset ? { aid: ae.dataset.aid, pid: ae.dataset.pid, f: ae.dataset.ang } : null;   // auch im eigenen Browserfenster
    L = r; render();
    if (pos && pos.aid) { const n = seiteFinde(`[data-ang="${pos.f}"][data-aid="${pos.aid}"]${pos.pid ? `[data-pid="${pos.pid}"]` : ''}`); if (n) n.focus(); }
  } catch (e) { toast(e.message, true); }
}
async function bieterDialog() {
  const gw = (L.gewerk || '').toLowerCase();
  const K = (KONT || []).map((k) => ({ ...k, passt: gw && k.trade && (k.trade.toLowerCase().includes(gw) || gw.includes(k.trade.toLowerCase())) })).sort((a, b) => (b.passt - a.passt) || a.name.localeCompare(b.name, 'de'));
  const da = new Set(L.angebote.map((a) => a.contact_id));
  const bg = modalBox(`<h3>Bieter hinzufügen</h3><p class="hint" style="margin:0 0 .5rem">${gw ? `Firmen mit Gewerk „${esc(L.gewerk)}“ stehen oben.` : 'Firmen aus den Adressen.'} Mehrere ankreuzen geht.</p>
    <input type="search" id="biQ" placeholder="Firma suchen …" style="width:100%;margin-bottom:.4rem">
    <div id="biL" style="max-height:45vh;overflow:auto;border:1px solid var(--line);border-radius:calc(8px*var(--rk,1));padding:.4rem .6rem"></div>
    <div class="fm" style="margin-top:.6rem"><label>oder frei</label><input id="biFrei" placeholder="Name eines Bieters ohne Adresse"></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Hinzufügen</button></div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const ids = [...bg.querySelectorAll('[data-bi]:checked')].map((x) => +x.dataset.bi), frei = $('#biFrei').value.trim();
    if (!ids.length && !frei) { toast('Bitte mindestens einen Bieter wählen.', true); return; }
    try { for (const id of ids) L = await api(`api/lv/${L.id}/angebote`, 'POST', { contact_id: id }); if (frei) L = await api(`api/lv/${L.id}/angebote`, 'POST', { bieter: frei }); close(); render(); refreshList(); } catch (e) { toast(e.message, true); }
  });
  const draw = () => { const q = $('#biQ').value; $('#biL').innerHTML = K.filter((k) => !q || passt(k.name + ' ' + k.trade, q)).slice(0, 200).map((k) => `<label style="display:flex;gap:.5rem;padding:.15rem 0"><input type="checkbox" data-bi="${k.id}"${da.has(k.id) ? ' disabled' : ''}> <span><b>${esc(k.name)}</b> <small class="hint">${esc(k.trade || '')}${da.has(k.id) ? ' · schon dabei' : ''}</small></span></label>`).join('') || '<p class="hint">Keine Firma gefunden.</p>'; };
  bg.addEventListener('input', (e) => { if (e.target.id === 'biQ') draw(); }); draw();
}
function vergabeDialog(aid) {
  const a = L.angebote.find((x) => x.id === aid), k = L.calc.angebote.find((x) => x.id === aid);
  modalBox(`<h3>Vergabe an ${esc(a.bieter)}</h3><p>Wertungssumme <b>${eur(k.netto)}</b>${k.rang ? ` · Rang ${k.rang}` : ''}${k.fehlt ? ` · <b style="color:var(--red)">${k.fehlt} Preise fehlen</b>` : ''}.</p>
    <p class="hint">Die Preise dieses Angebots werden die Auftragspreise – für Nachträge, Aufmaß und Rechnungsprüfung.</p>
    <div class="fm" style="align-items:center;grid-template-columns:auto 1fr;column-gap:1.2rem"><label>Auftragsdatum</label><input type="date" id="vgD" value="${new Date().toISOString().slice(0, 10)}" style="max-width:12rem"><label>Sicherheitseinbehalt</label><span style="display:flex;align-items:center;gap:.4rem"><input id="vgE" value="${nf(L.vergabe.einbehalt ?? 5, 2)}" style="width:5rem;text-align:right" inputmode="decimal"> %</span>
      <span></span><span class="hint" style="margin-top:-.3rem">Vertragserfüllung – wird in jeder Abschlagsrechnung einbehalten</span></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Vergeben</button></div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    try { await call(`api/lv/${L.id}/vergabe`, 'POST', { angebot_id: aid, datum: $('#vgD').value, einbehalt: pf($('#vgE').value) ?? 5 }); close(); toast(`Vergeben an ${a.bieter}.`); } catch (e) { toast(e.message, true); }
  });
}

/* ---------- Aufmaß ---------- */
/* ---------- Aufmaßprüfung: Baum wie in ORCA (LV › Teilrechnungen › Titel › Positionen) oder Aufmaß erfassen ---------- */
let amAns = 'erfassen', AMX = LS.get('amx', {});
function vAufmass() {
  if (aufgehoben()) return aufhBanner() + `<div class="deakt" aria-disabled="true">${vAufmass0()}</div>`;
  return vAufmass0();
}
function vAufmass0() {
  const um = `<div class="seg" role="group" aria-label="Ansicht" style="margin-bottom:.6rem"><button type="button" class="${amAns === 'erfassen' ? 'on' : ''}" data-amans="erfassen">Aufmaß erfassen</button><button type="button" class="${amAns === 'baum' ? 'on' : ''}" data-amans="baum">Prüfung je Rechnung</button></div>`;
  if (amAns === 'baum') return vAmBaum();
  const B = amBelege(), z = amNurR && B.length ? 'pdf' : amNur ? 'am' : 'alle';
  const offen = B.reduce((n, b) => n + Object.values((b.auslese && b.auslese.pos) || {}).filter((y) => y.menge != null).length, 0);
  const zeig = posOf().length ? `<span class="am-zeig"><span class="hint">Zeigen</span><span class="seg sm" role="group" aria-label="Welche Positionen zeigen"><button type="button" class="${z === 'alle' ? 'on' : ''}" data-amzeig="alle" title="alle Positionen des LV">Alle</button><button type="button" class="${z === 'am' ? 'on' : ''}" data-amzeig="am" title="nur Positionen, für die schon eine Menge aufgemessen ist">Aufgemessene</button>${B.length ? `<button type="button" class="${z === 'pdf' ? 'on' : ''}" data-amzeig="pdf" title="nur Positionen, die in der Rechnung (PDF) der Firma vorkommen">In der Rechnung</button>` : ''}</span></span>` : '';
  const ueb = B.length && offen ? '<button class="btn sm" data-amueb="*" title="Für alle Positionen, bei denen die Firma mehr fordert als aufgemessen, die Differenz als Zeile „lt. Firma“ eintragen">Alle Mengen der Firma eintragen</button>' : '';
  return vAmErfassen();   // Arbeitsweise, Übernehmen und Zeigen stehen in der Befehlsleiste (amBefehle)
}
function vAmBaum() {
  const I = items(), VP = (L.vergabe && L.vergabe.preise) || {}, nl = ((L.vergabe && L.vergabe.nachlass) || 0) / 100;
  const RE = [...L.rechnungen].sort((a, b) => a.nr - b.nr);
  const live = L.calc.aufmass || {};
  const staende = []; let vorher = {};
  const RC_ = Object.fromEntries((L.calc.rechnungen || []).map((x) => [x.id, x]));
  const ohneAm = (r) => r.art === 'regie' || r.art === 'sicherheit' || (RC_[r.id] && RC_[r.id].frei);   // laufen nicht über das Aufmaß
  const letzteAm = [...RE].reverse().find((r) => !ohneAm(r));
  RE.forEach((r, k) => {
    const sub = [r.re_nr ? 'Nr. ' + r.re_nr : '', r.status === 'geprueft' ? 'geprüft' : 'in Prüfung'].filter(Boolean).join(' · ');
    if (ohneAm(r)) { staende.push({ key: 'r' + r.id, titel: reTitel(r), sub: sub + ' · ' + (r.art === 'regie' ? 'Stundenlohn, ohne Aufmaß' : r.art === 'sicherheit' ? 'ohne Aufmaß' : 'Betrag frei geprüft, ohne Aufmaß'), ohne: r, letzte: k === RE.length - 1 }); return; }
    const st = r.status === 'geprueft' && r.data && r.data.stand ? r.data.stand : live;
    staende.push({ key: 'r' + r.id, titel: reTitel(r), sub, st, vorher, letzte: r === letzteAm && (r.status !== 'geprueft' || k === RE.length - 1) });
    if (r.status === 'geprueft') vorher = st;
  });
  if (!letzteAm || letzteAm.status === 'geprueft') staende.push({ key: 'rlive', titel: RE.length ? 'Aufmaß seit der letzten Rechnung' : 'Aufmaß (noch keine Rechnung)', sub: 'noch nicht abgerechnet', st: live, vorher, letzte: true });
  const offen = (k, def) => (k in AMX ? AMX[k] : def);
  const e2 = (v) => (v ? eur(v).replace(' €', '') : '');
  const prog = (x, m) => { const ep = VP[x.id]; if (ep == null || x.entf) return 0; const q = ohneGB(x) ? m : Math.max(x.menge || 0, m); return q * ep; };
  const summe = (st, von, bis) => { let g = 0, p = 0; for (let i = von; i < bis; i++) { const x = I[i]; if (x.typ !== 'pos' || x.art === 'T' || (x.nt && x.nt_status === 'abgelehnt')) continue; const ep = VP[x.id]; if (ep == null) continue; const m = st[x.id] || 0; g += m * ep; p += prog(x, m); } return [g, p]; };
  const ende = (i) => { const lv = I[i].lvl || 1; let j = i + 1; while (j < I.length && !(I[j].typ === 'titel' && (I[j].lvl || 1) <= lv)) j++; return j; };
  const mitAm = staende.filter((S) => !S.ohne);
  const [gAll, pAll] = summe(mitAm.length ? mitAm[mitAm.length - 1].st : live, 0, I.length);
  const out = [], car = (k, on) => `<span class="car" data-amx="${k}">${on ? '▾' : '▸'}</span>`;
  out.push(`<tr class="root"><td><span class="tw">${IC.proj}<span>LV ${esc(L.nr)} ${esc(L.name)}${L.vergabe && L.vergabe.bieter ? ' · ' + esc(L.vergabe.bieter) : ''}</span></span></td><td></td><td></td><td></td><td class="r">${e2(gAll * (1 - nl))}</td><td class="r">${e2(pAll * (1 - nl))}</td></tr>`);
  staende.forEach((S) => {
    if (S.ohne) {   // Regie-, freie Rechnung, Freigabe der Sicherheit: Betrag statt Aufmaß, Zeilen der Regierechnung
      const r = S.ohne, c = RC_[r.id] || {}, on = offen(S.key, false), Z = r.art === 'regie' ? r.data.zeilen || [] : [];
      out.push(`<tr class="rech" data-amr="${S.key}"><td><span class="tw" style="padding-left:1.1rem">${Z.length ? car(S.key, on) : '<span class="car"></span>'}${IC.lv}<span><b>${esc(S.titel)}</b> <span class="mu">${esc(S.sub)}</span></span></span></td><td></td><td></td><td></td><td class="r">${e2(c.leistung)}</td><td class="r"></td></tr>`);
      if (on) Z.forEach((z) => out.push(`<tr><td><span class="tw" style="padding-left:3.3rem">${IC.pos}<span>${esc(z.text || '')}</span></span></td><td class="r">${nf3(z.menge || 0)} ${esc(z.einheit || '')}</td><td></td><td class="r">${z.ep != null ? nf2(z.ep) : ''}</td><td class="r">${e2((z.menge || 0) * (z.ep || 0))}</td><td></td></tr>`));
      return;
    }
    const on = offen(S.key, S.letzte), [g, p] = summe(S.st, 0, I.length);
    out.push(`<tr class="rech${S.letzte ? ' akt' : ''}" data-amr="${S.key}"><td><span class="tw" style="padding-left:1.1rem">${car(S.key, on)}${IC.lv}<span><b>${esc(S.titel)}</b> <span class="mu">${esc(S.sub)}</span></span></span></td><td></td><td></td><td></td><td class="r">${e2(g * (1 - nl))}</td><td class="r">${on ? '' : e2(p * (1 - nl))}</td></tr>`);
    if (!on) return;
    const zu = new Set();   // zugeklappte Titel
    I.forEach((x, i) => {
      for (const t of zu) if (i > t.i && i < t.e) return;
      if (x.typ === 'titel') {
        const k = S.key + ':' + x.id, o = offen(k, true), e = ende(i), [tg, tp] = summe(S.st, i + 1, e);
        if (!o) zu.add({ i, e });
        out.push(`<tr class="ti"><td><span class="tw" style="padding-left:${1.1 + (x.lvl || 1) * 1.1}rem">${car(k, o)}${IC.ti}<span>${esc(x.oz)} ${esc(x.kurz)}</span></span></td><td></td><td></td><td></td><td class="r">${e2(tg)}</td><td class="r">${e2(tp)}</td></tr>`);
        return;
      }
      const tiefe = 1.1 + ((I.slice(0, i).reverse().find((y) => y.typ === 'titel') || {}).lvl || 0) * 1.1 + 2.2;
      if (x.art === 'T') { out.push(`<tr class="txt"><td colspan="6"><span class="tw" style="padding-left:${tiefe}rem">${IC.pos}<span class="mu">${esc(x.kurz || x.lang || '')}</span></span></td></tr>`); return; }
      const ep = VP[x.id], m = S.st[x.id] || 0, z = m - (S.vorher[x.id] || 0), abg = x.nt && x.nt_status === 'abgelehnt';
      const ueb = x.menge && m > x.menge * 1.1;
      out.push(`<tr data-amp="${x.id}" class="${abg || x.entf ? 'mu' : ''}"><td><span class="tw" style="padding-left:${tiefe}rem">${IC.pos}<span>${esc(x.oz)} ${esc(x.kurz)}${x.nt ? ` <span class="nt">${esc(x.nt)}</span>` : ''}</span></span></td>
        <td class="r${ueb ? ' nt' : ''}" title="LV-Menge ${nf(x.menge)} ${esc(x.einheit || '')}">${nf3(m)}</td><td class="r">${nf3(z)}</td><td class="r">${ep != null ? nf2(ep) : ''}</td><td class="r">${ep != null && !abg ? e2(m * ep) || '0,00' : ''}</td><td class="r">${ep != null && !abg ? e2(prog(x, m)) : ''}</td></tr>`);
    });
  });
  return `<div class="tblw"><table class="tree"><thead><tr><th style="min-width:12rem">Bezeichnung</th><th class="r">Menge</th><th class="r">Zuwachsmenge</th><th class="r">Preis (EUR)</th><th class="r">Gesamt (EUR)</th><th class="r">Prognose (EUR)</th></tr></thead><tbody>${out.join('')}</tbody></table></div>
    <p class="hint" style="margin:.5rem 0 0">Menge = aufgemessen bis zu dieser Rechnung (bei geprüften Rechnungen der festgehaltene Stand), Zuwachsmenge = neu seit der vorigen geprüften Rechnung. Prognose = größere aus LV- und Aufmaßmenge × Auftragspreis. Orange: mehr als 110 % der LV-Menge. Doppelklick auf eine Position öffnet ihr Aufmaß.</p>`;
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-amans]'); if (a) { amAns = a.dataset.amans; render(); return; }
  if (e.target.closest('[data-amzw]')) { amZw = !amZw; LS.set('amZw', amZw); render(); return; }
  const zg = e.target.closest('[data-amzeig]'); if (zg) { const v = zg.dataset.amzeig; amNur = v === 'am'; amNurR = v === 'pdf'; LS.set('amNur', amNur); LS.set('amNurR', amNurR); render(); return; }
  const c = e.target.closest('[data-amx]'); if (c) { const k = c.dataset.amx, cur = c.textContent === '▾'; AMX[k] = !cur; LS.set('amx', AMX); render(); }
});
document.addEventListener('dblclick', (e) => {
  const tr = e.target.closest('tr[data-amp]'); if (!tr || tab !== 'aufmass') return;
  amPos = tr.dataset.amp; LS.set('amPos', amPos); amAns = 'erfassen'; render();
  setTimeout(() => { const n = document.querySelector('[data-am-new="formel"]'); if (n) n.focus(); }, 30);
});
/* Rechnung / Aufmaß der Firma neben der Prüfung: PDF rechts, Positionen Schritt für Schritt, erkannte Mengen eintragen */
const AMNEU = new Set();
let AMTEIL = { ein: '', rech: '' };   // Aufmaß: Inhalte für den Bereich rechts (Eingabe, Karten der Rechnung)
let AMABL = null;   // Ablage im Projektordner, aus dem gemeinsamen Ablagefeld gewählt
let AMB = LS.get('amB', 0), amNurR = LS.get('amNurR', false), AMV = null;
let amZw = LS.get('amZw', false);   // Aufmaßzeilen als Zwischenzeilen unter den Positionen
const amRe = () => (L ? (['rechnungen', 'aufmass'].includes(tab) && PJSEL && PJSEL[0] === 'r' && L.rechnungen.find((r) => 'r' + r.id === PJSEL)) || L.rechnungen.find((r) => r.status !== 'geprueft') || [...L.rechnungen].sort((a, b) => b.nr - a.nr)[0] || null : null);
const amBelege = () => { const r = amRe(); return r ? r.belege || [] : []; };
function amTreffer(pid) { let t = null; for (const b of [...amBelege()].sort((x, y) => (y.id === AMB) - (x.id === AMB))) { const x = b.auslese && b.auslese.pos && b.auslese.pos[pid]; if (x && (!t || (t.menge == null && x.menge != null))) t = { ...x, bid: b.id }; } return t; }
const amListe = () => posOf().filter((p) => (!amNur || L.aufmass.some((a) => a.pos_id === p.id)) && (!amNurR || !amBelege().length || amTreffer(p.id)));
function vAmErfassen() {
  const P = posOf(), AM = L.aufmass, K = L.calc, B = amBelege(), R = amRe();
  if (!P.length) {   // LV ohne Positionen (z. B. Auftrag ohne LV): Positionen aus der Rechnung der Firma anlegen
    const bb = B.find((b) => b.id === AMB) || B[B.length - 1], A = (bb && bb.auslese) || {};
    const n = (A.bloecke || []).filter((y) => !y.titel && y.kurz && y.menge != null).length || (A.zeilen || []).filter((z) => !z.pos).length;
    const hochL = `<label class="btn pri" title="Rechnung oder Aufmaßblätter der Firma als PDF, Scan oder Foto">📄 Rechnung / Aufmaß der Firma einlesen …<input type="file" accept=".pdf,application/pdf,image/*" multiple hidden data-ambeleg></label>`;
    const schritt = (n, t, x) => `<li><b>${n}</b><span>${t}${x ? `<div class="bar" style="margin:.35rem 0 0">${x}</div>` : ''}</span></li>`;
    const wieGeht = `<p class="hint" style="margin:.2rem 0 .6rem">In der Aufmaßprüfung prüfst du <b>je Position</b>: Menge lt. Firma ↔ dein Aufmaß, mal Auftrags-EP. Dafür braucht das LV Positionen – dieses hat noch keine.</p>`;
    if (!bb) return `<div class="card am-leer"><h3>Aufmaßprüfung – so geht es</h3>${wieGeht}<ol>
      ${schritt(1, 'Rechnung oder Aufmaß der Firma einlesen – die Positionen daraus (OZ, Text, Menge, Einheit, EP) werden im LV angelegt. Was nicht passt, änderst oder löschst du danach.', hochL)}
      ${schritt(2, 'Oder die Positionen selbst im Leistungsverzeichnis eintragen.', '<button class="btn sm" data-tab="lv">→ Leistungsverzeichnis</button>')}
      ${schritt(3, 'Dann je Position prüfen: „Menge der Firma übernehmen“ oder eigenen Rechenweg eintragen – rechts in der PDF erscheint ✔ (stimmt), ✘ (weicht ab) oder ○ (noch offen).', '')}</ol>
      <p class="hint" style="margin:.6rem 0 0">Pauschale oder Rechnung ohne Mengen? Dann unter <button class="btn sm" data-tab="rechnungen">Rechnungen</button> „ohne Aufmaß“ prüfen.</p></div>`;
    return `<div class="card am-leer"><h3>Aufmaßprüfung – noch keine Positionen im LV</h3>${wieGeht}${A.laeuft ? '<p>Die Texterkennung der Rechnung läuft noch …</p>' : n ? `<p>In der Rechnung der Firma sind <b>${n} Position${n === 1 ? '' : 'en'}</b> erkannt.</p><div class="bar"><button class="btn pri" data-ambpos="${bb.id}">Positionen aus der Rechnung ins LV übernehmen</button></div><p class="hint" style="margin:.5rem 0 0">Mit OZ, Text, Menge, Einheit und EP der Firma (als Auftragspreis). Was nicht passt, bearbeitest oder löschst du danach im Leistungsverzeichnis.</p>` : `<p>In der Rechnung sind keine Positionen sicher erkannt.</p><div class="bar"><button class="btn sm" data-amneu="${bb.id}">↻ Rechnung neu lesen</button>${hochL}<button class="btn sm" data-tab="lv">→ Positionen im LV eintragen</button><button class="btn sm" data-tab="rechnungen">ohne Aufmaß prüfen</button></div>`}</div>`;
  }
  if (B.length && !B.some((b) => b.id === AMB)) AMB = (B.find((b) => b.auslese && Object.keys(b.auslese.pos || {}).length) || B[B.length - 1]).id;
  if (!P.some((p) => p.id === amPos)) amPos = (P.find((p) => AM.some((a) => a.pos_id === p.id)) || P[0]).id;
  const x = P.find((p) => p.id === amPos), Z = AM.filter((a) => a.pos_id === amPos).sort((a, b) => a.id - b.id), sum = Z.reduce((s, a) => s + (a.menge || 0), 0);
  const VP = (L.vergabe && L.vergabe.preise) || {}, LI = amListe(), idx = LI.findIndex((p) => p.id === amPos);
  const R0 = R ? 3 : 2;   // Einrückung der Positionen: unter der Rechnung (oder direkt unter dem LV)
  const TB = amTitelBaum(LI), AMD = (id) => (TB.tiefe[id] || 0);
  const amZ1 = (id, m) => { if (R && R.status === 'geprueft') return null; const Z1 = AM.filter((a) => a.pos_id === id); return Z1.length === 1 && Math.abs((Z1[0].menge || 0) - m) < 1e-9 ? Z1[0] : !Z1.length && !m ? { neu: true } : null; };   // keine oder genau eine Aufmaßzeile: Zelle „aufgemessen“ direkt änderbar
  const listeZ = LI.map((p) => { const m = K.aufmass[p.id] || 0, z1 = amZ1(p.id, m), pct = p.menge ? Math.round(m / p.menge * 100) : null, t = B.length ? amTreffer(p.id) : null, e = VP[p.id], fe = t && t.ep;
    const fz = t ? (t.menge != null ? `<td class="r" style="color:${Math.abs(t.menge - m) < 1e-6 ? 'var(--ok)' : '#e07b3a'};font-weight:600" title="lt. PDF der Firma, Seite ${t.seite}">${nf(t.menge)}</td>` : `<td class="r hint" title="in der PDF gefunden (Seite ${t.seite}), Menge nicht sicher lesbar">S. ${t.seite}</td>`) : B.length ? '<td></td>' : '';
    return `<tr class="${p.id === amPos ? 'sel akt' : ''}" data-ampos="${p.id}" style="cursor:pointer"><td class="baumz"><div class="bz" style="padding-left:${(R0 + AMD(p.id)) * 1.15}rem">${IC.pos}<span class="oz" style="margin:0 .5rem 0 .3rem">${esc(p.oz)}</span><span>${esc(p.kurz)}</span>${p.nt ? `<span class="badge nt">${esc(p.nt)}</span>` : ''}</div></td><td class="r">${nf(p.menge)} ${esc(p.einheit)}</td>${fz}${amZw ? '<td class="am-rw"></td>' : ''}<td class="r${z1 ? ' am-mi' : ''}"${pct != null && m ? ` title="${pct} % der LV-Menge${pct > 110 ? ' – über 10 % mehr: neuer Preis kann verlangt werden (VOB/B § 2 Abs. 3)' : ''}"` : ''}>${z1 && z1.neu ? `<input class="am-zwi am-mz" data-amneupos="${esc(p.id)}" value="" placeholder="–" title="Menge oder Rechenweg direkt eintragen (Enter speichert und geht zur nächsten Position)" aria-label="aufgemessen">` : z1 ? `<input class="am-zwi am-mz" data-am="formel" data-id="${z1.id}" value="${esc(/^[\d.,\s]+$/.test(z1.formel || '') ? z1.formel : nf(m))}" data-rw="${esc(z1.formel)}" title="Nur eine Aufmaßzeile: Menge oder Rechenweg direkt hier ändern (Enter speichert)${/^[\d.,\s]+$/.test(z1.formel || '') ? '' : ' = ' + nf(m)}" aria-label="aufgemessen">` : m ? nf(m) : ''}${amUeberBalken(pct)}</td><td class="r"${fe != null && e != null && Math.abs(fe - e) > 0.005 ? ` style="color:#e07b3a;font-weight:600" title="EP lt. Firma ${nf2(fe)}"` : ''}>${e != null ? nf2(e) : ''}</td><td class="r">${m && e != null ? nf2(m * e) : ''}</td></tr>`
      + (amZw ? L.aufmass.filter((z) => z.pos_id === p.id).sort((a, b) => a.id - b.id).map((z) => `<tr class="am-zw" data-ampos="${p.id}"><td class="baumz"><div class="bz" style="padding-left:${(R0 + 1) * 1.15 + 1.1}rem"><span class="am-zwd">${esc(amDatumZeig(z.datum))}${z.ort ? ' · ' + esc(z.ort) : ''}</span></div></td><td></td>${B.length ? '<td></td>' : ''}<td class="am-rw"><input class="am-zwi" data-am="formel" data-id="${z.id}" value="${esc(z.formel)}" title="Rechenweg – direkt hier ändern, Enter speichert und geht zur nächsten Zeile" aria-label="Rechenweg"></td><td class="r">${nf(z.menge)}</td><td></td><td></td></tr>`).join('') : ''); });
  const liste = amBaumZeilen(LI, listeZ, TB, R0, (B.length ? 6 : 5) + (amZw ? 1 : 0));   // LV-Gliederung (Titel) zwischen Rechnung und Positionen
  setTimeout(amSichtbar, 0);   // nach dem Neuzeichnen: aktive Position in der Liste sichtbar
  const ep = VP[amPos], t = B.length ? amTreffer(amPos) : null, diff = t && t.menge != null ? t.menge - sum : 0;
  const firma = !B.length ? '' : `<div class="am-firma">${!t ? '<span class="hint">In der PDF der Firma nicht gefunden.</span>'
    : `lt. Firma <span class="hint">(S. ${t.seite}${t.ki ? `, per KI zugeordnet ${Math.round(t.ki * 100)} %` : ''})</span>: ${t.menge != null ? `<b>${nf(t.menge)} ${esc(x.einheit)}</b>${t.ep != null ? ` · EP ${nf2(t.ep)}` : ''}${t.gp != null ? ` · GP ${nf2(t.gp)}` : ''}` : 'gefunden, Menge nicht sicher lesbar'}
      ${t.ep != null && ep != null && Math.abs(t.ep - ep) > 0.005 ? ` <span style="color:#e07b3a;font-weight:600">EP weicht vom Auftrag ab (${nf2(ep)})</span>` : ''}
      ${t.menge != null ? (Math.abs(diff) > 1e-6 ? ` <button class="btn sm" data-amueb="${amPos}" title="Differenz als Aufmaßzeile „lt. Firma“ eintragen">Menge der Firma übernehmen (${diff > 0 ? '+' : ''}${nf(diff)})</button>` : ' <span style="color:var(--ok);font-weight:600">✓ stimmt mit dem Aufmaß</span>') : ''}`}</div>`;
  const nav = `<div class="am-nav"><button class="btn sm" data-amstep="-1"${idx <= 0 ? ' disabled' : ''} title="vorige Position (Alt+↑)">◀ vorige</button><span class="hint">${idx + 1} von ${LI.length}</span><button class="btn sm pri" data-amstep="1"${idx < 0 || idx >= LI.length - 1 ? ' disabled' : ''} title="nächste Position (Alt+↓)">nächste ▶</button></div>`;
  const detail = `<div class="card am-d"><div class="am-dk"><h3 style="margin:0 0 .2rem">${esc(x.oz)} ${esc(x.kurz)}</h3>${nav}</div>
        <p class="hint" style="margin:0 0 .4rem">${amArtHinweis(x)}LV-Menge ${nf(x.menge)} ${esc(x.einheit)} · aufgemessen <b>${nf(sum)} ${esc(x.einheit)}</b>${x.menge ? ` (${Math.round(sum / x.menge * 100)} %)${amUeberBalken(Math.round(sum / x.menge * 100), true)}` : ''}${ep != null ? ` · ${eur(sum * ep)} zum Auftrags-EP ${nf2(ep)} €` : vergeben() ? '' : ' · noch nicht vergeben'}</p>${firma}
        <div class="am-modus"><span class="seg" role="radiogroup" aria-label="Eingabe als"><button type="button" class="${AMSTAND ? '' : 'on'}" data-amstand="0" title="Jede Zeile ist das, was dazugekommen ist">+ Zuwachs</button><button type="button" class="${AMSTAND ? 'on' : ''}" data-amstand="1" title="Den neuen Gesamtstand tippen – die Plattform rechnet den Zuwachs aus">= Gesamtstand</button></span>
          ${AMSTAND ? `<span class="am-st" id="amSt" data-bisher="${sum}" data-lv="${x.menge || 0}" data-eh="${esc(x.einheit)}">bisher <b>${nf(sum)} ${esc(x.einheit)}</b> – neuen Gesamtstand unten eintippen</span>` : ''}</div>
        ${AMSTAND ? `<div class="am-bar" aria-hidden="true"><i class="a" style="width:${x.menge ? Math.min(100, sum / x.menge * 100) : 0}%"></i><i class="n" id="amBarN" style="left:${x.menge ? Math.min(100, sum / x.menge * 100) : 0}%;width:0"></i></div>` : ''}
        <table class="lv am am-ein"><thead><tr><th style="width:6.9rem" title="Datum (📅 oder tippen, z. B. 8.11.) oder freier Text, z. B. Blatt 3, KW 45">Datum / Text</th><th style="width:6.5rem" title="Ort oder Bauteil, z. B. EG Bad, Achse A–C">Ort / Bauteil</th><th>Rechenweg</th><th class="r" style="width:4.2rem">Menge</th><th style="width:2.4rem"></th></tr></thead><tbody>
        ${Z.map((a) => `<tr${a.quelle === 'beleg' ? ' class="am-lf" title="aus der PDF der Firma übernommen – prüfen"' : ''}><td class="am-dt"><input data-am="datum" data-id="${a.id}" value="${esc(amDatumZeig(a.datum))}" title="Datum (z. B. 8.11.) oder freier Text (z. B. KW 45, Okt. 2026)" autocomplete="off"><button type="button" class="am-cal" data-amcal title="Datum aus dem Kalender wählen">📅</button></td><td><input data-am="ort" data-id="${a.id}" value="${esc(a.ort)}"></td>
          <td><input data-am="formel" data-id="${a.id}" value="${esc(a.formel)}" placeholder="z. B. 2 × 3,50 × 2,75"></td><td class="r">${nf(a.menge)}</td><td><button class="ib" data-amdel="${a.id}" title="Zeile löschen">✕</button></td></tr>`).join('')}
        <tr><td class="am-dt"><input data-am-new="datum" value="${esc(amDatumZeig(((x) => (x && x[0] === new Date().toDateString() ? x[1] : ''))(LS.get('amDatum', null)) || new Date().toISOString().slice(0, 10)))}" title="Datum (z. B. 8.11.) oder freier Text (z. B. Blatt 3, KW 45) – gilt auch für die nächsten Zeilen" autocomplete="off"><button type="button" class="am-cal" data-amcal title="Datum aus dem Kalender wählen">📅</button></td><td><input data-am-new="ort" title="Ort oder Bauteil, z. B. EG Bad, Achse A–C"></td>
          <td><input data-am-new="formel" placeholder="${AMSTAND ? `neuer Gesamtstand, z. B. ${nf(Math.round(sum * 1.2) || 10)}` : 'z. B. 2 × 3,50 × 2,75'}" title="${AMSTAND ? 'Gesamtstand (Zahl oder Rechenweg) – gespeichert wird der Zuwachs seit dem bisherigen Stand' : 'Enter: speichern und nächste Position · Umschalt+Enter: speichern und weitere Zeile dieser Position'}"${AMSTAND ? ' class="am-stin"' : ''}></td><td class="r" id="amPrev"></td><td><button class="ib am-plus" data-amplus title="Zeile speichern und eine weitere Zeile dieser Position (wie Umschalt+Enter)">＋</button></td></tr></tbody></table>
        <div class="bar" style="margin-top:.6rem"><button class="btn sm" data-amraum="1" title="Flächen aus dem Raumbuch der Baukosten übernehmen">Aus dem Raumbuch …</button>
          <span class="hint">Rechenweg: <b>mal</b> mit × oder * (z. B. 2 × 3,50 × 2,75), Komma als Dezimalzeichen, Klammern, Abzüge mit – (z. B. 4 × 2,50 – 1,01 × 2,13). <b>Enter</b> speichert und geht zur nächsten Position, <b>Umschalt+Enter</b> für eine weitere Zeile dieser Position.</span></div></div>`;
  // Baum wie bei den Aufträgen: Projekt → LV → Rechnung → Positionen; die Eingabe steht im Bereich rechts (seite.js)
  const NCa = (B.length ? 6 : 5) + (amZw ? 1 : 0), pn = (PROJ.find((q) => q.id === pid) || {}).name || '';
  const mehr = `<tr><td colspan="${NCa}"><div class="bz" style="padding-left:${R0 * 1.15}rem"><button type="button" class="ib" data-amnt title="Leistung, die nicht im LV steht: kommt als Nachtrag „angemeldet“ in den Auftrag, Aufmaß gleich darunter erfassen">＋ Position (Nachtrag)</button></div></td></tr>`;
  const zeilen = [`<tr class="wurzel"><td class="baumz"><div class="bz"><span class="car">▾</span>${IC.proj}<b>${esc(pn)}</b></div></td><td colspan="${NCa - 1}"></td></tr>`];
  LIST.filter((y) => !y.archived && (y.vergeben || y.frei || y.id === L.id)).forEach((y) => {
    const on = y.id === L.id, offen = on || PJX.has(y.id);
    zeilen.push(`<tr class="wurzel lvz${on ? ' an' : ' zu'}" data-pjlv="${y.id}" style="cursor:pointer"><td class="baumz"><div class="bz" style="padding-left:1.15rem"><span class="car">${offen ? '▾' : '▸'}</span>${IC.lv}<b class="t">${esc([y.nr, y.name].filter(Boolean).join(' '))}</b><span class="hint" style="margin-left:.5rem">${esc(y.auftragnehmer || '')}</span></div></td><td colspan="${NCa - 2}"></td><td class="r">${y.auftrag ? nf2(y.auftrag) : ''}</td></tr>`);
    if (!offen) return;
    const RR = on ? L.rechnungen : (y.rechnungen || []);
    RR.forEach((k) => { const akt = on && R && R.id === k.id;
      zeilen.push(`<tr class="am-rz${akt ? ' an' : ''}" data-pjlv="${y.id}" data-pjsub="r${k.id}" style="cursor:pointer"><td class="baumz"><div class="bz" style="padding-left:2.3rem"><span class="car">${akt ? '▾' : '▸'}</span>${IC.ti}<span class="t"${akt ? ' style="font-weight:600"' : ''}>${esc(reTitel(k, y.id))} <span class="${k.status === 'geprueft' ? 'ok' : 'offen'}">${k.status === 'geprueft' ? '✓' : '●'}</span></span></div></td><td colspan="${NCa - 2}"></td><td class="r">${k.zahlung != null ? nf2(k.zahlung) : ''}</td></tr>`);
      if (akt) zeilen.push(liste + mehr); });
    if (on && !R) zeilen.push(liste + mehr);
  });
  zeilen.push(archivZeilen(NCa));
  const nB = B.length, ablage = R && R.status === 'geprueft' ? '' : `<div class="re-bel am-bel" data-amdrop>${B.map((b) => `<span class="re-b" title="${esc(b.ablage ? 'Im Projektordner: ' + b.ablage : 'nur in der Plattform gespeichert')}">📄 ${esc(b.name)}</span>`).join('')}<label class="re-bel-ziel${nB ? ' kl' : ''}" title="Rechnung oder Aufmaßblätter der Firma als PDF, Scan oder Foto – hierher ziehen oder klicken und auswählen"><span class="i">⤓</span><span>${nB ? 'weiteres Dokument hierher ziehen oder <u>auswählen</u>' : '<b>Aufmaß / Rechnung der Firma hierher ziehen</b> oder <u>auswählen</u> <small>· PDF, Scan oder Foto</small>'}</span><input type="file" accept=".pdf,application/pdf,image/*,.docx" multiple hidden data-ambeleg></label></div>`;   // wie in der Rechnung
  AMTEIL = { ein: ablage + detail, rech: R ? amSummenKarte(R) + amFehltKarte(R) + amZeilenKarte(R) : '' };
  return `<div class="am-split am-baum" data-amdrop title="PDF der Firma hierher ziehen oder unten links „Ablegen“"><div class="am-l"><div class="tblw"><table class="lv am baum bp-baum pjtree" data-sp="ava.am"><thead><tr><th style="min-width:16rem">Bezeichnung</th><th class="r">LV-Menge</th>${B.length ? '<th class="r" title="Menge lt. PDF der Firma">lt. Firma</th>' : ''}${amZw ? '<th class="am-rw" title="Rechenweg je Aufmaßzeile – hier direkt änderbar (Enter: nächste Zeile)">Rechenweg</th>' : ''}<th class="r">aufgemessen</th><th class="r" title="Einheitspreis des Auftrags (orange: die Firma rechnet mit einem anderen EP)">EP</th><th class="r">Betrag</th></tr></thead><tbody>${zeilen.join('')}</tbody></table></div></div></div>`;
}
/* Aufmaß: Schieber zwischen Positionen und Mengeneingabe (ohne PDF waagerecht verschieben, mit PDF die Höhe) – gemerkt, Doppelklick = Standard */
document.addEventListener('pointerdown', (e) => {
  const g = e.target.closest && e.target.closest('.am-sch, .am-sch-h'); if (!g || e.button !== 0) return;
  e.preventDefault(); g.setPointerCapture(e.pointerId); g.classList.add('on');
  const quer = g.classList.contains('am-sch'), box = g.parentElement, a = g.previousElementSibling, r0 = box.getBoundingClientRect(), s0 = a.getBoundingClientRect();
  g.onpointermove = (m) => { const v = quer ? Math.max(260, Math.min(r0.width - 280, s0.width + m.clientX - e.clientX)) : Math.max(120, Math.min(r0.height - 160, s0.height + m.clientY - e.clientY)); box.style.setProperty(quer ? '--amw' : '--amh', Math.round(v) + 'px'); };
  g.onpointerup = () => { g.onpointermove = null; g.classList.remove('on'); const v = parseInt(box.style.getPropertyValue(quer ? '--amw' : '--amh'), 10) || 0; LS.set(quer ? 'am.w' : 'am.h', v); };
});
document.addEventListener('dblclick', (e) => { const g = e.target.closest && e.target.closest('.am-sch, .am-sch-h'); if (!g) return; const quer = g.classList.contains('am-sch'); g.parentElement.style.removeProperty(quer ? '--amw' : '--amh'); LS.set(quer ? 'am.w' : 'am.h', 0); });

/* Rechnung ohne Nachfolger in ihrer Kette (Abschlag/Schluss bzw. Nachtrag bauen kumuliert aufeinander auf; Regie, frei geprüfte, Sicherheit stehen für sich) */
function reKette(r) { if (r.art === 'regie' || r.art === 'sicherheit' || (r.data && r.data.frei != null)) return null; return r.art === 'nachtrag' ? 'nachtrag' : 'haupt'; }
function reNachfolger(r) { const k = reKette(r); return !!k && L.rechnungen.some((y) => y.nr > r.nr && reKette(y) === k); }
/* Zeilen der PDF ohne LV-Position (Regie, Material …): in die Rechnung übernehmen */
function amFehltKarte(R) {   // Positionen der Rechnung, die im LV fehlen → als Nachträge (beauftragt) unter „Nachträge“
  const b = amBelege().find((y) => y.id === AMB); if (!b || !b.auslese || !R || R.status === 'geprueft') return '';
  const F = (b.auslese.bloecke || []).filter((y) => !y.titel && y.kurz && y.menge != null && !/rechnung|netto|brutto|summe|mwst|umsatzsteuer|übertrag/i.test(y.kurz));
  if (!F.length) return '';
  return `<div class="card am-zk"><b>${F.length} Position${F.length === 1 ? '' : 'en'} der Rechnung stehen nicht im LV</b> <span class="hint">${F.slice(0, 4).map((y) => esc([y.oz, y.kurz].filter(Boolean).join(' '))).join(' · ')}${F.length > 4 ? ' …' : ''}</span>
    <div class="bar" style="margin:.4rem 0 0"><button class="btn sm pri" data-ambpos="${b.id}" title="Unter dem Gliederungspunkt „Nachträge“ ins LV – mit Menge, Einheit und EP der Rechnung, Status „beauftragt“. Abwählen (ablehnen) im LV: dann zählt sie in der Rechnung nicht und ist in der PDF als abgelehnt markiert.">Als Nachträge ins LV übernehmen (beauftragt)</button></div></div>`;
}
function amZeilenKarte(R) {
  const Z = []; amBelege().filter((b) => b.id === AMB).forEach((b) => ((b.auslese && b.auslese.zeilen) || []).forEach((z) => Z.push({ ...z, bid: b.id })));
  if (!Z.length || !R) return '';
  const sum = Z.filter((z) => !z.pos).reduce((a, z) => a + (z.gp || 0), 0), g = R.status === 'geprueft', P = Object.fromEntries(posOf().map((x) => [x.id, x]));
  const kiName = { ollama: 'Ollama', claude: 'Claude', gemini: 'Gemini', chatgpt: 'ChatGPT', openai: 'ChatGPT' }[(window.BPHead && BPHead.ki) || ''] || '';
  const kiZ = (z, k) => z.pos && P[z.pos] ? `<div class="am-ki ok">→ ${esc(P[z.pos].oz)} ${esc((P[z.pos].kurz || '').slice(0, 40))} <b>✓ ${Math.round((z.p || 1) * 100)} %</b></div>`
    : z.vorschlag && P[z.vorschlag.pos] ? `<div class="am-ki vs" title="${esc(z.vorschlag.grund || '')}">→ ${esc(P[z.vorschlag.pos].oz)} ${esc((P[z.vorschlag.pos].kurz || '').slice(0, 40))}? <b>${Math.round(z.vorschlag.p * 100)} %</b> <button class="ib" data-amkiok="${k}" data-pos="${esc(z.vorschlag.pos)}" title="Zuordnung übernehmen">✓</button><button class="ib" data-amkiok="${k}" title="verwerfen">✕</button></div>` : '';
  const knopf = R.art === 'regie' ? `<span style="color:var(--ok);font-weight:600">✓ ${(R.data.zeilen || []).length} Zeilen stehen in der ${esc(reTitel(R))}</span> <button class="btn sm" data-tab="rechnungen">ansehen</button>`
    : g ? '' : `<button class="btn sm" data-ambpos="${AMB}" title="Jede Zeile wird eine neue LV-Position mit Menge, Einheit und EP der Firma – danach nach Aufmaß prüfen">Als Positionen ins LV</button><button class="btn sm pri" data-amz2="regie" title="Rechnung als Regierechnung führen – die Zeilen werden Stundenlohn-/Materialzeilen">Als Regierechnung übernehmen</button><button class="btn sm" data-amz2="frei" title="Ohne Aufmaß: Summe der Zeilen als geprüften Betrag eintragen">Summe frei übernehmen (${eur(sum)})</button>`;
  return `<div class="card am-zk"><b>In der PDF ohne LV-Position</b> <span class="hint">${Z.length} Zeile${Z.length === 1 ? '' : 'n'} · ${eur(sum)} netto${amBelege().some((b) => b.auslese && b.auslese.ocr) ? ' · per Texterkennung aus dem Scan – bitte prüfen' : ''}</span>
    <table class="lv am" style="margin:.4rem 0"><thead><tr><th>Text</th><th class="r">Menge</th><th>Einh.</th><th class="r">EP</th><th class="r">Betrag</th></tr></thead><tbody>
    ${Z.map((z, k) => `<tr data-amzl="${k}" style="cursor:pointer" title="in der PDF zeigen"${z.pos ? ' class="mu"' : ''}><td>${esc(z.text)}${kiZ(z, k)}</td><td class="r">${nf(z.menge)}</td><td>${esc(z.einheit || '')}</td><td class="r">${nf2(z.ep)}</td><td class="r">${nf2(z.gp)}</td></tr>`).join('')}</tbody></table>
    <div class="bar" style="margin:0">${g ? '' : `<button class="btn sm" data-amki title="Zeilen ohne Ordnungszahl per KI den LV-Positionen zuordnen – die KI wählst du beim Klick">🤖 Mit KI zuordnen${kiName ? ' (' + kiName + ')' : ''}</button>`}${knopf}</div></div>`;
}
async function amKi(bid, still) {
  const R = amRe(); if (!R) return;
  if (still && !(window.BPHead && BPHead.ki && BPHead.ki !== 'intern' && BPHead.kiImmer)) return;   // automatisch nur, wenn „immer diese KI“ gewählt ist
  if (!still) { const k = await kiWahl('Die Zeilen ohne Ordnungszahl den Positionen des LV zuordnen.', { hinweis: 'Die Zeilen der Rechnung und die Kurztexte des LV gehen an die gewählte KI – Ollama bleibt im Büro. Übernommen wird erst nach deiner Bestätigung.' }); if (!k) return; }
  const card = document.querySelector('.am-zk [data-amki]'); if (card) { card.disabled = true; card.textContent = '🤖 KI ordnet zu …'; }
  if (!still) toast('KI ordnet die Zeilen zu – mit Ollama kann das eine Minute dauern …');
  try { const d = await api(`api/belege/${bid}/ki`, 'POST', {}); L = d; render(); if (d.hinweis) toast(d.hinweis); }
  catch (e) { toast(e.message, true); if (card) { card.disabled = false; card.textContent = '🤖 Mit KI zuordnen'; } }
}
/* Summen der Firma gegen die Prüfung (links) – rechts in der PDF dieselben Haken und Kreuze */
function amRC(R) { return R && L.calc.rechnungen.find((r) => r.id === R.id); }
function amSummen(RC) { const ng = RC.leistung - RC.nachlass; return { ng, netto: [ng], mwst: [RC.mwst, ng * 0.19], brutto: [RC.brutto, ng * 1.19] }; }
function amSummenKarte(R) {
  const RC = amRC(R); if (!RC) return '';
  const S = []; amBelege().filter((b) => b.id === AMB).forEach((b) => ((b.auslese && b.auslese.kopf && b.auslese.kopf.summen) || []).forEach((su) => S.push({ ...su, bid: b.id })));
  const G = amSummen(RC), NAME = { netto: 'Netto' + (RC.einzeln ? '' : ' (kumuliert)'), mwst: 'Umsatzsteuer 19 %', brutto: 'Brutto / Endsumme' };
  const zeile = (art) => { const su = S.find((x) => x.art === art), g = G[art][0], ok = su && G[art].some((v) => Math.abs(su.wert - v) <= 1);
    return `<tr${su ? ` data-amsu="${art}" style="cursor:pointer" title="in der PDF zeigen"` : ''}><td>${NAME[art]}</td><td class="r">${su ? nf2(su.wert) : '<span class="hint">–</span>'}</td><td class="r">${nf2(art === 'brutto' ? RC.brutto : g)}</td><td style="text-align:center;font-weight:700;color:${ok ? 'var(--ok)' : '#e02424'}">${su ? (ok ? '✔' : '✘') : ''}</td></tr>`; };
  return `<div class="card am-zk"><b>Summen</b> <span class="hint">lt. Firma gegen die Prüfung${S.length ? '' : ' – in der PDF nicht erkannt'}</span>
    <table class="lv am" style="margin:.35rem 0 0"><thead><tr><th></th><th class="r">lt. Firma</th><th class="r">geprüft</th><th></th></tr></thead><tbody>${['netto', 'mwst', 'brutto'].map(zeile).join('')}
    <tr><td colspan="2" class="hint">Zahlbetrag netto lt. Prüfung</td><td class="r"><b>${nf2(RC.zahlung)}</b></td><td></td></tr></tbody></table></div>`;
}
/* Abhaken direkt im Dokument: ein Klick auf eine freie Stelle setzt dort einen Haken, ein Klick auf den Haken nimmt ihn weg.
   Errechnete Zeichen gibt es nur an erkannten Positionen und Summen (✔ stimmt mit der Prüfung, ✘ weicht ab, ○ noch nicht geprüft) – auch sie lassen sich von Hand abhaken. Gemerkt an der Rechnung (data.haken). */
const hkNah = (a, b) => a[0] === b[0] && a[1] === b[1] && Math.abs(a[2] - b[2]) < 0.006;
const hkLies = (R) => ((R && R.data && R.data.haken) || []).map((k) => { const q = String(k).split('|'); return [+q[0], +q[1], +q[2], +q[3]]; });
let AM_AUTO = LS.get('amAuto', true);   // automatische Zeichen in der PDF (je Browser gemerkt)
document.addEventListener('click', (e) => { if (!e.target.closest || !e.target.closest('[data-amauto]')) return; AM_AUTO = !AM_AUTO; LS.set('amAuto', AM_AUTO); amMarken(); const el = document.querySelector('.am-dok'); if (el) amDokReiter(el); });
function amMarken() {
  amMarken0();
  const V = AMV, R = amRe(); if (!V || !V.pages.length || !R) return;
  const b = amBelege().find((y) => y.id === V.bid), H = hkLies(R).filter((h) => h[0] === V.bid);
  V.el.querySelectorAll('.am-mk').forEach((d) => {   // errechnete Zeichen: anklickbar; von Hand abgehakt → ausblenden (das blaue ✔ steht dafür)
    const w = d.parentElement, se = V.pages.indexOf(w) + 1, y = parseFloat(d.style.top) / 100, x = (parseFloat(d.style.left) - 0.8) / 100;
    d.dataset.hk = `${V.bid}|${se}|${y.toFixed(4)}|${x.toFixed(4)}`;
    if (H.some((h) => hkNah(h, [V.bid, se, y]))) d.remove(); else if (!d.classList.contains('ok')) d.title = 'Klick: von Hand abhaken';
  });
  (R.data.haken || []).forEach((roh, i) => {   // von Hand gesetzte Haken: genau dort, wo geklickt wurde
    const h = hkLies(R)[i], w = h[0] === V.bid && V.pages[h[1] - 1]; if (!w) return;
    const d = document.createElement('div'); d.className = 'am-mk hk an'; d.dataset.hk = roh; d.style.left = Math.min(98, (h[3] + 0.012) * 100) + '%'; d.style.top = (h[2] * 100) + '%';
    d.innerHTML = hkBild(h[2] * 977 + h[3] * 131); d.title = 'von Hand abgehakt – Klick nimmt den Haken wieder weg'; w.appendChild(d); });
  const erst = () => AMV && AMV.el.querySelector('.am-mk');   // die ersten Male erklären, was die Farben heißen
  if (erst() && window.bpBlase) bpBlase(erst, '**Blauer Haken** = von dir gesetzt (Klick auf eine freie Stelle; Klick auf den Haken nimmt ihn weg).\n**Grüner Haken** = errechnet: Menge und Preis stimmen mit deiner Prüfung überein.\n**Rotes ✘** = weicht ab – das Schild zeigt deinen Wert.', { key: 'ava.haken', mal: 3 });
}
/* Haken wie mit dem Stift gezogen – jeder ein wenig anders geneigt (aus der Lage errechnet, damit er beim Neuzeichnen gleich bleibt) */
const hkBild = (k) => `<svg viewBox="-9 -13 23 22" style="transform:rotate(${(((Math.abs(k) * 9301 + 49297) % 233280) / 233280 * 16 - 8).toFixed(1)}deg)"><path d="M-7,0 Q-4.5,2 -2.5,6 C0,0 5,-7 11,-10.5"/></svg>`;
document.addEventListener('click', async (e) => {
  let d = e.target.closest && e.target.closest('.am-mk[data-hk]'), hk = d && d.dataset.hk;
  if (!d) {   // freie Stelle auf der Seite: dort einen Haken setzen – für Handschrift und alles, was die Texterkennung nicht als Zahl gefunden hat
    const w = e.target.closest && e.target.closest('.am-pv .am-pg'); if (!w || !AMV || e.target.closest('.am-zz,a,button')) return;
    const q = w.getBoundingClientRect(), se = AMV.pages.indexOf(w) + 1; if (!se || !q.width) return;
    hk = `${AMV.bid}|${se}|${((e.clientY - q.top) / q.height).toFixed(4)}|${Math.max(0, (e.clientX - q.left) / q.width - 0.012).toFixed(4)}`;
  } else if (d.classList.contains('ok')) return;
  e.stopPropagation(); const R = amRe(); if (!R) return;
  const alt = (R.data.haken || []).slice(), neu = alt.includes(hk) ? alt.filter((q) => q !== hk) : [...alt, hk];   // Klick auf einen Haken nimmt genau diesen weg, sonst kommt einer dazu
  R.data.haken = neu; amMarken();
  try { await api('api/rechnungen/' + R.id, 'PUT', { haken: neu }); } catch (er) { R.data.haken = alt; amMarken(); toast(er.message, true); }
});
function amMarken0() {
  const V = AMV; if (!V || !V.pages.length) return;
  V.el.querySelectorAll('.am-mk').forEach((x) => x.remove());
  if (!AM_AUTO) return;   // automatische Zeichen ausgeblendet – die von Hand gesetzten Haken bleiben (amMarken)
  const b = amBelege().find((y) => y.id === V.bid), A = b && b.auslese, R = amRe(), RC = amRC(R); if (!A || !RC) return;
  const VP = (L.vergabe && L.vergabe.preise) || {}, stand = R.status === 'geprueft' && R.data.stand ? R.data.stand : L.calc.aufmass || {}, M = [];
  const geprueft = new Set(L.aufmass.map((a) => a.pos_id)), irgendwas = geprueft.size > 0 || R.status === 'geprueft';
  for (const [pid, t] of Object.entries(A.pos || {})) { if (t.menge == null) continue; const m = stand[pid] || 0, ep = VP[pid];
    const okE = ep == null || t.ep == null || Math.abs(t.ep - ep) < 0.005;
    const xi = posOf().find((y) => y.id === pid); if (xi && xi.nt && xi.nt_status === 'abgelehnt') { M.push([t, false, `Nachtrag ${xi.nt} abgelehnt`]); continue; }
    if (!geprueft.has(pid) && R.status !== 'geprueft') { M.push([t, okE ? null : false, okE ? '' : `EP Auftrag ${nf2(ep)}`]); continue; }   // noch nicht aufgemessen: offen (nur EP schon prüfbar)
    const okM = Math.abs(t.menge - m) < 1e-6; M.push([t, okM && okE, [okM ? '' : `geprüft ${nf(m)}`, okE ? '' : `EP Auftrag ${nf2(ep)}`].filter(Boolean).join(' · ')]); }
  if (R.art === 'regie') for (const t of A.zeilen || []) { const z = (R.data.zeilen || []).find((y) => (y.text || '').trim().toLowerCase() === t.text.trim().toLowerCase());
    if (!z) { M.push([t, false, 'nicht anerkannt']); continue; } const ok = Math.abs((z.menge || 0) - t.menge) < 1e-6 && Math.abs((z.ep || 0) - t.ep) < 0.005; M.push([t, ok, ok ? '' : `${nf(z.menge)} × ${nf2(z.ep)}`]); }
  const G = amSummen(RC);
  for (const su of (A.kopf && A.kopf.summen) || []) { const ok = G[su.art].some((v) => Math.abs(su.wert - v) <= 1); M.push([su, ok ? true : irgendwas || R.art === 'regie' ? false : null, ok || !(irgendwas || R.art === 'regie') ? '' : su.art === 'brutto' ? `Zahlung lt. Prüfung ${nf2(RC.brutto)}` : `geprüft ${nf2(G[su.art][0])}`]); }
  for (const [t, ok, txt] of M) { const w = V.pages[t.seite - 1]; if (!w) continue; const d = document.createElement('div'); d.className = 'am-mk ' + (ok === null ? 'of' : ok ? 'ok' : 'no');
    d.style.left = Math.min(97, t.box[2] * 100 + 0.8) + '%'; d.style.top = ((t.box[1] + t.box[3]) / 2 * 100) + '%'; if (ok) d.title = 'errechnet: stimmt mit der Prüfung überein'; d.innerHTML = (ok === null ? '○' : ok ? hkBild(t.box[1] * 977 + t.box[2] * 131) : '✘') + (txt ? `<small>${esc(txt)}</small>` : ''); w.appendChild(d); }
}
function amZeigeBox(bid, seite, box) {
  if (!AMV || AMV.bid !== bid) { AMB = bid; LS.set('amB', AMB); AMV = null; amPdfMount(); return; }
  amPdfZeige(null, false, { seite, box, bid });
}
/* PDF-Ansicht (pdf.js), bleibt beim Neuzeichnen der Ansicht erhalten */
/* Bereich rechts in Aufmaßprüfung und Rechnungen (seite.js): Reiter „Auftrag“ (nur Rechnungen) und „📄 Dokument“ (PDF der Firma) */
/* PDF der Firma von der Rechnung entfernen: liegt danach im Papierkorb – „Rückgängig“ holt sie samt Haken zurück (im Projektordner bleibt sie ohnehin) */
async function belegWeg(bid) {
  const id = L.id; let pk = null;
  try { pk = (await call('api/belege/' + bid, 'DELETE')).papierkorb; AMV = null; render(); } catch (er) { toast(er.message, true); return; }
  rueckgaengig('Rechnungs-PDF entfernt', async () => { if (!pk) return; await api(`api/bp/papierkorb/${pk}/zurueck`, 'POST'); if (L && L.id === id) { L = await api('api/lv/' + id); AMV = null; render(); } });
}
function amPdfMount() {
  const sp = document.querySelector(tab === 'rechnungen' ? '#view .re-sp' : '#view .am-split'); if (!sp) return;
  const R = [];
  if (tab === 'rechnungen') { R.push({ id: 'rech', titel: 'Rechnung', mount: (el) => { el.innerHTML = `<div class="sr-pad re2-ed">${RETEIL}</div>`; } });
    if (L && (vergeben() || aufgehoben())) R.push({ id: 'auftrag', titel: 'Auftrag', mount: (el) => { el.innerHTML = `<div class="sr-pad">${RESUM}${auftragKarte()}</div>`; } }); }
  if (tab === 'aufmass' && sp.classList.contains('am-baum')) R.push({ id: 'ein', titel: 'Aufmaß', fenster: false, mount: (el) => { el.innerHTML = `<div class="sr-pad">${AMTEIL.ein || ''}</div>`; } });
  const d = amDokDef(); if (d) R.push(d);
  if (tab === 'aufmass' && sp.classList.contains('am-baum') && AMTEIL.rech) R.push({ id: 'rech', titel: 'Rechnung', mount: (el) => { el.innerHTML = `<div class="sr-pad">${AMTEIL.rech}</div>`; } });
  seite(sp, tab === 'rechnungen' ? 're' : 'am', R, { start: tab === 'aufmass' ? 'ein' : 'rech', w: tab === 'aufmass' ? 0.58 : 0.3, wechsel: () => { uLeisteNeu(); requestAnimationFrame(randUnten); } });
}
/* PDF der Firma als Reiter „📄 Dokument“ – die Ansicht (pdf.js) bleibt beim Neuzeichnen erhalten */
function amDokDef() {
  const B = amBelege(); if (!B.length) return null;
  if (!B.some((b) => b.id === AMB)) AMB = (B.find((b) => b.auslese && Object.keys(b.auslese.pos || {}).length) || B[0]).id;
  if (!AMV || AMV.bid !== AMB) { AMV = { bid: AMB, el: document.createElement('div'), pages: [], zoom: LS.get('amZoom', 1) }; AMV.el.className = 'am-pv'; AMV.el.innerHTML = '<p class="hint" style="color:#fff">Lade PDF …</p>'; amPdfLaden(AMV); }
  const b = B.find((y) => y.id === AMB), A = b.auslese;
  if ((!A || !A.zahlen || !A.kopf || !A.kopf.summen) && !(A && (A.laeuft || A.stand >= 2))) { AMNEU.add(AMB); if (AMNEU.size < 20 && !AMNEU.has('x' + AMB)) { AMNEU.add('x' + AMB); api(`api/belege/${AMB}/auslesen`, 'POST').then((d) => { L = d; AMV = null; render(); }).catch(() => {}); } }   // ältere PDFs neu lesen
  const neu = () => AMV && AMV.pdf && amPdfZeichnen(AMV).then(() => { amMarken(); amPdfZeige(amPos, true); });
  return { id: 'dok', titel: '📄 Dokument', mount: amDokReiter, neu };
}
function amDokReiter(el) {   // Inhalt des Reiters: Wahl der PDF, Hinweise, Zoom – darunter die Seiten
  const B = amBelege(), b = B.find((y) => y.id === AMB) || B[0], A = b && b.auslese; if (!b) return;
  const kn = A && A.ki ? ({ ollama: 'Ollama (im Büro)', claude: 'Claude', gemini: 'Gemini', chatgpt: 'ChatGPT', openai: 'ChatGPT' }[A.ki.anbieter] || A.ki.anbieter) : '';
  const kurz = !A ? '' : A.laeuft ? 'Texterkennung läuft …' : A.text === false ? 'Scan ohne Text' : `${A.ocr ? 'Scan · ' : ''}${Object.keys(A.pos || {}).length} Positionen${(A.zeilen || []).length ? ` + ${A.zeilen.length} Zeilen` : ''} erkannt`;
  const lang = [A && A.ocr ? 'Scan, per Texterkennung gelesen (Tesseract auf dem Server der Plattform – keine KI).' : '', kn ? `Zuordnung per KI: ${kn} (${A.ki.sicher} sicher${A.ki.vorschlag ? `, ${A.ki.vorschlag} Vorschläge` : ''}).` : '',
    'Von selbst gesetzt wird nur an erkannten Positionen und Summen: ✔ Menge und Preis stimmen mit deiner Prüfung überein · ✘ weicht ab – das kleine Schild zeigt deinen Wert · ○ erkannt, aber noch nicht geprüft.', 'Zahlen anklicken übernimmt sie in den Rechenweg.', 'Ein Klick auf eine freie Stelle setzt dort deinen Haken, ein Klick auf den Haken nimmt ihn wieder weg.'].filter(Boolean).join('\n');
  el.classList.add('am-dok');   // eine Zeile: Wahl der PDF · Stand (Erklärung im Tooltip) · Werkzeuge
  el.innerHTML = `<div class="am-pk">${B.map((y) => `<button class="btn sm${y.id === AMB ? ' pri' : ''}" data-amb="${y.id}" title="${esc(y.name)}">${esc(y.name.length > 28 ? y.name.slice(0, 26) + '…' : y.name)}</button>`).join('')}
    <span class="am-st" title="${esc(lang)}">${esc(kurz)}${kurz ? ' · ' : ''}<b style="color:#1f9d4c">✔</b> <b style="color:#e02424">✘</b> ○ <span class="am-i">ⓘ</span></span>
    <button class="btn sm" data-amauto title="${AM_AUTO ? 'Die automatisch gesetzten Zeichen (grünes ✔, rotes ✘, ○) aus der PDF nehmen – deine eigenen blauen Haken bleiben' : 'Automatische Zeichen wieder zeigen'}">${AM_AUTO ? 'Auto-Haken weg' : 'Auto-Haken zeigen'}</button>    <button class="ib" data-amneu="${AMB}" title="Die PDF noch einmal lesen (bei Scans mit Texterkennung)">↻</button><button class="ib" data-amz="-1" title="kleiner">−</button><button class="ib" data-amz="1" title="größer">＋</button><button class="ib" data-ambdel="${AMB}" title="PDF der Firma von dieser Rechnung entfernen (lässt sich rückgängig machen)">🗑</button></div>`;
  el.appendChild(AMV.el);
  if (AMV.pdf) { amMarken(); amPdfZeige(amPos); }
}
async function amPdfLaden(V) {
  try { const lib = await pdfjs(); V.pdf = await lib.getDocument({ isEvalSupported: false, url: 'api/belege/' + V.bid, withCredentials: true }).promise; } catch (e) { V.el.innerHTML = `<p class="hint" style="color:#fff">PDF lässt sich nicht anzeigen: ${esc(e.message)}</p>`; return; }
  if (AMV !== V) return;
  await amPdfZeichnen(V); amMarken(); amPdfZeige(amPos, true);
}
async function amPdfZeichnen(V) {
  V.el.innerHTML = ''; V.pages = [];
  const w = Math.max(300, (V.el.clientWidth || 600) - 20), dpr = window.devicePixelRatio || 1;
  for (let n = 1; n <= Math.min(V.pdf.numPages, 60); n++) {
    const pg = await V.pdf.getPage(n), vp1 = pg.getViewport({ scale: 1 }), sc = w / vp1.width * V.zoom, vp = pg.getViewport({ scale: sc * dpr });
    const wrap = document.createElement('div'); wrap.className = 'am-pg'; wrap.style.width = vp1.width * sc + 'px'; wrap.style.height = vp1.height * sc + 'px';
    const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; cv.style.width = '100%'; cv.style.height = '100%';
    wrap.appendChild(cv); V.el.appendChild(wrap); V.pages.push(wrap);
    await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    if (AMV !== V) return;
    const b = amBelege().find((y) => y.id === V.bid), zs = (b && b.auslese && b.auslese.zahlen && b.auslese.zahlen[n]) || [];
    zs.forEach(([x0, y0, x1, y1, w]) => { const d = document.createElement('div'); d.className = 'am-zz'; d.dataset.v = w; d.title = `${nf(w)} in den Rechenweg übernehmen`;
      Object.assign(d.style, { left: x0 * 100 + '%', top: y0 * 100 + '%', width: (x1 - x0) * 100 + '%', height: (y1 - y0) * 100 + '%' }); wrap.appendChild(d); });
  }
}
function amPdfZeige(pid, sofort, direkt) {
  const V = AMV; if (!V || !V.pages.length) return;
  const t = direkt || amTreffer(pid); V.el.querySelectorAll('.am-hl').forEach((h) => h.remove());
  if (!t) return;
  if (t.bid !== V.bid) return;   // steht in der anderen PDF – Reiter oben wechselt
  const wrap = V.pages[t.seite - 1]; if (!wrap) return;
  const [x0, y0, x1, y1] = t.box, hl = document.createElement('div'); hl.className = 'am-hl';
  Object.assign(hl.style, { left: `calc(${x0 * 100}% - 4px)`, top: `calc(${y0 * 100}% - 3px)`, width: `calc(${(x1 - x0) * 100}% + 8px)`, height: `calc(${(y1 - y0) * 100}% + 6px)` });
  wrap.appendChild(hl);
  V.el.scrollTo({ top: wrap.offsetTop + y0 * wrap.offsetHeight - V.el.clientHeight * 0.3, behavior: sofort ? 'auto' : 'smooth' });
}
/* Aufmaßprüfung: Leistung, die nicht im LV steht → Nachtrag „angemeldet“ in den Auftrag (mit EP), dann gleich ihr Aufmaß erfassen */
function amNachtragNeu() {
  if (!L) return;
  const frei = !!(L.vergabe && L.vergabe.frei && !Object.keys(L.vergabe.preise || {}).length);
  modalBox(`<h3>Position als Nachtrag</h3><p class="hint" style="margin:0 0 .7rem">Kommt als Nachtrag „beauftragt“ in den Auftrag${frei ? ' (Auftrag ohne LV-Preise: ohne Preis, nur zur Dokumentation)' : ' und zählt je nach Einstellung gleich oder erst nach Beauftragung in der Rechnung'}. Danach das Aufmaß erfassen.</p>
    <div class="fm"><label>Kurztext</label><input id="ntK" placeholder="z. B. Mehrmenge Bodenaustausch"></div>
    <div class="nlf" style="grid-template-columns:repeat(3,minmax(0,1fr))"><label>LV-Menge<input id="ntM" inputmode="decimal" placeholder="0"></label><label>Einheit<input id="ntE" value="m2" data-vs="eh" autocomplete="off"></label><label>EP €${frei ? ' (entfällt)' : ''}<input id="ntP" inputmode="decimal"${frei ? ' disabled' : ''}></label></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Als Nachtrag anlegen</button></div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const kurz = bg.querySelector('#ntK').value.trim(); if (!kurz) { bg.querySelector('#ntK').focus(); return; }
    const I = L.data.items, id = uid(), n = I.filter((x) => x.nt).length + 1, ep = pf(bg.querySelector('#ntP').value);
    const p = { id, typ: 'pos', art: 'N', oz: '', kurz, lang: '', menge: pf(bg.querySelector('#ntM').value) || 0, einheit: bg.querySelector('#ntE').value.trim() || 'psch' };
    if (ep != null) p.ep_s = ep;
    if (!frei) { p.nt = 'NT' + n; p.nt_status = 'beauftragt'; }
    close(); await flush(); I.push(p); numerieren();
    try { await saveNow(); if (!frei && ep != null) await saveVp(id, ep); } catch (e) { return toast(e.message, true); }
    amPos = id; LS.set('amPos', amPos); amNur = false; LS.set('amNur', false); amNurR = false; LS.set('amNurR', false); render(); toast(frei ? 'Position im LV angelegt – jetzt das Aufmaß erfassen.' : `Als Nachtrag ${p.nt} angelegt – jetzt das Aufmaß erfassen.`);
    setTimeout(() => { const f = document.querySelector('[data-am-new="formel"]'); if (f) f.focus(); }, 80);
  });
  setTimeout(() => { const i = document.querySelector('#ntK'); if (i) i.focus(); }, 50);
}
/* PDF der Firma noch einmal lesen – bei Scans läuft die Texterkennung im Hintergrund, unten steht ein Hinweis mit Abbrechen */
async function belegNeuLesen(bid) {
  const lvId = L.id; AMNEU.add(bid); AMNEU.add('x' + bid);   // kein zusätzliches automatisches Nachlesen
  try { L = await api(`api/belege/${bid}/auslesen`, 'POST'); } catch (e) { return toast(e.message, true); }
  AMV = null; render();
  const lauf = () => { const b = L && L.rechnungen.flatMap((r) => r.belege || []).find((y) => y.id === bid); return !!(b && b.auslese && b.auslese.laeuft); };
  if (!lauf()) return toast('Neu gelesen.');
  const el = document.createElement('div'); el.className = 'ava-job'; el.innerHTML = '<span class="wspin" style="width:14px;height:14px;vertical-align:-2px"></span> Texterkennung läuft <small style="opacity:.75" title="Tesseract auf dem Server der Plattform – keine KI">(Tesseract, ohne KI)</small> …<button type="button" class="btn sm" data-j="ab">Nicht warten</button>'; document.body.appendChild(el);
  let stop = false; el.addEventListener('click', (e) => { if (e.target.closest('[data-j]')) stop = true; });
  try { for (let k = 0; k < 200 && !stop; k++) { await new Promise((ok) => setTimeout(ok, 3000)); if (stop) break; const x = await api('api/lv/' + lvId).catch(() => null); if (!x) continue; const b = x.rechnungen.flatMap((r) => r.belege || []).find((y) => y.id === bid); if (b && !(b.auslese && b.auslese.laeuft)) { if (L && L.id === lvId) { L = x; AMV = null; render(); } toast('Texterkennung fertig.'); break; } } }
  finally { el.remove(); }
}
/* Rechnung ohne Aufmaß: Positionen von Hand (Kurztext, Menge, EH, EP) – die Summe ist der geprüfte Betrag */
async function reVonHand(rid) {
  const r = L.rechnungen.find((x) => x.id === rid); if (!r) return;
  const body = { zeilen: (r.data.zeilen || []).length ? r.data.zeilen : [{ text: '', menge: null, einheit: '', ep: null }] };
  if (r.data.frei == null) body.frei = r.gefordert || 0;
  PJSEL = 'r' + rid; tab = 'rechnungen'; LS.set('tab', tab);
  try { await call('api/rechnungen/' + rid, 'PUT', body); } catch (e) { return toast(e.message, true); }
  setTimeout(() => { const i = document.querySelector(`[data-reid="${rid}"] [data-re="z-text"]`); if (i) { i.focus(); window.BPHead?.achtung?.(i.closest('table'), { bis: i.closest('.card') }); } }, 60);
}
/* Positionen von Hand ins LV zurückführen (Kostenkontrolle): mit Auftragspreisen als Nachtrag „angemeldet“ samt EP,
   bei frei eingetragenem Auftrag (Summe ohne LV) nur zur Dokumentation ohne Preis – sonst zählte es doppelt */
async function reZeilenInsLv(rid, nur) {
  const r = L.rechnungen.find((x) => x.id === rid); if (!r) return;
  const zs = (r.data.zeilen || []).map((z) => ({ ...z })), ks = (nur != null ? [nur] : zs.map((_, k) => k)).filter((k) => !zs[k].pos && (zs[k].text || '').trim());
  if (!ks.length) return toast('Nichts zu übernehmen – alle Positionen stehen schon im LV.');
  const frei = !!(L.vergabe && L.vergabe.frei && !Object.keys(L.vergabe.preise || {}).length);
  const t = frei ? `${ks.length === 1 ? 'Position' : ks.length + ' Positionen'} ins LV übernehmen?\nDer Auftrag ist frei mit einer Summe eingetragen – die Positionen kommen ohne Preis ins LV (nur zur Dokumentation), sonst zählten sie in der Kostenkontrolle doppelt.`
    : `${ks.length === 1 ? 'Position' : ks.length + ' Positionen'} als Nachtrag ins LV übernehmen?\nSie stehen dann als Nachtrag „beauftragt“ mit dem Einheitspreis der Rechnung im LV und zählen in der Kostenkontrolle (Prognose). Ablehnen im LV – dann zählt er in der Rechnung nicht.`;
  if (!(await bpFrage(t, { ok: frei ? 'Ins LV übernehmen' : 'Als Nachtrag übernehmen' }))) return;
  await flush(); const I = L.data.items; let n = I.filter((x) => x.nt).length; const preise = {};
  for (const k of ks) { const z = zs[k], id = uid();
    const p = { id, typ: 'pos', art: 'N', oz: '', kurz: z.text.trim(), lang: `aus ${reTitel(r)}${r.re_nr ? ' Nr. ' + r.re_nr : ''}`, menge: z.menge ?? 1, einheit: z.einheit || 'psch' };
    if (z.ep != null) p.ep_s = z.ep;   // EP der Rechnung auch als Schätzpreis
    if (!frei) { p.nt = 'NT' + (++n); p.nt_status = 'beauftragt'; if (z.ep != null) preise[id] = z.ep; }
    I.push(p); z.pos = id; }
  try { await saveNow(); if (Object.keys(preise).length) await api('api/lv/' + L.id, 'PUT', { vergabe: { preise } }); await call('api/rechnungen/' + rid, 'PUT', { zeilen: zs }); toast(frei ? 'Ins LV übernommen.' : 'Als Nachtrag ins LV übernommen – steht in der Kostenkontrolle.'); }
  catch (e) { toast(e.message, true); }
}
async function amBelegHoch(files) {
  files = [...files].filter((f) => /\.(pdf|jpe?g|png|tiff?|docx)$/i.test(f.name) || /^(application\/pdf|image\/)/.test(f.type));
  if (!files.length) return toast('Bitte eine PDF-Datei, einen Scan oder ein Foto wählen.', true);
  if (!vergeben()) return toast('Erst vergeben: geprüft wird gegen die Preise des Auftrags.', true);
  let R = L.rechnungen.find((r) => r.status !== 'geprueft'), reNeu = false;
  if (!R) { try { await call(`api/lv/${L.id}/rechnungen`, 'POST', { art: 'abschlag' }); } catch (e) { return toast(e.message, true); } R = L.rechnungen.find((r) => r.status !== 'geprueft'); if (!R) return; reNeu = true; }
  const vorher = new Set((R.belege || []).map((b) => b.id));
  for (const f of files) {
    const fd = new FormData(); fd.append('datei', f); toast(`„${f.name}“ wird gelesen und im Projektordner abgelegt …`);
    if (AMABL) { fd.append('art', AMABL.art || 'rechnung'); if (AMABL.ordner) fd.append('ordner', JSON.stringify(AMABL.ordner)); if (AMABL.name) fd.append('name_hand', AMABL.name); }
    try { const r = await fetch(`api/rechnungen/${R.id}/beleg`, { method: 'POST', body: fd, credentials: 'same-origin' }); const d = await jsonAus(r); if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status); L = d; }
    catch (e) { toast(e.message, true); return; }
  }
  let R2 = L.rechnungen.find((r) => r.id === R.id), nb = R2.belege[R2.belege.length - 1];
  {   // dahin springen, wo die Datei angekommen ist: Rechnung im Baum markiert, rechts das Dokument – und „Rückgängig“ nimmt sie wieder weg
    const neu = R2.belege.filter((b) => !vorher.has(b.id)).map((b) => b.id), lvId0 = L.id, rid0 = R.id, wo = `${reTitel(R2)} · LV ${L.nr} ${L.name}`;
    PJSEL = 'r' + R.id; AMB = nb.id; AMV = null; tab = 'aufmass'; amAns = 'erfassen'; render(); seiteReiter('am', 'dok');
    toast(`${files.length > 1 ? files.length + ' Dateien liegen' : '„' + files[0].name + '“ liegt'} bei: ${wo}`);
    rueckgaengig(`PDF abgelegt bei ${wo}`, async () => {
      for (const id of neu) await api('api/belege/' + id, 'DELETE').catch(() => {});
      if (reNeu) await api('api/rechnungen/' + rid0, 'DELETE').catch(() => {});   // die dafür angelegte Rechnung mit weg
      if (L && L.id === lvId0) { L = await api('api/lv/' + lvId0); AMV = null; if (PJSEL === 'r' + rid0 && reNeu) PJSEL = null; await refreshList(); render(); } });
  }
  if (nb.auslese && nb.auslese.laeuft) {   // Scan/Foto: Texterkennung läuft im Hintergrund
    const el = document.createElement('div'); el.className = 'ava-job'; el.innerHTML = '<span class="wspin" style="width:14px;height:14px;vertical-align:-2px"></span> Eingescannte Rechnung – Texterkennung läuft <small title="Tesseract auf dem Server der Plattform – keine KI, die Rechnung verlässt das Büro nicht" style="opacity:.75">(Tesseract, ohne KI)</small> <b class="jst"></b> …<button type="button" class="btn sm" data-j="hand" title="Nicht warten: die Rechnung gleich ohne Aufmaß mit Positionen von Hand erfassen">Von Hand erfassen</button><button type="button" class="btn sm" data-j="ab" title="Nicht mehr warten – die PDF bleibt an der Rechnung">Abbrechen</button>'; document.body.appendChild(el);
    const lvId = L.id; let stop = '';
    el.addEventListener('click', (e) => { const j = e.target.closest('[data-j]'); if (j) stop = j.dataset.j; });
    try { for (let k = 0; k < 800 && (!stop || stop === 'neu'); k++) { await new Promise((ok) => setTimeout(ok, 1500)); if ((stop && stop !== 'neu') || (k % 2 && stop !== 'neu')) continue; const x = await api('api/lv/' + lvId).catch(() => null); const b2 = x && x.rechnungen.flatMap((r) => r.belege || []).find((b) => b.id === nb.id); if (b2 && !(b2.auslese && b2.auslese.laeuft)) { if (L && L.id === lvId) L = x; break; }
      const A2 = (b2 && b2.auslese) || {}, st = el.querySelector('.jst'); if (st) st.textContent = A2.stand_N ? `Seite ${A2.stand_n} von ${A2.stand_N}` : '';
      const zuletzt = Date.parse(A2.stand_zeit || A2.seit || '') || 0;
      if (zuletzt && Date.now() - zuletzt > 180000 && !el.querySelector('[data-j="neu"]')) {   // 3 Minuten ohne Fortschritt: hängt (z. B. Server neu gestartet)
        if (st) st.textContent = 'scheint zu hängen'; const nb_ = document.createElement('button'); nb_.type = 'button'; nb_.className = 'btn sm pri'; nb_.dataset.j = 'neu'; nb_.textContent = '↻ Neu starten'; nb_.title = 'Texterkennung noch einmal starten'; el.insertBefore(nb_, el.querySelector('[data-j]'));
      }
      if (stop === 'neu') { stop = ''; el.querySelector('[data-j="neu"]')?.remove(); if (st) st.textContent = 'startet neu …'; await api(`api/belege/${nb.id}/auslesen`, 'POST').catch(() => {}); } } }
    finally { el.remove(); }
    if (!L || L.id !== lvId) return;
    if (stop === 'hand') return reVonHand(R.id);
    if (stop) return toast('Texterkennung nicht abgewartet – die PDF hängt an der Rechnung.');
    R2 = L.rechnungen.find((r) => r.id === R.id); nb = R2 && R2.belege.find((b) => b.id === nb.id); if (!nb) return;
  }
  AMB = nb.id; LS.set('amB', AMB);
  const RC2 = (L.calc.rechnungen || []).find((x) => x.id === R.id);
  if ((RC2 && RC2.frei) || !posOf().length || (R2 && R2.art === 'regie')) {   // ohne Aufmaß: Rechnung mit der PDF daneben – Positionen von Hand
    AMV = null; PJSEL = 'r' + R.id;
    if (R2 && R2.art !== 'regie') return reVonHand(R.id);
    tab = 'rechnungen'; LS.set('tab', tab); render(); return;
  }
  amAns = 'erfassen';
  if (Object.values((nb.auslese && nb.auslese.pos) || {}).length) { amNurR = true; LS.set('amNurR', true); }
  const P = Object.keys((nb.auslese && nb.auslese.pos) || {}); if (P.length) { amPos = posOf().find((p) => P.includes(p.id)).id; LS.set('amPos', amPos); }
  render();
  if (nb.auslese && nb.auslese.text === false) return toast('In der Datei ist kein lesbarer Text – bitte Schritt für Schritt von Hand durchgehen.');
  await amUebernehmen(null, true);
  if ((nb.auslese.zeilen || []).length && window.BPHead && BPHead.ki && BPHead.ki !== 'intern') amKi(nb.id, true);   // übrige Zeilen gleich per KI zuordnen
}
/* Mengen der Firma als Aufmaßzeilen „lt. Firma“ (Differenz zum bisherigen Aufmaß); ein = nur diese Position, sonst alle mit Mehrforderung */
async function amUebernehmen(ein, auto) {
  const heute = new Date().toISOString().slice(0, 10), K = L.calc.aufmass || {}, zeilen = [];
  const pids = ein ? [ein] : posOf().map((p) => p.id);
  for (const pid of pids) {
    const t = amTreffer(pid); if (!t || t.menge == null) continue;
    const d = Math.round((t.menge - (K[pid] || 0)) * 10000) / 10000; if (Math.abs(d) < 1e-6 || (!ein && d < 0)) continue;
    zeilen.push({ pos_id: pid, datum: heute, ort: `lt. Firma, PDF S. ${t.seite}`, formel: String(d).replace('.', ','), quelle: 'beleg' });
  }
  if (!zeilen.length) { if (!auto) toast('Nichts einzutragen – Aufmaß und Forderung stimmen überein.'); else toast('PDF angezeigt – keine Mehrmengen gegenüber dem Aufmaß gefunden.'); return; }
  const vorher = new Set(L.aufmass.map((a) => a.id));
  try { await call(`api/lv/${L.id}/aufmass`, 'POST', { zeilen }); } catch (e) { return toast(e.message, true); }
  const neu = L.aufmass.filter((a) => !vorher.has(a.id)).map((a) => a.id);
  rueckgaengig(ein ? 'Menge der Firma eingetragen' : `${neu.length} Mengen der Firma eingetragen (orange) – Schritt für Schritt prüfen`, async () => { for (const id of neu) await api('api/aufmass/' + id, 'DELETE'); await openLv(L.id); });
}
function amSchritt(d) {
  const LI = amListe(), i = LI.findIndex((p) => p.id === amPos), n = LI[i + d]; if (!n) return;
  amPos = n.id; LS.set('amPos', amPos); render();
  setTimeout(() => { const f = document.querySelector('[data-am-new="formel"]'); if (f) f.focus({ preventScroll: true }); }, 30);
}
document.addEventListener('click', async (e) => {
  if (!L || (tab !== 'aufmass' && !(e.target.closest && e.target.closest('.am-dok')))) return;   // PDF-Leiste gilt auch unter „Rechnungen“ und im freien Fenster
  const s = e.target.closest('[data-amstep]'); if (s) return amSchritt(+s.dataset.amstep);
  const zz = e.target.closest('.am-zz'); if (zz) { const f = document.querySelector('[data-am-new="formel"]'); if (!f) return; const w = String(+zz.dataset.v).replace('.', ',');
    f.value = f.value.trim() ? f.value.trim() + ' + ' + w : w; f.dispatchEvent(new Event('input', { bubbles: true })); f.focus(); zz.classList.add('ok'); return; }
  const su = e.target.closest('[data-amsu]'); if (su) { for (const b of amBelege().filter((y) => y.id === AMB)) { const x = ((b.auslese && b.auslese.kopf && b.auslese.kopf.summen) || []).find((y) => y.art === su.dataset.amsu); if (x) return amZeigeBox(b.id, x.seite, x.box); } return; }
  const zl = e.target.closest('[data-amzl]'); if (zl) { const Z = []; amBelege().filter((b) => b.id === AMB).forEach((b) => ((b.auslese && b.auslese.zeilen) || []).forEach((z) => Z.push({ ...z, bid: b.id }))); const z = Z[+zl.dataset.amzl]; if (z) amZeigeBox(z.bid, z.seite, z.box); return; }
  if (e.target.closest('[data-amki]')) return amKi(AMB);
  const ko = e.target.closest('[data-amkiok]'); if (ko) { e.stopPropagation(); try { L = await api(`api/belege/${AMB}/ki`, 'POST', { z: +ko.dataset.amkiok, pos: ko.dataset.pos || null }); render(); } catch (er) { toast(er.message, true); } return; }
  const bp_ = e.target.closest('[data-ambpos]'); if (bp_) { bp_.disabled = true; try { await call(`api/belege/${bp_.dataset.ambpos}/positionen`, 'POST', {}); } catch (er) { toast(er.message, true); bp_.disabled = false; } return; }
  const z2 = e.target.closest('[data-amz2]'); if (z2) { const R = amRe(); if (!R) return; const Z = []; amBelege().filter((b) => b.id === AMB).forEach((b) => ((b.auslese && b.auslese.zeilen) || []).forEach((z) => Z.push(z)));
    try { if (z2.dataset.amz2 === 'regie') { await call('api/rechnungen/' + R.id, 'PUT', { art: 'regie', zeilen: Z.map((z) => ({ text: z.text, menge: z.menge, einheit: z.einheit || '', ep: z.ep })) }); toast('Als Regierechnung übernommen – unter „Rechnungen“ prüfen.'); }
      else { await call('api/rechnungen/' + R.id, 'PUT', { frei: Z.reduce((a, z) => a + (z.gp || 0), 0) }); toast('Summe als geprüfter Betrag (ohne Aufmaß) eingetragen – unter „Rechnungen“ prüfen.'); } } catch (er) { toast(er.message, true); }
    return; }
  const u = e.target.closest('[data-amueb]'); if (u) return amUebernehmen(u.dataset.amueb === '*' ? null : u.dataset.amueb);
  const b = e.target.closest('[data-amb]'); if (b) { AMB = +b.dataset.amb; LS.set('amB', AMB); return render(); }
  const z = e.target.closest('[data-amz]'); if (z && AMV && AMV.pdf) { AMV.zoom = Math.max(0.5, Math.min(3, AMV.zoom * (+z.dataset.amz > 0 ? 1.2 : 1 / 1.2))); LS.set('amZoom', AMV.zoom); await amPdfZeichnen(AMV); amMarken(); amPdfZeige(amPos, true); return; }
  const d = e.target.closest('[data-ambdel]'); if (d) belegWeg(+d.dataset.ambdel);
});
document.addEventListener('change', (e) => {
  const i = e.target.closest && e.target.closest('[data-ambeleg]'); if (i && i.files.length) { const f = [...i.files]; i.value = ''; amBelegHoch(f); return; }
  if (e.target.id === 'amNurR') { amNurR = e.target.checked; LS.set('amNurR', amNurR); render(); }
});
document.addEventListener('dragover', (e) => { if (tab !== 'aufmass') return; const z = e.target.closest && e.target.closest('[data-amdrop]'); if (z && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); z.classList.add('over'); } });
document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-amdrop]'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('over'); });
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-amneu]'); if (b && L) belegNeuLesen(+b.dataset.amneu); if (e.target.closest && e.target.closest('[data-amnt]')) amNachtragNeu(); });
document.addEventListener('click', async (e) => { const b = e.target.closest && e.target.closest('[data-refrei]'); if (!b || !L || b.disabled || b.classList.contains('on')) return;
  const r = L.rechnungen.find((x) => x.id === +b.dataset.id); if (!r) return;
  try { await call('api/rechnungen/' + r.id, 'PUT', { frei: b.dataset.refrei === '1' ? (r.gefordert || 0) : null }); } catch (er) { toast(er.message, true); } });
document.addEventListener('drop', (e) => { if (tab !== 'aufmass') return; const z = e.target.closest && e.target.closest('[data-amdrop]'); if (!z || !e.dataTransfer.files.length) return; e.preventDefault(); z.classList.remove('over'); amBelegHoch(e.dataTransfer.files); });
document.addEventListener('keydown', (e) => { if (tab === 'aufmass' && amAns === 'erfassen' && e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && !document.querySelector('.modal-bg,.bed')) { e.preventDefault(); amSchritt(e.key === 'ArrowDown' ? 1 : -1); } });
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-amplus]'); if (!b) return;   // ＋ am Ende der Eingabezeile: wie Umschalt+Enter
  const f = b.closest('tr').querySelector('[data-am-new="formel"]'); if (f) amNeu(f, true, false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.amNew != null) { e.preventDefault(); amNeu(e.target, true, !e.shiftKey); }
});
document.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.amNew === 'formel') { const v = formel(e.target.value); const p = $('#amPrev');
  const st = $('#amSt');
  if (st) {   // Gesamtstand: Zuwachs = neu − bisher
    const b = +st.dataset.bisher, lv = +st.dataset.lv, eh = st.dataset.eh, z = v != null ? Math.round((v - b) * 1000) / 1000 : null;
    if (p) p.textContent = z != null ? (z > 0 ? '+' : '') + nf(z) : '';
    st.innerHTML = z == null ? `bisher <b>${nf(b)} ${esc(eh)}</b> – neuen Gesamtstand unten eintippen` : `bisher ${nf(b)} → <b class="${z < 0 ? 'neg' : 'pos'}">Zuwachs ${z > 0 ? '+' : ''}${nf(z)} ${esc(eh)}</b>${lv ? ` · jetzt ${Math.round(v / lv * 100)} %` : ''}`;
    const n = $('#amBarN'); if (n && lv) { const a0 = Math.min(100, b / lv * 100), a1 = Math.min(100, Math.max(0, (v ?? b) / lv * 100)); n.style.left = Math.min(a0, a1) + '%'; n.style.width = Math.abs(a1 - a0) + '%'; n.classList.toggle('neg', (v ?? b) < b); }
    return; }
  if (p) p.textContent = v != null ? nf(v) : ''; } });
let AMSTAND = LS.get('am.stand', false);
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-amstand]'); if (!b) return; AMSTAND = b.dataset.amstand === '1'; LS.set('am.stand', AMSTAND); render(); setTimeout(() => { const n = document.querySelector('[data-am-new="formel"]'); if (n) n.focus(); }, 30); });
let amBusy = false;
/* Enter: speichern und zur nächsten Position (leeres Feld: nur weiter) · Umschalt+Enter: speichern, weitere Zeile derselben Position */
function amWeiter() {
  const fokus = () => setTimeout(() => { const n = document.querySelector('[data-am-new="formel"]'); if (n) n.focus({ preventScroll: true }); amSichtbar(); }, 60);
  const b = document.querySelector('[data-amstep="1"]');
  if (b && !b.disabled) { b.click(); fokus(); return; }
  const o = amListe().find((p) => p.id !== amPos && !(L.calc.aufmass[p.id] || 0));   // am Ende: zur ersten noch offenen Position
  if (!o) { toast('Alle Positionen haben ein Aufmaß – durch.'); return; }
  amPos = o.id; LS.set('amPos', amPos); render(); toast('Letzte Position – weiter mit der ersten noch offenen.'); fokus();
}
function amSichtbar() {   // aktive Zeile in der Positionsliste sichtbar halten – die Tabelle folgt beim Durchlaufen (Enter / nächste)
  const z = document.querySelector('table.am tr.akt[data-ampos]'), w = z && (z.closest('.am-tab, .am-oben') || z.closest('.tblw')); if (!w) return;
  const kopf = w.querySelector('thead');
  if (w.scrollHeight > w.clientHeight + 2 && getComputedStyle(w).overflowY !== 'visible') {   // eigener Scrollbereich
    const a = z.offsetTop - (kopf ? kopf.offsetHeight : 0), b = z.offsetTop + z.offsetHeight;
    if (a < w.scrollTop || b > w.scrollTop + w.clientHeight) w.scrollTop = Math.max(0, a - w.clientHeight / 3);
    return;
  }
  // Tabelle scrollt mit der Seite (Baum-Ansicht): Fenster so rollen, dass die Zeile im oberen Drittel steht – unter Kopfleiste und Spaltenköpfen
  const r = z.getBoundingClientRect(), oben = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--phh')) || 52, kh = kopf ? kopf.offsetHeight : 0;
  const frei = oben + kh + 8, unten = innerHeight - 40;
  if (r.top < frei || r.bottom > unten) scrollTo({ top: Math.max(0, scrollY + r.top - frei - (innerHeight - frei) / 3) });
}
async function amNeu(el, enter, weiter) {
  if ((el.dataset.amNew !== 'formel' && !enter) || amBusy) return;
  const f = $('[data-am-new="formel"]').value.trim(); if (!f) { if (weiter) amWeiter(); return; }
  amBusy = true; setTimeout(() => { amBusy = false; }, 800);
  if (formel(f) == null) { toast('Rechenweg nicht verständlich – bitte nur Zahlen, × / + – und Klammern.', true); return; }
  let fx = f;
  if (AMSTAND) {   // Gesamtstand → Zuwachs-Zeile „Stand − bisher“
    const bisher = (L.calc.aufmass || {})[amPos] || 0, neu = formel(f), z = Math.round((neu - bisher) * 1000) / 1000;
    if (Math.abs(z) < 1e-9) { toast('Gleich wie bisher – nichts einzutragen.'); if (weiter) amWeiter(); return; }
    if (z < 0 && !(await bpFrage(`Der neue Stand (${nf(neu)}) ist kleiner als bisher (${nf(bisher)}).\nEs wird eine Minus-Zeile ${nf(z)} eingetragen.`, { ok: 'Minus-Zeile eintragen' }))) return;
    fx = `${/^[\d.,\s]+$/.test(f) ? f : '(' + f + ')'} - ${String(bisher).replace('.', ',')}`;
  }
  try { if (!(await amZeileNeu(amPos, (LS.set('amDatum', [new Date().toDateString(), amDatumWert($('[data-am-new="datum"]').value)]), amDatumWert($('[data-am-new="datum"]').value)), $('[data-am-new="ort"]').value, fx))) return;
    if (weiter) amWeiter(); else { const n = document.querySelector('[data-am-new="formel"]'); if (n) n.focus(); } } catch (er) { toast(er.message, true); }
}
/* Aufmaß-Datum: Datum oder freier Text – „8.11.“ / „08.11.2026“ wird als Datum gespeichert, alles andere wie getippt */
document.addEventListener('click', (e) => {   // 📅 neben Datum/Text: Kalender öffnen, gewähltes Datum eintragen (Text bleibt möglich)
  const b = e.target.closest && e.target.closest('[data-amcal]'); if (!b) return;
  const inp = b.parentElement.querySelector('input'); if (!inp) return;
  const d = document.createElement('input'); d.type = 'date'; d.value = amDatumWert(inp.value).match(/^\d{4}-\d{2}-\d{2}$/) ? amDatumWert(inp.value) : new Date().toISOString().slice(0, 10);
  Object.assign(d.style, { position: 'fixed', left: b.getBoundingClientRect().left + 'px', top: b.getBoundingClientRect().bottom + 'px', opacity: 0, width: '1px', height: '1px' });
  document.body.appendChild(d);
  d.addEventListener('change', () => { if (d.value) { inp.value = amDatumZeig(d.value); inp.dispatchEvent(new Event('change', { bubbles: true })); } d.remove(); });
  d.addEventListener('blur', () => setTimeout(() => d.remove(), 300));
  try { d.showPicker(); } catch { d.focus(); d.click(); }
});
function amDatumZeig(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v.slice(8, 10) + '.' + v.slice(5, 7) + '.' + v.slice(0, 4) : (v || ''); }
function amDatumWert(v) {
  v = String(v || '').trim(); const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})?$/.exec(v);
  if (!m) return v.slice(0, 40);
  const j = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String(new Date().getFullYear());
  return `${j}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
/* Aufmaßzeilen (Tabelle: Rechenweg; rechts: Datum, Ort, Rechenweg): Enter speichert und springt in derselben Spalte eine Zeile tiefer
   (Umschalt+Enter höher). Das Ziel wird vorher über die Zeilen-ID bestimmt – das Neuzeichnen nach dem Speichern verliert es so nicht. */
document.addEventListener('keydown', (e) => {
  const el = e.target, mz = el.classList && el.classList.contains('am-mz'); if (e.key !== 'Enter' || e.isComposing || !el.dataset || (!mz && (el.dataset.am == null || !el.dataset.id))) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const feld = el.dataset.am, tabelle = mz ? '.am-mz' : el.classList.contains('am-zwi') ? '.am-zwi:not(.am-mz)' : `[data-am="${feld}"]:not(.am-zwi)`;
  const alle = [...document.querySelectorAll(tabelle)], i = alle.indexOf(el), n0 = alle[i + (e.shiftKey ? -1 : 1)];
  const ziel = n0 ? `${tabelle}${n0.dataset.id ? `[data-id="${n0.dataset.id}"]` : `[data-amneupos="${CSS.escape(n0.dataset.amneupos)}"]`}` : (!el.classList.contains('am-zwi') && !e.shiftKey ? `[data-am-new="${feld}"]` : null);
  if (mz && n0 && !n0.dataset.id) { const z = n0.closest('tr[data-ampos]'); if (z) { amPos = z.dataset.ampos; LS.set('amPos', amPos); } }   // die Zeile rechts folgt
  el.blur();   // „change“ speichert (mit Rückgängig)
  if (!ziel) return;
  let erst = true;
  const hin = () => { const n = document.querySelector(ziel), a = document.activeElement; if (!n || a === n) return; if (!erst && a && a !== document.body && a.isConnected) return;   // schon woanders weitergetippt: nicht wegziehen
    erst = false; n.focus(); if (n.select) n.select(); };
  hin(); [300, 700, 1400].forEach((t) => setTimeout(hin, t));   // nach dem Speichern wird neu gezeichnet
}, true);
document.addEventListener('focusin', (e) => { const el = e.target; if (el.dataset && el.dataset.rw != null && el.value !== el.dataset.rw) { el.dataset.zeig = el.value; el.value = el.dataset.rw; el.select(); } }, true);   // Zelle „aufgemessen“ zeigt das Ergebnis, beim Hineinklicken den Rechenweg
document.addEventListener('focusout', (e) => { const el = e.target; if (el.dataset && el.dataset.zeig != null && el.value === el.dataset.rw) { el.value = el.dataset.zeig; delete el.dataset.zeig; } });
document.addEventListener('change', async (e) => {   // „aufgemessen“ einer Position ohne Aufmaß direkt in der Tabelle: neue Aufmaßzeile (heute), mit Rückgängig
  const el = e.target; if (!el.dataset || el.dataset.amneupos == null || !L) return;
  const f = el.value.trim(); if (!f) return;
  if (formel(f) == null) { toast('Rechenweg nicht verständlich – bitte nur Zahlen, × / + – und Klammern.', true); return; }
  try { if (!(await amZeileNeu(el.dataset.amneupos, new Date().toISOString().slice(0, 10), '', f))) el.value = ''; } catch (er) { toast(er.message, true); }
});
/* Neue Aufmaßzeile (Eingabe rechts und Zelle „aufgemessen“): Bedarfs-/Wahlposition erst nachfragen, speichern, Rückgängig */
async function amZeileNeu(pos, datum, ort, formel) {
  const x = posOf().find((p) => p.id === pos);
  if (x && AMCFG.ev && (x.art === 'E' || x.art === 'A') && !(L.aufmass || []).some((y) => y.pos_id === pos) && !AM_EV.has(L.id + ':' + pos)) {
    if (!(await bpFrage(`${x.oz} ${x.kurz}\nist eine ${x.art === 'E' ? 'Bedarfsposition (Eventualposition)' : 'Wahlposition (Alternativposition)'}. Sie wird nur bezahlt, wenn sie angeordnet bzw. beauftragt wurde.\nWurde sie angeordnet?`, { ok: 'Ja, angeordnet – Aufmaß eintragen', abbrechen: 'Nein, nicht eintragen' }))) return false;
    AM_EV.add(L.id + ':' + pos);
  }
  const vorher = new Set((L.aufmass || []).map((y) => y.id)), lvId = L.id;
  await call(`api/lv/${L.id}/aufmass`, 'POST', { pos_id: pos, datum, ort, formel });
  const neu = (L.aufmass || []).filter((y) => !vorher.has(y.id)).map((y) => y.id);
  if (neu.length) rueckgaengig('Aufmaßzeile eingetragen', async () => { for (const id of neu) await api('api/aufmass/' + id, 'DELETE'); await openLv(lvId); });
  return true;
}
async function amSave(el) {
  const body = { [el.dataset.am]: el.dataset.am === 'datum' ? amDatumWert(el.value) : el.value };
  if (el.dataset.am === 'formel' && el.value.trim() && formel(el.value) == null) { toast('Rechenweg nicht verständlich.', true); return; }
  try { await call('api/aufmass/' + el.dataset.id, 'PUT', body); } catch (er) { toast(er.message, true); }
}
async function raumDialog() {
  let R; try { R = await api(`api/lv/${L.id}/raeume`); } catch (e) { toast(e.message, true); return; }
  if (!R.raeume.length) { toast('Im Raumbuch der Baukosten stehen noch keine Räume.', true); return; }
  const bg = modalBox(`<h3>Aus dem Raumbuch</h3><p class="hint" style="margin:0 0 .5rem">Räume aus „${esc(R.bk.name)}“. Je Raum entsteht eine Aufmaßzeile.</p>
    <div class="fm"><label>Menge je Raum</label><select id="rmArt"><option value="f">Fläche (m²) – Boden, Decke, Estrich</option><option value="v">Fläche × Höhe (m³)</option><option value="u">Umfang × Höhe (m²) – Wandflächen, aus Fläche geschätzt (quadratisch)</option></select></div>
    <div style="max-height:45vh;overflow:auto;border:1px solid var(--line);border-radius:calc(8px*var(--rk,1));padding:.4rem .6rem;margin-top:.5rem">
      <label style="display:flex;gap:.5rem"><input type="checkbox" id="rmAll" checked> <b>alle</b></label>
      ${R.raeume.map((r, k) => `<label style="display:flex;gap:.5rem"><input type="checkbox" data-rm="${k}" checked> ${esc([r.geschoss, r.nr, r.name].filter(Boolean).join(' '))} <small class="hint">${nf(r.flaeche, 2)} m²${r.hoehe ? ' · h ' + nf(r.hoehe, 2) : ''}</small></label>`).join('')}</div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Übernehmen</button></div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const art = $('#rmArt').value, d = new Date().toISOString().slice(0, 10);
    const zeilen = [...bg.querySelectorAll('[data-rm]:checked')].map((x) => R.raeume[+x.dataset.rm]).map((r) => {
      const f = String(r.flaeche).replace('.', ','), h = String(r.hoehe || 0).replace('.', ',');
      const fo = art === 'f' ? f : art === 'v' ? `${f} × ${h}` : `4 × ${Math.sqrt(r.flaeche).toFixed(2).replace('.', ',')} × ${h}`;
      return { pos_id: amPos, datum: d, ort: [r.geschoss, r.nr, r.name].filter(Boolean).join(' '), formel: fo, quelle: 'raum' };
    });
    if (!zeilen.length) return;
    try { await call(`api/lv/${L.id}/aufmass`, 'POST', { zeilen }); close(); toast(`${zeilen.length} Aufmaßzeilen übernommen.`); } catch (e) { toast(e.message, true); }
  });
  bg.addEventListener('change', (e) => { if (e.target.id === 'rmAll') bg.querySelectorAll('[data-rm]').forEach((x) => { x.checked = e.target.checked; }); });
}

/* Aufmaßprüfung: Positionen unter ihren LV-Titeln (wie im LV), Titel auf- und zuklappbar (je Browser gemerkt) */
const AMZU = new Set(LS.get('amzu', []));
function amTitelBaum(LI) {
  const ids = new Set(LI.map((p) => p.id)), tiefe = {}, pfad = {}, st = [];
  items().forEach((x) => {
    if (x.typ === 'titel') { const lv = x.lvl || 1; st.length = Math.min(st.length, lv - 1); st.push(x); }
    else if (ids.has(x.id)) { pfad[x.id] = st.slice(); tiefe[x.id] = st.length; }
  });
  return { tiefe, pfad };
}
function amBaumZeilen(LI, Z, TB, R0, nc) {
  let vor = [];
  const out = [];
  LI.forEach((p, i) => {
    const pf = TB.pfad[p.id] || [];
    pf.forEach((t, k) => {
      if (vor[k] && vor[k].id === t.id) return;
      if (pf.slice(0, k).some((y) => AMZU.has(y.id))) return;   // unter einem zugeklappten Titel
      const zu = AMZU.has(t.id);
      out.push(`<tr class="am-ti" data-amti="${esc(t.id)}" style="cursor:pointer"><td class="baumz"><div class="bz" style="padding-left:${(R0 + k) * 1.15}rem"><span class="car">${zu ? '▸' : '▾'}</span>${IC.lv}<span class="oz" style="margin:0 .4rem 0 .3rem">${esc(t.oz || '')}</span><b>${esc(t.kurz || '')}</b></div></td><td colspan="${nc - 1}"></td></tr>`);
    });
    vor = pf;
    if (!pf.some((y) => AMZU.has(y.id))) out.push(Z[i]);
  });
  return out.join('');
}
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-amti]'); if (!t || tab !== 'aufmass') return;
  const id = t.dataset.amti; if (AMZU.has(id)) AMZU.delete(id); else AMZU.add(id); LS.set('amzu', [...AMZU].slice(-300)); render();
});

/* Mengenüberschreitung: kleiner Balken unter der aufgemessenen Menge – ab 100 % gelb, bis 110 % orange, darüber rot
   (über 10 % Mehrmenge kann ein neuer Einheitspreis verlangt werden, VOB/B § 2 Abs. 3) */
function amUeberBalken(pct, gross) {
  /* Abweichung von der LV-Menge: Skala −100 % … 0 … +100 % (0–200 %), 0 = LV-Menge in der Mitte. Der Verlauf liegt immer ganz da
     (grün → leicht orange bei 0 → orange an der Schwelle, VOB/B § 2 Abs. 3: +10 % → rot bei +100 %); ein Strich zeigt den Wert – links weniger, rechts mehr.
     Klein (Tabelle) nur über der Schwelle „ab“, groß (Position) immer. */
  const ab = AMCFG.ab || 0, rot = Math.max(ab + 1, AMCFG.rot || 10);
  if (pct == null || (!gross && pct <= 100 + ab)) return '';
  const w = Math.max(1, Math.min(100, pct / 2)), rp = Math.min(99, 50 + rot / 2), farbe = amMengeFarbe(pct, rp * 2);
  const verlauf = `linear-gradient(90deg,#3aa76d 0%,#8cc97a 35%,#f6c27a 50%,#f08a3c ${rp}%,#d93025 100%)`;
  const tip = `${pct} % der LV-Menge${pct - 100 >= rot ? ` – über ${rot} % mehr: neuer Preis kann verlangt werden (VOB/B § 2 Abs. 3)` : pct > 100 ? ' – Mehrmenge' : ''}`;
  return `<span class="am-ueb${gross ? ' gr' : ''}" title="${tip}"><span class="tr" style="background:${verlauf}"><s class="m"></s>${gross ? `<s class="r" style="left:${rp}%"></s>` : ''}<s class="w${pct > 200 ? ' ueber' : ''}" style="left:${w}%;--wf:${farbe}"></s></span>${gross ? `<b style="color:${farbe}">${pct >= 100 ? '+' : '−'}${Math.abs(pct - 100)} %</b>` : ''}</span>`;
}
function amMengeFarbe(pct, orange) {   // dieselben Farben wie der Verlauf, an der Stelle des Werts
  const S = [[0, [58, 167, 109]], [70, [140, 201, 122]], [100, [246, 194, 122]], [orange, [240, 138, 60]], [200, [217, 48, 37]]], p = Math.min(200, Math.max(0, pct));
  for (let i = 1; i < S.length; i++) if (p <= S[i][0]) { const [a, ca] = S[i - 1], [b, cb] = S[i], t = b > a ? (p - a) / (b - a) : 1; return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(',')})`; }
  return 'rgb(217,48,37)';
}
const AM_EV = new Set();   // in dieser Sitzung schon bestätigt: Bedarfsposition angeordnet
const amArtHinweis = (x) => (x.art === 'E' ? '<span class="am-art" title="Bedarfsposition – nur bezahlt, wenn angeordnet">Bedarfsposition</span> ' : x.art === 'A' ? '<span class="am-art" title="Wahlposition – nur bezahlt, wenn beauftragt">Wahlposition</span> ' : '');
