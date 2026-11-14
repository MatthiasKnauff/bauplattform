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
const BV_ST = { da: 'liegt vor', offen: 'fehlt', nachgereicht: 'wird nachgereicht', entfaellt: 'entfällt' };
const BV_KURZ = { nachgereicht: 'später' };   // in der Tabelle kurz, damit die vier Knöpfe in eine Zeile passen (ganzer Text als Tipp)
const BREIT = new Set(['bauherr_name', 'bauherr_anschrift', 'ev_name', 'ev_anschrift', 'gs_strasse', 'behoerde', 'bplan', 'tragwerk', 'nutzung']);   // zwei Spalten breit

/* Projekt: oben in der Kopfleiste wie in allen Apps. Die Anträge eines Projekts wählt man wie Versionen (Baukasten versionsMenue),
   ★ = Hauptantrag des Projekts. Links in der Navigation die sechs Schritte, in der Mitte der Schritt, rechts das passende Blatt. */
let PID = null, VIEW = null, BVZEIG = null;   // BVZEIG: in Schritt 5 gewählte Datei einer Bauvorlage (rechts angezeigt)   // VIEW: null = Maske der Schritte · 'statistik' = statistischer Erhebungsbogen
const LEER = {};   // je Vordruck: offene Felder des Antrags (gezählt beim Ausfüllen im PDF, steht am Reiter rechts)
const LSB = { get(k) { try { return JSON.parse(localStorage.getItem('ba.' + k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem('ba.' + k, JSON.stringify(v)); } catch { /* egal */ } } };
const projAntraege = () => (L ? L.antraege.filter((a) => a.project_id === PID) : []);
async function laden(aid) {
  L = await api('api/antraege');
  if (aid) { AID = aid; const a = L.antraege.find((x) => x.id === aid); if (a) PID = a.project_id; }
  if (!PID) PID = (window.BPHead && BPHead.projektId && BPHead.projektId()) || (L.antraege[0] || {}).project_id || null;
  const A = projAntraege();
  if (!A.some((a) => a.id === AID)) { const m = LSB.get('aid:' + PID); AID = (A.find((a) => a.id === m) || A.find((a) => a.id === (L.haupt || {})[String(PID)]) || A[0] || {}).id || null; }
  if (AID) LSB.set('aid:' + PID, AID);
  D = AID ? await api('api/antraege/' + AID) : null;
  if (PID && window.BPHead && BPHead.projektId && BPHead.projektId() !== PID) BPHead.projektSetzen(PID);   // Kopfleiste zeigt das Projekt des Antrags
  zeichne();
}
if (window.BPHead && BPHead.beiProjektWahl) BPHead.beiProjektWahl(async (id) => { PID = +id; AID = null; FORM = null; VIEW = null; SCHRITT = 'verfahren'; await laden(); });

function antragMenue(box) {   // „Antrag: Baugenehmigung ★ ▾“ – wie die Versionen in der Ausschreibung
  const A = projAntraege(), h = (L.haupt || {})[String(PID)];
  const kinder = (id) => A.filter((a) => a.ursprung === id);   // Änderungen/Ergänzungen eingerückt unter ihrem Ursprung
  const R = A.filter((a) => !a.ursprung || !A.some((x) => x.id === a.ursprung)).flatMap((a) => [a, ...kinder(a.id)]);
  BPHead.versionsMenue({ in: box, wort: 'Antrag', liste: R.map((a) => ({ id: a.id, name: (a.ursprung && R.some((x) => x.id === a.ursprung) ? '↳ ' : '') + a.name,
    datum: [a.art ? VERS[a.art][0] : '', STATUS[a.status] || ''].filter(Boolean).join(' · ') })), aktuell: AID,
    gueltig: A.some((a) => a.id === h) ? h : (A[0] || {}).id, fragen: false, giltText: '★ Hauptantrag des Projekts', neuText: '⧉ Neue Version … (Änderung, Ergänzung oder neu)',
    onWahl: async (id) => { FORM = null; VIEW = null; await laden(+id); },
    onGueltig: async (id) => { try { await api(`api/antraege/${id}/haupt`, 'PUT'); L = await api('api/antraege'); zeichne(); toast('Hauptantrag des Projekts gesetzt.'); } catch (e) { toast(e.message, true); } },
    onNeu: () => kopieDialog(), onUmbenennen: () => umbenennen(), onVerwalten: () => loeschen(),
    extra: [{ text: '＋ Neuer Antrag …', fn: () => neuDialog() }] });
}

function nav() {   // links genau die sechs Schritte des gewählten Antrags – die Mitte zeigt den Schritt, rechts folgt das passende Blatt
  const P = L.projekte.find((p) => p.id === PID) || {};
  if (!D) {
    bpNav(NAV, { kopf: { titel: P.name || 'Bauantrag', klein: 'kein Antrag' }, gruppen: [], attr: 'ba', lage: true,
      fuss: '<button type="button" class="nneu" data-navneu>＋ Neuer Antrag</button>' });
    return;
  }
  const punkte = D.schritte.map(([k, t], i) => { const n = offenIn(k);
    return { id: 's:' + k, text: t, farbe: n ? 'var(--c-o)' : 'var(--c-g)', zahl: n ? (k === 'bauvorlagen' ? n + ' fehlen' : n + ' offen') : '✓',
      zahlTip: n ? (k === 'bauvorlagen' ? 'nötige Bauvorlagen, die noch fehlen' : 'Pflichtangaben, die noch fehlen') : 'vollständig',
      icon: n ? `<text x="12" y="18" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" stroke="none">${i + 1}</text>` : '<path d="M5 12.5l4.5 4.5L19 7.5"/>' }; });
  /* darunter, was zum Antrag gehört – mit Stand: ✓ liegt vor · – entfällt · später = wird nachgereicht · fehlt */
  const pk = D.paket || [], sel = (k) => (D.gewaehlt || []).includes(k);
  const zl = (x) => (LEER[x.key] != null ? (LEER[x.key] ? LEER[x.key] + ' offen' : '✓') : '');
  const st = D.bauvorlagen.find((b) => b.key === 'statistik');
  const amtl = pk.filter((x) => x.art === 'vordruck' && sel(x.key)).map((x) => ({ id: 'st:' + x.key, text: (/^[IV]+\//.test(x.nr || '') ? x.nr + ' ' : '') + x.titel, icon: IC.antrag, farbe: 'var(--c-v)', zahl: zl(x), zahlTip: 'offene Felder des Antrags in diesem Vordruck' }));
  if (st && !pk.some((x) => x.art === 'vordruck' && /statist|erhebungsbogen/i.test(x.titel))) amtl.push({ id: 'statistik', text: 'Statistischer Erhebungsbogen', icon: IC.pdf, zahl: st.status === 'entfaellt' ? '–' : 'fehlt', zahlTip: st.status === 'entfaellt' ? 'entfällt' : 'leeren Bogen holen' });
  const eig = pk.filter((x) => x.art === 'unterlage' && sel(x.key)).map((x) => ({ id: 'st:' + x.key, text: x.titel, icon: IC.pdf, farbe: 'var(--c-o)', zahl: x.nutzung === 'beilegen' ? 'PDF' : zl(x) }));
  const bv = D.bauvorlagen.filter((b) => b.key !== 'antrag' && b.key !== 'statistik' && (b.pflicht || b.status !== 'offen')).map((b) => ({ id: 'bv:' + b.key, text: b.name, icon: IC.ord, farbe: 'var(--c-g)',
    zahl: { offen: 'fehlt', entfaellt: '–', nachgereicht: 'später' }[b.status] || '✓', zahlTip: { offen: 'fehlt noch', entfaellt: 'entfällt – kommt nicht dazu', nachgereicht: 'wird nachgereicht' }[b.status] || 'liegt vor – kommt dazu' }));
  bpNav(NAV, {
    kopf: { titel: P.name || 'Projekt', klein: `${projAntraege().length} Antr${projAntraege().length === 1 ? 'ag' : 'äge'}` },
    davor: '<div class="ba-am"></div>',
    gruppen: [{ titel: 'Schritte', punkte },
      { titel: 'Amtliche Vordrucke', punkte: amtl },
      ...(eig.length ? [{ titel: 'Eigene Unterlagen', punkte: eig }] : []),
      { titel: 'Pläne & Anlagen', punkte: bv }],
    aktiv: FORM ? '' : NAVAKT || 's:' + SCHRITT, attr: 'ba', lage: true,
    fuss: '<button type="button" class="nneu" data-navneu>＋ Neuer Antrag</button>',
    nachher: (el) => { const b = el.querySelector('.ba-am'); if (b) antragMenue(b); },
    wahl: (id) => navWahl(id),
  });
}
let NAVAKT = '';   // links gewählter Vordruck oder Plan (sonst ist der Schritt markiert)
function navWahl(id) {
  if (id.startsWith('s:')) { NAVAKT = ''; geheZu(id.slice(2)); return; }
  FORM = null; NAVAKT = id;
  if (id === 'statistik') { VIEW = 'statistik'; SCHRITT = 'bauvorlagen'; zeichne(); return; }
  if (id.startsWith('bv:')) {   // Plan/Anlage: Schritt 5, die Datei rechts
    const b = D.bauvorlagen.find((x) => x.key === id.slice(3)), f = b && b.dateien[0];
    SCHRITT = 'bauvorlagen'; VIEW = null; BVZEIG = f ? { pfad: f.pfad, name: f.name } : null; zeichne(); vorschau(true); zeigeRechts();
    setTimeout(() => { const z = document.getElementById('bv-' + id.slice(3)); if (z) z.scrollIntoView({ block: 'center' }); }, 50);
    return;
  }
  const k = id.slice(3), x = (D.paket || []).find((y) => y.key === k);   // Vordruck / eigene Unterlage: rechts „Im PDF ausfüllen“
  if (x && x.art === 'unterlage' && x.nutzung === 'beilegen') { BPHead.ansehen([{ url: `api/antraege/${AID}/stueck/${k}.pdf`, typ: 'pdf', name: x.titel }]); return; }
  AUS.key = k; VIEW = null; zeichne();
  if (HANDY.matches) { ausfuellenOeffnen(); return; }
  if (window.seiteOffen && !seiteOffen()) seiteUmschalten();
  const r = WORK.querySelector('[data-srt="aus"]');
  if (r && !r.classList.contains('on')) r.click(); else { const el = WORK.querySelector('.bap-aus'); if (el) ausfuellenIn(el); }
}
const offenIn = (k) => (k === 'bauvorlagen' ? D.fehlt.bauvorlagen.length : k === 'pruefen' ? D.fehlt.felder.length + D.fehlt.bauvorlagen.length : fehltIn(k));
function geheZu(k) {   // ein Schritt: Mitte neu, die PDF rechts springt an die Stelle dieses Schritts
  NAVAKT = ''; SCHRITT = k; VIEW = null; FORM = null; BVZEIG = null; V.scrollTop = 0; zeichne();
  const p = PDFEL && PDFEL.querySelector('.ba-pdfs'); if (p) { PDFSCHRITT = AID + ':' + SCHRITT; BPHead.pdfZiel(p, 'schritt-' + SCHRITT); }
}
/* Neue Version: Änderung (Tektur) oder Ergänzung zum Ursprung – Bezug mit Aktenzeichen und Datum – oder ganz neue, eigenständige Version.
   Änderung ↔ Ergänzung lässt sich später oben am Antrag umstellen (versionLeiste), eigenständig ↔ mit Ursprung nur beim Anlegen. */
const VERS = { aenderung: ['Änderung', 'Am Vorhaben ändert sich etwas (Tektur): Anschreiben „Änderungsantrag zum …“ mit Aktenzeichen, ins Paket die geänderten und neuen Unterlagen.'],
  ergaenzung: ['Ergänzung', 'Das Vorhaben bleibt, es werden Unterlagen nachgereicht (z. B. Statik, Wärmeschutz): Anschreiben „Ergänzung zum …“ mit der Liste der nachgereichten Unterlagen.'],
  neu: ['Ganz neue Version', 'Eigenständig, z. B. nach Rücknahme oder bei neuem Entwurf: alles übernommen, danach unabhängig.'] };
function kopieDialog() {
  if (!D) return;
  const az = (D.anschreiben || {}).aktenzeichen || '', urs = D.version ? D.version.ursprung_name : D.antrag.name;
  let art = 'aenderung';
  const nm = (a) => (a === 'neu' ? `${D.antrag.name} (neu)` : `${VERS[a][0]} – ${urs}`);
  modalBox(`<h3>Neue Version von „${esc(D.antrag.name)}“</h3>
    <div class="ba-vw" role="radiogroup">${Object.entries(VERS).map(([k, [t, x]]) => `<button type="button" role="radio" class="ba-vo${k === art ? ' on' : ''}" data-vart="${k}" aria-checked="${k === art}"><b>${t}</b><small>${x}</small></button>`).join('')}</div>
    <div class="row"><label>Name<input id="vName" value="${esc(nm(art))}" autocomplete="off"></label></div>
    <div class="row" data-vwas><label>Was ändert sich? (kommt ins Anschreiben)<textarea id="vWas" rows="2" placeholder="z. B. zusätzliche Dachgaube Nordseite"></textarea></label></div>
    <p class="ba-hilfe" data-vbez>Bezug: „${esc(urs)}“${az ? ` · Aktenzeichen ${esc(az)}` : ' · Aktenzeichen noch nicht eingetragen (Schritt 6 → Anschreiben)'}</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Anlegen</button></div>`,
  async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    btn.disabled = true;
    try { const d = await api(`api/antraege/${AID}/kopie`, 'POST', { name: bg.querySelector('#vName').value, art: art === 'neu' ? '' : art, was: art === 'aenderung' ? bg.querySelector('#vWas').value : '' });
      close(); await laden(d.antrag.id); toast(`${VERS[art][0]} angelegt – du arbeitest jetzt darin.`);
      const nid = d.antrag.id; rueckgaengig(`${VERS[art][0]} „${d.antrag.name}“`, async () => { await api('api/antraege/' + nid, 'DELETE'); AID = null; await laden(); });
    } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  const bg = [...document.querySelectorAll('.modal-bg')].pop();
  bg.addEventListener('click', (e) => { const o = e.target.closest('[data-vart]'); if (!o) return;
    const n = bg.querySelector('#vName'), alt = nm(art); art = o.dataset.vart;
    bg.querySelectorAll('[data-vart]').forEach((x) => { const on = x === o; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    if (n.value === alt) n.value = nm(art);
    bg.querySelector('[data-vwas]').hidden = art !== 'aenderung'; bg.querySelector('[data-vbez]').hidden = art === 'neu'; });
}
/* oben am Antrag: Bezug zum Ursprung, Änderung ↔ Ergänzung, was sich ändert */
function versionLeiste() {
  const V = D.version; if (!V) return '';
  const e = V.eingereicht, vom = e ? ` vom ${e.slice(8, 10)}.${e.slice(5, 7)}.${e.slice(0, 4)}` : '';
  return `<div class="ba-vers"><span class="seg" role="group" aria-label="Art">${['aenderung', 'ergaenzung'].map((k) => `<button type="button" data-vers="${k}" class="${V.art === k ? 'on' : ''}">${VERS[k][0]}</button>`).join('')}</span>
    <span>zu <a href="#" data-vurs="${V.ursprung || ''}">„${esc(V.ursprung_name)}“</a>${esc(vom)}${V.aktenzeichen ? ` · Az. ${esc(V.aktenzeichen)}` : ''}</span>
    ${V.art === 'aenderung' ? `<input data-vwas value="${esc(V.was)}" placeholder="Was ändert sich? (kommt ins Anschreiben)" aria-label="Was ändert sich?">`
      : `<small class="mute">Nachgereicht: ${V.unterlagen.length ? esc(V.unterlagen.join(', ')) : 'noch keine Bauvorlage auf „wird nachgereicht“'}</small>`}</div>`;
}
async function versionSetzen(werte, text) {
  const V = D.version, alt = { art: V.art, was: V.was }, id = AID;
  try { D = await api(`api/antraege/${id}/version`, 'PUT', werte); L = await api('api/antraege'); zeichne();
    rueckgaengig(text, async () => { D = await api(`api/antraege/${id}/version`, 'PUT', alt); L = await api('api/antraege'); zeichne(); }); } catch (e) { toast(e.message, true); }
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-vers]'); if (b && D && D.version && b.dataset.vers !== D.version.art) { versionSetzen({ art: b.dataset.vers }, `Als ${VERS[b.dataset.vers][0]} geführt`); return; }
  const u = e.target.closest('[data-vurs]'); if (u) { e.preventDefault(); if (+u.dataset.vurs) { FORM = null; VIEW = null; laden(+u.dataset.vurs); } }
});
V.addEventListener('change', (e) => { if (e.target.matches('[data-vwas]') && D && D.version) versionSetzen({ was: e.target.value }, 'Was sich ändert – geändert'); });
async function umbenennen() {
  if (!D) return;
  const alt = D.antrag.name, n = await bpEingabe('Name des Antrags', alt, { ok: 'Umbenennen' }); if (!n || n === alt) return;
  try { D = await api('api/antraege/' + AID, 'PUT', { name: n }); L = await api('api/antraege'); zeichne();
    const id = AID; rueckgaengig(`„${n}“ umbenannt`, async () => { D = await api('api/antraege/' + id, 'PUT', { name: alt }); L = await api('api/antraege'); zeichne(); }); } catch (e) { toast(e.message, true); }
}

function leiste() {   // Löschen/Kopie im Antrags-Menü, „Im PDF ausfüllen“ als Reiter rechts, Vordrucke wählen in Schritt 1, Projektordner neu einlesen in Schritt 5
  befehle(LEISTE, [
    { titel: 'Vordrucke', knoepfe: [{ t: 'Vordrucke des Landes', ic: IC.antrag, fn: () => formulareZeigen(''), tip: 'Amtliche Vordrucke des Landes: neue Fassungen prüfen, eigene hochladen, ersetzen' }] },
    { titel: 'Ausgabe', rechts: true, knoepfe: [{ t: 'Drucken', ic: IC.pdf, fn: pdf, aus: !D, tip: 'Drucken: Anschreiben, Deckblatt, Vordrucke und Unterlagen anhaken, rechts die Vorschau' }] },
  ]);
}
async function neuEinlesen() { if (!D) return; D = await api('api/antraege/' + AID + '?neu=1'); zeichne(); toast('Projektordner neu eingelesen.'); }

/* Bereich rechts: PDF-Vorschau, nach jeder Änderung neu */
let PDFEL = null, PDFT = 0, PDFSCHRITT = '';   // PDFSCHRITT: Antrag und Schritt, an dessen Stelle die Vorschau steht
function pdfRahmen(kopf) {   // Rahmen rechts nur einmal bauen: die alten Seiten bleiben stehen, bis die neuen fertig sind (kein Flackern)
  let p = PDFEL.querySelector('.ba-pdf');
  if (!p) { PDFEL.innerHTML = '<div class="ba-pdf"><div class="ba-pk"></div><div class="ba-pdfs"></div></div>'; p = PDFEL.querySelector('.ba-pdf'); }
  p.querySelector('.ba-pk').innerHTML = kopf; return p.querySelector('.ba-pdfs');
}
function vorschau(sofort) {
  clearTimeout(PDFT);
  if (typeof ausAktualisieren === 'function') ausAktualisieren();   // bauantrag-paket.js: Werte in „Im PDF ausfüllen“ nachtragen
  if (!PDFEL || !PDFEL.isConnected) return;
  if (!D) { PDFEL.innerHTML = '<div class="ba-pleer">Kein Antrag gewählt.</div>'; return; }
  PDFT = setTimeout(async () => {
    if (SCHRITT === 'bauvorlagen' && BVZEIG) {   // Schritt 5: die gewählte Datei statt des Antragspakets
      PDFSCHRITT = '';
      const ziel = pdfRahmen(`<span class="mute">📄 ${esc(BVZEIG.name)}</span><button type="button" class="btn sm" data-bvweg>← Antragspaket</button>`);
      if (/\.pdf$/i.test(BVZEIG.pfad)) BPHead.pdfIn(ziel, `api/antraege/${AID}/datei?pfad=${encodeURIComponent(BVZEIG.pfad)}`, {});
      else ziel.innerHTML = '<div class="ba-pleer">Nur PDF-Dateien lassen sich hier ansehen – die Datei liegt im Projektordner („Pläne &amp; Dateien“).</div>';
      return;
    }
    const n = (D.gewaehlt || []).filter((k) => !k.startsWith('t')).length;
    if (!n) { PDFEL.innerHTML = '<div class="ba-pleer">Noch kein Vordruck gewählt – in Schritt 1 „Verfahren &amp; Formulare“ anhaken oder eigene Unterlagen hinzufügen.</div>'; return; }
    const alt = PDFEL.querySelector('.ba-pdfs'), gleich = alt && PDFSCHRITT === AID + ':' + SCHRITT;   // gleicher Schritt: an derselben Stelle bleiben
    const o = gleich ? { top: BPHead.pdfRolle(alt) } : { ziel: 'schritt-' + SCHRITT };
    PDFSCHRITT = AID + ':' + SCHRITT;
    BPHead.pdfIn(pdfRahmen(`<span class="mute">Antragspaket · ${n} Unterlage${n === 1 ? '' : 'n'} · Anschreiben, Deckblatt und Trennblätter in Schritt 6</span><button type="button" class="btn sm" data-bapdf>↻ Neu laden</button>`), `api/antraege/${AID}/paket.pdf`, o);
  }, sofort ? 0 : 1200);
}
/* Hinweis im Schritt „Prüfen & PDF“: welches amtliche Formular, wie viel davon ausgefüllt */
function formInfo(I, fehler) {
  const el = document.getElementById('baForm'); if (!el) return;
  el.innerHTML = fehler ? `⚠ ${esc(fehler)}` : `<b>Anlage ${esc(I.nr)}</b> ${esc(I.titel)} · Fassung ${esc(I.fassung || '–')}<br>`
    + (I.felder ? `${I.gefuellt} von ${I.felder} Formularfeldern ausgefüllt – den Rest im PDF ergänzen.` : 'Das Formular hat keine ausfüllbaren Felder – es wird leer ausgegeben, bitte von Hand ausfüllen.');
}
let BEREICH = null;   // Bereich rechts nur beim Wechsel des Antrags neu aufbauen – sonst springt „Im PDF ausfüllen“ nach jedem Klick an den Anfang
function bereich() {
  if (!window.seite || HANDY.matches) return;
  if (BEREICH === AID && WORK.dataset.sr === 'ba' && WORK.querySelector(':scope > .sr-r .sr-b, :scope > .sr-r .sr-aufs')) return;   // Werte trägt ausAktualisieren nach, die Vorschau vorschau()
  BEREICH = AID;
  seite(WORK, 'ba', [{ id: 'pdf', titel: 'PDF', mount: (el) => { PDFEL = el; vorschau(true); } },
    { id: 'aus', titel: 'Im PDF ausfüllen', mount: (el) => { el.classList.add('bap-aus'); ausfuellenIn(el); } }], { start: 'pdf', w: 0.5, minL: 520 });
}
function zeigeRechts() {   // Bereich rechts offen und auf dem Reiter „PDF“
  if (window.seiteOffen && !seiteOffen()) seiteUmschalten();
  const r = WORK.querySelector('[data-srt="pdf"]'); if (r && !r.classList.contains('on')) r.click();
}
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-bvweg]')) { BVZEIG = null; zeichne(); vorschau(true); } if (e.target.closest && e.target.closest('[data-bapdf]')) vorschau(true); if (e.target.closest && e.target.closest('[data-neuerk]')) neuEinlesen(); });

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
    + `<div class="ba-k"><h3>Bezeichnung</h3><div class="ba-g"><label class="ba-f w"><span>Name des Antrags (nur hier in der Liste)</span><input data-name value="${esc(D.antrag.name)}"></label></div></div>`
    + paketHtml();   // bauantrag-paket.js: Vordrucke wählen, eigene Unterlagen
  if (S === 'beteiligte') {
    const ew = String(feld('ev_wahl').wert || 'buero');
    return gruppe('Bauherrschaft', ['bauherr_name', 'bauherr_vertreter', 'bauherr_anschrift', 'bauherr_tel', 'bauherr_mail'])
      + gruppe('Entwurfsverfasser:in', ['ev_name', 'ev_beruf', 'ev_kammer', 'ev_kammernr', 'ev_anschrift', 'ev_tel', 'ev_mail'],
        `<div class="ba-ev">Angaben aus <span class="seg" role="group"><button type="button" data-seg="ev_wahl" data-v="persoenlich" class="${ew === 'persoenlich' ? 'on' : ''}">Mein Konto (persönlich)</button><button type="button" data-seg="ev_wahl" data-v="buero" class="${ew === 'buero' ? 'on' : ''}">Büro</button></span>
          <span class="ba-hilfe">Vorauswahl: persönlich, wenn in „Mein Konto“ bauvorlageberechtigt mit Kammernummer eingetragen ist – sonst das Büro (Verwaltung → Büro).</span></div>`)
      + gruppe('Weitere Beteiligte', ['tragwerk']);
  }
  if (S === 'grundstueck') return gruppe('Lage', ['gs_strasse', 'gs_ort', 'gemarkung', 'flur', 'flurstueck', 'gs_flaeche'])
    + gruppe('Planungsrecht', ['bplan', 'gebiet', 'baulasten', 'denkmal']);
  if (S === 'vorhaben') return gruppe('Vorhaben', ['bezeichnung', 'art', 'gebaeudeklasse', 'sonderbau', 'nutzung'])
    + gruppe('Kenndaten', ['grf', 'bgf', 'bri', 'nrf', 'grz', 'gfz', 'geschosse', 'hoehe', 'we', 'st_notw', 'st_nachg'])
    + gruppe('Kosten', ['rohbau', 'herstellung'], '<p class="ba-hilfe" style="margin:-.3rem 0 .6rem">Aus der gültigen Kostenermittlung: Rohbau ≈ KG 300, Herstellung = KG 300 + 400 (netto). Bitte prüfen – die Bauaufsicht rechnet damit die Gebühr.</p>');
  if (S === 'bauvorlagen') return `<div class="ba-k"><h3>Bauvorlagen<span class="mute">erkannt aus dem Projektordner (Dateinamen) – Klick auf eine Datei zeigt sie rechts, Stand jederzeit von Hand änderbar <button type="button" class="btn sm" data-neuerk title="Projektordner neu einlesen – nach dem Ablegen neuer Dateien">↻ neu einlesen</button></span></h3>
    <table class="ba-t ba-bv"><thead><tr><th>Unterlage</th><th>Stand</th></tr></thead><tbody>
    ${D.bauvorlagen.map((b) => `<tr${b.key !== 'antrag' && D.antrag.status === 'entwurf' ? ` data-bvdrop="${b.key}"` : ''}><td>${esc(b.name)}${b.pflicht ? '' : ' <span class="mute">(falls nötig)</span>'}${b.auto ? ' <span class="ba-q" title="Stand anhand der Dateinamen erkannt">erkannt</span>' : ''}
        ${b.dateien.length ? `<div class="dat">${b.dateien.map((x) => `<span class="ba-dz"><button type="button" class="ba-dat${BVZEIG && BVZEIG.pfad === x.pfad ? ' on' : ''}" data-bvdat="${esc(x.pfad)}" title="rechts ansehen">📄 ${esc(x.name)}</button>${x.hand && D.antrag.status === 'entwurf' ? `<button type="button" class="ba-dx" data-bvx="${b.key}" data-pfad="${esc(x.pfad)}" title="Zuordnung lösen (die Datei bleibt im Projektordner)" aria-label="Zuordnung lösen">✕</button>` : ''}</span>`).join('')}</div>` : ''}
        ${b.key !== 'antrag' && D.antrag.status === 'entwurf' ? `<div class="ba-bvplus"><label class="ba-hoch" title="Dateien auf diese Zeile ziehen oder hier auswählen – sie werden im Projektordner abgelegt"><input type="file" multiple accept="application/pdf,.pdf,image/*,.heic,.heif,.tif,.tiff" hidden data-bvhoch="${b.key}">📎 ablegen / hochladen</label><button type="button" class="ba-dat" data-bvwahl="${b.key}">📁 aus dem Projekt …</button></div>` : ''}
        ${b.key === 'antrag' ? '<div class="dat">wird hier erstellt</div>' : ''}${b.key === 'statistik' && b.status !== 'entfaellt' && typeof statVordruck === 'function' && !statVordruck() ? '<div class="dat"><button type="button" class="ba-dat" data-statview>Leeren Bogen holen …</button></div>' : ''}</td>
      <td>${b.key === 'antrag' ? '<span class="mute">–</span>' : `<span class="seg" role="group">${Object.entries(BV_ST).map(([v, t]) => `<button type="button" data-bv="${b.key}" data-v="${v}" class="${b.status === v ? 'on' : ''}" title="${t}">${BV_KURZ[v] || t}</button>`).join('')}</span>`}</td></tr>${b.status === 'nachgereicht' && typeof nachHtml === 'function' ? `<tr class="ba-nachz" id="bv-${esc(b.key)}"><td colspan="2">${nachHtml(b)}</td></tr>` : ''}`).join('')}
    </tbody></table></div>`;
  // Prüfen & PDF
  const ff = D.fehlt.felder, fb = D.fehlt.bauvorlagen;
  const wo = (label) => (D.felder.find((f) => f.label === label) || {}).schritt;
  return `<div class="ba-k"><h3>Prüfen</h3><div class="ba-pf">
      ${ff.length ? ff.map((l) => `<span class="fe">● ${esc(l)} fehlt – <a data-geh="${wo(l)}">${esc((D.schritte.find((s) => s[0] === wo(l)) || [])[1] || '')}</a></span>`).join('') : '<span class="ok">✓ Alle Pflichtangaben sind ausgefüllt.</span>'}
      ${fb.length ? fb.map((n) => `<span class="fe">● Bauvorlage „${esc(n)}“ fehlt – <a data-geh="bauvorlagen">Bauvorlagen</a></span>`).join('') : '<span class="ok">✓ Alle nötigen Bauvorlagen liegen vor oder entfallen.</span>'}
    </div></div>
    <div class="ba-k"><h3>Stand</h3><span class="seg" role="group">${Object.entries(STATUS).map(([v, t]) => `<button type="button" data-status="${v}" class="${D.antrag.status === v ? 'on' : ''}">${t}</button>`).join('')}</span>
      <p class="ba-hilfe" style="margin:.5rem 0 0">Solange „Entwurf“, trägt das PDF den Aufdruck ENTWURF. „eingereicht“ fragt nach Weg, Datum und Aktenzeichen und sperrt die Angaben (zum Ändern zurück auf „Entwurf“).</p>${typeof einreichVerlauf === 'function' ? einreichVerlauf() : ''}</div>
    ${paketPruefenHtml()}`;
}

function zeichne() {
  nav(); leiste();
  if (FORM) { V.innerHTML = formHtml(); return; }
  if (!D) { V.innerHTML = '<div class="leer">Noch kein Bauantrag. Links „＋ Neuer Antrag“: Projekt wählen – alles, was die Plattform schon weiß, wird eingetragen.</div>'; bereich(); vorschau(true); return; }
  const i = D.schritte.findIndex((s) => s[0] === SCHRITT), vor = D.schritte[i - 1], nach = D.schritte[i + 1];
  const top = V.scrollTop;
  const kopf = `<div class="bp-stufen ba-st" role="tablist">${D.schritte.map(([k, t], j) => { const n = offenIn(k);   // Farbbalken: alle sechs Schritte mit Stand
    return `<button type="button" data-schritt="${k}" class="bp-stufe${k === SCHRITT && !VIEW ? ' cur' : ''} ${n ? 'fehlt' : 'ok'}" title="${esc(t)}"><b>${j + 1} ${esc(t)}</b><small>${n ? (k === 'bauvorlagen' ? n + ' fehlen' : n + ' offen') : 'vollständig'}</small></button>`; }).join('')}</div>`;
  if (VIEW === 'statistik') { V.innerHTML = `<div class="ba-w">${kopf}${statistikHtml()}<div class="ba-nav"><span><button type="button" class="btn" data-geh="bauvorlagen">‹ zurück zu den Bauvorlagen</button></span></div></div>`; bereich(); vorschau(); return; }
  V.innerHTML = `<div class="ba-w">${versionLeiste()}${kopf}${schrittHtml()}
    <div class="ba-nav"><span>${vor ? `<button type="button" class="btn" data-geh="${vor[0]}">‹ ${esc(vor[1])}</button>` : ''}</span><span>${nach ? `<button type="button" class="btn pri" data-geh="${nach[0]}">${esc(nach[1])} ›</button>` : ''}</span></div></div>`;
  V.scrollTop = top;
  if (D.antrag.status !== 'entwurf') V.querySelectorAll('[data-f],[data-seg],[data-bv],[data-zurueck]').forEach((x) => { x.disabled = true; });
  bereich(); vorschau();
  if (SCHRITT === 'pruefen') api(`api/antraege/${AID}/formular`).then((I) => formInfo(I)).catch((e) => formInfo(null, e.message));
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
  if (b.dataset.schritt || b.dataset.geh) { geheZu(b.dataset.schritt || b.dataset.geh); return; }
  if (b.dataset.statview !== undefined) { VIEW = 'statistik'; zeichne(); return; }
  if (b.dataset.bvwahl) { bvWahl(b.dataset.bvwahl); return; }
  if (b.dataset.bvx) { const bv = D.bauvorlagen.find((x) => x.key === b.dataset.bvx), alt = bvHand(bv); bvExtra(bv, alt.filter((x) => x.pfad !== b.dataset.pfad), 'Zuordnung gelöst', alt); return; }
  if (b.dataset.bvdat) { BVZEIG = BVZEIG && BVZEIG.pfad === b.dataset.bvdat ? null : { pfad: b.dataset.bvdat, name: b.textContent.replace(/^📄\s*/, '') }; zeichne(); vorschau(true); zeigeRechts(); return; }
  if (b.dataset.seg) { const f = feld(b.dataset.seg); if (b.classList.contains('on')) return;
    const mehr = b.dataset.seg === 'ev_wahl' ? { ev_name: null, ev_beruf: null, ev_kammer: null, ev_kammernr: null, ev_tel: null, ev_mail: null } : {};
    setze({ [b.dataset.seg]: b.dataset.v, ...mehr }, `„${f.label}“: ${b.textContent}`); return; }
  if (b.dataset.zurueck) { const f = feld(b.dataset.zurueck); setze({ [f.key]: null }, `„${f.label}“ aus „${f.quelle_name}“ übernommen`); return; }
  if (b.dataset.bv) { const alt = D.bauvorlagen.find((x) => x.key === b.dataset.bv);
    try { D = await api('api/antraege/' + AID, 'PUT', { bauvorlagen: { [b.dataset.bv]: { status: b.dataset.v } } }); zeichne();
      rueckgaengig(`„${alt.name}“: ${BV_ST[b.dataset.v]}`, async () => { D = await api('api/antraege/' + AID, 'PUT', { bauvorlagen: { [alt.key]: alt.auto ? null : { status: alt.status, ...(alt.nach || {}) } } }); zeichne(); });
    } catch (er) { toast(er.message, true); } return; }
  if (b.dataset.status) { const alt = D.antrag.status;
    if (b.dataset.status === 'eingereicht' && alt !== 'eingereicht' && typeof einreichenDialog === 'function') { einreichenDialog(); return; }   // bauantrag-einreichen.js: Weg, Datum, Aktenzeichen, Ablage
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
  const BL = F.buero || 'NW', laender = Object.entries(F.laender).sort((a, b) => (a[0] === BL ? -1 : b[0] === BL ? 1 : a[1].localeCompare(b[1], 'de')));   // Land des Büros zuerst
  const kopf = `<div class="ba-k"><h3>Amtliche Formulare<span class="mute">${F.land === BL ? 'vom Portal, zwischengespeichert, täglich geprüft' : 'vom Portal des Landes, zwischengespeichert, beim Öffnen geprüft'}</span></h3>
    <div class="ba-fk"><label class="ba-f"><span>Bundesland</span><select data-formland data-bp-auswahl aria-label="Bundesland">${laender.map(([k, n]) => `<option value="${k}"${k === F.land ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <div class="ba-fs"><span>Fassung: <b>${esc(st.fassung || '–')}</b></span><span>zuletzt geprüft: <b>${de(st.geprueft)}</b></span>${F.quelle ? `<a href="${esc(st.seite || F.quelle)}" target="_blank" rel="noopener">Quelle öffnen ↗</a>` : ''}</div>
      <button type="button" class="btn pri" data-formpruefen${F.quelle ? '' : ' disabled'}>↻ Jetzt prüfen</button><button type="button" class="btn${st.kaputt ? ' pri' : ''}" data-formhoch>📤 Formular hochladen</button>${F.admin ? `<button type="button" class="btn" data-formquelle>${F.quelle ? 'Quelle ändern …' : 'Quelle eintragen …'}</button>` : ''}</div>
    ${st.kaputt ? `<div class="ba-warn">⚠ <b>Das Portal lässt sich nicht mehr lesen.</b> ${esc(st.fehler || '')}<br>Die bisher gespeicherten Formulare bleiben verfügbar. Neue Fassungen bitte selbst hochladen („📤 Formular hochladen“, bei einer Anlage „Ersetzen“).</div>`
      : st.fehler ? `<p class="ba-hilfe" style="color:var(--red)">⚠ ${esc(st.fehler)}</p>` : ''}
    ${!F.quelle ? `<p class="ba-hilfe">Für ${esc(F.laender[F.land])} ist noch keine Seite mit den Vordrucken eingetragen${F.admin ? ' – „Quelle eintragen …“, z. B. die Seite des Bauministeriums mit den Bauvorlagen.' : ' – das macht die Verwaltung.'}</p>` : ''}</div>`;
  const L = F.formulare || [], n = L.filter((x) => x.status === 'neu' || x.status === 'geaendert').length;
  const stat = L.some((x) => /statist|erhebungsbogen/i.test(x.titel) && x.status !== 'entfallen') ? ''   // Erhebungsbogen: andere Quelle (Statistische Ämter)
    : `<div class="ba-k"><h3>Statistischer Erhebungsbogen<span class="mute">Quelle: Statistische Ämter des Bundes und der Länder – nicht selbst abrufbar</span></h3>${statQuelleHtml(F.land)}</div>`;
  const liste = L.length ? `<div class="ba-k"><h3>${L.filter((x) => x.status !== 'entfallen').length} Formulare${n ? `<span class="mute" style="color:var(--warn)">${n} neu oder geändert</span>` : ''}</h3>
    <div class="tw"><table class="ba-t"><thead><tr><th>Anlage</th><th>Titel</th><th>Stand</th><th></th></tr></thead><tbody>
    ${L.map((x) => { const [t, c] = ST_FORM[x.status] || ['', '']; return `<tr class="${x.status === 'entfallen' ? 'aus' : ''}"><td style="white-space:nowrap">${esc(x.nr || '–')}</td><td>${esc(x.titel)}</td>
      <td style="white-space:nowrap">${t ? `<span class="ba-q" style="${c === 'warn' ? 'color:var(--warn);border-color:var(--warn)' : ''}">${t}</span> ` : ''}<small class="mute">${esc(x.fassung || de(x.geaendert).slice(0, 10))}</small></td>
      <td style="white-space:nowrap;text-align:right">${x.status === 'neu' || x.status === 'geaendert' ? `<button type="button" class="btn sm" data-formgesehen="${x.id}">✓ gesehen</button> ` : ''}<button type="button" class="btn sm" data-formansehen="${x.id}">Ansehen</button> <button type="button" class="btn sm" data-formersetzen="${x.id}" title="Eigene Datei für diese Anlage hochladen">Ersetzen</button>${x.url ? '' : ` <button type="button" class="btn sm" data-formweg="${x.id}" title="Selbst hochgeladenes Formular löschen (Papierkorb, rückgängig möglich)" aria-label="Löschen">🗑</button>`}</td></tr>`; }).join('')}
    </tbody></table></div></div>` : (F.quelle ? '<div class="ba-k"><p class="mute" style="margin:0">Noch nicht geprüft – „↻ Jetzt prüfen“.</p></div>' : '');
  return `<div class="ba-w">${kopf}${liste}${stat}</div>`;
}
V.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-formpruefen],[data-formquelle],[data-formgesehen],[data-formansehen],[data-formhoch],[data-formersetzen],[data-formweg]'); if (!b || !FORM) return;
  if (b.dataset.formweg) { const x = FORM.formulare.find((y) => y.id === +b.dataset.formweg), land = FORM.land, name = (x.nr && x.nr !== '–' ? x.nr + ' ' : '') + x.titel;
    if (!(await bpFrage(`„${name}“ löschen?`, { ok: 'Löschen' }))) return;
    try { const r = await api('api/formulare/' + x.id, 'DELETE'); FORM = r; zeichne();
      rueckgaengig(`„${name}“ gelöscht`, async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); await formulareZeigen(land); }); } catch (er) { toast(er.message, true); } return; }
  if (b.dataset.formhoch !== undefined || b.dataset.formersetzen) return formHochladen(b.dataset.formersetzen ? FORM.formulare.find((x) => x.id === +b.dataset.formersetzen) : null);
  if (b.dataset.formpruefen !== undefined) return formulareZeigen(FORM.land, true);
  if (b.dataset.formquelle !== undefined) {
    const u = await bpEingabe(`Seite mit den Bauvorlagen-Vordrucken für ${FORM.laender[FORM.land]} (https://…)${FORM.land === 'NW' ? ' – leer lassen für die Seite der Architektenkammer NRW' : ''}`, FORM.quelle || '', { ok: 'Eintragen und prüfen' }); if (u == null || (!u && FORM.land !== 'NW')) return;
    try { FORM = await api('api/formulare/quelle', 'PUT', { land: FORM.land, url: u }); zeichne(); } catch (er) { toast(er.message, true); } return;
  }
  if (b.dataset.formgesehen) { try { await api(`api/formulare/${b.dataset.formgesehen}/gesehen`, 'POST', {}); await formulareZeigen(FORM.land); } catch (er) { toast(er.message, true); } return; }
  if (b.dataset.formansehen) { const x = FORM.formulare.find((y) => y.id === +b.dataset.formansehen);
    if (x.hat_datei && window.BPHead && BPHead.ansehen) BPHead.ansehen([{ url: `api/formulare/${x.id}/datei`, typ: 'pdf', name: (x.nr ? 'Anlage ' + x.nr + ' ' : '') + x.titel }]);
    else window.open(x.url, '_blank', 'noopener'); }
});
V.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.formland !== undefined && FORM) formulareZeigen(e.target.value); });
/* Formular selbst hochladen – neu oder als Ersatz für eine Anlage */
function formHochladen(x) {
  modalBox(`<h3>${x ? 'Formular ersetzen' : 'Formular hochladen'}</h3>
    <div class="row"><label>Anlage</label><input id="fhNr" value="${esc(x ? x.nr : '')}" placeholder="z. B. I/2 – leer: aus dem Dateinamen erkannt"${x && x.nr ? ' disabled' : ''}></div>
    <div class="row"><label>Titel</label><input id="fhTi" value="${esc(x ? x.titel : '')}" placeholder="leer = Dateiname"></div>
    <div class="row"><label>PDF-Datei</label><input id="fhDa" type="file" accept="application/pdf,.pdf"></div>
    <p class="ba-hilfe">Die Datei wird für ${esc(FORM.laender[FORM.land])} gespeichert und im Bauantrag wie die Formulare vom Portal benutzt.</p>
    <div class="acts"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Hochladen</button></div>`,
  async (m, bg, close) => {
    if (m !== 'ok') { close(); return; }
    const f = bg.querySelector('#fhDa').files[0]; if (!f) { toast('Bitte eine PDF-Datei wählen.', true); return; }
    const fd = new FormData(); fd.append('datei', f); fd.append('land', FORM.land); fd.append('nr', bg.querySelector('#fhNr').value); fd.append('titel', bg.querySelector('#fhTi').value); if (x) fd.append('id', x.id);
    try { const r = await fetch('api/formulare/hochladen', { method: 'POST', body: fd, credentials: 'same-origin' }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Hochladen fehlgeschlagen');
      FORM = d; close(); zeichne(); toast('Formular gespeichert.'); } catch (er) { toast(er.message, true); }
  });
}

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

/* Vorgaben für „Per Mail senden“ (Druckseite ✉, Ansehen-Fenster ⋯ – bp/versand.js): Projekt des Antrags, im Verlauf als „Bauantrag“ */
window.bpMailStandard = () => { const p = (L && L.projekte.find((x) => x.id === PID)) || {}; return { art: 'bauantrag', pid: PID, projekt: p.name || '', link: 'bauantrag:' }; };
function pdf() {   // ein Druck für alles: auf der Druckseite (bpDruck, Baukasten) ankreuzen, was ins PDF soll
  if (!D) return;
  const titel = (k) => { const x = D.paket.find((y) => y.key === k); return !x ? k : x.art === 'trenner' ? `Trennblatt ${x.nr} – ${x.titel}` : (/^[IV]+\//.test(x.nr || '') ? 'Anlage ' + x.nr + ' – ' : '') + x.titel; };
  bpDruck({ titel: `${D.antrag.name} drucken`, name: `${D.antrag.name} – Antragsunterlagen`, merk: 'bauantrag',
    hinweis: 'Links ankreuzen, was ins PDF soll – Auswahl und Reihenfolge der Unterlagen in Schritt 1 und 6.',
    teile: [['anschreiben', 'Anschreiben an die Bauaufsicht', D.anschreiben.an], ['deckblatt', 'Deckblatt mit Inhaltsverzeichnis', D.deckblatt.an],
      ...D.gewaehlt.map((k) => [k, titel(k), true]), ...(D.packliste ? [['packliste', `Packliste – ${D.packliste} Anlage${D.packliste === 1 ? '' : 'n'} zum Dazulegen`, true]] : [])],
    url: (T) => `api/antraege/${AID}/paket.pdf?teile=${T.join(',')}` });
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
  const hz = /(?:^#|&)antrag=(\d+)(?:&bv=(\w+))?/.exec(location.hash);   // aus einem To-do / dem Bautagebuch: Antrag und Bauvorlage
  await laden(hz ? +hz[1] : undefined);
  if (hz) { history.replaceState(null, '', location.pathname); if (hz[2]) { SCHRITT = 'bauvorlagen'; VIEW = null; zeichne(); setTimeout(() => { const z = document.getElementById('bv-' + hz[2]); if (z) { z.scrollIntoView({ block: 'center' }); z.classList.add('ba-treffer'); } }, 200); } }
  if (location.hash === '#formulare') { history.replaceState(null, '', location.pathname); formulareZeigen(''); }   // aus dem To-do „Neues Bauantragsformular“
  BPHead.live(['bauantrag', 'projects', 'contacts'], async () => { await laden(); BPHead.liveNotiz(); }, { projekt: false });   // Änderungen anderer
})().catch((e) => toast(e.message, true));

document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-navneu]')) neuDialog(); });

/* Bauvorlagen: Dateien von Hand zuordnen (aus dem Projekt wählen oder hochladen – landet im Projektordner, an der Bauvorlage nur der Verweis) */
const bvHand = (bv) => (bv.dateien || []).filter((x) => x.hand).map(({ name, pfad }) => ({ name, pfad }));
async function bvExtra(bv, neu, text, alt) {
  const id = AID;
  try { D = await api('api/antraege/' + id, 'PUT', { bauvorlagen: { [bv.key]: { extra: neu } } }); zeichne();
    rueckgaengig(`„${bv.name}“: ${text}`, async () => { D = await api('api/antraege/' + id, 'PUT', { bauvorlagen: { [bv.key]: { extra: alt } } }); zeichne(); }); } catch (e) { toast(e.message, true); }
}
async function bvWahl(key) {
  const bv = D.bauvorlagen.find((x) => x.key === key); if (!bv) return;
  const w = await BPHead.dateiWahl({ project_id: D.antrag.project_id, titel: `Dateien für „${bv.name}“`, schon: bv.dateien.map((x) => x.pfad) });
  if (!w || !w.length) return;
  const alt = bvHand(bv);
  bvExtra(bv, [...alt, ...w.map((x) => ({ name: x.name, pfad: x.pfad }))], `${w.length} Datei${w.length === 1 ? '' : 'en'} zugeordnet`, alt);
}
async function bvHoch(key, files) {
  const bv = D.bauvorlagen.find((x) => x.key === key); if (!bv || !files.length) return;
  const fd = new FormData(); [...files].forEach((f) => fd.append('datei', f));
  const id = AID, alt = bvHand(bv), warte = setTimeout(() => toast('Wird in den Projektordner gelegt …'), 1500);
  try {
    const r = await fetch(`api/antraege/${id}/bauvorlage/${key}`, { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Hochladen fehlgeschlagen');
    D = d; zeichne();
    if (d.fehler && d.fehler.length) toast(d.fehler.join(' · '), true);
    if (d.neu.length) rueckgaengig(`„${bv.name}“: ${d.neu.length} Datei${d.neu.length === 1 ? '' : 'en'} hochgeladen`, async () => { D = await api('api/antraege/' + id, 'PUT', { bauvorlagen: { [key]: { extra: alt } } }); zeichne(); });
  } catch (er) { toast(er.message, true); } finally { clearTimeout(warte); }
}
V.addEventListener('change', (e) => { const i = e.target; if (i.dataset && i.dataset.bvhoch && i.files.length) { const f = [...i.files]; i.value = ''; bvHoch(i.dataset.bvhoch, f); } });
V.addEventListener('dragover', (e) => { const z = e.target.closest && e.target.closest('[data-bvdrop]'); if (z && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); e.stopPropagation(); z.classList.add('over'); } });
V.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-bvdrop]'); if (z) z.classList.remove('over'); });
V.addEventListener('drop', (e) => { const z = e.target.closest && e.target.closest('[data-bvdrop]'); if (!z || !e.dataTransfer.files.length) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('over'); bvHoch(z.dataset.bvdrop, e.dataTransfer.files); });
