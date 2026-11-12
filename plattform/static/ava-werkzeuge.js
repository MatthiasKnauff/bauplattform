/* Ausschreibung (AVA) – LV drucken, Volltextsuche, Fotos, Rückgängig.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- LV drucken: einfacher Layout-Editor mit Vorschau (Deckblatt-Texte direkt in der Vorschau ändern) ---------- */
let pdfjsP = null;
function pdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return pdfjsP || (pdfjsP = new Promise((ok, bad) => { const sc = document.createElement('script'); sc.src = 'static/vendor/pdfjs/pdf.js'; sc.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'static/vendor/pdfjs/pdf.worker.js'; ok(pdfjsLib); }; sc.onerror = () => { pdfjsP = null; bad(new Error('PDF-Vorschau nicht verfügbar')); }; document.head.appendChild(sc); }));
}
async function druckEditor() {
  if (!L) return; await flush();
  const lib = await pdfjs().catch((e) => { toast(e.message, true); return null; }); if (!lib) return;
  let lay = null, F = null, tok = 0, verg = false;
  const ov = document.createElement('div'); ov.className = 'bed'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'LV drucken');
  ov.innerHTML = `<div class="bed-bar"><b>LV ${esc(L.nr)} drucken</b><span class="hint">Links das Layout, rechts die Vorschau – gelbe Texte auf dem Deckblatt direkt ändern, Positionstexte anklicken – Änderungen gehen ins LV.</span><span style="flex:1"></span>
    <button class="btn" data-d="x">Schließen</button><button class="btn" data-d="save" title="Layout und Texte beim LV merken">Layout speichern</button><button class="btn" data-d="pdf">⤓ PDF</button><button class="btn pri" data-d="druck">🖨 Drucken</button></div>
    <div class="dz"><aside class="dz-side"></aside><div class="bed-s"><div class="bed-l">Lade Vorschau …</div></div></div>`;
  document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const side = ov.querySelector('.dz-side'), S = ov.querySelector('.bed-s');
  const CH = [['deckblatt', 'Deckblatt'], ['vorbem', 'Vorbemerkungen'], ['vbpos', 'Vorbemerkungen im LV (Art „V“)'], ['langtext', 'Langtexte'], ['fotos', 'Fotos zu den Positionen'], ['zusammenstellung', 'Zusammenstellung der Titel'], ['bieter', 'Bieterangaben und Unterschrift am Ende'], ['seite_je_titel', 'Jeden Titel auf neuer Seite']];
  let WL = null, layNeu = false; try { WL = await api('api/bp/layouts/lv/wahl'); } catch { WL = null; }   // Druck-Layouts des LV (⚙ → Büro → Druck-Layouts)
  const adminJa = !!(window.BPHead && BPHead.me && BPHead.me.is_admin);
  const sideDraw = () => {
    side.innerHTML = (WL && (WL.layouts.length > 1 || adminJa) ? `<label class="dz-l">Layout<select data-lid>${WL.layouts.map((x) => `<option value="${esc(x.id)}"${x.id === (lay.layout_id || WL.vorgabe) ? ' selected' : ''}>${esc(x.name)} · ${esc(x.format)}</option>`).join('')}</select>${adminJa ? '<button type="button" class="btn sm" data-d="layedit" style="margin-top:.3rem">Layouts bearbeiten …</button>' : ''}</label>` : '')
      + `<label class="dz-l">Preise<select data-l="preise"><option value="leer">leer – zum Ausfüllen durch die Bieter:innen</option><option value="schaetzung">mit Schätzpreisen (Kostenanschlag)</option><option value="auftrag"${verg ? '' : ' disabled'}>mit Auftragspreisen${verg ? '' : ' (erst nach der Vergabe)'}</option></select></label>
      <div class="dz-g">${CH.map(([k, l]) => `<label class="dz-c"><input type="checkbox" data-l="${k}"${lay[k] ? ' checked' : ''}> ${l}</label>`).join('')}</div>
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
        const pg = await pdf.getPage(n), v0 = pg.getViewport({ scale: 1 }), sc = breite / v0.width, v = pg.getViewport({ scale: sc });
        const vv = pg.getViewport({ scale: sc * Math.min(2, Math.max(window.devicePixelRatio || 1, pdf.numPages <= 12 ? 2 : 1)) });
        const box = document.createElement('div'); box.className = 'bed-p'; box.style.width = v.width + 'px'; box.style.height = v.height + 'px';
        const cvs = document.createElement('canvas'); cvs.width = vv.width; cvs.height = vv.height; box.appendChild(cvs); frag.appendChild(box);
        await pg.render({ canvasContext: cvs.getContext('2d'), viewport: vv, annotationMode: lib.AnnotationMode.DISABLE }).promise;
        for (const a of await pg.getAnnotations()) {
          if (a.subtype !== 'Widget' || !(a.fieldName in F)) continue;
          const [x1, y1, x2, y2] = v.convertToViewportRectangle(a.rect), fs = ((a.defaultAppearanceData && a.defaultAppearanceData.fontSize) || 10) * sc;
          const el = document.createElement(a.multiLine ? 'textarea' : 'input'); el.className = 'bed-f'; el.dataset.f = a.fieldName; el.value = F[a.fieldName]; el.title = a.fieldName;
          el.placeholder = { Hinweis: 'z. B. Angebotsabgabe bis …', Bauherr: 'Bauherr:in' }[a.fieldName] || '';
          Object.assign(el.style, { left: Math.min(x1, x2) + 'px', top: Math.min(y1, y2) + 'px', width: Math.abs(x2 - x1) + 'px', height: Math.abs(y2 - y1) + 'px', fontSize: fs + 'px', padding: `${2 * sc}px`, fontWeight: a.fieldName === 'Titel' ? '700' : '400' });
          box.appendChild(el);
        }
        for (const a of await pg.getAnnotations()) {   // Positionstexte: unsichtbare Links aus dem Entwurf → anklicken und bearbeiten
          const m = a.subtype === 'Link' && /bauplattform\.invalid\/edit\/([^/]+)\/(kurz|lang)/.exec(a.url || a.unsafeUrl || ''); if (!m) continue;
          const [x1, y1, x2, y2] = v.convertToViewportRectangle(a.rect);
          const el = document.createElement('div'); el.className = 'bed-e'; el.dataset.pos = decodeURIComponent(m[1]); el.dataset.feld = m[2]; el.dataset.sc = sc;
          el.title = m[2] === 'kurz' ? 'Kurztext bearbeiten' : 'Langtext bearbeiten';
          Object.assign(el.style, { left: Math.min(x1, x2) + 'px', top: Math.min(y1, y2) + 'px', width: Math.abs(x2 - x1) + 'px', height: Math.abs(y2 - y1) + 'px' });
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
  S.addEventListener('click', (e) => { const z = e.target.closest('.bed-e'); if (z) textBearbeiten(z); });
  ov.addEventListener('input', (e) => { const f = e.target.dataset.f; if (f && F) F[f] = e.target.value; if (f && e.target.closest('.dz-side')) spaeter(1200); });
  ov.addEventListener('change', (e) => {
    const l = e.target.dataset.l, f = e.target.dataset.f;
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
      const href = URL.createObjectURL(await r.blob());
      if (!w && window.BPHead && BPHead.ansehen) { BPHead.ansehen([{ url: href, typ: 'pdf', name: pdfName('LV') }]); return; }
      if (w && !w.closed) { w.location.href = href; if (a === 'druck') setTimeout(() => { try { w.print(); } catch { /* Betrachter druckt selbst */ } }, 1200); }
      else { const ln = document.createElement('a'); ln.href = href; ln.download = pdfName('LV'); document.body.appendChild(ln); ln.click(); ln.remove(); }
    } catch (er) { if (w && !w.closed) w.close(); toast(er.message, true); }
  });
  laden();
}

/* Einstellungen → Abrechnung (Büro): welche Nachträge in der Rechnungsprüfung als Leistung zählen */
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
/* PDF-Paket drucken – derselbe Dialog wie beim LV: links ankreuzen, was hinein soll, rechts die Vorschau */
async function paketDruck(o) {
  const lib = await pdfjs().catch((e) => { toast(e.message, true); return null; }); if (!lib) return;
  const lw = o.bereich ? await druckfelder(o.bereich, '') : ''; if (lw == null) return;
  const EINMAL = new Set(o.einmal || []);   // Teile, die nur für diesen Ausdruck gelten (z. B. „mit meiner Unterschrift“): nie gemerkt, anfangs aus
  const wahl = new Set((LS.get(o.merk, null) || o.teile.filter((t) => t[2] && !t[3]).map((t) => t[0])).filter((k) => !EINMAL.has(k)));
  let tok = 0, blob = null;
  /* Druck-Layout des Ausdrucks (⚙ → Büro → Druck-Layouts): Auswahl und Inhaltseinstellungen, gemerkt je Ausdruck */
  let W = null; try { if (o.bereich) W = await api('api/bp/layouts/' + o.bereich + '/wahl'); } catch { W = null; }
  const DM = LS.get('druck.' + o.bereich, {}) || {};
  let vid = W && W.layouts.some((l) => l.id === DM.layout) ? DM.layout : W ? ((W.layouts.find((l) => l.id === W.vorgabe) || W.layouts[0] || {}).id || '') : '';
  let OPT = W ? { ...(W.werte[vid] || {}), ...(DM.layout === vid ? DM.opt || {} : {}) } : {};
  const layHtml = () => !W ? '' : `${W.layouts.length > 1 || (window.BPHead && BPHead.me && BPHead.me.is_admin) ? `<label class="dz-l">Layout<select data-lay>${W.layouts.map((l) => `<option value="${esc(l.id)}"${l.id === vid ? ' selected' : ''}>${esc(l.name)} · ${esc(l.format)}</option>`).join('')}</select></label>` : ''}
    ${W.optionen.length ? `<div class="dz-g">${W.optionen.map((x) => x.typ === 'bool' ? `<label class="dz-c"><input type="checkbox" data-opt="${esc(x.key)}"${OPT[x.key] ? ' checked' : ''}> ${esc(x.name)}</label>`
      : `<label class="dz-l">${esc(x.name)}<select data-opt="${esc(x.key)}">${x.wahl.map(([k, l]) => `<option value="${esc(k)}"${String(OPT[x.key]) === String(k) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>` : ''}
    ${window.BPHead && BPHead.me && BPHead.me.is_admin ? '<button type="button" class="btn sm" data-d="layedit" style="margin-top:.4rem">Layouts bearbeiten …</button>' : ''}`;
  const layQs = () => (W ? `&layout=${encodeURIComponent(vid)}${Object.keys(OPT).length ? '&opt=' + encodeURIComponent(JSON.stringify(OPT)) : ''}` : '');
  const ov = document.createElement('div'); ov.className = 'bed'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', o.titel);
  ov.innerHTML = `<div class="bed-bar"><b>${esc(o.titel)}</b><span class="hint">${esc(o.hinweis || 'Links ankreuzen, was ins PDF soll – rechts die Vorschau.')}</span><span style="flex:1"></span>
    <button class="btn" data-d="x">Schließen</button><button class="btn" data-d="pdf">⤓ PDF</button><button class="btn pri" data-d="druck">🖨 Drucken</button></div>
    <div class="dz"><aside class="dz-side"><div data-layw>${layHtml()}</div><div${o.teile.length ? '' : ' hidden'}><div class="dz-l">Im PDF</div><div class="dz-g">${o.teile.map(([k, l, , aus, warum]) => `<label class="dz-c${aus ? ' aus' : ''}" title="${esc(aus ? warum || '' : '')}"><input type="checkbox" data-t="${k}"${wahl.has(k) && !aus ? ' checked' : ''}${aus ? ' disabled' : ''}> ${esc(l)}${aus && warum ? `<small class="hint" style="display:block;margin-left:1.5rem">${esc(warum)}</small>` : ''}</label>`).join('')}</div></div></aside>
    <div class="bed-s"><div class="bed-l">Lade Vorschau …</div></div></div>`;
  document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const S = ov.querySelector('.bed-s');
  const teile = () => [...ov.querySelectorAll('[data-t]:checked')].map((x) => x.dataset.t);
  async function laden() {
    const my = ++tok, top = S.scrollTop; blob = null;
    if (o.teile.length && !teile().filter((k) => !EINMAL.has(k)).length) { S.innerHTML = '<div class="bed-l">Bitte links mindestens einen Teil ankreuzen.</div>'; return; }
    try {
      const r = await fetch(o.url(teile()) + lw + layQs(), { credentials: 'same-origin' });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Fehler ' + r.status); }
      const b = await r.blob(); if (my !== tok) return; blob = b;
      const pdf = await lib.getDocument({ isEvalSupported: false, data: new Uint8Array(await b.arrayBuffer()) }).promise; if (my !== tok) return;
      const frag = document.createDocumentFragment(), breite = Math.min(S.clientWidth - 24, 820);
      for (let n = 1; n <= Math.min(pdf.numPages, 40); n++) {
        const pg = await pdf.getPage(n), v0 = pg.getViewport({ scale: 1 }), sc = breite / v0.width, v = pg.getViewport({ scale: sc }), vv = pg.getViewport({ scale: sc * Math.min(2, Math.max(window.devicePixelRatio || 1, pdf.numPages <= 12 ? 2 : 1)) });
        const box = document.createElement('div'); box.className = 'bed-p'; box.style.width = v.width + 'px'; box.style.height = v.height + 'px';
        const cvs = document.createElement('canvas'); cvs.width = vv.width; cvs.height = vv.height; box.appendChild(cvs); frag.appendChild(box);
        await pg.render({ canvasContext: cvs.getContext('2d'), viewport: vv }).promise; if (my !== tok) return;
      }
      S.replaceChildren(frag); S.scrollTop = top;
    } catch (e) { if (my === tok) S.innerHTML = `<div class="bed-l">${esc(e.message || 'Vorschau nicht möglich')}</div>`; }
  }
  const zu = () => { tok++; ov.remove(); document.body.style.overflow = ''; };
  const layMerken = () => LS.set('druck.' + o.bereich, { layout: vid, opt: OPT });
  ov.addEventListener('change', (e) => {
    if (e.target.dataset.t) { LS.set(o.merk, teile().filter((k) => !EINMAL.has(k))); laden(); return; }
    if (e.target.matches('[data-lay]')) { vid = e.target.value; OPT = { ...(W.werte[vid] || {}) }; ov.querySelector('[data-layw]').innerHTML = layHtml(); layMerken(); laden(); return; }
    const op = e.target.dataset.opt; if (op) { OPT[op] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; layMerken(); laden(); }
  });
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return; const a = b.dataset.d;
    if (a === 'x') return zu();
    if (a === 'layedit') { const ad = ((BPHead.conf || {}).apps || []).find((x) => x.key === 'admin'); if (ad) BPHead.layoutEditor(BPHead.appUrl(ad), o.bereich, laden, laden); return; }   // Änderungen sofort in der Vorschau
    if (!blob) return toast(teile().length || !o.teile.length ? 'Die Vorschau lädt noch …' : 'Bitte mindestens einen Teil ankreuzen.', true);
    const href = URL.createObjectURL(blob);
    if (window.BPHead && BPHead.ansehen) { BPHead.ansehen([{ url: href, typ: 'pdf', name: o.name }]); return; }
    const ln = document.createElement('a'); ln.href = href; ln.download = o.name; document.body.appendChild(ln); ln.click(); ln.remove();
  });
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
  laden();
}
function reDruck(r) {   // Rechnungsfreigabe als PDF-Paket: Freigabe, Prüfblatt, Massenermittlung, Rechnung der Firma
  const c = (L.calc.rechnungen || []).find((x) => x.id === r.id) || {}, nb = (r.belege || []).length;
  paketDruck({ titel: `${reTitel(r)} – Rechnungsfreigabe drucken`, bereich: 'rechnungsfreigabe', merk: 'rePaket', name: pdfName('Rechnungsfreigabe', reTitel(r) + (r.re_nr ? ' Nr. ' + r.re_nr : '')),
    hinweis: 'Links ankreuzen, was ins PDF-Paket soll – die Auswahl wird gemerkt.',
    teile: [['freigabe', 'Rechnungsfreigabe (Zahlbetrag, Unterschriften)', true], ['pruef', 'Prüfblatt (Prüfung im Einzelnen)', true],
      ['aufmass', 'Massenermittlung (Aufmaß)', true, !L.aufmass.length || c.frei, c.frei ? 'Rechnung ohne Aufmaß' : 'noch kein Aufmaß'],
      ['rechnung', `Rechnung der Firma (PDF / Scan${nb > 1 ? `, ${nb} Dateien` : ''})`, true, !nb, 'keine PDF an der Rechnung'],
      ['sign', '✍ mit meiner Unterschrift – nur für diesen Ausdruck', false]],
    einmal: ['sign'],   // die Unterschrift wird nie gemerkt: beim nächsten Drucken ist sie wieder aus
    url: (t) => `api/lv/${L.id}/pdf?art=rechnung&rid=${r.id}&freigabe=1&teile=${t.join(',')}` });
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
  tab = { angebot: 'angebote', aufmass: 'aufmass', rechnung: 'rechnungen' }[t.art] || 'lv'; LS.set('tab', tab);
  if (t.art === 'aufmass' && t.pos_id) { amPos = t.pos_id; LS.set('amPos', amPos); }
  if (tab === 'lv' && t.pos_id) {   // Titel darüber aufklappen, Zeile markieren und hinscrollen
    const I = items(), n = I.findIndex((x) => x.id === t.pos_id);
    if (n >= 0) bpBaum.zeige(I, n, lvTiefe, LVZU);
    LVAKT = t.pos_id; LVSEL = new Set();
  }
  render();
  if (tab === 'lv' && t.pos_id) setTimeout(() => {
    const I = items(), n = I.findIndex((x) => x.id === t.pos_id), tr = n >= 0 && document.querySelector(`table.lv tr[data-i="${n}"]`);
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
    const alle = [...tr.children], ths = alle.filter((h) => getComputedStyle(h).display !== 'none');   // ausgeblendete Spalten (⚙ Spalten) zählen nicht – sonst wäre die „letzte“ unsichtbar und könnte den Rest nicht nehmen
    // wie in Excel: nur die gezogene Spalte ändert sich, alles rechts davon rückt nach; die letzte Spalte nimmt den Rest der Breite
    const letzte = ths[ths.length - 1];
    // nie ein leerer Bereich neben der Tabelle: beim Ziehen nimmt die letzte Spalte den Rest bis zum Rand
    const breite = () => { const sum = ths.slice(0, -1).reduce((a, h) => a + (parseFloat(h.style.width) || h.getBoundingClientRect().width), 0); t.style.width = Math.max(sum + 90, platz()) + 'px'; };
    const fest = () => { if (t.style.tableLayout === 'fixed') return; ths.forEach((h) => { if (h === letzte) { h.style.width = ''; h.style.minWidth = '90px'; return; } h.style.width = Math.round(h.getBoundingClientRect().width) + 'px'; h.style.minWidth = '0'; }); t.style.tableLayout = 'fixed'; breite(); };
    // proportional: gemerkt wird die Breite, die der Platz beim Ziehen hatte (_b) – wird der Platz breiter oder schmaler (Trenner, Fenster), wachsen bzw. schrumpfen alle Spalten im selben Verhältnis
    // schmalste Breite einer Spalte mit Zahlen (rechtsbündig): so breit wie die längste Zahl – eine Zahl wird nie abgeschnitten
    const cv = document.createElement('canvas').getContext('2d');
    const minZahl = (j) => { let w = 0; const R = t.tBodies[0] ? [...t.tBodies[0].rows].slice(0, 400) : [], rg = document.createRange();   // j = Index der Zelle in der Zeile
      for (const row of R) { if (row.cells.length !== alle.length) continue; const c = row.cells[j]; if (!c) continue;
        const cs = getComputedStyle(c), inp = c.querySelector('input:not([type=checkbox]),select');
        if (inp) {   // Zahl in einem Eingabefeld (Aufträge): Text des Felds messen
          const is = getComputedStyle(inp); if (is.textAlign !== 'right' && is.textAlign !== 'end' && cs.textAlign !== 'right') continue; if (!String(inp.value).trim()) continue;
          cv.font = `${is.fontWeight} ${is.fontSize} ${is.fontFamily}`; w = Math.max(w, Math.ceil(cv.measureText(inp.value).width + parseFloat(is.paddingLeft) + parseFloat(is.paddingRight) + parseFloat(is.borderLeftWidth) * 2 + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 4); continue; }
        if (!c.textContent.trim() || c.querySelector('textarea')) continue;
        if (cs.textAlign !== 'right' && cs.textAlign !== 'end') continue;
        rg.selectNodeContents(c); w = Math.max(w, Math.ceil(rg.getBoundingClientRect().width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 2); }
      return w; };
    const platz = () => { const e = t.parentElement; if (!e) return 0; const cs = getComputedStyle(e); return e.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0); };   // Innenbreite
    const anwenden = () => { const s = SB[key]; if (!s || !t.isConnected) return; const p = platz(); if (!p) return;
      if (!s._b) { s._b = p; LS.set('sb', SB); }
      const f = p / s._b; fest(); let sum = 0;
      ths.forEach((h) => { const j = h.cellIndex; if (h === letzte || !s[j]) return; const b = Math.max(36, minZahl(j), Math.round(s[j] * f)); h.style.width = b + 'px'; sum += b; });
      let rest = Math.max(90, Math.round((s._t ? s._t - Object.keys(s).filter((k) => /^\d+$/.test(k)).reduce((a, k) => a + s[k], 0) : 90) * f));
      if (sum + rest < p - 1) {   // schmaler als der Platz: alle Spalten im selben Verhältnis breiter, bis die Tabelle den Platz füllt
        const g = (p - 1) / (sum + rest); sum = 0; ths.forEach((h) => { if (h === letzte || !h.style.width) return; const b = Math.round(parseFloat(h.style.width) * g); h.style.width = b + 'px'; sum += b; }); rest = Math.max(90, p - 1 - sum); }
      t.style.width = (sum + rest) + 'px'; };
    if (!Object.keys(w).length) t.style.minWidth = '100%';   // ohne eigene Breiten: der Browser verteilt den Platz auf alle Spalten
    if (Object.keys(w).length) anwenden();
    if (window.ResizeObserver && t.parentElement) { let alt = platz(); const ro = new ResizeObserver(() => { if (!t.isConnected) { ro.disconnect(); return; } if (document.body.classList.contains('sb-zieh')) return; const p = platz(); if (Math.abs(p - alt) < 2) return; alt = p; requestAnimationFrame(anwenden); }); ro.observe(t.parentElement); }
    ths.forEach((th, i) => {
      if (i === ths.length - 1) return;
      const ci = th.cellIndex;
      if (getComputedStyle(th).position === 'static') th.style.position = 'relative';   // sticky Kopfzeilen bleiben sticky (sonst rutschte der Kopf um „top“ nach unten)
      const g = document.createElement('span'); g.className = 'sb-griff'; g.title = 'Spaltenbreite ziehen · Doppelklick: zurücksetzen'; th.appendChild(g);
      g.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); fest(); g.setPointerCapture(e.pointerId);
        const x0 = e.clientX, w0 = th.getBoundingClientRect().width, mz = minZahl(ci); document.body.classList.add('sb-zieh');
        g.onpointermove = (m) => { th.style.width = Math.max(36, mz, w0 + m.clientX - x0) + 'px'; breite(); };   // Zahlen bleiben ganz lesbar
        g.onpointerup = () => { g.onpointermove = null; document.body.classList.remove('sb-zieh'); SB[key] = {}; ths.forEach((h) => { if (h !== letzte) SB[key][h.cellIndex] = Math.round(h.getBoundingClientRect().width); }); SB[key]._b = platz(); SB[key]._t = Math.round(t.getBoundingClientRect().width); LS.set('sb', SB); };
      });
      g.addEventListener('dblclick', (e) => { e.stopPropagation(); e.preventDefault(); delete SB[key]; LS.set('sb', SB); ths.forEach((h) => { h.style.width = ''; h.style.minWidth = ''; }); t.style.tableLayout = ''; t.style.width = ''; t.style.minWidth = '100%'; toast('Spaltenbreiten zurückgesetzt.'); });
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
function aktMerken(label, rueck, wieder) { const st = { key: '', label, rueck, wieder }; st.g = bpUndo.push(label, () => aktGo(-1), 'akt'); AKT.undo.push(st); if (AKT.undo.length > 80) AKT.undo.shift(); AKT.redo = []; AKT.t = 0; histUi(); }
async function aktGo(dir) {
  const from = dir < 0 ? AKT.undo : AKT.redo, to = dir < 0 ? AKT.redo : AKT.undo, st = from.pop(); if (!st) return;
  if (dir < 0) { bpUndo.weg(st.g); bpUndo.weg(st.u); } else if (!st.u) st.g = bpUndo.push(st.label, () => aktGo(-1), 'akt');
  try { await (dir < 0 ? st.rueck() : (st.wieder ? st.wieder() : Promise.resolve())); to.push(st); toast(`${dir < 0 ? 'Rückgängig' : 'Wiederholt'}: ${st.label}`); }
  catch (e) { toast(e.message, true); }
  histUi();
}
function histTrack() {   // bei jeder Änderung: alten Stand merken (Tippen in einem Feld zählt als ein Schritt)
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
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(ae?.tagName || '')) {   // im Feld macht der Browser selbst rückgängig – außer dort wurde noch nichts getippt (dann die letzte gespeicherte Änderung)
    const unveraendert = ae.dataset && ae.dataset.v0 != null && ae.dataset.v0 === (ae.type === 'checkbox' ? String(ae.checked) : ae.value);
    if (!(unveraendert && tab !== 'lv' && tab !== 'tueren' && (k === 'z' || k === 'y'))) return;
  }
  if (tab === 'tueren') { if (TL && (k === 'z' || k === 'y')) { e.preventDefault(); tlZurueck(k === 'y' || e.shiftKey); } return; }
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); _undoBis(0); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); _redo(); }   // ein Verlauf: wie ↶/↷ unten (LV-Bearbeitung, Felder, Löschen …)
});
