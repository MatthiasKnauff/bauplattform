/* Ausschreibung (AVA) – LV drucken, Volltextsuche, Fotos, Rückgängig.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- LV drucken: einfacher Layout-Editor mit Vorschau – in der Vorschau bearbeiten (GO 18.11.2026, Mock „In der PDF-Vorschau bearbeiten“: PV-A1 B1 C1) ----------
   Über jedem Wert, der aus einem Feld kommt, liegt im Entwurf ein unsichtbarer Link (ava_lvdruck.py): „feld/…“ Text des Ausdrucks → kleines
   Fenster am Klickpunkt (Vorbemerkungen/Schlusstext: das Feld links), „ev/…“ Ausschreibungsdaten → die Maske mit nur diesem Feld (Schilder
   blau/gelb, „fürs Projekt übernehmen?“ – lvDaten(…, { felder })), „edit/…“ Position → „Eigenschaften der Position“. B1: Rahmen beim
   Darüberfahren, Schalter „✎ Bearbeitbares zeigen“ (gemerkt). Die gelben Formularfelder sind entfallen. */
const pdfjs = () => BPHead.pdfLib();   // PDF-Bibliothek einmal für alle (head.js)
async function druckEditor() {
  if (!L) return; await flush();
  const lib = await pdfjs().catch((e) => { toast(e.message, true); return null; }); if (!lib) return;
  let lay = null, F = null, tok = 0, verg = false;
  const ov = document.createElement('div'); ov.className = 'bed'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'LV drucken');
  ov.innerHTML = `<div class="bed-bar"><b>LV ${esc(L.nr)} drucken</b><span class="hint">Links das Layout, rechts die Vorschau – alles mit Rahmen anklicken und dort ändern, wo es herkommt.</span><span style="flex:1"></span>
    <label class="bed-zeig" title="Alles, was sich in der Vorschau ändern lässt, mit Rahmen zeigen"><input type="checkbox" data-zeig${LS.get('bedZeig') ? ' checked' : ''}> ✎ Bearbeitbares zeigen</label>
    <button class="btn" data-d="x">Schließen</button><button class="btn" data-d="save" title="Layout und Texte beim LV merken">Layout speichern</button><button class="btn" data-d="pdf">⤓ PDF</button><button class="btn pri" data-d="druck">🖨 Drucken</button></div>
    <div class="dz"><aside class="dz-side"></aside><div class="bed-s"><div class="bed-l">Lade Vorschau …</div></div></div>`;
  document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const side = ov.querySelector('.dz-side'), S = ov.querySelector('.bed-s');
  S.classList.toggle('bed-zeigen', !!LS.get('bedZeig'));
  const CH = [['deckblatt', 'Deckblatt'], ['vorbem', 'Vorbemerkungen'], ['vbpos', 'Vorbemerkungen im LV (Art „V“)'], ['langtext', 'Langtexte'], ['fotos', 'Fotos zu den Positionen'], ['zusammenstellung', 'Zusammenstellung der Titel'], ['bieter', 'Bieterangaben und Unterschrift am Ende'], ['seite_je_titel', 'Jeden Titel auf neuer Seite']];
  let WL = null, layNeu = false; try { WL = await api('api/bp/layouts/lv/wahl'); } catch { WL = null; }   // Druck-Layouts des LV (Verwaltung → Einstellungen → Druck-Layouts)
  const adminJa = !!(window.BPHead && BPHead.me && BPHead.me.is_admin);
  const TLN = tlNummern().size, TLAN = { on: true, v: 'lv', ...(LS.get('lvTlAnl') || {}) };   // Anlage Türliste: anfangs an, gemerkt
  const sideDraw = () => {
    side.innerHTML = (WL && (WL.layouts.length > 1 || adminJa) ? `<label class="dz-l">Layout<select data-lid>${WL.layouts.map((x) => `<option value="${esc(x.id)}"${x.id === (lay.layout_id || WL.vorgabe) ? ' selected' : ''}>${esc(x.name)} · ${esc(x.format)}</option>`).join('')}</select>${adminJa ? '<button type="button" class="btn sm" data-d="layedit" style="margin-top:.3rem">Layouts bearbeiten …</button>' : ''}</label>` : '')
      + `<label class="dz-l">Preise<select data-l="preise"><option value="leer">leer – zum Ausfüllen durch die Bieter:innen</option><option value="schaetzung">mit Schätzpreisen (Kostenanschlag)</option><option value="auftrag"${verg ? '' : ' disabled'}>mit Auftragspreisen${verg ? '' : ' (erst nach der Vergabe)'}</option></select></label>
      <div class="dz-g">${CH.map(([k, l]) => `<label class="dz-c"><input type="checkbox" data-l="${k}"${lay[k] ? ' checked' : ''}> ${l}</label>`).join('')}</div>
      ${TLN ? `<div class="dz-g"><div class="dz-l">Anlagen</div><label class="dz-c"><input type="checkbox" data-tla${TLAN.on ? ' checked' : ''}> Anlage: Fenster- &amp; Türliste (${TLN})</label><div class="dz-tl"${TLAN.on ? '' : ' hidden'} data-tlaw>${TL_VAR.map(([k, l]) => `<label class="dz-c"><input type="radio" name="tlav" data-tlav value="${k}"${TLAN.v === k ? ' checked' : ''}> ${l}</label>`).join('')}<span class="hint">wird beim PDF und Drucken hinten angehängt</span></div></div>` : ''}
      <label class="dz-l">Schriftgröße<select data-l="schrift">${[[8, 'klein'], [9, 'normal'], [10, 'groß']].map(([v, n]) => `<option value="${v}"${lay.schrift === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="dz-l">Vorbemerkungen<textarea data-f="Vorbemerkungen" rows="7" placeholder="z. B. Allgemeine Angaben zur Baustelle, Ausführungszeit, Zufahrt …">${esc(F.Vorbemerkungen)}</textarea></label>
      <label class="dz-l">Schlusstext<textarea data-f="Schlusstext" rows="5">${esc(F.Schlusstext)}</textarea><span class="hint">Zeilen mit „:“ am Ende bekommen eine Schreiblinie.</span></label>`;
    side.querySelector('[data-l="preise"]').value = lay.preise;
  };
  async function laden() {
    const my = ++tok, top = S.scrollTop;
    try {
      const r = await api(`api/lv/${L.id}/druck`, 'POST', { schritt: 'entwurf', layout: lay ? { ...lay, felder: F } : {} });
      if (my !== tok) return;
      const neu = !lay || layNeu; layNeu = false; lay = r.layout; F = r.felder; verg = r.vergeben; if (neu) sideDraw();
      const pdf = await lib.getDocument({ isEvalSupported: false, data: Uint8Array.from(atob(r.pdf), (ch) => ch.charCodeAt(0)) }).promise;
      if (my !== tok) return;
      const frag = document.createDocumentFragment(), breite = Math.min(S.clientWidth - 24, 820);
      for (let n = 1; n <= pdf.numPages; n++) {
        const pg = await pdf.getPage(n), P = BPHead.pdfSeite(pg, breite, { scharf: pdf.numPages <= 12, annot: lib.AnnotationMode.DISABLE }), { v, sc, feld } = P;   // Seite zeichnen wie überall (head.js)
        const box = document.createElement('div'); box.className = 'bed-p'; box.style.width = v.width + 'px'; box.style.height = v.height + 'px';
        box.appendChild(P.cv); frag.appendChild(box); await P.fertig;
        for (const a of await pg.getAnnotations()) {   // unsichtbare Links aus dem Entwurf → Rahmen zum Anklicken (ava_lvdruck.py)
          const m = a.subtype === 'Link' && /bauplattform\.invalid\/(edit|feld|ev)\/([^?#]+)/.exec(a.url || a.unsafeUrl || ''); if (!m) continue;
          const R = feld(a.rect), el = document.createElement('div'); el.className = 'bed-e'; el.dataset.art = m[1];
          if (m[1] === 'edit') { const [pos, f] = m[2].split('/'); el.dataset.pos = decodeURIComponent(pos); el.dataset.feld = f; el.title = f === 'kurz' ? 'Kurztext bearbeiten' : 'Langtext bearbeiten'; }
          else { el.dataset.k = decodeURIComponent(m[2]); el.title = m[1] === 'ev' ? 'Ausschreibungsdaten – ändern, wo der Wert herkommt' : 'Text dieses Ausdrucks ändern'; }
          Object.assign(el.style, { left: R.left + 'px', top: R.top + 'px', width: R.width + 'px', height: R.height + 'px' });
          box.appendChild(el);
        }
      }
      if (my !== tok) return;
      S.replaceChildren(frag); S.scrollTop = top; S.classList.remove('bed-lädt');
    } catch (e) { if (my === tok) { S.classList.remove('bed-lädt'); } if (my === tok) S.innerHTML = `<div class="bed-l">${esc(e.message || 'Vorschau nicht möglich')}</div>`; }
  }
  let t0 = 0; const spaeter = (ms = 500) => { clearTimeout(t0); t0 = setTimeout(laden, ms); };
  function textBearbeiten(ziel) {   // Klick auf einen Positionstext in der Vorschau: derselbe Dialog „Eigenschaften der Position“ wie im LV (ein Dialog für alles)
    const x = (L.data.items || []).find((y) => String(y.id) === ziel.dataset.pos); if (!x) return toast('Position nicht gefunden.', true);
    const vorher = JSON.stringify(x);
    LS.set('eigTab', 'allgemein');   // Kurz- und Langtext stehen im Reiter „Allgemein“
    eigDialog(x.id);
    const alle = document.querySelectorAll('.modal-bg'), bg = alle[alle.length - 1]; if (!bg) return;
    bg.style.zIndex = 9500;
    const mo = new MutationObserver(async () => {   // Dialog zu: speichern und die Vorschau neu aufbauen, wenn sich etwas geändert hat
      if (bg.isConnected) return; mo.disconnect();
      const y = (L.data.items || []).find((z) => z.id === x.id);
      if (JSON.stringify(y || null) === vorher) return;
      try { await flush(); } catch (er) { toast(er.message, true); }
      laden();
    });
    mo.observe(document.body, { childList: true });
  }
  const FELD = { Titel: ['Titel', 1], Bauvorhaben: ['Bauvorhaben', 3], Bauherr: ['Bauherr:in', 4], Aufsteller: ['Planung / Ausschreibung', 4], Hinweis: ['Hinweis unter der Angebotsaufforderung', 3] };
  function feldFenster(z, e) {   // A1: kleines Fenster am Klickpunkt mit genau diesem Text des Ausdrucks
    const k = z.dataset.k;
    if (k === 'Vorbemerkungen' || k === 'Schlusstext') {   // lange Texte: das Feld links (Bereich mit dem Layout), die Vorschau bleibt stehen
      const t = side.querySelector(`[data-f="${k}"]`); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); t.classList.add('bed-blink'); setTimeout(() => t.classList.remove('bed-blink'), 1200); }
      return;
    }
    const [lab, zeilen] = FELD[k] || [k, 2]; ov.querySelectorAll('.bed-pop').forEach((x) => x.remove());
    const p = document.createElement('div'); p.className = 'bed-pop'; p.setAttribute('role', 'dialog');
    p.innerHTML = `<b>${esc(lab)}</b><span class="bed-q">nur dieser Ausdruck des LV</span>${zeilen > 1 ? `<textarea rows="${zeilen}">${esc(F[k] || '')}</textarea>` : `<input value="${esc(F[k] || '')}">`}
      <small class="hint">„Layout speichern“ merkt den Text beim LV.</small><div class="bed-pk"><button class="btn" data-p="x">Abbrechen</button><button class="btn pri" data-p="ok">OK</button></div>`;
    ov.appendChild(p);
    const w = 320, x = Math.min(Math.max(8, e.clientX - 20), innerWidth - w - 8), y = Math.min(e.clientY + 12, innerHeight - p.offsetHeight - 8);
    Object.assign(p.style, { left: x + 'px', top: Math.max(8, y) + 'px', width: w + 'px' });
    const f = p.querySelector('textarea, input'); f.focus(); f.select && f.select();
    p.addEventListener('click', (ev) => { const b = ev.target.closest('[data-p]'); if (!b) return; if (b.dataset.p === 'ok') { F[k] = f.value; laden(); } p.remove(); });
    p.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); p.remove(); } if (ev.key === 'Enter' && f.tagName === 'INPUT') { F[k] = f.value; laden(); p.remove(); } });
  }
  S.addEventListener('click', (e) => {
    const z = e.target.closest('.bed-e'); if (!z) return;
    if (z.dataset.art === 'edit') return textBearbeiten(z);
    if (z.dataset.art === 'feld') return feldFenster(z, e);
    if (z.dataset.art === 'ev') lvDaten(null, { felder: z.dataset.k.split(','), nachher: () => laden() });   // Ausschreibungsdaten: nur dieses Feld, gespeichert wo es herkommt
  });
  ov.addEventListener('input', (e) => { const f = e.target.dataset.f; if (f && F) F[f] = e.target.value; if (f && e.target.closest('.dz-side')) spaeter(1200); });
  ov.addEventListener('change', (e) => {
    const l = e.target.dataset.l, f = e.target.dataset.f;
    if (e.target.matches('[data-zeig]')) { LS.set('bedZeig', e.target.checked); S.classList.toggle('bed-zeigen', e.target.checked); return; }
    if (e.target.matches('[data-tla]')) { TLAN.on = e.target.checked; ov.querySelector('[data-tlaw]').hidden = !TLAN.on; LS.set("lvTlAnl", TLAN); return; }
    if (e.target.matches('[data-tlav]')) { TLAN.v = e.target.value; LS.set("lvTlAnl", TLAN); return; }
    if (e.target.matches('[data-lid]')) { lay = { ...lay, layout_id: e.target.value, layout_neu: true }; layNeu = true; S.classList.add('bed-lädt'); spaeter(0); return; }   // anderes Layout: dessen Einstellungen übernehmen
    if (l) { lay[l] = e.target.type === 'checkbox' ? e.target.checked : l === 'schrift' ? +e.target.value : e.target.value; S.classList.add('bed-lädt'); spaeter(0); }
    else if (f && !e.target.closest('.dz-side')) spaeter(150);   // Deckblatt-Feld verlassen → Vorschau neu
  });
  const zu = () => { clearTimeout(t0); tok++; ov.remove(); document.body.style.overflow = ''; };
  ov.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-d]'); if (!b || !lay) return; const a = b.dataset.d;
    if (a === 'x') return zu();
    if (a === 'layedit') { const ad = ((BPHead.conf || {}).apps || []).find((x) => x.key === 'admin'); if (ad) BPHead.layoutEditor(BPHead.appUrl(ad), 'lv', laden, laden); return; }   // Änderungen sofort in der Vorschau
    if (a === 'save') {
      try {
        const r = await api(`api/lv/${L.id}/druck`, 'POST', { schritt: 'entwurf', speichern: 1, layout: { ...lay, felder: F } });
        L.rev = r.rev; L.data.druck = r.layout; L.data.vorbem = F.Vorbemerkungen; toast('Layout gespeichert – gilt beim nächsten Druck dieses LV.');
      } catch (er) { toast(er.message, true); }
      return;
    }
    const lw = await druckfelder('lv', ''); if (lw == null) return;
    const w = window.BPHead && BPHead.ansehen ? null : window.open('', '_blank'); if (w) w.document.write('<!doctype html><meta charset="utf-8"><title>LV wird erstellt …</title><body style="font:16px system-ui;display:grid;place-items:center;height:90vh;color:#555">LV wird erstellt …</body>');
    try {
      const r = await fetch(`api/lv/${L.id}/druck${lw ? '?' + lw.slice(1) : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layout: { ...lay, felder: F } }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Fehler ' + r.status); }
      const href = URL.createObjectURL(await pdfAnhaengen(await r.blob(), TLN && TLAN.on ? [tlUrl(L.id, TLAN.v)] : []));
      if (!w && window.BPHead && BPHead.ansehen) { BPHead.ansehen([{ url: href, typ: 'pdf', name: pdfName('LV') }]); return; }
      if (w && !w.closed) { w.location.href = href; if (a === 'druck') setTimeout(() => { try { w.print(); } catch { /* Betrachter druckt selbst */ } }, 1200); }
      else { const ln = document.createElement('a'); ln.href = href; ln.download = pdfName('LV'); document.body.appendChild(ln); ln.click(); ln.remove(); }
    } catch (er) { if (w && !w.closed) w.close(); toast(er.message, true); }
  });
  laden();
}

