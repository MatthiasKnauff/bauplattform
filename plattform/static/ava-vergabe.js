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
      : opt.wahl ? `<select data-vgf="${bereich}.${k}"${fest ? ' disabled' : ''}>${opt.wahl.map(([w, t]) => `<option value="${w}"${w === (v || opt.wahl[0][0]) ? ' selected' : ''}>${t}</option>`).join('')}</select>`
      : `<input data-vgf="${bereich}.${k}" value="${vgEsc(v)}"${opt.typ ? ` type="${opt.typ}"` : ''}${fest ? ' disabled' : ''}${opt.ph ? ` placeholder="${vgEsc(opt.ph)}"` : ''}>`;
    return `<label class="vg-f${g ? ' gs' + hl(v) : ''}${opt.breit ? ' w' : ''}"><span>${lab}${opt.quelle ? `<i>${opt.quelle}</i>` : ''}</span>${ein}</label>`; };
  const titel = VG.D.arten[x.art];
  let body;
  if (x.art === 'besprechung') {
    body = `<h4>Protokoll</h4><div class="vg-g">${f('kopf', 'datum', 'Datum', { typ: 'date' })}${f('kopf', 'uhrzeit', 'Uhrzeit', { typ: 'time', gespraech: 1 })}${f('kopf', 'ort', 'Ort')}
        ${f('kopf', 'bauvorhaben', 'Bauvorhaben', { zeilen: 2, breit: 1, quelle: 'Projekt' })}${f('kopf', 'bauherr', 'Bauherr:in/AG', { zeilen: 3, quelle: 'Projekt' })}${f('kopf', 'architekt', 'Architekt:in', { zeilen: 3, quelle: 'Büro' })}
        ${f('kopf', 'bieter', 'Bieter:in/AN', { zeilen: 4, quelle: 'Adressen' })}${f('kopf', 'teilnehmer', 'Teilnehmer:in', { gespraech: 1, zeilen: 2 })}</div>
      <h4>Angaben zur Bieter:in/AN</h4><div class="vg-g">${f('bieterangaben', 'rechtsform', 'Rechtsform/Sitz', { gespraech: 1 })}${f('bieterangaben', 'mitarbeiter', 'Anzahl die Mitarbeiter:in', { gespraech: 1 })}
        ${f('bieterangaben', 'mitarbeiter_projekt', 'Mitarbeiter:in für das Projekt', { gespraech: 1 })}${f('bieterangaben', 'bauleiter', 'Bauleiter:in für das Projekt', { gespraech: 1 })}${f('bieterangaben', 'subunternehmer', 'Subunternehmer', { gespraech: 1 })}</div>
      <h4>Angaben zum Angebot</h4><div class="vg-g">${f('angebot', 'gueltig', 'Gültigkeit des Angebots', { gespraech: 1 })}${f('angebot', 'gewerke', 'Angebotene Gewerke', { quelle: 'LV' })}
        ${f('angebot', 'angebot_vom', 'Angebot vom', { typ: 'date', quelle: 'Angebot' })}${f('angebot', 'nachtrag_vom', 'Nachtragsangebot vom', { typ: 'date' })}
        ${f('angebot', 'summe', 'Angebotssumme nach Prüfung', { breit: 1, quelle: 'Preisspiegel' })}
        ${f('angebot', 'nachlass', 'Nachlass auf die EP (%)', { gespraech: 1 })}${f('angebot', 'skonto', 'Skonto (%)', { gespraech: 1 })}${f('angebot', 'skonto_tage', 'Skonto bei Zahlung innerhalb von …', { gespraech: 1 })}${f('angebot', 'skonto_art', 'gezählt in', { wahl: [['at', 'Arbeitstagen (Mo–Fr)'], ['wt', 'Werktagen (Mo–Sa)'], ['kt', 'Kalendertagen'], ['wo', 'Wochen']] })}
        ${f('angebot', 'preis', 'Preis', { breit: 1 })}${f('angebot', 'klaerung', 'Klärung einzelner Positionen', { zeilen: 4, breit: 1, gespraech: 1, quelle: 'Preisspiegel' })}</div>
      <h4>Termine</h4><div class="vg-g">${f('termine', 'beginn', 'Beginn der Ausführung', { quelle: 'Bauzeitenplan' })}${f('termine', 'fertig', 'Fertigstellung der Arbeiten', { quelle: 'Bauzeitenplan' })}
        ${f('termine', 'unterbrechung', 'Arbeitsunterbrechung', { gespraech: 1 })}
        ${(VG.D.plaene || []).length ? f('termine', 'plan_id', 'Bauzeitenplan (welcher Stand)', { wahl: VG.D.plaene.map((p) => [p.id, `${p.gueltig ? '★ ' : ''}${p.name}${p.stand ? ' · Stand ' + vgDe(p.stand) : ''}`]), quelle: 'Bauzeitenplan' }) + f('termine', 'plan_stand', 'Stand vom', { typ: 'date' }) : ''}
        ${f('termine', 'bauzeitenplan', 'Vertragsbestandteil', { breit: 1, quelle: 'Bauzeitenplan' })}</div>
      <h4>Grundlagen <small>Vorgabe des Büros${fest ? '' : ' – <button type="button" class="btn sm" data-vgvorgabe>als Vorgabe des Büros merken</button>'}</small></h4>
      <div class="vg-g">${VG.D.grundlagen.map(([k, t]) => f('grundlagen', k, t, { breit: k === 'bescheinigungen' || k === 'einbehalt' })).join('')}</div>
      <h4>Sonstiges</h4><div class="vg-g">${f('', 'sonstiges', 'Sonstiges', { zeilen: 3, breit: 1, gespraech: 1 })}</div>`;
  } else {
    const V = D.vertrag || {};
    body = `<div class="vg-g"><span class="vg-f w"><span>Auftraggeber:in ist</span><span class="seg" role="group">${Object.entries(VG.D.ag_arten).map(([k, t]) => `<button type="button" data-vgag="${k}" class="${V.ag_art === k ? 'on' : ''}"${fest ? ' disabled' : ''}>${t}</button>`).join('')}</span></span>
      ${V.ag_art === 'privat' ? '<p class="vg-h w">Privatperson: Der Vertrag stützt sich auf das BGB (§§ 650a ff.) – die VOB/B ist gegenüber Verbrauchern nicht als Ganzes privilegiert (BGH, 24.07.2008 – VII ZR 55/07). Ein Verbraucherbauvertrag (§ 650i BGB: Baubeschreibung, Widerrufsbelehrung, 90-%-Grenze bei Abschlägen) liegt bei Einzelgewerken meist nicht vor (BGH, 16.03.2023 – VII ZR 94/22) – wird der ganze Neubau oder ein erheblicher Umbau aus einer Hand vergeben, bitte gesondert prüfen.</p>' : ''}
      ${V.ag_art === 'oeffentlich' ? '<p class="vg-h w">Öffentlicher Auftraggeber: dessen Vertragsmuster (z. B. VHB) und Vergaberecht gehen vor – dieser Text ist dann nur ein Entwurf.</p>' : ''}
      ${f('vertrag', 'ag', 'Auftraggeber:in', { zeilen: 3, quelle: 'Projekt' })}${f('vertrag', 'ag_vertreter', 'vertreten durch', { gespraech: 1 })}${f('vertrag', 'an', 'Auftragnehmer:in', { zeilen: 3, quelle: 'Auftrag' })}
      ${f('vertrag', 'gegenstand', 'Gegenstand', { zeilen: 2, breit: 1 })}${f('vertrag', 'bestandteile', 'Vertragsbestandteile (Rangfolge)', { zeilen: 8, breit: 1, quelle: 'Protokoll / LV' })}
      ${f('vertrag', 'verguetung', 'Vergütung', { zeilen: 3, breit: 1, quelle: 'Auftrag' })}${f('vertrag', 'termine', 'Ausführungsfristen', { zeilen: 3, breit: 1, quelle: 'Protokoll' })}
      ${f('vertrag', 'zahlung', 'Zahlung', { zeilen: 3, breit: 1, quelle: 'Protokoll' })}${f('vertrag', 'sicherheiten', 'Sicherheiten', { zeilen: 2, breit: 1, quelle: 'Protokoll' })}
      ${f('vertrag', 'abnahme', 'Abnahme und Mängelansprüche', { zeilen: 2, breit: 1, quelle: 'Protokoll' })}${f('vertrag', 'weiteres', 'Weitere Vereinbarungen', { zeilen: 5, breit: 1, quelle: 'Büro' })}
      ${f('vertrag', 'ort_datum', 'Ort, Datum (Auftraggeber:in)', { ph: 'leer = Ort des Büros, heute' })}</div>`;
  }
  const st = VG.D.status[x.status];
  ov.innerHTML = `<div class="vg-k"><b>${titel}</b><span class="mute">${vgEsc(x.art === 'besprechung' ? ((D.kopf || {}).bieter || '').split('\n')[0] : ((D.vertrag || {}).an || '').split('\n')[0])} · ${st}${x.ablage ? ' · abgelegt' : ''}</span>
      <span class="fill"></span><button type="button" class="btn" data-vgpdf>PDF ✍ unterschreiben</button>
      ${x.art === 'besprechung' && x.status === 'entwurf' ? '<button type="button" class="btn pri" data-vgab title="Nachlass und Skonto ins Angebot (und in den Auftrag, falls schon an diesen Bieter:in vergeben)">Abschließen → übernehmen</button>' : ''}
      ${fest ? '<button type="button" class="btn" data-vgauf title="Wieder bearbeiten">Wieder öffnen</button>' : ''}
      <button type="button" class="btn" data-vgweg title="In den Papierkorb">🗑</button><button type="button" class="btn" data-vgzu>Schließen</button></div>
    <div class="vg-b"><p class="vg-h">${x.art === 'besprechung' ? 'Blau markiert: aus der Plattform vorausgefüllt · <span class="gsm">gelb</span>: im Gespräch eintragen. Alles wird sofort gespeichert.' : 'Aus Auftrag und Protokoll vorausgefüllt – jeder Text änderbar. Andere Art der Auftraggeber:in baut die Texte neu auf.'}</p>${body}</div>`;
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
    BPHead.ansehen([{ url: `api/vergabedok/${id}.pdf?neu=${x.status === 'unterschrieben' ? 0 : 1}&t=${Date.now()}`, typ: 'pdf', name: VG.D.arten[x.art], beiUnterschrift: (blob, nm) => vgHinterlegen(id, blob, nm) }]);
  }
});

