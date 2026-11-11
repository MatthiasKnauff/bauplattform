'use strict';
/* =====================================================================
   Bauzeitenplan teilen: Links zum Ansehen (schreibgeschützt) für Firmen, Fachplaner, Bauherr – ohne Anmeldung.
   Je Link: „mitlaufend“ (zeigt den eingestellten Plan im aktuellen Stand; die Version lässt sich auch nach dem Versand
   wechseln) oder „fest“ (genau der Stand beim Erstellen) · mit oder ohne Fortschritt · Ablaufdatum · zurückziehen.
   Server: /api/projects/<id>/links, /api/links/<schlüssel>; die Ansicht selbst: /ansicht/<schlüssel> (ansicht.html).
   ===================================================================== */
(function () {
  if (typeof modal !== 'function') return;
  const url = (t) => new URL('ansicht/' + t, location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '')).href;
  const de = (s) => (s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
  const call = async (u, m = 'GET', b) => { const r = await fetch(u, { method: m, headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status); return d; };

  async function teilen() {
    if (!P) { toast('Kein Bauzeitenplan geöffnet.', true); return; }
    const pid = P.id, bt = P._bt && P._bt.id;
    const plaene = () => (bt ? projects.filter((p) => p.bt_id === bt && !p.archived) : projects.filter((p) => p.id === pid));
    let L = [];
    const bg = modal('Plan teilen – Link zum Ansehen', '<div class="tl"><p class="hint">Lade …</p></div>', [{ label: 'Schließen' }]);
    bg.querySelector('.modal').classList.add('tl-modal');
    const box = bg.querySelector('.tl');
    const zeile = (x) => `<div class="tl-l${x.aktiv ? '' : ' aus'}" data-t="${esc(x.token)}">
        <div class="tl-k"><b>${esc(x.name || 'Link vom ' + de(x.erstellt))}</b><span class="tl-art ${x.art}">${x.art === 'fest' ? 'fester Stand' : 'mitlaufend'}</span>${x.aktiv ? '' : '<span class="tl-art aus">zurückgezogen</span>'}
          <span class="hint">${x.aufrufe ? `${x.aufrufe}× geöffnet, zuletzt ${de(x.zuletzt)}` : 'noch nicht geöffnet'}</span></div>
        <div class="tl-z">${x.art === 'fest' ? `<span class="hint">zeigt: ${esc(x.stand_name)}</span>`
          : `<span class="hint">zeigt:</span>${plaene().map((p, i) => `<button type="button" class="tl-v${p.id === x.gantt_id ? ' on' : ''}" data-tv="${esc(p.id)}" title="Diese Version zeigen – gilt sofort, auch für bereits verschickte Links">${i + 1} ${esc(p.name)}${p.gueltig ? ' ★' : ''}</button>`).join('')}`}</div>
        <div class="tl-z"><label><input type="checkbox" data-tf${x.fortschritt ? ' checked' : ''}> mit Fortschritt</label>
          <label>gültig bis <input type="date" data-ta value="${esc(x.ablauf || '')}"></label>
          <span style="flex:1"></span>
          <button type="button" class="btn sm" data-tk title="${esc(url(x.token))}">Link kopieren</button>
          <a class="btn sm" href="${esc(url(x.token))}" target="_blank" rel="noopener">Öffnen</a>
          <button type="button" class="btn sm" data-tz>${x.aktiv ? 'Zurückziehen' : 'Wieder freigeben'}</button>
          <button type="button" class="btn sm" data-td title="Link endgültig löschen">✕</button></div></div>`;
    const zeichne = () => {
      box.innerHTML = `<p class="hint" style="margin-top:0">Firmen, Fachplaner oder Bauherr sehen den Plan über den Link – ohne Anmeldung, ohne etwas ändern zu können. Notizen und Namen der Bearbeiter sind nicht zu sehen.</p>
        ${L.length ? L.map(zeile).join('') : '<p class="hint">Noch kein Link für diesen Plan.</p>'}
        <div class="tl-neu"><b>Neuer Link</b>
          <div class="tl-z"><input type="text" id="tlName" placeholder="Für wen? z. B. Rohbau Meyer, Bauherr" style="flex:1;min-width:12rem">
            <span class="seg" role="group" aria-label="Art"><button type="button" class="on" data-tn="mit" title="Zeigt immer den aktuellen Stand der eingestellten Version – die Version lässt sich später wechseln">mitlaufend</button><button type="button" data-tn="fest" title="Zeigt genau den Stand von jetzt – ändert sich nicht mehr">fester Stand</button></span></div>
          <div class="tl-z"><label><input type="checkbox" id="tlFort" checked> mit Fortschritt</label><label>gültig bis <input type="date" id="tlAb"></label><span style="flex:1"></span>
            <button type="button" class="btn primary" id="tlNeu">Link erstellen</button></div></div>`;
    };
    const laden = async () => { try { L = await call(`api/projects/${encodeURIComponent(pid)}/links`); } catch (e) { box.innerHTML = `<p class="hint">${esc(e.message)}</p>`; return; } zeichne(); };
    const kopieren = async (t) => { try { await navigator.clipboard.writeText(url(t)); toast('Link kopiert – z. B. in eine Mail einfügen.'); } catch { toast(url(t)); } };
    const aendern = async (t, b) => { try { const x = await call('api/links/' + encodeURIComponent(t), 'PUT', b); L = L.map((y) => (y.token === t ? x : y)); zeichne(); } catch (e) { toast(e.message, true); } };
    box.addEventListener('click', async (e) => {
      const n = e.target.closest('[data-tn]'); if (n) { box.querySelectorAll('[data-tn]').forEach((b) => b.classList.toggle('on', b === n)); return; }
      if (e.target.closest('#tlNeu')) {
        try { const x = await call(`api/projects/${encodeURIComponent(pid)}/links`, 'POST', { name: box.querySelector('#tlName').value.trim(), art: box.querySelector('[data-tn].on').dataset.tn,
          fortschritt: box.querySelector('#tlFort').checked, ablauf: box.querySelector('#tlAb').value });
          L.unshift(x); zeichne(); kopieren(x.token); } catch (er) { toast(er.message, true); }
        return;
      }
      const z = e.target.closest('[data-t]'); if (!z) return; const t = z.dataset.t;
      const v = e.target.closest('[data-tv]'); if (v) { aendern(t, { gantt_id: v.dataset.tv }); return; }
      if (e.target.closest('[data-tk]')) { kopieren(t); return; }
      if (e.target.closest('[data-tz]')) { const x = L.find((y) => y.token === t); aendern(t, { aktiv: !x.aktiv }); return; }
      if (e.target.closest('[data-td]')) {
        if (!(await bpFrage('Diesen Link endgültig löschen? Wer ihn hat, sieht den Plan danach nicht mehr.', { ok: 'Löschen' }))) return;
        try { await call('api/links/' + encodeURIComponent(t), 'DELETE'); L = L.filter((y) => y.token !== t); zeichne(); } catch (er) { toast(er.message, true); }
      }
    });
    box.addEventListener('change', (e) => {
      const z = e.target.closest('[data-t]'); if (!z) return;
      if (e.target.matches('[data-tf]')) aendern(z.dataset.t, { fortschritt: e.target.checked });
      if (e.target.matches('[data-ta]')) aendern(z.dataset.t, { ablauf: e.target.value });
    });
    laden();
  }
  window.ganttTeilen = teilen;
})();
