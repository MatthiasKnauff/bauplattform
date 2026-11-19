'use strict';
/* Projekt wählen (GO 19.11.2026, Mock „Projekt wählen – neu“: A1 B1 C1 D1 E1) – Baustein, von head.js erst beim Öffnen geladen.
   bpProjektWahl(H, opt, x)  opt wie bisher: { aktuell, onPick(id, projekt), q, oben: [{titel, sub, value}], aktuellWert }
                             x: { KX, esc, nachWahl() } aus head.js (Abfrage, Escaping, Reaktion der App)
   A1 ★ Favoriten · Zuletzt benutzt (5) · übrige nach Kürzel; vor Ort (Standort erlaubt) das nächstgelegene ganz oben „📍 hier“
   B1 je Zeile Stand (Bauphase, sonst Honorar) und Zähler rot = fällig, grau = offen – eine Abfrage beim Öffnen (/api/bp/projekte/stand)
   C1 am Rechner rechts die Vorschau der gewählten Zeile; D1 Schalter Meine · Alle · Archiv, die Suche findet immer in allen aktiven
   Tastatur: ↑↓ wählen, Enter öffnen, F2 bearbeiten. Kern: bpcore/projektwahl.py; Strg+K: bp/suche.js (Gruppe „Projekte“). */
(function () {
  const KUERZEL = /^([A-Za-z]{1,4}\d[\d.]*)\s*/;
  const teile = (p) => { const m = KUERZEL.exec(p.name || ''), n = m ? p.name.slice(m[0].length) : p.name || '', ort = p.city ? n.replace(new RegExp(',\\s*' + p.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '') : n; return [m ? m[1] : '', ort]; };   // Ort steht klein dahinter – nicht doppelt
  const natur = (a, b) => teile(a)[0].localeCompare(teile(b)[0], 'de', { numeric: true }) || String(a.name).localeCompare(String(b.name), 'de');
  window.bpProjektWahl = async function (H, opt, x) {
    const { KX, esc } = x;
    let P; try { P = await KX('api/bp/projekte'); } catch (e) { (window.bpHinweis || window.alert)(e.message); return; }
    const akt = opt.aktuell != null ? +opt.aktuell : H.projektId();
    let q = opt.q || '', filter = P.some((p) => p.mein && !p.archived) ? 'meine' : 'alle', hier = null, ST = {}, sel = 0, ordner = [], ordT = 0;
    try { hier = JSON.parse(sessionStorage.getItem('bpHier') || 'null'); } catch { /* egal */ }
    const breit = () => window.innerWidth > 760;
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg bph-pw-bg';
    bg.innerHTML = `<div class="bph-dlg bph-pw bph-pw2" role="dialog" aria-label="Projekt wählen"><div class="bph-pwm"><div class="bph-pwh"><input type="search" placeholder="Projekt suchen – Kürzel, Name oder Adresse" autocomplete="off" data-pq>
      ${navigator.geolocation && !breit() ? '<button type="button" class="bph-btn" data-pstand title="Nächstgelegenes Projekt">📍</button>' : ''}<button type="button" class="bph-x" data-px aria-label="Schließen">×</button></div>
      <div class="bph-pwfi" role="group" aria-label="Filter">${[['meine', 'Meine'], ['alle', 'Alle'], ['archiv', 'Archiv']].map(([k, t]) => `<button type="button" data-pfil="${k}">${t}</button>`).join('')}</div>
      <div class="bph-pwl" data-pl role="listbox"></div>
      <div class="bph-pwf2"><small class="bph-mu">↑↓ wählen · Enter öffnen · F2 bearbeiten</small><button type="button" class="bph-btn pri" data-pneu>＋ Neues Projekt</button></div></div>
      <div class="bph-pwv" data-pv hidden></div></div>`;
    document.body.appendChild(bg);
    const L = bg.querySelector('[data-pl]'), V = bg.querySelector('[data-pv]');
    const close = () => { bg.remove(); document.removeEventListener('keydown', k1); }, k1 = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', k1);
    const rad = (v) => v * Math.PI / 180, dist = (p) => (hier && p.lat != null && p.lon != null ? 12742000 * Math.asin(Math.sqrt(Math.sin(rad(p.lat - hier.lat) / 2) ** 2 + Math.cos(rad(hier.lat)) * Math.cos(rad(p.lat)) * Math.sin(rad(p.lon - hier.lon) / 2) ** 2)) : null);
    const adr = (p) => [p.street, [p.zip, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const passt = (p) => { const t = [p.name, p.street, p.zip, p.city, p.client].join(' ').toLowerCase(); return q.trim().toLowerCase().split(/\s+/).every((w) => t.includes(w)); };
    let REIHE = [];   // sichtbare Projekte in Reihenfolge (Tastatur)
    const zeile = (p, i, hierM) => { const [k, n] = teile(p), s = ST[p.id] || {};
      return `<div class="bph-pz${i === sel ? ' sel' : ''}${p.id === akt ? ' on' : ''}" role="option" aria-selected="${i === sel}" data-pid="${p.id}" data-pi="${i}">
        <button type="button" class="bph-pst${p.fav ? ' an' : ''}" data-pfav="${p.id}" title="${p.fav ? 'Favorit entfernen' : 'Als Favorit oben anheften'}" aria-label="Favorit">${p.fav ? '★' : '☆'}</button>
        <b class="bph-pk">${esc(k)}</b><span class="bph-pn">${esc(n || p.name)}${p.city ? ` <small>${esc(p.city)}</small>` : ''}${!p.mein && !p.archived && filter === 'meine' ? ' <small title="Projekt anderer Bauleiter:innen">👥</small>' : ''}</span>
        <span class="bph-pr">${hierM ? '<em class="bph-ph">📍 hier</em>' : ''}${s.stand ? `<em class="bph-pph">${esc(s.stand)}</em>` : ''}${s.rot ? `<i class="r" title="fällig">${s.rot}</i>` : ''}${s.grau ? `<i class="g" title="offen">${s.grau}</i>` : ''}<button type="button" class="bph-pe" data-pedit="${p.id}" title="Bearbeiten (F2)" aria-label="Bearbeiten">✎</button></span></div>`; };
    function draw() {
      bg.querySelectorAll('[data-pfil]').forEach((b) => b.classList.toggle('on', b.dataset.pfil === filter));
      const basis = P.filter((p) => (filter === 'archiv' ? p.archived : !p.archived));
      let h = '', i = 0; REIHE = [];
      const gruppe = (titel, L_, hierM) => { if (!L_.length) return; h += `<div class="bph-pws">${titel}</div>` + L_.map((p) => { REIHE.push(p); return zeile(p, i++, hierM); }).join(''); };
      const OB = (opt.oben || []).filter((o) => !q.trim() || (o.titel + ' ' + (o.sub || '')).toLowerCase().includes(q.trim().toLowerCase()));
      if (OB.length) h += OB.map((o) => `<button type="button" class="bph-pi${String(opt.aktuellWert || '') === String(o.value) ? ' on' : ''}" data-poben="${esc(String(o.value))}"><span><b>${esc(o.titel)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span></button>`).join('');
      if (q.trim()) {   // D1: die Suche findet in allen aktiven (Archiv: im Archiv) – Favoriten und Zuletzt zuerst
        const T = basis.filter(passt).sort((a, b) => (b.fav - a.fav) || ((a.zuletzt || 99) - (b.zuletzt || 99)) || natur(a, b));
        gruppe(T.length ? 'Treffer' : '', T);
        if (!T.length) h += `<div class="bph-pwe">Kein Projekt passt zu „${esc(q.trim())}“.</div>`;
      } else {
        const M = filter === 'meine' ? basis.filter((p) => p.mein || p.fav) : basis, ns = new Set();
        const nah = filter !== 'archiv' && hier ? basis.filter((p) => dist(p) != null && dist(p) < 2000).sort((a, b) => dist(a) - dist(b)).slice(0, 1) : [];
        nah.forEach((p) => ns.add(p.id)); gruppe('In der Nähe', nah, true);
        const F = M.filter((p) => p.fav && !ns.has(p.id)).sort(natur); F.forEach((p) => ns.add(p.id)); gruppe('★ Favoriten', F);
        const Z = basis.filter((p) => p.zuletzt && !ns.has(p.id)).sort((a, b) => a.zuletzt - b.zuletzt); Z.forEach((p) => ns.add(p.id)); gruppe('Zuletzt benutzt', Z);
        gruppe(filter === 'archiv' ? 'Archiv' : filter === 'meine' ? 'Meine Projekte' : 'Alle Projekte', M.filter((p) => !ns.has(p.id)).sort(natur));
        if (!REIHE.length) h += `<div class="bph-pwe">${filter === 'meine' ? 'Du bist bei keinem Projekt als Bauleiter:in eingetragen – „Alle“ zeigt alle.' : 'Keine Projekte.'}</div>`;
      }
      if (q.trim().length >= 2 && ordner.length) h += '<div class="bph-pws">Ordner auf dem Server – antippen legt das Projekt an</div>' + ordner.map((n) => `<button type="button" class="bph-pi" data-pordner="${esc(n)}"><span><b>＋ ${esc(n)}</b></span></button>`).join('');
      L.innerHTML = h; sel = Math.min(sel, Math.max(0, REIHE.length - 1)); markieren(false);
    }
    function vorschau() {   // C1: nur am Rechner
      const p = REIHE[sel]; V.hidden = !breit() || !p; if (V.hidden) return;
      const s = ST[p.id] || {}, kt = p.lat != null && p.lon != null ? encodeURIComponent(p.lat + ',' + p.lon) : '';
      V.innerHTML = `${kt ? `<iframe class="bph-pwk" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte" src="https://www.google.com/maps?q=${kt}&hl=de&z=14&output=embed"></iframe>` : '<div class="bph-pwk bph-pwk0">keine Lage hinterlegt</div>'}
        <b>${esc(p.name)}</b>${adr(p) ? `<small class="bph-mu">${esc(adr(p))}</small>` : ''}
        <dl><dt>Bauherr:in</dt><dd>${esc(p.client || '–')}</dd><dt>Bauleitung</dt><dd>${esc(p.bauleiter || '–')}</dd><dt>Stand</dt><dd>${esc(s.stand || '–')}</dd>
        <dt>Offen</dt><dd>${s.rot || s.grau ? [s.rot ? s.rot + ' fällig' : '', s.grau ? s.grau + ' offen' : ''].filter(Boolean).join(' · ') : 'nichts'}</dd></dl>
        <div class="bph-row"><button type="button" class="bph-btn" data-pedit="${p.id}">✎ Bearbeiten</button><button type="button" class="bph-btn" data-pordn="${p.id}">📁 Ordner</button><button type="button" class="bph-btn" data-pfav="${p.id}">${p.fav ? '★' : '☆'}</button></div>`;
    }
    function markieren(rollen) {
      L.querySelectorAll('[data-pi]').forEach((z) => { const an = +z.dataset.pi === sel; z.classList.toggle('sel', an); z.setAttribute('aria-selected', an); if (an && rollen) z.scrollIntoView({ block: 'nearest' }); });
      vorschau();
    }
    const ordnerSuchen = () => { clearTimeout(ordT); const qq = q.trim(); if (qq.length < 2) { ordner = []; return; }
      ordT = setTimeout(async () => { try { const r = await KX((H.app === 'bautagebuch' ? 'api/' : 'api/bp/bt/') + 'store/folders?q=' + encodeURIComponent(qq)); if (qq === q.trim()) { const vorh = new Set(P.map((p) => p.name)); ordner = (Array.isArray(r) ? r : []).filter((n) => !vorh.has(n)).slice(0, 8); draw(); } } catch { /* ohne Ablage */ } }, 300); };
    async function waehlen(id) { const p = P.find((v) => v.id === id); close(); if (opt.onPick) return opt.onPick(id, p); await H.projektSetzen(id); x.nachWahl(id, p); }
    const neuFertig = async (id) => { if (opt.onPick) return opt.onPick(id, null); try { sessionStorage.setItem('bpNeuProjekt', String(id)); } catch { /* egal */ } await H.projektSetzen(id); x.nachWahl(id, null); };   // danach Projektdaten Schritt für Schritt (head.js)
    const bearbeiten = (id) => { close(); H.projektBearbeiten(id, { onSaved: (i) => (opt.onPick ? opt.onPick(i, null) : null) }); };
    async function favUm(id) { const p = P.find((v) => v.id === id); if (!p) return; p.fav = !p.fav; draw();
      try { await KX(`api/bp/projekte/${id}/fav`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ an: p.fav }) }); } catch (e) { p.fav = !p.fav; draw(); (window.toast || window.bpHinweis)(e.message, true); } }
    const standort = () => new Promise((ok, nein) => (navigator.geolocation ? navigator.geolocation.getCurrentPosition((g) => { hier = { lat: g.coords.latitude, lon: g.coords.longitude }; try { sessionStorage.setItem('bpHier', JSON.stringify(hier)); } catch { /* egal */ } ok(hier); }, nein, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }) : nein(new Error('kein GPS'))));
    bg.addEventListener('input', (e) => { if (e.target.matches('[data-pq]')) { q = e.target.value; sel = 0; draw(); ordnerSuchen(); } });
    bg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (REIHE.length) { sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + REIHE.length) % REIHE.length; markieren(true); } return; }
      if (e.key === 'Enter' && e.target.matches('[data-pq], [data-pi]')) { e.preventDefault(); if (REIHE[sel]) waehlen(REIHE[sel].id); return; }
      if (e.key === 'F2' && REIHE[sel]) { e.preventDefault(); bearbeiten(REIHE[sel].id); }
    });
    L.addEventListener('mousemove', (e) => { const z = e.target.closest('[data-pi]'); if (z && +z.dataset.pi !== sel) { sel = +z.dataset.pi; markieren(false); } });
    bg.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-px]')) return close();
      const fv = t.closest('[data-pfav]'); if (fv) return favUm(+fv.dataset.pfav);
      const ed = t.closest('[data-pedit]'); if (ed) return bearbeiten(+ed.dataset.pedit);
      const od = t.closest('[data-pordn]'); if (od) { const a = ((H.conf || {}).apps || []).find((v) => v.key === 'plaene' && v.allowed); close(); await H.projektSetzen(+od.dataset.pordn); if (a) location.href = window.bpAppUrl(a) + '/#alle'; return; }
      const fi = t.closest('[data-pfil]'); if (fi) { filter = fi.dataset.pfil; sel = 0; draw(); return; }
      const pi = t.closest('[data-pid]'); if (pi) return waehlen(+pi.dataset.pid);
      const po = t.closest('[data-poben]'); if (po) { close(); if (opt.onPick) opt.onPick(po.dataset.poben, null); return; }
      const on = t.closest('[data-pordner]'); if (on) { close(); return H.projektBearbeiten(null, { name: on.dataset.pordner, onSaved: (id) => neuFertig(id) }); }
      if (t.closest('[data-pstand]')) { try { await standort(); } catch { (window.bpHinweis || window.alert)('Der Standort ist nicht verfügbar – bitte im Browser erlauben.'); return; } sel = 0; draw(); return; }
      if (t.closest('[data-pneu]')) { close(); return H.projektBearbeiten(null, { onSaved: (id) => neuFertig(id) }); }
    });
    draw(); { const qi = bg.querySelector('[data-pq]'); qi.value = q; qi.focus(); }
    KX('api/bp/projekte/stand').then((s) => { ST = s || {}; draw(); }).catch(() => {});   // B1: Zähler und Stand nachladen
    if (!hier && navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then((r) => { if (r.state === 'granted') standort().then(draw).catch(() => {}); }).catch(() => {});
  };
})();
