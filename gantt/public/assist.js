'use strict';
/* =====================================================================
   Planungsassistent
   - AssistCore: läuft im Hauptfenster, erzeugt Pläne aus dem Katalog und
     ändert verknüpfte Projekte live (über act() → Rückgängig möglich).
   - Oberfläche: seit 16.11.2026 nur noch der gemeinsame Assistent (bp/assistent.js, Reiter „Planung“) –
     seine Angaben stehen im Projektmodell; ausModell() führt einen verknüpften Plan nach, erzeugen() baut ihn.
   Leistungen aus dem Assistenten tragen cat (Katalog-ID) und blk
   (-1 = Gebäude, 0..n = Einheit). Gruppen: _grp, _bau, _unit; Meilensteine
   _start, _fertig, _end.
   ===================================================================== */
(function () {
  const K = window.PlanKern;   // Fragen des Assistenten ohne Plan: im Baukasten (bp/plankern.js), für alle Apps
  const { C, libList, itemsOf, itemsOf0, levelsOf, floorTw, baseOf, normSel, baseSel, ctx, B, ORDf, PHO, PHN, PROF, clone, CHS, CHM, chVisible, chOpts, choiceOf, live, choiceAll, selForChoices, recFor, materialize, tradesFor, chAffected, item, dur, multi, unitNames, profSets, withReq, defName } = K;

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
      if (sc === 'we' && multi(cfg) && cfg.takt === 'versetzt' && !B(s.cat).w) {   // Takt = dieselbe Kolonne zieht von Einheit zu Einheit; Wartezeiten (w: Estrich trocknen) laufen in allen Einheiten zugleich – sonst wartete die Trocknung der 14. Wohnung auf die der 13. (22.11.2026: Mehrfamilienhaus 24 statt 15 Monate)
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
  // Unternehmer bleibt leer, solange dem Gewerk im Projekt keine Firma zugeordnet ist (keine Vorbelegung aus dem Katalog)
  const firmaImProjekt = (gw) => { const tr = gw && P && P.trades && P.trades[gw]; const f = tr && tr.firm && typeof firmById === 'function' ? firmById(tr.firm) : null; return f ? f.name : ''; };
  function taskOf(id, cfg, blk, lvl) { const it = item(id, cfg); return mkT({ name: it.n, dur: dur(id, cfg), gw: it.gw, res: firmaImProjekt(it.gw), notes: it.info || '', cat: id, blk, lvl, ...(it.kl ? { kl: it.kl.slice(0, 2) } : {}) }); }
  /* Gebäudeteile (18.11.2026, GT-B2): je Teil ein eigener Ablauf aus seinen Angaben (PlanKern.teilCfg) unter einer Gruppe „_teil“ (blk = Nr. des
     Teils, teil = Schlüssel); Planung, Vorbereitung und Abschluss einmal fürs ganze Projekt. Ein Teil = wie bisher. Pfeile zwischen den Teilen
     zieht man auf der Seite „Ablauf“ (ablauf.js); gruppieren nach Teil oder Bauphase ebenda. */
  const GEMEINSAM = ['planung', 'vorb', 'abschluss'];
  function build(cfg, selArr) {
    const TL = K.teile(clone(cfg));
    return TL.length > 1 ? buildTeile(cfg, selArr, TL) : build1(cfg, selArr);
  }
  function buildTeile(cfg, selArr, TL) {
    const T = []; let uid = 1;
    const neu = (t) => { t.uid = uid++; T.push(t); return t; };
    const start = neu(mkT({ name: 'Projektstart', cat: '_start' }));
    const ein = (b, lvlPlus, extra) => {   // Teilplan übernehmen: ohne eigenen Start/Ende, neue Nummern; Verweise auf den eigenen Start merken
      const M = new Map(), S = new Set(), out = [];
      for (const t of b.tasks) { if (t.cat === '_start') { S.add(t.uid); continue; } if (t.cat === '_end') continue; const n = { ...t, ...extra, lvl: t.lvl + lvlPlus }; M.set(t.uid, uid++); n.uid = M.get(t.uid); out.push(n); }
      for (const n of out) n.preds = n.preds.filter((p) => S.has(p.uid) || M.has(p.uid)).map((p) => (S.has(p.uid) ? { ...p, uid: -1 } : { ...p, uid: M.get(p.uid) }));   // -1 = Start des Teilplans
      return out;
    };
    const senken = (L) => { const hat = new Set(L.flatMap((t) => t.preds.map((p) => p.uid))); return L.filter((t) => t.cat && t.cat[0] !== '_' && !hat.has(t.uid)); };
    const c0 = { ...clone(cfg) }; delete c0.teile; delete c0.teilePlus;
    const g = ein(build1(c0, normSel(selArr, c0).filter((id) => { const b = B(id); return b && GEMEINSAM.includes(b.ph); })), 0, {});
    let ph = ''; const kopf = [], fuss = [];
    for (const t of g) { if (t.cat === '_grp') ph = t.ph; (ph === 'abschluss' ? fuss : kopf).push(t); }
    /* Planung, Baustelleneinrichtung, Abschluss und die gemeinsame Haustechnik stehen im Block „Gemeinsam“ (Wunsch 18.11.2026) – wie ein Gebäudeteil,
       etwas anders farbig; so lassen sie sich auf der Seite „Ablauf“ mit den Teilen verknüpfen (z. B. Baustelleneinrichtung → Aufstockung) */
    const gi = TL.length, gemKopf = neu(mkT({ name: 'Gemeinsames', cat: '_teil', teil: '_gem', blk: gi, dur: 1, color: '#7a5ea8' }));
    [...kopf, ...fuss].forEach((t) => { t.teil = '_gem'; t.blk = gi; t.lvl += 1; });
    kopf.forEach((t) => { T.push(t); t.preds = t.preds.map((p) => (p.uid === -1 ? { ...p, uid: start.uid } : p)); });
    const kopfEnde = senken(kopf), alleEnden = [];
    /* Gemeinsames (Wunsch 18.11.2026): Heizung, hydraulischer Abgleich, PV, Hausanschlüsse … nur einmal – eigener Block „Gemeinsam (Haustechnik)“
       wie ein Gebäudeteil, etwas anders farbig; verknüpft mit den Leistungen der Teile, auf die es im Katalog folgt bzw. die darauf folgen */
    const GEM = new Set(K.GEMEIN || []), gemSel = new Set(normSel(selArr, c0).filter((id) => GEM.has(K.baseOf(id)))), bloecke = [];
    const nachKopf = () => (kopfEnde.length ? kopfEnde.map((k) => ({ uid: k.uid, type: 'FS', lag: 0 })) : [{ uid: start.uid, type: 'FS', lag: 0 }]);
    const anfang = (L) => L.forEach((t) => { T.push(t); t.preds = t.preds.flatMap((p) => (p.uid !== -1 ? [p] : nachKopf())); });
    TL.forEach((tl, i) => {
      const ct = K.teilCfg(cfg, tl), alt = ((cfg.teile || {})[tl.k] || {}).sel;
      const sel = normSel(alt && alt.length ? alt : recFor(clone(ct)), clone(ct)).filter((id) => { const b = K.item(id, clone(ct)); if (b && GEM.has(K.baseOf(id)) && !(tl.art === 'aufstock' && b.ph === 'erd')) { gemSel.add(id); return false; }
        return b && !GEMEINSAM.includes(b.ph) && !(tl.art === 'aufstock' && b.ph === 'erd'); });
      neu(mkT({ name: tl.n, cat: '_teil', teil: tl.k, blk: i, dur: 1 }));
      const L = ein(build1(ct, sel), 1, { teil: tl.k, blk: i });
      /* je Teil ein Meilenstein am Anfang und am Ende (PF-B1, 18.11.2026): nur sie sind mit den anderen Kisten verknüpft – statt jeder
         Anfangsleistung mit jedem Ende der Vorbereitung; als Leistungen bleiben sie beim Gruppieren nach Bauphase erhalten */
      const blatt = L.filter((t) => t.cat && t.cat[0] !== '_');
      if (blatt.length) {
        const b0 = blatt[0], bn = blatt[blatt.length - 1];
        const beg = mkT({ name: `${tl.n} – Beginn`, cat: '_beginn', teil: tl.k, blk: i, lvl: b0.lvl, dur: 0, preds: nachKopf() }); beg.uid = uid++;
        const fer = mkT({ name: `${tl.n} – fertig`, cat: '_fertig', teil: tl.k, blk: i, lvl: bn.lvl, dur: 0, preds: senken(L).map((k) => ({ uid: k.uid, type: 'FS', lag: 0 })) }); fer.uid = uid++;
        L.forEach((t) => { t.preds = t.preds.map((p) => (p.uid === -1 ? { ...p, uid: beg.uid } : p)); });
        L.splice(L.indexOf(b0), 0, beg); L.splice(L.indexOf(bn) + 1, 0, fer);
        alleEnden.push(fer);
      } else alleEnden.push(...senken(L));
      anfang(L); bloecke.push(L);
    });
    if (gemSel.size) {
      const c1 = TL[0] ? K.teilCfg(cfg, TL[0]) : c0;
      const G = ein(build1(c1, [...gemSel]), 1, { teil: '_gem', blk: gi });
      anfang(G);
      const vorg = (cat) => { const b = B(cat); return (b && b.a) || []; }, inTeilen = (cat) => bloecke.flatMap((L) => L.filter((t) => t.cat === cat));
      G.forEach((g) => { if (!g.cat || g.cat[0] === '_') return;   // Gemeinsames folgt auf Leistungen der Teile (z. B. Wärmeerzeuger auf „Gebäude dicht“) …
        const P2 = vorg(g.cat).flatMap(inTeilen); if (P2.length) g.preds = [...g.preds.filter((p) => !kopfEnde.some((k) => k.uid === p.uid)), ...P2.map((t) => ({ uid: t.uid, type: 'FS', lag: 0 }))]; });
      bloecke.forEach((L) => L.forEach((t) => { if (!t.cat || t.cat[0] === '_') return;   // … und Leistungen der Teile auf Gemeinsames (z. B. Inbetriebnahme auf den Wärmeerzeuger)
        G.filter((g) => vorg(t.cat).includes(g.cat)).forEach((g) => { if (!t.preds.some((p) => p.uid === g.uid)) t.preds.push({ uid: g.uid, type: 'FS', lag: 0 }); }); }));
      const hat = new Set(T.flatMap((t) => t.preds.map((p) => p.uid)));
      alleEnden.push(...G.filter((t) => t.cat && t.cat[0] !== '_' && !hat.has(t.uid)));
    }
    fuss.forEach((t) => { T.push(t); t.preds = t.preds.flatMap((p) => (p.uid === -1 ? alleEnden.map((k) => ({ uid: k.uid, type: 'FS', lag: 0 })) : [p])); });
    const ende = senken(fuss).length ? senken(fuss) : alleEnden;
    neu(mkT({ name: 'Abnahme / Übergabe', cat: '_end', preds: ende.map((k) => ({ uid: k.uid, type: 'FS', lag: 0 })) }));
    const gem = T.filter((t) => t.teil === '_gem' && t !== gemKopf), rest = T.filter((t) => t !== start && t !== gemKopf && t.teil !== '_gem' && t.cat !== '_end');   // Reihenfolge der Zeilen: Start · Gemeinsam · Teile · Ende
    const gemOrd = [...gem.filter((t) => kopf.includes(t)), ...gem.filter((t) => !kopf.includes(t) && !fuss.includes(t)), ...gem.filter((t) => fuss.includes(t))];
    const out = [start, gemKopf, ...gemOrd, ...rest, ...T.filter((t) => t.cat === '_end')];
    /* nur die nötigen Verknüpfungen zwischen den Teilen (PF-B1, 18.11.2026): was über andere Verknüpfungen und die Reihenfolge im Teil
       ohnehin gilt, wird gar nicht erst angelegt – die Termine bleiben gleich (gantt-befehle.js: ueberfluessigeLinks) */
    if (typeof ueberfluessigeLinks === 'function') ueberfluessigeLinks(out, (t, q) => t.teil && q.teil && t.teil !== q.teil).forEach(([t, p]) => { t.preds = t.preds.filter((x) => x !== p); });
    return { tasks: out, nextUid: uid };
  }
  function build1(cfg, selArr) {
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
    // Firma aus „Gewerke & Firmen“ des Projekts (der Katalog kennt keine Firmen – 22.11.2026)
    const it = item(id, cfg), tr = (P.trades && P.trades[t.gw]) || {};
    const f = tr.firm && typeof firmById === 'function' ? firmById(tr.firm) : null;
    // nur eine im Projekt zugeordnete Firma eintragen – sonst bleibt der Unternehmer leer
    t.res = f ? f.name : '';
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
  // Vorschläge (Kette 🔗, kette.js): was dem Assistenten vorher folgte, folgt ihm auch nachher – von Hand Geändertes bleibt gelöst
  const folgt = () => (window.GKette ? GKette.folgend(P.tasks) : null), vsNach = (F) => { if (F) GKette.merken(P.tasks, F); };
  function applySel(target, mutate, durIds, post) {
    const F = folgt();
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
    vsNach(F);
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

  /* Wechsel zwischen einer und mehreren Einheiten (19.11.2026): eine Einheit hat die Bauphasen direkt oben, mehrere haben
     „Gebäude / Allgemein“ und je Einheit eine Gruppe (build1). Dieselben Leistungen werden nur neu gegliedert – sie behalten
     uid, Dauer, Firma und Notizen; die Verknüpfungen führt setUnits per Soll-Ist-Vergleich nach. cfg.units ist schon der neue Wert. */
  function umgliedern(cfg) {
    ctx(cfg);
    const mehr = multi(cfg), leist = P.tasks.filter((t) => t.cat && t.cat[0] !== '_' && B(t.cat));
    const weg = new Set(leist);
    P.tasks = P.tasks.filter((t) => !weg.has(t) && !['_unit', '_fertig', '_bau', '_gw'].includes(t.cat));
    if (!mehr) P.tasks.forEach((t) => { t.lvl = Math.max(0, (t.lvl || 0) - 1); });   // was unter „Wohnung 1“ stand, rückt eine Ebene hoch
    cleanup();
    for (const o of leist.sort((x, y) => ORDf(x.cat) - ORDf(y.cat))) {
      const blk = B(o.cat).sc === 'bau' ? -1 : 0, g = ensureGroup(blk, B(o.cat).ph, cfg), T = P.tasks, L = T[g].lvl + 1, e = blockEnd(g);
      let pos = e + 1;
      for (let j = g + 1; j <= e; j++) { const t = T[j]; if (t.lvl === L && t.cat && B(t.cat) && ORDf(t.cat) > ORDf(o.cat)) { pos = j; break; } }
      o.lvl = L; o.blk = blk; T.splice(pos, 0, o);
    }
    if (mehr) {
      const u = P.tasks.findIndex((t) => t.cat === '_unit' && t.blk === 0);
      if (u >= 0) P.tasks.splice(blockEnd(u) + 1, 0, newT({ name: unitNames(cfg)[0] + ' fertiggestellt', cat: '_fertig', blk: 0, lvl: 1 }));
    }
    const ende = P.tasks.find((t) => t.cat === '_end'), alt = mehr ? 'Abnahme / Übergabe' : 'Gesamtabnahme / Übergabe';
    if (ende && ende.name === alt) ende.name = mehr ? 'Gesamtabnahme / Übergabe' : 'Abnahme / Übergabe';
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
    openSetup: () => { if (window.AssistEdit) { try { window.focus(); } catch (e) { /* Zweitfenster */ } window.AssistEdit.open(); } },
    profSets, withReq, unitNames, defName,
    choiceGroups: K.choiceGroups, buildingDesc: K.buildingDesc, roofFlat: K.roofFlat, roofKnown: K.roofKnown,
    choiceAll: (cfg) => choiceAll(clone(cfg)),
    normSel: (arr, cfg) => normSel(clone(arr), clone(cfg)), baseSel: (arr) => baseSel(arr),
    floorTw: (cfg) => { cfg = clone(cfg); const { L } = levelsOf(cfg); const F = floorTw(cfg, L); return L.map((l, k) => [l, F[k]]); },
    setFloors(k, v) {
      if (!isLive()) return false;
      const old = clone(P.assist);
      return act(() => applySel((pres) => normSel(baseSel(pres), P.assist), (c) => { c[k] = v; }, null, (cfg) => {
        // Teilleistungen, die es weiter gibt: Name/Dauer nachführen, wo noch der Vorschlag steht
        ctx(old); const oldIds = Object.keys(K.CTX.map); ctx(cfg);
        const ids = Object.values(K.CTX.map).filter((i) => i.vb).map((i) => i.id).filter((id) => oldIds.includes(id));
        syncTasks(old, cfg, ids);
      }));
    },
    libAdd: (it) => (window.Library ? window.Library.add(clone(it)) : Promise.reject(new Error('Leistungskatalog nicht geladen'))),
    libItem: (id) => { const x = libList().find((y) => y.id === id); return x ? clone(x) : null; },
    recFor: (cfg) => recFor(clone(cfg)),
    selForChoices: (sel, o, n) => selForChoices(clone(sel), clone(o), clone(n)),
    setChoice(g, k) {
      if (!isLive()) return false;
      const old = clone(P.assist), nc = clone(P.assist); nc.choice = { ...choiceAll(old), [g]: k }; nc.choice = choiceAll(nc);
      return act(() => applySel((pres) => selForChoices(pres, old, nc), (c) => { c.choice = nc.choice; }, null, (cfg) => { ctx(cfg); syncTasks(old, cfg, [...chAffected(), ...Object.values(K.CTX.map).filter((i) => i.vb).map((i) => i.id)]); }));
    },
    name: (id, cfg) => (item(id, cfg) || {}).n || id,
    profName: (k) => (K.PROF[k] || {}).n || k,
    flLabel: (cfg) => (((cfg && K.PROF[cfg.type]) || {}).kenn || {}).fl === 'bgf' ? 'Brutto-Grundfläche (BGF)' : 'Wohnfläche gesamt',
    dur: (id, cfg) => dur(id, clone(cfg)),
    weg: (id, cfg) => K.durWeg(id, clone(cfg)),
    erwFl: (cfg) => K.erwFlaeche(clone(cfg)),
    color: (gw) => (typeof P !== 'undefined' && P && P.gwColors && P.gwColors[gw]) || GW_DEFAULT[gw] || '#9e9e9e',
    fmt: (d) => fmtD(d), iso: (d) => isoD(d), parse: (s) => parseDate(s),
    defaults(type) {
      const c = K.grund(type, startOf('week', todayN() + 7));
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
      cfg.start = snapWork(cfg.start); if (window.GKette) GKette.merken(b.tasks);
      await flushSave();
      const p = await planApi.create({ name: String(name || defName(cfg)), start: cfg.start, nextUid: b.nextUid, tasks: b.tasks, assist: cfg, trades: tradesFor(cfg, selArr) });
      await openProject(p.id); await refreshProjectList();
      toast(`Projekt „${p.name}“ mit ${b.tasks.length} Leistungen erstellt.`);
      return true;
    },
    regenerate(cfg, selArr) {
      cfg = clone(cfg); selArr = clone(selArr); cfg.start = snapWork(cfg.start);
      let R = null;
      const ok = act(() => { const b = build(cfg, selArr);
        /* Abgleich statt Ersetzen (Mock BZ H1, 22.11.2026): was dem Assistenten folgt, bekommt den neuen Vorschlag; von Hand
           Geändertes, eigene Leistungen, Firmen, Notizen, Fortschritt bleiben (kette.js planAbgleich) */
        if (P.tasks.length && P.assist && window.GKette) {
          let A = null; try { A = build(clone(P.assist), zuSel(clone(P.assist))).tasks; } catch (e) { A = null; }
          R = GKette.planAbgleich(A, b.tasks, P.tasks, P.nextUid, (P.hand || {}).weg);
          P.tasks = R.tasks; P.nextUid = R.nextUid;
        } else { P.tasks = b.tasks; P.nextUid = b.nextUid; if (window.GKette) GKette.merken(P.tasks); }
        P.assist = cfg; P.start = cfg.start; P.trades = tradesFor(cfg, selArr, P.trades); sel = new Set();
        if (window.ablaufUmzug) ablaufUmzug();
        if (window.ganttStufe && P.ablauf && P.ablauf.stufe) ganttStufe.anwenden();   // Gliederung grob · mittel · fein (GL-A1)   // Leistungen, die auf der Seite „Ablauf“ in einen anderen Teil gezogen wurden (UZ-A1)
        if (window.ablaufNachfuehren) ablaufNachfuehren(); });   // Pfeile der Seite „Ablauf“ bleiben (Gebäudeteile)
      if (ok && P.ablauf && P.ablauf.gruppe === 'phase' && window.ablaufGruppieren) ablaufGruppieren('phase');
      if (ok) { view.start = null; render(); refreshProjectList(); }
      if (ok && R && typeof toast === 'function') toast(`Plan abgeglichen: ${R.neu} neu, ${R.weg} entfallen${R.behalten ? `, ${R.behalten} von Hand geänderte behalten (🔗 gelöst)` : ''}.`);
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
    // Abschnitt einer Assistenten-Leistung in diesem Projekt ändern (wie Verschieben im Assistenten); Daten der Zeilen bleiben
    movePhase(id, ph) {
      if (!isLive()) return false;
      const base = id.split('~')[0], cfg = P.assist;
      const orig = (C.items.find((i) => i.id === base) || (cfg.custom || []).find((c) => c.id === base) || libList().find((x) => x.id === base) || {}).ph;
      if (!orig) return false;
      const phase = { ...(cfg.phase || {}) }; if (ph === orig) delete phase[base]; else phase[base] = ph;
      return act(() => applySel(null, (c) => { c.phase = phase; }, null, (cfg2) => {
        for (const cid of [...new Set(P.tasks.filter((t) => t.cat && t.cat.split('~')[0] === base).map((t) => t.cat))]) reposition(cid, cfg2);
      }));
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
    async presets() { return fetch('api/presets').then(j); },
    async savePreset(pr) { pr = clone(pr); return fetch('api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pr) }).then(j); },
    async deletePreset(id) { return fetch('api/presets/' + encodeURIComponent(id), { method: 'DELETE' }).then(j); },
    setParam(k, v) {
      if (!isLive()) return false;
      v = clone(v); const old = clone(P.assist);
      if (k === 'start') return act(() => { P.start = snapWork(v); P.assist.start = P.start; });
      if (k === 'area' || k === 'erwArea' || k === 'fak' || k === 'fakPh') {
        let ch = 0, kept = 0;
        const ok = act(() => {
          const F = folgt();
          P.assist[k] = v;
          for (const t of P.tasks) if (t.cat && B(t.cat) && !B(t.cat).ms) {
            if (t.dur === dur(t.cat, old)) { const nd = dur(t.cat, P.assist); if (nd !== t.dur) { t.dur = nd; ch++; } } else kept++;
          }
          vsNach(F);
        });
        return ok ? { ch, kept } : false;
      }
      if (k === 'takt') return act(() => { const F = folgt(), before = expectedLinks(P.tasks, old); P.assist.takt = v; applyDiff(before, expectedLinks(P.tasks, P.assist)); vsNach(F); });
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
      n = Math.max(1, Math.round(+n || 1));
      const cur = Math.max(1, +P.assist.units || 1);
      if (!isLive() || n === cur || P.tasks.some((t) => t.cat === '_teil')) return false;
      return act(() => {
        const old = clone(P.assist), F = folgt();
        const before = expectedLinks(P.tasks, old);
        if (n < cur) {
          for (let b = cur - 1; b >= n; b--) { const u = P.tasks.findIndex((t) => t.cat === '_unit' && t.blk === b); if (u >= 0) P.tasks.splice(u, blockEnd(u) - u + 1); }
          P.tasks = P.tasks.filter((t) => !(t.blk >= n && (t.cat || '').length));
          P.assist.units = n;
          if (n === 1) umgliedern(P.assist);   // nur noch eine Einheit: keine Gruppen „Wohnung 1“ / „Gebäude / Allgemein“ mehr
        } else {
          P.assist.units = n;
          if (cur === 1) umgliedern(P.assist);   // aus einer werden mehrere: Gebäude / Allgemein + Wohnung 1, die vorhandenen Leistungen ziehen dorthin um
          const weIds = itemsOf(P.assist).filter((i) => i.sc === 'we' && P.tasks.some((t) => t.cat === i.id)).map((i) => i.id);
          const names = unitNames(P.assist);
          for (let b = cur; b < n; b++) {
            const at = endIdx(); P.tasks.splice(at, 0, newT({ name: names[b], cat: '_unit', blk: b, dur: 1 }));
            weIds.forEach((id) => insertItem(id, b, P.assist));
            const u = P.tasks.findIndex((t) => t.cat === '_unit' && t.blk === b);
            P.tasks.splice(blockEnd(u) + 1, 0, newT({ name: names[b] + ' fertiggestellt', cat: '_fertig', blk: b, lvl: 1 }));
          }
        }
        const U = new Set(P.tasks.map((t) => t.uid));
        P.tasks.forEach((t) => { t.preds = (t.preds || []).filter((p) => U.has(p.uid)); });
        applyDiff(before, expectedLinks(P.tasks, P.assist));
        vsNach(F);
        if (window.ganttStufe && P.ablauf && P.ablauf.stufe) ganttStufe.anwenden();
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
  /* Brücke zum gemeinsamen Assistenten (bp/assistent.js): dessen Angaben stehen im Projektmodell (modell.assistent, baubeginn).
     ausModell(c, start) führt einen Plan nach, der aus dem Assistenten entstanden ist (je Änderung ein Schritt fürs Rückgängig);
     erzeugen(c, start, neu) baut den Plan aus den Angaben – in den offenen Plan (ersetzt die Leistungen) oder als neues Projekt. */
  const zuSel = (c) => normSel(baseSel(c.sel && c.sel.length ? c.sel : [...recFor(clone(c))]), clone(c));
  const zuStart = (start) => (start ? snapWork(parseDate(start)) : null);
  core.ausModell = (c, start) => {
    if (!c || !c.type || typeof P === 'undefined' || !P) return { n: 0, grund: 'kein Plan' };
    if (!isLive()) return { n: 0, grund: 'nicht verknüpft' };
    if (c.type !== P.assist.type) return { n: 0, grund: 'Bauart' };
    if (K.teile(clone(c)).length > 1 || K.teile(clone(P.assist)).length > 1) {   // Gebäudeteile: je Teil ein eigener Ablauf – Änderungen baut „Plan neu aus den Angaben“ (eigene Pfeile auf „Ablauf“ bleiben)
      const a = JSON.stringify([K.teile(clone(c)), c.sel || [], c.custom || [], c.dur || {}, c.fak || 1, c.order || []]), b = JSON.stringify([K.teile(clone(P.assist)), P.assist.sel || [], P.assist.custom || [], P.assist.dur || {}, P.assist.fak || 1, P.assist.order || []]);
      return { n: 0, grund: a === b ? '' : 'Gebäudeteile' };
    }
    let n = 0; const alt = clone(P.assist), ch = choiceAll(clone(c)), cha = choiceAll(clone(alt));
    Object.keys(ch).forEach((g) => { if (ch[g] !== cha[g] && core.setChoice(g, ch[g])) n++; });
    ['floors', 'dg'].forEach((k) => { if (c[k] != null && c[k] !== P.assist[k] && core.setFloors(k, c[k])) n++; });
    if (JSON.stringify(c.flTw || {}) !== JSON.stringify(P.assist.flTw || {}) && core.setFloors('flTw', clone(c.flTw || {}))) n++;
    if (Math.max(1, +c.units || 1) !== Math.max(1, +P.assist.units || 1) && core.setUnits(+c.units || 1)) n++;   // auch 2 → 1 und 1 → 2 (19.11.2026)
    ['area', 'erwArea'].forEach((k) => { if (c[k] != null && +c[k] !== +P.assist[k] && core.setParam(k, +c[k])) n++; });
    const s = zuStart(start); if (s != null && s !== P.start && core.setParam('start', s)) n++;
    const cn = (c.custom || []), ca = (P.assist.custom || []);   // eigene Leistungen aus dem Assistenten (auch gelernte)
    cn.filter((x) => !ca.some((y) => y.id === x.id)).forEach((x) => { if (core.addCustom(x)) n++; });
    ca.filter((y) => /^eig/.test(y.id) && !cn.some((x) => x.id === y.id)).forEach((y) => { if (core.removeCustom(y.id)) n++; });
    const soll = zuSel(c), ist = Object.keys(presentMap());
    if (c.sel && c.sel.length && (soll.length !== ist.length || soll.some((x) => !ist.includes(x))) && core.setSelection(soll)) n++;
    return { n };
  };
  core.erzeugen = async (c, start, neu) => {
    const cfg = { ...clone(c), start: zuStart(start) || snapWork(todayN() + 7) };
    if (neu) return core.create(cfg, zuSel(c), defName(cfg));
    return core.regenerate(cfg, zuSel(c));
  };
  core.build = build; core.expectedLinks = expectedLinks; core.GEMEINSAM = GEMEINSAM;
  window.AssistCore = core;

})();