/* Einstellungen → Abrechnung (Büro): welche Nachträge in der Rechnungsprüfung als Leistung zählen */
/* Schema für Vergabe- und Auftragsnummer (C2, 17.11.2026) – die Maske „LV- & Auftragsdaten“ schlägt die Nummer danach vor (ava_lvdaten.py) */
async function nrEinst(h) {
  let E; try { E = await api('api/einstellungen/ava-nummern'); } catch (e) { h.innerHTML = `<p class="bph-mu">${esc(e.message)}</p>`; return; }
  const zeich = () => { h.innerHTML = `<p class="bph-mu">Vorschlag in „LV- &amp; Auftragsdaten“ für Vergabe- und Auftragsnummer. Platzhalter: {projekt} (Anfang des Projektnamens, z. B. A534) · {lv} (LV-Nummer) · {jahr} · {gewerk}.</p>
    <label style="display:grid;gap:.25rem;max-width:26rem">Schema<input data-nrsch value="${esc(E.schema)}"${E.darf ? '' : ' disabled'}></label>
    <p class="bph-mu">Beispiel: <b>${esc(E.beispiel)}</b>${E.schema !== E.vorgabe ? ` · Vorgabe: ${esc(E.vorgabe)}` : ''}</p>${E.darf ? '' : '<p class="bph-mu">Ändern kann die Verwaltung.</p>'}`; };
  zeich();
  h.onchange = async (e) => { if (!e.target.matches('[data-nrsch]')) return;
    try { E = await api('api/einstellungen/ava-nummern', 'PUT', { schema: e.target.value }); zeich(); toast('Schema gespeichert.'); } catch (er) { toast(er.message, true); } };
}
async function abrEinst(h) {
  h.innerHTML = '<p class="bph-mu"><span class="bph-wsp"></span>Lade …</p>';
  let E; try { E = await api('api/einstellungen/abrechnung'); } catch (e) { h.innerHTML = `<p class="bph-mu">${esc(e.message)}</p>`; return; }
  const zeich = () => { h.innerHTML = `<p class="bph-mu">Gilt für das ganze Büro und alle Rechnungsprüfungen (Teil- und Schlussrechnungen, Leistungsstand, Prognose bleibt unberührt).</p>
    <div style="font-weight:600;margin:.6rem 0 .3rem">Nachträge in der Rechnungsprüfung</div>
    <label class="bph-ck" style="display:flex;gap:.5rem;align-items:flex-start;margin:.3rem 0"><input type="radio" name="ntz" value="0"${E.nt_nur_beauftragt ? '' : ' checked'}${E.admin ? '' : ' disabled'} style="width:auto;margin-top:.2rem"><span><b>Angemeldete und beauftragte</b> zählen als Leistung<br><small class="bph-mu" style="margin:0">angemeldete Nachträge mit Aufmaß werden gleich mit vergütet</small></span></label>
    <label class="bph-ck" style="display:flex;gap:.5rem;align-items:flex-start;margin:.3rem 0"><input type="radio" name="ntz" value="1"${E.nt_nur_beauftragt ? ' checked' : ''}${E.admin ? '' : ' disabled'} style="width:auto;margin-top:.2rem"><span><b>Nur beauftragte</b> zählen als Leistung<br><small class="bph-mu" style="margin:0">angemeldete Nachträge werden erst vergütet, wenn sie im LV auf „beauftragt“ stehen</small></span></label>
    <div style="font-weight:600;margin:.9rem 0 .3rem">Aufmaß: Mengenüberschreitung</div>
    <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap"><label>Hinweis (gelb) ab <input type="number" min="0" max="50" data-abr="ueber_ab" value="${E.ueber_ab ?? 0}" style="width:4.5rem"${E.admin ? '' : ' disabled'}> % über der LV-Menge</label>
      <label>rot ab <input type="number" min="1" max="100" data-abr="ueber_rot" value="${E.ueber_rot ?? 10}" style="width:4.5rem"${E.admin ? '' : ' disabled'}> %</label></div>
    <small class="bph-mu">Üblich: Hinweis gleich ab der ersten Mehrmenge, rot ab 10 % (VOB/B § 2 Abs. 3).</small>
    <label class="bph-ck" style="display:flex;gap:.5rem;align-items:center;margin:.6rem 0 0"><input type="checkbox" data-abr="ev_frage"${E.ev_frage !== false ? ' checked' : ''}${E.admin ? '' : ' disabled'} style="width:auto"> Bei Bedarfs- und Wahlpositionen vor dem ersten Aufmaß nachfragen, ob angeordnet</label>
    ${E.admin ? '' : '<p class="bph-mu">Ändern kann die Verwaltung.</p>'}<span class="bph-mu" id="ntzMsg"></span>`; };
  zeich();
  h.onchange = async (e) => { const q = e.target.closest('[data-abr]');
    if (q) { const k = q.dataset.abr, v = q.type === 'checkbox' ? q.checked : q.value;
      try { E = await api('api/einstellungen/abrechnung', 'PUT', { [k]: v }); AMCFG = { ab: E.ueber_ab, rot: E.ueber_rot, ev: E.ev_frage }; zeich(); h.querySelector('#ntzMsg').textContent = '✓ gespeichert'; if (L) render(); } catch (er) { toast(er.message, true); }
      return; }
    const r = e.target.closest('[name=ntz]'); if (!r) return;
    try { E = await api('api/einstellungen/abrechnung', 'PUT', { nt_nur_beauftragt: r.value === '1' }); zeich(); h.querySelector('#ntzMsg').textContent = '✓ gespeichert'; if (L) { L = await api('api/lv/' + L.id); render(); } }
    catch (er) { toast(er.message, true); } };
}
/* PDF-Paket drucken: die Druckseite des Baukastens (bp/druck.js) – vorher fehlende Angaben für den Ausdruck abfragen (druckfelder) */
/* Anlage „Fenster- & Türliste“ (15.11.2026): nur wenn das LV Positionen aus einer Türliste hat – angehängt von der Druckseite (bp/druck.js, anlagen),
   vom LV-Druck und beim Versand an Bieter:innen; Server ava_tuerdruck.py (/api/lv/<id>/tueren.pdf?ganz=0|1) */
