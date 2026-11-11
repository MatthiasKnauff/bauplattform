/* =====================================================================
   Datei ablegen – in jeder App: Dokumente ins Fenster ziehen → im Projektordner ablegen.
   Vorschlag für den Ordner: „hier“ (was die Seite meldet, sonst der zuletzt benutzte Ordner dieses Projekts),
   dann was der Server aus Dateiname und Inhalt erkennt, dann alle Ordner mit Unterordnern (Suche).
   Vorschlag für den Namen: Projektkürzel vorne, bei Scannernamen ein Titel aus dem PDF mit Datum – frei änderbar.
   Seiten mit eigenen Ablagen (AVA, Fotos …) behalten ihre: wer beim Loslassen preventDefault() ruft, hat Vorrang; ebenso ein Datei-Feld
   in der Nähe (head.js, dropUeberall). Nur wo sonst nichts greift, wird im Projektordner abgelegt.
   Eine Seite kann einhaken:
     BPHead.ablage.hier = (ziel) => 'Ordner/Unterordner' | null   // Ordner zur Stelle, auf die gezogen wurde
     BPHead.ablage.nachher = (ergebnisse) => …                     // nach dem Ablegen (z. B. Liste neu lesen)
     BPHead.ablage.aus = true                                       // auf dieser Seite nicht anbieten
   Server: /api/bp/ablage/vorschlag, /api/bp/ablage (bpcore/head.py → Bautagebuch)
   ===================================================================== */
