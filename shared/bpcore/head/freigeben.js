'use strict';
/* =====================================================================
   Bauherrenportal – Baustein für alle Apps (beschlossen am 15.11.2026, Entwurf „Bauherrenportal: Aufbau“).
     BPHead.bauherrFreigeben({ pid, art, titel, schluessel, stand, daten, pdf, dateien })  → fragt kurz nach, gibt frei (ersetzt dasselbe Paket)
         art: gebaeude (Daten stellt der Kern aus dem Modell zusammen) · tagesbericht · termine · rechnung · kosten · maengel · plan · foto · info
         daten: { text, zeilen: [[Bezeichnung, Wert …]], liste: [..], bilder: [{ src: 'data:image/jpeg;base64,…', titel }] }
         pdf: Adresse eines PDFs (oder dateien: [{ url, name }]) – wird geholt und mitgeschickt; das Portal zeigt es (16.11.2026)
         Ist der Bereich im Projekt aus, fragt es danach, ob er eingeschaltet werden soll.
     BPHead.bauherrAn()  → Knopf zeigen? (Recht „Bauherrenportal“ und Portal eingeschaltet – aus api/platform)
     BPHead.bauherrProjekt(pid, name)  → Fenster: eingeladene Bauherr:innen (einladen, sperren), Freigaben (zurückziehen), Nachrichten (erledigt)
         Nach „Einladen“ öffnet sich die Einladungsmail im gemeinsamen Versand-Dialog (BPHead.unterlagenSenden) – raus geht sie erst mit „Senden“;
         danach steht „Einladung ✉ am …“ am Konto. Der Anmeldelink selbst kommt vom Portal, wenn sich die Bauherr:in dort meldet.
   Der Kern schickt die Freigaben im eingestellten Takt hinaus (bpcore/bauherren.py); das Portal erreicht das Büro nie.
   ===================================================================== */
