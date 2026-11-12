'use strict';
/* Bauantrag – Schritt 1 „Verfahren & Formulare“: welche amtlichen Vordrucke der Antrag braucht (Vorschlag nach Verfahren und Vorhaben,
   an-/abhaken), eigene Unterlagen (PDF, Scan, Foto – ziehen oder auswählen; „ausfüllen“ oder „nur beilegen“), Reihenfolge mit ⋮⋮.
   „Platzieren …“: bei Vordrucken ohne Formularfelder und bei Scans die Werte einmal auf die Seite setzen – gemerkt je Datei, beim
   nächsten Antrag mit derselben Datei füllt sie sich von selbst. Ausgabe: Antragspaket (ein PDF mit Inhaltsverzeichnis).
   Server: plattform/bauantrag_paket.py, bpcore/bauantrag_paket.py. Nutzt D, AID, zeichne() aus bauantrag.js. */
let BAP_ALLE = false, BAP_ZIEH = null;

function bapTag(x) {
  if (x.art === 'unterlage' && x.nutzung === 'beilegen') return '<span class="bap-t">wird beigelegt</span>';
  if (x.felder) return `<span class="bap-t ok">${x.felder} Felder – füllt sich selbst</span>${x.platziert ? ` <span class="bap-t ok">+ ${x.platziert} platziert</span>` : ''}`;
  return x.platziert ? `<span class="bap-t ok">${x.platziert} Werte platziert</span>` : '<span class="bap-t wa">keine Felder – Werte einmal platzieren</span>';
}
function bapZeile(x) {
  const zieh = x.an ? `<td class="bap-z" draggable="true" data-bapzieh="${x.key}" title="Ziehen, um die Reihenfolge zu ändern">⋮⋮</td>` : '<td class="bap-z"></td>';
  const name = x.art === 'vordruck' ? `<b>${esc(/^[IV]+\//.test(x.nr || '') ? 'Anlage ' + x.nr + ' – ' : '')}${esc(x.titel)}</b>${x.vorschlag ? ` <span class="bap-t v">${esc(x.vorschlag)}</span>` : ''}`
    : `<b>${esc(x.titel)}</b>`;
  const nutz = x.art === 'unterlage' ? `<span class="seg" role="group"><button type="button" data-bapnutz="${x.key}" data-v="ausfuellen" class="${x.nutzung === 'ausfuellen' ? 'on' : ''}">ausfüllen</button><button type="button" data-bapnutz="${x.key}" data-v="beilegen" class="${x.nutzung === 'beilegen' ? 'on' : ''}">nur beilegen</button></span>` : '';
  const platz = !(x.art === 'unterlage' && x.nutzung === 'beilegen') ? `<button type="button" class="btn sm${!x.felder && !x.platziert ? ' pri' : ''}" data-bapplatz="${x.key}" title="Werte auf die Seite setzen – für Vordrucke ohne Formularfelder und Scans">Platzieren …</button>` : '';
  return `<tr class="${x.an ? '' : 'aus'}" data-bapkey="${x.key}"${x.an ? ` draggable="true" data-bapzieh-zeile="${x.key}"` : ''}>${zieh}<td class="bap-c"><button type="button" class="bap-ck${x.an ? ' an' : ''}" data-bapan="${x.key}" aria-pressed="${x.an}" title="${x.an ? 'Aus dem Antrag nehmen' : 'In den Antrag aufnehmen'}"></button></td>
    <td>${name}<div class="bap-u">${bapTag(x)}</div></td><td class="bap-a"><div>${nutz}<button type="button" class="btn sm" data-bapsehen="${x.key}">Ansehen</button>${platz}${x.art === 'unterlage' ? `<button type="button" class="btn sm" data-bapweg="${x.key}" title="Unterlage löschen">✕</button>` : ''}</div></td></tr>`;
}

