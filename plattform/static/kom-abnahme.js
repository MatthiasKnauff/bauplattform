'use strict';
/* Kommunikation – Abnahme vor Ort: Angaben → Mängel (mit Fotos) → Erklärung → drei Unterschriften am Gerät → abschließen.
   Server: plattform/kom_abnahme.py, Logik und PDF: bpcore/abnahme.py. Gespeichert wird laufend (Entwurf); fällt das Netz kurz aus,
   bleibt der Stand im Gerät und wird beim nächsten Speichern nachgeholt. Nach dem Unterschreiben gesperrt – Ergänzungen als Nachtrag.
   Gemeinsame Namen aus kommunikation.html: projekt, laden, beteiligte. */
const ABN = { S: ['Angaben', 'Mängel', 'Erklärung', 'Unterschreiben'] };
const abnLS = { get(id) { try { return JSON.parse(localStorage.getItem('abn.' + id) || 'null'); } catch { return null; } },
  set(id, v) { try { localStorage.setItem('abn.' + id, JSON.stringify(v)); } catch { /* ohne Speicher: nur Server */ } },
  weg(id) { try { localStorage.removeItem('abn.' + id); } catch { /* egal */ } } };
const abnDe = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : '');
const abnPlus = (iso, tage) => { const d = new Date((iso || new Date().toISOString().slice(0, 10)) + 'T12:00'); d.setDate(d.getDate() + tage); return d.toISOString().slice(0, 10); };
const ROLLE = { ag: 'Auftraggeber', an: 'Auftragnehmer', arch: 'Architekt/Ingenieur' };

async function abnahmeNeu(nachtragZu) {
  const p = projekt(); if (!p) { toast('Bitte oben zuerst ein Projekt wählen.', true); if (window.BPHead && BPHead.projektWahl) BPHead.projektWahl({}); return; }
  try {
    const V = await api('api/abnahme/vorlage?pid=' + p.id);
    const d = { teilnehmer: { ag: V.ag_person || V.auftraggeber || '', arch: V.architekt || '', an: '' } };
    const A = await api('api/abnahme', 'POST', { pid: p.id, daten: d, nachtrag_zu: nachtragZu || undefined });
    abnahmeOeffnen(A.id, A, V);
  } catch (e) { toast(e.message, true); }
}

