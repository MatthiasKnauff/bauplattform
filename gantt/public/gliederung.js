'use strict';
/* =====================================================================
   Gliederung grob · mittel · fein (GO 18.11.2026, Mock „Gliederung grob · mittel · fein“: GL-A1 B1 C1)
   - A1: nichts geht verloren – die feinen Leistungen bleiben im Plan und werden nur zusammengeklappt.
       fein   = alle Leistungen offen
       mittel = die innersten Gruppen zugeklappt (seit 19.11.2026, D1 – z. B. je Gewerk, wenn „Gruppieren“ das Gewerk enthält)
       grob   = die obersten Gruppen zugeklappt (z. B. je Bauphase)
     Zurück auf „fein“ nimmt die Gewerk-Zeilen wieder heraus; Vorgänger, Dauer, Firma der Leistungen bleiben unberührt.
   - B1: für den ganzen Plan (Befehlsleiste) und abweichend je Block (Gebäudeteil, „Gemeinsames“): P.ablauf.stufe = { plan, blk: {teil: stufe} }.
   - C1: Drucken folgt der Einstellung oder wählt selbst (print.js: o.outline = grob | mittel | fein → mit(stufe, fn)).
   Zugeklappte Gruppen zeichnen sich farbig (summeFarbe): Gewerk-Zeile in der Farbe des Gewerks, sonst das Gewerk mit den meisten Arbeitstagen.
   ===================================================================== */
