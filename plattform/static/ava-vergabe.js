'use strict';
/* Ausschreibung – Unterlagen der Vergabe (vor ava-start.js geladen, gemeinsame Namen; Server: ava_vergabe.py).
   Angebotsbesprechung: je Bieter ein Protokoll im Aufbau des Büro-Vordrucks – vorausgefüllt (Projekt, Büro, Adressen, Angebot,
   Summe und auffällige Positionen aus dem Preisspiegel, Termine aus dem Bauzeitenplan, Grundlagen als Vorgabe des Büros), im Gespräch
   ergänzt (gelb), „Abschließen“ übernimmt Nachlass/Skonto ins Angebot bzw. den Auftrag, PDF in der Vorschau unterschreiben.
   Bauvertrag / Auftragsschreiben: im Bereich Aufträge aus Auftrag + Protokoll; Art des Auftraggebers baut die Texte neu.
   Aufruf: Befehlsleiste „Angebote“ → Besprechung, „Aufträge“ → Bauvertrag / Auftragsschreiben; Ablauf oben → „Besprechung“. */
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
/* Bieter wählen (gewählter im Baum, sonst Auswahl nach Rang) */
function vgBieterWahl(anchor) {
  if (!L || !L.angebote.length) { toast('Noch keine Angebote.', true); return; }
  const sel = PJSEL && PJSEL[0] === 'b' ? +PJSEL.slice(1) : null;
  if (sel && L.angebote.some((a) => a.id === sel)) { vgBesprechung(sel); return; }
  const K = L.calc.angebote, P = (L.vergabedok || []).filter((x) => x.art === 'besprechung');
  pickMenu(anchor, { items: [...L.angebote].sort((a, b) => ((K.find((x) => x.id === a.id) || {}).rang || 99) - ((K.find((x) => x.id === b.id) || {}).rang || 99)).map((a) => {
    const k = K.find((x) => x.id === a.id) || {}, p = P.find((x) => x.angebot_id === a.id);
    return { value: a.id, title: a.bieter, sub: [k.rang ? 'Rang ' + k.rang : '', k.netto ? eur0(k.netto) : '', p ? 'Protokoll ' + (VG.D ? VG.D.status[p.status] : p.status) : ''].filter(Boolean).join(' · ') }; }),
    onPick: (v) => vgBesprechung(+v) });
}
async function vgVertrag(art, lid) {
  try { const d = await api(`api/lv/${lid}/bauvertrag`, 'POST', { art, ag_art: 'unternehmen' }); VG.lid = lid; VG.D = d; vgEditor(d.neu); if (L && L.id === lid) render(); }
  catch (e) { toast(e.message, true); }
}

