/* Spalten wählen und ordnen – gemeinsamer Baustein (/bp/spalten.js) für jede Tabelle.
   Rechte Maustaste auf den Spaltenkopf (oder ein Knopf mit data-spw="schluessel") öffnet das Spalten-Menü:
   Häkchen = sichtbar, ⋮⋮ ziehen = Reihenfolge, „Standard“ setzt zurück. Die erste Spalte bleibt immer vorn.
   Gemerkt je Benutzer im Browser (bp.sp.<schluessel>). Tabellen werden nach jedem Neuzeichnen selbst erkannt.

   Gilt für JEDE Tabelle mit Kopfzeile (<thead>, mindestens drei Spalten) – ohne Zutun der App. Der Schlüssel entsteht dann
   aus der App und den Spaltenköpfen. Eine Tabelle wird erst angefasst, wenn der Benutzer ihre Spalten geändert hat.
     <table data-sp="schluessel">   fester Schlüssel (nötig, wenn sich die Kopftexte ändern, z. B. durch Sortierpfeile)
     <table data-sp="-">            ausgenommen (Tabelle mit eigener Spaltenverwaltung)
     <table data-spaus="4,8">       diese Spalten sind im Standard ausgeblendet (Zählung ab 0)
     <th data-spname="…">           Name im Menü, wenn der Kopftext nicht passt
     <th data-spgrau>               diese Spalte kennt den dritten Zustand „grau“ (sichtbar, ausgegraut – z. B. Bieter, die nicht zählen):
                                    Klick im Menü wechselt an → grau → aus; Zellen bekommen .bp-sp-grau, stand() liefert grau
   Zeilen mit verbundenen Zellen (colspan) werden nicht umgeordnet, aber in der Breite angepasst; <col>-Elemente ziehen mit.
   Nach einer Änderung: Ereignis „bp-spalten“ am <table> (detail: {key}) – z. B. um gemerkte Spaltenbreiten zu verwerfen.
   bpSpalten.stand(schluessel, anzahl, ausStandard) → { aus: Set, ord: [...] } – für Apps, die vor dem Zeichnen rechnen (Tabellenbreite)
   bpSpalten.liste(el, schluessel, namen, ausStandard) – Kopf, der keine <table> ist (z. B. Plan aus <div>): gleiches Menü per rechter
     Maustaste auf el; die App zeichnet selbst nach stand() und hört auf „bp-spalten“ an el */