(function () {
  const STUFEN = [['grob', 'grob'], ['mittel', 'mittel'], ['fein', 'fein']];
  const CONT = new Set(['_grp', '_teilph']);
  const ST = () => { if (!P.ablauf || typeof P.ablauf !== 'object') P.ablauf = {}; const s = P.ablauf.stufe; if (!s || typeof s !== 'object') P.ablauf.stufe = { plan: 'fein', blk: {} }; P.ablauf.stufe.blk = P.ablauf.stufe.blk || {}; return P.ablauf.stufe; };
  const hatStufen = () => !!(P && P.tasks.some((t) => CONT.has(t.cat)));
  const ende = (T, i) => { let j = i + 1; while (j < T.length && T[j].lvl > T[i].lvl) j++; return j; };   // erste Zeile hinter dem Teilbaum
  const teilVon = (T, i) => { if (T[i].teil) return T[i].teil; for (let j = i - 1; j >= 0; j--) if (T[j].lvl < T[i].lvl && T[j].teil) return T[j].teil; return ''; };
  function stufeVon(teil) { const s = P && P.ablauf && P.ablauf.stufe; if (!s) return 'fein'; return (s.blk && s.blk[teil]) || s.plan || 'fein'; }

  /* Gewerk-/Firmen-Zeilen herausnehmen (alle = true: auch die der Ebenen Gewerk/Firma – vor dem Neuordnen): ihre Kinder rücken eine Ebene höher */
  function entfernen(alle) {
    const E = !alle && window.ablaufEbenen ? ablaufEbenen() : [], raus = new Set([...(E.includes('gewerk') ? [] : ['_gw']), ...(E.includes('firma') ? [] : ['_fi'])]);
    const T = P.tasks, out = [];
    for (let i = 0; i < T.length; i++) {
      const t = T[i]; if (!raus.has(t.cat)) { out.push(t); continue; }
      const e = ende(T, i); for (let j = i + 1; j < e; j++) T[j].lvl -= 1;
    }
    if (out.length !== T.length) { const weg = new Set(T.filter((t) => !out.includes(t)).map((t) => t.uid)); out.forEach((t) => { t.preds = (t.preds || []).filter((p) => !weg.has(p.uid)); }); P.tasks = out; }
  }
  /* Stufe anwenden (D1, 19.11.2026): grob = oberste Gruppen zu, mittel = innerste Gruppen zu (z. B. je Gewerk), fein = alles offen.
     Gebäudeteile (Kisten), Anfang und Ende bleiben offen. Ohne act (aus act heraus aufgerufen). */
  const NIE = new Set(['_teil', '_start', '_end']);
  function anwenden() {
    entfernen();
    const T = P.tasks, hat = (i) => i + 1 < T.length && T[i + 1].lvl > T[i].lvl, st = [];
    for (let i = 0; i < T.length; i++) {
      const t = T[i]; while (st.length && T[st[st.length - 1]].lvl >= t.lvl) st.pop();
      const oben = !st.some((j) => !NIE.has(T[j].cat)); st.push(i);
      if (!hat(i) || NIE.has(t.cat)) continue;
      const s = stufeVon(teilVon(T, i)), e = ende(T, i);
      let innerst = true; for (let j = i + 1; j < e; j++) if (hat(j)) { innerst = false; break; }
      t.collapsed = s === 'grob' ? oben : s === 'mittel' ? innerst : false;
    }
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
    if (t.cat === '_gw') return gwColor(t.gw) || null;   // Firma (_fi): Gewerk mit den meisten AT wie bei den anderen Gruppen
    const n = new Map(), e = ende(T, i);
    for (let j = i + 1; j < e; j++) { if (CAL.summ[j]) continue; const f = effColor(T[j]); if (f) n.set(f, (n.get(f) || 0) + (CAL.dur[j] || 0) + 0.01); }
    let best = null, bn = -1; n.forEach((v, f) => { if (v > bn) { bn = v; best = f; } }); return best;
  }
  /* Auswahl je Block: Kontextmenü der Blockzeile und Kiste der Seite „Ablauf“ */
  function blockPunkte(teil) {
    const s = (P.ablauf && P.ablauf.stufe) || {}, eigen = s.blk && s.blk[teil];
    return [...STUFEN.map(([k, n]) => ({ label: `Gliederung ${n}${eigen === k ? ' ✓' : ''}`, fn: () => setze(k, teil) })), { label: `Gliederung wie der Plan (${s.plan || 'fein'})${!eigen ? ' ✓' : ''}`, dis: !eigen, fn: () => setze(null, teil) }];
  }
  /* Endgültig zusammenfassen (GL-A2, 18./19.11.2026, mit Warnung): eine Gruppe (Bauphase, Gewerk-Zeile, eigene Gruppe) wird EINE Leistung –
     Dauer vom ersten Anfang bis zum letzten Ende, Anfang bleibt (sonst „Anfang nicht früher als“), Verknüpfungen nach außen hängen an ihr,
     Firma bei einem Gewerk die des Gewerks, Fortschritt nach Dauer gemittelt. Die Zeilen darunter werden gelöscht – zurück nur über Rückgängig/Verlauf.
     Gebäudeteile, Gemeinsames, Anfang und Ende des Plans lassen sich nicht zusammenfassen. */
  const NICHT = new Set(['_teil', '_start', '_end']);   // auch Gewerk-/Firmen-Zeilen lassen sich zusammenfassen
  const kannZusammen = (i) => { const t = P.tasks[i]; return !!(t && CAL && CAL.summ[i] && !NICHT.has(t.cat)); };
  async function zusammenfassen(i) {
    if (!kannZusammen(i)) return false;
    const T = P.tasks, t = T[i], e = ende(T, i), unter = T.slice(i + 1, e), blatt = unter.filter((x, k) => !CAL.summ[i + 1 + k]);
    const frage = `„${t.name}“ endgültig zu einer Leistung zusammenfassen?\n\nDie ${blatt.length} Leistungen darunter werden gelöscht – eigene Änderungen daran (Dauer, Firma, Notizen, Verknüpfungen innerhalb) gehen verloren. Zurück nur über Rückgängig oder den Verlauf.\n\nLeistungen aus anderen Bereichen, die mitten in dieser Gruppe hängen, folgen danach ihrem Ende.\n\nNur ansehen ohne zu löschen: „Detail“ grob · mittel in der Befehlsleiste.`;
    if (!window.bpFrage || !(await bpFrage(frage, { ok: 'Endgültig zusammenfassen', gefahr: true }))) return false;
    const sd0 = CAL.sd[i], dur = Math.max(0, CAL.dur[i] || 0), weg = new Set(unter.map((x) => x.uid));
    const sum = blatt.reduce((s, x) => s + Math.max(1, x.dur || 0), 0), pct = sum ? Math.round(blatt.reduce((s, x) => s + (x.pct || 0) * Math.max(1, x.dur || 0), 0) / sum) : 0;
    const gws = [...new Set(blatt.map((x) => x.gw).filter(Boolean))], res = [...new Set(blatt.map((x) => x.res || x.firma).filter(Boolean))];
    /* Leistungen anderer Bereiche, die mitten in der Gruppe hängen (nach einer Leistung darunter, vor einer anderen): ihr Vorgänger-Bezug
       in die Gruppe wird zum Nachfolger der ganzen Leistung – sonst entstünde ein Kreis. Sie rücken damit ans Ende der Gruppe (Meldung). */
    const nach = new Set(), offen = [...weg];
    while (offen.length) { const u = offen.pop(); for (const x of T) if (!weg.has(x.uid) && x !== t && !nach.has(x.uid) && (x.preds || []).some((p) => p.uid === u)) { nach.add(x.uid); offen.push(x.uid); } }
    let mitten = 0;
    const ok = act(() => {
      const preds = [], seen = new Set();
      for (const x of [t, ...unter]) for (const p of x.preds || []) {
        if (weg.has(p.uid) || p.uid === t.uid || seen.has(p.uid)) continue;
        if (nach.has(p.uid)) { mitten++; continue; }
        seen.add(p.uid); preds.push({ ...p });
      }
      P.tasks = T.filter((x) => !weg.has(x.uid));
      for (const x of P.tasks) {   // Nachfolger draußen: hingen an einer gelöschten Leistung → jetzt an der zusammengefassten
        if (x === t || !x.preds) continue; let neu = false;
        x.preds = x.preds.map((p) => (weg.has(p.uid) ? (neu = true, { ...p, uid: t.uid }) : p));
        if (neu) { const s = new Set(); x.preds = x.preds.filter((p) => (s.has(p.uid) ? false : (s.add(p.uid), true))); }
      }
      Object.assign(t, { dur, preds, pct, collapsed: false, gw: t.gw || (gws.length === 1 ? gws[0] : ''), res: t.res || (res.length === 1 ? res[0] : ''),
        cat: t.cat === '_gw' || t.cat === '_fi' || t.cat === '_grp' || t.cat === '_teilph' ? '' : t.cat, notes: [t.notes, `Zusammengefasst aus ${blatt.length} Leistungen (${new Date().toLocaleDateString('de-DE')}).`].filter(Boolean).join('\n') });
      normalize(); CAL = schedule();
      const j = P.tasks.indexOf(t); if (j >= 0 && CAL.sd[j] !== sd0) { t.cons = sd0; CAL = schedule(); }   // Anfang bleibt, wo er war
    });
    if (ok) toast(`„${t.name}“ ist jetzt eine Leistung (${blatt.length} zusammengefasst)${mitten ? ` – ${mitten} Leistung${mitten > 1 ? 'en' : ''} aus anderen Bereichen, die mitten darin hingen, folgen jetzt ihrem Ende` : ''}. Rückgängig oben links.`);
    return ok;
  }
  window.ganttStufe = {
    kannZusammen, zusammenfassen, STUFEN, hatStufen, stufeVon, entfernen, anwenden, setze, mit, summeFarbe, blockPunkte, plan: () => (P && P.ablauf && P.ablauf.stufe && P.ablauf.stufe.plan) || 'fein' };
})();
