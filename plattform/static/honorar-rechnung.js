'use strict';
/* Honorar – Abschlags- und Schlussrechnungen je Auftrag (Server: honorar_rechnung.py, Rechnung: bpcore/honorar.abrechnung).
   Karte „Rechnungen“ unter dem Ablauf (ganze Breite): Liste mit Nr., Datum, netto, brutto, Status; der Entwurf aufgeklappt mit
   Nr., Datum, Empfänger, Text (bei Pauschal: erbrachter Anteil) und der laufenden Rechnung. Rechnung = erbrachte Leistung kumuliert
   − bisherige Rechnungen. PDF: Blatt 1 Rechnung auf dem Briefbogen, Blatt 2 Erläuterung. Nutzt D, AID, laden() aus honorar.js. */
const eur2 = (v) => (v == null ? '–' : (+v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
const RE_FARBE = { entwurf: 'var(--warn,#b7791f)', gestellt: 'var(--y)', bezahlt: 'var(--ok,#1e8a4c)', storniert: 'var(--mute)' };

function reKurz() {   /* für die Karte „Abrechnung“ */
  const R = D.rechnungen; if (!R) return '';
  return `<label>abgerechnet<input value="${eur0(R.abgerechnet)}" disabled></label><label>offen (brutto)<input value="${eur0(R.offen)}" disabled></label>`;
}

function reKnoepfe() {
  const R = D.rechnungen; if (!R) return '';
  const zu = R.entwurf ? ' disabled title="Erst den Entwurf stellen oder löschen"' : R.schluss ? ' disabled title="Die Schlussrechnung ist gestellt"' : '';
  return `<button type="button" class="btn sm pri" data-reneu="abschlag"${zu}>＋ Abschlag</button><button type="button" class="btn sm" data-reneu="schluss"${zu}>Schlussrechnung</button>`;
}

function reHtml() {
  const R = D.rechnungen; if (!R || (!R.liste.length && !['vertrag', 'abrechnung', 'beauftragt', 'abgeschlossen'].includes(D.auftrag.status))) return '';
  const pausch = D.auftrag.art === 'pauschal';
  const zeilen = R.liste.map((r) => {
    const st = `<span class="hre-st" style="--f:${RE_FARBE[r.status]}">${esc(R.status[r.status] || r.status)}${r.status === 'bezahlt' && r.bezahlt_am ? ' ' + deD(r.bezahlt_am) : ''}</span>`;
    const akt = r.status === 'entwurf'
      ? `<button type="button" class="btn sm pri" data-reset="${r.id}" data-s="gestellt" title="Rechnung stellen: die Berechnung wird eingefroren">Stellen</button><button type="button" class="btn sm" data-reweg="${r.id}">Löschen</button>`
      : r.status === 'gestellt'
        ? `<button type="button" class="btn sm pri" data-rebez="${r.id}">bezahlt …</button><button type="button" class="btn sm" data-reset="${r.id}" data-s="entwurf" title="Nur bei der letzten Rechnung">zum Entwurf</button><button type="button" class="btn sm" data-reset="${r.id}" data-s="storniert">stornieren</button>`
        : r.status === 'bezahlt' ? `<button type="button" class="btn sm" data-reset="${r.id}" data-s="gestellt" title="Zahlung zurücknehmen">nicht bezahlt</button>` : '';
    const haupt = `<tr class="${r.status === 'storniert' ? 'hre-x' : ''}"><td><b>${esc(r.titel)}</b><br><span class="mute">Nr. ${esc(r.nr || '–')}</span></td><td>${deD(r.datum)}</td>
      <td class="r">${eur2(r.kum)}</td><td class="r">${r.bisher ? '− ' + eur2(r.bisher) : ''}</td><td class="r"><b>${eur2(r.betrag)}</b></td><td class="r">${eur2(r.brutto)}</td>
      <td>${st}</td><td class="hre-a"><button type="button" class="btn sm" data-repdf="${r.id}" title="Rechnung und Erläuterung als PDF">PDF</button>${akt}</td></tr>`;
    return haupt;
  }).join('');
  const ent = R.liste.filter((r) => r.status === 'entwurf').map((r) => `<div class="hre-ent"><b>Entwurf: ${esc(r.titel)}</b><div class="ho-f">
      <label>Rechnungs-Nr.<input data-ref="nr" data-id="${r.id}" value="${esc(r.nr)}"></label>
      <label>Datum<input type="date" data-ref="datum" data-id="${r.id}" value="${esc(r.datum)}"></label>
      ${pausch ? `<label>erbracht (% des Pauschalhonorars)<input type="number" min="0" max="100" step="0.5" data-ref="anteil" data-id="${r.id}" value="${r.anteil ?? 0}"></label>` : `<label>Leistungsstand<input value="${D.auftrag.art === 'hoai' ? (r.auftrags_anteil ?? 0).toLocaleString('de-DE') + ' % der beauftragten LPh' : 'Zeiten bis heute'}" disabled title="Kommt aus „erbracht %“ je Leistungsphase bzw. der Zeiterfassung"></label>`}
      <label class="w">Empfänger:in<textarea rows="3" data-ref="empfaenger" data-id="${r.id}" placeholder="Name&#10;Straße&#10;PLZ Ort">${esc(r.empfaenger)}</textarea></label>
      <label class="w">Text unter dem Betrag<textarea rows="2" data-ref="text" data-id="${r.id}">${esc(r.text)}</textarea></label>
      ${r.betrag < 0 ? '<span class="hab-h warn">Die bisherigen Rechnungen übersteigen die erbrachte Leistung – der Betrag ist negativ (Gutschrift).</span>' : ''}
      <span class="hab-h">Der Entwurf rechnet mit dem aktuellen Leistungsstand${D.auftrag.art === 'hoai' ? ' („erbracht %“ je Leistungsphase oben)' : ''}; beim Stellen wird er eingefroren.</span></div></div>`).join('');
  const stnr = R.steuernr_fehlt ? '<p class="hab-h warn" style="margin:.2rem 0 .5rem">⚠ In den Firmendaten (Verwaltung → Firma, Zusatzzeile) fehlt die Steuernummer oder USt-IdNr. – sie ist Pflichtangabe auf jeder Rechnung (§ 14 Abs. 4 Nr. 2 UStG).</p>' : '';
  return `<div class="ho-k hre"><h3>🧾 Rechnungen<span class="mute">abgerechnet ${eur2(R.abgerechnet)} netto · bezahlt ${eur2(R.bezahlt)} · offen ${eur2(R.offen)} brutto</span></h3>${stnr}
    ${R.liste.length ? `<div class="hre-w"><table class="hre-t"><thead><tr><th>Rechnung</th><th>Datum</th><th class="r">Leistung kum.</th><th class="r">bisher</th><th class="r">netto</th><th class="r">brutto</th><th>Status</th><th></th></tr></thead><tbody>${zeilen}</tbody></table></div>${ent}`
      : '<p class="mute" style="margin:.2rem 0">Noch keine Rechnung. Leistungsstand oben eintragen („erbracht %“ je Leistungsphase), dann „＋ Abschlag“.</p>'}
    <div class="hab-a">${reKnoepfe()}</div></div>`;
}

async function reSenden(url, methode, body, text, zurueck) {
  let r; try { r = await api(url, methode, body); } catch (e) { toast(e.message, true); return null; }
  if (text) rueckgaengig(text, zurueck);
  await laden(); return r;
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-reneu],[data-reset],[data-reweg],[data-rebez],[data-repdf]'); if (!t || !D) return;
  if (t.dataset.reneu) {
    const id = AID, r = await reSenden(`api/auftraege/${id}/rechnungen`, 'POST', { art: t.dataset.reneu });
    if (r && r.neu) rueckgaengig(t.dataset.reneu === 'schluss' ? 'Schlussrechnung angelegt' : 'Abschlag angelegt', async () => { await api('api/rechnungen/' + r.neu, 'DELETE'); AID = id; await laden(); });
    return;
  }
  if (t.dataset.repdf) {
    const r = D.rechnungen.liste.find((x) => x.id === +t.dataset.repdf), url = `api/rechnungen/${t.dataset.repdf}/rechnung.pdf`;
    if (window.BPHead && BPHead.ansehen) BPHead.ansehen([{ url, typ: 'pdf', name: `${r.titel} ${r.nr}`, mail: hoMail('honorarrechnung') }]);
    else window.open(url, '_blank', 'noopener');
    return;
  }
  if (t.dataset.reweg) {
    const id = AID, r = await reSenden('api/rechnungen/' + t.dataset.reweg, 'DELETE');
    if (r && r.papierkorb) rueckgaengig('Rechnungsentwurf gelöscht', async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); AID = id; await laden(); });
    return;
  }
  if (t.dataset.reset) {
    const rid = +t.dataset.reset, s = t.dataset.s, alt = D.rechnungen.liste.find((x) => x.id === rid);
    if (s === 'storniert' && !(await bpFrage(`${alt.titel} Nr. ${alt.nr} stornieren? Sie zählt dann nicht mehr als gestellt.`, { ok: 'Stornieren' }))) return;
    const id = AID;
    const erg = await reSenden('api/rechnungen/' + rid, 'PUT', { status: s }, `Rechnung ${alt.nr}: ${D.rechnungen.status[s]}`,
      async () => { await api('api/rechnungen/' + rid, 'PUT', { status: alt.status, bezahlt_am: alt.bezahlt_am, bezahlt: alt.bezahlt }); AID = id; await laden(); });
    if (erg && s === 'gestellt') toast(erg.ablage ? `Gestellt und im Projektordner abgelegt: ${erg.ablage}` : `Gestellt${erg.ablage_fehler ? ' – nicht im Projektordner: ' + erg.ablage_fehler : ''}.`, !!erg.ablage_fehler);
    return;
  }
  if (t.dataset.rebez) {
    const rid = +t.dataset.rebez, r = D.rechnungen.liste.find((x) => x.id === rid);
    const am = await bpEingabe(`Zahlungseingang für Nr. ${r.nr} (${eur2(r.brutto)}) – Datum (TT.MM.JJJJ)`, new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), { ok: 'Weiter' });
    if (am == null) return;
    const m = am.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if (!m) { toast('Bitte das Datum als TT.MM.JJJJ eingeben.', true); return; }
    const betrag = await bpEingabe('Gezahlter Betrag (brutto)', String(r.brutto).replace('.', ','), { ok: 'Als bezahlt merken' }); if (betrag == null) return;
    const b = +betrag.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''); if (!isFinite(b)) { toast('Betrag nicht lesbar.', true); return; }
    const id = AID;
    await reSenden('api/rechnungen/' + rid, 'PUT', { status: 'bezahlt', bezahlt_am: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, bezahlt: b },
      `Rechnung ${r.nr} bezahlt`, async () => { await api('api/rechnungen/' + rid, 'PUT', { status: 'gestellt' }); AID = id; await laden(); });
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target; if (!t.dataset || !t.dataset.ref || !D) return;
  const rid = +t.dataset.id, f = t.dataset.ref, alt = (D.rechnungen.liste.find((x) => x.id === rid) || {})[f], id = AID;
  await reSenden('api/rechnungen/' + rid, 'PUT', { [f]: t.value }, 'Rechnung geändert', async () => { await api('api/rechnungen/' + rid, 'PUT', { [f]: alt }); AID = id; await laden(); });
});