function paketHtml() {
  const P = D.paket || [], V = P.filter((x) => x.art === 'vordruck'), U = P.filter((x) => x.art === 'unterlage');
  const zeig = BAP_ALLE ? V : V.filter((x) => x.an || x.vorschlag);
  const mehr = V.length - zeig.length;
  return `<div class="ba-k"><h3>Amtliche Vordrucke für diesen Antrag<span class="mute">${V.length ? `${V.filter((x) => x.an).length} gewählt · Vorschlag nach Verfahren und Vorhaben` : ''}</span></h3>
    ${V.length ? `<div class="tw"><table class="ba-t bap"><tbody>${zeig.map(bapZeile).join('')}</tbody></table></div>
      ${mehr || BAP_ALLE ? `<button type="button" class="btn sm" data-bapalle>${BAP_ALLE ? 'nur gewählte und vorgeschlagene zeigen' : `alle ${V.length} Vordrucke zeigen`}</button>` : ''}`
      : `<p class="ba-hilfe" style="margin:0">Noch keine amtlichen Vordrucke geladen – oben „Formulare“ → „↻ Jetzt prüfen“ (NRW: Seite der Architektenkammer).${D.haupt_nr ? ` Für dieses Verfahren gilt Anlage ${esc(D.haupt_nr)}.` : ''}</p>`}</div>
    <div class="ba-k"><h3>Eigene Unterlagen<span class="mute">PDF, Scan oder Foto – z. B. Formular der Stadt, Nachbarzustimmung, Vordruck eines anderen Landes</span></h3>
      ${U.length ? `<div class="tw"><table class="ba-t bap"><tbody>${U.map(bapZeile).join('')}</tbody></table></div>` : ''}
      <label class="bap-drop"><input type="file" multiple accept="application/pdf,.pdf,image/*,.heic,.heif,.tif,.tiff" data-baphoch>📎 Dateien hierher ziehen oder <u>auswählen</u>${matchMedia('(pointer: coarse)').matches ? ' · Foto aufnehmen' : ''}</label></div>`;
}

async function bapSetzen(body, text, zurueck) {
  try { D = await api(`api/antraege/${AID}/paket`, 'PUT', body); zeichne(); if (text) rueckgaengig(text, zurueck); }
  catch (e) { toast(e.message, true); }
}
const bapStueck = (k) => (D.paket || []).find((x) => x.key === k);

V.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-bapan],[data-bapnutz],[data-bapsehen],[data-bapplatz],[data-bapweg],[data-bapalle]'); if (!b || !D) return;
  if (b.dataset.bapalle !== undefined) { BAP_ALLE = !BAP_ALLE; zeichne(); return; }
  if (b.dataset.bapan) { const x = bapStueck(b.dataset.bapan), an = !x.an, id = AID;
    return bapSetzen({ key: x.key, an }, `„${x.titel}“ ${an ? 'aufgenommen' : 'herausgenommen'}`, async () => { D = await api(`api/antraege/${id}/paket`, 'PUT', { key: x.key, an: !an }); zeichne(); }); }
  if (b.dataset.bapnutz) { const x = bapStueck(b.dataset.bapnutz), alt = x.nutzung, id = AID; if (alt === b.dataset.v) return;
    return bapSetzen({ key: x.key, nutzung: b.dataset.v }, `„${x.titel}“: ${b.textContent}`, async () => { D = await api(`api/antraege/${id}/paket`, 'PUT', { key: x.key, nutzung: alt }); zeichne(); }); }
  if (b.dataset.bapsehen) { const x = bapStueck(b.dataset.bapsehen);
    BPHead.ansehen([{ url: `api/antraege/${AID}/stueck/${x.key}.pdf?t=${Date.now()}`, typ: 'pdf', name: x.titel }]); return; }
  if (b.dataset.bapplatz) return platzieren(bapStueck(b.dataset.bapplatz));
  if (b.dataset.bapweg) { const x = bapStueck(b.dataset.bapweg), id = AID;
    try { const r = await api('api/unterlagen/' + x.key.slice(1), 'DELETE'); D = r; zeichne();
      rueckgaengig(`„${x.titel}“ gelöscht`, async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); D = await api('api/antraege/' + id); zeichne(); }); }
    catch (er) { toast(er.message, true); } }
});

