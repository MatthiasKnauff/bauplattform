'use strict';
/* Abzüge als Rechenleiter (besprochen am 14.11.2026, Mock „Abzüge netto/brutto“, Variante B): erst die Abzüge netto, dann die
   Umsatzsteuer, dann die Abzüge brutto – so rechnet die VOB/B. Dieselbe Leiter an drei Stellen:
   · Rechnungskarte und Schritt 4 im Assistenten (reLeiter): Beträge der Rechnung, je Zeile an/aus (rechnung.abzug)
   · Reiter „Abzüge“ rechts und LV- & Auftragsdaten (ltEditor): Vorgabe des Auftrags – Werte, an/aus, Reihenfolge (⋮⋮ ziehen), eigene Zeilen
   Server: plattform/ava_abzuege.py (L.leiter = Zeilen des Auftrags, c.netto_zeilen/brutto_zeilen/an je Rechnung). */
const LT_UST = 0.19;
const ltKey = (k) => ({ ve: 'einbehalt' }[k] || k);   // Schlüssel in rechnung.abzug / vergabe.abzug

/* ---------- Rechnung ---------- */
function ltSchalter(r, c, k, g) {
  const an = (c.an || {})[k] !== false, auftrag = (c.an_auftrag || {})[k] !== false, abw = an !== auftrag;
  return `<button type="button" class="lt-sw${an ? ' on' : ''}${abw ? ' abw' : ''}" data-relt="${esc(k)}" data-id="${r.id}" aria-pressed="${an}"${g ? ' disabled' : ''}
    title="${an ? 'wird abgezogen' : 'wird nicht abgezogen'}${abw ? ' – abweichend vom Auftrag' : ' – wie im Auftrag'}${g ? '' : ' · klicken: umschalten'}"></button>`;
}
function reLeiter(r, c, g) {
  const LT = L.leiter || { netto: [], brutto: [] }, art = r.art || 'abschlag', dis = g ? ' disabled' : '', ab = r.data.abzuege || [];
  const L1 = c.leistung - c.nachlass, L2 = c.anerkannt + c.einbehalt, u = (x) => x * (1 + LT_UST), z = (k, x) => (x.find((y) => y.k === k) || null);
  const zeile = (k, text, betrag, extra = '') => `<tr class="lt-z${(c.an || {})[k] === false ? ' aus' : ''}"><td class="lt-s">${ltSchalter(r, c, k, g)}</td><td>${text}${extra}</td><td class="r">${(c.an || {})[k] === false ? '–' : eur(betrag)}</td></tr>`;
  const netto = LT.netto.map((x) => {
    if (x.k === 'nachlass') return (L.vergabe.nachlass || L.vergabe.nachlass_eur) ? zeile('nachlass', `– Nachlass ${nlText(L.vergabe)}`, -c.nachlass) : '';
    const y = z(x.k, c.netto_zeilen || []); if (!y && (c.an || {})[x.k] !== false) return '';
    return zeile(x.k, `– ${esc(x.name)}${x.typ === 'pct' ? ` ${nf(x.wert, 2)} %` : ''}`, y ? y.betrag : 0);
  }).join('');
  const eigen = ab.map((zz, k) => `<tr><td class="lt-s"></td><td><div class="abz"><span>–</span><input data-re="abz-text" data-id="${r.id}" data-k="${k}" value="${esc(zz.text || '')}" placeholder="nur diese Rechnung, z. B. Schadensersatz" style="flex:1"${dis}>
      ${pzEur({ pct: zz.pct, eur: zz.betrag, typ: zz.betrag != null && zz.pct == null ? 'eur' : 'pct', attr: `data-re="abz-pct" data-id="${r.id}" data-k="${k}"`, pz: 'abz', dis: !!dis })}${g ? '' : `<button class="ib" data-reb="abzdel" data-id="${r.id}" data-k="${k}">✕</button>`}</div></td>
      <td class="r">${eur(-(zz.pct != null ? L1 * zz.pct / 100 : (zz.betrag || 0)))}</td></tr>`).join('');
  const SK = L.calc.sicherheit || {}, soll = art === 'schluss' ? SK.pct_schluss : SK.pct_abschlag, ebAbw = r.data.einbehalt != null && soll != null && Math.abs((r.data.einbehalt || 0) - soll) > 0.004;
  const brutto = LT.brutto.map((x) => {
    if (x.k === 've' || x.k === 'ma') {
      if (istOA(L.id) || (x.k === 'ma') !== (art === 'schluss')) return '';
      return zeile(x.k, `– ${art === 'schluss' ? 'Sicherheit Mängelansprüche' : 'Sicherheit Vertragserfüllung'} ${nf(c.einbehalt_pct, 2)} %`, -u(c.einbehalt),
        ebAbw ? ` <span class="hint" style="color:#e07b3a">bei dieser Rechnung fest – Auftrag: ${nf(soll, 2)} %</span>${g ? '' : ` <button type="button" class="ib" data-reb="ebAuftrag" data-id="${r.id}">wie Auftrag</button>`}` : '');
    }
    if (x.k === 'vorher') return c.einzeln ? '' : zeile('vorher', `– bisherige Zahlungen${art === 'nachtrag' ? ' (Nachtragsrechnungen)' : ''}${art === 'nachtrag' ? '' : ` <button type="button" class="ib" data-act="zahlungen" title="Liste der Zahlungen – auch vorangegangene ohne Rechnung hier eintragen">Zahlungen …</button>`}${c.vorher_frei ? ` <span class="hint">davon ohne Rechnung hier: ${eur(u(c.vorher_frei))}</span>` : ''}`, -u(c.vorher),
      c.vorher_offen ? ` <span class="hint" style="color:var(--red)">– ${eur(u(c.vorher_offen))} der vorigen Rechnung nicht gezahlt, hier nachgeholt</span>` : (c.an || {}).vorher === false ? ' <span class="hint" style="color:var(--red)">Achtung: Doppelzahlung bei kumulierten Rechnungen</span>' : '');
    if (x.k === 'strafe') {
      if (art !== 'schluss') return '';
      const sv = c.strafe_vorschlag, y = z('strafe', c.brutto_zeilen || []);
      return `<tr class="lt-z${(c.an || {}).strafe === false ? ' aus' : ''}"><td class="lt-s">${ltSchalter(r, c, 'strafe', g)}</td><td>– Vertragsstrafe <span class="hint">ohne Umsatzsteuer</span>${sv ? `<div class="hint">Vorschlag ${eur(sv.betrag)}: ${esc(sv.grund)}${!g && Math.abs((r.data.strafe || 0) - sv.betrag) > 0.005 && sv.betrag ? ` <button type="button" class="ib" data-restv="${r.id}" data-v="${sv.betrag}">übernehmen</button>` : ''}</div>` : ''}</td>
        <td class="r">${(c.an || {}).strafe === false ? '–' : `<input data-re="strafe" data-id="${r.id}" value="${r.data.strafe != null ? nf(r.data.strafe, 2) : ''}" placeholder="0,00" inputmode="decimal" style="width:7rem;text-align:right"${dis}>`}${y ? '' : ''}</td></tr>`;
    }
    if (x.k === 'bauabzug') { const y = z('bauabzug', c.brutto_zeilen || []); if (!y && (c.an || {}).bauabzug !== true) return '';
      return zeile('bauabzug', `– Bauabzugsteuer 15 % <span class="hint">ans Finanzamt (§ 48 EStG)${!y && x.frei_bis ? ' – Freistellung gilt bis ' + de(x.frei_bis) : ''}</span>`, y ? y.betrag : 0); }
    const y = z(x.k, c.brutto_zeilen || []); if (!y && (c.an || {})[x.k] !== false) return '';
    return zeile(x.k, `– ${esc(x.name)}${x.typ === 'pct' ? ` ${nf(x.wert, 2)} % vom Zahlbetrag` : ' (Schlussrechnung)'}`, y ? y.betrag : 0);
  }).join('');
  const hand = c.hand ? `<tr class="re-hand"><td class="lt-s"></td><td>Zahlbetrag netto <span class="re-hand-t">von Hand festgesetzt</span>${g ? '' : ` <button type="button" class="ib" data-rehand0="${r.id}" title="Wieder den rechnerischen Betrag freigeben">✕ wieder rechnerisch</button>`}
      <label class="re-hand-g">Grund: <input data-rehand="grund" data-id="${r.id}" value="${esc(c.hand.grund)}" placeholder="Pflicht: warum weicht der Betrag ab?"${dis}></label></td>
      <td class="r"><input data-rehand="betrag" data-id="${r.id}" value="${nf(c.zahlung, 2)}" inputmode="decimal" style="width:8.5rem;text-align:right"${dis}><div class="re-hand-a">Differenz brutto ${eur(u(c.hand.abweichung))}</div></td></tr>` : '';
  const anders = Object.keys(c.an || {}).some((k) => (c.an || {})[k] !== (c.an_auftrag || {})[k]);
  return `<table class="lt-r"><tbody>
    ${c.frei && (r.data.zeilen || []).length ? `<tr><td></td><td>Summe der Positionen netto (ohne Aufmaß)</td><td class="r">${eur(c.leistung)}</td></tr>`
      : c.frei ? `<tr><td></td><td>geprüfter Betrag netto (ohne Aufmaß)${g ? '' : ` <button class="ib" data-reb="fzneu" data-id="${r.id}" title="Statt eines Betrags die Positionen der Rechnung einzeln eintragen">+ Positionen von Hand</button>`}</td><td class="r"><input data-re="frei" data-id="${r.id}" value="${nf(r.data.frei || 0, 2)}" inputmode="decimal" style="width:9rem;text-align:right"${dis}></td></tr>`
      : `<tr><td></td><td>${art === 'regie' ? 'Summe Stundenlohnarbeiten' : art === 'nachtrag' ? 'Leistungsstand Nachträge (Aufmaß × Nachtrags-EP)' : 'Leistungsstand netto (Aufmaß × Auftrags-EP)'}</td><td class="r">${eur(c.leistung)}</td></tr>`}
    <tr class="lt-k"><td colspan="3">Abzüge netto${g ? '' : ' <button type="button" class="ib lt-lvd" data-ltlvdaten title="LV- & Auftragsdaten → Reiter „Abzüge“: Nachlass, Umlagen, Sicherheiten, Vertragsstrafe für den ganzen Auftrag">⚙ LV- &amp; Vertragsbedingungen</button>'}</td></tr>${netto}${eigen}
    ${g ? '' : `<tr><td></td><td colspan="2"><button class="ib" data-reb="abzneu" data-id="${r.id}">+ Abzug nur bei dieser Rechnung</button></td></tr>`}
    <tr class="s"><td></td><td>= Abrechnungssumme netto</td><td class="r">${eur(L2)}</td></tr>
    <tr><td></td><td>+ Umsatzsteuer 19 %</td><td class="r">${eur(L2 * LT_UST)}</td></tr>
    <tr class="s"><td></td><td>= Abrechnungssumme brutto</td><td class="r">${eur(u(L2))}</td></tr>
    <tr class="lt-k"><td colspan="3">Abzüge brutto${g ? '' : ' <button type="button" class="ib lt-lvd" data-ltlvdaten title="LV- & Auftragsdaten → Reiter „Abzüge“: Nachlass, Umlagen, Sicherheiten, Vertragsstrafe für den ganzen Auftrag">⚙ LV- &amp; Vertragsbedingungen</button>'}</td></tr>${brutto}${hand}
    <tr class="s lt-zb"><td></td><td>= Zahlbetrag${c.bauabzug ? ' an die Firma' : ''}</td><td class="r">${eur(c.auszahlung != null ? c.auszahlung : c.brutto)}</td></tr>
    ${g || c.hand ? '' : `<tr class="re-abw"><td></td><td colspan="2"><button type="button" class="ib" data-rehand1="${r.id}" title="Einen anderen Betrag freigeben als die Prüfung ergibt – mit Grund, deutlich vermerkt">＋ abweichender Zahlbetrag mit Begründung …</button></td></tr>`}
    ${c.skonto || (c.an || {}).skonto === false ? `<tr class="lt-z${(c.an || {}).skonto === false ? ' aus' : ''}"><td class="lt-s">${ltSchalter(r, c, 'skonto', g)}</td><td>– Skonto ${nf(c.skonto_pct, 2)} %${c.skonto_bis ? ` bei Zahlung bis <b>${de(c.skonto_bis)}</b>` : ''}</td><td class="r">${c.skonto ? eur(-c.skonto) : '–'}</td></tr>
      ${c.skonto ? `<tr class="s"><td></td><td>= Zahlbetrag mit Skonto</td><td class="r">${eur(c.brutto_skonto)}</td></tr>` : ''}` : ''}
    ${r.gefordert ? `<tr><td></td><td>gefordert ${eur(r.gefordert)} · Differenz zum geprüften Leistungsstand</td><td class="r" style="color:${c.differenz > 0.5 ? 'var(--red)' : 'inherit'}">${eur(c.differenz)}</td></tr>` : ''}
  </tbody></table>${anders ? '<p class="hint abz-folge"><b>Abweichend vom Auftrag</b> (orange Schalter): diese Rechnung steht in der Kostenübersicht als eigene Vereinbarung – den Grund bitte unten in der Bemerkung festhalten.</p>' : ''}`;
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-relt],[data-restv],[data-ltlvdaten]'); if (!t || !L) return;
  if (t.dataset.ltlvdaten !== undefined) { lvDaten('Abzüge'); return; }   // Kopf „Abzüge netto/brutto“: LV- & Auftragsdaten, gleich der Reiter Abzüge
  const rid = +t.dataset.id || +t.dataset.restv, r = L.rechnungen.find((x) => x.id === rid), c = (L.calc.rechnungen || []).find((x) => x.id === rid); if (!r || !c) return;
  if (t.dataset.restv) { const alt = r.data.strafe ?? null; try { await call('api/rechnungen/' + rid, 'PUT', { strafe: +t.dataset.v }); rueckgaengig('Vertragsstrafe übernommen', () => call('api/rechnungen/' + rid, 'PUT', { strafe: alt })); } catch (er) { toast(er.message, true); } return; }
  const k = t.dataset.relt, an = (c.an || {})[k] !== false, auftrag = (c.an_auftrag || {})[k] !== false, key = ltKey(k), alt = { [key]: (r.data.abzug || {})[key] ?? null };
  try { await call('api/rechnungen/' + rid, 'PUT', { abzug: { [key]: !an === auftrag ? null : !an } });   // wieder wie im Auftrag → Eintrag weg
    rueckgaengig(an ? 'nicht abziehen' : 'abziehen', () => call('api/rechnungen/' + rid, 'PUT', { abzug: alt })); } catch (er) { toast(er.message, true); }
});

