'use strict';
/* Honorar – Seite der App (nur Verwaltung). Links die Aufträge je Projekt (bpNav), oben die Befehlsleiste (befehle),
   in der Mitte der Auftrag: Grundlagen, Leistungsphasen mit Abgleich zur Zeiterfassung, Nebenkosten, Summe.
   Jede Änderung wird sofort gespeichert und kann über das Rückgängig-Dock zurückgenommen werden. Server: plattform/honorar.py. */
let ME = null, L = null, D = null, AID = null;
const NAV = $('#navL'), LEISTE = $('#bfl'), V = $('#view'), WORK = $('#work');
const eur = (v) => (v == null ? '–' : (+v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
const eur0 = (v) => (v == null ? '–' : Math.round(+v).toLocaleString('de-DE') + ' €');
const std = (m) => (m ? (m / 60).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' h' : '–');
const betrag = (v) => (v ? (+v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
const zahl = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const ART = { hoai: 'HOAI', stunden: 'nach Aufwand', pauschal: 'pauschal' };
const NKART = { plot: 'Plotauftrag', fahrt: 'Fahrt', sonst: 'Sonstiges' };
const IC = { neu: '<path d="M12 5v14M5 12h14"/>', pdf: '<path d="M6 3h9l4 4v14H6zM14 3v5h5"/><path d="M9 13h6M9 17h4"/>', weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  auftrag: '<path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2"/><path d="M15.5 11.5a3 3 0 1 0 0 5"/><path d="M11 13h4M11 15h4"/>' };

async function laden(aid) {
  L = await api('api/auftraege');
  if (aid !== undefined) AID = aid;
  if (AID && !L.auftraege.some((a) => a.id === AID)) AID = null;
  if (!AID && L.auftraege.length) AID = L.auftraege[0].id;
  D = AID ? await api('api/auftraege/' + AID) : null;
  zeichne();
}

function nav() {
  const G = {};
  L.auftraege.forEach((a) => { (G[a.projekt || '–'] = G[a.projekt || '–'] || []).push(a); });
  bpNav(NAV, {
    kopf: { titel: 'Honorar', klein: `${L.auftraege.length} Auftr${L.auftraege.length === 1 ? 'ag' : 'äge'}` },
    gruppen: Object.keys(G).sort((x, y) => x.localeCompare(y, 'de')).map((p) => ({ titel: p, punkte: G[p].map((a) => ({
      id: String(a.id), text: a.name, icon: IC.auftrag, farbe: a.status === 'beauftragt' ? 'var(--ok,#1e8a4c)' : a.status === 'abgeschlossen' ? 'var(--mute)' : 'var(--y)',
      zahl: a.warnung ? '!' : '', zahlTip: a.warnung ? 'Aufwand über dem Honorar' : '' })) })),
    aktiv: AID ? String(AID) : '', attr: 'hon', lage: true,
    wahl: async (id) => { AID = +id; D = await api('api/auftraege/' + AID); zeichne(); },
  });
}

function leiste() {
  const K = (t, ic, fn, o = {}) => ({ t, ic, fn, tip: o.tip || t, aus: !!o.aus, rot: !!o.rot });
  befehle(LEISTE, [
    { titel: 'Neu', knoepfe: [K('Auftrag', IC.neu, neuDialog, { tip: 'Neuer Honorarauftrag oder neues Angebot' })] },
    { titel: 'Ausgabe', rechts: true, knoepfe: [K(D && D.auftrag.status === 'angebot' ? 'Angebot' : 'Aufstellung', IC.pdf, pdf, { aus: !D, tip: 'Honorarangebot bzw. -aufstellung als PDF auf dem Briefbogen' })] },
    { titel: 'Bearbeiten', rechts: true, knoepfe: [K('Löschen', IC.weg, loeschen, { aus: !D, rot: true, tip: 'Auftrag in den Papierkorb legen' })] },
  ]);
}

/* Bereich rechts: Vorschau des Angebots wie im Bautagebuch (alle Seiten, BPHead.pdfIn) – nach jeder Änderung neu */
let PDFEL = null, PDFT = 0;
function vorschau(sofort) {
  clearTimeout(PDFT);
  if (!PDFEL || !PDFEL.isConnected) return;
  if (!D) { PDFEL.innerHTML = '<div class="ho-pleer">Kein Auftrag gewählt.</div>'; return; }
  PDFT = setTimeout(() => {
    PDFEL.innerHTML = `<div class="ho-pdf"><div class="ho-pk"><span class="mute">Vorschau – ${D.auftrag.status === 'angebot' ? 'Honorarangebot' : 'Honoraraufstellung'}</span><button type="button" class="btn sm" data-hopdf>↻ Neu laden</button></div><div class="ho-pdfs"></div></div>`;
    BPHead.pdfIn(PDFEL.querySelector('.ho-pdfs'), `api/auftraege/${AID}/angebot.pdf?t=${Date.now()}`);
  }, sofort ? 0 : 1200);
}
function bereich() {
  if (!window.seite || (typeof HANDY !== 'undefined' && HANDY.matches)) return;
  seite(WORK, 'ho', [{ id: 'pdf', titel: 'PDF', mount: (el) => { PDFEL = el; vorschau(true); } }], { start: 'pdf', w: 0.6, minL: 460 });
}
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-hopdf]')) vorschau(true); });

function zeichne() {
  if (typeof HANDY !== 'undefined' && HANDY.matches) return handyZeichne();   // Handy: eigene Ansicht (honorar-handy.js), nur ansehen
  nav(); leiste();
  if (!D) { V.innerHTML = `<div class="leer">Noch kein Honorarauftrag. Oben „Neu → Auftrag“: Projekt wählen, HOAI, nach Aufwand oder pauschal.</div>`; return; }
  const a = D.auftrag, k = D.rechnung;
  const seg = (feld, werte, wert) => `<span class="seg" role="group">${Object.entries(werte).map(([v, t]) => `<button type="button" data-seg="${feld}" data-v="${v}" class="${String(wert) === v ? 'on' : ''}">${esc(t)}</button>`).join('')}</span>`;
  const kopf = `<div class="ho-k"><div class="ho-f">
      <label class="w">Leistung<input data-f="name" value="${esc(a.name)}"></label>
      <label>Projekt<input value="${esc(D.projekt)}" disabled></label>
      <label>Auftraggeber<input data-f="auftraggeber" value="${esc(a.auftraggeber || '')}" placeholder="z. B. Bauherr"></label>
      <label>Datum<input type="date" data-f="datum" value="${esc(a.datum || '')}"></label></div>
    <div class="ho-f" style="margin-top:.6rem"><label>Art${seg('art', ART, a.art)}</label><label>Stand${seg('status', L.status, a.status)}</label></div></div>`;
  const warn = k.warnungen.length ? `<div class="ho-warn">${k.warnungen.map((w) => `<span>⚠ ${esc(w)}</span>`).join('')}</div>` : '';
  let haupt = '';
  if (a.art === 'hoai') {
    const sp = D.tafel;
    haupt = `<div class="ho-k"><h3>Grundlagen (HOAI 2021, Gebäude)</h3><div class="ho-f">
        <label>Anrechenbare Kosten (netto)<input class="z" data-f="kosten" value="${betrag(a.kosten)}" inputmode="decimal"></label>
        <button type="button" class="btn sm" data-kosten title="KG 300 + KG 400 der gültigen Kostenermittlung, KG 400 nach § 33 Abs. 2">Aus der Kostenermittlung</button>
        <label>Honorarzone${seg('zone', Object.fromEntries(L.zonen.map((z, i) => [String(i + 1), z])), a.zone)}</label>
        <label>Umbauzuschlag %<input class="p" data-f="umbau" value="${zahl(a.umbau)}" inputmode="decimal" title="§ 36: bei Umbauten und Modernisierungen bis 33 %, frei vereinbar"></label></div>
      ${a.kosten_info ? `<p class="mute" style="margin:.4rem 0 0;font-size:.82rem">${esc(a.kosten_info)}</p>` : ''}
      <div class="ho-f" style="margin-top:.7rem"><label style="flex:1">Honorarsatz <span class="ho-satz"><small>Basis</small><input type="range" min="0" max="100" step="5" data-f="satz" value="${a.satz}"><small>oben</small><b>${a.satz ? a.satz + ' %' : 'Basishonorarsatz'}</b></span></label>
        <label>Spanne Tafel<input value="${sp ? eur0(sp[0]) + ' – ' + eur0(sp[1]) : 'außerhalb der Tafel'}" disabled style="width:13rem"></label>
        <label>100 % der Leistungen<input value="${eur(k.grund)}" disabled style="width:10rem;text-align:right"></label></div></div>
      <div class="ho-k"><h3>Leistungsphasen (§ 34) und Aufwand laut Zeiten</h3><table class="ho-t"><thead><tr><th></th><th>Leistungsphase</th><th class="r">HOAI</th><th class="r">Vertrag %</th><th class="r">Honorar</th><th class="r">erbracht %</th><th class="r">Ist</th><th class="r">Ist-Kosten</th><th style="width:16%">Verbrauch</th></tr></thead><tbody>
      ${k.phasen.map((p) => { const v = p.honorar ? Math.min(100, p.ist_kosten / p.honorar * 100) : 0;
        return `<tr class="${p.an ? '' : 'aus'}" data-lph="${p.key}"><td><input type="checkbox" data-l="an"${p.an ? ' checked' : ''} aria-label="beauftragt"></td><td>LPh ${p.key.slice(3)} ${esc(p.name)}</td><td class="r">${zahl(p.vorgabe)} %</td>
          <td class="r"><input data-l="p" value="${zahl(p.p)}" inputmode="decimal"></td><td class="r">${eur(p.honorar)}</td><td class="r"><input data-l="erbracht" value="${zahl(p.erbracht)}" inputmode="decimal"></td>
          <td class="r">${std(p.ist_min)}</td><td class="r">${p.ist_kosten ? eur0(p.ist_kosten) : '–'}</td><td>${p.honorar ? `<div class="vb${p.ist_kosten > p.honorar ? ' ueber' : ''}" title="${Math.round(p.ist_kosten / p.honorar * 100)} % des Honorars"><i style="width:${v}%"></i></div>` : ''}</td></tr>`; }).join('')}
      </tbody><tfoot><tr><td></td><td>Summe</td><td class="r">${zahl(k.phasen.reduce((s, p) => s + (p.an ? p.vorgabe : 0), 0))} %</td><td class="r">${zahl(k.phasen.reduce((s, p) => s + (p.an ? p.p : 0), 0))} %</td><td class="r">${eur(k.summe_lph)}</td><td></td><td class="r">${std(k.ist_min)}</td><td class="r">${eur0(k.ist_kosten)}</td><td></td></tr></tfoot></table>
      <p class="mute" style="margin:.5rem 0 0;font-size:.8rem">Ist = bestätigte Zeiten aus „Zeiten“ für dieses Projekt je Leistungsphase; Kosten = Stunden × Stundensatz der Person (sonst Bürosatz${D.buero_satz ? ' ' + eur(D.buero_satz) + '/h' : ''}).</p></div>`;
  } else if (a.art === 'stunden') {
    const Z = Object.entries(D.zeiten);
    haupt = `<div class="ho-k"><h3>Abrechnung nach Aufwand</h3><div class="ho-f">
        <label>Abrechnung je angefangene<input class="p" data-f="einheit" value="${a.einheit}" inputmode="numeric"> </label><span class="mute" style="padding-bottom:.45rem">Minuten (15 = Viertelstunde)</span>
        <label>Stundensatz (€/h)<input class="z" data-f="satz_h" value="${betrag(a.satz_h)}" placeholder="je Person" inputmode="decimal"></label></div>
      <table class="ho-t" style="margin-top:.7rem"><thead><tr><th>Tätigkeit</th><th>Personen</th><th class="r">erfasst</th><th class="r">abgerechnet</th><th class="r">Betrag</th></tr></thead><tbody>
      ${Z.length ? Z.map(([art, z]) => `<tr><td>${esc((Object.fromEntries(L.arten || [])[art]) || art)}</td><td>${Object.entries(z.personen).map(([n, m]) => esc(n) + ' ' + std(m)).join(', ')}</td><td class="r">${std(z.min)}</td><td class="r">${std(z.abr_min)}</td><td class="r">${eur(z.abrechnung)}</td></tr>`).join('') : '<tr><td colspan="5" class="mute">Noch keine Zeiten für dieses Projekt erfasst.</td></tr>'}
      </tbody></table></div>`;
  } else {
    haupt = `<div class="ho-k"><h3>Pauschalhonorar</h3><div class="ho-f"><label>Betrag (netto)<input class="z" data-f="pauschal" value="${betrag(a.pauschal)}" inputmode="decimal"></label>
      <span class="mute" style="padding-bottom:.45rem">Aufwand laut Zeiten bisher: ${std(k.ist_min)} · ${eur0(k.ist_kosten)}</span></div></div>`;
  }
  const fahrt = D.zeiten.fahrt;
  const nk = `<div class="ho-k"><h3>Nebenkosten (§ 14)</h3><div class="ho-f"><label>Abrechnung${seg('nkart', { pauschal: 'pauschal', aufwand: 'nach Aufwand' }, a.nk.art)}</label>
      ${a.nk.art === 'pauschal' ? `<label>Prozent vom Honorar<input class="p" data-f="nkp" value="${zahl(a.nk.p)}" inputmode="decimal"></label>` : ''}</div>
    ${a.nk.art === 'aufwand' ? `<table class="ho-t" style="margin-top:.6rem"><thead><tr><th>Datum</th><th>Art</th><th>Text</th><th class="r">Betrag</th><th></th></tr></thead><tbody>
      ${D.nk_liste.map((n) => `<tr><td>${esc(n.datum)}</td><td>${esc(NKART[n.art] || n.art)}</td><td>${esc(n.text)}</td><td class="r">${eur(n.betrag)}</td><td class="r"><button type="button" class="btn sm" data-nkweg="${n.id}" title="Entfernen">✕</button></td></tr>`).join('')}
      <tr><td><input type="date" id="nkD" style="width:9rem;text-align:left"></td><td><select id="nkA">${Object.entries(NKART).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></td>
        <td><input id="nkT" placeholder="z. B. Plotauftrag 12 Pläne A1" style="width:100%;text-align:left"></td><td class="r"><input id="nkB" inputmode="decimal" style="width:6rem"></td><td class="r"><button type="button" class="btn sm pri" data-nkneu>＋</button></td></tr>
      </tbody></table>${fahrt ? `<p class="mute" style="font-size:.8rem;margin:.4rem 0 0">Fahrzeit laut Zeiten: ${std(fahrt.min)} (${eur0(fahrt.kosten)} zum Stundensatz) – bei Bedarf als Fahrt eintragen.</p>` : ''}` : ''}</div>`;
  const sum = `<div class="ho-k"><h3>Summe</h3><div class="ho-sum">
      <span>${a.art === 'stunden' ? 'Aufwand (abgerechnet)' : a.art === 'pauschal' ? 'Pauschalhonorar' : 'Leistungsphasen'}</span><b>${eur(k.summe_lph)}</b>
      ${k.umbau ? `<span>Umbauzuschlag ${zahl(a.umbau)} %</span><b>${eur(k.umbau)}</b>` : ''}
      <span>Nebenkosten</span><b>${eur(k.nk)}</b><span class="tr"></span>
      <span>Honorar netto</span><b class="gr">${eur(k.netto)}</b><span>zzgl. ${zahl(L.mwst)} % USt.</span><b>${eur(k.mwst)}</b><span>Honorar brutto</span><b>${eur(k.brutto)}</b>
      ${a.art === 'hoai' ? `<span class="tr"></span><span>erbracht (nach „erbracht %“)</span><b>${eur(k.erbracht)}</b>` : ''}
      <span>Aufwand laut Zeiten</span><b>${std(k.ist_min)} · ${eur0(k.ist_kosten)}</b></div></div>
    <div class="ho-k"><h3>Text im Angebot</h3><div class="ho-f"><textarea class="w" data-f="notiz" rows="4" placeholder="z. B. Leistungsumfang, Zahlungsbedingungen, Gültigkeit des Angebots">${esc(a.notiz || '')}</textarea></div></div>`;
  const pos = V.scrollTop;
  V.innerHTML = `<div class="ho-w">${kopf}${warn}${haupt}${nk}${sum}</div>`;
  V.scrollTop = pos;
  if (!WORK.querySelector(':scope > .sr-r')) bereich();
  vorschau(VID !== AID);
  VID = AID;
}
let VID = null;   // für welchen Auftrag die Vorschau zuletzt gezeichnet wurde (Wechsel: sofort, Änderung: kurz warten)

/* Speichern mit Rückgängig: der alte Stand des Felds wird gemerkt */
async function setzen(werte, text) {
  const a = D.auftrag, alt = {};
  Object.keys(werte).forEach((k) => { alt[k] = JSON.parse(JSON.stringify(a[k] ?? null)); });
  try { D = await api('api/auftraege/' + AID, 'PUT', werte); } catch (e) { toast(e.message, true); return; }
  const id = AID;
  rueckgaengig(text || 'Honorarauftrag geändert', async () => { D = await api('api/auftraege/' + id, 'PUT', alt); AID = id; await laden(); }, 10000, async () => { D = await api('api/auftraege/' + id, 'PUT', werte); AID = id; await laden(); });
  const s = L.auftraege.find((x) => x.id === AID);
  if (s && ('name' in werte || 'status' in werte || 'art' in werte)) { await laden(); return; }
  zeichne();
}

V.addEventListener('click', async (e) => {
  const s = e.target.closest('[data-seg]');
  if (s) {
    const f = s.dataset.seg, v = s.dataset.v;
    if (f === 'nkart') return setzen({ nk: { ...D.auftrag.nk, art: v } }, 'Nebenkosten ' + (v === 'pauschal' ? 'pauschal' : 'nach Aufwand'));
    return setzen({ [f]: f === 'zone' ? +v : v }, { art: 'Art', status: 'Stand', zone: 'Honorarzone' }[f] + ' geändert');
  }
  if (e.target.closest('[data-kosten]')) {
    try { const r = await api(`api/auftraege/${AID}/kosten`); await setzen({ kosten: r.betrag, kosten_info: r.info }, 'Anrechenbare Kosten übernommen'); toast('Anrechenbare Kosten übernommen.'); }
    catch (er) { toast(er.message, true); }
    return;
  }
  if (e.target.closest('[data-nkneu]')) {
    const b = $('#nkB').value; if (!b) { toast('Bitte einen Betrag eingeben.', true); return; }
    try { D = await api(`api/auftraege/${AID}/nk`, 'POST', { datum: $('#nkD').value, art: $('#nkA').value, text: $('#nkT').value, betrag: b }); zeichne(); } catch (er) { toast(er.message, true); }
    return;
  }
  const nw = e.target.closest('[data-nkweg]');
  if (nw) {
    const n = D.nk_liste.find((x) => x.id === +nw.dataset.nkweg), id = AID;
    try { D = await api('api/nk/' + nw.dataset.nkweg, 'DELETE'); zeichne(); } catch (er) { toast(er.message, true); return; }
    if (n) rueckgaengig('Nebenkosten entfernt', async () => { D = await api(`api/auftraege/${id}/nk`, 'POST', n); AID = id; zeichne(); });
  }
});
V.addEventListener('change', (e) => {
  const t = e.target, f = t.dataset.f;
  if (f === 'nkp') return setzen({ nk: { ...D.auftrag.nk, p: t.value } }, 'Nebenkosten-Prozent geändert');
  if (f) return setzen({ [f]: t.type === 'range' ? +t.value : t.value }, `„${(t.closest('label') || {}).firstChild?.textContent?.trim() || 'Feld'}“ geändert`);
  const z = t.closest('[data-lph]');
  if (z && t.dataset.l) {
    const lph = JSON.parse(JSON.stringify(D.auftrag.lph)), k = z.dataset.lph;
    lph[k][t.dataset.l] = t.type === 'checkbox' ? t.checked : t.value;
    return setzen({ lph }, `LPh ${k.slice(3)} geändert`);
  }
});
V.addEventListener('input', (e) => { if (e.target.type === 'range') { const b = e.target.parentElement.querySelector('b'); if (b) b.textContent = +e.target.value ? e.target.value + ' %' : 'Basishonorarsatz'; } });

function neuDialog() {
  const P = L.projekte;
  if (!P.length) { toast('Es gibt noch kein Projekt.', true); return; }
  const gp = (window.BPHead && BPHead.projekt && BPHead.projekt.id) || P[0].id;
  modalBox(`<h3>Neuer Honorarauftrag</h3>
    <div class="row"><label>Projekt</label><select id="nP">${P.map((p) => `<option value="${p.id}"${p.id === gp ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
    <div class="row"><label>Art</label><select id="nA"><option value="hoai">nach HOAI (Leistungsphasen)</option><option value="stunden">nach Aufwand (Stunden)</option><option value="pauschal">pauschal</option></select></div>
    <div class="row"><label>Leistung</label><input id="nN" placeholder="leer = Vorschlag, z. B. „Architektenleistungen LPh 1–9“"></div>
    <div class="acts"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Anlegen</button></div>`,
  async (m, bg, close) => {
    if (m !== 'ok') { close(); return; }
    try { const d = await api('api/auftraege', 'POST', { project_id: +bg.querySelector('#nP').value, art: bg.querySelector('#nA').value, name: bg.querySelector('#nN').value });
      close(); await laden(d.auftrag.id); } catch (e) { toast(e.message, true); }
  });
}

function pdf() {
  if (!D) return;
  const w = window.open('api/auftraege/' + AID + '/angebot.pdf', '_blank'); if (!w) location.href = 'api/auftraege/' + AID + '/angebot.pdf';
}

async function loeschen() {
  if (!D || !(await bpFrage(`„${D.auftrag.name}“ in den Papierkorb legen?`, { ok: 'Löschen' }))) return;
  try {
    const r = await api('api/auftraege/' + AID, 'DELETE'), name = D.auftrag.name;
    AID = null; await laden();
    if (r.papierkorb) rueckgaengig(`„${name}“ gelöscht`, async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); await laden(); });
  } catch (e) { toast(e.message, true); }
}

(async () => {
  ME = await api('api/me'); applyLook(ME);
  const PC = await api('api/platform');
  await header('Honorar', ME, PC);
  bpNav.breite(NAV, { key: 'honorar' });
  await laden();
})().catch((e) => toast(e.message, true));
