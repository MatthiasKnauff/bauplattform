'use strict';
/* Ausschreibung – Rechnung prüfen Schritt für Schritt (Assistent; besprochen am 13.11.2026, Mock „Rechnungsprüfung Schritt für Schritt“).
   Nach ava-rechnungen.js geladen, gemeinsame Namen (L, call, api, render, reTitel, vRechnungen0, reBelegHoch, reSperre …).
   1 Rechnung (PDF lesen, Nr., Datum, Eingang, gefordert, Prüffrist) · 2 Wie prüfen? (ohne Aufmaß · Mengen je Position · mit Rechenweg)
   3 Leistung · 4 Abzüge (die Rechnungskarte, ohne Kopf) · 5 Freigabe (Kürzung begründen, abschließen, Freigabe-PDF).
   Gespeichert wird wie überall sofort: Felder mit data-re (reSave), Aufmaßzeilen über api/lv/<id>/aufmass bzw. api/aufmass/<id>.
   „Mengen eintragen“ schreibt je Position eine Aufmaßzeile „direkt eingetragen · <Rechnung>“ (quelle „direkt“) – kumuliert stimmt so die Summe aller Zeilen. */
const RP = { rid: null, schritt: 1, neu: null, pos: null, q: '', nurMit: false, roll: 0 };
const RP_SCHRITTE = ['Rechnung', 'Wie prüfen?', 'Leistung', 'Abzüge', 'Freigabe'];
const RP_WEGE = [['ohne', '💶', 'Ohne Aufmaß', 'Pauschal, kleine Rechnungen, Abschlag nach Zahlungsplan: den geprüften Betrag eintragen – oder die Positionen der Rechnung von Hand.'],
  ['mengen', '✏️', 'Mit Aufmaß – Mengen eintragen', 'Je Position die geprüfte Menge (kumuliert) eintippen, z. B. aus der Massenermittlung der Firma abgehakt. Eine Zeile je Position.'],
  ['rechenweg', '📐', 'Mit Aufmaß – mit Rechenweg', 'Je Position Aufmaßzeilen mit Ort/Bauteil und Rechenweg (2 × 3,50 × 2,75 …), auch aus dem Raumbuch. Für Schlussrechnungen und strittige Mengen.']];
const rpR = () => (L && RP.rid ? L.rechnungen.find((x) => x.id === RP.rid) : null);
const rpC = () => (L && RP.rid ? (L.calc.rechnungen || []).find((x) => x.id === RP.rid) : null);
const rpDirekt = (r) => 'direkt eingetragen · ' + reTitelStd(r);
function rpWeg(r) {
  if (!r) return '';
  if (r.data.frei != null) return 'ohne';
  const w = LS.get('rpWeg:' + r.id, '');
  if (w && w !== 'ohne') return w;
  const vor = [...L.rechnungen].filter((x) => x.nr < r.nr && x.art === r.art).sort((a, b) => b.nr - a.nr)[0];   // wie die letzte Rechnung dieses Auftrags
  const wv = vor && (vor.data.frei != null ? 'ohne' : LS.get('rpWeg:' + vor.id, ''));
  return wv && wv !== 'ohne' ? wv : 'mengen';
}
const rpPos = (r) => posOf().filter((p) => p.art !== 'Z' && (r && r.art === 'nachtrag' ? p.nt : true));
const rpSumme = (pid) => L.aufmass.filter((a) => a.pos_id === pid).reduce((s, a) => s + (a.menge || 0), 0);
function rpBisher(r) {   // Stand der letzten geprüften Rechnung derselben Kette (kumuliert)
  const kette = (x) => (x.art === 'nachtrag' ? 'n' : x.art === 'abschlag' || x.art === 'schluss' ? 'h' : '');
  const v = L.rechnungen.filter((x) => x.status === 'geprueft' && x.nr < r.nr && kette(x) === kette(r) && x.data.frei == null).sort((a, b) => b.nr - a.nr)[0];
  return { r: v || null, stand: (v && v.data.stand) || {} };
}
const rpFrist = (eingang, art) => { if (!eingang) return ''; const d = new Date(eingang); d.setDate(d.getDate() + (art === 'schluss' ? 30 : 21)); return d.toISOString().slice(0, 10); };

/* ---------- öffnen ---------- */
function rpStart(art) { RP.neu = { art, datei: null, E: {} }; RP.rid = null; RP.schritt = 1; rpZeigen(); }
function rpOeffnen(rid, schritt) {
  const r = L && L.rechnungen.find((x) => x.id === rid); if (!r) return;
  RP.rid = rid; RP.neu = null; RP.pos = null; RP.q = '';
  RP.schritt = schritt || (r.status === 'geprueft' ? 5 : LS.get('rpSchritt:' + rid, 2));
  rpZeigen();
}
function rpZu() { const o = document.querySelector('.rp'); if (o) o.remove(); RP.rid = null; RP.neu = null; }
function rpNeu() { if (document.querySelector('.rp')) rpZeigen(); }   // render() ruft das nach jeder Änderung am LV