(() => {
  const H = (window.BPHead = window.BPHead || {});
  const e = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ART = { gebaeude: 'Gebäude', tagesbericht: 'Bautagebuch', termine: 'Termine', rechnung: 'Rechnungen', kosten: 'Kosten', maengel: 'Mängel', plan: 'Pläne', foto: 'Fotos', info: 'Informationen' };
  const dt = (s) => (s ? new Date(s).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '');

  H.bauherrAn = () => !!(H.conf && H.conf.bauherren);
  H.bauherrFreigeben = async (o = {}) => {
    if (!o.pid) { toast('Kein Projekt gewählt.', true); return false; }
    const ok = o.ohneFrage || !window.bpFrage ? true : await bpFrage(`„${o.titel || ART[o.art] || 'Inhalt'}“ für die Bauherr:innen dieses Projekts freigeben?\nSie sehen es im Bauherrenportal – ein früherer Stand desselben Inhalts wird ersetzt.`, { ok: 'Freigeben' });
    if (!ok) return false;
    const { pdf, dateien, datei: dn, ohneFrage, ...b } = o, D = dateien || (pdf ? [{ url: pdf, name: dn || (o.titel || 'Dokument') + '.pdf' }] : []);
    const warte = setTimeout(() => toast('Wird für das Portal vorbereitet …'), 1500);
    try {
      let r;
      if (D.length) {   // PDFs/Bilder holen und mitschicken
        const fd = new FormData(); fd.append('json', JSON.stringify(b));
        for (const d of D) {
          if (d.blob) { fd.append('datei', new File([d.blob], d.name, { type: d.blob.type || 'application/pdf' })); continue; }
          const x = await fetch(d.url, { credentials: 'same-origin' }); if (!x.ok) throw new Error(`„${d.name}“ ließ sich nicht laden.`);
          fd.append('datei', new File([await x.blob()], d.name, { type: (x.headers.get('Content-Type') || 'application/pdf').split(';')[0] }));
        }
        const y = await fetch('api/bp/bauherren/freigeben', { method: 'POST', body: fd, credentials: 'same-origin' }); r = await y.json().catch(() => ({}));
        if (!y.ok) throw new Error(r.error || 'Freigeben ging nicht.');
      } else r = await api('api/bp/bauherren/freigeben', 'POST', b);
      clearTimeout(warte);
      if (r.bereich_aus) {
        if (await bpFrage(`Freigegeben – aber der Bereich „${ART[o.art] || o.art}“ ist für dieses Projekt ausgeschaltet; die Bauherr:innen sehen ihn nicht.\nJetzt einschalten?`, { ok: 'Einschalten', abbrechen: 'Aus lassen' })) {
          await api(`api/bp/bauherren/projekt/${o.pid}`, 'POST', { bereiche: { [o.art]: true } }); toast('Eingeschaltet – das Portal bekommt beides mit dem nächsten Abgleich.');
        }
      } else toast('Freigegeben – das Portal bekommt es mit dem nächsten Abgleich.');
      return true;
    } catch (x) { clearTimeout(warte); toast(x.message, true); return false; }
  };

  /* Ein PDF aus dem Ansehen-Fenster (⋯ → Für Bauherr:in freigeben): Bereich wählen, dann freigeben – derselbe Dateiname ersetzt den alten Stand */
  H.bauherrPdf = (o) => {
    const name = String(o.name || 'Dokument').replace(/\.pdf$/i, '');
    const bg = modalBox(`<h3>Für Bauherr:in freigeben</h3><p class="mute" style="margin:0 0 .6rem">„${e(name)}“ – unter welchem Bereich soll es im Portal stehen?</p>
      <div class="acts" style="flex-wrap:wrap;justify-content:flex-start">${[['plan', 'Pläne'], ['rechnung', 'Rechnungen'], ['tagesbericht', 'Bautagebuch'], ['kosten', 'Kosten'], ['info', 'Informationen']]
        .map(([k, t]) => `<button type="button" class="btn" data-m="${k}">${t}</button>`).join('')}</div>
      <div class="acts"><button type="button" class="btn" data-m="zu">Abbrechen</button></div>`, (m, b, close) => {
      close(); if (m === 'zu') return;
      H.bauherrFreigeben({ pid: o.pid, art: m, titel: name, schluessel: 'pdf:' + name.toLowerCase(), dateien: [{ blob: o.blob, url: o.url, name: name + '.pdf' }] });
    });
    bg.style.zIndex = 8000;   // über dem Ansehen-Fenster
    return bg;
  };
  const datei = (sk, nr) => `api/bp/bauherren/datei/${encodeURIComponent(sk)}/${nr}`;
  H.bauherrProjekt = async (pid, name) => {
    let D, KO = null, tb = Date.now();
    try { D = await api(`api/bp/bauherren/projekt/${pid}`); KO = await api(`api/bp/bauherren/projekt/${pid}/kopf`).catch(() => null); } catch (x) { toast(x.message, true); return; }
    /* Startseite im Portal (17.11.2026): Titelbild (Foto oder Zeichnung als PDF), Bildunterschrift, Ansprechperson, Termine, Anrede, Bauphasen, Wochenmail */
    const kopfHtml = () => (!KO ? '' : `<div class="bph-bh"><b>Startseite im Portal</b>
      <div class="bph-bhk"><span class="bph-bhbild">${KO.bild ? `<img src="api/bp/bauherren/projekt/${pid}/titelbild?t=${tb}" alt="Titelbild">` : '<span class="mute">kein Titelbild – dann eine Fläche in der Farbe des Büros</span>'}</span>
        <div class="bph-bhg"><span><label class="btn sm">${KO.bild ? 'Anderes Titelbild …' : 'Titelbild: Foto oder Zeichnung (PDF) …'}<input type="file" data-bhtb accept="image/*,.heic,.pdf,application/pdf" hidden></label>${KO.bild ? ' <button type="button" class="btn sm" data-bh="tbweg">Entfernen</button>' : ''}</span>
          <input data-bhkf="bild_text" value="${e(KO.bild_text)}" placeholder="Bildunterschrift, z. B. Ansicht von Süden"></div></div>
      <div class="bph-bhg">
        <label>Ansprechperson<select data-bhkf="ansprech"><option value="">– keine –</option>${KO.leute.map((x) => `<option value="${x.id}"${x.id === KO.ansprech ? ' selected' : ''}>${e(x.name)}</option>`).join('')}</select></label>
        <label>Termine<select data-bhkf="termine">${Object.entries(KO.termine_wahl).map(([k, t]) => `<option value="${k}"${k === KO.termine ? ' selected' : ''}>${e(t)}</option>`).join('')}</select></label>
        <label>Anrede<select data-bhkf="anrede"><option value="">wie im Büro eingestellt</option><option${KO.anrede === 'Sie' ? ' selected' : ''}>Sie</option><option${KO.anrede === 'du' ? ' selected' : ''}>du</option></select></label>
        <label class="bph-bhc"><input type="checkbox" data-bhkf="phasen"${KO.phasen ? ' checked' : ''}> „Wo stehen wir?“ – Bauphasen aus dem Bauzeitenplan zeigen</label>
        <label class="bph-bhc"><input type="checkbox" data-bhkf="mail"${KO.mail === 'woche' ? ' checked' : ''}> Montags eine Mail an die Bauherr:innen mit dem Neuen der Woche (nur wenn es Neues gibt)</label></div></div>`);
    const html = () => `<h3>Bauherrenportal${name ? ' – ' + e(name) : ''}</h3>
      ${D.an ? '' : '<p class="mute">Das Portal ist in der Verwaltung noch nicht eingeschaltet – Einladungen und Freigaben warten, bis es läuft.</p>'}
      <div class="bph-bh"><b>Was die Bauherr:innen sehen</b>
        <div class="bph-bhb">${(D.bereiche || []).map((x) => `<label><input type="checkbox" data-bhb="${e(x.key)}"${x.an ? ' checked' : ''}> ${e(x.titel)}</label>`).join('')}</div>
        <p class="mute" style="font-size:.85rem;margin:0">Ausgeschaltet heißt: im Portal unsichtbar – Freigegebenes bleibt gespeichert und ist beim Einschalten wieder da.</p>
        <div><button type="button" class="btn" data-bh="info">Information schreiben …</button></div></div>
      ${kopfHtml()}
      <div class="bph-bh"><b>Bauherr:innen</b>
        ${D.konten.length ? `<table class="bph-bht">${D.konten.map((k) => `<tr><td>${e(k.name || '–')}</td><td>${e(k.email)}</td><td>${k.aktiv ? (k.gesendet ? 'im Portal' : 'wird übertragen …') : '<span class="mute">gesperrt</span>'}</td>
          <td>${!k.aktiv ? '' : k.eingeladen ? `<span class="mute" title="Einladungsmail verschickt">✉ ${e(dt(k.eingeladen))}</span> <button type="button" class="btn sm" data-bhi="${e(k.email)}" data-bhn="${e(k.name)}">Erneut</button>`
            : `<button type="button" class="btn sm" data-bhi="${e(k.email)}" data-bhn="${e(k.name)}">✉ Einladung senden</button>`}</td>
          <td><button type="button" class="btn sm" data-bhk="${e(k.email)}" data-bhn="${e(k.name)}" data-bha="${k.aktiv ? 0 : 1}">${k.aktiv ? 'Sperren' : 'Wieder zulassen'}</button></td></tr>`).join('')}</table>` : '<p class="mute">Noch niemand eingeladen.</p>'}
        <div class="bph-bhf"><input id="bhName" placeholder="Name"><input id="bhMail" type="email" placeholder="E-Mail-Adresse"><button type="button" class="btn" data-bh="einladen">Einladen</button></div>
        <p class="mute" style="font-size:.85rem;margin:.2rem 0 0">Eingeladene melden sich mit ihrer Adresse an (Link per Mail, Kennwort oder QR-Code). Gesperrte sind sofort abgemeldet.</p></div>
      <div class="bph-bh"><b>Freigegeben</b>
        ${D.freigaben.filter((f) => !f.geloescht).length ? `<table class="bph-bht">${D.freigaben.filter((f) => !f.geloescht).map((f) => `<tr><td>${e(ART[f.art] || f.art)}${(D.bereiche || []).some((b) => b.key === f.art && !b.an) ? ' <small class="mute">(aus)</small>' : ''}</td><td>${e(f.titel)}${(f.dateien || []).map((d) => ` <a href="${datei(f.schluessel, d.nr)}" target="_blank" rel="noopener">${e(d.name)}</a>`).join('')}</td><td class="mute">${e(f.stand)} · ${e(f.von)}${f.gesendet ? '' : ' · wartet'}</td>
          <td><button type="button" class="btn sm" data-bhz="${e(f.schluessel)}">Zurückziehen</button></td></tr>`).join('')}</table>` : '<p class="mute">Noch nichts freigegeben – in den Apps „für Bauherr:in freigeben“.</p>'}</div>
      <div class="bph-bh"><b>Eingang aus dem Portal</b>
        ${D.eingang.length ? D.eingang.map((x) => `<div class="bph-bhn"><small class="mute">${e(dt(x.zeit))} · ${e((x.daten || {}).von || '')}</small>${x.art === 'datei' ? `<div>Datei: ${(x.dateien || []).map((d) => `<a href="${datei('e:' + x.fern_id, d.nr)}" target="_blank" rel="noopener">${e(d.name)}</a>`).join(' ') || e((x.daten || {}).name || '')}${(x.daten || {}).ablage ? ` <small class="mute">· liegt in ${e(x.daten.ablage)}</small>` : (x.daten || {}).ablage_fehler ? ` <small class="mute">· nicht abgelegt: ${e(x.daten.ablage_fehler)}</small>` : ''}</div>` : ''}<div>${e((x.daten || {}).text || '')}</div>
          ${x.erledigt ? '<small class="mute">erledigt</small>' : `<button type="button" class="btn sm" data-bhe="${x.id}">Erledigt</button>`}</div>`).join('') : '<p class="mute">Keine Nachrichten.</p>'}</div>
      <div class="acts"><button type="button" class="btn pri" data-m="zu">Schließen</button></div>`;
    const bg = modalBox(html(), async (m, b, close) => { if (m === 'zu') close(); });
    const neu = async (body) => { try { D = await api(`api/bp/bauherren/projekt/${pid}`, 'POST', body); bg.querySelector('.modal').innerHTML = html(); return true; } catch (x) { toast(x.message, true); return false; } };
    /* Einladungsmail: gemeinsamer Versand-Dialog, nichts geht automatisch raus; im Verlauf der Kommunikation als „Einladung Bauherrenportal“ */
    const einladung = (email, nm) => H.unterlagenSenden({
      titel: 'Einladung zum Bauherrenportal', art: 'bauherrenportal', pid, projekt: name || '', was: [], kopie: false, link: D.url || '',
      an: [{ name: nm || email, email, on: true }],
      hinweis: !D.url ? '<p class="err">In der Verwaltung fehlt die Adresse des Portals – bitte im Text ergänzen oder erst eintragen.</p>'
        : !D.an ? '<p class="mute">Das Portal ist noch nicht eingeschaltet – die Anmeldung klappt erst, wenn es läuft.</p>'
        : (D.konten.find((k) => k.email === email) || {}).gesendet ? '' : `<p class="mute">Der Zugang kommt mit dem nächsten Abgleich ins Portal (spätestens in ${Math.ceil((D.takt || 60) / 60)} Minute${(D.takt || 60) > 60 ? 'n' : ''}).</p>`,
      betreff: `Ihr Zugang zum Bauherrenportal${name ? ' – ' + name : ''}`,
      text: `Guten Tag${nm ? ' ' + nm : ''},\n\nwir haben Sie${name ? ' für das Bauvorhaben ' + name : ''} in unser Bauherrenportal eingeladen. Dort finden Sie, was wir für Sie freigeben – zum Beispiel Termine, Berichte aus dem Bautagebuch, Kosten, Mängel und Pläne –, und Sie können uns direkt schreiben.\n\n`
        + `So melden Sie sich an:\n1. Öffnen Sie ${D.url || '[Adresse des Portals]'}\n2. Geben Sie diese E-Mail-Adresse ein: ${email}\n3. Sie bekommen einen Anmeldelink per Mail (gilt 15 Minuten). Danach können Sie ein Kennwort und eine Authenticator-App einrichten.\n\n`
        + 'Die Einladung gilt nur für Sie – bitte geben Sie den Zugang nicht weiter.\n\nMit freundlichen Grüßen',
      danach: () => neu({ eingeladen: email }) });
    const kopfNeu = async (body) => { try { KO = await api(`api/bp/bauherren/projekt/${pid}/kopf`, 'PUT', body); bg.querySelector('.modal').innerHTML = html(); } catch (x) { toast(x.message, true); } };
    bg.addEventListener('change', async (ev) => {
      const c = ev.target.closest('[data-bhb]'); if (c) { neu({ bereiche: { [c.dataset.bhb]: c.checked } }); return; }
      const k = ev.target.closest('[data-bhkf]');
      if (k) { const f = k.dataset.bhkf; kopfNeu({ [f]: f === 'mail' ? (k.checked ? 'woche' : 'aus') : k.type === 'checkbox' ? k.checked : k.value }); return; }
      const fi = ev.target.closest('[data-bhtb]'); if (!fi || !fi.files.length) return;
      const fd = new FormData(); fd.append('datei', fi.files[0]);
      const warte = setTimeout(() => toast('Titelbild wird vorbereitet …'), 1500);
      try { const y = await fetch(`api/bp/bauherren/projekt/${pid}/titelbild`, { method: 'POST', body: fd, credentials: 'same-origin' }), r = await y.json().catch(() => ({}));
        if (!y.ok) throw new Error(r.error || 'Das Titelbild ließ sich nicht speichern.');
        KO = { ...KO, ...r }; tb = Date.now(); bg.querySelector('.modal').innerHTML = html(); toast('Titelbild gespeichert – das Portal bekommt es mit dem nächsten Abgleich.');
      } catch (x) { toast(x.message, true); } finally { clearTimeout(warte); }
    });
    bg.addEventListener('click', async (ev) => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.dataset.bh === 'tbweg') { try { KO = { ...KO, ...(await api(`api/bp/bauherren/projekt/${pid}/titelbild`, 'DELETE')) }; bg.querySelector('.modal').innerHTML = html(); } catch (x) { toast(x.message, true); } return; }
      if (t.dataset.bh === 'info') {   // kurze Information an alle Bauherr:innen des Projekts
        const tx = await bpEingabe('Information an die Bauherr:innen\nErscheint im Portal unter „Informationen“ – der erste Satz wird die Überschrift.', '');
        if (!tx || !tx.trim()) return;
        const t0 = tx.trim(), m = t0.match(/^(.{1,120}?[.!?])\s+(.+)$/s), kopf = m ? m[1] : t0.slice(0, 120);
        if (await H.bauherrFreigeben({ pid, art: 'info', titel: kopf, schluessel: 'info:' + Date.now(), daten: { text: t0 } })) neu({});
        return;
      }
      if (t.dataset.bh === 'einladen') { const em = bg.querySelector('#bhMail').value.trim().toLowerCase(), nm = bg.querySelector('#bhName').value.trim();
        if (await neu({ email: em, name: nm })) einladung(em, nm); }
      else if (t.dataset.bhi) einladung(t.dataset.bhi, t.dataset.bhn);
      else if (t.dataset.bhk) neu({ email: t.dataset.bhk, name: t.dataset.bhn, aktiv: t.dataset.bha === '1' });
      else if (t.dataset.bhz) { if (await bpFrage('Diese Freigabe zurückziehen? Sie verschwindet beim nächsten Abgleich aus dem Portal.', { ok: 'Zurückziehen' })) neu({ zurueck: t.dataset.bhz }); }
      else if (t.dataset.bhe) { await api(`api/bp/bauherren/eingang/${t.dataset.bhe}/erledigt`, 'POST', {}).catch((x) => toast(x.message, true)); neu({}); }
    });
  };
  if (!document.getElementById('bph-bh-css')) {
    const st = document.createElement('style'); st.id = 'bph-bh-css';
    st.textContent = '.bph-bh{display:grid;gap:.4rem;margin:.6rem 0}.bph-bht{border-collapse:collapse;width:100%}.bph-bht td{border-bottom:1px solid var(--line,#e2e2e2);padding:.3rem .4rem;vertical-align:middle}'
      + '.bph-bhb{display:flex;flex-wrap:wrap;gap:.3rem 1rem}.bph-bhb label{display:flex;gap:.35rem;align-items:center;min-height:32px}'
      + '.bph-bhk{display:flex;gap:.8rem;flex-wrap:wrap;align-items:flex-start}.bph-bhbild img{width:220px;max-width:100%;height:110px;object-fit:cover;border-radius:8px;border:1px solid var(--line,#ddd);display:block}'
      + '.bph-bhg{display:grid;gap:.4rem;flex:1 1 14rem;min-width:0}.bph-bhg label{display:grid;gap:.15rem;font-size:.88rem}.bph-bhg label.bph-bhc{display:flex;gap:.4rem;align-items:center}.bph-bhg label.btn{display:inline-flex}'
      + '.bph-bhf{display:flex;gap:.4rem;flex-wrap:wrap}.bph-bhf input{flex:1 1 10rem}.bph-bhn{border-left:3px solid var(--af,#2b4a7a);padding:.3rem .6rem;display:grid;gap:.2rem}';
    document.head.appendChild(st);
  }
})();
