'use strict';
/* Verlauf, Kennwort, Datenmaske, Projektdaten, Projekt löschen, Vor Ort, Postfächer, Verlauf aller Bereiche – aus head.js ausgelagert (23.11.2026): geladen erst, wenn es gebraucht wird (BPHead.baustein('masken')).
   Gemeinsame Hilfen der Kopfleiste über BPHead._i (head.js). */
(function () {
  const H = window.BPHead, { esc, KX, hatBT, appUrl } = H._i;
  /* ---------- Verlauf: automatisch gespeicherte Stände aller Einstellungen und Stammdaten ----------
     H.verlauf({ bereich, titel?, nach? })   Fenster mit allen Ständen eines Bereichs (nach = nach dem Wiederherstellen; sonst Seite neu laden)
     H.verlaufAlle({ into })                 Änderungsverlauf aller Bereiche mit Filter und (für Administratoren) Aufbewahrung */
  const JS = (u, m, d) => KX(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d || {}) });
  const fmtT = (s) => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
  const fmtB = (n) => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const ART = { benannt: 'benannt', wiederhergestellt: 'wiederhergestellt', ausgang: 'Ausgangsstand' };
  function vItem(v, i, opt) {
    const a = v.aenderungen || [], more = a.length > 4;
    return `<li class="bph-v" data-vid="${v.id}"><div class="bph-vh"><b>${fmtT(v.wann)}</b>${v.wer ? ` · ${esc(v.wer)}` : ''}
      ${opt.titel ? `<span class="bph-mu"> · ${esc(v.titel)}</span>` : ''}${v.name ? ` <span class="bph-badge on">${esc(v.name)}</span>` : (ART[v.art] ? ` <span class="bph-badge">${ART[v.art]}</span>` : '')}
      ${i === 0 && !opt.titel ? ' <span class="bph-badge cur">jetziger Stand</span>' : ''}</div>
      <ul class="bph-va">${a.slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join('')}${more ? `<li class="bph-vmore" hidden>${a.slice(4).map(esc).join('</li><li>')}</li><li><button type="button" class="bph-link" data-vmore>… ${a.length - 4} weitere</button></li>` : ''}</ul>
      <div class="bph-vcmp" hidden></div>
      <div class="bph-row">${opt.titel ? `<button type="button" class="bph-btn" data-vopen="${esc(v.bereich)}">Alle Stände dazu</button>` : ''}
        ${i > 0 || opt.titel ? `<button type="button" class="bph-btn" data-vcmp>Vergleichen</button><button type="button" class="bph-btn" data-vback>Wiederherstellen</button>` : ''}
        <button type="button" class="bph-btn" data-vname="${esc(v.name || '')}">${v.name ? 'Umbenennen' : 'Benennen'}</button></div></li>`;
  }
  async function vClick(e, root, reload, opt) {
    const t = e.target, li = t.closest('[data-vid]'), id = li && li.dataset.vid;
    if (t.closest('[data-vmore]')) { li.querySelectorAll('.bph-vmore').forEach((x) => { x.hidden = false; }); t.closest('li').remove(); return true; }
    if (t.closest('[data-vopen]')) { H.verlauf({ bereich: t.closest('[data-vopen]').dataset.vopen, nach: () => { if (opt && opt.nach) opt.nach(); reload(); } }); return true; }
    if (t.closest('[data-vcmp]')) {
      const box = li.querySelector('.bph-vcmp');
      if (!box.hidden) { box.hidden = true; return true; }
      try { const r = await KX(`api/bp/versionen/${id}/vergleich`); box.innerHTML = `<b>Beim Wiederherstellen ändert sich gegenüber jetzt:</b><ul>${r.aenderungen.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; box.hidden = false; } catch (er) { alert(er.message); }
      return true;
    }
    if (t.closest('[data-vback]')) {
      if (!(await bpFrage('Diesen Stand wiederherstellen? Der jetzige Stand bleibt als älterer Stand erhalten und kann ebenso zurückgeholt werden.'))) return true;
      try { await JS(`api/bp/versionen/${id}/wiederherstellen`, 'POST'); } catch (er) { alert(er.message); return true; }
      if (opt && opt.nach) { opt.nach(); await reload(); } else location.reload();
      return true;
    }
    const nb = t.closest('[data-vname]');
    if (nb) {
      const n = (await bpEingabe('Name für diesen Stand (z. B. „vor der Umstellung“) – benannte Stände werden nie automatisch aufgeräumt. Leer = Name entfernen.', nb.dataset.vname));
      if (n === null) return true;
      try { await JS(`api/bp/versionen/${id}`, 'PATCH', { name: n }); } catch (er) { alert(er.message); }
      await reload(); return true;
    }
    return false;
  }
  /* Verlaufsfenster: links die Zeitleiste (nach Tagen, benannte Stände ★), rechts die Unterschiede des gewählten Stands –
     „Was hat sich geändert“ (gegenüber dem Stand davor) oder „Unterschied zu jetzt“. Jede Zeile lässt sich einzeln
     zurückholen (↶), der ganze Stand wiederherstellen. Symbole wie im Rückgängig-Dock: ＋ neu · ✎ geändert · 🗑 entfernt. */
  const vIc = (art) => ({ neu: '＋', weg: '🗑', reihe: '⇅' }[art] || '✎');
  const vZaehl = (A) => { const z = { neu: 0, aend: 0, weg: 0 }; (A || []).forEach((t) => { if (/hinzugefügt|angelegt|eingetragen/.test(t)) z.neu++; else if (/entfernt|gelöscht/.test(t)) z.weg++; else if (!/^… und/.test(t)) z.aend++; });
    const m = /… und (\d+) weitere/.exec((A || []).join(' ')); if (m) z.aend += +m[1]; return z; };
  const vTag = (s) => { const d = new Date(s), h = new Date(); const t = (x) => x.toISOString().slice(0, 10), g = new Date(h); g.setDate(h.getDate() - 1);
    return isNaN(d) ? '' : t(d) === t(h) ? 'Heute' : t(d) === t(g) ? 'Gestern' : d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const vUhr = (s) => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
  H.verlauf = async function (opt = {}) {
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = '<div class="bph-dlg bph-vx" role="dialog" aria-label="Ältere Stände"></div>';
    document.body.appendChild(bg); const root = bg.firstChild;
    const close = () => { bg.remove(); document.removeEventListener('keydown', esc1); };
    const esc1 = (e) => { if (e.key === 'Escape' && !document.querySelector('.bph-frage')) close(); };
    document.addEventListener('keydown', esc1);
    let D = null, msg = '', sel = null, DET = {}, modus = 'geaendert', filt = 'alle', such = '';
    const ich = (H.me && (H.me.name || H.me.display_name)) || '';
    const sicht = () => (D ? D.versionen : []).filter((v) => (filt !== 'name' || v.name) && (filt !== 'ich' || v.wer === ich)
      && (!such || ((v.aenderungen || []).join(' ') + ' ' + (v.name || '') + ' ' + (v.wer || '')).toLowerCase().includes(such.toLowerCase())));
    const links = () => { let tag = ''; return sicht().map((v) => { const t = vTag(v.wann), z = vZaehl(v.aenderungen), i0 = D.versionen[0] === v;
      const kopf = t !== tag ? `<div class="bph-vx-tag">${esc(t)}</div>` : ''; tag = t;
      return `${kopf}<button type="button" class="bph-vx-st${v.id === sel ? ' on' : ''}${i0 ? ' jetzt' : ''}${v.name ? ' named' : ''}" data-vsel="${v.id}"><span class="d"></span><span class="u">${vUhr(v.wann)}</span>
        <b>${v.name ? '★ ' + esc(v.name) : esc(v.wer || '–')}${i0 ? ' <i>jetziger Stand</i>' : ''}</b><span class="z">${z.neu ? `<em>＋${z.neu}</em>` : ''}${z.aend ? `<em>✎${z.aend}</em>` : ''}${z.weg ? `<em>🗑${z.weg}</em>` : ''}</span>
        <small>${esc(v.name && v.wer ? v.wer + ' · ' : '')}${esc((v.aenderungen || [])[0] || ART[v.art] || '')}</small></button>`; }).join('') || '<p class="bph-mu" style="padding:.6rem">Keine Stände für diesen Filter.</p>'; };
    const rechts = () => {
      const v = D && D.versionen.find((x) => x.id === sel); if (!v) return '<p class="bph-mu">Links einen Stand wählen.</p>';
      const d = DET[v.id], i0 = D.versionen[0] === v;
      const Z = d ? (modus === 'jetzt' ? d.jetzt : d.geaendert) : null;
      const gr = []; (Z || []).forEach((z, k) => { let g = gr.find((x) => x.g === z.gruppe); if (!g) gr.push(g = { g: z.gruppe, z: [] }); g.z.push([z, k]); });
      const zeile = ([z, k]) => `<div class="bph-vx-ln"><i>${vIc(z.art)}</i><span>${esc(z.text)}${z.alt != null || z.neu != null ? `: ${z.art === 'neu' ? '' : `<s>${esc(z.alt ?? 'leer')}</s> → `}<b>${esc(z.neu ?? 'leer')}</b>` : z.art === 'neu' ? ' <small>neu</small>' : z.art === 'weg' ? ' <small>entfernt</small>' : ''}</span>
        ${z.art !== 'reihe' && !(modus === 'geaendert' && d.erster) ? `<button type="button" class="bph-btn" data-vteil="${k}" title="${modus === 'jetzt' ? 'Nur diese Stelle aus dem Stand übernehmen' : 'Nur diese Änderung zurücknehmen'}">↶</button>` : ''}</div>`;
      return `<div class="bph-vx-k"><b>${esc(vTag(v.wann))} ${vUhr(v.wann)}${v.wer ? ' · ' + esc(v.wer) : ''}</b>${v.name ? ` <span class="bph-badge on">★ ${esc(v.name)}</span>` : ''}${ART[v.art] && !v.name ? ` <span class="bph-badge">${ART[v.art]}</span>` : ''}</div>
        <div class="bph-vx-seg" role="tablist"><button type="button" class="${modus === 'geaendert' ? 'on' : ''}" data-vmod="geaendert">Was hat sich geändert</button><button type="button" class="${modus === 'jetzt' ? 'on' : ''}" data-vmod="jetzt"${i0 ? ' disabled title="Das ist der jetzige Stand"' : ''}>Unterschied zu jetzt</button></div>
        ${!d ? '<p class="bph-mu">Lade …</p>' : !Z.length ? `<p class="bph-mu">${modus === 'jetzt' ? 'Entspricht dem jetzigen Stand.' : d.erster ? 'Ausgangsstand – davor gibt es keinen Stand.' : 'Keine inhaltliche Änderung.'}</p>`
          : gr.map((g) => `<div class="bph-vx-gr">${g.g ? `<h6>${esc(g.g)}</h6>` : ''}${g.z.map(zeile).join('')}</div>`).join('')}`;
    };
    const draw = () => {
      const v = D && D.versionen.find((x) => x.id === sel), i0 = v && D.versionen[0] === v;
      root.innerHTML = `<div class="bph-dh"><b>Ältere Stände${D ? ' · ' + esc(D.titel) : ''}</b><button type="button" class="bph-btn" data-vsave>★ Jetzigen Stand benennen …</button><button type="button" class="bph-x" data-kclose aria-label="Schließen">×</button></div>
        <div class="bph-vx-fl">${[['alle', 'Alle'], ['name', '★ benannte'], ['ich', 'von mir']].map(([k, t]) => `<button type="button" class="${filt === k ? 'on' : ''}" data-vfilt="${k}">${t}</button>`).join('')}<input type="search" data-vsuch placeholder="In Änderungen suchen …" value="${esc(such)}"></div>
        ${msg ? `<p class="bph-msg" style="margin:.4rem 1rem">${esc(msg)}</p>` : ''}
        <div class="bph-vx-bd"><div class="bph-vx-l">${D ? links() : '<p class="bph-mu" style="padding:.6rem">Lade …</p>'}</div><div class="bph-vx-r">${D ? rechts() : ''}</div></div>
        <div class="bph-vx-ft"><span class="bph-mu">Wiederherstellen legt selbst einen Stand an – der jetzige bleibt erhalten. Kennwörter und Schlüssel bleiben unverändert.</span>
          ${v ? `<button type="button" class="bph-btn" data-vname2="${esc(v.name || '')}">${v.name ? 'Umbenennen' : '★ Benennen'}</button>${i0 ? '' : '<button type="button" class="bph-btn pri" data-vback2>↶ Diesen Stand wiederherstellen</button>'}` : ''}</div>`;
    };
    const holeDet = async (id) => { if (DET[id]) return; try { DET[id] = await KX(`api/bp/versionen/${id}/details`); } catch (e) { DET[id] = { geaendert: [], jetzt: [], erster: true }; msg = e.message; } if (sel === id) draw(); };
    const fertig = async () => { DET = {}; if (opt.nach) opt.nach(); await load(); };
    const load = async () => { try { D = await KX('api/bp/versionen?bereich=' + encodeURIComponent(opt.bereich)); } catch (e) { msg = e.message; }
      if (D && (!sel || !D.versionen.some((x) => x.id === sel))) sel = (D.versionen[1] || D.versionen[0] || {}).id || null;
      draw(); if (sel) holeDet(sel); };
    root.addEventListener('input', (e) => { if (e.target.matches('[data-vsuch]')) { such = e.target.value; const l = root.querySelector('.bph-vx-l'); if (l) l.innerHTML = links(); } });
    root.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-kclose]')) { close(); return; }
      const s1 = t.closest('[data-vsel]'); if (s1) { sel = +s1.dataset.vsel; if (modus === 'jetzt' && D.versionen[0].id === sel) modus = 'geaendert'; draw(); holeDet(sel); return; }
      const f = t.closest('[data-vfilt]'); if (f) { filt = f.dataset.vfilt; draw(); return; }
      const m = t.closest('[data-vmod]'); if (m && !m.disabled) { modus = m.dataset.vmod; draw(); return; }
      if (t.closest('[data-vsave]')) { const n = await bpEingabe('Name für den jetzigen Stand, z. B. „vor Umstellung“ – benannte Stände werden nie automatisch aufgeräumt.', '');
        if (!n || !n.trim()) return; try { D = await JS('api/bp/versionen', 'POST', { bereich: opt.bereich, name: n.trim() }); msg = 'Stand „' + n.trim() + '“ festgehalten.'; sel = D.versionen[0] && D.versionen[0].id; } catch (er) { msg = er.message; } draw(); if (sel) holeDet(sel); return; }
      const nb = t.closest('[data-vname2]'); if (nb) { const n = await bpEingabe('Name für diesen Stand (leer = Name entfernen):', nb.dataset.vname2); if (n === null) return;
        try { await JS(`api/bp/versionen/${sel}`, 'PATCH', { name: n }); } catch (er) { msg = er.message; } await load(); return; }
      if (t.closest('[data-vback2]')) { if (!(await bpFrage('Diesen Stand wiederherstellen? Der jetzige Stand bleibt als älterer Stand erhalten und kann ebenso zurückgeholt werden.', { ok: 'Wiederherstellen' }))) return;
        try { await JS(`api/bp/versionen/${sel}/wiederherstellen`, 'POST'); } catch (er) { msg = er.message; draw(); return; }
        msg = 'Stand wiederhergestellt.'; if (opt.nach) await fertig(); else location.reload(); return; }
      const tb = t.closest('[data-vteil]'); if (tb) { const d = DET[sel], z = (modus === 'jetzt' ? d.jetzt : d.geaendert)[+tb.dataset.vteil]; if (!z) return;
        if (!(await bpFrage(`${modus === 'jetzt' ? 'Nur diese Stelle aus dem Stand übernehmen' : 'Nur diese Änderung zurücknehmen'}?\n„${z.text}“ – alles andere bleibt, wie es jetzt ist.`, { ok: 'Zurückholen' }))) return;
        try { await JS(`api/bp/versionen/${sel}/teil`, 'POST', { weg: z.weg, aus: modus === 'jetzt' ? 'stand' : 'davor' }); msg = `„${z.text}“ zurückgeholt.`; } catch (er) { msg = er.message; draw(); return; }
        if (opt.nach) await fertig(); else location.reload(); }
    });
    draw(); load();
  };
  /* Eigenes Kennwort ändern (die Benutzerverwaltung liegt nur in der Verwaltung) */
  H.kennwort = function () {
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Kennwort ändern" style="max-width:26rem"><div class="bph-dh"><b>Kennwort ändern</b><button type="button" class="bph-x" data-kc aria-label="Schließen">×</button></div><div class="bph-db">
      <p class="bph-mu">Gilt für alle Apps der Bauplattform. Mindestens 8 Zeichen.</p>
      <label style="display:block;margin:.4rem 0">Bisheriges Kennwort<input type="password" data-ka autocomplete="current-password"></label>
      <label style="display:block;margin:.4rem 0">Neues Kennwort<input type="password" data-kn autocomplete="new-password"></label>
      <label style="display:block;margin:.4rem 0">Neues Kennwort wiederholen<input type="password" data-kw autocomplete="new-password"></label>
      <p class="bph-mu" data-km></p>
      <div class="bph-row"><button type="button" class="bph-btn" data-kc>Abbrechen</button><button type="button" class="bph-btn pri" data-ks>Kennwort ändern</button></div></div></div>`;
    document.body.appendChild(bg);
    const q = (a) => bg.querySelector(a), close = () => bg.remove(), m = q('[data-km]');
   
    bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); if (e.key === 'Enter') q('[data-ks]').click(); });
    bg.addEventListener('click', async (e) => {
      if (e.target.closest('[data-kc]')) return close();
      if (!e.target.closest('[data-ks]')) return;
      const a = q('[data-ka]').value, n = q('[data-kn]').value;
      if (n !== q('[data-kw]').value) { m.textContent = 'Die beiden neuen Kennwörter stimmen nicht überein.'; return; }
      try { await KX('api/bp/kennwort', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alt: a, neu: n }) }); close(); if (window.toast) toast('Kennwort geändert.'); else alert('Kennwort geändert.'); }
      catch (err) { m.textContent = err.message; }
    });
    q('[data-ka]').focus();
  };
  /* Meine Postfächer: Microsoft 365 (zentral eingerichtet) an/aus und eigene IMAP-Konten */
  /* opt.into: in ein Element zeichnen (Einstellungen → Startseite → Posteingang) statt als Fenster; opt.nachSpeichern(D) */
  /* ---------- Vor Ort erkennen: iPhone-Kurzbefehl meldet den Standort, fehlt der Tagesbericht, kommt ein To-do (und abends eine Mail) ---------- */
  const kLinks = (k, feld) => {
    const adr = [k.street, [k.zip, k.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const tel = k.phone || k.mobile, telH = String(tel || '').replace(/[^\d+]/g, '');
    return [`<a href="#" class="bph-kf-a" data-kfe="${esc(feld)}" title="Kontakt öffnen">${esc(adr || k.name || 'Kontakt')}</a>`, esc(k.contact_person || ''),
      tel ? `<a href="tel:${esc(telH)}" title="Anrufen">☎ ${esc(tel)}</a>` : '',
      ...String(k.email || '').split(/[,;]\s*/).filter(Boolean).map((m) => `<a href="mailto:${esc(m.trim())}" title="E-Mail schreiben">✉ ${esc(m.trim())}</a>`)].filter(Boolean).join(' · ');
  };
  const kAdr = (k) => [[k.street, [k.zip, k.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), k.contact_person, k.phone || k.mobile ? '☎ ' + (k.phone || k.mobile) : '', k.email ? '✉ ' + k.email : ''].filter(Boolean).join(' · ');

  /* ---------- Stammdaten-Maske (Projekt mit Bauherr, LV, Angebot, Auftrag) – eine Maske für alle Apps ----------
     o: { titel, unter, gruppen: [{titel, felder:[{k,l,typ,opt?,hilfe?}]}], werte, zusatz(k, werte) → html neben dem Feld,
          speichern: async (werte, extra) → {werte?, hinweis?} , knoepfe: html in der Fußzeile, klick(e, ctx), herkunft: Schilder je Feld (bpHerkunft, bp.js) } */
  H.datenMaske = function (o) {
    let W = { ...(o.werte || {}) }, msg = '', dirty = false, rt = Math.max(0, o.reiter ? o.gruppen.findIndex((g) => String(g.titel || '').startsWith(o.reiter)) : 0);   // rt: gewählter Reiter (beim Öffnen der erste – oder o.reiter: Anfang der Überschrift)
    const RT = o.gruppen.length > 1 && !o.abschnitte, GEA = new Set(), GK = {};   // o.abschnitte: Schlüssel – eine Seite mit einklappbaren Gruppen statt Reitern (g.offen, o.kurz(g, W) in der Kopfzeile)   // mehrere Abschnitte: oben ein Reiter je Überschrift · GEA: Reiter mit ungespeicherten Änderungen (●) · GK: Feld → Reiter
    o.gruppen.forEach((g, i) => g.felder.forEach((f) => { GK[f.k] = i; }));
    const KC = {}, KF = {}, gefragt = {}, B = o.basis || '', EIG = new Set();   // EIG: Auswahlfelder, in die gerade ein eigener Wert getippt wird   // KC: Kontakt-ID → Kontakt · KF: Feld → Felddefinition (Typ kontakt)
    o.gruppen.forEach((g) => g.felder.forEach((f) => { if (f.typ === 'kontakt') KF[f.k] = f; }));
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = `<div class="bph-dlg bph-dm" role="dialog" style="width:min(${o.breite || 580}px,96vw)"></div>`; document.body.appendChild(bg);   // o.breite: breitere Maske (z. B. mit Tabelle)
    const root = bg.firstChild, e1 = (e) => {
      if (e.key === 'Escape') zu();
      else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.matches && e.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=date]):not([type=time]):not([list]):not([data-kfi])')
        && root.contains(e.target) && !document.querySelector('.bp-vs') && [...document.querySelectorAll('.bph-dlg-bg, .modal-bg')].pop() === bg) { e.preventDefault(); const b = root.querySelector('[data-dms]'); if (b) b.click(); }   // Enter = OK
    };
    const zu = async () => { if (dirty && !(await (window.bpFrage ? bpFrage('Änderungen verwerfen?', { ok: 'Verwerfen' }) : Promise.resolve(true)))) return; bg.remove(); document.removeEventListener('keydown', e1); };
    document.addEventListener('keydown', e1);
    const de = (v) => (v == null ? '' : String(v).replace('.', ','));
    const feld = (f) => {
      const v = W[f.k], id = 'dm_' + f.k, z = (o.zusatz ? o.zusatz(f.k, W, KC) || '' : '') + (o.herkunft && window.bpHerkunft ? bpHerkunft.schild(o.herkunft, f.k, W) : '');   // Herkunft: Schild blau/gelb mit ↺ (bp.js)
      const hilfe = f.hilfe ? `<small class="bph-mu" style="margin:.1rem 0 0">${esc(f.hilfe)}</small>` : '';
      if (f.typ === 'check') return `<label class="bph-ck bph-dm-w"><input type="checkbox" id="${id}" data-dm="${f.k}"${v ? ' checked' : ''}> ${esc(f.l)}</label>`;
      if (f.typ === 'html') return `<div class="bph-dm-w">${z}</div>`;   // nur Anzeige/Knöpfe (zusatz), kein Wert
      if (f.typ === 'liste' && window.bpTextliste) return bpTextliste.html(f, v, z, hilfe);   // vorbelegte Textzeilen: an/aus, Text frei, ↺ (bp.js)
      if (f.typ === 'chips') {   // Mehrfachauswahl (z. B. zuständige Bauleiter): opt = [{id, name}], Wert = Liste der ids
        const L_ = Array.isArray(v) ? v : [];
        return `<div class="bph-dm-f bph-dm-w"><span>${esc(f.l)}</span><span class="bph-chips">${(f.opt || []).map((u) => `<button type="button" class="bph-chip${L_.includes(u.id) ? ' on' : ''}" data-dmchip="${f.k}" data-v="${esc(u.id)}" aria-pressed="${L_.includes(u.id)}">${esc(u.name)}</button>`).join('') || '<small>–</small>'}</span>${z}${hilfe}</div>`;
      }
      if (f.typ === 'kontakt') {
        const kc = KC[W[f.k + '_kid']];
        const karte = kc ? `<span class="bph-kf-c"><span>${kLinks(kc, f.k) || '<i>keine Anschrift im Kontakt</i>'}</span><button type="button" class="bph-btn" data-kfe="${f.k}" title="Kontakt bearbeiten (gilt überall)">✎</button><button type="button" class="bph-btn" data-kfx="${f.k}" title="Verbindung lösen">×</button></span>`
          : v ? `<span class="bph-kf-c bph-kf-oh"><span>noch kein Kontakt</span><button type="button" class="bph-btn" data-kfn="${f.k}">＋ als Kontakt anlegen</button></span>` : '';
        return `<div class="bph-dm-f bph-dm-w"><span>${esc(f.l)}</span><span class="bph-kf" data-kf="${f.k}"><input id="${id}" data-dm="${f.k}" data-kfi="${f.k}" value="${esc(v || '')}" autocomplete="off" placeholder="Name eintippen – sucht in den Kontakten" role="combobox" aria-autocomplete="list"><span class="bph-kf-l" data-kfl hidden></span></span>${karte}${z}${hilfe}</div>`;
      }
      let inp;
      if (f.typ === 'textarea') inp = `<textarea id="${id}" data-dm="${f.k}" rows="3">${esc(v || '')}</textarea>`;
      else if (f.typ === 'auswahl' && !EIG.has(f.k)) {   // Auswahl mit üblichen Werten (opt: Werte oder [Wert, Anzeige]) – „eigener Wert …“ wird zum Textfeld
        const O = (f.opt || []).map((x) => (Array.isArray(x) ? x : [x, x])), cur = String(v ?? ''); if (cur && !O.some(([w]) => String(w) === cur)) O.push([cur, cur]);
        inp = `<select id="${id}" data-dm="${f.k}" data-dmaw="${f.k}"><option value="">–</option>${O.map(([w, t]) => `<option value="${esc(w)}"${String(w) === cur ? ' selected' : ''}>${esc(t)}</option>`).join('')}<option value="__eigen">✎ eigener Wert …</option></select>`;
      }
      else if (f.typ === 'auswahl') inp = `<span class="bph-dm-eig"><input id="${id}" data-dm="${f.k}" data-dmeig="${f.k}" value="${esc(v || '')}" placeholder="eigenen Wert eingeben" autocomplete="off"><button type="button" class="bph-btn" data-dmlz="${f.k}" title="zurück zur Auswahl" aria-label="zurück zur Auswahl">▾</button></span>`;   // eigener Wert: fertig getippt → wieder Auswahl
      else if (f.typ === 'select') inp = `<select id="${id}" data-dm="${f.k}">${(f.opt || []).map((x) => `<option value="${esc(x)}"${(v || '') === x ? ' selected' : ''}>${esc(x || '–')}</option>`).join('')}</select>`;
      else inp = `<input id="${id}" data-dm="${f.k}" type="${{ date: 'date', time: 'time', mail: 'email', tel: 'tel' }[f.typ] || 'text'}"${['zahl', 'eur', 'prozent'].includes(f.typ) ? ' inputmode="decimal"' : ''}${f.liste && (o.listen || {})[f.liste] ? ` list="${id}-l" autocomplete="off"` : ''} value="${esc(['zahl', 'eur', 'prozent'].includes(f.typ) ? de(v) : v || '')}">${f.liste && (o.listen || {})[f.liste] ? `<datalist id="${id}-l">${o.listen[f.liste].map((x) => (Array.isArray(x) ? `<option value="${esc(x[0])}" label="${esc(x[0] + ' ' + x[1])}">${esc(x[1])}</option>` : `<option value="${esc(x)}">`)).join('')}</datalist>` : ''}`;   // Textergänzung: o.listen[f.liste] = ['…'] oder [[Wert, Bezeichnung]]
      const einheit = { eur: '€', prozent: '%' }[f.typ];
      return `<label class="bph-dm-f bph-dm-sg${f.typ === 'textarea' || f.breit ? ' bph-dm-w' : ''}" for="${id}"><span>${esc(f.l)}</span><span class="bph-dm-i">${inp}${einheit ? `<em>${einheit}</em>` : ''}</span><span class="bph-dm-x">${z}${hilfe}</span></label>`;
    };
    const draw = () => {   // neu zeichnen, ohne dass die Maske nach oben springt
      const sb = root.querySelector('.bph-dm-b'), st = sb ? sb.scrollTop : 0;
      root.innerHTML = `<div class="bph-dlg-h"><b>${esc(o.titel)}</b>${o.unter ? `<span class="bph-mu" style="margin:0 0 0 .5rem">${esc(o.unter)}</span>` : ''}<button class="bph-x" data-dmx aria-label="Schließen">✕</button></div>
        ${RT ? `<div class="bph-dm-t" role="tablist">${o.gruppen.map((g, i) => `<button type="button" role="tab" class="${i === rt ? 'on' : ''}" aria-selected="${i === rt}" data-dmt="${i}"${g.titel.includes(' (') ? ` title="${esc(g.titel)}"` : ''}>${esc(g.titel.split(' (')[0])}<i${GEA.has(i) ? '' : ' hidden'} title="geändert, noch nicht gespeichert">●</i></button>`).join('')}</div>` : ''}
        <div class="bph-dm-b"><div class="${RT ? 'bph-dm-st' : ''}">${o.gruppen.map((g, i) => (o.abschnitte ? `<details class="bph-dm-ab" data-dmg="${i}" data-klapp="${esc(o.abschnitte + ':' + (g.k || i))}"${window.bpKlappOffen ? bpKlappOffen(o.abschnitte + ':' + (g.k || i), !!g.offen) : g.offen ? ' open' : ''}><summary><b>${esc(g.titel)}</b><small>${o.kurz ? o.kurz(g, W) : o.herkunft && window.bpHerkunft ? bpHerkunft.kurz(o.herkunft, g, W) : ''}</small></summary><div class="bph-dm-g">${g.felder.map(feld).join('')}</div></details>`
          : `<fieldset data-dmg="${i}"${RT && i !== rt ? ' class="aus"' : ''}>${RT ? '' : `<legend>${esc(g.titel)}</legend>`}<div class="bph-dm-g">${g.felder.map(feld).join('')}</div></fieldset>`)).join('')}</div></div>
        <div class="bph-row" style="align-items:center;margin-top:.6rem">${o.knoepfe || ''}<span class="bph-mu" data-dmm style="margin:0;flex:1">${esc(msg)}</span><button class="bph-btn" data-dmx>Abbrechen</button><button class="bph-btn pri" data-dms>OK</button></div>`;   // wie in allen Fenstern: Abbrechen verwirft, OK speichert und schließt
      const nb = root.querySelector('.bph-dm-b'); if (nb && st) nb.scrollTop = st;
    };
    const lesen = () => { root.querySelectorAll('[data-dm]').forEach((i) => { W[i.dataset.dm] = i.type === 'checkbox' ? i.checked : i.value; }); if (window.bpTextliste) bpTextliste.lesen(root, W); };
    const geaendert = (i) => { dirty = true; if (!RT || i == null || GEA.has(i)) return; GEA.add(i); const p = root.querySelector(`[data-dmt="${i}"] i`); if (p) p.hidden = false; };
    const aendern = (e) => { const g = e.target.closest && e.target.closest('[data-dmg]'); geaendert(g ? +g.dataset.dmg : null); };
    root.addEventListener('change', (e) => { const s = e.target.closest && e.target.closest('[data-dmaw]'); if (!s || s.value !== '__eigen') return;
      const k = s.dataset.dmaw; lesen(); W[k] = ''; EIG.add(k); draw(); const i = root.querySelector('#dm_' + k); if (i) i.focus(); });
    const zurAuswahl = (el, k) => { lesen(); EIG.delete(k); const f = o.gruppen.flatMap((g) => g.felder).find((x) => x.k === k), d = el.closest('.bph-dm-f'); if (f && d && d.parentNode && !d.dataset.weg) { d.dataset.weg = '1'; d.outerHTML = feld(f); } };   // nur dieses Feld tauschen – OK bleibt stehen
    root.addEventListener('change', (e) => { const i = e.target.closest && e.target.closest('[data-dmeig]'); if (i) zurAuswahl(i, i.dataset.dmeig); });   // eigener Wert getippt: wieder Auswahl (mit dem eigenen Wert)
    root.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-dmlz]'); if (b) zurAuswahl(b, b.dataset.dmlz); });
    root.addEventListener('input', aendern);
    root.addEventListener('change', aendern);
    const reiter = (i) => {   // Reiter wechseln: alle Abschnitte liegen übereinander, der größte bestimmt die Höhe – nichts springt
      if (!RT) return; rt = (i + o.gruppen.length) % o.gruppen.length;
      root.querySelectorAll('[data-dmt]').forEach((b) => { const an = +b.dataset.dmt === rt; b.classList.toggle('on', an); b.setAttribute('aria-selected', an); });
      root.querySelectorAll('[data-dmg]').forEach((f) => f.classList.toggle('aus', +f.dataset.dmg !== rt));
      const b = root.querySelector('.bph-dm-b'); if (b) b.scrollTop = 0;
    };
    root.addEventListener('keydown', (e) => {
      if (!RT) return;
      if (e.ctrlKey && (e.key === 'PageDown' || e.key === 'PageUp')) { e.preventDefault(); reiter(rt + (e.key === 'PageDown' ? 1 : -1)); return; }
      const t = e.target.closest && e.target.closest('[data-dmt]');
      if (t && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); reiter(rt + (e.key === 'ArrowRight' ? 1 : -1)); const n = root.querySelector(`[data-dmt="${rt}"]`); if (n) n.focus(); }
    });
    /* Kontaktfelder: tippen sucht in den Kontakten; nichts gefunden → „neu anlegen?“ → gewohnte Kontaktmaske */
    let kfT = 0, kfL = [], kfI = -1;
    const kfBox = (k) => root.querySelector(`[data-kf="${k}"] [data-kfl]`);
    const kfZu = () => root.querySelectorAll('[data-kfl]').forEach((b) => { b.hidden = true; b.innerHTML = ''; });
    const kfSetzen = (k, kc) => { lesen(); if (kc) { KC[kc.id] = kc; W[k] = kc.name; W[k + '_kid'] = kc.id; } else W[k + '_kid'] = null; gefragt[k] = W[k]; geaendert(GK[k]); draw(); };
    const kfZeigen = (k) => {
      const box = kfBox(k), t = (root.querySelector(`[data-kfi="${k}"]`) || {}).value || ''; if (!box) return;
      box.innerHTML = kfL.map((x, i) => `<button type="button" class="bph-kf-o${i === kfI ? ' on' : ''}" data-kfw="${i}" tabindex="-1"><b>${esc(x.name)}</b><small>${esc([x.trade, kAdr(x)].filter(Boolean).join(' · '))}</small></button>`).join('')
        + (t.trim() ? `<button type="button" class="bph-kf-o bph-kf-neu${kfI === kfL.length ? ' on' : ''}" data-kfn="${k}" tabindex="-1">＋ „${esc(t.trim())}“ als neuen Kontakt anlegen</button>` : '');
      box.hidden = !box.innerHTML;
    };
    const kfNeu = async (k) => {
      lesen(); const f = KF[k], t = (W[k] || '').trim();
      const vor = { name: t, trade: f.rolle || '' };
      if (k === 'bauherr') Object.assign(vor, { street: W.bh_strasse || '', zip: W.bh_plz || '', city: W.bh_ort || '', phone: W.bh_tel || '', email: W.bh_mail || '' });   // frühere Freitextangaben
      if (k === 'ansprech') Object.assign(vor, { contact_person: t, phone: W.tel || '', email: W.mail || '' });
      if (k === 'bauleiter_an') Object.assign(vor, { contact_person: t, phone: W.an_tel || '', email: W.an_mail || '' });
      const kc = await H.kontaktMaske(vor, { basis: B });
      if (kc) kfSetzen(k, kc); else { gefragt[k] = t; setTimeout(() => { const i = root.querySelector(`[data-kfi="${k}"]`); if (i) i.focus(); }, 30); }
    };
    root.addEventListener('input', (e) => {
      const k = e.target.dataset && e.target.dataset.kfi; if (!k) return;
      W[k + '_kid'] = null; W[k] = e.target.value; const kc = root.querySelector(`[data-kf="${k}"] ~ .bph-kf-c`); if (kc) kc.remove();
      clearTimeout(kfT); const t = e.target.value.trim(); kfI = -1;
      if (!t) { kfL = []; kfZu(); return; }
      kfT = setTimeout(async () => {
        try { kfL = await KX(B + 'api/bp/kontakte?q=' + encodeURIComponent(t) + '&rolle=' + encodeURIComponent(KF[k].rolle || '')); } catch { kfL = []; }
        if (document.activeElement === e.target && e.target.value.trim() === t) kfZeigen(k);
      }, 180);
    });
    root.addEventListener('keydown', (e) => {
      const k = e.target.dataset && e.target.dataset.kfi; if (!k) return;
      const box = kfBox(k), n = kfL.length + (e.target.value.trim() ? 1 : 0);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!n) return; e.preventDefault(); const ab = e.key === 'ArrowDown'; kfI = kfI < 0 ? (ab ? 0 : n - 1) : (kfI + (ab ? 1 : -1) + n) % n; kfZeigen(k); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (box && !box.hidden && kfI >= 0) { const b = box.querySelectorAll('.bph-kf-o')[kfI]; if (b) b.click(); } else e.target.blur(); return; }
      if (e.key === 'Escape' && box && !box.hidden) { e.stopPropagation(); kfZu(); }
    });
    root.addEventListener('mousedown', (e) => { if (e.target.closest('.bph-kf-o')) e.preventDefault(); });   // Fokus bleibt im Feld
    root.addEventListener('focusout', (e) => {
      const k = e.target.dataset && e.target.dataset.kfi; if (!k) return;
      const nach = e.relatedTarget;
      setTimeout(async () => {
        if (!root.isConnected || !e.target.isConnected || document.activeElement === e.target) return;
        kfZu(); const t = (e.target.value || '').trim();
        if (!t || W[k + '_kid'] || gefragt[k] === t) return;
        const gleich = kfL.find((x) => x.name.toLowerCase() === t.toLowerCase());
        if (gleich) { kfSetzen(k, gleich); return; }   // genau dieser Name ist ein Kontakt: verbinden
        if (nach && nach.closest && nach.closest('[data-dmx]')) return;
        gefragt[k] = t;
        if (window.bpFrage && await bpFrage(`„${t}“ gibt es in den Kontakten noch nicht. Als neuen Kontakt anlegen?`, { ok: 'Neu anlegen' })) kfNeu(k);
      }, 150);
    });
    root.addEventListener('click', async (e) => {
      if (e.target.closest('[data-dmx]')) { zu(); return; }
      const tb = e.target.closest('[data-dmt]'); if (tb) { reiter(+tb.dataset.dmt); return; }
      const kw = e.target.closest('[data-kfw]'); if (kw) { const kc = kfL[+kw.dataset.kfw], k = kw.closest('[data-kf]').dataset.kf; kfZu(); if (kc) { kfSetzen(k, kc); const i = root.querySelector(`[data-kfi="${k}"]`); if (i) i.focus({ preventScroll: true }); } return; }
      const kn = e.target.closest('[data-kfn]'); if (kn) { kfZu(); kfNeu(kn.dataset.kfn); return; }
      const ke = e.target.closest('[data-kfe]');
      if (ke) { e.preventDefault(); const k = ke.dataset.kfe, kc = await H.kontaktMaske(KC[W[k + '_kid']], { basis: B }); if (kc) kfSetzen(k, kc); return; }
      const kx = e.target.closest('[data-kfx]'); if (kx) { kfSetzen(kx.dataset.kfx, null); return; }
      const ch = e.target.closest('[data-dmchip]');
      if (ch) { lesen(); const k = ch.dataset.dmchip, f = Object.values(o.gruppen).flatMap((g) => g.felder).find((x) => x.k === k), id = (f.opt || []).find((u) => String(u.id) === ch.dataset.v);
        const L_ = Array.isArray(W[k]) ? [...W[k]] : []; const i = L_.indexOf(id.id); if (i >= 0) L_.splice(i, 1); else L_.push(id.id); W[k] = L_; geaendert(GK[k]); draw(); return; }
      const ctx = { werte: () => { lesen(); return W; }, setzen: (k, v) => { lesen(); W[k] = v; geaendert(GK[k]); draw(); }, nachricht: (t) => { msg = t; const m = root.querySelector('[data-dmm]'); if (m) m.textContent = t; } };
      const zr = e.target.closest('[data-dmzur]'); if (zr && o.herkunft) { ctx.setzen(zr.dataset.dmzur, o.herkunft.geerbt[zr.dataset.dmzur][0]); return; }   // ↺ zurück zum Wert der Quelle
      if (o.klick && await o.klick(e, ctx)) return;
      if (e.target.closest('[data-dms]')) {
        lesen(); ctx.nachricht('speichere …');
        try { const r = await o.speichern(W, ctx) || {}; dirty = false; GEA.clear(); zu();   // OK: gespeichert – Fenster zu; ein Hinweis über „Gespeichert.“ hinaus kommt als Meldung
          if (r.hinweis && r.hinweis !== 'Gespeichert.' && window.toast) window.toast(r.hinweis); }
        catch (er) { ctx.nachricht(er.message); }
      }
    });
    const kLaden = async () => {   // Anschrift/Telefon der verbundenen Kontakte
      const ids = Object.keys(KF).map((k) => W[k + '_kid']).filter((x) => x && !KC[x]);
      if (!ids.length) return;
      try { (await KX(B + 'api/bp/kontakte?ids=' + ids.join(','))).forEach((x) => { KC[x.id] = x; }); } catch { return; }
      if (!root.isConnected) return;
      const a = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : '';
      lesen(); draw(); const f = a && root.querySelector('#' + a); if (f) f.focus();
    };
    draw(); kLaden();
    setTimeout(() => { const i = root.querySelector('fieldset:not(.aus) :is(input:not([data-kfi]),textarea,select)'); if (i) i.focus(); }, 30);
    return { zu, neu: (w) => { W = { ...w }; GEA.clear(); draw(); kLaden(); } };
  };
  /* Projektdaten (Bauherr, Projekt, Termine) – aus Verwaltung, AVA und Baukosten dieselbe Maske */
  /* Projekt löschen (nur Administratoren): ankreuzen, aus welchen Apps – angekreuzte Teile kommen in den Papierkorb (Startseite), der Rest bleibt.
     Derselbe Ablauf wie in der Verwaltung → Projekte. */
  /* Was im Projekt steckt – genannt wird nur, was Inhalt hat (für den Lösch-Dialog hier und in der Verwaltung) */
  H.projektLoeschen = async function (pid, fertig) {
    let T; try { T = await KX(`api/bp/projekt/${pid}/teile`); } catch (e) { bpHinweis(e.message); return; }
    const opts = [['bt', T.bt.id, `<b>Das Projekt selbst</b><small>${H.projektInhalt(T.bt)}</small>`],
      ...T.plans.map((x) => ['plan', x.id, `<b>Bauzeitenplan „${esc(x.name)}“</b><small>mit ${x.versions} gespeicherten Versionen</small>`]),
      ...T.bks.map((x) => ['bk', x.id, `<b>Kostenermittlung „${esc(x.name)}“</b><small>mit Raumbuch, Schätzungen und ${x.files} Plänen (PDF)</small>`])];
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Projekt löschen" style="width:min(520px,96vw)"><div class="bph-dh"><b>Was soll gelöscht werden?</b><button type="button" class="bph-x" data-lx aria-label="Schließen">✕</button></div><div class="bph-db">
      <p class="bph-mu" style="margin-top:0">„${esc(T.name)}“ – angekreuzte Teile kommen in den Papierkorb (Startseite) und lassen sich dort wiederherstellen, alles andere bleibt.</p>
      <div class="bph-ldl">${opts.map(([, , l], n) => `<label><input type="checkbox" data-ln="${n}"${opts.length === 1 ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <div class="bph-row" style="justify-content:flex-end;margin-top:.8rem"><button type="button" class="bph-btn" data-lx>Abbrechen</button><button type="button" class="bph-btn bph-bad" data-lok${opts.length === 1 ? '' : ' disabled'}>🗑 In den Papierkorb</button></div></div></div>`;
    document.body.appendChild(bg);
    const sel = () => [...bg.querySelectorAll('[data-ln]:checked')].map((c) => opts[+c.dataset.ln]);
    bg.addEventListener('change', () => { bg.querySelector('[data-lok]').disabled = !sel().length; });
    bg.addEventListener('click', async (e) => {   // daneben klicken schließt nicht
      if (e.target.closest('[data-lx]')) { bg.remove(); return; }
      const ok = e.target.closest('[data-lok]'); if (!ok) return;
      const S = sel(); if (!S.length) return;
      ok.disabled = true; ok.textContent = 'Lösche …';
      try {
        const r = await KX(`api/bp/projekt/${pid}/loeschen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bt: S.some((o) => o[0] === 'bt'), plans: S.filter((o) => o[0] === 'plan').map((o) => o[1]), bks: S.filter((o) => o[0] === 'bk').map((o) => o[1]) }) });
        bg.remove();
        const t = 'Im Papierkorb: ' + r.done.join(', ') + (r.errors.length ? ' – Fehler: ' + r.errors.join('; ') : '');
        if (window.toast) toast(t, !!r.errors.length); else bpHinweis(t);
        if (S.some((o) => o[0] === 'bt') && H.projekt && H.projekt.id === +pid) { H.projekt = null; try { await KX('api/bp/projekt', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: null }) }); } catch { /* egal */ } }
        if (fertig) fertig(r); else setTimeout(() => location.reload(), 1200);
      } catch (er) { ok.disabled = false; ok.textContent = '🗑 In den Papierkorb'; bpHinweis(er.message); }
    });
  };
  H.projektDaten = async function (pid, basis, opt = {}) {
    if (!opt.onDelete && H.me && H.me.is_admin) opt = { ...opt, onDelete: (P) => H.projektLoeschen(P.id) };   // Administratoren: „In den Papierkorb …“ auch hier
    const url = (basis || '') + `api/bp/projekt/${pid}/daten`;
    const B = (basis || '') + (H.app === 'bautagebuch' ? 'api/' : 'api/bp/bt/');
    const J = (u, m, b) => KX(B + u, m ? { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined } : {});
    let D, P = null, LEAD = [];
    try { [D, LEAD] = await Promise.all([KX(url), J('leaders').catch(() => [])]); P = D.satz || null; }   // Bauvorhaben kommt mit den Projektdaten (nicht mehr die ganze Projektliste)
    catch (e) { (window.toast || bpHinweis)(e.message, true); return; }
    let inPlan = false;
    const PF = ['p_name', 'p_folder', 'p_leaders'];
    const BS = (() => { for (const g of D.felder) { const i = g.felder.findIndex((f) => f.k === 'baustelle'); if (i >= 0) return g.felder.splice(i, 1)[0]; } return null; })();   // MJ-B1: die Baustelle ist die Adresse des Projekts
    const pos = { lat: P ? P.lat : null, lon: P ? P.lon : null, geaendert: false };
    const vorn = P ? [{ titel: 'Bauvorhaben', felder: [
      { k: 'p_name', l: 'Bauvorhaben *', typ: 'text', breit: true, hilfe: 'Projektnummer und Name, z. B. A541 Schürmannstr. 4, Bottrop' },
      ...(BS ? [{ ...BS, l: 'Baustelle – Adresse des Projekts', hilfe: P.street || P.city ? `Anschrift des Projekts: ${[P.street, [P.zip, P.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')} – aus diesem Kontakt` : 'Kontakt wählen oder anlegen – daraus Anschrift und Standort des Projekts' }] : []),
      { k: 'p_karte', l: '', typ: 'html' },
      { k: 'p_leaders', l: 'Zuständige Bauleiter:in', typ: 'chips', opt: LEAD.map((u) => ({ id: u.id, name: u.name })), hilfe: 'Niemand ausgewählt: alle Benutzer:innen sehen das Projekt; sonst nur die Ausgewählten und die Administratoren. Erinnerungen aus dem Bauzeitenplan gehen nur an die Bauleitung – ohne Auswahl an niemanden.' },
      { k: 'p_folder', l: 'Projektordner auf dem Server', typ: 'text', breit: true, hilfe: 'leer = automatisch über das Kürzel; Unterordner mit /' }] }] : [];
    const W0 = P ? { p_name: P.name || '', p_folder: P.folder || '', p_leaders: [...(P.leaders || [])] } : {};
    const karte = () => { const q = pos.lat != null && pos.lon != null ? pos.lat + ',' + pos.lon : ''; if (!q) return ''; const e = encodeURIComponent(q);
      return `<div class="bph-map"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte" src="https://www.google.com/maps?q=${e}&hl=de&z=15&output=embed"></iframe><a href="https://www.google.com/maps/dir/?api=1&destination=${e}&travelmode=driving" target="_blank" rel="noopener">Route dorthin planen ↗</a></div>`; };
    /* Felder für Ausdrucke: eigene Felder der Druck-Layouts „je Projekt“ (Verwaltung → Druck-Layouts) – Schlüssel „dw:<feld>“ */
    const druckGruppe = () => ((D.druck || []).length ? [{ titel: 'Felder für Ausdrucke', felder: D.druck.map((x) => ({ k: 'dw:' + x.key, l: x.name, typ: 'text', breit: true, hilfe: x.hilfe || 'eigenes Feld der Druck-Layouts – steht auf jedem Ausdruck dieses Projekts' })) }] : []);
    const druckWerte = () => Object.fromEntries((D.druck || []).map((x) => ['dw:' + x.key, x.wert || '']));
    /* PD-B1 C1 (18.11.2026): eine Seite mit einklappbaren Gruppen; Felder mit Quelle folgen ihr (blau), überschrieben gelb mit ↺ (bpHerkunft, bp.js) */
    const app = (k) => { const a = ((H.conf || {}).apps || []).find((x) => x.key === k && x.allowed); return a && H.appUrl ? H.appUrl(a) + '/' : ''; };
    const HK = { get geerbt() { return D.geerbt || {}; }, get quellen() { return D.quellen || {}; }, ziele: Object.fromEntries(Object.entries(D.quelle_app || {}).map(([q, k]) => [q, app(k)]).filter(([, u]) => u)) };
    const GR = [...vorn, ...D.felder, ...druckGruppe(), ...(typeof window.loadNames === 'function' ? [{ titel: 'Bautagebuch', felder: [{ k: 'p_namen', l: '', typ: 'html' }] }] : [])].map((g, i) => ({ ...g, k: g.titel.split(' ')[0].toLowerCase(), offen: !i }));
    const M = H.datenMaske({
      titel: 'Projektdaten', unter: D.projekt, gruppen: GR, abschnitte: 'projektdaten', herkunft: HK, werte: { ...W0, ...D.werte, ...druckWerte() }, basis: basis || '',   // MJ-A1: Eigenes des Bautagebuchs in derselben Maske
      zusatz: (k, W, KC) => {
        if (k === 'p_karte') return `<span class="bph-dm-z" style="flex-wrap:wrap">${hatBT() ? `<button type="button" class="bph-btn" data-phier>Aktuellen Standort übernehmen</button>
          <span class="bph-mu">${pos.lat != null ? 'Standort gespeichert – das Bautagebuch wählt das Projekt automatisch, wenn du vor Ort bist.' : 'Noch kein Standort: Baustelle mit Anschrift wählen – oder „Aktuellen Standort übernehmen“.'}</span>` : ''}</span>${karte()}`;
        if (k === 'p_folder') return '<span class="bph-dm-z bph-mu" data-pordner>Ordner wird gesucht …</span>';
        if (k === 'p_namen') { setTimeout(() => window.loadNames(pid), 0); return '<div class="info" id="pnames">Namenskonventionen werden geladen …</div>'; }
        if (k === 'baubeginn') return D.plan.plaene.length && bpHerkunft.eigen(HK, k, W) ? `<label class="bph-ck" style="margin:.2rem 0 0"><input type="checkbox" data-inplan${inPlan ? ' checked' : ''}> beim Speichern als Projektanfang in den Bauzeitenplan übertragen</label>` : '';
        if (k === 'bh_firma') { const kc = KC[W.bauherr_kid], f = (kc && kc.firma) || { rechnung: W.bh_rechnung, ustid: W.bh_ustid, oeffentlich: W.bh_oeffentlich ? 'ja' : '' };   // PD-A1: am Kontakt der Bauherr:in
          return `<span class="bph-dm-z" style="flex-wrap:wrap">${esc([f.oeffentlich === 'ja' ? 'öffentliche:r Auftraggeber:in' : 'nicht öffentlich', f.ustid ? 'USt-IdNr. ' + f.ustid : '', f.rechnung ? 'Rechnung an: ' + f.rechnung.replace(/\n/g, ', ') : ''].filter(Boolean).join(' · '))} <span class="bph-q-z"><span class="bph-q">aus Adressen</span></span>${W.bauherr_kid ? '<button type="button" class="bph-btn" data-kfe="bauherr" title="Kontakt der Bauherr:in bearbeiten (gilt überall)">✎</button>' : '<span class="bph-mu">erst eine Bauherr:in wählen</span>'}</span>`; }
        if (k === 'gemarkung') return `<span class="bph-dm-z"><button type="button" class="bph-btn" data-kataster title="Gemarkung, Flur, Flurstück und Geländehöhe über NHN an der Baustelle – amtliche Daten von Geobasis NRW (wie TIM-online)">📍 aus ALKIS ermitteln (TIM-online)</button><span data-katinfo class="bph-mu"></span></span>`;
        return '';
      },
      klick: async (e, ctx) => {
        if (e.target.closest('[data-phier]')) {
          if (!navigator.geolocation) { ctx.nachricht('Standort nicht verfügbar.'); return true; }
          navigator.geolocation.getCurrentPosition(async (g) => {
            Object.assign(pos, { lat: g.coords.latitude, lon: g.coords.longitude, geaendert: true });
            ctx.nachricht('Standort übernommen – bitte speichern.');
          }, () => ctx.nachricht('Der Standort ist nicht verfügbar – bitte im Browser erlauben.'), { enableHighAccuracy: true, timeout: 10000 });
          return true;
        }
        if (e.target.closest('[data-parch]')) { const alt = !!(P && P.archived); try { await J('projects/' + pid, 'PUT', { archived: alt ? 0 : 1 }); P.archived = !alt; ctx.nachricht(alt ? 'Aus dem Archiv geholt.' : 'Projekt archiviert.'); if (opt.onSaved) opt.onSaved(pid); } catch (er) { ctx.nachricht(er.message); } return true; }
        if (e.target.closest('[data-pdel]')) { M.zu(); opt.onDelete(P); return true; }
        if (e.target.closest('[data-inplan]')) { inPlan = e.target.checked; return true; }
        const kb = e.target.closest('[data-kataster]');
        if (kb) {
          kb.disabled = true; const alt = kb.textContent; kb.textContent = '📍 frage Geobasis NRW …';
          try {
            const r = await KX((basis || '') + `api/bp/projekt/${pid}/kataster`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            const W = ctx.werte(), neu = r.werte || {};
            const alt2 = ['gemarkung', 'flur', 'flurstueck', 'hoehe_nhn'].filter((x) => W[x] && neu[x] && String(W[x]).trim() !== String(neu[x]).trim());
            if (alt2.length && !(await bpFrage('Vorhandene Angaben überschreiben?\n\n' + alt2.map((x) => `${{ gemarkung: 'Gemarkung', flur: 'Flur', flurstueck: 'Flurstück', hoehe_nhn: 'Höhe über NHN' }[x]}: ${W[x]} → ${neu[x]}`).join('\n')))) { kb.disabled = false; kb.textContent = alt; return true; }
            for (const [x, v] of Object.entries(neu)) ctx.setzen(x, v);
            ctx.nachricht('');   // keine Meldung: die Felder zeigen das Ergebnis
          } catch (er) { kb.disabled = false; kb.textContent = alt; ctx.nachricht(er.message); }
          return true;
        }
        return false;
      },
      speichern: async (W) => {
        let hinweis = '';
        if (P) {   // Bauvorhaben, Anschrift, Bauleiter, Ordner: im Bautagebuch (Standort, Ablage, Sichtbarkeit)
          const name = (W.p_name || '').trim().replace(/\s+/g, ' ');
          if (!name) throw new Error('Bitte einen Namen für das Bauvorhaben eingeben.');
          const body = {}, map = { p_name: 'name', p_folder: 'folder' };   // Anschrift: aus der Baustelle (Kern, stammdaten.projekt_schreiben)
          for (const [k, f] of Object.entries(map)) { const v = (W[k] || '').trim().replace(/\s+/g, ' '); if (v !== (P[f] || '')) body[f] = v; }
          if (JSON.stringify([...(W.p_leaders || [])].sort()) !== JSON.stringify([...(P.leaders || [])].sort())) body.leaders = W.p_leaders || [];
          if (pos.geaendert) { body.lat = pos.lat; body.lon = pos.lon; }
          if (Object.keys(body).length) {
            const r0 = await J('projects/' + pid, 'PUT', body);
            Object.assign(P, body, { leaders: body.leaders || P.leaders }); pos.geaendert = false;
            if (r0 && r0.geocoded === false) hinweis = 'Adresse nicht gefunden – bitte prüfen. ';
            if (H.projekt && H.projekt.id === +pid) H.projekt = null;
          }
        }
        const rest = Object.fromEntries(Object.entries(W).filter(([k]) => !PF.includes(k) && !k.startsWith('dw:')));
        const druck = Object.fromEntries(Object.entries(W).filter(([k]) => k.startsWith('dw:')).map(([k, v]) => [k.slice(3), String(v || '').trim()]));
        const r = await KX(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ werte: rest, in_plan: inPlan, ...(Object.keys(druck).length ? { druck } : {}) }) }); D = r; inPlan = false;
        if (opt.onSaved) setTimeout(() => opt.onSaved(pid), 0);
        return { werte: { ...W, ...r.werte, ...druckWerte() }, hinweis: hinweis + (r.hinweis || 'Gespeichert – gilt in allen Apps.') };
      },
      knoepfe: ''
        + (opt.archiv && P ? `<button type="button" class="bph-btn" data-parch>${P.archived ? 'Aus dem Archiv holen' : 'Projekt archivieren'}</button>` : '')
        + (opt.onDelete && P ? '<button type="button" class="bph-btn bph-bad" data-pdel>🗑 In den Papierkorb …</button>' : ''),
    });
    if (P) J('ablage/projektordner?project_id=' + pid).then((r) => {   // den automatisch gefundenen Ordner zeigen
      const el = document.querySelector('[data-pordner]'); if (!el) return;
      el.innerHTML = r && r.ok ? `${r.eingetragen ? 'Ordner' : 'Automatisch gefunden'}: <b>${esc(r.projekt)}</b>` : `<span style="color:#e07b3a">${esc((r && r.error) || 'Kein Ordner gefunden')}</span>`;
      const inp = document.querySelector('[data-dm="p_folder"]'); if (inp && r && r.ok && !r.eingetragen) inp.placeholder = r.projekt;
    }).catch(() => { const el = document.querySelector('[data-pordner]'); if (el) el.textContent = ''; });
    return M;
  };

  H.vorort = async function () {
    let D, msg = '';
    try { D = await KX('api/bp/vorort/einst'); } catch (e) { alert(e.message); return; }
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = '<div class="bph-dlg" role="dialog" aria-label="Vor Ort erkennen" style="width:min(760px,96vw)"></div>'; document.body.appendChild(bg);
    const root = bg.firstChild, e1 = (e) => { if (e.key === 'Escape') close(); };
    const close = () => { bg.remove(); document.removeEventListener('keydown', e1); };
    document.addEventListener('keydown', e1);
    const portal = ((H.conf || {}).apps || []).find((a) => a.key === 'portal');
    const basis = () => new URL((portal ? appUrl(portal) : '') + '/api/bp/vorort', location.href).href;
    const adresse = () => `${basis()}?k=${encodeURIComponent(D.schluessel)}&lat=`;
    const TG = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const put = async (b) => { try { D = await KX('api/bp/vorort/einst', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); msg = 'Gespeichert.'; } catch (e) { msg = e.message; } draw(); };
    const de = (d) => new Date(d + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
    function draw() {
      const E = D.einst;
      root.innerHTML = `<div class="bph-dh"><b>📍 Vor Ort erkennen (iPhone)</b><button type="button" class="bph-x" data-vx aria-label="Schließen">×</button></div><div class="bph-db">
        <p class="bph-mu">Dein iPhone meldet über einen Kurzbefehl, wo du bist. Liegt der Standort in der Arbeitszeit an einer Baustelle, merkt sich die Plattform nur <b>Projekt, Tag und Uhrzeit</b> – keine Koordinaten. Fehlt für den Tag der Tagesbericht, erscheint ein To-do${E.mail ? ' und am Ende der Arbeitszeit kommt eine Mail' : ''}.</p>
        <label class="bph-ck"><input type="checkbox" data-vf="an"${E.an ? ' checked' : ''}> eingeschaltet</label>
        <div class="bph-row" style="flex-wrap:wrap;gap:.6rem;align-items:center">Arbeitszeit <input type="time" data-vf="von" value="${esc(E.von)}" style="width:8.5rem"> bis <input type="time" data-vf="bis" value="${esc(E.bis)}" style="width:8.5rem">
          <span class="bph-chips">${TG.map((t, i) => `<button type="button" class="bph-chip${E.tage.includes(i) ? ' on' : ''}" data-vt="${i}">${t}</button>`).join('')}</span></div>
        <div class="bph-row" style="gap:.6rem;align-items:center">Baustelle erkannt bis <select data-vf="radius">${[100, 150, 250, 400, 600, 1000].map((r) => `<option value="${r}"${E.radius === r ? ' selected' : ''}>${r} m</option>`).join('')}</select> Entfernung (Projektadresse)</div>
        <label class="bph-ck"><input type="checkbox" data-vf="bericht"${E.bericht ? ' checked' : ''}> Tagesbericht automatisch anlegen – einmal am Tag je Baustelle, mit Ankunftszeit, Wetter und den Anwesenden laut Bauzeitenplan als Vorschlag</label>
        <label class="bph-ck"><input type="checkbox" data-vf="mail"${E.mail ? ' checked' : ''}> am Ende der Arbeitszeit per Mail erinnern, wenn der Tagesbericht fehlt oder noch nicht fertig ist (nicht als PDF erstellt)</label>
        <h4>Deine persönliche Adresse für den Kurzbefehl</h4>
        <div class="bph-row" style="gap:.4rem"><input readonly value="${esc(adresse())}" data-vadr style="flex:1;font-family:monospace;font-size:.82rem"><button type="button" class="bph-btn" data-vcopy>Kopieren</button><button type="button" class="bph-btn" data-vneu title="Alte Adresse wird ungültig – z. B. wenn das iPhone weg ist">Neuer Schlüssel</button></div>
        <h4>🚗 Fahrten automatisch (CarPlay)</h4>
        <p class="bph-mu">Ein zweiter Kurzbefehl „Fahrt beginnt“ bei <b>CarPlay verbindet</b> startet die Fahrt, „Baustelle melden“ bei <b>CarPlay trennt</b> beendet sie. Richtung und Projekt ergeben sich aus dem Ziel: an einer Baustelle „zur Baustelle“, am Büro „zurück ins Büro“ (Projekt der letzten Baustelle), sonst „Fahrt“ zum Bestätigen. Die Fahrt steht dann in der Zeiterfassung (erfasst, nicht geschätzt).</p>
        <div class="bph-row" style="gap:.4rem"><input readonly value="${esc(adresse().replace('&lat=', '&e=ein&lat='))}" data-vadr2 style="flex:1;font-family:monospace;font-size:.82rem"><button type="button" class="bph-btn" data-vcopy2>Kopieren</button></div>
        <p class="bph-mu">Nicht weitergeben – wer die Adresse kennt, kann Besuche für dich melden.</p>
        <details class="bph-anl"><summary><b>Anleitung: Kurzbefehl einrichten</b> (einmalig, ca. 5 Minuten)</summary>
          <ol>
            <li>Auf dem iPhone die App <b>Kurzbefehle</b> öffnen → <b>＋</b> (iOS 27: unten in der Mitte, sonst oben rechts). <b>iOS 27</b> fragt dann „Was soll dein Kurzbefehl tun?“ – nichts eintippen, sondern oben rechts <b>Bearbeiten</b>. Oben auf den Namen tippen → Umbenennen: „Baustelle melden“.</li>
            <li>Aktion <b>„Aktuellen Standort abrufen“</b> hinzufügen.</li>
            <li>Aktion <b>„Inhalte von URL abrufen“</b> hinzufügen (Suche „Inhalte“ oder Kategorie „Web“). In der Aktion auf das blaue Feld <b>URL</b> tippen und die Adresse oben einfügen (endet mit <code>&amp;lat=</code>). Direkt dahinter die Variable <b>Aktueller Standort → Breitengrad</b> einsetzen, dann <code>&amp;lon=</code> tippen und die Variable <b>Aktueller Standort → Längengrad</b> einsetzen. (Variable einsetzen: Cursor ans Ende der Adresse, über der Tastatur „Aktueller Standort“ antippen, dann die eingesetzte Variable antippen und „Breitengrad“ bzw. „Längengrad“ wählen.) Die <b>Methode</b> bleibt <b>GET</b> – dort keine Variable eintragen.</li>
            <li>Optional: Aktion <b>„Mitteilung anzeigen“</b> mit dem Ergebnis – dann siehst du „Vor Ort: A481 …“.</li>
            <li>Einmal antippen zum Testen (Standortzugriff erlauben) – unten unter „Letzte Besuche“ erscheint die Baustelle, wenn du dort bist.</li>
            <li><b>Automatisch starten – iOS 27:</b> im Editor oben <b>＋</b> → <b>Automation</b> → unter „Verbindungen“ <b>CarPlay</b> → „Trennt“. Mit dem Pfeil neben „Automation“ <b>„Vor dem Ausführen bestätigen“ ausschalten</b>. Zur Sicherheit zwei weitere Automationen <b>Tageszeit</b> (11:00 und 15:00, wöchentlich Mo–Fr). Dann unten <b>ⓘ</b> → <b>Datenschutz</b> → „Ausführen im gesperrten Zustand erlauben“ einschalten. Tipp: Einstellungen → Apps → Kurzbefehle → „Kurzbefehle öffnen in: Editor“ überspringt die KI-Frage.</li>
            <li><b>Automatisch starten – iOS 17 bis 26:</b> unten <b>Automation</b> → <b>＋</b> → <b>CarPlay</b> → „Trennt“ → <b>Sofort ausführen</b>, „Bei Ausführung benachrichtigen“ aus → Kurzbefehl „Baustelle melden“. Dazu zwei Automationen <b>Tageszeit</b> (11:00 und 15:00, Mo–Fr), ebenfalls sofort ausführen.</li>
            <li><b>Fahrten (CarPlay verbindet):</b> den Kurzbefehl „Baustelle melden“ duplizieren (lange drücken → Duplizieren), umbenennen in „Fahrt beginnt“ und in der URL die Adresse aus „Fahrten automatisch“ einsetzen (mit <code>&amp;e=ein</code>). Dann eine Automation <b>CarPlay → „Verbindet“</b> → sofort ausführen → „Fahrt beginnt“. Die vorhandene Automation „Trennt“ beendet die Fahrt.</li>
            <li><b>Ohne CarPlay:</b> statt CarPlay alle 30 Minuten in der Arbeitszeit einen Auslöser <b>Tageszeit</b> (07:00, 07:30 … 17:00, Mo–Fr). Jede Meldung braucht nur ein paar Sekunden GPS, der Akku merkt davon kaum etwas.</li>
          </ol>
          <p class="bph-mu">Ist der Kurzbefehl fertig, lässt er sich unter „Teilen → iCloud-Link kopieren“ an Kolleg:innen weitergeben – jeder trägt dann nur seine eigene Adresse ein. Die Automationen legt jeder selbst an (das erlaubt Apple nicht anders).</p></details>
        <div class="bph-row"><button type="button" class="bph-btn" data-vtest title="Mit dem Standort dieses Geräts ausprobieren">📍 Jetzt mit diesem Gerät testen</button></div>
        <h4>Letzte Besuche</h4>
        ${D.besuche.length ? `<div class="bph-vlist">${D.besuche.map((b) => `<div>${esc(de(b.datum))} · <b>${esc(b.projekt)}</b> · ${esc(b.von)}${b.bis !== b.von ? '–' + esc(b.bis) : ''} Uhr · ${b.bericht ? '✓ Bericht' : b.angelegt ? '<span style="color:#d08a1e">Bericht angelegt – ergänzen</span>' : '<span style="color:#d64545">kein Bericht</span>'}</div>`).join('')}</div>` : '<p class="bph-mu">Noch keine – sobald der Kurzbefehl eine Baustelle meldet, steht sie hier.</p>'}
        ${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}</div>`;
    }
    draw();
    root.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-vx]')) return close();
      const tg = t.closest('[data-vt]'); if (tg) { const T = new Set(D.einst.tage), i = +tg.dataset.vt; T.has(i) ? T.delete(i) : T.add(i); return put({ tage: [...T] }); }
      if (t.closest('[data-vcopy2]')) { const i = root.querySelector('[data-vadr2]'); i.select(); try { await navigator.clipboard.writeText(i.value); } catch { document.execCommand('copy'); } msg = 'Adresse für „Fahrt beginnt“ kopiert.'; draw(); return; }
      if (t.closest('[data-vcopy]')) { const i = root.querySelector('[data-vadr]'); i.select(); try { await navigator.clipboard.writeText(i.value); msg = 'Adresse kopiert.'; } catch { document.execCommand('copy'); msg = 'Adresse kopiert.'; } draw(); return; }
      if (t.closest('[data-vneu]')) { if ((await bpFrage('Neuen Schlüssel erzeugen? Der Kurzbefehl auf dem iPhone muss dann die neue Adresse bekommen.'))) put({ neuer_schluessel: true }); return; }
      if (t.closest('[data-vtest]')) {
        if (!navigator.geolocation) { msg = 'Dieses Gerät gibt keinen Standort heraus.'; return draw(); }
        msg = 'Standort wird bestimmt …'; draw();
        navigator.geolocation.getCurrentPosition(async (p) => {
          try { const r = await fetch(`${adresse()}${p.coords.latitude}&lon=${p.coords.longitude}`); msg = 'Antwort: ' + (await r.text()); D = await KX('api/bp/vorort/einst'); } catch (er) { msg = er.message; }
          draw();
        }, (er) => { msg = 'Standort nicht verfügbar: ' + er.message; draw(); }, { enableHighAccuracy: true, timeout: 15000 });
      }
    });
    root.addEventListener('change', (e) => {
      const f = e.target.dataset.vf; if (!f) return;
      put({ [f]: e.target.type === 'checkbox' ? e.target.checked : f === 'radius' ? +e.target.value : e.target.value });
    });
  };

  H.postfaecher = async function (opt = {}) {
    let D, msg = '';
    if (opt.into) opt.into.innerHTML = '<p class="bph-mu">Lade …</p>';
    try { D = await KX('api/bp/postfaecher'); } catch (e) { if (opt.into) opt.into.textContent = e.message; else alert(e.message); return; }
    let root, close;
    if (opt.into) { root = opt.into; close = () => {}; } else {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = '<div class="bph-dlg" role="dialog" aria-label="Meine Postfächer"></div>'; document.body.appendChild(bg);
      const e1 = (e) => { if (e.key === 'Escape') close(); };
      root = bg.firstChild; close = () => { bg.remove(); document.removeEventListener('keydown', e1); };
      document.addEventListener('keydown', e1);
    }
    const AB = D.abruf || { rhythmus: 'tag', uhrzeit: '08:00' }, EG = D.eigene || { aus: true, postfaecher: [], cc: true }, AZ = D.anzeige || { tage: 1, wochenende: true };
    const abrufText = () => ({ tag: `einmal am Tag um ${AB.uhrzeit} Uhr`, zweimal: `zweimal am Tag, um ${AB.uhrzeit} und 5 Stunden später`, stuendlich: 'stündlich von 7 bis 19 Uhr', hand: 'nur, wenn du ↻ Jetzt abrufen drückst' })[AB.rhythmus];
    const VORL = { gmail: ['imap.gmail.com', 993], webde: ['imap.web.de', 993], gmx: ['imap.gmx.net', 993], ionos: ['imap.ionos.de', 993], strato: ['imap.strato.de', 993], tonline: ['secureimap.t-online.de', 993], outlook: ['outlook.office365.com', 993] };
    const feld = (k, i, l, typ = 'text', ph = '') => `<label style="flex:1;min-width:9rem">${l}<input data-pf="${k}" data-pi="${i}" type="${typ}" value="${typ === 'password' ? '' : esc((D.konten[i] || {})[k] ?? '')}" placeholder="${esc(ph)}" autocomplete="${typ === 'password' ? 'new-password' : 'off'}"></label>`;
    function draw() {
      root.innerHTML = `${opt.into ? '' : '<div class="bph-dh"><b>Meine Postfächer</b><button type="button" class="bph-x" data-pc aria-label="Schließen">×</button></div>'}<div class="bph-db"${opt.into ? ' style="padding:0"' : ''}>
        <p class="bph-mu">Aus diesen Postfächern stellt die Startseite die Mails zu <b>deinen</b> Projekten zusammen – ${abrufText()} (und jederzeit mit ↻). Gelesen wird nur – nichts wird verschoben, gelöscht oder als gelesen markiert. Nur du siehst die Übersicht.</p>
        <h4>Abruf</h4>
        <div class="bph-row" style="align-items:flex-end"><label style="flex:1;min-width:12rem">Wie oft<select data-pab="rhythmus" style="width:100%;font:inherit;padding:.35rem .5rem;border-radius:calc(8px*var(--rk,1));border:1px solid var(--line,#3b3e42);background:var(--inp,transparent);color:inherit">${[['tag', 'einmal am Tag'], ['zweimal', 'zweimal am Tag'], ['stuendlich', 'stündlich (7–19 Uhr)'], ['hand', 'nur von Hand (↻)']].map(([k, l]) => `<option value="${k}"${AB.rhythmus === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
          ${AB.rhythmus === 'tag' || AB.rhythmus === 'zweimal' ? `<label style="width:8rem">${AB.rhythmus === 'zweimal' ? 'ab' : 'um'}<input type="time" data-pab="uhrzeit" value="${esc(AB.uhrzeit)}"></label>` : ''}</div>
        <h4>Anzeige</h4>
        <div class="bph-row" style="align-items:center"><label style="display:flex;align-items:center;gap:.5rem">Mails stehen<select data-paz="tage" style="font:inherit;padding:.3rem .5rem;border-radius:calc(8px*var(--rk,1));border:1px solid var(--line,#3b3e42);background:var(--inp,transparent);color:inherit">${[1, 2, 3, 5, 7, 14].map((t) => `<option value="${t}"${AZ.tage === t ? ' selected' : ''}>${t} Tag${t > 1 ? 'e' : ''}</option>`).join('')}</select>in der Übersicht</label></div>
        <label class="bph-ck"><input type="checkbox" data-pazw${AZ.wochenende ? ' checked' : ''}> Wochenende nicht mitzählen – die Mails vom Freitag stehen am Montag noch da</label>
        <p class="bph-mu">Mails, zu denen du eine Erinnerung angelegt hast, bleiben stehen, bis die Erinnerung erledigt ist.</p>
        <h4>Eigene Mails</h4>
        <label class="bph-ck"><input type="checkbox" data-peg${EG.aus ? ' checked' : ''}> Mails ausblenden, die wir selbst geschickt haben – von mir${(D.zugewiesen || []).length ? ` oder aus dem Büro-Postfach (${D.zugewiesen.map(esc).join(', ')}), auch in Kopie dorthin` : ' oder aus einem gemeinsamen Büro-Postfach, auch in Kopie dorthin'}</label>
        <label class="bph-ck"><input type="checkbox" data-pegc${EG.cc !== false ? ' checked' : ''}> Mails nur zur Kenntnis ausblenden – wir stehen nur in CC, nicht unter „An“</label>
        <div class="bph-row"${EG.aus ? '' : ' hidden'}><label style="flex:1">nur in diesen Postfächern <span class="bph-mu">(leer = in allen; mehrere mit Komma)</span><input data-pegp value="${esc(EG.postfaecher.join(', '))}" placeholder="alle Postfächer – z. B. ${esc((D.zugewiesen || [])[0] || D.email || 'mail@ihr-buero.de')} eintragen" list="bph-pegl" autocomplete="off"></label><datalist id="bph-pegl">${(D.zugewiesen || []).concat(D.email ? [D.email] : []).map((a) => `<option value="${esc(a)}">`).join('')}</datalist></div>
        <h4>Büro-Postfach (Microsoft 365)</h4>
        ${D.m365_zentral ? `<label class="bph-ck"><input type="checkbox" data-pm${D.m365 ? ' checked' : ''}> mein Postfach <b>${esc(D.email || '–')}</b> einbeziehen</label>${(D.zugewiesen || []).length ? `<p class="bph-mu">Dazu vom Administrator zugewiesen: <b>${D.zugewiesen.map(esc).join(', ')}</b></p>` : ''}<div class="bph-row"><button type="button" class="bph-btn" data-ptm>Probeweise lesen</button></div>`
          : '<p class="bph-mu">Noch nicht eingerichtet – das macht der Administrator einmal unter Verwaltung → Einstellungen → Mailserver.</p>'}
        <h4>Weitere eigene Postfächer (IMAP)</h4>
        ${D.konten.map((k, i) => `<div class="bph-tpl"><div class="bph-row"><label class="bph-ck" style="flex:1"><input type="checkbox" data-pf="an" data-pi="${i}"${k.an !== false ? ' checked' : ''}> <b>${esc(k.name || k.user)}</b></label><button type="button" class="bph-btn" data-pt="${i}">Testen</button><button type="button" class="bph-btn" data-pd="${i}">Entfernen</button></div>
          <div class="bph-row">${feld('name', i, 'Bezeichnung', 'text', 'z. B. Projektpostfach')}${feld('user', i, 'Benutzername / Adresse')}</div>
          <div class="bph-row">${feld('host', i, 'IMAP-Server', 'text', 'imap.example.de')}<label style="width:6rem">Port<input data-pf="port" data-pi="${i}" value="${esc(k.port || 993)}" inputmode="numeric"></label>${feld('ordner', i, 'Ordner', 'text', 'INBOX')}</div>
          <div class="bph-row">${feld('pass', i, k.pass_set ? 'Kennwort (gespeichert – zum Ändern neu eingeben)' : 'Kennwort / App-Passwort', 'password', k.pass_set ? '••••••••' : '')}</div></div>`).join('') || '<p class="bph-mu">Keine weiteren Postfächer.</p>'}
        <div class="bph-row"><select data-pv><option value="">+ Postfach hinzufügen …</option><option value="gmail">Gmail (mit App-Passwort)</option><option value="webde">WEB.DE</option><option value="gmx">GMX</option><option value="tonline">T-Online</option><option value="ionos">IONOS (1&1)</option><option value="strato">Strato</option><option value="eigen">anderer Anbieter</option></select></div>
        <p class="bph-mu">Gmail, GMX, WEB.DE & Co. verlangen meist ein <b>App-Passwort</b> und eingeschaltetes IMAP in den Einstellungen des Postfachs.</p>
        <div class="bph-row"><button type="button" class="bph-btn pri" data-ps>Speichern</button></div>${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}</div>`;
    }
    const lesen = () => { const az = root.querySelector('[data-paz="tage"]'); if (az) AZ.tage = +az.value; const azw = root.querySelector('[data-pazw]'); if (azw) AZ.wochenende = azw.checked; const eg = root.querySelector('[data-peg]'); if (eg) EG.aus = eg.checked; const egc = root.querySelector('[data-pegc]'); if (egc) EG.cc = egc.checked; const egp = root.querySelector('[data-pegp]'); if (egp) EG.postfaecher = egp.value.split(/[\s,;]+/).filter((a) => a.includes('@')); root.querySelectorAll('[data-pab]').forEach((el) => { AB[el.dataset.pab] = el.value || AB[el.dataset.pab]; }); root.querySelectorAll('[data-pf]').forEach((el) => { const k = D.konten[+el.dataset.pi]; if (!k) return; const f = el.dataset.pf; k[f] = el.type === 'checkbox' ? el.checked : el.value; }); const m = root.querySelector('[data-pm]'); if (m) D.m365 = m.checked; };
    root.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-pc]')) return close();
      if (t.closest('[data-pd]')) { lesen(); D.konten.splice(+t.closest('[data-pd]').dataset.pd, 1); draw(); return; }
      if (t.closest('[data-ps]')) { lesen(); try { D = { ...D, ...(await JS('api/bp/postfaecher', 'PUT', { m365: D.m365, konten: D.konten, abruf: AB, eigene: EG, anzeige: AZ })) }; Object.assign(AB, D.abruf || {}); Object.assign(EG, D.eigene || {}); Object.assign(AZ, D.anzeige || {}); msg = 'Gespeichert.'; if (opt.nachSpeichern) opt.nachSpeichern(D); } catch (er) { msg = er.message; } draw(); return; }
      if (t.closest('[data-ptm]')) { msg = 'lese …'; draw(); try { const r = await JS('api/bp/postfaecher/test', 'POST', { m365: true }); msg = r.ok ? '✔ ' + r.text : '✖ ' + r.error; } catch (er) { msg = er.message; } draw(); return; }
      const pt = t.closest('[data-pt]'); if (pt) { lesen(); msg = 'verbinde …'; draw(); try { const r = await JS('api/bp/postfaecher/test', 'POST', { konto: D.konten[+pt.dataset.pt] }); msg = r.ok ? '✔ ' + r.text : '✖ ' + r.error; } catch (er) { msg = er.message; } draw(); }
    });
    root.addEventListener('change', (e) => { if (e.target.closest('[data-pab="rhythmus"],[data-peg]')) { lesen(); draw(); return; } const v = e.target.closest('[data-pv]'); if (!v || !v.value) return; lesen(); const x = VORL[v.value] || ['', 993]; D.konten.push({ name: v.options[v.selectedIndex].text.replace(/ \(.*/, ''), host: x[0], port: x[1], user: '', ordner: 'INBOX', an: true }); draw(); });
    draw();
  };

  H.verlaufAlle = async function (opt = {}) {
    let root = opt.into, D = null, C = null, f = { teil: opt.teil || '', wer: '', q: '' }, msg = '';
    if (!root) {   // als Fenster (z. B. Adressen → Änderungsverlauf)
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Ältere Stände"><div class="bph-dh"><b>${esc(opt.titel || 'Ältere Stände')}</b><button type="button" class="bph-x" aria-label="Schließen">×</button></div><div class="bph-db"></div></div>`;
      document.body.appendChild(bg); root = bg.querySelector('.bph-db');
      const close = () => { bg.remove(); document.removeEventListener('keydown', esc1); };
      const esc1 = (e) => { if (e.key === 'Escape' && !document.querySelector('.bph-dlg-bg ~ .bph-dlg-bg')) close(); };
      document.addEventListener('keydown', esc1);
     
      bg.querySelector('.bph-x').onclick = close;
    }
    const draw = () => {
      const st = C && C.statistik;
      root.innerHTML = `<div class="bph-vall">
        <p class="bph-mu">Alle automatisch gespeicherten Stände von Einstellungen, Vorlagen, Raumtypen, Kostenermittlungen und Adressen. Bautagesberichte und Bauzeitenpläne haben ihren eigenen Verlauf in der jeweiligen App.</p>
        <div class="bph-row"><select data-vf="teil"><option value="">Alle Bereiche</option>${D ? Object.entries(D.teile).map(([k, l]) => `<option value="${k}"${f.teil === k ? ' selected' : ''}>${esc(l)}</option>`).join('') : ''}</select>
          <select data-vf="wer"><option value="">Alle Personen</option>${D ? D.wer.map((w) => `<option${f.wer === w ? ' selected' : ''}>${esc(w)}</option>`).join('') : ''}</select>
          <input data-vf="q" placeholder="Suchen …" value="${esc(f.q)}" style="flex:1;min-width:8rem"></div>
        ${!D ? '<p class="bph-mu">Lade …</p>' : D.versionen.length ? `<ul class="bph-vl">${D.versionen.map((v, i) => vItem(v, i, { titel: true })).join('')}</ul>` : '<p class="bph-mu">Keine Stände gefunden.</p>'}
        ${C ? `<h4>Aufbewahrung</h4><p class="bph-mu">Belegt: <b>${fmtB(st.bytes)}</b> in ${st.anzahl} Ständen (${st.bereiche} Bereiche)${st.seit ? ', seit ' + fmtT(st.seit).split(' ')[0] : ''} · letzte 30 Tage: ${st.monat_anzahl} Stände, ${fmtB(st.monat_bytes)}.
          Immer erhalten bleiben der jüngste Stand jedes Bereichs, benannte Stände und der Ausgangsstand.</p>
          <div class="bph-row"><label>alle Stände behalten <input type="number" min="1" max="3650" data-vc="alle_tage" value="${C.alle_tage}" style="width:5.5rem"> Tage</label>
          <label>danach einen je Tag bis <input type="number" min="0" max="3650" data-vc="taeglich_tage" value="${C.taeglich_tage}" style="width:5.5rem"> Tage <small class="bph-mu">(0 = nie löschen)</small></label>
          <button type="button" class="bph-btn pri" data-vcsave>Speichern</button></div>
          <p class="bph-mu">Vorschläge mit geschätztem Speicherbedarf (aus der Nutzung der letzten 30 Tage):</p>
          <div class="bph-row">${st.vorschlaege.map((v) => `<button type="button" class="bph-btn${v.alle_tage === C.alle_tage && v.taeglich_tage === C.taeglich_tage ? ' on' : ''}" data-vsug="${v.alle_tage},${v.taeglich_tage}">${esc(v.name)}: ${v.alle_tage} Tage alle, ${v.taeglich_tage ? `bis ${v.taeglich_tage} Tage täglich` : 'danach täglich unbegrenzt'} · ca. ${fmtB(v.bytes)}${v.hinweis ? ' ' + esc(v.hinweis) : ''}</button>`).join('')}</div>` : ''}
        ${msg ? `<p class="bph-msg">${esc(msg)}</p>` : ''}</div>`;
    };
    const load = async () => {
      try { D = await KX('api/bp/versionen/alle?' + new URLSearchParams(f)); if (D.admin && !C) C = await KX('api/bp/versionen/conf'); } catch (e) { msg = e.message; }
      draw();
    };
    let tm = null;
    root.addEventListener('change', (e) => { const k = e.target.dataset.vf; if (k && k !== 'q') { f[k] = e.target.value; load(); } });
    root.addEventListener('input', (e) => { if (e.target.dataset.vf === 'q') { f.q = e.target.value; clearTimeout(tm); tm = setTimeout(async () => { await load(); const q = root.querySelector('[data-vf="q"]'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 350); } });
    root.addEventListener('click', async (e) => {
      const sg = e.target.closest('[data-vsug]');
      if (sg) { const [a, t] = sg.dataset.vsug.split(','); root.querySelector('[data-vc="alle_tage"]').value = a; root.querySelector('[data-vc="taeglich_tage"]').value = t; return; }
      if (e.target.closest('[data-vcsave]')) {
        const d = {}; root.querySelectorAll('[data-vc]').forEach((x) => { d[x.dataset.vc] = +x.value || 0; });
        if (d.taeglich_tage && d.taeglich_tage < d.alle_tage) { msg = '„bis … Tage“ muss mindestens so groß sein wie „alle Stände behalten“.'; draw(); return; }
        try { C = await JS('api/bp/versionen/conf', 'PUT', d); msg = 'Aufbewahrung gespeichert' + (C.entfernt ? `, ${C.entfernt} ältere Stände aufgeräumt.` : '.'); } catch (er) { msg = er.message; }
        draw(); return;
      }
      await vClick(e, root, load, { nach: () => { const f2 = H.nachVerlauf || window.bpNachVerlauf; if (f2 && !opt.into) f2(); } });
    });
    draw(); load();
  };
})();
