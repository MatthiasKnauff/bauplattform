'use strict';
/* Bauantrag – Seite der App. Links die Anträge je Projekt (bpNav), oben die Befehlsleiste (befehle), in der Mitte der Assistent in
   sechs Schritten, rechts das PDF (seite.js). Jeder Wert zeigt seine Quelle (Projekt, Adressen, Kataster, Baukosten, Büro, Mein Konto);
   von Hand geänderte Werte lassen sich mit ↺ auf die Quelle zurücksetzen. Jede Änderung wird sofort gespeichert (Rückgängig-Dock).
   Server: plattform/bauantrag.py, Felder und PDF: bpcore/bauantrag.py. */
let ME = null, L = null, D = null, AID = null, SCHRITT = 'verfahren', FORM = null;   // FORM: Ansicht „Amtliche Formulare“ (sonst der Antrag)
const NAV = $('#navL'), LEISTE = $('#bfl'), V = $('#view'), WORK = $('#work');
const HANDY = matchMedia('(max-width: 820px)');
const IC = { neu: '<path d="M12 5v14M5 12h14"/>', pdf: '<path d="M6 3h9l4 4v14H6zM14 3v5h5"/><path d="M9 13h6M9 17h4"/>', weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  antrag: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12l2 2 4-4"/>', ord: '<path d="M3 7h6l2 2h10v10H3z"/><path d="M12 12v5M9.5 14.5 12 17l2.5-2.5"/>' };
const STATUS = { entwurf: 'Entwurf', eingereicht: 'eingereicht', genehmigt: 'genehmigt' };
const BV_ST = { da: 'liegt vor', offen: 'fehlt', entfaellt: 'entfällt' };
const BREIT = new Set(['bauherr_name', 'bauherr_anschrift', 'ev_name', 'ev_anschrift', 'gs_strasse', 'behoerde', 'bplan', 'tragwerk', 'nutzung']);   // zwei Spalten breit

async function laden(aid) {
  L = await api('api/antraege');
  if (aid !== undefined) AID = aid;
  if (AID && !L.antraege.some((a) => a.id === AID)) AID = null;
  if (!AID && L.antraege.length) AID = L.antraege[0].id;
  D = AID ? await api('api/antraege/' + AID) : null;
  zeichne();
}

function nav() {
  const G = {};
  L.antraege.forEach((a) => { (G[a.projekt || '–'] = G[a.projekt || '–'] || []).push(a); });
  bpNav(NAV, {
    kopf: { titel: 'Bauantrag', klein: `${L.antraege.length} Antr${L.antraege.length === 1 ? 'ag' : 'äge'}` },
    gruppen: Object.keys(G).sort((x, y) => x.localeCompare(y, 'de')).map((p) => ({ titel: p, punkte: G[p].map((a) => ({
      id: String(a.id), text: a.name, icon: IC.antrag, farbe: a.status === 'genehmigt' ? 'var(--ok,#1e8a4c)' : a.status === 'eingereicht' ? 'var(--y)' : 'var(--mute)',
      zahl: a.status === 'entwurf' ? '' : (STATUS[a.status] || '').slice(0, 4) + '.', zahlTip: STATUS[a.status] || '' })) })),
    aktiv: AID ? String(AID) : '', attr: 'ba', lage: true,
    wahl: async (id) => { FORM = null; AID = +id; D = await api('api/antraege/' + AID); zeichne(); },
  });
}

function leiste() {
  const K = (t, ic, fn, o = {}) => ({ t, ic, fn, tip: o.tip || t, aus: !!o.aus, rot: !!o.rot });
  befehle(LEISTE, [
    { titel: 'Neu', knoepfe: [K('Antrag', IC.neu, neuDialog, { tip: 'Neuer Bauantrag, Vorbescheid oder Freistellung' })] },
    { titel: 'Bauvorlagen', knoepfe: [K('Neu erkennen', IC.ord, async () => { D = await api('api/antraege/' + AID + '?neu=1'); zeichne(); toast('Projektordner neu eingelesen.'); },
      { aus: !D, tip: 'Projektordner neu einlesen und die Bauvorlagen erkennen' })] },
    { titel: 'Amtlich', knoepfe: [K('Formulare', IC.antrag, () => formulareZeigen('NW'), { tip: 'Amtliche Vordrucke (NRW vorgehalten, andere Länder auf Abruf) – neue Fassungen werden gemeldet' })] },
    { titel: 'Ausgabe', rechts: true, knoepfe: [K('PDF', IC.pdf, pdf, { aus: !D, tip: 'Antrag als PDF (eigenes Layout, angelehnt an die Bauvorlagen NRW)' })] },
    { titel: 'Bearbeiten', rechts: true, knoepfe: [K('Löschen', IC.weg, loeschen, { aus: !D, rot: true, tip: 'Antrag in den Papierkorb legen' })] },
  ]);
}

/* Bereich rechts: PDF-Vorschau, nach jeder Änderung neu */
let PDFEL = null, PDFT = 0;
function vorschau(sofort) {
  clearTimeout(PDFT);
  if (!PDFEL || !PDFEL.isConnected) return;
  if (!D) { PDFEL.innerHTML = '<div class="ba-pleer">Kein Antrag gewählt.</div>'; return; }
  PDFT = setTimeout(() => {
    PDFEL.innerHTML = `<div class="ba-pdf"><div class="ba-pk"><span class="mute">Vorschau – ${esc(D.antrag.name)}</span><button type="button" class="btn sm" data-bapdf>↻ Neu laden</button></div><div class="ba-pdfs"></div></div>`;
    BPHead.pdfIn(PDFEL.querySelector('.ba-pdfs'), `api/antraege/${AID}/antrag.pdf?t=${Date.now()}`);
  }, sofort ? 0 : 1200);
}
function bereich() {
  if (!window.seite || HANDY.matches) return;
  seite(WORK, 'ba', [{ id: 'pdf', titel: 'PDF', mount: (el) => { PDFEL = el; vorschau(true); } }], { start: 'pdf', w: 0.5, minL: 520 });
}
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-bapdf]')) vorschau(true); });