(function los() {
  if (!window.BPHead || !window.modalBox || !window.pickMenu) { setTimeout(los, 50); return; }
  const H = window.BPHead;
  if (H.ablage && H.ablage.bereit) return;
  const A = H.ablage = Object.assign(H.ablage || {}, { bereit: true, ablegen: (files, ziel) => alle(files, ziel) });
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TOAST = (m, f) => (window.toast ? window.toast(m, f) : console.log(m));
  const mb = (n) => (n > 1048576 ? (n / 1048576).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem('bp.ablage.' + k) || 'null'); } catch { return null; } }, set(k, v) { try { localStorage.setItem('bp.ablage.' + k, JSON.stringify(v)); } catch { /* egal */ } } };
  const st = document.createElement('style');
  st.textContent = `.bpa-namen{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.35rem}.bpa-namen button{border:1px solid var(--line,#ccc);background:var(--card,#fff);color:inherit;border-radius:calc(999px*var(--rkp,1));padding:.1rem .6rem;font:inherit;font-size:.8rem;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bpa-namen button.on{border-color:var(--y,#3b5b8c);color:var(--y,#3b5b8c)}.bpa-name{width:100%;box-sizing:border-box}`;
  document.head.appendChild(st);

  async function projekt() {
    const id = H.projektId && H.projektId(); if (id) return id;
    const L = await fetch('api/bp/projekte', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => []);
    return new Promise((fertig) => {
      const bg = modalBox(`<h3>In welches Projekt?</h3><p class="mu" style="margin:0 0 .6rem">Oben ist kein Projekt gewählt.</p><button type="button" class="pick" id="bpaP" style="width:100%"></button>
        <div class="acts"><button class="btn" data-m="x">Abbrechen</button></div>`, (m, b, close) => { if (m === 'x') { close(); fertig(null); } });
      const k = bg.querySelector('#bpaP'); pickButton(k, { title: 'Projekt wählen …', sub: '' });
      k.addEventListener('click', () => pickMenu(k, { search: 'Projekt suchen …', items: (L || []).filter((p) => !p.archived).map((p) => ({ value: p.id, title: p.name })),
        onPick: (v) => { bg.remove(); fertig(+v); } }));
    });
  }
  async function alle(files, ziel) {
    const L = [...files]; if (!L.length) return;
    const pid = await projekt(); if (!pid) return;
    const hier = (A.hier && A.hier(ziel)) ?? (LS.get('zuletzt') || {})[pid] ?? null, erg = [];
    for (let i = 0; i < L.length; i++) { const r = await eine(L[i], pid, hier, L.length - i - 1); if (r === 'stop') break; if (r && r.pfad) erg.push(r); }
    if (erg.length && A.nachher) A.nachher(erg);
  }
  async function eine(f, pid, hier, rest) {
    const warte = setTimeout(() => TOAST(`„${f.name}“ wird gelesen …`), 1500);
    const fd = new FormData(); fd.append('datei', f); fd.append('project_id', pid);
    let V;
    try { const r = await fetch('api/bp/ablage/vorschlag', { method: 'POST', body: fd, credentials: 'same-origin' }); V = await r.json().catch(() => ({})); if (!r.ok) throw new Error(V.error || 'Fehler ' + r.status); }
    catch (e) { clearTimeout(warte); TOAST(e.message, true); return rest ? 'weiter' : 'stop'; }
    clearTimeout(warte);
    const zeig = (o) => (o ? o.split('/').join(' / ') : '(oberste Ebene)'), letzt = (o) => o.split('/').pop();
    const items = [], da = new Set();
    const dazu = (x) => { if (x.value == null || da.has(x.value)) return; da.add(x.value); items.push(x); };
    if (hier != null && V.ordner.includes(hier)) dazu({ group: 'Hier – wo du gerade bist', title: letzt(hier), sub: zeig(hier), value: hier });
    V.erkannt.forEach((x) => dazu({ group: 'Erkannt aus der Datei', title: letzt(x.pfad), sub: zeig(x.pfad) + ' · ' + x.grund, value: x.pfad }));
    V.ordner.forEach((o) => dazu({ group: 'Alle Ordner', title: zeig(o), value: o, find: o, tiefe: o.split('/').length - 1 }));
    let wahl = items.length ? items[0].value : null, name = (V.namen || [])[0] || f.name;
    return new Promise((fertig) => {
      const bg = modalBox(`<h3>Datei ablegen</h3>
        <p class="mu" style="margin:0 0 .7rem">${E(f.name)} · ${mb(f.size)}${V.plan ? ` · Plan ${E(V.plan)}` : ''}${V.text || !/\.pdf$/i.test(f.name) ? '' : ' · im PDF kein Text, Vorschlag nur nach dem Namen'}${rest ? ` · noch ${rest} weitere` : ''}</p>
        <div class="fm"><label>Ordner</label><button type="button" class="pick" id="bpaO" style="width:100%"></button></div>
        <div class="fm" style="margin-top:.6rem"><label for="bpaN">Name</label><input id="bpaN" class="bpa-name" value="${E(name)}" autocomplete="off" spellcheck="false">
          ${(V.namen || []).length > 1 ? `<div class="bpa-namen">${V.namen.map((n) => `<button type="button" data-bpan="${E(n)}" title="${E(n)}" class="${n === name ? 'on' : ''}">${E(n)}</button>`).join('')}</div>` : ''}</div>
        <p class="mu" style="margin:.5rem 0 0;font-size:.85rem">Im Projektordner ${E(V.basis || '')}. Gibt es den Namen dort schon, wird nichts überschrieben – die neue Datei bekommt „(2)“.</p>
        <div class="acts"><button class="btn" data-m="x">${rest ? 'Überspringen' : 'Abbrechen'}</button><button class="btn pri" data-m="ok">Ablegen</button></div>`, async (m, bg2, close, b) => {
        if (m === 'x') { close(); fertig(rest ? 'weiter' : 'stop'); return; }
        if (m !== 'ok') return;
        if (wahl == null || !wahl) { TOAST('Bitte einen Ordner im Projektordner wählen.', true); return; }
        name = bg.querySelector('#bpaN').value.trim(); if (!name) { TOAST('Bitte einen Namen eingeben.', true); return; }
        if (!/\.[a-z0-9]{2,5}$/i.test(name) && /\.([a-z0-9]{2,5})$/i.test(f.name)) name += f.name.match(/\.[a-z0-9]{2,5}$/i)[0];
        b.disabled = true;
        const fd2 = new FormData(); fd2.append('datei', f); fd2.append('project_id', pid); fd2.append('ordner', wahl); fd2.append('name', name);
        try { const r = await fetch('api/bp/ablage', { method: 'POST', body: fd2, credentials: 'same-origin' }), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status);
          close(); const z = LS.get('zuletzt') || {}; z[pid] = wahl; LS.set('zuletzt', z); TOAST('Abgelegt: ' + j.pfad); fertig({ pfad: j.pfad }); }
        catch (e) { b.disabled = false; TOAST(e.message, true); }
      });
      bg.addEventListener('click', (e) => { const n = e.target.closest('[data-bpan]'); if (!n) return; bg.querySelector('#bpaN').value = n.dataset.bpan;
        bg.querySelectorAll('[data-bpan]').forEach((x) => x.classList.toggle('on', x === n)); });
      const k = bg.querySelector('#bpaO');
      const knopf = () => { const it = items.find((x) => x.value === wahl); pickButton(k, { title: it ? zeig(it.value) : 'Ordner wählen …', sub: it ? it.group : '' }); };
      knopf();
      k.addEventListener('click', () => pickMenu(k, { items: items.map((x) => ({ ...x, title: x.tiefe ? ' '.repeat(Math.min(x.tiefe, 4)) + letzt(x.value) : x.title, sub: x.tiefe ? zeig(x.value) : x.sub, on: x.value === wahl })),
        search: 'Ordner suchen …', empty: 'Keine Ordner gefunden.', onPick: (v) => { wahl = v; knopf(); } }));
      setTimeout(() => { const i = bg.querySelector('#bpaN'); if (i) { i.focus(); i.setSelectionRange(0, i.value.replace(/\.[^.]+$/, '').length); } }, 30);
    });
  }
  /* Ziehen und Loslassen selbst: head.js (dropUeberall) – Datei-Felder in der Nähe haben Vorrang, sonst ruft es BPHead.ablage.ablegen */
})();