function tlNummern(lv = L) {
  const n = new Set(); ((lv && lv.data && lv.data.items) || []).forEach((x) => { const q = String(x.quelle || ''); if (x.tl && q.startsWith('Türliste:')) q.slice(9).split(',').forEach((y) => { y = y.trim(); if (y && y !== '?') n.add(y); }); });
  return n;
}
const TL_VAR = [['lv', 'nur die Elemente dieses LV'], ['ganz', 'ganze Liste']];
const tlUrl = (id, v) => `api/lv/${id}/tueren.pdf?ganz=${v === 'ganz' ? 1 : 0}`;
function tlAnlage(an) { const n = tlNummern().size, id = L && L.id; return n ? [{ key: 'tueren', label: `Anlage: Fenster- & Türliste (${n})`, an: !!an, url: (v) => tlUrl(id, v), varianten: TL_VAR }] : []; }
async function pdfAnhaengen(blob, urls) {   // fertiges PDF + Anlagen → ein PDF (Kern /api/bp/pdf/zusammen)
  if (!urls.length) return blob;
  const fd = new FormData(); fd.append('pdf', blob, '0.pdf');
  for (const [i, u] of urls.entries()) { const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) throw new Error('Anlage: ' + (((await r.json().catch(() => ({}))).error) || r.status)); fd.append('pdf', await r.blob(), i + 1 + '.pdf'); }
  const r = await fetch('api/bp/pdf/zusammen', { method: 'POST', body: fd, credentials: 'same-origin' }); if (!r.ok) throw new Error('Anlagen ließen sich nicht anhängen.'); return r.blob();
}
function paketDruck(o) { return bpDruck({ mail: avMail(o.bereich === 'rechnungsfreigabe' ? 'rechnungspruefung' : 'unterlagen'), anlagen: o.bereich === 'tuerliste' ? [] : tlAnlage(false), ...o, vorher: o.bereich ? () => druckfelder(o.bereich, '') : null }); }
/* Vorgaben für „Per Mail senden“ (Ansehen-Fenster ⋯, Druckseite ✉ – bp/versand.js): das Projekt, auf Wunsch die Firma des Auftrags vorgewählt */
function avMail(art, firma) {
  const p = PROJ.find((x) => x.id === ((L && L.project_id) || pid)) || {}, cid = firma === true ? ((L && L.vergabe) || {}).contact_id : firma;
  return { art: art || 'unterlagen', pid: p.id || null, projekt: p.name || '', link: 'ava:', an: cid ? [{ contact_id: cid, name: '', email: '', on: true }] : [] };
}
window.bpMailStandard = () => avMail('unterlagen');
async function reDruck(r, nachPruefung) {   // Rechnungsfreigabe als PDF-Paket: Freigabe, Prüfblatt, Massenermittlung, Rechnung(en) der Firma – geprüft: „📁 GEPRÜFT ablegen“
  /* Empfänger:innen fürs Senden (15.11.2026): An Bauherrenvertreter:in, sonst Bauherr:in – in Kopie (Cc) die Auftragnehmer:in; alle zu- und abwählbar */
  const pj = (L && L.project_id) || pid, PD = pj ? await api(`api/bp/projekt/${pj}/daten`).catch(() => null) : null, PW = (PD && PD.werte) || {}, an0 = [];
  if (PW.bh_vertreter || PW.bh_vertreter_kid) an0.push({ name: PW.bh_vertreter || '', contact_id: PW.bh_vertreter_kid || undefined, sub: 'Bauherrenvertreter', on: true });
  if (PW.bauherr || PW.bauherr_kid) an0.push({ name: PW.bauherr || '', contact_id: PW.bauherr_kid || undefined, sub: 'Bauherr', on: !an0.length });
  if ((L.vergabe || {}).contact_id) an0.push({ name: L.vergabe.bieter || '', contact_id: L.vergabe.contact_id, sub: 'Auftragnehmer – in Kopie', cc: true, on: true });
  const c = (L.calc.rechnungen || []).find((x) => x.id === r.id) || {}, B = r.belege || [], nb = B.length, g = r.status === 'geprueft', ab = r.data.geprueft_ablage;
  paketDruck({ titel: `${reTitel(r)} – Rechnungsfreigabe ${nachPruefung ? 'ablegen' : 'drucken'}`, bereich: 'rechnungsfreigabe', merk: 'rePaket', name: pdfName('Rechnungsfreigabe', reTitel(r) + (r.re_nr ? ' Nr. ' + r.re_nr : '')),
    hinweis: nachPruefung ? 'Prüfung abgeschlossen – links wählen, was ins Paket gehört, dann „📁 GEPRÜFT ablegen“: es kommt neben die Rechnung der Firma in den Projektordner.' : 'Links ankreuzen, was ins PDF-Paket soll – die Auswahl wird gemerkt.',
    ablegen: g ? { text: ab ? '📁 GEPRÜFT NEU ablegen' : '📁 GEPRÜFT ablegen', vorn: !!nachPruefung, tip: `Dieses Paket in den Projektordner – neben die Rechnung der Firma, gleicher Name mit „${ab ? 'GEPRÜFT NEU' : 'GEPRÜFT'}“`,
      aus: async (blob) => { const fd = new FormData(); fd.append('datei', blob, 'geprueft.pdf');
        try { const rs = await fetch(`api/rechnungen/${r.id}/geprueft_ablegen`, { method: 'POST', body: fd }), d = await rs.json().catch(() => ({ error: 'Fehler ' + rs.status }));
          if (!rs.ok) throw new Error(d.error || 'Fehler ' + rs.status); if (L) { L = await api('api/lv/' + L.id); render(); } toast(d.testserver ? `Testserver: nicht in die Ablage geschrieben (wäre: ${d.pfad})` : `✓ Abgelegt im Projektordner: ${d.pfad}`); return true; }
        catch (er) { toast(er.message, true); return false; } } } : null,
    teile: [['freigabe', 'Rechnungsfreigabe (Zahlbetrag, Unterschriften)', true], ['pruef', 'Prüfblatt (Prüfung im Einzelnen)', true],
      ['aufmass', 'Massenermittlung (Aufmaß)', true, !L.aufmass.length || c.frei, c.frei ? 'Rechnung ohne Aufmaß' : 'noch kein Aufmaß'],
      ...(nb > 1 ? B.map((b) => [`rechnung:${b.id}`, `Rechnung der Firma: ${b.name}`, true]) : [['rechnung', 'Rechnung der Firma (PDF / Scan)', true, !nb, 'keine PDF an der Rechnung']]),
      ['stempel', 'Stempel & meine Unterschrift (an den vorgesehenen Stellen, verschiebbar)', true],
      ['nachweis', 'Sendungsnachweis am Ende (wann an wen per Mail)', true, false, '', 'ohneMail']],   // nur Ausdruck und Ablage – „✉ Senden“ lässt ihn weg
    mail: { ...avMail('rechnungspruefung'), an: an0, link: `ava:#lv=${L.id}&re=${r.id}` },   // so findet der Sendungsnachweis die Mails dieser Rechnung (ava_pruefablage.nachweis_link)
    teilLayouts: { aufmass: 'aufmass' },   // Vorlage der Massenermittlung (15.11.2026) – wie beim Einzelausdruck; Freigabe und Prüfblatt: „Layout“ oben
    url: (t) => `api/lv/${L.id}/pdf?art=rechnung&rid=${r.id}&freigabe=1&teile=${t.join(',')}`,
    stempel: { speichern: async (lage) => {   // nur die Lage merken – mit Rückgängig
      const alt = (L.rechnungen.find((y) => y.id === r.id) || { data: {} }).data.stempel_lage || null, lvId = L.id;
      try { await call('api/rechnungen/' + r.id, 'PUT', { stempel_lage: lage });
        rueckgaengig(lage ? 'Stempel verschoben' : 'Stempel an den vorgesehenen Stellen', async () => { await api('api/rechnungen/' + r.id, 'PUT', { stempel_lage: alt }); await openLv(lvId); });
      } catch (er) { toast(er.message, true); } } } });
}

