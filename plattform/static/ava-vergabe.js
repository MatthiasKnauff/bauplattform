'use strict';
/* Ausschreibung – Unterlagen der Vergabe (vor ava-start.js geladen, gemeinsame Namen; Server: ava_vergabe.py).
   Angebotsbesprechung: je Bieter ein Protokoll im Aufbau des Büro-Vordrucks – vorausgefüllt (Projekt, Büro, Adressen, Angebot,
   Summe und auffällige Positionen aus dem Preisspiegel, Termine aus dem Bauzeitenplan, Grundlagen als Vorgabe des Büros), im Gespräch
   ergänzt (gelb), „Abschließen“ übernimmt Nachlass/Skonto ins Angebot bzw. den Auftrag, PDF in der Vorschau unterschreiben.
   Bauvertrag / Auftragsschreiben: im Bereich Aufträge aus Auftrag + Protokoll; Art des Auftraggebers baut die Texte neu.
   Aufruf: Navigation Vergabe → „Angebotsbesprechung“ (eigene Seite, auch Ablauf oben → „Besprechung“), „Aufträge“ → Bauvertrag / Auftragsschreiben. */
const VG = { lid: null, D: null };
const vgLaden = async (lid) => { VG.lid = lid; VG.D = await api(`api/lv/${lid}/vergabedok`); return VG.D; };
const vgEsc = (s) => esc(s ?? '');

/* Summe und Klärungspunkte eines Angebots aus dem Preisspiegel (EP mehr als 30 % vom Mittel, Bedarfs-/Wahlpositionen) */
function vgKlaerung(a) {
  const A = L.angebote, out = [];
  posOf().filter((x) => !x.nt).forEach((x) => {
    const e = a.preise[x.id], v = A.map((y) => y.preise[x.id]).filter((y) => y != null), mit = v.length ? v.reduce((s, y) => s + y, 0) / v.length : null;
    if (e != null && mit && v.length > 1 && Math.abs(e / mit - 1) > 0.3) out.push(`Pos. ${x.oz} ${x.kurz.slice(0, 40)}: EP ${Math.round((e / mit - 1) * 100)} % ${e < mit ? 'unter' : 'über'} dem Mittel`);
    else if (x.art === 'E' || x.art === 'A') out.push(`Pos. ${x.oz} ${x.kurz.slice(0, 40)}: ${x.art === 'E' ? 'Bedarfsposition' : 'Wahlposition'} – angeordnet?`);
    else if (e == null && a.preise && Object.keys(a.preise).length) out.push(`Pos. ${x.oz} ${x.kurz.slice(0, 40)}: kein Preis`);
  });
  return out.slice(0, 15).join('\n');
}
async function vgBesprechung(aid) {
  const a = L.angebote.find((x) => x.id === aid), k = L.calc.angebote.find((x) => x.id === aid) || {};
  try { const d = await api(`api/lv/${L.id}/besprechung`, 'POST', { angebot_id: aid, summe: k.netto || 0, klaerung: vgKlaerung(a) }); VG.lid = L.id; VG.D = d; vgEditor(d.neu); render(); }
  catch (e) { toast(e.message, true); }
}
async function vgVertrag(art, lid) {
  try { const d = await api(`api/lv/${lid}/bauvertrag`, 'POST', { art, ag_art: 'unternehmen' }); VG.lid = lid; VG.D = d; vgEditor(d.neu); if (L && L.id === lid) render(); }
  catch (e) { toast(e.message, true); }
}