V.addEventListener('change', async (e) => {
  const inp = e.target; if (inp.dataset.baphoch === undefined || !inp.files.length) return;
  const fd = new FormData(); [...inp.files].forEach((f) => fd.append('datei', f)); inp.value = '';
  const id = AID;
  try {
    const r = await fetch(`api/antraege/${id}/unterlagen`, { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Hochladen fehlgeschlagen');
    D = d; zeichne();
    if (d.fehler && d.fehler.length) toast(d.fehler.join(' · '), true); else toast(`${d.neu.length} Unterlage${d.neu.length === 1 ? '' : 'n'} hinzugefügt.`);
    rueckgaengig(`${d.neu.length} Unterlage${d.neu.length === 1 ? '' : 'n'} hinzugefügt`, async () => { for (const u of d.neu) await api('api/unterlagen/' + u, 'DELETE'); D = await api('api/antraege/' + id); zeichne(); });
  } catch (er) { toast(er.message, true); }
});

/* Reihenfolge: ⋮⋮ ziehen (gilt über Vordrucke und eigene Unterlagen hinweg) */
/* ganze Zeile ziehbar (nicht nur ⋮⋮); die Linie zeigt, wohin sie kommt: obere Hälfte = davor, untere Hälfte = danach */
V.addEventListener('dragstart', (e) => { const z = e.target.closest && e.target.closest('[data-bapzieh],tr[data-bapzieh-zeile]'); if (!z) return;
  BAP_ZIEH = z.dataset.bapzieh || z.dataset.bapziehZeile; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', BAP_ZIEH); });
const bapNach = (tr, e) => { const r = tr.getBoundingClientRect(); return e.clientY > r.top + r.height / 2; };
V.addEventListener('dragover', (e) => { if (!BAP_ZIEH) return; const tr = e.target.closest('tr[data-bapkey]'); if (!tr || !bapStueck(tr.dataset.bapkey).an) return; e.preventDefault();
  V.querySelectorAll('.bap-ueber,.bap-unter').forEach((x) => x.classList.remove('bap-ueber', 'bap-unter')); if (tr.dataset.bapkey !== BAP_ZIEH) tr.classList.add(bapNach(tr, e) ? 'bap-unter' : 'bap-ueber'); });
V.addEventListener('drop', (e) => {
  if (!BAP_ZIEH) return; const tr = e.target.closest('tr[data-bapkey]'); const k = BAP_ZIEH; BAP_ZIEH = null;
  V.querySelectorAll('.bap-ueber,.bap-unter').forEach((x) => x.classList.remove('bap-ueber', 'bap-unter'));
  if (!tr || tr.dataset.bapkey === k) return; e.preventDefault(); e.stopPropagation();
  const alt = [...D.gewaehlt], neu = alt.filter((x) => x !== k), i = neu.indexOf(tr.dataset.bapkey); if (i < 0) return;
  neu.splice(bapNach(tr, e) ? i + 1 : i, 0, k);
  if (neu.join() === alt.join()) return;   // an derselben Stelle losgelassen
  const id = AID;
  bapSetzen({ reihe: neu }, 'Reihenfolge geändert', async () => { D = await api(`api/antraege/${id}/paket`, 'PUT', { reihe: alt }); zeichne(); });
});
V.addEventListener('dragend', () => { BAP_ZIEH = null; V.querySelectorAll('.bap-ueber,.bap-unter').forEach((x) => x.classList.remove('bap-ueber', 'bap-unter')); });

/* ---------- Platzieren: Feld links wählen, dann auf die Stelle im Formular tippen; ziehen, Größe am Eck, ✕ entfernt ---------- */
async function platzieren(x) {
  let I; try { I = await api(`api/antraege/${AID}/platzierung/${x.key}`); } catch (e) { toast(e.message, true); return; }
  const id = AID, alt = JSON.parse(JSON.stringify(I.felder)), F = I.felder;
  let seite = 0, wahl = null, gr = 9;
  const ov = document.createElement('div'); ov.className = 'bap-ed'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Werte platzieren');
  ov.innerHTML = `<div class="bap-ek"><b>Platzieren: ${esc(x.titel)}</b><span class="mute">${I.formularfelder ? `hat ${I.formularfelder} eigene Felder – hier nur, was zusätzlich fehlt` : 'Feld links wählen, dann auf die Stelle im Formular tippen'}</span>
      <span class="seg" role="group" aria-label="Schriftgröße">${[8, 9, 10, 12].map((n) => `<button type="button" data-gr="${n}" class="${n === gr ? 'on' : ''}">${n} pt</button>`).join('')}</span>
      <span class="bap-sn"><button type="button" class="btn sm" data-s="-1">‹</button><span data-sz></span><button type="button" class="btn sm" data-s="1">›</button></span>
      <button type="button" class="btn" data-e="ab">Abbrechen</button><button type="button" class="btn pri" data-e="ok">Speichern</button></div>
    <div class="bap-eb"><div class="bap-pal"><input type="search" placeholder="Feld suchen …" data-such>${I.palette.map((p, i) => `<button type="button" data-pal="${i}" title="${esc(p.wert)}"><b>${esc(p.label)}</b><small>${esc(p.wert || '–')}</small></button>`).join('')}</div>
      <div class="bap-bl"><div class="bap-sei"><img alt="Seite" draggable="false"><div class="bap-lay"></div></div></div></div>`;
  document.body.appendChild(ov);
  const sei = ov.querySelector('.bap-sei'), img = sei.querySelector('img'), lay = sei.querySelector('.bap-lay');
  const pal = (f) => I.palette.find((p) => p.feld === f) || { label: f, wert: '' };
  const ptBreite = () => ((I.seiten[seite] || 0.707) > 1 ? 842 : 595);
  function male() {
    ov.querySelector('[data-sz]').textContent = `Seite ${seite + 1} / ${I.seiten.length}`;
    sei.style.aspectRatio = String(I.seiten[seite] || 0.707);
    const src = `api/antraege/${id}/platzierung/${x.key}/seite/${seite}.png`; if (img.getAttribute('src') !== src) img.src = src;
    const px = sei.clientWidth / ptBreite();
    lay.innerHTML = F.map((p, i) => p.seite !== seite ? '' : `<div class="bap-ch" data-ch="${i}" style="left:${p.x * 100}%;top:${p.y * 100}%;width:${p.w * 100}%;height:${p.h * 100}%;font-size:${p.groesse * px}px">
      <span>${esc(p.feld === 'frei' ? p.text : (pal(p.feld).wert || pal(p.feld).label))}</span><i data-weg="${i}" title="Entfernen">✕</i><u data-gross="${i}" title="Größe ändern"></u></div>`).join('');
  }
  const zu = () => { ov.remove(); window.removeEventListener('resize', male); };
  window.addEventListener('resize', male);
  img.onload = male;
  ov.addEventListener('input', (e) => { if (e.target.dataset.such === undefined) return; const q = e.target.value.toLowerCase();
    ov.querySelectorAll('[data-pal]').forEach((b) => { b.hidden = q && !b.textContent.toLowerCase().includes(q); }); });
  ov.addEventListener('click', async (e) => {
    const t = e.target.closest('button,[data-weg]');
    if (t && t.dataset.e === 'ab') { zu(); return; }
    if (t && t.dataset.e === 'ok') {
      try { D = await api(`api/antraege/${id}/platzierung/${x.key}`, 'PUT', { felder: F }); zu(); zeichne(); toast(`${F.length} Werte platziert – beim nächsten Antrag mit diesem Formular automatisch.`);
        rueckgaengig(`„${x.titel}“: Platzierung geändert`, async () => { D = await api(`api/antraege/${id}/platzierung/${x.key}`, 'PUT', { felder: alt }); zeichne(); }); }
      catch (er) { toast(er.message, true); } return; }
    if (t && t.dataset.s) { seite = Math.max(0, Math.min(I.seiten.length - 1, seite + +t.dataset.s)); male(); return; }
    if (t && t.dataset.gr) { gr = +t.dataset.gr; ov.querySelectorAll('[data-gr]').forEach((b) => b.classList.toggle('on', b === t)); return; }
    if (t && t.dataset.pal) { wahl = I.palette[+t.dataset.pal]; ov.querySelectorAll('[data-pal]').forEach((b) => b.classList.toggle('on', b === t)); sei.classList.add('bap-ziel'); return; }
    if (t && t.dataset.weg) { F.splice(+t.dataset.weg, 1); male(); return; }
  });
  sei.addEventListener('click', async (e) => {
    if (!wahl || e.target.closest('.bap-ch')) return;
    const r = sei.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    let text = '';
    if (wahl.feld === 'frei') { text = await bpEingabe('Text für diese Stelle', '', { ok: 'Setzen' }); if (!text) return; }
    const h = (gr * 1.35) / (ptBreite() / (I.seiten[seite] || 0.707)), w = wahl.feld === 'kreuz' ? 0.025 : 0.3;
    F.push({ feld: wahl.feld, seite, x: Math.max(0, Math.min(1 - w, fx - (wahl.feld === 'kreuz' ? w / 2 : 0.005))), y: Math.max(0, Math.min(1 - h, fy - h / 2)), w, h, groesse: gr, ...(text ? { text } : {}) });
    male();
  });
  let zieh = null;
  lay.addEventListener('pointerdown', (e) => {
    const ch = e.target.closest('.bap-ch'); if (!ch || e.target.closest('[data-weg]')) return;
    e.preventDefault(); ch.setPointerCapture(e.pointerId);
    const i = +ch.dataset.ch, r = sei.getBoundingClientRect();
    zieh = { i, gross: !!e.target.closest('[data-gross]'), x: e.clientX, y: e.clientY, P: { ...F[i] }, W: r.width, H: r.height, el: ch };
  });
  lay.addEventListener('pointermove', (e) => {
    if (!zieh) return; const p = F[zieh.i], dx = (e.clientX - zieh.x) / zieh.W, dy = (e.clientY - zieh.y) / zieh.H;
    if (zieh.gross) { p.w = Math.max(0.015, Math.min(1 - p.x, zieh.P.w + dx)); p.h = Math.max(0.008, Math.min(1 - p.y, zieh.P.h + dy)); }
    else { p.x = Math.max(0, Math.min(1 - p.w, zieh.P.x + dx)); p.y = Math.max(0, Math.min(1 - p.h, zieh.P.y + dy)); }
    Object.assign(zieh.el.style, { left: p.x * 100 + '%', top: p.y * 100 + '%', width: p.w * 100 + '%', height: p.h * 100 + '%' });
  });
  const los = () => { zieh = null; }; lay.addEventListener('pointerup', los); lay.addEventListener('pointercancel', los);
}

/* ---------- Im PDF ausfüllen: die Seiten des Vordrucks mit Eingabefeldern darüber. Was zu einem Antragsfeld gehört (blau, ⇄), wird
   dort gespeichert (und in dessen Quelle: Projektdaten, Adressen …) – steht damit sofort in der Maske und in allen Vordrucken;
   Felder ohne Gegenstück (grau) bleiben bei diesem Vordruck. Andere sehen es live (BPHead.live in bauantrag.js). ---------- */
const AUS = { els: new Set(), key: null, t: 0 };
function ausStuecke() { return (D && D.gewaehlt || []).map((k) => bapStueck(k)).filter((x) => x && x.art !== 'trenner' && !(x.art === 'unterlage' && x.nutzung === 'beilegen')); }
async function ausfuellenIn(el) {
  AUS.els.add(el);
  const S = ausStuecke();
  if (!S.length) { el.innerHTML = '<div class="ba-pleer">Noch kein Vordruck gewählt – in Schritt 1 anhaken.</div>'; return; }
  if (!S.some((x) => x.key === AUS.key)) AUS.key = (S.find((x) => x.felder) || S[0]).key;
  el.innerHTML = `<div class="bap-ak"><span class="seg bap-aw" role="group">${S.map((x) => `<button type="button" data-auswahl="${x.key}" class="${x.key === AUS.key ? 'on' : ''}" title="${esc(x.titel)}">${esc(x.nr ? 'Anl. ' + x.nr : x.titel.slice(0, 22))}</button>`).join('')}</span>
    <span class="bap-al"><i class="bap-l1"></i>gehört zum Antrag – ändert Maske und alle Vordrucke <i class="bap-l2"></i>nur in diesem Vordruck <i class="bap-l3"></i>noch leer</span><span class="bap-zahl"></span></div><div class="bap-ban" hidden></div><div class="bap-as"><div class="ba-pleer">Lade …</div></div>`;
  await ausMalen(el);
}
async function ausMalen(el) {
  const key = AUS.key, box = el.querySelector('.bap-as'); if (!box) return;
  let I; try { I = await api(`api/antraege/${AID}/stueck/${key}/felder`); } catch (e) { box.innerHTML = `<div class="ba-pleer">${esc(e.message)}</div>`; return; }
  if (key !== AUS.key) return;
  const alt = box.querySelector(`.bap-ap[data-k="${key}"]`);
  if (alt && +alt.dataset.n === I.felder.length) {   // nur Werte nachtragen – Eingabe mit Fokus bleibt, wie sie ist
    I.felder.forEach((f, i) => { const x = box.querySelector(`[data-af="${i}"]`); if (!x || x === document.activeElement) return;
      if (f.typ === 'kreuz') x.classList.toggle('an', !!f.wert); else if (x.value !== f.wert) x.value = f.wert; });
    box._felder = I.felder; if (typeof ausExtras === 'function') ausExtras(el);
    return;
  }
  const leer = !I.felder.length, sc = box.closest('.sr-b, .bap-ausv') || box, top = alt ? sc.scrollTop : 0;   // derselbe Vordruck neu gezeichnet: an derselben Stelle bleiben
  box.innerHTML = (leer ? '<p class="ba-hilfe">Dieser Vordruck hat keine Formularfelder – Werte mit „Platzieren …“ in Schritt 1 setzen, dann sind sie hier änderbar.</p>' : '')
    + I.seiten.map((v, n) => `<div class="bap-ap" data-k="${key}" data-n="${I.felder.length}" style="aspect-ratio:${v}"><img alt="Seite ${n + 1}" loading="lazy" src="api/antraege/${AID}/platzierung/${key}/seite/${n}.png">
      ${ausReihe(I.felder, n).map(([f, i]) => f.typ === 'kreuz'
        ? `<button type="button" class="bap-ai k${f.eigen ? ' e' : ''}${f.wert ? ' an' : ''}" data-af="${i}" title="${esc(f.label || f.name)}" style="left:${f.x * 100}%;top:${f.y * 100}%;width:${f.w * 100}%;height:${f.h * 100}%"></button>`
        : f.mehrzeilig ? `<textarea class="bap-ai${f.eigen ? ' e' : ''}" data-af="${i}" data-ak="${esc(f.akey || '')}" title="${esc(f.label ? '⇄ ' + f.label : f.name)}" aria-label="${esc(f.label || f.name)}" style="left:${f.x * 100}%;top:${f.y * 100}%;width:${f.w * 100}%;height:${f.h * 100}%">${esc(f.wert)}</textarea>`
        : `<input class="bap-ai${f.eigen ? ' e' : ''}" data-af="${i}" data-ak="${esc(f.akey || '')}" data-vs="ba" autocomplete="off" value="${esc(f.wert)}" title="${esc(f.label ? '⇄ ' + f.label : f.name)}" aria-label="${esc(f.label || f.name)}" style="left:${f.x * 100}%;top:${f.y * 100}%;width:${f.w * 100}%;height:${f.h * 100}%">`).join('')}</div>`).join('');
  box._felder = I.felder;
  if (typeof ausExtras === 'function') ausExtras(el);   // bauantrag-pdf.js: leere Felder, Herkunft, Zähler, „Alle übernehmen“
  if (top) sc.scrollTop = top;
  const groesse = () => box.querySelectorAll('.bap-ap').forEach((p) => p.style.setProperty('--ph', p.clientHeight + 'px'));
  groesse(); new ResizeObserver(groesse).observe(box);
}
async function ausSpeichern(box, i, wert) {
  const f = box._felder[i], key = AUS.key, id = AID;
  const body = f.platz ? { feld: f.feld, wert } : { name: f.name, wert };
  const vorher = f.wert;
  try { D = await api(`api/antraege/${id}/stueck/${key}/feld`, 'PUT', body); f.wert = wert; zeichne();
    rueckgaengig(`„${f.label || f.name}“ im PDF geändert`, async () => { D = await api(`api/antraege/${id}/stueck/${key}/feld`, 'PUT', { ...body, wert: vorher }); zeichne(); });
  } catch (e) { toast(e.message, true); }
}
document.addEventListener('change', (e) => { const x = e.target; if (!x.dataset || x.dataset.af === undefined) return; const box = x.closest('.bap-as'); if (box && box._felder) ausSpeichern(box, +x.dataset.af, x.value); });
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-auswahl],.bap-ai.k'); if (!b) return;
  if (b.dataset.auswahl) { AUS.key = b.dataset.auswahl; const el = b.closest('.bap-aus'); if (el) ausfuellenIn(el); return; }
  const box = b.closest('.bap-as'), f = box._felder[+b.dataset.af];
  const gruppe = box._felder.filter((x) => x.typ === 'kreuz' && x.name === f.name).length > 1;   // Optionsfeld: genau eines aus mehreren
  if (gruppe) { box.querySelectorAll('.bap-ai.k').forEach((y) => { if (box._felder[+y.dataset.af].name === f.name) y.classList.toggle('an', y === b && !b.classList.contains('an')); });
    ausSpeichern(box, +b.dataset.af, b.classList.contains('an') ? f.an : ''); return; }
  b.classList.toggle('an'); ausSpeichern(box, +b.dataset.af, b.classList.contains('an'));
});
/* nach jeder Änderung (eigene, Maske, andere Benutzer): Werte in allen offenen Ausfüll-Ansichten nachtragen */
function ausAktualisieren() {
  clearTimeout(AUS.t);
  AUS.t = setTimeout(() => { AUS.els.forEach((el) => { if (!el.isConnected) { AUS.els.delete(el); return; } ausMalen(el); }); }, 400);
}
/* ganze Fläche (Handy, Befehlsleiste „Im PDF ausfüllen“) */
function ausfuellenOeffnen() {
  if (!ausStuecke().length) { toast('Noch kein Vordruck gewählt – in Schritt 1 anhaken.', true); return; }
  const ov = document.createElement('div'); ov.className = 'bap-ed'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Im PDF ausfüllen');
  ov.innerHTML = `<div class="bap-ek"><b>Im PDF ausfüllen</b><span class="mute">Änderungen gelten sofort – in der Maske und in allen Vordrucken</span><button type="button" class="btn pri" data-ausfertig>Fertig</button></div><div class="bap-aus bap-ausv"></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-ausfertig]').addEventListener('click', () => ov.remove());
  ausfuellenIn(ov.querySelector('.bap-aus'));
}

/* ---------- Schritt 6: Antragspaket – Anschreiben an die Bauaufsicht, Deckblatt mit Inhaltsverzeichnis (Häkchenliste weiterer
   Unterlagen, eigene ergänzbar), Reihenfolge mit fünf Trennblättern (umbenennen, an/aus, ziehen) ---------- */
let BEH = null;
function paketPruefenHtml() {
  const A = D.anschreiben, Dk = D.deckblatt;
  if (!BEH) api('api/behoerden').then((r) => { BEH = r.behoerden; if (SCHRITT === 'pruefen') zeichne(); }).catch(() => { BEH = []; });
  const beh = BEH || [], b = beh.find((x) => x.id === A.behoerde_id);
  const an = (attr, on, txt) => `<button type="button" class="bap-ck${on ? ' an' : ''}" ${attr} aria-pressed="${on}" title="${txt}"></button>`;
  const reihe = D.gewaehlt.map((k) => D.paket.find((x) => x.key === k)).filter(Boolean);
  const aus = D.paket.filter((x) => x.art === 'trenner' && !x.an);
  const zeile = (x) => x.art === 'trenner'
    ? `<tr class="bap-tr" data-bapkey="${x.key}"><td class="bap-z" draggable="true" data-bapzieh="${x.key}">⋮⋮</td><td class="bap-c">${an(`data-bapan="${x.key}"`, true, 'Trennblatt weglassen')}</td>
        <td><span class="bap-tn">${esc(x.nr)}</span><input class="bap-ti" data-baptitel="${x.nr}" value="${esc(x.titel)}" aria-label="Titel Trennblatt ${x.nr}"></td><td class="bap-a"><div><button type="button" class="btn sm" data-bapsehen="${x.key}">Ansehen</button></div></td></tr>`
    : `<tr data-bapkey="${x.key}"><td class="bap-z" draggable="true" data-bapzieh="${x.key}">⋮⋮</td><td class="bap-c">${an(`data-bapan="${x.key}"`, true, 'Aus dem Antrag nehmen')}</td>
        <td class="bap-ein">${esc(/^[IV]+\//.test(x.nr || '') ? 'Anlage ' + x.nr + ' – ' : '')}${esc(x.titel)} ${bapTag(x)}</td><td class="bap-a"><div><button type="button" class="btn sm" data-bapsehen="${x.key}">Ansehen</button></div></td></tr>`;
  return `<div class="ba-k"><h3>${an('data-baan', A.an, 'Anschreiben beilegen')} Anschreiben an die Bauaufsicht</h3>
      ${A.an ? `<div class="ba-g">
        <label class="ba-f"><span>Behörde aus den Adressen</span><select data-babeh data-bp-auswahl aria-label="Behörde"><option value="">– von Hand –</option>${beh.map((x) => `<option value="${x.id}" data-sub="${esc(x.ort)}"${x.id === A.behoerde_id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
          ${BEH && !beh.length ? '<small class="ba-hilfe">Noch keine Behörde in den Adressen – dort Art „Behörde“ wählen.</small>' : ''}</label>
        <label class="ba-f"><span>Ansprechpartner:in</span><input data-baa="ansprechpartner" value="${esc(A.ansprechpartner)}" placeholder="z. Hd. …">
          ${b && b.personen.length ? `<span class="bap-pers">${b.personen.map((p) => `<button type="button" class="bap-t" data-bapers="${esc(p)}">${esc(p)}</button>`).join('')}</span>` : ''}</label>
        <label class="ba-f"><span>Aktenzeichen (falls schon bekannt)</span><input data-baa="aktenzeichen" value="${esc(A.aktenzeichen)}"></label>
        <label class="ba-f w2"><span>Empfänger (Anschrift)</span><textarea rows="3" data-baa="empfaenger">${esc(A.empfaenger)}</textarea></label>
        <label class="ba-f"><span>Ausfertigungen</span><span class="seg" role="group">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-baaus="${n}" class="${+A.ausfertigungen === n ? 'on' : ''}">${n}-fach</button>`).join('')}</span></label>
        <label class="ba-f w"><span>Betreff</span><textarea rows="2" data-baa="betreff">${esc(A.betreff)}</textarea></label>
        <label class="ba-f"><span>Anlagen im Anschreiben</span><span class="seg" role="group"><button type="button" data-baanl="liste" class="${A.anlagen !== 'verweis' ? 'on' : ''}">ausgeschrieben</button><button type="button" data-baanl="verweis" class="${A.anlagen === 'verweis' ? 'on' : ''}">gemäß Inhaltsverzeichnis</button></span></label>
        <label class="ba-f w"><span>Text ${A.text !== A.text_vorgabe ? '<button type="button" class="ba-q" data-batextvor title="Text wieder aus den Angaben des Antrags">↺ Vorschlag</button>' : ''}</span><textarea rows="8" data-baa="text">${esc(A.text)}</textarea></label>
      </div><button type="button" class="btn sm" data-baansehen>Anschreiben ansehen</button>` : '<p class="ba-hilfe" style="margin:0">Ohne Anschreiben – das Paket beginnt mit dem Deckblatt.</p>'}</div>
    <div class="ba-k"><h3>${an('data-badeck', Dk.an, 'Deckblatt beilegen')} Deckblatt mit Inhaltsverzeichnis<span class="mute">Inhalt und Seitenzahlen kommen aus der Reihenfolge unten</span></h3>
      ${Dk.an ? '<p class="ba-hilfe" style="margin:0">Mit allen Anlagen und ihren Nummern – genannte Anlagen mit ihrem Stand statt der Seitenzahl.</p>' : ''}</div>
    ${anlagenHtml()}
    <div class="ba-k"><h3>Reihenfolge mit Trennblättern<span class="mute">⋮⋮ ziehen · Titel der Trennblätter direkt ändern</span></h3>
      <div class="tw"><table class="ba-t bap"><tbody>${reihe.map(zeile).join('')}</tbody></table></div>
      ${aus.length ? `<p class="ba-hilfe" style="margin:.4rem 0 0">Weggelassen: ${aus.map((x) => `<button type="button" class="bap-t" data-bapan="${x.key}" title="Wieder aufnehmen">＋ ${esc(x.nr)} ${esc(x.titel)}</button>`).join(' ')}</p>` : ''}
      <p class="ba-hilfe" id="baForm" style="margin:.5rem 0"></p><button type="button" class="btn pri" data-pdf>🖨 Drucken …</button>${D.abgabe === 'digital' ? ` <a class="btn" href="api/antraege/${AID}/paket.zip" download title="Je Anlage eine Datei, dazu Anschreiben und Gesamt-PDF – für das Bauportal">⤓ ZIP für das Bauportal</a>` : ''}</div>`;
}
async function baPaket(body, text) {
  const id = AID, vorher = JSON.parse(JSON.stringify({ a: D.anschreiben, d: D.deckblatt }));
  try { D = await api(`api/antraege/${id}/paket`, 'PUT', body); zeichne(); if (text) rueckgaengig(text, async () => {
    const z = { anschreiben: { an: vorher.a.an, empfaenger: vorher.a.empfaenger, ansprechpartner: vorher.a.ansprechpartner, aktenzeichen: vorher.a.aktenzeichen,
      text: vorher.a.text, betreff: vorher.a.betreff, ausfertigungen: vorher.a.ausfertigungen } };
    D = await api(`api/antraege/${id}/paket`, 'PUT', body.deckblatt ? { deckblatt: { an: vorher.d.an } } : body.trenner ? { trenner: body._alt } : z); zeichne(); }); }
  catch (e) { toast(e.message, true); }
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-baan],[data-badeck],[data-baaus],[data-batextvor],[data-baansehen],[data-bapers]'); if (!b || !D) return;
  if (b.dataset.baan !== undefined) return baPaket({ anschreiben: { an: !D.anschreiben.an } }, D.anschreiben.an ? 'Ohne Anschreiben' : 'Mit Anschreiben');
  if (b.dataset.badeck !== undefined) return baPaket({ deckblatt: { an: !D.deckblatt.an } }, D.deckblatt.an ? 'Ohne Deckblatt' : 'Mit Deckblatt');
  if (b.dataset.baaus) return baPaket({ anschreiben: { ausfertigungen: +b.dataset.baaus } }, `${b.dataset.baaus}-fache Ausfertigung`);
  if (b.dataset.batextvor !== undefined) return baPaket({ anschreiben: { text: '' } }, 'Text wieder als Vorschlag');
  if (b.dataset.bapers) return baPaket({ anschreiben: { ansprechpartner: b.dataset.bapers } }, `z. Hd. ${b.dataset.bapers}`);
  if (b.dataset.baansehen !== undefined) BPHead.ansehen([{ url: `api/antraege/${AID}/anschreiben.pdf?t=${Date.now()}`, typ: 'pdf', name: 'Anschreiben' }]);
});
V.addEventListener('change', (e) => {
  const t = e.target; if (!D) return;
  if (t.dataset.baa) return baPaket({ anschreiben: { [t.dataset.baa]: t.value } }, 'Anschreiben geändert');
  if (t.dataset.babeh !== undefined) return baPaket({ anschreiben: { behoerde_id: t.value ? +t.value : null } }, 'Behörde gewählt');
  if (t.dataset.baptitel) { const nr = +t.dataset.baptitel, alt = (D.paket.find((x) => x.key === 't' + nr) || {}).titel;
    return baPaket({ trenner: { nr, titel: t.value }, _alt: { nr, titel: alt } }, `Trennblatt ${nr} umbenannt`); }
});