/* ---------- Volltextsuche: alle LVs (Kurz-/Langtext, OZ, Titel, Nachträge), Bieter, Aufmaß, Rechnungen, Türliste ---------- */
const VQ = { T: 0, tok: 0, L: [], i: -1, box: null };
const VQIC = { lv: '📄', titel: '📁', pos: '▪', text: '📝', nachtrag: '➕', angebot: '🏷', aufmass: '📏', rechnung: '🧾', tuer: '🚪' };
function vqMarkieren(text, q) {
  let h = esc(text || '');
  const worte = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ae|ä/g, '(?:ae|ä)').replace(/oe|ö/g, '(?:oe|ö)').replace(/ue|ü/g, '(?:ue|ü)').replace(/ss|ß/g, '(?:ss|ß)'));
  if (!worte.length) return h;
  try { h = h.replace(new RegExp('(' + worte.join('|') + ')', 'gi'), '<mark>$1</mark>'); } catch { /* ohne Markierung */ }
  return h;
}
function vqZu() { if (VQ.box) { VQ.box.remove(); VQ.box = null; } VQ.i = -1; }
function vqZeigen(q, r) {
  if (!VQ.box) { VQ.box = document.createElement('div'); VQ.box.className = 'vqe'; VQ.box.setAttribute('role', 'listbox'); document.body.appendChild(VQ.box); }
  const rc = $('#vq').getBoundingClientRect(); VQ.box.style.top = (rc.bottom + 6) + 'px'; VQ.box.style.left = Math.max(8, Math.min(rc.left, innerWidth - VQ.box.offsetWidth - 8)) + 'px';
  VQ.L = r.treffer; VQ.i = -1;
  const wo = `<div class="vqe-wo"><span>Suchen in</span><span class="seg sm vq-wo" role="radiogroup" aria-label="Suchen in">${[['lv', 'dieses LV'], ['projekt', 'Projekt'], ['alle', 'alle Projekte']].map(([k, l]) => `<button type="button" data-vqwo="${k}">${l}</button>`).join('')}</span></div>`;
  if (!VQ.L.length) { VQ.box.innerHTML = wo + `<div class="leer">Nichts gefunden zu „${esc(q)}“${vqWo() === 'alle' ? '' : vqWo() === 'lv' ? ' in diesem LV – <a href="#" data-vqalle="projekt">im ganzen Projekt suchen</a>' : ' in diesem Projekt – <a href="#" data-vqalle="alle">in allen Projekten suchen</a>'}.</div>`; vqWoZeigen(); return; }
  let h = wo, grp = '';
  VQ.L.forEach((t, k) => {
    const g = [vqWo() === 'alle' ? t.projekt : '', t.lv].filter(Boolean).join(' › '); if (g !== grp) { grp = g; h += `<div class="g">${esc(g)}${t.archiviert ? ' · Archiv' : ''}</div>`; }
    h += `<button type="button" role="option" data-vqi="${k}"><span class="i">${VQIC[t.art] || '▪'}</span><span class="oz">${esc(t.oz || (t.art === 'angebot' ? 'Bieter' : t.art === 'rechnung' ? 'Rechnung' : t.art === 'tuer' ? 'Tür' : ''))}</span><span class="t">${t.entf ? '<s>' : ''}${vqMarkieren(t.titel, q)}${t.entf ? '</s>' : ''}${t.nt ? ` <small>(${esc(t.nt)})</small>` : ''}</span>${t.text ? `<span class="s">${vqMarkieren(t.text, q)}</span>` : ''}</button>`;
  });
  if (r.mehr) h += '<div class="leer">Weitere Treffer – Suche genauer fassen.</div>';
  VQ.box.innerHTML = h; vqWoZeigen();
}
async function vqSuchen() {
  const q = $('#vq').value.trim(); if (q.length < 2) return vqZu();
  const my = ++VQ.tok;
  try { const r = await api('api/suche?q=' + encodeURIComponent(q) + vqQs()); if (my === VQ.tok && $('#vq').value.trim() === q) vqZeigen(q, r); }
  catch (e) { toast(e.message, true); }
}
async function vqGehe(t) {
  vqZu(); await flush();
  if (t.pid && t.pid !== pid) {   // anderes Projekt: wird auch oben im Kopf gewählt
    pid = t.pid; LS.set('pid', pid); if (window.BPHead) BPHead.projektSetzen(pid);
    const sel = $('#proj'); if (sel && ![...sel.options].some((o) => +o.value === pid)) { const o = document.createElement('option'); o.value = pid; o.textContent = t.projekt; sel.appendChild(o); } if (sel) sel.value = String(pid);
    LIST = await lvListe();
  }
  if (t.art === 'tuer') { tab = 'tueren'; LS.set('tab', tab); TLq = t.titel.replace(/^Tür\s*/, ''); render(); return; }
  if (t.lv_id && (!L || L.id !== t.lv_id)) await openLv(t.lv_id);
  tab = { angebot: 'angebote', aufmass: 'aufmass', rechnung: 'rechnungen', versand: 'versand' }[t.art] || 'lv'; LS.set('tab', tab);
  if (t.art === 'aufmass' && t.pos_id) { amPos = t.pos_id; LS.set('amPos', amPos); }
  if (tab === 'lv' && t.pos_id) {   // Titel darüber aufklappen, Zeile markieren und hinscrollen
    const I = items(), n = I.findIndex((x) => x.id === t.pos_id);
    if (n >= 0) bpBaum.zeige(I, n, lvTiefe, LVZU);
    LVAKT = t.pos_id; LVSEL = new Set();
  }
  render();
  if (tab === 'lv' && t.pos_id) setTimeout(() => {
    const I = items(), n = I.findIndex((x) => x.id === t.pos_id), tr = n >= 0 && lvTr(n);
    if (tr) { tr.scrollIntoView({ block: 'center' }); tr.classList.add('vqblink'); setTimeout(() => tr.classList.remove('vqblink'), 2300); }
  }, 30);
}
$('#vq').addEventListener('input', () => { clearTimeout(VQ.T); VQ.T = setTimeout(vqSuchen, 250); });
$('#vq').addEventListener('focus', () => { if ($('#vq').value.trim().length > 1) vqSuchen(); });
/* Wo suchen: im geöffneten LV, im Projekt oder in allen Projekten – eine Einstellung für Computer und Handy */
function vqWo() { const w = LS.get('vqWo', LS.get('vqAlle', false) ? 'alle' : 'projekt'); return w === 'lv' && !L ? 'projekt' : w; }
function vqQs() { const w = vqWo(); return w === 'alle' || !pid ? '' : '&pid=' + pid + (vSicht() ? '&version_id=' + vSicht() : '') + (w === 'lv' ? '&lv=' + L.id : ''); }
function vqWoZeigen() { const w = vqWo(); document.querySelectorAll('[data-vqwo]').forEach((b) => { b.classList.toggle('on', b.dataset.vqwo === w); b.setAttribute('aria-checked', b.dataset.vqwo === w); b.disabled = b.dataset.vqwo === 'lv' && !L; }); }
document.addEventListener('mousedown', (e) => { const b = e.target.closest && e.target.closest('.vq-wo [data-vqwo]'); if (!b || b.disabled) return; e.preventDefault(); LS.set('vqWo', b.dataset.vqwo); vqWoZeigen(); vqSuchen(); $('#vq').focus(); });   // mousedown: das Suchfeld behält den Fokus
vqWoZeigen();
$('#vq').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { vqZu(); $('#vq').blur(); if (!['lv', 'auftraege'].includes(tab)) $('.rib').classList.add('weg'); return; }
  if (!VQ.box || !VQ.L.length) { if (e.key === 'Enter') vqSuchen(); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); VQ.i = Math.max(0, Math.min(VQ.L.length - 1, VQ.i + (e.key === 'ArrowDown' ? 1 : -1))); VQ.box.querySelectorAll('[data-vqi]').forEach((b) => b.classList.toggle('on', +b.dataset.vqi === VQ.i)); const b = VQ.box.querySelector(`[data-vqi="${VQ.i}"]`); if (b) b.scrollIntoView({ block: 'nearest' }); }
  if (e.key === 'Enter') { e.preventDefault(); vqGehe(VQ.L[Math.max(0, VQ.i)]); }
});
document.addEventListener('mousedown', (e) => {
  if (!VQ.box) return;
  const b = e.target.closest('[data-vqi]'); if (b) { e.preventDefault(); vqGehe(VQ.L[+b.dataset.vqi]); return; }
  const va = e.target.closest('[data-vqalle]'); if (va) { e.preventDefault(); LS.set('vqWo', va.dataset.vqalle); vqWoZeigen(); vqSuchen(); return; }
  if (!e.target.closest('.vqe') && !e.target.closest('.vqb')) vqZu();
});
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) { e.preventDefault(); $('.rib').classList.remove('weg'); $('#vq').focus(); $('#vq').select(); } });
addEventListener('resize', vqZu);

