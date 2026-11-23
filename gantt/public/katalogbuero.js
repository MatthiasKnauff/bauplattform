'use strict';
/* =====================================================================
   Büro-Ebene über dem Werkskatalog (Mock „Leistungskatalog: Abhängigkeiten“, GO 22.11.2026: K1–K7)
   Leistungen ab Werk (bp/plankatalog.js) lassen sich ohne Kopie ändern: Richtdauer (d), feste Dauer (fix), Wartezeit (w), Vorgänger (a);
   seit 23.11.2026 auch Name (n), Abschnitt (ph), Gewerk (gw), DIN (din), Fachrichtung (craft) und „Vorausgewählt bei“ (rec = Projektarten).
   Gespeichert wird nur die Abweichung (Server api/catbuero, Store „catbuero“); hier wird sie auf CATALOG.items gelegt – Assistent,
   „Plan neu aus den Angaben“ und Probe lesen den Katalog wie gewohnt. Werk-Werte bleiben in WERK (↺ = zurück auf Werk).
   Ändern nur mit dem Block „Bauzeitenplan: Leistungskatalog …“ der Verwaltung (je Rolle, libDarf).
   KatBuero.laden(d) · .ersetzen(d, still) · .setzen(id, {n|ph|gw|din|craft|d|fix|w|a|rec}) · .zurueck(id, feld?) · .abw(id) → Felder mit Abweichung · .werk(id) · .nach(id) Nachfolger
   ===================================================================== */
(function () {
  const C = window.CATALOG, FELD = ['n', 'ph', 'gw', 'din', 'craft', 'd', 'fix', 'w', 'a', 'rec'], BOOL = ['fix', 'w'];
  const WERK = {};   // id → Werte ab Werk (einmal beim Laden der Seite)
  const PRWERK = Object.fromEntries(C.profiles.map((p) => [p.k, (p.rec || []).slice()]));   // „Vorausgewählt bei“ ab Werk steht in den Projektarten
  const recWerk = (id) => C.profiles.filter((p) => (PRWERK[p.k] || []).includes(id)).map((p) => p.k);
  C.items.forEach((i) => { WERK[i.id] = JSON.parse(JSON.stringify({ ...Object.fromEntries(FELD.filter((f) => f !== 'rec').map((f) => [f, i[f]])), rec: recWerk(i.id) })); });
  const norm = (f, v) => (BOOL.includes(f) ? !!v : f === 'rec' ? [...(v || [])].sort() : v == null ? '' : v);
  let D = {}, saveT = null, stand = null;
  const gleich = (a, b) => JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);
  function anwenden() {
    C.profiles.forEach((p) => { if (PRWERK[p.k]) p.rec = PRWERK[p.k].slice(); });
    for (const i of C.items) {
      const w = WERK[i.id]; if (!w) continue;
      FELD.forEach((f) => { if (f === 'rec') return; if (w[f] === undefined) delete i[f]; else i[f] = JSON.parse(JSON.stringify(w[f])); });
      const b = D[i.id]; if (!b) continue;
      if (b.d != null) i.d = b.d;
      BOOL.forEach((f) => { if (b[f] != null) { if (b[f]) i[f] = 1; else delete i[f]; } });
      if (Array.isArray(b.a)) i.a = JSON.parse(JSON.stringify(b.a));
      ['n', 'ph', 'gw', 'din', 'craft'].forEach((f) => { if (b[f] != null) i[f] = b[f]; });
      if (Array.isArray(b.rec)) C.profiles.forEach((p) => { if (!PRWERK[p.k]) return; const an = b.rec.includes(p.k), da = p.rec.includes(i.id);
        if (an && !da) p.rec.push(i.id); else if (!an && da) p.rec = p.rec.filter((x) => x !== i.id); });
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
    ersetzen(d, still, text) { D = JSON.parse(JSON.stringify(d || {})); anwenden(); speichern(text || 'Leistungskatalog geändert', still); },   // ganzer Stand auf einmal („Zurücksetzen …“, Rückgängig)
    daten: () => D,
    werk: (id) => WERK[id] || null,
    istWerk: (id) => !!WERK[id],
    abw(id) { const b = D[id], w = WERK[id]; if (!b || !w) return []; return FELD.filter((f) => b[f] != null && !gleich(norm(f, b[f]), norm(f, w[f]))); },
    setzen(id, werte, text) {
      if (!WERK[id]) return false;
      const w = WERK[id], b = { ...(D[id] || {}) };
      for (const [f, v] of Object.entries(werte)) {
        if (!FELD.includes(f)) continue;
        if (gleich(norm(f, v), norm(f, w[f]))) delete b[f]; else b[f] = BOOL.includes(f) ? (v ? 1 : 0) : f === 'rec' ? norm(f, v) : JSON.parse(JSON.stringify(v));
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