(() => {
  if (window.bpSpalten) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const roh = (k) => { try { return localStorage.getItem('bp.sp.' + k) || ''; } catch { return ''; } };
  const lies = (k) => { try { return JSON.parse(roh(k) || '{}') || {}; } catch { return {}; } };
  const merk = (k, v) => { try { localStorage.setItem('bp.sp.' + k, JSON.stringify(v)); } catch { /* egal */ } if (k.startsWith(AUTO)) autoDa = true; };
  const kopf = (t) => t.tHead && t.tHead.rows[0];
  const name = (th) => (th.dataset.spname || th.textContent || '').trim();
  const AUTO = 'auto.';
  let autoDa = false;   // hat der Benutzer in irgendeiner Tabelle ohne festen Schlüssel Spalten geändert?
  try { for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i).startsWith('bp.sp.' + AUTO)) { autoDa = true; break; } } catch { /* egal */ }
  /* Tabelle ohne data-sp: Schlüssel aus App und Spaltenköpfen ('' = nicht geeignet) */
  function autoKey(t) {
    if (t._spAuto !== undefined) return t._spAuto;
    const k = kopf(t); if (!k) return '';
    let key = '';
    if (k.cells.length >= 3 && [...k.cells].every((c) => c.colSpan === 1 && c.rowSpan === 1) && !t.closest('.bp-spm')) {
      const n = [...k.cells].map(name).join('|'); let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
      key = AUTO + (location.pathname.split('/').filter(Boolean)[0] || 'start') + '.' + (h >>> 0).toString(36);
    }
    return (t._spAuto = key);
  }
  const ausStd = (t) => (t.dataset.spaus || '').split(',').filter(Boolean).map(Number);
  function stand(key, N, std) {
    const z = lies(key), aus = new Set((z.aus || std || []).filter((n) => n > 0 && n < N)), grau = new Set((z.grau || []).filter((n) => n > 0 && n < N && !aus.has(n)));
    const ord = (z.ord || []).filter((n, i, a) => n > 0 && n < N && a.indexOf(n) === i); for (let n = 1; n < N; n++) if (!ord.includes(n)) ord.push(n);
    return { N, aus, grau, ord: [0, ...ord] };
  }
  const zustand = (t) => stand(t.dataset.sp, t._spN || (kopf(t) ? kopf(t).cells.length : 0), ausStd(t));
  /* Zeile einmal vorbereiten: jede Zelle merkt sich ihre Spalte. Leere Zellen über mehrere Spalten werden geteilt (dann lässt sich
     die Zeile ordnen). Rückgabe 1 = lässt sich ordnen · 2 = hat verbundene Zellen mit Inhalt (nur Breite anpassen) · -1 = passt nicht */
  function vorbereiten(tr, N) {
    let c = [...tr.cells];
    if (c.reduce((a, x) => a + (x.colSpan || 1), 0) !== N || c.some((x) => x.rowSpan > 1)) return -1;
    c.forEach((x) => { const k = x.colSpan; if (k > 1 && !x.textContent.trim() && !x.firstElementChild) { x.colSpan = 1; for (let i = 1; i < k; i++) x.after(document.createElement(x.tagName)); } });
    c = [...tr.cells]; let n = 0, verbunden = false;
    c.forEach((x) => { x.dataset.spn = n; if (x.colSpan > 1) { x._spC = x.colSpan; verbunden = true; } n += x.colSpan; });
    return verbunden ? 2 : 1;
  }
  /* Kinder (Zellen einer Zeile oder <col> einer Spaltengruppe) in die Reihenfolge bringen und Ausgeblendetes verstecken.
     Nur anfassen, was falsch steht: jedes Umhängen ist eine Änderung am Dokument – stünde die Zelle gerade unter der gedrückten
     Maustaste, ginge der Klick verloren (und der Beobachter unten liefe im Kreis) */
  function ordnen(el, kinder, ord, aus, grau) {
    const c = {}; kinder.forEach((x) => { c[x.dataset.spn] = x; });
    let i = 0; ord.forEach((n) => { const x = c[n]; if (!x) return; if (el.children[i] !== x) el.insertBefore(x, el.children[i] || null); i++; if (x.classList.contains('bp-sp-aus') !== aus.has(n)) x.classList.toggle('bp-sp-aus', aus.has(n));
      const gr = !!(grau && grau.has(n)); if (x.classList.contains('bp-sp-grau') !== gr) x.classList.toggle('bp-sp-grau', gr); });
  }
  function anwenden(t) {
    if (t._spListe) return;   // eigener Kopf: die App ordnet selbst
    const k = kopf(t); if (!k || t.dataset.sp === '-') return;
    if (!t._spN) { t._spN = k.cells.length; t._spNamen = [...k.cells].map(name); t._spGr = new Set([...k.cells].map((c, n) => (c.hasAttribute('data-spgrau') ? n : -1)).filter((n) => n > 0)); }
    const { N, aus, ord } = zustand(t), grau = new Set([...zustand(t).grau].filter((n) => t._spGr.has(n)));
    [...t.rows].forEach((tr) => {
      if (!tr._sp) tr._sp = vorbereiten(tr, N);   // -1 nicht bei jedem Durchlauf neu versuchen
      if (tr._sp === 1) ordnen(tr, [...tr.cells], ord, aus, grau);
      else if (tr._sp === 2) [...tr.cells].forEach((x) => {   // verbundene Zellen: so breit wie ihre sichtbaren Spalten
        const a = +x.dataset.spn, b = a + (x._spC || 1); let v = 0; for (let n = a; n < b; n++) if (!aus.has(n)) v++;
        if (x.classList.contains('bp-sp-aus') !== !v) x.classList.toggle('bp-sp-aus', !v);
        if (v && x.colSpan !== v) x.colSpan = v;
      });
    });
    const g = t.querySelector(':scope > colgroup');   // Spaltenbreiten (<col>) ziehen mit
    if (g && g._sp !== -1) {
      if (!g._sp) { const cs = [...g.children]; if (cs.length === N && cs.every((x) => (x.span || 1) === 1)) { cs.forEach((x, n) => { x.dataset.spn = n; }); g._sp = 1; } else g._sp = -1; }
      if (g._sp === 1) ordnen(g, [...g.children], ord, aus);
    }
  }
  function setzen(t, z) { merk(t.dataset.sp, { aus: [...z.aus], ord: z.ord.slice(1), ...(z.grau && z.grau.size ? { grau: [...z.grau] } : {}) }); anwenden(t); t.dispatchEvent(new CustomEvent('bp-spalten', { bubbles: true, detail: { key: t.dataset.sp } })); }
  /* die Tabelle zu einem Schlüssel suchen – nach einer Änderung zeichnen manche Apps die Tabelle neu (neues Element) */
  function finde(key) {
    let t = document.querySelector(`table[data-sp="${CSS.escape(key)}"],[data-spliste][data-sp="${CSS.escape(key)}"]`);
    if (!t && key.startsWith(AUTO)) { t = [...document.querySelectorAll('table:not([data-sp])')].find((x) => autoKey(x) === key) || null; if (t) t.dataset.sp = key; }
    return t;
  }
  function menue(t0, x, y) {
    const key = t0.dataset.sp;
    const tab = () => { if (!t0.isConnected) { const n = finde(key); if (n) { t0 = n; anwenden(n); } } return t0; };
    document.querySelectorAll('.bp-spm').forEach((m) => m.remove());
    const m = document.createElement('div'); m.className = 'bp-spm'; m.setAttribute('role', 'menu');
    const zeichne = () => { const z = zustand(tab()); m.innerHTML = `<div class="bp-spm-k"><b>Spalten</b><button type="button" class="bp-spm-x" data-spx title="Schließen">✕</button></div>${z.ord.slice(1).map((n) => (tab()._spNamen[n] ? `<label class="bp-spm-z" draggable="true" data-spn="${n}"><span class="g" title="ziehen: Reihenfolge">⋮⋮</span>${tab()._spGr && tab()._spGr.has(n) ? `<input type="checkbox" class="bp-chk-alt" data-spg="${n}"${z.aus.has(n) || z.grau.has(n) ? '' : ' checked'}${z.grau.has(n) ? ' data-grau' : ''} title="an → grau → aus"><span${z.grau.has(n) ? ' class="bp-spm-gr"' : ''}>${esc(tab()._spNamen[n])}</span><small class="bp-spm-hz">${z.grau.has(n) ? 'grau' : z.aus.has(n) ? 'aus' : ''}</small>` : `<input type="checkbox" class="bp-chk-alt" data-spc="${n}"${z.aus.has(n) ? '' : ' checked'}><span>${esc(tab()._spNamen[n])}</span>`}</label>` : '')).join('')}<div class="bp-spm-f"><button type="button" data-spstd>Standard</button></div>`; m.querySelectorAll('[data-grau]').forEach((x) => { x.indeterminate = true; }); };
    zeichne(); document.body.appendChild(m);
    const b = m.getBoundingClientRect(); m.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, x)) + 'px'; m.style.top = Math.max(8, Math.min(innerHeight - b.height - 8, y)) + 'px';
    const zu = () => { m.remove(); document.removeEventListener('pointerdown', aussen, true); document.removeEventListener('keydown', taste); };
    const aussen = (e) => { if (!m.contains(e.target)) zu(); }, taste = (e) => { if (e.key === 'Escape') zu(); };
    setTimeout(() => { document.addEventListener('pointerdown', aussen, true); document.addEventListener('keydown', taste); }, 0);
    m.addEventListener('click', (e) => { if (e.target.closest('[data-spx]')) zu(); if (e.target.closest('[data-spstd]')) { try { localStorage.removeItem('bp.sp.' + key); } catch { /* egal */ } anwenden(tab()); tab().dispatchEvent(new CustomEvent('bp-spalten', { bubbles: true, detail: { key } })); zeichne(); } });
    m.addEventListener('click', (e) => {   // drei Zustände: an → grau → aus → an
      const g = e.target.closest('[data-spg]') || (e.target.closest('.bp-spm-z') && e.target.closest('.bp-spm-z').querySelector('[data-spg]')); if (!g || e.target.closest('.g')) return;
      e.preventDefault(); const z = zustand(tab()), n = +g.dataset.spg;
      if (z.aus.has(n)) z.aus.delete(n); else if (z.grau.has(n)) { z.grau.delete(n); z.aus.add(n); } else z.grau.add(n);
      setzen(tab(), z); zeichne(); });
    m.addEventListener('change', (e) => { const c = e.target.closest('[data-spc]'); if (!c) return; const z = zustand(tab()), n = +c.dataset.spc; if (c.checked) z.aus.delete(n); else z.aus.add(n); setzen(tab(), z); });
    let zn = null;
    m.addEventListener('dragstart', (e) => { const r = e.target.closest('[data-spn]'); if (!r) return; zn = +r.dataset.spn; r.classList.add('zieh'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'sp' + zn); } catch { /* egal */ } });
    m.addEventListener('dragover', (e) => { const r = e.target.closest('[data-spn]'); if (!r || zn == null) return; e.preventDefault(); const q = r.getBoundingClientRect(), un = e.clientY > q.top + q.height / 2; m.querySelectorAll('[data-spn]').forEach((o) => o.classList.remove('vor', 'nach')); r.classList.add(un ? 'nach' : 'vor'); });
    m.addEventListener('drop', (e) => { const r = e.target.closest('[data-spn]'); if (!r || zn == null) return; e.preventDefault(); const q = r.getBoundingClientRect(), un = e.clientY > q.top + q.height / 2, ziel = +r.dataset.spn, z = zustand(tab());
      if (ziel !== zn) { const o = z.ord.slice(1).filter((n) => n !== zn); o.splice(o.indexOf(ziel) + (un ? 1 : 0), 0, zn); z.ord = [0, ...o]; setzen(tab(), z); } zn = null; zeichne(); });
    m.addEventListener('dragend', () => { zn = null; m.querySelectorAll('[data-spn]').forEach((o) => o.classList.remove('vor', 'nach', 'zieh')); });
  }
  /* Tabelle für das Menü bereit machen: Schlüssel vergeben (falls keiner da ist) und einmal anwenden. false = nicht geeignet */
  function bereit(t) {
    if (!t.dataset.sp) { const k = autoKey(t); if (!k) return false; t.dataset.sp = k; }
    if (t.dataset.sp === '-') return false;
    anwenden(t); return !!t._spN && t._spNamen.slice(1).some(Boolean);
  }
  function liste(el, key, namen, std) {
    el.dataset.sp = key; el.dataset.spliste = ''; el._spListe = true; el._spN = namen.length; el._spNamen = namen.slice();
    if (std && std.length) el.dataset.spaus = std.join(','); else delete el.dataset.spaus;
  }
  addEventListener('contextmenu', (e) => {   // rechte Maustaste auf einen Spaltenkopf (wie in Excel und im Explorer)
    const li = e.target.closest && e.target.closest('[data-spliste]');
    if (li && li._spListe && !e.shiftKey && !e.target.closest('input,textarea,select,[contenteditable]')) { e.preventDefault(); e.stopImmediatePropagation(); menue(li, e.clientX, e.clientY); return; }
    const th = e.target.closest && e.target.closest('table thead th'); if (!th || e.shiftKey || th.ownerDocument !== document) return;
    if (e.target.closest('input,textarea,select,[contenteditable]') && !th.hasAttribute('data-spgrau')) return;   // im Filterfeld: Einfügen, Kopieren (Kopf mit „grau“: Menü auch über dem Namensfeld)
    const t = th.closest('table'); if (!bereit(t)) return;
    e.preventDefault(); e.stopImmediatePropagation(); menue(t, e.clientX, e.clientY);
  }, true);
  document.addEventListener('click', (e) => {
    const k = e.target.closest && e.target.closest('[data-spw]'); if (!k) return;
    const t = document.querySelector(`table[data-sp="${CSS.escape(k.dataset.spw)}"]`); if (!t || !bereit(t)) return;
    e.stopPropagation(); const r = k.getBoundingClientRect(); menue(t, r.left, r.bottom + 4);
  });
  /* neu gezeichnete Tabellen selbst erkennen (auch neue Zeilen in einer schon geordneten Tabelle) */
  let warte = 0;
  const alle = () => {
    warte = 0;
    if (autoDa) document.querySelectorAll('table:not([data-sp])').forEach((t) => { if (t._spAuto === undefined && kopf(t)) { const k = autoKey(t); if (k && roh(k)) t.dataset.sp = k; } });
    document.querySelectorAll('table[data-sp]').forEach((t) => { if (t.dataset.sp !== '-' && (!t._spN || [...t.rows].some((tr) => !tr._sp && tr.cells.length > 1))) anwenden(t); });
  };
  try { new MutationObserver(() => { if (!warte) warte = requestAnimationFrame(alle); }).observe(document.documentElement, { childList: true, subtree: true }); } catch { /* egal */ }
  window.bpSpalten = { anwenden, menue, zustand, stand, liste };
})();
