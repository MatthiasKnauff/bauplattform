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
  .bpa-namen button.on{border-color:var(--y,#3b5b8c);color:var(--y,#3b5b8c)}.bpa-name{width:100%;box-sizing:border-box}
  .bpa-ka{display:grid;gap:.4rem;margin:0 0 .6rem}.bpa-k{display:flex;gap:.55rem;align-items:flex-start;border:1px solid var(--line,#ccc);border-radius:calc(9px*var(--rk,1));padding:.45rem .6rem;cursor:pointer}
  .bpa-k.on{border:2px solid var(--y,#3b5b8c);padding:calc(.45rem - 1px) calc(.6rem - 1px)}.bpa-k input{margin:.2rem 0 0;accent-color:var(--y,#3b5b8c)}.bpa-k small{display:block;color:var(--mute,#777);font-size:.8rem;overflow-wrap:anywhere}
  .bpa-t{font-style:normal;font-size:.72rem;border:1px solid var(--y,#3b5b8c);color:var(--y,#3b5b8c);border-radius:999px;padding:0 .45rem;margin-left:.3rem}
  .bpa-ck{display:flex;gap:.5rem;align-items:flex-start;margin:.35rem 0;font-size:.9rem}.bpa-ck input{margin:.2rem 0 0;accent-color:var(--y,#3b5b8c)}
  .bpa-seg{display:inline-flex;border:1px solid var(--line,#ccc);border-radius:999px;padding:2px;gap:2px}.bpa-seg button{border:0;background:none;color:inherit;font:inherit;font-size:.8rem;border-radius:999px;padding:.1rem .55rem;cursor:pointer}.bpa-seg button.on{background:var(--y,#3b5b8c);color:var(--on,#fff)}`;
  st.textContent += `.bpa-baum{max-height:min(55vh,28rem);overflow:auto;border:1px solid var(--line,#ccc);border-radius:calc(8px*var(--rk,1));padding:.25rem;min-width:min(26rem,80vw)}
  .bpa-bz{display:flex;align-items:center;gap:.25rem;padding:.28rem .3rem;border-radius:calc(6px*var(--rk,1));cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bpa-bz:hover{background:var(--hov,#f3f1ec)}
  .bpa-bz.on{background:color-mix(in srgb,var(--y,#3b5b8c) 18%,transparent);font-weight:600}.bpa-bc{display:inline-block;width:1rem;text-align:center;color:var(--mute,#777)}`;
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
        <p class="mu" style="margin:0 0 .7rem">${E(f.name)} · ${mb(f.size)}${V.plan ? ` · Plan ${E(V.plan)}` : ''}${V.text ? '' : ' · kein Text erkannt, Vorschlag nur nach dem Namen'}${rest ? ` · noch ${rest} weitere` : ''}</p>
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
        const plan = await aehnlichFragen(pid, wahl, f.name); if (!plan) { b.disabled = false; return; }   // ähnliche Ordner: Ziel wählen (nur am PC)
        const fd2 = new FormData(); fd2.append('datei', f); fd2.append('project_id', pid); fd2.append('ordner', plan.ziel); fd2.append('name', name);
        try { const r = await fetch('api/bp/ablage', { method: 'POST', body: fd2, credentials: 'same-origin' }), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status);
          close(); const z = LS.get('zuletzt') || {}; z[pid] = plan.ziel; LS.set('zuletzt', z); TOAST('Abgelegt: ' + j.pfad);
          if (plan.quellen && plan.quellen.length) await zusammenfuehren(pid, plan);
          fertig({ pfad: j.pfad }); }
        catch (e) { b.disabled = false; TOAST(e.message, true); }
      });
      bg.addEventListener('click', (e) => { const n = e.target.closest('[data-bpan]'); if (!n) return; bg.querySelector('#bpaN').value = n.dataset.bpan;
        bg.querySelectorAll('[data-bpan]').forEach((x) => x.classList.toggle('on', x === n)); });
      const k = bg.querySelector('#bpaO');
      const knopf = () => { const it = items.find((x) => x.value === wahl); pickButton(k, { title: it ? zeig(it.value) : 'Ordner wählen …', sub: it ? it.group : '' }); };
      knopf();
      k.addEventListener('click', () => pickMenu(k, { items: [...items.map((x) => ({ ...x, title: x.tiefe ? ' '.repeat(Math.min(x.tiefe, 4)) + letzt(x.value) : x.title, sub: x.tiefe ? zeig(x.value) : x.sub, on: x.value === wahl })),
          { group: 'Sonst', title: '🌳 Im Ordnerbaum wählen …', sub: 'aufklappen wie im Explorer', value: ':baum:' }],
        search: 'Ordner suchen …', empty: 'Keine Ordner gefunden.', onPick: async (v) => { if (v === ':baum:') { const w = await baumWahl(V.ordner, wahl, V.basis); if (w == null) return; v = w; if (!items.some((x) => x.value === w)) items.push({ group: 'Aus dem Baum', title: letzt(w), sub: zeig(w), value: w }); } wahl = v; knopf(); } }));
      setTimeout(() => { const i = bg.querySelector('#bpaN'); if (i) { i.focus(); i.setSelectionRange(0, i.value.replace(/\.[^.]+$/, '').length); } }, 30);
    });
  }
  /* ---------- Ordnerbaum als letzte Möglichkeit: aufklappen wie im Explorer, Ordner anklicken, „Hierhin“ ---------- */
  function baumWahl(ordner, start, basis) {
    const K = {};   // Pfad → Kinder
    (ordner || []).forEach((o) => { const t = o.split('/'); for (let i = 1; i <= t.length; i++) { const p = t.slice(0, i - 1).join('/'), x = t.slice(0, i).join('/'); (K[p] = K[p] || new Set()).add(x); } });
    const auf = new Set(); if (start) { const t = start.split('/'); for (let i = 1; i < t.length; i++) auf.add(t.slice(0, i).join('/')); }
    let wahl = start || null;
    return new Promise((fertig) => {
      const bg = modalBox(`<h3>Ordner wählen</h3><p class="mu" style="margin:0 0 .5rem">${E(basis || 'Projektordner')}</p><div class="bpa-baum" id="bpaB"></div>
        <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Hierhin</button></div>`, (m, b, close) => {
        if (m === 'x') { close(); fertig(null); return; }
        if (m === 'ok') { if (!wahl) { TOAST('Bitte einen Ordner anklicken.', true); return; } close(); fertig(wahl); }
      });
      const zeichne = () => {
        const z = (p, t) => [...(K[p] || [])].sort((a, b) => a.localeCompare(b, 'de', { numeric: true })).map((x) => { const hat = K[x] && K[x].size, o = auf.has(x);
          return `<div class="bpa-bz${x === wahl ? ' on' : ''}" data-bpb="${E(x)}" style="padding-left:${t * 1.1 + .3}rem"><span class="bpa-bc" data-bpk="${E(x)}">${hat ? (o ? '▾' : '▸') : ''}</span>📁 ${E(x.split('/').pop())}</div>${hat && o ? z(x, t + 1) : ''}`; }).join('');
        bg.querySelector('#bpaB').innerHTML = z('', 0) || '<p class="mu">Keine Ordner gefunden.</p>';
      };
      bg.addEventListener('click', (e) => {
        const k = e.target.closest('[data-bpk]'); if (k && k.textContent) { const x = k.dataset.bpk; if (auf.has(x)) auf.delete(x); else auf.add(x); zeichne(); return; }
        const r = e.target.closest('[data-bpb]'); if (r) { wahl = r.dataset.bpb; if (K[wahl] && K[wahl].size) auf.add(wahl); zeichne(); }
      });
      bg.addEventListener('dblclick', (e) => { const r = e.target.closest('[data-bpb]'); if (r) { wahl = r.dataset.bpb; bg.querySelector('[data-m="ok"]').click(); } });
      zeichne();
      setTimeout(() => { const on = bg.querySelector('.bpa-bz.on'); if (on) on.scrollIntoView({ block: 'center' }); }, 30);
    });
  }
  /* ---------- Ähnliche Ordner (nur am PC): Ziel wählen – Vorschlag laut Projektvorlage –, Inhalt der anderen zusammenführen,
     dadurch leer gewordene Ordner auf Wunsch löschen, Entscheidung je Projekt merken. Server: bautagebuch/modules/ablage_aehnlich.py */
  const PC = () => matchMedia('(min-width: 761px) and (pointer: fine)').matches;
  const SITZUNG = {};   // beim Ablegen mehrerer Dateien nur einmal fragen
  async function aehnlichFragen(pid, wahl, dateiname) {
    if (!PC()) return { ziel: wahl };
    const holen = async (tiefe) => { try { const r = await fetch(`api/bp/ablage/aehnlich?project_id=${pid}&ordner=${encodeURIComponent(wahl)}&tiefe=${tiefe}`, { credentials: 'same-origin' }); return await r.json(); } catch { return { ok: false }; } };
    let tiefe = LS.get('tiefe') || 2, D = await holen(tiefe);
    if (!D.ok || !D.kandidaten) return { ziel: wahl };
    if (D.gemerkt) return { ziel: D.gemerkt };
    if (SITZUNG[pid + ':' + D.schluessel]) return { ziel: SITZUNG[pid + ':' + D.schluessel] };
    if (D.kandidaten.length < 2) return { ziel: wahl };
    return new Promise((fertig) => {
      let ziel = (D.kandidaten.find((x) => x.vorlage) || D.kandidaten.find((x) => x.pfad === wahl) || D.kandidaten[0]).pfad;
      const zeig = (o) => o.split('/').join(' / ');
      const html = () => { const andere = D.kandidaten.filter((x) => x.pfad !== ziel && x.vorhanden && x.dateien), n = andere.reduce((s, x) => s + x.dateien, 0);
        return `<h3>Wohin ablegen?</h3><p class="mu" style="margin:0 0 .6rem">${E(dateiname)} – es gibt ähnliche Ordner im Projekt.</p>
        <div style="display:flex;gap:.5rem;align-items:center;margin:0 0 .5rem;font-size:.85rem" class="mu">Suchtiefe <span class="bpa-seg">${[1, 2, 3].map((t) => `<button type="button" data-bpat="${t}" class="${t === D.tiefe ? 'on' : ''}">${t} Stufe${t > 1 ? 'n' : ''}</button>`).join('')}</span></div>
        <div class="bpa-ka">${D.kandidaten.map((x) => `<label class="bpa-k${x.pfad === ziel ? ' on' : ''}"><input type="radio" name="bpaz" value="${E(x.pfad)}"${x.pfad === ziel ? ' checked' : ''}>
          <span><b>${E(x.pfad.split('/').pop())}</b>${x.vorlage ? ' <i class="bpa-t v">Projektvorlage</i>' : ''}<small>${E(zeig(x.pfad))} · ${x.vorhanden ? `${x.dateien}${x.mehr ? '+' : ''} Datei${x.dateien === 1 ? '' : 'en'}${x.zuletzt ? ' · zuletzt ' + E(x.zuletzt) : ''}` : 'fehlt noch – wird angelegt'}</small></span></label>`).join('')}</div>
        ${n ? `<label class="bpa-ck"><input type="checkbox" id="bpaV"${D.testserver ? ' disabled' : ' checked'}> <span><b>Inhalt der anderen ${andere.length === 1 ? 'Ordners' : andere.length + ' Ordner'} hierher verschieben</b> (${n} Datei${n === 1 ? '' : 'en'})<br><small class="mu">${andere.map((x) => E(zeig(x.pfad))).join(' · ')} → ${E(zeig(ziel))} · gleiche Namen bekommen „(2)“, inhaltlich gleiche bleiben liegen · nichts wird gelöscht</small></span></label>
          <label class="bpa-ck" style="margin-left:1.6rem"><input type="checkbox" id="bpaL"${D.testserver ? ' disabled' : ''}> <span>Dadurch leer gewordene Ordner löschen<br><small class="mu">nur wenn wirklich nichts mehr darin ist</small></span></label>` : ''}
        ${D.testserver ? '<p class="mu" style="font-size:.85rem">Testserver: auf dem Dateiserver wird nichts verschoben.</p>' : ''}
        <label class="bpa-ck"><input type="checkbox" id="bpaM" checked> <span>Für dieses Projekt merken – nicht mehr fragen</span></label>
        <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Ablegen</button></div>`; };
      const bg = modalBox(html(), async (m, bg2, close) => {
        if (m === 'x') { close(); fertig(null); return; }
        if (m !== 'ok') return;
        const v = bg.querySelector('#bpaV'), l = bg.querySelector('#bpaL'), mk = bg.querySelector('#bpaM').checked;
        const quellen = v && v.checked ? D.kandidaten.filter((x) => x.pfad !== ziel && x.vorhanden && x.dateien).map((x) => x.pfad) : [];
        SITZUNG[pid + ':' + D.schluessel] = ziel;
        if (mk) fetch('api/bp/ablage/merken', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: pid, schluessel: D.schluessel, pfad: ziel }) }).catch(() => {});
        close(); fertig({ ziel, quellen, leere: !!(l && l.checked) });
      });
      bg.addEventListener('change', (e) => { if (e.target.name === 'bpaz') { ziel = e.target.value; neu(); } });
      bg.addEventListener('click', async (e) => { const t = e.target.closest('[data-bpat]'); if (!t) return; tiefe = +t.dataset.bpat; LS.set('tiefe', tiefe);
        const N = await holen(tiefe); if (N.ok && N.kandidaten) { D = N; if (!D.kandidaten.some((x) => x.pfad === ziel)) ziel = (D.kandidaten.find((x) => x.vorlage) || D.kandidaten[0]).pfad; neu(); } });
      const neu = () => { bg.querySelector('.modal').innerHTML = html(); };
    });
  }
  async function zusammenfuehren(pid, plan) {
    try {
      const r = await fetch('api/bp/ablage/zusammenfuehren', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: pid, ziel: plan.ziel, quellen: plan.quellen, leere_loeschen: plan.leere }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status);
      const t = `${j.verschoben} Datei${j.verschoben === 1 ? '' : 'en'} zusammengeführt${(j.gleich || []).length ? `, ${j.gleich.length} gleiche blieben liegen` : ''}${(j.geloescht || []).length ? `, ${j.geloescht.length} leere Ordner gelöscht` : ''}`;
      TOAST(t);
      if (j.schritte && j.schritte.length && window.rueckgaengig) rueckgaengig(t, async () => {
        const z = await fetch('api/bp/ablage/zurueck', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: pid, schritte: j.schritte }) }).then((x) => x.json()).catch(() => ({}));
        TOAST(z.error || `${z.zurueck || 0} Dateien zurück an ihren alten Platz.`, !!z.error); });
    } catch (e) { TOAST('Zusammenführen: ' + e.message, true); }
  }
  /* Ziehen und Loslassen selbst: head.js (dropUeberall) – Datei-Felder in der Nähe haben Vorrang, sonst ruft es BPHead.ablage.ablegen */
})();