/* ---------- Fotos zu Positionen ---------- */
const fotosVon = (x) => (L && L.bilder && L.bilder[x.id]) || [];
function fotoLeiste(x) {
  const fs = fotosVon(x); if (!fs.length) return '';
  return `<div class="fotos">${fs.map((b, k) => `<figure><img src="api/bild/${b.id}?klein=1" alt="${esc(b.name)}" loading="lazy" data-fzeig="${x.id}" data-k="${k}" title="${esc(b.name)} – groß ansehen"><button class="ib" data-fdel="${b.id}" title="Foto entfernen">✕</button></figure>`).join('')}</div>`;
}
async function fotoHoch(posId, files) {
  files = [...files].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(f.name || '')); if (!files.length) return;
  const fd = new FormData(); fd.append('pos_id', posId); files.forEach((f, k) => fd.append('datei', f, f.name || `Foto ${k + 1}.png`));
  try {
    await flush(); toast(files.length > 1 ? `${files.length} Fotos werden hochgeladen …` : 'Foto wird hochgeladen …');
    const r = await fetch(`api/lv/${L.id}/bilder`, { method: 'POST', body: fd }), j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || r.statusText);
    L = j; OPEN.add(posId); render(); if (window.eigNeu) eigNeu();
  } catch (e) { toast(e.message, true); }
}
document.addEventListener('change', (e) => { const el = e.target; if (el.dataset && el.dataset.foto) { fotoHoch(el.dataset.foto, el.files); el.value = ''; } });
document.addEventListener('click', async (e) => {
  const z = e.target.closest('[data-fzeig]');
  if (z) { const x = items().find((y) => y.id === z.dataset.fzeig); const fs = fotosVon(x).map((b) => ({ url: `api/bild/${b.id}`, name: b.name, typ: 'bild' })); if (window.BPHead && BPHead.ansehen) BPHead.ansehen(fs, +z.dataset.k); else window.open(fs[+z.dataset.k].url, '_blank'); return; }
  const d = e.target.closest('[data-fdel]');
  if (d) { if (!(await bpFrage('Foto entfernen?'))) return; try { await call('api/bild/' + d.dataset.fdel, 'DELETE'); if (window.eigNeu) eigNeu(); } catch (er) { toast(er.message, true); } }
});
document.addEventListener('paste', (e) => {   // Bild aus der Zwischenablage (Screenshot, kopiertes Foto) in den Langtext
  const ta = e.target.closest && e.target.closest('tr.lang'); if (!ta || !L) return;
  const fs = [...(e.clipboardData && e.clipboardData.files || [])].filter((f) => /^image\//.test(f.type)); if (!fs.length) return;
  e.preventDefault(); fotoHoch(items()[+ta.dataset.i].id, fs);
});
document.addEventListener('dragover', (e) => { if (e.target.closest && e.target.closest('tr.lang') && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); e.target.closest('tr.lang').classList.add('drop'); } });
document.addEventListener('dragleave', (e) => { const r = e.target.closest && e.target.closest('tr.lang'); if (r) r.classList.remove('drop'); });
document.addEventListener('drop', (e) => { const r = e.target.closest && e.target.closest('tr.lang'); if (!r || !L || !e.dataTransfer.files.length) return; e.preventDefault(); r.classList.remove('drop'); fotoHoch(items()[+r.dataset.i].id, e.dataTransfer.files); });