const feld = (k) => D.felder.find((f) => f.key === k);
function fehltIn(s) { return D.felder.filter((f) => f.schritt === s && f.pflicht && !String(f.wert).trim()).length; }

/* Gebäudeklasse als Skizze (§ 2 Abs. 3 BauO NRW 2018): Höhe = Fußboden des obersten Geschosses mit Aufenthaltsraum über Gelände im Mittel */
const GK = [['1', 'freistehend, ≤ 7 m, höchstens 2 Nutzungseinheiten mit zusammen ≤ 400 m² (auch freistehende Land-/Forstwirtschaft)', 'freistehend · ≤ 7 m · ≤ 2 NE, ≤ 400 m²'],
  ['2', 'nicht freistehend, ≤ 7 m, höchstens 2 Nutzungseinheiten mit zusammen ≤ 400 m²', '≤ 7 m · ≤ 2 NE, ≤ 400 m²'], ['3', 'sonstige Gebäude ≤ 7 m', 'sonstige · ≤ 7 m'],
  ['4', '≤ 13 m, jede Nutzungseinheit ≤ 400 m²', '≤ 13 m · NE je ≤ 400 m²'], ['5', 'sonstige Gebäude, auch über 13 m und unterirdische', 'sonstige · über 13 m']];
function gkSkizze(n) {   // y: Gelände 92, 7 m ≈ y 52, 13 m ≈ y 18
  const haus = (x, w, top, dach = true) => `<rect x="${x}" y="${top}" width="${w}" height="${92 - top}" fill="var(--card)" stroke="currentColor" stroke-width="1.6"/>${dach ? `<path d="M${x - 3} ${top}L${x + w / 2} ${top - 12}L${x + w + 3} ${top}" fill="none" stroke="currentColor" stroke-width="1.6"/>` : ''}`;
  const fl = (x, w, ys) => ys.map((y) => `<path d="M${x} ${y}h${w}" stroke="currentColor" stroke-width=".7" opacity=".5"/>`).join('');
  const b = { 1: haus(38, 34, 60) + fl(38, 34, [76]), 2: haus(24, 30, 60) + haus(54, 30, 60) + fl(24, 60, [76]), 3: haus(18, 74, 58, false) + fl(18, 74, [70, 81]),
    4: haus(30, 50, 26, false) + fl(30, 50, [37, 48, 59, 70, 81]), 5: haus(36, 38, 4, false) + fl(36, 38, [13, 22, 31, 40, 49, 58, 67, 76, 84]) }[n];
  return `<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M4 52h112" stroke="var(--y)" stroke-dasharray="3 3" stroke-width=".9"/><text x="116" y="49" font-size="7" text-anchor="end" fill="var(--y)">7 m</text>
    <path d="M4 18h112" stroke="var(--warn,#b7791f)" stroke-dasharray="3 3" stroke-width=".9"/><text x="116" y="15" font-size="7" text-anchor="end" fill="var(--warn,#b7791f)">13 m</text>${b}<path d="M2 92h116" stroke="currentColor" stroke-width="2"/></svg>`;
}
function feldHtml(f) {
  if (f.key === 'gebaeudeklasse') {
    const w = String(f.wert ?? ''), q = f.ziel ? `<span class="ba-q sync" title="Kommt aus „${esc(f.ziel)}“ – eine Änderung hier wird dort gespeichert">⇄ ${esc(f.ziel)}</span>` : '';
    return `<div class="ba-f w${!w ? ' leer' : ''}"><span>${esc(f.label)} <i>*</i>${q}</span><div class="ba-gk" role="group" aria-label="Gebäudeklasse">${GK.map(([n, t, k]) => `<button type="button" data-seg="gebaeudeklasse" data-v="${n}" class="${w === n ? 'on' : ''}" title="${esc(t)}">${gkSkizze(n)}<b>GK ${n}</b><small>${esc(k)}</small></button>`).join('')}</div>
      <span class="ba-hilfe">Höhe = Fußboden des obersten Geschosses mit Aufenthaltsraum über Gelände im Mittel (§ 2 Abs. 3 BauO NRW) · NE = Nutzungseinheit</span></div>`;
  }
  const w = String(f.wert ?? ''), leer = f.pflicht && !w.trim();
  const tip = f.ziel ? `Kommt aus „${f.ziel}“ – eine Änderung hier wird dort gespeichert und gilt überall` : f.eigen && f.quelle_name ? 'Nur in diesem Antrag geändert · Quelle: ' + f.quelle_name + (f.quelle_wert ? ' – „' + f.quelle_wert + '“' : '') : 'Nur in diesem Antrag';
  const q = f.quelle || f.ziel ? `<span class="ba-q${f.eigen ? ' eigen' : ''}${f.ziel ? ' sync' : ''}" title="${esc(tip)}">${f.ziel ? '⇄ ' + esc(f.ziel) : esc(f.quelle)}</span>` : '';
  const zur = f.eigen && f.quelle_name ? `<button type="button" class="ba-r" data-zurueck="${f.key}" title="Wert aus „${esc(f.quelle_name)}“ wieder übernehmen">↺</button>` : '';
  const kopf = `<span>${esc(f.label)}${f.pflicht ? ' <i>*</i>' : ''}${q}${zur}</span>`;
  let ein;
  if (f.typ === 'select' || f.typ === 'wahl') {
    const O = f.optionen.map((o) => (Array.isArray(o) ? o : [o, o || '–']));
    ein = `<span class="seg" role="group">${O.map(([v, t]) => `<button type="button" data-seg="${f.key}" data-v="${esc(v)}" class="${w === v ? 'on' : ''}">${esc(t)}</button>`).join('')}</span>`;
  } else if (f.typ === 'textarea') ein = `<textarea data-f="${f.key}">${esc(w)}</textarea>`;
  else ein = `<input data-f="${f.key}" value="${esc(f.typ === 'eur' && w ? (+w).toLocaleString('de-DE') : w)}"${f.typ === 'zahl' || f.typ === 'eur' ? ' class="z" inputmode="decimal"' : ''}${f.hilfe ? ` placeholder="${esc(f.hilfe)}"` : ''}>`;
  const breit = f.typ === 'textarea' || (f.typ === 'select' && f.optionen.length > 5) ? ' w' : BREIT.has(f.key) ? ' w2' : '';
  return `<label class="ba-f${breit}${leer ? ' leer' : ''}">${kopf}${ein}</label>`;
}
const gruppe = (titel, keys, extra = '') => { const z = [...new Set(keys.map((k) => feld(k).ziel).filter(Boolean))];
  return `<div class="ba-k"><h3>${titel}${z.length ? `<span class="mute">⇄ gespeichert in ${esc(z.join(', '))}</span>` : ''}</h3>${extra}<div class="ba-g">${keys.map((k) => feldHtml(feld(k))).join('')}</div></div>`; };

