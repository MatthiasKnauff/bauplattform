'use strict';
/* Honorar – Fachplaner über unser Büro (Fremdleistungen), Karte unter dem Ablauf (Server: honorar_fremdleistung.py, Kern: bpcore/honorar_fremd.py).
   Je Fachplaner: Leistung, Firma (aus den Adressen), über uns / Bauherr direkt, Auftrag netto, Weiterberechnung (durchgereicht / mit Zuschlag).
   Seine Rechnungen an uns: erfassen (mit PDF), prüfen → freigeben → bezahlt; Freigegebenes mit „weiter“ geht in unsere nächste Rechnung
   (beim Stellen festgeschrieben). Nutzt D, AID, laden(), eur2 (honorar-rechnung.js) und die Grundhilfen. */
let HF_OFFEN = new Set();   // aufgeklappte Fachplaner
let HF_KB = null;   // Adressen für die Vorschlagsliste – erst bei Bedarf geladen
const hfKontakte = () => { if (HF_KB) return; HF_KB = []; api('api/bp/kontakte?namen=1').then((r) => { HF_KB = Array.isArray(r) ? r : []; }).catch(() => { HF_KB = []; }); };
if (window.bpVorschlag) {
  bpVorschlag.listen.hffirma = () => { hfKontakte(); return (HF_KB || []).map((x) => ({ w: x.name, t: x.trade || '' })); };
  bpVorschlag.listen.hfleistung = () => ((D && D.fremd && D.fremd.leistungen) || []).map((w) => ({ w }));
}
const HF_ST_FARBE = { eingang: 'var(--warn,#b7791f)', geprueft: 'var(--y)', freigegeben: 'var(--ok,#1e8a4c)', bezahlt: 'var(--ok,#1e8a4c)', abgelehnt: 'var(--mute)' };
const hfDe = (t) => (t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : '–');

function fremdHtml() {
  const F = D.fremd; if (!F) return '';
  if (!F.liste.length && !['beauftragt', 'vertrag', 'abrechnung', 'abgeschlossen'].includes(D.auftrag.status)) return '';
  const S = F.summe;
  const zeile = (f) => {
    const auf = HF_OFFEN.has(f.id), bh = f.beauftragt === 'bauherr';
    const st = bh ? '<span class="hre-st" style="--f:var(--mute)">nur Koordination</span>'
      : f.pruefen ? `<span class="hre-st" style="--f:var(--warn,#b7791f)">${f.pruefen} zu prüfen</span>`
        : f.offen ? '<span class="hre-st" style="--f:var(--red,#c0392b)">noch nicht weiterberechnet</span>'
          : f.rechnungen.length ? '<span class="hre-st" style="--f:var(--ok,#1e8a4c)">abgerechnet</span>' : '<span class="hre-st" style="--f:var(--mute)">keine Rechnung</span>';
    const kopf = `<tr class="hf-z${auf ? ' auf' : ''}" data-hfauf="${f.id}"><td><b>${esc(f.leistung || 'Fachplanung')}</b><br><span class="mute">${esc(f.firma || '– Firma fehlt –')}</span></td>
      <td>${esc(F.beauftragt[f.beauftragt] || '')}</td>${bh ? '<td colspan="5" class="mute">von der Bauherr:in direkt beauftragt – keine Abrechnung über uns</td>'
        : `<td class="r">${f.auftrag_netto != null ? eur2(f.auftrag_netto) : '–'}</td><td class="r${f.ueber ? ' hf-ueber' : ''}" title="${f.ueber ? 'Mehr als der Auftrag' : ''}">${eur2(f.eingang)}</td>
      <td class="r">${eur2(f.weiterberechnet)}</td><td class="r">${f.weiter === 'zuschlag' ? zahl(f.zuschlag_p) + ' %' : esc(F.weiter[f.weiter] || '')}</td><td class="r">${eur2(f.offen)}</td>`}
      <td>${st}</td><td class="hre-a">${auf ? '▴' : '▾'}</td></tr>`;
    return kopf;
  };
  return `<div class="ho-k hre hf"><h3>👷 Fachplaner:in & Fremdleistungen<span class="mute">über uns: Auftrag ${eur2(S.auftrag)} · eingegangen ${eur2(S.eingang)} · weiterberechnet ${eur2(S.weiter)} · offen ${eur2(S.offen)}</span></h3>
    ${F.liste.length ? `<div class="hre-w"><table class="hre-t"><thead><tr><th>Fachplaner:in</th><th>beauftragt</th><th class="r">Auftrag netto</th><th class="r">Rechnungen an uns</th><th class="r">weiterberechnet</th><th class="r">Zuschlag</th><th class="r">offen</th><th>Stand</th><th></th></tr></thead>
      <tbody>${F.liste.map(zeile).join('')}</tbody></table></div>
      ${F.liste.filter((f) => HF_OFFEN.has(f.id)).map((f) => `<div class="hf-dk"><h4><span>${esc(f.leistung || 'Fachplanung')}${f.firma ? ' – ' + esc(f.firma) : ''}</span><button type="button" class="btn sm" data-hfauf="${f.id}" title="Zuklappen">▴</button></h4>${fremdDetail(f)}</div>`).join('')}`
      : '<p class="mute" style="margin:.2rem 0">Noch keine Fachplaner:innen. Tragwerk, TGA, Brandschutz, Vermessung … die über uns beauftragt sind, werden mit ihren Rechnungen hier geführt und in unserer Rechnung weiterberechnet.</p>'}
    <div class="hab-a"><button type="button" class="btn sm pri" data-hfneu>＋ Fachplaner:in</button></div></div>`;
}