/* ---------- Rückgängig / Wiederholen (wie in den anderen Apps): Eingaben, Löschen, Verschieben, Übernahmen ---------- */
let HIST = { id: null, last: null, undo: [], redo: [], t: 0 };
const histLabel = (a, b) => {
  try {
    const A = JSON.parse(a).items || [], Bd = JSON.parse(b).items || [];
    if (Bd.length < A.length) return A.length - Bd.length === 1 ? 'Zeile gelöscht' : `${A.length - Bd.length} Zeilen gelöscht`;
    if (Bd.length > A.length) return Bd.length - A.length === 1 ? 'Zeile hinzugefügt' : `${Bd.length - A.length} Zeilen hinzugefügt`;
    if (A.map((x) => x.id).join() !== Bd.map((x) => x.id).join()) return 'Verschoben';
    const k = A.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(Bd[i]));
    if (k >= 0) return `Pos. ${Bd[k].oz || Bd[k].kurz || ''} geändert`.replace('  ', ' ');
  } catch { /* egal */ }
  return 'Änderung';
};
/* Spaltenbreiten in den Tabellen (LV, Angebote, Aufträge, Aufmaß, Rechnungen) am Spaltenkopf ziehen – je Bereich und Tabelle gemerkt; Doppelklick auf den Griff: zurücksetzen */
const SB = LS.get('sb', {});
document.addEventListener('bp-spalten', () => {   // Spalten gewählt/umgeordnet (/bp/spalten.js): gemerkte Breiten dieses Bereichs passen nicht mehr → verwerfen und neu zeichnen
  const sb = LS.get('sb', {}); let weg = false; Object.keys(sb).forEach((k) => { if (k.startsWith(tab + ':')) { delete sb[k]; if (typeof SB !== 'undefined') delete SB[k]; weg = true; } }); if (weg) LS.set('sb', sb);
  render();
});
function spaltenGriffe() {
  document.querySelectorAll('table.lv thead tr, table.tree thead tr, table.re-z thead tr').forEach((tr) => {
    const t = tr.closest('table'); if (t.dataset.sb) return; t.dataset.sb = '1';
    const key = tab + ':' + (t.className || '').trim().replace(/\s+/g, '.'), w = SB[key] || {};
    const alle = [...tr.children], thsJ = () => alle.filter((h) => getComputedStyle(h).display !== 'none');   // jedes Mal neu: ⚙ Spalten blendet erst nach dem ersten Bild aus   // auch Spalten ohne Breite (ausgeblendet) zählen nicht   // ausgeblendete Spalten (⚙ Spalten) zählen nicht – sonst wäre die „letzteJ()“ unsichtbar und könnte den Rest nicht nehmen
    // wie in Excel: nur die gezogene Spalte ändert sich, alles rechts davon rückt nach; die letzte Spalte nimmt den Rest der Breite
    // nie ein leerer Bereich neben der Tabelle: beim Ziehen nimmt die letzte Spalte den Rest bis zum Rand
    const breite = () => { const sum = thsJ().slice(0, -1).reduce((a, h) => a + (parseFloat(h.style.width) || h.getBoundingClientRect().width), 0); t.style.width = Math.max(sum + 90, platz()) + 'px'; };
    const fest = (ohneBreite) => { if (t.style.tableLayout === 'fixed') return; const v = thsJ(), W = v.map((h) => Math.round(h.getBoundingClientRect().width));   // erst alle messen, dann setzen – abwechselnd rechnete der Browser die Tabelle je Spalte neu
      v.forEach((h, i) => { if (i === v.length - 1) { h.style.width = ''; h.style.minWidth = '90px'; return; } h.style.width = W[i] + 'px'; h.style.minWidth = '0'; }); t.style.tableLayout = 'fixed'; t.classList.add('sb-fest'); if (!ohneBreite) breite(); };
    // proportional: gemerkt wird die Breite, die der Platz beim Ziehen hatte (_b) – wird der Platz breiter oder schmaler (Trenner, Fenster), wachsen bzw. schrumpfen alle Spalten im selben Verhältnis
    // schmalste Breite einer Spalte: so breit wie die längste Zahl bzw. der längste kurze Wert (Feld oder Text) – nichts wird abgeschnitten
    const cv = document.createElement('canvas').getContext('2d');
    const minZahl = (j) => { let w = 0; if (j === 0 && t.classList.contains('baum')) return 120;   // Baumspalte: Text bricht um – darf schmal werden (nicht unter 120 px)
      const R = t.tBodies[0] ? [...t.tBodies[0].rows].slice(0, 400) : [];   // j = Index der Zelle in der Zeile
      for (const row of R) { if (row.cells.length !== alle.length) continue; const c = row.cells[j]; if (!c) continue;
        const cs = getComputedStyle(c), inp = c.querySelector('input:not([type=checkbox]),select');
        if (inp) {   // Zahl in einem Eingabefeld (Aufträge): Text des Felds messen
          const is = getComputedStyle(inp); if (!String(inp.value).trim() || (j === 0 && inp.value.length > 14)) continue;   // jedes Feld mit kurzem Inhalt (Zahl, KG, Art, EH) – nie abgeschnitten
          cv.font = `${is.fontWeight} ${is.fontSize} ${is.fontFamily}`; w = Math.max(w, Math.ceil(cv.measureText(inp.value).width + parseFloat(is.paddingLeft) + parseFloat(is.paddingRight) + parseFloat(is.borderLeftWidth) * 2 + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 4); continue; }
        if (!c.textContent.trim() || c.querySelector('textarea')) continue;
        if (cs.textAlign !== 'right' && cs.textAlign !== 'end' && c.textContent.trim().length > 12) continue;   // Zahlen und kurze Werte (KG, EH, Art) ganz zeigen – lange Texte dürfen umbrechen
        cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;   // Text auf der Leinwand messen statt mit getBoundingClientRect – das zwingt den Browser nicht zur Anordnung der ganzen Tabelle (17.11.2026)
        w = Math.max(w, Math.ceil(cv.measureText(c.textContent.trim()).width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 2); }
      return w; };
    const platz = () => { const e = t.parentElement; if (!e) return 0; const cs = getComputedStyle(e); return e.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0); };   // Innenbreite
    const anwenden = () => { const s = SB[key]; if (!s || !t.isConnected) return; const p = platz(); if (!p) return;
      if (!s._b) { s._b = p; LS.set('sb', SB); }
      const f = p / s._b, v = thsJ(), mz = v.map((h, i) => (i === v.length - 1 || !s[h.cellIndex] ? 0 : minZahl(h.cellIndex)));   // alles messen, bevor die erste Breite gesetzt wird (ein Rechengang statt einer je Spalte)
      fest(true); let sum = 0;   // die Gesamtbreite setzt die letzte Zeile hier
      v.forEach((h, i) => { const j = h.cellIndex; if (i === v.length - 1 || !s[j]) return; const b = Math.max(36, mz[i], Math.round(s[j] * f)); h.style.width = b + 'px'; sum += b; });
      let rest = Math.max(90, Math.round((s._t ? s._t - Object.keys(s).filter((k) => /^\d+$/.test(k)).reduce((a, k) => a + s[k], 0) : 90) * f));
      if (sum + rest < p - 1) {   // schmaler als der Platz: alle Spalten im selben Verhältnis breiter, bis die Tabelle den Platz füllt
        const g = (p - 1) / (sum + rest); sum = 0; v.forEach((h, i) => { if (i === v.length - 1 || !h.style.width) return; const b = Math.round(parseFloat(h.style.width) * g); h.style.width = b + 'px'; sum += b; }); rest = Math.max(90, p - 1 - sum); }
      t.style.width = (sum + rest) + 'px'; };
    if (!Object.keys(w).length) t.style.minWidth = '100%';   // ohne eigene Breiten: der Browser verteilt den Platz auf alle Spalten
    if (Object.keys(w).length) anwenden();
    /* Breite des Platzes: erst beim ersten Melden des Beobachters merken (der meldet sich von selbst, nachdem der Browser ohnehin angeordnet hat) –
       ein Lesen hier mitten im Aufbau zwang ihn, die ganze neue Tabelle vorzeitig anzuordnen (17.11.2026) */
    if (window.ResizeObserver && t.parentElement) { let alt = null; const ro = new ResizeObserver(() => { if (!t.isConnected) { ro.disconnect(); return; } if (document.body.classList.contains('sb-zieh')) return; const p = platz(); if (alt === null || Math.abs(p - alt) < 2) { alt = alt === null ? p : alt; return; } alt = p; anwenden(); }); ro.observe(t.parentElement); }   // gleich (noch vor dem Bild) – mit requestAnimationFrame war ein Bild lang die alte Breite zu sehen: die Tabelle flackerte beim Speichern
    const TH = thsJ(), statisch = TH.map((th) => getComputedStyle(th).position === 'static');   // erst alle lesen, dann schreiben (sonst rechnet der Browser je Spalte die Stile neu)
    TH.forEach((th, i, v) => {
      if (i === v.length - 1) return;
      const ci = th.cellIndex;
      if (statisch[i]) th.style.position = 'relative';   // sticky Kopfzeilen bleiben sticky (sonst rutschte der Kopf um „top“ nach unten)
      const g = document.createElement('span'); g.className = 'sb-griff'; g.title = 'Spaltenbreite ziehen · Doppelklick: zurücksetzen'; th.appendChild(g);
      g.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); fest(); g.setPointerCapture(e.pointerId);
        const x0 = e.clientX, w0 = th.getBoundingClientRect().width, mz = minZahl(ci); document.body.classList.add('sb-zieh');
        g.onpointermove = (m) => { th.style.width = Math.max(36, mz, w0 + m.clientX - x0) + 'px'; breite(); };   // Zahlen bleiben ganz lesbar
        g.onpointerup = () => { g.onpointermove = null; document.body.classList.remove('sb-zieh'); SB[key] = {}; thsJ().forEach((h, i, v) => { if (i !== v.length - 1) SB[key][h.cellIndex] = Math.round(h.getBoundingClientRect().width); }); SB[key]._b = platz(); SB[key]._t = Math.round(t.getBoundingClientRect().width); LS.set('sb', SB); };
      });
      g.addEventListener('dblclick', (e) => { e.stopPropagation(); e.preventDefault(); delete SB[key]; LS.set('sb', SB); thsJ().forEach((h) => { h.style.width = ''; h.style.minWidth = ''; }); t.style.tableLayout = ''; t.classList.remove('sb-fest'); t.style.width = ''; t.style.minWidth = '100%'; toast('Spaltenbreiten zurückgesetzt.'); });
      g.addEventListener('click', (e) => e.stopPropagation());
    });
  });
}
/* Rückgängig außerhalb des LV-Editors: jede gespeicherte Feldänderung (Angebotspreise, Aufmaß, Rechnung, Sicherheiten) merkt sich den alten Wert;
   Strg+Z bzw. die Leiste „↶“ schreibt ihn zurück, Strg+Y wiederholt. Im Feld selbst: Strg+Z erst, wenn dort nichts Neues getippt ist. */
