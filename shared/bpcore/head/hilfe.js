'use strict';
/* Fehler melden (🐞), Hilfe-Anfragen und Live-Hilfe – aus head.js ausgelagert (23.11.2026): geladen erst, wenn es gebraucht wird (BPHead.baustein('hilfe')).
   Gemeinsame Hilfen der Kopfleiste über BPHead._i (head.js). */
(function () {
  const H = window.BPHead, { esc, KX, BUGP, HSTAND, hilfeZaehler } = H._i;
  let HLIVE = null, HFENSTER = null;
  const hAppName = () => { const band = H._i.band(); return ((band && band.querySelector('.bph-app') ? band.querySelector('.bph-app').textContent : '') || H.app || document.title).trim().slice(0, 60); };
  /* ---------- Fehler melden (🐞): Beschreibung, Bildschirmfoto, dazu automatisch die wichtigen Angaben für die Entwicklung ---------- */
  /* Was Fehlermeldungen und Hilfe-Anfragen automatisch mitschicken (keine Eingaben aus Feldern) */
  function bugKontext() {
    let zustand = null; try { zustand = typeof window.bpBugZustand === 'function' ? window.bpBugZustand() : null; } catch (e) { zustand = { fehler: String(e) }; }
    return { url: location.href.replace(/([?&](token|key|pw)=)[^&#]*/gi, '$1…'), titel: document.title, app: H.app || '', projekt: H.projekt ? `${H.projekt.name || ''} (${H.projekt.id})` : '',
      modus: H.modus || '', version: (H.conf && H.conf.version) || '', fenster: `${innerWidth}×${innerHeight}, Zoom ${Math.round(devicePixelRatio * 100)} %`, zustand,
      fehler: BUGP.fehler.slice(), anfragen: BUGP.anfragen.slice(), klicks: BUGP.klicks.slice(-20) };
  }
  const bildVerkleinern = (src, max = 2000, q = 0.85) => new Promise((ok, bad) => { const im = new Image(); im.onload = () => { const f = Math.min(1, max / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = Math.round(im.width * f); cv.height = Math.round(im.height * f); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ok(cv.toDataURL('image/jpeg', q)); }; im.onerror = () => bad(new Error('Das Bild konnte nicht gelesen werden.')); im.src = src; });
  /* Diese Ansicht aufnehmen (Browser fragt, welcher Tab) → JPEG-Daten-URL oder '' (abgebrochen) */
  async function ansichtAufnehmen() {
    if (!window.isSecureContext) { bpHinweis('Aufnehmen geht nur über eine sichere Adresse (https://…) – hier ist die Seite über ' + location.protocol + '//' + location.host + ' geöffnet, das erlaubt der Browser nicht. Bitte mit Win+Umschalt+S ein Bildschirmfoto machen und hier mit Strg+V einfügen.'); return ''; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { bpHinweis('Dieser Browser kann die Ansicht nicht selbst aufnehmen. Bitte mit Win+Umschalt+S ein Bildschirmfoto machen und hier mit Strg+V einfügen.'); return ''; }
    try {
      const st = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
      const v = document.createElement('video'); v.srcObject = st; v.muted = true; await v.play(); await new Promise((ok) => setTimeout(ok, 350));
      const cv = document.createElement('canvas'); cv.width = v.videoWidth; cv.height = v.videoHeight; cv.getContext('2d').drawImage(v, 0, 0);
      st.getTracks().forEach((t) => t.stop());
      return await bildVerkleinern(cv.toDataURL('image/png'));
    } catch (er) { if (er && er.name !== 'NotAllowedError') bpHinweis('Aufnehmen hat nicht geklappt – bitte mit Win+Umschalt+S ein Bildschirmfoto machen und hier mit Strg+V einfügen.'); return ''; }
  }
  H.bugMelden = function (vor = {}) {
    if (document.querySelector('.bph-bugdlg')) return;
    let bild = vor.bild || '';
    const kontext = bugKontext;
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-bugdlg';
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Fehler melden" style="width:min(560px,96vw)"><div class="bph-dh"><b>🐞 Fehler melden</b><button type="button" class="bph-x" data-bx aria-label="Schließen">✕</button></div><div class="bph-db">
      <label style="display:block">Was ist passiert – und was hättest du erwartet?<textarea data-btext rows="5" maxlength="8000" style="width:100%;margin-top:.3rem" placeholder="z. B. Ich habe im LV auf „Speichern“ geklickt, dann war die Position weg.">${esc(vor.text || '')}</textarea></label>
      <div class="bph-row" style="margin-top:.6rem;flex-wrap:wrap;gap:.4rem"><button type="button" class="bph-btn" data-bshot>📷 Diese Ansicht aufnehmen</button><label class="bph-btn">🖼 Bild wählen<input type="file" accept="image/png,image/jpeg,image/webp" data-bfile hidden></label><small class="bph-mu" style="align-self:center">oder ein Bild mit Strg+V einfügen</small></div>
      <div data-bvor style="margin-top:.5rem"></div>
      <details style="margin-top:.6rem"><summary class="bph-mu" style="cursor:pointer">Was automatisch mitgeschickt wird</summary><pre data-bk style="white-space:pre-wrap;font-size:.72rem;max-height:14rem;overflow:auto;margin:.4rem 0 0"></pre>
        <small class="bph-mu">Adresse, App, Projekt, Browser, Fenstergröße, Version, die letzten Fehlermeldungen und Klicks auf dieser Seite – keine Eingaben aus Feldern. Die Meldung sieht nur die Verwaltung.</small></details>
      <div class="bph-row" style="justify-content:flex-end;margin-top:.8rem"><button type="button" class="bph-btn" data-bx>Abbrechen</button><button type="button" class="bph-btn pri" data-bok>Melden</button></div></div></div>`;
    document.body.appendChild(bg);
    const dlg = bg.querySelector('.bph-dlg'); dlgBeweglich(dlg);
    const kz = (k) => [`Adresse: ${k.url}`, `App: ${k.app || k.titel}`, k.projekt && `Projekt: ${k.projekt}`, `Ansicht: ${k.modus}`, `Version: ${k.version}`, `Fenster: ${k.fenster}`, `Browser: ${navigator.userAgent}`,
      `Fehler auf dieser Seite: ${k.fehler.length}`, `Fehlgeschlagene Anfragen: ${k.anfragen.length}`, `Letzte Klicks: ${k.klicks.length}`].filter(Boolean).join('\n');
    bg.querySelector('[data-bk]').textContent = kz(kontext());
    const vorschau = () => { const v = bg.querySelector('[data-bvor]'); v.innerHTML = bild ? `<div style="position:relative;display:inline-block"><img src="${bild}" alt="Bildschirmfoto" style="max-width:100%;max-height:220px;border:1px solid var(--bph-line,#ccc);border-radius:calc(6px*var(--rk,1))"><button type="button" class="bph-x" data-bweg title="Bild entfernen" aria-label="Bild entfernen" style="position:absolute;top:4px;right:4px;background:#fff">✕</button></div>` : ''; };
    const verkleinern = (src) => bildVerkleinern(src);
    const ausDatei = (f) => { if (!f || !/^image\//.test(f.type)) return; const r = new FileReader(); r.onload = async () => { try { bild = await verkleinern(r.result); vorschau(); } catch (e) { bpHinweis(e.message); } }; r.readAsDataURL(f); };
    const zu = () => { bg.remove(); document.removeEventListener('paste', einfuegen, true); };
    const einfuegen = (e) => { const it = [...((e.clipboardData && e.clipboardData.items) || [])].find((x) => x.type.startsWith('image/')); if (it) { e.preventDefault(); ausDatei(it.getAsFile()); } };
    document.addEventListener('paste', einfuegen, true);
    bg.addEventListener('dragover', (e) => e.preventDefault());
    bg.addEventListener('drop', (e) => { e.preventDefault(); ausDatei(e.dataTransfer.files[0]); });
    bg.querySelector('[data-bfile]').addEventListener('change', (e) => ausDatei(e.target.files[0]));
    bg.addEventListener('click', async (e) => {
      if (e.target.closest('[data-bx]')) { if (!bg.querySelector('[data-btext]').value.trim() && !bild || await bpFrage('Meldung verwerfen?', { ok: 'Verwerfen' })) zu(); return; }   // daneben klicken schließt nicht
      if (e.target.closest('[data-bweg]')) { bild = ''; vorschau(); return; }
      if (e.target.closest('[data-bshot]')) { bg.style.visibility = 'hidden'; const x = await ansichtAufnehmen(); bg.style.visibility = ''; if (x) { bild = x; vorschau(); } return; }
      if (e.target.closest('[data-bok]')) {
        const text = bg.querySelector('[data-btext]').value.trim();
        if (text.length < 3) { bpHinweis('Bitte kurz beschreiben, was passiert ist.'); return; }
        const k = bg.querySelector('[data-bok]'); k.disabled = true; k.textContent = 'wird gesendet …';
        try {
          const r = await fetch('api/bp/bug', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: H.app || document.title, text, bild, kontext: kontext() }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || 'Senden hat nicht geklappt (' + r.status + ').');
          zu(); if (window.toast) toast('Danke! Die Meldung ist bei der Verwaltung angekommen (Nr. ' + j.id + ').'); else bpHinweis('Danke! Die Meldung ist angekommen (Nr. ' + j.id + ').');
        } catch (er) { k.disabled = false; k.textContent = 'Melden'; bpHinweis(er.message); }
      }
    });
    if (bild) vorschau();
    setTimeout(() => bg.querySelector('[data-btext]').focus(), 0);
  };

  /* ---------- Hilfe & Fehler (🐞?): Frage per Nachricht, Live-Hilfe mit geteiltem Bildschirm, Fehler melden ----------
     Live-Hilfe ohne Zusatzdienst: der Browser des Hilfesuchenden schickt etwa ein Bild pro Sekunde an den Server, der Helfer holt es ab.
     Fernsteuern gibt es nicht – der Helfer zeigt mit einem roten Zeiger (mit Text) und schreibt. Nichts davon wird aufbewahrt. */
  const HJ = (u, m, d) => KX(u, m ? { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d || {}) } : {});
  const hZeit = (t) => { if (!t) return ''; const d = new Date(t), h = new Date(); return d.toDateString() === h.toDateString() ? d.toTimeString().slice(0, 5) : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + d.toTimeString().slice(0, 5); };
  const hVerlauf = (L) => L.map((m) => `<div class="bph-hm${m.ich ? ' ich' : ''}"><small>${esc(m.von)} · ${esc(hZeit(m.ts))}</small><p>${esc(m.text)}</p></div>`).join('') || '<p class="bph-mu">Noch keine Nachrichten.</p>';
  H.hilfe = async function (o = {}) {
    if (document.querySelector('.bph-hdlg')) return;
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-hdlg';
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Hilfe und Fehler" style="width:min(640px,96vw)"><div class="bph-dh"><b>🐞 Hilfe &amp; Fehler</b><button type="button" class="bph-x" data-hx aria-label="Schließen">✕</button></div><div class="bph-db" data-hb></div></div>`;
    document.body.appendChild(bg);
    const B = bg.querySelector('[data-hb]'); let ansicht = o.id ? 'faden' : 'start', fid = o.id || 0, bild = '', D = { meine: [], offen: [] }, tFaden = 0, letzte = 0;
    const zu = () => { clearInterval(tFaden); bg.remove(); document.removeEventListener('paste', einf, true); };
    const einf = (e) => { if (ansicht !== 'frage') return; const it = [...((e.clipboardData && e.clipboardData.items) || [])].find((x) => x.type.startsWith('image/')); if (!it) return; e.preventDefault(); const r = new FileReader(); r.onload = async () => { try { bild = await bildVerkleinern(r.result); zeigen(); } catch (er) { bpHinweis(er.message); } }; r.readAsDataURL(it.getAsFile()); };
    document.addEventListener('paste', einf, true);
    const laden = async () => { try { D = await KX('api/bp/hilfe'); HSTAND.helfer = D.helfer; } catch (e) { D = { meine: [], offen: [], fehler: e.message }; } };
    const zeile = (x, helfer) => `<button type="button" class="bph-hz" data-hf="${x.id}"><span class="bph-hz-a">${x.art === 'live' ? '🖥️' : '✉️'}</span><span class="bph-hz-t"><b>${esc(helfer ? x.user_name : (x.text || x.art_name).slice(0, 80))}</b><small>${esc([helfer ? (x.letzte ? x.letzte.text : x.text).slice(0, 90) : (x.letzte ? x.letzte.von + ': ' + x.letzte.text : ''), x.app, x.projekt].filter(Boolean).join(' · ').slice(0, 160))}</small></span><span class="bph-hz-s"><span class="bph-hs ${esc(x.status)}">${esc(x.status_name)}${x.helfer_name && x.status === 'laeuft' ? ' · ' + esc(x.helfer_name) : ''}</span>${x.neu ? `<span class="bph-hneu">${x.neu} neu</span>` : ''}<small>${esc(hZeit(x.geaendert || x.ts))}</small></span></button>`;
    async function zeigen() {
      if (ansicht === 'start') {
        const offen = (D.offen || []).filter((x) => x.user_id !== (H.me || {}).id);
        B.innerHTML = `<div class="bph-hk">
            <button type="button" class="bph-hc" data-ha="bug"><span>🐞</span><b>Fehler melden</b><small>Kurz beschreiben, Bildschirmfoto dazu. Geht an die Verwaltung.</small></button>
            <button type="button" class="bph-hc" data-ha="frage"><span>✉️</span><b>Frage stellen</b><small>Nachricht mit Foto an die Helfer im Büro. Die Antwort kommt hier und per Mail.</small></button>
            <button type="button" class="bph-hc" data-ha="live"><span>🖥️</span><b>Live-Hilfe</b><small>Bildschirm teilen – ein Helfer sieht deine Ansicht, zeigt mit dem Zeiger und schreibt mit.</small></button></div>
          ${HLIVE ? '<p class="bph-hinfo">🔴 Du teilst gerade deinen Bildschirm. Beenden über den roten Balken oben.</p>' : ''}
          ${D.helfer ? `<h4 class="bph-hh">Anfragen an die Helfer${offen.length ? ` · ${offen.length}` : ''}</h4>${offen.map((x) => zeile(x, true)).join('') || '<p class="bph-mu">Keine offenen Anfragen.</p>'}` : ''}
          <h4 class="bph-hh">Meine Anfragen</h4>${(D.meine || []).slice(0, 12).map((x) => zeile(x, false)).join('') || '<p class="bph-mu">Noch keine – Fragen und Antworten bleiben hier stehen.</p>'}
          ${D.fehler ? `<p class="bph-mu">${esc(D.fehler)}</p>` : ''}`;
      } else if (ansicht === 'frage' || ansicht === 'live') {
        const live = ansicht === 'live';
        B.innerHTML = `<button type="button" class="bph-hback" data-ha="start">‹ zurück</button>
          <label style="display:block;margin-top:.4rem">${live ? 'Worum geht es? (kurz, optional)' : 'Deine Frage'}<textarea data-ht rows="${live ? 2 : 5}" maxlength="8000" style="width:100%;margin-top:.3rem" placeholder="${live ? 'z. B. Ich finde im Auftrag den Nachtrag nicht.' : 'z. B. Wie bekomme ich den Nachtrag NT3 in die Teilrechnung?'}"></textarea></label>
          ${live ? `<p class="bph-mu" style="font-size:.85em">Nach „Bildschirm teilen“ fragt der Browser, was geteilt wird – am besten <b>diesen Tab</b>. Die Helfer bekommen sofort Bescheid. Sie sehen nur, was du teilst, können aber nichts anklicken. Beenden jederzeit über den roten Balken oben; aufbewahrt wird nichts.</p>`
            : `<div class="bph-row" style="margin-top:.5rem"><button type="button" class="bph-btn" data-ha="shot">📷 Diese Ansicht aufnehmen</button><label class="bph-btn">🖼 Bild wählen<input type="file" accept="image/png,image/jpeg,image/webp" data-hfile hidden></label><small class="bph-mu" style="align-self:center">oder mit Strg+V einfügen</small></div>
            ${bild ? `<div style="position:relative;display:inline-block;margin-top:.4rem"><img src="${bild}" alt="Bild zur Frage" style="max-width:100%;max-height:200px;border:1px solid var(--line,#ccc);border-radius:calc(6px*var(--rk,1))"><button type="button" class="bph-x" data-ha="bildweg" aria-label="Bild entfernen" style="position:absolute;top:4px;right:4px;background:#fff;color:#111">✕</button></div>` : ''}
            <p class="bph-mu" style="font-size:.8em;margin:.5rem 0 0">Mitgeschickt werden automatisch Seite, App, Projekt und Browser – wie beim Fehlermelden, keine Eingaben aus Feldern.</p>`}
          <div class="bph-row" style="justify-content:flex-end;margin-top:.7rem"><button type="button" class="bph-btn" data-ha="start">Abbrechen</button><button type="button" class="bph-btn pri" data-ha="${live ? 'livelos' : 'senden'}">${live ? '🖥️ Bildschirm teilen' : 'Senden'}</button></div>`;
        setTimeout(() => { const t = B.querySelector('[data-ht]'); if (t) t.focus(); }, 0);
        const f = B.querySelector('[data-hfile]'); if (f) f.onchange = () => { const x = f.files[0]; if (!x) return; const r = new FileReader(); r.onload = async () => { try { bild = await bildVerkleinern(r.result); zeigen(); } catch (er) { bpHinweis(er.message); } }; r.readAsDataURL(x); };
      } else if (ansicht === 'faden') {
        let F; try { F = await KX('api/bp/hilfe/' + fid); } catch (e) { B.innerHTML = `<button type="button" class="bph-hback" data-ha="start">‹ zurück</button><p class="bph-mu">${esc(e.message)}</p>`; return; }
        letzte = F.nachrichten.length ? F.nachrichten[F.nachrichten.length - 1].id : 0;
        const ich = F.user_id === (H.me || {}).id, zu2 = ['erledigt', 'beendet'].includes(F.status);
        B.innerHTML = `<button type="button" class="bph-hback" data-ha="start">‹ zurück</button>
          <div class="bph-hkopf"><b>${F.art === 'live' ? '🖥️ Live-Hilfe' : '✉️ Frage'} · ${esc(F.user_name)}</b><span class="bph-hs ${esc(F.status)}">${esc(F.status_name)}${F.helfer_name ? ' · ' + esc(F.helfer_name) : ''}</span><small class="bph-mu">${esc([F.app, F.projekt, hZeit(F.ts)].filter(Boolean).join(' · '))}</small></div>
          ${F.bild ? `<a href="api/bp/hilfe/${F.id}/bild" target="_blank" rel="noopener"><img src="api/bp/hilfe/${F.id}/bild" alt="Bild zur Frage" class="bph-hbild"></a>` : ''}
          <div class="bph-hv" data-hv>${hVerlauf(F.nachrichten)}</div>
          ${zu2 ? '' : `<div class="bph-hin"><textarea data-hantw rows="2" maxlength="8000" placeholder="${ich ? 'Nachricht an die Helfer …' : 'Antwort …'}"></textarea><button type="button" class="bph-btn pri" data-ha="antw">Senden</button></div>`}
          <div class="bph-row" style="justify-content:flex-end;margin-top:.6rem">
            ${F.ich_helfer && F.art === 'live' && !zu2 ? '<button type="button" class="bph-btn pri" data-ha="helfen">🖥️ Live ansehen</button>' : ''}
            ${F.ich_helfer && F.status === 'offen' && F.art !== 'live' ? '<button type="button" class="bph-btn" data-ha="uebern">Übernehmen</button>' : ''}
            ${!zu2 && (F.ich_helfer || ich) ? `<button type="button" class="bph-btn" data-ha="erl">✓ ${ich ? 'Hat sich erledigt' : 'Erledigt'}</button>` : ''}
            ${zu2 ? '<button type="button" class="bph-btn" data-ha="wieder">↺ Wieder öffnen</button>' : ''}</div>`;
        const v = B.querySelector('[data-hv]'); v.scrollTop = v.scrollHeight;
        const t = B.querySelector('[data-hantw]'); if (t) { t.focus(); t.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); B.querySelector('[data-ha="antw"]').click(); } }); }
        clearInterval(tFaden);
        tFaden = setInterval(async () => {   // neue Nachrichten im offenen Verlauf
          if (!bg.isConnected || ansicht !== 'faden') return clearInterval(tFaden);
          try { const N = await KX(`api/bp/hilfe/${fid}?seit=${letzte}`); if (N.nachrichten.length) { letzte = N.nachrichten[N.nachrichten.length - 1].id; const vv = B.querySelector('[data-hv]'); if (vv) { if (vv.querySelector('p.bph-mu')) vv.innerHTML = ''; vv.insertAdjacentHTML('beforeend', hVerlauf(N.nachrichten)); vv.scrollTop = vv.scrollHeight; } } } catch { /* nächstes Mal */ }
        }, 4000);
      }
    }
    bg.addEventListener('click', async (e) => {
      if (e.target.closest('[data-hx]')) { zu(); return; }   // daneben klicken schließt nicht
      const z = e.target.closest('[data-hf]'); if (z) { fid = +z.dataset.hf; ansicht = 'faden'; zeigen(); return; }
      const b = e.target.closest('[data-ha]'); if (!b) return; const a = b.dataset.ha;
      if (a === 'start') { clearInterval(tFaden); ansicht = 'start'; await laden(); hilfeZaehler(); zeigen(); return; }
      if (a === 'bug') { zu(); H.bugMelden(); return; }
      if (a === 'frage' || a === 'live') { if (a === 'live' && HLIVE) { bpHinweis('Du teilst deinen Bildschirm schon.'); return; } ansicht = a; zeigen(); return; }
      if (a === 'bildweg') { bild = ''; zeigen(); return; }
      if (a === 'shot') { const tx = (B.querySelector('[data-ht]') || {}).value || ''; bg.style.visibility = 'hidden'; const x = await ansichtAufnehmen(); bg.style.visibility = ''; if (x) { bild = x; zeigen(); setTimeout(() => { const t = B.querySelector('[data-ht]'); if (t) t.value = tx; }, 0); } return; }
      if (a === 'senden') {
        const text = B.querySelector('[data-ht]').value.trim(); if (text.length < 3) { bpHinweis('Bitte die Frage kurz beschreiben.'); return; }
        b.disabled = true; b.textContent = 'wird gesendet …';
        try { const r = await HJ('api/bp/hilfe', 'POST', { art: 'frage', text, bild, app: hAppName(), kontext: bugKontext() }); bild = ''; fid = r.anfrage.id; ansicht = 'faden'; zeigen(); if (window.toast) toast('Frage ist bei den Helfern angekommen.'); }
        catch (er) { b.disabled = false; b.textContent = 'Senden'; bpHinweis(er.message); }
        return;
      }
      if (a === 'livelos') { const text = B.querySelector('[data-ht]').value.trim(); bg.style.visibility = 'hidden'; const ok = await liveStarten(text); if (ok) zu(); else bg.style.visibility = ''; return; }
      if (a === 'antw') {
        const t = B.querySelector('[data-hantw]'), text = t.value.trim(); if (!text) return;
        b.disabled = true; try { await HJ('api/bp/hilfe/' + fid, 'PUT', { text }); t.value = ''; await zeigen(); } catch (er) { bpHinweis(er.message); } b.disabled = false; return;
      }
      if (a === 'erl' || a === 'wieder' || a === 'uebern') { try { await HJ('api/bp/hilfe/' + fid, 'PUT', { status: a === 'erl' ? 'erledigt' : a === 'wieder' ? 'offen' : 'laeuft' }); zeigen(); hilfeZaehler(); } catch (er) { bpHinweis(er.message); } return; }
      if (a === 'helfen') { zu(); H.hilfeLive(fid); }
    });
    await laden(); hilfeZaehler(); zeigen();
  };

  /* Hilfesuchender: Bildschirm teilen, Bilder senden, Zeiger und Nachrichten des Helfers zeigen */
  async function liveStarten(text) {
    if (!window.isSecureContext) { bpHinweis('Bildschirm teilen geht nur über eine sichere Adresse (https://…) – hier ist die Seite über ' + location.protocol + '//' + location.host + ' geöffnet. Bitte „Frage stellen“ mit einem Bildschirmfoto nutzen.'); return false; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { bpHinweis('Dieser Browser kann den Bildschirm nicht teilen. Bitte „Frage stellen“ mit einem Bildschirmfoto nutzen.'); return false; }
    let st; try { st = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: 5 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' }); }
    catch (er) { if (er && er.name !== 'NotAllowedError') bpHinweis('Teilen hat nicht geklappt: ' + (er.message || er)); return false; }
    let A; try { A = (await HJ('api/bp/hilfe', 'POST', { art: 'live', text, app: hAppName(), kontext: bugKontext() })).anfrage; }
    catch (er) { st.getTracks().forEach((t) => t.stop()); bpHinweis(er.message); return false; }
    const v = document.createElement('video'); v.srcObject = st; v.muted = true; v.playsInline = true; try { await v.play(); } catch { /* egal */ }
    const bar = document.createElement('div'); bar.className = 'bph-lbar'; bar.innerHTML = '<span>🔴 <b>Du teilst deinen Bildschirm</b> · <span data-lw>wartet auf einen Helfer …</span></span><button type="button" data-lchat>💬 Chat</button><button type="button" data-lend>Beenden</button>';
    const zg = document.createElement('div'); zg.className = 'bph-lzeiger'; zg.hidden = true; zg.innerHTML = '<i></i><span></span>';
    const ch = document.createElement('div'); ch.className = 'bph-lchat'; ch.innerHTML = '<div class="bph-lchat-h"><b>Live-Hilfe</b><button type="button" class="bph-x" data-lzu aria-label="Chat einklappen">–</button></div><div class="bph-hv" data-lv><p class="bph-mu">Hier schreibt der Helfer.</p></div><div class="bph-hin"><input data-lin placeholder="Nachricht …" maxlength="2000"><button type="button" class="bph-btn pri" data-lsend>›</button></div>';
    document.body.append(bar, zg, ch);
    const cv = document.createElement('canvas'), kl = document.createElement('canvas'); kl.width = 32; kl.height = 18;
    let seit = 0, alt = '', zuletzt = 0, aus = false, laeuft = false, zseq = -1;
    HLIVE = { id: A.id };
    const ende = async (grund) => {
      if (aus) return; aus = true; clearInterval(t); st.getTracks().forEach((x) => x.stop()); bar.remove(); zg.remove(); ch.remove(); HLIVE = null;
      if (grund !== 'server') { try { await HJ('api/bp/hilfe/' + A.id, 'PUT', { status: 'beendet' }); } catch { /* egal */ } }
      if (window.toast) toast(grund === 'server' ? 'Die Live-Hilfe wurde beendet.' : 'Bildschirm wird nicht mehr geteilt.');
    };
    st.getVideoTracks()[0].addEventListener('ended', () => ende());
    bar.addEventListener('click', (e) => { if (e.target.closest('[data-lend]')) ende(); if (e.target.closest('[data-lchat]')) ch.classList.toggle('zu'); });
    const senden = async () => { const i = ch.querySelector('[data-lin]'), tx = i.value.trim(); if (!tx) return; i.value = ''; try { await HJ('api/bp/hilfe/' + A.id, 'PUT', { text: tx, seit }); } catch (er) { bpHinweis(er.message); } };
    ch.addEventListener('click', (e) => { if (e.target.closest('[data-lzu]')) ch.classList.toggle('zu'); if (e.target.closest('[data-lsend]')) senden(); });
    ch.querySelector('[data-lin]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); senden(); } });
    const takt = async () => {
      if (aus || laeuft || !v.videoWidth) return; laeuft = true;
      try {
        kl.getContext('2d').drawImage(v, 0, 0, 32, 18); const fp = kl.toDataURL('image/jpeg', 0.5);
        let bildD = '';
        if (fp !== alt || Date.now() - zuletzt > 5000) {   // nur wenn sich etwas geändert hat (spätestens alle 5 s)
          const f = Math.min(1, 1440 / v.videoWidth); cv.width = Math.round(v.videoWidth * f); cv.height = Math.round(v.videoHeight * f);
          cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height); bildD = cv.toDataURL('image/jpeg', 0.62); alt = fp; zuletzt = Date.now();
        }
        const r = await HJ(`api/bp/hilfe/${A.id}/live`, 'POST', { bild: bildD, seit });
        if (r.ende) { ende('server'); return; }
        bar.querySelector('[data-lw]').textContent = r.helfer && r.status === 'laeuft' ? `${r.helfer} sieht zu` : 'wartet auf einen Helfer …';
        if (r.nachrichten && r.nachrichten.length) { seit = r.nachrichten[r.nachrichten.length - 1].id; const vv = ch.querySelector('[data-lv]'); if (vv.querySelector('p.bph-mu')) vv.innerHTML = ''; vv.insertAdjacentHTML('beforeend', hVerlauf(r.nachrichten)); vv.scrollTop = vv.scrollHeight; if (r.nachrichten.some((m) => !m.ich)) ch.classList.remove('zu'); }
        const z = r.live && r.live.zeiger;
        if (r.live && r.live.zseq !== zseq) { zseq = r.live.zseq; zg.hidden = !z; if (z) { zg.style.left = z.x + '%'; zg.style.top = z.y + '%'; zg.querySelector('span').textContent = z.text || ''; zg.classList.remove('neu'); void zg.offsetWidth; zg.classList.add('neu'); } }
      } catch { /* Netz – nächster Takt */ }
      laeuft = false;
    };
    const t = setInterval(takt, 800); takt();
    if (window.toast) toast('Die Helfer haben Bescheid bekommen.');
    return true;
  }

  /* Helfer: großes, verschiebbares Fenster mit dem Live-Bild, Zeiger und Chat */
  H.hilfeLive = async function (id) {
    if (HFENSTER) { HFENSTER.querySelector('.bph-dlg').focus(); return; }
    try { await HJ('api/bp/hilfe/' + id, 'PUT', { status: 'laeuft' }); } catch (er) { bpHinweis(er.message); return; }
    let F; try { F = await KX('api/bp/hilfe/' + id); } catch (er) { bpHinweis(er.message); return; }
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-hlive'; HFENSTER = bg;
    bg.innerHTML = `<div class="bph-dlg" role="dialog" aria-label="Live-Hilfe" tabindex="-1" style="width:min(1300px,97vw);height:88vh;max-height:none;display:flex;flex-direction:column;overflow:hidden">
      <div class="bph-dh"><b>🖥️ Live-Hilfe – ${esc(F.user_name)}${F.app ? ' · ' + esc(F.app) : ''}${F.projekt ? ' · ' + esc(F.projekt) : ''}</b><span class="bph-live" data-lst>● verbindet …</span><button type="button" class="bph-x" data-lend aria-label="Beenden">✕</button></div>
      <div class="bph-lb"><div class="bph-ls" data-ls title="Klicken: dorthin zeigen"><img data-limg alt="Bildschirm von ${esc(F.user_name)}"><div class="bph-lzeiger" data-lz hidden><i></i><span></span></div><p class="bph-mu" data-lwarte>Warte auf das erste Bild …</p></div>
        <div class="bph-lc"><div class="bph-hv" data-hv>${hVerlauf(F.nachrichten)}</div><div class="bph-hin"><input data-lin placeholder="Nachricht …" maxlength="2000"><button type="button" class="bph-btn pri" data-lsend>›</button></div></div></div>
      <div class="bph-lf"><span>👆 Ins Bild klicken: roter Zeiger erscheint bei ${esc(F.user_name)}</span><input data-ltext placeholder="Text am Zeiger, z. B. „Hier rechts klicken“" maxlength="120"><button type="button" class="bph-btn" data-lweg>Zeiger weg</button><span style="flex:1"></span><button type="button" class="bph-btn" data-lbug>🐞 Als Fehler melden</button><button type="button" class="bph-btn" data-lerl>✓ Erledigt</button><button type="button" class="bph-btn danger" data-lend>Beenden</button></div></div>`;
    document.body.appendChild(bg);
    const dlg = bg.querySelector('.bph-dlg'); try { dlgBeweglich(dlg); } catch { /* egal */ }
    const img = bg.querySelector('[data-limg]'), zg = bg.querySelector('[data-lz]'), st = bg.querySelector('[data-lst]'), vv = bg.querySelector('[data-hv]');
    let seq = 0, letzte = F.nachrichten.length ? F.nachrichten[F.nachrichten.length - 1].id : 0, aus = false, z = null, n = 0;
    const lage = () => { if (!z || !img.naturalWidth) { zg.hidden = true; return; } const r = img.getBoundingClientRect(), p = img.parentElement.getBoundingClientRect(); zg.hidden = false; zg.style.left = (r.left - p.left + r.width * z.x / 100) + 'px'; zg.style.top = (r.top - p.top + r.height * z.y / 100) + 'px'; zg.querySelector('span').textContent = z.text || ''; };
    const zu = (meldung) => { if (aus) return; aus = true; clearInterval(t1); bg.remove(); HFENSTER = null; if (meldung && window.toast) toast(meldung); hilfeZaehler(); };
    const zeigerSetzen = async (neu) => { z = neu; lage(); try { await HJ('api/bp/hilfe/' + id, 'PUT', { zeiger: neu }); } catch (er) { bpHinweis(er.message); } };
    bg.querySelector('[data-ls]').addEventListener('click', (e) => { if (!img.naturalWidth) return; const r = img.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return; zeigerSetzen({ x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100, text: bg.querySelector('[data-ltext]').value.trim() }); });
    bg.querySelector('[data-ltext]').addEventListener('change', () => { if (z) zeigerSetzen({ ...z, text: bg.querySelector('[data-ltext]').value.trim() }); });
    const senden = async () => { const i = bg.querySelector('[data-lin]'), tx = i.value.trim(); if (!tx) return; i.value = ''; try { await HJ('api/bp/hilfe/' + id, 'PUT', { text: tx }); } catch (er) { bpHinweis(er.message); } };
    bg.querySelector('[data-lin]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); senden(); } });
    new ResizeObserver(lage).observe(bg.querySelector('[data-ls]'));
    bg.addEventListener('click', async (e) => {
      if (e.target.closest('[data-lsend]')) { senden(); return; }
      if (e.target.closest('[data-lweg]')) { zeigerSetzen(null); return; }
      if (e.target.closest('[data-lbug]')) { if (!img.src) { bpHinweis('Noch kein Bild da.'); return; } H.bugMelden({ bild: img.src, text: `Aus der Live-Hilfe mit ${F.user_name}${F.app ? ' (' + F.app + ')' : ''}: ` }); return; }
      if (e.target.closest('[data-lerl]')) { try { await HJ('api/bp/hilfe/' + id, 'PUT', { status: 'erledigt' }); } catch { /* egal */ } zu('Live-Hilfe als erledigt abgeschlossen.'); return; }
      if (e.target.closest('[data-lend]')) { if (!(await bpFrage('Live-Hilfe beenden? Das Teilen hört bei ' + F.user_name + ' auf.', { ok: 'Beenden' }))) return; try { await HJ('api/bp/hilfe/' + id, 'PUT', { status: 'beendet' }); } catch { /* egal */ } zu('Live-Hilfe beendet.'); }
    });
    const takt = async () => {
      if (aus) return;
      try {
        const r = await KX(`api/bp/hilfe/${id}/live?seq=${seq}`);
        if (r.ende) { st.textContent = '● beendet'; st.classList.add('aus'); zu(`${F.user_name} hat das Teilen beendet.`); return; }
        if (r.neu) { seq = r.seq; img.src = r.bild; bg.querySelector('[data-lwarte]').hidden = true; st.textContent = '● LIVE'; st.classList.remove('aus'); setTimeout(lage, 30); }
        if (++n % 3 === 0) {
          const N = await KX(`api/bp/hilfe/${id}?seit=${letzte}`);
          if (N.nachrichten.length) { letzte = N.nachrichten[N.nachrichten.length - 1].id; if (vv.querySelector('p.bph-mu')) vv.innerHTML = ''; vv.insertAdjacentHTML('beforeend', hVerlauf(N.nachrichten)); vv.scrollTop = vv.scrollHeight; }
          if (N.live && N.live.ts) { const alt = (Date.now() - new Date(N.live.ts).getTime()) / 1000; if (alt > 15) { st.textContent = '● kein Bild seit ' + Math.round(alt) + ' s'; st.classList.add('aus'); } }
        }
      } catch { st.textContent = '● Verbindung …'; }
    };
    const t1 = setInterval(takt, 700); takt();
    setTimeout(() => bg.querySelector('[data-lin]').focus(), 50);
  };
})();
