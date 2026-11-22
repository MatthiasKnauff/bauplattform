'use strict';
/* =====================================================================
   Büro-Ebene über dem Werkskatalog (Mock „Leistungskatalog: Abhängigkeiten“, GO 22.11.2026: K1–K7)
   Leistungen ab Werk (bp/plankatalog.js) lassen sich ohne Kopie ändern: Richtdauer (d), feste Dauer (fix), Wartezeit (w), Vorgänger (a).
   Gespeichert wird nur die Abweichung (Server api/catbuero, Store „catbuero“); hier wird sie auf CATALOG.items gelegt – Assistent,
   „Plan neu aus den Angaben“ und Probe lesen den Katalog wie gewohnt. Werk-Werte bleiben in WERK (↺ = zurück auf Werk).
   Ändern nur mit dem Block „Bauzeitenplan: Leistungskatalog …“ der Verwaltung (je Rolle, libDarf).
   KatBuero.laden(d) · .setzen(id, {d|fix|w|a}) · .zurueck(id, feld?) · .abw(id) → Felder mit Abweichung · .werk(id) · .nach(id) Nachfolger
   ===================================================================== */
(function () {
  const C = window.CATALOG, FELD = ['d', 'fix', 'w', 'a'];
  const WERK = {};   // id → Werte ab Werk (einmal beim Laden der Seite)
  C.items.forEach((i) => { WERK[i.id] = JSON.parse(JSON.stringify(Object.fromEntries(FELD.map((f) => [f, i[f]])))); });
  let D = {}, saveT = null, stand = null;
  const gleich = (a, b) => JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);
  function anwenden() {
    for (const i of C.items) {
      const w = WERK[i.id]; if (!w) continue;
      FELD.forEach((f) => { if (w[f] === undefined) delete i[f]; else i[f] = JSON.parse(JSON.stringify(w[f])); });
      const b = D[i.id]; if (!b) continue;
      if (b.d != null) i.d = b.d;
      ['fix', 'w'].forEach((f) => { if (b[f] != null) { if (b[f]) i[f] = 1; else delete i[f]; } });
      if (Array.isArray(b.a)) i.a = JSON.parse(JSON.stringify(b.a));
    }
    if (window.AssistCore) AssistCore.notifySoon();
  }
  function speichern(text, still) {
    const alt = stand || {}, neu = JSON.parse(JSON.stringify(D));
    if (!still && !gleich(alt, neu) && typeof libSchritt === 'function') libSchritt(text || 'Leistungskatalog geändert', () => { D = JSON.parse(JSON.stringify(alt)); anwenden(); speichern('', true); });
    stand = neu;
    clearTimeout(saveT);
    saveT = setTimeout(() => fetch('api/catbuero', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(D) }).then((r) => r.json().then((d) => { if (!r.ok) throw new Error(d.error || r.statusText); }))
      .catch((e) => toast('Leistungskatalog nicht gespeichert: ' + e.message, true)), 300);
  }
  const KatBuero = {
    laden(d) { D = d && typeof d === 'object' ? d : {}; stand = JSON.parse(JSON.stringify(D)); anwenden(); },
    daten: () => D,
    werk: (id) => WERK[id] || null,
    istWerk: (id) => !!WERK[id],
    abw(id) { const b = D[id], w = WERK[id]; if (!b || !w) return []; return FELD.filter((f) => b[f] != null && !gleich(f === 'fix' || f === 'w' ? !!b[f] : b[f], f === 'fix' || f === 'w' ? !!w[f] : w[f])); },
    setzen(id, werte, text) {
      if (!WERK[id]) return false;
      const w = WERK[id], b = { ...(D[id] || {}) };
      for (const [f, v] of Object.entries(werte)) {
        if (!FELD.includes(f)) continue;
        const wv = f === 'fix' || f === 'w' ? !!w[f] : w[f], nv = f === 'fix' || f === 'w' ? !!v : v;
        if (gleich(nv, wv)) delete b[f]; else b[f] = f === 'fix' || f === 'w' ? (v ? 1 : 0) : JSON.parse(JSON.stringify(v));
      }
      if (Object.keys(b).length) D[id] = b; else delete D[id];
      anwenden(); speichern(text || `${(C.items.find((i) => i.id === id) || {}).n || id}: geändert`); return true;
    },
    zurueck(id, feld) {
      if (!D[id]) return;
      if (feld) delete D[id][feld]; else delete D[id];
      if (D[id] && !Object.keys(D[id]).length) delete D[id];
      anwenden(); speichern(`${(C.items.find((i) => i.id === id) || {}).n || id}: zurück auf Werk`);
    },
    vor: (id) => ((C.items.find((i) => i.id === id) || (window.LIBRARY || []).find((x) => x.id === id) || {}).a || []).map((a) => (Array.isArray(a) ? { id: a[0], t: a[1] || 'FS', lag: +a[2] || 0 } : { id: a, t: 'FS', lag: 0 })),
    nach: (id) => [...C.items, ...(window.LIBRARY || [])].filter((i) => (i.a || []).some((a) => (Array.isArray(a) ? a[0] : a) === id)).map((i) => i.id),
    art: (i) => (i.w ? 'Wartezeit' : i.fix ? 'feste Dauer' : 'wächst mit der Fläche'),
  };
  window.KatBuero = KatBuero;
}());