const AKT = { undo: [], redo: [], t: 0 };
document.addEventListener('focusin', (e) => { const el = e.target; if (el.matches && el.matches('[data-ang],[data-am],[data-re],[data-si],[data-ve]')) el.dataset.v0 = el.type === 'checkbox' ? String(el.checked) : el.value; });
async function mitUndo(el, fn, was) {
  const alt = el.dataset.v0, neu = el.type === 'checkbox' ? String(el.checked) : el.value;
  if (alt == null || alt === neu) return fn(el);
  const ds = { ...el.dataset }; delete ds.v0; const typ = el.type;
  const proxy = (v) => ({ dataset: { ...ds }, value: v, checked: v === 'true', type: typ, closest: () => null });
  await fn(el);
  const key = JSON.stringify(ds), top = AKT.undo[AKT.undo.length - 1], now = Date.now();
  const label = `${was}: ${alt || 'leer'} → ${neu || 'leer'}`;
  if (top && top.key === key && now - AKT.t < 3000) { top.neu = neu; top.label = `${was}: ${top.alt || 'leer'} → ${neu || 'leer'}`; top.wieder = () => fn(proxy(neu)); bpUndo.text(top.g, top.label); }   // schnelles Weitertippen im selben Feld: ein Schritt
  else { const st = { key, label, alt, neu, rueck: () => fn(proxy(alt)), wieder: () => fn(proxy(neu)) }; st.g = bpUndo.push(label, () => aktGo(-1), 'akt'); AKT.undo.push(st); if (AKT.undo.length > 80) AKT.undo.shift(); }
  AKT.t = now; AKT.redo = []; histUi();
}
/* Rückgängig-Verlauf der Plattform (bp.js) und der AVA zusammen: Löschen, Archivieren … stehen auch hier in Strg+Z / „↶“ */
window.BP_UNDO_EIGEN = true;
window.bpUndoHook = (u) => { AKT.undo.push({ key: '', label: u.text, u, rueck: async () => { UNDO.s = UNDO.s.filter((x) => x !== u); _undoZeichnen(false); await u.fn(); } }); if (AKT.undo.length > 80) AKT.undo.shift(); AKT.redo = []; AKT.t = 0; histUi(); };
window.bpUndoWeg = (u) => { AKT.undo = AKT.undo.filter((x) => x.u !== u); histUi(); };
async function aktGo(dir) {
  const from = dir < 0 ? AKT.undo : AKT.redo, to = dir < 0 ? AKT.redo : AKT.undo, st = from.pop(); if (!st) return;
  if (dir < 0) { bpUndo.weg(st.g); bpUndo.weg(st.u); } else if (!st.u) st.g = bpUndo.push(st.label, () => aktGo(-1), 'akt');
  try { await (dir < 0 ? st.rueck() : (st.wieder ? st.wieder() : Promise.resolve())); to.push(st); toast(`${dir < 0 ? 'Rückgängig' : 'Wiederholt'}: ${st.label}`); }
  catch (e) { toast(e.message, true); }
  histUi();
}
/* Beim Weitertippen (derselbe Schritt läuft noch, keine 2 Sekunden Pause) wird der Stand nicht bei jedem Tastendruck festgehalten, sondern
   eine Viertelsekunde nach dem letzten – das Festhalten kostet bei großen LVs spürbar Zeit. Der Schritt steht da schon im Rückgängig-Dock;
   vor Rückgängig/Wiederholen wird der Stand nachgezogen (histGo). */