/* ---------- Editor (ganze Fläche, wie „Im PDF ausfüllen“) ---------- */
let VGT = 0, VGP = null;   // Eingaben sammeln (alle Felder, nicht nur das letzte) und vor jeder Aktion senden
function vgEditor(id) {
  const x = VG.D.dokumente.find((y) => y.id === id); if (!x) return;
  let ov = document.querySelector('.vg-ed');
  if (!ov) { ov = document.createElement('div'); ov.className = 'vg-ed'; ov.setAttribute('role', 'dialog'); document.body.appendChild(ov); }
  ov.dataset.id = id;
  const D = x.data, fest = x.status !== 'entwurf', hl = (v) => (String(v ?? '').trim() ? '' : ' leer');
  const f = (bereich, k, lab, opt = {}) => { const v = bereich ? (D[bereich] || {})[k] : D[k], g = opt.gespraech;
    const ein = opt.zeilen ? `<textarea rows="${opt.zeilen}" data-vgf="${bereich}.${k}"${fest ? ' disabled' : ''}>${vgEsc(v)}</textarea>`
      : `<input data-vgf="${bereich}.${k}" value="${vgEsc(v)}"${opt.typ ? ` type="${opt.typ}"` : ''}${fest ? ' disabled' : ''}${opt.ph ? ` placeholder="${vgEsc(opt.ph)}"` : ''}>`;
    return `<label class="vg-f${g ? ' gs' + hl(v) : ''}${opt.breit ? ' w' : ''}"><span>${lab}${opt.quelle ? `<i>${opt.quelle}</i>` : ''}</span>${ein}</label>`; };
  const titel = VG.D.arten[x.art];
  let body;
  if (x.art === 'besprechung') {
    body = `<h4>Protokoll</h4><div class="vg-g">${f('kopf', 'datum', 'Datum', { typ: 'date' })}${f('kopf', 'uhrzeit', 'Uhrzeit', { typ: 'time', gespraech: 1 })}${f('kopf', 'ort', 'Ort')}
        ${f('kopf', 'bauvorhaben', 'Bauvorhaben', { zeilen: 2, breit: 1, quelle: 'Projekt' })}${f('kopf', 'bauherr', 'Bauherr/AG', { zeilen: 3, quelle: 'Projekt' })}${f('kopf', 'architekt', 'Architekt', { zeilen: 3, quelle: 'Büro' })}
        ${f('kopf', 'bieter', 'Bieter/AN', { zeilen: 4, quelle: 'Adressen' })}${f('kopf', 'teilnehmer', 'Teilnehmer', { gespraech: 1, zeilen: 2 })}</div>
      <h4>Angaben zum Bieter/AN</h4><div class="vg-g">${f('bieterangaben', 'rechtsform', 'Rechtsform/Sitz', { gespraech: 1 })}${f('bieterangaben', 'mitarbeiter', 'Anzahl der Mitarbeiter', { gespraech: 1 })}
        ${f('bieterangaben', 'mitarbeiter_projekt', 'Mitarbeiter für das Projekt', { gespraech: 1 })}${f('bieterangaben', 'bauleiter', 'Bauleiter für das Projekt', { gespraech: 1 })}${f('bieterangaben', 'subunternehmer', 'Subunternehmer', { gespraech: 1 })}</div>
      <h4>Angaben zum Angebot</h4><div class="vg-g">${f('angebot', 'gueltig', 'Gültigkeit des Angebots', { gespraech: 1 })}${f('angebot', 'gewerke', 'Angebotene Gewerke', { quelle: 'LV' })}
        ${f('angebot', 'angebot_vom', 'Angebot vom', { typ: 'date', quelle: 'Angebot' })}${f('angebot', 'nachtrag_vom', 'Nachtragsangebot vom', { typ: 'date' })}
        ${f('angebot', 'summe', 'Angebotssumme nach Prüfung', { breit: 1, quelle: 'Preisspiegel' })}
        ${f('angebot', 'nachlass', 'Nachlass auf die EP (%)', { gespraech: 1 })}${f('angebot', 'skonto', 'Skonto (%)', { gespraech: 1 })}${f('angebot', 'skonto_tage', 'Skonto bei Zahlung innerhalb … Arbeitstagen', { gespraech: 1 })}
        ${f('angebot', 'preis', 'Preis', { breit: 1 })}${f('angebot', 'klaerung', 'Klärung einzelner Positionen', { zeilen: 4, breit: 1, gespraech: 1, quelle: 'Preisspiegel' })}</div>
      <h4>Termine</h4><div class="vg-g">${f('termine', 'beginn', 'Beginn der Ausführung', { quelle: 'Bauzeitenplan' })}${f('termine', 'fertig', 'Fertigstellung der Arbeiten', { quelle: 'Bauzeitenplan' })}
        ${f('termine', 'unterbrechung', 'Arbeitsunterbrechung', { gespraech: 1 })}${f('termine', 'bauzeitenplan', 'Bauzeitenplan', { breit: 1, quelle: 'Bauzeitenplan' })}</div>
      <h4>Grundlagen <small>Vorgabe des Büros${fest ? '' : ' – <button type="button" class="btn sm" data-vgvorgabe>als Vorgabe des Büros merken</button>'}</small></h4>
      <div class="vg-g">${VG.D.grundlagen.map(([k, t]) => f('grundlagen', k, t, { breit: k === 'bescheinigungen' || k === 'einbehalt' })).join('')}</div>
      <h4>Sonstiges</h4><div class="vg-g">${f('', 'sonstiges', 'Sonstiges', { zeilen: 3, breit: 1, gespraech: 1 })}</div>`;
  } else {
    const V = D.vertrag || {};
    body = `<div class="vg-g"><span class="vg-f w"><span>Auftraggeber ist</span><span class="seg" role="group">${Object.entries(VG.D.ag_arten).map(([k, t]) => `<button type="button" data-vgag="${k}" class="${V.ag_art === k ? 'on' : ''}"${fest ? ' disabled' : ''}>${t}</button>`).join('')}</span></span>
      ${V.ag_art === 'privat' ? '<p class="vg-h w">Privatperson: Der Vertrag stützt sich auf das BGB (§§ 650a ff.) – die VOB/B ist gegenüber Verbrauchern nicht als Ganzes privilegiert (BGH, 24.07.2008 – VII ZR 55/07). Ein Verbraucherbauvertrag (§ 650i BGB: Baubeschreibung, Widerrufsbelehrung, 90-%-Grenze bei Abschlägen) liegt bei Einzelgewerken meist nicht vor (BGH, 16.03.2023 – VII ZR 94/22) – wird der ganze Neubau oder ein erheblicher Umbau aus einer Hand vergeben, bitte gesondert prüfen.</p>' : ''}
      ${V.ag_art === 'oeffentlich' ? '<p class="vg-h w">Öffentlicher Auftraggeber: dessen Vertragsmuster (z. B. VHB) und Vergaberecht gehen vor – dieser Text ist dann nur ein Entwurf.</p>' : ''}
      ${f('vertrag', 'ag', 'Auftraggeber', { zeilen: 3, quelle: 'Projekt' })}${f('vertrag', 'ag_vertreter', 'vertreten durch', { gespraech: 1 })}${f('vertrag', 'an', 'Auftragnehmer', { zeilen: 3, quelle: 'Auftrag' })}
      ${f('vertrag', 'gegenstand', 'Gegenstand', { zeilen: 2, breit: 1 })}${f('vertrag', 'bestandteile', 'Vertragsbestandteile (Rangfolge)', { zeilen: 8, breit: 1, quelle: 'Protokoll / LV' })}
      ${f('vertrag', 'verguetung', 'Vergütung', { zeilen: 3, breit: 1, quelle: 'Auftrag' })}${f('vertrag', 'termine', 'Ausführungsfristen', { zeilen: 3, breit: 1, quelle: 'Protokoll' })}
      ${f('vertrag', 'zahlung', 'Zahlung', { zeilen: 3, breit: 1, quelle: 'Protokoll' })}${f('vertrag', 'sicherheiten', 'Sicherheiten', { zeilen: 2, breit: 1, quelle: 'Protokoll' })}
      ${f('vertrag', 'abnahme', 'Abnahme und Mängelansprüche', { zeilen: 2, breit: 1, quelle: 'Protokoll' })}${f('vertrag', 'weiteres', 'Weitere Vereinbarungen', { zeilen: 5, breit: 1, quelle: 'Büro' })}
      ${f('vertrag', 'ort_datum', 'Ort, Datum (Auftraggeber)', { ph: 'leer = Ort des Büros, heute' })}</div>`;
  }
  const st = VG.D.status[x.status];
  ov.innerHTML = `<div class="vg-k"><b>${titel}</b><span class="mute">${vgEsc(x.art === 'besprechung' ? ((D.kopf || {}).bieter || '').split('\n')[0] : ((D.vertrag || {}).an || '').split('\n')[0])} · ${st}${x.ablage ? ' · abgelegt' : ''}</span>
      <span class="fill"></span><button type="button" class="btn" data-vgpdf>PDF ✍ unterschreiben</button>
      ${x.art === 'besprechung' && x.status === 'entwurf' ? '<button type="button" class="btn pri" data-vgab title="Nachlass und Skonto ins Angebot (und in den Auftrag, falls schon an diesen Bieter vergeben)">Abschließen → übernehmen</button>' : ''}
      ${fest ? '<button type="button" class="btn" data-vgauf title="Wieder bearbeiten">Wieder öffnen</button>' : ''}
      <button type="button" class="btn" data-vgweg title="In den Papierkorb">🗑</button><button type="button" class="btn" data-vgzu>Schließen</button></div>
    <div class="vg-b"><p class="vg-h">${x.art === 'besprechung' ? 'Blau markiert: aus der Plattform vorausgefüllt · <span class="gsm">gelb</span>: im Gespräch eintragen. Alles wird sofort gespeichert.' : 'Aus Auftrag und Protokoll vorausgefüllt – jeder Text änderbar. Andere Art des Auftraggebers baut die Texte neu auf.'}</p>${body}</div>`;
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
});
async function vgFlush() {
  clearTimeout(VGT); const p = VGP; VGP = null;
  if (p) await vgSpeichern(p.id, p.body);
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-vgbsp],[data-vgvt],[data-vgzu],[data-vgpdf],[data-vgab],[data-vgauf],[data-vgweg],[data-vgvorgabe],[data-vgag],[data-vgoffen]'); if (!t) return;
  if (t.dataset.vgbsp !== undefined) { if (!L) return; await vgLaden(L.id); vgBieterWahl(t); return; }
  if (t.dataset.vgvt) { const x = typeof auNtLv === 'function' ? auNtLv() : null, lid = x ? x.id : L && L.id; if (!lid) { toast('Erst den Auftrag wählen.', true); return; } await vgLaden(lid);
    if (t.dataset.vgvt === 'besprechung') {   // Protokoll mit der beauftragten Firma
      const V = (L && L.id === lid && L.vergabe) || {}, alle = VG.D.dokumente.filter((y) => y.art === 'besprechung');
      const da = alle.find((y) => V.angebot_id && y.angebot_id === V.angebot_id) || (alle.length === 1 ? alle[0] : null);
      if (da) vgEditor(da.id); else if (V.angebot_id) vgBesprechung(V.angebot_id); else toast('Noch kein Protokoll – unter Angebote → „Besprechung“ anlegen.', true);
      return;
    }
    const da = VG.D.dokumente.filter((y) => y.art === t.dataset.vgvt).pop(); if (da) vgEditor(da.id); else vgVertrag(t.dataset.vgvt, lid); return; }
  if (t.dataset.vgoffen) { await vgLaden(+t.dataset.lid); vgEditor(+t.dataset.vgoffen); return; }
  const ov = t.closest('.vg-ed'); if (!ov) return;
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
    try { const d = await api('api/vergabedok/' + id, 'DELETE'); VG.D = d; ov.remove(); const lid = VG.lid;
      rueckgaengig(`${VG.D.arten[x.art]} gelöscht`, async () => { await api(`api/bp/papierkorb/${d.papierkorb}/zurueck`, 'POST'); await vgLaden(lid); vgEditor(id); }); }
    catch (er) { toast(er.message, true); } return;
  }
  if (t.dataset.vgpdf !== undefined) {
    BPHead.ansehen([{ url: `api/vergabedok/${id}.pdf?neu=${x.status === 'unterschrieben' ? 0 : 1}&t=${Date.now()}`, typ: 'pdf', name: VG.D.arten[x.art], beiUnterschrift: async (blob, nm) => {
      const fd = new FormData(); fd.append('datei', blob, nm || 'Unterlage.pdf');
      try { const r = await fetch(`api/vergabedok/${id}/unterschrieben`, { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Speichern fehlgeschlagen');
        VG.D = d; if (document.querySelector('.vg-ed')) vgEditor(id);
        toast(d.ablage ? `Unterschrieben gespeichert und abgelegt: ${d.ablage}` : `Unterschrieben gespeichert${d.ablage_fehler ? ' – nicht im Projektordner: ' + d.ablage_fehler : ''}.`, !!d.ablage_fehler); }
      catch (er) { toast(er.message, true); } } }]);
  }
});