/* ---------- zeichnen ---------- */
function rpZeigen() {
  let ov = document.querySelector('.rp');
  if (RP.rid && !rpR()) { rpZu(); return; }   // Rechnung gelöscht oder anderes LV
  if (!ov) { ov = document.createElement('div'); ov.className = 'rp'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Rechnung prüfen'); document.body.appendChild(ov); }
  const fa = document.activeElement, fk = fa && ov.contains(fa) && fa.dataset ? Object.entries(fa.dataset).find(([k]) => /^(rpm|rpf|re|rpz|rpo|rpq)$/.test(k)) : null;
  const fid = fa && fa.dataset ? fa.dataset.id || fa.dataset.k || '' : '', b0 = ov.querySelector('.rp-b'), y = b0 ? b0.scrollTop : 0, yt = [...ov.querySelectorAll('.rp-tw')].map((x) => x.scrollTop);
  if (RP.ntWarte && amPos && amPos !== RP.ntVor) { RP.ntWarte = false; RP.pos = amPos; RP.q = ''; RP.nurMit = false; RP.fokus = amPos; }   // eben angelegte Nachtragsposition
  const r = rpR(), c = rpC(), s = RP.schritt;
  if (r) LS.set('rpSchritt:' + r.id, s);
  const firma = (L.vergabe && L.vergabe.bieter) || L.auftragnehmer || '';
  const stufen = RP_SCHRITTE.map((t, i) => { const n = i + 1, geht = n === 1 || !!r; return `<button type="button" class="${n === s ? 'hier' : n < s ? 'ok' : ''}" data-rpgo="${n}"${geht ? '' : ' disabled'}${n === s ? ' aria-current="step"' : ''}>${n} ${t}</button>`; }).join('');
  const inhalt = [null, rpS1, rpS2, rpS3, rpS4, rpS5][s](r, c);
  const fuss = s === 5 ? '<button type="button" class="btn pri" data-rpzu>Fertig</button>' : `<button type="button" class="btn pri" data-rpweiter>${s === 1 && !r ? 'Anlegen und weiter →' : 'Weiter →'}</button>`;
  ov.innerHTML = `<div class="rp-k"><b>Rechnung prüfen</b><span class="mute">${esc([firma, L.nr || L.name ? 'LV ' + [L.nr, L.name].filter(Boolean).join(' ') : '', r ? reTitel(r) : (RE_NAME[RP.neu.art] || 'Teilrechnung') + ' – neu'].filter(Boolean).join(' · '))}</span><span class="fill"></span><button type="button" class="btn" data-rpzu>Schließen</button></div>
    <nav class="rp-st" aria-label="Schritte">${stufen}</nav>
    <div class="rp-b"><div class="rp-in">${inhalt}</div></div>
    <div class="rp-f">${s > 1 ? '<button type="button" class="btn" data-rpzur>← Zurück</button>' : '<span></span>'}<span class="rp-sum">${rpSumZeile(r, c)}</span>${fuss}</div>`;
  const b = ov.querySelector('.rp-b'); if (y) b.scrollTop = y;
  ov.querySelectorAll('.rp-tw').forEach((x, i) => { if (yt[i]) { x.scrollTop = yt[i]; x.dispatchEvent(new Event('scroll')); } });   // Tabellen mit Ausschnitt: dieselbe Stelle, Ausschnitt nachbauen
  if (RP.fokus && s === 3 && r && rpWeg(r) === 'mengen') {   // zur neuen Position rollen, Menge eintippen
    const k = rpListe(r).findIndex((p) => p.id === RP.fokus); RP.fokus = null;
    if (k >= 0) { setTimeout(() => { const id = rpListe(rpR() || {}).length > k ? rpListe(rpR())[k].id : '', tr = document.querySelector('.rp') && (bpBaum.fenster.zeige('rpm', k) || (document.querySelector(`.rp [data-rpm="${CSS.escape(id)}"]`) || {}).closest?.('tr')); if (tr) { tr.scrollIntoView({ block: 'center' }); const i = tr.querySelector('[data-rpm]'); if (i) i.focus(); } }, 150); return; }   // nach dem Speichern (das zeichnet noch einmal)
  } else if (RP.fokus && s === 3) { RP.fokus = null; setTimeout(() => { const i = document.querySelector('.rp [data-rpz="neu"]'); if (i) i.focus(); }, 150); return; }
  if (fk) { let el = ov.querySelector(`[data-${fk[0]}="${CSS.escape(fk[1])}"]${fid && fa.dataset.id ? `[data-id="${CSS.escape(fid)}"]` : ''}`);
    if (!el && (fk[0] === 'rpm' || fk[0] === 'rpf') && r) { const k = rpListe(r).findIndex((p) => p.id === fk[1]), tr = k >= 0 && bpBaum.fenster.zeige('rpm', k); el = tr && tr.querySelector(`[data-${fk[0]}]`); }
    if (el) { el.focus({ preventScroll: true }); if (el.select && el.tagName === 'INPUT') el.select(); } }
}
function rpSumZeile(r, c) {
  if (!r || !c) return '';
  return `Leistungsstand netto <b>${eur(c.leistung)}</b>${r.gefordert ? ` · gefordert ${eur(r.gefordert)} · Differenz <b class="${c.differenz > 0.5 ? 'rp-rot' : ''}">${eur(-c.differenz)}</b>` : ''} · Zahlbetrag netto <b>${eur(c.zahlung)}</b>`;
}

/* 1 Rechnung */
function rpS1(r) {
  const art = r ? r.art : RP.neu.art, E = r ? {} : RP.neu.E || {}, tag = (k) => (E[k] != null && E[k] !== '' ? ' <span class="rp-tag">aus dem PDF</span>' : '');
  const eingang = r ? r.eingang : (RP.neu.eingang || new Date().toISOString().slice(0, 10)), frist = rpFrist(eingang, art);
  const fristT = frist ? `<span class="chip ${frist < new Date().toISOString().slice(0, 10) ? 'r' : 'o'}">Prüffrist bis ${de(frist)}</span> <span class="hint">(${art === 'schluss' ? '30 Tage, § 16 Abs. 3 VOB/B' : '21 Tage, § 16 Abs. 1 VOB/B'})</span>` : '';
  if (r) {
    const dis = r.status === 'geprueft' ? ' disabled' : '';
    return `<h3>${esc(reTitel(r))}</h3><div class="rp-zwei"><div>
      <div class="re-bel rp-drop" data-redrop="${r.id}">${(r.belege || []).map((b) => `<span class="re-b">📄 ${esc(b.name || 'Rechnung')}</span>`).join('') || '<span class="hint">Noch keine Rechnung der Firma – PDF hierher ziehen oder</span>'}
        <label class="btn sm">PDF wählen …<input type="file" accept="application/pdf,.pdf,image/*" hidden data-rebeleg="${r.id}"></label></div>
      <p class="hint">Das PDF wird im Projektordner abgelegt, in der Plattform steht nur der Verweis.</p></div>
      <div class="rp-fm"><label>Rechnungsnr.<input data-re="re_nr" data-id="${r.id}" value="${esc(r.re_nr)}"${dis}></label>
        <label>Rechnungsdatum<input type="date" data-re="datum" data-id="${r.id}" value="${esc(r.datum)}"${dis}></label>
        <label>Eingang<input type="date" data-re="eingang" data-id="${r.id}" value="${esc(r.eingang)}"${dis}></label>
        <label>gefordert ${r.art === 'regie' ? '' : '(kumuliert) '}netto<input data-re="gefordert" data-id="${r.id}" value="${r.gefordert ? nf(r.gefordert, 2) : ''}" inputmode="decimal"${dis}></label>
        <div class="rp-frist">${fristT}</div></div></div>`;
  }
  const A = [['abschlag', 'Teilrechnung'], ['schluss', 'Schlussrechnung'], ['nachtrag', 'Nachtragsrechnung']].filter(([k]) => k !== 'nachtrag' || L.rechnungen.some((x) => x.art === 'nachtrag') || art === 'nachtrag');
  return `<h3>Neue Rechnung erfassen</h3><div class="rp-zwei"><div>
      <label class="rp-drop rp-dropneu" data-rpdrop>${RP.neu.datei ? `📄 <b>${esc(RP.neu.datei.name)}</b>${RP.neu.liest ? ' – wird gelesen …' : ''}` : '📄 Rechnung der Firma (PDF, Scan) hierher ziehen oder klicken'}<input type="file" accept="application/pdf,.pdf,image/*" hidden data-rpdatei></label>
      <p class="hint">Nummer, Datum und Betrag werden gelesen und zum Prüfen vorgeschlagen. Das PDF wird im Projektordner abgelegt.</p></div>
    <div class="rp-fm"><span class="rp-l">Art</span><span class="seg" role="radiogroup">${A.map(([k, t]) => `<button type="button" data-rpart="${k}" class="${art === k ? 'on' : ''}"${reSperre(k) && k !== art ? ' disabled' : ''}>${t}</button>`).join('')}</span>
      <label>Rechnungsnr.${tag('re_nr')}<input data-rpn="re_nr" value="${esc(RP.neu.re_nr ?? E.re_nr ?? '')}"></label>
      <label>Rechnungsdatum${tag('datum')}<input type="date" data-rpn="datum" value="${esc(RP.neu.datum ?? E.datum ?? '')}"></label>
      <label>Eingang<input type="date" data-rpn="eingang" value="${esc(eingang)}"></label>
      <label>gefordert (kumuliert) netto${tag('netto')}<input data-rpn="gefordert" inputmode="decimal" value="${esc(RP.neu.gefordert ?? (E.netto != null ? nf(E.netto, 2) : ''))}"></label>
      ${art === 'schluss' ? `<label>Abnahme erfolgt am<input type="date" data-rpn="abnahme" value="${esc(RP.neu.abnahme ?? ((L.calc.sicherheit || {}).abnahme || ''))}"></label>` : ''}
      <div class="rp-frist">${fristT}</div></div></div>`;
}
async function rpAnlegen() {
  const N = RP.neu, art = N.art, ov = document.querySelector('.rp'), v = (k) => { const el = ov.querySelector(`[data-rpn="${k}"]`); return el ? el.value : ''; };
  if (art === 'schluss') {
    const ab = v('abnahme'), alt = (L.calc.sicherheit || {}).abnahme || '';
    if (!ab && !(await bpFrage('Ist die Abnahme erfolgt?\n' + ABN_TIP, { ok: 'Noch nicht – trotzdem anlegen', abbrechen: 'Datum eintragen' }))) return;
    if (ab && ab !== alt) await call('api/lv/' + L.id, 'PUT', { vergabe: { sicherheit: { abnahme: ab } } });
  }
  const d = await call(`api/lv/${L.id}/rechnungen`, 'POST', { art, re_nr: v('re_nr'), datum: v('datum'), eingang: v('eingang'), gefordert: pf(v('gefordert')) || 0 });
  const neu = d.rechnungen.reduce((a, x) => (x.nr > a.nr ? x : a), d.rechnungen[0]); if (!neu) return;
  PJSEL = 'r' + neu.id; RP.rid = neu.id; RP.neu = null; RP.schritt = 2; rpZeigen();
  if (N.datei) await reBelegHoch(neu.id, N.datei);
}
async function rpDateiLesen(f) {
  RP.neu.datei = f; RP.neu.liest = true; rpZeigen();
  const fd = new FormData(); fd.append('datei', f);
  try { const r = await fetch('api/ava/erkennen', { method: 'POST', body: fd, credentials: 'same-origin' }), E = await r.json(); if (r.ok && RP.neu) { RP.neu.E = E; if (E.schluss && !reSperre('schluss')) RP.neu.art = 'schluss'; } }
  catch { /* ohne Vorschläge weiter */ }
  if (RP.neu) { RP.neu.liest = false; rpZeigen(); }
}

/* 2 Wie prüfen? */
function rpS2(r) {
  const w = rpWeg(r), fest = r.status === 'geprueft';
  return `<h3>Wie wird geprüft?</h3><div class="rp-wege">${RP_WEGE.map(([k, ic, t, txt]) => `<button type="button" class="rp-w${w === k ? ' on' : ''}" data-rpweg="${k}"${fest ? ' disabled' : ''} aria-pressed="${w === k}"><span class="ic">${ic}</span><b>${t}</b><small>${txt}</small></button>`).join('')}</div>
    <p class="hint">Vorgeschlagen ist der Weg der letzten Rechnung dieses Auftrags. Wechseln geht auch später – Mengen und Rechenwege bleiben erhalten.</p>`;
}
async function rpWegSetzen(w) {
  const r = rpR(); if (!r) return;
  LS.set('rpWeg:' + r.id, w);
  if (w === 'ohne' && r.data.frei == null) await call('api/rechnungen/' + r.id, 'PUT', { frei: r.gefordert || 0 });
  else if (w !== 'ohne' && r.data.frei != null) await call('api/rechnungen/' + r.id, 'PUT', { frei: null });
  else rpZeigen();
}

/* 3 Leistung */
function rpS3(r, c) {
  const w = rpWeg(r), fest = r.status === 'geprueft', dis = fest ? ' disabled' : '';
  if (w === 'ohne') {
    const Z = r.data.zeilen || [];
    if (!Z.length) return `<h3>Geprüfter Betrag</h3><div class="rp-fm" style="max-width:28rem"><label>geprüfter Betrag netto (diese Rechnung)<input data-re="frei" data-id="${r.id}" value="${nf(r.data.frei || 0, 2)}" inputmode="decimal"${dis}></label></div>
      ${fest ? '' : `<p><button type="button" class="btn sm" data-reb="fzneu" data-id="${r.id}">＋ Positionen der Rechnung von Hand</button></p>`}<p class="hint">Ohne Aufmaß zählt jede Rechnung für sich (nicht kumuliert).</p>`;
    return `<h3>Positionen der Rechnung (von Hand)</h3><div class="tblw"><table class="rp-t"><thead><tr><th>Kurztext</th><th class="r">Menge</th><th>EH</th><th class="r">EP €</th><th class="r">Betrag</th><th></th></tr></thead><tbody>
      ${Z.map((z, k) => `<tr><td><input data-re="z-text" data-id="${r.id}" data-k="${k}" value="${esc(z.text || '')}" placeholder="Kurztext der Leistung"${dis}></td><td class="r"><input class="rp-n" data-re="z-menge" data-id="${r.id}" data-k="${k}" value="${z.menge != null ? nf(z.menge, 3) : ''}" inputmode="decimal"${dis}></td>
        <td><input class="rp-eh" data-re="z-einheit" data-id="${r.id}" data-k="${k}" value="${esc(z.einheit || '')}"${dis}></td><td class="r"><input class="rp-n" data-re="z-ep" data-id="${r.id}" data-k="${k}" value="${z.ep != null ? nf(z.ep, 2) : ''}" inputmode="decimal"${dis}></td>
        <td class="r">${eur((z.menge || 0) * (z.ep || 0))}</td><td>${fest ? '' : `<button type="button" class="ib" data-reb="zdel" data-id="${r.id}" data-k="${k}" aria-label="Zeile entfernen">✕</button>`}</td></tr>`).join('')}</tbody></table></div>
      ${fest ? '' : `<p><button type="button" class="btn sm" data-reb="fzneu" data-id="${r.id}">＋ Position</button></p>`}`;
  }
  if (w === 'rechenweg') return rpRechenweg(r, fest);
  return rpMengen(r, fest);
}
function rpListe(r) {
  const q = RP.q.toLowerCase().split(/\s+/).filter(Boolean), B = rpBisher(r).stand;
  return rpPos(r).filter((p) => (!q.length || q.every((w) => `${p.oz} ${p.kurz}`.toLowerCase().includes(w))) && (!RP.nurMit || rpSumme(p.id) || B[p.id]));
}
function rpMengen(r, fest) {
  const P = rpListe(r), VP = L.vergabe.preise || {}, B = rpBisher(r), FM = r.data.firma_mengen || {}, dis = fest ? ' disabled' : '';
  const zeile = (k) => { const p = P[k], m = rpSumme(p.id), ep = VP[p.id], fm = FM[p.id], n = L.aufmass.filter((a) => a.pos_id === p.id && a.quelle !== 'direkt').length;
    const ue = p.menge > 0 && m > p.menge * 1.0001, ab = fm != null && Math.abs(fm - m) > 0.0005;
    return `<tr><td class="oz">${esc(p.oz || '')}</td><td class="t">${esc(p.kurz || '')}${n ? ` <button type="button" class="ib" data-rprw="${esc(p.id)}" title="Aufmaßzeilen mit Rechenweg ansehen">📐 ${n}</button>` : ''}</td>
      <td class="r">${nf(p.menge)}</td><td>${esc(p.einheit || '')}</td><td class="r">${B.stand[p.id] != null ? nf(B.stand[p.id]) : '–'}</td>
      <td class="r"><input class="rp-n rp-fi" data-rpf="${esc(p.id)}" value="${fm != null ? nf(fm) : ''}" inputmode="decimal" placeholder="–" aria-label="Menge lt. Firma ${esc(p.oz || '')}"${dis}></td>
      <td class="r"><input class="rp-n rp-mi" data-rpm="${esc(p.id)}" value="${m ? nf(m) : ''}" inputmode="decimal" placeholder="0" aria-label="geprüfte Menge ${esc(p.oz || '')}"${dis}></td>
      <td class="r">${ep != null ? nf(ep, 2) : '–'}</td><td class="r">${m && ep != null ? eur(m * ep) : ''}</td>
      <td>${ue ? `<span class="chip r" title="Mengenänderung – § 2 Abs. 3 VOB/B prüfen">${Math.round(m / p.menge * 100)} % – über Auftrag</span>` : ''}${ab ? `<span class="chip o">${fm > m ? '−' : '+'}${nf(Math.abs(fm - m))} zur Firma</span>` : ''}</td></tr>`; };
  return `<div class="rp-leiste"><h3>Mengen je Position</h3><span class="hint">kumuliert bis zu dieser Rechnung · Tab oder Enter springt zur nächsten Position${B.r ? ` · „bisher“ = ${esc(reTitel(B.r))}` : ''}</span><span class="fill"></span>
      ${fest ? '' : '<button type="button" class="btn sm" data-rpnt title="Leistung, die nicht im LV steht: kommt als Nachtrag in den Auftrag – danach gleich Menge bzw. Aufmaß erfassen">＋ Position (Nachtrag)</button>'}<input type="search" data-rpq placeholder="Position suchen …" value="${esc(RP.q)}" aria-label="Position suchen"><label class="hint"><input type="checkbox" data-rpnur${RP.nurMit ? ' checked' : ''}> nur mit Menge</label></div>
    <div class="tblw rp-tw"><table class="rp-t"><thead><tr><th>OZ</th><th>Kurztext</th><th class="r">Auftrag</th><th>EH</th><th class="r">bisher</th><th class="r" title="Menge laut Rechnung der Firma – nur zum Vergleich">lt. Firma</th><th class="r">geprüft</th><th class="r">EP</th><th class="r">Betrag</th><th></th></tr></thead>
      <tbody>${P.length ? bpBaum.fenster.html('rpm', P.length, zeile) : '<tr><td colspan="10" class="hint">Keine Position gefunden.</td></tr>'}</tbody></table></div>`;
}
async function rpMengeSetzen(pid, wert, ohneUndo) {
  const r = rpR(); if (!r || r.status === 'geprueft') return;
  const ziel = pf(wert) || 0, ist = rpSumme(pid), d = Math.round((ziel - ist) * 10000) / 10000; if (!d) return;
  const z = L.aufmass.find((a) => a.pos_id === pid && a.quelle === 'direkt' && a.ort === rpDirekt(r)), id = L.id;
  if (z && Math.abs((z.menge || 0) + d) < 0.00005) await call('api/aufmass/' + z.id, 'DELETE');
  else if (z) await call('api/aufmass/' + z.id, 'PUT', { menge: Math.round(((z.menge || 0) + d) * 10000) / 10000, formel: '' });
  else await call(`api/lv/${id}/aufmass`, 'POST', { pos_id: pid, menge: d, ort: rpDirekt(r), quelle: 'direkt', formel: '' });
  if (!ohneUndo) { const p = posOf().find((x) => x.id === pid) || {}; rueckgaengig(`Menge ${p.oz || ''}: ${nf(ist)} → ${nf(ziel)}`, () => (L && L.id === id ? rpMengeSetzen(pid, String(ist).replace('.', ','), true) : null)); }
}
function rpRechenweg(r, fest) {
  const P = rpListe(r); if (!RP.pos || !P.some((p) => p.id === RP.pos)) RP.pos = (P[0] || {}).id || null;
  const i = P.findIndex((p) => p.id === RP.pos), p = P[i], dis = fest ? ' disabled' : '';
  const links = (k) => { const x = P[k], n = L.aufmass.filter((a) => a.pos_id === x.id).length; return `<tr class="${x.id === RP.pos ? 'on' : ''}" data-rppos="${esc(x.id)}"><td class="oz">${esc(x.oz || '')}</td><td class="t">${esc(x.kurz || '')}</td><td class="r">${n ? '✓ ' + nf(rpSumme(x.id)) : ''}</td></tr>`; };
  const Z = p ? L.aufmass.filter((a) => a.pos_id === p.id).sort((a, b) => a.id - b.id) : [], B = rpBisher(r).stand;
  return `<div class="rp-leiste"><h3>Aufmaß mit Rechenweg</h3><span class="fill"></span>${fest ? '' : '<button type="button" class="btn sm" data-rpnt title="Leistung, die nicht im LV steht: kommt als Nachtrag in den Auftrag – danach gleich Menge bzw. Aufmaß erfassen">＋ Position (Nachtrag)</button>'}<input type="search" data-rpq placeholder="Position suchen …" value="${esc(RP.q)}" aria-label="Position suchen"></div>
    <div class="rp-rw"><div class="tblw rp-tw rp-rwl"><table class="rp-t"><tbody>${P.length ? bpBaum.fenster.html('rpl', P.length, links, { um: i }) : '<tr><td class="hint">Keine Position gefunden.</td></tr>'}</tbody></table></div>
    <div class="rp-rwr">${p ? `<div class="rp-leiste"><b>${esc(p.oz || '')} ${esc(p.kurz || '')}</b><span class="hint">Auftrag ${nf(p.menge)} ${esc(p.einheit || '')}${B[p.id] != null ? ` · bisher ${nf(B[p.id])}` : ''} · Position ${i + 1} von ${P.length}</span><span class="fill"></span>
        <button type="button" class="btn sm" data-rpnach="-1"${i > 0 ? '' : ' disabled'}>‹ vorige</button><button type="button" class="btn sm" data-rpnach="1"${i < P.length - 1 ? '' : ' disabled'}>nächste ›</button></div>
      <div class="tblw"><table class="rp-t"><thead><tr><th>Ort / Bauteil</th><th>Rechenweg</th><th class="r">Menge</th><th></th></tr></thead><tbody>
        ${Z.map((z) => `<tr><td><input data-rpo="${z.id}" value="${esc(z.ort || '')}" placeholder="Ort / Bauteil"${dis}></td><td><input data-rpz="${z.id}" value="${esc(z.formel || '')}" placeholder="${z.formel ? '' : nf(z.menge)}"${dis}></td><td class="r">${nf(z.menge)}</td><td>${fest ? '' : `<button type="button" class="ib" data-rpzx="${z.id}" aria-label="Zeile löschen">✕</button>`}</td></tr>`).join('')}
        ${fest ? '' : `<tr class="rp-neu"><td><input data-rpo="neu" placeholder="Ort / Bauteil"></td><td><input data-rpz="neu" placeholder="z. B. 2 × 3,50 × 2,75 – Enter legt die Zeile an"></td><td class="r"></td><td></td></tr>`}
        <tr class="s"><td colspan="2">Summe (kumuliert)</td><td class="r"><b>${nf(rpSumme(p.id))}</b></td><td></td></tr></tbody></table></div>
      ${fest ? '' : '<p><button type="button" class="btn sm" data-rpraum>Aus dem Raumbuch …</button></p>'}` : '<p class="hint">Links eine Position wählen.</p>'}</div></div>`;
}

/* 4 Abzüge: die Rechnungskarte (Abzüge, Einbehalt, bisher anerkannt, Zahlbetrag) – ohne Kopf, Prüfweg und Knöpfe */
function rpS4(r) {
  const alt = PJSEL; PJSEL = 'r' + r.id; let h = ''; try { h = vRechnungen0(); } finally { PJSEL = alt; }
  return `<h3>Abzüge und Einbehalt</h3><p class="hint">Was im Auftrag eingestellt ist, ist schon angehakt – je Rechnung abwählbar.</p><div class="rp-karte">${h}</div>`;
}
/* 5 Freigabe */
function rpS5(r, c) {
  const g = r.status === 'geprueft', FM = r.data.firma_mengen || {}, P = posOf();
  const vor = Object.entries(FM).map(([pid, fm]) => { const p = P.find((x) => x.id === pid), m = rpSumme(pid); return p && Math.abs(fm - m) > 0.0005 ? `Pos. ${p.oz}: ${nf(m)} statt ${nf(fm)} ${p.einheit || ''}`.trim() : ''; }).filter(Boolean).join('; ');
  return `<h3>Freigabe</h3><div class="rp-zwei"><div><table class="rp-summen"><tbody>
      <tr><td>Zahlbetrag netto${c.hand ? ' <span class="hint">(von Hand festgesetzt)</span>' : ''}</td><td class="r">${eur(c.zahlung)}</td></tr><tr><td>+ Umsatzsteuer</td><td class="r">${eur(c.mwst)}</td></tr><tr class="s"><td>= Zahlbetrag brutto</td><td class="r">${eur(c.brutto)}</td></tr>
      ${c.skonto ? `<tr><td>– Skonto ${nf(c.skonto_pct, 2)} %${c.skonto_bis ? ` bei Zahlung bis <b>${de(c.skonto_bis)}</b>` : ''}</td><td class="r">${eur(-c.skonto)}</td></tr><tr class="s"><td>= mit Skonto</td><td class="r">${eur(c.brutto_skonto)}</td></tr>` : ''}
      ${r.gefordert ? `<tr><td>gefordert ${eur(r.gefordert)} – ${c.differenz > 0.5 ? 'Kürzung' : 'Differenz'}</td><td class="r ${c.differenz > 0.5 ? 'rp-rot' : ''}">${eur(-c.differenz)}</td></tr>` : ''}</tbody></table>
      <label class="rp-fm1">${c.differenz > 0.5 ? 'Kürzung begründen' : 'Bemerkung zur Prüfung'} <span class="hint">(steht auf dem Prüfblatt)</span><textarea data-re="notiz" data-id="${r.id}" rows="3"${g ? ' disabled' : ''}>${esc(r.notiz || '')}</textarea></label>
      ${vor && !g ? `<p class="hint">Vorschlag aus den Abweichungen zur Firma: ${esc(vor)} <button type="button" class="ib" data-rpvor="${esc(vor)}">übernehmen</button></p>` : ''}</div>
    <div class="rp-fertig">${g ? `<p><span class="chip g">geprüft ${de(r.data.geprueft_am)}</span> – der Aufmaßstand ist festgehalten.</p>` : '<p class="hint">„Prüfung abschließen“ hält den Aufmaßstand fest – spätere Aufmaße zählen erst in der nächsten Rechnung.</p>'}
      <p>${g ? (reNachfolger(r) ? '' : `<button type="button" class="btn" data-reb="zurueck" data-id="${r.id}">Prüfung zurücknehmen</button>`) : `<button type="button" class="btn pri" data-reb="pruefen" data-id="${r.id}">✓ Prüfung abschließen</button>`}
        <button type="button" class="btn" data-reb="freigabe" data-id="${r.id}" title="Freigabe mit Zahlbetrag – dazu wählbar Prüfblatt, Massenermittlung und Rechnung der Firma in einer PDF">🖨 Rechnungsfreigabe / PDF …</button></p>
      <p class="hint">Im Freigabe-PDF wählst du Prüfblatt, Massenermittlung und die Rechnung der Firma; von dort geht es auch zum Versand. Die Mail geht nie automatisch.</p></div></div>`;
}

/* ---------- Ereignisse ---------- */
document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-rpstart],[data-rpzu],[data-rpgo],[data-rpweiter],[data-rpzur],[data-rpweg],[data-rpart],[data-rprw],[data-rppos],[data-rpnach],[data-rpzx],[data-rpraum],[data-rpvor],[data-rpnt]'); if (!t || !L) return;
  try {
    if (t.dataset.rpstart) { rpOeffnen(+t.dataset.rpstart); return; }
    if (t.dataset.rpzu !== undefined) { await flush(); rpZu(); render(); return; }
    if (t.dataset.rpgo) { RP.schritt = +t.dataset.rpgo; rpZeigen(); return; }
    if (t.dataset.rpzur !== undefined) { RP.schritt = Math.max(1, RP.schritt - 1); rpZeigen(); return; }
    if (t.dataset.rpweiter !== undefined) { if (RP.schritt === 1 && !RP.rid) { t.disabled = true; await rpAnlegen(); return; } RP.schritt = Math.min(5, RP.schritt + 1); rpZeigen(); return; }
    if (t.dataset.rpweg) { await rpWegSetzen(t.dataset.rpweg); return; }
    if (t.dataset.rpart) { RP.neu.art = t.dataset.rpart; rpZeigen(); return; }
    if (t.dataset.rprw) { const r = rpR(); LS.set('rpWeg:' + r.id, 'rechenweg'); RP.pos = t.dataset.rprw; rpZeigen(); return; }
    if (t.dataset.rppos) { RP.pos = t.dataset.rppos; rpZeigen(); return; }
    if (t.dataset.rpnach) { const P = rpListe(rpR()), i = P.findIndex((p) => p.id === RP.pos) + +t.dataset.rpnach; if (P[i]) { RP.pos = P[i].id; rpZeigen(); } return; }
    if (t.dataset.rpzx) { const z = L.aufmass.find((a) => a.id === +t.dataset.rpzx), id = L.id; await call('api/aufmass/' + t.dataset.rpzx, 'DELETE');
      if (z) rueckgaengig(`Aufmaßzeile ${z.ort || z.formel || ''} gelöscht`.trim(), () => call(`api/lv/${id}/aufmass`, 'POST', { pos_id: z.pos_id, datum: z.datum, ort: z.ort, formel: z.formel, menge: z.menge, quelle: z.quelle, rechnung_id: z.rechnung_id })); return; }
    if (t.dataset.rpnt !== undefined) { RP.ntVor = amPos; RP.ntWarte = true; amNachtragNeu(); return; }   // Dialog aus der Aufmaßprüfung (ava-aufmass.js)
    if (t.dataset.rpraum !== undefined) { amPos = RP.pos; LS.set('amPos', amPos); raumDialog(); return; }
    if (t.dataset.rpvor) { const r = rpR(), el = document.querySelector(`.rp [data-re="notiz"][data-id="${r.id}"]`); if (el) { el.dataset.v0 = el.value; el.value = (el.value.trim() ? el.value.trim() + '\n' : '') + t.dataset.rpvor; el.dispatchEvent(new Event('change', { bubbles: true })); } }
  } catch (er) { toast(er.message, true); rpZeigen(); }
});
document.addEventListener('change', async (e) => {
  const el = e.target; if (!el.closest || !el.closest('.rp') || !L) return;
  try {
    if (el.dataset.rpdatei !== undefined) { if (el.files[0]) rpDateiLesen(el.files[0]); return; }
    if (el.dataset.rpn) { RP.neu[el.dataset.rpn] = el.value; if (el.dataset.rpn === 'eingang') rpZeigen(); return; }
    if (el.dataset.rpnur !== undefined) { RP.nurMit = el.checked; rpZeigen(); return; }
    if (el.dataset.rpm) { await rpMengeSetzen(el.dataset.rpm, el.value); return; }
    if (el.dataset.rpf) { const r = rpR(); await call('api/rechnungen/' + r.id, 'PUT', { firma_mengen: { [el.dataset.rpf]: pf(el.value) } }); return; }
    if (el.dataset.rpo && el.dataset.rpo !== 'neu') { await call('api/aufmass/' + el.dataset.rpo, 'PUT', { ort: el.value }); return; }
    if (el.dataset.rpz && el.dataset.rpz !== 'neu') { await call('api/aufmass/' + el.dataset.rpz, 'PUT', { formel: el.value }); return; }
  } catch (er) { toast(er.message, true); }
});
let RPQT = 0;
document.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.rpq !== undefined && e.target.closest('.rp')) { RP.q = e.target.value; clearTimeout(RPQT); RPQT = setTimeout(rpZeigen, 200); } });
document.addEventListener('keydown', async (e) => {
  const el = e.target; if (!el.closest || !el.closest('.rp') || e.key !== 'Enter' || e.isComposing) return;
  if (el.dataset.rpm || el.dataset.rpf) {   // Enter: nächste Position (die Änderung speichert „change“)
    e.preventDefault(); const A = [...document.querySelectorAll(`.rp [data-${el.dataset.rpm ? 'rpm' : 'rpf'}]`)], n = A[A.indexOf(el) + 1]; if (n) n.focus(); else el.blur(); return; }
  if (el.dataset.rpz === 'neu' || el.dataset.rpo === 'neu') {   // neue Aufmaßzeile
    e.preventDefault(); const ov = document.querySelector('.rp'), fo = ov.querySelector('[data-rpz="neu"]').value.trim(), ort = ov.querySelector('[data-rpo="neu"]').value.trim();
    if (!fo) { ov.querySelector('[data-rpz="neu"]').focus(); return; }
    try { await call(`api/lv/${L.id}/aufmass`, 'POST', { pos_id: RP.pos, formel: fo, ort, quelle: 'hand' }); const n = document.querySelector('.rp [data-rpo="neu"]'); if (n) n.focus(); } catch (er) { toast(er.message, true); }
  }
});
document.addEventListener('dragover', (e) => { const z = e.target.closest && e.target.closest('[data-rpdrop]'); if (z && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); z.classList.add('over'); } });
document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-rpdrop]'); if (z) z.classList.remove('over'); });
document.addEventListener('drop', (e) => { const z = e.target.closest && e.target.closest('[data-rpdrop]'); if (!z || !e.dataTransfer.files.length) return; e.preventDefault(); z.classList.remove('over'); rpDateiLesen(e.dataTransfer.files[0]); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.rp') && !document.querySelector('.modal-bg,.bph-dlg-bg')) { e.preventDefault(); rpZu(); render(); } });
