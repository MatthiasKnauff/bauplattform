'use strict';
/* =====================================================================
   Bauherrenportal – Baustein für alle Apps (beschlossen am 15.11.2026, Entwurf „Bauherrenportal: Aufbau“).
     BPHead.bauherrFreigeben({ pid, art, titel, schluessel, stand, daten })  → fragt kurz nach, gibt frei (ersetzt dasselbe Paket)
         art: tagesbericht · termine · rechnung · kosten · maengel · plan · foto · info
         daten: { text, zeilen: [[Bezeichnung, Wert …]], liste: [..], bilder: [{ src: 'data:image/jpeg;base64,…', titel }] } – nur Text und Bilder
     BPHead.bauherrProjekt(pid, name)  → Fenster: eingeladene Bauherr:innen (einladen, sperren), Freigaben (zurückziehen), Nachrichten (erledigt)
   Der Kern schickt die Freigaben im eingestellten Takt hinaus (bpcore/bauherren.py); das Portal erreicht das Büro nie.
   ===================================================================== */
(() => {
  const H = (window.BPHead = window.BPHead || {});
  const e = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ART = { tagesbericht: 'Bautagebuch', termine: 'Termine', rechnung: 'Rechnungen', kosten: 'Kosten', maengel: 'Mängel', plan: 'Pläne', foto: 'Fotos', info: 'Informationen' };
  const dt = (s) => (s ? new Date(s).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '');

  H.bauherrFreigeben = async (o = {}) => {
    if (!o.pid) { toast('Kein Projekt gewählt.', true); return false; }
    const ok = window.bpFrage ? await bpFrage(`„${o.titel || ART[o.art] || 'Inhalt'}“ für die Bauherr:innen dieses Projekts freigeben? Sie sehen es im Bauherrenportal – ein früherer Stand desselben Inhalts wird ersetzt.`, { ok: 'Freigeben' }) : true;
    if (!ok) return false;
    try { await api('api/bp/bauherren/freigeben', 'POST', o); toast('Freigegeben – das Portal bekommt es mit dem nächsten Abgleich.'); return true; }
    catch (x) { toast(x.message, true); return false; }
  };

  H.bauherrProjekt = async (pid, name) => {
    let D;
    try { D = await api(`api/bp/bauherren/projekt/${pid}`); } catch (x) { toast(x.message, true); return; }
    const html = () => `<h3>Bauherrenportal${name ? ' – ' + e(name) : ''}</h3>
      ${D.an ? '' : '<p class="mute">Das Portal ist in der Verwaltung noch nicht eingeschaltet – Einladungen und Freigaben warten, bis es läuft.</p>'}
      <div class="bph-bh"><b>Bauherr:innen</b>
        ${D.konten.length ? `<table class="bph-bht">${D.konten.map((k) => `<tr><td>${e(k.name || '–')}</td><td>${e(k.email)}</td><td>${k.aktiv ? (k.gesendet ? 'eingeladen' : 'wird eingeladen …') : '<span class="mute">gesperrt</span>'}</td>
          <td><button type="button" class="btn sm" data-bhk="${e(k.email)}" data-bhn="${e(k.name)}" data-bha="${k.aktiv ? 0 : 1}">${k.aktiv ? 'Sperren' : 'Wieder zulassen'}</button></td></tr>`).join('')}</table>` : '<p class="mute">Noch niemand eingeladen.</p>'}
        <div class="bph-bhf"><input id="bhName" placeholder="Name"><input id="bhMail" type="email" placeholder="E-Mail-Adresse"><button type="button" class="btn" data-bh="einladen">Einladen</button></div>
        <p class="mute" style="font-size:.85rem;margin:.2rem 0 0">Eingeladene melden sich mit ihrer Adresse an (Link per Mail, Kennwort oder QR-Code). Gesperrte sind sofort abgemeldet.</p></div>
      <div class="bph-bh"><b>Freigegeben</b>
        ${D.freigaben.filter((f) => !f.geloescht).length ? `<table class="bph-bht">${D.freigaben.filter((f) => !f.geloescht).map((f) => `<tr><td>${e(ART[f.art] || f.art)}</td><td>${e(f.titel)}</td><td class="mute">${e(f.stand)} · ${e(f.von)}${f.gesendet ? '' : ' · wartet'}</td>
          <td><button type="button" class="btn sm" data-bhz="${e(f.schluessel)}">Zurückziehen</button></td></tr>`).join('')}</table>` : '<p class="mute">Noch nichts freigegeben – in den Apps „für Bauherr:in freigeben“.</p>'}</div>
      <div class="bph-bh"><b>Nachrichten aus dem Portal</b>
        ${D.eingang.length ? D.eingang.map((x) => `<div class="bph-bhn"><small class="mute">${e(dt(x.zeit))} · ${e((x.daten || {}).von || '')}</small><div>${e((x.daten || {}).text || '')}</div>
          ${x.erledigt ? '<small class="mute">erledigt</small>' : `<button type="button" class="btn sm" data-bhe="${x.id}">Erledigt</button>`}</div>`).join('') : '<p class="mute">Keine Nachrichten.</p>'}</div>
      <div class="acts"><button type="button" class="btn pri" data-m="zu">Schließen</button></div>`;
    const bg = modalBox(html(), async (m, b, close) => { if (m === 'zu') close(); });
    const neu = async (body) => { try { D = await api(`api/bp/bauherren/projekt/${pid}`, 'POST', body); bg.querySelector('.modal').innerHTML = html(); } catch (x) { toast(x.message, true); } };
    bg.addEventListener('click', async (ev) => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.dataset.bh === 'einladen') neu({ email: bg.querySelector('#bhMail').value, name: bg.querySelector('#bhName').value });
      else if (t.dataset.bhk) neu({ email: t.dataset.bhk, name: t.dataset.bhn, aktiv: t.dataset.bha === '1' });
      else if (t.dataset.bhz) { if (await bpFrage('Diese Freigabe zurückziehen? Sie verschwindet beim nächsten Abgleich aus dem Portal.', { ok: 'Zurückziehen' })) neu({ zurueck: t.dataset.bhz }); }
      else if (t.dataset.bhe) { await api(`api/bp/bauherren/eingang/${t.dataset.bhe}/erledigt`, 'POST', {}).catch((x) => toast(x.message, true)); neu({}); }
    });
  };
  if (!document.getElementById('bph-bh-css')) {
    const st = document.createElement('style'); st.id = 'bph-bh-css';
    st.textContent = '.bph-bh{display:grid;gap:.4rem;margin:.6rem 0}.bph-bht{border-collapse:collapse;width:100%}.bph-bht td{border-bottom:1px solid var(--line,#e2e2e2);padding:.3rem .4rem;vertical-align:middle}'
      + '.bph-bhf{display:flex;gap:.4rem;flex-wrap:wrap}.bph-bhf input{flex:1 1 10rem}.bph-bhn{border-left:3px solid var(--af,#2b4a7a);padding:.3rem .6rem;display:grid;gap:.2rem}';
    document.head.appendChild(st);
  }
})();