function schrittHtml() {
  const S = SCHRITT;
  if (S === 'verfahren') return gruppe('Verfahren', ['verfahren', 'verfahrensart', 'behoerde'])
    + `<div class="ba-k"><h3>Bezeichnung</h3><div class="ba-g"><label class="ba-f w"><span>Name des Antrags (nur hier in der Liste)</span><input data-name value="${esc(D.antrag.name)}"></label></div></div>`;
  if (S === 'beteiligte') {
    const ew = String(feld('ev_wahl').wert || 'buero');
    return gruppe('Bauherrschaft', ['bauherr_name', 'bauherr_vertreter', 'bauherr_anschrift', 'bauherr_tel', 'bauherr_mail'])
      + gruppe('Entwurfsverfasser/in', ['ev_name', 'ev_beruf', 'ev_kammer', 'ev_kammernr', 'ev_anschrift', 'ev_tel', 'ev_mail'],
        `<div class="ba-ev">Angaben aus <span class="seg" role="group"><button type="button" data-seg="ev_wahl" data-v="persoenlich" class="${ew === 'persoenlich' ? 'on' : ''}">Mein Konto (persönlich)</button><button type="button" data-seg="ev_wahl" data-v="buero" class="${ew === 'buero' ? 'on' : ''}">Büro</button></span>
          <span class="ba-hilfe">Vorauswahl: persönlich, wenn in „Mein Konto“ bauvorlageberechtigt mit Kammernummer eingetragen ist – sonst das Büro (Verwaltung → Büro).</span></div>`)
      + gruppe('Weitere Beteiligte', ['tragwerk']);
  }
  if (S === 'grundstueck') return gruppe('Lage', ['gs_strasse', 'gs_ort', 'gemarkung', 'flur', 'flurstueck', 'gs_flaeche'])
    + gruppe('Planungsrecht', ['bplan', 'gebiet', 'baulasten', 'denkmal']);
  if (S === 'vorhaben') return gruppe('Vorhaben', ['bezeichnung', 'art', 'gebaeudeklasse', 'sonderbau', 'nutzung'])
    + gruppe('Kenndaten', ['grf', 'bgf', 'bri', 'nrf', 'grz', 'gfz', 'geschosse', 'hoehe', 'we', 'st_notw', 'st_nachg'])
    + gruppe('Kosten', ['rohbau', 'herstellung'], '<p class="ba-hilfe" style="margin:-.3rem 0 .6rem">Aus der gültigen Kostenermittlung: Rohbau ≈ KG 300, Herstellung = KG 300 + 400 (netto). Bitte prüfen – die Bauaufsicht rechnet damit die Gebühr.</p>');
  if (S === 'bauvorlagen') return `<div class="ba-k"><h3>Bauvorlagen<span class="mute">erkannt aus dem Projektordner (Dateinamen) – Stand jederzeit von Hand änderbar</span></h3>
    <table class="ba-t"><thead><tr><th>Unterlage</th><th>Stand</th></tr></thead><tbody>
    ${D.bauvorlagen.map((b) => `<tr><td>${esc(b.name)}${b.pflicht ? '' : ' <span class="mute">(falls nötig)</span>'}
        ${b.dateien.length ? `<div class="dat">${b.dateien.map((x) => `<span>📄 ${esc(x.name)}</span>`).join('')}</div>` : ''}
        ${b.key === 'antrag' ? '<div class="dat">wird hier erstellt</div>' : ''}</td>
      <td>${b.key === 'antrag' ? '<span class="mute">–</span>' : `<span class="seg" role="group">${Object.entries(BV_ST).map(([v, t]) => `<button type="button" data-bv="${b.key}" data-v="${v}" class="${b.status === v ? 'on' : ''}">${t}</button>`).join('')}</span>${b.auto ? ' <span class="ba-q" title="Anhand der Dateinamen erkannt">erkannt</span>' : ''}`}</td></tr>`).join('')}
    </tbody></table></div>`;
  // Prüfen & PDF
  const ff = D.fehlt.felder, fb = D.fehlt.bauvorlagen;
  const wo = (label) => (D.felder.find((f) => f.label === label) || {}).schritt;
  return `<div class="ba-k"><h3>Prüfen</h3><div class="ba-pf">
      ${ff.length ? ff.map((l) => `<span class="fe">● ${esc(l)} fehlt – <a data-geh="${wo(l)}">${esc((D.schritte.find((s) => s[0] === wo(l)) || [])[1] || '')}</a></span>`).join('') : '<span class="ok">✓ Alle Pflichtangaben sind ausgefüllt.</span>'}
      ${fb.length ? fb.map((n) => `<span class="fe">● Bauvorlage „${esc(n)}“ fehlt – <a data-geh="bauvorlagen">Bauvorlagen</a></span>`).join('') : '<span class="ok">✓ Alle nötigen Bauvorlagen liegen vor oder entfallen.</span>'}
    </div></div>
    <div class="ba-k"><h3>Stand</h3><span class="seg" role="group">${Object.entries(STATUS).map(([v, t]) => `<button type="button" data-status="${v}" class="${D.antrag.status === v ? 'on' : ''}">${t}</button>`).join('')}</span>
      <p class="ba-hilfe" style="margin:.5rem 0 0">Solange „Entwurf“, trägt das PDF den Aufdruck ENTWURF. „eingereicht“ sperrt die Angaben (zum Ändern zurück auf „Entwurf“).</p></div>
    <div class="ba-k"><h3>PDF</h3><button type="button" class="btn pri" data-pdf>📄 Antrag als PDF</button>
      <p class="ba-hilfe" style="margin:.5rem 0 0">Eigenes Layout, angelehnt an die Bauvorlagen NRW. Das amtliche, ausfüllbare Formular des Landes folgt, sobald die PDFs dafür hochgeladen sind.</p></div>`;
}