function fremdDetail(f) {
  const F = D.fremd, bh = f.beauftragt === 'bauherr';
  const seg = (feld, werte) => `<span class="seg" role="group">${Object.entries(werte).map(([k, t]) => `<button type="button" data-hff="${feld}" data-v="${k}" data-id="${f.id}" class="${f[feld] === k ? 'on' : ''}">${t}</button>`).join('')}</span>`;
  const re = f.rechnungen.map((r) => {
    const fest = !!r.re_id;
    const akt = r.status === 'eingang' ? `<button type="button" class="btn sm" data-hfrs="${r.id}" data-s="geprueft">geprüft</button>`
      : r.status === 'geprueft' ? `<button type="button" class="btn sm pri" data-hfrs="${r.id}" data-s="freigegeben">freigeben</button>`
        : r.status === 'freigegeben' ? `<button type="button" class="btn sm" data-hfrs="${r.id}" data-s="bezahlt">bezahlt</button>` : '';
    return `<tr class="${r.status === 'abgelehnt' ? 'hre-x' : ''}"><td>${esc(r.nr || '–')}${r.hat_datei ? ` <a href="#" data-hfpdf="${r.id}" title="Rechnung ansehen">📄</a>` : ''}</td><td>${hfDe(r.datum)}</td>
      <td class="r">${fest ? eur2(r.netto) : `<input class="hf-n" data-hfr="netto" data-id="${r.id}" value="${betrag(r.netto)}" inputmode="decimal" aria-label="Netto">`}</td>
      <td><span class="hre-st" style="--f:${HF_ST_FARBE[r.status]}">${esc(F.status[r.status] || r.status)}</span></td>
      <td>${fest ? `in unserer Nr. ${esc(r.re_nr || '')}` : `<label class="hf-w"><input type="checkbox" data-hfr="weiter" data-id="${r.id}"${r.weiter ? ' checked' : ''}${bh ? ' disabled' : ''}> weiterberechnen</label>`}</td>
      <td class="hre-a">${akt}${!fest && r.status !== 'abgelehnt' ? `<button type="button" class="btn sm" data-hfrs="${r.id}" data-s="abgelehnt" title="Rechnung nicht anerkannt">ablehnen</button>` : ''}${!fest ? `<button type="button" class="btn sm" data-hfrweg="${r.id}" title="Löschen">🗑</button>` : ''}</td></tr>`;
  }).join('');
  return `<div class="hf-det"><div class="ho-f">
      <label>Leistung<input data-hff="leistung" data-id="${f.id}" data-vs="hfleistung" autocomplete="off" value="${esc(f.leistung)}"></label>
      <label class="w">Firma (aus den Adressen)<input data-hff="firma" data-id="${f.id}" data-vs="hffirma" autocomplete="off" value="${esc(f.firma)}"></label>
      <span class="hf-l">beauftragt${seg('beauftragt', F.beauftragt)}</span>
      ${bh ? '' : `<label>Auftrag netto<input class="z" data-hff="auftrag_netto" data-id="${f.id}" value="${f.auftrag_netto != null ? betrag(f.auftrag_netto) : ''}" inputmode="decimal"></label>
      <span class="hf-l">Weiterberechnen${seg('weiter', F.weiter)}</span>
      ${f.weiter === 'zuschlag' ? `<label>Zuschlag %<input class="p" data-hff="zuschlag_p" data-id="${f.id}" value="${zahl(f.zuschlag_p)}" inputmode="decimal"></label>` : ''}`}
      <label class="w">Vertrag / Vereinbarung<input data-hff="vertrag" data-id="${f.id}" value="${esc(f.vertrag)}" placeholder="z. B. HOAI § 51, Zone III, LPh 1–6 · Angebot vom …"></label></div>
    ${bh ? '' : `<h4 class="hf-h">Rechnungen an uns</h4>${f.rechnungen.length ? `<div class="hre-w"><table class="hre-t"><thead><tr><th>Nr.</th><th>Datum</th><th class="r">netto</th><th>Stand</th><th>in unsere Rechnung</th><th></th></tr></thead><tbody>${re}</tbody></table></div>` : '<p class="mute" style="margin:.2rem 0">Noch keine Rechnung erfasst.</p>'}
    <div class="ho-f hf-neu"><label>Nr.<input data-hfnr="${f.id}"></label><label>Datum<input type="date" data-hfdat="${f.id}"></label><label>netto<input class="z" data-hfnet="${f.id}" inputmode="decimal"></label>
      <label class="btn sm">📎 PDF<input type="file" accept="application/pdf" data-hfdatei="${f.id}" hidden></label><button type="button" class="btn sm pri" data-hfre="${f.id}">＋ Rechnung erfassen</button></div>
    ${f.ueber ? '<p class="hab-h warn">Die Rechnungen übersteigen den Auftrag – Nachtrag oder Kürzung prüfen.</p>' : ''}`}
    <div class="hab-a"><button type="button" class="btn sm" data-hfweg="${f.id}">Fachplaner:in entfernen</button></div></div>`;
}