async function abnahmeOeffnen(id, A0, V0) {
  let A, V;
  try { A = A0 || await api('api/abnahme/' + id); V = V0 || (A.status === 'entwurf' ? await api('api/abnahme/vorlage?pid=' + A.project_id).catch(() => null) : null); }
  catch (e) { toast(e.message, true); return; }
  const lokal = abnLS.get(id);   // ungespeicherter Stand im Gerät (Netz war weg)?
  if (lokal && A.status === 'entwurf' && lokal.t > Date.parse(A.zeit || 0)) A.daten = lokal.d;
  const S = { schritt: A.status === 'entwurf' ? 0 : 4, A, V, d: A.daten, ti: 0, offen: false };
  const bg = modalBox('<div class="ab-k"><b class="ab-t"></b><button type="button" class="ib ab-x" data-m="x" title="Schließen – der Stand ist gespeichert">✕</button></div><div class="ab-st"></div><div class="ab-b"></div><div class="acts ab-acts"></div>',
    (m, bgx, close, b) => klick(m, b, close));
  bg.querySelector('.modal').classList.add('ab');
  const $b = (s) => bg.querySelector(s);
  const gesperrt = () => S.A.status !== 'entwurf';

  async function speichern(leise = true) {
    if (gesperrt()) return true;
    clearTimeout(S.ti); S.offen = false;
    abnLS.set(id, { t: Date.now(), d: S.d });
    try { S.A = await api('api/abnahme/' + id, 'PUT', { daten: S.d }); S.d = S.A.daten; abnLS.weg(id); return true; }
    catch (e) { if (!leise) toast(e.message + ' – der Stand bleibt im Gerät und wird nachgeholt.', true); return false; }
  }
  const spaeter = () => { S.offen = true; clearTimeout(S.ti); S.ti = setTimeout(() => speichern(), 1500); };

  function zeichne() {
    const d = S.d, n = S.schritt;
    bg.querySelector('.modal').classList.toggle('zu', gesperrt());   // fertig: nur so hoch wie nötig
    $b('.ab-t').textContent = (S.A.bezug ? 'Nachtrag zur Abnahme' : 'Abnahme') + (d.firma ? ' · ' + d.firma : '');
    $b('.ab-st').innerHTML = gesperrt() ? `<span class="ab-ok">✓ Unterschrieben am ${abnDe(d.unterschrieben)} – gesperrt</span>`
      : ABN.S.map((t, i) => `<button type="button" data-m="s${i}" class="${i === n ? 'on' : i < n ? 'da' : ''}"><i>${i + 1}</i>${t}</button>`).join('');
    $b('.ab-b').innerHTML = gesperrt() ? fertig() : [angaben, maengel, erklaerung, unterschreiben][n]();
    $b('.ab-acts').innerHTML = gesperrt() ? '<button type="button" class="btn" data-m="x">Schließen</button>'
      : `<button type="button" class="btn" data-m="${n ? 's' + (n - 1) : 'weg'}">${n ? 'Zurück' : 'Entwurf löschen'}</button>`
        + (n < 3 ? `<button type="button" class="btn pri" data-m="s${n + 1}">${n === 2 ? 'Unterschreiben' : 'Weiter'}</button>`
          : `<button type="button" class="btn pri" data-m="fertig"${S.A.fehlt.length || !alleDa() ? ' disabled' : ''}>Abschließen &amp; ablegen</button>`);
  }
  const feld = (lab, html, cls = '') => `<label class="ab-f ${cls}"><span>${lab}</span>${html}</label>`;
  const inp = (k, v, attr = '') => `<input data-k="${k}" value="${esc(v || '')}" ${attr}>`;

  function angaben() {
    const d = S.d, L = (S.V && S.V.auftraege) || [];
    return `${L.length ? `<div class="ab-h">Auftrag wählen <small>aus der Ausschreibung</small></div><div class="ab-auf">${L.map((a, i) => `<button type="button" data-m="auf" data-i="${i}" class="${d.lv_id === a.lv_id ? 'on' : ''}">
        <b>${esc(a.firma)}</b><small>${esc(a.arbeiten || a.lv)}${a.auftrag_vom ? ' · Auftrag vom ' + abnDe(a.auftrag_vom) : ''}${a.abnahme ? ' · abgenommen ' + abnDe(a.abnahme) : ''}</small></button>`).join('')}</div>` : ''}
      <div class="ab-h">${L.length ? 'oder von Hand' : 'Auftragnehmer'}</div>
      ${feld('Auftragnehmer (Firma)', inp('firma', d.firma, 'autocomplete="off"'))}${feld('Anschrift', inp('firma_adresse', d.firma_adresse, 'placeholder="Straße, PLZ Ort"'))}
      <div class="ab-2">${feld('Arbeiten', inp('arbeiten', d.arbeiten, 'placeholder="z. B. Tischlerarbeiten"'))}${feld('Auftrag vom', inp('auftrag_vom', d.auftrag_vom, 'type="date"'))}</div>
      <div class="ab-2">${feld('Abnahme am', inp('abnahme_am', d.abnahme_am, 'type="date"'))}${feld('Ort (optional)', inp('ort', d.ort, 'placeholder="z. B. Baustelle, 1. OG"'))}</div>
      <div class="ab-h">Teilnehmer</div>
      ${Object.entries({ ag: 'für den Auftraggeber', arch: 'für den Architekten', an: 'für den Auftragnehmer' }).map(([r, t]) => feld(t, `<input data-t="${r}" value="${esc((d.teilnehmer || {})[r] || '')}" autocomplete="off">`)).join('')}`;
  }

  function maengel() {
    const d = S.d, M = d.maengel || [], F = Object.fromEntries((S.A.fotos || []).map((f) => [f.id, f]));
    const fn = (d.firma || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const da = new Set(M.map((m) => m.item_id).filter(Boolean));
    const offen = ((S.V && S.V.maengel) || []).filter((m) => !da.has(m.item_id) && fn.some((w) => (m.firma || '').toLowerCase().includes(w)));
    return `<div class="ab-ml">${M.map((m, i) => `<div class="ab-m" data-mi="${i}"><span class="ab-n">${i + 1}</span>
        <div class="ab-mt"><textarea data-mt="${i}" rows="2" placeholder="Mangel – Art und Ort">${esc(m.text)}</textarea>
        <div class="ab-mf">${(m.fotos || []).filter((f) => F[f]).map((f) => `<span class="ab-fo"><img src="api/datei/${f}" alt="" data-m="fz" data-f="${f}"><button type="button" data-m="fweg" data-i="${i}" data-f="${f}" aria-label="Foto entfernen">✕</button></span>`).join('')}
          <label class="ab-fa" title="Foto aufnehmen oder wählen">📷<input type="file" accept="image/*" capture="environment" data-foto="${i}" hidden></label></div></div>
        <button type="button" class="ib" data-m="mweg" data-i="${i}" aria-label="Mangel entfernen">✕</button></div>`).join('') || '<p class="mute ab-leer">Noch keine Mängel. Ohne Mängel unter „Erklärung“ „keine Mängel festgestellt“ wählen.</p>'}</div>
      <button type="button" class="ab-plus" data-m="mneu">＋ Mangel <small>🎤 Diktieren über die Tastatur</small></button>
      ${offen.length ? `<button type="button" class="btn sm ab-ueb" data-m="ueb">Offene Mängel der Firma aus „Aufgaben &amp; Mängel“ übernehmen (${offen.length})</button>` : ''}`;
  }

  function erklaerung() {
    const d = S.d, e = d.erkl || {}, ab = (S.A.erkl || []);
    const fr = [7, 14, 21].map((t) => `<button type="button" class="chip" data-m="frist" data-t="${t}">${t / 7} Woche${t > 7 ? 'n' : ''}</button>`).join('');
    return `<div class="ab-h">Für den Architekten/Ingenieur <small>antippen – nicht Zutreffendes erscheint im PDF nicht</small></div>
      <div class="ab-er">${ab.map((x) => `<button type="button" data-m="erkl" data-e="${x.key}" class="${e[x.key] ? 'on' : ''}"><i></i>${esc(x.text)}</button>`).join('')}</div>
      <div class="ab-2">${feld('Mängel beseitigen bis', inp('frist', d.frist, 'type="date"') + `<span class="ab-chips">${fr}</span>`)}
        ${feld('Gewährleistung', `<span class="ab-chips">${[[4, '4 Jahre (VOB/B)'], [5, '5 Jahre (BGB)'], [2, '2 Jahre'], [0, 'keine']].map(([j, t]) => `<button type="button" class="chip${+d.gw_jahre === j ? ' on' : ''}" data-m="gw" data-j="${j}">${t}</button>`).join('')}</span>`)}</div>
      <p class="mute ab-gw">${S.A.gw_beginn ? `Gewährleistungsfrist – Beginn ${abnDe(S.A.gw_beginn)}, Ende ${abnDe(S.A.gw_ende)}` : 'Gewährleistung beginnt erst mit der Abnahme („Die Leistungen werden abgenommen“).'}</p>
      ${feld('Erklärungen des Auftragnehmers zur Nachbesserung (optional)', `<textarea data-k="an_erklaerung" rows="3">${esc(d.an_erklaerung || '')}</textarea>`)}`;
  }

  const alleDa = () => ['ag', 'an', 'arch'].every((r) => (S.d.unterschriften || {})[r]) && ['ag', 'an', 'arch'].some((r) => !(S.d.unterschriften[r] || {}).fehlt);
  function unterschreiben() {
    const U = S.d.unterschriften || {}, T = S.d.teilnehmer || {};
    return `${S.A.fehlt.length ? `<div class="ab-warn">Es fehlt noch: ${S.A.fehlt.map(esc).join(' · ')}</div>` : ''}
      <p class="mute">Nacheinander unterschreiben lassen – mit dem Finger, am besten das Handy quer halten. Wer nicht da ist: „nicht anwesend“.</p>
      <div class="ab-us">${['ag', 'an', 'arch'].map((r) => { const u = U[r]; return `<button type="button" class="ab-u${u ? ' da' : ''}" data-m="sig" data-r="${r}">
        <span class="ab-ur">${ROLLE[r]}</span><b>${esc((u && u.name) || T[r] || '–')}</b>
        ${u && u.png ? `<img src="${u.png}" alt="Unterschrift">` : u && u.fehlt ? '<em>nicht anwesend</em>' : '<em class="ab-hier">✍ hier unterschreiben</em>'}</button>`; }).join('')}</div>
      <p class="mute"><a href="#" data-m="vor">Vorschau als PDF (Entwurf)</a> · Nach „Abschließen“ ist die Abnahme gesperrt, das PDF liegt im Projektordner unter „Abnahmen + Mängel“. Die Mail an die Firma geht nur, wenn du sie danach abschickst.</p>`;
  }

  function fertig() {
    return `<div class="ab-fertig"><p><b>${S.A.bezug ? 'Nachtrag' : 'Abnahme'} ${esc(S.d.firma || '')} vom ${abnDe(S.d.abnahme_am)}</b><br>
      <span class="mute">${(S.d.maengel || []).length} Mängel · Prüfsumme ${esc((S.d.pruefsumme || '').slice(0, 16))}…${S.A.gesendet ? ' · gesendet ' + abnDe(S.A.gesendet) : ''}</span></p>
      <div class="ab-fb"><button type="button" class="btn pri" data-m="vor">📄 PDF ansehen</button><button type="button" class="btn" data-m="mail">✉ An die Firma senden …</button>
      <button type="button" class="btn" data-m="nachtrag" title="Was nach dem Unterschreiben dazukommt – mit eigenem Mängelblatt und eigenen Unterschriften">＋ Nachtrag</button></div></div>`;
  }

  /* ---------- Unterschrift: Vollbild mit Zeichenfläche ---------- */
  function signieren(r) {
    const T = S.d.teilnehmer || {}, u = (S.d.unterschriften || {})[r] || {};
    const el = document.createElement('div'); el.className = 'ab-sig';
    el.innerHTML = `<div class="ab-sk"><b>Unterschrift – ${ROLLE[r]}</b><input value="${esc(u.name || T[r] || '')}" placeholder="Name" aria-label="Name"></div>
      <div class="ab-pad"><canvas></canvas><span class="ab-linie"></span><span class="ab-quer">Tipp: Handy quer halten</span></div>
      <div class="ab-sb"><button type="button" class="btn" data-s="x">Abbrechen</button><button type="button" class="btn" data-s="neu">Neu</button><button type="button" class="btn" data-s="fehlt">nicht anwesend</button><button type="button" class="btn pri" data-s="ok">Übernehmen</button></div>`;
    document.body.appendChild(el);
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), Z = [];   // Z: Striche [[x,y]…] in Bildschirmpunkten
    let akt = null;
    const groesse = () => { const b = cv.getBoundingClientRect(), k = devicePixelRatio || 1; cv.width = b.width * k; cv.height = b.height * k; ctx.setTransform(k, 0, 0, k, 0, 0); malen(); };
    function malen() {
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.strokeStyle = '#1c3a8a'; ctx.lineWidth = 2.6; ctx.lineCap = ctx.lineJoin = 'round';
      for (const s of Z) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1]); ctx.stroke(); }
    }
    const pt = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); akt = [pt(e)]; Z.push(akt); malen(); });
    cv.addEventListener('pointermove', (e) => { if (!akt) return; e.preventDefault(); akt.push(pt(e)); malen(); });
    const ende = () => { akt = null; };
    cv.addEventListener('pointerup', ende); cv.addEventListener('pointercancel', ende);
    addEventListener('resize', groesse); requestAnimationFrame(groesse);
    const zu = () => { removeEventListener('resize', groesse); el.remove(); };
    function png() {   // nur der beschriebene Bereich, höchstens 600 px breit
      const P = Z.flat(); if (P.length < 4) return '';
      const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), x0 = Math.min(...xs) - 6, y0 = Math.min(...ys) - 6, w = Math.max(...xs) - x0 + 6, h = Math.max(...ys) - y0 + 6;
      const f = Math.min(1, 600 / w) * 1, o = document.createElement('canvas'); o.width = Math.ceil(w * f); o.height = Math.ceil(h * f);
      const c2 = o.getContext('2d'); c2.scale(f, f); c2.translate(-x0, -y0); c2.strokeStyle = '#1c3a8a'; c2.lineWidth = 2.6; c2.lineCap = c2.lineJoin = 'round';
      for (const s of Z) { c2.beginPath(); s.forEach(([x, y], i) => (i ? c2.lineTo(x, y) : c2.moveTo(x, y))); c2.stroke(); }
      return o.toDataURL('image/png');
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-s]'); if (!b) return;
      const name = el.querySelector('input').value.trim(), zeit = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 19);
      if (b.dataset.s === 'x') return zu();
      if (b.dataset.s === 'neu') { Z.length = 0; malen(); return; }
      const U = { ...(S.d.unterschriften || {}) };
      if (b.dataset.s === 'fehlt') U[r] = { fehlt: true, name, zeit };
      else { const p = png(); if (!p) { toast('Bitte zuerst unterschreiben.', true); return; } U[r] = { png: p, name, zeit }; }
      S.d.unterschriften = U; zu(); speichern(false).then(zeichne);
    });
  }

  async function foto(i, files) {
    const fd = new FormData(); [...files].forEach((f) => fd.append('dateien', f, f.name));
    try {
      if (S.offen) await speichern();
      const r = await fetch('api/abnahme/' + id + '/foto', { method: 'POST', body: fd, credentials: 'same-origin' }), j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status);
      S.d.maengel[i].fotos = [...(S.d.maengel[i].fotos || []), ...j.ids];
      await speichern(false); zeichne();
    } catch (e) { toast(e.message, true); }
  }

  async function klick(m, b, close) {
    if (m === 'x') { await speichern(false); close(); laden(); return; }
    if (/^s\d$/.test(m)) { await speichern(); S.schritt = +m.slice(1); zeichne(); $b('.ab-b').scrollTop = 0; return; }
    const d = S.d;
    if (m === 'auf') { const a = S.V.auftraege[+b.dataset.i]; Object.assign(d, { lv_id: a.lv_id, firma: a.firma, contact_id: a.contact_id, firma_adresse: a.firma_adresse, arbeiten: a.arbeiten, auftrag_vom: a.auftrag_vom });
      d.teilnehmer = { ...(d.teilnehmer || {}), an: (d.teilnehmer || {}).an || a.ansprech || '' }; spaeter(); zeichne(); return; }
    if (m === 'mneu') { d.maengel = [...(d.maengel || []), { id: Date.now().toString(36), text: '', fotos: [] }]; zeichne(); const t = [...bg.querySelectorAll('[data-mt]')].pop(); if (t) t.focus(); return; }
    if (m === 'mweg') { const i = +b.dataset.i, alt = d.maengel[i]; d.maengel.splice(i, 1); spaeter(); zeichne();
      rueckgaengig('Mangel entfernt', () => { d.maengel.splice(i, 0, alt); spaeter(); zeichne(); }); return; }
    if (m === 'fweg') { const M = d.maengel[+b.dataset.i]; M.fotos = M.fotos.filter((f) => f !== +b.dataset.f); spaeter(); zeichne(); return; }
    if (m === 'fz') { BPHead.ansehen([{ url: 'api/datei/' + b.dataset.f, typ: 'bild', name: 'Foto' }]); return; }
    if (m === 'ueb') { const fn = (d.firma || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3), da = new Set((d.maengel || []).map((x) => x.item_id));
      const neu = S.V.maengel.filter((x) => !da.has(x.item_id) && fn.some((w) => (x.firma || '').toLowerCase().includes(w)));
      d.maengel = [...(d.maengel || []), ...neu.map((x) => ({ id: 'i' + x.item_id, text: x.text, item_id: x.item_id, fotos: [] }))]; spaeter(); zeichne(); toast(`${neu.length} Mängel übernommen.`); return; }
    if (m === 'erkl') { const k = b.dataset.e, e = { ...(d.erkl || {}) }; e[k] = !e[k];
      if (e[k] && k === 'keine') e.liste = false; if (e[k] && k === 'liste') e.keine = false; if (e[k] && k === 'abgenommen') e.verweigert = false; if (e[k] && k === 'verweigert') e.abgenommen = false;
      d.erkl = e; await speichern(); zeichne(); return; }
    if (m === 'frist') { d.frist = abnPlus(d.abnahme_am, +b.dataset.t); await speichern(); zeichne(); return; }
    if (m === 'gw') { d.gw_jahre = +b.dataset.j; await speichern(); zeichne(); return; }
    if (m === 'sig') { await speichern(); signieren(b.dataset.r); return; }
    if (m === 'vor') { await speichern(); BPHead.ansehen([{ url: `api/vorgang/${id}.pdf?t=${Date.now()}`, typ: 'pdf', name: S.A.bezug ? 'Nachtrag zur Abnahme' : 'Abnahme' }]); return; }
    if (m === 'weg') { if (!(await bpFrage('Diesen Entwurf löschen?', { ok: 'Löschen', gefahr: true }))) return;
      try { const r = await api('api/abnahme/' + id, 'DELETE'); abnLS.weg(id); close(); laden();
        if (r.papierkorb) rueckgaengig('Entwurf gelöscht', async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); laden(); }); } catch (e) { toast(e.message, true); } return; }
    if (m === 'fertig') {
      if (!(await speichern(false))) return;
      if (!(await bpFrage('Abnahme abschließen?\nDanach ist sie gesperrt – Ergänzungen nur noch als Nachtrag.', { ok: 'Abschließen' }))) return;
      b.disabled = true; b.textContent = 'Wird abgelegt …';
      try {
        const r = await api('api/abnahme/' + id + '/abschliessen', 'POST', {});
        S.A = await api('api/abnahme/' + id); S.d = S.A.daten; zeichne();
        toast(['Abnahme unterschrieben', r.pfad ? 'im Projektordner: ' + r.pfad : r.ablage_fehler ? 'Projektordner: ' + r.ablage_fehler : '', ...(r.folgen || [])].filter(Boolean).join(' · '), !!r.ablage_fehler);
      } catch (e) { toast(e.message, true); zeichne(); }
      return;
    }
    if (m === 'mail') { senden(); return; }
    if (m === 'nachtrag') { close(); abnahmeNeu(id); }
  }

  async function senden() {
    const B = await beteiligte(S.A.project_id).catch(() => []);
    const fn = (S.d.firma || '').toLowerCase();
    const vor = B.find((x) => x.email && (x.id === S.d.contact_id || (x.name || '').toLowerCase() === fn));
    modalBox(`<h3>Abnahme an die Firma senden</h3><div class="fm"><label for="abE">An</label><input id="abE" value="${esc(vor ? vor.email : '')}" placeholder="E-Mail-Adresse" inputmode="email" autocomplete="off">
      <label for="abTx">Text</label><textarea id="abTx" rows="5">Sehr geehrte Damen und Herren,\n\nanbei die unterschriebene Niederschrift zur Abnahme vom ${abnDe(S.d.abnahme_am)}.\n\nMit freundlichen Grüßen</textarea>
      <span></span><label class="kv-ck"><input type="checkbox" id="abK" checked> Kopie an mich</label></div>
      <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Senden</button></div>`, async (m, bg2, close2, b2) => {
      if (m === 'x') { close2(); return; } if (m !== 'ok') return;
      const a = bg2.querySelector('#abE').value.trim(); if (!/^[^@\s<>,;]+@[^@\s<>,;]+\.[A-Za-z]{2,}$/.test(a)) { toast('Bitte eine gültige E-Mail-Adresse.', true); return; }
      b2.disabled = true;
      try { const r = await api('api/abnahme/' + id + '/senden', 'POST', { an: [{ email: a, name: S.d.firma || '', contact_id: vor && vor.email === a ? vor.id : undefined }], text: bg2.querySelector('#abTx').value, kopie: bg2.querySelector('#abK').checked });
        close2(); toast('Gesendet: ' + r.betreff); S.A = await api('api/abnahme/' + id); zeichne(); } catch (e) { b2.disabled = false; toast(e.message, true); }
    });
  }

  bg.addEventListener('input', (e) => {
    const t = e.target, d = S.d; if (gesperrt()) return;
    if (t.dataset.k) d[t.dataset.k] = t.value;
    else if (t.dataset.t) d.teilnehmer = { ...(d.teilnehmer || {}), [t.dataset.t]: t.value };
    else if (t.dataset.mt) d.maengel[+t.dataset.mt].text = t.value;
    else return;
    spaeter();
  });
  bg.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.foto && t.files.length) { foto(+t.dataset.foto, t.files); t.value = ''; return; }
    if (t.dataset.k && /^(abnahme_am|frist)$/.test(t.dataset.k)) speichern().then(zeichne);
  });
  zeichne();
}

/* Einstieg: Knöpfe „🏁 Abnahme“, Einträge im Verlauf, Link #v=<id> */
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-kvabn]'); if (b) { const m = document.querySelector('.kv-fm'); if (m) m.hidden = true; abnahmeNeu(); return; }
  const o = e.target.closest && e.target.closest('[data-abn]'); if (o) { e.preventDefault(); abnahmeOeffnen(+o.dataset.abn); }
});
