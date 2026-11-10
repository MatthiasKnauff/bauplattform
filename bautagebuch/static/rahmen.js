'use strict';
/* =====================================================================
   Bautagebuch im Aufbau der Plattform (wie Ausschreibung und Bauzeitenplan) – nur auf breiten Bildschirmen:
   links die Navigation (bpNav) mit Kalender, den Berichten des Tages und den Abschnitten des Berichts,
   oben die Befehlsleiste (befehle), rechts der abdockbare Bereich (seite) mit „Details“ (markierter Eintrag),
   „Foto“ und „PDF“ (Vorschau des Tagesberichts).
   Am Handy und in der einfachen Ansicht bleibt alles wie bisher (Kopfzeile, Reiter, runder ＋-Knopf).
   Alle Befehle laufen über die vorhandenen Aktionen der Seite (data-act → Klick-Verteiler in index.html).
   ===================================================================== */
(function () {
  if (!window.bpNav || !window.befehle || !window.seite) return;   // ohne Baukasten: alter Aufbau
  const q = (s) => document.querySelector(s);
  const APP = q('#app'), DET = q('#detail');
  if (!APP || !DET) return;
  const breit = () => innerWidth >= 1000 && document.documentElement.dataset.modus !== 'einfach';

  /* ---------- Gerüst: #btR (Navigation | Befehlsleiste über Bericht und Bereich rechts) ---------- */
  const R = document.createElement('div'); R.id = 'btR';
  R.innerHTML = '<aside id="navL" class="bp-nav bp-insel" aria-label="Navigation"></aside><div id="rechts"><div id="bfl" class="bp-insel"></div><div id="work"></div></div>';
  APP.insertBefore(R, DET);
  const NAV = q('#navL'), LEISTE = q('#bfl'), WORK = q('#work');
  WORK.appendChild(DET);

  // eine vorhandene Aktion auslösen (derselbe Weg wie ein Klick im Bericht)
  const los = (act, ds = {}) => { const b = document.createElement('button'); b.hidden = true; b.dataset.act = act; Object.assign(b.dataset, ds); document.body.appendChild(b); b.click(); b.remove(); };
  const svg = (n) => IC[n] || IC.doc;
  const tag = (d) => (d ? new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '');

  /* ---------- Navigation links ---------- */
  let kOff = 0, kRid = null;   // Monat des Kalenders (relativ zum Bericht)
  const amTag = (d) => reports.filter((x) => x.date === d).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')) || a.number - b.number);
  function kalender(r) {
    if (kRid !== rid) { kOff = 0; kRid = rid; }
    const d0 = r ? new Date(r.date + 'T12:00') : new Date(), m = new Date(d0.getFullYear(), d0.getMonth() + kOff, 1), y = m.getFullYear(), mo = m.getMonth();
    const tage = new Date(y, mo + 1, 0).getDate(), vor = (m.getDay() + 6) % 7, iso = (t) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(t).padStart(2, '0')}`, heute = todayISO();
    let g = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((t) => `<i>${t}</i>`).join('') + '<span></span>'.repeat(vor);
    for (let t = 1; t <= tage; t++) {
      const k = iso(t), L = amTag(k), x = (r && L.find((z) => z.id === r.id)) || L[0];
      g += x ? `<button type="button" class="${r && r.date === k ? 'on' : ''}${L.length > 1 ? ' zwei' : ''}${k === heute ? ' heute' : ''}" data-act="pickReport" data-id="${x.id}" title="${L.length > 1 ? L.length + ' Berichte' : 'Bericht Nr. ' + esc(x.number)}">${t}</button>`
        : `<span class="${k === heute ? 'heute' : ''}">${t}</span>`;
    }
    return `<div class="bcal bt-kal"><div class="bcal-h"><button type="button" data-btkm="-1" aria-label="Voriger Monat">‹</button><b>${m.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</b><button type="button" data-btkm="1" aria-label="Nächster Monat">›</button></div><div class="bcal-g">${g}</div></div>`;
  }
  function tagesBerichte(r) {   // mehrere Berichte am selben Tag: untergeordnet, aber sichtbar
    if (!r) return '';
    const L = amTag(r.date);
    if (L.length < 2) return '';
    return `<div class="bt-tb"><div class="bt-tbk">${tag(r.date)} · ${L.length} Tagesberichte</div>${L.map((x) => `<button type="button" class="${x.id === r.id ? 'on' : ''}" data-act="pickReport" data-id="${x.id}"><b>${esc(x.time || '–')}</b>${x.number != null ? 'Nr. ' + esc(x.number) : 'Bericht'}${x.site_manager ? ' · ' + esc(x.site_manager) : ''}</button>`).join('')}</div>`;
  }
  // gelöste Navigation (Streifen): statt des Kalenders eine Datums-Kachel – Klick öffnet den Kalender als kleines Fenster (nichts springt beim Aufklappen)
  function datumKachel(r) {
    if (!r) return '';
    const d = new Date(r.date + 'T12:00'), L = amTag(r.date);
    return `<button type="button" class="bt-datum" data-btkal title="Kalender öffnen"><span class="dt"><b>${d.getDate()}</b><small>${d.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '')}</small></span><span class="tx"><b>${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</b><small>${r.number != null ? 'Bericht Nr. ' + esc(r.number) : 'Bericht'}${r.time ? ' · ' + esc(r.time) : ''}${L.length > 1 ? ' · ' + L.length + ' am Tag' : ''} ▾</small></span></button>`;
  }
  let POP = null;
  function kalPop(auf) {
    if (!auf) { if (POP) { POP.remove(); POP = null; } return; }
    const r = curReport(); if (!r) return;
    if (!POP) { POP = document.createElement('div'); POP.className = 'bt-kalpop'; document.body.appendChild(POP);
      POP.addEventListener('click', (e) => { const m = e.target.closest('[data-btkm]'); if (m) { kOff += +m.dataset.btkm; kalPop(true); return; } if (e.target.closest('[data-btkzu]')) kalPop(false); else if (e.target.closest('[data-act="pickReport"]')) setTimeout(() => kalPop(false), 0); }); }
    const b = NAV.getBoundingClientRect();
    POP.style.left = (b.left + 58) + 'px'; POP.style.top = (b.top + 40) + 'px';
    POP.innerHTML = `<button type="button" class="bt-kalzu" data-btkzu title="Schließen">✕</button>${kalender(r)}${tagesBerichte(r)}`;
  }
  NAV.addEventListener('click', (e) => { if (e.target.closest('[data-btkal]')) kalPop(!POP); });
  const anzahl = (s, r) => s.type === 'list' ? r.items.filter((i) => i.kind === s.key).length : s.type === 'images' ? r.images.length : s.type === 'weather' ? (r.temp || r.weather ? 1 : 0) : 1;
  function navNeu() {
    const p = curProject(), r = p ? curReport() : null;
    const L = r ? meta.sections.filter((s) => RENDER[s.type] && s.type !== 'weather') : [];
    const pl = (PLATFORM.apps || []).find((a) => a.key === 'plaene' && a.allowed);
    bpNav(NAV, {
      kopf: p ? { titel: p.name, klein: reports.length ? `${reports.length} Bericht${reports.length === 1 ? '' : 'e'}` : '' } : { titel: 'Kein Projekt gewählt' },
      davor: p ? datumKachel(r) + kalender(r) + tagesBerichte(r) : '',
      gruppen: [
        r ? { titel: `Tagesbericht${r.number != null ? ' Nr. ' + r.number : ''} · ${fmt(r.date)}`, punkte: L.map((s) => { const n = anzahl(s, r), z = s.type === 'list' || s.type === 'images';
          const sc = SECIC[s.key] || SECIC[s.type] || ['doc', 'c-y']; return { id: 'sec:' + s.key, text: s.title, icon: svg(sc[0]), farbe: `var(--${sc[1] || 'c-y'})`, zahl: z ? String(n) : n ? '✓' : '' }; }) } : null,
        p ? { titel: 'Projekt', punkte: [
          { id: 'alle', text: 'Alle Berichte', icon: svg('archive'), zahl: String(reports.length) },
          { id: 'kontakte', text: 'Kontakte', icon: svg('users') },
          { id: 'projekt', text: 'Projektdaten', icon: svg('home') },
          ...(pl ? [{ id: 'plaene', text: 'Pläne & Dateien', icon: svg('folder'), zahl: '↗' }] : [])] } : null,
      ].filter(Boolean),
      aktiv: tab === 'kontakte' ? 'kontakte' : tab === 'projekt' ? 'projekt' : '', attr: 'btnav', lage: true,
      nachher: (el, lage) => { el.classList.toggle('bt-oben', lage === 'oben'); },
      wahl: (id) => {
        if (id.startsWith('sec:')) {
          const k = id.slice(4), hin = () => { const e = document.getElementById('sec-' + k); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
          if (tab !== 'bericht') { los('tab', { t: 'bericht' }); setTimeout(hin, 50); } else hin();
          return;
        }
        if (id === 'alle') return los('repPicker');
        if (id === 'kontakte') return los('tab', { t: 'kontakte' });
        if (id === 'projekt') return los('editProject');
        if (id === 'plaene' && pl) location.href = appUrl(pl);
      },
    });
  }
  NAV.addEventListener('click', (e) => { const b = e.target.closest('[data-btkm]'); if (!b) return; kOff += +b.dataset.btkm; navNeu(); });

  /* ---------- Befehlsleiste ---------- */
  const K = (act, t, ic, tip, more = {}) => ({ t, ic: svg(ic), attrs: `data-act="${act}"${more.attrs || ''}`, tip: tip || t, aus: !!more.aus, rot: !!more.rot });
  function gruppen() {
    const p = curProject(), r = p ? curReport() : null, kein = !r;
    if (tab !== 'bericht') return [
      { titel: 'Zurück', knoepfe: [K('tab', 'Bericht', 'doc', 'Zurück zum Tagesbericht', { attrs: ' data-t="bericht"' })] },
      { titel: 'Finden', rechts: true, html: '<span class="bt-such"></span>', knoepfe: [K('nearest', 'Standort', 'pin', 'Projekt nach Standort wählen')] }];
    return [
      { titel: 'Neu', knoepfe: [K('qOpen', 'Eintrag', 'plus', 'Notiz, Mangel, Anwesende … hinzufügen', { aus: kein }), K('pickFile', 'Foto', 'cam', 'Fotos zum Bericht hinzufügen', { aus: kein }),
        K('adding', 'Mangel', 'warn', 'Mangel eintragen', { attrs: ' data-kind="maengel"', aus: kein || !meta.sections.some((s) => s.key === 'maengel') }), K('addReport', 'Bericht', 'cal', 'Neuer Tagesbericht', { aus: !p })] },
      { titel: 'Bericht', knoepfe: [bwzPrefs().on ? K('bwzStart', 'Schritt für Schritt', 'send', 'Bericht Schritt für Schritt ausfüllen', { aus: kein }) : null,
        K('editHead', headEdit ? 'Fertig' : 'Kopfdaten', 'pencil', 'Nummer, Datum, Uhrzeit, Bauleitung', { aus: kein }), K('delReport', 'Löschen', 'trash', 'Diesen Tagesbericht löschen', { aus: kein, rot: true })] },
      { titel: 'Finden', rechts: true, html: '<span class="bt-such"></span>', knoepfe: [K('nearest', 'Standort', 'pin', 'Projekt nach Standort wählen')] },
      { titel: 'Ausgabe', rechts: true, knoepfe: [K('print', 'PDF', 'pdf', 'PDF des Tagesberichts erstellen und ablegen', { aus: kein }), K('verToggle', 'Verlauf', 'clock', 'Frühere Stände des Berichts', { aus: kein })] },
    ];
  }
  let sig = '';
  const SUCH = q('#btq');
  function leisteNeu() {
    const G = gruppen(), s = JSON.stringify([tab, G.map((g) => [g.titel, (g.knoepfe || []).filter(Boolean).map((k) => [k.t, k.aus])])]);
    if (s !== sig) { sig = s; befehle(LEISTE, G); }
    const ziel = LEISTE.querySelector('.bt-such'); if (SUCH && ziel && SUCH.parentElement !== ziel) ziel.appendChild(SUCH);   // das Suchfeld der Seite wandert mit (Handler bleiben)
  }
  // „Mangel“ und „Foto“: der Abschnitt muss offen und sichtbar sein
  LEISTE.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act="adding"],[data-act="pickFile"]'); if (!b) return;
    const k = b.dataset.act === 'adding' ? b.dataset.kind : (meta.sections.find((s) => s.type === 'images') || {}).key;
    setTimeout(() => { const el = document.getElementById('sec-' + k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
  });

  /* ---------- Bereich rechts: Details · Foto · PDF ---------- */
  let SEL = null, BILD = null, pdfRid = null;
  function detailsHtml() {
    const r = curReport(), i = r && SEL ? r.items.find((x) => x.id === SEL) : null;
    if (!i) return '<div class="bt-leer">Im Bericht einen Eintrag anklicken – hier stehen dann Text, Firma, Fotos und Erinnerung, direkt änderbar.</div>';
    const s = meta.sections.find((x) => x.key === i.kind) || { key: i.kind, title: i.kind, extra: {} }, lk = s.extra && s.extra.link_contacts;
    const kopf = `<div class="bt-dk">${secIc(s)}<b>${esc(s.title)}</b></div>`;
    if (lk) return `<div class="bt-det">${kopf}<div class="bt-f"><label>Firma</label><div class="bt-wert">${esc(i.text)}</div></div>
      <div class="bt-f"><label>Art der Tätigkeit</label><textarea class="ed" rows="2" data-it="${i.id}" data-k="activity">${esc(i.activity)}</textarea></div>
      <div class="bt-f"><label>Anzahl Mitarbeiter</label><input class="cnt" data-it="${i.id}" data-k="headcount" type="number" min="0" value="${i.headcount ?? ''}"></div>
      <div class="bt-f"><label>Fotos</label>${photoUi(i, s, r)}</div></div>`;
    return `<div class="bt-det">${kopf}${s.extra && s.extra.company ? `<div class="bt-f"><label>Firma</label><div class="sgw cow"><input class="co" data-it="${i.id}" data-k="company" ${SGATTR} value="${esc(i.company)}"><div class="sug hidden" role="listbox"></div></div></div>` : ''}
      <div class="bt-f"><label>Text</label><textarea class="ed" rows="4" data-it="${i.id}" data-k="text">${esc(i.text)}</textarea></div>
      ${s.checkable ? `<label class="bt-ck"><input type="checkbox" data-act="toggle" data-id="${i.id}" ${i.done ? 'checked' : ''}> erledigt</label>` : ''}
      ${fotoOk(s) ? `<div class="bt-f"><label>Fotos</label>${photoUi(i, s, r)}</div>` : ''}
      ${s.extra && s.extra.due ? `<div class="bt-f"><label>Erinnerung</label>${dueUi(i, s)}</div>` : ''}</div>`;
  }
  function fotoHtml() {
    const r = curReport(); if (!r) return '<div class="bt-leer">Kein Tagesbericht.</div>';
    if (!r.images.length) return '<div class="bt-leer">Noch keine Fotos in diesem Bericht. Oben „Foto“ oder Bilder in den Bericht ziehen.</div>';
    const i = r.images.find((x) => x.id === BILD) || r.images[0], k = r.images.indexOf(i);
    return `<div class="bt-foto"><div class="bt-fn"><button type="button" class="btn sm" data-btbild="${(r.images[k - 1] || {}).id || ''}"${k > 0 ? '' : ' disabled'}>◀</button><span class="mute">${k + 1} von ${r.images.length}</span><button type="button" class="btn sm" data-btbild="${(r.images[k + 1] || {}).id || ''}"${k < r.images.length - 1 ? '' : ' disabled'}>▶</button></div>
      <a href="uploads/${esc(i.file)}" target="_blank" rel="noopener" class="bt-gross"><img src="uploads/${esc(i.file)}" alt="${esc(i.caption || 'Baustellenfoto')}"></a>
      <div class="bt-f"><label>Beschreibung</label><input class="cap" data-img="${i.id}" value="${esc(i.caption)}" maxlength="120" autocomplete="off"></div>
      <div class="bt-mini">${r.images.map((x) => `<img src="api/thumb/240/${esc(x.file)}" alt="" data-btbild="${x.id}" class="${x.id === i.id ? 'on' : ''}">`).join('')}</div></div>`;
  }
  let pdfEl = null;
  function pdfNeu(erzwingen) {
    if (!pdfEl || !pdfEl.isConnected) return;
    if (!rid) { pdfEl.innerHTML = '<div class="bt-leer">Kein Tagesbericht.</div>'; pdfRid = null; return; }
    if (!erzwingen && pdfRid === rid && pdfEl.querySelector('iframe')) return;
    pdfRid = rid;
    pdfEl.innerHTML = `<div class="bt-pdf"><div class="bt-pk"><span class="mute">Vorschau – wird erst mit „PDF“ abgelegt</span><button type="button" class="btn sm" data-btpdf>↻ Neu laden</button></div><iframe title="Vorschau des Tagesberichts" src="api/reports/${rid}/pdf?vorschau=1#view=FitH"></iframe></div>`;
  }
  function bereich() {
    seite(WORK, 'bt', [
      { id: 'details', titel: 'Details', fenster: false, mount: (el) => { el.innerHTML = `<div class="sr-pad">${detailsHtml()}</div>`; } },
      { id: 'foto', titel: 'Foto', fenster: false, mount: (el) => { el.innerHTML = `<div class="sr-pad">${fotoHtml()}</div>`; } },
      { id: 'pdf', titel: 'PDF', mount: (el) => { pdfEl = el; pdfRid = null; pdfNeu(); } },
    ], { start: 'details', w: 0.62, minL: 420 });
  }
  const fuellen = (id) => { const a = document.activeElement; if (a && a.closest && a.closest('.sr-r') && a.matches('input,textarea')) return; seiteFuellen('bt', id); };   // nicht unter dem Cursor neu zeichnen
  WORK.addEventListener('click', (e) => {
    if (e.target.closest('[data-btpdf]')) { pdfNeu(true); return; }
    const bb = e.target.closest('[data-btbild]'); if (bb) { if (bb.dataset.btbild) { BILD = +bb.dataset.btbild; seiteFuellen('bt', 'foto'); } return; }
    if (!breit()) return;
    const img = e.target.closest('#detail .imgs a'); if (img) {   // Foto im Bericht → groß im Bereich rechts
      const c = img.parentElement.querySelector('[data-img]'); if (!c) return;
      e.preventDefault(); e.stopPropagation(); BILD = +c.dataset.img; seiteReiter('bt', 'foto'); seiteFuellen('bt', 'foto'); return;
    }
    const ln = e.target.closest('#detail .ln'); if (ln && !e.target.closest('[data-act="delItem"]')) {
      const f = ln.querySelector('[data-it]'), id = f ? +f.dataset.it : null; if (!id || id === SEL) return;
      SEL = id; markieren(); fuellen('details');
    }
  }, true);
  const markieren = () => DET.querySelectorAll('.ln').forEach((x) => { const f = x.querySelector('[data-it]'); x.classList.toggle('bt-sel', !!f && +f.dataset.it === SEL); });

  /* ---------- mehrere Berichte am Tag: Uhrzeiten neben dem Titel ---------- */
  function pillen() {
    const r = curReport(), h = DET.querySelector('.kopf .kp-1 h3'); if (!r || !h || h.querySelector('.bt-pz')) return;
    const L = amTag(r.date); if (L.length < 2) return;
    h.insertAdjacentHTML('beforeend', `<span class="bt-pz">${L.map((x) => `<button type="button" class="${x.id === r.id ? 'on' : ''}" data-act="pickReport" data-id="${x.id}" title="Bericht Nr. ${esc(x.number)}">${esc(x.time || 'Nr. ' + x.number)}</button>`).join('')}</span>`);
  }

  /* ---------- an die Seite anhängen: nach jedem Zeichnen nachführen ---------- */
  let war = null;
  function nachher() {
    const an = breit();
    document.body.classList.toggle('bt-rahmen', an);
    if (!an) { war = false; return; }
    const r = curReport();
    if (SEL && !(r && r.items.some((x) => x.id === SEL))) SEL = null;
    if (BILD && !(r && r.images.some((x) => x.id === BILD))) BILD = null;
    navNeu(); leisteNeu(); markieren(); pillen();
    if (war === false || pdfRid !== rid) { pdfNeu(); }
    fuellen('details'); fuellen('foto');
    war = true;
  }
  const alt = renderDetail;
  renderDetail = function () { const x = alt.apply(this, arguments); nachher(); return x; };
  addEventListener('resize', () => { clearTimeout(nachher.t); nachher.t = setTimeout(() => { if (breit() !== (war === true)) nachher(); }, 150); });
  document.body.classList.add('bp-alt');   // Grundregeln des Baukastens nur in den Bausteinen (.bp-insel)
  bereich(); bpNav.breite(NAV, { key: 'bt' });
  if (breit()) document.body.classList.add('bt-rahmen');
})();