/* ---------- Editor: Protokoll der Angebotsbesprechung als eigene Seite unter Vergabe (vgBsSeite), Bauvertrag/Auftragsschreiben als Fläche ---------- */
let VGT = 0, VGP = null;   // Eingaben sammeln (alle Felder, nicht nur das letzte) und vor jeder Aktion senden
/* Auswahlfelder: übliche Antworten (▾), unten „eigener Text …“ – frei schreiben geht immer (besprochen am 13.11.2026, Mock „Besprechung kompakt“) */
const VG_VOR = {
  'kopf.ort': ['Büro', 'Baustelle', 'bei der Bieter:in', 'Videokonferenz'],
  'bieterangaben.rechtsform': ['GmbH', 'GmbH & Co. KG', 'UG (haftungsbeschränkt)', 'KG', 'OHG', 'GbR', 'e. K.', 'Einzelunternehmen', 'AG'],
  'bieterangaben.subunternehmer': ['keine', 'ja, für …', 'nur mit Zustimmung des Auftraggebers'],
  'angebot.gueltig': ['ja', 'ja, verlängert bis …', 'nein – Bindefrist abgelaufen'],
  'angebot.preis': ['nach Einheitspreisen', 'Pauschalpreis', 'nach Einheitspreisen, Stundenlohnarbeiten nach Nachweis'],
  'termine.unterbrechung': ['keine', 'Winterpause nach Absprache', 'nach Bauablauf, mit Ankündigung'],
  'grundlagen.vertragsgrundlage': ['VOB/B (Fassung 2016)', 'BGB-Bauvertrag (§§ 650a ff. BGB)'],
  'grundlagen.vertragsstrafe': ['keine', '0,2 % der Netto-Auftragssumme je Werktag Verzug, höchstens 5 %'],
  'grundlagen.erfuellung': ['entfällt', '5 % der Netto-Auftragssumme', '10 % der Netto-Auftragssumme'],
  'grundlagen.gewaehrleistung': ['5 Jahre', '4 Jahre (§ 13 Abs. 4 VOB/B)', '2 Jahre'],
  'grundlagen.einbehalt': ['5 % der Bruttoabrechnungssumme, ablösbar gegen Bankbürgschaft', '3 % der Bruttoabrechnungssumme, ablösbar gegen Bankbürgschaft', 'kein Einbehalt'],
  'grundlagen.rechnungsstellung': ['Abschlagsrechnungen nach Aufmaß, Schlussrechnung nach Abnahme', 'Abschläge nach Zahlungsplan', 'nur Schlussrechnung nach Abnahme'],
  'grundlagen.energie': ['bauseits, kostenlos', 'bauseits, pauschal 0,5 % der Abrechnungssumme', 'durch den Auftragnehmer'],
};
const VG_KURZ = { vertragsgrundlage: 'Vertragsgrundlage', bescheinigungen: 'Bescheinigungen', erfuellung: 'Erfüllungsbürgschaft', einbehalt: 'Einbehalt', energie: 'Energie / Medien' };   // kurze Beschriftung im kompakten Protokoll
const VG_EIN = new Set(['kopf.bauvorhaben', 'kopf.bauherr', 'kopf.architekt', 'kopf.bieter', 'kopf.teilnehmer', 'angebot.klaerung']);   // einzeilig, beim Hineinklicken ganz
function vgFeld(D, fest, bereich, k, lab, opt = {}) {
  const v = bereich ? (D[bereich] || {})[k] : D[k], g = opt.gespraech, key = `${bereich}.${k}`, leer = String(v ?? '').trim() ? '' : ' leer', vor = VG_VOR[key] || opt.vor;
  const zu = fest ? ' disabled' : '';
  const ein = (opt.zeilen && !opt.kompakt) ? `<textarea rows="${opt.zeilen}" data-vgf="${key}"${zu}>${vgEsc(v)}</textarea>`
    : opt.kompakt && VG_EIN.has(key) ? `<textarea rows="1" class="vg-1" data-vgf="${key}"${zu}>${vgEsc(v)}</textarea>`
    : opt.wahl ? `<select data-vgf="${key}" data-bp-auswahl${zu}>${opt.wahl.map(([w, t]) => `<option value="${w}"${w === (v || opt.wahl[0][0]) ? ' selected' : ''}>${t}</option>`).join('')}</select>`
    : `<input data-vgf="${key}" value="${vgEsc(v)}"${opt.typ ? ` type="${opt.typ}"` : ''}${zu}${opt.ph ? ` placeholder="${vgEsc(opt.ph)}"` : ''}>`;
  const dd = vor && !fest ? `<button type="button" class="vg-dd" data-vgvor="${key}" title="Auswahl" aria-label="${vgEsc(lab)}: Auswahl">▾</button>` : '';
  return `<label class="vg-f${g ? ' gs' + leer : ''}${opt.quelle ? ' q' : ''}${opt.breit ? ' w' : ''}${opt.zwei ? ' w2' : ''}"><span>${lab}${opt.quelle && !opt.kompakt ? `<i>${opt.quelle}</i>` : ''}</span><span class="vg-e">${ein}${dd}</span></label>`;
}
function vgBesprechungForm(x) {   // Protokoll kompakt: drei Felder je Zeile, Beschriftung links, Auswahlfelder für die üblichen Antworten
  const D = x.data, fest = x.status !== 'entwurf', f = (b, k, lab, o = {}) => vgFeld(D, fest, b, k, lab, { ...o, kompakt: 1 });
  const A = D.angebot || {}, B = D.bieterangaben || {}, zu = fest ? ' disabled' : '';
  const klein = (b, k, v, ph) => `<input class="vg-k" data-vgf="${b}.${k}" value="${vgEsc(v)}"${ph ? ` placeholder="${ph}"` : ''}${zu}>`;
  return `<div class="vg-kompakt">
    <h4>Protokoll</h4><div class="vg-g">${f('kopf', 'datum', 'Datum', { typ: 'date' })}${f('kopf', 'uhrzeit', 'Uhrzeit', { typ: 'time', gespraech: 1 })}${f('kopf', 'ort', 'Ort')}
      ${f('kopf', 'bauvorhaben', 'Bauvorhaben', { breit: 1, quelle: 'Projekt' })}${f('kopf', 'bauherr', 'Bauherr:in/AG', { zwei: 1, quelle: 'Projekt' })}${f('kopf', 'architekt', 'Architekt:in', { quelle: 'Büro' })}
      ${f('kopf', 'bieter', 'Bieter:in/AN', { zwei: 1, quelle: 'Adressen' })}${f('kopf', 'teilnehmer', 'Teilnehmer:innen', { gespraech: 1, vor: VG.teiln })}</div>
    <h4>Bieter:in</h4><div class="vg-g">${f('bieterangaben', 'rechtsform', 'Rechtsform/Sitz', { gespraech: 1 })}
      <label class="vg-f w2 gs${String(B.mitarbeiter || '').trim() ? '' : ' leer'}"><span>Mitarbeiter:innen</span><span class="vg-e vg-reihe">${klein('bieterangaben', 'mitarbeiter', B.mitarbeiter)}<small>fürs Projekt</small>${klein('bieterangaben', 'mitarbeiter_projekt', B.mitarbeiter_projekt)}</span></label>
      ${f('bieterangaben', 'bauleiter', 'Bauleiter:in', { gespraech: 1 })}${f('bieterangaben', 'subunternehmer', 'Subunternehmer', { gespraech: 1 })}</div>
    <h4>Angebot</h4><div class="vg-g">${f('angebot', 'gueltig', 'Gültigkeit', { gespraech: 1 })}${f('angebot', 'angebot_vom', 'Angebot vom', { typ: 'date', quelle: 'Angebot' })}${f('angebot', 'nachtrag_vom', 'Nachtrag vom', { typ: 'date' })}
      ${f('angebot', 'gewerke', 'Gewerke', { quelle: 'LV' })}${f('angebot', 'summe', 'Summe nach Prüfung', { zwei: 1, quelle: 'Preisspiegel' })}
      <label class="vg-f w gs${String(A.skonto || A.nachlass || '').trim() ? '' : ' leer'}"><span>Nachlass · Skonto</span><span class="vg-e vg-reihe">${klein('angebot', 'nachlass', A.nachlass, '0')}<small>% Nachlass auf die EP</small>${klein('angebot', 'skonto', A.skonto, '0')}<small>% Skonto bei Zahlung innerhalb von</small>${klein('angebot', 'skonto_tage', A.skonto_tage)}
        <select data-vgf="angebot.skonto_art"${zu}>${[['at', 'Arbeitstagen'], ['wt', 'Werktagen'], ['kt', 'Kalendertagen'], ['wo', 'Wochen']].map(([w, t]) => `<option value="${w}"${w === (A.skonto_art || 'at') ? ' selected' : ''}>${t}</option>`).join('')}</select></span></label>
      ${f('angebot', 'preis', 'Preis', { breit: 1 })}${f('angebot', 'klaerung', 'Positionen klären', { breit: 1, gespraech: 1, quelle: 'Preisspiegel' })}</div>
    <h4>Termine</h4><div class="vg-g">${f('termine', 'beginn', 'Beginn', { quelle: 'Bauzeitenplan' })}${f('termine', 'fertig', 'Fertigstellung', { quelle: 'Bauzeitenplan' })}${f('termine', 'unterbrechung', 'Unterbrechung', { gespraech: 1 })}
      ${(VG.D.plaene || []).length ? f('termine', 'plan_id', 'Bauzeitenplan', { zwei: 1, wahl: VG.D.plaene.map((p) => [p.id, `${p.gueltig ? '★ ' : ''}${p.name}${p.stand ? ' · Stand ' + vgDe(p.stand) : ''}`]) }) + f('termine', 'plan_stand', 'Stand vom', { typ: 'date' }) : ''}
      ${f('termine', 'bauzeitenplan', 'Vertragsbestandteil', { breit: 1, quelle: 'Bauzeitenplan' })}</div>
    <h4>Grundlagen <small>Vorgabe des Büros${fest ? '' : ' – <button type="button" class="btn sm" data-vgvorgabe>als Vorgabe des Büros merken</button>'}</small></h4>
    <div class="vg-g">${[...VG.D.grundlagen].sort((x, y) => (x[0] === 'bescheinigungen') - (y[0] === 'bescheinigungen')).map(([k, t]) => f('grundlagen', k, VG_KURZ[k] || t, { breit: k === 'bescheinigungen', zwei: k === 'einbehalt' })).join('')}</div>
    <h4>Sonstiges</h4><div class="vg-g">${vgFeld(D, fest, '', 'sonstiges', 'Sonstiges', { zeilen: 3, breit: 1, gespraech: 1 })}</div></div>`;
}
function vgEditor(id) {
  const x = VG.D.dokumente.find((y) => y.id === id); if (!x) return;
  if (x.art === 'besprechung') { vgZurSeite(x); return; }   // Protokoll: eigene Seite unter Vergabe
  let ov = document.querySelector('.vg-ed:not(.vg-inline)');
  if (!ov) { ov = document.createElement('div'); ov.className = 'vg-ed'; ov.setAttribute('role', 'dialog'); document.body.appendChild(ov); }
  ov.dataset.id = id;
  const D = x.data, fest = x.status !== 'entwurf', f = (b, k, lab, o) => vgFeld(D, fest, b, k, lab, o);
  const titel = VG.D.arten[x.art], V = D.vertrag || {};
  const body = `<div class="vg-g"><span class="vg-f w"><span>Auftraggeber:in ist</span><span class="seg" role="group">${Object.entries(VG.D.ag_arten).map(([k, t]) => `<button type="button" data-vgag="${k}" class="${V.ag_art === k ? 'on' : ''}"${fest ? ' disabled' : ''}>${t}</button>`).join('')}</span></span>
      ${V.ag_art === 'privat' ? '<p class="vg-h w">Privatperson: Der Vertrag stützt sich auf das BGB (§§ 650a ff.) – die VOB/B ist gegenüber Verbrauchern nicht als Ganzes privilegiert (BGH, 24.07.2008 – VII ZR 55/07). Ein Verbraucherbauvertrag (§ 650i BGB: Baubeschreibung, Widerrufsbelehrung, 90-%-Grenze bei Abschlägen) liegt bei Einzelgewerken meist nicht vor (BGH, 16.03.2023 – VII ZR 94/22) – wird der ganze Neubau oder ein erheblicher Umbau aus einer Hand vergeben, bitte gesondert prüfen.</p>' : ''}
      ${V.ag_art === 'oeffentlich' ? '<p class="vg-h w">Öffentlicher Auftraggeber: dessen Vertragsmuster (z. B. VHB) und Vergaberecht gehen vor – dieser Text ist dann nur ein Entwurf.</p>' : ''}
      ${f('vertrag', 'ag', 'Auftraggeber:in', { zeilen: 3, quelle: 'Projekt' })}${f('vertrag', 'ag_vertreter', 'vertreten durch', { gespraech: 1 })}${f('vertrag', 'an', 'Auftragnehmer:in', { zeilen: 3, quelle: 'Auftrag' })}
      ${f('vertrag', 'gegenstand', 'Gegenstand', { zeilen: 2, breit: 1 })}${f('vertrag', 'bestandteile', 'Vertragsbestandteile (Rangfolge)', { zeilen: 8, breit: 1, quelle: 'Protokoll / LV' })}
      ${f('vertrag', 'verguetung', 'Vergütung', { zeilen: 3, breit: 1, quelle: 'Auftrag' })}${f('vertrag', 'termine', 'Ausführungsfristen', { zeilen: 3, breit: 1, quelle: 'Protokoll' })}
      ${f('vertrag', 'zahlung', 'Zahlung', { zeilen: 3, breit: 1, quelle: 'Protokoll' })}${f('vertrag', 'sicherheiten', 'Sicherheiten', { zeilen: 2, breit: 1, quelle: 'Protokoll' })}
      ${f('vertrag', 'abnahme', 'Abnahme und Mängelansprüche', { zeilen: 2, breit: 1, quelle: 'Protokoll' })}${f('vertrag', 'weiteres', 'Weitere Vereinbarungen', { zeilen: 5, breit: 1, quelle: 'Büro' })}
      ${f('vertrag', 'ort_datum', 'Ort, Datum (Auftraggeber:in)', { ph: 'leer = Ort des Büros, heute' })}</div>`;
  ov.innerHTML = `<div class="vg-k"><b>${titel}</b><span class="mute">${vgEsc((V.an || '').split('\n')[0])} · ${VG.D.status[x.status]}${x.ablage ? ' · abgelegt' : ''}</span>
      <span class="fill"></span><button type="button" class="btn" data-vgpdf>PDF ✍ unterschreiben</button>
      ${fest ? '<button type="button" class="btn" data-vgauf title="Wieder bearbeiten">Wieder öffnen</button>' : ''}
      <button type="button" class="btn" data-vgweg title="In den Papierkorb">🗑</button><button type="button" class="btn" data-vgzu>Schließen</button></div>
    <div class="vg-b"><p class="vg-h">Aus Auftrag und Protokoll vorausgefüllt – jeder Text änderbar. Andere Art der Auftraggeber:in baut die Texte neu auf.</p>${body}</div>`;
}
async function vgSpeichern(id, body) {
  try { VG.D = await api('api/vergabedok/' + id, 'PUT', body); } catch (e) { toast(e.message, true); }
}
document.addEventListener('input', (e) => {
  const t = e.target, ov = t.closest && t.closest('.vg-ed'); if (!ov || !t.dataset.vgf) return;
  const lab = t.closest('.vg-f'); if (lab && lab.classList.contains('gs')) lab.classList.toggle('leer', !t.value.trim());
  const [b, k] = t.dataset.vgf.split('.'), id = +ov.dataset.id;
  if (!VGP || VGP.id !== id) { vgFlush(); VGP = { id, body: {} }; }
  if (b) (VGP.body[b] = VGP.body[b] || {})[k] = t.value; else VGP.body[k] = t.value;
  clearTimeout(VGT); VGT = setTimeout(vgFlush, 500);
  if (t.dataset.vgf === 'termine.plan_id') { clearTimeout(VGT); vgFlush().then(() => vgEditor(id)); }   // anderer Bauzeitenplan: Termine und Stand neu
});
const vgDe = (t) => (/^\d{4}-\d{2}-\d{2}/.test(t || '') ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : t || '');
async function vgFlush() {
  clearTimeout(VGT); const p = VGP; VGP = null;
  if (p) await vgSpeichern(p.id, p.body);
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-vgbsp],[data-vgvt],[data-vgzu],[data-vgpdf],[data-vgab],[data-vgauf],[data-vgweg],[data-vgvorgabe],[data-vgag],[data-vgoffen]'); if (!t) return;
  if (t.dataset.vgbsp !== undefined) { if (!L) return; vgZurSeite(null, vgBsAid()); return; }   // Befehlsleiste „Angebote“ → Seite „Angebotsbesprechung“
  if (t.dataset.vgvt) { const x = typeof auNtLv === 'function' ? auNtLv() : null, lid = x ? x.id : L && L.id; if (!lid) { toast('Erst den Auftrag wählen.', true); return; } await vgLaden(lid);
    if (t.dataset.vgvt === 'besprechung') {   // Protokoll mit der beauftragten Firma
      const V = (L && L.id === lid && L.vergabe) || {}, alle = VG.D.dokumente.filter((y) => y.art === 'besprechung');
      const da = alle.find((y) => V.angebot_id && y.angebot_id === V.angebot_id) || (alle.length === 1 ? alle[0] : null);
      if (da) vgEditor(da.id); else if (V.angebot_id) vgBesprechung(V.angebot_id); else vgZurSeite();
      return;
    }
    const da = VG.D.dokumente.filter((y) => y.art === t.dataset.vgvt).pop(); if (da) vgEditor(da.id); else vgVertrag(t.dataset.vgvt, lid); return; }
  if (t.dataset.vgoffen) { await vgLaden(+t.dataset.lid); vgEditor(+t.dataset.vgoffen); return; }
  const ov = t.closest('.vg-ed') || document.querySelector('.vg-ed.vg-inline'); if (!ov) return;   // Befehlsleiste der Seite: das Protokoll auf der Seite
  await vgFlush();   // offene Eingaben zuerst speichern
  const id = +ov.dataset.id, x = VG.D.dokumente.find((y) => y.id === id);
  if (t.dataset.vgzu !== undefined) { ov.remove(); if (L && L.id === VG.lid) { L = await api('api/lv/' + L.id); render(); } return; }
  if (t.dataset.vgag) { await vgSpeichern(id, { vertrag: { ag_art: t.dataset.vgag }, neu_aufbauen: true }); vgEditor(id); return; }
  if (t.dataset.vgvorgabe !== undefined) { try { await api('api/vergabedok/vorgaben', 'POST', { grundlagen: x.data.grundlagen }); toast('Grundlagen als Vorgabe des Büros gemerkt – gilt für neue Protokolle.'); } catch (er) { toast(er.message, true); } return; }
  if (t.dataset.vgauf !== undefined) { await vgSpeichern(id, { status: 'entwurf' }); vgEditor(id); return; }
  if (t.dataset.vgab !== undefined) {
    try { const d = await api(`api/vergabedok/${id}/abschliessen`, 'POST'); VG.D = d; vgEditor(id); toast('Übernommen: ' + (d.uebernommen || []).join(' · ')); if (L && L.id === VG.lid) { L = await api('api/lv/' + L.id); render(); } }
    catch (er) { toast(er.message, true); } return;
  }
  if (t.dataset.vgweg !== undefined) {
    try { const d = await api('api/vergabedok/' + id, 'DELETE'); VG.D = d; if (ov.classList.contains('vg-inline')) vgBsNeu(); else ov.remove(); const lid = VG.lid;
      rueckgaengig(`${VG.D.arten[x.art]} gelöscht`, async () => { await api(`api/bp/papierkorb/${d.papierkorb}/zurueck`, 'POST'); await vgLaden(lid); vgEditor(id); }); }
    catch (er) { toast(er.message, true); } return;
  }
  if (t.dataset.vgpdf !== undefined) {
    BPHead.ansehen([{ url: `api/vergabedok/${id}.pdf?neu=${x.status === 'unterschrieben' ? 0 : 1}&t=${Date.now()}`, typ: 'pdf', name: VG.D.arten[x.art], beiUnterschrift: (blob, nm) => vgHinterlegen(id, blob, nm) }]);
  }
});