function zeichne() {
  nav(); leiste();
  if (FORM) { V.innerHTML = formHtml(); return; }
  if (!D) { V.innerHTML = '<div class="leer">Noch kein Bauantrag. Oben „Neu → Antrag“: Projekt wählen – alles, was die Plattform schon weiß, wird eingetragen.</div>'; bereich(); vorschau(true); return; }
  const st = D.schritte.map(([k, t], i) => { const n = k === 'bauvorlagen' ? D.fehlt.bauvorlagen.length : k === 'pruefen' ? D.fehlt.felder.length + D.fehlt.bauvorlagen.length : fehltIn(k);
    return `<button type="button" data-schritt="${k}" class="${k === SCHRITT ? 'on' : ''} ${n ? 'fehlt' : 'ok'}"><b>${i + 1} ${esc(t)}</b><small>${n ? n + ' offen' : '✓ vollständig'}</small></button>`; }).join('');
  const i = D.schritte.findIndex((s) => s[0] === SCHRITT), vor = D.schritte[i - 1], nach = D.schritte[i + 1];
  const top = V.scrollTop;
  V.innerHTML = `<div class="ba-w"><div class="ba-st" role="tablist">${st}</div>${schrittHtml()}
    <div class="ba-nav"><span>${vor ? `<button type="button" class="btn" data-geh="${vor[0]}">‹ ${esc(vor[1])}</button>` : ''}</span><span>${nach ? `<button type="button" class="btn pri" data-geh="${nach[0]}">${esc(nach[1])} ›</button>` : ''}</span></div></div>`;
  V.scrollTop = top;
  if (D.antrag.status !== 'entwurf') V.querySelectorAll('[data-f],[data-seg],[data-bv],[data-zurueck]').forEach((x) => { x.disabled = true; });
  bereich(); vorschau();
}

