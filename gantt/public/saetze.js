'use strict';
/* =====================================================================
   Änderungssätze im Bauzeitenplan (GO 22.11.2026, ToDo „Änderungssätze, Rest FA-C2“): im Reiter „Fragen und Antworten“ rechts
   „Malerarbeiten 5 Tage länger“, „Estrich auf 8 AT“, „Fliesen 1 Woche später“, „Maler nach Fliesen“, „Estrich 50 % fertig“.
   Wie im Gebäudemodell: erst die Vorschau (welche Leistungen, vorher → nachher, Projektende), ausgeführt erst mit „Ausführen“ –
   als ein Schritt im Rückgängig des Plans (act). Ohne KI: die Sätze versteht der Plan selbst, die Leistung findet er über ihren Namen.
   Der Baustein bp/fragen.js fragt window.bpFragenLokal: erkennt(text) · verstehen(text) → Vorschau · ausfuehren(vorschau) → Text.
   Nutzt aus gantt-kern.js: P, CAL, act, snapshot, restore, normalize, schedule, fromW, toW, fmtD.
   ===================================================================== */
(function () {
  const ZAHL = { ein: 1, eine: 1, einen: 1, einem: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, halbe: 0.5 };
  const fold = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const zahl = (s) => { const t = fold(s).replace(',', '.'); return ZAHL[s && s.toLowerCase()] ?? (isFinite(+t) ? +t : null); };
  const N = '(\\d+(?:[.,]\\d+)?|ein|eine|einen|einem|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)';
  const EINH = '(arbeitstage?n?|at|tage?n?|wochen?|wo)';
  const AT = (n, e) => (/^wo/i.test(e) ? n * 5 : n);   // Woche = 5 Arbeitstage
  const MUSTER = [
    { re: new RegExp(`^(.+?)\\s+(?:um\\s+)?${N}\\s*${EINH}\\s+(länger|kürzer|laenger|kuerzer)$`, 'i'), art: 'dauer+', f: (m) => ({ wer: m[1], d: AT(zahl(m[2]), m[3]) * (/k/i.test(m[4][0]) ? -1 : 1) }) },
    { re: new RegExp(`^(.+?)\\s+(?:dauert\\s+|auf\\s+|=\\s*)${N}\\s*${EINH}$`, 'i'), art: 'dauer=', f: (m) => ({ wer: m[1], d: AT(zahl(m[2]), m[3]) }) },
    { re: new RegExp(`^(.+?)\\s+(?:um\\s+)?${N}\\s*${EINH}\\s+(später|früher|spaeter|frueher)(?:\\s+(?:beginnen|anfangen|starten))?$`, 'i'), art: 'schieb', f: (m) => ({ wer: m[1], d: AT(zahl(m[2]), m[3]) * (/^f/i.test(m[4]) ? -1 : 1) }) },
    { re: new RegExp(`^(.+?)\\s+(?:ist\\s+)?${N}\\s*(?:%|prozent)\\s*(?:fertig|erledigt|abgeschlossen)?$`, 'i'), art: 'pct', f: (m) => ({ wer: m[1], p: zahl(m[2]) }) },
    { re: /^(.+?)\s+(?:ist\s+)?(?:fertig|erledigt|abgeschlossen)$/i, art: 'pct', f: (m) => ({ wer: m[1], p: 100 }) },
    { re: /^(.+?)\s+(?:erst\s+)?nach\s+(?:dem\s+|der\s+|den\s+)?(.+)$/i, art: 'nach', f: (m) => ({ wer: m[1], vor: m[2] }) },
  ];
  const ERKENNT = new RegExp(`(länger|kürzer|laenger|kuerzer|später|früher|spaeter|frueher|%|prozent|fertig|\\bnach\\b|\\bauf\\s+${N}\\s*${EINH}|dauert)`, 'i');

  function finden(wer) {   // Leistungen über den Namen: jedes Wort muss vorkommen (Wortanfang genügt: „Maler“ → Malerarbeiten)
    const W0 = fold(wer).replace(/^(die|der|das|den|alle)\s+/, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean), W2 = W0.filter((w) => w.length > 1), W = W2.length ? W2 : W0;   // kurze Füllwörter weg, ein kurzer Name allein bleibt
    if (!W.length) return [];
    return P.tasks.map((t, i) => [t, i]).filter(([t, i]) => !(CAL && CAL.summ[i]) && !String(t.cat || '').startsWith('_') && W.every((w) => fold(t.name).split(/[^\p{L}\p{N}]+/u).some((x) => x.startsWith(w))));
  }
  function verstehen(text) {
    const s = String(text || '').trim().replace(/[.!]+$/, '');
    for (const M of MUSTER) {
      const m = M.re.exec(s); if (!m) continue;
      const a = M.f(m), T = finden(a.wer);
      if (!T.length) return { fehler: `Keine Leistung „${a.wer.trim()}“ im Plan gefunden.` };
      if (a.d === null || a.p === null) return { fehler: 'Die Zahl habe ich nicht verstanden.' };
      const S = [];
      if (M.art === 'nach') {
        const V = finden(a.vor); if (!V.length) return { fehler: `Keine Leistung „${a.vor.trim()}“ im Plan gefunden.` };
        T.forEach(([t]) => V.forEach(([v]) => { if (v.uid !== t.uid && !(t.preds || []).some((p) => p.uid === v.uid)) S.push({ uid: t.uid, name: t.name, art: 'nach', vor: v.uid, vorName: v.name, alt: '', neu: `nach „${v.name}“` }); }));
        if (!S.length) return { fehler: 'Diese Reihenfolge steht schon im Plan.' };
      } else T.forEach(([t, i]) => {
        if (M.art === 'dauer+' || M.art === 'dauer=') { const neu = Math.max(0.5, M.art === 'dauer+' ? (t.dur || 0) + a.d : a.d); if (neu !== t.dur) S.push({ uid: t.uid, name: t.name, art: 'dur', wert: neu, alt: `${t.dur} AT`, neu: `${neu} AT` }); }
        if (M.art === 'pct') { const p = Math.max(0, Math.min(100, a.p)); if (p !== (t.pct || 0)) S.push({ uid: t.uid, name: t.name, art: 'pct', wert: p, alt: `${t.pct || 0} %`, neu: `${p} %` }); }
        if (M.art === 'schieb') { const w = Math.max(0, CAL.es[i] + a.d), tag = fromW(w); S.push({ uid: t.uid, name: t.name, art: 'cons', wert: tag, alt: fmtD(fromW(CAL.es[i])), neu: `ab ${fmtD(tag)}` }); }
      });
      if (!S.length) return { fehler: 'Das steht schon so im Plan – nichts zu ändern.' };
      const vor = CAL.peDay, snap = snapshot(); let nach = vor;
      try { anwenden(S); normalize(); const C = schedule(); nach = C.cyc ? null : C.peDay; } finally { restore(snap); }
      if (nach === null) return { fehler: 'Das ergäbe einen Kreis in den Verknüpfungen – nicht möglich.' };
      return { art: 'plan', schritte: S, ende: { alt: fmtD(vor), neu: fmtD(nach), diff: nach - vor } };
    }
    return null;
  }
  function anwenden(S) {
    S.forEach((x) => {
      const t = P.tasks.find((y) => y.uid === x.uid); if (!t) return;
      if (x.art === 'dur') t.dur = x.wert;
      if (x.art === 'pct') t.pct = x.wert;
      if (x.art === 'cons') t.cons = x.wert;
      if (x.art === 'nach') t.preds = [...(t.preds || []), { uid: x.vor, type: 'FS', lag: 0 }];
    });
  }
  window.bpFragenLokal = {
    erkennt: (text) => !!P && ERKENNT.test(String(text || '')) && !/^\s*(was|wie|wann|wo|wer|warum|welche)\b|\?\s*$/i.test(String(text || '')),
    verstehen,
    ausfuehren(V) {
      if (!P) throw new Error('Kein Plan geöffnet.');
      const ok = act(() => anwenden(V.schritte));
      if (ok === false) throw new Error('Nicht ausgeführt.');
      if (typeof render === 'function') render();
      return `${V.schritte.length} Änderung${V.schritte.length === 1 ? '' : 'en'} im Plan – Strg+Z nimmt sie zurück`;
    },
  };
}());
