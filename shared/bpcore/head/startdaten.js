/* Startdaten aus dem Gebäudemodell – derselbe Baustein in Kosten, Terminplan, Ausschreibung und Bauantrag (GO 16.11.2026, „Gebäudemodell als Mitte“, Punkt 4).
   Legt jemand den ersten Stand an und hat das Projekt ein Gebäudemodell, fragt die App: „Startdaten daraus übernehmen?“ Die Antwort setzt
   gleich die Linie der App zum Modell (Kern: /api/bp/modell/<pid>/link/<app>):
     „Übernehmen, Änderungen nachfragen“  → lebendig, mit Übernahme
     „Übernehmen, Änderungen automatisch“ → lebendig, automatisch
     „Leer anfangen“                      → getrennt
   Ohne Modell kommt keine Frage, nur ein kurzer Hinweis.

   BPHead.startdaten({ pid, app: 'kosten'|'termine'|'ausschreibung'|'bauantrag', titel, baubeginn: true })
     → Promise<null (abgebrochen) | { modus: 'uebernahme'|'auto'|'getrennt'|'leer', baubeginn: 'JJJJ-MM-TT', modell }> */
(function () {
  if (window.bpStartdaten) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const J = (u, m, b) => fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Der Server ist gerade nicht erreichbar.'); return j; });
  const montag = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d.toISOString().slice(0, 10); };

  function inhalt(m) {   // was im Modell steht – für die Frage
    const L = (m.bauteilliste && m.bauteilliste.zeilen) || [], B = L.filter((z) => !z.entfaellt && z.bereich !== 'frage' && !(z.menge_basis != null && !z.anzahl && z.verteilt));   // wie die Baumtabelle (bauteile.js ganzVerteilt): ganz ins Raumbuch verteilte Grundzeilen zählen nicht
    const oe = B.filter((z) => z.bereich === 'oeffnung').reduce((s, z) => s + (z.anzahl || 0), 0);
    const r = ((m.bauteilliste && m.bauteilliste.raeume) || m.raeume || []).length, a = m.assistent && m.assistent.type;
    const T = [B.length ? `${B.length} Bauteilgruppen` : '', r ? `${r} Räume` : '', oe ? `${oe} Fenster und Türen` : '', a ? 'Angaben des Planungsassistenten' : ''].filter(Boolean);
    return { leer: !T.length, text: T.join(', ').replace(/, ([^,]*)$/, ' und $1') };
  }

  window.bpStartdaten = async function (o = {}) {
    if (!o.pid) return { modus: 'leer' };
    let d;
    try { d = await J(`api/bp/modell/${o.pid}`); } catch { return { modus: 'leer' }; }
    const m = d.modell || {}, I = inhalt(m);
    if (I.leer) { if (window.toast) toast('Das Gebäudemodell dieses Projekts ist noch leer – Pläne liest du im Gebäudemodell ein.'); return { modus: 'leer', modell: m }; }
    return new Promise((fertig) => {
      let wahl = 'uebernahme';
      const html = () => `<div class="bph-db" style="display:flex;flex-direction:column;gap:.7rem;max-width:560px">
        <b style="font-size:1.05rem">${esc(o.titel || 'Neuer Stand')}</b>
        <div>Im Gebäudemodell stehen <b>${esc(I.text)}</b>. Startdaten daraus übernehmen?</div>
        ${[['uebernahme', 'Übernehmen, Änderungen nachfragen', 'Ändert sich das Modell, zeigt die App einen Hinweis zum Übernehmen.'],
    ['auto', 'Übernehmen, Änderungen automatisch', 'Änderungen am Modell kommen von selbst in die App.'],
    ['getrennt', 'Leer anfangen', 'Die App arbeitet für sich, das Modell bleibt unberührt.']].map(([k, t, s]) => `<label style="display:flex;gap:.5rem;align-items:flex-start;padding:.45rem .6rem;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));cursor:pointer${wahl === k ? ';border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3)' : ''}">
            <input type="radio" name="bpsd" value="${k}"${wahl === k ? ' checked' : ''}><span><b>${t}</b><br><small style="opacity:.7">${s}</small></span></label>`).join('')}
        ${o.baubeginn ? `<label style="display:flex;gap:.6rem;align-items:center">Baubeginn <input type="date" data-sdbb value="${esc(m.baubeginn || montag())}"></label>` : ''}
        <small style="opacity:.7">Die Wahl lässt sich später in der Verknüpfungs-Karte ändern.</small>
        <div class="bph-row" style="justify-content:flex-end;gap:.4rem"><button type="button" class="bph-btn" data-m="abbrechen">Abbrechen</button><button type="button" class="bph-btn pri" data-m="ok">Anlegen</button></div></div>`;
      modalBox(html(), async (k, bg, close) => {
        if (k === 'abbrechen') { close(); return fertig(null); }
        if (k !== 'ok') return;
        const bb = (bg.querySelector('[data-sdbb]') || {}).value || '';
        close();
        try {
          if (o.app) await J(`api/bp/modell/${o.pid}/link/${o.app}`, 'PUT', wahl === 'getrennt' ? { zustand: 'getrennt' } : { zustand: 'lebendig', uebernahme: wahl });
        } catch (e) { if (window.toast) toast('Linie zum Modell nicht gesetzt: ' + e.message, true); }
        fertig({ modus: wahl, baubeginn: bb, modell: m });
      });
      const bg = [...document.querySelectorAll('.modal-bg')].pop();
      bg.addEventListener('change', (e) => { if (e.target.name === 'bpsd') { wahl = e.target.value; const box = bg.querySelector('.modal'), bb = (box.querySelector('[data-sdbb]') || {}).value; box.innerHTML = html(); const x = box.querySelector('[data-sdbb]'); if (x && bb) x.value = bb; } });
    });
  };
}());