const hfZahl = (v) => { const s = String(v ?? '').trim(); if (!s) return null; const n = +s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''); return isFinite(n) ? n : NaN; };
async function hfSenden(url, methode, body, text, zurueck) {
  let r; try { r = await api(url, methode, body); } catch (e) { toast(e.message, true); return null; }
  if (text && zurueck) rueckgaengig(text, zurueck);
  await laden(); return r;
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-hfneu],[data-hfauf],[data-hff],[data-hfrs],[data-hfrweg],[data-hfweg],[data-hfre],[data-hfpdf]'); if (!t || !D) return;
  const id = AID;
  if (t.dataset.hfneu !== undefined) {
    const r = await hfSenden(`api/auftraege/${id}/fremd`, 'POST', {}, null);
    if (r && r.neu) { HF_OFFEN.add(r.neu); await laden(); rueckgaengig('Fachplaner:in angelegt', async () => { await api('api/fremd/' + r.neu, 'DELETE'); AID = id; await laden(); }); }
    return;
  }
  if (t.dataset.hfauf && (t.tagName === 'BUTTON' || !e.target.closest('a,button,input'))) { const k = +t.dataset.hfauf; if (HF_OFFEN.has(k)) HF_OFFEN.delete(k); else HF_OFFEN.add(k); zeichne(); return; }
  if (t.dataset.hff && t.tagName === 'BUTTON') {   // Segment: beauftragt / weiter
    const f = D.fremd.liste.find((x) => x.id === +t.dataset.id), feld = t.dataset.hff, alt = f[feld]; if (alt === t.dataset.v) return;
    await hfSenden('api/fremd/' + f.id, 'PUT', { [feld]: t.dataset.v }, `${f.leistung || 'Fachplaner:in'}: ${t.textContent}`, async () => { await api('api/fremd/' + f.id, 'PUT', { [feld]: alt }); AID = id; await laden(); });
    return;
  }
  if (t.dataset.hfrs) {
    const rid = +t.dataset.hfrs, r = D.fremd.liste.flatMap((x) => x.rechnungen).find((x) => x.id === rid), alt = r.status;
    await hfSenden('api/fremd-re/' + rid, 'PUT', { status: t.dataset.s }, `Rechnung ${r.nr || ''}: ${D.fremd.status[t.dataset.s]}`, async () => { await api('api/fremd-re/' + rid, 'PUT', { status: alt }); AID = id; await laden(); });
    return;
  }
  if (t.dataset.hfrweg || t.dataset.hfweg) {
    const url = t.dataset.hfrweg ? 'api/fremd-re/' + t.dataset.hfrweg : 'api/fremd/' + t.dataset.hfweg;
    const r = await hfSenden(url, 'DELETE');
    if (r && r.papierkorb) rueckgaengig(t.dataset.hfrweg ? 'Rechnung gelöscht' : 'Fachplaner:in entfernt', async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); AID = id; await laden(); });
    return;
  }
  if (t.dataset.hfpdf) { e.preventDefault(); BPHead.ansehen([{ url: `api/fremd-re/${t.dataset.hfpdf}/datei`, typ: 'pdf', name: 'Rechnung Fachplaner:in' }]); return; }
  if (t.dataset.hfre) {
    const fid = t.dataset.hfre, box = t.closest('.hf-neu'), q = (s) => box.querySelector(s);
    const netto = hfZahl(q(`[data-hfnet="${fid}"]`).value), datei = q(`[data-hfdatei="${fid}"]`).files[0];
    if (netto == null || isNaN(netto)) { toast('Bitte den Nettobetrag der Rechnung eintragen.', true); q(`[data-hfnet="${fid}"]`).focus(); return; }
    const fd = new FormData(); fd.append('nr', q(`[data-hfnr="${fid}"]`).value); fd.append('datum', q(`[data-hfdat="${fid}"]`).value); fd.append('netto', String(netto)); if (datei) fd.append('datei', datei);
    try {
      const r = await fetch(`api/fremd/${fid}/rechnungen`, { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Speichern fehlgeschlagen');
      await laden(); rueckgaengig('Rechnung erfasst', async () => { await api('api/fremd-re/' + d.neu, 'DELETE'); AID = id; await laden(); });
    } catch (er) { toast(er.message, true); }
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target; if (!t.dataset || !D || !D.fremd) return;
  const id = AID;
  if (t.dataset.hff && t.tagName === 'INPUT') {
    const f = D.fremd.liste.find((x) => x.id === +t.dataset.id), feld = t.dataset.hff, alt = f[feld];
    let v = t.value; if (['auftrag_netto', 'zuschlag_p'].includes(feld)) { v = hfZahl(v); if (Number.isNaN(v)) { toast('Zahl nicht lesbar.', true); return; } }
    const body = { [feld]: v };
    if (feld === 'firma') { const k = (HF_KB || []).find((x) => x.name === t.value.trim()); body.contact_id = k ? k.id : null; }
    await hfSenden('api/fremd/' + f.id, 'PUT', body, `${f.leistung || 'Fachplaner:in'}: geändert`, async () => { await api('api/fremd/' + f.id, 'PUT', { [feld]: alt }); AID = id; await laden(); });
    return;
  }
  if (t.dataset.hfr) {
    const rid = +t.dataset.id, r = D.fremd.liste.flatMap((x) => x.rechnungen).find((x) => x.id === rid), feld = t.dataset.hfr;
    const v = feld === 'weiter' ? t.checked : hfZahl(t.value); if (Number.isNaN(v)) { toast('Betrag nicht lesbar.', true); return; }
    const alt = r[feld];
    await hfSenden('api/fremd-re/' + rid, 'PUT', { [feld]: v }, 'Rechnung geändert', async () => { await api('api/fremd-re/' + rid, 'PUT', { [feld]: alt }); AID = id; await laden(); });
  }
});
document.addEventListener('focusin', (e) => { if (e.target.dataset && e.target.dataset.vs === 'hffirma') hfKontakte(); });
