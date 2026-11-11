'use strict';
/* Bauantrag – Seite der App. Links die Anträge je Projekt (bpNav), oben die Befehlsleiste (befehle), in der Mitte der Assistent in
   sechs Schritten, rechts das PDF (seite.js). Jeder Wert zeigt seine Quelle (Projekt, Adressen, Kataster, Baukosten, Büro, Mein Konto);
   von Hand geänderte Werte lassen sich mit ↺ auf die Quelle zurücksetzen. Jede Änderung wird sofort gespeichert (Rückgängig-Dock).
   Server: plattform/bauantrag.py, Felder und PDF: bpcore/bauantrag.py. */
let ME = null, L = null, D = null, AID = null, SCHRITT = 'verfahren';
const NAV = $('#navL'), LEISTE = $('#bfl'), V = $('#view'), WORK = $('#work');
const HANDY = matchMedia('(max-width: 820px)');
const IC = { neu: '<path d="M12 5v14M5 12h14"/>', pdf: '<path d="M6 3h9l4 4v14H6zM14 3v5h5"/><path d="M9 13h6M9 17h4"/>', weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  antrag: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12l2 2 4-4"/>', ord: '<path d="M3 7h6l2 2h10v10H3z"/><path d="M12 12v5M9.5 14.5 12 17l2.5-2.5"/>' };
const STATUS = { entwurf: 'Entwurf', eingereicht: 'eingereicht', genehmigt: 'genehmigt' };
const BV_ST = { da: 'liegt vor', offen: 'fehlt', entfaellt: 'entfällt' };

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
    wahl: async (id) => { AID = +id; D = await api('api/antraege/' + AID); zeichne(); },
  });
}

function leiste() {
  const K = (t, ic, fn, o = {}) => ({ t, ic, fn, tip: o.tip || t, aus: !!o.aus, rot: !!o.rot });
  befehle(LEISTE, [
    { titel: 'Neu', knoepfe: [K('Antrag', IC.neu, neuDialog, { tip: 'Neuer Bauantrag, Vorbescheid oder Freistellung' })] },
    { titel: 'Bauvorlagen', knoepfe: [K('Neu erkennen', IC.ord, async () => { D = await api('api/antraege/' + AID + '?neu=1'); zeichne(); toast('Projektordner neu eingelesen.'); },
      { aus: !D, tip: 'Projektordner neu einlesen und die Bauvorlagen erkennen' })] },
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

function feldHtml(f) {
  const w = String(f.wert ?? ''), leer = f.pflicht && !w.trim();
  const q = f.quelle ? `<span class="ba-q${f.eigen ? ' eigen' : ''}" title="${f.eigen && f.quelle_name ? esc('Quelle: ' + f.quelle_name + (f.quelle_wert ? ' – „' + f.quelle_wert + '“' : '')) : ''}">${esc(f.quelle)}</span>` : '';
  const zur = f.eigen && f.quelle_name ? `<button type="button" class="ba-r" data-zurueck="${f.key}" title="Wert aus „${esc(f.quelle_name)}“ wieder übernehmen">↺</button>` : '';
  const kopf = `<span>${esc(f.label)}${f.pflicht ? ' <i>*</i>' : ''}${q}${zur}</span>`;
  let ein;
  if (f.typ === 'select' || f.typ === 'wahl') {
    const O = f.optionen.map((o) => (Array.isArray(o) ? o : [o, o || '–']));
    ein = `<span class="seg" role="group">${O.map(([v, t]) => `<button type="button" data-seg="${f.key}" data-v="${esc(v)}" class="${w === v ? 'on' : ''}">${esc(t)}</button>`).join('')}</span>`;
  } else if (f.typ === 'textarea') ein = `<textarea data-f="${f.key}">${esc(w)}</textarea>`;
  else ein = `<input data-f="${f.key}" value="${esc(f.typ === 'eur' && w ? (+w).toLocaleString('de-DE') : w)}"${f.typ === 'zahl' || f.typ === 'eur' ? ' class="z" inputmode="decimal"' : ''}${f.hilfe ? ` placeholder="${esc(f.hilfe)}"` : ''}>`;
  return `<label class="ba-f${f.typ === 'textarea' || (f.typ === 'select' && f.optionen.length > 5) ? ' w' : ''}${leer ? ' leer' : ''}">${kopf}${ein}</label>`;
}
const gruppe = (titel, keys, extra = '') => `<div class="ba-k"><h3>${titel}</h3>${extra}<div class="ba-g">${keys.map((k) => feldHtml(feld(k))).join('')}</div></div>`;

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
  Object.keys(felder).forEach((k) => { const f = feld(k); alt[k] = f && f.eigen ? f.wert : null; });
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
  BPHead.live(['bauantrag', 'projects', 'contacts'], async () => { await laden(); BPHead.liveNotiz(); }, { projekt: false });   // Änderungen anderer
})().catch((e) => toast(e.message, true));