/* ---------- Auftrag: Reiter „Abzüge“ und LV- & Auftragsdaten ----------
   opt.sammeln: Änderungen nur merken (Maske mit OK/Abbrechen) – ltEditor gibt dann { daten() } zurück; sonst sofort speichern (mit Rückgängig) */
function ltEditor(host, opt = {}) {
  let LT = JSON.parse(JSON.stringify(L.leiter || { netto: [], brutto: [], skonto: {} })), offen = {}, ziehen = null;
  const lvId = L.id, SKA = { kt: 'Kalendertage', wt: 'Werktage', at: 'Arbeitstage', wo: 'Wochen' }, SKW = { kt: ['7', 'Mo–So'], wt: ['6', 'Mo–Sa'], at: ['5', 'Mo–Fr'] }, STA = { kt: 'Kalendertag', wt: 'Werktag', at: 'Arbeitstag' };   // Tage je Woche klein darunter
  const eig = () => [...LT.netto, ...LT.brutto].filter((x) => x.eigen).map((x) => ({ id: x.k.slice(2), name: x.name, seite: x.seite, typ: x.typ, wert: x.wert, an: x.an }));
  const reihe = () => [...LT.netto, ...LT.brutto].map((x) => x.k);
  const LT_UML = ['Bauwasser', 'Baustrom', 'Bauwesenversicherung', 'Baureinigung', 'Baubeschilderung'];   // häufige Umlagen als eigene Knöpfe (15.11.2026, Baureinigung/Baubeschilderung 17.11.2026 wie im LV-Vordruck) – alles weitere mit „＋ weiterer Abzug“
  const nz = (v, n = 2) => (v || v === 0 ? nf(v, n) : '');
  const inp = (k, f, v, o = {}) => `<input data-ltw="${k}" data-f="${f}" value="${esc(v ?? '')}" ${o.typ === 'date' ? 'type="date"' : 'inputmode="decimal"'} style="width:${o.w || 4.2}rem;text-align:${o.typ === 'date' ? 'left' : 'right'}" placeholder="${o.ph || ''}">`;
  const sw = (x) => `<button type="button" class="lt-sw${x.an ? ' on' : ''}" data-ltan="${esc(x.k)}" aria-pressed="${x.an}" title="${x.an ? 'wird abgezogen – klicken: aus' : 'aus – klicken: abziehen'}"></button>`;
  const wert = (x) => {
    if (x.eigen) return bpPzEur({ pct: x.typ === 'eur' ? 0 : x.wert, eur: x.typ === 'eur' ? x.wert : 0, typ: x.typ, attr: `data-ltw="${esc(x.k)}" data-f="wert"`, art: 'lt' });   // Baukasten: % / € mit Umschalter
    if (x.k === 'nachlass') return bpPzEur({ pct: x.pct, eur: x.eur, typ: x.nltyp, attr: 'data-ltw="nachlass" data-f="pct"', art: 'lt' });   // beide gesetzt (ältere LVs): der Betrag steht dahinter

    if (x.k === 've') return `${inp('ve', 'pct', nz(x.pct))} % <span class="seg sm"><button type="button" class="${x.form !== 'buergschaft' ? 'on' : ''}" data-ltform="ve" data-v="einbehalt">Einbehalt</button><button type="button" class="${x.form === 'buergschaft' ? 'on' : ''}" data-ltform="ve" data-v="buergschaft">Bürgschaft</button></span>`;
    if (x.k === 'ma') return `${inp('ma', 'pct', nz(x.pct), { ph: 'wie oben' })} % · ${inp('ma', 'jahre', x.jahre ?? 4, { w: 2.6 })} Jahre <span class="seg sm"><button type="button" class="${x.form !== 'buergschaft' ? 'on' : ''}" data-ltform="ma" data-v="einbehalt">Einbehalt</button><button type="button" class="${x.form === 'buergschaft' ? 'on' : ''}" data-ltform="ma" data-v="buergschaft">Bürgschaft</button></span>`;
    if (x.k === 'vorher') return '<span class="hint">automatisch</span>';
    if (x.k === 'strafe') return `${inp('strafe', 'pct', nz(x.pct, 3))} % je <select class="lt-tag" data-ltw="strafe" data-f="art" aria-label="Vertragsstrafe je">${Object.entries(STA).map(([k, t]) => `<option value="${k}" title="${t} · ${SKW[k][0]} Tage je Woche (${SKW[k][1]})"${(x.art || 'wt') === k ? ' selected' : ''}>${t}</option>`).join('')}</select> · höchstens ${inp('strafe', 'max', nz(x.max))} %`;
    if (x.k === 'bauabzug') return `15 % · Freistellung gültig bis ${inp('bauabzug', 'frei_bis', x.frei_bis || '', { typ: 'date', w: 9 })}${x.frei_bis && x.frei_bis < new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) ? ` <span class="hint" style="color:var(--red)">${x.frei_bis < new Date().toISOString().slice(0, 10) ? 'abgelaufen' : 'läuft bald ab'}</span>` : ''}`;
    return '';
  };
  const bezug = (x) => ({ nachlass: 'vom Leistungsstand', ve: 'Abschläge, brutto', ma: 'Schlussrechnung, brutto', vorher: 'gezahlte Abschläge', strafe: 'nach Schlussrechnung, ohne USt', bauabzug: 'vom Zahlbetrag, ans Finanzamt' }[x.k]
    || (x.seite === 'netto' ? (x.typ === 'pct' ? 'vom Stand nach Nachlass' : 'einmal (Hauptauftrag)') : (x.typ === 'pct' ? 'vom Zahlbetrag' : 'Schlussrechnung')));
  const tr = (x) => `<tr class="${x.an ? '' : 'aus'}" data-ltz="${esc(x.k)}" data-seite="${x.seite}"><td class="lt-h" draggable="true" title="${x.eigen ? 'Ziehen: Reihenfolge ändern, auch über die Umsatzsteuer hinweg (netto ↔ brutto)' : 'Ziehen: Reihenfolge ändern – die Seite (netto/brutto) ist für diese Zeile fest'}" aria-label="verschieben">⋮⋮</td><td class="lt-s">${sw(x)}</td>
    <td>${x.eigen ? `<input data-ltw="${esc(x.k)}" data-f="name" value="${esc(x.name)}" style="width:100%;min-width:8rem">` : esc(x.name)}<div class="hint">${esc(bezug(x))}</div></td><td class="lt-w">${wert(x)}</td>
    <td>${x.eigen ? `<button type="button" class="ib" data-ltseite="${esc(x.k)}" title="auf die andere Seite der Umsatzsteuer">${x.seite === 'netto' ? '↓ brutto' : '↑ netto'}</button><button type="button" class="ib" data-ltweg="${esc(x.k)}" title="Zeile löschen">✕</button>` : ''}</td></tr>`;
  const draw = () => {
    const S = LT.skonto || {};
    host.innerHTML = `<div class="lt"><table class="lt-t"><tbody>
      <tr><td colspan="5" class="hint">Leistungsstand netto (Aufmaß × Auftrags-EP)</td></tr>
      <tr class="lt-k" data-ltanf="netto"><td colspan="5">Abzüge netto <span class="hint">vor der Umsatzsteuer</span></td></tr>
      ${LT.netto.map(tr).join('')}<tr data-ltend="netto"><td></td><td colspan="4">${LT_UML.filter((n) => !LT.netto.some((x) => x.eigen && x.name === n)).map((n) => `<button type="button" class="ib" data-ltneu="netto" data-name="${esc(n)}" title="Umlage ${esc(n)} vom Stand nach Nachlass">＋ ${esc(n)}</button>`).join(' ')} <button type="button" class="ib" data-ltneu="netto">＋ weiterer Abzug netto …</button></td></tr>
      <tr class="s"><td></td><td></td><td colspan="3">= Abrechnungssumme netto · + Umsatzsteuer 19 % · = brutto</td></tr>
      <tr class="lt-k" data-ltanf="brutto"><td colspan="5">Abzüge brutto <span class="hint">nach der Umsatzsteuer</span></td></tr>
      ${LT.brutto.map(tr).join('')}<tr data-ltend="brutto"><td></td><td colspan="4"><button type="button" class="ib" data-ltneu="brutto">＋ Abzug brutto (Gegenforderung, Aufrechnung …)</button></td></tr>
      <tr class="s"><td></td><td></td><td colspan="3">= Zahlbetrag</td></tr>
      <tr class="${S.an === false ? 'aus' : ''}"><td></td><td class="lt-s">${sw({ k: 'skonto', an: S.an !== false })}</td><td>Skonto<div class="hint">vom Zahlbetrag, ab Rechnungseingang</div></td>
        <td class="lt-w">${inp('skonto', 'pct', nz(S.pct))} % · ${inp('skonto', 'tage', S.tage || '', { w: 2.8 })} <span class="seg sm seg-unter">${Object.entries(SKA).map(([k, t]) => `<button type="button" class="${(S.art || 'kt') === k ? 'on' : ''}" data-ltska="${k}"${SKW[k] ? ` title="${SKW[k][0]} Tage je Woche (${SKW[k][1]})"` : ''}>${t}<small>${SKW[k] ? SKW[k][0] : '&nbsp;'}</small></button>`).join('')}</span></td><td></td></tr>
    </tbody></table>
    <p class="hint" style="margin:.5rem 0 0">Gilt für jede Rechnung dieses Auftrags; je Rechnung lässt sich jede Zeile ab- oder zuschalten (Schalter in der Rechnung). Der Text der Vertragsbedingungen für Protokoll, Bauvertrag und Auftragsschreiben entsteht hieraus.</p></div>`;
  };
  const x0 = (k) => [...LT.netto, ...LT.brutto].find((x) => x.k === k);
  const merken = async (teil, text) => {   // teil: { an?, werte?, (eigen/reihe immer) }
    const body = { ...teil, eigen: eig(), reihe: reihe() };
    if (opt.sammeln) { offen = { ...offen, ...body, an: { ...(offen.an || {}), ...(teil.an || {}) }, werte: { ...(offen.werte || {}), ...Object.fromEntries(Object.entries(teil.werte || {}).map(([k, v]) => [k, { ...((offen.werte || {})[k] || {}), ...v }])) } }; draw(); return; }
    const altLT = JSON.parse(JSON.stringify(L.leiter || {})), altV = JSON.parse(JSON.stringify(L.vergabe || {}));
    try { await call('api/lv/' + lvId, 'PUT', { vergabe: { leiter: body } }); LT = JSON.parse(JSON.stringify(L.leiter || LT)); draw();
      rueckgaengig(text, async () => { await call('api/lv/' + lvId, 'PUT', { vergabe: { leiter: ltZurueck(altLT, altV) } }); LT = JSON.parse(JSON.stringify(L.leiter || LT)); draw(); }); } catch (er) { toast(er.message, true); draw(); }
  };
  host.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ltan) { const k = b.dataset.ltan; if (k === 'skonto') { LT.skonto.an = LT.skonto.an === false; merken({ an: { skonto: LT.skonto.an } }, 'Skonto ' + (LT.skonto.an ? 'an' : 'aus')); return; }
      const x = x0(k); x.an = !x.an; merken(x.eigen ? {} : { an: { [k]: x.an } }, `${x.name}: ${x.an ? 'abziehen' : 'nicht abziehen'}`); return; }
    if (b.dataset.ltform) { const x = x0(b.dataset.ltform); x.form = b.dataset.v; merken({ werte: { [x.k]: { form: x.form } } }, x.name + ': ' + (x.form === 'buergschaft' ? 'Bürgschaft' : 'Einbehalt')); return; }
    if (b.dataset.ltska) { LT.skonto.art = b.dataset.ltska; merken({ werte: { skonto: { art: LT.skonto.art } } }, 'Skontofrist geändert'); return; }
    if (b.dataset.ltneu) { const s = b.dataset.ltneu, k = 'e:' + Math.random().toString(36).slice(2, 8); LT[s].push({ k, name: b.dataset.name || (s === 'netto' ? 'Umlage' : 'Abzug'), seite: s, typ: 'pct', wert: 0, an: true, eigen: true }); merken({}, b.dataset.name ? `Umlage ${b.dataset.name} angelegt` : 'Abzug angelegt').then(() => { const i = host.querySelector(`[data-ltw="${k}"][data-f="${b.dataset.name ? 'wert' : 'name'}"]`); if (i) i.select(); }); return; }   // gleich den Wert (bzw. bei „weiterer“ den Namen) eintippen
    if (b.dataset.ltweg) { const k = b.dataset.ltweg; LT.netto = LT.netto.filter((x) => x.k !== k); LT.brutto = LT.brutto.filter((x) => x.k !== k); merken({}, 'Abzug gelöscht'); return; }
    if (b.dataset.ltseite) { const x = x0(b.dataset.ltseite), von = x.seite, nach = von === 'netto' ? 'brutto' : 'netto'; LT[von] = LT[von].filter((y) => y !== x); x.seite = nach; LT[nach].push(x); merken({}, 'Abzug ' + nach); }
  });
  host.addEventListener('bp-pzeur', (e) => {   // Umschalter % / € (Baukasten): eigene Zeile – nur die Art; Nachlass – der Wert wandert mit, das andere wird 0
    const { typ, wert, art } = e.detail || {}, k = e.target.dataset.ltw, x = art === 'lt' && x0(k); if (!x) return;
    if (x.eigen) { x.typ = typ; merken({}, `${x.name}: in ${typ === 'pct' ? '%' : '€'}`); return; }
    x.nltyp = typ; if (!wert) return;
    x.pct = typ === 'pct' ? wert : 0; x.eur = typ === 'eur' ? wert : 0; merken({ werte: { nachlass: { pct: x.pct, eur: x.eur } } }, `Nachlass in ${typ === 'pct' ? '%' : '€'}`);
  });
  host.addEventListener('change', (e) => {
    const i = e.target.closest('[data-ltw]'); if (!i) return;
    const k = i.dataset.ltw, f = k === 'nachlass' && i.dataset.pe === 'eur' ? 'eur' : i.dataset.f, x = x0(k);
    if (k === 'skonto') { LT.skonto[f] = pf(i.value) ?? 0; merken({ werte: { skonto: { [f]: LT.skonto[f] } } }, 'Skonto geändert'); return; }
    if (x && x.eigen) { x[f] = f === 'name' ? i.value.trim() || 'Abzug' : pf(i.value) ?? 0; merken({}, 'Abzug geändert'); return; }
    const v = f === 'frei_bis' || f === 'art' ? i.value : i.value.trim() === '' ? (k === 'ma' && f === 'pct' ? null : '') : pf(i.value);
    if (x) x[f] = v;
    merken({ werte: { [k]: { [f]: v } } }, (x ? x.name : k) + ' geändert');
  });
  host.addEventListener('dragstart', (e) => { const z = e.target.closest('[data-ltz]'); if (!z) return; ziehen = z.dataset.ltz; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ziehen); });
  const zielZeile = (e) => {   // wohin? vor eine Zeile, an den Anfang (Kopf) oder ans Ende (＋-Zeile) einer Seite; eigene Zeilen auch über die Umsatzsteuer hinweg (15.11.2026)
    const x = ziehen && x0(ziehen), z = e.target.closest('[data-ltz],[data-ltanf],[data-ltend]'); if (!x || !z) return null;
    const seite = z.dataset.seite || z.dataset.ltanf || z.dataset.ltend; return seite === x.seite || x.eigen ? { x, z, seite } : null;
  };
  host.addEventListener('dragover', (e) => { const w = zielZeile(e); if (!w) return; e.preventDefault(); host.querySelectorAll('.lt-ueber').forEach((y) => y.classList.remove('lt-ueber')); w.z.classList.add('lt-ueber'); });
  host.addEventListener('dragend', () => { ziehen = null; host.querySelectorAll('.lt-ueber').forEach((y) => y.classList.remove('lt-ueber')); });
  host.addEventListener('drop', (e) => {
    const w = zielZeile(e); ziehen = null; if (!w) return; e.preventDefault();
    const { x, z, seite } = w, ziel = z.dataset.ltz && x0(z.dataset.ltz), von = x.seite; if (ziel === x) { draw(); return; }
    LT[von] = LT[von].filter((y) => y !== x); x.seite = seite;
    if (ziel) LT[seite].splice(LT[seite].indexOf(ziel), 0, x); else if (z.dataset.ltanf) LT[seite].unshift(x); else LT[seite].push(x);
    merken({}, von === seite ? 'Reihenfolge geändert' : `${x.name}: ${seite === 'netto' ? 'vor' : 'nach'} der Umsatzsteuer`);
  });
  draw();
  return { daten: () => (Object.keys(offen).length ? offen : null) };
}
/* Rückgängig: den alten Stand der Leiter als Änderung schicken (Werte, an/aus, Reihenfolge, eigene Zeilen) */
function ltZurueck(altLT, altV) {
  const Z = [...(altLT.netto || []), ...(altLT.brutto || [])], A = altV.abzug || {}, S = altV.sicherheit || {};
  return { reihe: Z.map((x) => x.k), eigen: Z.filter((x) => x.eigen).map((x) => ({ id: x.k.slice(2), name: x.name, seite: x.seite, typ: x.typ, wert: x.wert, an: x.an })),
    an: Object.fromEntries(['nachlass', 'vorher', 'ma', 'strafe', 'bauabzug', 'skonto'].map((k) => [k, A[k] ?? (k === 'bauabzug' ? false : k === 'ma' ? A.einbehalt ?? true : true)]).concat([['ve', A.einbehalt ?? true]])),
    werte: { nachlass: { pct: altV.nachlass || 0, eur: altV.nachlass_eur || 0 }, skonto: { pct: altV.skonto || 0, tage: altV.skonto_tage || 0, art: altV.skonto_art || 'kt' },
      ve: { pct: altV.einbehalt ?? 5, form: (S.ve || {}).form || 'einbehalt' }, ma: { pct: (S.ma || {}).pct ?? null, form: (S.ma || {}).form || 'einbehalt', jahre: S.gw_jahre ?? 4 },
      strafe: { pct: (altV.auftrag || {}).vertragsstrafe || '', max: (altV.auftrag || {}).vertragsstrafe_max || '' }, bauabzug: { frei_bis: ((altV.leiter || {}).bauabzug || {}).frei_bis || '' } } };
}
