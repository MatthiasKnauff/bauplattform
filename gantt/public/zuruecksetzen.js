'use strict';
/* =====================================================================
   „↺ Zurücksetzen …“ je Reiter (Mock „Zurücksetzen Leistungskatalog“, GO 22.11.2026): drei Ebenen ab Werk → Büro → Projekt.
   Jeder Reiter setzt auf die Ebene davor zurück und zeigt vorher die Liste mit Häkchen – abgehakt = bleibt. Ein Rückgängig für alles.
     katZuruecksetzen() – Leistungskatalog (Büro → ab Werk): Richtdauer/Art/Vorgänger (KatBuero), Bezug (CATSCOPE), Abschnitte (Namen,
                          Reihenfolge); eigene Leistungen und eigene Abschnitte löschen nur, wenn angekreuzt.
     fvZuruecksetzen()  – Gewerke & Firmen (Projekt → Büro-Vorgabe): Firma je Gewerk = Vorgabe, Leistungen mit eigener Firma = wie Gewerk.
   Einzelne Werte setzt weiter das ↺ an der Zelle zurück; ganze Stände „Ältere Stände …“ am Rückgängig.
   Nutzt aus library.js / katalogbuero.js / firms.js: CATALOG, PH_STD, KatBuero, CATSCOPE, LIBRARY, libDarf, libSchritt, savePhases,
   saveCatScope, libSet, phLoesche, renderLib, P, act, tradeRows, tradeOf, gwFirm, firmById, firmByName, libProjectRows, isCraftName, renderFirms.
   ===================================================================== */
function zrDialog(titel, hin, posten, los) {   // posten: [{ g: Gruppe, t: Text (HTML), an: vorgewählt }] → los(gewählte)
  if (!posten.length) { toast(`${titel}: nichts abweichend – alles wie die Ebene davor.`); return; }
  const G = [...new Set(posten.map((x) => x.g))];
  const zahl = (box) => box.querySelectorAll('[data-zr]:checked').length;
  const bg = modalBox(`<div class="mh">${esc(titel)}</div><div class="mb zr"><div class="hint">${hin}</div>
    ${G.map((g) => `<div class="g-sec">${esc(g)}</div>${posten.map((x, k) => (x.g === g ? `<label class="zr-z${x.weg ? ' zr-weg' : ''}"><input type="checkbox" data-zr="${k}"${x.an ? ' checked' : ''}> <span>${x.t}</span></label>` : '')).join('')}`).join('')}</div>
    <div class="mf"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn primary" data-m="ok">${posten.filter((x) => x.an).length} zurücksetzen</button></div>`, (m, box, close) => {
    if (m === 'x') return close();
    if (m !== 'ok') return;
    const W = [...box.querySelectorAll('[data-zr]:checked')].map((i) => posten[+i.dataset.zr]); close();
    if (W.length) los(W);
  });
  bg.addEventListener('change', () => { const b = bg.querySelector('[data-m="ok"]'); if (b) b.textContent = `${zahl(bg)} zurücksetzen`; });
}
const zrPfeil = (a, b) => `<s>${esc(a)}</s> → <b>${esc(b)}</b>`;

