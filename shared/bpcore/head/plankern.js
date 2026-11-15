'use strict';
/* =====================================================================
   Planungs-Kern – die Fragen des Planungsassistenten ohne den Terminplan
   ---------------------------------------------------------------------
   Seit dem 15.11.2026 im Baukasten (vorher der erste Teil von gantt/public/assist.js), damit der Assistent in allen Apps
   dieselbe Logik benutzt: welche Leistungen ein Gebäudetyp hat (plankatalog.js + eigene Leistungen + Leistungskatalog
   des Büros), Geschosse und Einheiten, die Auswahlgruppen (Tragwerk, Dachform …) und was sie an- und abwählen,
   empfohlene Leistungen, Dauern nach Fläche. Reine Rechnung auf den Angaben (cfg) – kennt keinen Plan und keine Oberfläche.
   Der Bauzeitenplan baut daraus seinen Plan (gantt/public/assist.js: AssistCore).

   Geladen nach plankatalog.js (window.CATALOG); window.LIBRARY (Leistungskatalog des Büros) ist freiwillig.
   window.PlanKern: alle Funktionen unten; PlanKern.CTX = der gerade gesetzte Kontext (nach ctx(cfg)).
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
    const pf = cfg && cfg.type && PROF[cfg.type];   // Gruppe und Reihenfolge aus „Assistent einrichten“ (je Gebäudetyp), Projekt geht vor
    const phO0 = { ...((pf && pf.phase) || {}), ...((cfg && cfg.phase) || {}) }, phO = Object.keys(phO0).length ? phO0 : null;
    const ord = cfg && Array.isArray(cfg.order) ? cfg.order : pf && Array.isArray(pf.order) ? pf.order : null;
    const cid = new Set(cus.map((c) => c.id)), lib = libList().filter((x) => !cid.has(x.id)).map(libToItem);
    if (!cus.length && !phO && !ord && !lib.length) return expandFloors(C.items, cfg);
    let all = [...C.items, ...lib, ...cus];
    if (phO) all = all.map((i) => (phO[i.id] && phO[i.id] !== i.ph ? { ...i, ph: phO[i.id] } : i));
    const base = new Map(all.map((i, k) => [i.id, k]));
    // Reihenfolge: auch je Geschoss aufgeteilte Leistungen (id~w0 …) stehen in cfg.order – dann zählt deren erste Stelle
    const key = (i) => { if (!ord) return 10000 + base.get(i.id); let k = ord.indexOf(i.id); if (k < 0) k = ord.findIndex((x) => typeof x === 'string' && x.startsWith(i.id + '~')); return k >= 0 ? k : 10000 + base.get(i.id); };
    const out = []; for (const ph of C.phases) out.push(...all.filter((i) => i.ph === ph.k).sort((a, b) => key(a) - key(b)));
    const known = new Set(C.phases.map((p) => p.k)); out.push(...all.filter((i) => !known.has(i.ph)).map((i) => ({ ...i, ph: C.phases[C.phases.length - 1].k })));
    return nachOrder(expandFloors(out, cfg), ord);
  }
  // nach dem Aufteilen in Geschosse die gespeicherte Reihenfolge noch einmal anwenden: eine verschobene Leistung
  // (z. B. „Pultdach richten“ nach „Mauerwerk 1.OG“) steht dann auch zwischen den Geschossen an ihrem Platz.
  // Leistungen, die nicht in der Reihenfolge stehen, bleiben hinter ihrem Vorgänger in der Liste.
  function nachOrder(list, ord) {
    if (!ord || !ord.length) return list;
    const pos = new Map(ord.map((x, k) => [x, k]));
    if (!list.some((i) => i.vb && pos.has(i.id))) return list;   // nur nötig, wenn Geschoss-Leistungen einzeln verschoben wurden
    const out = [];
    for (const ph of [...new Set(list.map((i) => i.ph))]) {
      let last = -1, n = 0;
      const g = list.filter((i) => i.ph === ph).map((it) => { const p = pos.get(it.id); if (p != null) last = p; n++; return { it, k: p != null ? p : last + n / 1e6 }; });
      out.push(...g.sort((a, b) => a.k - b.k).map((x) => x.it));
    }
    return out;
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
  // Bauweise je Geschoss bei „gemischt“: Vorgabe EG massiv, darüber Holz
  function floorTw(cfg, L) {
    const f = cfg.flTw || {}, TW = ['massiv', 'stb', 'holz', 'bsp'];
    const tw = CHM.tragwerk && live(CHM.tragwerk, cfg) ? choiceOf(cfg, 'tragwerk') : 'massiv';
    if (tw !== 'misch') return L.map(() => (TW.includes(tw) ? tw : 'massiv'));   // einheitlich: Angaben je Geschoss gelten nur bei „gemischt“
    return L.map((l, k) => (TW.includes(f[l]) ? f[l] : k === 0 ? 'massiv' : 'holz'));
  }
  // Umbau: Rohbau gehört zum Anbau bzw. zur Aufstockung – Zusatz am Namen der Geschoss-Teile
  function erwSuf(cfg, id) {
    const erw = CHM.erweiterung && chVisible(CHM.erweiterung, cfg) ? choiceOf(cfg, 'erweiterung') : '';
    if (erw === 'anbau') return ' Anbau';
    if (erw === 'aufstock') return id === 'holz_mont' ? ' Aufstockung' : '';
    if (erw === 'beides') return id === 'mauer' ? ' Anbau' : ' Aufstockung';
    return '';
  }
  function expandFloors(list, cfg) {
    const tw = cfg && cfg.type && CHM.tragwerk && live(CHM.tragwerk, cfg) ? choiceOf(cfg, 'tragwerk') : 'massiv';
    if (!cfg || !cfg.type || (!cfg.flDetail && tw !== 'misch')) return list;
    const { L, dg, flach, kg } = levelsOf(cfg);
    const out = [];
    let mixDone = false;
    for (const it of list) {
      if (tw === 'misch' && (it.id === 'mauer' || it.id === 'holz_mont')) {   // ein Strang über alle Geschosse, je Geschoss Mauerwerk oder Holz
        if (mixDone) continue; mixDone = true;
        const IT = { m: list.find((x) => x.id === 'mauer'), h: list.find((x) => x.id === 'holz_mont') }, FT = floorTw(cfg, L);
        const parts = [];
        L.forEach((l, k) => {
          const t = FT[k], base = t === 'holz' || t === 'bsp' ? IT.h : IT.m, nm = NAMES[t], top = k === L.length - 1 && dg === 'none';
          if (!base) return;
          parts.push({ it: base, s: 'w' + k, n: nm[0](l), w: 0.6 }, { it: base, s: 'd' + k, n: top && flach ? (base.id === 'holz_mont' ? 'Montage Dachdecke über ' : 'Dachdecke über ') + l : nm[1](l) + (top ? ' – oberste Geschossdecke' : ''), w: 0.4 });
        });
        const tt = FT[FT.length - 1], tb = tt === 'holz' || tt === 'bsp' ? IT.h : IT.m;
        if (tb && dg === 'aus') parts.push({ it: tb, s: 'w' + L.length, n: NAMES[tt][2], w: 0.35 });
        if (tb && dg === 'staffel') parts.push({ it: tb, s: 'w' + L.length, n: NAMES[tt][0]('Staffelgeschoss'), w: 0.42 }, { it: tb, s: 'd' + L.length, n: 'Dachdecke über Staffelgeschoss', w: 0.28 });
        const W = L.length + (dg === 'aus' ? 0.35 : dg === 'staffel' ? 0.7 : 0);
        let holzSeen = false;   // erst das erste Holz-Geschoss wartet auf die Vorfertigung im Werk
        parts.forEach((x, k) => {
          const isH = x.it.id === 'holz_mont', a0 = k ? [parts[k - 1].it.id + '~' + parts[k - 1].s] : (x.it.a || []).filter((y) => y !== 'mauer' && y !== 'holz_mont');
          if (isH && !holzSeen && k && (x.it.a || []).includes('abbund')) a0.push('abbund');
          if (isH) holzSeen = true;
          out.push({ ...x.it, id: x.it.id + '~' + x.s, vb: x.it.id, n: x.n + erwSuf(cfg, x.it.id), d: (x.it.d * x.w) / W, a: a0 });
        });
        continue;
      }
      if (cfg.flDetail && (it.id === 'mauer' || it.id === 'holz_mont')) {
        const nm = NAMES[it.id === 'holz_mont' ? (tw === 'bsp' ? 'bsp' : 'holz') : (tw === 'stb' ? 'stb' : 'massiv')];
        const suf = erwSuf(cfg, it.id);
        const parts = [];
        L.forEach((l, k) => {
          const top = k === L.length - 1 && dg === 'none';
          parts.push({ s: 'w' + k, n: nm[0](l), w: 0.6 }, { s: 'd' + k, n: top && flach ? (it.id === 'holz_mont' ? 'Montage Dachdecke über ' : 'Dachdecke über ') + l : nm[1](l) + (top ? ' – oberste Geschossdecke' : ''), w: 0.4 });
        });
        if (dg === 'aus') parts.push({ s: 'w' + L.length, n: nm[2], w: 0.35 });
        if (dg === 'staffel') parts.push({ s: 'w' + L.length, n: nm[0]('Staffelgeschoss'), w: 0.42 }, { s: 'd' + L.length, n: (it.id === 'holz_mont' ? 'Montage Dachdecke' : 'Dachdecke') + ' über Staffelgeschoss', w: 0.28 });
        const W = parts.reduce((a, x) => a + x.w, 0);
        parts.forEach((x, k) => out.push({ ...it, id: it.id + '~' + x.s, vb: it.id, n: x.n + suf, d: (it.d * x.w) / W, a: k ? [it.id + '~' + parts[k - 1].s] : (it.a || []).slice() }));
      } else if (it.id === 'treppe' && cfg.flDetail) {
        const lv = [...(kg ? ['KG'] : []), ...L, ...(dg === 'aus' ? ['DG'] : dg === 'staffel' ? ['Staffelgeschoss'] : [])];
        if (lv.length < 2) { out.push(it); continue; }
        for (let k = 0; k < lv.length - 1; k++) {
          const lo = lv[k], fi = L.indexOf(lo);   // Decke über dem unteren Geschoss muss fertig sein
          const a = lo === 'KG' ? ['keller'] : ['mauer~d' + fi, 'holz_mont~d' + fi, ...(UMBT.includes(cfg.type) ? ['durchbr'] : [])];   // Umbau: Treppe im Bestand nach den Durchbrüchen
          out.push({ ...it, id: 'treppe~' + k, vb: 'treppe', n: `Treppe ${lo} – ${lv[k + 1]}`, d: Math.max(1, it.d / (lv.length - 1)), a });
        }
      } else out.push(it);
    }
    // Rohbau Geschoss für Geschoss: Wände, Decke, dann die Treppe darauf – Mauerwerk und Holz je Geschoss gemeinsam (KG-Treppe vor dem EG)
    const RB = new Set(['mauer', 'holz_mont', 'treppe']);
    const rank = (x) => {
      if (x.vb === 'treppe') { const a0 = (x.a || [])[0]; if (a0 === 'keller') return -5; const m = /~d(\d+)$/.exec(a0 || ''); return m ? +m[1] * 10 + 5 : 999; }
      const m = /~([wd])(\d+)$/.exec(x.id); return m ? +m[2] * 10 + (m[1] === 'w' ? 1 : 3) : 999;
    };
    const parts = out.filter((x) => RB.has(x.vb));
    if (parts.length) {
      const at = out.findIndex((x) => RB.has(x.vb)), rest = out.filter((x) => !RB.has(x.vb));
      const sorted = parts.map((x, i) => [rank(x), i, x]).sort((p, q) => p[0] - q[0] || p[1] - q[1]).map((x) => x[2]);
      rest.splice(at, 0, ...sorted);
      return rest;
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
    const fk = cfg ? [cfg.flDetail, cfg.floors, cfg.dg, cfg.type, JSON.stringify(cfg.choice || {}), JSON.stringify(cfg.flTw || {})].join('|') : '';
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
  // Gebäudetypen immer aktuell nachschlagen – die Einrichtung (assistedit.js) kann sie ändern und eigene ergänzen
  const PROF = new Proxy({}, { get: (_, k) => C.profiles.find((p) => p.k === k), has: (_, k) => C.profiles.some((p) => p.k === k) });
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

  /* ---------- Bauweisen (Auswahl je Bereich) ---------- */
  const CHS = C.choices || [];
  const CHM = Object.fromEntries(CHS.map((g) => [g.k, g]));
  // „Individuell“: je nach „Art der Maßnahme“ nur die Fragen für Neubau oder für den Bestand
  const NBT = ['neubau_efh', 'neubau_mfh'], UMBT = ['umbau_efh', 'umbau_mfh'];
  function freiVis(g, cfg) {
    if (g.k === 'massnahme') return true;
    const m = choiceOf(cfg, 'massnahme'), nb = g.types.some((t) => NBT.includes(t)), best = g.types.some((t) => !NBT.includes(t) && t !== 'frei');
    if (m === 'neu') return nb;
    if (m === 'bestand') return best && !g.types.every((t) => UMBT.includes(t) || t === 'frei');
    return best;
  }
  const chVisible = (g, cfg) => !!(cfg && cfg.type && (cfg.type === 'frei' ? freiVis(g, cfg) : (!PROF[cfg.type] || g.types.includes(cfg.type))));
  function chOpts(g, cfg, depth = 0) {
    return g.opts.filter((o) => !o.hidden).filter((o) => !o.if || depth > 3 || Object.entries(o.if).every(([k, l]) => !CHM[k] || !chVisible(CHM[k], cfg) || l.includes(choiceOf(cfg, k, depth + 1))));
  }
  function choiceOf(cfg, gk, depth = 0) {
    const g = CHM[gk]; if (!g) return null;
    const ch = (cfg && cfg.choice) || {}, own = ch[gk] ?? (gk === 'anbaukeller' ? ch.keller : undefined);   // frühere Pläne: Keller des Anbaus stand unter „keller“
    const ok = chOpts(g, cfg, depth), want = own ?? (PROF[cfg && cfg.type] && PROF[cfg.type].choice && PROF[cfg.type].choice[gk]);
    return (ok.find((o) => o.k === want) || ok[0] || g.opts[0]).k;
  }
  // Gruppe wirkt nur, wenn sie sichtbar ist und mindestens eine Ausführung zur Wahl steht (z. B. Bauweise beim Umbau nur mit Anbau)
  function live(g, cfg) { return chVisible(g, cfg) && chOpts(g, cfg).length > 0; }
  const chosen = (cfg) => CHS.filter((g) => live(g, cfg)).map((g) => g.opts.find((o) => o.k === choiceOf(cfg, g.k)));
  const choiceAll = (cfg) => Object.fromEntries(CHS.filter((g) => live(g, cfg)).map((g) => [g.k, choiceOf(cfg, g.k)]));
  // Auswahl an geänderte Bauweise anpassen: Leistungen der alten Wahl raus, der neuen rein
  function selForChoices(selArr, oldCfg, newCfg) {
    let s = baseSel(selArr);
    for (const g of CHS) {
      if (!live(g, newCfg)) continue;
      const ko = choiceOf(oldCfg, g.k), kn = choiceOf(newCfg, g.k);
      if (ko === kn && live(g, oldCfg)) continue;
      // onTypes: Leistungen nur bei diesen Gebäudetypen an-/abwählen (sonst nur Namen, Dauern, abhängige Auswahl)
      const sw = !g.onTypes || g.onTypes.includes(newCfg.type) || newCfg.type === 'frei';
      const all = new Set(sw ? g.opts.flatMap((o) => o.on) : []), on = sw ? g.opts.find((o) => o.k === kn).on : [];
      s = s.filter((id) => !all.has(baseOf(id)));   // auch geschossweise Teile (mauer~w0) erfassen
      for (const id of on) s = withReq(s, id, true, newCfg);
    }
    return normSel(s, newCfg);
  }
  // empfohlene Leistungen des Gebäudetyps passend zur gewählten Bauweise
  const recFor = (cfg) => {
    const r = selForChoices((PROF[cfg.type] || {}).rec || [], cfg.type === 'frei' ? { type: cfg.type, choice: {} } : null, cfg);   // null: alle Bauweisen-Gruppen anwenden – auch die Standardwahl (z. B. Anbau → Gründung, Rohbau)
    const S = new Set([...r, ...libList().filter((x) => (x.rec || []).includes(cfg.type) || (PROF[cfg.type] && PROF[cfg.type].base && (x.rec || []).includes(PROF[cfg.type].base))).map((x) => x.id)]);
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
    // Firmen werden bei neuen Plänen nicht vorbelegt – die trägt man ein, sobald vergeben ist („Gewerke & Firmen“)
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
    const m = mengeDauer(it, cfg); if (m) return Math.max(1, Math.round(m.d));
    const ref = it.sc === 'bau' ? C.ref.bau : C.ref.we;
    const area = +cfg.area || ref;
    const A = it.sc === 'bau' ? area : area / Math.max(1, +cfg.units || 1);
    const f = Math.min(5, Math.max(0.35, Math.pow(A / ref, 0.7)));
    return Math.max(1, Math.round(it.d * f));
  }
  /* Überschlag über Mengen: aus Wohnfläche, Geschossen, Dachform die Bezugsgröße (Fassade, Dach …), geteilt durch den Leistungswert
     je Kolonne und Tag; dauert es mit einer Kolonne über 30 Tage, kommen nach und nach Kolonnen dazu (höchstens kmax, sonst 3). Im Bestand +25 %.
     Richtwerte und ihre Herkunft: plankatalog.js (MENGE). */
  const BZN = { wf: 'm² Wohnfläche', bgf: 'm² BGF', gr: 'm² Grundfläche', fas: 'm² Fassade', dach: 'm² Dachfläche', wand: 'm² Wandfläche', u: 'm Umfang' };
  function geo(cfg) {
    const prof = PROF[cfg.type] || {}, wf = +cfg.area || C.ref.bau, n = Math.max(1, Math.round(+cfg.floors || prof.floors || 1));
    const dgA = (cfg.dg || prof.dg) === 'aus' ? 0.6 : (cfg.dg || prof.dg) === 'staffel' ? 0.7 : 0;
    const bgf = 1.25 * wf, gr = bgf / (n + dgA), u = 4 * Math.sqrt(gr), dfm = roofKnown(cfg) ? choiceOf(cfg, 'dachform') : 'sattel';
    const df = dfm === 'flach' ? 1.05 : 1.35;   // Walm- und Pultdach: Faktor der Auswahl (mul)
    return { wf, bgf, gr, u, fas: u * (n * 2.9 + (dgA ? 1.5 : 0)), dach: gr * df, wand: 2.8 * wf };
  }
  /* Umbau mit Anbau oder Aufstockung: der Neubau-Anteil (Erd-, Rohbau-, Hüllenarbeiten der Erweiterung) rechnet mit der Fläche der
     Erweiterung (cfg.erwArea; leer: Anbau ≈ 30 % der Wohnfläche, Aufstockung = ein Geschoss) und ohne Bestandszuschlag. */
  const ERW = ['aushub', 'grundl', 'grund', 'sauber', 'keller', 'keller_abd', 'verfuell', 'mauer', 'holz_mont', 'innenw', 'zimmer', 'dach_deck', 'dach_daemm',
    'dampfsp', 'lattung', 'flachdach', 'gruendach', 'klempner', 'fenster_neu', 'aussenputz'];
  function erwFlaeche(cfg) {   // geschätzte Wohnfläche der Erweiterung (0 = keine)
    if (!cfg || !UMBT.includes(cfg.type) || !CHM.erweiterung || !chVisible(CHM.erweiterung, cfg)) return 0;
    const e = choiceOf(cfg, 'erweiterung'), wf = +cfg.area || 0, n = Math.max(1, Math.round(+cfg.floors || 1));
    return e === 'aufstock' ? Math.round(wf / n) : e === 'anbau' ? Math.round(wf * 0.3) : 0;
  }
  function mengeDauer(it, cfg) {
    const base = B(it.vb || it.id) || it; if (!base.bz || !base.lw || !cfg || !cfg.type) return null;
    let gc = cfg, erw = false, best = !NBT.includes(cfg.type) && !(cfg.type === 'frei' && choiceOf(cfg, 'massnahme') === 'neu') ? 1.25 : 1;
    if (UMBT.includes(cfg.type) && ERW.includes(base.id)) {
      const fl = +cfg.erwArea || erwFlaeche(cfg); if (!fl) return null;
      const auf = choiceOf(cfg, 'erweiterung') === 'aufstock';
      gc = { ...cfg, area: fl, floors: auf ? 1 : Math.min(2, Math.max(1, Math.round(+cfg.floors || 1))), dg: auf ? cfg.dg : 'kalt' }; erw = true; best = 1;
    }
    const g = geo(gc), ein = it.sc === 'we' && !erw ? Math.max(1, +cfg.units || 1) : 1, menge = g[base.bz] / ein;
    const t1 = menge / base.lw, kol = Math.min(base.kmax || 3, 1 + Math.max(0, t1 - 30) / 60);   // stetig: ab 30 Tagen kommen nach und nach weitere Kolonnen dazu
    const anteil = base.d ? it.d / base.d : 1, d = (t1 / kol) * best * anteil;
    const weg = `${erw ? 'Erweiterung: ' : ''}${Math.round(menge)} ${BZN[base.bz]}${ein > 1 ? ' je Einheit' : ''} ÷ ${base.lw} ${BZN[base.bz].split(' ')[0]}/Tag${kol >= 1.05 ? ' ÷ ' + String(Math.round(kol * 10) / 10).replace('.', ',') + ' Kolonnen' : ''}${best > 1 ? ' + 25 % Bestand' : ''}${anteil !== 1 ? ' × ' + Math.round(anteil * 100) + ' %' : ''}`;
    return { d, weg };
  }
  function durWeg(id, cfg) {   // Rechenweg zur Dauer (Tooltip im Assistenten)
    const it = item(id, cfg); if (!it || it.ms) return '';
    if (cfg.dur && cfg.dur[id] != null && cfg.dur[id] !== '') return 'von Hand gesetzt';
    if (it.fix || (PROF[cfg.type] || {}).noScale) return 'feste Dauer';
    const m = mengeDauer(it, cfg); return m ? m.weg : 'Richtwert, nach Fläche hochgerechnet';
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
  /* ---------- Fragen des Assistenten (ohne Plan): für den Bauzeitenplan und den Planungsassistenten (bp/assistent.js) ---------- */
  const choiceGroups = (cfg) => CHS.filter((g) => live(g, cfg)).map((g) => ({ k: g.k, ph: g.ph, n: g.n, val: choiceOf(cfg, g.k), opts: chOpts(g, cfg).map((o) => ({ k: o.k, n: o.n })) })).filter((g) => g.opts.length > 1);   // nur echte Auswahl zeigen (z. B. „Neuer Keller“ nur bei Anbau)
  const roofKnown = (cfg) => { cfg = clone(cfg); return !!(CHM.dachform && chVisible(CHM.dachform, cfg)); };
  const roofFlat = (cfg) => { cfg = clone(cfg); return roofKnown(cfg) && choiceOf(cfg, 'dachform') === 'flach'; };
  function buildingDesc(cfg) {   // Gebäude in Worten, z. B. „KG · EG · 1.OG · Staffelgeschoss – Flachdach“
    cfg = clone(cfg); const { L, dg, kg } = levelsOf(cfg);
    const roofG = CHM.dachform && chVisible(CHM.dachform, cfg) ? CHM.dachform.opts.find((o) => o.k === choiceOf(cfg, 'dachform')) : null;
    const top = dg === 'aus' ? 'DG ausgebaut' : dg === 'staffel' ? 'Staffelgeschoss' : roofG && roofG.k !== 'flach' ? 'Spitzboden' : '';
    return [...(kg ? ['KG'] : []), ...L, ...(top ? [top] : [])].join(' · ') + (roofG ? ' – ' + roofG.n : '');
  }
  function dgOpts(cfg) {   // „Was liegt über dem obersten Geschoss?“
    const flat = roofFlat(cfg), known = roofKnown(cfg);
    return flat ? [['kalt', 'nichts – Flachdach direkt auf dem obersten Vollgeschoss'], ['staffel', 'Staffelgeschoss (zurückgesetzt, eigenes Flachdach)']]
      : known ? [['kalt', 'Dachraum nicht ausgebaut (Spitzboden)'], ['aus', 'Dachgeschoss ausgebaut (Wohnraum im Dach)']]
        : [['kalt', 'nichts / Dachraum nicht ausgebaut'], ['aus', 'Dachgeschoss ausgebaut'], ['staffel', 'Staffelgeschoss']];
  }
  const FLTW = [['massiv', 'Mauerwerk, Stahlbetondecke'], ['stb', 'Stahlbeton'], ['holz', 'Holzrahmenbau'], ['bsp', 'Brettsperrholz']];   // Bauweise je Geschoss
  function grund(type, start) {   // Vorgaben eines Gebäudetyps
    const p = PROF[type] || PROF.frei;
    const c = { type: p.k, area: p.area, units: p.units, naming: p.naming || 'whg', names: '', takt: p.takt || 'versetzt', start };
    c.floors = p.floors || 1; c.dg = p.dg || 'kalt'; c.flDetail = true;
    c.choice = choiceAll(c);
    return c;
  }
  window.PlanKern = { choiceGroups, roofKnown, roofFlat, buildingDesc, dgOpts, FLTW, grund, C, libList, itemsOf, itemsOf0, levelsOf, floorTw, baseOf, normSel, baseSel, ctx, B, ORDf, PHO, PHN, PROF, clone, CHS, CHM, chVisible, chOpts, choiceOf, live, choiceAll, selForChoices, recFor, materialize, tradesFor, chAffected, item, dur, durWeg, geo, erwFlaeche, multi, unitNames, profSets, withReq, defName, get CTX() { return CTX; } };
})();
