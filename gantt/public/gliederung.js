'use strict';
/* =====================================================================
   Gliederung grob · mittel · fein (GO 18.11.2026, Mock „Gliederung grob · mittel · fein“: GL-A1 B1 C1)
   - A1: nichts geht verloren – die feinen Leistungen bleiben im Plan und werden nur zusammengeklappt.
       fein   = alle Leistungen offen
       mittel = je Gewerk eine Zeile (Gruppe „_gw“ unter der Bauphase, zugeklappt)
       grob   = je Bauphase eine Zeile (die Bauphase zugeklappt)
     Zurück auf „fein“ nimmt die Gewerk-Zeilen wieder heraus; Vorgänger, Dauer, Firma der Leistungen bleiben unberührt.
   - B1: für den ganzen Plan (Befehlsleiste) und abweichend je Block (Gebäudeteil, „Gemeinsames“): P.ablauf.stufe = { plan, blk: {teil: stufe} }.
   - C1: Drucken folgt der Einstellung oder wählt selbst (print.js: o.outline = grob | mittel | fein → mit(stufe, fn)).
   Zugeklappte Gruppen zeichnen sich farbig (summeFarbe): Gewerk-Zeile in der Farbe des Gewerks, sonst das Gewerk mit den meisten Arbeitstagen.
   ===================================================================== */