/* Unterschriebene Fassung hinterlegen (PDF aus der Vorschau, Scan oder Foto) – liegt danach im Projektordner (Angebote bzw. Verträge / Gewerk) */
async function vgHinterlegen(id, blob, nm) {
  const fd = new FormData(); fd.append('datei', blob, nm || 'Unterlage.pdf');
  try { const r = await fetch(`api/vergabedok/${id}/unterschrieben`, { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Speichern fehlgeschlagen');
    VG.D = d; if (document.querySelector('.vg-ed:not(.vg-inline)')) vgEditor(id);
    toast(d.ablage ? `Unterschrieben gespeichert und abgelegt: ${d.ablage}` : `Unterschrieben gespeichert${d.ablage_fehler ? ' – nicht im Projektordner: ' + d.ablage_fehler : ''}.`, !!d.ablage_fehler);
    await vgBsNeu(); }
  catch (er) { toast(er.message, true); }
}

/* ---------- Seite „Angebotsbesprechung“ unter Vergabe (besprochen am 13.11.2026): oben die Bieter:innen mit dem Stand ihres Protokolls,
   darunter das Protokoll kompakt zum Ausfüllen; Blanko, digital unterschreiben, Einlesen und Suchen in der Befehlsleiste ---------- */
const BS = { treffer: null, fuer: null };
const vgBsAid = () => { const s = PJSEL && PJSEL[0] === 'b' ? +PJSEL.slice(1) : null; return L && L.angebote.some((a) => a.id === s) ? s : (L && L.vergabe.angebot_id) || null; };
const vgBsDok = (aid) => ((VG.lid === (L && L.id) && VG.D ? VG.D.dokumente : []).filter((x) => x.art === 'besprechung' && x.angebot_id === aid).sort((a, b) => b.id - a.id)[0]);
const BS_ST = { entwurf: ['Entwurf', 'e'], abgeschlossen: ['abgeschlossen', 'a'], unterschrieben: ['unterschrieben', 'u'] };
async function vgZurSeite(x, aid) {   // Protokoll (oder Bieter:in) auf der Seite zeigen – auch aus Aufträgen oder einem Verweis
  const lid = x ? x.lv_id || VG.lid : L && L.id; aid = aid || (x && x.angebot_id);
  if (aid) PJSEL = 'b' + aid;
  if (tab !== 'besprechung') { tab = 'besprechung'; LS.set('tab', tab); }
  if (lid && (!L || L.id !== lid)) { await openLv(lid); return; }
  render();
}
function vBesprechung() { return `<div class="bs-seite" id="bsSeite">${VG.D && VG.lid === (L && L.id) ? vgBsHtml() : '<p class="hint">Lade …</p>'}</div>`; }
async function vgBsSeiteLaden() {
  const el = document.getElementById('bsSeite'); if (!el || !L) return;
  if (!L.angebote.length) { el.innerHTML = '<div class="card empty"><p class="hint">Noch keine Angebote – die Besprechung kommt nach dem Preisspiegel.</p></div>'; return; }
  try { if (VG.lid !== L.id || !VG.D) { await vgLaden(L.id); vgBsZeigen(); } } catch (e) { el.innerHTML = `<p class="hint">${esc(e.message)}</p>`; }
}
function vgBsZeigen() {
  const el = document.getElementById('bsSeite'); if (!el || !L || VG.lid !== L.id || !VG.D) return;
  const y = (document.querySelector('#view .re2-ed') || {}).scrollTop;
  el.innerHTML = vgBsHtml(); uLeisteNeu();
  const r = document.querySelector('#view .re2-ed'); if (r && y) r.scrollTop = y;   // beim Neuzeichnen nicht nach oben springen
}
async function vgBsNeu() { if (L) { try { await vgLaden(L.id); } catch { /* egal */ } } vgBsZeigen(); }
function vgBsHtml() {
  if (!L.angebote.length) return '<div class="card empty"><p class="hint">Noch keine Angebote – die Besprechung kommt nach dem Preisspiegel.</p></div>';
  VG.teiln = [...new Set([(window.BPHead && BPHead.me && (BPHead.me.full || BPHead.me.name)) || '', 'Bauherr:in', 'Vertreter:in der Bieter:in'].filter(Boolean))];   // Vorschläge für „Teilnehmer:innen“ (werden angehängt)
  const K = L.calc.angebote, aid = vgBsAid(), A = [...L.angebote].sort((a, b) => ((K.find((x) => x.id === a.id) || {}).rang || 99) - ((K.find((x) => x.id === b.id) || {}).rang || 99));
  const kopf = `<div class="bs-kopf"><h3>Angebotsbesprechung <small>${esc(L.nr || '')} ${esc(L.name || '')}</small></h3><div class="bs-l" role="tablist">${A.map((a) => { const d = vgBsDok(a.id), st = d ? BS_ST[d.status] || [d.status, 'e'] : ['keins', 'n'], k = K.find((x) => x.id === a.id) || {};
    return `<button type="button" role="tab" aria-selected="${a.id === aid}" class="bs-r${a.id === aid ? ' on' : ''}" data-bswahl="${a.id}"><span><b>${esc(a.bieter)}</b><small>${k.rang ? 'Rang ' + k.rang + ' · ' : ''}${k.netto ? eur0(k.netto) : ''}${L.vergabe.angebot_id === a.id ? ' · beauftragt' : ''}</small></span><i class="bs-st ${st[1]}">${st[0]}</i></button>`; }).join('')}</div></div>`;
  if (!aid) return kopf + '<p class="hint">Oben eine Bieter:in wählen.</p>';
  const d = vgBsDok(aid), T = d && BS.fuer === d.id && BS.treffer ? `<div class="bs-fund">${BS.treffer.length ? `<b>Im Projektordner gefunden:</b>${BS.treffer.map((t) => `<div class="bs-f"><span>📄 ${esc(t.name)}<small>${esc(t.pfad)}</small></span><button type="button" class="btn sm" data-bsdatei="${esc(t.pfad)}">ansehen</button><button type="button" class="btn sm pri" data-bszu="${esc(t.pfad)}">zuordnen</button></div>`).join('')}` : 'Im Projektordner nichts Passendes gefunden (Dateiname mit „Besprechung“ oder „Protokoll“ und der Bieter:in).'}<button type="button" class="bph-x" data-bsfundx aria-label="Schließen">✕</button></div>` : '';
  if (!d) return kopf + `<div class="bs-w">
      <div><b>💻 Am Bildschirm</b><span>Vorausgefüllt aus Projekt, Angebot und Preisspiegel – im Gespräch gelb ergänzen, „Abschließen“ übernimmt Nachlass und Skonto.</span><button type="button" class="btn pri" data-bsoffen="${aid}">Protokoll anlegen</button></div>
      <div><b>🖨 Auf Papier</b><span>Blanko für die Baustelle: Kopf, Bieter:in, Angebot und Klärungspunkte stehen drin, die Gesprächsfelder sind Linien.</span><button type="button" class="btn" data-bsblanko="${aid}">Blanko drucken</button></div>
      <div><b>⤓ Zurück in die Plattform</b><span>Ausgefülltes Blatt als Scan oder Foto einlesen – oder im Projektordner suchen lassen.</span><span class="bs-k"><label class="btn">Einlesen …<input type="file" accept=".pdf,application/pdf,image/*" hidden data-bsein="${aid}"></label><button type="button" class="btn" data-bssuchen="${aid}">Suchen</button></span></div></div>${T}`;
  const st = BS_ST[d.status] || [d.status, 'e'], fest = d.status !== 'entwurf';
  return kopf + `<p class="bs-stand"><i class="bs-st ${st[1]}">${st[0]}</i>${d.ablage ? ` liegt im Projektordner: ${esc(d.ablage)}` : ''}${fest ? ' · zum Ändern „Wieder öffnen“' : ' · <span class="bs-leg"><b class="q">blau</b> aus der Plattform · <b class="gs">gelb</b> im Gespräch eintragen · alles wird sofort gespeichert</span>'}</p>${T}
    <div class="vg-ed vg-inline" data-id="${d.id}">${vgBesprechungForm(d)}</div>`;
}
function vgBsBefehle() {   // Befehlsleiste der Seite (ava-kern.js → bereichBefehle)
  const aid = vgBsAid(), d = aid && vgBsDok(aid), fest = d && d.status !== 'entwurf', ic = {
    ok: '<path d="M5 12l5 5 9-10"/>', auf: '<path d="M4 4v6h6"/><path d="M20 12a8 8 0 1 1-2.3-5.7L20 9"/>', druck: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
    ein: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>', such: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', sig: '<path d="M3 17c3-4 5-9 7-9s-1 9 2 9 3-5 5-5 2 3 4 3"/><path d="M3 21h18"/>', pdf: BIC.dok,
    weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>', vt: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>' };
  if (!aid) return [];
  return [{ titel: 'Protokoll', knoepfe: [!d ? { t: 'Anlegen', ic: BIC.plus, attrs: `data-bsoffen="${aid}"`, tip: 'Protokoll vorausgefüllt anlegen' }
      : fest ? { t: 'Wieder öffnen', ic: ic.auf, attrs: 'data-vgauf', tip: 'Wieder bearbeiten' } : { t: 'Abschließen', ic: ic.ok, attrs: 'data-vgab', tip: 'Nachlass und Skonto ins Angebot übernehmen (und in den Auftrag, falls schon an diese Bieter:in vergeben)' },
    { t: 'Löschen', ic: ic.weg, attrs: 'data-vgweg', aus: !d, rot: true, tip: 'Protokoll in den Papierkorb' }] },
  { titel: 'Papier', knoepfe: [{ t: 'Blanko drucken', ic: ic.druck, attrs: `data-bsblanko="${aid}"`, tip: 'Blanko für die Baustelle – Kopf, Bieter:in, Angebot und Klärungspunkte stehen drin' },
    { t: 'Einlesen', ic: ic.ein, datei: { accept: '.pdf,application/pdf,image/*', attrs: `data-bsein="${aid}"` }, tip: 'Ausgefülltes Blatt als Scan oder Foto einlesen' },
    { t: 'Im Ordner suchen', ic: ic.such, attrs: `data-bssuchen="${aid}"`, tip: 'Im Projektordner nach dem unterschriebenen Protokoll suchen' }] },
  { titel: 'Unterschreiben', knoepfe: [{ t: 'Digital', ic: ic.sig, attrs: `data-bsdigital="${aid}"`, aus: d && d.status === 'unterschrieben', tip: 'Am Tablet oder Handy vor Ort: erst die Bauleitung, dann die Bieter:in – das PDF geht in den Projektordner' },
    { t: 'PDF', ic: ic.pdf, attrs: d && d.status === 'unterschrieben' ? `data-bsansehen="${d.id}"` : 'data-vgpdf', aus: !d, tip: 'Protokoll als PDF ansehen' }] },
  { titel: 'Vergabe', knoepfe: [!L.vergabe.bieter ? { t: 'Vergeben …', ic: ic.ok, attrs: `data-vergabe="${aid}"`, tip: 'Nach der Besprechung: an diese Bieter:in vergeben' } : null,
    L.vergabe.angebot_id === aid ? { t: 'Bauvertrag', ic: ic.vt, attrs: 'data-vgvt="vertrag"', tip: 'Bauvertrag aus diesem Protokoll' } : null,
    L.vergabe.bieter ? { t: 'Vergabe aufheben', ic: ic.auf, attrs: 'data-act="vergabeWeg"', tip: `Beauftragung von ${L.vergabe.bieter} zurücknehmen – mit Rechnungen nur nach strenger Rückfrage` } : null] }];
}
/* Auswahlfeld ▾: übliche Antworten, „eigener Text …“ setzt den Cursor ins Feld */
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-vgvor]'); if (!b) return;
  e.preventDefault();
  const key = b.dataset.vgvor, inp = b.parentElement.querySelector('[data-vgf]'), anh = key === 'kopf.teilnehmer', L0 = (key === 'kopf.teilnehmer' ? VG.teiln : VG_VOR[key]) || [];
  pickMenu(b, { items: [...L0.map((v) => ({ value: v, title: v, on: !anh && v === inp.value })), { value: '__frei', title: 'eigener Text …' }],
    onPick: (v) => { if (v === '__frei') { inp.focus(); if (inp.select) inp.select(); return; }
      inp.value = anh && inp.value.trim() ? (inp.value.split(/\s*[,·]\s*/).includes(v) ? inp.value : inp.value.trim() + ', ' + v) : v;
      inp.dispatchEvent(new Event('input', { bubbles: true })); } });
});
async function vgBsSicher(aid) {   // Protokoll dieser Bieter:in – fehlt es, vorausgefüllt anlegen (ohne den Editor zu öffnen)
  if (VG.lid !== L.id || !VG.D) await vgLaden(L.id);
  let d = vgBsDok(aid); if (d) return d;
  const a = L.angebote.find((x) => x.id === aid), k = L.calc.angebote.find((x) => x.id === aid) || {};
  VG.D = await api(`api/lv/${L.id}/besprechung`, 'POST', { angebot_id: aid, summe: k.netto || 0, klaerung: vgKlaerung(a) }); VG.lid = L.id;
  d = vgBsDok(aid); refreshList(); return d;
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-bswahl],[data-bsoffen],[data-bsblanko],[data-bsdigital],[data-bssuchen],[data-bszu],[data-bsdatei],[data-bsansehen],[data-bsfundx]'); if (!t || !L) return;
  try {
    if (t.dataset.bsfundx !== undefined) { BS.treffer = null; vgBsZeigen(); return; }
    if (t.dataset.bswahl) { await vgFlush(); PJSEL = 'b' + t.dataset.bswahl; PJX.add(L.id); BS.treffer = null; vgBsZeigen(); return; }
    if (t.dataset.bsansehen) { BPHead.ansehen([{ url: `api/vergabedok/${t.dataset.bsansehen}.pdf?t=${Date.now()}`, typ: 'pdf', name: 'Angebotsbesprechung (unterschrieben)' }]); return; }
    if (t.dataset.bsdatei) { BPHead.ansehen([{ url: `api/vergabedok/${BS.fuer}/datei?pfad=${encodeURIComponent(t.dataset.bsdatei)}`, typ: /\.pdf$/i.test(t.dataset.bsdatei) ? 'pdf' : 'bild', name: t.dataset.bsdatei.split('/').pop() }]); return; }
    if (t.dataset.bszu) { const id = BS.fuer, alt = vgBsDok(vgBsAid()) || {}; VG.D = await api(`api/vergabedok/${id}/zuordnen`, 'POST', { pfad: t.dataset.bszu }); BS.treffer = null; toast('Protokoll zugeordnet – Stand „unterschrieben“.');
      if (alt.status !== 'unterschrieben') rueckgaengig('Protokoll zugeordnet', async () => { VG.D = await api(`api/vergabedok/${id}/zuordnen`, 'POST', { zurueck: alt.status || 'entwurf' }); await vgBsNeu(); });
      await vgBsNeu(); return; }
    const aid = +(t.dataset.bsoffen || t.dataset.bsblanko || t.dataset.bsdigital || t.dataset.bssuchen);
    if (t.dataset.bsoffen) { await vgBsSicher(aid); vgBsZeigen(); return; }
    const d = await vgBsSicher(aid);
    if (t.dataset.bsblanko) { BPHead.ansehen([{ url: `api/vergabedok/${d.id}.pdf?blanko=1&t=${Date.now()}`, typ: 'pdf', name: 'Angebotsbesprechung (blanko)' }]); await vgBsNeu(); return; }
    if (t.dataset.bsdigital) {   // ansehen, dann „✍ Unterschreiben“: erst die eigene Unterschrift, danach die der Bieter:in – erst dann wird hinterlegt
      BPHead.ansehen([{ url: `api/vergabedok/${d.id}.pdf?neu=1&t=${Date.now()}`, typ: 'pdf', name: 'Angebotsbesprechung', folge: [{ fremd: 'Bieter:in' }], beiUnterschrift: (blob, nm) => vgHinterlegen(d.id, blob, nm) }]);
      const t0 = Date.now(), los = () => { const u = document.querySelector('.bph-gv [data-gv="us"]'); if (u && !u.hidden && document.querySelector('.bph-gv canvas.bph-gvc')) setTimeout(() => u.click(), 300); else if (document.querySelector('.bph-gv') && Date.now() - t0 < 15000) setTimeout(los, 200); };
      setTimeout(los, 300);   // sobald das PDF da ist, gleich mit dem Unterschreiben anfangen
      await vgBsNeu(); return; }
    if (t.dataset.bssuchen) { t.disabled = true; const r = await api(`api/vergabedok/${d.id}/suchen`); BS.treffer = r.treffer || []; BS.fuer = d.id; await vgBsNeu(); }
  } catch (er) { toast(er.message, true); }
});
document.addEventListener('change', async (e) => {   // Scan oder Foto des ausgefüllten Blatts einlesen
  const i = e.target; if (!i.dataset || !i.dataset.bsein || !i.files.length || !L) return;
  const f = i.files[0], aid = +i.dataset.bsein; i.value = '';
  try { const d = await vgBsSicher(aid); await vgHinterlegen(d.id, f, f.name); } catch (er) { toast(er.message, true); }
});
/* einzeilige Felder (Anschriften, Klärungspunkte): beim Hineinklicken auf die ganze Höhe, beim Verlassen wieder eine Zeile */
const vgHoch = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; };
document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('vg-1')) vgHoch(e.target); });
document.addEventListener('focusout', (e) => { if (e.target.classList && e.target.classList.contains('vg-1')) e.target.style.height = ''; });
document.addEventListener('input', (e) => { if (e.target.classList && e.target.classList.contains('vg-1')) vgHoch(e.target); });
