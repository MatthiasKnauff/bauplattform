'use strict';
/* =====================================================================
   Projektordner beim Anlegen eines Projekts (24.11.2026) – Baustein für alle Apps, geladen erst beim Aufruf.
     await BPHead.projektOrdner(pid)  → fragt den Dateiserver (Bautagebuch /api/projektordner). Fehlt der Projektordner oder ist er leer,
       fragt ein Fenster, ob er nach der Projektvorlage des Büros angelegt werden soll; liegen dort schon lose Dateien, steht je Datei
       ein Vorschlag, in welchen Ordner sie gehört (Haken = einsortieren, Ziel änderbar). Angelegt wird erst mit „Anlegen“.
       Hat der Ordner schon Unterordner, ist die Ablage aus oder fehlt das Kürzel, passiert nichts.
   Aufgerufen von der Projektmaske (head.js, nach „Anlegen“). Server: bautagebuch/modules/projektordner.py.
   ===================================================================== */
(() => {
  const H = (window.BPHead = window.BPHead || {});
  const esc = window.bpEsc;
  const PFAD = () => (H.app === 'bautagebuch' ? 'api/' : 'api/bp/bt/') + 'projektordner';
  const J = (b) => H._i.KX(PFAD(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

  const stil = () => { if (document.getElementById('bp-po-css')) return; const x = document.createElement('style'); x.id = 'bp-po-css';
    x.textContent = `.bp-po{max-width:640px}.bp-po p{margin:0 0 .5rem}.bp-po-mu{color:var(--mute,#6b7280);font-size:.88em}
      .bp-po-o{margin:0 0 .6rem}.bp-po-o ul{margin:.3rem 0 0;padding-left:1.2rem;max-height:9rem;overflow:auto;font-size:.88em}
      .bp-po-t{font-weight:600;margin:.4rem 0 .3rem}.bp-po-roll{max-height:40vh;overflow:auto;border:1px solid var(--line,#d5d9de);border-radius:calc(4px*var(--rk,1))}
      .bp-po-d{width:100%;border-collapse:collapse;table-layout:fixed}.bp-po-d td{padding:.3rem .4rem;border-bottom:1px solid var(--line,#e5e7eb);vertical-align:top;overflow-wrap:anywhere}
      .bp-po-d td:first-child{width:1.8rem}.bp-po-d td:last-child{width:45%}.bp-po-d select{width:100%}
      .bp-po-hin{background:var(--warnbg,#fff7e0);padding:.4rem .6rem;border-radius:calc(4px*var(--rk,1))}`;
    document.head.appendChild(x); };

  H.projektOrdner = async (pid, name = '') => {
    const s = await H._i.KX(PFAD() + '?project_id=' + encodeURIComponent(pid));
    if (!s || !['neu', 'leer', 'dateien'].includes(s.zustand)) return false;
    const D = s.dateien || [], O = s.ordner || [];
    const kopf = s.zustand === 'neu' ? `Für ${name ? '„' + esc(name) + '“' : 'das Projekt'} gibt es auf dem Dateiserver noch keinen Projektordner.`
      : s.zustand === 'leer' ? `Der Projektordner ${name ? 'von „' + esc(name) + '“ ' : ''}ist noch leer.`
        : `Im Projektordner ${name ? 'von „' + esc(name) + '“ ' : ''}liegen ${D.length === 1 ? 'eine Datei' : D.length + ' Dateien'}, aber noch keine Ordner.`;
    const ziel = (f, i) => `<select data-pozi="${i}" data-bp-auswahl><option value=""${f.ziel ? '' : ' selected'}>bleibt liegen</option>${O.map((o) => `<option value="${esc(o)}"${o === f.ziel ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    const tab = D.length ? `<p class="bp-po-t">Dateien einsortieren <span class="bp-po-mu">– Vorschlag je Datei, änderbar; was nicht passt, bleibt liegen</span></p>
      <div class="bp-po-roll"><table class="bp-po-d"><tbody>${D.map((f, i) => `<tr><td><input type="checkbox" data-poh="${i}"${f.ziel ? ' checked' : ''} aria-label="einsortieren"></td>
        <td title="${esc(f.rel)}">${esc(f.name)}<br><small class="bp-po-mu">${esc(f.grund || '')}</small></td><td>${ziel(f, i)}</td></tr>`).join('')}</tbody></table></div>` : '';
    stil();
    return new Promise((fertig) => {
      const bg = modalBox(`<h3>Projektordner anlegen?</h3><div class="bp-po">
        <p>${kopf} Soll er nach der Projektvorlage des Büros angelegt werden?</p>
        <p class="bp-po-mu">Ort: ${esc(s.pfad)}</p>
        <details class="bp-po-o"><summary>${O.length} Ordner der Vorlage</summary><ul>${O.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></details>
        ${tab}${s.testserver ? '<p class="bp-po-hin">Testserver: die Ablage wird nur gelesen – es wird nichts angelegt oder verschoben.</p>' : ''}</div>
        <div class="acts"><span class="fill"></span><button type="button" class="btn" data-m="x">Nicht jetzt</button><button type="button" class="btn pri" data-m="ok">Anlegen</button></div>`,
      async (m, bg, close) => {
        if (m !== 'ok') { close(); fertig(false); return; }
        const zuordnung = D.map((f, i) => ({ rel: f.rel, ziel: bg.querySelector(`[data-poh="${i}"]`).checked ? bg.querySelector(`[data-pozi="${i}"]`).value : '' })).filter((z) => z.ziel);
        const b = bg.querySelector('[data-m="ok"]'); b.disabled = true;
        const warte = setTimeout(() => toast('Lege den Projektordner an …'), 1500);
        try {
          const r = await J({ project_id: pid, zuordnung });
          clearTimeout(warte); close();
          toast(r.testserver ? 'Testserver: Projektordner nicht angelegt (Ablage nur lesen).'
            : `Projektordner angelegt – ${r.ordner} Ordner${r.dateien ? `, ${r.dateien} Datei${r.dateien === 1 ? '' : 'en'} einsortiert` : ''}.${r.fehler.length ? ' Hinweise: ' + r.fehler.slice(0, 3).join(' · ') : ''}`, !!r.fehler.length);
          fertig(true);
        } catch (e) { clearTimeout(warte); b.disabled = false; toast(e.message, true); }
      });
      bg.addEventListener('change', (e) => {   // Ziel gewählt → einsortieren; „bleibt liegen“ → Haken weg
        const z = e.target.closest('[data-pozi]'); if (z) bg.querySelector(`[data-poh="${z.dataset.pozi}"]`).checked = !!z.value;
      });
    });
  };
})();