/* Speichern: Felder einzeln, mit Rückgängig auf den vorherigen Stand (eigener Wert oder Quelle) */
async function setze(felder, text) {
  const alt = {};
  Object.keys(felder).forEach((k) => { const f = feld(k); alt[k] = f && (f.eigen || f.ziel) ? f.wert : null; });   // mit Ziel: alten Wert dort zurückschreiben
  try {
    D = await api('api/antraege/' + AID, 'PUT', { felder }); zeichne();
    rueckgaengig(text, async () => { D = await api('api/antraege/' + AID, 'PUT', { felder: alt }); zeichne(); });
  } catch (e) { toast(e.message, true); }
}
V.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.f) { const f = feld(t.dataset.f); let v = t.value.trim(); if (f.typ === 'eur') v = v.replace(/\./g, '').replace(',', '.');
    if (v === String(f.wert)) return; setze({ [f.key]: v }, `„${f.label}“ geändert`); }
  else if (t.dataset.name !== undefined) { try { D = await api('api/antraege/' + AID, 'PUT', { name: t.value }); L = await api('api/antraege'); zeichne(); } catch (er) { toast(er.message, true); } }
});
V.addEventListener('click', async (e) => {
  const b = e.target.closest('button,a'); if (!b) return;
  if (b.dataset.schritt || b.dataset.geh) { SCHRITT = b.dataset.schritt || b.dataset.geh; V.scrollTop = 0; zeichne(); return; }
  if (b.dataset.seg) { const f = feld(b.dataset.seg); if (b.classList.contains('on')) return;
    const mehr = b.dataset.seg === 'ev_wahl' ? { ev_name: null, ev_beruf: null, ev_kammer: null, ev_kammernr: null, ev_tel: null, ev_mail: null } : {};
    setze({ [b.dataset.seg]: b.dataset.v, ...mehr }, `„${f.label}“: ${b.textContent}`); return; }
  if (b.dataset.zurueck) { const f = feld(b.dataset.zurueck); setze({ [f.key]: null }, `„${f.label}“ aus „${f.quelle_name}“ übernommen`); return; }
  if (b.dataset.bv) { const alt = D.bauvorlagen.find((x) => x.key === b.dataset.bv);
    try { D = await api('api/antraege/' + AID, 'PUT', { bauvorlagen: { [b.dataset.bv]: { status: b.dataset.v } } }); zeichne();
      rueckgaengig(`„${alt.name}“: ${BV_ST[b.dataset.v]}`, async () => { D = await api('api/antraege/' + AID, 'PUT', { bauvorlagen: { [alt.key]: alt.auto ? null : { status: alt.status } } }); zeichne(); });
    } catch (er) { toast(er.message, true); } return; }
  if (b.dataset.status) { const alt = D.antrag.status;
    try { D = await api('api/antraege/' + AID, 'PUT', { status: b.dataset.status }); L = await api('api/antraege'); zeichne();
      rueckgaengig(`Stand: ${STATUS[b.dataset.status]}`, async () => { D = await api('api/antraege/' + AID, 'PUT', { status: alt }); L = await api('api/antraege'); zeichne(); });
    } catch (er) { toast(er.message, true); } return; }
  if (b.dataset.pdf !== undefined) pdf();
});