function katZuruecksetzen() {
  if (!libDarf()) return libNurAdmin();
  const P_ = [], name = (id) => (CATALOG.items.find((i) => i.id === id) || {}).n || id, FN = { d: 'Richtdauer', fix: 'feste Dauer', w: 'Wartezeit', a: 'Vorgänger' };
  const wert = (f, v) => (f === 'd' ? `${v} AT` : f === 'a' ? `${(v || []).length} Vorgänger` : v ? 'ja' : 'nein');
  CATALOG.items.forEach((i) => KatBuero.abw(i.id).forEach((f) => P_.push({ g: 'Leistungen ab Werk', t: `${esc(name(i.id))} · ${FN[f]} ${zrPfeil(wert(f, i[f]), wert(f, (KatBuero.werk(i.id) || {})[f]))}`, an: true, art: 'kb', id: i.id, f })));
  const SC = window.CATSCOPE || {}, bez = (v) => (v === 'bau' ? 'Gebäude' : 'je Einheit');
  CATALOG.items.forEach((i) => { if (SC[i.id] && SC[i.id] !== i.sc) P_.push({ g: 'Bezug', t: `${esc(i.n)} · ${zrPfeil(bez(SC[i.id]), bez(i.sc))}`, an: true, art: 'sc', id: i.id }); });
  const std = new Map(PH_STD.map((p) => [p.k, p]));
  CATALOG.phases.forEach((p) => { const s = std.get(p.k); if (s && p.n !== s.n) P_.push({ g: 'Abschnitte', t: `Name ${zrPfeil(p.n, s.n)}`, an: true, art: 'phn', k: p.k }); });
  if (CATALOG.phases.filter((p) => std.has(p.k)).map((p) => p.k).join() !== PH_STD.map((p) => p.k).join()) P_.push({ g: 'Abschnitte', t: 'Reihenfolge → wie ab Werk', an: true, art: 'pho' });
  const eigPh = CATALOG.phases.filter((p) => p.own);
  if (eigPh.length) P_.push({ g: 'Abschnitte', t: `eigene Abschnitte löschen (${eigPh.length}: ${esc(eigPh.map((p) => p.n).join(', '))}) – ihre Leistungen wandern in den Abschnitt davor`, an: false, weg: true, art: 'phweg' });
  const L = window.LIBRARY || [];
  if (L.length) P_.push({ g: 'Eigene Leistungen', t: `eigene Leistungen löschen (${L.length})`, an: false, weg: true, art: 'lib' });
  zrDialog('Leistungskatalog zurücksetzen', 'Zurück auf den Stand ab Werk – für alle Projekte. Häkchen weg = bleibt. Bestehende Pläne ändern sich nicht.', P_, (W) => {
    const vor = { kb: JSON.parse(JSON.stringify(KatBuero.daten())), sc: { ...SC }, ph: CATALOG.phases.map((p) => ({ ...p })), lib: window.LIBRARY };
    const art = (a) => W.filter((x) => x.art === a);
    const D2 = JSON.parse(JSON.stringify(KatBuero.daten()));
    art('kb').forEach((x) => { if (D2[x.id]) { delete D2[x.id][x.f]; if (!Object.keys(D2[x.id]).length) delete D2[x.id]; } });
    KatBuero.ersetzen(D2, true);
    if (art('sc').length) { const n = { ...SC }; art('sc').forEach((x) => delete n[x.id]); window.CATSCOPE = n; saveCatScope(true); }
    if (art('phweg').length) eigPh.forEach((p) => phLoesche(p.k, true));
    if (art('phn').length || art('pho').length) {
      const ph = CATALOG.phases;
      art('phn').forEach((x) => { const p = ph.find((y) => y.k === x.k); if (p) p.n = std.get(x.k).n; });
      if (art('pho').length) {   // Werk-Reihenfolge; eigene Abschnitte bleiben hinter dem Abschnitt, hinter dem sie standen
        const out = PH_STD.map((s) => ({ ...(ph.find((y) => y.k === s.k) || s) }));
        ph.forEach((p, i) => { if (!p.own) return; const vorK = i ? ph[i - 1].k : null, j = vorK ? out.findIndex((y) => y.k === vorK) : -1; out.splice(j + 1, 0, { ...p }); });
        ph.splice(0, ph.length, ...out);
      }
      savePhases(true);
    }
    if (art('lib').length) libSet([], true, true);
    libSchritt(`Leistungskatalog zurückgesetzt (${W.length})`, () => {
      KatBuero.ersetzen(vor.kb, true); window.CATSCOPE = { ...vor.sc }; saveCatScope(true);
      CATALOG.phases.splice(0, CATALOG.phases.length, ...vor.ph.map((p) => ({ ...p }))); savePhases(true); libSet(vor.lib, true, true);
    });
    if (window.AssistCore) AssistCore.notifySoon();
    renderLib(); toast(`Leistungskatalog: ${W.length} zurückgesetzt – Strg+Z nimmt es zurück.`);
  });
}

function fvZuruecksetzen() {
  if (!P) return;
  const P_ = [];
  tradeRows().forEach((r) => { const d = gwFirm(r.gw), f = firmById(tradeOf(r.gw).firm), cur = f ? f.name : '';
    if (d && d !== cur) P_.push({ g: 'Firma je Gewerk (Vorgabe für alle Projekte)', t: `${esc(r.gw)} · ${zrPfeil(cur || '– keine –', d)}`, an: true, art: 'gw', gw: r.gw, name: d }); });
  const firmVon = (g) => { const v = [...new Set(g.idx.map((i) => P.tasks[i].res || ''))]; return v.length === 1 ? v[0] : null; };
  libProjectRows().forEach((g) => { const f = firmById(tradeOf(g.gw).firm), x = firmVon(g);
    if (f && (x === null || (x && !isCraftName(x, g.gw) && x !== f.name))) P_.push({ g: 'Leistungen mit eigener Firma', t: `${esc(g.name)} · ${zrPfeil(x === null ? 'verschieden' : x, f.name + ' (wie Gewerk)')}`, an: true, art: 'lp', g0: g, name: f.name }); });
  zrDialog('Gewerke & Firmen zurücksetzen', `Zurück auf die Vorgaben für alle Projekte – nur in „${esc(P.name)}“. Häkchen weg = bleibt.`, P_, (W) => {
    let neueFirma = false;
    act(() => {
      P.trades = { ...(P.trades || {}) };
      W.filter((x) => x.art === 'gw').forEach((x) => {
        let f = firmByName(x.name);
        if (!f) { f = { id: newFirmId(), name: x.name, gewerke: [x.gw], contact: '', phone: '', mobile: '', mail: '', address: '', note: '' }; FIRMS.push(f); neueFirma = true; }
        const alt = firmById(tradeOf(x.gw).firm);
        P.trades[x.gw] = { ...tradeOf(x.gw), firm: f.id };
        for (const t of P.tasks) if (t.gw === x.gw && (!t.res || (alt && t.res === alt.name))) t.res = f.name;   // wie setTradeFirm: Leistungen mit der alten Firma ziehen mit
      });
      W.filter((x) => x.art === 'lp').forEach((x) => { const f = firmById(tradeOf(x.g0.gw).firm); x.g0.idx.forEach((i) => { P.tasks[i].res = f ? f.name : x.name; }); });
    });
    if (neueFirma) saveFirmsSoon();
    renderFirms(); toast(`Gewerke & Firmen: ${W.length} zurückgesetzt – Strg+Z nimmt es zurück.`);
  });
}
