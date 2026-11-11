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
  const name = x.art === 'vordruck' ? `<b>${esc(x.nr ? 'Anlage ' + x.nr + ' – ' : '')}${esc(x.titel)}</b>${x.vorschlag ? ` <span class="bap-t v">${esc(x.vorschlag)}</span>` : ''}`
    : `<b>${esc(x.titel)}</b>`;
  const nutz = x.art === 'unterlage' ? `<span class="seg" role="group"><button type="button" data-bapnutz="${x.key}" data-v="ausfuellen" class="${x.nutzung === 'ausfuellen' ? 'on' : ''}">ausfüllen</button><button type="button" data-bapnutz="${x.key}" data-v="beilegen" class="${x.nutzung === 'beilegen' ? 'on' : ''}">nur beilegen</button></span>` : '';
  const platz = !(x.art === 'unterlage' && x.nutzung === 'beilegen') ? `<button type="button" class="btn sm${!x.felder && !x.platziert ? ' pri' : ''}" data-bapplatz="${x.key}" title="Werte auf die Seite setzen – für Vordrucke ohne Formularfelder und Scans">Platzieren …</button>` : '';
  return `<tr class="${x.an ? '' : 'aus'}" data-bapkey="${x.key}">${zieh}<td class="bap-c"><button type="button" class="bap-ck${x.an ? ' an' : ''}" data-bapan="${x.key}" aria-pressed="${x.an}" title="${x.an ? 'Aus dem Antrag nehmen' : 'In den Antrag aufnehmen'}"></button></td>
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
V.addEventListener('dragstart', (e) => { const z = e.target.closest && e.target.closest('[data-bapzieh]'); if (!z) return; BAP_ZIEH = z.dataset.bapzieh; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', BAP_ZIEH); });
V.addEventListener('dragover', (e) => { if (!BAP_ZIEH) return; const tr = e.target.closest('tr[data-bapkey]'); if (!tr || !bapStueck(tr.dataset.bapkey).an) return; e.preventDefault();
  V.querySelectorAll('.bap-ueber').forEach((x) => x.classList.remove('bap-ueber')); tr.classList.add('bap-ueber'); });
V.addEventListener('drop', (e) => {
  if (!BAP_ZIEH) return; const tr = e.target.closest('tr[data-bapkey]'); const k = BAP_ZIEH; BAP_ZIEH = null;
  V.querySelectorAll('.bap-ueber').forEach((x) => x.classList.remove('bap-ueber'));
  if (!tr || tr.dataset.bapkey === k) return; e.preventDefault(); e.stopPropagation();
  const alt = [...D.gewaehlt], neu = alt.filter((x) => x !== k), i = neu.indexOf(tr.dataset.bapkey); if (i < 0) return;
  const r = tr.getBoundingClientRect(); neu.splice(e.clientY > r.top + r.height / 2 ? i + 1 : i, 0, k);
  const id = AID;
  bapSetzen({ reihe: neu }, 'Reihenfolge geändert', async () => { D = await api(`api/antraege/${id}/paket`, 'PUT', { reihe: alt }); zeichne(); });
});
V.addEventListener('dragend', () => { BAP_ZIEH = null; V.querySelectorAll('.bap-ueber').forEach((x) => x.classList.remove('bap-ueber')); });

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
