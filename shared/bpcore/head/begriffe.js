/* Einträge aus Vorschlagslisten löschen – mit Ersatz (GO 17.11.2026, Entwurf „Gewerk / Rolle löschen“: O1, P1, R1). Kern: bpcore/begriffe.py.
   bpBegriff.loeschen({ quelle, wert, basis?, nachher? }) → Promise<{ n, rueck, ersatz, je } | null>
     Popup: alle Sachen mit diesem Eintrag (z. B. Adressen mit Gewerk „Bauherr*in“), oben „Ersatz für alle“ (ähnliche Schreibweise vorgeschlagen),
     je Zeile änderbar, leer = ohne Ersatz; „öffnen“ zeigt die Adresse in der gewohnten Maske. „Ersetzen und löschen“ – danach Rückgängig.
   bpBegriff.knopf(quelle, wert) → HTML für das 🗑 in einer Vorschlagszeile (data-bpbegr); Klick-Behandlung macht die Liste selbst.
   Wo es das 🗑 gibt: Kontaktmaske (Gewerk / Rolle, Stichwörter, Tags), Vorschlagslisten mit .quelle (vorschlag.js). */
(() => {
  if (window.bpBegriff) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KX = (u, o = {}) => fetch(u, { credentials: 'same-origin', ...o }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || 'Fehler ' + r.status); return j; });
  const POST = (u, b) => KX(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  const css = document.createElement('style');
  css.textContent = `.bpb-t{width:100%;border-collapse:collapse;font-size:.9rem;margin:.4rem 0}.bpb-t td,.bpb-t th{padding:.3rem .4rem;border-bottom:1px solid var(--line,#ddd);text-align:left;vertical-align:middle}
.bpb-t th{font-size:.76rem;opacity:.7;font-weight:600}.bpb-t small{display:block;opacity:.7}.bpb-t input{width:100%;box-sizing:border-box;min-width:8rem}
.bpb-alle{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:.4rem 0}.bpb-alle input{flex:1;min-width:10rem}.bpb-h{font-size:.8rem;color:var(--ok,#1e8a4c)}
.bpb-w{max-height:min(50vh,26rem);overflow:auto}.bpb-del{border:0;background:none;cursor:pointer;opacity:0;padding:0 .2rem;font-size:.85rem;color:var(--red,#c62f2a)}
:is(div,li,.bp-vs-z):hover>.bpb-del,.bp-vs-z.an>.bpb-del,.bpb-del:focus{opacity:.85}@media (pointer:coarse){.bpb-del{opacity:.6}}`;
  document.head.appendChild(css);

  function loeschen(o) {
    const B = o.basis || '', url = B + 'api/bp/begriffe/' + encodeURIComponent(o.quelle);
    return new Promise(async (fertig) => {
      let D; try { D = await KX(url + '?wert=' + encodeURIComponent(o.wert)); } catch (e) { (window.bpHinweis || window.toast)(e.message, true); return fertig(null); }
      const je = {};   // je Sache geänderter Ersatz (sonst gilt „für alle“)
      let alle = D.vorschlag || '';
      if (window.bpVorschlag) bpVorschlag.listen.bpbegr = D.werte.map((w) => ({ w }));
      const d = document.createElement('div'); d.className = 'bph-dlg-bg'; d.style.zIndex = 6000;
      const zeilen = () => D.treffer.map((t) => `<tr><td>${esc(t.name)}${t.sub ? `<small>${esc(t.sub)}</small>` : ''}</td>
        <td><input data-bpbje="${t.id}" data-vs="bpbegr" autocomplete="off" value="${esc(t.id in je ? je[t.id] : alle)}" placeholder="ohne Ersatz" aria-label="${esc(D.titel)} danach – ${esc(t.name)}"></td>
        <td>${o.quelle.startsWith('kontakt.') && window.bpKontakt ? `<button type="button" class="btn sm" data-bpbauf="${t.id}">öffnen</button>` : ''}</td></tr>`).join('');
      d.innerHTML = `<div class="bph-dlg" style="max-width:36rem" role="dialog" aria-label="Eintrag löschen"><div class="bph-dh"><b>„${esc(D.wert)}“ löschen</b><button type="button" class="bph-x" data-bpbx aria-label="Schließen">×</button></div><div class="bph-db">
        <p class="bph-mu" style="margin:0">${D.treffer.length ? `${D.treffer.length} ${o.quelle.startsWith('kontakt.') ? (D.treffer.length === 1 ? 'Adresse hat' : 'Adressen haben') : (D.treffer.length === 1 ? 'Eintrag hat' : 'Einträge haben')} ${esc(D.titel)} „${esc(D.wert)}“.` : 'Keine Einträge mehr mit diesem Wert – er verschwindet aus der Liste.'}</p>
        ${D.treffer.length ? `<div class="bpb-alle"><label for="bpbAlle">Ersatz für alle:</label><input id="bpbAlle" data-vs="bpbegr" autocomplete="off" value="${esc(alle)}" placeholder="ohne Ersatz">${D.vorschlag ? '<span class="bpb-h">ähnlich geschrieben – vorgeschlagen</span>' : ''}</div>
        <div class="bpb-w"><table class="bpb-t"><thead><tr><th>${o.quelle.startsWith('kontakt.') ? 'Adresse' : 'Eintrag'}</th><th>${esc(D.titel)} danach</th><th></th></tr></thead><tbody>${zeilen()}</tbody></table></div>` : ''}
        <div class="bph-mu" data-bpbm style="min-height:1.2em"></div>
        <div style="display:flex;justify-content:flex-end;gap:.5rem"><button type="button" class="btn" data-bpbx>Abbrechen</button><button type="button" class="btn pri primary" data-bpbok>${D.treffer.length ? 'Ersetzen und löschen' : 'Schließen'}</button></div></div></div>`;
      document.body.appendChild(d);
      const ende = (r) => { d.remove(); fertig(r); };
      d.addEventListener('input', (e) => {
        const t = e.target;
        if (t.id === 'bpbAlle') { alle = t.value; d.querySelectorAll('[data-bpbje]').forEach((x) => { if (!(x.dataset.bpbje in je)) x.value = alle; }); }
        else if (t.dataset.bpbje) je[t.dataset.bpbje] = t.value;
      });
      d.addEventListener('change', (e) => { if (e.target.id === 'bpbAlle') { alle = e.target.value; d.querySelectorAll('[data-bpbje]').forEach((x) => { if (!(x.dataset.bpbje in je)) x.value = alle; }); } });
      d.addEventListener('click', async (e) => {
        if (e.target.closest('[data-bpbx]')) return ende(null);
        const auf = e.target.closest('[data-bpbauf]');
        if (auf) { await window.bpKontakt({ id: +auf.dataset.bpbauf }, { basis: B }); return; }
        if (!e.target.closest('[data-bpbok]')) return;
        if (!D.treffer.length) return ende({ n: 0 });
        const b = e.target.closest('[data-bpbok]'); b.disabled = true; d.querySelector('[data-bpbm]').textContent = 'Wird ersetzt …';
        try {
          const r = await POST(url + '/ersetzen', { wert: D.wert, ersatz: alle.trim(), je });
          ende({ ...r, ersatz: alle.trim(), je });   // wer gerade eine der Sachen offen hat, setzt den Ersatz auch dort (Kontaktmaske)
          if (window.toast) toast(`„${D.wert}“ gelöscht – ${r.n} ${o.quelle.startsWith('kontakt.') ? (r.n === 1 ? 'Adresse' : 'Adressen') : 'Einträge'} geändert.`);
          if (r.n && window.rueckgaengig) rueckgaengig(`„${D.wert}“ gelöscht`, async () => { await POST(url + '/zurueck', { rueck: r.rueck }); if (o.nachher) o.nachher(); }, { neu: async () => { if (o.nachher) o.nachher(); } });
          if (o.nachher) o.nachher();
        } catch (er) { b.disabled = false; d.querySelector('[data-bpbm]').textContent = er.message; }
      });
    });
  }
  const knopf = (quelle, wert) => `<button type="button" class="bpb-del" data-bpbegr="${esc(quelle)}" data-wert="${esc(wert)}" title="„${esc(wert)}“ löschen – die Einträge bekommen einen Ersatz" aria-label="${esc(wert)} löschen">🗑</button>`;
  window.bpBegriff = { loeschen, knopf };
})();
