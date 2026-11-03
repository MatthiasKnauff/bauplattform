'use strict';
/* =====================================================================
   Planungsassistent
   - AssistCore: läuft im Hauptfenster, erzeugt Pläne aus dem Katalog und
     ändert verknüpfte Projekte live (über act() → Rückgängig möglich).
   - AssistUI:   Oberfläche, angedockt im Hauptfenster oder im eigenen
     Browserfenster (assistent.html greift auf opener.AssistCore zu).
   Leistungen aus dem Assistenten tragen cat (Katalog-ID) und blk
   (-1 = Gebäude, 0..n = Einheit). Gruppen: _grp, _bau, _unit; Meilensteine
   _start, _fertig, _end.
   ===================================================================== */
(function () {
  const C = window.CATALOG;
  // Katalog + eigene Leistungen (cfg.custom) – Kontext wird je Aufruf gesetzt
  // Leistungen aus dem projektübergreifenden Leistungskatalog (Reiter „Leistungskatalog“)
  const LASTPH = {}; for (const i of C.items) LASTPH[i.ph] = i.id;
  const libToItem = (x) => ({ id: x.id, n: x.n, ph: x.ph, gw: x.gw || '', din: x.din || '', sc: x.sc === 'bau' ? 'bau' : 'we', d: Math.max(1, +x.d || 1), fix: 1, lib: 1,
    a: x.a && x.a.length ? x.a.slice() : [LASTPH[x.ph] || 'start'], b: (x.b || []).slice(), info: x.info || '', craft: x.craft || '', firm: x.firm || '', rec: (x.rec || []).slice() });
  const libList = () => (Array.isArray(window.LIBRARY) ? window.LIBRARY : []);
  // Bezug je Projekt abweichend vom Katalog: cfg.bezug = { id: 'bau' | 'we' } (Meilensteine ausgenommen)
  function itemsOf(cfg) {
    const list = itemsOf0(cfg), bz = cfg && cfg.bezug;
    if (!bz || !Object.keys(bz).length) return list;
    return list.map((i) => (bz[i.id] && bz[i.id] !== i.sc && !i.ms ? { ...i, sc: bz[i.id], scBase: i.sc } : i));
  }
  function itemsOf0(cfg) {
    const cus = cfg && Array.isArray(cfg.custom) ? cfg.custom : [];
    const phO = cfg && cfg.phase, ord = cfg && Array.isArray(cfg.order) ? cfg.order : null;
    const cid = new Set(cus.map((c) => c.id)), lib = libList().filter((x) => !cid.has(x.id)).map(libToItem);
    if (!cus.length && !phO && !ord && !lib.length) return expandFloors(C.items, cfg);
    let all = [...C.items, ...lib, ...cus];
    if (phO) all = all.map((i) => (phO[i.id] && phO[i.id] !== i.ph ? { ...i, ph: phO[i.id] } : i));
    const base = new Map(all.map((i, k) => [i.id, k]));
    const key = (i) => { const k = ord ? ord.indexOf(i.id) : -1; return k >= 0 ? k : 10000 + base.get(i.id); };
    const out = []; for (const ph of C.phases) out.push(...all.filter((i) => i.ph === ph.k).sort((a, b) => key(a) - key(b)));
    const known = new Set(C.phases.map((p) => p.k)); out.push(...all.filter((i) => !known.has(i.ph)).map((i) => ({ ...i, ph: C.phases[C.phases.length - 1].k })));
    return expandFloors(out, cfg);
  }
  /* ---------- Geschosse: Rohbau und Treppen je Geschoss ---------- */
  function levelsOf(cfg) {
    const n = Math.max(1, Math.min(30, Math.round(+cfg.floors) || 1)), L = [];
    for (let k = 0; k < n; k++) L.push(k ? k + '.OG' : 'EG');
    const flach = CHM.dachform && chVisible(CHM.dachform, cfg) && choiceOf(cfg, 'dachform') === 'flach';
    const hasRoof = CHM.dachform && chVisible(CHM.dachform, cfg);
    return { L, dg: cfg.dg === 'staffel' && (flach || !hasRoof) ? 'staffel' : cfg.dg === 'aus' && !flach ? 'aus' : 'none', flach,
      kg: !!(CHM.keller && chVisible(CHM.keller, cfg) && choiceOf(cfg, 'keller') !== 'none') };
  }
  const NAMES = {
    massiv: [(l) => 'Mauerwerk ' + l, (l) => 'Decke über ' + l + ' (Stahlbeton)', 'Drempel und Giebel DG'],
    stb: [(l) => 'Stahlbetonwände ' + l, (l) => 'Decke über ' + l + ' (Stahlbeton)', 'Drempel und Giebel DG'],
    holz: [(l) => 'Montage Wände ' + l, (l) => 'Montage Decke über ' + l, 'Montage Drempel und Giebel DG'],
    bsp: [(l) => 'Montage BSP-Wände ' + l, (l) => 'Montage BSP-Decke über ' + l, 'Montage Drempel und Giebel DG'],
  };
  function expandFloors(list, cfg) {
    if (!cfg || !cfg.flDetail || !cfg.type) return list;
    const { L, dg, flach, kg } = levelsOf(cfg);
    const tw = CHM.tragwerk && chVisible(CHM.tragwerk, cfg) ? choiceOf(cfg, 'tragwerk') : 'massiv';
    const out = [];
    for (const it of list) {
      if (it.id === 'mauer' || it.id === 'holz_mont') {
        const nm = NAMES[it.id === 'holz_mont' ? (tw === 'bsp' ? 'bsp' : 'holz') : (tw === 'stb' ? 'stb' : 'massiv')];
        const parts = [];
        L.forEach((l, k) => {
          const top = k === L.length - 1 && dg === 'none';
          parts.push({ s: 'w' + k, n: nm[0](l), w: 0.6 }, { s: 'd' + k, n: top && flach ? (it.id === 'holz_mont' ? 'Montage Dachdecke über ' : 'Dachdecke über ') + l : nm[1](l) + (top ? ' – oberste Geschossdecke' : ''), w: 0.4 });
        });
        if (dg === 'aus') parts.push({ s: 'w' + L.length, n: nm[2], w: 0.35 });
        if (dg === 'staffel') parts.push({ s: 'w' + L.length, n: nm[0]('Staffelgeschoss'), w: 0.42 }, { s: 'd' + L.length, n: (it.id === 'holz_mont' ? 'Montage Dachdecke' : 'Dachdecke') + ' über Staffelgeschoss', w: 0.28 });
        const W = parts.reduce((a, x) => a + x.w, 0);
        parts.forEach((x, k) => out.push({ ...it, id: it.id + '~' + x.s, vb: it.id, n: x.n, d: (it.d * x.w) / W, a: k ? [it.id + '~' + parts[k - 1].s] : (it.a || []).slice() }));
      } else if (it.id === 'treppe') {
        const lv = [...(kg ? ['KG'] : []), ...L, ...(dg === 'aus' ? ['DG'] : dg === 'staffel' ? ['Staffelgeschoss'] : [])];
        if (lv.length < 2) { out.push(it); continue; }
        for (let k = 0; k < lv.length - 1; k++) {
          const lo = lv[k], fi = L.indexOf(lo);   // Decke über dem unteren Geschoss muss fertig sein
          const a = lo === 'KG' ? ['keller'] : ['mauer~d' + fi, 'holz_mont~d' + fi];
          out.push({ ...it, id: 'treppe~' + k, vb: 'treppe', n: `Treppe ${lo} – ${lv[k + 1]}`, d: Math.max(1, it.d / (lv.length - 1)), a });
        }
      } else out.push(it);
    }
    return out;
  }
  const baseOf = (id) => String(id).split('~')[0];
  // Auswahl an die Geschoss-Aufteilung anpassen: Grundleistung ↔ Teilleistungen je Geschoss
  function normSel(arr, cfg) {
    ctx(cfg); const list = itemsOf(cfg), have = new Set(list.map((i) => i.id));
    const S = new Set();
    for (const id of arr) {
      if (have.has(id)) { S.add(id); continue; }
      const b = baseOf(id);
      if (have.has(b)) S.add(b); else list.filter((i) => i.vb === b).forEach((i) => S.add(i.id));
    }
    for (const id of [...S]) if (!have.has(id) || list.some((i) => i.vb === id)) { S.delete(id); list.filter((i) => i.vb === id).forEach((i) => S.add(i.id)); }
    return list.map((i) => i.id).filter((id) => S.has(id));
  }
  const baseSel = (arr) => [...new Set(arr.map(baseOf))];
  let CTX = { cfg: undefined, n: -1, map: {}, ord: {} };
  function ctx(cfg) {
    const n = cfg && Array.isArray(cfg.custom) ? cfg.custom.length : 0;
    const fk = cfg ? [cfg.flDetail, cfg.floors, cfg.dg, cfg.type, JSON.stringify(cfg.choice || {})].join('|') : '';
    if (cfg !== undefined && CTX.cfg === cfg && CTX.n === n && CTX.arr === (cfg && cfg.custom) && CTX.o === (cfg && cfg.order) && CTX.p === (cfg && cfg.phase) && CTX.bz === (cfg && cfg.bezug) && CTX.l === window.LIBRARY && CTX.fk === fk) return;
    const list = itemsOf(cfg);
    CTX = { cfg, n, fk, l: window.LIBRARY, arr: cfg && cfg.custom, o: cfg && cfg.order, p: cfg && cfg.phase, bz: cfg && cfg.bezug, map: Object.fromEntries(list.map((i) => [i.id, i])), ord: Object.fromEntries(list.map((i, k) => [i.id, k])) };
  }
  ctx(null);
  const B = (id) => CTX.map[id];
  const ORDf = (id) => CTX.ord[id];
  // Abschnitte können im Leistungskatalog ergänzt und umsortiert werden – daher immer aktuell nachschlagen
  const PHO = new Proxy({}, { get: (_, k) => { const i = C.phases.findIndex((p) => p.k === k); return i < 0 ? 999 : i; } });
  const PHN = new Proxy({}, { get: (_, k) => (C.phases.find((p) => p.k === k) || {}).n || String(k) });
  const PROF = Object.fromEntries(C.profiles.map((p) => [p.k, p]));
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

  /* ---------- Bauweisen (Auswahl je Bereich) ---------- */
  const CHS = C.choices || [];
  const CHM = Object.fromEntries(CHS.map((g) => [g.k, g]));
  const chVisible = (g, cfg) => !!(cfg && cfg.type && (cfg.type === 'frei' || !PROF[cfg.type] || g.types.includes(cfg.type)));
  function chOpts(g, cfg, depth = 0) {
    return g.opts.filter((o) => !o.if || depth > 3 || Object.entries(o.if).every(([k, l]) => !CHM[k] || !chVisible(CHM[k], cfg) || l.includes(choiceOf(cfg, k, depth + 1))));
  }
  function choiceOf(cfg, gk, depth = 0) {
    const g = CHM[gk]; if (!g) return null;
    const ok = chOpts(g, cfg, depth), want = (cfg && cfg.choice && cfg.choice[gk]) ?? (PROF[cfg && cfg.type] && PROF[cfg.type].choice && PROF[cfg.type].choice[gk]);
    return (ok.find((o) => o.k === want) || ok[0] || g.opts[0]).k;
  }
  const chosen = (cfg) => CHS.filter((g) => chVisible(g, cfg)).map((g) => g.opts.find((o) => o.k === choiceOf(cfg, g.k)));
  const choiceAll = (cfg) => Object.fromEntries(CHS.filter((g) => chVisible(g, cfg)).map((g) => [g.k, choiceOf(cfg, g.k)]));
  // Auswahl an geänderte Bauweise anpassen: Leistungen der alten Wahl raus, der neuen rein
  function selForChoices(selArr, oldCfg, newCfg) {
    let s = baseSel(selArr);
    for (const g of CHS) {
      if (!chVisible(g, newCfg)) continue;
      const ko = choiceOf(oldCfg, g.k), kn = choiceOf(newCfg, g.k);
      if (ko === kn && chVisible(g, oldCfg)) continue;
      // onTypes: Leistungen nur bei diesen Gebäudetypen an-/abwählen (sonst nur Namen, Dauern, abhängige Auswahl)
      const sw = !g.onTypes || g.onTypes.includes(newCfg.type);
      const all = new Set(sw ? g.opts.flatMap((o) => o.on) : []), on = sw ? g.opts.find((o) => o.k === kn).on : [];
      s = s.filter((id) => !all.has(id));
      for (const id of on) s = withReq(s, id, true, newCfg);
    }
    return normSel(s, newCfg);
  }
  // empfohlene Leistungen des Gebäudetyps passend zur gewählten Bauweise
  const recFor = (cfg) => {
    const r = selForChoices((PROF[cfg.type] || {}).rec || [], { type: cfg.type, choice: {} }, cfg);
    const S = new Set([...r, ...libList().filter((x) => (x.rec || []).includes(cfg.type)).map((x) => x.id)]);
    return normSel([...S], cfg);
  };
  // gewählte Katalog-Leistungen als Kopie ins Projekt übernehmen (das Projekt bleibt unabhängig vom Katalog)
  function materialize(cfg, ids) {
    ctx(cfg); let ch = false;
    for (const id of ids) { const b = B(id); if (b && b.lib && !b.custom) { cfg.custom = cfg.custom || []; cfg.custom.push({ ...libToItem(libList().find((x) => x.id === id) || b), custom: 1 }); ch = true; } }
    if (ch) ctx(cfg);
  }
  // Unternehmerbezeichnung aus Katalog-Leistungen für den Reiter „Gewerke & Firmen“
  function tradesFor(cfg, ids, base) {
    const tr = { ...(base || {}) }; ctx(cfg);
    for (const id of ids) { const b = B(id); if (b && b.craft && b.gw && !(tr[b.gw] && tr[b.gw].craft)) tr[b.gw] = { ...(tr[b.gw] || {}), craft: b.craft }; }
    // Stammfirmen der Gewerke für das neue Projekt vorbelegen
    for (const id of ids) {
      const b = B(id); if (!b || !b.gw || (tr[b.gw] && tr[b.gw].firm)) continue;
      const ff = firmFor(id, b.gw); if (ff.own || !ff.name) continue;
      const g = typeof firmByName === 'function' ? firmByName(ff.name) : null; if (g) tr[b.gw] = { ...(tr[b.gw] || {}), firm: g.id };
    }
    return tr;
  }
  // Leistungen, deren Name/Gewerk/Dauer/Vorgänger von einer Bauweise abhängen
  const chAffected = () => [...new Set(CHS.flatMap((g) => g.opts.flatMap((o) => [...o.on, ...Object.keys(o.ovr || {}), ...Object.keys(o.mul || {})])))];

  /* ---------- reine Hilfsfunktionen (auch im Zweitfenster nutzbar) ---------- */
  const item = (id, cfg) => {
    ctx(cfg); const b = B(id); if (!b) return null;
    const o = cfg && PROF[cfg.type] && PROF[cfg.type].ovr && PROF[cfg.type].ovr[id];
    const r = o ? { ...b, ...o } : { ...b };
    if (cfg && cfg.type && !b.custom) for (const op of chosen(cfg)) {
      if (!b.vb && op.ovr && op.ovr[id]) Object.assign(r, op.ovr[id]);
      const m = op.mul && op.mul[b.vb || id]; if (m) r.d = b.vb ? r.d * m : Math.max(1, Math.round(r.d * m));
    }
    if (cfg && cfg.after && Array.isArray(cfg.after[id])) r.a = cfg.after[id].slice();   // im Assistenten neu gewählter Vorgänger
    const extra = Object.values(CTX.map).filter((c) => (c.custom || c.lib) && (c.b || []).includes(id)).map((c) => c.id);   // eigene Leistungen „davor für“
    if (extra.length) r.a = [...(r.a || []), ...extra];
    // Verweise auf geschossweise aufgeteilte Leistungen zeigen auf deren letztes Teil
    if (r.a && r.a.length) r.a = r.a.map((x) => { const k = Array.isArray(x) ? x[0] : x; if (B(k) || k === 'start') return x; const last = Object.values(CTX.map).filter((i) => i.vb === k).pop(); return last ? (Array.isArray(x) ? [last.id, ...x.slice(1)] : last.id) : x; });
    return r;
  };
  function dur(id, cfg) {
    const it = item(id, cfg); if (!it) return 1; if (it.ms) return 0;
    if (cfg.dur && cfg.dur[id] != null && cfg.dur[id] !== '') return Math.max(1, Math.round(+cfg.dur[id]) || 1);
    const prof = PROF[cfg.type] || {};
    if (it.fix || prof.noScale) return durFix(it);
    const ref = it.sc === 'bau' ? C.ref.bau : C.ref.we;
    const area = +cfg.area || ref;
    const A = it.sc === 'bau' ? area : area / Math.max(1, +cfg.units || 1);
    const f = Math.min(5, Math.max(0.35, Math.pow(A / ref, 0.7)));
    return Math.max(1, Math.round(it.d * f));
  }
  const durFix = (it) => Math.max(1, Math.round(it.d));
  const multi = (cfg) => (+cfg.units || 1) > 1;
  function unitNames(cfg) {
    const n = Math.max(1, +cfg.units || 1), parts = String(cfg.names || '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    const og = (i) => (i ? i + '.OG' : 'EG');
    return Array.from({ length: n }, (_, i) => {
      switch (cfg.naming) {
        case 'gesch': return 'Wohnung ' + og(i);
        case 'ge': return og(i);
        case 'ba': return 'Bauabschnitt ' + (i + 1);
        case 'haus': return 'Haus ' + (i + 1);
        case 'custom': return parts[i] || 'Einheit ' + (i + 1);
        default: return 'Wohnung ' + (i + 1);
      }
    });
  }
  function profSets(type) {
    const p = PROF[type] || {}, rec = p.rec || [];
    const opt = p.opt === '*' ? C.items.map((i) => i.id).filter((id) => !rec.includes(id)) : (p.opt || []);
    return { rec: rec.slice(), opt: opt.slice() };
  }
  function withReq(selArr, id, on, cfg) {
    ctx(cfg); const list = itemsOf(cfg); const s = new Set(selArr);
    if (on) { let x = id; while (x && B(x)) { s.add(x); x = B(x).req; } if (!B(id)) list.filter((i) => i.vb === id).forEach((i) => s.add(i.id)); }
    else { const drop = (x) => { s.delete(x); list.forEach((i) => { if (i.req === x && s.has(i.id)) drop(i.id); }); }; drop(id); }
    return normSel([...s], cfg);
  }
  const defName = (cfg) => (PROF[cfg.type] ? PROF[cfg.type].n : 'Projekt') + (multi(cfg) ? ` (${cfg.units} Einheiten)` : '');

  /* ---------- Soll-Verknüpfungen aus dem Katalog ---------- */
  function expectedLinks(T, cfg) {
    ctx(cfg);
    const K = (c, b) => c + '@' + b;
    const by = new Map();
    for (const t of T) if (t.cat) by.set(K(t.cat, t.blk ?? -1), t);
    const blks = Array.from({ length: multi(cfg) ? +cfg.units : 1 }, (_, i) => i);
    const has = (id, ctx) => (B(id).sc === 'bau' ? by.has(K(id, -1)) : ctx === 'any' ? blks.some((b) => by.has(K(id, b))) : by.has(K(id, ctx)));
    const ctxOf = (id, ctx) => (B(id).sc === 'bau' ? 'any' : ctx);
    function resolve(id, ctx, seen = new Set()) {
      const out = [];
      for (const a of item(id, cfg).a || []) {
        const [pid, type, lag] = Array.isArray(a) ? a : [a, 'FS', 0];
        if (pid === 'start') { out.push({ id: '_start', type, lag }); continue; }
        if (!B(pid) || seen.has(pid)) continue;
        if (has(pid, ctx)) out.push({ id: pid, type, lag });
        else if (!B(pid).nb) { seen.add(pid); for (const r of resolve(pid, ctx, seen)) out.push({ id: r.id, type: 'FS', lag: 0 }); }
      }
      return out;
    }
    const ancM = new Map();
    function anc(id, ctx) {
      const k = id + '|' + ctx; if (ancM.has(k)) return ancM.get(k);
      const s = new Set(); ancM.set(k, s);
      for (const r of resolve(id, ctx)) { if (r.id === '_start') continue; s.add(r.id); for (const x of anc(r.id, ctxOf(r.id, ctx))) s.add(x); }
      return s;
    }
    function reduced(id, ctx) {
      const m = new Map(); for (const r of resolve(id, ctx)) if (!m.has(r.id)) m.set(r.id, r);
      let rs = [...m.values()]; const ids = rs.map((r) => r.id);
      rs = rs.filter((r) => !ids.some((q) => q !== r.id && q !== '_start' && anc(q, ctxOf(q, ctx)).has(r.id)));
      if (rs.length > 1) rs = rs.filter((r) => r.id !== '_start');
      return rs.length ? rs : [{ id: '_start', type: 'FS', lag: 0 }];
    }
    const L = new Map();
    const add = (s, p, type, lag) => { if (!p || p === s) return; let m = L.get(s.uid); if (!m) L.set(s.uid, (m = new Map())); if (!m.has(p.uid)) m.set(p.uid, { type, lag }); };
    const start = by.get(K('_start', -1));
    const regular = T.filter((t) => t.cat && B(t.cat));
    for (const s of regular) {
      const b = s.blk ?? -1, sc = B(s.cat).sc, ctx = sc === 'bau' ? 'any' : b;
      for (const r of reduced(s.cat, ctx)) {
        if (r.id === '_start') add(s, start, 'FS', 0);
        else if (B(r.id).sc === 'bau') add(s, by.get(K(r.id, -1)), r.type, r.lag);
        else if (ctx === 'any') blks.forEach((bb) => add(s, by.get(K(r.id, bb)), r.type, r.lag));
        else add(s, by.get(K(r.id, b)), r.type, r.lag);
      }
      if (sc === 'we' && multi(cfg) && cfg.takt === 'versetzt') {
        for (let bb = b - 1; bb >= 0; bb--) { const p = by.get(K(s.cat, bb)); if (p) { add(s, p, 'FS', 0); break; } }
      }
    }
    const succ = new Map();
    for (const s of regular) for (const pu of (L.get(s.uid) || new Map()).keys()) { if (!succ.has(pu)) succ.set(pu, []); succ.get(pu).push(s); }
    const fertig = T.filter((t) => t.cat === '_fertig');
    for (const f of fertig) regular.filter((t) => t.blk === f.blk && B(t.cat).sc === 'we' && !(succ.get(t.uid) || []).some((x) => x.blk === f.blk)).forEach((t) => add(f, t, 'FS', 0));
    const end = by.get(K('_end', -1));
    if (end) {
      if (multi(cfg)) {
        fertig.forEach((f) => add(end, f, 'FS', 0));
        regular.filter((t) => (t.blk ?? -1) === -1 && !(succ.get(t.uid) || []).length).forEach((t) => add(end, t, 'FS', 0));
      } else regular.filter((t) => !(succ.get(t.uid) || []).length).forEach((t) => add(end, t, 'FS', 0));
      if (!L.get(end.uid) && start) add(end, start, 'FS', 0);
    }
    for (const f of fertig) if (!L.get(f.uid) && start) add(f, start, 'FS', 0);
    return L;
  }

  /* ---------- Plan erzeugen ---------- */
  const mkT = (o) => ({ uid: 0, name: '', dur: 0, cons: null, pct: 0, res: '', gw: '', color: '', notes: '', lvl: 0, preds: [], collapsed: false, cat: '', blk: -1, ph: '', ...o });
  // Firmen-Vorgabe aus dem Leistungskatalog: je Leistung, sonst Stammfirma des Gewerks im Adressbuch
  const firmFor = (id, gw) => (window.Library && window.Library.firmFor ? window.Library.firmFor(baseOf(id), gw) : { name: '', own: false });
  function taskOf(id, cfg, blk, lvl) { const it = item(id, cfg); return mkT({ name: it.n, dur: dur(id, cfg), gw: it.gw, res: firmFor(id, it.gw).name || it.firm || '', notes: it.info || '', cat: id, blk, lvl }); }
  function build(cfg, selArr) {
    materialize(cfg, selArr); ctx(cfg); const sel = new Set(normSel(selArr, cfg)), T = []; let uid = 1;
    const push = (t) => { t.uid = uid++; T.push(t); return t; };
    push(mkT({ name: 'Projektstart', cat: '_start' }));
    const its = itemsOf(cfg).filter((i) => sel.has(i.id));
    const groups = (list, blkFor, lvl, gblk) => {
      for (const ph of C.phases) {
        const l = list.filter((i) => i.ph === ph.k); if (!l.length) continue;
        push(mkT({ name: ph.n, cat: '_grp', ph: ph.k, blk: gblk, lvl, dur: 1 }));
        l.forEach((i) => push(taskOf(i.id, cfg, blkFor(i), lvl + 1)));
      }
    };
    if (!multi(cfg)) {
      groups(its, (i) => (i.sc === 'bau' ? -1 : 0), 0, -1);
      push(mkT({ name: 'Abnahme / Übergabe', cat: '_end' }));
    } else {
      const bau = its.filter((i) => i.sc === 'bau'), we = its.filter((i) => i.sc === 'we');
      if (bau.length) { push(mkT({ name: 'Gebäude / Allgemein', cat: '_bau', dur: 1 })); groups(bau, () => -1, 1, -1); }
      unitNames(cfg).forEach((nm, b) => {
        push(mkT({ name: nm, cat: '_unit', blk: b, dur: 1 }));
        groups(we, () => b, 1, b);
        push(mkT({ name: nm + ' fertiggestellt', cat: '_fertig', blk: b, lvl: 1 }));
      });
      push(mkT({ name: 'Gesamtabnahme / Übergabe', cat: '_end' }));
    }
    const L = expectedLinks(T, cfg);
    T.forEach((t) => { t.preds = [...(L.get(t.uid) || new Map())].map(([u, v]) => ({ uid: u, type: v.type, lag: v.lag })); });
    return { tasks: T, nextUid: uid };
  }

  /* ---------- Live-Änderungen am geöffneten Projekt ---------- */
  const isLive = () => !!(typeof P !== 'undefined' && P && P.assist && P.assist.type && P.tasks.some((t) => t.cat));
  const newT = (o) => { const t = mkT(o); t.uid = P.nextUid++; return t; };
  const endIdx = () => { const i = P.tasks.findIndex((t) => t.cat === '_end'); return i < 0 ? P.tasks.length : i; };
  const blksFor = (id, cfg) => (B(id).sc === 'bau' ? [-1] : multi(cfg) ? Array.from({ length: +cfg.units }, (_, i) => i) : [0]);
  function container(blk, cfg) {
    const T = P.tasks;
    if (!multi(cfg)) return { start: 0, end: T.length - 1, lvl: 0, top: true };
    let i;
    if (blk === -1) {
      i = T.findIndex((t) => t.cat === '_bau');
      if (i < 0) { let at = T.findIndex((t) => t.cat === '_unit'); if (at < 0) at = endIdx(); T.splice(at, 0, newT({ name: 'Gebäude / Allgemein', cat: '_bau', dur: 1, lvl: 0 })); i = at; }
    } else {
      i = T.findIndex((t) => t.cat === '_unit' && t.blk === blk);
      if (i < 0) { const at = endIdx(); T.splice(at, 0, newT({ name: unitNames(cfg)[blk], cat: '_unit', blk, dur: 1, lvl: 0 })); i = at; }
    }
    return { start: i + 1, end: blockEnd(i), lvl: T[i].lvl + 1, top: false };
  }
  function ensureGroup(blk, ph, cfg) {
    const T = P.tasks, c = container(blk, cfg);
    let ins = null;
    for (let j = c.start; j <= c.end; j++) {
      const t = T[j]; if (t.lvl !== c.lvl) continue;
      if (t.cat === '_grp' && t.ph === ph) return j;
      if (ins === null && ((t.cat === '_grp' && PHO[t.ph] > PHO[ph]) || t.cat === '_fertig' || t.cat === '_end')) ins = j;
    }
    if (ins === null) ins = c.end + 1;
    if (c.top) { const e = T.findIndex((t) => t.cat === '_end'); if (e >= 0 && ins > e) ins = e; }
    T.splice(ins, 0, newT({ name: PHN[ph], cat: '_grp', ph, blk: c.top ? -1 : blk, lvl: c.lvl, dur: 1 }));
    return ins;
  }
  function insertItem(id, blk, cfg) {
    const T = P.tasks, g = ensureGroup(blk, B(id).ph, cfg), L = T[g].lvl + 1, e = blockEnd(g);
    let pos = e + 1;
    for (let j = g + 1; j <= e; j++) { const t = T[j]; if (t.lvl === L && t.cat && B(t.cat) && ORDf(t.cat) > ORDf(id)) { pos = j; break; } }
    const t = taskOf(id, cfg, blk, L); t.uid = P.nextUid++;
    // Firma aus „Gewerke & Firmen“ übernehmen, sonst Firma/Unternehmer aus dem Leistungskatalog
    const it = item(id, cfg), tr = (P.trades && P.trades[t.gw]) || {};
    const f = tr.firm && typeof firmById === 'function' ? firmById(tr.firm) : null, ff = firmFor(id, t.gw);
    // Reihenfolge: Firma je Leistung aus dem Katalog → Firma des Gewerks im Projekt → Stammfirma des Gewerks
    if (ff.own && ff.name) t.res = ff.name; else if (f) t.res = f.name; else if (ff.name) t.res = ff.name;
    if (!f && t.gw && !ff.own && ff.name) { const g = typeof firmByName === 'function' ? firmByName(ff.name) : null; if (g) { P.trades = { ...(P.trades || {}) }; P.trades[t.gw] = { ...tr, firm: g.id }; } }
    if (it.craft && t.gw && !tr.craft) { P.trades = { ...(P.trades || {}) }; P.trades[t.gw] = { ...(P.trades[t.gw] || {}), craft: it.craft }; }
    T.splice(pos, 0, t);
  }
  function cleanup() {
    let ch = true;
    while (ch) {
      ch = false; const T = P.tasks;
      for (let i = T.length - 1; i >= 0; i--) {
        const t = T[i];
        if ((t.cat === '_grp' || t.cat === '_bau') && !(i + 1 < T.length && T[i + 1].lvl > t.lvl)) { T.splice(i, 1); ch = true; }
      }
    }
  }
  function applyDiff(before, after) {
    for (const t of P.tasks) {
      const o = before.get(t.uid) || new Map(), n = after.get(t.uid) || new Map();
      for (const u of o.keys()) if (!n.has(u)) t.preds = t.preds.filter((p) => p.uid !== u);
      for (const [u, v] of n) if (!o.has(u) && !t.preds.some((p) => p.uid === u)) t.preds.push({ uid: u, type: v.type, lag: v.lag });
    }
  }
  function presentMap() { ctx(P.assist); const m = {}; for (const t of P.tasks) if (t.cat && B(t.cat)) m[t.cat] = (m[t.cat] || 0) + 1; return m; }
  // Auswahl anwenden: Leistungen einfügen/entfernen, Dauern setzen, Verknüpfungen per Soll-Ist-Vergleich nachführen
  function applySel(target, mutate, durIds, post) {
    const oldCfg = clone(P.assist), before = expectedLinks(P.tasks, oldCfg);
    if (mutate) mutate(P.assist);
    const cfg = P.assist; ctx(cfg);
    const present = [...new Set(P.tasks.filter((t) => t.cat && t.cat[0] !== '_').map((t) => t.cat))];
    const tgt = typeof target === 'function' ? target(present) : target || present;
    materialize(cfg, tgt);
    const T0 = new Set(tgt.filter((id) => B(id)));
    const rem = new Set(present.filter((id) => !T0.has(id)));
    if (rem.size) { P.tasks = P.tasks.filter((t) => !rem.has(t.cat)); cleanup(); }
    ctx(cfg);
    for (const id of [...T0].sort((x, y) => ORDf(x) - ORDf(y))) for (const b of blksFor(id, cfg)) if (!P.tasks.some((t) => t.cat === id && (t.blk ?? -1) === b)) insertItem(id, b, cfg);
    if (durIds) for (const t of P.tasks) if (t.cat && durIds.includes(t.cat)) t.dur = dur(t.cat, cfg);
    if (post) post(cfg);
    applyDiff(before, expectedLinks(P.tasks, cfg));
    sel = new Set();
  }
  const presentIds = () => Object.keys(presentMap());
  // vorhandene Leistungen eines Katalogeintrags an die neue Stelle im Plan setzen (Daten bleiben erhalten)
  function reposition(id, cfg) {
    ctx(cfg); if (!B(id)) return;
    const objs = P.tasks.filter((t) => t.cat === id);
    if (!objs.length) return;
    P.tasks = P.tasks.filter((t) => t.cat !== id); cleanup(); ctx(cfg);
    for (const o of objs) {
      const blk = o.blk ?? -1, g = ensureGroup(blk, B(id).ph, cfg), T = P.tasks, L = T[g].lvl + 1, e = blockEnd(g);
      let pos = e + 1;
      for (let j = g + 1; j <= e; j++) { const t = T[j]; if (t.lvl === L && t.cat && B(t.cat) && ORDf(t.cat) > ORDf(id)) { pos = j; break; } }
      o.lvl = L; T.splice(pos, 0, o);
    }
  }

  // Plan-Leistungen an geänderte Katalogwerte anpassen – nur wo noch der alte Vorschlag steht
  function syncTasks(oldCfg, cfg, ids) {
    const I = new Set(ids);
    for (const t of P.tasks) {
      if (!t.cat || !I.has(t.cat)) continue;
      const a = item(t.cat, oldCfg), b = item(t.cat, cfg); if (!a || !b) continue;
      if (t.name === a.n && b.n !== a.n) t.name = b.n;
      if (t.gw === a.gw && b.gw !== a.gw) { t.gw = b.gw; gwColor(b.gw); }
      if (!b.ms) { const da = dur(t.cat, oldCfg), db = dur(t.cat, cfg); if (t.dur === da && db !== da) t.dur = db; }
    }
  }

  let notifyT = null;
  const listeners = new Set();
  const core = {
    catalog: () => C,
    profSets, withReq, unitNames, defName,
    choiceGroups: (cfg) => CHS.filter((g) => chVisible(g, cfg)).map((g) => ({ k: g.k, ph: g.ph, n: g.n, val: choiceOf(cfg, g.k), opts: chOpts(g, cfg).map((o) => ({ k: o.k, n: o.n })) })),
    choiceAll: (cfg) => choiceAll(clone(cfg)),
    normSel: (arr, cfg) => normSel(clone(arr), clone(cfg)), baseSel: (arr) => baseSel(arr),
    // Gebäude in Worten, z. B. „KG · EG · 1.OG · Staffelgeschoss – Flachdach“
    buildingDesc(cfg) {
      cfg = clone(cfg); const { L, dg, kg } = levelsOf(cfg);
      const roofG = CHM.dachform && chVisible(CHM.dachform, cfg) ? CHM.dachform.opts.find((o) => o.k === choiceOf(cfg, 'dachform')) : null;
      const top = dg === 'aus' ? 'DG ausgebaut' : dg === 'staffel' ? 'Staffelgeschoss' : roofG && roofG.k !== 'flach' ? 'Spitzboden' : '';
      return [...(kg ? ['KG'] : []), ...L, ...(top ? [top] : [])].join(' · ') + (roofG ? ' – ' + roofG.n : '');
    },
    roofFlat: (cfg) => { cfg = clone(cfg); return !!(CHM.dachform && chVisible(CHM.dachform, cfg) && choiceOf(cfg, 'dachform') === 'flach'); },
    roofKnown: (cfg) => { cfg = clone(cfg); return !!(CHM.dachform && chVisible(CHM.dachform, cfg)); },
    setFloors(k, v) {
      if (!isLive()) return false;
      const old = clone(P.assist);
      return act(() => applySel((pres) => normSel(baseSel(pres), P.assist), (c) => { c[k] = v; }, null, (cfg) => {
        // Teilleistungen, die es weiter gibt: Name/Dauer nachführen, wo noch der Vorschlag steht
        ctx(old); const oldIds = Object.keys(CTX.map); ctx(cfg);
        const ids = Object.values(CTX.map).filter((i) => i.vb).map((i) => i.id).filter((id) => oldIds.includes(id));
        syncTasks(old, cfg, ids);
      }));
    },
    suggestPlace: (text, cfg, ph, kind, force) => (window.AiPlace ? window.AiPlace.suggest(String(text), clone(cfg), ph, kind, force) : Promise.reject(new Error('nicht verfügbar'))),
    sugBar: () => window.SugBar,
    aiLabel: () => (window.AiPlace && window.AiPlace.enabled() ? window.AiPlace.label() : ''),
    libAdd: (it) => (window.Library ? window.Library.add(clone(it)) : Promise.reject(new Error('Leistungskatalog nicht geladen'))),
    libItem: (id) => { const x = libList().find((y) => y.id === id); return x ? clone(x) : null; },
    recFor: (cfg) => recFor(clone(cfg)),
    selForChoices: (sel, o, n) => selForChoices(clone(sel), clone(o), clone(n)),
    setChoice(g, k) {
      if (!isLive()) return false;
      const old = clone(P.assist), nc = clone(P.assist); nc.choice = { ...choiceAll(old), [g]: k }; nc.choice = choiceAll(nc);
      return act(() => applySel((pres) => selForChoices(pres, old, nc), (c) => { c.choice = nc.choice; }, null, (cfg) => { ctx(cfg); syncTasks(old, cfg, [...chAffected(), ...Object.values(CTX.map).filter((i) => i.vb).map((i) => i.id)]); }));
    },
    name: (id, cfg) => (item(id, cfg) || {}).n || id,
    dur: (id, cfg) => dur(id, clone(cfg)),
    color: (gw) => (typeof P !== 'undefined' && P && P.gwColors && P.gwColors[gw]) || GW_DEFAULT[gw] || '#9e9e9e',
    fmt: (d) => fmtD(d), iso: (d) => isoD(d), parse: (s) => parseDate(s),
    defaults(type) {
      const p = PROF[type] || PROF.frei;
      const c = { type: p.k, area: p.area, units: p.units, naming: p.naming || 'whg', names: '', takt: p.takt || 'versetzt', start: startOf('week', todayN() + 7) };
      c.floors = p.floors || 1; c.dg = p.dg || 'kalt'; c.flDetail = true;
      c.choice = choiceAll(c);
      const vs = window.CATSCOPE || {}; if (Object.keys(vs).length) c.bezug = { ...vs };   // Vorgabe aus dem Leistungskatalog
      return c;
    },
    status() {
      if (typeof P === 'undefined' || !P) return { hasProject: false, live: false, nTasks: 0, pres: {}, name: '' };
      const lv = isLive();
      return {
        hasProject: true, live: lv, name: P.name, nTasks: P.tasks.length, start: P.start,
        cfg: lv ? { ...P.assist, start: P.start } : null, pres: lv ? presentMap() : {},
        end: P.tasks.length && CAL ? fmtD(CAL.peDay) : '–', wd: CAL ? CAL.pe - toW(P.start) : 0,
      };
    },
    estimate(cfg, selArr) {
      cfg = clone(cfg); const b = build(cfg, clone(selArr)); const save = P;
      try { P = { start: snapWork(cfg.start), tasks: b.tasks, cal: save && save.cal }; const c = schedule(); return { n: b.tasks.length, end: fmtD(c.peDay), wd: c.pe - toW(snapWork(cfg.start)) }; }
      finally { P = save; }
    },
    async create(cfg, selArr, name) {
      cfg = clone(cfg); const b = build(cfg, clone(selArr));
      cfg.start = snapWork(cfg.start);
      await flushSave();
      const p = await api.create({ name: String(name || defName(cfg)), start: cfg.start, nextUid: b.nextUid, tasks: b.tasks, assist: cfg, trades: tradesFor(cfg, selArr) });
      await openProject(p.id); await refreshProjectList();
      toast(`Projekt „${p.name}“ mit ${b.tasks.length} Leistungen erstellt.`);
      return true;
    },
    regenerate(cfg, selArr) {
      cfg = clone(cfg); selArr = clone(selArr); cfg.start = snapWork(cfg.start);
      const ok = act(() => { const b = build(cfg, selArr); P.tasks = b.tasks; P.nextUid = b.nextUid; P.assist = cfg; P.start = cfg.start; P.trades = tradesFor(cfg, selArr, P.trades); sel = new Set(); });
      if (ok) { view.start = null; render(); refreshProjectList(); }
      return ok;
    },
    toggle(id, on, merge) {
      if (!isLive()) return false;
      const cfg = P.assist, target = withReq(presentIds(), id, on, cfg);
      if (on && !target.includes(id)) target.push(id);
      if (on || !merge) return act(() => applySel(target));
      // Dauer der entfallenden Leistungen auf ihre Hauptleistung umlegen (je Einheit)
      const gone = P.tasks.filter((t) => t.cat && !target.includes(t.cat) && merge[t.cat]).map((t) => ({ to: merge[t.cat], blk: t.blk ?? -1, d: t.dur }));
      return act(() => applySel(target, null, null, () => {
        for (const g of gone) {
          const tt = P.tasks.find((t) => t.cat === g.to && (t.blk ?? -1) === g.blk) || P.tasks.find((t) => t.cat === g.to);
          if (!tt) continue;
          if (segList(tt)) tt.segs[tt.segs.length - 1].d += g.d;
          tt.dur += g.d;
          P.assist.dur = P.assist.dur || {}; P.assist.dur[g.to] = tt.dur;
        }
      }));
    },
    // Hauptleistungen für Leistungen, die beim Abwählen entfallen: { entfallend: hauptId } – nur wenn die Hauptleistung gewählt bleibt
    mergeTargets(selArr, id, cfg) {
      cfg = clone(cfg); const after = new Set(withReq(clone(selArr), id, false, cfg)), out = {};
      ctx(cfg);
      for (const x of selArr) {
        if (after.has(x)) continue; const it = B(x); if (!it || it.ms) continue;
        let m = it.m || (it.vb && B(it.vb) && B(it.vb).m); const seen = new Set();
        while (m && !after.has(m) && !seen.has(m)) { seen.add(m); m = B(m) && B(m).m; }   // Hauptleistung entfällt auch: eine Ebene höher
        if (m && after.has(m)) out[x] = m;
      }
      return out;
    },
    setSelection(arr) { if (!isLive()) return false; arr = clone(arr); return act(() => applySel(arr)); },
    setDur(id, n) {
      if (!isLive()) return false;
      return act(() => applySel(null, (c) => { c.dur = c.dur || {}; if (n == null) delete c.dur[id]; else c.dur[id] = n; }, [id]));
    },
    addCustom(it) {
      if (!isLive()) return false; it = clone(it);
      return act(() => applySel((pres) => [...pres, it.id], (c) => { c.custom = c.custom || []; c.custom.push(it); }));
    },
    updateCustom(id, f) {
      if (!isLive()) return false; f = clone(f);
      return act(() => {
        applySel(null, (c) => { const x = (c.custom || []).find((y) => y.id === id); if (x) Object.assign(x, f); }, 'd' in f ? [id] : null);
        for (const t of P.tasks) if (t.cat === id) { if (f.n != null) t.name = f.n; if (f.gw != null) { t.gw = f.gw; gwColor(f.gw); } }
      });
    },
    removeCustom(id) {
      if (!isLive()) return false;
      return act(() => applySel((pres) => pres.filter((x) => x !== id), (c) => { c.custom = (c.custom || []).filter((y) => y.id !== id); if (c.dur) delete c.dur[id]; }));
    },
    applyPhases(data) {
      if (!isLive()) return false; data = clone(data);
      const phases = new Set(data.phases || []);
      const oldList = itemsOf(clone(P.assist)), oldCfg = clone(P.assist);
      return act(() => applySel(
        (pres) => { const inPh = (id) => { const it = itemsOf(P.assist).find((i) => i.id === id) || oldList.find((i) => i.id === id); return it && phases.has(it.ph); }; return [...pres.filter((id) => !inPh(id)), ...(data.sel || [])]; },
        (c) => {
          const phOf = (id) => (oldList.find((i) => i.id === id) || (data.custom || []).find((i) => i.id === id) || {}).ph;
          c.custom = (c.custom || []).filter((x) => !phases.has(x.ph)).concat((data.custom || []).filter((x) => phases.has(x.ph)));
          c.dur = c.dur || {}; for (const k of Object.keys(c.dur)) if (phases.has(phOf(k))) delete c.dur[k];
          Object.assign(c.dur, data.dur || {});
          if (data.choice) c.choice = { ...choiceAll(c), ...data.choice };
        },
        itemsOf(P.assist).concat(data.custom || []).filter((i) => phases.has(i.ph)).map((i) => i.id),
        (cfg) => syncTasks(oldCfg, cfg, chAffected()),
      ));
    },
    items: (cfg) => itemsOf(clone(cfg)),
    effA: (id, cfg) => { const it = item(id, clone(cfg)); return it ? (it.a || []).map((x) => (Array.isArray(x) ? x[0] : x)) : []; },
    // Bezug einer Leistung in diesem Projekt umstellen (Gebäude <-> je Einheit). Die Leistung wird dafür neu angelegt:
    // aus einer Zeile für das Gebäude werden Zeilen je Einheit und umgekehrt (eigene Dauer bleibt erhalten).
    setBezug(id, sc) {
      if (!isLive()) return false;
      const base = (itemsOf0(clone(P.assist)).find((i) => i.id === id) || {}).sc; if (!base) return false;
      const had = P.tasks.some((t) => t.cat === id);
      return act(() => {
        if (had) applySel((pres) => pres.filter((x) => x !== id));
        applySel(had ? (pres) => [...pres, id] : null, (c) => { const b = { ...(c.bezug || {}) }; if (sc === base) delete b[id]; else b[id] = sc; c.bezug = b; });
      });
    },
    patchCfg(patch, movedId) {
      if (!isLive()) return false; patch = clone(patch);
      return act(() => applySel(null, (c) => { Object.assign(c, patch); }, null, movedId ? (cfg) => reposition(movedId, cfg) : null));
    },
    dinSuggest(text) {
      const s = ' ' + String(text || '').toLowerCase().replace(/[^a-zäöüß0-9 ]+/g, ' ') + ' ';
      if (s.trim().length < 3) return [];
      const res = (window.DIN_ATV || []).map(([din, title, gw, kw]) => {
        let sc = 0;
        for (const w of kw.split(' ')) if (w.length > 2 && s.includes(w)) sc += w.length + (s.includes(' ' + w) ? 2 : 0);
        for (const w of title.toLowerCase().split(/[^a-zäöüß]+/)) if (w.length > 4 && s.includes(w.slice(0, Math.max(5, w.length - 3)))) sc += 3;
        return { din, title, gw, sc };
      }).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc);
      return res.slice(0, 3);
    },
    gewerke() { return [...new Set([...C.items.map((i) => i.gw), ...(window.DIN_ATV || []).map((x) => x[2]), ...(typeof P !== 'undefined' && P ? P.tasks.map((t) => t.gw).filter(Boolean) : [])])].sort((a, b) => a.localeCompare(b, 'de')); },
    async presets() { return fetch('/api/presets').then(j); },
    async savePreset(pr) { pr = clone(pr); return fetch('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pr) }).then(j); },
    async deletePreset(id) { return fetch('/api/presets/' + encodeURIComponent(id), { method: 'DELETE' }).then(j); },
    setParam(k, v) {
      if (!isLive()) return false;
      v = clone(v); const old = clone(P.assist);
      if (k === 'start') return act(() => { P.start = snapWork(v); P.assist.start = P.start; });
      if (k === 'area') {
        let ch = 0, kept = 0;
        const ok = act(() => {
          P.assist.area = v;
          for (const t of P.tasks) if (t.cat && B(t.cat) && !B(t.cat).ms) {
            if (t.dur === dur(t.cat, old)) { const nd = dur(t.cat, P.assist); if (nd !== t.dur) { t.dur = nd; ch++; } } else kept++;
          }
        });
        return ok ? { ch, kept } : false;
      }
      if (k === 'takt') return act(() => { const before = expectedLinks(P.tasks, old); P.assist.takt = v; applyDiff(before, expectedLinks(P.tasks, P.assist)); });
      if (k === 'naming' || k === 'names') {
        return act(() => {
          const on = unitNames(old); P.assist[k] = v; const nn = unitNames(P.assist);
          for (const t of P.tasks) {
            if (t.cat === '_unit' && t.name === on[t.blk]) t.name = nn[t.blk];
            if (t.cat === '_fertig' && t.name === on[t.blk] + ' fertiggestellt') t.name = nn[t.blk] + ' fertiggestellt';
          }
        });
      }
      return false;
    },
    setUnits(n) {
      if (!isLive() || !multi(P.assist) || n < 2) return false;
      return act(() => {
        const old = clone(P.assist), cur = +old.units;
        const before = expectedLinks(P.tasks, old);
        if (n > cur) {
          const weIds = itemsOf(P.assist).filter((i) => i.sc === 'we' && P.tasks.some((t) => t.cat === i.id)).map((i) => i.id);
          P.assist.units = n;
          const names = unitNames(P.assist);
          for (let b = cur; b < n; b++) {
            const at = endIdx(); P.tasks.splice(at, 0, newT({ name: names[b], cat: '_unit', blk: b, dur: 1 }));
            weIds.forEach((id) => insertItem(id, b, P.assist));
            const u = P.tasks.findIndex((t) => t.cat === '_unit' && t.blk === b);
            P.tasks.splice(blockEnd(u) + 1, 0, newT({ name: names[b] + ' fertiggestellt', cat: '_fertig', blk: b, lvl: 1 }));
          }
        } else if (n < cur) {
          for (let b = cur - 1; b >= n; b--) { const u = P.tasks.findIndex((t) => t.cat === '_unit' && t.blk === b); if (u >= 0) P.tasks.splice(u, blockEnd(u) - u + 1); }
          P.tasks = P.tasks.filter((t) => !(t.blk >= n && (t.cat || '').length));
          P.assist.units = n;
        }
        applyDiff(before, expectedLinks(P.tasks, P.assist));
        sel = new Set();
      });
    },
    insertSingle(id, cfg) {
      cfg = clone(cfg); const it = item(id, cfg);
      let at, lvl;
      if (cur.r < vis.length) { at = vis[cur.r]; lvl = P.tasks[at].lvl; }
      else { at = P.tasks.length; const last = vis.length ? P.tasks[vis[vis.length - 1]] : null; lvl = last ? last.lvl : 0; }
      linkMsg = ''; let uid;
      const ok = act(() => {
        const t = newTask(it.n, dur(id, cfg)); t.gw = it.gw; t.notes = it.info || ''; t.lvl = lvl;
        P.tasks.splice(at, 0, t); uid = t.uid; sel = new Set([uid]);
        if (autoLink) autoLinkInserted(at);
        gwColor(it.gw);
      });
      if (ok) { cur.r = rowOfIdx(idxOfUid(uid)); anchorR = cur.r; updateSel(); ensureVisible(cur.r); flashLinkMsg(); }
      return ok;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    notifySoon() { clearTimeout(notifyT); notifyT = setTimeout(() => { for (const fn of [...listeners]) { try { fn(); } catch (e) { listeners.delete(fn); } } }, 40); },
  };
  core.build = build; core.expectedLinks = expectedLinks;
  window.AssistCore = core;

  /* =====================================================================
     Oberfläche
     ===================================================================== */
  window.AssistUI = {
    mount(root, core, opt = {}) {
      const LSx = {
        get(k, d) { try { const v = localStorage.getItem('gantt.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
        set(k, v) { try { localStorage.setItem('gantt.' + k, JSON.stringify(v)); } catch { /* egal */ } },
      };
      const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const cl = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
      let draft = LSx.get('assistDraft', null);
      let shownLive = new Set();   // im verknüpften Projekt nach oben geholte Zusatzleistungen
      const shownSet = (live) => (live ? shownLive : new Set((draft && draft.shown) || []));
      const setShown = (live, set) => { if (live) shownLive = set; else { draft.shown = [...set]; saveDraft(); } };
      let pending = null, msg = '', msgErr = false, projName = '', moreOpen = false;
      let askRm = null, rmPref = null;   // Rückfrage beim Abwählen: Zeit verkürzen oder auf Hauptleistung umlegen
      let cform = null;
      let moved = null;          // { id, choice, origA } – Auswahl „folgt auf“ nach dem Verschieben
      let dragIt = null;          // Formular „eigene Leistung“: { ph, edit, n, gw, din, sc, d, a, b }
      let pform = null;          // Formular „Vorlage speichern“: { name, scope, phases:Set }
      let presets = [], presetsErr = '', presetsOpen = LSx.get('assistPresetsOpen', true);
      const saveDraft = () => LSx.set('assistDraft', draft);
      const say = (m, err = false) => { msg = m; msgErr = err; };
      const newId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const loadPresets = async () => { try { presets = await core.presets(); presetsErr = ''; } catch (e) { presetsErr = 'Vorlagen konnten nicht geladen werden: ' + e.message; } render(); };

      function state() {
        const st = core.status();
        const live = st.live;
        const cfg = live ? st.cfg : draft ? draft.cfg : null;
        const sel = new Set(live ? Object.keys(st.pres) : draft ? draft.sel : []);
        return { st, live, cfg, sel };
      }
      const phaseName = (k) => (core.catalog().phases.find((p) => p.k === k) || {}).n || k;

      function cformHtml(cfg, items) {
        const f = cform, sug = core.dinSuggest(f.n);
        const opts = (v, none) => `<option value="">${none}</option>` + items.filter((i) => i.id !== f.edit).map((i) => `<option value="${i.id}"${v === i.id ? ' selected' : ''}>${esc(phaseName(i.ph).split(' ')[0])} · ${esc(core.name(i.id, cfg))}</option>`).join('');
        return `<div class="as-cf" data-cfbox="1"><div class="as-cfh">${f.edit ? 'Eigene Leistung bearbeiten' : 'Eigene Leistung in „' + esc(phaseName(f.ph)) + '“'}</div>
          <input data-cf="n" value="${esc(f.n)}" placeholder="Bezeichnung, z. B. Brandschutzklappen montieren">
          ${core.aiLabel() && core.sugBar() ? core.sugBar().html(f.sg || (f.sg = core.sugBar().state(null)), 'as-sg') : ''}
          <div class="as-sug" id="asSug">${sugHtml(sug)}</div>
          <div class="as-form">
            <label>Gewerk</label><input data-cf="gw" list="asGwList" value="${esc(f.gw)}" placeholder="aus Vorschlag oder eigenes">
            <label>DIN (VOB/C)</label><input data-cf="din" value="${esc(f.din)}" placeholder="z. B. 18382">
            <label>Abschnitt</label><select data-cf="ph">${core.catalog().phases.map((p) => `<option value="${p.k}"${f.ph === p.k ? ' selected' : ''}>${esc(p.n)}</option>`).join('')}</select>
            <label>Bezug</label><select data-cf="sc"><option value="we"${f.sc === 'we' ? ' selected' : ''}>je Einheit / Wohnung</option><option value="bau"${f.sc === 'bau' ? ' selected' : ''}>einmal für das Gebäude</option></select>
            <label>Dauer</label><div class="as-in"><input data-cf="d" type="number" min="1" value="${esc(f.d)}"><span>AT</span></div>
            <label>Folgt auf</label><select data-cf="a">${opts(f.a, 'automatisch – nach der letzten gewählten Leistung im Abschnitt')}</select>
            <label>Muss fertig sein vor</label><select data-cf="b">${opts(f.b, '– keine Vorgabe –')}</select>
          </div>${f.edit ? '' : `<label class="cb" style="margin-top:6px"><input type="checkbox" data-cf="tolib"${f.tolib ? ' checked' : ''}> auch im Leistungskatalog speichern – für alle Projekte</label>`}
          <div class="as-btns"><button class="btn primary sm" data-a="cf-ok">${f.edit ? 'Übernehmen' : 'Hinzufügen'}</button><button class="btn sm" data-a="cf-no">Abbrechen</button></div>
          <datalist id="asGwList">${core.gewerke().map((g) => `<option value="${esc(g)}">`).join('')}</datalist></div>`;
      }
      function sugHtml(sug) {
        if (!sug.length) return '<span class="as-sugh">Gewerk-Vorschläge nach VOB/C erscheinen beim Tippen der Bezeichnung.</span>';
        return '<span class="as-sugh">Wahrscheinlich:</span>' + sug.map((x, k) => `<button class="as-chip${k === 0 ? ' best' : ''}" data-sug="${k}" title="ATV DIN ${x.din} – ${esc(x.title)}"><span class="gwdot" style="background:${core.color(x.gw)}"></span>${esc(x.gw)} · DIN ${x.din}<small>${esc(x.title)}</small></button>`).join('');
      }
      function movedHtml(cfg, items, sel) {
        const ids = items.map((i) => i.id), k = ids.indexOf(moved.id);
        const selIds = ids.filter((x) => sel.has(x) && x !== moved.id);
        const above = selIds.filter((x) => ids.indexOf(x) < k).slice(-4).reverse(), below = selIds.filter((x) => ids.indexOf(x) > k).slice(0, 3);
        const nm = (x) => esc(core.name(x, cfg));
        const o = (v, l) => `<option value="${v}"${String(moved.choice) === v ? ' selected' : ''}>${l}</option>`;
        const catTxt = (C0 = core.effA(moved.id, { ...cfg, after: { ...(cfg.after || {}), [moved.id]: undefined } })) => C0.filter((x) => x !== 'start').map((x) => esc(core.name(x, cfg))).join(', ') || 'Projektstart';
        return `<div class="as-mvbox">„${nm(moved.id)}“ folgt auf: <select data-mvsel="1">`
          + (above.length ? `<optgroup label="Darüber">${above.map((x, j) => o(x, nm(x) + (j === 0 ? ' (direkt darüber)' : ''))).join('')}</optgroup>` : '')
          + (below.length ? `<optgroup label="Darunter">${below.map((x) => o(x, nm(x))).join('')}</optgroup>` : '')
          + `<optgroup label="Sonst">${o('cat', 'Katalog-Standard: ' + catTxt())}${o('start', 'frei – nur Projektstart')}</optgroup></select>`
          + `<button class="btn sm" data-a="mv-ok">OK</button>${moved.note ? `<div class="as-mvnote">${esc(moved.note)}</div>` : ''}</div>`;
      }
      // neue Vorgänger-Vorgabe; verhindert Zirkelbezüge, indem Nachfolger auf die bisherigen Vorgänger umgehängt werden
      function afterPatch(cfg, id, choice, origA) {
        const after = { ...(cfg.after || {}) }; const bridged = [];
        if (choice === 'cat') delete after[id]; else after[id] = [choice];
        if (choice !== 'cat' && choice !== 'start') {
          const cfg2 = { ...cfg, after };
          const dep = (x, m, seen = new Set()) => { if (x === m) return true; if (seen.has(x) || x === 'start') return false; seen.add(x); return core.effA(x, cfg2).some((y) => dep(y, m, seen)); };
          for (const it of core.items(cfg)) {
            if (it.id === id) continue;
            const a = core.effA(it.id, cfg2); if (!a.includes(id)) continue;
            if (it.id === choice || dep(choice, it.id)) { after[it.id] = [...a.filter((x) => x !== id), ...origA.filter((x) => x !== it.id)]; bridged.push(core.name(it.id, cfg)); }
          }
        }
        return { after, bridged };
      }
      function setMovedChoice(choice, alsoOrder) {
        const { live, cfg } = state();
        const { after, bridged } = afterPatch(cfg, moved.id, choice, moved.origA);
        moved.choice = choice; moved.note = bridged.length ? `Damit kein Zirkelbezug entsteht, folgt „${bridged.join('“, „')}“ jetzt auf die bisherigen Vorgänger.` : '';
        const patch = { after, ...(alsoOrder || {}) };
        if (live) { if (core.patchCfg(patch, alsoOrder ? moved.id : null) === false) say('Änderung nicht möglich – siehe Hinweis im Plan.', true); }
        else { Object.assign(draft.cfg, patch); saveDraft(); }
      }
      function dropItem(id, targetId, before, targetPh) {
        const { cfg, sel } = state();
        const items = core.items(cfg), ids = items.map((i) => i.id).filter((x) => x !== id);
        const ph = targetId ? items.find((i) => i.id === targetId).ph : targetPh;
        let at = targetId ? ids.indexOf(targetId) + (before ? 0 : 1) : (() => { let last = -1; ids.forEach((x, k) => { if (items.find((i) => i.id === x).ph === ph) last = k; }); if (last >= 0) return last + 1; const first = ids.findIndex((x) => core.catalog().phases.findIndex((p) => p.k === items.find((i) => i.id === x).ph) > core.catalog().phases.findIndex((p) => p.k === ph)); return first < 0 ? ids.length : first; })();
        ids.splice(at, 0, id);
        const basePh = (core.catalog().items.find((i) => i.id === id) || (cfg.custom || []).find((c) => c.id === id) || {}).ph;
        const phase = { ...(cfg.phase || {}) }; if (ph === basePh) delete phase[id]; else phase[id] = ph;
        const origA = core.effA(id, cfg);
        const k = ids.indexOf(id), selAbove = ids.slice(0, k).filter((x) => sel.has(x));
        moved = { id, origA, choice: 'cat' };
        const choice = selAbove.length ? selAbove[selAbove.length - 1] : 'cat';
        setMovedChoice(choice, { order: ids, phase });
        say(`„${core.name(id, cfg)}“ verschoben.`);
      }
      function pformHtml() {
        const f = pform, C2 = core.catalog();
        return `<div class="as-cf"><div class="as-cfh">Als Vorlage speichern</div>
          <input data-pf="name" value="${esc(f.name)}" placeholder="Name der Vorlage, z. B. Bad Standard Firma X">
          <label class="cb"><input type="radio" name="pfs" data-pf="scope" value="all"${f.scope === 'all' ? ' checked' : ''}> Ganzes Gebäude – Maßnahme, Eckdaten und alle Leistungen</label>
          <label class="cb"><input type="radio" name="pfs" data-pf="scope" value="phases"${f.scope === 'phases' ? ' checked' : ''}> Nur Abschnitte:</label>
          <div class="as-phs${f.scope === 'phases' ? '' : ' dis'}">${C2.phases.map((p) => `<label class="cb"><input type="checkbox" data-pfph="${p.k}"${f.phases.has(p.k) ? ' checked' : ''}${f.scope === 'phases' ? '' : ' disabled'}> ${esc(p.n)}</label>`).join('')}</div>
          <div class="as-hint" style="margin-top:4px">Gespeichert werden Bauweise, Auswahl, eingestellte Dauern und eigene Leistungen – für alle Projekte verfügbar.</div>
          <div class="as-btns"><button class="btn primary sm" data-a="pf-ok">Speichern</button><button class="btn sm" data-a="pf-no">Abbrechen</button></div></div>`;
      }

      function render() {
        const { st, live, cfg, sel } = state();
        const CC = core.catalog();
        const body0 = root.querySelector('.as-body'); const sc = body0 ? body0.scrollTop : 0;
        const focus = document.activeElement && root.contains(document.activeElement) ? { sel: document.activeElement.dataset.dur ? `[data-dur="${document.activeElement.dataset.dur}"]` : null } : null;
        if (!opt.docked) document.title = 'Planungsassistent' + (st.name ? ' – ' + st.name : '');
        let h = `<div class="as"><div class="as-head"><span class="as-t">Planungsassistent</span>`
          + (opt.docked ? `<button class="as-ib" data-a="popout" title="In eigenem Browserfenster öffnen">⧉</button><button class="as-ib" data-a="close" title="Schließen">×</button>` : '')
          + '</div>';
        h += `<div class="as-mode${live ? ' live' : ''}">` + (live
          ? `<b>Verknüpft</b> mit „${esc(st.name)}“ – jede Änderung wirkt sofort im Plan (Strg+Z im Plan macht sie rückgängig).`
          : st.nTasks
            ? `<b>Entwurf</b> für ein neues Projekt. „${esc(st.name)}“ wurde nicht mit dem Assistenten erstellt – einzelne Leistungen kannst du dort mit <b>＋</b> an der markierten Zeile einfügen.`
            : '<b>Entwurf</b> – Maßnahme oder Vorlage wählen, Leistungen anpassen, Plan erzeugen.') + '</div>';
        h += '<div class="as-body">';
        h += `<section><h4><span>1</span>Maßnahme / Gebäudetyp</h4><div class="as-types">${CC.profiles.map((p) => `<button class="as-type${cfg && cfg.type === p.k ? ' on' : ''}" data-type="${p.k}"><span class="ic">${p.ic}</span><b>${esc(p.n)}</b><small>${esc(p.desc)}</small></button>`).join('')}</div>`;
        // Meine Vorlagen
        h += `<details class="as-pre"${presetsOpen ? ' open' : ''}><summary>Meine Vorlagen (${presets.length})</summary>`;
        if (presetsErr) h += `<div class="as-msg err">${esc(presetsErr)}</div>`;
        h += presets.length ? presets.map((pr) => `<div class="as-pr"><div class="as-n">${esc(pr.name)}<small>${pr.scope === 'all' ? 'Ganzes Gebäude' + (pr.data && pr.data.cfg ? ' · ' + esc((CC.profiles.find((p) => p.k === pr.data.cfg.type) || {}).n || '') : '') : 'Abschnitte: ' + esc(pr.phases.map(phaseName).join(', '))} · ${(pr.data && pr.data.sel ? pr.data.sel.length : 0)} Leistungen</small></div><button class="btn sm" data-pre="${pr.id}">Anwenden</button><button class="as-ib sm" data-predel="${pr.id}" title="Vorlage löschen">✕</button></div>`).join('')
          : '<div class="as-hint" style="margin:4px 0">Noch keine eigenen Vorlagen. Stelle unten Leistungen zusammen und speichere sie mit „Als Vorlage speichern“.</div>';
        h += '</details></section>';
        if (cfg) {
          const m = (+cfg.units || 1) > 1;
          const NAMING = [['whg', 'Wohnung 1, 2, …'], ['gesch', 'Wohnung EG, 1.OG, …'], ['ge', 'EG, 1.OG, …'], ['ba', 'Bauabschnitt 1, 2, …'], ['haus', 'Haus 1, 2, …'], ['custom', 'eigene Namen …']];
          h += `<section><h4><span>2</span>Eckdaten</h4><div class="as-form">
            <label>Wohnfläche gesamt</label><div class="as-in"><input type="number" min="5" max="100000" data-p="area" value="${esc(cfg.area)}"><span>m²</span></div>
            <label>Einheiten</label><div class="as-in"><input type="number" min="1" max="40" data-p="units" value="${esc(cfg.units)}"><span>Wohnungen / Abschnitte</span></div>
            <label>Geschosse</label><div class="as-in"><input type="number" min="1" max="30" data-p="floors" value="${esc(cfg.floors || 1)}"><span>Vollgeschosse: EG, 1.OG … (ohne Keller und Dach)</span></div>
`
            // Keller und Dachform gehören zur Gebäudegeometrie – hier zusätzlich zur Auswahl im jeweiligen Abschnitt
            + core.choiceGroups(cfg).filter((g) => g.k === 'keller' || g.k === 'dachform').sort((a, b) => (a.k === 'keller' ? -1 : 1)).map((g) => `<label>${g.k === 'keller' ? 'Keller' : 'Dachform'}</label><select data-choice="${g.k}">${g.opts.map((o) => `<option value="${o.k}"${o.k === g.val ? ' selected' : ''}>${esc(o.n)}</option>`).join('')}</select>`).join('')
            + (() => {   // was über dem obersten Vollgeschoss liegt – abhängig von der Dachform
              const flat = core.roofFlat(cfg), known = core.roofKnown(cfg);
              const O = flat ? [['kalt', 'nichts – Flachdach direkt auf dem obersten Vollgeschoss'], ['staffel', 'Staffelgeschoss (zurückgesetzt, eigenes Flachdach)']]
                : known ? [['kalt', 'Dachraum nicht ausgebaut (Spitzboden)'], ['aus', 'Dachgeschoss ausgebaut (Wohnraum im Dach)']]
                  : [['kalt', 'nichts / Dachraum nicht ausgebaut'], ['aus', 'Dachgeschoss ausgebaut'], ['staffel', 'Staffelgeschoss']];
              const cur = O.some(([v]) => v === cfg.dg) ? cfg.dg : 'kalt';
              return `<label>Darüber</label><select data-p="dg" title="Was liegt über dem obersten Vollgeschoss?">${O.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`
                + `<label></label><div class="as-bldg">Gebäude: <b>${esc(core.buildingDesc(cfg))}</b></div>`;
            })()
            + `<label></label><label class="cb"><input type="checkbox" data-p="flDetail"${cfg.flDetail ? ' checked' : ''}> Rohbau und Treppen geschossweise aufteilen</label>`
            + (m ? `<label>Bezeichnung</label><select data-p="naming">${NAMING.map(([v, l]) => `<option value="${v}"${cfg.naming === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`
              + (cfg.naming === 'custom' ? `<label></label><input data-p="names" value="${esc(cfg.names || '')}" placeholder="z. B. Whg. links, Whg. rechts">` : '')
              + `<label>Ablauf</label><select data-p="takt"><option value="versetzt"${cfg.takt === 'versetzt' ? ' selected' : ''}>nacheinander – jedes Gewerk folgt</option><option value="parallel"${cfg.takt === 'parallel' ? ' selected' : ''}>parallel – alle gleichzeitig</option></select>` : '')
            + `<label>Baubeginn</label><input type="date" data-p="start" value="${core.iso(cfg.start)}">
            </div><div class="as-hint">AT = Arbeitstage je Leistung${m ? ' und Einheit' : ''}. Richtwerte ergeben sich aus der Fläche; ein eigener Wert ist farbig markiert – Feld leeren setzt den Richtwert zurück.</div></section>`;

          const items = core.items(cfg);
          const { opt: op } = core.profSets(cfg.type), rec = core.recFor(cfg), R = new Set(rec), O = new Set(op.filter((x) => !rec.includes(x))), nU = m ? +cfg.units : 1;
          const ovr = cfg.dur || {};
          const SH = shownSet(live);
          const isExtra = (id) => !R.has(id) && !O.has(id);
          const up = (id) => !isExtra(id) || sel.has(id) || SH.has(id) || items.find((i) => i.id === id).custom;
          const hideRest = (it) => it.ch && !sel.has(it.id);
          const CG = core.choiceGroups(cfg);
          const row = (it, where) => {
            const on = sel.has(it.id), cnt = live ? st.pres[it.id] || 0 : 0, of = it.sc === 'bau' ? 1 : nU, part = live && cnt > 0 && cnt < of;
            const tag = it.custom ? (it.lib ? '<i class="t lib" title="aus dem Leistungskatalog">Katalog</i>' : '<i class="t own">eigene</i>') : it.lib ? '<i class="t lib">Katalog</i>' : it.ch && sel.has(it.id) ? '<i class="t bw">Bauweise</i>' : R.has(it.id) ? '<i class="t rec">empfohlen</i>' : O.has(it.id) ? '<i class="t opt">optional</i>' : '';
            const st2 = live ? (part ? `<i class="t part" title="nur in ${cnt} von ${of} Einheiten">${cnt}/${of}</i>` : on ? '<i class="t in">im Plan</i>' : '') : '';
            const meta = [it.gw, it.din ? 'DIN ' + it.din : ''].filter(Boolean).join(' · ');
            const bzBtn = m && !it.ms && !it.custom ? `<button class="as-bz${it.sc === 'bau' ? ' bau' : ''}${it.scBase ? ' mod' : ''}" data-bz="${it.id}" title="${it.sc === 'bau' ? 'Einmal für das ganze Gebäude' : 'Für jede Einheit / Wohnung einzeln'}${it.scBase ? ' (in diesem Projekt geändert)' : ''} – klicken zum Umstellen">${it.sc === 'bau' ? 'Gebäude' : 'je Whg.'}</button>` : '';
            const isMod = ovr[it.id] != null && ovr[it.id] !== '';
            if (where === 'rest') return `<div class="as-it rest"><button class="as-mv" data-up="${it.id}" title="In „${esc(phaseName(it.ph))}“ übernehmen und auswählen">↑</button>`
              + `<span class="gwdot" style="background:${core.color(it.gw)}"></span><span class="as-n">${esc(core.name(it.id, cfg))}<small>${esc(phaseName(it.ph))} · ${esc(meta)}</small></span>`
              + (it.ms ? '<span class="as-d">◆</span>' : `<span class="as-d">${core.dur(it.id, cfg)} AT</span>`) + '</div>';
            return `<label class="as-it${on ? ' on' : ''}${moved && moved.id === it.id ? ' moved' : ''}" data-row="${it.id}"><span class="as-grip" data-grip="${it.id}" title="Ziehen, um die Reihenfolge zu ändern">⠿</span><input type="checkbox" data-id="${it.id}"${on ? ' checked' : ''}${part ? ' data-part="1"' : ''}>`
              + `<span class="gwdot" style="background:${core.color(it.gw)}"></span><span class="as-n">${esc(core.name(it.id, cfg))}<small>${esc(meta)}${bzBtn}</small></span>`
              + (it.ms ? '<span class="as-d">◆</span>' : `<span class="as-d"><input class="as-dur${isMod ? ' mod' : ''}" type="number" min="1" max="999" data-dur="${it.id}" value="${core.dur(it.id, cfg)}" title="${isMod ? 'Eigener Wert – Feld leeren für Richtwert' : 'Richtwert – zum Ändern überschreiben'}"> AT</span>`)
              + (st2 || tag) + (st2 && it.ch ? '<i class="t bw" title="durch die gewählte Bauweise">Bauweise</i>' : '')
              + (isExtra(it.id) && !it.custom && !it.ch ? `<button class="as-mv" data-down="${it.id}" title="Abwählen und zurück zu „Weitere Leistungen“">↓</button>` : '')
              + (it.custom ? `<button class="as-ib sm" data-cedit="${it.id}" title="Bearbeiten">✎</button><button class="as-ib sm" data-cdel="${it.id}" title="Eigene Leistung löschen">✕</button>` : '')
              + (!live && st.nTasks ? `<button class="as-plus" data-ins="${it.id}" title="In „${esc(st.name)}“ an der markierten Zeile einfügen">＋</button>` : '') + '</label>';
          };
          h += `<section><h4><span>3</span>Leistungen<span class="as-cnt">${sel.size} gewählt</span></h4><div class="as-tools"><button class="btn sm" data-a="rec">Empfehlung übernehmen</button>${live ? '' : '<button class="btn sm" data-a="none">Keine</button>'}<button class="btn sm" data-a="pf-open">Als Vorlage speichern …</button></div>`;
          if (pform) h += pformHtml();
          for (const ph of CC.phases) {
            const its = items.filter((i) => i.ph === ph.k && up(i.id) && !(isExtra(i.id) && hideRest(i) && !SH.has(i.id)));
            const cg = CG.filter((g) => g.ph === ph.k);
            h += `<div class="as-ph" data-phk="${ph.k}"><div class="as-phh">${esc(ph.n)}<small>${its.filter((i) => sel.has(i.id)).length}/${its.length}</small><button class="as-add" data-cadd="${ph.k}" title="Eigene Leistung in diesem Abschnitt hinzufügen">＋ eigene</button></div>`
              + (cg.length ? `<div class="as-chs">${cg.map((g) => `<label class="as-ch"><span>${esc(g.n)}</span><select data-choice="${g.k}">${g.opts.map((o) => `<option value="${o.k}"${o.k === g.val ? ' selected' : ''}>${esc(o.n)}</option>`).join('')}</select></label>`).join('')}</div>` : '')
              + its.map((it) => row(it, 'up') + (moved && moved.id === it.id ? movedHtml(cfg, items, sel) : '')).join('') + (cform && !cform.edit && cform.ph === ph.k ? cformHtml(cfg, items) : '')
              + (cform && cform.edit && items.find((i) => i.id === cform.edit && i.ph === ph.k) ? cformHtml(cfg, items) : '') + '</div>';
          }
          const rest = items.filter((i) => !up(i.id) && !hideRest(i));
          if (rest.length) h += `<details class="as-more"${moreOpen ? ' open' : ''}><summary>Weitere Leistungen (${rest.length}) – mit ↑ übernehmen</summary>${rest.map((it) => row(it, 'rest')).join('')}</details>`;
          h += '</section>';
        } else {
          h += '<div class="as-hint" style="margin-top:12px">Wähle oben eine Maßnahme oder eine eigene Vorlage – der Assistent schlägt die typischen Leistungen mit Gewerk, Reihenfolge und Dauer vor.</div>';
        }
        h += '</div><div class="as-foot">';
        if (askRm && cfg) {
          h += askRmHtml(cfg);
        } else if (pending) {
          h += `<div class="as-pend">${esc(pending.msg)}<div><button class="btn primary" data-a="pend-ok">${esc(pending.ok || 'Neu erzeugen')}</button><button class="btn" data-a="pend-no">Abbrechen</button></div></div>`;
        } else if (cfg && live) {
          h += `<div class="as-sum">Projektende <b>${esc(st.end)}</b> · ${st.wd} Arbeitstage · ${st.nTasks} Leistungen</div><div class="as-btns"><button class="btn" data-a="regen">Plan neu erzeugen …</button></div>`;
        } else if (cfg) {
          const e = sel.size ? core.estimate(cfg, [...sel]) : null;
          h += `<div class="as-sum">${e ? `Vorschau: Ende ca. <b>${esc(e.end)}</b> · ${e.wd} Arbeitstage · ${e.n} Leistungen` : 'Keine Leistungen gewählt'}</div>`
            + `<div class="as-btns"><input class="as-name" data-a="pname" value="${esc(projName || core.defName(cfg))}" title="Name des neuen Projekts"><button class="btn primary" data-a="create"${sel.size ? '' : ' disabled'}>Neues Projekt erstellen</button>`
            + (st.hasProject && st.nTasks === 0 ? `<button class="btn" data-a="adopt"${sel.size ? '' : ' disabled'}>In „${esc(st.name)}“ erzeugen</button>` : '') + '</div>';
        }
        if (msg) h += `<div class="as-msg${msgErr ? ' err' : ''}">${esc(msg)}</div>`;
        h += '</div></div>';
        root.innerHTML = h;
        root.querySelectorAll('input[data-part]').forEach((x) => { x.indeterminate = true; });
        const body = root.querySelector('.as-body'); if (body) body.scrollTop = sc;
        if (focus && focus.sel) { const el = root.querySelector(focus.sel); if (el) el.focus(); }
      }

      // ----- Zustandsänderungen (Entwurf oder live) -----
      function setDurFor(id, raw) {
        const { live, cfg } = state();
        const n = raw === '' || raw == null ? null : Math.max(1, Math.round(+raw) || 1);
        if (live) { if (core.setDur(id, n) === false) say('Änderung nicht möglich.', true); }
        else { draft.cfg.dur = draft.cfg.dur || {}; if (n == null) delete draft.cfg.dur[id]; else draft.cfg.dur[id] = n; saveDraft(); }
        void cfg;
      }
      function autoAfter(cfg, sel, ph) {
        const items = core.items(cfg).filter((i) => i.ph === ph && sel.has(i.id) && (!cform || i.id !== cform.edit));
        if (items.length) return [items[items.length - 1].id];
        const first = core.items(cfg).find((i) => i.ph === ph && !i.custom);
        return first && first.a ? first.a.slice() : ['start'];
      }
      function submitCustom() {
        const { live, cfg, sel } = state(), f = cform;
        if (!f.n.trim()) { say('Bitte eine Bezeichnung eingeben.', true); render(); return; }
        const it = { id: f.edit || newId(), n: f.n.trim(), gw: f.gw.trim() || (core.dinSuggest(f.n)[0] || {}).gw || '', din: f.din.trim(), ph: f.ph, sc: f.sc, d: Math.max(1, Math.round(+f.d) || 1), fix: 1, custom: 1,
          a: f.a ? [f.a] : autoAfter(cfg, sel, f.ph), b: f.b ? [f.b] : [] };
        if (f.edit) {
          const fields = { n: it.n, gw: it.gw, din: it.din, sc: it.sc, d: it.d, a: it.a, b: it.b };
          if (live) { if (core.updateCustom(f.edit, fields) === false) say('Änderung nicht möglich.', true); else say(`„${it.n}“ geändert.`); }
          else { const x = draft.cfg.custom.find((y) => y.id === f.edit); Object.assign(x, fields); saveDraft(); say(`„${it.n}“ geändert.`); }
        } else if (f.tolib) {
          it.id = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); it.lib = 1;   // gleiche ID wie im Katalog – keine Doppelung
          core.libAdd({ id: it.id, n: it.n, gw: it.gw, din: it.din, ph: it.ph, sc: it.sc, d: it.d, a: f.a ? [f.a] : [], b: it.b, src: 'Planungsassistent' }).then(() => { say(`„${it.n}“ im Leistungskatalog gespeichert.`); render(); }, (e) => { say('Leistungskatalog: ' + e.message, true); render(); });
        }
        if (f.edit) { /* oben erledigt */ } else if (live) { if (core.addCustom(it) === false) say('Hinzufügen nicht möglich – siehe Hinweis im Plan.', true); else say(`„${it.n}“ hinzugefügt.`); }
        else { draft.cfg.custom = draft.cfg.custom || []; draft.cfg.custom.push(it); draft.sel = [...draft.sel, it.id]; saveDraft(); say(`„${it.n}“ hinzugefügt.`); }
        cform = null; render();
      }
      function presetData(cfg, sel, scope, phases) {
        const items = core.items(cfg), ph = new Set(phases);
        const inScope = (id) => { const it = items.find((i) => i.id === id); return it && (scope === 'all' || ph.has(it.ph)); };
        const dur = {}; for (const [k, v] of Object.entries(cfg.dur || {})) if (inScope(k)) dur[k] = v;
        const custom = (cfg.custom || []).filter((c) => scope === 'all' || ph.has(c.ph));
        const s2 = [...sel].filter(inScope);
        const chAll = core.choiceAll(cfg);
        if (scope === 'all') return { cfg: { choice: chAll, type: cfg.type, area: cfg.area, units: cfg.units, naming: cfg.naming, names: cfg.names, takt: cfg.takt, dur, custom, order: cfg.order, phase: cfg.phase, after: cfg.after, bezug: cfg.bezug }, sel: s2 };
        const choice = {}; for (const g of core.choiceGroups(cfg)) if (ph.has(g.ph)) choice[g.k] = chAll[g.k];
        return { phases: [...ph], sel: s2, dur, custom, choice };
      }
      function applyPreset(pr) {
        const { st, live, cfg } = state(), d = cl(pr.data || {});
        if (pr.scope === 'all') {
          const c = { ...core.defaults(d.cfg.type), ...d.cfg, start: live ? st.start : (cfg && cfg.start) || core.defaults(d.cfg.type).start };
          if (live) { pending = { msg: `Plan nach Vorlage „${pr.name}“ neu erzeugen? Der aktuelle Plan wird ersetzt (im Plan mit Strg+Z rückgängig).`, ok: 'Vorlage anwenden', run: () => core.regenerate(c, d.sel) }; return; }
          draft = { cfg: c, sel: d.sel }; projName = pr.name; saveDraft(); say(`Vorlage „${pr.name}“ geladen.`); return;
        }
        if (!cfg) { const c = core.defaults('frei'); draft = { cfg: c, sel: [] }; }
        if (live) { const ok = core.applyPhases({ phases: pr.phases, sel: d.sel, dur: d.dur, custom: d.custom, choice: d.choice }); say(ok === false ? 'Vorlage konnte nicht angewendet werden – siehe Hinweis im Plan.' : `Vorlage „${pr.name}“ auf ${pr.phases.map(phaseName).join(', ')} angewendet.`, ok === false); return; }
        const ph = new Set(pr.phases), items = core.items(draft.cfg);
        const inPh = (id) => { const it = items.find((i) => i.id === id); return it && ph.has(it.ph); };
        draft.cfg.custom = (draft.cfg.custom || []).filter((c) => !ph.has(c.ph)).concat(d.custom || []);
        draft.cfg.dur = draft.cfg.dur || {}; for (const k of Object.keys(draft.cfg.dur)) if (inPh(k)) delete draft.cfg.dur[k];
        Object.assign(draft.cfg.dur, d.dur || {});
        if (d.choice) draft.cfg.choice = { ...core.choiceAll(draft.cfg), ...d.choice };
        draft.sel = [...draft.sel.filter((id) => !inPh(id) && !(d.custom || []).some((c) => c.id === id)), ...d.sel];
        saveDraft(); say(`Vorlage „${pr.name}“ auf ${pr.phases.map(phaseName).join(', ')} angewendet.`);
      }

      // Abwählen mit Rückfrage: entfallende Dauer verkürzt die Gesamtzeit oder wird auf die Hauptleistung umgelegt
      function removeItem(id, down) {
        const { live, cfg, sel } = state();
        const map = core.mergeTargets([...sel], id, cfg);
        if (Object.keys(map).length && !rmPref) { askRm = { id, down, map }; return; }
        doRemove(id, down, rmPref === 'merge' ? map : null);
      }
      function doRemove(id, down, map) {
        const { live, cfg } = state();
        if (down) { const SH = shownSet(live); SH.delete(id); setShown(live, SH); }
        if (live) { if (core.toggle(id, false, map) === false) say('Änderung nicht möglich – siehe Hinweis im Plan.', true); else say(map ? `„${core.name(id, cfg)}“ entfernt – Dauer umgelegt.` : `„${core.name(id, cfg)}“ entfernt.`); }
        else {
          if (map) { draft.cfg.dur = draft.cfg.dur || {}; const add = {}; for (const [x, m] of Object.entries(map)) add[m] = (add[m] ?? core.dur(m, draft.cfg)) + core.dur(x, draft.cfg); Object.assign(draft.cfg.dur, add); }
          draft.sel = core.withReq(draft.sel, id, false, draft.cfg); saveDraft();
          say(map ? `„${core.name(id, cfg)}“ entfernt – Dauer umgelegt.` : `„${core.name(id, cfg)}“ entfernt.`);
        }
      }
      function askRmHtml(cfg) {
        const a = askRm, rows = Object.entries(a.map);
        const tot = rows.reduce((x, [k]) => x + core.dur(k, cfg), 0);
        return `<div class="as-pend as-rm"><b>„${esc(core.name(a.id, cfg))}“ entfernen</b> – ${tot} AT${(+cfg.units || 1) > 1 ? ' je Einheit' : ''} entfallen. Gesamtzeit verkürzen oder die Dauer auf die Hauptleistung umlegen?
          <ul>${rows.map(([k, m]) => `<li>${esc(core.name(k, cfg))} <small>${core.dur(k, cfg)} AT</small> → ${esc(core.name(m, cfg))}</li>`).join('')}</ul>
          <div><button class="btn" data-a="rm-cut">Gesamtzeit verkürzen</button><button class="btn primary" data-a="rm-merge">Auf Hauptleistung umlegen</button><button class="btn" data-a="rm-no">Abbrechen</button></div>
          <label class="cb"><input type="checkbox" id="rmRemember"> für weitere Leistungen so verfahren (bis zum Neuladen)</label></div>`;
      }

      root.addEventListener('click', async (e) => {
        const t = e.target;
        if (cform && cform.sg && t.closest('.as-sg')) {
          const f = cform, keys = ['ph', 'gw', 'din', 'sc', 'd', 'a', 'b'];
          core.sugBar().click(e, f.sg, {
            text: () => f.n,
            snap: () => Object.fromEntries(keys.map((k) => [k, f[k]])),
            fetch: (kind, force) => core.suggestPlace(f.n, state().cfg, f.sg.own ? f.sg.own.ph : f.ph, kind, force),
            apply: (r) => { if (cform !== f) return; if (!r) Object.assign(f, f.sg.own || {}); else Object.assign(f, { ph: r.ph, gw: r.gw || f.gw, din: r.din || '', sc: r.sc || f.sc, d: r.d || f.d, a: r.a[0] || '', b: r.b[0] || '' }); },
            redraw: () => { if (cform === f) render(); },
          });
          return;
        }
        const sugB = t.closest('[data-sug]');
        if (sugB && cform) { e.preventDefault(); const x = core.dinSuggest(cform.n)[+sugB.dataset.sug]; if (x) { cform.gw = x.gw; cform.din = x.din; } render(); return; }
        const mvU = t.closest('[data-up]'), mvD = t.closest('[data-down]');
        if (mvU || mvD) {
          e.preventDefault(); const { live, cfg } = state(); const id = (mvU || mvD).dataset[mvU ? 'up' : 'down'], SH = shownSet(live);
          if (!mvU) { removeItem(id, true); render(); return; }
          SH.add(id); setShown(live, SH);
          if (live) { if (core.toggle(id, !!mvU) === false) say('Änderung nicht möglich – siehe Hinweis im Plan.', true); else say(mvU ? `„${core.name(id, cfg)}“ übernommen.` : `„${core.name(id, cfg)}“ zurück zu „Weitere Leistungen“.`); }
          else { draft.sel = core.withReq(draft.sel, id, !!mvU, draft.cfg); saveDraft(); say(mvU ? `„${core.name(id, cfg)}“ in „${phaseName(core.items(cfg).find((i) => i.id === id).ph)}“ übernommen.` : `„${core.name(id, cfg)}“ zurück zu „Weitere Leistungen“.`); }
          render(); return;
        }
        const bzb = t.closest('[data-bz]');
        if (bzb) {
          e.preventDefault(); const { live, cfg } = state(); const id = bzb.dataset.bz, it = core.items(cfg).find((i) => i.id === id); if (!it) return;
          const to = it.sc === 'bau' ? 'we' : 'bau', base = it.scBase || it.sc, nm = core.name(id, cfg), txt = to === 'bau' ? 'einmal für das Gebäude' : 'je Einheit / Wohnung';
          if (live) { if (core.setBezug(id, to) === false) say('Änderung nicht möglich – siehe Hinweis im Plan.', true); else say(`„${nm}“ jetzt ${txt}. Mit Strg+Z im Plan rückgängig.`); }
          else { const b = { ...(draft.cfg.bezug || {}) }; if (to === base) delete b[id]; else b[id] = to; draft.cfg.bezug = b; saveDraft(); say(`„${nm}“ jetzt ${txt}.`); }
          render(); return;
        }
        const ins = t.closest('[data-ins]');
        if (ins) { e.preventDefault(); const { cfg } = state(); const ok = core.insertSingle(ins.dataset.ins, cfg); say(ok ? `„${core.name(ins.dataset.ins, cfg)}“ eingefügt.` : 'Einfügen nicht möglich.', !ok); render(); return; }
        const cadd = t.closest('[data-cadd]');
        if (cadd) { e.preventDefault(); cform = { ph: cadd.dataset.cadd, edit: null, n: '', gw: '', din: '', sc: 'we', d: 3, a: '', b: '', tolib: true }; pform = null; render(); const el = root.querySelector('[data-cf="n"]'); if (el) el.focus(); return; }
        const ced = t.closest('[data-cedit]');
        if (ced) { e.preventDefault(); const { cfg } = state(); const it = (cfg.custom || []).find((c) => c.id === ced.dataset.cedit); if (it) cform = { ph: it.ph, edit: it.id, n: it.n, gw: it.gw || '', din: it.din || '', sc: it.sc, d: it.d, a: (it.a || [])[0] || '', b: (it.b || [])[0] || '' }; render(); return; }
        const cdel = t.closest('[data-cdel]');
        if (cdel) {
          e.preventDefault(); const id = cdel.dataset.cdel, { live } = state();
          if (live) { if (core.removeCustom(id) === false) say('Löschen nicht möglich.', true); }
          else { draft.cfg.custom = (draft.cfg.custom || []).filter((c) => c.id !== id); draft.sel = draft.sel.filter((x) => x !== id); if (draft.cfg.dur) delete draft.cfg.dur[id]; saveDraft(); }
          render(); return;
        }
        const pre = t.closest('[data-pre]');
        if (pre) { const pr = presets.find((x) => x.id === pre.dataset.pre); if (pr) applyPreset(pr); render(); return; }
        const pdel = t.closest('[data-predel]');
        if (pdel) {
          const pr = presets.find((x) => x.id === pdel.dataset.predel);
          if (pr && pendingDel !== pr.id) { pendingDel = pr.id; say(`Vorlage „${pr.name}“ löschen? Zum Bestätigen nochmals auf ✕ klicken.`, true); render(); return; }
          pendingDel = null; try { await core.deletePreset(pdel.dataset.predel); say('Vorlage gelöscht.'); } catch (err) { say('Fehler: ' + err.message, true); }
          await loadPresets(); return;
        }
        if (t.closest('label') && t.closest('label').querySelector('[data-pf]')) return;
        const ty = t.closest('[data-type]');
        if (ty) {
          const k = ty.dataset.type, { st, live, cfg } = state(); say(''); cform = null;
          if (live) {
            if (cfg.type !== k) {
              const n = core.catalog().profiles.find((p) => p.k === k).n;
              pending = { msg: `Plan nach „${n}“ neu erzeugen? Der aktuelle Plan wird ersetzt – im Plan mit Strg+Z rückgängig zu machen.`, run: () => { const c = core.defaults(k); c.start = st.start; return core.regenerate(c, core.recFor(c)); } };
            }
          } else {
            const c = core.defaults(k); if (draft && draft.cfg && draft.cfg.start) c.start = draft.cfg.start;
            if (draft && draft.cfg && draft.cfg.custom && draft.cfg.custom.length) c.custom = draft.cfg.custom;   // eigene Leistungen behalten
            draft = { cfg: c, sel: core.recFor(c) }; projName = ''; saveDraft();
          }
          render(); return;
        }
        const b = t.closest('[data-a]'); if (!b || b.tagName === 'INPUT') return;
        const a = b.dataset.a, { live, cfg, sel } = state();
        switch (a) {
          case 'popout': opt.onPopout && opt.onPopout(); return;
          case 'close': opt.onClose && opt.onClose(); return;
          case 'rec': say(''); if (live) { if (core.setSelection([...core.recFor(cfg), ...[...sel].filter((id) => (cfg.custom || []).some((c) => c.id === id))]) === false) say('Änderung nicht möglich.', true); } else { draft.sel = [...core.recFor(cfg), ...draft.sel.filter((id) => (draft.cfg.custom || []).some((c) => c.id === id))]; saveDraft(); } break;
          case 'none': draft.sel = []; saveDraft(); break;
          case 'cf-ok': submitCustom(); return;
          case 'mv-ok': moved = null; break;
          case 'cf-no': cform = null; break;
          case 'pf-open': pform = { name: '', scope: 'all', phases: new Set() }; cform = null; break;
          case 'pf-no': pform = null; break;
          case 'pf-ok': {
            const f = pform;
            if (!f.name.trim()) { say('Bitte einen Namen für die Vorlage eingeben.', true); break; }
            if (f.scope === 'phases' && !f.phases.size) { say('Bitte mindestens einen Abschnitt wählen.', true); break; }
            const pr = { name: f.name.trim(), scope: f.scope, phases: [...f.phases], data: presetData(cfg, sel, f.scope, [...f.phases]) };
            try { await core.savePreset(pr); say(`Vorlage „${pr.name}“ gespeichert – in allen Projekten verfügbar.`); pform = null; presetsOpen = true; } catch (err) { say('Speichern fehlgeschlagen: ' + err.message, true); }
            await loadPresets(); return;
          }
          case 'regen': pending = { msg: 'Plan aus Eckdaten und gewählten Leistungen neu erzeugen? Von Hand geänderte Dauern, Verknüpfungen und eigene Vorgänge im Plan gehen dabei verloren (im Plan mit Strg+Z rückgängig).', run: () => core.regenerate(cfg, [...sel]) }; break;
          case 'pend-ok': { const p = pending; pending = null; const ok = p.run(); say(ok === false ? 'Nicht möglich – siehe Hinweis im Plan.' : 'Plan erzeugt.', ok === false); break; }
          case 'pend-no': pending = null; break;
          case 'rm-cut': case 'rm-merge': {
            const a = askRm; askRm = null; if (!a) break;
            const rem = root.querySelector('#rmRemember'); if (rem && rem.checked) rmPref = b.dataset.a === 'rm-merge' ? 'merge' : 'cut';
            doRemove(a.id, a.down, b.dataset.a === 'rm-merge' ? a.map : null); break;
          }
          case 'rm-no': askRm = null; break;
          case 'create': b.disabled = true; say('Projekt wird erstellt …'); render(); try { await core.create(cfg, [...sel], projName || core.defName(cfg)); say('Projekt erstellt – Änderungen hier wirken jetzt direkt im Plan.'); } catch (err) { say('Fehler: ' + err.message, true); } break;
          case 'adopt': { const ok = core.regenerate(cfg, [...sel]); say(ok ? 'Plan erzeugt.' : 'Nicht möglich.', !ok); break; }
          default: return;
        }
        render();
      });
      let pendingDel = null;
      root.addEventListener('change', (e) => {
        const t = e.target, { live, cfg } = state();
        if (t.dataset.dur) { setDurFor(t.dataset.dur, t.value); render(); return; }
        if (t.dataset.choice) {
          const g = t.dataset.choice, k = t.value, gn = (core.choiceGroups(cfg).find((x) => x.k === g) || {}).n || g; say('');
          if (live) { if (core.setChoice(g, k) === false) say('Änderung nicht möglich – siehe Hinweis im Plan.', true); else say(`${gn}: ${t.selectedOptions[0].text} – Leistungen angepasst.`); }
          else {
            const old = cl(draft.cfg); draft.cfg.choice = { ...core.choiceAll(old), [g]: k };
            draft.cfg.choice = core.choiceAll(draft.cfg);
            draft.sel = core.selForChoices(draft.sel, old, draft.cfg); saveDraft();
            say(`${gn}: ${t.selectedOptions[0].text} – Leistungen angepasst.`);
          }
          render(); return;
        }
        if (t.dataset.mvsel && moved) { setMovedChoice(t.value === 'cat' || t.value === 'start' ? t.value : t.value); render(); return; }
        if (t.dataset.cf && cform) { cform[t.dataset.cf] = t.type === 'checkbox' ? t.checked : t.value; if (t.dataset.cf === 'ph') { render(); return; } if (t.dataset.cf === 'sc' || t.dataset.cf === 'a' || t.dataset.cf === 'b') return; return; }
        if (t.dataset.pf && pform) { if (t.dataset.pf === 'scope') { pform.scope = t.value; render(); } return; }
        if (t.dataset.pfph && pform) { if (t.checked) pform.phases.add(t.dataset.pfph); else pform.phases.delete(t.dataset.pfph); return; }
        if (t.dataset.id) {
          const id = t.dataset.id, on = t.checked; say('');
          { const SH = shownSet(live); if (!SH.has(id)) { SH.add(id); setShown(live, SH); } }
          if (!on) { removeItem(id, false); render(); return; }
          if (live) { if (core.toggle(id, on) === false) say('Änderung nicht möglich – siehe Hinweis im Plan.', true); }
          else { draft.sel = core.withReq(draft.sel, id, on, draft.cfg); saveDraft(); }
          render(); return;
        }
        const k = t.dataset.p; if (!k) return;
        let v = t.value;
        if (k === 'area') v = Math.max(5, +v || cfg.area);
        if (k === 'units') v = Math.max(1, Math.min(40, Math.round(+v || 1)));
        if (k === 'start') { v = core.parse(v); if (v == null) return; }
        if (k === 'floors') v = Math.max(1, Math.min(30, Math.round(+v || 1)));
        if (k === 'flDetail') v = t.checked;
        if (k === 'floors' || k === 'dg' || k === 'flDetail') {
          say('');
          if (live) { if (core.setFloors(k, v) === false) say('Änderung nicht möglich – siehe Hinweis im Plan.', true); }
          else { draft.cfg[k] = v; draft.sel = core.normSel(core.baseSel(draft.sel), draft.cfg); saveDraft(); }
          render(); return;
        }
        say('');
        if (live) {
          if (k === 'units') {
            if (v === +cfg.units) return;
            if (+cfg.units > 1 && v > 1) { if (core.setUnits(v) === false) say('Änderung nicht möglich.', true); else say(`Jetzt ${v} Einheiten.`); }
            else { const { sel } = state(); pending = { msg: 'Beim Wechsel zwischen einer und mehreren Einheiten wird der Plan neu erzeugt (im Plan mit Strg+Z rückgängig).', run: () => core.regenerate({ ...cfg, units: v }, [...sel]) }; }
          } else {
            const r = core.setParam(k, v);
            if (r === false) say('Änderung nicht möglich.', true);
            else if (k === 'area' && r) say(`${r.ch} Dauern angepasst` + (r.kept ? `, ${r.kept} von Hand geänderte beibehalten.` : '.'));
          }
        } else { draft.cfg[k] = v; saveDraft(); }
        render();
      });
      root.addEventListener('input', (e) => {
        const t = e.target;
        if (t.dataset.a === 'pname') projName = t.value;
        if (t.dataset.pf === 'name' && pform) pform.name = t.value;
        if (t.dataset.cf && cform && t.type !== 'checkbox') {
          cform[t.dataset.cf] = t.value;
          if (t.dataset.cf === 'n') { const box = root.querySelector('#asSug'); if (box) box.innerHTML = sugHtml(core.dinSuggest(t.value)); }
        }
      });
      root.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.dataset.dur) { e.preventDefault(); e.target.blur(); }
        if (e.key === 'Enter' && e.target.dataset.cf === 'n') { e.preventDefault(); submitCustom(); }
        if (e.key === 'Escape' && cform) { cform = null; render(); }
      });
      root.addEventListener('toggle', (e) => {
        if (!e.target.classList) return;
        if (e.target.classList.contains('as-more')) moreOpen = e.target.open;
        if (e.target.classList.contains('as-pre')) { presetsOpen = e.target.open; LSx.set('assistPresetsOpen', presetsOpen); }
      }, true);

      const win = root.ownerDocument.defaultView;
      root.addEventListener('mousedown', (e) => {
        const g = e.target.closest('[data-grip]'); if (!g || e.button !== 0) return;
        e.preventDefault(); dragIt = { id: g.dataset.grip, y0: e.clientY, moved: false, target: null };
        root.classList.add('as-dragging');
      });
      win.addEventListener('mousemove', (e) => {
        if (!dragIt) return;
        if (!dragIt.moved && Math.abs(e.clientY - dragIt.y0) < 4) return;
        dragIt.moved = true;
        let ln = root.querySelector('.as-dropline'); if (!ln) { ln = root.ownerDocument.createElement('div'); ln.className = 'as-dropline'; root.querySelector('.as-body').appendChild(ln); }
        const body = root.querySelector('.as-body'), bb = body.getBoundingClientRect();
        if (e.clientY < bb.top + 30) body.scrollTop -= 12; else if (e.clientY > bb.bottom - 30) body.scrollTop += 12;
        const el = root.ownerDocument.elementFromPoint(e.clientX, e.clientY);
        const r = el && el.closest('[data-row]'), ph = el && el.closest('[data-phk]');
        if (r && r.dataset.row !== dragIt.id && !r.closest('.as-more')) {
          const rb = r.getBoundingClientRect(), before = e.clientY < rb.top + rb.height / 2;
          dragIt.target = { id: r.dataset.row, before };
          ln.style.top = ((before ? rb.top : rb.bottom) - bb.top + body.scrollTop - 1) + 'px'; ln.style.display = 'block';
        } else if (ph && !r) {
          const pb = ph.getBoundingClientRect();
          dragIt.target = { ph: ph.dataset.phk };
          ln.style.top = (pb.bottom - bb.top + body.scrollTop - 4) + 'px'; ln.style.display = 'block';
        }
      });
      win.addEventListener('mouseup', () => {
        if (!dragIt) return;
        const d = dragIt; dragIt = null; root.classList.remove('as-dragging');
        const ln = root.querySelector('.as-dropline'); if (ln) ln.remove();
        if (!d.moved || !d.target) return;
        dropItem(d.id, d.target.id || null, !!d.target.before, d.target.ph || null);
        render();
      });

      const unsub = core.subscribe(() => { if (cform || pform) { const a = document.activeElement; if (a && root.contains(a) && (a.dataset.cf || a.dataset.pf)) return; } render(); });
      render(); loadPresets();
      return { render, destroy() { unsub(); root.innerHTML = ''; } };
    },
  };
})();
