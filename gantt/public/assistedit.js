'use strict';
/* =====================================================================
   Assistent einrichten
   - Gebäudetypen: Name, Symbol, Vorgaben, Standard-Bauweisen, empfohlene und
     optionale Leistungen, eigene Bezeichnungen und Richtdauern, eigene Typen
   - Bauweisen: Bezeichnungen, welche Leistungen eine Wahl setzt, Optionen
     ausblenden, eigene Ausführungen
   - Vorlagen: Stand der Einrichtung speichern, laden, exportieren
   Gespeichert werden nur die Abweichungen vom eingebauten Katalog (api/assistcfg);
   sie gelten für alle Benutzer und für neue Planungen.
   ===================================================================== */
(function () {
  const C = window.CATALOG; if (!C) return;
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const STD = { profiles: clone(C.profiles), choices: clone(C.choices) };
  const H = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = (m, err) => (typeof toast === 'function' ? toast(m, err) : alert(m));
  const J = async (r) => { const t = await r.text(); let d = {}; try { d = t ? JSON.parse(t) : {}; } catch (e) { d = { error: t.slice(0, 200) }; } if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status); return d; };
  const api = (u, m = 'GET', b) => fetch(u, { method: m, headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }).then(J);
  const empty = () => ({ v: 1, profiles: {}, own: [], choices: {} });
  const norm = (c) => ({ ...empty(), ...(c && typeof c === 'object' ? c : {}), profiles: { ...((c && c.profiles) || {}) }, own: [...((c && c.own) || [])], choices: { ...((c && c.choices) || {}) } });
  let CFG = empty();

  /* ---------- Einrichtung auf den Katalog anwenden ---------- */
  function mergeProf(o, d) {
    for (const k of ['n', 'ic', 'desc', 'area', 'units', 'floors', 'dg', 'takt', 'naming', 'hidden', 'ord']) if (d[k] !== undefined) o[k] = d[k];
    if (d.choice) o.choice = { ...(o.choice || {}), ...d.choice };
    if (d.rec) o.rec = d.rec.slice();
    if (d.opt) o.opt = d.opt.slice();
    if (d.ovr) { o.ovr = { ...(o.ovr || {}) }; for (const [id, e] of Object.entries(d.ovr)) o.ovr[id] = { ...(o.ovr[id] || {}), ...e }; }
    if (d.phase) o.phase = { ...(o.phase || {}), ...d.phase };   // Leistung in eine andere Gruppe (Phase)
    if (d.order) o.order = d.order.slice();                     // Reihenfolge der Leistungen
    return o;
  }
  function profilesOf(cfg) {
    const list = STD.profiles.map((p, i) => { const o = mergeProf(clone(p), cfg.profiles[p.k] || {}); o._i = o.ord ?? i; return o; });
    for (const x of cfg.own) {
      const base = list.find((p) => p.k === x.base); if (!base) continue;
      const o = mergeProf({ ...clone(base), hidden: false, ord: undefined }, x); o.k = x.k; o.base = x.base; o.own = 1; o._i = x.ord ?? 900 + list.length; list.push(o);
    }
    list.sort((a, b) => (a.k === 'frei') - (b.k === 'frei') || a._i - b._i); list.forEach((p) => delete p._i);
    return list;
  }
  function apply(cfg) {
    CFG = norm(cfg);
    C.profiles.splice(0, C.profiles.length, ...profilesOf(CFG));
    for (const g of C.choices) {
      const s = STD.choices.find((x) => x.k === g.k); if (!s) continue;
      g.n = s.n; g.types = s.types.slice(); if (s.onTypes) g.onTypes = s.onTypes.slice(); else delete g.onTypes;
      g.opts.splice(0, g.opts.length, ...clone(s.opts));
      const d = CFG.choices[g.k] || {};
      if (d.n) g.n = d.n;
      for (const o of g.opts) { const e = (d.opts || {})[o.k]; if (!e) continue; if (e.n) o.n = e.n; if (e.on) o.on = e.on.slice(); if (e.hidden) o.hidden = true; }
      for (const e of d.own || []) g.opts.push({ k: e.k, n: e.n, on: (e.on || []).slice(), own: 1 });
      for (const x of CFG.own) { if (g.types.includes(x.base)) g.types.push(x.k); if (g.onTypes && g.onTypes.includes(x.base)) g.onTypes.push(x.k); }
    }
    if (window.AssistCore) window.AssistCore.notifySoon();
  }
  async function load() { try { apply(await api('api/assistcfg')); } catch (e) { /* ohne Einrichtung: eingebauter Katalog */ } }

  /* ---------- Hilfen für den Dialog ---------- */
  const PH = () => C.phases;
  const phName = (k) => (C.phases.find((p) => p.k === k) || {}).n || k;
  const lib = () => (Array.isArray(window.LIBRARY) ? window.LIBRARY : []);
  const allItems = () => [...C.items.map((i) => ({ id: i.id, n: i.n, ph: i.ph, d: i.d, ms: i.ms, lib: 0 })), ...lib().map((x) => ({ id: x.id, n: x.n, ph: x.ph, d: x.d, lib: 1 }))];
  const itemName = (id) => { const i = allItems().find((x) => x.id === id); return i ? i.n : id; };
  const uid = (p) => p + Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/g, 'x');
  const DG = [['kalt', 'Dachraum nicht ausgebaut / Flachdach'], ['aus', 'Dachgeschoss ausgebaut'], ['staffel', 'Staffelgeschoss']];
  const NAMING = [['whg', 'Wohnung 1, 2 …'], ['gesch', 'Wohnung EG, 1.OG …'], ['ge', 'EG, 1.OG …'], ['ba', 'Bauabschnitt 1, 2 …'], ['haus', 'Haus 1, 2 …']];
  const visGroups = (p) => C.choices.filter((g) => (STD.choices.find((s) => s.k === g.k) || g).types.concat(CFG_D.own.filter((o) => o.base && (STD.choices.find((s) => s.k === g.k) || g).types.includes(o.base)).map((o) => o.k)).includes(p.k));
  // Leistungen, die von einer Bauweise gesetzt werden (Empfehlung steuert dann die Bauweise)
  const byChoice = (p) => { const m = {}; for (const g of visGroups(p)) { const s = STD.choices.find((x) => x.k === g.k) || g; const types = s.onTypes || null; if (types && !types.includes(p.base || p.k)) continue; for (const o of draftOpts(g)) for (const id of o.on || []) (m[id] ||= []).push(g.n); } return m; };

  let D = null, CFG_D = empty(), tab = 'typen', selP = null, selG = null, q = '', flt = 'alle', dirty = false, VORL = null, bg = null;
  const draftProfiles = () => profilesOf(CFG_D);
  function draftOpts(g) {   // Optionen einer Bauweisen-Gruppe im Entwurf
    const s = STD.choices.find((x) => x.k === g.k) || g, d = CFG_D.choices[g.k] || {};
    return [...s.opts.map((o) => { const e = (d.opts || {})[o.k] || {}; return { k: o.k, n: e.n || o.n, std: o.n, on: e.on || o.on || [], hidden: !!e.hidden, mod: !!e.on }; }), ...(d.own || []).map((o) => ({ ...o, own: 1 }))];
  }
  let UNDO = [], REDO = [], SNAP = null;   // Rückgängig im Dialog: Stand vor jeder Änderung
  const snap = () => { SNAP = JSON.stringify(CFG_D); };
  const touch = () => {
    if (SNAP && SNAP !== JSON.stringify(CFG_D) && UNDO[UNDO.length - 1] !== SNAP) { UNDO.push(SNAP); if (UNDO.length > 100) UNDO.shift(); REDO = []; }
    SNAP = null; dirty = true; const f = bg && bg.querySelector('.ae-dirty'); if (f) f.hidden = false; undoBtns();
  };
  const undoBtns = () => { if (!bg) return; const u = bg.querySelector('[data-ae="undo"]'), r = bg.querySelector('[data-ae="redo"]'); if (u) u.disabled = !UNDO.length; if (r) r.disabled = !REDO.length; };
  function undo(redo) {
    const from = redo ? REDO : UNDO, to = redo ? UNDO : REDO; if (!from.length) return;
    to.push(JSON.stringify(CFG_D)); CFG_D = norm(JSON.parse(from.pop())); dirty = true; render(); undoBtns();
  }
  const profD = (k) => { const own = CFG_D.own.find((o) => o.k === k); return own || (CFG_D.profiles[k] ||= {}); };
  const grpD = (k) => (CFG_D.choices[k] ||= {});

  /* ---------- Dialog ---------- */
  function open() {
    if (bg) { bg.querySelector('.modal').focus(); return; }
    CFG_D = norm(clone(CFG)); dirty = false; UNDO = []; REDO = []; tab = 'typen'; selP = selP || (C.profiles[0] || {}).k; selG = selG || (C.choices[0] || {}).k; VORL = null;
    bg = document.createElement('div'); bg.className = 'modal-bg ae-bg';
    bg.innerHTML = `<div class="modal ae" role="dialog" aria-label="Assistent einrichten" tabindex="-1"><div class="mh">Assistent einrichten<button class="mx" title="Schließen">×</button></div>
      <div class="ae-tabs"></div><div class="mb ae-body"></div>
      <div class="mf"><span class="ae-hint">Gilt für alle Benutzer und neue Planungen. Bestehende Pläne bleiben, wie sie sind.</span><span class="ae-dirty" hidden>Nicht gespeichert</span><button class="btn" data-ae="undo" title="Letzte Änderung rückgängig (Strg+Z)" disabled>↶ Rückgängig</button><button class="btn" data-ae="redo" title="Wiederholen (Strg+Y)" disabled>↷</button><button type="button" class="btn" data-bph-verlauf="gs:assistcfg" title="Frühere gespeicherte Einrichtungen ansehen und wiederherstellen">Verlauf</button><button class="btn" data-ae="cancel">Abbrechen</button><button class="btn primary" data-ae="save">Speichern</button></div></div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click', (e) => { snap(); onClick(e); }); bg.addEventListener('change', (e) => { snap(); onChange(e); }); bg.addEventListener('input', onInput);
    bg.addEventListener('keydown', (e) => {
      e.stopPropagation(); if (e.key === 'Escape') { close(); return; }
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.ctrlKey || e.metaKey) && !inField && (e.key === 'z' || e.key === 'Z' || e.key === 'y')) { e.preventDefault(); undo(e.key === 'y' || e.shiftKey); }
    });
    bg.querySelector('.mx').onclick = () => close();
    if (typeof makeDraggable === 'function') makeDraggable(bg.querySelector('.modal'), bg.querySelector('.mh'), 'dlgPos:assistedit');
    render();
  }
  function close(force) {
    if (!force && dirty && !confirmBox()) return;
    bg.remove(); bg = null;
  }
  const confirmBox = () => window.confirm('Änderungen an der Einrichtung verwerfen?');
  async function save() {
    try { const v = await api('api/assistcfg', 'PUT', CFG_D); apply(v); dirty = false; say('Einrichtung gespeichert – gilt ab jetzt für neue Planungen.'); close(true); }
    catch (e) { say('Nicht gespeichert: ' + e.message, true); }
  }

  function render() {
    if (!bg) return;
    bg.querySelector('.ae-tabs').innerHTML = [['typen', 'Gebäudetypen'], ['bauweisen', 'Bauweisen'], ['vorlagen', 'Vorlagen']].map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')
      + `<span class="ae-sp"></span><button class="ae-link" data-ae="lib" title="Leistungen selbst (Name, Gewerk, Vorgänger) bearbeitest du im Leistungskatalog">Leistungen bearbeiten → Leistungskatalog</button>`;
    const body = bg.querySelector('.ae-body'), sc = body.querySelector('.ae-main') ? body.querySelector('.ae-main').scrollTop : 0;
    body.innerHTML = tab === 'typen' ? vTypen() : tab === 'bauweisen' ? vBauweisen() : vVorlagen();
    const m = body.querySelector('.ae-main'); if (m) m.scrollTop = sc;
    if (dirty) bg.querySelector('.ae-dirty').hidden = false;
    undoBtns();
  }

  /* ----- Gebäudetypen ----- */
  function vTypen() {
    const list = draftProfiles(); if (!list.find((p) => p.k === selP)) selP = (list[0] || {}).k;
    const p = list.find((x) => x.k === selP);
    const side = `<div class="ae-side"><div class="ae-list">${list.map((x, i) => `<div class="ae-li${x.k === selP ? ' on' : ''}${x.hidden ? ' off' : ''}" data-selp="${x.k}"><span class="ic">${H(x.ic)}</span><span class="nm">${H(x.n)}${x.own ? ' <i class="t">eigen</i>' : ''}${x.hidden ? ' <i class="t">ausgeblendet</i>' : ''}${CFG_D.profiles[x.k] && Object.keys(CFG_D.profiles[x.k]).length ? ' <i class="t m">geändert</i>' : ''}</span>
        ${x.k === 'frei' ? '' : `<button class="ae-ib" data-mv="${x.k}" data-d="-1" title="nach oben"${i ? '' : ' disabled'}>↑</button><button class="ae-ib" data-mv="${x.k}" data-d="1" title="nach unten">↓</button>`}</div>`).join('')}</div>
      <button class="btn sm" data-ae="newp">+ Eigener Gebäudetyp</button><small class="ae-mut">als Kopie des gewählten Typs</small></div>`;
    if (!p) return `<div class="ae-two">${side}<div class="ae-main"></div></div>`;
    const std = STD.profiles.find((x) => x.k === (p.base || p.k)) || {};
    const inp = (f, v, a = '') => `<input data-pf="${f}" value="${H(v ?? '')}" ${a}>`;
    const sel = (f, v, opts) => `<select data-pf="${f}">${opts.map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${H(l)}</option>`).join('')}</select>`;
    let h = `<div class="ae-main"><div class="ae-row"><label class="ae-ic">Symbol${inp('ic', p.ic, 'maxlength="4"')}</label><label class="ae-g">Name${inp('n', p.n)}</label></div>
      <label>Beschreibung${inp('desc', p.desc)}</label>
      <label class="chk"><input type="checkbox" data-pf="hidden"${p.hidden ? ' checked' : ''}> im Assistenten ausblenden</label>
      <h4>Vorgaben für neue Planungen</h4><div class="ae-row">
        <label>Fläche m²${inp('area', p.area, 'inputmode="numeric" class="n"')}</label><label>Einheiten${inp('units', p.units, 'inputmode="numeric" class="n"')}</label><label>Geschosse${inp('floors', p.floors, 'inputmode="numeric" class="n"')}</label>
        <label>Über dem obersten Geschoss${sel('dg', p.dg, DG)}</label><label>Einheiten ausbauen${sel('takt', p.takt || 'parallel', [['parallel', 'gleichzeitig'], ['versetzt', 'im Takt nacheinander']])}</label>
        <label>Bezeichnung der Einheiten${sel('naming', p.naming || 'whg', NAMING)}</label></div>`;
    const gs = visGroups(p);
    if (gs.length) h += `<h4>Standard-Bauweisen</h4><div class="ae-grid">${gs.map((g) => { const os = draftOpts(g).filter((o) => !o.hidden), v = (p.choice || {})[g.k] || (os[0] || {}).k;
      return `<label>${H((CFG_D.choices[g.k] || {}).n || g.n)}<select data-pch="${g.k}">${os.map((o) => `<option value="${o.k}"${o.k === v ? ' selected' : ''}>${H(o.n)}</option>`).join('')}</select></label>`; }).join('')}</div>`;
    // Leistungen
    const R = new Set(p.rec || []), O = new Set(p.opt === '*' ? allItems().map((i) => i.id) : p.opt || []), BC = byChoice(p), ov = p.ovr || {}, mine = (profD(p.k).ovr || {});
    const hit = (i) => (!q || (i.n + ' ' + (ov[i.id] && ov[i.id].n || '')).toLowerCase().includes(q.toLowerCase())) && (flt === 'alle' || (flt === 'rec' ? R.has(i.id) : flt === 'opt' ? O.has(i.id) && !R.has(i.id) : flt === 'mod' ? !!mine[i.id] : !R.has(i.id) && !O.has(i.id)));
    h += `<h4>Leistungen <small class="ae-mut">empfohlen = vorausgewählt · optional = unter „Weitere Leistungen“ · – = nicht angeboten · ↑↓ Reihenfolge, Auswahlfeld = Gruppe im Bauzeitenplan · <i class="t bw">über …</i> = setzt die gewählte Bauweise</small></h4>
      <div class="ae-row ae-flt"><input type="search" data-q value="${H(q)}" placeholder="Leistung suchen …"><span class="ae-seg">${[['alle', 'alle'], ['rec', 'empfohlen'], ['opt', 'optional'], ['off', 'nicht angeboten'], ['mod', 'eigene Namen/Dauern']].map(([k, l]) => `<button class="${flt === k ? 'on' : ''}" data-flt="${k}">${l}</button>`).join('')}</span>
      <span class="ae-sp"></span>${p.own ? `<button class="btn sm danger" data-ae="delp">Gebäudetyp löschen</button>` : `<button class="btn sm" data-ae="resetp"${CFG_D.profiles[p.k] ? '' : ' disabled'} title="Alle Änderungen an diesem Typ verwerfen">Standard wiederherstellen</button>`}</div>`;
    h += '<table class="ae-tbl"><thead><tr><th></th><th>Leistung</th><th class="c">Status</th><th>eigene Bezeichnung</th><th class="r">Richtdauer AT</th></tr></thead><tbody>';
    const L = itemsFor(p), phSel = (i) => `<select class="ae-phs" data-iph="${i.id}" title="Gruppe (Phase) im Bauzeitenplan">${PH().map((x) => `<option value="${x.k}"${x.k === i.ph ? ' selected' : ''}>${H(x.n)}</option>`).join('')}</select>`;
    for (const ph of PH()) {
      const all = L.filter((i) => i.ph === ph.k), its = all.filter(hit); if (!its.length) continue;
      h += `<tr class="ae-ph"><td colspan="5">${H(ph.n)}</td></tr>`;
      for (const i of its) {
        const k = all.indexOf(i);
        const st = R.has(i.id) ? 'rec' : O.has(i.id) ? 'opt' : 'off', sOv = (std.ovr || {})[i.id] || {}, m = mine[i.id] || {};
        h += `<tr><td class="ae-mv"><button class="ae-ib" data-imv="${i.id}" data-d="-1" title="nach oben"${k ? '' : ' disabled'}>↑</button><button class="ae-ib" data-imv="${i.id}" data-d="1" title="nach unten"${k < all.length - 1 ? '' : ' disabled'}>↓</button></td>
          <td>${H(i.n)}${i.lib ? ' <i class="t">Katalog</i>' : ''}${i.ms ? ' <i class="t">Meilenstein</i>' : ''}${BC[i.id] ? ` <i class="t bw" title="Diese Leistung schaltet der Assistent über die Bauweise „${H(BC[i.id].join(', '))}“ ein oder aus – „empfohlen/optional“ gilt, soweit die gewählte Bauweise sie vorsieht. Welche Leistungen eine Bauweise setzt, steht im Reiter „Bauweisen“.">über ${H(BC[i.id].join(', '))}</i>` : ''}
            <div class="ae-phw">${phSel(i)}${(p.phase || {})[i.id] ? ' <i class="t m">verschoben</i>' : ''}</div></td>
          <td class="c"><span class="ae-seg sm" data-st="${i.id}">${[['rec', 'empfohlen'], ['opt', 'optional'], ['off', '–']].map(([k, l]) => `<button class="${st === k ? 'on ' + k : ''}" data-v="${k}">${l}</button>`).join('')}</span></td>
          <td>${i.lib ? '<span class="ae-mut">im Leistungskatalog</span>' : `<input data-on="${i.id}" value="${H(m.n || '')}" placeholder="${H(sOv.n || i.n)}">`}</td>
          <td class="r">${i.lib || i.ms ? '' : `<input class="n" data-od="${i.id}" value="${H(m.d ?? '')}" placeholder="${H(sOv.d ?? i.d)}" inputmode="numeric">`}</td></tr>`;
      }
    }
    h += '</tbody></table><p class="ae-mut">Richtdauer gilt für die Referenzgröße und wird mit der Fläche skaliert. Leer = Vorgabe aus dem Katalog.</p></div>';
    return `<div class="ae-two">${side}${h}</div>`;
  }
  function itemsFor(p) {   // Leistungen mit Gruppe und Reihenfolge dieses Gebäudetyps
    const phO = p.phase || {}, ord = Array.isArray(p.order) ? p.order : [];
    const base = allItems().map((i, k) => ({ ...i, ph: phO[i.id] || i.ph, _k: k }));
    const key = (i) => { const k = ord.indexOf(i.id); return k >= 0 ? k : 10000 + i._k; };
    return base.sort((a, b) => key(a) - key(b));
  }
  function setStatus(p, id, v) {
    const d = profD(p.k), cur = draftProfiles().find((x) => x.k === p.k);
    const rec = new Set(d.rec || cur.rec || []), opt = new Set(cur.opt === '*' ? [] : d.opt || cur.opt || []);
    rec.delete(id); opt.delete(id); if (v === 'rec') rec.add(id); if (v === 'opt') opt.add(id);
    d.rec = [...rec]; if (cur.opt !== '*') d.opt = [...opt]; touch();
  }

  /* ----- Bauweisen ----- */
  function vBauweisen() {
    if (!C.choices.find((g) => g.k === selG)) selG = (C.choices[0] || {}).k;
    const g = C.choices.find((x) => x.k === selG), d = CFG_D.choices[selG] || {};
    const side = `<div class="ae-side"><div class="ae-list">${C.choices.map((x) => { const dn = (CFG_D.choices[x.k] || {}).n || (STD.choices.find((s) => s.k === x.k) || x).n;
      return `<div class="ae-li${x.k === selG ? ' on' : ''}" data-selg="${x.k}"><span class="nm">${H(dn)}<small>${H(phName(x.ph))}</small>${CFG_D.choices[x.k] && Object.keys(CFG_D.choices[x.k]).length ? ' <i class="t m">geändert</i>' : ''}</span></div>`; }).join('')}</div></div>`;
    if (!g) return `<div class="ae-two">${side}<div class="ae-main"></div></div>`;
    const s = STD.choices.find((x) => x.k === g.k) || g, types = s.types.map((t) => (draftProfiles().find((p) => p.k === t) || {}).n).filter(Boolean);
    const IT = allItems().filter((i) => !i.ms);
    let h = `<div class="ae-main"><div class="ae-row"><label class="ae-g">Bezeichnung<input data-gn value="${H(d.n || '')}" placeholder="${H(s.n)}"></label>
      <button class="btn sm" data-ae="resetg"${CFG_D.choices[g.k] ? '' : ' disabled'} style="align-self:flex-end">Standard wiederherstellen</button></div>
      <p class="ae-mut">Abschnitt „${H(phName(g.ph))}“ · angeboten bei: ${H(types.join(', ') || '–')}${s.onTypes ? ` · setzt Leistungen nur bei: ${H(s.onTypes.map((t) => (draftProfiles().find((p) => p.k === t) || {}).n).filter(Boolean).join(', '))}` : ''}.<br>
      Jede Ausführung setzt ihre Leistungen; die Leistungen der anderen Ausführungen werden dabei abgewählt.</p>
      <datalist id="aeItems">${IT.map((i) => `<option value="${H(i.n)}">${H(phName(i.ph))}</option>`).join('')}</datalist>`;
    for (const o of draftOpts(g)) {
      h += `<div class="ae-opt${o.hidden ? ' off' : ''}"><div class="ae-row"><label class="ae-g">${o.own ? 'Eigene Ausführung' : 'Ausführung'}<input data-on-n="${o.k}" value="${H(o.own ? o.n : (o.n !== o.std ? o.n : ''))}" placeholder="${H(o.std || '')}"></label>
        ${o.own ? `<button class="btn sm danger" data-delo="${o.k}" style="align-self:flex-end">Entfernen</button>` : `<label class="chk" style="align-self:flex-end"><input type="checkbox" data-hide="${o.k}"${o.hidden ? ' checked' : ''}> ausblenden</label>`}</div>
        <div class="ae-chips">${(o.on || []).map((id) => `<span class="ae-chip">${H(itemName(id))}<button data-rmon="${o.k}" data-id="${id}" title="entfernen">×</button></span>`).join('') || '<span class="ae-mut">setzt keine eigenen Leistungen</span>'}
          <input class="ae-add" list="aeItems" data-addon="${o.k}" placeholder="+ Leistung hinzufügen …"></div></div>`;
    }
    h += `<button class="btn sm" data-ae="newo">+ Eigene Ausführung</button></div>`;
    return `<div class="ae-two">${side}${h}</div>`;
  }
  function optD(gk, ok) {
    const d = grpD(gk), own = (d.own || []).find((o) => o.k === ok); if (own) return own;
    d.opts ||= {}; return (d.opts[ok] ||= {});
  }

  /* ----- Vorlagen ----- */
  function vVorlagen() {
    if (!VORL) { VORL = []; api('api/assistcfg/vorlagen').then((v) => { VORL = v; render(); }).catch((e) => say(e.message, true)); }
    const n = Object.keys(CFG_D.profiles).length + CFG_D.own.length + Object.keys(CFG_D.choices).length;
    return `<div class="ae-main ae-full"><h4>Aktuellen Stand als Vorlage speichern</h4>
      <p class="ae-mut">Sichert die ganze Einrichtung (Gebäudetypen, Bauweisen, Empfehlungen) unter einem Namen – z. B. vor größeren Änderungen oder als Variante für bestimmte Bauherren. Gleicher Name überschreibt.</p>
      <div class="ae-row"><input data-vname placeholder="Name der Vorlage, z. B. „Büro-Standard 2026“" style="flex:1"><button class="btn primary sm" data-ae="vsave">Speichern</button></div>
      <h4>Gespeicherte Vorlagen</h4>
      ${VORL.length ? `<table class="ae-tbl"><tbody>${VORL.map((v) => `<tr><td><b>${H(v.name)}</b><br><small class="ae-mut">${H(v.by || '')} · ${H(new Date(v.created).toLocaleString('de-DE'))}</small></td>
        <td class="r"><button class="btn sm" data-vload="${v.id}">Laden</button> <button class="btn sm danger" data-vdel="${v.id}">Löschen</button></td></tr>`).join('')}</tbody></table>` : '<p class="ae-mut">Noch keine Vorlagen.</p>'}
      <p class="ae-mut">„Laden“ übernimmt die Vorlage in diesen Dialog – erst „Speichern“ unten macht sie wirksam.</p>
      <h4>Datei</h4><div class="ae-row"><button class="btn sm" data-ae="export">Exportieren (.json)</button><label class="btn sm">Importieren …<input type="file" accept=".json,application/json" data-import hidden></label></div>
      <h4>Zurücksetzen</h4><div class="ae-row"><button class="btn sm danger" data-ae="resetall"${n ? '' : ' disabled'}>Alles auf den eingebauten Standard zurücksetzen</button><span class="ae-mut">${n ? n + ' Bereiche geändert' : 'keine Änderungen'}</span></div></div>`;
  }

  /* ---------- Ereignisse ---------- */
  function onClick(e) {
    const t = e.target, b = t.closest('button,[data-selp],[data-selg]'); if (!b || !bg.contains(b)) return;
    if (b.dataset.tab) { tab = b.dataset.tab; render(); return; }
    if (b.dataset.selp) { if (t.closest('button')) { /* Pfeile */ } else { selP = b.dataset.selp; render(); return; } }
    if (b.dataset.selg) { selG = b.dataset.selg; render(); return; }
    if (b.dataset.mv) {
      const list = draftProfiles().filter((p) => p.k !== 'frei'), i = list.findIndex((p) => p.k === b.dataset.mv), k = i + +b.dataset.d;
      if (k < 0 || k >= list.length) return;
      [list[i], list[k]] = [list[k], list[i]]; list.forEach((p, n) => { profD(p.k).ord = n; }); touch(); render(); return;
    }
    if (b.dataset.flt) { flt = b.dataset.flt; render(); return; }
    if (b.dataset.imv) {   // Leistung innerhalb ihrer Gruppe verschieben
      const p = draftProfiles().find((x) => x.k === selP), L = itemsFor(p), it = L.find((i) => i.id === b.dataset.imv);
      const grp = L.filter((i) => i.ph === it.ph), k = grp.indexOf(it), j = k + +b.dataset.d; if (j < 0 || j >= grp.length) return;
      const ids = L.map((i) => i.id), a = ids.indexOf(grp[k].id), c = ids.indexOf(grp[j].id); [ids[a], ids[c]] = [ids[c], ids[a]];
      profD(p.k).order = ids; touch(); render(); return;
    }
    const seg = b.closest('[data-st]'); if (seg && b.dataset.v) { setStatus(draftProfiles().find((p) => p.k === selP), seg.dataset.st, b.dataset.v); render(); return; }
    if (b.dataset.rmon) { const o = optD(selG, b.dataset.rmon), cur = draftOpts(C.choices.find((g) => g.k === selG)).find((x) => x.k === b.dataset.rmon); o.on = (cur.on || []).filter((x) => x !== b.dataset.id); touch(); render(); return; }
    if (b.dataset.delo) { const d = grpD(selG); d.own = (d.own || []).filter((o) => o.k !== b.dataset.delo); touch(); render(); return; }
    if (b.dataset.vload) { const v = VORL.find((x) => x.id === b.dataset.vload); if (v) { CFG_D = norm(clone(v.data)); touch(); say(`Vorlage „${v.name}“ geladen – mit „Speichern“ übernehmen.`); render(); } return; }
    if (b.dataset.vdel) { const v = VORL.find((x) => x.id === b.dataset.vdel); if (v && window.confirm(`Vorlage „${v.name}“ löschen?`)) api('api/assistcfg/vorlagen/' + v.id, 'DELETE').then(() => { VORL = VORL.filter((x) => x !== v); render(); }).catch((er) => say(er.message, true)); return; }
    const a = b.dataset.ae; if (!a) return;
    if (a === 'undo') { undo(false); return; }
    if (a === 'redo') { undo(true); return; }
    if (a === 'cancel') close();
    else if (a === 'save') save();
    else if (a === 'lib') { if (dirty && !window.confirm('Ungespeicherte Änderungen verwerfen und zum Leistungskatalog wechseln?')) return; close(true); const tb = document.querySelector('[data-view="lib"],[data-tab="lib"],#tabLib'); if (tb) tb.click(); else if (typeof showLib === 'function') showLib(); }
    else if (a === 'newp') {
      const base = draftProfiles().find((p) => p.k === selP) || draftProfiles()[0], k = uid('eigen_');
      const n = window.prompt('Name des neuen Gebäudetyps', base.n + ' (Kopie)'); if (!n) return;
      CFG_D.own.push({ k, base: base.base || base.k, n: n.slice(0, 80), ic: base.ic, desc: base.desc, rec: (base.rec || []).slice(), opt: base.opt === '*' ? undefined : (base.opt || []).slice(), choice: { ...(base.choice || {}) }, ord: 900 + CFG_D.own.length });
      selP = k; touch(); render();
    } else if (a === 'delp') { const p = CFG_D.own.find((o) => o.k === selP); if (p && window.confirm(`Gebäudetyp „${p.n}“ löschen?`)) { CFG_D.own = CFG_D.own.filter((o) => o !== p); selP = null; touch(); render(); } }
    else if (a === 'resetp') { delete CFG_D.profiles[selP]; touch(); render(); }
    else if (a === 'resetg') { delete CFG_D.choices[selG]; touch(); render(); }
    else if (a === 'newo') { const n = window.prompt('Bezeichnung der eigenen Ausführung'); if (!n) return; const d = grpD(selG); (d.own ||= []).push({ k: uid('eig_'), n: n.slice(0, 120), on: [] }); touch(); render(); }
    else if (a === 'vsave') {
      const inp = bg.querySelector('[data-vname]'), n = inp.value.trim(); if (!n) { inp.focus(); say('Bitte einen Namen eingeben.', true); return; }
      api('api/assistcfg/vorlagen', 'POST', { name: n, data: CFG_D }).then((v) => { VORL = [v, ...VORL.filter((x) => x.name !== v.name)]; say(`Vorlage „${v.name}“ gespeichert.`); render(); }).catch((er) => say(er.message, true));
    } else if (a === 'export') {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ art: 'bauplattform-assistent', ...CFG_D }, null, 1)], { type: 'application/json' }));
      const l = document.createElement('a'); l.href = url; l.download = 'Assistent-Einrichtung.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else if (a === 'resetall') { if (window.confirm('Ganze Einrichtung auf den eingebauten Standard zurücksetzen? (Erst „Speichern“ macht es wirksam.)')) { CFG_D = empty(); touch(); render(); } }
  }
  function onChange(e) {
    const t = e.target, p = draftProfiles().find((x) => x.k === selP);
    if (t.dataset.pf && p) {
      const d = profD(p.k), f = t.dataset.pf;
      if (f === 'hidden') d.hidden = t.checked;
      else if (['area', 'units', 'floors'].includes(f)) { const v = Math.round(+String(t.value).replace(',', '.')); if (v > 0) d[f] = v; else { delete d[f]; t.value = ''; } }
      else if (t.value.trim()) d[f] = t.value.trim(); else delete d[f];
      touch(); if (['n', 'ic', 'hidden'].includes(f)) render(); return;
    }
    if (t.dataset.iph && p) {   // Leistung in eine andere Gruppe
      const d = profD(p.k), id = t.dataset.iph, orig = (allItems().find((i) => i.id === id) || {}).ph;
      d.phase = { ...(d.phase || {}) }; if (t.value === orig) delete d.phase[id]; else d.phase[id] = t.value;
      if (!Object.keys(d.phase).length) delete d.phase; touch(); render(); return;
    }
    if (t.dataset.pch && p) { const d = profD(p.k); d.choice = { ...(d.choice || {}), [t.dataset.pch]: t.value }; touch(); return; }
    if (t.dataset.on && p) { const d = profD(p.k); d.ovr ||= {}; const e2 = d.ovr[t.dataset.on] ||= {}; if (t.value.trim()) e2.n = t.value.trim(); else delete e2.n; if (!Object.keys(e2).length) delete d.ovr[t.dataset.on]; touch(); return; }
    if (t.dataset.od && p) { const d = profD(p.k); d.ovr ||= {}; const e2 = d.ovr[t.dataset.od] ||= {}; const v = Math.round(+String(t.value).replace(',', '.')); if (v > 0) e2.d = v; else { delete e2.d; t.value = ''; } if (!Object.keys(e2).length) delete d.ovr[t.dataset.od]; touch(); return; }
    if (t.dataset.gn !== undefined) { const d = grpD(selG); if (t.value.trim()) d.n = t.value.trim(); else delete d.n; touch(); render(); return; }
    if (t.dataset.onN) { const o = optD(selG, t.dataset.onN); if (t.value.trim()) o.n = t.value.trim(); else if (!o.on && !o.hidden && o.k == null) delete o.n; else delete o.n; touch(); return; }
    if (t.dataset.hide) { optD(selG, t.dataset.hide).hidden = t.checked; touch(); render(); return; }
    if (t.dataset.addon) {
      const v = t.value.trim().toLowerCase(), it = allItems().filter((i) => !i.ms).find((i) => i.n.toLowerCase() === v) || allItems().find((i) => i.n.toLowerCase().includes(v));
      if (!it) { say('Leistung nicht gefunden – bitte aus der Liste wählen.', true); return; }
      const cur = draftOpts(C.choices.find((g) => g.k === selG)).find((x) => x.k === t.dataset.addon), o = optD(selG, t.dataset.addon);
      o.on = [...new Set([...(cur.on || []), it.id])]; touch(); render(); return;
    }
    if (t.dataset.import !== undefined && t.files && t.files[0]) {
      t.files[0].text().then((s) => { const d = JSON.parse(s); if (!d || (d.art && d.art !== 'bauplattform-assistent')) throw new Error('Keine Einrichtung des Assistenten'); delete d.art; CFG_D = norm(d); touch(); say('Einrichtung importiert – mit „Speichern“ übernehmen.'); render(); })
        .catch((er) => say('Import fehlgeschlagen: ' + er.message, true));
    }
  }
  function onInput(e) {
    if (e.target.dataset.q !== undefined) { q = e.target.value; clearTimeout(onInput.t); onInput.t = setTimeout(() => { render(); const s = bg.querySelector('[data-q]'); s.focus(); s.setSelectionRange(q.length, q.length); }, 250); }
  }

  window.AssistEdit = { open, apply, load, std: () => clone(STD), cfg: () => clone(CFG) };
  load();
})();