/* ---------- Amtliche Formulare: Liste je Land, Stand der Prüfung, neu/geändert mit „gesehen“, ansehen ---------- */
async function formulareZeigen(land, pruefen) {
  try { FORM = pruefen ? await api('api/formulare/pruefen', 'POST', { land }) : await api('api/formulare?land=' + land); }
  catch (e) { toast(e.message, true); return; }
  if (pruefen && FORM.ergebnis) { const r = FORM.ergebnis; toast(r.fehler ? r.fehler : `Geprüft: ${r.neu.length} neu, ${r.geaendert.length} geändert${r.entfallen.length ? `, ${r.entfallen.length} entfallen` : ''}.`, !!r.fehler); }
  zeichne();
}
const ST_FORM = { neu: ['neu', 'warn'], geaendert: ['neue Fassung', 'warn'], entfallen: ['entfallen', 'mute'], aktuell: ['', ''] };
function formHtml() {
  const F = FORM, st = F.stand || {}, de = (t) => (t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}${t.length > 11 ? ' ' + t.slice(11, 16) : ''}` : '–');
  const laender = Object.entries(F.laender).sort((a, b) => (a[0] === 'NW' ? -1 : b[0] === 'NW' ? 1 : a[1].localeCompare(b[1], 'de')));
  const kopf = `<div class="ba-k"><h3>Amtliche Formulare<span class="mute">${F.vorhalten ? 'werden vorgehalten und täglich geprüft' : 'auf Abruf – nur verlinkt'}</span></h3>
    <div class="ba-fk"><label class="ba-f"><span>Bundesland</span><select data-formland data-bp-auswahl aria-label="Bundesland">${laender.map(([k, n]) => `<option value="${k}"${k === F.land ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <div class="ba-fs"><span>Fassung: <b>${esc(st.fassung || '–')}</b></span><span>zuletzt geprüft: <b>${de(st.geprueft)}</b></span>${F.quelle ? `<a href="${esc(st.seite || F.quelle)}" target="_blank" rel="noopener">Quelle öffnen ↗</a>` : ''}</div>
      <button type="button" class="btn pri" data-formpruefen${F.quelle ? '' : ' disabled'}>↻ Jetzt prüfen</button>${!F.vorhalten && F.admin ? '<button type="button" class="btn" data-formquelle>Quelle eintragen …</button>' : ''}</div>
    ${st.fehler ? `<p class="ba-hilfe" style="color:var(--red)">⚠ ${esc(st.fehler)}</p>` : ''}
    ${!F.quelle ? `<p class="ba-hilfe">Für ${esc(F.laender[F.land])} ist noch keine Seite mit den Vordrucken eingetragen${F.admin ? ' – „Quelle eintragen …“, z. B. die Seite des Bauministeriums mit den Bauvorlagen.' : ' – das macht die Verwaltung.'}</p>` : ''}</div>`;
  const L = F.formulare || [], n = L.filter((x) => x.status === 'neu' || x.status === 'geaendert').length;
  const liste = L.length ? `<div class="ba-k"><h3>${L.filter((x) => x.status !== 'entfallen').length} Formulare${n ? `<span class="mute" style="color:var(--warn)">${n} neu oder geändert</span>` : ''}</h3>
    <div class="tw"><table class="ba-t"><thead><tr><th>Anlage</th><th>Titel</th><th>Stand</th><th></th></tr></thead><tbody>
    ${L.map((x) => { const [t, c] = ST_FORM[x.status] || ['', '']; return `<tr class="${x.status === 'entfallen' ? 'aus' : ''}"><td style="white-space:nowrap">${esc(x.nr || '–')}</td><td>${esc(x.titel)}</td>
      <td style="white-space:nowrap">${t ? `<span class="ba-q" style="${c === 'warn' ? 'color:var(--warn);border-color:var(--warn)' : ''}">${t}</span> ` : ''}<small class="mute">${esc(x.fassung || de(x.geaendert).slice(0, 10))}</small></td>
      <td style="white-space:nowrap;text-align:right">${x.status === 'neu' || x.status === 'geaendert' ? `<button type="button" class="btn sm" data-formgesehen="${x.id}">✓ gesehen</button> ` : ''}<button type="button" class="btn sm" data-formansehen="${x.id}">Ansehen</button></td></tr>`; }).join('')}
    </tbody></table></div></div>` : (F.quelle ? '<div class="ba-k"><p class="mute" style="margin:0">Noch nicht geprüft – „↻ Jetzt prüfen“.</p></div>' : '');
  return `<div class="ba-w">${kopf}${liste}</div>`;
}
V.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-formpruefen],[data-formquelle],[data-formgesehen],[data-formansehen]'); if (!b || !FORM) return;
  if (b.dataset.formpruefen !== undefined) return formulareZeigen(FORM.land, true);
  if (b.dataset.formquelle !== undefined) {
    const u = await bpEingabe(`Seite mit den Bauvorlagen-Vordrucken für ${FORM.laender[FORM.land]} (https://…)`, FORM.quelle || '', { ok: 'Eintragen und prüfen' }); if (!u) return;
    try { FORM = await api('api/formulare/quelle', 'PUT', { land: FORM.land, url: u }); zeichne(); } catch (er) { toast(er.message, true); } return;
  }
  if (b.dataset.formgesehen) { try { await api(`api/formulare/${b.dataset.formgesehen}/gesehen`, 'POST', {}); await formulareZeigen(FORM.land); } catch (er) { toast(er.message, true); } return; }
  if (b.dataset.formansehen) { const x = FORM.formulare.find((y) => y.id === +b.dataset.formansehen);
    if (x.hat_datei && window.BPHead && BPHead.ansehen) BPHead.ansehen([{ url: `api/formulare/${x.id}/datei`, typ: 'pdf', name: (x.nr ? 'Anlage ' + x.nr + ' ' : '') + x.titel }]);
    else window.open(x.url, '_blank', 'noopener'); }
});
V.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.formland !== undefined && FORM) formulareZeigen(e.target.value); });

