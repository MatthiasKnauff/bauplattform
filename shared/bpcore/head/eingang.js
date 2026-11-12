'use strict';
/* =====================================================================
   Eingang (Scans vom Kopierer, Eingangsordner auf dem Server) – Fenster in jeder App.
   Den Stand (Anzahl, neueste Datei) zählen die Dienste alle 3 Minuten; die Kopfleiste bekommt ihn mit ihrer ohnehin laufenden
   Abfrage (api/bp/hilfe?kurz=1) und lädt dieses Skript erst, wenn etwas im Eingang liegt.
   Verarbeiten: jede Datei wie beim Hineinziehen – „Datei ablegen“ mit Ordner- und Namensvorschlag (bp/ablegen.js);
   eine App kann es selbst übernehmen: BPHead.eingangVerarbeiten = async (file) => 'ok' | false (z. B. die Ausschreibung: Angebot, Rechnung …).
   Danach wandert die Datei im Eingang nach „verarbeitet“ (nichts wird gelöscht). „Später“ fragt heute erst wieder, wenn Neues kommt.
   Server: /api/bp/eingang, /api/bp/eingang/datei, /api/bp/eingang/erledigt (bpcore/ablage.py → Bautagebuch modules/eingang.py)
   ===================================================================== */
(function los() {
  if (!window.BPHead || !window.modalBox) { setTimeout(los, 50); return; }
  const H = window.BPHead;
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TOAST = (m, f) => (window.toast ? window.toast(m, f) : console.log(m));
  const heute = () => new Date().toISOString().slice(0, 10);
  const LS = { get(k) { try { return localStorage.getItem('bp.eingang.' + k); } catch { return null; } }, set(k, v) { try { localStorage.setItem('bp.eingang.' + k, v); } catch { /* egal */ } } };
  const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' kB');
  const dt = (t) => { const d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
  const st = document.createElement('style');
  st.textContent = `.bpe-l{display:grid;gap:.3rem;max-height:min(55vh,26rem);overflow:auto;margin:.2rem 0 .4rem;min-width:min(30rem,82vw)}
  .bpe-z{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.15rem .55rem;align-items:center;border:1px solid var(--line,#ccc);border-radius:calc(8px*var(--rk,1));padding:.4rem .55rem;cursor:pointer}
  .bpe-z input{margin:0;accent-color:var(--y,#3b5b8c)}.bpe-z.neu{border-color:var(--y,#3b5b8c)}.bpe-n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
  .bpe-z small{grid-column:2;color:var(--mute,#777)}.bpe-z .btn{grid-row:1/3;grid-column:3}`;
  document.head.appendChild(st);
  let offen = false;
  const schluessel = (s) => `${s.n}|${s.neueste || ''}`;

  async function oeffnen(manuell) {
    if (offen || document.querySelector('.bpe-dlg')) return;
    let r; try { r = await fetch('api/bp/eingang', { credentials: 'same-origin' }).then((x) => x.json()); } catch (e) { if (manuell) TOAST('Eingang nicht erreichbar.', true); return; }
    if (r.aus) { if (manuell) TOAST('Kein Eingangsordner eingerichtet (Verwaltung → Einstellungen → Ablage).', true); return; }
    if (!r.ok) { if (manuell) TOAST(r.error || 'Eingang nicht erreichbar.', true); return; }
    const D = r.dateien || [];
    if (!D.length) { if (manuell) TOAST('Der Eingang ist leer.'); return; }
    const gesehen = new Set(JSON.parse(LS.get('gesehen') || '[]')), key = (x) => x.name + '|' + x.mtime;
    offen = true;
    const bg = modalBox(`<h3>📥 Eingang – ${D.length} Dokument${D.length === 1 ? '' : 'e'}</h3>
      <p class="mu" style="margin:0 0 .5rem">Scans vom Kopierer und andere Dateien im Eingangsordner. Jede wird wie beim Hineinziehen gelesen, die Plattform schlägt Ordner und Namen vor; danach wandert sie nach „verarbeitet“.</p>
      <div class="bpe-l">${D.map((x, i) => `<label class="bpe-z${gesehen.has(key(x)) ? '' : ' neu'}"><input type="checkbox" data-bpe="${i}" checked><span class="bpe-n" title="${E(x.name)}">${E(x.name)}</span>
        <button type="button" class="btn sm" data-bpes="${i}" title="Ansehen">👁</button><small>${dt(x.mtime)} · ${kb(x.size)}</small></label>`).join('')}</div>
      <div class="acts"><button class="btn" data-m="spaeter">Später</button><button class="btn" data-m="erledigt" title="Ausgewählte ohne Ablegen nach „verarbeitet“ verschieben">Ohne Ablegen erledigt</button><button class="btn pri" data-m="ok">Ablegen …</button></div>`,
    async (m, bg2, close) => {
      const wahl = [...bg2.querySelectorAll('[data-bpe]:checked')].map((c) => D[+c.dataset.bpe]);
      LS.set('gesehen', JSON.stringify(D.map(key).slice(0, 300)));
      if (m === 'spaeter') { LS.set('spaeter', heute() + '|' + schluessel(H.eingangStand || {})); close(); offen = false; return; }
      if (m === 'erledigt') {
        if (!wahl.length) { TOAST('Bitte Dateien auswählen.', true); return; }
        close(); offen = false; let n = 0;
        for (const x of wahl) { try { const j = await post('api/bp/eingang/erledigt', { name: x.name }); if (j.error) throw new Error(j.error); n++; } catch (e) { TOAST(e.message, true); } }
        TOAST(`${n} Datei${n === 1 ? '' : 'en'} nach „verarbeitet“ verschoben.`); return;
      }
      if (m !== 'ok') return;
      if (!wahl.length) { TOAST('Bitte Dateien auswählen.', true); return; }
      close(); offen = false;
      for (const x of wahl) {
        let f; try { const rr = await fetch('api/bp/eingang/datei?name=' + encodeURIComponent(x.name), { credentials: 'same-origin' }); if (!rr.ok) throw new Error((await rr.json().catch(() => ({}))).error || 'Fehler ' + rr.status); const bl = await rr.blob(); f = new File([bl], x.name, { type: bl.type }); }
        catch (e) { TOAST(`„${x.name}“: ${e.message}`, true); continue; }
        let ok;
        if (H.eingangVerarbeiten) { const e2 = await H.eingangVerarbeiten(f); if (e2 === false) break; ok = e2 === 'ok'; }
        else if (H.ablage && H.ablage.ablegen) { const erg = await H.ablage.ablegen([f]); ok = !!(erg && erg.length); if (!erg) break; }
        if (ok) { try { const j = await post('api/bp/eingang/erledigt', { name: x.name }); if (j.error) throw new Error(j.error); } catch (e) { TOAST(`„${x.name}“ abgelegt, aber nicht verschoben: ${e.message}`, true); } }
      }
    });
    bg.querySelector('.modal').classList.add('bpe-dlg');
    bg.addEventListener('click', (e) => { const v = e.target.closest('[data-bpes]'); if (!v) return; e.preventDefault(); const x = D[+v.dataset.bpes];
      if (H.ansehen && /\.(pdf|jpe?g|png)$/i.test(x.name)) H.ansehen([{ url: 'api/bp/eingang/datei?name=' + encodeURIComponent(x.name), name: x.name, typ: /\.pdf$/i.test(x.name) ? 'pdf' : 'bild' }]); });
  }
  const post = (u, b) => fetch(u, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());

  /* Neuer Stand aus der Kopfleiste: Fenster öffnen, außer heute schon „Später“ für genau diesen Stand */
  function stand(s) {
    H.eingangStand = s;
    if (!s || !s.n || offen) return;
    if (LS.get('spaeter') === heute() + '|' + schluessel(s)) return;
    if (document.querySelector('.modal-bg, .bph-gv')) { setTimeout(() => stand(H.eingangStand), 20000); return; }   // gerade ein anderes Fenster offen: später
    oeffnen(false);
  }
  window.bpEingang = { stand, oeffnen: () => oeffnen(true) };
  stand(H.eingangStand);
})();