/* Unterschriebene Fassung hinterlegen (PDF aus der Vorschau, Scan oder Foto) – liegt danach im Projektordner (Angebote bzw. Verträge / Gewerk) */
async function vgHinterlegen(id, blob, nm) {
  const fd = new FormData(); fd.append('datei', blob, nm || 'Unterlage.pdf');
  try { const r = await fetch(`api/vergabedok/${id}/unterschrieben`, { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Speichern fehlgeschlagen');
    VG.D = d; if (document.querySelector('.vg-ed')) vgEditor(id);
    toast(d.ablage ? `Unterschrieben gespeichert und abgelegt: ${d.ablage}` : `Unterschrieben gespeichert${d.ablage_fehler ? ' – nicht im Projektordner: ' + d.ablage_fehler : ''}.`, !!d.ablage_fehler);
    await vgBsNeu(); }
  catch (er) { toast(er.message, true); }
}

/* ---------- Schritt „Besprechung“: Bereich rechts in „Angebote“ – je Bieter:in das Protokoll, vier Wege: am Bildschirm, Blanko auf Papier,
   digital unterschreiben (Bauleitung und Bieter:in nacheinander am Gerät), Scan/Foto einlesen oder im Projektordner finden ---------- */
const BS = { treffer: null, fuer: null };
const vgBsAid = () => { const s = PJSEL && PJSEL[0] === 'b' ? +PJSEL.slice(1) : null; return L && L.angebote.some((a) => a.id === s) ? s : (L && L.vergabe.angebot_id) || null; };
const vgBsDok = (aid) => ((VG.lid === (L && L.id) && VG.D ? VG.D.dokumente : []).filter((x) => x.art === 'besprechung' && x.angebot_id === aid).sort((a, b) => b.id - a.id)[0]);
const BS_ST = { entwurf: ['Entwurf', 'e'], abgeschlossen: ['abgeschlossen', 'a'], unterschrieben: ['unterschrieben', 'u'] };
async function vgBsMount(el) {
  el.innerHTML = '<div class="sr-pad"><p class="hint">Lade …</p></div>';
  if (!L || !L.angebote.length) { el.innerHTML = '<div class="sr-pad"><div class="card empty"><p class="hint">Noch keine Angebote – die Besprechung kommt nach dem Preisspiegel.</p></div></div>'; return; }
  try { if (VG.lid !== L.id || !VG.D) await vgLaden(L.id); } catch (e) { el.innerHTML = `<div class="sr-pad"><p class="hint">${esc(e.message)}</p></div>`; return; }
  el.innerHTML = `<div class="sr-pad">${vgBsHtml()}</div>`;
}
async function vgBsNeu() { if (L) { try { await vgLaden(L.id); } catch { /* egal */ } } if (window.seiteFuellen) seiteFuellen('ang', 'bs'); }
function vgBsHtml() {
  const K = L.calc.angebote, aid = vgBsAid(), A = [...L.angebote].sort((a, b) => ((K.find((x) => x.id === a.id) || {}).rang || 99) - ((K.find((x) => x.id === b.id) || {}).rang || 99));
  const liste = A.map((a) => { const d = vgBsDok(a.id), st = d ? BS_ST[d.status] || [d.status, 'e'] : ['keine', 'n'], k = K.find((x) => x.id === a.id) || {};
    return `<button type="button" class="bs-r${a.id === aid ? ' on' : ''}" data-bswahl="${a.id}"><span><b>${esc(a.bieter)}</b><small>${k.rang ? 'Rang ' + k.rang + ' · ' : ''}${k.netto ? eur0(k.netto) : ''}${L.vergabe.angebot_id === a.id ? ' · beauftragt' : ''}</small></span><i class="bs-st ${st[1]}">${st[0]}</i></button>`; }).join('');
  if (!aid) return `<p class="hint" style="margin:0 0 .5rem">Bieter:in wählen – hier oder links im Baum:</p><div class="bs-l">${liste}</div>`;
  const a = L.angebote.find((x) => x.id === aid), d = vgBsDok(aid), fest = d && d.status === 'unterschrieben';
  const T = BS.fuer === (d && d.id) && BS.treffer ? `<div class="bs-fund">${BS.treffer.length ? `<b>Im Projektordner gefunden:</b>${BS.treffer.map((t) => `<div class="bs-f"><span>📄 ${esc(t.name)}<small>${esc(t.pfad)}</small></span><button type="button" class="btn sm" data-bsdatei="${esc(t.pfad)}">ansehen</button><button type="button" class="btn sm pri" data-bszu="${esc(t.pfad)}">zuordnen</button></div>`).join('')}` : 'Im Projektordner nichts Passendes gefunden (Dateiname mit „Besprechung“ oder „Protokoll“ und der Bieter:in).'}</div>` : '';
  return `<div class="bs-l">${liste}</div>
    <h3 class="bs-h">Angebotsbesprechung · ${esc(a.bieter)}</h3>
    <p class="hint" style="margin:0 0 .6rem">${d ? `Stand: <b>${esc((BS_ST[d.status] || [d.status])[0])}</b>${d.ablage ? ' · liegt im Projektordner: ' + esc(d.ablage) : ''}` : 'Noch kein Protokoll – es wird beim ersten Weg angelegt und aus Projekt, Angebot und Preisspiegel vorausgefüllt.'}</p>
    <div class="bs-w">
      <div><b>💻 Am Bildschirm</b><span>Vorausgefüllt, im Gespräch gelb ergänzen, „Abschließen“ übernimmt Nachlass und Skonto.</span><button type="button" class="btn" data-bsoffen="${aid}">${d ? 'Öffnen' : 'Anlegen'}</button></div>
      <div><b>🖨 Auf Papier</b><span>Blanko für die Baustelle: Kopf, Bieter:in, Angebot und Klärungspunkte stehen drin, die Gesprächsfelder sind Linien.</span><button type="button" class="btn" data-bsblanko="${aid}">Blanko drucken</button></div>
      <div><b>✍ Digital unterschreiben</b><span>Am Tablet oder Handy vor Ort: erst die Bauleitung, dann die Bieter:in mit dem Finger – das PDF geht in den Projektordner.</span><button type="button" class="btn pri" data-bsdigital="${aid}"${fest ? ' disabled title="schon unterschrieben"' : ''}>Unterschreiben …</button></div>
      <div><b>⤓ Zurück in die Plattform</b><span>Ausgefülltes Blatt als Scan oder Foto einlesen – oder im Projektordner suchen lassen.</span><span class="bs-k"><label class="btn">Einlesen …<input type="file" accept=".pdf,application/pdf,image/*" hidden data-bsein="${aid}"></label><button type="button" class="btn" data-bssuchen="${aid}">Suchen</button></span></div>
    </div>${T}
    ${fest ? `<div class="bar" style="margin-top:.6rem"><button type="button" class="btn" data-bsansehen="${d.id}">Unterschriebenes Protokoll ansehen</button>${L.vergabe.angebot_id === aid ? '<button type="button" class="btn" data-vgvt="vertrag">→ Bauvertrag aus diesem Protokoll</button>' : `<button type="button" class="btn" data-vergabe="${aid}">Vergeben …</button>`}</div>` : ''}`;
}
async function vgBsSicher(aid) {   // Protokoll dieser Bieter:in – fehlt es, vorausgefüllt anlegen (ohne den Editor zu öffnen)
  if (VG.lid !== L.id || !VG.D) await vgLaden(L.id);
  let d = vgBsDok(aid); if (d) return d;
  const a = L.angebote.find((x) => x.id === aid), k = L.calc.angebote.find((x) => x.id === aid) || {};
  VG.D = await api(`api/lv/${L.id}/besprechung`, 'POST', { angebot_id: aid, summe: k.netto || 0, klaerung: vgKlaerung(a) }); VG.lid = L.id;
  d = vgBsDok(aid); refreshList(); return d;
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-bswahl],[data-bsoffen],[data-bsblanko],[data-bsdigital],[data-bssuchen],[data-bszu],[data-bsdatei],[data-bsansehen]'); if (!t || !L) return;
  try {
    if (t.dataset.bswahl) { PJSEL = 'b' + t.dataset.bswahl; PJX.add(L.id); BS.treffer = null; render(); return; }
    if (t.dataset.bsansehen) { BPHead.ansehen([{ url: `api/vergabedok/${t.dataset.bsansehen}.pdf?t=${Date.now()}`, typ: 'pdf', name: 'Angebotsbesprechung (unterschrieben)' }]); return; }
    if (t.dataset.bsdatei) { BPHead.ansehen([{ url: `api/vergabedok/${BS.fuer}/datei?pfad=${encodeURIComponent(t.dataset.bsdatei)}`, typ: /\.pdf$/i.test(t.dataset.bsdatei) ? 'pdf' : 'bild', name: t.dataset.bsdatei.split('/').pop() }]); return; }
    if (t.dataset.bszu) { const id = BS.fuer, alt = vgBsDok(vgBsAid()) || {}; VG.D = await api(`api/vergabedok/${id}/zuordnen`, 'POST', { pfad: t.dataset.bszu }); BS.treffer = null; toast('Protokoll zugeordnet – Stand „unterschrieben“.');
      if (alt.status !== 'unterschrieben') rueckgaengig('Protokoll zugeordnet', async () => { VG.D = await api(`api/vergabedok/${id}/zuordnen`, 'POST', { zurueck: alt.status || 'entwurf' }); await vgBsNeu(); });
      await vgBsNeu(); return; }
    const aid = +(t.dataset.bsoffen || t.dataset.bsblanko || t.dataset.bsdigital || t.dataset.bssuchen);
    if (t.dataset.bsoffen) { await vgBesprechung(aid); return; }
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