function neuDialog() {
  const P = L.projekte;
  if (!P.length) { toast('Es gibt noch kein Projekt.', true); return; }
  const gp = (window.BPHead && BPHead.projekt && BPHead.projekt.id) || P[0].id;
  modalBox(`<h3>Neuer Antrag</h3>
    <div class="row"><label>Projekt</label><select id="nP" data-bp-projekte>${P.map((p) => `<option value="${p.id}"${p.id === gp ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
    <div class="row"><label>Verfahren</label><select id="nV">${Object.entries(L.verfahren).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></div>
    <div class="row"><label>Name</label><input id="nN" placeholder="leer = wie das Verfahren"></div>
    <div class="acts"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Anlegen</button></div>`,
  async (m, bg, close) => {
    if (m !== 'ok') { close(); return; }
    try { const d = await api('api/antraege', 'POST', { project_id: +bg.querySelector('#nP').value, verfahren: bg.querySelector('#nV').value, name: bg.querySelector('#nN').value });
      close(); SCHRITT = 'verfahren'; await laden(d.antrag.id); } catch (e) { toast(e.message, true); }
  });
}

function pdf() {
  if (!D) return;
  const u = 'api/antraege/' + AID + '/antrag.pdf', w = window.open(u, '_blank'); if (!w) location.href = u;
}

async function loeschen() {
  if (!D || !(await bpFrage(`„${D.antrag.name}“ in den Papierkorb legen?`, { ok: 'Löschen' }))) return;
  try {
    const r = await api('api/antraege/' + AID, 'DELETE'), name = D.antrag.name;
    AID = null; await laden();
    if (r.papierkorb) rueckgaengig(`„${name}“ gelöscht`, async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); await laden(); });
  } catch (e) { toast(e.message, true); }
}

HANDY.addEventListener('change', () => { if (L) zeichne(); });
(async () => {
  ME = await api('api/me'); applyLook(ME);
  const PC = await api('api/platform');
  await header('Bauantrag', ME, PC);
  bpNav.breite(NAV, { key: 'bauantrag' });
  await laden();
  if (location.hash === '#formulare') { history.replaceState(null, '', location.pathname); formulareZeigen('NW'); }   // aus dem To-do „Neues Bauantragsformular“
  BPHead.live(['bauantrag', 'projects', 'contacts'], async () => { await laden(); BPHead.liveNotiz(); }, { projekt: false });   // Änderungen anderer
})().catch((e) => toast(e.message, true));