(function () {
  const STUFEN = [['grob', 'grob'], ['mittel', 'mittel'], ['fein', 'fein']];
  const CONT = new Set(['_grp', '_teilph']);
  const STRUKTUR = new Set(['_teil', '_grp', '_teilph', '_gw', '_start', '_end']);
  const ST = () => { if (!P.ablauf || typeof P.ablauf !== 'object') P.ablauf = {}; const s = P.ablauf.stufe; if (!s || typeof s !== 'object') P.ablauf.stufe = { plan: 'fein', blk: {} }; P.ablauf.stufe.blk = P.ablauf.stufe.blk || {}; return P.ablauf.stufe; };
  const hatStufen = () => !!(P && P.tasks.some((t) => CONT.has(t.cat)));
  const ende = (T, i) => { let j = i + 1; while (j < T.length && T[j].lvl > T[i].lvl) j++; return j; };   // erste Zeile hinter dem Teilbaum
  const teilVon = (T, i) => { if (T[i].teil) return T[i].teil; for (let j = i - 1; j >= 0; j--) if (T[j].lvl < T[i].lvl && T[j].teil) return T[j].teil; return ''; };
  function stufeVon(teil) { const s = P && P.ablauf && P.ablauf.stufe; if (!s) return 'fein'; return (s.blk && s.blk[teil]) || s.plan || 'fein'; }

  /* Gewerk-Zeilen herausnehmen: ihre Kinder rücken eine Ebene höher */
  function entfernen() {
    const T = P.tasks, out = [];
    for (let i = 0; i < T.length; i++) {
      const t = T[i]; if (t.cat !== '_gw') { out.push(t); continue; }
      const e = ende(T, i); for (let j = i + 1; j < e; j++) T[j].lvl -= 1;
    }
    if (out.length !== T.length) { const weg = new Set(T.filter((t) => !out.includes(t)).map((t) => t.uid)); out.forEach((t) => { t.preds = (t.preds || []).filter((p) => !weg.has(p.uid)); }); P.tasks = out; }
  }
  /* Stufe auf alle Bauphasen anwenden – ohne act (aus act heraus aufgerufen) */
  function anwenden() {
    entfernen();
    const T = P.tasks, out = [];
    for (let i = 0; i < T.length;) {
      const t = T[i];
      if (!CONT.has(t.cat)) { out.push(t); i++; continue; }
      const st = stufeVon(teilVon(T, i)), e = ende(T, i);
      const U = []; for (let j = i + 1; j < e;) { const k = ende(T, j); U.push(T.slice(j, k)); j = k; }   // direkte Kinder als Einheiten (Zeile + Teilbaum)
      if (!U.some((u) => !STRUKTUR.has(u[0].cat))) { out.push(t); i++; continue; }   // Bauphase über Gebäudeteilen (gruppiert nach Bauphase): die Teile darunter entscheiden
      out.push(t); t.collapsed = st === 'grob';
      if (st !== 'mittel') { U.forEach((u) => out.push(...u)); i = e; continue; }
      const G = new Map(), rest = [];
      U.forEach((u) => { const r = u[0]; if (STRUKTUR.has(r.cat) || u.length > 1 || !r.gw) { rest.push({ u }); return; } if (!G.has(r.gw)) { const g = { gw: r.gw, L: [] }; G.set(r.gw, g); rest.push(g); } G.get(r.gw).L.push(u); });
      for (const x of rest) {
        if (x.u) { out.push(...x.u); continue; }
        if (x.L.length < 2) { x.L.forEach((u) => out.push(...u)); continue; }
        const g = newTask(x.gw, 1); Object.assign(g, { cat: '_gw', gw: x.gw, lvl: t.lvl + 1, collapsed: true, blk: t.blk, ph: t.ph || '' }); if (t.teil) g.teil = t.teil;
        out.push(g); x.L.forEach((u) => u.forEach((r) => { r.lvl += 1; out.push(r); }));
      }
      i = e;
    }
    P.tasks = out;
  }
  function setze(stufe, teil) {
    if (!hatStufen()) return false;
    return act(() => { const s = ST(); if (teil == null) { s.plan = stufe; s.blk = {}; } else if (stufe === null || stufe === s.plan) delete s.blk[teil]; else s.blk[teil] = stufe; anwenden(); });
  }
  /* Drucken mit anderer Stufe (C1): Stufe vorübergehend anwenden, fn() rechnen, alten Stand zurück */
  function mit(stufe, fn) {
    if (!stufe || !hatStufen()) return fn();
    const snap = snapshot();
    try { const s = ST(); s.plan = stufe; s.blk = {}; anwenden(); normalize(); CAL = schedule(); computeVis(); return fn(); }
    finally { restore(snap); CAL = schedule(); computeVis(); }
  }
  /* Farbe einer zugeklappten Gruppe – sonst null (grauer Sammelbalken) */
  function summeFarbe(i) {
    const T = P.tasks, t = T[i]; if (!t || !t.collapsed || !CAL || !CAL.summ[i]) return null;
    if (t.color) return t.color;
    if (t.cat === '_gw') return gwColor(t.gw) || null;
    const n = new Map(), e = ende(T, i);
    for (let j = i + 1; j < e; j++) { if (CAL.summ[j]) continue; const f = effColor(T[j]); if (f) n.set(f, (n.get(f) || 0) + (CAL.dur[j] || 0) + 0.01); }
    let best = null, bn = -1; n.forEach((v, f) => { if (v > bn) { bn = v; best = f; } }); return best;
  }
  /* Auswahl je Block: Kontextmenü der Blockzeile und Kiste der Seite „Ablauf“ */
  function blockPunkte(teil) {
    const s = (P.ablauf && P.ablauf.stufe) || {}, eigen = s.blk && s.blk[teil];
    return [...STUFEN.map(([k, n]) => ({ label: `Gliederung ${n}${eigen === k ? ' ✓' : ''}`, fn: () => setze(k, teil) })), { label: `Gliederung wie der Plan (${s.plan || 'fein'})${!eigen ? ' ✓' : ''}`, dis: !eigen, fn: () => setze(null, teil) }];
  }
  window.ganttStufe = { STUFEN, hatStufen, stufeVon, entfernen, anwenden, setze, mit, summeFarbe, blockPunkte, plan: () => (P && P.ablauf && P.ablauf.stufe && P.ablauf.stufe.plan) || 'fein' };
})();