let HIST_T = 0;
function histTrack() {   // bei jeder Änderung: alten Stand merken (Tippen in einem Feld zählt als ein Schritt)
  if (!L || !L.data) return;
  if (!HIST.next && HIST.id === L.id && HIST.undo.length && Date.now() - HIST.t < 2000) { HIST.t = Date.now(); HIST.redo = []; clearTimeout(HIST_T); HIST_T = setTimeout(histJetzt, 250); return; }
  histJetzt();
}
function histJetzt() {
  clearTimeout(HIST_T); HIST_T = 0;
  if (!L || !L.data) return;
  const cur = JSON.stringify(L.data);
  if (HIST.id !== L.id) { bpUndo.wegArt('lv'); HIST = { id: L.id, last: cur, undo: [], redo: [], t: 0 }; histUi(); return; }   // anderes LV: dessen Schritte gelten nicht mehr
  if (cur === HIST.last) return;
  const lab = HIST.next || histLabel(HIST.last, cur), top = HIST.undo[HIST.undo.length - 1], now = Date.now();
  if (!HIST.next && top && top.label === lab && now - HIST.t < 2000) { bpUndo.text(top.u, lab); /* schnelles Weitertippen: derselbe Schritt */ }
  else { const st = { data: HIST.last, label: lab }; st.u = bpUndo.push(lab, () => histGo(-1), 'lv'); HIST.undo.push(st); if (HIST.undo.length > 80) { const w = HIST.undo.shift(); bpUndo.weg(w.u); } }
  HIST.next = ''; HIST.t = now; HIST.redo = []; HIST.last = cur; histUi();
}
function histGo(dir) {
  histTrack();
  if (HIST_T) histJetzt();   // noch nicht festgehaltenes Weitertippen zuerst
  const from = dir < 0 ? HIST.undo : HIST.redo, to = dir < 0 ? HIST.redo : HIST.undo, st = from.pop(); if (!st) return;
  const neu = { data: HIST.last, label: st.label }; to.push(neu);
  if (dir < 0) bpUndo.weg(st.u); else neu.u = bpUndo.push(st.label, () => histGo(-1), 'lv');   // gemeinsamer Verlauf (↶ unten) bleibt im Gleichschritt
  L.data = JSON.parse(st.data); HIST.last = st.data; HIST.t = 0;
  VWARN.still = true; try { changed(true); } finally { VWARN.still = false; } HIST.last = JSON.stringify(L.data); histUi(); toast(`${dir < 0 ? 'Rückgängig' : 'Wiederholt'}: ${st.label}`);   // Stand nach dem Neuberechnen – sonst zählt der nächste Schritt das als neue Änderung
}
function histUi() { bpUndo.zeichnen(); }   // ein gemeinsamer Verlauf unten (bp.js) für LV, Feldänderungen und Türliste
/* ↷ im gemeinsamen Verlauf: je Bereich der passende eigene Wiederholen-Stapel */
window.bpRedo = { kann: () => (tab === 'tueren' && TL ? TLR.length : tab === 'lv' ? HIST.redo && HIST.redo.length : AKT.redo.length) > 0,
  los: () => (tab === 'tueren' && TL ? tlZurueck(true) : tab === 'lv' ? histGo(1) : aktGo(1)) };
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || document.querySelector('.modal-bg,.bed')) return;
  const ae = document.activeElement, k = e.key.toLowerCase();
  if (bpTippt(ae)) {   // im Feld macht der Browser selbst rückgängig – außer dort wurde noch nichts getippt (dann die letzte gespeicherte Änderung)
    const unveraendert = ae.dataset && ae.dataset.v0 != null && ae.dataset.v0 === (ae.type === 'checkbox' ? String(ae.checked) : ae.value);
    if (!(unveraendert && tab !== 'lv' && tab !== 'tueren' && (k === 'z' || k === 'y'))) return;
  }
  if (tab === 'tueren') { if (TL && (k === 'z' || k === 'y')) { e.preventDefault(); tlZurueck(k === 'y' || e.shiftKey); } return; }
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); _undoBis(0); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); _redo(); }   // ein Verlauf: wie ↶/↷ unten (LV-Bearbeitung, Felder, Löschen …)
});
/* Suche in der Kopfleiste (Strg+K): dieselbe Volltextsuche, im Projekt (bzw. wie oben gewählt: LV · Projekt · alle) */
(window.bpSucheQ = window.bpSucheQ || []).push(async (q) => {
  if (q.trim().length < 2) return [];
  const r = await api('api/suche?q=' + encodeURIComponent(q.trim()) + vqQs());
  return (r.treffer || []).slice(0, 10).map((t) => ({ ic: VQIC[t.art] || '▪', t: [t.oz, t.titel].filter(Boolean).join(' ') + (t.nt ? ` (${t.nt})` : ''), sub: [vqWo() === 'alle' ? t.projekt : '', t.lv, t.text].filter(Boolean).join(' · '),
    wo: { lv: 'LV', titel: 'LV', pos: 'Position', text: 'Langtext', nachtrag: 'Nachtrag', angebot: 'Angebot', aufmass: 'Aufmaß', rechnung: 'Rechnung', tuer: 'Türliste' }[t.art] || '', go: () => vqGehe(t) }));
});
